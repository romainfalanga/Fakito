/* Fakito — interface. Mobile d'abord : la saisie reste collée en haut, les résultats arrivent juste dessous. */
(function () {
  'use strict';
  var L = window.Fakito, D = L.D;
  var $ = function (s) { return document.querySelector(s); };
  function h(tag, attrs) {
    var e = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function pl(n, s, p) { return nf(n) + ' ' + (n > 1 ? (p || s + 's') : s); }
  var ICON = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    'Écrire': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4.5L16.5 4l3.5 3.5L8.5 19z"/><path d="M14 6.5l3.5 3.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    saved: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
    catalog: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'
  };

  var EX_SEED = 'une nuit sans sommeil';
  var EXEMPLE = "Une nuit sans sommeil sous un ciel de béton\nJe compte les étoiles au fond de mon carton\nLe silence me réveille et me parle tout bas\nJ'écris ce que je veille et que je ne dis pas";
  var KEY = 'fakito-v1';
  var ST = {
    seed: '', tool: 'rimes', searchTool: 'rimes', synWord: '', f: { syl: 0, cat: 0, voc: 1, base: false }, loose: false, showPh: false, sort: 'freq',
    multiN: 0, sens: '', lettres: { q: 'rv', mode: 'any', without: '', min: '', max: '' }, motif: 'r?v*', anag: 'chanson',
    sons: { sel: ['R', 'v'], mode: 'any' }, synRime: '', hasardN: 12, palette: [], texte: EXEMPLE, over: null, recents: []
  };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') for (var k0 in sv) if (k0 in ST) ST[k0] = sv[k0]; } catch (e) { }
  var saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { } }, 300); }

  var Q = null, draw = null, sndOn = null, rT = 0;
  var qIn = $('#q'), clr = $('#clr'), bar = $('#bar'), scrim = $('#scrim'), menu = $('#menu'), settings = $('#settings'), pick = $('#pick'), catalog = $('#catalog');
  function isMob() { return window.matchMedia('(max-width:759px)').matches; }
  function isWide() { return window.matchMedia('(min-width:1120px)').matches; }
  function seedQ() { Q = L.analyze(ST.seed, ST.over === null ? undefined : ST.over); return Q; }
  function applyF() { L.F.syl = ST.f.syl; L.F.cat = ST.f.cat; L.F.voc = ST.f.voc; L.F.base = ST.f.base; L.setLoose(ST.loose); }
  function later() { clearTimeout(rT); rT = setTimeout(function () { refresh(); }, 110); }
  function remember() {
    var s = ST.seed.trim(); if (!s || s === EX_SEED) return;
    ST.recents = [s].concat(ST.recents.filter(function (x) { return x !== s; })).slice(0, 10); save();
  }
  function setSeed(value, pronunciation) {
    ST.seed = value;
    ST.over = pronunciation === undefined ? null : pronunciation;
    ST.synWord = '';
  }
  function searchFor(value, tool, pronunciation) {
    remember();
    setSeed(value, pronunciation);
    setTool(tool);
    remember();
    window.scrollTo(0, 0);
  }
  function addToDraft(text, separator) {
    if (ST.texte === EXEMPLE || !ST.texte.trim()) ST.texte = text;
    else ST.texte += separator + text;
    save();
  }

  /* ---------- petits composants ---------- */
  function seg(opts, get, set) {
    var box = h('div', { class: 'seg', role: 'group' });
    opts.forEach(function (o) {
      box.appendChild(h('button', { type: 'button', text: o[1], title: o[2] || null, 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); Array.prototype.forEach.call(box.children, function (b, i) { b.setAttribute('aria-pressed', String(opts[i][0] === get())); }); } }));
    });
    return box;
  }
  function fld(label, node) { return h('label', { class: 'fld' }, h('span', { text: label }), node); }
  function fldDiv(label, node) { return h('div', { class: 'fld' }, h('span', { text: label }), node); }
  function tog(label, sub, get, set) {
    var b = h('button', { type: 'button', class: 'tog', 'aria-pressed': String(!!get()), onclick: function () { set(!get()); b.setAttribute('aria-pressed', String(!!get())); } },
      h('span', null, label, sub ? h('small', { text: sub }) : null), h('i'));
    return b;
  }
  function txt(id, val, ph, oninput) {
    return h('input', { id: id, type: 'text', value: val, placeholder: ph || null, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', oninput: function (e) { oninput(e.target.value); }, onkeydown: function (e) { if (e.key === 'Enter') e.target.blur(); } });
  }
  function qrow(el, label, opts, get, set) {
    if (label) el.appendChild(h('span', { class: 'qlab', text: label }));
    opts.forEach(function (o) {
      el.appendChild(h('button', { type: 'button', class: 'qchip', text: o[1], 'aria-pressed': String(get() === o[0]), onclick: function () { set(o[0]); } }));
    });
  }
  function qmore(el, label, value, onclear, focusId) {
    if (value) el.appendChild(h('button', { type: 'button', class: 'qchip on', text: label + ' : ' + value + ' ×', onclick: onclear }));
    else el.appendChild(h('button', { type: 'button', class: 'qchip more', text: '+ ' + label, onclick: function () { openSettings(focusId); } }));
  }
  var SYL = [[0, 'Toutes'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']];
  function qsyl(el) { qrow(el, 'Syllabes', SYL, function () { return ST.f.syl; }, function (v) { ST.f.syl = v; refresh(); }); }
  var MODES = function (fem) { return [['any', 'N’importe où'], ['order', 'Dans cet ordre'], ['exact', fem ? 'Collées' : 'Collés'], ['start', 'Au début'], ['end', 'À la fin']]; };

  /* ---------- mots cliquables ---------- */
  function kept(wd) { return ST.palette.indexOf(wd) >= 0; }
  function chip(it) {
    if (typeof it === 'number') {
      var w = D.W[it], b = h('button', { type: 'button', class: 'w' + (D.FQ[it] < 8 ? ' rare' : '') + (kept(w) ? ' kept' : ''), 'data-i': it }, w);
      if (ST.showPh) b.appendChild(h('small', { text: L.spellI(it) }));
      return b;
    }
    if (it.parts) {
      var p = h('span', { class: 'phr' });
      it.parts.forEach(function (x) { var c = chip(x.i !== undefined ? x.i : x); if (x.hl) c.classList.add('h1'); p.appendChild(c); });
      return p;
    }
    if (it.i !== undefined) return chip(it.i);
    var c2 = D.byO.get(it.t);
    if (c2 && !it.plain) { var cc = chip(c2[0]); if (it.sub) cc.appendChild(h('small', { text: it.sub })); return cc; }
    return h('button', { type: 'button', class: 'w' + (it.plain ? ' plain' : '') + (kept(it.t) ? ' kept' : ''), 'data-t': it.t }, it.t, it.sub ? h('small', { text: it.sub }) : null);
  }
  function sortItems(items) {
    if (ST.sort === 'freq' || !items.length || typeof items[0] !== 'number') return items;
    var a = items.slice();
    if (ST.sort === 'alpha') a.sort(function (x, y) { return D.W[x].localeCompare(D.W[y], 'fr'); });
    else if (ST.sort === 'court') a.sort(function (x, y) { return D.W[x].length - D.W[y].length || x - y; });
    else if (ST.sort === 'long') a.sort(function (x, y) { return D.W[y].length - D.W[x].length || x - y; });
    else if (ST.sort === 'rare') a.reverse();
    return a;
  }
  function group(g) {
    var sec = h('section', { class: 'grp' });
    if (g.title) {
      var hd = h('header', null, h('h2', null, g.title));
      if (g.tag) hd.appendChild(h('span', { class: 'tag', text: g.tag }));
      if (g.items) hd.appendChild(h('span', { class: 'c', text: nf(g.items.length) }));
      sec.appendChild(hd);
    }
    if (g.node) sec.appendChild(g.node);
    if (g.items) {
      var items = g.sorted === false ? g.items : sortItems(g.items), box = h('div', { class: 'words' }), shown = 0;
      var more = h('button', { type: 'button', class: 'more' });
      var add = function (n) {
        var fr = document.createDocumentFragment(), end = Math.min(items.length, shown + n);
        for (; shown < end; shown++) fr.appendChild(chip(items[shown]));
        box.appendChild(fr);
        if (shown >= items.length) more.hidden = true; else more.textContent = 'Afficher la suite (' + nf(items.length - shown) + ')';
      };
      var pageSize = isMob() ? 24 : (g.first || 140);
      more.addEventListener('click', function () {
        var next = box.children.length;
        add(isMob() ? 48 : 300);
        var item = box.children[next];
        var button = item && (item.matches('button') ? item : item.querySelector('button'));
        if (button) button.focus();
      });
      sec.appendChild(box); sec.appendChild(more); add(pageSize);
    }
    return sec;
  }
  function empty(msg, extra) { return h('div', { class: 'empty' }, msg, extra || null); }
  function mk(t) { return h('span', { class: 'mk', text: t }); }
  function total(groups) { var n = 0; groups.forEach(function (g) { if (g.items) n += g.items.length; }); return n; }
  function activeFilters() {
    var f = ST.f, n = 0;
    if (f.syl) n++; if (f.cat) n++; if (f.voc !== 1) n++; if (f.base) n++;
    return n;
  }
  function resetBtn() {
    return activeFilters() ? h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { type: 'button', class: 'btn', text: 'Enlever les filtres', onclick: function () { ST.f = { syl: 0, cat: 0, voc: 1, base: false }; paintSettings(); refresh(); } })) : null;
  }
  function none(title, msg) { return [{ title: title, node: empty(msg, resetBtn()) }]; }

  /* ---------- outils ---------- */
  var RICH = function (n) { return n >= 3 ? 'rime riche' : n === 2 ? 'rime suffisante' : 'rime pauvre'; };
  function starter() {
    var box = h('div', { class: 'starter' });
    var row = function (label, arr) {
      var b = h('div', { class: 'words' });
      arr.forEach(function (s) { b.appendChild(h('button', { type: 'button', class: 'w', 'data-seed': s, text: s })); });
      box.appendChild(h('div', { class: 'starter-row' }, h('h2', { text: label }), b));
    };
    if (ST.recents.length) row('Recherches récentes', ST.recents);
    row('Essaie avec…', ['une nuit sans sommeil', 'mélancolie', 'la ville dort']);
    return [{ node: box }];
  }
  function needWord(fn) { return function () { return (!Q || !Q.last) ? starter() : fn(); }; }
  function synSet(word) {
    if (!L.T.ready) return null;
    var q = L.analyze(word); if (!q.last) return null;
    var s = L.synonymes(q.last.raw), set = new Set();
    s.groups.forEach(function (g) { g.syns.forEach(function (x) { set.add(x); }); });
    s.rev.forEach(function (x) { set.add(x); }); s.lvl2.forEach(function (x) { set.add(x); });
    if (!set.size) return null;
    return function (i) {
      if (set.has(D.W[i])) return true;
      var lm = D.LM[i]; if (!lm) return false;
      var p = lm.split(',');
      for (var k = 0; k < p.length; k++) if (set.has(D.lemmas[parseInt(p[k], 36)])) return true;
      return false;
    };
  }
  var SND = [['a', 'a', 'chat'], ['e', 'é', 'été'], ['E', 'è', 'mer'], ['i', 'i', 'lit'], ['O', 'o', 'port'], ['o', 'ô', 'beau'], ['y', 'u', 'lune'], ['u', 'ou', 'loup'], ['2', 'eu', 'feu'], ['9', 'œ', 'peur'], ['°', 'e', 'le'], ['@', 'an', 'temps'], ['5', 'in', 'matin'], ['§', 'on', 'pont'],
  ['p', 'p'], ['b', 'b'], ['t', 't'], ['d', 'd'], ['k', 'k', 'car'], ['g', 'g', 'gare'], ['f', 'f'], ['v', 'v'], ['s', 's'], ['z', 'z'], ['S', 'ch'], ['Z', 'j'], ['m', 'm'], ['n', 'n'], ['N', 'gn'], ['l', 'l'], ['R', 'r'], ['j', 'y', 'paille'], ['w', 'w', 'oui'], ['8', 'u', 'nuit']];
  var SLAB = {}; SND.forEach(function (s) { SLAB[s[0]] = s[1]; });
  function multiOptions() {
    var max = Q ? Math.min(6, Q.syl.length) : 2, opts = [[0, 'Auto']];
    for (var n = 2; n <= max; n++) opts.push([n, String(n)]);
    return opts;
  }
  function defaultSynonymTarget() {
    var whole = ST.seed.trim().toLowerCase();
    return D.byO.has(whole) || L.T.map.has(whole) ? whole : Q.last.raw;
  }

  var TOOLS = [
    {
      id: 'rimes', g: 'Rimes', name: 'Rimes', input: 'seed', filt: 1,
      desc: 'Tous les mots qui finissent par le même son que ton dernier mot, des rimes les plus riches aux plus simples.',
      quick: function (el) { qsyl(el); qmore(el, 'Sens proche', ST.sens.trim(), function () { ST.sens = ''; paintSettings(); refresh(); }, 'c-sens'); },
      extra: function (el) { el.appendChild(fld('Sens proche de', txt('c-sens', ST.sens, 'ex. tristesse', function (v) { ST.sens = v; later(); }))); },
      run: needWord(function () {
        var only = ST.sens.trim() ? synSet(ST.sens.trim()) : null;
        if (ST.sens.trim() && !only) return none('Sens introuvable', L.T.ready ? 'Aucun synonyme connu pour « ' + ST.sens.trim() + ' ». Essaie un mot plus courant, au singulier ou à l’infinitif.' : 'Les synonymes sont encore en cours de chargement.');
        var r = L.rimes(Q, { only: only });
        if (!r.length) return none('Aucune rime', only ? 'Aucune rime dans ce champ de sens. Enlève « Sens proche » ou active les rimes souples.' : 'Rien avec ces réglages. Élargis le vocabulaire ou active les rimes souples.');
        return r.map(function (g) { return { title: ['Finit en ', mk(L.spell(g.tail))], tag: RICH(g.n), items: g.items }; });
      })
    },
    {
      id: 'multi', g: 'Rimes', name: 'Multisyllabes', full: 'Rimes multisyllabiques', input: 'seed', filt: 1,
      desc: 'Les mots qui reprennent la même suite de voyelles sur plusieurs syllabes, comme dans le rap : la consonance entière de ta fin de phrase.',
      quick: function (el) {
        qrow(el, 'Écho sur', multiOptions(), function () { return ST.multiN; }, function (v) { ST.multiN = v; refresh(); });
        el.appendChild(h('span', { class: 'qlab', text: 'syllabes' }));
      },
      extra: function (el) {
        el.appendChild(fldDiv('Longueur de l’écho en syllabes', seg(multiOptions(), function () { return ST.multiN; }, function (v) { ST.multiN = v; refresh(); })));
      },
      run: needWord(function () {
        var N = ST.multiN || Math.max(Math.min(2, Q.syl.length), Math.min(3, Q.last.syl.length));
        var m = L.multi(Q, N), out = [], vw = function (a) { return a.map(function (s) { return L.spell(s.replace(/[^aiyuoOeE°295@§]/g, '')); }).join(' · '); };
        var lab = vw(m.win);
        if (m.full.length) out.push({ title: ['Écho complet sur ', mk(L.spell(m.win))], tag: 'voyelles et consonnes', items: m.full });
        if (m.close.length) out.push({ title: ['Voyelles ', mk(lab), ' + même fin'], tag: 'rime multisyllabique', items: m.close, sorted: ST.sort !== 'freq' });
        if (m.vowels.length) out.push({ title: ['Voyelles ', mk(lab)], tag: 'assonance', items: m.vowels, sorted: ST.sort !== 'freq' });
        m.combos.forEach(function (c) {
          var col = function (title, arr) { var b = h('div', { class: 'words' }); arr.slice(0, isMob() ? 24 : 60).forEach(function (i) { b.appendChild(chip(i)); }); return h('div', null, h('p', { class: 'sub', text: title }), b); };
          out.push({ title: ['En deux mots : ', mk(vw(c.lv)), ' + ', mk(vw(c.rv))], tag: 'un de chaque colonne', node: h('div', { class: 'cols' }, col('d’abord', c.left), col('puis', c.right)) });
        });
        if (!out.length) return none('Aucun écho', 'Aucun mot ne reprend ces ' + m.N + ' voyelles. Réduis le nombre de syllabes ou active les rimes souples.');
        return out;
      })
    },
    {
      id: 'voisins', g: 'Rimes', name: 'Voisins', full: 'Homophones et voisins', input: 'seed', filt: 1,
      desc: 'Les mots qui se prononcent pareil, et ceux qui sont à un seul son d’écart : la matière première des jeux de mots.',
      quick: qsyl,
      run: needWord(function () {
        var v = L.voisins(Q), out = [];
        if (v.homo.length) out.push({ title: ['Se prononce comme ', mk(Q.last.raw)], tag: 'homophones', items: v.homo });
        if (v.sub.length) out.push({ title: 'Un son change', tag: 'paronymes', items: v.sub });
        if (v.ins.length) out.push({ title: 'Un son en plus', items: v.ins });
        if (v.del.length) out.push({ title: 'Un son en moins', items: v.del });
        if (!out.length) return none('Aucun voisin', 'Ce mot n’a ni homophone ni voisin proche avec ces réglages.');
        return out;
      })
    },
    {
      id: 'decoupe', g: 'Rimes', name: 'Découpages', full: 'Découpages sonores', input: 'seed', filt: 0, loose: 1,
      desc: 'Ta phrase redécoupée en d’autres mots qui donnent exactement les mêmes sons, pour les holorimes et les calembours.',
      quick: function (el) {
        el.appendChild(h('button', { type: 'button', class: 'qchip', 'aria-pressed': String(ST.loose), text: 'Rimes souples', onclick: function () { ST.loose = !ST.loose; paintSettings(); refresh(); } }));
        qrow(el, 'Vocabulaire', [[0, 'Courant'], [1, 'Étendu'], [2, 'Tout']], function () { return ST.f.voc; }, function (v) { ST.f.voc = v; paintSettings(); refresh(); });
      },
      run: needWord(function () {
        var r = L.decoupe(Q, 5), by = {};
        r.forEach(function (x) { (by[x.length] || (by[x.length] = [])).push({ parts: x.map(function (i) { return { i: i }; }) }); });
        var out = Object.keys(by).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return { title: n === 1 ? 'En un seul mot' : 'En ' + n + ' mots', items: by[n], first: 40 }; });
        var rows = h('div', { style: 'display:flex;flex-direction:column;gap:8px' }), nh = 0;
        Q.words.forEach(function (t) {
          var hm = (L.byPhon().get(t.phon) || []).filter(function (i) { return D.W[i] !== t.raw && D.FQ[i] >= [45, 8, 0][ST.f.voc]; });
          if (!hm.length) return;
          nh++; var b = h('div', { class: 'words' }, h('span', { class: 'rowlab', text: t.raw + ' =' }));
          hm.slice(0, 14).forEach(function (i) { b.appendChild(chip(i)); }); rows.appendChild(b);
        });
        if (nh) out.push({ title: 'Mot par mot : même son, autre mot', tag: 'homophones', node: rows });
        if (!r.length) out.unshift({ title: 'Aucun découpage exact', node: empty('Active « Rimes souples » et le vocabulaire « Tout » pour multiplier les possibilités, ou essaie une phrase plus courte.') });
        return out;
      })
    },
    {
      id: 'sons', g: 'Sons', name: 'Sons contenus', input: 'sons', filt: 1,
      desc: 'Choisis des sons : tu obtiens les mots qui les contiennent tous. Pour les allitérations (consonnes) et les assonances (voyelles).',
      quick: function (el) { qrow(el, '', MODES(false), function () { return ST.sons.mode; }, function (v) { ST.sons.mode = v; refresh(); }); },
      run: function () {
        if (!ST.sons.sel.length) return [{ title: 'Choisis des sons', node: empty('Ajoute un ou plusieurs sons pour voir les mots qui les contiennent tous.') }];
        var r = L.sons(ST.sons.sel, ST.sons.mode);
        if (!r.length) return none('Aucun mot', 'Aucun mot ne réunit ces sons de cette façon.');
        var dense = [], rest = [];
        r.forEach(function (i) { (L.density(i, ST.sons.sel) >= 0.6 ? dense : rest).push(i); });
        var out = [];
        if (dense.length && rest.length) out.push({ title: 'Saturés de ces sons', tag: 'presque rien d’autre dedans', items: dense });
        out.push({ title: dense.length && rest.length ? 'Tous les autres' : 'Mots trouvés', items: dense.length && rest.length ? rest : r });
        return out;
      }
    },
    {
      id: 'squelette', g: 'Sons', name: 'Squelette', full: 'Squelette de consonnes', input: 'seed', filt: 1,
      desc: 'Les mots bâtis sur les mêmes consonnes dans le même ordre, avec d’autres voyelles : rêve, rive, ravi, arrivée.',
      quick: qsyl,
      run: needWord(function () {
        var s = L.squelette(Q);
        if (!s.sk) return [{ title: 'Pas de consonne', node: empty('Ce mot ne contient aucune consonne prononcée.') }];
        if (!s.items.length) return none('Aucun mot', 'Aucun autre mot ne suit ce squelette de consonnes.');
        var by = {};
        s.items.forEach(function (i) { var n = Math.min(D.NS[i], 5); (by[n] || (by[n] = [])).push(i); });
        var sk = s.sk.split('').map(function (c) { return L.spell(c); }).join(' – ');
        return Object.keys(by).map(Number).sort().map(function (n) { return { title: [mk(sk), ' · ' + (n >= 5 ? '5 syllabes et plus' : pl(n, 'syllabe'))], items: by[n] }; });
      })
    },
    {
      id: 'chaines', g: 'Sons', name: 'Enchaînements', input: 'seed', filt: 1,
      desc: 'Les mots qui commencent par la fin de ton mot, ou qui finissent par son début : pour les mots-valises et les phrases qui s’emboîtent.',
      quick: qsyl,
      run: needWord(function () {
        var c = L.chaines(Q), out = [];
        c.after.forEach(function (g) { out.push({ title: ['Commence par ', mk(L.spell(L.syllabify(g.part)))], tag: 'à placer après ' + Q.last.raw, items: g.items }); });
        c.before.forEach(function (g) { out.push({ title: ['Finit par ', mk(L.spell(L.syllabify(g.part)))], tag: 'à placer avant ' + Q.last.raw, items: g.items }); });
        if (!out.length) return none('Aucun enchaînement', 'Aucun mot ne s’emboîte avec celui-ci avec ces réglages.');
        return out;
      })
    },
    {
      id: 'verlan', g: 'Sons', name: 'Verlan', full: 'Verlan et contrepèteries', input: 'seed', filt: 0, loose: 1,
      desc: 'Ton mot retourné syllabe par syllabe, puis les échanges de sons entre les mots de ta phrase qui donnent d’autres vrais mots.',
      run: needWord(function () {
        var out = [];
        L.verlan(Q).forEach(function (o) {
          out.push({ title: o.label, tag: o.match.length ? 'existe déjà comme mot' : null, items: [{ t: L.spell(o.syl).replace(/·/g, ''), plain: true, sub: L.spell(o.syl) }].concat(o.match), sorted: false });
        });
        var c = L.contrepets(Q);
        if (c.length) out.push({ title: Q.words.length > 1 ? 'Contrepèteries' : 'En échangeant deux sons du mot', tag: 'deux sons échangés', items: c, first: 40 });
        else if (Q.words.length > 1) out.push({ title: 'Contrepèteries', node: empty('Aucun échange de sons ne donne deux vrais mots ici. Essaie deux ou trois mots pleins, par exemple « une femme folle à la messe ».') });
        return out;
      })
    },
    {
      id: 'lettres', g: 'Lettres', name: 'Lettres contenues', input: 'lettres', label: 'Lettres voulues', ph: 'ex. rv', filt: 1,
      desc: 'Écris des lettres : tu obtiens tous les mots qui les contiennent. Tape R et V pour avoir les mots où les deux apparaissent. Répète une lettre pour l’exiger deux fois.',
      quick: function (el) {
        var s = ST.lettres;
        qrow(el, '', MODES(true), function () { return s.mode; }, function (v) { s.mode = v; refresh(); });
        var act = [s.without.trim() ? 'sans ' + s.without.trim() : '', s.min ? s.min + ' min.' : '', s.max ? s.max + ' max.' : ''].filter(Boolean).join(', ');
        qmore(el, act ? 'Limites' : 'Exclure, longueur', act, function () { s.without = ''; s.min = ''; s.max = ''; paintSettings(); refresh(); }, 'c-sans');
      },
      extra: function (el) {
        var s = ST.lettres;
        el.appendChild(fld('Sans les lettres', txt('c-sans', s.without, 'ex. e', function (v) { s.without = v; later(); })));
        el.appendChild(h('div', { class: 'two' },
          fld('Longueur min.', h('input', { id: 'c-min', type: 'number', inputmode: 'numeric', min: 1, max: 30, value: s.min, oninput: function (e) { s.min = e.target.value; later(); } })),
          fld('Longueur max.', h('input', { id: 'c-max', type: 'number', inputmode: 'numeric', min: 1, max: 30, value: s.max, oninput: function (e) { s.max = e.target.value; later(); } }))));
      },
      run: function () {
        var s = ST.lettres;
        if (!s.q.trim() && !s.without.trim()) return [{ title: 'Écris des lettres', node: empty('Tape une ou plusieurs lettres en haut. « rv » donne les mots avec un R et un V ; « rr » ceux avec deux R. Les accents sont ignorés.') }];
        var r = L.lettres(s.q, s.mode, { without: s.without, min: +s.min || 0, max: +s.max || 99 });
        if (!r.length) return none('Aucun mot', 'Aucun mot ne correspond. Les accents sont ignorés : « e » vaut aussi pour é, è, ê.');
        var let_ = L.deacc(s.q).replace(/[^a-z]/g, '').toUpperCase().split('');
        return [{ title: ['Mots avec ', mk(let_.join(s.mode === 'any' || s.mode === 'order' ? ' + ' : '') || '…')], items: r }];
      }
    },
    {
      id: 'motif', g: 'Lettres', name: 'Mot à trous', input: 'motif', label: 'Forme du mot', ph: 'ex. r?v*', filt: 1,
      desc: 'Dessine la forme du mot : ? pour une lettre, * pour n’importe quelle suite, @ pour une voyelle, # pour une consonne.',
      quick: function (el) {
        el.appendChild(h('span', { class: 'qlab', text: 'Insérer' }));
        [['?', '? une lettre'], ['*', '* la suite'], ['@', '@ voyelle'], ['#', '# consonne']].forEach(function (o) {
          el.appendChild(h('button', {
            type: 'button', class: 'qchip', text: o[1], onmousedown: function (e) { e.preventDefault(); }, onclick: function () {
              var a = qIn.selectionStart, b = qIn.selectionEnd, v = qIn.value;
              if (a === null || a === undefined) { a = b = v.length; }
              qIn.value = v.slice(0, a) + o[0] + v.slice(b); ST.motif = qIn.value; fitQuery();
              try { qIn.setSelectionRange(a + 1, a + 1); } catch (e) { }
              refresh();
            }
          }));
        });
      },
      run: function () {
        if (!ST.motif.replace(/[*\s]/g, '')) return [{ title: 'Écris une forme', node: empty('Exemples : « r?v* » (R, une lettre, V, puis la suite), « *ombre » (finit par ombre), « #@#@ » (consonne, voyelle, consonne, voyelle).') }];
        var r = L.motif(ST.motif);
        if (!r.length) return none('Aucun mot', 'Aucun mot n’a cette forme avec ces réglages.');
        return [{ title: ['Forme ', mk(ST.motif.trim())], items: r }];
      }
    },
    {
      id: 'anagrammes', g: 'Lettres', name: 'Anagrammes', input: 'anag', label: 'Tes lettres', ph: 'ex. chanson', filt: 1,
      desc: 'Les mots écrits avec exactement tes lettres, puis tous ceux qu’on peut former avec une partie d’entre elles. Un ? vaut pour n’importe quelle lettre.',
      run: function () {
        var a = L.anagrammes(ST.anag, 3), out = [];
        if (a.exact.length) out.push({ title: 'Anagrammes exactes', tag: 'toutes les lettres', items: a.exact });
        var by = {};
        a.sub.forEach(function (i) { var n = L.deacc(D.W[i]).length; (by[n] || (by[n] = [])).push(i); });
        Object.keys(by).map(Number).sort(function (x, y) { return y - x; }).forEach(function (n) { out.push({ title: n + ' lettres', items: by[n] }); });
        if (!out.length) return none('Aucun mot', 'Écris au moins trois lettres en haut. Les accents, espaces et tirets sont ignorés.');
        return out;
      }
    },
    {
      id: 'synonymes', g: 'Sens', name: 'Synonymes', input: 'seed', filt: 0, loose: 1,
      desc: 'Les mots de sens proche, et leurs propres synonymes pour élargir. Ajoute une rime pour ne garder que ceux qui tombent sur le bon son.',
      quick: function (el) { qmore(el, 'Qui rime avec', ST.synRime.trim(), function () { ST.synRime = ''; paintSettings(); refresh(); }, 'c-synrime'); },
      extra: function (el) { el.appendChild(fld('Qui rime avec', txt('c-synrime', ST.synRime, 'ex. amour', function (v) { ST.synRime = v; later(); }))); },
      run: needWord(function () {
        if (!L.T.ready) return [{ title: 'Chargement', node: empty('Le dictionnaire des synonymes arrive dans un instant.') }];
        var word = ST.synWord || defaultSynonymTarget();
        var s = L.synonymes(word), out = [], nuc = '';
        if (ST.synRime.trim()) { var rq = L.analyze(ST.synRime); if (rq.last) nuc = L.nucleus(L.nz(rq.phon)); }
        var keep = function (arr) {
          var a = nuc ? arr.filter(function (x) { return L.nz(L.phonOfText(x)).endsWith(nuc); }) : arr;
          return a.map(function (x) { return { t: x }; });
        };
        s.groups.forEach(function (g) { var it = keep(g.syns); if (it.length) out.push({ title: ['Synonymes de ', mk(g.head)], tag: g.pos.toLowerCase(), items: it, first: 120 }); });
        var rv = keep(s.rev); if (rv.length) out.push({ title: 'Mots qui y renvoient', tag: 'sens voisin', items: rv });
        var l2 = keep(s.lvl2); if (l2.length) out.push({ title: 'Pour élargir', tag: 'synonymes des synonymes', items: l2 });
        if (!out.length) out.push({ title: 'Aucun synonyme', node: empty(s.found ? 'Aucun synonyme ne rime avec « ' + ST.synRime.trim() + ' ». Active les rimes souples ou change de rime.' : 'Pas de synonyme connu pour « ' + word + ' ». Essaie le singulier ou l’infinitif.') });
        return out;
      })
    },
    {
      id: 'famille', g: 'Sens', name: 'Famille', full: 'Famille du mot', input: 'seed', filt: 0,
      desc: 'Toutes les formes du même mot : conjugaisons, féminins, pluriels, rangées par son final pour trouver celle qui tombe sur la bonne rime.',
      run: needWord(function () {
        var f = L.famille(Q);
        if (!f.length) return [{ title: 'Mot inconnu', node: empty('Ce mot n’est pas dans le dictionnaire, impossible de retrouver sa famille.') }];
        return f.map(function (g) {
          var by = {}, order = [];
          g.items.forEach(function (i) { var k = L.spell(L.nucleus(D.P[i])); if (!by[k]) { by[k] = []; order.push(k); } by[k].push(i); });
          var box = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
          order.forEach(function (k) { var b = h('div', { class: 'words' }); by[k].forEach(function (i) { b.appendChild(chip(i)); }); box.appendChild(h('div', { style: 'display:flex;flex-direction:column;gap:5px' }, h('p', { class: 'sub', text: 'finit en ' + k }), b)); });
          return { title: ['Formes de ', mk(g.lemma)], tag: pl(g.items.length, 'forme'), node: box };
        });
      })
    },
    { id: 'atelier', g: 'Écrire', name: 'Atelier', input: null, filt: 0, desc: 'Écris ton texte : chaque ligne est comptée en syllabes, les rimes sont coloriées et tu vois quels sons reviennent.', custom: atelier },
    {
      id: 'hasard', g: 'Écrire', name: 'Au hasard', full: 'Mots au hasard', input: null, filt: 1,
      desc: 'Un tirage de mots pour débloquer une page blanche, avec une rime imposée pour te lancer un défi.',
      quick: function (el) {
        el.appendChild(h('button', { type: 'button', class: 'qchip pri', text: 'Nouveau tirage', onclick: function () { draw = null; refresh(); window.scrollTo(0, 0); } }));
        qrow(el, 'Mots', [[6, '6'], [12, '12'], [24, '24']], function () { return ST.hasardN; }, function (v) { ST.hasardN = v; draw = null; refresh(); });
      },
      run: function () {
        var sig = JSON.stringify(ST.f);
        if (!draw || draw.sig !== sig) {
          var keepV = L.F.voc; if (L.F.voc > 1) L.F.voc = 1;
          var words = L.hasard(ST.hasardN), one = L.hasard(1); L.F.voc = keepV;
          draw = { sig: sig, words: words, rime: one[0] };
        }
        if (!draw.words.length) return none('Aucun mot', 'Aucun mot ne passe ces filtres.');
        var out = [{ title: 'Ton tirage', tag: 'places-en trois dans un couplet', items: draw.words, sorted: false }];
        if (draw.rime !== undefined) out.push({ title: ['Rime imposée : ', mk(L.spell(L.nucleus(D.P[draw.rime])))], tag: 'comme dans', items: [draw.rime], sorted: false });
        return out;
      }
    },
    { id: 'palette', g: 'Écrire', name: 'Mots gardés', input: null, filt: 0, desc: 'Les mots que tu as gardés en chemin. Ils restent enregistrés sur cet appareil.', custom: palette }
  ];
  var BY = {}, GROUPS = [], GT = {};
  TOOLS.forEach(function (t) { BY[t.id] = t; if (!GT[t.g]) { GT[t.g] = []; GROUPS.push(t.g); } GT[t.g].push(t); });

  /* ---------- atelier ---------- */
  function atelier(res) {
    var ta = h('textarea', { id: 'texte', 'aria-label': 'Ton texte', spellcheck: 'true', autocapitalize: 'sentences', placeholder: 'Écris ton couplet ici, une ligne par vers…' });
    ta.value = ST.texte;
    var gut = h('div', { class: 'gut', 'aria-hidden': 'true' }), mir = h('div', { class: 'mir', 'aria-hidden': 'true' });
    var ed = h('div', { class: 'ed' }, gut, ta, mir);
    var badge = h('span', { class: 'ex', text: 'Texte d’exemple' });
    var out = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
    var info = [], letter = {};
    var analyse = function () {
      var lines = ST.texte.split('\n'), cnt = {}, nl = 0;
      info = lines.map(function (l) { return l.trim() ? L.analyseLigne(l) : null; });
      info.forEach(function (a) { if (a && a.nuc) cnt[a.nuc] = (cnt[a.nuc] || 0) + 1; });
      letter = {};
      info.forEach(function (a) { if (a && cnt[a.nuc] > 1 && !(a.nuc in letter)) letter[a.nuc] = nl++; });
      return lines;
    };
    var layout = function () {
      var lines = ST.texte.split('\n');
      ta.style.height = 'auto'; ta.style.height = Math.max(132, ta.scrollHeight) + 'px';
      mir.textContent = ''; gut.textContent = '';
      lines.forEach(function (l) { mir.appendChild(h('div', { text: l || ' ' })); });
      lines.forEach(function (l, i) {
        var a = info[i], row = h('div', { style: 'height:' + mir.children[i].offsetHeight + 'px' });
        if (a) row.appendChild(h('b', { class: a.nuc in letter ? 'c' + (letter[a.nuc] % 6 + 1) : null, text: String(a.n), title: a.extra ? a.n + ' syllabes parlées, ' + (a.n + a.extra) + ' avec les e muets' : null }));
        gut.appendChild(row);
      });
    };
    var paint = function () {
      badge.hidden = ST.texte !== EXEMPLE;
      var lines = analyse(); layout();
      out.textContent = '';
      if (!ST.texte.trim()) return;
      var snd = {}, tot = 0, box = h('div', { class: 'lines' });
      lines.forEach(function (line, li) {
        var a = info[li]; if (!a) return;
        var rl = a.nuc in letter ? letter[a.nuc] : '';
        var tx = h('span', { class: 'tx' }), chunks = line.split(/([A-Za-zÀ-ÖØ-öø-ÿœŒæÆ'’\-]+)/), lastW = -1;
        chunks.forEach(function (c, ci) { if (ci % 2 && /[A-Za-zÀ-ÿœŒ]/.test(c)) lastW = ci; });
        chunks.forEach(function (c, ci) {
          if (!(ci % 2) || !/[A-Za-zÀ-ÿœŒ]/.test(c)) { tx.appendChild(document.createTextNode(c)); return; }
          var q = L.analyze(c), ph = q.phon;
          for (var x = 0; x < ph.length; x++) { snd[ph[x]] = (snd[ph[x]] || 0) + 1; tot++; }
          var b = h('button', { type: 'button', text: c });
          if (q.last && q.last.idx >= 0) b.setAttribute('data-i', q.last.idx); else b.setAttribute('data-t', c.toLowerCase());
          if (sndOn && ph.indexOf(sndOn) >= 0) b.className = 'snd-on';
          if (ci === lastW && rl !== '') b.className = 'c' + (rl % 6 + 1);
          tx.appendChild(b);
        });
        var find = h('button', {
          type: 'button', class: 'line-search', html: ICON.search,
          'aria-label': 'Chercher des rimes pour la ligne ' + (li + 1),
          title: 'Chercher des rimes pour cette ligne',
          onclick: function () { searchFor(line.trim(), 'rimes'); }
        });
        box.appendChild(h('div', { class: 'ln' }, h('span', { class: 'k' }, h('b', { text: String(a.n) }), a.extra ? ' +' + a.extra : ''), tx, find));
      });
      out.appendChild(group({ title: 'Lecture', tag: 'la loupe cherche les rimes d’un vers', node: box }));
      out.appendChild(h('p', { class: 'hint', text: 'Le chiffre compte les syllabes comme on les parle ; « +2 » signale deux e muets que tu peux choisir de faire sonner. Les lignes qui riment partagent la même couleur.' }));
      var keys = Object.keys(snd).sort(function (x, y) { return snd[y] - snd[x]; });
      var row = function (f) {
        var b = h('div', { class: 'pal' });
        keys.filter(f).slice(0, 8).forEach(function (c) {
          b.appendChild(h('button', { type: 'button', class: 'snd', 'aria-pressed': String(sndOn === c), onclick: function () { sndOn = sndOn === c ? null : c; paint(); } }, L.spell(c), h('small', { text: snd[c] + ' fois' })));
        });
        return b;
      };
      if (tot) {
        out.appendChild(group({ title: 'Consonnes qui reviennent', tag: 'touche un son pour le souligner', node: row(function (c) { return !L.isV(c); }) }));
        out.appendChild(group({ title: 'Voyelles qui reviennent', node: row(L.isV) }));
      }
    };
    var pT = 0;
    ta.addEventListener('input', function () { ST.texte = ta.value; save(); ta.style.height = 'auto'; ta.style.height = Math.max(132, ta.scrollHeight) + 'px'; clearTimeout(pT); pT = setTimeout(paint, 160); });
    atelier.relayout = function () { if (document.body.contains(ta)) layout(); };
    var sure = false, clrB = h('button', { type: 'button', class: 'btn', text: 'Vider la page', onclick: function () { if (ST.texte.trim() && ST.texte !== EXEMPLE && !sure) { sure = true; clrB.textContent = 'Confirmer : tout effacer'; return; } sure = false; clrB.textContent = 'Vider la page'; ta.value = ''; ST.texte = ''; save(); paint(); ta.focus(); } });
    var query = ST.seed.trim();
    if (query) {
      var use = h('button', { type: 'button', class: 'btn', text: 'Ajouter au texte', onclick: function () {
        addToDraft(query, ST.texte.endsWith('\n') ? '' : '\n');
        ta.value = ST.texte;
        paint();
        use.textContent = 'Phrase ajoutée';
        use.disabled = true;
      } });
      res.appendChild(h('div', { class: 'draft-query' }, h('p', null, h('span', { text: 'Dernière recherche' }), h('strong', { text: query })), use));
    }
    res.appendChild(ed);
    res.appendChild(h('div', { class: 'row' }, badge, clrB, h('button', { type: 'button', class: 'btn', text: 'Copier le texte', onclick: function (e) { copy(ST.texte, e.target, 'Copier le texte'); } })));
    res.appendChild(out);
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { atelier.relayout(); });
  }
  window.addEventListener('resize', function () { if (atelier.relayout) atelier.relayout(); });

  /* ---------- palette ---------- */
  function palette(res) {
    if (!ST.palette.length) { res.appendChild(empty('Touche un mot dans les résultats, puis « Garder ce mot », pour le retrouver ici.')); return; }
    var box = h('div', { class: 'words' });
    ST.palette.forEach(function (w) { box.appendChild(chip({ t: w })); });
    res.appendChild(box);
    var sure = false, c = h('button', { type: 'button', class: 'btn', text: 'Tout retirer', onclick: function () { if (!sure) { sure = true; c.textContent = 'Confirmer le retrait'; return; } ST.palette = []; save(); paintNav(); refresh(); } });
    res.appendChild(h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', text: 'Copier la liste', onclick: function (e) { copy(ST.palette.join(', '), e.target, 'Copier la liste'); } }), c));
  }
  function copy(text, btn, back) {
    var done = function (ok) { if (btn) { btn.textContent = ok ? 'Copié' : 'Copie impossible ici'; setTimeout(function () { btn.textContent = back; }, 1600); } };
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  /* ---------- panneaux ---------- */
  function closePanels() {
    [menu, settings, pick].forEach(function (p) { p.classList.remove('open'); });
    $('#bset').setAttribute('aria-expanded', 'false');
    scrim.hidden = true; scrim.className = '';
  }
  function openPanel(p, soft) {
    closePanels();
    p.classList.add('open');
    if (p === settings) $('#bset').setAttribute('aria-expanded', 'true');
    if (p === settings && isWide()) return;
    if (p === pick && !isMob()) return;
    scrim.hidden = false; scrim.className = soft ? 'soft' : '';
  }
  scrim.addEventListener('click', closePanels);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanels(); });
  function phead(title) { return h('div', { class: 'phead' }, h('h2', { text: title }), h('button', { type: 'button', class: 'x', 'aria-label': 'Fermer', html: ICON.x, onclick: closePanels })); }

  function paintSettings() {
    var t = BY[ST.tool], f = ST.f, el = settings, re = function () { save(); refresh(); };
    var sc = el.scrollTop; el.textContent = '';
    el.appendChild(phead(t.full || t.name));
    el.appendChild(h('p', { class: 'hint', text: t.desc }));
    if (t.extra) t.extra(el);
    if (t.filt) {
      el.appendChild(fldDiv('Syllabes', seg(SYL, function () { return f.syl; }, function (v) { f.syl = v; re(); })));
      el.appendChild(fldDiv('Nature', seg([[0, 'Toutes'], [1, 'Noms'], [2, 'Verbes'], [4, 'Adjectifs'], [8, 'Adverbes']], function () { return f.cat; }, function (v) { f.cat = v; re(); })));
    }
    if (t.filt || t.loose) {
      el.appendChild(fldDiv('Vocabulaire', seg([[0, 'Courant', '19 000 formes les plus fréquentes'], [1, 'Étendu', '61 000 formes'], [2, 'Tout', '125 000 formes, mots rares compris']], function () { return f.voc; }, function (v) { f.voc = v; re(); })));
      el.appendChild(tog('Rimes souples', 'é = è, o ouvert = o fermé, eu = e', function () { return ST.loose; }, function (v) { ST.loose = v; re(); }));
    }
    if (t.filt) {
      el.appendChild(tog('Formes de base seulement', 'sans conjugaisons ni pluriels', function () { return f.base; }, function (v) { f.base = v; re(); }));
      el.appendChild(tog('Afficher la prononciation', null, function () { return ST.showPh; }, function (v) { ST.showPh = v; re(); }));
      el.appendChild(fld('Tri', (function () {
        var s = h('select', { id: 'c-tri', onchange: function (e) { ST.sort = e.target.value; re(); } });
        [['freq', 'Les plus courants d’abord'], ['rare', 'Les plus rares d’abord'], ['alpha', 'Alphabétique'], ['court', 'Les plus courts d’abord'], ['long', 'Les plus longs d’abord']].forEach(function (o) { s.appendChild(h('option', { value: o[0], text: o[1], selected: ST.sort === o[0] })); });
        return s;
      })()));
    }
    if (!t.filt && !t.loose && !t.extra) el.appendChild(h('p', { class: 'hint', text: 'Cet outil n’a pas de réglage.' }));
    if (!isWide()) el.appendChild(h('button', { type: 'button', class: 'btn pri', text: 'Voir les résultats', onclick: closePanels }));
    el.scrollTop = sc;
  }
  function openSettings(focusId) {
    paintSettings(); openPanel(settings);
    if (focusId) setTimeout(function () { var e = document.getElementById(focusId); if (e) e.focus(); }, 260);
  }
  $('#bset').addEventListener('click', function () { openSettings(); });

  function paintPick() {
    pick.textContent = '';
    pick.appendChild(phead('Ajouter des sons'));
    var mkPal = function (from, to) {
      var b = h('div', { class: 'pal' });
      SND.slice(from, to).forEach(function (s) { b.appendChild(h('button', { type: 'button', class: 'snd', onclick: function () { ST.sons.sel.push(s[0]); paintHeader(); refresh(); } }, s[1], s[2] ? h('small', { text: s[2] }) : null)); });
      return b;
    };
    pick.appendChild(fldDiv('Voyelles', mkPal(0, 14)));
    pick.appendChild(fldDiv('Consonnes', mkPal(14, SND.length)));
    pick.appendChild(h('button', { type: 'button', class: 'btn', text: 'Reprendre les consonnes de « ' + ((seedQ() && Q.last) ? Q.last.raw : '…') + ' »', onclick: function () { seedQ(); if (Q && Q.last) { ST.sons.sel = Q.last.phon.replace(/[aiyuoOeE°295@§]/g, '').split(''); paintHeader(); refresh(); } } }));
  }

  /* ---------- menu d'un mot ---------- */
  function openMenu(el) {
    var i = el.hasAttribute('data-i') ? +el.getAttribute('data-i') : -1, w = i >= 0 ? D.W[i] : el.getAttribute('data-t');
    menu.textContent = '';
    menu.appendChild(phead(w));
    if (i >= 0) {
      var fl = D.FL[i], nat = [], fq = D.FQ[i];
      if (fl & 1) nat.push('nom'); if (fl & 2) nat.push('verbe'); if (fl & 4) nat.push('adjectif'); if (fl & 8) nat.push('adverbe');
      menu.appendChild(h('p', { class: 'meta', text: L.spellI(i) + ' · ' + pl(D.NS[i], 'syllabe') + (nat.length ? ' · ' + nat.join(', ') : '') + ' · ' + (fq >= 45 ? 'courant' : fq >= 8 ? 'moins courant' : 'rare') }));
    } else {
      var q = L.analyze(w);
      if (q.syl.length) menu.appendChild(h('p', { class: 'meta', text: L.spell(q.syl) + ' · ' + pl(q.syl.length, 'syllabe') }));
    }
    var go = function (tool) { return function () { searchFor(w, tool, i >= 0 ? i : null); }; };
    var k = kept(w), acts = h('div', { class: 'acts' });
    acts.appendChild(h('button', {
      type: 'button', class: 'btn pri', text: k ? 'Retirer ce mot' : 'Garder ce mot', onclick: function () {
        if (k) ST.palette = ST.palette.filter(function (x) { return x !== w; }); else ST.palette.push(w);
        save(); closePanels(); paintNav();
        if (ST.tool === 'palette') refresh(); else el.classList.toggle('kept', !k);
      }
    }));
    acts.appendChild(h('button', { type: 'button', class: 'btn', text: 'Ajouter au texte', onclick: function (e) {
      addToDraft(w, /\s$/.test(ST.texte) ? '' : ' ');
      if (ST.tool === 'atelier') refresh();
      e.target.textContent = 'Ajouté';
      e.target.disabled = true;
    } }));
    menu.appendChild(acts);
    var searches = h('div', { class: 'acts' });
    [['rimes', 'Rimes'], ['multi', 'Rimes multi'], ['synonymes', 'Synonymes'], ['voisins', 'Homophones'], ['famille', 'Famille du mot'], ['chaines', 'Enchaînements']].forEach(function (a) {
      searches.appendChild(h('button', { type: 'button', class: 'btn', text: a[1], onclick: go(a[0]) }));
    });
    menu.appendChild(h('div', { class: 'fld word-search' }, h('p', { text: 'Chercher avec ce mot' }), searches));
    var cb = h('button', { type: 'button', class: 'btn', text: 'Copier', onclick: function () { copy(w, cb, 'Copier'); } });
    menu.appendChild(cb);
    menu.style.left = ''; menu.style.top = '';
    if (isMob()) openPanel(menu);
    else {
      closePanels(); menu.classList.add('open');
      var r = el.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
      var x = Math.max(12, Math.min(r.left, window.innerWidth - mw - 12)), y = r.bottom + 6;
      if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 6);
      menu.style.left = x + 'px'; menu.style.top = y + 'px';
    }
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var sd = e.target.closest('[data-seed]');
    if (sd) { searchFor(sd.getAttribute('data-seed'), ST.tool); $('#ttl').focus({ preventScroll: true }); return; }
    var t = e.target.closest('[data-i],[data-t]');
    if (t && !menu.contains(t)) { e.preventDefault(); openMenu(t); return; }
    if (!isMob() && menu.classList.contains('open') && !menu.contains(e.target)) menu.classList.remove('open');
  });
  window.addEventListener('scroll', function () { if (!isMob() && menu.classList.contains('open')) menu.classList.remove('open'); }, { passive: true });

  /* ---------- navigation ---------- */
  var SEARCH_MODES = [['rimes', 'Rimes'], ['multi', 'Rimes multi'], ['synonymes', 'Synonymes']];
  var searchModes = $('#tools'), tabs = $('#tabs'), navTools = $('#side');
  function isMainSearch(id) { return SEARCH_MODES.some(function (mode) { return mode[0] === id; }); }
  SEARCH_MODES.forEach(function (mode) {
    searchModes.appendChild(h('button', { type: 'button', 'data-tool': mode[0], text: mode[1], onclick: function () { setTool(mode[0]); } }));
  });
  var mainNav = [
    ['search', 'Chercher', function () { setTool(ST.searchTool); }],
    ['atelier', 'Écrire', function () { setTool('atelier'); }],
    ['palette', 'Mots gardés', function () { setTool('palette'); }],
    ['catalog', 'Outils', function () { closePanels(); catalog.showModal(); }]
  ];
  mainNav.forEach(function (entry) {
    var icon = { search: 'search', atelier: 'Écrire', palette: 'saved', catalog: 'catalog' }[entry[0]];
    tabs.appendChild(h('button', {
      type: 'button', 'data-nav': entry[0], 'aria-haspopup': entry[0] === 'catalog' ? 'dialog' : null, onclick: entry[2]
    }, h('span', { class: 'nav-icon', html: ICON[icon] }, h('small', { class: 'saved-count', hidden: true })), entry[1]));
  });
  catalog.addEventListener('click', function (e) { if (e.target === catalog) catalog.close(); });
  var catalogGroups = [
    ['Faire sonner une phrase', [
      ['rimes', 'Trouver des mots qui riment'], ['multi', 'Faire rimer plusieurs syllabes'],
      ['voisins', 'Trouver des homophones et des sons proches'], ['decoupe', 'Redécouper une phrase en gardant ses sons'],
      ['sons', 'Chercher les mots qui contiennent des sons précis'], ['squelette', 'Garder les consonnes, changer les voyelles'],
      ['chaines', 'Assembler des mots par leurs sons'], ['verlan', 'Retourner ou échanger des syllabes']
    ]],
    ['Trouver le bon mot', [
      ['synonymes', 'Remplacer un mot par un autre de sens proche'], ['famille', 'Explorer les formes d’un mot'],
      ['lettres', 'Chercher des mots qui contiennent certaines lettres'], ['motif', 'Compléter un mot à trous'],
      ['anagrammes', 'Recomposer un mot avec des lettres']
    ]],
    ['Écrire et garder ses idées', [
      ['atelier', 'Écrire un texte et voir les syllabes de chaque ligne'], ['palette', 'Retrouver les mots mis de côté'],
      ['hasard', 'Tirer des mots et une rime pour démarrer']
    ]]
  ];
  catalogGroups.forEach(function (g) {
    var section = h('section', { class: 'catalog-group' }, h('h3', { text: g[0] }));
    g[1].forEach(function (entry) {
      var id = entry[0], tool = BY[id];
      section.appendChild(h('button', { type: 'button', 'data-catalog': id, onclick: function () {
        catalog.close();
        setTool(id);
        $('#ttl').focus({ preventScroll: true });
      } }, h('strong', { text: tool.full || tool.name }), h('span', { text: entry[1] })));
    });
    $('#catalog-list').appendChild(section);
  });

  function paintNav() {
    var t = BY[ST.tool];
    searchModes.hidden = t.input !== 'seed';
    searchModes.querySelectorAll('button').forEach(function (b) {
      if (b.dataset.tool === t.id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    var current = isMainSearch(t.id) ? 'search' : (t.id === 'atelier' || t.id === 'palette' ? t.id : 'catalog');
    tabs.querySelectorAll('button').forEach(function (b) {
      if (b.dataset.nav === current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    var count = tabs.querySelector('[data-nav="palette"] .saved-count');
    count.textContent = ST.palette.length > 99 ? '99+' : String(ST.palette.length);
    count.hidden = !ST.palette.length;
    catalog.querySelectorAll('[data-catalog]').forEach(function (b) {
      if (b.dataset.catalog === t.id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    navTools.textContent = '';
    GROUPS.forEach(function (g) {
      var box = h('div', { class: 'navg' }, h('h3', { text: g }));
      GT[g].forEach(function (x) { box.appendChild(h('button', { type: 'button', class: 'navb', 'aria-current': x.id === t.id ? 'page' : null, onclick: function () { setTool(x.id); } }, x.full || x.name, x.id === 'palette' && ST.palette.length ? h('span', { class: 'n', text: String(ST.palette.length) }) : null)); });
      navTools.appendChild(box);
    });
  }
  function inputVal(t) { return t.input === 'seed' ? ST.seed : t.input === 'lettres' ? ST.lettres.q : t.input === 'motif' ? ST.motif : t.input === 'anag' ? ST.anag : ''; }
  function setInputVal(t, v) {
    if (t.input === 'seed') setSeed(v); else if (t.input === 'lettres') ST.lettres.q = v; else if (t.input === 'motif') ST.motif = v; else if (t.input === 'anag') ST.anag = v;
  }
  function fitQuery() {
    clr.hidden = !qIn.value;
    qIn.style.height = 'auto';
    qIn.style.height = qIn.scrollHeight + 'px';
  }
  window.addEventListener('resize', function () { if (!$('#field').hidden) fitQuery(); });
  function paintHeader() {
    var t = BY[ST.tool], isIn = t.input && t.input !== 'sons';
    bar.hidden = !t.input;
    $('#field').hidden = !isIn; $('#toks').hidden = t.input !== 'sons';
    $('#ttl').textContent = { rimes: 'Trouver des rimes', multi: 'Rimes multisyllabiques', synonymes: 'Trouver des synonymes', atelier: 'Ton atelier', palette: 'Mots gardés' }[t.id] || t.full || t.name;
    $('#intro').textContent = {
      rimes: 'La recherche part du dernier mot de ta phrase.',
      multi: 'Fais rimer plusieurs syllabes de ta fin de phrase.',
      synonymes: 'Trouve un autre mot pour exprimer la même idée.',
      atelier: 'Écris tes paroles, une ligne par vers.',
      palette: 'Tes mots mis de côté pendant l’écriture.'
    }[t.id] || t.desc;
    if (isIn) {
      if (qIn.value !== inputVal(t)) qIn.value = inputVal(t);
      qIn.placeholder = t.input === 'seed' ? 'Écris un mot ou une phrase' : t.ph;
      qIn.setAttribute('aria-label', t.input === 'seed' ? 'Mot ou phrase à chercher' : t.label);
      qIn.style.fontFamily = t.input === 'seed' ? '' : 'var(--f-mono)';
      qIn.style.letterSpacing = t.input === 'seed' ? '' : '.06em';
      fitQuery();
    } else if (t.input === 'sons') {
      var tk = $('#toks'); tk.textContent = '';
      ST.sons.sel.forEach(function (c, i) { tk.appendChild(h('button', { type: 'button', class: 'tok', 'aria-label': 'Retirer le son ' + SLAB[c], text: SLAB[c] + ' ×', onclick: function () { ST.sons.sel.splice(i, 1); paintHeader(); refresh(); } })); });
      tk.appendChild(h('button', { type: 'button', class: 'addtok', text: ST.sons.sel.length ? '+ Son' : '+ Choisir des sons', onclick: function () { paintPick(); openPanel(pick, true); } }));
      tk.scrollLeft = tk.scrollWidth;
    }
    $('#bset').hidden = !(t.filt || t.loose || t.extra);
    $('.tool-head').toggleAttribute('data-main-search', isMainSearch(t.id));
    pick.hidden = t.input !== 'sons';
    if (t.input === 'sons') paintPick();
  }
  function paintQuick() {
    var el = $('#quick'), t = BY[ST.tool], sl = el.scrollLeft;
    el.textContent = '';
    if (t.quick && D.n) t.quick(el);
    el.scrollLeft = sl;
  }
  function paintRead(n) {
    var el = $('#read'), ctx = $('#context'), t = BY[ST.tool];
    el.textContent = '';
    ctx.textContent = '';
    $('#intro').hidden = t.id === 'rimes' && !!(Q && Q.last);
    $('#pronunciation').hidden = !(t.input === 'seed' && Q && Q.last);
    if (t.input === 'seed' && Q && Q.syl.length) {
      var lt = Q.last;
      if (t.id === 'rimes') ctx.appendChild(h('span', { class: 'target', text: 'Rime avec « ' + lt.raw + ' »' }));
      if (t.id === 'multi') ctx.appendChild(h('span', { class: 'target', text: pl(Q.syl.length, 'syllabe') + ' dans ta recherche' }));
      if (t.id === 'synonymes' && Q.words.length > 1) {
        var select = h('select', { id: 'syn-word', onchange: function () {
          ST.synWord = select.value;
          refresh();
          $('#syn-word').focus({ preventScroll: true });
        } });
        var defaultTarget = defaultSynonymTarget();
        select.appendChild(h('option', { value: '', text: defaultTarget, selected: !ST.synWord }));
        Array.from(new Set(Q.words.map(function (word) { return word.raw; }))).forEach(function (word) {
          if (word !== defaultTarget) select.appendChild(h('option', { value: word, text: word, selected: word === ST.synWord }));
        });
        ctx.appendChild(h('label', { class: 'target' }, 'Mot à remplacer', select));
      }
      el.appendChild(h('b', { text: L.spell(Q.syl) }));
      el.appendChild(h('span', { class: 'cnt', text: pl(Q.syl.length, 'syllabe') }));
      if (lt && lt.alts.length > 1) lt.alts.forEach(function (a) { el.appendChild(h('button', { type: 'button', class: 'alt', title: 'Autre prononciation de « ' + lt.raw + ' »', text: L.spellI(a), 'aria-pressed': String(a === lt.idx), onclick: function () { ST.over = a; save(); refresh(); } })); });
      var g = Q.toks.filter(function (x) { return x.guessed; }).map(function (x) { return x.raw; });
      if (g.length) el.appendChild(h('span', { text: 'prononciation devinée : ' + g.join(', ') }));
    }
    if (n) ctx.appendChild(h('span', { class: 'result-count', text: pl(n, 'résultat') }));
    var bd = $('#badge'), af = BY[ST.tool].filt ? activeFilters() : 0;
    if ((t.id === 'rimes' && ST.sens.trim()) || (t.id === 'synonymes' && ST.synRime.trim()) || (t.id === 'multi' && ST.multiN)) af++;
    bd.hidden = !af; bd.textContent = String(af);
  }
  function syncUrl() {
    var t = BY[ST.tool];
    try { history.replaceState(null, '', (t.input === 'seed' && ST.seed.trim() ? '?q=' + encodeURIComponent(ST.seed.trim()) : location.pathname) + '#' + ST.tool); } catch (e) { }
  }
  function refresh() {
    if (!D.n) return;
    applyF(); seedQ();
    var t = BY[ST.tool], res = $('#results');
    if (t.id === 'multi' && ST.multiN > Q.syl.length) ST.multiN = 0;
    paintQuick();
    if (isWide() && !settings.contains(document.activeElement)) paintSettings();
    res.textContent = '';
    if (t.custom) { paintRead(0); t.custom(res); save(); syncUrl(); return; }
    var groups = t.run();
    paintRead(total(groups));
    var fr = document.createDocumentFragment();
    groups.forEach(function (g) { fr.appendChild(group(g)); });
    res.appendChild(fr);
    save(); syncUrl();
  }
  function setTool(id) {
    if (!BY[id]) id = 'rimes';
    ST.tool = id;
    if (isMainSearch(id)) ST.searchTool = id;
    closePanels();
    $('#pronunciation').open = false;
    if (D.n) { applyF(); seedQ(); }
    paintNav(); paintHeader();
    if (isWide()) { paintSettings(); settings.classList.add('open'); }
    refresh();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (BY[id] && id !== ST.tool) setTool(id); });

  /* ---------- saisie ---------- */
  qIn.addEventListener('input', function () {
    setInputVal(BY[ST.tool], qIn.value); fitQuery();
    clearTimeout(rT);
    rT = setTimeout(refresh, 90);
  });
  qIn.addEventListener('blur', remember);
  qIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      clearTimeout(rT);
      qIn.blur();
      refresh();
      window.scrollTo(0, 0);
    }
  });
  clr.addEventListener('mousedown', function (e) { e.preventDefault(); });
  clr.addEventListener('click', function () { remember(); qIn.value = ''; setInputVal(BY[ST.tool], ''); fitQuery(); qIn.focus(); refresh(); window.scrollTo(0, 0); });
  /* le clavier ouvert, la barre du bas s'efface pour laisser la place aux résultats */
  var textControl = 'input[type=text],input[type=number],textarea';
  document.addEventListener('focusin', function (e) { document.body.classList.toggle('kb', e.target.matches(textControl)); });
  document.addEventListener('focusout', function () { document.body.classList.remove('kb'); });
  var mq = window.matchMedia('(min-width:1120px)');
  var onMq = function () { closePanels(); if (isWide()) { paintSettings(); settings.classList.add('open'); } };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);

  /* ---------- démarrage ---------- */
  var start = location.hash.slice(1), qp = null;
  try { qp = new URLSearchParams(location.search).get('q'); } catch (e) { }
  if (BY[start]) ST.tool = start; else if (!BY[ST.tool]) ST.tool = 'rimes';
  if (!isMainSearch(ST.searchTool)) ST.searchTool = 'rimes';
  if (qp && qp !== ST.seed) setSeed(qp);
  paintNav(); paintHeader();
  $('#results').appendChild(empty('Chargement du dictionnaire : 125 000 mots et leur prononciation…'));
  fetch('data/lexique.txt').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (txtData) {
    L.load(txtData);
    $('#status').textContent = nf(D.n) + ' mots';
    setTool(ST.tool);
    return fetch('data/synonymes.txt').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t2) {
      L.loadThes(t2);
      if (ST.tool === 'synonymes' || (ST.tool === 'rimes' && ST.sens.trim())) refresh();
    });
  }).catch(function () {
    if (!D.n) { $('#status').textContent = 'Hors ligne'; $('#results').textContent = ''; $('#results').appendChild(empty('Le dictionnaire n’a pas pu être chargé. Vérifie ta connexion puis recharge la page.')); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
