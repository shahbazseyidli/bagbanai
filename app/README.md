# Bağban AI — Frontend

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS frontend for the
Bağban AI satellite/weather/AI crop-monitoring platform. All UI text is in
Azerbaijani; all code is in English.

## Setup

```bash
npm install
# Point at the FastAPI backend in dev (prod is same-origin via nginx):
echo 'NEXT_PUBLIC_API_BASE=http://localhost:8000' > .env.local
npm run dev
```

`NEXT_PUBLIC_API_BASE` is used both by `lib/api.ts` (fetch prefix) and by
`next.config.mjs` (dev rewrite of `/api/*` → backend, so the httpOnly auth
cookie stays same-origin during development).

## Structure

- `src/lib/api.ts` — fetch wrapper (`credentials: "include"`, throws `ApiError`).
- `src/lib/auth.tsx` — React context around `/api/auth/me`.
- `src/lib/i18n.ts` — flat `az` dictionary + `t()` + subsidy code→label maps.
- `src/lib/geo.ts` — turf-based polygon validation / area / coordinate parsing.
- `src/components/FieldMap.tsx` — MapLibre draw + display maps (OSM raster).
- `src/app/*` — App Router pages (dashboard, auth, onboarding, fields, subsidy, team).

## Notes

- Satellite index endpoints are not built yet on the backend; the overview tab
  shows a graceful "məlumat yoxdur" placeholder on 404/empty.
- No billing/payment UI (deferred). A read-only "Tarif: Pulsuz" note is shown.
