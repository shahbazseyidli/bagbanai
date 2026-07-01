# Changelog

Bütün əhəmiyyətli dəyişikliklər burada qeyd olunur. Format [Keep a Changelog](https://keepachangelog.com/),
versiyalar [SemVer](https://semver.org/).

## [1.0.0] — 2026-07-01 — Faza 1 (canlı: https://agradex.com)

İlk istehsalat buraxılışı. Peyk + hava + AI əsaslı əkin monitorinqi platformasının təməli.

### Added
- **DB (Postgres 16 + PostGIS):** tam multi-tenant sxem (§7/§8) — organizations/members/invites,
  farms, fields (+metadata), scenes/index_stats/index_rasters, weather_cache, scouting, tasks,
  field_operations, yields, reports, advice, ai_chat, notifications, org_subscriptions, crop_thresholds.
  Öz `public.users` auth cədvəli (Supabase əvəzinə) + RLS (`current_user_id()` session GUC).
- **Subsidiya kalkulyatoru (§30, FR-21):** 2026 cədvəli — 117 dərəcə + modifikatorlar + rayonlar seed;
  match + modifier mühərriki (14 test keçir); `/api/subsidy/{options,calculate,save,history,rates}`.
- **Backend (FastAPI):** JWT auth + server-tərəfli gating; orgs/farms/fields/metadata/scouting/
  tasks/operations/yields/uploads API; sağlamlıq + daxili tetikləyicilər.
- **HLS boru xətti (§10):** search→windowed COG→Fmask→zonal stats→PostGIS (9 indeks) + FREE indeks
  endpoint-ləri (runtime Earthdata `.netrc` tələb edir).
- **Frontend (Next.js 15, AZ):** auth, onboarding, MapLibre sahə çəkmə, metadata formu,
  skautinq/tapşırıq/əməliyyat/məhsuldarlıq, subsidiya kalkulyatoru, komanda/dəvətlər.
- **Deploy:** Hetzner (Docker Compose: db+api+web) + nginx + Cloudflare (proxied, Flexible TLS).

### Deferred (Faza 2+)
- Hava (Open-Meteo) + modellər, qayda mühərriki → bildirişlər, AI məsləhət/chat, hesabatlar (PDF/Excel),
  TiTiler plitkaları, baza/anomaliya/fenologiya, billing (Stripe/PSP).

[1.0.0]: https://github.com/shahbazseyidli/bagbanai/releases/tag/v1.0.0
