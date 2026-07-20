#!/usr/bin/env python3
"""Load reference/seed data (spec §12 + §30.4/30.5).

- crop_thresholds  (rule-engine defaults, §12)
- subsidy_years    (2026 base_unit_rate = 200 AZN)
- subsidy_regions  (wizard dropdown + eligibility)
- subsidy_rates    (117 rows; amount_per_unit = coefficient × base_unit_rate, verified)
- subsidy_modifiers(§30.5)

Idempotent: reference tables are upserted; subsidy rates/modifiers for the target
year are replaced. Run after migrations:

    DATABASE_URL=postgresql://bagban:...@localhost:5432/bagban python db/seeds/load_seeds.py
"""
import json
import os
import sys
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

HERE = Path(__file__).parent
YEAR = 2026
BASE_UNIT_RATE = 200
SOURCE_URL = "https://www.agro.gov.az/az/news/010920254"
PUBLISHED_AT = "2025-09-01"


def load_json(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def seed_crop_thresholds(cur):
    rows = load_json("crop_thresholds.json")
    for r in rows:
        # growth_stage/age_class default to 'all' (crop-level row); the unique key is now
        # (crop_type, growth_stage, age_class) after migration 0014. index_norms calibrates
        # the per-index UI labels (M5); null → the API falls back to 'generic'.
        params = dict(r)
        params.setdefault("growth_stage", "all")
        params.setdefault("age_class", "all")
        params["index_norms"] = Jsonb(r["index_norms"]) if r.get("index_norms") else None
        cur.execute(
            """insert into public.crop_thresholds
                 (crop_type, growth_stage, age_class, gdd_base_c, ndvi_healthy_min, ndvi_stress_max,
                  ndmi_stress_max, frost_threshold_c, heat_threshold_c, index_norms)
               values (%(crop_type)s,%(growth_stage)s,%(age_class)s,%(gdd_base_c)s,%(ndvi_healthy_min)s,
                       %(ndvi_stress_max)s,%(ndmi_stress_max)s,%(frost_threshold_c)s,%(heat_threshold_c)s,%(index_norms)s)
               on conflict (crop_type, growth_stage, age_class) do update set
                 gdd_base_c=excluded.gdd_base_c, ndvi_healthy_min=excluded.ndvi_healthy_min,
                 ndvi_stress_max=excluded.ndvi_stress_max, ndmi_stress_max=excluded.ndmi_stress_max,
                 frost_threshold_c=excluded.frost_threshold_c, heat_threshold_c=excluded.heat_threshold_c,
                 index_norms=excluded.index_norms""",
            params,
        )
    print(f"crop_thresholds: {len(rows)} rows")


def seed_year(cur):
    cur.execute(
        """insert into public.subsidy_years (year, base_unit_rate, source_url, published_at, notes_az)
           values (%s,%s,%s,%s,%s)
           on conflict (year) do update set
             base_unit_rate=excluded.base_unit_rate, source_url=excluded.source_url,
             published_at=excluded.published_at, notes_az=excluded.notes_az""",
        (YEAR, BASE_UNIT_RATE, SOURCE_URL, PUBLISHED_AT,
         "Aqrar Subsidiya Şurası 2026 əmsalları (01.09.2025)."),
    )
    print(f"subsidy_years: {YEAR} @ {BASE_UNIT_RATE} AZN")


def seed_regions(cur):
    rows = load_json("subsidy_regions.json")
    for r in rows:
        cur.execute(
            """insert into public.subsidy_regions
                 (code, name_az, economic_region, is_liberated, is_nakhchivan)
               values (%s,%s,%s,%s,%s)
               on conflict (code) do update set
                 name_az=excluded.name_az, economic_region=excluded.economic_region,
                 is_liberated=excluded.is_liberated, is_nakhchivan=excluded.is_nakhchivan""",
            (r["code"], r["name_az"], r.get("economic_region"),
             bool(r.get("is_liberated", False)), bool(r.get("is_nakhchivan", False))),
        )
    print(f"subsidy_regions: {len(rows)} rows")


def seed_rates(cur):
    rows = load_json("subsidy_rates_2026.json")
    cur.execute("delete from public.subsidy_rates where year=%s", (YEAR,))
    mismatches = 0
    for r in rows:
        coef = r["coef"]
        computed = round(coef * BASE_UNIT_RATE, 4)
        stated = r.get("amount")
        if stated is not None and abs(computed - stated) > 1e-6:
            mismatches += 1
            print(f"  ! amount mismatch: {r['crop']}/{r.get('label_az','')} "
                  f"coef={coef} computed={computed} stated={stated}", file=sys.stderr)
        unit = r.get("unit") or ("ton" if r["type"] == "product" else "ha")
        cur.execute(
            """insert into public.subsidy_rates
                 (year, subsidy_type, crop_group, crop, intensity, region_category,
                  irrigation, planting_period, coefficient, amount_per_unit, unit,
                  min_area_ha, min_density_per_ha, eligible_regions, conditions, label_az, notes_az)
               values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (YEAR, r["type"], r["group"], r["crop"], r.get("intensity"),
             r.get("region"), r.get("irrigation"), r.get("planting_period"),
             coef, computed, unit,
             r.get("min_area_ha"), r.get("min_density_per_ha"),
             r.get("eligible_regions"),
             Jsonb(r["conditions"]) if r.get("conditions") is not None else None,
             r["label_az"], r.get("notes_az")),
        )
    print(f"subsidy_rates: {len(rows)} rows loaded ({mismatches} amount mismatches)")
    if mismatches:
        raise SystemExit("amount_per_unit != coefficient × base_unit_rate — fix seed before continuing")


def seed_modifiers(cur):
    rows = load_json("subsidy_modifiers_2026.json")
    cur.execute("delete from public.subsidy_modifiers where year=%s", (YEAR,))
    for r in rows:
        cur.execute(
            """insert into public.subsidy_modifiers (year, code, description_az, applies_to, effect)
               values (%s,%s,%s,%s,%s)""",
            (YEAR, r["code"], r.get("description_az"),
             Jsonb(r.get("applies_to")) if r.get("applies_to") is not None else None,
             Jsonb(r.get("effect")) if r.get("effect") is not None else None),
        )
    print(f"subsidy_modifiers: {len(rows)} rows")


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("set DATABASE_URL")
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            seed_crop_thresholds(cur)
            seed_year(cur)
            seed_regions(cur)
            seed_rates(cur)
            seed_modifiers(cur)
        conn.commit()
    print("seeds loaded.")


if __name__ == "__main__":
    main()
