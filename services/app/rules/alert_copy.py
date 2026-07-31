"""Server-side copy for dispatched alerts — Telegram, Web Push and the weekly digest.

WHY THIS EXISTS SEPARATELY FROM THE FRONTEND. Migration 0057 gave public.notifications a code and
params, and the in-app bell resolves them in the reader's own language. The OUTBOUND channels
cannot: they render on the server, one message per recipient, with no browser locale in play.
Without a table here they kept sending the Azerbaijani prose the rule engine writes as its
fallback — so a Turkish farmer's frost warning still arrived in Azerbaijani on Telegram and on
their phone's lock screen, even after the bell was fixed.

The strings are the SAME ones as app/src/lib/locales/*.ts (alert.*) and were EXTRACTED from them
rather than re-translated, so one alert reads identically wherever a farmer meets it.

Same contract as ai/emails/catalog.py: per-locale dicts, locale then en then az as the fallback
chain, and anything missing degrades instead of raising in the middle of a send.
"""
from __future__ import annotations

ALERT_COPY: dict[str, dict[str, str]] = {
    "az": {
        "alert.frost.title": "🥶 Şaxta xəbərdarlığı",
        "alert.heat.title": "🌡️ İstilik stresi",
        "alert.wind.title": "💨 Güclü külək",
        "alert.weather.title": "Hava xəbərdarlığı",
        "alert.ndviDrop.title": "📉 Bitki sağlamlığı düşür",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — çətir stresi. Sahəni yoxlayın: su, zərərverici, qidalanma.",
        "alert.ndmiLow.title": "💧 Su stresi (nəmlik aşağı)",
        "alert.ndmiLow.body": "Bitki nəmliyi (NDMI) {ndmi} — aşağı. Suvarma ehtiyacını yoxlayın.",
        "alert.ndviNbr.title": "🔥 Kəskin dəyişim (yanıq/senescens?)",
        "alert.ndviNbr.body": "NDVI və NBR birlikdə kəskin düşüb — yanıq, biçin və ya sürətli quruma ola bilər.",
        "alert.vegAnomaly.title": "⚠️ NDVI normadan aşağı",
        "alert.vegAnomaly.body": "NDVI {latest} bu həftə üçün sahənizin adi həddindən (p10 {p10}) aşağıdır — anomaliya."
    },
    "en": {
        "alert.frost.title": "🥶 Frost warning",
        "alert.heat.title": "🌡️ Heat stress",
        "alert.wind.title": "💨 Strong wind",
        "alert.weather.title": "Weather alert",
        "alert.ndviDrop.title": "📉 Crop health is falling",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — canopy stress. Check the field: water, pests, nutrition.",
        "alert.ndmiLow.title": "💧 Water stress (low moisture)",
        "alert.ndmiLow.body": "Crop moisture (NDMI) {ndmi} — low. Check whether irrigation is needed.",
        "alert.ndviNbr.title": "🔥 Sharp change (burn / senescence?)",
        "alert.ndviNbr.body": "NDVI and NBR both dropped sharply — this can be burn, harvest or rapid drying.",
        "alert.vegAnomaly.title": "⚠️ NDVI below the field's norm",
        "alert.vegAnomaly.body": "NDVI {latest} is below this field's usual level for this week (p10 {p10}) — an anomaly."
    },
    "ru": {
        "alert.frost.title": "🥶 Предупреждение о заморозках",
        "alert.heat.title": "🌡️ Тепловой стресс",
        "alert.wind.title": "💨 Сильный ветер",
        "alert.weather.title": "Погодное оповещение",
        "alert.ndviDrop.title": "📉 Здоровье посевов снижается",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — стресс полога. Проверьте поле: вода, вредители, питание.",
        "alert.ndmiLow.title": "💧 Водный стресс (низкая влажность)",
        "alert.ndmiLow.body": "Влажность посева (NDMI) {ndmi} — низкая. Проверьте необходимость полива.",
        "alert.ndviNbr.title": "🔥 Резкое изменение (ожог/старение?)",
        "alert.ndviNbr.body": "NDVI и NBR резко упали вместе — это может быть ожог, уборка или быстрое усыхание.",
        "alert.vegAnomaly.title": "⚠️ NDVI ниже нормы поля",
        "alert.vegAnomaly.body": "NDVI {latest} ниже обычного уровня этого поля для этой недели (p10 {p10}) — аномалия."
    },
    "tr": {
        "alert.frost.title": "🥶 Don uyarısı",
        "alert.heat.title": "🌡️ Sıcaklık stresi",
        "alert.wind.title": "💨 Kuvvetli rüzgâr",
        "alert.weather.title": "Hava uyarısı",
        "alert.ndviDrop.title": "📉 Bitki sağlığı düşüyor",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — örtü stresi. Tarlayı kontrol edin: su, zararlı, besleme.",
        "alert.ndmiLow.title": "💧 Su stresi (nem düşük)",
        "alert.ndmiLow.body": "Bitki nemi (NDMI) {ndmi} — düşük. Sulama ihtiyacını kontrol edin.",
        "alert.ndviNbr.title": "🔥 Ani değişim (yanık/yaşlanma?)",
        "alert.ndviNbr.body": "NDVI ve NBR birlikte sert düştü — yanık, hasat veya hızlı kuruma olabilir.",
        "alert.vegAnomaly.title": "⚠️ NDVI tarlanın normunun altında",
        "alert.vegAnomaly.body": "NDVI {latest}, bu tarlanın bu haftaki olağan seviyesinin (p10 {p10}) altında — anomali."
    },
    "de": {
        "alert.frost.title": "🥶 Frostwarnung",
        "alert.heat.title": "🌡️ Hitzestress",
        "alert.wind.title": "💨 Starker Wind",
        "alert.weather.title": "Wetterwarnung",
        "alert.ndviDrop.title": "📉 Pflanzengesundheit sinkt",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — Bestandesstress. Prüfen Sie das Feld: Wasser, Schädlinge, Nährstoffe.",
        "alert.ndmiLow.title": "💧 Wasserstress (geringe Feuchte)",
        "alert.ndmiLow.body": "Bestandesfeuchte (NDMI) {ndmi} — niedrig. Prüfen Sie den Bewässerungsbedarf.",
        "alert.ndviNbr.title": "🔥 Starke Veränderung (Brand/Seneszenz?)",
        "alert.ndviNbr.body": "NDVI und NBR sind gemeinsam stark gefallen — Brand, Ernte oder schnelles Abtrocknen.",
        "alert.vegAnomaly.title": "⚠️ NDVI unter der Feldnorm",
        "alert.vegAnomaly.body": "NDVI {latest} liegt unter dem üblichen Niveau dieses Feldes für diese Woche (p10 {p10}) — eine Anomalie."
    },
    "hu": {
        "alert.frost.title": "🥶 Fagyriasztás",
        "alert.heat.title": "🌡️ Hőstressz",
        "alert.wind.title": "💨 Erős szél",
        "alert.weather.title": "Időjárási riasztás",
        "alert.ndviDrop.title": "📉 A növényállomány romlik",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — állománystressz. Ellenőrizze a táblát: víz, kártevők, tápanyag.",
        "alert.ndmiLow.title": "💧 Vízstressz (alacsony nedvesség)",
        "alert.ndmiLow.body": "Állománynedvesség (NDMI) {ndmi} — alacsony. Ellenőrizze az öntözési igényt.",
        "alert.ndviNbr.title": "🔥 Éles változás (égés/öregedés?)",
        "alert.ndviNbr.body": "Az NDVI és az NBR együtt meredeken esett — égés, betakarítás vagy gyors száradás lehet.",
        "alert.vegAnomaly.title": "⚠️ Az NDVI a tábla normája alatt",
        "alert.vegAnomaly.body": "Az NDVI {latest} a tábla erre a hétre szokásos szintje (p10 {p10}) alatt van — anomália."
    },
    "it": {
        "alert.frost.title": "🥶 Allerta gelo",
        "alert.heat.title": "🌡️ Stress da caldo",
        "alert.wind.title": "💨 Vento forte",
        "alert.weather.title": "Allerta meteo",
        "alert.ndviDrop.title": "📉 La salute della coltura cala",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — stress della chioma. Controlla il campo: acqua, parassiti, nutrizione.",
        "alert.ndmiLow.title": "💧 Stress idrico (umidità bassa)",
        "alert.ndmiLow.body": "Umidità della coltura (NDMI) {ndmi} — bassa. Verifica se serve irrigare.",
        "alert.ndviNbr.title": "🔥 Cambiamento brusco (bruciatura/senescenza?)",
        "alert.ndviNbr.body": "NDVI e NBR sono crollati insieme: può essere bruciatura, raccolta o essiccazione rapida.",
        "alert.vegAnomaly.title": "⚠️ NDVI sotto la norma del campo",
        "alert.vegAnomaly.body": "NDVI {latest} è sotto il livello abituale del campo per questa settimana (p10 {p10}) — anomalia."
    },
    "pl": {
        "alert.frost.title": "🥶 Ostrzeżenie o przymrozku",
        "alert.heat.title": "🌡️ Stres cieplny",
        "alert.wind.title": "💨 Silny wiatr",
        "alert.weather.title": "Ostrzeżenie pogodowe",
        "alert.ndviDrop.title": "📉 Kondycja uprawy spada",
        "alert.ndviDrop.body": "NDVI {prior}→{latest}{pct} — stres łanu. Sprawdź pole: woda, szkodniki, odżywienie.",
        "alert.ndmiLow.title": "💧 Stres wodny (niska wilgotność)",
        "alert.ndmiLow.body": "Wilgotność łanu (NDMI) {ndmi} — niska. Sprawdź potrzebę nawadniania.",
        "alert.ndviNbr.title": "🔥 Gwałtowna zmiana (spalenie/starzenie?)",
        "alert.ndviNbr.body": "NDVI i NBR spadły razem gwałtownie — możliwe spalenie, zbiór lub szybkie wysychanie.",
        "alert.vegAnomaly.title": "⚠️ NDVI poniżej normy pola",
        "alert.vegAnomaly.body": "NDVI {latest} jest poniżej zwykłego poziomu tego pola w tym tygodniu (p10 {p10}) — anomalia."
    }
}


def render(code, params, locale, fallback: str) -> str:
    """The alert text in the recipient's language, or the stored prose when we cannot do better.

    `fallback` is load-bearing, not politeness: rows written before 0057 carry no code at all, and
    the pest producer still has none. A missing code, an unknown locale and a params mismatch all
    end in the same place — the message the rule engine already wrote — because an alert in the
    wrong language is still far better than an alert that never arrives.
    """
    if not code:
        return fallback
    loc = (locale or "az")[:2].lower()
    for cand in (loc, "en", "az"):
        table = ALERT_COPY.get(cand)
        if table and code in table:
            try:
                return table[code].format(**(params or {}))
            except (KeyError, IndexError, ValueError):
                # Params drifted from the template — send the fallback rather than a half-rendered
                # sentence with a literal {ndmi} sitting in it.
                return fallback
    return fallback
