import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-crop-disease",
  locale: "az",
  title: "NDVI ilə bitki xəstəliyini tapmaq olurmu? Dürüst cavab",
  description:
    "Birbaşa yox: NDVI xəstəliyi yox, stressi görür — səbəbini demir. Peykin real rolu erkən siqnal verməkdir; diaqnoz yerdə qoyulur. Nə görünür, nə görünmür.",
  lead:
    "Dürüst cavab: birbaşa yox. NDVI xəstəlik detektoru deyil — o, bitki örtüyünün zəiflədiyini görür, amma səbəbini demir. Pas göbələyi, su qıtlığı, azot çatışmazlığı və məftil qurdu peykdə çox oxşar görünə bilər: hamısı \"bu zonada NDVI düşür\" siqnalı verir. Peykin real dəyəri başqadır: harada və nə vaxt baxmaq lazım olduğunu insandan xeyli əvvəl göstərmək.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Peyk nəyi həqiqətən görür?",
      paragraphs: [
        "Xəstəlik yarpaq toxumasını dağıtdıqca fotosintez zəifləyir, qırmızı işığın udulması azalır — NDVI düşür. Ciddi yayılmış infeksiyada bu, peykdə aydın ləkə kimi çıxır. Problem ondadır ki, eyni ləkəni duzluluq, sıxılmış torpaq zolağı, suvarma qeyri-bərabərliyi və gübrə buraxılmış cərgələr də yaradır.",
        "Üstəlik 10 metrlik piksel var: xəstəlik ilk 5-10 ağacda və ya bir neçə kvadratmetrlik ocaqda başlayanda peyk onu hələ görmür. Görünən hala gələndə ocaq artıq böyüyüb.",
      ],
    },
    {
      heading: "Bəs onda peyk nəyə lazımdır?",
      bullets: [
        "Erkən istiqamət: sahənin hansı küncündə trend pozulub — skautinqi kor-koranə yox, ünvanlı aparırsınız.",
        "Vaxt qazancı: NDVI zonası insan gözünün saralma görəcəyindən 1-2 həftə əvvəl fərqlənməyə başlaya bilər.",
        "Müalicədən sonra nəzarət: dərmanlama işlədimi? Növbəti keçidlərdə zonanın bərpası (və ya bərpa olunmaması) rəqəmlə görünür.",
        "Ayırd etməyə kömək: NDMI ilə birlikdə oxunanda \"bu, su stressidir, xəstəlik deyil\" ehtimalı xeyli dəqiqləşir.",
      ],
    },
    {
      heading: "Düzgün iş axını: peyk → ayaq → foto",
      paragraphs: [
        "İşlək sxem üç addımdır. Birinci: peyk xəritəsində zəifləyən zonanı görürsünüz. İkinci: həmin nöqtəyə gedib yarpağa baxırsınız — ləkənin rəngi, forması, yerləşməsi. Üçüncü: şübhəli yarpağın şəklini çəkirsiniz; Agradex-də foto-diaqnoz funksiyası şəkli analiz edib ehtimal olunan səbəbi və növbəti addımı yazır, müşahidə isə sahənin tarixçəsində qalır.",
        "Diaqnozun son sözü həmişə yerdədir — laboratoriya analizi və ya təcrübəli aqronomun gözü. Peyk bu zənciri əvəz etmir, onu ucuzlaşdırır: harasa getməzdən əvvəl haraya getməli olduğunuzu bilirsiniz.",
      ],
    },
    {
      heading: "Qax fındığından bir müşahidə",
      paragraphs: [
        "İzlədiyimiz fındıq bağlarının birində yayın ortasında bağın şimal zolağında NDVI qonşu zolaqlardan ardıcıl aşağı gedirdi. Yerində yoxlama sadə səbəb çıxardı: həmin zolaqda suvarma xətti zəif işləyirdi, xəstəlik yox idi. Peyk \"xəstəlik var\" demədi — \"bura bax\" dedi. Bu, indeksin düzgün istifadəsinin yaxşı nümunəsidir: iddiası az, faydası konkret.",
      ],
    },
  ],
  related: ["what-is-ndvi", "ndvi-ndmi-ndre"],
};
