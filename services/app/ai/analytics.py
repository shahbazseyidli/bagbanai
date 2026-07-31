"""Baseline + anomaly detection (T6).

`refresh_baseline` recomputes each field's per-week p10/p50/p90 for the key indices from its own
history (Sentinel-2, to match the vegetation rules) — pure SQL percentiles, no scipy. `anomaly_for`
compares the latest reading against that seasonal norm so a value below the field's own p10 for the
week is flagged (feeds the VG-3 rule). Anomaly detection needs a few seasons of history per week, so
it stays quiet on brand-new fields and sharpens over time — by design."""
from __future__ import annotations

BASELINE_INDICES = ["NDVI", "NDMI", "NDRE", "EVI", "NBR"]
MIN_HISTORY = 4  # need ≥4 observations in a week before its baseline is trustworthy

# HOW FAR BELOW p10 IS ACTUALLY ANOMALOUS.
#
# This used to be a bare `latest < p10`, and a farmer was sent this alert on 2026-07-30 — twice:
#
#     "NDVI 0.719 bu həftə üçün sahənizin adi həddindən (p10 0.720) aşağıdır — anomaliya."
#
# One thousandth. Nothing about the measurement supports a claim at that resolution: between two
# scenes, NDVI over the same unchanged field moves by more than this from atmospheric correction,
# view/sun angle, sub-pixel cloud edges and the shifting set of pixels that survive the SCL mask.
# A threshold with no margin does not detect crop stress, it detects the noise floor — and every
# alert it fires teaches the farmer that our alerts are worth ignoring, which is the one thing an
# alerting system cannot afford.
#
# 0.05 is chosen as the smallest step that is unambiguously larger than that scene-to-scene noise
# while still well inside a real stress signal (a stressed field drops 0.1-0.3). It is absolute,
# not relative: these indices are already bounded ratios, so a percentage of a small p10 would
# make the test hair-trigger exactly where the index is least reliable.
ANOMALY_MARGIN = 0.05


async def refresh_baseline(conn, field_id: str) -> dict:
    """Recompute the per-week percentile baseline for one field (Sentinel-2). Idempotent upsert."""
    res = await conn.execute(
        """insert into public.field_index_baseline (field_id, index_name, week, p10, p50, p90, n)
           select field_id, index_name, extract(week from acquired_at)::int as week,
                  percentile_cont(0.1) within group (order by mean),
                  percentile_cont(0.5) within group (order by mean),
                  percentile_cont(0.9) within group (order by mean),
                  count(*)
           from public.index_stats
           where field_id=$1::uuid and sensor='S2' and mean is not null
             and index_name = any($2::text[])
           group by field_id, index_name, extract(week from acquired_at)::int
           on conflict (field_id, index_name, week) do update set
             p10=excluded.p10, p50=excluded.p50, p90=excluded.p90, n=excluded.n, updated_at=now()""",
        field_id, BASELINE_INDICES)
    return {"ok": True, "field_id": field_id, "result": res}


async def anomaly_for(conn, field_id: str, index_name: str = "NDVI") -> dict | None:
    """Is the latest S2 reading anomalous vs the field's own baseline for that week? None when
    there isn't enough history to judge."""
    row = await conn.fetchrow(
        """select mean, extract(week from acquired_at)::int as wk
           from public.index_stats
           where field_id=$1::uuid and index_name=$2 and sensor='S2' and mean is not null
           order by acquired_at desc limit 1""", field_id, index_name)
    if not row:
        return None
    base = await conn.fetchrow(
        """select p10, p50, p90, n from public.field_index_baseline
           where field_id=$1::uuid and index_name=$2 and week=$3""",
        field_id, index_name, row["wk"])
    if not base or base["n"] < MIN_HISTORY:
        return None
    latest, p10, p50, p90 = float(row["mean"]), float(base["p10"]), float(base["p50"]), float(base["p90"])
    # Below the band by MORE than the noise floor — see ANOMALY_MARGIN. `is_anomaly: False` is
    # still returned for a reading that merely dips under p10, so the passport and the charts keep
    # showing where it sits; what changes is that it no longer fires an alert.
    if latest < p10 - ANOMALY_MARGIN:
        return {"is_anomaly": True, "direction": "low", "latest": latest, "p10": p10, "p50": p50}
    if latest > p90 + ANOMALY_MARGIN:
        return {"is_anomaly": True, "direction": "high", "latest": latest, "p90": p90, "p50": p50}
    return {"is_anomaly": False, "latest": latest, "p10": p10, "p50": p50, "p90": p90}
