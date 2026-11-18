const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../public/js/engine.js');

const data = path.join(__dirname, '..', 'public', 'data');
L.load(fs.readFileSync(path.join(data, 'lexique.txt'), 'utf8'));
L.loadThes(fs.readFileSync(path.join(data, 'synonymes.txt'), 'utf8'));
const D = L.D;
const words = (a) => a.map((i) => D.W[i]);
const reset = () => { Object.assign(L.F, { syl: 0, cat: 0, voc: 1, base: false }); L.setLoose(false); };

test('le dictionnaire est chargé', () => {
  assert.ok(D.n > 120000);
  assert.ok(L.T.map.size > 30000);
});

test('analyse : sons, syllabes, élisions', () => {
  const q = L.analyze('une nuit sans sommeil');
  assert.strictEqual(q.syl.length, 5);
  assert.strictEqual(L.spell(q.syl), 'une·nui·san·so·mèy');
  assert.strictEqual(L.analyze("l'amour qu'il a aujourd'hui").syl.length, 7);
  assert.strictEqual(L.analyseLigne("J'écris ce que je veille et que je ne dis pas").n, 12);
  const l = L.analyseLigne('Une table ronde brille dans la nuit');
  assert.deepStrictEqual([l.n, l.extra], [7, 4]);
});

test('rimes : sommeil rime avec soleil, la rime la plus riche vient en premier', () => {
  reset();
  const r = L.rimes(L.analyze('une nuit sans sommeil'));
  assert.ok(r.length >= 2);
  assert.ok(r[0].n > r[r.length - 1].n);
  const all = words(r.flatMap((g) => g.items));
  for (const w of ['soleil', 'réveil', 'merveille', 'oreille']) assert.ok(all.includes(w), w);
  assert.ok(!all.includes('sommeil'));
});

test('filtres : syllabes et nature', () => {
  reset(); L.F.syl = 2; L.F.cat = 1;
  const all = L.rimes(L.analyze('sommeil')).flatMap((g) => g.items);
  assert.ok(all.length > 0);
  assert.ok(all.every((i) => D.NS[i] === 2 && (D.FL[i] & 1)));
  reset();
});

test('rimes multisyllabiques : mêmes voyelles sur deux syllabes', () => {
  reset();
  const m = L.multi(L.analyze('sommeil'), 2);
  assert.ok(words(m.close).includes('soleil'));
  assert.ok(m.vowels.length > 100);
});

test('lettres contenues : R et V', () => {
  reset();
  const any = words(L.lettres('rv', 'any'));
  assert.ok(any.includes('rêve') && any.includes('avoir'));
  assert.ok(any.every((w) => /r/.test(L.deacc(w)) && /v/.test(L.deacc(w))));
  assert.ok(words(L.lettres('rv', 'exact')).every((w) => L.deacc(w).includes('rv')));
  assert.ok(words(L.lettres('rev', 'start')).includes('revoir'));
});

test('mot à trous et anagrammes', () => {
  reset();
  assert.ok(words(L.motif('*ombre')).includes('sombre'));
  assert.ok(words(L.anagrammes('chien').exact).includes('niche'));
});

test('sons contenus, voisins, squelette', () => {
  reset();
  assert.ok(words(L.sons(['R', 'v'], 'any')).includes('rêve'));
  const v = L.voisins(L.analyze('rêve'));
  assert.ok(words(v.homo).includes('rêves'));
  assert.ok(words(v.sub).includes('rive'));
  assert.ok(words(L.squelette(L.analyze('rêve')).items).includes('ravi'));
});

test('verlan et contrepèteries', () => {
  reset();
  assert.strictEqual(L.spell(L.verlan(L.analyze('femme'))[0].syl), 'meuf');
  const c = L.contrepets(L.analyze('une femme folle à la messe')).map((o) => o.parts.map((p) => (p.i !== undefined ? D.W[p.i] : p.t)).join(' '));
  assert.ok(c.some((s) => s.startsWith('une femme molle à la fesse')));
});

test('découpages : mélancolie en rimes souples', () => {
  reset(); L.setLoose(true);
  const d = L.decoupe(L.analyze('mélancolie'), 5).map((x) => words(x).join(' '));
  assert.ok(d.includes('mêlant colis'));
  reset();
});

test('synonymes et famille', () => {
  const s = L.synonymes('triste');
  assert.ok(s.groups[0].syns.includes('navrant'));
  const f = L.famille(L.analyze('aimer'));
  assert.ok(words(f[0].items).includes('aimerais'));
});

test('mots hors dictionnaire : prononciation devinée', () => {
  assert.strictEqual(L.spell(L.analyze('kiffer').syl), 'ki·fé');
  assert.ok(L.analyze('wesh').toks[0].guessed);
});
