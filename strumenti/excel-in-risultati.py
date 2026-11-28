#!/usr/bin/env python3
"""Converte l'Excel dei contributi codificati nel file dati della pagina risultati.

Uso:  python3 strumenti/excel-in-risultati.py contributi.xlsx [js/dati-risultati.js]

Legge il foglio «Contributi» (colonne: id, data e ora, domanda, testo, tema,
rimosso, origine, altri temi). «altri temi» usa gli stessi nomi di «tema»,
separati da punto e virgola. Scarta i contributi rimossi e quelli senza tema.

Nel file prodotto, che è pubblico, finiscono solo il testo e i temi di ogni
contributo, più i numeri della raccolta per l'introduzione: niente nomi, orari,
origine del singolo contributo né colonna «dettaglio». Serve openpyxl.
"""
import json
import sys
from datetime import date, datetime

import openpyxl

# Temi che non sono veri temi: riquadri grigi, sempre in fondo.
RESIDUALI = {'Altro', 'Nessuna indicazione'}
ORIGINI = {'survey': 'questionario', 'app': 'bacheca', 'post-it': 'bacheca'}


def pulito(v):
    return '' if v is None else str(v).strip()


def elenco(v):
    return [x.strip() for x in pulito(v).split(';') if x.strip()]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sorgente = sys.argv[1]
    destinazione = sys.argv[2] if len(sys.argv) > 2 else 'js/dati-risultati.js'

    foglio = openpyxl.load_workbook(sorgente, data_only=True)['Contributi']
    righe = foglio.iter_rows(values_only=True)
    testata = [pulito(c).lower() for c in next(righe)]
    col = {nome: testata.index(nome)
           for nome in ('id', 'data e ora', 'domanda', 'testo', 'tema', 'rimosso', 'origine', 'altri temi')}

    domande = {}          # titolo -> contributi, nell'ordine del foglio
    scartati = {'rimossi': 0, 'senza tema': 0, 'vuoti': 0}
    questionario = {'contributi': 0, 'persone': set(), 'date': []}
    bacheca = 0
    for r in righe:
        r = list(r) + [None] * (len(testata) - len(r))
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
        if ORIGINI.get(pulito(r[col['origine']]).lower()) == 'questionario':
            questionario['contributi'] += 1
            # Negli id del questionario la parte prima del trattino è la persona (S07-3: persona 7, domanda 3).
            questionario['persone'].add(pulito(r[col['id']]).split('-')[0])
            if isinstance(r[col['data e ora']], datetime):
                questionario['date'].append(r[col['data e ora']].date())
        else:
            bacheca += 1
        temi = [tema] + [t for t in elenco(r[col['altri temi']]) if t != tema]
        domande.setdefault(domanda, []).append({'testo': testo, 'temi': temi})

    uscita = []
    for titolo, contributi in domande.items():
        nomi = []
        for c in contributi:
            nomi += [t for t in c['temi'] if t not in nomi]
        temi = [{'nome': n, 'residuale': True} if n in RESIDUALI else {'nome': n} for n in nomi]
        uscita.append({'titolo': titolo, 'temi': temi, 'contributi': contributi})

    giorni = questionario['date']
    raccolta = {
        'questionario': {
            'contributi': questionario['contributi'],
            'persone': len(questionario['persone']),
            'dal': min(giorni).isoformat() if giorni else None,
            'al': max(giorni).isoformat() if giorni else None,
        },
        'bacheca': {'contributi': bacheca},
    }
    totale = sum(len(d['contributi']) for d in uscita)
    dati = {'aggiornato': date.today().isoformat(), 'totale': totale, 'raccolta': raccolta, 'domande': uscita}
    with open(destinazione, 'w', encoding='utf-8') as f:
        f.write('// File generato da strumenti/excel-in-risultati.py: non modificarlo a mano.\n')
        f.write('// Non contiene nomi né orari dei partecipanti.\n')
        f.write('export default ' + json.dumps(dati, ensure_ascii=False, indent=1) + ';\n')

    print(f'{totale} contributi in {destinazione}')
    print('Scartati:', ', '.join(f'{v} {k}' for k, v in scartati.items()))
    print('Raccolta:', raccolta)
    for d in uscita:
        print(f"  {d['titolo']}: {len(d['contributi'])} contributi, {len(d['temi'])} temi")


if __name__ == '__main__':
    main()
