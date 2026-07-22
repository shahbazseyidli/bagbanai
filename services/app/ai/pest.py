"""Pest/disease risk (T9 / B1).

A risk candidate is produced when the field's cumulative GDD (T4) sits inside a pest's development
window and, for wetness-driven diseases, recent leaf-wetness is present (proxy: a recent day with
>1 mm rain or mean RH > 85%). Candidates flow through the rule engine (T1), which dedups/cooldowns
them. SAFETY (Rule 7): the message states the problem type + points to the official registered-
product list + an agronomist — never a pesticide name or dose. Farmers can mute a confirmed-absent
pest (Rule 12)."""
from __future__ import annotations

from datetime import datetime, timezone


async def _wetness_recent(conn, field_id: str) -> bool:
    r = await conn.fetchval(
        """select bool_or((coalesce(precip_mm,0) > 1) or (coalesce(rh_mean,0) > 85))
           from (select distinct on (forecast_date) forecast_date, precip_mm, rh_mean
                 from public.weather_cache
                 where field_id=$1::uuid and forecast_date >= current_date - 2
                 order by forecast_date, fetched_at desc) t""", field_id)
    return bool(r)


async def pest_candidates(conn, field_id: str) -> list[dict]:
    """Rule-engine producer: current pest/disease risks for the field (T9)."""
    row = await conn.fetchrow(
        """select m.crop_type from public.fields f
           left join public.field_metadata m on m.field_id=f.id where f.id=$1::uuid""", field_id)
    crop = row["crop_type"] if row else None
    if not crop:
        return []
    gdd = await conn.fetchval(
        """select gdd_cumulative from public.field_gdd_daily
           where field_id=$1::uuid order by date desc limit 1""", field_id)
    if gdd is None:
        return []
    gdd = float(gdd)

    models = await conn.fetch(
        "select pest_name, pest_type, gdd_lo, gdd_hi, needs_wetness, note "
        "from public.pest_risk_models where crop_type=$1", crop)
    if not models:
        return []
    now = datetime.now(timezone.utc)
    mutes = await conn.fetch(
        "select pest_name, muted_until from public.field_pest_mutes where field_id=$1::uuid", field_id)
    muted = {m["pest_name"] for m in mutes if m["muted_until"] > now}

    wet = None  # lazily fetched only if a wetness-driven model is in-window
    out: list[dict] = []
    for m in models:
        if m["pest_name"] in muted:
            continue
        if not (float(m["gdd_lo"]) <= gdd <= float(m["gdd_hi"])):
            continue
        if m["needs_wetness"]:
            if wet is None:
                wet = await _wetness_recent(conn, field_id)
            if not wet:
                continue
        kind = "Xəstəlik" if m["pest_type"] == "disease" else "Zərərverici"
        out.append({
            "rule_type": f"pest:{m['pest_name']}",
            "severity": "warning",
            "source": "pest",
            "title": f"🐛 Risk: {m['pest_name']}",
            "body": (f"{kind} inkişaf pəncərəsi aktivdir (GDD {gdd:.0f}). {m['note'] or ''} "
                     f"Sahəni yoxlayın. Preparat üçün Azərbaycanda qeydiyyatdan keçmiş vasitələr "
                     f"siyahısına baxın və aqronomla məsləhətləşin (dəqiq ad/doza AI tərəfindən verilmir)."),
            "dedup_key": "",
        })
    return out
