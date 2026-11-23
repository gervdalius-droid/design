
/* Realistic picture of the room (Baldai → "Realus vaizdas"): the furniture of the 3-D view (DBRoom.items3d) with the room's walls
   and floor, path traced on the graphics card — three.js and three-gpu-pathtracer, loaded from jsDelivr on first use. Daylight from
   above and from the sky, real soft shadows and bounced light; boards in their colours and texture photos (DBLook), laid as in the
   3-D view. The picture gets cleaner the longer it runs; drag to turn, wheel to zoom; download as PNG. */
(function (root) {
'use strict';
/* quality: samples to stop at, pixels traced (the picture is scaled up to the window), light bounces, and until how many samples
   the edge-keeping denoiser smooths the grain (less and less as the picture settles) */
var R = null, Q = 'good', QP = { fast:{ n:48, px:0.5e6, b:3, dn:160 }, good:{ n:256, px:1.1e6, b:4, dn:330 }, best:{ n:1000, px:2.6e6, b:6, dn:400 } };
function T(k) { return R && R.o.t ? R.o.t(k) : k; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function status(txt, frac) { if (!R) return; var st = R.ov.querySelector('.rr-st'); if (st) st.textContent = txt; var b = R.ov.querySelector('.rr-bar i'); if (b) b.style.width = Math.round(Math.max(0, Math.min(1, frac || 0)) * 100) + '%'; }
function fail(msg) { status(msg, 0); if (R) R.ov.classList.add('err'); }
function open(o) {
  if (R) close();
  var ov = document.createElement('div'); ov.className = 'rr-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  R = { o:o, ov:ov, th:+o.th || 0.55, eye:+o.eye || 1600, fov:50, far:+o.far || 1, raf:0, room:false };
  try { R.room = localStorage.getItem('dbRR.room') === '1'; } catch (e) {}
  ov.setAttribute('aria-label', T('rrTitle'));
  ov.innerHTML = '<div class="rr-box"><div class="rr-head"><b>' + esc(T('rrTitle')) + '</b><span class="rr-st" role="status">' + esc(T('rrLoading')) + '</span><span class="rr-sp"></span>' +
    '<div class="seg rr-q" role="group" aria-label="' + esc(T('rrQ')) + '">' + ['fast', 'good', 'best'].map(function (q) { return '<button type="button" data-rq="' + q + '" class="' + (q === Q ? 'on' : '') + '" aria-pressed="' + (q === Q) + '">' + esc(T('rrQ_' + q)) + '</button>'; }).join('') + '</div>' +
    '<button type="button" class="btn ghost' + (R.room ? ' on' : '') + '" data-rr="room" aria-pressed="' + R.room + '" title="' + esc(T('rrRoomT')) + '">' + esc(T('rrRoom')) + '</button>' +
    '<button type="button" class="btn" data-rr="dl" disabled>⤓ ' + esc(T('rrDl')) + '</button><button type="button" class="btn ghost" data-rr="close" aria-label="' + esc(T('close')) + '">✕</button></div>' +
    '<div class="rr-stage"><canvas class="rr-cv"></canvas><div class="rr-bar"><i></i></div></div><p class="rr-hint">' + esc(T('rrHint')) + '</p></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', onClick);
  R.key = function (e) {
    if (R && R.sel && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); stepMat(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.key === 'Escape') { if (R && R.sel) { unpick(); return; } close(); } };
  document.addEventListener('keydown', R.key);
  var items = root.DBRoom && root.DBRoom.items3d ? root.DBRoom.items3d(o.proj, o.infos || []) : [];
  if (!items.length) { fail(T('rrEmpty')); return; }
  var timer = new Promise(function (res, rej) { setTimeout(function () { rej(new Error('timeout')); }, 45000); });
  Promise.race([Promise.all([import('three'), import('three-gpu-pathtracer')]), timer]).then(function (m) { if (!R || R.ov !== ov) return; status(T('rrBuilding'), 0); return build(m[0], m[1], items); })
    .catch(function (e) { if (R && R.ov === ov) fail(/WebGL|context/i.test(String(e && e.message)) ? T('rrNoGL') : T('rrNoLib')); try { console.error(e); } catch (er) {} });
}
function close() {
  if (!R) return; var r = R; R = null;
  cancelAnimationFrame(r.raf); document.removeEventListener('keydown', r.key); if (r.resize) window.removeEventListener('resize', r.resize);
  try { if (r.pt && r.pt.dispose) r.pt.dispose(); } catch (e) {}
  try { if (r.renderer) { r.renderer.dispose(); r.renderer.forceContextLoss(); } } catch (e) {}
  r.ov.remove();
}
function onClick(e) {
  if (!R) return; var b = e.target.closest('[data-rr],[data-rq]'); if (!b) { if (e.target === R.ov) close(); return; }
  if (b.getAttribute('data-rr') === 'close') { close(); return; }
  if (b.getAttribute('data-rr') === 'dl') { download(); return; }
  if (b.getAttribute('data-rr') === 'room') {   // the room round the furniture, or the furniture alone (remembered)
    var o2 = Object.assign({}, R.o, { th:R.th, eye:R.eye, far:R.far }); try { localStorage.setItem('dbRR.room', R.room ? '0' : '1'); } catch (e) {} close(); open(o2); return; }
  if (b.getAttribute('data-rr') === 'mprev' || b.getAttribute('data-rr') === 'mnext') { stepMat(b.getAttribute('data-rr') === 'mnext' ? 1 : -1); return; }
  if (b.getAttribute('data-rr') === 'mx') { unpick(); return; }
  var q = b.getAttribute('data-rq'); if (q && QP[q]) { Q = q; R.ov.querySelectorAll('[data-rq]').forEach(function (x) { var on = x.getAttribute('data-rq') === q; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); applyQ(); R.done = false; }
}
function download() {
  if (!R || !R.renderer) return; var cv = R.renderer.domElement, nm = String((R.o.proj && R.o.proj.name) || 'vaizdas').replace(/[^\wÀ-ɏ.-]+/g, '_');
  cv.toBlob(function (b) { if (!b) return; var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nm + '_vaizdas.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }, 'image/png');
}
/* plank floor: light oak, drawn once */
function floorTexture(THREE) {
  var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; var g = cv.getContext('2d'), seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  var pw = 1024 / 6;
  for (var i = 0; i < 6; i++) {
    var y = 0, off = rnd() * 1024;
    while (y < 1024) { var len = 380 + rnd() * 520, base = 178 + rnd() * 16, y0 = (y + off) % 1024; g.fillStyle = 'rgb(' + Math.round(base) + ',' + Math.round(base * 0.87) + ',' + Math.round(base * 0.74) + ')';
      g.fillRect(i * pw, y0, pw, len); if (y0 + len > 1024) g.fillRect(i * pw, y0 - 1024, pw, len); g.fillStyle = 'rgba(70,50,30,0.22)'; g.fillRect(i * pw, y0, pw, 1.5); y += len; }
    for (var k = 0; k < 90; k++) { var x = i * pw + rnd() * pw, a = 0.03 + rnd() * 0.04; g.strokeStyle = 'rgba(90,60,30,' + a + ')'; g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 8 - 4, 340, x + rnd() * 8 - 4, 680, x + rnd() * 6 - 3, 1024); g.stroke(); }
    g.fillStyle = 'rgba(70,50,30,0.35)'; g.fillRect(i * pw, 0, 1.5, 1024);
  }
  var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function loadImage(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
/* where the photo lies on a box's six faces (as in the 3-D view: along the board's grain, laid once over it or repeated at its size) */
function boxUV(geo, size, g, look, iw, ih) {
  var pos = geo.attributes.position, uv = geo.attributes.uv, rot = !!look.rot, fit = look.fit !== false;
  var Lg = size[g], Lw = Math.max.apply(null, [0, 1, 2].filter(function (k) { return k !== g; }).map(function (k) { return size[k]; })), Lu = rot ? Lw : Lg, Lv = rot ? Lg : Lw;
  var k, s0 = 0, t0 = 0; if (fit) { k = Math.min(iw / Lu, ih / Lv); s0 = (iw - Lu * k) / 2; t0 = (ih - Lv * k) / 2; } else k = iw / Math.max(20, +look.mm || 1000);   // laid once: the board takes the biggest piece of the photo of its shape (never past the photo's edge — that smeared its edge pixels)
  for (var i = 0; i < pos.count; i++) {
    var a = [0, 0, 1, 1, 2, 2][i >> 2], p = [pos.getX(i), pos.getY(i), pos.getZ(i)], inPl = [0, 1, 2].filter(function (x) { return x !== a; });
    var u = inPl.indexOf(g) >= 0 ? g : inPl[0], v = inPl[0] === u ? inPl[1] : inPl[0]; if (rot) { var tmp = u; u = v; v = tmp; }
    uv.setXY(i, (s0 + (p[u] + size[u] / 2) * k) / iw, 1 - (t0 + (p[v] + size[v] / 2) * k) / ih);
  }
  uv.needsUpdate = true;
}
/* the furniture: one mesh per board, its material per board name and kind, the texture photos loaded first (kept for later
   rebuilds — a material picked with the arrows rebuilds this group only) */
function furniture(THREE, items) {
  var LK = root.DBLook, V3 = R.V3, texs = R.texs, rd = R;
  var names = {}; items.forEach(function (it) { var n = it.o.tex && it.o.tex.name; if (n && LK && LK.has(n) && !texs[n]) names[n] = 1; });
  return Promise.all(Object.keys(names).map(function (n) { var l = LK.get(n); return loadImage(l.tex).then(function (im) {
      var t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = rd.maxAniso; t.needsUpdate = true;
      if (l.fit === false) t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      texs[n] = { t:t, w:im.naturalWidth || im.width, h:im.naturalHeight || im.height, look:l }; }).catch(function () {}); })).then(function () {
    var mats = rd.mats || (rd.mats = {}), mat = function (it) {
      var kind = it.o.metal ? 'metal' : it.kind || 'part', tn = it.o.tex && it.o.tex.name, tx = tn && texs[tn], key = kind + '|' + (tx ? 'T' + tn : it.color);
      if (mats[key]) return mats[key];
      if (kind === 'led') return (mats[key] = new THREE.MeshStandardMaterial({ color:0xfff3d0, emissive:new THREE.Color(0xffe3a0), emissiveIntensity:6, roughness:0.4 }));   // an LED strip: it lights
      var rough = { front:0.42, top:0.32, hdf:0.75, part:0.55, metal:0.35 }[kind] || 0.5;
      return (mats[key] = new THREE.MeshStandardMaterial({ color:tx ? 0xffffff : new THREE.Color(it.color || '#dddddd'), map:tx ? tx.t : null, roughness:rough, metalness:kind === 'metal' ? 0.7 : 0 }));
    };
    var group = new THREE.Group();
    items.forEach(function (it) {
      var e = it.e, P0 = V3(it.tr([e[0], e[2], e[4]])), ex = V3(it.tr([e[1], e[2], e[4]])).sub(P0), ey = V3(it.tr([e[0], e[3], e[4]])).sub(P0), ez = V3(it.tr([e[0], e[2], e[5]])).sub(P0);
      var size = [ex.length(), ey.length(), ez.length()], c = P0.clone().addScaledVector(ex, 0.5).addScaledVector(ey, 0.5).addScaledVector(ez, 0.5);
      ex.normalize(); ey.normalize(); ez.normalize(); if (new THREE.Vector3().crossVectors(ex, ey).dot(ez) < 0) ey.negate();   // keep the basis right-handed (the box is the same)
      var m = mat(it), mesh;
      if (it.kind === 'leg') { var rr = Math.min(size[0], size[1]) / 2; mesh = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, size[2], 24), m); mesh.matrix.makeBasis(ex, ez, new THREE.Vector3().crossVectors(ex, ez)); }
      else { var geo = new THREE.BoxGeometry(size[0], size[1], size[2]), tn = it.o.tex && it.o.tex.name; if (tn && texs[tn]) boxUV(geo, size, it.o.tex.g || 0, texs[tn].look, texs[tn].w, texs[tn].h);
        mesh = new THREE.Mesh(geo, m); mesh.matrix.makeBasis(ex, ey, ez); }
      mesh.userData = { cab:it.o.cab, kind:it.kind || 'part', front:!!it.o.front, tex:it.o.tex && it.o.tex.name };
      mesh.matrix.setPosition(c); mesh.matrixAutoUpdate = false; mesh.matrixWorldNeedsUpdate = true; group.add(mesh);
    });
    return group;
  });
}
function build(THREE, PT, items) {
  R.THREE = THREE; var o = R.o, ov = R.ov, cv = ov.querySelector('canvas'), stage = ov.querySelector('.rr-stage');
  var renderer = new THREE.WebGLRenderer({ canvas:cv, antialias:false, preserveDrawingBuffer:true, powerPreference:'high-performance' });
  R.renderer = renderer; R.gl = renderer.getContext();
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  var scene = new THREE.Scene(), L = o.proj.layout, G = root.DBRoom.geo(L), H = +L.roomH > 0 ? +L.roomH : 2600;
  scene.background = new THREE.Color(0xe9e7e2);
  var sky = new PT.GradientEquirectTexture(256); sky.topColor.set(0xffffff); sky.bottomColor.set(0x6f685e); sky.exponent = 1.1; sky.update();
  scene.environment = sky; scene.environmentIntensity = 1.05;
  var V3 = function (p) { return new THREE.Vector3(p[0], p[2], p[1]); };   // plan x, plan y, height → three.js (y up)
  R.V3 = V3; R.maxAniso = renderer.capabilities.getMaxAnisotropy(); R.texs = {};
  return furniture(THREE, items).then(function (group) {
    if (!R || R.renderer !== renderer) return;
    var bb = new THREE.Box3(); R.group = group;
    scene.add(group); group.updateMatrixWorld(true); bb.setFromObject(group);
    if (!R.room) {   /* studio (the default): the furniture alone on a plain light floor — no walls, no planks, quicker and calmer */
      var sb = bb.clone(), sw = Math.max(6000, (sb.max.x - sb.min.x) * 4), sd = Math.max(6000, (sb.max.z - sb.min.z) * 4);
      scene.background = new THREE.Color(0xf3f2ef);
      var sfl = new THREE.Mesh(new THREE.BoxGeometry(sw, 20, sd), new THREE.MeshStandardMaterial({ color:0xeceae5, roughness:0.9 })); sfl.position.set((sb.min.x + sb.max.x) / 2, -10, (sb.min.z + sb.max.z) / 2); scene.add(sfl);
      var sl = new THREE.RectAreaLight(0xfff6ea, 4, Math.max(1500, (sb.max.x - sb.min.x) * 1.2), Math.max(1500, (sb.max.z - sb.min.z) * 1.2)); sl.position.set((sb.min.x + sb.max.x) / 2, Math.max(H, sb.max.y) + 600, (sb.min.z + sb.max.z) / 2); sl.lookAt(sl.position.x, 0, sl.position.z); scene.add(sl);
      finish(THREE, PT, scene, bb, [], H, o, L, G, items, stage); return;
    }
    /* the room: floor and walls (those between the eye and the furniture are left out, as in the 3-D view) */
    var rb = new THREE.Box3(); G.forEach(function (g) { rb.expandByPoint(V3([g.P[0], g.P[1], 0])); rb.expandByPoint(V3([g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len, 0])); }); rb.union(bb);
    /* the plank floor: to the horizon (a showroom), or — with a window in the room — over the room and 1.8 m in front of every wall,
       with plain ground outside it, so the view through the window is not of the room's own floor */
    var fb = rb.clone(), win = root.DBRoom.opsOf && root.DBRoom.opsOf(L).some(function (op) { return op.type === 'window'; });
    if (win) { G.forEach(function (g) { [0, g.len].forEach(function (a2) { fb.expandByPoint(V3([g.P[0] + g.d[0] * a2 + g.n[0] * 1800, g.P[1] + g.d[1] * a2 + g.n[1] * 1800, 0])); }); }); fb.min.x -= 100; fb.min.z -= 100; fb.max.x += 100; fb.max.z += 100; }
    else { var fcx = (fb.min.x + fb.max.x) / 2, fcz = (fb.min.z + fb.max.z) / 2; fb.min.x = fcx - 30000; fb.max.x = fcx + 30000; fb.min.z = fcz - 30000; fb.max.z = fcz + 30000; }
    var fw = fb.max.x - fb.min.x, fd = fb.max.z - fb.min.z, ftx = floorTexture(THREE); ftx.repeat.set(fw / 2400, fd / 2400); ftx.anisotropy = R.maxAniso;
    var fl = new THREE.Mesh(new THREE.BoxGeometry(fw, 20, fd), new THREE.MeshStandardMaterial({ map:ftx, roughness:0.55 })); fl.position.set((fb.min.x + fb.max.x) / 2, -10, (fb.min.z + fb.max.z) / 2); scene.add(fl);
    if (win) { var gr = new THREE.Mesh(new THREE.BoxGeometry(60000, 20, 60000), new THREE.MeshStandardMaterial({ color:0xd6d3cb, roughness:0.95 })); gr.position.set(fl.position.x, -13, fl.position.z); scene.add(gr); }
    /* walls, 100 mm thick behind their line, with real holes for the doors and windows (daylight comes in through the glass) */
    var wallMat = new THREE.MeshStandardMaterial({ color:0xf1efe9, roughness:0.92 }), RMd = root.DBRoom, opMats = {};
    var glassMat = new THREE.MeshPhysicalMaterial({ color:0xffffff, metalness:0, roughness:0.02, transmission:1, ior:1.5, thickness:6 });
    var opMat = function (q) { if (q.kind === 'glass') return glassMat; var k = q.kind + q.color; if (!opMats[k]) opMats[k] = q.kind === 'metal' ? new THREE.MeshStandardMaterial({ color:new THREE.Color(q.color), metalness:0.75, roughness:0.32 })
      : new THREE.MeshStandardMaterial({ color:new THREE.Color(q.color), roughness:q.kind === 'sill' ? 0.38 : q.kind === 'leaf' ? 0.45 : 0.5 }); return opMats[k]; };
    var walls = G.map(function (g, wi) {
      var a = V3([g.P[0], g.P[1], 0]), d = new THREE.Vector3(g.d[0], 0, g.d[1]), n = new THREE.Vector3(g.n[0], 0, g.n[1]), up = new THREE.Vector3(0, 1, 0), zx = new THREE.Vector3().crossVectors(d, up), grp = new THREE.Group();
      var W = function (x, y, z) { return a.clone().addScaledVector(d, x).addScaledVector(n, -y).add(new THREE.Vector3(0, z, 0)); };   // the wall's own coordinates: x along it, y into it from the room side, z up
      var boxW = function (x0, x1, y0, y1, z0, z1, mat) { var m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), mat); m.matrix.makeBasis(d, up, zx); m.matrix.setPosition(W((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); m.matrixAutoUpdate = false; m.matrixWorldNeedsUpdate = true; grp.add(m); };
      (RMd.wallPieces ? RMd.wallPieces(L, wi, -100, g.len + 100, H) : [[-100, g.len + 100, 0, H]]).forEach(function (pc) { boxW(pc[0], pc[1], 0, 100, pc[2], pc[3], wallMat); });
      (RMd.opsOf ? RMd.opsOf(L) : []).forEach(function (op) { if (op.wall !== wi) return; RMd.opParts(op, 100, L).forEach(function (q) { var e = q.e; boxW(e[0], e[1], e[2], e[3], e[4], e[5], opMat(q)); }); });
      (RMd.ptsOf ? RMd.ptsOf(L) : []).forEach(function (pt) { if (pt.wall !== wi) return; RMd.ptParts(pt).forEach(function (q) { var e = q.e;   // sockets: plates; pipes: round, out of the wall into the room
        if (q.kind === 'pipe' || q.kind === 'drain') { var rr = (e[1] - e[0]) / 2, len = e[3] - e[2], cy = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, len, 24), opMat({ kind:q.kind === 'pipe' ? 'metal' : 'sill', color:q.color }));
          cy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); cy.position.copy(W((e[0] + e[1]) / 2, (e[2] + e[3]) / 2, (e[4] + e[5]) / 2)); cy.updateMatrix(); cy.matrixAutoUpdate = false; grp.add(cy); }
        else boxW(e[0], e[1], e[2], e[3], e[4], e[5], opMat({ kind:q.kind === 'cap' ? 'leaf' : 'sill', color:q.color })); }); });
      grp.userData.n = n; grp.userData.c = W(g.len / 2, 50, H / 2); return grp; });
    /* light: a big soft panel over the room (like a bright ceiling) and the sky */
    var size = rb.getSize(new THREE.Vector3()), ctr = rb.getCenter(new THREE.Vector3());
    var lamp = new THREE.RectAreaLight(0xfff6ea, 4, Math.max(1200, size.x * 0.7), Math.max(1200, size.z * 0.7)); lamp.position.set(ctr.x, H + 500, ctr.z); lamp.lookAt(ctr.x, 0, ctr.z); scene.add(lamp);
    finish(THREE, PT, scene, bb, walls, H, o, L, G, items, stage);
  });
}
/* the camera, the path tracer and the controls (room or studio) */
function finish(THREE, PT, scene, bb, walls, H, o, L, G, items, stage) {
    var renderer = R.renderer, V3 = R.V3;
    var camera = new THREE.PerspectiveCamera(R.fov, 1, 30, 100000);
    R.scene = scene; R.camera = camera; R.walls = walls; R.fc = bb.getCenter(new THREE.Vector3()); R.fr = bb.getBoundingSphere(new THREE.Sphere()).radius; R.bb = bb.clone(); R.H = H;
    /* the fronts: per cabinet its box, the side its fronts face and their size — the view is turned to where most of them show, unhidden */
    var cabs = {}; items.forEach(function (it) { var k = it.o.cab; if (k == null) return; var q = cabs[k] || (cabs[k] = { b:new THREE.Box3() });
      [[it.e[0], it.e[2], it.e[4]], [it.e[1], it.e[3], it.e[5]]].forEach(function (p) { q.b.expandByPoint(V3(it.tr(p))); }); });
    R.fronts = Object.keys(cabs).map(function (k) { var c = o.proj.cabinets[+k], it = c && L.items[c.id], g = it && G[it.wall]; if (!g) return null; var q = cabs[k], n = new THREE.Vector3(g.n[0], 0, g.n[1]), sz = q.b.getSize(new THREE.Vector3());
      var ctr = q.b.getCenter(new THREE.Vector3()), half = Math.abs(n.x) * sz.x / 2 + Math.abs(n.z) * sz.z / 2; return { b:q.b, n:n, p:ctr.clone().addScaledVector(n, half + 5), area:(Math.abs(n.x) * sz.z + Math.abs(n.z) * sz.x) * sz.y }; }).filter(Boolean);
    resize(); R.th = bestTurn(THREE, R.th);   // sized first: how far back the eye stands depends on the picture's shape
    var pt = new PT.WebGLPathTracer(renderer); R.pt = pt;
    pt.tiles.set(2, 2); pt.filterGlossyFactor = 0.5; pt.minSamples = 1; pt.renderDelay = 0; pt.fadeDuration = 250; pt.dynamicLowRes = true; pt.lowResScale = 0.3;
    pt.textureSize.set(2048, 2048);   // texture photos (also those picked later with the arrows) at a good size
    denoiser(THREE, PT, pt); applyQ();
    place(true);
    R.resize = function () { if (!R) return; resize(); place(); }; window.addEventListener('resize', R.resize);
    controls(stage);
    loop();
}
function resize() {
  var stage = R.ov.querySelector('.rr-stage'), w = Math.max(200, stage.clientWidth), h = Math.max(150, stage.clientHeight), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (w * h * dpr * dpr > 2.6e6) dpr = Math.sqrt(2.6e6 / (w * h));   // enough pixels for a sharp picture, not more than the card can trace
  R.renderer.setPixelRatio(dpr); R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  if (R.pt) R.pt.renderScale = traceScale();
}
function traceScale() { var cv = R.renderer.domElement; return Math.min(1, Math.sqrt(QP[Q].px / Math.max(1, cv.width * cv.height))); }   // fewer pixels traced for a quicker picture
function applyQ() { if (!R || !R.pt) return; R.pt.renderScale = traceScale(); R.pt.bounces = QP[Q].b; R.pt.reset(); R.k = 1; }
/* the picture on the screen: while there are few samples an edge-keeping blur takes the grain away, fading out as the samples
   add up. Neighbours are compared with the 3×3 average round the pixel, in square-root light (near how the eye sees it), so
   bright walls are smoothed as well as dark fronts and single bright specks melt in; edges between different boards stay sharp. */
function denoiser(THREE, PT, pt) {
  var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat = new THREE.ShaderMaterial({
    uniforms:{ map:{ value:null }, sigma:{ value:2 }, kSigma:{ value:1.3 }, threshold:{ value:0.1 } },
    vertexShader:'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader:[
      'uniform sampler2D map; uniform float sigma; uniform float kSigma; uniform float threshold; varying vec2 vUv;',
      'vec3 rt(vec3 c) { return sqrt(max(c, vec3(0.0))); }',
      'void main() {',
      '  vec2 px = 1.0 / vec2(textureSize(map, 0));',
      '  vec3 g = vec3(0.0); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) g += texture2D(map, vUv + vec2(float(i), float(j)) * px).rgb;',
      '  g = rt(g / 9.0);',
      '  float radius = floor(kSigma * sigma + 0.5), radQ = radius * radius, invS = 0.5 / (sigma * sigma), invT = 0.5 / (threshold * threshold), z = 0.0;',
      '  vec3 acc = vec3(0.0);',
      '  for (float dx = -radius; dx <= radius; dx += 1.0) { float h = floor(sqrt(radQ - dx * dx));',
      '    for (float dy = -h; dy <= h; dy += 1.0) { vec2 d = vec2(dx, dy); vec3 c = texture2D(map, vUv + d * px).rgb, e = rt(c) - g;',
      '      float w = exp(-dot(d, d) * invS - dot(e, e) * invT); z += w; acc += w * c; } }',
      '  gl_FragColor = vec4(acc / max(z, 1e-6), 1.0);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'].join('\n'),
    depthTest:false, depthWrite:false, blending:THREE.NoBlending, toneMapped:true }), quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quadMesh.frustumCulled = false; R.dn = mat;
  pt.renderToCanvasCallback = function (target, renderer, quad) {
    var ac = renderer.autoClear, f = R && !R.noDenoise ? 1 - pt.samples / QP[Q].dn : 0; renderer.autoClear = false;
    if (f <= 0.03 || quad.material.opacity < 1) quad.render(renderer);
    else { var u = mat.uniforms; u.map.value = target.texture; u.sigma.value = 1 + 3 * f; u.threshold.value = 0.05 + 0.12 * f; renderer.render(quadMesh, cam); }
    renderer.autoClear = ac;
  };
}
/* the camera: a person at eye height on a circle round the furniture, as far as the lens needs to take it all in
   (walls the eye stands behind are left out, as when a wall is taken away for a photo of a room) */
function camPos(THREE, th, out) {
  var d = fitDist(THREE, th) * R.far;
  return (out || new THREE.Vector3()).set(R.fc.x + Math.sin(th) * d, Math.max(400, R.eye), R.fc.z + Math.cos(th) * d);
}
/* how far back the eye must stand for every corner of the furniture to be in the picture, with a small margin */
function fitDist(THREE, th) {
  var cam = R.fitCam || (R.fitCam = new THREE.PerspectiveCamera(R.fov, 1, 10, 1e6)), v = new THREE.Vector3(), b = R.bb, y = Math.max(400, R.eye);
  cam.fov = R.fov; cam.aspect = R.camera ? R.camera.aspect : 1.6; cam.updateProjectionMatrix();
  var pts = []; [b.min.x, b.max.x].forEach(function (x) { [b.min.y, b.max.y].forEach(function (yy) { [b.min.z, b.max.z].forEach(function (z) { pts.push(new THREE.Vector3(x, yy, z)); }); }); });
  var fits = function (d) {
    cam.position.set(R.fc.x + Math.sin(th) * d, y, R.fc.z + Math.cos(th) * d); cam.lookAt(R.fc); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    return pts.every(function (p) { v.copy(p).applyMatrix4(cam.matrixWorldInverse); if (v.z > -50) return false; v.applyMatrix4(cam.projectionMatrix); return Math.abs(v.x) <= 0.93 && Math.abs(v.y) <= 0.9; }); };
  var lo = R.fr * 0.2, hi = R.fr * 20;
  for (var k = 0; k < 28; k++) { var mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}
/* which way round shows the fronts best: their size, how squarely they face the eye, and nothing standing in front of them */
function bestTurn(THREE, th0) {
  var score = function (th) { return turnScore(THREE, th); };
  var best = th0, bs = score(th0), mine = bs;
  for (var k = 0; k < 72; k++) { var th = k * Math.PI / 36, sc = score(th); if (sc > bs + 1e-6) { bs = sc; best = th; } }
  return mine >= bs * 0.85 ? th0 : best;   // the turn of the 3-D view when it shows nearly as much
}
function turnScore(THREE, th) {
  var f0 = function (th) { var cam = camPos(THREE, th), s = 0, ray = new THREE.Ray(), hit = new THREE.Vector3();
    R.fronts.forEach(function (f) { var to = cam.clone().sub(f.p), dist = to.length(); to.normalize(); var facing = f.n.dot(to);
      if (facing < -0.05) { s += f.area * facing * 0.7; return; }   // its back in sight: a picture of the backs is not what anyone wants
      if (facing <= 0.05) return;
      ray.set(cam, f.p.clone().sub(cam).normalize());
      var blocked = R.fronts.some(function (g) { if (g === f) return false; var h = ray.intersectBox(g.b, hit); return h && cam.distanceTo(h) < dist - 30; });
      if (!blocked) s += f.area * facing; });
    return s; };
  return f0(th);
}
function camAt() {
  var THREE = R.THREE, p = camPos(THREE, R.th, R.camera.position); R.moved = performance.now();
  R.camera.fov = R.fov; R.camera.updateProjectionMatrix();
  R.camera.lookAt(R.fc.x, R.fc.y, R.fc.z); R.camera.updateMatrixWorld();   // at the middle of the furniture, so all of it is in the picture
  return p;
}
/* after a turn: walls the eye stands behind are left out (the scene is rebuilt when that changes) */
function place(first) {
  var cam = camAt(), want = R.walls.filter(function (w) { var n = w.userData.n, c = w.userData.c; return (cam.x - c.x) * n.x + (cam.z - c.z) * n.z > -60; }), key = want.map(function (w) { return R.walls.indexOf(w); }).join(',');
  if (first || key !== R.wallKey) { R.walls.forEach(function (w) { R.scene.remove(w); }); want.forEach(function (w) { R.scene.add(w); }); R.wallKey = key; R.pt.setScene(R.scene, R.camera); }
  else R.pt.updateCamera();
  R.done = false;
}
/* a click on a board: its cabinet's front, carcass or worktop material, changed with the arrows (‹ › or the keyboard ← →);
   the project is changed (o.onMat) and only the furniture is rebuilt */
var PART_KEY = { facade:'rrPartF', carc:'rrPartC', worktop:'rrPartW' };
function matOf(c, part) { return part === 'worktop' ? (c.worktop && c.worktop.mat) || '' : (c.mat && c.mat[part]) || ''; }
function pick(e) {
  if (!R || !R.group || !R.camera || !R.o.onMat) return;
  var THREE = R.THREE, cv = R.renderer.domElement, rc = cv.getBoundingClientRect(), ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1), R.camera);
  var hit = ray.intersectObjects(R.group.children, false).filter(function (h) { var u = h.object.userData; return u && u.cab != null && /^(front|part|top|hdf)$/.test(u.kind); })[0];
  if (!hit) { unpick(); return; }
  var u = hit.object.userData, c = R.o.proj.cabinets[u.cab]; if (!c) return;
  R.sel = { cab:u.cab, part:u.kind === 'front' ? 'facade' : u.kind === 'top' ? 'worktop' : 'carc', x:e.clientX - rc.left, y:e.clientY - rc.top };
  showPick();
}
function unpick() { if (!R) return; R.sel = null; var p = R.ov.querySelector('.rr-pick'); if (p) p.remove(); }
function showPick() {
  var st = R.ov.querySelector('.rr-stage'), p = st.querySelector('.rr-pick'), sl = R.sel, c = R.o.proj.cabinets[sl.cab]; if (!c) return;
  if (!p) { p = document.createElement('div'); p.className = 'rr-pick'; st.appendChild(p); }
  var cur = matOf(c, sl.part), lk = root.DBLook, sw = lk && lk.color(cur);
  p.innerHTML = '<div class="rr-pk-h"><small>' + esc((sl.cab + 1) + (c.name ? ' · ' + c.name : '') + ' · ' + T(PART_KEY[sl.part])) + '</small><button type="button" class="btn ghost" data-rr="mx" aria-label="' + esc(T('close')) + '">✕</button></div>' +
    '<div class="rr-pk-m"><button type="button" class="btn" data-rr="mprev" aria-label="‹">‹</button><span>' + (sw ? '<i style="background:' + esc(sw) + '"></i>' : '') + '<b>' + esc(cur || '—') + '</b></span><button type="button" class="btn" data-rr="mnext" aria-label="›">›</button></div>' +
    '<small class="rr-pk-n">' + esc(T('rrPickN')) + '</small>';
  p.style.left = '12px'; p.style.top = '12px';   // in the corner: the board stays in sight while the material changes
}
function stepMat(dir) {
  if (!R || !R.sel || !R.o.onMat) return;
  var sl = R.sel, c = R.o.proj.cabinets[sl.cab]; if (!c) return;
  var list = (typeof R.o.mats === 'function' ? R.o.mats() : R.o.mats) || []; if (!list.length) return;
  var cur = matOf(c, sl.part), k = list.indexOf(cur), nx = list[((k < 0 ? (dir > 0 ? -1 : 0) : k) + dir + list.length) % list.length];
  var infos = R.o.onMat(c, sl.part, nx); if (infos) R.o.infos = infos;
  showPick(); rebuildFurniture();
}
function rebuildFurniture() {
  if (!R || !R.THREE || !R.scene) return;
  if (R.busy) { R.again = true; return; }
  R.busy = true; var r = R, items = root.DBRoom.items3d(R.o.proj, R.o.infos || []);
  furniture(R.THREE, items).then(function (g) {
    if (R !== r) return; r.busy = false;
    r.scene.remove(r.group); r.group = g; r.scene.add(g); g.updateMatrixWorld(true);
    r.pt.setScene(r.scene, r.camera); r.pt.reset(); r.k = 1; r.done = false;
    if (r.again) { r.again = false; rebuildFurniture(); }
  }, function () { r.busy = false; });
}
function controls(stage) {
  var d = null;
  stage.addEventListener('pointerdown', function (e) { if (!R || !R.pt || e.target.closest('.rr-pick')) return; d = { x:e.clientX, y:e.clientY, th:R.th, eye:R.eye, moved:false }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
  stage.addEventListener('pointermove', function (e) { if (!d || !R) return; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return; d.moved = true; R.th = d.th - (e.clientX - d.x) * 0.006; R.eye = Math.max(500, Math.min(R.H + 2500, d.eye + (e.clientY - d.y) * 5)); camAt(); R.pt.updateCamera(); R.done = false; });   // across: walk round; up and down: eye height (above the room too)
  var up = function (e) { if (d && R) { if (d.moved) place(false); else if (e && e.type === 'pointerup') pick(e); } d = null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', function (e) { if (!R || !R.pt) return; e.preventDefault(); R.far = Math.max(0.35, Math.min(3, R.far * Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.001))); clearTimeout(R.wt); camAt(); R.pt.updateCamera(); R.done = false; R.wt = setTimeout(function () { if (R) place(false); }, 300); }, { passive:false });   // nearer or further (walls sorted out after)
}
/* the graphics card gets new work only when it has finished the last (a fence, checked without waiting), so the window stays
   responsive on a slow card; a card that finishes within a frame gets more tiles a frame, up to 32 */
function loop(t) {
  if (!R) return; R.raf = requestAnimationFrame(loop);
  var pt = R.pt, n = QP[Q].n, dl = R.ov.querySelector('[data-rr=dl]'), now = typeof t === 'number' ? t : performance.now(), gl = R.gl;
  if (pt.samples < n) {
    if (R.fence) {
      if (gl.getSyncParameter(R.fence, gl.SYNC_STATUS) !== gl.SIGNALED) { R.wait = (R.wait || 0) + 1; return; }   // still busy: skip this frame
      gl.deleteSync(R.fence); R.fence = null;
      if (pt.isCompiling || now - (R.moved || 0) < 400) R.k = 1; else if (!R.wait) R.k = Math.min((R.k || 1) + 1, 32); else if (R.wait > 1) R.k = Math.max(1, Math.floor((R.k || 1) * 0.7));
    }
    R.wait = 0;
    pt.renderToCanvas = false; for (var i = 1; i < (R.k || 1) && pt.samples < n - 0.01; i++) pt.renderSample();
    pt.renderToCanvas = true; pt.renderSample();
    if (gl && gl.fenceSync) { R.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); }
    status(pt.isCompiling ? T('rrBuilding') : T('rrProg').replace('{n}', Math.floor(pt.samples)).replace('{m}', n), pt.samples / n); dl.disabled = pt.samples < 1; }
  else if (!R.done) { R.done = true; status(T('rrDone').replace('{m}', n), 1); dl.disabled = false; }
}
root.DBRender = { open:open, close:close, _state:function () { return R; }, _quality:function () { return { q:Q, scale:R && R.pt ? R.pt.renderScale : null, bounces:R && R.pt ? R.pt.bounces : null, k:R && R.k }; }, _score:function (th) { return R && R.THREE ? turnScore(R.THREE, th) : null; } };
})(typeof window !== 'undefined' ? window : this);
