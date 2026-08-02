import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "when-to-irrigate-wheat",
  locale: "tr",
  title: "Buğday ne zaman sulanır? FAO-56 yöntemi sade anlatım",
  description:
    "Sulama zamanını takvimle değil su bilançosuyla seçin: ET0 × bitki katsayısı (Kc) − etkili yağış. Buğdayın kritik dönemleri ve adım adım pratik hesap örneği.",
  lead:
    "Doğru soru \"kaç günde bir sulayayım?\" değil, \"topraktaki su rezervi ne zaman kritik eşiğe iner?\" sorusudur. FAO'nun 56 numaralı yöntemi bunu üç sayıyla hesaplar: havanın \"çektiği\" su (ET0), bitkinin dönemine göre katsayı (Kc) ve yağışın toprağa gerçekten işleyen kısmı. Bilanço eksiye yaklaştığında sulama vaktidir — takvime göre değil, tarlanın kendi hesabına göre.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Üç sayının anlamı",
      paragraphs: [
        "ET0 — referans buharlaşma: sıcaklık, güneş, rüzgâr ve nemden hesaplanan, \"bugün hava çayır yüzeyinden ne kadar su götürürdü\" göstergesi. İç Anadolu'da ve GAP'ta temmuz güneşinde ET0 günde 6-8 mm'yi bulur; bu, hektardan günde 60-80 ton, dekardan 6-8 ton su demektir. Kışın aynı sayı 1 mm'nin altına iner — sabit \"şu kadar günde bir\" kurallarının iki mevsimde birden doğru olamamasının sebebi budur.",
        "Kc — bitki katsayısı: aynı havada buğday, çıkış döneminde az (yaklaşık 0.3), başaklanma ile süt olum arasında çok (1.15'e kadar), olgunlaşmanın sonunda yeniden az (0.3-0.4) su kullanır. Gerçek talep = ET0 × Kc.",
        "Etkili yağış: düşen her milimetre toprağa işlemez — sağanağın bir bölümü yüzeyden akıp gider. Bilançoya yalnız toprağa işleyen kısım yazılır.",
      ],
    },
    {
      heading: "Buğdayın su için kritik pencereleri",
      bullets: [
        "Sapa kalkma – başaklanma: en hassas dönem; bu penceredeki stres başaktaki dane sayısını doğrudan azaltır. Kışlık buğdayda bu pencere Konya ovasında çoğu yıl nisan sonu ile mayısa denk gelir — yağışın da en oynak olduğu haftalar.",
        "Çiçeklenme: kısa ama acımasız — 3-4 günlük şiddetli stres bile tozlanmayı vurur.",
        "Süt olum: dane dolumu sürer; stres bin dane ağırlığını düşürür.",
        "Kardeşlenme: görece dayanıklıdır — hafif kuraklık kök sistemini derine inmeye bile yöneltir.",
      ],
    },
    {
      heading: "Pratik hesap: sadeleştirilmiş örnek",
      paragraphs: [
        "Diyelim ki başaklanma dönemindesiniz (Kc ≈ 1.15), son 7 günde ET0 toplamı 45 mm, yağış 8 mm (tamamı işlemiş). Bitkinin gideri: 45 × 1.15 ≈ 52 mm. Bilanço: 8 − 52 = −44 mm. Toprağınızın kolay alınabilir su rezervi 50 mm idiyse rezerv fiilen tükenmiş demektir — önümüzdeki 1-2 gün içinde sulama gerekir, \"haftası dolsun\" beklemeden.",
        "Türkiye için bir not: buğdayın büyük bölümü kuru tarımla yetişir. Bilanço orada da işe yarar — sulayamayacağınız tarlada bile stresin hangi hafta başladığını ve verim beklentisini neden aşağı çekmeniz gerektiğini söyler. Konya'da ya da GAP'ta sulanan parsellerde ise doğrudan karar aracıdır.",
        "Bu hesabın zahmetli yanı ET0'ı ve dönemi her gün izlemektir. Agradex bunu kendiliğinden yürütür: günlük ET0, ürüne ve dönemine göre Kc, yağış toplamı — hepsi tarla sayfasında hazır bir su bilançosu olarak görünür ve öneri \"bu hafta yaklaşık X mm verin\" biçiminde gelir.",
      ],
    },
    {
      heading: "Sulama yöntemi hesabı değiştirir mi?",
      paragraphs: [
        "Bilanço bitkinin talebini söyler; tarlaya fiilen ne kadar su göndereceğiniz yönteme bağlıdır. Salma sulamada verilen suyun önemli bir bölümü kök bölgesine ulaşmadan kaybolur — açığı kapatmak için bilançodaki eksikten daha fazlasını vermek gerekir. Yağmurlamada kayıp azalır, damlada en aza iner. Damla sulanan parselde bilançoyu haftalık değil 2-3 günlük dilimlerle izlemek, küçük ve sık sulamalarla stresi hiç başlatmamayı mümkün kılar.",
      ],
    },
    {
      heading: "Uydu buraya nerede bağlanır?",
      paragraphs: [
        "Bilanço matematiktir, uydu ise sağlamasıdır: NDMI bitki dokusundaki nemi gösterir ve hesabın gerçekle örtüşüp örtüşmediğini doğrular. Bilanço \"su yeterli\" diyor ama NDMI ısrarla düşüyorsa bir şeyi yeniden kontrol etmek gerekir: belki sulama parsele eşit dağılmıyor, belki etkili yağış hesapladığınızdan azdır. Tersi de sağlamadır — sulamadan birkaç gün sonra NDMI yükselmiyorsa suyun kök bölgesine ulaştığından emin olamazsınız.",
      ],
    },
    {
      heading: "Akılda tutulacak üç kural",
      bullets: [
        "Takvim değil, bilanço: \"10 günde bir\" kuralı nisanda fazla, temmuzda eksik su verdirebilir.",
        "Dönemi doğru kaydedin: Kc yanlışsa bütün hesap yanlıştır.",
        "Kritik pencerelerde bilançoyu sıfıra yaklaştırmayın — başaklanmada rezervin yüzde 40-50'si harcandığında sulamak daha güvenlidir.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "satellite-pass-frequency"],
};
