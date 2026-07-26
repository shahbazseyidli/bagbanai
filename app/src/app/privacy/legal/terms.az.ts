// Azerbaijani terms of use — the SOURCE document; the other seven are translations of it.
//
// The "ai-limits" section quotes the disclaimer the product actually ships under every piece of
// advice (services/app/ai/advice.py, DISCLAIMER/DISCLAIMERS) word for word, per locale. If that
// string is ever reworded, reword it here too — a page that promises a different disclaimer than
// the one the farmer reads under the advice is worse than no page.
import type { TermsDoc } from "./types";

export const termsAz: TermsDoc = {
  title: "İstifadə şərtləri",
  lead:
    "Bu səhifə Agradex-in nə vəd etdiyini və — bundan daha vacib — nə vəd etmədiyini izah edir. " +
    "Hüquqi şablon deyil: burada yazılanların hər biri məhsulun hazırkı vəziyyətinə uyğundur.",
  summary: [
    "Agradex qərar dəstəyi alətidir; aqronomu, laboratoriyanı və sahəyə çıxmağı əvəz etmir.",
    "AI məsləhəti avtomatik təhlildir və səhv ola bilər — son qərar sizindir.",
    "Hazırda ödəniş sistemi qoşulmayıb: kart məlumatı toplanmır və xəbərdarlıq etmədən heç nə tutulmur.",
    "Təsərrüfat məlumatınız sizindir; onu satmırıq.",
    "Xidmət tək serverdə işləyir, SLA və zəmanətli işləmə müddəti yoxdur.",
  ],
  sections: {
    service: {
      heading: "Xidmət nədir",
      body: [
        {
          kind: "p",
          text:
            "Agradex peyk görüntüləri (Sentinel-2 və Landsat–Sentinel harmonizasiyası), hava " +
            "proqnozu, aqronomik modellər və süni intellekt üzərində qurulmuş əkin monitorinqi " +
            "və təsərrüfat idarəetmə platformasıdır. Xidmətə veb sayt, tətbiq və telefona " +
            "quraşdırıla bilən veb-tətbiq (PWA) daxildir.",
        },
        {
          kind: "p",
          text:
            "Platformanın arxasında hazırda rəsmi qeydiyyatlı hüquqi şəxs elan edilməyib, ona " +
            "görə bu sənəd şirkət adı, qeydiyyat nömrəsi və tətbiq olunan qanunvericilik " +
            "göstərmir. Bunu açıq yazırıq ki, sənədin nə olduğu barədə yanlış təəssürat " +
            "yaranmasın. Əlaqə üçün: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Xidmətdən istifadə etməklə bu şərtləri qəbul etmiş sayılırsınız. Razı deyilsinizsə, " +
            "hesab yaratmayın və ya hesabınızı bağlayın.",
        },
      ],
    },
    account: {
      heading: "Hesab",
      body: [
        {
          kind: "ul",
          items: [
            "Bir e-poçt ünvanı bir hesaba uyğun gəlir; e-poçt eyni zamanda giriş identifikatorunuzdur.",
            "Qeydiyyatdan sonra e-poçt ünvanı 6 rəqəmli kodla təsdiqlənir.",
            "Giriş məlumatlarınızın qorunması sizin məsuliyyətinizdədir; hesabınızdan edilən əməliyyatlar sizin adınıza sayılır.",
            "Doğru məlumat verməlisiniz — xüsusən sahə sərhədi və məhsul, çünki bütün təhlil onların üzərində qurulur.",
            "Təşkilat daxilində icazələr rola görə verilir; təşkilat sahibi üzvləri əlavə edə və çıxara bilər.",
            "Hesabı istənilən vaxt bağlaya bilərsiniz. Nə baş verdiyi Məxfilik siyasətində addım-addım yazılıb.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Süni intellektin məhdudiyyətləri",
      body: [
        {
          kind: "p",
          text:
            "Hər AI məsləhətinin altında məhz bu cümlə yazılır: «Bu məsləhətlər peyk və sahə " +
            "məlumatlarına əsaslanan avtomatik təhlildir; yekun qərar üçün sahəni yerində " +
            "yoxlayın.» Bu, formallıq deyil — sözün həqiqi mənasında xidmətin sərhədidir.",
        },
        {
          kind: "ul",
          items: [
            "AI səhv edə bilər: peyk buludun altında qalan sahəni səhv oxuya bilər, pasport məlumatı natamamdırsa nəticə də natamam olar.",
            "Foto diaqnozu heç vaxt konkret pestisid markası və ya dozası göstərmir — sizi qeydiyyatdan keçmiş preparatlar siyahısına və aqronoma yönləndirir.",
            "Məsləhət baytarlıq, fitosanitar, hüquqi və ya maliyyə məsləhəti deyil.",
            "Peyk indeksləri və modellər laboratoriya analizini, torpaq nümunəsini və sahəyə çıxmağı əvəz etmir.",
            "Kimyəvi preparat tətbiq etməzdən əvvəl həmişə etiketi və yerli qaydaları oxuyun.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "İcazəli istifadə",
      body: [
        { kind: "p", text: "Aşağıdakılara icazə verilmir:" },
        {
          kind: "ul",
          items: [
            "Sistemə avtomatlaşdırılmış kütləvi sorğu göndərmək, məzmunu qırıb-toplamaq (scraping) və ya süni yüklə xidməti dayandırmağa cəhd etmək.",
            "Başqasının hesabına icazəsiz giriş, təhlükəsizlik mexanizmlərini keçmə cəhdi, zərərli kod yerləşdirmə.",
            "Sizə aid olmayan və paylaşmağa hüququnuz olmayan məlumatı (məsələn başqa təsərrüfatın sahə sənədlərini) yükləmək.",
            "Qanunsuz, saxta və ya başqasının hüququnu pozan məzmun yerləşdirmək.",
            "Xidməti və ya AI cavablarını icazəsiz olaraq üçüncü şəxslərə xidmət kimi satmaq.",
            "Platformanın koduna və ya modellərinə tərs mühəndislik tətbiq etmək.",
          ],
        },
        {
          kind: "p",
          text:
            "Bu qaydaların pozulması hesabın dayandırılmasına səbəb ola bilər. Belə halda " +
            "səbəbi izah etməyə çalışacağıq.",
        },
      ],
    },
    packages: {
      heading: "Paketlər və ödəniş",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Pulsuz",
              v: "1 sahə · ayda 1 AI məsləhəti · söhbət yoxdur · peyk indeksləri və hava daxildir.",
            },
            {
              k: "Pro — ayda 10 AZN",
              v: "5 sahə · ayda 8 AI məsləhəti · ayda 50 söhbət mesajı · sahə pasportu, suvarma və çiləmə pəncərəsi.",
            },
            {
              k: "Business — ayda 25 AZN",
              v: "Praktiki olaraq limitsiz sahə · ayda 30 məsləhət · 300 söhbət mesajı · 30 foto diaqnozu · benchmark və hesabatlar.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Yeni yaradılan təşkilat 1 aylıq Pro sınağı ilə açılır və sınaq bitəndə özü pulsuz " +
            "paketə qayıdır — heç bir avtomatik ödəniş yoxdur.",
        },
        {
          kind: "p",
          text:
            "Ən vacib qeyd: ödəniş sistemi hələ qoşulmayıb. Kodda heç bir ödəniş provayderi " +
            "yoxdur, kart və ya bank məlumatı toplanmır, paketlər hazırda əl ilə təyin edilir. " +
            "Ödənişli plana keçid mexanizmi işə düşəndə bunu qabaqcadan elan edəcəyik; " +
            "xəbərdarlıq etmədən heç kimdən heç nə tutulmayacaq.",
        },
        { kind: "p", text: "Qiymətlər AZN ilə göstərilir." },
      ],
    },
    quotas: {
      heading: "Limitlər",
      body: [
        {
          kind: "p",
          text:
            "AI məsləhəti, söhbət və foto diaqnozu paketə görə aylıq limitlidir. Limit " +
            "dolduqda sorğu rədd edilir və sizə bunun səbəbi göstərilir; limit növbəti ayda " +
            "sıfırlanır.",
        },
        {
          kind: "p",
          text:
            "Limitlər AI-ın real xərcini ödəmək üçündür. Sistemi qeyri-adi yüklə istismar edən " +
            "istifadəni məhdudlaşdırmaq hüququnu saxlayırıq.",
        },
        {
          kind: "p",
          text:
            "Peyk emalının sürəti bizdən asılı olmayan amillərdən — peykin sahənizin üstündən " +
            "keçmə tezliyi və bulud örtüyündən — asılıdır.",
        },
      ],
    },
    ownership: {
      heading: "Məlumatın kimə aid olması",
      body: [
        {
          kind: "p",
          text:
            "Sahə sərhədləri, pasport məlumatı, qeydlər, şəkillər, dəftər yazıları — hamısı " +
            "sizindir. Xidməti göstərmək üçün (saxlamaq, emal etmək, təhlil etmək, sizə " +
            "göstərmək) onları işləmək hüququnu bizə verirsiniz; bundan artıq heç nə.",
        },
        {
          kind: "ul",
          items: [
            "Məlumatınızı satmırıq və reklam məqsədilə ötürmürük.",
            "Ümumiləşdirilmiş göstəricilər (müqayisə, benchmark) yalnız ən azı 5 sahədən ibarət qruplar üzərində hesablanır və konkret sahəni göstərmir.",
            "Platformanın kodu, dizaynı, indeks modelləri və məzmunu bizə aiddir.",
            "Yüklədiyiniz məzmunun sizə aid olmasına və ya onu yükləmək hüququnuzun olmasına siz cavabdehsiniz.",
          ],
        },
      ],
    },
    availability: {
      heading: "Əlçatanlıq",
      body: [
        {
          kind: "p",
          text:
            "Xidmət tək serverdə işləyir və «əlindən gələni edən» rejimdə təqdim olunur. " +
            "Zəmanətli işləmə müddəti (SLA) yoxdur; planlı və planlanmamış fasilələr ola bilər.",
        },
        {
          kind: "p",
          text:
            "Peyk məlumatı fasiləsiz deyil: bulud örtüyü və peykin keçid cədvəli səbəbindən " +
            "günlərlə yeni görüntü olmaya bilər. Bu, nasazlıq deyil — orbitin təbiətidir.",
        },
        {
          kind: "p",
          text:
            "Funksiyaları əlavə edə, dəyişə və ya çıxara bilərik. Sizin üçün vacib olan bir " +
            "funksiyanı çıxarsaq, bunu əvvəlcədən bildirməyə çalışacağıq.",
        },
      ],
    },
    liability: {
      heading: "Məsuliyyət",
      body: [
        {
          kind: "p",
          text:
            "Aqronomik qərarlar sizindir. Suvarmaq, gübrələmək, çiləmək, biçmək — bunların hər " +
            "biri sahəni tanıyan insanın qərarıdır və Agradex həmin qərarın nəticəsinə görə " +
            "məsuliyyət daşımır.",
        },
        {
          kind: "p",
          text:
            "Xüsusilə: platformanın verdiyi məsləhətə əsaslanaraq görülən (və ya görülməyən) iş " +
            "nəticəsində məhsul itkisi, məhsuldarlığın azalması, xərcin artması və ya digər " +
            "zərər yaranarsa, bunun məsuliyyətini üzərimizə götürmürük.",
        },
        {
          kind: "p",
          text:
            "Xidmət «olduğu kimi» təqdim olunur; məlumatın tam və dəqiq olacağına dair zəmanət " +
            "vermirik.",
        },
        {
          kind: "p",
          text:
            "Bu bölmə yerli qanunvericiliyin sizə verdiyi və məcburi qaydada tətbiq olunan " +
            "hüquqları məhdudlaşdırmır.",
        },
      ],
    },
    changes: {
      heading: "Şərtlərin dəyişməsi",
      body: [
        {
          kind: "p",
          text:
            "Məhsul dəyişdikcə bu şərtlər də dəyişəcək. Səhifənin yuxarısındakı tarix sonuncu " +
            "redaktəni göstərir.",
        },
        {
          kind: "p",
          text:
            "Ciddi dəyişikliyi — məsələn ödənişin işə düşməsini — tətbiqdəki bildiriş və ya " +
            "e-poçt ilə əvvəlcədən elan edəcəyik. Dəyişiklikdən sonra xidmətdən istifadəni davam " +
            "etdirməyiniz yeni şərtlərlə razılıq deməkdir.",
        },
      ],
    },
    contact: {
      heading: "Əlaqə",
      body: [
        {
          kind: "p",
          text:
            "Sual, şikayət, məlumatın surəti və ya silinməsi tələbi — hamısı bir ünvana: " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Rəsmi hüquqi şəxs məlumatı (şirkət adı, qeydiyyat, ünvan, tətbiq olunan " +
            "qanunvericilik) hazırda mövcud deyil; müəyyən edildikdə bu bölmə yenilənəcək.",
        },
      ],
    },
  },
};
