import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-pass-frequency",
  locale: "de",
  title: "Wie oft überfliegt ein Satellit mein Feld?",
  description:
    "Sentinel-2 überfliegt dasselbe Feld im Schnitt alle 5 Tage — doch nicht jeder Überflug liefert ein Bild. Der Rhythmus, gemessen an 7 Feldern über 120 Tage.",
  lead:
    "Die kurze Antwort: Die beiden Sentinel-2-Zwillingssatelliten (2A und 2B) überfliegen denselben Punkt im Mittel alle 5 Tage. Wo sich benachbarte Aufnahmestreifen überlappen — und das ist in Mitteleuropa häufig —, fällt ein Feld in zwei oder drei Orbits, und die Termine rücken enger zusammen. Wichtig ist aber eine andere Unterscheidung: Ein Überflug ist noch kein Bild.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Woher kommt der 5-Tage-Rhythmus?",
      paragraphs: [
        "Das Sentinel-2-Programm arbeitet mit zwei baugleichen Satelliten, die sich auf derselben Bahn genau gegenüberstehen. Jeder für sich deckt die Erde in 10 Tagen ab; zusammen kehren sie im 5-Tage-Takt an denselben Punkt zurück. Das ist keine Zahl aus dem Datenblatt — wir haben sie in unseren eigenen Daten nachgemessen.",
        "Gruppiert man die Aufnahmetermine von sieben Feldern über 120 Tage nach der Regel (Datum mod 5), sortiert sich jedes Feld in zwei bis drei Gruppen — und jede Lücke innerhalb einer Gruppe ist ein exaktes Vielfaches von 5 Tagen. Alle 86 Lücken, ohne eine einzige Ausnahme. Ihr Feld bekommt seine Bilder also im 5-Tage-Takt der Orbitstreifen, in denen es liegt.",
        "Praktisch heißt das: Ihr Feld hat feste Überflugtage. Wer den Takt einmal kennt, weiß, an welchen Tagen sich der Blick auf die Karte lohnen kann — und dass an den Tagen dazwischen grundsätzlich nichts kommt, egal wie klar der Himmel ist.",
      ],
    },
    {
      heading: "Warum kommt trotzdem mal 2–3 Wochen nichts an?",
      paragraphs: [
        "Weil Überflug nicht gleich Bild ist. Der Satellit kommt pünktlich — hängt über dem Feld aber eine geschlossene Wolkendecke, ist der Termin verloren. Ein reales Beispiel aus dem Juli: Für ein Feld gab es Überflüge am 8., 13. und 18. — alle drei bewölkt. Für den Betrieb sieht das aus wie „der Satellit fliegt seit 20 Tagen nicht mehr“; tatsächlich war er dreimal da, nur das Wetter hat nicht mitgespielt.",
        "Agradex macht diesen Unterschied sichtbar: Das System protokolliert neben den gelungenen Aufnahmen auch die bewölkten Überflüge und zeigt auf der Feldseite den nächsten erwarteten Termin. Die Frage „warum kommt kein Bild?“ bekommt damit eine gemessene Antwort statt einer Vermutung.",
      ],
    },
    {
      heading: "Was Sie je nach Jahreszeit erwarten können",
      bullets: [
        "Sommer: der höchste Anteil wolkenfreier Überflüge — meist alle 5 bis 10 Tage eine brauchbare Szene; Gewitterlagen können einzelne Termine kosten.",
        "Frühjahr und Herbst: wechselhaft. 2–3 bewölkte Überflüge in Folge sind normal, also auch Pausen von 10–15 Tagen.",
        "Spätherbst und Winter: die magerste Zeit. Unter norddeutscher Bewölkung sind 3–4 Wochen ohne brauchbare Szene keine Störung, sondern der Normalfall — Physik, kein Systemfehler.",
      ],
    },
    {
      heading: "Was ein 10-Meter-Pixel zeigt — und was nicht",
      paragraphs: [
        "Die Hauptkanäle von Sentinel-2 lösen 10 Meter auf. Ein Hektar besteht damit aus rund 100 Pixeln — genug, um schwache Zonen innerhalb des Schlags voneinander zu trennen. Einzelne Bäume, Fahrgassen oder ein paar Quadratmeter Garten löst das Raster dagegen nicht auf. Bei kleinen Flächen mischen die Randpixel zudem Nachbarflächen ein — eine sauber gezeichnete Feldgrenze ist deshalb keine Formalie, sondern Voraussetzung für verlässliche Werte.",
      ],
    },
    {
      heading: "Die praktische Folgerung",
      paragraphs: [
        "Planen Sie nicht mit einem täglichen Bild, sondern mit dem Überflug-Rhythmus: Kommt eine frische Szene, lohnt der Blick auf die Karte; kommt keine, lohnt der Blick auf den Grund. In Agradex steht beides auf der Zeitleiste der Feldseite — und ein Demofeld können Sie ohne Anmeldung ausprobieren.",
      ],
    },
  ],
  related: ["why-no-satellite-image", "what-is-ndvi"],
};
