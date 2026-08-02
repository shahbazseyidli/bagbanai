import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-crop-disease",
  locale: "de",
  title: "Erkennt der NDVI Pflanzenkrankheiten? Eine ehrliche Antwort",
  description:
    "Direkt nicht: Der NDVI sieht Stress, nicht dessen Ursache. Der echte Wert des Satelliten: früh zeigen, wo nachzusehen ist — die Diagnose fällt auf dem Feld.",
  lead:
    "Die ehrliche Antwort: direkt nein. Der NDVI ist kein Krankheitsdetektor — er zeigt, dass ein Bestand schwächelt, aber nicht warum. Gelbrost, Trockenstress, Stickstoffmangel und Drahtwurmfraß können im Satellitenbild fast identisch aussehen: Alle senden dasselbe Signal „hier fällt der NDVI“. Der echte Wert des Satelliten liegt woanders — er zeigt deutlich früher als das Auge, wo und wann sich Nachsehen lohnt.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Was der Satellit wirklich sieht",
      paragraphs: [
        "Zerstört eine Krankheit Blattgewebe, bricht die Photosynthese ein, die Absorption im roten Licht sinkt — der NDVI fällt. Eine großflächig etablierte Infektion zeichnet sich im Satellitenbild als klarer Fleck ab. Das Problem: Denselben Fleck erzeugen auch Staunässe, ein verdichtetes Vorgewende, eine ungleich laufende Düngerstreuung oder eine sandige Kuppe im Trockenjahr.",
        "Dazu kommt das 10-Meter-Pixel: Ein Befallsnest von wenigen Quadratmetern — so beginnt Gelbrost gern — ist für den Satelliten noch unsichtbar. Der Index mittelt über die gesamte Pixelfläche; vereinzelte kranke Pflanzen verschwinden im Durchschnitt der gesunden Nachbarn. Wenn der Fleck im Index auftaucht, ist das Nest bereits gewachsen.",
        "Auch der umgekehrte Fall kommt vor: Septoria arbeitet sich von den unteren Blattetagen nach oben, und der Satellit sieht nur die Oberseite des Bestands. Solange die oberste Etage grün bleibt, bleibt die Karte unauffällig — ein guter NDVI ist deshalb kein Gesundheitszeugnis und ersetzt keine Bonitur.",
      ],
    },
    {
      heading: "Wozu der Satellit dann gut ist",
      paragraphs: [
        "Richtig eingesetzt, ist er trotzdem das beste Frühwarnwerkzeug, das für diesen Preis zu haben ist:",
      ],
      bullets: [
        "Frühe Richtung: In welcher Ecke des Schlags kippt der Trend? Die Bestandeskontrolle läuft gezielt statt blind.",
        "Zeitgewinn: Eine NDVI-Zone kann sich 1–2 Wochen abzeichnen, bevor das Auge eine Aufhellung sieht.",
        "Kontrolle nach der Maßnahme: Hat die Behandlung gegriffen? Die Erholung der Zone — oder ihr Ausbleiben — steht in den nächsten Überflügen als Zahl.",
        "Hilfe beim Eingrenzen: Zusammen mit dem NDMI gelesen, wird aus „irgendetwas stimmt nicht“ oft ein deutlich klareres „das ist Trockenstress, keine Krankheit“.",
      ],
    },
    {
      heading: "Der belastbare Ablauf: Satellit → Stiefel → Foto",
      paragraphs: [
        "Der Ablauf, der funktioniert, hat drei Schritte. Erstens: Auf der Satellitenkarte fällt eine schwächelnde Zone auf. Zweitens: Sie gehen genau dorthin und sehen sich die Blätter an — Farbe, Form und Sitz der Flecken, welche Blattetage betroffen ist. Drittens: Sie fotografieren das verdächtige Blatt; in Agradex analysiert die Foto-Diagnose das Bild, nennt die wahrscheinliche Ursache samt nächstem Schritt, und die Beobachtung bleibt in der Historie des Feldes.",
        "Das letzte Wort hat immer der Boden unter den Stiefeln — die Laboranalyse oder der erfahrene Blick der Beratung. Der Satellit ersetzt diese Kette nicht, er macht sie billiger: Sie wissen, wohin Sie fahren müssen, bevor Sie losfahren.",
      ],
    },
    {
      heading: "Eine Beobachtung aus dem Kaukasus",
      paragraphs: [
        "In einem von uns beobachteten Haselnussgarten im Kaukasus lag der NDVI des nördlichen Streifens mitten im Sommer Überflug für Überflug unter den Nachbarstreifen. Die Kontrolle vor Ort fand eine unspektakuläre Ursache: Der Bewässerungsstrang dieses Streifens lief schwach — keine Krankheit weit und breit. Der Satellit hat nicht „Krankheit“ gesagt, sondern „sieh hier nach“. Genau das ist der richtige Gebrauch dieses Index: wenig Anspruch, konkreter Nutzen.",
        "Übertragen auf Weizen oder Raps ändert sich daran nichts. Der Fleck in der Karte ist eine Adresse, keine Diagnose — wer ihn als Wegweiser nutzt und die Bestätigung den Blättern, dem Labor und der Beratung überlässt, holt aus dem NDVI genau das heraus, was er ehrlich hergibt.",
      ],
    },
  ],
  related: ["what-is-ndvi", "ndvi-ndmi-ndre"],
};
