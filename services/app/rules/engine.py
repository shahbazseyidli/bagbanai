"""Rule engine + dispatcher (T1).

`run_rules(conn, field_id)` gathers candidate alerts from every registered producer and dispatches
each through anti-spam gating:
  - quiet hours 22:00–07:00 (Azerbaijan, UTC+4): non-critical alerts are held; critical (e.g.
    frost during flowering) always goes out;
  - cooldown: the same (field, rule_type) won't re-fire within COOLDOWN_HOURS unless the severity
    escalates;
so a notification lands in public.notifications at most once per real event, not once per cron run.

Producers are pure readers of already-computed state (e.g. the weather job stores its alerts in the
`spray_window` field_knowledge block) — the engine owns notification writing, the jobs don't."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

# Azerbaijan is UTC+4 year-round (no DST) — quiet-hours are computed in field-local time.
_AZ_TZ = timezone(timedelta(hours=4))
_QUIET_START, _QUIET_END = 22, 7           # local hour window [22:00, 07:00)
COOLDOWN_HOURS = 18                        # min gap between same-type alerts (unless escalated)
_SEVERITY_RANK = {"info": 0, "warning": 1, "critical": 2}

_WEATHER_TITLES = {
    "frost": "🥶 Şaxta xəbərdarlığı",
    "heat": "🌡️ İstilik stresi",
    "wind": "💨 Güclü külək",
}


async def _weather_candidates(conn, field_id: str) -> list[dict]:
    """Read the weather job's stored alerts (spray_window block) → candidate notifications."""
    content = await conn.fetchval(
        """select content from public.field_knowledge
           where field_id=$1::uuid and block_type='spray_window'""", field_id)
    if not content:
        return []
    c = json.loads(content) if isinstance(content, str) else content
    out = []
    for a in c.get("alerts") or []:
        rt = a.get("type")
        if not rt:
            continue
        out.append({
            "rule_type": rt,
            "severity": a.get("severity", "warning"),
            "source": "weather",
            "title": _WEATHER_TITLES.get(rt, "Hava xəbərdarlığı"),
            "body": a.get("detail") or "",
            "dedup_key": "",
        })
    return out


# Registered producers. Vegetation (T2), pest (T9), irrigation (T8) append here.
_PRODUCERS = [_weather_candidates]


async def evaluate(conn, field_id: str) -> list[dict]:
    candidates: list[dict] = []
    for producer in _PRODUCERS:
        try:
            candidates.extend(await producer(conn, field_id))
        except Exception:  # noqa: BLE001 — one bad producer must not sink the others
            pass
    return candidates


def _in_quiet_hours(now_utc: datetime) -> bool:
    h = now_utc.astimezone(_AZ_TZ).hour
    return h >= _QUIET_START or h < _QUIET_END


async def dispatch(conn, field_id: str, org_id: str, candidates: list[dict]) -> dict:
    now = datetime.now(timezone.utc)
    quiet = _in_quiet_hours(now)
    fired = 0
    for c in candidates:
        rt, sev = c["rule_type"], c.get("severity", "warning")
        crit = sev == "critical"
        # Quiet hours: hold everything except critical.
        if quiet and not crit:
            continue
        st = await conn.fetchrow(
            """select last_fired_at, last_severity, muted_until from public.alert_state
               where field_id=$1::uuid and rule_type=$2 and dedup_key=$3""",
            field_id, rt, c.get("dedup_key", ""))
        if st and st["muted_until"] and st["muted_until"] > now:
            continue
        if st:
            escalated = _SEVERITY_RANK.get(sev, 1) > _SEVERITY_RANK.get(st["last_severity"] or "info", 0)
            if not escalated and now - st["last_fired_at"] < timedelta(hours=COOLDOWN_HOURS):
                continue
        await conn.execute(
            """insert into public.notifications
                 (field_id, org_id, source, type, severity, title, body, delivered_channels)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,array['inapp'])""",
            field_id, org_id, c.get("source", "vegetation"), rt, sev, c["title"], c["body"])
        await conn.execute(
            """insert into public.alert_state
                 (field_id, rule_type, dedup_key, last_severity, last_fired_at, active)
               values ($1::uuid,$2,$3,$4,now(),true)
               on conflict (field_id, rule_type, dedup_key) do update set
                 last_severity=excluded.last_severity, last_fired_at=now(), active=true""",
            field_id, rt, c.get("dedup_key", ""), sev)
        fired += 1
    return {"candidates": len(candidates), "fired": fired, "quiet_hours": quiet}


async def run_rules(conn, field_id: str) -> dict:
    """Evaluate all producers for a field and dispatch the surviving alerts. Never raises."""
    org_id = await conn.fetchval("select org_id from public.fields where id=$1::uuid", field_id)
    if not org_id:
        return {"ok": False, "reason": "field_not_found"}
    candidates = await evaluate(conn, field_id)
    result = await dispatch(conn, field_id, str(org_id), candidates)
    return {"ok": True, **result}
