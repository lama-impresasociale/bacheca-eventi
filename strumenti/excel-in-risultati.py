#!/usr/bin/env python3
"""Converte l'Excel dei contributi codificati nel file dati della pagina risultati.

Uso:  python3 strumenti/excel-in-risultati.py contributi.xlsx [js/dati-risultati.js]

Legge il foglio «Contributi» (colonne: domanda, testo, tema, rimosso, origine,
altri temi / dettaglio). Scarta i contributi rimossi e quelli senza tema.
Nomi, orari e risposte sulla partecipazione NON finiscono nel file prodotto,
che è pubblico. Serve openpyxl (pip install openpyxl).
"""
import json
import sys
from datetime import date

import openpyxl

# Temi che non sono veri temi: riquadri grigi, sempre in fondo.
RESIDUALI = {'Altro', 'Nessuna indicazione'}
ORIGINI = {'survey': 'questionario', 'app': 'bacheca', 'post-it': 'post-it'}


def pulito(v):
    return '' if v is None else str(v).strip()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sorgente = sys.argv[1]
    destinazione = sys.argv[2] if len(sys.argv) > 2 else 'js/dati-risultati.js'

    foglio = openpyxl.load_workbook(sorgente, data_only=True)['Contributi']
    righe = foglio.iter_rows(values_only=True)
    testata = [pulito(c).lower() for c in next(righe)]
    col = {nome: testata.index(nome) for nome in ('domanda', 'testo', 'tema', 'rimosso', 'origine')}
    col['dettaglio'] = next(i for i, n in enumerate(testata) if n.startswith('altri temi'))

    domande = {}          # titolo -> {tema -> [contributi]}, nell'ordine del foglio
    scartati = {'rimossi': 0, 'senza tema': 0, 'vuoti': 0}
    for r in righe:
        domanda, testo, tema = pulito(r[col['domanda']]), pulito(r[col['testo']]), pulito(r[col['tema']])
        if not domanda and not testo:
            continue
        if pulito(r[col['rimosso']]).lower() in ('sì', 'si'):
            scartati['rimossi'] += 1
            continue
        if not testo:
            scartati['vuoti'] += 1
            continue
        if not tema:
            scartati['senza tema'] += 1
            continue
        origine = pulito(r[col['origine']]).lower()
        voce = {'testo': testo, 'origine': ORIGINI.get(origine, origine)}
        dettaglio = pulito(r[col['dettaglio']])
        if dettaglio:
            voce['dettaglio'] = dettaglio
        domande.setdefault(domanda, {}).setdefault(tema, []).append(voce)

    uscita = []
    for titolo, temi in domande.items():
        elenco = [{'nome': n, 'residuale': n in RESIDUALI, 'contributi': c} for n, c in temi.items()]
        elenco.sort(key=lambda t: (t['residuale'], -len(t['contributi'])))
        for t in elenco:
            if not t['residuale']:
                del t['residuale']
        uscita.append({'titolo': titolo, 'temi': elenco})

    totale = sum(len(t['contributi']) for d in uscita for t in d['temi'])
    dati = {'aggiornato': date.today().isoformat(), 'totale': totale, 'domande': uscita}
    with open(destinazione, 'w', encoding='utf-8') as f:
        f.write('// File generato da strumenti/excel-in-risultati.py: non modificarlo a mano.\n')
        f.write('// Non contiene nomi né orari dei partecipanti.\n')
        f.write('export default ' + json.dumps(dati, ensure_ascii=False, indent=1) + ';\n')

    print(f'{totale} contributi in {destinazione}')
    print('Scartati:', ', '.join(f'{v} {k}' for k, v in scartati.items()))
    for d in uscita:
        print(f"  {d['titolo']}: {sum(len(t['contributi']) for t in d['temi'])} in {len(d['temi'])} temi")


if __name__ == '__main__':
    main()
