// Livello dati finto: tutto resta nel browser (localStorage).
// Le schede aperte nello stesso browser restano sincronizzate (BroadcastChannel),
// così si possono provare insieme pubblico, regia e schermo.
import { semina, prossimoArrivo, nuovoId } from './dati-demo.js';

export function creaStoreDemo(config) {
  const chiave = `bacheca-demo:${config.evento.id}`;
  const canale = 'BroadcastChannel' in window ? new BroadcastChannel(chiave) : null;
  const ascoltatori = { contributi: new Set(), temi: new Set(), schermo: new Set(), testi: new Set() };

  function leggi() {
    try {
      const s = JSON.parse(localStorage.getItem(chiave));
      if (s && s.versione === 1) return s;
    } catch { /* dati assenti o illeggibili: si riparte */ }
    const s = semina(config);
    scrivi(s);
    return s;
  }
  function scrivi(s) { try { localStorage.setItem(chiave, JSON.stringify(s)); } catch { /* spazio esaurito o bloccato */ } }

  let stato = leggi();

  function notifica() {
    queueMicrotask(() => {
      for (const cb of ascoltatori.contributi) cb(stato.contributi.map(c => ({ ...c })), { daCache: false });
      for (const cb of ascoltatori.temi) cb(stato.temi.map(t => ({ ...t })), { daCache: false });
      for (const cb of ascoltatori.schermo) cb({ ...stato.schermo });
      for (const cb of ascoltatori.testi) cb(JSON.parse(JSON.stringify(stato.testiDomande || {})));
    });
  }
  function cambia(fn) {
    stato = leggi();           // riparte dall'ultima versione salvata da qualunque scheda
    fn(stato);
    scrivi(stato);
    notifica();
    canale?.postMessage('cambio');
  }
  const ricarica = () => { stato = leggi(); notifica(); };
  if (canale) canale.onmessage = ricarica;
  else addEventListener('storage', e => { if (e.key === chiave) ricarica(); });

  // Una sola scheda alla volta simula l'arrivo di nuovi contributi.
  navigator.locks?.request(`${chiave}:arrivi`, () => new Promise(() => {
    setInterval(() => cambia(s => { const c = prossimoArrivo(s, config); if (c) s.contributi.push(c); }), 20000);
  }));

  function ascolta(tipo, cb) {
    ascoltatori[tipo].add(cb);
    notifica();
    return () => ascoltatori[tipo].delete(cb);
  }
  const attesa = ms => new Promise(r => setTimeout(r, ms));

  return {
    tipo: 'demo',
    ascoltaContributi: cb => ascolta('contributi', cb),
    ascoltaTemi: cb => ascolta('temi', cb),
    ascoltaSchermo: cb => ascolta('schermo', cb),
    ascoltaTestiDomande: cb => ascolta('testi', cb),

    async salvaTestiDomande(testi) {
      cambia(s => { s.testiDomande = JSON.parse(JSON.stringify(testi)); });
    },

    async inviaContributo({ domanda, testo, nome = '', origine = 'app' }) {
      await attesa(350);
      const adesso = Date.now();
      const c = { id: nuovoId(), domanda, testo, nome, origine, creato: adesso, aggiornato: adesso, tema: null, evidenza: false, rimosso: false, fatta: false };
      cambia(s => s.contributi.push(c));
      return c.id;
    },

    async aggiorna(id, campi) {
      cambia(s => { const c = s.contributi.find(x => x.id === id); if (c) Object.assign(c, campi, { aggiornato: Date.now() }); });
    },

    async aggiornaMolti(ids, campi) {
      const insieme = new Set(ids);
      cambia(s => { for (const c of s.contributi) if (insieme.has(c.id)) Object.assign(c, campi, { aggiornato: Date.now() }); });
    },

    async creaTema(nome, domanda) {
      const t = { id: nuovoId(), nome, domanda, creato: Date.now() };
      cambia(s => s.temi.push(t));
      return t.id;
    },

    async rinominaTema(id, nome) {
      cambia(s => { const t = s.temi.find(x => x.id === id); if (t) t.nome = nome; });
    },

    async eliminaTema(id, idsContributi) {
      const insieme = new Set(idsContributi);
      cambia(s => {
        for (const c of s.contributi) if (insieme.has(c.id)) c.tema = null;
        s.temi = s.temi.filter(t => t.id !== id);
      });
    },

    async unisciTemi(destinazione, nomeFinale, altri, idsContributi) {
      const insieme = new Set(idsContributi);
      const via = new Set(altri);
      cambia(s => {
        for (const c of s.contributi) if (insieme.has(c.id)) c.tema = destinazione;
        s.temi = s.temi.filter(t => !via.has(t.id));
        const d = s.temi.find(t => t.id === destinazione);
        if (d) d.nome = nomeFinale;
      });
    },

    async impostaSchermo(nuovo) {
      cambia(s => { s.schermo = { modo: nuovo.modo, domanda: nuovo.domanda || null }; });
    },

    /** Solo demo: riporta i dati allo stato iniziale. */
    ripristinaDemo() {
      cambia(s => Object.assign(s, semina(config)));
    },
  };
}
