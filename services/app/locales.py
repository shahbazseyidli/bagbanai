"""The product's locale list and the model-facing language names, in ONE place.

WHY THIS FILE EXISTS. Spanish shipped as the ninth UI locale on 2026-08-02 with full frontend
parity — 2,824 keys, its own legal pages, a LatAm-neutral `usted` register. The server did not
follow: sixteen separate per-locale tables across ten modules kept the eight languages they were
born with, and nothing connected them, so nothing failed loudly. Measured on 2026-10-10, a Spanish
account got its **verification code email in Azerbaijani**, its field named "Sahə 1", its frost
warning on Telegram in Azerbaijani, and its unsubscribe page in Azerbaijani.

The language list itself had three copies (advice.py, chat.py, and a patched one in
season_summary.py). One copy is a typo; three is a design, and this module replaces it. `LANG_NAMES` is the only one that can be truly shared —
translated prose (a field word, an email subject, alert copy) must stay in the module that renders
it, because the string is the translation, not a lookup. What those tables get instead is
`services/tests/test_locales.py`, which walks every one of them and fails when a locale in
SUPPORTED_LOCALES is missing. The tenth language therefore cannot repeat 2026-08-02.

NO IMPORTS, DELIBERATELY. Both `routers/` and `ai/` need this, `routers/advice.py` already imports
from `routers/fields.py`, and `ai/` is imported BY `routers/`. A module with zero imports cannot
take part in a cycle no matter who reaches for it.
"""
from __future__ import annotations

# az is the source language: `I18nKey` is derived from the az dictionary and every fallback chain
# ends here. Order is the launch order, which is also the order the switcher renders.
DEFAULT_LOCALE = "az"

SUPPORTED_LOCALES: tuple[str, ...] = ("az", "en", "ru", "tr", "de", "hu", "it", "pl", "es")

# Locale code → the English language name the model reliably recognizes. English on purpose: a
# prompt that says "write in Español" is one token away from a prompt that says "write in Espanol",
# while "Spanish" is unambiguous to every model we have measured. The native name rides along in
# parentheses because it costs nothing and removes the last doubt for a bilingual label.
#
# THIS TABLE DECIDES WHAT LANGUAGE A FARMER IS WRITTEN TO IN. A locale missing here does not
# degrade politely: `_lang_clause()` returns an empty string, the model receives NO language
# instruction at all, and it answers in whatever language the rest of the prompt is written in —
# Azerbaijani. The row is then stored labelled with the locale that was asked for, so the reader's
# own `lang_mismatch` check says the text is fine. That is the exact shape of the es bug: a silent
# lie that regenerating reproduces. Hence `normalize()` below, and hence the test.
LANG_NAMES: dict[str, str] = {
    "az": "Azerbaijani (Azərbaycan dili)",
    "en": "English",
    "ru": "Russian (Русский)",
    "tr": "Turkish (Türkçe)",
    "de": "German (Deutsch)",
    "hu": "Hungarian (Magyar)",
    "it": "Italian (Italiano)",
    "pl": "Polish (Polski)",
    "es": "Spanish (Español)",
}


def normalize(value: str | None) -> str:
    """A supported locale, or `az`. Use this at every boundary that STORES a language.

    The manual advice path is why this is a function and not a comprehension at each call site:
    `routers/advice.py` validated the incoming locale against its own nine-locale set, then handed
    it to a generator whose table held eight. Both halves were individually defensible and the
    product of them wrote Azerbaijani prose into a row labelled `es`. Normalizing where the label
    is written means the stored language and the prose can only ever disagree if the MODEL
    disobeys — which is a different, visible, fixable problem.
    """
    if not isinstance(value, str):
        return DEFAULT_LOCALE
    cand = value.strip().lower()[:2]
    return cand if cand in SUPPORTED_LOCALES else DEFAULT_LOCALE
