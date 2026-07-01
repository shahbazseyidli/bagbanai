"""Subsidy calculation engine (spec §30.1, §30.5, §30.6).

Pure functions over plain dicts (rate rows + modifier rows) so the logic is testable
without a database. A "rate" dict uses DB column names:
  subsidy_type, crop_group, crop, intensity, region_category, irrigation,
  planting_period, coefficient, amount_per_unit, unit, min_area_ha,
  min_density_per_ha, eligible_regions (list|None), conditions (dict|None), label_az
"""
from __future__ import annotations

from datetime import date
from typing import Any, Optional

# dimensions used for matching, with the "wildcard" values that impose no constraint
_MATCH_DIMS = ["intensity", "region_category", "irrigation", "planting_period"]
_WILDCARDS = {"region_category": {"all"}}

DISCLAIMER = "Nəticə qeyri-rəsmidir; rəsmi hesablama EKTİS/eagro.az üzərindən aparılır."


def _dim_ok(rate_val: Any, in_val: Any, dim: str) -> tuple[bool, int]:
    """Return (candidate-still-valid, specificity-score) for one dimension."""
    if rate_val is None or rate_val in _WILDCARDS.get(dim, set()):
        return True, 0                      # rate imposes no constraint here
    if in_val is not None and str(in_val) == str(rate_val):
        return True, 1                      # specific match
    return False, 0                         # rate requires a value the input doesn't satisfy


def match_rate(rates: list[dict], inputs: dict) -> Optional[dict]:
    """Most-specific matching rate for the given inputs (§30.6)."""
    cands: list[tuple[int, dict]] = []
    for r in rates:
        if r["subsidy_type"] != inputs.get("subsidy_type"):
            continue
        if r["crop_group"] != inputs.get("crop_group"):
            continue
        if r["crop"] != inputs.get("crop"):
            continue
        score = 0
        ok = True
        for dim in _MATCH_DIMS:
            good, s = _dim_ok(r.get(dim), inputs.get(dim), dim)
            if not good:
                ok = False
                break
            score += s
        if ok:
            cands.append((score, r))
    if not cands:
        return None
    cands.sort(key=lambda t: t[0], reverse=True)
    return cands[0][1]


def _region_eligible(rate: dict, inputs: dict) -> Optional[bool]:
    """None if no eligibility list; else whether the chosen rayon is eligible."""
    elig = rate.get("eligible_regions")
    if not elig:
        return None
    rayon = inputs.get("region_rayon")
    return rayon in elig


def _condition_warnings(rate: dict, inputs: dict) -> list[str]:
    w: list[str] = []
    q = inputs.get("quantity")
    if rate.get("min_area_ha") and rate["unit"] == "ha" and q is not None and q < rate["min_area_ha"]:
        w.append(f"Minimum sahə tələbi: ən azı {rate['min_area_ha']} ha (seçilmiş: {q} ha).")
    if rate.get("min_density_per_ha"):
        w.append(f"Minimum ting sıxlığı: 1 hektara ən azı {rate['min_density_per_ha']} ədəd sertifikatlı ting olmalıdır.")
    cond = rate.get("conditions") or {}
    if "altitude_m" in cond:
        lo, hi = (cond["altitude_m"] + [None, None])[:2]
        rng = f"{lo or 0}" + (f"–{hi} m" if hi else " m-dən yuxarı")
        w.append(f"Hündürlük şərti: {rng} aralığında olmalıdır.")
    if "ec_max_ds_m" in cond:
        w.append(f"Torpaq duzluluğu (EC) ≤ {cond['ec_max_ds_m']} dS/m olmalıdır.")
    if cond.get("pole_system"):
        w.append("Dirək (şpalyer) sistemi tələb olunur.")
    if cond.get("insured"):
        w.append("Əkin sığortalanmalıdır.")
    if cond.get("drip") or rate.get("irrigation") == "drip":
        w.append("Damcı suvarma sistemi tələb olunur.")
    return w


def calculate(rates: list[dict], modifiers: list[dict], inputs: dict,
              as_of: Optional[date] = None) -> dict:
    """Full calculation: match → modifiers (§30.5 order) → total + warnings."""
    rate = match_rate(rates, inputs)
    quantity = float(inputs.get("quantity") or 0)
    result: dict[str, Any] = {
        "matched_rate": None, "quantity": quantity, "subtotal": 0.0,
        "modifiers_applied": [], "total_amount": 0.0, "currency": "AZN",
        "eligibility_ok": True, "warnings": [], "notes_az": DISCLAIMER,
    }
    if rate is None:
        result["eligibility_ok"] = False
        result["warnings"].append("Seçimlərə uyğun dərəcə tapılmadı. Wizard addımlarını yoxlayın.")
        return result

    apu = float(rate["amount_per_unit"])
    result["matched_rate"] = {
        "coefficient": float(rate["coefficient"]), "amount_per_unit": apu,
        "unit": rate["unit"], "label_az": rate["label_az"],
    }
    subtotal = apu * quantity
    result["subtotal"] = round(subtotal, 2)
    total = subtotal
    applied: list[str] = []
    warnings: list[str] = _condition_warnings(rate, inputs)
    mods = inputs.get("modifiers") or {}

    # (1) region eligibility → 0 if rayon not in eligible list
    elig = _region_eligible(rate, inputs)
    if elig is False:
        total = 0.0
        result["eligibility_ok"] = False
        applied.append("region_ineligible_zero")
        warnings.append("Seçilmiş rayon bu bitki üçün təsdiqlənmiş siyahıda deyil — əmsal 0.")
    elif elig is True:
        warnings.append(f"Bu bitkinin əmsalı yalnız təsdiqlənmiş rayonlarda tətbiq olunur ({inputs.get('region_rayon')} daxildir).")

    # (2) certified seed (wheat >10 ha / barley >100 ha) → 0
    if rate["crop"] in ("wheat", "barley") and mods.get("certified_seed") is False:
        thresh = 10 if rate["crop"] == "wheat" else 100
        if quantity > thresh:
            total = 0.0
            result["eligibility_ok"] = False
            applied.append("certified_seed_zero")
            warnings.append(f"{thresh} ha-dan çox {rate['crop']} üçün sertifikatlı toxum tələb olunur — əmsal 0.")

    # (3) stop apple/peach intensive after 2026-06-01 (except liberated/nakhchivan).
    # "intensive" orchards are encoded as crop_group=fruit_intensive (intensity col is null).
    if rate["crop"] in ("apple", "peach_apricot") and rate.get("crop_group") == "fruit_intensive":
        stop = date(2026, 6, 1)
        exc = rate["region_category"] in ("liberated", "nakhchivan")
        if not exc:
            if as_of is not None and as_of >= stop:
                total = 0.0
                result["eligibility_ok"] = False
                applied.append("stop_after_2026_06_01")
                warnings.append("İntensiv alma/şaftalı subsidiyası 2026-06-01-dən dayanır.")
            else:
                warnings.append("Diqqət: bu subsidiya 2026-06-01-dən dayanır (işğaldan azad + Naxçıvan MR istisna).")

    # (4) Böyük Qayıdış ×1.5
    if mods.get("boyuk_qayidis") and total > 0 and rate["subsidy_type"] == "planting":
        bq_groups = _boyuk_qayidis_groups(modifiers)
        if rate["crop_group"] in bq_groups:
            total *= 1.5
            applied.append("boyuk_qayidis_50")

    # (5) product: agrochemical-analysis per-ton reduction
    if rate["subsidy_type"] == "product" and mods.get("soil_analysis") is False and total > 0:
        red = _analysis_reduction_value(modifiers, rate["crop"])
        if red:
            total = max(0.0, (apu - red) * quantity)
            applied.append("analysis_reduction")
            warnings.append(f"Aqrokimyəvi analiz edilməyib — ton başına {red} AZN azaldıldı.")
    if rate["crop"] == "cotton":
        warnings.append("Pambıq: orta məhsuldarlıq ≤15 sent/ha olarsa 0; 60 sent/ha-dan yuxarı hissə subsidiyalaşmır.")

    result["total_amount"] = round(total, 2)
    result["modifiers_applied"] = applied
    result["warnings"] = warnings
    return result


def _boyuk_qayidis_groups(modifiers: list[dict]) -> set[str]:
    for m in modifiers:
        if m.get("code") == "boyuk_qayidis_50":
            return set((m.get("applies_to") or {}).get("groups") or [])
    return set()


def _analysis_reduction_value(modifiers: list[dict], crop: str) -> float:
    for m in modifiers:
        if m.get("code") == "analysis_reduction":
            cv = (m.get("effect") or {}).get("crop_values") or {}
            # crop keys are generic (tobacco covers tobacco_*)
            for key, val in cv.items():
                if crop == key or crop.startswith(key + "_"):
                    return float(val)
    return 0.0
