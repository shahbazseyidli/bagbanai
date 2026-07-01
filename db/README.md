# Database — Postgres 16 + PostGIS

Self-hosted (no Supabase). Schema follows spec §7/§8 + §30, with Supabase-specific
constructs adapted (see [`../CLAUDE.md`](../CLAUDE.md)):
- `auth.users(id)` → `public.users(id)` (own JWT auth).
- `auth.uid()` → `public.current_user_id()`, backed by session GUC `app.user_id`
  which the backend sets per request via `SET LOCAL app.user_id = '<uuid>'`.

## Migrations
Ordered SQL in [`migrations/`](migrations/), applied by [`migrate.sh`](migrate.sh)
(tracked in `schema_migrations`):

| File | Contents |
|---|---|
| `0001_extensions` | postgis, pgcrypto |
| `0002_users` | users + current_user_id() + touch_updated_at() |
| `0003_core` | organizations, members, invites, farms, fields, field_metadata |
| `0004_satellite_weather` | scenes, index_stats, index_rasters, weather_cache |
| `0005_farm_mgmt` | scouting, tasks, field_operations, yields, reports |
| `0006_ai_subs` | advice, ai_chat, notifications, prefs, org_subscriptions, crop_thresholds |
| `0007_rls` | RLS helpers (is_org_member/has_org_role/org_is_paid) + policies |
| `0008_subsidy` | §30 subsidy tables + public-read / owner RLS |

## Run

```bash
docker compose up -d db
export $(grep -v '^#' ../.env | xargs)          # or set DATABASE_URL manually
./migrate.sh                                     # apply migrations
python seeds/load_seeds.py                       # crop_thresholds + subsidy (Step 2)
```
