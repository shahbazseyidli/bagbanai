"""FAO-56 daily soil-water balance + irrigation scheduling (T8 / B2).

Runs a running-depletion balance over the 7-day forecast: Dr_today = max(0, Dr_prev + ETc − P),
ETc = ET0 × Kc. When depletion reaches RAW (readily-available water = TAW × p, from the field's
soil profile — E1), it recommends topping up ~Dr mm on that date. It assumes the root zone starts
at field capacity (Dr=0) today — an honest MVP without a soil-moisture probe; the NDMI cross-check
sets a flag when the satellite moisture signal disagrees, so the reading isn't trusted blindly."""
from __future__ import annotations

import json

# Crop coefficient (mid-season Kc). A full stage-Kc curve is a later refinement (needs phenology).
_KC = {"hazelnut": 0.9, "grape": 0.7, "wheat": 1.0, "barley": 1.0, "cotton": 1.0,
       "corn": 1.1, "apple": 0.95, "potato": 1.05, "generic": 0.9}


async def _taw_raw(conn, field_id: str):
    row = await conn.fetchval(
        """select content from public.field_knowledge
           where field_id=$1::uuid and block_type='soil_profile'""", field_id)
    if not row:
        return None
    c = json.loads(row) if isinstance(row, str) else row
    wp = c.get("water_params") or {}
    taw, raw = wp.get("taw_mm"), wp.get("raw_mm")
    if taw is None or raw is None:
        return None
    return float(taw), float(raw)


async def _latest_ndmi(conn, field_id: str):
    v = await conn.fetchval(
        """select mean from public.index_stats
           where field_id=$1::uuid and index_name='NDMI' and sensor='S2' and mean is not null
           order by acquired_at desc limit 1""", field_id)
    return float(v) if v is not None else None


async def compute_balance(conn, field_id: str, org_id: str, crop_type) -> dict:
    """Recompute the daily balance; store it + return the recommendation. Never raises."""
    tr = await _taw_raw(conn, field_id)
    if not tr:
        return {"ok": False, "reason": "no_soil_water_params"}
    taw, raw = tr
    kc = _KC.get(crop_type or "generic", _KC["generic"])
    rows = await conn.fetch(
        """select distinct on (forecast_date) forecast_date, et0_mm, precip_mm
           from public.weather_cache
           where field_id=$1::uuid and forecast_date >= current_date
           order by forecast_date, fetched_at desc""", field_id)
    if not rows:
        return {"ok": False, "reason": "no_forecast"}

    await conn.execute("delete from public.field_water_balance where field_id=$1::uuid", field_id)
    dr = 0.0
    daily, reco_date, reco_mm = [], None, None
    for r in rows:
        et0 = float(r["et0_mm"] or 0.0)
        precip = float(r["precip_mm"] or 0.0)
        etc = round(et0 * kc, 2)
        dr = max(0.0, dr + etc - precip)
        need_here = dr >= raw and reco_date is None
        if need_here:
            reco_date, reco_mm = r["forecast_date"], round(dr)
        daily.append({"date": r["forecast_date"].isoformat(), "et0": et0, "etc": etc,
                      "precip": precip, "depletion": round(dr, 1)})
        await conn.execute(
            """insert into public.field_water_balance
                 (field_id, org_id, date, et0_mm, kc, etc_mm, precip_mm, depletion_mm, raw_mm, taw_mm, reco_mm)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7,$8,$9,$10,$11)
               on conflict (field_id, date) do update set
                 et0_mm=excluded.et0_mm, kc=excluded.kc, etc_mm=excluded.etc_mm,
                 precip_mm=excluded.precip_mm, depletion_mm=excluded.depletion_mm,
                 raw_mm=excluded.raw_mm, taw_mm=excluded.taw_mm, reco_mm=excluded.reco_mm,
                 updated_at=now()""",
            field_id, org_id, r["forecast_date"], et0, kc, etc, precip, round(dr, 1), raw, taw,
            (reco_mm if need_here else None))

    if reco_date:
        rec = (f"Suvarma tövsiyəsi: ~{reco_mm:.0f} mm, {reco_date.isoformat()} tarixinədək "
               f"(torpaq nəmliyi RAW {raw:.0f} mm həddinə çatır).")
    else:
        rec = "Növbəti 7 gündə suvarma tələb olunmur (torpaq nəmliyi RAW həddindən yuxarıdır)."

    # NDMI cross-check: model "dry" (needs water soon) but the canopy looks moist, or vice-versa.
    ndmi = await _latest_ndmi(conn, field_id)
    mismatch = None
    if ndmi is not None:
        model_dry = reco_date is not None
        if model_dry and ndmi > 0.35:
            mismatch = "Model suvarma deyir, lakin peyk nəmliyi (NDMI) yüksəkdir — torpağı yoxlayın."
        elif not model_dry and ndmi < 0.10:
            mismatch = "Model kifayət nəmlik deyir, lakin peyk nəmliyi (NDMI) aşağıdır — su stresi ola bilər."

    return {"ok": True, "taw_mm": taw, "raw_mm": raw, "kc": kc, "reco_mm": reco_mm,
            "reco_date": reco_date.isoformat() if reco_date else None,
            "recommendation": rec, "ndmi_mismatch": mismatch, "daily": daily}
