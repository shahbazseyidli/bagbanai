import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-pass-frequency",
  locale: "az",
  title: "Peyk sahənin üzərindən neçə gündə bir keçir?",
  description:
    "Sentinel-2 eyni sahənin üzərindən orta hesabla hər 5 gündə keçir — amma hər keçid şəkil demək deyil. 7 sahə, 120 günlük real ölçmə ilə keçid ritmi və nəyi gözləməli.",
  lead:
    "Qısa cavab: Sentinel-2 cüt peyki (2A və 2B) eyni nöqtənin üzərindən orta hesabla hər 5 gündə bir keçir. Zolaqların üst-üstə düşdüyü ərazilərdə — Azərbaycanın xeyli hissəsi belədir — bəzi sahələr 2-3 fərqli orbitə düşür və keçidlər daha sıx olur. Amma vacib fərq var: keçid hələ şəkil demək deyil.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "5 günlük ritm haradan gəlir?",
      paragraphs: [
        "Sentinel-2 proqramı iki eyni peyklə işləyir: biri orbitin bir tərəfində, digəri tam əksində. Hər biri dünyanı 10 gündə tam örtür; ikisi birlikdə isə eyni nöqtəyə 5 günlük intervalla qayıdır. Bu, kataloqdan götürülmüş rəqəm deyil — biz bunu öz məlumatımızda da ölçmüşük.",
        "Yeddi sahə üzərində 120 günlük çəkiliş tarixlərini qruplaşdıranda maraqlı mənzərə çıxdı: hər sahənin tarixləri (tarix mod 5) qaydası ilə 2-3 qrupa düşür və qrup daxilindəki bütün boşluqlar tam 5-in qatıdır — 86 boşluğun hamısı, istisnasız. Yəni sahəniz hansı orbit zolaqlarına düşürsə, şəkillər həmin zolaqların 5 günlük ritmi ilə gəlir.",
      ],
    },
    {
      heading: "Niyə bəzən 15-20 gün şəkil gəlmir?",
      paragraphs: [
        "Çünki keçid ≠ şəkil. Peyk vaxtında keçir, amma sahənin üstü buludludursa, həmin keçid yararsızdır. İyul ayından real nümunə: bir sahə üçün 8, 13 və 18 iyul tarixlərində üç keçid oldu — üçü də buludlu çıxdı. Fermer üçün bu, \"peyk 20 gündür uçmur\" kimi görünür; əslində peyk üç dəfə keçib, sadəcə hava imkan verməyib.",
        "Agradex bu fərqi görünən edir: sistem yalnız uğurlu şəkilləri yox, buludlu keçidləri də qeyd edir və sahə səhifəsində növbəti gözlənilən keçidin tarixini göstərir. Beləcə \"şəkil niyə yoxdur\" sualının cavabı təxmin yox, ölçülmüş fakt olur.",
      ],
    },
    {
      heading: "Mövsümə görə nə gözləməli?",
      bullets: [
        "Yay (iyun–avqust): Aran və dağətəyi bölgələrdə buludsuz keçidlərin payı yüksəkdir — adətən hər 5-10 gündə təzə şəkil.",
        "Yaz və payız: dəyişkəndir; 2-3 ardıcıl buludlu keçid normal haldır, yəni 10-15 günlük fasilə mümkündür.",
        "Qış: ən seyrək dövr — qar və davamlı buludluluq bəzən 3-4 həftəlik boşluq yaradır. Bu, sistemin xətası deyil, fizikadır.",
      ],
    },
    {
      heading: "10 metrlik piksel nəyi görür, nəyi görmür?",
      paragraphs: [
        "Sentinel-2-nin əsas kanalları 10 m dəqiqliklə çəkir. 1 hektarlıq sahə təxminən 100 pikseldir — sahə daxilindəki zəif zonaları ayırmaq üçün kifayətdir. Amma tək ağacı, dar cərgə aralarını və ya 5-6 sotluq həyətyanı ləkəni ayrıca görmək olmur. Kiçik sahələrdə kənar piksellər qonşu ərazi ilə qarışa bilər — ona görə sərhədi dəqiq çəkmək vacibdir.",
      ],
    },
    {
      heading: "Praktik nəticə",
      paragraphs: [
        "Sahə qərarlarını günlük yox, keçid ritmi ilə planlayın: təzə şəkil gələndə xəritəyə baxın, gəlməyəndə isə səbəbini yoxlayın — Agradex-də bu, sahə səhifəsindəki vaxt zolağında görünür. Qeydiyyatsız sınamaq üçün canlı nümunə sahəyə baxa bilərsiniz.",
      ],
    },
  ],
  related: ["why-no-satellite-image", "what-is-ndvi"],
};
