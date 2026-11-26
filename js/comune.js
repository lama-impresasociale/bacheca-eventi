// Utilità comuni alle tre pagine.
import config from '../config.js';

export { config };
export const T = config.testi;

const parametri = new URLSearchParams(location.search);
export const inDemo = parametri.has('demo') || !config.firebase?.apiKey;

// ?evento=prova fa lavorare tutte le pagine su un evento separato (utile per le prove):
// i dati di prova non si mescolano a quelli veri.
const eventoDaIndirizzo = parametri.get('evento');
export const eventoDiProva = eventoDaIndirizzo && /^[a-z0-9-]{1,40}$/.test(eventoDaIndirizzo) && eventoDaIndirizzo !== config.evento.id
  ? eventoDaIndirizzo : null;
if (eventoDiProva) config.evento.id = eventoDiProva;

/** Applica i colori del config come variabili CSS. */
export function applicaColori() {
  const c = config.colori || {};
  const mappa = { lime: '--lime', bosco: '--bosco', salvia: '--salvia', testo: '--testo', testoSecondario: '--testo-2', linea: '--linea', sfondo: '--sfondo' };
  for (const [k, v] of Object.entries(mappa)) if (c[k]) document.documentElement.style.setProperty(v, c[k]);
  document.title = document.title.replace('{evento}', config.evento.titolo);
}

/** Apre il livello dati: demo (dati finti nel browser) o Firebase. */
export async function apriStore() {
  if (inDemo) {
    const m = await import('./store-demo.js');
    return m.creaStoreDemo(config);
  }
  const m = await import('./store-firebase.js');
  return m.creaStoreFirebase(config, { emulatore: parametri.get('emulatore') });
}

/** Mantiene i parametri ?demo / ?emulatore nei link tra le pagine. */
export function conParametri(url) {
  const u = new URL(url, location.href);
  for (const k of ['demo', 'emulatore', 'evento']) if (parametri.has(k)) u.searchParams.set(k, parametri.get(k));
  return u.pathname.split('/').pop() + u.search + u.hash;
}

/** Indirizzo pubblico della pagina partecipante (per il QR). */
export function indirizzoApp() {
  const base = config.indirizzoPubblico || (() => { const u = new URL('./', location.href); return u.origin + u.pathname; })();
  return eventoDiProva ? `${base}?evento=${eventoDiProva}` : base;
}

export const domande = config.domande;
const perId = new Map(domande.map(d => [d.id, d]));
export const domanda = id => perId.get(id);

export function plurale(n, sing = T.contributoSingolare, plur = T.contributoPlurale) {
  return `${n} ${n === 1 ? sing : plur}`;
}

export function ora(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function dataOra(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Crea un elemento. I testi passano sempre come textContent, mai come HTML. */
export function el(tag, attributi = {}, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('--')) e.style.setProperty(k, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const f of figli.flat()) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

// Icone a linea fine (SVG statici, sicuri da inserire come markup).
const percorsi = {
  avanti: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  indietro: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  stella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/>',
  spunta: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
  esterno: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  scarica: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  matita: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  postit: '<path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/>',
  unisci: '<path d="M6 4v5a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6V4M12 15v5"/>',
  cestino: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  ripristina: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/>',
  schermo: '<path d="M3 5h18v11H3zM8 20h8M12 16v4"/>',
  segnale: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><path d="M3 3l18 18"/>',
};

export function icona(nome, classe = '') {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="icona ${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${percorsi[nome] || ''}</svg>`;
  return t.content.firstChild;
}

/**
 * Parti comuni della scheda di un contributo: etichetta della domanda, testo, piede.
 * nomeTema: nome del tema già risolto (o null).
 */
export function partiScheda(c, nomeTema, { etichetta = true } = {}) {
  const d = domanda(c.domanda);
  const testa = etichetta ? el('div', { class: 'scheda-testa' }, el('span', { class: 'etichetta' }, d ? d.titolo : c.domanda)) : null;
  const piede = el('div', { class: 'scheda-piede' },
    el('span', {}, c.nome || T.anonimo, ' · ', ora(c.creato)),
    c.inAttesa ? el('span', { class: 'tag' }, T.inInvio) : null,
    nomeTema ? el('span', { class: 'tag tag-tema' }, nomeTema) : null,
    c.evidenza ? el('span', { class: 'tag' }, icona('stella'), T.inEvidenza) : null,
    c.fatta ? el('span', { class: 'tag' }, icona('spunta'), T.giaPosta) : null,
    c.origine === 'post-it' ? el('span', { class: 'tag' }, icona('postit'), T.daPostit) : null,
  );
  return { testa, testo: el('p', { class: 'scheda-testo' }, c.testo), piede, colore: d ? d.colore : null };
}

/**
 * Mette i nodi nel contenitore nell'ordine dato, spostando solo quelli fuori posto:
 * così un menu aperto o un campo con il cursore non perdono il fuoco.
 */
export function riconcilia(contenitore, nodi) {
  let cursore = contenitore.firstChild;
  for (const n of nodi) {
    if (n === cursore) { cursore = cursore.nextSibling; continue; }
    contenitore.insertBefore(n, cursore);
  }
  while (cursore) { const prossimo = cursore.nextSibling; cursore.remove(); cursore = prossimo; }
}

/** Ordina per data di creazione, dal più recente. */
export const piuRecentiPrima = (a, b) => (b.creato || 0) - (a.creato || 0);
export const piuVecchiPrima = (a, b) => (a.creato || 0) - (b.creato || 0);

/** Avviso fisso in alto (demo, senza rete). */
export function avvisoDemo(contenitore, extra) {
  if (!inDemo) return;
  const a = el('div', { class: 'avviso', role: 'status' }, T.demo, extra ? ' ' : null, extra || null);
  contenitore.prepend(a);
}

/** Segue lo stato della rete del browser. */
export function seguiRete(cb) {
  const agg = () => cb(navigator.onLine !== false);
  addEventListener('online', agg);
  addEventListener('offline', agg);
  agg();
}
