"""Clarification detection (knowledge layer M7, spec §10).

When a vegetation index sits well below the crop's calibrated healthy band AND we know the
crop, raise ONE structured question instead of silently labelling a healthy orchard "Zəif".
Farmer data is authoritative (they stand in the field; we read pixels) — but the AI does not
stay silent (spec §10.1). Conservative by design: only fires on a clear deviation past the
crop-specific norm, never on every wobble (spec §10.2 "əminlik həddi")."""
from __future__ import annotations

import json
from typing import Optional

# Indices we calibrate + gate clarifications on (the ones with crop norms).
_VEG = ("NDVI", "EVI", "SAVI")


async def _crop_norms(conn, crop_type: Optional[str]) -> Optional[dict]:
    if not crop_type:
        return None
    v = await conn.fetchval(
        """select index_norms from public.crop_thresholds
           where crop_type=$1 and growth_stage='all' and age_class='all'""", crop_type)
    if v is None:
        return None
    return json.loads(v) if isinstance(v, str) else v


async def detect_clarifications(conn, field_id: str) -> int:
    """Create clarifications for clear norm deviations. Returns the number created.
    Idempotent per topic: an existing OPEN clarification with the same topic is not duplicated."""
    meta = await conn.fetchrow(
        """select f.org_id, m.crop_type, m.planting_date, m.crop_cycle
           from public.fields f
           left join public.field_metadata m on m.field_id=f.id
           where f.id=$1::uuid""", field_id)
    if not meta or not meta["crop_type"]:
        return 0  # §9.4 — without a crop we can't judge; the UI nudges to fill the profile instead
    norms = await _crop_norms(conn, meta["crop_type"])
    if not norms:
        return 0
    org_id = str(meta["org_id"])

    # Latest field-mean per veg index (freshest sensor row).
    rows = await conn.fetch(
        """select distinct on (index_name) index_name, mean, acquired_at
           from public.index_stats
           where field_id=$1::uuid and index_name = any($2)
           order by index_name, acquired_at desc""", field_id, list(_VEG))
    latest = {r["index_name"]: (float(r["mean"]), r["acquired_at"]) for r in rows if r["mean"] is not None}

    created = 0
    for idx in _VEG:
        if idx not in latest or idx not in norms:
            continue
        value, acq = latest[idx]
        edges = norms[idx]
        if len(edges) < 2:
            continue
        # Deviation = below the "zəif" edge (tier ≤ 1) for a crop we can judge → ask why.
        if value >= edges[1]:
            continue
        topic = f"low_{idx.lower()}"
        exists = await conn.fetchval(
            """select 1 from public.clarifications
               where field_id=$1::uuid and topic=$2 and status='open' limit 1""", field_id, topic)
        if exists:
            continue
        severity = "critical" if value < edges[0] else "normal"
        question = (
            f"Bu sahədə {idx} dəyəri {value:.2f}-dir; bu bitki üçün adətən {edges[1]:.2f}-dən "
            "yuxarı olur. Bu, seyrək əkin, budama və ya bitki stresi ola bilər — hansıdır?")
        options = [
            {"value": "sparse", "label": "Seyrək əkin sıxlığı"},
            {"value": "pruned", "label": "Bu il budanıb"},
            {"value": "stress", "label": "Bitkidə problem var"},
            {"value": "young", "label": "Bağın bir hissəsi cavan əvəzləmədir"},
            {"value": "unknown", "label": "Bilmirəm"},
        ]
        evidence = {"observed": round(value, 3), "expected_min": edges[1],
                    "index": idx, "date": acq.isoformat() if acq else None}
        await conn.execute(
            """insert into public.clarifications
                 (field_id, org_id, severity, topic, question_text, evidence, options, status)
               values ($1::uuid,$2::uuid,$3,$4,$5,$6::jsonb,$7::jsonb,'open')""",
            field_id, org_id, severity, topic, question,
            json.dumps(evidence, ensure_ascii=False), json.dumps(options, ensure_ascii=False))
        created += 1
    return created
