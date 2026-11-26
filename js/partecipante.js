// Vista del pubblico: benvenuto → scelta della domanda → scrittura → conferma.
// Il pubblico non vede la bacheca: la mostra la regia proiettandola (schermo.html).
import {
  config, T, applicaColori, apriStore, el, icona, domande, domanda, partiScheda, avvisoDemo, seguiRete,
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
$('scrivi-ancora').append(icona('avanti'));
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

// Tastiera del telefono. Su Android ci pensa il browser (interactive-widget nel meta viewport);
// su iPhone la tastiera copre la pagina: spostiamo la barra in basso di quanto serve.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const agg = () => {
    const sopra = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--tastiera', sopra + 'px');
  };
  vv.addEventListener('resize', agg);
  vv.addEventListener('scroll', agg);
  agg();
}

// ── Navigazione (hash: #benvenuto, #scrivi, #scrivi/<id>, #inviato) ────────
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
  if (!id) {
    // In cima alla scelta: il nome si può aggiungere o cambiare, mai durante la scrittura.
    const nome = nomeSalvato();
    $('link-nome').textContent = nome ? `${nome} · ${T.nomeCambia}` : T.nomeAssente;
    return;
  }
  const d = domanda(id);
  $('domanda-scelta').style.setProperty('--c', d.colore);
  $('scelta-etichetta').textContent = d.titolo;
  $('scelta-domanda').textContent = d.domanda;
  $('scelta-guida').textContent = d.guida;
  testo.placeholder = T.contributoSegnaposto || '';
  const b = bozza.leggi();
  testo.value = b.testo || '';
  $('errore').hidden = true;
  aggiornaTesto();
  timerAttesa = setInterval(aggiornaPulsante, 1000);
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
  testo.blur(); // chiude la tastiera
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

// ── 3. Conferma ────────────────────────────────────────────────────────────
function apriInviato() {
  const c = ultimoInviato;
  $('inviato-titolo').textContent = c.inAttesa ? T.inInvio : T.inviatoTitolo;
  $('inviato-attesa').hidden = !c.inAttesa;
  $('inviato-attesa').textContent = T.inviatoAttesa;
  const p = partiScheda({ ...c, inAttesa: false }, null);
  $('inviato-anteprima').replaceChildren(el('article', { class: 'scheda riquadro', '--c': p.colore }, p.testa, p.testo, p.piede));
  $('inviato-titolo').focus({ preventScroll: true });
}

mostra();
