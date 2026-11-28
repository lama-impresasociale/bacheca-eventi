// Controllo di avvio (script classico, non modulo).
// Subito dopo un aggiornamento del sito il browser può avere in cache alcuni file vecchi e altri nuovi:
// in quel caso i moduli non partono e la pagina resta "morta". Qui ce ne accorgiamo,
// riscarichiamo i file ignorando la cache e ricarichiamo la pagina una volta.
// Se non basta, mostriamo un avviso chiaro invece di una pagina che non risponde.
(function () {
  var FILE = [
    'config.js', 'js/comune.js', 'js/pubblico.js', 'js/partecipante.js', 'js/regia.js', 'js/schermo.js',
    'js/store-firebase.js', 'js/store-demo.js', 'js/dati-demo.js',
    'css/base.css', 'css/partecipante.css', 'css/regia.css', 'css/schermo.css',
  ];
  var CHIAVE = 'bacheca:riavvio';
  var gestito = false;

  function avvisa() {
    var a = document.createElement('div');
    a.setAttribute('role', 'alert');
    a.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;padding:14px 18px;background:#EEF1E6;color:#074844;' +
      'font:16px/1.4 system-ui,-apple-system,sans-serif;text-align:center';
    a.textContent = 'La pagina è stata appena aggiornata e il browser ha ancora dei file vecchi. ' +
      'Aspetta un minuto e ricaricala (su computer: Cmd+Maiusc+R su Mac, Ctrl+Maiusc+R su Windows).';
    (document.body || document.documentElement).appendChild(a);
  }

  function recupera() {
    if (gestito || window.bachecaAvviata) return;
    gestito = true;
    var ultimo = 0;
    try { ultimo = Number(sessionStorage.getItem(CHIAVE)) || 0; } catch (e) { /* ok */ }
    if (Date.now() - ultimo < 60000 || !window.fetch) { avvisa(); return; }
    try { sessionStorage.setItem(CHIAVE, String(Date.now())); } catch (e) { /* ok */ }
    var base = new URL('./', location.href);
    Promise.all(FILE.map(function (f) {
      return fetch(new URL(f, base), { cache: 'reload' }).catch(function () {});
    })).then(function () { location.reload(); });
  }

  // Errori prima dell'avvio: modulo non trovato, file incompatibili, errori di sintassi.
  window.addEventListener('error', function () {
    if (!window.bachecaAvviata) setTimeout(recupera, 50);
  }, true);
  // Rete lenta: se a pagina caricata i moduli non sono ancora partiti, interveniamo comunque.
  window.addEventListener('load', function () {
    setTimeout(function () { if (!window.bachecaAvviata) recupera(); }, 8000);
  });
})();
