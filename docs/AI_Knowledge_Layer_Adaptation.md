# AI Bilik Qatı — Bağban AI-a uyğunlaşdırma (Adaptation Spec)

> **Status:** ANALİZ / DİZAYN — implementasiya BAŞLAMAYIB (istifadəçi qərarı, 2026-07-20).
> **Mənbə sənəd:** `~/Desktop/agradex-ai-knowledge-layer-spec.md` (v1.0, başqa agent yazıb).
> Bu fayl həmin xarici spesifikasiyanı **bizim stack-ə və konvensiyalarımıza** uyğunlaşdırır.
> Xarici sənəd toxunulmazdır (üzərinə yazma); bu fayl fərqləri və qərarları saxlayır.
> SSoT qaydası (CLAUDE.md): implementasiyadan əvvəl bu adaptasiya təsdiqlənməli, sonra
> CLAUDE.md + docs yenilənməlidir.

---

## 0. İcmal

Xarici spesifikasiya dəyərli bir ideya verir: universal (bitki-neytral) NDVI/EVI threshold-larını
**bitki-spesifik, kontekst-kalibrli şərh** ilə əvəz etmək + sahə üzrə keşlənən "Bilik Pasportu".
Problem realdır (aşağıda §2 doğrulama). Amma sənəd bizim kod bazasını görmədən yazılıb, ona görə
bir neçə faktı səhv bilir və bizim konvensiyalarımızı (org_id/RLS, forward-only migration, mövcud
`crop_thresholds` cədvəli, hava statusu) nəzərə almır. Bu sənəd həmin boşluqları bağlayır.

---

## 1. Təsdiqlənmiş qərarlar (istifadəçi, 2026-07-20)

| # | Mövzu | Qərar |
|---|---|---|
| D1 | Başlanğıc | **Yalnız analiz/dizayn** — indi kod yazılmır. Bu sənəd yazılır, sonra qərar. |
| D2 | Search mənbəyi | **Anthropic web_search** (mövcud `llm.py` adapteri). `SEARCH_PROVIDER` abstraksiyası saxlanılır ki, miqyasda Tavily/Exa-ya keçmək mümkün olsun. Yeni vendor/açar YOX. |
| D3 | `zone_id` | **Rayon** səviyyəsi (mövcud region məfhumu ilə uyğun; "Balakən + fındıq" birbaşa işləyir). |
| D4 | Data moat | **Bəli — anonimləşdirilmiş aqreqat.** Fermer cavablarından yalnız identifikatorsuz statistika zona qatına qalxır. |
| D5 | `water_requirements` / hava | **Open-Meteo bu layihəyə daxil edilir** (pulsuz/açarsız; `weather_cache` cədvəli hazırdır). Su bloku tam işləyir + Faza 2 modellərinə (GDD/frost) təməl. |
| D6 | Clarifications UX | **İcmal tabında daimi bölmə** + sayğac; `critical` olanda üst banner. Pop-up YOX. |
| D7 | Tarif gating | **İndi yox** — hamıya tam dərinlik. `org_is_paid()` hazır olduğundan sonra bir flag-la əlavə olunur. |
| D8 | EPPO | İstifadəçi **data.eppo.int-də hesab açacaq**, API açarını `.env`-ə əlavə edəcək (agent açarı görmür). `pest_disease` struktur mənbədən dolur. |

---

## 2. Faktların doğrulanması (sənədin iddiaları vs kod)

| Sənədin iddiası | Doğrulama | Nəticə |
|---|---|---|
| "Threshold-lar universaldır, bitki-neytraldır" | ✅ DOĞRU — `OverviewTab.tsx` ~L108: NDVI `<0.4 Zəif`, `≤0.8 Sağlam` hardcode. | Problem real. Xudat nümunəsi (EVI 0.345 "Zəif") düzdür. |
| — (sənəd bilmir) | 💡 `public.crop_thresholds` cədvəli **artıq var** (migration 0006), 5 bitki seed (fındıq daxil), sütunlar: `ndvi_healthy_min, ndvi_stress_max, ndmi_stress_max, gdd_base_c, frost/heat_threshold_c, kc_stages jsonb`. **Amma heç kim oxumur.** | M5 sıfırdan `index_norms` yaratmamalı — bu cədvəli genişləndirib **aktivləşdirməlidir**. |
| "Open-Meteo artıq işləyir" | ❌ SƏHV — yalnız `elevation` endpoint (`geo.py`). Hava/proqnoz yoxdur. | D5: Open-Meteo bu layihəyə daxil edilir. |
| "AI 250 m piksellə işləyir" | ❌ SƏHV — S2 **10m** + HLS 30m canlıdır (2026-07-20 deploy). 250m = SoilGrids rezolüsiyası. | Sənədin bu cümləsi silinir; şərhlərdə "250m piksel" arqumenti işlədilmir. |
| "Rayon zona açarı kimi hazırdır" | ⚠️ QISMƏN — `field_metadata.region` **sərbəst mətn** sahəsidir (sabit lüğət YOX, `AutoField`). | Zona açarı üçün rayonu **koordinatdan reverse-geocode** etmək lazımdır (sərbəst mətnə güvənmə). Bax §5.1. |
| "Ecocrop/EPPO REST API-lar hazırdır" | ⚠️ Ecocrop-un təmiz REST-i yoxdur (GAEZ v4-ə köçüb); EPPO legacy API **2026-09-01-də ölür**; CABI məzmunu müəllif-hüquqlu. | M2 səyi sənəddəkindən böyükdür. Bax §6 risklər. |

---

## 3. Memarlıq — bizim konvensiyalara uyğunlaşdırma

Xarici sənədin P1–P6 prinsipləri **saxlanılır**. Aşağıdakılar bizim stack üçün əlavə/dəyişiklikdir:

- **A1 — Multi-tenancy (MƏCBURİ).** Sahə-səviyyəli cədvəllər (`field_knowledge`, `clarifications`,
  `research_jobs`) **`org_id` + RLS** almalıdır (giriş zənciri `field → farm → organization → membership`,
  `current_user_id()` GUC). `zone_knowledge` **paylaşılan** cədvəldir → RLS yox, amma yazma yalnız
  server-tərəfli internal proseslə (istifadəçi birbaşa yaza bilməz). Bu, sənəddə heç müzakirə olunmayıb.
- **A2 — Forward-only migration.** Bizim konvensiya `db/migrations/00NN` ardıcıl, geri-qaytarılmayan.
  Sənədin §15.5 "reversible" tələbi **tətbiq olunmur** (mövcud 13 miqrasiyanın heç biri reversible deyil).
  Növbəti nömrə: `0014`.
- **A3 — Search = Anthropic web_search** (D2). `services/app/ai/` altında yeni `research.py` adapteri;
  `llm.py`-nin mövcud provayder-agnostik nümunəsini izləyir. `SEARCH_PROVIDER` env (default `anthropic`).
- **A4 — LLM sintezi mövcud `llm.py` ilə** (`complete_structured` + Pydantic sxem) — yeni LLM qatı yox.
  Model env-dən (`LLM_MODEL`), hazırda `claude-opus-4-8`; bilik sintezi üçün `claude-sonnet-5` (ucuz) düşünülə bilər.
- **A5 — Xərc izləmə mövcud admin panelə** (migration 0011 `admin_usage`) əlavə olunur; `research_jobs.cost_estimate`
  ora axır — ayrıca panel qurulmur.
- **A6 — Bildirişlər** mövcud `notifications` + NotificationBell ilə (clarification `critical` → in-app bildiriş).

---

## 4. `crop_thresholds` → `index_norms` keçidi (M5, ən yüksək dəyər)

Sənədin M5-i "ən görünən dəyər"dir və razıyıq. Bizim yol:

1. **Genişləndir, sıfırdan yaratma.** `crop_thresholds` hazırda `unique(crop_type)` — tək ölçülü.
   Bitki-spesifik şərh üçün **mərhələ/yaş** ölçüsü lazımdır. İki variant (implementasiyada qərar):
   - (a) `crop_thresholds`-a `growth_stage text`, `age_class text` sütunları + unique key genişləndir;
   - (b) yeni `zone_knowledge(block_type='index_norms')` bloku bu cədvəli əvəz edir.
   **İlkin meyl:** v1-də (a) — cədvəl+seed hazırdır, UI dərhal oxuya bilər; zona araşdırması (b) sonra üstünə gəlir.
2. **UI oxuma nöqtəsi:** `OverviewTab.tsx` status funksiyası (hardcode threshold) → API-dən gələn
   bitki-spesifik normalarla əvəz. Geriyə uyğunluq: norma tapılmayanda mövcud universal dəyərlərə fallback.
3. **Nəticə:** Xudat fındıq bağı üçün EVI 0.345 → yetkin fındıq normasına görə "Normal" (haqsız "Zəif" itir).

---

## 5. Data modeli — uyğunlaşdırılmış

Sənədin §5 cədvəlləri əsasən saxlanılır; dəyişikliklər:

### 5.1 Zona təyini (rayon)
- `zone_id` = **rayon kodu**, koordinatdan **reverse-geocode** ilə (sərbəst-mətn `region`-a güvənmə).
- Reverse-geocode mənbəyi (implementasiyada seçilir): offline AZ rayon sərhəd GeoJSON (PostGIS `ST_Contains`)
  — xarici asılılıq/gecikmə olmadan, idempotent. Nominatim kimi onlayn xidmət **fallback** ola bilər.
- `field_metadata.economic_region` (14 iqtisadi rayon) ikinci-dərəcəli qruplaşma üçün saxlanılır.

### 5.2 Cədvəllər (dəyişikliklərlə)
- `zone_knowledge` — sənəddəki kimi, **RLS yox** (paylaşılan), yazma internal-only.
- `field_knowledge`, `clarifications`, `research_jobs` — **hər birinə `org_id uuid not null` + RLS policy**
  (`current_user_id()` üzərindən üzvlük yoxlaması). `research_jobs.field_id` nullable qalır (zona-only job üçün).
- Bütün `content`/`sources` JSONB — sənəddəki kimi; `sources` **məcburi** (traceability P5).
- **Data moat (D4):** `zone_knowledge`-ə `derived_from text` (`external` | `farmer_aggregate`) əlavə —
  fermer cavablarından yaranan anonim aqreqat normaları kənar mənbədən ayırmaq üçün. Aqreqasiya
  ≥N sahə (məs. N=5) olmadan zona qatına qalxmır (k-anonymity).

### 5.3 `kc_stages` təkrar istifadə
`crop_thresholds.kc_stages jsonb` artıq var → `water_requirements` bloku (D5) bunu doldurur; Open-Meteo
ET0 + Kc → ETc. FAO-56 Kc dəyərləri seed/araşdırma ilə gəlir.

---

## 6. Risklər və açıq işlər (bizim kontekst)

| Risk / iş | Qeyd |
|---|---|
| **EPPO legacy API 2026-09-01-də ölür** | D8: yeni Data Portal hesabı + açar. Miqrasiya planı implementasiyadan əvvəl. |
| **Ecocrop təmiz REST yoxdur** | GAEZ v4 / statik dataset kimi endirilib lokal saxlanıla bilər; ya da web_search + link. |
| **CABI/Plantwise müəllif hüququ** | Yalnız qısa çıxarış + mənbə linki saxlanılır, tam mətn kopyalanmır. |
| **Reverse-geocode dəqiqliyi** | Sərhəd GeoJSON keyfiyyəti; sərhəddə olan sahələr üçün fallback rayon. |
| **web_search keyfiyyəti** | Domen ağ siyahısı (§3 mənbələr prioritet); naməlum domenə aşağı `confidence`. |
| **Hava inteqrasiyası genişlənir** | Open-Meteo (D5) bu layihənin skopunu böyüdür — GDD/frost modelləri Faza 2-dən buraya qismən çəkilir. |

---

## 7. Uyğunlaşdırılmış mərhələ planı

Sənədin M1–M8-i saxlanılır, sıra bizim dəyər/xərcə görə dəqiqləşir. **D1: heç biri indi başlamır.**

| Mərhələ | Bizim uyğunlaşdırma | Prioritet |
|---|---|---|
| **M1** Data modeli (migration 0014) | org_id+RLS əlavə, forward-only, `zone_knowledge` paylaşılan | Təməl |
| **M5** `crop_thresholds` aktivləşdirmə + UI | §4 — **ən yüksək dəyər**, ən görünən (Xudat düzəlişi) | 🥇 İlk |
| **M2** Struktur API (SoilGrids, EPPO, FAOSTAT) | SoilGrids açarsız; EPPO D8; keş+retry+timeout | 🥈 |
| **M3** Search adapteri (web_search) + LLM sintez | A3/A4; `SEARCH_PROVIDER` abstraksiyası | 🥈 |
| **M4** Asılılıq xəritəsi + `research_jobs` + debounce | §6 kritik qayda: əməliyyat qeydi araşdırma tetikləmir | 🥉 |
| **M6** Faza 2 çarpaz sintez + diaqnostika | mövcud `advice.py` genişlənir | 🥉 |
| **M7** Clarifications (İcmal tab, D6) | in-app bildiriş + struktur cavab | 🥉 |
| **M8** Mövsümi cron + Open-Meteo hava + xərc paneli | D5 hava; A5 mövcud panelə | Son |

**Tövsiyə olunan MVP dilimi:** M1(minimal) → M5. Bu, tək başına Xudat problemini həll edir və
Bilik Pasportunun qalan hissəsi olmadan da fermerə görünən dəyər verir.

---

## 8. İMPLEMENTASİYA VƏZİYYƏTİ (branch `feat/ai-knowledge-layer` — DEPLOY GÖZLƏYİR)

M1–M8 tam qurulub, `feat/ai-knowledge-layer`-də. **main-ə merge/deploy YOX** (istifadəçi təsdiqi gözlənilir).
Gate-lər: `tsc --noEmit` təmiz + api image import testi təmiz + migration 0014 tam zəncirdə (0001→0014)
throwaway DB-də təsdiqlənib.

| M | Nə quruldu | Əsas fayllar |
|---|---|---|
| M1 | 4 cədvəl + crop_thresholds genişlənməsi | `db/migrations/0014_knowledge_layer.sql` |
| M5 | Bitki-spesifik status etiketləri (Xudat düzəlişi) | `crop_thresholds.json`/`load_seeds.py`, `indices.py` (`/norms`), `OverviewTab.tsx` |
| M2 | Struktur adapterlər | `ai/sources/{base,soilgrids,faostat,eppo}.py` |
| M3 | Araşdırma orkestratoru + web_search | `ai/research.py`, `ai/knowledge.py`, `ai/llm.py` (`web_research`) |
| M4 | Job növbəsi + asılılıq xəritəsi + trigger | `ai/jobs.py`, `routers/internal.py` (`/research/drain`), `routers/fields.py`, `deploy/process-research.sh` |
| M6 | Passport-lu məsləhət (çarpaz sintez, səbəb-nəticə) | `ai/context.py`, `ai/advice.py` |
| M7 | Clarifications backend + UI | `ai/clarify.py`, `routers/knowledge.py`, `ClarificationBlock.tsx` |
| M8 | Open-Meteo hava + su bloku + passport UI | `ai/weather.py`, `ai/sources/openmeteo.py`, `run-weather.sh`, `KnowledgePassport.tsx` |

### Deploy ardıcıllığı (təsdiqdən sonra — main push = deploy)
1. **Migration 0014 ƏVVƏL** (queue lock altında): `... --profile tools run --rm tools "./db/migrate.sh"`.
2. **Seed loader-i işlət** (KRİTİK — index_norms-u doldurur, yoxsa M5 universal-a fallback edir və Xudat düzəlməz):
   `... --profile tools run --rm tools "python db/seeds/load_seeds.py"`.
3. `bash deploy/update.sh` (api/web rebuild).
4. Import + tsc gate (artıq CI-də təsdiqlənib).
5. **Cron-lar əlavə et:**
   - `*/3 * * * * cd /opt/bagbanai && flock -n /tmp/bagban-research.lock bash deploy/process-research.sh >> /var/log/bagban-research.log 2>&1`
   - `45 3 * * * cd /opt/bagbanai && bash deploy/run-weather.sh >> /var/log/bagban-weather.log 2>&1`
6. Brauzerdə yoxla: Xudat sahəsində EVI/SAVI artıq "Orta" (Zəif yox) + 🎯 nişanı; AI tabda Bilik Pasportu.

### Deploy-dan sonra istifadəçi işləri
- **EPPO token** (`data.eppo.int` hesabı) → `.env`-ə `EPPO_TOKEN=` → pest bloku aktivləşir (indi `eppo_no_token` ilə səliqəli deqradasiya).
- LLM açarı artıq var (advice/chat üçün) → web_search sintezi avtomatik işləyir; açar yoxdursa struktur-API blokları (torpaq/hava/pest) yenə dolur.

### Bilərəkdən MVP-də saxlanan / sonraya
- Tarif gating (D7 — indi hamıya tam). · FAOSTAT canlı host hazırda 521 (adapter deqradasiya edir; host qalxanda yoxla). ·
  Mövsümi fenoloji trigger (indi manual/metadata-triggered; cron-based seasonal enqueue follow-up). ·
  Research-dən gələn `index_norms`-un crop_thresholds-a geri-yazılması (indi seed-based provisional bands).
