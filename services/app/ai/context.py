"""Assemble the per-field context the AI reasons over: NASA index trends + crop
metadata + completed work (scouting/tasks/operations/yields) + prior advice.

Everything is read through the RLS-scoped connection the caller already holds."""
from __future__ import annotations

import json
from typing import Any

# Indices the AI advice reasons over (S2-only trends — see index_trends).
INDICES = ["NDVI", "NDMI", "NDWI", "EVI", "SAVI", "NBR"]
# Indices surfaced on the Overview ("İcmal") insight page — adds the S2-only red-edge NDRE.
INSIGHT_INDICES = ["NDVI", "NDRE", "EVI", "SAVI", "NDMI", "NDWI"]

# DB sensor codes per UI sensor family: Sentinel-2 = 'S2', NASA HLS = 'S30'/'L30'.
_SENSOR_SQL = {"S2": "i.sensor = 'S2'", "HLS": "i.sensor in ('S30','L30')"}


async def index_trends(
    conn, field_id: str, sensor: str = "S2", indices: list[str] | None = None,
) -> list[dict]:
    """Latest value, a ~3-weeks-ago value (+ its date), trend, and 90-day min/max per index
    (field mean), restricted to ONE sensor family.

    The AI advice uses S2 exclusively (product decision: the agronomist reasons over the sharp
    10m Sentinel-2 signal only, never mixed with 30m HLS). If the field has no S2 scenes yet the
    list is empty and advice degrades gracefully to metadata + knowledge. The Overview insight
    endpoint reuses this for both sensors so it can show whichever arrived first."""
    indices = indices or INDICES
    cond = _SENSOR_SQL.get(sensor, _SENSOR_SQL["S2"])
    rows = await conn.fetch(
        f"""
        with recent as (
          select i.index_name, i.acquired_at, i.mean,
                 row_number() over (partition by i.index_name order by i.acquired_at desc) as rn
          from public.index_stats i
          where i.field_id=$1::uuid and i.acquired_at >= current_date - 120
            and {cond}
        )
        select index_name,
               max(mean) filter (where rn=1)               as latest,
               max(acquired_at) filter (where rn=1)        as latest_date,
               avg(mean) filter (where rn between 3 and 6) as prior,
               max(acquired_at) filter (where rn=4)        as prior_date,
               min(mean)                                   as min90,
               max(mean)                                   as max90
        from recent
        group by index_name
        """, field_id)
    out = []
    for r in rows:
        if r["index_name"] not in indices or r["latest"] is None:
            continue
        latest = float(r["latest"])
        prior = float(r["prior"]) if r["prior"] is not None else None
        latest_date = r["latest_date"]
        prior_date = r["prior_date"]
        trend, delta, pct, days = None, None, None, None
        if prior is not None:
            delta = latest - prior
            trend = "yüksəlir" if delta > 0.03 else "düşür" if delta < -0.03 else "sabit"
            pct = round(delta / prior * 100, 1) if abs(prior) > 1e-6 else None
            if latest_date and prior_date:
                days = (latest_date - prior_date).days
        out.append({
            "index": r["index_name"],
            "latest": round(latest, 3),
            "latest_date": latest_date.isoformat() if latest_date else None,
            "prior": round(prior, 3) if prior is not None else None,
            "prior_date": prior_date.isoformat() if prior_date else None,
            "four_weeks_ago": round(prior, 3) if prior is not None else None,  # back-compat
            "delta": round(delta, 3) if delta is not None else None,
            "pct": pct,
            "days": days,
            "trend": trend,
            "min_90d": round(float(r["min90"]), 3) if r["min90"] is not None else None,
            "max_90d": round(float(r["max90"]), 3) if r["max90"] is not None else None,
        })
    return out


async def build_field_context(conn, field_id: str) -> dict[str, Any]:
    field = await conn.fetchrow(
        """select f.name, round(f.area_ha::numeric,2) as area_ha,
                  m.crop_type, m.variety, m.planting_date, m.expected_harvest,
                  m.soil_type, m.soil_ph, m.irrigation_method, m.irrigation_available,
                  m.growth_stage, m.previous_crop, m.notes
           from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    scouting = await conn.fetch(
        """select category, severity, note, observed_at::date as date
           from public.scouting_observations where field_id=$1::uuid
           order by observed_at desc limit 8""", field_id)
    operations = await conn.fetch(
        """select type, performed_on as date, notes
           from public.field_operations where field_id=$1::uuid
           order by performed_on desc limit 8""", field_id)
    tasks = await conn.fetch(
        """select title, status, due_date, priority from public.tasks
           where field_id=$1::uuid and status <> 'done'
           order by due_date nulls last limit 8""", field_id)
    yields = await conn.fetch(
        """select season_year, yield_value, yield_unit from public.yields
           where field_id=$1::uuid order by season_year desc limit 5""", field_id)
    prior = await conn.fetchrow(
        """select summary, generated_at::date as date from public.advice
           where field_id=$1::uuid order by generated_at desc limit 1""", field_id)

    # Marketplace-era inputs (0031): latest soil analysis, AI-labeled photos, fertilizer plan. The AI
    # advice folds these in (req #4 soil, #6 photos). Defensive: if the tables are missing (migration
    # not yet applied) fall back to empty so advice still runs.
    soil = photos = fert = None
    spray_restriction = None
    try:
        soil = await conn.fetchrow(
            """select ph, organic_matter_pct, nitrogen, phosphorus, potassium, texture, source
               from public.soil_profiles where field_id=$1::uuid order by created_at desc limit 1""", field_id)
        photos = await conn.fetch(
            """select ai_label, ai_condition, ai_notes, created_at::date as date
               from public.field_photos where field_id=$1::uuid and ai_label is not null
               order by created_at desc limit 6""", field_id)
        fert = await conn.fetch(
            """select product, zone, dose, status, planned_on from public.fertilizer_plans
               where field_id=$1::uuid order by planned_on desc nulls last limit 6""", field_id)
        # B6 active pre-harvest interval: latest spray whose safe date is still in the future.
        sr = await conn.fetchrow(
            """select performed_on, phi_days,
                      (performed_on + (phi_days || ' days')::interval)::date as safe_date
               from public.field_operations
               where field_id=$1::uuid and phi_days is not null and phi_days > 0
                 and (performed_on + (phi_days || ' days')::interval)::date > current_date
               order by safe_date desc limit 1""", field_id)
        if sr:
            spray_restriction = {
                "last_spray": sr["performed_on"], "phi_days": sr["phi_days"],
                "safe_harvest_date": sr["safe_date"], "harvest_blocked": True,
            }
    except Exception:  # noqa: BLE001 — pre-migration/degraded: advice continues satellite-only
        pass

    def rows(rs):
        return [dict(r) for r in (rs or [])]

    # AI reasons over Sentinel-2 (10m) trends ONLY — never HLS (product decision).
    s2_trends = await index_trends(conn, field_id, sensor="S2")

    ctx = {
        "field": dict(field) if field else {"name": "sahə"},
        "satellite_source": "Sentinel-2 (10m)",
        "satellite_status": None if s2_trends else "Sentinel-2 məlumatı hələ hazırlanır",
        "satellite_indices": s2_trends,
        "scouting": rows(scouting),
        "operations": rows(operations),
        "open_tasks": rows(tasks),
        "yields": rows(yields),
        "soil_analysis": dict(soil) if soil else None,
        "recent_photos": rows(photos),
        "fertilizer_plan": rows(fert),
        "spray_restriction": spray_restriction,
        "previous_advice_summary": prior["summary"] if prior else None,
        # Knowledge Passport (M6): zone + field research blocks the advice reasons over
        # (crop norms, phenology, pests, soil, resolved clarifications). Empty until the
        # research worker has run — advice degrades gracefully to satellite-only.
        "knowledge_passport": await _knowledge_passport(conn, field_id, field),
    }
    # ISO-ify dates for JSON.
    return json.loads(json.dumps(ctx, default=str))


async def _knowledge_passport(conn, field_id: str, field) -> dict:
    """Compact passport for the advice prompt: zone knowledge (crop_profile/phenology/
    pest_disease/water/agro) + field blocks (soil, resolved clarifications). Trimmed to
    summaries so it stays token-cheap."""
    from . import knowledge as kb
    crop_type = field["crop_type"] if field and "crop_type" in field else None
    ctx_block = await conn.fetchval(
        """select content from public.field_knowledge
           where field_id=$1::uuid and block_type='field_context'""", field_id)
    zone_id = None
    if ctx_block:
        import json as _json
        c = _json.loads(ctx_block) if isinstance(ctx_block, str) else ctx_block
        zone_id = c.get("zone_id")
    passport = await kb.load_passport(conn, field_id, crop_type, zone_id)
    zone = {k: v.get("content") for k, v in (passport.get("zone") or {}).items()}
    fld = {k: v.get("content") for k, v in (passport.get("field") or {}).items()
           if k in ("soil_profile", "resolved_clarifications")}
    return {"zone_id": zone_id, "zone": zone, "field": fld}
