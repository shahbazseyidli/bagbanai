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
                      coalesce(m.crop_type,'generic') as crop_type, f.name
               from public.fields f
               left join public.field_metadata m on m.field_id=f.id
               where f.id=%s""", (field_id,))
        r = cur.fetchone()
    if not r:
        return None
    import json
    return {"id": str(r[0]), "org_id": str(r[1]), "geom": json.loads(r[2]),
            "bbox": (r[3], r[4], r[5], r[6]), "crop_type": r[7], "name": r[8]}


def set_mgrs_tiles(field_id: str, tiles: list[str]) -> None:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute("update public.fields set mgrs_tiles=%s where id=%s", (tiles, field_id))
        conn.commit()


def persist_scene(field_id: str, org_id: str, sensor: str, acquired_at: date,
                  mgrs_tile: Optional[str], cloud_pct: Optional[float],
                  granule_id: str, stats_by_index: dict[str, dict]) -> str:
    """Upsert a scene and its per-index stats (idempotent). Returns the scene id."""
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
                     (scene_id, field_id, org_id, sensor, index_name, mean, min, max, std, p10, p50, p90, valid_pixels, acquired_at)
                   values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   on conflict (scene_id, index_name) do update set
                     sensor=excluded.sensor, mean=excluded.mean, min=excluded.min, max=excluded.max, std=excluded.std,
                     p10=excluded.p10, p50=excluded.p50, p90=excluded.p90, valid_pixels=excluded.valid_pixels""",
                (scene_id, field_id, org_id, sensor, index_name, s["mean"], s["min"], s["max"], s["std"],
                 s["p10"], s["p50"], s["p90"], s["valid_pixels"], acquired_at))
        conn.commit()
    return str(scene_id)


def persist_raster(scene_id: str, field_id: str, index_name: str,
                   storage_path: str, acquired_at: date, sensor: Optional[str] = None) -> None:
    """Record a written index COG (idempotent per scene+index)."""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """insert into public.index_rasters (scene_id, field_id, sensor, index_name, storage_path, acquired_at)
               values (%s,%s,%s,%s,%s,%s)
               on conflict (scene_id, index_name) do update set
                 sensor=excluded.sensor, storage_path=excluded.storage_path""",
            (scene_id, field_id, sensor, index_name, storage_path, acquired_at))
        conn.commit()


# ── Field processing status (async UX: preparing → progress/ETA → ready) ──────────

def set_field_status(field_id: str, status: str, *, total: Optional[int] = None,
                     message: Optional[str] = None) -> None:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        sets = ["data_status=%s", "data_message=%s"]
        args: list = [status, message]
        if status == "processing":
            sets += ["data_started_at=now()", "data_progress_done=0"]
        if status == "ready":
            sets += ["data_ready_at=now()", "data_eta_seconds=0"]
        if total is not None:
            sets.append("data_progress_total=%s")
            args.append(total)
        args.append(field_id)
        cur.execute(f"update public.fields set {', '.join(sets)} where id=%s", args)
        conn.commit()


def update_field_progress(field_id: str, done: int, eta_seconds: int) -> None:
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            "update public.fields set data_progress_done=%s, data_eta_seconds=%s where id=%s",
            (done, eta_seconds, field_id))
        conn.commit()


def insert_ready_notification(field_id: str, org_id: str, field_name: str) -> None:
    """In-app notification that a field's satellite data is ready (bell/toast)."""
    with psycopg.connect(_dsn()) as conn, conn.cursor() as cur:
        cur.execute(
            """insert into public.notifications
                 (field_id, org_id, source, type, severity, title, body, delivered_channels)
               values (%s,%s,'vegetation','data_ready','info',%s,%s,array['inapp'])""",
            (field_id, org_id, "Peyk məlumatı hazırdır",
             f"“{field_name}” sahəsi üçün peyk indeksləri və xəritə hazırdır."))
        conn.commit()


def raster_dir() -> str:
    return os.environ.get("RASTER_DIR", "/data/rasters")
