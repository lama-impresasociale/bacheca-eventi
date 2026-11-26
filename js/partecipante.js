// Vista del pubblico: benvenuto → scelta della domanda → scrittura → conferma → bacheca.
import {
  config, T, applicaColori, apriStore, el, icona, domande, domanda, plurale,
  piuRecentiPrima, partiScheda, avvisoDemo, seguiRete,
} from './comune.js';

window.bachecaAvviata = true; // vedi js/avvio.js
applicaColori();
const storePronto = apriStore();
storePronto.catch(e => { console.error(e); avviso(T.erroreCollegamento); });

const $ = id => document.getElementById(id);
const limite = config.limiti.caratteri;
const attesaTraInvii = config.limiti.secondiTraInvii * 1000;

// ── Memoria locale (nome, invii) ───────────────────────────────────────────
const pref = `bacheca:${config.evento.id}:`;
const memoria = {
  leggi(k) { try { return localStorage.getItem(pref + k); } catch { return null; } },
  scrivi(k, v) { try { localStorage.setItem(pref + k, v); } catch { /* memoria non disponibile */ } },
};
const bozza = {
  leggi() { try { return JSON.parse(sessionStorage.getItem(pref + 'bozza')) || {}; } catch { return {}; } },
  scrivi(b) { try { sessionStorage.setItem(pref + 'bozza', JSON.stringify(b)); } catch { /* ok */ } },
};
const nomeSalvato = () => memoria.leggi('nome') || '';
const benvenutoVisto = () => memoria.leggi('benvenuto') === '1';

// ── Testi dal config ───────────────────────────────────────────────────────
for (const n of document.querySelectorAll('[data-t]')) n.textContent = T[n.dataset.t] ?? '';
for (const n of document.querySelectorAll('[data-config]')) {
  n.textContent = n.dataset.config.split('.').reduce((o, k) => o?.[k], config) ?? '';
}
$('continua').append(icona('avanti'));
document.querySelector('a.pulsante[href="#bacheca"]').append(icona('avanti'));
$('fab').prepend(icona('piu'));
$('cambia-domanda').append(icona('indietro'), T.cambiaDomanda);
$('nome').maxLength = config.limiti.caratteriNome;
$('nome').placeholder = T.benvenutoNomeSegnaposto || '';
$('testo').maxLength = limite;

const privacy = $('privacy');
for (const r of config.privacy.righe) privacy.append(el('p', {}, r));
if (config.privacy.link) privacy.append(el('p', {}, el('a', { href: config.privacy.link, target: '_blank', rel: 'noopener' }, T.informativaCompleta)));

const avvisi = $('avvisi');
avvisoDemo(avvisi);
let avvisoRete = null;
function avviso(testo) {
  const a = el('div', { class: 'avviso', role: 'status' }, testo);
  avvisi.append(a);
  return a;
}
seguiRete(online => {
  if (!online && !avvisoRete) avvisoRete = avviso(T.senzaRete);
  if (online && avvisoRete) { avvisoRete.remove(); avvisoRete = null; }
});

// Tastiera del telefono: tiene la barra in basso appena sopra la tastiera.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const agg = () => {
    const sopra = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--tastiera', sopra + 'px');
  };
  vv.addEventListener('resize', agg);
  vv.addEventListener('scroll', agg);
}

// ── Navigazione (hash: #benvenuto, #scrivi, #scrivi/<id>, #inviato, #bacheca) ─
const schermate = [...document.querySelectorAll('[data-schermata]')];
let ultimoInviato = null;

function mostra() {
  let [nome, arg] = location.hash.slice(1).split('/');
  if (!schermate.some(s => s.dataset.schermata === nome)) {
    nome = benvenutoVisto() ? 'scrivi' : 'benvenuto';
    history.replaceState(null, '', '#' + nome);
  }
  if (nome === 'inviato' && !ultimoInviato) { nome = 'scrivi'; history.replaceState(null, '', '#scrivi'); }
  for (const s of schermate) s.hidden = s.dataset.schermata !== nome;
  window.scrollTo(0, 0);
  if (nome === 'benvenuto') apriBenvenuto();
  if (nome === 'scrivi') apriScrivi(arg && domanda(decodeURIComponent(arg)) ? decodeURIComponent(arg) : null);
  if (nome === 'inviato') apriInviato();
  if (nome === 'bacheca') apriBacheca();
}
addEventListener('hashchange', mostra);

// ── 1. Benvenuto ───────────────────────────────────────────────────────────
function apriBenvenuto() {
  $('nome').value = nomeSalvato();
}
function chiudiBenvenuto(conNome) {
  memoria.scrivi('nome', conNome ? $('nome').value.trim().slice(0, config.limiti.caratteriNome) : '');
  memoria.scrivi('benvenuto', '1');
  const b = bozza.leggi();
  location.hash = b.domanda ? `scrivi/${encodeURIComponent(b.domanda)}` : 'scrivi';
}
$('continua').addEventListener('click', () => chiudiBenvenuto(true));
$('salta').addEventListener('click', () => chiudiBenvenuto(false));
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); chiudiBenvenuto(true); } });

// ── 2. Scelta e scrittura ──────────────────────────────────────────────────
const listaOpzioni = $('opzioni');
for (const d of domande) {
  listaOpzioni.append(el('li', {},
    el('a', { class: 'opzione', href: `#scrivi/${encodeURIComponent(d.id)}`, '--c': d.colore },
      el('span', { class: 'etichetta' }, d.titolo),
      el('span', { class: 'opzione-domanda' }, d.domanda),
      icona('avanti'),
    ),
  ));
}

const testo = $('testo');
let domandaCorrente = null;
let timerAttesa = null;

function apriScrivi(id) {
  domandaCorrente = id;
  $('scelta').hidden = !!id;
  $('scrittura').hidden = !id;
  $('barra-scrivi').hidden = !id;
  clearInterval(timerAttesa);
  if (!id) return;
  const d = domanda(id);
  $('domanda-scelta').style.setProperty('--c', d.colore);
  $('scelta-etichetta').textContent = d.titolo;
  $('scelta-domanda').textContent = d.domanda;
  $('scelta-guida').textContent = d.guida;
  testo.placeholder = T.contributoSegnaposto || '';
  const b = bozza.leggi();
  testo.value = b.testo || '';
  $('errore').hidden = true;
  aggiornaFirma();
  aggiornaTesto();
  timerAttesa = setInterval(aggiornaPulsante, 1000);
}

function aggiornaFirma() {
  const nome = nomeSalvato();
  const f = $('firma');
  f.replaceChildren(
    nome ? `${T.firmato}: ${nome} · ` : `${T.anonimo} · `,
    el('a', { href: '#benvenuto', class: 'pulsante-testo' }, nome ? T.cambiaNome : T.aggiungiNome),
  );
}

function adattaAltezza() {
  testo.style.height = 'auto';
  testo.style.height = testo.scrollHeight + 'px';
}

function aggiornaTesto() {
  adattaAltezza();
  const n = testo.value.length;
  const c = $('contatore');
  c.textContent = `${n} / ${limite}`;
  c.classList.toggle('vicino', n >= limite - 20);
  aggiornaPulsante();
}

const restoAttesa = () => {
  const ultimo = Number(memoria.leggi('ultimoInvio')) || 0;
  return Math.max(0, ultimo + attesaTraInvii - Date.now());
};

let invioInCorso = false;
function aggiornaPulsante() {
  const b = $('invia');
  const t = $('invia-testo');
  const resto = restoAttesa();
  if (invioInCorso) { b.disabled = true; t.textContent = T.inviando; return; }
  if (resto > 0) { b.disabled = true; t.textContent = T.attendi.replace('{s}', Math.ceil(resto / 1000)); return; }
  t.textContent = T.invia;
  b.disabled = !testo.value.trim();
}
$('invia').append(icona('avanti'));

testo.addEventListener('input', () => {
  bozza.scrivi({ domanda: domandaCorrente, testo: testo.value });
  $('errore').hidden = true;
  aggiornaTesto();
});

const pulisci = s => s.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, limite);

$('invia').addEventListener('click', async () => {
  const valore = pulisci(testo.value);
  if (!valore || !domandaCorrente || restoAttesa() > 0 || invioInCorso) return;
  invioInCorso = true;
  aggiornaPulsante();
  const dati = { domanda: domandaCorrente, testo: valore, nome: nomeSalvato(), origine: 'app' };
  let confermato = false;
  // Se dopo qualche secondo il server non ha ancora risposto (rete assente o lenta)
  // mostriamo comunque la conferma: Firestore spedirà il contributo appena possibile.
  const timer = setTimeout(() => {
    if (confermato) return;
    ultimoInviato = { ...dati, creato: Date.now(), inAttesa: true };
    concludi();
  }, navigator.onLine === false ? 600 : 4000);

  function concludi() {
    memoria.scrivi('ultimoInvio', String(Date.now()));
    bozza.scrivi({});
    testo.value = '';
    invioInCorso = false;
    location.hash = 'inviato';
  }

  try {
    const store = await storePronto;
    await store.inviaContributo(dati);
    confermato = true;
    clearTimeout(timer);
    const giaMostrato = ultimoInviato && ultimoInviato.inAttesa && ultimoInviato.testo === dati.testo;
    ultimoInviato = { ...dati, creato: Date.now(), inAttesa: false };
    if (giaMostrato) { if (location.hash === '#inviato') apriInviato(); }
    else concludi();
  } catch (e) {
    console.error(e);
    clearTimeout(timer);
    invioInCorso = false;
    if (location.hash === '#inviato') { history.back(); }
    const err = $('errore');
    err.textContent = T.erroreInvio;
    err.hidden = false;
    aggiornaPulsante();
  }
});

// ── 2b. Conferma ───────────────────────────────────────────────────────────
function apriInviato() {
  const c = ultimoInviato;
  $('inviato-titolo').textContent = c.inAttesa ? T.inInvio : T.inviatoTitolo;
  $('inviato-attesa').hidden = !c.inAttesa;
  $('inviato-attesa').textContent = T.inviatoAttesa;
  const p = partiScheda({ ...c, inAttesa: false }, null);
  $('inviato-anteprima').replaceChildren(el('article', { class: 'scheda', '--c': p.colore }, p.testa, p.testo, p.piede));
  $('inviato-titolo').focus({ preventScroll: true });
}
$('scrivi-ancora').addEventListener('click', () => {
  location.hash = ultimoInviato ? `scrivi/${encodeURIComponent(ultimoInviato.domanda)}` : 'scrivi';
});

// ── 3. Bacheca ─────────────────────────────────────────────────────────────
let contributi = [];
let temi = [];
const filtro = { domanda: null, tema: null };
let bachecaAttiva = false;
let primoCarico = true;
const visti = new Set();
const nodi = new Map(); // id -> { firma, nodo }

function apriBacheca() {
  if (bachecaAttiva) { disegna(); return; }
  bachecaAttiva = true;
  disegnaFiltri();
  storePronto.then(store => {
    store.ascoltaContributi(lista => { contributi = lista.filter(c => !c.rimosso); disegna(); }, () => avviso(T.erroreCollegamento));
    store.ascoltaTemi(lista => { temi = lista; disegna(); });
  });
}

function disegnaFiltri() {
  const riga = $('filtri-domande');
  const voci = [{ id: null, breve: T.tutte, colore: null }, ...domande];
  riga.replaceChildren(...voci.map(d => el('button', {
    type: 'button',
    class: 'filtro',
    'aria-pressed': String(filtro.domanda === d.id),
    '--c': d.colore || undefined,
    onclick: () => { filtro.domanda = d.id; filtro.tema = null; disegnaFiltri(); disegna(); },
  }, d.colore ? el('span', { class: 'pallino' }) : null, d.breve || d.titolo)));
}

function disegnaTemi(visibili) {
  const riga = $('filtri-temi');
  if (!filtro.domanda) { riga.hidden = true; return; }
  const conteggi = new Map();
  for (const c of visibili) if (c.tema) conteggi.set(c.tema, (conteggi.get(c.tema) || 0) + 1);
  const disponibili = temi.filter(t => t.domanda === filtro.domanda && conteggi.get(t.id)).sort((a, b) => conteggi.get(b.id) - conteggi.get(a.id));
  if (filtro.tema && !disponibili.some(t => t.id === filtro.tema)) filtro.tema = null;
  riga.hidden = disponibili.length === 0;
  const colore = domanda(filtro.domanda)?.colore;
  riga.replaceChildren(
    el('button', { type: 'button', class: 'filtro', '--c': colore, 'aria-pressed': String(!filtro.tema), onclick: () => { filtro.tema = null; disegna(); } }, T.tuttiTemi),
    ...disponibili.map(t => el('button', {
      type: 'button', class: 'filtro', '--c': colore, 'aria-pressed': String(filtro.tema === t.id),
      onclick: () => { filtro.tema = t.id; disegna(); },
    }, t.nome, ' ', el('small', {}, String(conteggi.get(t.id))))),
  );
}

function disegna() {
  const nomiTemi = new Map(temi.map(t => [t.id, t.nome]));
  const perDomanda = filtro.domanda ? contributi.filter(c => c.domanda === filtro.domanda) : contributi;
  disegnaTemi(perDomanda);
  const visibili = (filtro.tema ? perDomanda.filter(c => c.tema === filtro.tema) : perDomanda).slice().sort(piuRecentiPrima);

  $('conteggio-totale').textContent = plurale(contributi.length);
  $('conteggio').textContent = filtro.domanda ? plurale(visibili.length) : '';
  $('conteggio').hidden = !filtro.domanda;

  const elementi = visibili.map(c => {
    const nomeTema = c.tema ? nomiTemi.get(c.tema) || null : null;
    const firma = [c.testo, c.nome, c.creato, nomeTema, c.evidenza, c.fatta, c.origine, c.inAttesa].join('|');
    let voce = nodi.get(c.id);
    if (!voce || voce.firma !== firma) {
      const p = partiScheda(c, nomeTema, { etichetta: !filtro.domanda });
      const nodo = el('article', { class: 'scheda', '--c': p.colore }, p.testa, p.testo, p.piede);
      if (!primoCarico && !visti.has(c.id)) nodo.classList.add('nuova');
      voce = { firma, nodo };
      nodi.set(c.id, voce);
    }
    visti.add(c.id);
    return voce.nodo;
  });
  // Le etichette cambiano con il filtro: ridisegna le schede quando cambia filtro.
  $('lista').replaceChildren(...elementi);
  if (contributi.length) primoCarico = false;

  const vuoto = $('vuoto');
  vuoto.hidden = visibili.length > 0;
  vuoto.textContent = contributi.length ? T.nessunRisultato : T.nessunContributo;
}

// Quando cambia il filtro per domanda l'etichetta della scheda cambia: svuota la cache dei nodi.
$('filtri-domande').addEventListener('click', () => nodi.clear(), true);

mostra();
