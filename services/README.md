# Bağban AI — backend (FastAPI)

Multi-tenant API. Own JWT auth (httpOnly cookie), server-side gating (`require_role`/`require_paid`)
mirrored by Postgres RLS. Every request opens a transaction with `app.user_id` set so
`public.current_user_id()` resolves (spec §8/§22, adapted — see [`../CLAUDE.md`](../CLAUDE.md)).

## Layout
```
app/
  main.py       app factory, lifespan (asyncpg pool), CORS, router registration
  config.py     pydantic-settings (env / .env)
  db.py         asyncpg pool + connection(user_id) ctx that SET LOCAL app.user_id
  security.py   bcrypt password hashing + JWT issue/verify
  schemas.py    pydantic request/response models
  deps.py       auth deps + gating utils (is_org_member/require_role/require_paid)
  routers/      auth, health  (orgs/farms/fields/subsidy added in later steps)
```

## Run (dev)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export $(grep -v '^#' ../.env | xargs)
uvicorn app.main:app --reload --port 8000     # docs at /docs
```

Geo pipeline deps (Step 7): `pip install -r requirements-geo.txt`.
