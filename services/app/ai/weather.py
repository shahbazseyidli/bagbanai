"""Weather refresh + water_requirements block (knowledge layer M8).

Pulls the Open-Meteo forecast for a field, caches it (weather_cache), and computes a simple
7-day water balance: net irrigation need ≈ Σ(ET0·Kc) − Σ(precip). Kc comes from the crop's
crop_thresholds.kc_stages when present, else a coarse per-habit default; the estimate is
labelled ET0-based so it never overclaims. Stored as a field_knowledge water_requirements block."""
from __future__ import annotations

import json
from typing import Optional

from . import knowledge as kb
from .sources import openmeteo

# Coarse fallback crop coefficient by habit when crop_thresholds.kc_stages is absent (FAO-56
# mid-season ballpark). Refined later by research / the kc_stages column.
_KC_DEFAULT = {"hazelnut": 0.9, "grape": 0.7, "wheat": 1.0, "cotton": 1.0, "generic": 0.9}


async def refresh_field(conn, field_id: str, *, base: str = "https://api.open-meteo.com/v1") -> dict:
    """Fetch + cache the forecast and (re)compute the water_requirements block. Best-effort."""
    row = await conn.fetchrow(
        """select f.org_id,
                  st_y(coalesce(f.centroid, st_centroid(f.geom))) as lat,
                  st_x(coalesce(f.centroid, st_centroid(f.geom))) as lon,
                  m.crop_type
           from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    if not row:
        return {"ok": False, "reason": "field_not_found"}
    org_id = str(row["org_id"])

    res = await openmeteo.fetch_weather(row["lat"], row["lon"], base=base)
    if not res.ok:
        return {"ok": False, "reason": res.error}

    # Cache each forecast day (idempotent on (field_id, forecast_date, fetched_at)).
    for d in res.data["days"]:
        await conn.execute(
            """insert into public.weather_cache
                 (field_id, org_id, forecast_date, t_min, t_max, precip_mm, precip_prob,
                  et0_mm, wind_max, rh_mean, raw)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
               on conflict (field_id, forecast_date, fetched_at) do nothing""",
            field_id, org_id, d["date"], d["t_min"], d["t_max"], d["precip_mm"], d["precip_prob"],
            d["et0_mm"], d["wind_max"], d["rh_mean"], json.dumps(d))

    # Water balance.
    kc = await _kc_for(conn, row["crop_type"])
    et0 = res.data["et0_total_mm"] or 0.0
    precip = res.data["precip_total_mm"] or 0.0
    etc = round(et0 * kc, 1)
    net_need = round(max(0.0, etc - precip), 1)
    if net_need >= 20:
        rec = f"Növbəti 7 gündə təxmini su tələbatı ~{net_need} mm-dir (yağış çıxılmaqla). Suvarma planlaşdır."
    elif net_need >= 8:
        rec = f"Növbəti 7 gündə orta su tələbatı (~{net_need} mm). Torpaq nəmliyini izlə."
    else:
        rec = f"Növbəti 7 gündə su balansı qənaətbəxşdir (~{net_need} mm net tələbat)."

    content = {"et0_total_mm": et0, "precip_total_mm": precip, "kc": kc, "etc_mm": etc,
               "net_irrigation_mm": net_need, "recommendation": rec, "horizon_days": 7}
    await kb.upsert_field_block(
        conn, field_id, org_id, "water_requirements", content, [res.source],
        kb.input_hash({"et0": et0, "precip": precip, "kc": kc}), confidence=0.8)
    return {"ok": True, "field_id": field_id, "net_irrigation_mm": net_need}


async def _kc_for(conn, crop_type: Optional[str]) -> float:
    """Kc from crop_thresholds.kc_stages (mid-season value if structured), else a habit default."""
    if crop_type:
        stages = await conn.fetchval(
            """select kc_stages from public.crop_thresholds
               where crop_type=$1 and growth_stage='all' and age_class='all'""", crop_type)
        if stages:
            s = json.loads(stages) if isinstance(stages, str) else stages
            # Accept {"mid": 1.1} or {"initial":..,"mid":..,"end":..}; prefer mid-season.
            if isinstance(s, dict):
                for key in ("mid", "mid_season", "peak"):
                    if isinstance(s.get(key), (int, float)):
                        return float(s[key])
    return _KC_DEFAULT.get((crop_type or "generic"), _KC_DEFAULT["generic"])
