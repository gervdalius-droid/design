/* =====================================================================
   20-home.js — the start screen (NVSTAGE.home) and the new-cabinet chooser (nvPicker).

   Start screen: two things only — start a project (name → Enter → the chooser) and continue one (cards with small
   front pictures of the first cabinets). Every action is a live command (pcreate, popen, pdup, pjson, pver, pdel,
   psample, pimport); this file adds the checks before "create" (no name / a name that already exists) and the
   pictures. The card's main button keeps `.prow-main[data-act="popen"][data-v]` with a <b> inside: locks.js hangs
   its "🔒 who has it open" badge there.

   Chooser: the ten live PRESETS as real front pictures (the engine builds each one once), grouped by where the
   cabinet goes; nvhPreset / nvhLibAdd do what the live 'preset' / 'libadd' commands do and then open the new
   cabinet on the topic "Dydis" with the width selected.
   ===================================================================== */
NV.hMenu = null;    // id of the project card whose ⋯ menu is open
NV.hErr = null;     // what the last "create" was refused for: 'need' | 'dup' | null
NV.hDupOk = null;   // the already-used name the person was warned about once ("create anyway" is the second press)
NV.hAll = false;    // show every project, not only the newest NVH_MAX
var NVH_MAX = 12, NVH_BUDGET = 45;   // cards before "show all"; ms a render may spend on new pictures (the rest follow, one card per tick)
var NVH_PICS = {};                   // project id → { at: rec.updated + lang, html }: the pictures of a card, kept for the session
var NVH_PRE = {};                    // preset index → { key, pic }: the chooser's pictures (key = the cabinet the preset makes now)
var NVH_RECS = {}, nvhPumpT = null;  // the projects of the last home render by id, for the picture pump

/* ----------------------------------------------------------------- small helpers */
function nvhPl(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && (b < 10 || b >= 20) ? few : many; }   // Lithuanian: 1 spintelė, 2 spintelės, 10 spintelių
function nvhCabs(n) { return n + ' ' + (S.lang === 'en' ? (n === 1 ? 'cabinet' : 'cabinets') : nvhPl(n, 'spintelė', 'spintelės', 'spintelių')); }
function nvhProjs(n) { return n + ' ' + (S.lang === 'en' ? (n === 1 ? 'project' : 'projects') : nvhPl(n, 'projektas', 'projektai', 'projektų')); }
function nvhKey(name) { return E.safeName(String(name || '').trim()).toLowerCase(); }   // two names that give the same file names (Windows does not tell A from a)
/* "changed …" of a card: as the live ago(), but days in words — "vakar 14:05", "prieš 3 d." — and no clock time on old ones */
function nvhAgo(iso) {
  if (!iso) return '';
  var d = new Date(iso), now = new Date(); if (isNaN(d)) return '';
  var day = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }, n = Math.round((day(now) - day(d)) / 864e5);
  if (n <= 0) return ago(iso);
  var pad = function (v) { return (v < 10 ? '0' : '') + v; };
  if (n === 1) return L('vakar', 'yesterday') + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (n < 7) return L('prieš ' + n + ' d.', n + ' days ago');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nvhSorted() { return lib().slice().sort(function (a, b) { return String(b.updated || '').localeCompare(String(a.updated || '')); }); }   // newest first (ISO dates sort as text)

/* one cabinet → its front picture from the real parts: { svg, w, h (mm of the picture), wall } or null */
function nvhPic(c, idx, pname) {
  try {
    var r = E.buildCabinet(engineDef(c), idx || 0, pname || 'X'); if (!r || !window.DBFront) return null;
    var svg = c.kind === 'box' || c.kind === 'panel' ? window.DBFront.svg(c, r, { bnd: [0, num(c.W)], noHit: true, label: '' })
      : frontArtOf(c, r, { noHit: true, label: '' }).svg;   // noHit: no clickable columns inside a card
    var m = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg); if (!m || !(+m[3] > 0) || !(+m[4] > 0)) return null;
    return { svg: svg, w: +m[3], h: +m[4], wall: c.kind !== 'box' && c.kind !== 'panel' && cabKind(c) === 'PAKABINAMOS' };
  } catch (e) { return null; }
}
function nvhPicBox(p, maxW, maxH, cls) {
  var sc = Math.min(maxW / p.w, maxH / p.h), w = Math.max(2, Math.round(p.w * sc)), h = Math.max(2, Math.round(p.h * sc));
  return '<span class="nvh-pic' + (cls ? ' ' + cls : '') + '" style="width:' + w + 'px;height:' + h + 'px" aria-hidden="true">' + p.svg + '</span>';
}

/* ----------------------------------------------------------------- the name of a new project: what it becomes, and what is wrong with it */
function nvhNameState(name) {
  var nm = String(name || '').trim(); if (!nm) return { k: 'need' };
  var safe = E.safeName(nm), key = safe.toLowerCase();
  var same = lib().filter(function (r) { return nvhKey(r.name) === key; })[0];
  return { k: same ? 'dup' : /[A-Za-z0-9]/.test(safe) ? 'ok' : 'odd', safe: safe, key: key, same: same, changed: safe !== nm };
}
function nvhNoteHtml(name) {
  var st = nvhNameState(name);
  if (st.k === 'need') return NV.hErr === 'need'
    ? '<span class="nvh-note-msg bad"><b>' + t('npNeed') + '.</b> ' + L('Be jo CNC programos neturėtų pavadinimo.', 'Without it the CNC programs would have no name.') + '</span>'
    : '<span class="nvh-note-msg">' + L('Pavadinimu prasidės visų šio projekto CNC programų ir failų pavadinimai.', 'Every CNC program and file of this project starts with this name.') + '</span>';
  if (st.k === 'dup') return '<span class="nvh-note-msg warn"><b>' + L('Toks projektas jau yra', 'A project with this name already exists') + '</b> — ' + nvhCabs(st.same.n || 0) + ', ' + t('prUpdated') + ' ' + esc(nvhAgo(st.same.updated)) + '. ' +
    L('CNC programos vadintųsi vienodai ir staklėse perrašytų vienos kitas.', 'The CNC programs would get the same names and overwrite each other on the machine.') + '</span>' +
    '<button type="button" class="nv-btn sm" data-act="popen" data-v="' + esc(st.same.id) + '">' + L('Atidaryti esamą', 'Open the existing one') + '</button>';
  if (st.k === 'odd') return '<span class="nvh-note-msg warn">' + L('Pavadinime nėra raidžių ar skaičių — programos vadintųsi „PROJEKTAS_…“. Įrašykite aiškesnį.', 'The name has no letters or digits — the programs would be called "PROJEKTAS_…". Type a clearer one.') + '</span>';
  return '<span class="nvh-note-msg">' + (st.changed ? L('CNC programų pavadinimuose — be lietuviškų raidžių ir tarpų:', 'In the CNC program names — plain letters, no spaces:') : L('CNC programos vadinsis:', 'The CNC programs will be called:')) +
    ' <code>' + esc(st.safe) + '_1_….XXL</code></span>';
}
function nvhCreateLabel(name) { var st = nvhNameState(name); return (st.k === 'dup' && NV.hDupOk === st.key ? L('Sukurti vis tiek', 'Create anyway') : t('npCreate')) + ' →'; }
/* repaint the note and the button under the caret, without a render (the field keeps its focus) */
function nvhNamePaint(refused) {
  var f = document.getElementById('np-name'), note = document.getElementById('nvh-note'), btn = document.querySelector('.nvh-new [data-act="pcreate"]'); if (!f || !note) return;
  note.innerHTML = nvhNoteHtml(f.value);
  if (btn) btn.textContent = nvhCreateLabel(f.value);
  if (refused) {
    if (NV.hErr === 'need') f.setAttribute('aria-invalid', 'true');
    f.focus();
    note.classList.remove('nvh-shake'); void note.offsetWidth; note.classList.add('nvh-shake');   // the same message again must be seen again
  }
}
app.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'np-name') return;
  NV.hErr = null; if (NV.hDupOk && nvhKey(e.target.value) !== NV.hDupOk) NV.hDupOk = null;
  nvhNamePaint(false);
});
/* before the live 'pcreate': no name → the reason under the field (not a toast that goes away); a name that is taken → said once,
   the second press creates it. Capture phase: the live command (and the Enter key, which clicks the button) comes after. */
app.addEventListener('click', function (e) {
  var b = e.target && e.target.closest ? e.target.closest('[data-act="pcreate"]') : null; if (!b || !S.home) return;
  var f = document.getElementById('np-name'), st = nvhNameState(f ? f.value : '');
  if (st.k === 'need' || (st.k === 'dup' && NV.hDupOk !== st.key)) {
    e.stopPropagation(); e.preventDefault();
    NV.hErr = st.k; NV.hDupOk = st.k === 'dup' ? st.key : null;
    nvhNamePaint(true); return;
  }
  NV.hErr = null; NV.hDupOk = null;
}, true);

/* ----------------------------------------------------------------- project cards */
/* the first three cabinets of a project side by side at one scale, standing on the floor (wall cabinets hang) */
function nvhTileHtml(rec) {
  var cabs = (rec.data && rec.data.cabinets) || [], n = cabs.length;
  if (!n) return '<span class="nvh-nopic">' + L('Dar be spintelių', 'No cabinets yet') + '</span>';
  if (window.DBLook) {   // this project's own material colours (photos are not decoded for a thumbnail); the next project render sets its own look again
    var lk = (rec.data && rec.data.look) || {}, col = {}; Object.keys(lk).forEach(function (k) { if (lk[k] && lk[k].color) col[k] = { color: lk[k].color }; });
    window.DBLook.set(col);
  }
  var pics = cabs.slice(0, 3).map(function (c0, i) { return nvhPic(normCab(clone(c0)), i, rec.name); }).filter(Boolean);
  if (!pics.length) return '<span class="nvh-nopic">' + nvhCabs(n) + '</span>';
  var sumW = 0, maxH = 0; pics.forEach(function (p) { sumW += p.w; maxH = Math.max(maxH, p.h); });
  var sc = Math.min(84 / maxH, (176 - 10 * (pics.length - 1)) / sumW);
  return pics.map(function (p) { return nvhPicBox(p, p.w * sc, p.h * sc, p.wall && p.h * sc < 70 ? 'wall' : ''); }).join('') +
    (n > 3 ? '<i class="nvh-plus">+' + (n - 3) + '</i>' : '');
}
function nvhTile(rec, t0) {
  var k = String(rec.updated || '') + S.lang, hit = NVH_PICS[rec.id];
  if (hit && hit.at === k) return hit.html;
  if (performance.now() - t0 > NVH_BUDGET) return null;   // enough for this render: the pump draws it right after
  var h = nvhTileHtml(rec); NVH_PICS[rec.id] = { at: k, html: h }; return h;
}
/* the cards the render left without pictures: one project per tick, so a long list never blocks the screen */
function nvhPump() {
  clearTimeout(nvhPumpT); nvhPumpT = null; if (!S.home) return;
  var el = document.querySelector('.nvh-pics[data-wait]'); if (!el) return;
  var rec = NVH_RECS[el.getAttribute('data-wait')]; el.removeAttribute('data-wait');
  if (rec) { var h = nvhTileHtml(rec); NVH_PICS[rec.id] = { at: String(rec.updated || '') + S.lang, html: h }; el.innerHTML = h; }
  nvhPumpT = setTimeout(nvhPump, 0);
}
NVAFTER.push(function () {
  if (!S.home) { NVH_RECS = {}; NV.hMenu = null; NV.hErr = null; NV.hDupOk = null; return; }   // what was said about the name does not wait for the next visit
  if (document.querySelector('.nvh-pics[data-wait]')) { clearTimeout(nvhPumpT); nvhPumpT = setTimeout(nvhPump, 0); }
  var mn = document.querySelector('.nvh-menu');   // a menu opened on the last row: bring its "delete" onto the screen
  if (mn && mn.getBoundingClientRect().bottom > window.innerHeight - 8) { try { mn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e0) {} }
  var f = document.getElementById('np-name');   // first visit, nothing to continue: the caret is already in the name field (not on a phone — the keyboard would cover the page)
  if (f && !lib().length && (!document.activeElement || document.activeElement === document.body) && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) { try { f.focus({ preventScroll: true }); } catch (e) {} }
});
function nvhMenuHtml(r) {
  var sure = S.confirm === 'pdel' + r.id, id = esc(r.id);
  return '<div class="nvh-menu" role="menu" aria-label="' + esc(L('Projekto veiksmai', 'Project actions')) + '">' +
    '<button type="button" role="menuitem" data-act="pdup" data-v="' + id + '"><b>' + L('Kopijuoti', 'Make a copy') + '</b><small>' + L('tas pats projektas kitu pavadinimu', 'the same project under another name') + '</small></button>' +
    '<button type="button" role="menuitem" data-act="pjson" data-v="' + id + '"><b>' + L('Atsarginė kopija (.json)', 'Backup file (.json)') + '</b><small>' + L('failas kitam kompiuteriui ar archyvui', 'a file for another computer or the archive') + '</small></button>' +
    '<button type="button" role="menuitem" data-act="pver" data-v="' + id + '"><b>' + t('verBtn') + '</b><small>' + L('grįžti prie ankstesnės būsenos', 'go back to an earlier state') + '</small></button>' +
    '<button type="button" role="menuitem" class="del' + (sure ? ' sure' : '') + '" data-act="pdel" data-v="' + id + '"><b>' + (sure ? t('delSure') : t('del')) + '</b><small>' + (sure ? L('paspauskite dar kartą — grąžinti nebus galima', 'press again — this cannot be undone') : L('projektas ir jo spintelės', 'the project and its cabinets')) + '</small></button>' +
    '</div>';
}
function nvhCard(r, t0) {
  var isCur = !!(S.proj && S.proj.id === r.id), open = NV.hMenu === r.id, tile = nvhTile(r, t0), id = esc(r.id);
  return '<article class="nvh-card' + (isCur ? ' cur' : '') + (open ? ' menu-open' : '') + '">' +
    '<button type="button" class="prow-main nvh-open" data-act="popen" data-v="' + id + '" title="' + esc(L('Atidaryti projektą', 'Open the project')) + '">' +
      '<span class="nvh-pics"' + (tile == null ? ' data-wait="' + id + '"' : '') + '>' + (tile == null ? '<span class="nvh-skel"></span>' : tile) + '</span>' +
      '<b><span class="nvh-name">' + esc(r.name || t('noName')) + '</span>' + (isCur ? '<span class="nv-badge ok">' + t('prOpenNow') + '</span>' : '') + (typeof nvpBadge === 'function' ? nvpBadge(r) : '') + '</b>' +
      '<small title="' + esc(t('prUpdated') + ' ' + ago(r.updated)) + '">' + nvhCabs(r.n || 0) + ' · ' + esc(nvhAgo(r.updated)) + '</small>' +
    '</button>' +
    '<button type="button" class="nv-ic nvh-dots" data-nv="nvhMenu" data-v="' + id + '" aria-haspopup="menu" aria-expanded="' + open + '" title="' + esc(L('Kopijuoti, atsarginė kopija, versijos, ištrinti', 'Copy, backup, versions, delete')) + '" aria-label="' + esc(L('Projekto veiksmai', 'Project actions')) + '">⋯</button>' +
    (open ? nvhMenuHtml(r) : '') + '</article>';
}
NVA.nvhMenu = function (el, v) { NV.hMenu = NV.hMenu === v ? null : v; S.confirm = null; };
NVA.nvhAll = function () { NV.hAll = true; };
NVA.nvhClearQ = function () { S.homeQ = ''; };
/* the open ⋯ menu closes on any click that is not its own "delete" (whose first click only asks "sure?") and on Esc */
function nvhMenuClose() { NV.hMenu = null; if (/^pdel/.test(S.confirm || '')) S.confirm = null; }
document.addEventListener('click', function (e) {
  if (!NV.hMenu || !S.home || !e.target || !e.target.closest) return;
  if (e.target.closest('[data-nv="nvhMenu"]')) return;   // the ⋯ button toggles it itself
  if (e.target.closest('.nvh-menu [data-act="pdel"]')) { if (S.confirm === 'pdel' + NV.hMenu) NV.hMenu = null; return; }   // first click: the menu stays for the second; second: the live command deletes
  nvhMenuClose();
  setTimeout(function () { if (S.home && document.querySelector('.nvh-menu')) render(); }, 0);   // nothing else drew the screen again (a click on empty paper, .json, versions)
}, true);
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' || !NV.hMenu || !S.home) return;
  var id = NV.hMenu; nvhMenuClose(); render();
  var b = document.querySelector('.nvh-dots[data-v="' + String(id).replace(/["\\]/g, '') + '"]'); if (b) b.focus();
});

/* ----------------------------------------------------------------- the start screen */
var NVH_ICO = {
  up: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V3.5M6.2 7 10 3.2 13.8 7M3.5 12.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3"/></svg>',
  ex: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="11" y="3" width="6" height="8" rx="1"/><path d="M3 8h6M3 12.5h6M14 6v2" stroke-linecap="round"/></svg>'
};
function nvhNewHtml(all) {
  var nm = S.npName || '', ex = all.filter(function (r) { return r.name === 'PAVYZDYS'; })[0];
  return '<section class="nv-card nvh-new" aria-labelledby="nvh-new-h">' +
    '<h2 class="nvh-h2" id="nvh-new-h">' + t('prNew2') + '</h2>' +
    '<p class="nvh-sub">' + L('Vienas projektas — vienas užsakymas: virtuvė, spinta, vonios baldai.', 'One project is one order: a kitchen, a wardrobe, a bathroom.') + '</p>' +
    '<label class="nvh-field" for="np-name"><span>' + t('npName') + '</span>' +
      '<input id="np-name" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="' + esc(t('npPh')) + '" value="' + esc(nm) + '" aria-describedby="nvh-note"' + (NV.hErr === 'need' && !nm.trim() ? ' aria-invalid="true"' : '') + '></label>' +
    '<div class="nvh-note" id="nvh-note" aria-live="polite">' + nvhNoteHtml(nm) + '</div>' +
    '<button type="button" class="nv-btn pri lg nvh-create" data-act="pcreate">' + nvhCreateLabel(nm) + '</button>' +
    '<p class="nvh-next">' + L('Toliau rinksitės pirmąją spintelę.', 'Next you pick the first cabinet.') + '</p>' +
    '<div class="nvh-alt"><span class="nvh-or">' + t('npOr') + '</span>' +
      '<button type="button" class="nv-btn ghost nvh-altb" data-act="pimport" title="' + esc(L('Pasiūlymų programos eksportas arba šios programos atsarginė kopija (.json)', 'An export of the offer app, or a backup file of this app (.json)')) + '"><span class="nvh-ai" aria-hidden="true">' + NVH_ICO.up + '</span><span><b>' + L('Įkelti iš pasiūlymų programos', 'Import from the offer app') + '</b><small>' + L('.json failas — pasiūlymas arba atsarginė kopija', 'a .json file — an offer or a backup') + '</small></span></button>' +
      (ex ? '<button type="button" class="nv-btn ghost nvh-altb" data-act="popen" data-v="' + esc(ex.id) + '"><span class="nvh-ai" aria-hidden="true">' + NVH_ICO.ex + '</span><span><b>' + t('npSample') + '</b><small>' + L('trys spintelės pasibandyti', 'three cabinets to try things on') + '</small></span></button>'   // one example is enough: open it, do not add another
        : '<button type="button" class="nv-btn ghost nvh-altb" data-act="psample"><span class="nvh-ai" aria-hidden="true">' + NVH_ICO.ex + '</span><span><b>' + t('npSample') + '</b><small>' + L('trys spintelės pasibandyti', 'three cabinets to try things on') + '</small></span></button>') +
      '<input id="f-import" type="file" accept=".json,application/json" data-act-change="import" hidden></div>' +
    '</section>';
}
function nvhRoadHtml() {   // nothing to continue yet: the road of a project instead of an empty list
  var st = [
    [L('Spintelės', 'Cabinets'), L('Pasirenkate spintelę, įrašote dydį ir kas viduje — brėžinys keičiasi iškart.', 'Pick a cabinet, type its size and what is inside — the picture follows at once.')],
    [L('Išdėstymas', 'Layout'), L('Jei reikia — sustatote spinteles prie sienų: stalviršiai, cokoliai, brėžiniai.', 'If needed, place the cabinets along the walls: worktops, plinths, drawings.')],
    [L('Patikra', 'Check'), L('Programa parodo, ko trūksta ir kas nesueina — prieš pjaunant, ne po to.', 'The app shows what is missing or does not fit — before cutting, not after.')],
    [L('Gamyba', 'Production'), L('Detalių sąrašas, CNC programos (.XXL), pjovimo planas ir brėžiniai.', 'Parts list, CNC programs (.XXL), cutting plan and drawings.')]
  ];
  return '<section class="nvh-road" aria-labelledby="nvh-road-h"><h2 class="nvh-h2" id="nvh-road-h">' + L('Kaip tai veikia', 'How it works') + '</h2>' +
    '<ol>' + st.map(function (s, i) { return '<li><span class="nvh-road-n">' + (i + 1) + '</span><div><b>' + s[0] + '</b><p>' + s[1] + '</p></div></li>'; }).join('') + '</ol>' +
    '<p class="nvh-road-f">' + L('Projektų dar nėra. Sukurkite pirmą arba atidarykite pavyzdį ir pasižiūrėkite.', 'No projects yet. Create the first one, or open the example and look around.') + '</p></section>';
}
function nvhListHtml(all) {
  var q = String(S.homeQ || '').trim().toLowerCase(), t0 = performance.now();
  var hit = q ? all.filter(function (r) { return String(r.name || '').toLowerCase().indexOf(q) >= 0; }) : all;
  var shown = NV.hAll || q ? hit : hit.slice(0, NVH_MAX);
  NVH_RECS = {}; shown.forEach(function (r) { NVH_RECS[r.id] = r; });
  var ids = {}; all.forEach(function (r) { ids[r.id] = 1; }); Object.keys(NVH_PICS).forEach(function (k) { if (!ids[k]) delete NVH_PICS[k]; });   // pictures of deleted projects
  if (NV.hMenu && !NVH_RECS[NV.hMenu]) NV.hMenu = null;
  return '<section class="nvh-list" aria-labelledby="nvh-list-h">' +
    '<div class="nvh-list-h"><h2 class="nvh-h2" id="nvh-list-h">' + L('Tęsti', 'Continue') + '</h2><span class="nvh-cnt">' + (q ? hit.length + ' ' + L('iš', 'of') + ' ' + all.length : nvhProjs(all.length)) + '</span><span class="nv-grow"></span>' +
      (all.length > 6 || q ? '<input id="home-q" class="nvh-q" type="search" autocomplete="off" placeholder="' + esc(t('prSearch')) + '" value="' + esc(S.homeQ || '') + '" aria-label="' + esc(t('prSearch')) + '">' : '') + '</div>' +
    (shown.length ? '<div class="nvh-grid">' + shown.map(function (r) { return nvhCard(r, t0); }).join('') + '</div>'
      : '<div class="nv-empty nvh-none"><p>' + L('Projekto tokiu pavadinimu nėra.', 'No project with such a name.') + '</p><button type="button" class="nv-btn sm" data-nv="nvhClearQ">' + L('Rodyti visus', 'Show all') + '</button></div>') +
    (hit.length > shown.length ? '<button type="button" class="nv-btn nvh-all" data-nv="nvhAll">' + L('Rodyti visus', 'Show all') + ' (' + hit.length + ')</button>' : '') +
    '<p class="nvh-foot">' + t('prHint2') + '</p></section>';
}
NVSTAGE.home = function () {
  var all = nvhSorted();
  return '<div class="nvh' + (all.length ? '' : ' nvh-first') + '">' +
    '<header class="nvh-hello"><h1 class="nv-h1">' + L('Sveiki! Ką šiandien gaminame?', 'Hello! What are we making today?') + '</h1>' +
      '<p class="nv-lead">' + (all.length ? L('Pradėkite naują projektą arba tęskite pradėtą. Viskas išsaugoma savaime.', 'Start a new project or carry on with one. Everything is saved by itself.')
        : L('Nuo spintelės iki CNC programos — vienoje vietoje. Pradėkite nuo projekto pavadinimo.', 'From a cabinet to its CNC program — in one place. Start with the name of the project.')) + '</p></header>' +
    '<div class="nvh-cols">' + nvhNewHtml(all) + (all.length ? nvhListHtml(all) : nvhRoadHtml()) + '</div></div>';
};

/* ----------------------------------------------------------------- the new-cabinet chooser */
var NVH_GROUPS = [   // where the cabinet goes → indexes into the live PRESETS
  { lt: 'Apatinės', en: 'Base', hint: ['stovi ant grindų, po stalviršiu', 'on the floor, under the worktop'], ids: [0, 1, 2, 7] },
  { lt: 'Viršutinės', en: 'Wall', hint: ['kabo ant sienos', 'hung on the wall'], ids: [3] },
  { lt: 'Aukštos', en: 'Tall', hint: ['nuo grindų iki viršaus', 'from the floor to the top'], ids: [4, 5], tall: true },
  { lt: 'Kita', en: 'Other', hint: ['fasadas, plokštė, laisva konstrukcija', 'a front, a board, a free construction'], ids: [6, 8, 9], row: true }   // row: shares the row with the tall ones on a wide screen
];
var NVH_DESC = {   // one plain line: what it is for
  pDrawers: ['Trys stalčiai — puodams, indams, įrankiams.', 'Three drawers — pots, dishes, cutlery.'],
  pDoors: ['Dvejos durys ir lentyna viduje.', 'Two doors and a shelf inside.'],
  pDrDoors: ['Stalčius viršuje, durys apačioje.', 'A drawer on top, doors below.'],
  pEmpty: ['Atvira, be fasadų — tik lentynos.', 'Open, no fronts — shelves only.'],
  pWall: ['Virš stalviršio — durys ir dvi lentynos.', 'Above the worktop — doors and two shelves.'],
  pTall: ['Orkaitės niša, stalčiai apačioje, durys viršuje.', 'An oven niche, drawers below, a door above.'],
  pFridge: ['Įmontuojamam šaldytuvui — fasadai ant jo durų.', 'For a built-in fridge — the fronts go on its doors.'],
  pDish: ['Tik fasadas įmontuojamai indaplovei, be korpuso.', 'Only the front of a built-in dishwasher, no carcass.'],
  pPanel: ['Atskira plokštė: šonas, užbaigimas, intarpas.', 'A loose board: an end panel, a filler.'],
  pBox: ['Laisva dėžė iš plokščių — kai įprasta spintelė netinka.', 'A free box of boards — when a usual cabinet does not fit.']
};
function nvhSize(c) {
  var x = ' × ';
  if (c.kind === 'panel') return fmt(num(c.H)) + x + fmt(num(c.D)) + ' · ' + fmt(num(c.thick) || num(c.W)) + ' mm';
  if (c.dishwasher) return fmt(num(c.dishWidth)) + x + fmt(num(c.H)) + ' mm';
  return fmt(num(c.W)) + x + fmt(num(c.H)) + x + fmt(num(c.D)) + ' mm';
}
function nvhPreset(i, tall) {
  var p = PRESETS[i], c = fromPreset(p), icon = !!(p.panel || p.box), pic = null;
  if (!icon) {   // the picture of the cabinet this click would make (it takes the last cabinet's materials) — built once, kept until that changes
    var key = JSON.stringify(c, function (k, v) { return k === 'id' ? undefined : v; }), hit = NVH_PRE[i];
    if (!hit || hit.key !== key) hit = NVH_PRE[i] = { key: key, pic: nvhPic(c, 0, 'X') };
    pic = hit.pic;
  }
  var d = NVH_DESC[p.k] || ['', ''];
  return '<button type="button" class="nvh-pre" data-nv="nvhPreset" data-i="' + i + '">' +
    '<span class="nvh-pre-pic' + (tall ? ' tall' : '') + '">' + (pic ? nvhPicBox(pic, 150, tall ? 176 : 116, pic.wall ? 'wall' : '') : '<span class="nvh-pre-ico" aria-hidden="true">' + ico(p.k) + '</span>') + '</span>' +
    '<b>' + t(p.k) + '</b><small class="nv-num">' + nvhSize(c) + '</small><span class="nvh-pre-d">' + L(d[0], d[1]) + '</span></button>';
}
function nvPicker() {
  var has = S.proj.cabinets.length > 0, nLib = clib().items.length;
  var libHtml = nLib ? '<section class="nvh-lib">' + viewLib().replace(/data-act="libadd"/g, 'data-nv="nvhLibAdd"') + '</section>'   // the live library; its "add" goes through nvhLibAdd so the new cabinet opens on "Dydis"
    : '<p class="nvh-libnone"><span aria-hidden="true">☆</span> ' + L('Dažnai daromą spintelę galite išsaugoti bibliotekoje (spintelės lange „Į biblioteką“) — tada ji bus čia, visuose projektuose.', 'A cabinet you make often can be saved to the library ("Save to library" in the cabinet) — then it is here, in every project.') + '</p>';
  return '<div class="nvh-pick">' +
    '<header class="nvh-pick-h"><div><h1 class="nv-h1">' + (has ? t('pickTitle') : t('firstCabQ')) + '</h1>' +
      '<p class="nv-lead">' + t('pickLead') + ' ' + L('Dydžiai — plotis × aukštis × gylis.', 'Sizes are width × height × depth.') + '</p></div>' +
      (has ? '<button type="button" class="nv-btn" data-act="unpick">' + t('cancel') + '</button>' : '') + '</header>' +
    libHtml +
    (nLib ? '<h2 class="nvh-h2 nvh-newt">' + t('libNewT') + '</h2>' : '') +
    '<div class="nvh-groups">' + NVH_GROUPS.map(function (g) {
      return '<section class="nvh-grp' + (g.tall ? ' tall' : '') + (g.row ? ' row2' : '') + '" style="--n:' + g.ids.length + '"><h3><b>' + L(g.lt, g.en) + '</b><span>' + L(g.hint[0], g.hint[1]) + '</span></h3>' +
        '<div class="nvh-pres">' + g.ids.filter(function (i) { return PRESETS[i]; }).map(function (i) { return nvhPreset(i, g.tall); }).join('') + '</div></section>';
    }).join('') + '</div></div>';
}
/* a new cabinet opens where its first question is asked: topic "Dydis", the width selected */
function nvhOpenNew(c) {
  S.sel = S.proj.cabinets.length - 1; S.picking = false; S.confirm = null; S.colSel = 0; S.iso = null; S.jcheck = false; S.echeck = false;
  NV.topic = 'size'; NV.secSel = null; NV.flash = c.dishwasher ? 'f-c-dishWidth' : c.kind === 'panel' ? 'f-c-H' : 'f-c-W';
  save(); window.scrollTo(0, 0);
}
NVA.nvhPreset = function (el, v, i) {   // the live 'preset' command, then the place to start
  if (!S.proj || !PRESETS[i]) return false;
  var c = fromPreset(PRESETS[i]); S.proj.cabinets.push(c); nvhOpenNew(c);
};
NVA.nvhLibAdd = function (el, v) {      // the live 'libadd' command, then the place to start
  var la = clib().items.filter(function (it) { return it.id === v; })[0]; if (!la || !S.proj) return false;
  var nc = normCab(Object.assign(clone(la.cab), { id: uid(), libFrom: la.id }));
  S.proj.cabinets.push(nc); nvhOpenNew(nc); toast(t('libAdded').replace('{n}', la.name));
};
