-- 0040_share_places.sql — HYBRID_PLAN W8 (A10 public share links) + W7 (B16 non-field map places).
-- A share row is the ONLY way an unauthenticated request may read field data: the public endpoint
-- resolves a token → field, and never accepts a field_id directly. Additive; no RLS.

create table if not exists public.field_shares (
  id             uuid primary key default gen_random_uuid(),
  field_id       uuid not null references public.fields(id) on delete cascade,
  org_id         uuid not null,
  token          text not null unique,             -- secrets.token_urlsafe(24), like organization_invites.token
  scope          text not null default 'card',     -- card | full (what the public payload may expose)
  include_ndvi   boolean not null default true,    -- allow the public raster tile URL in the payload
  label          text,
  created_by     uuid references public.users(id) on delete set null,
  expires_at     timestamptz,                      -- null = no expiry
  revoked_at     timestamptz,
  view_count     int not null default 0,
  last_viewed_at timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists field_shares_field_idx on public.field_shares (field_id, created_at desc);

-- ===== B16: non-field map places (building, water line, storage, hazard) =====
create table if not exists public.map_places (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  farm_id    uuid references public.farms(id) on delete cascade,
  field_id   uuid references public.fields(id) on delete set null,
  name       text not null,
  kind       text not null default 'other',        -- building | water | storage | hazard | road | other
  geom       geometry(Geometry,4326) not null,     -- Point | LineString | Polygon
  notes      text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists map_places_org_idx  on public.map_places (org_id, kind);
create index if not exists map_places_farm_idx on public.map_places (farm_id);
create index if not exists map_places_gix      on public.map_places using gist (geom);

drop trigger if exists map_places_touch on public.map_places;
create trigger map_places_touch before update on public.map_places
  for each row execute function public.touch_updated_at();
