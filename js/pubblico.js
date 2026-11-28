// Avvio della pagina del pubblico (index.html).
// Se la raccolta è chiusa (config.js → raccoltaChiusa) mostra solo un messaggio:
// niente modulo e nessun collegamento al database. Altrimenti carica la pagina normale.
import { config, T, applicaColori, el } from './comune.js';

if (config.raccoltaChiusa) {
  window.bachecaAvviata = true; // vedi js/avvio.js
  applicaColori();
  for (const s of document.querySelectorAll('[data-schermata]')) s.remove();
  document.body.prepend(el('section', { class: 'schermata chiusa' },
    el('div', { class: 'contenuto' },
      el('h1', { class: 'occhiello titolo-evento' }, config.evento.titolo),
      el('p', { class: 'sottotitolo' }, config.evento.sottotitolo),
      el('h2', { class: 'titolo-schermata' }, T.chiusaTitolo),
      el('p', { class: 'spiegazione' }, T.chiusaTesto),
    ),
  ));
} else {
  import('./partecipante.js');
}
