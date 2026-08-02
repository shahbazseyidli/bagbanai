import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "what-is-ndvi",
  locale: "az",
  title: "NDVI nədir? Dəyərlər cədvəli ilə sadə izahat",
  description:
    "NDVI bitki örtüyünün sıxlığını −1-dən +1-ə qədər ölçən peyk indeksidir. 0.2, 0.4, 0.7 nə deməkdir — dəyərlər cədvəli, real sahə nümunələri və tez-tez edilən 3 səhv.",
  lead:
    "NDVI (Normalized Difference Vegetation Index) — peyk şəklindən hesablanan və bitki örtüyünün nə qədər sıx, nə qədər sağlam olduğunu göstərən rəqəmdir. Şkalası −1-dən +1-ə qədərdir: çılpaq torpaq 0.1-ə yaxın, sağlam sıx əkin isə 0.6-dan yuxarı qiymət alır. Bir cümlə ilə: NDVI nə qədər yüksəkdirsə, sahədə fotosintez edən yaşıl kütlə bir o qədər çoxdur.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Bu rəqəm haradan gəlir?",
      paragraphs: [
        "Sağlam yarpaq qırmızı işığı udur (fotosintez üçün), yaxın-infraqırmızı işığı isə güclü əks etdirir. NDVI məhz bu iki kanalın fərqini normallaşdırır: (NIR − Qırmızı) / (NIR + Qırmızı). Sentinel-2 peyki hər iki kanalı 10 metrlik pikselle çəkir — yəni sahənizin hər 10×10 metrlik hissəsi üçün ayrıca qiymət alırsınız.",
        "Düstur sadə olsa da, gücü müqayisədədir: eyni sahənin bu həftəki NDVI-ı ilə iki həftə əvvəlki NDVI-ı arasındakı fərq, sahənin içindəki zəif ləkə ilə güclü hissə arasındakı fərq — aqronomik qərar məhz bunlardan çıxır.",
      ],
    },
    {
      heading: "NDVI dəyərləri cədvəli",
      paragraphs: [
        "Aşağıdakı bantlar istiqamət göstəricisidir — buğda ilə fındıq bağının \"normal\"ı eyni deyil, mövsümün əvvəli ilə ortası da fərqlənir. Ona görə cədvəli mütləq öz sahənizin tarixçəsi ilə birlikdə oxuyun.",
      ],
      table: {
        headers: ["NDVI", "Nə deməkdir", "Sahədə tipik mənzərə"],
        rows: [
          ["< 0.1", "Bitki örtüyü yoxdur", "Çılpaq torpaq, su, şum"],
          ["0.1 – 0.2", "Çox seyrək örtük", "Yeni çıxış, güclü seyrəklik"],
          ["0.2 – 0.35", "Zəif örtük", "Erkən mərhələ və ya stress"],
          ["0.35 – 0.5", "Orta örtük", "İnkişaf gedir, nəzarət lazımdır"],
          ["0.5 – 0.7", "Yaxşı örtük", "Sağlam, aktiv vegetasiya"],
          ["> 0.7", "Çox sıx örtük", "Pik vegetasiya, sıx çətir"],
        ],
      },
    },
    {
      heading: "Real nümunə: 0.3 pisdir, yoxsa normal?",
      paragraphs: [
        "Cavab mərhələdən asılıdır. Aran bölgəsində payızlıq buğda dekabrda 0.3 göstərirsə, bu normaldır — bitki hələ kollanma mərhələsindədir. Həmin buğda may ayında da 0.3-də qalıbsa, bu artıq siqnaldır: ya su çatışmır, ya qida, ya da xəstəlik başlayıb. Qax–Zaqatala fındıq bağında isə yayın ortasında 0.3 demək olar ki, həmişə problem deməkdir — sıx çətirli sağlam bağ 0.6-dan aşağı düşməməlidir.",
        "Bizim izlədiyimiz sahələrdə ən faydalı sual \"NDVI neçədir?\" yox, \"NDVI hara doğru gedir?\" olub. Eyni 0.45 qiyməti yüksələn xətt üzərindədirsə arxayınlıq, düşən xətt üzərindədirsə yoxlama səbəbidir.",
      ],
    },
    {
      heading: "Üç tipik səhv",
      bullets: [
        "Tək günə baxmaq. Bir səhnədəki qiymət bulud kölgəsindən və ya sensor bucağından təsirlənə bilər — həmişə trendə baxın.",
        "Sahələri bir-biri ilə müqayisə etmək. Fərqli məhsul, fərqli əkin tarixi, fərqli torpaq — NDVI müqayisəsi yalnız eyni sahənin öz tarixçəsi daxilində etibarlıdır.",
        "NDVI-ı \"sağlamlıq faizi\" kimi oxumaq. 0.6 = 60% sağlam demək DEYİL. İndeks örtüyün sıxlığını ölçür; sıx amma susuz qalmış əkin bir müddət yüksək NDVI göstərməyə davam edə bilər.",
      ],
    },
    {
      heading: "Öz sahənizdə necə baxmalı?",
      paragraphs: [
        "Agradex-də sahənizi xəritədə bir toxunuşla qeyd edirsiniz, sistem Sentinel-2 arxivini yükləyir və hər yeni buludsuz keçiddə NDVI xəritəsi ilə yanaşı 0-100 vəziyyət qiyməti hesablayır. Qeydiyyatsız baxmaq üçün canlı nümunə sahə də var — real fermerin sahəsi, real peyk datası ilə.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "free-ndvi-map"],
};
