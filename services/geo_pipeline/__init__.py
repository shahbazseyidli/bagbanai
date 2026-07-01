"""HLS vegetation-index pipeline (spec §10).

search → windowed COG read → Fmask → zonal stats → PostGIS.
Heavy geo deps (rioxarray/rasterio/earthaccess) live in requirements-geo.txt and run
on the Hetzner box / n8n, not the API image."""
