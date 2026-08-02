import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "free-ndvi-map",
  locale: "de",
  title: "Kostenlose NDVI-Karte: 3 echte Wege, das eigene Feld zu beobachten",
  description:
    "NDVI-Karte kostenlos: Copernicus Browser, OneSoil und Agradex im ehrlichen Vergleich — Stärken, Grenzen und für wen welcher Weg passt. Keine Verkaufsprosa.",
  lead:
    "Um das eigene Feld per Satellit zu beobachten, brauchen Sie kein Budget: Die Sentinel-2-Daten sind offen, und darauf bauen mehrere kostenlose Werkzeuge auf. Drei Wege funktionieren wirklich — der offizielle Browser für die Rohdaten, eine bekannte internationale App und unsere eigene Plattform. Wir beschreiben alle drei ehrlich, einschließlich der Frage, für wen welcher passt.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "1. Copernicus Browser — die Quelle selbst",
      paragraphs: [
        "Der offizielle Browser des europäischen Copernicus-Programms öffnet jede Sentinel-2-Szene weltweit, legt eine NDVI-Ebene darüber, stellt zwei Termine nebeneinander und blättert durch das komplette Archiv zurück bis 2015. Er ist vollständig kostenlos und die erste Hand der Daten — mehr Kontrolle über die Rohdaten bietet kein anderes Gratis-Werkzeug.",
        "Die Grenze: Das Werkzeug ist für Fachanwender gebaut. Es speichert keine Feldgrenze, die Wolkenmaske ist Ihr Problem, und die Frage „was bedeutet dieser Wert für meinen Bestand?“ beantwortet es nicht. Für einen einzelnen Schlag ist die wöchentliche Handrunde machbar; bei zehn Schlägen wird sie zur Halbtagsaufgabe.",
      ],
    },
    {
      heading: "2. OneSoil — die bekannte internationale App",
      paragraphs: [
        "OneSoil war über Jahre komplett kostenlos und für Millionen Betriebe der erste Kontakt mit Feldgrenze und NDVI. Die aufgeräumte Oberfläche und die Mobile App sind die Stärke.",
        "Zu wissen ist: 2026 hat die Mobile App auf ein Freemium-Modell umgestellt — der kostenlose Teil ist schmaler geworden, ein Teil der Funktionen liegt hinter dem Abo. Die Hinweisebene bleibt zudem allgemein gehalten; eine Einordnung für den konkreten Schlag ersetzt sie nicht. Für den schnellen NDVI-Blick zwischendurch bleibt sie dennoch eine solide Wahl.",
      ],
    },
    {
      heading: "3. Agradex — unser Weg: Karte plus Einordnung",
      paragraphs: [
        "Im kostenlosen Tarif von Agradex stecken die Satellitenkarte des Feldes (neun Indizes, NDVI eingeschlossen), ein Zustandswert von 0 bis 100 und Agrarwetter. Die Feldgrenze zeichnen Sie direkt auf der Karte — ohne Flurstücksnummern, ohne Koordinaten. Für die KI-Agronom-Beratung gibt es einen Gratismonat, ohne Kreditkarte.",
        "Unser Unterschied liegt in der Haltung: Wir zeigen nicht nur die Karte und überlassen Ihnen die Deutung. Die Oberfläche gibt es in 9 Sprachen, Deutsch eingeschlossen; neben jedem Index steht eine Erklärung in einfachen Worten, und auch bewölkte Überflüge werden offen angezeigt, damit „warum kommt kein Bild?“ nie unbeantwortet bleibt. Vor der Registrierung können Sie ein Demofeld ansehen — ein reales Feld mit realem Satellitenstrom.",
        "Ehrlich auch hier: Nach dem Gratismonat gehört die tiefergehende KI-Beratung zum Bezahltarif. Satellitenkarte, Zustandswert und Wetter bleiben dauerhaft kostenlos.",
      ],
    },
    {
      heading: "Welcher Weg für wen?",
      table: {
        headers: ["Bedarf", "Passende Wahl"],
        rows: [
          ["Rohszenen, wissenschaftliche Arbeit, volle Kontrolle", "Copernicus Browser"],
          ["Internationale App-Erfahrung, schneller NDVI-Blick", "OneSoil"],
          ["Einordnung auf Deutsch + Zustandswert + Wetter an einem Ort", "Agradex"],
        ],
      },
    },
    {
      heading: "Die ehrliche Grenze aller Gratis-Wege",
      paragraphs: [
        "Welches Werkzeug Sie auch wählen — die Physik ist dieselbe: Sentinel-2 kommt etwa alle 5 Tage, ein bewölkter Überflug liefert kein Bild, und ein 10-Meter-Pixel zeigt keinen einzelnen Baum. Kostenlose Werkzeuge unterscheiden sich nicht in den Daten, sondern darin, wie verständlich sie sie machen — und wie viel Arbeitszeit sie kosten: Der Browser verlangt sie jede Woche, die Plattformen nehmen sie Ihnen ab. Durch Wolken sieht keiner der drei Wege; die Lücken im November haben alle gemeinsam.",
        "Ein vernünftiger Start: Legen Sie Ihr Hauptfeld in einem der drei Werkzeuge an und beobachten Sie es vier Überflüge lang. Danach wissen Sie aus eigener Anschauung, ob Ihnen die Rohdaten reichen — oder ob es die Einordnung ist, die Ihnen bisher gefehlt hat.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency"],
};
