
/* =====================================================================
   drawings.js — drawing sheets made from the engine's real parts (A3 landscape, sheet units = mm;
   A4 prints the same sheet smaller).
     per cabinet:  1) views — front, without fronts, from the left, from above, dimensioned (ISO first-angle)
                   2) assembly — exploded view with part numbers and connector lines, assembled view,
                      parts list and hardware
     furniture:    when cabinets are placed in Baldai: layout (plan, 3D, cabinet list) and one elevation per wall;
                   otherwise, with more than one cabinet, all fronts side by side with the cabinet list
   Hidden surfaces: every part is an axis-aligned box; boxes are drawn far to near. For two boxes whose pictures
   overlap, an axis along which they are apart decides — along every view ray that coordinate changes one way,
   so the box on the far side of it is behind. Runs in the browser and in Node (tests).
   ===================================================================== */
(function (root) {
"use strict";
var SW = 420, SH = 297, FR = 10;                      // sheet, frame margin
var TB = { w:180, h:34 };                              // title block
var FONT = 'Arial, Helvetica, sans-serif';
var DEN = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
var COL = { line:'#1d2320', thin:'#3d4641', dim:'#2a5d8f', front:'#f1f0eb', carc:'#ffffff', hdf:'#f7f6f2', leg:'#d6d6d2', wall:'#ecebe6', top:'#e9dfcf', conf:'#285ac4', cam:'#ca6b23', dowel:'#387b53' };
var TX = {
  lt:{ front:'Vaizdas iš priekio', inner:'Be fasadų', left:'Vaizdas iš kairės', top:'Vaizdas iš viršaus', iso:'Surinkta', expl:'Surinkimo schema', parts:'Detalės', hw:'Furnitūra',
       pos:'Poz.', part:'Detalė', size:'L × W × T', mat:'Medžiaga', edge:'Kraštai', qty:'Kiekis', scale:'Mastelis', date:'Data', sheet:'Lapas', project:'Projektas', drawing:'Brėžinys',
       cab:'Spintelė', layout:'Baldų išdėstymas', plan:'Planas', wall:'Siena', elev:'Sienos vaizdas', door:'Durys', window:'Langas', sillH:'palangė', pt_socket:'R', pt_socket2:'RR', pt_cold:'ŠV', pt_hot:'KV', pt_drain:'KAN', ptLegend:'R — rozetė, RR — dviguba rozetė, ŠV / KV — šaltas / karštas vanduo, KAN — kanalizacija; skaičius — taško vidurio aukštis nuo grindų, mm. Apačioje — atstumai nuo sienos pradžios iki taškų vidurio.', list:'Spintelės', nts:'be mastelio', company:'DĖDĖS BALDAI', format:'Formatas',
       views:'vaizdai ir matmenys', assembly:'surinkimas', allFronts:'Visi baldai', name:'Pavadinimas', type:'Tipas', place:'Vieta', nParts:'Detalių', unit:'Vnt.',
       base:'pastatoma', wallc:'pakabinama', tall:'aukšta', box:'3D konstrukcija', dish:'indaplovės fasadas', legs:'Kojelės', feet:'Pėdutės', frontEdge:'PRIEKIS', fronts:'Fasadai', gapsBetween:'Tarpai tarp fasadų', flushBottom:'apačioje fasadas lygus su korpusu',
       made:'Spintelių kūrėjas', firstAngle:'Projekcija E (ISO)', conn:'Jungtys:', cConf:'konfirmatai', cCam:'ekscentrikai', cDowel:'kaiščiai', extra:'papildoma',
       data:'Duomenys', joinery:'Jungtys', carcM:'Korpusas', facM:'Fasadai', edgeM:'Kraštai', none:'—', warn:'Pastabos', open:'Atidarymo linijos — viršūnė rankenos pusėje; X — stalčius',
       fromStart:'nuo sienos pradžios', fromS:'Nuo pradžios', worktop:'stalviršis', wtPart:'Stalviršis', cont:'tęsinys', contNext:'Tęsinys kitame lape →', more:'daugiau — žr. spintelių lapus', noLayout:'Spintelės nesudėliotos Baldų skirtuke — rodomi visi fasadai iš eilės.', clear:'šviesos', wallLen:'Siena' },
  en:{ front:'Front view', inner:'Without fronts', left:'View from the left', top:'View from above', iso:'Assembled', expl:'Assembly diagram', parts:'Parts', hw:'Hardware',
       pos:'Pos.', part:'Part', size:'L × W × T', mat:'Material', edge:'Edges', qty:'Qty', scale:'Scale', date:'Date', sheet:'Sheet', project:'Project', drawing:'Drawing',
       cab:'Cabinet', layout:'Furniture layout', plan:'Plan', wall:'Wall', elev:'Wall elevation', door:'Door', window:'Window', sillH:'sill', pt_socket:'S', pt_socket2:'SS', pt_cold:'CW', pt_hot:'HW', pt_drain:'DR', ptLegend:'S — socket, SS — double socket, CW / HW — cold / hot water, DR — drain; the number is the height of the point\'s middle above the floor, mm. Below — distances from the wall start to the middle of each point.', list:'Cabinets', nts:'not to scale', company:'DĖDĖS BALDAI', format:'Format',
       views:'views and dimensions', assembly:'assembly', allFronts:'All furniture', name:'Name', type:'Type', place:'Position', nParts:'Parts', unit:'Unit',
       base:'base', wallc:'wall', tall:'tall', box:'3D construction', dish:'dishwasher front', legs:'Legs', feet:'Feet', frontEdge:'FRONT', fronts:'Fronts', gapsBetween:'Gaps between the fronts', flushBottom:'at the bottom the front is flush with the carcass',
       made:'Cabinet creator', firstAngle:'Projection E (ISO)', conn:'Joints:', cConf:'confirmats', cCam:'cams', cDowel:'dowels', extra:'extra',
       data:'Data', joinery:'Joints', carcM:'Carcass', facM:'Fronts', edgeM:'Edging', none:'—', warn:'Notes', open:'Opening lines — apex on the handle side; X — drawer',
       fromStart:'from the wall start', fromS:'From start', worktop:'worktop', wtPart:'Worktop', cont:'continued', contNext:'Continued on the next sheet →', more:'more — see the cabinet sheets', noLayout:'Cabinets are not placed in the Furniture tab — all fronts are shown in a row.', clear:'clear', wallLen:'Wall' }
};
var L = TX.lt, curLang = 'lt'; function setLang(l) { L = TX[l] || TX.lt; curLang = TX[l] ? l : 'lt'; }
var WT_PIECES = null;   // the project's worktop pieces as cut (joined along a wall, trimmed in corners), when the app gives them

/* ---------------------------------------------------------------- small helpers */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function f2(v) { return (Math.round(v * 100) / 100).toString(); }
function nm(v) { v = Math.round(v * 10) / 10; return String(v); }
function tw(s, size) { return String(s).length * size * 0.56; }   // text width estimate (Arial)
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function txt(x, y, s, size, o) {
  o = o || {};
  return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-family="' + FONT + '" font-size="' + f2(size) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + (o.bold ? ' font-weight="700"' : '') + (o.italic ? ' font-style="italic"' : '') +
    (o.fill ? ' fill="' + o.fill + '"' : ' fill="#1d2320"') + (o.rot ? ' transform="rotate(' + f2(o.rot) + ' ' + f2(x) + ' ' + f2(y) + ')"' : '') + '>' + esc(s) + '</text>';
}
function line(a, b, w, col, dash) { return '<line x1="' + f2(a[0]) + '" y1="' + f2(a[1]) + '" x2="' + f2(b[0]) + '" y2="' + f2(b[1]) + '" stroke="' + (col || COL.line) + '" stroke-width="' + f2(w || 0.25) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
function rect(x, y, w, h, o) { o = o || {}; return '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) + '" height="' + f2(h) + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.stroke || COL.line) + '" stroke-width="' + f2(o.w == null ? 0.25 : o.w) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>'; }
function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }

/* ---------------------------------------------------------------- boxes */
function pbox(p) {   // a part's extent [x, y, z] in its cabinet (x right, y from the front, z up)
  var q = p.place, pts = [];
  [0, p.L].forEach(function (a) { [0, p.W].forEach(function (b) { [0, p.T].forEach(function (c) { pts.push([0, 1, 2].map(function (i) { return q.o[i] + a * q.u[i] + b * q.v[i] - c * q.n[i]; })); }); }); });
  return [0, 1, 2].map(function (i) { return [Math.min.apply(null, pts.map(function (r) { return r[i]; })), Math.max.apply(null, pts.map(function (r) { return r[i]; }))]; });
}
function isFront(p) { return /^(FASADAS|DURYS)$/.test(p.role); }
function lookFill(name, dflt) { var lk = typeof window !== 'undefined' && window.DBLook, lc = lk && name && lk.color(name); return lc && /^#[0-9a-f]{6}$/i.test(lc) ? lc : dflt; }
function partFill(p) {   // the board's own look (its texture photo's average colour or its colour) when the project has one; else plain drawing colours
  var lk = typeof window !== 'undefined' && window.DBLook, lc = lk && p.mat && lk.color(p.mat);
  if (lc && /^#[0-9a-f]{6}$/i.test(lc)) return lc;
  return isFront(p) ? COL.front : (p.role === 'PLAUSAS' || /HDF/i.test(p.mat || '')) ? COL.hdf : COL.carc; }
function darkFill(hex) { var h = String(hex || '').replace('#', ''); if (h.length !== 6) return false; var v = [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] < 0.33; }
/* the side view's near side (and what stands beside it, thinner than it is deep): see-through, so the drawers, shelves and runners inside show */
function nearSide(boxes) { var x0 = Infinity; boxes.forEach(function (b) { if (b.p && !b.front) x0 = Math.min(x0, b.e[0][0]); });
  return function (b) { return !!(b.p && !b.front && b.e[0][0] <= x0 + 1 && (b.e[0][1] - b.e[0][0]) < Math.min(60, b.e[1][1] - b.e[1][0], b.e[2][1] - b.e[2][0])); }; }
/* boxes of one cabinet in its own coordinates */
function cabBoxes(r, o) {
  o = o || {}; var out = [];
  (r.panels || []).forEach(function (p, i) {
    if (!p.place) return; var fr = isFront(p); if (fr && o.fronts === false) return; if (!fr && o.carcass === false) return;
    out.push({ e:pbox(p), fill:partFill(p), p:p, front:fr, door:p.role === 'DURYS', drawer:!!p.drawer, hingeLeft:p.hingeLeft, pi:i, att:p.drawerOf || undefined });
  });
  if (o.legs !== false) (r.legs || []).forEach(function (l) { var d = l.d || 40; out.push({ e:[[l.x - d / 2, l.x + d / 2], [l.y - d / 2, l.y + d / 2], [-l.h, 0]], fill:COL.leg, leg:true, fit:'leg' }); });
  var pl = r.visual && r.visual.plinth;
  if (pl && o.plinth !== false) {   // the plinth stops under the parts above it (it is drawn, never cut into the carcass)
    var pe = [[pl.x0, pl.x1], [pl.y0, pl.y0 + pl.t], [pl.z0, pl.z1]];
    (r.panels || []).forEach(function (p) { if (!p.place || isFront(p)) return; var e = pbox(p);
      if (e[0][0] < pe[0][1] - 0.01 && e[0][1] > pe[0][0] + 0.01 && e[1][0] < pe[1][1] - 0.01 && e[1][1] > pe[1][0] + 0.01 && e[2][0] < pe[2][1]) pe[2][1] = Math.min(pe[2][1], Math.max(pe[2][0], e[2][0])); });
    if (pe[2][1] - pe[2][0] > 1) out.push({ e:pe, fill:lookFill(pl.mat, COL.front), plinth:true });
  }
  if (o.worktop && r.worktop) { var w = r.worktop; out.push({ e:[[w.x0, w.x1], [w.y0, w.y1], [w.z0, w.z1]], fill:COL.top, worktop:true }); }   // only when asked: views of one cabinet
  if (o.fit) { var cb = out.filter(function (b) { return b.p && !b.front; }); if (o.fronts === false && !cb.length) cb = cabBoxes(r, { fronts:false, legs:false, plinth:false });
    fittingBoxes(r, o.c, cb.length ? cb : cabBoxes(r, { fronts:false, legs:false, plinth:false })).forEach(function (f) { if (o.fronts === false && !f.plate && !f.arm && f.fit === 'hinge') return; out.push(f); }); }
  return out;
}
/* ---------------------------------------------------------------- fittings, drawn as simple solids
   hinges (cup, arm, mounting plate) from the doors, drawer boxes and runners behind the drawer fronts,
   shelf supports at the pin holes. att: the part a fitting moves with in the exploded view */
var METAL = '#cfd4d7', METAL2 = '#b4bbbf';
function fittingBoxes(r, c, carc) {
  var out = [], t = (r.dims && r.dims.t) || 18;
  var vert = carc.filter(function (b) { return b.p && !b.p.drawerOf && (b.e[0][1] - b.e[0][0]) < Math.min(b.e[1][1] - b.e[1][0], b.e[2][1] - b.e[2][0]); });
  var faceAt = function (x, z, y, left) {   // the side / partition face next to x (on the left or the right) at height z
    var best = null; vert.forEach(function (b) { if (z < b.e[2][0] || z > b.e[2][1] || y < b.e[1][0] || y > b.e[1][1]) return;
      if (left && b.e[0][1] <= x + 1 && (!best || b.e[0][1] > best.x)) best = { x:b.e[0][1], b:b };
      if (!left && b.e[0][0] >= x - 1 && (!best || b.e[0][0] < best.x)) best = { x:b.e[0][0], b:b }; }); return best; };
  var doorBox = function (d) { return (r.panels || []).filter(function (p) { if (p.role !== 'DURYS' || !p.place) return false; var e = pbox(p); return Math.abs(e[0][0] - d.x) < 0.6 && Math.abs(e[2][0] - d.z) < 0.6; })[0]; };
  var cuts = function (a, b) { return [0, 1, 2].every(function (k) { return Math.min(a[k][1], b[k][1]) - Math.max(a[k][0], b[k][0]) > 0.01; }); };
  var add = function (e, fill, fit, att, extra) {   // a fitting that would sit in a part or another fitting (a clash the warnings report) is left out of the picture
    if (e.some(function (q) { return q[1] - q[0] < 0.2; })) return;
    if (carc.some(function (b) { return b.p && cuts(b.e, e); }) || out.some(function (f) { return !f.polys && cuts(f.e, e); })) return;
    out.push(Object.assign({ e:e, fill:fill, fit:fit, att:att }, extra || {})); };
  /* a maker's part (window.DBFit, from its STEP model): its outlines extruded along it, as faces; map(x, y, z) → cabinet point */
  var FT = root.DBFit && root.DBFit.has ? root.DBFit : null;
  var addPr = function (name, part, map, mirrored, fill, fit, att, extra) {
    if (!FT || !FT.has(name)) return false;
    FT.prismPolys(name, part, map, mirrored).forEach(function (polys) { polys.forEach(function (pg) {   // one flat item per face: flat items sort cleanly against the boards and each other
      var e = [0, 1, 2].map(function (k) { var v = pg.pts.map(function (q) { return q[k]; }); return [Math.min.apply(null, v), Math.max.apply(null, v)]; });
      out.push(Object.assign({ e:e, e0:e.map(function (r2) { return r2.slice(); }), polys:[pg], fill:fill, fit:fit, att:att, thin:true }, extra || {})); }); });
    return true; };
  /* hinges */
  ((r.visual && r.visual.doors) || []).forEach(function (d) {
    if (d.hinged === false || !d.ys) return; var dp = doorBox(d); if (!dp) return;
    var cupE = (root.DBEngine && root.DBEngine.R.hinge && +root.DBEngine.R.hinge.cupFromEdge) || 22.5, cx = d.hingeLeft ? d.x + cupE : d.x + d.w - cupE;
    d.ys.forEach(function (yy) {
      var cz = d.z + yy, f = faceAt(cx, cz, 37, d.hingeLeft); if (!f || Math.abs(cx - f.x) > 60) return;   // no side or partition next to the hinge edge: nothing to mount on
      if (FT && FT.has('hinge') && !d.inset) {   // Blum CLIP top as modelled: the arm on the side, the cup (and its links) in the door
        var right = !d.hingeLeft, HG = FT.HINGE, mapH = function (sx, sy, sz) { return [right ? cx + sx - HG.cupX : cx - (sx - HG.cupX), -(sz - HG.doorZ), cz + sy]; };
        addPr('hinge', 0, mapH, !right, METAL2, 'hinge', f.b.p.name, { plate:true, arm:true });
        addPr('hinge', 1, mapH, !right, METAL, 'hinge', dp.name, { cup:true });
        return; }
      var sg = d.hingeLeft ? 1 : -1, px = f.x, ex = function (a1, a2) { return [Math.min(px + sg * a1, px + sg * a2), Math.max(px + sg * a1, px + sg * a2)]; };
      add([ex(0, 8), [18, 62], [cz - 22, cz + 22]], METAL2, 'hinge', f.b.p.name, { plate:true });                      // mounting plate on the side's inner face
      add([ex(0, 16), [2, 18], [cz - 10, cz + 10]], METAL, 'hinge', dp.name, { arm:true, side:f.b.p.name });           // hinge arm towards the door (its cup sits in the door)
    });
  });
  /* drawers */
  var secsOf = function (col) { return ((c && c.sections) || []).filter(function (s2) { return Math.max(0, Math.floor(+s2.col || 0)) === col; }); };
  var backY = function (x, z) { var y = Infinity; carc.forEach(function (b) { if (!b.p || b.p.drawerOf) return; var ty = b.e[1][1] - b.e[1][0]; if (ty > Math.min(b.e[0][1] - b.e[0][0], b.e[2][1] - b.e[2][0])) return;
      if (b.e[1][0] > 60 && x > b.e[0][0] && x < b.e[0][1] && z > b.e[2][0] && z < b.e[2][1]) y = Math.min(y, b.e[1][0]); }); return y; };
  ((r.visual && r.visual.drawers) || []).forEach(function (f) {
    var fp = (r.panels || []).filter(function (p) { if (p.role !== 'FASADAS' || !p.place) return false; var e = pbox(p); return Math.abs(e[0][0] - f.x) < 0.6 && Math.abs(e[2][0] - f.bottom) < 0.6; })[0]; if (!fp) return;
    var xc = f.x + f.w / 2, zc = f.bottom + f.h / 2, Lf = faceAt(xc, zc, 100, true), Rf = faceAt(xc, zc, 100, false); if (!Lf || !Rf) return;
    var L0 = Lf.x, R0 = Rf.x, s2 = f.box ? { hw:f.hw, rail:f.rail } : secsOf(f.col || 0)[f.sec] || {}, rail = +s2.rail || 500, by = backY(xc, zc);
    var dep = Math.min(rail, (isFinite(by) ? by : (r.dims ? r.dims.D : 560)) - 4); if (dep < 150 || R0 - L0 < 60) return;
    var rtB = root.DBEngine && root.DBEngine.R.runner[f.hw || s2.hw];
    if (rtB && rtB.ball) {   // GTV / DTC: the box is among the parts; draw the two runners on the side faces
      var ER = (root.DBEngine && root.DBEngine.R) || null, upB = ER ? +ER.ball.up : 37, tt = (r.dims && r.dims.t) || 18, ax = Math.max(tt + upB, f.bottom + upB), cl = ER ? +ER.ball.clear : 12.7;
      var bxs = (r.panels || []).filter(function (p) { return p.drawerOf === fp.name && p.role === 'STALC_SONAS' && p.place; });   // the runner axis is where the box sides have their marks
      if (bxs.length && ER) ax = Math.min.apply(null, bxs.map(function (p) { return pbox(p)[2][0]; })) + +ER.ball.boxBelow;
      add([[L0, L0 + cl - 0.5], [2, Math.min(rail, dep + 4)], [ax - 22.5, ax + 22.5]], METAL, 'drawer', fp.name, { dside:true }); add([[R0 - cl + 0.5, R0], [2, Math.min(rail, dep + 4)], [ax - 22.5, ax + 22.5]], METAL, 'drawer', fp.name, { dside:true });
      return; }
    if (rtB && rtB.merivo && f.mv) {   // MERIVOBOX: base and back are among the parts; the steel sides (M side + gallery / BOXCAP for E) and the cabinet profiles
      var mv = f.mv, wl = 13, yE = mv.y0 + mv.len, sH = mv.code === 'E' ? 91 : mv.sideH;
      [[mv.bx0 - wl, mv.bx0, mv.x0, Lf], [mv.bx1, mv.bx1 + wl, mv.x1, Rf]].forEach(function (q) { var lo = Math.min(q[0], q[1]), hi = Math.max(q[0], q[1]);
        add([[lo, hi], [mv.y0 + 2, yE], [mv.zs, mv.zs + sH]], METAL, 'drawer', fp.name, { dside:true });
        var pa = Math.min(q[2], q[0] < q[2] ? q[1] : q[0]), pb = Math.max(q[2], q[0] < q[2] ? q[1] : q[0]); if (pb - pa > 2) add([[pa + 0.5, pb - 0.5], [mv.y0 + 4, yE - 2], [mv.zs + 2, mv.zs + 22]], METAL2, 'runner', q[3].b.p.name, {});
        if (mv.ext === 'rail') { add([[lo + 2.5, hi - 2.5], [mv.y0 + 2, yE], [mv.zs + mv.sideH - 10, mv.zs + mv.sideH - 2]], METAL, 'drawer', fp.name, { dside:true }); add([[lo + 2.5, hi - 2.5], [yE - 14, yE], [mv.zs + sH, mv.zs + mv.sideH - 10]], METAL, 'drawer', fp.name, { dside:true }); }
        if (mv.ext === 'boxcap') add([[lo + 1, hi - 1], [mv.y0 + 2, yE], [mv.zs + sH, mv.zs + mv.sideH]], METAL, 'drawer', fp.name, { dside:true }); });
      return; }
    var ERu = root.DBEngine && root.DBEngine.R, rtU = ERu && ERu.runner[f.hw || s2.hw];
    if (rtU && rtU.under) {   // DTC PASLĖPTI: the box is among the parts; the concealed runners under its sides and in the bottom recess
      var us = (r.panels || []).filter(function (p) { return p.drawerOf === fp.name && p.role === 'STALC_SONAS' && p.place; }).map(pbox).sort(function (a, b) { return a[0][0] - b[0][0]; });
      if (us.length === 2) { var zb0 = us[0][2][0], rcU = +ERu.under.recess || 13, cbU = Math.min(+ERu.under.clearBelow || 14, 13), dU = us[0][1][1];
        [[us[0][0][0], us[0][0][1], 1], [us[1][0][1], us[1][0][0], -1]].forEach(function (q) { var o0 = q[0], i0 = q[1], sg = q[2], xs = function (a, b) { return [Math.min(a, b), Math.max(a, b)]; };
          add([xs(o0, i0 + sg * 14), [3, dU - 2], [zb0 - cbU + 0.5, zb0 - 0.2]], METAL, 'drawer', fp.name, { dside:true });
          add([xs(i0, i0 + sg * 14), [3, dU - 2], [zb0 + 0.2, zb0 + rcU - 0.5]], METAL2, 'drawer', fp.name, { dside:true }); }); }
      return; }
    var tb = /TANDEMBOX/i.test(f.hw || s2.hw || ''), zb = f.bottom + 24, room = f.h - 44; if (room < 40) return;
    var sh = tb ? (f.h >= 250 ? Math.min(room, 180) : Math.min(room, 83)) : Math.min(room, 150), nmF = fp.name;
    var rtM = root.DBEngine && root.DBEngine.R.runner[f.hw || s2.hw], tdM = /^BLUM TANDEM$/i.test(f.hw || s2.hw || ''), nlM = Math.max(250, Math.min(rail, dep + 4));
    var Yz = function (sz) { return FT.FRONT_Z - FT.zmap(sz, nlM); };
    if (tb && FT && FT.has('tbSide') && R0 - L0 >= 150) {   // TANDEMBOX as modelled: runners on the side faces at the runner hole line, antaro sides on them
      var axT = Math.max(t + ((rtM && +rtM.up) || 33), f.bottom + ((rtM && +rtM.up) || 33)), topT = FT.sideTop(f.h >= 170 ? 115.5 : f.h >= 125 ? 83 : 68.5);
      [false, true].forEach(function (rgt) { var X = function (sx) { return rgt ? R0 - sx : L0 + sx; };
        addPr('tbRunner', 0, function (sx, sy, sz) { return [X(sx), Yz(sz), axT + sy]; }, rgt, METAL2, 'runner', (rgt ? Rf : Lf).b.p.name, {});
        addPr('tbSide', 0, function (sx, sy, sz) { return [X(sx), Yz(sz), axT + FT.ymap(sy, topT)]; }, rgt, METAL, 'drawer', nmF, { dside:true }); });
      var backT = f.h >= 250 ? Math.min(axT + 180, f.bottom + f.h - 40) : axT + topT - 4;
      add([[L0 + 36.9, R0 - 36.9], [2, nlM - 12], [axT - 24, axT - 8]], COL.carc, 'drawer', nmF); add([[L0 + 36.9, R0 - 36.9], [nlM - 28, nlM - 12], [axT - 8, backT]], COL.carc, 'drawer', nmF);
    } else if (tdM && FT && FT.has('tdRunner') && R0 - L0 >= 150) {   // TANDEM as modelled: the runners under a wooden box (16 mm sides, the bottom 13 mm up)
      var axD = Math.max(t + ((rtM && +rtM.up) || 37), f.bottom + ((rtM && +rtM.up) || 37)), zb2 = axD - 22.7, sH = Math.max(60, Math.min(250, f.h - 45)), lenD = nlM - 10;
      [false, true].forEach(function (rgt) { var X = function (sx) { return rgt ? R0 - sx : L0 + sx; }, mapD = function (sx, sy, sz) { return [X(sx), Yz(sz), axD + sy]; };
        addPr('tdRunner', 0, mapD, rgt, METAL2, 'runner', (rgt ? Rf : Lf).b.p.name, {}); addPr('tdRunner', 1, mapD, rgt, METAL, 'drawer', nmF, {}); });
      add([[L0 + 5, L0 + 21], [2, lenD], [zb2, zb2 + sH]], COL.carc, 'drawer', nmF, { dside:true }); add([[R0 - 21, R0 - 5], [2, lenD], [zb2, zb2 + sH]], COL.carc, 'drawer', nmF, { dside:true });
      add([[L0 + 21, R0 - 21], [2, lenD], [zb2 + 13, zb2 + 29]], COL.carc, 'drawer', nmF); add([[L0 + 21, R0 - 21], [lenD - 16, lenD], [zb2 + 29, zb2 + sH]], COL.carc, 'drawer', nmF);
      add([[L0 + 21, R0 - 21], [2, 18], [zb2 + 29, zb2 + sH]], COL.carc, 'drawer', nmF);
    } else if (tb) {
      add([[L0 + 3, L0 + 16], [4, dep], [zb, zb + sh]], METAL, 'drawer', nmF, { dside:true }); add([[R0 - 16, R0 - 3], [4, dep], [zb, zb + sh]], METAL, 'drawer', nmF, { dside:true });
      add([[L0 + 16, R0 - 16], [4, dep - 2], [zb, zb + 16]], COL.carc, 'drawer', nmF); add([[L0 + 16, R0 - 16], [dep - 18, dep - 2], [zb + 16, zb + sh - 4]], COL.carc, 'drawer', nmF);
    } else {
      add([[L0 + 1, L0 + 12], [4, dep], [zb - 13, zb - 2]], METAL, 'drawer', nmF, { runner:true }); add([[R0 - 12, R0 - 1], [4, dep], [zb - 13, zb - 2]], METAL, 'drawer', nmF, { runner:true });
      add([[L0 + 8, L0 + 24], [4, dep - 2], [zb, zb + sh]], COL.carc, 'drawer', nmF, { dside:true }); add([[R0 - 24, R0 - 8], [4, dep - 2], [zb, zb + sh]], COL.carc, 'drawer', nmF, { dside:true });
      add([[L0 + 24, R0 - 24], [4, dep - 2], [zb, zb + 16]], COL.carc, 'drawer', nmF); add([[L0 + 24, R0 - 24], [dep - 18, dep - 2], [zb + 16, zb + sh]], COL.carc, 'drawer', nmF);
      add([[L0 + 24, R0 - 24], [4, 20], [zb + 16, zb + sh]], COL.carc, 'drawer', nmF);
    }
  });
  /* shelf supports at the pin holes */
  (r.panels || []).forEach(function (p) {
    if (!p.place || isFront(p)) return; var q = p.place;
    p.holes.forEach(function (h) { if (h.op !== 'pin') return;
      var nrm = h.face === 'A' ? q.n : q.n.map(function (v) { return -v; }), c0 = [0, 1, 2].map(function (i) { return q.o[i] + h.x * q.u[i] + h.y * q.v[i] - (h.face === 'A' ? 0 : p.T) * q.n[i]; });
      var e = [0, 1, 2].map(function (i) { var a = c0[i], b = c0[i] + nrm[i] * 10; return Math.abs(nrm[i]) > 0.5 ? [Math.min(a, b), Math.max(a, b)] : [a - 3, a + 3]; });
      add(e, METAL2, 'pin', p.name, { half:true }); });
  });
  return out;
}
function boundsOf(boxes) { var b = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
  boxes.forEach(function (x) { for (var k = 0; k < 3; k++) { b[k][0] = Math.min(b[k][0], x.e[k][0]); b[k][1] = Math.max(b[k][1], x.e[k][1]); } }); return b; }

/* ---------------------------------------------------------------- views */
/* a view: d = direction of sight (into the scene), pr(point) → [x, y up] on the picture */
function viewOrtho(kind) {
  if (kind === 'front') return { d:[0, 1, 0], pr:function (p) { return [p[0], p[2]]; } };
  if (kind === 'left')  return { d:[1, 0, 0], pr:function (p) { return [-p[1], p[2]]; } };   // seen from the left: the front edge on the right
  if (kind === 'top')   return { d:[0, 0, -1], pr:function (p) { return [p[0], p[1]]; } };   // from above: the back at the top
  if (kind === 'elev')  return { d:[0, -1, 0], pr:function (p) { return [p[0], p[2]]; } };   // a wall seen from the room (local a, b from the wall, z)
  throw new Error(kind);
}
function viewIso(d) {
  d = unit(d); var r = unit(cross(d, [0, 0, 1])), u = cross(r, d);
  return { d:d, pr:function (p) { return [dot(p, r), dot(p, u)]; }, iso:true };
}
var FACES = [   // corner indexes (bit 0: x, bit 1: y, bit 2: z) and outward normal
  { n:[-1, 0, 0], c:[0, 2, 6, 4] }, { n:[1, 0, 0], c:[1, 5, 7, 3] }, { n:[0, -1, 0], c:[0, 4, 5, 1] },
  { n:[0, 1, 0], c:[2, 3, 7, 6] }, { n:[0, 0, -1], c:[0, 1, 3, 2] }, { n:[0, 0, 1], c:[4, 6, 7, 5] } ];
function corner(e, i) { return [e[0][i & 1], e[1][(i >> 1) & 1], e[2][(i >> 2) & 1]]; }
/* project the boxes, find the visible faces and the far-to-near order */
function solve(boxes, V) {
  var eps = 0.01;
  boxes.forEach(function (b) {
    b.faces = []; var xs = [], ys = [];
    if (b.polys) {   // a maker's part: its own faces (moved as its box was, e.g. in the exploded view), far ones first
      var sh = [0, 1, 2].map(function (k) { return b.e0 ? b.e[k][0] - b.e0[k][0] : 0; });
      b.w = [];
      b.polys.forEach(function (pg) { if (dot(pg.n, V.d) > -1e-9) return; var w = pg.pts.map(function (q) { return [q[0] + sh[0], q[1] + sh[1], q[2] + sh[2]]; }), pts = w.map(V.pr);
        var area = 0; for (var k = 0; k < pts.length; k++) { var a = pts[k], c = pts[(k + 1) % pts.length]; area += a[0] * c[1] - c[0] * a[1]; }
        if (Math.abs(area) < 1e-6) return; var cw = [0, 1, 2].map(function (k) { return w.reduce(function (s0, q) { return s0 + q[k]; }, 0) / w.length; });
        b.faces.push({ pts:pts, n:pg.n, area:Math.abs(area) / 2, dz:dot(cw, V.d) }); b.w = b.w.concat(w); pts.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
      b.faces.sort(function (p, q) { return q.dz - p.dz; });
      if (!xs.length) { b.hull = []; b.bb = [Infinity, -Infinity, Infinity, -Infinity]; b.depth = 0; return; }   // turned away: nothing to draw, nothing to order
    } else
    FACES.forEach(function (f) { if (dot(f.n, V.d) > -1e-9) return; var pts = f.c.map(function (i) { return V.pr(corner(b.e, i)); });
      var area = 0; for (var k = 0; k < 4; k++) { var a = pts[k], c = pts[(k + 1) % 4]; area += a[0] * c[1] - c[0] * a[1]; }
      if (Math.abs(area) < 1e-6) return; b.faces.push({ pts:pts, n:f.n, area:Math.abs(area) / 2 }); pts.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
    var all8 = []; for (var i = 0; i < 8; i++) all8.push(V.pr(corner(b.e, i)));
    if (!xs.length) all8.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); });
    b.hull = b.polys && xs.length ? hull2(xs.map(function (x, k) { return [x, ys[k]]; })) : hull2(all8);   // a maker's part: its own outline
    b.bb = [Math.min.apply(null, xs), Math.max.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, ys)];
    b.depth = dot([(b.e[0][0] + b.e[0][1]) / 2, (b.e[1][0] + b.e[1][1]) / 2, (b.e[2][0] + b.e[2][1]) / 2], V.d);
  });
  var n = boxes.length, after = boxes.map(function () { return []; }), indeg = boxes.map(function () { return [0, 0, 0]; });   // waiting on: [axis-decided, by a face's plane, by middles]
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
    var A = boxes[i], B = boxes[j];
    if (Math.min(A.bb[1], B.bb[1]) - Math.max(A.bb[0], B.bb[0]) <= eps || Math.min(A.bb[3], B.bb[3]) - Math.max(A.bb[2], B.bb[2]) <= eps) continue;
    if (!overlap2(A.hull, B.hull)) continue;                                 // pictures only touch: no order needed
    var ord = 0, clash = false;
    for (var k = 0; k < 3; k++) { if (Math.abs(V.d[k]) < 1e-9) continue; var o2 = 0;
      if (A.e[k][1] <= B.e[k][0] + eps) o2 = V.d[k] > 0 ? -1 : 1;           // A on the low side: met first along the ray when d[k] > 0 (A nearer)
      else if (B.e[k][1] <= A.e[k][0] + eps) o2 = V.d[k] > 0 ? 1 : -1;
      if (o2 && ord && o2 !== ord) clash = true; if (o2) ord = o2; }
    if (clash) continue;                                                     // two axes disagree: no ray meets both, so neither covers the other
    var lv = 0;
    if (!ord && (A.w || B.w)) { ord = planeSide(A, B, V); lv = 1; }              // a maker's part's face: by the side of its plane the other lies on
    if (!ord) { ord = A.depth > B.depth ? 1 : -1; lv = 2; }                  // boxes in each other: by their middles
    if (ord > 0) { after[i].push([j, lv]); indeg[j][lv]++; } else { after[j].push([i, lv]); indeg[i][lv]++; }
  }
  var order = [], done = boxes.map(function () { return false; });
  var waits = function (q, upTo) { var w = 0; for (var l = 0; l <= upTo; l++) w += indeg[q][l]; return w; };
  while (order.length < n) {
    var pick = -1;
    for (var lvl = 2; lvl >= 0 && pick < 0; lvl--)   // nothing free: a cycle, broken at its weakest link (by middles, then by a plane), farthest first
      for (var q = 0; q < n; q++) if (!done[q] && waits(q, lvl) === 0 && (pick < 0 || boxes[q].depth > boxes[pick].depth)) pick = q;
    if (pick < 0) for (var q2 = 0; q2 < n; q2++) if (!done[q2] && (pick < 0 || indeg[q2][0] < indeg[pick][0] || (indeg[q2][0] === indeg[pick][0] && boxes[q2].depth > boxes[pick].depth))) pick = q2;
    done[pick] = true; order.push(boxes[pick]); after[pick].forEach(function (j2) { indeg[j2[0]][j2[1]]--; });
  }
  return order;
}
/* a visible face (its normal towards the eye) against another item: 1 when A is to be drawn first, -1 when B, 0 when its plane cuts the other */
function planeSide(A, B, V) {
  var ptsOf = function (b) { if (b.w && b.w.length) return b.w; var c = []; for (var i = 0; i < 8; i++) c.push(corner(b.e, i)); return c; };
  var side = function (F, pts) { if (!F.w || !F.w.length || !F.faces.length) return 0; var n = F.faces[0].n, p0 = F.w[0], lo = Infinity, hi = -Infinity;
    pts.forEach(function (q) { var s0 = n[0] * (q[0] - p0[0]) + n[1] * (q[1] - p0[1]) + n[2] * (q[2] - p0[2]); if (s0 < lo) lo = s0; if (s0 > hi) hi = s0; });
    return lo >= -0.05 ? 1 : hi <= 0.05 ? -1 : 0; };                         // 1: wholly on the eye's side of the face
  var inBox = function (X, pts) {   // a board (convex) against a face partly in it: 1 when the face lies wholly in front of one of the board's visible sides, -1 when behind all of them
    for (var k = 0; k < 3; k++) { if (Math.abs(V.d[k]) < 1e-9) continue; var lo = V.d[k] > 0;
      if (pts.every(function (q) { return lo ? q[k] <= X.e[k][0] + 0.05 : q[k] >= X.e[k][1] - 0.05; })) return 1; }
    return pts.every(function (q) { for (var k = 0; k < 3; k++) { if (Math.abs(V.d[k]) < 1e-9) continue; if (V.d[k] > 0 ? q[k] < X.e[k][0] - 0.05 : q[k] > X.e[k][1] + 0.05) return false; } return true; }) ? -1 : 0; };
  var a = side(A, ptsOf(B)); if (a) return a;                                // B in front of A's face: A first
  var b = side(B, ptsOf(A)); if (b) return -b;
  if (!A.w && B.w && B.w.length) return inBox(A, B.w);                       // B in front of board A: A first; behind it: B first
  if (!B.w && A.w && A.w.length) return -inBox(B, A.w);
  return 0;
}
/* convex outline of points; do two convex outlines overlap by more than a hair (separating axis test) */
function hull2(ps) {
  ps = ps.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); if (ps.length < 3) return ps;
  var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = [];
  ps.forEach(function (p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); });
  for (var i = ps.length - 1; i >= 0; i--) { var p = ps[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function overlap2(P, Q) {
  if (P.length < 3 || Q.length < 3) return false;
  var polys = [P, Q];
  for (var t = 0; t < 2; t++) { var R = polys[t];
    for (var i = 0; i < R.length; i++) { var a = R[i], b = R[(i + 1) % R.length], n = [b[1] - a[1], a[0] - b[0]], l = Math.hypot(n[0], n[1]); if (l < 1e-9) continue; n = [n[0] / l, n[1] / l];
      var pr = function (S) { var mn = Infinity, mx = -Infinity; S.forEach(function (q) { var v = q[0] * n[0] + q[1] * n[1]; if (v < mn) mn = v; if (v > mx) mx = v; }); return [mn, mx]; };
      var x = pr(P), y = pr(Q); if (Math.min(x[1], y[1]) - Math.max(x[0], y[0]) <= 0.02) return false; } }
  return true;
}
/* picture → sheet: s = sheet mm per model mm, (ox, oy) sheet point of picture (0, 0) */
function M(s, ox, oy) { return function (q) { return [ox + q[0] * s, oy - q[1] * s]; }; }
function drawBoxes(order, m, o) {
  o = o || {}; var out = '', lw = o.lw || 0.3, extra = o.after || {};
  order.forEach(function (b, bi) {
    b.faces.forEach(function (f) {
      var pts = f.pts.map(m), fill = b.fill;
      if (b.polys) fill = shadeOf(fill, 0.8 + 0.2 * Math.max(0, f.n[2] * 0.7 - f.n[0] * 0.4 - f.n[1] * 0.3));
      else if (o.shade && f.n[2] > 0.5) fill = shadeOf(fill, 0.96); else if (o.shade && (f.n[0] !== 0)) fill = shadeOf(fill, 0.9);
      var see = o.see && o.see(b), stc = darkFill(fill) && !see ? '#c3cac6' : COL.line;
      out += '<polygon points="' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ') + '" fill="' + fill + '"' + (see ? ' fill-opacity="0.14" stroke-dasharray="1.6 1"' : '') + ' stroke="' + stc + '" stroke-width="' + f2(b.thin ? lw * 0.6 : lw) + '" stroke-linejoin="round"/>';
    });
    if (extra[bi]) out += extra[bi];
  });
  return out;
}
function shadeOf(hex, k) { var h = hex.replace('#', ''); var c = [0, 2, 4].map(function (i) { return Math.round(parseInt(h.slice(i, i + 2), 16) * k); }); return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function picBounds(order) { var b = [Infinity, -Infinity, Infinity, -Infinity]; order.forEach(function (x) { b[0] = Math.min(b[0], x.bb[0]); b[1] = Math.max(b[1], x.bb[1]); b[2] = Math.min(b[2], x.bb[2]); b[3] = Math.max(b[3], x.bb[3]); }); return b; }
function pickScale(need, room) {   // largest standard scale 1:n where every need[i] * s fits room[i]
  for (var i = 0; i < DEN.length; i++) { var s = 1 / DEN[i]; if (need.every(function (v, k) { return v * s <= room[k]; })) return { s:s, label:'1:' + DEN[i] }; }
  var s2 = Math.min.apply(null, need.map(function (v, k) { return room[k] / v; })); return { s:s2, label:'1:' + Math.round(1 / s2) };
}

/* ---------------------------------------------------------------- dimensions (sheet coordinates) */
function arrow(p, dir, col) { var a = 2.4, w = 0.75, n = [-dir[1], dir[0]];
  return '<polygon points="' + f2(p[0]) + ',' + f2(p[1]) + ' ' + f2(p[0] - dir[0] * a + n[0] * w) + ',' + f2(p[1] - dir[1] * a + n[1] * w) + ' ' + f2(p[0] - dir[0] * a - n[0] * w) + ',' + f2(p[1] - dir[1] * a - n[1] * w) + '" fill="' + col + '"/>'; }
/* dimension between sheet points a and b, drawn off by `off` along the unit normal nr (pointing away from the part) */
function dim(a, b, nr, off, label, o) {
  o = o || {}; var col = o.col || COL.dim, size = o.size || 2.5;
  var d = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(d[0], d[1]); if (len < 0.3) return '';
  var u = [d[0] / len, d[1] / len], A = [a[0] + nr[0] * off, a[1] + nr[1] * off], B = [b[0] + nr[0] * off, b[1] + nr[1] * off];
  var out = line([a[0] + nr[0] * 1, a[1] + nr[1] * 1], [A[0] + nr[0] * 1.6, A[1] + nr[1] * 1.6], 0.13, col) + line([b[0] + nr[0] * 1, b[1] + nr[1] * 1], [B[0] + nr[0] * 1.6, B[1] + nr[1] * 1.6], 0.13, col);
  var inside = len > 6.5;
  out += line(A, B, 0.15, col);
  if (inside) out += arrow(A, [-u[0], -u[1]], col) + arrow(B, u, col);
  else out += line([A[0] - u[0] * 4, A[1] - u[1] * 4], A, 0.15, col) + line(B, [B[0] + u[0] * 4, B[1] + u[1] * 4], 0.15, col) + arrow(A, u, col) + arrow(B, [-u[0], -u[1]], col);
  var ang = Math.atan2(u[1], u[0]) * 180 / Math.PI; if (ang > 89.99) ang -= 180; else if (ang <= -90.01) ang += 180;
  var th = ang * Math.PI / 180, up = [Math.sin(th), -Math.cos(th)], m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], w = tw(label, size);
  var along = w + 3 < len ? 0 : (len / 2 + w / 2 + 3) * (o.before ? -1 : 1), lift = 0.9 + (o.push || 0) * (size + 0.8);   // no room between the arrows: beside the end, stepped out
  var tp = [m[0] + u[0] * along + up[0] * lift, m[1] + u[1] * along + up[1] * lift];
  out += txt(tp[0], tp[1], label, size, { anchor:'middle', fill:col, rot:ang, bold:o.bold, italic:o.italic });
  return out;
}
function dimChain(pts, nr, off, o) {   // consecutive dimensions through sheet points pts (with model values in pts[i][2]); figures of short pieces step outwards
  var out = '', k = 0, size = (o && o.size) || 2.5;
  for (var i = 0; i + 1 < pts.length; i++) { var v = Math.abs(pts[i + 1][2] - pts[i][2]); if (v < 0.5) continue;
    var len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), short = tw(nm(v), size) + 3 >= len;
    var nextLong = i + 2 < pts.length && Math.hypot(pts[i + 2][0] - pts[i + 1][0], pts[i + 2][1] - pts[i + 1][1]) > tw(nm(Math.abs(pts[i + 2][2] - pts[i + 1][2])), size) + 3;
    var before = short && nextLong && (i === 0 || Math.abs(pts[i][2] - pts[i - 1][2]) < 0.5);   // the first short piece next to a long one: its figure goes before it, not into the long one
    k = short ? k + 1 : 0; out += dim(pts[i], pts[i + 1], nr, off, nm(v), Object.assign({}, o, o && o.styleOf ? o.styleOf(i, pts[i][2], pts[i + 1][2]) : {}, { push:short && !before ? (k - 1) % 3 : 0, before:before })); }
  return out;
}

/* ---------------------------------------------------------------- sheet frame and title block */
function sheetOpen() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SW + ' ' + SH + '" width="' + SW + 'mm" height="' + SH + 'mm" font-family="' + FONT + '">' +
    '<rect x="0" y="0" width="' + SW + '" height="' + SH + '" fill="#ffffff"/>' + rect(FR, FR, SW - 2 * FR, SH - 2 * FR, { w:0.5 });
}
function titleBlock(o) {
  var x = SW - FR - TB.w, y = SH - FR - TB.h, s = '';
  s += rect(x, y, TB.w, TB.h, { w:0.5, fill:'#ffffff' });
  s += line([x, y + 11], [x + TB.w, y + 11], 0.25) + line([x, y + 23], [x + TB.w, y + 23], 0.25) + line([x + 58, y], [x + 58, y + 11], 0.25);
  [45, 90, 135].forEach(function (dx) { s += line([x + dx, y + 23], [x + dx, y + TB.h], 0.25); });
  var cell = function (cx, cy, lab, val, size, bold) { return txt(cx + 1.6, cy + 3, lab, 1.9, { fill:'#6b736e' }) + txt(cx + 1.6, cy + 8.4, val, size || 3.4, { bold:bold }); };
  s += txt(x + 3, y + 7.6, L.company, 4.4, { bold:true });
  s += cell(x + 58, y, L.project, clip(o.project, 44), 3.4, true);
  s += cell(x, y + 11, L.drawing, clip(o.title, 70), 3.6, true);
  var scl = o.scale || L.nts, m1 = /^1:(\d+(?:\.\d+)?)$/.exec(scl); if (o.paper === 'A4' && m1) scl += ' · A4 ≈1:' + Math.round(+m1[1] * Math.SQRT2);   // the A3 sheet printed smaller on A4
  s += cell(x, y + 23, L.scale, scl, 3.2) + cell(x + 45, y + 23, L.format, (o.paper || 'A3') + ' · ' + L.firstAngle.replace(/^.*E/, 'E'), 3.0) +
       cell(x + 90, y + 23, L.date, o.date || '', 3.2) + cell(x + 135, y + 23, L.sheet, (o.no || 1) + ' / ' + (o.of || 1), 3.4, true);
  s += txt(x + TB.w - 1.5, y - 1.4, L.made, 1.8, { anchor:'end', fill:'#8a918d' });
  return s;
}
function viewTitle(x, y, label, scale) { return txt(x, y, label, 3.2, { bold:true }) + (scale ? txt(x + tw(label, 3.2) + 3, y, scale, 2.6, { fill:'#55605a' }) : '') + line([x, y + 1.2], [x + tw(label, 3.2), y + 1.2], 0.3); }
function LETTER(i) { return i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26); }
function hwKind(item) { item = String(item || '');
  if (/LANKST|TIP-ON|hinge/i.test(item)) return 'hinge'; if (/TANDEM|MERIVO|bėgel|runner|stalči|KULKIN|GTV|DTC|GUOLIN|PASLĖPT/i.test(item)) return 'drawer'; if (/kojel|pėdut|legs?\b|feet/i.test(item)) return 'leg';
  if (/laikikl|support/i.test(item)) return 'pin'; if (/konfirmat|confirmat/i.test(item)) return 'conf'; if (/kaišč|dowel/i.test(item)) return 'dowel'; if (/ekscentrik|cam/i.test(item)) return 'cam'; return null; }
/* ---------------------------------------------------------------- fitting pictures (as on the DB_Drawings sheets): the Blum
   parts drawn from their STEP models (window.DBFit), the rest as simple solids; small iso pictures, light grey, thin edges */
var ICONS = {};
function cylPrism(cx, cy, r, z0, z1, n, ax) {   // a cylinder as faces; ax: its axis ('z' up or 'y' into the cabinet)
  n = n || 14; var A = [], B = [];
  for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, u = cx + r * Math.cos(a), v = cy + r * Math.sin(a);
    A.push(ax === 'y' ? [u, z0, v] : [u, v, z0]); B.push(ax === 'y' ? [u, z1, v] : [u, v, z1]); }
  return boxFacesOf(A, B, ax === 'y'); }
function boxPrism(e) { var A = [[e[0][0], e[1][0], e[2][0]], [e[0][1], e[1][0], e[2][0]], [e[0][1], e[1][1], e[2][0]], [e[0][0], e[1][1], e[2][0]]], B = A.map(function (q) { return [q[0], q[1], e[2][1]]; }); return boxFacesOf(A, B, false); }
function boxFacesOf(A, B, flip) {   // a prism from its two outlines: side faces + the two ends, outward normals (Newell)
  var n = A.length, f = [];
  for (var i = 0; i < n; i++) { var j = (i + 1) % n; f.push([A[i], A[j], B[j], B[i]]); }
  f.push(B.slice()); f.push(A.slice().reverse());
  return f.map(function (pts) { var nx = 0, ny = 0, nz = 0; for (var a = 0; a < pts.length; a++) { var c = pts[a], e = pts[(a + 1) % pts.length]; nx += (c[1] - e[1]) * (c[2] + e[2]); ny += (c[2] - e[2]) * (c[0] + e[0]); nz += (c[0] - e[0]) * (c[1] + e[1]); }
    var l = Math.hypot(nx, ny, nz) || 1, sg = flip ? -1 : 1; return { pts:pts, n:[sg * nx / l, sg * ny / l, sg * nz / l] }; });
}
function iconFaces(key) {   // the faces of a fitting's picture, in cabinet axes (x right, y into the cabinet, z up)
  var FT = root.DBFit && root.DBFit.has ? root.DBFit : null, out = [], put = function (polys) { polys.forEach(function (pg) { out.push(pg); }); };
  var pr = function (name, part, map, mir) { if (!FT || !FT.has(name)) return false; FT.prismPolys(name, part, map, mir).forEach(put); return true; };
  if (key === 'hinge' || key === 'plate') {
    if (FT && FT.has('hinge')) { var HG = FT.HINGE, mapH = function (sx, sy, sz) { return [sx - HG.cupX, -(sz - HG.doorZ), sy]; };
      pr('hinge', 0, mapH, false); if (key === 'hinge') pr('hinge', 1, mapH, false); return out; }
    put(boxPrism([[0, 8], [18, 62], [-22, 22]])); if (key === 'hinge') put(cylPrism(-18, 0, 17.5, -14, 0, 18, 'y')); return out; }
  if (key === 'tbx' && FT && FT.has('tbSide')) { var topT = FT.sideTop(83), Yz = function (sz) { return FT.FRONT_Z - FT.zmap(sz, 300); };
    pr('tbRunner', 0, function (sx, sy, sz) { return [sx, Yz(sz), sy]; }, false); pr('tbSide', 0, function (sx, sy, sz) { return [sx, Yz(sz), FT.ymap(sy, topT)]; }, false); return out; }
  if (key === 'tandem' && FT && FT.has('tdRunner')) { var Yd = function (sz) { return FT.FRONT_Z - FT.zmap(sz, 300); }, mapD = function (sx, sy, sz) { return [sx, Yd(sz), sy]; };
    pr('tdRunner', 0, mapD, false); pr('tdRunner', 1, mapD, false); return out; }
  if (key === 'tbx' || key === 'tandem' || key === 'runner') { put(boxPrism([[0, 13], [0, 300], [0, 45]])); put(boxPrism([[0, 3], [0, 300], [-14, 0]])); return out; }
  if (key === 'leg') { put(cylPrism(0, 0, 25, 0, 6, 18)); put(cylPrism(0, 0, 14, 6, 95, 16)); put(cylPrism(0, 0, 30, 95, 100, 18)); return out; }
  if (key === 'feet') { put(cylPrism(0, 0, 7.5, 0, 10, 14)); return out; }
  if (key === 'pin') { put(cylPrism(0, 0, 2.5, 0, 9, 10, 'y')); put(boxPrism([[-5, 5], [-8, 0], [2.5, 5]])); return out; }
  if (key === 'conf') { put(cylPrism(0, 0, 5, 0, 8, 14, 'y')); put(cylPrism(0, 0, 3.5, 8, 50, 12, 'y')); return out; }
  if (key === 'cam') { put(cylPrism(0, 0, 7.5, 0, 12.5, 18)); put(cylPrism(0, 0, 4, 12.5, 13.2, 14)); put(boxPrism([[-4.5, 4.5], [-0.7, 0.7], [13.2, 13.9]])); return out; }
  if (key === 'bolt') { put(cylPrism(0, 0, 3.5, 0, 6, 12, 'y')); put(cylPrism(0, 0, 2.5, 6, 34, 10, 'y')); return out; }
  if (key === 'dowel') { put(cylPrism(0, 0, 4, 0, 30, 14, 'y')); return out; }
  if (key === 'led') { var A = [[0, 0], [16, 0], [16, 8], [14.5, 8], [14.5, 1.5], [1.5, 1.5], [1.5, 8], [0, 8]];
    put(boxFacesOf(A.map(function (q) { return [q[0], 0, q[1]]; }), A.map(function (q) { return [q[0], 120, q[1]]; }), true)); put(boxPrism([[1.6, 14.4], [2, 118], [6.2, 7.4]])); return out; }
  if (key === 'nail') { put(cylPrism(0, 0, 2.5, 0, 1, 10)); put(cylPrism(0, 0, 0.8, 1, 18, 8)); return out; }
  return out;
}
function iconKey(item) { var s = String(item || ''), k = hwKind(s);
  if (/Plokštel|plate/i.test(s)) return 'plate'; if (k === 'hinge') return 'hinge';
  if (k === 'drawer') return /TANDEMBOX|MERIVOBOX/i.test(s) ? 'tbx' : /TANDEM\b|TANDEM /i.test(s) ? 'tandem' : 'runner';
  if (k === 'leg') return /pėdut|feet/i.test(s) ? 'feet' : 'leg'; if (/varžt|bolt/i.test(s)) return 'bolt'; if (k === 'cam') return 'cam';
  if (k === 'conf' || k === 'dowel' || k === 'pin') return k; if (/LED/i.test(s)) return 'led'; if (/vinut|kabės|nail/i.test(s)) return 'nail'; return null; }
function iconSvg(key, cx, cy, size) {   // the picture fitted in a size × size square centred at (cx, cy)
  if (!key) return '';
  var ic = ICONS[key];
  if (!ic) {
    var V = viewIso([-0.62, 0.62, -0.48]), d = V.d, Lt = unit([0.35, -0.55, 0.75]), faces = iconFaces(key).filter(function (f) { return dot(f.n, d) < 0; });
    var pl = faces.map(function (f) { var c = [0, 1, 2].map(function (k) { return f.pts.reduce(function (a, q) { return a + q[k]; }, 0) / f.pts.length; });
      var sh = 0.55 + 0.45 * Math.max(0, dot(f.n, Lt)), g = Math.round(150 + 95 * sh); g = Math.min(246, g);
      return { z:dot(c, d), p:f.pts.map(function (q) { var a = V.pr(q); return [a[0], -a[1]]; }), fill:'rgb(' + (g - 4) + ',' + g + ',' + Math.min(250, g + 4) + ')' }; });
    pl.sort(function (a, b) { return b.z - a.z; });
    var xs = [], ys = []; pl.forEach(function (q) { q.p.forEach(function (a) { xs.push(a[0]); ys.push(a[1]); }); });
    ic = ICONS[key] = pl.length ? { pl:pl, x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys) } : { pl:[] };
  }
  if (!ic.pl.length) return '';
  var k = size / Math.max(ic.x1 - ic.x0, ic.y1 - ic.y0, 1e-6), mx = (ic.x0 + ic.x1) / 2, my = (ic.y0 + ic.y1) / 2, sw = f2(Math.max(0.05, Math.min(0.12, size / 90)));
  return '<g stroke="#4a524e" stroke-width="' + sw + '" stroke-linejoin="round">' + ic.pl.map(function (q) {
    return '<polygon points="' + q.p.map(function (a) { return f2(cx + (a[0] - mx) * k) + ',' + f2(cy + (a[1] - my) * k); }).join(' ') + '" fill="' + q.fill + '"/>'; }).join('') + '</g>';
}
/* the fittings with their pictures, letters and quantities: cards in a row (two rows when many) in the box x, y, w × h */
function fitLegend(x, y, w, h, list) {
  if (!list.length) return '';
  var rowsN = Math.ceil(list.length / 4), per = Math.ceil(list.length / rowsN), cw = w / Math.max(per, 3), ch = h / rowsN, s = '';
  list.forEach(function (it, i) {
    var cx = x + (i % per) * cw, cy = y + Math.floor(i / per) * ch, isz = Math.min(ch - 3, 12), tx = cx + isz + 5.5, maxCh = Math.max(6, Math.floor((cw - isz - 8) / (2.05 * 0.56)));
    s += rect(cx + 0.6, cy + 0.6, cw - 1.2, ch - 1.2, { stroke:'#d5d9d6', w:0.2, fill:'#fbfbfa' });
    s += iconSvg(iconKey(it.item), cx + 2.5 + isz / 2, cy + ch / 2, isz);
    s += fitBalloon([cx + 3.2, cy + 3.2], it.n, 2.2);
    var nm0 = hwText(it.item), words = nm0.split(' '), l1 = '', l2 = '';
    words.forEach(function (wd) { if (!l2 && (l1 + ' ' + wd).trim().length <= maxCh) l1 = (l1 + ' ' + wd).trim(); else l2 = (l2 + ' ' + wd).trim(); });
    s += txt(tx, cy + ch / 2 - (l2 ? 2.4 : 0.6), l1, 2.05, { bold:true }) + (l2 ? txt(tx, cy + ch / 2 + 0.2, clip(l2, maxCh), 2.05, { bold:true }) : '');
    s += txt(tx, cy + ch / 2 + (l2 ? 3.1 : 2.6), String(it.qty).replace('.', ',') + ' ' + unitText(it.unit), 2.05, { fill:'#55605a' });
  });
  return s;
}
/* the fittings list as on the drawings: a Blum CLIP top hinge and its mounting plate on lines of their own (ordered apart) */
function drawHw(hw) {
  var out = [];
  (hw || []).forEach(function (h) {
    if (/^BLUM LANKSTAI$/i.test(String(h.item || '').trim())) { out.push({ item:'Lankstas Blum CLIP top', qty:h.qty, unit:h.unit, src:h, part:'hinge' }); out.push({ item:'Plokštelė Blum CLIP', qty:h.qty, unit:h.unit, src:h, part:'plate' }); }
    else out.push(Object.assign({}, h, { src:h }));
  });
  return out;
}
function fitBalloon(c, n, r) { return '<rect x="' + f2(c[0] - r) + '" y="' + f2(c[1] - r) + '" width="' + f2(2 * r) + '" height="' + f2(2 * r) + '" rx="1.2" fill="#fff6e6" stroke="#7a4d12" stroke-width="0.3"/>' + txt(c[0], c[1] + r * 0.37, String(n), r * 0.95, { anchor:'middle', bold:true, fill:'#7a4d12' }); }
function balloon(c, n, r) { r = r || 3.4; return '<circle cx="' + f2(c[0]) + '" cy="' + f2(c[1]) + '" r="' + f2(r) + '" fill="#ffffff" stroke="' + COL.line + '" stroke-width="0.3"/>' + txt(c[0], c[1] + r * 0.37, String(n), r * 0.95, { anchor:'middle', bold:true }); }
/* a list in the box x, y, w × h: one table with lines as tall as fit (2.6–4.4 mm), else side-by-side tables with narrower
   columns; whatever still does not fit is counted in a last line */
function fitTables(x, y, w, h, cols, rows) {
  var W0 = cols.reduce(function (a, c) { return a + c.w; }, 0), pickN = 1;
  for (var n = 1; n <= 3; n++) { var k0 = Math.min(1, (w - (n - 1) * 4) / n / W0); if (k0 < 0.55) break; pickN = n; if (Math.min(4.4, h / (Math.ceil(rows.length / n) + 1)) >= 2.6) break; }
  var k = Math.min(1, (w - (pickN - 1) * 4) / pickN / W0), per = Math.ceil(rows.length / pickN), rh = Math.max(2.6, Math.min(4.4, h / (per + 1))), fit = Math.max(1, Math.floor(h / rh) - 1);
  if (fit * pickN < rows.length) fit = Math.max(1, Math.floor((h - 3.4) / rh) - 1);   // room for the "… more" line
  var take = Math.min(per, fit), s = '';
  var cc = cols.map(function (c) { return Object.assign({}, c, { w:c.w * k }); }), shown = 0;
  for (var q = 0; q < pickN; q++) { var chunk = rows.slice(q * take, (q + 1) * take); if (!chunk.length) break; shown += chunk.length; s += table(x + q * (W0 * k + 4), y, cc, chunk, { rh:rh, fs:Math.min(2.4, rh * 0.58) * Math.max(0.8, k) }).svg; }
  if (shown < rows.length) s += txt(x, y + (take + 1) * rh + 2.8, '… ' + (rows.length - shown) + ' ' + L.more, 2.2, { fill:'#7a4d12' });
  return s;
}
/* fittings and units in English on English sheets (the shop's names stay as they are in Lithuanian) */
var HW_EN = [[/^Konfirmatai/, 'Confirmat screws'], [/^Ekscentrikai/, 'Cam locks'], [/^Ekscentrikų varžtai/, 'Cam bolts'], [/^Kaiščiai/, 'Dowels'], [/^Lentynų laikikliai/, 'Shelf supports'],
  [/^Kabės \/ vinutės plaušui/, 'Staples / nails for the fibreboard back'], [/^Kojelės/, 'Legs'], [/^Pėdutės/, 'Feet'], [/^Stalčiaus bėgeliai/, 'Drawer runners'], [/KULKINIAI/, 'ball-bearing runners'], [/PASLĖPTI|PASLĖPTO MONTAVIMO/, 'undermount runners'], [/GUOLINIAI/, 'ball-bearing runners'], [/LANKSTAI/, 'hinges'], [/MERIVOBOX galerija/, 'MERIVOBOX gallery railing'], [/ su galerija/, ' with gallery'], [/ su BOXCAP/, ' with BOXCAP'], [/^KT\./, 'other']];
function hwText(item, lang) { item = String(item || '').replace(/KULKINIAI/g, 'GUOLINIAI'); if ((lang || curLang) !== 'en') return item; HW_EN.forEach(function (q) { item = item.replace(q[0], q[1]); }); return item; }
function unitText(u, lang) { return (lang || curLang) !== 'en' ? u : /^vnt/i.test(u || '') ? 'pcs' : /^kompl/i.test(u || '') ? 'set' : u; }
function table(x, y, cols, rows, o) {   // cols: [{ w, label, align }], rows: arrays of strings
  o = o || {}; var rh = o.rh || 4.4, fs = o.fs || 2.4, W = cols.reduce(function (a, c) { return a + c.w; }, 0), s = '';
  s += rect(x, y, W, rh * (rows.length + 1), { w:0.35 }) + '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(W) + '" height="' + f2(rh) + '" fill="#eef0ec"/>' + rect(x, y, W, rh, { w:0.35 });
  var cx = x; cols.forEach(function (c, i) { if (i) s += line([cx, y], [cx, y + rh * (rows.length + 1)], 0.15, '#7f8782');
    s += txt(c.align === 'end' ? cx + c.w - 1.2 : cx + 1.2, y + rh * 0.72, c.label, fs * 0.92, { bold:true, anchor:c.align === 'end' ? 'end' : null }); cx += c.w; });
  rows.forEach(function (r, ri) { var yy = y + rh * (ri + 1); if (ri) s += line([x, yy], [x + W, yy], 0.1, '#b5bbb7'); var cx2 = x;
    cols.forEach(function (c, i) { var v = clip(r[i], Math.floor((c.w - 2) / (fs * 0.56))); s += txt(c.align === 'end' ? cx2 + c.w - 1.2 : cx2 + 1.2, yy + rh * 0.72, v, fs, { anchor:c.align === 'end' ? 'end' : null }); cx2 += c.w; }); });
  return { svg:s, h:rh * (rows.length + 1), w:W };
}

/* ---------------------------------------------------------------- cabinet views */
/* front and door details on a front view: opening lines (apex on the handle side), an X on a drawer front, and the front size */
function frontMarks(order, m, V, o) {
  var s = '';
  order.forEach(function (b) {
    if (!b.front || !b.p) return;
    var x0 = b.e[0][0], x1 = b.e[0][1], z0 = b.e[2][0], z1 = b.e[2][1];
    var P = function (x, z) { return m(V.pr([x, 0, z])); };
    if (b.door && b.hingeLeft != null && o.open !== false) {
      var hx = b.hingeLeft ? x0 : x1, ox = b.hingeLeft ? x1 : x0, zm = (z0 + z1) / 2;
      s += line(P(hx, z0), P(ox, zm), 0.18, COL.thin, '2.4 1.2') + line(P(hx, z1), P(ox, zm), 0.18, COL.thin, '2.4 1.2');
    }
    if (b.drawer && o.open !== false)   // a drawer: corner to corner, in the same dashed line as the doors' sign
      s += line(P(x0, z0), P(x1, z1), 0.18, COL.thin, '2.4 1.2') + line(P(x0, z1), P(x1, z0), 0.18, COL.thin, '2.4 1.2');
    if (o.sizes !== false && !(o.skipSize && o.skipSize(b))) {
      var a = P(x0, z0), c = P(x1, z1), w = Math.abs(c[0] - a[0]), h = Math.abs(c[1] - a[1]), lab = nm(x1 - x0) + ' × ' + nm(z1 - z0);
      var fs = Math.min(2.4, h * 0.42); if (fs > 1.2 && tw(lab, fs) + 2 < w) s += (b.drawer && o.open !== false ? '<rect x="' + f2((a[0] + c[0]) / 2 - tw(lab, fs) / 2 - 0.8) + '" y="' + f2((a[1] + c[1]) / 2 - fs * 0.75) + '" width="' + f2(tw(lab, fs) + 1.6) + '" height="' + f2(fs * 1.4) + '" fill="#fff" fill-opacity="0.85"/>' : '') + txt((a[0] + c[0]) / 2, b.door ? Math.max(a[1], c[1]) - Math.max(fs + 0.8, h * 0.07) : (a[1] + c[1]) / 2 + fs * 0.35, lab, fs, { anchor:'middle', fill:'#4a524d' });
    }
  });
  return s;
}
/* clear openings seen in the view without fronts: per column, between the horizontal parts */
function openingDims(order, m, V, dims) {
  var s = '', carc = order.filter(function (b) { return b.p && !b.front && !b.p.drawerOf; });
  var vert = carc.filter(function (b) { return (b.e[0][1] - b.e[0][0]) < Math.min(b.e[1][1] - b.e[1][0], b.e[2][1] - b.e[2][0]) && (b.e[2][1] - b.e[2][0]) > 100; });
  var xs = vert.map(function (b) { return b.e[0]; }).sort(function (a, b) { return a[0] - b[0]; }), cols = [];
  for (var i = 0; i + 1 < xs.length; i++) if (xs[i + 1][0] - xs[i][1] > 60) cols.push([xs[i][1], xs[i + 1][0]]);
  var P = function (x, z) { return m(V.pr([x, 0, z])); };
  cols.forEach(function (cx, k) {
    var xm = (cx[0] + cx[1]) / 2;
    var hz = carc.filter(function (b) { var t = b.e[2][1] - b.e[2][0]; return t < Math.min(b.e[0][1] - b.e[0][0], b.e[1][1] - b.e[1][0]) && b.e[0][0] <= xm && b.e[0][1] >= xm; })
      .map(function (b) { return b.e[2]; }).sort(function (a, b) { return a[0] - b[0]; });
    var merged = []; hz.forEach(function (z) { var l = merged[merged.length - 1]; if (l && z[0] <= l[1] + 0.5) l[1] = Math.max(l[1], z[1]); else merged.push(z.slice()); });
    for (var j = 0; j + 1 < merged.length; j++) { var a = merged[j][1], b = merged[j + 1][0]; if (b - a < 40) continue;
      var xd = cx[0] + (cx[1] - cx[0]) * (0.3 + 0.4 * ((k + j) % 2) * 0); s += dim(P(xm, a), P(xm, b), [1, 0], 0, nm(b - a), { size:2.2 }); }
    s += dim(P(cx[0], dims.topZ), P(cx[1], dims.topZ), [0, -1], 6, nm(cx[1] - cx[0]), { size:2.3 });
  });
  return s;
}
function cabinetData(c, r) {
  var o = c.cnc || {}, ty = c.kind === 'box' ? L.box : c.dishwasher ? L.dish : '';
  var legs = (r.legs || []).length ? ((r.legs[0].feet ? L.feet + ' Ø' + nm(r.legs[0].d) : L.legs + ' ' + nm(r.legs[0].h) + ' mm') + ' × ' + r.legs.length) : L.none;
  var jt = {}; (r.joints || []).forEach(function (j) { (j.sides ? [j.sides.L, j.sides.R] : [j]).forEach(function (sd) { jt[sd.type] = 1; }); });
  var jn = Object.keys(jt).map(function (k) { return { confirmat:L.cConf, cam:L.cCam, dowel:L.cDowel }[k]; }).join(', ') || L.none;
  return [[L.cab, (c.name || L.none) + (ty ? ' · ' + ty : '')], ['W × H × D', nm(r.dims.W) + ' × ' + nm(r.dims.H) + ' × ' + nm(r.dims.D) + ' mm'],
          [L.carcM, (c.mat && c.mat.carc) || L.none], [L.facM, (c.mat && c.mat.facade) || L.none], [L.edgeM, (c.edge && c.edge.carc) || L.none],
          [L.joinery, jn], [L.legs + ' / ' + L.feet.toLowerCase(), legs]];
}
function dimsOf(r) { if (r.dims) return r.dims; var b = boundsOf(cabBoxes(r, {})); return { W:b[0][1] - b[0][0], H:b[2][1] - Math.max(0, b[2][0]), D:b[1][1] - b[1][0], t:18 }; }
function sheetViews(c, r, nr, meta) {
  r = Object.assign({}, r, { dims:dimsOf(r) });
  var all = cabBoxes(r, {}), carc = cabBoxes(r, { fronts:false });
  var b3 = boundsOf(all), W = b3[0][1] - b3[0][0], Ht = b3[2][1] - b3[2][0], Dt = b3[1][1] - b3[1][0];
  var hasInner = carc.some(function (b) { return b.p; });
  var nCol = hasInner ? 3 : 2, gap = 34, top = FR + 14, avW = SW - 2 * FR - 16, avH = SH - 2 * FR - 36;
  var sc = pickScale([W * (nCol - 1) + Dt, Ht + Dt], [avW - gap * nCol, avH - gap * 2]), s = sc.s;
  var svg = sheetOpen(), V;
  var x0 = FR + 18, yBase = top + 16 + Ht * s;                       // floor line of the row of views
  var zMin = b3[2][0];
  /* front */
  V = viewOrtho('front'); var oF = solve(cabBoxes(r, {}), V), mF = M(s, x0 - b3[0][0] * s, yBase + zMin * s);
  svg += viewTitle(x0, top, L.front, sc.label) + drawBoxes(oF, mF, { lw:0.3 }) + frontMarks(oF, mF, V, {});
  var Pf = function (x, z) { return mF([x, z]); }, H0 = r.dims.H;
  svg += dim(Pf(b3[0][0], zMin), Pf(b3[0][1], zMin), [0, 1], 8, nm(W));
  var lv = [zMin, 0, H0].filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  svg += dimChain(lv.map(function (z) { var q = Pf(b3[0][1], z); return [q[0], q[1], z]; }), [1, 0], 7);
  if (lv.length > 2) svg += dim(Pf(b3[0][1], zMin), Pf(b3[0][1], H0), [1, 0], 15, nm(H0 - zMin));
  var xNext = x0 + W * s + gap;
  /* without fronts */
  if (hasInner) {
    V = viewOrtho('front'); var oI = solve(cabBoxes(r, { fronts:false, plinth:false }), V), mI = M(s, xNext - b3[0][0] * s, yBase + zMin * s);
    svg += viewTitle(xNext, top, L.inner, sc.label) + drawBoxes(oI, mI, { lw:0.3 }) + openingDims(oI, function (q) { return mI(q); }, V, { topZ:b3[2][1] });
    xNext += W * s + gap;
  }
  /* from the left (front edge on the right) */
  V = viewOrtho('left'); var bL = cabBoxes(r, { fit:true, c:c }), oL = solve(bL, V), mL = M(s, xNext + b3[1][1] * s, yBase + zMin * s);
  svg += viewTitle(xNext, top, L.left, sc.label) + drawBoxes(oL, mL, { lw:0.3, see:nearSide(bL) });
  var Pl = function (y, z) { return mL(V.pr([0, y, z])); }, cpp = carc.filter(function (b) { return b.p; }), dC = cpp.length ? boundsOf(cpp)[1] : b3[1];
  svg += dim(Pl(dC[1], zMin), Pl(dC[0], zMin), [0, 1], 8, nm(dC[1] - dC[0]));
  if (b3[1][0] < dC[0] - 0.5) svg += dim(Pl(b3[1][1], zMin), Pl(b3[1][0], zMin), [0, 1], 15, nm(Dt));
  svg += txt(Pl(b3[1][0], zMin)[0], yBase + 22, L.frontEdge + ' ▸', 2.2, { anchor:'end', fill:'#6b736e' });
  /* from above (back at the top), under the front view */
  V = viewOrtho('top'); var oT = solve(cabBoxes(r, {}), V), yT = yBase + 26 + Dt * s;
  var mT = M(s, x0 - b3[0][0] * s, yT + b3[1][0] * s);
  svg += viewTitle(x0, yBase + 19, L.top, sc.label) + drawBoxes(oT, mT, { lw:0.3 });
  var Pt = function (x, y) { return mT(V.pr([x, y, 0])); };
  svg += dim(Pt(b3[0][0], b3[1][0]), Pt(b3[0][1], b3[1][0]), [0, 1], 6, nm(W)) + dim(Pt(b3[0][0], b3[1][0]), Pt(b3[0][0], b3[1][1]), [-1, 0], 6, nm(Dt));
  svg += txt(x0 + W * s / 2, yT + 13, L.frontEdge + ' ▾', 2.2, { anchor:'middle', fill:'#6b736e' });
  /* data box next to the top view */
  var dx = x0 + W * s + gap, dy = yBase + 19, rows = cabinetData(c, r);
  var tbx = table(dx, dy, [{ w:30, label:L.data }, { w:Math.max(60, Math.min(120, SW - FR - TB.w - dx - 6)), label:'' }], rows, { rh:4.4, fs:2.3 });
  if (dy + tbx.h < SH - FR - 3 && (dx + tbx.w < SW - FR - TB.w - 3 || dy + tbx.h < SH - FR - TB.h - 3) && dx + tbx.w < SW - FR - 3) svg += tbx.svg;
  var ix = xNext + Dt * s + 30, iw = SW - FR - 8 - ix, ih = SH - FR - TB.h - 10 - (top + 6);
  if (iw > 70 && ih > 70) { var Vi = viewIso(ISO_D), oi = solve(cabBoxes(r, {}), Vi), fpi = fitPic(oi, ix, top + 8, iw, Math.min(ih, iw * 1.4)); svg += viewTitle(ix, top, L.iso, '') + drawBoxes(oi, fpi.m, { lw:0.25, shade:true }); }
  if ((r.panels || []).some(function (p) { return p.role === 'DURYS'; })) svg += txt(x0, SH - FR - 4, L.open, 2, { fill:'#6b736e' });
  svg += titleBlock(Object.assign({}, meta, { title:L.cab + ' ' + nr + (c.name ? ' „' + c.name + '“' : '') + ' — ' + L.views, scale:sc.label }));
  return svg + '</svg>';
}

/* ---------------------------------------------------------------- assembly sheet */
var ROLE_ORDER = ['KAIRE', 'DESINE', 'DUGNAS', 'VIRSUS', 'JUOSTA_PRIEKIS', 'JUOSTA_GALAS_H', 'JUOSTA_GALAS_V', 'JUOSTA_APACIA_V', 'PERTVARA', 'LENTYNA', 'NUGARA', 'PLAUSAS', 'PRIEKIS', 'DURYS', 'FASADAS', 'STALC_SONAS', 'STALC_PRIEKIS', 'STALC_GALAS', 'STALC_DUGNAS'];
function partOrder(panels) {
  return panels.filter(function (p) { return p.place; }).slice().sort(function (a, b) {
    var ra = ROLE_ORDER.indexOf(a.role), rb = ROLE_ORDER.indexOf(b.role); ra = ra < 0 ? 50 : ra; rb = rb < 0 ? 50 : rb;
    return (ra - rb) || a.name.localeCompare(b.name, undefined, { numeric:true }); });
}
function explode(r, boxes) {   // outer parts move away from the carcass along their thickness, fronts forward
  var carc = boxes.filter(function (b) { return b.p && !b.front; }), bb = boundsOf(carc.length ? carc : boxes);
  var E = Math.max(70, Math.min(260, 0.2 * Math.max(bb[0][1] - bb[0][0], bb[1][1] - bb[1][0], bb[2][1] - bb[2][0])));
  boxes.forEach(function (b) {
    b.disp = [0, 0, 0];
    if (b.att) return;
    if (b.front) { b.disp[1] = -1.7 * E;   // a drawer front with a board box moves further out than its box, so the box shows behind it
      var bx = boxes.filter(function (q) { return q.p && q.p.drawerOf && q.p.drawerOf === (b.p && b.p.name); }); if (bx.length) b.disp[1] -= boundsOf(bx)[1][1] - boundsOf(bx)[1][0] + 60;
      return; }
    if (b.leg) { b.disp[2] = bb[2][0] >= -0.5 && b.e[2][1] <= bb[2][0] + 0.5 ? -E : 0; return; }
    if (!b.p) return;
    var ext = b.e.map(function (r2) { return r2[1] - r2[0]; }), k = ext.indexOf(Math.min.apply(null, ext));
    if (Math.abs(b.e[k][0] - bb[k][0]) < 0.5) b.disp[k] = -E; else if (Math.abs(b.e[k][1] - bb[k][1]) < 0.5) b.disp[k] = E;
  });
  boxes.forEach(function (b) { if (b.leg && b.disp[2] === 0) { /* legs under a bottom that moved down go with it */
    var under = carc.filter(function (q) { return q.disp[2] < 0 && q.e[2][0] <= 0.5 && q.e[0][0] <= b.e[0][0] && q.e[0][1] >= b.e[0][1]; })[0]; if (under) b.disp = under.disp.slice(); } });
  var byName = {}; boxes.forEach(function (b) { if (b.p) byName[b.p.name] = b; });
  boxes.forEach(function (b) { if (b.att && byName[b.att]) { b.disp = byName[b.att].disp.slice(); if ((b.p && b.p.drawerOf) || b.fit === 'drawer') b.disp[1] = -1.7 * E; }
    if (b.side && b.att) { var sd = byName[b.side] ? byName[b.side].disp : [0, 0, 0]; b.disp = b.disp.map(function (v, k) { return Math.abs(sd[k]) > 0.01 ? sd[k] : v / 2; }); }   // a hinge: out with its side, halfway forward to its door, so it shows
    if (b.half) b.disp = b.disp.map(function (v) { return v / 2; }); });   // shelf supports: halfway out of their side, so they show   // a hinge floats between its door and its side
  boxes.forEach(function (b) { b.e = b.e.map(function (r2, k) { return [r2[0] + b.disp[k], r2[1] + b.disp[k]]; }); });
  return E;
}
function connectorLines(r, boxes, V, m, order, anchors) {   // every edge bore: a dashed line between where it sits on its part and on the part it goes into; keyed by the later of the two parts in the drawing order
  var s = {}, byP = {}; boxes.forEach(function (b) { if (b.p) byP[b.p.name] = b; });
  var assembled = boxes.filter(function (b) { return b.p && !b.front; }).map(function (b) { return { b:b, e:b.e.map(function (r2, k) { return [r2[0] - b.disp[k], r2[1] - b.disp[k]]; }) }; });
  (r.panels || []).forEach(function (p) {
    var B = byP[p.name]; if (!B || !p.edges.length) return; var q = p.place;
    p.edges.forEach(function (e) {
      var a, b2, out; if (e.edge === 'x0') { a = 0; b2 = e.pos; out = q.u.map(function (v) { return -v; }); } else if (e.edge === 'x1') { a = p.L; b2 = e.pos; out = q.u; }
      else if (e.edge === 'y0') { a = e.pos; b2 = 0; out = q.v.map(function (v) { return -v; }); } else { a = e.pos; b2 = p.W; out = q.v; }
      var pt = [0, 1, 2].map(function (i) { return q.o[i] + a * q.u[i] + b2 * q.v[i] - p.T / 2 * q.n[i]; }), pin = [0, 1, 2].map(function (i) { return pt[i] + out[i] * 1.2; });
      var Q = assembled.filter(function (x) { return x.b !== B && x.e.every(function (r2, k) { return pin[k] > r2[0] + 0.01 && pin[k] < r2[1] - 0.01; }); })[0];
      if (!Q) return; var dq = Q.b.disp, dp = B.disp; if (Math.hypot(dq[0] - dp[0], dq[1] - dp[1], dq[2] - dp[2]) < 1) return;
      var kind = e.d === 5 ? 'conf' : (Math.abs(e.depth - 27) < 0.5 ? 'dowel' : 'cam'), col = COL[kind];
      var A = m(V.pr([pt[0] + dp[0], pt[1] + dp[1], pt[2] + dp[2]])), Bq = m(V.pr([pt[0] + dq[0], pt[1] + dq[1], pt[2] + dq[2]]));
      var k = Math.max(order.indexOf(B), order.indexOf(Q.b)), ll = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]);
      if (anchors) (anchors[kind] = anchors[kind] || []).push({ l:ll, k:k, mid:V.pr([pt[0] + (dp[0] + dq[0]) / 2, pt[1] + (dp[1] + dq[1]) / 2, pt[2] + (dp[2] + dq[2]) / 2]) }); s[k] = (s[k] || '') + line(A, Bq, 0.16, col, '1.4 0.9') + '<circle cx="' + f2(A[0]) + '" cy="' + f2(A[1]) + '" r="0.45" fill="' + col + '"/>';
    });
  });
  return s;
}
/* a point on the part that no nearer part covers in the picture: where the balloon's leader starts */
function anchorOf(b, order, strict) {
  var idx = order.indexOf(b), nearer = order.slice(idx + 1).filter(function (x) { return x.bb[0] < b.bb[1] && x.bb[1] > b.bb[0] && x.bb[2] < b.bb[3] && x.bb[3] > b.bb[2]; });
  var faces = b.faces.slice().sort(function (p, q) { return q.area - p.area; });
  var inPoly = function (pt, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], d = poly[j]; if (((a[1] > pt[1]) !== (d[1] > pt[1])) && (pt[0] < (d[0] - a[0]) * (pt[1] - a[1]) / (d[1] - a[1]) + a[0])) c = !c; } return c; };
  var G = [0.5, 0.3, 0.7, 0.15, 0.85];
  for (var fi = 0; fi < faces.length; fi++) { var f = faces[fi];
    if (f.pts.length !== 4) { var cm = [0, 1].map(function (k) { return f.pts.reduce(function (s0, q) { return s0 + q[k]; }, 0) / f.pts.length; }), cands = [cm];
      f.pts.forEach(function (q) { cands.push([(cm[0] + q[0]) / 2, (cm[1] + q[1]) / 2]); });
      for (var ci = 0; ci < cands.length; ci++) { var pc = cands[ci]; if (inPoly(pc, f.pts) && !nearer.some(function (x) { return x.faces.some(function (g) { return inPoly(pc, g.pts); }); })) return pc; }
      continue; }
    for (var i = 0; i < G.length; i++) for (var j = 0; j < G.length; j++) {
      var u = G[i], v = G[j], P0 = f.pts[0], P1 = f.pts[1], P2 = f.pts[2], P3 = f.pts[3] || f.pts[2];
      var pt = [(1 - u) * (1 - v) * P0[0] + u * (1 - v) * P1[0] + u * v * P2[0] + (1 - u) * v * P3[0], (1 - u) * (1 - v) * P0[1] + u * (1 - v) * P1[1] + u * v * P2[1] + (1 - u) * v * P3[1]];
      if (!nearer.some(function (x) { return x.faces.some(function (g) { return inPoly(pt, g.pts); }); })) return pt; } }
  if (strict) return null;
  var f0 = faces[0]; return f0 ? [(f0.pts[0][0] + f0.pts[2][0]) / 2, (f0.pts[0][1] + f0.pts[2][1]) / 2] : [(b.bb[0] + b.bb[1]) / 2, (b.bb[2] + b.bb[3]) / 2];
}
function placeBalloons(items, area, R0) {   // items: { a:[x,y] sheet, n }; balloons round the picture, sorted by angle, kept apart
  var cx = (area[0] + area[1]) / 2, cy = (area[2] + area[3]) / 2, w = area[1] - area[0], h = area[3] - area[2], per = 2 * (w + h);
  var tOf = function (p) {   // where the ray from the middle through p meets the rectangle, as a distance along its edge (clockwise from top-left)
    var dx = p[0] - cx, dy = p[1] - cy; if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = -1;
    var k = Math.min(Math.abs(dx) > 1e-9 ? (w / 2) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? (h / 2) / Math.abs(dy) : Infinity), x = cx + dx * k, y = cy + dy * k;
    if (Math.abs(y - area[2]) < 1e-6) return x - area[0]; if (Math.abs(x - area[1]) < 1e-6) return w + (y - area[2]); if (Math.abs(y - area[3]) < 1e-6) return w + h + (area[1] - x); return 2 * w + h + (area[3] - y); };
  var ptOf = function (t) { t = ((t % per) + per) % per; if (t < w) return [area[0] + t, area[2]]; t -= w; if (t < h) return [area[1], area[2] + t]; t -= h; if (t < w) return [area[1] - t, area[3]]; t -= w; return [area[0], area[3] - t]; };
  var near = function (p) { var c = [[p[0] - area[0], 0], [area[1] - p[0], 1], [p[1] - area[2], 2], [area[3] - p[1], 3]].sort(function (a, b) { return a[0] - b[0]; })[0][1];
    var x = Math.max(area[0], Math.min(area[1], p[0])), y = Math.max(area[2], Math.min(area[3], p[1]));
    return c === 2 ? x - area[0] : c === 1 ? w + (y - area[2]) : c === 3 ? w + h + (area[1] - x) : 2 * w + h + (area[3] - y); };
  items.forEach(function (it) { it.t = near(it.a); });
  items.sort(function (a, b) { return a.t - b.t; });
  var gap = 2 * R0 + 1.6;
  for (var pass = 0; pass < 3; pass++) for (var i = 1; i < items.length; i++) if (items[i].t - items[i - 1].t < gap) items[i].t = items[i - 1].t + gap;
  var over = items.length ? items[items.length - 1].t - (items[0].t + per) + gap : 0; if (over > 0) items.forEach(function (it, i) { it.t -= over * i / Math.max(1, items.length - 1); });
  items.forEach(function (it) { it.p = ptOf(it.t); });
  return items;
}
/* balloons in two tidy columns, left and right of the picture (as SolidWorks' square auto-balloon layout): each one on the side
   of its piece, in the order of their height, so the leaders do not cross one another */
function placeColumns(items, ring, R0, cx) {
  var gap = 2 * R0 + 1.4, y0 = ring[2] + R0, y1 = ring[3] - R0, cap = Math.max(1, Math.floor((y1 - y0) / gap) + 1);
  var L0 = items.filter(function (it) { return it.a[0] < cx; }), R1 = items.filter(function (it) { return it.a[0] >= cx; });
  var byMid = function (a, b) { return Math.abs(a.a[0] - cx) - Math.abs(b.a[0] - cx); };
  while (L0.length > cap && R1.length < cap) { L0.sort(byMid); R1.push(L0.shift()); }
  while (R1.length > cap && L0.length < cap) { R1.sort(byMid); L0.push(R1.shift()); }
  [[L0, ring[0]], [R1, ring[1]]].forEach(function (sd) {
    var list = sd[0].sort(function (a, b) { return a.a[1] - b.a[1]; }), n = list.length; if (!n) return;
    var ys = list.map(function (it) { return Math.max(y0, Math.min(y1, it.a[1])); }), g = n > 1 ? Math.min(gap, (y1 - y0) / (n - 1)) : gap;
    for (var i = 1; i < n; i++) ys[i] = Math.max(ys[i], ys[i - 1] + g);
    if (ys[n - 1] > y1) { ys[n - 1] = y1; for (var j = n - 2; j >= 0; j--) ys[j] = Math.min(ys[j], ys[j + 1] - g); }
    list.forEach(function (it, k) { it.p = [sd[1], ys[k]]; });
  });
  return L0.concat(R1);
}
function fitPic(order, x, y, w, h) {   // scale and offset that put a picture in a box (sheet), centred
  var pb = picBounds(order), s = Math.min(w / Math.max(1, pb[1] - pb[0]), h / Math.max(1, pb[3] - pb[2]));
  return { s:s, m:M(s, x + w / 2 - (pb[0] + pb[1]) / 2 * s, y + h / 2 + (pb[2] + pb[3]) / 2 * s), pb:pb };
}
var ISO_D = [-0.55, 0.78, -0.42];
function sheetAssembly(c, r, nr, meta) {
  r = Object.assign({}, r, { dims:dimsOf(r) });
  var svg = sheetOpen(), parts = partOrder(r.panels || []), posOf = {};
  parts.forEach(function (p, i) { posOf[p.name] = i + 1; });
  var colX = SW - FR - 158, colW = 152;
  /* exploded */
  var V = viewIso(ISO_D), boxes = cabBoxes(r, { plinth:false }); explode(r, boxes);
  var order = solve(boxes, V), area = [FR + 16, Math.min(colX - 14, SW - FR - TB.w - 4), FR + 26, SH - FR - 14], fp = fitPic(order, area[0], area[2], area[1] - area[0], area[3] - area[2]);
  svg += viewTitle(FR + 6, FR + 9, L.expl, L.nts);
  svg += drawBoxes(order, fp.m, { lw:0.28, shade:true, after:connectorLines(r, boxes, V, function (q) { return fp.m(q); }, order) });
  var items = order.filter(function (b) { return b.p && posOf[b.p.name]; }).map(function (b) { return { a:fp.m(anchorOf(b, order)), n:posOf[b.p.name] }; });
  var pbS = [fp.m([fp.pb[0], fp.pb[3]]), fp.m([fp.pb[1], fp.pb[2]])], ring = [Math.max(area[0] - 6, pbS[0][0] - 9), Math.min(area[1] + 6, pbS[1][0] + 9), Math.max(FR + 14, pbS[0][1] - 9), Math.min(SH - FR - 8, pbS[1][1] + 9)];
  placeBalloons(items, ring, 3.2).forEach(function (it) { svg += line(it.a, it.p, 0.18, '#3a423e') + '<circle cx="' + f2(it.a[0]) + '" cy="' + f2(it.a[1]) + '" r="0.55" fill="#3a423e"/>' + balloon(it.p, it.n, 3.2); });
  var lg = FR + 15, lx = FR + 6;
  svg += txt(lx, lg, L.conn, 2.1, { fill:'#55605a' }); lx += tw(L.conn, 2.1) + 3;
  [[COL.conf, L.cConf], [COL.cam, L.cCam], [COL.dowel, L.cDowel]].forEach(function (k) { svg += line([lx, lg - 0.7], [lx + 6, lg - 0.7], 0.3, k[0], '1.4 0.9') + txt(lx + 7.5, lg, k[1], 2.1, { fill:'#55605a' }); lx += 10 + tw(k[1], 2.1) + 4; });
  /* assembled, small */
  var V2 = viewIso(ISO_D), o2 = solve(cabBoxes(r, { plinth:true }), V2), isoH = 62, fp2 = fitPic(o2, colX + 4, FR + 12, colW - 8, isoH - 6);
  svg += viewTitle(colX, FR + 9, L.iso, '') + drawBoxes(o2, fp2.m, { lw:0.22, shade:true });
  /* parts and hardware */
  var hwRows = (r.hardware || []).map(function (h) { return [h.item, String(h.qty), h.unit]; });
  var extras = (c.extras || []).filter(function (x) { return x && +x.L > 0 && +x.W > 0 && !(x.qty !== '' && x.qty != null && !(+x.qty > 0)); });   // as in the parts list: no size or quantity 0 → not made
  var rows = parts.map(function (p, i) { var eb = p.eb || {}; return [String(i + 1), p.short || p.role, nm(p.L) + ' × ' + nm(p.W) + ' × ' + nm(p.T), p.mat || L.none,
    [eb.y0 ? 'L1' : '', eb.y1 ? 'L2' : '', eb.x0 ? 'W1' : '', eb.x1 ? 'W2' : ''].filter(Boolean).join(' ') || L.none, '1']; });
  extras.forEach(function (x) { rows.push(['–', (x.name || L.extra), nm(+x.L) + ' × ' + nm(+x.W) + ' × ' + nm(+x.T || +c.thick || 18), x.mat || (c.mat && c.mat.carc) || L.none, [x.e1 ? 'L1' : '', x.e2 ? 'L2' : '', x.e3 ? 'W1' : '', x.e4 ? 'W2' : ''].filter(Boolean).join(' ') || L.none, String(Math.max(1, Math.round(+x.qty || 1)))]); });
  var yT = FR + isoH + 12, avail = SH - FR - TB.h - 6 - yT, nRows = rows.length + 1 + (hwRows.length ? hwRows.length + 1 : 0) + 3;
  var rh = Math.max(2.9, Math.min(4.3, avail / nRows)), fs = Math.min(2.35, rh * 0.58);
  svg += txt(colX, yT - 1.8, L.parts, 3, { bold:true });
  var tp = table(colX, yT, [{ w:10, label:L.pos }, { w:27, label:L.part }, { w:36, label:L.size }, { w:47, label:L.mat }, { w:20, label:L.edge }, { w:12, label:L.qty, align:'end' }], rows, { rh:rh, fs:fs });
  svg += tp.svg;
  if (hwRows.length) { var yH = yT + tp.h + rh * 1.6; svg += txt(colX, yH - 1.8, L.hw, 3, { bold:true });
    svg += table(colX, yH, [{ w:110, label:L.name }, { w:22, label:L.qty, align:'end' }, { w:20, label:L.unit }], hwRows, { rh:rh, fs:fs }).svg; }
  svg += titleBlock(Object.assign({}, meta, { title:L.cab + ' ' + nr + (c.name ? ' „' + c.name + '“' : '') + ' — ' + L.assembly, scale:L.nts }));
  return svg + '</svg>';
}

/* ---------------------------------------------------------------- one cabinet on one sheet
   left: front, without fronts and left views (dimensioned), parts and hardware lists under them;
   right: the exploded assembly with part numbers and connector lines */
var FD = { front:'#1f5fbf', gap:'#c0392b' };   // the front view: fronts' sizes blue and bold, gaps red and italic (as on the DRAWINGS sheets)
/* the fronts' own dimensions on the front view: a height chain on the right (gap at the bottom, each front, gaps between, gap at
   the top — to the carcass), a width chain above (gap left, each front, gap right) and a line of what is where */
function frontDims(oF, Pf, top3) {
  var fr = oF.filter(function (b) { return b.front && b.p && !b.worktop; }), cp = oF.filter(function (b) { return b.p && !b.front && !b.p.drawerOf && !b.worktop; });
  if (!fr.length || !cp.length) return null;
  var cb = boundsOf(cp), r1 = function (v) { return Math.round(v * 10) / 10; }, out = '';
  var cols = {}; fr.forEach(function (b) { var k = r1(b.e[0][0]) + '|' + r1(b.e[0][1]); (cols[k] = cols[k] || []).push(b); });
  var keys = Object.keys(cols), sig = function (k) { return cols[k].map(function (b) { return r1(b.e[2][0]) + ':' + r1(b.e[2][1]); }).sort().join(','); };
  var maxX = Math.max.apply(null, fr.map(function (b) { return b.e[0][1]; })), rcol = fr.filter(function (b) { return b.e[0][1] > maxX - 1; });   // the stack along the right edge
  var fitsIn = function (list, ax) { return list.every(function (b) { var a = Pf(ax ? 0 : b.e[0][0], ax ? b.e[2][0] : 0), c = Pf(ax ? 0 : b.e[0][1], ax ? b.e[2][1] : 0);
    return Math.hypot(c[0] - a[0], c[1] - a[1]) > tw(nm(b.e[ax][1] - b.e[ax][0]), 2.5) + 2.5; }); };   // too small a scale: the sizes stay written on the fronts
  var isFront = function (list, ax) { return function (i, a, b) { var on = list.some(function (q) { return Math.abs(q.e[ax][0] - Math.min(a, b)) < 0.6 && Math.abs(q.e[ax][1] - Math.max(a, b)) < 0.6; });
    return on ? { col:FD.front, bold:true, size:2.5 } : { col:FD.gap, italic:true, size:2.1 }; }; };
  /* heights, right: each front a bold blue dimension; the gaps (to the carcass and between) red figures beside the chain */
  var xr = Math.max(cb[0][1], top3[0][1]), vs = rcol.slice().sort(function (a, b) { return a.e[2][0] - b.e[2][0]; });
  var gapMark = function (p0, p1, nr, off, v, horiz) {   // a small red figure off the chain, with a tick to where the gap is
    var m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], a = [m[0] + nr[0] * (off - 1.5), m[1] + nr[1] * (off - 1.5)], b = [m[0] + nr[0] * (off + 2.2), m[1] + nr[1] * (off + 2.2)];
    return line(a, b, 0.15, FD.gap) + txt(b[0] + nr[0] * 0.8 + (horiz ? 0 : 0.4), b[1] + nr[1] * 0.8 + (horiz ? -0.4 : 0.9), nm(v), 2.2, { fill:FD.gap, italic:true, anchor:horiz ? 'middle' : 'start' }); };
  var doV = fitsIn(vs, 2);
  if (doV) vs.forEach(function (b, i) {
    out += dim(Pf(xr, b.e[2][0]), Pf(xr, b.e[2][1]), [1, 0], 6, nm(b.e[2][1] - b.e[2][0]), { col:FD.front, bold:true, size:2.5 });
    var g0 = i ? b.e[2][0] - vs[i - 1].e[2][1] : b.e[2][0] - cb[2][0];
    if (Math.abs(g0) > 0.05) out += gapMark(Pf(xr, b.e[2][0] - g0), Pf(xr, b.e[2][0]), [1, 0], 10.5, Math.abs(g0), false); });
  var gT = cb[2][1] - vs[vs.length - 1].e[2][1]; if (doV && Math.abs(gT) > 0.05) out += gapMark(Pf(xr, vs[vs.length - 1].e[2][1]), Pf(xr, cb[2][1]), [1, 0], 10.5, Math.abs(gT), false);
  /* widths, above: the top row of fronts, the same way */
  var rows = {}; fr.forEach(function (b) { var k = r1(b.e[2][0]) + '|' + r1(b.e[2][1]); (rows[k] = rows[k] || []).push(b); });   // the row with the most fronts side by side (the top one of equals)
  var row = Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) { return (b.length - a.length) || (b[0].e[2][1] - a[0].e[2][1]); })[0];
  var hs = row.slice().sort(function (a, b) { return a.e[0][0] - b.e[0][0]; }), zt = top3[2][1];
  var doH = fitsIn(hs, 0);
  if (doH) hs.forEach(function (b, i) {
    out += dim(Pf(b.e[0][0], zt), Pf(b.e[0][1], zt), [0, -1], 6, nm(b.e[0][1] - b.e[0][0]), { col:FD.front, bold:true, size:2.5 });
    var g0 = i ? b.e[0][0] - hs[i - 1].e[0][1] : b.e[0][0] - cb[0][0];
    if (Math.abs(g0) > 0.05) out += gapMark(Pf(b.e[0][0] - g0, zt), Pf(b.e[0][0], zt), [0, -1], 10.5, Math.abs(g0), true); });
  var gR = cb[0][1] - hs[hs.length - 1].e[0][1]; if (doH && Math.abs(gR) > 0.05) out += gapMark(Pf(hs[hs.length - 1].e[0][1], zt), Pf(cb[0][1], zt), [0, -1], 10.5, Math.abs(gR), true);
  /* sizes the chains do not give stay written on the front */
  var zKey = function (b) { return r1(b.e[2][0]) + '|' + r1(b.e[2][1]); }, xKey = function (b) { return r1(b.e[0][0]) + '|' + r1(b.e[0][1]); };
  var vz = doV ? vs.map(zKey) : [], hx = doH ? hs.map(xKey) : [];
  var skip = function (b) { return vz.indexOf(zKey(b)) >= 0 && hx.indexOf(xKey(b)) >= 0; };   // both its sizes are on the chains
  /* gaps between the fronts and the list of the fronts */
  var between = [];
  keys.forEach(function (k) { var l = cols[k].slice().sort(function (a, b) { return a.e[2][0] - b.e[2][0]; }); for (var i = 1; i < l.length; i++) between.push(r1(l[i].e[2][0] - l[i - 1].e[2][1])); });
  row.slice().sort(function (a, b) { return a.e[0][0] - b.e[0][0]; }).forEach(function (b, i, l) { if (i) between.push(r1(b.e[0][0] - l[i - 1].e[0][1])); });
  vs.forEach(function (b, i) { if (i) between.push(r1(b.e[2][0] - vs[i - 1].e[2][1])); });
  between = between.filter(function (v, i, a) { return v > 0.05 && a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  var sizes = {}; fr.forEach(function (b) { var k = nm(b.e[0][1] - b.e[0][0]) + ' × ' + nm(b.e[2][1] - b.e[2][0]); sizes[k] = (sizes[k] || 0) + 1; });
  var bot = r1(Math.min.apply(null, fr.map(function (b) { return b.e[2][0]; })) - cb[2][0]);
  var notes = [{ t:L.fronts + ': ' + Object.keys(sizes).map(function (k) { return k + ' (' + sizes[k] + ')'; }).join(' / '), o:{ bold:true, fill:FD.front } }];
  if (between.length || Math.abs(bot) < 0.05) notes.push({ t:(between.length ? L.gapsBetween + ': ' + between.map(nm).join(', ') + ' mm' : '') + (Math.abs(bot) < 0.05 ? (between.length ? '; ' : '') + L.flushBottom : ''), o:{ italic:true, fill:FD.gap } });
  return { svg:out, skip:skip, notes:notes };
}
function viewsBlock(r, s, x0, y0, two, c) {   // two: front | left on the first row, without fronts under the front
  var all = cabBoxes(r, { worktop:true }), carc = cabBoxes(r, { fronts:false }), bc = boundsOf(cabBoxes(r, {}));
  var b3 = boundsOf(all), W = b3[0][1] - b3[0][0], Ht = b3[2][1] - b3[2][0], Dt = b3[1][1] - b3[1][0], zMin = b3[2][0];
  var hasInner = carc.some(function (b) { return b.p; }), svg = '', V, rowH = Ht * s + 48, lab = '1:' + Math.round(1 / s);
  x0 += VB_LEFT;   // the overall heights on the left
  var yB = y0 + 14 + VB_TOP + Ht * s;   // floor line of the first row (the fronts' widths above)
  /* front */
  V = viewOrtho('front'); var oF = solve(cabBoxes(r, { worktop:true }), V), mF = M(s, x0 - b3[0][0] * s, yB + zMin * s);
  var Pf = function (x, z) { return mF([x, z]); }, fd = frontDims(oF, Pf, b3);
  svg += viewTitle(x0 - VB_LEFT, y0, L.front, lab) + drawBoxes(oF, mF, { lw:0.28 }) + frontMarks(oF, mF, V, { skipSize:fd ? fd.skip : null }) + (fd ? fd.svg : '');
  var H0 = hasInner ? r.dims.H : bc[2][1], wt = r.worktop;   // only a front (dishwasher): its own height, as in its part row
  svg += dim(Pf(bc[0][0], zMin), Pf(bc[0][1], zMin), [0, 1], 7, nm(bc[0][1] - bc[0][0]), { size:2.3 });
  if (wt && (wt.left > 0.4 || wt.right > 0.4)) svg += dim(Pf(b3[0][0], zMin), Pf(b3[0][1], zMin), [0, 1], 13, nm(W), { size:2.3 });   // the worktop past the sides
  var lv = [zMin, 0, H0].concat(wt ? [wt.z1] : []).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  svg += dimChain(lv.map(function (z) { var q = Pf(b3[0][0], z); return [q[0], q[1], z]; }), [-1, 0], 6, { size:2.3 });
  if (lv.length > 2) svg += dim(Pf(b3[0][0], zMin), Pf(b3[0][0], b3[2][1]), [-1, 0], 13, nm(b3[2][1] - zMin), { size:2.3 });
  if (fd) fd.notes.forEach(function (n, i) { svg += txt(x0 - VB_LEFT, yB + 15.5 + i * 3.6, n.t, 2.5, n.o); });
  var xR = x0 + W * s + 24;
  /* without fronts: next to the front, or under it */
  if (hasInner) {
    var xi = two ? x0 : xR, yi = two ? yB + 28 + VB_NOTES + 14 + Ht * s : yB;
    if (two) svg += viewTitle(x0 - VB_LEFT, yB + 28 + VB_NOTES, L.inner, lab);
    V = viewOrtho('front'); var oI = solve(cabBoxes(r, { fronts:false, plinth:false, fit:true, c:c }), V), mI = M(s, xi - b3[0][0] * s, yi + zMin * s);
    if (!two) svg += viewTitle(xi, y0, L.inner, lab);
    svg += drawBoxes(oI, mI, { lw:0.28 }) + openingDims(oI, function (q) { return mI(q); }, V, { topZ:bc[2][1] });
    if (!two) xR = xi + W * s + 10;
  }
  /* from the left (front edge on the right) */
  V = viewOrtho('left'); var bL2 = cabBoxes(r, { worktop:true, fit:true, c:c }), oL = solve(bL2, V), mL = M(s, xR + b3[1][1] * s, yB + zMin * s);
  svg += viewTitle(xR, y0, L.left, lab) + drawBoxes(oL, mL, { lw:0.28, see:nearSide(bL2) });
  var Pl = function (y, z) { return mL(V.pr([0, y, z])); }, cpp = carc.filter(function (b) { return b.p; }), dC = cpp.length ? boundsOf(cpp)[1] : b3[1];
  svg += dim(Pl(dC[1], zMin), Pl(dC[0], zMin), [0, 1], 7, nm(dC[1] - dC[0]), { size:2.3 });
  if (b3[1][0] < dC[0] - 0.5) svg += dim(Pl(b3[1][1], zMin), Pl(b3[1][0], zMin), [0, 1], 13, nm(Dt), { size:2.3 });
  svg += txt(Pl(b3[1][0], zMin)[0], yB + 20, L.frontEdge + ' ▸', 2, { anchor:'end', fill:'#6b736e' });   // the front edge is on the right in this view
  var bottom = two && hasInner ? yB + 28 + VB_NOTES + rowH - 8 : yB + 24 + VB_NOTES;
  return { svg:svg, bottom:bottom, right:xR + Dt * s };
}
var VB_LEFT = 14, VB_TOP = 13, VB_NOTES = 6;   // room for the heights on the left, the fronts' widths above, the fronts' notes below
function viewsSize(r, s, two) {   // width and height the views take at scale s
  var all = cabBoxes(r, { worktop:true }), b3 = boundsOf(all), W = b3[0][1] - b3[0][0], Ht = b3[2][1] - b3[2][0], Dt = b3[1][1] - b3[1][0];
  var inner = cabBoxes(r, { fronts:false }).some(function (b) { return b.p; });
  var w = (two || !inner ? s * (W + Dt) + 28 : s * (2 * W + Dt) + 38) + VB_LEFT, h = (two && inner ? 2 : 1) * (s * Ht + 14) + VB_TOP + (two && inner ? 28 : 0) + 24 + VB_NOTES;
  return [w, h];
}
/* the cabinet sheet's lists: parts (position numbers as in the exploded view), extra parts, the worktop, fittings (lettered) */
var BALLOON_FITTINGS = false;   // the exploded view's balloons: carcass and fronts only (fittings are pictured in the strip below it)
/* the drawing's parts list, as in the SolidWorks DRAWINGS sheets: identical parts on one line (same kind, size, material and
   number of edged sides — mirrored left / right drawer sides too), one balloon per line; fittings are the pictured strip */
function groupName(names) {
  if (names.every(function (n) { return n === names[0]; })) return names[0];
  var tk = names.map(function (n) { return String(n).split('-'); }), len = tk[0].length;
  if (!tk.every(function (a) { return a.length === len; })) return names[0] + ' …';
  var out = [];
  for (var i = 0; i < len; i++) {
    var u = tk.map(function (a) { return a[i]; }).filter(function (v, k, a) { return a.indexOf(v) === k; });
    if (u.length === 1) { out.push(u[0]); continue; }
    if (i === len - 1 && u.every(function (v) { return /^[A-ZĄ-Ž]$/i.test(v); })) continue;   // -D / -K: a mirrored pair
    var base = u.map(function (v) { return v.replace(/\d+$/, ''); });
    if (base.every(function (b) { return b === base[0]; }) && u.every(function (v) { return /\d$/.test(v); })) {
      var ds = u.map(function (v) { return +v.slice(base[0].length); }).sort(function (a, b) { return a - b; });
      var runs = [], st = ds[0];   // 1,2,3,4,13,14 → 1–4,13–14; too long → STALC*
      for (var k2 = 1; k2 <= ds.length; k2++) if (k2 === ds.length || ds[k2] !== ds[k2 - 1] + 1) { var en = ds[k2 - 1]; runs.push(st === en ? String(st) : st + (en === st + 1 ? ',' : '–') + en); st = ds[k2]; }
      var rs = runs.join(','); out.push(base[0] + (rs.length > 9 ? '*' : rs));
    } else out.push(u.join('/'));
  }
  return out.join('-');
}
function edgeTxt(list) { var n = list.filter(Boolean); return n.length ? n.join(' ') : ''; }
function cabLists(c, r) {
  var parts = partOrder(r.panels || []), hwList = drawHw(r.hardware), hwRows = hwList.map(function (h, i) { return [LETTER(i), hwText(h.item), String(h.qty), unitText(h.unit)]; });
  var extras = (c.extras || []).filter(function (x) { return x && +x.L > 0 && +x.W > 0 && !(x.qty !== '' && x.qty != null && !(+x.qty > 0)); });   // as in the parts list: no size or quantity 0 → not made
  var groups = [], byKey = {}, posOf = {};
  parts.forEach(function (p) { var eb = p.eb || {}, nL = (eb.y0 ? 1 : 0) + (eb.y1 ? 1 : 0), nW = (eb.x0 ? 1 : 0) + (eb.x1 ? 1 : 0);
    var k = [p.role, Math.round(p.L * 10), Math.round(p.W * 10), Math.round(p.T * 10), p.mat || '', nL, nW].join('|');
    var g = byKey[k]; if (!g) { g = byKey[k] = { members:[], p:p, nL:nL, nW:nW }; groups.push(g); } g.members.push(p); });
  groups = groups.filter(function (g) { return !g.p.drawerOf; }).concat(groups.filter(function (g) { return g.p.drawerOf; }));   // carcass and fronts first (they get the balloons), the drawer boxes after
  groups.forEach(function (g, i) { g.nr = i + 1; g.main = !g.p.drawerOf; g.members.forEach(function (p) { posOf[p.name] = g.nr; }); });
  var eTxt = function (nL, nW) { return edgeTxt([nL ? nL + 'L' : '', nW ? nW + 'W' : '']); };
  var rows = groups.map(function (g) { var p = g.p; return [String(g.nr), groupName(g.members.map(function (q) { return q.short || q.role; })), String(g.members.length), nm(p.L), nm(p.W), nm(p.T), p.mat || '', eTxt(g.nL, g.nW)]; });
  extras.forEach(function (x) { var nL = (x.e1 ? 1 : 0) + (x.e2 ? 1 : 0), nW = (x.e3 ? 1 : 0) + (x.e4 ? 1 : 0);
    rows.push(['–', x.name || L.extra, String(Math.max(1, Math.round(+x.qty || 1))), nm(+x.L), nm(+x.W), nm(+x.T || +c.thick || 18), x.mat || (c.mat && c.mat.carc) || '', eTxt(nL, nW)]); });
  var wp = r.worktop && WT_PIECES ? WT_PIECES.filter(function (q) { return q.ids && q.ids.indexOf(c.id) >= 0; })[0] : null;
  if (wp) { var eb2 = wp.eb || {}, shared = wp.ids.length > 1;   // the piece as it is cut: shared with the neighbours, trimmed in a corner
    rows.push(['–', shared ? wp.cab + '-' + wp.name.replace(/_/g, '-') : L.wtPart, wp.ids[0] === c.id ? '1' : '–', nm(wp.L), nm(wp.W), nm(wp.T), wp.mat || '', eTxt((eb2.eb1 ? 1 : 0) + (eb2.eb2 ? 1 : 0), (eb2.eb3 ? 1 : 0) + (eb2.eb4 ? 1 : 0))]); }
  else if (r.worktop) { var wt0 = r.worktop; rows.push(['–', L.wtPart, '1', nm(wt0.L), nm(wt0.W), nm(wt0.T), wt0.mat || '', wt0.edge ? eTxt(1, (wt0.left > 0 ? 1 : 0) + (wt0.right > 0 ? 1 : 0)) : '']); }
  return { parts:parts, groups:groups, posOf:posOf, rows:rows, hwList:hwList, hwRows:hwRows };
}
/* the parts table's columns: material and edges only when some line has them; the name column takes what is left */
var PART_COLS = function (rows, W) {
  W = W || 196; rows = rows || [];
  var hasM = rows.some(function (r0) { return r0[6]; }), hasE = rows.some(function (r0) { return r0[7]; });
  var cols = [{ w:8, label:L.pos, k:0 }, { w:0, label:L.part, k:1 }, { w:10, label:L.unit, align:'end', k:2 }, { w:14, label:'L', align:'end', k:3 }, { w:14, label:'W', align:'end', k:4 }, { w:8, label:'T', align:'end', k:5 }];
  if (hasM) cols.push({ w:66, label:L.mat, k:6 }); if (hasE) cols.push({ w:16, label:L.edge, k:7 });
  cols[1].w = W - cols.reduce(function (a, c0) { return a + c0.w; }, 0);
  return cols;
};
function partTable(x, y, rows, o, W) { var cols = PART_COLS(rows, W); return table(x, y, cols, rows.map(function (r0) { return cols.map(function (c0) { return r0[c0.k]; }); }), o); }
var HW_COLS = function () { return [{ w:9, label:L.pos }, { w:137, label:L.name }, { w:25, label:L.qty, align:'end' }, { w:25, label:L.unit }]; };
/* views scale for the cabinet sheet and how many list lines fit under the views (2.7 mm a line at the least) */
function cabPlan(c, r) {
  r = Object.assign({}, r, { dims:dimsOf(r) });
  var ls = cabLists(c, r), LW = 196, top = FR + 12, bottomY = SH - FR - 4, RH = 2.7;
  var nAll = ls.rows.length + 1, best = null;   // the fittings are pictured beside the exploded view, not listed here
  [false, true].forEach(function (two) { for (var i = 0; i < DEN.length; i++) { var sc = 1 / DEN[i], sz = viewsSize(r, sc, two);
    if (sz[0] <= LW && sz[1] <= bottomY - top - (nAll * 3.2 + 16)) { if (!best || sc > best.s + 1e-9) best = { s:sc, two:two }; break; } } });
  var fits = !!best;
  if (!best) {   // the whole list does not fit next to the views at any scale: keep the views readable, the rest of the list goes on a continuation sheet
    var minList = 14 * RH + 16;
    [false, true].forEach(function (two) { for (var i = 0; i < DEN.length; i++) { var sc = 1 / DEN[i], sz = viewsSize(r, sc, two);
      if (sz[0] <= LW && sz[1] <= bottomY - top - minList) { if (!best || sc > best.s + 1e-9) best = { s:sc, two:two }; break; } } });
  }
  if (!best) [false, true].forEach(function (two) { var sc = 1 / DEN[DEN.length - 1], sz = viewsSize(r, sc, two); if (sz[0] <= LW && (!best || sz[1] < best.h)) best = { s:sc, two:two, h:sz[1] }; });
  if (!best) best = { s:1 / 50, two:true };
  var hViews = viewsSize(r, best.s, best.two)[1], lines = Math.floor((bottomY - (top + hViews + 10) - 8) / RH);
  if (fits || nAll <= lines) return { best:best, nParts:ls.rows.length, hw:true };
  var nParts = Math.max(0, Math.min(ls.rows.length, lines - 2));   // header + the "continued" line
  return { best:best, nParts:nParts, hw:false, restRows:ls.rows.slice(nParts), restFrom:nParts };
}
/* a continuation sheet: the rest of the cabinet's parts and its fittings, in two columns */
function sheetCabList(c, r, nr, meta, rows, from, withHw) {
  r = Object.assign({}, r, { dims:dimsOf(r) });
  var svg = sheetOpen(), ls = cabLists(c, r), rh = 3.3, fs = 2.1, colsX = [FR + 8, FR + 8 + 204], y0 = FR + 22, yMax = [SH - FR - 6, SH - FR - TB.h - 6], k = 0, y = y0;
  svg += viewTitle(FR + 6, FR + 9, L.parts + ' — ' + L.cont, '');
  var put = function (title, cols, list) {
    while (list.length) {
      var room = Math.floor((yMax[k] - y - 4) / rh) - 1;
      if (room < 2) { if (k === 0) { k = 1; y = y0; continue; } svg += txt(colsX[1], yMax[1] + 3, '…', 3); return; }
      var chunk = list.slice(0, room); list = list.slice(room);
      svg += txt(colsX[k], y - 1.8, title, 2.8, { bold:true }) + (cols ? table(colsX[k], y, cols(), chunk, { rh:rh, fs:fs }) : partTable(colsX[k], y, chunk, { rh:rh, fs:fs })).svg;
      y += rh * (chunk.length + 1) + 9;
      if (list.length) { if (k === 0) { k = 1; y = y0; } else { svg += txt(colsX[1], yMax[1] + 3, '…', 3); return; } }
    } };
  put(L.parts, null, rows.slice());
  if (withHw && ls.hwRows.length) put(L.hw, HW_COLS, ls.hwRows.slice());
  svg += titleBlock(Object.assign({}, meta, { title:L.cab + ' ' + nr + (c.name ? ' „' + c.name + '“' : '') + ' — ' + L.cont, scale:'—' }));
  return svg + '</svg>';
}
function sheetCabinet(c, r, nr, meta, plan) {
  plan = plan || cabPlan(c, r);
  r = Object.assign({}, r, { dims:dimsOf(r) });
  var svg = sheetOpen();
  var LX = FR + 8, LW = 196, top = FR + 12, bottomY = SH - FR - 4;
  /* lists */
  var ls0 = cabLists(c, r), hwList = ls0.hwList, posOf = ls0.posOf, hwRows = [];
  var rows = ls0.rows.slice(0, plan.nParts), more = !plan.hw;
  var nRows = rows.length + 1 + (more ? 1 : 0), best = plan.best;
  var vb = viewsBlock(r, best.s, LX + 2, top, best.two, c); svg += vb.svg;
  /* parts and hardware under the views (what does not fit goes on the next sheet) */
  var yT = vb.bottom + 8, rh = Math.max(2.7, Math.min(5, (bottomY - yT - 8) / nRows)), fs = Math.min(2.7, rh * 0.58);
  svg += txt(LX, yT - 1.8, L.parts, 3.2, { bold:true });
  var tp = partTable(LX, yT, rows, { rh:rh, fs:fs });
  svg += tp.svg;
  if (more) svg += txt(LX, yT + tp.h + rh * 0.9, L.contNext, Math.min(2.4, fs + 0.2), { bold:true, fill:'#7a4d12' });
  if (hwRows.length) { var yH = yT + tp.h + rh + 4; svg += txt(LX, yH - 1.8, L.hw, 3, { bold:true });
    svg += table(LX, yH, HW_COLS(), hwRows, { rh:rh, fs:fs }).svg; }
  /* exploded assembly on the right */
  var AX = LX + LW + 10, legH = hwList.length ? Math.ceil(hwList.length / 4) * 15 + 2 : 0, area = [AX + 16, SW - FR - 16, FR + 26, SH - FR - TB.h - 10 - legH];
  svg += line([AX - 4, FR + 4], [AX - 4, SH - FR - 4], 0.15, '#c3c8c5');
  var V = viewIso(ISO_D), boxes = cabBoxes(r, { plinth:false, fit:true, c:c }); explode(r, boxes);
  var order = solve(boxes, V), fp = fitPic(order, area[0] + 4, area[2] + 4, area[1] - area[0] - 8, area[3] - area[2] - 8);
  svg += viewTitle(AX, top, L.expl, L.nts);
  var anchors = {};
  svg += drawBoxes(order, fp.m, { lw:0.26, shade:true, after:connectorLines(r, boxes, V, function (q) { return fp.m(q); }, order, anchors) });
  var items = [], gotNr = {};
  ls0.groups.forEach(function (g) {   // the balloon goes to the piece of the line that is seen best (the biggest one in front)
    if (!g.main) return;   // balloons only on the carcass and the fronts: drawer boxes and fittings are in the lists
    var mine = order.filter(function (b) { return b.p && posOf[b.p.name] === g.nr; });
    var seen = mine.map(function (b) { return { b:b, a:anchorOf(b, order, true), sz:(b.e[0][1] - b.e[0][0]) * (b.e[2][1] - b.e[2][0]) + (b.e[1][1] - b.e[1][0]) * (b.e[2][1] - b.e[2][0]) }; }).filter(function (q) { return q.a; }).sort(function (x, y) { return y.sz - x.sz; });
    var a = seen.length ? seen[0].a : mine.length ? anchorOf(mine[mine.length - 1], order) : null;
    if (a && !gotNr[g.nr]) { gotNr[g.nr] = 1; items.push({ a:fp.m(a), n:g.nr }); } });
  /* fittings: one lettered balloon per line of the fittings list, on one of its pieces */
  var pickFit = function (test) { var cands = order.filter(test); cands.sort(function (a, b) { return (b.e[2][1] - a.e[2][1]) || (a.e[0][0] - b.e[0][0]); });
    for (var i = 0; i < cands.length; i++) { var a = anchorOf(cands[i], order, true); if (a) return fp.m(a); }
    return null; };
  var pickAny = function (fit, pref) { return pickFit(function (b) { return b.fit === fit && pref(b); }) || pickFit(function (b) { return b.fit === fit; }) ||
    (function () { var c0 = order.filter(function (b) { return b.fit === fit; }).pop(); return c0 ? fp.m(anchorOf(c0, order)) : null; })(); };
  if (BALLOON_FITTINGS) hwList.forEach(function (h, i) {
    var k = hwKind(h.src ? h.src.item : h.item), a = null;
    if (k === 'hinge' && h.part === 'plate') {   // the plate: the lowest one in sight (the hinge takes the highest), so the two letters point at different pieces
      var pc = order.filter(function (b) { return b.fit === 'hinge' && b.plate; }).sort(function (x, y) { return x.e[2][0] - y.e[2][0]; });
      for (var q2 = 0; q2 < pc.length && !a; q2++) { var an = anchorOf(pc[q2], order, true); if (an) a = fp.m(an); }
      for (var q3 = 0; q3 < pc.length && !a; q3++) { if (!pc[q3].hull || !pc[q3].hull.length) continue; var an2 = anchorOf(pc[q3], order); if (an2) a = fp.m(an2); } }
    else if (k === 'hinge') a = pickAny('hinge', function (b) { return h.part === 'hinge' ? b.cup || b.arm : b.arm; });
    else if (k === 'drawer') a = pickAny('drawer', function (b) { return b.dside; });
    else if (k === 'leg') a = pickAny('leg', function () { return true; });
    else if (k === 'pin') a = pickAny('pin', function () { return true; });
    else if (k && anchors[k]) { var inPoly = function (pt, poly) { var c2 = false; for (var q = 0, j = poly.length - 1; q < poly.length; j = q++) { var u = poly[q], w = poly[j]; if (((u[1] > pt[1]) !== (w[1] > pt[1])) && (pt[0] < (w[0] - u[0]) * (pt[1] - u[1]) / (w[1] - u[1]) + u[0])) c2 = !c2; } return c2; };
      var vis = anchors[k].filter(function (x) { return x.l > 6 && !order.slice(x.k + 1).some(function (b) { return b.faces.some(function (g) { return inPoly(x.mid, g.pts); }); }); }).sort(function (x, y) { return y.l - x.l; })[0];
      if (vis) a = fp.m(vis.mid); }
    if (a) items.push({ a:a, n:LETTER(i), fit:true });
  });
  var pbS = [fp.m([fp.pb[0], fp.pb[3]]), fp.m([fp.pb[1], fp.pb[2]])], ring = [Math.max(AX + 4, pbS[0][0] - 8), Math.min(SW - FR - 5, pbS[1][0] + 8), FR + 22, area[3] + 4];
  placeColumns(items, ring, 3.1, (pbS[0][0] + pbS[1][0]) / 2).forEach(function (it) { svg += line(it.a, it.p, 0.18, it.fit ? '#7a4d12' : '#3a423e') + '<circle cx="' + f2(it.a[0]) + '" cy="' + f2(it.a[1]) + '" r="0.55" fill="' + (it.fit ? '#7a4d12' : '#3a423e') + '"/>' + (it.fit ? fitBalloon(it.p, it.n, 3.1) : balloon(it.p, it.n, 3.1)); });
  var lg = FR + 16.5, lx = AX, anyConn = (r.panels || []).some(function (p) { return p.edges && p.edges.length; });
  if (anyConn) svg += txt(lx, lg, L.conn, 2.1, { fill:'#55605a' }); lx += tw(L.conn, 2.1) + 3;
  if (anyConn) [[COL.conf, L.cConf], [COL.cam, L.cCam], [COL.dowel, L.cDowel]].forEach(function (k) { svg += line([lx, lg - 0.7], [lx + 6, lg - 0.7], 0.3, k[0], '1.4 0.9') + txt(lx + 7.5, lg, k[1], 2.1, { fill:'#55605a' }); lx += 10 + tw(k[1], 2.1) + 4; });
  if (legH) svg += fitLegend(AX, SH - FR - TB.h - 4 - legH, SW - FR - AX - 3, legH - 2, hwList.map(function (h, i) { return { item:h.item, qty:h.qty, unit:h.unit, n:LETTER(i) }; }));   // the fittings, pictured
  if ((r.panels || []).some(function (p) { return p.role === 'DURYS'; })) svg += txt(LX, SH - FR - 2.2, L.open, 1.9, { fill:'#6b736e' });
  svg += titleBlock(Object.assign({}, meta, { title:L.cab + ' ' + nr + (c.name ? ' „' + c.name + '“' : ''), scale:'1:' + Math.round(1 / best.s) }));
  return svg + '</svg>';
}

/* ---------------------------------------------------------------- whole furniture */
function kindOf(c, RM) { if (c.kind === 'box') return L.box; if (c.dishwasher) return L.dish; var lv = RM.level(c); return lv === 'wall' ? L.wallc : lv === 'tall' ? L.tall : L.base; }
/* every placed cabinet's boxes in plan world coordinates (x right, y up = against the plan's y, z up) */
function roomScene(proj, infos, RM) {
  var Lo = proj.layout, G = RM.geo(Lo), out = [];
  RM.placed(proj).forEach(function (o) {
    var c = o.c, it = o.it, g = G[it.wall], D0 = RM.cabD(c), z0 = RM.z0Of(c, it, Lo), inf = infos[o.i];
    var tr = function (p) { var a = it.x + p[0], b = D0 - p[1]; return [g.P[0] + g.d[0] * a + g.n[0] * b, -(g.P[1] + g.d[1] * a + g.n[1] * b), z0 + p[2]]; };
    var add = function (e, extra) { var cs = []; for (var i = 0; i < 8; i++) cs.push(tr(corner(e, i)));
      var ee = [0, 1, 2].map(function (k) { return [Math.min.apply(null, cs.map(function (q) { return q[k]; })), Math.max.apply(null, cs.map(function (q) { return q[k]; }))]; });
      out.push(Object.assign({ e:ee, cab:o.i, wall:it.wall }, extra)); };
    var bx = inf && inf.r && inf.r.panels && inf.r.panels.length ? cabBoxes(inf.r, {}) : [];
    if (!bx.some(function (b) { return !b.leg; })) bx = bx.concat([{ e:[[0, RM.cabW(c)], [0, D0], [0, RM.cabH(c)]], fill:lookFill(c.mat && c.mat.facade, COL.front), front:true }]);   // a cabinet without placed parts (dishwasher): its outline
    bx.forEach(function (b) { add(b.e, { fill:b.fill, front:b.front, door:b.door, drawer:b.drawer, hingeLeft:b.hingeLeft, p:b.p, leg:b.leg }); });
    var wt = Lo.worktop && (inf && inf.r && inf.r.worktop || RM.wtOf(c)); if (wt) add([[wt.x0, wt.x1], [wt.y0, wt.y1], [wt.z0, wt.z1]], { fill:lookFill(wt.mat, COL.top), worktop:true });
    (RM.sideP ? RM.sideP(c) : []).forEach(function (q) { add([[q.x0, q.x1], [q.y0, q.y1], [q.z0, q.z1]], { fill:lookFill(q.mat, COL.front), sidePanel:true }); });   // side panels (extra parts set beside it)
  });
  return out;
}
function opLabels(Lo, RM) { var nd = 0, nw = 0, out = {}; (RM.opsOf ? RM.opsOf(Lo) : []).forEach(function (op) { out[op.id] = RM.isDoor(op) ? L.door + ' ' + (++nd) : L.window + ' ' + (++nw); }); return out; }
/* a door or window in the plan: the hole in the wall (t thick on its outside), the leaf and its sweep, or the glass */
function planOpening(op, g, mp, RM, t) {
  var q = function (a, b) { return mp([g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]); }, x0 = op.x, x1 = op.x + op.w, J = RM.OP_JAMB || 30, out = '';
  out += '<polygon points="' + [q(x0, 1), q(x1, 1), q(x1, -t - 1), q(x0, -t - 1)].map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ') + '" fill="#ffffff" stroke="none"/>' + line(q(x0, 0), q(x0, -t), 0.3) + line(q(x1, 0), q(x1, -t), 0.3);
  if (RM.isDoor(op)) {
    var lw = op.w - 2 * J, ow = op.swing === 'out', base = ow ? -t : 0, sg = ow ? -1 : 1, hA = op.hinge === 'R' ? x1 - J : x0 + J, oA = op.hinge === 'R' ? x0 + J : x1 - J;
    var H0 = q(hA, base), E = q(hA, base + sg * lw), O = q(oA, base), cr = (E[0] - H0[0]) * (O[1] - H0[1]) - (E[1] - H0[1]) * (O[0] - H0[0]), r = Math.hypot(E[0] - H0[0], E[1] - H0[1]);
    out += line(H0, E, 0.4) + '<path d="M' + f2(E[0]) + ',' + f2(E[1]) + ' A' + f2(r) + ',' + f2(r) + ' 0 0 ' + (cr > 0 ? 1 : 0) + ' ' + f2(O[0]) + ',' + f2(O[1]) + '" fill="none" stroke="' + COL.thin + '" stroke-width="0.18" stroke-dasharray="1.2 0.8"/>';
  } else out += line(q(x0, -t * 0.38), q(x1, -t * 0.38), 0.2, COL.dim) + line(q(x0, -t * 0.62), q(x1, -t * 0.62), 0.2, COL.dim) + line(q(x0 - 30, 0), q(x1 + 30, 0), 0.25);
  return out;
}
function sheetLayout(proj, infos, RM, meta) {
  var svg = sheetOpen(), Lo = proj.layout, G = RM.geo(Lo), ps = RM.placed(proj);
  /* plan */
  var xs = [], ys = []; G.forEach(function (g) { xs.push(g.P[0], g.P[0] + g.d[0] * g.len); ys.push(g.P[1], g.P[1] + g.d[1] * g.len); });
  ps.forEach(function (o) { var g = G[o.it.wall], D0 = RM.cabD(o.c); [0, RM.cabW(o.c)].forEach(function (a) { [0, D0].forEach(function (b) { xs.push(g.P[0] + g.d[0] * (o.it.x + a) + g.n[0] * b); ys.push(g.P[1] + g.d[1] * (o.it.x + a) + g.n[1] * b); }); }); });
  var px0 = Math.min.apply(null, xs), px1 = Math.max.apply(null, xs), py0 = Math.min.apply(null, ys), py1 = Math.max.apply(null, ys);
  var areaP = [FR + 24, FR + 32, 175, 124], sc = pickScale([px1 - px0 + 1, py1 - py0 + 1], [areaP[2], areaP[3]]), s = sc.s;
  var ox = areaP[0] + (areaP[2] - (px1 - px0) * s) / 2 - px0 * s, oy = areaP[1] + (areaP[3] - (py1 - py0) * s) / 2 - py0 * s;
  var mp = function (p) { return [ox + p[0] * s, oy + p[1] * s]; }, yPlan = areaP[1] + areaP[3];   // the lowest wall label: the legend and the list go under it
  svg += viewTitle(FR + 6, FR + 9, L.plan, sc.label);
  G.forEach(function (g, wi) {   // walls: 60 mm on the outside of their line
    var a = g.P, b = [g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len], o = [-g.n[0] * 60, -g.n[1] * 60];
    var pts = [a, b, [b[0] + o[0], b[1] + o[1]], [a[0] + o[0], a[1] + o[1]]].map(mp);
    svg += '<polygon points="' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ') + '" fill="#9aa19c" stroke="' + COL.line + '" stroke-width="0.3"/>';
    var A = mp(a), B = mp(b), nr = [-g.n[0], -g.n[1]];
    svg += dim(A, B, nr, 9 + 60 * s, nm(g.len), {});
    var lab = [(A[0] + B[0]) / 2 + nr[0] * (17 + 60 * s), (A[1] + B[1]) / 2 + nr[1] * (17 + 60 * s)];
    svg += txt(lab[0], lab[1] + 1.2, L.wall + ' ' + 'ABCDEFGH'.charAt(wi), 2.6, { anchor:'middle', bold:true, fill:'#55605a' });
    yPlan = Math.max(yPlan, lab[1] + 3);
    /* positions of the base / tall cabinets on this wall */
    var ends = [0, g.len]; ps.forEach(function (o2) { if (o2.it.wall !== wi || RM.level(o2.c) === 'wall') return; var sw = RM.sideW ? RM.sideW(o2.c) : { L:0, R:0 }; ends.push(o2.it.x - sw.L, o2.it.x, o2.it.x + RM.cabW(o2.c), o2.it.x + RM.cabW(o2.c) + sw.R); });
    ends = ends.map(function (v) { return Math.max(0, Math.min(g.len, v)); }).filter(function (v, i, a2) { return a2.findIndex(function (w) { return Math.abs(w - v) < 0.5; }) === i; }).sort(function (p, q) { return p - q; });
    if (ends.length > 2) svg += dimChain(ends.map(function (v) { var q = mp([a[0] + g.d[0] * v, a[1] + g.d[1] * v]); return [q[0], q[1], v]; }), nr, 3 + 60 * s, { size:2.1 });
  });
  (RM.opsOf ? RM.opsOf(Lo) : []).forEach(function (op) { var g = G[op.wall]; if (g) svg += planOpening(op, g, mp, RM, 60); });   // doors and windows
  ps.slice().sort(function (p, q) { return (RM.level(p.c) === 'wall') - (RM.level(q.c) === 'wall'); }).forEach(function (o) {
    var g = G[o.it.wall], D0 = RM.cabD(o.c), w = RM.cabW(o.c), wallc = RM.level(o.c) === 'wall';
    var pts = [[0, 0], [w, 0], [w, D0], [0, D0]].map(function (q) { return mp([g.P[0] + g.d[0] * (o.it.x + q[0]) + g.n[0] * q[1], g.P[1] + g.d[1] * (o.it.x + q[0]) + g.n[1] * q[1]]); });
    svg += '<polygon points="' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ') + '" fill="' + (wallc ? 'none' : '#ffffff') + '" stroke="' + COL.line + '" stroke-width="' + (wallc ? 0.22 : 0.35) + '"' + (wallc ? ' stroke-dasharray="2 1.2"' : '') + '/>';
    if (RM.sideRects) RM.sideRects(o.c, o.it, G, Lo).forEach(function (q) { svg += '<polygon points="' + q.pts.map(mp).map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ') + '" fill="' + COL.front + '" stroke="' + COL.line + '" stroke-width="0.3"/>'; });
    if (RM.level(o.c) === 'tall') svg += line(pts[0], pts[2], 0.15, COL.thin) + line(pts[1], pts[3], 0.15, COL.thin);
    var fk = wallc ? 0.3 : 0.66, mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], cpt = [mid[0] + (pts[3][0] - pts[0][0]) * fk, mid[1] + (pts[3][1] - pts[0][1]) * fk];
    svg += balloon(cpt, o.i + 1, 2.8);
  });
  var yLeg = Math.max(areaP[1] + areaP[3] + 9, yPlan + 5);
  svg += txt(FR + 6, yLeg, '— — ' + L.wallc + ' · ╳ ' + L.tall, 2.1, { fill:'#55605a' });
  /* 3D */
  var sumN = [0, 0]; G.forEach(function (g, wi) { if (ps.some(function (o) { return o.it.wall === wi; })) { sumN[0] += g.n[0]; sumN[1] -= g.n[1]; } });
  var hl = Math.hypot(sumN[0], sumN[1]) || 1, dh = [-sumN[0] / hl, -sumN[1] / hl], ang = Math.abs(Math.abs(dh[0]) - Math.abs(dh[1])) > 0.5 ? 0.42 : 0;
  var dr = [dh[0] * Math.cos(ang) - dh[1] * Math.sin(ang), dh[0] * Math.sin(ang) + dh[1] * Math.cos(ang)];
  var V = viewIso([dr[0], dr[1], -0.62]), boxes = roomScene(proj, infos, RM), H = +Lo.roomH || 2600;
  G.forEach(function (g) { var nw = [g.n[0], -g.n[1], 0]; if (dot(nw, V.d) > -0.05) return; var a = g.P, b = [g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len], o = [-g.n[0] * 60, -g.n[1] * 60];
    var pts = [a, b, [b[0] + o[0], b[1] + o[1]], [a[0] + o[0], a[1] + o[1]]]; var ex = [Math.min.apply(null, pts.map(function (p) { return p[0]; })), Math.max.apply(null, pts.map(function (p) { return p[0]; }))], ey = [Math.min.apply(null, pts.map(function (p) { return -p[1]; })), Math.max.apply(null, pts.map(function (p) { return -p[1]; }))];
    boxes.push({ e:[ex, ey, [0, H]], fill:COL.wall, wallBox:true }); });
  var order = solve(boxes, V), x3 = FR + 210, fp = fitPic(order, x3, FR + 16, SW - FR - 6 - x3, 140);
  svg += viewTitle(x3, FR + 9, '3D', L.nts) + drawBoxes(order, fp.m, { lw:0.22, shade:true });
  var seen = {}; order.forEach(function (b) { if (b.cab == null || seen[b.cab] || b.wallBox) return; var bb = boxes.filter(function (q) { return q.cab === b.cab && !q.leg; }), e3 = boundsOf(bb);
    seen[b.cab] = 1; var c3 = [(e3[0][0] + e3[0][1]) / 2, (e3[1][0] + e3[1][1]) / 2, (e3[2][0] + e3[2][1]) / 2], q = fp.m(V.pr(c3)); svg += balloon(q, b.cab + 1, 2.6); });
  /* cabinet list */
  var rows = ps.slice().sort(function (p, q) { return p.i - q.i; }).map(function (o) { var inf = infos[o.i];
    return [String(o.i + 1), o.c.name || '', kindOf(o.c, RM), nm(RM.cabW(o.c)) + ' × ' + nm(RM.cabH(o.c)) + ' × ' + nm(RM.cabD(o.c)), L.wall + ' ' + 'ABCDEFGH'.charAt(o.it.wall) + ', ' + nm(o.it.x) + ' mm', String(inf && inf.r ? inf.r.panels.length : 0)]; });
  var unplaced = proj.cabinets.map(function (c, i) { return i; }).filter(function (i) { return !ps.some(function (o) { return o.i === i; }); });
  unplaced.forEach(function (i) { var c = proj.cabinets[i], inf = infos[i]; rows.push([String(i + 1), c.name || '', kindOf(c, RM), nm(RM.cabW(c)) + ' × ' + nm(RM.cabH(c)) + ' × ' + nm(RM.cabD(c)), '—', String(inf && inf.r ? inf.r.panels.length : 0)]); });
  var yL = Math.max(FR + 172, yLeg + 7);
  svg += txt(FR + 6, yL - 2, L.list, 3, { bold:true }) + fitTables(FR + 6, yL, SW - 2 * FR - TB.w - 12, SH - FR - 6 - yL, [{ w:10, label:'Nr' }, { w:44, label:L.name }, { w:30, label:L.type }, { w:40, label:'W × H × D' }, { w:40, label:L.place }, { w:16, label:L.nParts, align:'end' }], rows);
  svg += titleBlock(Object.assign({}, meta, { title:L.layout, scale:sc.label }));
  return svg + '</svg>';
}
function sheetWall(proj, infos, RM, wi, meta) {
  var svg = sheetOpen(), Lo = proj.layout, G = RM.geo(Lo), g = G[wi], H = +Lo.roomH || 2600, roomH0 = H;
  RM.placed(proj).forEach(function (o) { if (o.it.wall === wi) { var wt = Lo.worktop && RM.wtOf(o.c); H = Math.max(H, RM.z0Of(o.c, o.it, Lo) + RM.cabH(o.c) + (wt ? wt.T : 0) + 50); } });   // something above the ceiling still fits the sheet
  /* the scene in the wall's own coordinates: a along the wall, b out from it into the room, z up */
  var toLocal = function (e) { var cs = []; for (var i = 0; i < 8; i++) { var p = corner(e, i), pl = [p[0], -p[1]], a = (pl[0] - g.P[0]) * g.d[0] + (pl[1] - g.P[1]) * g.d[1], b = (pl[0] - g.P[0]) * g.n[0] + (pl[1] - g.P[1]) * g.n[1]; cs.push([a, b, p[2]]); }
    return [0, 1, 2].map(function (k) { return [Math.min.apply(null, cs.map(function (q) { return q[k]; })), Math.max.apply(null, cs.map(function (q) { return q[k]; }))]; }); };
  var boxes = roomScene(proj, infos, RM).map(function (b) { return Object.assign({}, b, { e:toLocal(b.e) }); })
    .filter(function (b) { return b.e[0][1] > 0.5 && b.e[0][0] < g.len - 0.5 && b.e[1][0] < 1200 && b.e[1][1] > -1; });
  boxes.forEach(function (b) { b.e[0] = [Math.max(0, b.e[0][0]), Math.min(g.len, b.e[0][1])]; });
  var V = viewOrtho('elev'), mine = boxes.filter(function (b) { return b.wall === wi; });
  var areaW = SW - 2 * FR - 60, areaH = SH - 2 * FR - TB.h - 46, sc = pickScale([g.len, H], [areaW, areaH]), s = sc.s;
  var x0 = FR + 30 + (areaW - g.len * s) / 2, yF = FR + 26 + H * s, m = M(s, x0, yF);
  svg += viewTitle(FR + 6, FR + 9, L.elev + ' ' + 'ABCDEFGH'.charAt(wi), sc.label);
  svg += rect(x0, yF - roomH0 * s, g.len * s, roomH0 * s, { w:0.25, fill:'#fbfaf7', stroke:'#8b928e' }) + line([x0 - 8, yF], [x0 + g.len * s + 8, yF], 0.5);
  var P = function (a, z) { return m([a, z]); }, OPS = (RM.opsOf ? RM.opsOf(Lo) : []).filter(function (op) { return op.wall === wi; }), OL = opLabels(Lo, RM);
  OPS.forEach(function (op) {   // a door with its casing, leaf and opening sign; a window with its frame, sashes and sill
    var R2 = function (a0, a1, z0, z1, o) { var p0 = P(a0, z1), p1 = P(a1, z0); return rect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1], o); }, x0 = op.x, x1 = op.x + op.w;
    if (RM.isDoor(op)) { var J = RM.OP_JAMB || 30, C2 = RM.OP_CAS || 70, lz = op.h - J, hx = op.hinge === 'R' ? x1 - J : x0 + J, ox = op.hinge === 'R' ? x0 + J : x1 - J;
      svg += R2(x0 - C2, x1 + C2, 0, op.h + (RM.opCasTop ? RM.opCasTop(op, Lo) : C2), { w:0.2, fill:'#ffffff', stroke:COL.thin }) + R2(x0 + J, x1 - J, 0, lz, { w:0.25, fill:'#f6f4ef' });
      if (op.type === 'gdoor') { var gm = Math.max(90, Math.min(140, (op.w - 2 * J) * 0.18)); svg += R2(x0 + J + gm, x1 - J - gm, Math.min(300, lz * 0.15), lz - Math.min(260, lz * 0.13), { w:0.2, fill:'#e6eff3', stroke:COL.dim }); }
      svg += line(P(hx, 0), P(ox, lz / 2), 0.15, COL.thin, '1.2 0.8') + line(P(ox, lz / 2), P(hx, lz), 0.15, COL.thin, '1.2 0.8');   // the point on the handle side, as on the cabinets
    } else { var f = 65, z0 = op.z, z1 = op.z + op.h;
      svg += R2(x0 - 30, x1 + 30, z0 - 25, z0, { w:0.2, fill:'#ffffff' }) + R2(x0, x1, z0, z1, { w:0.25, fill:'#ffffff' });
      (op.w > 1000 ? [[x0 + f, (x0 + x1) / 2 - 40], [(x0 + x1) / 2 + 40, x1 - f]] : [[x0 + f, x1 - f]]).forEach(function (qq) { svg += R2(qq[0], qq[1], z0 + f, z1 - f, { w:0.2, fill:'#e6eff3', stroke:COL.dim }); }); }
  });
  var order = solve(boxes, V); svg += drawBoxes(order, m, { lw:0.3 }) + frontMarks(order, m, V, { sizes:false });
  var PTS = (RM.ptsOf ? RM.ptsOf(Lo) : []).filter(function (pt) { return pt.wall === wi; }).sort(function (a, b) { return a.x - b.x; });
  PTS.forEach(function (pt) {   // sockets and pipes over the cabinets (they are in the wall behind): a symbol, its code and height
    var c = P(pt.x, pt.z), d = RM.PT_DEF[pt.type] || { w:80, h:80 }, sym = '';
    if (pt.type === 'socket' || pt.type === 'socket2') { var p0 = P(pt.x - d.w / 2, pt.z + d.h / 2), p1 = P(pt.x + d.w / 2, pt.z - d.h / 2); sym = rect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1], { w:0.25, fill:'#ffffff' });
      (pt.type === 'socket2' ? [pt.x - 36, pt.x + 36] : [pt.x]).forEach(function (sx) { var q = P(sx, pt.z); sym += '<circle cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(Math.max(0.6, 25 * s)) + '" fill="none" stroke="' + COL.thin + '" stroke-width="0.2"/>'; }); }
    else sym = '<circle cx="' + f2(c[0]) + '" cy="' + f2(c[1]) + '" r="' + f2(Math.max(0.8, d.w / 2 * s)) + '" fill="' + (pt.type === 'cold' ? '#2f6fc4' : pt.type === 'hot' ? '#c9442e' : '#7d847f') + '" stroke="#ffffff" stroke-width="0.15"/>';
    svg += sym + txt(c[0] + Math.max(1.6, d.w / 2 * s + 0.8), c[1] - 1.2, L['pt_' + pt.type] + ' ' + nm(pt.z), 1.9, { fill:'#36403a', bold:true });
  });
  if (PTS.length) {   // a chain from the wall start to each point, under the wall's own dimensions, and what the codes mean
    var xs0 = [0]; PTS.forEach(function (pt) { if (Math.abs(pt.x - xs0[xs0.length - 1]) > 0.5) xs0.push(pt.x); });
    svg += dimChain(xs0.map(function (v) { var q = P(v, 0); return [q[0], q[1], v]; }), [0, 1], 23, { size:2.1 });
    var lg = P(0, 0); svg += txt(lg[0], lg[1] + 31, L.ptLegend, 2, { fill:'#55605a' });
  }
  OPS.forEach(function (op) {   // where it is and how big: from the wall start to it and its width over it, the sill height and its own height beside it
    var top = RM.isDoor(op) ? op.h + (RM.opCasTop ? RM.opCasTop(op, Lo) : (RM.OP_CAS || 70)) : op.z + op.h, z0 = RM.isDoor(op) ? 0 : op.z;
    svg += dimChain([0, op.x, op.x + op.w].map(function (v) { var q = P(v, top); return [q[0], q[1], v]; }), [0, -1], 3.5, { size:2.1 });
    svg += dim(P(op.x + op.w, z0), P(op.x + op.w, z0 + op.h), [1, 0], 3, nm(op.h), { size:2.1 });
    if (!RM.isDoor(op)) svg += dim(P(op.x, 0), P(op.x, op.z), [-1, 0], 3, nm(op.z), { size:2.1 });
    var c = P(op.x + op.w / 2, z0 + op.h * 0.5); svg += txt(c[0], c[1], OL[op.id] || '', 2.3, { anchor:'middle', bold:true, fill:'#55605a' });
  });
  /* widths: base / tall below the floor, wall cabinets above the room */
  var chain = function (lv) { var ends = [0, g.len]; RM.placed(proj).forEach(function (o) { if (o.it.wall !== wi || (RM.level(o.c) === 'wall') !== lv) return; var sw = RM.sideW ? RM.sideW(o.c) : { L:0, R:0 }; ends.push(o.it.x - sw.L, o.it.x, o.it.x + RM.cabW(o.c), o.it.x + RM.cabW(o.c) + sw.R); });
    return ends.map(function (v) { return Math.max(0, Math.min(g.len, v)); }).filter(function (v, i, a) { return a.findIndex(function (w) { return Math.abs(w - v) < 0.5; }) === i; }).sort(function (p, q) { return p - q; }); };
  var cb = chain(false), cw = chain(true);
  if (cb.length > 2) svg += dimChain(cb.map(function (v) { var q = P(v, 0); return [q[0], q[1], v]; }), [0, 1], 7, { size:2.3 });
  svg += dim(P(0, 0), P(g.len, 0), [0, 1], 15, nm(g.len));
  if (cw.length > 2) svg += dimChain(cw.map(function (v) { var q = P(v, H); return [q[0], q[1], v]; }), [0, -1], 6, { size:2.3 });
  /* heights at the right: floor, legs, carcass tops, worktop, wall cabinets */
  var lv = [0]; RM.placed(proj).forEach(function (o) { if (o.it.wall !== wi) return; var z0 = RM.z0Of(o.c, o.it, Lo), h = RM.cabH(o.c); lv.push(z0, z0 + h); var wt = Lo.worktop && RM.wtOf(o.c); if (wt) lv.push(z0 + h + wt.T); });
  lv = lv.filter(function (v, i, a) { return a.findIndex(function (w) { return Math.abs(w - v) < 0.5; }) === i; }).sort(function (p, q) { return p - q; });
  svg += dimChain(lv.map(function (z) { var q = P(g.len, z); return [q[0], q[1], z]; }), [1, 0], 9, { size:2.2 });
  svg += dim(P(g.len, 0), P(g.len, roomH0), [1, 0], 20, nm(roomH0));
  /* numbers */
  var seen = {}; mine.forEach(function (b) { if (seen[b.cab]) return; seen[b.cab] = 1; var own = mine.filter(function (q) { return q.cab === b.cab && !q.leg && !q.worktop; }); if (!own.length) return; var e3 = boundsOf(own);
    var q = P((e3[0][0] + e3[0][1]) / 2, e3[2][1] - Math.min(70, (e3[2][1] - e3[2][0]) * 0.18)); svg += balloon(q, b.cab + 1, 3); });
  /* list of the cabinets on this wall */
  var rows = RM.placed(proj).filter(function (o) { return o.it.wall === wi; }).sort(function (p, q) { return p.it.x - q.it.x; }).map(function (o) {
    return [String(o.i + 1), o.c.name || '', kindOf(o.c, RM), nm(RM.cabW(o.c)) + ' × ' + nm(RM.cabH(o.c)) + ' × ' + nm(RM.cabD(o.c)), nm(o.it.x) + ' mm']; });
  svg += fitTables(FR + 6, SH - FR - TB.h, SW - 2 * FR - TB.w - 12, TB.h, [{ w:10, label:'Nr' }, { w:44, label:L.name }, { w:28, label:L.type }, { w:38, label:'W × H × D' }, { w:30, label:L.fromS }], rows);
  svg += titleBlock(Object.assign({}, meta, { title:L.elev + ' ' + 'ABCDEFGH'.charAt(wi), scale:sc.label }));
  return svg + '</svg>';
}
function sheetAllFronts(proj, infos, RM, meta) {   // nothing placed: every cabinet's front in a row
  var svg = sheetOpen(), items = proj.cabinets.map(function (c, i) { var inf = infos[i]; if (!inf || !inf.r || !inf.r.panels.length) return null; var bx = cabBoxes(inf.r, {}); return { i:i, c:c, r:inf.r, bx:bx, b:boundsOf(bx) }; }).filter(Boolean);
  var gapM = 150, totW = items.reduce(function (a, it) { return a + (it.b[0][1] - it.b[0][0]) + gapM; }, -gapM), maxH = Math.max.apply(null, items.map(function (it) { return it.b[2][1] - Math.min(0, it.b[2][0]); }));
  var sc = pickScale([totW, maxH], [SW - 2 * FR - 30, 150]), s = sc.s, x = FR + 15 + (SW - 2 * FR - 30 - totW * s) / 2, yF = FR + 30 + maxH * s;
  svg += viewTitle(FR + 6, FR + 9, L.allFronts, sc.label) + line([FR + 8, yF], [SW - FR - 8, yF], 0.4);
  items.forEach(function (it) { var V = viewOrtho('front'), o = solve(it.bx, V), zMin = Math.min(0, it.b[2][0]), m = M(s, x - it.b[0][0] * s, yF + zMin * s);
    svg += drawBoxes(o, m, { lw:0.28 }) + frontMarks(o, m, V, { sizes:false });
    svg += dim(m([it.b[0][0], zMin]), m([it.b[0][1], zMin]), [0, 1], 6, nm(it.b[0][1] - it.b[0][0]), { size:2.2 }) + dim(m([it.b[0][1], zMin]), m([it.b[0][1], it.b[2][1]]), [1, 0], 4, nm(it.b[2][1] - zMin), { size:2.2 });
    svg += balloon(m([(it.b[0][0] + it.b[0][1]) / 2, it.b[2][1] + 120]), it.i + 1, 3);
    x += (it.b[0][1] - it.b[0][0] + gapM) * s; });
  svg += txt(FR + 6, yF + 24, L.noLayout, 2.3, { fill:'#6b736e' });
  var rows = proj.cabinets.map(function (c, i) { var inf = infos[i]; return [String(i + 1), c.name || '', kindOf(c, RM), nm(RM.cabW(c)) + ' × ' + nm(RM.cabH(c)) + ' × ' + nm(RM.cabD(c)), String(inf && inf.r ? inf.r.panels.length : 0)]; });
  var yL = yF + 32;
  svg += txt(FR + 6, yL - 2, L.list, 3, { bold:true }) + fitTables(FR + 6, yL, SW - 2 * FR - TB.w - 12, SH - FR - 6 - yL, [{ w:10, label:'Nr' }, { w:50, label:L.name }, { w:32, label:L.type }, { w:42, label:'W × H × D' }, { w:18, label:L.nParts, align:'end' }], rows);
  svg += titleBlock(Object.assign({}, meta, { title:L.allFronts, scale:sc.label }));
  return svg + '</svg>';
}

/* ---------------------------------------------------------------- the set */
/* opts: { lang, project, date, paper, only: cabinet index or null, RM } → [{ id, title, svg }] */
function sheets(proj, infos, opts) {
  opts = opts || {}; setLang(opts.lang); WT_PIECES = opts.worktops || null; var RM = opts.RM || root.DBRoom, list = [];
  var meta = { project:opts.project || proj.name || '', date:opts.date || '', paper:opts.paper || 'A3' };
  var only = opts.only == null ? null : +opts.only;
  if (only == null && RM) {
    var hasLayout = proj.layout && RM.placed(proj).length > 0;
    if (hasLayout) {
      list.push({ id:'layout', title:L.layout, make:function (m) { return sheetLayout(proj, infos, RM, m); } });
      RM.geo(proj.layout).forEach(function (g, wi) { if (RM.placed(proj).some(function (o) { return o.it.wall === wi; })) list.push({ id:'wall' + wi, title:L.elev + ' ' + 'ABCDEFGH'.charAt(wi), make:function (m) { return sheetWall(proj, infos, RM, wi, m); } }); });
    } else if (proj.cabinets.length > 1) list.push({ id:'all', title:L.allFronts, make:function (m) { return sheetAllFronts(proj, infos, RM, m); } });
  }
  proj.cabinets.forEach(function (c, i) {
    if (only != null && only !== i) return; var inf = infos[i]; if (!inf || !inf.r || !inf.r.panels || !inf.r.panels.length || c.kind === 'panel') return;
    var nm2 = (i + 1) + (c.name ? ' „' + c.name + '“' : ''), plan = cabPlan(c, inf.r);
    list.push({ id:'c' + i, cab:i, title:L.cab + ' ' + nm2, make:function (m) { return sheetCabinet(c, inf.r, i + 1, m, plan); } });
    if (!plan.hw) list.push({ id:'c' + i + 'b', cab:i, cont:true, title:L.cab + ' ' + nm2 + ' — ' + L.cont, make:function (m) { return sheetCabList(c, inf.r, i + 1, m, plan.restRows, plan.restFrom, false); } });
  });
  return list.map(function (sh, k) { var svg; try { svg = sh.make(Object.assign({}, meta, { no:k + 1, of:list.length })); } catch (e) { svg = sheetOpen() + txt(30, 40, 'Error: ' + (e && e.message), 5) + '</svg>'; sh.error = String(e && e.stack || e); }
    return { id:sh.id, cab:sh.cab, cont:!!sh.cont, title:sh.title, svg:svg, error:sh.error }; });
}

/* ---------------------------------------------------------------- PDF (one picture per page) */
function rasterize(svg, w, h) {
  return new Promise(function (res, rej) {
    var s2 = svg.replace(/width="420mm" height="297mm"/, 'width="' + w + '" height="' + h + '"'), img = new Image();
    img.onload = function () { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h); res(cv); };
    img.onerror = function () { rej(new Error('svg')); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s2);
  });
}
function deflate(u8) {
  var cs = new CompressionStream('deflate'), wr = cs.writable.getWriter(); wr.write(u8); wr.close();
  return new Response(cs.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
}
function pageImage(cv) {
  if (typeof CompressionStream === 'function') {
    var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, rgb = new Uint8Array(cv.width * cv.height * 3);
    for (var i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
    return deflate(rgb).then(function (z) { return { w:cv.width, h:cv.height, filter:'FlateDecode', data:z }; });
  }
  var b64 = cv.toDataURL('image/jpeg', 0.93).split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return Promise.resolve({ w:cv.width, h:cv.height, filter:'DCTDecode', data:u });
}
function pdfBytes(pages, paper, title) {
  var pw = paper === 'A4' ? 841.89 : 1190.55, ph = paper === 'A4' ? 595.28 : 841.89, enc = new TextEncoder(), chunks = [], len = 0, offs = [];
  var put = function (x) { var u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); len += u.length; };
  var obj = function (n, body, stream) { offs[n] = len; put(n + ' 0 obj\n' + body + (stream ? '\nstream\n' : '\nendobj\n')); if (stream) { put(stream); put('\nendstream\nendobj\n'); } };
  put('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  var n = pages.length, kids = []; for (var i = 0; i < n; i++) kids.push((4 + i * 3) + ' 0 R');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>');
  var ttl = String(title || '').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '');
  obj(3, '<< /Title (' + ttl + ') /Producer (Dedes Baldai cabinet creator) >>');
  pages.forEach(function (pg, i) {
    var a = 4 + i * 3, cs = 'q ' + pw.toFixed(2) + ' 0 0 ' + ph.toFixed(2) + ' 0 0 cm /Im0 Do Q';
    obj(a, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw.toFixed(2) + ' ' + ph.toFixed(2) + '] /Resources << /XObject << /Im0 ' + (a + 2) + ' 0 R >> >> /Contents ' + (a + 1) + ' 0 R >>');
    obj(a + 1, '<< /Length ' + cs.length + ' >>', enc.encode(cs));
    obj(a + 2, '<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /' + pg.filter + ' /Length ' + pg.data.length + ' >>', pg.data);
  });
  var total = 4 + n * 3, xref = len, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (var k = 1; k < total; k++) x += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
  put(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  var out = new Uint8Array(len), p = 0; chunks.forEach(function (c) { out.set(c, p); p += c.length; }); return out;
}
/* sheets → PDF bytes. px: picture width in pixels (≈ 170 dpi on A3) */
function pdf(list, o) {
  o = o || {}; var px = o.px || 2800, py = Math.round(px * SH / SW), pages = [], i = 0;
  var next = function () {
    if (i >= list.length) return Promise.resolve(pdfBytes(pages, o.paper || 'A3', o.title));
    var sh = list[i++]; if (o.progress) o.progress(i, list.length);
    return rasterize(sh.svg, px, py).then(pageImage).then(function (pg) { pages.push(pg); return next(); });
  };
  return next();
}

var api = { iconSvg:iconSvg, hwKind:hwKind, hwText:hwText, unitText:unitText, cabPlan:cabPlan, cabLists:cabLists, groupName:groupName, fittingBoxes:fittingBoxes, overlap2:overlap2, sheets:sheets, sheetViews:sheetViews, sheetAssembly:sheetAssembly, pdf:pdf, pdfBytes:pdfBytes, solve:solve, viewIso:viewIso, viewOrtho:viewOrtho, cabBoxes:cabBoxes, pbox:pbox, explode:explode, partOrder:partOrder, TX:TX };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DBDraw = api;
})(typeof window !== 'undefined' ? window : this);
