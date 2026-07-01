# Deploy — Bağban AI on Hetzner (agradex.com)

Self-hosted, no Supabase. Postgres+PostGIS, FastAPI (api), Next.js (web), optional n8n +
TiTiler — all via Docker Compose, fronted by the host nginx with Let's Encrypt TLS.

## Quick start (one command)
On a fresh Ubuntu host with Docker + the compose plugin installed:
```bash
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
git clone https://github.com/shahbazseyidli/bagbanai.git /opt/bagbanai
cd /opt/bagbanai
bash deploy/bootstrap.sh      # generates .env secrets, migrates, seeds, builds, starts api+web
```
Then point DNS at the server and run the nginx + certbot lines the script prints.
The manual steps below are the same thing broken out.

## 1. Server prep
```bash
# Docker + compose plugin + nginx + certbot already installed on the host
git clone <repo> /opt/bagbanai && cd /opt/bagbanai
cp .env.example .env && nano .env        # set POSTGRES_*, JWT_SECRET, INTERNAL_API_TOKEN,
                                         # EARTHDATA_*, LLM_* (later), OBJECT_STORAGE_ROOT=./deploy/storage
```

## 2. Bring up DB, migrate, seed
```bash
cd deploy
docker compose -f docker-compose.prod.yml up -d db
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB" ../db/migrate.sh
python3 ../db/seeds/load_seeds.py         # needs psycopg; or run inside the api container
```

## 3. Build + start app
```bash
docker compose -f docker-compose.prod.yml up -d --build api web
# optional: --profile orchestration up -d n8n   ; --profile tiles up -d titiler
```

## 4. nginx + TLS
```bash
sudo cp nginx-agradex.conf /etc/nginx/sites-available/agradex.com
sudo ln -s /etc/nginx/sites-available/agradex.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d agradex.com -d www.agradex.com
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Earthdata (satellite pipeline)
Create `~/.netrc` on the host (or in the geo worker):
```
machine urs.earthdata.nasa.gov login <EARTHDATA_USERNAME> password <EARTHDATA_PASSWORD>
```
Then either run `python -m geo_pipeline.pipeline <field_id>` from a geo worker
(pip install services/requirements-geo.txt) or wire n8n `hls_scene_check` to it.

## Notes
- Auth cookie is httpOnly + same-origin (nginx routes /api to the API), so no CORS in prod.
- Billing is disabled; every org is `free`. Flip an org to paid for testing:
  `update org_subscriptions set tier='pro' where org_id='<uuid>';`
- Secrets live only in `.env` (gitignored). Never commit real keys.
