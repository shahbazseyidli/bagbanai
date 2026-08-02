import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "farm-apps-comparison",
  locale: "az",
  title: "Fermer üçün tətbiqlər: 5 real seçim — dürüst müqayisə",
  description:
    "Fermer tətbiqləri müqayisəsi: DrAgro, Agrohub, OneSoil, Copernicus Browser və Agradex — hər birinin güclü tərəfi və limiti, ehtiyaca görə seçim cədvəli ilə.",
  lead:
    "«Ən yaxşı fermer tətbiqi» yoxdur — işlək sual «mənim ehtiyacıma hansı uyğundur?» sualıdır. Aşağıda beş real seçim: ikisi Azərbaycan bazarından, ikisi beynəlxalq, biri bizim öz platformamız. Hamısı üçün eyni iki cavabı veririk: nəyə görə yaxşıdır və limiti nədir — şişirtmədən, rəqibi kiçiltmədən.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "DrAgro — cibdə aqro məsləhət (AZ)",
      paragraphs: [
        "Yerli komandanın Azərbaycan fermeri üçün qurduğu məsləhət və məlumat tətbiqi. Güclü tərəfi yerli reallığı tanımasıdır: bölgələr, məhsullar, mövsüm — hamısı ana dilində və bizim bazarın dilində.",
        "Limiti: sahə-səviyyəli peyk monitorinqi onun mərkəzi işi deyil. Sahənizin NDVI trendini həftəbəhəftə izləmək üçün ayrıca alət lazım olacaq.",
      ],
    },
    {
      heading: "Agrohub — aqro xidmət ekosistemi (AZ)",
      paragraphs: [
        "Yanaşması fərqlidir: tək funksiya yox, aqrar xidmətlərin bir yerə toplandığı ekosistem. Xidmətlərə bir pəncərədən çıxış axtaran təsərrüfat üçün dəyərli ünvandır.",
        "Limiti eyni məntiqdən çıxır: bu, gündəlik sahə monitorinqi aləti deyil — peyk indeksləri və sahə analizi onun predmeti deyil.",
      ],
    },
    {
      heading: "OneSoil — beynəlxalq etalon",
      paragraphs: [
        "Milyonlarla fermerin peyklə ilk tanışlığı. Sadə interfeys, rahat mobil tətbiq: sahə çəkib NDVI-a baxmaq bir neçə dəqiqəlik işdir.",
        "Nəzərə alın: 2026-cı ildə mobil tətbiq freemium modelə keçdi — pulsuz hissə daralıb, bəzi funksiyalar abunəyə bağlanıb. Azərbaycan dili yoxdur, məsləhət qatı ümumi xarakterlidir.",
      ],
    },
    {
      heading: "Copernicus Browser — xam mənbənin özü",
      paragraphs: [
        "Avropa Kosmik Agentliyinin rəsmi brauzeri: istənilən Sentinel-2 səhnəsi, tam pulsuz, məlumatın birinci əli. Elmi iş və tam nəzarət istəyənlər üçün əvəzsizdir.",
        "Limiti: fermer üçün yox, tədqiqatçı üçün qurulub — sahə sərhədi saxlamır, «bu rəqəm mənim üçün nə deməkdir» sualına cavab vermir, hər yoxlama əl işidir.",
      ],
    },
    {
      heading: "Agradex — peyk + AI izahat, ana dilində",
      paragraphs: [
        "Bizim mövqe: xəritəni göstərib «özün yozarsan» deməmək. Pulsuz paketdə sahənin peyk xəritəsi (NDVI daxil doqquz indeks), 0-100 vəziyyət qiyməti və aqro-hava var; AI aqronom üçün 1 aylıq pulsuz sınaq — bank kartı istənmir. İnterfeys 8 dildədir, Azərbaycan dili daxil; qeydiyyatdan əvvəl canlı demo sahəyə baxmaq olar.",
        "Limitimiz də var: peyk fizikası hamı üçün eynidir — 10 metrlik piksel tək ağacı görmür, buludlu keçid şəkil vermir. Və biz sahənizə aqronom göndərmirik: yerində müayinə lazım olanda onu canlı mütəxəssis edir.",
      ],
    },
    {
      heading: "«Pulsuz» sözünü necə oxumalı",
      paragraphs: [
        "Aqro tətbiqlərdə pulsuz üç fərqli şey deməkdir və fərqi əvvəlcədən bilmək yaxşıdır. Birincisi — həqiqətən açıq data: Copernicus modeli budur, Sentinel-2 səhnələri vergi ödəyicisinin hesabına açıqdır. İkincisi — freemium: giriş pulsuz, funksiyaların bir hissəsi abunədə (OneSoil bu istiqamətə keçdi). Üçüncüsü — sınaq müddəti: hər şey açıq, amma müddətlə.",
        "Ona görə müqayisədə «pulsuzdurmu?» yox, «pulsuz hissədə konkret nə var?» soruşun. Bizdə cavab belədir: peyk xəritəsi, indekslər, vəziyyət qiyməti və hava pulsuz paketdə qalır; AI aqronom 1 ay sınaqdadır, kart istənmir.",
      ],
    },
    {
      heading: "Seçməzdən əvvəl 4 praktik yoxlama",
      bullets: [
        "Sahəni qeyd etmək neçə dəqiqə çəkir? Kadastr sənədi və koordinat tələb edən alət çox vaxt elə ilk gün bağlanıb qalır.",
        "İnterfeys və məsləhət dilinizdədirmi? Yanlış başa düşülən termin səhv qərara çevrilir.",
        "Data itkisi necə izah olunur? Buludlu keçidi gizlədən alət sizi «tətbiq xarabdır» şübhəsində qoyur.",
        "Telefonda işləyirmi? Sahədə qərar veriləndə masaüstü kompüter yaxınlıqda olmur.",
      ],
    },
    {
      heading: "Ehtiyaca görə seçim",
      table: {
        headers: ["Ehtiyac", "Uyğun seçim"],
        rows: [
          ["Ana dilində aqronomik məsləhət və məlumat", "DrAgro"],
          ["Aqrar xidmətlərə bir pəncərədən çıxış", "Agrohub"],
          ["Beynəlxalq tətbiq təcrübəsi, sürətli NDVI baxışı", "OneSoil"],
          ["Xam səhnələr, elmi iş, tam nəzarət", "Copernicus Browser"],
          ["Ana dilində peyk + AI izahat + hava bir yerdə", "Agradex"],
        ],
      },
      paragraphs: [
        "Seçəndə üç sual bəsdir: hansı konkret problemi həll edirsiniz, datanı sizə kim izah edir və pulsuz hissə ehtiyacınıza çatırmı. Bu üçünə cavab verən alət sizin alətinizdir — adının hansı olması ikinci məsələdir.",
      ],
    },
  ],
  related: ["free-ndvi-map", "online-agronomist"],
};
