import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "fertilizer-rates",
  locale: "az",
  title: "Gübrə normaları: buğda, arpa, pambıq və kartof üçün NPK cədvəli",
  description:
    "Hektara təxmini NPK gübrə normaları: buğda, arpa, pambıq və kartof. Azotun mərhələlərə bölünməsi, üzvi gübrənin yeri və dozanın niyə torpaq analizindən keçdiyi.",
  lead:
    "Buğda üçün hektara təxminən 90-120 kq azot, 60-80 kq fosfor, 40-60 kq kalium — bu, orta istiqamətdir, resept deyil. Dəqiq doza yalnız torpaq analizindən çıxır: eyni kənddə iki qonşu sahənin fosfor ehtiyatı iki dəfə fərqlənə bilər. Aşağıdakı cədvəl dörd əsas məhsul üçün başlanğıc çərçivə verir; onu sizin sahəyə analiz və aqronom oturdur.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "NPK nədir və rəqəmlər nəyi ölçür?",
      paragraphs: [
        "N (azot) boy və yaşıl kütlə deməkdir: yarpaq, gövdə, zülal. Çatışmayanda bitki solğun-sarı olur, kollanma zəifləyir. P (fosfor) kök sistemini, çiçəkləməni və dən dolumunu idarə edir — ən çox erkən mərhələdə lazımdır. K (kalium) su rejiminə və dözümlülüyə cavabdehdir: quraqlığa, soyuğa, xəstəliyə davamı artırır, kartofda yumrunun keyfiyyətini qaldırır.",
        "Vacib texniki detal: normalar təsiredici maddə ilə (t.e.) yazılır, kisənin fiziki çəkisi ilə yox. Karbamidin təxminən 46%-i azotdur — hektara 100 kq N vermək üçün 217 kq karbamid lazımdır. «NPK 15-15-15» yazısı da elə budur: hər 100 kq-da 15 kq N, 15 kq fosfor (P₂O₅ ekvivalenti), 15 kq kalium (K₂O). Torpaq analizinin nəticəsi ilə müqayisə edəndə bu ekvivalentlərə baxın.",
      ],
    },
    {
      heading: "Təxmini normalar: dörd məhsul bir cədvəldə",
      paragraphs: [
        "Rəqəmlər orta məhsuldarlıq hədəfi üçün ümumiləşdirilmiş intervallardır. Hədəf yüksəkdirsə — məsələn, hektardan 50 sentner buğda — norma yuxarı sərhədə yaxınlaşır.",
      ],
      table: {
        headers: ["Məhsul", "N, kq/ha (t.e.)", "P, kq/ha (t.e.)", "K, kq/ha (t.e.)"],
        rows: [
          ["Buğda (payızlıq)", "90-120", "60-80", "40-60"],
          ["Arpa", "60-90", "50-70", "40-50"],
          ["Pambıq", "120-160", "80-100", "50-70"],
          ["Kartof", "120-150", "90-120", "120-150"],
        ],
      },
    },
    {
      paragraphs: [
        "Cədvəldən iki müşahidə. Arpa buğdadan az azot istəyir — artığı onu yatırır və keyfiyyəti korlayır. Kartof isə kalium canlısıdır: K norması azotla eyni səviyyədədir, dörd məhsulun içində yalnız onda belədir. Və əsas xəbərdarlıq bir daha: bu cədvəl istiqamətdir, resept deyil — dəqiq doza yalnız torpaq analizinə görə verilir.",
      ],
    },
    {
      heading: "Azot niyə 2-3 dəfəyə bölünür?",
      paragraphs: [
        "Azot torpaqda dayanmır: yağışla yuyulur, qaz halında itir. Hamısını bir dəfəyə vermək — bir hissəsini əvvəlcədən itirmək deməkdir. Ona görə azot bitkinin ən çox istədiyi pəncərələrə bölünür:",
      ],
      bullets: [
        "Buğda və arpa: kiçik pay səpin altına (və ya heç), əsas pay yazda kollanmada, qalanı boruya çıxmada.",
        "Pambıq: səpinqabağı + qönçələmə + çiçəkləmə başlanğıcı — üç pəncərə.",
        "Kartof: əkinlə birlikdə + yumru əmələgəlmədən əvvəl yemləmə.",
        "Fosfor və kalium əksinədir: az hərəkət edirlər, əsas hissə şum və ya səpin altına verilir ki, kök zonasına düşsün.",
      ],
    },
    {
      heading: "Üzvi gübrənin yeri",
      paragraphs: [
        "Yaxşı çürümüş peyin (hektara 20-40 ton, adətən kartof və pambıq sələfinə) təkcə NPK deyil — torpağın strukturu, su tutumu və mikroflorası deməkdir. Peyin verilən ildə mineral normaları azaldın: 30 ton peyin ilk ildə təxminən 40-60 kq N, 20-30 kq P və 50-70 kq K açır. Bunu hesaba almamaq ən çox rast gəlinən artıq-doza səbəbidir.",
      ],
    },
    {
      heading: "Dürüst hədlər",
      bullets: [
        "Analizsiz norma kor atışdır: fosforu onsuz da bol olan sahəyə əlavə fosfor pul itkisidir, kasıb sahəyə «orta» doza isə azdır.",
        "Artıq azot da zərərdir: buğdanı yatırır, yetişməni gecikdirir, xəstəliyə həssaslığı artırır.",
        "Cədvəldə mikroelementlər yoxdur — bor, sink, dəmir ehtiyacı yalnız analiz və simptomla görünür.",
        "Sort, sələf, suvarma rejimi normaya düzəliş verir — yekun dozanı torpaq analizi ilə və aqronomla dəqiqləşdirin.",
      ],
    },
    {
      heading: "Agradex bu işin harasındadır?",
      paragraphs: [
        "Torpaq analizinin nəticə vərəqini Agradex-ə şəkil kimi yükləyirsiniz — sistem onu oxuyub sahənin pasportuna yazır. Bundan sonra AI aqronom gübrə söhbətini ümumi cədvəllə yox, sizin analizlə aparır: «fosfor ehtiyatın yüksəkdir, P dozasını aşağı sərhəddə saxla» kimi. NDVI trendi isə yemləmənin işlədiyini yoxlayır — azot pəncərəsindən sonra örtük qalxmırsa, bu, ayrıca siqnaldır. Peyk xəritəsi pulsuz paketdədir, sınaq üçün bank kartı istənmir.",
      ],
    },
  ],
  related: ["when-to-irrigate-wheat", "wheat-growing-guide"],
};
