# Bağban AI — §30: Subsidiya Kalkulyatoru Modulu
### Aqrar Subsidiya Şurası 2026 əmsalları əsasında subsidiya hesablama modulu

> **Versiya:** 1.0 · **Status:** Build-ready · **Hədəf icraçı:** Claude Code
> **Aidiyyat:** Bu, əsas platforma spesifikasiyasının (`Bagban_AI_Platforma_Spesifikasiya_AZ.md`) **§30 modulu**dur. Auth/rollar/multi-tenancy/gating oradan gəlir.
> **Mənbə:** Azərbaycan Respublikası Kənd Təsərrüfatı Nazirliyi — Aqrar Subsidiya Şurası, 2026-cı il əmsalları (01 Sentyabr 2025) — `https://www.agro.gov.az/az/news/010920254`.
> **Tier:** Kalkulyator **PULSUZ** (cəlbetmə funksiyası; ictimai məlumat). Hesablama tarixçəsi/saxlama istifadəçi hesabına bağlıdır.

---

## 30.1 Modul icmalı və düstur

İstifadəçi addım-addım seçimlər edir (subsidiya növü, bitki, intensivlik/əkin növü, ərazi, suvarma, sahə/ton) və **subsidiya məbləğini** dərhal görür. Linkdəki 2026 cədvəli tam olaraq DB-yə yüklənir və hesablamanın mənbəyidir.

**Əsas kəşf — vahid baza dərəcəsi 200 AZN:**
```
amount_per_unit (AZN/ha və ya AZN/ton) = coefficient × base_unit_rate
base_unit_rate (2026) = 200 AZN
```
Yoxlama: çəltik 1.9×200=380 · zəfəran 2.2×200=440 · üzüm super-int. texniki 82.5×200=16500 · alma super-int. NMR 161×200=32200 · pambıq (məhsul) 1.075×200=215 · nar (məhsul) 0.375×200=75. ✅

**Hesablama:**
```
quantity = area_ha        (əkin / dincə subsidiyası)
         = tons           (məhsul subsidiyası)
subtotal = amount_per_unit × quantity
total    = subtotal × modifiers      (§30.5)
+ uyğunluq xəbərdarlıqları (min sahə, min ting sıxlığı, hündürlük/EC/sertifikat/sığorta şərtləri)
```

> Baza dərəcəsi (200) `subsidy_years` cədvəlində konfiqdir — gələcək illərdə dəyişsə, yalnız yeni il + yeni seed əlavə olunur, kod dəyişmir.

---

## 30.2 Seçim sihirbazı (wizard) — dimensiyalar

| Addım | Sahə | Dəyərlər (mənbəyə görə) |
|---|---|---|
| 1 | **Subsidiya növü** | Əkin (`planting`) · Məhsul (`product`) · Dincə qoyulmuş torpaq (`fallow`) |
| 2 | **Bitki qrupu** | çəltik, qarğıdalı, darı, sorqo, dənli/paxlalı, yer fındığı, zəfəran, günəbaxan, kartof, tərəvəz, bostan, yonca, digər bitkilər, üzüm, çay, intensiv meyvə, super-intensiv meyvə, digər meyvə, giləmeyvə, tarlaqoruyucu (növə görə filtrlənir) |
| 3 | **Konkret bitki** | qrupdan asılı (məs. meyvə: fındıq, nar, zeytun, alma, armud, gilas, şaftalı, püstə, qoz, badam, xurma, şabalıd, limon, naringi…) |
| 4 | **İntensivlik / əkin növü** | intensiv · super-intensiv · digər (bağlar üçün) — VƏ YA əsas əkin · təkrar əkin (tarla bitkiləri üçün) |
| 5 | **Ərazi** | İşğaldan azad edilmiş ərazilər · Naxçıvan MR · Digər ərazilər · (bəzi bitkilər üçün konkret iqtisadi rayon/rayon) |
| 6 | **Suvarma** | müasir suvarma ilə · müasir suvarmasız · damcı · dəmyə (bitkiyə görə) |
| 7 | **Əkin dövrü** | 2025-09-01…2026-05-31 (yeni salınan) · 2021-09-01-dən · 2021-09-01-dən əvvəl (bağlar üçün) |
| 8 | **Miqdar** | sahə (ha) — əkin/dincə · məhsul (ton) — məhsul subsidiyası |
| 9 | **Modifikatorlar** | Böyük Qayıdış (məskunlaşan)? · Sertifikatlı toxum/ting? · Torpaq analizi edilib? · (min sahə/ting/hündürlük/EC şərtləri) |
| — | **Nəticə** | uyğun dərəcə, əmsal, AZN/ha (və ya AZN/ton), **cəmi AZN**, + şərt/xəbərdarlıq siyahısı |

**Sahə ilə inteqrasiya:** istifadəçi mövcud sahəni seçəndə — sahə ölçüsü (PostGIS `area_ha`), ərazi (sentroid→rayon), əkin növü (`field_metadata.crop_type`), suvarma (`irrigation_method`) avtomatik doldurulur; istifadəçi yalnız təsdiqləyir/düzəldir.

---

## 30.3 Verilənlər modeli (PostGIS DDL)

```sql
-- İl + baza dərəcəsi (illik yenilənə bilər)
create table public.subsidy_years (
  year int primary key,
  base_unit_rate numeric not null default 200,   -- AZN
  source_url text, published_at date, notes_az text
);

-- Ərazi/rayon istinadı (wizard dropdown + uyğunluq)
create table public.subsidy_regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- liberated | nakhchivan | other | <rayon-slug>
  name_az text not null,
  economic_region text,               -- Quba-Xaçmaz, Şəki-Zaqatala, ...
  is_liberated boolean default false,
  is_nakhchivan boolean default false
);

-- Əsas dərəcə cədvəli (linkdəki bütün sətirlər buraya yüklənir)
create table public.subsidy_rates (
  id uuid primary key default gen_random_uuid(),
  year int not null references public.subsidy_years(year),
  subsidy_type text not null,         -- planting | product | fallow | seed
  crop_group text not null,           -- rice|corn|...|grape|tea|fruit_intensive|fruit_super_intensive|fruit_other|berry|windbreak|product_*
  crop text not null,                 -- wheat|hazelnut|pomegranate|apple|cherry|...
  intensity text,                     -- intensive|super_intensive|other|main|repeat|NULL
  region_category text,               -- liberated|nakhchivan|other|all|specific
  irrigation text,                    -- modern|non_modern|drip|rainfed|NULL
  planting_period text,               -- new_2025_2026|from_2021|before_2021|NULL
  coefficient numeric not null,
  amount_per_unit numeric not null,   -- = coefficient × base_unit_rate
  unit text not null,                 -- ha|ton
  min_area_ha numeric,                -- minimum sahə tələbi (varsa)
  min_density_per_ha int,             -- minimum ting/ha (varsa)
  eligible_regions text[],            -- konkret uyğun rayonlar (fındıq/sitrus/pambıq/tütün); boşdursa = məhdudiyyət yoxdur
  conditions jsonb,                   -- {altitude_m:[min,max], ec_max_ds_m:2.0, drip:true, pole_system:true, insured:true, certified:true, ...}
  label_az text not null,             -- wizard/nəticə üçün insan-oxunaqlı təsvir (mənbəyə uyğun)
  notes_az text
);
create index subsidy_rates_lookup on public.subsidy_rates
  (year, subsidy_type, crop_group, crop, intensity, region_category, irrigation, planting_period);

-- Modifikatorlar/qaydalar
create table public.subsidy_modifiers (
  id uuid primary key default gen_random_uuid(),
  year int not null references public.subsidy_years(year),
  code text not null,                 -- boyuk_qayidis_50 | certified_seed_zero | region_ineligible_zero | analysis_reduction | productivity_cap | stop_after_date
  description_az text,
  applies_to jsonb,                   -- {crops:[...], subsidy_type:'...', groups:[...]}
  effect jsonb                        -- {type:'multiply',value:1.5} | {type:'set_zero'} | {type:'reduce_per_ton', crop_values:{cotton:10,tobacco:2,sugar_beet:1,soy:10}} | {type:'cap', min:15, max:60, unit:'sent_ha'} | {type:'set_zero_after', date:'2026-06-01', crops:['apple','peach'], except_regions:['liberated','nakhchivan']}
);

-- İstifadəçi hesablamaları (saxlama/tarixçə)
create table public.subsidy_calculations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid, user_id uuid,
  field_id uuid references public.fields(id) on delete set null,
  year int not null,
  inputs jsonb not null,              -- seçimlər
  matched_rate_id uuid references public.subsidy_rates(id),
  amount_per_unit numeric, quantity numeric, unit text,
  modifiers_applied jsonb, total_amount numeric,
  warnings jsonb,
  created_at timestamptz not null default now()
);
create index subsidy_calc_user_idx on public.subsidy_calculations (user_id, created_at desc);
```

**RLS:** `subsidy_years/regions/rates/modifiers` — **public read** (istinad datası, gating yoxdur). `subsidy_calculations` — `is_org_member`/sahib (üzvlük).
```sql
alter table public.subsidy_rates enable row level security;
create policy subsidy_rates_public_read on public.subsidy_rates for select using (true);
-- (eyni: subsidy_years, subsidy_regions, subsidy_modifiers)
alter table public.subsidy_calculations enable row level security;
create policy subsidy_calc_owner on public.subsidy_calculations for all
  using (user_id = auth.uid() or (org_id is not null and public.is_org_member(auth.uid(), org_id)))
  with check (user_id = auth.uid());
```

---

## 30.4 Seed data — 2026 subsidiya cədvəli (tam)

> Loader (Python/n8n) bu JSON-u `subsidy_rates`-ə yükləyir. `amount_per_unit = coefficient × 200` (loader hesablaya bilər). `label_az` mənbəyə uyğundur (izlənəbilirlik). İl konfiqu: `{ "year":2026, "base_unit_rate":200, "source_url":"https://www.agro.gov.az/az/news/010920254", "published_at":"2025-09-01" }`.

```json
[
  // ======== ƏKİN SUBSİDİYASI — TARLA BİTKİLƏRİ (unit: ha) ========
  {"type":"planting","group":"rice","crop":"rice","intensity":"main","irrigation":null,"coef":1.9,"amount":380,"label_az":"Çəltik — əsas əkinlər"},
  {"type":"planting","group":"rice","crop":"rice","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Çəltik — təkrar əkinlər"},
  {"type":"planting","group":"corn","crop":"corn","intensity":"main","region":"liberated","irrigation":"modern","coef":1.35,"amount":270,"label_az":"Qarğıdalı — əsas, işğaldan azad, müasir suvarma"},
  {"type":"planting","group":"corn","crop":"corn","intensity":"main","region":"liberated","irrigation":"non_modern","coef":0.25,"amount":50,"label_az":"Qarğıdalı — əsas, işğaldan azad, suvarmasız"},
  {"type":"planting","group":"corn","crop":"corn","intensity":"main","region":"other","irrigation":"modern","coef":0.8,"amount":160,"label_az":"Qarğıdalı — əsas, digər ərazi, müasir suvarma"},
  {"type":"planting","group":"corn","crop":"corn","intensity":"main","region":"other","irrigation":"non_modern","coef":0.5,"amount":100,"label_az":"Qarğıdalı — əsas, digər ərazi, suvarmasız"},
  {"type":"planting","group":"corn","crop":"corn","intensity":"repeat","coef":0.25,"amount":50,"label_az":"Qarğıdalı — təkrar əkinlər"},
  {"type":"planting","group":"millet","crop":"millet","intensity":"main","irrigation":"modern","coef":1.45,"amount":290,"label_az":"Darı — əsas, müasir suvarma"},
  {"type":"planting","group":"millet","crop":"millet","intensity":"main","irrigation":"non_modern","coef":1.15,"amount":230,"label_az":"Darı — əsas, suvarmasız"},
  {"type":"planting","group":"millet","crop":"millet","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Darı — təkrar əkinlər"},
  {"type":"planting","group":"sorghum","crop":"sorghum","intensity":"main","irrigation":"modern","coef":1.1,"amount":220,"label_az":"Sorqo — əsas, müasir suvarma"},
  {"type":"planting","group":"sorghum","crop":"sorghum","intensity":"main","irrigation":"non_modern","coef":0.8,"amount":160,"label_az":"Sorqo — əsas, suvarmasız"},
  {"type":"planting","group":"sorghum","crop":"sorghum","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Sorqo — təkrar əkinlər"},
  {"type":"planting","group":"cereals_legumes","crop":"cereals_legumes","region":"liberated","irrigation":"modern","coef":2.0,"amount":400,"label_az":"Dənli/paxlalı (buğda,arpa,çovdar,noxud,lobya,mərci...) — işğaldan azad, müasir suvarma"},
  {"type":"planting","group":"cereals_legumes","crop":"cereals_legumes","region":"liberated","irrigation":"non_modern","coef":0.5,"amount":100,"label_az":"Dənli/paxlalı — işğaldan azad, suvarmasız"},
  {"type":"planting","group":"cereals_legumes","crop":"cereals_legumes","region":"other","irrigation":"modern","coef":1.45,"amount":290,"label_az":"Dənli/paxlalı — digər ərazi, müasir suvarma"},
  {"type":"planting","group":"cereals_legumes","crop":"cereals_legumes","region":"other","irrigation":"non_modern","coef":1.15,"amount":230,"label_az":"Dənli/paxlalı — digər ərazi, suvarılan (müasir suvarmasız)"},
  {"type":"planting","group":"cereals_legumes","crop":"cereals_legumes","region":"other","irrigation":"rainfed","coef":1.0,"amount":200,"label_az":"Dənli/paxlalı — dəmyə əkin sahələri"},
  {"type":"planting","group":"groundnut","crop":"groundnut","irrigation":"modern","coef":1.4,"amount":280,"label_az":"Yer fındığı — müasir suvarma"},
  {"type":"planting","group":"groundnut","crop":"groundnut","irrigation":"non_modern","coef":1.1,"amount":220,"label_az":"Yer fındığı — suvarmasız"},
  {"type":"planting","group":"saffron","crop":"saffron","coef":2.2,"amount":440,"label_az":"Zəfəran"},
  {"type":"planting","group":"sunflower","crop":"sunflower","intensity":"main","irrigation":"modern","coef":0.9,"amount":180,"label_az":"Günəbaxan — əsas, müasir suvarma"},
  {"type":"planting","group":"sunflower","crop":"sunflower","intensity":"main","irrigation":"non_modern","coef":0.6,"amount":120,"label_az":"Günəbaxan — əsas, suvarmasız"},
  {"type":"planting","group":"sunflower","crop":"sunflower","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Günəbaxan — təkrar əkinlər"},
  {"type":"planting","group":"potato","crop":"potato","intensity":"main","irrigation":"modern","coef":1.8,"amount":360,"label_az":"Kartof — əsas, müasir suvarma"},
  {"type":"planting","group":"potato","crop":"potato","intensity":"main","irrigation":"non_modern","coef":1.5,"amount":300,"label_az":"Kartof — əsas, suvarmasız"},
  {"type":"planting","group":"potato","crop":"potato","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Kartof — təkrar əkinlər"},
  {"type":"planting","group":"vegetable","crop":"vegetable","intensity":"main","irrigation":"modern","coef":1.55,"amount":310,"label_az":"Tərəvəz — əsas, müasir suvarma"},
  {"type":"planting","group":"vegetable","crop":"vegetable","intensity":"main","irrigation":"non_modern","coef":1.25,"amount":250,"label_az":"Tərəvəz — əsas, suvarmasız"},
  {"type":"planting","group":"vegetable","crop":"vegetable","intensity":"repeat","coef":0.6,"amount":120,"label_az":"Tərəvəz — təkrar əkinlər"},
  {"type":"planting","group":"melon","crop":"melon","irrigation":"modern","coef":1.4,"amount":280,"label_az":"Bostan bitkiləri — müasir suvarma"},
  {"type":"planting","group":"melon","crop":"melon","irrigation":"non_modern","coef":1.1,"amount":220,"label_az":"Bostan bitkiləri — suvarmasız"},
  {"type":"planting","group":"alfalfa","crop":"alfalfa","irrigation":"modern","coef":0.8,"amount":160,"label_az":"Yonca — müasir suvarma"},
  {"type":"planting","group":"alfalfa","crop":"alfalfa","irrigation":"non_modern","coef":0.5,"amount":100,"label_az":"Yonca — suvarmasız"},
  {"type":"planting","group":"other_crops","crop":"other_crops","irrigation":"modern","coef":0.95,"amount":190,"label_az":"Digər bitkilər (pambıq/tütün/şəkər çuğunduru/soya istisna) — müasir suvarma"},
  {"type":"planting","group":"other_crops","crop":"other_crops","irrigation":"non_modern","coef":0.65,"amount":130,"label_az":"Digər bitkilər — suvarmasız"},

  // ======== ƏKİN SUBSİDİYASI — ÜZÜM (unit: ha) ========
  {"type":"planting","group":"grape","crop":"grape","intensity":"super_intensive","region":"liberated","planting_period":"new_2025_2026","coef":82.5,"amount":16500,"label_az":"Üzüm — super-intensiv texniki, işğaldan azad, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"super_intensive","region":"liberated","planting_period":"new_2025_2026","coef":55,"amount":11000,"label_az":"Üzüm — super-intensiv süfrə, işğaldan azad, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"super_intensive","region":"nakhchivan","planting_period":"new_2025_2026","coef":73.5,"amount":14700,"min_area_ha":5,"min_density_per_ha":1600,"conditions":{"altitude_m":[0,800],"seedless_variety":true,"phylloxera_resistant":true,"insured":true},"label_az":"Üzüm — super-intensiv, Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"intensive","region":"nakhchivan","planting_period":"new_2025_2026","coef":62.5,"amount":12500,"min_area_ha":2,"min_density_per_ha":1250,"conditions":{"altitude_m":[0,1500],"phylloxera_resistant":true,"insured":true},"label_az":"Üzüm — intensiv, Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"super_intensive","region":"other","planting_period":"new_2025_2026","conditions":{"small_winery":true},"coef":82.5,"amount":16500,"label_az":"Üzüm — kiçik şərabçılıq, super-intensiv texniki, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"intensive","region":"other","planting_period":"new_2025_2026","coef":40,"amount":8000,"label_az":"Üzüm — intensiv, digər ərazilər, yeni salınan"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"other","region":"all","planting_period":"from_2021","coef":3.5,"amount":700,"label_az":"Üzüm — 2021-09-01-dən salınan bağlar"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"other","planting_period":"before_2021","irrigation":"modern","coef":0.55,"amount":110,"label_az":"Üzüm — 2021-09-01-dən əvvəl, müasir suvarma"},
  {"type":"planting","group":"grape","crop":"grape","intensity":"other","planting_period":"before_2021","irrigation":"non_modern","coef":0.25,"amount":50,"label_az":"Üzüm — 2021-09-01-dən əvvəl, suvarmasız"},

  // ======== ƏKİN SUBSİDİYASI — ÇAY (unit: ha) ========
  {"type":"planting","group":"tea","crop":"tea","planting_period":"new_2025_2026","irrigation":"modern","coef":60,"amount":12000,"label_az":"Çay — yeni salınan, müasir suvarma"},
  {"type":"planting","group":"tea","crop":"tea","planting_period":"from_2019","coef":4,"amount":800,"label_az":"Çay — 2019-dan salınan plantasiyalar"},
  {"type":"planting","group":"tea","crop":"tea","planting_period":"before_2019","coef":1.25,"amount":250,"label_az":"Çay — 2019-dan əvvəl salınmış plantasiyalar"},

  // ======== ƏKİN SUBSİDİYASI — İNTENSİV MEYVƏ (unit: ha) ========
  {"type":"planting","group":"fruit_intensive","crop":"hazelnut","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":330,"conditions":{"terrain":"mountain","regions_note":"Quba-Xaçmaz, Şəki-Zaqatala, Naxçıvan + siyahı"},"coef":15,"amount":3000,"label_az":"İntensiv fındıq bağları — dağ/dağətəyi, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pomegranate","region":"liberated","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":650,"coef":18.5,"amount":3700,"label_az":"İntensiv nar bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pomegranate","region":"other","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":650,"coef":15,"amount":3000,"label_az":"İntensiv nar bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"olive","planting_period":"new_2025_2026","min_area_ha":50,"min_density_per_ha":1650,"conditions":{"altitude_m":[0,150],"ec_max_ds_m":3.0},"coef":28,"amount":5600,"label_az":"İntensiv zeytun bağları — yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"lemon_kumquat","planting_period":"new_2025_2026","eligible_regions":["Astara","Lənkəran","Masallı","Lerik"],"coef":58,"amount":11600,"label_az":"İntensiv limon və kinkan bağları — yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"mandarin_orange","planting_period":"new_2025_2026","eligible_regions":["Astara","Lənkəran","Masallı","Lerik"],"coef":48,"amount":9600,"label_az":"İntensiv naringi və portağal bağları — yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"peach_apricot","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":650,"conditions":{"altitude_m":[0,1500],"ec_max_ds_m":2.0},"coef":25,"amount":5000,"label_az":"İntensiv şaftalı(nektarin)/ərik — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"peach_apricot","region":"other","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":650,"conditions":{"ec_max_ds_m":2.0},"coef":20,"amount":4000,"label_az":"İntensiv şaftalı(nektarin)/ərik — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pistachio","region":"nakhchivan","planting_period":"new_2025_2026","min_density_per_ha":400,"conditions":{"altitude_m":[0,1000],"ec_max_ds_m":3.0},"coef":31.5,"amount":6300,"label_az":"İntensiv püstə bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pistachio","region":"other","planting_period":"new_2025_2026","min_density_per_ha":400,"conditions":{"altitude_m":[0,150],"ec_max_ds_m":3.0},"coef":22.5,"amount":4500,"label_az":"İntensiv püstə bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pear","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":2450,"conditions":{"altitude_m":[300,null],"pole_system":true},"coef":100,"amount":20000,"label_az":"İntensiv armud bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"pear","region":"other","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":2450,"conditions":{"altitude_m":[300,null],"pole_system":true},"coef":40,"amount":8000,"label_az":"İntensiv armud bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"apple","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":2450,"conditions":{"pole_system":true},"coef":105,"amount":21000,"label_az":"İntensiv alma bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"apple","region":"other","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":2450,"conditions":{"pole_system":true,"stop_after":"2026-06-01"},"coef":55,"amount":11000,"label_az":"İntensiv alma bağları — digər ərazilər, yeni salınan (2026-06-01-dən dayanır)"},
  {"type":"planting","group":"fruit_intensive","crop":"cherry","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":1150,"conditions":{"altitude_m":[700,null],"pole_system":true},"coef":50,"amount":10000,"label_az":"İntensiv gilas bağları — yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"persimmon","region":"liberated","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":650,"coef":19.5,"amount":3900,"label_az":"İntensiv xurma(xirnik) bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"persimmon","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":650,"coef":22.5,"amount":4500,"label_az":"İntensiv xurma(xirnik) bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"persimmon","region":"other","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":650,"coef":15,"amount":3000,"label_az":"İntensiv xurma(xirnik) bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"almond","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":650,"coef":36.75,"amount":7350,"label_az":"İntensiv badam bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"almond","region":"other","planting_period":"new_2025_2026","min_area_ha":5,"min_density_per_ha":650,"coef":17.5,"amount":3500,"label_az":"İntensiv badam bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"walnut","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":5,"min_density_per_ha":250,"coef":21,"amount":4200,"label_az":"İntensiv qoz bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"walnut","region":"other","planting_period":"new_2025_2026","min_area_ha":5,"min_density_per_ha":250,"coef":16.5,"amount":3300,"label_az":"İntensiv qoz bağları — digər ərazilər, yeni salınan"},
  {"type":"planting","group":"fruit_intensive","crop":"fruit_other","planting_period":"from_2021","coef":4,"amount":800,"label_az":"İntensiv meyvə — 2021-09..2025-05 salınan digər bağlar"},
  {"type":"planting","group":"fruit_intensive","crop":"fruit_other","planting_period":"before_2021","coef":0.55,"amount":110,"label_az":"İntensiv meyvə — 2021-09-01-dən əvvəl salınmış bağlar"},

  // ======== ƏKİN SUBSİDİYASI — SUPER-İNTENSİV MEYVƏ (unit: ha) ========
  {"type":"planting","group":"fruit_super_intensive","crop":"chestnut","region":"liberated","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":400,"conditions":{"altitude_m":[500,null]},"coef":16.25,"amount":3250,"label_az":"Super-intensiv şabalıd bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"cherry","region":"liberated","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":1600,"conditions":{"altitude_m":[550,1000],"pole_system":true},"coef":81.25,"amount":16250,"label_az":"Super-intensiv gilas bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"peach_apricot","region":"liberated","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":2500,"conditions":{"altitude_m":[150,500],"pole_system":true},"coef":77.5,"amount":15500,"label_az":"Super-intensiv şaftalı(nektarin)/ərik — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"walnut","region":"liberated","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":350,"conditions":{"altitude_m":[500,900]},"coef":21,"amount":4200,"label_az":"Super-intensiv qoz bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"hazelnut","region":"liberated","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":650,"conditions":{"altitude_m":[500,900]},"coef":22,"amount":4400,"label_az":"Super-intensiv fındıq bağları — işğaldan azad, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"walnut","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":350,"conditions":{"altitude_m":[700,1100]},"coef":28,"amount":5600,"label_az":"Super-intensiv qoz bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"peach_apricot","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":2500,"conditions":{"altitude_m":[0,800],"ec_max_ds_m":2.0,"pole_system":true},"coef":122.5,"amount":24500,"label_az":"Super-intensiv şaftalı(nektarin) — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"pear","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":3,"min_density_per_ha":2770,"conditions":{"altitude_m":[0,900],"pole_system":true},"coef":126,"amount":25200,"label_az":"Super-intensiv armud bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"apple","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":4000,"conditions":{"altitude_m":[800,1100],"pole_system":true},"coef":161,"amount":32200,"label_az":"Super-intensiv alma bağları — Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"fruit_super_intensive","crop":"hazelnut","region":"nakhchivan","planting_period":"new_2025_2026","min_area_ha":2,"min_density_per_ha":650,"conditions":{"altitude_m":[700,1100]},"coef":22,"amount":4400,"label_az":"Super-intensiv fındıq bağları — Naxçıvan MR, yeni salınan"},

  // ======== ƏKİN SUBSİDİYASI — DİGƏR MEYVƏ (unit: ha) ========
  {"type":"planting","group":"fruit_other","crop":"chestnut","planting_period":"new_2025_2026","coef":4,"amount":800,"label_az":"Digər meyvə — şabalıd bağları, yeni salınan"},
  {"type":"planting","group":"fruit_other","crop":"fruit_other","planting_period":"from_2021","irrigation":"drip","coef":1.55,"amount":310,"label_az":"Digər meyvə — 2021-09..2025-05, damcı suvarma"},
  {"type":"planting","group":"fruit_other","crop":"fruit_other","planting_period":"from_2021","irrigation":"non_modern","coef":1.25,"amount":250,"label_az":"Digər meyvə — 2021-09..2025-05, damcı suvarmasız"},
  {"type":"planting","group":"fruit_other","crop":"fruit_other","planting_period":"before_2021","irrigation":"drip","coef":0.55,"amount":110,"label_az":"Digər meyvə — 2021-09-01-dən əvvəl, damcı suvarma"},
  {"type":"planting","group":"fruit_other","crop":"fruit_other","planting_period":"before_2021","irrigation":null,"coef":0.25,"amount":50,"label_az":"Digər meyvə bağları"},

  // ======== ƏKİN SUBSİDİYASI — GİLƏMEYVƏ (unit: ha) ========
  {"type":"planting","group":"berry","crop":"kiwi","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":650,"eligible_regions":["Astara","Lənkəran","Masallı","Lerik"],"coef":48,"amount":9600,"label_az":"Kivi bağları — yeni salınan, damcı suvarma"},
  {"type":"planting","group":"berry","crop":"raspberry","region":"liberated","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":5600,"conditions":{"pole_system":true},"coef":67.5,"amount":13500,"label_az":"Moruq bağları — işğaldan azad, yeni salınan, damcı"},
  {"type":"planting","group":"berry","crop":"raspberry","region":"other","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":4700,"conditions":{"pole_system":true},"coef":16,"amount":3200,"label_az":"Moruq bağları — digər ərazilər, yeni salınan, damcı"},
  {"type":"planting","group":"berry","crop":"currant","planting_period":"new_2025_2026","irrigation":"drip","min_density_per_ha":3300,"conditions":{"pole_system":true},"coef":16,"amount":3200,"label_az":"Qarağat bağları — yeni salınan, damcı suvarma"},
  {"type":"planting","group":"berry","crop":"blackberry","region":"liberated","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":3700,"conditions":{"pole_system":true},"coef":52,"amount":10400,"label_az":"Böyürtkən bağları — işğaldan azad/Naxçıvan MR, yeni salınan, damcı"},
  {"type":"planting","group":"berry","crop":"blackberry","region":"other","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":3300,"conditions":{"pole_system":true},"coef":16,"amount":3200,"label_az":"Böyürtkən bağları — digər ərazilər, yeni salınan, damcı"},
  {"type":"planting","group":"berry","crop":"blueberry_pot","region":"liberated","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":3570,"conditions":{"substrate":"peat_perlite"},"coef":125,"amount":25000,"label_az":"Qaragilə(mavigilə) — dibçəklərdə, işğaldan azad/Naxçıvan MR, yeni salınan"},
  {"type":"planting","group":"berry","crop":"blueberry_pot","region":"other","planting_period":"new_2025_2026","min_area_ha":1,"min_density_per_ha":3400,"conditions":{"substrate":"peat_perlite"},"coef":100,"amount":20000,"label_az":"Qaragilə(mavigilə) — dibçəklərdə, digər ərazilər, yeni salınan"},
  {"type":"planting","group":"berry","crop":"blueberry_soil","planting_period":"new_2025_2026","irrigation":"drip","min_area_ha":1,"min_density_per_ha":3400,"conditions":{"soil_ph_max":6.5,"ph_control":true,"region":"Lənkəran-Astara"},"coef":60,"amount":12000,"label_az":"Qaragilə(mavigilə) — torpaqda, Lənkəran-Astara, yeni salınan"},
  {"type":"planting","group":"berry","crop":"kiwi","planting_period":"from_2022","irrigation":"drip","coef":3.3,"amount":660,"label_az":"Kivi — 2022-dən salınan, damcı suvarma"},
  {"type":"planting","group":"berry","crop":"berry_other","irrigation":"modern","coef":0.55,"amount":110,"label_az":"Digər giləmeyvə sahələri — müasir suvarma"},
  {"type":"planting","group":"berry","crop":"berry_other","irrigation":"non_modern","coef":0.25,"amount":50,"label_az":"Digər giləmeyvə sahələri — suvarmasız"},

  // ======== ƏKİN SUBSİDİYASI — TARLAQORUYUCU (unit: ha) ========
  {"type":"planting","group":"windbreak","crop":"windbreak","planting_period":"new_2025_2026","min_density_per_ha":1500,"coef":5,"amount":1000,"label_az":"Tarlaqoruyucu zolaqlar üçün bitkilər — yeni salınan"},

  // ======== DİNCƏ QOYULMUŞ TORPAQ (unit: ha) ========
  {"type":"fallow","group":"fallow","crop":"wheat","eligible_regions":["Şamaxı","Şəki","Qobustan","Yardımlı"],"conditions":{"rainfed":true,"last_3_years_declared":true},"coef":1.1,"amount":220,"label_az":"Dincə qoyulmuş torpaq — son 3 ildə buğda (dəmyə)"},
  {"type":"fallow","group":"fallow","crop":"barley","eligible_regions":["Şamaxı","Şəki","Qobustan","Yardımlı"],"conditions":{"rainfed":true,"last_3_years_declared":true},"coef":1.1,"amount":220,"label_az":"Dincə qoyulmuş torpaq — son 3 ildə arpa (dəmyə)"},

  // ======== MƏHSUL SUBSİDİYASI (unit: ton) ========
  {"type":"product","group":"product_cotton","crop":"cotton","irrigation":"modern","coef":1.075,"amount":215,"unit":"ton","label_az":"Pambıq — müasir suvarma"},
  {"type":"product","group":"product_cotton","crop":"cotton","irrigation":"non_modern","coef":1.0,"amount":200,"unit":"ton","label_az":"Pambıq — suvarmasız"},
  {"type":"product","group":"product_tobacco","crop":"tobacco_virginia","irrigation":"modern","coef":0.18,"amount":36,"unit":"ton","label_az":"Tütün (yaş) — Virciniya, müasir suvarma"},
  {"type":"product","group":"product_tobacco","crop":"tobacco_virginia","irrigation":"non_modern","coef":0.17,"amount":34,"unit":"ton","label_az":"Tütün (yaş) — Virciniya, suvarmasız"},
  {"type":"product","group":"product_tobacco","crop":"tobacco_other","irrigation":"modern","coef":0.11,"amount":22,"unit":"ton","label_az":"Tütün (yaş) — digər sortlar, müasir suvarma"},
  {"type":"product","group":"product_tobacco","crop":"tobacco_other","irrigation":"non_modern","coef":0.10,"amount":20,"unit":"ton","label_az":"Tütün (yaş) — digər sortlar, suvarmasız"},
  {"type":"product","group":"product_sugar_beet","crop":"sugar_beet","irrigation":"modern","coef":0.095,"amount":19,"unit":"ton","label_az":"Şəkər çuğunduru — müasir suvarma"},
  {"type":"product","group":"product_sugar_beet","crop":"sugar_beet","irrigation":"non_modern","coef":0.09,"amount":18,"unit":"ton","label_az":"Şəkər çuğunduru — suvarmasız"},
  {"type":"product","group":"product_soy","crop":"soy","irrigation":"modern","coef":0.6,"amount":120,"unit":"ton","label_az":"Soya — müasir suvarma"},
  {"type":"product","group":"product_soy","crop":"soy","irrigation":"non_modern","coef":0.5,"amount":100,"unit":"ton","label_az":"Soya — suvarmasız"},
  {"type":"product","group":"product_corn","crop":"corn","coef":0.25,"amount":50,"unit":"ton","label_az":"Qarğıdalı (məhsul subsidiyası)"},
  {"type":"product","group":"product_sunflower","crop":"sunflower","coef":0.25,"amount":50,"unit":"ton","label_az":"Günəbaxan (məhsul subsidiyası)"},
  {"type":"product","group":"product_wheat","crop":"wheat","conditions":{"contract":true,"delivered_to":"state_reserves_or_mills"},"coef":0.5,"amount":100,"unit":"ton","label_az":"Buğda (ərzaqlıq, müqavilə ilə — məhsul subsidiyası)"},
  {"type":"product","group":"product_pomegranate","crop":"pomegranate","conditions":{"delivered_to":"juice_processor"},"coef":0.375,"amount":75,"unit":"ton","label_az":"Nar (emal müəssisəsinə — məhsul subsidiyası)"},
  {"type":"product","group":"product_apple","crop":"apple","conditions":{"delivered_to":"juice_processor"},"coef":0.25,"amount":50,"unit":"ton","label_az":"Alma (emal müəssisəsinə — məhsul subsidiyası)"}
]
```

> **Qeyd (default unit):** `unit` yazılmayan bütün sətirlərdə `unit = "ha"` (əkin/dincə). Məhsul sətirlərində `unit = "ton"`.

**Uyğunluq üçün rayon siyahıları (seed → `eligible_regions` / istinad):**
- **Fındıq** əkin əmsalı yalnız: Ağdam, Ağdaş, Ağstafa, Ağsu, Balakən, Cəbrayıl, Lerik, İsmayıllı, Zaqatala, Zəngilan, Xaçmaz, Xocalı, Xocavənd, Qax, Qəbələ, Quba, Qubadlı, Oğuz, Qusar, Qazax, Tərtər, Tovuz, Şabran, Şamaxı, Şəki, Şəmkir, Yardımlı — digər rayonlarda **0**.
- **Limon/kinkan/naringi/portağal/kivi:** Astara, Lənkəran, Masallı + Lerik (<300 m) — digərlərində **0**.
- **Pambıq** məhsul əmsalı: Ağcabədi, Ağdam, Beyləqan, Bərdə, Biləsuvar, Goranboy, İmişli, Kürdəmir, Neftçala, Saatlı, Sabirabad, Salyan, Tərtər, Yevlax, Zərdab (+ Cəlilabad Günəşli/Təzəkənd, Ucar Xələc) — digərlərində **0**.
- **Tütün** məhsul əmsalı: Ağstafa, Balakən, Gədəbəy, Goranboy, İsmayıllı, Lerik, Masallı, Oğuz, Qax, Qazax, Qəbələ, Qubadlı, Şəki, Tovuz, Yardımlı, Zaqatala, Zəngilan — digərlərində **0**.

---

## 30.5 Modifikatorlar / qaydalar (seed)

```json
[
  {"code":"boyuk_qayidis_50","description_az":"Böyük Qayıdış: işğaldan azad kənd/qəsəbələrdə məskunlaşan sakinlərə verilmiş torpaqlarda birillik bitkilər və yonca üzrə +50%","applies_to":{"subsidy_type":"planting","groups":["rice","corn","millet","sorghum","cereals_legumes","groundnut","sunflower","potato","vegetable","melon","alfalfa","other_crops"]},"effect":{"type":"multiply","value":1.5}},
  {"code":"certified_seed_zero","description_az":"Buğda cəmi >10 ha və ya arpa cəmi >100 ha olan fermer sertifikatlı toxum istifadə etmirsə əkin əmsalı 0","applies_to":{"crops":["wheat","barley"]},"effect":{"type":"set_zero","when":{"wheat_area_gt":10,"barley_area_gt":100,"certified":false}}},
  {"code":"region_ineligible_zero","description_az":"Bitki üzrə uyğun rayon siyahısından kənarda əmsal 0 (fındıq, sitrus/kivi, pambıq, tütün və s.)","applies_to":{"uses":"eligible_regions"},"effect":{"type":"set_zero_if_region_not_in_eligible"}},
  {"code":"analysis_reduction","description_az":"Aqrokimyəvi analiz edilməyibsə məhsul subsidiyası ton başına azaldılır","applies_to":{"subsidy_type":"product","crops":["cotton","tobacco","sugar_beet","soy"]},"effect":{"type":"reduce_per_ton","crop_values":{"cotton":10,"tobacco":2,"sugar_beet":1,"soy":10}}},
  {"code":"cotton_productivity_cap","description_az":"Pambıq: orta məhsuldarlıq ≤15 sent/ha → 0; 60 sent/ha-dan yuxarı hissə → 0","applies_to":{"crops":["cotton"]},"effect":{"type":"productivity_cap","min_sent_ha":15,"max_sent_ha":60}},
  {"code":"stop_apple_peach_2026_06","description_az":"İntensiv alma və şaftalı(nektarin) əkin subsidiyası 2026-06-01-dən dayanır (işğaldan azad + Naxçıvan MR istisna)","applies_to":{"crops":["apple","peach_apricot"],"intensity":"intensive"},"effect":{"type":"set_zero_after","date":"2026-06-01","except_regions":["liberated","nakhchivan"]}}
]
```

**Tətbiq ardıcıllığı:** (1) region uyğunluğu → uyğun deyilsə 0; (2) sertifikatlı toxum → şərt pozulubsa 0; (3) tarix dayanması (alma/şaftalı) → 0; (4) baza məbləği = amount_per_unit × quantity; (5) Böyük Qayıdış ×1.5; (6) məhsul üçün analiz azaltması / məhsuldarlıq cap. Min sahə/min ting/hündürlük/EC/sığorta şərtləri pozulubsa: **xəbərdarlıq göstər** (v1-də bloklama yox, məlumatlandırma).

---

## 30.6 Hesablama API və axını

**Endpoint-lər:**
| Method | Path | Tier | Təsvir |
|---|---|---|---|
| GET | `/api/subsidy/options?type=&group=&crop=` | FREE | Kaskad seçim variantları (növ→qrup→bitki→intensivlik→ərazi→suvarma) |
| POST | `/api/subsidy/calculate` | FREE | Seçimlər + miqdar → uyğun dərəcə + cəmi + xəbərdarlıqlar |
| POST | `/api/subsidy/save` | member | Hesablamanı saxla (`subsidy_calculations`) |
| GET | `/api/subsidy/history` | member | Keçmiş hesablamalar |
| GET | `/api/subsidy/rates?year=2026` | FREE | Tam dərəcə cədvəli (şəffaflıq/export) |

**`/calculate` giriş nümunəsi:**
```json
{ "year":2026, "subsidy_type":"planting", "crop_group":"fruit_intensive",
  "crop":"hazelnut", "intensity":"intensive", "region_category":"other",
  "region_rayon":"Qusar", "irrigation":null, "planting_period":"new_2025_2026",
  "quantity_ha":3, "modifiers":{"boyuk_qayidis":false,"certified_seed":true,"soil_analysis":true},
  "field_id": null }
```

**`/calculate` çıxış nümunəsi:**
```json
{ "matched_rate": {"coefficient":15,"amount_per_unit":3000,"unit":"ha","label_az":"İntensiv fındıq bağları — dağ/dağətəyi, yeni salınan"},
  "quantity":3, "subtotal":9000, "modifiers_applied":[], "total_amount":9000, "currency":"AZN",
  "eligibility_ok": true,
  "warnings":[ "Minimum ting sıxlığı: 1 hektara ən azı 330 ədəd sertifikatlı ting olmalıdır.",
               "Fındıq əkin əmsalı yalnız təsdiqlənmiş rayonlarda tətbiq olunur (Qusar daxildir)." ],
  "notes_az":"Nəticə qeyri-rəsmidir; rəsmi hesablama EKTİS üzərindən aparılır." }
```

**Uyğunlaşdırma məntiqi (backend):** `subsidy_rates`-də `year + subsidy_type + crop_group + crop (+ intensity + region_category + irrigation + planting_period)` üzrə ən dəqiq uyğunluğu tap; birdən çox uyğunluqda ən spesifiki seç. Sonra modifikatorları (§30.5) tətbiq et; `conditions`/`min_area_ha`/`min_density_per_ha` pozulmalarını `warnings`-ə əlavə et.

---

## 30.7 UI spesifikasiyası

- **SubsidyCalculator komponenti:** addım-addım seçici ( tap-to-select düymələr; mobil-dostu ); hər addım əvvəlkinə görə filtrlənir. Nəticə kartı: **cəmi AZN** (böyük), əmsal, AZN/ha (və ya AZN/ton), miqdar, tətbiq olunan modifikatorlar, şərt/xəbərdarlıq siyahısı, mənbə linki + "qeyri-rəsmi" qeydi.
- **Sahə ilə inteqrasiya:** "Sahədən doldur" düyməsi — seçilmiş sahənin `area_ha`, ərazi (sentroid→rayon), əkin növü, suvarmasını avtomatik doldurur.
- **Saxla/Tarixçə:** hesablamanı `subsidy_calculations`-ə yaz; sahə səhifəsində göstər.
- **Şəffaflıq:** "Tam cədvələ bax" — `subsidy_rates` cədvəlini göstər (mənbə: agro.gov.az).
- Dil: Azərbaycan (i18n).

---

## 30.8 Data yenilənməsi (loader)

- **İlkin yükləmə:** bu sənəddəki seed (§30.4/30.5) `subsidy_years` + `subsidy_rates` + `subsidy_modifiers`-ə yüklənir; loader `amount_per_unit = coefficient × base_unit_rate` hesablayır.
- **İllik yeniləmə:** Şura hər il yeni əmsallar açıqlayır. n8n workflow (`subsidy_refresh`, ildə bir) mənbə səhifəni (agro.gov.az) yoxlayır/parse edir və yeni `year` üçün sətirlər əlavə edir; köhnə illər tarixçə kimi qalır. Parse mürəkkəbdirsə, seed manual yenilənir (bu sənəd tək həqiqət mənbəyi).

---

## 30.9 Funksional tələb və qəbul meyarı

**FR-21 — Subsidiya kalkulyatoru (FREE).** *Given* istifadəçi, *when* subsidiya növü, bitki, intensivlik/əkin növü, ərazi, suvarma və sahə/ton seçir, *then* sistem 2026 cədvəlindən uyğun dərəcəni tapıb (əmsal×200×miqdar) cəmi məbləği + tətbiq olunan modifikatorları + uyğunluq xəbərdarlıqlarını qaytarır; nəticə saxlanıla və sahəyə bağlana bilir. Mənbə datası DB-yə yüklənib və şəffaf göstərilir.

> **Yol xəritəsi:** əsas kalkulyator + seed = **Faza 1/2** (ucuz, yüksək cəlbedici, EKTİS-i tamamlayır). Hündürlük/EC/sığorta üzrə tam avtomatik uyğunluq yoxlaması = **Faza 3**.

---

## 30.10 Məhdudiyyətlər (caveats)

- **Qeyri-rəsmi:** kalkulyator məlumatlandırma məqsədlidir; **rəsmi hesablama və ödəniş EKTİS/eagro.az üzərindən** aparılır. UI-da bunu açıq göstər.
- **İllik dəyişkənlik:** əmsallar hər il Şura tərəfindən yenilənir — `year` konfiqu + illik seed vacibdir. Baza dərəcəsi (200) da dəyişə bilər.
- **Mürəkkəb uyğunluq:** bir çox bağ üçün əlavə şərtlər (hündürlük aralığı, torpaq EC ≤ 2.0/3.0 dS/m, min ting sıxlığı, dirək sistemi, damcı suvarma, sığorta, sertifikatlı ting) var — v1 bunları `conditions`-dan **xəbərdarlıq** kimi göstərir, tam avtomatik yoxlama sonrakı fazadadır.
- **Rayon uyğunluğu:** fındıq/sitrus/kivi/pambıq/tütün üçün əmsal yalnız təsdiqlənmiş rayonlarda >0; kalkulyator bunu tətbiq edir.
- **Toxum subsidiyası:** mənbədə toxum/ting əmsalları/kvotaları tam verilməyib — bu modul əkin/məhsul/dincə subsidiyalarını əhatə edir; toxum subsidiyası gələcək genişlənmədir.
- **Mənbə dəqiqliyi:** rəqəmlər 01.09.2025 tarixli qərara əsaslanır; istifadədən əvvəl agro.gov.az-dan cari versiyanı yoxla.
```
