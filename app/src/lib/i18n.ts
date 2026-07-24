// Azerbaijani (az) UI dictionary. Default and only locale for now.
// All user-facing strings live here. Keys are English identifiers.

export const az = {
  // brand / nav
  "brand": "Bağban AI",
  "nav.dashboard": "Sahələrim",
  "nav.pricing": "Qiymətlər",
  "nav.catalog": "Kataloq",
  "nav.community": "İcma",
  "nav.ledger": "Təsərrüfat dəftəri",
  "nav.team": "Komanda",
  "nav.logout": "Çıxış",
  "nav.login": "Daxil ol",
  "nav.signup": "Qeydiyyat",

  // common
  "common.loading": "Yüklənir...",
  "common.save": "Yadda saxla",
  "common.saving": "Saxlanılır...",
  "common.cancel": "Ləğv et",
  "common.create": "Yarat",
  "common.add": "Əlavə et",
  "common.remove": "Sil",
  "common.back": "Geri",
  "common.next": "Növbəti",
  "common.finish": "Tamamla",
  "common.optional": "(istəyə bağlı)",
  "common.required": "Vacib",
  "common.none": "Yoxdur",
  "common.error": "Xəta baş verdi",
  "common.retry": "Yenidən cəhd et",
  "common.search": "Axtar",
  "common.select": "Seçin",
  "common.yes": "Bəli",
  "common.no": "Xeyr",
  "common.other": "Digər…",
  "common.otherSpecify": "Digər (əl ilə yazın)",
  "common.close": "Bağla",

  // auth
  "auth.email": "E-poçt",
  "auth.password": "Parol",
  "auth.fullName": "Ad, soyad",
  "auth.loginTitle": "Hesaba daxil ol",
  "auth.signupTitle": "Yeni hesab yarat",
  "auth.loginCta": "Daxil ol",
  "auth.signupCta": "Qeydiyyatdan keç",
  "auth.toSignup": "Hesabınız yoxdur? Qeydiyyatdan keçin",
  "auth.toLogin": "Artıq hesabınız var? Daxil olun",
  "auth.err.email_taken": "Bu e-poçt artıq qeydiyyatdadır",
  "auth.err.invalid_credentials": "E-poçt və ya parol yanlışdır",

  // landing
  "landing.title": "Peyk, hava və süni intellekt ilə əkin sahələrinizi idarə edin",
  "landing.subtitle":
    "Bağban AI Azərbaycanlı fermerlər üçün peyk indeksləri, hava proqnozu və AI köməkçisi ilə məhsul monitorinqi platformasıdır.",
  "landing.ctaSignup": "Pulsuz qeydiyyatdan keç",
  "landing.feat1.title": "Peyk indeksləri",
  "landing.feat1.body": "NDVI, NDMI və daha çox indeks ilə bitkilərin sağlamlığını izləyin.",
  "landing.feat2.title": "AI aqronom məsləhəti",
  "landing.feat2.body": "Peyk və hava məlumatına əsasən sadə dildə tövsiyələr və xəbərdarlıqlar.",
  "landing.feat3.title": "Sahə idarəetməsi",
  "landing.feat3.body": "Skautinq, tapşırıqlar, əməliyyatlar və məhsuldarlıq bir yerdə.",

  // dashboard
  "dash.title": "Sahələrim",
  "dash.orgs": "Təşkilatlar",
  "dash.selectOrg": "Təşkilat seçin",
  "dash.newOrg": "Yeni təşkilat",
  "dash.farms": "Fermalar",
  "dash.newFarm": "Yeni ferma",
  "dash.fields": "Sahələr",
  "dash.newField": "Yeni sahə",
  "dash.noFarms": "Bu təşkilatda hələ ferma yoxdur.",
  "dash.noFields": "Bu fermada hələ sahə yoxdur.",
  "dash.tariff": "Tarif: Pulsuz",
  "dash.orgName": "Təşkilatın adı",
  "dash.farmName": "Fermanın adı",
  "dash.farmRegion": "Region",
  "dash.role": "Rol",

  // onboarding
  "onb.title": "Başlanğıc quraşdırması",
  "onb.step1": "1. Təşkilat yaradın",
  "onb.step2": "2. Ferma yaradın",
  "onb.step3": "3. İlk sahənizi əlavə edin",
  "onb.intro": "Platformadan istifadəyə başlamaq üçün bir neçə addım.",

  // field creation
  "field.new": "Yeni sahə",
  "field.name": "Sahənin adı",
  "field.mode.draw": "Xəritədə çək",
  "field.mode.coords": "Koordinatları daxil et",
  "field.drawHint": "Xəritədə çoxbucaqlı çəkmək üçün yuxarı sağdakı alətdən istifadə edin.",
  "field.coordsHint": "Hər sətirdə bir nöqtə: uzunluq,en (lon,lat). Ən azı 3 nöqtə.",
  "field.area": "Sahə",
  "field.ha": "ha",
  "field.err.minVertices": "Ən azı 3 nöqtə lazımdır.",
  "field.err.selfIntersect": "Çoxbucaqlı özü ilə kəsişir. Nöqtələri düzəldin.",
  "field.err.parse": "Koordinatları oxumaq mümkün olmadı. Format: lon,lat",
  "field.err.noPolygon": "Əvvəlcə sahəni çəkin və ya koordinat daxil edin.",
  "field.saved": "Sahə yadda saxlanıldı",

  // field detail tabs
  "field.tab.overview": "İcmal",
  "field.tab.sentinel2": "Sentinel-2",
  "field.tab.nasa": "NASA",
  "field.tab.ai": "AI Məsləhət",
  "field.tab.metadata": "Sahə haqqında məlumat",
  "field.tab.scouting": "Skautinq",
  "field.tab.tasks": "Tapşırıqlar",
  "field.tab.operations": "Əməliyyatlar",
  "field.tab.yields": "Məhsuldarlıq",
  "field.tab.fertilizer": "Gübrə",
  "field.tab.photos": "Foto",
  "field.tab.soil": "Torpaq",
  "field.tab.season": "Mövsüm",
  "field.tab.documents": "Sənədlər",
  "field.tab.weather": "Hava",
  "field.mgrs": "MGRS xanaları",

  // indices
  "idx.title": "Peyk indeksləri",
  "idx.select": "İndeks seçin",
  "idx.noData": "Peyk məlumatı hazırlanır. Yeni sahələr üçün ilkin analiz avtomatik işə düşür və adətən 1 gün ərzində burada görünür.",
  "idx.latest": "Son ölçmə",
  "idx.timeseries": "Zaman seriyası",

  // metadata
  "meta.title": "Sahə haqqında məlumat",
  "meta.crop_type": "Bitki növü",
  "meta.variety": "Sort",
  "meta.planting_date": "Əkin tarixi",
  "meta.expected_harvest": "Gözlənilən yığım",
  "meta.soil_type": "Torpaq növü",
  "meta.soil_ph": "Torpaq pH",
  "meta.irrigation_method": "Suvarma üsulu",
  "meta.irrigation_available": "Suvarma mövcuddur",
  "meta.previous_crop": "Əvvəlki bitki",
  "meta.seeding_density": "Səpin sıxlığı",
  "meta.growth_stage": "İnkişaf mərhələsi",
  "meta.elevation_m": "Yüksəklik (m)",
  "meta.slope_deg": "Meyllik (°)",
  "meta.aspect_deg": "İstiqamət (°)",
  "meta.tillage_practice": "Torpaq becərmə",
  "meta.target_yield": "Hədəf məhsuldarlıq",
  "meta.notes": "Qeydlər",
  "meta.difficulties": "Çətinliklər",
  "meta.rotation_history": "Növbəli əkin tarixçəsi",
  "meta.fertilizer_history": "Gübrələmə tarixçəsi",
  "meta.prior_yields": "Əvvəlki məhsuldarlıqlar",
  "meta.pest_history": "Zərərverici tarixçəsi",
  "meta.saved": "Məlumat yadda saxlanıldı",
  "meta.cropRequired": "Bitki növü vacibdir",
  "meta.f.year": "İl",
  "meta.f.crop": "Bitki",
  "meta.f.type": "Növ",
  "meta.f.product": "Məhsul",
  "meta.f.amount": "Miqdar",
  "meta.f.value": "Dəyər",
  "meta.f.severity": "Şiddət",
  "meta.f.note": "Qeyd",
  "meta.f.date": "Tarix",

  // scouting
  "scout.title": "Skautinq qeydləri",
  "scout.add": "Yeni qeyd",
  "scout.category": "Kateqoriya",
  "scout.severity": "Şiddət (1-5)",
  "scout.note": "Qeyd",
  "scout.photo": "Şəkil",
  "scout.geo": "Cari yeri əlavə et",
  "scout.geoErr": "Yer məlumatı alınmadı",
  "scout.empty": "Hələ skautinq qeydi yoxdur.",
  "scout.cat.pest": "Zərərverici",
  "scout.cat.disease": "Xəstəlik",
  "scout.cat.weed": "Alaq otu",
  "scout.cat.nutrient": "Qida çatışmazlığı",
  "scout.cat.water": "Su stresi",
  "scout.cat.damage": "Zədə",
  "scout.cat.other": "Digər",

  // tasks
  "task.title": "Tapşırıqlar",
  "task.add": "Yeni tapşırıq",
  "task.name": "Başlıq",
  "task.type": "Növ",
  "task.due": "Son tarix",
  "task.priority": "Prioritet",
  "task.notes": "Qeydlər",
  "task.status": "Status",
  "task.empty": "Hələ tapşırıq yoxdur.",
  "task.status.open": "Açıq",
  "task.status.in_progress": "İcrada",
  "task.status.done": "Tamamlandı",
  "task.pri.low": "Aşağı",
  "task.pri.medium": "Orta",
  "task.pri.high": "Yüksək",

  // operations
  "op.title": "Əməliyyat jurnalı",
  "op.add": "Yeni əməliyyat",
  "op.type": "Əməliyyat növü",
  "op.performed_on": "Tarix",
  "op.inputs": "İstifadə olunanlar",
  "op.cost": "Xərc",
  "op.currency": "Valyuta",
  "op.notes": "Qeydlər",
  "op.empty": "Hələ əməliyyat qeydi yoxdur.",

  // yields
  "yield.title": "Məhsuldarlıq",
  "yield.add": "Yeni qeyd",
  "yield.season": "Mövsüm (il)",
  "yield.crop": "Bitki",
  "yield.value": "Məhsuldarlıq",
  "yield.unit": "Vahid",
  "yield.area": "Sahə (ha)",
  "yield.notes": "Qeydlər",
  "yield.empty": "Hələ məhsuldarlıq qeydi yoxdur.",
  "yield.chartTitle": "İllər üzrə məhsuldarlıq",

  // team
  "team.title": "Komanda",
  "team.members": "Üzvlər",
  "team.invite": "Dəvət et",
  "team.inviteEmail": "Dəvət ediləcək e-poçt",
  "team.inviteRole": "Rol",
  "team.inviteLink": "Dəvət linki (paylaşın):",
  "team.changeRole": "Rolu dəyiş",
  "team.forbidden": "Bu əməliyyat üçün icazəniz yoxdur.",
  "team.status": "Status",
  "team.role.owner": "Sahib",
  "team.role.admin": "Administrator",
  "team.role.member": "Üzv",
  "team.role.viewer": "İzləyici",

  // bottom nav + admin (D2.1)
  "nav.admin": "Admin",
  "bnav.today": "Bu gün",
  "bnav.fields": "Sahələr",
  "bnav.notifications": "Bildiriş",
  "bnav.more": "Daha çox",
  "bnav.mainNav": "Əsas naviqasiya",
  "bnav.addField": "Sahə əlavə et",

  // "more" overflow page
  "more.title": "Daha çox",
  "more.pricingPlans": "Qiymətlər / paketlər",
  "more.account": "Hesab / parametrlər",
  "more.language": "Dil / Language",

  // "today" home (D2.2)
  "today.title": "Bu gün",
  "today.tone.good": "Sağlam",
  "today.tone.warn": "Diqqət",
  "today.tone.bad": "Zəif",
  "today.preparing": "Peyk məlumatı hazırlanır…",
  "today.noAnalysis": "Hələ peyk təhlili yoxdur — məlumat gələn kimi burada görünəcək.",
  "today.waterReco": "Suvarma tövsiyə olunur",
  "today.fieldsWord": "sahə",
  "today.needAttention": "diqqət tələb edir",
  "today.allGood": "hamısı qaydasındadır",
  "today.org": "Təşkilat",
  "today.fieldsOnMap": "Sahələr xəritədə",
  "today.noFields": "Hələ sahəniz yoxdur.",
  "today.addFirst": "İlk sahənizi əlavə edin",

  // onboarding activation checklist (D3.6)
  "onb.check.title": "Başlanğıc",
  "onb.check.account": "Hesab yaradıldı",
  "onb.check.field": "İlk tarlanı əlavə et",
  "onb.check.crop": "Məhsul növünü təyin et",
  "onb.check.data": "İlk peyk məlumatını gör",
  "onb.check.dataHint": "hazırlanır",
  "onb.check.advice": "AI aqronom məsləhətini aç",
  "onb.check.telegram": "Bildirişləri Telegram-a bağla",

  // PWA install card (D3.5)
  "install.title": "Bağban AI-ı telefona quraşdırın",
  "install.body": "Tətbiq kimi açılır — offline işləyir, tarlada daha sürətli.",
  "install.cta": "Quraşdır",

  // email-alerts toggle (#4)
  "emailAlerts.title": "Email bildirişləri",
  "emailAlerts.body": "Kritik və xəbərdarlıq siqnalları email-ə gəlsin",

  // data-saver toggle (D4.5)
  "dataSaver.title": "Data qənaəti",
  "dataSaver.body": "Peyk təbəqəsini avtomatik yükləmə (3G-də sərfəli)",

  // offline indicator (D5.3)
  "offline.pill": "Oflayn",
  "offline.pending": "qeyd gözləyir",
  "offline.synced": "Sinxronlaşdı",
  "offline.unsent": "qeyd göndərilməyib",

  // public landing map (D3.1/D3.2)
  "landing.map.title": "Tarlanızı peykdən görün",
  "landing.map.sub": "Kəndinizi axtarın, sonra tarlanıza toxunun — sərhədini avtomatik çəkək. Qeydiyyat yoxdur.",
  "landing.detecting": "Sərhəd çəkilir…",
  "landing.yourField": "Sizin tarlanız",
  "landing.ctaValue": "Pulsuz qeydiyyatdan keçin — bu tarlanı peykdən izləyək: bitki sağlamlığı və su stresi.",
  "landing.ctaStart": "Pulsuz izləməyə başla",
  "landing.otherField": "Başqa tarla seç",
  "landing.tapTitle": "Tarlanıza toxunun",
  "landing.tapHint": "Peyk şəklində tarlanızın ortasına toxunun — sərhədini sizin üçün çəkək.",
  "landing.detectFail": "Bu nöqtədə sərhəd aydın seçilmədi — xəritədə tarlanızın künclərinə toxunub özünüz çəkin.",
  "landing.detectFail2": "Avtomatik seçim alınmadı — künclərə toxunaraq özünüz çəkin.",

  // pricing page + table (D4.4)
  "price.hero.title": "Sizə uyğun paketi seçin",
  "price.hero.sub": "Pulsuz peyk monitorinqi ilə başlayın, hazır olanda AI aqronom məsləhəti, çiləmə pəncərəsi və suvarma balansına keçin. İstənilən vaxt dəyişə bilərsiniz.",
  "price.contact": "Sualınız var? Böyük təsərrüfat və ya kooperativ üçün fərdi təklif lazımdır?",
  "price.freecore": "Peyk sağlamlıq xəritəsi və 7 günlük hava həmişə pulsuzdur — ilk sahənizi heç bir ödəniş etmədən izləyin.",
  "price.cta.free": "Pulsuz başla",
  "price.cta.select": "Bu paketi seç",
  "price.soon": "tezliklə",
  "price.footnote": "“tezliklə” funksiyalar Business paketinə mərhələli əlavə olunur. Qiymətlərə ƏDV daxildir.",
  "price.tag.free": "Başlamaq üçün",
  "price.tag.pro": "Ən populyar",
  "price.tag.business": "Peşəkar / təsərrüfat",
  "landing.pricingTitle": "Paketlər və qiymətlər",
  "landing.pricingSub": "Pulsuz başlayın — sahənizi peykdən izləyin. Hazır olanda AI aqronom məsləhətinə keçin.",

  // WMO weather codes (short)
  "wmo.clear": "Aydın",
  "wmo.partly": "Az buludlu",
  "wmo.fog": "Dumanlı",
  "wmo.rain": "Yağışlı",
  "wmo.snow": "Qarlı",
  "wmo.shower": "Leysan",
  "wmo.storm": "Tufan",

  // upgrade CTA (free-tier limit)
  "upgrade.eyebrow": "Paketi yüksəlt",
  "upgrade.title": "Pulsuz paketin sahə limitinə çatdınız 🎉",
  "upgrade.subtitle": "Pulsuz paketdə 1 sahə var. Daha çox sahə əlavə etmək və peşəkar alətləri açmaq üçün paketi yüksəldin.",
  "upgrade.benefit1": "5 sahə (~25 ha) — birdən çox sahəni bir yerdən idarə edin",
  "upgrade.benefit2": "Sentinel-2 10m + NDRE/CIre — daha kəskin, red-edge analiz",
  "upgrade.benefit3": "AI aqronom məsləhəti (8/ay) + AI chatbot",
  "upgrade.benefit4": "Bilik Pasportu: torpaq, su balansı, çiləmə pəncərəsi, frost/heat xəbərdarlıq",
  "upgrade.priceLine": "Paket 2 — cəmi 10 AZN/ay",
  "upgrade.viewPlans": "Paketlərə bax",

  // OTP email verification (U3)
  "otp.promptPre": "",
  "otp.promptPost": " ünvanına göndərilən 6 rəqəmli təsdiq kodunu daxil edin.",
  "otp.invalid": "Kod yanlışdır.",
  "otp.expired": "Kodun vaxtı bitib — yenidən göndərin.",
  "otp.tooMany": "Çox cəhd oldu — bir azdan yenidən yoxlayın.",
  "otp.failed": "Təsdiq alınmadı.",
  "otp.sendFailed": "Kod göndərilmədi.",
  "otp.resent": "Kod yenidən göndərildi.",
  "otp.verifying": "Yoxlanılır…",
  "otp.verify": "Təsdiq et",
  "otp.resend": "Kodu yenidən göndər",
} as const;

export type I18nKey = keyof typeof az;
export type Dict = Partial<Record<I18nKey, string>>;

// Phase 4 — 4 locales. az is the complete source of truth; en/tr/de are machine-translated and fall
// back to az for any missing key. Translations live in lib/locales/{en,tr,de}.ts.
export type Locale = "az" | "en" | "tr" | "de";
export const LOCALES: Locale[] = ["az", "en", "tr", "de"];
export const LOCALE_NAMES: Record<Locale, string> = {
  az: "Azərbaycan", en: "English", tr: "Türkçe", de: "Deutsch",
};

// Registered lazily by LocaleProvider so this module has no import cycle with the big dicts.
const DICTS: Partial<Record<Locale, Dict>> = { az };
export function registerDict(locale: Locale, dict: Dict): void {
  DICTS[locale] = dict;
}

// Client-side current locale (per browser). SSR renders in az; the client sets the real locale in
// LocaleProvider before the app's (client-gated) content renders, so visible text is correct.
let _locale: Locale = "az";
export function setLocale(l: Locale): void {
  if (LOCALES.includes(l)) _locale = l;
}
export function getLocale(): Locale {
  return _locale;
}

/** Best locale for a first-time visitor: explicit cookie/localStorage → browser language → az. */
export function detectLocale(): Locale {
  try {
    const stored = (localStorage.getItem("bagban_locale") || "") as Locale;
    if (LOCALES.includes(stored)) return stored;
    const nav = (navigator.language || "").slice(0, 2).toLowerCase() as Locale;
    if (LOCALES.includes(nav)) return nav;
  } catch { /* SSR / private mode */ }
  return "az";
}

export function t(key: I18nKey): string {
  const d = DICTS[_locale];
  return (d && d[key]) || az[key] || (key as string);
}
