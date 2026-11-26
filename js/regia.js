// Regia: moderazione, temi, post-it, domande ai relatori, schermo, esportazione.
import {
  config, applicaColori, apriStore, el, icona, domande, domanda, plurale, ora, dataOra, eventoDiProva,
  applicaTestiDomande, testiOriginali, CAMPI_TESTO_DOMANDA,
  piuRecentiPrima, piuVecchiPrima, partiScheda, inDemo, conParametri, riconcilia, seguiRete,
} from './comune.js';

window.bachecaAvviata = true; // vedi js/avvio.js
applicaColori();
for (const n of document.querySelectorAll('[data-config]')) {
  n.textContent = n.dataset.config.split('.').reduce((o, k) => o?.[k], config) ?? '';
}
const $ = id => document.getElementById(id);
const avvisi = $('avvisi');

function avviso(testo, durata = 0, ...extra) {
  const a = el('div', { class: 'avviso', role: 'status' }, testo, ...extra);
  avvisi.append(a);
  if (durata) setTimeout(() => a.remove(), durata);
  return a;
}
const errore = e => { console.error(e); avviso('Modifica non salvata: ' + (e?.message || e), 8000); };

let store;
try {
  store = await apriStore();
} catch (e) {
  avviso('Non riesco a collegarmi a Firebase. Controlla la configurazione in config.js.');
  throw e;
}

if (inDemo) {
  avviso('Modalità demo: dati finti, visibili solo in questo browser. Apri la pagina del pubblico in un’altra scheda per vedere gli aggiornamenti.', 0,
    el('button', { type: 'button', class: 'pulsante-testo', onclick: () => store.ripristinaDemo() }, 'Ripristina dati demo'));
}
if (eventoDiProva) {
  avviso(`Evento di prova «${eventoDiProva}»: questi dati sono separati da quelli dell’evento vero. Per tornare all’evento vero apri regia.html senza ?evento.`);
}
let avvisoRete = null;
seguiRete(online => {
  if (!online && !avvisoRete) avvisoRete = avviso('Senza rete: le modifiche partono appena torna la connessione.');
  if (online && avvisoRete) { avvisoRete.remove(); avvisoRete = null; }
});

$('link-pubblico').href = conParametri('index.html');
$('link-schermo').href = conParametri('schermo.html');
$('s-apri').href = conParametri('schermo.html');
$('link-schermo').prepend(icona('schermo'));
$('esporta').prepend(icona('scarica'));
$('link-pubblico').prepend(icona('esterno'));

// ── Stato ──────────────────────────────────────────────────────────────────
let contributi = [];
let temi = [];
let statoSchermo = {};
let vista = 'contributi';
const filtro = { domanda: null, tema: null, evidenza: false, rimossi: false, cerca: '' };
const selezione = new Set();
const temiSelezionati = new Set();
let temaInModifica = null;
let temaDaEliminare = null;

const nomeTema = id => temi.find(t => t.id === id)?.nome || null;
const temiDi = idDomanda => temi.filter(t => t.domanda === idDomanda).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
const attivi = () => contributi.filter(c => !c.rimosso);
const domandeRelatori = new Set(domande.filter(d => d.relatori).map(d => d.id));

store.ascoltaContributi(l => { contributi = l; for (const id of selezione) if (!l.some(c => c.id === id)) selezione.delete(id); ridisegna(); }, () => avviso('Non riesco a leggere i contributi. Controlla le regole di Firestore.'));
store.ascoltaTemi(l => { temi = l; for (const id of temiSelezionati) if (!l.some(t => t.id === id)) temiSelezionati.delete(id); ridisegna(); });
store.ascoltaSchermo(s => { statoSchermo = s || {}; if (vista === 'schermo') disegnaSchermo(); });
let testiSalvati = {};
store.ascoltaTestiDomande?.(testi => {
  testiSalvati = testi || {};
  applicaTestiDomande(testiSalvati);
  nodi.clear();               // le schede mostrano il titolo della domanda: vanno ridisegnate
  disegnaPostitDomande();
  ridisegna();
  if (vista === 'testi') disegnaTesti();
});

// ── Schede (viste) ─────────────────────────────────────────────────────────
for (const b of document.querySelectorAll('[role="tab"]')) {
  b.addEventListener('click', () => {
    vista = b.dataset.vista;
    for (const x of document.querySelectorAll('[role="tab"]')) x.setAttribute('aria-selected', String(x === b));
    for (const s of document.querySelectorAll('.r-vista')) s.hidden = s.dataset.vista !== vista;
    if (vista === 'schermo' && !$('s-iframe').src) $('s-iframe').src = conParametri('schermo.html?anteprima=1');
    ridisegna();
  });
}

function ridisegna() {
  const a = attivi();
  const postit = a.filter(c => c.origine === 'post-it').length;
  const rimossi = contributi.length - a.length;
  $('r-conteggi').textContent = [plurale(a.length), postit ? `${postit} da post-it` : null, rimossi ? `${rimossi} rimoss${rimossi === 1 ? 'o' : 'i'}` : null].filter(Boolean).join(' · ');
  const daPorre = a.filter(c => domandeRelatori.has(c.domanda) && !c.fatta).length;
  $('n-relatori').textContent = daPorre ? `(${daPorre})` : '';

  if (vista === 'contributi') { disegnaFiltri(); disegnaLista(); disegnaTemi(); }
  if (vista === 'relatori') disegnaRelatori();
  if (vista === 'schermo') disegnaSchermo();
  if (vista === 'testi') disegnaTesti();
}

// ── Filtri ─────────────────────────────────────────────────────────────────
function disegnaFiltri() {
  const a = attivi();
  const voci = [{ id: null, titolo: 'Tutte', colore: null }, ...domande];
  $('f-domande').replaceChildren(...voci.map(d => el('button', {
    type: 'button', class: 'f-domanda', '--c': d.colore || undefined,
    'aria-pressed': String(filtro.domanda === d.id),
    onclick: () => { filtro.domanda = d.id; filtro.tema = null; temiSelezionati.clear(); temaInModifica = null; ridisegna(); },
  }, el('span', {}, d.breve || d.titolo), el('small', {}, String(d.id ? a.filter(c => c.domanda === d.id).length : a.length)))));
  $('f-senzatema').checked = filtro.tema === 'senza';
}
$('f-evidenza').addEventListener('change', e => { filtro.evidenza = e.target.checked; ridisegna(); });
$('f-senzatema').addEventListener('change', e => { filtro.tema = e.target.checked ? 'senza' : null; ridisegna(); });
$('f-rimossi').addEventListener('change', e => { filtro.rimossi = e.target.checked; ridisegna(); });
$('f-cerca').addEventListener('input', e => { filtro.cerca = e.target.value; ridisegna(); });

const normalizza = s => (s || '').toLocaleLowerCase('it').normalize('NFD').replace(/[̀-ͯ]/g, '');

function filtrati() {
  let l = filtro.rimossi ? contributi : attivi();
  if (filtro.domanda) l = l.filter(c => c.domanda === filtro.domanda);
  if (filtro.tema === 'senza') l = l.filter(c => !c.tema);
  else if (filtro.tema) l = l.filter(c => c.tema === filtro.tema);
  if (filtro.evidenza) l = l.filter(c => c.evidenza);
  if (filtro.cerca.trim()) {
    const q = normalizza(filtro.cerca.trim());
    l = l.filter(c => normalizza(`${c.testo} ${c.nome}`).includes(q));
  }
  return l.slice().sort(piuRecentiPrima);
}

// ── Lista dei contributi ───────────────────────────────────────────────────
const nodi = new Map();

function menuTema(c, onChange) {
  const s = el('select', { class: 'campo', 'aria-label': 'Tema', onchange: e => onChange(e.target.value || null) },
    el('option', { value: '' }, 'Senza tema'),
    ...temiDi(c.domanda).map(t => el('option', { value: t.id }, t.nome)),
  );
  s.value = c.tema || '';
  return s;
}

function schedaRegia(c) {
  const p = partiScheda(c, nomeTema(c.tema));
  const sel = el('input', { type: 'checkbox', 'aria-label': 'Seleziona', onchange: e => { e.target.checked ? selezione.add(c.id) : selezione.delete(c.id); disegnaSelezione(); aggiornaSelezioneSchede(); } });
  const comandi = el('div', { class: 'r-comandi' },
    menuTema(c, tema => store.aggiorna(c.id, { tema }).catch(errore)),
    el('button', { type: 'button', class: 'r-icona', title: c.evidenza ? 'Togli da in evidenza' : 'Metti in evidenza', 'aria-pressed': String(c.evidenza), onclick: () => store.aggiorna(c.id, { evidenza: !c.evidenza }).catch(errore) }, icona('stella')),
    domandeRelatori.has(c.domanda)
      ? el('button', { type: 'button', class: 'r-icona' + (c.fatta ? ' attiva' : ''), title: c.fatta ? 'Segna come da porre' : 'Segna come già posta', 'aria-pressed': String(c.fatta), onclick: () => store.aggiorna(c.id, { fatta: !c.fatta }).catch(errore) }, icona('spunta'))
      : null,
    c.rimosso
      ? el('button', { type: 'button', class: 'r-icona', title: 'Ripristina', onclick: () => store.aggiorna(c.id, { rimosso: false }).catch(errore) }, icona('ripristina'))
      : el('button', { type: 'button', class: 'r-icona', title: 'Rimuovi dalle bacheche', onclick: () => store.aggiorna(c.id, { rimosso: true, evidenza: false }).catch(errore) }, icona('cestino')),
  );
  return el('article', { class: 'scheda r-scheda' + (c.rimosso ? ' rimossa' : ''), '--c': p.colore, dataset: { id: c.id } },
    el('label', { class: 'r-sel' }, sel),
    el('div', { class: 'r-corpo' }, p.testa, p.testo, p.piede, c.rimosso ? el('div', { class: 'tag' }, 'Rimosso dalle bacheche') : null),
    comandi,
  );
}

function disegnaLista() {
  const l = filtrati();
  const elementi = l.map(c => {
    const firma = JSON.stringify([c.testo, c.nome, c.creato, c.tema, nomeTema(c.tema), c.evidenza, c.rimosso, c.fatta, c.origine, c.inAttesa, temiDi(c.domanda).map(t => t.id + t.nome)]);
    let v = nodi.get(c.id);
    if (!v || v.firma !== firma) { v = { firma, nodo: schedaRegia(c) }; nodi.set(c.id, v); }
    return v.nodo;
  });
  riconcilia($('r-lista'), elementi);
  $('r-vuoto').hidden = l.length > 0;
  $('r-vuoto').textContent = contributi.length
    ? 'Nessun contributo con questi filtri.'
    : 'Ancora nessun contributo: compariranno qui appena il pubblico scrive. Puoi anche aggiungere un post-it qui sopra.';
  $('r-conteggio').textContent = plurale(l.length);
  aggiornaSelezioneSchede();
  disegnaSelezione();
}

function aggiornaSelezioneSchede() {
  for (const n of $('r-lista').children) {
    const s = selezione.has(n.dataset.id);
    n.classList.toggle('selezionata', s);
    const cb = n.querySelector('.r-sel input');
    if (cb) cb.checked = s;
  }
  const visibili = [...$('r-lista').children].map(n => n.dataset.id);
  const tutti = visibili.length > 0 && visibili.every(id => selezione.has(id));
  $('sel-tutti').checked = tutti;
  $('sel-tutti').indeterminate = !tutti && visibili.some(id => selezione.has(id));
}

$('sel-tutti').addEventListener('change', e => {
  const visibili = [...$('r-lista').children].map(n => n.dataset.id);
  if (e.target.checked) visibili.forEach(id => selezione.add(id)); else visibili.forEach(id => selezione.delete(id));
  aggiornaSelezioneSchede();
  disegnaSelezione();
});

function disegnaSelezione() {
  const box = $('selezione');
  box.hidden = selezione.size === 0;
  if (!selezione.size) return;
  $('sel-numero').textContent = selezione.size === 1 ? '1 selezionato' : `${selezione.size} selezionati`;
  const scelti = contributi.filter(c => selezione.has(c.id));
  const dom = new Set(scelti.map(c => c.domanda));
  const posto = $('sel-tema');
  if (dom.size === 1) {
    const [d] = dom;
    if (posto.dataset.domanda !== d || posto.dataset.temi !== temiDi(d).map(t => t.id + t.nome).join()) {
      posto.dataset.domanda = d;
      posto.dataset.temi = temiDi(d).map(t => t.id + t.nome).join();
      const s = el('select', { class: 'campo', 'aria-label': 'Tema per i selezionati' },
        el('option', { value: '' }, 'Senza tema'), ...temiDi(d).map(t => el('option', { value: t.id }, t.nome)));
      posto.replaceChildren('Tema', s, el('button', { type: 'button', class: 'pulsante-testo', onclick: () => {
        store.aggiornaMolti([...selezione], { tema: s.value || null }).catch(errore);
      } }, 'Assegna'));
    }
  } else {
    delete posto.dataset.domanda;
    posto.replaceChildren(el('span', { class: 'nota' }, 'Per assegnare un tema scegli contributi di una sola domanda'));
  }
}
$('sel-evidenza').addEventListener('click', () => store.aggiornaMolti([...selezione], { evidenza: true }).catch(errore));
$('sel-noevidenza').addEventListener('click', () => store.aggiornaMolti([...selezione], { evidenza: false }).catch(errore));
$('sel-rimuovi').addEventListener('click', () => { store.aggiornaMolti([...selezione], { rimosso: true, evidenza: false }).catch(errore); selezione.clear(); disegnaLista(); });
$('sel-annulla').addEventListener('click', () => { selezione.clear(); aggiornaSelezioneSchede(); disegnaSelezione(); });

// ── Post-it ────────────────────────────────────────────────────────────────
let domandaPostit = domande[0]?.id;
function disegnaPostitDomande() {
  $('postit-domande').replaceChildren(...domande.map(d => el('label', { '--c': d.colore },
    el('input', { type: 'radio', name: 'postit-domanda', value: d.id, checked: d.id === domandaPostit, onchange: () => { domandaPostit = d.id; } }),
    el('span', { class: 'pallino' }), d.breve || d.titolo)));
}
disegnaPostitDomande();
$('postit-testo').maxLength = config.limiti.caratteri;
$('postit-nome').maxLength = config.limiti.caratteriNome;
$('postit-testo').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('postit-form').requestSubmit(); } });
$('postit-form').addEventListener('submit', async e => {
  e.preventDefault();
  const testo = $('postit-testo').value.trim();
  if (!testo || !domandaPostit) return;
  const nome = $('postit-nome').value.trim();
  $('postit-testo').value = '';
  $('postit-nome').value = '';
  $('postit-testo').focus();
  $('postit-esito').textContent = 'Aggiunto';
  setTimeout(() => { $('postit-esito').textContent = ''; }, 2500);
  try { await store.inviaContributo({ domanda: domandaPostit, testo, nome, origine: 'post-it' }); }
  catch (err) { $('postit-testo').value = testo; $('postit-esito').textContent = ''; errore(err); }
});

// ── Temi ───────────────────────────────────────────────────────────────────
// Il pannello ha parti fisse (il campo "Nuovo tema") e parti ridisegnate a ogni aggiornamento.
const testaTemi = el('div');
const listaTemi = el('ul', { class: 't-lista' });
const campoNuovo = el('input', { type: 'text', class: 'campo', placeholder: 'Nuovo tema', maxlength: 80, 'aria-label': 'Nome del nuovo tema' });
const formNuovo = el('div', { class: 't-nuovo' }, campoNuovo, el('button', { type: 'button', class: 'pulsante', onclick: () => creaTema() }, 'Crea'));
const notaTemi = el('p', { class: 'nota' });
const zonaUnisci = el('div');
$('r-temi').append(el('h2', { class: 'etichetta' }, 'Temi'), testaTemi, listaTemi, formNuovo, notaTemi, zonaUnisci);
let listaBloccata = false; // true mentre si rinomina un tema

campoNuovo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); creaTema(); } });
async function creaTema() {
  const n = campoNuovo.value.trim();
  if (!n || !filtro.domanda) return;
  const idDomanda = filtro.domanda;
  campoNuovo.value = '';
  try {
    const id = await store.creaTema(n, idDomanda);
    // Se ci sono contributi selezionati di questa domanda, il nuovo tema si assegna a loro.
    const scelti = contributi.filter(c => selezione.has(c.id) && c.domanda === idDomanda).map(c => c.id);
    if (scelti.length) {
      await store.aggiornaMolti(scelti, { tema: id });
      for (const c of scelti) selezione.delete(c);
      ridisegna();
    }
  } catch (e) { errore(e); }
}

function voceTema(t, conta) {
  const attiva = filtro.tema === t.id;
  if (temaInModifica === t.id) {
    const campo = el('input', { type: 'text', class: 'campo', value: t.nome, maxlength: 80, 'aria-label': 'Nuovo nome del tema' });
    let chiuso = false;
    const chiudi = salva => {
      if (chiuso) return;
      chiuso = true;
      const n = campo.value.trim();
      temaInModifica = null;
      listaBloccata = false;
      if (salva && n && n !== t.nome) store.rinominaTema(t.id, n).catch(errore);
      disegnaTemi();
    };
    campo.addEventListener('keydown', e => { if (e.key === 'Enter') chiudi(true); if (e.key === 'Escape') chiudi(false); });
    campo.addEventListener('blur', () => chiudi(true));
    queueMicrotask(() => { campo.focus(); campo.select(); });
    return el('li', { class: 't-voce' }, el('span'), campo);
  }
  return el('li', { class: 't-voce' + (attiva ? ' attiva' : '') },
    el('input', { type: 'checkbox', 'aria-label': `Seleziona ${t.nome} per unire`, checked: temiSelezionati.has(t.id), onchange: e => { e.target.checked ? temiSelezionati.add(t.id) : temiSelezionati.delete(t.id); disegnaTemi(); } }),
    el('button', { type: 'button', class: 't-nome', title: 'Mostra i contributi di questo tema', onclick: () => { filtro.tema = attiva ? null : t.id; ridisegna(); } }, t.nome),
    el('span', { class: 't-conteggio' }, String(conta(t.id))),
    el('button', { type: 'button', class: 'r-icona', title: 'Rinomina', onclick: () => { temaInModifica = t.id; disegnaTemi(); listaBloccata = true; } }, icona('matita')),
    temaDaEliminare === t.id
      ? el('button', { type: 'button', class: 't-conferma', onclick: () => {
          temaDaEliminare = null;
          if (filtro.tema === t.id) filtro.tema = null;
          store.eliminaTema(t.id, contributi.filter(c => c.tema === t.id).map(c => c.id)).catch(errore);
        } }, 'Elimina')
      : el('button', { type: 'button', class: 'r-icona', title: 'Elimina il tema (i contributi restano, senza tema)', onclick: () => {
          temaDaEliminare = t.id; disegnaTemi();
          setTimeout(() => { if (temaDaEliminare === t.id) { temaDaEliminare = null; disegnaTemi(); } }, 4000);
        } }, icona('cestino')),
  );
}

function disegnaTemi() {
  if (!filtro.domanda) {
    testaTemi.replaceChildren(el('p', { class: 'nota' }, 'Scegli una domanda a sinistra per vedere e gestire i suoi temi.'));
    listaTemi.replaceChildren();
    formNuovo.hidden = true;
    notaTemi.hidden = true;
    zonaUnisci.replaceChildren();
    return;
  }
  formNuovo.hidden = false;
  const d = domanda(filtro.domanda);
  const a = attivi().filter(c => c.domanda === d.id);
  const conta = id => a.filter(c => c.tema === id).length;
  const lista = temiDi(d.id).sort((x, y) => conta(y.id) - conta(x.id) || x.nome.localeCompare(y.nome, 'it'));

  testaTemi.replaceChildren(el('p', { class: 't-domanda', '--c': d.colore }, d.domanda));

  if (!listaBloccata) {
    const voci = lista.map(t => voceTema(t, conta));
    voci.push(el('li', { class: 't-voce' + (filtro.tema === 'senza' ? ' attiva' : '') },
      el('span'),
      el('button', { type: 'button', class: 't-nome', onclick: () => { filtro.tema = filtro.tema === 'senza' ? null : 'senza'; ridisegna(); } }, 'Senza tema'),
      el('span', { class: 't-conteggio' }, String(a.filter(c => !c.tema).length)),
    ));
    listaTemi.replaceChildren(...voci);
  }

  const selDiQuesta = contributi.filter(c => selezione.has(c.id) && c.domanda === d.id).length;
  notaTemi.hidden = !selDiQuesta && lista.length < 2;
  notaTemi.textContent = selDiQuesta
    ? `Il nuovo tema verrà assegnato ${selDiQuesta === 1 ? 'al contributo selezionato' : `ai ${selDiQuesta} contributi selezionati`}.`
    : 'Per unire dei temi spunta le loro caselle.';

  // Non ridisegnare la zona "unisci" mentre si scrive il nome finale.
  if (zonaUnisci.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  const scelti = lista.filter(t => temiSelezionati.has(t.id));
  if (scelti.length < 2) { zonaUnisci.replaceChildren(); return; }
  const dest = scelti.slice().sort((x, y) => conta(y.id) - conta(x.id))[0];
  const nomeFinale = el('input', { type: 'text', class: 'campo', value: dest.nome, maxlength: 80, 'aria-label': 'Nome del tema unito' });
  zonaUnisci.replaceChildren(el('div', { class: 't-unisci' },
    el('span', {}, `Unisci ${scelti.length} temi in uno, con questo nome:`),
    nomeFinale,
    el('div', {},
      el('button', { type: 'button', class: 'pulsante', onclick: () => {
        const altri = scelti.filter(t => t.id !== dest.id).map(t => t.id);
        const ids = contributi.filter(c => altri.includes(c.tema)).map(c => c.id);
        temiSelezionati.clear();
        if (altri.includes(filtro.tema)) filtro.tema = dest.id;
        zonaUnisci.replaceChildren();
        store.unisciTemi(dest.id, nomeFinale.value.trim() || dest.nome, altri, ids).catch(errore);
      } }, icona('unisci'), 'Unisci'),
      ' ',
      el('button', { type: 'button', class: 'pulsante-testo', onclick: () => { temiSelezionati.clear(); disegnaTemi(); } }, 'Annulla'),
    ),
  ));
}

// ── Domande ai relatori ────────────────────────────────────────────────────
$('rel-nascondi').addEventListener('change', () => disegnaRelatori());
function disegnaRelatori() {
  const tutte = attivi().filter(c => domandeRelatori.has(c.domanda)).sort(piuVecchiPrima);
  const fatte = tutte.filter(c => c.fatta).length;
  $('rel-conteggi').textContent = `${tutte.length - fatte} da porre · ${fatte} già post${fatte === 1 ? 'a' : 'e'}`;
  const nascondi = $('rel-nascondi').checked;
  const voci = tutte.map((c, i) => ({ c, n: i + 1 })).filter(x => !nascondi || !x.c.fatta);
  $('rel-lista').replaceChildren(...voci.map(({ c, n }) => {
    const p = partiScheda(c, null, { etichetta: false });
    return el('li', { class: 'rel-voce' + (c.fatta ? ' fatta' : ''), '--c': p.colore },
      el('span', { class: 'rel-numero' }, String(n)),
      el('div', {}, el('p', { class: 'rel-testo' }, c.testo), p.piede),
      el('div', { class: 'r-comandi' },
        el('button', { type: 'button', class: 'r-icona', title: c.evidenza ? 'Togli da in evidenza' : 'Metti in evidenza (per proiettarla)', 'aria-pressed': String(c.evidenza), onclick: () => store.aggiorna(c.id, { evidenza: !c.evidenza }).catch(errore) }, icona('stella')),
        el('button', { type: 'button', class: 'pulsante', onclick: () => store.aggiorna(c.id, { fatta: !c.fatta }).catch(errore) },
          c.fatta ? 'Già posta' : 'Segna come fatta', c.fatta ? null : icona('spunta')),
      ),
    );
  }));
  $('rel-vuoto').hidden = tutte.length > 0;
}

// ── Schermo ────────────────────────────────────────────────────────────────
const modi = [
  { id: 'accoglienza', titolo: 'Accoglienza', nota: 'Titolo dell’evento e QR code grande, per invitare a partecipare.' },
  { id: 'bacheca', titolo: 'Bacheca', nota: 'Tutti i contributi, dal più recente, man mano che arrivano. Quelli che rimuovi spariscono subito.' },
  { id: 'evidenza', titolo: 'Totale e in evidenza', nota: 'Il numero dei contributi e quelli in evidenza a caratteri grandi.' },
  { id: 'temi', titolo: 'Temi di una domanda', nota: 'I temi di una domanda, con il numero di contributi per tema.' },
];
// Domanda scelta per ciascuna modalità che ne usa una (la bacheca può mostrarle tutte).
const domandaPerModo = { temi: domande.find(d => !d.relatori)?.id || domande[0]?.id, bacheca: '' };
function disegnaSchermo() {
  const attuale = statoSchermo.modo || 'accoglienza';
  if (attuale === 'temi' && statoSchermo.domanda) domandaPerModo.temi = statoSchermo.domanda;
  if (attuale === 'bacheca') domandaPerModo.bacheca = statoSchermo.domanda || '';
  const imposta = (modo, domanda) => store.impostaSchermo({ modo, domanda: domanda || null }).catch(errore);
  $('s-modi').replaceChildren(...modi.map(m => {
    const scelto = m.id === attuale;
    const radio = el('input', { type: 'radio', name: 's-modo', value: m.id, checked: scelto, onchange: () => imposta(m.id, domandaPerModo[m.id]) });
    const parti = [radio, el('strong', {}, m.titolo), el('span', { class: 'nota' }, m.nota)];
    if (m.id === 'temi' || m.id === 'bacheca') {
      const voci = m.id === 'temi'
        ? domande.filter(d => !d.relatori).map(d => el('option', { value: d.id }, d.breve || d.titolo))
        : [el('option', { value: '' }, 'Tutte le domande'), ...domande.map(d => el('option', { value: d.id }, d.breve || d.titolo))];
      const s = el('select', { class: 'campo', 'aria-label': 'Domanda da mostrare', onchange: e => { domandaPerModo[m.id] = e.target.value; imposta(m.id, e.target.value); } }, ...voci);
      s.value = domandaPerModo[m.id];
      parti.push(s);
    }
    return el('label', { class: 's-modo' + (scelto ? ' attivo' : '') }, ...parti);
  }));
  const ev = attivi().filter(c => c.evidenza).sort(piuVecchiPrima);
  $('s-evidenza').replaceChildren(...(ev.length ? ev.map(c => el('li', { '--c': domanda(c.domanda)?.colore },
    el('span', {}, c.testo),
    el('button', { type: 'button', class: 'r-icona', title: 'Togli da in evidenza', 'aria-pressed': 'true', onclick: () => store.aggiorna(c.id, { evidenza: false }).catch(errore) }, icona('stella')),
  )) : [el('li', { class: 'nota', style: { borderLeft: '0', paddingLeft: '0' } }, 'Nessun contributo in evidenza. Usa la stella nella lista dei contributi.')]));
  scalaAnteprima();
}
function scalaAnteprima() {
  const cornice = document.querySelector('.s-cornice');
  if (!cornice || !cornice.clientWidth) return;
  $('s-iframe').style.transform = `scale(${cornice.clientWidth / 1600})`;
}
addEventListener('resize', scalaAnteprima);

// ── Testi delle domande ────────────────────────────────────────────────────
const limitiTesto = { titolo: 60, breve: 30, domanda: 300, guida: 400 };
const etichetteCampi = {
  titolo: 'Etichetta (compare in maiuscolo sopra la domanda)',
  breve: 'Nome breve (filtri e post-it)',
  domanda: 'Domanda',
  guida: 'Testo guida (sotto la domanda, sul telefono)',
};
const formTesti = new Map(); // id domanda -> { nodo, campi, stato, modificato }

function valoriAttuali(id) {
  const d = domanda(id);
  return Object.fromEntries(CAMPI_TESTO_DOMANDA.map(k => [k, d[k] || '']));
}

function costruisciFormTesti(d) {
  const campi = {};
  const stato = el('span', { class: 'td-stato', role: 'status' });
  const segno = el('span', { class: 'td-modificata' });
  const voce = { campi, stato, segno, modificato: false };
  const segnaModificato = () => { voce.modificato = true; stato.textContent = 'Modifiche non salvate'; stato.classList.add('da-salvare'); };
  for (const k of CAMPI_TESTO_DOMANDA) {
    const lungo = k === 'domanda' || k === 'guida';
    campi[k] = el(lungo ? 'textarea' : 'input', { class: 'campo', maxlength: limitiTesto[k], rows: lungo ? 2 : undefined, type: lungo ? undefined : 'text', oninput: segnaModificato });
  }
  const salva = async () => {
    const nuovi = Object.fromEntries(CAMPI_TESTO_DOMANDA.map(k => [k, campi[k].value.trim()]));
    if (!nuovi.titolo || !nuovi.domanda) { stato.textContent = 'Etichetta e domanda non possono restare vuote.'; return; }
    const originale = testiOriginali(d.id);
    const tutti = JSON.parse(JSON.stringify(testiSalvati));
    const diversi = CAMPI_TESTO_DOMANDA.some(k => nuovi[k] !== originale[k]);
    if (diversi) tutti[d.id] = nuovi; else delete tutti[d.id];
    stato.textContent = 'Salvataggio…';
    try {
      await store.salvaTestiDomande(tutti);
      voce.modificato = false;
      stato.classList.remove('da-salvare');
      stato.textContent = 'Salvato';
      riempi(true);
    } catch (e) { errore(e); stato.textContent = 'Non salvato'; }
  };
  const ripristina = () => {
    const o = testiOriginali(d.id);
    for (const k of CAMPI_TESTO_DOMANDA) campi[k].value = o[k];
    segnaModificato();
  };
  function riempi(forza) {
    if (voce.modificato && !forza) return; // non sovrascrivere ciò che si sta scrivendo
    const v = valoriAttuali(d.id);
    for (const k of CAMPI_TESTO_DOMANDA) if (campi[k].value !== v[k]) campi[k].value = v[k];
    segno.textContent = testiSalvati[d.id] ? 'Testo modificato' : '';
  }
  voce.riempi = riempi;
  const campo = k => el('label', {}, el('span', { class: 'etichetta-campo' }, etichetteCampi[k]), campi[k]);
  voce.nodo = el('div', { class: 'td-voce', '--c': d.colore },
    segno,
    el('div', { class: 'td-riga' }, campo('titolo'), campo('breve')),
    campo('domanda'),
    campo('guida'),
    el('div', { class: 'td-azioni' },
      el('button', { type: 'button', class: 'pulsante', onclick: salva }, 'Salva'),
      el('button', { type: 'button', class: 'pulsante-testo', onclick: ripristina }, 'Ripristina il testo originale'),
      stato,
    ),
  );
  return voce;
}

function disegnaTesti() {
  for (const d of domande) {
    if (!formTesti.has(d.id)) formTesti.set(d.id, costruisciFormTesti(d));
    formTesti.get(d.id).riempi();
  }
  riconcilia($('r-testi-lista'), domande.map(d => formTesti.get(d.id).nodo));
}

// ── Esportazione CSV ───────────────────────────────────────────────────────
$('esporta').addEventListener('click', () => {
  const colonne = ['id', 'data e ora', 'nome', 'domanda', 'testo', 'tema', 'in evidenza', 'rimosso', 'fatta', 'origine'];
  const sn = v => (v ? 'sì' : 'no');
  const righe = contributi.slice().sort(piuVecchiPrima).map(c => [
    c.id, dataOra(c.creato), c.nome, domanda(c.domanda)?.titolo || c.domanda, c.testo,
    nomeTema(c.tema) || '', sn(c.evidenza), sn(c.rimosso), sn(c.fatta), c.origine,
  ]);
  const cella = v => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Punto e virgola e BOM: Excel in italiano lo apre direttamente con gli accenti corretti.
  const csv = '﻿' + [colonne, ...righe].map(r => r.map(cella).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `contributi-${config.evento.id}-${dataOra(Date.now()).slice(0, 16).replace(/[-:]/g, '').replace(' ', '-')}.csv` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});

ridisegna();
