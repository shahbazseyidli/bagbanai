// C8 — "Necə başlamalı" bələdçi mərkəzinin məzmunu.
//
// Pure data, no React: the /guide index (a Server Component) and /guide/[slug] (a Server
// Component) import it for metadata and rendering. Icons are string keys resolved to lucide
// components inside the page files so this module stays framework-free.
//
// Honesty rules baked in:
//  * every step maps to something the product actually ships today (peyk overlay, AI advice,
//    ledger, reports, share link, soil-analysis OCR). No invented buttons or fake numbers.
//  * the "screen" field is a described mock — plain text the page renders in a faux-UI box; no
//    external images are referenced (the CSP and offline-first PWA forbid remote assets).
//
// UI copy is inline Azerbaijani; the T18 i18n sweep extracts it to t() keys later.

import type { Locale } from "@/lib/i18n";
import { localize } from "@/lib/contentI18n";

export type GuideIcon =
  | "map-pin"
  | "satellite"
  | "brain"
  | "clipboard"
  | "sprout"
  | "file-text"
  | "flask";

export interface GuideStep {
  /** Short imperative step title. */
  title: string;
  /** 1–3 sentence explanation. */
  body: string;
  /** Optional described "screenshot" — rendered as a captioned faux-UI box, never an image. */
  screen?: string;
}

export interface Guide {
  slug: string;
  /** Card + article title. */
  title: string;
  /** One line under the title on the hub cards. */
  summary: string;
  icon: GuideIcon;
  /** e.g. "5 addım · ~2 dəq". */
  meta: string;
  /** Opening paragraph of the article. */
  intro: string;
  /** Where in the app this lives — rendered as a small "yol" chip. */
  where: string;
  steps: GuideStep[];
  /** Practical extras — rendered as an "İpucu" list. */
  tips: string[];
  /** Other guide slugs to cross-link at the bottom. */
  related: string[];
}

/* ------------------------------------------------------------ 1. sahə əlavə */

const saheElaveEt: Guide = {
  slug: "sahe-elave-et",
  title: "Sahə əlavə etmək",
  summary: "Xəritədə bir toxunuşla tarlanı qeyd et — koordinat və ya GIS lazım deyil.",
  icon: "map-pin",
  meta: "5 addım · ~2 dəq",
  intro:
    "Platformada hər şey sahədən başlayır. Sahəni qeyd etmək üçün nə kadastr sənədi, nə koordinat cədvəli, nə də GIS proqramı lazımdır — xəritədə kəndinizi tapıb tarlanıza toxunmaq kifayətdir. Sərhəd avtomatik tanınır, hektar həmin anda hesablanır, peyk arxivi isə arxa planda yüklənməyə başlayır.",
  where: "Sahələr → «Yeni sahə» (+ düyməsi)",
  steps: [
    {
      title: "Xəritəni aç",
      body:
        "Aşağı naviqasiyada «Sahələr»ə keçin və sağ aşağıdakı «+» düyməsinə basın. Tam ekran xəritə açılır.",
      screen: "Ekran: peyk xəritəsi + aşağıda «Sahələr / Bu gün / İşlər» zolağı, sağ altda yaşıl «+».",
    },
    {
      title: "Kəndini axtar",
      body:
        "Yuxarıdakı axtarış xanasına kəndin və ya rayonun adını yazın. Xəritə həmin əraziyə tullanır. İstəsəniz iki barmaqla yaxınlaşdırın.",
      screen: "Ekran: yuxarıda «Axtar…» xanası, altında peyk görüntüsü tarlaların konturu ilə.",
    },
    {
      title: "Tarlana toxun",
      body:
        "Öz tarlanızın içinə bir dəfə toxunun — sistem peyk şəklindən sərhədi özü tanıyır və sarı xətlə çəkir. Sərhəd tam düz deyilsə, künc nöqtələrini barmaqla sürüşdürüb düzəldin.",
      screen: "Ekran: tarlanın ətrafında sarı sərhəd, künclərdə tutulası nöqtələr, altda «Sahə: 3.2 ha».",
    },
    {
      title: "Məhsulu seç və adlandır",
      body:
        "Sahəyə ad verin (məsələn «Şimal fındıq bağı») və məhsulu seçin. Fındıq, taxıl, üzüm və bağ məhsulları üçün xüsusi normalar var — bu, indeks qiymətlərinin şərhini dəqiqləşdirir.",
    },
    {
      title: "Yadda saxla və gözlə",
      body:
        "«Yadda saxla»dan sonra sahə emal növbəsinə düşür. «Peyk məlumatı hazırlanır…» banneri proqres və təxmini vaxtı göstərir; hazır olanda bildiriş gəlir.",
      screen: "Ekran: «Peyk məlumatı hazırlanır… 40%» proqres zolağı və «təxminən 3 dəq» yazısı.",
    },
  ],
  tips: [
    "Əlinizdə hazır sərhəd faylı (shapefile .zip) varsa, çəkmək əvəzinə onu yükləyə bilərsiniz.",
    "Bir neçə tarlanız varsa, hər birini ayrıca sahə kimi qeyd edin — analiz və mənfəət sahə-sahə hesablanır.",
    "Sərhədi sonradan da redaktə etmək olar; hektar avtomatik yenilənir.",
  ],
  related: ["peyk-melumatini-oxu", "ai-meslehetini-islet"],
};

/* ------------------------------------------------------------ 2. peyk oxu */

const peykOxu: Guide = {
  slug: "peyk-melumatini-oxu",
  title: "Peyk məlumatını oxumaq",
  summary: "Rəngli indeks xəritəsini, tarix zolağını və legendanı anla.",
  icon: "satellite",
  meta: "6 addım · ~3 dəq",
  intro:
    "Peyk qatı sahənizin içindəki fərqi göz onu seçməzdən əvvəl açır. İki mənbə birləşdirilir: NASA HLS 30 metr və Sentinel-2 10 metr piksellə. Hər səhnədə bulud və kölgə pikselləri maskalanır, indekslər isə yalnız sizin sərhədiniz daxilində hesablanır. Aşağıda bu xəritəni necə oxumaq göstərilir.",
  where: "Sahə → «Baxış» tab",
  steps: [
    {
      title: "Sahəni aç",
      body:
        "Siyahıdan sahəyə toxunun və «Baxış» tabında qalın. Sahənizin üstündə rəngli peyk qatı görünür.",
    },
    {
      title: "İndeksi seç",
      body:
        "Yuxarıdakı çiplərdən indeks seçin: NDVI (bitki sıxlığı), NDMI (nəmlik), NDRE/CIre (azot), NDWI (su) və başqaları. Hər indeks fərqli sual cavablandırır.",
      screen: "Ekran: «NDVI · NDMI · NDRE · EVI · NDWI» çipləri, seçilmiş olan yaşıl fon ilə.",
    },
    {
      title: "Legendanı oxu",
      body:
        "Rəng zolağı bitki indeksləri üçün Zəif → Orta → Sağlam, su indeksləri üçün isə Quru → Orta → Nəm kimi işarələnir. Qırmızıya yaxın zona diqqət tələb edir.",
      screen: "Ekran: aşağıda üfüqi rəng zolağı — qırmızı «Zəif», sarı «Orta», yaşıl «Sağlam».",
    },
    {
      title: "Xəritədəki ləkələri tap",
      body:
        "Rəng orta rəqəm deyil — piksel-səviyyəli xəritədir. Bir küncdə qırmızı ləkə görsəniz, problem (suvarma tıxacı, azot çatışmazlığı, xəstəlik ocağı) məhz orada başlayır.",
    },
    {
      title: "Tarix zolağını sürüşdür",
      body:
        "Aşağıdakı tarix zolağında hər səhnənin tarixi və bulud faizi göstərilir. Keçmiş səhnələr arasında sürüşərək vəziyyətin necə dəyişdiyini izləyin.",
      screen: "Ekran: tarix zolağı — «11 İyul · 4% bulud», «6 İyul · 22% bulud» nöqtələri.",
    },
    {
      title: "Sensoru və kontrastı dəyiş",
      body:
        "Daha incə görüntü üçün Sentinel-2 (10 m), daha geniş arxiv üçün NASA HLS (30 m) seçin. «Kontrast» rejimi zəif fərqləri gözə görünən edir. Keçən illə müqayisə də buradadır.",
    },
  ],
  tips: [
    "Bulud faizi yüksək səhnələr etibarsızdır — sistem bulud/kölgə piksellərini onsuz da hesablamadan çıxarır.",
    "NDMI (nəmlik) NDVI ilə eyni yerdə düşürsə, çox vaxt söhbət suvarmadan gedir.",
    "Data qənaəti rejimi ağır plitələri söndürür; kənddə internet zəif olanda faydalıdır.",
  ],
  related: ["ai-meslehetini-islet", "sahe-elave-et"],
};

/* ------------------------------------------------------------ 3. AI məsləhət */

const aiMeslehet: Guide = {
  slug: "ai-meslehetini-islet",
  title: "AI aqronom məsləhətini işlətmək",
  summary: "Hazır analizi oxu, söhbətdə soruş, şübhəli yarpağı foto ilə tanıt.",
  icon: "brain",
  meta: "5 addım · ~3 dəq",
  intro:
    "AI aqronom boş yerdən danışmır: sahənizin son peyk oxunuşları, hava tarixçəsi, torpaq profili, əkin tarixi, əməliyyat jurnalı və çəkdiyiniz şəkillər ona kontekst kimi verilir. Nəticə ümumi məsləhət deyil — məhz sizin sahənizin bu həftəki vəziyyəti üçün risklər, tövsiyələr və növbəti addımlardır. Qərar həmişə sizindir; hər cavabın altında bu barədə xəbərdarlıq var.",
  where: "Sahə → «AI Məsləhət» tab",
  steps: [
    {
      title: "«AI Məsləhət» tabını aç",
      body:
        "Sahənin içində «AI Məsləhət» tabına keçin. Hər yeni peyk səhnəsindən sonra analiz avtomatik yenilənir, ona görə adətən hazır kart sizi gözləyir.",
    },
    {
      title: "Məsləhət kartını oxu",
      body:
        "Kartda üç blok var: risklər (hər biri aşağı/orta/yüksək şiddət nişanı ilə), tövsiyələr və növbəti addımlar. Yüksək şiddətli riskə birinci baxın.",
      screen: "Ekran: «Risklər» başlığı, altında qırmızı «yüksək» nişanlı sətir və izahı.",
    },
    {
      title: "Söhbətdə soruş",
      body:
        "Anlamadığınız yer varsa aşağıdakı söhbətdə sual verin — məsələn «bu zonada nə edim?». Söhbət sahənizin kontekstini və son 12 növbəni xatırlayır.",
      screen: "Ekran: söhbət xanası «Sualınızı yazın…» və «Göndər» düyməsi.",
    },
    {
      title: "Şübhəli yarpağı foto çək",
      body:
        "Yarpağın, meyvənin və ya torpağın şəklini çəkin. AI xəstəlik/zərərverici izini oxuyur və nə etməli olduğunuzu izah edir. Şəkil sahənin arxivində qalır.",
    },
    {
      title: "Lazım olsa yenidən analiz et",
      body:
        "Vəziyyət dəyişibsə «Yenidən analiz et» düyməsi ilə yeni məsləhət alın. Oxumaq çətindirsə, «Səsləndir» düyməsi ilə dinləyin.",
    },
  ],
  tips: [
    "AI diaqnoz qoymur və aqronomu əvəz etmir — o, sizin gördüyünüzü genişləndirir. Ciddi hallarda kataloqdakı laboratoriya və ya aqronomla əlaqə saxlayın.",
    "Model əmin olmayanda dəqiqləşdirici sual verir — cavablayın ki, tövsiyə dəqiqləşsin.",
    "Dəftərə yazdığınız hər əməliyyat növbəti analizi daha dəqiq edir.",
  ],
  related: ["peyk-melumatini-oxu", "is-ve-emeliyyat-qeyd-et"],
};

/* ------------------------------------------------ 4. tapşırıq / əməliyyat */

const isVeEmeliyyat: Guide = {
  slug: "is-ve-emeliyyat-qeyd-et",
  title: "Tapşırıq və əməliyyat qeyd etmək",
  summary: "İşi planla, çiləmə/gübrələməni yaz, yığım məhdudiyyətini izlə.",
  icon: "clipboard",
  meta: "5 addım · ~2 dəq",
  intro:
    "Təsərrüfat dəftəri sahənin yaddaşıdır. Yazdığınız hər əməliyyat həm mövsüm hesabatına, həm də AI-nin növbəti cavabına daxil olur. «İşlər» bölməsi tapşırıqları (görüləcək), əməliyyatları (görülmüş) və yığımı bir yerə toplayır.",
  where: "Sahə → «İşlər» tab",
  steps: [
    {
      title: "«İşlər» tabını aç",
      body:
        "Sahənin içində «İşlər» tabına keçin. Yuxarıda «Tapşırıqlar · Əməliyyatlar · Yığım» çipləri var.",
      screen: "Ekran: üç çip — «Tapşırıqlar», «Əməliyyatlar», «Yığım» və altında siyahı.",
    },
    {
      title: "Tapşırıq əlavə et",
      body:
        "«Tapşırıqlar» çipində yeni iş yaradın: nə, hansı sahə, hansı tarix. Əkin tarixindən avtomatik tapşırıq zənciri də qurula bilər.",
    },
    {
      title: "Əməliyyatı qeyd et",
      body:
        "İşi görəndə «Əməliyyatlar»a keçin: çiləmə, gübrələmə, suvarma, becərmə. Preparatı, dozanı və tarixi yazın — hamısı xərcə də düşür.",
      screen: "Ekran: «Əməliyyat növü: Çiləmə», «Preparat», «Doza», «Tarix» sahələri.",
    },
    {
      title: "Yığım məhdudiyyətini izlə",
      body:
        "Çilədikdən sonra yığıma qədər gözləmə müddəti (PHI) sayğacı avtomatik başlayır. Müddət bitməmiş yığımdan çəkindirən xəbərdarlıq görünür.",
      screen: "Ekran: «Yığıma icazə: 6 gün sonra» sarı xəbərdarlıq zolağı.",
    },
    {
      title: "Yığımı qeyd et",
      body:
        "Məhsul yığılanda «Yığım» çipində miqdarı, tarixi və (varsa) lot kodunu yazın. Bu, sahə-üzrə mənfəət hesabına gedir.",
    },
  ],
  tips: [
    "Tapşırıqları təqvim faylı kimi ixrac edib aqronom və ya işçi ilə paylaşa bilərsiniz.",
    "Qəbzin şəklini çəksəniz, sistem xərc qaralamasını özü doldurur.",
    "Anbar qalığı əməliyyatdan avtomatik çıxılır və azalanda xəbərdarlıq gəlir.",
  ],
  related: ["gubre-plani", "hesabat-al"],
};

/* ------------------------------------------------------------ 5. gübrə planı */

const gubrePlani: Guide = {
  slug: "gubre-plani",
  title: "Gübrə planı qurmaq",
  summary: "Qrafiki yaz, NDVI trendinə görə AI doza təklifini al.",
  icon: "sprout",
  meta: "4 addım · ~2 dəq",
  intro:
    "Gübrə modulu tətbiq qrafikinizi saxlayır və hər tətbiqi həm dəftərə, həm də xərcə bağlayır. AI doza təklifi isə boş rəqəm deyil — NDVI trendi, məhsul normaları və (yükləmisinizsə) laboratoriya analizinə söykənir.",
  where: "Daha çox → «Gübrə»",
  steps: [
    {
      title: "Gübrə modulunu aç",
      body:
        "Aşağı naviqasiyada «Daha çox»dan «Gübrə»yə keçin və sahəni seçin.",
    },
    {
      title: "Cari qrafiki yaz",
      body:
        "Planladığınız gübrələri əlavə edin: növ (azot, fosfor, kalium…), tarix və doza. Qrafik mövsüm boyu görünür.",
      screen: "Ekran: «Gübrə: Azot», «Tarix», «Doza (kq/ha)» sətirləri və «Əlavə et».",
    },
    {
      title: "AI doza təklifini al",
      body:
        "«Doza təklifi» düyməsi NDVI trendini, məhsul normalarını və torpaq göstəricilərini nəzərə alaraq təxmini doza aralığı verir. Bu, məsləhətdir — son qərar sizindir.",
      screen: "Ekran: «Təklif olunan doza: 60–80 kq/ha azot» kartı və izah.",
    },
    {
      title: "Tətbiqi qeyd et",
      body:
        "Gübrəni tətbiq edəndə onu qeyd edin. Tətbiq həm əməliyyat jurnalına, həm də xərc dəftərinə düşür — mövsüm sonu hesabatda görünəcək.",
    },
  ],
  tips: [
    "Torpaq analizini yükləsəniz, doza təklifi sizin ölçülmüş göstəricilərinizə söykənir və daha dəqiq olur.",
    "Gübrə xərci sahə-üzrə mənfəət hesabına avtomatik daxildir.",
    "NDRE/CIre indeksi azot vəziyyətini NDVI-dən daha həssas göstərir.",
  ],
  related: ["torpaq-analizi-yukle", "is-ve-emeliyyat-qeyd-et"],
};

/* ------------------------------------------------------------ 6. hesabat */

const hesabatAl: Guide = {
  slug: "hesabat-al",
  title: "Hesabat almaq və paylaşmaq",
  summary: "Mövsüm, jurnal və xərc hesabatını çap et, tokenli linklə paylaş.",
  icon: "file-text",
  meta: "4 addım · ~2 dəq",
  intro:
    "Mövsüm boyu yığdığınız məlumat mövsüm sonunda hazır sənədə çevrilir. Hesabatlar çap üçün hazır və CSV formatındadır; sahənin qısa kartını isə tokenli linklə alıcıya, banka və ya qonşuya göndərmək olar.",
  where: "Daha çox → «Hesabatlar»",
  steps: [
    {
      title: "Hesabatlar bölməsini aç",
      body:
        "«Daha çox»dan «Hesabatlar»a keçin. Hazır hesabat növləri siyahıda görünür.",
    },
    {
      title: "Hesabat növünü seç",
      body:
        "Mövsüm hesabatı, əməliyyat jurnalı və ya xərc hesabatı seçin. Hər biri sahə və ya bütün təsərrüfat üzrə qurula bilər.",
      screen: "Ekran: «Mövsüm hesabatı · Əməliyyat jurnalı · Xərc hesabatı» kartları.",
    },
    {
      title: "Çap et və ya CSV yüklə",
      body:
        "Hesabatı çap üçün açın və ya CSV kimi yükləyib Excel-də işləyin. Rəqəmlər dəftərə yazdıqlarınızdan gəlir.",
    },
    {
      title: "Paylaşma linki yarat",
      body:
        "Sahənin qısa kartını (sərhəd, sahə, son indeks oxunuşu) tokenli linklə paylaşın. Link yalnız həmin kartı açır və istənilən vaxt ləğv edilə bilər.",
      screen: "Ekran: «Paylaşma linki hazırdır» + «Kopyala» və «Ləğv et» düymələri.",
    },
  ],
  tips: [
    "Paylaşma linkini ləğv etsəniz, köhnə link dərhal işləməz olur.",
    "CSV faylı mühasibat və ya subsidiya müraciəti üçün əlverişlidir.",
    "Sahə-üzrə mənfəət hesabatı hansı tarlanın qazandırdığını, hansının zərər verdiyini göstərir.",
  ],
  related: ["is-ve-emeliyyat-qeyd-et", "sahe-elave-et"],
};

/* ------------------------------------------------------ 7. torpaq analizi */

const torpaqAnalizi: Guide = {
  slug: "torpaq-analizi-yukle",
  title: "Torpaq analizini yükləmək",
  summary: "Laboratoriya sənədini yüklə — sistem oxuyub AI tövsiyəsinə qatır.",
  icon: "flask",
  meta: "4 addım · ~2 dəq",
  intro:
    "Əlinizdə laboratoriya analizi varsa, onu kağızda saxlamayın. Sənədin şəklini çəkin və ya PDF-i yükləyin — sistem göstəriciləri (pH, NPK, üzvi maddə) oxuyub sahənin torpaq pasportuna yazır. Bundan sonra AI-nin gübrə və suvarma tövsiyələri məhz sizin ölçülmüş rəqəmlərinizə söykənir.",
  where: "Daha çox → «Torpaq»",
  steps: [
    {
      title: "Torpaq modulunu aç",
      body:
        "«Daha çox»dan «Torpaq»a keçin və sahəni seçin. Cari torpaq pasportu (varsa) burada görünür.",
    },
    {
      title: "Analiz sənədini yüklə",
      body:
        "Laboratoriyadan aldığınız sənədin şəklini çəkin və ya PDF faylını seçin. Aydın, düz çəkilmiş şəkil daha yaxşı oxunur.",
      screen: "Ekran: «Analiz sənədini yüklə» sahəsi — «Şəkil çək» və «Fayl seç» düymələri.",
    },
    {
      title: "Oxunmuş göstəriciləri yoxla",
      body:
        "Sistem pH, azot, fosfor, kalium və üzvi maddə kimi göstəriciləri tanıyıb göstərir. Səhv oxunan varsa əl ilə düzəldin.",
      screen: "Ekran: «pH: 6.8», «Azot: orta», «Üzvi maddə: 2.1%» sətirləri, hər birində düzəlt işarəsi.",
    },
    {
      title: "Pasportu təsdiqlə",
      body:
        "Təsdiqdən sonra göstəricilər torpaq pasportuna yazılır. Laboratoriya göstəriciləri ümumi torpaq xəritələrindən üstün tutulur və AI kontekstinə daxil olur.",
    },
  ],
  tips: [
    "Laboratoriya axtarırsınızsa, provayder kataloqunda region üzrə tapıb birbaşa yaza bilərsiniz.",
    "Zona xəritənizi laboratoriya ilə paylaşsanız, nümunə nöqtələrini zonalara görə planlaşdırmaq daha təmsilçi nəticə verir.",
    "Analizi yenilədikcə köhnə göstəricilər tarixçədə qalır.",
  ],
  related: ["gubre-plani", "ai-meslehetini-islet"],
};

/* ------------------------------------------------------------------ index */

export const GUIDES: Record<string, Guide> = {
  "sahe-elave-et": saheElaveEt,
  "peyk-melumatini-oxu": peykOxu,
  "ai-meslehetini-islet": aiMeslehet,
  "is-ve-emeliyyat-qeyd-et": isVeEmeliyyat,
  "gubre-plani": gubrePlani,
  "hesabat-al": hesabatAl,
  "torpaq-analizi-yukle": torpaqAnalizi,
};

export const GUIDE_ORDER: string[] = [
  "sahe-elave-et",
  "peyk-melumatini-oxu",
  "ai-meslehetini-islet",
  "is-ve-emeliyyat-qeyd-et",
  "gubre-plani",
  "hesabat-al",
  "torpaq-analizi-yukle",
];

export const GUIDE_LIST: Guide[] = GUIDE_ORDER.map((s) => GUIDES[s]);

// az is the source; any other locale deep-clones + overlays translated leaves (see contentI18n).
export function getGuide(slug: string, locale?: Locale): Guide | null {
  const g = GUIDES[slug];
  if (!g) return null;
  return locale ? localize(g, `GUIDES.${slug}`, locale) : g;
}

export function getGuideList(locale?: Locale): Guide[] {
  return GUIDE_ORDER.map((s) => getGuide(s, locale) as Guide);
}

export function getGuideIndexCopy(locale?: Locale) {
  return locale ? localize(GUIDE_INDEX_COPY, "GUIDE_INDEX_COPY", locale) : GUIDE_INDEX_COPY;
}

/** Hub-level copy for the /guide index (Server Component — plain data, no t()). */
export const GUIDE_INDEX_COPY = {
  eyebrow: "necə başlamalı",
  title: "Bağban AI ilə addım-addım",
  lead:
    "Yeni başlayırsınız? Bu qısa bələdçilər sahəni qeyd etməkdən mövsüm hesabatına qədər bütün əsas addımları göstərir. Hər biri 2–3 dəqiqəlik oxunuşdur və real ekranları təsvir edir — nə vaxt hansı düyməyə basacağınızı bilirsiniz.",
} as const;
