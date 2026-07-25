"""Localized copy for every Agradex email template.

Structure: COPY[template_id] = {"roles": bool, "<locale>": <content|{role: content}>}. AZ is the
source of truth (native, reviewed); EN is authored too. The other five locales (tr/de/hu/it/pl) are
filled by the translation workflow — until then `build()` falls back locale → en → az, so a template
always renders.

Content dicts use {placeholders} filled from ctx at send time (name, field, area, crop, ndvi,
wellness, days, trial_days, app_url, site_url, add_field_url, ...). Inline <b> is allowed in copy.
"""
from __future__ import annotations

from typing import Any

# Roles that get a bespoke welcome voice. Anything else → "farmer".
ROLES = ("farmer", "consultant", "lab", "supplier")


def _fmt(v: Any, ctx: dict) -> Any:
    if isinstance(v, str):
        try:
            return v.format(**ctx)
        except (KeyError, IndexError, ValueError):
            return v
    if isinstance(v, list):
        return [_fmt(x, ctx) for x in v]
    if isinstance(v, dict):
        return {k: _fmt(x, ctx) for k, x in v.items()}
    return v


# ─────────────────────────────────────────────────────────────────────────────
# WELCOME (role-keyed) — used for both email-signup (after OTP) and Google SSO first login.
# ─────────────────────────────────────────────────────────────────────────────
_WELCOME_AZ = {
    "farmer": {
        "subject": "Agradex-ə xoş gəlmisiniz 🌱",
        "preheader": "Sahənizi kosmosdan izləyin — 2 addımda başlayın.",
        "heading": "Xoş gəldiniz, {name}! 🌱",
        "intro": [
            "Mən Agradex komandasından Ülkərəm. Agradex sizin <b>peyk və süni intellekt köməkçinizdir</b> — hər sahəni kosmosdan görün, stresi erkən tutun və hər manatın hesabını aparın.",
            "İki addımda başlayaq:",
        ],
        "steps": [
            {"n": 1, "text": "<b>İlk sahənizi əlavə edin</b> — xəritədə sərhədi 2 dəqiqəyə çəkin."},
            {"n": 2, "text": "<b>Məhsulu seçin</b> — məhsula uyğun sağlamlıq həddləri və məsləhət açılsın."},
        ],
        "cta": {"label": "Sahəmi əlavə edim →", "url": "{add_field_url}"},
        "outro": ["Sualınız var? Bu məktuba cavab yazın — hər birini oxuyuram."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "consultant": {
        "subject": "Agradex — aqronom iş sahəniz hazırdır",
        "preheader": "Bütün müştəri sahələrini bir xəritədən idarə edin.",
        "heading": "Bütün müştəri sahələrini bir xəritədən idarə edin",
        "intro": [
            "Xoş gəldiniz, {name}. Aqronom kimi <b>çox-sahə iş sahəsini</b> alırsınız: NDVI · NDMI · NDRE trendləri, mövsümi baza xətləri və məsləhət verdiyiniz bütün təsərrüfatlar üzrə VRA zonaları.",
        ],
        "steps": [
            {"n": 1, "text": "<b>Sahələri əlavə edin və ya import edin</b> (shapefile .zip dəstəklənir)."},
            {"n": 2, "text": "<b>Müştəriləri dəvət edin</b> — hərəsi öz təşkilatında, nəzarət sizdə qalır."},
        ],
        "cta": {"label": "İş sahəsini aç →", "url": "{app_url}"},
        "outro": ["Sualınız olsa, birbaşa bu məktuba cavab yazın."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "lab": {
        "subject": "Agradex — laboratoriya profiliniz hazırdır",
        "preheader": "Torpaq-analiz sifarişlərini Agradex-də qəbul edin.",
        "heading": "Fermerlərdən analiz sifarişləri qəbul edin",
        "intro": [
            "Xoş gəldiniz, {name}. Agradex laboratoriyanızı fermerlərlə birləşdirir — <b>torpaq və yarpaq analizi sifarişlərini</b> birbaşa platformada qəbul edin.",
        ],
        "steps": [
            {"n": 1, "text": "<b>Lab profilinizi tamamlayın</b> — xidmətlər, qiymətlər, əhatə bölgəsi."},
            {"n": 2, "text": "<b>Sifarişləri qəbul edin</b> — nəticələri birbaşa fermerlə paylaşın."},
        ],
        "cta": {"label": "Profilimi tamamlayım →", "url": "{app_url}"},
        "outro": ["Kömək lazımdırsa, bu məktuba cavab yazın."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "supplier": {
        "subject": "Agradex — təchizatçı hesabınız hazırdır",
        "preheader": "Fermerlərə çatın, məhsullarınızı yerləşdirin.",
        "heading": "Fermerlərə çatın, məhsullarınızı yerləşdirin",
        "intro": [
            "Xoş gəldiniz, {name}. Agradex sizi bölgənizdəki fermerlərlə birləşdirir — <b>gübrə, toxum və xidmətlərinizi</b> kataloqda yerləşdirin, sorğular alın.",
        ],
        "steps": [
            {"n": 1, "text": "<b>Kataloqunuzu yerləşdirin</b> — məhsullar, qiymətlər, bölgə."},
            {"n": 2, "text": "<b>Sorğuları qəbul edin</b> — maraqlanan fermerlərlə birbaşa əlaqə."},
        ],
        "cta": {"label": "Kataloqumu aç →", "url": "{app_url}"},
        "outro": ["Sualınız olsa, bu məktuba cavab yazın."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
}
_WELCOME_EN = {
    "farmer": {
        "subject": "Welcome to Agradex 🌱",
        "preheader": "See your fields from space — get started in 2 steps.",
        "heading": "Welcome, {name}! 🌱",
        "intro": [
            "I'm Olivia from Agradex. Agradex is your <b>satellite + AI co-pilot</b> — see every field from space, catch stress early, and account for every manat.",
            "Let's get started in 2 steps:",
        ],
        "steps": [
            {"n": 1, "text": "<b>Add your first field</b> — draw it on the map in under 2 minutes."},
            {"n": 2, "text": "<b>Set the crop</b> — unlock crop-specific health thresholds and advice."},
        ],
        "cta": {"label": "Add my field →", "url": "{add_field_url}"},
        "outro": ["Questions? Just reply to this email — I read every one."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "consultant": {
        "subject": "Your Agradex agronomist workspace",
        "preheader": "Manage every client field from one map.",
        "heading": "Manage every client field from one map",
        "intro": [
            "Welcome, {name}. As an agronomist you get the <b>multi-field workspace</b>: NDVI · NDMI · NDRE trends, seasonal baselines and VRA zones across all the farms you advise.",
        ],
        "steps": [
            {"n": 1, "text": "<b>Add or import fields</b> (shapefile .zip supported)."},
            {"n": 2, "text": "<b>Invite clients</b> to their own orgs — you keep oversight."},
        ],
        "cta": {"label": "Open workspace →", "url": "{app_url}"},
        "outro": ["Any questions? Just reply to this email."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "lab": {
        "subject": "Your Agradex lab profile is ready",
        "preheader": "Receive soil-analysis orders on Agradex.",
        "heading": "Receive analysis orders from farmers",
        "intro": [
            "Welcome, {name}. Agradex connects your lab with farmers — receive <b>soil and leaf analysis orders</b> directly on the platform.",
        ],
        "steps": [
            {"n": 1, "text": "<b>Complete your lab profile</b> — services, pricing, coverage area."},
            {"n": 2, "text": "<b>Accept orders</b> — share results directly with the farmer."},
        ],
        "cta": {"label": "Complete my profile →", "url": "{app_url}"},
        "outro": ["Need help? Just reply to this email."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "supplier": {
        "subject": "Your Agradex supplier account is ready",
        "preheader": "Reach farmers, list your products.",
        "heading": "Reach farmers, list your products",
        "intro": [
            "Welcome, {name}. Agradex connects you with farmers in your region — list your <b>inputs, seeds and services</b> in the catalog and receive leads.",
        ],
        "steps": [
            {"n": 1, "text": "<b>List your catalog</b> — products, pricing, region."},
            {"n": 2, "text": "<b>Accept leads</b> — connect directly with interested farmers."},
        ],
        "cta": {"label": "Open my catalog →", "url": "{app_url}"},
        "outro": ["Any questions? Just reply to this email."],
        "signoff": "Olivia Hayes — Agradex",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# TRANSACTIONAL (role-agnostic)
# ─────────────────────────────────────────────────────────────────────────────
_SIMPLE_AZ: dict[str, dict] = {
    "data_ready": {
        "subject": "“{field}” sahənizin peyk xəritəsi hazırdır 🛰️",
        "preheader": "İlk NDVI xəritəsini və sağlamlıq qiymətini indi görün.",
        "heading": "Sahəniz artıq kosmosdan görünür 🛰️",
        "intro": ["<b>“{field}”</b> ({area} ha) üçün peyk təhlili hazırdır. İlk NDVI xəritəsini və bitki sağlamlığı qiymətini indi görün."],
        "cta": {"label": "Sahəni aç →", "url": "{field_url}"},
        "outro": ["Növbəti peyk səhnəsi gələndə AI aqronom avtomatik məsləhət hazırlayacaq."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_field_d1": {
        "subject": "İlk sahənizi 2 dəqiqəyə əlavə edin",
        "preheader": "Peykin sahənizi görməsi üçün yalnız sərhəd lazımdır.",
        "heading": "Bir sahə — bütün fərqi yaradır",
        "intro": ["Salam {name}! Hesabınız hazırdır, amma hələ sahə əlavə etməmisiniz. <b>Peykin sahənizi “görməsi” üçün cəmi sərhədi çəkmək lazımdır.</b>",
                  "Çəkmək istəmirsiniz? Xəritədə sahəyə <b>toxunun</b> — Agradex sərhədi özü aşkarlayır."],
        "stats": [{"val": "2 dəq", "lab": "qurulma vaxtı"}, {"val": "9", "lab": "peyk indeksi"}, {"val": "0 ₼", "lab": "kart tələb olunmur"}],
        "cta": {"label": "Xəritəni aç →", "url": "{add_field_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_field_d3": {
        "subject": "Sahənizi bir toxunuşla aşkarlayın",
        "preheader": "Çəkməyə ehtiyac yoxdur — xəritədə toxunun.",
        "heading": "Çəkmək əziyyət deyil",
        "intro": ["Salam {name}. Sahənizi hələ əlavə etməmisiniz — bəlkə sərhəd çəkmək əziyyətli görünür?",
                  "Xəritədə sahənizə sadəcə <b>toxunun</b>, Agradex sərhədi avtomatik tapsın. Yaxud demo sahə ilə platformanı sınayın."],
        "cta": {"label": "Toxun və aşkarla →", "url": "{add_field_url}"},
        "outro": ["Bir şey aydın deyilsə, bu məktuba cavab yazın — kömək edərəm."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_field_d7": {
        "subject": "Kömək lazımdırsa, buradayam",
        "preheader": "Sahə əlavə etməkdə çətinlik var? Cavab yazın.",
        "heading": "Başlamağa kömək edim?",
        "intro": ["Salam {name}. Bir həftə əvvəl Agradex-ə qeydiyyatdan keçdiniz, amma hələ sahə əlavə etməmisiniz.",
                  "Nəyinsə çətin olub-olmadığını bilmək istəyirəm. <b>Bu məktuba bir cümlə ilə cavab yazın</b> — nə lazımdırsa kömək edim, istəsəniz qısa zəng də təşkil edərik."],
        "cta": {"label": "İlk sahəni əlavə et →", "url": "{add_field_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_crop": {
        "subject": "“{field}” üçün məhsulu seçin — dəqiq məsləhət açılsın",
        "preheader": "Məhsul seçimi məhsula uyğun normaları aktiv edir.",
        "heading": "Bir addım qalıb: məhsulu seçin",
        "intro": ["<b>“{field}”</b> sahəsini əlavə etdiniz — əla! İndi məhsulu seçsəniz, Agradex <b>məhsula uyğun sağlamlıq həddləri</b> və daha dəqiq məsləhət verə bilər."],
        "cta": {"label": "Məhsulu seç →", "url": "{field_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "inactive_10d": {
        "subject": "Yoxluğunuzda sahələrinizdə nə dəyişdi",
        "preheader": "Yeni peyk səhnəsi və sağlamlıq dəyişimi.",
        "heading": "Sizsiz də sahələriniz işləyirdi",
        "intro": ["Salam {name}. Bir müddətdir Agradex-ə baş çəkməmisiniz — bu vaxt sahələriniz üçün <b>yeni peyk səhnələri</b> gəldi və bitki sağlamlığı dəyişdi.",
                  "Bir baxışda nəyin dəyişdiyini görün — bəlkə diqqət tələb edən nəsə var."],
        "cta": {"label": "Sahələrimə bax →", "url": "{app_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "inactive_30d": {
        "subject": "Sahələriniz sizi gözləyir",
        "preheader": "Bir aydır görüşmürük — geri dönün.",
        "heading": "Bir aydır görüşmürük",
        "intro": ["Salam {name}. Bir aydır Agradex-ə baş çəkməmisiniz. Bu müddətdə peyk sahələrinizi izləməyə davam etdi.",
                  "Bircə baxışla məhsulunuzun vəziyyətini yoxlayın — <b>bir dəqiqə çəkir, amma xəbərdarlıq qazandırır.</b>"],
        "cta": {"label": "Geri dön →", "url": "{app_url}"},
        "outro": ["Nəyisə yaxşılaşdıra bilərikmi? Bu məktuba cavab yazın — dinləyirəm."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "trial_ending": {
        "subject": "Pro sınağınıza {trial_days} gün qalıb",
        "preheader": "Sınaq bitməzdən əvvəl paketi seçin.",
        "heading": "Pro sınağınız bitmək üzrədir",
        "intro": ["Salam {name}. Pulsuz Pro sınağınıza <b>{trial_days} gün</b> qalıb. Bundan sonra hesabınız avtomatik pulsuz plana keçəcək (datanız qalır).",
                  "Pro-nun məhsuldarlıq zonaları, VRA və genişləndirilmiş məsləhətini saxlamaq istəyirsinizsə, paketi indi seçin."],
        "cta": {"label": "Paketlərə bax →", "url": "{pricing_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "edu_ndvi": {
        "subject": "NDVI nədir və rəqəm nəyi göstərir?",
        "preheader": "Sahənizin sağlamlıq qiymətini oxumağı öyrənin.",
        "heading": "NDVI-ni 1 dəqiqəyə oxumağı öyrənin",
        "intro": ["NDVI bitki sağlamlığının peyk ölçüsüdür. Qaydası sadədir:",
                  "<b>0.2–0.5</b> — erkən mərhələ və ya stres · <b>0.5–0.85</b> — sağlam, aktiv böyümə · <b>0.25 və aşağı</b> — biçinə yaxın və ya problem.",
                  "Rəqəm gözlənilməz düşürsə, sahəni yoxlamağa dəyər: su, zərərverici, qidalanma."],
        "cta": {"label": "Sahəmin NDVI-sinə bax →", "url": "{app_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "edu_ledger": {
        "subject": "Hər manatın hesabını aparın",
        "preheader": "Təsərrüfat dəftəri ilə xərc və məhsuldarlıq.",
        "heading": "Təsərrüfat dəftəri — xərc və gəlir bir yerdə",
        "intro": ["Agradex yalnız peyk deyil — <b>təsərrüfat dəftəridir</b>. Əməliyyatları, xərcləri və məhsuldarlığı qeyd edin, mövsümün sonunda hər sahənin real hesabını görün.",
                  "Bir neçə qeyd bu gün — mövsüm sonunda aydın mənzərə."],
        "cta": {"label": "Dəftəri aç →", "url": "{app_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "edu_invite": {
        "subject": "Komandanızı və aqronomunuzu dəvət edin",
        "preheader": "Sahələri birlikdə idarə edin.",
        "heading": "Tək işləməyin — komandanı dəvət edin",
        "intro": ["Sahələrinizi ailə üzvləri, işçilər və ya aqronomunuzla birlikdə idarə edə bilərsiniz. Hər kəs öz giriş hüququ ilə eyni sahələri görür.",
                  "Aqronomunuz məsləhətləri birbaşa Agradex-də verə bilər."],
        "cta": {"label": "Dəvət göndər →", "url": "{app_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "digest_weekly": {
        "subject": "Həftəlik sahə xülasəniz",
        "preheader": "NDVI trendi, hava və açıq tapşırıqlar.",
        "heading": "Bu həftə sahələrinizdə",
        "intro": ["Salam {name}. Sahələrinizin həftəlik xülasəsi hazırdır — bitki sağlamlığı trendi, hava proqnozu və açıq tapşırıqlar.",
                  "Ətraflı mənzərə üçün panelə keçin."],
        "cta": {"label": "Xülasəyə bax →", "url": "{app_url}"},
        "signoff": "Ülkər Nəsirova — Agradex",
    },
}
_SIMPLE_EN: dict[str, dict] = {
    "data_ready": {
        "subject": "Your field “{field}” is ready 🛰️",
        "preheader": "See your first NDVI map and health score now.",
        "heading": "Your field is now visible from space 🛰️",
        "intro": ["Satellite analysis for <b>“{field}”</b> ({area} ha) is ready. See your first NDVI map and crop-health score now."],
        "cta": {"label": "Open field →", "url": "{field_url}"},
        "outro": ["When the next satellite scene arrives, the AI agronomist will prepare advice automatically."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_field_d1": {
        "subject": "Add your first field in 2 minutes",
        "preheader": "The satellite just needs a boundary to see your field.",
        "heading": "One field makes all the difference",
        "intro": ["Hi {name}! Your account is ready, but you haven't added a field yet. <b>The satellite just needs a boundary to “see” your field.</b>",
                  "Don't want to draw it? Just <b>tap</b> the field on the map — Agradex detects the boundary for you."],
        "stats": [{"val": "2 min", "lab": "to set up"}, {"val": "9", "lab": "satellite indices"}, {"val": "$0", "lab": "no card needed"}],
        "cta": {"label": "Open the map →", "url": "{add_field_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_field_d3": {
        "subject": "Detect your field with one tap",
        "preheader": "No drawing needed — just tap on the map.",
        "heading": "Drawing isn't the hard part",
        "intro": ["Hi {name}. You haven't added a field yet — maybe drawing a boundary feels like a chore?",
                  "Just <b>tap</b> your field on the map and let Agradex find the boundary automatically. Or try the platform with a demo field."],
        "cta": {"label": "Tap to detect →", "url": "{add_field_url}"},
        "outro": ["If anything's unclear, just reply to this email — I'll help."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_field_d7": {
        "subject": "Here if you need a hand",
        "preheader": "Stuck adding a field? Just reply.",
        "heading": "Can I help you get started?",
        "intro": ["Hi {name}. You joined Agradex a week ago but haven't added a field yet.",
                  "I'd love to know if something got in the way. <b>Reply with one line</b> and I'll help with whatever you need — we can even set up a quick call."],
        "cta": {"label": "Add your first field →", "url": "{add_field_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_crop": {
        "subject": "Set the crop for “{field}” to unlock precise advice",
        "preheader": "Choosing a crop activates crop-specific norms.",
        "heading": "One step left: set the crop",
        "intro": ["You added <b>“{field}”</b> — great! Now if you set the crop, Agradex can apply <b>crop-specific health thresholds</b> and give sharper advice."],
        "cta": {"label": "Set the crop →", "url": "{field_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "inactive_10d": {
        "subject": "What changed in your fields while you were away",
        "preheader": "New satellite scene and health change.",
        "heading": "Your fields kept working without you",
        "intro": ["Hi {name}. It's been a while since you visited Agradex — meanwhile <b>new satellite scenes</b> arrived and crop health shifted.",
                  "See what changed at a glance — there may be something that needs attention."],
        "cta": {"label": "View my fields →", "url": "{app_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "inactive_30d": {
        "subject": "Your fields are waiting for you",
        "preheader": "It's been a month — come back.",
        "heading": "It's been a month",
        "intro": ["Hi {name}. It's been a month since you visited Agradex. The satellite kept monitoring your fields the whole time.",
                  "Check your crops at a glance — <b>it takes a minute and can save you a warning.</b>"],
        "cta": {"label": "Come back →", "url": "{app_url}"},
        "outro": ["Anything we could do better? Reply to this email — I'm listening."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "trial_ending": {
        "subject": "{trial_days} days left in your Pro trial",
        "preheader": "Choose a plan before your trial ends.",
        "heading": "Your Pro trial is ending soon",
        "intro": ["Hi {name}. You have <b>{trial_days} days</b> left in your free Pro trial. After that your account switches to the free plan automatically (your data stays).",
                  "To keep Pro's productivity zones, VRA and extended advice, choose a plan now."],
        "cta": {"label": "See plans →", "url": "{pricing_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "edu_ndvi": {
        "subject": "What is NDVI, and what does the number mean?",
        "preheader": "Learn to read your field's health score.",
        "heading": "Learn to read NDVI in one minute",
        "intro": ["NDVI is the satellite measure of plant health. The rule of thumb is simple:",
                  "<b>0.2–0.5</b> — early stage or stress · <b>0.5–0.85</b> — healthy, active growth · <b>0.25 and below</b> — near harvest or a problem.",
                  "If the number drops unexpectedly, it's worth checking the field: water, pests, nutrition."],
        "cta": {"label": "See my field's NDVI →", "url": "{app_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "edu_ledger": {
        "subject": "Account for every manat",
        "preheader": "Track cost and yield with the farm ledger.",
        "heading": "The farm ledger — cost and income in one place",
        "intro": ["Agradex isn't only satellite — it's a <b>farm ledger</b>. Log operations, costs and yields, and at season's end see the real numbers for each field.",
                  "A few entries today — a clear picture at harvest."],
        "cta": {"label": "Open the ledger →", "url": "{app_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "edu_invite": {
        "subject": "Invite your team and your agronomist",
        "preheader": "Manage fields together.",
        "heading": "Don't work alone — invite your team",
        "intro": ["You can manage your fields together with family, workers or your agronomist. Everyone sees the same fields with their own access rights.",
                  "Your agronomist can give advice directly inside Agradex."],
        "cta": {"label": "Send an invite →", "url": "{app_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
    "digest_weekly": {
        "subject": "Your weekly field summary",
        "preheader": "NDVI trend, weather and open tasks.",
        "heading": "This week in your fields",
        "intro": ["Hi {name}. Your weekly field summary is ready — crop-health trend, weather forecast and open tasks.",
                  "Open the dashboard for the full picture."],
        "cta": {"label": "See the summary →", "url": "{app_url}"},
        "signoff": "Olivia Hayes — Agradex",
    },
}

# Assemble the registry. WELCOME is role-keyed; the rest are flat.
COPY: dict[str, dict] = {
    "welcome": {"roles": True, "az": _WELCOME_AZ, "en": _WELCOME_EN},
}
for _tid in _SIMPLE_AZ:
    COPY[_tid] = {"roles": False, "az": _SIMPLE_AZ[_tid], "en": _SIMPLE_EN.get(_tid, _SIMPLE_AZ[_tid])}


def build(template_id: str, locale: str | None, role: str | None, ctx: dict) -> dict | None:
    """Resolve a template to a formatted content dict. Falls back locale → en → az."""
    entry = COPY.get(template_id)
    if not entry:
        return None
    loc = (locale or "az")[:2].lower()
    raw = entry.get(loc) or entry.get("en") or entry.get("az")
    if entry.get("roles"):
        r = role if role in ROLES else "farmer"
        raw = raw.get(r) or raw.get("farmer")
    return _fmt(raw, ctx)
