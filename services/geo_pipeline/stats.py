"""Zonal statistics over a masked index array (spec §10.1)."""
from __future__ import annotations

import numpy as np


def zonal_stats(index_da) -> dict:
    """mean/min/max/std/p10/p50/p90/valid_pixels over non-NaN pixels."""
    vals = np.asarray(index_da.values, dtype="float32").ravel()
    vals = vals[np.isfinite(vals)]
    if vals.size == 0:
        return {"mean": None, "min": None, "max": None, "std": None,
                "p10": None, "p50": None, "p90": None, "valid_pixels": 0}
    return {
        "mean": float(np.mean(vals)),
        "min": float(np.min(vals)),
        "max": float(np.max(vals)),
        "std": float(np.std(vals)),
        "p10": float(np.percentile(vals, 10)),
        "p50": float(np.percentile(vals, 50)),
        "p90": float(np.percentile(vals, 90)),
        "valid_pixels": int(vals.size),
    }
