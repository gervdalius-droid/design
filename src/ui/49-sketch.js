/* 49-sketch.js — sketch on a board: cutouts (rectangles — also notches over an edge — and round holes) drawn on the
   board's face, kept with the cabinet (c.nvCuts[<part key>] = [{ k:'rect', x, y, w, h } | { k:'circ', x, y, d }], mm from
   the board's own corner: x along its length, y along its width) and shown at once in the 3-D picture.
   Drawing snaps to the board's edges and middle, the other cutouts and the CNC drillings. What the machine can make of
   them goes into the CNC programs with the workshop's own router settings (see nvsToCnc below); the rest is flagged. */
var NVS = { cab: null, key: null, tool: 'rect', sel: -1, drag: null, el: null, guides: null };
function nvsPanel() { var c = cur(), inf = S._info && S._info[S.sel]; if (!c || !inf || !inf.r || c.id !== NVS.cab) return null; return inf.r.panels.filter(function (p) { return p.key === NVS.key; })[0] || null; }
function nvsCuts(make) { var c = cur(); if (!c) return []; if (!c.nvCuts) { if (!make) return []; c.nvCuts = {}; } if (!c.nvCuts[NVS.key]) { if (!make) return []; c.nvCuts[NVS.key] = []; } return c.nvCuts[NVS.key]; }
function nvsOpen(part) {
  var c = cur(), inf = S._info && S._info[S.sel], p = c && inf && inf.r ? inf.r.panels.filter(function (q) { return q.name === part.name; })[0] : null; if (!p) return;
  NVS.cab = c.id; NVS.key = p.key; NVS.sel = -1; NVS.title = typeof nvpName === 'function' ? nvpName(part, p) : p.short; nvsPaint(); if (typeof nv3Build === 'function') nv3Build();
}
function nvsClose() { if (NVS.el) NVS.el.remove(); NVS.el = null; NVS.key = null; NVS.cab = null; if (typeof nv3Build === 'function') nv3Build(); }
function nvsCommit() { var c = cur(), L0 = nvsCuts(); if (c && c.nvCuts && !L0.length) { delete c.nvCuts[NVS.key]; if (!Object.keys(c.nvCuts).length) delete c.nvCuts; } save(); refreshLive(); }   // the cabinet is rebuilt: the programs, the check and the 3-D picture follow
function nvsPaint() {
  var p = nvsPanel(); if (!p) { nvsClose(); return; }
  var d = NVS.el; if (!d) { d = NVS.el = document.createElement('div'); d.className = 'nvs nv-card'; document.body.appendChild(d); nvsWire(d); }
  var cuts = nvsCuts(), pad = Math.max(p.L, p.W) * 0.06, n1 = function (v) { return Math.round(v * 10) / 10; }, sw = Math.max(p.L, p.W) / 380;
  var grid = '', step = Math.max(p.L, p.W) > 900 ? 100 : 50; for (var gx = step; gx < p.L; gx += step) grid += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + p.W + '"/>'; for (var gy = step; gy < p.W; gy += step) grid += '<line x1="0" y1="' + gy + '" x2="' + p.L + '" y2="' + gy + '"/>';
  var holes = (p.holes || []).map(function (h) { return '<circle cx="' + n1(h.x) + '" cy="' + n1(p.W - h.y) + '" r="' + Math.max(2, (h.d || 5) / 2) + '"/>'; }).join('');
  var shapes = cuts.map(function (q, i) { var on = i === NVS.sel ? ' on' : '';
    return q.k === 'circ' ? '<circle class="nvs-c' + on + '" data-i="' + i + '" cx="' + n1(q.x) + '" cy="' + n1(p.W - q.y) + '" r="' + n1(q.d / 2) + '" stroke-width="' + sw * 1.5 + '"/>'
      : '<rect class="nvs-c' + on + '" data-i="' + i + '" x="' + n1(q.x) + '" y="' + n1(p.W - q.y - q.h) + '" width="' + n1(q.w) + '" height="' + n1(q.h) + '" stroke-width="' + sw * 1.5 + '"/>'; }).join('');
  var f = function (i, k, label, v) { return '<label><span>' + label + '</span><input type="text" inputmode="decimal" data-i="' + i + '" data-k="' + k + '" value="' + n1(v) + '"></label>'; };
  var rows = cuts.map(function (q, i) { return '<div class="nvs-row' + (i === NVS.sel ? ' on' : '') + '" data-row="' + i + '"><b>' + (q.k === 'circ' ? '◯' : '▭') + '</b>' + f(i, 'x', q.k === 'circ' ? L('Centras X', 'Centre X') : 'X', q.x) + f(i, 'y', q.k === 'circ' ? L('Centras Y', 'Centre Y') : 'Y', q.y) +
    (q.k === 'circ' ? f(i, 'd', L('Skersmuo', 'Diameter'), q.d) : f(i, 'w', L('Ilgis', 'Length'), q.w) + f(i, 'h', L('Plotis', 'Width'), q.h)) + '<button type="button" class="nv-ic" data-del="' + i + '" title="' + esc(L('Pašalinti', 'Remove')) + '">✕</button></div>'; }).join('');
  d.innerHTML = '<div class="nvs-h"><div><b>' + L('Eskizas', 'Sketch') + ' — ' + esc(NVS.title || p.short || p.role) + '</b><small>' + fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + fmt(p.T) + ' mm</small></div><button type="button" class="nv-ic" data-x="1" aria-label="' + esc(t('close')) + '">✕</button></div>' +
    '<div class="nvs-tools"><button type="button" data-tool="rect" class="nv3-b' + (NVS.tool === 'rect' ? ' on' : '') + '">▭ ' + L('Stačiakampė išpjova', 'Rectangular cutout') + '</button><button type="button" data-tool="circ" class="nv3-b' + (NVS.tool === 'circ' ? ' on' : '') + '">◯ ' + L('Apvali skylė', 'Round hole') + '</button></div>' +
    '<svg class="nvs-svg" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (p.L + 2 * pad) + ' ' + (p.W + 2 * pad) + '" preserveAspectRatio="xMidYMid meet"><rect class="nvs-board" x="0" y="0" width="' + p.L + '" height="' + p.W + '" stroke-width="' + sw + '"/><g class="nvs-grid" stroke-width="' + sw * 0.4 + '">' + grid + '</g><g class="nvs-holes">' + holes + '</g>' + shapes +
      (NVS.guides ? NVS.guides.X.map(function (v) { return '<line class="nvs-guide" x1="' + v + '" y1="' + (-pad) + '" x2="' + v + '" y2="' + (p.W + pad) + '" stroke-width="' + sw + '"/>'; }).join('') + NVS.guides.Y.map(function (v) { return '<line class="nvs-guide" x1="' + (-pad) + '" y1="' + (p.W - v) + '" x2="' + (p.L + pad) + '" y2="' + (p.W - v) + '" stroke-width="' + sw + '"/>'; }).join('') : '') +
      (NVS.drag && NVS.sel >= 0 && cuts[NVS.sel] ? (function (q) { return '<text class="nvs-live" x="' + (q.x + (q.w || 0) / 2) + '" y="' + (p.W - q.y - (q.h || 0) - pad * 0.25) + '" text-anchor="middle" font-size="' + pad * 0.55 + '">' + (q.k === 'circ' ? 'Ø' + n1(q.d) + ' · ' + n1(q.x) + ', ' + n1(q.y) : n1(q.w) + ' × ' + n1(q.h) + ' · ' + n1(q.x) + ', ' + n1(q.y)) + '</text>'; })(cuts[NVS.sel]) : '') +
      '<text x="' + p.L / 2 + '" y="' + (p.W + pad * 0.75) + '" text-anchor="middle" font-size="' + pad * 0.5 + '">X → ' + fmt(p.L) + '</text><text x="' + (-pad * 0.3) + '" y="' + p.W / 2 + '" text-anchor="middle" font-size="' + pad * 0.5 + '" transform="rotate(-90 ' + (-pad * 0.3) + ' ' + p.W / 2 + ')">Y → ' + fmt(p.W) + '</text><circle cx="0" cy="' + p.W + '" r="' + sw * 3 + '" fill="#b3261e"/></svg>' +
    '<p class="nv-hint">' + L('Tempkite ant plokštės — nubrėžiama išpjova (kas 5 mm; tikslius matmenis įrašykite žemiau). Tempkite esamą — perkeliama. Stačiakampis gali išeiti per kraštą — bus įpjova. Raudonas taškas — X=0, Y=0; pilkos skylutės — CNC gręžimai. Plokštė 3D vaizde paryškinta mėlynai.', 'Drag on the board to draw a cutout (5 mm steps; type exact sizes below). Drag an existing one to move it. A rectangle may run over the edge — a notch. The red dot is X=0, Y=0; grey dots are CNC drillings. The board is tinted blue in the 3-D view.') + '</p>' +
    (rows ? '<div class="nvs-list">' + rows + '</div>' : '<div class="nv-empty" style="padding:14px">' + L('Išpjovų dar nėra', 'No cutouts yet') + '</div>') +
    (cuts.length ? (function () { var R0 = E.R.rout, st = p.nvCut || { cnc: 0, hand: 0, why: [] };
      return '<div class="nv-issue ' + (st.hand ? 'warn' : 'info') + '" style="margin-top:10px"><span>' + (st.cnc ? L('CNC: ' + st.cnc + ' išpjov. frezuojama jūsų freza T' + R0.T + ' Ø' + R0.dia + ' (' + R0.feedCut + ' mm/min), paliekama ' + R0.skin + ' mm, kampai R' + (R0.dia / 2) + '; kiauros skylės Ø5 / Ø8 gręžiamos. ', 'CNC: ' + st.cnc + ' cutout(s) routed with your tool T' + R0.T + ' Ø' + R0.dia + ' (' + R0.feedCut + ' mm/min), ' + R0.skin + ' mm left, corners R' + (R0.dia / 2) + '; through holes Ø5 / Ø8 are drilled. ') : '') +
        (st.hand ? L('Rankomis: ' + st.hand + ' (' + st.why.join(', ') + ').', 'By hand: ' + st.hand + ' (' + st.why.join(', ') + ').') : '') + '</span></div>'; })() : '') +
    '<div class="nvs-f"><button type="button" class="nv-btn sm danger" data-clear="1"' + (cuts.length ? '' : ' disabled') + '>' + L('Pašalinti visas', 'Remove all') + '</button><button type="button" class="nv-btn sm pri" data-x="1">' + L('Gerai', 'Done') + '</button></div>';
}
function nvsWire(d) {
  /* snapping: to the board's edges and middle, to the other cutouts' edges and centres, to the CNC drillings; else to 5 mm.
     Returns the snapped value; the lines snapped to are kept in NVS.guides and drawn while dragging. */
  var cands = function (skip) { var p = nvsPanel(), X = [0, p.L / 2, p.L], Y = [0, p.W / 2, p.W];
    nvsCuts().forEach(function (q, i) { if (i === skip) return; if (q.k === 'circ') { X.push(q.x); Y.push(q.y); } else { X.push(q.x, q.x + q.w / 2, q.x + q.w); Y.push(q.y, q.y + q.h / 2, q.y + q.h); } });
    (p.holes || []).forEach(function (h) { X.push(h.x); Y.push(h.y); }); return { X: X, Y: Y }; };
  var tol = function () { var sv = d.querySelector('.nvs-svg'), p = nvsPanel(); return 9 * (p.L + 2 * Math.max(p.L, p.W) * 0.06) / Math.max(1, sv.getBoundingClientRect().width); };
  var snap1 = function (v, list, axis, offs) {   // offs: the offsets of the dragged shape's own lines from v (an edge, the middle, the other edge)
    var best = null; (offs || [0]).forEach(function (o) { list.forEach(function (c) { var dd = Math.abs(v + o - c); if (dd < tol() && (!best || dd < best.d)) best = { d: dd, v: c - o, line: c }; }); });
    if (best) { NVS.guides[axis].push(best.line); return Math.round(best.v * 10) / 10; } return Math.round(v / 5) * 5; };
  var pt = function (e) { var sv = d.querySelector('.nvs-svg'), p = nvsPanel(), q = sv.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; q = q.matrixTransform(sv.getScreenCTM().inverse()); return [q.x, p.W - q.y]; }, sn = function (v) { return Math.round(v / 5) * 5; };
  d.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) { var row = e.target.closest('[data-row]'); if (row && e.target.tagName !== 'INPUT') { NVS.sel = +row.getAttribute('data-row'); nvsPaint(); } return; }
    if (b.getAttribute('data-x')) return nvsClose();
    if (b.getAttribute('data-tool')) { NVS.tool = b.getAttribute('data-tool'); return nvsPaint(); }
    if (b.getAttribute('data-del') != null) { nvsCuts(true).splice(+b.getAttribute('data-del'), 1); NVS.sel = -1; nvsCommit(); return nvsPaint(); }
    if (b.getAttribute('data-clear')) { var c = cur(); if (c.nvCuts) delete c.nvCuts[NVS.key]; NVS.sel = -1; nvsCommit(); return nvsPaint(); } });
  d.addEventListener('change', function (e) { var el = e.target, i = el.getAttribute('data-i'), k = el.getAttribute('data-k'); if (i == null || !k) return; var q = nvsCuts()[+i], v = num(el.value); if (!q) return;
    if ((k === 'w' || k === 'h' || k === 'd') && !(v > 0)) { el.value = q[k]; return; } q[k] = Math.round(v * 10) / 10; NVS.sel = +i; nvsCommit(); nvsPaint(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.tagName !== 'INPUT' && NVS.sel >= 0) { nvsCuts(true).splice(NVS.sel, 1); NVS.sel = -1; nvsCommit(); nvsPaint(); } });
  d.addEventListener('pointerdown', function (e) { var sv = e.target.closest && e.target.closest('.nvs-svg'); if (!sv || e.button !== 0) return; e.preventDefault();
    var hit = e.target.closest('.nvs-c'), a = pt(e); NVS.guides = { X: [], Y: [] };
    if (hit) { var i = +hit.getAttribute('data-i'), q = nvsCuts()[i]; NVS.sel = i; NVS.drag = { move: i, a: a, x0: q.x, y0: q.y }; }
    else { var C = cands(-1); NVS.drag = { make: true, a: [snap1(a[0], C.X, 'X'), snap1(a[1], C.Y, 'Y')] }; }
    try { sv.setPointerCapture(e.pointerId); } catch (er) {} });
  d.addEventListener('pointermove', function (e) { var D = NVS.drag; if (!D) return; var a = pt(e), cuts = nvsCuts(true); NVS.guides = { X: [], Y: [] };
    if (D.move != null) { var q = cuts[D.move], C1 = cands(D.move), rx = D.x0 + a[0] - D.a[0], ry = D.y0 + a[1] - D.a[1];
      q.x = snap1(rx, C1.X, 'X', q.k === 'circ' ? [0] : [0, q.w / 2, q.w]); q.y = snap1(ry, C1.Y, 'Y', q.k === 'circ' ? [0] : [0, q.h / 2, q.h]); D.moved = true; }
    else { if (Math.hypot(a[0] - D.a[0], a[1] - D.a[1]) < 6) return;
      if (D.i == null) { cuts.push(NVS.tool === 'circ' ? { k: 'circ', x: D.a[0], y: D.a[1], d: 10 } : { k: 'rect', x: D.a[0], y: D.a[1], w: 5, h: 5 }); D.i = cuts.length - 1; NVS.sel = D.i; }
      var c2 = cuts[D.i], C2 = cands(D.i);
      if (c2.k === 'circ') { var rr = Math.hypot(a[0] - D.a[0], a[1] - D.a[1]), std = [5, 8, 10, 15, 20, 26, 35, 40, 50, 60, 68, 80], dd = 2 * rr, near = std.filter(function (v) { return Math.abs(v - dd) < Math.max(2, tol()); })[0]; c2.d = near || Math.max(5, Math.round(dd / 5) * 5); }
      else { var x = snap1(a[0], C2.X, 'X'), y = snap1(a[1], C2.Y, 'Y'); c2.x = Math.min(D.a[0], x); c2.y = Math.min(D.a[1], y); c2.w = Math.abs(x - D.a[0]); c2.h = Math.abs(y - D.a[1]); } D.moved = true; }
    nvsPaint(); if (typeof nv3Build === 'function') nv3Build(); });
  d.addEventListener('pointerup', function () { var D = NVS.drag; NVS.drag = null; NVS.guides = null; if (!D) return; if (D.moved) { var L0 = nvsCuts(); if (D.i != null && L0[D.i] && L0[D.i].k === 'rect' && !(L0[D.i].w > 0 && L0[D.i].h > 0)) { L0.splice(D.i, 1); NVS.sel = -1; } nvsCommit(); } nvsPaint(); });
}
NVAFTER.push(function () { if (NVS.key && !nvsPanel()) nvsClose(); else if (NVS.key && (S.home || S.tab !== 'cab')) nvsClose(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && NVS.el && document.activeElement.tagName !== 'INPUT') nvsClose(); });
/* ---- CNC. The engine already routes with the workshop's router (rules R.rout: tool T96 "DEIMANTAS 16MM", Ø15.5, feeds,
   ramp, lead-in, and R.rout.skin = 2 mm that is always left — the SCM Startech does not cut through with it). The
   cutouts are handed to that same writer as grooves on face A, so they come out exactly like the LED grooves do:
     • a rectangle: its outline routed inside the line (four passes; one pocket when it is narrow), to T − skin;
       a side that lies on or outside the board's edge is left open (a notch) — inner corners get the cutter's radius;
     • a round hole of a through-drill size (R.drills.through: Ø5, Ø8): drilled through;
     • anything else (other round holes, rectangles smaller than the cutter): by hand — said in the check.
   Done by wrapping E.buildCabinet, the one door every build and every export goes through. */
var nvsEngineBuild = E.buildCabinet;
E.buildCabinet = function (def) {
  var r = nvsEngineBuild.apply(E, arguments);
  try { nvsToCnc(def, r); } catch (e) { if (window.console) console.error(e); }
  return r;
};
function nvsToCnc(def, r) {
  var cuts = def && def.nvCuts; if (!cuts || !r || !r.panels) return;
  var D = +E.R.rout.dia || 15.5, thr = (E.R.drills && E.R.drills.through) || [5, 8];
  Object.keys(cuts).forEach(function (key) {
    var p = r.panels.filter(function (q) { return q.key === key; })[0], list = cuts[key] || []; if (!p || !list.length) return;
    p.grooves = p.grooves || []; p.holes = p.holes || []; p.nvCut = { cnc: 0, hand: 0, why: [] };
    list.forEach(function (q) {
      if (q.k === 'circ') {
        var inb = q.x - q.d / 2 >= 3 && q.y - q.d / 2 >= 3 && q.x + q.d / 2 <= p.L - 3 && q.y + q.d / 2 <= p.W - 3;
        if (inb && thr.indexOf(+q.d) >= 0) { p.holes.push({ face: 'A', x: +q.x, y: +q.y, d: +q.d, depth: 0, through: true, nv: true }); p.nvCut.cnc++; }
        else { p.nvCut.hand++; p.nvCut.why.push('Ø' + q.d); }
        return;
      }
      var x0 = Math.max(0, q.x), x1 = Math.min(p.L, q.x + q.w), y0 = Math.max(0, q.y), y1 = Math.min(p.W, q.y + q.h), w = x1 - x0, h = y1 - y0;
      if (!(w >= D - 0.01 && h >= D - 0.01)) { p.nvCut.hand++; p.nvCut.why.push(Math.round(w) + '×' + Math.round(h)); return; }
      var g = function (a0, a1, b0, b1) { p.grooves.push({ x0: a0, x1: a1, y0: b0, y1: b1, face: 'A', depth: p.T, name: 'ISPJOVA', nv: true }); };
      if (Math.min(w, h) <= 2.2 * D) g(x0, x1, y0, y1);   // narrow: cleared as one pocket
      else {
        if (q.y > 0.01) g(x0, x1, y0, y0 + D); if (q.y + q.h < p.W - 0.01) g(x0, x1, y1 - D, y1);
        if (q.x > 0.01) g(x0, x0 + D, y0, y1); if (q.x + q.w < p.L - 0.01) g(x1 - D, x1, y0, y1);
      }
      p.nvCut.cnc++;
    });
  });
}
/* the check: a sketched board is not machined by the program */
var nvsBaseIssues = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var out = nvsBaseIssues(proj, info) || [];
  (proj ? proj.cabinets : []).forEach(function (c, i) { Object.keys(c.nvCuts || {}).forEach(function (k) { var n = (c.nvCuts[k] || []).length; if (!n) return;
    var p = info[i] && info[i].r ? info[i].r.panels.filter(function (q) { return q.key === k; })[0] : null;
    if (!p) { out.push({ id: 'cuts.lost', sev: 'warn', cab: i, topic: 'review', field: null, msg: L('Eskizas detalei „' + k + '“, kurios spintelėje nebėra (' + n + ' išpjov.)', 'A sketch for the part "' + k + '" that the cabinet no longer has (' + n + ' cutouts)'), hint: L('Detalė dingo pakeitus spintelę. Patvirtinkite arba grąžinkite detalę.', 'The part went away when the cabinet changed.') }); return; }
    var st = p.nvCut || { cnc: 0, hand: n, why: [] }, R0 = E.R.rout, nm = p.short || k;
    if (st.cnc) out.push({ id: 'cuts.cnc.' + k, sev: 'warn', cab: i, topic: 'review', field: null, raw: 'cnc ' + JSON.stringify(c.nvCuts[k]),
      msg: L('Detalė ' + nm + ': ' + st.cnc + ' išpjov. frezuojama CNC — freza T' + R0.T + ' Ø' + R0.dia + ', paliekamas ' + R0.skin + ' mm sluoksnis, vidiniai kampai R' + (R0.dia / 2), 'Part ' + nm + ': ' + st.cnc + ' cutout(s) routed on the CNC — tool T' + R0.T + ' Ø' + R0.dia + ', ' + R0.skin + ' mm skin left, inner corners R' + (R0.dia / 2)),
      hint: L('Nauja operacija, dar nepatikrinta staklėse: pirmą detalę paleiskite stebėdami. Likusį sluoksnį ir kampus sutvarkykite rankomis.', 'A new operation, not yet verified on the machine: watch the first part. Finish the skin and the corners by hand.') });
    if (st.hand) out.push({ id: 'cuts.manual.' + k, sev: 'warn', cab: i, topic: 'review', field: null, raw: 'hand ' + JSON.stringify(c.nvCuts[k]),
      msg: L('Detalė ' + nm + ': ' + st.hand + ' išpjov. (' + st.why.join(', ') + ') CNC nedaro — pjaunama rankomis pagal eskizą', 'Part ' + nm + ': ' + st.hand + ' cutout(s) (' + st.why.join(', ') + ') are not made on the CNC — cut by hand from the sketch'),
      hint: L('CNC daro: stačiakampius ne mažesnius už frezą (Ø' + R0.dia + ') ir kiauras skyles Ø' + ((E.R.drills || {}).through || [5, 8]).join(', Ø') + '.', 'The CNC makes rectangles no smaller than the cutter (Ø' + R0.dia + ') and through holes Ø' + ((E.R.drills || {}).through || [5, 8]).join(', Ø') + '.') });
  }); });
  return out;
};
