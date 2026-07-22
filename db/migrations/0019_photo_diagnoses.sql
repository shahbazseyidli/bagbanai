-- 0019: photo disease/pest diagnoses (T5). Stores the structured Claude-vision result per uploaded
-- plant photo. Rule-7 safe (problem type + registered-list pointer + agronomist referral, never a
-- pesticide dose). Business-tier feature, monthly quota tracked via ai_usage (kind='photo').
create table if not exists public.photo_diagnoses (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  org_id uuid not null,
  photo_path text,
  result jsonb not null,
  model_name text,
  created_at timestamptz not null default now()
);
create index if not exists photo_diagnoses_field_idx
  on public.photo_diagnoses (field_id, created_at desc);
