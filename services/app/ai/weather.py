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
    from datetime import date as _date
    for d in res.data["days"]:
        fdate = _date.fromisoformat(d["date"]) if isinstance(d["date"], str) else d["date"]
        await conn.execute(
            """insert into public.weather_cache
                 (field_id, org_id, forecast_date, t_min, t_max, precip_mm, precip_prob,
                  et0_mm, wind_max, rh_mean, raw)
               values ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
               on conflict (field_id, forecast_date, fetched_at) do nothing""",
            field_id, org_id, fdate, d["t_min"], d["t_max"], d["precip_mm"], d["precip_prob"],
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

    # Spray window + weather alerts (E2), best-effort — never fails the water refresh.
    spray = {"ok": False}
    try:
        spray = await refresh_spray(conn, field_id, org_id, row["lat"], row["lon"], row["crop_type"], base)
    except Exception:  # noqa: BLE001
        pass
    return {"ok": True, "field_id": field_id, "net_irrigation_mm": net_need, "spray": spray}


# ===== Spray window + weather alerts (v2.1 B3/E2) =====
def _spray_suitability(hour: dict, next_hours: list) -> tuple[str, list]:
    """Per-hour spray suitability (spec B3.3). good | marginal | unsuitable + AZ reasons."""
    wind, temp, rh = hour.get("wind"), hour.get("temp"), hour.get("rh")
    if wind is None or temp is None or rh is None:
        return "unsuitable", ["məlumat yoxdur"]
    reasons = []
    if wind < 3:
        reasons.append("külək çox zəif — inversiya, dreyf riski")
    elif wind > 15:
        reasons.append("külək güclü — dreyf")
    if temp < 5 or temp > 28:
        reasons.append("temperatur uyğun deyil")
    if rh < 40:
        reasons.append("hava quru — damcı buxarlanır")
    if (hour.get("precip") or 0) > 0.1:
        reasons.append("yağış")
    if any((h.get("precip") or 0) > 0.2 for h in next_hours[:4]):
        reasons.append("4 saat içində yağış — yuyulma")
    if not reasons:
        return "good", []
    # A single soft factor (dryness) → marginal; anything else → unsuitable.
    if reasons == ["hava quru — damcı buxarlanır"]:
        return "marginal", reasons
    return "unsuitable", reasons


def compute_spray_window(hours: list) -> dict:
    """Hourly suitability + the earliest good daytime window (≥2 consecutive good hours)."""
    graded = []
    for i, h in enumerate(hours):
        s, r = _spray_suitability(h, hours[i + 1:i + 6])
        graded.append({"ts": h["ts"], "suitability": s, "reasons": r,
                       "wind": h.get("wind"), "temp": h.get("temp"), "rh": h.get("rh")})
    best = None
    run: list = []
    for e in graded:
        hr = int(e["ts"][11:13]) if len(e["ts"]) >= 13 else 12
        if e["suitability"] == "good" and 6 <= hr <= 20:
            run.append(e)
        else:
            if len(run) >= 2:
                break
            run = []
    if len(run) >= 2:
        best = {"start": run[0]["ts"], "end": run[-1]["ts"],
                "wind": run[0]["wind"], "temp": run[0]["temp"]}
    return {"hours": graded[:72], "best_window": best}


def compute_alerts(hours: list, frost_c: Optional[float], heat_c: Optional[float],
                   sensitive: bool) -> list:
    """Frost / heat / wind alerts from the next 48 h (spec B3.3). Phenology-sensitive frost = critical."""
    nxt = [h for h in hours[:48] if h.get("temp") is not None]
    alerts = []
    if nxt:
        tmin = min(h["temp"] for h in nxt)
        thr = frost_c if frost_c is not None else 2.0
        if tmin <= thr:
            alerts.append({"type": "frost", "severity": "critical" if sensitive else "warning",
                           "detail": f"Növbəti 48 saatda minimum {tmin:.0f}°C"})
        tmax = max(h["temp"] for h in nxt)
        if heat_c is not None and tmax >= heat_c:
            alerts.append({"type": "heat", "severity": "warning",
                           "detail": f"Növbəti 48 saatda maksimum {tmax:.0f}°C (istilik stresi)"})
    winds = [h["wind"] for h in hours[:48] if h.get("wind") is not None]
    if winds and max(winds) > 40:
        alerts.append({"type": "wind", "severity": "warning",
                       "detail": f"Güclü külək {max(winds):.0f} km/s"})
    return alerts


async def refresh_spray(conn, field_id: str, org_id: str, lat: float, lon: float,
                        crop_type: Optional[str], base: str) -> dict:
    """Fetch hourly forecast → spray window + alerts → field block + critical notifications."""
    from .sources import openmeteo
    res = await openmeteo.fetch_hourly(lat, lon, base=base)
    if not res.ok:
        return {"ok": False, "reason": res.error}
    hours = res.data["hours"]
    # Crop thresholds for alerts.
    frost_c = heat_c = None
    if crop_type:
        row = await conn.fetchval(
            """select json_build_object('f', frost_threshold_c, 'h', heat_threshold_c)
               from public.crop_thresholds where crop_type=$1 and growth_stage='all' and age_class='all'""",
            crop_type)
        if row:
            r = json.loads(row) if isinstance(row, str) else row
            frost_c, heat_c = r.get("f"), r.get("h")
    sw = compute_spray_window(hours)
    # Frost is "sensitive" if the field is flowering/budding (from metadata growth_stage).
    stage = await conn.fetchval(
        "select growth_stage from public.field_metadata where field_id=$1::uuid", field_id)
    sensitive = bool(stage and any(k in str(stage).lower() for k in ("çiçək", "flower", "tumurcuq", "bud")))
    alerts = compute_alerts(hours, frost_c, heat_c, sensitive)
    content = {"best_window": sw["best_window"], "hours": sw["hours"], "alerts": alerts}
    await kb.upsert_field_block(conn, field_id, org_id, "spray_window", content, [res.source],
                               kb.input_hash({"n": len(hours)}), confidence=0.85)
    # Notifications are NOT inserted here anymore — the rule engine (services/app/rules) reads these
    # stored alerts and dispatches them through one deduped/quiet-hours/cooldown path (T1). Callers
    # run rules.run_rules(conn, field_id) after refreshing weather.
    return {"ok": True, "alerts": len(alerts), "best_window": sw["best_window"] is not None}


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
