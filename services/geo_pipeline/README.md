# HLS vegetation-index pipeline (spec §10)

`search → windowed COG read → Fmask → zonal stats → PostGIS`. Populates `scenes` and
`index_stats`; the FREE API endpoints (`/api/fields/{id}/indices[/latest]`) read those.

## Modules
| File | Role |
|---|---|
| `indices.py` | 9 index definitions; HLS-VI band suffixes + raw-reflectance fallback formulas (§10.3) |
| `search.py` | Earthdata search (HLSS30_VI/HLSL30_VI), granule parsing |
| `read.py` | windowed COG read (rioxarray) + Fmask bit masking (§10.2) |
| `stats.py` | zonal statistics (mean/min/max/std/p10/p50/p90/valid_pixels) |
| `mgrs_util.py` | MGRS 100 km tiles intersecting a field |
| `persist.py` | idempotent upsert of scenes + index stats (psycopg) |
| `pipeline.py` | `run_field(field_id)` orchestration + CLI |

## Run (production — geo worker container)
The pipeline runs in its own image (`services/Dockerfile.geo`, compose profile `geo`),
not the API image. Earthdata auth is via env (`EARTHDATA_USERNAME`/`EARTHDATA_PASSWORD`
in `.env`), falling back to `~/.netrc`.

```bash
# one field
docker compose -f deploy/docker-compose.prod.yml --profile geo run --rm geo \
  python -m geo_pipeline.pipeline <field_id> 120

# all fields (cron-friendly)
bash deploy/run-hls.sh 120        # add to crontab for daily hls_scene_check
```

Local dev (no Docker): `pip install -r services/requirements-geo.txt` then
`DATABASE_URL=... python -m geo_pipeline.pipeline <field_id>`.
Also callable via the API's `POST /api/internal/pipeline/run` where geo deps are present.

## Flagged / deferred
- **Earthdata account** required (`.netrc`) — validate collection/asset naming against
  live results the first time (search.py encapsulates this).
- **TiTiler XYZ tiles** (§10.5) and `index_rasters` COG export are wired in deploy
  (TiTiler container) but tile generation is a follow-up; the FREE numeric indices +
  time series work from `index_stats` without tiles.
- **Baseline / anomaly / phenology** (§10.4, FR-8) is Phase 2.
