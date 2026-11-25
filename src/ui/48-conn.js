/* 48-conn.js — the connectors themselves: true-size 3-D models (a confirmat screw, a cam housing, its bolt, a dowel),
   drawn by the joints mode of 48-view3.js where the engine drills for them. */

/* ---- models, in mm, axis along +Y. Geometries are built once and shared. */
function nv3cGeo(key, make) { NV3.cgeo = NV3.cgeo || {}; return NV3.cgeo[key] || (NV3.cgeo[key] = make()); }
function nv3cLathe(key, pts) { var T = NV3.T; return nv3cGeo(key, function () { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), 30); }); }
function nv3cMat(key) {
  var T = NV3.T; NV3.cmat = NV3.cmat || {}; if (NV3.cmat[key]) return NV3.cmat[key];
  var m;
  if (key === 'zinc') m = new T.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.95, roughness: 0.3, side: T.DoubleSide });
  else if (key === 'cast') m = new T.MeshStandardMaterial({ color: 0xb4b8bb, metalness: 0.8, roughness: 0.5, side: T.DoubleSide });
  else if (key === 'dark') m = new T.MeshStandardMaterial({ color: 0x2c3134, metalness: 0.4, roughness: 0.7 });
  else {   // beech, with the flutes of a dowel along its length
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 4; var g = cv.getContext('2d');
    for (var i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#c9a06b' : '#e2c594'; g.fillRect(i * 8, 0, 8, 4); }
    var tx = new T.CanvasTexture(cv); tx.wrapS = T.RepeatWrapping; tx.colorSpace = T.SRGBColorSpace;
    m = new T.MeshStandardMaterial({ map: tx, metalness: 0, roughness: 0.85, side: T.DoubleSide });
  }
  return NV3.cmat[key] = m;
}
function nv3ConnModel(kind) {
  var T = NV3.T, g = new T.Group(), add = function (geo, mat, y) { var m = new T.Mesh(geo, nv3cMat(mat)); if (y) m.position.y = y; g.add(m); return m; };
  if (kind === 'confirmat') {   // 7 × 50: the head's top at y = 0, the body down to y = −50
    var p = [[0, -50], [1.3, -48.6], [2.4, -46]], y;
    for (y = -46; y < -14.5; y += 2.6) p.push([3.45, y + 1.0], [2.4, y + 2.6]);   // the thread
    p.push([2.4, -13], [3.5, -12], [3.5, -5.2], [5.1, -1.3], [5.1, 0], [0, 0]);
    add(nv3cLathe('conf', p), 'zinc');
    add(nv3cGeo('confHex', function () { return new T.CylinderGeometry(2.35, 2.35, 0.7, 6); }), 'dark', 0.02);
  } else if (kind === 'cam') {   // Ø15 × 12.5 housing: its top face at y = 0
    add(nv3cLathe('cam', [[0, -12.5], [7, -12.5], [7.5, -12], [7.5, -0.6], [7, 0], [0, 0]]), 'cast');
    add(nv3cGeo('camSlotA', function () { return new T.BoxGeometry(9.4, 0.7, 1.7); }), 'dark', 0.02);
    add(nv3cGeo('camSlotB', function () { return new T.BoxGeometry(1.7, 0.7, 9.4); }), 'dark', 0.02);
    var ar = add(nv3cGeo('camArrow', function () { return new T.CylinderGeometry(1.5, 1.5, 0.7, 3); }), 'dark', 0.02); ar.position.set(5.2, 0.02, 0); ar.rotation.y = Math.PI / 2;
  } else if (kind === 'bolt') {   // the cam's connecting bolt: screwed in up to its collar (y = 0), the head at y = 34
    var b = [[0, -7.5], [2.3, -7.5]], yb;
    for (yb = -7.5; yb < -1.2; yb += 1.5) b.push([3.05, yb + 0.6], [2.3, yb + 1.5]);
    b.push([2.3, 0], [4.7, 0], [4.7, 1.7], [2.55, 1.7], [2.55, 25.6], [1.75, 26.6], [1.75, 29.2], [3.3, 30.2], [3.3, 33], [2.2, 34.2], [0, 34.2]);
    add(nv3cLathe('bolt', b), 'zinc');
  } else if (kind === 'dowel') {   // Ø8 × 30, centred on the origin
    add(nv3cLathe('dowel', [[0, -15], [3.1, -15], [4, -14], [4, 14], [3.1, 15], [0, 15]]), 'wood');
  }
  return g;
}
