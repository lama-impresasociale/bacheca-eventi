// Le sole funzioni Firebase usate dall'app. Per rigenerare js/vendor/firebase.js:
//   cd strumenti && npm install && npm run firebase
export { initializeApp } from 'firebase/app';
export {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  connectFirestoreEmulator, collection, doc, addDoc, updateDoc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp, writeBatch
} from 'firebase/firestore';
