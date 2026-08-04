// Italian privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyIt: PrivacyDoc = {
  title: "Informativa sulla privacy",
  lead:
    "Agradex è una piattaforma che monitora i campi coltivati con immagini satellitari, dati " +
    "meteo e intelligenza artificiale. Questa pagina non è un modello legale: spiega, così " +
    "com'è, che cosa il sistema raccoglie su di te, dove lo conserva, a chi lo invia e che cosa " +
    "succede quando chiudi l'account.",
  summary: [
    "Tutti i dati sono conservati nell'UE — su un unico server a Helsinki, Finlandia, in un database Postgres che gestiamo noi. Un'eccezione: il testo e le immagini inviati all'analisi AI escono dall'UE durante l'elaborazione — vedi “Subresponsabili” più sotto.",
    "Non c'è alcun tracker pubblicitario, pixel di analisi o cookie di terze parti; per questo non c'è nemmeno il banner di consenso.",
    "All'IA vanno i dati del campo, non quelli dell'account: nome, email e hash della password non vengono mai inviati al fornitore del modello.",
    "L'unica email ricorrente è il riepilogo settimanale (il mercoledì); ti disiscrivi con un clic.",
    "Chiudere l'account cancella la persona ma conserva le registrazioni che hai scritto — non puntano più a nessuno.",
  ],
  sections: {
    scope: {
      heading: "Che cosa copre questo documento",
      body: [
        {
          kind: "p",
          text:
            "L'informativa vale per agradex.com (il sito vetrina), app.agradex.com " +
            "(l'applicazione) e la web app installabile (PWA). Girano tutti sullo stesso server " +
            "e sullo stesso database.",
        },
        {
          kind: "p",
          text:
            "Diciamolo subito, per onestà: Agradex è ancora in sviluppo e dietro al prodotto non " +
            "è stata dichiarata alcuna persona giuridica registrata (ragione sociale, numero di " +
            "registrazione, sede legale). Perciò questo documento non indica un titolare del " +
            "trattamento formale. Ogni richiesta sui tuoi dati arriva al team che gestisce la " +
            "piattaforma all'indirizzo info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Il documento riguarda solo il nostro sistema. I collegamenti che portano fuori da " +
            "Agradex (per esempio alle pagine ufficiali delle fonti satellitari) hanno regole " +
            "sulla privacy proprie.",
        },
      ],
    },
    "account-data": {
      heading: "Dati dell'account",
      body: [
        {
          kind: "p",
          text: "Ecco che cosa conserviamo al momento della registrazione e quando cambi le impostazioni:",
        },
        {
          kind: "ul",
          items: [
            "Indirizzo email — è il tuo identificativo di accesso ed è univoco.",
            "Password — solo come hash bcrypt. La password in chiaro non la conserviamo e non possiamo recuperarla.",
            "Nome e cognome (facoltativi), lingua dell'interfaccia, paese e regione.",
            "Ruolo: agricoltore, laboratorio, agronomo consulente o fornitore.",
            "Unità di superficie preferita (ettaro / dönüm / sotka) — se non la scegli, viene derivata dal paese.",
            "Preferenze di notifica (quali canali hai disattivato) e il flag di rinuncia al riepilogo via email.",
            "Per ogni dispositivo su cui attivi le notifiche push, l'abbonamento fornito dal browser (indirizzo di consegna, chiavi di cifratura, stringa del browser) — la riga viene eliminata quando disattivi.",
            "Preferenza di visibilità del nome — se il tuo nome viene mostrato ad altri utenti.",
            "Le risposte al breve questionario del sito vetrina (coltura, paese, regione, problema principale, esigenze), se l'hai compilato prima di registrarti.",
            "Stato della verifica email e un codice temporaneo a 6 cifre — il codice viene cancellato nel momento in cui viene usato.",
            "Momento dell'ultima attività — scritto al massimo una volta all'ora, solo per sapere se l'account è ancora in uso.",
          ],
        },
        {
          kind: "p",
          text:
            "Nel database esiste una colonna per il numero di telefono, ma il modulo di " +
            "registrazione non lo chiede mai: in pratica non raccogliamo numeri di telefono. Non " +
            "raccogliamo alcun dato di carta o di pagamento (vedi «Pacchetti e pagamento» nelle " +
            "Condizioni d'uso).",
        },
      ],
    },
    "field-data": {
      heading: "Dati del campo e dell'azienda",
      body: [
        { kind: "p", text: "La sostanza della piattaforma sono i dati aziendali che inserisci:" },
        {
          kind: "ul",
          items: [
            "Il confine del campo disegnato sulla mappa e la sua superficie (nel database sempre in ettari — la scelta dell'unità riguarda solo la visualizzazione).",
            "Nomi di campo, azienda e organizzazione.",
            "La scheda del campo: coltura, varietà, date di semina e raccolta, tipo di suolo e pH, metodo di irrigazione, fase fenologica, coltura precedente, note libere.",
            "Osservazioni di scouting, foto che carichi e stagioni.",
            "Dati più vecchi che non raccogliamo più ma conserviamo: operazioni di campo, registrazioni di resa, attività, righe di registro/vendite/magazzino/attrezzature e documenti caricati in precedenza. Quelle sezioni sono state rimosse dal prodotto; i tuoi dati esistenti non sono stati cancellati e vengono anonimizzati con gli altri alla chiusura dell'account.",
            "Analisi di laboratorio del suolo — la scansione caricata e i valori letti da essa tramite OCR.",
          ],
        },
        { kind: "p", text: "Oltre a questo, il sistema calcola e conserva:" },
        {
          kind: "ul",
          items: [
            "Le statistiche di 9 indici (NDVI, NDMI e gli altri) per ogni scena e i file raster ritagliati sul tuo campo.",
            "Lo storico meteo, il punteggio di stato del campo, la somma termica (GDD).",
            "Il testo del consiglio dell'IA, i dati da cui è stato generato, quale modello lo ha scritto e in quale lingua.",
            "I messaggi della chat con l'IA, le notifiche, i token dei link di condivisione.",
            "Il conteggio di token e costi dell'uso dell'IA.",
            "Sette eventi di prodotto specifici (questionario avviato, campo creato, coltura impostata, prima scena vista, consiglio letto, Telegram collegato, checklist completata) — questo elenco è fissato nel codice; nient'altro di ciò che fai viene tracciato.",
          ],
        },
      ],
    },
    storage: {
      heading: "Dove stanno i dati",
      body: [
        {
          kind: "p",
          text:
            "Tutto è su un unico server Hetzner a Helsinki (Finlandia, Unione Europea). Il " +
            "database è la nostra installazione di Postgres 16 + PostGIS, che gira in Docker su " +
            "quella macchina. I file che carichi stanno sul disco locale dello stesso server e i " +
            "raster satellitari in una cartella separata sullo stesso disco.",
        },
        {
          kind: "p",
          text:
            "Non usiamo database gestiti di terze parti (per esempio Supabase) né object storage " +
            "di terze parti (S3 e simili): è una scelta architetturale deliberata.",
        },
        {
          kind: "p",
          text:
            "Le copie di backup sono su un server gestito dallo stesso team, all'interno " +
            "dell'Unione Europea. Per i backup non è configurato alcun periodo di conservazione " +
            "formale.",
        },
      ],
    },
    processors: {
      heading: "A chi vengono inviati i dati",
      body: [
        {
          kind: "p",
          text:
            "Questi sono i servizi esterni usati dalla piattaforma. L'elenco è completo: non " +
            "cediamo i tuoi dati a reti pubblicitarie, broker di dati o piattaforme di " +
            "marketing, e non li vendiamo.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "DeepSeek (il modello testuale)",
              v:
                "Consiglio dell'IA, chat e livello di ricerca. Che cosa parte: " +
                "nome del campo, superficie, scheda della coltura (note comprese), andamento " +
                "degli indici, meteo, ultime osservazioni, operazioni, " +
                "sintesi del consiglio precedente e ultimi turni di chat. " +
                "Che cosa non parte: email, nome, hash della password — e nessuna fotografia, " +
                "perché questo modello non è in grado di leggere immagini. L'elaborazione avviene " +
                "sui server di DeepSeek (l'azienda ha sede in Cina).",
            },
            {
              k: "Google (Gemini — solo immagini)",
              v:
                "Etichettatura delle foto, diagnosi di malattie/parassiti e lettura dei referti " +
                "di laboratorio del suolo. Che cosa parte: l'immagine che carichi e la coltura " +
                "del campo. Attenzione: quello che è scritto su una scansione parte insieme a " +
                "essa — il nome del laboratorio, il tuo nome, un indirizzo: a differenza del " +
                "contesto testuale, non siamo noi a scegliere che cosa contiene l'immagine. Al " +
                "modello testuale non viene inviata alcuna fotografia.",
            },
            {
              k: "Resend",
              v:
                "Recapito delle email — indirizzo del destinatario, nome usato nel saluto e " +
                "testo del messaggio. Se configurato, SMTP funge da canale di riserva.",
            },
            {
              k: "Open-Meteo",
              v: "Le coordinate del centro del campo — per la previsione a 7 giorni e l'evapotraspirazione (ET0).",
            },
            { k: "ISRIC SoilGrids", v: "Le coordinate del campo, per ottenere un profilo del suolo." },
            {
              k: "FAOSTAT",
              v: "Statistiche di resa a livello nazionale. Su di te non esce nulla.",
            },
            {
              k: "EPPO",
              v:
                "Solo il nome della coltura, e solo se è configurata una chiave API. Oggi non lo " +
                "è, quindi a questo servizio non parte alcuna richiesta.",
            },
            {
              k: "NASA Earthdata (HLS) e Copernicus Sentinel-2",
              v:
                "I dati arrivano a noi, non partono da te: la ricerca delle scene invia il " +
                "rettangolo che racchiude il campo e un intervallo di date. Account, nome e " +
                "indirizzo non vengono trasmessi.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "Il nome del luogo che digiti nella ricerca sulla mappa (dal browser) e la " +
                "conversione di una coordinata in nome di luogo (dal server).",
            },
            {
              k: "Server delle mappe di base",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap e le tessere " +
                "del rilievo si caricano direttamente nel tuo browser: quei server vedono quindi " +
                "il tuo indirizzo IP e quale area stai guardando.",
            },
            {
              k: "Il servizio push del tuo browser",
              v:
                "Se attivi le notifiche push, il messaggio viene recapitato tramite il servizio " +
                "push del tuo browser (Google, Mozilla o Apple, a seconda del browser). Il testo " +
                "viaggia cifrato, ma il servizio vede l'indirizzo di abbonamento del tuo " +
                "dispositivo.",
            },
            {
              k: "Google (accesso con Google)",
              v:
                "Solo se premi tu «Continua con Google». Cosa va a Google: il tuo browser (quindi il tuo indirizzo IP) e a quale app stai accedendo. Cosa Google restituisce a noi: l’identificatore permanente dell’account, l’indirizzo email, se è verificato e il tuo nome visualizzato. Nulla sui tuoi campi, sulle tue note o sui dati satellitari va a Google. Sulle nostre pagine non viene caricato alcuno script Google — il pulsante è un normale link, quindi finché non lo premi Google non vede che sei sul nostro sito.",
            },
            {
              k: "Telegram",
              v:
                "Solo se colleghi tu stesso il bot. Oggi non è configurato alcun token del bot, " +
                "quindi il canale è inattivo.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Intelligenza artificiale",
      body: [
        {
          kind: "p",
          text:
            "Consigli, chat e ricerca funzionano con il modello testuale di DeepSeek; le immagini " +
            "— l'etichetta della foto, la diagnosi delle malattie e la lettura del referto di " +
            "laboratorio — con Gemini di Google, perché il modello testuale non accetta immagini " +
            "e nessuna vi viene inviata. Il " +
            "contesto inviato al modello riguarda il campo, non la tua identità: il codice che lo " +
            "compone non legge nessuna colonna della tabella degli account. L'eccezione è " +
            "l'immagine stessa: quello che contiene parte con essa, e un referto scansionato ne è " +
            "l'esempio evidente.",
        },
        {
          kind: "p",
          text:
            "Il numero di token e il costo stimato di ogni chiamata all'IA sono registrati nel " +
            "nostro database, per il calcolo delle quote e il controllo dei costi.",
        },
        {
          kind: "p",
          text:
            "Se la chiave dell'IA viene tolta dalla configurazione, il sistema degrada in modo " +
            "ordinato: non vengono generati consigli, la chat non risponde, tutto il resto " +
            "continua a funzionare.",
        },
        {
          kind: "p",
          text:
            "Le risposte dell'IA sono un'analisi automatica e possono essere sbagliate. I loro " +
            "limiti sono descritti a parte nelle Condizioni d'uso.",
        },
      ],
    },
    email: {
      heading: "Email",
      body: [
        {
          kind: "p",
          text:
            "L'unico messaggio ricorrente è il riepilogo settimanale — inviato ogni mercoledì " +
            "alle 07:00 ora di Baku, e tecnicamente non può partire più di una volta a settimana.",
        },
        {
          kind: "p",
          text:
            "A parte questo ci sono solo messaggi transazionali: il codice di verifica, il " +
            "messaggio di benvenuto e il rapporto che arriva quando il tuo campo è pronto per la " +
            "prima volta. Ognuno di questi parte al massimo una volta ogni 24 ore.",
        },
        {
          kind: "p",
          text:
            "In fondo a ogni riepilogo c'è un link di disiscrizione a un clic — senza bisogno di " +
            "accedere. La stessa impostazione si può disattivare dalla pagina dell'account. " +
            "Attenzione: anche dopo la disiscrizione i messaggi transazionali (come il codice di " +
            "verifica) continuano ad arrivare, perché senza di essi l'account non funziona.",
        },
        {
          kind: "p",
          text:
            "Non inviamo email pubblicitarie e non condividiamo il tuo indirizzo con nessuno. " +
            "Per onestà: oggi il testo del riepilogo arriva in inglese a chi legge in turco, " +
            "tedesco, ungherese, italiano e polacco — la traduzione non è ancora pronta.",
        },
      ],
    },
    cookies: {
      heading: "Cookie e memoria del browser",
      body: [
        { kind: "p", text: "I cookie sono tre, tutti funzionali:" },
        {
          kind: "ul",
          items: [
            "bagban_session — la sessione di accesso. httpOnly (JavaScript non lo legge), SameSite=Lax, Secure su https, 7 giorni. Non è usato per nient'altro.",
            "bagban_locale — ricorda la lingua che hai scelto, 1 anno.",
            "bagban_oauth_state — creato solo quando premi «Continua con Google», e solo per proteggere quell'accesso (CSRF). httpOnly, SameSite=Lax, Secure, 10 minuti; eliminato appena l'accesso è concluso.",
          ],
        },
        {
          kind: "p",
          text:
            "Tutto qui. Nel codice non c'è Google Analytics, né Google Tag Manager, né " +
            "Plausible, Hotjar, Mixpanel, PostHog, pixel di Facebook o qualsiasi altro tracker. " +
            "È esattamente per questo che il sito non ti mostra un banner di consenso ai cookie: " +
            "non c'è nulla da chiedere.",
        },
        {
          kind: "p",
          text:
            "A parte questo, la memoria locale del browser conserva alcune preferenze di " +
            "interfaccia: la mappa di base, la modalità risparmio dati, la coda offline, lo stato " +
            "della checklist iniziale e le risposte al questionario compilato prima della " +
            "registrazione. Restano sul tuo dispositivo; le risposte al questionario raggiungono " +
            "il server solo insieme alla richiesta di registrazione.",
        },
      ],
    },
    visibility: {
      heading: "Chi vede i tuoi dati",
      body: [
        {
          kind: "ul",
          items: [
            "Gli altri membri della tua organizzazione — ne vedono i campi in base al proprio ruolo; il permesso è verificato sul server a ogni richiesta.",
            "Un link di condivisione (/s/…) mostra a chiunque lo possieda una scheda del campo deliberatamente minimale e in sola lettura. Puoi revocarlo in qualsiasi momento.",
            "Accesso al campo — se apri un singolo campo a un utente indicato per nome, vedrà solo il report di quel campo (non gli altri campi, l'azienda o il team). Puoi revocarlo in qualsiasi momento, e può farlo anche lui.",
            "Se disattivi la visibilità del nome, sulle superfici viste dagli altri utenti il tuo nome è sostituito da uno pseudonimo «user_…».",
            "I valori di confronto e benchmark non vengono calcolati senza un gruppo di almeno 5 altri campi e non nominano mai un campo o un'azienda specifici.",
            "Il team che gestisce la piattaforma — tramite un pannello di amministrazione vede utilizzo, costi dell'IA e account di tutte le organizzazioni e, in quanto operatore del server, ha accesso tecnico al database.",
          ],
        },
      ],
    },
    retention: {
      heading: "Conservazione e cancellazione",
      body: [
        {
          kind: "p",
          text:
            "Eliminare un campo è una cancellazione «morbida»: sparisce dall'elenco e può essere " +
            "ripristinato, ma non viene rimosso fisicamente dal database.",
        },
        {
          kind: "p",
          text:
            "Chiudere l'account (il pulsante nella pagina dell'account) è irreversibile e fa " +
            "esattamente questo:",
        },
        {
          kind: "ul",
          items: [
            "Per confermare devi digitare a mano il tuo indirizzo email.",
            "Se un'organizzazione di cui sei proprietario ha ancora altri membri attivi, l'operazione viene rifiutata: prima devi cederla.",
            "Tutte le appartenenze vengono eliminate, quindi l'accesso cessa immediatamente.",
            "I campi delle organizzazioni in cui eri l'unico membro vengono cancellati in modo morbido.",
            "L'indirizzo email viene riscritto in un indirizzo interno non recapitabile: questo libera il tuo indirizzo reale, così puoi registrarti di nuovo con esso.",
            "Nome, paese, regione, risposte al questionario e preferenze di notifica vengono azzerati; l'hash della password è sostituito da un valore che nessuna password può produrre; l'account viene disattivato.",
          ],
        },
        {
          kind: "p",
          text:
            "Che cosa resta: le registrazioni che hai scritto — campi, confini, osservazioni, " +
            "righe di registro, rese. Il motivo è tecnico e non lo nascondiamo: quindici tabelle " +
            "fanno riferimento all'utente, e una cancellazione a cascata distruggerebbe la storia " +
            "di un'intera azienda perché una persona se n'è andata. Quelle registrazioni " +
            "rimangono, ma non sono più collegate a una persona identificabile. Il registro " +
            "d'uso, il log degli invii email e le righe degli eventi conservano un identificativo " +
            "utente che non corrisponde più a nessuno.",
        },
        {
          kind: "p",
          text: "Per i dati satellitari e derivati non esiste una scadenza automatica.",
        },
      ],
    },
    rights: {
      heading: "I tuoi diritti e che cosa puoi fare oggi",
      body: [
        { kind: "p", text: "Tutto questo si fa da soli, subito, nella pagina dell'account:" },
        {
          kind: "ul",
          items: [
            "Cambiare la password.",
            "Modificare nome, paese e regione.",
            "Cambiare la lingua dell'interfaccia e l'unità di superficie.",
            "Regolare la matrice delle notifiche (categoria × canale).",
            "Disattivare la visibilità del nome.",
            "Rinunciare al riepilogo via email.",
            "Chiudere l'account.",
          ],
        },
        {
          kind: "p",
          text:
            "I confini dei campi si possono scaricare in GeoJSON o KML dalla schermata di " +
            "creazione del campo.",
        },
        {
          kind: "p",
          text:
            "Non esiste ancora un'esportazione automatica dell'intero account — non lo " +
            "nascondiamo. Se vuoi una copia dei tuoi dati o la loro cancellazione completa, " +
            "scrivi a info@agradex.com e la prepariamo a mano.",
        },
      ],
    },
    changes: {
      heading: "Modifiche",
      body: [
        {
          kind: "p",
          text:
            "Questo documento descrive il sistema, quindi deve cambiare quando cambia il " +
            "sistema. La data dell'ultimo aggiornamento è in cima alla pagina.",
        },
        {
          kind: "p",
          text:
            "Qualsiasi cambiamento sostanziale su che cosa viene raccolto o dove viene inviato " +
            "sarà annunciato in anticipo, con una notifica nell'app o nel riepilogo settimanale.",
        },
      ],
    },
  },
};
