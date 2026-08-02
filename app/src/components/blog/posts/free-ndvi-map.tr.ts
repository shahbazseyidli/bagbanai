import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "free-ndvi-map",
  locale: "tr",
  title: "Ücretsiz NDVI haritası: tarlayı izlemenin 3 gerçek yolu",
  description:
    "NDVI haritasına ücretsiz bakmanın üç gerçek yolu: Copernicus Browser, OneSoil ve Agradex. Güçlü ve zayıf yanlarıyla dürüst karşılaştırma — satış metni değil.",
  lead:
    "Tarlayı uydudan izlemek için para ödemek şart değil — Sentinel-2 verisi açıktır ve üzerine kurulmuş birkaç ücretsiz araç vardır. Aşağıda üç gerçek yol var: biri ham veri için resmi tarayıcı, biri tanınmış uluslararası uygulama, biri de bizim platformumuz. Üçü de gerçekten kullanılabilir durumda; amaç sıralamak değil, ihtiyacınıza göre seçmenize yardım etmek. Üçünü de dürüstçe yazıyoruz — hangisi kime uygun, onunla birlikte.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "1. Copernicus Browser — ham kaynağın kendisi",
      paragraphs: [
        "Avrupa Uzay Ajansı'nın resmi tarayıcısı, istediğiniz Sentinel-2 sahnesini açmaya, NDVI katmanı çizdirmeye ve geçmişe bakmaya izin verir. Gerçek renkli görüntüyle indeks katmanını aynı ekranda kıyaslayabilir, iki tarihi yan yana açabilirsiniz. Tamamen ücretsizdir ve verinin ilk elidir.",
        "Zayıf yanı: araç araştırmacılar için kurulmuş. Tarla sınırınızı saklamaz, bulut maskesini kendiniz düşünmek zorundasınız ve \"bu sayı benim için ne anlama geliyor\" sorusuna cevap vermez; dili ve kavramları uzaktan algılama dünyasından gelir. Her hafta elle kontrol etmek sabır ister.",
      ],
    },
    {
      heading: "2. OneSoil — tanınmış uluslararası uygulama",
      paragraphs: [
        "Uzun yıllar tamamen ücretsiz kalan OneSoil, tarla çizip NDVI'ye bakmak için milyonlarca çiftçinin ilk tanışıklığı oldu. Sade arayüzü ve mobil uygulaması güçlü yanıdır; tarla sınırlarını otomatik algılaması da yıllarca öne çıkan özelliğiydi.",
        "Bilinmesi gereken: 2026'da mobil uygulama freemium modele geçti — ücretsiz kısım daraldı, bazı özellikler aboneliğe bağlandı. Hangi özelliğin hangi tarafta kaldığını uygulamanın içinden kontrol etmek en sağlıklısı; paylar zamanla değişebiliyor. Tavsiye katmanı ise genel niteliktedir — tarlanızın geçmişiyle konuşan bir yorum beklemeyin. Bu bir eleştiri değil, tespit: her aracın bir gelir modeli olmak zorunda.",
      ],
    },
    {
      heading: "3. Agradex — bizim yol: harita + anlatım",
      paragraphs: [
        "Agradex'te ücretsiz pakete tarlanın uydu haritası (NDVI dahil dokuz indeks), 0-100 arası durum puanı ve tarım havası dahildir. Puan tek başına asılı durmaz — yanında hangi bileşenin onu aşağı çektiği yazar: bitki örtüsü mü, nem sinyali mi, hava mı. Tarlayı haritada parmağınızla çizersiniz — tapu, koordinat, dosya gerekmez. Alan birimi olarak dönümü destekliyoruz: 25 dönümlük tarla arayüzde \"2.5 hektar\" diye değil, alışık olduğunuz gibi dönümle yazar. Yapay zekâ agronom tavsiyesi için 1 aylık ücretsiz deneme var; banka kartı istenmez.",
        "Farkımız duruşumuzda: haritayı gösterip \"gerisini kendin yorumla\" demiyoruz. Arayüz Türkçe dahil 9 dilde; her indeksin yanında sade bir açıklama var; bulutlu geçişler de açıkça gösteriliyor ki \"görüntü neden gelmedi\" sorusu havada kalmasın. Kayıttan önce denemek için canlı demo tarla açık — gerçek bir çiftçinin tarlası, gerçek uydu akışıyla; geçmişi, bulutlu geçişleri ve puanları vitrin verisi değil, olduğu gibi görürsünüz.",
      ],
    },
    {
      heading: "Hangi yol kime uygun?",
      table: {
        headers: ["İhtiyaç", "Uygun seçim"],
        rows: [
          ["Ham sahneler, akademik çalışma, tam kontrol", "Copernicus Browser"],
          ["Uluslararası uygulama deneyimi, sade NDVI bakışı", "OneSoil"],
          ["Türkçe anlatım + durum puanı + hava bir arada", "Agradex"],
        ],
      },
    },
    {
      heading: "Başlarken üç pratik tavsiye",
      bullets: [
        "Sınırı tapu çizgisinden değil, gerçekten ekili alandan çizin — yol, kanal ve ağaç sırası parsele girerse ortalamayı bozar.",
        "İlk gün arşive bakın: geçen sezonun eğrisi, bu sezon göreceğiniz her değerin bağlamıdır.",
        "Hangi aracı seçerseniz seçin tek görüntüyle karar vermeyin; iki-üç geçişlik trend, tek sahneden her zaman daha güvenilirdir. Bulutlu geçişten kalan yarım veriye ise hiç karar bağlamayın.",
      ],
    },
    {
      heading: "Ücretsiz yolun dürüst sınırı",
      paragraphs: [
        "Hangi aracı seçerseniz seçin fizik aynıdır: Sentinel-2 yaklaşık 5 günde bir geçer, bulutlu geçiş görüntü vermez, 10 metrelik piksel tek ağacı göstermez. Ücretsiz araçların farkı veride değil, o veriyi ne kadar anlaşılır sunduklarındadır. Bir aracın ücretsiz kalıp kalmayacağı da sizin elinizde değildir — OneSoil örneği bunu gösterdi. Neyse ki veri kaynağı açık olduğu sürece geçiş maliyeti düşüktür: sınırlarınızı yeniden çizmek bir öğleden sonranızı alır. Geçmişiniz de kaybolmaz — Sentinel-2 arşivi herkese açıktır ve her araç aynı arşivden okur.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency"],
};
