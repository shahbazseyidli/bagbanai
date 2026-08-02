import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "when-to-irrigate-wheat",
  locale: "de",
  title: "Wann Weizen beregnen? Die FAO-56-Methode einfach erklärt",
  description:
    "Beregnen nach Wasserbilanz statt Kalender: Verdunstung (ET0) × Pflanzenkoeffizient (Kc) minus effektiver Regen — mit Rechenbeispiel und kritischen Stadien.",
  lead:
    "Die richtige Frage lautet nicht „alle wie viel Tage beregnen?“, sondern „wann wird der Bodenwasservorrat kritisch?“. Die FAO-Methode Nr. 56 beantwortet das mit drei Größen: der Referenzverdunstung ET0, einem Koeffizienten für das Entwicklungsstadium (Kc) und dem Anteil des Regens, der tatsächlich im Boden ankommt. Läuft die Bilanz ins Minus, ist Beregnungszeit — nach der Rechnung des eigenen Schlags, nicht nach Kalender.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Für wen das in Deutschland relevant ist",
      paragraphs: [
        "Ehrlich vorweg: Weizen wird in Deutschland nur auf einem kleinen Teil der Fläche beregnet. Interessant ist die Methode dort, wo ohnehin Beregnungstechnik steht — auf leichten Standorten etwa in Ostdeutschland und Niedersachsen, in Trockenjahren dann auch im Weizen — und generell in Sonderkulturen wie Kartoffeln oder Gemüse, für die dieselbe Rechnung mit anderen Kc-Werten gilt. Die Logik bleibt identisch; Weizen dient hier als durchgerechnetes Beispiel.",
      ],
    },
    {
      heading: "Was die drei Zahlen bedeuten",
      paragraphs: [
        "ET0, die Referenzverdunstung, beschreibt, wie viel Wasser eine gut versorgte Grasfläche an einem Tag verlieren würde — berechnet aus Temperatur, Strahlung, Wind und Luftfeuchte. An einem heißen, trockenen Sommertag erreicht ET0 hierzulande 5–6 mm; das sind 50–60 Kubikmeter je Hektar. An einem trüben Apriltag ist es ein Bruchteil davon.",
        "Kc, der Pflanzenkoeffizient, übersetzt das auf Kultur und Stadium: Weizen verbraucht beim Auflaufen wenig (etwa 0.3), zwischen Schossen und Milchreife am meisten (bis 1.15) und zur Abreife wieder wenig (0.3–0.4). Der tatsächliche Bedarf ist ET0 × Kc.",
        "Effektiver Regen: Nicht jeder gemessene Millimeter kommt im Wurzelraum an — bei Starkregen fließt ein Teil oberflächlich ab, ein weiterer verdunstet aus der obersten Krume. In die Bilanz gehört nur der Anteil, der einsickert.",
      ],
    },
    {
      heading: "Die kritischen Wasser-Fenster des Weizens",
      bullets: [
        "Schossen bis Ährenschieben: das empfindlichste Fenster — Stress kostet hier direkt Kornzahl je Ähre.",
        "Blüte: kurz, aber unerbittlich; schon 3–4 Tage harter Stress treffen die Befruchtung.",
        "Milchreife: die Kornfüllung läuft — Stress drückt das Tausendkorngewicht.",
        "Bestockung: vergleichsweise robust; ein leichtes Defizit treibt die Wurzeln sogar tiefer.",
      ],
    },
    {
      heading: "Das Rechenbeispiel",
      paragraphs: [
        "Angenommen, der Bestand schiebt die Ähren (Kc ≈ 1.15), die ET0-Summe der letzten 7 Tage beträgt 45 mm, dazu kamen 8 mm Regen, die vollständig eingesickert sind. Verbrauch des Bestands: 45 × 1.15 ≈ 52 mm. Bilanz: 8 − 52 = −44 mm. Lag der leicht verfügbare Wasservorrat des Bodens bei 50 mm, ist er damit praktisch aufgebraucht — beregnet wird in den nächsten ein, zwei Tagen, nicht erst, „wenn der Turnus wieder dran ist“.",
        "Mühsam an dieser Rechnung ist nicht die Mathematik, sondern das tägliche Nachhalten von ET0 und Stadium. Agradex führt die Bilanz automatisch: tägliche ET0 aus Open-Meteo-Daten, Kc nach Kultur und Stadium des Feldes, dazu die Regensummen — auf der Feldseite steht die fertige Wasserbilanz, und die Empfehlung kommt in der Form „diese Woche etwa X mm geben“.",
      ],
    },
    {
      heading: "Wo der Satellit ins Spiel kommt",
      paragraphs: [
        "Die Bilanz ist Rechnung, der Satellit ist die Kontrolle: Der NDMI zeigt das Wasser im Pflanzengewebe und bestätigt — oder widerlegt —, dass die Rechnung zur Wirklichkeit passt. Sagt die Bilanz „Wasser reicht“, während der NDMI Überflug für Überflug fällt, gehört etwas überprüft: Vielleicht verteilt die Maschine ungleich, vielleicht ist der effektive Regen kleiner als angesetzt.",
      ],
    },
    {
      heading: "Drei Regeln zum Mitnehmen",
      bullets: [
        "Bilanz statt Kalender: Ein fester Turnus gibt im Frühjahr zu viel und im Juli zu wenig.",
        "Das Stadium sauber pflegen: Stimmt Kc nicht, stimmt die ganze Rechnung nicht.",
        "In den kritischen Fenstern die Bilanz nicht gegen null fahren — beim Ährenschieben ist Beregnen schon bei 40–50 % verbrauchtem Vorrat die sicherere Wahl.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "satellite-pass-frequency"],
};
