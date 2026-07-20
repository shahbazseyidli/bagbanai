"""Assemble the per-field context the AI reasons over: NASA index trends + crop
metadata + completed work (scouting/tasks/operations/yields) + prior advice.

Everything is read through the RLS-scoped connection the caller already holds."""
from __future__ import annotations

import json
from typing import Any

INDICES = ["NDVI", "NDMI", "NDWI", "EVI", "SAVI", "NBR"]


async def _index_trends(conn, field_id: str) -> list[dict]:
    """Latest value, ~4-weeks-ago value, and 90-day min/max per index (field mean)."""
    rows = await conn.fetch(
        """
        with prim as (
          -- Pick the field's freshest sensor family so trends never mix 10m S2 with 30m HLS:
          -- HLS (S30/L30) while it keeps updating, else Sentinel-2 — so AI trends survive an
          -- Earthdata token lapse (HLS freezes → S2 becomes freshest → trends follow S2).
          select max(acquired_at) filter (where sensor in ('S30','L30'))
                 >= coalesce(max(acquired_at) filter (where sensor not in ('S30','L30')),
                             '-infinity'::date) as use_hls
          from public.index_stats
          where field_id=$1::uuid and acquired_at >= current_date - 120
        ),
        recent as (
          select i.index_name, i.acquired_at, i.mean,
                 row_number() over (partition by i.index_name order by i.acquired_at desc) as rn
          from public.index_stats i, prim
          where i.field_id=$1::uuid and i.acquired_at >= current_date - 120
            and ( (prim.use_hls and i.sensor in ('S30','L30'))
               or (coalesce(prim.use_hls, false) is not true and i.sensor not in ('S30','L30')) )
        )
        select index_name,
               max(mean) filter (where rn=1)               as latest,
               max(acquired_at) filter (where rn=1)        as latest_date,
               avg(mean) filter (where rn between 4 and 8) as prior,
               min(mean)                                   as min90,
               max(mean)                                   as max90
        from recent
        group by index_name
        """, field_id)
    out = []
    for r in rows:
        if r["index_name"] not in INDICES or r["latest"] is None:
            continue
        latest = float(r["latest"])
        prior = float(r["prior"]) if r["prior"] is not None else None
        trend = None
        if prior is not None:
            d = latest - prior
            trend = "yüksəlir" if d > 0.03 else "düşür" if d < -0.03 else "sabit"
        out.append({
            "index": r["index_name"],
            "latest": round(latest, 3),
            "latest_date": r["latest_date"].isoformat() if r["latest_date"] else None,
            "four_weeks_ago": round(prior, 3) if prior is not None else None,
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

    def rows(rs):
        return [dict(r) for r in rs]

    ctx = {
        "field": dict(field) if field else {"name": "sahə"},
        "satellite_indices": await _index_trends(conn, field_id),
        "scouting": rows(scouting),
        "operations": rows(operations),
        "open_tasks": rows(tasks),
        "yields": rows(yields),
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
