"""Behavioral / lifecycle email drain (E2.3).

Evaluates onboarding + re-engagement rules across all users and sends the matching template. Every
send goes through send_template, which is idempotent (dedups per user+template+dedup_key) and honors
the per-user lifecycle opt-out, so this is safe to run repeatedly (daily). Best-effort per user —
one failure never blocks the rest. Run by cron via POST /api/internal/emails/lifecycle/drain."""
from __future__ import annotations

from .send import send_template


def _first_name(full_name) -> str:
    return (full_name or "").strip().split(" ")[0] if full_name else ""


async def run_lifecycle(conn) -> dict:
    """Returns a per-template count of emails dispatched this run."""
    sent: dict[str, int] = {}

    async def fire(user_id, tid, ctx, dedup_key=""):
        try:
            if await send_template(conn, str(user_id), tid, ctx, dedup_key=dedup_key):
                sent[tid] = sent.get(tid, 0) + 1
        except Exception:  # noqa: BLE001 — never let one user break the drain
            pass

    # ── 1) No field yet (farmers only) — nudge at day 1 / 3 / 7 windows ───────────────
    no_field = await conn.fetch(
        """select u.id, u.full_name,
                  extract(epoch from (now() - u.created_at)) / 86400.0 as age_days
           from public.users u
           where u.role = 'farmer' and u.email is not null and coalesce(u.email_lifecycle, true)
             and u.created_at > now() - interval '30 days'
             and not exists (
               select 1 from public.organization_members m
               join public.farms f  on f.org_id = m.org_id
               join public.fields fl on fl.farm_id = f.id
               where m.user_id = u.id)""")
    for r in no_field:
        age = float(r["age_days"])
        tid = ("no_field_d1" if 1 <= age < 3 else
               "no_field_d3" if 3 <= age < 7 else
               "no_field_d7" if 7 <= age < 30 else None)
        if tid:
            await fire(r["id"], tid, {"name": _first_name(r["full_name"])})

    # ── 2) Educational drip (farmers) at day 2 / 5 / 9 ───────────────────────────────
    edu = await conn.fetch(
        """select u.id, u.full_name,
                  extract(epoch from (now() - u.created_at)) / 86400.0 as age_days
           from public.users u
           where u.role = 'farmer' and u.email is not null and coalesce(u.email_lifecycle, true)
             and u.created_at > now() - interval '15 days'""")
    for r in edu:
        age = float(r["age_days"])
        tid = ("edu_ndvi" if 2 <= age < 3 else
               "edu_ledger" if 5 <= age < 6 else
               "edu_invite" if 9 <= age < 10 else None)
        if tid:
            await fire(r["id"], tid, {"name": _first_name(r["full_name"])})

    # ── 3) Field(s) but no crop set on any — nudge to pick the crop ───────────────────
    no_crop = await conn.fetch(
        """select distinct u.id, u.full_name, fl.name as field_name, fl.id as field_id
           from public.users u
           join public.organization_members m on m.user_id = u.id
           join public.farms f  on f.org_id = m.org_id
           join public.fields fl on fl.farm_id = f.id
           left join public.field_metadata fm on fm.field_id = fl.id
           where u.role = 'farmer' and u.email is not null and coalesce(u.email_lifecycle, true)
             and (fm.crop_type is null or fm.crop_type = '')
             and not exists (
               select 1 from public.fields fl2
               join public.farms f2 on f2.id = fl2.farm_id
               join public.field_metadata fm2 on fm2.field_id = fl2.id
               where f2.org_id = m.org_id and fm2.crop_type is not null and fm2.crop_type <> '')""")
    seen_nc: set = set()
    for r in no_crop:
        if r["id"] in seen_nc:
            continue
        seen_nc.add(r["id"])
        await fire(r["id"], "no_crop",
                   {"name": _first_name(r["full_name"]), "field": r["field_name"],
                    "field_id": str(r["field_id"])})

    # ── 4) Inactive re-engagement — 10d / 30d (had prior activity) ────────────────────
    inactive = await conn.fetch(
        """select u.id, u.full_name,
                  extract(epoch from (now() - u.last_seen_at)) / 86400.0 as idle_days
           from public.users u
           where u.email is not null and coalesce(u.email_lifecycle, true)
             and u.last_seen_at is not null
             and u.last_seen_at < now() - interval '10 days'""")
    for r in inactive:
        idle = float(r["idle_days"])
        # 30d fires once ever; 10d fires once ever. dedup keeps each to a single send.
        tid = "inactive_30d" if idle >= 30 else "inactive_10d"
        await fire(r["id"], tid, {"name": _first_name(r["full_name"])})

    # ── 5) Pro trial ending within 3 days (org owner) ────────────────────────────────
    trial = await conn.fetch(
        """select o.owner_id, u.full_name,
                  ceil(extract(epoch from (s.trial_ends_at - now())) / 86400.0) as days_left
           from public.org_subscriptions s
           join public.organizations o on o.id = s.org_id
           join public.users u on u.id = o.owner_id
           where s.source = 'trial' and s.trial_ends_at is not null
             and s.trial_ends_at > now() and s.trial_ends_at < now() + interval '3 days'
             and u.email is not null and coalesce(u.email_lifecycle, true)""")
    for r in trial:
        await fire(r["owner_id"], "trial_ending",
                   {"name": _first_name(r["full_name"]), "trial_days": int(r["days_left"] or 1)})

    # ── 6) Weekly digest (opt-in active farmers with a field) — repeatable per ISO week ─
    digest = await conn.fetch(
        """select distinct u.id, u.full_name, to_char(now(), 'IYYY-"W"IW') as week
           from public.users u
           join public.organization_members m on m.user_id = u.id
           join public.farms f  on f.org_id = m.org_id
           join public.fields fl on fl.farm_id = f.id
           where u.role = 'farmer' and u.email is not null and coalesce(u.email_lifecycle, true)
             and u.last_seen_at is not null and u.last_seen_at > now() - interval '21 days'""")
    seen_d: set = set()
    for r in digest:
        if r["id"] in seen_d:
            continue
        seen_d.add(r["id"])
        await fire(r["id"], "digest_weekly", {"name": _first_name(r["full_name"])}, dedup_key=r["week"])

    return {"sent": sent, "total": sum(sent.values())}
