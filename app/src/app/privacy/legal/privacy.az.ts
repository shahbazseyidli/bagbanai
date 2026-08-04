// Azerbaijani privacy policy — the SOURCE document. The other seven locales are translations of
// this file, not independent re-derivations: if a fact changes, change it here first and carry it
// across, otherwise the eight documents start contradicting each other about what the system does.
//
// Every factual claim below was read out of the code; ./index.ts lists the files it came from.
import type { PrivacyDoc } from "./types";

export const privacyAz: PrivacyDoc = {
  title: "Məxfilik siyasəti",
  lead:
    "Agradex peyk görüntüləri, hava məlumatı və süni intellekt vasitəsilə əkin sahələrini izləyən " +
    "platformadır. Bu səhifə hüquqi şablon deyil — sistemin sizin haqqınızda hansı məlumatı " +
    "topladığını, onu harada saxladığını, kimə ötürdüyünü və hesabınızı bağlayanda nə baş " +
    "verdiyini olduğu kimi izah edir.",
  summary: [
    "Bütün məlumat Aİ daxilində — Helsinkidəki (Finlandiya) tək serverdə, öz idarə etdiyimiz Postgres bazasında saxlanılır. İstisna: AI təhlili üçün göndərilən mətn və şəkillər emal zamanı Aİ-dən kənara çıxır — ətraflı aşağıdakı «Subprosessorlar» bölməsində.",
    "Reklam izləyicisi, analitika pikseli və üçüncü tərəf kuki yoxdur; ona görə razılıq banneri də yoxdur.",
    "AI təhlilinə sahə məlumatı gedir, hesab məlumatı yox: adınız, e-poçtunuz və parol hash-ınız model provayderinə heç vaxt ötürülmür.",
    "Təkrarlanan yeganə məktub həftəlik icmaldır (çərşənbə günü); ondan bir kliklə imtina edə bilərsiniz.",
    "Hesabı bağlamaq şəxsi məlumatı silir, amma yazdığınız qeydləri saxlayır — onlar artıq heç bir şəxsə bağlanmır.",
  ],
  sections: {
    scope: {
      heading: "Bu sənəd nəyi əhatə edir",
      body: [
        {
          kind: "p",
          text:
            "Bu siyasət agradex.com (tanıtım saytı), app.agradex.com (tətbiq) və telefonunuza " +
            "quraşdırıla bilən veb-tətbiq (PWA) üçün keçərlidir. Onların hamısı eyni serverdə, " +
            "eyni verilənlər bazası ilə işləyir.",
        },
        {
          kind: "p",
          text:
            "Dürüst olmaq üçün bir şeyi əvvəldən deyirik: Agradex hazırda inkişaf mərhələsindədir " +
            "və məhsulun arxasında rəsmi qeydiyyatlı hüquqi şəxs (şirkət adı, VÖEN, hüquqi ünvan) " +
            "elan edilməyib. Ona görə bu sənəd formal «data nəzarətçisi» göstərmir. Məlumatınızla " +
            "bağlı bütün müraciətlər info@agradex.com ünvanı ilə platformanı idarə edən komandaya " +
            "gedir.",
        },
        {
          kind: "p",
          text:
            "Sənəd yalnız bizim sistemə aiddir. Sizi Agradex-dən kənar saytlara aparan keçidlərin " +
            "(məsələn peyk mənbələrinin rəsmi səhifələri) öz məxfilik qaydaları var.",
        },
      ],
    },
    "account-data": {
      heading: "Hesab məlumatı",
      body: [
        {
          kind: "p",
          text:
            "Qeydiyyatdan keçəndə və hesab parametrlərini dəyişəndə saxladığımız məlumatlar bunlardır:",
        },
        {
          kind: "ul",
          items: [
            "E-poçt ünvanı — girişin identifikatorudur və unikaldır.",
            "Parol — yalnız bcrypt hash şəklində. Açıq parolu nə saxlayırıq, nə də bərpa edə bilirik.",
            "Ad-soyad (istəyə bağlı), interfeys dili, ölkə və rayon.",
            "Rol: fermer, laboratoriya, aqronom-məsləhətçi və ya təchizatçı.",
            "Sahə vahidi seçimi (hektar / dönüm / sot) — seçilməyibsə ölkəyə görə təyin olunur.",
            "Bildiriş seçimləri (hansı kanalı bağlamısınız) və e-poçt icmalından imtina bayrağı.",
            "Push bildirişini açdığınız hər cihaz üçün brauzerin verdiyi abunə (çatdırılma ünvanı, şifrələmə açarları, brauzer sətri) — abunəni ləğv edəndə sətir silinir.",
            "Ad görünürlüyü seçimi — adınızın başqa istifadəçilərə göstərilib-göstərilməməsi.",
            "Tanıtım səhifəsindəki qısa sorğunun cavabları (məhsul, ölkə, rayon, əsas problem, ehtiyaclar), əgər qeydiyyatdan əvvəl onu doldurmusunuzsa.",
            "E-poçt təsdiqi vəziyyəti və müvəqqəti 6 rəqəmli təsdiq kodu — kod təsdiqdən sonra dərhal silinir.",
            "Sonuncu aktivlik vaxtı — saatda bir dəfədən çox yazılmır, məqsədi hesabın canlı olub-olmadığını bilməkdir.",
          ],
        },
        {
          kind: "p",
          text:
            "Telefon nömrəsi üçün bazada sütun var, lakin qeydiyyat forması onu soruşmur — yəni " +
            "praktikada telefon nömrəsi toplanmır. Kart və ödəniş məlumatı ümumiyyətlə toplanmır " +
            "(bax «Ödəniş» — İstifadə şərtləri).",
        },
      ],
    },
    "field-data": {
      heading: "Sahə və təsərrüfat məlumatı",
      body: [
        {
          kind: "p",
          text:
            "Platformanın əsas məzmunu sizin daxil etdiyiniz təsərrüfat məlumatıdır. Bura daxildir:",
        },
        {
          kind: "ul",
          items: [
            "Sahənin xəritədə çəkilmiş sərhədi və sahəsi (bazada həmişə hektarla saxlanılır — vahid seçimi yalnız göstərişə təsir edir).",
            "Sahə, təsərrüfat və təşkilat adları.",
            "Sahə pasportu: məhsul, sort, əkin və məhsul yığımı tarixləri, torpaq tipi və pH, suvarma üsulu, inkişaf mərhələsi, əvvəlki məhsul, sərbəst qeydlər.",
            "Skautinq müşahidələri, yüklədiyiniz şəkillər və mövsümlər.",
            "Artıq yığmadığımız, lakin saxladığımız köhnə yazılar: sahə əməliyyatları, məhsuldarlıq qeydləri, tapşırıqlar, dəftər/satış/anbar/texnika sətirləri və əvvəllər yüklədiyiniz sənədlər. Bu bölmələr məhsuldan çıxarılıb; mövcud yazılarınız silinməyib və hesabınızı bağladıqda onlar da anonimləşdirilir.",
            "Torpaq laboratoriya analizləri — skan etdiyiniz sənəd və ondan OCR ilə oxunan göstəricilər.",
          ],
        },
        {
          kind: "p",
          text: "Bunların üzərində sistem özü aşağıdakıları hesablayır və saxlayır:",
        },
        {
          kind: "ul",
          items: [
            "Hər peyk səhnəsi üçün 9 indeksin (NDVI, NDMI və s.) statistikası və sahəyə kəsilmiş rastr faylları.",
            "Hava arxivi, sahə sağlamlığı skoru, effektiv temperatur toplamı (GDD).",
            "AI məsləhətinin mətni və onun hansı giriş məlumatı ilə yaradıldığı, hansı model tərəfindən və hansı dildə yazıldığı.",
            "AI söhbətinin mesajları, bildirişlər, paylaşım linkinin tokenləri.",
            "AI istifadəsinin token və xərc uçotu.",
            "Yeddi məhdud məhsul hadisəsi (sorğunun başlanması, sahənin yaradılması, məhsulun seçilməsi, ilk peyk görüntüsünün açılması, məsləhətin oxunması, Telegram-ın qoşulması, siyahının tamamlanması) — bu siyahı koda sabit yazılıb, başqa hərəkətiniz izlənmir.",
          ],
        },
      ],
    },
    storage: {
      heading: "Məlumat harada saxlanılır",
      body: [
        {
          kind: "p",
          text:
            "Hər şey Helsinkidə (Finlandiya, Avropa İttifaqı) yerləşən tək Hetzner serverində " +
            "saxlanılır. Verilənlər bazası — həmin maşında Docker içində işləyən öz Postgres 16 + " +
            "PostGIS quraşdırmamızdır. Yüklədiyiniz fayllar həmin serverin lokal diskində, peyk " +
            "rastrları isə eyni diskdəki ayrıca qovluqdadır.",
        },
        {
          kind: "p",
          text:
            "İdarə olunan üçüncü tərəf verilənlər bazası (məsələn Supabase) və ya üçüncü tərəf " +
            "obyekt anbarı (S3 və bənzərləri) istifadə etmirik — bu, qəsdən verilmiş memarlıq " +
            "qərarıdır.",
        },
        {
          kind: "p",
          text:
            "Ehtiyat nüsxələr eyni komandanın idarə etdiyi serverdə, Avropa İttifaqı daxilində " +
            "saxlanılır. Ehtiyat nüsxələr üçün rəsmi saxlama müddəti təyin edilməyib.",
        },
      ],
    },
    processors: {
      heading: "Məlumatı kimə ötürürük",
      body: [
        {
          kind: "p",
          text:
            "Aşağıdakılar platformanın işləməsi üçün istifadə etdiyimiz xarici xidmətlərdir. " +
            "Siyahı tamdır — məlumatınızı reklam şəbəkələrinə, data brokerlərinə və ya " +
            "marketinq platformalarına ötürmürük, satmırıq.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "DeepSeek (mətn modeli)",
              v:
                "AI məsləhəti, söhbət və araşdırma qatı. Gedən: sahənin adı, " +
                "sahəsi, məhsul pasportu (qeydlər daxil), indeks trendləri, hava, son skautinq " +
                "qeydləri, əməliyyatlar, əvvəlki " +
                "məsləhətin xülasəsi və son söhbət növbələri. " +
                "Getməyən: e-poçt, ad, parol hash-ı. Şəkil də getmir — bu model təsviri " +
                "ümumiyyətlə oxuya bilmir. Emal DeepSeek-in öz serverlərində aparılır (şirkət " +
                "Çində qeydiyyatdadır).",
            },
            {
              k: "Google (Gemini — yalnız şəkillər)",
              v:
                "Foto etiketləmə, xəstəlik/zərərverici diaqnozu və torpaq laboratoriya " +
                "hesabatının oxunması. Gedən: yüklədiyiniz şəkil və sahənin məhsul növü. " +
                "Diqqət: skanda nə yazılıbsa (laboratoriyanın adı, sizin adınız, ünvan) şəklin " +
                "bir hissəsi kimi gedir — mətn kontekstindən fərqli olaraq şəkli biz seçmirik. " +
                "Mətn modelinə heç bir şəkil göndərilmir.",
            },
            {
              k: "Resend",
              v:
                "E-poçt çatdırılması — alıcının ünvanı, müraciət adı və məktubun mətni. " +
                "Konfiqurasiya olunubsa ehtiyat kanal kimi SMTP istifadə edilir.",
            },
            {
              k: "Open-Meteo",
              v: "Sahənin mərkəz koordinatı — 7 günlük proqnoz və buxarlanma (ET0) hesabı üçün.",
            },
            { k: "ISRIC SoilGrids", v: "Sahənin koordinatı — torpaq profilini almaq üçün." },
            {
              k: "FAOSTAT",
              v: "Ölkə səviyyəsində məhsuldarlıq statistikası. Sizin haqqınızda heç nə getmir.",
            },
            {
              k: "EPPO",
              v:
                "Yalnız məhsulun adı, o da API açarı təyin ediləndə. Hazırda açar təyin " +
                "edilməyib, ona görə bu xidmətə ümumiyyətlə sorğu getmir.",
            },
            {
              k: "NASA Earthdata (HLS) və Copernicus Sentinel-2",
              v:
                "Buradan məlumat bizə gəlir, sizdən getmir: səhnə axtarışında sahənin əhatə " +
                "düzbucaqlısı və tarix aralığı göndərilir. Hesab, ad və ünvan ötürülmür.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "Xəritə axtarışına yazdığınız yer adı (brauzerdən) və koordinatın yer adına " +
                "çevrilməsi (serverdən).",
            },
            {
              k: "Xəritə altlıqları",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap və relyef " +
                "kafelləri brauzerinizə birbaşa yüklənir — yəni həmin serverlər IP ünvanınızı və " +
                "xəritənin hansı hissəsinə baxdığınızı görür.",
            },
            {
              k: "Brauzerin push xidməti",
              v:
                "Push bildirişini açsanız, mesaj brauzerinizin push xidməti (brauzerdən asılı " +
                "olaraq Google, Mozilla və ya Apple) vasitəsilə çatdırılır. Mətn şifrələnmiş " +
                "gedir, lakin xidmət cihazınızın abunə ünvanını görür.",
            },
            {
              k: "Google (Google ilə giriş)",
              v:
                "Yalnız «Google ilə davam et» düyməsini özünüz bassanız. Google-a gedən: sizin brauzeriniz (yəni IP ünvanınız) və hansı tətbiqə daxil olduğunuz. Google-dan bizə gələn: hesabın daimi identifikatoru, e-poçt ünvanı, onun təsdiqlənib-təsdiqlənmədiyi və göstərilən adınız. Sahələriniz, qeydləriniz və peyk məlumatınız haqqında Google-a heç nə getmir. Səhifələrimizə Google skripti yüklənmir — düymə adi linkdir, ona görə düyməyə basana qədər Google sizin bizim saytda olduğunuzu görmür.",
            },
            {
              k: "Telegram",
              v:
                "Yalnız botu özünüz qoşsanız. Hazırda bot tokeni təyin edilməyib, kanal " +
                "işləmir.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Süni intellekt",
      body: [
        {
          kind: "p",
          text:
            "Məsləhət, söhbət və araşdırma DeepSeek-in mətn modeli ilə işləyir; şəkillər " +
            "(foto etiketi, xəstəlik diaqnozu, laboratoriya hesabatının oxunması) isə Google-un " +
            "Gemini modeli ilə — çünki mətn modeli təsvir qəbul etmir və heç bir şəkil ora " +
            "göndərilmir. Modelə göndərilən kontekst sahə haqqındadır, sizin şəxsiyyətiniz " +
            "haqqında deyil — kontekst qurulan kod hesab cədvəlindən heç bir sütun oxumur. " +
            "İstisna şəklin özüdür: onun içində nə varsa o da gedir, laboratoriya hesabatının " +
            "skanı buna misaldır.",
        },
        {
          kind: "p",
          text:
            "Hər AI çağırışının token sayı və təxmini xərci bizim bazada qeyd olunur; bu, kvota " +
            "hesablaması və xərc nəzarəti üçündür.",
        },
        {
          kind: "p",
          text:
            "AI açarı konfiqurasiyadan çıxarılsa, sistem səliqəli şəkildə deqradasiya edir: " +
            "məsləhət yaradılmır, söhbət cavab vermir, qalan funksiyalar isə işləməyə davam edir.",
        },
        {
          kind: "p",
          text:
            "AI-ın verdiyi cavab avtomatik təhlildir və səhv ola bilər. Onun məhdudiyyətləri " +
            "İstifadə şərtlərində ayrıca izah olunur.",
        },
      ],
    },
    email: {
      heading: "E-poçt",
      body: [
        {
          kind: "p",
          text:
            "Təkrarlanan yeganə məktub həftəlik icmaldır — hər çərşənbə saat 07:00-da (Bakı " +
            "vaxtı) göndərilir və həftədə bir dəfədən çox göndərilməsi texniki olaraq mümkün " +
            "deyil.",
        },
        {
          kind: "p",
          text:
            "Bundan başqa yalnız əməliyyat məktubları var: təsdiq kodu, xoş gəldiniz məktubu və " +
            "sahəniz ilk dəfə hazır olanda gələn hesabat. Onlar bir sutkada eyni növdən yalnız " +
            "bir dəfə göndərilir.",
        },
        {
          kind: "p",
          text:
            "Hər icmal məktubunun altında bir kliklik imtina linki var — açmaq üçün giriş " +
            "tələb olunmur. Eyni seçimi hesab səhifəsindən də söndürə bilərsiniz. Diqqət: imtina " +
            "etsəniz də əməliyyat məktubları (təsdiq kodu kimi) gəlməyə davam edir, çünki " +
            "onlarsız hesab işləmir.",
        },
        {
          kind: "p",
          text:
            "Reklam məktubu göndərmirik və ünvanınızı heç kimlə paylaşmırıq. Dürüstlük naminə: " +
            "hazırda icmalın mətni türk, alman, macar, italyan və polyak dilində olan " +
            "istifadəçilərə ingiliscə çatır — tərcüməsi hələ hazır deyil.",
        },
      ],
    },
    cookies: {
      heading: "Kuki və brauzer yaddaşı",
      body: [
        {
          kind: "p",
          text: "Üç kuki var, hamısı funksionaldır:",
        },
        {
          kind: "ul",
          items: [
            "bagban_session — giriş seansı. httpOnly (JavaScript oxuya bilmir), SameSite=Lax, https üzərində Secure, 7 gün. Başqa heç nə üçün istifadə olunmur.",
            "bagban_locale — seçdiyiniz dili yadda saxlayır, 1 il.",
            "bagban_oauth_state — yalnız «Google ilə davam et» düyməsini basanda yaranır və girişi qorumaq üçündür (CSRF). httpOnly, SameSite=Lax, Secure, 10 dəqiqə; giriş bitən kimi silinir.",
          ],
        },
        {
          kind: "p",
          text:
            "Vəssalam. Kodda Google Analytics, Google Tag Manager, Plausible, Hotjar, Mixpanel, " +
            "PostHog, Facebook pikseli və ya hər hansı digər izləyici yoxdur. Məhz buna görə " +
            "sayt sizə kuki razılığı banneri göstərmir — göstərəcək bir şey yoxdur.",
        },
        {
          kind: "p",
          text:
            "Bundan ayrı, brauzerin lokal yaddaşında bəzi interfeys seçimləri saxlanılır: " +
            "xəritə altlığı, «məlumata qənaət» rejimi, oflayn növbə, başlanğıc siyahısının " +
            "vəziyyəti və qeydiyyatdan əvvəl doldurduğunuz sorğunun cavabları. Onlar " +
            "cihazınızdadır; sorğu cavabları serverə yalnız qeydiyyat sorğusu ilə birlikdə gedir.",
        },
      ],
    },
    visibility: {
      heading: "Məlumatınızı kim görür",
      body: [
        {
          kind: "ul",
          items: [
            "Təşkilatınızın digər üzvləri — sahələri roluna uyğun görürlər; icazə hər sorğuda serverdə yoxlanılır.",
            "Paylaşım linki (/s/…) — linki əlində saxlayan istənilən şəxsə sahənin qəsdən məhdud, yalnız-oxunan kartını göstərir. Linki istənilən vaxt ləğv edə bilərsiniz.",
            "Sahə icazəsi — konkret bir sahəni adı ilə göstərdiyiniz istifadəçiyə açsanız, o yalnız həmin sahənin hesabatını görür (digər sahələrinizi, təsərrüfatınızı və komandanızı yox). İstənilən vaxt geri ala bilərsiniz; həmin adam da özü imtina edə bilər.",
            "Ad görünürlüyünü söndürsəniz, digər istifadəçilərin gördüyü səthlərdə adınız «user_…» şəklində təxəllüslə əvəz olunur.",
            "Müqayisə və benchmark göstəriciləri ən azı 5 başqa sahədən ibarət qrup olmadan hesablanmır və heç vaxt konkret sahənin və ya təsərrüfatın adını göstərmir.",
            "Platformanı idarə edən komanda — admin paneli vasitəsilə bütün təşkilatlar üzrə istifadə statistikasını, AI xərcini və hesabları görür; həm də serverin operatoru olaraq verilənlər bazasına texniki girişi var.",
          ],
        },
      ],
    },
    retention: {
      heading: "Saxlama və silmə",
      body: [
        {
          kind: "p",
          text:
            "Sahəni silmək «yumşaq silmə»dir: sahə siyahıdan yox olur və bərpa oluna bilər, " +
            "fiziki olaraq bazadan çıxarılmır.",
        },
        {
          kind: "p",
          text:
            "Hesabı bağlamaq (hesab səhifəsindəki müvafiq düymə) geri qaytarıla bilməz və " +
            "dəqiq bunları edir:",
        },
        {
          kind: "ul",
          items: [
            "Təsdiq üçün öz e-poçt ünvanınızı əl ilə yazmalısınız.",
            "Sahibi olduğunuz təşkilatda hələ başqa aktiv üzvlər varsa əməliyyat rədd edilir — əvvəlcə təşkilatı başqasına ötürməlisiniz.",
            "Bütün üzvlüklər silinir, yəni giriş dərhal kəsilir.",
            "Yalnız sizin üzv olduğunuz təşkilatların sahələri yumşaq silinir.",
            "E-poçt ünvanı işləməyən daxili ünvana dəyişdirilir — bu, real ünvanınızı azad edir və onunla yenidən qeydiyyatdan keçmək mümkün olur.",
            "Ad-soyad, ölkə, rayon, sorğu cavabları və bildiriş seçimləri sıfırlanır; parol hash-ı heç bir parolun yarada bilməyəcəyi dəyərlə əvəz olunur; hesab deaktiv edilir.",
          ],
        },
        {
          kind: "p",
          text:
            "Nə qalır: yazdığınız qeydlər — sahələr, sərhədlər, müşahidələr, dəftər yazıları, " +
            "məhsuldarlıq. Səbəb texnikidir və gizlətmirik: on beş cədvəl istifadəçiyə istinad " +
            "edir və kaskad silmə bir işçinin ayrılması ucbatından bütün təsərrüfatın tarixçəsini " +
            "məhv edərdi. Bu yazılar qalır, lakin artıq müəyyən edilə bilən şəxsə bağlanmır. " +
            "İstifadə uçotu, e-poçt göndəriş jurnalı və hadisə yazıları istifadəçi " +
            "identifikatorunu saxlayır — həmin identifikator daha heç bir şəxsi göstərmir.",
        },
        {
          kind: "p",
          text:
            "Peyk və hesablanmış məlumat üçün avtomatik müddət bitmə mexanizmi yoxdur.",
        },
      ],
    },
    rights: {
      heading: "Hüquqlarınız və hazırda nə edə bilirsiniz",
      body: [
        {
          kind: "p",
          text: "Bunların hamısı hesab səhifəsində, dərhal, öz-özünə edilir:",
        },
        {
          kind: "ul",
          items: [
            "Parolu dəyişmək.",
            "Ad, ölkə və rayonu redaktə etmək.",
            "İnterfeys dilini və sahə vahidini dəyişmək.",
            "Bildiriş matrisini (kateqoriya × kanal) tənzimləmək.",
            "Adın görünürlüyünü söndürmək.",
            "E-poçt icmalından imtina etmək.",
            "Hesabı bağlamaq.",
          ],
        },
        {
          kind: "p",
          text:
            "Sahə sərhədlərini sahə yaratma ekranından GeoJSON və ya KML kimi endirə bilərsiniz.",
        },
        {
          kind: "p",
          text:
            "Bütün hesabın avtomatik ixracı hələ yoxdur — bunu gizlətmirik. Məlumatınızın " +
            "surətini və ya tam silinməsini istəyirsinizsə, info@agradex.com ünvanına yazın, " +
            "əl ilə hazırlayaq.",
        },
      ],
    },
    changes: {
      heading: "Dəyişikliklər",
      body: [
        {
          kind: "p",
          text:
            "Bu sənəd sistemi təsvir edir, ona görə sistem dəyişəndə o da dəyişməlidir. " +
            "Səhifənin yuxarısında son yenilənmə tarixi göstərilir.",
        },
        {
          kind: "p",
          text:
            "Məlumatın toplanmasına və ya ötürülməsinə aid ciddi dəyişikliyi əvvəlcədən — " +
            "tətbiqdəki bildiriş və ya həftəlik icmal vasitəsilə — elan edəcəyik.",
        },
      ],
    },
  },
};
