/* 48-view3.js — the 3-D picture of a cabinet, drawn on the graphics card (three.js, the same library the realistic
   room picture loads). Replaces the live software-drawn view in the cabinet workspace: smooth turning at full
   sharpness, lit boards with crisp outlines, doors that swing on their hinges and drawers that run out, and — in the
   same picture — click a board to change it, or switch "Kraštai" on and click an edge to band it.
   Built from the engine's real parts (r.panels with their placement), so it shows exactly what will be cut.
   The live view stays for what this one does not do yet: editing connectors (Jungtys) and 3-D constructions.
   Cabinet axes: x right, y from the front to the back, z up → the whole model sits in a group turned −90° about x. */
var NV3 = { T: null, OC: null, loading: false, failed: false, R: null, scene: null, cam: null, ctl: null, root: null, env: null,
  open: 0.65, mode: 'assembly', edges: false, focus: null, dims: true, handles: false, hw: true, full: false,
  pick: [], labels: [], links: [], hover: null, cabId: null, raf: 0, down: null, mats: {} };
function nv3Load() {
  if (NV3.T || NV3.loading || NV3.failed) return;
  NV3.loading = true;
  Promise.all([import('three'), import('three/examples/jsm/controls/OrbitControls.js'), import('three/examples/jsm/environments/RoomEnvironment.js')]).then(function (m) {
    NV3.T = m[0]; NV3.OC = m[1].OrbitControls; NV3.RE = m[2].RoomEnvironment; NV3.loading = false;
    if (!S.home && S.tab === 'cab' && NV.view === '3d') render();
  }).catch(function (e) { NV3.failed = true; NV3.loading = false; if (window.console) console.warn('three.js not loaded — the built-in 3-D view is used', e); });
}
function nv3On() { var c = cur(); return NV.view === '3d' && !NV.r3off && !!NV3.T && !NV3.failed && !!c && c.kind !== 'box'; }
/* the markup of the view; null → the live view is used (30-editor.js asks) */
function nv3Html() {
  nv3Load(); if (!nv3On()) return null;
  var b = function (attr, label, on, title) { return '<button type="button" class="nv3-b' + (on ? ' on' : '') + '" data-nv="nv3" data-v="' + attr + '"' + (on != null ? ' aria-pressed="' + !!on + '"' : '') + (title ? ' title="' + esc(title) + '"' : '') + '>' + label + '</button>'; };
  var c = cur(), fp = NV3.focus && S._info[S.sel] && S._info[S.sel].r.panels.filter(function (p) { return p.key === NV3.focus; })[0];
  if (NV3.focus && !fp) NV3.focus = null;
  return '<div class="nv3' + (NV3.full ? ' full' : '') + '" id="nv3"><div class="nv3-tools">' +
      b('m:assembly', L('Surinkta', 'Assembled'), NV3.mode === 'assembly') + b('m:interior', L('Be fasadų', 'No fronts'), NV3.mode === 'interior') +
      b('edges', '▭ ' + L('Kraštai', 'Edges'), NV3.edges, L('Kraštų laminavimas: spustelėkite kraštą modelyje', 'Edge banding: click an edge on the model')) +
      b('joints', '⊙ ' + L('Jungtys', 'Joints'), null, L('Jungčių redagavimas', 'Edit the connectors')) +
      '<span class="nv3-sep"></span>' + b('v:front', L('Priekis', 'Front')) + b('v:iso', '3D') + b('v:under', L('Apačia', 'Below')) + b('v:back', L('Galas', 'Back')) +
      '<span class="nv3-grow"></span>' + b('full', NV3.full ? L('Uždaryti ✕', 'Close ✕') : L('Išplėsti ⤢', 'Expand ⤢'), NV3.full) + '</div>' +
    (NV3.edges ? '<div class="nv3-bar">' + (fp ? '<b>' + L('Kraštai', 'Edges') + ' — ' + esc(typeof nvpName === 'function' ? nvpName({ kind: 'panel', role: fp.role }, fp) : fp.short) + '</b> <span class="nv-muted">' + fmt(fp.L) + ' × ' + fmt(fp.W) + '</span>' : '<b>' + L('Kraštų laminavimas', 'Edge banding') + '</b>') +
      ' <span class="nv3-leg"><i style="background:#1f5fbf"></i>' + esc(c.edge.carc || L('karkaso kraštas', 'carcass edge')) + ' <i style="background:#d9730d"></i>' + L('pagal fasadą', 'as the fronts') + ' <i style="background:#b9b4a8"></i>' + L('nelaminuojama', 'not banded') + '</span>' +
      '<span class="nv3-grow"></span>' + (fp ? '<button type="button" class="nv-btn sm" data-act="ebk" data-v="' + esc(fp.key) + '" data-i="all">' + L('Visi 4 / nė vieno', 'All 4 / none') + '</button><button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="unfocus">' + L('Visa spintelė', 'Whole cabinet') + '</button>' : '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="ecall">' + L('Sąrašas ir patvirtinimas →', 'List and confirmation →') + '</button>') +
      '<button type="button" class="nv-btn sm pri" data-nv="nv3" data-v="edges">' + L('Gerai', 'Done') + '</button></div>' : '') +
    '<div class="nv3-stage" id="nv3-stage"><div class="nv3-cam"><button type="button" data-nv="nv3" data-v="z:0.8" aria-label="+">+</button><button type="button" data-nv="nv3" data-v="z:1.25" aria-label="−">−</button><button type="button" data-nv="nv3" data-v="v:iso" aria-label="reset">↺</button></div>' +
      '<div class="nv3-hint">' + (NV3.edges ? L('Spustelėkite kraštą: nelaminuojama → karkaso kraštas → pagal fasadą', 'Click an edge: not banded → carcass edge → as the fronts') : L('Tempkite — sukite · ratukas — mastelis · dešinys klavišas — perstumti · spustelėkite detalę — keisti', 'Drag to turn · wheel to zoom · right button to pan · click a board to change it')) + '</div></div>' +
    '<div class="nv3-foot"><label class="nv3-range"><span>' + L('Atidarymas', 'Opening') + '</span><input type="range" min="0" max="100" step="1" value="' + Math.round(NV3.open * 100) + '" id="nv3-open"><output id="nv3-open-o">' + Math.round(NV3.open * 100) + '%</output></label>' +
      '<label class="chk"><input type="checkbox" data-nv3="hw"' + (NV3.hw ? ' checked' : '') + '> ' + L('Furnitūra', 'Hardware') + '</label><label class="chk"><input type="checkbox" data-nv3="dims"' + (NV3.dims ? ' checked' : '') + '> ' + L('Matmenys', 'Dimensions') + '</label><label class="chk"><input type="checkbox" data-nv3="handles"' + (NV3.handles ? ' checked' : '') + '> ' + L('Rankenos', 'Handles') + '</label></div>' +
    '<span data-live="nv3" hidden></span></div>';
}
NVLIVE.nv3 = function () { nv3Build(); return ''; };
NVA.nv3 = function (el, v) {
  if (v.indexOf('m:') === 0) { NV3.mode = v.slice(2); return; }
  if (v === 'edges') { NV3.edges = !NV3.edges; NV3.focus = null; return; }
  if (v === 'unfocus') { NV3.focus = null; return; }
  if (v === 'ecall') { S.echeck = true; S.jcheck = false; return; }
  if (v === 'joints') { NV.r3off = 'joints'; NV3.full = false; return; }
  if (v === 'full') { NV3.full = !NV3.full; return; }
  if (v.indexOf('v:') === 0) { nv3View(v.slice(2)); return false; }
  if (v.indexOf('z:') === 0) { var k = +v.slice(2), cm = NV3.cam, tg = NV3.ctl.target; cm.position.sub(tg).multiplyScalar(k).add(tg); NV3.ctl.update(); return false; }
};
NVA.nv3back = function () { NV.r3off = null; };
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
  cv.addEventListener('pointerdown', function (e) { NV3.down = e.button === 0 ? [e.clientX, e.clientY] : null; });
  cv.addEventListener('pointerup', function (e) { var d = NV3.down; NV3.down = null; if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 4) return; nv3Click(e); });
  cv.addEventListener('pointermove', function (e) { if (e.buttons) return; nv3Hover(e); });
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
  var T = NV3.T, q = p.place, g = new T.BoxGeometry(p.L, p.W, p.T), fe = (cur().edge.facade || 'PAGAL FASADA'), mats;
  var dim = opt && opt.dim, edgeMode = NV3.edges && !dim && p.key;
  if (edgeMode) { var em = function (e) { var st = ecState(p, e, fe); return new T.MeshStandardMaterial({ color: new T.Color(st === 1 ? '#1f5fbf' : st === 2 ? '#d9730d' : '#b9b4a8'), roughness: 0.6, emissive: new T.Color(st === 1 ? '#0b2a5c' : st === 2 ? '#6a3200' : '#000000'), emissiveIntensity: st ? 0.35 : 0 }); };
    var face = nv3Mat(color); mats = [em('x1'), em('x0'), em('y1'), em('y0'), face, face]; }
  else mats = dim ? nv3Mat(color, { transparent: true, opacity: 0.16, depthWrite: false }) : nv3Mat(color);
  var m = new T.Mesh(g, mats), u = new T.Vector3().fromArray(q.u).normalize(), v = new T.Vector3().fromArray(q.v).normalize(), n = new T.Vector3().fromArray(q.n).normalize();
  var z = new T.Vector3().crossVectors(u, v);   // right-handed third axis: n or −n, the box is symmetric
  m.matrixAutoUpdate = false;
  var cx = [0, 1, 2].map(function (i) { return q.o[i] + q.u[i] * p.L / 2 + q.v[i] * p.W / 2 - q.n[i] * p.T / 2; });
  m.matrix.makeBasis(u, v, z).setPosition(cx[0], cx[1], cx[2]); void n;
  var ln = new T.LineSegments(new T.EdgesGeometry(g), new T.LineBasicMaterial({ color: 0x1c211e, transparent: true, opacity: dim ? 0.12 : 0.28 })); m.add(ln);
  m.userData = { part: { kind: 'panel', role: p.role, name: p.name }, key: p.key, cen: cx, edge: !!edgeMode };
  if (!dim) NV3.pick.push(m);
  return m;
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
  (r.panels || []).forEach(function (p) { if (!p.place || p.drawerOf || isFront(p)) return; root.add(place(nv3Board(p, MC(p.mat, '#e9e6de'), { dim: focus && p.key !== focus }), p)); });
  var faint = focus ? { transparent: true, opacity: 0.16, depthWrite: false } : null;
  if (c.hang !== true) (r.legs || []).forEach(function (l) {
    var rad = (l.d || 40) / 2, g1 = new T.CylinderGeometry(rad, rad, l.h, 28); g1.rotateX(Math.PI / 2);
    var a = new T.Mesh(g1, nv3Mat('#2b3230', Object.assign({ roughness: 0.5 }, faint || {}))); a.position.set(l.x, l.y, -l.h / 2); root.add(a);
    if (!l.feet) { var g2 = new T.CylinderGeometry(rad * 1.4, rad * 1.5, 10, 28); g2.rotateX(Math.PI / 2); var b2 = new T.Mesh(g2, nv3Mat('#222826', Object.assign({ roughness: 0.5 }, faint || {}))); b2.position.set(l.x, l.y, -l.h + 5); root.add(b2); }
  });
  var asm = NV3.mode === 'assembly' && !focus, vis = r.visual || {};
  if (asm || (focus && false)) {
    if (vis.plinth) { var pl = vis.plinth; root.add(nv3Box([pl.x0, pl.y0, pl.z0], [pl.x1 - pl.x0, pl.t, pl.z1 - pl.z0], MC(pl.mat, '#d5cbbd'), null, { kind: 'plinth' })); }
    if (r.worktop) { var wt = r.worktop; root.add(nv3Box([wt.x0, wt.y0, wt.z0], [wt.L, wt.y1 - wt.y0, wt.T], MC(wt.mat, '#b98d5e'), { roughness: 0.45 }, { kind: 'worktop' })); }
    if (E.sidePanels) E.sidePanels(c).forEach(function (q) { root.add(nv3Box([q.x0, q.y0, q.z0], [q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0], MC(q.mat, '#d5cbbd'))); });
  }
  /* fronts: doors on a pivot at their hinge side, drawers on a slide */
  var fronts = (r.panels || []).filter(isFront), di = 0, fi = 0, showF = NV3.mode === 'assembly';
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
  if (NV3.dims && !focus) { var lm = new T.LineBasicMaterial({ color: 0x69726c }), pts = [], seg = function (a, b) { pts.push(new T.Vector3().fromArray(a), new T.Vector3().fromArray(b)); }, o = 55, zb = c.hang === true || !(r.legs || []).length ? 0 : -((r.legs[0] || {}).h || 0);
    seg([0, -o, zb], [W, -o, zb]); seg([0, -o + 14, zb], [0, -o - 14, zb]); seg([W, -o + 14, zb], [W, -o - 14, zb]);
    seg([-o, 0, zb], [-o, D, zb]); seg([-o - 14, 0, zb], [-o + 14, 0, zb]); seg([-o - 14, D, zb], [-o + 14, D, zb]);
    seg([-o, -o, 0], [-o, -o, H]); seg([-o - 14, -o, 0], [-o + 14, -o, 0]); seg([-o - 14, -o, H], [-o + 14, -o, H]);
    root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), lm));
    [[[W / 2, -o, zb], W], [[-o, D / 2, zb], D], [[-o, -o, H / 2], H]].forEach(function (x) { var el = document.createElement('span'); el.className = 'nv3-dim'; el.textContent = fmt(x[1]) + ' mm'; st.appendChild(el); NV3.labels.push({ el: el, p: new T.Vector3().fromArray(x[0]) }); });
  }
  root.updateMatrixWorld(true);
  if (NV3.cabId !== c.id + '|' + W + '|' + H + '|' + D) { var keep = NV3.cabId && NV3.cabId.split('|')[0] === c.id; NV3.cabId = c.id + '|' + W + '|' + H + '|' + D; nv3View(keep ? null : 'iso'); }
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
  var W = num(c.dishwasher ? c.dishWidth : c.W) || 600, H = num(c.H) || 720, D = num(c.D) || 560, size = Math.hypot(W, H, D), tg = new T.Vector3(W / 2, H / 2 - 30, -D / 2 + 60);
  if (!kind) { NV3.ctl.target.copy(tg); NV3.ctl.update(); return; }   // the same cabinet, another size: keep the angle
  var dir = kind === 'front' ? [0, 0.05, 1] : kind === 'under' ? [-0.5, -0.75, 1] : kind === 'back' ? [0.6, 0.45, -1] : [-0.62, 0.48, 1];
  var dist = size / 2 / Math.tan(NV3.cam.fov * Math.PI / 360) * 1.28;
  NV3.cam.position.copy(tg).add(new T.Vector3().fromArray(dir).normalize().multiplyScalar(dist)); NV3.cam.near = dist / 60; NV3.cam.far = dist * 12; NV3.cam.updateProjectionMatrix();
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
