import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "why-no-satellite-image",
  locale: "tr",
  title: "Tarlamın yeni uydu görüntüsü neden yok?",
  description:
    "Sebep hemen her zaman buluttur: uydu vaktinde geçer ama görüntü işe yaramaz çıkar. Bulutlu geçiş nasıl ayırt edilir, ne zaman endişelenmeli — dürüst anlatım.",
  lead:
    "En kısa cevap: uydu uçmayı bırakmadı — tarlanızın üzeri bulutluydu. Sentinel-2 her 5 günde bir geçer ama optik bir uydudur: bulutun içinden göremez. Uzun araların neredeyse tamamının arkasında art arda gelen bulutlu geçişler vardır. Bu ayrımı bilmek önemli, çünkü \"sistem bozuldu\" hissi ile \"hava izin vermiyor\" gerçeği sizi farklı kararlara götürür.",
  minutes: 3,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Görüntü hangi durumlarda kullanılamaz sayılır?",
      paragraphs: [
        "Her geçişten sonra işleme zinciri görüntünün kalitesini denetler. Agradex'in işlem günlüğünde her denemenin sonucu ayrıca kaydedilir ve dört durum vardır: görüntü başarıyla yazıldı; tarlanın üzerinde güvenilir piksel kalmadı (bulut ya da gölge tamamını örttü); sahne bütünüyle çok bulutluydu; nadiren de okuma hatası. Ortadaki ikisini ayırt etmek önemli: \"çok bulutlu\" bütün sahnenin elenmesidir, \"güvenilir piksel kalmadı\" ise sahne genelde açıkken bulutun tam sizin tarlanızın üzerine denk gelmesidir. Temmuzdan gerçek bir örnek: bir tarla için 8, 13 ve 18 temmuz geçişlerinin üçü de \"çok bulutlu\" sonucuyla kapandı — 15 günlük boşluğun bütün açıklaması bu.",
        "Bulut maskesi (Fmask) yalnız bulutu değil, bulutun gölgesini de keser. Gökyüzü kısmen açık görünse bile tarlanın bir bölümü gölgeye düşmüşse o geçiş eksik sayılabilir. Parçalı bulutlu bir günde tarlanın yarısı sağlam, yarısı maskelenmiş kalabilir; istatistik yalnız sağlam yarıdan hesaplanır. Tersi de olur: tarlanın yeterli kısmı açıksa sistem o sahneyi yine kullanır — haritada o gün için kısmi ama işe yarar bir görüntü görürsünüz.",
      ],
    },
    {
      heading: "Ne zaman endişelenmemeli?",
      bullets: [
        "Ara 15 günden kısaysa — bu tamamen normal ritimdir (2-3 bulutlu geçiş).",
        "İlkbahar ve sonbaharda 2-3 haftalık aralar olur; kışın 3-4 hafta da mümkündür. Karadeniz kıyısındaki fındık bahçelerinde bu paylar her mevsim biraz daha uzundur — kıyı bulutluluğu yıl boyu yüksektir.",
        "Komşu tarlada görüntü var, sizde yoksa — komşu büyük olasılıkla başka bir çekim şeridine düşüyordur; onun geçiş günü sizinkinden farklıdır.",
        "Bölge farkını da hesaba katın: İç Anadolu'da ve GAP'ta yaz boşlukları kısadır, temmuzda üç haftalık sessizlik oralarda gerçekten nadirdir — Karadeniz kıyısında ise olağandır.",
        "Harita o gün için eksik ya da parçalı görünüyorsa — maskeden sağlam çıkan piksellerle hesap yapılmıştır; resmin bütünü bir sonraki temiz geçişte tamamlanır.",
      ],
    },
    {
      heading: "Ne zaman kontrol etmeye değer?",
      paragraphs: [
        "Yaz ortasında, hava açıkken 3 haftadan uzun süre hiçbir şey gelmiyorsa tarla sınırına bakın: sınır yanlış çizilmişse ya da parsel çok küçükse güvenilir piksel sayısı düşer. Sınır yola, kanala ya da komşu parsele taşıyorsa kenar pikselleri elenir — sınırı gerçek ekili alana çekin. Bu düzeltme en çok küçük parsellerde fark yaratır: birkaç dönümlük bahçede tek sıra kenar pikseli bile ortalamanın kayda değer bölümüdür. Agradex'te tarla sayfasındaki zaman çizelgesi başarılı görüntülerin yanında bulutlu geçişleri de gösterir — boşluğun sebebi orada açıkça yazar, tahmine gerek kalmaz. Bir sonraki beklenen geçişin tarihi de aynı yerdedir.",
        "Uzun aradan sonra gelen ilk temiz görüntüde önce tarihe bakın. Değerleri boşluktan önceki son görüntüyle kıyaslamak yanıltabilir — aradan üç hafta geçtiyse bitki de üç hafta büyümüş ya da yaşlanmıştır; mümkünse geçen sezonun aynı haftasıyla kıyaslayın.",
      ],
    },
    {
      heading: "Ara dönemde neye bakmalı?",
      paragraphs: [
        "Uydu sustuğunda tarla boş kalmaz: hava tahmini, yağış toplamı ve sulama bilançosu her gün güncellenmeye devam eder — bu katmanlar uydu görüntüsüne muhtaç değildir. Bulutlu haftada bile \"bu hafta ne kadar su verdim, hava ne kadar götürdü\" hesabı işler. Uzun bulutlu dönemlerde kararları buna dayandırın; hava açılır açılmaz ilk bulutsuz görüntü kendiliğinden gelir — Sentinel-2'nin bir sonraki geçişinde sistem yeniden dener.",
        "Bir dürüstlük notu: zirai don gibi hayati uyarılarda resmi kaynak Meteoroloji Genel Müdürlüğü'dür (MGM) — biz onun yerine geçmiyoruz. Bizim hava katmanımız tarla ölçeğinde planlama içindir; don riski taşıyan gecelerde MGM uyarılarını esas alın.",
      ],
    },
  ],
  related: ["satellite-pass-frequency", "free-ndvi-map"],
};
