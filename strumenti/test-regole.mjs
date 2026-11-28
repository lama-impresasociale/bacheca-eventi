// Prova le regole di Firestore contro l'emulatore locale.
// Uso: avvia l'emulatore dalla cartella principale
//   npx firebase emulators:start --only firestore --project demo-bacheca
// poi, da questa cartella:  node test-regole.mjs
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc,
} from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-bacheca', apiKey: 'finta' });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const ev = 'test-' + Date.now();
const col = collection(db, 'eventi', ev, 'contributi');
const base = () => ({
  domanda: 'senza-auto', testo: 'Una navetta che aspetti il treno.', nome: 'Anna', origine: 'app',
  creato: serverTimestamp(), aggiornato: serverTimestamp(), tema: null, evidenza: false, rimosso: false, fatta: false,
});

let ok = 0, ko = 0;
async function prova(nome, atteso, fn) {
  let esito;
  try { await fn(); esito = 'ammesso'; } catch (e) { esito = e.code === 'permission-denied' ? 'rifiutato' : 'errore ' + e.code; }
  const giusto = esito === atteso;
  giusto ? ok++ : ko++;
  console.log(`${giusto ? 'OK ' : 'NO '} ${nome}: ${esito}${giusto ? '' : ` (atteso: ${atteso})`}`);
}

let id;
await prova('crea contributo valido', 'ammesso', async () => { id = (await addDoc(col, base())).id; });
await prova('crea contributo da post-it', 'ammesso', () => addDoc(col, { ...base(), origine: 'post-it', nome: '' }));
await prova('400 caratteri con accenti', 'ammesso', () => addDoc(col, { ...base(), testo: 'àèìòùé'.repeat(66) + 'ciao' }));
await prova('emoji (400 unità JS)', 'ammesso', () => addDoc(col, { ...base(), testo: '🚆'.repeat(200) }));
await prova('401 caratteri', 'rifiutato', () => addDoc(col, { ...base(), testo: 'a'.repeat(401) }));
await prova('testo vuoto', 'rifiutato', () => addDoc(col, { ...base(), testo: '' }));
await prova('nome troppo lungo', 'rifiutato', () => addDoc(col, { ...base(), nome: 'x'.repeat(61) }));
await prova('campo in più', 'rifiutato', () => addDoc(col, { ...base(), extra: 1 }));
await prova('nasce già in evidenza', 'rifiutato', () => addDoc(col, { ...base(), evidenza: true }));
await prova('nasce con un tema', 'rifiutato', () => addDoc(col, { ...base(), tema: 'x' }));
await prova('orario falso', 'rifiutato', () => addDoc(col, { ...base(), creato: new Date(2020, 1, 1) }));
await prova('domanda non valida', 'rifiutato', () => addDoc(col, { ...base(), domanda: 'Domanda con spazi' }));
await prova('origine non valida', 'rifiutato', () => addDoc(col, { ...base(), origine: 'altro' }));

await prova('evento chiuso: nuovo contributo', 'rifiutato', () => addDoc(collection(db, 'eventi', 'vallombrosa-2026', 'contributi'), base()));

const rif = doc(col, id);
await prova('regia: assegna tema', 'ammesso', () => updateDoc(rif, { tema: 'abc', aggiornato: serverTimestamp() }));
await prova('regia: evidenza e rimosso', 'ammesso', () => updateDoc(rif, { evidenza: true, rimosso: true, fatta: true, aggiornato: serverTimestamp() }));
await prova('modifica del testo', 'rifiutato', () => updateDoc(rif, { testo: 'cambiato', aggiornato: serverTimestamp() }));
await prova('modifica del nome', 'rifiutato', () => updateDoc(rif, { nome: 'altro', aggiornato: serverTimestamp() }));
await prova('evidenza non booleana', 'rifiutato', () => updateDoc(rif, { evidenza: 'sì', aggiornato: serverTimestamp() }));
await prova('modifica senza orario', 'rifiutato', () => updateDoc(rif, { evidenza: false }));
await prova('cancellazione', 'rifiutato', () => deleteDoc(rif));
await prova('lettura', 'ammesso', () => getDoc(rif));

const temi = collection(db, 'eventi', ev, 'temi');
let t;
await prova('crea tema', 'ammesso', async () => { t = (await addDoc(temi, { nome: 'Navette', domanda: 'senza-auto', creato: serverTimestamp() })).id; });
await prova('tema senza nome', 'rifiutato', () => addDoc(temi, { nome: '', domanda: 'senza-auto' }));
await prova('rinomina tema', 'ammesso', () => updateDoc(doc(temi, t), { nome: 'Navette e orari' }));
await prova('sposta tema di domanda', 'rifiutato', () => updateDoc(doc(temi, t), { domanda: 'altra' }));
await prova('elimina tema', 'ammesso', () => deleteDoc(doc(temi, t)));

const schermo = doc(db, 'eventi', ev, 'stato', 'schermo');
await prova('schermo: modo valido', 'ammesso', () => setDoc(schermo, { modo: 'temi', domanda: 'senza-auto', aggiornato: serverTimestamp() }));
await prova('schermo: modo bacheca', 'ammesso', () => setDoc(schermo, { modo: 'bacheca', domanda: null, aggiornato: serverTimestamp() }));
await prova('schermo: modo vuoto', 'rifiutato', () => setDoc(schermo, { modo: '', domanda: null, aggiornato: serverTimestamp() }));
await prova('schermo: campo in più', 'rifiutato', () => setDoc(schermo, { modo: 'temi', domanda: null, extra: 1 }));
await prova('testi domande: salva', 'ammesso', () => setDoc(doc(db, 'eventi', ev, 'stato', 'domande'), { testi: { 'senza-auto': { titolo: 'Senza auto', domanda: 'Nuovo testo?' } }, aggiornato: serverTimestamp() }));
await prova('testi domande: campo in più', 'rifiutato', () => setDoc(doc(db, 'eventi', ev, 'stato', 'domande'), { testi: {}, altro: 1 }));
await prova('testi domande: non è una mappa', 'rifiutato', () => setDoc(doc(db, 'eventi', ev, 'stato', 'domande'), { testi: 'ciao' }));
await prova('altro documento in stato', 'rifiutato', () => setDoc(doc(db, 'eventi', ev, 'stato', 'x'), { modo: 'temi' }));
await prova('collezione non prevista', 'rifiutato', () => addDoc(collection(db, 'altro'), { a: 1 }));

console.log(`\n${ok} prove riuscite, ${ko} fallite`);
process.exit(ko ? 1 : 0);
