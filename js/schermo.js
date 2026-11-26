// Schermo per il proiettore. Cosa mostrare lo decide la regia (documento stato/schermo).
import {
  config, T, applicaColori, apriStore, domanda, domande, plurale, partiScheda, piuVecchiPrima, indirizzoApp, el, riconcilia,
  applicaTestiDomande,
} from './comune.js';
import qrcode from './vendor/qrcode.js';

window.bachecaAvviata = true; // vedi js/avvio.js
applicaColori();
for (const n of document.querySelectorAll('[data-t]')) n.textContent = T[n.dataset.t] ?? '';
for (const n of document.querySelectorAll('[data-config]')) {
  n.textContent = n.dataset.config.split('.').reduce((o, k) => o?.[k], config) ?? '';
}
const $ = id => document.getElementById(id);
const anteprima = new URLSearchParams(location.search).has('anteprima');

// ── QR code ────────────────────────────────────────────────────────────────
const indirizzo = indirizzoApp();
const qr = qrcode(0, 'M');
qr.addData(indirizzo);
qr.make();
const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'QR code per aprire la bacheca' });
for (const id of ['qr-grande', 'qr-piccolo']) { const t = document.createElement('template'); t.innerHTML = svg; $(id).replaceChildren(t.content); }
$('url-grande').textContent = indirizzo.replace(/^https?:\/\//, '').replace(/\/$/, '');

// ── Dati ───────────────────────────────────────────────────────────────────
let contributi = [];
let temi = [];
let stato = { modo: 'accoglienza' };

const store = await apriStore();
store.ascoltaContributi(l => { contributi = l.filter(c => !c.rimosso); disegna(); });
store.ascoltaTemi(l => { temi = l; disegna(); });
store.ascoltaSchermo(s => { stato = s && s.modo ? s : { modo: 'accoglienza' }; disegna(); });
store.ascoltaTestiDomande?.(testi => { applicaTestiDomande(testi); nodiBacheca.clear(); firmaPagine = ''; disegna(); });

const palco = document.querySelector('.palco');
let modoMostrato = null;

function disegna() {
  const modo = ['accoglienza', 'evidenza', 'temi', 'bacheca'].includes(stato.modo) ? stato.modo : 'accoglienza';
  for (const s of document.querySelectorAll('.modo')) s.hidden = s.dataset.modo !== modo;
  palco.className = 'palco ' + modo;
  if (modoMostrato !== modo) { modoMostrato = modo; pagina = 0; firmaPagine = ''; }
  if (modo === 'evidenza') disegnaEvidenza();
  if (modo === 'temi') disegnaTemi();
  if (modo === 'bacheca') disegnaBacheca();
}

// ── Totale e in evidenza (a pagine, se sono tanti) ─────────────────────────
let pagine = [];
let pagina = 0;
let firmaPagine = '';

function impagina(lista) {
  // Al massimo 3 contributi per pagina e circa 420 caratteri in tutto.
  const out = [];
  let corrente = [];
  let caratteri = 0;
  for (const c of lista) {
    const n = c.testo.length;
    if (corrente.length && (corrente.length >= 3 || caratteri + n > 420)) { out.push(corrente); corrente = []; caratteri = 0; }
    corrente.push(c);
    caratteri += n;
  }
  if (corrente.length) out.push(corrente);
  return out;
}

function disegnaEvidenza() {
  $('e-numero').textContent = String(contributi.length);
  $('e-etichetta').textContent = plurale(contributi.length).replace(/^\d+\s/, '');
  const ev = contributi.filter(c => c.evidenza).sort(piuVecchiPrima);
  const firma = ev.map(c => c.id + c.testo + c.tema).join('|');
  if (firma !== firmaPagine) {
    firmaPagine = firma;
    pagine = impagina(ev);
    if (pagina >= pagine.length) pagina = 0;
  }
  $('e-vuoto').hidden = ev.length > 0;
  mostraPagina();
}

function mostraPagina() {
  const lista = $('e-lista');
  const p = pagine[pagina] || [];
  const totale = p.reduce((n, c) => n + c.testo.length, 0);
  lista.className = 'e-lista ' + (totale <= 140 ? 'grande' : totale <= 280 ? 'medio' : 'piccolo');
  const nomiTemi = new Map(temi.map(t => [t.id, t.nome]));
  lista.replaceChildren(...p.map(c => {
    const s = partiScheda({ ...c, evidenza: false, inAttesa: false }, nomiTemi.get(c.tema) || null);
    return el('article', { class: 'scheda', '--c': s.colore }, s.testa, s.testo, s.piede);
  }));
  // Ricrea il nodo per far ripartire l'animazione di entrata.
  lista.style.animation = 'none'; void lista.offsetWidth; lista.style.animation = '';
  $('e-pagine').replaceChildren(...(pagine.length > 1 ? pagine.map((_, i) => el('span', { class: i === pagina ? 'attiva' : '' })) : []));
}

setInterval(() => {
  if (modoMostrato !== 'evidenza' || pagine.length < 2) return;
  pagina = (pagina + 1) % pagine.length;
  mostraPagina();
}, 14000);

// ── Temi di una domanda ────────────────────────────────────────────────────
function disegnaTemi() {
  const d = domanda(stato.domanda) || domande[0];
  $('t-testa').style.setProperty('--c', d.colore);
  $('t-etichetta').textContent = d.titolo;
  $('t-domanda').textContent = d.domanda;
  const suoi = contributi.filter(c => c.domanda === d.id);
  const conteggi = new Map();
  for (const c of suoi) if (c.tema) conteggi.set(c.tema, (conteggi.get(c.tema) || 0) + 1);
  const lista = temi.filter(t => t.domanda === d.id && conteggi.get(t.id))
    .map(t => ({ ...t, n: conteggi.get(t.id) }))
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'it'));
  const massimo = Math.max(1, ...lista.map(t => t.n));
  const barre = $('t-barre');
  barre.classList.toggle('molti', lista.length > 6);
  barre.style.setProperty('--c', d.colore);
  barre.replaceChildren(...lista.slice(0, 10).map(t => el('li', { class: 't-barra' },
    el('span', { class: 't-nome' }, t.nome),
    el('span', { class: 't-conteggio' }, String(t.n)),
    el('div', { class: 't-traccia' }, el('div', { class: 't-riempimento', style: { width: `${(t.n / massimo) * 100}%` } })),
  )));
  const senza = suoi.filter(c => !c.tema).length;
  const nota = [];
  if (!lista.length) nota.push(T.schermoNessunTema);
  nota.push(plurale(suoi.length));
  if (senza && lista.length) nota.push(`${T.schermoSenzaTema.toLowerCase()}: ${senza}`);
  $('t-nota').textContent = nota.join(' · ');
}

// ── Bacheca: tutti i contributi, dal più recente ──────────────────────────
const nodiBacheca = new Map();
const vistiBacheca = new Set();
let bachecaCaricata = false;
function disegnaBacheca() {
  const d = domanda(stato.domanda);
  const tutti = d ? contributi.filter(c => c.domanda === d.id) : contributi;
  const lista = tutti.slice().sort((a, b) => (b.creato || 0) - (a.creato || 0)).slice(0, 60);
  $('b-testa').style.setProperty('--c', d ? d.colore : 'var(--lime)');
  $('b-etichetta').textContent = d ? d.titolo : T.schermoBacheca;
  $('b-conteggio').textContent = plurale(tutti.length);
  const nomiTemi = new Map(temi.map(t => [t.id, t.nome]));
  const nodi = lista.map(c => {
    const nomeTema = nomiTemi.get(c.tema) || null;
    const firma = [c.testo, c.nome, c.creato, nomeTema, c.fatta, c.origine, !!d].join('|');
    let v = nodiBacheca.get(c.id);
    if (!v || v.firma !== firma) {
      const p = partiScheda({ ...c, evidenza: false, inAttesa: false }, nomeTema, { etichetta: !d });
      const nodo = el('article', { class: 'b-scheda', '--c': p.colore }, p.testa, p.testo, p.piede);
      if (bachecaCaricata && !vistiBacheca.has(c.id)) nodo.classList.add('nuova');
      v = { firma, nodo };
      nodiBacheca.set(c.id, v);
    }
    vistiBacheca.add(c.id);
    return v.nodo;
  });
  riconcilia($('b-griglia'), nodi);
  $('b-vuoto').hidden = lista.length > 0;
  bachecaCaricata = true;
  adattaBacheca();
}

// Se i contributi non entrano, rimpicciolisce il testo un passo alla volta (fino a circa due terzi).
// Quelli che non entrano comunque restano fuori: si vedono sempre i più recenti.
function adattaBacheca() {
  const g = $('b-griglia');
  let scala = 1;
  g.style.setProperty('--scala', scala);
  while (g.scrollWidth > g.clientWidth + 2 && scala > 0.64) {
    scala = Math.round((scala - 0.06) * 100) / 100;
    g.style.setProperty('--scala', scala);
  }
}
addEventListener('resize', () => { if (modoMostrato === 'bacheca') adattaBacheca(); });

// ── Proiettore: tutto schermo e cursore nascosto ───────────────────────────
if (!anteprima) {
  const tuttoSchermo = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') tuttoSchermo(); });
  addEventListener('dblclick', tuttoSchermo);
  const sugg = $('suggerimento');
  sugg.hidden = false;
  setTimeout(() => { sugg.hidden = true; }, 5000);
  let timer;
  addEventListener('mousemove', () => {
    document.body.classList.remove('nascondi-cursore');
    clearTimeout(timer);
    timer = setTimeout(() => document.body.classList.add('nascondi-cursore'), 2500);
  });
}
