/* 48-view3.js — the 3-D picture of a cabinet, drawn on the graphics card (three.js, the same library the realistic
   room picture loads). Replaces the live software-drawn view in the cabinet workspace: smooth turning at full
   sharpness, lit boards with crisp outlines, doors that swing on their hinges and drawers that run out, and — in the
   same picture — click a board to change it, or switch "Kraštai" on and click an edge to band it.
   Built from the engine's real parts (r.panels with their placement), so it shows exactly what will be cut.
   The live view stays for what this one does not do yet: editing connectors (Jungtys) and 3-D constructions.
   Cabinet axes: x right, y from the front to the back, z up → the whole model sits in a group turned −90° about x. */
var NV3 = { T: null, OC: null, loading: false, failed: false, R: null, scene: null, cam: null, ctl: null, root: null, env: null,
  open: 0.65, mode: 'assembly', edges: false, focus: null, joints: false, jSel: null, jBoth: true, jpick: [], jdrag: null, dims: true, handles: false, hw: true, full: false,
  pick: [], labels: [], links: [], hover: null, cabId: null, raf: 0, down: null, mats: {} };
function nv3Load() {
  if (NV3.T || NV3.loading || NV3.failed) return;
  NV3.loading = true;
  Promise.all([import('three'), import('three/examples/jsm/controls/OrbitControls.js'), import('three/examples/jsm/environments/RoomEnvironment.js')]).then(function (m) {
    NV3.T = m[0]; NV3.OC = m[1].OrbitControls; NV3.RE = m[2].RoomEnvironment; NV3.loading = false;
    if (!S.home && S.tab === 'cab' && NV.view === '3d') {   // show it — without disturbing a field that is being typed in (its selection is kept)
      var ae = document.activeElement, id = ae && ae.id, a0 = null, a1 = null; try { a0 = ae.selectionStart; a1 = ae.selectionEnd; } catch (e) {}
      render();
      var el = id && document.getElementById(id); if (el && a0 != null) { try { el.setSelectionRange(a0, a1); } catch (e2) {} }
    }
  }).catch(function (e) { NV3.failed = true; NV3.loading = false; if (window.console) console.warn('three.js not loaded — the built-in 3-D view is used', e); });
}
function nv3On() { var c = cur(); if (NV.r3off === 'box' && c && c.kind !== 'box') NV.r3off = null;   /* the board editor belongs to free constructions only */
  return NV.view === '3d' && !NV.r3off && !!NV3.T && !NV3.failed && !!c; }
/* the markup of the view; null → the live view is used (30-editor.js asks) */
function nv3Html() {
  nv3Load(); if (!nv3On()) return null;
  var b = function (attr, label, on, title) { return '<button type="button" class="nv3-b' + (on ? ' on' : '') + '" data-nv="nv3" data-v="' + attr + '"' + (on != null ? ' aria-pressed="' + !!on + '"' : '') + (title ? ' title="' + esc(title) + '"' : '') + '>' + label + '</button>'; };
  var c = cur(), fp = NV3.focus && S._info[S.sel] && S._info[S.sel].r.panels.filter(function (p) { return p.key === NV3.focus; })[0];
  if (NV3.focus && !fp) NV3.focus = null;
  var plain = c.kind === 'panel'; if (plain) NV3.joints = false;   // a loose board: no fronts, joints or opening
  return '<div class="nv3' + (NV3.full ? ' full' : '') + '" id="nv3"><div class="nv3-tools">' +
      (plain ? '' : b('m:assembly', L('Surinkta', 'Assembled'), NV3.mode === 'assembly') + b('m:interior', L('Be fasadų', 'No fronts'), NV3.mode === 'interior')) +
      b('edges', '▭ ' + L('Kraštai', 'Edges'), NV3.edges, L('Kraštų laminavimas: spustelėkite kraštą modelyje', 'Edge banding: click an edge on the model')) +
      (plain ? '' : b('joints', '⊙ ' + L('Jungtys', 'Joints'), NV3.joints, L('Jungtys: spustelėkite jungtį modelyje, tempkite tašką', 'Connectors: click a joint on the model, drag a point'))) +
      (c.dishwasher ? '' : '<button type="button" class="nv3-b" data-act="skopen" title="' + esc(L('Detalių operacijos: braižykite ant detalės — išpjovos, frezavimas, gręžimas', 'Part operations: draw on a part — cutouts, routing, drilling')) + '">✎ ' + L('Braižyti', 'Draw') + (skCount(c) ? ' <b>' + skCount(c) + '</b>' : '') + '</button>') +
      (c.kind === 'box' ? '<button type="button" class="nv3-b" data-nv="nv3old" title="' + esc(L('Plokštes dėti ir stumdyti modelyje', 'Place and move the boards in the model')) + '">▣ ' + L('Plokštės', 'Boards') + '</button>' : '') +
      '<span class="nv3-sep"></span>' + b('v:front', L('Priekis', 'Front')) + b('v:iso', '3D') + b('v:under', L('Apačia', 'Below')) + b('v:back', L('Galas', 'Back')) +
      '<span class="nv3-grow"></span>' + b('full', NV3.full ? L('Uždaryti ✕', 'Close ✕') : L('Išplėsti ⤢', 'Expand ⤢'), NV3.full) + '</div>' +
    (NV3.joints ? nv3JBar(c) : '') +
    (NV3.edges ? '<div class="nv3-bar">' + (fp ? '<b>' + L('Kraštai', 'Edges') + ' — ' + esc(typeof nvpName === 'function' ? nvpName({ kind: 'panel', role: fp.role }, fp) : fp.short) + '</b> <span class="nv-muted">' + fmt(fp.L) + ' × ' + fmt(fp.W) + '</span>' : '<b>' + L('Kraštų laminavimas', 'Edge banding') + '</b>') +
      ' <span class="nv3-leg"><i style="background:#1f5fbf"></i>' + esc(c.edge.carc || L('karkaso kraštas', 'carcass edge')) + ' <i style="background:#d9730d"></i>' + L('pagal fasadą', 'as the fronts') + ' <i style="background:#b9b4a8"></i>' + L('nelaminuojama', 'not banded') + '</span>' +
      '<span class="nv3-grow"></span>' + (fp ? '<button type="button" class="nv-btn sm" data-act="ebk" data-v="' + esc(fp.key) + '" data-i="all">' + L('Visi 4 / nė vieno', 'All 4 / none') + '</button><button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="unfocus">' + L('Visa spintelė', 'Whole cabinet') + '</button>' : '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="ecall">' + L('Sąrašas ir patvirtinimas →', 'List and confirmation →') + '</button>') +
      '<button type="button" class="nv-btn sm pri" data-nv="nv3" data-v="edges">' + L('Gerai', 'Done') + '</button></div>' : '') +
    '<div class="nv3-stage" id="nv3-stage"><div class="nv3-cam"><button type="button" data-nv="nv3" data-v="z:0.8" aria-label="+">+</button><button type="button" data-nv="nv3" data-v="z:1.25" aria-label="−">−</button><button type="button" data-nv="nv3" data-v="v:iso" aria-label="reset">↺</button></div>' +
      '<div class="nv3-hint">' + (NV3.joints ? L('Spustelėkite jungties liniją ar tašką · tempkite tašką išilgai · spustelėjus liniją pridedama jungtis', 'Click a joint line or a point · drag a point along it · a click on the line adds a connector') : NV3.edges ? L('Spustelėkite kraštą: nelaminuojama → karkaso kraštas → pagal fasadą', 'Click an edge: not banded → carcass edge → as the fronts') : L('Tempkite — sukite · ratukas — mastelis · dešinys klavišas — perstumti · spustelėkite detalę — keisti', 'Drag to turn · wheel to zoom · right button to pan · click a board to change it')) + '</div></div>' +
    (NV3.joints ? '' : '<div class="nv3-foot">' + (plain ? '' : '<label class="nv3-range"><span>' + L('Atidarymas', 'Opening') + '</span><input type="range" min="0" max="100" step="1" value="' + Math.round(NV3.open * 100) + '" id="nv3-open"><output id="nv3-open-o">' + Math.round(NV3.open * 100) + '%</output></label>') +
      (plain ? '' : '<label class="chk"><input type="checkbox" data-nv3="hw"' + (NV3.hw ? ' checked' : '') + '> ' + L('Furnitūra', 'Hardware') + '</label>') + '<label class="chk"><input type="checkbox" data-nv3="dims"' + (NV3.dims ? ' checked' : '') + '> ' + L('Matmenys', 'Dimensions') + '</label>' + (plain ? '' : '<label class="chk"><input type="checkbox" data-nv3="handles"' + (NV3.handles ? ' checked' : '') + '> ' + L('Rankenos', 'Handles') + '</label>') + '</div>') +
    '<span data-live="nv3" hidden></span></div>';
}
NVLIVE.nv3 = function () { nv3Build(); return ''; };
NVA.nv3 = function (el, v) {
  if (v.indexOf('m:') === 0) { NV3.mode = v.slice(2); NV3.joints = false; return; }
  if (v === 'edges') { NV3.edges = !NV3.edges; NV3.focus = null; NV3.joints = false; return; }
  if (v === 'unfocus') { NV3.focus = null; return; }
  if (v === 'ecall') { S.echeck = true; S.jcheck = false; return; }
  if (v === 'joints') { NV3.joints = !NV3.joints; NV3.edges = false; NV3.focus = null; NV3.jSel = null; NV3.jArm = null; NV3.jA = null; return; }
  if (v.indexOf('j:') === 0) return nv3JAct(v.slice(2), el);
  if (v === 'full') { NV3.full = !NV3.full; return; }
  if (v.indexOf('v:') === 0) { nv3View(v.slice(2)); return false; }
  if (v.indexOf('z:') === 0) { var k = +v.slice(2), cm = NV3.cam, tg = NV3.ctl.target; cm.position.sub(tg).multiplyScalar(k).add(tg); NV3.ctl.update(); return false; }
};
NVA.nv3back = function () { NV.r3off = null; };
NVA.nv3old = function () { NV.r3off = 'box'; NV3.joints = false; NV3.edges = false; };   // a free construction: its boards are placed in the live model
app.addEventListener('input', function (e) { if (e.target.id === 'nv3-open') { NV3.open = +e.target.value / 100; var o = document.getElementById('nv3-open-o'); if (o) o.textContent = e.target.value + '%'; nv3Pose(); } });
app.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-nv3'); if (k) { NV3[k] = e.target.checked; nv3Build(); } });

function nv3Init() {
  var T = NV3.T; if (NV3.R) return;
  var R = NV3.R = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5)); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = T.SRGBColorSpace;
  var sc = NV3.scene = new T.Scene(); sc.background = new T.Color('#f6f5f1');
  var pm = new T.PMREMGenerator(R); sc.environment = pm.fromScene(new NV3.RE(), 0.03).texture; sc.environmentIntensity = 0.55;
  var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-900, 1500, 1300); sc.add(key);
  var fill = new T.DirectionalLight(0xffffff, 0.5); fill.position.set(1200, 500, 600); sc.add(fill);
  sc.add(new T.AmbientLight(0xffffff, 0.35));
  NV3.cam = new T.PerspectiveCamera(26, 1, 10, 60000);
  NV3.ctl = new NV3.OC(NV3.cam, R.domElement); NV3.ctl.enableDamping = true; NV3.ctl.dampingFactor = 0.12; NV3.ctl.zoomToCursor = true; NV3.ctl.rotateSpeed = 0.8;
  NV3.root = new T.Group(); NV3.root.rotation.x = -Math.PI / 2; sc.add(NV3.root);
  NV3.ray = new T.Raycaster();
  var cv = R.domElement; cv.className = 'nv3-cv';
  cv.addEventListener('pointerdown', function (e) { NV3.down = e.button === 0 ? [e.clientX, e.clientY] : null;
    if (NV3.joints && e.button === 0) { var h = nv3JHit(e); if (h && h.object.userData.dot != null) { NV3.jdrag = { seam: h.object.userData.seam, i: h.object.userData.dot, obj: h.object, o: h.object.userData.o, moved: false }; NV3.ctl.enabled = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} } } });
  cv.addEventListener('pointerup', function (e) { var d = NV3.down; NV3.down = null; var jd = NV3.jdrag; NV3.jdrag = null; NV3.ctl.enabled = true;
    if (jd && jd.moved) { nv3JDrop(jd); return; }
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 4) return; if (NV3.joints) nv3JClick(e); else nv3Click(e); });
  cv.addEventListener('pointermove', function (e) { if (NV3.jdrag) { nv3JMove(e); return; } if (e.buttons) return; if (NV3.joints) { var h = nv3JHit(e); cv.style.cursor = h ? 'pointer' : 'grab'; return; } nv3Hover(e); });
  cv.addEventListener('pointerleave', function () { nv3SetHover(null); });
  cv.addEventListener('dragover', function (e) { if (typeof MD !== 'undefined' && MD.name) { e.preventDefault(); e.stopPropagation(); } });
  cv.addEventListener('drop', function (e) { if (typeof MD === 'undefined' || !MD.name) return; e.preventDefault(); e.stopPropagation(); var h = nv3Hit(e), nm = MD.name; MD.name = null; document.body.classList.remove('mddrag'); if (h && h.object.userData.part) dropMat(cur(), h.object.userData.part, nm); else toast(t('mdNone'), true); });
}
function nv3Mount() {
  var st = document.getElementById('nv3-stage');
  if (!st) { if (NV3.raf) { cancelAnimationFrame(NV3.raf); NV3.raf = 0; } return; }
  nv3Init(); st.insertBefore(NV3.R.domElement, st.firstChild);
  nv3Build();
  if (!NV3.raf) { var loop = function () { if (!document.getElementById('nv3-stage')) { NV3.raf = 0; return; } NV3.raf = requestAnimationFrame(loop); nv3Frame(); }; NV3.raf = requestAnimationFrame(loop); }
}
NVAFTER.push(nv3Mount);
function nv3Frame() {
  var st = NV3.R.domElement.parentNode; if (!st) return;
  var w = st.clientWidth, h = st.clientHeight; if (!w || !h) return;
  if (NV3.w !== w || NV3.h !== h) { NV3.w = w; NV3.h = h; NV3.R.setSize(w, h, false); NV3.cam.aspect = w / h; NV3.cam.updateProjectionMatrix(); }
  NV3.ctl.update(); NV3.R.render(NV3.scene, NV3.cam);
  var V = new NV3.T.Vector3();
  NV3.labels.forEach(function (l) { V.copy(l.p).applyMatrix4(NV3.root.matrixWorld).project(NV3.cam); l.el.style.transform = 'translate(-50%,-50%) translate(' + ((V.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - V.y) / 2 * h).toFixed(1) + 'px)'; l.el.style.display = V.z < 1 ? '' : 'none'; });
}
function nv3Mat(color, opt) {
  if (opt && opt.noLine != null) { opt = Object.assign({}, opt); delete opt.noLine; }
  var T = NV3.T, k = color + '|' + JSON.stringify(opt || {});
  if (!NV3.mats[k]) NV3.mats[k] = new T.MeshStandardMaterial(Object.assign({ color: new T.Color(color), roughness: 0.62, metalness: 0 }, opt || {}));
  return NV3.mats[k];
}
function nv3Shade(hex, k) { var c = new NV3.T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }
/* a board from its engine placement: local x = its length (u), y = its width (v), z = its thickness (against n).
   Box faces in three's order: +x −x +y −y +z −z  →  edges x1 x0 y1 y0, then the two big faces. */
function nv3Board(p, color, opt) {
  var T = NV3.T, q = p.place, g = null, fe = (cur().edge.facade || 'PAGAL FASADA'), mats;
  var dim = opt && opt.dim, edgeMode = NV3.edges && !dim && p.key, cuts = !edgeMode && p.key && nv3Cuts(p);
  if (cuts && cuts.length) { try { var shp = nv3CutShapes(p.L, p.W, cuts); if (shp.length) { g = new T.ExtrudeGeometry(shp, { depth: p.T, bevelEnabled: false, curveSegments: 28 }); g.translate(-p.L / 2, -p.W / 2, -p.T / 2); } } catch (e) { g = null; } }
  if (!g) g = new T.BoxGeometry(p.L, p.W, p.T);
  if (edgeMode) { var em = function (e) { var st = ecState(p, e, fe); return new T.MeshStandardMaterial({ color: new T.Color(st === 1 ? '#1f5fbf' : st === 2 ? '#d9730d' : '#b9b4a8'), roughness: 0.6, emissive: new T.Color(st === 1 ? '#0b2a5c' : st === 2 ? '#6a3200' : '#000000'), emissiveIntensity: st ? 0.35 : 0 }); };
    var face = nv3Mat(color); mats = [em('x1'), em('x0'), em('y1'), em('y0'), face, face]; }
  else mats = dim ? nv3Mat(color, { transparent: true, opacity: 0.1, depthWrite: false }) : nv3Mat(color);
  var m = new T.Mesh(g, mats), u = new T.Vector3().fromArray(q.u).normalize(), v = new T.Vector3().fromArray(q.v).normalize(), n = new T.Vector3().fromArray(q.n).normalize();
  var z = new T.Vector3().crossVectors(u, v);   // right-handed third axis: n or −n, the box is symmetric
  m.matrixAutoUpdate = false;
  var cx = [0, 1, 2].map(function (i) { return q.o[i] + q.u[i] * p.L / 2 + q.v[i] * p.W / 2 - q.n[i] * p.T / 2; });
  m.matrix.makeBasis(u, v, z).setPosition(cx[0], cx[1], cx[2]); void n;
  var ln = new T.LineSegments(new T.EdgesGeometry(g, 25), new T.LineBasicMaterial({ color: 0x1c211e, transparent: true, opacity: dim ? 0.42 : 0.28 })); m.add(ln);
  if (!dim && !edgeMode) nv3Routed(p, m);
  m.userData = { part: { kind: 'panel', role: p.role, name: p.name }, key: p.key, cen: cx, edge: !!edgeMode };
  if (!dim) NV3.pick.push(m);
  return m;
}
/* the outline of a board after its cutouts (49-sketch.js): rectangles may cross the board's edges (notches), so the
   kept area is found on the grid of all their edges and its border traced into loops; round holes are added inside. */
function nv3CutShapes(L, W, cuts) {
  var T = NV3.T, xs = [0, L], ys = [0, W], rects = cuts.filter(function (q) { return q.k === 'rect' && q.w > 0 && q.h > 0; });
  rects.forEach(function (q) { [q.x, q.x + q.w].forEach(function (v) { if (v > 0 && v < L) xs.push(v); }); [q.y, q.y + q.h].forEach(function (v) { if (v > 0 && v < W) ys.push(v); }); });
  var uq = function (a) { a.sort(function (p, q) { return p - q; }); return a.filter(function (v, i) { return !i || v - a[i - 1] > 0.01; }); }; xs = uq(xs); ys = uq(ys);
  var nx = xs.length - 1, ny = ys.length - 1, keep = function (i, j) { if (i < 0 || j < 0 || i >= nx || j >= ny) return false; var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2; return !rects.some(function (q) { return cx > q.x && cx < q.x + q.w && cy > q.y && cy < q.y + q.h; }); };
  var next = {}, key = function (i, j) { return i + ',' + j; }, edge = function (a, b) { next[key(a[0], a[1])] = b; };
  for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) { if (!keep(i, j)) continue;   // counter-clockwise border edges of every kept cell that has no kept neighbour there
    if (!keep(i, j - 1)) edge([i, j], [i + 1, j]); if (!keep(i + 1, j)) edge([i + 1, j], [i + 1, j + 1]); if (!keep(i, j + 1)) edge([i + 1, j + 1], [i, j + 1]); if (!keep(i - 1, j)) edge([i, j + 1], [i, j]); }
  var loops = [], guard = 0;
  Object.keys(next).forEach(function (k0) { if (!next[k0]) return; var pts = [], k = k0; while (next[k] && guard++ < 20000) { var p = k.split(',').map(Number), n = next[k]; next[k] = null; pts.push([xs[p[0]], ys[p[1]]]); k = key(n[0], n[1]); } if (pts.length > 2) loops.push(pts); });
  var area = function (P) { var a = 0; for (var q = 0; q < P.length; q++) { var r2 = P[(q + 1) % P.length]; a += P[q][0] * r2[1] - r2[0] * P[q][1]; } return a / 2; };
  var inside = function (pt, P) { var c = false; for (var q = 0, r3 = P.length - 1; q < P.length; r3 = q++) if ((P[q][1] > pt[1]) !== (P[r3][1] > pt[1]) && pt[0] < (P[r3][0] - P[q][0]) * (pt[1] - P[q][1]) / (P[r3][1] - P[q][1]) + P[q][0]) c = !c; return c; };
  var outers = loops.filter(function (P) { return area(P) > 0; }), holes = loops.filter(function (P) { return area(P) < 0; });
  return outers.map(function (P) { var sh = new T.Shape(P.map(function (q) { return new T.Vector2(q[0], q[1]); }));
    holes.forEach(function (H) { if (inside(H[0], P)) sh.holes.push(new T.Path(H.map(function (q) { return new T.Vector2(q[0], q[1]); }))); });
    cuts.forEach(function (q) { if (q.k !== 'circ' || !(q.d > 0)) return; var rr = q.d / 2; if (q.x - rr < 0.5 || q.y - rr < 0.5 || q.x + rr > L - 0.5 || q.y + rr > W - 0.5 || !inside([q.x, q.y], P)) return;
      if (rects.some(function (r4) { return q.x + rr > r4.x && q.x - rr < r4.x + r4.w && q.y + rr > r4.y && q.y - rr < r4.y + r4.h; })) return;
      var h = new T.Path(); h.absarc(q.x, q.y, rr, 0, Math.PI * 2, true); sh.holes.push(h); });
    return sh; });
}
/* part operations of the live app (c.sketch → p.sketch, p.paths, p.holes with op 'sketch'):
   what goes right through becomes a real opening in the board … */
function nv3Cuts(p) {
  var thrD = p.T - E.R.rout.skin - 0.01, out = [];
  (p.sketch || []).forEach(function (sh) { if (sh.op !== 'in' || !sh.closed || sh.pts.length < 3) return;
    var g = (p.paths || []).filter(function (x) { return x.name === 'ESKIZAS_' + sh.n; })[0]; if (!g || g.depth < thrD) return;
    var xs = sh.pts.map(function (q) { return q[0]; }), ys = sh.pts.map(function (q) { return q[1]; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (sh.t === 'rect') out.push({ k: 'rect', x: x0, y: y0, w: x1 - x0, h: y1 - y0, n: sh.n });
    else if (sh.t === 'circle') out.push({ k: 'circ', x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: x1 - x0, n: sh.n }); });
  (p.holes || []).forEach(function (h) { if (h.op === 'sketch' && h.through) out.push({ k: 'circ', x: h.x, y: h.y, d: h.d }); });
  return out;
}
/* … and everything else the cutter takes away is drawn on the face it works from: pockets, grooves along a line, blind holes */
function nv3Routed(p, m) {
  if (!(p.sketch && p.sketch.length) && !(p.holes || []).some(function (h) { return h.op === 'sketch'; })) return;
  var T = NV3.T, rr = E.R.rout.dia / 2, thrD = p.T - E.R.rout.skin - 0.01, opened = {}; nv3Cuts(p).forEach(function (q) { if (q.n) opened[q.n] = 1; });
  var flat = function (shape, fB, color) { var g = new T.ShapeGeometry(shape, 20), x = new T.Mesh(g, new T.MeshBasicMaterial({ color: new T.Color(color), side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    x.position.set(-p.L / 2, -p.W / 2, 0); var hold = new T.Group(); hold.add(x); hold.userData.face = fB ? 'B' : 'A'; m.add(hold); return hold; };
  var zs = m.matrix.elements, nz = new T.Vector3(zs[8], zs[9], zs[10]), sgn = nz.dot(new T.Vector3().fromArray(p.place.n)) > 0 ? 1 : -1;   // local +z is face A when it points along n
  var zOf = function (fB) { return (fB ? -1 : 1) * sgn * (p.T / 2 + 0.3); };
  var poly = function (pts) { return new T.Shape(pts.map(function (q) { return new T.Vector2(q[0], q[1]); })); };
  (p.paths || []).forEach(function (g) { var m0 = /^ESKIZAS_(\d+)/.exec(g.name || ''); if (!m0 || opened[+m0[1]]) return;
    var fB = g.face === 'B', thr = g.depth >= thrD, col = thr ? '#2b302d' : '#7a6650', P = g.pts, faces = thr ? [false, true] : [fB];
    faces.forEach(function (f) {
      for (var i = 0; i < P.length - 1; i++) { var a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-6) continue; var nx = -dy / l * rr, ny = dx / l * rr;
        flat(poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]), f, col).position.z = zOf(f);
        var c0 = new T.Shape(); c0.absarc(a[0], a[1], rr, 0, Math.PI * 2, false); flat(c0, f, col).position.z = zOf(f); }
      if (P.length) { var e = P[P.length - 1], c1 = new T.Shape(); c1.absarc(e[0], e[1], rr, 0, Math.PI * 2, false); flat(c1, f, col).position.z = zOf(f); } }); });
  (p.sketch || []).forEach(function (sh) { if (sh.op !== 'pocket' || !sh.closed || sh.pts.length < 3) return; flat(poly(sh.pts), sh.face === 'B', '#7a6650').position.z = zOf(sh.face === 'B'); });
  (p.holes || []).forEach(function (h) { if (h.op !== 'sketch' || h.through) return; var c2 = new T.Shape(); c2.absarc(h.x, h.y, h.d / 2, 0, Math.PI * 2, false); flat(c2, h.face === 'B', '#3d342b').position.z = zOf(h.face === 'B'); });
}
/* connectors as they sit in the boards, from the engine's real drillings: confirmat heads, cam housings, shelf pins */
function nv3Screws(r, root, expOff) {
  var T = NV3.T, steel = { metalness: 0.9, roughness: 0.3 }, gHead = NV3.gHead = NV3.gHead || new T.CylinderGeometry(5.2, 5.2, 1.6, 20), gHex = NV3.gHex = NV3.gHex || new T.CylinderGeometry(2.2, 2.2, 1.8, 6),
    gCam = NV3.gCam = NV3.gCam || new T.CylinderGeometry(7.4, 7.4, 1.2, 28), gSlot = NV3.gSlot = NV3.gSlot || new T.BoxGeometry(9, 1.5, 1.4), gPin = NV3.gPin = NV3.gPin || new T.CylinderGeometry(2.5, 2.5, 7, 12), up = new T.Vector3(0, 1, 0);
  var all = (r.panels || []).filter(function (q) { return q.place && !q.drawerOf && q.role !== 'FASADAS' && q.role !== 'DURYS'; });
  all.forEach(function (p) { var pl = p.place, ax = 0; [1, 2].forEach(function (i) { if (Math.abs(pl.n[i]) > Math.abs(pl.n[ax])) ax = i; });
    var ext = []; all.forEach(function (q) { [0, q.L].forEach(function (a) { [0, q.W].forEach(function (b) { [0, q.T].forEach(function (d) { ext.push(q.place.o[ax] + a * q.place.u[ax] + b * q.place.v[ax] - d * q.place.n[ax]); }); }); }); });
    var outA = Math.abs(pl.o[ax] - (pl.n[ax] > 0 ? Math.max.apply(null, ext) : Math.min.apply(null, ext))) < 0.5;   // face A is the cabinet's outside (an outside back)
    (p.holes || []).forEach(function (h) {
      if (h.op === 'sketch') return;   // a hole drawn by hand, not a connector
      var cam = !h.op && !h.mark && !h.through && Math.abs(h.d - 15) < 0.1, conf = !h.op && !h.mark && h.through && Math.abs(h.d - 8) < 0.1, pin = h.op === 'pin'; if (!cam && !conf && !pin) return;
      var face = conf ? (outA ? 'A' : (h.face === 'B' ? 'A' : 'B')) : (h.face || 'A'), sg = face === 'B' ? -1 : 1, n = new T.Vector3(pl.n[0] * sg, pl.n[1] * sg, pl.n[2] * sg);
      var o = new T.Vector3(pl.o[0] + pl.u[0] * h.x + pl.v[0] * h.y + pl.n[0] * (face === 'B' ? -p.T : 0), pl.o[1] + pl.u[1] * h.x + pl.v[1] * h.y + pl.n[1] * (face === 'B' ? -p.T : 0), pl.o[2] + pl.u[2] * h.x + pl.v[2] * h.y + pl.n[2] * (face === 'B' ? -p.T : 0));
      if (expOff) { var eo = expOff([0, 1, 2].map(function (i) { return pl.o[i] + pl.u[i] * p.L / 2 + pl.v[i] * p.W / 2 - pl.n[i] * p.T / 2; })); o.x += eo[0]; o.y += eo[1]; o.z += eo[2]; }
      var qn = new T.Quaternion().setFromUnitVectors(up, n), K = expOff ? 2.4 * Math.max(1, Math.min(1.8, Math.max(+r.dims.W || 0, +r.dims.H || 0) / 1300)) : 1, put = function (g, color, off, opt) { var m = new T.Mesh(g, nv3Mat(color, opt || steel)); m.position.copy(o).addScaledVector(n, off * K); m.quaternion.copy(qn); m.scale.setScalar(K); root.add(m); return m; };   // pulled apart: connectors drawn larger than life so they can be told apart
      if (conf) { put(gHead, '#aeb7bc', 0.6); put(gHex, '#3c4549', 0.9, { metalness: 0.5, roughness: 0.6 });
        if (expOff) {   // pulled apart: the whole screw, through its board and out towards the edge it goes into
          var tip = o.clone().addScaledVector(n, -p.T - 62), neck = o.clone().addScaledVector(n, -p.T - 48);
          root.add(nv3Rod([o.x, o.y, o.z], [neck.x, neck.y, neck.z], 6.5, '#8f999e'));
          var cg = new T.Mesh(NV3.gTip = NV3.gTip || new T.ConeGeometry(6.5, 14, 16), nv3Mat('#8f999e', steel)); cg.position.copy(neck).add(tip).multiplyScalar(0.5); cg.quaternion.setFromUnitVectors(up, n.clone().negate()); root.add(cg); } }
      else if (cam) { put(gCam, '#b9c1c6', 0.2); put(gSlot, '#4a5459', 0.5, { metalness: 0.5, roughness: 0.6 }); put(gSlot, '#4a5459', 0.5, { metalness: 0.5, roughness: 0.6 }).rotateY(Math.PI / 2); }
      else put(gPin, '#a4adb2', 3.5);
    }); });
}
function nv3Box(o, s, color, opt, part) {   // a plain box given by its low corner and size, in cabinet axes
  var T = NV3.T, m = new T.Mesh(new T.BoxGeometry(s[0], s[1], s[2]), nv3Mat(color, opt));
  m.position.set(o[0] + s[0] / 2, o[1] + s[1] / 2, o[2] + s[2] / 2);
  if (!(opt && opt.noLine)) m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: 0x1c211e, transparent: true, opacity: 0.22 })));
  if (part) { m.userData = { part: part }; NV3.pick.push(m); }
  return m;
}
function nv3Rod(a, b, rad, color, opt) {
  var T = NV3.T, A = new T.Vector3().fromArray(a), B = new T.Vector3().fromArray(b), d = B.clone().sub(A), len = d.length(); if (len < 0.01) return new T.Group();
  var m = new T.Mesh(new T.CylinderGeometry(rad, rad, len, 20), nv3Mat(color, opt || { metalness: 0.85, roughness: 0.32 }));
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
}
/* a fitting from the maker's own model (Blum STEP files, src/lib/fittings.js): its triangles mapped into the cabinet by
   map(x, y, z) → [X, Y, Z]; mirrored for the right-hand side. Flat-shaded, so the pressed-steel edges stay crisp. */
function nv3Fit(name, part, map, color, mirrored) {
  var T = NV3.T, F = window.DBFit, ms = F && F.mesh(name, part); if (!ms) return null;
  var v = ms.v, t = ms.t, P = new Float32Array(t.length * 3), q;
  for (var i = 0; i < t.length; i += 3) { var idx = [t[i], mirrored ? t[i + 2] : t[i + 1], mirrored ? t[i + 1] : t[i + 2]];
    for (var k = 0; k < 3; k++) { q = map(v[3 * idx[k]], v[3 * idx[k] + 1], v[3 * idx[k] + 2]); P[(i + k) * 3] = q[0]; P[(i + k) * 3 + 1] = q[1]; P[(i + k) * 3 + 2] = q[2]; } }
  var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.computeVertexNormals();
  return new T.Mesh(g, nv3Mat(color, { metalness: 0.82, roughness: 0.36, flatShading: true, side: T.DoubleSide }));
}
/* the inner faces of the boards left and right of a point — where a drawer's runners are screwed on */
function nv3Opening(r, xc, zc) {
  var Lf = null, Rf = null;
  (r.panels || []).forEach(function (p) { if (!p.place || p.drawerOf || /^(DURYS|FASADAS)$/.test(p.role)) return;
    var q = p.place, e = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]];
    [0, p.L].forEach(function (a) { [0, p.W].forEach(function (b) { [0, p.T].forEach(function (d) { for (var k = 0; k < 3; k++) { var w = q.o[k] + a * q.u[k] + b * q.v[k] - d * q.n[k]; if (w < e[k][0]) e[k][0] = w; if (w > e[k][1]) e[k][1] = w; } }); }); });
    if (e[0][1] - e[0][0] >= Math.min(e[1][1] - e[1][0], e[2][1] - e[2][0])) return;   // not an upright board
    if (zc < e[2][0] || zc > e[2][1] || e[1][1] < 100 || e[1][0] > 100) return;
    if (e[0][1] <= xc + 1 && (Lf == null || e[0][1] > Lf)) Lf = e[0][1]; if (e[0][0] >= xc - 1 && (Rf == null || e[0][0] < Rf)) Rf = e[0][0]; });
  return Lf != null && Rf != null && Rf - Lf > 60 ? [Lf, Rf] : null;
}
/* a TANDEMBOX / TANDEM drawer from Blum's models: runners on the sides at their hole line (the middle member half way
   out), the antaro sides / the wooden box moving with the front. Returns false when the models do not cover it. */
function nv3BlumDrawer(c, r, m, sec, x, z, w, h, inner, root, rail) {
  var F = window.DBFit, hw = sec.hw || m.hw, tb = hw === 'BLUM TANDEMBOX'; if (!F || !(tb || hw === 'BLUM TANDEM') || !F.has(tb ? 'tbSide' : 'tdRunner')) return false;
  var op = m.ox0 != null && m.ox1 != null ? [m.ox0, m.ox1] : nv3Opening(r, x + w / 2, z + Math.min(h / 2, 60)); if (!op) return false;
  var T = NV3.T, L0 = op[0], R0 = op[1], rt = (E.R.runner || {})[hw] || {}, up = +rt.up || (tb ? 33 : 37), t0 = num(c.thick) || 18, ax = Math.max(t0 + up, z + up), nl = Math.max(250, +sec.rail || 500);
  var carc = window.DBFront.matColor((c.mat || {}).carc, '#e5e2da'), Y = function (sz) { return F.FRONT_Z - F.zmap(sz, nl); }, add = function (g, o) { if (o) g.add(o); };
  var half = new T.Group(); root.add(half); NV3.moving.push({ g: half, door: false, travel: rail * 0.4 });
  [false, true].forEach(function (rgt) { var X = function (sx) { return rgt ? R0 - sx : L0 + sx; }, mapR = function (sx, sy, sz) { return [X(sx), Y(sz), ax + sy]; };
    if (tb) { var top = F.sideTop(h >= 170 ? 115.5 : h >= 125 ? 83 : 68.5), mapS = function (sx, sy, sz) { return [X(sx), Y(sz), ax + F.ymap(sy, top)]; };
      if (NV3.hw) { add(root, nv3Fit('tbRunner', 0, mapR, '#8f989d', rgt)); add(half, nv3Fit('tbRunner', 0, mapR, '#a9b1b5', rgt)); }
      add(inner, nv3Fit('tbSide', 0, mapS, '#c3c8ca', rgt)); add(inner, nv3Fit('tbFix', 0, mapS, '#8d969b', rgt)); }
    else if (NV3.hw) { add(root, nv3Fit('tdRunner', 0, mapR, '#8f989d', rgt)); add(half, nv3Fit('tdRunner', 0, mapR, '#a9b1b5', rgt)); add(inner, nv3Fit('tdRunner', 1, mapR, '#c4cacc', rgt)); } });
  if (tb) { var top2 = F.sideTop(h >= 170 ? 115.5 : h >= 125 ? 83 : 68.5), gal = h >= 250, backTop = gal ? Math.min(ax + 180, z + h - 40) : ax + top2 - 4, bx0 = L0 + 36.9, bw = R0 - L0 - 73.8;
    inner.add(nv3Box([bx0, 2, ax - 24], [bw, nl - 14, 16], carc)); inner.add(nv3Box([bx0, nl - 28, ax - 8], [bw, 16, Math.max(10, backTop - (ax - 8))], carc));
    if (gal) [L0 + 14, R0 - 14].forEach(function (gx) { inner.add(nv3Rod([gx, 6, backTop - 8], [gx, nl - 24, backTop - 8], 4, '#c9cdce')); }); }
  else { var bt = 16, zb = ax - 22.7, sH = Math.max(60, Math.min(250, h - 45)), len = nl - 10, iw = R0 - L0 - 10 - 2 * bt;
    inner.add(nv3Box([L0 + 5, 2, zb], [bt, len, sH], carc)); inner.add(nv3Box([R0 - 5 - bt, 2, zb], [bt, len, sH], carc));
    inner.add(nv3Box([L0 + 5 + bt, 2, zb + 13], [iw, len, 16], carc)); inner.add(nv3Box([L0 + 5 + bt, len - 14, zb + 29], [iw, bt, Math.max(10, sH - 29)], carc)); inner.add(nv3Box([L0 + 5 + bt, 2, zb + 29], [iw, bt, Math.max(10, sH - 29)], carc)); }
  return true;
}
function nv3Clear(g) { g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); while (g.children.length) g.remove(g.children[0]); }
function nv3Build() {
  if (!NV3.R || !document.getElementById('nv3-stage')) return;
  var T = NV3.T, c = cur(), inf = S._info && S._info[S.sel]; if (!c || !inf || !inf.r) return;
  var r = inf.r, root = NV3.root, st = document.getElementById('nv3-stage'), MC = function (name, d) { return window.DBFront && window.DBFront.matColor ? window.DBFront.matColor(name, d) : d; };
  nv3Clear(root); NV3.pick = []; NV3.moving = []; NV3.links = []; NV3.hover = null;
  NV3.labels.forEach(function (l) { l.el.remove(); }); NV3.labels = [];
  var isFront = function (p) { return p.role === 'FASADAS' || p.role === 'DURYS'; }, focus = NV3.edges ? NV3.focus : null, metal = { metalness: 0.85, roughness: 0.3 };
  var D = num(c.D) || 560, W = num(c.dishwasher ? c.dishWidth : c.W) || 600, H = num(c.H) || 720, ext = [W, D, H], mid = [W / 2, D / 2, H / 2];
  var place = function (m, p) {   // the board whose edges are being set comes out of the cabinet, along the axis it sits furthest out on
    if (!focus || p.key !== focus) return m;
    var cx = m.userData.cen, d = [0, 1, 2].map(function (i) { return (cx[i] - mid[i]) / Math.max(1, ext[i] / 2); }), ax = 0; [1, 2].forEach(function (i) { if (Math.abs(d[i]) > Math.abs(d[ax])) ax = i; });
    if (Math.abs(d[ax]) < 0.45) { ax = 1; d[1] = -1; }
    var off = [0, 0, 0]; off[ax] = (d[ax] > 0 ? 1 : -1) * Math.max(170, Math.min(W, D, H) * 0.5);
    var g = new T.Group(); g.position.set(off[0], off[1], off[2]); g.add(m); return g;
  };
  /* carcass */
  var jm = NV3.joints && !focus; NV3.jpick = [];
  var jx = jm && NV3.jExp !== false, expOff = function (cen) { return [0, 1, 2].map(function (i) { return Math.max(-1, Math.min(1, (cen[i] - mid[i]) / Math.max(1, ext[i] / 2))) * Math.max(130, Math.max(W, H, D) * 0.09); }); };   // the same gap whatever the cabinet's size   // joints: the boards pulled apart so every joint shows what goes into what
  (r.panels || []).forEach(function (p) { if (!p.place || p.drawerOf || isFront(p)) return;
    var bm = nv3Board(p, jx && NV3.jA === p.key ? '#ffd65a' : MC(p.mat, '#e9e6de'), { dim: (jm && !jx) || (focus && p.key !== focus) });
    if (jx) { var eo = expOff(bm.userData.cen), eg = new T.Group(); eg.position.set(eo[0], eo[1], eo[2]); eg.add(bm); root.add(eg); } else root.add(place(bm, p)); });
  if (jm) nv3Seams(r, root, jx ? expOff : null);
  var faint = focus ? { transparent: true, opacity: 0.16, depthWrite: false } : null;
  if (c.hang !== true && !jx) (r.legs || []).forEach(function (l) {
    var rad = (l.d || 40) / 2, g1 = new T.CylinderGeometry(rad, rad, l.h, 28); g1.rotateX(Math.PI / 2);
    var a = new T.Mesh(g1, nv3Mat('#2b3230', Object.assign({ roughness: 0.5 }, faint || {}))); a.position.set(l.x, l.y, -l.h / 2); root.add(a);
    if (!l.feet) { var g2 = new T.CylinderGeometry(rad * 1.4, rad * 1.5, 10, 28); g2.rotateX(Math.PI / 2); var b2 = new T.Mesh(g2, nv3Mat('#222826', Object.assign({ roughness: 0.5 }, faint || {}))); b2.position.set(l.x, l.y, -l.h + 5); root.add(b2); }
  });
  var asm = NV3.mode === 'assembly' && !focus && !jm, vis = r.visual || {};
  if (asm || (focus && false)) {
    if (vis.plinth) { var pl = vis.plinth; root.add(nv3Box([pl.x0, pl.y0, pl.z0], [pl.x1 - pl.x0, pl.t, pl.z1 - pl.z0], MC(pl.mat, '#d5cbbd'), null, { kind: 'plinth' })); }
    if (r.worktop) { var wt = r.worktop; root.add(nv3Box([wt.x0, wt.y0, wt.z0], [wt.L, wt.y1 - wt.y0, wt.T], MC(wt.mat, '#b98d5e'), { roughness: 0.45 }, { kind: 'worktop' })); }
    if (E.sidePanels) E.sidePanels(c).forEach(function (q) { root.add(nv3Box([q.x0, q.y0, q.z0], [q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0], MC(q.mat, '#d5cbbd'))); });
  }
  if (jx) nv3Screws(r, root, expOff); else if (NV3.hw && !focus) nv3Screws(r, root);
  if (!jx && !focus) ((r.visual && r.visual.rails) || []).forEach(function (q) { root.add(nv3Rod([q.x0, q.y, q.z], [q.x1, q.y, q.z], 12.5, '#b4bcc1')); });   // hanging rails of a wardrobe (35-robe.js)
  /* fronts: doors on a pivot at their hinge side, drawers on a slide */
  var fronts = jm ? [] : (r.panels || []).filter(isFront), di = 0, fi = 0, showF = NV3.mode === 'assembly';
  fronts.forEach(function (p) {
    var door = p.role === 'DURYS', m = door ? (vis.doors || [])[di++] : (vis.drawers || [])[fi++];
    if (focus) { if (p.key === focus) root.add(place(nv3Board(p, MC(p.mat, '#d5cbbd')), p)); return; }
    var fixed = !m || c.dishwasher;
    var mesh = showF ? nv3Board(p, MC(p.mat, '#d5cbbd')) : null;
    if (fixed) { if (mesh) root.add(mesh); return; }
    var sec = m.box ? { hw: m.hw, rail: m.rail } : (c.sections || []).filter(function (s) { return (+s.col || 0) === (m.col || 0); })[m.sec] || {};
    var x = m.x, z = door ? m.z : m.bottom, w = m.w, h = m.h, t = p.T, g = new T.Group(), inner = new T.Group(); g.add(inner);
    if (mesh) inner.add(mesh);
    if (door && !m.cargo) {
      var hx = m.hingeLeft ? x : x + w; g.position.set(hx, 0, 0); inner.position.set(-hx, 0, 0);
      NV3.moving.push({ g: g, door: true, sign: m.hingeLeft ? -1 : 1, hinged: m.hinged !== false });
      if (NV3.hw && m.hinged !== false && !m.inset) (m.ys || []).forEach(function (yy) {
        var hz = z + yy, F = window.DBFit, cupE = +((E.R.hinge || {}).cupFromEdge) || 22.5, right = !m.hingeLeft, cxp = right ? x + w - cupE : x + cupE;
        if (F && F.has('hinge')) {   // Blum CLIP top from its model: the arm on the side, the cup and its links on the door
          var HG = F.HINGE, mapH = function (sx, sy, sz) { return [right ? cxp + (sx - HG.cupX) : cxp - (sx - HG.cupX), -(sz - HG.doorZ), hz + sy]; };
          var arm = nv3Fit('hinge', 0, mapH, '#a3adb2', !right); if (arm) root.add(arm);
          if (showF) { var cupM = nv3Fit('hinge', 1, mapH, '#c6cdd1', !right); if (cupM) inner.add(cupM); }
          if (showF) { var l1 = nv3Rod([0, 0, 0], [0, 1, 0], 5, '#9aa4aa'), l2 = nv3Rod([0, 0, 0], [0, 1, 0], 5.5, '#b9c1c6'); root.add(l1); root.add(l2);
            NV3.links.push({ a: [right ? x + w - 22 : x + 22, 30, hz], cup: [cxp, 8, hz], inner: inner, l1: l1, l2: l2 }); }
        } else {
          var sx0 = m.hingeLeft ? x + 16 : x + w - 16;
          if (showF) { var cup = new T.Mesh(new T.CylinderGeometry(17.5, 17.5, 5, 28), nv3Mat('#b9c1c6', metal)); cup.position.set(cxp, 2.5, hz); inner.add(cup); }
          root.add(nv3Box([sx0 + (m.hingeLeft ? 0 : -4), 22, hz - 24], [4, 34, 48], '#a6afb4', Object.assign({ noLine: true }, metal)));
        }
      });
    } else {
      var rail = Math.min(+sec.rail || 500, D - 45); NV3.moving.push({ g: g, door: false, travel: rail * 0.8 });
      var own = (r.panels || []).filter(function (q) { return q.drawerOf === p.name && q.place; });
      if (own.length) own.forEach(function (q) { inner.add(nv3Board(q, MC(q.mat, '#e5e2da'))); });
      else if (!m.cargo && !door && nv3BlumDrawer(c, r, m, sec, x, z, w, h, inner, root, rail)) { /* drawn from Blum's models */ }
      else if (!m.cargo && !door) {   // a metal-sided box (TANDEMBOX and the like): sides, bottom, back
        var bw = w - 36, bx = x + 18, sh = Math.max(60, Math.min(h - 45, 170)), bz = z + 22, dep = rail - 10, grey = Object.assign({ noLine: false }, { metalness: 0.75, roughness: 0.38 });
        inner.add(nv3Box([bx, 0, bz], [13, dep, sh], '#c9cfd3', grey)); inner.add(nv3Box([bx + bw - 13, 0, bz], [13, dep, sh], '#c9cfd3', grey));
        inner.add(nv3Box([bx + 13, 0, bz + 8], [bw - 26, dep, 16], '#f1efea')); inner.add(nv3Box([bx + 13, dep - 16, bz + 24], [bw - 26, 16, sh - 30], '#f1efea'));
        if (NV3.hw) { root.add(nv3Box([bx - 2, 12, bz - 12], [15, dep, 10], '#9aa4aa', Object.assign({ noLine: true }, metal))); root.add(nv3Box([bx + bw - 13, 12, bz - 12], [15, dep, 10], '#9aa4aa', Object.assign({ noLine: true }, metal))); }
      } else if (m.cargo) { [0.18, 0.55].forEach(function (k) { inner.add(nv3Box([x + 30, 20, z + h * k], [w - 60, D - 120, 12], '#b5bdc2', metal)); }); }
    }
    if (NV3.handles && showF && sec.hinge !== 'BE FURNITŪROS') {
      var a, b; if (door) { var hx2 = m.hingeLeft ? x + w - 38 : x + 38, md = z + Math.min(h - 70, Math.max(90, h * 0.6)); a = [hx2, -t - 26, md - 64]; b = [hx2, -t - 26, md + 64]; } else { var mx = x + w / 2, zz = z + h - Math.min(38, h / 2); a = [mx - 80, -t - 26, zz]; b = [mx + 80, -t - 26, zz]; }
      inner.add(nv3Rod(a, b, 5, '#3c4447', { metalness: 0.7, roughness: 0.35 })); [a, b].forEach(function (q) { inner.add(nv3Rod(q, [q[0], -t, q[2]], 4, '#565f62', { metalness: 0.7, roughness: 0.35 })); });
    }
    root.add(g);
  });
  nv3Pose();
  /* outer sizes */
  if (NV3.dims && !focus && !jx) { var lm = new T.LineBasicMaterial({ color: 0x69726c }), pts = [], seg = function (a, b) { pts.push(new T.Vector3().fromArray(a), new T.Vector3().fromArray(b)); }, o = 55, zb = c.hang === true || !(r.legs || []).length ? 0 : -((r.legs[0] || {}).h || 0);
    seg([0, -o, zb], [W, -o, zb]); seg([0, -o + 14, zb], [0, -o - 14, zb]); seg([W, -o + 14, zb], [W, -o - 14, zb]);
    seg([-o, 0, zb], [-o, D, zb]); seg([-o - 14, 0, zb], [-o + 14, 0, zb]); seg([-o - 14, D, zb], [-o + 14, D, zb]);
    seg([-o, -o, 0], [-o, -o, H]); seg([-o - 14, -o, 0], [-o + 14, -o, 0]); seg([-o - 14, -o, H], [-o + 14, -o, H]);
    root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), lm));
    [[[W / 2, -o, zb], W], [[-o, D / 2, zb], D], [[-o, -o, H / 2], H]].forEach(function (x) { var el = document.createElement('span'); el.className = 'nv3-dim'; el.textContent = fmt(x[1]) + ' mm'; st.appendChild(el); NV3.labels.push({ el: el, p: new T.Vector3().fromArray(x[0]) }); });
  }
  root.updateMatrixWorld(true);
  var fitId = c.id + '|' + W + '|' + H + '|' + D + '|' + (jx ? 'x' : '');
  if (NV3.cabId !== fitId) { var keep = NV3.cabId && NV3.cabId.split('|')[0] === c.id; NV3.cabId = fitId; nv3View(keep ? null : 'iso'); }
}
function nv3Pose() {   // doors and drawers at the opening of the slider
  (NV3.moving || []).forEach(function (m) { if (m.door) m.g.rotation.z = m.hinged ? m.sign * NV3.open * Math.PI * 0.55 : 0; else m.g.position.y = -m.travel * NV3.open; });
  if (!NV3.links || !NV3.links.length) return;
  var T = NV3.T, up = new T.Vector3(0, 1, 0); NV3.root.updateMatrixWorld(true);
  var set = function (mesh, A, B) { var d = B.clone().sub(A), len = d.length(); mesh.visible = len > 6; if (!mesh.visible) return; mesh.position.copy(A).addScaledVector(d, 0.5); mesh.scale.set(1, len, 1); mesh.quaternion.setFromUnitVectors(up, d.normalize()); };
  NV3.links.forEach(function (k) {   // the hinge's links between the arm on the side and the cup on the door, wherever the door is
    var A = new T.Vector3().fromArray(k.a), C = NV3.root.worldToLocal(k.inner.localToWorld(new T.Vector3().fromArray(k.cup)));
    var gap = C.distanceTo(A), M = A.clone().add(C).multiplyScalar(0.5); M.y -= Math.min(14, gap * 0.25);
    var show = gap > 22; k.l1.visible = k.l2.visible = show; if (show) { set(k.l1, A, M); set(k.l2, M, C); }
  });
}
function nv3View(kind) {
  var T = NV3.T, c = cur(); if (!c || !NV3.cam) return;
  var W = num(c.dishwasher ? c.dishWidth : c.W) || 600, H = num(c.H) || 720, D = num(c.D) || 560, pad = NV3.joints && NV3.jExp !== false && c.kind !== 'panel' ? Math.max(260, Math.max(W, H, D) * 0.18) : 0,   // pulled apart: 130 mm further out on every side, plus the screws
    size = Math.hypot(W + pad, H + pad, D + pad), tg = new T.Vector3(W / 2, H / 2 - (pad ? 0 : 30), -D / 2 + (pad ? 0 : 60));
  var dirV = kind ? new T.Vector3().fromArray(kind === 'front' ? [0, 0.05, 1] : kind === 'under' ? [-0.5, -0.75, 1] : kind === 'back' ? [0.6, 0.45, -1] : [-0.62, 0.48, 1]) : NV3.cam.position.clone().sub(NV3.ctl.target);   // no kind: the same cabinet, another size or mode — keep the angle
  if (dirV.length() < 1e-6) dirV.set(-0.62, 0.48, 1);
  var dist = size / 2 / Math.tan(NV3.cam.fov * Math.PI / 360) * (pad ? 1.02 : 1.22) / Math.min(1, (function () { var e = document.getElementById('nv3-stage'); return e && e.clientHeight ? e.clientWidth / e.clientHeight : NV3.cam.aspect || 1; })());   // a narrow picture is limited by its width
  NV3.cam.position.copy(tg).add(dirV.normalize().multiplyScalar(dist)); NV3.cam.near = dist / 60; NV3.cam.far = dist * 12; NV3.cam.updateProjectionMatrix();
  NV3.ctl.target.copy(tg); NV3.ctl.update();
}
function nv3Hit(e) {
  var cv = NV3.R.domElement, rc = cv.getBoundingClientRect(), T = NV3.T;
  NV3.ray.setFromCamera(new T.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)), NV3.cam);
  var hits = NV3.ray.intersectObjects(NV3.pick, false); return hits.length ? hits[0] : null;
}
function nv3EdgeOf(h) { var mi = h && h.face ? h.face.materialIndex : -1; return h && h.object.userData.edge && mi >= 0 && mi < 4 ? ['x1', 'x0', 'y1', 'y0'][mi] : null; }
function nv3SetHover(mat) { if (NV3.hover === mat) return; if (NV3.hover) { NV3.hover.emissive.copy(NV3.hover.userData.em); NV3.hover.emissiveIntensity = NV3.hover.userData.ei; } NV3.hover = mat;
  if (mat) { if (!mat.userData.em) { mat.userData.em = mat.emissive.clone(); mat.userData.ei = mat.emissiveIntensity; } mat.emissive.set('#e8b90c'); mat.emissiveIntensity = 0.9; } }
function nv3Hover(e) {
  var h = nv3Hit(e), ed = NV3.edges ? nv3EdgeOf(h) : null;
  nv3SetHover(ed ? h.object.material[h.face.materialIndex] : null);
  NV3.R.domElement.style.cursor = ed || (h && !NV3.edges) ? 'pointer' : 'grab';
}
function nv3Click(e) {
  var h = nv3Hit(e); if (!h) return;
  var part = h.object.userData.part, key = h.object.userData.key;
  if (NV3.edges) {
    var ed = nv3EdgeOf(h);
    if (ed && key) { var b = document.createElement('button'); b.hidden = true; b.setAttribute('data-act', 'ebk'); b.setAttribute('data-v', key); b.setAttribute('data-i', ed); app.appendChild(b); b.click(); return; }   // the live edge command does the work
    if (key && !NV3.focus) { NV3.focus = key; render(); }
    return;
  }
  if (part && typeof nvpOpen === 'function') nvpOpen(part, e.clientX, e.clientY);
}
document.addEventListener('keydown', function (e) { if (e.key !== 'Escape' || !document.getElementById('nv3')) return; if (NV3.focus) { NV3.focus = null; render(); } else if (NV3.full) { NV3.full = false; render(); } });

/* ================================================================= Jungtys — the connectors, edited in this same picture
   The engine gives the seams (r.seams: where two boards meet — origin, direction, length) and the joints on them
   (r.joints: type and the connectors' places in mm along the seam, per side when left and right differ). The carcass
   is shown see-through; every seam is a line with a point per connector. A click selects a joint; a point is dragged
   along its seam; a click on the line adds one. Changes go through the live setJoint(), as the live editor's do. */
var NV3_JC = { confirmat: '#285ac4', cam: '#ca6b23', dowel: '#387b53' };
function nv3JSpec(r, s) { var j = (r.joints || []).filter(function (x) { return x.key === s.key; })[0]; if (!j) return null; return { j: j, sd: s.at || (j.sides ? j.sides[s.side || 'L'] || j.sides.L : j) }; }
function nv3Seams(r, root, expOff) {
  NV3.jPairs = {};
  var T = NV3.T, sel = NV3.jSel, boards = (r.panels || []).filter(function (p) { return p.place && !p.drawerOf && p.role !== 'FASADAS' && p.role !== 'DURYS'; });
  (r.seams || []).forEach(function (s, si) {
    var q = nv3JSpec(r, s); if (!q) return;
    var on = sel && sel.key === s.key && (q.j.single || NV3.jBoth || !s.side || sel.side === s.side), col = on ? '#1c4fd8' : '#7f93a8';
    var d = new T.Vector3().fromArray(s.d).normalize(), offs = [[0, 0, 0]];
    if (expOff) {   // pulled apart: the joint is drawn on each of the two boards it joins, and every connector spans the gap between them
      var M = [0, 1, 2].map(function (i) { return s.o[i] + d.getComponent(i) * s.w / 2; }), found = [];
      boards.forEach(function (p) { var pl = p.place, rel = [0, 1, 2].map(function (i) { return M[i] - pl.o[i]; }), dot = function (v) { return rel[0] * v[0] + rel[1] * v[1] + rel[2] * v[2]; }, a1 = dot(pl.u), b1 = dot(pl.v), t1 = -dot(pl.n);
        if (a1 < -2 || a1 > p.L + 2 || b1 < -2 || b1 > p.W + 2 || t1 < -2 || t1 > p.T + 2) return;
        var cen = [0, 1, 2].map(function (i) { return pl.o[i] + pl.u[i] * p.L / 2 + pl.v[i] * p.W / 2 - pl.n[i] * p.T / 2; }), o1 = expOff(cen);
        o1.key = p.key; o1.cen = cen; o1.edge = Math.abs(t1 - p.T / 2) < p.T / 4;   // the joint runs down the middle of this board's edge
        if (!found.some(function (f) { return Math.hypot(f[0] - o1[0], f[1] - o1[1], f[2] - o1[2]) < 1; })) found.push(o1); });
      if (found.length) offs = found.slice(0, 2);
      NV3.jPairs[si] = offs.map(function (f) { return f.key; });
      if (offs.length === 2) { var eB = offs[0].edge ? offs[0] : offs[1].edge ? offs[1] : null, fB = eB === offs[0] ? offs[1] : offs[0], ax = null;
        if (eB) { var v0 = new T.Vector3(eB.cen[0] - M[0], eB.cen[1] - M[1], eB.cen[2] - M[2]); v0.addScaledVector(d, -v0.dot(d)); if (v0.length() > 1) ax = v0.normalize(); }   // from the joint into the board whose edge it is
        (q.sd.pos || []).forEach(function (pp) { var at = function (o3) { return new T.Vector3(s.o[0] + d.x * pp + o3[0], s.o[1] + d.y * pp + o3[1], s.o[2] + d.z * pp + o3[2]); }, P0 = at(offs[0]), P1 = at(offs[1]), arr = function (v) { return [v.x, v.y, v.z]; };
          root.add(nv3Rod(arr(P0), arr(P1), 1.1, NV3_JC[q.sd.type] || '#444', { roughness: 0.5, transparent: true, opacity: on ? 0.75 : 0.4 }));   // which place meets which
          if (!ax) return; var PF = at(fB), PE = at(eB);
          if (q.sd.type === 'cam') {   // the bolt stands in the face of one board and goes into the edge of the other, where the cam turns on it
            root.add(nv3Rod(arr(PF), arr(PF.clone().addScaledVector(ax, 58)), 6, '#a9b2b7')); root.add(nv3Rod(arr(PF), arr(PF.clone().addScaledVector(ax, 8)), 10, '#8d969b'));
            var hd = new T.Mesh(NV3.gBall = NV3.gBall || new T.SphereGeometry(9, 16, 12), nv3Mat('#a9b2b7', { metalness: 0.9, roughness: 0.3 })); hd.position.copy(PF).addScaledVector(ax, 60); root.add(hd); }
          else if (q.sd.type === 'dowel') root.add(nv3Rod(arr(PE.clone().addScaledVector(ax, -52)), arr(PE.clone().addScaledVector(ax, 4)), 8, '#c9a36b', { roughness: 0.8, metalness: 0 }));
        }); }
    }
    offs.forEach(function (off) {
    var a = new T.Vector3(s.o[0] + off[0], s.o[1] + off[1], s.o[2] + off[2]), b = a.clone().addScaledVector(d, s.w), so = [a.x, a.y, a.z];
    var ln = new T.Line(new T.BufferGeometry().setFromPoints([a, b]), new T.LineBasicMaterial({ color: new T.Color(col), depthTest: false, transparent: true, opacity: on ? 1 : 0.8 })); ln.renderOrder = 5; root.add(ln);
    var hit = nv3Rod(so, [b.x, b.y, b.z], on ? 4.5 : 7, col, { transparent: true, opacity: on ? 0.55 : 0.001, depthTest: false }); hit.renderOrder = 4; hit.userData = { seam: si, o: so }; root.add(hit); NV3.jpick.push(hit);
    (q.sd.pos || []).forEach(function (pp, k) {
      var m = new T.Mesh(NV3.gDot = NV3.gDot || new T.SphereGeometry(1, 20, 14), new T.MeshBasicMaterial({ color: new T.Color(NV3_JC[q.sd.type] || '#444'), depthTest: false }));
      var dr = expOff ? 0.8 : 1; m.scale.setScalar((on ? (sel.idx === k && (sel.seam === si) ? 12 : 9.5) : 7.5) * dr); m.position.copy(a).addScaledVector(d, pp); m.renderOrder = 6; m.userData = { seam: si, dot: k, o: so }; root.add(m); NV3.jpick.push(m);
      var ring = new T.Mesh(NV3.gDot, new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); ring.scale.setScalar((on ? 9.5 : 7.5) * dr + (expOff ? 1.4 : 2.2)); ring.position.copy(m.position); ring.renderOrder = 5.5; root.add(ring);
    });
    });
  });
}
function nv3JHit(e) {
  var cv = NV3.R.domElement, rc = cv.getBoundingClientRect(), T = NV3.T;
  NV3.ray.setFromCamera(new T.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)), NV3.cam);
  var hits = NV3.ray.intersectObjects(NV3.jpick, false); if (!hits.length) return null;
  return hits.filter(function (h) { return h.object.userData.dot != null; })[0] || hits[0];   // a point wins over its line
}
function nv3JAlong(e, s, o) {   // where along the seam the pointer is: the seam point nearest to the ray under the pointer, in mm from its start
  var T = NV3.T, cv = NV3.R.domElement, rc = cv.getBoundingClientRect();
  NV3.ray.setFromCamera(new T.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)), NV3.cam);
  var P = NV3.root.localToWorld(new T.Vector3().fromArray(o || s.o)), D = new T.Vector3().fromArray(s.d).normalize().transformDirection(NV3.root.matrixWorld), O = NV3.ray.ray.origin, R = NV3.ray.ray.direction;
  var w0 = P.clone().sub(O), b = D.dot(R), dd = D.dot(w0), ee = R.dot(w0), den = 1 - b * b; if (Math.abs(den) < 1e-6) return null;
  return (b * ee - dd) / den;
}
function nv3JLimits(type) { return { edge: type === 'cam' ? 12 : 9, gap: type === 'cam' ? 24 : 16 }; }
function nv3JWidth(r, key, side, single) { var ws = (r.seams || []).filter(function (s) { return s.key === key && (single || NV3.jBoth || !side || s.side === side); }).map(function (s) { return s.w; }); return ws.length ? Math.min.apply(null, ws) : 0; }
/* write a joint: its type and places, for both sides or the selected one; refused (with the reason) when a place breaks the limits */
function nv3JCommit(key, side, type, pos, keepSel) {
  var c = cur(), r = S._info[S.sel].r, j = (r.joints || []).filter(function (x) { return x.key === key; })[0]; if (!j) return false;
  var sd = j.single || NV3.jBoth ? null : side;
  if (pos) { pos = pos.map(function (v) { return Math.round(v * 10) / 10; }).sort(function (a, b) { return a - b; });
    var lim = nv3JLimits(type), w = nv3JWidth(r, key, side, j.single), bad = pos.some(function (v, i) { return !isFinite(v) || v < lim.edge - 0.01 || v > w - lim.edge + 0.01 || (i && v - pos[i - 1] < lim.gap - 0.01); });
    if (bad) { toast(L('Netinkama vieta: nuo krašto ≥ ' + lim.edge + ' mm, tarp jungčių ≥ ' + lim.gap + ' mm. Nepakeista.', 'Not a valid place: ≥ ' + lim.edge + ' mm from the end, ≥ ' + lim.gap + ' mm apart. Not changed.'), true); nv3Build(); return false; } }
  pushUndo(); setJoint(c, key, { side: sd, type: type, pos: pos || null }); if (!keepSel && NV3.jSel) NV3.jSel.idx = null; save(); render(); return true;
}
function nv3JClick(e) {
  var h = nv3JHit(e), r = S._info[S.sel].r;
  if (!h) {   // not on a joint: a board? the first click marks it, the second (another board) finds the joint between the two — as in SWOOD
    var bh = nv3Hit(e), bk = bh && bh.object.userData.key;
    if (bk && NV3.jExp !== false) {
      if (!NV3.jA || NV3.jA === bk) { NV3.jA = NV3.jA === bk ? null : bk; nv3Build(); return; }
      var a0 = NV3.jA, hit = Object.keys(NV3.jPairs || {}).filter(function (k) { var pr = NV3.jPairs[k]; return pr.length === 2 && pr.indexOf(a0) >= 0 && pr.indexOf(bk) >= 0; });
      NV3.jA = null;
      if (!hit.length) { toast(L('Šios dvi detalės nesiliečia — jungties tarp jų nėra.', 'These two boards do not touch — there is no joint between them.'), true); nv3Build(); return; }
      if (NV3.jArm) { nv3JApply(+hit[0], NV3.jArm); return; }
      var s0 = r.seams[+hit[0]]; NV3.jSel = { key: s0.key, side: s0.side || 'L', seam: +hit[0], idx: null }; render(); return;
    }
    if (NV3.jSel || NV3.jA) { NV3.jSel = null; NV3.jA = null; render(); } return; }
  var si = h.object.userData.seam, s = r.seams[si], q = nv3JSpec(r, s); if (!q) return;
  if (NV3.jArm) { nv3JApply(si, NV3.jArm); return; }
  var was = NV3.jSel && NV3.jSel.key === s.key && NV3.jSel.seam === si;
  if (h.object.userData.dot != null || !was) { NV3.jSel = { key: s.key, side: s.side || 'L', seam: si, idx: h.object.userData.dot != null ? h.object.userData.dot : null }; render(); return; }
  var at = nv3JAlong(e, s, h.object.userData.o); if (at == null) return;   // a second click on the selected line: a connector there
  nv3JCommit(s.key, s.side || 'L', q.sd.type, (q.sd.pos || []).concat([Math.round(at)]));
}
function nv3JMove(e) {
  var jd = NV3.jdrag, r = S._info[S.sel].r, s = r.seams[jd.seam], q = nv3JSpec(r, s), at = nv3JAlong(e, s, jd.o); if (!q || at == null) return;
  var lim = nv3JLimits(q.sd.type); at = Math.max(lim.edge, Math.min(s.w - lim.edge, Math.round(at))); jd.at = at; jd.moved = true;
  var T = NV3.T; jd.obj.position.copy(new T.Vector3().fromArray(jd.o || s.o)).addScaledVector(new T.Vector3().fromArray(s.d).normalize(), at);
  var lab = document.getElementById('nv3-jtip'); if (!lab) { lab = document.createElement('span'); lab.id = 'nv3-jtip'; lab.className = 'nv3-dim nv3-jtip'; NV3.R.domElement.parentNode.appendChild(lab); }
  var rc = NV3.R.domElement.getBoundingClientRect(); lab.textContent = at + ' mm'; lab.style.transform = 'translate(-50%,-180%) translate(' + (e.clientX - rc.left) + 'px,' + (e.clientY - rc.top) + 'px)';
}
function nv3JDrop(jd) {
  var lab = document.getElementById('nv3-jtip'); if (lab) lab.remove();
  var r = S._info[S.sel].r, s = r.seams[jd.seam], q = nv3JSpec(r, s); if (!q || jd.at == null) return;
  var pos = (q.sd.pos || []).slice(); pos[jd.i] = jd.at; NV3.jSel = { key: s.key, side: s.side || 'L', seam: jd.seam, idx: null };
  nv3JCommit(s.key, s.side || 'L', q.sd.type, pos);
}
/* ---- the connector library, as in SWOOD: take a connector and put it on the contact between two boards — drag it
   onto the joint, or click it (it stays in hand) and click the joints, or click two boards. The engine's rule then
   sets how many and where from the contact's length, and drills both boards. */
var NV3_LIB = [['confirmat', 'Konfirmatas', 'Confirmat'], ['cam', 'Ekscentrikas + kaištis', 'Cam + dowel'], ['dowel', 'Kaištis', 'Dowel'], ['none', 'Be jungties', 'No connector']];
function nv3JPalette(c) {
  var arm = NV3.jArm, box = c.kind === 'box';
  return '<div class="nv3-jrow nv3-pal"><span class="nv3-pal-t">' + L('Jungčių biblioteka', 'Connector library') + '</span>' +
    NV3_LIB.map(function (x) { return '<button type="button" class="nv3-conn' + (arm === x[0] ? ' on' : '') + '" data-nv3conn="' + x[0] + '" aria-pressed="' + (arm === x[0]) + '" title="' + esc(L('Tempkite ant jungties modelyje — arba spustelėkite ir tada spauskite jungtis', 'Drag onto a joint in the model — or click it, then click the joints')) + '"><i style="background:' + (NV3_JC[x[0]] || '#9aa1a6') + '"></i>' + L(x[1], x[2]) + '</button>'; }).join('') +
    (arm ? '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:all">' + L('Uždėti visoms jungtims', 'Put on every joint') + '</button><button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:disarm">' + L('Padėti atgal', 'Put back') + '</button>' : '') +
    '<span class="nv-muted nv3-pal-r">' + (arm ? L('Spauskite jungtis (ar dvi detales), kurioms jos reikia.', 'Click the joints (or two boards) that need it.')
      : box ? L('Kiek ir kur — pagal taisyklę: 50 mm nuo galų, toliau ne rečiau kaip kas 400 mm.', 'How many and where — by the rule: 50 mm from the ends, then at most 400 mm apart.')
            : L('Kiek ir kur — pagal dirbtuvės taisyklę kiekvienam mazgui.', 'How many and where — by the workshop rule for each joint.')) + '</span></div>';
}
function nv3JApply(si, k) {
  var r = S._info[S.sel].r, s = r.seams[si], q = s && nv3JSpec(r, s); if (!q) return;
  NV3.jSel = { key: s.key, side: s.side || 'L', seam: si, idx: null };
  if (k === 'none') nv3JCommit(s.key, s.side || 'L', q.sd.type, [], true); else nv3JCommit(s.key, s.side || 'L', k, null, true);
}
(function () {   // dragging a connector from the library onto a joint
  var D = null;
  var seamAt = function (ev) { var cv = NV3.R && NV3.R.domElement, rc = cv && cv.getBoundingClientRect(); if (!cv || ev.clientX < rc.left || ev.clientX > rc.right || ev.clientY < rc.top || ev.clientY > rc.bottom) return null; var h = nv3JHit(ev); return h ? h.object.userData.seam : null; };
  var hot = function (si) { if (NV3.jHot === si) return; NV3.jHot = si; (NV3.jpick || []).forEach(function (m) { if (m.userData.dot != null || !m.material || m.userData.hot0 == null && si == null) return; if (m.userData.hot0 == null) m.userData.hot0 = m.material; m.material = m.userData.seam === si ? nv3Mat('#f0a202', { transparent: true, opacity: 0.85, depthTest: false }) : m.userData.hot0; }); };
  document.addEventListener('pointerdown', function (ev) { var el = ev.target && ev.target.closest ? ev.target.closest('[data-nv3conn]') : null; if (!el || ev.button) return;
    D = { k: el.getAttribute('data-nv3conn'), x: ev.clientX, y: ev.clientY, ghost: null, label: el.innerHTML }; ev.preventDefault(); }, true);
  document.addEventListener('pointermove', function (ev) { if (!D) return;
    if (!D.ghost && Math.hypot(ev.clientX - D.x, ev.clientY - D.y) > 5) { D.ghost = document.createElement('div'); D.ghost.className = 'nv3-conn nv3-ghost'; D.ghost.innerHTML = D.label; document.body.appendChild(D.ghost); }
    if (!D.ghost) return; D.ghost.style.transform = 'translate(' + (ev.clientX + 12) + 'px,' + (ev.clientY + 12) + 'px)';
    var si = seamAt(ev); hot(si); D.ghost.classList.toggle('ok', si != null); });
  document.addEventListener('pointerup', function (ev) { var d = D; if (!d) return; D = null;
    if (d.ghost) { d.ghost.remove(); var si = seamAt(ev); hot(null); if (si != null) nv3JApply(si, d.k); return; }
    NV3.jArm = NV3.jArm === d.k ? null : d.k; render(); });   // a plain click: the connector stays in hand
})();
/* the bar under the toolbar: which joint, its type, how many, where */
function nv3JBar(c) {
  var r = S._info[S.sel].r, joints = r.joints || [], sel = NV3.jSel, j = sel && joints.filter(function (x) { return x.key === sel.key; })[0];
  var nm = function (x) { return esc(typeof tJ === 'function' ? tJ('jk_' + x.key) : x.label || x.key); };
  if (!joints.length) return '<div class="nv3-bar"><b>' + L('Jungtys', 'Joints') + '</b> <span class="nv-muted">' + L('Šioje spintelėje jungčių nėra.', 'This cabinet has no joints.') + '</span></div>';
  if (!j) { NV3.jSel = null;
    return '<div class="nv3-bar nv3-jbar">' + nv3JPalette(c) + '<div class="nv3-jrow"><b>' + L('Jungtys', 'Joints') + '</b><span class="nv3-jchips">' + joints.map(function (x) { var n = (x.single ? ['L'] : ['L', 'R']).reduce(function (a, sd) { return a + ((x.sides ? x.sides[sd] || x.sides.L : x).pos || []).length; }, 0);
      return '<button type="button" class="nv3-jchip' + (n ? '' : ' empty') + '" data-nv="nv3" data-v="j:pick:' + esc(x.key) + '">' + nm(x) + ' <i>' + n + '</i></button>'; }).join('') + '</span>' +
      '<span class="nv3-grow"></span>' + '<button type="button" class="nv-btn sm' + (NV3.jExp !== false ? ' on' : ' ghost') + '" data-nv="nv3" data-v="j:exp" title="' + esc(L('Detalės atitraukiamos viena nuo kitos — matyti, kas į ką sukama', 'The boards are pulled apart — you see what goes into what')) + '">⤢ ' + L('Išskleista', 'Exploded') + '</button>' + '<button type="button" class="nv-btn sm ghost" data-act="jcopen">' + L('Sąrašas ir patvirtinimas →', 'List and confirmation →') + '</button><button type="button" class="nv-btn sm pri" data-nv="nv3" data-v="joints">' + L('Gerai', 'Done') + '</button></div></div>'; }
  var sd = j.sides ? j.sides[sel.side] || j.sides.L : j, w = nv3JWidth(r, j.key, sel.side, j.single), pos = sd.pos || [], lim = nv3JLimits(sd.type);
  var ty = function (k, label) { return '<button type="button" class="' + (sd.type === k ? 'on' : '') + '" data-nv="nv3" data-v="j:type:' + k + '"><i style="background:' + NV3_JC[k] + '"></i>' + label + '</button>'; };
  return '<div class="nv3-bar nv3-jbar">' + nv3JPalette(c) + '<div class="nv3-jrow"><b>' + nm(j) + '</b> <span class="nv-muted">' + fmt(Math.round(w)) + ' mm' + (j.custom || j.manual ? ' · ' + L('pakeista', 'changed') : ' · ' + L('standartas', 'standard')) + '</span>' +
      '<span class="nv3-grow"></span>' + (j.single ? '' : '<span class="seg nv3-jseg"><button type="button" class="' + (NV3.jBoth ? 'on' : '') + '" data-nv="nv3" data-v="j:both:1">' + L('Abu šonai', 'Both sides') + '</button><button type="button" class="' + (!NV3.jBoth && sel.side === 'L' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:L">' + L('Kairė', 'Left') + '</button><button type="button" class="' + (!NV3.jBoth && sel.side === 'R' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:R">' + L('Dešinė', 'Right') + '</button></span>') +
      '<button type="button" class="nv-btn sm' + (NV3.jExp !== false ? ' on' : ' ghost') + '" data-nv="nv3" data-v="j:exp" title="' + esc(L('Detalės atitraukiamos viena nuo kitos — matyti, kas į ką sukama', 'The boards are pulled apart — you see what goes into what')) + '">⤢ ' + L('Išskleista', 'Exploded') + '</button>' + '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:reset">↺ ' + L('Standartas', 'Standard') + '</button><button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:none">' + L('Visos jungtys', 'All joints') + '</button><button type="button" class="nv-btn sm pri" data-nv="nv3" data-v="joints">' + L('Gerai', 'Done') + '</button></div>' +
    '<div class="nv3-jrow"><span class="seg nv3-jseg nv3-jtype">' + ty('confirmat', t('jtConf')) + ty('cam', t('jtCam')) + ty('dowel', t('jtDowel')) + '</span>' +
      '<span class="nv-step"><button type="button" data-nv="nv3" data-v="j:n:-1"' + (pos.length ? '' : ' disabled') + '>−</button><b>' + pos.length + '</b><button type="button" data-nv="nv3" data-v="j:n:1">+</button></span>' +
      '<span class="nv3-jpos">' + pos.map(function (v, k) { return '<label class="' + (sel.idx === k ? 'on' : '') + '"><input type="text" inputmode="decimal" value="' + fmt(v) + '" data-nv3j="' + k + '" aria-label="' + (k + 1) + '"><button type="button" data-nv="nv3" data-v="j:del:' + k + '" title="' + esc(L('Pašalinti', 'Remove')) + '">✕</button></label>'; }).join('') + '</span>' +
      '<span class="nv-muted nv3-jlim">' + L('mm nuo jungties pradžios · kraštas ≥ ' + lim.edge + ', tarpas ≥ ' + lim.gap, 'mm from the start · end ≥ ' + lim.edge + ', apart ≥ ' + lim.gap) + '</span></div></div>';
}
function nv3JAct(a, el) {
  var r = S._info[S.sel].r, sel = NV3.jSel, p = a.split(':');
  if (p[0] === 'pick') { var s0 = (r.seams || []).map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.key === p[1]; })[0]; NV3.jSel = { key: p[1], side: (s0 && s0.s.side) || 'L', seam: s0 ? s0.i : null, idx: null }; return; }
  if (p[0] === 'none') { NV3.jSel = null; return; }
  if (p[0] === 'exp') { NV3.jExp = NV3.jExp === false; return; }
  if (p[0] === 'disarm') { NV3.jArm = null; return; }
  if (p[0] === 'all') { var k0 = NV3.jArm, c0 = cur(); if (!k0) return; pushUndo();   // the connector in hand on every joint, each by its own rule
    (r.joints || []).forEach(function (x) { setJoint(c0, x.key, k0 === 'none' ? { side: null, type: (x.sides ? x.sides.L : x).type, pos: [] } : { side: null, type: k0, pos: null }); }); NV3.jSel = null; save(); return; }
  if (!sel) return;
  var j = (r.joints || []).filter(function (x) { return x.key === sel.key; })[0]; if (!j) return;
  var sd = j.sides ? j.sides[sel.side] || j.sides.L : j, pos = (sd.pos || []).slice(), w = nv3JWidth(r, j.key, sel.side, j.single);
  if (p[0] === 'both') { if (p[1] === '1') NV3.jBoth = true; else { NV3.jBoth = false; sel.side = p[1]; var s1 = (r.seams || []).map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.key === sel.key && x.s.side === p[1]; })[0]; if (s1) sel.seam = s1.i; } return; }
  if (p[0] === 'type') { nv3JCommit(j.key, sel.side, p[1], null, true); return false; }   // the type's own standard places
  if (p[0] === 'reset') { pushUndo(); var c = cur(); if (j.single || NV3.jBoth) { if (c.cnc.joints) delete c.cnc.joints[j.key]; } else setJoint(c, j.key, { side: sel.side, type: sd.type, pos: null }); save(); return; }
  if (p[0] === 'del') { pos.splice(+p[1], 1); nv3JCommit(j.key, sel.side, sd.type, pos); return false; }
  if (p[0] === 'n') { var n = Math.max(0, pos.length + (+p[1])), lim = nv3JLimits(sd.type), e0 = Math.max(lim.edge, Math.min(pos.length ? pos[0] : (j.defE || 50), w / 2 - 1));
    var np = n === 0 ? [] : n === 1 ? [Math.round(w / 2)] : Array.from({ length: n }, function (_, i) { return Math.round((e0 + (w - 2 * e0) * i / (n - 1)) * 10) / 10; });
    nv3JCommit(j.key, sel.side, sd.type, np); return false; }
}
app.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-nv3j'); if (k == null || !NV3.jSel) return;
  var r = S._info[S.sel].r, sel = NV3.jSel, j = (r.joints || []).filter(function (x) { return x.key === sel.key; })[0]; if (!j) return;
  var sd = j.sides ? j.sides[sel.side] || j.sides.L : j, pos = (sd.pos || []).slice(), v = num(e.target.value); if (!isFinite(v)) { e.target.value = fmt(pos[+k]); return; }
  pos[+k] = v; if (!nv3JCommit(j.key, sel.side, sd.type, pos)) e.target.value = fmt((sd.pos || [])[+k]); });
