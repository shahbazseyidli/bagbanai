import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "when-to-irrigate-wheat",
  locale: "az",
  title: "Buğdanı nə vaxt suvarmalı? FAO-56 yanaşması sadə dildə",
  description:
    "Suvarma vaxtını təqvimlə yox, su balansı ilə seçin: buxarlanma (ET0) × bitki əmsalı (Kc) − effektiv yağış. Buğdanın kritik mərhələləri və praktik hesablama qaydası.",
  lead:
    "Düzgün sual \"neçə gündən bir suvarım?\" deyil, \"torpaqdakı su ehtiyatı nə vaxt kritik həddə düşür?\" sualıdır. FAO-nun 56 saylı metodikası bunu üç ədədlə hesablayır: havanın \"sorduğu\" su (ET0), bitkinin mərhələsinə görə əmsal (Kc) və yağışın həqiqətən torpağa çatan hissəsi. Balans mənfiyə yaxınlaşanda suvarma vaxtıdır — təqvimə yox, sahənin öz hesabına görə.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Üç ədədin mənası",
      paragraphs: [
        "ET0 — istinad buxarlanması: temperatur, günəş, külək və rütubətdən hesablanan, \"bu gün hava otlaqdan nə qədər su aparardı\" göstəricisi. Aran rayonlarında iyul günəşində ET0 gündə 6-8 mm-ə çatır; bu, hektardan gündə 60-80 ton su deməkdir.",
        "Kc — bitki əmsalı: eyni havada buğda cücərti dövründə az (təxminən 0.3), sünbülləmə-süd yetişmə dövründə çox (1.15-ə qədər), yetişmə sonunda yenidən az (0.3-0.4) su işlədir. Yəni faktiki tələbat = ET0 × Kc.",
        "Effektiv yağış: yağan hər millimetr torpağa hopmur — leysanın bir hissəsi axıb gedir. Balansda yağışın yalnız hopmuş hissəsi sayılmalıdır.",
      ],
    },
    {
      heading: "Buğdanın su üçün kritik pəncərələri",
      bullets: [
        "Boruya çıxma – sünbülləmə: ən həssas dövr; bu pəncərədə stress birbaşa sünbüldəki dən sayını azaldır.",
        "Çiçəkləmə: qısa, amma amansız — 3-4 günlük güclü stress belə tozlanmanı vurur.",
        "Süd yetişmə: dənin dolması gedir; stress min dən çəkisini aşağı salır.",
        "Kollanma: nisbətən dözümlüdür — yüngül qıtlıq kök sistemini dərinə işləməyə də sövq edir.",
      ],
    },
    {
      heading: "Praktik hesab: sadələşdirilmiş nümunə",
      paragraphs: [
        "Tutaq ki, sünbülləmə dövrüdür (Kc ≈ 1.15), son 7 gündə ET0 cəmi 45 mm olub, yağış 8 mm (hamısı hopub). Bitkinin xərci: 45 × 1.15 ≈ 52 mm. Balans: 8 − 52 = −44 mm. Torpağınızın asan mənimsənilən su ehtiyatı 50 mm idisə, deməli, ehtiyat demək olar tükənib — növbəti 1-2 gündə suvarma lazımdır, \"həftəsi tamam olsun\" gözləmədən.",
        "Bu hesabın zəhmətli tərəfi ET0-ı və mərhələni hər gün izləməkdir. Agradex bunu avtomatik aparır: Open-Meteo məlumatından günlük ET0, sahənin məhsulu və mərhələsinə görə Kc, yağış cəmi — hamısı sahə səhifəsində hazır su balansı kimi görünür və tövsiyə \"bu həftə təxminən X mm ver\" formasında gəlir.",
      ],
    },
    {
      heading: "Peyk bura harada qoşulur?",
      paragraphs: [
        "Balans riyaziyyatdır, peyk isə yoxlamadır: NDMI bitki toxumasındakı nəmliyi göstərir və hesabın gerçəklə üst-üstə düşdüyünü təsdiqləyir. Balans \"su çatır\" deyirsə, amma NDMI ardıcıl düşürsə — nəyisə yenidən yoxlamaq lazımdır: bəlkə suvarma bərabər paylanmır, bəlkə effektiv yağış həqiqətdə hesabladığınızdan azdır.",
      ],
    },
    {
      heading: "Yadda saxlamalı üç qayda",
      bullets: [
        "Təqvim yox, balans: \"10 gündən bir\" qaydası yazda artıq, iyulda isə az su verə bilər.",
        "Mərhələni düzgün qeyd edin: Kc səhvdirsə, bütün hesab səhvdir.",
        "Kritik pəncərələrdə balansı sıfıra yaxın buraxmayın — sünbülləmə dövründə ehtiyatın 40-50%-i xərclənəndə suvarmaq daha təhlükəsizdir.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "satellite-pass-frequency"],
};
