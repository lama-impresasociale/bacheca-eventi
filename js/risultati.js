// Pagina dei risultati: una mappa ad aree per domanda, un riquadro per tema,
// grande in proporzione al numero di contributi. Un clic apre i contributi del tema.
// I dati sono una fotografia statica (js/dati-risultati.js), non letti da Firestore.
import { config, applicaColori, domande as domandeConfig, el, icona, plurale } from './comune.js';
import dati from './dati-risultati.js';

applicaColori();

const perTitolo = new Map(domandeConfig.map(d => [d.titolo, d]));
const SPAZIO = 3; // pixel tra un riquadro e l'altro
const CORPO_MIN = 13; // carattere più piccolo ammesso per il nome di un tema

// ── Mappa ad aree "squadrata": riquadri il più possibile vicini al quadrato ──
function disponi(valori, larghezza, altezza) {
  const totale = valori.reduce((a, b) => a + b, 0);
  const scala = (larghezza * altezza) / totale;
  const aree = valori.map(v => v * scala);
  const rettangoli = [];
  let x = 0, y = 0, w = larghezza, h = altezza, i = 0;

  const peggiore = (riga, lato) => {
    const somma = riga.reduce((a, b) => a + b, 0);
    const max = Math.max(...riga), min = Math.min(...riga);
    return Math.max((lato * lato * max) / (somma * somma), (somma * somma) / (lato * lato * min));
  };

  while (i < aree.length) {
    const lato = Math.min(w, h);
    const riga = [aree[i]];
    let j = i + 1;
    while (j < aree.length && peggiore([...riga, aree[j]], lato) <= peggiore(riga, lato)) riga.push(aree[j++]);
    const somma = riga.reduce((a, b) => a + b, 0);
    const spessore = somma / lato;
    let passo = 0;
    for (const a of riga) {
      const lungo = a / spessore;
      rettangoli.push(w >= h
        ? { x, y: y + passo, w: spessore, h: lungo }
        : { x: x + passo, y, w: lungo, h: spessore });
      passo += lungo;
    }
    if (w >= h) { x += spessore; w -= spessore; } else { y += spessore; h -= spessore; }
    i = j;
  }
  return rettangoli;
}

function disegnaMappa(mappa, piccoli, d, colore) {
  const larghezza = mappa.clientWidth;
  if (!larghezza) return;
  const stretta = larghezza < 600;
  const altezza = Math.round(stretta ? Math.min(larghezza * 1.25, 560) : Math.min(larghezza * 0.5, 540));
  mappa.style.height = altezza + 'px';

  // Vista «tema principale»: ogni contributo conta una volta. Vista «tutte le menzioni»: conta anche dove è citato come altro tema.
  const conta = t => vista === 'menzioni' ? t.principali.length + t.citazioni.length : t.principali.length;
  const temi = d.temi.filter(t => conta(t) > 0).sort((x, y) => (x.residuale ? 1 : 0) - (y.residuale ? 1 : 0) || conta(y) - conta(x));

  const rettangoli = disponi(temi.map(conta), larghezza, altezza);
  const nascosti = [];
  const riquadri = temi.map((t, i) => {
    const r = rettangoli[i];
    const w = r.w - SPAZIO, h = r.h - SPAZIO;
    const n = conta(t);
    const quota = Math.round((n / d.totale) * 100) + '%';
    // Il carattere cresce con il riquadro, entro un minimo e un massimo che lo tengono leggibile.
    const corpo = Math.max(CORPO_MIN + 2, Math.min(stretta ? 24 : 34, Math.sqrt(w * h) * (stretta ? 0.09 : 0.07)));
    const b = el('button', {
      type: 'button',
      class: 'tema' + (t.residuale ? ' residuale' : ''),
      style: { left: r.x + 'px', top: r.y + 'px', width: w + 'px', height: h + 'px' },
      '--f': corpo.toFixed(1) + 'px',
      dataset: { corpo: corpo.toFixed(1), tema: t.nome },
      'aria-label': `${t.nome}: ${plurale(n)}, ${quota} dei contributi. Apri i contributi`,
      onclick: () => apriPannello(d, t, b),
    },
      el('span', { class: 'tema-nome' }, t.nome),
      el('span', { class: 'tema-numero' }, n,
        el('small', {}, n === 1 ? config.testi.contributoSingolare : config.testi.contributoPlurale, el('span', { class: 'quota' }, ' · ' + quota))),
    );
    return { b, t };
  });
  mappa.replaceChildren(...riquadri.map(r => r.b));

  // Se il testo non entra nel riquadro lo si riduce per gradi; il nome resta nell'elenco sotto.
  const trabocca = b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1;
  for (const { b, t } of riquadri) {
    let corpo = Number(b.dataset.corpo);
    while (trabocca(b) && corpo > CORPO_MIN) { corpo = Math.max(CORPO_MIN, corpo - 1); b.style.setProperty('--f', corpo + 'px'); }
    if (trabocca(b)) b.classList.add('senza-quota');
    if (trabocca(b)) b.classList.add('stretto');
    if (trabocca(b)) { b.classList.add('solo-numero'); nascosti.push({ b, t }); }
  }

  piccoli.replaceChildren(...(nascosti.length ? [
    el('span', {}, 'Riquadri senza nome:'),
    ...nascosti.map(({ b, t }) => el('button', { type: 'button', onclick: () => apriPannello(d, t, b) },
      t.nome, el('span', { class: 'n' }, conta(t)))),
  ] : []));
  piccoli.hidden = !nascosti.length;
}

// ── Scheda di un contributo ──
// I temi sono tag cliccabili (aprono i contributi di quel tema); i dettagli sono note, non cliccabili.
// temaCorrente: il tema del pannello aperto, che non serve ripetere.
function scheda(c, d, { temaCorrente = null, cliccabili = true } = {}) {
  const tagTema = (nome, principale) => {
    const contenuto = [nome, principale ? el('span', { class: 'visivamente-nascosto' }, ' (tema principale)') : null];
    const classe = 'tag tag-tema' + (principale ? ' principale' : '');
    return cliccabili
      ? el('button', { type: 'button', class: classe, title: `Apri i contributi su «${nome}»`, onclick: () => apriPannello(d, d.perNome.get(nome)) }, contenuto)
      : el('span', { class: classe }, contenuto);
  };
  const temi = [c.tema, ...(c.altri || [])];
  return el('article', { class: 'scheda', '--c': d.colore },
    el('p', { class: 'scheda-testo' }, c.testo),
    el('div', { class: 'scheda-piede' },
      el('span', {}, 'Da ' + c.origine),
      temi.filter(t => t !== temaCorrente).map(t => tagTema(t, t === c.tema)),
      (c.dettaglio || []).map(v => el('span', { class: 'tag tag-altro' }, v)),
    ),
  );
}

// ── Pannello ──
const pannello = document.getElementById('pannello');
let tornaA = null;

function apriPannello(d, tema, origine) {
  const n = tema.principali.length, m = tema.citazioni.length;
  const perOrigine = {};
  for (const c of tema.principali) perOrigine[c.origine] = (perOrigine[c.origine] || 0) + 1;
  const dettaglio = Object.entries(perOrigine).map(([o, k]) => `${k} da ${o}`).join(', ');
  const quota = Math.round((n / d.totale) * 100);

  pannello.style.setProperty('--c', d.colore);
  document.getElementById('p-domanda').textContent = d.titolo;
  document.getElementById('p-tema').textContent = tema.nome;
  document.getElementById('p-conteggio').textContent = [
    n ? `${plurale(n)} su ${d.totale} (${quota}%) · ${dettaglio}` : 'Nessun contributo lo ha come tema principale',
    m ? `citato in altri ${m}` : null,
  ].filter(Boolean).join(' · ');

  const lista = document.getElementById('p-lista');
  const gruppo = (titolo, contributi) => contributi.length ? [
    titolo ? el('h3', { class: 'p-gruppo' }, titolo) : null,
    ...contributi.map(c => scheda(c, d, { temaCorrente: tema.nome })),
  ] : [];
  lista.replaceChildren(...[
    ...gruppo(m && n ? `Tema principale · ${n}` : null, tema.principali),
    ...gruppo(`Citato come altro tema · ${m}`, tema.citazioni),
  ].filter(Boolean));

  // Aprendo un tema da un tag il pannello è già aperto: si aggiorna soltanto.
  if (origine) tornaA = origine;
  if (!pannello.open) pannello.showModal();
  lista.scrollTop = 0;
  lista.focus();
}

document.getElementById('p-chiudi-alto').append(icona('chiudi'));
document.getElementById('p-chiudi-alto').addEventListener('click', () => pannello.close());
document.getElementById('p-chiudi').addEventListener('click', () => pannello.close());
// Un clic fuori dal pannello (sullo sfondo) lo chiude.
pannello.addEventListener('click', e => { if (e.target === pannello) pannello.close(); });
pannello.addEventListener('close', () => { if (tornaA && tornaA.isConnected) tornaA.focus(); });

// ── Pagina ──
document.getElementById('titolo').textContent = config.evento.titolo;
document.getElementById('sottotitolo').textContent = config.evento.sottotitolo;
document.getElementById('intro').textContent =
  `${dati.totale} contributi raccolti con il questionario prima dell’incontro e con la bacheca durante l’incontro, ` +
  'raggruppati per domanda e per tema. Ogni riquadro è un tema: più è grande, più contributi contiene.';
const giorno = new Date(dati.aggiornato + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
document.getElementById('nota-metodo').textContent =
  'I temi sono stati assegnati a mano da LAMA Impresa Sociale: ogni contributo ha un tema principale e, quando ne tocca altri, uno o più altri temi. ' +
  'Sotto ogni contributo, i tag sottolineati sono gli altri temi e aprono i contributi che ne parlano; quelli con il contorno sono dettagli. Non compaiono i contributi rimossi dalla regia. ' +
  `I testi sono riportati come sono stati scritti. Dati aggiornati al ${giorno}.`;

const indice = document.getElementById('indice');
const contenitore = document.getElementById('domande');
const mappe = [];

// Vista delle mappe: 'principale' (ogni contributo conta una volta) o 'menzioni' (conta anche gli altri temi).
let vista = 'principale';
const SPIEGA = {
  principale: 'Ogni contributo è contato una volta, nel suo tema principale.',
  menzioni: 'Ogni contributo è contato in tutti i temi che tocca: le quote sommate superano il 100%.',
};

for (const d of dati.domande) {
  const conf = perTitolo.get(d.titolo) || {};
  d.colore = conf.colore || config.colori.bosco;
  const id = 'd-' + (conf.id || d.titolo.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  d.totale = d.contributi.length;
  d.perNome = new Map(d.temi.map(t => [t.nome, t]));
  for (const t of d.temi) { t.principali = []; t.citazioni = []; }
  for (const c of d.contributi) {
    d.perNome.get(c.tema).principali.push(c);
    for (const altro of c.altri || []) d.perNome.get(altro).citazioni.push(c);
  }

  indice.append(el('a', { href: '#' + id }, conf.breve || d.titolo, el('span', { class: 'n' }, d.totale)));

  const sezione = el('section', { class: 'domanda', id, '--c': d.colore },
    el('header', { class: 'd-testa' },
      el('span', { class: 'etichetta' }, d.titolo),
      el('h2', {}, conf.domanda || d.titolo),
      el('p', { class: 'd-numero' }, el('b', {}, d.totale), d.totale === 1 ? config.testi.contributoSingolare : config.testi.contributoPlurale),
    ),
  );

  if (conf.relatori) {
    // Domande quasi tutte su temi diversi: un elenco dice più di una mappa.
    sezione.append(el('div', { class: 'elenco' }, d.contributi.map(c => scheda(c, d, { cliccabili: false }))));
  } else {
    const mappa = el('div', { class: 'mappa' });
    const piccoli = el('div', { class: 'piccoli', hidden: true });
    const aiuto = el('p', { class: 'nota d-aiuto' });
    sezione.append(aiuto, mappa, piccoli);
    mappe.push(() => {
      const n = d.temi.filter(t => vista === 'menzioni' ? t.principali.length + t.citazioni.length : t.principali.length).length;
      aiuto.textContent = `${n} temi. ${SPIEGA[vista]} Scegli un riquadro per leggere i contributi.`;
      disegnaMappa(mappa, piccoli, d, d.colore);
    });
  }
  contenitore.append(sezione);
}

// Selettore della vista, in testa alla pagina
const selettore = document.getElementById('vista');
const pulsantiVista = Object.entries({ principale: 'Tema principale', menzioni: 'Tutte le menzioni' }).map(([valore, testo]) =>
  el('button', { type: 'button', dataset: { vista: valore }, onclick: () => { vista = valore; aggiornaVista(); disegnaTutte(); } }, testo));
selettore.append(el('span', { class: 'v-etichetta' }, 'Conta i contributi per'), ...pulsantiVista);
function aggiornaVista() {
  for (const p of pulsantiVista) p.setAttribute('aria-pressed', String(p.dataset.vista === vista));
}
aggiornaVista();

// Le mappe si ridisegnano quando cambia la larghezza della pagina.
let larghezzaNota = 0;
function disegnaTutte() {
  larghezzaNota = contenitore.clientWidth;
  for (const disegna of mappe) disegna();
}
disegnaTutte();
new ResizeObserver(() => { if (contenitore.clientWidth !== larghezzaNota) disegnaTutte(); }).observe(contenitore);
