/* =====================================================================
   00-core.js — the new interface, part 1: state, shell, navigation, live refresh, undo, issue plumbing.

   Everything in src/ui/ is placed INSIDE the live app's closure (see build.py), just before its boot line, so it
   sees every function and variable of src/lib/app.js: S (state), t(), esc(), cur(), fmt(), num(), buildOne(),
   save(), toast(), the legacy view functions, the data-act commands and the data-bind engine. Functions declared
   here with a live function's name REPLACE it (render, refreshLive, save).

   Contract for the other src/ui files (docs/ARCHITECTURE.md has the long version):
     NVSTAGE.<tab> = function (info) → html      one per S.tab: cab, room, chk, res, nest, drw, set; NVSTAGE.home
     NVA.<name>    = function (el, v, i, ev)     click command for [data-nv="<name>"] (data-v string, data-i number);
                                                 return false = handled, no full render
     NVC.<name>    = function (el, ev)           change command for [data-nv-change="<name>"]
     NVLIVE.<key>  = function (c, inf, arg, el)  → html of every [data-live="<key>"] element, repainted while typing
     NVAFTER.push(function () { … })             runs after every full render (mount widgets, measure, …)
     nvTopic({ key, order, icon, label, applies, body })   a topic of the cabinet workspace (30-editor.js draws the frame)
     nvIssues() / nvIssuesFor(i) / nvCounts(list)  the structured issue list (10-checks.js computes it)
     nvGo({ tab, sel, topic, sec, field })       jump to a place and flash the field
     L(lt, en)                                    text of the new interface in the current language
   ===================================================================== */
var NV = {
  topic: 'size',     // open topic of the cabinet workspace (30-editor.js)
  secSel: null,      // selected section (index in c.sections) or null
  view: '3d',        // picture shown in the cabinet workspace: '3d' (the main one) | 'front'
  flash: null,       // id of the element to scroll to and flash after the next render
  issues: null,      // cache of nvComputeIssues() for the current build
  hist: { id: null, past: [], future: [], last: null, at: 0, mute: false }
};
var NVA = {}, NVC = {}, NVLIVE = {}, NVSTAGE = {}, NVAFTER = [];
/* topics of the cabinet workspace, shown in `order`. A file adds its own with nvTopic({ key, order, icon, label:function(){},
   applies:function(c){} (optional), body:function(c, inf){ return html } }). */
var NVTOPICS = [];
function nvTopic(def) { NVTOPICS = NVTOPICS.filter(function (x) { return x.key !== def.key; }); NVTOPICS.push(def); NVTOPICS.sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
function nvTopicsFor(c) { return NVTOPICS.filter(function (x) { return !x.applies || x.applies(c); }); }
function L(lt, en) { return S.lang === 'en' && en != null ? en : lt; }

/* ----------------------------------------------------------------- issues (computed in 10-checks.js) */
function nvIssues() {
  if (!NV.issues) { try { NV.issues = nvAckApply(nvComputeIssues(S.proj, S._info || []) || []); } catch (e) { if (window.console) console.error(e); NV.issues = []; } }
  return NV.issues;
}
/* "I confirm — it stays like this": a warning about a deliberate choice (a 691 mm door) can be confirmed on its cabinet.
   The confirmation is kept in the cabinet (c.nvAck[key] = the numbers of the message), so it holds only while the
   warned values stay the same; a confirmed warning becomes a note and no longer asks at export. Errors cannot be confirmed. */
function nvAckKey(x) { return x.id + '|' + (x.sec != null ? x.sec : '') + '|' + (x.col != null ? x.col : ''); }
function nvAckSig(x) { return String(x.raw || x.msg || '').replace(/[^0-9.,]+/g, ' ').trim() || '-'; }
function nvAckApply(list) {
  list.forEach(function (x) {
    if (x.sev !== 'warn' || !(x.cab >= 0)) return;
    var c = S.proj.cabinets[x.cab]; if (!c) return;
    var key = nvAckKey(x);
    if (c.nvAck && c.nvAck[key] === nvAckSig(x)) { x.sev = 'info'; x.acked = true; x.msg = L('Patvirtinta: ', 'Confirmed: ') + x.msg; x.act = { label: L('Atšaukti patvirtinimą', 'Withdraw'), nv: 'unack', v: key, i: x.cab }; }
    else if (!x.act) x.act = { label: L('Patvirtinu — taip ir turi būti', 'I confirm — keep it'), nv: 'ack', v: key, i: x.cab };
  });
  return list;
}
function nvIssuesFor(i) { return nvIssues().filter(function (x) { return x.cab === i; }); }
/* { error, todo, warn, info, block } — block = what stops production: errors and open confirmations */
function nvCounts(list) {
  var n = { error: 0, todo: 0, warn: 0, info: 0, block: 0 };
  (list || nvIssues()).forEach(function (x) { if (n[x.sev] != null) n[x.sev]++; });
  n.block = n.error + n.todo; return n;
}
function nvWorst(list) { var n = nvCounts(list); return n.error ? 'error' : n.todo ? 'todo' : n.warn ? 'warn' : 'ok'; }

/* ----------------------------------------------------------------- undo / redo over the whole project
   Every save() notes the project as text; quick bursts (typing) fold into one step. The material look
   (texture photos) and the time stamp are left out: they are large / not an edit. */
function nvSnap() { var p = S.proj; return JSON.stringify(p, function (k, v) { return this === p && (k === 'look' || k === 'updated') ? undefined : v; }); }
function nvHistBase() { var H = NV.hist; if (S.proj && H.id !== S.proj.id) { H.id = S.proj.id; H.past = []; H.future = []; H.last = nvSnap(); H.at = 0; } }
function nvHistNote() {
  var H = NV.hist; if (H.mute || !S.proj) return;
  if (H.id !== S.proj.id) { nvHistBase(); return; }
  var s = nvSnap(); if (s === H.last) return;
  var now = Date.now();
  if (now - H.at > 450 || !H.past.length) { H.past.push(H.last); if (H.past.length > 100) H.past.shift(); }
  H.last = s; H.at = now; H.future = [];
}
function nvRestore(s) {
  var H = NV.hist, look = S.proj.look, p = JSON.parse(s);
  if (look !== undefined) p.look = look;
  p.cabinets = (p.cabinets || []).map(normCab); S.proj = p;
  S.sel = Math.max(0, Math.min(S.sel, p.cabinets.length - 1)); S.confirm = null; S.jcheck = false; S.echeck = false; NV.secSel = null;
  if (typeof roomSelSync === 'function') roomSelSync();
  H.mute = true; save(); H.mute = false; H.last = nvSnap(); H.at = 0;
  render();
}
function nvUndo() { var H = NV.hist; if (!H.past.length) return false; H.future.push(H.last); nvRestore(H.past.pop()); toast(L('Atšaukta', 'Undone')); return true; }
function nvRedo() { var H = NV.hist; if (!H.future.length) return false; H.past.push(H.last); nvRestore(H.future.pop()); toast(L('Grąžinta', 'Redone')); return true; }

/* the live save(), plus the undo note */
function save() {
  if (!S.proj) return;
  if (S.ro) { S.roDirty = true; return; }   // view only / not yet confirmed that nobody else edits it (locks.js)
  VER.touched();
  clearTimeout(clibTimer); clibTimer = setTimeout(clibSync, 300);
  if (S.tab !== 'room' && S.roomUndo && S.roomUndo.length) S.roomUndo = [];
  S.proj.updated = new Date().toISOString();
  nvHistNote();
  if (store('dbKurejas.current', S.proj) === false) { saveFailed(); return; }
  clearTimeout(libTimer); libTimer = setTimeout(libSave, 250);
  var sv = document.getElementById('saved'); if (sv) { sv.classList.remove('flash'); void sv.offsetWidth; sv.classList.add('flash'); }
}

/* ----------------------------------------------------------------- navigation */
var NV_STAGES = [   // the road of a project, left to right; res / nest / drw are the three pages of "Gamyba"
  { k: 'cab',  lt: 'Spintelės',   en: 'Cabinets' },
  { k: 'room', lt: 'Išdėstymas',  en: 'Layout' },
  { k: 'chk',  lt: 'Patikra',     en: 'Check' },
  { k: 'res',  lt: 'Gamyba',      en: 'Production' }
];
function nvStageOf(tab) { return tab === 'nest' || tab === 'drw' ? 'res' : tab; }
function nvGo(o) {
  o = o || {};
  if (!S.proj) return;
  S.home = false;
  if (o.tab) S.tab = o.tab;
  if (o.sel != null && S.proj.cabinets[o.sel]) { if (S.sel !== o.sel) { S.colSel = 0; NV.secSel = null; } S.sel = o.sel; S.picking = false; }
  if (o.topic) NV.topic = o.topic;
  if (o.sec !== undefined) NV.secSel = o.sec;
  if (o.col != null) S.colSel = o.col;
  NV.flash = o.field || null;
  S.jcheck = false; S.echeck = false;
  render();
  if (!o.field) window.scrollTo(0, 0);
}
function nvFlash() {
  var id = NV.flash; NV.flash = null; if (!id) return;
  var el = document.getElementById(id); if (!el) return;
  try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
  var box = el.closest ? (el.closest('.f, .nv-field, .chk') || el) : el;
  box.classList.add('nv-flash'); setTimeout(function () { box.classList.remove('nv-flash'); }, 1800);
  if (el.focus && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) { try { el.focus({ preventScroll: true }); if (el.select && el.type === 'text') el.select(); } catch (e2) {} }
}

/* ----------------------------------------------------------------- the shell */
function nvStatusHtml() {
  var n = nvCounts(), cls = n.error ? 'bad' : n.todo ? 'todo' : n.warn ? 'warn' : 'ok';
  var txt = n.error ? n.error + ' ' + L(n.error === 1 ? 'klaida' : 'klaidos', n.error === 1 ? 'error' : 'errors')
    : n.todo ? n.todo + ' ' + L('patvirtinti', 'to confirm')
    : n.warn ? n.warn + ' ' + L(n.warn === 1 ? 'įspėjimas' : 'įspėjimai', n.warn === 1 ? 'warning' : 'warnings')
    : L('Viskas tvarkoje', 'All good');
  var extra = n.error && n.todo ? ' · ' + n.todo + ' ' + L('patvirtinti', 'to confirm') : '';
  return '<span class="nv-st-dot ' + cls + '"></span><span>' + txt + extra + '</span>';
}
NVLIVE.status = function () { return nvStatusHtml(); };
function nvStageBadge(k) {
  if (k === 'cab') return '<i class="nv-sb">' + S.proj.cabinets.length + '</i>';
  if (k === 'chk') { var n = nvCounts(); return n.block ? '<i class="nv-sb bad">' + n.block + '</i>' : n.warn ? '<i class="nv-sb warn">' + n.warn + '</i>' : S.proj.cabinets.length ? '<i class="nv-sb ok">✓</i>' : ''; }
  if (k === 'res') { var pc = 0; try { pc = partCount(S._info || []); } catch (e) {} return pc ? '<i class="nv-sb">' + pc + '</i>' : ''; }
  return '';
}
NVLIVE.stagebadge = function (c, inf, arg) { return nvStageBadge(arg); };
function nvHeader() {
  var H = NV.hist, st = nvStageOf(S.tab);
  return '<header class="nv-top"><div class="nv-top-in">' +
    '<button type="button" class="nv-brand" data-act="home" title="' + esc(L('Visi projektai', 'All projects')) + '"><span class="logo"><span class="dbl" role="img" aria-label="Dėdės Baldai"></span></span><span class="nv-brand-t">' + L('Projektai', 'Projects') + '</span></button>' +
    '<label class="nv-proj" title="' + esc(L('Projekto pavadinimas — juo vadinamos CNC programos ir failai', 'Project name — the CNC programs and files are named after it')) + '">' +
      '<input id="projname" type="text" data-bind="p.name" value="' + esc(S.proj.name) + '" placeholder="' + esc(t('projPh')) + '" autocomplete="off" spellcheck="false"' + (S.proj.name ? '' : ' aria-invalid="true"') + '>' +
      '<span class="saved" id="saved" title="' + esc(t('autosaveT')) + '">✓ ' + t('autosaved') + '</span></label>' +
    '<nav class="nv-stages" aria-label="' + esc(L('Projekto eiga', 'Project steps')) + '">' + NV_STAGES.map(function (s, i) {
      return (i ? '<span class="nv-stage-sep" aria-hidden="true"></span>' : '') + '<button type="button" data-act="tab" data-v="' + s.k + '" class="nv-stage' + (st === s.k ? ' on' : '') + '"' + (st === s.k ? ' aria-current="step"' : '') + '><span class="nv-stage-n">' + (i + 1) + '</span><span class="nv-stage-l">' + L(s.lt, s.en) + '</span><span data-live="stagebadge" data-live-arg="' + s.k + '">' + nvStageBadge(s.k) + '</span></button>';
    }).join('') + '</nav>' +
    '<div class="nv-tools">' +
      '<button type="button" class="nv-status" data-act="tab" data-v="chk" data-live="status" title="' + esc(L('Atidaryti patikrą', 'Open the check')) + '">' + nvStatusHtml() + '</button>' +
      '<span class="nv-ur"><button type="button" class="nv-ic" data-nv="undo"' + (H.past.length ? '' : ' disabled') + ' title="' + esc(L('Atšaukti (Ctrl+Z)', 'Undo (Ctrl+Z)')) + '" aria-label="' + esc(L('Atšaukti', 'Undo')) + '">↶</button>' +
      '<button type="button" class="nv-ic" data-nv="redo"' + (H.future.length ? '' : ' disabled') + ' title="' + esc(L('Grąžinti (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)')) + '" aria-label="' + esc(L('Grąžinti', 'Redo')) + '">↷</button></span>' +
      '<button type="button" class="nv-ic" data-act="pver" title="' + esc(t('verT')) + '" aria-label="' + esc(t('verT')) + '">🕘</button>' +
      '<button type="button" class="nv-ic' + (S.tab === 'set' ? ' on' : '') + '" data-act="tab" data-v="set" title="' + esc(t('tSet')) + '" aria-label="' + esc(t('tSet')) + '">⚙</button>' +
      (S.admin ? '<button type="button" class="nv-ic nv-admin" data-act="tab" data-v="set" title="' + esc(L('Administratoriaus režimas — kainos matomos', 'Admin mode — prices shown')) + '">€</button>' : '') +
      langBtns() +
    '</div></div></header>';
}
function nvHomeShell() {
  return '<header class="nv-top nv-top-home"><div class="nv-top-in"><span class="nv-brand"><span class="logo"><span class="dbl" role="img" aria-label="Dėdės Baldai"></span></span><span class="nv-brand-t">' + t('app') + '</span></span><span class="nv-grow"></span><div class="nv-tools">' + langBtns() + '</div></div></header>' +
    '<main class="nv-main nv-home">' + (NVSTAGE.home ? NVSTAGE.home() : viewHome()) + '</main>';
}

/* the live render(), with the new shell around the stage views */
function render() {
  if (typeof ptr !== 'undefined' && ptr) ptr.pending = null;   // this redraw is the one that was waiting
  if (!S.proj) S.home = true;
  var ae = document.activeElement, fx = ae && ae.id, ss = null; try { ss = fx ? ae.selectionStart : null; } catch (e0) {}
  NV.issues = null;
  document.documentElement.lang = S.lang;
  if (S.home) {
    app.className = 'nv-app';
    app.innerHTML = nvHomeShell();
    if (S.focusNew) { S.focusNew = false; var nf = document.getElementById('np-name'); if (nf) { nf.focus(); nf.select(); } }
    else nvRefocus(fx, ss);
    nvRunAfter();
    return;
  }
  if (!(S.sel >= 0 && S.sel < S.proj.cabinets.length)) S.sel = Math.max(0, S.proj.cabinets.length - 1);
  if (!NVSTAGE[S.tab]) S.tab = 'cab';
  if (S.jcheck) { S.jcheck = false; if (typeof nvjHas === 'function' && nvjHas(cur())) { S.tab = 'cab'; S.picking = false; NV.topic = 'joints'; NV.secSel = null; } }   // joints have one place: the topic "Jungtys" (49-joints.js)
  nvHistBase();
  if (window.DBLook) window.DBLook.set(S.proj.look);
  S.proj.cabinets.forEach(function (c) {   // cutouts drawn in an earlier builder2 (c.nvCuts) → the live app's part operations (c.sketch)
    if (!c.nvCuts) return; c.sketch = c.sketch || {};
    Object.keys(c.nvCuts).forEach(function (k) { (c.nvCuts[k] || []).forEach(function (q, i) {
      var id = Date.now() % 1e9 + i + Math.floor(Math.random() * 1e6), dr = q.k === 'circ' && E.R.drills.top.indexOf(+q.d) >= 0;
      (c.sketch[k] = c.sketch[k] || []).push(q.k === 'circ' ? { id: id, t: 'circle', x: q.x, y: q.y, r: q.d / 2, op: dr ? 'drill' : 'in', face: 'A', through: true } : { id: id, t: 'rect', x: q.x, y: q.y, w: q.w, h: q.h, op: 'in', face: 'A', through: true }); }); });
    delete c.nvCuts; });
  var cabInfo = S.proj.cabinets.map(function (c, i) { return buildOne(i); });
  cabInfo.forEach(function (inf, i) {   // a plinth fitted by its gaps: its row's length and height as the cabinet makes them
    var pl = inf && inf.r && inf.r.visual && inf.r.visual.plinth, c = S.proj.cabinets[i], k = pl && pl.fit ? plinthIdx(c) : -1; if (k < 0) return;
    var x = c.extras[k], Lp = Math.round((pl.x1 - pl.x0) * 10) / 10, Hp = Math.round((pl.z1 - pl.z0) * 10) / 10; if (Math.abs(+x.L - Lp) > 0.05 || Math.abs(+x.W - Hp) > 0.05) { x.L = Lp; x.W = Hp; } });
  try { localStorage.setItem('dbKurejas.ui', JSON.stringify({ id: S.proj.id, tab: S.tab, sel: S.sel })); } catch (er) {}
  S._info = cabInfo;
  var stage = NVSTAGE[S.tab], body;
  try { body = stage(cabInfo); } catch (e1) { if (window.console) console.error(e1); body = '<div class="nv-card nv-crash"><b>' + L('Šio lango parodyti nepavyko', 'This view could not be shown') + '</b><pre>' + esc(String(e1 && e1.stack || e1)) + '</pre></div>'; }
  if (S.sk && !S.proj.cabinets[S.sk.cab]) S.sk = null;
  var modal = S.sk ? skModal() : S.jcheck && cur() && cabInfo[S.sel] ? jcModal(cur(), cabInfo[S.sel]) : S.echeck && cur() && cabInfo[S.sel] ? ecModal(cur(), cabInfo[S.sel]) : '';
  app.className = 'nv-app nv-tab-' + S.tab;
  app.innerHTML = nvHeader() + '<main class="nv-main" id="nv-main">' + body + '</main>' + modal +
    '<datalist id="dl-mat">' + listOpts('mat') + '</datalist><datalist id="dl-edge">' + listOpts('edge') + '</datalist><datalist id="dl-wt">' + listOpts('wt') + '</datalist>';
  mountIso(); mountRoom(); mountAssembly(); mountJc();
  clampNotes();
  nvRefocus(fx, ss);
  nvRunAfter();
}
function nvRefocus(fx, ss) { if (!fx) return; var el = document.getElementById(fx); if (!el) return; try { el.focus({ preventScroll: true }); if (ss != null) el.setSelectionRange(ss, ss); } catch (e) {} }
function nvRunAfter() {
  NVAFTER.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } });
  nvDecorate(); nvFlash();
}

/* the live refreshLive(): while typing, the open cabinet is rebuilt and only the [data-live] regions are repainted,
   so the field keeps its focus and caret */
function refreshLive() {
  if (S.home || !S.proj) return;
  if (S.tab === 'cab' && !S.picking && cur()) { S._info = S._info || []; S._info[S.sel] = buildOne(S.sel); }
  NV.issues = null;
  nvLive();
  if (S.tab === 'cab' && !S.picking && cur()) { mountAssembly(true); try { liveSections(cur()); } catch (e) {} }
}
function nvLive() {
  var c = cur(), inf = S._info && S._info[S.sel], ae = document.activeElement;
  [].forEach.call(document.querySelectorAll('[data-live]'), function (el) {
    var f = NVLIVE[el.getAttribute('data-live')]; if (!f) return;
    if (ae && ae !== document.body && el.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;   // never under the caret
    var h; try { h = f(c, inf, el.getAttribute('data-live-arg'), el); } catch (e) { return; }
    if (h == null || h === el.__nvh) return;
    el.innerHTML = h; el.__nvh = h;
  });
  nvDecorate();
}
/* a field that has an issue shows it right there: red / amber frame and the message under it */
function nvDecorate() {
  [].forEach.call(document.querySelectorAll('.nv-fmsg'), function (n) { n.remove(); });
  [].forEach.call(document.querySelectorAll('.nv-f-error, .nv-f-warn'), function (n) { n.classList.remove('nv-f-error', 'nv-f-warn'); });
  if (S.home || !S.proj || S.tab !== 'cab') return;
  var seen = {};
  nvIssuesFor(S.sel).forEach(function (x) {
    if (!x.field || (x.sev !== 'error' && x.sev !== 'warn') || seen[x.field]) return;
    var el = document.getElementById(x.field); if (!el) return; seen[x.field] = 1;
    var box = el.closest ? (el.closest('.f, .nv-field') || el.parentNode) : el.parentNode;
    box.classList.add(x.sev === 'error' ? 'nv-f-error' : 'nv-f-warn');
    var m = document.createElement('small'); m.className = 'nv-fmsg ' + x.sev; m.textContent = x.msg; box.appendChild(m);
  });
}

/* ----------------------------------------------------------------- commands of the new interface */
app.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('[data-nv]') : null; if (!el) return;
  var f = NVA[el.getAttribute('data-nv')]; if (!f) return;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  var r; try { r = f(el, el.getAttribute('data-v'), +el.getAttribute('data-i'), e); } catch (er) { if (window.console) console.error(er); toast(L('Nepavyko: ', 'Failed: ') + (er && er.message || er), true); return; }
  if (r !== false) render();
});
app.addEventListener('change', function (e) {
  var el = e.target, k = el && el.getAttribute && el.getAttribute('data-nv-change'); if (!k || !NVC[k]) return;
  var r; try { r = NVC[k](el, e); } catch (er) { if (window.console) console.error(er); return; }
  if (r !== false) render();
});
/* leaving a cabinet field always redraws the page: the live app redraws only for a hand-kept list of fields, and a field
   outside it that shows or hides other controls (a lifted bottom → the plinth's position) left the page stale */
app.addEventListener('change', function (e) {
  var b = e.target && e.target.getAttribute && e.target.getAttribute('data-bind');
  if (b && /^c\./.test(b) && typeof later === 'function') later('render');
});
document.addEventListener('keydown', function (e) {   // Ctrl/Cmd+Z, Ctrl+Shift+Z / Ctrl+Y: the whole project, wherever the focus is — except while typing in a field (the field's own undo)
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  var k = (e.key || '').toLowerCase(); if (k !== 'z' && k !== 'y') return;
  var a = document.activeElement, typing = a && (/^(TEXTAREA)$/.test(a.tagName) || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|range)$/.test(a.type)) || a.isContentEditable);
  if (typing || S.home || !S.proj) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (k === 'y' || e.shiftKey) nvRedo(); else nvUndo();
}, true);
NVA.ack = function (el, v, i) {
  var c = S.proj.cabinets[i], x = nvIssues().filter(function (y) { return y.cab === i && nvAckKey(y) === v; })[0]; if (!c || !x) return;
  c.nvAck = c.nvAck || {}; c.nvAck[v] = nvAckSig(x); save(); toast(L('Patvirtinta — įspėjimas nebestabdys', 'Confirmed — this warning will not ask again'));
};
NVA.unack = function (el, v, i) { var c = S.proj.cabinets[i]; if (c && c.nvAck) { delete c.nvAck[v]; save(); } };
NVA.undo = function () { nvUndo(); return false; };
NVA.redo = function () { nvRedo(); return false; };
/* <button data-nv="go" data-tab data-sel data-topic data-sec data-col data-field> — used by every "fix" link */
NVA.go = function (el) {
  var g = function (k) { var v = el.getAttribute('data-' + k); return v == null || v === '' ? null : v; };
  var o = { tab: g('tab'), topic: g('topic'), field: g('field') };
  if (g('sel') != null) o.sel = +g('sel');
  if (g('sec') != null) o.sec = +g('sec');
  if (g('col') != null) o.col = +g('col');
  nvGo(o); return false;
};
NVA.topic = function (el, v) { NV.topic = v; NV.secSel = null; };
NVA.view = function (el, v) { NV.view = v; };

/* ----------------------------------------------------------------- stage views: until a src/ui file gives its own, the live app's view is shown */
/* a plain cabinet workspace: cabinet list · topics (or, with none registered, the live steps) · 3-D picture.
   30-editor.js replaces it with the real one; it stays as the fallback and as the harness for building topics alone. */
function nvTopicCur(c) { var ts = nvTopicsFor(c); if (!ts.length) return null; var k = ts.filter(function (x) { return x.key === NV.topic; })[0]; return k || ts[0]; }
NVSTAGE.cab = function (info) {
  var cabs = S.proj.cabinets;
  if (S.picking || !cabs.length) return typeof nvPicker === 'function' ? nvPicker() : viewPick();
  var c = cur(), inf = info[S.sel], ts = nvTopicsFor(c), tp = nvTopicCur(c);
  var list = '<aside class="nv0-list">' + cabs.map(function (k, i) { var w = nvWorst(nvIssuesFor(i)); return '<button type="button" class="nv0-cab' + (i === S.sel ? ' on' : '') + '" data-act="sel" data-i="' + i + '"><span class="nv-state ' + w + '"></span><b>' + (i + 1) + ' · ' + esc(k.name || typeName(k)) + '</b></button>'; }).join('') + '<button type="button" class="nv-btn pri" data-act="pick">' + t('newCab') + '</button></aside>';
  var body = tp ? '<nav class="nv0-topics">' + ts.map(function (x) { var w = nvWorst(nvIssuesFor(S.sel).filter(function (y) { return y.topic === x.key; })); return '<button type="button" data-nv="topic" data-v="' + x.key + '" class="' + (x.key === tp.key ? 'on' : '') + '"><span class="nv-state ' + w + '"></span>' + esc(x.label()) + '</button>'; }).join('') + '</nav><div class="nv-card nv0-body">' + tp.body(c, inf) + '</div>'
    : cabBar(c) + stepNav(c, inf) + oneStep(viewEditor(c), c, inf);
  return '<div class="nv0-ws">' + list + '<section class="nv0-ed editor">' + body + '</section><aside class="nv0-pic"><div id="assembly-preview"></div></aside></div>';
};
NVSTAGE.room = function (info) { return roomChecks(info) + '<div class="room" id="room"></div>'; };
NVSTAGE.chk = function () {
  var L0 = nvIssues();
  return '<div class="nv-card"><h2 class="nv-h2">' + L('Patikra', 'Check') + '</h2>' + (L0.length ? L0.map(function (x) { return '<div class="nv-issue ' + x.sev + '"><b>' + (x.cab >= 0 ? (x.cab + 1) + ' · ' : '') + '</b>' + esc(x.msg) + '</div>'; }).join('') : '<p>' + L('Viskas tvarkoje.', 'All good.') + '</p>') + '</div>';
};
NVSTAGE.res = function () { return viewRes(buildProjectAll()); };
NVSTAGE.nest = function () { return viewNest(); };
NVSTAGE.drw = function () { return viewDrw(); };
NVSTAGE.set = function () { return viewSet(); };
