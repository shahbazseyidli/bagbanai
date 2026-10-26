import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-subsidy-check",
  locale: "it",
  title: "AGEA controlla i tuoi appezzamenti dal satellite: cosa vede davvero",
  description:
    "Monitoraggio Satellitare Preventivo sul Piano Colturale Grafico e AMS sulla domanda: cosa significano gli alert verde, giallo, rosso e bianco, e come guardare i tuoi appezzamenti prima.",
  lead:
    "Risposta breve: il primo controllo non è più un tecnico in campo, è un satellite — e in Italia arriva in due momenti distinti. Il Monitoraggio Satellitare Preventivo (MSP) agisce sul Piano Colturale Grafico prima che la domanda sia presentata; il Sistema di Monitoraggio delle Superfici (AMS) agisce sulle domande già presentate. Per ogni appezzamento il sistema restituisce un alert colorato, e su quello si decide se serve fare qualcosa.",
  minutes: 5,
  datePublished: "2026-10-26",
  dateModified: "2026-10-26",
  sections: [
    {
      heading: "Verde, giallo, rosso, bianco: cosa vogliono dire",
      paragraphs: [
        "Gli alert non sono un giudizio finale, sono una domanda. Verde è esito positivo e non richiede nulla. Giallo è esito dubbio, rosso è esito negativo: in entrambi i casi l'agricoltore può inviare una foto georeferenziata (Geotag) oppure correggere il poligono del Piano Colturale Grafico. Bianco significa soltanto che il monitoraggio non è ancora concluso.",
        "La differenza che conta è il momento. Con il MSP il problema emerge prima della presentazione, quando correggere costa un clic; con l'AMS emerge dopo, quando la domanda è già depositata. Una correzione applicata bene a monte permette di predisporre le domande geospaziali senza errori.",
      ],
      bullets: [
        "Verde — esito positivo, nessuna azione",
        "Giallo — esito dubbio: foto georeferenziata o correzione del poligono",
        "Rosso — esito negativo: stessa strada, con più urgenza",
        "Bianco — monitoraggio non ancora concluso",
      ],
    },
    {
      heading: "Perché il satellite guarda una stagione e non un giorno",
      paragraphs: [
        "Una sola immagine si può contestare: una nuvola, uno sfalcio anticipato di una settimana, un campo che quel giorno sembra nudo. Una stagione di immagini no, perché mostra una forma — suolo nudo, emergenza, chiusura della copertura, senescenza, raccolta. È quella forma a distinguere un prato permanente da un seminativo, e un prato sfalciato da uno abbandonato.",
        "Per questo il monitoraggio si regge su passaggi ravvicinati e continui, non su un sopralluogo. Sentinel-2 vede il colore e la vegetazione ma si ferma davanti alle nuvole; Sentinel-1 è radar e le attraversa. Insieme tengono il registro aperto anche nelle settimane coperte.",
      ],
    },
    {
      heading: "Finestre di osservazione: attenzione agli eco-schemi",
      paragraphs: [
        "Le finestre non sono uguali per tutti gli impegni. A seguito della VI modifica del Piano Strategico della PAC, dal 2026 la finestra di osservazione dell'Eco-schema 2 è anticipata e si concentra nel periodo 1° settembre – 30 aprile, mentre per l'Eco-schema 5 il monitoraggio resta dal 1° marzo al 30 settembre.",
        "La conseguenza pratica è semplice e si dimentica facilmente: un'operazione fatta fuori finestra può essere corretta sul campo e comunque non comparire nel periodo osservato. Vale la pena segnarsi le date prima della stagione, non dopo l'alert.",
      ],
    },
    {
      heading: "Guarda i tuoi appezzamenti prima che lo faccia il sistema",
      paragraphs: [
        "La fonte è aperta: le immagini Copernicus Sentinel-2 sono gratuite e gli indici di vegetazione sono la stessa aritmetica ovunque vengano calcolati. Nulla impedisce di vedere il proprio appezzamento esattamente come lo vede il monitoraggio, solo prima.",
        "Agradex fa questa parte: disegni il confine una volta e l'applicazione recupera la storia Sentinel-2 di quell'appezzamento, tracciando l'andamento dell'indice lungo la stagione. Non calcola titoli né ammissibilità — quello spetta all'organismo pagatore. Mostra il registro fisico su cui il controllo si basa.",
      ],
    },
    {
      heading: "Cosa un satellite non può dirti",
      paragraphs: [
        "Non nomina una malattia, non legge un contratto e non guarda sotto la copertura. Un pixel di 10 metri copre 100 metri quadrati: un focolaio di pochi metri, un albero isolato o una capezzagna stretta non hanno un pixel proprio. E un indice misura luce riflessa, non una diagnosi: dice dove andare, non cosa troverai.",
        "È un limite che vale in entrambe le direzioni — limita ciò che il monitoraggio può contestarti e limita ciò che puoi chiedere a una mappa.",
      ],
    },
    {
      heading: "In breve",
      paragraphs: [
        "Il controllo satellitare è più economico, più uniforme e meno invasivo del regime di sopralluoghi che ha sostituito, e gira su dati che puoi leggere anche tu. La preparazione è poco spettacolare e del tutto nelle tue mani: confini corretti e una stagione che, vista dall'alto, somiglia a quella che hai dichiarato.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency", "free-ndvi-map"],
};
