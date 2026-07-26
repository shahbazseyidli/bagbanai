"""Field Wellness Score (HYBRID_PLAN B8).

One 0-100 number per field per day, assembled ONLY from inputs that already exist in the platform:

  * vegetation — latest NDVI level (crop-calibrated bands, M5) + how it sits against the field's own
    per-week baseline (T6) + the short-term trend (context.index_trends).
  * water      — FAO-56 running depletion vs RAW/TAW (T8); falls back to the satellite moisture
    signal (NDMI) when the balance has not been computed for this field.
  * pest       — active pest/disease development windows (T9, ai/pest.pest_candidates).
  * gdd        — heat accumulation pace vs the SAME day-of-year in the field's previous season (T4).

HONESTY RULE (the whole point of the design): a component whose input is unavailable is DROPPED and
its name recorded in `missing`; the remaining weights are renormalized. A missing input is never
scored as zero — that would quietly punish a farmer for data the platform does not have. When every
component is missing there is no score at all (`available=False`), not a fabricated one.

PROXY RULE (the second half of the same honesty): when a component is scored from a STAND-IN signal
rather than its real measurement, it must not speak with the authority of the real one. Concretely,
a proxy-sourced component:
  1. is compressed into the middle band `_PROXY_MIN.._PROXY_MAX` (25..85) — it can neither scream
     "critical" nor certify "perfect"; only the real measurement earns the full 0..100 range;
  2. carries its OWN label (`label_code`), never the label of the measurement it stands in for —
     NDMI is a canopy-moisture signal, not a soil-water balance;
  3. can never on its own push the verdict to the worst tone, nor be named as the deciding "worst"
     component while a real measurement is present.
The concrete case this rule exists for: a July field with a sparse canopy legitimately reads
NDMI ≈ -0.13. Mapped linearly onto 0..100 that clamped to 0.0 and — at 0.25/0.65 = 38% of the
composite — dragged a 45-point field down to 28/100 with the headline "water balance critical",
while the very same component's reason line admitted the balance had never been computed.

Deterministic — no LLM call, so it is cheap enough to compute on demand inside a GET.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from . import pest as pest_mod
from .analytics import MIN_HISTORY
from .context import index_trends

# Base weights. Renormalized over whichever components actually have inputs.
WEIGHTS: dict[str, float] = {"ndvi": 0.40, "water": 0.25, "pest": 0.20, "gdd": 0.15}

LABELS: dict[str, str] = {
    "ndvi": "Bitki örtüyü",
    "water": "Su balansı",
    "pest": "Zərərverici riski",
    "gdd": "İstilik toplanması (GDD)",
}

# AZ prose fallbacks for proxy-sourced component labels, keyed by `label_code`. The localized text
# lives in the frontend dictionaries under `app.wl.label.<code>` / `app.wl.labelLower.<code>`.
PROXY_LABELS: dict[str, str] = {"water.ndmi": "Peyk nəmlik siqnalı"}

# Proxy band (PROXY RULE #1). A stand-in signal is mapped into 25..85 — never the extremes, which
# are reserved for real measurements. 25 still reads as a clear "warn"; 85 is a solid "good" but
# stops short of certifying perfection.
_PROXY_MIN = 25.0
_PROXY_MAX = 85.0

# NDMI domain the proxy band spans. Below -0.20 canopy moisture is as low as the sensor usefully
# distinguishes; above 0.40 it saturates. Linear and monotonic in between, so the signal still moves.
_NDMI_LO = -0.20
_NDMI_HI = 0.40

# Universal NDVI band edges (çox zəif | zəif | orta | sağlam | çox sağlam) used when the crop has
# no calibrated crop_thresholds.index_norms row.
_UNIVERSAL_NDVI_EDGES = [0.20, 0.35, 0.50, 0.70]

# Tone cut-offs (matches lib/indexStatus Tone).
_GOOD_MIN = 70
_WARN_MIN = 45

# A vegetation reading older than this is treated as absent (clouds / no scenes yet).
_FRESH_DAYS = 45


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _band_score(value: float, edges: list[float]) -> float:
    """Map a value onto 0..100 through 4 ascending band edges (5 tiers, 20 points each)."""
    e = sorted(float(x) for x in edges)
    if value <= e[0]:  # bottom tier: 0..20 over one band width below the first edge
        w = max(e[1] - e[0], 1e-6)
        return _clamp(20.0 * (value - (e[0] - w)) / w)
    for i in range(3):
        if value <= e[i + 1]:
            frac = (value - e[i]) / max(e[i + 1] - e[i], 1e-6)
            return _clamp(20.0 * (i + 1) + 20.0 * frac)
    w = max(e[3] - e[2], 1e-6)  # top tier: 80..100 over one more band width
    return _clamp(80.0 + 20.0 * (value - e[3]) / w)


def _sensor_family(sensor: Optional[str]) -> str:
    return "S2" if sensor == "S2" else "HLS"


async def _ndvi_edges(conn, crop_type: Optional[str]) -> tuple[list[float], bool]:
    """Crop-calibrated NDVI band edges (M5) with a generic → universal fallback.
    Returns (edges, calibrated_for_crop)."""
    for crop, calibrated in ((crop_type, True), ("generic", False)):
        if not crop:
            continue
        norms = await conn.fetchval(
            """select index_norms from public.crop_thresholds
               where crop_type=$1 and growth_stage='all' and age_class='all'""", crop)
        if isinstance(norms, str):
            try:
                norms = json.loads(norms)
            except ValueError:
                norms = None
        if isinstance(norms, dict):
            edges = norms.get("NDVI")
            if isinstance(edges, list) and len(edges) == 4 and all(
                    isinstance(x, (int, float)) for x in edges):
                return [float(x) for x in edges], calibrated
    return list(_UNIVERSAL_NDVI_EDGES), False


def _baseline_score(latest: float, p10: float, p50: float, p90: float) -> float:
    """Where the reading sits inside the field's own historical spread for this week."""
    if latest <= p10:
        return _clamp(40.0 * (latest / p10)) if p10 > 1e-6 else 0.0
    if latest <= p50:
        return _clamp(40.0 + 25.0 * (latest - p10) / max(p50 - p10, 1e-6))
    if latest <= p90:
        return _clamp(65.0 + 25.0 * (latest - p50) / max(p90 - p50, 1e-6))
    return 95.0


async def _vegetation(conn, field_id: str, crop_type: Optional[str]) -> Optional[dict]:
    """NDVI level (crop bands) blended with the field's own weekly baseline, nudged by the trend."""
    row = await conn.fetchrow(
        """select mean, acquired_at, sensor, extract(week from acquired_at)::int as wk
           from public.index_stats
           where field_id=$1::uuid and index_name='NDVI' and mean is not null
             and acquired_at >= current_date - $2::int
           order by acquired_at desc, (case when sensor='S2' then 0 else 1 end)
           limit 1""", field_id, _FRESH_DAYS)
    if not row or row["mean"] is None:
        return None

    latest = float(row["mean"])
    family = _sensor_family(row["sensor"])
    edges, calibrated = await _ndvi_edges(conn, crop_type)
    level = _band_score(latest, edges)
    score = level
    parts = [f"NDVI {latest:.2f}"]
    if calibrated and crop_type:
        parts.append(f"{crop_type} normaları üzrə")

    base = await conn.fetchrow(
        """select p10, p50, p90, n from public.field_index_baseline
           where field_id=$1::uuid and index_name='NDVI' and week=$2""", field_id, row["wk"])
    baseline_used = None
    baseline_pos = None  # below | within | above — localizable enum for the frontend renderer
    if base and base["n"] is not None and base["n"] >= MIN_HISTORY and base["p50"] is not None:
        baseline_used = _baseline_score(
            latest, float(base["p10"] or 0.0), float(base["p50"]), float(base["p90"] or base["p50"]))
        score = 0.6 * level + 0.4 * baseline_used
        if latest < float(base["p10"] or 0.0):
            baseline_pos = "below"
            parts.append("öz çoxillik normasından aşağı")
        elif latest > float(base["p90"] or base["p50"]):
            baseline_pos = "above"
            parts.append("öz normasından yuxarı")
        else:
            baseline_pos = "within"
            parts.append("öz norması daxilində")

    trend, delta = None, None
    for tr in await index_trends(conn, field_id, sensor=family, indices=["NDVI"]):
        if tr["index"] == "NDVI":
            trend, delta = tr.get("trend"), tr.get("delta")
    if delta is not None:
        if delta > 0.03:
            score += 5
        elif delta < -0.03:
            score -= 10
    if trend:
        parts.append(f"son həftələrdə {trend}")

    return {
        "score": round(_clamp(score), 1),
        "value": round(latest, 3),
        "sensor": family,
        "reason": ", ".join(parts) + ".",
        # Machine-readable twin of `reason`: a stable code + the raw params the frontend renders in
        # the active locale. `reason` above stays the AZ fallback. veg is a COMPOSITE the frontend
        # assembles from these flags (calibrated / baseline / delta).
        "extra": {"level_score": round(level, 1),
                  "baseline_score": round(baseline_used, 1) if baseline_used is not None else None,
                  "trend": trend, "delta": delta, "calibrated": calibrated,
                  "baseline": baseline_pos,
                  "reason_code": "veg",
                  "reason_params": {"ndvi": f"{latest:.2f}", "crop": crop_type},
                  "measured_on": row["acquired_at"].isoformat() if row["acquired_at"] else None},
    }


async def _water(conn, field_id: str) -> Optional[dict]:
    """FAO-56 depletion vs RAW/TAW (T8); NDMI as the satellite fallback."""
    wb = await conn.fetchrow(
        """select date, depletion_mm, raw_mm, taw_mm, reco_mm
           from public.field_water_balance
           where field_id=$1::uuid and date >= current_date
           order by date asc limit 1""", field_id)
    if not wb:
        wb = await conn.fetchrow(
            """select date, depletion_mm, raw_mm, taw_mm, reco_mm
               from public.field_water_balance where field_id=$1::uuid
               order by date desc limit 1""", field_id)
    if wb and wb["depletion_mm"] is not None and wb["raw_mm"] is not None:
        dr = float(wb["depletion_mm"])
        raw = max(float(wb["raw_mm"]), 1e-6)
        taw = float(wb["taw_mm"]) if wb["taw_mm"] is not None else raw * 2
        if dr <= raw:
            score = 100.0 - 40.0 * (dr / raw)
            why = "kök zonasında su ehtiyatı kifayətdir"
            code = "water.sufficient"
        else:
            score = 60.0 - 60.0 * min(1.0, (dr - raw) / max(taw - raw, 1e-6))
            why = "su ehtiyatı kritik həddi keçib — suvarma lazımdır"
            code = "water.critical"
        reco = _f(wb["reco_mm"])
        if reco:
            why += f" (tövsiyə ≈ {reco:.0f} mm)"
        params = {"depletion": int(round(dr)), "raw": int(round(raw))}
        if reco:
            params["reco"] = int(round(reco))
        return {"score": round(_clamp(score), 1), "value": round(dr, 1), "sensor": None,
                "reason": f"Su balansı: çatışmazlıq {dr:.0f} mm / RAW {raw:.0f} mm — {why}.",
                # The real FAO-56 measurement keeps the full 0..100 range — it has earned it.
                "extra": {"source": "water_balance", "proxy": False, "depletion_mm": round(dr, 1),
                          "raw_mm": round(raw, 1), "taw_mm": round(taw, 1), "reco_mm": reco,
                          "reason_code": code, "reason_params": params}}

    ndmi = await conn.fetchrow(
        """select mean, sensor from public.index_stats
           where field_id=$1::uuid and index_name='NDMI' and mean is not null
             and acquired_at >= current_date - $2::int
           order by acquired_at desc, (case when sensor='S2' then 0 else 1 end)
           limit 1""", field_id, _FRESH_DAYS)
    if ndmi and ndmi["mean"] is not None:
        v = float(ndmi["mean"])
        # PROXY RULE #1: NDMI is canopy moisture, not a soil-water balance. The old mapping
        # ((v+0.05)/0.45*100) sent every negative reading to 0.0 — a sparse July canopy at NDMI
        # -0.13 scored 0 and, weighted at ~38%, produced a fabricated "critical" verdict. The
        # proxy is now compressed into _PROXY_MIN.._PROXY_MAX: still monotonic in NDMI, but it can
        # neither reach 0 (critical) nor 100 (perfect) — only a real measurement earns those.
        frac = (v - _NDMI_LO) / (_NDMI_HI - _NDMI_LO)
        score = _clamp(_PROXY_MIN + (_PROXY_MAX - _PROXY_MIN) * frac, _PROXY_MIN, _PROXY_MAX)
        return {"score": round(score, 1), "value": round(v, 3), "sensor": _sensor_family(ndmi["sensor"]),
                # PROXY RULE #2: its own name. Calling this "Su balansı" claimed a balance that was
                # never computed — the reason line right below it said so in the same breath.
                "label": PROXY_LABELS["water.ndmi"], "label_code": "water.ndmi",
                "reason": f"Peyk nəmlik siqnalı NDMI {v:.2f} (torpaq-su balansı hesablanmayıb).",
                "extra": {"source": "ndmi", "proxy": True,
                          "reason_code": "water.ndmi", "reason_params": {"ndmi": f"{v:.2f}"}}}
    return None


async def _pest(conn, field_id: str, crop_type: Optional[str]) -> Optional[dict]:
    """Active pest/disease windows (T9). Missing when the crop, the GDD series or a model set
    for the crop is absent — those cases cannot be scored, only skipped."""
    if not crop_type:
        return None
    gdd = await conn.fetchval(
        """select gdd_cumulative from public.field_gdd_daily
           where field_id=$1::uuid order by date desc limit 1""", field_id)
    if gdd is None:
        return None
    models = await conn.fetchval(
        "select count(*) from public.pest_risk_models where crop_type=$1", crop_type)
    if not models:
        return None

    candidates = await pest_mod.pest_candidates(conn, field_id)
    n = len(candidates)
    score = _clamp(100.0 - 30.0 * n, 10.0, 100.0)
    if n == 0:
        reason = f"Aktiv zərərverici/xəstəlik pəncərəsi yoxdur (GDD {float(gdd):.0f})."
        code, params = "pest.none", {"gdd": int(round(float(gdd)))}
    else:
        names = ", ".join(c["rule_type"].split(":", 1)[-1] for c in candidates[:3])
        reason = f"{n} aktiv risk pəncərəsi: {names}."
        code, params = "pest.active", {"n": n, "names": names}
    return {"score": round(score, 1), "value": n, "sensor": None, "reason": reason,
            "extra": {"active": n, "gdd": round(float(gdd), 1),
                      "pests": [c["rule_type"].split(":", 1)[-1] for c in candidates],
                      "reason_code": code, "reason_params": params}}


async def _gdd(conn, field_id: str) -> Optional[dict]:
    """Heat-accumulation pace vs the SAME day-of-year in the field's previous season. Without a
    prior season there is no defensible expectation → the component is dropped, not guessed."""
    cur = await conn.fetchrow(
        """select date, season_year, gdd_cumulative, extract(doy from date)::int as doy
           from public.field_gdd_daily where field_id=$1::uuid
           order by date desc limit 1""", field_id)
    if not cur or cur["gdd_cumulative"] is None:
        return None
    prior = await conn.fetchrow(
        """select season_year, gdd_cumulative, extract(doy from date)::int as doy
           from public.field_gdd_daily
           where field_id=$1::uuid and season_year < $2
             and extract(doy from date) <= $3 and extract(doy from date) >= $3 - 10
           order by season_year desc, date desc limit 1""",
        field_id, cur["season_year"], cur["doy"])
    if not prior or prior["gdd_cumulative"] is None or float(prior["gdd_cumulative"]) < 50:
        return None

    now_v, prior_v = float(cur["gdd_cumulative"]), float(prior["gdd_cumulative"])
    ratio = now_v / prior_v
    score = _clamp(100.0 - min(60.0, abs(ratio - 1.0) * 200.0), 40.0, 100.0)
    pct = round((ratio - 1.0) * 100.0, 1)
    gdd_i = int(round(now_v))
    if pct <= -5:
        why = f"keçən mövsümün bu vaxtından {abs(pct):.0f}% geri"
        code, params = "gdd.behind", {"gdd": gdd_i, "pct": int(round(abs(pct)))}
    elif pct >= 5:
        why = f"keçən mövsümün bu vaxtından {pct:.0f}% qabaq"
        code, params = "gdd.ahead", {"gdd": gdd_i, "pct": int(round(pct))}
    else:
        why = "keçən mövsümlə eyni templə"
        code, params = "gdd.onpace", {"gdd": gdd_i}
    return {"score": round(score, 1), "value": round(now_v, 1), "sensor": None,
            "reason": f"İstilik toplanması {now_v:.0f} GDD — {why}.",
            "extra": {"current": round(now_v, 1), "prior": round(prior_v, 1),
                      "prior_season": prior["season_year"], "pct_diff": pct, "doy": cur["doy"],
                      "reason_code": code, "reason_params": params}}


def _tone(score: float) -> str:
    if score >= _GOOD_MIN:
        return "good"
    if score >= _WARN_MIN:
        return "warn"
    return "bad"


def _apportion(shares: dict[str, float]) -> dict[str, int]:
    """Largest-remainder apportionment of `shares` (which sum to 1.0) onto integers summing to 100.

    Rounding each share on its own is what made the card show 62% + 39% = 101%. Here every component
    takes its floor, and the leftover points go to the largest fractional remainders, so the numbers
    the farmer adds up always come to exactly 100."""
    if not shares:
        return {}
    keys = list(shares)
    exact = {k: shares[k] * 100.0 for k in keys}
    floors = {k: int(exact[k] // 1) for k in keys}
    left = 100 - sum(floors.values())
    # Ties broken by the fixed WEIGHTS order so the output is deterministic run to run.
    order = sorted(keys, key=lambda k: (-(exact[k] - floors[k]), list(WEIGHTS).index(k) if k in WEIGHTS else 99))
    for k in order[:max(0, left)]:
        floors[k] += 1
    return floors


def _is_proxy(v: Optional[dict]) -> bool:
    return bool((v or {}).get("extra", {}).get("proxy"))


def _pick_worst(scores: dict[str, float], proxy: dict[str, bool]) -> Optional[str]:
    """The component the verdict names. PROXY RULE #3: while ANY real measurement is present, the
    deciding "worst" component is chosen among the real ones only. A stand-in signal may inform the
    number, but it must never be the thing the platform points at and calls the field's problem —
    that is exactly how NDMI ended up announcing a water-balance crisis it never measured. When
    every present component is a proxy there is nothing better to point at, so the rule stands down."""
    if not scores:
        return None
    real = [k for k in scores if not proxy.get(k)]
    pool = real or list(scores)
    return min(pool, key=lambda k: scores[k])


def _headline(score: int, tone: str, worst_key: Optional[str], worst_score: Optional[float],
              worst_label: Optional[str] = None) -> str:
    label = worst_label or LABELS.get(worst_key or "", "")
    if tone == "good":
        return f"Sahə yaxşı vəziyyətdədir ({score}/100)."
    if tone == "warn":
        if label and worst_score is not None:
            return f"Diqqət: {label.lower()} zəifdir ({worst_score:.0f}/100)."
        return f"Sahə orta vəziyyətdədir ({score}/100)."
    if label and worst_score is not None:
        return f"Risk: {label.lower()} kritik səviyyədədir ({worst_score:.0f}/100)."
    return f"Sahədə ciddi problem var ({score}/100)."


def _headline_code(score: int, tone: str, worst_key: Optional[str], worst_score: Optional[float],
                   worst_label_code: Optional[str] = None) -> tuple[str, dict]:
    """Machine-readable twin of `_headline`: a stable code + raw params the frontend renders in the
    active locale. The AZ string from `_headline` is kept alongside as the fallback.

    `worst_label_code` overrides the label the frontend looks up for the named component — a
    proxy-sourced component is named by what it actually is (PROXY RULE #2)."""
    def _worst_params() -> dict:
        p: dict[str, Any] = {"worst_key": worst_key, "worst": int(round(worst_score or 0))}
        if worst_label_code:
            p["worst_label_code"] = worst_label_code
        return p

    if tone == "good":
        return "headline.good", {"score": score}
    if tone == "warn":
        if worst_key and worst_score is not None:
            return "headline.warn.worst", _worst_params()
        return "headline.warn.generic", {"score": score}
    if worst_key and worst_score is not None:
        return "headline.bad.worst", _worst_params()
    return "headline.bad.generic", {"score": score}


def headline_from_components(score: int, tone: str,
                             comps: Optional[dict]) -> tuple[Optional[str], str, dict]:
    """Rebuild `(worst_key, headline_code, headline_params)` from a STORED components blob.

    Shared by `load_wellness` and the org read model so every headline surface applies the same
    proxy rules — a stand-in signal is neither named as the deciding problem while a real
    measurement exists (RULE #3) nor labelled as the measurement it stands in for (RULE #2)."""
    comps = comps if isinstance(comps, dict) else {}
    worst = _pick_worst(
        {k: float(c.get("score") or 0.0) for k, c in comps.items() if isinstance(c, dict)},
        {k: bool((c.get("detail") or {}).get("proxy")) for k, c in comps.items() if isinstance(c, dict)})
    worst_score = comps[worst].get("score") if worst else None
    code, params = _headline_code(
        score, tone, worst, float(worst_score) if worst_score is not None else None,
        (comps.get(worst or "") or {}).get("label_code"))
    return worst, code, params


async def compute_wellness(conn, field_id: str, *, store: bool = True) -> dict[str, Any]:
    """Compute (and by default upsert) today's wellness score for one field.

    Returns `{"available": False, "missing": [...]}` when NO component had an input — the platform
    says "I cannot judge this yet" rather than inventing a number."""
    frow = await conn.fetchrow(
        """select f.org_id, m.crop_type from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid and f.deleted_at is null""", field_id)
    if not frow:
        return {"available": False, "field_id": field_id, "reason": "field_not_found",
                "missing": list(WEIGHTS), "missing_labels": [LABELS[k] for k in WEIGHTS],
                "components": {}, "headline": "Sahə tapılmadı.",
                "headline_code": "headline.fieldNotFound", "headline_params": {}}
    org_id, crop_type = str(frow["org_id"]), frow["crop_type"]

    raw: dict[str, Optional[dict]] = {
        "ndvi": await _vegetation(conn, field_id, crop_type),
        "water": await _water(conn, field_id),
        "pest": await _pest(conn, field_id, crop_type),
        "gdd": await _gdd(conn, field_id),
    }
    present = {k: v for k, v in raw.items() if v is not None}
    missing = [k for k in WEIGHTS if k not in present]

    if not present:
        return {"available": False, "field_id": field_id, "reason": "no_inputs",
                "score": None, "tone": None, "components": {},
                "missing": missing, "missing_labels": [LABELS[k] for k in missing],
                "headline": "Hələ kifayət qədər məlumat yoxdur — peyk və hava məlumatı toplandıqca bal hesablanacaq.",
                "headline_code": "headline.noInputs", "headline_params": {}}

    total_w = sum(WEIGHTS[k] for k in present)
    shares = {k: WEIGHTS[k] / total_w for k in present}
    score_f = sum(present[k]["score"] * shares[k] for k in present)
    score = int(round(_clamp(score_f)))
    tone = _tone(score)

    proxy = {k: _is_proxy(v) for k, v in present.items()}
    real = {k: v for k, v in present.items() if not proxy[k]}
    # PROXY RULE #3 — a stand-in signal alone may not condemn a field. If the verdict is "bad" only
    # because the proxy dragged the composite down (the same field scored on its real measurements
    # would not be "bad"), the tone is floored at "warn". The score itself is left honest: the proxy
    # did move it, and hiding that would be its own lie. What we refuse is the *worst* label, which
    # a farmer reads as "your field is failing" — a claim no proxy is entitled to make on its own.
    if tone == "bad":
        if not real:
            # Nothing here is a measurement — a page of stand-ins may worry the farmer, never
            # condemn the field.
            tone = "warn"
        else:
            real_w = sum(WEIGHTS[k] for k in real)
            real_score = sum(real[k]["score"] * (WEIGHTS[k] / real_w) for k in real)
            if _tone(real_score) != "bad":
                tone = "warn"

    pct = _apportion(shares)  # displayed integers, guaranteed to sum to exactly 100
    components: dict[str, Any] = {}
    for k, v in present.items():
        components[k] = {
            "key": k,
            "label": v.get("label") or LABELS[k],
            "label_code": v.get("label_code"),
            "score": round(float(v["score"]), 1),
            "weight": round(shares[k], 3),
            "weight_pct": pct.get(k, 0),
            "value": v.get("value"),
            "sensor": v.get("sensor"),
            "reason": v.get("reason"),
            "detail": v.get("extra") or {},
        }

    worst_key = _pick_worst({k: float(v["score"]) for k, v in present.items()}, proxy)
    worst_score = float(present[worst_key]["score"]) if worst_key else None
    worst_label = components.get(worst_key or "", {}).get("label")
    worst_label_code = components.get(worst_key or "", {}).get("label_code")
    headline = _headline(score, tone, worst_key, worst_score, worst_label)
    headline_code, headline_params = _headline_code(
        score, tone, worst_key, worst_score, worst_label_code)
    sensor = (present.get("ndvi") or {}).get("sensor")

    if store:
        await conn.execute(
            """insert into public.field_wellness
                 (field_id, org_id, computed_on, score, tone, ndvi_score, water_score,
                  pest_score, gdd_score, components, missing, sensor, headline, updated_at)
               values ($1::uuid,$2::uuid,current_date,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::text[],$11,$12,now())
               on conflict (field_id, computed_on) do update set
                 score=excluded.score, tone=excluded.tone, ndvi_score=excluded.ndvi_score,
                 water_score=excluded.water_score, pest_score=excluded.pest_score,
                 gdd_score=excluded.gdd_score, components=excluded.components,
                 missing=excluded.missing, sensor=excluded.sensor, headline=excluded.headline,
                 updated_at=now()""",
            field_id, org_id, score, tone,
            components.get("ndvi", {}).get("score"), components.get("water", {}).get("score"),
            components.get("pest", {}).get("score"), components.get("gdd", {}).get("score"),
            json.dumps(components, ensure_ascii=False), missing, sensor, headline)

    return {
        "available": True, "field_id": field_id, "score": score, "tone": tone,
        "headline": headline, "headline_code": headline_code, "headline_params": headline_params,
        "sensor": sensor, "components": components,
        "missing": missing, "missing_labels": [LABELS[k] for k in missing],
        "worst": worst_key, "fresh": True,
    }


async def load_wellness(conn, field_id: str) -> Optional[dict[str, Any]]:
    """Today's stored score, or None when it has not been computed today (stale/absent)."""
    row = await conn.fetchrow(
        """select computed_on, score, tone, ndvi_score, water_score, pest_score, gdd_score,
                  components, missing, sensor, headline, updated_at
           from public.field_wellness
           where field_id=$1::uuid and computed_on = current_date""", field_id)
    if not row:
        return None
    comps = row["components"]
    if isinstance(comps, str):
        try:
            comps = json.loads(comps)
        except ValueError:
            comps = {}
    missing = list(row["missing"] or [])
    # Reconstruct the localizable headline twin from the stored row — no schema/write change needed:
    # score + tone + the worst component (from the components jsonb) are all we require. PROXY RULE
    # #3 applies here too, from the `detail.proxy` flag persisted with each component.
    comps = comps or {}
    worst, headline_code, headline_params = headline_from_components(
        int(row["score"]) if row["score"] is not None else 0,
        row["tone"] or _tone(float(row["score"] or 0)), comps)
    return {
        "available": True, "field_id": field_id, "score": row["score"], "tone": row["tone"],
        "headline": row["headline"], "headline_code": headline_code, "headline_params": headline_params,
        "sensor": row["sensor"], "components": comps or {},
        "missing": missing, "missing_labels": [LABELS.get(k, k) for k in missing],
        "worst": worst, "fresh": False,
        "computed_on": row["computed_on"].isoformat() if row["computed_on"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }
