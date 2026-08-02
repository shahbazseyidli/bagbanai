import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "what-is-ndvi",
  locale: "tr",
  title: "NDVI nedir? Değer tablosuyla sade anlatım",
  description:
    "NDVI, bitki örtüsünün yoğunluğunu −1 ile +1 arasında ölçen uydu indeksidir. 0.2, 0.4, 0.7 ne demek: değer tablosu, Türkiye'den saha örnekleri, üç yaygın hata.",
  lead:
    "NDVI (Normalized Difference Vegetation Index), uydu görüntüsünden hesaplanan ve bitki örtüsünün ne kadar yoğun, ne kadar canlı olduğunu gösteren bir sayıdır. Ölçeği −1 ile +1 arasındadır: çıplak toprak 0.1 civarında kalır, sağlıklı ve sık bir ekin 0.6'nın üzerine çıkar. Tek cümleyle: NDVI ne kadar yüksekse, tarlada fotosentez yapan yeşil kütle o kadar fazladır.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Bu sayı nereden geliyor?",
      paragraphs: [
        "Sağlıklı yaprak, fotosentez için kırmızı ışığı emer; yakın kızılötesini ise güçlü biçimde yansıtır. NDVI tam olarak bu iki kanalın farkını normalize eder: (NIR − Kırmızı) / (NIR + Kırmızı). Sentinel-2 her iki kanalı 10 metrelik piksellerle çeker — 1 hektar yaklaşık 100 piksel, 1 dekar yaklaşık 10 piksel eder. Yani tarlanızın her 10×10 metrelik parçası kendi değerini alır.",
        "Formül basittir; gücü karşılaştırmadadır. Paydaya bölmek (normalizasyon) ışıklanma farklarının çoğunu dengeler — bu yüzden nisan görüntüsüyle haziran görüntüsü aynı cetvelde okunabilir. Aynı tarlanın bu haftaki değeri ile iki hafta önceki değeri, parselin zayıf köşesi ile kuvvetli kısmı arasındaki fark — tarımsal karar tek bir sayıdan değil, bu farklardan çıkar.",
      ],
    },
    {
      heading: "NDVI değer tablosu",
      paragraphs: [
        "Aşağıdaki aralıklar yön göstericidir, norm değildir. Konya'daki buğdayın \"normal\"i ile Ordu'daki fındık bahçesininki aynı değildir; mevsimin başı ile ortası da birbirinden ayrılır. Tabloyu her zaman kendi tarlanızın geçmişiyle birlikte okuyun.",
      ],
      table: {
        headers: ["NDVI", "Ne anlama gelir", "Tarladaki tipik görünüm"],
        rows: [
          ["< 0.1", "Bitki örtüsü yok", "Çıplak toprak, su, yeni sürülmüş tarla"],
          ["0.1 – 0.2", "Çok seyrek örtü", "Yeni çıkış, ciddi seyreklik"],
          ["0.2 – 0.35", "Zayıf örtü", "Erken dönem ya da stres"],
          ["0.35 – 0.5", "Orta örtü", "Gelişme sürüyor, izlemek gerek"],
          ["0.5 – 0.7", "İyi örtü", "Sağlıklı, aktif vejetasyon"],
          ["> 0.7", "Çok sık örtü", "Pik vejetasyon, kapalı taç"],
        ],
      },
    },
    {
      heading: "Saha örneği: 0.3 kötü mü, normal mi?",
      paragraphs: [
        "Cevap ürüne ve döneme bağlıdır. İç Anadolu'da kışlık buğday aralık ayında 0.3 gösteriyorsa bu olağandır — bitki henüz kardeşlenmededir, daha fazla yeşil kütle ortada yoktur. Aynı buğday mayısta hâlâ 0.3'te kalıyorsa bu artık bir sinyaldir: ya su yetmiyor, ya besin, ya da bir hastalık başlamıştır. Karadeniz'de tablo terstir — kapalı taçlı, sağlıklı bir fındık bahçesi yaz ortasında 0.6'nın altına inmemelidir; Ordu ya da Giresun'da temmuzdaki 0.3 neredeyse her zaman sorun demektir. GAP'ta pamuk ise geç ekilir: Şanlıurfa'da haziran başındaki 0.2-0.3 stres değil, takvimdir.",
        "Ege'de bağ için bir not daha: sıra araları açık toprak olduğundan parsel ortalaması hiçbir zaman kapalı bir buğday tarlasının değerine ulaşmaz. Aynı durum genç meyve bahçeleri için de geçerlidir — fidanlar taç kapatana kadar ortalama düşük kalır. Bağda ve bahçede tablodan çok, tarlanın kendi geçmişiyle kıyas anlam taşır.",
        "İzlediğimiz tarlalarda en işe yarayan soru \"NDVI kaç?\" değil, \"NDVI nereye gidiyor?\" oldu. Aynı 0.45 değeri yükselen bir çizgi üzerindeyse rahatlatır; düşen bir çizgi üzerindeyse tarlaya çıkma sebebidir.",
      ],
    },
    {
      heading: "Üç yaygın hata",
      bullets: [
        "Tek güne bakmak. Tek sahnedeki değer bulut gölgesinden ya da çekim açısından etkilenebilir — güvenilir olan, birkaç görüntülük trenddir.",
        "Tarlaları birbiriyle kıyaslamak. Farklı ürün, farklı ekim tarihi, farklı toprak — NDVI kıyası yalnız aynı tarlanın kendi geçmişi içinde geçerlidir.",
        "NDVI'yi \"sağlık yüzdesi\" gibi okumak. 0.6, yüzde 60 sağlıklı demek DEĞİLDİR. İndeks örtünün yoğunluğunu ölçer; sık ama susuz kalmış bir ekin bir süre daha yüksek NDVI göstermeye devam edebilir.",
      ],
    },
    {
      heading: "Kendi tarlanızda nasıl bakarsınız?",
      paragraphs: [
        "Agradex'te tarla sınırını haritada parmağınızla çizersiniz; sistem Sentinel-2 arşivini indirir ve her bulutsuz geçişte NDVI haritasıyla birlikte 0-100 arası bir durum puanı hesaplar. Uydu haritası, durum puanı ve tarım havası ücretsiz pakete dahildir; haritanın ötesinde yorum isterseniz yapay zekâ agronom tavsiyesinin 1 aylık ücretsiz denemesi var, banka kartı istenmez. Kayıt olmadan bakabileceğiniz canlı bir demo tarla da açık — gerçek bir çiftçinin tarlası, gerçek uydu verisiyle.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "free-ndvi-map"],
};
