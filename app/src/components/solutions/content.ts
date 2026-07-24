// W2 / E11 + C6 — long-form marketing copy for the four role solution pages.
//
// Pure data, no React: the segment route (a Server Component) imports it for metadata and
// SolutionView (a Client Component) renders it. Icons are string keys resolved to lucide
// components inside SolutionView so this module stays framework-free.
//
// Honesty rules baked into the copy:
//  * every capability claim maps to something the product actually ships today; the few
//    forward-looking items carry `soon: true` and render with a visible "Yaxında" badge;
//  * no invented measured results — the proof block is explicitly framed as an illustrative
//    scenario ("nümunə"), and the hero previews are labelled as sample UI;
//  * pricing applies to FARMERS ONLY (1 ay pulsuz, then Paket 1/2/3). Labs, consultants and
//    suppliers join free — every provider page says so in the badge, stats, note and FAQ.
//
// UI copy is inline Azerbaijani for now; the T18 i18n sweep extracts it to t() keys later.

export type SegmentSlug = "fermer" | "laboratoriya" | "konsultant" | "techizatci";

export type IconKey =
  | "satellite"
  | "brain"
  | "camera"
  | "droplets"
  | "sprout"
  | "layers"
  | "wallet"
  | "boxes"
  | "report"
  | "message"
  | "handshake"
  | "flask"
  | "map"
  | "target"
  | "upload"
  | "search"
  | "users"
  | "chart"
  | "clock"
  | "package"
  | "store"
  | "bell"
  | "shield"
  | "globe"
  | "offline";

export type VisualKey = "field" | "lab" | "clients" | "catalog";

export interface Stat {
  value: string;
  label: string;
}

export interface ValuePoint {
  title: string;
  body: string;
}

export interface Step {
  title: string;
  body: string;
}

export interface Feature {
  icon: IconKey;
  title: string;
  body: string;
  /** Renders a visible "Yaxında" badge — the capability is planned, not shipped. */
  soon?: boolean;
}

export interface TwoColumn {
  title: string;
  sub: string;
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
}

export interface DeepBlock {
  icon: IconKey;
  title: string;
  body: string;
  bullets: string[];
}

export interface ProofCase {
  /** Small label above the card — always makes clear this is an illustration. */
  label: string;
  title: string;
  body: string;
  timeline: { when: string; what: string }[];
  note: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Segment {
  slug: SegmentSlug;
  /** Tab / pill label. */
  label: string;
  /** One line used on the index cards. */
  short: string;
  tabIcon: IconKey;
  /** Avatar / accent colour, mirroring the approved mockup. */
  accent: string;
  badge: { text: string; tone: "trial" | "free" };
  eyebrow: string;
  headline: string;
  lead: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  visual: VisualKey;
  metaTitle: string;
  metaDescription: string;
  /** Index-card bullets. */
  cardBullets: string[];
  valueTitle: string;
  valueSub: string;
  valuePoints: ValuePoint[];
  stats: Stat[];
  stepsTitle: string;
  stepsSub: string;
  steps: Step[];
  featuresTitle: string;
  featuresSub: string;
  features: Feature[];
  twoCol: TwoColumn;
  proof: ProofCase;
  deepTitle: string;
  deepSub: string;
  deep: DeepBlock[];
  /** Who pays — repeated on every page, farmers only. */
  pricingNote: string;
  faqTitle: string;
  faq: FaqItem[];
  cta: { title: string; sub: string; label: string; href: string };
}

/* ------------------------------------------------------------------ FERMER */

const fermer: Segment = {
  slug: "fermer",
  label: "Fermer",
  short: "Sahələrimi izləyirəm, məhsul yetişdirirəm",
  tabIcon: "sprout",
  accent: "#1E9852",
  badge: { text: "1 ay pulsuz · kart lazım deyil", tone: "trial" },
  eyebrow: "fermerlər üçün",
  headline: "Tarlanı gör. Anla. Qazan.",
  lead:
    "NASA HLS və Sentinel-2 peykləri, süni intellekt aqronom, su balansı və təsərrüfat dəftəri — hamısı bir telefonda, Azərbaycan dilində. Sahənizi qeyd etmək üçün xəritədə bir toxunuş kifayətdir: qalanını platforma edir. Problem hələ gözlə görünməzdən əvvəl xəritədə görünür, hər tövsiyə sadə dildə izah olunur, hər manat isə sahə-sahə hesablanır.",
  primaryCta: { label: "1 ay pulsuz başla", href: "/signup" },
  secondaryCta: { label: "Qiymətlərə bax", href: "/pricing" },
  visual: "field",
  metaTitle: "Fermerlər üçün — Bağban AI",
  metaDescription:
    "Peyk monitorinqi, AI aqronom məsləhəti, su balansı, gübrə planı və təsərrüfat dəftəri bir yerdə. 1 ay pulsuz, kart lazım deyil.",
  cardBullets: [
    "Peykdən sahə sağlamlığı — NDVI, NDMI, NDRE və 6 başqa indeks",
    "AI aqronom: risklər, tövsiyələr, foto ilə diaqnoz",
    "Xərc/gəlir dəftəri və sahə-üzrə mənfəət",
  ],
  valueTitle: "Niyə fermerlər Bağban AI seçir",
  valueSub:
    "Beş sadə səbəb — hər biri gündəlik işinizdə birbaşa qarşılığı olan şeydir, ekranda gözəl görünən qrafik deyil.",
  valuePoints: [
    {
      title: "Problemi bütün bloka yayılmadan görün",
      body:
        "Peyk indeksləri sahənin içindəki fərqi göz onu seçməzdən əvvəl açır. Suvarma xəttindəki tıxac, azot çatışmazlığı, xəstəlik ocağı və ya duzlaşma — əvvəlcə kiçik bir ləkə kimi görünür. Xəritədə həmin ləkə hələ bir neçə sıra ikən müdaxilə etmək, bütün bloku itirməkdən qat-qat ucuzdur.",
    },
    {
      title: "Aqronom cavabı gecə saat 11-də də",
      body:
        "Sahənizin son peyk oxunuşları, hava tarixçəsi, torpaq analizi, əkin tarixi, əməliyyat jurnalı və çəkdiyiniz şəkillər AI aqronoma kontekst kimi verilir. Cavab ümumi məsləhət deyil — məhz sizin sahənizin bu həftəki vəziyyəti üçün risklər, tövsiyələr və növbəti addımlar siyahısıdır.",
    },
    {
      title: "Hansı sahə qazandırır, hansı zərər verir — rəqəmlə",
      body:
        "Yanacaq, gübrə, dərman, muzd, icarə bir tərəfdə; yığım, satış və alıcı ödənişləri digər tərəfdə. Platforma bunları sahə-sahə toplayır və mövsüm sonunda hansı tarlanın mənfəət, hansının zərər gətirdiyini göstərir. Qəbzin şəklini çəkin — sistem xərc qaralamasını özü doldurur.",
    },
    {
      title: "Başlamaq üçün heç bir data lazım deyil",
      body:
        "Kadastr sənədi, koordinat cədvəli, GIS proqramı — heç biri. Kəndinizi axtarın, tarlanıza toxunun: sərhəd avtomatik tanınır. Əlinizdə shapefile varsa (.zip) onu da yükləyə bilərsiniz. İlk peyk şəkilləriniz dəqiqələr içində emala düşür.",
    },
    {
      title: "Kənddə internet zəif olanda da işləyir",
      body:
        "Tətbiq telefona quraşdırılır (PWA), son baxdığınız məlumat offline açılır, «data qənaəti» rejimi ağır xəritə plitələrini söndürür. Yazmağı sevmirsinizsə — məsləhəti «səsləndir» düyməsi ilə dinləyin.",
    },
  ],
  stats: [
    { value: "9+", label: "vegetasiya indeksi — NDVI, NDMI, NDRE, EVI, SAVI, NBR…" },
    { value: "10 m", label: "Sentinel-2 piksel ölçüsü (NASA HLS 30 m ilə birlikdə)" },
    { value: "1 ay", label: "tam pulsuz giriş — kart lazım deyil, avtomatik ödəniş yoxdur" },
  ],
  stepsTitle: "4 addımda dəyər",
  stepsSub:
    "Nə GIS bilgisi, nə cədvəl, nə də kağız. Qeydiyyatdan sonra ilk peyk xəritənizə qədər adətən bir çay fasiləsi kifayət edir.",
  steps: [
    {
      title: "Sahəni çək",
      body:
        "Xəritədə kəndinizi axtarın və tarlanıza toxunun — sərhəd avtomatik tanınır. İstəsəniz əl ilə düzəldin və ya hazır shapefile (.zip) yükləyin. Sahə hektarı elə həmin anda hesablanır.",
    },
    {
      title: "Peyk arxivi açılsın",
      body:
        "Sahə yaradılan kimi emal növbəsinə düşür: son həftələrin səhnələri yüklənir, bulud və kölgə pikselləri maskalanır, hər indeks sahənizin sərhədinə kəsilir. Proqres və gözlənilən vaxt ekranda görünür.",
    },
    {
      title: "Vəziyyəti gör və AI-dan soruş",
      body:
        "Sahə üzərində piksel-səviyyəli rəngli xəritə, tarix zolağı, mövsüm müqayisəsi və sağlamlıq balı. Anlamadığınız yer varsa — söhbətdə soruşun, şübhəli yarpağın şəklini çəkin, AI tanısın.",
    },
    {
      title: "İşi planlaşdır və qazancı hesabla",
      body:
        "Tapşırıq zəncirini əkin tarixindən avtomatik yaradın, əməliyyatları qeyd edin, dərmandan sonra yığım sayğacını izləyin, xərc və gəliri yazın — mövsüm sonunda hesabat hazırdır.",
    },
  ],
  featuresTitle: "Sizə lazım olan hər şey — bir yerdə",
  featuresSub:
    "Ayrı-ayrı proqramlar, dəftərçə və WhatsApp qrupları əvəzinə tək platforma. Hər modul digərini qidalandırır: dəftərə yazdığınız hər əməliyyat AI-nin cavabını dəqiqləşdirir.",
  features: [
    {
      icon: "satellite",
      title: "Peyk monitorinq",
      body:
        "NASA HLS 30 m və Sentinel-2 10 m səhnələri. NDVI, NDMI, NDRE, CIre, EVI, SAVI, MSAVI, NDWI, NBR — sahənizə kəsilmiş rəngli raster, tarix zolağı (hər səhnə üçün bulud faizi ilə) və kontrast rejimi.",
    },
    {
      icon: "brain",
      title: "AI aqronom və söhbət",
      body:
        "Hər yeni peyk səhnəsindən sonra avtomatik analiz: risklər (şiddət dərəcəsi ilə), tövsiyələr, növbəti addımlar. Sonra istədiyinizi soruşun — söhbət sahənizin kontekstini xatırlayır.",
    },
    {
      icon: "camera",
      title: "Foto diaqnoz və şəkil arxivi",
      body:
        "Yarpağın, meyvənin, torpağın şəklini çəkin — AI xəstəlik/zərərverici izini oxuyur və nə etməli olduğunuzu izah edir. Şəkillər sahənin arxivində qalır və analizə daxil olur.",
    },
    {
      icon: "droplets",
      title: "Su balansı və çiləmə pəncərəsi",
      body:
        "FAO-56 metodikası ilə torpaq su ehtiyatı: nə vaxt və təxminən nə qədər suvarmaq lazımdır. 7 günlük hava proqnozundan çiləmə üçün uyğun pəncərə, şaxta və isti dalğası xəbərdarlığı.",
    },
    {
      icon: "sprout",
      title: "Gübrə planı və AI doza təklifi",
      body:
        "Gübrələmə qrafikinizi yazın; NDVI trendi, məhsul normaları və (varsa) laboratoriya analizinə əsaslanan doza təklifini AI-dən alın. Hər tətbiq dəftərə və xərcə düşür.",
    },
    {
      icon: "layers",
      title: "Məhsuldarlıq zonaları",
      body:
        "Bir neçə mövsümün peyk pikselləri üzərində hesablanmış davamlı güclü/zəif zonalar — hansı hissəyə daha çox, hansına daha az resurs vermək lazım olduğunu göstərir.",
    },
    {
      icon: "wallet",
      title: "Təsərrüfat dəftəri və sahə-üzrə mənfəət",
      body:
        "Xərclər kateqoriya üzrə, gəlir yığım və satışdan. Sahə-sahə P&L, təşkilat üzrə cəm. Qəbzin şəklindən xərc qaralaması avtomatik doldurulur.",
    },
    {
      icon: "boxes",
      title: "Anbar, texnika, satış və alıcılar",
      body:
        "Anbar qalığı əməliyyatdan avtomatik çıxılır və azalanda xəbərdarlıq gəlir. Texnika üçün dövri servis tapşırıqları. Yığım lotları izləmə kodu ilə, alıcı bazası və satış jurnalı.",
    },
    {
      icon: "report",
      title: "Hesabatlar və paylaşma linki",
      body:
        "Mövsüm hesabatı, əməliyyat jurnalı, xərc hesabatı — çap üçün hazır və CSV kimi. Sahənin qısa kartını tokenli linklə alıcıya, banka və ya qonşuya göndərin; linki istənilən vaxt ləğv edin.",
    },
    {
      icon: "message",
      title: "Fermer icması və provayder kataloqu",
      body:
        "Eyni məhsulu əkən və ya yaxın zonadakı fermerlərlə məsləhətləşin. Laboratoriya, aqro-konsultant və təchizatçını region üzrə tapıb birbaşa yazın — vasitəçi yoxdur.",
    },
    {
      icon: "offline",
      title: "Offline, səsli və Azərbaycan dilində",
      body:
        "Telefona quraşdırılır, zəif internetdə də açılır, data qənaəti rejimi var. Bütün mətnlər Azərbaycan dilində; məsləhəti dinləmək üçün «səsləndir» düyməsi.",
    },
    {
      icon: "bell",
      title: "Bildirişlər — yalnız vacib olanda",
      body:
        "Sahə vəziyyəti pisləşəndə, şaxta riski yaranmanda, yığım məhdudiyyəti bitəndə və ya anbar azalanda xəbər gəlir. Sakit saatlar var — gecə narahat etmirik.",
    },
  ],
  twoCol: {
    title: "Əvvəl və sonra",
    sub: "Eyni təsərrüfat, eyni adamlar — fərq yalnız məlumatın nə vaxt və hansı formada əlinizə çatmasındadır.",
    leftTitle: "Bağban AI olmadan",
    leftItems: [
      "Problemi ancaq tarlaya girəndə, çox vaxt yayılandan sonra görürsünüz",
      "Suvarma və gübrə qərarları «keçən il belə etmişdik» prinsipi ilə verilir",
      "Xərclər dəftərçədə, qəbzlər cibdə, hesablama mövsümün sonunda təxmini",
      "Aqronom məsləhəti üçün gözləmək, yaxud heç kimə çatmamaq",
      "Laboratoriya, gübrə satıcısı və konsultant tanış-tanış vasitəsilə axtarılır",
      "Dərmandan sonra neçə gün keçdiyi yaddaşda saxlanılır",
    ],
    rightTitle: "Bağban AI ilə",
    rightItems: [
      "Zəifləyən zona xəritədə hələ kiçik ləkə ikən görünür",
      "Su balansı, hava proqnozu və indeks trendi qərarı əsaslandırır",
      "Hər xərc və gəlir sahəyə bağlıdır — mənfəət mövsüm boyu görünür",
      "AI aqronom analizi hər yeni peyk səhnəsindən sonra hazır olur",
      "Kataloqda region üzrə provayder tapılır və birbaşa yazılır",
      "Yığım məhdudiyyəti sayğacla izlənir və ekranda xəbərdarlıq verir",
    ],
  },
  proof: {
    label: "Nümunə ssenari — illüstrasiya, ölçülmüş nəticə deyil",
    title: "8 hektarlıq fındıq bağında bir həftə necə keçir",
    body:
      "Aşağıdakı ardıcıllıq platformanın real axınıdır: hansı məlumat nə vaxt gəlir və fermer hansı addımı atır. Rəqəmlər izah üçün seçilib — sizin sahənizdə fərqli olacaq.",
    timeline: [
      { when: "Bazar ertəsi", what: "Yeni Sentinel-2 səhnəsi düşür. Bağın şimal-qərb küncündə NDVI qonşu zonalardan nəzərəçarpacaq dərəcədə aşağıdır." },
      { when: "Bazar ertəsi, 10 dəqiqə sonra", what: "AI analizi hazırdır: nəmlik indeksi də eyni yerdə düşüb — ehtimal olunan səbəblər arasında suvarma çatışmazlığı və kök zonası problemi göstərilir, yoxlama addımları verilir." },
      { when: "Çərşənbə axşamı", what: "Fermer həmin küncə gedir, şübhəli yarpaqların şəklini çəkir. Foto diaqnoz zərərverici izini oxuyur və izah edir." },
      { when: "Çərşənbə", what: "Kataloqdan yaxın rayondakı təchizatçı tapılır, birbaşa yazışma ilə preparat sifariş olunur. Əməliyyat qeyd edilir, yığım məhdudiyyəti sayğacı avtomatik başlayır." },
      { when: "Növbəti həftə", what: "Yeni səhnədə həmin zonanın indeksi bərpa olunmağa başlayır; müqayisə qrafiki fərqi göstərir. Xərc dəftərə düşüb — mövsüm sonu hesabatda görünəcək." },
    ],
    note:
      "Platforma diaqnoz qoymur və aqronomu əvəz etmir — o, sizin gördüyünüzü genişləndirir və qərarı əsaslandırır. Bütün AI cavabları məsləhət xarakterlidir.",
  },
  deepTitle: "Modul turu — dərinliyə baxış",
  deepSub:
    "Səthdə sadə görünən şeyin altında ciddi emal var. Aşağıda ən çox istifadə olunan dörd modulun necə işlədiyi.",
  deep: [
    {
      icon: "satellite",
      title: "Peyk qatı",
      body:
        "İki mənbə birləşdirilir: NASA-nın uyğunlaşdırılmış Landsat–Sentinel (HLS) məhsulu 30 metr piksellə və Sentinel-2 10 metr piksellə. Hər səhnə üçün bulud və kölgə maskası tətbiq olunur, sonra indekslər yalnız sahənizin sərhədi daxilində hesablanır.",
      bullets: [
        "Sahə üzərində piksel-səviyyəli rəngli overlay — orta rəqəm deyil, xəritə",
        "Tarix zolağı: hər səhnənin tarixi və bulud faizi",
        "Mövsüm müqayisəsi — eyni təqvim günündə keçən illə fərq",
        "Retrospektiv arxiv: köhnə illəri sonradan doldurmaq",
      ],
    },
    {
      icon: "brain",
      title: "AI aqronom qatı",
      body:
        "Model boş yerdən danışmır: sahənin indeks trendləri, hava tarixçəsi, torpaq profili, əkin tarixi, əməliyyat və skautinq qeydləri, şəkillər və aktiv yığım məhdudiyyəti kontekst kimi verilir. Nəticə strukturlu şəkildə qayıdır — risklər, tövsiyələr, növbəti addımlar.",
      bullets: [
        "Hər yeni peyk səhnəsindən sonra avtomatik yenilənən analiz",
        "Sahə kontekstini xatırlayan söhbət",
        "Bilik pasportu: torpaq, su tələbi, zərərverici riski üzrə toplanmış məlumat",
        "Dəqiqləşdirici suallar — model əmin olmadığı yerdə soruşur",
      ],
    },
    {
      icon: "wallet",
      title: "Təsərrüfat dəftəri qatı",
      body:
        "Əməliyyat, gübrə, dərman, yanacaq, muzd, anbar hərəkəti, texnika servisi, yığım və satış — hamısı eyni sahəyə bağlanır. Nəticədə mövsüm sonu deyil, mövsüm boyu görünən mənfəət mənzərəsi alınır.",
      bullets: [
        "Sahə-üzrə və təşkilat-üzrə xərc/gəlir",
        "Xərcin kateqoriya üzrə bölgüsü",
        "Qəbz şəklindən avtomatik xərc qaralaması",
        "Yığım lotları, alıcı bazası və satış jurnalı",
      ],
    },
    {
      icon: "handshake",
      title: "Platforma qatı",
      body:
        "Fermer tək deyil: laboratoriya, aqro-konsultant və təchizatçı eyni platformada, sizin regionunuz üzrə axtarıla bilər. Digər fermerlərlə isə birbaşa məsləhətləşə bilərsiniz.",
      bullets: [
        "Kataloq: ölkə, region və ixtisas üzrə filtr",
        "Birbaşa yazışma — vasitəçi və komissiya yoxdur",
        "Kontekstual təklif: analiz blokunun yanında oxşar təcrübəsi olan fermerlər",
        "Komanda: təsərrüfata işçi və ya konsultant dəvət etmək",
      ],
    },
  ],
  pricingNote:
    "Qiymət yalnız fermerlərə aiddir. İlk 1 ay bütün funksiyalar pulsuzdur — kart lazım deyil, avtomatik ödəniş yoxdur. Sonra pulsuz paketdə qalmaq, yaxud Paket 2 (10 AZN/ay) və Paket 3 (25 AZN/ay) seçmək sizin ixtiyarınızdadır. Laboratoriya, konsultant və təchizatçılar üçün platforma tam pulsuzdur.",
  faqTitle: "Fermerlərin ən çox verdiyi suallar",
  faq: [
    {
      q: "Neçəyə başa gəlir?",
      a:
        "İlk 1 ay bütün funksiyalar pulsuzdur — kart məlumatı istənilmir və sınaq bitəndə avtomatik pul çıxılmır. Sonra pulsuz paketdə (bir sahə, peyk sağlamlıq xəritəsi, hava və ayda bir AI məsləhəti) qala bilərsiniz. Genişləndirmək istəsəniz Paket 2 — 10 AZN/ay, Paket 3 — 25 AZN/ay. Paketlərin tam müqayisəsi Qiymətlər səhifəsindədir.",
    },
    {
      q: "Data yükləməli, koordinat yazmalıyam?",
      a:
        "Xeyr. Xəritədə kəndinizi axtarıb tarlanıza toxunmaq kifayətdir — sərhəd avtomatik tanınır və istəsəniz əl ilə düzəldilir. Əlinizdə shapefile (.zip) varsa onu da yükləyə bilərsiniz. Heç bir GIS proqramı və ya cədvəl lazım deyil.",
    },
    {
      q: "Peyk şəkilləri nə qədər tez-tez yenilənir?",
      a:
        "İki mənbədən — NASA HLS və Sentinel-2 — istifadə etdiyimiz üçün orta hesabla bir neçə gündə bir keçid olur. Buludlu günlər praktikada bu intervalı uzada bilər, ona görə hər səhnənin bulud faizi göstərilir və bulud/kölgə pikselləri hesablamadan çıxarılır. Yeni səhnə düşən kimi analiz özü yenilənir.",
    },
    {
      q: "İnternet zəif olan kənddə işləyirmi?",
      a:
        "Bəli. Tətbiq telefona quraşdırılır (PWA), son baxdığınız məlumat offline açılır, bağlantı qayıdanda sinxronlaşır. «Data qənaəti» rejimi ağır xəritə plitələrini söndürür. Oxumaq çətindirsə, mətni «səsləndir» düyməsi ilə dinləyə bilərsiniz.",
    },
    {
      q: "Hansı məhsullar üçün uyğundur?",
      a:
        "Fındıq, taxıl, üzüm və bağ məhsulları üçün xüsusi normalar və mərhələ hədləri yığılıb — bunlar indeks qiymətlərinin şərhini dəqiqləşdirir. Digər məhsullar da tam izlənir: peyk indeksləri, hava, su balansı, dəftər və AI hər halda işləyir.",
    },
    {
      q: "AI səhv desə nə olacaq?",
      a:
        "AI aqronom məsləhət verir, qərar sizindir — hər cavabın altında bu barədə xəbərdarlıq var. Model əmin olmayanda dəqiqləşdirici sual verir, cavabın nəyə əsaslandığını göstərir. Ciddi hallarda kataloqdakı laboratoriya və ya konsultantla əlaqə saxlamağı tövsiyə edirik.",
    },
    {
      q: "Məlumatım kimə aiddir?",
      a:
        "Sahələriniz, qeydləriniz və hesabatlarınız sizin təşkilatınıza aiddir. Kimsə onları görmür — komandaya dəvət etdiyiniz adamlar və özünüzün yaratdığınız paylaşma linkləri istisna olmaqla. Paylaşma linki yalnız qısa sahə kartını açır və istənilən vaxt ləğv edilə bilər.",
    },
    {
      q: "Sınaq bitəndən sonra nə olur?",
      a:
        "Heç nə silinmir. Sahələriniz, qeydləriniz və tarixçəniz yerində qalır; sadəcə pulsuz paketin limitləri işə düşür. İstədiyiniz vaxt paketi qaldıra və ya endirə bilərsiniz.",
    },
  ],
  cta: {
    title: "Tarlanı bu gün peykdən izləməyə başla",
    sub: "1 ay pulsuz · kart lazım deyil · istənilən vaxt dayandır",
    label: "1 ay pulsuz başla",
    href: "/signup",
  },
};

/* ----------------------------------------------------------- LABORATORİYA */

const laboratoriya: Segment = {
  slug: "laboratoriya",
  label: "Laboratoriya",
  short: "Torpaq və nümunə analizi xidməti göstərirəm",
  tabIcon: "flask",
  accent: "#2F6CA8",
  badge: { text: "Pulsuz qoşul · abunə haqqı yoxdur", tone: "free" },
  eyebrow: "laboratoriyalar üçün",
  headline: "Nümunə xidmətini fermerin olduğu yerə apar.",
  lead:
    "Torpaq, su və yarpaq analizi xidmətinizi fermerlərin hər gün açdığı platformada yerləşdirin. Kataloqda region və xidmət üzrə görünün, birbaşa müraciət alın, nəticəniz isə fermerin sahə pasportuna düşüb AI aqronomun tövsiyəsinə daxil olsun — yəni işiniz mövsüm boyu görünən dəyərə çevrilsin. Laboratoriyalar üçün platforma tam pulsuzdur.",
  primaryCta: { label: "Pulsuz qoşul", href: "/signup" },
  secondaryCta: { label: "Necə işləyir", href: "#nece-isleyir" },
  visual: "lab",
  metaTitle: "Laboratoriyalar üçün — Bağban AI",
  metaDescription:
    "Torpaq nümunə xidmətinizi fermerlərə çatdırın: pulsuz profil, region üzrə kataloq görünürlüyü, birbaşa müraciət və nəticənin AI məsləhətinə inteqrasiyası.",
  cardBullets: [
    "Pulsuz profil və region üzrə kataloq görünürlüyü",
    "Fermerdən birbaşa müraciət — vasitəçi yoxdur",
    "Analiz nəticəsi fermerin AI məsləhətinə daxil olur",
  ],
  valueTitle: "Laboratoriya üçün burada nə var",
  valueSub:
    "Sizin problem çox vaxt analiz keyfiyyəti deyil — fermerə çatmaq və işin dəyərini ona göstərməkdir. Platforma məhz bunun üçün qurulub.",
  valuePoints: [
    {
      title: "Müştəri axını reklamsız gəlir",
      body:
        "Fermer platformada torpaq analizi mövzusuna toxunanda, gübrə dozası soruşanda və ya kataloqu açanda region üzrə uyğun laboratoriyaları görür. Siz orada olursunuz — üstəlik axtarışın məhz doğru anında.",
    },
    {
      title: "Nəticəniz platformada yaşayır",
      body:
        "Fermer analiz sənədini (PDF və ya şəkil) platformaya yükləyəndə sistem onu oxuyur və torpaq pasportuna yazır. Bundan sonra AI-nin gübrə və suvarma tövsiyələri məhz sizin ölçdüyünüz göstəricilərə söykənir — laboratoriya işi kağızda qalmır.",
    },
    {
      title: "Zona-əsaslı nümunə metodikası",
      body:
        "Sahədə çox-mövsümlü peyk pikselləri üzərində hesablanmış məhsuldarlıq zonaları var. Fermer həmin zona xəritəsini sizinlə paylaşa bilər — nümunə nöqtələrini bərabər tor əvəzinə zonalara görə planlaşdırmaq eyni sayda nümunə ilə daha təmsilçi nəticə deməkdir.",
    },
    {
      title: "Təkrar iş — bir dəfəlik sifariş yox",
      body:
        "Fermer platformada qaldığı üçün əlaqə mövsüm sonunda kəsilmir. Yeni sahə, yeni mövsüm, dəyişən problem — hər dəfə yenidən axtarış deyil, sizin profiliniz və keçmiş yazışma.",
    },
  ],
  stats: [
    { value: "Pulsuz", label: "qoşulma, profil və kataloq — abunə haqqı yoxdur" },
    { value: "Birbaşa", label: "fermer müraciətləri — vasitəçi və komissiya yoxdur" },
    { value: "Region", label: "ölkə, region və xidmət üzrə hədəflənmiş görünürlük" },
  ],
  stepsTitle: "4 addımda fermerlərə çatın",
  stepsSub: "Qeydiyyatdan kataloqda görünməyə qədər adətən 15 dəqiqə — heç bir müqavilə və ödəniş yoxdur.",
  steps: [
    {
      title: "Profil yaradın",
      body:
        "Qeydiyyatda «Laboratoriya» rolunu seçin: şirkət adı, xidmətlər (torpaq analizi, NPK, pH, su, yarpaq), əhatə etdiyiniz region və əlaqə məlumatı.",
    },
    {
      title: "Kataloqda görünün",
      body:
        "Profiliniz provayder kataloqunda dərc olunur. Fermerlər ölkə, region və xidmət növünə görə filtrləyib sizi tapır.",
    },
    {
      title: "Müraciət alın",
      body:
        "Fermer profilinizdən birbaşa yazır: hansı sahə, hansı problem, nə vaxt lazımdır. Yazışma platformada saxlanılır — heç nə itmir.",
    },
    {
      title: "Nəticəni bağlayın",
      body:
        "Analizi apararsınız, nəticə sənədini fermerə verirsiniz. O, sənədi sahəsinə yükləyəndə sistem göstəriciləri oxuyur və AI tövsiyələrinə daxil edir.",
    },
  ],
  featuresTitle: "Laboratoriyalar üçün alətlər",
  featuresSub: "Hamısı pulsuz paketin içindədir — laboratoriyalar üçün ödənişli səviyyə yoxdur.",
  features: [
    {
      icon: "store",
      title: "Provayder profili",
      body:
        "Şirkət adı, xidmət siyahısı, əhatə zonası, ünvan və əlaqə. İstənilən vaxt özünüz redaktə edirsiniz.",
    },
    {
      icon: "search",
      title: "Kataloq görünürlüyü",
      body:
        "Fermerlər ölkə, region və xidmət növü üzrə filtrləyir. Yaxınlıqda analiz axtaran fermer sizi görür.",
    },
    {
      icon: "message",
      title: "Birbaşa yazışma",
      body:
        "Fermer platformadan yazır, siz cavab verirsiniz. Vasitəçi, komissiya və üçüncü tərəf yoxdur.",
    },
    {
      icon: "layers",
      title: "Zona xəritəsi ilə nümunə planı",
      body:
        "Fermerin sahəsindəki məhsuldarlıq zonaları nümunə nöqtələrini planlaşdırmaq üçün əsas verir — bərabər tordan daha təmsilçi.",
    },
    {
      icon: "upload",
      title: "Nəticənin oxunması",
      body:
        "Kağız və ya PDF analiz fermer tərəfindən yüklənəndə sistem göstəriciləri (pH, NPK, üzvi maddə və s.) tanıyıb torpaq pasportuna yazır.",
    },
    {
      icon: "brain",
      title: "AI inteqrasiyası",
      body:
        "Torpaq pasportu AI aqronomun kontekstinə daxildir: gübrə dozası və suvarma tövsiyəsi sizin ölçdüyünüz rəqəmlərə söykənir.",
    },
    {
      icon: "map",
      title: "Sahə kartına baxış",
      body:
        "Fermer paylaşma linki göndərəndə sahənin qısa kartını — sərhəd, sahə, son indeks oxunuşu — hesab açmadan görürsünüz.",
    },
    {
      icon: "target",
      title: "Xidmət ixtisaslaşması",
      body:
        "Torpaq, su, yarpaq, NPK, pH — hansı analizləri etdiyinizi dəqiq göstərin ki, sorğular uyğun gəlsin.",
    },
    {
      icon: "chart",
      title: "Nəticənin təsiri görünür",
      body:
        "Analizdən sonra fermer indeks trendini və mövsüm müqayisəsini izləyir — işinizin nəticəsi rəqəmlə görünür.",
    },
  ],
  twoCol: {
    title: "İki tərəf üçün də qazanc",
    sub: "Laboratoriya daha çox və daha dəqiq iş alır, fermer isə nəticəni istifadə edə bildiyi formada.",
    leftTitle: "Laboratoriya üçün",
    leftItems: [
      "Region üzrə hədəflənmiş yeni fermer müraciətləri",
      "Vasitəçisiz birbaşa əlaqə və yazışma tarixçəsi",
      "Zona-əsaslı metodika ilə daha güclü xidmət təklifi",
      "Nəticə platformada yaşadığı üçün təkrar iş ehtimalı yüksəlir",
      "Profil və kataloq tam pulsuzdur",
    ],
    rightTitle: "Fermer üçün",
    rightItems: [
      "Yaxınlıqda etibarlı laboratoriya tapır",
      "Nümunəni doğru nöqtələrdən götürməyin dəyərini görür",
      "Nəticə sahə pasportuna düşür və itmir",
      "Gübrə dozası torpağın real göstəricilərinə görə dəqiqləşir",
      "Analiz xərci dəftərə düşür — mənfəət hesabında görünür",
    ],
  },
  proof: {
    label: "Metodika müqayisəsi — illüstrasiya",
    title: "Bərabər tor və zona-əsaslı nümunə",
    body:
      "Bərabər tor (grid) sahənin daxilindəki dəyişkənliyi nəzərə almır: nümunə nöqtəsi təsadüfən güclü və ya zəif zonaya düşə bilər. Peyk əsaslı məhsuldarlıq zonaları isə hansı hissələrin illər boyu davamlı fərqləndiyini göstərir — nümunələr həmin zonalara görə paylanır.",
    timeline: [
      { when: "Addım 1", what: "Sahənin bir neçə mövsümlük peyk arxivi üzərində davamlı güclü, orta və zəif zonalar hesablanır." },
      { when: "Addım 2", what: "Nümunə nöqtələri zonalara görə paylanır — hər zona öz nümunəsi ilə təmsil olunur." },
      { when: "Addım 3", what: "Laboratoriya nəticəsi zona kontekstində oxunur: zəif zonanın problemi güclü zonanın orta göstəricisi altında gizlənmir." },
      { when: "Addım 4", what: "Nəticə fermerin sahə pasportuna yüklənir və gübrə tövsiyəsini zonalar üzrə dəqiqləşdirir." },
    ],
    note:
      "Bu, metodikanın izahıdır — konkret rəqəm və ya ölçülmüş dəqiqlik artımı vəd etmirik. Nəticə sahəyə, məhsula və nümunə sayına görə dəyişir.",
  },
  deepTitle: "Necə qurulub",
  deepSub: "Laboratoriya profili platformanın hansı hissələri ilə əlaqələnir.",
  deep: [
    {
      icon: "store",
      title: "Profil və kataloq",
      body:
        "Provayder profili ölkə, region, xidmət siyahısı və əlaqə məlumatını saxlayır. Kataloq səhifəsində fermerlər eyni sahələr üzrə filtrləyir.",
      bullets: [
        "Rol qeydiyyatda seçilir — «Laboratoriya»",
        "Xidmətlər çoxlu seçim kimi göstərilir",
        "Əhatə zonası region səviyyəsində təyin olunur",
        "Profil istənilən vaxt redaktə olunur",
      ],
    },
    {
      icon: "message",
      title: "Müraciət və yazışma",
      body:
        "Fermer profilinizdən söhbət başladır. Bütün yazışma platformada qalır; siz gələn sorğuları bir yerdə görürsünüz.",
      bullets: [
        "Vasitəçi yoxdur — fermer birbaşa sizinlədir",
        "Komissiya alınmır",
        "Yazışma tarixçəsi saxlanılır",
        "Bildiriş gələndə xəbərdar olursunuz",
      ],
    },
    {
      icon: "upload",
      title: "Nəticənin sistemə düşməsi",
      body:
        "Analiz sənədi fermer tərəfindən yüklənir; sistem şəkil və ya PDF-dən göstəriciləri oxuyub torpaq pasportuna yazır. Laboratoriya göstəriciləri digər mənbələrdən üstün tutulur.",
      bullets: [
        "pH, NPK, üzvi maddə və digər göstəricilər tanınır",
        "Torpaq pasportu AI kontekstinə daxil olur",
        "Nəticə sahəyə bağlanır və tarixçədə qalır",
        "Fermer istədiyi vaxt sənədi yenidən açır",
      ],
    },
  ],
  pricingNote:
    "Ödənişli paketlər yalnız fermerlərə aiddir (onlar 1 ay pulsuz sınaqla başlayır). Laboratoriyalar üçün qoşulma, profil, kataloq və yazışma tam pulsuzdur — abunə haqqı və satış komissiyası yoxdur.",
  faqTitle: "Laboratoriyaların sualları",
  faq: [
    {
      q: "Qoşulmaq nə qədərdir?",
      a:
        "Laboratoriyalar üçün platforma tam pulsuzdur: qoşulma haqqı, aylıq abunə və sifariş komissiyası yoxdur. Ödənişli paketlər yalnız fermerlərə aiddir.",
    },
    {
      q: "Fermerlər məni necə tapır?",
      a:
        "Provayder kataloqunda ölkə, region və xidmət növü üzrə görünürsünüz. Yaxınlıqda torpaq analizi axtaran fermer filtri tətbiq edəndə profiliniz siyahıya düşür və birbaşa yaza bilir.",
    },
    {
      q: "Analiz nəticəsini necə çatdırıram?",
      a:
        "Nəticəni həmişəki qaydada — PDF və ya çap formasında — fermerə verirsiniz. Fermer həmin sənədi öz sahəsinə yükləyəndə sistem göstəriciləri oxuyub torpaq pasportuna yazır və AI tövsiyələrinə daxil edir.",
    },
    {
      q: "Fermerin sahə məlumatını görürəm?",
      a:
        "Yalnız fermerin özünün paylaşdığını. O, sahənin qısa kartını link ilə göndərə və ya sizi öz təşkilatına dəvət edə bilər. Bunlar olmadan sahə məlumatına giriş yoxdur.",
    },
    {
      q: "Zona-əsaslı nümunə üçün nə lazımdır?",
      a:
        "Fermerin sahəsində kifayət qədər peyk arxivi olmalıdır ki, çox-mövsümlü zonalar hesablansın. Sonra fermer zona xəritəsini sizinlə paylaşır və nümunə nöqtələrini həmin zonalara görə planlaşdırırsınız.",
    },
    {
      q: "Qiymətlərimi platformada göstərə bilərəmmi?",
      a:
        "Bəli — xidmətlərinizi və şərtlərinizi profil təsvirində göstərə bilərsiniz. Ödəniş prosesi platformadan kənarda, birbaşa sizinlə fermer arasında baş verir.",
    },
  ],
  cta: {
    title: "Laboratoriyanı fermerlərə göstər",
    sub: "Pulsuz qoşulma · birbaşa müraciət · region hədəfli görünürlük",
    label: "Pulsuz qoşul",
    href: "/signup",
  },
};

/* ------------------------------------------------------------- KONSULTANT */

const konsultant: Segment = {
  slug: "konsultant",
  label: "Konsultant",
  short: "Fermerlərə aqro-məsləhət verirəm",
  tabIcon: "users",
  accent: "#7A5BD0",
  badge: { text: "Pulsuz qoşul · abunə haqqı yoxdur", tone: "free" },
  eyebrow: "aqro-konsultantlar üçün",
  headline: "Təcrübəni miqyaslandır. Tövsiyəni rəqəmlə sübut et.",
  lead:
    "Müştərilərinizin sahələrini bir yerdən izləyin, hər sahə üçün hazır AI analizi ilə vaxta qənaət edin, mövsüm sonunda isə tövsiyənizin nəticəsini hesabatla göstərin. Komandanızı böyütmədən daha çox fermerə çatın — konsultantlar üçün platforma tam pulsuzdur.",
  primaryCta: { label: "Pulsuz qoşul", href: "/signup" },
  secondaryCta: { label: "Necə qazanırsan", href: "#nece-isleyir" },
  visual: "clients",
  metaTitle: "Aqro-konsultantlar üçün — Bağban AI",
  metaDescription:
    "Müştəri sahələrini bir yerdən izləyin, AI hazır analizi ilə sürətlənin, mövsüm nəticəsini hesabatla sübut edin. Konsultantlar üçün pulsuz.",
  cardBullets: [
    "Müştəri təşkilatları arasında bir kliklə keçid",
    "Hər sahə üçün hazır AI analizi — vaxta qənaət",
    "Mövsüm müqayisəsi və P&L ilə nəticənin sübutu",
  ],
  valueTitle: "Konsultant üçün burada nə var",
  valueSub:
    "Konsultantın darboğazı bilik deyil — vaxt və sübutdur. Platforma hər ikisini gücləndirir.",
  valuePoints: [
    {
      title: "Bütün müştərilər eyni metodologiya ilə",
      body:
        "Hər fermerin öz dəftəri, öz vərdişi olur. Burada isə bütün müştəri sahələri eyni indekslər, eyni sağlamlıq balı və eyni hesabat formatı ilə idarə olunur — müqayisə mümkün olur, iş isə təkrarlana bilən.",
    },
    {
      title: "Hazır analiz sizin işinizi qısaldır",
      body:
        "Hər yeni peyk səhnəsindən sonra sahə üçün strukturlu analiz — risklər, tövsiyələr, növbəti addımlar — hazır olur. Siz onu sıfırdan yazmırsınız; yoxlayır, düzəldir və öz təcrübənizi əlavə edirsiniz.",
    },
    {
      title: "Tövsiyənin nəticəsi rəqəmlə görünür",
      body:
        "Mövsüm müqayisəsi eyni təqvim günündə keçən illə fərqi göstərir, sağlamlıq balı vəziyyəti izah edir, dəftər isə xərc və gəliri sahə-sahə toplayır. «Yaxşı oldu» əvəzinə konkret mənzərə təqdim edirsiniz.",
    },
    {
      title: "Yeni müştəri kataloqdan gəlir",
      body:
        "Profiliniz provayder kataloqunda region və ixtisas üzrə görünür. Məsləhət axtaran fermer sizi tapıb birbaşa yazır — reklam büdcəsi olmadan.",
    },
    {
      title: "Uzaqdan da işləyir",
      body:
        "Sahəni görmək üçün hər dəfə yola düşmək lazım deyil. Peyk xəritəsi, fermerin çəkdiyi şəkillər, hava tarixçəsi və əməliyyat jurnalı ilk qiymətləndirməni uzaqdan aparmağa imkan verir — səfər isə həqiqətən lazım olanda edilir.",
    },
  ],
  stats: [
    { value: "Pulsuz", label: "konsultantlar üçün platforma — abunə haqqı yoxdur" },
    { value: "Limitsiz", label: "müştəri təşkilatı — hamısı arasında sürətli keçid" },
    { value: "Avtomatik", label: "hər yeni peyk səhnəsindən sonra hazır AI analizi" },
  ],
  stepsTitle: "Konsultant necə qazanır",
  stepsSub: "Standartlaşdır, AI ilə sürətləndir, nəticəni sübut et, müştərini saxla.",
  steps: [
    {
      title: "Standartlaşdır",
      body:
        "Müştəri sizi öz təşkilatına dəvət edir; siz təşkilatlar arasında keçid edərək bütün sahələri eyni göstəricilərlə izləyirsiniz.",
    },
    {
      title: "Sürətləndir",
      body:
        "Hər sahə üçün AI analizi hazır gəlir. Siz onu təsdiqləyir, düzəldir və müştəriyə öz imzanızla çatdırırsınız.",
    },
    {
      title: "Sübut et",
      body:
        "Mövsüm müqayisəsi, sağlamlıq balı və sahə-üzrə mənfəət hesabatı tövsiyənizin nəticəsini görünən edir.",
    },
    {
      title: "Saxla",
      body:
        "Dəyər mövsüm boyu davam etdiyi üçün müştəri bir dəfəlik məsləhətdən illik əməkdaşlığa keçir.",
    },
  ],
  featuresTitle: "Konsultantlar üçün alətlər",
  featuresSub: "Hamısı pulsuz — konsultantlar üçün ödənişli səviyyə yoxdur.",
  features: [
    {
      icon: "users",
      title: "Çox-müştəri iş sahəsi",
      body:
        "Müştəri sizi təşkilatına dəvət edəndə onun sahələri iş sahənizə düşür; təşkilatlar arasında yuxarıdakı keçidlə hərəkət edirsiniz.",
    },
    {
      icon: "map",
      title: "Sahələr xəritədə",
      body:
        "Masaüstündə bütün sahələr bir xəritədə: hansının vəziyyəti pisdirsə, ora birinci baxırsınız.",
    },
    {
      icon: "brain",
      title: "Hazır AI analizi",
      body:
        "Risklər şiddət dərəcəsi ilə, tövsiyələr və növbəti addımlar — hər sahə üçün avtomatik yenilənir.",
    },
    {
      icon: "chart",
      title: "Mövsüm müqayisəsi",
      body:
        "Eyni təqvim günündə keçən illə fərq, p10–p90 zolağı və trend — tövsiyənin təsirini göstərməyin ən sadə yolu.",
    },
    {
      icon: "shield",
      title: "Sağlamlıq balı — izahlı",
      body:
        "Bal necə yığıldığı göstərilir; giriş məlumatı çatmayanda çəkilər yenidən normallaşdırılır, uydurma rəqəm verilmir.",
    },
    {
      icon: "report",
      title: "Hesabatlar",
      body:
        "Mövsüm hesabatı, əməliyyat jurnalı, xərc hesabatı — çap üçün hazır və CSV kimi. Müştəri görüşünə hazır sənəd.",
    },
    {
      icon: "wallet",
      title: "İqtisadi mənzərə",
      body:
        "Sahə-üzrə xərc/gəlir və kateqoriya bölgüsü — tövsiyənin iqtisadi dəyərini rəqəmlə göstərin.",
    },
    {
      icon: "clock",
      title: "Tapşırıq zənciri və təqvim",
      body:
        "Əkin tarixindən avtomatik tapşırıq zənciri qurulur; tapşırıqları təqvim faylı kimi ixrac edib müştəri ilə paylaşırsınız.",
    },
    {
      icon: "message",
      title: "Birbaşa əlaqə",
      body:
        "Müştərilərinizlə platformada yazışın; fermer icmasında da iştirak edə, sual cavablaya bilərsiniz.",
    },
    {
      icon: "search",
      title: "Kataloqda görünürlük",
      body:
        "İxtisasınız (bağçılıq, fındıq, taxıl, üzümçülük, tərəvəz) və regionunuz üzrə yeni müştərilər sizi tapır.",
    },
  ],
  twoCol: {
    title: "İki tərəf üçün də qazanc",
    sub: "Konsultant vaxt qazanır və nəticəni sübut edir; fermer isə davamlı, izlənən dəstək alır.",
    leftTitle: "Konsultant üçün",
    leftItems: [
      "Bütün müştəri sahələri eyni göstəricilərlə bir yerdə",
      "Hazır AI analizi ilə hazırlıq vaxtının qısalması",
      "Uzaqdan ilkin qiymətləndirmə — səfər yalnız lazım olanda",
      "Hesabat və P&L ilə tövsiyənin dəyərinin sübutu",
      "Kataloqda region və ixtisas üzrə yeni müştəri axını",
    ],
    rightTitle: "Fermer üçün",
    rightItems: [
      "Konsultant sahəni bir baxışda görür — izahat vaxtı qısalır",
      "Tövsiyələr yazılı qalır və tarixçədə saxlanılır",
      "Tapşırıqlar təqvimə düşür, unudulmur",
      "Mövsüm sonunda nəticə rəqəmlə görünür",
      "Konsultantla eyni ekranda danışırlar — anlaşılmazlıq azalır",
    ],
  },
  proof: {
    label: "Nümunə ssenari — illüstrasiya, ölçülmüş nəticə deyil",
    title: "Bir konsultantın həftəsi necə qurula bilər",
    body:
      "Aşağıda platformanın konsultant üçün real iş axını göstərilir. Sahə sayı və vaxtlar izah üçün seçilib.",
    timeline: [
      { when: "Bazar ertəsi səhər", what: "Bütün müştəri təşkilatları gözdən keçirilir; vəziyyəti pisləşən sahələr önə çıxır." },
      { when: "Bazar ertəsi günorta", what: "Hər problemli sahə üçün hazır AI analizi oxunur, öz təcrübəsi ilə düzəliş edilir və müştəriyə göndərilir." },
      { when: "Çərşənbə axşamı", what: "Yalnız həqiqətən yerində baxılmalı olan iki sahəyə səfər planlaşdırılır — qalanı uzaqdan həll olunur." },
      { when: "Cümə", what: "Tapşırıqlar müştərinin təqviminə ixrac olunur; həftəlik qısa hesabat paylaşılır." },
      { when: "Mövsüm sonu", what: "Mövsüm müqayisəsi və sahə-üzrə mənfəət hesabatı ilə tövsiyələrin nəticəsi təqdim edilir." },
    ],
    note:
      "AI konsultantı əvəz etmir: o, ilkin analizi hazırlayır, qərar və məsuliyyət mütəxəssisdə qalır.",
  },
  deepTitle: "Necə qurulub",
  deepSub: "Konsultantın müştəri sahələrinə girişi necə işləyir və hansı alətlərlə bağlıdır.",
  deep: [
    {
      icon: "users",
      title: "Giriş modeli",
      body:
        "Müştəri sizi öz təşkilatına dəvət edir və rol təyin edir. Yalnız dəvət edildiyiniz təşkilatların məlumatını görürsünüz — icazəsiz giriş yoxdur.",
      bullets: [
        "Dəvət linki ilə qoşulma",
        "Təşkilatlar arasında sürətli keçid",
        "Rol əsasında icazələr",
        "Müştəri istənilən vaxt girişi dayandıra bilər",
      ],
    },
    {
      icon: "brain",
      title: "Analiz axını",
      body:
        "Peyk səhnəsi düşəndə sahə üçün analiz avtomatik yenilənir. Analiz sahənin bütün kontekstini — hava, torpaq, əməliyyat, şəkillər — nəzərə alır.",
      bullets: [
        "Risklər şiddət dərəcəsi ilə",
        "Tövsiyələr və növbəti addımlar",
        "Sahə kontekstini xatırlayan söhbət",
        "Dəqiqləşdirici suallar",
      ],
    },
    {
      icon: "report",
      title: "Sübut və hesabat",
      body:
        "Mövsüm müqayisəsi, sağlamlıq balı və dəftər məlumatı birlikdə müştəri üçün başa düşülən hesabat verir.",
      bullets: [
        "Çap üçün hazır hesabatlar və CSV ixracı",
        "Sahə-üzrə xərc/gəlir və kateqoriya bölgüsü",
        "Əməliyyat jurnalı",
        "Paylaşma linki ilə qısa sahə kartı",
      ],
    },
  ],
  pricingNote:
    "Ödənişli paketlər yalnız fermerlərə aiddir (onlar 1 ay pulsuz sınaqla başlayır). Aqro-konsultantlar üçün qoşulma, profil, çox-müştəri girişi və yazışma tam pulsuzdur.",
  faqTitle: "Konsultantların sualları",
  faq: [
    {
      q: "AI məni əvəz edəcək?",
      a:
        "Xeyr. AI ilkin analizi hazırlayır — məlumatı yığır, riskləri sıralayır, tövsiyə qaralaması verir. Yekun qərar, məsuliyyət və müştəri ilə münasibət sizdə qalır. Praktikada AI hazırlıq vaxtınızı qısaldır, yəni daha çox müştəriyə çata bilirsiniz.",
    },
    {
      q: "Qoşulmaq nə qədərdir?",
      a:
        "Konsultantlar üçün platforma tam pulsuzdur — qoşulma haqqı, abunə və komissiya yoxdur. Ödənişli paketlər yalnız fermerlərə aiddir.",
    },
    {
      q: "Müştərimin sahələrini necə görürəm?",
      a:
        "Fermer sizi öz təşkilatına dəvət edir və rol təyin edir. Bundan sonra həmin təşkilatın sahələri iş sahənizdə görünür və təşkilatlar arasında keçid edə bilirsiniz. Dəvət olmadan heç bir məlumata giriş yoxdur.",
    },
    {
      q: "Neçə müştəri idarə edə bilərəm?",
      a:
        "Say məhdudiyyəti qoymuruq. Dəvət olunduğunuz bütün təşkilatlar arasında keçid edirsiniz.",
    },
    {
      q: "Nəticəni müştəriyə necə sübut edirəm?",
      a:
        "Mövsüm müqayisəsi (eyni təqvim günündə keçən illə fərq), izahlı sağlamlıq balı, əməliyyat jurnalı və sahə-üzrə xərc/gəlir hesabatı ilə. Hamısı çap üçün hazır formada ixrac olunur.",
    },
    {
      q: "Öz müştərilərimi platformaya necə gətirim?",
      a:
        "Fermer özü qeydiyyatdan keçir (1 ay pulsuz sınaqla) və sizi təşkilatına dəvət edir. Sahəni onunla birlikdə bir neçə dəqiqəyə qeyd edə bilərsiniz — kadastr sənədi və ya koordinat lazım deyil.",
    },
  ],
  cta: {
    title: "Daha çox fermerə çat — komandanı böyütmədən",
    sub: "Pulsuz platforma · hazır AI analizi · sübut hesabatları",
    label: "Pulsuz qoşul",
    href: "/signup",
  },
};

/* ------------------------------------------------------------- TƏCHİZATÇI */

const techizatci: Segment = {
  slug: "techizatci",
  label: "Təchizatçı",
  short: "Toxum, gübrə, dərman və texnika satıram",
  tabIcon: "package",
  accent: "#C07A1F",
  badge: { text: "Pulsuz qoşul · komissiya yoxdur", tone: "free" },
  eyebrow: "təchizatçılar üçün",
  headline: "Kataloqunu fermerin qərar verdiyi yerə qoy.",
  lead:
    "Toxum, gübrə, bitki mühafizə vasitələri və texnika kataloqunuzu platformada yerləşdirin. Fermerlər ixtisas və region üzrə sizi tapıb birbaşa tələb göndərsin — vasitəçi və komissiya olmadan. Bir dəfəlik satışı mövsüm-boyu münasibətə çevirin: brendiniz fermerin hər gün açdığı ekranda qalır. Təchizatçılar üçün platforma tam pulsuzdur.",
  primaryCta: { label: "Pulsuz qoşul", href: "/signup" },
  secondaryCta: { label: "Necə işləyir", href: "#nece-isleyir" },
  visual: "catalog",
  metaTitle: "Təchizatçılar üçün — Bağban AI",
  metaDescription:
    "Toxum, gübrə, dərman və texnika kataloqunuzu fermerlərə çatdırın: pulsuz kataloq, region üzrə hədəflənmiş görünürlük, birbaşa tələb, komissiyasız.",
  cardBullets: [
    "Pulsuz məhsul kataloqu — komissiya yoxdur",
    "Region və ixtisas üzrə hədəflənmiş görünürlük",
    "Fermerdən birbaşa tələb və yazışma",
  ],
  valueTitle: "Təchizatçı üçün burada nə var",
  valueSub:
    "Fermer məhsulunuzu axtaranda çox vaxt artıq qərar verib — sual yalnız kimdən alacağıdır. Məqsəd həmin anda görünməkdir.",
  valuePoints: [
    {
      title: "Doğru fermerə, doğru anda görünürsünüz",
      body:
        "Kataloqda ölkə, region və ixtisas üzrə filtrlənirsiniz. Yəni məhsulunuzu ala biləcək, əhatə etdiyiniz ərazidəki fermerlər sizi görür — kütləvi reklam deyil, hədəflənmiş görünürlük.",
    },
    {
      title: "Vasitəçi və komissiya yoxdur",
      body:
        "Fermer birbaşa sizə yazır, şərtləri özünüz razılaşdırırsınız. Platforma satışdan pay götürmür və ödəniş prosesinə qarışmır — münasibət sizinlə müştəri arasındadır.",
    },
    {
      title: "Bir satış deyil, bütün mövsüm",
      body:
        "Fermer platformada gündəlik işləyir: sahəni izləyir, gübrə planını yazır, tapşırıq qurur. Profiliniz və yazışma tarixçəniz orada qaldığı üçün növbəti ehtiyacda axtarış yenidən başlamır.",
    },
    {
      title: "Kataloqu özünüz idarə edirsiniz",
      body:
        "Məhsul əlavə etmək, təsviri və qiyməti yeniləmək, mövsümə görə çeşidi dəyişmək — hamısı öz panelinizdən, dərhal. Heç bir moderasiya gözləməsi və ya illik müqavilə yoxdur.",
    },
  ],
  stats: [
    { value: "Pulsuz", label: "profil və məhsul kataloqu — abunə haqqı yoxdur" },
    { value: "0%", label: "komissiya — satış birbaşa sizinlə fermer arasındadır" },
    { value: "Hədəfli", label: "region və ixtisas üzrə fermer görünürlüyü" },
  ],
  stepsTitle: "4 addımda fermerlərə çatın",
  stepsSub: "Qeydiyyatdan ilk məhsulun kataloqda görünməsinə qədər bir neçə dəqiqə.",
  steps: [
    {
      title: "İxtisasınızı seçin",
      body:
        "Qeydiyyatda «Təchizatçı» rolunu seçib ixtisaslaşmanı işarələyin: toxum, gübrə, dərman, texnika, suvarma avadanlığı, xidmət — çoxlu seçim mümkündür.",
    },
    {
      title: "Kataloqu doldurun",
      body:
        "Məhsulları ad, təsvir, kateqoriya və qiymətlə əlavə edin. İstənilən vaxt redaktə edirsiniz — mövsüm dəyişəndə çeşid də dəyişir.",
    },
    {
      title: "Fermerlərə görünün",
      body:
        "Profiliniz kataloqda ölkə, region və ixtisas filtrləri ilə tapılır. Əhatə etdiyiniz ərazidəki fermerlər sizi görür.",
    },
    {
      title: "Tələb alın",
      body:
        "Fermer birbaşa yazır: hansı məhsul, nə qədər, nə vaxt. Yazışma platformada qalır və mövsüm boyu davam edir.",
    },
  ],
  featuresTitle: "Təchizatçılar üçün alətlər",
  featuresSub: "Hamısı pulsuz paketin içindədir — təchizatçılar üçün ödənişli səviyyə yoxdur.",
  features: [
    {
      icon: "boxes",
      title: "Çox-ixtisaslı kataloq",
      body:
        "Toxum, gübrə, bitki mühafizə vasitələri, texnika, suvarma avadanlığı və xidmətlər — hamısı bir profildə.",
    },
    {
      icon: "store",
      title: "Şirkət profili",
      body:
        "Şirkət adı, ünvan, əhatə zonası və əlaqə. Fermer kiminlə işlədiyini profildən görür.",
    },
    {
      icon: "target",
      title: "Region və ixtisas hədəfi",
      body:
        "Yalnız əhatə etdiyiniz ərazidəki və uyğun kateqoriya axtaran fermerlərin qarşısına çıxırsınız.",
    },
    {
      icon: "message",
      title: "Birbaşa tələb",
      body:
        "Fermer platformadan yazır, siz cavab verirsiniz. Vasitəçi, komissiya və üçüncü tərəf yoxdur.",
    },
    {
      icon: "clock",
      title: "Mövsüm-boyu əlaqə",
      body:
        "Yazışma tarixçəsi qalır; təkrar sifariş üçün fermer sizi yenidən axtarmır, birbaşa yazır.",
    },
    {
      icon: "sprout",
      title: "Gübrə planı kontekstində",
      body:
        "Fermerlər gübrələmə qrafikini və AI doza təklifini platformada görür — ehtiyac formalaşan anda kataloq bir kliklə əlçatandır.",
    },
    {
      icon: "search",
      title: "Kataloq axtarışı",
      body:
        "Fermer məhsul kateqoriyası və region üzrə axtarır; profiliniz nəticələrdə çıxır.",
    },
    {
      icon: "globe",
      title: "Qafqaz üzrə əhatə",
      body:
        "Ölkə və region sahələri qeydiyyatda göstərilir — yalnız Azərbaycan deyil, əhatə etdiyiniz digər bazarlar da.",
    },
    {
      icon: "brain",
      title: "AI tövsiyəsi ilə birbaşa bağlantı",
      body:
        "AI konkret gübrə və ya preparat ehtiyacı göstərəndə kataloqunuzdakı uyğun məhsulun avtomatik təklif olunması.",
      soon: true,
    },
  ],
  twoCol: {
    title: "İki tərəf üçün də qazanc",
    sub: "Təchizatçı hədəfli müştəriyə çıxır, fermer isə lazım olan məhsulu doğru vaxtda tapır.",
    leftTitle: "Təchizatçı üçün",
    leftItems: [
      "Kataloq əhatə etdiyiniz regionda hədəfli görünür",
      "Birbaşa tələb — vasitəçi və komissiya yoxdur",
      "Brend mövsüm boyu fermerin ekranında qalır",
      "Çeşidi özünüz, dərhal yeniləyirsiniz",
      "Profil və kataloq tam pulsuzdur",
    ],
    rightTitle: "Fermer üçün",
    rightItems: [
      "Lazım olan məhsulu doğru vaxtda tapır",
      "Yaxın və etibarlı təchizatçı ilə birbaşa danışır",
      "Sifariş və məsləhət eyni platformada",
      "Alınan materiallar dəftərə və xərc hesabına düşür",
      "Anbar qalığı əməliyyatdan avtomatik azalır",
    ],
  },
  proof: {
    label: "Nümunə ssenari — illüstrasiya, ölçülmüş nəticə deyil",
    title: "Bir tələbin yolu",
    body:
      "Platformada təchizatçı ilə fermer arasındakı əlaqənin necə qurulduğu. Rəqəmlər izah üçündür.",
    timeline: [
      { when: "Addım 1", what: "Fermer sahəsində zəifləyən zonanı görür və AI analizində qidalanma ilə bağlı tövsiyə oxuyur." },
      { when: "Addım 2", what: "Gübrələmə qrafikini yazır və doza təklifini alır — nə lazım olduğu artıq aydındır." },
      { when: "Addım 3", what: "Kataloqu açıb öz regionunda uyğun ixtisaslı təchizatçıları görür və profilinizə keçir." },
      { when: "Addım 4", what: "Birbaşa yazır: məhsul, həcm, çatdırılma vaxtı. Yazışma platformada qalır." },
      { when: "Addım 5", what: "Materialı alandan sonra əməliyyatı və xərci dəftərə yazır — anbar qalığı avtomatik azalır. Növbəti ehtiyacda sizi yenidən tapır." },
    ],
    note:
      "Platforma ödəniş və çatdırılma prosesinə qarışmır: razılaşma birbaşa sizinlə fermer arasındadır.",
  },
  deepTitle: "Necə qurulub",
  deepSub: "Kataloq və müraciət axını hansı hissələrdən ibarətdir.",
  deep: [
    {
      icon: "boxes",
      title: "Kataloq idarəsi",
      body:
        "Öz panelinizdən məhsul əlavə edir, redaktə edir və gizlədirsiniz. Kateqoriya, təsvir və qiymət sahələri fermerin axtarışına düşür.",
      bullets: [
        "Çoxlu ixtisaslaşma seçimi",
        "Məhsulun kateqoriya və qiyməti",
        "Dərhal dərc — moderasiya gözləməsi yoxdur",
        "Mövsümə görə çeşidin yenilənməsi",
      ],
    },
    {
      icon: "search",
      title: "Görünürlük",
      body:
        "Fermerlər kataloqda ölkə, region və ixtisas üzrə filtrləyir. Profiliniz həmin nəticələrdə çıxır və birbaşa yazışmaya açıqdır.",
      bullets: [
        "Ölkə və region filtri",
        "İxtisas (toxum, gübrə, dərman, texnika) filtri",
        "Profil səhifəsi və məhsul siyahısı",
        "Birbaşa yazışma düyməsi",
      ],
    },
    {
      icon: "message",
      title: "Tələb və yazışma",
      body:
        "Bütün müraciətlər bir yerdə toplanır; yazışma tarixçəsi mövsüm boyu saxlanılır.",
      bullets: [
        "Komissiya alınmır",
        "Ödəniş platformadan kənarda, sizin şərtlərinizlə",
        "Bildirişlər yeni müraciətdə",
        "Təkrar sifariş üçün hazır kontekst",
      ],
    },
  ],
  pricingNote:
    "Ödənişli paketlər yalnız fermerlərə aiddir (onlar 1 ay pulsuz sınaqla başlayır). Təchizatçılar üçün qoşulma, şirkət profili, məhsul kataloqu və yazışma tam pulsuzdur — satışdan komissiya götürülmür.",
  faqTitle: "Təchizatçıların sualları",
  faq: [
    {
      q: "Qoşulmaq və satış nə qədərdir?",
      a:
        "Təchizatçılar üçün platforma və kataloq tam pulsuzdur. Satışdan komissiya alınmır — fermer birbaşa sizinlə işləyir. Ödənişli paketlər yalnız fermerlərə aiddir.",
    },
    {
      q: "Fermerlər məni necə tapır?",
      a:
        "Kataloqda ölkə, region və ixtisas (toxum, gübrə, dərman, texnika, suvarma avadanlığı, xidmət) üzrə filtrlə tapılırsınız. Fermer profilinizə keçib birbaşa yaza bilir.",
    },
    {
      q: "Kataloqumu necə yerləşdirim?",
      a:
        "Qeydiyyatda ixtisaslaşmanı seçirsiniz, sonra öz panelinizdən məhsulları ad, təsvir, kateqoriya və qiymətlə əlavə edirsiniz. Dəyişikliklər dərhal görünür.",
    },
    {
      q: "Sifariş və ödəniş platformada olur?",
      a:
        "Xeyr. Platforma tanışlıq və yazışma qatıdır: fermer sizə tələb göndərir, şərtləri, ödənişi və çatdırılmanı isə özünüz razılaşdırırsınız. Bu, komissiyanın olmamasının da səbəbidir.",
    },
    {
      q: "Hansı ölkələrdə işləyir?",
      a:
        "Əsas fokus Azərbaycan və Qafqazdır, lakin qeydiyyatda ölkə və region göstərildiyi üçün əhatə etdiyiniz digər bazarlarda da görünə bilərsiniz.",
    },
    {
      q: "Rəqiblərimlə eyni siyahıda görünəcəyəm?",
      a:
        "Bəli — kataloq açıq və filtrlənəndir. Fərqi profilinizin dolğunluğu, çeşidiniz və cavab sürətiniz yaradır. Ödənişli «yuxarı çıxarma» satmırıq.",
    },
  ],
  cta: {
    title: "Kataloqunu fermerlərə çatdır",
    sub: "Pulsuz kataloq · komissiya yoxdur · birbaşa tələb · region hədəfli",
    label: "Pulsuz qoşul",
    href: "/signup",
  },
};

/* ------------------------------------------------------------------ index */

export const SEGMENTS: Record<SegmentSlug, Segment> = {
  fermer,
  laboratoriya,
  konsultant,
  techizatci,
};

export const SEGMENT_ORDER: SegmentSlug[] = ["fermer", "laboratoriya", "konsultant", "techizatci"];

export const SEGMENT_LIST: Segment[] = SEGMENT_ORDER.map((s) => SEGMENTS[s]);

export function getSegment(slug: string): Segment | null {
  return (SEGMENTS as Record<string, Segment | undefined>)[slug] ?? null;
}

/** Copy for the /solutions index page (Server Component — plain data, no t()). */
export const INDEX_COPY = {
  eyebrow: "həllər",
  title: "Hər rol üçün ayrı həll",
  lead:
    "Bağban AI tək-tərəfli bir alət deyil: fermer sahəsini izləyir, laboratoriya nümunə götürür, konsultant tövsiyə verir, təchizatçı isə materialı çatdırır — hamısı eyni platformada, eyni sahə məlumatı ətrafında. Rolunuzu seçin və sizin üçün nə dəyişdiyini görün.",
  pricingTitle: "Kim ödəyir?",
  pricingBody:
    "Yalnız fermerlər. Onlar da 1 ay tam pulsuz sınaqla başlayır — kart lazım deyil, sınaq bitəndə avtomatik pul çıxılmır. Laboratoriya, aqro-konsultant və təchizatçılar üçün platforma tam pulsuzdur: qoşulma haqqı, abunə və satış komissiyası yoxdur.",
  pricingLink: { label: "Fermer paketlərinə bax", href: "/pricing" },
  ctaTitle: "Rolunu seç və bu gün başla",
  ctaSub: "Fermerlər üçün 1 ay pulsuz · provayderlər üçün həmişə pulsuz",
  ctaLabel: "Hesab yarat",
  ctaHref: "/signup",
} as const;
