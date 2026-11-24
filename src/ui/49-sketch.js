/* 49-sketch.js — sketch on a board: cutouts (rectangles — also notches over an edge — and round holes) drawn on the
   board's face, kept with the cabinet (c.nvCuts[<part key>] = [{ k:'rect', x, y, w, h } | { k:'circ', x, y, d }], mm from
   the board's own corner: x along its length, y along its width) and shown at once in the 3-D picture.
   The CNC programs come from the live engine, which does not know these cutouts — so each board with a sketch raises a
   warning in the check ("cut by hand from the drawing") until the engine can machine them. */
var NVS = { cab: null, key: null, tool: 'rect', sel: -1, drag: null, el: null };
function nvsPanel() { var c = cur(), inf = S._info && S._info[S.sel]; if (!c || !inf || !inf.r || c.id !== NVS.cab) return null; return inf.r.panels.filter(function (p) { return p.key === NVS.key; })[0] || null; }
function nvsCuts(make) { var c = cur(); if (!c) return []; if (!c.nvCuts) { if (!make) return []; c.nvCuts = {}; } if (!c.nvCuts[NVS.key]) { if (!make) return []; c.nvCuts[NVS.key] = []; } return c.nvCuts[NVS.key]; }
function nvsOpen(part) {
  var c = cur(), inf = S._info && S._info[S.sel], p = c && inf && inf.r ? inf.r.panels.filter(function (q) { return q.name === part.name; })[0] : null; if (!p) return;
  NVS.cab = c.id; NVS.key = p.key; NVS.sel = -1; NVS.title = typeof nvpName === 'function' ? nvpName(part, p) : p.short; nvsPaint(); if (typeof nv3Build === 'function') nv3Build();
}
function nvsClose() { if (NVS.el) NVS.el.remove(); NVS.el = null; NVS.key = null; NVS.cab = null; if (typeof nv3Build === 'function') nv3Build(); }
function nvsCommit() { var c = cur(), L0 = nvsCuts(); if (c && c.nvCuts && !L0.length) { delete c.nvCuts[NVS.key]; if (!Object.keys(c.nvCuts).length) delete c.nvCuts; } save(); NV.issues = null; if (typeof nv3Build === 'function') nv3Build(); if (typeof nvLive === 'function') nvLive(); }
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
      '<text x="' + p.L / 2 + '" y="' + (p.W + pad * 0.75) + '" text-anchor="middle" font-size="' + pad * 0.5 + '">X → ' + fmt(p.L) + '</text><text x="' + (-pad * 0.3) + '" y="' + p.W / 2 + '" text-anchor="middle" font-size="' + pad * 0.5 + '" transform="rotate(-90 ' + (-pad * 0.3) + ' ' + p.W / 2 + ')">Y → ' + fmt(p.W) + '</text><circle cx="0" cy="' + p.W + '" r="' + sw * 3 + '" fill="#b3261e"/></svg>' +
    '<p class="nv-hint">' + L('Tempkite ant plokštės — nubrėžiama išpjova (kas 5 mm; tikslius matmenis įrašykite žemiau). Tempkite esamą — perkeliama. Stačiakampis gali išeiti per kraštą — bus įpjova. Raudonas taškas — X=0, Y=0; pilkos skylutės — CNC gręžimai. Plokštė 3D vaizde paryškinta mėlynai.', 'Drag on the board to draw a cutout (5 mm steps; type exact sizes below). Drag an existing one to move it. A rectangle may run over the edge — a notch. The red dot is X=0, Y=0; grey dots are CNC drillings. The board is tinted blue in the 3-D view.') + '</p>' +
    (rows ? '<div class="nvs-list">' + rows + '</div>' : '<div class="nv-empty" style="padding:14px">' + L('Išpjovų dar nėra', 'No cutouts yet') + '</div>') +
    (cuts.length ? '<div class="nv-issue warn" style="margin-top:10px"><span>' + L('CNC programa šių išpjovų dar nedaro — jos pjaunamos rankomis pagal šį eskizą. Patikroje bus įspėjimas.', 'The CNC program does not cut these yet — they are cut by hand from this sketch. The check will show a warning.') + '</span></div>' : '') +
    '<div class="nvs-f"><button type="button" class="nv-btn sm danger" data-clear="1"' + (cuts.length ? '' : ' disabled') + '>' + L('Pašalinti visas', 'Remove all') + '</button><button type="button" class="nv-btn sm pri" data-x="1">' + L('Gerai', 'Done') + '</button></div>';
}
function nvsWire(d) {
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
    var hit = e.target.closest('.nvs-c'), a = pt(e);
    if (hit) { var i = +hit.getAttribute('data-i'), q = nvsCuts()[i]; NVS.sel = i; NVS.drag = { move: i, a: a, x0: q.x, y0: q.y }; }
    else { var p = nvsPanel(), x = Math.max(0, Math.min(p.L, sn(a[0]))), y = Math.max(0, Math.min(p.W, sn(a[1]))); NVS.drag = { make: true, a: [x, y] }; }
    try { sv.setPointerCapture(e.pointerId); } catch (er) {} });
  d.addEventListener('pointermove', function (e) { var D = NVS.drag; if (!D) return; var a = pt(e), cuts = nvsCuts(true), p = nvsPanel();
    if (D.move != null) { var q = cuts[D.move]; q.x = sn(D.x0 + a[0] - D.a[0]); q.y = sn(D.y0 + a[1] - D.a[1]); D.moved = true; }
    else { var x = sn(a[0]), y = sn(a[1]); if (Math.abs(x - D.a[0]) < 5 && Math.abs(y - D.a[1]) < 5) return;
      if (D.i == null) { cuts.push(NVS.tool === 'circ' ? { k: 'circ', x: D.a[0], y: D.a[1], d: 10 } : { k: 'rect', x: D.a[0], y: D.a[1], w: 5, h: 5 }); D.i = cuts.length - 1; NVS.sel = D.i; }
      var c2 = cuts[D.i]; if (c2.k === 'circ') c2.d = Math.max(5, sn(2 * Math.hypot(a[0] - D.a[0], a[1] - D.a[1]))); else { c2.x = Math.min(D.a[0], x); c2.y = Math.min(D.a[1], y); c2.w = Math.abs(x - D.a[0]); c2.h = Math.abs(y - D.a[1]); } D.moved = true; }
    void p; nvsPaint(); if (typeof nv3Build === 'function') nv3Build(); });
  d.addEventListener('pointerup', function () { var D = NVS.drag; NVS.drag = null; if (!D) return; if (D.moved) nvsCommit(); nvsPaint(); });
}
NVAFTER.push(function () { if (NVS.key && !nvsPanel()) nvsClose(); else if (NVS.key && (S.home || S.tab !== 'cab')) nvsClose(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && NVS.el && document.activeElement.tagName !== 'INPUT') nvsClose(); });
/* the check: a sketched board is not machined by the program */
var nvsBaseIssues = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var out = nvsBaseIssues(proj, info) || [];
  (proj ? proj.cabinets : []).forEach(function (c, i) { Object.keys(c.nvCuts || {}).forEach(function (k) { var n = (c.nvCuts[k] || []).length; if (!n) return;
    var p = info[i] && info[i].r ? info[i].r.panels.filter(function (q) { return q.key === k; })[0] : null;
    if (!p) { out.push({ id: 'cuts.lost', sev: 'warn', cab: i, topic: 'review', field: null, msg: L('Eskizas detalei „' + k + '“, kurios spintelėje nebėra (' + n + ' išpjov.)', 'A sketch for the part "' + k + '" that the cabinet no longer has (' + n + ' cutouts)'), hint: L('Detalė dingo pakeitus spintelę. Patvirtinkite arba grąžinkite detalę.', 'The part went away when the cabinet changed.') }); return; }
    out.push({ id: 'cuts.manual.' + k, sev: 'warn', cab: i, topic: 'review', field: null, msg: L('Detalė ' + (p.short || k) + ': ' + n + ' išpjov. pagal eskizą — CNC programoje jų nėra, pjaunama rankomis', 'Part ' + (p.short || k) + ': ' + n + ' sketched cutout(s) — not in the CNC program, cut by hand'), hint: L('Atsispausdinkite eskizą arba pažymėkite ant detalės.', 'Print the sketch or mark it on the part.'), raw: 'cuts ' + JSON.stringify(c.nvCuts[k]) });
  }); });
  return out;
};
