# Changelog

Bütün əhəmiyyətli dəyişikliklər burada qeyd olunur. Format [Keep a Changelog](https://keepachangelog.com/),
versiyalar [SemVer](https://semver.org/).

## [1.0.2] — 2026-07-01

### Fixed
- **Xəritə + sahə çəkmə işləmirdi (boş xəritə):** `@mapbox/mapbox-gl-draw` bu MapLibre versiyası ilə
  uyğun deyildi — `addLayer` init zamanı xəta atıb bütün xəritənin render olmasını pozurdu (təkcə
  çəkməni yox). Onu **çıxardıq** və MapLibre-native kliklə-çək yazdıq (FieldMap.tsx): xəritəyə
  klikləyib təpələr əlavə edilir, ≥3 təpədə poliqon qapanır, canlı sahə (ha), "Geri"/"Təmizlə".
  Nəticədə həm xəritə render olur (OSM plitkaları), həm çəkmə işləyir. Chrome-da canlı təsdiqləndi.

## [1.0.1] — 2026-07-01

### Added
- **HLS peyk boru xətti CANLI (real data):** Earthdata **bearer token** (EARTHDATA_TOKEN) ilə
  GDAL `/vsicurl` COG oxumaları autentifikasiya olunur; geo worker Docker image (Dockerfile.geo,
  libexpat1/libgomp1). Demo Zaqatala fındıq sahəsi üçün 17 səhnə / 153 index_stats, NDVI ~0.73.
  `deploy/run-hls.sh` (cron üçün) + compose `geo` profili.
- **SSL:** origin-də Let's Encrypt sertifikatı (avto-yenilənmə); nginx :80 (loop-safe) + :443.

### Fixed
- Deploy repo private olduğundan cloud-init `git clone` alınmırdı → rsync + bootstrap ilə deploy.
- Cloudflare Flexible + certbot redirect loop → nginx :80 no-redirect + :443.

### Pending
- Cloudflare SSL mode Flexible → Full (Strict) (CF paneli yüklənmirdi); repo public (istifadəçi).

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
