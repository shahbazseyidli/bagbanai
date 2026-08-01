// German privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyDe: PrivacyDoc = {
  title: "Datenschutzerklärung",
  lead:
    "Agradex ist eine Plattform, die Anbauflächen mit Satellitenbildern, Wetterdaten und " +
    "künstlicher Intelligenz überwacht. Diese Seite ist keine Rechtsvorlage — sie erklärt so, wie " +
    "es ist, was das System über Sie erfasst, wo es das speichert, an wen es geht und was " +
    "passiert, wenn Sie Ihr Konto schließen.",
  summary: [
    "Alle Daten liegen in der EU — auf einem einzigen Server in Helsinki (Finnland), in einer Postgres-Datenbank, die wir selbst betreiben.",
    "Es gibt keinen Werbetracker, kein Analyse-Pixel und kein Drittanbieter-Cookie; deshalb gibt es auch kein Einwilligungsbanner.",
    "Zur KI gehen Felddaten, keine Kontodaten: Name, E-Mail und Passwort-Hash werden nie an den Modellanbieter übermittelt.",
    "Die einzige wiederkehrende E-Mail ist die Wochenübersicht (mittwochs); ein Klick genügt zum Abbestellen.",
    "Das Schließen des Kontos löscht die Person, behält aber Ihre Einträge — sie zeigen dann auf niemanden mehr.",
  ],
  sections: {
    scope: {
      heading: "Was dieses Dokument abdeckt",
      body: [
        {
          kind: "p",
          text:
            "Diese Erklärung gilt für agradex.com (die Marketing-Seite), app.agradex.com (die " +
            "Anwendung) und die installierbare Web-App (PWA). Alle laufen auf demselben Server " +
            "gegen dieselbe Datenbank.",
        },
        {
          kind: "p",
          text:
            "Eines gleich vorweg, der Ehrlichkeit halber: Agradex befindet sich noch in der " +
            "Entwicklung, und hinter dem Produkt wurde bisher keine eingetragene juristische " +
            "Person (Firmenname, Registernummer, Sitz) benannt. Dieses Dokument nennt daher " +
            "keinen formalen Verantwortlichen. Jede Anfrage zu Ihren Daten erreicht das Team, " +
            "das die Plattform betreibt, unter info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Das Dokument betrifft nur unser System. Links, die Sie von Agradex wegführen (etwa " +
            "zu den offiziellen Seiten der Satellitenquellen), haben eigene Datenschutzregeln.",
        },
      ],
    },
    "account-data": {
      heading: "Kontodaten",
      body: [
        {
          kind: "p",
          text:
            "Das speichern wir bei der Registrierung und wenn Sie Ihre Einstellungen ändern:",
        },
        {
          kind: "ul",
          items: [
            "E-Mail-Adresse — sie ist Ihre Anmeldekennung und eindeutig.",
            "Passwort — ausschließlich als bcrypt-Hash. Das Klartextpasswort speichern wir nicht und können es nicht wiederherstellen.",
            "Name (optional), Oberflächensprache, Land und Region.",
            "Rolle: Landwirt, Labor, beratender Agronom oder Lieferant.",
            "Flächeneinheit (Hektar / Dönüm / Sotka) — ohne eigene Wahl wird sie aus dem Land abgeleitet.",
            "Benachrichtigungseinstellungen (welche Kanäle Sie abgeschaltet haben) und das Abmeldekennzeichen für die E-Mail-Übersicht.",
            "Für jedes Gerät, auf dem Sie Push-Benachrichtigungen einschalten, das vom Browser vergebene Abonnement (Zustelladresse, Verschlüsselungsschlüssel, Browserkennung) — beim Abbestellen wird der Eintrag gelöscht.",
            "Einstellung zur Sichtbarkeit des Namens — ob Ihr Name anderen Nutzern gezeigt wird.",
            "Die Antworten der kurzen Umfrage auf der Marketing-Seite (Kultur, Land, Region, Hauptproblem, Bedarf), falls Sie sie vor der Registrierung ausgefüllt haben.",
            "Status der E-Mail-Bestätigung und ein temporärer 6-stelliger Code — der Code wird direkt nach der Verwendung gelöscht.",
            "Zeitpunkt der letzten Aktivität — höchstens einmal pro Stunde geschrieben, nur um zu wissen, ob das Konto noch genutzt wird.",
          ],
        },
        {
          kind: "p",
          text:
            "In der Datenbank gibt es eine Spalte für die Telefonnummer, aber das " +
            "Registrierungsformular fragt sie nie ab — praktisch wird also keine Telefonnummer " +
            "erhoben. Karten- oder Zahlungsdaten werden überhaupt nicht erhoben (siehe " +
            "„Pakete und Zahlung“ in den Nutzungsbedingungen).",
        },
      ],
    },
    "field-data": {
      heading: "Feld- und Betriebsdaten",
      body: [
        { kind: "p", text: "Der eigentliche Inhalt der Plattform sind Ihre Betriebsdaten:" },
        {
          kind: "ul",
          items: [
            "Die auf der Karte gezeichnete Feldgrenze und die Fläche (in der Datenbank immer in Hektar — die Einheitswahl betrifft nur die Anzeige).",
            "Namen von Feld, Betrieb und Organisation.",
            "Der Feldpass: Kultur, Sorte, Saat- und Erntetermine, Bodenart und pH-Wert, Bewässerungsverfahren, Entwicklungsstadium, Vorfrucht, freie Notizen.",
            "Feldbegehungen, hochgeladene Fotos, Feldarbeiten, Ertragsaufzeichnungen, Aufgaben und Saisons.",
            "Einträge aus Journal, Verkauf, Lager und Technik sowie hochgeladene Dokumente.",
            "Bodenlaboranalysen — der hochgeladene Scan und die per OCR daraus gelesenen Werte.",
          ],
        },
        { kind: "p", text: "Darüber hinaus berechnet und speichert das System:" },
        {
          kind: "ul",
          items: [
            "Statistiken zu 9 Indizes (NDVI, NDMI und weitere) je Satellitenszene und auf Ihr Feld zugeschnittene Rasterdateien.",
            "Wetterverlauf, den Feld-Gesundheitswert, die Temperatursumme (GDD).",
            "Den Text der KI-Empfehlung, die Eingangsdaten, aus denen sie entstand, welches Modell sie schrieb und in welcher Sprache.",
            "KI-Chatnachrichten, Benachrichtigungen, Tokens von Freigabelinks.",
            "Token- und Kostenerfassung der KI-Nutzung.",
            "Sieben festgelegte Produktereignisse (Umfrage gestartet, Feld angelegt, Kultur gesetzt, erste Szene gesehen, Empfehlung gelesen, Telegram verbunden, Checkliste abgeschlossen) — diese Liste steht fest im Code; nichts anderes wird nachverfolgt.",
          ],
        },
      ],
    },
    storage: {
      heading: "Wo die Daten liegen",
      body: [
        {
          kind: "p",
          text:
            "Alles liegt auf einem einzigen Hetzner-Server in Helsinki (Finnland, Europäische " +
            "Union). Die Datenbank ist unsere eigene Installation von Postgres 16 + PostGIS, die " +
            "auf dieser Maschine in Docker läuft. Hochgeladene Dateien liegen auf der lokalen " +
            "Platte desselben Servers, die Satellitenraster in einem eigenen Ordner auf " +
            "derselben Platte.",
        },
        {
          kind: "p",
          text:
            "Wir nutzen keine verwaltete Fremddatenbank (etwa Supabase) und keinen fremden " +
            "Objektspeicher (S3 und Ähnliches) — das ist eine bewusste Architekturentscheidung.",
        },
        {
          kind: "p",
          text:
            "Sicherungskopien liegen auf einem Server desselben Teams, innerhalb der " +
            "Europäischen Union. Für Sicherungen ist keine formale Aufbewahrungsfrist " +
            "konfiguriert.",
        },
      ],
    },
    processors: {
      heading: "An wen die Daten gehen",
      body: [
        {
          kind: "p",
          text:
            "Dies sind die externen Dienste, die die Plattform nutzt. Die Liste ist vollständig " +
            "— wir geben Ihre Daten nicht an Werbenetzwerke, Datenhändler oder " +
            "Marketingplattformen weiter und verkaufen sie nicht.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "Anthropic (Claude)",
              v:
                "KI-Empfehlung, Chat, Fotodiagnose und die Recherche-Ebene. Es gehen: Feldname, " +
                "Fläche, Kulturpass (inklusive Notizen), Indextrends, Wetter, letzte " +
                "Beobachtungen, Arbeiten, offene Aufgaben, letzte Ertragsaufzeichnungen, die " +
                "Zusammenfassung der vorherigen Empfehlung, die letzten Chatbeiträge und das zur " +
                "Diagnose gesendete Foto. Es gehen nicht: E-Mail, Name, Passwort-Hash.",
            },
            {
              k: "Resend",
              v:
                "E-Mail-Zustellung — Empfängeradresse, Anredename und Nachrichtentext. Falls " +
                "konfiguriert, dient SMTP als Ausweichweg.",
            },
            {
              k: "Open-Meteo",
              v: "Die Mittelpunktskoordinaten des Feldes — für die 7-Tage-Prognose und die Verdunstung (ET0).",
            },
            { k: "ISRIC SoilGrids", v: "Die Koordinaten des Feldes, um ein Bodenprofil abzurufen." },
            {
              k: "FAOSTAT",
              v: "Ertragsstatistik auf Länderebene. Über Sie geht nichts hinaus.",
            },
            {
              k: "EPPO",
              v:
                "Nur der Kulturname, und nur wenn ein API-Schlüssel hinterlegt ist. Derzeit ist " +
                "keiner hinterlegt, es geht also überhaupt keine Anfrage an diesen Dienst.",
            },
            {
              k: "NASA Earthdata (HLS) und Copernicus Sentinel-2",
              v:
                "Daten fließen zu uns, nicht von Ihnen weg: Bei der Szenensuche werden das " +
                "umschließende Rechteck des Feldes und ein Datumsbereich gesendet. Konto, Name " +
                "und Adresse werden nicht übertragen.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "Der Ortsname, den Sie in die Kartensuche tippen (aus dem Browser), und die " +
                "Umwandlung einer Koordinate in einen Ortsnamen (vom Server).",
            },
            {
              k: "Kartenhintergrund-Anbieter",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap und " +
                "Gelände-Kacheln werden direkt in Ihren Browser geladen — diese Server sehen " +
                "also Ihre IP-Adresse und welchen Ausschnitt Sie betrachten.",
            },
            {
              k: "Push-Dienst Ihres Browsers",
              v:
                "Wenn Sie Push-Benachrichtigungen einschalten, wird die Nachricht über den " +
                "Push-Dienst Ihres Browsers zugestellt (je nach Browser Google, Mozilla oder " +
                "Apple). Der Text ist dabei verschlüsselt, der Dienst sieht aber die " +
                "Abonnementadresse Ihres Geräts.",
            },
            {
              k: "Google (Anmeldung mit Google)",
              v:
                "Nur wenn Sie selbst „Mit Google fortfahren“ drücken. Was zu Google geht: Ihr Browser (also Ihre IP-Adresse) und bei welcher App Sie sich anmelden. Was Google uns zurückgibt: die dauerhafte Kennung des Kontos, die E-Mail-Adresse, ob sie bestätigt ist, und Ihren Anzeigenamen. Über Ihre Felder, Notizen und Satellitendaten geht nichts an Google. Auf unseren Seiten wird kein Google-Skript geladen — die Schaltfläche ist ein gewöhnlicher Link, daher sieht Google bis zum Klick nicht, dass Sie auf unserer Seite sind.",
            },
            {
              k: "Telegram",
              v:
                "Nur wenn Sie den Bot selbst verbinden. Derzeit ist kein Bot-Token hinterlegt, " +
                "der Kanal ruht.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Künstliche Intelligenz",
      body: [
        {
          kind: "p",
          text:
            "Empfehlung, Chat und Fotodiagnose laufen über die Claude-Modelle von Anthropic. Der " +
            "an das Modell gesendete Kontext betrifft das Feld, nicht Ihre Identität — der Code, " +
            "der ihn zusammenstellt, liest keine Spalte der Kontentabelle.",
        },
        {
          kind: "p",
          text:
            "Tokenzahl und geschätzte Kosten jedes KI-Aufrufs werden in unserer eigenen Datenbank " +
            "erfasst; das dient der Kontingentabrechnung und der Kostenkontrolle.",
        },
        {
          kind: "p",
          text:
            "Wird der KI-Schlüssel aus der Konfiguration entfernt, degradiert das System sauber: " +
            "Es entstehen keine Empfehlungen, der Chat antwortet nicht, alles Übrige läuft weiter.",
        },
        {
          kind: "p",
          text:
            "Antworten der KI sind eine automatische Analyse und können falsch sein. Ihre " +
            "Grenzen sind in den Nutzungsbedingungen gesondert beschrieben.",
        },
      ],
    },
    email: {
      heading: "E-Mail",
      body: [
        {
          kind: "p",
          text:
            "Die einzige wiederkehrende Nachricht ist die Wochenübersicht — jeden Mittwoch um " +
            "07:00 Uhr Baku-Zeit, und technisch kann sie nicht öfter als einmal wöchentlich " +
            "verschickt werden.",
        },
        {
          kind: "p",
          text:
            "Daneben gibt es nur transaktionale Nachrichten: den Bestätigungscode, die " +
            "Willkommensnachricht und den Bericht, wenn Ihr Feld zum ersten Mal fertig ist. " +
            "Jede davon wird höchstens einmal in 24 Stunden gesendet.",
        },
        {
          kind: "p",
          text:
            "Am Ende jeder Übersicht steht ein Abmeldelink mit einem Klick — ohne Anmeldung. " +
            "Dieselbe Einstellung können Sie auch auf der Kontoseite abschalten. Beachten Sie: " +
            "Auch nach der Abmeldung kommen transaktionale Nachrichten (etwa der " +
            "Bestätigungscode) weiterhin an, weil das Konto ohne sie nicht funktioniert.",
        },
        {
          kind: "p",
          text:
            "Wir versenden keine Werbung und geben Ihre Adresse an niemanden weiter. Der " +
            "Ehrlichkeit halber: Der Text der Übersicht erreicht Leserinnen und Leser mit " +
            "Türkisch, Deutsch, Ungarisch, Italienisch und Polnisch derzeit auf Englisch — die " +
            "Übersetzung ist noch nicht fertig.",
        },
      ],
    },
    cookies: {
      heading: "Cookies und Browserspeicher",
      body: [
        { kind: "p", text: "Es gibt drei Cookies, alle funktional:" },
        {
          kind: "ul",
          items: [
            "bagban_session — die Anmeldesitzung. httpOnly (JavaScript kann es nicht lesen), SameSite=Lax, über https Secure, 7 Tage. Für nichts anderes verwendet.",
            "bagban_locale — merkt sich die gewählte Sprache, 1 Jahr.",
            "bagban_oauth_state — entsteht nur, wenn Sie \u201eMit Google fortfahren\u201c drücken, und nur zum Schutz dieser Anmeldung (CSRF). httpOnly, SameSite=Lax, Secure, 10 Minuten; wird direkt nach der Anmeldung gelöscht.",
          ],
        },
        {
          kind: "p",
          text:
            "Das war's. Im Code gibt es kein Google Analytics, keinen Google Tag Manager, kein " +
            "Plausible, Hotjar, Mixpanel, PostHog, kein Facebook-Pixel und keinen anderen " +
            "Tracker. Genau deshalb zeigt die Seite kein Cookie-Einwilligungsbanner — es gibt " +
            "nichts zu fragen.",
        },
        {
          kind: "p",
          text:
            "Getrennt davon liegen im lokalen Speicher Ihres Browsers einige " +
            "Oberflächeneinstellungen: der Kartenhintergrund, der Datensparmodus, die " +
            "Offline-Warteschlange, der Stand der Einstiegs-Checkliste und die Antworten der " +
            "Umfrage vor der Registrierung. Sie bleiben auf Ihrem Gerät; die Umfrageantworten " +
            "gehen nur zusammen mit der Registrierungsanfrage an den Server.",
        },
      ],
    },
    visibility: {
      heading: "Wer Ihre Daten sieht",
      body: [
        {
          kind: "ul",
          items: [
            "Andere Mitglieder Ihrer Organisation — sie sehen deren Felder gemäß ihrer Rolle; die Berechtigung wird bei jeder Anfrage auf dem Server geprüft.",
            "Ein Freigabelink (/s/…) zeigt jedem, der ihn hat, eine bewusst reduzierte, nur lesbare Feldkarte. Sie können den Link jederzeit widerrufen.",
            "Feldzugriff — wenn Sie ein einzelnes Feld für eine namentlich genannte Person freigeben, sieht sie nur den Bericht zu diesem Feld (nicht Ihre anderen Felder, Ihren Betrieb oder Ihr Team). Sie können den Zugriff jederzeit entziehen, die Person selbst ebenso.",
            "Schalten Sie die Sichtbarkeit des Namens ab, wird Ihr Name auf allen für andere sichtbaren Oberflächen durch ein Pseudonym „user_…“ ersetzt.",
            "Vergleichs- und Benchmark-Werte werden nicht ohne eine Gruppe von mindestens 5 anderen Feldern berechnet und nennen nie ein bestimmtes Feld oder einen bestimmten Betrieb.",
            "Das Team, das die Plattform betreibt — über ein Administrationspanel sieht es Nutzung, KI-Kosten und Konten aller Organisationen und hat als Serverbetreiber technischen Zugang zur Datenbank.",
          ],
        },
      ],
    },
    retention: {
      heading: "Aufbewahrung und Löschung",
      body: [
        {
          kind: "p",
          text:
            "Ein Feld zu löschen ist ein „weiches“ Löschen: Es verschwindet aus der Liste und " +
            "lässt sich wiederherstellen, wird aber nicht physisch aus der Datenbank entfernt.",
        },
        {
          kind: "p",
          text:
            "Das Konto zu schließen (die Schaltfläche auf der Kontoseite) ist unwiderruflich und " +
            "bewirkt genau Folgendes:",
        },
        {
          kind: "ul",
          items: [
            "Zur Bestätigung müssen Sie Ihre eigene E-Mail-Adresse von Hand eintippen.",
            "Hat eine Organisation, die Ihnen gehört, noch andere aktive Mitglieder, wird der Vorgang abgelehnt — übergeben Sie die Organisation zuerst.",
            "Alle Mitgliedschaften werden gelöscht, der Zugang endet also sofort.",
            "Felder von Organisationen, in denen Sie das einzige Mitglied waren, werden weich gelöscht.",
            "Die E-Mail-Adresse wird durch eine nicht zustellbare interne Adresse ersetzt — das gibt Ihre echte Adresse frei, sodass Sie sich damit erneut registrieren können.",
            "Name, Land, Region, Umfrageantworten und Benachrichtigungseinstellungen werden geleert; der Passwort-Hash wird durch einen Wert ersetzt, den kein Passwort erzeugen kann; das Konto wird deaktiviert.",
          ],
        },
        {
          kind: "p",
          text:
            "Was bleibt: die von Ihnen geschriebenen Einträge — Felder, Grenzen, Beobachtungen, " +
            "Journalzeilen, Erträge. Der Grund ist technisch, und wir verschweigen ihn nicht: " +
            "Fünfzehn Tabellen verweisen auf den Nutzer, und ein kaskadierendes Löschen würde die " +
            "Geschichte eines ganzen Betriebs vernichten, weil eine Mitarbeiterin gegangen ist. " +
            "Diese Einträge bleiben, sind aber keiner identifizierbaren Person mehr zugeordnet. " +
            "Nutzungsabrechnung, E-Mail-Versandprotokoll und Ereigniszeilen behalten eine " +
            "Nutzerkennung, die auf niemanden mehr verweist.",
        },
        {
          kind: "p",
          text: "Für Satelliten- und abgeleitete Daten gibt es keinen automatischen Ablauf.",
        },
      ],
    },
    rights: {
      heading: "Ihre Rechte und was heute möglich ist",
      body: [
        { kind: "p", text: "All das erledigen Sie sofort selbst auf der Kontoseite:" },
        {
          kind: "ul",
          items: [
            "Passwort ändern.",
            "Name, Land und Region bearbeiten.",
            "Oberflächensprache und Flächeneinheit ändern.",
            "Die Benachrichtigungsmatrix (Kategorie × Kanal) einstellen.",
            "Die Sichtbarkeit des Namens abschalten.",
            "Die E-Mail-Übersicht abbestellen.",
            "Das Konto schließen.",
          ],
        },
        {
          kind: "p",
          text:
            "Feldgrenzen lassen sich im Bildschirm zur Feldanlage als GeoJSON oder KML " +
            "herunterladen.",
        },
        {
          kind: "p",
          text:
            "Einen automatischen Export des gesamten Kontos gibt es noch nicht — das verschweigen " +
            "wir nicht. Wenn Sie eine Kopie Ihrer Daten oder deren vollständige Löschung " +
            "wünschen, schreiben Sie an info@agradex.com; wir bereiten das von Hand vor.",
        },
      ],
    },
    changes: {
      heading: "Änderungen",
      body: [
        {
          kind: "p",
          text:
            "Dieses Dokument beschreibt das System, also muss es sich mit dem System ändern. Das " +
            "Datum der letzten Aktualisierung steht oben auf der Seite.",
        },
        {
          kind: "p",
          text:
            "Wesentliche Änderungen daran, was erfasst wird oder wohin es geht, kündigen wir " +
            "vorab an — über eine Benachrichtigung in der App oder die Wochenübersicht.",
        },
      ],
    },
  },
};
