import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "why-no-satellite-image",
  locale: "de",
  title: "Warum gibt es kein neues Satellitenbild von meinem Feld?",
  description:
    "Der Grund ist fast immer Bewölkung: Der Satellit fliegt planmäßig, doch das Bild ist unbrauchbar. Wann eine Lücke normal ist und wann sich Nachsehen lohnt.",
  lead:
    "Die kürzeste Antwort: Der Satellit hat nicht aufgehört zu fliegen — über Ihrem Feld hingen Wolken. Sentinel-2 kommt etwa alle 5 Tage vorbei, ist aber ein optisches Instrument und sieht durch Wolken nicht hindurch. Hinter fast jeder längeren Lücke stehen mehrere bewölkte Überflüge in Folge. Der Unterschied zählt: „Das System ist ausgefallen“ und „das Wetter gibt es nicht her“ führen zu verschiedenen Entscheidungen.",
  minutes: 3,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Wann gilt ein Bild als unbrauchbar?",
      paragraphs: [
        "Nach jedem Überflug prüft die Verarbeitungskette die Qualität der Szene. Im Verarbeitungsprotokoll von Agradex wird jeder Versuch mit Ergebnis festgehalten, und davon gibt es vier: Bild erfolgreich geschrieben; kein verlässlicher Pixel übrig, weil Wolken oder Schatten die Fläche vollständig verdeckt haben; Szene insgesamt zu bewölkt; selten ein Lesefehler. Ein reales Beispiel aus dem Juli: Für ein Feld endeten die Überflüge vom 8., 13. und 18. alle drei mit „zu bewölkt“ — mehr Erklärung braucht die 15-Tage-Lücke nicht.",
        "Die Wolkenmaske (Fmask) schneidet nicht nur Wolken heraus, sondern auch deren Schattenwurf. Ein Termin kann deshalb selbst dann unvollständig sein, wenn der Himmel halbwegs offen wirkte — lag ein Teil des Schlags im Wolkenschatten, fällt er aus der Auswertung. Auch dünne Schleierbewölkung, die vom Boden kaum auffällt, verfälscht die Werte; lieber ein Termin weniger als eine Karte, die etwas anzeigt, was nicht da ist.",
      ],
    },
    {
      heading: "Wann Sie sich keine Sorgen machen müssen",
      bullets: [
        "Lücke unter 15 Tagen: völlig normaler Rhythmus — das sind 2–3 bewölkte Überflüge in Folge, mehr nicht.",
        "Im Frühjahr und Herbst sind 2–3 Wochen Pause üblich; unter norddeutscher Herbst- und Winterbewölkung auch 3–4 Wochen. Das ist Physik, kein Fehler.",
        "Der Nachbarschlag hat ein Bild, Ihrer nicht? Sehr wahrscheinlich liegt er in einem anderen Orbitstreifen mit anderem Überflugtag.",
      ],
    },
    {
      heading: "Wann sich ein Blick lohnt",
      paragraphs: [
        "Kommt mitten im Sommer, bei tagelang klarem Himmel, über drei Wochen nichts an, prüfen Sie die Feldgrenze: Ist sie ungenau gezeichnet oder die Fläche sehr klein, bleiben zu wenige verlässliche Pixel übrig. In Agradex zeigt die Zeitleiste der Feldseite neben den gelungenen Aufnahmen auch die bewölkten Überflüge samt Grund — die Ursache einer Lücke steht dort schwarz auf weiß, und der nächste erwartete Überflugtermin gleich daneben.",
        "Ein zweiter Blick gilt dem Kalender: Steht die Lücke im November, ist sie fast sicher Wetter. Steht sie im Juni bei wolkenlosem Himmel, ist sie es fast sicher nicht — dann lohnt die Kontrolle von Grenze und Flächengröße wirklich.",
      ],
    },
    {
      heading: "Gibt es einen Weg an den Wolken vorbei?",
      paragraphs: [
        "Radar wäre die physikalische Ausnahme: Sentinel-1 durchdringt Wolken, misst aber Oberflächenstruktur und Feuchte — einen NDVI liefert er nicht, und den Vegetationszustand ersetzt er nicht. Kommerzielle Konstellationen mit täglichen Aufnahmen fotografieren ebenfalls optisch und stehen unter denselben Wolken. Für die NDVI-Beobachtung gilt deshalb nüchtern: Alle Werkzeuge trinken aus derselben Quelle, und die Quelle ist bei geschlossener Bewölkung zu.",
      ],
    },
    {
      heading: "Was tun, solange der Satellit schweigt?",
      paragraphs: [
        "Ein bewölktes Feld ist kein blindes Feld: Wettervorhersage, Regensummen und die Wasserbilanz laufen täglich weiter. Stützen Sie Entscheidungen in langen Wolkenphasen auf diese Ebenen — die erste wolkenfreie Szene kommt automatisch, sobald ein Überflug es zulässt; beim nächsten Termin versucht es das System erneut, und die Plattform meldet sich von selbst, wenn eine neue Szene verarbeitet ist. Tägliches Nachschauen ist nicht nötig.",
      ],
    },
  ],
  related: ["satellite-pass-frequency", "free-ndvi-map"],
};
