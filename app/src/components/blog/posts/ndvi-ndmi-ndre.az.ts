import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-ndmi-ndre",
  locale: "az",
  title: "NDVI, NDMI, NDRE — fərq nədir və hansına nə vaxt baxmalı?",
  description:
    "NDVI örtüyün sıxlığını, NDMI bitkidəki nəmliyi, NDRE isə azot-xlorofil vəziyyətini göstərir. Üçünün birlikdə oxunuşu — hansı suala hansı indeks cavab verir.",
  lead:
    "Üç indeks üç fərqli suala cavab verir. NDVI: \"örtük nə qədər sıxdır?\" NDMI: \"bitkinin içində su varmı?\" NDRE: \"yarpaqda xlorofil (praktikada — azot qidalanması) hansı səviyyədədir?\" Ən çox səhv NDVI-ı hər üç sualın cavabı kimi oxumaqdan çıxır — sıx amma susuz əkin NDVI-da hələ yaxşı görünə bilər, NDMI isə artıq düşməyə başlayıb.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Bir baxışda müqayisə",
      table: {
        headers: ["İndeks", "Nəyi ölçür", "Hansı sualda işə yarayır", "Tipik diapazon"],
        rows: [
          ["NDVI", "Yaşıl kütlənin sıxlığı", "Ümumi vəziyyət, zəif zonalar, trend", "0.1 – 0.8"],
          ["NDMI", "Bitki toxumasındakı nəmlik", "Su stressi suvarmadan ƏVVƏL", "−0.2 – 0.4"],
          ["NDRE", "Xlorofil / azot siqnalı", "Gübrə vaxtı, sıx çətirdə incə fərqlər", "0.1 – 0.5"],
        ],
      },
    },
    {
      heading: "NDMI: su stressini NDVI-dan tez görür",
      paragraphs: [
        "NDMI yaxın-infraqırmızı ilə qısa-dalğa infraqırmızı kanalları müqayisə edir; su qısa-dalğa infraqırmızını udduğu üçün indeks birbaşa toxumadakı nəmliyə həssasdır. Praktik diapazonu təxminən −0.20-dən 0.40-a qədərdir: yaşıl, su ilə dolu əkin müsbət tərəfdə, quruyan örtük sıfırın altında olur.",
        "Real hadisə: izlədiyimiz sahələrdən birində NDVI hələ \"orta\" görünərkən NDMI −0.13-ə düşmüşdü — bitki örtüyü formasını saxlayır, amma su ehtiyatı tükənirdi. Bu, suvarma qərarını NDVI-ın göstərəcəyindən 1-2 keçid əvvəl verməyə imkan verən siqnaldır.",
      ],
    },
    {
      heading: "NDRE: NDVI \"doyanda\" işə düşür",
      paragraphs: [
        "Pik vegetasiyada sıx çətir NDVI-ı 0.8-ə yaxın \"tavana\" dirəyir — bundan sonra sahə daxilindəki fərqlər NDVI-da itir. NDRE qırmızı-kənar (red edge) kanalından istifadə etdiyi üçün məhz bu doyma zonasında ayırd etməyə davam edir: hansı zolağın azot qidalanması geri qalır, yem gübrəsini hara yönəltmək lazımdır.",
        "Buğdada boruya çıxma – sünbülləmə aralığında, fındıqda isə yayın birinci yarısında NDRE fərqləri gübrə planı üçün ən faydalı siqnaldır.",
      ],
    },
    {
      heading: "Praktik oxu qaydası",
      bullets: [
        "Hər keçiddə əvvəl NDVI trendinə baxın: düşürsə — səbəb axtarın.",
        "NDVI normal, amma hava isti-qurudursa — NDMI-a baxın: su stressi əvvəl orada görünür.",
        "NDVI yüksək və bərabərdirsə, sahə daxili fərq axtarırsınızsa — NDRE xəritəsini açın.",
        "Üç indeks eyni istiqamətdə pisləşirsə, məsələ lokal deyil — su, kök və ya xəstəlik səviyyəsində ciddi yoxlama lazımdır.",
      ],
    },
    {
      heading: "Agradex-də necə görünür?",
      paragraphs: [
        "Hər sahə üçün doqquz indeks hesablanır, xəritə qatı kimi bir toxunuşla dəyişir və hər birinin yanında sadə izahat verilir. AI analiz isə üç indeksin uyğunsuzluqlarını özü tutub risk siqnalı kimi göstərir — \"NDVI sabitdir, amma NDMI 10 gündür düşür\" tipli cümlə hazır gəlir.",
      ],
    },
  ],
  related: ["what-is-ndvi", "when-to-irrigate-wheat"],
};
