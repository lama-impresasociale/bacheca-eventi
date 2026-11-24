// Dati finti per la modalità demo. I gruppi seguono l'ordine delle domande nel config:
// il primo gruppo va alla prima domanda, il secondo alla seconda, e così via.

const gruppi = [
  [ // 1. Salire senza auto
    ['Treno fino a Sant’Ellero e una navetta che aspetti il treno, non il contrario. Oggi se perdi la coincidenza aspetti un’ora.', 'Giulia'],
    ['Bus diretto da Firenze la domenica mattina, almeno da maggio a ottobre. Oggi devi cambiare a Pontassieve.', ''],
    ['Salirei in bici elettrica se ci fosse un posto sicuro dove lasciarla e ricaricarla in cima.', 'Marco'],
    ['Un biglietto unico treno + navetta, da comprare dal telefono.', 'Elena'],
    ['A piedi dal sentiero di Sant’Ellero: manca la segnaletica e un punto acqua a metà salita.', ''],
    ['Il trenino a cremagliera, ma con orari pensati per chi lavora lassù, non solo per i turisti.', 'Paolo'],
    ['Navetta anche la sera, per chi sale alle cene o agli eventi d’estate.', ''],
    ['Un parcheggio scambiatore a valle grande e gratuito, con la navetta compresa.', 'Francesca'],
    ['Informazioni chiare in un’unica pagina: orari, fermate, coincidenze. Oggi bisogna cercare su tre siti.', ''],
    ['Portabici sui bus della linea per Saltino.', 'Luca'],
    ['Con due bambini piccoli salgo in auto perché non so se troverò posto sulla navetta. Servirebbe la prenotazione.', 'Sara'],
    ['Taxi collettivo a chiamata dalla stazione di Pontassieve.', ''],
  ],
  [ // 2. Cosa fare lassù, tutto l'anno
    ['Ciaspolate guidate in inverno, con noleggio delle racchette a Saltino.', 'Anna'],
    ['Riaprire l’ex albergo chiuso a Saltino come ostello per scuole e gruppi, aperto tutto l’anno.', ''],
    ['Un calendario di concerti d’autunno nell’Abbazia o nel chiostro.', 'Roberto'],
    ['Corsi sul bosco e sul legno con l’Università, aperti anche a chi non è studente.', ''],
    ['Una sala studio con il caminetto: salirei a lavorare da lì una volta a settimana.', 'Chiara'],
    ['Raccolta di funghi e castagne con le guide, e poi si cucina insieme.', ''],
    ['L’Arboreto in autunno è bellissimo: visite guidate nei weekend di ottobre e novembre.', 'Giovanni'],
    ['Uno spazio di coworking con una buona connessione: oggi lassù il segnale è debole.', ''],
    ['Sci di fondo quando c’è neve, ma soprattutto percorsi a piedi battuti e sicuri.', 'Marta'],
    ['Un rifugio aperto il venerdì e il sabato sera, anche d’inverno.', ''],
    ['Ritiri di silenzio e meditazione, in dialogo con i monaci.', 'Lorenzo'],
  ],
  [ // 3. La prima cosa da fare
    ['Mettere insieme Comune, Città Metropolitana, Carabinieri Forestali e monaci attorno a un tavolo stabile.', ''],
    ['Regolare il traffico nei weekend estivi già dalla prossima estate.', 'Stefano'],
    ['Fare l’elenco degli edifici vuoti e capire di chi sono.', ''],
    ['Un orario della navetta integrato con i treni, da subito.', 'Valentina'],
    ['Una persona incaricata, con nome e cognome, che segua il progetto.', ''],
    ['Chiedere a chi ci abita cosa serve davvero, prima di decidere sulla cremagliera.', 'Silvia'],
    ['Trovare i fondi per lo studio di fattibilità.', ''],
    ['Un sito unico per Vallombrosa: cosa fare e come arrivare.', 'Davide'],
  ],
  [ // 4. Cosa non deve succedere
    ['Che si spendano tutti i soldi nel treno e non resti niente per il resto.', ''],
    ['Trasformare il pratone in un grande parcheggio.', 'Federica'],
    ['Altri dodici mesi di sole riunioni senza una decisione.', ''],
    ['Che i residenti vengano coinvolti solo a cose fatte.', 'Alessandro'],
    ['Che chiudano altri esercizi a Saltino.', ''],
    ['Un turismo mordi e fuggi che lascia solo rifiuti.', 'Laura'],
    ['Che la navetta parta e poi venga tagliata dopo una stagione.', ''],
    ['Perdere i bandi europei perché manca un progetto pronto.', 'Matteo'],
  ],
  [ // 5. Domanda ai relatori
    ['Al Comune: quanto costa all’anno tenere attiva la navetta estiva?', 'Pietro'],
    ['Ai ricercatori: avete stimato quante persone userebbero davvero la cremagliera fuori stagione?', ''],
    ['Chi dovrebbe gestire il treno, se si fa? Un ente pubblico o un privato?', 'Elisa'],
    ['Ci sono esempi in Italia di cremagliere riaperte che oggi stanno in piedi economicamente?', ''],
    ['Alla Regione: il servizio di bus può essere potenziato già dal prossimo orario?', 'Giorgio'],
    ['Come pensate di coinvolgere i proprietari delle seconde case?', ''],
  ],
];

// Temi già creati: [indice domanda, nome, indici dei contributi]
const temiIniziali = [
  [0, 'Coincidenze treno e navetta', [0, 5, 6, 11]],
  [0, 'Biglietto e informazioni', [3, 8]],
  [0, 'Bici e a piedi', [2, 4, 9]],
  [1, 'Natura con le guide', [0, 5, 6, 8]],
  [1, 'Spazi da riaprire', [1, 4, 7, 9]],
];

const evidenza = [[0, 0], [1, 1], [2, 1]];
const fatte = [[4, 0], [4, 2]];
const postit = [[0, 11], [2, 6], [3, 4]];

// Contributi che arrivano durante la demo, uno ogni 20 secondi circa.
const arrivi = [
  [0, 'Una navetta che parta anche dalla stazione di Rignano, non solo da Pontassieve.'],
  [1, 'Laboratori per bambini nel bosco durante le vacanze di Natale.'],
  [4, 'Che tempi realistici ci sono per una decisione sulla cremagliera?'],
  [2, 'Rifare la segnaletica dei sentieri principali.'],
  [3, 'Che si decida tutto a Firenze senza chi vive qui.'],
  [1, 'Un mercato dei produttori della montagna una domenica al mese.'],
  [0, 'Il sabato mattina un treno in più: oggi il primo utile arriva tardi.'],
  [2, 'Un tavolo di lavoro con gli albergatori, entro la primavera.'],
  [3, 'Che il bosco venga trattato come uno sfondo per le foto.'],
  [4, 'Il parcheggio di Sant’Ellero può essere ampliato?'],
  [1, 'Più panchine e fontanelle lungo la passeggiata dell’Abbazia.'],
  [0, 'Una carta per i residenti con la navetta scontata.'],
];
const nomi = ['Irene', 'Tommaso', 'Beatrice', 'Nicola', 'Caterina', 'Filippo', '', '', ''];

const nuovoId = () => 'd' + Math.random().toString(36).slice(2, 10);

export function semina(config) {
  const ids = config.domande.map(d => d.id);
  const adesso = Date.now();
  const contributi = [];
  const indice = {}; // "g:i" -> contributo
  let totale = gruppi.reduce((n, g, i) => n + (ids[i] ? g.length : 0), 0);
  let k = 0;
  // Distribuisce gli orari negli ultimi 80 minuti, mescolando le domande.
  const ordine = [];
  gruppi.forEach((g, gi) => g.forEach((_, i) => ordine.push([gi, i])));
  ordine.sort(() => Math.random() - 0.5);
  for (const [gi, i] of ordine) {
    if (!ids[gi]) continue;
    const [testo, nome] = gruppi[gi][i];
    const creato = adesso - Math.round((totale - k) / totale * 80 * 60000) - Math.round(Math.random() * 40000);
    k++;
    const c = { id: nuovoId(), domanda: ids[gi], testo, nome, origine: 'app', creato, aggiornato: creato, tema: null, evidenza: false, rimosso: false, fatta: false };
    indice[`${gi}:${i}`] = c;
    contributi.push(c);
  }
  for (const [g, i] of evidenza) if (indice[`${g}:${i}`]) indice[`${g}:${i}`].evidenza = true;
  for (const [g, i] of fatte) if (indice[`${g}:${i}`]) indice[`${g}:${i}`].fatta = true;
  for (const [g, i] of postit) if (indice[`${g}:${i}`]) indice[`${g}:${i}`].origine = 'post-it';

  const temi = [];
  for (const [g, nome, membri] of temiIniziali) {
    if (!ids[g]) continue;
    const t = { id: nuovoId(), nome, domanda: ids[g], creato: adesso - 20 * 60000 };
    temi.push(t);
    for (const i of membri) if (indice[`${g}:${i}`]) indice[`${g}:${i}`].tema = t.id;
  }
  // Un contributo rimosso, per provare il ripristino.
  if (ids[0]) contributi.push({ id: nuovoId(), domanda: ids[0], testo: 'prova prova aaaa', nome: '', origine: 'app', creato: adesso - 50 * 60000, aggiornato: adesso, tema: null, evidenza: false, rimosso: true, fatta: false });

  return { versione: 1, contributi, temi, schermo: { modo: 'accoglienza', domanda: ids[0] || null }, prossimo: 0 };
}

export function prossimoArrivo(stato, config) {
  const ids = config.domande.map(d => d.id);
  const [g, testo] = arrivi[stato.prossimo % arrivi.length];
  stato.prossimo++;
  if (!ids[g]) return null;
  const adesso = Date.now();
  return { id: nuovoId(), domanda: ids[g], testo, nome: nomi[Math.floor(Math.random() * nomi.length)], origine: 'app', creato: adesso, aggiornato: adesso, tema: null, evidenza: false, rimosso: false, fatta: false };
}

export { nuovoId };
