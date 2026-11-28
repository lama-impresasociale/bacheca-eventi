// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE DELL'EVENTO
//  È l'unico file da modificare per riusare l'app in un altro evento:
//  titolo, testi, domande, colori, limiti e collegamento a Firebase.
// ─────────────────────────────────────────────────────────────────────────────

export default {

  evento: {
    // Identificativo tecnico: separa i dati di questo evento in Firestore.
    // Per un nuovo evento cambialo (solo lettere minuscole, numeri e trattini).
    id: 'vallombrosa-2026',
    titolo: 'Stati Generali di Vallombrosa',
    sottotitolo: 'Sabato 28 novembre 2026, ore 15–18 · Reggello',
    spiegazione: 'Mentre i relatori parlano, scrivi qui idee, proposte e domande. Le raccogliamo e le riportiamo al termine dell’incontro.',
  },

  // Raccolta chiusa: la pagina del pubblico mostra solo un messaggio di chiusura (testi
  // chiusaTitolo e chiusaTesto qui sotto), senza modulo. Per riaprirla o per un nuovo evento: false.
  raccoltaChiusa: true,

  // Indirizzo pubblico dell'app, usato per il QR code sullo schermo.
  // Se lo lasci vuoto viene ricavato da solo dall'indirizzo della pagina.
  indirizzoPubblico: '',

  // Righe di informativa nella schermata di benvenuto (facoltative).
  privacy: {
    // Vuoto: nessuna riga. Per mostrarne, scrivile tra apici separate da virgole.
    righe: [],
    // Facoltativo: indirizzo dell'informativa completa. Se vuoto il link non compare.
    link: '',
  },

  // Colori ricavati dalla presentazione ARCO–LAMA.
  colori: {
    lime: '#CED429',            // accenti, pulsanti, fasce
    bosco: '#074844',           // titoli e testo dei pulsanti
    salvia: '#EEF1E6',          // sfondi leggeri (evidenziazioni)
    testo: '#1A1A1A',           // testo principale
    testoSecondario: '#56625A', // note, orari, etichette
    linea: '#D5DBD0',           // linee sottili e campi
    sfondo: '#FFFFFF',
  },

  // Le opzioni tra cui scegliere. L'ordine è quello mostrato.
  // id: breve, stabile, senza spazi (finisce nel database e nel CSV).
  // relatori: true attiva il segno "fatta" e la vista dedicata in regia.
  domande: [
    {
      id: 'senza-auto',
      titolo: 'Salire senza auto',
      breve: 'Senza auto',
      domanda: 'Cosa dovrebbe esserci perché tu salga a Vallombrosa senza auto?',
      guida: 'Scrivi come arriveresti (treno + navetta, bus, bici, a piedi, trenino...) e la condizione che oggi manca.',
      colore: '#CED429',
    },
    {
      id: 'tutto-anno',
      titolo: 'Cosa fare lassù, tutto l’anno',
      breve: 'Tutto l’anno',
      domanda: 'Cosa ti farebbe salire a Vallombrosa anche in autunno e inverno?',
      guida: 'Un’attività, un servizio, un’esperienza. Se la vedi in un luogo preciso (un edificio vuoto, uno spazio oggi poco usato) scrivi anche quello.',
      colore: '#8FB82E',
    },
    {
      id: 'prima-cosa',
      titolo: 'La prima cosa da fare',
      breve: 'Prima cosa',
      domanda: 'Perché tutto questo funzioni davvero: qual è la prima cosa da fare nei prossimi dodici mesi?',
      guida: 'Una sola priorità.',
      colore: '#5B9E4E',
    },
    {
      id: 'da-evitare',
      titolo: 'Cosa non deve succedere',
      breve: 'Da evitare',
      domanda: 'E invece, cosa non deve succedere nei prossimi dodici mesi?',
      guida: 'Un solo rischio da evitare.',
      colore: '#2E7448',
    },
    {
      id: 'relatori',
      titolo: 'Domanda ai relatori',
      breve: 'Ai relatori',
      domanda: 'Vuoi fare una domanda a chi sta intervenendo?',
      guida: 'Scrivi la domanda e, se vuoi, a chi è rivolta.',
      colore: '#074844',
      relatori: true,
    },
  ],

  limiti: {
    caratteri: 400,        // lunghezza massima di un contributo
    caratteriNome: 60,
    secondiTraInvii: 15,   // anti-spam: attesa minima tra due invii dallo stesso telefono
  },

  // Collegamento a Firebase (Impostazioni progetto → Le tue app → Configurazione SDK).
  // Se apiKey è vuoto l'app funziona in modalità demo, con dati finti.
  firebase: {
    apiKey: 'AIzaSyCX35wEn022CyE4gAxV0G-knrbknUWvek4',
    authDomain: 'bacheca-eventi-lama.firebaseapp.com',
    projectId: 'bacheca-eventi-lama',
    storageBucket: 'bacheca-eventi-lama.firebasestorage.app',
    messagingSenderId: '65422195270',
    appId: '1:65422195270:web:3229d36d8ab5e5b328e847',
  },

  // Testi dell'interfaccia del pubblico e dello schermo.
  testi: {
    // Pubblico (telefono)
    benvenutoNome: 'Il tuo nome',
    benvenutoNomeAiuto: 'Facoltativo. Comparirà accanto a ciò che scrivi.',
    benvenutoNomeSegnaposto: 'Scrivi qui il tuo nome',
    informativaCompleta: 'Informativa completa',
    salta: 'Salta',
    continua: 'Continua',

    sceltaTitolo: 'Su cosa vuoi intervenire?',
    nomeAssente: 'Il tuo nome',           // link in cima alla scelta delle domande
    nomeCambia: 'cambia',
    cambiaDomanda: 'Cambia domanda',
    contributo: 'Il tuo contributo',
    contributoSegnaposto: 'Scrivi qui',
    invia: 'Invia',
    attendi: 'Attendi {s} s',
    inviando: 'Invio in corso',

    inviatoTitolo: 'Grazie. Il tuo contributo è arrivato.',
    inviatoAttesa: 'Sei senza rete. Il contributo partirà appena la connessione torna: tieni aperta questa pagina.',
    erroreInvio: 'Il contributo non è partito. Controlla la connessione e riprova.',
    scriviAncora: 'Scrivi ancora',
    inInvio: 'In invio',

    senzaRete: 'Sei senza rete: quello che invii partirà appena torna la connessione.',
    demo: 'Modalità demo: dati finti, visibili solo in questo browser.',
    erroreCollegamento: 'Non riesco a collegarmi. Riprova tra poco.',

    // Raccolta chiusa (raccoltaChiusa: true)
    chiusaTitolo: 'La raccolta dei contributi è chiusa.',
    chiusaTesto: 'Grazie a chi ha partecipato e ha lasciato il proprio contributo.',

    // Schede dei contributi (conferma, schermo)
    anonimo: 'Anonimo',
    contributoSingolare: 'contributo',
    contributoPlurale: 'contributi',
    inEvidenza: 'In evidenza',
    giaPosta: 'Già posta',
    daPostit: 'Da post-it',

    // Schermo (proiettore)
    schermoInvito: 'Inquadra il codice e scrivi il tuo contributo',
    schermoScriviAnche: 'Scrivi anche tu',
    schermoNessunaEvidenza: 'Qui compariranno i contributi scelti dalla regia.',
    schermoSenzaTema: 'Senza tema',
    schermoNessunTema: 'I temi di questa domanda non sono ancora stati definiti.',
    schermoBacheca: 'Tutti i contributi',
    schermoBachecaVuota: 'Ancora nessun contributo.',
  },
};
