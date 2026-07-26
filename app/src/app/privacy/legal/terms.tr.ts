// Turkish terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the tr
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsTr: TermsDoc = {
  title: "Kullanım koşulları",
  lead:
    "Bu sayfa Agradex'in neyi vaat ettiğini ve — daha önemlisi — neyi vaat etmediğini anlatır. " +
    "Hukuki bir şablon değildir: burada yazan her şey ürünün bugünkü hâline uygundur.",
  summary: [
    "Agradex bir karar destek aracıdır; ziraat mühendisinin, laboratuvarın ve tarlaya çıkmanın yerini tutmaz.",
    "Yapay zekâ tavsiyesi otomatik bir analizdir ve yanılabilir — son karar sizindir.",
    "Şu anda ödeme sistemi bağlı değil: kart verisi toplanmıyor ve haber verilmeden hiçbir tahsilat yapılmıyor.",
    "İşletme verileriniz sizindir; onları satmıyoruz.",
    "Hizmet tek bir sunucuda çalışır; SLA ve garantili çalışma süresi yoktur.",
  ],
  sections: {
    service: {
      heading: "Hizmet nedir",
      body: [
        {
          kind: "p",
          text:
            "Agradex; uydu görüntüleri (Sentinel-2 ve uyumlaştırılmış Landsat–Sentinel ürünü), " +
            "hava tahmini, tarımsal modeller ve yapay zekâ üzerine kurulu bir tarla izleme ve " +
            "işletme yönetimi platformudur. Hizmete web sitesi, uygulama ve telefona " +
            "kurulabilen web uygulaması (PWA) dâhildir.",
        },
        {
          kind: "p",
          text:
            "Platformun arkasında henüz kayıtlı bir tüzel kişi ilan edilmedi; bu nedenle belgede " +
            "şirket adı, sicil numarası ve uygulanacak hukuk yer almıyor. Belgenin ne olduğu " +
            "konusunda yanlış bir izlenim oluşmasın diye bunu açıkça yazıyoruz. İletişim: " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Hizmeti kullanarak bu koşulları kabul etmiş sayılırsınız. Kabul etmiyorsanız hesap " +
            "açmayın veya mevcut hesabınızı kapatın.",
        },
      ],
    },
    account: {
      heading: "Hesap",
      body: [
        {
          kind: "ul",
          items: [
            "Bir e-posta adresi bir hesaba karşılık gelir; e-posta aynı zamanda giriş kimliğinizdir.",
            "Kayıttan sonra e-posta adresi 6 haneli bir kodla doğrulanır.",
            "Giriş bilgilerinizin güvenliği sizin sorumluluğunuzdadır; hesabınızdan yapılan işlemler size ait sayılır.",
            "Doğru bilgi vermelisiniz — özellikle tarla sınırı ve ürün, çünkü tüm analiz bunların üzerine kuruludur.",
            "Organizasyon içindeki yetkiler role göre verilir; organizasyon sahibi üye ekleyip çıkarabilir.",
            "Hesabınızı istediğiniz an kapatabilirsiniz. Ne olduğu Gizlilik politikasında adım adım anlatılmıştır.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Yapay zekânın sınırları",
      body: [
        {
          kind: "p",
          text:
            "Her yapay zekâ tavsiyesinin altına tam olarak şu cümle yazılır: «Bu tavsiyeler uydu " +
            "ve tarla verilerine dayanan otomatik bir analizdir; karar vermeden önce sahada " +
            "doğrulayın.» Bu bir formalite değil, kelimenin tam anlamıyla hizmetin sınırıdır.",
        },
        {
          kind: "ul",
          items: [
            "Yapay zekâ yanılabilir: bulut altında kalan bir tarlayı yanlış okuyabilir; pasaport verisi eksikse sonuç da eksik olur.",
            "Fotoğraf teşhisi hiçbir zaman belirli bir pestisit markası veya dozu söylemez — sizi ruhsatlı ürünler listesine ve bir ziraat mühendisine yönlendirir.",
            "Tavsiye; veteriner, bitki sağlığı, hukuki veya finansal danışmanlık değildir.",
            "Uydu indeksleri ve modeller laboratuvar analizinin, toprak örneğinin ve tarlaya çıkmanın yerini tutmaz.",
            "Herhangi bir kimyasal ürünü uygulamadan önce mutlaka etiketi ve yerel kuralları okuyun.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Kabul edilebilir kullanım",
      body: [
        { kind: "p", text: "Aşağıdakilere izin verilmez:" },
        {
          kind: "ul",
          items: [
            "Sisteme otomatik toplu istek göndermek, içeriği kazımak (scraping) veya yapay yükle hizmeti durdurmaya çalışmak.",
            "Başkasının hesabına izinsiz girmek, güvenlik mekanizmalarını aşmaya çalışmak, zararlı kod yerleştirmek.",
            "Size ait olmayan ve paylaşma hakkınız bulunmayan verileri (örneğin başka bir işletmenin tarla belgelerini) yüklemek.",
            "Yasa dışı, sahte veya başkasının hakkını ihlal eden içerik yayımlamak.",
            "Hizmeti veya yapay zekâ yanıtlarını izinsiz olarak üçüncü kişilere hizmet şeklinde satmak.",
            "Platformun koduna veya modellerine tersine mühendislik uygulamak.",
          ],
        },
        {
          kind: "p",
          text:
            "Bu kuralların ihlali hesabın askıya alınmasına yol açabilir. Böyle bir durumda " +
            "nedenini açıklamaya çalışacağız.",
        },
      ],
    },
    packages: {
      heading: "Paketler ve ödeme",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Ücretsiz",
              v: "1 tarla · ayda 1 yapay zekâ tavsiyesi · sohbet yok · uydu indeksleri ve hava durumu dâhil.",
            },
            {
              k: "Pro — ayda 10 AZN",
              v: "5 tarla · ayda 8 yapay zekâ tavsiyesi · ayda 50 sohbet mesajı · tarla pasaportu, sulama ve ilaçlama penceresi.",
            },
            {
              k: "Business — ayda 25 AZN",
              v: "Pratikte sınırsız tarla · ayda 30 tavsiye · 300 sohbet mesajı · 30 fotoğraf teşhisi · kıyaslama ve raporlar.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Yeni oluşturulan bir organizasyon 1 aylık Pro denemesiyle açılır ve deneme bitince " +
            "kendiliğinden ücretsiz pakete döner — otomatik ödeme yoktur.",
        },
        {
          kind: "p",
          text:
            "En önemli not: ödeme henüz bağlı değil. Kodun hiçbir yerinde ödeme sağlayıcısı yok, " +
            "kart veya banka bilgisi toplanmıyor, paketler şu anda elle atanıyor. Ücretli planlar " +
            "devreye girdiğinde bunu önceden duyuracağız; kimseden habersiz hiçbir tahsilat " +
            "yapılmayacak.",
        },
        { kind: "p", text: "Fiyatlar AZN olarak gösterilir." },
      ],
    },
    quotas: {
      heading: "Kotalar",
      body: [
        {
          kind: "p",
          text:
            "Yapay zekâ tavsiyesi, sohbet ve fotoğraf teşhisi pakete göre aylık sınırlıdır. " +
            "Sınır dolduğunda istek reddedilir ve nedeni size gösterilir; sınır ertesi ay " +
            "sıfırlanır.",
        },
        {
          kind: "p",
          text:
            "Sınırlar yapay zekânın gerçek maliyetini karşılamak içindir. Sisteme olağandışı yük " +
            "bindiren kullanımı kısıtlama hakkımızı saklı tutarız.",
        },
        {
          kind: "p",
          text:
            "Uydu işleme hızı bizim denetimimiz dışındaki etkenlere bağlıdır: uydunun tarlanızın " +
            "üzerinden geçme sıklığı ve bulut örtüsü.",
        },
      ],
    },
    ownership: {
      heading: "Veriler kime ait",
      body: [
        {
          kind: "p",
          text:
            "Tarla sınırları, pasaport verileri, notlar, fotoğraflar, defter satırları — hepsi " +
            "sizin. Hizmeti sunmak için (saklamak, işlemek, analiz etmek, size göstermek) bunları " +
            "işleme hakkını bize verirsiniz; bundan fazlası yok.",
        },
        {
          kind: "ul",
          items: [
            "Verilerinizi satmıyoruz ve reklam amacıyla aktarmıyoruz.",
            "Toplulaştırılmış değerler (karşılaştırma, kıyaslama) yalnızca en az 5 tarladan oluşan kümeler üzerinde hesaplanır ve belirli bir tarlayı göstermez.",
            "Platformun kodu, tasarımı, indeks modelleri ve içeriği bize aittir.",
            "Yüklediğiniz içeriğin size ait olmasından veya yükleme hakkınız bulunmasından siz sorumlusunuz.",
          ],
        },
      ],
    },
    availability: {
      heading: "Erişilebilirlik",
      body: [
        {
          kind: "p",
          text:
            "Hizmet tek bir sunucuda çalışır ve «elinden geleni yapan» bir düzende sunulur. " +
            "Garantili çalışma süresi (SLA) yoktur; planlı ve plansız kesintiler olabilir.",
        },
        {
          kind: "p",
          text:
            "Uydu verisi kesintisiz değildir: bulut örtüsü ve uydunun geçiş takvimi yüzünden " +
            "günlerce yeni görüntü olmayabilir. Bu bir arıza değil, yörüngenin doğasıdır.",
        },
        {
          kind: "p",
          text:
            "Özellik ekleyebilir, değiştirebilir veya kaldırabiliriz. Sizin için önemli bir " +
            "şeyi kaldırırsak önceden haber vermeye çalışacağız.",
        },
      ],
    },
    liability: {
      heading: "Sorumluluk",
      body: [
        {
          kind: "p",
          text:
            "Tarımsal kararlar sizindir. Sulamak, gübrelemek, ilaçlamak, hasat etmek — her biri " +
            "tarlayı tanıyan kişinin kararıdır ve Agradex bu kararın sonucundan sorumlu değildir.",
        },
        {
          kind: "p",
          text:
            "Özellikle: platformun verdiği tavsiyeye dayanarak yapılan (veya yapılmayan) iş " +
            "sonucunda ürün kaybı, verim düşüşü, masraf artışı veya başka bir zarar doğarsa, " +
            "bunun sorumluluğunu üstlenmiyoruz.",
        },
        {
          kind: "p",
          text:
            "Hizmet «olduğu gibi» sunulur; verilerin eksiksiz ve doğru olacağına dair güvence " +
            "vermiyoruz.",
        },
        {
          kind: "p",
          text:
            "Bu bölüm, yerel mevzuatın size tanıdığı ve emredici nitelikteki hakları " +
            "sınırlamaz.",
        },
      ],
    },
    changes: {
      heading: "Koşulların değişmesi",
      body: [
        {
          kind: "p",
          text:
            "Ürün değiştikçe bu koşullar da değişecek. Sayfanın başındaki tarih son düzenlemeyi " +
            "gösterir.",
        },
        {
          kind: "p",
          text:
            "Önemli değişiklikleri — örneğin ödemenin devreye girmesini — uygulama içi bildirim " +
            "veya e-posta ile önceden duyuracağız. Değişiklikten sonra hizmeti kullanmaya devam " +
            "etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.",
        },
      ],
    },
    contact: {
      heading: "İletişim",
      body: [
        {
          kind: "p",
          text:
            "Soru, şikâyet, verilerinizin bir kopyası veya silinmesi talebi — hepsi tek adrese: " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Resmî tüzel kişi bilgileri (şirket adı, sicil, adres, uygulanacak hukuk) henüz " +
            "mevcut değil; oluştuğunda bu bölüm güncellenecek.",
        },
      ],
    },
  },
};
