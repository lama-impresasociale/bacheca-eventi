#!/usr/bin/env python3
"""Converte l'Excel dei contributi codificati nel file dati della pagina risultati.

Uso:  python3 strumenti/excel-in-risultati.py contributi.xlsx [js/dati-risultati.js]

Legge il foglio «Contributi» (colonne: domanda, testo, tema, rimosso, origine,
altri temi, dettaglio). «altri temi» usa gli stessi nomi di «tema», separati da
punto e virgola; «dettaglio» sono note libere, anch'esse separate da punto e virgola. Scarta i contributi rimossi e quelli senza tema.
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
    col = {nome: testata.index(nome) for nome in ('domanda', 'testo', 'tema', 'rimosso', 'origine', 'altri temi', 'dettaglio')}

    domande = {}          # titolo -> contributi, nell'ordine del foglio
    scartati = {'rimossi': 0, 'senza tema': 0, 'vuoti': 0}
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
        origine = pulito(r[col['origine']]).lower()
        voce = {'testo': testo, 'origine': ORIGINI.get(origine, origine), 'tema': tema}
        altri = [t for t in elenco(r[col['altri temi']]) if t != tema]
        if altri:
            voce['altri'] = altri
        dettaglio = elenco(r[col['dettaglio']])
        if dettaglio:
            voce['dettaglio'] = dettaglio
        domande.setdefault(domanda, []).append(voce)

    uscita = []
    for titolo, contributi in domande.items():
        principali, menzioni = {}, {}
        for c in contributi:
            principali[c['tema']] = principali.get(c['tema'], 0) + 1
            for t in c.get('altri', []):
                menzioni[t] = menzioni.get(t, 0) + 1
        # Ordine dei temi: per contributi, residuali in fondo, poi i temi citati solo come «altro tema».
        nomi = sorted(principali, key=lambda t: (t in RESIDUALI, -principali[t]))
        nomi += sorted((t for t in menzioni if t not in principali), key=lambda t: -menzioni[t])
        temi = []
        for n in nomi:
            t = {'nome': n}
            if n in RESIDUALI:
                t['residuale'] = True
            temi.append(t)
        uscita.append({'titolo': titolo, 'temi': temi, 'contributi': contributi})

    totale = sum(len(d['contributi']) for d in uscita)
    dati = {'aggiornato': date.today().isoformat(), 'totale': totale, 'domande': uscita}
    with open(destinazione, 'w', encoding='utf-8') as f:
        f.write('// File generato da strumenti/excel-in-risultati.py: non modificarlo a mano.\n')
        f.write('// Non contiene nomi né orari dei partecipanti.\n')
        f.write('export default ' + json.dumps(dati, ensure_ascii=False, indent=1) + ';\n')

    print(f'{totale} contributi in {destinazione}')
    print('Scartati:', ', '.join(f'{v} {k}' for k, v in scartati.items()))
    for d in uscita:
        principali = {c['tema'] for c in d['contributi']}
        soli = [t['nome'] for t in d['temi'] if t['nome'] not in principali]
        print(f"  {d['titolo']}: {len(d['contributi'])} in {len(principali)} temi" + (f"; solo come altro tema: {', '.join(soli)}" if soli else ''))


if __name__ == '__main__':
    main()
