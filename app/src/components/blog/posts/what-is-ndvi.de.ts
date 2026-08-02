import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "what-is-ndvi",
  locale: "de",
  title: "Was ist der NDVI? Einfach erklärt, mit Werte-Tabelle",
  description:
    "Der NDVI misst die Vegetationsdichte auf einer Skala von −1 bis +1. Was 0.2, 0.4 oder 0.7 bedeuten: Werte-Tabelle, Praxisbeispiele und drei typische Fehler.",
  lead:
    "Der NDVI (Normalized Difference Vegetation Index) ist eine aus Satellitenbildern berechnete Zahl zwischen −1 und +1, die zeigt, wie dicht und vital der Pflanzenbestand auf einer Fläche steht. Offener Boden liegt um 0.1, ein gesunder, geschlossener Bestand über 0.6. In einem Satz: Je höher der NDVI, desto mehr photosynthetisch aktive grüne Masse steht auf dem Schlag.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Woher kommt diese Zahl?",
      paragraphs: [
        "Ein gesundes Blatt absorbiert rotes Licht für die Photosynthese und reflektiert nahes Infrarot besonders stark. Der NDVI normiert genau diese Differenz: (NIR − Rot) / (NIR + Rot). Sentinel-2 nimmt beide Kanäle mit 10 Metern Pixelkante auf — ein Hektar besteht damit aus rund 100 Bildpunkten, jeder mit eigenem Wert.",
        "Die Formel ist simpel; ihre Stärke liegt im Vergleich. Derselbe Schlag heute gegen denselben Schlag vor zwei Wochen, die schwache Ecke gegen den kräftigen Rest — aus diesen Differenzen entstehen die pflanzenbaulichen Entscheidungen, nicht aus der einzelnen Zahl.",
      ],
    },
    {
      heading: "Die NDVI-Werte-Tabelle",
      paragraphs: [
        "Die folgenden Bereiche sind Orientierung, keine Norm. Was für Winterweizen „normal“ ist, gilt weder für Raps noch für Grünland, und der Saisonbeginn unterscheidet sich vom Bestandesschluss. Lesen Sie die Tabelle deshalb immer zusammen mit der Historie des eigenen Schlags.",
      ],
      table: {
        headers: ["NDVI", "Bedeutung", "Typisches Bild auf dem Schlag"],
        rows: [
          ["< 0.1", "Keine Vegetation", "Offener Boden, Wasser, frische Bearbeitung"],
          ["0.1 – 0.2", "Sehr lückiger Bestand", "Auflaufen, starke Fehlstellen"],
          ["0.2 – 0.35", "Schwacher Bestand", "Frühes Stadium oder Stress"],
          ["0.35 – 0.5", "Mittlerer Bestand", "Entwicklung läuft, beobachten"],
          ["0.5 – 0.7", "Guter Bestand", "Gesunde, aktive Vegetation"],
          ["> 0.7", "Sehr dichter Bestand", "Geschlossener Bestand am Vegetationshöhepunkt"],
        ],
      },
    },
    {
      heading: "Praxisbeispiel: Ist 0.3 schlecht — oder normal?",
      paragraphs: [
        "Die Antwort hängt vom Stadium ab. Zeigt Winterweizen Anfang Dezember 0.3, ist das unauffällig: Der Bestand steht in der Bestockung, mehr grüne Masse ist schlicht noch nicht da. Steht derselbe Weizen im Mai immer noch bei 0.3, ist das ein Signal — Wasser, Nährstoffe oder eine Krankheit. Auf Grünland wiederum fällt der NDVI nach jedem Schnitt abrupt ab; das ist Mahd, kein Stress. Und bei Raps drückt die Blüte den Wert: Die gelben Blüten überdecken das Blattwerk, der Index sinkt scheinbar mitten in der besten Entwicklung — auch das ist Optik, kein Alarm. Wer Kurven liest, muss die Bewirtschaftung und die Kultur mitdenken.",
        "Auf den Flächen, die wir beobachten, war die nützlichste Frage nie „wie hoch ist der NDVI?“, sondern „wohin bewegt er sich?“. Derselbe Wert 0.45 ist auf steigender Linie beruhigend — auf fallender ein Grund, rauszufahren.",
      ],
    },
    {
      heading: "Drei typische Fehler",
      bullets: [
        "Einen einzelnen Tag bewerten. Ein Einzelwert kann durch Wolkenschatten oder Aufnahmewinkel verzerrt sein — belastbar ist der Trend über mehrere Aufnahmen.",
        "Schläge miteinander vergleichen. Andere Kultur, anderer Saattermin, anderer Boden: NDVI-Vergleiche taugen nur innerhalb der Historie desselben Schlags.",
        "Den NDVI als „Gesundheitsprozent“ lesen. 0.6 heißt nicht „60 % gesund“. Der Index misst die Dichte des Bestands; ein dichter, aber trockengestresster Bestand kann eine Zeit lang weiter hohe Werte zeigen.",
      ],
    },
    {
      heading: "So sehen Sie den NDVI des eigenen Feldes",
      paragraphs: [
        "In Agradex zeichnen Sie die Feldgrenze direkt auf der Karte ein; das System lädt das Sentinel-2-Archiv und berechnet nach jedem wolkenfreien Überflug die NDVI-Karte samt einem Zustandswert von 0 bis 100. Satellitenkarte, Zustandswert und Agrarwetter gehören zum kostenlosen Tarif — und ein Demofeld mit echten Satellitendaten lässt sich ganz ohne Anmeldung ansehen.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "free-ndvi-map"],
};
