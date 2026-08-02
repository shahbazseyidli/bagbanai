import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-pass-frequency",
  locale: "tr",
  title: "Uydu tarlanın üzerinden kaç günde bir geçer?",
  description:
    "Sentinel-2 ikiz uyduları aynı noktadan ortalama 5 günde bir geçer — ama her geçiş görüntü demek değil. 7 tarla, 120 günlük ölçümle geçiş ritmi ve ne beklemeli.",
  lead:
    "Kısa cevap: Sentinel-2'nin ikiz uyduları (2A ve 2B) aynı noktanın üzerinden ortalama her 5 günde bir geçer. Çekim şeritlerinin çakıştığı yerlerde — Türkiye'de tarlaların önemli bölümü böyle bir alana düşer — bir parsel 2-3 farklı şeritten birden görülür ve geçişler sıklaşır. Ama kritik bir ayrım var: geçiş, henüz görüntü demek değildir.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "5 günlük ritim nereden geliyor?",
      paragraphs: [
        "Sentinel-2 programı iki özdeş uyduyla çalışır: biri yörüngenin bir yanında, diğeri tam karşısında. Her biri dünyayı 10 günde tarar; ikisi birlikte aynı noktaya 5 günde bir döner. Bu, katalogdan alınmış bir rakam değil — kendi verimizde de ölçtük; aşağıdaki sayılar broşürden değil, izlediğimiz tarlaların kayıtlarından geliyor.",
        "Yedi tarlanın 120 günlük çekim tarihlerini gruplandırdığımızda net bir örüntü çıktı: her tarlanın tarihleri (tarih mod 5) kuralıyla 2-3 gruba düşüyor ve grup içindeki bütün boşluklar tam olarak 5'in katı — 86 boşluğun tamamı, tek istisna yok. Bir tarlanın 2-3 gruba birden düşmesinin sebebi de basit: komşu çekim şeritleri kenarlarda üst üste biner. Tarlanız hangi şeritlere düşüyorsa, görüntüler o şeritlerin 5 günlük ritmiyle gelir.",
      ],
    },
    {
      heading: "Neden bazen 15-20 gün görüntü gelmez?",
      paragraphs: [
        "Çünkü geçiş ≠ görüntü. Uydu vaktinde geçer; ama tarlanın üzeri bulutluysa o geçiş işe yaramaz. Temmuzdan gerçek bir örnek: bir tarla için ayın 8'inde, 13'ünde ve 18'inde üç geçiş oldu — üçü de bulutlu çıktı. Çiftçinin ekranında bu, \"uydu 20 gündür uçmuyor\" gibi görünür; oysa uydu üç kez geçmiş, hava izin vermemiştir.",
        "Agradex bu farkı görünür kılar: sistem yalnız başarılı görüntüleri değil, bulutlu geçişleri de kaydeder ve tarla sayfasında bir sonraki beklenen geçişin tarihini gösterir. Böylece \"görüntü neden yok\" sorusunun cevabı tahmin değil, ölçülmüş bir kayıt olur.",
      ],
    },
    {
      heading: "Bir sonraki geçiş ne zaman?",
      paragraphs: [
        "Geçiş takvimi tahmin işi değildir; tarlanızın kendi çekim geçmişinden hesaplanır. Tarihler 5 günlük ızgaraya oturduğu için sıradaki geçiş bu ritmin ileriye uzatılmasıyla bulunur; o gün görüntü zaten gelmişse bir sonraki adıma bakılır. Agradex bu tarihi tarla sayfasında açıkça yazar. İfadeye dikkat edin: hep \"sonraki geçiş\" denir, \"sonraki görüntü\" değil — geçişin bulutlu çıkma ihtimali her zaman vardır ve görüntü sözü verip tutamamak, hiç söz vermemekten kötüdür.",
      ],
    },
    {
      heading: "Mevsime göre ne beklemeli?",
      bullets: [
        "Yaz (haziran–ağustos): İç Anadolu'da, GAP'ta ve Ege'de bulutsuz geçiş oranı yüksektir — çoğu tarla 5-10 günde bir taze görüntü alır.",
        "Karadeniz kıyısı ayrı değerlendirilmeli: Ordu-Giresun hattındaki fındık bahçelerinde yazın bile 2-3 ardışık bulutlu geçiş olağandır; boşluklar iç bölgelere göre uzar.",
        "İlkbahar ve sonbahar: değişkendir; 10-15 günlük aralar normal sayılır.",
        "Kış: en seyrek dönem — kar ve kapalı hava kimi yıl 3-4 haftalık boşluk yaratır. Bu bir arıza değil, fiziktir.",
      ],
    },
    {
      heading: "10 metrelik piksel neyi görür, neyi görmez?",
      paragraphs: [
        "Sentinel-2'nin ana bantları 10 metre çözünürlükle çeker. 1 hektar yaklaşık 100 piksel, 1 dekar yaklaşık 10 piksel eder — parsel içindeki zayıf bölgeleri ayırmaya yeter. Ama tek bir ağacı, dar sıra aralarını ya da birkaç yüz metrekarelik ev bahçesini tek başına gösteremez. Küçük parsellerde kenar pikselleri komşu araziyle karışabilir; bu yüzden sınırı doğru çizmek, alacağınız her değerin kalitesini belirler. Karadeniz'de fındık parselleri çoğu yerde küçüktür — 5-10 dönümlük bir bahçede sınırı birkaç metre içeriden çizmek, kenar piksellerinin komşu bahçeye ya da yola karışmasını önler ve değerlerin oynaklığını gözle görülür biçimde azaltır.",
      ],
    },
    {
      heading: "Pratik sonuç",
      paragraphs: [
        "Tarla kararlarını güne göre değil, geçiş ritmine göre planlayın: taze görüntü geldiğinde haritaya bakın, gelmediğinde sebebini kontrol edin — Agradex'te bu, tarla sayfasındaki zaman çizelgesinde görünür. İlaçlamanın ya da sulamanın etkisini bir sonraki temiz görüntüde kontrol etmek gibi işler de bu ritmi bilmekle mümkün olur. Kayıt olmadan denemek isterseniz canlı demo tarla açık.",
      ],
    },
  ],
  related: ["why-no-satellite-image", "what-is-ndvi"],
};
