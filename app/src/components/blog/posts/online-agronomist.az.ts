import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "online-agronomist",
  locale: "az",
  title: "Aqronom məsləhəti onlayn: AI aqronom nə bacarır, nə bacarmır",
  description:
    "Onlayn aqronom məsləhəti necə işləyir: AI aqronom sahənin peyk, hava və qeyd tarixçəsini görərək cavab verir. Nəyi yaxşı bacarır, harada canlı aqronom lazımdır.",
  lead:
    "AI aqronom gecə saat 2-də də cavab verir və sahənizin peyk trendini, havasını, qeydlərinizi görərək danışır — amma o, qərar dəstəyidir, aqronomik zəmanət deyil. Bu yazı dürüst sərhəd xəttidir: onlayn məsləhətin real gücü harada başlayır, canlı aqronomun yeri harada toxunulmaz qalır.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Nəyi yaxşı bacarır?",
      bullets: [
        "7/24 cavab: sual bazar günü axşam da yaranır — suvarma sabaha planlaşdırılır, məsləhət indi lazımdır.",
        "Kontekstlə danışıq: cavab «ümumiyyətlə buğdada» yox, «sizin sahədə» qurulur — NDVI trendi, son yağış, qeyd etdiyiniz əməliyyatlar nəzərə alınır.",
        "Foto tanıma: yarpaq şəklindən ehtimal olunan problem və növbəti addım.",
        "Yorulmaz hesab: su balansı, indeks trendləri, hava pəncərələri — rəqəm işi insan diqqətindən asılı qalmır.",
        "Sadə dil: termin əvəzinə izahat, özü də ana dilinizdə.",
      ],
    },
    {
      heading: "Qaynar xətdən əsas fərq: yaddaş",
      paragraphs: [
        "Telefon məsləhət xəttində hər zəng sıfırdan başlayır: sahəni, sortu, keçən həftəki suvarmanı yenidən danışırsınız. Qarşı tərəf sahənizi görmür — sözünüzə güvənir.",
        "Sahəyə bağlı AI aqronomda söhbətin ünvanı var. «Bu həftə suvarım?» sualına cavab «suvarma qeydiniz 10 gün əvvəldir, o vaxtdan NDMI enir, qarşıdakı 3 gündə yağış görünmür» kimi qurulur. Söhbət tarixçəsi də qalır — bir ay sonra «o ləkə nə oldu?» soruşanda kontekst itmir.",
      ],
    },
    {
      heading: "Nə soruşmaq işə yarayır",
      paragraphs: [
        "Cavabın keyfiyyəti sualın konkretliyindən asılıdır. «Buğda necə becərilir?» sualına ensiklopediya cavabı gəlir; «bu sahədə bu həftə nə etməliyəm?» sualına isə sizin datanızla qurulmuş cavab. Yaxşı işləyən sual tipləri:",
      ],
      bullets: [
        "«Bu həftə suvarım, yoxsa gözləyim?» — su balansı, son yağış və proqnoz bir yerdə oxunur.",
        "«NDVI iki həftədir düşür, səbəbi nə ola bilər?» — ehtimallar sıralanır və yerində nəyi yoxlamaq lazım olduğu deyilir.",
        "«Bu yarpaqda nə var?» — şəkil əlavə edin, ehtimal olunan səbəb və növbəti addım gəlir.",
        "«Azot yemləməsi üçün pəncərə keçdimi?» — mərhələ və hava birlikdə qiymətləndirilir.",
        "«Keçən il bu vaxt sahə necə idi?» — tarixçə müqayisəsi rəqəmlə verilir.",
      ],
    },
    {
      heading: "Nəyi bacarmır — açıq siyahı",
      bullets: [
        "Hüquqi məsuliyyət daşımır: sığorta rəyi, rəsmi ekspertiza, zərər aktı — bunlar səlahiyyətli mütəxəssisin işidir.",
        "Yerində müayinə etmir: torpağı ovuclamaq, kökü qazıb baxmaq, gövdəni kəsib içinə baxmaq ekrandan mümkün deyil.",
        "Laborator diaqnoz qoymur: patogenin dəqiq təyini, torpağın kimyəvi analizi laboratoriya işidir — AI nəticəni oxuyub şərh edə bilər, əvəz edə bilməz.",
        "Foto-diaqnoz ehtimaldır, hökm deyil: oxşar simptomlu xəstəliklər şəkildə qarışa bilər.",
        "Bahalı və geri dönməz qərarlar — bağın sökülməsi, kütləvi dərmanlama — tək onlayn məsləhətlə verilməməlidir.",
      ],
    },
    {
      heading: "Düzgün istifadə sxemi",
      paragraphs: [
        "İşlək model rəqabət deyil, növbədir. AI ilk oxunuşu verir: nəyin normal, nəyin şübhəli olduğunu ayırır, sualı konkretləşdirir. Ciddi qərar lazım olanda canlı aqronoma artıq hazır tarixçə ilə gedirsiniz — peyk qrafiki, hava, qeydlər, fotolar əlinizdədir. Aqronomun vaxtı diaqnostikanın əvvəlinə yox, qərarın özünə xərclənir; bu, hər iki tərəf üçün ucuzdur.",
        "Bir vərdiş bu sxemi ikiqat gücləndirir: gördüyünüz işi qeyd edin. Suvarma tarixi, verilən gübrə, çıxılan dərmanlama, gəzintidə gördüyünüz ləkə — hər biri bir sətirdir, amma növbəti cavabın dəqiqliyini birbaşa qaldırır. Qeydsiz sahə haqqında istənilən məsləhət — insan versin, maşın versin — təxminə söykənir.",
      ],
    },
    {
      heading: "Agradex-də necədir?",
      paragraphs: [
        "Agradex-in AI aqronomu sahənizin Sentinel-2 indeks trendlərini, hava tarixçəsini və proqnozunu, skautinq qeydlərinizi və əvvəlki məsləhətləri görür; hər cavab qərar dəstəyi kimi işarələnir, zəmanət kimi yox. AI aqronom 1 ay pulsuzdur və sınaq üçün bank kartı istənmir; peyk xəritəsi, vəziyyət qiyməti və aqro-hava isə pulsuz paketdə qalır. Sistemə qeydiyyatsız baxmaq üçün canlı demo sahə açıqdır — real fermerin sahəsi, real peyk axını.",
      ],
    },
  ],
  related: ["farm-apps-comparison", "ndvi-crop-disease"],
};
