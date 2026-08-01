// Turkish privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyTr: PrivacyDoc = {
  title: "Gizlilik politikası",
  lead:
    "Agradex; uydu görüntüleri, hava durumu verisi ve yapay zekâ ile tarlaları izleyen bir " +
    "platformdur. Bu sayfa hukuki bir şablon değil — sistemin sizin hakkınızda ne topladığını, " +
    "nerede sakladığını, kime gönderdiğini ve hesabınızı kapattığınızda ne olduğunu olduğu gibi " +
    "anlatır.",
  summary: [
    "Tüm veriler AB içinde — Helsinki'deki (Finlandiya) tek bir sunucuda, kendi işlettiğimiz Postgres veritabanında saklanır.",
    "Reklam izleyicisi, analitik pikseli ve üçüncü taraf çerezi yoktur; bu yüzden onay bandı da yoktur.",
    "Yapay zekâya tarla verisi gider, hesap verisi gitmez: adınız, e-postanız ve parola özetiniz model sağlayıcısına asla gönderilmez.",
    "Tekrarlayan tek e-posta haftalık özettir (çarşamba günleri); tek tıkla çıkabilirsiniz.",
    "Hesabı kapatmak kişiyi siler ama yazdığınız kayıtları korur — artık kimseye işaret etmezler.",
  ],
  sections: {
    scope: {
      heading: "Bu belge neyi kapsar",
      body: [
        {
          kind: "p",
          text:
            "Bu politika agradex.com (tanıtım sitesi), app.agradex.com (uygulama) ve telefona " +
            "kurulabilen web uygulaması (PWA) için geçerlidir. Hepsi aynı sunucuda, aynı " +
            "veritabanıyla çalışır.",
        },
        {
          kind: "p",
          text:
            "Dürüstlük adına baştan söyleyelim: Agradex hâlâ geliştirme aşamasında ve ürünün " +
            "arkasında kayıtlı bir tüzel kişi (şirket adı, sicil numarası, kayıtlı adres) ilan " +
            "edilmedi. Bu nedenle belge resmî bir veri sorumlusu belirtmiyor. Verilerinizle " +
            "ilgili her talep, info@agradex.com üzerinden platformu yürüten ekibe ulaşır.",
        },
        {
          kind: "p",
          text:
            "Belge yalnızca bizim sistemimizi kapsar. Sizi Agradex dışına götüren bağlantıların " +
            "(örneğin uydu veri kaynaklarının resmî sayfaları) kendi gizlilik kuralları vardır.",
        },
      ],
    },
    "account-data": {
      heading: "Hesap verileri",
      body: [
        {
          kind: "p",
          text: "Kaydolduğunuzda ve ayarlarınızı değiştirdiğinizde sakladıklarımız şunlardır:",
        },
        {
          kind: "ul",
          items: [
            "E-posta adresi — giriş kimliğinizdir ve benzersizdir.",
            "Parola — yalnızca bcrypt özeti olarak. Açık parolayı ne saklarız ne de geri getirebiliriz.",
            "Ad soyad (isteğe bağlı), arayüz dili, ülke ve bölge.",
            "Rol: çiftçi, laboratuvar, danışman ziraat mühendisi veya tedarikçi.",
            "Alan birimi tercihi (hektar / dönüm / sotka) — seçmediyseniz ülkenize göre belirlenir.",
            "Bildirim tercihleri (hangi kanalları kapattığınız) ve e-posta özetinden çıkış işareti.",
            "Anlık bildirimi açtığınız her cihaz için tarayıcının verdiği abonelik (teslim adresi, şifreleme anahtarları, tarayıcı dizesi) — aboneliği bıraktığınızda kayıt silinir.",
            "Ad görünürlüğü tercihi — adınızın diğer kullanıcılara gösterilip gösterilmeyeceği.",
            "Tanıtım sayfasındaki kısa anketin yanıtları (ürün, ülke, bölge, temel sorun, ihtiyaçlar), kayıttan önce doldurduysanız.",
            "E-posta doğrulama durumu ve geçici 6 haneli kod — kod kullanıldığı anda silinir.",
            "Son görülme zamanı — saatte en fazla bir kez yazılır, yalnızca hesabın kullanımda olup olmadığını bilmek için.",
          ],
        },
        {
          kind: "p",
          text:
            "Veritabanında telefon numarası sütunu var ama kayıt formu bunu hiç sormuyor — yani " +
            "pratikte telefon numarası toplanmıyor. Kart veya ödeme verisi hiç toplanmıyor " +
            "(Kullanım koşullarındaki «Paketler ve ödeme» bölümüne bakın).",
        },
      ],
    },
    "field-data": {
      heading: "Tarla ve işletme verileri",
      body: [
        { kind: "p", text: "Platformun asıl içeriği, girdiğiniz işletme verileridir:" },
        {
          kind: "ul",
          items: [
            "Haritada çizilen tarla sınırı ve alanı (veritabanında her zaman hektar olarak tutulur — birim tercihi yalnızca gösterimi etkiler).",
            "Tarla, işletme ve organizasyon adları.",
            "Tarla pasaportu: ürün, çeşit, ekim ve hasat tarihleri, toprak tipi ve pH, sulama yöntemi, gelişme dönemi, önceki ürün, serbest notlar.",
            "Tarla gözlemleri, yüklediğiniz fotoğraflar, tarla işlemleri, verim kayıtları, görevler ve sezonlar.",
            "Defter, satış, depo ve makine kayıtları, yüklediğiniz belgeler.",
            "Toprak laboratuvar analizleri — yüklediğiniz tarama ve OCR ile okunan değerler.",
          ],
        },
        { kind: "p", text: "Bunların üzerine sistem şunları hesaplar ve saklar:" },
        {
          kind: "ul",
          items: [
            "Her uydu görüntüsü için 9 indeksin (NDVI, NDMI ve diğerleri) istatistikleri ve tarlanıza kırpılmış raster dosyaları.",
            "Hava durumu geçmişi, tarla sağlık skoru, etkili sıcaklık toplamı (GDD).",
            "Yapay zekâ tavsiyesinin metni, hangi girdilerden üretildiği, hangi modelin ve hangi dilde yazdığı.",
            "Yapay zekâ sohbet mesajları, bildirimler, paylaşım bağlantısı jetonları.",
            "Yapay zekâ kullanımının jeton ve maliyet kaydı.",
            "Yedi belirli ürün olayı (anket başlatıldı, tarla oluşturuldu, ürün seçildi, ilk görüntü açıldı, tavsiye okundu, Telegram bağlandı, kontrol listesi tamamlandı) — bu liste kodda sabittir; başka hiçbir davranışınız izlenmez.",
          ],
        },
      ],
    },
    storage: {
      heading: "Veriler nerede duruyor",
      body: [
        {
          kind: "p",
          text:
            "Her şey Helsinki'deki (Finlandiya, Avrupa Birliği) tek bir Hetzner sunucusunda " +
            "saklanır. Veritabanı, o makinede Docker içinde çalışan kendi Postgres 16 + PostGIS " +
            "kurulumumuzdur. Yüklediğiniz dosyalar aynı sunucunun yerel diskinde, uydu " +
            "rasterları ise aynı diskteki ayrı bir klasördedir.",
        },
        {
          kind: "p",
          text:
            "Yönetilen üçüncü taraf veritabanı (örneğin Supabase) ve üçüncü taraf nesne " +
            "depolaması (S3 vb.) kullanmıyoruz — bu bilinçli bir mimari karardır.",
        },
        {
          kind: "p",
          text:
            "Yedekler, aynı ekibin işlettiği bir sunucuda, Avrupa Birliği içinde tutulur. " +
            "Yedekler için resmî bir saklama süresi tanımlanmamıştır.",
        },
      ],
    },
    processors: {
      heading: "Veriler kime gönderiliyor",
      body: [
        {
          kind: "p",
          text:
            "Aşağıdakiler platformun kullandığı dış servislerdir. Liste eksiksizdir — " +
            "verilerinizi reklam ağlarına, veri simsarlarına veya pazarlama platformlarına " +
            "aktarmıyoruz ve satmıyoruz.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "Anthropic (Claude)",
              v:
                "Yapay zekâ tavsiyesi, sohbet, fotoğraf teşhisi ve araştırma katmanı. Giden: " +
                "tarla adı, alan, ürün pasaportu (notlar dâhil), indeks eğilimleri, hava durumu, " +
                "son gözlemler, işlemler, açık görevler, son verim kayıtları, önceki tavsiyenin " +
                "özeti, son sohbet turları ve teşhis için gönderdiğiniz fotoğraf. Gitmeyen: " +
                "e-posta, ad, parola özeti.",
            },
            {
              k: "Resend",
              v:
                "E-posta gönderimi — alıcı adresi, hitap adı ve mesaj metni. Yapılandırılmışsa " +
                "yedek kanal olarak SMTP kullanılır.",
            },
            {
              k: "Open-Meteo",
              v: "Tarlanın merkez koordinatı — 7 günlük tahmin ve buharlaşma (ET0) hesabı için.",
            },
            { k: "ISRIC SoilGrids", v: "Tarlanın koordinatı — toprak profilini almak için." },
            {
              k: "FAOSTAT",
              v: "Ülke düzeyinde verim istatistikleri. Sizinle ilgili hiçbir şey gitmez.",
            },
            {
              k: "EPPO",
              v:
                "Yalnızca ürün adı ve yalnızca API anahtarı tanımlıysa. Bugün anahtar tanımlı " +
                "değil, dolayısıyla bu servise hiç istek gitmiyor.",
            },
            {
              k: "NASA Earthdata (HLS) ve Copernicus Sentinel-2",
              v:
                "Veri bize gelir, sizden gitmez: görüntü aramasında tarlanın sınırlayıcı " +
                "dikdörtgeni ve tarih aralığı gönderilir. Hesap, ad ve adres iletilmez.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "Harita aramasına yazdığınız yer adı (tarayıcıdan) ve bir koordinatın yer adına " +
                "çevrilmesi (sunucudan).",
            },
            {
              k: "Harita altlık sunucuları",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap ve arazi " +
                "karoları doğrudan tarayıcınıza yüklenir — yani bu sunucular IP adresinizi ve " +
                "hangi alana baktığınızı görür.",
            },
            {
              k: "Tarayıcınızın anlık bildirim servisi",
              v:
                "Anlık bildirimi açarsanız mesaj, tarayıcınızın push servisi (tarayıcıya göre " +
                "Google, Mozilla veya Apple) üzerinden iletilir. Metin şifreli gider, ancak " +
                "servis cihazınızın abonelik adresini görür.",
            },
            {
              k: "Google (Google ile giriş)",
              v:
                "Yalnızca «Google ile devam et» düğmesine kendiniz basarsanız. Google’a giden: tarayıcınız (yani IP adresiniz) ve hangi uygulamaya giriş yaptığınız. Google’ın bize döndürdüğü: hesabın kalıcı kimliği, e-posta adresi, doğrulanmış olup olmadığı ve görünen adınız. Tarlalarınız, notlarınız ve uydu verileriniz hakkında Google’a hiçbir şey gitmez. Sayfalarımıza Google betiği yüklenmez — düğme sıradan bir bağlantıdır, bu yüzden siz basana kadar Google sitemizde olduğunuzu görmez.",
            },
            {
              k: "Telegram",
              v:
                "Yalnızca botu kendiniz bağlarsanız. Bugün bot jetonu tanımlı değil, kanal " +
                "çalışmıyor.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Yapay zekâ",
      body: [
        {
          kind: "p",
          text:
            "Tavsiye, sohbet ve fotoğraf teşhisi Anthropic'in Claude modelleriyle çalışır. " +
            "Modele gönderilen bağlam tarlayla ilgilidir, kimliğinizle değil — bağlamı kuran kod " +
            "hesap tablosundan hiçbir sütun okumaz.",
        },
        {
          kind: "p",
          text:
            "Her yapay zekâ çağrısının jeton sayısı ve tahmini maliyeti kendi veritabanımıza " +
            "kaydedilir; bu, kota hesabı ve maliyet kontrolü içindir.",
        },
        {
          kind: "p",
          text:
            "Yapay zekâ anahtarı yapılandırmadan çıkarılırsa sistem düzgün biçimde geriler: " +
            "tavsiye üretilmez, sohbet yanıt vermez, geri kalan her şey çalışmaya devam eder.",
        },
        {
          kind: "p",
          text:
            "Yapay zekânın yanıtı otomatik bir analizdir ve yanlış olabilir. Sınırları Kullanım " +
            "koşullarında ayrıca anlatılıyor.",
        },
      ],
    },
    email: {
      heading: "E-posta",
      body: [
        {
          kind: "p",
          text:
            "Tekrarlayan tek mesaj haftalık özettir — her çarşamba saat 07:00'de (Bakü saati) " +
            "gönderilir ve teknik olarak haftada bir defadan fazla gönderilemez.",
        },
        {
          kind: "p",
          text:
            "Bunun dışında yalnızca işlemsel mesajlar vardır: doğrulama kodu, hoş geldiniz " +
            "mesajı ve tarlanız ilk kez hazır olduğunda gelen rapor. Her biri 24 saatte en fazla " +
            "bir kez gönderilir.",
        },
        {
          kind: "p",
          text:
            "Her özetin altında tek tıkla çıkış bağlantısı vardır — giriş gerekmez. Aynı ayarı " +
            "hesap sayfasından da kapatabilirsiniz. Dikkat: çıksanız bile işlemsel mesajlar " +
            "(doğrulama kodu gibi) gelmeye devam eder, çünkü hesap onlarsız çalışmaz.",
        },
        {
          kind: "p",
          text:
            "Reklam e-postası göndermiyoruz ve adresinizi kimseyle paylaşmıyoruz. Dürüstlük " +
            "adına: özet metni şu anda Türkçe, Almanca, Macarca, İtalyanca ve Lehçe okuyuculara " +
            "İngilizce ulaşıyor — çevirisi henüz hazır değil.",
        },
      ],
    },
    cookies: {
      heading: "Çerezler ve tarayıcı deposu",
      body: [
        { kind: "p", text: "Üç çerez vardır, üçü de işlevseldir:" },
        {
          kind: "ul",
          items: [
            "bagban_session — oturum çerezi. httpOnly (JavaScript okuyamaz), SameSite=Lax, https üzerinde Secure, 7 gün. Başka hiçbir amaçla kullanılmaz.",
            "bagban_locale — seçtiğiniz dili hatırlar, 1 yıl.",
            "bagban_oauth_state — yalnızca «Google ile devam et» düğmesine bastığınızda oluşur ve yalnızca o girişi korumak içindir (CSRF). httpOnly, SameSite=Lax, Secure, 10 dakika; giriş biter bitmez silinir.",
          ],
        },
        {
          kind: "p",
          text:
            "Hepsi bu. Kodun hiçbir yerinde Google Analytics, Google Tag Manager, Plausible, " +
            "Hotjar, Mixpanel, PostHog, Facebook pikseli veya başka bir izleyici yok. Site size " +
            "tam da bu yüzden çerez onayı bandı göstermiyor — soracak bir şey yok.",
        },
        {
          kind: "p",
          text:
            "Ayrıca tarayıcınızın yerel deposunda bazı arayüz tercihleri durur: harita altlığı, " +
            "veri tasarrufu modu, çevrimdışı kuyruk, başlangıç kontrol listesinin durumu ve " +
            "kayıttan önce doldurduğunuz anketin yanıtları. Bunlar cihazınızda kalır; anket " +
            "yanıtları sunucuya yalnızca kayıt isteğiyle birlikte gider.",
        },
      ],
    },
    visibility: {
      heading: "Verilerinizi kim görüyor",
      body: [
        {
          kind: "ul",
          items: [
            "Organizasyonunuzun diğer üyeleri — tarlaları rollerine göre görür; yetki her istekte sunucuda denetlenir.",
            "Paylaşım bağlantısı (/s/…) elinde tutan herkese kasıtlı olarak sadeleştirilmiş, salt okunur bir tarla kartı gösterir. Bağlantıyı istediğiniz an iptal edebilirsiniz.",
            "Tarla erişimi — bir tarlayı adıyla belirttiğiniz bir kullanıcıya açarsanız, yalnızca o tarlanın raporunu görür (diğer tarlalarınızı, çiftliğinizi veya ekibinizi değil). İstediğiniz zaman geri alabilirsiniz; o kişi de kendisi bırakabilir.",
            "Ad görünürlüğünü kapatırsanız, diğer kullanıcıların gördüğü yüzeylerde adınız «user_…» takma adıyla değiştirilir.",
            "Karşılaştırma ve kıyaslama değerleri en az 5 başka tarladan oluşan bir küme olmadan hesaplanmaz ve hiçbir zaman belirli bir tarlanın veya işletmenin adını vermez.",
            "Platformu yürüten ekip — bir yönetim paneli üzerinden tüm organizasyonlardaki kullanım, yapay zekâ maliyeti ve hesapları görür; ayrıca sunucunun işletmecisi olarak veritabanına teknik erişimi vardır.",
          ],
        },
      ],
    },
    retention: {
      heading: "Saklama ve silme",
      body: [
        {
          kind: "p",
          text:
            "Tarla silmek «yumuşak silme»dir: tarla listeden kaybolur ve geri getirilebilir, " +
            "veritabanından fiziksel olarak çıkarılmaz.",
        },
        {
          kind: "p",
          text:
            "Hesabı kapatmak (hesap sayfasındaki düğme) geri alınamaz ve tam olarak şunları " +
            "yapar:",
        },
        {
          kind: "ul",
          items: [
            "Onay için kendi e-posta adresinizi elle yazmanız gerekir.",
            "Sahibi olduğunuz bir organizasyonda hâlâ başka etkin üyeler varsa işlem reddedilir — önce organizasyonu devretmelisiniz.",
            "Tüm üyelikler silinir, yani erişim anında sona erer.",
            "Yalnızca sizin üye olduğunuz organizasyonların tarlaları yumuşak silinir.",
            "E-posta adresi çalışmayan bir iç adresle değiştirilir — bu, gerçek adresinizi serbest bırakır ve onunla yeniden kaydolabilirsiniz.",
            "Ad, ülke, bölge, anket yanıtları ve bildirim tercihleri sıfırlanır; parola özeti hiçbir parolanın üretemeyeceği bir değerle değiştirilir; hesap devre dışı bırakılır.",
          ],
        },
        {
          kind: "p",
          text:
            "Kalanlar: yazdığınız kayıtlar — tarlalar, sınırlar, gözlemler, defter satırları, " +
            "verimler. Nedeni tekniktir ve saklamıyoruz: on beş tablo kullanıcıya atıf yapar ve " +
            "kaskad silme, bir çalışan ayrıldı diye bütün bir işletmenin geçmişini yok ederdi. " +
            "Bu kayıtlar kalır ama artık belirlenebilir bir kişiye bağlı değildir. Kullanım " +
            "kaydı, e-posta gönderim günlüğü ve olay satırları artık kimseyi göstermeyen bir " +
            "kullanıcı kimliğini korur.",
        },
        {
          kind: "p",
          text: "Uydu ve türetilmiş veriler için otomatik bir sona erme mekanizması yoktur.",
        },
      ],
    },
    rights: {
      heading: "Haklarınız ve bugün neler yapabilirsiniz",
      body: [
        { kind: "p", text: "Bunların hepsi hesap sayfasında, anında, kendiniz yapılır:" },
        {
          kind: "ul",
          items: [
            "Parolayı değiştirmek.",
            "Ad, ülke ve bölgeyi düzenlemek.",
            "Arayüz dilini ve alan birimini değiştirmek.",
            "Bildirim matrisini (kategori × kanal) ayarlamak.",
            "Ad görünürlüğünü kapatmak.",
            "E-posta özetinden çıkmak.",
            "Hesabı kapatmak.",
          ],
        },
        {
          kind: "p",
          text:
            "Tarla sınırlarını tarla oluşturma ekranından GeoJSON veya KML olarak " +
            "indirebilirsiniz.",
        },
        {
          kind: "p",
          text:
            "Tüm hesabın otomatik dışa aktarımı henüz yok — bunu saklamıyoruz. Verilerinizin bir " +
            "kopyasını veya tamamen silinmesini isterseniz info@agradex.com adresine yazın, elle " +
            "hazırlayalım.",
        },
      ],
    },
    changes: {
      heading: "Değişiklikler",
      body: [
        {
          kind: "p",
          text:
            "Bu belge sistemi anlatır, dolayısıyla sistem değiştikçe o da değişmelidir. Son " +
            "güncelleme tarihi sayfanın başında gösterilir.",
        },
        {
          kind: "p",
          text:
            "Neyin toplandığına veya nereye gönderildiğine dair önemli bir değişikliği önceden — " +
            "uygulama içi bildirim veya haftalık özet yoluyla — duyuracağız.",
        },
      ],
    },
  },
};
