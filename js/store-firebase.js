// Livello dati su Firestore.
// Struttura: eventi/{idEvento}/contributi/{id}, eventi/{idEvento}/temi/{id}, eventi/{idEvento}/stato/schermo
import {
  initializeApp, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  connectFirestoreEmulator, collection, doc, addDoc, updateDoc, setDoc,
  onSnapshot, serverTimestamp, writeBatch,
} from './vendor/firebase.js';

const ms = t => (t && typeof t.toMillis === 'function') ? t.toMillis() : (typeof t === 'number' ? t : null);

export function creaStoreFirebase(config, { emulatore } = {}) {
  const app = initializeApp(config.firebase);
  // Cache locale persistente: riaprendo la pagina si scaricano solo i cambiamenti,
  // e un invio fatto senza rete parte appena la connessione torna.
  // Se il browser non la supporta, Firestore ripiega da solo sulla memoria.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (emulatore) {
    const [host, porta] = emulatore.split(':');
    connectFirestoreEmulator(db, host || 'localhost', Number(porta) || 8080);
  }

  const idEvento = config.evento.id;
  const colContributi = collection(db, 'eventi', idEvento, 'contributi');
  const colTemi = collection(db, 'eventi', idEvento, 'temi');
  const docSchermo = doc(db, 'eventi', idEvento, 'stato', 'schermo');

  function ascoltaCollezione(col, converti, cb, errore) {
    const mappa = new Map();
    return onSnapshot(col, { includeMetadataChanges: true }, snap => {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') mappa.delete(ch.doc.id);
        else mappa.set(ch.doc.id, converti(ch.doc));
      }
      cb([...mappa.values()], { daCache: snap.metadata.fromCache });
    }, err => { console.error(err); errore?.(err); });
  }

  const contributo = d => {
    const x = d.data({ serverTimestamps: 'estimate' });
    return {
      id: d.id,
      domanda: x.domanda,
      testo: x.testo,
      nome: x.nome || '',
      origine: x.origine || 'app',
      creato: ms(x.creato),
      aggiornato: ms(x.aggiornato),
      tema: x.tema || null,
      evidenza: !!x.evidenza,
      rimosso: !!x.rimosso,
      fatta: !!x.fatta,
      inAttesa: d.metadata.hasPendingWrites,
    };
  };
  const tema = d => {
    const x = d.data({ serverTimestamps: 'estimate' });
    return { id: d.id, nome: x.nome, domanda: x.domanda, creato: ms(x.creato) };
  };

  return {
    tipo: 'firebase',

    ascoltaContributi: (cb, errore) => ascoltaCollezione(colContributi, contributo, cb, errore),
    ascoltaTemi: (cb, errore) => ascoltaCollezione(colTemi, tema, cb, errore),
    ascoltaSchermo(cb) {
      return onSnapshot(docSchermo, s => cb(s.exists() ? s.data() : {}), err => console.error(err));
    },

    /** Restituisce una promessa che si risolve quando il server ha ricevuto il contributo. */
    async inviaContributo({ domanda, testo, nome = '', origine = 'app' }) {
      const r = await addDoc(colContributi, {
        domanda, testo, nome, origine,
        creato: serverTimestamp(), aggiornato: serverTimestamp(),
        tema: null, evidenza: false, rimosso: false, fatta: false,
      });
      return r.id;
    },

    aggiorna(id, campi) {
      return updateDoc(doc(colContributi, id), { ...campi, aggiornato: serverTimestamp() });
    },

    async aggiornaMolti(ids, campi) {
      for (let i = 0; i < ids.length; i += 400) {
        const b = writeBatch(db);
        for (const id of ids.slice(i, i + 400)) b.update(doc(colContributi, id), { ...campi, aggiornato: serverTimestamp() });
        await b.commit();
      }
    },

    async creaTema(nome, domanda) {
      const r = await addDoc(colTemi, { nome, domanda, creato: serverTimestamp() });
      return r.id;
    },

    rinominaTema(id, nome) { return updateDoc(doc(colTemi, id), { nome }); },

    /** Elimina un tema e libera i contributi che lo avevano. */
    async eliminaTema(id, idsContributi) {
      const b = writeBatch(db);
      for (const c of idsContributi) b.update(doc(colContributi, c), { tema: null, aggiornato: serverTimestamp() });
      b.delete(doc(colTemi, id));
      await b.commit();
    },

    /** Sposta nel tema di destinazione i contributi degli altri temi, poi elimina gli altri. */
    async unisciTemi(destinazione, nomeFinale, altri, idsContributi) {
      const b = writeBatch(db);
      for (const c of idsContributi) b.update(doc(colContributi, c), { tema: destinazione, aggiornato: serverTimestamp() });
      for (const t of altri) b.delete(doc(colTemi, t));
      b.update(doc(colTemi, destinazione), { nome: nomeFinale });
      await b.commit();
    },

    impostaSchermo(stato) {
      return setDoc(docSchermo, { modo: stato.modo, domanda: stato.domanda || null, aggiornato: serverTimestamp() });
    },
  };
}
