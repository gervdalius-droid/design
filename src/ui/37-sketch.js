/* 37-sketch.js — drawing on a part the way a CAD sketcher does it.

   The live drawing tool (Detalių operacijos) caught only points: corners, ends, middles, hole centres — and otherwise
   the grid. Here the pointer is caught by everything a sketch is built from, in this order:

     1. points       an end, a corner, a middle, a centre, a circle's quadrant, a hole, where two lines cross,
                     the foot of a perpendicular / the touching point of a tangent from the last point
     2. direction    a line being drawn holds horizontal, vertical, the previous segment's direction or square to it,
                     parallel or square to another drawn line …
     3. on a line    … and where that direction meets a line, an edge or a circle the point lands exactly on it;
                     without a direction: the nearest point of the line / edge / circle
     4. lining up    level with / straight above another point (dashed guide)
     5. the grid

   What was caught is shown at the pointer (a sign and a word), the line it refers to is lit. Alt held: nothing is caught.
   A shape that is dragged is caught by the point it was taken by; a dragged corner also by its own shape's other points.

   build.py PATCHES ('app') route the live tool's snap(), its drawing of the pointer and its dragging through here;
   without this file the live behaviour is back. Coordinates are the part's program frame, as stored. */

var NVS = { px: 12 };   // how near the pointer has to come, in screen pixels

function nvsD(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function nvsOnSeg(P, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; if (l2 < 1e-12) return [a[0], a[1]]; var t = Math.max(0, Math.min(1, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / l2)); return [a[0] + dx * t, a[1] + dy * t]; }
/* where the lines a–b and c–d cross: p, and how far along each (0…1 = within the segment); null when parallel */
function nvsCross(a, b, c, d) {
  var rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx; if (Math.abs(den) < 1e-9) return null;
  var t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return { p: [a[0] + rx * t, a[1] + ry * t], t: t, u: u };
}
/* where the line through a along d (a unit vector) meets a circle; t = how far along */
function nvsLineCirc(a, d, c, r) {
  var fx = a[0] - c[0], fy = a[1] - c[1], b = fx * d[0] + fy * d[1], q = fx * fx + fy * fy - r * r, disc = b * b - q; if (disc < 0) return [];
  var sq = Math.sqrt(disc); return [-b - sq, -b + sq].map(function (t) { return { p: [a[0] + d[0] * t, a[1] + d[1] * t], t: t }; });
}

/* everything of the part and its sketch a point can be caught by */
function nvsEnts(X, exclId, drag) {
  var L = X.p.L, W = X.p.W, pts = [], segs = [], circs = [];
  var pt = function (p, t, al) { pts.push({ p: [p[0], p[1]], t: t, al: al !== false }); };
  var sg = function (a, b, k) { if (nvsD(a, b) > 1e-6) segs.push({ a: [a[0], a[1]], b: [b[0], b[1]], k: k }); };
  var cs = [[0, 0], [L, 0], [L, W], [0, W]];
  cs.forEach(function (q, i) { var n = cs[(i + 1) % 4]; pt(q, 'corner'); sg(q, n, 'edge'); pt([(q[0] + n[0]) / 2, (q[1] + n[1]) / 2], 'mid'); });
  pt([L / 2, W / 2], 'cen');
  X.list.forEach(function (sh) {
    var own = sh.id === exclId, h = own && drag && drag.grip != null && sh.t === 'line' ? +drag.grip : -1;
    if (own && h < 0) return;   // the shape being moved; of a line whose one point is dragged the rest stays to be caught by
    if (sh.t === 'circle') { pt([sh.x, sh.y], 'cen'); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { pt([sh.x + d[0] * sh.r, sh.y + d[1] * sh.r], 'quad'); }); circs.push({ c: [sh.x, sh.y], r: sh.r }); return; }
    var P = sh.t === 'rect' ? [[sh.x, sh.y], [sh.x + sh.w, sh.y], [sh.x + sh.w, sh.y + sh.h], [sh.x, sh.y + sh.h]] : (sh.pts || []), closed = sh.t === 'rect' || (!!sh.closed && P.length > 2);
    P.forEach(function (q, i) {
      if (i !== h) pt(q, 'end');
      var j = i + 1; if (j >= P.length) { if (!closed) return; j = 0; }
      if (i === h || j === h) return;
      sg(q, P[j], 'line'); pt([(q[0] + P[j][0]) / 2, (q[1] + P[j][1]) / 2], 'mid');
    });
    if (sh.t === 'rect') pt([sh.x + sh.w / 2, sh.y + sh.h / 2], 'cen');
  });
  var dr = X.K.draft;   // the line being drawn: its own earlier points (the first one closes it)
  if (dr && dr.pts) dr.pts.forEach(function (q, i) { var n = dr.pts.length; if (i === n - 1) return; pt(q, i === 0 && n > 2 ? 'close' : 'end'); if (i < n - 2) sg(q, dr.pts[i + 1], 'line'); });
  (X.p.holes || []).forEach(function (hh) { if (hh.op !== 'sketch') pt([hh.x, hh.y], 'hole', false); });   // to land on, not to line up with
  return { pts: pts, segs: segs, circs: circs };
}

function nvsOut(p, kind, guides, nv) { return { p: [p[0], p[1]], kind: kind, guides: guides || [], nv: nv || {} }; }

/* where the point lands. P: the pointer, prev: the point before it (a line / rectangle / circle being drawn),
   drag: { move: shape } | { grip: handle, o: shape } while dragging, mm: millimetres per screen pixel, g: the grid */
function nvsSnap(P, X, prev, e, exclId, drag, mm, g) {
  if (!X || !X.p || !S.sk || !isFinite(mm) || !(mm > 0)) return null;
  if (e && e.altKey) return nvsOut(P, 'grid', [], { free: true });
  var tol = NVS.px * mm, en = nvsEnts(X, exclId, drag), dr = X.K.draft, line = !!(prev && dr && dr.t === 'line'), i, j;
  var best = null, take = function (p, t, d, more) { if (d < (best ? best.d : tol)) { best = { p: p, t: t, d: d }; if (more) for (var k in more) best[k] = more[k]; } };

  /* 1. points */
  en.pts.forEach(function (q) { take(q.p, q.t, nvsD(q.p, P)); });
  var Sg = en.segs, far = tol * 3;
  if (Sg.length <= 120) for (i = 0; i < Sg.length; i++) { if (nvsD(nvsOnSeg(P, Sg[i].a, Sg[i].b), P) > far) continue;
    for (j = i + 1; j < Sg.length; j++) { var x = nvsCross(Sg[i].a, Sg[i].b, Sg[j].a, Sg[j].b); if (x && x.t > -1e-9 && x.t < 1 + 1e-9 && x.u > -1e-9 && x.u < 1 + 1e-9) take(x.p, 'int', nvsD(x.p, P) + tol * 0.02); } }
  en.circs.forEach(function (c) { Sg.forEach(function (s) { var l = nvsD(s.a, s.b), d = [(s.b[0] - s.a[0]) / l, (s.b[1] - s.a[1]) / l];
    nvsLineCirc(s.a, d, c.c, c.r).forEach(function (q) { if (q.t > -1e-9 && q.t < l + 1e-9) take(q.p, 'int', nvsD(q.p, P) + tol * 0.02); }); }); });
  if (line) {   // from the last point: square onto a line, touching a circle
    Sg.forEach(function (s) { var dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], t = ((prev[0] - s.a[0]) * dx + (prev[1] - s.a[1]) * dy) / (dx * dx + dy * dy); if (t < -1e-9 || t > 1 + 1e-9) return;
      var f = [s.a[0] + dx * t, s.a[1] + dy * t]; if (nvsD(f, prev) > 1e-6) take(f, 'perp', nvsD(f, P) + tol * 0.2, { ref: s }); });
    en.circs.forEach(function (c) { var d0 = nvsD(prev, c.c); if (d0 <= c.r + 1e-6) return; var a0 = Math.atan2(prev[1] - c.c[1], prev[0] - c.c[0]), da = Math.acos(c.r / d0);
      [a0 + da, a0 - da].forEach(function (a) { var q = [c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)]; take(q, 'tan', nvsD(q, P) + tol * 0.2, { circ: c }); }); });
  }
  if (best) return nvsOut(best.p, 'pt', [], { t: best.t, ref: best.ref, circ: best.circ, from: line ? prev : null });

  /* 2. the direction a line being drawn holds */
  var lock = null;
  if (line) {
    var dirs = [{ d: [1, 0], rel: 'ax' }, { d: [0, 1], rel: 'ax' }], skew = function (u) { return Math.abs(u[0]) > 2e-3 && Math.abs(u[1]) > 2e-3; },
      has = function (u) { return dirs.some(function (D) { return Math.abs(D.d[0] * u[1] - D.d[1] * u[0]) < 2e-3; }); },
      add = function (a, b, r1, r2, ref) { var l = nvsD(a, b); if (l < 1e-6) return; var u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; if (!skew(u) || has(u)) return; dirs.push({ d: u, rel: r1, ref: ref }, { d: [-u[1], u[0]], rel: r2, ref: ref }); };
    var n = dr.pts.length; if (n >= 2) add(dr.pts[n - 2], dr.pts[n - 1], 'ext', 'perp', { a: dr.pts[n - 2], b: dr.pts[n - 1] });
    Sg.forEach(function (s) { if (s.k === 'line' && dirs.length < 14) add(s.a, s.b, 'par', 'perp', s); });
    var v = [P[0] - prev[0], P[1] - prev[1]], len = Math.hypot(v[0], v[1]), shift = !!(e && e.shiftKey);
    if (len > tol * 0.4) dirs.forEach(function (D) { if (shift && D.rel !== 'ax') return;
      var off = Math.abs(v[0] * D.d[1] - v[1] * D.d[0]), lim = shift ? Infinity : Math.min(tol * 0.6, len * (D.rel === 'ax' ? 0.12 : 0.085));   /* ≈ 7° to the axes, 5° to other directions */
      if (off < lim && (!lock || off < lock.off)) lock = { d: D.d, rel: D.rel, ref: D.ref, off: off, al: v[0] * D.d[0] + v[1] * D.d[1] }; });
  }

  /* 3. on a line, an edge, a circle */
  var on = null, tolOn = tol * 0.55;
  Sg.forEach(function (s) { var q = nvsOnSeg(P, s.a, s.b), d = nvsD(q, P); if (d < (on ? on.d : tolOn)) on = { p: q, d: d, seg: s }; });
  en.circs.forEach(function (c) { var d0 = nvsD(P, c.c); if (d0 < 1e-6) return; var d = Math.abs(d0 - c.r); if (d < (on ? on.d : tolOn)) on = { p: [c.c[0] + (P[0] - c.c[0]) * c.r / d0, c.c[1] + (P[1] - c.c[1]) * c.r / d0], d: d, circ: c }; });
  var others = en.pts.filter(function (q) { return q.al; });
  if (lock && on) {   // the held direction, as far as that line
    var hit = null, far2 = [prev[0] + lock.d[0], prev[1] + lock.d[1]];
    if (on.seg) { var xx = nvsCross(prev, far2, on.seg.a, on.seg.b); if (xx && xx.u > -1e-9 && xx.u < 1 + 1e-9 && nvsD(xx.p, P) < tol * 1.5) hit = xx.p; }
    else nvsLineCirc(prev, lock.d, on.circ.c, on.circ.r).forEach(function (q) { if (nvsD(q.p, P) < tol * 1.5 && (!hit || nvsD(q.p, P) < nvsD(hit, P))) hit = q.p; });
    if (hit) return nvsOut(hit, 'pt', [], { t: 'on', rel: lock.rel, d: lock.d, lref: lock.ref, ref: on.seg, circ: on.circ, from: prev });
  }
  if (on && !(lock && lock.off < on.d)) {
    var q0 = on.p, gd = [], s0 = on.seg;
    if (s0) { var hor = Math.abs(s0.a[1] - s0.b[1]) < 1e-9, ver = Math.abs(s0.a[0] - s0.b[0]) < 1e-9;
      if (hor || ver) {   // along an edge or a straight line: level with another point, else whole grid steps
        var k = hor ? 0 : 1, lo = Math.min(s0.a[k], s0.b[k]), hi = Math.max(s0.a[k], s0.b[k]), al0 = null, bd = tol * 0.6;
        others.forEach(function (c) { var d = Math.abs(c.p[k] - P[k]); if (d < bd && c.p[k] > lo - 1e-9 && c.p[k] < hi + 1e-9) { bd = d; al0 = c.p; } });
        var val = Math.max(lo, Math.min(hi, al0 ? al0[k] : Math.round(P[k] / g) * g));
        q0 = hor ? [val, s0.a[1]] : [s0.a[0], val]; if (al0 && nvsD(al0, q0) > 1e-6) gd.push([al0[0], al0[1], q0[0], q0[1]]); } }
    return nvsOut(q0, 'pt', gd, { t: 'on', ref: s0, circ: on.circ, from: line ? prev : null });
  }
  if (lock) {
    var q1, g1 = [];
    if (lock.rel === 'ax') {   // along an axis: the free measure lines up with another point, else goes by the grid
      var k1 = Math.abs(lock.d[0]) > 0.5 ? 0 : 1, h1 = null, b1 = tol * 0.6;
      others.forEach(function (c) { var d = Math.abs(c.p[k1] - P[k1]); if (d < b1) { b1 = d; h1 = c.p; } });
      var v1 = h1 ? h1[k1] : Math.round(P[k1] / g) * g; q1 = k1 === 0 ? [v1, prev[1]] : [prev[0], v1]; if (h1 && nvsD(h1, q1) > 1e-6) g1.push([h1[0], h1[1], q1[0], q1[1]]);
    } else { var al1 = Math.round(lock.al / g) * g; if (!al1) al1 = lock.al; q1 = [prev[0] + lock.d[0] * al1, prev[1] + lock.d[1] * al1]; }
    return nvsOut(q1, 'al', g1, { rel: lock.rel, d: lock.d, lref: lock.ref, from: prev });
  }

  /* 4. level with / straight above another point, 5. the grid */
  var ax = null, ay = null, bx = tol * 0.6, by = tol * 0.6, gds = [];
  others.forEach(function (c) { var dx = Math.abs(c.p[0] - P[0]), dy = Math.abs(c.p[1] - P[1]); if (dx < bx) { bx = dx; ax = c.p; } if (dy < by) { by = dy; ay = c.p; } });
  var x1 = ax ? ax[0] : Math.round(P[0] / g) * g, y1 = ay ? ay[1] : Math.round(P[1] / g) * g;
  if (ax) gds.push([ax[0], ax[1], x1, y1]); if (ay) gds.push([ay[0], ay[1], x1, y1]);
  return nvsOut([x1, y1], ax || ay ? 'al' : 'grid', gds, { from: line ? prev : null });
}

/* a dragged shape is caught by the point it was taken by: the nearest of its ends, middles, corners, centre */
function nvsBase(o, start) {
  var c = [];
  if (o.t === 'circle') c = [[o.x, o.y], [o.x + o.r, o.y], [o.x - o.r, o.y], [o.x, o.y + o.r], [o.x, o.y - o.r]];
  else if (o.t === 'rect') c = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x + o.w / 2, o.y], [o.x + o.w / 2, o.y + o.h], [o.x, o.y + o.h / 2], [o.x + o.w, o.y + o.h / 2], [o.x + o.w / 2, o.y + o.h / 2]];
  else (o.pts || []).forEach(function (q, i) { c.push(q); var n = o.pts[i + 1] || (o.closed && o.pts.length > 2 ? o.pts[0] : null); if (n) c.push([(q[0] + n[0]) / 2, (q[1] + n[1]) / 2]); });
  var b = null, bd = Infinity; c.forEach(function (q) { var d = nvsD(q, start); if (d < bd) { bd = d; b = q; } });
  return b ? [b[0], b[1]] : null;
}

var NVS_NAME = { end: ['Galas', 'Endpoint'], corner: ['Kampas', 'Corner'], close: ['Uždaryti kontūrą', 'Close the outline'], mid: ['Vidurys', 'Midpoint'], cen: ['Centras', 'Centre'], quad: ['Kvadrantas', 'Quadrant'],
  hole: ['Skylė', 'Hole'], int: ['Sankirta', 'Intersection'], perp: ['Statmenai', 'Perpendicular'], tan: ['Liestinė', 'Tangent'], on: ['Ant linijos', 'On the line'], onEdge: ['Ant krašto', 'On the edge'], onCirc: ['Ant apskritimo', 'On the circle'],
  H: ['Horizontaliai', 'Horizontal'], V: ['Vertikaliai', 'Vertical'], ext: ['Tęsinys', 'Extension'], par: ['Lygiagrečiai', 'Parallel'], relPerp: ['Statmenai', 'Perpendicular'], free: ['Laisvai', 'Free'] };

/* what was caught, drawn at the pointer. u: one hundredth of the view, sP: program point → the drawing's coordinates */
function nvsMarks(X, info, cur, u, sP, D) {
  if (!info || !info.nv || !S.sk) return '';
  var dragging = !!(D && (D.mode === 'move' || D.mode === 'grip') && D.moved);
  if (S.sk.tool === 'sel' ? !dragging : !cur) return '';
  var sv0 = document.querySelector('.sk-svg'), m0 = sv0 && sv0.getScreenCTM(), px = m0 && m0.a ? 1 / m0.a : u / 4;   // one screen pixel, in the drawing's units: signs and words keep their size at any zoom
  var nv = info.nv, q = info.p, C = sP(q), s = '', en = S.lang === 'en' ? 1 : 0, pe = ' vector-effect="non-scaling-stroke" pointer-events="none"', Y = '#e8a200', G = '#1f7a4d';
  var ln = function (a, b, st) { var A = sP(a), B = sP(b); return '<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '"' + st + pe + '/>'; };
  [nv.ref, nv.lref].forEach(function (r) { if (r) s += ln(r.a, r.b, ' stroke="' + Y + '" stroke-width="3.5" stroke-opacity=".8" stroke-linecap="round"'); });
  if (nv.circ) { var c0 = sP(nv.circ.c); s += '<circle cx="' + c0[0] + '" cy="' + c0[1] + '" r="' + skR(nv.circ.r) + '" fill="none" stroke="' + Y + '" stroke-width="3.5" stroke-opacity=".8"' + pe + '/>'; }
  var words = [];
  if (nv.rel && nv.d && nv.from) {   // the held direction, drawn on past the point
    var k = px * 46, sg = nv.d[0] * (q[0] - nv.from[0]) + nv.d[1] * (q[1] - nv.from[1]) < 0 ? -1 : 1;
    s += ln(nv.from, [q[0] + nv.d[0] * sg * k, q[1] + nv.d[1] * sg * k], ' stroke="' + G + '" stroke-width="1" stroke-dasharray="6 4"');
    if (nv.rel === 'ax') { var A0 = X.F.to(0, 0), A1 = X.F.to(nv.d[0], nv.d[1]); words.push(NVS_NAME[Math.abs(A1[0] - A0[0]) > Math.abs(A1[1] - A0[1]) ? 'H' : 'V'][en]); }
    else words.push(NVS_NAME[nv.rel === 'perp' ? 'relPerp' : nv.rel][en]);
  }
  var h = px * 5.5, st = ' fill="#fff" stroke="' + G + '" stroke-width="2"' + pe, t = nv.t, x = C[0], y = C[1], R1 = function (v) { return Math.round(v * 100) / 100; };
  if (t === 'end' || t === 'corner' || t === 'close') s += '<circle cx="' + x + '" cy="' + y + '" r="' + R1(h) + '"' + st + '/><circle cx="' + x + '" cy="' + y + '" r="' + R1(h * 0.35) + '" fill="' + G + '" pointer-events="none"/>';
  else if (t === 'mid') s += '<path d="M' + R1(x - h) + ' ' + R1(y + h * 0.8) + 'L' + R1(x + h) + ' ' + R1(y + h * 0.8) + 'L' + x + ' ' + R1(y - h) + 'Z"' + st + '/>';
  else if (t === 'cen' || t === 'hole') s += '<circle cx="' + x + '" cy="' + y + '" r="' + R1(h) + '"' + st + '/><path d="M' + R1(x - h * 1.5) + ' ' + y + 'h' + R1(h * 3) + 'M' + x + ' ' + R1(y - h * 1.5) + 'v' + R1(h * 3) + '" stroke="' + G + '" stroke-width="1.5"' + pe + '/>';
  else if (t === 'quad') s += '<path d="M' + R1(x - h) + ' ' + y + 'L' + x + ' ' + R1(y - h) + 'L' + R1(x + h) + ' ' + y + 'L' + x + ' ' + R1(y + h) + 'Z"' + st + '/>';
  else if (t === 'int') s += '<path d="M' + R1(x - h) + ' ' + R1(y - h) + 'L' + R1(x + h) + ' ' + R1(y + h) + 'M' + R1(x - h) + ' ' + R1(y + h) + 'L' + R1(x + h) + ' ' + R1(y - h) + '" fill="none" stroke="' + G + '" stroke-width="2.6"' + pe + '/>';
  else if (t === 'perp') s += '<path d="M' + R1(x - h) + ' ' + R1(y + h) + 'h' + R1(2 * h) + 'M' + x + ' ' + R1(y + h) + 'v' + R1(-2 * h) + '" fill="none" stroke="' + G + '" stroke-width="2.6"' + pe + '/>';
  else if (t === 'tan' || t === 'on') s += '<circle cx="' + x + '" cy="' + y + '" r="' + R1(h * 0.6) + '" fill="' + G + '" stroke="#fff" stroke-width="1.5"' + pe + '/>';
  if (t) words.unshift(NVS_NAME[t === 'on' ? (nv.circ ? 'onCirc' : nv.ref && nv.ref.k === 'edge' ? 'onEdge' : 'on') : t][en]);
  if (nv.free) words.push(NVS_NAME.free[en]);
  if (words.length) {   // the word, beside the pointer
    var txt = words.join(' · '), fz = px * 12.5, w = txt.length * fz * 0.56 + fz * 0.9, V = S.sk.view, tx = x + px * 13, ty = y - px * 13;
    if (V && tx + w > V.x + V.w) tx = x - px * 13 - w; if (V && ty - fz * 1.3 < V.y) ty = y + px * 24;
    s += '<g class="nvs-tag" pointer-events="none"><rect x="' + R1(tx) + '" y="' + R1(ty - fz * 1.15) + '" width="' + R1(w) + '" height="' + R1(fz * 1.55) + '" rx="' + R1(fz * 0.3) + '" fill="#ffe27a" stroke="#b98900" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
      '<text x="' + R1(tx + fz * 0.45) + '" y="' + R1(ty) + '" font-size="' + R1(fz) + '" font-weight="600" fill="#3a2d00">' + esc(txt) + '</text></g>';
  }
  var dr = S.sk.draft;   // the length of the line being drawn, on the line
  if (dr && dr.t === 'line' && cur && dr.pts.length) { var a = dr.pts[dr.pts.length - 1], len = nvsD(a, cur);
    if (len > px * 34) { var A = sP(a), B = sP(cur), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, fz2 = px * 12.5;
      s += '<text x="' + R1(mx) + '" y="' + R1(my - px * 6) + '" font-size="' + R1(fz2) + '" font-weight="700" fill="#a35400" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="' + R1(px * 3) + '" pointer-events="none">' + fmt(skR(len)) + '</text>'; } }
  return s;
}

/* the keyboard belongs to the drawing while it is open: a field left in focus behind the window would swallow Enter,
   the typed sizes and Esc (and take the typed numbers for itself) */
NVAFTER.push(function () {
  if (!S.sk) return; var a = document.activeElement;
  if (a && a !== document.body && a.blur && !(a.closest && a.closest('.skover'))) a.blur();
  var h = document.querySelector('.skover .sk-hint');   // what the pointer is caught by, said once under the drawing
  if (h && !h.querySelector('.nvs-h')) h.insertAdjacentHTML('beforeend', ' <span class="nvs-h">' + esc(S.sk.tool === 'sel'
    ? L('Tempiama figūra limpa tuo tašku, už kurio paimta. Alt — nelimpa.', 'A dragged shape is caught by the point it was taken by. Alt — nothing is caught.')
    : L('Pelė limpa prie galų, vidurių, centrų, linijų, kraštų ir sankirtų; linija pati laikosi horizontaliai, vertikaliai, statmenai. Alt — nelimpa, Shift — tik horizontaliai / vertikaliai.',
        'The pointer is caught by ends, middles, centres, lines, edges and crossings; a line holds horizontal, vertical, square by itself. Alt — nothing is caught, Shift — horizontal / vertical only.')) + '</span>');
});
document.addEventListener('keydown', function (e) {   // capture, registered after the live handler: only ever sees what that one let through
  if (!S.sk) return; var a = e.target;
  if (a && a.blur && /INPUT|SELECT|TEXTAREA/.test(a.tagName || '') && !(a.closest && a.closest('.skover'))) { a.blur(); e.preventDefault(); }
}, true);

/* the part fills the drawing: a narrower margin than the live view's (which left a fifth of the drawing empty) */
function skView(p, F) {
  var K = S.sk, v = K && K.view; if (v && v.key === p.key + skSide()) return v;
  F = F || skFrame(p, skSide()); var m = Math.max(F.Dw, F.Dh) * 0.035 + 34;
  return { key: p.key + skSide(), x: -m, y: -(F.Dh + m), w: F.Dw + 2 * m, h: F.Dh + 2 * m };
}
