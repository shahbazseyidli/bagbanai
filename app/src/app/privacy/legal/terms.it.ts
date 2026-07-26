// Italian terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the it
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsIt: TermsDoc = {
  title: "Condizioni d'uso",
  lead:
    "Questa pagina spiega che cosa promette Agradex e — cosa più importante — che cosa non " +
    "promette. Non è un modello legale: tutto ciò che è scritto qui corrisponde allo stato " +
    "attuale del prodotto.",
  summary: [
    "Agradex è uno strumento di supporto alle decisioni; non sostituisce l'agronomo, il laboratorio né l'uscita in campo.",
    "Il consiglio dell'IA è un'analisi automatica e può sbagliare: la decisione finale è tua.",
    "Oggi non è collegato alcun sistema di pagamento: non raccogliamo dati di carte e nulla viene addebitato senza preavviso.",
    "I dati della tua azienda sono tuoi; non li vendiamo.",
    "Il servizio gira su un solo server, senza SLA e senza disponibilità garantita.",
  ],
  sections: {
    service: {
      heading: "Che cos'è il servizio",
      body: [
        {
          kind: "p",
          text:
            "Agradex è una piattaforma di monitoraggio colturale e gestione aziendale costruita " +
            "su immagini satellitari (Sentinel-2 e il prodotto armonizzato Landsat–Sentinel), " +
            "previsioni meteo, modelli agronomici e intelligenza artificiale. Il servizio " +
            "comprende il sito, l'applicazione e la web app installabile (PWA).",
        },
        {
          kind: "p",
          text:
            "Dietro alla piattaforma non è ancora stata dichiarata una persona giuridica " +
            "registrata, perciò questo documento non indica ragione sociale, numero di " +
            "registrazione né legge applicabile. Lo scriviamo apertamente perché non si crei " +
            "un'idea sbagliata di che cosa sia questo documento. Contatto: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Usando il servizio accetti queste condizioni. Se non sei d'accordo, non creare un " +
            "account oppure chiudi quello che hai.",
        },
      ],
    },
    account: {
      heading: "Account",
      body: [
        {
          kind: "ul",
          items: [
            "Un indirizzo email corrisponde a un account; l'email è anche il tuo identificativo di accesso.",
            "Dopo la registrazione l'indirizzo viene confermato con un codice a 6 cifre.",
            "La protezione delle tue credenziali è una tua responsabilità; le azioni compiute dal tuo account contano come tue.",
            "Devi fornire informazioni corrette — soprattutto il confine del campo e la coltura, perché tutta l'analisi si basa su di essi.",
            "I permessi all'interno di un'organizzazione sono assegnati per ruolo; il proprietario può aggiungere e rimuovere membri.",
            "Puoi chiudere l'account in qualsiasi momento. Che cosa succede è descritto passo per passo nell'Informativa sulla privacy.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Limiti dell'intelligenza artificiale",
      body: [
        {
          kind: "p",
          text:
            "Sotto ogni consiglio dell'IA è stampata esattamente questa frase: «Questo consiglio " +
            "è un'analisi automatica basata su dati satellitari e di campo; verifica sul posto " +
            "prima di decidere.» Non è una formalità: è letteralmente il confine del servizio.",
        },
        {
          kind: "ul",
          items: [
            "L'IA può sbagliare: può leggere male un campo coperto dalle nuvole e, se la scheda è incompleta, anche il risultato lo sarà.",
            "La diagnosi da foto non nomina mai una marca o una dose specifica di fitofarmaco — rimanda all'elenco dei prodotti registrati e a un agronomo.",
            "Il consiglio non è una consulenza veterinaria, fitosanitaria, legale o finanziaria.",
            "Gli indici satellitari e i modelli non sostituiscono l'analisi di laboratorio, il campione di suolo e l'uscita in campo.",
            "Prima di applicare qualsiasi prodotto chimico leggi sempre l'etichetta e le norme locali.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Uso consentito",
      body: [
        { kind: "p", text: "Non è consentito:" },
        {
          kind: "ul",
          items: [
            "Inviare richieste massive automatizzate, estrarre i contenuti (scraping) o tentare di bloccare il servizio con carico artificiale.",
            "Accedere all'account altrui senza permesso, tentare di aggirare i meccanismi di sicurezza, inserire codice dannoso.",
            "Caricare dati che non ti appartengono e che non hai il diritto di condividere (per esempio i documenti di campo di un'altra azienda).",
            "Pubblicare contenuti illeciti, falsi o lesivi dei diritti altrui.",
            "Rivendere il servizio o le risposte dell'IA a terzi come servizio, senza permesso.",
            "Applicare ingegneria inversa al codice o ai modelli della piattaforma.",
          ],
        },
        {
          kind: "p",
          text:
            "La violazione di queste regole può portare alla sospensione dell'account. In tal " +
            "caso cercheremo di spiegarne il motivo.",
        },
      ],
    },
    packages: {
      heading: "Pacchetti e pagamento",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Gratuito",
              v: "1 campo · 1 consiglio IA al mese · nessuna chat · indici satellitari e meteo inclusi.",
            },
            {
              k: "Pro — 10 AZN al mese",
              v: "5 campi · 8 consigli IA al mese · 50 messaggi di chat al mese · scheda del campo, irrigazione e finestra di trattamento.",
            },
            {
              k: "Business — 25 AZN al mese",
              v: "Campi praticamente illimitati · 30 consigli al mese · 300 messaggi di chat · 30 diagnosi da foto · benchmark e rapporti.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Un'organizzazione appena creata parte con una prova Pro di 1 mese e, al termine, " +
            "torna da sola al pacchetto gratuito: non ci sono pagamenti automatici.",
        },
        {
          kind: "p",
          text:
            "La nota più importante: il pagamento non è ancora collegato. Nel codice non c'è " +
            "alcun fornitore di pagamenti, non raccogliamo dati di carte o bancari e i pacchetti " +
            "vengono assegnati a mano. Quando i piani a pagamento partiranno lo annunceremo in " +
            "anticipo; a nessuno verrà addebitato nulla senza preavviso.",
        },
        { kind: "p", text: "I prezzi sono indicati in AZN." },
      ],
    },
    quotas: {
      heading: "Quote",
      body: [
        {
          kind: "p",
          text:
            "Consiglio dell'IA, chat e diagnosi da foto hanno limiti mensili per pacchetto. " +
            "Quando il limite è esaurito la richiesta viene rifiutata e ti viene spiegato il " +
            "motivo; il limite si azzera il mese successivo.",
        },
        {
          kind: "p",
          text:
            "I limiti servono a coprire il costo reale dell'IA. Ci riserviamo il diritto di " +
            "limitare un uso che generi un carico anomalo sul sistema.",
        },
        {
          kind: "p",
          text:
            "La velocità di elaborazione satellitare dipende da fattori fuori dal nostro " +
            "controllo: la frequenza di passaggio del satellite sopra il tuo campo e la " +
            "copertura nuvolosa.",
        },
      ],
    },
    ownership: {
      heading: "A chi appartengono i dati",
      body: [
        {
          kind: "p",
          text:
            "Confini dei campi, dati della scheda, note, foto, righe di registro: tutto tuo. Ci " +
            "concedi il diritto di trattarli per erogare il servizio (conservare, elaborare, " +
            "analizzare, mostrarteli); nulla di più.",
        },
        {
          kind: "ul",
          items: [
            "Non vendiamo i tuoi dati e non li cediamo a fini pubblicitari.",
            "I valori aggregati (confronti, benchmark) si calcolano solo su gruppi di almeno 5 campi e non indicano un campo specifico.",
            "Il codice, il design, i modelli di indice e i contenuti della piattaforma appartengono a noi.",
            "Sei responsabile del fatto che i contenuti caricati siano tuoi o che tu abbia il diritto di caricarli.",
          ],
        },
      ],
    },
    availability: {
      heading: "Disponibilità",
      body: [
        {
          kind: "p",
          text:
            "Il servizio gira su un solo server ed è fornito secondo il principio del «massimo " +
            "impegno». Non c'è disponibilità garantita (nessun SLA); sono possibili interruzioni " +
            "pianificate e non pianificate.",
        },
        {
          kind: "p",
          text:
            "I dati satellitari non sono continui: per la copertura nuvolosa e il calendario di " +
            "passaggio del satellite possono passare giorni senza una nuova immagine. Non è un " +
            "guasto: è la natura dell'orbita.",
        },
        {
          kind: "p",
          text:
            "Possiamo aggiungere, modificare o rimuovere funzioni. Se togliamo qualcosa che per " +
            "te è importante, cercheremo di dirlo in anticipo.",
        },
      ],
    },
    liability: {
      heading: "Responsabilità",
      body: [
        {
          kind: "p",
          text:
            "Le decisioni agronomiche sono tue. Irrigare, concimare, trattare, raccogliere: ogni " +
            "scelta è di chi conosce il campo, e Agradex non risponde del suo esito.",
        },
        {
          kind: "p",
          text:
            "In particolare: se da lavori eseguiti (o non eseguiti) sulla base di un consiglio " +
            "della piattaforma derivano perdita di raccolto, calo di resa, aumento dei costi o " +
            "altri danni, non ce ne assumiamo la responsabilità.",
        },
        {
          kind: "p",
          text:
            "Il servizio è fornito «così com'è»; non garantiamo che i dati siano completi o " +
            "accurati.",
        },
        {
          kind: "p",
          text:
            "Questa sezione non limita i diritti che ti sono riconosciuti da norme imperative " +
            "della legge locale.",
        },
      ],
    },
    changes: {
      heading: "Modifica delle condizioni",
      body: [
        {
          kind: "p",
          text:
            "Man mano che il prodotto cambia, cambieranno anche queste condizioni. La data in " +
            "cima alla pagina indica l'ultima modifica.",
        },
        {
          kind: "p",
          text:
            "I cambiamenti sostanziali — per esempio l'attivazione dei pagamenti — saranno " +
            "annunciati in anticipo con una notifica nell'app o via email. Continuare a usare il " +
            "servizio dopo una modifica significa accettare le nuove condizioni.",
        },
      ],
    },
    contact: {
      heading: "Contatti",
      body: [
        {
          kind: "p",
          text:
            "Domande, reclami, richiesta di una copia dei dati o della loro cancellazione: tutto " +
            "a un solo indirizzo, info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "I dati formali della persona giuridica (ragione sociale, registrazione, indirizzo, " +
            "legge applicabile) non esistono ancora; questa sezione sarà aggiornata quando " +
            "esisteranno.",
        },
      ],
    },
  },
};
