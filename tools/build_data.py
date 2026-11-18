"""Fabrique les deux fichiers de public/data/ à partir des sources brutes.

Usage : python3 tools/build_data.py DOSSIER_SOURCES public/data

DOSSIER_SOURCES doit contenir :
  - Lexique383.tsv  (http://www.lexique.org/databases/Lexique383/Lexique383.tsv, CC BY-SA 4.0)
  - thes_fr.dat     (thésaurus français de LibreOffice, paquet Debian/Ubuntu "mythes-fr",
                     fichier usr/share/mythes/thes_fr.dat)

lexique.txt : 1re ligne = mots de base séparés par "|", puis une ligne par forme :
  orthographe <tab> syllabes phonétiques <tab> drapeaux (base 36) <tab> fréquence (base 36) <tab> mots de base (indices base 36)
  drapeaux : 1 nom, 2 verbe, 4 adjectif, 8 adverbe, 16 autre, 32 forme de base, 64 infinitif, 128 pluriel
  fréquence : 100 * log10(1 + occurrences par million), moyenne films/livres ; les lignes sont triées de la plus fréquente à la plus rare.
synonymes.txt : vocabulaire, natures, puis "mot=nature:synonymes;…" en indices base 36.
"""
import csv, collections, math, sys, re
RAW, OUT = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(open(RAW + '/Lexique383.tsv', encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE))
def b36(n):
    s = ''
    d = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0: return '0'
    while n: s = d[n % 36] + s; n //= 36
    return s
CG = {'NOM': 1, 'VER': 2, 'AUX': 2, 'ADJ': 4, 'ADV': 8}
ent = collections.OrderedDict()
for r in rows:
    o, p = r['ortho'].strip(), r['phon'].strip()
    if not o or not p: continue
    k = (o, p)
    e = ent.get(k)
    if e is None:
        e = ent[k] = {'o': o, 's': r['syll'].strip(), 'fl': 0, 'f': 0.0, 'lem': []}
    cg = r['cgram']
    e['fl'] |= CG.get(cg, 4 if cg.startswith('ADJ') else 16)
    if r['islem'] == '1': e['fl'] |= 32
    if 'inf' in r['infover']: e['fl'] |= 64
    if r['nombre'] == 'p': e['fl'] |= 128
    try: e['f'] += (float(r['freqfilms2']) + float(r['freqlivres'])) / 2
    except ValueError: pass
    if r['lemme'] and r['lemme'] not in e['lem']: e['lem'].append(r['lemme'])
L = sorted(ent.values(), key=lambda e: (-e['f'], e['o']))
lemmas = {}
for e in L:
    for l in e['lem']:
        lemmas.setdefault(l, len(lemmas))
with open(OUT + '/lexique.txt', 'w', encoding='utf-8') as f:
    f.write('|'.join(lemmas.keys()) + '\n')
    for e in L:
        fq = round(100 * math.log10(1 + e['f']))
        f.write('\t'.join([e['o'], e['s'], b36(e['fl']), b36(fq), ','.join(b36(lemmas[l]) for l in e['lem'])]) + '\n')
print('entries', len(L), 'lemmas', len(lemmas))

# thesaurus
lines = open(RAW + '/thes_fr.dat', encoding='utf-8').read().split('\n')
vocab = {}
def vid(w):
    w = w.strip()
    return vocab.setdefault(w, len(vocab))
out = []
i = 1
POS = {}
while i < len(lines):
    ln = lines[i]
    if '|' not in ln: i += 1; continue
    head, n = ln.rsplit('|', 1)
    n = int(n); parts = []
    for j in range(n):
        seg = lines[i + 1 + j].split('|')
        pos = seg[0].strip('()')
        pc = POS.setdefault(pos, len(POS))
        syns = [s for s in seg[1:] if s.strip() and s.strip() != head]
        if syns: parts.append(b36(pc) + ':' + ','.join(b36(vid(s)) for s in syns))
    if parts: out.append(b36(vid(head)) + '=' + ';'.join(parts))
    i += 1 + n
with open(OUT + '/synonymes.txt', 'w', encoding='utf-8') as f:
    f.write('|'.join(vocab.keys()) + '\n')
    f.write('|'.join(POS.keys()) + '\n')
    f.write('\n'.join(out) + '\n')
print('thes heads', len(out), 'vocab', len(vocab), POS)
