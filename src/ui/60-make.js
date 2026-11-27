/* =====================================================================
   60-make.js — stage "Gamyba" (NVSTAGE.res / .nest / .drw): parts and programs, cutting plan, drawings —
   and THE EXPORT GATE: nothing leaves for the machine while the check has an error or an open confirmation,
   and warnings have to be acknowledged first (remembered for exactly that set of warnings, per project, per session).

   The parts table, part view, cutting plan and drawings are the live views. Their own download / print / hand-over
   buttons stay where they are, but every one of them passes nvmGate(): a capturing click listener on #app stops the
   export commands (NVM_EXPORT) while the gate is closed — from any stage, mouse or keyboard.
   ===================================================================== */
NV.mAck = {};      // project id → signature of the acknowledged warnings (the copy used when sessionStorage is not available)
NV.mFiles = 0;     // number of CNC programs of the last build (for the panel while it is repainted live)

/* the live commands that take something out of the app: downloads, clipboard, print, the hand-over to Nesting */
var NVM_EXPORT = { dl: 1, dlall: 1, dlprog: 1, dlpart: 1, dlcab: 1, copy: 1, print: 1, nestopen: 1, drwpdf: 1, drwpdf1: 1 };

/* ----------------------------------------------------------------- the gate */
function nvmHash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + s.length; }
/* the set of warnings as one short string: any new, changed or moved warning gives another one */
function nvmSig(list) {
  var s = typeof nvcSig === 'function' ? String(nvcSig(list))
    : list.map(function (x) { return [x.id, x.cab, x.sec == null ? '' : x.sec, x.col == null ? '' : x.col, x.raw || x.msg].join('|'); }).sort().join('\n');
  return list.length + ':' + nvmHash(s);
}
function nvmAckKey() { return 'nv.ack.' + (S.proj && S.proj.id || ''); }
function nvmAckGet() { var v = null; try { v = sessionStorage.getItem(nvmAckKey()); } catch (e) {} return v != null ? v : (NV.mAck[S.proj && S.proj.id] || null); }
function nvmAckSet(sig) {
  var id = S.proj && S.proj.id; if (sig) NV.mAck[id] = sig; else delete NV.mAck[id];
  try { if (sig) sessionStorage.setItem(nvmAckKey(), sig); else sessionStorage.removeItem(nvmAckKey()); } catch (e) {}
}
/* state: 'blocked' (errors, open confirmations, or nothing to make) → 'ack' (warnings not acknowledged) → 'ready' */
function nvmGate() {
  var list = nvkAll(), cabs = S.proj ? S.proj.cabinets.length : 0;
  var blockers = nvkSort(list.filter(function (x) { return x.sev === 'error' || x.sev === 'todo'; })), warns = list.filter(function (x) { return x.sev === 'warn'; });
  var sig = nvmSig(warns), acked = !warns.length || nvmAckGet() === sig;
  var state = blockers.length || !cabs ? 'blocked' : acked ? 'ready' : 'ack';
  return { state: state, open: state === 'ready', blockers: blockers, warns: warns, sig: sig, acked: acked, cabs: cabs };
}
function nvmFresh() { NV.issues = null; return nvmGate(); }   // at the moment of an export: never from a cached list
function nvmStop(g) {   // an export was refused: say why and take the person to the place
  if (g.state === 'blocked') { toast(L('Pirmiausia sutvarkykite patikrą', 'Sort out the check first'), true); nvGo({ tab: 'chk' }); }
  else { toast(L('Pirmiausia peržiūrėkite įspėjimus', 'Review the warnings first'), true); nvGo({ tab: 'res', field: 'nvm-ackbox' }); }
}
function nvmPass() { var g = nvmFresh(); if (g.open) return true; nvmStop(g); return false; }
app.addEventListener('click', function (e) {   // capture: before the live command switch sees the click
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el || !NVM_EXPORT[el.getAttribute('data-act')] || S.home || !S.proj) return;
  var g = nvmFresh(); if (g.open) return;
  e.preventDefault(); e.stopImmediatePropagation();
  nvmStop(g);
}, true);

/* the two files the live app has no gate-safe command for */
NVA.mpdf = function () {   // all drawing sheets, freshly built (the live drwpdf prints the list last SHOWN on the drawings page)
  if (!nvmPass()) return false;
  var list = []; try { list = DR ? drwSheets('all', S.drwPaper) : []; } catch (e) { if (window.console) console.error(e); }
  if (!list.length) { toast(t('drwNone'), true); return false; }
  savePdf(list, projName() + '_brezinai.pdf'); return false;
};
NVA.mxxlzip = function () {   // only the CNC programs, every .XXL in one ZIP (in a folder <project>_XXL)
  if (!nvmPass()) return false;
  if (S.busy) { toast(t('building')); return false; }
  var pj = buildProjectAll(), base = pj.project;
  if (!pj.files.length) { toast(L('CNC programų nėra.', 'There are no CNC programs.'), true); return false; }
  S.busy = true; toast(t('building'));
  Promise.resolve(Z.zip(pj.files.map(function (f) { return { name: base + '_XXL/' + f.name, data: f.text }; }))).then(function (u) {
    S.busy = false; saveFile(base + '_XXL.zip', u); }, function (er) { S.busy = false; toast(String(er && er.message || er), true); });
  return false;
};
/* the finished project into ShopFlow: its report list (the same .xlsx as "Detalių sąrašas") goes through localStorage to
   /shopflow-app/?from=builder, where the SWOOD import opens with it (shopflow-app/builder-link.js).
   The drawing sheets go along too — the very sheets of "Brėžiniai" (A3, SVG), each with the names of its cabinet's
   parts — through IndexedDB (they are too big for localStorage): ShopFlow attaches them to the project, and the
   assembly station opens the sheet of the cabinet whose part was scanned. */
function nvmDrwHandoff(pj) {
  var list = []; try { list = DR ? drwSheets('all', 'A3') : []; } catch (e) { if (window.console) console.warn('drawings for ShopFlow', e); list = []; }
  return list.filter(function (x) { return x && x.svg && !x.error; }).map(function (x) {
    var c = x.cab != null ? S.proj.cabinets[x.cab] : null;
    return { id: x.id, cab: x.cab == null ? null : x.cab, cont: !!x.cont, title: x.title, name: c ? (c.name || '') : '',
      parts: x.cab == null ? [] : pj.parts.filter(function (p) { return p.cab === x.cab + 1; }).map(function (p) { return p.name; }), svg: x.svg };
  });
}
/* the project itself for the assembly station's 3-D view (builder/viewer.html in ShopFlow): the cabinets and the settings
   they are built with, so the picture there is this one — joints, hardware, looks. Prices stay here. */
function nvmProjHandoff() { var p = clone(S.proj); delete p.pricing; return { proj: p, settings: clone(S.settings) }; }
function nvmIdbPut(key, val) {
  return new Promise(function (res, rej) {
    if (!window.indexedDB) return rej(new Error('no IndexedDB'));
    var rq = indexedDB.open('db-handoff', 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
    rq.onerror = function () { rej(rq.error); };
    rq.onsuccess = function () { var db = rq.result, tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key);
      tx.oncomplete = function () { db.close(); res(); }; tx.onerror = function () { db.close(); rej(tx.error); }; };
  });
}
/* the 3-D assembly picture on the sheets needs three.js: wait for it a moment (else the sheets keep their line drawing) */
function nvmWait3d(ms) {
  return new Promise(function (res) {
    if (typeof nvdReady !== 'function' || nvdReady()) return res();
    if (typeof nv3Load === 'function') try { nv3Load(); } catch (e) {}
    var t0 = Date.now(), tick = function () { if (nvdReady() || (typeof NV3 !== 'undefined' && NV3.failed) || Date.now() - t0 > ms) return res(); setTimeout(tick, 150); };
    tick();
  });
}
NVA.mshop = function () {
  if (!nvmPass()) return false;
  if (S.busy) { toast(t('building')); return false; }
  var pj = buildProjectAll(), w = window.open('about:blank', '_blank'); S.busy = true; toast(t('building'));
  var drw = 0;
  Promise.all([xlsmBytes(pj), nvmWait3d(5000).then(function () {
    var sheets = nvmDrwHandoff(pj); if (!sheets.length) return 0;
    var whole = null; try { whole = nvmProjHandoff(); } catch (e) { whole = null; }
    return nvmIdbPut('drawings', { project: S.proj.id, at: Date.now(), sheets: sheets, whole: whole }).then(function () { return sheets.length; }, function () { return 0; });
  })]).then(function (r) {
    var bytes = r[0]; drw = r[1];
    S.busy = false;
    var b = '', u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (var i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    try { localStorage.setItem('dbShopflowHandoff', JSON.stringify({ name: projName() + '_ReportLists_to_Excel.xlsx', b64: btoa(b), project: S.proj.name || projName(), builderId: S.proj.id, drawings: drw, at: Date.now() })); }
    catch (e) { if (w) w.close(); toast(L('Nepavyko perduoti į ShopFlow — atsisiųskite detalių sąrašą ir importuokite jį ShopFlow.', 'Could not hand over to ShopFlow — download the part list and import it in ShopFlow.'), true); return; }
    var url = (location.pathname.indexOf('/builder') >= 0 ? location.pathname.replace(/\/builder\/?.*$/, '/shopflow-app/') : '/shopflow-app/') + '?from=builder';
    if (w) w.location.href = url; else location.href = url;
  }, function (er) { S.busy = false; if (w) w.close(); toast(String(er && er.message || er), true); });
  return false;
};
NVA.mjson = function () {   // the project itself, as the ZIP carries it: prices stay with the admin
  if (!nvmPass()) return false;
  var p = clone(S.proj); if (!S.admin) delete p.pricing;
  saveFile(projName() + '_projektas.json', JSON.stringify(p, null, 1)); return false;
};
NVC.mack = function (el) { var g = nvmFresh(); nvmAckSet(el.checked && g.state !== 'blocked' ? g.sig : null); };

/* ----------------------------------------------------------------- the export panel */
var NVM_LOCK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
function nvmLine(x) { return '<li class="nvm-li ' + x.sev + '">' + nvkMark(x.sev) + '<span>' + (x.cab >= 0 && S.proj.cabinets[x.cab] ? '<b>' + esc(nvkCabName(x.cab)) + '</b> — ' : '') + esc(x.msg) + '</span></li>'; }
function nvmLines(list, max) {
  var more = list.length - max;
  return '<ul class="nvm-list">' + list.slice(0, more > 1 ? max : list.length).map(nvmLine).join('') + '</ul>' +
    (more > 1 ? '<details class="nvm-more"><summary>' + L('Rodyti dar ', 'Show ') + more + L('', ' more') + '</summary><ul class="nvm-list">' + list.slice(max).map(nvmLine).join('') + '</ul></details>' : '');
}
function nvmFile(ext, title, line, btns) {
  return '<div class="nvm-file"><span class="nvm-ext">' + ext + '</span><div class="nvm-ft"><b>' + title + '</b><span>' + line + '</span></div><div class="nvm-fb">' + btns + '</div></div>';
}
function nvmFiles(open, nFiles) {
  var d = open ? '' : ' disabled', dl = '⤓ ' + L('Atsisiųsti', 'Download');
  var b = function (attrs, label, cls) { return '<button type="button" class="nv-btn sm' + (cls ? ' ' + cls : '') + '" ' + attrs + d + '>' + label + '</button>'; };
  return '<div class="nvm-files"><h3 class="nv-h3">' + L('Atskiri failai', 'Single files') + '</h3><div class="nvm-fgrid">' +
    nvmFile('.XXL', L('CNC programos', 'CNC programs') + ' <i>' + nFiles + '</i>', L('Į CNC stakles — po programą kiekvienai gręžiamai detalei.', 'To the CNC machine — one program for every drilled part.'), b('data-nv="mxxlzip" title="' + esc(L('Visos .XXL programos viename ZIP faile (aplanke ', 'Every .XXL program in one ZIP file (in the folder ') + projName() + '_XXL)') + '"', '⤓ ZIP') + b('data-act="dlall" title="' + esc(t('xxlAllT')) + '"', L('Po vieną', 'One by one'), 'ghost')) +
    nvmFile('.xlsx', L('Detalių sąrašas', 'Part list'), L('Į Nesting programą — pjovimui ir etiketėms.', 'To the Nesting app — for cutting and labels.'), b('data-act="dl" data-v="xlsm"', dl) + b('data-act="nestopen" title="' + esc(t('nestOpenT')) + '"', '↗ Nesting', 'ghost')) +
    nvmFile('PDF', L('Brėžiniai', 'Drawings') + ' <i>' + esc(S.drwPaper || 'A3') + '</i>', L('Spausdinti surinkimui ir montavimui.', 'Print them for assembly and fitting.'), b('data-nv="mpdf"', dl)) +
    nvmFile('.csv', L('Detalių lentelė', 'Part table'), L('Jei sąrašo reikia skaičiuoklėje ar kitoje programoje.', 'When the list is needed in a spreadsheet or another program.'), b('data-act="dl" data-v="csv"', dl)) +
    nvmFile('.json', L('Projekto kopija', 'Project copy'), L('Atsarginė kopija ar perkėlimui į kitą kompiuterį — ne staklėms.', 'A backup, or to move to another computer — not for the machine.'), b('data-nv="mjson"', dl)) +
    (IN_ARTIFACT ? '' : nvmFile('<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', L('Sąrašas popieriuje', 'The list on paper'), L('Detalių lentelė ir furnitūra — pasižymėti dirbtuvėje.', 'The part table and hardware — to tick off in the workshop.'), b('data-act="print"', L('Spausdinti', 'Print')))) +
    '</div></div>';
}
function nvmAckBox(g) {
  var n = g.warns.length;
  return '<label class="nvm-ack' + (g.acked ? ' on' : '') + '" id="nvm-ackbox"><input type="checkbox" id="nvm-ack" data-nv-change="mack"' + (g.acked ? ' checked' : '') + '><span>' +
    L('Peržiūrėjau ' + (n === 1 ? 'įspėjimą' : 'įspėjimus') + ' — gaminti galima', 'I have reviewed the ' + (n === 1 ? 'warning' : 'warnings') + ' — it can be made') + '</span></label>';
}
function nvmZip(open) {
  return '<div class="nvm-zip"><button type="button" class="nv-btn pri lg" id="nvm-zip" data-act="dl" data-v="zip"' + (open ? '' : ' disabled') + '>⤓ ' + L('Atsisiųsti viską (ZIP)', 'Download everything (ZIP)') + '</button>' +
    '<small>' + L('Viename faile: programos, sąrašai, brėžiniai ir projekto kopija.', 'In one file: programs, lists, drawings and the project copy.') + '</small>' +
    '<button type="button" class="nv-btn lg" id="nvm-shop" data-nv="mshop"' + (open ? '' : ' disabled') + '>↗ ' + L('Į ShopFlow gamybą', 'To ShopFlow production') + '</button>' +
    '<small>' + L('Sukuria gamybos projektą ShopFlow iš šio detalių sąrašo.', 'Makes the production project in ShopFlow from this part list.') + '</small></div>';
}
function nvmPanel(g, nFiles) {
  var chk = '<button type="button" class="nv-btn sm ghost" data-act="tab" data-v="chk">' + L('Atidaryti patikrą', 'Open the check') + ' →</button>', nb = g.blockers.length, nw = g.warns.length;
  var wrap = function (cls, ico, title, lead, side, body) {
    return '<section class="nv-card nvm-panel st-' + cls + ' noprint" id="nvm-panel" data-state="' + g.state + '"><div class="nvm-st"><span class="nvm-ico" aria-hidden="true">' + ico + '</span>' +
      '<div class="nvm-stt"><h2 class="nv-h2">' + title + '</h2><p class="nv-lead">' + lead + '</p></div>' + side + '</div>' + body + '</section>';
  };
  if (g.state === 'blocked') {
    var what = S.lang === 'en' ? nb + (nb === 1 ? ' thing stops' : ' things stop') + ' production' : nb + ' ' + nvkPl(nb, 'dalykas stabdo', 'dalykai stabdo', 'dalykų stabdo') + ' gamybą';
    return wrap('blocked', NVM_LOCK, nb ? L('Failai užrakinti', 'The files are locked') + ' — ' + what : L('Dar nėra ką gaminti', 'Nothing to make yet'),
      nb ? L('Kol tai nesutvarkyta, staklėms nieko atsisiųsti negalima. Sąrašą ir detales peržiūrėti galima.', 'Until this is sorted out nothing can be downloaded for the machine. The list and the parts can still be looked at.')
         : L('Projekte dar nėra spintelių — pridėkite pirmą.', 'No cabinets in this project yet — add the first one.'),
      '<button type="button" class="nv-btn pri lg" id="nvm-tochk" data-act="tab" data-v="' + (nb ? 'chk' : 'cab') + '">' + (nb ? L('Eiti į patikrą', 'Go to the check') : L('Į spinteles', 'To the cabinets')) + ' →</button>',
      nb ? nvmLines(g.blockers, 6) : '');   // 6 = two full rows of the three-column list
  }
  if (g.state === 'ack')
    return wrap('ack', '!', S.lang === 'en' ? 'Review ' + nw + (nw === 1 ? ' warning' : ' warnings') + ' before downloading' : 'Prieš atsisiunčiant peržiūrėkite ' + nw + ' ' + nvkPl(nw, 'įspėjimą', 'įspėjimus', 'įspėjimų'),
      L('Niekas nestabdo, bet šias vietas verta patikrinti prieš paleidžiant stakles. Pažymėkite, kai perskaitysite.', 'Nothing blocks, but these are worth checking before the machine runs. Tick the box once you have read them.'), chk,
      nvmLines(g.warns, 5) + '<div class="nvm-go">' + nvmAckBox(g) + nvmZip(false) + '</div>' + nvmFiles(false, nFiles));
  return wrap('ready', '✓', L('Paruošta gamybai', 'Ready for production'),
    nw ? L('Klaidų nėra, įspėjimai peržiūrėti. Failai — iš ką tik patikrinto projekto.', 'No errors, the warnings are reviewed. The files come from the project as just checked.')
       : L('Klaidų ir įspėjimų nėra. Failai — iš ką tik patikrinto projekto.', 'No errors and no warnings. The files come from the project as just checked.'),
    nvmZip(true),
    (nw ? '<div class="nvm-go"><span class="nvm-acked">' + nvmAckBox(g) + '<span class="nv-muted">' + nvkCnt('warn', nw) + '</span>' + chk + '</span></div>' : '') + nvmFiles(true, nFiles) + (typeof nvpStep === 'function' ? nvpStep(g) : ''));
}
NVLIVE.mgate = function () { return nvmPanel(nvmGate(), NV.mFiles); };   // follows the project name while it is typed in the top bar

/* ----------------------------------------------------------------- the three pages */
function nvmSub() {
  var tabs = [['res', L('Detalės ir programos', 'Parts and programs')], ['nest', L('Plokštės', 'Boards')], ['drw', L('Brėžiniai', 'Drawings')]];
  return '<nav class="nvm-sub noprint" aria-label="' + esc(L('Gamybos puslapiai', 'Production pages')) + '">' + tabs.map(function (x) {
    return '<button type="button" data-act="tab" data-v="' + x[0] + '" class="' + (S.tab === x[0] ? 'on' : '') + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' + x[1] + '</button>'; }).join('') + '</nav>';
}
/* on the cutting-plan and drawings pages the gate is one line above the live view */
function nvmBar(g) {
  if (g.open) return '';
  var nb = g.blockers.length, nw = g.warns.length;
  if (!g.cabs && !nb) return '';   // an empty project: the live views say so themselves
  if (g.state === 'blocked')
    return '<div class="nvm-bar st-blocked noprint" id="nvm-bar" data-state="blocked"><span class="nvm-bico" aria-hidden="true">' + NVM_LOCK + '</span><span class="nvm-btx"><b>' + L('Failai užrakinti', 'The files are locked') + '</b>' +
      (nb ? ' — ' + (S.lang === 'en' ? nb + (nb === 1 ? ' thing stops' : ' things stop') + ' production' : nb + ' ' + nvkPl(nb, 'dalykas stabdo', 'dalykai stabdo', 'dalykų stabdo') + ' gamybą') : '') + '. ' +
      L('Peržiūrėti galima, atsisiųsti ar perduoti — dar ne.', 'You can look, but not download or hand over yet.') + '</span><button type="button" class="nv-btn sm pri" data-act="tab" data-v="chk">' + L('Eiti į patikrą', 'Go to the check') + ' →</button></div>';
  return '<div class="nvm-bar st-ack noprint" id="nvm-bar" data-state="ack"><span class="nvm-bico" aria-hidden="true">!</span><span class="nvm-btx"><b>' +
    (S.lang === 'en' ? 'Review ' + nw + (nw === 1 ? ' warning' : ' warnings') + ' before downloading' : 'Prieš atsisiunčiant peržiūrėkite ' + nw + ' ' + nvkPl(nw, 'įspėjimą', 'įspėjimus', 'įspėjimų')) +
    '</b></span><button type="button" class="nv-btn sm pri" data-nv="go" data-tab="res" data-field="nvm-ackbox">' + L('Peržiūrėti', 'Review') + ' →</button></div>';
}
function nvmStat(v, l) { return '<span class="nvm-stat"><b class="nv-num">' + v + '</b> ' + l + '</span>'; }
function nvmStats(pj) {
  var ps = pj.parts, eb = ps.reduce(function (a, p) { return a + (p.ebLen || 0); }, 0) / 1000, area = ps.reduce(function (a, p) { return a + p.L * p.W * p.qty / 1e6; }, 0), nc = S.proj.cabinets.length;
  return '<div class="nvm-stats" id="nvm-stats">' +
    nvmStat(nc, S.lang === 'en' ? (nc === 1 ? 'cabinet' : 'cabinets') : nvkPl(nc, 'spintelė', 'spintelės', 'spintelių')) +
    nvmStat(ps.length, S.lang === 'en' ? (ps.length === 1 ? 'part' : 'parts') : nvkPl(ps.length, 'detalė', 'detalės', 'detalių')) +
    nvmStat(pj.files.length, S.lang === 'en' ? (pj.files.length === 1 ? 'program' : 'programs') : nvkPl(pj.files.length, 'programa', 'programos', 'programų')) +
    nvmStat(fmt(area) + ' m²', L('plokštės', 'board')) + nvmStat(fmt(eb) + ' m', L('kraštų', 'edging')) + '</div>';
}
/* the live results view without its own title, download row and readiness card: from its two-column part on */
function nvmLiveRes(pj) {
  var h = viewRes(pj), k = h.indexOf('<div class="split">');
  if (k < 0) return '';   // no parts: the live view is one "nothing here" card
  return h.slice(k, h.lastIndexOf('</div>'));
}
function nvmPage(g, body) { return '<div class="nvm nvm-' + S.tab + (g.open ? '' : ' nvm-closed') + '" data-gate="' + g.state + '">' + body + '</div>'; }
NVSTAGE.res = function () {
  var pj = buildProjectAll(), g = nvmGate(), live = nvmLiveRes(pj);
  NV.mFiles = pj.files.length;
  var head = '<div class="printhead">' + esc((S.proj.name || projName()) + ' · ' + new Date().toISOString().slice(0, 10) + ' · ' + t('rTitle')) + '</div>' +
    '<div class="nvm-top">' + nvmSub() + (pj.parts.length ? nvmStats(pj) : '') + '</div>';
  var body = live
    ? '<p class="nvm-printlock">' + L('Projektas dar nepraėjo patikros — sąrašas nespausdinamas.', 'The project has not passed the check yet — the list is not printed.') + '</p><div class="res nvm-live">' + live + '</div>'
    : S.proj.cabinets.length ? '<div class="nv-empty">' + L('Detalių nėra — spintelės turi klaidų, todėl nieko nepagaminama.', 'No parts — the cabinets have errors, so nothing is made.') + '</div>' : '';
  return nvmPage(g, head + '<div data-live="mgate" class="nvm-gate">' + nvmPanel(g, NV.mFiles) + '</div>' + (live ? priceProjectCard() : '') + body);
};
NVSTAGE.nest = function () { var g = nvmGate(); return nvmPage(g, '<div class="nvm-top">' + nvmSub() + '</div>' + nvmBar(g) + '<div class="nvm-live">' + viewNest() + '</div>'); };
NVSTAGE.drw = function () { var g = nvmGate(); return nvmPage(g, '<div class="nvm-top">' + nvmSub() + '</div>' + nvmBar(g) + '<div class="nvm-live">' + viewDrw() + '</div>'); };

/* while the gate is closed the live views' own export buttons look and read as switched off (the click is stopped above) */
NVAFTER.push(function () {
  if (S.home || !S.proj || !/^(res|nest|drw)$/.test(S.tab)) return;
  var g = nvmGate(); if (g.open) return;
  var why = g.state === 'blocked' ? L('Užrakinta — pirmiausia sutvarkykite patikrą', 'Locked — sort out the check first') : L('Pirmiausia peržiūrėkite įspėjimus', 'Review the warnings first');
  [].forEach.call(document.querySelectorAll('#nv-main [data-act]'), function (b) {
    if (!NVM_EXPORT[b.getAttribute('data-act')] || b.disabled) return;
    b.setAttribute('aria-disabled', 'true'); b.title = why;
  });
});
