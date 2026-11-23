
/* =====================================================================
   room.js — all the furniture in one view (Baldai tab).
   Walls form a chain turning clockwise (seen from above): wall A runs to
   the right, B down, C left, D up; cabinets stand against a wall with
   their back on it. Model, kept in the project:
     proj.layout = { walls:[{len}], wallZ, roomH, worktop, items:{ cabId:{ wall, x, z } } }
   wall = -1 → taken off the walls (listed as not placed). x = mm from the
   wall start (left end when facing the wall), z = bottom of a wall
   cabinet (empty → wallZ). Views: plan (top), front of every wall side by
   side, 3D. Plan and front take drag & drop; new cabinets are dragged in
   from the palette.
   ===================================================================== */
(function (root) {
"use strict";
var V = { view:'front', wall:-1, th:0.55, ph:0.5, sideFit:{} };   // view state survives re-renders (sideFit: the height chosen for new side panels, per cabinet id)
var C = null, D = null, RO = null;
var GAP = 500;                                       // mm between walls in the front view

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function T(k) { return C && C.o.t ? C.o.t(k) : k; }
function r1(v) { return Math.round(v * 10) / 10; }
function fm(v) { v = r1(v); return String(v); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
var LETTER = 'ABCDEFGH';

/* ---------------------------------------------------------------- model */
function cabW(c) { return +(c.dishwasher ? c.dishWidth : c.W) || 600; }
function cabD(c) { return +c.D || 560; }
function cabH(c) { return +c.H || 720; }
function level(c) {   // hanging on the wall (set in Baldai), tall (higher than 1000 mm) or a base cabinet
  if (c.dishwasher) return 'base';
  var hang = c.hang != null ? !!c.hang : c.type === 'PAKABINAMOS';
  return hang ? 'wall' : (+c.H > 1000 || (c.hang == null && c.type === 'ŪKINĖ')) ? 'tall' : 'base';
}
function legH(c) { return window.DBEngine && window.DBEngine.legHeight ? window.DBEngine.legHeight(c) : (c.cnc && c.cnc.legs ? (+c.legH || 0) : 0); }
function wtOf(c) { var E = typeof window !== 'undefined' && window.DBEngine; return E && E.worktopOf ? E.worktopOf(c) : null; }   // the cabinet's own worktop, or null
function z0Of(c, it, L) { if (level(c) === 'wall') return it && it.z !== '' && it.z != null && isFinite(+it.z) ? +it.z : +L.wallZ || 1450; return legH(c); }
function frontT(c) { if (c.kind === 'panel') return 0; if (c.kind === 'box') return ((c.box && c.box.fronts) || []).some(function (f) { return f && !f.inset; }) ? (+(c.cnc && c.cnc.facadeT) || 18) : 0; return +(c.cnc && c.cnc.facadeT) || 18; }
function cabDF(c) { return cabD(c) + frontT(c); }   // depth from the wall to the front face of the fronts
/* side panels (extras of kind 'side', from the engine): they stand beside the carcass, so the cabinet takes their thickness on the wall too */
function sideP(c) { var E = typeof window !== 'undefined' && window.DBEngine; return E && E.sidePanels ? E.sidePanels(c) : []; }
function sideW(c) { var E = typeof window !== 'undefined' && window.DBEngine; return E && E.sideWidths ? E.sideWidths(c) : { L:0, R:0 }; }
function fx0(c, x) { return x - sideW(c).L; }                  // the footprint along the wall: carcass and side panels
function fx1(c, x) { return x + cabW(c) + sideW(c).R; }
function depthF(c) { var d = cabDF(c); sideP(c).forEach(function (p) { d = Math.max(d, cabD(c) - p.y0); }); return d; }   // from the wall to the front-most face
/* a side panel's height from a choice: as the cabinet, down to the floor, floor to ceiling (z from the carcass bottom) */
function sideFit(c, it, L, fit) { var z0 = z0Of(c, it || {}, L), h = cabH(c), H = +L.roomH > 0 ? +L.roomH : 2600;
  return fit === 'room' ? { zb:-z0, L:Math.max(H, z0 + h) } : fit === 'floor' ? { zb:-z0, L:z0 + h } : { zb:0, L:h }; }
function sideFitDefault(c, it, L) { var lv = level(c), z0 = z0Of(c, it || {}, L), H = +L.roomH > 0 ? +L.roomH : 2600;
  if (lv === 'wall') return z0 + cabH(c) >= H - 60 ? 'room' : 'cab';   // a wardrobe hung up to the ceiling: floor to ceiling; a kitchen wall cabinet: its own height
  return 'floor'; }
/* panels set "as the cabinet / to the floor / to the ceiling" follow the room and the cabinet's place */
function refit(proj) {
  var L = proj.layout, ch = false;
  proj.cabinets.forEach(function (c) { var it = L.items[c.id]; if (!it || it.wall < 0) return;
    (c.extras || []).forEach(function (x) { if (!x || x.kind !== 'side' || !x.fit || (x.side !== 'L' && x.side !== 'R')) return;
      var f = sideFit(c, it, L, x.fit); if (Math.abs((+x.L || 0) - f.L) > 0.05 || Math.abs((+x.zb || 0) - f.zb) > 0.05) { x.L = r1(f.L); x.zb = r1(f.zb); ch = true; } }); });
  return ch;
}
function vRange(c, it, L) { var z0 = z0Of(c, it, L); return level(c) === 'wall' ? [z0, z0 + cabH(c)] : [0, z0 + cabH(c)]; }
function defLayout() { return { walls:[{ len:3600 }], wallZ:1450, roomH:2600, worktop:true, items:{} }; }
function geo(L) {   // wall start points, direction along the wall, normal into the room (plan coords: x right, y down)
  var out = [], P = [0, 0], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  L.walls.forEach(function (w, i) { var d = dirs[i % 4]; out.push({ P:P.slice(), d:d, n:[-d[1], d[0]], len:+w.len || 0 }); P = [P[0] + d[0] * (+w.len || 0), P[1] + d[1] * (+w.len || 0)]; });
  return out;
}
function placed(proj) { var L = proj.layout; return proj.cabinets.map(function (c, i) { return { c:c, i:i, it:L.items[c.id] }; }).filter(function (x) { return x.it && x.it.wall >= 0 && x.it.wall < L.walls.length; }); }
function vOverlap(a, b) { return Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 1; }
/* ---------------------------------------------------------------- doors and windows in the walls: layout.openings
   { id, type:'door' (wooden) | 'gdoor' (with glass) | 'window', wall, x: where the hole starts along the wall, w, h: the hole,
     z: its bottom (a window's sill height; doors 0), hinge:'L'|'R' as seen from the room, swing:'in' (into the room) | 'out', color }
   A door is drawn with its casing on the room side (OP_CAS round the hole), a window with its sill. */
var OP_T = ['door', 'gdoor', 'window'], OP_CAS = 70, OP_JAMB = 30;
var OP_DEF = { door:{ w:880, h:2070, z:0, color:'#b08458' }, gdoor:{ w:880, h:2070, z:0, color:'#f1eee6' }, window:{ w:1200, h:1400, z:900, color:'#f4f4f1' } };
function opsOf(L) { return L && Array.isArray(L.openings) ? L.openings : []; }
function isDoor(op) { return op.type !== 'window'; }
/* the casing over a door: OP_CAS, or what is left up to the ceiling (none when the door reaches it) */
function opCasTop(op, L) { if (!isDoor(op)) return 0; var rh = L ? (+L.roomH > 0 ? +L.roomH : 2600) : Infinity; return Math.max(0, Math.min(OP_CAS, rh - op.h)); }
function opRange(op, L) {   // what it takes on the wall: [a, b] along it, [z0, z1] up — a cabinet there stands in front of it
  return isDoor(op) ? { a:op.x - OP_CAS, b:op.x + op.w + OP_CAS, z0:0, z1:op.h + opCasTop(op, L) } : { a:op.x, b:op.x + op.w, z0:op.z, z1:op.z + op.h }; }
function opName(L, op) { var n = 0, k = 0; opsOf(L).forEach(function (o) { if ((o.type === 'window') === (op.type === 'window')) { n++; if (o.id === op.id) k = n; } }); return T(op.type === 'window' ? 'opWinN' : 'opDoorN').replace('{n}', k || n + 1); }
function newOp(type) { var d = OP_DEF[type] || OP_DEF.door; return { id:'o' + Math.random().toString(36).slice(2, 9), type:OP_DEF[type] ? type : 'door', wall:0, x:0, w:d.w, h:d.h, z:d.z, hinge:'L', swing:'in', color:d.color }; }
function normOps(L) {   // keeps only sound openings on existing walls, with numbers where numbers belong
  var n = function (v, d) { v = +v; return isFinite(v) ? v : d; }, out = [], seen = {};
  opsOf(L).forEach(function (o) { if (!o || typeof o !== 'object') return; var t = OP_DEF[o.type] ? o.type : 'door', d = OP_DEF[t], w = +o.wall;
    if (!(w >= 0 && w < L.walls.length) || Math.floor(w) !== w) return;
    var id = typeof o.id === 'string' && o.id && !seen[o.id] ? o.id : newOp(t).id; seen[id] = 1;
    out.push({ id:id, type:t, wall:w, x:n(o.x, 0), w:Math.max(200, n(o.w, d.w)), h:Math.max(200, n(o.h, d.h)), z:t === 'window' ? Math.max(0, n(o.z, d.z)) : 0, hinge:o.hinge === 'R' ? 'R' : 'L', swing:o.swing === 'out' ? 'out' : 'in', color:/^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color : d.color }); });
  var ch = JSON.stringify(out) !== JSON.stringify(opsOf(L)); L.openings = out; return ch;
}
/* ---------------------------------------------------------------- sockets and water pipes on the walls: layout.points
   { id, type:'socket' | 'socket2' (double) | 'cold' | 'hot' (water) | 'drain', wall, x: its middle along the wall, z: its middle above the floor } */
var PT_T = ['socket', 'socket2', 'cold', 'hot', 'drain'];
var PT_DEF = { socket:{ z:1100, w:80, h:80 }, socket2:{ z:1100, w:152, h:80 }, cold:{ z:550, w:40, h:40 }, hot:{ z:550, w:40, h:40 }, drain:{ z:450, w:60, h:60 } };
function ptsOf(L) { return L && Array.isArray(L.points) ? L.points : []; }
function ptBox(pt) { var d = PT_DEF[pt.type] || PT_DEF.socket; return { a:pt.x - d.w / 2, b:pt.x + d.w / 2, z0:pt.z - d.h / 2, z1:pt.z + d.h / 2 }; }
function ptLabelKey(t) { return { socket:'ptSocket', socket2:'ptSocket2', cold:'ptCold', hot:'ptHot', drain:'ptDrain' }[t] || 'ptSocket'; }
function ptName(L, pt) { var n = 0, k = 0; ptsOf(L).forEach(function (o) { if (o.type === pt.type) { n++; if (o.id === pt.id) k = n; } }); return T(ptLabelKey(pt.type)) + ' ' + (k || n + 1); }
function newPt(type) { var d = PT_DEF[type] ? type : 'socket'; return { id:'p' + Math.random().toString(36).slice(2, 9), type:d, wall:0, x:0, z:PT_DEF[d].z }; }
function normPts(L) {
  var out = [], seen = {};
  ptsOf(L).forEach(function (o) { if (!o || typeof o !== 'object') return; var t = PT_DEF[o.type] ? o.type : 'socket', w = +o.wall; if (!(w >= 0 && w < L.walls.length) || Math.floor(w) !== w) return;
    var id = typeof o.id === 'string' && o.id && !seen[o.id] ? o.id : newPt(t).id; seen[id] = 1;
    out.push({ id:id, type:t, wall:w, x:isFinite(+o.x) ? +o.x : 0, z:isFinite(+o.z) ? +o.z : PT_DEF[t].z }); });
  var ch = JSON.stringify(out) !== JSON.stringify(ptsOf(L)); L.points = out; return ch;
}
/* its parts in the wall's coordinates (as opParts): a socket's plate, a water pipe with its valve, the drain's pipe end */
function ptParts(pt) {
  var x = pt.x, z = pt.z, P = [], add = function (x0, x1, y0, y1, z0, z1, kind, color) { P.push({ e:[x0, x1, y0, y1, z0, z1], kind:kind, color:color }); };
  if (pt.type === 'socket' || pt.type === 'socket2') { var d = PT_DEF[pt.type]; add(x - d.w / 2, x + d.w / 2, -10, 0, z - d.h / 2, z + d.h / 2, 'plate', '#f6f6f3');
    (pt.type === 'socket2' ? [x - 36, x + 36] : [x]).forEach(function (cx) { add(cx - 22, cx + 22, -13, -10, z - 22, z + 22, 'plate', '#ecebe6'); }); }
  else if (pt.type === 'drain') add(x - 25, x + 25, -60, 0, z - 25, z + 25, 'drain', '#9aa09c');
  else { add(x - 9, x + 9, -55, 0, z - 9, z + 9, 'pipe', '#b8bbbd'); add(x - 16, x + 16, -75, -55, z - 16, z + 16, 'pipe', '#c9cbcd'); add(x - 6, x + 6, -95, -75, z - 30, z + 4, 'cap', pt.type === 'hot' ? '#c9442e' : '#2f6fc4'); }
  return P;
}
/* the wall round its openings: pieces [x0, x1, z0, z1] along the wall from a to b and up to H (a window's hole starts under its sill) */
function wallPieces(L, wi, a, b, H) {
  var holes = opsOf(L).filter(function (o) { return o.wall === wi; }).map(function (o) { var z0 = isDoor(o) ? 0 : o.z - 25; return [Math.max(a, o.x), Math.min(b, o.x + o.w), Math.max(0, z0), Math.min(H, o.z + o.h)]; })
    .filter(function (h) { return h[1] - h[0] > 1 && h[3] - h[2] > 1; });
  var xs = [a, b]; holes.forEach(function (h) { xs.push(h[0], h[1]); });
  xs = xs.sort(function (p, q) { return p - q; }).filter(function (v, i, arr) { return i === 0 || v - arr[i - 1] > 0.5; });
  var out = [];
  for (var i = 0; i + 1 < xs.length; i++) {
    var x0 = xs[i], x1 = xs[i + 1], xm = (x0 + x1) / 2, z = 0;
    holes.filter(function (h) { return h[0] <= xm && h[1] >= xm; }).sort(function (p, q) { return p[2] - q[2]; }).forEach(function (h) { if (h[2] > z + 0.5) out.push([x0, x1, z, h[2]]); z = Math.max(z, h[3]); });
    if (H > z + 0.5) out.push([x0, x1, z, H]);
  }
  var merged = []; out.forEach(function (p) { var m = merged.filter(function (q) { return Math.abs(q[1] - p[0]) < 0.5 && Math.abs(q[2] - p[2]) < 0.5 && Math.abs(q[3] - p[3]) < 0.5; })[0]; if (m) m[1] = p[1]; else merged.push(p.slice()); });
  return merged;
}
/* a door's or a window's parts in the wall's coordinates: x along it, y into the wall from its room side (−y: into the room), z up; t: wall thickness
   → [{ e:[x0, x1, y0, y1, z0, z1], kind:'frame'|'leaf'|'glass'|'sill'|'metal', color }] */
function opParts(op, t, L) {
  var P = [], col = op.color, add = function (x0, x1, y0, y1, z0, z1, kind, color) { if (x1 - x0 > 0.5 && y1 - y0 > 0.5 && z1 - z0 > 0.5) P.push({ e:[x0, x1, y0, y1, z0, z1], kind:kind, color:color || col }); };
  var x0 = op.x, x1 = op.x + op.w, z0 = isDoor(op) ? 0 : op.z, z1 = z0 + op.h, metal = '#8e918d', glass = '#cfe2ea';
  if (isDoor(op)) {
    var j = OP_JAMB, c = OP_CAS, ct = opCasTop(op, L), frame = op.type === 'gdoor' ? col : col;
    add(x0 - c, x0, -15, 0, 0, z1 + ct, 'frame', frame); add(x1, x1 + c, -15, 0, 0, z1 + ct, 'frame', frame); add(x0 - c, x1 + c, -15, 0, z1, z1 + ct, 'frame', frame);   // casing on the room side (none over a door up to the ceiling)
    add(x0, x0 + j, 0, t, 0, z1, 'frame', frame); add(x1 - j, x1, 0, t, 0, z1, 'frame', frame); add(x0 + j, x1 - j, 0, t, z1 - j, z1, 'frame', frame);   // lining in the hole
    var lx0 = x0 + j + 2, lx1 = x1 - j - 2, lz0 = 8, lz1 = z1 - j - 2, ly0 = 4, ly1 = Math.max(ly0 + 20, Math.min(t - 4, 44));
    if (op.type === 'gdoor') {   // a leaf with a tall glass panel
      var m = Math.max(90, Math.min(140, (lx1 - lx0) * 0.18)), gz0 = lz0 + Math.min(300, (lz1 - lz0) * 0.15), gz1 = lz1 - Math.min(260, (lz1 - lz0) * 0.13), gm = (ly0 + ly1) / 2;
      add(lx0, lx0 + m, ly0, ly1, lz0, lz1, 'leaf'); add(lx1 - m, lx1, ly0, ly1, lz0, lz1, 'leaf'); add(lx0 + m, lx1 - m, ly0, ly1, lz0, gz0, 'leaf'); add(lx0 + m, lx1 - m, ly0, ly1, gz1, lz1, 'leaf');
      add(lx0 + m, lx1 - m, gm - 3, gm + 3, gz0, gz1, 'glass', glass);
    } else add(lx0, lx1, ly0, ly1, lz0, lz1, 'leaf');
    var hx = op.hinge === 'R' ? lx0 + 65 : lx1 - 65, dir = op.hinge === 'R' ? 1 : -1, hz = Math.min(1000, lz1 - 200);   // the handle: away from the hinges, the lever towards them
    add(hx - 22, hx + 22, ly0 - 8, ly0, hz - 70, hz + 70, 'metal', metal); add(hx - 9, hx + 9, ly0 - 55, ly0 - 8, hz - 9, hz + 9, 'metal', metal);
    add(Math.min(hx, hx + dir * 130), Math.max(hx, hx + dir * 130), ly0 - 55, ly0 - 37, hz - 9, hz + 9, 'metal', metal);
  } else {
    var f = 65, fd = Math.min(70, Math.max(30, t - 10)), fy0 = Math.max(0, t * 0.45 - fd / 2), fy1 = fy0 + fd;   // the frame, in the middle of the wall
    add(x0, x0 + f, fy0, fy1, z0, z1, 'frame'); add(x1 - f, x1, fy0, fy1, z0, z1, 'frame'); add(x0 + f, x1 - f, fy0, fy1, z0, z0 + f, 'frame'); add(x0 + f, x1 - f, fy0, fy1, z1 - f, z1, 'frame');
    var panes = [[x0 + f, x1 - f]], xm = (x0 + x1) / 2;
    if (op.w > 1000) { add(xm - 40, xm + 40, fy0, fy1, z0 + f, z1 - f, 'frame'); panes = [[x0 + f, xm - 40], [xm + 40, x1 - f]]; }
    panes.forEach(function (q, k) {   // a sash round each pane, a little in front of the frame, the glass in it and a handle
      var s = Math.min(55, (q[1] - q[0]) / 4), sy0 = fy0 - 6, sy1 = fy0 + Math.min(50, fd - 10), qz0 = z0 + f, qz1 = z1 - f;
      add(q[0], q[0] + s, sy0, sy1, qz0, qz1, 'frame'); add(q[1] - s, q[1], sy0, sy1, qz0, qz1, 'frame'); add(q[0] + s, q[1] - s, sy0, sy1, qz0, qz0 + s, 'frame'); add(q[0] + s, q[1] - s, sy0, sy1, qz1 - s, qz1, 'frame');
      var gy = (sy0 + sy1) / 2; add(q[0] + s, q[1] - s, gy - 3, gy + 3, qz0 + s, qz1 - s, 'glass', glass);
      var hx = panes.length > 1 ? (k === 0 ? q[1] - s / 2 : q[0] + s / 2) : q[1] - s / 2, hz = (qz0 + qz1) / 2;
      add(hx - 9, hx + 9, sy0 - 14, sy0, hz - 60, hz + 60, 'metal', metal);
    });
    add(x0 - 30, x1 + 30, -45, fy0, z0 - 25, z0, 'sill', '#f6f5f1');   // the sill inside, the drip outside
    add(x0 - 20, x1 + 20, fy1, t + 35, z0 - 25, z0 - 8, 'sill', '#b9bcb8');
  }
  return P;
}

/* free space for a cabinet of width w at level of c on wall wi: ends of what stands there, corners included */
function closedRoom(L) {   // four walls that meet again where wall A starts: wall D and wall A share a corner too
  var G = geo(L); if (G.length < 4) return false; var lg = G[G.length - 1], e = [lg.P[0] + lg.d[0] * lg.len, lg.P[1] + lg.d[1] * lg.len];
  return Math.abs(e[0] - G[0].P[0]) < 1 && Math.abs(e[1] - G[0].P[1]) < 1;
}
function prevWall(L, wi) { return wi > 0 ? wi - 1 : closedRoom(L) ? L.walls.length - 1 : -1; }
function nextWall(L, wi) { return wi < L.walls.length - 1 ? wi + 1 : closedRoom(L) ? 0 : -1; }
function cornerIn(proj, wi, c, exceptId) {   // depth taken at the start of wall wi by the previous wall's cabinet in the corner
  var L = proj.layout, G = geo(L), pw = prevWall(L, wi); if (pw < 0) return 0;
  var vr = vRange(c, L.items[c.id] || {}, L), dep = 0;
  placed(proj).forEach(function (o) { if (o.c.id === exceptId || o.it.wall !== pw) return;
    if (fx1(o.c, o.it.x) >= G[pw].len - depthF(c) - 1 && vOverlap(vr, vRange(o.c, o.it, L))) dep = Math.max(dep, depthF(o.c)); });
  return dep;
}
function cornerOut(proj, wi, c, exceptId) {  // depth taken at the end of wall wi by the next wall's cabinet in the corner
  var L = proj.layout, nw = nextWall(L, wi); if (nw < 0) return 0;
  var vr = vRange(c, L.items[c.id] || {}, L), dep = 0;
  placed(proj).forEach(function (o) { if (o.c.id === exceptId || o.it.wall !== nw) return;
    if (fx0(o.c, o.it.x) <= depthF(c) + 1 && vOverlap(vr, vRange(o.c, o.it, L))) dep = Math.max(dep, depthF(o.c)); });
  return dep;
}
function neighbours(proj, c, wi) {   // what stands on wall wi at c's height, except c
  var L = proj.layout, vr = vRange(c, L.items[c.id] || {}, L);
  return placed(proj).filter(function (o) { return o.c.id !== c.id && o.it.wall === wi && vOverlap(vr, vRange(o.c, o.it, L)); });
}
function snapCands(proj, c, wi) {
  var L = proj.layout, G = geo(L), w = cabW(c), sw = sideW(c), len = G[wi].len, out = [[sw.L, 'wall'], [len - w - sw.R, 'wall']];   // positions of the carcass; its side panels touch
  var ci = cornerIn(proj, wi, c, c.id), co = cornerOut(proj, wi, c, c.id);
  if (ci) out.push([ci + sw.L, 'corner']); if (co) out.push([len - co - w - sw.R, 'corner']);
  neighbours(proj, c, wi).forEach(function (o) { out.push([fx0(o.c, o.it.x) - w - sw.R, 'nb']); out.push([fx1(o.c, o.it.x) + sw.L, 'nb']); });
  var vr = vRange(c, L.items[c.id] || {}, L);
  opsOf(L).forEach(function (op) { if (op.wall !== wi) return; var r = opRange(op, L); if (!vOverlap(vr, [r.z0, r.z1])) return; out.push([r.a - w - sw.R, 'op']); out.push([r.b + sw.L, 'op']); });   // beside a door or a window
  return out;
}
function snap(proj, c, wi, x, thr) {
  var best = null; snapCands(proj, c, wi).forEach(function (s) { var d = Math.abs(s[0] - x); if (d <= thr && (!best || d < best.d)) best = { x:s[0], d:d, why:s[1] }; });
  return best ? { x:r1(best.x), why:best.why } : { x:Math.round(x / 5) * 5, why:'' };
}
function gapAround(proj, c) {   // the free stretch c stands in (for "fill the gap")
  var L = proj.layout, it = L.items[c.id]; if (!it || it.wall < 0) return null;
  var G = geo(L), len = G[it.wall].len, a = Math.max(0, cornerIn(proj, it.wall, c, c.id)), b = len - cornerOut(proj, it.wall, c, c.id);
  var mid = it.x + cabW(c) / 2, sw = sideW(c);
  neighbours(proj, c, it.wall).forEach(function (o) { var x0 = fx0(o.c, o.it.x), x1 = fx1(o.c, o.it.x);
    if (x1 <= mid + 0.5) a = Math.max(a, x1); else if (x0 >= mid - 0.5) b = Math.min(b, x0); });
  return { x0:r1(a), x1:r1(b), w:r1(b - a), cx:r1(a + sw.L), cw:r1(b - a - sw.L - sw.R) };   // cx, cw: the carcass that fills it, its side panels included
}
function planRect(c, it, G) {
  var g = G[it.wall], w = cabW(c), d = cabDF(c), p = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; };
  var pts = [p(it.x, 0), p(it.x + w, 0), p(it.x + w, d), p(it.x, d)];
  var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
  return { pts:pts, x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys) };
}
/* the side panels in plan, with their height range */
function sideRects(c, it, G, L) {
  var g = G[it.wall], z0 = z0Of(c, it, L), D0 = cabD(c), p = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; };
  return sideP(c).map(function (q) { var pts = [p(it.x + q.x0, D0 - q.y1), p(it.x + q.x1, D0 - q.y1), p(it.x + q.x1, D0 - q.y0), p(it.x + q.x0, D0 - q.y0)], xs = pts.map(function (v) { return v[0]; }), ys = pts.map(function (v) { return v[1]; });
    return { pts:pts, x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys), v:[z0 + q.z0, z0 + q.z1], q:q }; });
}
/* problems: cabinets in each other (plan + height), past a wall end */
function wtRect(c, it, G, L) {   // the cabinet's own worktop in plan and its height range, or null
  var wt = wtOf(c); if (!wt) return null; var g = G[it.wall], z = z0Of(c, it, L) + cabH(c), p = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; };
  var pts = [p(it.x + wt.x0, 0), p(it.x + wt.x1, 0), p(it.x + wt.x1, wt.W), p(it.x + wt.x0, wt.W)], xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
  return { x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys), v:[z, z + wt.T] };
}
function problems(proj) {
  var L = proj.layout, G = geo(L), ps = placed(proj), out = [], bad = {}, roomH = +L.roomH > 0 ? +L.roomH : 2600;
  var cross = function (a, b) { return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1; };
  ps.forEach(function (a, k) {
    if (fx0(a.c, a.it.x) < -0.5 || fx1(a.c, a.it.x) > G[a.it.wall].len + 0.5) { out.push({ kind:'out', a:a.i }); bad[a.c.id] = 1; }
    var ra = planRect(a.c, a.it, G), va = vRange(a.c, a.it, L), wa = wtRect(a.c, a.it, G, L), sa = sideRects(a.c, a.it, G, L);
    if (va[1] > roomH + 0.5 || (wa && wa.v[1] > roomH + 0.5) || sa.some(function (q) { return q.v[1] > roomH + 0.5; })) { out.push({ kind:'ceil', a:a.i }); bad[a.c.id] = 1; }
    if (va[0] < -0.5 || sa.some(function (q) { return q.v[0] < -0.5; })) { out.push({ kind:'floor', a:a.i }); bad[a.c.id] = 1; }
    for (var j = k + 1; j < ps.length; j++) {
      var b = ps[j], rb = planRect(b.c, b.it, G), vb = vRange(b.c, b.it, L), wb = wtRect(b.c, b.it, G, L), sb = sideRects(b.c, b.it, G, L);
      var hit = cross(ra, rb) && vOverlap(va, vb);
      if (!hit) hit = sa.some(function (q) { return (cross(q, rb) && vOverlap(q.v, vb)) || sb.some(function (q2) { return cross(q, q2) && vOverlap(q.v, q2.v); }); }) || sb.some(function (q) { return cross(q, ra) && vOverlap(q.v, va); });   // side panels
      if (!hit && wa && cross(wa, rb) && vOverlap(wa.v, vb)) hit = true;   // a's worktop runs into b
      if (!hit && wb && cross(wb, ra) && vOverlap(wb.v, va)) hit = true;
      if (!hit && wa && wb && a.it.wall === b.it.wall && cross(wa, wb) && vOverlap(wa.v, wb.v)) hit = true;   // side overhangs into each other (corners are cut in the parts list)
      if (hit) { out.push({ kind:'hit', a:a.i, b:b.i }); bad[a.c.id] = bad[b.c.id] = 1; }
    }
  });
  /* doors and windows: past the wall end or the ceiling, into each other, a cabinet in front of one or in a door's way */
  var OPS = opsOf(L), badOp = {};
  OPS.forEach(function (op, k) {
    var g = G[op.wall]; if (!g) return; var r = opRange(op, L), q = function (a2, b2) { return [g.P[0] + g.d[0] * a2 + g.n[0] * b2, g.P[1] + g.d[1] * a2 + g.n[1] * b2]; };
    var rect = function (a2, b2, d0, d1) { var pts = [q(a2, d0), q(b2, d0), q(b2, d1), q(a2, d1)], xs = pts.map(function (v) { return v[0]; }), ys = pts.map(function (v) { return v[1]; }); return { x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys) }; };
    if (r.a < -0.5 || r.b > g.len + 0.5) { out.push({ kind:'opout', op:op.id }); badOp[op.id] = 1; }
    if ((isDoor(op) ? op.h : op.z + op.h) > roomH + 0.5) { out.push({ kind:'opceil', op:op.id }); badOp[op.id] = 1; }
    for (var j = k + 1; j < OPS.length; j++) { var o2 = OPS[j], r2 = opRange(o2, L); if (o2.wall === op.wall && Math.min(r.b, r2.b) - Math.max(r.a, r2.a) > 1 && vOverlap([r.z0, r.z1], [r2.z0, r2.z1])) { out.push({ kind:'ophit', op:op.id, op2:o2.id }); badOp[op.id] = badOp[o2.id] = 1; } }
    var strip = rect(r.a, r.b, 0, 40), lw = op.w - 2 * OP_JAMB, sweep = isDoor(op) && op.swing !== 'out' ? rect(op.x + OP_JAMB, op.x + op.w - OP_JAMB, 0, lw) : null;   // just in front of it; the floor a door sweeps
    ps.forEach(function (a) { var ra = planRect(a.c, a.it, G), va = vRange(a.c, a.it, L), wa = wtRect(a.c, a.it, G, L), sa = sideRects(a.c, a.it, G, L), top = Math.max(va[1], wa ? wa.v[1] : -1);
      var inFront = (cross(ra, strip) && vOverlap([va[0], top], [r.z0, r.z1])) || sa.some(function (s2) { return cross(s2, strip) && vOverlap(s2.v, [r.z0, r.z1]); });
      if (inFront) { out.push({ kind:'opblock', op:op.id, a:a.i }); badOp[op.id] = 1; bad[a.c.id] = 1; return; }
      if (sweep && ((cross(ra, sweep) && vOverlap([va[0], top], [0, op.h])) || sa.some(function (s2) { return cross(s2, sweep) && vOverlap(s2.v, [0, op.h]); }))) { out.push({ kind:'opswing', op:op.id, a:a.i }); badOp[op.id] = 1; bad[a.c.id] = 1; }
    });
  });
  /* sockets and pipes: off the wall, in a door or window, behind a cabinet's side (or its side panel), in the worktop */
  var badPt = {};
  ptsOf(L).forEach(function (pt) {
    var g = G[pt.wall]; if (!g) return; var bx = ptBox(pt), zr = [bx.z0, bx.z1];
    if (bx.a < -0.5 || bx.b > g.len + 0.5 || bx.z0 < -0.5 || bx.z1 > roomH + 0.5) { out.push({ kind:'ptout', pt:pt.id }); badPt[pt.id] = 1; return; }
    OPS.forEach(function (op) { var r = opRange(op, L); if (op.wall === pt.wall && Math.min(r.b, bx.b) - Math.max(r.a, bx.a) > 0 && vOverlap([r.z0, r.z1], zr)) { out.push({ kind:'pthit', pt:pt.id, op:op.id }); badPt[pt.id] = 1; } });
    ps.forEach(function (a) {
      if (a.it.wall !== pt.wall || a.c.dishwasher || a.c.kind === 'box') return;
      var c = a.c, x0 = a.it.x, w = cabW(c), t = +c.thick || 18, va = vRange(c, a.it, L), wa = wtRect(c, a.it, G, L);
      var sides = c.kind === 'panel' ? [[fx0(c, x0), fx1(c, x0)]] : [[fx0(c, x0), x0 + t], [x0 + w - t, fx1(c, x0)]];
      if (vOverlap(va, zr) && sides.some(function (sd) { return Math.min(sd[1], bx.b) - Math.max(sd[0], bx.a) > 0; })) { out.push({ kind:'ptside', pt:pt.id, a:a.i }); badPt[pt.id] = 1; return; }
      if (wa && vOverlap(wa.v, zr) && Math.min(fx1(c, x0), bx.b) - Math.max(fx0(c, x0), bx.a) > 0) { out.push({ kind:'ptwt', pt:pt.id, a:a.i }); badPt[pt.id] = 1; }
    });
  });
  return { list:out, bad:bad, badOp:badOp, badPt:badPt };
}
/* first free place for a cabinet: after the last one at its height on the first wall with room, else at the end of wall A */
function autoSpot(proj, c) {
  var L = proj.layout, G = geo(L), w = cabW(c), sw = sideW(c);
  for (var wi = 0; wi < G.length; wi++) {
    var ends = neighbours(proj, c, wi).map(function (o) { return fx1(o.c, o.it.x); });
    var x = Math.max(cornerIn(proj, wi, c, c.id), ends.length ? Math.max.apply(null, ends) : 0) + sw.L;
    if (x + w + sw.R <= G[wi].len - cornerOut(proj, wi, c, c.id) + 0.5) return { wall:wi, x:r1(x) };
  }
  var e0 = neighbours(proj, c, 0).map(function (o) { return fx1(o.c, o.it.x); });
  return { wall:0, x:r1((e0.length ? Math.max.apply(null, e0) : 0) + sw.L) };
}
/* make sure the project has a layout and every cabinet a place (new ones go after the others) */
function ensure(proj) {
  var fresh = !proj.layout;
  if (fresh) proj.layout = defLayout();
  var L = proj.layout; L.walls = (L.walls && L.walls.length ? L.walls : [{ len:3600 }]).slice(0, 4); L.items = L.items || {};
  if (L.wallZ == null) L.wallZ = 1450; if (L.roomH == null) L.roomH = 2600; if (L.worktop == null) L.worktop = true;
  if (fresh && proj.cabinets.length) {   // one long wall that takes the floor cabinets in project order
    var run = proj.cabinets.filter(function (c) { return level(c) !== 'wall'; }).reduce(function (a, c) { return a + cabW(c); }, 0);
    L.walls[0].len = Math.max(2400, Math.ceil((run + 200) / 100) * 100);
  }
  var changed = fresh;
  proj.cabinets.forEach(function (c) { if (!L.items[c.id]) { L.items[c.id] = { wall:-1, x:0 }; var s = autoSpot(proj, c); L.items[c.id] = { wall:s.wall, x:s.x }; changed = true; } });
  Object.keys(L.items).forEach(function (id) { if (!proj.cabinets.some(function (c) { return c.id === id; })) { delete L.items[id]; changed = true; } });
  if (refit(proj)) changed = true;
  if (normOps(L)) changed = true;
  if (normPts(L)) changed = true;
  return changed;
}

/* ---------------------------------------------------------------- shared drawing bits */
function cabName(c, i) { var lv = level(c); return (i + 1) + ' · ' + (c.name || T(c.dishwasher ? 'pDish' : c.kind === 'panel' ? 'pPanel' : c.kind === 'box' ? 'pBox' : lv === 'wall' ? 'tWall' : lv === 'tall' ? 'tTall' : 'tBase')); }
function fronts(i) {   // fronts of cabinet i from the engine: rectangles in cabinet coords (x across, z up from carcass bottom)
  var inf = C.o.infos[i], out = [];
  if (!inf || !inf.r) return out;
  inf.r.panels.forEach(function (p) {
    if (!p.place || (p.role !== 'FASADAS' && p.role !== 'DURYS')) return;
    var q = p.place, pt = function (a, b) { return [q.o[0] + a * q.u[0] + b * q.v[0], q.o[2] + a * q.u[2] + b * q.v[2]]; };
    var cs = [pt(0, 0), pt(p.L, 0), pt(0, p.W), pt(p.L, p.W)], xs = cs.map(function (v) { return v[0]; }), zs = cs.map(function (v) { return v[1]; });
    out.push({ x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), z0:Math.min.apply(null, zs), z1:Math.max.apply(null, zs), door:p.role === 'DURYS' && !p.cargo, drawer:!!p.drawer, left:p.hingeLeft, sec:p.sec, box:!!p.boxFront });
  });
  return out;
}

/* ---------------------------------------------------------------- FRONT: every wall side by side (or one wall) */
function frontLayout() {
  var L = C.o.proj.layout, G = geo(L), ws = V.wall >= 0 && V.wall < G.length ? [V.wall] : G.map(function (g, i) { return i; });
  var off = {}, x = 0; ws.forEach(function (wi) { off[wi] = x; x += G[wi].len + GAP; });
  var roomH = +L.roomH > 0 ? +L.roomH : 2600, top = 0;   // the picture is as tall as the room, or as what stands higher than the ceiling
  placed(C.o.proj).forEach(function (o) { if (ws.indexOf(o.it.wall) < 0) return; var wt = wtOf(o.c); top = Math.max(top, z0Of(o.c, o.it, L) + cabH(o.c) + (wt && L.worktop ? wt.T : 0)); });
  var total = x - GAP, H = Math.max(roomH, top + 100, 1200), w = C.w, k = (w - 40) / Math.max(total, 1200);
  k = Math.min(k, (C.h - 110) / H);
  C.fr = { ws:ws, off:off, k:k, H:H, roomH:roomH, ox:(w - total * k) / 2, base:30 + H * k + 10 };
  C.h = Math.round(C.fr.base + 70);
  zApply(C.fr, 'base');
}
function fX(wi, x) { return C.fr.ox + (C.fr.off[wi] + x) * C.fr.k; }
function fY(z) { return C.fr.base - z * C.fr.k; }
function drawFront() {
  var proj = C.o.proj, L = proj.layout, G = geo(L), F = C.fr, k = F.k, s = '', prob = problems(proj);
  F.ws.forEach(function (wi) {
    var g = G[wi], x0 = fX(wi, 0), x1 = fX(wi, g.len);
    s += '<rect class="rm-wall" x="' + x0.toFixed(1) + '" y="' + fY(F.roomH).toFixed(1) + '" width="' + (x1 - x0).toFixed(1) + '" height="' + (F.roomH * k).toFixed(1) + '"/>';
    if (F.H > F.roomH + 1) s += '<line class="rm-floor" x1="' + (x0 - 6).toFixed(1) + '" y1="' + fY(F.roomH).toFixed(1) + '" x2="' + (x1 + 6).toFixed(1) + '" y2="' + fY(F.roomH).toFixed(1) + '" stroke-dasharray="4 3"/>';   // the ceiling
    s += '<line class="rm-floor" x1="' + (x0 - 6).toFixed(1) + '" y1="' + fY(0).toFixed(1) + '" x2="' + (x1 + 6).toFixed(1) + '" y2="' + fY(0).toFixed(1) + '"/>';
    s += '<text class="rm-wt" x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (fY(F.H) - 8).toFixed(1) + '" text-anchor="middle">' + esc(T('rmWall')) + ' ' + LETTER[wi] + ' · ' + fm(g.len) + '</text>';
    // corners taken by the neighbouring walls' cabinets: hatched
    [[0, wi > 0], [g.len, wi < G.length - 1]].forEach(function (cn) { if (cn[1]) s += '<line class="rm-corner" x1="' + fX(wi, cn[0]).toFixed(1) + '" y1="' + fY(0).toFixed(1) + '" x2="' + fX(wi, cn[0]).toFixed(1) + '" y2="' + fY(F.H).toFixed(1) + '"/>'; });
  });
  // doors and windows in the walls
  opsShown().forEach(function (op) { if (F.ws.indexOf(op.wall) >= 0 && !(D && D.mode === 'opmove' && D.id === op.id)) s += frontOp(op, prob); });
  // cabinets: wall level drawn after floor level
  var ps = placed(proj).filter(function (o) { return F.ws.indexOf(o.it.wall) >= 0; });
  ps.sort(function (a, b) { return (level(a.c) === 'wall') - (level(b.c) === 'wall'); });
  var drag = D && D.mode === 'move' ? D : null;
  ps.forEach(function (o) {
    var it = drag && drag.id === o.c.id ? drag.it : o.it; if (F.ws.indexOf(it.wall) < 0) return;
    s += frontCab(o.c, o.i, it, prob.bad[o.c.id] || (drag && drag.id === o.c.id && drag.bad), drag && drag.id === o.c.id);
  });
  if (D && D.mode === 'add' && D.cand && F.ws.indexOf(D.cand.wall) >= 0) s += frontGhost(D.cand);
  if (D && D.mode === 'rsz' && D.moved && F.ws.indexOf(D.wall) >= 0) s += rszDraw();
  ptsOf(L).forEach(function (pt) { if (F.ws.indexOf(pt.wall) >= 0 && !(D && D.mode === 'ptmove' && D.id === pt.id)) s += frontPt(pt, prob); });   // sockets and pipes: seen through the cabinets
  if (D && D.mode === 'ptmove' && F.ws.indexOf(D.pt.wall) >= 0) s += frontPt(D.pt, prob, 'act');
  if (D && D.mode === 'ptadd' && D.cand && F.ws.indexOf(D.cand.wall) >= 0) s += frontPt(D.cand, prob, 'ghost');
  if (D && D.mode === 'opmove' && F.ws.indexOf(D.op.wall) >= 0) s += frontOp(D.op, prob, 'act');
  if (D && D.mode === 'opadd' && D.cand && F.ws.indexOf(D.cand.wall) >= 0) s += frontOp(D.cand, prob, 'ghost');
  // worktop over floor cabinets
  if (L.worktop) ps.forEach(function (o) { var wt = wtOf(o.c); if (!wt) return; var it = drag && drag.id === o.c.id ? drag.it : o.it; if (F.ws.indexOf(it.wall) < 0) return;
    var top = z0Of(o.c, it, L) + cabH(o.c); s += '<rect class="rm-top" x="' + fX(it.wall, it.x + wt.x0).toFixed(1) + '" y="' + fY(top + wt.T).toFixed(1) + '" width="' + (wt.L * k).toFixed(1) + '" height="' + Math.max(1.5, wt.T * k).toFixed(1) + '"/>'; });
  // dimension chain under each wall (floor level)
  F.ws.forEach(function (wi) {
    var row = ps.filter(function (o) { var it = drag && drag.id === o.c.id ? drag.it : o.it; return it.wall === wi && level(o.c) !== 'wall'; })
      .map(function (o) { var it = drag && drag.id === o.c.id ? drag.it : o.it; return [fx0(o.c, it.x), it.x, it.x + cabW(o.c), fx1(o.c, it.x)]; }).sort(function (a, b) { return a[0] - b[0]; });
    var marks = [0], y = fY(0) + 16; row.forEach(function (r) { marks.push(r[0], r[1], r[2], r[3]); }); marks.push(G[wi].len);
    marks = marks.filter(function (m, i, a) { return i === 0 || Math.abs(m - a[i - 1]) > 0.5; });
    s += '<line class="rm-dim" x1="' + fX(wi, 0).toFixed(1) + '" y1="' + y + '" x2="' + fX(wi, G[wi].len).toFixed(1) + '" y2="' + y + '"/>';
    marks.forEach(function (m, i) { s += '<line class="rm-dim" x1="' + fX(wi, m).toFixed(1) + '" y1="' + (y - 4) + '" x2="' + fX(wi, m).toFixed(1) + '" y2="' + (y + 4) + '"/>';
      if (i) { var d = marks[i] - marks[i - 1], px = d * k; if (px > 22) s += '<text class="rm-dt" x="' + ((fX(wi, marks[i]) + fX(wi, marks[i - 1])) / 2).toFixed(1) + '" y="' + (y + 14) + '" text-anchor="middle">' + fm(d) + '</text>'; } });
  });
  if (D && D.tip) s += tip(D.tip);
  return s;
}
function frontCab(c, i, it, bad, act) {
  var L = C.o.proj.layout, k = C.fr.k, w = cabW(c), h = cabH(c), z0 = z0Of(c, it, L), x0 = fX(it.wall, it.x), sel = C.o.sel === i;
  var s = '<g class="rm-cab lv-' + level(c) + (sel ? ' sel' : '') + (bad ? ' bad' : '') + (act ? ' act' : '') + '" data-cab="' + i + '">';
  var lh = legH(c), art = C.o.frontArt ? C.o.frontArt(i) : null;
  sideP(c).forEach(function (q) { var col = window.DBFront ? window.DBFront.matColor(q.mat, '#d5cbbd') : '#d5cbbd';
    s += '<rect class="rm-side" x="' + (x0 + q.x0 * k).toFixed(1) + '" y="' + fY(z0 + q.z1).toFixed(1) + '" width="' + Math.max(1.2, (q.x1 - q.x0) * k).toFixed(1) + '" height="' + ((q.z1 - q.z0) * k).toFixed(1) + '" style="fill:' + col + '"/>'; });
  if (lh && !c.dishwasher && !art) [55, w - 55].forEach(function (lx) { s += '<rect class="rm-leg" x="' + (x0 + (lx - 15) * k).toFixed(1) + '" y="' + fY(lh).toFixed(1) + '" width="' + Math.max(1.5, 30 * k).toFixed(1) + '" height="' + (lh * k).toFixed(1) + '"/>'; });
  if (c.dishwasher && lh) s += '<rect class="rm-plinth" x="' + x0.toFixed(1) + '" y="' + fY(lh).toFixed(1) + '" width="' + (w * k).toFixed(1) + '" height="' + (lh * k).toFixed(1) + '" style="fill:' + (window.DBFront ? window.DBFront.matColor((c.mat || {}).facade, '#9aa39c') : '#9aa39c') + '"/>';   // its plinth: in the front colour, as in 3D
  if (art) {   // the same render as the cabinet's front view, at its place on the wall
    s += art.svg.replace('<svg class="fr-svg"', '<svg class="rm-art" x="' + x0.toFixed(1) + '" y="' + fY(z0 + h + 4).toFixed(1) + '" width="' + (w * k).toFixed(1) + '" height="' + (art.vbH * k).toFixed(1) + '" preserveAspectRatio="none"');
    s += '<rect class="rm-body art" x="' + x0.toFixed(1) + '" y="' + fY(z0 + h).toFixed(1) + '" width="' + (w * k).toFixed(1) + '" height="' + (h * k).toFixed(1) + '"/>';
    fronts(i).forEach(function (f) { if (!f.door && !f.drawer) return;   // door opening lines over the render (they meet on the handle side — where the door opens — as on the drawings); an X on a drawer
      var fx = x0 + f.x0 * k, fy = fY(z0 + f.z1), fw = (f.x1 - f.x0) * k, fh = (f.z1 - f.z0) * k, hx = f.left ? fx + fw : fx, ox = f.left ? fx : fx + fw;
      if (f.drawer) { s += '<path class="rm-open art" d="M' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ' L' + (fx + fw).toFixed(1) + ' ' + (fy + fh).toFixed(1) + ' M' + fx.toFixed(1) + ' ' + (fy + fh).toFixed(1) + ' L' + (fx + fw).toFixed(1) + ' ' + fy.toFixed(1) + '"/>'; return; }
      s += '<path class="rm-open art" d="M' + ox.toFixed(1) + ' ' + fy.toFixed(1) + ' L' + hx.toFixed(1) + ' ' + (fy + fh / 2).toFixed(1) + ' L' + ox.toFixed(1) + ' ' + (fy + fh).toFixed(1) + '"/>'; });
  } else s += '<rect class="rm-body' + (c.dishwasher ? ' dish' : c.kind === 'panel' ? ' panel' : '') + '" x="' + x0.toFixed(1) + '" y="' + fY(z0 + h).toFixed(1) + '" width="' + Math.max(1.2, w * k).toFixed(1) + '" height="' + (h * k).toFixed(1) + '"' + (c.kind === 'panel' && window.DBFront ? ' style="fill:' + window.DBFront.matColor(c.mat && c.mat.carc, '#d5cbbd') + '"' : '') + '/>';
  if (!art) fronts(i).forEach(function (f) {
    var fx = x0 + f.x0 * k, fy = fY(z0 + f.z1), fw = (f.x1 - f.x0) * k, fh = (f.z1 - f.z0) * k;
    s += '<rect class="rm-front" x="' + fx.toFixed(1) + '" y="' + fy.toFixed(1) + '" width="' + fw.toFixed(1) + '" height="' + fh.toFixed(1) + '"/>';
    if (f.door) { var hx = f.left ? fx + fw : fx, ox = f.left ? fx : fx + fw;   // opening lines meet on the handle side, where the door opens (as on the drawings): a pair hinged outside points to the middle
      s += '<path class="rm-open" d="M' + ox.toFixed(1) + ' ' + fy.toFixed(1) + ' L' + hx.toFixed(1) + ' ' + (fy + fh / 2).toFixed(1) + ' L' + ox.toFixed(1) + ' ' + (fy + fh).toFixed(1) + '"/>'; }
    else if (f.drawer) s += '<path class="rm-open" d="M' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ' L' + (fx + fw).toFixed(1) + ' ' + (fy + fh).toFixed(1) + ' M' + fx.toFixed(1) + ' ' + (fy + fh).toFixed(1) + ' L' + (fx + fw).toFixed(1) + ' ' + fy.toFixed(1) + '"/>';
    else if (fw > 8) s += '<line class="rm-handle" x1="' + (fx + fw * 0.35).toFixed(1) + '" y1="' + (fy + Math.min(fh * 0.22, 40 * k + 3)).toFixed(1) + '" x2="' + (fx + fw * 0.65).toFixed(1) + '" y2="' + (fy + Math.min(fh * 0.22, 40 * k + 3)).toFixed(1) + '"/>';
  });
  var inf0 = C.o.infos[i], lv = inf0 && inf0.r && inf0.r.visual && inf0.r.visual.leds;
  if (lv) lv.forEach(function (q) { var e = q.e, lw = Math.max(2.5, (e[0][1] - e[0][0]) * k), lh = Math.max(2.5, (e[2][1] - e[2][0]) * k);   // LED strips: seen through the fronts
    s += '<rect class="rm-led" x="' + (x0 + e[0][0] * k - (lw > (e[0][1] - e[0][0]) * k ? lw / 2 : 0)).toFixed(1) + '" y="' + (fY(z0 + e[2][1]) - (lh > (e[2][1] - e[2][0]) * k ? lh / 2 : 0)).toFixed(1) + '" width="' + lw.toFixed(1) + '" height="' + lh.toFixed(1) + '"/>'; });
  if (D && D.mode === 'ledadd' && D.cand && D.cand.i === i) { var at = D.cand.at, gx = at === 'R' ? x0 + w * k - 6 : x0, gy = at === 'top' ? fY(z0 + h) : at === 'bottom' ? fY(z0) - 6 : fY(z0 + h);
    s += '<rect class="rm-ghost" x="' + gx.toFixed(1) + '" y="' + gy.toFixed(1) + '" width="' + (at === 'L' || at === 'R' ? 6 : w * k).toFixed(1) + '" height="' + (at === 'L' || at === 'R' ? h * k : 6).toFixed(1) + '"/>'; }
  if (c.vis && !c.dishwasher && c.kind !== 'panel') {   // a visible side or bottom: a band in the front colour
    var vcol = window.DBFront ? window.DBFront.matColor((c.mat || {}).facade, '#d5cbbd') : '#d5cbbd', vw = Math.max(2.5, Math.min(5, (+c.thick || 18) * k));
    if (c.vis.L) s += '<rect class="rm-visside" x="' + x0.toFixed(1) + '" y="' + fY(z0 + h).toFixed(1) + '" width="' + vw.toFixed(1) + '" height="' + (h * k).toFixed(1) + '" style="fill:' + vcol + '"/>';
    if (c.vis.R) s += '<rect class="rm-visside" x="' + (x0 + w * k - vw).toFixed(1) + '" y="' + fY(z0 + h).toFixed(1) + '" width="' + vw.toFixed(1) + '" height="' + (h * k).toFixed(1) + '" style="fill:' + vcol + '"/>';
    if (c.vis.B && level(c) === 'wall') s += '<rect class="rm-visside" x="' + x0.toFixed(1) + '" y="' + (fY(z0) - vw).toFixed(1) + '" width="' + (w * k).toFixed(1) + '" height="' + vw.toFixed(1) + '" style="fill:' + vcol + '"/>';
  }
  var cx = x0 + w * k / 2, cy = fY(z0 + h) + Math.min(18, h * k / 2);
  if (sel && !act && !(D && D.mode === 'rsz')) s += rszHandles(c, i, x0, fY(z0 + h), w * k, h * k);
  if (sel && !act && !D && C.o.onFlip) fronts(i).forEach(function (f, fi) {   // the opening side of each door: ⇄ flips it (hinges to the other side)
    if (!f.door || f.sec == null) return; var fx = x0 + (f.x0 + f.x1) / 2 * k, fz = fY(z0 + (f.z0 + f.z1) / 2), r = Math.max(9, Math.min(15, (f.x1 - f.x0) * k * 0.12));
    if ((f.x1 - f.x0) * k < 26 || (f.z1 - f.z0) * k < 26) return;
    s += '<g class="rm-flip" data-flip="' + i + ':' + f.sec + ':' + (f.box ? 1 : 0) + ':' + (f.left ? 1 : 0) + '" role="button" aria-label="' + esc(T('flipT')) + '"><title>' + esc(T('flipT')) + '</title><circle cx="' + fx.toFixed(1) + '" cy="' + fz.toFixed(1) + '" r="' + r.toFixed(1) + '"/>' +
      '<path d="M' + (fx - r * 0.5).toFixed(1) + ' ' + (fz - r * 0.22).toFixed(1) + 'h' + (r).toFixed(1) + 'l-' + (r * 0.28).toFixed(1) + ' -' + (r * 0.26).toFixed(1) + 'M' + (fx + r * 0.5).toFixed(1) + ' ' + (fz + r * 0.22).toFixed(1) + 'h-' + (r).toFixed(1) + 'l' + (r * 0.28).toFixed(1) + ' ' + (r * 0.26).toFixed(1) + '"/></g>'; });
  if (w * k > 26) s += '<circle class="rm-no" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="9"/><text class="rm-not" x="' + cx.toFixed(1) + '" y="' + (cy + 3.5).toFixed(1) + '" text-anchor="middle">' + (i + 1) + '</text>';
  return s + '<title>' + esc(cabName(c, i) + ' · ' + fm(w) + '×' + fm(h) + '×' + fm(cabD(c))) + '</title></g>';
}
/* ---------------------------------------------------------------- resizing in the front view: the selected cabinet's edges are dragged */
function rszSides(c) {   // which edges can be dragged: the bottom only of a hung cabinet (a standing one stands on its legs); no width for a panel or a dishwasher
  if (c.dishwasher) return [];
  var s = ['t']; if (level(c) === 'wall') s.push('b'); if (c.kind !== 'panel') s.push('l', 'r'); return s;
}
function rszHandles(c, i, x, y, w, h) {
  var s = '', hw = 12;   // hit strip width (px)
  rszSides(c).forEach(function (sd) {
    var hor = sd === 't' || sd === 'b', ex = sd === 'l' ? x : sd === 'r' ? x + w : x, ey = sd === 't' ? y : sd === 'b' ? y + h : y;
    var hx = hor ? x + Math.min(10, w / 4) : ex - hw / 2, hy = hor ? ey - hw / 2 : y + Math.min(10, h / 4), hW = hor ? Math.max(4, w - 2 * Math.min(10, w / 4)) : hw, hH = hor ? hw : Math.max(4, h - 2 * Math.min(10, h / 4));
    var gl = Math.min(28, (hor ? w : h) * 0.4), gx = hor ? x + w / 2 - gl / 2 : ex - 3, gy = hor ? ey - 3 : y + h / 2 - gl / 2;
    s += '<rect class="rm-grip" x="' + gx.toFixed(1) + '" y="' + gy.toFixed(1) + '" width="' + (hor ? gl : 6).toFixed(1) + '" height="' + (hor ? 6 : gl).toFixed(1) + '" rx="3"/>' +
      '<rect class="rm-rsz ' + (hor ? 'v' : 'h') + '" data-rsz="' + sd + '" data-cab="' + i + '" x="' + hx.toFixed(1) + '" y="' + hy.toFixed(1) + '" width="' + hW.toFixed(1) + '" height="' + hH.toFixed(1) + '"><title>' + esc(T(hor ? 'rszH' : 'rszW')) + '</title></rect>';
  });
  return s;
}
/* what a dragged edge snaps to: the other cabinets' edges on the wall, the doors and windows, the wall ends, the ceiling */
function rszSnap(proj, c, wall, axis, v, thr) {
  var L = proj.layout, G = geo(L), best = null, cand = [];
  placed(proj).forEach(function (o) { if (o.c === c || o.it.wall !== wall) return; var nm = '№' + (o.i + 1);
    if (axis === 'z') { var z0 = z0Of(o.c, o.it, L), z1 = z0 + cabH(o.c), wt = wtOf(o.c); cand.push([z1, nm], [z0, nm]); if (wt && L.worktop && level(o.c) !== 'wall') cand.push([z1 + wt.T, T('rszWt')]); }
    else cand.push([o.it.x, nm], [o.it.x + cabW(o.c), nm]); });
  opsOf(L).forEach(function (op) { if (op.wall !== wall) return; var nm = opName(L, op);
    if (axis === 'z') cand.push([op.z + op.h, nm]); if (opCasTop(op, L) > 0.5) cand.push([op.z + op.h + opCasTop(op, L), nm + ' · ' + T('rszCas')]); else cand.push([op.x, nm], [op.x + op.w, nm], [op.x - OP_CAS, nm + ' · ' + T('rszCas')], [op.x + op.w + OP_CAS, nm + ' · ' + T('rszCas')]); });
  if (axis === 'z') { cand.push([+L.roomH > 0 ? +L.roomH : 2600, T('rszCeil')]); if (+L.wallZ > 0) cand.push([+L.wallZ, T('rszWallZ')]); }
  else if (G[wall]) cand.push([0, T('rmSnap_wall')], [G[wall].len, T('rmSnap_wall')]);
  cand.forEach(function (q) { var d = Math.abs(q[0] - v); if (d <= thr && (!best || d < best.d)) best = { v:q[0], why:q[1], d:d }; });
  return best ? { v:best.v, why:best.why } : { v:Math.round(v), why:'' };
}
function startResize(e, i, sd) {
  var proj = C.o.proj, L = proj.layout, c = proj.cabinets[i], it = L.items[c.id]; if (!it || it.wall < 0) return;
  var z0 = z0Of(c, it, L);
  D = { mode:'rsz', i:i, id:c.id, c:c, sd:sd, wall:it.wall, x0:it.x, W:cabW(c), z0:z0, H:cabH(c), nx:it.x, nW:cabW(c), nz:z0, nH:cabH(c), x:e.clientX, y:e.clientY, moved:false };
}
function rszMove(m) {
  var proj = C.o.proj, L = proj.layout, k = C.fr.k, thr = thrMm(), sd = D.sd, why = '', sn;
  if (sd === 't' || sd === 'b') {
    sn = rszSnap(proj, D.c, D.wall, 'z', zAt(m), thr); why = sn.why;
    if (sd === 't') { D.nz = D.z0; D.nH = Math.max(100, Math.min(6000, sn.v - D.z0)); }
    else { var top = D.z0 + D.H, zb = Math.max(0, Math.min(top - 100, sn.v)); D.nz = zb; D.nH = top - zb; }
    D.guide = { axis:'z', v:sd === 't' ? D.nz + D.nH : D.nz, on:!!why };
  } else {
    var along = (m[0] - C.fr.ox) / k - C.fr.off[D.wall];
    sn = rszSnap(proj, D.c, D.wall, 'x', along, thr); why = sn.why;
    if (sd === 'r') { D.nx = D.x0; D.nW = Math.max(100, Math.min(6000, sn.v - D.x0)); }
    else { var right = D.x0 + D.W, xl = Math.min(right - 100, sn.v); D.nx = xl; D.nW = right - xl; }
    D.guide = { axis:'x', v:sd === 'r' ? D.nx + D.nW : D.nx, on:!!why };
  }
  var keepC = { W:D.c.W, H:D.c.H }, keepIt = L.items[D.id];   // would it hit something? (as the move asks)
  D.c.W = D.nW; D.c.H = D.nH; L.items[D.id] = Object.assign({}, keepIt, { x:D.nx, z:level(D.c) === 'wall' ? D.nz : keepIt.z });
  D.bad = !!problems(proj).bad[D.id];
  D.c.W = keepC.W; D.c.H = keepC.H; L.items[D.id] = keepIt;
  var hor = sd === 't' || sd === 'b';
  D.tip = { x:m[0], y:m[1], bad:D.bad, lines:[cabName(D.c, D.i) + ' · ' + (hor ? T('rszHt').replace('{a}', fm(D.H)).replace('{b}', fm(D.nH)) : T('rszWd').replace('{a}', fm(D.W)).replace('{b}', fm(D.nW))),
    hor ? T('rszTop').replace('{t}', fm(D.nz + D.nH)).replace('{b}', fm(D.nz)) : T('rmFromStart').replace('{x}', fm(D.nx)), why ? T('rszAt').replace('{w}', why) : '', D.bad ? T('rmHit') : ''].filter(Boolean) };
}
function rszDraw() {
  var k = C.fr.k, x = fX(D.wall, D.nx), y = fY(D.nz + D.nH), s = '';
  if (D.guide && D.guide.on) { var g = D.guide;
    if (g.axis === 'z') s += '<line class="rm-guide" x1="' + fX(D.wall, 0).toFixed(1) + '" y1="' + fY(g.v).toFixed(1) + '" x2="' + fX(D.wall, geo(C.o.proj.layout)[D.wall].len).toFixed(1) + '" y2="' + fY(g.v).toFixed(1) + '"/>';
    else s += '<line class="rm-guide" x1="' + fX(D.wall, g.v).toFixed(1) + '" y1="' + fY(0).toFixed(1) + '" x2="' + fX(D.wall, g.v).toFixed(1) + '" y2="' + fY(C.fr.H).toFixed(1) + '"/>'; }
  return s + '<rect class="rm-ghost' + (D.bad ? ' bad' : '') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (D.nW * k).toFixed(1) + '" height="' + (D.nH * k).toFixed(1) + '"/>';
}
function frontGhost(cd) {
  var k = C.fr.k, z0 = cd.lv === 'wall' ? (+C.o.proj.layout.wallZ || 1450) : (cd.legs || 0);
  return '<rect class="rm-ghost' + (cd.bad ? ' bad' : '') + '" x="' + fX(cd.wall, cd.x).toFixed(1) + '" y="' + fY(z0 + cd.H).toFixed(1) + '" width="' + (cd.W * k).toFixed(1) + '" height="' + (cd.H * k).toFixed(1) + '"/>';
}

/* ---------------------------------------------------------------- PLAN */
function planLayout() {
  var L = C.o.proj.layout, G = geo(L), xs = [], ys = [];
  G.forEach(function (g) { xs.push(g.P[0], g.P[0] + g.d[0] * g.len); ys.push(g.P[1], g.P[1] + g.d[1] * g.len); });
  var maxD = 700; G.forEach(function (g) { xs.push(g.P[0] + g.n[0] * maxD); ys.push(g.P[1] + g.n[1] * maxD); });
  opsOf(L).forEach(function (op) { var g = G[op.wall]; if (!g || !isDoor(op)) return; var b = op.swing === 'out' ? -100 - op.w : op.w; [op.x, op.x + op.w].forEach(function (a) { xs.push(g.P[0] + g.d[0] * a + g.n[0] * b); ys.push(g.P[1] + g.d[1] * a + g.n[1] * b); }); });   // a door's sweep
  var x0 = Math.min.apply(null, xs) - 330, x1 = Math.max.apply(null, xs) + 330, y0 = Math.min.apply(null, ys) - 330, y1 = Math.max.apply(null, ys) + 330;   // room for the wall names outside the walls
  var k = Math.min((C.w - 20) / (x1 - x0), 520 / (y1 - y0), 0.22);
  C.pl = { k:k, x0:x0, y0:y0, ox:(C.w - (x1 - x0) * k) / 2, oy:10 };
  C.h = Math.round((y1 - y0) * k + 34);   // + the legend line under the plan
  zApply(C.pl, 'oy');
}
function pX(x) { return C.pl.ox + (x - C.pl.x0) * C.pl.k; }
function pY(y) { return C.pl.oy + (y - C.pl.y0) * C.pl.k; }
function drawPlan() {
  var proj = C.o.proj, L = proj.layout, G = geo(L), k = C.pl.k, s = '', prob = problems(proj), drag = D && D.mode === 'move' ? D : null;
  G.forEach(function (g, wi) {   // wall: a thick line on the outside of the room line
    var a = g.P, b = [g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len], t = 100, o = [-g.n[0] * t, -g.n[1] * t];
    s += '<polygon class="rm-pwall" points="' + [a, b, [b[0] + o[0], b[1] + o[1]], [a[0] + o[0], a[1] + o[1]]].map(function (q) { return pX(q[0]).toFixed(1) + ',' + pY(q[1]).toFixed(1); }).join(' ') + '"/>';
    var m = [(a[0] + b[0]) / 2 - g.n[0] * 260, (a[1] + b[1]) / 2 - g.n[1] * 260];
    s += '<text class="rm-wt" x="' + pX(m[0]).toFixed(1) + '" y="' + (pY(m[1]) + 4).toFixed(1) + '" text-anchor="middle">' + LETTER[wi] + ' · ' + fm(g.len) + '</text>';
  });
  opsShown().forEach(function (op) { if (!(D && D.mode === 'opmove' && D.id === op.id)) s += planOp(op, prob); });
  var ps = placed(proj).slice().sort(function (a, b) { return (level(a.c) === 'wall') - (level(b.c) === 'wall'); });
  if (L.worktop) ps.forEach(function (o) {   // worktops under the cabinets: what shows is their overhang
    var it = drag && drag.id === o.c.id ? drag.it : o.it, wr = wtRect(o.c, it, G, L); if (!wr) return; var g = G[it.wall], wt = wtOf(o.c), q = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; };
    s += '<polygon class="rm-ptop" points="' + [q(it.x + wt.x0, 0), q(it.x + wt.x1, 0), q(it.x + wt.x1, wt.W), q(it.x + wt.x0, wt.W)].map(function (p) { return pX(p[0]).toFixed(1) + ',' + pY(p[1]).toFixed(1); }).join(' ') + '"/>'; });
  ps.forEach(function (o) {
    var it = drag && drag.id === o.c.id ? drag.it : o.it, r = planRect(o.c, it, G), sel = C.o.sel === o.i;
    var cls = 'rm-pcab lv-' + level(o.c) + (sel ? ' sel' : '') + ((prob.bad[o.c.id] || (drag && drag.id === o.c.id && drag.bad)) ? ' bad' : '') + (drag && drag.id === o.c.id ? ' act' : '');
    s += '<g class="' + cls + '" data-cab="' + o.i + '"><polygon points="' + r.pts.map(function (q) { return pX(q[0]).toFixed(1) + ',' + pY(q[1]).toFixed(1); }).join(' ') + '"/>';
    sideRects(o.c, it, G, L).forEach(function (q) { s += '<polygon class="rm-pside" points="' + q.pts.map(function (v) { return pX(v[0]).toFixed(1) + ',' + pY(v[1]).toFixed(1); }).join(' ') + '"/>'; });
    var g = G[it.wall], fa = [g.P[0] + g.d[0] * it.x + g.n[0] * cabD(o.c), g.P[1] + g.d[1] * it.x + g.n[1] * cabD(o.c)], fb = [fa[0] + g.d[0] * cabW(o.c), fa[1] + g.d[1] * cabW(o.c)];
    s += '<line class="rm-pfront" x1="' + pX(fa[0]).toFixed(1) + '" y1="' + pY(fa[1]).toFixed(1) + '" x2="' + pX(fb[0]).toFixed(1) + '" y2="' + pY(fb[1]).toFixed(1) + '"/>';
    var cx = pX((r.x0 + r.x1) / 2), cy = pY((r.y0 + r.y1) / 2);
    if (level(o.c) !== 'wall' || !ps.some(function (q) { return q !== o && level(q.c) !== 'wall' && q.it.wall === it.wall && vOverlap([it.x, it.x + cabW(o.c)], [q.it.x, q.it.x + cabW(q.c)]); }))
      s += '<text class="rm-pn" x="' + cx.toFixed(1) + '" y="' + (cy + 4).toFixed(1) + '" text-anchor="middle">' + (o.i + 1) + '</text>';
    s += '<title>' + esc(cabName(o.c, o.i) + ' · ' + fm(cabW(o.c))) + '</title></g>';
  });
  ptsOf(L).forEach(function (pt) { if (!(D && D.mode === 'ptmove' && D.id === pt.id)) s += planPt(pt, prob); });
  if (D && D.mode === 'ptmove') s += planPt(D.pt, prob, 'act');
  if (D && D.mode === 'ptadd' && D.cand) s += planPt(D.cand, prob, 'ghost');
  if (D && D.mode === 'opmove') s += planOp(D.op, prob, 'act');
  if (D && D.mode === 'opadd' && D.cand) s += planOp(D.cand, prob, 'ghost');
  if (D && D.mode === 'add' && D.cand) {
    var cd = D.cand, g2 = G[cd.wall], q = function (a, b) { return [g2.P[0] + g2.d[0] * a + g2.n[0] * b, g2.P[1] + g2.d[1] * a + g2.n[1] * b]; };
    s += '<polygon class="rm-ghost' + (cd.bad ? ' bad' : '') + '" points="' + [q(cd.x, 0), q(cd.x + cd.W, 0), q(cd.x + cd.W, cd.D), q(cd.x, cd.D)].map(function (p) { return pX(p[0]).toFixed(1) + ',' + pY(p[1]).toFixed(1); }).join(' ') + '"/>';
  }
  s += '<text class="rm-legend" x="10" y="' + (C.h - 6) + '">' + esc(T('rmPlanLeg')) + '</text>';
  if (D && D.tip) s += tip(D.tip);
  return s;
}

/* ---------------------------------------------------------------- 3D of the whole kitchen */
function setup3d() {
  var L = C.o.proj.layout, G = geo(L), xs = [0], ys = [0];
  G.forEach(function (g) { xs.push(g.P[0] + g.d[0] * g.len, g.P[0] + g.n[0] * 700); ys.push(g.P[1] + g.d[1] * g.len, g.P[1] + g.n[1] * 700); });
  var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2, H = +L.roomH || 2600;
  var R = 0.5 * Math.sqrt(Math.pow(Math.max.apply(null, xs) - Math.min.apply(null, xs), 2) + Math.pow(Math.max.apply(null, ys) - Math.min.apply(null, ys), 2) + H * H);
  C.h = Math.round(Math.max(340, Math.min(600, C.w * 0.62)));
  C.d3 = { cx:cx, cy:cy, cz:H / 2, k:Math.min(C.w, C.h) / (2 * R * 1.02) * (V.z3 || 1), ct:Math.cos(V.th), st:Math.sin(V.th), cp:Math.cos(V.ph), sp:Math.sin(V.ph) };
}
function P3(px, py, z) {   // plan (x right, y down) + height → screen; world Y = -plan y so the picture is not mirrored
  var Q = C.d3, x = px - Q.cx, y = -(py - Q.cy), zz = z - Q.cz;
  var rx = x * Q.ct + y * Q.st, dp = -x * Q.st + y * Q.ct;
  return [C.w / 2 + (V.px3 || 0) + rx * Q.k, C.h / 2 + (V.py3 || 0) - (zz * Q.cp + dp * Q.sp) * Q.k, dp * Q.cp - zz * Q.sp];
}
function draw3d() {
  var proj = C.o.proj, L = proj.layout, G = geo(L), faces = [], H = +L.roomH || 2600;
  var quad = function (pts, cls, cab) { var q = pts.map(function (p) { return P3(p[0], p[1], p[2]); }); faces.push({ q:q, cls:cls, cab:cab, z:(q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4 }); };
  var box = function (tr, x0, x1, y0, y1, z0, z1, cls, cab) {   // box in cabinet coords through tr()
    var c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(tr);
    [[0, 1, 2, 3, 'b'], [4, 5, 6, 7, 't'], [0, 1, 5, 4, 'f'], [3, 2, 6, 7, 'k'], [0, 3, 7, 4, 's'], [1, 2, 6, 5, 's']].forEach(function (f) { quad([c[f[0]], c[f[1]], c[f[2]], c[f[3]]], cls + ' f' + f[4], cab); });
  };
  // floor and walls of the room
  var fl = []; G.forEach(function (g) { fl.push([g.P[0], g.P[1], 0]); });
  if (G.length >= 3) { var last = G[G.length - 1]; fl.push([last.P[0] + last.d[0] * last.len, last.P[1] + last.d[1] * last.len, 0]); }
  G.forEach(function (g) { var a = g.P, b = [g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len]; quad([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], H], [a[0], a[1], H]], 'rm3-wall'); });
  placed(proj).forEach(function (o) {
    var c = o.c, it = o.it, g = G[it.wall], D0 = cabD(c), z0 = z0Of(c, it, L), inf = C.o.infos[o.i], sel = C.o.sel === o.i;
    var tr = function (p) { var a = it.x + p[0], b = D0 - p[1]; return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b, z0 + p[2]]; };
    if (inf && inf.r && inf.r.panels.length) inf.r.panels.forEach(function (p) {
      if (!p.place) return;
      var q = p.place, pts = [];
      [0, p.L].forEach(function (a) { [0, p.W].forEach(function (b) { [0, p.T].forEach(function (t) { pts.push([q.o[0] + a * q.u[0] + b * q.v[0] - t * q.n[0], q.o[1] + a * q.u[1] + b * q.v[1] - t * q.n[1], q.o[2] + a * q.u[2] + b * q.v[2] - t * q.n[2]]); }); }); });
      var mn = [0, 1, 2].map(function (k) { return Math.min.apply(null, pts.map(function (v) { return v[k]; })); }), mx = [0, 1, 2].map(function (k) { return Math.max.apply(null, pts.map(function (v) { return v[k]; })); });
      var cls = (p.role === 'FASADAS' || p.role === 'DURYS') ? 'rm3-front' : 'rm3-carc';
      box(tr, mn[0], mx[0], mn[1], mx[1], mn[2], mx[2], cls + (sel ? ' sel' : ''), o.i);
    });
    else box(tr, 0, cabW(c), 0, D0, 0, cabH(c), 'rm3-carc' + (sel ? ' sel' : ''), o.i);
    if (inf && inf.r && inf.r.legs) inf.r.legs.forEach(function (lg) { box(tr, lg.x - 15, lg.x + 15, lg.y - 15, lg.y + 15, -legH(c), 0, 'rm3-leg', o.i); });
    var wt = L.worktop && wtOf(c); if (wt) box(tr, wt.x0, wt.x1, wt.y0, wt.y1, wt.z0, wt.z1, 'rm3-top', o.i);
  });
  faces.sort(function (a, b) { return b.z - a.z; });
  var s = '';
  if (fl.length >= 3) s += '<polygon class="rm3-floor" points="' + fl.map(function (p) { var q = P3(p[0], p[1], 0); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>';
  faces.forEach(function (f) { s += '<polygon class="' + f.cls + '"' + (f.cab != null ? ' data-cab="' + f.cab + '"' : '') + ' points="' + f.q.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>'; });
  return s + '<text class="rm-legend" x="10" y="' + (C.h - 8) + '">' + esc(T('rm3Leg')) + '</text>';
}

/* ---------------------------------------------------------------- 3D of all the furniture: the same renderer as the cabinet preview
   (real parts from the engine, materials, soft light, depth buffer, bevelled front edges); walls facing the viewer are left out */
var R3 = null;   // last frame: pick buffer for clicks
function r3unit(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function r3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function r3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function r3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
var R3WOOD = /oak|ąžuol|azuol|walnut|riešut|riesut|uos|ash|beech|buk|medi/i;
function r3mat(name, dflt) { return window.DBFront ? window.DBFront.matColor(name, dflt) : dflt; }
/* the furniture in 3-D: every part, leg, plinth, side panel and worktop as a box in its cabinet's coordinates, with the map to the room
   (tr: cabinet x, y from the front, z up → plan x, plan y, height), its colour and how it is drawn (o: cab, front, wood, metal, tex)
   — for the room's 3-D view and for the realistic picture (DBRender) */
function items3d(proj, infos) {
  var L = proj.layout, G = geo(L), out = [];
  var add = function (tr, x0, x1, y0, y1, z0, z1, color, o, kind) { if (x1 - x0 < 0.01 || y1 - y0 < 0.01 || z1 - z0 < 0.01) return; out.push({ tr:tr, e:[x0, x1, y0, y1, z0, z1], color:color, o:o, kind:kind || '' }); };
  placed(proj).forEach(function (o) {
    var c = o.c, it = o.it, g = G[it.wall], D0 = cabD(c), z0 = z0Of(c, it, L), inf = infos[o.i], mat = c.mat || {};
    var tr = function (p) { var a = it.x + p[0], b = D0 - p[1]; return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b, z0 + p[2]]; };
    var carc = r3mat(mat.carc, '#e5e2da'), fac = r3mat(mat.facade, '#d5cbbd'), back = r3mat(mat.back || mat.carc, carc);
    var opt = { cab:o.i };
    if (inf && inf.r && inf.r.panels && inf.r.panels.length) inf.r.panels.forEach(function (p) {
      if (!p.place) return;
      var q = p.place, pts = [];
      [0, p.L].forEach(function (a) { [0, p.W].forEach(function (b) { [0, p.T].forEach(function (t) { pts.push([q.o[0] + a * q.u[0] + b * q.v[0] - t * q.n[0], q.o[1] + a * q.u[1] + b * q.v[1] - t * q.n[1], q.o[2] + a * q.u[2] + b * q.v[2] - t * q.n[2]]); }); }); });
      var mn = [0, 1, 2].map(function (k) { return Math.min.apply(null, pts.map(function (v) { return v[k]; })); }), mx = [0, 1, 2].map(function (k) { return Math.max.apply(null, pts.map(function (v) { return v[k]; })); });
      var front = p.role === 'FASADAS' || p.role === 'DURYS', hdf = p.role === 'PLAUSAS' || /HDF/.test(p.mat || '');
      var col = front ? fac : hdf ? '#e4e1da' : p.role === 'NUGARA' ? back : carc, wd = front ? R3WOOD.test(mat.facade || '') : R3WOOD.test(mat.carc || '');
      var pm = p.mat || (front ? mat.facade : p.role === 'NUGARA' ? (mat.back || mat.carc) : mat.carc), ga = Math.abs(q.u[0]) > 0.5 ? 0 : Math.abs(q.u[1]) > 0.5 ? 1 : 2;   // the grain: the part's length
      if (p.mat && !hdf) col = r3mat(p.mat, col);
      add(tr, mn[0], mx[0], mn[1], mx[1], mn[2], mx[2], col, { cab:o.i, front:front, wood:wd && !hdf, tex:hdf ? null : { name:pm, g:ga } }, front ? 'front' : hdf ? 'hdf' : 'part');
    });
    else add(tr, 0, cabW(c), 0, D0, 0, cabH(c), c.dishwasher ? fac : carc, { cab:o.i, front:true, wood:R3WOOD.test(mat.facade || '') });
    if (inf && inf.r && inf.r.legs) inf.r.legs.forEach(function (lg) { var rr = Math.min(25, (lg.d || 32) / 2); add(tr, lg.x - rr, lg.x + rr, lg.y - rr, lg.y + rr, -legH(c), 0, '#343b3a', { cab:o.i, metal:true }, 'leg'); });
    ((inf && inf.r && inf.r.visual && inf.r.visual.leds) || []).forEach(function (q) { var e = q.e; add(tr, e[0][0], e[0][1], e[1][0], e[1][1], e[2][0], e[2][1], '#fff1b8', { cab:o.i, led:true }, 'led'); });   // LED strips: they glow in the render
    var pl = inf && inf.r && inf.r.visual && inf.r.visual.plinth;
    if (pl) add(tr, pl.x0, pl.x1, pl.y0, pl.y0 + pl.t, pl.z0, pl.z1, r3mat(pl.mat, fac), { cab:o.i, front:true, wood:R3WOOD.test(pl.mat || ''), tex:{ name:pl.mat, g:0 } }, 'front');
    else if (c.dishwasher && legH(c)) add(tr, 0, cabW(c), 40, D0, -legH(c), 0, fac, opt);
    sideP(c).forEach(function (q) { add(tr, q.x0, q.x1, q.y0, q.y1, q.z0, q.z1, r3mat(q.mat, fac), { cab:o.i, front:true, wood:R3WOOD.test(q.mat || ''), tex:{ name:q.mat, g:2 } }, 'front'); });   // side panels: the grain up
    var wt = L.worktop && wtOf(c); if (wt) add(tr, wt.x0, wt.x1, wt.y0, wt.y1, wt.z0, wt.z1, r3mat(wt.mat, '#b98a55'), { cab:o.i, wood:!wt.mat || R3WOOD.test(wt.mat), tex:{ name:wt.mat, g:0 } }, 'top');
  });
  return out;
}
function faces3d() {
  var proj = C.o.proj, L = proj.layout, G = geo(L), H = +L.roomH || 2600, F = [], Q = C.d3;
  var depthDir = [-Q.st * Q.cp, Q.ct * Q.cp, -Q.sp];   // world direction away from the viewer (world y = −plan y)
  var W3 = function (p) { return [p[0], -p[1], p[2]]; };
  var face = function (pts, color, o, tx) {   // pts in plan coords + height
    var w = pts.map(W3), n = r3unit(r3cross(r3sub(w[1], w[0]), r3sub(w[2], w[0])));
    F.push({ p:pts, n:n, color:color, cab:o.cab, op:o.op != null ? o.op : o.pt != null ? 10000 + o.pt : null, alpha:o.alpha || 0, wood:!!o.wood, front:!!o.front, metal:!!o.metal, tx:tx || null });
  };
  var LK = window.DBLook || null;
  var box = function (tr, x0, x1, y0, y1, z0, z1, color, o) {   // o.tex: { name, g: the cabinet axis of the board's grain } — a photo of that material is laid on it
    if (x1 - x0 < 0.01 || y1 - y0 < 0.01 || z1 - z0 < 0.01) return;
    var c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(tr);
    var cw = c.map(W3), ctr = [0, 1, 2].map(function (k) { return cw.reduce(function (a, v) { return a + v[k]; }, 0) / 8; });
    var tex = o.tex && o.tex.name && LK && LK.has(o.tex.name) ? o.tex : null, axes = tex ? [r3unit(r3sub(c[1], c[0])), r3unit(r3sub(c[3], c[0])), r3unit(r3sub(c[4], c[0]))] : null;
    [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(function (f) {
      var pts = f.map(function (i) { return c[i]; }), w = f.map(function (i) { return cw[i]; });
      var fc = [0, 1, 2].map(function (k) { return (w[0][k] + w[1][k] + w[2][k] + w[3][k]) / 4; });
      if (r3dot(r3cross(r3sub(w[1], w[0]), r3sub(w[2], w[0])), r3sub(fc, ctr)) < 0) pts.reverse();
      face(pts, color, o, tex ? LK.frame(tex.name, c[0], axes, tex.g || 0, r3unit(r3cross(r3sub(pts[1], pts[0]), r3sub(pts[2], pts[0]))), [x1 - x0, y1 - y0, z1 - z0]) : null);
    });
  };
  // walls: only those whose room side faces the viewer (a doll's house view)
  G.forEach(function (g, wi) {
    var nW = [g.n[0], -g.n[1], 0]; if (r3dot(nW, depthDir) > -0.05) return;
    var a = g.P, t = 60;
    var tr = function (p) { return [a[0] + g.d[0] * p[0] - g.n[0] * p[1], a[1] + g.d[1] * p[0] - g.n[1] * p[1], p[2]]; };
    wallPieces(L, wi, 0, g.len, H).forEach(function (pc) { box(tr, pc[0], pc[1], 0, t, pc[2], pc[3], '#f7f5ef', {}); });   // the wall round its doors and windows
    opsOf(L).forEach(function (op, k) { if (op.wall !== wi) return;
      opParts(op, t, L).forEach(function (q) { var e = q.e; box(tr, e[0], e[1], e[2], e[3], e[4], e[5], q.color, { op:k, alpha:q.kind === 'glass' ? 0.38 : 0, metal:q.kind === 'metal' }); }); });
    ptsOf(L).forEach(function (pt, k) { if (pt.wall !== wi) return; ptParts(pt).forEach(function (q) { var e = q.e; box(tr, e[0], e[1], e[2], e[3], e[4], e[5], q.color, { pt:k, metal:q.kind === 'pipe' }); }); });
  });
  items3d(proj, C.o.infos).forEach(function (q) { box(q.tr, q.e[0], q.e[1], q.e[2], q.e[3], q.e[4], q.e[5], q.color, q.o); });
  return { faces:F, depthDir:depthDir, H:H, G:G };
}
function render3d(st) {
  var w = C.w, h = C.h, ratio = (D && D.mode === 'orbit' && D.moved) ? 1 : Math.min(2, window.devicePixelRatio || 1.5);
  st.innerHTML = '<div class="rm3-wrap" style="width:' + w + 'px;height:' + h + 'px"><canvas class="rm3-canvas" width="' + Math.round(w * ratio) + '" height="' + Math.round(h * ratio) + '" style="width:' + w + 'px;height:' + h + 'px"></canvas>' +
    '<svg class="rm3-over" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(T('rmTitle')) + '"></svg></div>';
  var cv = st.querySelector('canvas'), ctx = cv.getContext('2d'), sc = scene3d = faces3d(), proj = C.o.proj, L = proj.layout, G = sc.G;
  var PW = cv.width, PH = cv.height;
  // background: floor of the room
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, w, h);
  var fl = []; G.forEach(function (g) { fl.push(g.P); }); if (G.length >= 3) { var lg = G[G.length - 1]; fl.push([lg.P[0] + lg.d[0] * lg.len, lg.P[1] + lg.d[1] * lg.len]); }
  var poly = function (pts) { ctx.beginPath(); pts.forEach(function (p, i) { var q = P3(p[0], p[1], 0); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fillStyle = '#e9e5db'; ctx.fill(); };
  if (fl.length >= 3) poly(fl);
  else G.forEach(function (g) { var a = g.P, b = [g.P[0] + g.d[0] * g.len, g.P[1] + g.d[1] * g.len], m = 1100; poly([a, b, [b[0] + g.n[0] * m, b[1] + g.n[1] * m], [a[0] + g.n[0] * m, a[1] + g.n[1] * m]]); });   // a strip of floor in front of the furniture
  // soft floor shadow under each standing piece
  placed(proj).forEach(function (o) { if (level(o.c) === 'wall') return; var g = G[o.it.wall], a = o.it.x + cabW(o.c) / 2, b = cabD(o.c) / 2, p = [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b], q = P3(p[0], p[1], 0), r = Math.max(cabW(o.c), cabD(o.c)) * 0.62 * C.d3.k;
    ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(1, 0.42); var gr = ctx.createRadialGradient(0, 0, 2, 0, 0, r); gr.addColorStop(0, 'rgba(30,42,34,.20)'); gr.addColorStop(1, 'rgba(30,42,34,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var frame = ctx.getImageData(0, 0, PW, PH), px = frame.data, depth = new Float32Array(PW * PH), ids = new Int16Array(PW * PH);
  depth.fill(Infinity); ids.fill(-1);
  var Q = C.d3, left = [-Q.ct, -Q.st, 0], light = r3unit([-sc.depthDir[0] + 0.4 * left[0], -sc.depthDir[1] + 0.4 * left[1], -sc.depthDir[2] + 0.9]);
  var sel = C.o.sel, prob = problems(proj), badCab = {}; placed(proj).forEach(function (o) { if (prob.bad[o.c.id]) badCab[o.i] = 1; });
  sc.faces.filter(function (f) { return !f.alpha; }).concat(sc.faces.filter(function (f) { return f.alpha; })).forEach(function (f) {   // glass after everything else, seen through
    if (r3dot(f.n, sc.depthDir) > -0.00001) return;   // facing away
    var pts = f.p.map(function (p) { var q = P3(p[0], p[1], p[2]); return [q[0] * ratio, q[1] * ratio, q[2]]; });
    var rgb = f.color.match(/[a-f\d]{2}/gi).map(function (x) { return parseInt(x, 16); });
    if (f.cab != null && badCab[f.cab]) rgb = [rgb[0] * 0.8 + 180 * 0.2, rgb[1] * 0.8 + 41 * 0.2, rgb[2] * 0.8 + 31 * 0.2];
    var lit = 0.64 + 0.36 * Math.max(0, r3dot(f.n, light));
    var SMP = f.tx && window.DBLook ? window.DBLook.sampler(f.tx, C.d3.k * ratio * Math.sqrt(Math.max(0.08, Math.abs(r3dot(f.n, sc.depthDir))))) : null;   // screen pixels per mm on this face
    var tint = f.cab != null && badCab[f.cab];
    var edges = pts.map(function (p, i) { var q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dy = q[1] - p[1]; return [p[0], p[1], dx, dy, 1 / (Math.hypot(dx, dy) || 1), (p[1] + q[1]) / 2]; });
    var cy = pts.reduce(function (s, p) { return s + p[1]; }, 0) / pts.length;
    for (var k = 1; k < pts.length - 1; k++) {
      var a = pts[0], b = pts[k], cc = pts[k + 1], den = (b[1] - cc[1]) * (a[0] - cc[0]) + (cc[0] - b[0]) * (a[1] - cc[1]); if (Math.abs(den) < 0.0001) continue;
      var x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], cc[0]))), x1 = Math.min(PW - 1, Math.ceil(Math.max(a[0], b[0], cc[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], cc[1]))), y1 = Math.min(PH - 1, Math.ceil(Math.max(a[1], b[1], cc[1])));
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
        var sx = x + 0.5, sy = y + 0.5, u = ((b[1] - cc[1]) * (sx - cc[0]) + (cc[0] - b[0]) * (sy - cc[1])) / den, v = ((cc[1] - a[1]) * (sx - cc[0]) + (a[0] - cc[0]) * (sy - cc[1])) / den, ww = 1 - u - v;
        if (u < -0.00001 || v < -0.00001 || ww < -0.00001) continue;
        var z = u * a[2] + v * b[2] + ww * cc[2], idx = y * PW + x; if (z >= depth[idx]) continue;
        if (f.alpha) { var ao = idx * 4, al = f.alpha * (0.85 + 0.15 * lit), sky = px[ao + 3] < 8; if (sky) { px[ao] = 226; px[ao + 1] = 236; px[ao + 2] = 242; }   // nothing behind the glass: the sky
          px[ao] = px[ao] * (1 - al) + rgb[0] * al; px[ao + 1] = px[ao + 1] * (1 - al) + rgb[1] * al; px[ao + 2] = px[ao + 2] * (1 - al) + rgb[2] * al; px[ao + 3] = 255; ids[idx] = 10000 + f.op; continue; }
        depth[idx] = z; ids[idx] = f.cab != null ? f.cab : f.op != null ? 10000 + f.op : -1;
        var fct = lit, hi = 0;
        var cR = rgb[0], cG = rgb[1], cB = rgb[2];
        if (SMP) { var cv = SMP(u * f.p[0][0] + v * f.p[k][0] + ww * f.p[k + 1][0], u * f.p[0][1] + v * f.p[k][1] + ww * f.p[k + 1][1], u * f.p[0][2] + v * f.p[k][2] + ww * f.p[k + 1][2]);
          cR = cv >> 16 & 255; cG = cv >> 8 & 255; cB = cv & 255; if (tint) { cR = cR * 0.8 + 36; cG = cG * 0.8 + 8.2; cB = cB * 0.8 + 6.2; } }
        else if (f.wood) { var wx = u * f.p[0][0] + v * f.p[k][0] + ww * f.p[k + 1][0], wy = u * f.p[0][1] + v * f.p[k][1] + ww * f.p[k + 1][1], wz = u * f.p[0][2] + v * f.p[k][2] + ww * f.p[k + 1][2]; fct += 0.025 * Math.sin(wx * 0.65 + wy * 0.12 + Math.sin(wz * 0.016) * 0.9); }
        var ed = Infinity, up = false; for (var e = 0; e < edges.length; e++) { var E = edges[e], dd = Math.abs(E[2] * (sy - E[1]) - E[3] * (sx - E[0])) * E[4]; if (dd < ed) { ed = dd; up = E[5] < cy; } }
        if (ed < (f.front ? 0.85 : 0.4) * ratio) { if (f.front) { fct *= up ? 1 : 0.58; hi = up ? 22 : 0; } else fct *= 0.86; }
        var off = idx * 4; px[off] = Math.min(255, cR * fct + hi); px[off + 1] = Math.min(255, cG * fct + hi); px[off + 2] = Math.min(255, cB * fct + hi); px[off + 3] = 255;
      }
    }
  });
  ctx.putImageData(frame, 0, 0);
  R3 = { ids:ids, PW:PW, ratio:ratio };
  // overlay: the selected piece outlined, numbers, legend
  var s = '';
  placed(proj).forEach(function (o) {
    var c = o.c, it = o.it, g = G[it.wall], D0 = cabD(c), z0 = z0Of(c, it, L);
    var tr = function (p) { var a = it.x + p[0], b = D0 - p[1]; return P3(g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b, z0 + p[2]); };
    if (o.i === sel || badCab[o.i]) {
      var pts = []; [0, cabW(c)].forEach(function (x) { [0, D0].forEach(function (y) { [0, cabH(c)].forEach(function (z) { pts.push(tr([x, y, z])); }); }); });
      sideP(c).forEach(function (q) { [q.x0, q.x1].forEach(function (x) { [q.y0, q.y1].forEach(function (y) { [q.z0, q.z1].forEach(function (z) { pts.push(tr([x, y, z])); }); }); }); });   // its side panels too
      var hull = r3hull(pts);
      s += '<polygon class="rm3-sel' + (o.i === sel ? '' : ' bad') + '" points="' + hull.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>';
    }
    var t = tr([cabW(c) / 2, -10, cabH(c) * 0.86]), tx = Math.round(t[0] * ratio), ty = Math.round(t[1] * ratio);
    var hidden = tx >= 0 && ty >= 0 && tx < PW && ty < PH && depth[ty * PW + tx] < t[2] - 5 && ids[ty * PW + tx] !== o.i;   // the number's spot is behind another piece: not shown
    if (cabW(c) * C.d3.k > 22 && (!hidden || o.i === sel)) s += '<g class="rm3-num' + (o.i === sel ? ' sel' : '') + '"><circle class="rm-no" cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="9"/><text class="rm-not" x="' + t[0].toFixed(1) + '" y="' + (t[1] + 3.5).toFixed(1) + '" text-anchor="middle">' + (o.i + 1) + '</text></g>';
  });
  opsOf(L).forEach(function (op) {
    var g = G[op.wall]; if (!g || !(op.id === V.osel || (prob.badOp && prob.badOp[op.id]))) return;
    if (r3dot([g.n[0], -g.n[1], 0], sc.depthDir) > -0.05) return;   // its wall is left out of this view
    var r = opRange(op, C.o.proj.layout), pts = []; [r.a, r.b].forEach(function (x) { [-20, 60].forEach(function (y) { [isDoor(op) ? 0 : op.z - 25, r.z1].forEach(function (z) { pts.push(P3(g.P[0] + g.d[0] * x - g.n[0] * y, g.P[1] + g.d[1] * x - g.n[1] * y, z)); }); }); });
    s += '<polygon class="rm3-sel' + (op.id === V.osel ? '' : ' bad') + '" points="' + r3hull(pts).map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>';
  });
  ptsOf(L).forEach(function (pt) {
    var g = G[pt.wall]; if (!g || !(pt.id === V.psel || (prob.badPt && prob.badPt[pt.id]))) return;
    if (r3dot([g.n[0], -g.n[1], 0], sc.depthDir) > -0.05) return;
    var b2 = ptBox(pt), pts = []; [b2.a - 40, b2.b + 40].forEach(function (x) { [-100, 0].forEach(function (y) { [b2.z0 - 40, b2.z1 + 40].forEach(function (z) { pts.push(P3(g.P[0] + g.d[0] * x - g.n[0] * y, g.P[1] + g.d[1] * x - g.n[1] * y, z)); }); }); });
    s += '<polygon class="rm3-sel' + (pt.id === V.psel ? '' : ' bad') + '" points="' + r3hull(pts).map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>';
  });
  s += '<text class="rm-legend" x="10" y="' + (h - 8) + '">' + esc(T('rm3Leg')) + '</text>';
  if (D && D.tip) s += tip(D.tip);
  st.querySelector('.rm3-over').innerHTML = s;
}
var scene3d = null;
function r3hull(P) {   // convex hull (monotone chain) of screen points
  var p = P.map(function (q) { return [q[0], q[1]]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = [];
  p.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
  for (var i = p.length - 1; i >= 0; i--) { var q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function pick3d(e) {   // which piece is under the pointer (from the depth-buffered frame)
  if (!R3) return null;
  var cv = C.el.querySelector('.rm3-canvas'); if (!cv) return null;
  var r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) * R3.ratio), y = Math.floor((e.clientY - r.top) * R3.ratio);
  if (x < 0 || y < 0 || x >= R3.PW) return null;
  var id = R3.ids[y * R3.PW + x]; return id >= 0 ? id : null;
}

/* ---------------------------------------------------------------- tooltip */
function tip(t) {
  var lines = t.lines, w = Math.min(C.w - 8, Math.max.apply(null, lines.map(function (l) { return l.length; })) * 6.6 + 16), h = lines.length * 15 + 8;
  var x = Math.min(C.w - w - 4, Math.max(4, t.x + 14)), y = Math.max(4, t.y - h - 12);
  return '<g class="rm-tip' + (t.bad ? ' bad' : '') + '"><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h + '" rx="5"/>' +
    lines.map(function (l, i) { return '<text x="' + (x + 8).toFixed(1) + '" y="' + (y + 16 + i * 15).toFixed(1) + '"' + (i ? '' : ' class="b"') + '>' + esc(l) + '</text>'; }).join('') + '</g>';
}


/* ---------------------------------------------------------------- doors and windows: drawing, moving, adding */
function opsShown() { return opsOf(C.o.proj.layout); }
function opById(L, id) { return opsOf(L).filter(function (o) { return o.id === id; })[0] || null; }
var OP_ICON = {
  door:'<rect x="13" y="4" width="28" height="48" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="17" y="8" width="20" height="44" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="32" y1="29" x2="35" y2="29" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  gdoor:'<rect x="13" y="4" width="28" height="48" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="17" y="8" width="20" height="44" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="21" y="13" width="12" height="30" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.2"/><line x1="23" y1="22" x2="28" y2="16" stroke="currentColor" stroke-width="1"/>',
  window:'<rect x="6" y="9" width="42" height="34" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><line x1="27" y1="9" x2="27" y2="43" stroke="currentColor" stroke-width="2"/><rect x="10" y="13" width="13" height="26" fill="currentColor" fill-opacity=".15"/><rect x="31" y="13" width="13" height="26" fill="currentColor" fill-opacity=".15"/><line x1="3" y1="46" x2="51" y2="46" stroke="currentColor" stroke-width="2.4"/>'
};
function opIcon(t) { return '<svg viewBox="0 0 54 54" aria-hidden="true">' + (OP_ICON[t] || '') + '</svg>'; }
function opLabel(t) { return T(t === 'window' ? 'opWin' : t === 'gdoor' ? 'opGDoor' : 'opDoor'); }
function frontOp(op, prob, mode) {   // mode: 'act' (being moved) or 'ghost' (being added)
  var L = C.o.proj.layout, k = C.fr.k, wi = op.wall, X = function (x) { return fX(wi, x); }, f1 = function (v) { return v.toFixed(1); };
  var bad = mode ? !!op.bad : !!(prob.badOp && prob.badOp[op.id]), sel = !mode && V.osel === op.id;
  var R = function (x0, x1, z0, z1, cls, fill) { return '<rect class="' + cls + '" x="' + f1(X(x0)) + '" y="' + f1(fY(z1)) + '" width="' + f1(Math.max(0.5, (x1 - x0) * k)) + '" height="' + f1(Math.max(0.5, (z1 - z0) * k)) + '"' + (fill ? ' style="fill:' + fill + '"' : '') + '/>'; };
  var x0 = op.x, x1 = op.x + op.w, z0 = isDoor(op) ? 0 : op.z, z1 = z0 + op.h, s = '<g class="rm-op ' + (isDoor(op) ? 'door' : 'win') + (sel ? ' sel' : '') + (bad ? ' bad' : '') + (mode ? ' ' + mode : '') + '"' + (mode ? '' : ' data-op="' + esc(op.id) + '"') + '>';
  var glass = function (gx0, gx1, gz0, gz1) { return R(gx0, gx1, gz0, gz1, 'rm-opglass') + ((gx1 - gx0) * k > 14 ? '<line class="rm-opglare" x1="' + f1(X(gx0 + (gx1 - gx0) * 0.2)) + '" y1="' + f1(fY(gz0 + (gz1 - gz0) * 0.42)) + '" x2="' + f1(X(gx0 + (gx1 - gx0) * 0.55)) + '" y2="' + f1(fY(gz0 + (gz1 - gz0) * 0.7)) + '"/>' : ''); };
  if (isDoor(op)) {
    var lx0 = x0 + OP_JAMB, lx1 = x1 - OP_JAMB, lz1 = z1 - OP_JAMB;
    s += R(x0 - OP_CAS, x1 + OP_CAS, 0, z1 + opCasTop(op, L), 'rm-opfr', op.color) + R(lx0, lx1, 0, lz1, 'rm-opleaf', op.color);
    if (op.type === 'gdoor') { var m = Math.max(90, Math.min(140, (lx1 - lx0) * 0.18)); s += glass(lx0 + m, lx1 - m, Math.min(300, lz1 * 0.15), lz1 - Math.min(260, lz1 * 0.13)); }
    var hx = op.hinge === 'R' ? lx0 : lx1, ox = op.hinge === 'R' ? lx1 : lx0;   // the opening sign: from the hinge side's corners to the handle side (where it opens), as on the cabinets
    s += '<path class="rm-opsym" d="M' + f1(X(ox)) + ',' + f1(fY(0)) + ' L' + f1(X(hx)) + ',' + f1(fY(lz1 / 2)) + ' L' + f1(X(ox)) + ',' + f1(fY(lz1)) + '"/>';
    var hd = op.hinge === 'R' ? lx0 + 65 : lx1 - 65, hz = Math.min(1000, lz1 - 200), dir = op.hinge === 'R' ? 1 : -1;
    s += '<line class="rm-ophd" x1="' + f1(X(hd)) + '" y1="' + f1(fY(hz)) + '" x2="' + f1(X(hd + dir * 120)) + '" y2="' + f1(fY(hz)) + '"/>';
  } else {
    s += R(x0 - 30, x1 + 30, z0 - 25, z0, 'rm-opsill') + R(x0, x1, z0, z1, 'rm-opfr', op.color);
    var f = 65, panes = op.w > 1000 ? [[x0 + f, (x0 + x1) / 2 - 40], [(x0 + x1) / 2 + 40, x1 - f]] : [[x0 + f, x1 - f]];
    panes.forEach(function (q) { var sa = Math.min(55, (q[1] - q[0]) / 4); s += R(q[0], q[1], z0 + f, z1 - f, 'rm-opleaf', op.color) + glass(q[0] + sa, q[1] - sa, z0 + f + sa, z1 - f - sa); });
  }
  var cx = X((x0 + x1) / 2), lab = opName(L, op), big = op.w * k > 44;
  if (big) s += '<text class="rm-opt" x="' + f1(cx) + '" y="' + f1(fY(z1) - 5) + '" text-anchor="middle">' + esc(lab) + (op.w * k > 90 ? ' · ' + fm(op.w) + '×' + fm(op.h) : '') + '</text>';
  return s + '<title>' + esc(lab + ' · ' + fm(op.w) + ' × ' + fm(op.h) + (isDoor(op) ? '' : ' · ' + T('opZ') + ' ' + fm(op.z))) + '</title></g>';
}
function planOp(op, prob, mode) {
  var L = C.o.proj.layout, G = geo(L), g = G[op.wall]; if (!g) return '';
  var q = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; }, P = function (v) { return pX(v[0]).toFixed(1) + ',' + pY(v[1]).toFixed(1); };
  var bad = mode ? !!op.bad : !!(prob.badOp && prob.badOp[op.id]), sel = !mode && V.osel === op.id, t = 100, x0 = op.x, x1 = op.x + op.w;
  var ln = function (a, b, cls) { return '<line class="' + cls + '" x1="' + pX(a[0]).toFixed(1) + '" y1="' + pY(a[1]).toFixed(1) + '" x2="' + pX(b[0]).toFixed(1) + '" y2="' + pY(b[1]).toFixed(1) + '"/>'; };
  var s = '<g class="rm-pop ' + (isDoor(op) ? 'door' : 'win') + (sel ? ' sel' : '') + (bad ? ' bad' : '') + (mode ? ' ' + mode : '') + '"' + (mode ? '' : ' data-op="' + esc(op.id) + '"') + '>';
  var lw = op.w - 2 * OP_JAMB, out = op.swing === 'out', reach = isDoor(op) ? lw : 160;
  s += '<polygon class="rm-ophit" points="' + [q(x0 - 40, out ? -t - 20 : -t - 20), q(x1 + 40, -t - 20), q(x1 + 40, out ? 20 : reach), q(x0 - 40, out ? 20 : reach)].map(P).join(' ') + '"/>';   // a wide spot to grab it
  s += '<polygon class="rm-opgap" points="' + [q(x0, 3), q(x1, 3), q(x1, -t - 3), q(x0, -t - 3)].map(P).join(' ') + '"/>' + ln(q(x0, 0), q(x0, -t), 'rm-opjamb') + ln(q(x1, 0), q(x1, -t), 'rm-opjamb');
  if (isDoor(op)) {
    var base = out ? -t : 0, sg = out ? -1 : 1, hA = op.hinge === 'R' ? x1 - OP_JAMB : x0 + OP_JAMB, oA = op.hinge === 'R' ? x0 + OP_JAMB : x1 - OP_JAMB;
    var H0 = q(hA, base), E = q(hA, base + sg * lw), O = q(oA, base), hs = [pX(H0[0]), pY(H0[1])], es = [pX(E[0]), pY(E[1])], os = [pX(O[0]), pY(O[1])];
    var cr = (es[0] - hs[0]) * (os[1] - hs[1]) - (es[1] - hs[1]) * (os[0] - hs[0]), rpx = Math.hypot(es[0] - hs[0], es[1] - hs[1]);
    s += ln(H0, E, 'rm-opleaf2') + '<path class="rm-oparc" d="M' + es[0].toFixed(1) + ',' + es[1].toFixed(1) + ' A' + rpx.toFixed(1) + ',' + rpx.toFixed(1) + ' 0 0 ' + (cr > 0 ? 1 : 0) + ' ' + os[0].toFixed(1) + ',' + os[1].toFixed(1) + '"/>';
    if (op.type === 'gdoor') s += ln(q(hA, base + sg * lw * 0.22), q(hA, base + sg * lw * 0.78), 'rm-opglass2');
  } else s += ln(q(x0, -t * 0.42), q(x1, -t * 0.42), 'rm-opglass2') + ln(q(x0, -t * 0.58), q(x1, -t * 0.58), 'rm-opglass2') + ln(q(x0 - 30, 0), q(x1 + 30, 0), 'rm-opsill2');
  return s + '<title>' + esc(opName(L, op) + ' · ' + fm(op.w) + ' × ' + fm(op.h)) + '</title></g>';
}
/* where an opening snaps on wall wi: the wall ends, its middle, beside a cabinet at its height, beside another opening */
function opSnapCands(proj, op, wi) {
  var L = proj.layout, g = geo(L)[wi], r = opRange(Object.assign({}, op, { x:0 }), L), out = [[-r.a, 'wall'], [g.len - r.b, 'wall'], [(g.len - op.w) / 2, 'mid']];
  placed(proj).forEach(function (o) { if (o.it.wall !== wi || !vOverlap(vRange(o.c, o.it, L), [r.z0, r.z1])) return; out.push([fx0(o.c, o.it.x) - r.b, 'nb']); out.push([fx1(o.c, o.it.x) - r.a, 'nb']); });
  opsOf(L).forEach(function (o2) { if (o2.id === op.id || o2.wall !== wi) return; var r2 = opRange(o2, L); out.push([r2.a - r.b, 'op']); out.push([r2.b - r.a, 'op']); });
  return out;
}
function opSnap(proj, op, wi, x, thr) {
  var best = null; opSnapCands(proj, op, wi).forEach(function (c2) { var d = Math.abs(c2[0] - x); if (d <= thr && (!best || d < best.d)) best = { x:c2[0], d:d, why:c2[1] }; });
  return best ? { x:r1(best.x), why:best.why } : { x:Math.round(x / 5) * 5, why:'' };
}
function probsWithOp(proj, op) {   // the problems as they would be with op where it is now
  var L = proj.layout, keep = L.openings, has = opsOf(L).some(function (o) { return o.id === op.id; });
  L.openings = opsOf(L).map(function (o) { return o.id === op.id ? op : o; }).concat(has ? [] : [op]);
  var pr = problems(proj); L.openings = keep; return pr;
}
/* a free place for a new opening: the wall shown first, the middle of its longest free stretch at the opening's height */
function autoSpotOp(proj, op) {
  var L = proj.layout, G = geo(L), order = []; if (V.view === 'front' && V.wall >= 0 && V.wall < G.length) order.push(V.wall); G.forEach(function (g, i) { if (order.indexOf(i) < 0) order.push(i); });
  var r = opRange(Object.assign({}, op, { x:0 }), L), need = r.b - r.a;
  for (var k = 0; k < order.length; k++) {
    var wi = order[k], len = G[wi].len, taken = [];
    placed(proj).forEach(function (o) { if (o.it.wall === wi && vOverlap(vRange(o.c, o.it, L), [r.z0, r.z1])) taken.push([fx0(o.c, o.it.x), fx1(o.c, o.it.x)]); });
    opsOf(L).forEach(function (o2) { if (o2.wall === wi) { var r2 = opRange(o2, L); taken.push([r2.a, r2.b]); } });
    taken.sort(function (p2, q2) { return p2[0] - q2[0]; }); var free = [], at = 0;
    taken.forEach(function (t2) { if (t2[0] > at) free.push([at, t2[0]]); at = Math.max(at, t2[1]); }); if (len > at) free.push([at, len]);
    var best = null; free.forEach(function (f2) { if (f2[1] - f2[0] >= need && (!best || f2[1] - f2[0] > best[1] - best[0])) best = f2; });
    if (best) return { wall:wi, x:r1(Math.round(((best[0] + best[1]) / 2 - need / 2 - r.a) / 5) * 5) };
  }
  return { wall:order[0], x:r1(Math.max(0, (G[order[0]].len - op.w) / 2)) };
}
function selectOp(id) { V.osel = id; V.psel = null; if (C.o.sel != null) C.o.onSelect(null); else attach(C.el, C.o); }
function addOp(type, wall, x) {
  var proj = C.o.proj, L = proj.layout, op = newOp(type);
  if (wall == null) { var sp = autoSpotOp(proj, op); wall = sp.wall; x = sp.x; }
  op.wall = wall; op.x = x; V.osel = op.id; V.psel = null;
  var name = opName({ openings:opsOf(L).concat([op]) }, op);
  C.o.onLayout(function (p) { p.layout.openings = opsOf(p.layout).concat([op]); }, { sel:null, msg:T('opAdded').replace('{o}', name) });
}
function startOpMove(e, id) {
  var op = opById(C.o.proj.layout, id); if (!op) return;
  var w = wallAt(local(e));
  D = { mode:'opmove', id:id, op:clone(op), orig:clone(op), grab:w && w.wall === op.wall ? w.along - op.x : op.w / 2, x:e.clientX, y:e.clientY, moved:false };
}
function opInspector(op, L, pr) {
  var my = pr.list.filter(function (p2) { return p2.op === op.id || p2.op2 === op.id; }), door = isDoor(op);
  var inp = function (id, f, v) { return '<span><input id="' + id + '" type="text" inputmode="decimal" data-rmo="' + f + '" value="' + fm(v) + '"> mm</span>'; };
  var sel = function (id, f, opts, v) { return '<select id="' + id + '" data-rmo="' + f + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
  return '<aside class="rm-ins"><div class="rm-ih"><b>' + esc(opName(L, op)) + '</b><button type="button" class="btn ghost" data-rm="opdesel" aria-label="' + esc(T('close')) + '">✕</button></div>' +
    '<div class="rm-f"><label for="rm-ot">' + esc(T('opType')) + '</label>' + sel('rm-ot', 'type', OP_T.map(function (t) { return [t, opLabel(t)]; }), op.type) +
    '<label for="rm-ow">' + esc(T('opW')) + '</label>' + inp('rm-ow', 'w', op.w) + '<label for="rm-oh">' + esc(T('opH')) + '</label>' + inp('rm-oh', 'h', op.h) +
    (door ? '' : '<label for="rm-oz">' + esc(T('opZ')) + '</label>' + inp('rm-oz', 'z', op.z)) +
    '<label for="rm-ox">' + esc(T('rmX')) + '</label>' + inp('rm-ox', 'x', op.x) +
    '<label for="rm-owall">' + esc(T('rmWall')) + '</label>' + sel('rm-owall', 'wall', L.walls.map(function (w, k) { return [k, T('rmWall') + ' ' + LETTER[k] + ' · ' + fm(w.len)]; }), op.wall) +
    (door ? '<label for="rm-ohg">' + esc(T('opHinge')) + '</label>' + sel('rm-ohg', 'hinge', [['L', T('opHL')], ['R', T('opHR')]], op.hinge) +
      '<label for="rm-osw">' + esc(T('opSwing')) + '</label>' + sel('rm-osw', 'swing', [['in', T('opIn')], ['out', T('opOut')]], op.swing) : '') +
    '<label for="rm-oc">' + esc(T('opColor')) + '</label><span><input id="rm-oc" type="color" data-rmo="color" value="' + esc(op.color) + '"></span></div>' +
    (my.length ? '<p class="note bad">' + esc(T('opProbShort')) + '</p>' : '') +
    '<p class="note">' + esc(T(door ? 'opNoteD' : 'opNoteW')) + '</p>' +
    '<div class="rm-acts"><button type="button" class="btn ghost danger" data-rm="opdel">' + esc(T('del')) + '</button></div>' +
    '<p class="note">' + esc(T('opKeys')) + '</p></aside>';
}

/* ---------------------------------------------------------------- sockets and pipes: drawing, moving, adding */
var PT_ICON = {
  socket:'<rect x="13" y="13" width="28" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="27" cy="27" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="24" cy="27" r="1.5" fill="currentColor"/><circle cx="30" cy="27" r="1.5" fill="currentColor"/>',
  socket2:'<rect x="4" y="15" width="46" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="27" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="38" cy="27" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="13.5" cy="27" r="1.3" fill="currentColor"/><circle cx="18.5" cy="27" r="1.3" fill="currentColor"/><circle cx="35.5" cy="27" r="1.3" fill="currentColor"/><circle cx="40.5" cy="27" r="1.3" fill="currentColor"/>',
  cold:'<circle cx="27" cy="30" r="9" fill="#2f6fc4" fill-opacity=".85"/><rect x="25" y="8" width="4" height="13" fill="currentColor"/><rect x="18" y="8" width="18" height="4" rx="2" fill="#2f6fc4"/>',
  hot:'<circle cx="27" cy="30" r="9" fill="#c9442e" fill-opacity=".85"/><rect x="25" y="8" width="4" height="13" fill="currentColor"/><rect x="18" y="8" width="18" height="4" rx="2" fill="#c9442e"/>',
  drain:'<circle cx="27" cy="27" r="14" fill="#8b918d" fill-opacity=".8"/><circle cx="27" cy="27" r="8" fill="none" stroke="#fff" stroke-width="2"/>'
};
var LED_ICON = '<svg viewBox="0 0 54 54" aria-hidden="true"><rect x="8" y="12" width="38" height="26" rx="2" fill="#e9e5dc" stroke="#56635b" stroke-width="1.6"/><rect x="10" y="35" width="34" height="4" rx="1.5" fill="#ffd860" stroke="#c99a00"/><path d="M16 42l-3 6M27 42v7M38 42l3 6" stroke="#e0a800" stroke-width="2" stroke-linecap="round"/></svg>';
/* where a dropped LED goes on cabinet i: the edge nearest the pointer (bottom, top, left or right side), in the front view */
function ledSpot(e, m) {
  if (V.view !== 'front' || !C.fr) return null;
  var el = document.elementFromPoint(e.clientX, e.clientY), g = el && el.closest && el.closest('[data-cab]'); if (!g) return null;
  var i = +g.getAttribute('data-cab'), proj = C.o.proj, L = proj.layout, c = proj.cabinets[i], it = c && L.items[c.id]; if (!c || !it || c.dishwasher || c.kind === 'panel' || c.kind === 'box') return null;
  var along = (m[0] - C.fr.ox) / C.fr.k - C.fr.off[it.wall], z = zAt(m), w = cabW(c), h = cabH(c), z0 = z0Of(c, it, L);
  var d = { bottom:z - z0, top:z0 + h - z, L:along - it.x, R:it.x + w - along }, at = 'bottom';
  Object.keys(d).forEach(function (k) { if (d[k] < d[at]) at = k; });
  return { i:i, at:at, side:at === 'bottom' && level(c) === 'wall' ? 'out' : 'in' };
}
function ledAtT(at) { return T({ bottom:'ledBottom', top:'ledTop', L:'ledL', R:'ledR' }[at]); }
function ptIcon(t) { return '<svg viewBox="0 0 54 54" aria-hidden="true">' + (PT_ICON[t] || '') + '</svg>'; }
function ptById(L, id) { return ptsOf(L).filter(function (o) { return o.id === id; })[0] || null; }
function ptSym(pt, cx, cy, k, cls) {   // the symbol, in px at (cx, cy); k: px per mm
  var d = PT_DEF[pt.type] || PT_DEF.socket, f1 = function (v) { return v.toFixed(1); }, s = '';
  if (pt.type === 'socket' || pt.type === 'socket2') {
    var w = Math.max(pt.type === 'socket2' ? 18 : 10, d.w * k), h = Math.max(10, d.h * k), r = h * 0.3;
    s += '<rect class="rm-ptplate" x="' + f1(cx - w / 2) + '" y="' + f1(cy - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="' + f1(h * 0.12) + '"/>';
    (pt.type === 'socket2' ? [cx - w / 4, cx + w / 4] : [cx]).forEach(function (sx) { s += '<circle class="rm-ptsock" cx="' + f1(sx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '"/><circle class="rm-ptpin" cx="' + f1(sx - r * 0.38) + '" cy="' + f1(cy) + '" r="' + f1(Math.max(0.8, r * 0.16)) + '"/><circle class="rm-ptpin" cx="' + f1(sx + r * 0.38) + '" cy="' + f1(cy) + '" r="' + f1(Math.max(0.8, r * 0.16)) + '"/>'; });
  } else { var rr = Math.max(pt.type === 'drain' ? 5.5 : 4.5, d.w / 2 * k); s += '<circle class="rm-ptw ' + pt.type + '" cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(rr) + '"/><circle class="rm-ptin" cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(rr * 0.45) + '"/>'; }
  return s;
}
function frontPt(pt, prob, mode) {
  var L = C.o.proj.layout, k = C.fr.k, cx = fX(pt.wall, pt.x), cy = fY(pt.z), bad = mode ? !!pt.bad : !!(prob.badPt && prob.badPt[pt.id]), sel = !mode && V.psel === pt.id, d = PT_DEF[pt.type] || PT_DEF.socket;
  var hr = Math.max(10, Math.max(d.w, d.h) / 2 * k + 4);
  return '<g class="rm-pt ' + pt.type + (sel ? ' sel' : '') + (bad ? ' bad' : '') + (mode ? ' ' + mode : '') + '"' + (mode ? '' : ' data-pt="' + esc(pt.id) + '"') + '>' +
    (sel || bad || mode ? '<circle class="rm-ptring" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + hr.toFixed(1) + '"/>' : '') + ptSym(pt, cx, cy, k) +
    '<circle class="rm-pthit" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + hr.toFixed(1) + '"/><title>' + esc(ptName(L, pt) + ' · ' + T('rmFromStart').replace('{x}', fm(pt.x)) + ' · ' + T('ptZ') + ' ' + fm(pt.z)) + '</title></g>';
}
function planPt(pt, prob, mode) {
  var L = C.o.proj.layout, g = geo(L)[pt.wall]; if (!g) return '';
  var q = [g.P[0] + g.d[0] * pt.x + g.n[0] * 30, g.P[1] + g.d[1] * pt.x + g.n[1] * 30], cx = pX(q[0]), cy = pY(q[1]), bad = mode ? !!pt.bad : !!(prob.badPt && prob.badPt[pt.id]), sel = !mode && V.psel === pt.id;
  var sym = pt.type === 'socket' || pt.type === 'socket2' ? '<rect class="rm-ptplate" x="' + (cx - (pt.type === 'socket2' ? 7 : 4.5)).toFixed(1) + '" y="' + (cy - 4.5).toFixed(1) + '" width="' + (pt.type === 'socket2' ? 14 : 9) + '" height="9" rx="1.5"/>' :
    '<circle class="rm-ptw ' + pt.type + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (pt.type === 'drain' ? 5.5 : 4.5) + '"/>';
  return '<g class="rm-pt ' + pt.type + (sel ? ' sel' : '') + (bad ? ' bad' : '') + (mode ? ' ' + mode : '') + '"' + (mode ? '' : ' data-pt="' + esc(pt.id) + '"') + '>' + (sel || bad || mode ? '<circle class="rm-ptring" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="10"/>' : '') + sym +
    '<circle class="rm-pthit" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="11"/><title>' + esc(ptName(L, pt) + ' · ' + T('rmFromStart').replace('{x}', fm(pt.x)) + ' · ' + T('ptZ') + ' ' + fm(pt.z)) + '</title></g>';
}
/* where a socket or pipe snaps: the middle of a cabinet on that wall or of the wall, in line with another point, its usual height */
function ptSnap(proj, pt, wi, x, z, thr) {
  var L = proj.layout, g = geo(L)[wi], xs = [[g.len / 2, 'mid']], zs = [[PT_DEF[pt.type].z, 'std']];
  placed(proj).forEach(function (o) { if (o.it.wall === wi && o.c.kind !== 'panel') xs.push([o.it.x + cabW(o.c) / 2, 'cab']); });
  ptsOf(L).forEach(function (o) { if (o.id === pt.id) return; if (o.wall === wi) xs.push([o.x, 'pt']); zs.push([o.z, 'pt']); });
  var bx = null, bz = null; xs.forEach(function (c2) { var d = Math.abs(c2[0] - x); if (d <= thr && (!bx || d < bx.d)) bx = { v:c2[0], d:d, why:c2[1] }; });
  zs.forEach(function (c2) { var d = Math.abs(c2[0] - z); if (d <= thr && (!bz || d < bz.d)) bz = { v:c2[0], d:d, why:c2[1] }; });
  return { x:bx ? r1(bx.v) : Math.round(x / 5) * 5, z:bz ? r1(bz.v) : Math.round(z / 5) * 5, why:bx ? bx.why : bz ? bz.why : '' };
}
function probsWithPt(proj, pt) { var L = proj.layout, keep = L.points, has = ptsOf(L).some(function (o) { return o.id === pt.id; }); L.points = ptsOf(L).map(function (o) { return o.id === pt.id ? pt : o; }).concat(has ? [] : [pt]); var pr = problems(proj); L.points = keep; return pr; }
function autoSpotPt(proj, pt) {   // the wall shown; water and drain under a sink if there is one, else the wall's middle; clear of the other points
  var L = proj.layout, G = geo(L), wi = V.view === 'front' && V.wall >= 0 && V.wall < G.length ? V.wall : 0, x = G[wi].len / 2;
  if (pt.type === 'cold' || pt.type === 'hot' || pt.type === 'drain') { var sink = placed(proj).filter(function (o) { return /kriaukl|sink|plautuv/i.test(o.c.name || ''); })[0]; if (sink) { wi = sink.it.wall; x = sink.it.x + cabW(sink.c) / 2 + (pt.type === 'cold' ? -100 : pt.type === 'hot' ? 100 : 0); } }
  var d0 = PT_DEF[pt.type], taken = function (xx) { return ptsOf(L).some(function (o) { var d1 = PT_DEF[o.type]; return o.wall === wi && Math.abs(o.x - xx) < (d0.w + d1.w) / 2 + 40 && Math.abs(o.z - pt.z) < (d0.h + d1.h) / 2 + 40; }); };
  for (var k = 0; k < 12 && taken(x); k++) x += 160;
  return { wall:wi, x:r1(Math.max(PT_DEF[pt.type].w / 2, Math.min(G[wi].len - PT_DEF[pt.type].w / 2, x))) };
}
function selectPt(id) { V.psel = id; V.osel = null; if (C.o.sel != null) C.o.onSelect(null); else attach(C.el, C.o); }
function addLed(i, spot) {
  var c = C.o.proj.cabinets[i]; if (!c) return;
  var R0 = window.DBEngine && window.DBEngine.R && window.DBEngine.R.led || { from:30, w:16, depth:8 };
  var ls = (c.leds || []).slice(); ls.push({ at:spot.at, side:spot.side || 'in', from:R0.from, ends:'open', w:R0.w, depth:R0.depth });
  C.o.onCab(i, { leds:ls }); if (C.o.toast) C.o.toast(T('ledAdded').replace('{w}', cabName(c, i) + ' · ' + ledAtT(spot.at)));
}
function addPt(type, wall, x, z) {
  var proj = C.o.proj, L = proj.layout, pt = newPt(type);
  if (wall == null) { var sp = autoSpotPt(proj, pt); wall = sp.wall; x = sp.x; }
  pt.wall = wall; pt.x = x; if (z != null) pt.z = z; V.psel = pt.id; V.osel = null;
  var name = ptName({ points:ptsOf(L).concat([pt]) }, pt);
  C.o.onLayout(function (p2) { p2.layout.points = ptsOf(p2.layout).concat([pt]); }, { sel:null, msg:T('opAdded').replace('{o}', name) });
}
function zAt(m) { return C.fr ? (C.fr.base - m[1]) / C.fr.k : 0; }
function startPtMove(e, id) {
  var pt = ptById(C.o.proj.layout, id); if (!pt) return; var m = local(e), w = wallAt(m);
  D = { mode:'ptmove', id:id, pt:clone(pt), gx:w && w.wall === pt.wall ? w.along - pt.x : 0, gz:V.view === 'front' ? zAt(m) - pt.z : 0, x:e.clientX, y:e.clientY, moved:false };
}
function ptInspector(pt, L, pr) {
  var my = pr.list.filter(function (p2) { return p2.pt === pt.id; });
  var inp = function (id, f, v) { return '<span><input id="' + id + '" type="text" inputmode="decimal" data-rmp="' + f + '" value="' + fm(v) + '"> mm</span>'; };
  var sel = function (id, f, opts, v) { return '<select id="' + id + '" data-rmp="' + f + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
  return '<aside class="rm-ins"><div class="rm-ih"><b>' + esc(ptName(L, pt)) + '</b><button type="button" class="btn ghost" data-rm="ptdesel" aria-label="' + esc(T('close')) + '">✕</button></div>' +
    '<div class="rm-f"><label for="rm-pty">' + esc(T('opType')) + '</label>' + sel('rm-pty', 'type', PT_T.map(function (t) { return [t, T(ptLabelKey(t))]; }), pt.type) +
    '<label for="rm-ptx">' + esc(T('ptX')) + '</label>' + inp('rm-ptx', 'x', pt.x) + '<label for="rm-ptz">' + esc(T('ptZ')) + '</label>' + inp('rm-ptz', 'z', pt.z) +
    '<label for="rm-ptw">' + esc(T('rmWall')) + '</label>' + sel('rm-ptw', 'wall', L.walls.map(function (w, k) { return [k, T('rmWall') + ' ' + LETTER[k] + ' · ' + fm(w.len)]; }), pt.wall) + '</div>' +
    (my.length ? '<p class="note bad">' + esc(T('ptProbShort')) + '</p>' : '') + '<p class="note">' + esc(T('ptNote')) + '</p>' +
    '<div class="rm-acts"><button type="button" class="btn ghost danger" data-rm="ptdel">' + esc(T('del')) + '</button></div><p class="note">' + esc(T('ptKeys')) + '</p></aside>';
}
/* ---------------------------------------------------------------- zoom: wheel, touchpad pinch, two fingers, the ± buttons
   Front view and plan: screen = z · fitted picture + p, never smaller than the fitted picture; kept per view (and per wall shown).
   3D: V.z3 and the shift V.px3 / V.py3 from the middle. The page itself is never zoomed or scrolled from the drawing. */
var TP = {}, PZ = null, GZ = null, LT = null;   // touches down, a two-finger pinch, a Safari touchpad pinch, the last tap on the background
function zf() { var key = V.view + (V.view === 'front' ? ':' + V.wall : ''); if (!V.zf || V.zf.key !== key) V.zf = { key:key, z:1, px:0, py:0 }; return V.zf; }
function zClamp(Z) { Z.z = Math.max(1, Math.min(12, Z.z)); Z.px = Math.max(C.w * (1 - Z.z), Math.min(0, Z.px)); Z.py = Math.max(C.h * (1 - Z.z), Math.min(0, Z.py)); }
function zApply(F, ykey) { var Z = zf(); zClamp(Z); if (Z.z === 1) return; F.k *= Z.z; F.ox = Z.z * F.ox + Z.px; F[ykey] = Z.z * F[ykey] + Z.py; }
function zoomBy(f, mx, my, later) {   // f times at the point (mx, my) of the picture
  if (V.view === '3d') { var z1 = V.z3 || 1, z3 = Math.max(0.5, Math.min(8, z1 * f)), kk = z3 / z1, cx = mx - C.w / 2, cy = my - C.h / 2;
    V.px3 = cx * (1 - kk) + (V.px3 || 0) * kk; V.py3 = cy * (1 - kk) + (V.py3 || 0) * kk; V.z3 = z3; }
  else { var Z = zf(), z2 = Math.max(1, Math.min(12, Z.z * f)), k = z2 / Z.z; Z.px = mx - k * (mx - Z.px); Z.py = my - k * (my - Z.py); Z.z = z2; zClamp(Z); }
  if (!later) draw();
}
function panBy(dx, dy, later) { if (V.view === '3d') { V.px3 = (V.px3 || 0) + dx; V.py3 = (V.py3 || 0) + dy; } else { var Z = zf(); Z.px += dx; Z.py += dy; zClamp(Z); } if (!later) draw(); }
function zoomFit() { if (V.view === '3d') { V.z3 = 1; V.px3 = V.py3 = 0; } else V.zf = null; draw(); }
function zoomCtl() {
  return '<div class="rm-zoom" role="group" aria-label="' + esc(T('rmZoom')) + '"><button type="button" data-rm="zin" title="' + esc(T('rmZoomIn')) + '" aria-label="' + esc(T('rmZoomIn')) + '">+</button>' +
    '<button type="button" data-rm="zout" title="' + esc(T('rmZoomOut')) + '" aria-label="' + esc(T('rmZoomOut')) + '">−</button>' +
    '<button type="button" data-rm="zfit" title="' + esc(T('rmZoomFit')) + '" aria-label="' + esc(T('rmZoomFit')) + '">⤢</button></div>';
}
function touchPts() { return Object.keys(TP).slice(0, 2).map(function (k) { return TP[k]; }); }
function pinchAt() { var t = touchPts(), m = local({ clientX:(t[0][0] + t[1][0]) / 2, clientY:(t[0][1] + t[1][1]) / 2 }); return { d:Math.max(1, Math.hypot(t[0][0] - t[1][0], t[0][1] - t[1][1])), m:m }; }

/* ---------------------------------------------------------------- draw */
function draw() {
  if (!C) return;
  var st = C.el.querySelector('.rm-stage'); C.w = st.clientWidth || 800; C.h = Math.round(Math.max(380, Math.min(620, C.w * 0.62)));
  var body;
  if (V.view === 'plan') { planLayout(); body = drawPlan(); }
  else if (V.view === '3d') { setup3d(); render3d(st); st.insertAdjacentHTML('beforeend', zoomCtl()); st.classList.remove('zoomed'); return; }
  else { frontLayout(); body = drawFront(); }
  st.innerHTML = '<svg width="' + C.w + '" height="' + C.h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(T('rmTitle')) + '">' + body + '</svg>' + zoomCtl();
  st.classList.toggle('zoomed', zf().z > 1.001);
}

/* ---------------------------------------------------------------- pointer → room position */
function local(e) { var r = (C.el.querySelector('.rm3-over') || C.el.querySelector('.rm-stage svg')).getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function inStage(e) { var r = C.el.querySelector('.rm-stage').getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
/* where along which wall the pointer is: { wall, along } (mm) */
function wallAt(m) {
  var L = C.o.proj.layout, G = geo(L);
  if (V.view === 'front') {
    var F = C.fr, best = null;
    F.ws.forEach(function (wi) { var a = fX(wi, 0) - GAP * F.k / 2, b = fX(wi, G[wi].len) + GAP * F.k / 2; if (m[0] >= a && m[0] <= b) best = wi; });
    if (best == null) best = m[0] < fX(F.ws[0], 0) ? F.ws[0] : F.ws[F.ws.length - 1];
    return { wall:best, along:(m[0] - fX(best, 0)) / F.k, z:(C.fr.base - m[1]) / F.k };
  }
  var p = [(m[0] - C.pl.ox) / C.pl.k + C.pl.x0, (m[1] - C.pl.oy) / C.pl.k + C.pl.y0], bw = null, bd = 1e9;
  G.forEach(function (g, wi) { var rel = [p[0] - g.P[0], p[1] - g.P[1]], a = rel[0] * g.d[0] + rel[1] * g.d[1], n = rel[0] * g.n[0] + rel[1] * g.n[1];
    var ac = Math.max(0, Math.min(g.len, a)), d = Math.hypot(a - ac, n); if (d < bd) { bd = d; bw = { wall:wi, along:a, dist:d }; } });   // nearest wall line
  return bw;
}
function thrMm() { return 14 / (V.view === 'front' ? C.fr.k : C.pl.k); }

function startMove(e, i) {
  var proj = C.o.proj, c = proj.cabinets[i], it = proj.layout.items[c.id]; if (!it || it.wall < 0) return;
  var w = wallAt(local(e));
  D = { mode:'move', id:c.id, i:i, c:c, it:clone(it), orig:clone(it), grab:w && w.wall === it.wall ? w.along - it.x : cabW(c) / 2, x:e.clientX, y:e.clientY, moved:false };
}
function onMove(e) {
  if (!D || !C) return;
  if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 4) D.moved = true;
  if (D.mode === 'orbit') { if (!D.moved) return; V.th = D.th - (e.clientX - D.x) * 0.008; V.ph = Math.max(0.05, Math.min(1.35, D.ph + (e.clientY - D.y) * 0.006)); draw(); return; }
  if (D.mode === 'bg') { if (D.moved && V.view !== '3d' && zf().z > 1.001) { var Z = zf(); Z.px = D.px0 + e.clientX - D.x; Z.py = D.py0 + e.clientY - D.y; zClamp(Z); draw(); } return; }   // the zoomed drawing slides
  var m = local(e);
  if (D.mode === 'rsz') { if (!D.moved || !C.fr) return; rszMove(m); draw(); return; }
  if (D.mode === 'opmove') {   // a door or window along its wall or to another one
    if (!D.moved) return; var wo = wallAt(m); if (!wo) return;
    var sno = opSnap(C.o.proj, Object.assign({}, D.op, { wall:wo.wall }), wo.wall, wo.along - D.grab, thrMm());
    D.op.wall = wo.wall; D.op.x = sno.x; D.op.bad = !!probsWithOp(C.o.proj, D.op).badOp[D.op.id];
    D.tip = { x:m[0], y:m[1], bad:D.op.bad, lines:[opName(C.o.proj.layout, D.op) + ' → ' + T('rmWall') + ' ' + LETTER[wo.wall], T('rmFromStart').replace('{x}', fm(sno.x)) + (sno.why ? ' · ' + T('rmSnap_' + sno.why) : '')] };
    draw(); return;
  }
  if (D.mode === 'ptmove') {   // a socket or pipe: along the wall (and up and down in the front view)
    if (!D.moved) return; var wp = wallAt(m); if (!wp) return;
    var zp = V.view === 'front' ? zAt(m) - D.gz : D.pt.z, snp = ptSnap(C.o.proj, D.pt, wp.wall, wp.along - (wp.wall === D.pt.wall ? D.gx : 0), zp, thrMm());
    D.pt.wall = wp.wall; D.pt.x = snp.x; D.pt.z = V.view === 'front' ? snp.z : D.pt.z; D.pt.bad = !!probsWithPt(C.o.proj, D.pt).badPt[D.pt.id];
    D.tip = { x:m[0], y:m[1], bad:D.pt.bad, lines:[ptName(C.o.proj.layout, D.pt) + ' → ' + T('rmWall') + ' ' + LETTER[wp.wall], T('rmFromStart').replace('{x}', fm(D.pt.x)) + ' · ' + T('ptZ') + ' ' + fm(D.pt.z)] };
    draw(); return;
  }
  if (D.mode === 'ledadd') {
    moveGhost(e); D.cand = null; D.tip = null;
    if (inStage(e)) { var ls = ledSpot(e, m); if (ls) { D.cand = ls; D.tip = { x:m[0], y:m[1], lines:[cabName(C.o.proj.cabinets[ls.i], ls.i) + ' · LED', ledAtT(ls.at) + ' · ' + T(ls.side === 'out' ? 'ledOut' : 'ledIn')] }; } }
    draw(); return;
  }
  if (D.mode === 'ptadd') {
    moveGhost(e); D.cand = null; D.tip = null;
    if (inStage(e) && V.view !== '3d') { var wq = wallAt(m);
      if (wq && (V.view === 'front' || wq.dist < 1200)) { var npt = newPt(D.type); npt.id = '__new'; npt.wall = wq.wall; var snq = ptSnap(C.o.proj, npt, wq.wall, wq.along, V.view === 'front' ? zAt(m) : npt.z, thrMm()); npt.x = snq.x; npt.z = V.view === 'front' ? snq.z : npt.z;
        npt.bad = !!probsWithPt(C.o.proj, npt).badPt.__new; D.cand = npt; D.tip = { x:m[0], y:m[1], bad:npt.bad, lines:[T(ptLabelKey(D.type)) + ' → ' + T('rmWall') + ' ' + LETTER[wq.wall], T('rmFromStart').replace('{x}', fm(npt.x)) + ' · ' + T('ptZ') + ' ' + fm(npt.z)] }; } }
    draw(); return;
  }
  if (D.mode === 'opadd') {
    moveGhost(e); D.cand = null; D.tip = null;
    if (inStage(e) && V.view !== '3d') { var wa = wallAt(m);
      if (wa && (V.view === 'front' || wa.dist < 1200)) { var nop = newOp(D.type); nop.id = '__new'; nop.wall = wa.wall; var sna = opSnap(C.o.proj, nop, wa.wall, wa.along - nop.w / 2, thrMm()); nop.x = sna.x; nop.bad = !!probsWithOp(C.o.proj, nop).badOp.__new; D.cand = nop;
        D.tip = { x:m[0], y:m[1], bad:nop.bad, lines:[opLabel(D.type) + ' → ' + T('rmWall') + ' ' + LETTER[wa.wall], T('rmFromStart').replace('{x}', fm(sna.x)) + (sna.why ? ' · ' + T('rmSnap_' + sna.why) : '')] }; } }
    draw(); return;
  }
  if (D.mode === 'move') {
    if (!D.moved) return;
    var proj = C.o.proj, w = wallAt(m); if (!w) return;
    var tmp = proj.layout.items[D.id]; proj.layout.items[D.id] = { wall:w.wall, x:0, z:D.orig.z };   // snapping sees the cabinet on its new wall
    var sn = snap(proj, D.c, w.wall, w.along - D.grab, thrMm());
    D.it = { wall:w.wall, x:sn.x, z:D.orig.z }; proj.layout.items[D.id] = D.it;
    var pr = problems(proj); D.bad = !!pr.bad[D.id];
    proj.layout.items[D.id] = tmp;
    var g = gapAroundAt(proj, D.c, D.it);
    D.tip = { x:m[0], y:m[1], bad:D.bad, lines:[cabName(D.c, D.i) + ' → ' + T('rmWall') + ' ' + LETTER[w.wall], T('rmFromStart').replace('{x}', fm(sn.x)) + (g ? ' · ' + T('rmLeftRight').replace('{l}', fm(fx0(D.c, sn.x) - g.x0)).replace('{r}', fm(g.x1 - fx1(D.c, sn.x))) : '') + (sn.why ? ' · ' + T('rmSnap_' + sn.why) : ''), D.bad ? T('rmHit') : ''].filter(Boolean) };
    draw(); return;
  }
  if (D.mode === 'add') {
    moveGhost(e);
    D.cand = null; D.tip = null;
    if (inStage(e) && V.view !== '3d') {
      var w2 = wallAt(m), pr0 = C.o.presets[D.preset];
      if (w2 && (V.view === 'front' || w2.dist < 1200)) {
        var proj2 = C.o.proj, fake = { id:'__new', W:pr0.W, D:pr0.D, H:pr0.H, type:pr0.type, dishwasher:!!pr0.dish, dishWidth:pr0.W, legH:pr0.legH, cnc:{ legs:pr0.legs }, kind:pr0.panel ? 'panel' : undefined };
        proj2.layout.items.__new = { wall:w2.wall, x:0 }; proj2.cabinets.push(fake);
        var sn2 = snap(proj2, fake, w2.wall, w2.along - pr0.W / 2, thrMm());
        proj2.layout.items.__new = { wall:w2.wall, x:sn2.x };
        var g2 = gapAround(proj2, fake), pr2 = problems(proj2), bad = !!pr2.bad.__new, push = 0;
        if (bad && pr0.panel) {   // a panel dropped at a row: would the row move over for it?
          var keep = JSON.stringify(proj2.layout.items); ['L', 'R'].forEach(function (sd) { var rr = makeRoom(proj2, fake, sd); if (rr && rr.moved) push = Math.max(push, rr.moved); });
          if (push && !problems(proj2).bad.__new) bad = false; else push = 0; proj2.layout.items = JSON.parse(keep); }
        var fitW = g2 && bad && g2.w >= 150 && g2.w < pr0.W ? g2.w : null;
        proj2.cabinets.pop(); delete proj2.layout.items.__new;
        D.cand = { wall:w2.wall, x:fitW ? g2.x0 : sn2.x, W:fitW || pr0.W, D:pr0.D, H:pr0.H, lv:pr0.type === 'PAKABINAMOS' ? 'wall' : 'base', legs:pr0.legs ? pr0.legH : 0, bad:bad && !fitW, fit:!!fitW };
        D.tip = { x:m[0], y:m[1], bad:D.cand.bad, lines:[pr0.name + ' → ' + T('rmWall') + ' ' + LETTER[w2.wall] + ' · ' + T('rmFromStart').replace('{x}', fm(D.cand.x)), fitW ? T('rmFitTo').replace('{w}', fm(fitW)) : (D.cand.bad ? T('rmHit') : push ? T('rmPanelPush').replace('{n}', fm(push)) : T('rmDropAdd'))] };
      }
    }
    draw();
  }
}
function gapAroundAt(proj, c, it) { var keep = proj.layout.items[c.id]; proj.layout.items[c.id] = it; var g = gapAround(proj, c); proj.layout.items[c.id] = keep; return g; }
function onUp(e) {
  if (!D || !C) { D = null; return; }
  var d = D; D = null; if (d.ghost) d.ghost.remove();
  if (d.mode === 'orbit') { draw(); return; }   // full-quality frame after turning
  if (d.mode === 'pick') { C.o.onSelect(d.i); return; }
  if (d.mode === 'rsz') {
    if (!d.moved || (Math.abs(d.nW - d.W) < 0.5 && Math.abs(d.nH - d.H) < 0.5 && Math.abs(d.nx - d.x0) < 0.5 && Math.abs(d.nz - d.z0) < 0.5)) { draw(); return; }
    var pa = {}; if (Math.abs(d.nW - d.W) >= 0.5) pa.W = d.nW; if (Math.abs(d.nH - d.H) >= 0.5) pa.H = d.nH;
    C.o.onCab(d.i, pa, function (p) { var q = p.layout.items[d.id]; if (!q) return; if (d.sd === 'l') q.x = d.nx; if (d.sd === 'b') q.z = d.nz; });
    if (d.bad) C.o.toast(T('rmHitDrop'), true);
    return;
  }
  if (d.mode === 'move') {
    if (!d.moved) { C.o.onSelect(d.i); return; }
    C.o.onLayout(function (proj) { proj.layout.items[d.id] = { wall:d.it.wall, x:d.it.x, z:d.orig.z }; }, { sel:d.i, msg:d.bad ? T('rmHitDrop') : '' });
    return;
  }
  if (d.mode === 'ptmove') {
    if (!d.moved) { selectPt(d.id); return; }
    V.psel = d.id; V.osel = null; C.o.onLayout(function (proj) { var o = ptById(proj.layout, d.id); if (o) { o.wall = d.pt.wall; o.x = d.pt.x; o.z = d.pt.z; } }, { sel:null, msg:d.pt.bad ? T('opHitDrop') : '' });
    return;
  }
  if (d.mode === 'ledadd') {
    if (!d.cand) { draw(); if (d.moved && C.o.toast) C.o.toast(T('ledMiss')); return; }
    addLed(d.cand.i, d.cand); return;
  }
  if (d.mode === 'ptadd') {
    if (!d.cand) { draw(); if (d.moved && C.o.toast) C.o.toast(T(V.view === '3d' ? 'rmNo3dDrop' : 'rmMiss')); return; }
    addPt(d.type, d.cand.wall, d.cand.x, d.cand.z); return;
  }
  if (d.mode === 'opmove') {
    if (!d.moved) { selectOp(d.id); return; }
    V.osel = d.id; C.o.onLayout(function (proj) { var o = opById(proj.layout, d.id); if (o) { o.wall = d.op.wall; o.x = d.op.x; } }, { sel:null, msg:d.op.bad ? T('opHitDrop') : '' });
    return;
  }
  if (d.mode === 'opadd') {
    if (!d.cand) { draw(); if (d.moved && C.o.toast) C.o.toast(T(V.view === '3d' ? 'rmNo3dDrop' : 'rmMiss')); return; }
    addOp(d.type, d.cand.wall, d.cand.x); return;
  }
  if (d.mode === 'add') {
    if (!d.cand) { draw(); if (d.moved && C.o.toast) C.o.toast(T(V.view === '3d' ? 'rmNo3dDrop' : 'rmMiss')); return; }
    C.o.onAdd(d.preset, d.cand.wall, d.cand.x, d.cand.fit ? d.cand.W : null);
  }
}
function moveGhost(e) { if (D && D.ghost) { D.ghost.style.left = e.clientX + 'px'; D.ghost.style.top = e.clientY + 'px'; D.ghost.classList.toggle('on', !!D.cand); } }

/* ---------------------------------------------------------------- side panels */
function bar() {
  var L = C.o.proj.layout, views = [['front', T('rmVFront')], ['plan', T('rmVPlan')], ['3d', '3D']];
  return '<div class="rm-bar"><div class="seg" role="group">' + views.map(function (v) { return '<button type="button" data-rm="view" data-v="' + v[0] + '" class="' + (V.view === v[0] ? 'on' : '') + '" aria-pressed="' + (V.view === v[0]) + '">' + esc(v[1]) + '</button>'; }).join('') + '</div>' +
    (V.view === 'front' && L.walls.length > 1 ? '<div class="seg" role="group" aria-label="' + esc(T('rmWalls')) + '">' + [[-1, T('rmAllWalls')]].concat(L.walls.map(function (w, i) { return [i, LETTER[i]]; })).map(function (v) {
      return '<button type="button" data-rm="wallv" data-v="' + v[0] + '" class="' + (V.wall === v[0] ? 'on' : '') + '">' + esc(v[1]) + '</button>'; }).join('') + '</div>' : '') +
    (V.view === '3d' ? '<span class="unit">' + esc(T('rm3Hint')) + '</span>' : '') +
    '<button type="button" class="btn rm-render" data-rm="render" title="' + esc(T('rrBtnT')) + '">✦ ' + esc(T('rrBtn')) + '</button>' +
    '<button type="button" class="btn" data-rm="undo"' + (C.o.canUndo ? '' : ' disabled') + ' title="Ctrl+Z">↶ ' + esc(T('isoUndo')) + '</button></div>';
}
function palette() {
  var proj = C.o.proj, L = proj.layout, un = proj.cabinets.map(function (c, i) { return { c:c, i:i }; }).filter(function (o) { var it = L.items[o.c.id]; return !it || it.wall < 0 || it.wall >= L.walls.length; });
  return '<aside class="rm-pal"><div class="lbl">' + esc(T('rmAdd')) + '</div><div class="rm-pre">' + C.o.presets.map(function (p, i) {
      return '<button type="button" class="rm-chip" data-pre="' + i + '" title="' + esc(T('rmAddT')) + '">' + p.icon + '<span><b>' + esc(p.name) + '</b><small>' + p.W + '×' + p.H + '×' + p.D + '</small></span></button>'; }).join('') + '</div>' +
    '<div class="lbl" style="margin-top:10px">' + esc(T('rmOpAdd')) + '</div><div class="rm-pre">' + OP_T.map(function (t) {
      return '<button type="button" class="rm-chip rm-opchip" data-opadd="' + t + '" title="' + esc(T('opAddT')) + '">' + opIcon(t) + '<span><b>' + esc(opLabel(t)) + '</b><small>' + OP_DEF[t].w + '×' + OP_DEF[t].h + '</small></span></button>'; }).join('') + '</div>' +
    '<div class="lbl" style="margin-top:10px">' + esc(T('rmPtAdd')) + '</div><div class="rm-pre">' + PT_T.map(function (t) {
      return '<button type="button" class="rm-chip rm-opchip" data-ptadd="' + t + '" title="' + esc(T('ptAddT')) + '">' + ptIcon(t) + '<span><b>' + esc(T(ptLabelKey(t))) + '</b><small>h ' + PT_DEF[t].z + '</small></span></button>'; }).join('') +
      '<button type="button" class="rm-chip rm-opchip" data-ledadd="1" title="' + esc(T('ledAddT')) + '">' + LED_ICON + '<span><b>' + esc(T('ledChip')) + '</b><small>' + esc(T('ledChipS')) + '</small></span></button></div>' +
    (un.length ? '<div class="lbl" style="margin-top:10px">' + esc(T('rmUnplaced')) + '</div><div class="rm-un">' + un.map(function (o) {
      return '<div class="rm-unrow"><span>' + esc(cabName(o.c, o.i)) + '<small>' + fm(cabW(o.c)) + ' mm</small></span><button type="button" class="btn" data-rm="place" data-i="' + o.i + '">' + esc(T('rmPlace')) + '</button></div>'; }).join('') + '</div>' : '') +
    '</aside>';
}
function inspector() {
  var proj = C.o.proj, L = proj.layout, G = geo(L), i = C.o.sel, c = i != null ? proj.cabinets[i] : null, it = c ? L.items[c.id] : null;
  var pr = problems(proj), osel = !c && V.osel ? opById(L, V.osel) : null, psel = !c && V.psel ? ptById(L, V.psel) : null;
  if (osel) return opInspector(osel, L, pr);
  if (psel) return ptInspector(psel, L, pr);
  if (c && it && it.wall >= 0 && it.wall < G.length) {
    var g = gapAround(proj, c), wOpts = L.walls.map(function (w, k) { return '<option value="' + k + '"' + (k === it.wall ? ' selected' : '') + '>' + esc(T('rmWall')) + ' ' + LETTER[k] + ' · ' + fm(w.len) + '</option>'; }).join('');
    var my = pr.list.filter(function (p) { return p.a === i || p.b === i; });
    if (c.kind === 'panel') return panelInspector(c, i, it, L, wOpts, my, pr);
    return '<aside class="rm-ins"><div class="rm-ih"><b>' + esc(cabName(c, i)) + '</b><button type="button" class="btn ghost" data-rm="desel" aria-label="' + esc(T('close')) + '">✕</button></div>' +
      '<div class="rm-f"><label for="rm-w">' + esc(T('W')) + '</label><span><input id="rm-w" type="text" inputmode="decimal" data-rmf="W" value="' + fm(cabW(c)) + '"' + (c.dishwasher ? ' data-dish="1"' : '') + '> mm</span>' +
      '<label for="rm-x">' + esc(T('rmX')) + '</label><span><input id="rm-x" type="text" inputmode="decimal" data-rmf="x" value="' + fm(it.x) + '"> mm</span>' +
      '<label for="rm-wall">' + esc(T('rmWall')) + '</label><select id="rm-wall" data-rmf="wall">' + wOpts + '</select>' +
      (c.dishwasher ? '' : '<label for="rm-hang">' + esc(T('rmHang')) + '</label><span><input id="rm-hang" type="checkbox" data-rmf="hang"' + (level(c) === 'wall' ? ' checked' : '') + '></span>') +
      (level(c) === 'wall' ? '<label for="rm-z">' + esc(T('rmZ')) + '</label><span><input id="rm-z" type="text" inputmode="decimal" data-rmf="z" value="' + fm(z0Of(c, it, L)) + '"> mm</span>' : '') +
      (c.dishwasher ? '' : '<label for="rm-top">' + esc(T('rmTop')) + '</label><span><input id="rm-top" type="text" inputmode="decimal" data-rmf="top" value="' + fm(z0Of(c, it, L) + cabH(c)) + '"> mm</span>' +   // where its top is: the carcass height follows
        '<small class="rm-toph">' + esc((legH(c) && level(c) !== 'wall' ? T('rmTopLegs') : T('rmTopZ')).replace('{h}', fm(cabH(c))).replace('{l}', fm(z0Of(c, it, L)))) + '</small>') + '</div>' +
      (my.length ? '<p class="note bad">' + esc(T(my.every(function (p) { return /^(op|pt)/.test(p.kind); }) ? 'rmOpShort' : 'rmHitShort')) + '</p>' : '') +
      (pr.list.length > my.length ? '<p class="note bad">' + esc(T('rmOtherProbs').replace('{n}', pr.list.length - my.length)) + '</p>' : '') +
      (g && Math.abs(g.cw - cabW(c)) > 0.5 && g.cw >= 100 && g.cw <= 1200 && !c.dishwasher ? '<button type="button" class="btn rm-fill" data-rm="fill">↔ ' + esc(T('rmFill').replace('{w}', fm(g.cw))) + '</button>' : '') +
      sideEditor(c, it, L) + visEditor(c, it, L) + ledList(c) +
      '<div class="rm-acts"><button type="button" class="btn pri" data-rm="edit">✎ ' + esc(T('rmEdit')) + '</button><button type="button" class="btn" data-rm="dup">⧉ ' + esc(T('rmDup')) + '</button>' +
      '<button type="button" class="btn ghost" data-rm="unplace">' + esc(T('rmUnplace')) + '</button><button type="button" class="btn ghost danger" data-rm="del">' + esc(C.o.confirmDel ? T('delSure') : T('del')) + '</button></div>' +
      '<p class="note">' + esc(T('rmKeys')) + '</p>' + (C.o.lookHTML ? C.o.lookHTML(i) : '') + '</aside>';
  }
  var rows = G.map(function (gw, k) {
    var used = placed(proj).filter(function (o) { return o.it.wall === k && level(o.c) !== 'wall'; }).reduce(function (a, o) { return a + cabW(o.c); }, 0);
    return '<div class="rm-wrow"><b>' + LETTER[k] + '</b><span><input type="text" inputmode="decimal" id="rm-len-' + k + '" data-rmwall="' + k + '" value="' + fm(gw.len) + '" aria-label="' + esc(T('rmWall') + ' ' + LETTER[k]) + '"> mm</span><small>' + esc(T('rmUsed').replace('{u}', fm(used))) + '</small>' +
      (k === G.length - 1 && k > 0 ? '<button type="button" class="btn ghost" data-rm="wdel" title="' + esc(T('rmWallDel')) + '">✕</button>' : '<span></span>') + '</div>';
  }).join('');
  return '<aside class="rm-ins"><div class="lbl">' + esc(T('rmRoom')) + '</div><p class="note">' + esc(T('rmRoomL')) + '</p>' +
    '<div class="rm-walls">' + rows + '</div>' + (G.length < 4 ? '<button type="button" class="btn" data-rm="wadd">＋ ' + esc(T('rmWallAdd')) + '</button>' : '') +
    '<div class="rm-f" style="margin-top:10px"><label for="rm-wz">' + esc(T('rmWallZ')) + '</label><span><input id="rm-wz" type="text" inputmode="decimal" data-rml="wallZ" value="' + fm(L.wallZ) + '"> mm</span>' +
    '<label for="rm-rh">' + esc(T('rmRoomH')) + '</label><span><input id="rm-rh" type="text" inputmode="decimal" data-rml="roomH" value="' + fm(L.roomH) + '"> mm</span>' +
    '<label for="rm-wt">' + esc(T('rmWorktop')) + '</label><span><input id="rm-wt" type="checkbox" data-rml="worktop"' + (L.worktop ? ' checked' : '') + '></span></div>' +
    (proj.cabinets.some(function (c) { return wtOf(c); }) ? '' : '<p class="note">' + esc(T('rmWtHint')) + '</p>') +
    (placed(proj).length ? '<div class="rm-visall"><button type="button" class="btn" data-rm="visall">◧ ' + esc(T('rmVisAll')) + '</button><p class="note">' + esc(T('rmVisAllN')) + '</p></div>' : '') +
    (pr.list.length ? '<div class="rm-probs"><div class="lbl">' + esc(T('rmProbs')) + '</div>' + pr.list.map(function (p) {
      if (p.pt) { var pp = ptById(L, p.pt), pn = pp ? ptName(L, pp) : '', po = p.op ? opById(L, p.op) : null;
        return '<button type="button" class="rm-prob" data-rm="ptsel" data-v="' + esc(p.pt) + '">' + esc(T({ ptout:'rmProbPtOut', pthit:'rmProbPtHit', ptside:'rmProbPtSide', ptwt:'rmProbPtWt' }[p.kind]).replace('{o}', pn).replace('{p}', po ? opName(L, po) : '').replace('{a}', p.a + 1)) + '</button>'; }
      if (p.op) { var o1 = opById(L, p.op), o2 = p.op2 ? opById(L, p.op2) : null, on = o1 ? opName(L, o1) : '', on2 = o2 ? opName(L, o2) : '';
        return '<button type="button" class="rm-prob" data-rm="opsel" data-v="' + esc(p.op) + '">' + esc(T({ opout:'rmProbOpOut', opceil:'rmProbOpCeil', ophit:'rmProbOpHit', opblock:'rmProbOpBlock', opswing:'rmProbOpSwing' }[p.kind]).replace('{o}', on).replace('{p}', on2).replace('{a}', p.a + 1)) + '</button>'; }
      return '<button type="button" class="rm-prob" data-rm="sel" data-i="' + p.a + '">' + esc(p.kind === 'out' ? T('rmProbOut').replace('{a}', p.a + 1) : p.kind === 'ceil' ? T('rmProbCeil').replace('{a}', p.a + 1) : p.kind === 'floor' ? T('rmProbFloor').replace('{a}', p.a + 1) : T('rmProbHit').replace('{a}', p.a + 1).replace('{b}', p.b + 1)) + '</button>'; }).join('') + '</div>'
      : '<p class="note ok">✓ ' + esc(T('rmNoProbs')) + '</p>') +
    '<p class="note">' + esc(T('rmHint')) + '</p>' + (spareSides(proj).n ? '<p class="note">' + esc(T('rmSideSpare').replace('{n}', spareSides(proj).n).replace('{s}', spareSides(proj).size)) + '</p>' : '') + (C.o.lookHTML ? C.o.lookHTML(null) : '') + '</aside>';
}
/* a loose panel: thickness, height, depth, where it stands and how high its bottom is, its material */
function panelInspector(c, i, it, L, wOpts, my, pr) {
  var z0 = z0Of(c, it, L), H = +L.roomH > 0 ? +L.roomH : 2600, inp = function (id, f, v) { return '<span><input id="' + id + '" type="text" inputmode="decimal" data-rmf="' + f + '" value="' + fm(v) + '"> mm</span>'; };
  return '<aside class="rm-ins"><div class="rm-ih"><b>' + esc(cabName(c, i)) + '</b><button type="button" class="btn ghost" data-rm="desel" aria-label="' + esc(T('close')) + '">✕</button></div>' +
    '<div class="rm-f"><label for="rm-w">' + esc(T('rmThick')) + '</label>' + inp('rm-w', 'W', cabW(c)) + '<label for="rm-ph">' + esc(T('H')) + '</label>' + inp('rm-ph', 'H', cabH(c)) +
    '<label for="rm-pd">' + esc(T('D')) + '</label>' + inp('rm-pd', 'D', cabD(c)) + '<label for="rm-x">' + esc(T('rmX')) + '</label>' + inp('rm-x', 'x', it.x) +
    '<label for="rm-wall">' + esc(T('rmWall')) + '</label><select id="rm-wall" data-rmf="wall">' + wOpts + '</select>' +
    '<label for="rm-pz">' + esc(T('rmZ')) + '</label>' + inp('rm-pz', 'pz', z0) +
    '<label for="rm-pm">' + esc(T('rmPMat')) + '</label><span><input id="rm-pm" class="rm-pm" type="text" list="dl-mat" data-rmf="pmat" value="' + esc((c.mat && c.mat.carc) || '') + '" autocomplete="off"></span></div>' +
    '<div class="rm-acts">' + (Math.abs(z0 + cabH(c) - H) > 0.5 ? '<button type="button" class="btn" data-rm="pceil">⤒ ' + esc(T('rmToCeil')) + '</button>' : '') + (z0 > 0.5 ? '<button type="button" class="btn" data-rm="pfloor">⤓ ' + esc(T('rmToFloor')) + '</button>' : '') + '</div>' +
    (my.length ? '<p class="note bad">' + esc(T(my.every(function (p) { return /^(op|pt)/.test(p.kind); }) ? 'rmOpShort' : 'rmHitShort')) + '</p>' : '') +
    (pr.list.length > my.length ? '<p class="note bad">' + esc(T('rmOtherProbs').replace('{n}', pr.list.length - my.length)) + '</p>' : '') +
    '<p class="note">' + esc(T('rmPanelNote')) + '</p>' +
    '<div class="rm-acts"><button type="button" class="btn pri" data-rm="edit">✎ ' + esc(T('rmEditP')) + '</button><button type="button" class="btn" data-rm="dup">⧉ ' + esc(T('rmDup')) + '</button>' +
    '<button type="button" class="btn ghost" data-rm="unplace">' + esc(T('rmUnplace')) + '</button><button type="button" class="btn ghost danger" data-rm="del">' + esc(C.o.confirmDel ? T('delSure') : T('del')) + '</button></div>' +
    '<p class="note">' + esc(T('rmKeys')) + '</p>' + (C.o.lookHTML ? C.o.lookHTML(i) : '') + '</aside>';
}
/* side panels of the selected cabinet: height choice, ＋ left / ＋ right, or the one there with ✕ */
/* which carcass sides show: nothing stands against them over the cabinet's full height — another cabinet or a side panel just
   beside it, the other wall in a corner — and no side panel of its own covers them */
function exposedSides(proj, o) {
  var L = proj.layout, G = geo(L), g = G[o.it.wall], c = o.c, it = o.it, out = { L:false, R:false }; if (!g) return out;
  var n = G.length, last = G[n - 1], closed = n >= 3 && Math.hypot(last.P[0] + last.d[0] * last.len - G[0].P[0], last.P[1] + last.d[1] * last.len - G[0].P[1]) < 5;
  var va = vRange(c, it, L), sw = sideW(c), D0 = cabD(c), rc = function (a, b) { return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5; };
  ['L', 'R'].forEach(function (sd) {
    if (sw[sd] > 0) return;   // its own side panel is what shows
    var e = sd === 'L' ? it.x : it.x + cabW(c);
    if (sd === 'L' ? e <= 3 && (it.wall > 0 || closed) : e >= g.len - 3 && (it.wall < n - 1 || closed)) return;   // against the other wall in a corner
    if (sd === 'L' ? e <= 3 : e >= g.len - 3) { out[sd] = true; return; }   // the open end of the walls
    var a0 = sd === 'L' ? e - 25 : e + 1, a1 = sd === 'L' ? e - 1 : e + 25, q = function (a, b) { return [g.P[0] + g.d[0] * a + g.n[0] * b, g.P[1] + g.d[1] * a + g.n[1] * b]; };
    var pts = [q(a0, 20), q(a1, 20), q(a1, D0 - 20), q(a0, D0 - 20)], xs = pts.map(function (v) { return v[0]; }), ys = pts.map(function (v) { return v[1]; });
    var probe = { x0:Math.min.apply(null, xs), x1:Math.max.apply(null, xs), y0:Math.min.apply(null, ys), y1:Math.max.apply(null, ys) }, cover = [];
    placed(proj).forEach(function (o2) { if (o2.i === o.i) return; if (rc(planRect(o2.c, o2.it, G), probe)) cover.push(vRange(o2.c, o2.it, L)); sideRects(o2.c, o2.it, G, L).forEach(function (s2) { if (rc(s2, probe)) cover.push(s2.v); }); });
    cover.sort(function (a, b) { return a[0] - b[0]; }); var z = va[0] + 5; cover.forEach(function (v) { if (v[0] <= z && v[1] > z) z = v[1]; });
    out[sd] = z < va[1] - 5;   // some of it shows (a tall unit beside a base cabinet: above it)
  });
  return out;
}
function ledList(c) {   // this cabinet's LED grooves: where they are, remove one; the details in the cabinet's editor
  if (c.dishwasher || c.kind === 'panel' || c.kind === 'box') return '';
  var ls = c.leds || [];
  return '<div class="rm-visd"><div class="lbl">' + esc(T('ledT')) + '</div>' + (ls.length ? '<div class="rm-ledl">' + ls.map(function (l, k) {
    return '<span class="rm-ledi"><b>' + (k + 1) + '</b>' + esc(ledAtT(l.at) + ' · ' + T(l.side === 'out' ? 'ledOut' : 'ledIn') + ' · ' + fm(l.from) + ' mm') + '<button type="button" class="btn ghost" data-rm="leddel" data-v="' + k + '" aria-label="✕">✕</button></span>'; }).join('') + '</div>' : '<p class="note">' + esc(T('ledAddT')) + '</p>') + '</div>';
}
function visEditor(c, it, L) {
  if (c.dishwasher || c.kind === 'panel' || c.kind === 'box') return '';
  var o = placed(C.o.proj).filter(function (q) { return q.c === c; })[0], ex = o ? exposedSides(C.o.proj, o) : { L:false, R:false }, v = c.vis || {}, hung = level(c) === 'wall';
  var btn = function (k, lab) { var on = !!v[k]; return '<button type="button" data-rm="vis" data-v="' + k + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + esc(lab) + '</button>'; };
  var free = ['L', 'R'].filter(function (k) { return ex[k]; }).map(function (k) { return T(k === 'L' ? 'visL' : 'visR').toLowerCase(); });
  var differ = ['L', 'R'].some(function (k) { return !!ex[k] !== !!v[k]; });
  return '<div class="rm-visd"><div class="lbl">' + esc(T('visT')) + '</div><div class="seg rm-vis" role="group" aria-label="' + esc(T('visT')) + '">' + btn('L', T('visL')) + btn('R', T('visR')) + (hung ? btn('B', T('visB')) : '') + '</div>' +
    (differ ? '<p class="note">' + esc(T('rmVisFree').replace('{s}', free.length ? free.join(', ') : T('rmVisNone'))) + ' <button type="button" class="btn ghost" data-rm="visfit">' + esc(T('rmVisFit')) + '</button></p>' : '') + '</div>';
}
function sideEditor(c, it, L) {
  var sp = (c.extras || []).filter(function (x) { return x && x.kind === 'side' && (x.side === 'L' || x.side === 'R'); });
  var fit = sp.length ? (sp.every(function (x) { return x.fit === sp[0].fit; }) ? sp[0].fit || '' : '') : (V.sideFit[c.id] || sideFitDefault(c, it, L));
  var pan = sideP(c), spare = spareSides(C.o.proj);
  return '<div class="rm-sided"><div class="lbl">' + esc(T('rmSides')) + '</div>' +
    '<div class="seg rm-sidefit" role="group" aria-label="' + esc(T('rmSides')) + '">' + [['cab', T('rmSideCab')], ['floor', T('rmSideFloor')], ['room', T('rmSideRoom')]].map(function (o) {
      return '<button type="button" data-rm="sidefit" data-v="' + o[0] + '" class="' + (fit === o[0] ? 'on' : '') + '" aria-pressed="' + (fit === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>' +
    '<div class="rm-sides">' + ['L', 'R'].map(function (sd) { var mine = pan.filter(function (q) { return q.side === sd; });
      if (!mine.length) return '<button type="button" class="btn" data-rm="sideadd" data-v="' + sd + '">＋ ' + esc(T(sd === 'L' ? 'rmSideL' : 'rmSideR')) + '</button>';
      return '<span class="rm-sidechip"><b>' + esc(T(sd === 'L' ? 'rmSideL' : 'rmSideR')) + '</b><small>' + mine.map(function (q) { return fm(q.H) + ' × ' + fm(q.D) + ' × ' + fm(q.T); }).join(', ') + '</small>' +
        '<button type="button" class="xbtn" data-rm="siderm" data-v="' + sd + '" aria-label="' + esc(T('del') + ' ' + T(sd === 'L' ? 'rmSideL' : 'rmSideR')) + '" title="' + esc(T('del')) + '">✕</button></span>'; }).join('') + '</div>' +
    (spare.n ? '<p class="note">' + esc(T('rmSideSpare').replace('{n}', spare.n).replace('{s}', spare.size)) + '</p>' : '') +
    '<p class="note">' + esc(T('rmSideNote')) + '</p></div>';
}
/* side panels in the project not set at any cabinet (from the offer app's extra boards): ＋ takes them first */
function spareSides(proj) {
  var n = 0, size = ''; (proj.cabinets || []).forEach(function (c) { (c.extras || []).forEach(function (x) { if (!x || x.kind !== 'side' || x.side === 'L' || x.side === 'R') return; var q = x.qty === '' || x.qty == null ? 1 : Math.max(0, Math.round(+x.qty || 0)); if (q > 0) { n += q; if (!size) size = fm(+x.L || 0) + ' × ' + fm(+x.W || 0); } }); });
  return { n:n, size:size };
}
/* a new side panel on side sd of c, as tall as the choice; the cabinets around move over when that makes room, else the problem shows */
function addSide(proj, c, sd) {
  var L = proj.layout, it = L.items[c.id], fit = V.sideFit[c.id] || ((c.extras || []).filter(function (x) { return x && x.kind === 'side' && x.fit; })[0] || {}).fit || sideFitDefault(c, it, L), f = sideFit(c, it, L, fit);
  var src = null; proj.cabinets.some(function (cc) { return (cc.extras || []).some(function (x) { if (x && x.kind === 'side' && x.side !== 'L' && x.side !== 'R' && (x.qty === '' || x.qty == null || +x.qty > 0)) { src = { c:cc, x:x }; return true; } return false; }); });
  var fT = frontT(c), T0 = +(c.cnc && c.cnc.facadeT) || +c.thick || 18;
  var x = { kind:'side', side:sd, fit:fit, name:T('exSide'), L:r1(f.L), W:r1(cabD(c) + fT), T:T0, qty:1, mat:(c.mat && c.mat.facade) || (c.mat && c.mat.carc) || '', e1:true, e2:true, e3:true, e4:true, zb:r1(f.zb), yf:fT };
  if (src) {   // one of the offer's boards: its name, material, thickness and edges; the size from the place
    ['name', 'mat', 'T', 'e1', 'e2', 'e3', 'e4', 'edgeMat'].forEach(function (k) { if (src.x[k] !== undefined && src.x[k] !== '') x[k] = src.x[k]; });
    var q = src.x.qty === '' || src.x.qty == null ? 1 : Math.round(+src.x.qty); if (q > 1) src.x.qty = q - 1; else src.c.extras.splice(src.c.extras.indexOf(src.x), 1);
  }
  c.extras = c.extras || []; c.extras.push(x);
  return makeRoom(proj, c, sd);
}
function makeRoom(proj, c, sd) {   // → { moved:mm } or { short:mm } or {}
  var L = proj.layout, it = L.items[c.id]; if (!it || it.wall < 0) return {};
  var wi = it.wall, len = geo(L)[wi].len, all = placed(proj).filter(function (o) { return o.it.wall === wi; });
  var vr = function (cc) { return vRange(cc, L.items[cc.id], L); }, s0 = function (cc) { return fx0(cc, L.items[cc.id].x); }, s1 = function (cc) { return fx1(cc, L.items[cc.id].x); };
  var mc0 = it.x + cabW(c) / 2, need = sd === 'L' ? cornerIn(proj, wi, c, c.id) - s0(c) : s1(c) - (len - cornerOut(proj, wi, c, c.id));   // how far c (with its panels) runs into what stands on that side, or past the wall end
  all.forEach(function (o) { if (o.c === c || !vOverlap(vr(c), vr(o.c))) return; var mo = (s0(o.c) + s1(o.c)) / 2;
    if (sd === 'L' && mo < mc0) need = Math.max(need, s1(o.c) - s0(c)); if (sd === 'R' && mo > mc0) need = Math.max(need, s1(c) - s0(o.c)); });
  if (need <= 0.05) return {};
  var chain = function (dir, start) {   // start and everything that touches it, one after the other, in direction dir (+1 right, −1 left), at its height
    var list = [start], k = 0;
    while (k < list.length && list.length < 60) { var m = list[k++], e = dir > 0 ? s1(m) : s0(m);
      all.forEach(function (o) { if (list.indexOf(o.c) >= 0 || !vOverlap(vr(m), vr(o.c))) return; if (Math.abs((dir > 0 ? s0(o.c) : s1(o.c)) - e) < 1) list.push(o.c); }); }
    return list; };
  var room = function (list, dir) {   // the least free space past any of them (the wall end, a corner, what stands there at its height)
    var free = Infinity;
    list.forEach(function (m) { var e = dir > 0 ? s1(m) : s0(m), lim = dir > 0 ? len - cornerOut(proj, wi, m, m.id) : cornerIn(proj, wi, m, m.id);
      all.forEach(function (o) { if (list.indexOf(o.c) >= 0 || !vOverlap(vr(m), vr(o.c))) return; if (dir > 0 && s0(o.c) >= e - 0.5) lim = Math.min(lim, s0(o.c)); if (dir < 0 && s1(o.c) <= e + 0.5) lim = Math.max(lim, s1(o.c)); });
      free = Math.min(free, dir > 0 ? lim - e : e - lim); });
    return free; };
  var shift = function (list, d) { list.forEach(function (cc) { L.items[cc.id].x = r1(L.items[cc.id].x + d); }); };
  var away = sd === 'L' ? 1 : -1, own = chain(away, c);   // c and what follows it moves away from the new panel
  if (room(own, away) >= need - 0.05) { shift(own, away * need); return { moved:r1(need) }; }
  var mc = it.x + cabW(c) / 2, other = all.filter(function (o) { var mo = (s0(o.c) + s1(o.c)) / 2; return o.c !== c && vOverlap(vr(c), vr(o.c)) && (sd === 'L' ? s1(o.c) > s0(c) - 1 && mo < mc : s0(o.c) < s1(c) + 1 && mo > mc); }).map(function (o) { return o.c; });   // what stands on that side, reaching into the room needed
  if (other.length) { var oc = []; other.forEach(function (o) { chain(-away, o).forEach(function (m) { if (oc.indexOf(m) < 0) oc.push(m); }); });   // else what stands on the panel's side moves the other way
    if (oc.indexOf(c) < 0 && room(oc, -away) >= need - 0.05) { shift(oc, -away * need); return { moved:r1(need) }; } }
  return { short:r1(need) };
}

/* ---------------------------------------------------------------- events */
function onClick(e) {
  var b = e.target.closest('[data-rm]'); if (!b || !C) return;
  var a = b.getAttribute('data-rm'), v = b.getAttribute('data-v'), proj = C.o.proj, L = proj.layout, i = C.o.sel, c = i != null ? proj.cabinets[i] : null;
  if (a === 'view') { if (v === '3d') { V.z3 = 1; V.px3 = V.py3 = 0; } V.view = v; D = null; attach(C.el, C.o); return; }
  if (a === 'wallv') { V.wall = +v; draw(); C.el.querySelectorAll('[data-rm=wallv]').forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-v') === V.wall); }); return; }
  if (a === 'undo') { C.o.onUndo(); return; }
  if (a === 'zin' || a === 'zout') { zoomBy(a === 'zin' ? 1.5 : 1 / 1.5, C.w / 2, C.h / 2); return; }
  if (a === 'zfit') { zoomFit(); return; }
  if (a === 'render') { if (window.DBRender) window.DBRender.open({ proj:proj, infos:C.o.infos, th:V.th, ph:V.ph, t:C.o.t, onMat:C.o.onMat, mats:C.o.mats }); return; }
  if (a === 'desel') { C.o.onSelect(null); return; }
  if (a === 'sel') { C.o.onSelect(+b.getAttribute('data-i')); return; }
  if (a === 'opsel') { selectOp(v); return; }
  if (a === 'visall') {   // every cabinet: its free sides in the front material (a hung cabinet's bottom stays as it is)
    var want = placed(proj).filter(function (o) { return !(o.c.dishwasher || o.c.kind === 'panel' || o.c.kind === 'box'); }).map(function (o) { return { id:o.c.id, ex:exposedSides(proj, o) }; });
    var nv0 = want.filter(function (w2) { var c2 = proj.cabinets.filter(function (q) { return q.id === w2.id; })[0], was = (c2 && c2.vis) || {}; return !!was.L !== w2.ex.L || !!was.R !== w2.ex.R; }).length;
    C.o.onLayout(function (p2) { want.forEach(function (w2) { var c2 = p2.cabinets.filter(function (q) { return q.id === w2.id; })[0]; if (c2) c2.vis = { L:w2.ex.L, R:w2.ex.R, B:!!(c2.vis && c2.vis.B) }; }); }, { msg:T('rmVisAllDone').replace('{n}', nv0) });
    return; }
  if (a === 'ptsel') { selectPt(v); return; }
  if (a === 'ptdesel') { V.psel = null; attach(C.el, C.o); return; }
  if (a === 'ptdel') { var pd = ptById(L, V.psel); if (!pd) return; var pdn = ptName(L, pd); V.psel = null; C.o.onLayout(function (p2) { p2.layout.points = ptsOf(p2.layout).filter(function (o) { return o.id !== pd.id; }); }, { sel:null, msg:T('opDeleted').replace('{o}', pdn) }); return; }
  if (a === 'opdesel') { V.osel = null; attach(C.el, C.o); return; }
  if (a === 'opdel') { var od = opById(L, V.osel); if (!od) return; var odn = opName(L, od); V.osel = null; C.o.onLayout(function (p) { p.layout.openings = opsOf(p.layout).filter(function (o) { return o.id !== od.id; }); }, { sel:null, msg:T('opDeleted').replace('{o}', odn) }); return; }
  if (a === 'place') { var k = +b.getAttribute('data-i'), cc = proj.cabinets[k]; C.o.onLayout(function (p) { var old = p.layout.items[cc.id], z = old && old.z; delete p.layout.items[cc.id]; var s = autoSpot(p, cc); p.layout.items[cc.id] = { wall:s.wall, x:s.x, z:z }; }, { sel:k }); return; }   // a wall cabinet keeps its height
  if (a === 'wadd') { C.o.onLayout(function (p) { p.layout.walls.push({ len:2400 }); }, {}); return; }
  if (a === 'wdel') { C.o.onLayout(function (p) { var last = p.layout.walls.length - 1; p.layout.walls.pop(); Object.keys(p.layout.items).forEach(function (id) { if (p.layout.items[id].wall === last) p.layout.items[id].wall = -1; }); p.layout.openings = opsOf(p.layout).filter(function (o) { return o.wall !== last; }); p.layout.points = ptsOf(p.layout).filter(function (o) { return o.wall !== last; }); }, { msg:T('rmWallDelDone') }); return; }
  if (!c) return;
  if (a === 'edit') { C.o.onEdit(i); return; }
  if (a === 'dup') { C.o.onDup(i); return; }
  if (a === 'del') { C.o.onDelete(i); return; }
  if (a === 'unplace') { C.o.onLayout(function (p) { p.layout.items[c.id] = { wall:-1, x:0 }; }, { sel:null }); return; }
  if (a === 'leddel') { var lk = (c.leds || []).slice(); lk.splice(+v, 1); C.o.onCab(i, { leds:lk }); return; }
  if (a === 'vis') { var vv = Object.assign({ L:false, R:false, B:false }, c.vis); vv[v] = !vv[v]; C.o.onCab(i, { vis:vv }); return; }
  if (a === 'visfit') { var ob = placed(proj).filter(function (q) { return q.c === c; })[0]; if (!ob) return; var exs = exposedSides(proj, ob); C.o.onCab(i, { vis:{ L:exs.L, R:exs.R, B:!!(c.vis && c.vis.B) } }); return; }
  if (a === 'fill') { var g = gapAround(proj, c); if (!g) return; C.o.onCab(i, { W:g.cw }, function (p) { p.layout.items[c.id].x = g.cx; }); return; }
  if (a === 'pceil' && c.kind === 'panel') { var zc = z0Of(c, L.items[c.id], L), Hc = +L.roomH > 0 ? +L.roomH : 2600; if (Hc - zc >= 30) C.o.onCab(i, { H:r1(Hc - zc) }); return; }   // its top up to the ceiling
  if (a === 'pfloor' && c.kind === 'panel') { var zf = z0Of(c, L.items[c.id], L); C.o.onCab(i, { H:r1(cabH(c) + zf), hang:false }, function (p) { p.layout.items[c.id].z = null; }); return; }   // its bottom down to the floor, its top where it was
  if (a === 'sideadd' && (v === 'L' || v === 'R')) { var res = null; C.o.onLayout(function (p) { res = addSide(p, p.cabinets[i], v); }, { sel:i });
    if (res && res.short) C.o.toast(T('rmSideShort').replace('{n}', fm(res.short)), true); else if (res && res.moved) C.o.toast(T('rmSideMoved').replace('{n}', fm(res.moved))); return; }
  if (a === 'siderm' && (v === 'L' || v === 'R')) { C.o.onLayout(function (p) { var cc = p.cabinets[i]; cc.extras = (cc.extras || []).filter(function (x) { return !(x && x.kind === 'side' && x.side === v); }); }, { sel:i }); return; }
  if (a === 'sidefit') { V.sideFit[c.id] = v; if (!(c.extras || []).some(function (x) { return x && x.kind === 'side' && (x.side === 'L' || x.side === 'R'); })) { attach(C.el, C.o); return; }
    C.o.onLayout(function (p) { var cc = p.cabinets[i]; (cc.extras || []).forEach(function (x) { if (x && x.kind === 'side' && (x.side === 'L' || x.side === 'R')) x.fit = v; }); refit(p); }, { sel:i }); return; }
}
function num(v) {   // as in the cabinet editor: decimal comma and simple sums (600-18); anything else → null
  var t = String(v == null ? '' : v).replace(/\s+/g, '').replace(/,/g, '.'); if (t === '') return null;
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return parseFloat(t);
  if (/^[\d.+\-*\/()]+$/.test(t) && /\d/.test(t)) { try { var r = Function('"use strict";return (' + t.replace(/\b0+(\d)/g, '$1') + ')')(); if (typeof r === 'number' && isFinite(r)) return r; } catch (er) {} }
  return null;
}
function onChange(e) {
  var el = e.target, proj = C.o.proj, L = proj.layout, i = C.o.sel, c = i != null ? proj.cabinets[i] : null;
  if (el.hasAttribute('data-rmwall')) { var k = +el.getAttribute('data-rmwall'), n = num(el.value); if (n == null || n < 300 || n > 20000) { el.value = fm(L.walls[k].len); C.o.toast(T('rmBadVal'), true); return; } C.o.onLayout(function (p) { p.layout.walls[k].len = n; }, {}); return; }
  if (el.hasAttribute('data-rml')) { var f = el.getAttribute('data-rml'); if (f === 'worktop') { C.o.onLayout(function (p) { p.layout.worktop = el.checked; }, {}); return; }
    var n2 = num(el.value); if (n2 == null || n2 < 0 || (f === 'roomH' && n2 < 1000) || (f === 'wallZ' && n2 <= 0)) { el.value = fm(L[f]); C.o.toast(T('rmBadVal'), true); return; } C.o.onLayout(function (p) { p.layout[f] = n2; }, {}); return; }
  if (el.hasAttribute('data-rmp')) {   // a socket's or pipe's field
    var ptc = ptById(L, V.psel); if (!ptc) return; var fp = el.getAttribute('data-rmp'), vp = el.value, pp2 = {};
    if (fp === 'type') { if (!PT_DEF[vp]) return; pp2.type = vp; if (Math.abs(ptc.z - PT_DEF[ptc.type].z) < 0.5) pp2.z = PT_DEF[vp].z; }
    else if (fp === 'wall') { var wn2 = +vp, g2 = geo(L)[wn2]; if (!g2) return; pp2.wall = wn2; pp2.x = r1(Math.max(0, Math.min(ptc.x, g2.len))); }
    else { var np2 = num(vp), lp = { x:[-20000, 20000], z:[0, 5000] }[fp]; if (!lp) return;
      if (np2 == null || np2 < lp[0] || np2 > lp[1]) { el.value = fm(ptc[fp]); C.o.toast(T('rmBadVal'), true); return; } pp2[fp] = np2; }
    C.o.onLayout(function (p2) { var o = ptById(p2.layout, ptc.id); if (o) Object.assign(o, pp2); }, { sel:null }); return;
  }
  if (el.hasAttribute('data-rmo')) {   // a door's or window's field
    var op = opById(L, V.osel); if (!op) return; var fo = el.getAttribute('data-rmo'), vo = el.value, patch = {};
    if (fo === 'type') { if (!OP_DEF[vo]) return; patch.type = vo; if ((vo === 'window') !== (op.type === 'window')) { patch.w = OP_DEF[vo].w; patch.h = OP_DEF[vo].h; patch.z = OP_DEF[vo].z; } if (op.color === OP_DEF[op.type].color) patch.color = OP_DEF[vo].color; }
    else if (fo === 'wall') { var wn = +vo, gl = geo(L)[wn]; if (!gl) return; patch.wall = wn; patch.x = r1(Math.max(0, Math.min(op.x, gl.len - op.w))); }
    else if (fo === 'hinge' || fo === 'swing') patch[fo] = vo;
    else if (fo === 'color') { if (!/^#[0-9a-f]{6}$/i.test(vo)) return; patch.color = vo; }
    else { var no = num(vo), lo = { x:[-20000, 20000], w:[200, 6000], h:[200, 5000], z:[0, 5000] }[fo]; if (!lo) return;
      if (no == null || no < lo[0] || no > lo[1]) { el.value = fm(op[fo]); C.o.toast(T('rmBadVal'), true); return; } patch[fo] = no; }
    C.o.onLayout(function (p) { var o = opById(p.layout, op.id); if (o) Object.assign(o, patch); }, { sel:null }); return;
  }
  if (!c || !el.hasAttribute('data-rmf')) return;
  var fld = el.getAttribute('data-rmf');
  if (c.kind === 'panel' && /^(W|H|D|pz|pmat)$/.test(fld)) {   // a loose panel's own fields
    if (fld === 'pmat') { var mv = String(el.value || '').trim(); C.o.onCab(i, { mat:Object.assign({}, c.mat, { carc:mv, facade:mv }) }); return; }
    var nv = num(el.value), lim = { W:[3, 100], H:[30, 6000], D:[30, 3000], pz:[0, 6000] }[fld];
    if (nv == null || nv < lim[0] || nv > lim[1]) { el.value = fm(fld === 'W' ? cabW(c) : fld === 'H' ? cabH(c) : fld === 'D' ? cabD(c) : z0Of(c, L.items[c.id], L)); C.o.toast(T('rmBadVal'), true); return; }
    if (fld === 'pz') { if (nv <= 0.5) C.o.onCab(i, { hang:false }, function (p) { p.layout.items[c.id].z = null; }); else C.o.onCab(i, { hang:true }, function (p) { p.layout.items[c.id].z = nv; }); return; }   // above the floor: it hangs at that height
    var pt = {}; pt[fld] = nv; C.o.onCab(i, pt); return; }
  if (fld === 'W') { var w = num(el.value); if (w == null || w < 100 || w > 6000) { el.value = fm(cabW(c)); C.o.toast(T('rmBadVal'), true); return; } C.o.onCab(i, c.dishwasher ? { dishWidth:w } : { W:w }); return; }
  if (fld === 'x') { var x = num(el.value); if (x == null || Math.abs(x) > 20000) { el.value = fm(L.items[c.id].x); C.o.toast(T('rmBadVal'), true); return; } C.o.onLayout(function (p) { p.layout.items[c.id].x = x; }, { sel:i }); return; }
  if (fld === 'wall') { C.o.onLayout(function (p) { var s; p.layout.items[c.id] = { wall:+el.value, x:0, z:p.layout.items[c.id].z }; var ends = neighbours(p, c, +el.value).map(function (o) { return o.it.x + cabW(o.c); }); p.layout.items[c.id].x = r1(Math.max(cornerIn(p, +el.value, c, c.id), ends.length ? Math.max.apply(null, ends) : 0)); }, { sel:i }); return; }
  if (fld === 'hang') { C.o.onCab(i, { hang:!!el.checked }); return; }
  if (fld === 'top') { var tp = num(el.value), z0t = z0Of(c, L.items[c.id], L), nh = tp == null ? null : r1(tp - z0t);   // the top from the floor: the carcass gets the height between its bottom and there
    if (nh == null || nh < 100 || nh > 6000) { el.value = fm(z0t + cabH(c)); C.o.toast(T('rmBadVal'), true); return; } C.o.onCab(i, { H:nh }); return; }
  if (fld === 'z') { var z = num(el.value); if ((z == null && el.value.trim() !== '') || (z != null && (z < 0 || z > 10000))) { el.value = fm(z0Of(c, L.items[c.id], L)); C.o.toast(T('rmBadVal'), true); return; } C.o.onLayout(function (p) { p.layout.items[c.id].z = z == null ? null : z; }, { sel:i }); }
}
function onKey(e) {
  if (C && C.o.sel == null && V.psel && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {   // a socket or pipe: arrows move it, Delete takes it away
    var pk = ptById(C.o.proj.layout, V.psel); if (!pk) return;
    if (e.key === 'Delete') { e.preventDefault(); var pkn = ptName(C.o.proj.layout, pk); V.psel = null; C.o.onLayout(function (p2) { p2.layout.points = ptsOf(p2.layout).filter(function (o) { return o.id !== pk.id; }); }, { sel:null, msg:T('opDeleted').replace('{o}', pkn) }); return; }
    var dxk = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, dzk = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0; if (!dxk && !dzk) return; e.preventDefault();
    var stp = e.shiftKey ? 100 : 10, pnx = r1(pk.x + dxk * stp), pnz = r1(Math.max(0, pk.z + dzk * stp));
    C.o.onLayout(function (p2) { var o = ptById(p2.layout, pk.id); if (o) { o.x = pnx; o.z = pnz; } }, { sel:null, focus:true }); return;
  }
  if (C && C.o.sel == null && V.osel && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
    var op = opById(C.o.proj.layout, V.osel); if (!op) return;
    if (e.key === 'Delete') { e.preventDefault(); var dn = opName(C.o.proj.layout, op); V.osel = null; C.o.onLayout(function (p) { p.layout.openings = opsOf(p.layout).filter(function (o) { return o.id !== op.id; }); }, { sel:null, msg:T('opDeleted').replace('{o}', dn) }); return; }
    var so = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!so) return; e.preventDefault();
    var nxo = r1(op.x + so * (e.shiftKey ? 100 : 10)); C.o.onLayout(function (p) { var o = opById(p.layout, op.id); if (o) o.x = nxo; }, { sel:null, focus:true }); return;
  }
  if (!C || C.o.sel == null || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  var proj = C.o.proj, c = proj.cabinets[C.o.sel], it = c && proj.layout.items[c.id]; if (!it || it.wall < 0) return;
  var st = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (e.key === 'Delete') { e.preventDefault(); C.o.onLayout(function (p) { p.layout.items[c.id] = { wall:-1, x:0 }; }, { sel:null, msg:T('rmUnplaced1') }); return; }
  if (!st) return; e.preventDefault();
  var nx = r1(it.x + st * (e.shiftKey ? 100 : 10));
  C.o.onLayout(function (p) { p.layout.items[c.id].x = nx; }, { sel:C.o.sel, focus:true });
}

/* ---------------------------------------------------------------- mount */
function attach(el, o) {
  if (!el) { C = null; return; }
  C = { el:el, o:o }; if (o.sel != null) { V.osel = null; V.psel = null; }
  el.innerHTML = bar() + '<div class="rm-main">' + palette() + '<div class="rm-stage" tabindex="0" aria-label="' + esc(T('rmTitle')) + '"></div>' + inspector() + '</div>';
  draw();
  var stage = el.querySelector('.rm-stage');
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('.rm-zoom')) return;   // the ± buttons are plain buttons
    if (e.pointerType === 'touch') {
      if (e.isPrimary) { TP = {}; PZ = null; }
      TP[e.pointerId] = [e.clientX, e.clientY];
      if (Object.keys(TP).length >= 2) {   // a second finger: the move or turn just begun is dropped, the two fingers zoom and slide
        if (D && D.ghost) D.ghost.remove(); D = null; PZ = pinchAt(); draw();
        try { stage.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); return;
      }
    }
    var cab = e.target.closest('[data-cab]'), opEl = e.target.closest('[data-op]'), ptEl = e.target.closest('[data-pt]'), rsz = e.target.closest('[data-rsz]'), flip = e.target.closest('[data-flip]');
    if (flip && V.view === 'front') { var fp = flip.getAttribute('data-flip').split(':'); e.preventDefault(); C.o.onFlip(+fp[0], +fp[1], fp[2] === '1', fp[3] === '1'); return; }   // a door's opening side
    if (rsz && V.view === 'front') startResize(e, +rsz.getAttribute('data-cab'), rsz.getAttribute('data-rsz'));   // an edge of the selected cabinet
    else if (V.view === '3d') { var k3 = pick3d(e); D = { mode:'orbit', x:e.clientX, y:e.clientY, th:V.th, ph:V.ph, moved:false, cab:k3 }; }
    else if (ptEl) startPtMove(e, ptEl.getAttribute('data-pt'));   // drawn over the cabinets: picked first
    else if (cab) startMove(e, +cab.getAttribute('data-cab'));
    else if (opEl) startOpMove(e, opEl.getAttribute('data-op'));
    else D = { mode:'bg', x:e.clientX, y:e.clientY, moved:false, px0:zf().px, py0:zf().py };
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    stage.focus({ preventScroll:true }); e.preventDefault();
  });
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && TP[e.pointerId]) {
      TP[e.pointerId] = [e.clientX, e.clientY];
      if (PZ) { if (Object.keys(TP).length >= 2) { var q = pinchAt(); panBy(q.m[0] - PZ.m[0], q.m[1] - PZ.m[1], true); zoomBy(q.d / PZ.d, q.m[0], q.m[1]); PZ = q; } return; }
    }
    onMove(e);
  });
  stage.addEventListener('dblclick', function (e) { if (V.view === '3d' && !e.target.closest('.rm-zoom')) zoomFit(); });   // back to the whole room
  stage.addEventListener('wheel', function (e) {   // wheel, or two fingers pinched on a touchpad (ctrl + wheel): the drawing zooms at the pointer, not the page
    if (!C || (V.view === '3d' && !C.d3)) return; e.preventDefault(); if (GZ) return;
    var step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY, m = local(e);
    zoomBy(Math.exp(e.ctrlKey ? -Math.max(-0.5, Math.min(0.5, step * 0.01)) : -step * 0.0015), m[0], m[1]);
  }, { passive:false });
  // Safari on a Mac: a touchpad pinch comes as gesture events (the page would zoom without these)
  stage.addEventListener('gesturestart', function (e) { e.preventDefault(); GZ = { s:1 }; });
  stage.addEventListener('gesturechange', function (e) { e.preventDefault(); if (!GZ || !C || PZ) return; var m = local(e), f = e.scale / (GZ.s || 1); GZ.s = e.scale; if (f > 0 && isFinite(f)) zoomBy(f, m[0], m[1]); });
  stage.addEventListener('gestureend', function (e) { e.preventDefault(); GZ = null; });
  stage.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'touch') { delete TP[e.pointerId]; if (PZ) { if (Object.keys(TP).length < 2) { PZ = null; D = null; } return; } }
    if (D && D.mode === 'orbit' && !D.moved && D.cab != null) { var k = D.cab; D = null; if (k >= 20000) { var p3 = ptsOf(C.o.proj.layout)[k - 20000]; if (p3) selectPt(p3.id); return; } if (k >= 10000) { var o3 = opsOf(C.o.proj.layout)[k - 10000]; if (o3) selectOp(o3.id); return; } C.o.onSelect(k); return; }
    if (D && D.mode === 'bg') { var mv = D.moved; D = null; if (mv) return; V.osel = null; V.psel = null;
      var now = Date.now(); if (LT && now - LT.t < 400 && Math.hypot(e.clientX - LT.x, e.clientY - LT.y) < 14) { LT = null; zoomFit(); return; }   // a double click on the background: the whole drawing again
      LT = { t:now, x:e.clientX, y:e.clientY }; C.o.onSelect(null); return; }
    onUp(e);
  });
  stage.addEventListener('pointercancel', function (e) { if (e.pointerType === 'touch') { delete TP[e.pointerId]; PZ = null; } D = null; draw(); });
  stage.addEventListener('keydown', onKey);
  el.querySelectorAll('[data-ledadd]').forEach(function (ch) {   // the LED strip: dragged onto a cabinet (a click: onto the selected one, at its bottom)
    ch.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      D = { mode:'ledadd', x:e.clientX, y:e.clientY, moved:false };
      var g = document.createElement('div'); g.className = 'rm-ghostcard'; g.innerHTML = LED_ICON + '<b>' + esc(T('ledChip')) + '</b>'; document.body.appendChild(g); D.ghost = g; moveGhost(e);
      try { ch.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    ch.addEventListener('pointermove', function (e) { if (D && D.mode === 'ledadd') onMove(e); });
    ch.addEventListener('pointerup', function (e) { if (!D || D.mode !== 'ledadd') return;
      if (!D.moved) { if (D.ghost) D.ghost.remove(); D = null; var si = C.o.sel, sc = si != null && C.o.proj.cabinets[si];
        if (sc && !sc.dishwasher && sc.kind !== 'panel' && sc.kind !== 'box') addLed(si, { at:'bottom', side:level(sc) === 'wall' ? 'out' : 'in' }); else if (C.o.toast) C.o.toast(T('ledMiss')); return; }
      onUp(e); });
    ch.addEventListener('pointercancel', function () { if (D && D.ghost) D.ghost.remove(); D = null; draw(); });
  });
  el.querySelectorAll('[data-ptadd]').forEach(function (ch) {
    ch.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      var t = ch.getAttribute('data-ptadd'); D = { mode:'ptadd', type:t, x:e.clientX, y:e.clientY, moved:false };
      var g = document.createElement('div'); g.className = 'rm-ghostcard'; g.innerHTML = ptIcon(t) + '<b>' + esc(T(ptLabelKey(t))) + '</b>'; document.body.appendChild(g); D.ghost = g; moveGhost(e);
      try { ch.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    ch.addEventListener('pointermove', function (e) { if (D && D.mode === 'ptadd') onMove(e); });
    ch.addEventListener('pointerup', function (e) { if (!D || D.mode !== 'ptadd') return; if (!D.moved) { var t = D.type; if (D.ghost) D.ghost.remove(); D = null; addPt(t, null, null, null); return; } onUp(e); });
    ch.addEventListener('pointercancel', function () { if (D && D.ghost) D.ghost.remove(); D = null; draw(); });
  });
  el.querySelectorAll('[data-opadd]').forEach(function (ch) {
    ch.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      var t = ch.getAttribute('data-opadd'); D = { mode:'opadd', type:t, x:e.clientX, y:e.clientY, moved:false };
      var g = document.createElement('div'); g.className = 'rm-ghostcard'; g.innerHTML = opIcon(t) + '<b>' + esc(opLabel(t)) + '</b>'; document.body.appendChild(g); D.ghost = g; moveGhost(e);
      try { ch.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    ch.addEventListener('pointermove', function (e) { if (D && D.mode === 'opadd') onMove(e); });
    ch.addEventListener('pointerup', function (e) {
      if (!D || D.mode !== 'opadd') return;
      if (!D.moved) { var t = D.type; if (D.ghost) D.ghost.remove(); D = null; addOp(t, null, null); return; }   // a tap: in the middle of the longest free stretch
      onUp(e);
    });
    ch.addEventListener('pointercancel', function () { if (D && D.ghost) D.ghost.remove(); D = null; draw(); });
  });
  el.querySelectorAll('.rm-chip[data-pre]').forEach(function (ch) {
    ch.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      var k = +ch.getAttribute('data-pre');
      D = { mode:'add', preset:k, x:e.clientX, y:e.clientY, moved:false };
      var g = document.createElement('div'); g.className = 'rm-ghostcard'; g.innerHTML = C.o.presets[k].icon + '<b>' + esc(C.o.presets[k].name) + '</b>'; document.body.appendChild(g); D.ghost = g; moveGhost(e);
      try { ch.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    ch.addEventListener('pointermove', function (e) { if (D && D.mode === 'add') onMove(e); });
    ch.addEventListener('pointerup', function (e) {
      if (!D || D.mode !== 'add') return;
      if (!D.moved) { var k = D.preset; if (D.ghost) D.ghost.remove(); D = null; C.o.onAdd(k, null, null, null); return; }   // a tap adds it after the last cabinet
      onUp(e);
    });
    ch.addEventListener('pointercancel', function () { if (D && D.ghost) D.ghost.remove(); D = null; draw(); });
  });
  if (!el.__rmBound) { el.__rmBound = true; el.addEventListener('click', onClick); el.addEventListener('change', onChange); }
  if (o.focusStage) stage.focus({ preventScroll:true });
  if (window.ResizeObserver) { if (RO) RO.disconnect(); var lw = stage.clientWidth; RO = new ResizeObserver(function () { if (C && C.el === el && Math.abs(stage.clientWidth - lw) > 2) { lw = stage.clientWidth; draw(); } }); RO.observe(stage); }
}

var api = { attach:attach, ensure:ensure, problems:problems, geo:geo, items3d:items3d, snap:snap, gapAround:gapAround, autoSpot:autoSpot, cabW:cabW, cabD:cabD, cabH:cabH, legH:legH, z0Of:z0Of, wtOf:wtOf, placed:placed, level:level, view:V,
            sideP:sideP, sideW:sideW, sideRects:sideRects, addSide:addSide, sideFit:sideFit, refit:refit, makeRoom:makeRoom, _state:function () { return { C:C, D:D }; },
            opsOf:opsOf, opRange:opRange, wallPieces:wallPieces, opParts:opParts, opCasTop:opCasTop, isDoor:isDoor, normOps:normOps, OP_CAS:OP_CAS, OP_JAMB:OP_JAMB,
            ptsOf:ptsOf, ptParts:ptParts, ptBox:ptBox, normPts:normPts, PT_DEF:PT_DEF };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DBRoom = api;
})(typeof window !== 'undefined' ? window : this);

