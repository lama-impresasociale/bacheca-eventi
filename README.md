# Bacheca eventi · LAMA Impresa Sociale

App leggera per raccogliere e mostrare dal vivo i contributi del pubblico durante un evento, in sostituzione di Padlet.
Il pubblico scrive dallo smartphone (QR code), la regia modera e raggruppa per temi, il proiettore mostra totale, contributi in evidenza e temi.

Pilota: **Stati Generali di Vallombrosa**, sabato 28 novembre 2026, Reggello.

## Le tre pagine

| Pagina | Per chi | Cosa fa |
|---|---|---|
| `index.html` | pubblico, da telefono | benvenuto con nome facoltativo, scelta della domanda, scrittura (400 caratteri), conferma. Il pubblico non vede la bacheca: la mostra la regia sul proiettore |
| `regia.html` | regia, da computer | modifica dei testi delle domande dal vivo, rimozione e ripristino, temi (crea, rinomina, unisci, elimina, assegna anche a più contributi insieme), in evidenza, inserimento dei post-it, domande ai relatori con "fatta", comandi dello schermo, esportazione CSV |
| `schermo.html` | proiettore | quattro modalità scelte dalla regia: accoglienza con QR grande, bacheca con tutti i contributi dal più recente (anche di una sola domanda), totale e contributi in evidenza, temi di una domanda con i conteggi |

**Modalità demo.** Finché in `config.js` manca la configurazione Firebase, tutte le pagine funzionano con dati finti salvati nel browser.
Con Firebase configurato, la demo resta disponibile aggiungendo `?demo` all'indirizzo (per esempio `regia.html?demo`).
Le schede aperte nello stesso browser restano sincronizzate: apri pubblico, regia e schermo in tre schede per provarle insieme.

## Configurazione: un solo file

I testi delle domande si possono cambiare anche dalla regia (scheda *Testi delle domande*): le modifiche si salvano in Firestore (`eventi/{id evento}/stato/domande`) e valgono subito su telefoni e schermo; `config.js` resta il testo di partenza, ripristinabile con un clic.

Tutto ciò che cambia da un evento all'altro sta in `config.js`: titolo, sottotitolo, spiegazione, informativa, domande (titolo, testo, guida, colore), colori, limiti, testi dell'interfaccia del pubblico e dello schermo, collegamento a Firebase.

Per un nuovo evento cambia almeno `evento.id`: i dati di ogni evento restano separati nello stesso progetto Firebase.

## Messa in linea

### 1. Firebase (database in tempo reale)

1. Vai su <https://console.firebase.google.com> e crea un progetto (Google Analytics non serve).
2. *Build → Firestore Database → Crea database*: edizione **Standard**, località **europe-west8 (Milano)** (non si può cambiare dopo), avvio in **modalità produzione**.
3. Scheda **Regole**: sostituisci tutto con il contenuto di `firestore.rules` e premi **Pubblica**.
4. *Impostazioni progetto → Generali → Le tue app → icona Web `</>`*: registra un'app (Firebase Hosting non serve) e copia i valori dell'oggetto `firebaseConfig` nel blocco `firebase` di `config.js`.

Questi valori non sono segreti: identificano il progetto, e la protezione dei dati sta nelle regole.

**Piano gratuito o a pagamento?** Il pubblico scrive soltanto e non legge la bacheca: le letture vengono quasi solo da regia e schermo, poche migliaia in tutta la giornata, ben sotto la soglia gratuita di 50.000 letture al giorno del piano Spark.
Se la soglia si esaurisce, Firestore smette di rispondere fino alle 9 del mattino dopo (mezzanotte del Pacifico).
Per non correre rischi puoi passare al piano Blaze: la stessa soglia resta gratuita e l'eccedenza costerebbe pochi centesimi. In quel caso imposta un avviso di budget.

### 2. GitHub Pages (pubblicazione)

1. Repository **pubblico** nell'organizzazione (GitHub Pages gratuito richiede un repository pubblico).
2. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, branch **main**, cartella **/ (root)**.
3. Dopo un minuto l'app è su `https://<organizzazione>.github.io/<repository>/`. Il QR dello schermo usa questo indirizzo in automatico: per forzarne un altro compila `indirizzoPubblico` in `config.js`.

Ogni modifica pubblicata su `main` va online da sola in circa un minuto.

## Prove prima dell'evento

Aggiungi `?evento=prova` agli indirizzi (per esempio `regia.html?evento=prova` e `schermo.html?evento=prova`): tutte le pagine lavorano su un evento separato e il QR dello schermo porta i telefoni sulla stessa prova.
I contributi di prova restano in `eventi/prova` e non compaiono nell'evento vero né nel suo CSV. Puoi usare qualsiasi nome (`prova-2`, `generale`…) per ripartire da zero.

## Durante l'evento

- **Proiettore:** dalla regia, scheda *Schermo*, premi *Apri lo schermo*, trascina la finestra sul proiettore e premi `F` (o doppio clic) per il tutto schermo. Da quel momento cambi cosa mostra dalla regia.
- **Bacheca proiettata:** la modalità *Bacheca* mostra i contributi dal più recente, man mano che arrivano, senza un tuo filtro preventivo: quelli che rimuovi in regia spariscono subito. Se non entrano tutti il testo si rimpicciolisce; oltre un certo punto si vedono i più recenti.
- **Post-it:** in regia, *Aggiungi da post-it*. La domanda resta selezionata per il post-it successivo; `Ctrl + Invio` aggiunge.
- **Temi:** scegli una domanda a sinistra; nel pannello a destra crei, rinomini, unisci o elimini i temi. Se selezioni dei contributi prima di creare un tema, il nuovo tema viene assegnato a loro.
- **Rimuovere:** il contributo sparisce subito da tutte le bacheche e dallo schermo, ma resta nel database. Con *Anche i rimossi* lo ritrovi e lo puoi ripristinare.
- **Senza rete:** chi è offline vede un avviso; il contributo resta in coda sul telefono e parte appena torna la connessione.
- **Fine evento:** *Esporta CSV* scarica tutti i contributi, rimossi compresi, con domanda, tema e stati. Il file si apre direttamente in Excel.

## Sicurezza: cosa protegge e cosa no

- Il pubblico può solo creare contributi validi (campi, lunghezze, orario del server). Non può modificarli né cancellarli.
- La pagina del pubblico non mostra la bacheca. I dati restano comunque leggibili tecnicamente, perché schermo e regia funzionano senza login: non sono segreti, sono gli stessi che proietti.
- Nessuno può cancellare un contributo dall'app: la rimozione è solo un segno.
- **In questo pilota la regia non ha login:** chi conosce l'indirizzo di `regia.html` può moderare. Non è collegata dalla pagina pubblica e le sue azioni si possono annullare.
  Se servirà, si può aggiungere l'accesso con Google limitato a una lista di email.
- Il limite di un invio ogni 15 secondi è applicato dal telefono: basta a evitare invii doppi, non a fermare un attacco deliberato.

## Struttura

```
config.js            configurazione dell'evento (l'unico file da modificare)
index.html           pubblico          js/partecipante.js   css/partecipante.css
regia.html           regia             js/regia.js          css/regia.css
schermo.html         proiettore        js/schermo.js        css/schermo.css
css/base.css         stile comune ricavato dalla presentazione ARCO–LAMA
js/comune.js         utilità comuni
js/avvio.js          controllo di avvio: se dopo un aggiornamento il browser mescola file vecchi e nuovi, ricarica da solo
js/store-firebase.js livello dati su Firestore
js/store-demo.js     livello dati finto (modalità demo) e js/dati-demo.js
js/vendor/           Firebase e generatore di QR, già pronti (nessuna compilazione necessaria)
firestore.rules      regole di sicurezza da incollare nella console Firebase
strumenti/           solo per sviluppo: ricostruzione di js/vendor e test delle regole
```

Dati in Firestore: `eventi/{id evento}/contributi`, `eventi/{id evento}/temi`, `eventi/{id evento}/stato/schermo`, `eventi/{id evento}/stato/domande` (testi modificati dalla regia).
Ogni contributo ha: data e ora (`creato`), nome (può essere vuoto), domanda, testo, tema, in evidenza, rimosso, fatta, origine (`app` o `post-it`).

## Sviluppo

Nessuna compilazione: basta servire la cartella, per esempio con `python3 -m http.server`, e aprire `http://localhost:8000/?demo`.

Per provare le regole con l'emulatore Firebase (serve Java):

```bash
npx firebase-tools emulators:start --only firestore --project demo-bacheca
```

```bash
cd strumenti && npm install && node test-regole.mjs
```

L'app si collega all'emulatore aggiungendo `?emulatore=127.0.0.1:8080` all'indirizzo.

Per aggiornare Firebase o la libreria QR: in `strumenti/` cambia la versione in `package.json`, poi `npm install && npm run firebase && npm run qr`.

## Licenze di terze parti

- Firebase JS SDK, Apache 2.0 (testo delle licenze in fondo a `js/vendor/firebase.js`).
- qrcode-generator di Kazuhiko Arase, MIT. "QR Code" è un marchio registrato di DENSO WAVE INCORPORATED.
