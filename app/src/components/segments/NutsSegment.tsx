"use client";

// C6 — hazelnut / orchard segment landing page.
//
// Bağban AI's sharpest differentiator: the two best-known satellite farm tools are built for annual
// ROW CROPS (wheat, maize), while a hazelnut orchard is a PERENNIAL with a canopy that behaves very
// differently — and Azerbaijani nuts are not their focus. This page argues that case and grounds
// every capability claim in something the product genuinely ships:
//   * canopy NDVI / NDMI / NDRE over a perennial (peyk qatı)
//   * regional frost dates — last-spring p90 / first-autumn p10 over a 20-year archive (frost.py, B18)
//   * spray window + FAO-56 water balance + GDD heat accumulation (weather.py, field_gdd)
//   * wellness score (wellness.py), multi-season productivity zones (A6), yield + ledger P&L
//   * hazelnut-calibrated index norms + growth-stage thresholds (crop_thresholds crop_type='hazelnut')
// No invented statistics: the proof block is explicitly framed as an illustration ("nümunə").
//
// Self-contained (data + rendering here) so it lives entirely in the two files C6 owns. It mirrors
// the /solutions SolutionView visual language section for section. Client component for the FAQ
// accordion; copy is inline Azerbaijani (the T18 sweep extracts it to t() keys later).

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Camera,
  Check,
  Droplets,
  Gauge,
  Layers,
  Leaf,
  LineChart,
  Nut,
  Plus,
  Satellite,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  ThermometerSnowflake,
  Trees,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* --sh-sm from globals.css — the mockup's card shadow (Tailwind only tokens --sh / --sh-lg). */
const SH_SM = "shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]";
const CARD = `rounded-xl2 border border-line bg-panel ${SH_SM}`;

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-7 max-w-[660px] text-center">
      <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold leading-tight text-[color:var(--brand-ink)]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-[16.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------- data */

interface ValuePoint {
  icon: LucideIcon;
  title: string;
  body: string;
}
interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}
interface DeepBlock {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
}

const VALUE_POINTS: ValuePoint[] = [
  {
    icon: Leaf,
    title: "Çoxillik örtüyü sıravi əkin kimi deyil, bağ kimi oxuyur",
    body:
      "Fındıq bağı hər il əkilib-biçilmir — o, illər boyu yerində qalan bir örtükdür. Peyk indeksləri (NDVI canopy sıxlığı, NDMI/NDWI nəmlik, NDRE azot) həmin örtüyün içindəki fərqi göz onu seçməzdən əvvəl açır: suvarma xəttindəki tıxac, bir cərgənin zəifləməsi, xəstəlik ocağı hələ bir neçə ağac ikən xəritədə görünür.",
  },
  {
    icon: Snowflake,
    title: "Şaxta pəncərəsi — bağın ən böyük riski, rəqəmlə",
    body:
      "Erkən yaz və gec payız şaxtası çiçəyi və məhsulu bir gecədə apara bilər. Platforma bölgənizin son 20 ilin iqlim arxivindən yaz şaxtasının təhlükəsiz (p90) və payız şaxtasının erkən (p10) tarixlərini, şaxtasız günlərin sayını və ən soyuq gecələri hesablayır — hər rayon üçün bir dəfə, bütün üzvlərə pulsuz.",
  },
  {
    icon: ThermometerSnowflake,
    title: "Çiləmə vaxtı və istilik toplanması (GDD)",
    body:
      "7 günlük hava proqnozundan çiləmə üçün uyğun pəncərə seçilir, şaxta və isti dalğası üçün xəbərdarlıq verilir. İstilik vahidlərinin (GDD) toplanması isə tumurcuqlanmadan başlayır — zərərverici mərhələlərini və müdaxilə vaxtını təqvimdən deyil, real istidən asılı olaraq izləməyə imkan verir.",
  },
  {
    icon: Layers,
    title: "Bağ onilliklərlə qalır — zonalar da elə",
    body:
      "Bir neçə mövsümün peyk pikselləri üzərində hesablanmış davamlı güclü/zəif zonalar sıravi əkindən daha çox məhz çoxillik bağ üçün dəyərlidir: eyni ağaclar illərlə yerində qaldığı üçün hansı hissəyə daha çox gübrə, su və diqqət lazım olduğunu bir mövsüm yox, bütöv tarixçə göstərir.",
  },
  {
    icon: Nut,
    title: "Fındıq üçün ayrıca kalibr edilmiş",
    body:
      "Buğda və qarğıdalı üçün qurulmuş ümumi alətlərdən fərqli olaraq, burada fındıq üçün ayrıca indeks normaları və böyümə-mərhələsi hədləri yığılıb. Bu, Zaqatala, Şəki və Xudat bağlarında indeks qiymətinin şərhini — «bu NDVI bu mövsümdə yaxşıdır, yoxsa aşağıdır» — daha dəqiq edir.",
  },
];

const STATS: { value: string; label: string }[] = [
  { value: "20 il", label: "iqlim arxivi — şaxta tarixləri hər rayon üçün bundan hesablanır" },
  { value: "10 m", label: "Sentinel-2 piksel ölçüsü (NASA HLS 30 m ilə birlikdə örtük analizi)" },
  { value: "1 ay", label: "tam pulsuz giriş — kart lazım deyil, avtomatik ödəniş yoxdur" },
];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Bağı çək",
    body:
      "Xəritədə kəndinizi axtarın və bağınıza toxunun — sərhəd avtomatik tanınır. Əl ilə düzəldin və ya hazır shapefile (.zip) yükləyin. Hektar elə həmin anda hesablanır.",
  },
  {
    title: "Peyk arxivi açılsın",
    body:
      "Bağ yaradılan kimi emal növbəsinə düşür: son həftələrin səhnələri yüklənir, bulud və kölgə pikselləri maskalanır, hər indeks örtüyünüzün sərhədinə kəsilir. Proqres və gözlənilən vaxt ekranda görünür.",
  },
  {
    title: "Pəncərələri gör, AI-dan soruş",
    body:
      "Şaxta tarixləri, çiləmə pəncərəsi, GDD toplanması və örtük indeksləri bir yerdə. Şübhəli yarpağın şəklini çəkin — AI xəstəlik/zərərverici izini oxusun; anlamadığınız yeri söhbətdə soruşun.",
  },
  {
    title: "Məhsulu və qazancı izlə",
    body:
      "Yığımı və satışı qeyd edin, dərmandan sonra məhdudiyyət sayğacını izləyin, xərc və gəliri yazın — bağ-üzrə mənfəət mövsüm boyu, mövsüm sonu hesabatı isə hazır olur.",
  },
];

const FEATURES: Feature[] = [
  {
    icon: Satellite,
    title: "Örtük peyk monitorinqi",
    body:
      "NASA HLS 30 m və Sentinel-2 10 m səhnələri. NDVI (örtük sıxlığı), NDMI/NDWI (nəmlik), NDRE/CIre (azot), EVI, SAVI, NBR — bağınıza kəsilmiş rəngli raster, tarix zolağı və kontrast rejimi.",
  },
  {
    icon: Snowflake,
    title: "Bölgənin şaxta tarixləri",
    body:
      "Son yaz və ilk payız şaxtasının iqlim tarixləri, şaxtasız günlərin sayı və ən soyuq gecələr — 20 illik arxivdən, hər rayon üçün. Çiçəkləmə və yığım planlaşdırmanın təməli.",
  },
  {
    icon: Sun,
    title: "Çiləmə pəncərəsi",
    body:
      "7 günlük proqnozdan külək, yağış və temperatura görə çiləmə üçün uyğun saatlar. Şaxta və isti dalğası xəbərdarlığı ayrıca gəlir.",
  },
  {
    icon: Droplets,
    title: "Su balansı (FAO-56)",
    body:
      "Torpaq su ehtiyatı FAO-56 metodikası ilə: bağın nə vaxt və təxminən nə qədər suvarmağa ehtiyacı var. Quru dövr indeks düşüşü ilə üst-üstə düşəndə görünür.",
  },
  {
    icon: ThermometerSnowflake,
    title: "GDD — istilik toplanması",
    body:
      "İstilik vahidləri tumurcuqlanmadan toplanır. Zərərverici mərhələlərini və müdaxiləni təqvimə görə deyil, real istiyə görə vaxtlaşdırmağa kömək edir.",
  },
  {
    icon: Brain,
    title: "AI aqronom və söhbət",
    body:
      "Hər yeni peyk səhnəsindən sonra avtomatik analiz: risklər (şiddət dərəcəsi ilə), tövsiyələr, növbəti addımlar. Bağınızın kontekstini xatırlayan söhbətdə istədiyinizi soruşun.",
  },
  {
    icon: Camera,
    title: "Foto diaqnoz",
    body:
      "Yarpağın, fındığın, ağac gövdəsinin şəklini çəkin — AI xəstəlik və ya zərərverici izini oxuyub nə etməli olduğunuzu izah edir. Şəkillər bağ arxivində qalır.",
  },
  {
    icon: Layers,
    title: "Məhsuldarlıq zonaları",
    body:
      "Çox-mövsümlü peyk pikselləri üzərində davamlı güclü/orta/zəif zonalar. Onilliklərlə qalan bağda resursu doğru yerə yönəltməyin ən aydın yolu.",
  },
  {
    icon: Gauge,
    title: "Sağlamlıq balı — izahlı",
    body:
      "Bağın indeks, hava və qeyd məlumatından hesablanan 0–100 bal. Necə yığıldığı göstərilir; giriş çatmayanda uydurma rəqəm verilmir, çəkilər yenidən normallaşdırılır.",
  },
  {
    icon: TrendingUp,
    title: "Məhsuldarlıq izləmə",
    body:
      "Yığımı bağ və mövsüm üzrə qeyd edin; illər arası məhsuldarlıq mənzərəsi yaranır və birbaşa mənfəət hesabına düşür.",
  },
  {
    icon: Wallet,
    title: "Təsərrüfat dəftəri və mənfəət",
    body:
      "Gübrə, dərman, yanacaq, muzd bir tərəfdə; yığım və satış digər tərəfdə. Bağ-üzrə P&L, təşkilat üzrə cəm. Qəbzin şəklindən xərc qaralaması avtomatik doldurulur.",
  },
  {
    icon: LineChart,
    title: "Mövsüm müqayisəsi",
    body:
      "Eyni təqvim günündə keçən illə fərq, p10–p90 zolağı və trend. Örtüyün bu il keçən illərə nisbətən necə olduğunu bir baxışda göstərir.",
  },
];

const TWO_COL_LEFT: string[] = [
  "Sıravi əkin üçün qurulmuş alət örtüyün il-boyu davranışını «anlamır»",
  "Şaxta riski qulaqdan-qulağa və «keçən il belə olmuşdu» ilə idarə olunur",
  "Çiləmə vaxtı təqvimə görə seçilir, real istiyə və proqnoza görə yox",
  "Zəifləyən cərgəni ancaq bağa girəndə, çox vaxt yayılandan sonra görürsən",
  "Neçə ilin hansı zonasının davamlı zəif olduğu heç yerdə yazılmır",
  "Hansı bağ qazandırır, hansı zərər verir — mövsüm sonu təxmini",
];

const TWO_COL_RIGHT: string[] = [
  "Örtük NDVI/NDMI/NDRE bağı çoxillik kimi, il-boyu izləyir",
  "Şaxta tarixləri 20 illik arxivdən rəqəmlə gəlir — pəncərə planlaşdırılır",
  "Çiləmə pəncərəsi proqnoza, GDD isə real istiyə söykənir",
  "Zəifləyən zona xəritədə hələ kiçik ləkə ikən görünür",
  "Çox-mövsümlü zonalar davamlı güclü/zəif hissələri yadda saxlayır",
  "Hər xərc və gəlir bağa bağlıdır — mənfəət mövsüm boyu görünür",
];

const DEEP: DeepBlock[] = [
  {
    icon: Satellite,
    title: "Örtük peyk qatı",
    body:
      "İki mənbə birləşir: NASA HLS 30 m və Sentinel-2 10 m. Hər səhnədə bulud və kölgə maskalanır, indekslər yalnız bağınızın sərhədi daxilində hesablanır. Çoxillik örtük üçün önəmli olan orta rəqəm deyil — cərgələr arasındakı fərqi göstərən xəritədir.",
    bullets: [
      "Piksel-səviyyəli rəngli overlay — cərgə-cərgə fərq görünür",
      "NDVI sıxlıq, NDMI/NDWI nəmlik, NDRE/CIre azot göstəriciləri",
      "Tarix zolağı: hər səhnənin tarixi və bulud faizi",
      "Retrospektiv arxiv: köhnə mövsümləri sonradan doldurmaq",
    ],
  },
  {
    icon: Snowflake,
    title: "Şaxta və istilik qatı",
    body:
      "Şaxta çoxillik bağın ən böyük riskidir. Bölgənin 20 illik Open-Meteo arxivindən son yaz və ilk payız şaxtasının təhlükəsiz tarixləri hesablanır; nəticə rayon üzrə paylaşılan bilik blokunda saxlanır ki, hər bağ təkrar hesablamadan istifadə etsin.",
    bullets: [
      "Yaz şaxtası p90 (təhlükəsiz), payız şaxtası p10 (erkən)",
      "Şaxtasız günlərin sayı və ən soyuq gecələr",
      "GDD toplanmasının başlanğıcı median son şaxtaya bağlanır",
      "Çiləmə pəncərəsi 7 günlük proqnozdan seçilir",
    ],
  },
  {
    icon: Wallet,
    title: "Məhsul və iqtisadiyyat qatı",
    body:
      "Bağ investisiyadır: bu il əkilib növbəti il çıxmır, illərlə bəhrə verir. Ona görə yığım, satış, xərc və zonalar bir yerə bağlanır — hansı bağın, hansı zonanın illər boyu qazandırdığı görünən olur.",
    bullets: [
      "Bağ-üzrə və təşkilat-üzrə xərc/gəlir",
      "İllər arası məhsuldarlıq (yield) mənzərəsi",
      "Qəbz şəklindən avtomatik xərc qaralaması",
      "Yığım məhdudiyyəti sayğacı dərmandan sonra avtomatik başlayır",
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Nə üçün ümumi peyk alətləri fındıq bağı üçün zəifdir?",
    a:
      "Ən tanınmış peyk-monitorinq platformaları sıravi birillik əkinlər — buğda, qarğıdalı, günəbaxan — üçün qurulub və çoxillik fındıq bağı, xüsusən Azərbaycan bağları onların diqqət mərkəzində deyil. Çoxillik örtük il-boyu yerində qalır, indeksləri fərqli oxunur, ən böyük riski isə şaxtadır. Bağban AI məhz bunun üçün qurulub: örtük indeksləri, bölgə şaxta tarixləri, GDD və fındıq üçün ayrıca kalibrlənmiş normalar.",
  },
  {
    q: "Şaxta tarixləri necə hesablanır?",
    a:
      "Bağınızın rayonu üçün son 20 ilin iqlim arxivindən son yaz şaxtasının təhlükəsiz (p90) və ilk payız şaxtasının erkən (p10) tarixləri, şaxtasız günlərin sayı və ən soyuq gecələr hesablanır. Nəticə rayon üzrə bir dəfə hesablanıb paylaşılır və bütün üzvlərə pulsuzdur.",
  },
  {
    q: "«Örtük NDVI» nə deməkdir?",
    a:
      "NDVI yaşıl örtüyün sıxlığını və canlılığını göstərir. Fındıq bağında bu, ağac çətirlərinin vəziyyətini əks etdirir: bir cərgə zəifləyəndə, suvarma çatmayanda və ya xəstəlik ocağı yaranmanda həmin hissədə NDVI düşür və xəritədə ləkə kimi görünür — çox vaxt gözlə görünməzdən əvvəl.",
  },
  {
    q: "Fındıqdan başqa bağ məhsulları üçün uyğundurmu?",
    a:
      "Bəli. Fındıq üçün ayrıca normalar yığılsa da, örtük indeksləri, şaxta tarixləri, su balansı, GDD, dəftər və AI istənilən bağ və ya ağac əkini üçün işləyir. Üzüm üçün də ayrıca normalar var; digər məhsullar da tam izlənir.",
  },
  {
    q: "Başlamaq üçün data yükləməliyəm?",
    a:
      "Xeyr. Xəritədə kəndinizi axtarıb bağınıza toxunmaq kifayətdir — sərhəd avtomatik tanınır və istəsəniz əl ilə düzəldilir. Əlinizdə shapefile (.zip) varsa onu da yükləyə bilərsiniz. Heç bir GIS proqramı və ya koordinat cədvəli lazım deyil.",
  },
  {
    q: "Neçəyə başa gəlir?",
    a:
      "İlk 1 ay bütün funksiyalar pulsuzdur — kart məlumatı istənilmir və sınaq bitəndə avtomatik pul çıxılmır. Sonra pulsuz paketdə qala, yaxud Paket 2 (10 AZN/ay) və Paket 3 (25 AZN/ay) seçə bilərsiniz. Tam müqayisə Qiymətlər səhifəsindədir.",
  },
  {
    q: "AI səhv desə nə olacaq?",
    a:
      "AI aqronom məsləhət verir, qərar sizindir — hər cavabın altında bu barədə xəbərdarlıq var. Model əmin olmayanda dəqiqləşdirici sual verir və cavabın nəyə əsaslandığını göstərir. Ciddi hallarda kataloqdakı laboratoriya və ya aqronomla əlaqə tövsiyə olunur.",
  },
];

/* ------------------------------------------------------------- hero visual
 * A static, clearly-labelled orchard preview. Stands in for a screenshot; nothing here is
 * presented as live data or a real customer.
 */
function OrchardVisual() {
  return (
    <div className="relative h-full min-h-[340px] w-full">
      <span className="absolute right-3 top-3 z-10 rounded-full bg-panel/90 px-2.5 py-1 text-[11px] font-bold text-[color:var(--brand-muted)] shadow-sm">
        nümunə
      </span>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(125deg,var(--ndvi-5) 0%,var(--ndvi-4) 32%,var(--ndvi-3) 56%,var(--ndvi-4) 78%,var(--ndvi-5) 100%)",
        }}
        aria-hidden="true"
      />
      {/* orchard "rows" — a hint of a planted canopy grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.16) 0 3px, transparent 3px 22px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute left-[15%] top-[18%] h-[46%] w-[52%] rounded-[10px] border-2 border-white/80"
        style={{ background: "rgba(255,255,255,0.08)" }}
        aria-hidden="true"
      />
      <div className="absolute left-3 top-3 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-muted)]">
          Örtük NDVI
        </p>
        <p className="font-display text-xl font-bold text-[color:var(--brand-ink)]">0.71</p>
      </div>
      <div className="absolute right-3 top-14 flex items-center gap-2 rounded-xl bg-panel/95 px-3 py-2 shadow-sm">
        <Snowflake className="h-4 w-4 text-sky-600" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[color:var(--brand-ink-2)]">
          Son yaz şaxtası ~5 aprel
        </span>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-panel p-3 shadow-soft sm:left-auto sm:right-3 sm:max-w-[268px]">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--green)]">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" /> AI Aqronom
        </p>
        <p className="text-[12.5px] leading-snug text-[color:var(--brand-ink-2)]">
          Şimal cərgələrdə nəmlik düşüb — suvarma pəncərəsi açıqdır, çiləmə üçün cümə uyğundur.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function NutsSegment() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ------------------------------------------------------------ hero */}
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ecdcb0] bg-[#fff4d6] px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[#8a5f08]">
            <Sprout className="h-4 w-4" aria-hidden="true" />
            1 ay pulsuz · kart lazım deyil
          </span>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
            <Nut className="h-4 w-4" aria-hidden="true" />
            fındıq və bağ təsərrüfatları üçün
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,46px)] font-bold leading-[1.08] text-[color:var(--brand-ink)]">
            Rəqiblərin ikisi də fındığı dəstəkləmir. Biz məhz bunun üçün qurulmuşuq.
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
            Ən tanınmış iki peyk-monitorinq platforması sıravi birillik əkinlər üçün qurulub — çoxillik
            fındıq bağı onların diqqət mərkəzində deyil. Bağban AI isə çətirin özünü izləyir: örtük
            NDVI/NDMI, bölgənin şaxta tarixləri, çiləmə pəncərəsi, GDD və fındıq üçün ayrıca kalibrlənmiş
            normalar — hamısı bir telefonda, Azərbaycan dilində. Zaqatala, Şəki, Xudat bağları üçün.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[color:var(--green)] px-6 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(30,152,82,0.28)] transition-colors hover:bg-grass-deep"
            >
              1 ay pulsuz başla
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-line-2 px-6 text-[15px] font-bold text-[color:var(--brand-ink)] transition-colors hover:border-[color:var(--brand-ink)]"
            >
              Qiymətlərə bax
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl2 border border-line-2 bg-panel shadow-lift">
          <OrchardVisual />
        </div>
      </section>

      {/* ------------------------------------------------- differentiator */}
      <section className="py-6">
        <div className={`overflow-hidden rounded-xl2 border-[1.5px] border-line ${SH_SM}`}>
          <div className="border-b border-line bg-teal px-6 py-5">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#9dc6b3]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Fərq nədədir
            </p>
            <h2 className="mt-1.5 font-display text-[clamp(20px,2.6vw,28px)] font-bold leading-snug text-white">
              Sıravi əkin üçün alət ilə çoxillik bağ üçün qurulmuş platforma eyni şey deyil.
            </h2>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {[
              {
                icon: Trees,
                title: "Çoxillik örtük",
                body:
                  "Bağ il-boyu yerində qalır; indeks örtüyün özünü, cərgə-cərgə fərqi izləyir — bir mövsümlük əkin məntiqi ilə yox.",
              },
              {
                icon: Snowflake,
                title: "Şaxta birinci risk",
                body:
                  "Çiçəyi və məhsulu bir gecədə aparan şaxta 20 illik arxivdən rəqəmlə gəlir — bağçılıq üçün ən vacib məlumat.",
              },
              {
                icon: Nut,
                title: "Fındıq üçün kalibr",
                body:
                  "İndeks normaları və mərhələ hədləri məhz fındıq üçün yığılıb — «bu göstərici yaxşıdır, yoxsa aşağı» sualına düzgün cavab verir.",
              },
            ].map((c) => (
              <div key={c.title} className="bg-panel p-6">
                <span
                  className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">{c.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- value points */}
      <section className="py-10">
        <SectionHead
          title="Fındıq bağçısı üçün niyə fərqlidir"
          sub="Beş səbəb — hər biri çoxillik bağın gündəlik işində birbaşa qarşılığı olan şey, ekranda gözəl qrafik deyil."
        />
        <ol className="grid gap-4 lg:grid-cols-2">
          {VALUE_POINTS.map((p, i) => (
            <li key={p.title} className={`${CARD} flex gap-4 p-5`}>
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                aria-hidden="true"
              >
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-[16.5px] font-bold text-[color:var(--brand-ink)]">
                  <span className="mr-1.5 text-[color:var(--green)]">{i + 1}.</span>
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------- stats band */}
      <section className="py-6">
        <div className="grid gap-3.5 lg:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className={`rounded-xl2 bg-teal p-6 text-center ${SH_SM}`}>
              <b className="block font-display text-[32px] font-bold leading-none text-white">{s.value}</b>
              <span className="mt-2 block text-[13px] leading-snug text-[#9dc6b3]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- steps */}
      <section className="scroll-mt-24 py-10" id="nece-isleyir">
        <SectionHead
          title="4 addımda dəyər"
          sub="Nə GIS bilgisi, nə cədvəl, nə də kağız. Qeydiyyatdan ilk peyk xəritənizə qədər adətən bir çay fasiləsi kifayətdir."
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`${CARD} p-5`}>
              <span
                className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--green)] font-extrabold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-[15.5px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section className="py-10">
        <SectionHead
          title="Fındıq bağına lazım olan hər şey — bir yerdə"
          sub="Ayrı-ayrı proqramlar və dəftərçələr əvəzinə tək platforma. Hər modul digərini qidalandırır: dəftərə yazdığınız hər əməliyyat AI-nin cavabını dəqiqləşdirir."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`${CARD} p-5`}>
              <span
                className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                aria-hidden="true"
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-base font-bold text-[color:var(--brand-ink)]">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- two-col */}
      <section className="py-10">
        <SectionHead
          title="Əvvəl və sonra"
          sub="Eyni bağ, eyni adamlar — fərq yalnız məlumatın nə vaxt və hansı formada əlinizə çatmasındadır."
        />
        <div className={`grid overflow-hidden rounded-xl2 border border-line lg:grid-cols-2 ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 p-6 lg:border-b-0 lg:border-r">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              Ümumi əkin aləti (və ya dəftərçə) ilə
            </h3>
            <ul className="grid gap-2.5">
              {TWO_COL_LEFT.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--red-soft)] text-[color:var(--brand-red)]"
                    aria-hidden="true"
                  >
                    <X className="h-3 w-3" />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-panel p-6">
            <h3 className="mb-3.5 font-display text-base font-bold text-[color:var(--brand-ink)]">
              Bağban AI ilə
            </h3>
            <ul className="grid gap-2.5">
              {TWO_COL_RIGHT.map((it) => (
                <li key={it} className="flex gap-2.5 text-sm text-[color:var(--brand-ink-2)]">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- proof */}
      <section className="py-10">
        <div className={`overflow-hidden rounded-xl2 border border-line bg-panel ${SH_SM}`}>
          <div className="border-b border-line bg-panel-2 px-5 py-3">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-[color:var(--brand-muted)]">
              Nümunə ssenari — illüstrasiya, ölçülmüş nəticə deyil
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-display text-[clamp(20px,2.4vw,27px)] font-bold text-[color:var(--brand-ink)]">
              Zaqatalada 8 hektarlıq fındıq bağında bir mövsüm
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
              Aşağıdakı ardıcıllıq platformanın real axınıdır: hansı məlumat nə vaxt gəlir və bağçı hansı
              addımı atır. Tarix və rəqəmlər izah üçün seçilib — sizin bağınızda fərqli olacaq.
            </p>
            <ol className="mt-6 space-y-4 border-l-2 border-line pl-5">
              {[
                {
                  when: "Erkən yaz",
                  what:
                    "Şaxta tarixləri açılır: son yaz şaxtasının təhlükəsiz tarixi ~5 aprel, GDD toplanması həmin tarixdən başlayır. Çiçəkləmə planı buna görə qurulur.",
                },
                {
                  when: "May",
                  what:
                    "Yeni Sentinel-2 səhnəsi düşür. Bağın şimal cərgələrində NDMI (nəmlik) qonşu zonalardan aşağıdır; su balansı da eyni yerdə quru dövr göstərir.",
                },
                {
                  when: "May, 10 dəqiqə sonra",
                  what:
                    "AI analizi hazırdır: ehtimal olunan səbəblər arasında suvarma çatışmazlığı göstərilir, çiləmə üçün proqnozdan uyğun pəncərə təklif olunur, yoxlama addımları verilir.",
                },
                {
                  when: "İyul",
                  what:
                    "Bağçı şübhəli yarpaqların şəklini çəkir; foto diaqnoz zərərverici izini oxuyur. Əməliyyat qeyd edilir, yığım məhdudiyyəti sayğacı avtomatik başlayır.",
                },
                {
                  when: "Payız",
                  what:
                    "Yığım bağ üzrə qeyd olunur, satış və xərclər dəftərə düşür. İlk payız şaxtasından əvvəl mövsüm bağlanır; bağ-üzrə mənfəət və mövsüm müqayisəsi hesabatda görünür.",
                },
              ].map((t) => (
                <li key={t.when} className="relative">
                  <span
                    className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-panel bg-[color:var(--green)]"
                    aria-hidden="true"
                  />
                  <p className="text-[13px] font-bold uppercase tracking-wide text-[color:var(--green)]">
                    {t.when}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{t.what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-xl bg-panel-2 p-4 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
              Platforma diaqnoz qoymur və aqronomu əvəz etmir — o, sizin gördüyünüzü genişləndirir və
              qərarı əsaslandırır. Bütün AI cavabları məsləhət xarakterlidir.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- deep dive */}
      <section className="py-10">
        <SectionHead
          title="Necə işləyir — dərinliyə baxış"
          sub="Səthdə sadə görünən şeyin altında ciddi emal var. Çoxillik bağ üçün ən vacib üç qat."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {DEEP.map((d) => (
            <div key={d.title} className={`${CARD} p-6`}>
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                  aria-hidden="true"
                >
                  <d.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">{d.title}</h3>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{d.body}</p>
              <ul className="mt-4 grid gap-2">
                {d.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[13.5px] text-[color:var(--brand-ink-2)]">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- pricing note */}
      <section className="py-4">
        <div className="flex flex-col gap-4 rounded-xl2 border-[1.5px] border-[#bfe6cd] bg-mint-soft p-6 sm:flex-row sm:items-center">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel text-grass-deep"
            aria-hidden="true"
          >
            <Wallet className="h-5 w-5" />
          </span>
          <p className="flex-1 text-[14.5px] leading-relaxed text-grass-deep">
            Qiymət yalnız fermerlərə aiddir. İlk 1 ay bütün funksiyalar pulsuzdur — kart lazım deyil,
            avtomatik ödəniş yoxdur. Sonra pulsuz paketdə qalmaq, yaxud Paket 2 (10 AZN/ay) və Paket 3
            (25 AZN/ay) seçmək sizin ixtiyarınızdadır. Laboratoriya, aqronom və təchizatçılar üçün
            platforma tam pulsuzdur.
          </p>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-grass-deep px-5 text-sm font-bold text-grass-deep transition-colors hover:bg-panel"
          >
            Paketlərə bax
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section className="scroll-mt-24 py-10" id="suallar">
        <SectionHead title="Fındıq bağçılarının sualları" />
        <div className="mx-auto max-w-[760px]">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`nut-faq-a-${i}`}
                  className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[16.5px] font-semibold text-[color:var(--brand-ink)]">{item.q}</span>
                  <Plus
                    className={`h-5 w-5 shrink-0 text-[color:var(--brand-muted)] transition-transform duration-200 motion-reduce:transition-none ${
                      open ? "rotate-45" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`nut-faq-a-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-4 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------- final CTA */}
      <section className="py-8">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            Fındıq bağını bu gün peykdən izləməyə başla
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            1 ay pulsuz · kart lazım deyil · istənilən vaxt dayandır
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
          >
            1 ay pulsuz başla
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- other roles */}
      <section className="pb-4">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-muted)]">
          bütün həllər
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/solutions"
            className={`${CARD} inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-[color:var(--brand-ink)] transition-colors hover:border-line-2`}
          >
            <Leaf className="h-4 w-4 text-grass-deep" aria-hidden="true" />
            Fermer, laboratoriya, aqronom və təchizatçı həlləri
            <ArrowRight className="h-4 w-4 text-[color:var(--brand-muted)]" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
