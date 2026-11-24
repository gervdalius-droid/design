/* =====================================================================
   50-check.js — stage "Patikra" (NVSTAGE.chk): the gate, as a page.

   One big state on top (what stops production / what to look at / ready), then the project and every cabinet
   with its open rows — errors, confirmations, warnings — each with its one-click action and "Taisyti →".
   Cabinets with nothing open fold into one green line. Workshop notes (info) sit closed at the bottom.

   Shared with 60-make.js:  nvkAll()   every issue + the two confirmations when the check engine has not given them
                            nvkPl()    Lithuanian plural forms
   ===================================================================== */
NV.kFilter = 'all';   // filter chips of the check page: all | block | warn
NV.kOpen = {};        // <details> of the page the person opened (kept over re-renders)

/* 1 dalykas · 2 dalykai · 10 dalykų */
function nvkPl(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && (b < 10 || b >= 20) ? few : many; }
function nvkN(n, lt, en) { return n + ' ' + (S.lang === 'en' ? (n === 1 ? en[0] : en[1]) : nvkPl(n, lt[0], lt[1], lt[2])); }
var NVK_W = {   // the words of the counts
  error: [['klaida', 'klaidos', 'klaidų'], ['error', 'errors']],
  todo:  [['patvirtinimas', 'patvirtinimai', 'patvirtinimų'], ['confirmation', 'confirmations']],
  warn:  [['įspėjimas', 'įspėjimai', 'įspėjimų'], ['warning', 'warnings']],
  info:  [['pastaba', 'pastabos', 'pastabų'], ['note', 'notes']]
};
function nvkCnt(sev, n) { return nvkN(n, NVK_W[sev][0], NVK_W[sev][1]); }

/* the two confirmations of a cabinet (joints, edge banding) are issues `confirm.joints` / `confirm.edges`;
   when the check engine does not report one that is open, it is added here — never twice */
var NVK_CONF = [
  { k: 'joints', cmd: 'jcroom', same: /^(jcopen|jcroom)$/, need: function (c, r) { return jcNeeded(c, r); },
    msg: function () { return L('Sujungimai dar nepatvirtinti', 'The joints are not confirmed yet'); },
    hint: function () { return L('Peržiūrėkite, kur gręžiami konfirmatai, ekscentrikai ir kaiščiai, ir patvirtinkite.', 'Look where the confirmats, cams and dowels are drilled, then confirm.'); } },
  { k: 'edges', cmd: 'ecroom', same: /^(ecopen|ecroom)$/, need: function (c, r) { return ecNeeded(c, r); },
    msg: function () { return L('Kraštų laminavimas dar nepatvirtintas', 'The edge banding is not confirmed yet'); },
    hint: function () { return L('Peržiūrėkite, kurie detalių kraštai laminuojami, ir patvirtinkite.', 'Look which edges of the parts are banded, then confirm.'); } }
];
function nvkConfLabel() { return L('Peržiūrėti ir patvirtinti', 'Review and confirm'); }
function nvkAll() {
  var src = nvIssues();
  if (NV.kAll && NV.kAll.src === src && NV.kAll.lang === S.lang) return NV.kAll.list;
  var list = src.slice(), cabs = S.proj ? S.proj.cabinets : [], info = S._info || [];
  cabs.forEach(function (c, i) {
    var r = info[i] && info[i].r; if (!r) return;
    NVK_CONF.forEach(function (d) {
      var has = list.some(function (x) { return x.cab === i && (x.id === 'confirm.' + d.k || (x.act && d.same.test(String(x.act.act || '')))); });
      var need = false; try { need = d.need(c, r); } catch (e) {}
      if (!need || has) return;
      list.push({ id: 'confirm.' + d.k, sev: 'todo', cab: i, topic: 'review', field: null, msg: d.msg(), hint: d.hint(), act: { label: nvkConfLabel(), act: d.cmd, i: i } });
    });
  });
  NV.kAll = { src: src, lang: S.lang, list: list };
  return list;
}
/* the modal of a confirmation opens for the cabinet of its row (the live jcopen / ecopen mean "the open cabinet") */
function nvkAct(x) {
  var a = x.act;
  if (!a && x.cab >= 0 && (x.id === 'confirm.joints' || x.id === 'confirm.edges')) a = { label: nvkConfLabel(), act: x.id === 'confirm.joints' ? 'jcroom' : 'ecroom', i: x.cab };
  if (a && x.cab >= 0 && (a.act === 'jcopen' || a.act === 'ecopen')) a = { label: a.label, act: a.act === 'jcopen' ? 'jcroom' : 'ecroom', i: x.cab };
  return a || null;
}

/* ----------------------------------------------------------------- pieces */
var NVK_ORDER = { error: 0, todo: 1, warn: 2, info: 3 };
function nvkSort(list) { return list.map(function (x, k) { return [x, k]; }).sort(function (a, b) { return (NVK_ORDER[a[0].sev] - NVK_ORDER[b[0].sev]) || (a[1] - b[1]); }).map(function (p) { return p[0]; }); }
function nvkMark(sev) { return '<span class="nvk-mark ' + sev + '" aria-hidden="true">' + ({ error: '✕', todo: '', warn: '!', info: 'i', ok: '✓' })[sev] + '</span>'; }
function nvkSevWord(sev) { return ({ error: L('Klaida', 'Error'), todo: L('Patvirtinti', 'To confirm'), warn: L('Įspėjimas', 'Warning'), info: L('Pastaba', 'Note') })[sev] || ''; }
function nvkCabName(i) { var c = S.proj.cabinets[i]; return c ? (i + 1) + ' · ' + (c.name || typeName(c)) : ''; }
/* where "Taisyti →" lands: the field in the cabinet workspace, or the stage the issue names */
function nvkGoAttrs(x) {
  var tab = x.tab || (x.cab >= 0 ? 'cab' : x.field === 'projname' ? '' : 'cab');   // the project name is in the top bar of every stage
  var a = ' data-nv="go"' + (tab ? ' data-tab="' + esc(tab) + '"' : '');
  if (x.cab >= 0) a += ' data-sel="' + x.cab + '"';
  if (x.topic) a += ' data-topic="' + esc(x.topic) + '"';
  if (x.field) a += ' data-field="' + esc(x.field) + '"';
  if (x.sec != null) a += ' data-sec="' + (+x.sec) + '"';
  if (x.col != null) a += ' data-col="' + (+x.col) + '"';
  return a;
}
function nvkActBtn(x, cls) {
  var a = nvkAct(x); if (!a || !(a.act || a.nv)) return '';
  return '<button type="button" class="nv-btn sm' + (cls ? ' ' + cls : '') + '" ' + (a.nv ? 'data-nv="' + esc(a.nv) + '"' : 'data-act="' + esc(a.act) + '"') +
    (a.v != null ? ' data-v="' + esc(a.v) + '"' : '') + (a.i != null ? ' data-i="' + esc(a.i) + '"' : '') + (x.cab >= 0 ? ' data-nvk-cab="' + x.cab + '"' : '') + '>' + esc(a.label || L('Sutvarkyti', 'Fix')) + '</button>';
}
function nvkRow(x, withCab) {
  var act = nvkActBtn(x, x.sev === 'todo' ? 'pri' : ''), hasPlace = x.cab >= 0 || x.tab || x.field;
  var fix = x.sev === 'todo' && act ? '' : hasPlace ? '<button type="button" class="nv-btn sm ghost nvk-fix"' + nvkGoAttrs(x) + '>' + (x.sev === 'error' || x.topic || x.field || x.tab ? L('Taisyti', 'Fix') : L('Atidaryti', 'Open')) + ' →</button>' : '';
  return '<div class="nv-issue ' + x.sev + ' nvk-row" data-sev="' + x.sev + '" data-id="' + esc(x.id || '') + '">' + nvkMark(x.sev) +
    '<div class="nvk-tx"><div class="nvk-msg"><span class="nvk-sr">' + nvkSevWord(x.sev) + ': </span>' + (withCab && x.cab >= 0 ? '<b class="nvk-cabn">' + esc(nvkCabName(x.cab)) + '</b> ' : '') + esc(x.msg) + '</div>' +
    (x.hint ? '<div class="nv-hint">' + esc(x.hint) + '</div>' : '') + '</div>' +
    (act || fix ? '<div class="nvk-acts">' + act + fix + '</div>' : '') + '</div>';
}
function nvkBadges(n, withInfo) {
  return (n.error ? '<span class="nv-badge error">' + nvkCnt('error', n.error) + '</span>' : '') +
    (n.todo ? '<span class="nv-badge todo">' + nvkCnt('todo', n.todo) + '</span>' : '') +
    (n.warn ? '<span class="nv-badge warn">' + nvkCnt('warn', n.warn) + '</span>' : '') +
    (withInfo && n.info ? '<span class="nv-badge">' + nvkCnt('info', n.info) + '</span>' : '');
}
/* a small front picture of the cabinet, from its real parts (as on the layout stage); a plain outline when there is none */
function nvkPic(c, inf) {
  var svg = '';
  try {
    if (c.kind !== 'panel' && inf && inf.r && inf.r.panels && inf.r.panels.length && typeof frontArtOf === 'function' && window.DBFront)
      svg = frontArtOf(c, inf.r, c.dishwasher ? { noHit: true, over: [], legs: false, legH: 0 } : { noHit: true, over: [] }).svg || '';
  } catch (e) { svg = ''; }
  if (!svg) { var w = Math.max(1, num(c.W) || 600), h = Math.max(1, num(c.H) || 720), k = 40 / Math.max(w, h);
    svg = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="' + (24 - w * k / 2) + '" y="' + (24 - h * k / 2) + '" width="' + (w * k) + '" height="' + (h * k) + '" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'; }
  return '<span class="nvk-pic" aria-hidden="true">' + svg + '</span>';
}
function nvkSize(c) { return c.kind === 'panel' ? '' : [c.W, c.H, c.D].map(function (v) { return esc(fmt(num(v))); }).join(' × ') + ' mm'; }
function nvkDetails(key, cls, summary, body) {
  return '<details class="' + cls + '" data-nvk-key="' + esc(key) + '"' + (NV.kOpen[key] ? ' open' : '') + '><summary>' + summary + '</summary>' + body + '</details>';
}
function nvkNote(x, withCab) {
  return '<li>' + (withCab && x.cab >= 0 ? '<b>' + esc(nvkCabName(x.cab)) + '</b> — ' : '') + esc(x.msg) + (x.hint ? ' <span class="nv-muted">' + esc(x.hint) + '</span>' : '') + '</li>';
}

/* ----------------------------------------------------------------- the page */
function nvkHead(n, nCab) {
  var st = n.block ? 'blocked' : n.warn ? 'warn' : 'ok', big, lead;
  if (!nCab) { st = 'none'; big = L('Projekte dar nėra spintelių', 'No cabinets in this project yet'); lead = L('Pridėkite pirmą spintelę — tada bus ką tikrinti ir gaminti.', 'Add the first cabinet — then there is something to check and make.'); }
  else if (n.block) {
    big = S.lang === 'en' ? n.block + (n.block === 1 ? ' thing stops' : ' things stop') + ' production' : n.block + ' ' + nvkPl(n.block, 'dalykas stabdo', 'dalykai stabdo', 'dalykų stabdo') + ' gamybą';
    lead = n.error ? L('Sutvarkykite ' + (n.error === 1 ? 'klaidą' : 'klaidas') + (n.todo ? ' ir patvirtinkite, kas dar nepatvirtinta' : '') + ' — tada atsirakins failai staklėms.', 'Fix the ' + (n.error === 1 ? 'error' : 'errors') + (n.todo ? ' and confirm what is still open' : '') + ' — then the files for the machine unlock.')
      : L('Klaidų nėra. Liko peržiūrėti ir patvirtinti — tada atsirakins failai staklėms.', 'No errors. Review and confirm what is left — then the files for the machine unlock.');
  } else if (n.warn) {
    big = S.lang === 'en' ? 'Ready to make — review ' + n.warn + (n.warn === 1 ? ' warning' : ' warnings') : 'Galima gaminti — peržiūrėkite ' + n.warn + ' ' + nvkPl(n.warn, 'įspėjimą', 'įspėjimus', 'įspėjimų');
    lead = L('Niekas nestabdo. Prieš atsisiunčiant failus reikės pažymėti, kad įspėjimus peržiūrėjote.', 'Nothing blocks. Before downloading you will tick that you have reviewed the warnings.');
  } else { big = L('Paruošta gamybai ✓', 'Ready for production ✓'); lead = L('Klaidų ir įspėjimų nėra — galima atsisiųsti failus staklėms.', 'No errors and no warnings — the files for the machine can be downloaded.'); }
  var badges = nCab ? nvkBadges(n, true) + (!n.block && !n.warn ? '<span class="nv-badge ok">' + nvkN(nCab, ['spintelė', 'spintelės', 'spintelių'], ['cabinet', 'cabinets']) + ' ✓</span>' : '')
    : nvkBadges(n) + '<button type="button" class="nv-btn pri" data-nv="go" data-tab="cab">' + t('newCab') + '</button>';
  return '<section class="nv-card nvk-head st-' + st + '" id="nvk-head" data-state="' + st + '"><span class="nvk-ico" aria-hidden="true">' + (st === 'blocked' ? '✕' : st === 'warn' ? '!' : st === 'none' ? '0' : '✓') + '</span>' +
    '<div class="nvk-ht"><h1 class="nv-h1">' + big + '</h1><p class="nv-lead">' + lead + '</p></div>' + (badges ? '<div class="nvk-hb">' + badges + '</div>' : '') + '</section>';
}
function nvkChips(n) {
  var chip = function (k, lab, cnt, cls) { return '<button type="button" class="nvk-chip' + (NV.kFilter === k ? ' on' : '') + '" data-nv="kfilter" data-v="' + k + '" aria-pressed="' + (NV.kFilter === k) + '">' + lab + (cnt != null ? ' <i class="' + (cnt ? cls : '') + '">' + cnt + '</i>' : '') + '</button>'; };
  return '<div class="nvk-filter" role="group" aria-label="' + esc(L('Rodyti', 'Show')) + '">' + chip('all', L('Visi', 'All'), null) + chip('block', L('Stabdo', 'Blocking'), n.block, 'bad') + chip('warn', L('Įspėjimai', 'Warnings'), n.warn, 'warn') + '</div>';
}
function nvkShown(x) { return x.sev !== 'info' && (NV.kFilter === 'all' || (NV.kFilter === 'block' ? x.sev === 'error' || x.sev === 'todo' : x.sev === 'warn')); }
function nvkGroup(i, list, info) {
  var c = i >= 0 ? S.proj.cabinets[i] : null, open = list.filter(function (x) { return x.sev !== 'info'; }), notes = list.filter(function (x) { return x.sev === 'info'; });
  var name = c ? esc(nvkCabName(i)) : L('Projektas', 'Project') + (S.proj.name ? ' · ' + esc(S.proj.name) : '');
  if (!open.length) {   // nothing open: one quiet line (its notes inside)
    if (NV.kFilter !== 'all') return '';
    var line = nvkMark('ok') + '<span><b>' + name + '</b> — ' + (c ? L('paruošta', 'ready') : L('tvarkoje', 'in order')) + '</span>';
    if (!notes.length) return '<div class="nvk-ok" data-cab="' + i + '">' + line + '</div>';
    return nvkDetails('ok' + i, 'nvk-ok', line + '<span class="nv-muted nvk-okn">' + nvkCnt('info', notes.length) + '</span>', '<ul class="nvk-notelist">' + notes.map(function (x) { return nvkNote(x); }).join('') + '</ul>');
  }
  var rows = nvkSort(open).filter(nvkShown); if (!rows.length) return '';
  var head = c
    ? nvkPic(c, info[i]) + '<div class="nvk-gt"><b>' + name + '</b><span class="nv-muted nv-num">' + [nvkSize(c), esc(typeName(c))].filter(Boolean).join(' · ') + '</span></div>'
    : '<span class="nvk-pic nvk-pic-p" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 12h10l4 5h14v19H10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span><div class="nvk-gt"><b>' + name + '</b><span class="nv-muted">' + L('Visam projektui', 'For the whole project') + '</span></div>';
  return '<section class="nv-card nvk-grp" data-cab="' + i + '"><header class="nvk-gh">' + head + '<span class="nvk-gb">' + nvkBadges(nvCounts(open)) + '</span>' +
    (c ? '<button type="button" class="nv-btn sm ghost" data-nv="go" data-tab="cab" data-sel="' + i + '">' + L('Atidaryti spintelę', 'Open the cabinet') + ' →</button>' : '') + '</header>' +
    rows.map(function (x) { return nvkRow(x); }).join('') + '</section>';
}
NVSTAGE.chk = function (info) {
  var all = nvkAll(), n = nvCounts(all), cabs = S.proj.cabinets, by = {};
  all.forEach(function (x) { var k = x.cab >= 0 && cabs[x.cab] ? x.cab : -1; (by[k] = by[k] || []).push(x); });
  var h = '<div class="nvk">' + nvkHead(n, cabs.length);
  if (!cabs.length && !n.block && !n.warn) return h + '</div>';   // nothing to check yet: the head says so and leads to the first cabinet
  h += nvkChips(n);
  var groups = (by[-1] || NV.kFilter === 'all' ? nvkGroup(-1, by[-1] || [], info) : '') + cabs.map(function (c, i) { return nvkGroup(i, by[i] || [], info); }).join('');
  if (!groups) groups = '<div class="nv-empty nvk-none">' + (NV.kFilter === 'block' ? L('Niekas nestabdo ✓', 'Nothing blocks ✓') : L('Įspėjimų nėra ✓', 'No warnings ✓')) + '</div>';
  h += '<div class="nvk-groups">' + groups + '</div>';
  var notes = all.filter(function (x) { return x.sev === 'info'; });
  if (notes.length && NV.kFilter === 'all')
    h += nvkDetails('notes', 'nv-card nvk-notes', '<b>' + L('Pastabos dirbtuvėms', 'Workshop notes') + '</b><span class="nv-badge">' + notes.length + '</span><span class="nv-muted">' + L('daroma rankomis ar tik žinotina — gamybos nestabdo', 'done by hand or just good to know — they do not stop production') + '</span>',
      '<ul class="nvk-notelist">' + notes.map(function (x) { return nvkNote(x, true); }).join('') + '</ul>');
  var why = !cabs.length ? L('Dar nėra spintelių', 'No cabinets yet') : n.block ? L('Dar stabdo: ', 'Still blocking: ') + [n.error ? nvkCnt('error', n.error) : '', n.todo ? nvkCnt('todo', n.todo) : ''].filter(Boolean).join(', ') : '';
  h += '<footer class="nvk-foot"><button type="button" class="nv-btn ghost" data-act="tab" data-v="cab">← ' + L('Į spinteles', 'To the cabinets') + '</button><span class="nv-grow"></span>' +
    (why ? '<span class="nvk-why" id="nvk-why">' + why + '</span>' : n.warn ? '<span class="nvk-why ok">' + L('Įspėjimus patvirtinsite prieš atsisiųsdami', 'You confirm the warnings before downloading') + '</span>' : '') +
    '<button type="button" class="nv-btn pri lg" id="nvk-next" data-act="tab" data-v="res"' + (why ? ' disabled aria-describedby="nvk-why"' : '') + '>' + L('Toliau: Gamyba', 'Next: Production') + ' →</button></footer>';
  return h + '</div>';
};
NVA.kfilter = function (el, v) { NV.kFilter = v === 'block' || v === 'warn' ? v : 'all'; };

/* a one-click action of a row acts on that row's cabinet: make it the open one before the command runs */
app.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('[data-nvk-cab]') : null; if (!b || !S.proj) return;
  var i = +b.getAttribute('data-nvk-cab');
  if (S.proj.cabinets[i] && S.sel !== i) { S.sel = i; S.colSel = 0; NV.secSel = null; }
}, true);
/* remember which folded lists were opened (toggle does not bubble — caught on the way down) */
app.addEventListener('toggle', function (e) {
  var k = e.target && e.target.getAttribute && e.target.getAttribute('data-nvk-key'); if (k) NV.kOpen[k] = !!e.target.open;
}, true);
