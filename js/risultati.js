// Pagina dei risultati: una mappa ad aree per domanda, un riquadro per tema,
// grande in proporzione ai contributi che toccano quel tema. Un clic apre i contributi.
// Un contributo può toccare più temi: è contato in ciascuno, quindi le quote sommate superano il 100%.
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

const percentuale = (n, d) => Math.round((n / d.totale) * 100) + '%';
const unita = n => n === 1 ? config.testi.contributoSingolare : config.testi.contributoPlurale;

function disegnaMappa(mappa, piccoli, d) {
  const larghezza = mappa.clientWidth;
  if (!larghezza) return;
  const stretta = larghezza < 600;
  const altezza = Math.round(stretta ? Math.min(larghezza * 1.25, 560) : Math.min(larghezza * 0.5, 540));
  mappa.style.height = altezza + 'px';

  const rettangoli = disponi(d.temi.map(t => t.contributi.length), larghezza, altezza);
  const nascosti = [];
  const riquadri = d.temi.map((t, i) => {
    const r = rettangoli[i];
    const w = r.w - SPAZIO, h = r.h - SPAZIO;
    const n = t.contributi.length;
    const quota = percentuale(n, d);
    // Il carattere cresce con il riquadro, entro un minimo e un massimo che lo tengono leggibile.
    const corpo = Math.max(CORPO_MIN + 2, Math.min(stretta ? 24 : 34, Math.sqrt(w * h) * (stretta ? 0.09 : 0.07)));
    const b = el('button', {
      type: 'button',
      class: 'tema' + (t.residuale ? ' residuale' : ''),
      style: { left: r.x + 'px', top: r.y + 'px', width: w + 'px', height: h + 'px' },
      '--f': corpo.toFixed(1) + 'px',
      dataset: { corpo: corpo.toFixed(1), tema: t.nome },
      'aria-label': `${t.nome}: ${plurale(n)}, ${quota}. Apri i contributi`,
      onclick: () => apriPannello(d, t, b),
    },
      el('span', { class: 'tema-nome' }, t.nome),
      el('span', { class: 'tema-numero' }, n, el('small', {}, unita(n), el('span', { class: 'quota' }, ' · ' + quota))),
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
      t.nome, el('span', { class: 'n' }, t.contributi.length))),
  ] : []));
  piccoli.hidden = !nascosti.length;
}

// ── Scheda di un contributo ──
// Sotto il testo, gli altri temi che il contributo tocca: ciascuno apre i contributi di quel tema.
// temaCorrente: il tema del pannello aperto, che non serve ripetere.
function scheda(c, d, temaCorrente) {
  const altri = c.temi.filter(t => t !== temaCorrente);
  return el('article', { class: 'scheda', '--c': d.colore },
    el('p', { class: 'scheda-testo' }, c.testo),
    altri.length ? el('div', { class: 'scheda-piede' },
      el('span', {}, 'Tocca anche'),
      altri.map(nome => el('button', {
        type: 'button', class: 'tag tag-tema', title: `Apri i contributi su «${nome}»`,
        onclick: () => apriPannello(d, d.perNome.get(nome)),
      }, nome)),
    ) : null,
  );
}

// Domande ai relatori: testo e tema, senza collegamenti.
function schedaRelatori(c, d) {
  return el('article', { class: 'scheda', '--c': d.colore },
    el('p', { class: 'scheda-testo' }, c.testo),
    el('p', { class: 'scheda-piede tema-relatori' }, c.temi.join(' · ')),
  );
}

// ── Pannello ──
const pannello = document.getElementById('pannello');
let tornaA = null;

function apriPannello(d, tema, origine) {
  const n = tema.contributi.length;
  pannello.style.setProperty('--c', d.colore);
  document.getElementById('p-domanda').textContent = d.titolo;
  document.getElementById('p-tema').textContent = tema.nome;
  document.getElementById('p-conteggio').textContent = `${plurale(n)} su ${d.totale} (${percentuale(n, d)})`;
  const lista = document.getElementById('p-lista');
  lista.replaceChildren(...tema.contributi.map(c => scheda(c, d, tema.nome)));

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

// ── Testi della pagina ──
const giorno = (iso, opzioni = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', opzioni);
const q = dati.raccolta.questionario, b = dati.raccolta.bacheca;
const relatori = dati.domande.find(d => perTitolo.get(d.titolo)?.relatori);
const nRelatori = relatori ? relatori.contributi.length : 0;

document.getElementById('titolo').textContent = config.evento.titolo;
document.getElementById('sottotitolo').textContent = config.evento.sottotitolo;
document.getElementById('intro').textContent =
  `${dati.totale} contributi sul futuro di Vallombrosa, raggruppati per domanda e per tema.`;

document.getElementById('m-raccolta').textContent =
  'Le stesse quattro domande sono state poste in due modi: un questionario online, ' +
  `a cui hanno risposto ${q.persone} persone tra il ${giorno(q.dal, { day: 'numeric' })} e il ${giorno(q.al, { day: 'numeric', month: 'long' })} ` +
  `(${q.contributi} contributi), e una bacheca digitale aperta al pubblico durante l’incontro ` +
  `(${b.contributi} contributi, di cui ${nRelatori} domande ai relatori).`;
document.getElementById('m-codifica').textContent =
  'LAMA Impresa Sociale ha letto ogni contributo e gli ha assegnato a mano un tema principale e, ' +
  'quando ne tocca altri, uno o più temi aggiuntivi. I temi sono stati definiti a partire dai testi, domanda per domanda. ' +
  'Sono esclusi le prove e i contributi inviati due volte.';
document.getElementById('m-lettura').textContent =
  'Ogni riquadro conta i contributi che toccano quel tema: un contributo può stare in più riquadri, ' +
  'quindi le percentuali di una domanda sommate superano il 100%. In grigio le risposte che non rientrano in un tema. ' +
  'I numeri dicono quanto un tema ricorre tra chi ha partecipato, non rappresentano l’opinione della popolazione. ' +
  'Cliccando un riquadro si leggono i testi, riportati come sono stati scritti e senza nomi.';
document.getElementById('piede-nota').textContent =
  `A cura di LAMA Impresa Sociale. Dati aggiornati al ${giorno(dati.aggiornato)}.`;

// ── Domande ──
const indice = document.getElementById('indice');
const contenitore = document.getElementById('domande');
const mappe = [];

for (const d of dati.domande) {
  const conf = perTitolo.get(d.titolo) || {};
  d.colore = conf.colore || config.colori.bosco;
  const id = 'd-' + (conf.id || d.titolo.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  d.totale = d.contributi.length;
  d.perNome = new Map(d.temi.map(t => [t.nome, t]));
  // Contributi di ogni tema: prima quelli che lo hanno come tema principale, poi quelli che lo toccano.
  for (const t of d.temi) t.contributi = [];
  for (const c of d.contributi) d.perNome.get(c.temi[0]).contributi.push(c);
  for (const c of d.contributi) for (const altro of c.temi.slice(1)) d.perNome.get(altro).contributi.push(c);
  d.temi.sort((x, y) => (x.residuale ? 1 : 0) - (y.residuale ? 1 : 0) || y.contributi.length - x.contributi.length);

  indice.append(el('a', { href: '#' + id }, conf.breve || d.titolo, el('span', { class: 'n' }, d.totale)));

  const sezione = el('section', { class: 'domanda', id, '--c': d.colore },
    el('header', { class: 'd-testa' },
      el('span', { class: 'etichetta' }, d.titolo),
      el('h2', {}, conf.domanda || d.titolo),
      el('p', { class: 'd-numero' }, el('b', {}, d.totale), unita(d.totale)),
    ),
  );

  if (conf.relatori) {
    // Domande quasi tutte su temi diversi: un elenco dice più di una mappa.
    sezione.append(el('div', { class: 'elenco' }, d.contributi.map(c => schedaRelatori(c, d))));
  } else {
    const mappa = el('div', { class: 'mappa' });
    const piccoli = el('div', { class: 'piccoli', hidden: true });
    sezione.append(el('p', { class: 'nota d-aiuto' }, `${d.temi.length} temi. Scegli un riquadro per leggere i contributi.`), mappa, piccoli);
    mappe.push(() => disegnaMappa(mappa, piccoli, d));
  }
  contenitore.append(sezione);
}

// Le mappe si ridisegnano quando cambia la larghezza della pagina.
let larghezzaNota = 0;
function disegnaTutte() {
  larghezzaNota = contenitore.clientWidth;
  for (const disegna of mappe) disegna();
}
disegnaTutte();
new ResizeObserver(() => { if (contenitore.clientWidth !== larghezzaNota) disegnaTutte(); }).observe(contenitore);
