/* Fakito — moteur linguistique (sans DOM, testable sous Node) */
(function (root) {
  'use strict';
  var VOW = 'aiyuoOeE°295@§';
  function isV(c) { return c !== undefined && c !== '' && VOW.indexOf(c) >= 0; }
  var RE_NONV = /[^aiyuoOeE°295@§]/g, RE_V = /[aiyuoOeE°295@§]/g;
  var LOOSE = { O: 'o', E: 'e', '9': '2', '°': '2' };
  function loosen(s) { return s.replace(/[OE9°]/g, function (c) { return LOOSE[c]; }); }

  var D = {
    n: 0, W: [], S: [], P: [], LM: [], FL: null, FQ: null, NS: null, lemmas: [],
    byO: new Map(), loose: false, _SL: null, _PL: null, _VS: null, _VL: null, _WN: null, _pm: {}, _lemIdx: null
  };
  var F = { syl: 0, cat: 0, voc: 1, base: false };
  var VOC_MIN = [45, 8, 0];

  function load(txt) {
    var lines = txt.split('\n');
    D.lemmas = lines[0].split('|');
    var n = lines.length - 1;
    while (n > 0 && !lines[n]) n--;
    D.n = n;
    D.W = new Array(n); D.S = new Array(n); D.P = new Array(n); D.LM = new Array(n);
    D.FL = new Uint8Array(n); D.FQ = new Uint16Array(n); D.NS = new Uint8Array(n);
    D.byO = new Map();
    for (var i = 0; i < n; i++) {
      var f = lines[i + 1].split('\t');
      var s = f[1].indexOf('1') >= 0 ? f[1].replace(/1/g, '5') : f[1];
      var p = s.indexOf('-') >= 0 ? s.replace(/-/g, '') : s;
      D.W[i] = f[0]; D.S[i] = s; D.P[i] = p; D.LM[i] = f[4] || '';
      D.FL[i] = parseInt(f[2], 36); D.FQ[i] = parseInt(f[3], 36);
      var m = p.match(RE_V); D.NS[i] = m ? m.length : 0;
      var a = D.byO.get(f[0]);
      if (a) a.push(i); else D.byO.set(f[0], [i]);
    }
    D._SL = D._PL = D._VS = D._VL = D._WN = D._lemIdx = D._bp = null; D._pm = {};
  }
  function setLoose(b) { D.loose = !!b; }
  function nz(s) { return D.loose ? loosen(s) : s; }
  function PH() {
    if (!D.loose) return D.P;
    if (!D._PL) { D._PL = new Array(D.n); for (var i = 0; i < D.n; i++) D._PL[i] = loosen(D.P[i]); }
    return D._PL;
  }
  function SY() {
    if (!D.loose) return D.S;
    if (!D._SL) { D._SL = new Array(D.n); for (var i = 0; i < D.n; i++) D._SL[i] = loosen(D.S[i]); }
    return D._SL;
  }
  function VS() {
    var k = D.loose ? '_VL' : '_VS';
    if (!D[k]) { var P = PH(), a = new Array(D.n); for (var i = 0; i < D.n; i++) a[i] = P[i].replace(RE_NONV, ''); D[k] = a; }
    return D[k];
  }
  function deacc(s) {
    return s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function WN() {
    if (!D._WN) { D._WN = new Array(D.n); for (var i = 0; i < D.n; i++) D._WN[i] = deacc(D.W[i]); }
    return D._WN;
  }
  function pass(i) {
    if (D.FQ[i] < VOC_MIN[F.voc]) return false;
    if (F.cat && !(D.FL[i] & F.cat)) return false;
    if (F.base && !(D.FL[i] & 32)) return false;
    if (F.syl) { var s = D.NS[i]; if (F.syl >= 5 ? s < 5 : s !== F.syl) return false; }
    return true;
  }

  /* ---------- prononciation de secours pour les mots hors dictionnaire ---------- */
  var LV = 'aàâäeéèêëiîïoôöuùûüyÿ';
  function lv(c) { return c !== undefined && c !== '' && LV.indexOf(c) >= 0; }
  function g2p(w) {
    var s = w.toLowerCase().replace(/œ/g, 'eu').replace(/æ/g, 'é').replace(/[^a-zàâäçéèêëîïôöùûüÿ]/g, '');
    if (!s) return '';
    var hasV = function (x) { return /[aàâäeéèêëiîïoôöuùûüyÿ]/.test(x); };
    if (s.length > 6 && /aient$/.test(s)) s = s.slice(0, -5) + 'è';
    else if (s.length > 3 && /(er|ez)$/.test(s)) s = s.slice(0, -2) + 'é';
    else if (s.length > 2 && /et$/.test(s)) s = s.slice(0, -2) + 'è';
    else if (/es?$/.test(s) && hasV(s.replace(/es?$/, '')) && !/[éèê]s?$/.test(s)) {
      s = s.replace(/es?$/, '');
      if (/gu$/.test(s)) s = s.slice(0, -1); else if (/qu$/.test(s)) s = s.slice(0, -2) + 'k';
      else if (/[aeo]u?ill$|[^aeiou]ill$/.test(s)) s = s.slice(0, -3) + (/[^aeiou]ill$/.test(s) ? 'iY' : 'Y');
      else if (/c$/.test(s)) s = s.slice(0, -1) + 'ss';
      else if (/g$/.test(s)) s = s.slice(0, -1) + 'j';
      else if (/[aeiouéèêàâîôû]s$/.test(s)) s = s.slice(0, -1) + 'z';
      s += '|';
    } else if (s.length > 2) s = s.replace(/[tdp]?s$|[xtdp]$/, '');
    var o = '', i = 0, n = s.length;
    function st(x) { return s.startsWith(x, i); }
    while (i < n) {
      var c = s[i], nx = s[i + 1], n2 = s[i + 2], pv = s[i - 1];
      var endOrCons = function (k) { var x = s[i + k]; if (x === undefined) return s[i + k - 1] !== 'm' || s.slice(i, i + k) === 'aim'; return x !== '|' && !lv(x) && x !== 'n' && x !== 'm' && x !== 'h'; };
      if (c === '|') { i++; continue; }
      if (c === 'Y') { o += 'j'; i++; continue; }
      if (st('eau')) { o += 'o'; i += 3; continue; }
      if (st('oin') && endOrCons(3)) { o += 'w5'; i += 3; continue; }
      if ((st('ain') || st('ein') || st('aim')) && endOrCons(3)) { o += '5'; i += 3; continue; }
      if (st('ien') && endOrCons(3)) { o += 'j5'; i += 3; continue; }
      if (st('tion') && pv !== 's' && i > 0) { o += 'sj§'; i += 4; continue; }
      if (st('ou') || st('où') || st('oû')) { o += (lv(n2) && n2 !== 'e' ? 'w' : 'u'); i += 2; continue; }
      if (st('oy') && lv(n2)) { o += 'waj'; i += 2; continue; }
      if (st('oi') || st('oî')) { o += 'wa'; i += 2; continue; }
      if (st('ay') && lv(n2)) { o += 'Ej'; i += 2; continue; }
      if ((st('ail') || st('eil')) && (n2 === 'l' && s[i + 3] === 'l' || s[i + 3] === undefined || s[i + 3] === '|') && s[i + 2] === 'l') { o += (c === 'a' ? 'aj' : 'Ej'); i += (s[i + 3] === 'l' ? 4 : 3); continue; }
      if (st('ai') || st('aî') || st('ei')) { o += 'E'; i += 2; continue; }
      if (st('au')) { o += 'o'; i += 2; continue; }
      if (st('eu') || st('eû')) { var a = s[i + 2]; o += (a !== undefined && a !== '|' && 'rlfvnb'.indexOf(a) >= 0 && !(a === 's' || a === 'z')) ? '9' : '2'; i += 2; continue; }
      if ((st('an') || st('am') || st('en') || st('em')) && endOrCons(2)) { o += '@'; i += 2; continue; }
      if ((st('on') || st('om')) && endOrCons(2)) { o += '§'; i += 2; continue; }
      if ((st('in') || st('im') || st('yn') || st('ym') || st('un') || st('um')) && endOrCons(2)) { o += '5'; i += 2; continue; }
      if (st('sch') || st('sh')) { o += 'S'; i += (st('sch') ? 3 : 2); continue; }
      if (st('ch')) { o += 'S'; i += 2; continue; }
      if (st('ph')) { o += 'f'; i += 2; continue; }
      if (st('gn')) { o += 'N'; i += 2; continue; }
      if (st('qu')) { o += 'k'; i += 2; continue; }
      if (st('gu') && n2 && 'eiéèêy'.indexOf(n2) >= 0) { o += 'g'; i += 2; continue; }
      if (st('ge') && n2 && 'aoô'.indexOf(n2) >= 0) { o += 'Z'; i += 2; continue; }
      if (st('th')) { o += 't'; i += 2; continue; }
      if (c === 'i' && st('ill') && pv && !lv(pv)) { o += 'ij'; i += 3; continue; }
      if (st('ill') && lv(pv)) { o += 'j'; i += 3; continue; }
      if (st('cc') && n2 && 'eiéèê'.indexOf(n2) >= 0) { o += 'ks'; i += 2; continue; }
      if (c === 'c') { o += (nx && 'eiéèêëîy'.indexOf(nx) >= 0) ? 's' : 'k'; i += (nx === 'c' || nx === 'k' ? 2 : 1); continue; }
      if (c === 'ç') { o += 's'; i++; continue; }
      if (c === 'g') { o += (nx && 'eiéèêy'.indexOf(nx) >= 0) ? 'Z' : 'g'; i += (nx === 'g' ? 2 : 1); continue; }
      if (c === 'j') { o += 'Z'; i++; continue; }
      if (c === 'x') { o += (i === 1 && pv === 'e' && lv(nx)) ? 'gz' : 'ks'; i++; continue; }
      if (c === 'h') { i++; continue; }
      if (c === 'q') { o += 'k'; i++; continue; }
      if (c === 's') { if (nx === 's') { o += 's'; i += 2; } else { o += (lv(pv) && lv(nx)) ? 'z' : 's'; i++; } continue; }
      if (c === 'y' || c === 'ÿ') { o += (lv(nx) ? 'j' : 'i'); i++; continue; }
      if (c === 'i' || c === 'î' || c === 'ï') { o += (lv(nx) && c === 'i' && nx !== 'e' ? (pv && 'lr'.indexOf(pv) >= 0 && s[i - 2] && !lv(s[i - 2]) ? 'ij' : 'j') : 'i'); i++; continue; }
      if (c === 'u' && nx === 'i') { o += '8'; i++; continue; }
      if (c === 'u' || c === 'û' || c === 'ù' || c === 'ü') { o += 'y'; i++; continue; }
      if (c === 'é') { o += 'e'; i++; continue; }
      if (c === 'è' || c === 'ê' || c === 'ë') { o += 'E'; i++; continue; }
      if (c === 'a' || c === 'à' || c === 'â' || c === 'ä') { o += 'a'; i++; continue; }
      if (c === 'ô' || c === 'ö') { o += 'o'; i++; continue; }
      if (c === 'o') { o += (nx === undefined || nx === '|' || nx === 's' && lv(n2)) ? 'o' : 'O'; i++; continue; }
      if (c === 'e') {
        if (nx === undefined) { o += '°'; i++; continue; }
        if (nx === '|') { i++; continue; }
        if (!lv(nx) && (n2 === undefined || n2 === '|' || (!lv(n2) && !('lr'.indexOf(n2) >= 0 && nx !== 'l' && nx !== 'r' && nx !== n2 && lv(s[i + 3]))) || nx === 'x')) { o += 'E'; i++; continue; }
        o += '°'; i++; continue;
      }
      if ('bdfklmnprtvzw'.indexOf(c) >= 0) { o += (c === 'r' ? 'R' : c); i += (nx === c ? 2 : 1); continue; }
      i++;
    }
    return o.replace(/1/g, '5');
  }
  function syllabify(p) {
    var nuc = [], i;
    for (i = 0; i < p.length; i++) if (isV(p[i])) nuc.push(i);
    if (nuc.length < 2) return [p];
    var cuts = [];
    for (var k = 0; k < nuc.length - 1; k++) {
      var a = nuc[k] + 1, b = nuc[k + 1], len = b - a, cut;
      if (len <= 1) cut = a;
      else {
        var c1 = p[b - 2], c2 = p[b - 1];
        var liquid = (c2 === 'l' || c2 === 'R') && 'pbtdkgfv'.indexOf(c1) >= 0;
        var glide = 'jw8'.indexOf(c2) >= 0;
        if (glide && len >= 3 && (p[b - 2] === 'l' || p[b - 2] === 'R') && 'pbtdkgfv'.indexOf(p[b - 3]) >= 0) cut = b - 3;
        else cut = (liquid || glide) ? b - 2 : b - 1;
      }
      cuts.push(cut);
    }
    var out = [], prev = 0;
    for (i = 0; i < cuts.length; i++) { out.push(p.slice(prev, cuts[i])); prev = cuts[i]; }
    out.push(p.slice(prev));
    return out;
  }

  /* ---------- analyse d'un mot / d'une phrase ---------- */
  var ELI = { l: 'l', d: 'd', j: 'Z', n: 'n', m: 'm', t: 't', s: 's', c: 's', qu: 'k', jusqu: 'Zysk', lorsqu: 'lORsk', puisqu: 'p8isk', quoiqu: 'kwak', presqu: 'pREsk', quelqu: 'kElk' };
  function tokenize(text) {
    return text.toLowerCase().replace(/[’`´]/g, "'").split(/[^a-zàâäçéèêëîïôöùûüÿœæ'\-]+/)
      .map(function (t) { return t.replace(/^['\-]+|['\-]+$/g, ''); }).filter(Boolean);
  }
  function mkTok(raw, over) {
    var c = D.byO.get(raw);
    if (c) {
      var alts = [], seen = {};
      for (var k = 0; k < c.length; k++) if (!seen[D.P[c[k]]]) { seen[D.P[c[k]]] = 1; alts.push(c[k]); }
      var idx = (over !== undefined && alts.indexOf(over) >= 0) ? over : alts[0];
      return { raw: raw, idx: idx, alts: alts, phon: D.P[idx], syl: D.S[idx].split('-'), guessed: false };
    }
    return null;
  }
  function tokOne(raw, over, out) {
    var t = mkTok(raw, over);
    if (t) { out.push(t); return; }
    var ap = raw.indexOf("'");
    if (ap > 0) {
      var head = raw.slice(0, ap), rest = raw.slice(ap + 1);
      if (ELI[head]) out.push({ raw: head + "'", idx: -1, alts: [], phon: ELI[head], syl: [], eli: true, guessed: false });
      else tokOne(head, undefined, out);
      if (rest) tokOne(rest, over, out);
      return;
    }
    if (raw.indexOf('-') > 0) {
      raw.split('-').filter(Boolean).forEach(function (part) {
        if (part === 't') out.push({ raw: 't-', idx: -1, alts: [], phon: 't', syl: [], eli: true, guessed: false });
        else tokOne(part, undefined, out);
      });
      return;
    }
    var p = g2p(raw);
    if (!p) return;
    out.push({ raw: raw, idx: -1, alts: [], phon: p, syl: /[aiyuoOeE°295@§]/.test(p) ? syllabify(p) : [], eli: !/[aiyuoOeE°295@§]/.test(p), guessed: true });
  }
  function analyze(text, over) {
    var raws = tokenize(text || ''), toks = [];
    raws.forEach(function (r, k) { tokOne(r, k === raws.length - 1 ? over : undefined, toks); });
    var syl = [], pend = '', phon = '', last = null, first = null;
    toks.forEach(function (t) {
      phon += t.phon;
      if (!t.syl.length) { pend += t.phon; return; }
      t.syl.forEach(function (s, j) { syl.push(j === 0 ? pend + s : s); });
      pend = '';
      last = t; if (!first) first = t;
    });
    if (pend && syl.length) syl[syl.length - 1] += pend;
    return { text: text, toks: toks, phon: phon, syl: syl, last: last, first: first, words: toks.filter(function (t) { return t.syl.length; }) };
  }

  /* ---------- écriture lisible des sons ---------- */
  var SP = { a: 'a', i: 'i', y: 'u', u: 'ou', o: 'o', O: 'o', e: 'é', E: 'è', '°': 'e', '2': 'eu', '9': 'eu', '5': 'in', '@': 'an', '§': 'on', j: 'y', '8': 'u', w: 'w', S: 'ch', Z: 'j', N: 'gn', G: 'ng', k: 'k', g: 'g', s: 's', z: 'z', R: 'r', x: 'kh' };
  function spellSyl(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], nx = s[i + 1];
      if (c === 'w' && nx === 'a') { o += 'oi'; i++; continue; }
      if (c === 'w' && nx === '5') { o += 'oin'; i++; continue; }
      if (c === 'g' && nx && 'eE°i295y'.indexOf(nx) >= 0) { o += 'gu'; continue; }
      if (c === 's' && i > 0 && isV(s[i - 1]) && isV(nx)) { o += 'ss'; continue; }
      o += SP[c] !== undefined ? SP[c] : c;
    }
    var l = s[s.length - 1], b = s[s.length - 2];
    if ((l === 'n' || l === 'm') && isV(b) && '5@§'.indexOf(b) < 0) o += 'e';
    else if (l && !isV(l) && 'jw'.indexOf(l) < 0 && b && (('lR'.indexOf(l) >= 0 && !isV(b)) || '5@§'.indexOf(b) >= 0)) o += 'e';
    return o;
  }
  function spell(sylOrPhon) {
    var a = Array.isArray(sylOrPhon) ? sylOrPhon : String(sylOrPhon).split('-');
    return a.map(spellSyl).join('·');
  }
  function spellI(i) { return spell(D.S[i]); }

  /* ---------- outils ---------- */
  function lastVowel(p) { for (var i = p.length - 1; i >= 0; i--) if (isV(p[i])) return i; return -1; }
  function nucleus(p) { var k = lastVowel(p); return k < 0 ? p : p.slice(k); }
  function csuf(a, b) { var n = 0, la = a.length, lb = b.length; while (n < la && n < lb && a[la - 1 - n] === b[lb - 1 - n]) n++; return n; }
  function cpre(a, b) { var n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; }

  function rimes(q, opt) {
    opt = opt || {};
    var qp = nz(q.phon), nuc = nucleus(qp), P = PH(), groups = {}, skip = q.last ? q.last.raw : '';
    var only = opt.only;
    for (var i = 0; i < D.n; i++) {
      var p = P[i];
      if (p.length < nuc.length || p.charCodeAt(p.length - 1) !== nuc.charCodeAt(nuc.length - 1)) continue;
      if (!p.endsWith(nuc) || !pass(i) || D.W[i] === skip) continue;
      if (only && !only(i)) continue;
      var n = csuf(p, qp);
      (groups[n] || (groups[n] = [])).push(i);
    }
    return Object.keys(groups).map(Number).sort(function (a, b) { return b - a; }).map(function (n) {
      return { n: n, tail: qp.slice(qp.length - n), items: groups[n] };
    });
  }

  function multi(q, N) {
    var syl = q.syl.map(nz);
    N = Math.max(1, Math.min(N, syl.length));
    var win = syl.slice(syl.length - N), target = win.join('').replace(RE_NONV, '');
    var wp = win.join(''), fv = wp.search(RE_V); RE_V.lastIndex = 0;
    var full = wp.slice(fv < 0 ? 0 : fv), nuc = nucleus(wp);
    var P = PH(), V = VS(), SYL = SY(), skip = q.last ? q.last.raw : '';
    var A = [], B = [], C = [];
    for (var i = 0; i < D.n; i++) {
      if (!V[i].endsWith(target) || !pass(i) || D.W[i] === skip) continue;
      var p = P[i];
      if (p.endsWith(full)) { A.push(i); continue; }
      var cs = SYL[i].split('-'), sc = 0;
      for (var k = 1; k <= N && k <= cs.length; k++) {
        var a = cs[cs.length - k], b = win[win.length - k];
        if (a === b) sc += 3;
        else {
          var va = a.search(RE_V); RE_V.lastIndex = 0; var vb = b.search(RE_V); RE_V.lastIndex = 0;
          if (a.slice(va) === b.slice(vb)) sc += 2; else if (va > 0 && a.slice(0, va) === b.slice(0, vb)) sc += 1;
        }
      }
      if (p.endsWith(nuc) && nuc.length > 0) B.push([i, sc + 2]); else C.push([i, sc]);
    }
    var byScore = function (x, y) { return y[1] - x[1] || x[0] - y[0]; };
    B.sort(byScore); C.sort(byScore);
    var combos = [];
    if (N >= 2) {
      for (var k2 = 1; k2 < N; k2++) {
        var tl = target.slice(0, vlen(target, k2)), tr = target.slice(vlen(target, k2)), L = [], R = [];
        for (var j = 0; j < D.n && (L.length < 60 || R.length < 60); j++) {
          if (D.FQ[j] < 45 || D.W[j].length < 2) continue;
          if (L.length < 60 && D.NS[j] === k2 && V[j] === tl) L.push(j);
          if (R.length < 60 && D.NS[j] === N - k2 && V[j] === tr) R.push(j);
        }
        if (L.length && R.length) combos.push({ left: L, right: R, lv: win.slice(0, k2), rv: win.slice(k2) });
      }
    }
    return { N: N, win: win, target: target, full: A, close: B.map(function (x) { return x[0]; }), vowels: C.map(function (x) { return x[0]; }), combos: combos };
  }
  function vlen(target, k) { return k; } // chaque voyelle = 1 caractère

  function dist1(a, b) {
    var la = a.length, lb = b.length;
    if (la === lb) { var d = 0; for (var i = 0; i < la; i++) if (a[i] !== b[i] && ++d > 1) return null; return d === 1 ? 'sub' : null; }
    if (Math.abs(la - lb) !== 1) return null;
    var s = la < lb ? a : b, l = la < lb ? b : a, x = 0, y = 0, skipd = false;
    while (x < s.length && y < l.length) { if (s[x] === l[y]) { x++; y++; } else { if (skipd) return null; skipd = true; y++; } }
    return la < lb ? 'ins' : 'del';
  }
  function voisins(q) {
    var t = q.last; if (!t) return null;
    var qp = nz(t.phon), P = PH(), H = [], Sb = [], In = [], De = [];
    for (var i = 0; i < D.n; i++) {
      var p = P[i];
      if (Math.abs(p.length - qp.length) > 1) continue;
      if (p === qp) { if (D.W[i] !== t.raw && passNoSyl(i)) H.push(i); continue; }
      var d = dist1(qp, p);
      if (!d || !pass(i)) continue;
      (d === 'sub' ? Sb : d === 'ins' ? In : De).push(i);
    }
    return { homo: H, sub: Sb, ins: In, del: De };
  }
  function passNoSyl(i) { var s = F.syl; F.syl = 0; var r = pass(i); F.syl = s; return r; }

  function squelette(q) {
    var t = q.last; if (!t) return null;
    var qp = nz(t.phon), sk = qp.replace(RE_V, ''), P = PH(), out = [];
    if (!sk) return { sk: sk, items: [] };
    for (var i = 0; i < D.n; i++) {
      var p = P[i];
      if (p.length < sk.length || p === qp) continue;
      if (p.replace(RE_V, '') === sk && pass(i)) out.push(i);
    }
    return { sk: sk, items: out };
  }

  function chaines(q) {
    var t = q.last; if (!t) return null;
    var qp = nz(t.phon), P = PH(), after = [], before = [], usedA = {}, usedB = {};
    for (var k = Math.min(qp.length, 6); k >= 2; k--) {
      var suf = qp.slice(qp.length - k), pre = qp.slice(0, k), ga = [], gb = [];
      var okS = /[aiyuoOeE°295@§]/.test(suf), okP = /[aiyuoOeE°295@§]/.test(pre);
      for (var i = 0; i < D.n; i++) {
        var p = P[i];
        if (p.length <= k || !pass(i)) continue;
        if (okS && !usedA[i] && p.startsWith(suf)) { ga.push(i); usedA[i] = 1; }
        if (okP && !usedB[i] && p.endsWith(pre)) { gb.push(i); usedB[i] = 1; }
      }
      if (ga.length) after.push({ k: k, part: suf, items: ga });
      if (gb.length) before.push({ k: k, part: pre, items: gb });
    }
    return { after: after, before: before };
  }

  function phonMap(minFq) {
    var key = (D.loose ? 'L' : 'S') + minFq;
    if (D._pm[key]) return D._pm[key];
    var m = new Map(), P = PH();
    for (var i = 0; i < D.n; i++) {
      if (D.FQ[i] < minFq) break;
      var p = P[i];
      if (!m.has(p)) m.set(p, i);
    }
    return (D._pm[key] = m);
  }
  function decoupe(q, maxPieces) {
    var s = nz(q.phon), n = s.length, m = phonMap(VOC_MIN[F.voc]), res = [], budget = 60000;
    if (n < 2 || n > 40) return [];
    var own = q.words.map(function (t) { return nz(t.phon); }).join(' ');
    var edges = [];
    for (var a = 0; a < n; a++) {
      edges[a] = [];
      for (var b = a + 1; b <= n && b - a <= 14; b++) {
        var piece = s.slice(a, b);
        if (!/[aiyuoOeE°295@§]/.test(piece)) continue;
        var idx = m.get(piece);
        if (idx !== undefined && (D.W[idx].length > 1 || 'aàyô'.indexOf(D.W[idx]) >= 0)) edges[a].push([b, idx]);
      }
    }
    var reach = new Uint8Array(n + 1); reach[n] = 1;
    for (var x = n - 1; x >= 0; x--) for (var e = 0; e < edges[x].length; e++) if (reach[edges[x][e][0]]) { reach[x] = 1; break; }
    function dfs(pos, acc, left) {
      if (budget-- <= 0) return;
      if (pos === n) { res.push(acc.slice()); return; }
      if (!left || !reach[pos]) return;
      for (var e = 0; e < edges[pos].length; e++) {
        var ed = edges[pos][e];
        if (!reach[ed[0]]) continue;
        acc.push(ed[1]); dfs(ed[0], acc, left - 1); acc.pop();
      }
    }
    dfs(0, [], maxPieces || 5);
    var P = PH();
    res = res.filter(function (r) { return r.map(function (i) { return P[i]; }).join(' ') !== own && r.length > (q.words.length === 1 ? 1 : 0); });
    res.forEach(function (r) { var mn = 1e9, sum = 0; r.forEach(function (i) { var f = D.FQ[i]; if (f < mn) mn = f; sum += f; }); r.score = mn * 3 + sum / r.length - r.length * 25; });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, 400);
  }

  function contrepets(q) {
    var w = q.words, out = [], m = phonMap(VOC_MIN[Math.max(1, F.voc)]), seen = {};
    function swapStr(s, i, c) { return s.slice(0, i) + c + s.slice(i + 1); }
    if (w.length === 1) {
      var p = nz(w[0].phon);
      for (var i = 0; i < p.length; i++) for (var j = i + 1; j < p.length; j++) {
        if (p[i] === p[j] || isV(p[i]) !== isV(p[j])) continue;
        var np = swapStr(swapStr(p, i, p[j]), j, p[i]), k = m.get(np);
        if (k !== undefined && !seen[np]) { seen[np] = 1; out.push({ parts: [{ i: k }] }); }
      }
      return out;
    }
    var tool = function (t) { return t.idx >= 0 && D.FQ[t.idx] >= 290; };
    for (var a = 0; a < w.length; a++) for (var b = a + 1; b < w.length; b++) {
      if (tool(w[a]) || tool(w[b])) continue;
      var pa = nz(w[a].phon), pb = nz(w[b].phon);
      for (var x = 0; x < pa.length; x++) for (var y = 0; y < pb.length; y++) {
        if (pa[x] === pb[y] || isV(pa[x]) !== isV(pb[y])) continue;
        var na = swapStr(pa, x, pb[y]), nb = swapStr(pb, y, pa[x]);
        var ka = m.get(na), kb = m.get(nb);
        if (ka === undefined || kb === undefined) continue;
        var key = a + ':' + na + '|' + b + ':' + nb;
        if (seen[key]) continue; seen[key] = 1;
        out.push({ parts: w.map(function (t, z) { return z === a ? { i: ka, hl: 1 } : z === b ? { i: kb, hl: 1 } : (t.idx >= 0 ? { i: t.idx } : { t: t.raw }); }), score: Math.min(D.FQ[ka], D.FQ[kb]) });
      }
    }
    out.sort(function (p1, p2) { return p2.score - p1.score; });
    return out.slice(0, 200);
  }

  function verlan(q) {
    var t = q.last; if (!t) return [];
    var s = t.syl.slice(), out = [], seen = {};
    function add(label, arr) { var k = arr.join(''); if (!k || seen[k] || k === t.phon) return; seen[k] = 1; out.push({ label: label, syl: arr, phon: k }); }
    if (s.length === 1) {
      var p = s[0], v = p.search(RE_V); RE_V.lastIndex = 0;
      var on = p.slice(0, v), nu = p[v], co = p.slice(v + 1);
      if (co) { add('Verlan (meuf, keum, teuf…)', [co + (on ? '9' + on : nu)]); add('Verlan complet', [co + '2', on + nu]); }
      else if (on) add('Verlan (ouf, ap…)', [nu + on]);
    } else if (s.length === 2) add('Verlan', [s[1], s[0]]);
    else {
      add('Dernière syllabe devant', [s[s.length - 1]].concat(s.slice(0, -1)));
      add('Première syllabe au bout', s.slice(1).concat([s[0]]));
      add('Syllabes à l’envers', s.slice().reverse());
    }
    add('Miroir (sons à l’envers)', syllabify(t.phon.split('').reverse().join('')));
    out.forEach(function (o) { o.match = (byPhon().get(o.phon) || []).slice(0, 6); });
    return out;
  }

  function byPhon() {
    if (!D._bp) { D._bp = new Map(); for (var i = 0; i < D.n; i++) { var a = D._bp.get(D.P[i]); if (a) a.push(i); else D._bp.set(D.P[i], [i]); } }
    return D._bp;
  }
  function parseSounds(codes) { return codes.map(nz); }
  function contains(hay, parts, mode) {
    var i, k, pos;
    if (mode === 'exact') return hay.indexOf(parts.join('')) >= 0;
    if (mode === 'start') return hay.startsWith(parts.join(''));
    if (mode === 'end') return hay.endsWith(parts.join(''));
    if (mode === 'order') { pos = 0; for (i = 0; i < parts.length; i++) { k = hay.indexOf(parts[i], pos); if (k < 0) return false; pos = k + parts[i].length; } return true; }
    var need = {};
    for (i = 0; i < parts.length; i++) need[parts[i]] = (need[parts[i]] || 0) + 1;
    for (var c in need) { var cnt = 0; pos = 0; while ((k = hay.indexOf(c, pos)) >= 0) { cnt++; pos = k + c.length; } if (cnt < need[c]) return false; }
    return true;
  }
  function sons(codes, mode) {
    var parts = parseSounds(codes), P = PH(), out = [];
    if (!parts.length) return out;
    for (var i = 0; i < D.n; i++) if (contains(P[i], parts, mode) && pass(i)) out.push(i);
    return out;
  }
  function density(i, codes) {
    var p = PH()[i], n = 0, set = parseSounds(codes).join('');
    for (var k = 0; k < p.length; k++) if (set.indexOf(p[k]) >= 0) n++;
    return n / p.length;
  }
  function lettres(letters, mode, o) {
    o = o || {};
    var parts = deacc(letters).replace(/[^a-z]/g, '').split(''), W = WN(), out = [];
    var no = deacc(o.without || '').replace(/[^a-z]/g, ''), mn = o.min || 0, mx = o.max || 99;
    if (!parts.length && !no) return out;
    for (var i = 0; i < D.n; i++) {
      var w = W[i];
      if (w.length < mn || w.length > mx) continue;
      if (no) { var bad = false; for (var k = 0; k < no.length; k++) if (w.indexOf(no[k]) >= 0) { bad = true; break; } if (bad) continue; }
      if (parts.length && !contains(w, parts, mode)) continue;
      if (pass(i)) out.push(i);
    }
    return out;
  }
  function motif(pat) {
    var p = deacc(pat).replace(/[^a-z?*@#'\- ]/g, '');
    if (!p.replace(/[*]/g, '')) return [];
    var re = new RegExp('^' + p.replace(/[-']/g, '\\$&').replace(/\?/g, '[a-z]').replace(/\*/g, ".*").replace(/@/g, '[aeiouy]').replace(/#/g, '[bcdfghjklmnpqrstvwxz]') + '$');
    var W = WN(), out = [];
    for (var i = 0; i < D.n; i++) if (re.test(W[i]) && pass(i)) out.push(i);
    return out;
  }
  function anagrammes(letters, minLen) {
    var s = deacc(letters).replace(/[^a-z?]/g, ''), jok = 0, cnt = new Int8Array(26), W = WN(), exact = [], sub = [], k;
    for (k = 0; k < s.length; k++) { if (s[k] === '?') jok++; else cnt[s.charCodeAt(k) - 97]++; }
    var total = s.length, tmp = new Int8Array(26);
    if (total < 2) return { exact: exact, sub: sub };
    for (var i = 0; i < D.n; i++) {
      var w = W[i], L = w.length;
      if (L > total || L < (minLen || 2)) continue;
      tmp.set(cnt); var j = jok, ok = true;
      for (k = 0; k < L; k++) {
        var c = w.charCodeAt(k) - 97;
        if (c < 0 || c > 25) { ok = false; break; }
        if (--tmp[c] < 0) { if (--j < 0) { ok = false; break; } }
      }
      if (!ok || !pass(i)) continue;
      if (L === total) { if (w !== s) exact.push(i); } else sub.push(i);
    }
    return { exact: exact, sub: sub };
  }
  function famille(q) {
    var t = q.last; if (!t) return [];
    var c = D.byO.get(t.raw) || [], ids = {}, any = false;
    c.forEach(function (i) { D.LM[i].split(',').forEach(function (x) { if (x) { ids[x] = 1; any = true; } }); });
    if (!any) return [];
    var groups = {};
    for (var i = 0; i < D.n; i++) {
      var l = D.LM[i]; if (!l) continue;
      var parts = l.split(',');
      for (var k = 0; k < parts.length; k++) if (ids[parts[k]]) (groups[parts[k]] || (groups[parts[k]] = [])).push(i);
    }
    return Object.keys(groups).map(function (id) { return { lemma: D.lemmas[parseInt(id, 36)], items: groups[id] }; })
      .sort(function (a, b) { return b.items.length - a.items.length; });
  }
  function lemmasOf(word) {
    var c = D.byO.get(word) || [], out = [];
    c.forEach(function (i) { D.LM[i].split(',').forEach(function (x) { if (x) { var l = D.lemmas[parseInt(x, 36)]; if (out.indexOf(l) < 0) out.push(l); } }); });
    return out;
  }
  function hasard(n) {
    var pool = [], i;
    for (i = 0; i < D.n; i++) if (pass(i) && D.W[i].length > 2 && D.NS[i] > 0) pool.push(i);
    var out = [];
    for (var k = 0; k < n && pool.length; k++) { var r = Math.floor(Math.random() * pool.length); out.push(pool[r]); pool[r] = pool[pool.length - 1]; pool.pop(); }
    return out;
  }

  /* ---------- synonymes ---------- */
  var T = { ready: false, vocab: [], pos: [], map: new Map(), rev: null };
  function loadThes(txt) {
    var lines = txt.split('\n');
    T.vocab = lines[0].split('|'); T.pos = lines[1].split('|'); T.map = new Map(); T.rev = null;
    for (var i = 2; i < lines.length; i++) {
      var ln = lines[i]; if (!ln) continue;
      var eq = ln.indexOf('=');
      T.map.set(T.vocab[parseInt(ln.slice(0, eq), 36)], ln.slice(eq + 1));
    }
    T.ready = true;
  }
  function thesEntry(word) {
    var raw = T.map.get(word); if (!raw) return null;
    return raw.split(';').map(function (seg) {
      var c = seg.indexOf(':');
      return { pos: T.pos[parseInt(seg.slice(0, c), 36)], syns: seg.slice(c + 1).split(',').map(function (x) { return T.vocab[parseInt(x, 36)]; }) };
    });
  }
  function thesRev(word) {
    if (!T.rev) {
      T.rev = new Map();
      T.map.forEach(function (raw, head) {
        raw.split(';').forEach(function (seg) {
          seg.slice(seg.indexOf(':') + 1).split(',').forEach(function (x) {
            var w = T.vocab[parseInt(x, 36)], a = T.rev.get(w);
            if (a) { if (a[a.length - 1] !== head) a.push(head); } else T.rev.set(w, [head]);
          });
        });
      });
    }
    return T.rev.get(word) || [];
  }
  function synonymes(word) {
    var heads = [word].concat(lemmasOf(word).filter(function (l) { return l !== word; })), out = [], seen = {};
    seen[word] = 1;
    heads.forEach(function (h) {
      var e = thesEntry(h); if (!e) return;
      e.forEach(function (g) {
        var syns = g.syns.filter(function (s) { if (seen[s]) return false; seen[s] = 1; return true; });
        if (syns.length) out.push({ head: h, pos: g.pos, syns: syns });
      });
    });
    var rev = [];
    heads.forEach(function (h) { thesRev(h).forEach(function (s) { if (!seen[s]) { seen[s] = 1; rev.push(s); } }); });
    var lvl2 = [], c2 = {};
    out.forEach(function (g) {
      g.syns.slice(0, 40).forEach(function (s) {
        var e = thesEntry(s); if (!e) return;
        e.forEach(function (gg) { gg.syns.forEach(function (x) { if (!seen[x]) c2[x] = (c2[x] || 0) + 1; }); });
      });
    });
    lvl2 = Object.keys(c2).sort(function (a, b) { return c2[b] - c2[a]; }).slice(0, 300);
    return { groups: out, rev: rev, lvl2: lvl2, found: out.length > 0 || rev.length > 0 };
  }
  function phonOfText(t) { var q = analyze(t); return q.phon; }

  /* ---------- atelier ---------- */
  function analyseLigne(line) {
    var q = analyze(line), w = q.words, extra = 0;
    for (var k = 0; k < q.toks.length - 1; k++) {
      var t = q.toks[k], nx = q.toks[k + 1];
      if (!t.syl.length || !nx) continue;
      var endsE = /(e|es)$/.test(t.raw) || (/ent$/.test(t.raw) && t.idx >= 0 && (D.FL[t.idx] & 2) && !/@$/.test(t.phon));
      if (endsE && t.raw.length > 2 && !isV(t.phon[t.phon.length - 1]) && nx.phon && !isV(nx.phon[0]) && 'jw8'.indexOf(nx.phon[0]) < 0) extra++;
    }
    return { q: q, n: q.syl.length, extra: extra, nuc: q.syl.length ? loosen(nucleus(q.phon)) : '' };
  }

  var API = {
    D: D, F: F, isV: isV, load: load, loadThes: loadThes, T: T, setLoose: setLoose, nz: nz, pass: pass, analyze: analyze, g2p: g2p, syllabify: syllabify,
    spell: spell, spellI: spellI, byPhon: byPhon, nucleus: nucleus, rimes: rimes, multi: multi, voisins: voisins, squelette: squelette, chaines: chaines,
    decoupe: decoupe, contrepets: contrepets, verlan: verlan, sons: sons, density: density, lettres: lettres, motif: motif, anagrammes: anagrammes,
    famille: famille, lemmasOf: lemmasOf, hasard: hasard, synonymes: synonymes, phonOfText: phonOfText, analyseLigne: analyseLigne, deacc: deacc, loosen: loosen, PH: PH
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Fakito = API;
})(typeof window !== 'undefined' ? window : globalThis);
