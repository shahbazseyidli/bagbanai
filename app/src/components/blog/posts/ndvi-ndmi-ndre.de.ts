import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-ndmi-ndre",
  locale: "de",
  title: "NDVI, NDMI, NDRE: der Unterschied — und wann welcher Index",
  description:
    "NDVI zeigt die Bestandesdichte, NDMI das Wasser im Gewebe, NDRE die Chlorophyll- und Stickstoffversorgung. Wann welcher Index die richtige Karte ist.",
  lead:
    "Drei Indizes, drei Fragen. NDVI: „Wie dicht ist der Bestand?“ NDMI: „Steckt genug Wasser in den Pflanzen?“ NDRE: „Wie steht es um das Chlorophyll — praktisch: um die Stickstoffversorgung?“ Der häufigste Fehler ist, den NDVI als Antwort auf alle drei Fragen zu lesen: Ein dichter, aber trockengestresster Bestand kann im NDVI noch gut aussehen, während der NDMI längst fällt.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Der Vergleich auf einen Blick",
      paragraphs: [
        "Alle drei rechnen mit denselben Sentinel-2-Aufnahmen, nur mit anderen Kanälen — und genau daraus ergibt sich die Arbeitsteilung. Der typische Bereich ist als Lesehilfe gedacht; die Historie des eigenen Schlags schlägt jede Tabelle.",
      ],
      table: {
        headers: ["Index", "Was er misst", "Bei welcher Frage er hilft", "Typischer Bereich"],
        rows: [
          ["NDVI", "Dichte der grünen Masse", "Gesamtzustand, schwache Zonen, Trend", "0.1 – 0.8"],
          ["NDMI", "Wasser im Pflanzengewebe", "Trockenstress erkennen, bevor beregnet wird", "−0.2 – 0.4"],
          ["NDRE", "Chlorophyll- bzw. N-Signal", "Düngefenster, feine Unterschiede im dichten Bestand", "0.1 – 0.5"],
        ],
      },
    },
    {
      heading: "NDMI: sieht Trockenstress vor dem NDVI",
      paragraphs: [
        "Der NDMI vergleicht nahes Infrarot mit kurzwelligem Infrarot (SWIR). Wasser absorbiert SWIR — der Index reagiert deshalb direkt auf den Wassergehalt im Gewebe. Sein praktischer Bereich reicht von etwa −0.20 bis 0.40: Ein grüner, gut versorgter Bestand liegt im Plus, austrocknende Vegetation rutscht unter null. Anders als der NDVI reagiert er kaum darauf, wie dicht der Bestand steht — genau deshalb ergänzen sich die beiden.",
        "Ein gemessener Fall von einer Fläche, die wir beobachten: Der NDVI stand noch auf „mittel“, während der NDMI bereits auf −0.13 gefallen war — der Bestand hielt seine Form, aber die Wasserreserve ging zur Neige. Dieses Signal erlaubt es, die Beregnungsentscheidung ein bis zwei Überflüge früher zu treffen, als der NDVI es hergäbe. In Trockenjahren auf leichten Standorten ist das der Index, der neben dem NDVI offen bleiben sollte.",
      ],
    },
    {
      heading: "NDRE: übernimmt, wenn der NDVI sättigt",
      paragraphs: [
        "Am Vegetationshöhepunkt drückt ein geschlossener Bestand den NDVI gegen seine Decke um 0.8 — ab da verschwinden die Unterschiede innerhalb des Schlags im Index. Der NDRE nutzt den Red-Edge-Kanal und differenziert genau in dieser Sättigungszone weiter: welcher Streifen in der Stickstoffversorgung zurückhängt, wohin eine Teilflächengabe gehört.",
        "Im Weizen ist das Fenster zwischen Schossen und Ährenschieben am aufschlussreichsten — dort fällt die Entscheidung über die späte N-Gabe. Im Raps lohnt der Blick im Frühjahr, solange der Bestand dicht, aber noch nicht in Blüte ist. Ein NDRE-Fleck ist dabei ein Hinweis, kein Düngebefehl: Er zeigt, wo eine Bodenprobe oder ein N-Tester die Antwort liefern sollte.",
      ],
    },
    {
      heading: "Die praktische Lesereihenfolge",
      bullets: [
        "Bei jeder neuen Szene zuerst der NDVI-Trend: Fällt er, hat das eine Ursache — suchen.",
        "NDVI unauffällig, aber die Woche heiß und trocken? NDMI öffnen: Trockenstress erscheint dort zuerst.",
        "NDVI hoch und gleichmäßig, gesucht sind Unterschiede innerhalb des Schlags? Dann die NDRE-Karte.",
        "Verschlechtern sich alle drei gleichzeitig, ist das Problem nicht lokal — Wasser, Wurzeln oder Krankheit gehören ernsthaft geprüft.",
      ],
    },
    {
      heading: "Wie das in Agradex aussieht",
      paragraphs: [
        "Für jedes Feld werden neun Indizes berechnet; die Kartenebene wechselt mit einem Fingertipp, und neben jeder steht eine Erklärung in einfachen Worten. Die KI-Analyse fängt Widersprüche zwischen den Indizes selbst ab und meldet sie als Risikosignal — ein Satz wie „NDVI stabil, aber der NDMI fällt seit 10 Tagen“ kommt fertig formuliert. Eines gilt für alle drei Karten gemeinsam: Sie stammen aus derselben Aufnahme. Fällt ein Termin den Wolken zum Opfer, fehlen sie zusammen — die Lücken folgen dem Überflug-Rhythmus, nicht dem Index.",
      ],
    },
  ],
  related: ["what-is-ndvi", "when-to-irrigate-wheat"],
};
