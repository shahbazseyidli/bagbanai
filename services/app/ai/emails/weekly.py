"""E15 — the weekly digest builder. This is the ONE recurring email Agradex sends.

Everything that used to arrive as its own message now arrives here, once a week (Wednesday 07:00
Asia/Baku = 03:00 UTC, driven by deploy/lifecycle-emails.sh):

  * rule-engine alerts (frost / heat / wind / NDVI drop / NDVI anomaly / pest risk) — the engine
    still writes them to public.notifications for the in-app feed and still pushes Telegram
    immediately; this digest is their only email surface;
  * AI advice changes — advice.py still writes its in-app notification on every material change,
    the digest reports the newest advice per field once;
  * the onboarding nudges (no_field d1/d3/d7, no_crop) and the win-back mails (inactive_10d/30d) —
    they are no longer separate templates, they are *variants* of this one email;
  * trial-ending — a banner line inside the digest, never its own message.

WHAT THIS MODULE DOES: read-only assembly. `build_weekly()` runs six small queries for one user and
returns `{"variant", "ctx", "blocks"}`; `lifecycle.run_lifecycle()` feeds that to
`send.send_template("weekly", ...)`, which owns opt-out (users.email_lifecycle), the idempotency
ledger (public.email_sends, dedup_key = ISO week) and the unsubscribe footer. Nothing here sends.

COPY: the frame (subject / heading / intro / outro / signoff, per variant) lives in `catalog`; the
data-shaped strings (section titles, "72/100 · NDVI 0.63 ↑0.04 · 24 iyl") live in `_LABELS` below,
because they are interpolated from query results rather than authored per send. AZ and EN are
hand-written; every other locale falls back to EN, exactly like `catalog.build`.

FIELD ORDER: worst wellness score first (nulls last, then oldest field). The farmer should open the
mail on the field that needs attention — and "the first field", whose satellite image we embed, is
that same field.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any
from urllib.parse import quote

from .send import app_url, site_url

# The single recurring template. `catalog` keys its copy by these variant names.
TEMPLATE_ID = "weekly"
VARIANT_NO_FIELDS = "no_fields"   # no field yet → replaces no_field_d1/d3/d7
VARIANT_NO_CROP = "no_crop"       # fields, but not one has a crop → replaces no_crop
VARIANT_ALERTS = "alerts"         # fields + something fired this week
VARIANT_CALM = "calm"             # fields, quiet week

# Roles that get the "add your first field" nudge. A lab or supplier has no fields by design, so
# nudging them weekly would be nonsense — they simply get no recurring email.
FIELD_ROLES = ("farmer", "consultant")

# Length guards. An email past ~102 KB is clipped by Gmail ("[Message clipped]"), and a farmer
# scrolling on a phone stops reading long before that.
MAX_FIELDS = 8         # rows in the field list
MAX_ALERTS = 8         # alert bullets (deduped per field+type first)
MAX_ADVICE = 3         # fields whose advice we quote
MAX_STEPS = 2          # next steps per quoted advice
SUMMARY_CHARS = 260    # advice summary clip
BODY_CHARS = 130       # alert body clip

ALERT_DAYS = 7         # the digest window
ADVICE_DAYS = 45       # older advice is stale (regeneration throttle is 15 days)
WELLNESS_DAYS = 14     # older scores are not "this week's" state
TREND_DAYS = 30        # index history we pull to compute the 7-day change
TRIAL_DAYS = 10        # trial ending inside this window → banner line

_SEV_TONE = {"critical": "bad", "warning": "warn", "info": "info"}
_SEV_RANK = {"critical": 3, "warning": 2, "info": 1}
_TREND_INDEX = "NDVI"


# ─────────────────────────────────────────────────────────────────────────────
# Copy for the data-shaped strings. AZ + EN authored; every other locale → EN.
# ─────────────────────────────────────────────────────────────────────────────
_LABELS: dict[str, dict[str, str]] = {
    "az": {
        "stat_fields": "sahə",
        "stat_alerts": "xəbərdarlıq",
        "stat_score": "orta sağlamlıq",
        "sec_fields": "Sahələriniz",
        "sec_alerts": "Bu həftənin xəbərdarlıqları",
        "sec_advice": "AI aqronomdan",
        "cta_app": "Panelə keç →",
        "cta_add": "İlk sahəni əlavə et →",
        "cta_crop": "Məhsulu seç →",
        "cta_pricing": "Paketlərə bax →",
        "img_alt": "“{field}” sahəsinin peyk görüntüsü (NDVI)",
        "img_caption": "“{field}” · {date} · peyk görüntüsü (NDVI): tünd yaşıl = güclü bitki örtüyü, sarı-qırmızı = zəif.",
        "score_caption": "“{field}” — bu həftə ən çox diqqət tələb edən sahə.",
        "preparing": "peyk məlumatı hazırlanır",
        "no_data": "hələ peyk məlumatı yoxdur",
        "no_crop_tag": "məhsul seçilməyib",
        "trial_label": "Pro sınağı",
        "trial_text": "{days} gün qalıb. Paket seçməsəniz, hesabınız avtomatik pulsuz plana keçəcək — sahələriniz və məlumatınız qalır.",
        "more_alerts": "və daha {n} xəbərdarlıq — hamısını paneldə görün.",
        "field_one": "{n} sahə",
        "field_many": "{n} sahə",
        "alert_one": "{n} xəbərdarlıq",
        "alert_many": "{n} xəbərdarlıq",
        "crop_missing_lead": "Bu sahələrdə məhsul seçilməyib: {fields}.",
        "months": "yan fev mar apr may iyn iyl avq sen okt noy dek",
    },
    "en": {
        "stat_fields": "fields",
        "stat_alerts": "alerts",
        "stat_score": "avg. health",
        "sec_fields": "Your fields",
        "sec_alerts": "Alerts this week",
        "sec_advice": "From the AI agronomist",
        "cta_app": "Open the dashboard →",
        "cta_add": "Add your first field →",
        "cta_crop": "Set the crop →",
        "cta_pricing": "See plans →",
        "img_alt": "Satellite image (NDVI) of “{field}”",
        "img_caption": "“{field}” · {date} · satellite image (NDVI): deep green = strong canopy, yellow-red = weak.",
        "score_caption": "“{field}” — the field that needs you most this week.",
        "preparing": "satellite data is being prepared",
        "no_data": "no satellite data yet",
        "no_crop_tag": "no crop set",
        "trial_label": "Pro trial",
        "trial_text": "{days} days left. Without a plan your account moves to Free automatically — your fields and data stay.",
        "more_alerts": "and {n} more alerts — see them all in the dashboard.",
        "field_one": "{n} field",
        "field_many": "{n} fields",
        "alert_one": "{n} alert",
        "alert_many": "{n} alerts",
        "crop_missing_lead": "No crop is set on: {fields}.",
        "months": "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec",
    },
    # RU is a launch-tier locale, authored (not machine-translated). Counts use the Russian
    # 1 / 2-4 / 5+ pattern: `_count` only has one/many, so "many" takes the genitive plural
    # ("полей", "оповещений"), which is correct for 5+ and for every count we actually cap at.
    "ru": {
        "stat_fields": "полей",
        "stat_alerts": "оповещений",
        "stat_score": "ср. здоровье",
        "sec_fields": "Ваши поля",
        "sec_alerts": "Оповещения за неделю",
        "sec_advice": "От AI-агронома",
        "cta_app": "Перейти в панель →",
        "cta_add": "Добавить первое поле →",
        "cta_crop": "Указать культуру →",
        "cta_pricing": "Посмотреть тарифы →",
        "img_alt": "Снимок поля «{field}» со спутника (NDVI)",
        "img_caption": "«{field}» · {date} · снимок со спутника (NDVI): тёмно-зелёный — мощная вегетация, жёлто-красный — слабая.",
        "score_caption": "«{field}» — поле, которое требует внимания в первую очередь.",
        "preparing": "спутниковые данные готовятся",
        "no_data": "спутниковых данных пока нет",
        "no_crop_tag": "культура не указана",
        "trial_label": "Пробный Pro",
        "trial_text": "Осталось дней: {days}. Без выбора тарифа аккаунт автоматически перейдёт на бесплатный — поля и данные сохранятся.",
        "more_alerts": "и ещё оповещений: {n} — все они в панели.",
        "field_one": "{n} поле",
        "field_many": "{n} полей",
        "alert_one": "{n} оповещение",
        "alert_many": "{n} оповещений",
        "crop_missing_lead": "Культура не указана на полях: {fields}.",
        "months": "янв фев мар апр май июн июл авг сен окт ноя дек",
    },
}


def _L(locale: str | None) -> dict[str, str]:
    return _LABELS.get((locale or "az")[:2].lower()) or _LABELS["en"]


def first_name(full_name: Any) -> str:
    return (str(full_name or "").strip().split(" ") or [""])[0]


def _name_suffix(locale: str | None, name: str) -> str:
    """', Elvin' / ' Elvin' / '' — lets the catalog keep 'Salam{name_suffix}!' translatable while
    the nameless case ('Salam!') stays grammatical."""
    if not name:
        return ""
    return f" {name}" if (locale or "az")[:2].lower() == "en" else f", {name}"


def _count(locale: str | None, n: int, kind: str) -> str:
    d = _L(locale)
    return d[f"{kind}_{'one' if n == 1 else 'many'}"].format(n=n)


def _date(d: Any, locale: str | None) -> str:
    """'24 iyl' / '24 Jul'. Compact on purpose — these sit inside one-line bullets."""
    if not isinstance(d, date):
        return ""
    months = _L(locale)["months"].split()
    return f"{d.day} {months[d.month - 1]}"


def _f(v: Any) -> float | None:
    """Decimal/None/NaN-safe float (asyncpg hands numeric back as Decimal)."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f and abs(f) != float("inf") else None


def _clip(s: Any, n: int) -> str:
    t = " ".join(str(s or "").split())
    if len(t) <= n:
        return t
    return t[:n].rsplit(" ", 1)[0].rstrip(" ,;:.") + "…"


def _jsonb(v: Any) -> Any:
    """asyncpg returns jsonb as text (no codec registered) — decode defensively."""
    if isinstance(v, str):
        try:
            return json.loads(v)
        except ValueError:
            return None
    return v


def _titiler_base() -> str:
    """Absolute public TiTiler base. `settings.titiler_public_base` is the nginx path ('/titiler'),
    which is fine for the browser but useless in an email — an <img> in an inbox needs an origin."""
    from ...config import settings
    base = (settings.titiler_public_base or "/titiler").rstrip("/")
    if base.startswith("http://") or base.startswith("https://"):
        return base
    if not base.startswith("/"):
        base = "/" + base
    return f"{app_url()}{base}"


def raster_png_url(storage_path: str) -> str:
    """Static PNG of one clipped index COG.

    `/cog/preview.png` (NOT the `/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png` route the map uses) —
    an email needs one finished image, not a tile pyramid, and the COG the pipeline writes is
    already clipped and masked to the field boundary, so its full preview *is* the field. Colormap
    and rescale match the vegetation family used by the app (routers/indices._raster_style), so the
    greens in the inbox are the greens in the app. No width/height is pinned: max_size caps the long
    edge and TiTiler keeps the aspect ratio, which a fixed height attribute would distort.

    The URL is public (Gmail proxies images, so it must be) — same exposure as the public share
    link in routers/shares.py: a single field's own clipped raster, nothing around it.
    """
    return (f"{_titiler_base()}/cog/preview.png?url={quote(storage_path, safe='')}"
            f"&colormap_name=rdylgn&rescale=-0.1,0.9&max_size=560")


# ─────────────────────────────────────────────────────────────────────────────
# Queries — every one is scoped to the fields this user can actually see.
# ─────────────────────────────────────────────────────────────────────────────

async def _fields(conn, user_id: str) -> list[dict]:
    """Access chain field → farm → organization → membership (CLAUDE.md). `exists` rather than a
    join on organization_members so a user in several orgs cannot multiply a field's row."""
    rows = await conn.fetch(
        """select f.id, f.name, f.area_ha, f.created_at, f.data_status, fm.crop_type
           from public.fields f
           join public.farms fa on fa.id = f.farm_id
           left join public.field_metadata fm on fm.field_id = f.id
           where f.deleted_at is null
             and exists (select 1 from public.organization_members m
                         where m.user_id = $1::uuid and m.org_id = fa.org_id)
           order by f.created_at, f.id""", user_id)
    return [dict(r) for r in rows]


async def _wellness(conn, ids: list) -> dict[str, dict]:
    rows = await conn.fetch(
        """select distinct on (field_id) field_id, score, tone, headline, computed_on
           from public.field_wellness
           where field_id = any($1::uuid[]) and computed_on >= current_date - $2::int
           order by field_id, computed_on desc""", ids, WELLNESS_DAYS)
    return {str(r["field_id"]): dict(r) for r in rows}


async def _trend(conn, ids: list) -> dict[str, dict]:
    """Newest NDVI per field + the 7-day change.

    Pulled as raw history instead of two point queries because index_stats mixes sensors (S2 vs the
    HLS S30/L30 pair) and differencing across sensors invents a change the farmer never had. We take
    the newest row, then the newest row of THE SAME sensor at least 6 days older.
    """
    rows = await conn.fetch(
        """select field_id, sensor, mean, acquired_at
           from public.index_stats
           where field_id = any($1::uuid[]) and index_name = $2
             and acquired_at >= current_date - $3::int
           order by field_id, acquired_at desc""", ids, _TREND_INDEX, TREND_DAYS)
    per: dict[str, list] = {}
    for r in rows:
        per.setdefault(str(r["field_id"]), []).append(r)
    out: dict[str, dict] = {}
    for fid, hist in per.items():
        # Newest row that actually has a value — a null mean (fully clouded scene) must not cost
        # the field its whole trend line.
        idx = next((i for i, r in enumerate(hist) if _f(r["mean"]) is not None), None)
        if idx is None:
            continue
        latest = hist[idx]
        val = _f(latest["mean"])
        prior = None
        for r in hist[idx + 1:]:
            if r["sensor"] == latest["sensor"] and (latest["acquired_at"] - r["acquired_at"]).days >= 6:
                prior = _f(r["mean"])
                if prior is not None:
                    break
        out[fid] = {"value": val, "date": latest["acquired_at"],
                    "delta": None if prior is None else round(val - prior, 3)}
    return out


async def _alerts(conn, ids: list) -> list[dict]:
    """This week's rule-engine notifications, one row per (field, rule type).

    The engine's cooldown is 18h, so a week of bad weather writes the same frost alert up to nine
    times. DISTINCT ON collapses them to the most severe / most recent instance and the window
    count (evaluated before DISTINCT) reports how often it fired. `ai_advice` notifications are
    excluded — the advice section below says the same thing in full.
    """
    rows = await conn.fetch(
        """select distinct on (n.field_id, n.type)
                  n.field_id, n.type, n.severity, n.title, n.body, n.created_at,
                  count(*) over (partition by n.field_id, n.type) as hits
           from public.notifications n
           where n.field_id = any($1::uuid[])
             and n.created_at >= now() - make_interval(days => $2::int)
             and n.type <> 'ai_advice'
           order by n.field_id, n.type,
                    case n.severity when 'critical' then 3 when 'warning' then 2 else 1 end desc,
                    n.created_at desc""", ids, ALERT_DAYS)
    return [dict(r) for r in rows]


async def _advice(conn, ids: list) -> dict[str, dict]:
    rows = await conn.fetch(
        """select distinct on (field_id) field_id, summary, findings, generated_at
           from public.advice
           where field_id = any($1::uuid[])
             and generated_at >= now() - make_interval(days => $2::int)
           order by field_id, generated_at desc""", ids, ADVICE_DAYS)
    return {str(r["field_id"]): dict(r) for r in rows}


async def _rasters(conn, ids: list) -> dict[str, dict]:
    """Newest NDVI COG per field, Sentinel-2 preferred (10 m beats the 30 m HLS pair)."""
    rows = await conn.fetch(
        """select distinct on (field_id) field_id, storage_path, acquired_at
           from public.index_rasters
           where field_id = any($1::uuid[]) and index_name = $2
           order by field_id, (sensor = 'S2') desc, acquired_at desc""", ids, _TREND_INDEX)
    return {str(r["field_id"]): dict(r) for r in rows if r["storage_path"]}


async def _trial_days(conn, user_id: str) -> int | None:
    """Days left on a Pro trial of an org this user OWNS (the only person who can pick a plan)."""
    v = await conn.fetchval(
        """select ceil(extract(epoch from (s.trial_ends_at - now())) / 86400.0)
           from public.org_subscriptions s
           join public.organizations o on o.id = s.org_id
           where o.owner_id = $1::uuid and s.source = 'trial'
             and s.trial_ends_at is not null and s.trial_ends_at > now()
             and s.trial_ends_at < now() + make_interval(days => $2::int)
           order by s.trial_ends_at limit 1""", user_id, TRIAL_DAYS)
    return max(1, int(v)) if v is not None else None


# ─────────────────────────────────────────────────────────────────────────────
# Assembly
# ─────────────────────────────────────────────────────────────────────────────

def _field_line(f: dict, well: dict | None, tr: dict | None, loc: str | None) -> str:
    """'72/100 · NDVI 0.63 ↑0.04 · 24 iyl' — everything known about one field in one line."""
    d = _L(loc)
    bits: list[str] = []
    if well and well.get("score") is not None:
        bits.append(f'{int(well["score"])}/100')
    if tr:
        piece = f'NDVI {tr["value"]:.2f}'
        delta = tr.get("delta")
        if delta is not None and abs(delta) >= 0.01:
            piece += f' {"↑" if delta > 0 else "↓"}{abs(delta):.2f}'
        bits.append(piece)
        bits.append(_date(tr["date"], loc))
    elif f.get("data_status") in ("queued", "processing"):
        bits.append(d["preparing"])
    else:
        bits.append(d["no_data"])
    if not f.get("crop_type"):
        bits.append(d["no_crop_tag"])
    return " · ".join(b for b in bits if b)


def _sort_key(f: dict, wellness: dict) -> tuple:
    """Worst score first, unscored fields last, oldest field breaking ties."""
    score = (wellness.get(str(f["id"])) or {}).get("score")
    return (1, 0, f["created_at"]) if score is None else (0, int(score), f["created_at"])


async def build_weekly(conn, user: dict) -> dict | None:
    """Assemble one user's digest. Returns {"variant", "ctx", "blocks"} or None when this user
    should get no recurring email at all (a lab/supplier with no fields)."""
    uid = str(user["id"])
    loc = user.get("locale")
    role = user.get("role") or "farmer"
    d = _L(loc)
    name = first_name(user.get("full_name"))

    fields = await _fields(conn, uid)
    trial = await _trial_days(conn, uid)

    ctx: dict[str, Any] = {
        # Every key the catalog copy can reference MUST exist: catalog._fmt swallows KeyError and
        # would ship the literal "{field}" to the farmer.
        "name": name, "name_suffix": _name_suffix(loc, name),
        "field": "", "fields_label": _count(loc, 0, "field"),
        "alerts_label": _count(loc, 0, "alert"), "trial_days": trial or 0,
    }

    # ── no field yet → the nudge that replaces no_field_d1/d3/d7 ────────────────────────
    if not fields:
        if role not in FIELD_ROLES:
            return None
        blocks = [{"type": "stats", "items": _empty_stats(loc)},
                  {"type": "cta", "label": d["cta_add"], "url": f"{app_url()}/onboarding"}]
        return {"variant": VARIANT_NO_FIELDS, "ctx": ctx, "blocks": blocks}

    ids = [f["id"] for f in fields]
    wellness = await _wellness(conn, ids)
    trends = await _trend(conn, ids)
    alerts = await _alerts(conn, ids)
    advice = await _advice(conn, ids)
    rasters = await _rasters(conn, ids)

    fields.sort(key=lambda f: _sort_key(f, wellness))
    names = {str(f["id"]): f["name"] for f in fields}
    lead = fields[0]
    lead_w = wellness.get(str(lead["id"])) or {}
    no_crop = [f for f in fields if not f.get("crop_type")]
    scores = [int(w["score"]) for w in wellness.values() if w.get("score") is not None]

    ctx.update({
        "field": lead["name"] or "",
        "fields_label": _count(loc, len(fields), "field"),
        "alerts_label": _count(loc, len(alerts), "alert"),
    })

    blocks: list[dict] = []

    # 1) Trial banner — a line, never its own email.
    if trial:
        blocks.append({"type": "bullets", "items": [
            {"sev": "warn", "label": d["trial_label"], "text": d["trial_text"].format(days=trial)}]})

    # 2) The numbers, as text (they must survive images being blocked).
    stats = [{"val": str(len(fields)), "lab": d["stat_fields"]},
             {"val": str(len(alerts)), "lab": d["stat_alerts"]}]
    if scores:
        stats.append({"val": f"{round(sum(scores) / len(scores))}", "lab": d["stat_score"]})
    blocks.append({"type": "stats", "items": stats})

    # 3) Crop nudge — replaces the old no_crop email. Its own button only when NOTHING has a crop
    # (the no_crop variant); otherwise the line is enough and the digest keeps a single CTA.
    if no_crop:
        blocks.append({"type": "text",
                       "text": d["crop_missing_lead"].format(
                           fields=", ".join(f'“{f["name"]}”' for f in no_crop[:4]))})
        if len(no_crop) == len(fields):
            blocks.append({"type": "cta", "label": d["cta_crop"],
                           "url": f'{app_url()}/fields/{no_crop[0]["id"]}'})

    # 4) The lead field: its satellite image and its score.
    img = _image_block(fields, rasters, loc)
    if img:
        blocks += img
    if lead_w.get("score") is not None:
        blocks.append({"type": "score", "val": int(lead_w["score"]),
                       "tone": _score_tone(lead_w.get("tone")),
                       "label": lead["name"] or "",
                       "caption": lead_w.get("headline") or d["score_caption"].format(
                           field=lead["name"] or "")})

    # 5) Every field, one line each.
    blocks.append({"type": "divider"})
    blocks.append({"type": "heading", "text": d["sec_fields"], "small": True})
    blocks.append({"type": "bullets", "items": [
        {"label": f["name"], "sev": _score_tone((wellness.get(str(f["id"])) or {}).get("tone")) or "info",
         "text": _field_line(f, wellness.get(str(f["id"])), trends.get(str(f["id"])), loc)}
        for f in fields[:MAX_FIELDS]]})

    # 6) The week's alerts — this is what replaces one email per fired alert.
    if alerts:
        alerts.sort(key=lambda a: (-_SEV_RANK.get(a["severity"], 0), -a["created_at"].timestamp()))
        blocks.append({"type": "heading", "text": d["sec_alerts"], "small": True})
        items = []
        for a in alerts[:MAX_ALERTS]:
            text = _clip(a["title"], 80)
            if a["body"]:
                text += f' — {_clip(a["body"], BODY_CHARS)}'
            if (a["hits"] or 1) > 1:
                text += f' (×{int(a["hits"])})'
            items.append({"label": names.get(str(a["field_id"]), ""),
                          "sev": _SEV_TONE.get(a["severity"], "info"), "text": text})
        blocks.append({"type": "bullets", "items": items})
        if len(alerts) > MAX_ALERTS:
            blocks.append({"type": "text", "text": d["more_alerts"].format(n=len(alerts) - MAX_ALERTS)})

    # 7) The newest advice per field. `advice.summary` is nullable — without it the bullet would
    # render as a bare label, so those rows are skipped rather than half-shown.
    quoted = [f for f in fields if (advice.get(str(f["id"])) or {}).get("summary")][:MAX_ADVICE]
    if quoted:
        blocks.append({"type": "heading", "text": d["sec_advice"], "small": True})
        for f in quoted:
            a = advice[str(f["id"])]
            # One bullets block per field: the field name as the bold coloured label (fully escaped
            # by layout — never hand-wrap untrusted text in <b>), then its next steps in green.
            items = [{"label": f["name"], "sev": "info", "text": _clip(a["summary"], SUMMARY_CHARS)}]
            for s in ((_jsonb(a["findings"]) or {}).get("next_steps") or [])[:MAX_STEPS]:
                items.append({"sev": "good", "text": _clip(s, BODY_CHARS)})
            blocks.append({"type": "bullets", "items": items})

    blocks.append({"type": "cta", "label": d["cta_app"], "url": app_url()})
    if trial:
        blocks.append({"type": "cta", "label": d["cta_pricing"], "url": f"{site_url()}/pricing"})

    variant = (VARIANT_NO_CROP if len(no_crop) == len(fields)
               else VARIANT_ALERTS if alerts else VARIANT_CALM)
    return {"variant": variant, "ctx": ctx, "blocks": blocks}


def _score_tone(tone: Any) -> str | None:
    """field_wellness.tone is good|warn|bad, which is already the layout's tone vocabulary."""
    t = str(tone or "").lower()
    return t if t in ("good", "warn", "bad") else None


def _image_block(fields: list[dict], rasters: dict[str, dict], loc: str | None) -> list[dict]:
    """Satellite image of the first field that actually has a raster row. No row anywhere → no
    block at all, never a broken <img>."""
    d = _L(loc)
    for f in fields:
        r = rasters.get(str(f["id"]))
        if not r:
            continue
        return [
            {"type": "image", "url": raster_png_url(r["storage_path"]),
             "alt": d["img_alt"].format(field=f["name"] or ""),
             "href": f'{app_url()}/fields/{f["id"]}'},
            {"type": "text", "text": d["img_caption"].format(
                field=f["name"] or "", date=_date(r["acquired_at"], loc))},
        ]
    return []


def _empty_stats(loc: str | None) -> list[dict]:
    """The 'why bother' numbers for a farmer who has not drawn a field yet."""
    lang = (loc or "az")[:2].lower()
    if lang == "en":
        return [{"val": "2 min", "lab": "to set up"}, {"val": "9", "lab": "satellite indices"},
                {"val": "$0", "lab": "no card needed"}]
    if lang == "ru":
        return [{"val": "2 мин", "lab": "на настройку"}, {"val": "9", "lab": "спутниковых индексов"},
                {"val": "0 ₼", "lab": "карта не нужна"}]
    return [{"val": "2 dəq", "lab": "qurulma vaxtı"}, {"val": "9", "lab": "peyk indeksi"},
            {"val": "0 ₼", "lab": "kart tələb olunmur"}]
