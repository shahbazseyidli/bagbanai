"""Engine tests against the seed data. Run: python services/tests/test_subsidy.py
(No DB / pytest needed — normalizes the seed JSON to DB-row shape and asserts.)"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services"))

from app.subsidy.engine import calculate  # noqa: E402

SEEDS = ROOT / "db" / "seeds"


def load_rates():
    rows = json.loads((SEEDS / "subsidy_rates_2026.json").read_text(encoding="utf-8"))
    out = []
    for r in rows:
        out.append({
            "subsidy_type": r["type"], "crop_group": r["group"], "crop": r["crop"],
            "intensity": r.get("intensity"), "region_category": r.get("region"),
            "irrigation": r.get("irrigation"), "planting_period": r.get("planting_period"),
            "coefficient": r["coef"], "amount_per_unit": round(r["coef"] * 200, 4),
            "unit": r.get("unit") or ("ton" if r["type"] == "product" else "ha"),
            "min_area_ha": r.get("min_area_ha"), "min_density_per_ha": r.get("min_density_per_ha"),
            "eligible_regions": r.get("eligible_regions"), "conditions": r.get("conditions"),
            "label_az": r["label_az"],
        })
    return out


def load_mods():
    return json.loads((SEEDS / "subsidy_modifiers_2026.json").read_text(encoding="utf-8"))


RATES, MODS = load_rates(), load_mods()
passed = 0


def check(name, cond):
    global passed
    assert cond, f"FAILED: {name}"
    passed += 1
    print(f"  ok  {name}")


# 1) Spec §30.6 worked example: intensive hazelnut, other, Qusar, 3 ha -> 9000
res = calculate(RATES, MODS, {
    "subsidy_type": "planting", "crop_group": "fruit_intensive", "crop": "hazelnut",
    "intensity": None, "region_category": None, "planting_period": "new_2025_2026",
    "region_rayon": "Qusar", "quantity": 3,
    "modifiers": {"boyuk_qayidis": False, "certified_seed": True, "soil_analysis": True},
})
check("hazelnut match coef=15", res["matched_rate"]["coefficient"] == 15)
check("hazelnut apu=3000", res["matched_rate"]["amount_per_unit"] == 3000)
check("hazelnut subtotal=9000", res["subtotal"] == 9000)
check("hazelnut total=9000", res["total_amount"] == 9000)
check("hazelnut density warning", any("330" in w for w in res["warnings"]))

# 2) rice main 5 ha -> 380*5 = 1900
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "rice", "crop": "rice",
                              "intensity": "main", "quantity": 5, "modifiers": {}})
check("rice total=1900", res["total_amount"] == 1900)

# 3) Böyük Qayıdış +50% on rice: 1900 * 1.5 = 2850
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "rice", "crop": "rice",
                              "intensity": "main", "quantity": 5, "modifiers": {"boyuk_qayidis": True}})
check("rice boyuk_qayidis=2850", res["total_amount"] == 2850)
check("boyuk_qayidis applied", "boyuk_qayidis_50" in res["modifiers_applied"])

# 4) product cotton modern 10 t -> 215*10=2150; analysis missing -> (215-10)*10=2050
res = calculate(RATES, MODS, {"subsidy_type": "product", "crop_group": "product_cotton", "crop": "cotton",
                              "irrigation": "modern", "quantity": 10, "modifiers": {"soil_analysis": True}})
check("cotton subtotal=2150", res["subtotal"] == 2150)
res = calculate(RATES, MODS, {"subsidy_type": "product", "crop_group": "product_cotton", "crop": "cotton",
                              "irrigation": "modern", "quantity": 10, "modifiers": {"soil_analysis": False}})
check("cotton analysis_reduction=2050", res["total_amount"] == 2050)

# 5) region ineligible: lemon in a non-eligible rayon -> 0
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "fruit_intensive", "crop": "lemon_kumquat",
                              "planting_period": "new_2025_2026", "region_rayon": "Quba", "quantity": 2, "modifiers": {}})
check("lemon ineligible total=0", res["total_amount"] == 0 and res["eligibility_ok"] is False)
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "fruit_intensive", "crop": "lemon_kumquat",
                              "planting_period": "new_2025_2026", "region_rayon": "Astara", "quantity": 2, "modifiers": {}})
check("lemon eligible total=23200", res["total_amount"] == 11600 * 2)

# 6) super-intensive apple Nakhchivan: coef 161 -> 32200/ha * 2 = 64400
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "fruit_super_intensive", "crop": "apple",
                              "region_category": "nakhchivan", "planting_period": "new_2025_2026", "quantity": 2, "modifiers": {}})
check("super apple nakhchivan=64400", res["total_amount"] == 64400)

# 7) intensive apple other after cutoff date -> 0
res = calculate(RATES, MODS, {"subsidy_type": "planting", "crop_group": "fruit_intensive", "crop": "apple",
                              "region_category": "other", "planting_period": "new_2025_2026", "quantity": 1, "modifiers": {}},
                as_of=date(2026, 7, 1))
check("intensive apple after cutoff=0", res["total_amount"] == 0)

print(f"\n{passed} checks passed.")
