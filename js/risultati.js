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

  const rettangoli = disponi(d.temi.map(t => t.contributi.length), larghezza, altezza);
  const nascosti = [];
  const riquadri = d.temi.map((t, i) => {
    const r = rettangoli[i];
    const w = r.w - SPAZIO, h = r.h - SPAZIO;
    const n = t.contributi.length;
    // Il carattere cresce con il riquadro, entro un minimo e un massimo che lo tengono leggibile.
    const corpo = Math.max(CORPO_MIN + 2, Math.min(stretta ? 24 : 34, Math.sqrt(w * h) * (stretta ? 0.09 : 0.07)));
    const b = el('button', {
      type: 'button',
      class: 'tema' + (t.residuale ? ' residuale' : ''),
      style: { left: r.x + 'px', top: r.y + 'px', width: w + 'px', height: h + 'px' },
      '--f': corpo.toFixed(1) + 'px',
      dataset: { corpo: corpo.toFixed(1) },
      'aria-label': `${t.nome}: ${plurale(n)}. Apri i contributi`,
      onclick: () => apriPannello(d, t, colore, b),
    },
      el('span', { class: 'tema-nome' }, t.nome),
      el('span', { class: 'tema-numero' }, n, el('small', {}, n === 1 ? config.testi.contributoSingolare : config.testi.contributoPlurale)),
    );
    return { b, t };
  });
  mappa.replaceChildren(...riquadri.map(r => r.b));

  // Se il testo non entra nel riquadro lo si riduce per gradi; il nome resta nell'elenco sotto.
  const trabocca = b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1;
  for (const { b, t } of riquadri) {
    let corpo = Number(b.dataset.corpo);
    while (trabocca(b) && corpo > CORPO_MIN) { corpo = Math.max(CORPO_MIN, corpo - 1); b.style.setProperty('--f', corpo + 'px'); }
    if (trabocca(b)) b.classList.add('stretto');
    if (trabocca(b)) { b.classList.add('solo-numero'); nascosti.push({ b, t }); }
  }

  piccoli.replaceChildren(...(nascosti.length ? [
    el('span', {}, 'Riquadri senza nome:'),
    ...nascosti.map(({ b, t }) => el('button', { type: 'button', onclick: () => apriPannello(d, t, colore, b) },
      t.nome, el('span', { class: 'n' }, t.contributi.length))),
  ] : []));
  piccoli.hidden = !nascosti.length;
}

// ── Scheda di un contributo ──
function scheda(c, colore, nomeTema) {
  return el('article', { class: 'scheda', '--c': colore },
    el('p', { class: 'scheda-testo' }, c.testo),
    el('div', { class: 'scheda-piede' },
      el('span', {}, 'Da ' + c.origine),
      nomeTema ? el('span', { class: 'tag tag-tema' }, nomeTema) : null,
      c.dettaglio ? el('span', { class: 'dettaglio' }, c.dettaglio) : null,
    ),
  );
}

// ── Pannello ──
const pannello = document.getElementById('pannello');
let tornaA = null;

function apriPannello(d, tema, colore, origine) {
  const n = tema.contributi.length;
  const perOrigine = {};
  for (const c of tema.contributi) perOrigine[c.origine] = (perOrigine[c.origine] || 0) + 1;
  const dettaglio = Object.entries(perOrigine).map(([o, k]) => `${k} da ${o}`).join(', ');
  const quota = Math.round((n / d.totale) * 100);

  pannello.style.setProperty('--c', colore);
  document.getElementById('p-domanda').textContent = d.titolo;
  document.getElementById('p-tema').textContent = tema.nome;
  document.getElementById('p-conteggio').textContent = `${plurale(n)} su ${d.totale} (${quota}%) · ${dettaglio}`;
  const lista = document.getElementById('p-lista');
  lista.replaceChildren(...tema.contributi.map(c => scheda(c, colore)));
  tornaA = origine;
  pannello.showModal();
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
  'I temi sono stati assegnati a mano da LAMA Impresa Sociale, in una sola passata: ogni contributo è contato una volta, nel suo tema principale. ' +
  'Sotto alcuni contributi è riportato un secondo tema o un dettaglio. Non compaiono i contributi rimossi dalla regia. ' +
  `I testi sono riportati come sono stati scritti. Dati aggiornati al ${giorno}.`;

const indice = document.getElementById('indice');
const contenitore = document.getElementById('domande');
const mappe = [];

for (const d of dati.domande) {
  const conf = perTitolo.get(d.titolo) || {};
  const colore = conf.colore || config.colori.bosco;
  const id = 'd-' + (conf.id || d.titolo.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  d.totale = d.temi.reduce((a, t) => a + t.contributi.length, 0);

  indice.append(el('a', { href: '#' + id }, conf.breve || d.titolo, el('span', { class: 'n' }, d.totale)));

  const sezione = el('section', { class: 'domanda', id, '--c': colore },
    el('header', { class: 'd-testa' },
      el('span', { class: 'etichetta' }, d.titolo),
      el('h2', {}, conf.domanda || d.titolo),
      el('p', { class: 'd-numero' }, el('b', {}, d.totale), d.totale === 1 ? config.testi.contributoSingolare : config.testi.contributoPlurale),
    ),
  );

  if (conf.relatori) {
    // Poche domande, quasi tutte su temi diversi: un elenco dice più di una mappa.
    sezione.append(el('div', { class: 'elenco' },
      d.temi.flatMap(t => t.contributi.map(c => scheda(c, colore, t.nome)))));
  } else {
    const mappa = el('div', { class: 'mappa' });
    const piccoli = el('div', { class: 'piccoli', hidden: true });
    sezione.append(
      el('p', { class: 'nota d-aiuto' }, `${d.temi.length} temi. Scegli un riquadro per leggere i contributi.`),
      mappa, piccoli);
    mappe.push(() => disegnaMappa(mappa, piccoli, d, colore));
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
