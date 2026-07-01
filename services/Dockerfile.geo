# Bağban AI — HLS geo pipeline worker (§10). Heavy geo deps; separate from the API image.
# Run on demand:  docker compose -f deploy/docker-compose.prod.yml --profile geo run --rm geo \
#                   python -m geo_pipeline.pipeline <field_id> [days_back]
FROM python:3.11-slim

WORKDIR /srv
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR \
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif

# rasterio/rioxarray/pyproj ship manylinux wheels with GDAL/PROJ bundled — no apt GDAL needed,
# but the wheels still link a few base shared libs missing from slim (libexpat, etc.).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libexpat1 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements-geo.txt .
RUN pip install -r requirements-geo.txt

COPY geo_pipeline ./geo_pipeline

# Default: sanity self-check (import graph). Override the command to run the pipeline.
CMD ["python", "-c", "import geo_pipeline, geo_pipeline.pipeline, geo_pipeline.read, geo_pipeline.search; print('geo worker ready')"]
