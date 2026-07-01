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

## Run
```bash
pip install -r ../requirements-geo.txt
# Earthdata auth: ~/.netrc  (machine urs.earthdata.nasa.gov login <user> password <pass>)
export DATABASE_URL=postgresql://bagban:...@localhost:5432/bagban
python -m geo_pipeline.pipeline <field_id> 120
```
Triggered in production by n8n (`hls_scene_check`, daily) or the API's
`POST /api/internal/pipeline/run` when geo deps are present.

## Flagged / deferred
- **Earthdata account** required (`.netrc`) — validate collection/asset naming against
  live results the first time (search.py encapsulates this).
- **TiTiler XYZ tiles** (§10.5) and `index_rasters` COG export are wired in deploy
  (TiTiler container) but tile generation is a follow-up; the FREE numeric indices +
  time series work from `index_stats` without tiles.
- **Baseline / anomaly / phenology** (§10.4, FR-8) is Phase 2.
