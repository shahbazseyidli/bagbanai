import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "free-ndvi-map",
  locale: "az",
  title: "Sahəni peykdən pulsuz izləmək: 3 real yol",
  description:
    "NDVI xəritəsinə pulsuz baxmağın üç işlək yolu: Copernicus Browser, OneSoil və Agradex. Hər birinin güclü və zəif tərəfi — dürüst müqayisə, satış mətni yox.",
  lead:
    "Sahəni peykdən izləmək üçün pul ödəmək şərt deyil — Sentinel-2 məlumatı açıqdır və onun üzərində qurulmuş bir neçə pulsuz alət var. Aşağıda üç işlək yol var: biri xam məlumat üçün rəsmi brauzer, biri tanınmış beynəlxalq tətbiq, biri bizim öz platformamız. Üçünü də dürüst yazırıq — hansının kimə uyğun olduğu ilə birlikdə.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "1. Copernicus Browser — xam mənbənin özü",
      paragraphs: [
        "Avropa Kosmik Agentliyinin rəsmi brauzeri istənilən Sentinel-2 səhnəsini açmağa, NDVI qatını çəkməyə və tarixçəyə baxmağa imkan verir. Tamamilə pulsuzdur və məlumatın birinci əlidir.",
        "Zəif tərəfi: alət tədqiqatçılar üçün qurulub. Sahə sərhədi saxlamır, bulud maskasını özünüz düşünməlisiniz, \"bu rəqəm mənim üçün nə deməkdir\" sualına cavab vermir. Həftədə bir dəfə əl ilə yoxlama səbr istəyir.",
      ],
    },
    {
      heading: "2. OneSoil — tanınmış beynəlxalq tətbiq",
      paragraphs: [
        "Uzun illər tam pulsuz olan OneSoil sahə çəkib NDVI-a baxmaq üçün milyonlarla fermerin ilk tanışlığı olub. Sadə interfeysi və mobil tətbiqi güclü tərəfidir.",
        "Nəzərə alınmalı: 2026-cı ildə mobil tətbiq freemium modelə keçdi — pulsuz hissə daralıb və bəzi funksiyalar abunəyə bağlanıb. Azərbaycan dili yoxdur, məsləhət qatı isə ümumi xarakterlidir.",
      ],
    },
    {
      heading: "3. Agradex — bizim yol: xəritə + izahat",
      paragraphs: [
        "Agradex-də pulsuz paketə sahənin peyk xəritəsi (NDVI daxil doqquz indeks), 0-100 vəziyyət qiyməti və aqro-hava daxildir. Sahəni xəritədə bir toxunuşla qeyd edirsiniz — kadastr sənədi, koordinat lazım deyil. AI aqronom məsləhəti üçün 1 aylıq pulsuz sınaq var, bank kartı istənmir.",
        "Fərqimiz mövqedədir: xəritəni göstərib \"özün yozarsan\" demirik — interfeys 8 dildədir (Azərbaycan dili daxil), hər indeksin yanında sadə izahat var və buludlu keçidlər də açıq göstərilir ki, \"şəkil niyə gəlmədi\" sualı cavabsız qalmasın. Qeydiyyatdan əvvəl sınamaq üçün canlı nümunə sahə açıqdır — real fermerin sahəsi, real peyk axını.",
      ],
    },
    {
      heading: "Hansı yol kimə uyğundur?",
      table: {
        headers: ["Ehtiyac", "Uyğun seçim"],
        rows: [
          ["Xam səhnələr, elmi iş, tam nəzarət", "Copernicus Browser"],
          ["Beynəlxalq tətbiq təcrübəsi, sadə NDVI baxışı", "OneSoil"],
          ["Ana dilində izahat + vəziyyət qiyməti + hava bir yerdə", "Agradex"],
        ],
      },
    },
    {
      heading: "Pulsuz yolun dürüst həddi",
      paragraphs: [
        "Hansı aləti seçsəniz də, fizika eynidir: Sentinel-2 hər ~5 gündə keçir, buludlu keçid şəkil vermir, 10 metrlik piksel tək ağacı göstərmir. Pulsuz alətlərin fərqi məlumatda deyil, onu nə qədər başa düşülən təqdim etməkdədir.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency"],
};
