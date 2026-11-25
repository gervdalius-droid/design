/* 48-conn.js — the connectors themselves: true-size 3-D models (a confirmat screw, a cam housing, its bolt, a dowel),
   pictures rendered from those same models for the connector library, and the card of the joint in work
   (which connector, how many, where, and on which side). Used by the joints workspace in 48-view3.js. */

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

/* ---- pictures of the connectors for the library: the models above, rendered once */
function nv3Thumbs() {
  if (NV3.thumb) return NV3.thumb;
  var T = NV3.T, out = {};
  try {
    var W = 320, H = 180, R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setPixelRatio(2); R.setSize(W, H, false); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.1; R.outputColorSpace = T.SRGBColorSpace; R.setClearColor(0x000000, 0);
    var pm = new T.PMREMGenerator(R), env = pm.fromScene(new NV3.RE(), 0.03).texture, cam = new T.PerspectiveCamera(20, W / H, 1, 3000);
    var lay = function (kind, x, y, z, rz, ry) { var m = nv3ConnModel(kind); m.rotation.set(0, ry || 0, rz || 0); m.position.set(x, y, z); return m; };
    ['confirmat', 'cam', 'dowel'].forEach(function (k) {
      var sc = new T.Scene(), g = new T.Group(); sc.environment = env; sc.environmentIntensity = 1.0;
      var key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(-80, 160, 140); sc.add(key); sc.add(new T.AmbientLight(0xffffff, 0.5));
      if (k === 'confirmat') g.add(lay('confirmat', 25, 0, 0, -Math.PI / 2));                      // lying, head to the right
      else if (k === 'cam') { g.add(lay('cam', -16, 6, 0, 0.5)); g.add(lay('bolt', -2, -6, 6, -Math.PI / 2 + 0.12)); g.add(lay('dowel', 16, 9, -12, Math.PI / 2 - 0.25)); }
      else { g.add(lay('dowel', -3, 5, -6, Math.PI / 2 - 0.2)); g.add(lay('dowel', 4, -5, 6, Math.PI / 2 + 0.12)); }
      sc.add(g);
      var bb = new T.Box3().setFromObject(g), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), dir = new T.Vector3(0.28, 0.62, 1).normalize();
      var half = Math.max(sz.x / cam.aspect, sz.y * 0.75 + sz.z * 0.55) / 2;   // fill the picture: its width for a long part, its height otherwise
      cam.position.copy(c).addScaledVector(dir, half / Math.tan(cam.fov * Math.PI / 360) * 1.22); cam.lookAt(c); cam.updateProjectionMatrix();
      R.render(sc, cam); out[k] = R.domElement.toDataURL('image/png');
    });
    pm.dispose(); R.dispose(); if (R.forceContextLoss) R.forceContextLoss();
  } catch (e) { if (window.console) console.warn('connector pictures not rendered', e); out = {}; }
  return NV3.thumb = out;
}
function nv3ConnPic(k, cls) {   // the picture of a connector, or its drawn sign when pictures cannot be rendered / for "none"
  var th = nv3Thumbs();
  if (th[k]) return '<img class="nv3-cpic' + (cls ? ' ' + cls : '') + '" src="' + th[k] + '" alt="" draggable="false">';
  return '<svg class="nv3-cpic ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 40 16" fill="' + (NV3_JC[k] || '#8b9399') + '" style="color:' + (NV3_JC[k] || '#8b9399') + '" aria-hidden="true">' + NV3_ICO[k] + '</svg>';
}

/* ---- the card of the joint in work: everything about it in one place, beside the model */
function nv3JCard(c, r, x, sel) {
  var sd = x.sides ? x.sides[sel.side] || x.sides.L : x, pos = sd.pos || [], w = nv3JWidth(r, x.key, sel.side, x.single), lim = nv3JLimits(sd.type), empty = !pos.length;
  var tile = function (k, label, on, cmd) { return '<button type="button" class="nv3-tile' + (on ? ' on' : '') + '" data-nv="nv3" data-v="' + cmd + '" aria-pressed="' + !!on + '">' + nv3ConnPic(k) + '<span>' + label + '</span></button>'; };
  var sect = function (title, hint, body) { return '<section class="nv3-jc-s"><h5>' + title + (hint ? ' <small>' + hint + '</small>' : '') + '</h5>' + body + '</section>'; };
  var two = function (cur, a, b) {   // a choice of two: the one in force is marked, the other is the command
    var bt = function (o, on) { return '<button type="button" class="' + (on ? 'on' : '') + '"' + (on ? ' aria-pressed="true"' : o.attr) + '>' + o.label + '</button>'; };
    return '<span class="seg nv3-jseg">' + bt(a, cur === a.v) + bt(b, cur === b.v) + '</span>'; };
  var h = '<div class="nv3-jcard" role="group" aria-label="' + esc(nv3JName(x)) + '"><div class="nv3-jc-h"><i style="background:' + (empty ? '#c0392b' : NV3_JC[sd.type] || '#888') + '"></i><b>' + esc(nv3JName(x)) + '</b>' +
    '<span class="nv-muted">' + fmt(Math.round(w)) + ' mm</span><button type="button" class="nv3-jc-x" data-nv="nv3" data-v="j:none" aria-label="' + esc(t('close')) + '">✕</button></div>';
  h += sect(L('Kuo jungiama', 'Joined with'), x.custom || x.manual ? L('pakeista', 'changed') : L('pagal taisyklę', 'by the rule'),
    '<div class="nv3-tiles">' + tile('confirmat', L('Konfirmatas', 'Confirmat'), !empty && sd.type === 'confirmat', 'j:type:confirmat') + tile('cam', L('Ekscentrikas + kaištis', 'Cam + dowel'), !empty && sd.type === 'cam', 'j:type:cam') +
      tile('dowel', L('Kaištis', 'Dowel'), !empty && sd.type === 'dowel', 'j:type:dowel') + tile('none', L('Be jungties', 'No connector'), empty, 'j:empty') + '</div>');
  /* on which side */
  var side = '';
  if (!x.single) side += '<div class="nv3-jc-row"><span class="nv3-jc-l">' + L('Kuriam šonui', 'For which side') + '</span><span class="seg nv3-jseg"><button type="button" class="' + (NV3.jBoth ? 'on' : '') + '" data-nv="nv3" data-v="j:both:1">' + L('Abiem', 'Both') + '</button>' +
    '<button type="button" class="' + (!NV3.jBoth && sel.side === 'L' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:L">' + L('Tik kairei', 'Left only') + '</button><button type="button" class="' + (!NV3.jBoth && sel.side === 'R' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:R">' + L('Tik dešinei', 'Right only') + '</button></span></div>';
  var o = c.cnc || {}, camKey = !c.kind && sd.type === 'cam' && !empty ? (x.key === 'bottom' && o.bottom === 'inside' ? 'bottom' : x.key === 'top' && o.top === 'full' && o.topMount === 'inside' ? 'top'
    : x.key === 'back' && (o.backs || []).length && (o.backs || []).every(function (b) { return b === 'solid'; }) && o.backMount === 'inside' ? 'back' : null) : null;
  if (camKey) { var out = !!(o.camOut || {})[camKey], cmd = ' data-act="camside" data-v="' + camKey + '"';
    side += '<div class="nv3-jc-row"><span class="nv3-jc-l">' + L('Ekscentrikas matomas', 'The cam shows') + '</span>' + two(out ? 'out' : 'in', { v: 'in', label: L('Viduje', 'Inside'), attr: cmd }, { v: 'out', label: L('Išorėje', 'Outside'), attr: cmd }) + '</div>'; }
  if (c.kind === 'box' && x.box && E.boxPair) { var pk = E.boxPair(x.box.P, x.box.Q), cv = ((r.box || {}).covers || []).filter(function (k) { return k.key === pk; })[0];
    if (cv && !cv.forced) { var bn = function (id) { var nm = t('bx_' + id); return nm === 'bx_' + id ? id : nm; }, at = function (id) { return ' data-act="boxcover" data-v="' + esc(pk) + '" data-w="' + esc(id) + '"'; };
      side += '<div class="nv3-jc-row"><span class="nv3-jc-l">' + L('Per kurią plokštę sukama', 'Driven through which board') + '</span>' + two(cv.by, { v: cv.a, label: esc(bn(cv.a)), attr: at(cv.a) }, { v: cv.b, label: esc(bn(cv.b)), attr: at(cv.b) }) +
        '<small class="nv-muted nv3-jc-n">' + L('Ši plokštė dengia kitos galą: jungtis eina per ją į kitos kraštą. Pakeitus keičiasi ir plokščių ilgiai.', 'This board covers the other one\'s end: the connector goes through it into the other\'s edge. Changing it changes the boards\' lengths too.') + '</small></div>'; } }
  if (side) h += sect(L('Pusė', 'Side'), '', side);
  /* how many and where */
  if (!empty) h += sect(L('Kiek ir kur', 'How many and where'), 'mm',
    '<div class="nv3-jc-row"><span class="nv-step"><button type="button" data-nv="nv3" data-v="j:n:-1">−</button><b>' + pos.length + '</b><button type="button" data-nv="nv3" data-v="j:n:1">+</button></span>' +
      '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:reset">↺ ' + L('Pagal taisyklę', 'By the rule') + '</button></div>' +
    '<span class="nv3-jpos">' + pos.map(function (v, k) { return '<label class="' + (sel.idx === k ? 'on' : '') + '"><input type="text" inputmode="decimal" value="' + fmt(v) + '" data-nv3j="' + k + '" aria-label="' + (k + 1) + '"><button type="button" data-nv="nv3" data-v="j:del:' + k + '" title="' + esc(L('Pašalinti', 'Remove')) + '">✕</button></label>'; }).join('') + '</span>' +
    '<small class="nv-muted nv3-jc-n">' + L('Nuo jungties pradžios; nuo galo ≥ ' + lim.edge + ', tarp jų ≥ ' + lim.gap + '. Tašką galima tempti modelyje, o spustelėjus mėlyną juostą — pridėti dar vieną.', 'From the joint\'s start; from the end ≥ ' + lim.edge + ', apart ≥ ' + lim.gap + '. Drag a point in the model, or click the blue band to add one.') + '</small>');
  return h + '</div>';
}
