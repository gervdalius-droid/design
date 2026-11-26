/* 66-drwsnap.js — the cabinet sheet's "Surinkimo schema" as the 3-D view shows it with "Jungtys" on: the carcass pulled
   apart, every joint's connectors (confirmats, cams, dowels) between the boards, the drawers in their place with their
   runners (no fronts). Drawn by three.js into a picture the sheet carries (drawings.js sheetCabinet via build.py PATCHES:
   opts.snap); the part numbers go where each board lands in the picture. Without three.js (offline, still loading) the
   sheet keeps its own line drawing — drwSheets asks again once it is there (nvdReady is part of its cache key). */
var NVD = { R: null, env: null, cache: {}, keys: [] };
function nvdReady() { return typeof NV3 !== 'undefined' && !!NV3.T && !NV3.failed; }
function nvdSnap(c, r, box) {
  if (!nvdReady()) { if (typeof nv3Load === 'function' && typeof NV3 !== 'undefined' && !NV3.failed) nv3Load(); return null; }
  var ci = S.proj.cabinets.indexOf(c); if (ci < 0 || !r || !r.panels || !r.panels.some(function (p) { return p.place; })) return null;
  if (c.kind === 'box' || c.kind === 'panel') return null;   // free constructions: the sheet's own drawing
  var key = JSON.stringify([c, Math.round(box.w), Math.round(box.h)]);
  if (NVD.cache[key]) return NVD.cache[key];
  var out = null, T = NV3.T, sel0 = S.sel, st = document.getElementById('nv3-stage');
  var keep = { pick: NV3.pick, moving: NV3.moving, links: NV3.links, jSel: NV3.jSel, edges: NV3.edges, hw: NV3.hw, jPairs: NV3.jPairs, jGeom: NV3.jGeom, jpick: NV3.jpick, labels: NV3.labels };
  if (st) st.id = 'nv3-stage-busy';   // the joints' names are labels on the live view's stage: none for the picture
  try {
    S.sel = ci; NV3.jSel = null; NV3.edges = false; NV3.hw = true; NV3.pick = []; NV3.moving = []; NV3.links = []; NV3.jpick = []; NV3.labels = [];
    out = nvdDraw(c, r, box);
  } catch (e) { if (window.console) console.warn('drawings: the 3-D assembly picture failed — the line drawing is used', e); out = null; }
  finally { S.sel = sel0; Object.keys(keep).forEach(function (k) { NV3[k] = keep[k]; }); if (st) st.id = 'nv3-stage'; }
  if (out) { NVD.cache[key] = out; NVD.keys.push(key); while (NVD.keys.length > 24) delete NVD.cache[NVD.keys.shift()]; }
  return out;
}
/* a door's hinges without the door: the arms on the side they are screwed to, moved out with that side */
function nvdHinges(m, root, expOff, W, mid) {
  var F = window.DBFit; if (m.hinged === false || m.inset || !F || !F.has('hinge')) return;
  var T = NV3.T, right = !m.hingeLeft, cupE = +((E.R.hinge || {}).cupFromEdge) || 22.5, cxp = right ? m.x + m.w - cupE : m.x + cupE, HG = F.HINGE;
  var eo = expOff([right ? W : 0, mid[1], mid[2]]), g = new T.Group(); g.position.set(eo[0], eo[1], eo[2]); root.add(g);
  (m.ys || []).forEach(function (yy) { var hz = m.z + yy, mapH = function (sx, sy, sz) { return [right ? cxp + (sx - HG.cupX) : cxp - (sx - HG.cupX), -(sz - HG.doorZ), hz + sy]; };
    var arm = nv3Fit('hinge', 0, mapH, '#a3adb2', !right); if (arm) g.add(arm); });
}
function nvdDraw(c, r, box) {
  var T = NV3.T, MC = function (name, d) { return window.DBFront && window.DBFront.matColor ? window.DBFront.matColor(name, d) : d; };
  var isFront = function (p) { return p.role === 'FASADAS' || p.role === 'DURYS'; };
  var D = num(c.D) || 560, W = num(c.dishwasher ? c.dishWidth : c.W) || 600, H = num(c.H) || 720, ext = [W, D, H], mid = [W / 2, D / 2, H / 2];
  var expOff = function (cen) { return [0, 1, 2].map(function (i) { return Math.max(-1, Math.min(1, (cen[i] - mid[i]) / Math.max(1, ext[i] / 2))) * Math.max(130, Math.max(W, H, D) * 0.09); }); };   // as nv3Build pulls the boards apart
  var root = new T.Group(); root.rotation.x = -Math.PI / 2; var anchors = {};
  /* the carcass, pulled apart, with its joints and connectors */
  (r.panels || []).forEach(function (p) { if (!p.place || p.drawerOf || isFront(p)) return;
    var bm = nv3Board(p, MC(p.mat, '#e9e6de')), eo = expOff(bm.userData.cen), eg = new T.Group(); eg.position.set(eo[0], eo[1], eo[2]); eg.add(bm); root.add(eg);
    anchors[p.name] = [bm.userData.cen[0] + eo[0], bm.userData.cen[1] + eo[1], bm.userData.cen[2] + eo[2]]; });
  nv3Seams(r, root, expOff);
  nv3Screws(r, root, expOff);
  /* the drawers in their place, with their runners — not the fronts */
  var vis = r.visual || {}, fi = 0, di = 0;
  (r.panels || []).filter(isFront).forEach(function (p) {
    if (p.role === 'DURYS') { var dm = (vis.doors || [])[di++]; if (dm && !c.dishwasher && !dm.cargo) nvdHinges(dm, root, expOff, W, mid); return; }
    var m = (vis.drawers || [])[fi++]; if (!m || c.dishwasher || m.cargo) return;
    var sec = m.box ? { hw: m.hw, rail: m.rail } : (c.sections || []).filter(function (s) { return (+s.col || 0) === (m.col || 0); })[m.sec] || {};
    var rail = Math.min(+sec.rail || 500, D - 45), g = new T.Group(), inner = new T.Group(); g.add(inner);
    var own = (r.panels || []).filter(function (q) { return q.drawerOf === p.name && q.place; });
    if ((sec.hw || m.hw) === 'BLUM TANDEMBOX' && nv3BlumDrawer(c, r, m, sec, m.x, m.bottom, m.w, m.h, inner, root, rail)) { /* Blum's model */ }
    else if (own.length) own.forEach(function (q) { inner.add(nv3Board(q, MC(q.mat, '#e5e2da'))); });
    else nv3BlumDrawer(c, r, m, sec, m.x, m.bottom, m.w, m.h, inner, root, rail);
    root.add(g);
  });
  /* the picture: white, lit as the 3-D view, from the front left above */
  var px = 7, wpx = Math.max(300, Math.min(2200, Math.round(box.w * px))), hpx = Math.max(300, Math.min(2200, Math.round(box.h * px)));
  var R = NVD.R; if (!R) { R = NVD.R = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true }); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = T.SRGBColorSpace; R.setPixelRatio(1); }
  R.setSize(wpx, hpx, false);
  var sc = new T.Scene(); sc.background = new T.Color('#ffffff');
  if (!NVD.env) { var pm = new T.PMREMGenerator(R); NVD.env = pm.fromScene(new NV3.RE(), 0.03).texture; }
  sc.environment = NVD.env; sc.environmentIntensity = 0.55;
  var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-900, 1500, 1300); sc.add(key);
  var fill = new T.DirectionalLight(0xffffff, 0.5); fill.position.set(1200, 500, 600); sc.add(fill); sc.add(new T.AmbientLight(0xffffff, 0.35));
  sc.add(root); root.updateMatrixWorld(true);
  var bb = new T.Box3().setFromObject(root), cen = bb.getCenter(new T.Vector3()), rad = bb.getBoundingSphere(new T.Sphere()).radius;
  var cam = new T.PerspectiveCamera(26, wpx / hpx, 10, 60000), dir = new T.Vector3(-0.62, 0.48, 1).normalize(), tg = cen.clone();
  var corners = []; [bb.min.x, bb.max.x].forEach(function (x) { [bb.min.y, bb.max.y].forEach(function (y) { [bb.min.z, bb.max.z].forEach(function (z) { corners.push(new T.Vector3(x, y, z)); }); }); });
  var dist = rad / Math.sin(13 * Math.PI / 180);
  for (var it = 0; it < 4; it++) {   // frame it: the box's corners fill the picture, centred
    cam.position.copy(tg).addScaledVector(dir, dist); cam.near = dist / 60; cam.far = dist * 12; cam.lookAt(tg); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    var x0 = 1, x1 = -1, y0 = 1, y1 = -1; corners.forEach(function (q) { var v = q.clone().project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
    var right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), hh = Math.tan(13 * Math.PI / 180) * dist, hw = hh * cam.aspect;
    tg.addScaledVector(right, (x0 + x1) / 2 * hw).addScaledVector(up, (y0 + y1) / 2 * hh);
    dist *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / 0.95;
  }
  cam.position.copy(tg).addScaledVector(dir, dist); cam.near = dist / 60; cam.far = dist * 12; cam.lookAt(tg); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  R.render(sc, cam);
  var url = R.domElement.toDataURL('image/jpeg', 0.92), pts = {};
  Object.keys(anchors).forEach(function (n) { var v = root.localToWorld(new T.Vector3().fromArray(anchors[n])).project(cam); if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) pts[n] = [(v.x + 1) / 2 * wpx, (1 - v.y) / 2 * hpx]; });
  sc.remove(root); nv3Clear(root);
  return { url: url, w: wpx, h: hpx, pts: pts };
}
