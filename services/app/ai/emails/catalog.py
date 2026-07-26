"""Localized copy for every Agradex email template.

THE WHOLE CATALOG IS THREE TEMPLATES (E15). Agradex sends exactly two transactional emails —
`welcome` (once per account) and `data_ready` (the first "your field is visible from space") — plus
`weekly`, the single recurring digest. The nine templates that used to fan out on their own day
offsets (no_field_d1/d3/d7, edu_ndvi/edu_ledger/edu_invite, no_crop, inactive_10d/inactive_30d,
trial_ending, digest_weekly) are gone: their intent now lives inside `weekly` as variants and
blocks. If you are about to add a template, ask first whether it is a variant of the weekly digest.
(OTP is not here — routers/auth.py sends it through notify.send_email directly.)

Structure: COPY[template_id] = {"roles"|"variants": bool, "<locale>": <content|{key: content}>}.
AZ is the source of truth (native, reviewed); EN is authored too. The other five locales
(tr/de/hu/it/pl) come from the translation workflow — until then `build()` falls back
locale → en → az, so a template always renders.

Content dicts use {placeholders} filled from ctx at send time (name, name_suffix, field, area,
fields_label, alerts_label, trial_days, app_url, site_url, add_field_url, ...). Inline <b> is
allowed in copy. WARNING: `_fmt` swallows KeyError, so a placeholder the caller forgot to supply
ships to the farmer as the literal "{field}" — every key a template references must be defaulted by
its caller.
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
}

# ─────────────────────────────────────────────────────────────────────────────
# WEEKLY DIGEST (variant-keyed) — E15. The ONE recurring email; everything that used to be its own
# message (alerts, advice changes, onboarding nudges, win-backs, trial warnings) arrives inside it.
#
# ONE template id with four framings, deliberately: the send ledger dedups per
# (user, template_id, dedup_key=ISO week), so separate ids would let a farmer who adds a field on
# Thursday receive a second email in the same week. The body is not here — `weekly.build_weekly()`
# assembles it from the week's data and passes it to send_template(blocks=...).
#
# ctx keys available to this copy (weekly.build_weekly guarantees all of them exist — catalog._fmt
# swallows KeyError and would ship a literal "{field}" to the farmer):
#   {name} {name_suffix} {field} {fields_label} {alerts_label} {trial_days} + the URL keys.
# ─────────────────────────────────────────────────────────────────────────────
_WEEKLY_AZ = {
    "calm": {
        "subject": "Həftəlik xülasə: {fields_label} qaydasındadır",
        "preheader": "Sağlamlıq balı, NDVI trendi və AI məsləhəti — bir baxışda.",
        "heading": "Bu həftə sahələrinizdə",
        "intro": ["Salam{name_suffix}! Bu həftə sahələrinizdə təcili heç nə olmadı — budur qısa xülasə."],
        "outro": ["Təcili xəbərdarlıqlar dərhal tətbiqdə görünür; email həftədə bir dəfə, çərşənbə səhəri gəlir.",
                  "Sualınız var? Bu məktuba cavab yazın — hər birini oxuyuram."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "alerts": {
        "subject": "⚠️ {alerts_label} — həftəlik xülasəniz",
        "preheader": "Ən çox diqqət tələb edən sahə: “{field}”.",
        "heading": "Bu həftə diqqət tələb edən sahələr",
        "intro": ["Salam{name_suffix}! Bu həftə sahələrinizdə <b>{alerts_label}</b> qeydə alındı. Ən çox diqqət tələb edən sahə — <b>“{field}”</b>.",
                  "Hamısı aşağıdadır. Sahəyə çıxmazdan əvvəl bir dəqiqəlik oxuyun."],
        "outro": ["Təcili xəbərdarlıqlar dərhal tətbiqdə görünür; email həftədə bir dəfə, çərşənbə səhəri gəlir.",
                  "Sualınız var? Bu məktuba cavab yazın — hər birini oxuyuram."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_crop": {
        "subject": "Bir addım qalıb: “{field}” üçün məhsulu seçin",
        "preheader": "Məhsul seçimi məhsula uyğun normaları aktiv edir.",
        "heading": "Bir addım qalıb: məhsulu seçin",
        "intro": ["Salam{name_suffix}! Sahələriniz peykdə görünür, amma hələ məhsul seçilməyib. Məhsulu seçən kimi Agradex <b>məhsula uyğun sağlamlıq həddləri</b>, gübrə normaları və daha dəqiq məsləhət verə bilir.",
                  "Bir dəqiqəlik işdir. Aşağıda bu həftənin xülasəsi də var."],
        "outro": ["Bu məktub həftədə bir dəfə, çərşənbə səhəri gəlir."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
    "no_fields": {
        "subject": "İlk sahənizi 2 dəqiqəyə əlavə edin",
        "preheader": "Peykin sahənizi görməsi üçün yalnız sərhəd lazımdır.",
        "heading": "Bir sahə — bütün fərqi yaradır",
        "intro": ["Salam{name_suffix}! Hesabınız hazırdır, amma hələ sahə əlavə etməmisiniz. <b>Peykin sahənizi “görməsi” üçün cəmi sərhədi çəkmək lazımdır.</b>",
                  "Çəkmək istəmirsiniz? Xəritədə sahəyə <b>toxunun</b> — Agradex sərhədi özü aşkarlayır."],
        "outro": ["Nəyisə çətindirsə, bu məktuba bir cümlə ilə cavab yazın — kömək edərəm.",
                  "Sahə əlavə edən kimi bu məktubun yerinə həftəlik sahə xülasəniz gələcək."],
        "signoff": "Ülkər Nəsirova — Agradex",
    },
}
_WEEKLY_EN = {
    "calm": {
        "subject": "Your week: {fields_label}, all steady",
        "preheader": "Health score, NDVI trend and AI advice — at a glance.",
        "heading": "This week in your fields",
        "intro": ["Hi{name_suffix}! Nothing urgent happened in your fields this week — here's the short version."],
        "outro": ["Urgent alerts show up in the app straight away; email comes once a week, on Wednesday morning.",
                  "Questions? Just reply to this email — I read every one."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "alerts": {
        "subject": "⚠️ {alerts_label} — your weekly summary",
        "preheader": "The field that needs you most: “{field}”.",
        "heading": "What needs your attention this week",
        "intro": ["Hi{name_suffix}! <b>{alerts_label}</b> fired in your fields this week. The one that needs you most is <b>“{field}”</b>.",
                  "They're all below. Worth a minute before you head out to the field."],
        "outro": ["Urgent alerts show up in the app straight away; email comes once a week, on Wednesday morning.",
                  "Questions? Just reply to this email — I read every one."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_crop": {
        "subject": "One step left: set the crop for “{field}”",
        "preheader": "Choosing a crop activates crop-specific norms.",
        "heading": "One step left: set the crop",
        "intro": ["Hi{name_suffix}! Your fields are visible from space, but no crop is set yet. The moment you pick one, Agradex can apply <b>crop-specific health thresholds</b>, fertilizer norms and sharper advice.",
                  "It takes a minute. This week's summary is below as well."],
        "outro": ["This email comes once a week, on Wednesday morning."],
        "signoff": "Olivia Hayes — Agradex",
    },
    "no_fields": {
        "subject": "Add your first field in 2 minutes",
        "preheader": "The satellite just needs a boundary to see your field.",
        "heading": "One field makes all the difference",
        "intro": ["Hi{name_suffix}! Your account is ready, but you haven't added a field yet. <b>The satellite just needs a boundary to “see” your field.</b>",
                  "Don't want to draw it? Just <b>tap</b> the field on the map — Agradex detects the boundary for you."],
        "outro": ["If anything got in the way, reply with one line and I'll help.",
                  "As soon as you add a field, this email becomes your weekly field summary instead."],
        "signoff": "Olivia Hayes — Agradex",
    },
}

# Assemble the registry. WELCOME is role-keyed, WEEKLY is variant-keyed, the rest are flat.
COPY: dict[str, dict] = {
    "welcome": {"roles": True, "az": _WELCOME_AZ, "en": _WELCOME_EN},
    "weekly": {"variants": True, "default_variant": "calm", "az": _WEEKLY_AZ, "en": _WEEKLY_EN},
}
for _tid in _SIMPLE_AZ:
    COPY[_tid] = {"roles": False, "az": _SIMPLE_AZ[_tid], "en": _SIMPLE_EN.get(_tid, _SIMPLE_AZ[_tid])}

# Merge the machine-translated tr/de/hu/it/pl copy (auto-generated). Missing locale → en → az.
try:
    from .catalog_i18n import WELCOME_EXTRA, SIMPLE_EXTRA
    for _loc, _d in WELCOME_EXTRA.items():
        COPY["welcome"][_loc] = _d
    for _tid in _SIMPLE_AZ:
        for _loc, _d in SIMPLE_EXTRA.items():
            if _tid in _d:
                COPY[_tid][_loc] = _d[_tid]
except ImportError:
    pass


def _payload(entry: dict, loc: str, role: str | None, variant: str | None) -> dict | None:
    """Walk locale → en → az and return the first payload that actually resolves.

    The walk (rather than picking a locale up front) matters for keyed templates: a machine-
    translated locale written before a template gained roles/variants is a FLAT dict with no such
    key, and picking it would render half a template. Missing key → drop to the next locale.
    """
    for cand in (loc, "en", "az"):
        raw = entry.get(cand)
        if not isinstance(raw, dict):
            continue
        if entry.get("roles"):
            raw = raw.get(role if role in ROLES else "farmer") or raw.get("farmer")
        elif entry.get("variants"):
            raw = raw.get(variant or "") or raw.get(entry.get("default_variant") or "")
        if isinstance(raw, dict) and raw:
            return raw
    return None


def build(template_id: str, locale: str | None, role: str | None, ctx: dict,
          variant: str | None = None) -> dict | None:
    """Resolve a template to a formatted content dict. Falls back locale → en → az.
    `variant` selects between framings of one template id (see the weekly digest above)."""
    entry = COPY.get(template_id)
    if not entry:
        return None
    raw = _payload(entry, (locale or "az")[:2].lower(), role, variant)
    return _fmt(raw, ctx) if raw else None
