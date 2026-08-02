import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-ndmi-ndre",
  locale: "tr",
  title: "NDVI, NDMI, NDRE: fark nedir, hangisine ne zaman bakılır?",
  description:
    "NDVI örtü yoğunluğunu, NDMI bitkideki nemi, NDRE azot-klorofil durumunu gösterir. Hangi soruya hangi indeks cevap verir — üçünü birlikte okuma rehberi.",
  lead:
    "Üç indeks üç ayrı soruya cevap verir. NDVI: \"örtü ne kadar sık?\" NDMI: \"bitkinin dokusunda su var mı?\" NDRE: \"yaprakta klorofil — pratikte azot beslenmesi — ne durumda?\" En sık yapılan hata, NDVI'yi üç sorunun da cevabı gibi okumaktır: sık ama susuz kalmış bir ekin NDVI'da hâlâ iyi görünebilir, oysa NDMI çoktan düşmeye başlamıştır.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Bir bakışta karşılaştırma",
      table: {
        headers: ["İndeks", "Neyi ölçer", "Hangi soruda işe yarar", "Tipik aralık"],
        rows: [
          ["NDVI", "Yeşil kütlenin yoğunluğu", "Genel durum, zayıf bölgeler, trend", "0.1 – 0.8"],
          ["NDMI", "Bitki dokusundaki nem", "Su stresini sulamadan ÖNCE yakalamak", "−0.2 – 0.4"],
          ["NDRE", "Klorofil / azot sinyali", "Gübre zamanı, sık taçta ince farklar", "0.1 – 0.5"],
        ],
      },
    },
    {
      heading: "NDVI: temel çizgi",
      paragraphs: [
        "NDVI üçlünün çapasıdır: mevsim boyunca en düzenli üretilen, en kolay yorumlanan eğri odur. Zayıf bölgeyi ilk o gösterir, trendi ilk o kırar. Sınırı da nettir: örtü sıklaştıkça duyarlılığı azalır ve stresin sebebi hakkında hiçbir şey söylemez. Diğer iki indeks tam bu iki boşluğu doldurur — NDMI sebebin \"su\" olup olmadığını, NDRE sık örtüde beslenme farklarını okur.",
        "Pratikte haftalık düzen şudur: NDVI eğrisine bakılır; bir gariplik varsa sebep için NDMI ve NDRE açılır. Üçünü her gün ayrı ayrı izlemek gerekmez — ikisi uzmandır, gerektiğinde çağrılır.",
      ],
    },
    {
      heading: "NDMI: su stresini NDVI'dan önce görür",
      paragraphs: [
        "NDMI, yakın kızılötesi ile kısa dalga kızılötesi kanallarını karşılaştırır; su kısa dalga kızılötesini emdiği için indeks doğrudan dokudaki neme duyarlıdır. Pratik aralığı yaklaşık −0.20 ile 0.40 arasıdır: yeşil, suya doymuş bir ekin artı tarafta durur; kuruyan örtü sıfırın altına iner. Sulamadan sonra yükselmesi normaldir — düşüşün haber değeri, sulama yokken gelmesindedir.",
        "Gerçek bir vaka: izlediğimiz tarlalardan birinde NDVI henüz \"orta\" görünürken NDMI −0.13'e inmişti — örtü biçimini koruyordu ama su rezervi tükeniyordu. Bu sinyal, sulama kararını NDVI'nin göstereceğinden 1-2 geçiş önce vermenizi sağlar. Şanlıurfa'da temmuz sıcağındaki pamuk ya da Konya'da dane dolumundaki buğday için 1-2 geçiş, 5-10 gün demektir — verimin korunduğu yer çoğu zaman tam bu aralıktır.",
      ],
    },
    {
      heading: "NDRE: NDVI \"doyunca\" devreye girer",
      paragraphs: [
        "Pik vejetasyonda sık taç, NDVI'yi 0.8 civarında tavana yapıştırır — o noktadan sonra parsel içi farklar NDVI'da kaybolur. NDRE kırmızı kenar (red edge) bandını kullandığı için tam bu doyma bölgesinde ayırt etmeye devam eder: hangi şeridin azot beslenmesi geride kalıyor, üst gübreyi nereye yönlendirmek gerekiyor.",
        "Buğdayda sapa kalkma ile başaklanma arası, fındıkta yazın ilk yarısı, pamukta çiçeklenme öncesi — NDRE farklarının gübre planına en çok katkı verdiği pencereler bunlardır. Karadeniz fındığında taç yaz başında kapanır; NDVI o noktadan sonra bahçe içindeki farkları düzler, NDRE ise hangi sırtın geride kaldığını göstermeye devam eder.",
      ],
    },
    {
      heading: "Pratik okuma sırası",
      bullets: [
        "Her geçişte önce NDVI trendine bakın: düşüyorsa sebep arayın.",
        "NDVI normal ama hava sıcak ve kuruysa — NDMI'ye geçin: su stresi önce orada görünür.",
        "NDVI yüksek ve tekdüzeyse, parsel içi fark arıyorsanız — NDRE haritasını açın.",
        "Üç indeks aynı yönde bozuluyorsa sorun yerel değildir — su, kök ya da hastalık düzeyinde ciddi bir kontrol gerekir.",
        "Sulamadan ya da yağıştan hemen sonraki tek sahnelik sıçramaya karar bağlamayın; iki-üç geçişlik seyir, üç indeksin üçünde de tek görüntüden daha güvenilirdir.",
      ],
    },
    {
      heading: "Agradex'te nasıl görünür?",
      paragraphs: [
        "Her tarla için dokuz indeks hesaplanır; harita katmanı tek dokunuşla değişir ve her indeksin yanında sade bir açıklama durur. Yapay zekâ analizi ise üç indeksin uyumsuzluklarını kendisi yakalayıp risk sinyali olarak yazar — \"NDVI sabit ama NDMI 10 gündür düşüyor\" tipi cümle hazır gelir. Kayıt olmadan denemek isterseniz demo tarlada katmanları yan yana açabilirsiniz; aynı bölgeye üç indeksle bakmak, bu yazının anlattığını iki dakikada gösterir.",
      ],
    },
  ],
  related: ["what-is-ndvi", "when-to-irrigate-wheat"],
};
