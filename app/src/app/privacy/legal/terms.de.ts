// German terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the de
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsDe: TermsDoc = {
  title: "Nutzungsbedingungen",
  lead:
    "Diese Seite erklärt, was Agradex verspricht und — wichtiger — was nicht. Sie ist keine " +
    "Rechtsvorlage: Alles hier Geschriebene entspricht dem heutigen Stand des Produkts.",
  summary: [
    "Agradex ist ein Werkzeug zur Entscheidungsunterstützung; es ersetzt weder Agronomin, Labor noch den Gang aufs Feld.",
    "KI-Empfehlungen sind eine automatische Analyse und können falsch sein — die Entscheidung liegt bei Ihnen.",
    "Derzeit ist kein Zahlungssystem angebunden: Es werden keine Kartendaten erhoben und ohne Ankündigung nichts abgebucht.",
    "Ihre Betriebsdaten gehören Ihnen; wir verkaufen sie nicht.",
    "Der Dienst läuft auf einem einzigen Server, ohne SLA und ohne garantierte Verfügbarkeit.",
  ],
  sections: {
    service: {
      heading: "Was der Dienst ist",
      body: [
        {
          kind: "p",
          text:
            "Agradex ist eine Plattform für Bestandsüberwachung und Betriebsführung, aufgebaut " +
            "auf Satellitenbildern (Sentinel-2 und das harmonisierte Landsat–Sentinel-Produkt), " +
            "Wettervorhersagen, agronomischen Modellen und künstlicher Intelligenz. Zum Dienst " +
            "gehören die Website, die Anwendung und die installierbare Web-App (PWA).",
        },
        {
          kind: "p",
          text:
            "Hinter der Plattform ist bislang keine eingetragene juristische Person benannt, " +
            "daher nennt dieses Dokument weder Firmennamen noch Registernummer noch anwendbares " +
            "Recht. Wir schreiben das offen, damit kein falscher Eindruck davon entsteht, was " +
            "dieses Dokument ist. Kontakt: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Mit der Nutzung des Dienstes akzeptieren Sie diese Bedingungen. Wenn Sie nicht " +
            "einverstanden sind, legen Sie kein Konto an oder schließen Sie Ihr bestehendes.",
        },
      ],
    },
    account: {
      heading: "Konto",
      body: [
        {
          kind: "ul",
          items: [
            "Eine E-Mail-Adresse entspricht einem Konto; die E-Mail ist zugleich Ihre Anmeldekennung.",
            "Nach der Registrierung wird die Adresse mit einem 6-stelligen Code bestätigt.",
            "Der Schutz Ihrer Zugangsdaten liegt bei Ihnen; Handlungen aus Ihrem Konto gelten als Ihre.",
            "Sie müssen zutreffende Angaben machen — besonders Feldgrenze und Kultur, denn die gesamte Auswertung baut darauf auf.",
            "Rechte innerhalb einer Organisation werden nach Rolle vergeben; die Eigentümerin kann Mitglieder hinzufügen und entfernen.",
            "Sie können Ihr Konto jederzeit schließen. Was dabei geschieht, steht Schritt für Schritt in der Datenschutzerklärung.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Grenzen der künstlichen Intelligenz",
      body: [
        {
          kind: "p",
          text:
            "Unter jeder KI-Empfehlung steht genau dieser Satz: „Diese Empfehlungen sind eine " +
            "automatische Analyse auf Basis von Satelliten- und Felddaten; vor der Entscheidung " +
            "vor Ort prüfen.“ Das ist keine Formalie, sondern buchstäblich die Grenze des " +
            "Dienstes.",
        },
        {
          kind: "ul",
          items: [
            "Die KI kann irren: Ein Feld unter Wolken kann sie falsch lesen; ist der Feldpass unvollständig, ist es das Ergebnis auch.",
            "Die Fotodiagnose nennt nie ein bestimmtes Pflanzenschutzmittel oder eine Dosis — sie verweist auf die Liste zugelassener Mittel und auf eine Agronomin.",
            "Eine Empfehlung ist keine tierärztliche, pflanzengesundheitliche, rechtliche oder finanzielle Beratung.",
            "Satellitenindizes und Modelle ersetzen keine Laboranalyse, keine Bodenprobe und keinen Gang aufs Feld.",
            "Lesen Sie vor jeder Anwendung eines chemischen Mittels immer das Etikett und die örtlichen Vorschriften.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Zulässige Nutzung",
      body: [
        { kind: "p", text: "Nicht erlaubt ist Folgendes:" },
        {
          kind: "ul",
          items: [
            "Automatisierte Massenanfragen zu senden, Inhalte abzugreifen (Scraping) oder den Dienst mit künstlicher Last lahmzulegen.",
            "Ohne Erlaubnis auf fremde Konten zuzugreifen, Sicherheitsmechanismen zu umgehen oder Schadcode einzuschleusen.",
            "Daten hochzuladen, die Ihnen nicht gehören und die Sie nicht teilen dürfen (etwa Felddokumente eines anderen Betriebs).",
            "Rechtswidrige, gefälschte oder fremde Rechte verletzende Inhalte einzustellen.",
            "Den Dienst oder die KI-Antworten ohne Erlaubnis als Dienstleistung an Dritte weiterzuverkaufen.",
            "Den Code oder die Modelle der Plattform zurückzuentwickeln.",
          ],
        },
        {
          kind: "p",
          text:
            "Verstöße können zur Sperrung des Kontos führen. In diesem Fall werden wir versuchen, " +
            "den Grund zu erklären.",
        },
      ],
    },
    packages: {
      heading: "Pakete und Zahlung",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Kostenlos",
              v: "1 Feld · 1 KI-Empfehlung pro Monat · kein Chat · Satellitenindizes und Wetter inbegriffen.",
            },
            {
              k: "Pro — 10 AZN/Monat",
              v: "5 Felder · 8 KI-Empfehlungen pro Monat · 50 Chatnachrichten pro Monat · Feldpass, Bewässerung und Spritzfenster.",
            },
            {
              k: "Business — 25 AZN/Monat",
              v: "Praktisch unbegrenzt viele Felder · 30 Empfehlungen pro Monat · 300 Chatnachrichten · 30 Fotodiagnosen · Benchmarks und Berichte.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Eine neu angelegte Organisation startet mit einem einmonatigen Pro-Test und fällt " +
            "danach von selbst auf das kostenlose Paket zurück — es gibt keine automatische " +
            "Zahlung.",
        },
        {
          kind: "p",
          text:
            "Der wichtigste Hinweis: Die Zahlung ist noch nicht angebunden. Im Code gibt es " +
            "keinen Zahlungsanbieter, es werden keine Karten- oder Bankdaten erhoben, und Pakete " +
            "werden derzeit von Hand vergeben. Wenn bezahlte Pläne starten, kündigen wir das " +
            "vorher an; ohne Ankündigung wird niemandem etwas berechnet.",
        },
        { kind: "p", text: "Preise werden in AZN angegeben." },
      ],
    },
    quotas: {
      heading: "Kontingente",
      body: [
        {
          kind: "p",
          text:
            "KI-Empfehlung, Chat und Fotodiagnose sind je Paket monatlich begrenzt. Ist das " +
            "Kontingent erschöpft, wird die Anfrage abgelehnt und Ihnen der Grund genannt; im " +
            "Folgemonat wird es zurückgesetzt.",
        },
        {
          kind: "p",
          text:
            "Die Grenzen decken die tatsächlichen KI-Kosten. Wir behalten uns vor, Nutzung " +
            "einzuschränken, die das System ungewöhnlich belastet.",
        },
        {
          kind: "p",
          text:
            "Wie schnell Satellitendaten verarbeitet werden, hängt von Dingen ab, die wir nicht " +
            "steuern: wie oft der Satellit Ihr Feld überfliegt, und von der Bewölkung.",
        },
      ],
    },
    ownership: {
      heading: "Wem die Daten gehören",
      body: [
        {
          kind: "p",
          text:
            "Feldgrenzen, Passdaten, Notizen, Fotos, Journalzeilen — alles Ihres. Sie räumen uns " +
            "das Recht ein, sie zur Erbringung des Dienstes zu verarbeiten (speichern, " +
            "verarbeiten, auswerten, Ihnen anzeigen); mehr nicht.",
        },
        {
          kind: "ul",
          items: [
            "Wir verkaufen Ihre Daten nicht und geben sie nicht zu Werbezwecken weiter.",
            "Aggregierte Werte (Vergleiche, Benchmarks) werden nur über Gruppen von mindestens 5 Feldern berechnet und weisen auf kein bestimmtes Feld hin.",
            "Code, Design, Indexmodelle und Inhalte der Plattform gehören uns.",
            "Sie sind dafür verantwortlich, dass die hochgeladenen Inhalte Ihnen gehören oder Sie zum Hochladen berechtigt sind.",
          ],
        },
      ],
    },
    availability: {
      heading: "Verfügbarkeit",
      body: [
        {
          kind: "p",
          text:
            "Der Dienst läuft auf einem einzigen Server und wird nach bestem Bemühen " +
            "bereitgestellt. Es gibt keine garantierte Verfügbarkeit (kein SLA); geplante und " +
            "ungeplante Ausfälle sind möglich.",
        },
        {
          kind: "p",
          text:
            "Satellitendaten sind nicht lückenlos: Wegen Bewölkung und Überflugrhythmus kann es " +
            "tagelang kein neues Bild geben. Das ist kein Fehler, sondern liegt an der Umlaufbahn.",
        },
        {
          kind: "p",
          text:
            "Wir können Funktionen hinzufügen, ändern oder entfernen. Entfernen wir etwas, das " +
            "Ihnen wichtig ist, versuchen wir, das vorher anzukündigen.",
        },
      ],
    },
    liability: {
      heading: "Haftung",
      body: [
        {
          kind: "p",
          text:
            "Agronomische Entscheidungen sind Ihre. Bewässern, düngen, spritzen, ernten — jede " +
            "davon trifft die Person, die das Feld kennt, und Agradex übernimmt für das Ergebnis " +
            "keine Verantwortung.",
        },
        {
          kind: "p",
          text:
            "Konkret: Entstehen durch Arbeiten, die aufgrund einer Empfehlung der Plattform " +
            "ausgeführt (oder unterlassen) wurden, Ernteverlust, Ertragsrückgang, höhere Kosten " +
            "oder ein anderer Schaden, übernehmen wir dafür keine Haftung.",
        },
        {
          kind: "p",
          text:
            "Der Dienst wird „wie besehen“ bereitgestellt; wir garantieren nicht, dass die Daten " +
            "vollständig oder zutreffend sind.",
        },
        {
          kind: "p",
          text:
            "Dieser Abschnitt schränkt keine Rechte ein, die Ihnen zwingendes örtliches Recht " +
            "gewährt.",
        },
      ],
    },
    changes: {
      heading: "Änderung der Bedingungen",
      body: [
        {
          kind: "p",
          text:
            "Mit dem Produkt ändern sich auch diese Bedingungen. Das Datum oben auf der Seite " +
            "zeigt die letzte Bearbeitung.",
        },
        {
          kind: "p",
          text:
            "Wesentliche Änderungen — etwa den Start der Bezahlfunktion — kündigen wir vorab per " +
            "Benachrichtigung in der App oder per E-Mail an. Nutzen Sie den Dienst danach weiter, " +
            "akzeptieren Sie die neuen Bedingungen.",
        },
      ],
    },
    contact: {
      heading: "Kontakt",
      body: [
        {
          kind: "p",
          text:
            "Fragen, Beschwerden, die Bitte um eine Kopie Ihrer Daten oder um deren Löschung — " +
            "alles an eine Adresse: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Formale Angaben zur juristischen Person (Firmenname, Registrierung, Anschrift, " +
            "anwendbares Recht) existieren noch nicht; dieser Abschnitt wird aktualisiert, sobald " +
            "es sie gibt.",
        },
      ],
    },
  },
};
