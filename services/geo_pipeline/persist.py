"""Persist scenes + index stats to PostGIS (spec §10.1). Idempotent via unique keys.

Batch job → sync psycopg (separate from the async API pool)."""
from __future__ import annotations

import os
from datetime import date
from typing import Optional

import psycopg


def _dsn() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("set DATABASE_URL")
    return dsn


def get_field(field_id: str) -> Optional[dict]:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """select f.id, f.org_id, st_asgeojson(f.geom) as geom,
                      st_xmin(f.bbox), st_ymin(f.bbox), st_xmax(f.bbox), st_ymax(f.bbox),
                      coalesce(m.crop_type,'generic') as crop_type
               from public.fields f
               left join public.field_metadata m on m.field_id=f.id
               where f.id=%s""", (field_id,))
        r = cur.fetchone()
    if not r:
        return None
    import json
    return {"id": str(r[0]), "org_id": str(r[1]), "geom": json.loads(r[2]),
            "bbox": (r[3], r[4], r[5], r[6]), "crop_type": r[7]}


def set_mgrs_tiles(field_id: str, tiles: list[str]) -> None:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute("update public.fields set mgrs_tiles=%s where id=%s", (tiles, field_id))
        conn.commit()


def persist_scene(field_id: str, org_id: str, sensor: str, acquired_at: date,
                  mgrs_tile: Optional[str], cloud_pct: Optional[float],
                  granule_id: str, stats_by_index: dict[str, dict]) -> None:
    """Upsert a scene and its per-index stats (idempotent — no duplicate scenes/alerts)."""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """insert into public.scenes (field_id, org_id, sensor, acquired_at, mgrs_tile, cloud_pct, granule_id)
               values (%s,%s,%s,%s,%s,%s,%s)
               on conflict (field_id, sensor, acquired_at, mgrs_tile) do update set
                 cloud_pct=excluded.cloud_pct, granule_id=excluded.granule_id
               returning id""",
            (field_id, org_id, sensor, acquired_at, mgrs_tile, cloud_pct, granule_id))
        scene_id = cur.fetchone()[0]
        for index_name, s in stats_by_index.items():
            cur.execute(
                """insert into public.index_stats
                     (scene_id, field_id, org_id, index_name, mean, min, max, std, p10, p50, p90, valid_pixels, acquired_at)
                   values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   on conflict (scene_id, index_name) do update set
                     mean=excluded.mean, min=excluded.min, max=excluded.max, std=excluded.std,
                     p10=excluded.p10, p50=excluded.p50, p90=excluded.p90, valid_pixels=excluded.valid_pixels""",
                (scene_id, field_id, org_id, index_name, s["mean"], s["min"], s["max"], s["std"],
                 s["p10"], s["p50"], s["p90"], s["valid_pixels"], acquired_at))
        conn.commit()
