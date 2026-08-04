// C8 — "Necə başlamalı" bələdçi mərkəzinin məzmunu.
//
// Pure data, no React: the /guide index (a Server Component) and /guide/[slug] (a Server
// Component) import it for metadata and rendering. Icons are string keys resolved to lucide
// components inside the page files so this module stays framework-free.
//
// Honesty rules baked in:
//  * every step maps to something the product actually ships today (peyk overlay, AI advice,
//    scouting log, fertilizer plan, share link, soil-analysis OCR). No invented buttons or fake
//    numbers. The ledger and prepared-report guides were rewritten when those modules left the
//    product (81660df), and the operations chapter was rewritten as a scouting chapter when the
//    Operations section left (2026-08-04) — do not reintroduce either from an old draft.
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
      // The strip used to be described as «Sahələr / Bu gün / İşlər». Neither "Bu gün" nor "İşlər"
      // is a bottom-nav destination any more — BottomNav.tsx ships five slots, and "İşlər" is now a
      // section GROUP inside a field, not a tab of its own.
      screen: "Ekran: peyk xəritəsi + aşağıda «Xəritə / Sahələr / Hava / Qeydlər / Hesab» zolağı, sağ altda yaşıl «+».",
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
    "Bir neçə tarlanız varsa, hər birini ayrıca sahə kimi qeyd edin — analiz sahə-sahə aparılır.",
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
    "Peyk qatı sahənizin içindəki fərqi göz onu seçməzdən əvvəl açır. Görüntülər 10 metr piksellə emal olunur. Hər səhnədə bulud və kölgə pikselləri maskalanır, indekslər isə yalnız sizin sərhədiniz daxilində hesablanır. Aşağıda bu xəritəni necə oxumaq göstərilir.",
  where: "Sahə → «Peyk görüntüsü»",
  steps: [
    {
      title: "Sahəni aç",
      body:
        "Siyahıdan sahəyə toxunun və «Peyk görüntüsü» bölməsinə keçin. Sahənizin üstündə rəngli peyk qatı görünür.",
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
      title: "Kontrastı dəyiş, iki tarixi tutuşdur",
      body:
        "«Kontrast» rejimi zəif fərqləri gözə görünən edir. İki tarixi yan-yana qoymaq və keçən illə müqayisə də buradadır.",
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
  summary: "Hazır analizi oxu, «Mesajlar»da soruş, şübhəli yarpağı foto ilə tanıt.",
  icon: "brain",
  meta: "4 addım · ~3 dəq",
  intro:
    "AI aqronom boş yerdən danışmır: sahənizin son peyk oxunuşları, hava tarixçəsi, torpaq profili, əkin tarixi, skautinq qeydləri və çəkdiyiniz şəkillər ona kontekst kimi verilir. Nəticə ümumi məsləhət deyil — məhz sizin sahənizin bu həftəki vəziyyəti üçün risklər, tövsiyələr və növbəti addımlardır. Qərar həmişə sizindir; hər cavabın altında bu barədə xəbərdarlıq var.",
  where: "Sahə → «Sahə analizi»",
  steps: [
    {
      title: "«Sahə analizi» bölməsini aç",
      body:
        "Sahənin içində «Sahə analizi» bölməsinə keçin. Analiz yeni peyk səhnələri gəldikcə özü yenilənir, amma 15 gündə bir dəfədən çox yox — daha təzəsini istəsəniz, kartdakı yeniləmə düyməsini basın.",
    },
    {
      title: "Məsləhət kartını oxu",
      body:
        "Kartda üç blok var: risklər (hər biri aşağı/orta/yüksək şiddət nişanı ilə), tövsiyələr və növbəti addımlar. Yüksək şiddətli riskə birinci baxın.",
      screen: "Ekran: «Risklər» başlığı, altında qırmızı «yüksək» nişanlı sətir və izahı.",
    },
    {
      // The in-field composer was removed on 2026-08-04; the AI thread lives on the Messages
      // screen, and this section links to it with the field preselected (/chat?ai=<fieldId>).
      title: "Sualını «Mesajlar»da ver",
      body:
        "Anlamadığınız yer varsa kartın altındakı «Sahən haqqında sual ver» keçidinə basın — «Mesajlar» ekranında Agradex AI söhbəti həmin sahə seçilmiş halda açılır. Söhbət sahənizin kontekstini və son növbələri xatırlayır.",
      screen: "Ekran: məsləhət kartının altında «Sahən haqqında sual ver» keçidi.",
    },
    {
      title: "Şübhəli yarpağı foto çək",
      body:
        "Yarpağın, meyvənin və ya torpağın şəklini çəkin. AI xəstəlik/zərərverici izini oxuyur və nə etməli olduğunuzu izah edir. Şəkil sahənin arxivində qalır.",
    },
  ],
  tips: [
    "AI diaqnoz qoymur və aqronomu əvəz etmir — o, sizin gördüyünüzü genişləndirir. Ciddi hallarda kataloqdakı laboratoriya və ya aqronomla əlaqə saxlayın.",
    "Model əmin olmayanda dəqiqləşdirici sual verir — cavablayın ki, tövsiyə dəqiqləşsin.",
    "Analiz yeni səhnələr gəldikcə özü yenilənir (15 gündə bir dəfəyə qədər) — kartın altında son yenilənmə tarixi yazılır.",
  ],
  related: ["peyk-melumatini-oxu", "is-ve-emeliyyat-qeyd-et"],
};

/* ------------------------------------------------ 4. skautinq müşahidəsi */

// The Operations section left the product on 2026-08-04 and this chapter was rewritten around the
// half that stayed: scouting notes and photos. THE SLUG DELIBERATELY DID NOT CHANGE. A new slug
// would 404 the old URL — app/guide/[slug]/page.tsx calls notFound() on an unknown slug, there is
// no redirect layer (next.config.ts declares none), /sitemap.xml has been publishing this URL in
// eight languages, and three other chapters cross-link it in `related`. A stale word inside a URL
// is cheaper than a dead page; the title, summary, steps and tips below describe only what ships.
const isVeEmeliyyat: Guide = {
  slug: "is-ve-emeliyyat-qeyd-et",
  title: "Müşahidə və şəkil qeyd etmək",
  summary: "Sahədə gördüyünü yaz, yerini telefonun GPS-i ilə tut, şəklini əlavə et.",
  icon: "clipboard",
  meta: "4 addım · ~2 dəq",
  intro:
    "Skautinq qeydləri sahənin yaddaşıdır. Yazdığınız hər müşahidə AI-nin növbəti cavabına daxil olur — «keçən həftə bu sahədə zərərverici qeyd olunub» cümləsi məhz buradan yaranır. «İşlər» qrupu gübrəni, fotonu və skautinqi bir yerə toplayır.",
  where: "Sahə → İşlər → «Skautinq»",
  steps: [
    {
      title: "«Skautinq» bölməsini aç",
      body:
        "Sahəni açın və «İşlər» qrupundan «Skautinq»a keçin. Yuxarıda yeni qeyd forması, altında isə keçmiş qeydlərin siyahısı var.",
      screen: "Ekran: «Kateqoriya», «Şiddət (1-5)», «Qeyd», «Rəng» sahələri və altında qeydlərin siyahısı.",
    },
    {
      title: "Gördüyünü yaz",
      body:
        "Kateqoriyanı seçin — zərərverici, xəstəlik, alaq otu, qida çatışmazlığı, su stresi, zədə — şiddəti 1-5 arasında qiymətləndirin və qısaca nə gördüyünüzü yazın. Qeydə rəng də verə bilərsiniz; siyahıda hər qeydin yanında həmin rəng görünür.",
    },
    {
      title: "Yerini və şəklini əlavə et",
      body:
        "Tarlada dayandığınız yerdə «Cari yeri əlavə et» düyməsinə basın — telefonun GPS-i koordinatı qeydə yazır. Şübhəli yarpağın şəklini də elə həmin formadan əlavə edin: AI xəstəlik və ya zərərverici izini oxuyur.",
      screen: "Ekran: «Cari yeri əlavə et» düyməsi, altında «Yer: 40.36129, 48.51204» və «Yeri sil».",
    },
    {
      title: "İş bitəndə qeydi bağla",
      body:
        "Problem həll olunanda qeydi açıb «Həll olundu kimi işarələ» seçin. Siyahının başında «Açıq» qeydlərin sayı yazılır, həll olunanlar isə yalnız «Həll olunanları göstər» seçiləndə görünür.",
    },
  ],
  tips: [
    "İnternet yoxdursa mətn qeydiniz telefonda gözləyir və bağlantı qayıdanda özü göndərilir; şəkil isə canlı bağlantı tələb edir.",
    "Qeyd nə qədər dəqiq olsa, AI-nin növbəti analizi bir o qədər dəqiq olur.",
    "Rəngi öz sisteminiz üçün ayırın — məsələn qırmızı təcili, mavi suvarma; siyahıda qeydi bir baxışda tanıyırsınız.",
  ],
  related: ["gubre-plani", "sahe-paylas"],
};

/* ------------------------------------------------------------ 5. gübrə planı */

const gubrePlani: Guide = {
  slug: "gubre-plani",
  title: "Gübrə planı qurmaq",
  summary: "Qrafiki yaz, NDVI trendinə görə AI doza təklifini al.",
  icon: "sprout",
  meta: "4 addım · ~2 dəq",
  intro:
    "Gübrə bölməsi tətbiq qrafikinizi saxlayır və hər tətbiqi sahənin tarixçəsinə bağlayır. AI doza təklifi isə boş rəqəm deyil — NDVI trendi, məhsul normaları və (yükləmisinizsə) laboratoriya analizinə söykənir.",
  where: "Sahə → İşlər → «Gübrə»",
  steps: [
    {
      title: "Gübrə bölməsini aç",
      body:
        "Sahəni açın və «İşlər» qrupundan «Gübrə»yə keçin.",
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
        "Gübrəni tətbiq edəndə onu qeyd edin. Tətbiq sahənin tarixçəsində qalır və növbəti AI analizinə daxil olur.",
    },
  ],
  tips: [
    "Torpaq analizini yükləsəniz, doza təklifi sizin ölçülmüş göstəricilərinizə söykənir və daha dəqiq olur.",
    "Tətbiqi qeyd etməsəniz, AI sahənin bu mövsüm nə aldığını bilmir — təklif də ona görə ümumi olur.",
    "NDRE/CIre indeksi azot vəziyyətini NDVI-dən daha həssas göstərir.",
  ],
  related: ["torpaq-analizi-yukle", "is-ve-emeliyyat-qeyd-et"],
};

/* ----------------------------------------------------------- 6. paylaşma */

// Replaced the "Hesabat almaq" guide: the prepared-report library (season / journal / cost) left
// the product with the ERP strip (81660df). The share link is what actually ships for showing a
// field to someone outside the organisation, so the guide slug changed with it — /guide/hesabat-al
// now 404s rather than describing buttons that are gone.
const saheniPaylas: Guide = {
  slug: "sahe-paylas",
  title: "Sahəni paylaşmaq",
  summary: "Sahənin qısa kartını tokenli linklə göndər, istənilən vaxt ləğv et.",
  icon: "file-text",
  meta: "3 addım · ~1 dəq",
  intro:
    "Aqronoma, banka və ya qonşuya sahənizi göstərmək üçün onları hesab açmağa məcbur etmək lazım deyil. Paylaşma linki sahənin yalnız qısa kartını — sərhəd, sahə və son indeks oxunuşu — açır və istənilən vaxt ləğv edilə bilər.",
  where: "Sahə → «Paylaş» düyməsi",
  steps: [
    {
      title: "Sahəni aç və «Paylaş»a bas",
      body:
        "Siyahıdan sahəyə toxunun; «Paylaş» düyməsi sahə ekranındadır. Link yalnız siz basanda yaranır.",
    },
    {
      title: "Linki kopyala və göndər",
      body:
        "Tokenli link hazır olanda onu kopyalayıb WhatsApp, e-poçt və ya istənilən yolla göndərin. Qarşı tərəfə hesab lazım deyil.",
      screen: "Ekran: «Paylaşma linki hazırdır» + «Kopyala» və «Ləğv et» düymələri.",
    },
    {
      title: "Lazım olmayanda ləğv et",
      body:
        "«Ləğv et» düyməsinə basan kimi köhnə link işləməz olur. Sahənin qalan məlumatı — qeydlər, şəkillər, AI məsləhəti — heç vaxt həmin linkdə görünmür.",
    },
  ],
  tips: [
    "Link yalnız qısa kartı açır; qeydləriniz, şəkilləriniz və AI məsləhətiniz paylaşılmır.",
    "Aqronomun sahələrinizi davamlı izləməsini istəyirsinizsə, link yox — onu komandaya dəvət edin.",
    "Linki ləğv etsəniz, köhnə link dərhal işləməz olur.",
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
  where: "Sahə → Qeydlər → «Torpaq»",
  steps: [
    {
      title: "Torpaq bölməsini aç",
      body:
        "Sahəni açın və «Qeydlər» qrupundan «Torpaq»a keçin. Cari torpaq pasportu (varsa) burada görünür.",
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
    "Sahənin qısa kartını paylaşma linki ilə laboratoriyaya göndərsəniz, onlar sahəyə hazırlıqlı gəlir.",
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
  "sahe-paylas": saheniPaylas,
  "torpaq-analizi-yukle": torpaqAnalizi,
};

export const GUIDE_ORDER: string[] = [
  "sahe-elave-et",
  "peyk-melumatini-oxu",
  "ai-meslehetini-islet",
  "is-ve-emeliyyat-qeyd-et",
  "gubre-plani",
  "sahe-paylas",
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
  title: "Agradex ilə addım-addım",
  lead:
    "Yeni başlayırsınız? Bu qısa bələdçilər sahəni qeyd etməkdən onu paylaşmağa qədər bütün əsas addımları göstərir. Hər biri 2–3 dəqiqəlik oxunuşdur və real ekranları təsvir edir — nə vaxt hansı düyməyə basacağınızı bilirsiniz.",
} as const;
