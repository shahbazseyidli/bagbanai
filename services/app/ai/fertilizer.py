"""Fertilizer plan engine (T11 / C7 / E9).

Removal-based nutrient balance: required N-P-K = crop nutrient norm (kg per ton of yield) × target
yield, then split across growth stages. SAFETY (Rule 7): outputs are elemental kg N-P-K only — never
a commercial product name or dose; the plan points the farmer to a soil test + agronomist for
product conversion. Soil-supply crediting from a soil test is a later refinement (removal-only MVP)."""
from __future__ import annotations

from datetime import date

_ANNUAL_SPLITS = [("Əsas (səpin/əkin)", 50), ("Vegetativ inkişaf", 30), ("Generativ (məhsul)", 20)]
_PERENNIAL_SPLITS = [("Yaz", 50), ("Yay", 30), ("Payız", 20)]


async def compute_plan(conn, field_id: str, org_id: str) -> dict:
    row = await conn.fetchrow(
        """select m.crop_type, m.crop_cycle, m.target_yield, f.area_ha
           from public.fields f left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    if not row or not row["crop_type"]:
        return {"ok": False, "reason": "no_crop"}
    crop = row["crop_type"]
    if row["target_yield"] is None:
        return {"ok": False, "reason": "no_target_yield", "crop_type": crop}
    ty = float(row["target_yield"])
    area = float(row["area_ha"] or 0.0)

    norm = await conn.fetchrow(
        "select n_per_ton, p_per_ton, k_per_ton from public.crop_nutrient_norms where crop_type=$1", crop)
    if not norm:
        norm = await conn.fetchrow(
            "select n_per_ton, p_per_ton, k_per_ton from public.crop_nutrient_norms where crop_type='generic'")
    n_ha = round(float(norm["n_per_ton"]) * ty, 1)
    p_ha = round(float(norm["p_per_ton"]) * ty, 1)
    k_ha = round(float(norm["k_per_ton"]) * ty, 1)
    n_tot, p_tot, k_tot = round(n_ha * area, 1), round(p_ha * area, 1), round(k_ha * area, 1)

    splits = _PERENNIAL_SPLITS if row["crop_cycle"] == "perennial" else _ANNUAL_SPLITS
    year = date.today().year
    plan = await conn.fetchrow(
        """insert into public.fertilizer_plans
             (field_id, org_id, season_year, target_yield, area_ha, n_total_kg, p_total_kg, k_total_kg)
           values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8)
           on conflict (field_id, season_year) do update set
             target_yield=excluded.target_yield, area_ha=excluded.area_ha,
             n_total_kg=excluded.n_total_kg, p_total_kg=excluded.p_total_kg,
             k_total_kg=excluded.k_total_kg, created_at=now()
           returning id""",
        field_id, org_id, year, ty, area, n_tot, p_tot, k_tot)
    plan_id = plan["id"]
    await conn.execute("delete from public.fertilizer_plan_splits where plan_id=$1", plan_id)
    split_out = []
    for i, (stage, pct) in enumerate(splits):
        nk, pk, kk = round(n_tot * pct / 100, 1), round(p_tot * pct / 100, 1), round(k_tot * pct / 100, 1)
        await conn.execute(
            """insert into public.fertilizer_plan_splits (plan_id, seq, stage, share_pct, n_kg, p_kg, k_kg)
               values ($1,$2,$3,$4,$5,$6,$7)""", plan_id, i, stage, pct, nk, pk, kk)
        split_out.append({"stage": stage, "share_pct": pct, "n_kg": nk, "p_kg": pk, "k_kg": kk})

    return {"ok": True, "crop_type": crop, "target_yield": ty, "area_ha": area,
            "per_ha": {"n": n_ha, "p": p_ha, "k": k_ha},
            "total": {"n": n_tot, "p": p_tot, "k": k_tot}, "splits": split_out,
            "disclaimer": ("Bu, məhsulun apardığı qidanı əvəz edən təxmini N-P-K normasıdır (kq, "
                           "element əsasında). Konkret gübrə məhsulu və dozası üçün torpaq analizi "
                           "və aqronom məsləhəti lazımdır.")}
