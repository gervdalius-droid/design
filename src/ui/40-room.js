/* =====================================================================
   40-room.js — the layout stage (Išdėstymas), the settings page (⚙), and the few helpers the re-skin of the
   live widgets (40-skin.css) needs.

   Nothing of the live app is rebuilt here: the whole-furniture editor is the live DBRoom (the core mounts it
   into #room), the settings are the live viewSet() with every binding as it was — only regrouped.
   ===================================================================== */

/* Lithuanian plural: 1 dalykas · 2 dalykai · 10 dalykų */
function nvrPl(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && (b < 10 || b > 20) ? few : many; }

/* ----------------------------------------------------------------- Išdėstymas */
/* one issue of this stage as a compact row; its button is the issue's own one-click fix, else "show the cabinet" */
function nvrIssueRow(x) {
  var c = x.cab >= 0 ? S.proj.cabinets[x.cab] : null, a = x.act, btn = '';
  if (a && (a.act || a.nv)) btn = '<button type="button" class="nv-btn sm" ' + (a.act ? 'data-act="' + esc(a.act) + '"' : 'data-nv="' + esc(a.nv) + '"') + (a.v != null ? ' data-v="' + esc(a.v) + '"' : '') + (a.i != null ? ' data-i="' + esc(a.i) + '"' : '') + '>' + esc(a.label || L('Taisyti', 'Fix')) + '</button>';
  else if (c) btn = '<button type="button" class="nv-btn sm" data-nv="rsel" data-i="' + x.cab + '" title="' + esc(L('Pažymėti spintelę brėžinyje', 'Select the cabinet in the drawing')) + '">' + L('Rodyti', 'Show') + '</button>';
  return '<div class="nv-issue ' + esc(x.sev) + ' nvr-issue"><span class="nv-state ' + esc(x.sev) + '" aria-hidden="true"></span><div class="nvr-is-t">' +
    (c ? '<b>' + (x.cab + 1) + ' · ' + esc(c.name || typeName(c)) + '</b> ' : '') + '<span>' + esc(x.msg) + '</span>' + (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + '</div>' + btn + '</div>';
}
/* everything that is fixed in another stage, as one line that leads to the check stage */
function nvrCheckLine() {
  var n = nvCounts(nvIssues().filter(function (x) { return x.tab !== 'room'; })), tot = n.error + n.todo + n.warn; if (!tot) return '';
  var cls = n.error ? 'error' : n.todo ? 'todo' : 'warn', parts = [];
  if (n.error) parts.push(n.error + ' ' + L(nvrPl(n.error, 'klaida', 'klaidos', 'klaidų'), n.error === 1 ? 'error' : 'errors'));
  if (n.todo) parts.push(n.todo + ' ' + L('patvirtinti', 'to confirm'));
  if (n.warn) parts.push(n.warn + ' ' + L(nvrPl(n.warn, 'įspėjimas', 'įspėjimai', 'įspėjimų'), n.warn === 1 ? 'warning' : 'warnings'));
  return '<button type="button" class="nvr-chkline" data-act="tab" data-v="chk" title="' + esc(parts.join(' · ')) + '"><span class="nv-state ' + cls + '" aria-hidden="true"></span><b>' + tot + ' ' +
    L(nvrPl(tot, 'dalykas laukia', 'dalykai laukia', 'dalykų laukia') + ' patikros', (tot === 1 ? 'thing waits' : 'things wait') + ' in the check') + '</b>' + (parts.length > 1 ? '<span class="nvr-chk-d">' + esc(parts.join(' · ')) + '</span>' : '') + '<span class="nvr-arrow" aria-hidden="true">→</span></button>';
}
NVSTAGE.room = function () {
  var mine = nvIssues().filter(function (x) { return x.tab === 'room' && x.sev !== 'info'; }), max = NV.rAll ? mine.length : 3;
  var rows = mine.slice(0, max).map(nvrIssueRow).join('') +
    (mine.length > 3 ? '<button type="button" class="nv-btn ghost sm nvr-all" data-nv="rall">' + (NV.rAll ? L('Rodyti mažiau', 'Show fewer') : L('Dar ', 'More: ') + (mine.length - 3) + ' →') + '</button>' : '');
  return '<div class="nvr-room">' +
    '<header class="nvr-head"><div class="nvr-head-t"><h1 class="nv-h1">' + L('Išdėstymas', 'Layout') + '</h1>' +
      '<p class="nv-lead">' + L('Neprivaloma: sustatykite spinteles prie sienų — iš čia skaičiuojami bendri stalviršiai ir cokoliai, braižomi sienų brėžiniai ir realus vaizdas.',
        'Optional: place the cabinets along the walls — the joined worktops and plinths, the wall drawings and the realistic picture are made from here.') + '</p></div>' + nvrCheckLine() + '</header>' +
    (rows ? '<div class="nvr-issues">' + rows + '</div>' : '') +
    '<div class="room" id="room"></div>' +
    '<footer class="nvr-foot"><button type="button" class="nv-btn" data-act="tab" data-v="cab">← ' + L('Spintelės', 'Cabinets') + '</button>' +
      '<button type="button" class="nv-btn pri" data-act="tab" data-v="chk">' + L('Toliau: Patikra', 'Next: Check') + ' →</button></footer>' +
    '</div>';
};
NVA.rall = function () { NV.rAll = !NV.rAll; };
/* "Rodyti": the cabinet becomes the selected one of the layout editor (its inspector opens) */
NVA.rsel = function (el, v, i) { if (!S.proj.cabinets[i]) return false; setRoomSel(i); S.sel = i; S.confirm = null; };

/* the palette is a long list with its own scroll; the live editor redraws itself on every change, so the place
   the list was scrolled to is kept here and put back */
document.addEventListener('scroll', function (e) { var el = e.target; if (el && el.classList && el.classList.contains('rm-pal')) NV.rPalTop = el.scrollTop; }, true);
function nvrPalKeep() {
  var room = document.getElementById('room'); if (!room) return;
  var put = function () { var p = room.querySelector('.rm-pal'); if (p && NV.rPalTop && Math.abs(p.scrollTop - NV.rPalTop) > 1) p.scrollTop = NV.rPalTop; };
  put();
  if (window.MutationObserver) new MutationObserver(put).observe(room, { childList: true });   // dies with the #room element at the next render
}
NVAFTER.push(nvrPalKeep);

/* ----------------------------------------------------------------- Nustatymai
   The live page is ten cards in a grid, about eighty controls. Here the same cards — the same nodes, every id,
   data-bind and data-act untouched — are put in one readable column under group titles, with a list of
   sections on the left. A card is recognised by a control it contains, so the live page may reorder or reword. */
var NVR_SET_GROUPS = [
  { k: 'mat', lt: 'Medžiagos',             en: 'Materials' },
  { k: 'cab', lt: 'Nauja spintelė',        en: 'New cabinet' },
  { k: 'cnc', lt: 'Staklės ir gręžimas',   en: 'Machine and drilling' },
  { k: 'drw', lt: 'Stalčių sistemos',      en: 'Drawer systems' },
  { k: 'out', lt: 'Sąrašas ir kainos',     en: 'Part list and prices' },
  { k: 'etc', lt: 'Kita',                  en: 'Other' }            // a card this file does not know yet
];
var NVR_SET_CARDS = [
  { k: 'lists',  g: 'mat', q: '#f-s-materials' },
  { k: 'types',  g: 'cab', q: '.typecfg' },
  { k: 'ops',    g: 'cab', q: '[data-bind="s.ops.hinges"]' },
  { k: 'mach',   g: 'cnc', q: '#f-s-drills' },
  { k: 'rules',  g: 'cnc', q: '[data-act="resetrules"]' },
  { k: 'ball',   g: 'drw', q: '[data-bind^="s.rules.ball."]' },
  { k: 'under',  g: 'drw', q: '[data-bind^="s.rules.under."]' },
  { k: 'merivo', g: 'drw', q: '[data-bind^="s.rules.merivo."]' },
  { k: 'tpl',    g: 'out', q: '#f-tpl' },
  { k: 'admin',  g: 'out', q: '[data-act^="admin"]' }
];
var NVR_SET_PH = { 's.materials': 'LMDP balta 18\nLMDP antracitas 18\nHDF balta 3', 's.edges': 'ABS balta 0.8\nABS antracitas 1', 's.worktops': 'Stalviršis ąžuolas 38' };   // an empty list shows what a line looks like
var NVR_NOTE_LONG = 170;   // a note longer than this is folded to two lines behind "Plačiau"
function nvrSetHtml() {
  var box = document.createElement('div'); box.innerHTML = typeof nvuSetNote === 'function' ? nvuSetNote(viewSet()) : viewSet();
  var grid = box.querySelector('.setgrid'); if (!grid) return box.innerHTML;   // the live page lost its frame: show it as it is
  var cards = [].filter.call(grid.children, function (n) { return n.classList && n.classList.contains('card'); });
  var by = {}, nav = '', col = document.createElement('div'), n = 0;
  NV.rMore = NV.rMore || {};
  cards.forEach(function (cd, idx) {
    var def = NVR_SET_CARDS.filter(function (d) { return cd.querySelector(d.q); })[0] || { k: 'x' + idx, g: 'etc' };
    cd.id = 'nvr-set-' + def.k; cd.classList.remove('wide'); cd.classList.add('nvr-card');
    (by[def.g] = by[def.g] || []).push({ el: cd, def: def, ord: NVR_SET_CARDS.indexOf(def) < 0 ? 99 : NVR_SET_CARDS.indexOf(def) });
    /* the headings and notes carry the old console's inline type sizes and margins: the skin sets them */
    [].forEach.call(cd.querySelectorAll('h3, p.note'), function (x) { x.removeAttribute('style'); });
    [].forEach.call(cd.querySelectorAll('h3'), function (h, j) { h.id = 'nvr-seth-' + def.k + '-' + j; h.classList.add('nvr-h'); });
    [].forEach.call(cd.querySelectorAll('p.note'), function (p) {
      var tx = p.textContent || ''; if (tx.length < NVR_NOTE_LONG || p.querySelector('input,button,select,a')) return;
      var key = def.k + ':' + tx.slice(0, 40), w = document.createElement('div');
      w.className = 'nvr-more' + (NV.rMore[key] ? ' open' : '');
      p.parentNode.insertBefore(w, p); w.appendChild(p);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nvr-more-b'; b.setAttribute('data-nv', 'rmore'); b.setAttribute('data-v', key);
      b.setAttribute('aria-expanded', NV.rMore[key] ? 'true' : 'false'); b.textContent = NV.rMore[key] ? L('Mažiau', 'Less') : L('Plačiau', 'More');
      w.appendChild(b);
    });
    /* the three name lists (materials, edge bands, worktops) stand side by side, each under its own heading */
    if (cd.querySelectorAll(':scope > textarea').length > 1) {
      var lists = document.createElement('div'), cell = null, notes = []; lists.className = 'nvr-lists';
      [].slice.call(cd.children).forEach(function (x) {
        if (x.tagName === 'H3') { cell = document.createElement('div'); lists.appendChild(cell); cell.appendChild(x); }
        else if (x.tagName === 'TEXTAREA' && cell) cell.appendChild(x);
        else notes.push(x);
      });
      cd.appendChild(lists); notes.forEach(function (x) { cd.appendChild(x); });
    }
    [].forEach.call(cd.querySelectorAll('textarea[data-bind]'), function (ta) { var ph = NVR_SET_PH[ta.getAttribute('data-bind')]; if (ph) ta.setAttribute('placeholder', L('pvz.', 'e.g.') + '\n' + ph); });
  });
  NVR_SET_GROUPS.forEach(function (g) {
    var list = (by[g.k] || []).sort(function (a, b) { return a.ord - b.ord; }); if (!list.length) return;
    var sec = document.createElement('section'); sec.className = 'nvr-set-grp'; sec.id = 'nvr-setg-' + g.k;
    sec.innerHTML = '<h2 class="nv-h3 nvr-set-gt">' + esc(L(g.lt, g.en)) + '</h2>';
    nav += '<div class="nvr-nav-g"><span class="nvr-nav-gt">' + esc(L(g.lt, g.en)) + '</span>';
    list.forEach(function (it) {
      [].forEach.call(it.el.querySelectorAll('h3'), function (h) {
        var todo = h.parentNode.querySelector('.badge.warn') && h.parentNode !== it.el;   // "nepatikrinta" beside the heading
        nav += '<button type="button" class="nvr-nav-a" data-nv="rsetgo" data-v="' + h.id + '"' + (n++ ? '' : ' aria-current="true"') + '><span>' + esc(h.textContent.replace(/^€\s*/, '')) + '</span>' +
          (todo ? '<i class="nv-state warn" title="' + esc(t('unverified')) + '"></i>' : '') + '</button>';
      });
      sec.appendChild(it.el);
    });
    nav += '</div>'; col.appendChild(sec);
  });
  var foot = box.querySelector('.setgrid ~ p.note'), back = NV.rBack && NV.rBack !== 'set' ? NV.rBack : 'cab';
  return '<div class="nvr-set">' +
    '<header class="nvr-head nvr-set-head"><div class="nvr-head-t"><h1 class="nv-h1">' + t('setTitle') + '</h1><p class="nv-lead">' + t('setLead') + '</p></div>' +
      '<button type="button" class="nv-btn" data-act="tab" data-v="' + back + '">← ' + L('Grįžti į projektą', 'Back to the project') + '</button></header>' +
    '<div class="nvr-set-body"><nav class="nvr-set-nav" aria-label="' + esc(L('Nustatymų skyriai', 'Settings sections')) + '">' + nav + '</nav>' +
    '<div class="nvr-set-col">' + col.innerHTML + (foot ? '<p class="nvr-set-ver">' + foot.innerHTML + '</p>' : '') + '</div></div></div>';
}
NVSTAGE.set = function () { return nvrSetHtml(); };
NVA.rmore = function (el, v) {   // no redraw: a field of the same card may be in the middle of typing
  NV.rMore = NV.rMore || {}; NV.rMore[v] = !NV.rMore[v];
  var w = el.parentNode; w.classList.toggle('open', !!NV.rMore[v]);
  el.setAttribute('aria-expanded', NV.rMore[v] ? 'true' : 'false'); el.textContent = NV.rMore[v] ? L('Mažiau', 'Less') : L('Plačiau', 'More');
  return false;
};
NVA.rsetgo = function (el, v) {
  var h = document.getElementById(v); if (!h) return false;
  var top = h.closest('.nvr-card') || h, first = top.querySelector('h3') === h;
  try { (first ? top : h).scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { (first ? top : h).scrollIntoView(); }
  nvrSetMark(v); NV.rSpyHold = Date.now() + 900;   // the click decides; the scroll it starts must not move the mark
  return false;
};
function nvrSetMark(id) { [].forEach.call(document.querySelectorAll('.nvr-nav-a'), function (a) { if (a.getAttribute('data-v') === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }
/* the section list follows the page: the last heading that has passed under the top bar is the current one */
function nvrSetSpy() {
  if (S.tab !== 'set' || S.home || (NV.rSpyHold && Date.now() < NV.rSpyHold)) return;
  var hs = document.querySelectorAll('.nvr-set-col .nvr-h'); if (!hs.length) return;
  var cur0 = hs[0].id, lim = 140;
  [].forEach.call(hs, function (h) { if (h.getBoundingClientRect().top < lim) cur0 = h.id; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur0 = hs[hs.length - 1].id;   // the end of the page: the last one
  nvrSetMark(cur0);
}
window.addEventListener('scroll', nvrSetSpy, { passive: true });
NVAFTER.push(function () {
  if (!S.home && S.tab !== 'set') NV.rBack = S.tab;   // where "Grįžti į projektą" leads
  nvrSetSpy();
});
