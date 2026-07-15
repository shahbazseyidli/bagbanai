# Bağban AI — Session Handoff (davam etmək üçün / continuation brief)

> Bu fayl bir developer sessiyasının davamı üçündür (Mac → Mac Mini M4 keçidi). Yeni agent bunu +
> `CLAUDE.md` + `docs/` oxusun və buradan davam etsin. UI Azərbaycanca, kod/SQL/commit İngiliscə.

---

## 0. ƏN ƏVVƏL — hansı qovluq + setup

- **Bu layihənin qovluğu: `~/Desktop/bagbanai`** — Mac Mini-nin Desktop-unda da var. **`~/Desktop/agradex` İLƏ QARIŞDIRMA** — o, ayrı layihədir (findix.az). Bütün işlər `~/Desktop/bagbanai`-də.
- Başlamazdan əvvəl:
  ```bash
  cd ~/Desktop/bagbanai
  git fetch origin
  git checkout main && git pull --ff-only origin main   # bütün deploy olunmuş işi çək
  ```
- **GitHub:** `shahbazseyidli/bagbanai`. `git origin` = **SSH** (`git@github.com:shahbazseyidli/bagbanai.git`) — HTTPS push ilişir. Mac Mini-nin SSH açarı GitHub-da authorized olmalıdır, yoxsa push işləməz.
- Oxu: `CLAUDE.md`, `docs/README.md` → `docs/{ARCHITECTURE,ROADMAP,OPERATIONS,API_REFERENCE,DECISIONS}.md`.

---

## 1. Layihə nədir
**Bağban AI** — NASA HLS peyk + hava (Open-Meteo) + AI əkin monitorinqi & təsərrüfat idarəetməsi (Azərbaycan fermerləri). **CANLI: https://agradex.com.**

## 2. Stack + server + deploy
- **Frontend:** Next.js 15 (App Router, TS) — `app/`. **Backend:** FastAPI (Python 3.11, asyncpg) — `services/app/`. **Geo pipeline:** `services/geo_pipeline/`. **DB:** Postgres 16 + PostGIS. **Tiles:** TiTiler. **Avtomatlaşdırma:** n8n.
- **Server:** Hetzner CPX22 "bagban-ai", IP **95.216.208.82**, root, `/opt/bagbanai` = origin/main git checkout. Mac (və Mac Mini) SSH açarı root-da authorized olmalıdır.
- **Deploy loop:**
  ```bash
  # local: commit + push origin/main (deploy mexanizmi budur)
  # server:
  cd /opt/bagbanai && git pull --ff-only origin main
  # YENİ migration varsa (db/migrations/00XX) və api onun sütunlarını oxuyursa — ƏVVƏL migration:
  docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U bagban -d bagban -v ON_ERROR_STOP=1 --single-transaction < db/migrations/00XX_*.sql
  docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U bagban -d bagban -c "insert into public.schema_migrations(filename) values ('00XX_*.sql') on conflict do nothing;"
  # sonra build (MÜTLƏQ .env source et, yoxsa api DB-yə 'root' kimi qoşulub crash-loop olur):
  set -a; . ./.env; set +a
  docker compose -f deploy/docker-compose.prod.yml up -d --build api web
  ```
- **Build qapısı:** local `tsc --noEmit` (app/) + serverdəki Docker `next build` = əsl gate. **Verify:** brauzerdə agradex.com (istifadəçinin Chrome-u owner kimi login-dir; claude-in-chrome MCP ilə).

## 3. Cari CANLI vəziyyət (deploy olunub, `origin/main` = commit `f475ea8`)
Faza 1 + infra Sprint 1-2 + AI məsləhət/chatbot (**AKTİV** — LLM açarı serverin `.env`-ində; user rotate edəcək) + admin panel/billing (v1.0.8) + **sahə onboarding sihirbazı (v1.0.9)** + metadata date-cast fix (`f475ea8`). Hamısı canlı və brauzerdə yoxlanılıb.
- **Onboarding sihirbazı:** `app/src/components/field/FieldOnboarding.tsx` (4 addım: xəritə→adaptiv "Sahə haqqında məlumat"→ətraflı→təsdiq). Backend `GET /api/geo/site?lat=&lon=` (Open-Meteo relyef + Nominatim rayon → `subsidy_regions.name_az` → economic_region). Migration `0012` = `crop_cycle/region/economic_region`.
- Fındıq bağı **"fındıq bağım"** (`4a5012b3-2baa-4714-b1d2-1ddc2454dd82`): tam metadata + terrain backfill (Xaçmaz rayonu / Quba-Xaçmaz / 46 m / 0.5° / 315° / perennial), AI məsləhət işləyir.

## 4. QALAN İŞ (bu handoff-un əsas səbəbi) — items 1/2/3/5/6

> **İstifadəçinin son 6 istəyi.** **Item 4 (metadata boş görünürdü) BİTDİ** — kök səbəb: `planting_date` string kimi asyncpg `$4::date`-ə gedirdi → `toordinal` xətası → **bütün PUT uğursuz**. `$4::text::date` cast ilə düzəldildi (`f475ea8`). test2 sahəsi düzəlişdən 1 dəq əvvəl yaradıldığı üçün boş qaldı (yenidən daxil edilə/yaradıla bilər).

**Qalan 5 item ARTIQ QURULUB, amma UN-REVIEWED / deploy OLUNMAYIB** — `wip/onboarding-refine` branch-ında (commit `c4d11ec`, push olunub). Dayandırılan workflow-un build fazası bitmişdi; review + fix + deploy işləmədi.

**Mac Mini-də ən tez yol:**
```bash
git checkout wip/onboarding-refine
cd app && npx tsc --noEmit          # frontend typecheck
cd .. && python3 -m py_compile services/app/ai/advice.py services/app/routers/indices.py
# adversarial review et (2 minor buq ola bilər), düzəlt, sonra:
git checkout main && git merge wip/onboarding-refine   # (və ya cherry-pick düzəlişlərlə)
# push origin main → serverdə deploy (YENİ migration YOXDUR bu branch-da) → brauzerdə yoxla
```

**Item-lərin spesifikasiyası (əgər sıfırdan qurmaq lazım olsa):**
1. **Onboarding-də bitki + sort ƏLİFBA sırası.** `metadataOptions.ts`-də `CROP_OPTIONS` və hər `VARIETY_OPTIONS_BY_CROP[crop]` `localeCompare("az")` ilə sırala; generik "Digər*"/other_crops/windbreak sonda qalsın. (CropGrid/VarietyChips mənbədən oxuyur → həm onboarding həm tab əlifba sırası olur.)
2. **Bitki siyahısını GENİŞLƏNDİR** (agro.gov.az subsidiya siyahısı: https://www.agro.gov.az/az/news/010920254 + ADAU bitkiçilik). Əlavə (value=label, cycle): ANNUAL — rye=Çovdar, oats=Vələmir, buckwheat=Qarabaşaq, chickpea=Noxud, bean=Lobya, lentil=Mərci, broad_bean=Paxla, flax=Kətan, sesame=Küncüt, rapeseed=Raps, tomato=Pomidor, cucumber=Xiyar, onion=Soğan, garlic=Sarımsaq, cabbage=Kələm, eggplant=Badımcan, pepper=Bibər, carrot=Kök, pumpkin=Balqabaq, greens=Göyərti; PERENNIAL — nectarine=Nektarin, quince=Heyva, mulberry=Tut, feijoa=Feyxoa, strawberry=Çiyələk, plum=Gavalı. Mövcud dəyərləri saxla; `CROP_CYCLE` map-ı hər yeni bitki üçün yenilə.
3. **"Sahə haqqında məlumat" tabı** (`MetadataTab.tsx`): default **READ-ONLY** (yalnız başlıq + seçilmiş dəyərlər, "—" boşdursa; canonical→AZ label lookup) + **"Redaktə et"** düyməsi → edit rejimi **`<select>` dropdown-larla** (crop_cycle/crop/variety/soil/irrigation/growth_stage/tillage/previous_crop; hər select-də "Bilmirəm"→null + "Digər" free-text unknown-ları qorusun); tarixlər ClickDate, pH PhPicker, rəqəmlər NumberSlider, relyef AutoField (aspect readOnly), massivlər RepeatableRows. "Yadda saxla" (mövcud onSave normalizasiyası qalsın) + "Ləğv et". crop_type məcburidir. Relyef (region/elevation/slope/aspect) GET select * ilə gəlir — read-only view-da göstər.
5. **AI məsləhət:** `AiTab.tsx`-dən **"Yenidən analiz et" düyməsini sil** (+ generate call/state). Backend `advice.py generate_and_store`-a `force=False` param əlavə et: son advice `generated_at` < 15 gün isə və force deyilsə → LLM çağırmadan `return None` (yəni yeni səhnədən sonra ən çox **15 gündə 1** yenilənir, son peyk əsasında). `internal.py` çağırışı default (force=False) qalır.
6. **İcmalda indeks-dəyər açıqlaması:** yeni `GET /api/fields/{id}/indices/summary` (`indices.py`, mövcud auth/gating pattern-i) → `{ indices: [{ index, latest:float|null, date:iso|null }] }` (NDVI, NDMI, NDWI, EVI, SAVI, NBR üçün ən son `index_stats.mean`/`acquired_at`, `distinct on (index_name)`). Frontend `OverviewTab.tsx`-də "Cari göstəricilər" bloku: hər indeks üçün AZ label (INDEX_LABELS) + latest (3 onluq) + `interpret(index,value)` ilə AZ status/izah + rəngli badge (good=emerald/warn=amber/bad=red). Hədlər: NDVI/EVI/SAVI <0.2 Çox zəif, 0.2-0.4 Zəif, 0.4-0.6 Orta, 0.6-0.8 Sağlam, >0.8 Çox sağlam; NDMI <0 Çox quru, 0-0.2 Quraqlıq riski, 0.2-0.4 Orta nəmlik, >0.4 Yaxşı nəmlik; NDWI <0 Quru, >=0 Nəm/su; NBR <0.1 Quru/yanıq riski, >=0.1 Normal.

## 5. Kritik faktlar / tələlər (gotchas)
- **Metadata PUT tarixləri:** `$N::text::date` cast (asyncpg date encoding — yoxsa `toordinal` xətası). (`f475ea8`)
- **`geo/site`:** Open-Meteo elevation (5 nöqtə, d=90m) + Nominatim reverse (`User-Agent: BagbanAI/1.0`) → `subsidy_regions.name_az ilike` → economic_region. Hamısı best-effort (heç vaxt 500 yox).
- **Server DB `bagban` = superuser** (RLS bypass) → admin/cross-tenant sorğular birbaşa işləyir. **Deploy-da `.env` MÜTLƏQ source olunmalı.**
- **HLS pipeline:** Earthdata bearer token `EARTHDATA_TOKEN` (**bitir 2026-08-30 — yenilə**). TiTiler tile URL WebMercatorQuad TMS tələb edir.
- **AI:** provider-agnostik `services/app/ai/` (Claude, `claude-opus-4-8`, `messages.parse`). Advice hər səhnədən sonra `POST /api/internal/advice/run` (X-Internal-Token) ilə auto (item 5-dən sonra 15-gün throttle).

## 6. TƏHLÜKƏSİZLİK (yeni agent MÜTLƏQ əməl etsin)
- **API açarlarını/parolları fayla YAZMA** — istifadəçi özü əlavə edir (sərt qayda). LLM açarı serverin `.env`-ində.
- **Repoları qarışdırma:** `~/Desktop/bagbanai` = Bağban AI; `~/Desktop/agradex` = findix.az.
- **main-ə push = deploy** — istifadəçidən təsdiq al (onların iş axını belədir). `wip/*` branch-lara push sərbəst.

## 7. İstinad datası
- **Reference sahə:** "fındıq bağım" `4a5012b3-2baa-4714-b1d2-1ddc2454dd82` (tam işlənmiş, AI məsləhət işləyir). Digərləri: "test lecet" `860891bd-912c-4ec3-9235-b7d4d0193190`.
- **Login:** demo — `demo@agradex.com` / `AgradexDemo2026`; owner — `seyidlimirshahbaz@gmail.com` (parol istifadəçidə). Admin panel `/admin` (owner `is_admin=true`).
- **User-account TODO:** Cloudflare SSL→Full(Strict); Earthdata token yenilə (<2026-08-30); LLM açarını rotate et (chat-da açıq mətnlə görünmüşdü).

## 8. Bu sessiyada nə edildi (xülasə)
AI aktivləşdirmə + canlı test; admin panel + billing (v1.0.8); sahə onboarding sihirbazı (v1.0.9) + `geo/site` + migration 0012; metadata date-cast buq düzəlişi (`f475ea8`) + fındıq bağı terrain backfill; refinement item 1/2/3/5/6 → `wip/onboarding-refine` (un-reviewed). CHANGELOG.md-də tam tarixçə.
