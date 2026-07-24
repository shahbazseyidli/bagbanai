"""A4 — rain nowcast: the next ~2 hours of 15-minute precipitation for a field (Open-Meteo).

  GET /api/fields/{id}/rain-nowcast  — 15-minute precipitation steps + a plain-Azerbaijani verdict
                                       ("40 dəqiqəyə yağış gözlənilir — çiləməyi təxirə salın").

This answers exactly one question the farmer asks while standing at the sprayer: "can I spray right
now?". It is decoration on top of the real weather tab, so it NEVER fails loudly — an unreachable
Open-Meteo, an empty block or an unparseable timestamp all come back as
`{"available": false, "reason": ...}` with HTTP 200 and the strip simply does not render. The only
non-200s are the auth/gating ones (401/403/404), which must stay honest.

Org gating is server-side via the field (require_member); RLS is defence-in-depth only.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..ai.sources import openmeteo
from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["nowcast"])

# A 15-minute bucket at or above this counts as "it is raining in that bucket". 0.1 mm/15min is
# about the point where a spray application starts washing off — below it Open-Meteo is mostly
# reporting model noise.
RAIN_MM_THRESHOLD = 0.1

# The bucket labelled 13:00 covers 13:00-13:15, so at 13:07 it is still the CURRENT bucket and must
# be kept. Anything older than one interval is genuinely past.
_INTERVAL_MIN = 15


def _unavailable(reason: str, **extra: Any) -> dict:
    out = {"available": False, "reason": reason}
    out.update(extra)
    return out


def _parse_ts(ts: Any) -> Optional[datetime]:
    """Open-Meteo local ISO ('2026-07-24T13:00') → datetime. Never raises."""
    try:
        return datetime.fromisoformat(str(ts))
    except (TypeError, ValueError):
        return None


def _num(v: Any) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _window_label(minutes: int) -> str:
    """'2 saat' / '90 dəqiqə' with the right Azerbaijani locative suffix for the verdict."""
    if minutes % 60 == 0:
        return f"{minutes // 60} saatda"
    return f"{minutes} dəqiqədə"


async def _field_point(conn, field_id: str) -> tuple[float, float]:
    """(lat, lon) of the field centroid — 404 when the field has no usable geometry."""
    row = await conn.fetchrow(
        """select st_y(coalesce(f.centroid, st_centroid(f.geom))) as lat,
                  st_x(coalesce(f.centroid, st_centroid(f.geom))) as lon
           from public.fields f where f.id=$1::uuid and f.deleted_at is null""", field_id)
    if not row or row["lat"] is None or row["lon"] is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    return float(row["lat"]), float(row["lon"])


@router.get("/fields/{field_id}/rain-nowcast")
async def rain_nowcast(
    field_id: str,
    window: int = Query(default=120, ge=30, le=360, description="lookahead in minutes"),
    user_id: str = Depends(get_current_user_id),
):
    """Next `window` minutes of 15-minute precipitation for the field centroid + a spray verdict."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        lat, lon = await _field_point(conn, field_id)

    # Network call OUTSIDE the transaction — never hold a pooled connection across an external HTTP
    # round-trip. fetch_minutely already swallows every network/parse error into ok=False.
    res = await openmeteo.fetch_minutely(lat, lon)
    if not res.ok:
        return _unavailable(res.error or "openmeteo_unavailable", field_id=field_id)

    data = res.data or {}
    raw_steps = data.get("steps") or []
    if not raw_steps:
        return _unavailable("openmeteo_empty", field_id=field_id)

    try:
        offset = int(data.get("utc_offset_seconds") or 0)
    except (TypeError, ValueError):
        offset = 0

    # minutely_15 timestamps are naive LOCAL time under timezone=auto; compare them against a local
    # "now" built from the offset the same response reported. If a future API change ever returns
    # offset-aware stamps, compare those against UTC instead of silently drifting by the offset.
    now_utc = datetime.now(timezone.utc)
    now_local = (now_utc + timedelta(seconds=offset)).replace(tzinfo=None)

    steps: list[dict] = []
    for row in raw_steps:
        dt = _parse_ts(row.get("ts"))
        if dt is None:
            continue
        if dt.tzinfo is not None:
            delta_min = (dt - now_utc).total_seconds() / 60.0
        else:
            delta_min = (dt - now_local).total_seconds() / 60.0
        if delta_min <= -_INTERVAL_MIN or delta_min > float(window):
            continue
        steps.append({
            "ts": str(row.get("ts")),
            # The in-progress bucket reads as 0 so the UI never shows a negative offset.
            "minutes_from_now": max(0, int(round(delta_min))),
            "precip_mm": _num(row.get("precip")),
            "_delta": delta_min,
        })

    if not steps:
        return _unavailable("no_steps_in_window", field_id=field_id)
    if all(s["precip_mm"] is None for s in steps):
        return _unavailable("no_precipitation_data", field_id=field_id)

    values = [s["precip_mm"] or 0.0 for s in steps]
    total_mm = round(sum(values), 2)
    max_mm = round(max(values), 2)

    first_wet = next((s for s in steps if (s["precip_mm"] or 0.0) >= RAIN_MM_THRESHOLD), None)
    rain_expected = first_wet is not None

    minutes_to_rain: Optional[int] = None
    starts_at: Optional[str] = None
    if first_wet is not None:
        starts_at = first_wet["ts"]
        # Round to 5-minute granularity — a 15-minute model does not justify "37 dəqiqə".
        minutes_to_rain = max(0, int(round(first_wet["_delta"] / 5.0)) * 5)

    if rain_expected and (minutes_to_rain or 0) <= 0:
        verdict = "Hazırda yağış yağır — çiləməyi təxirə salın."
    elif rain_expected:
        verdict = f"{minutes_to_rain} dəqiqəyə yağış gözlənilir — çiləməyi təxirə salın."
    else:
        verdict = f"Yaxın {_window_label(int(window))} yağış gözlənilmir."

    for s in steps:
        s.pop("_delta", None)

    return {
        "available": True,
        "field_id": field_id,
        "verdict": verdict,
        "tone": "warn" if rain_expected else "ok",
        "rain_expected": rain_expected,
        "spray_safe": not rain_expected,
        "minutes_to_rain": minutes_to_rain,
        "starts_at": starts_at,
        "total_mm": total_mm,
        "max_mm": max_mm,
        "threshold_mm": RAIN_MM_THRESHOLD,
        "window_minutes": int(window),
        "interval_minutes": int(data.get("interval_minutes") or _INTERVAL_MIN),
        "steps": steps,
        "timezone": data.get("timezone"),
        "source": res.source or None,
    }
