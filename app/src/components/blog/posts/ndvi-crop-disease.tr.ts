import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-crop-disease",
  locale: "tr",
  title: "NDVI bitki hastalığını tespit eder mi? Dürüst cevap",
  description:
    "Doğrudan hayır: NDVI hastalığı değil stresi görür, sebebini söylemez. Uydunun gerçek rolü erken sinyal vermektir; teşhis tarlada konur. Ne görünür, ne görünmez.",
  lead:
    "Dürüst cevap: doğrudan hayır. NDVI bir hastalık dedektörü değildir — bitki örtüsünün zayıfladığını görür ama sebebini söylemez. Sarı pas, su kıtlığı, azot eksikliği ve tel kurdu uyduda birbirine çok benzer: hepsi \"bu bölgede NDVI düşüyor\" sinyali verir. Uydunun gerçek değeri başkadır: nereye ve ne zaman bakmak gerektiğini insandan çok önce göstermek.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Uydu gerçekte neyi görür?",
      paragraphs: [
        "Hastalık yaprak dokusunu bozdukça fotosentez zayıflar, kırmızı ışığın emilimi azalır — NDVI düşer. Yayılmış ciddi bir enfeksiyon uyduda net bir leke olarak çıkar. Sorun şurada: aynı lekeyi tuzluluk, sıkışmış toprak şeridi, eşit dağılmayan sulama, gübre atlanmış sıralar, hatta ilkbaharın geç donu da yaratır. Konya'da buğdaydaki sarı pas ile Ege bağındaki külleme, uydudan bakınca aynı \"zayıflayan bölge\" izini bırakır. Uydu yalnız \"ne kadar yeşil\" sorusuna cevap verir; \"neden solgun\" sorusu onun işi değildir.",
        "Bir de 10 metrelik piksel gerçeği var: hastalık ilk 5-10 ağaçta ya da birkaç metrekarelik bir ocakta başladığında uydu onu henüz görmez. Görünür hale geldiğinde ocak çoktan büyümüştür. Bu yüzden \"uydu temiz gösteriyor\" cümlesi \"tarla temiz\" anlamına gelmez — küçük ocaklar her zaman görüş eşiğinin altında başlar.",
      ],
    },
    {
      heading: "Peki uydu ne işe yarar?",
      bullets: [
        "Erken yön gösterme: tarlanın hangi köşesinde trend bozuldu — kontrolü körlemesine değil, adresli yaparsınız.",
        "Zaman kazancı: NDVI bölgesi, insan gözünün sararmayı fark etmesinden 1-2 hafta önce ayrışmaya başlayabilir.",
        "İlaçlamadan sonra takip: uygulama işe yaradı mı? Sonraki geçişlerde bölgenin toparlanması — ya da toparlanmaması — sayıyla görünür.",
        "Ayırt etmeye yardım: NDMI ile birlikte okununca \"bu su stresi, hastalık değil\" ihtimali epey netleşir.",
        "Kayıt düzeni: hangi bölgeye ne zaman baktığınız ve ne bulduğunuz tarlanın geçmişinde birikir — gelecek sezon aynı köşe yine zayıflarsa elinizde kıyas olur.",
      ],
    },
    {
      heading: "Erken sinyal hangi durumda daha olası?",
      paragraphs: [
        "Sinyalin erken gelmesi, sorunun alana nasıl yayıldığına bağlıdır. Sarı pas gibi rüzgârla taşınan ve tarlanın geniş bölümünü aynı anda etkileyen stresler, 10 metrelik piksellerde görece erken iz bırakır. Tek ağaçta başlayan kök çürüklüğü ya da birkaç ocaklık zararlı baskısı ise piksel ortalamasının içinde uzun süre kaybolur. Kural pratiktir: sorun ne kadar yaygınsa uydu o kadar erken konuşur; ne kadar noktasalsa ayağınız ve gözünüz o kadar önemlidir. NDMI ve NDRE'yi birlikte okumak bu eşiği biraz öne çeker ama ortadan kaldırmaz. Bu yüzden ilaçlama programını yalnız uyduya bağlamak yanlıştır — uydu programın gözcüsüdür; takvimi ve eşikleri tarladaki gözlem belirler.",
      ],
    },
    {
      heading: "Doğru iş akışı: uydu → ayak → fotoğraf",
      paragraphs: [
        "İşleyen düzen üç adımdır. Birinci: uydu haritasında zayıflayan bölgeyi görürsünüz. İkinci: o noktaya gidip yaprağa bakarsınız — lekenin rengi, biçimi, yaprağın neresinde durduğu. Üçüncü: şüpheli yaprağın fotoğrafını çekersiniz; Agradex'te foto-teşhis özelliği görüntüyü inceleyip olası sebebi ve bir sonraki adımı yazar, gözlem de tarlanın geçmişinde kalır. Fotoğrafta işe yarayan çerçeve bellidir: lekenin yakın çekimi, yaprağın alt yüzü ve sağlam dokuyla hasta dokunun sınırı.",
        "Teşhisin son sözü her zaman yerdedir — laboratuvar analizi ya da deneyimli bir ziraat mühendisinin gözü. Uydu bu zinciri ortadan kaldırmaz, ucuzlatır: 200 dönümü adım adım gezmek yerine üç şüpheli bölgeye doğrudan gidersiniz. Yakıt da kazanır, zaman da, teşhisin kendisi de.",
      ],
    },
    {
      heading: "Bir fındık bahçesinden gözlem",
      paragraphs: [
        "Kafkasya'da izlediğimiz fındık bahçelerinden birinde, yaz ortasında bahçenin kuzey şeridinde NDVI komşu şeritlerden ısrarla düşük seyrediyordu. Yerinde kontrol basit bir sebep çıkardı: o şeritteki sulama hattı zayıf çalışıyordu; hastalık yoktu. Uydu \"hastalık var\" demedi — \"buraya bak\" dedi. Ordu'daki ya da Giresun'daki bir bahçe için izlenecek yol da aynıdır: önce sulama ve toprak gibi basit sebepleri eleyin; hastalık şüphesi kalırsa yaprağı fotoğraflayıp teşhise gidin. İndeksin iddiası az, faydası somuttur.",
      ],
    },
  ],
  related: ["what-is-ndvi", "ndvi-ndmi-ndre"],
};
