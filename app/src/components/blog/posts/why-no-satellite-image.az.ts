import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "why-no-satellite-image",
  locale: "az",
  title: "Niyə sahəmin təzə peyk şəkli yoxdur?",
  description:
    "Səbəb demək olar ki, həmişə buluddur: peyk vaxtında keçir, amma şəkil yararsız çıxır. Buludlu keçidləri necə ayırd etməli, nə vaxt narahat olmalı — dürüst izahat.",
  lead:
    "Ən qısa cavab: peyk uçmağı dayandırmayıb — sahənizin üstü buludlu olub. Sentinel-2 hər 5 gündə bir keçir, amma optik peykdir: buluddan keçib görə bilmir. Uzun fasilələrin təxminən hamısının arxasında ardıcıl buludlu keçidlər dayanır. Bunu bilmək vacibdir, çünki \"sistem xarab oldu\" təəssüratı ilə \"hava imkan vermir\" faktı fərqli qərarlara aparır.",
  minutes: 3,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Şəkil hansı hallarda yararsız sayılır?",
      paragraphs: [
        "Hər keçiddən sonra emal zənciri şəklin keyfiyyətini yoxlayır. Agradex-in emal jurnalında hər cəhdin nəticəsi ayrıca qeyd olunur və dörd hal var: şəkil uğurla yazıldı; sahənin üzərində etibarlı piksel qalmadı (bulud və ya kölgə hamısını örtüb); şəkil ümumiyyətlə çox buludlu idi; nadir halda — oxuma xətası. İyuldan real nümunə: bir sahə üçün 8, 13 və 18 iyul keçidlərinin üçü də \"çox buludlu\" ilə nəticələndi — 15 günlük boşluğun bütün izahı budur.",
        "Bulud maskası (Fmask) yalnız buludu yox, bulud kölgəsini də kəsir. Ona görə bəzən göy üzü açıq görünsə də, sahənin bir hissəsi kölgəyə düşübsə, həmin keçid natamam sayıla bilər.",
      ],
    },
    {
      heading: "Nə vaxt narahat olmamalı?",
      bullets: [
        "Fasilə 15 gündən azdırsa — bu, tamamilə normal ritmdir (2-3 buludlu keçid).",
        "Yaz-payız aylarında 2-3 həftəlik fasilə olur; qışda 3-4 həftə də mümkündür.",
        "Qonşu sahədə şəkil var, sizdə yoxdursa — çox güman qonşu başqa orbit zolağına düşür və onun keçid günü fərqlidir.",
      ],
    },
    {
      heading: "Nə vaxt yoxlamağa dəyər?",
      paragraphs: [
        "Əgər yayın ortasında, açıq havalar dövründə 3 həftədən çox heç nə gəlmirsə, sahə sərhədinə baxın: sərhəd səhv çəkilibsə və ya sahə çox kiçikdirsə, etibarlı piksel sayı azala bilər. Agradex-də sahə səhifəsindəki vaxt zolağı uğurlu şəkillərlə yanaşı buludlu keçidləri də göstərir — boşluğun səbəbi orada dəqiq yazılır, təxminə ehtiyac qalmır. Növbəti gözlənilən keçid tarixi də eyni yerdədir.",
      ],
    },
    {
      heading: "Fasilə dövründə nəyə baxmalı?",
      paragraphs: [
        "Peyk susanda sahə boş qalmır: hava proqnozu, yağış cəmi və suvarma balansı gündəlik yenilənməyə davam edir. Uzun buludlu dövrlərdə qərarları bu qatlara söykəyin, peyk açılan kimi isə ilk buludsuz şəkil avtomatik gələcək — Sentinel-2-nin növbəti keçidində sistem yenidən cəhd edir.",
      ],
    },
  ],
  related: ["satellite-pass-frequency", "free-ndvi-map"],
};
