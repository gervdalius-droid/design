/* 38-route.js — how a drawn shape is routed: the options a CAM gives, named as SCM Maestro names them
   (Approach: type Line / Arc, mode Down / Quote, radius multiplier; Retract: type, multiplier, overlap — read from the
   workshop's own Maestro projects), plus the angle, the depth of one pass, the direction and the feeds.

   A shape without options is routed exactly as before (the live moves). With options the moves are made here and handed
   to the engine through E.nvRoute (build.py PATCHES 'engine'); they are written with the same two instructions the
   machine's programs have always used — XG0 to the start, XL2P for every move; an arc is a row of short chords.

   The workshop's rules stay: never deeper than the engine allows (it passes the depth), never a plunge straight down
   into the board — the cutter goes down along its way (the lead-in, or the path itself), back and forth when that way
   is short — and never more than R.rout.air outside the part.

   Stored on the shape as sh.cam, only what differs from the defaults:
     ain   'ramp' | 'line' | 'arc'    lead-in: down along the path itself (as before) / a straight line / a tangent arc
     aang  degrees                    line: its angle to the path (0 = straight on, 90 = square); arc: how much of a circle
     amul  × cutter radius            the line's length / the arc's radius
     amode 'down' | 'quote'           going down along the lead-in / the lead-in at full depth (only from outside the part)
     rout  'up' | 'line' | 'arc'      lead-out: straight up (as before) / a line / an arc;  rang, rmul as above
     over  mm                         a closed outline is followed this much past its start before leaving
     step  mm                         the most taken in one pass (0 = the whole depth at once)
     dang  degrees                    how steeply it goes down (0 = over R.rout.ramp mm, as before)
     rev   1                          the other way round
     feed, feedIn  mm/min             the cutting feed, the feed while going down */

var NVQ_DEF = { ain: 'ramp', amode: 'down', amul: 2, rout: 'up', rmul: 2, over: 0, step: 0, dang: 0, rev: 0, feed: 0, feedIn: 0 };
var NVQ_LIM = { amul: [0.5, 6], rmul: [0.5, 6], aang: [0, 180], rang: [0, 180], over: [0, 60], step: [0, 40], dang: [0, 45], feed: [0, 12000], feedIn: [0, 8000] };
var NVQ_FEED_MIN = 300;   // mm/min: a typed 4 is a slip of the hand, not a feed
function nvqAngDef(type) { return type === 'arc' ? 90 : 45; }
function nvqOpt(cam) {
  cam = cam || {}; var o = {}, k; for (k in NVQ_DEF) o[k] = cam[k] != null ? cam[k] : NVQ_DEF[k];
  o.ain = /^(line|arc)$/.test(o.ain) ? o.ain : 'ramp'; o.rout = /^(line|arc)$/.test(o.rout) ? o.rout : 'up'; o.amode = o.amode === 'quote' ? 'quote' : 'down'; o.rev = o.rev ? 1 : 0;
  o.aang = cam.aang != null ? +cam.aang : nvqAngDef(o.ain); o.rang = cam.rang != null ? +cam.rang : nvqAngDef(o.rout);
  for (k in NVQ_LIM) { var v = +o[k]; o[k] = isFinite(v) ? Math.max(NVQ_LIM[k][0], Math.min(NVQ_LIM[k][1], v)) : (NVQ_DEF[k] || 0); }
  if (o.ain === 'line') o.aang = Math.min(o.aang, 90); if (o.rout === 'line') o.rang = Math.min(o.rang, 90);
  if (o.ain === 'arc') o.aang = Math.max(o.aang, 10); if (o.rout === 'arc') o.rang = Math.max(o.rang, 10);
  if (o.feed > 0) o.feed = Math.max(o.feed, NVQ_FEED_MIN); if (o.feedIn > 0) o.feedIn = Math.max(o.feedIn, NVQ_FEED_MIN);
  return o;
}
function nvqRoutable(op) { return op === 'on' || op === 'in' || op === 'out' || op === 'pocket'; }
function nvqSided(sh) { return sh.op === 'in' || sh.op === 'out'; }   // the cutter runs beside the outline: there is a waste side to come in from
/* set one option; what equals the default is not kept, a shape with nothing set has no cam at all */
function nvqPut(sh, k, v) {
  var cam = sh.cam = sh.cam || {};
  if (v == null || v === '' || v === NVQ_DEF[k] || ((k === 'aang' || k === 'rang') && +v === nvqAngDef(cam[k === 'aang' ? 'ain' : 'rout'] || 'ramp'))) delete cam[k]; else cam[k] = v;
  if (k === 'ain') { delete cam.aang; if (v === 'ramp') { delete cam.amul; delete cam.amode; } }
  if (k === 'rout') { delete cam.rang; if (v === 'up') delete cam.rmul; }   /* the overlap stays: it is run before lifting straight up too */
  if (!Object.keys(cam).length) delete sh.cam;
}

/* ---------------------------------------------------------------- geometry */
function nvqCum(P) { var c = [0]; for (var i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return c; }
function nvqAt(P, cum, s) {   // the point at distance s along P, and the direction there
  var T = cum[cum.length - 1], i = 1; s = Math.max(0, Math.min(T, s)); while (i < P.length - 1 && cum[i] <= s + 1e-9) i++;
  var a = P[i - 1], b = P[i], l = cum[i] - cum[i - 1], f = l > 1e-9 ? (s - cum[i - 1]) / l : 0;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], t: l > 1e-9 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0] };
}
/* the stretch of P from distance s0 to s1 (s1 ≥ s0); a closed path goes on round */
function nvqSub(P, cum, closed, s0, s1) {
  var T = cum[cum.length - 1], out = [], push = function (q) { var l = out[out.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1e-7) out.push([q[0], q[1]]); };
  if (!closed) { s0 = Math.max(0, Math.min(T, s0)); s1 = Math.max(s0, Math.min(T, s1)); }
  var wrap = function (s) { if (!closed) return s; var m = s % T; return m < 0 ? m + T : m; };
  push(nvqAt(P, cum, wrap(s0)).p);
  var s = s0, guard = 0;
  while (s < s1 - 1e-9 && guard++ < 100000) {
    var base = closed ? Math.floor(s / T + 1e-12) * T : 0, loc = s - base, vi = -1;
    for (var i = 1; i < cum.length; i++) if (cum[i] > loc + 1e-9) { vi = i; break; }
    if (vi < 0) { if (!closed) break; s = base + T; continue; }   /* at the very end of a lap: on to the next */
    var nx = base + cum[vi];
    if (nx >= s1 - 1e-9) { push(nvqAt(P, cum, wrap(s1)).p); s = s1; break; }
    push(P[vi]); s = nx;
  }
  return out;
}
function nvqInside(q, ring) { var c = false; for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) { var a = ring[i], b = ring[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/* a lead: the way to (out = false) or from (true) the point A of the path, where it runs along t; nW points into the waste,
   sgn = +1 when that is on the left of the travel. A line of length mul·r at ang° to the path, or a tangent arc of radius mul·r
   over ang°. Returned as points in the order they are run. */
function nvqLead(A, t, nW, type, mul, ang, r, sgn, out) {
  var L = mul * r, a = ang * Math.PI / 180, pts = [];
  if (type === 'line') { var c = Math.cos(a) * L * (out ? 1 : -1), s = Math.sin(a) * L, E1 = [A[0] + t[0] * c + nW[0] * s, A[1] + t[1] * c + nW[1] * s]; return out ? [[A[0], A[1]], E1] : [E1, [A[0], A[1]]]; }
  var C = [A[0] + nW[0] * L, A[1] + nW[1] * L], v = [-nW[0] * L, -nW[1] * L], n = Math.max(3, Math.ceil(a / (2 * Math.acos(Math.max(0, 1 - 0.05 / L)))));   /* chords no more than 0.05 mm off the arc */
  for (var i = 0; i <= n; i++) { var th = (out ? 1 : -1) * sgn * a * (out ? i : n - i) / n, cs = Math.cos(th), sn = Math.sin(th); pts.push([C[0] + v[0] * cs - v[1] * sn, C[1] + v[0] * sn + v[1] * cs]); }
  pts[out ? 0 : n] = [A[0], A[1]];
  return pts;
}

/* ---------------------------------------------------------------- a shape that reaches past the part
   What is drawn may go outside; what the cutter does stops at the part. Its centre's path is cut off where the cutter has
   just left the board (its radius + the lead a groove's open end gets, never more than the machine allows outside), so a
   line drawn across runs the board through from edge to edge, and a cut-out drawn over an edge becomes a notch: a closed
   path cut by an edge comes apart into open stretches, each starting and ending outside. Stretches that would only cut
   air are dropped. */
function nvqClipSeg(a, b, x0, y0, x1, y1) {   // the part of a–b inside the box, as [t0, t1] along it; null = none
  var dx = b[0] - a[0], dy = b[1] - a[1], t0 = 0, t1 = 1, p = [-dx, dx, -dy, dy], q = [a[0] - x0, x1 - a[0], a[1] - y0, y1 - a[1]];
  for (var i = 0; i < 4; i++) { if (Math.abs(p[i]) < 1e-12) { if (q[i] < 0) return null; continue; }
    var r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
  return [t0, t1];
}
function nvqClip(pts, x0, y0, x1, y1) {   // → the stretches of the path inside the box; a closed path wholly inside comes back closed
  var n = pts.length, D = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }, closed = n > 3 && D(pts[0], pts[n - 1]) < 1e-6, runs = [], cur = null, cut = false;
  var end = function () { if (cur) runs.push(cur); cur = null; }, add = function (q) { var l = cur[cur.length - 1]; if (!l || D(l, q) > 1e-7) cur.push(q); };
  for (var i = 0; i < n - 1; i++) { var a = pts[i], b = pts[i + 1], c = nvqClipSeg(a, b, x0, y0, x1, y1);
    if (!c || (c[1] - c[0] < 1e-9 && D(a, b) > 1e-9)) { cut = true; end(); continue; }
    var A = [a[0] + (b[0] - a[0]) * c[0], a[1] + (b[1] - a[1]) * c[0]], B = [a[0] + (b[0] - a[0]) * c[1], a[1] + (b[1] - a[1]) * c[1]];
    if (c[0] > 1e-9) { cut = true; end(); }
    if (!cur) cur = [A]; add(B);
    if (c[1] < 1 - 1e-9) { cut = true; end(); } }
  end();
  if (closed && cut && runs.length > 1) { var f = runs[0], l = runs[runs.length - 1];   // the loop's own start lies inside a stretch: its two halves are one
    if (D(f[0], pts[0]) < 1e-6 && D(l[l.length - 1], pts[0]) < 1e-6) { runs[0] = l.concat(f.slice(1)); runs.pop(); } }
  return runs.filter(function (r) { return r.length > 1; });
}
function nvqSegDist(a, b, c, d) {   // the least distance between the segments a–b and c–d
  var X = nvqSegX(a, b, c, d); if (X) return 0;
  var ps = function (q, u, v) { var dx = v[0] - u[0], dy = v[1] - u[1], l2 = dx * dx + dy * dy, t = l2 > 1e-12 ? Math.max(0, Math.min(1, ((q[0] - u[0]) * dx + (q[1] - u[1]) * dy) / l2)) : 0; return Math.hypot(u[0] + dx * t - q[0], u[1] + dy * t - q[1]); };
  return Math.min(ps(a, c, d), ps(b, c, d), ps(c, a, b), ps(d, a, b));
}
function nvqSegX(a, b, c, d) { var o = function (p, q, r) { return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); }, d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d); return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)); }
/* loops: the cutter centre's paths of one shape as the engine made them (closed ones with their first point repeated; a
   pocket's rings from the middle outwards). → { loops, why }: what is left to route, and why nothing is ('small' | 'neck' | 'outside') */
E.nvClip = function (loops, L, W, C0, op, outline, type) {
  var r = C0.dia / 2, m = Math.min(C0.air, r + C0.leadIn), out = [], per = function (lp) { var c = nvqCum(lp); return c[c.length - 1]; };
  loops = (loops || []).slice();
  if (op === 'pocket') loops = loops.filter(function (lp, i) {   // a ring so small that the next one out clears all of it: left out (it would be gone down on the spot)
    if (i === loops.length - 1) return true; var in1 = null; try { in1 = E.offsetPoly(lp, r * 0.05); } catch (e) { in1 = lp; } return !!in1; });
  if (loops.some(function (lp) { return per(lp) < 1; })) return { loops: [], why: 'small' };   // a dot, or a shape the cutter's own size: routing it would be a plunge
  if (op === 'in' || op === 'out' || op === 'pocket') {
    if (type === 'line' && outline && outline.length > 2) {   // a drawn outline may be narrower than the cutter somewhere: the path would run into its walls
      var O = outline, lim = r - 0.02;
      for (var li = 0; li < loops.length; li++) { var lp = loops[li];
        for (var i = 0; i < lp.length - 1; i++) for (var j = 0; j < O.length; j++) if (nvqSegDist(lp[i], lp[i + 1], O[j], O[(j + 1) % O.length]) < lim) return { loops: [], why: 'neck' }; }
    }
  }
  loops.forEach(function (lp) { nvqClip(lp, -m, -m, L + m, W + m).forEach(function (run) {
    for (var i = 0; i < run.length - 1; i++) if (nvqClipSeg(run[i], run[i + 1], -r, -r, L + r, W + r)) { out.push(run); return; } }); });   // it reaches the board somewhere
  return { loops: out, why: out.length ? '' : 'outside' };
};

/* ---------------------------------------------------------------- the moves
   P: the cutter centre's path in the program's coordinates (closed: last point = first), depth > 0, op: on | in | out | pocket.
   → { moves: [{ t:'G0'|'L', x, y, z, v, k }], notes: [code] }; k says what the move is: in / cut / out / lift (for the drawing) */
function nvqMoves(P0, depth, op, camRaw, C0, dim) {
  var cam = nvqOpt(camRaw), r = C0.dia / 2, notes = [], mv = [], P = [];
  P0.forEach(function (q) { var l = P[P.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1e-6) P.push([+q[0], +q[1]]); });
  if (P.length < 2 || !(depth > 0)) return null;
  var closed = P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1e-6;
  if (closed) P[P.length - 1] = [P[0][0], P[0][1]];
  var side = closed && (op === 'in' || op === 'out') ? 1 : 0;   // the engine lays both so the waste is on the left of the travel
  if (cam.rev) { P.reverse(); side = -side; }
  var lin = side ? cam.ain : 'ramp', lout = side ? cam.rout : 'up', over = side ? cam.over : 0;
  if (!closed && (op === 'in' || op === 'out') && (cam.ain !== 'ramp' || cam.rout !== 'up' || cam.over > 0)) notes.push('edgeCut');   // cut off at the part's edge: it starts and ends outside
  if (side && (lin !== 'ramp' || lout !== 'up')) {   // come in and leave in the middle of the longest side, not in a corner
    var ring0 = P.slice(0, -1), bi = 0, bl = -1;
    ring0.forEach(function (q, i) { var n = ring0[(i + 1) % ring0.length], l = Math.hypot(n[0] - q[0], n[1] - q[1]); if (l > bl + 1e-6) { bl = l; bi = i; } });
    var nb = ring0[(bi + 1) % ring0.length], M = [(ring0[bi][0] + nb[0]) / 2, (ring0[bi][1] + nb[1]) / 2];
    P = [M].concat(ring0.slice(bi + 1), ring0.slice(0, bi + 1), [[M[0], M[1]]]);
  }
  var cum = nvqCum(P), T = cum[cum.length - 1]; if (!(T > 1e-6)) return null;
  var feed = cam.feed > 0 ? cam.feed : C0.feedCut, feedIn = cam.feedIn > 0 ? cam.feedIn : C0.feedPlunge;
  var nP = cam.step > 0 ? Math.min(20, Math.max(1, Math.ceil(depth / cam.step - 1e-9))) : 1;
  var rampLen = function (dz) { return cam.dang > 0 ? Math.max(1, dz / Math.tan(cam.dang * Math.PI / 180)) : C0.ramp; };
  var R3 = function (v) { return Math.round(v * 1000) / 1000; }, cur = null;
  var go = function (q) { mv.push({ t: 'G0', x: R3(q[0]), y: R3(q[1]), z: C0.safeZ, k: 'rapid' }); cur = q; };
  var to = function (q, z, v, k) { var x = R3(q[0]), y = R3(q[1]), zz = R3(z), l = mv[mv.length - 1]; cur = q;
    if (l && l.t === 'L' && Math.abs(l.x - x) < 0.0045 && Math.abs(l.y - y) < 0.0045 && Math.abs(l.z - zz) < 0.0045) { l.x = x; l.y = y; l.z = zz; return; }   /* a step of a few thousandths (where two stretches meet): the move before it ends there instead */
    mv.push({ t: 'L', x: x, y: y, z: zz, v: v, k: k }); };
  var run = function (pts, z0, z1, v, k) { var len = 0, i, acc = 0; for (i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); to(pts[i], len > 1e-9 ? z0 + (z1 - z0) * acc / len : z1, v, k); } };
  var plen = function (pts) { var l = 0; for (var i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
  var ring = closed ? P.slice(0, -1) : null, air = C0.air;
  /* a lead may only run through the waste, and not further out of the part than the machine allows */
  var onRing = function (q) { for (var i = 0; i < ring.length; i++) { var a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 > 1e-12 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
      if (Math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1]) < 1e-4) return true; } return false; };
  var inWaste = function (q) { return onRing(q) || nvqInside(q, ring) === (op === 'in'); };   // on the path itself counts: it is cut anyway
  var crosses = function (a, b) {   // does a–b meet the path anywhere but at its own two ends?
    for (var i = 0; i < ring.length; i++) { var c = ring[i], d = ring[(i + 1) % ring.length], rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx; if (Math.abs(den) < 1e-9) continue;
      var t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den; if (t > 1e-6 && t < 1 - 1e-6 && u > -1e-9 && u < 1 + 1e-9) return true; }
    return false; };
  var leadOk = function (pts, skip) { for (var j = 1; j < pts.length; j++) if (crosses(pts[j - 1], pts[j])) return false;
    for (var i = 0; i < pts.length; i++) { if (i === skip) continue; var o = pts[i === 0 ? 1 : i - 1], q = pts[i];
      if (q[0] < -air || q[0] > dim.DX + air || q[1] < -air || q[1] > dim.DY + air) return false;
      var mid = [(q[0] + o[0]) / 2, (q[1] + o[1]) / 2]; if (!inWaste(q) || !inWaste(mid)) return false; } return true; };
  var fit = function (make, mul, skipLast, short) { var fs = [1, 0.75, 0.5, 0.35]; for (var i = 0; i < fs.length; i++) { var pts = make(mul * fs[i]); if (leadOk(pts, skipLast ? pts.length - 1 : 0)) { if (i) notes.push(short); return pts; } } return null; };
  var normal = function (t) { return side > 0 ? [-t[1], t[0]] : [t[1], -t[0]]; };
  var leave = function (s, z) {   // the lead-out from distance s of the path, at depth
    if (lout === 'up') return; var B = nvqAt(P, cum, closed ? s % T : s), nW = normal(B.t);
    var LO = fit(function (m) { return nvqLead(B.p, B.t, nW, lout, m, cam.rang, r, side, true); }, cam.rmul, false, 'outShort');
    if (!LO) { if (notes.indexOf('outNone') < 0) notes.push('outNone'); return; } run(LO, z, z, feed, 'out');
  };

  var LI = null;
  if (lin !== 'ramp') { var A0 = nvqAt(P, cum, 0), nW0 = normal(A0.t);
    LI = fit(function (m) { return nvqLead(A0.p, A0.t, nW0, lin, m, cam.aang, r, side, false); }, cam.amul, true, 'inShort');
    if (!LI) { notes.push('inNone'); lin = 'ramp'; }
    else { var S9 = LI[0], out9 = S9[0] < -r || S9[0] > dim.DX + r || S9[1] < -r || S9[1] > dim.DY + r;
      if (!(cam.amode === 'quote' && out9) && plen(LI) * 15 < rampLen(depth) - 1e-9) { notes.push('inSteep'); lin = 'ramp'; LI = null; } } }
  over = Math.min(over, T);

  if (lin !== 'ramp') {   // every pass: in along the lead, once round (and the overlap), out, up
    var S0 = LI[0], ll = plen(LI), back = LI.slice().reverse(), outside = S0[0] < -r || S0[0] > dim.DX + r || S0[1] < -r || S0[1] > dim.DY + r;
    var quote = cam.amode === 'quote' && outside; if (cam.amode === 'quote' && !outside) notes.push('quoteIn');
    for (var k = 1; k <= nP; k++) { var zk = -depth * k / nP;
      go(S0);
      if (quote) { to(S0, zk, feedIn, 'in'); run(LI, zk, zk, feed, 'in'); }
      else { to(S0, 0, feedIn, 'in'); var m = Math.max(1, Math.ceil(rampLen(-zk) / ll - 1e-9)); if (m % 2 === 0) m++; m = Math.min(m, 17);
        for (var j = 0; j < m; j++) run(j % 2 ? back : LI, zk * j / m, zk * (j + 1) / m, feedIn, 'in'); }
      run(nvqSub(P, cum, true, 0, T + over), zk, zk, feed, 'cut');
      leave(over, zk);
      to(cur, C0.safeZ, feed, 'lift');
    }
  } else if (closed) {   // down along the outline itself, round, deeper along the next stretch, round … no lifting in between
    go(P[0]); to(P[0], 0, feedIn, 'in'); var s = 0, zp = 0;
    for (var k2 = 1; k2 <= nP; k2++) { var z2 = -depth * k2 / nP, want2 = rampLen(zp - z2), rl = Math.min(want2, T * 60);   /* a ring shorter than the way down: round and round (a spiral), never steeper */
      if (rl < want2 - 1e-6 && notes.indexOf('steep') < 0) notes.push('steep');
      run(nvqSub(P, cum, true, s, s + rl), zp, z2, feedIn, 'in');
      run(nvqSub(P, cum, true, s + rl, s + rl + T), z2, z2, feed, 'cut');
      s += rl; zp = z2; }
    if (over > 0) { run(nvqSub(P, cum, true, s, s + over), zp, zp, feed, 'cut'); s += over; }
    leave(s, zp);
    to(cur, C0.safeZ, feed, 'lift');
  } else {   // an open line: down along it, back, to the far end; the next pass comes back the same way
    var Q = P, cq = cum; go(Q[0]); to(Q[0], 0, feedIn, 'in'); var zq = 0;
    for (var k3 = 1; k3 <= nP; k3++) { var z3 = -depth * k3 / nP, want3 = rampLen(zq - z3), Qr = Q.slice().reverse();
      if (T >= want3 - 1e-9) { var head = nvqSub(Q, cq, false, 0, want3);
        run(head, zq, z3, feedIn, 'in'); run(head.slice().reverse(), z3, z3, feed, 'in'); run(nvqSub(Q, cq, false, 0, T), z3, z3, feed, 'cut');   /* the way back over the ramp belongs to going in (the arrow shows the pass itself) */
        Q = Qr; cq = nvqCum(Q); }
      else {   /* a line shorter than the way down: down along it there and back as often as it takes, then once along it at depth */
        var m3 = Math.min(60, Math.max(1, Math.ceil(want3 / T - 1e-9))); if (m3 * T < want3 - 1e-6 && notes.indexOf('steep') < 0) notes.push('steep');
        for (var j3 = 0; j3 < m3; j3++) run(j3 % 2 ? Qr : Q, zq + (z3 - zq) * j3 / m3, zq + (z3 - zq) * (j3 + 1) / m3, feedIn, 'in');
        run(m3 % 2 ? Qr : Q, z3, z3, feed, 'cut');
        if (m3 % 2 === 0) { Q = Qr; cq = nvqCum(Q); } }
      zq = z3; }
    to(cur, C0.safeZ, feed, 'lift');
  }
  return { moves: mv, notes: notes, passes: nP, start: [mv[0].x, mv[0].y] };
}
function nvqShortRing(P, C0) {   // a path shorter than the way down: the live ramp along all of it and back would be close to a plunge
  if (!P || P.length < 2) return false; var c = nvqCum(P); return c[c.length - 1] < C0.ramp - 1e-9;
}
E.nvRoute = function (P, depth, g, C0, dim) {   // the engine asks here for every path; null = its own (the live) moves
  try { if (!g.cam && !nvqShortRing(P, C0)) return null;
    var o = nvqMoves(P, depth, g.op, g.cam, C0, dim); return o ? o.moves : null; } catch (e) { if (window.console) console.error(e); return null; }
};

/* the same moves in the part's own frame (as drawn): a path worked from face B is mirrored for its program and back */
function nvqPreview(p, g) {
  if (!g) return null; var C0 = E.R.rout, B = g.face === 'B', DY = p.W;
  if (!g.cam && !nvqShortRing(g.pts, C0)) return null;
  var P = g.pts.map(function (q) { return [q[0], B ? DY - q[1] : q[1]]; }); if (B) P.reverse();
  var o = null; try { o = nvqMoves(P, Math.min(g.depth, p.T - C0.skin), g.op, g.cam, C0, { DX: p.L, DY: p.W }); } catch (e) { o = null; }
  if (!o) return null;
  return { notes: o.notes, passes: o.passes, moves: o.moves.map(function (m) { return B ? { t: m.t, x: m.x, y: DY - m.y, z: m.z, v: m.v, k: m.k } : m; }) };
}
function nvqPathsOf(p, n) { return (p.paths || []).filter(function (g) { var m = /^ESKIZAS_(\d+)/.exec(g.name || ''); return m && +m[1] === n; }); }
var NVQ_NOTE = {
  inShort: ['Įėjimas sutrumpintas — atliekoje jam per mažai vietos.', 'The lead-in was shortened — the waste has no room for it.'],
  steep: ['Kontūras per trumpas nusileisti nurodytu kampu — leidžiamasi stačiau.', 'The path is too short to go down on at the angle asked — it goes down more steeply.'],
  inSteep: ['Įėjimas per trumpas nusileisti nurodytu kampu — freza leidžiasi pačiu kontūru.', 'The lead-in is too short to go down on at the angle asked — the cutter goes down along the outline itself.'],
  inNone: ['Įėjimui linija ar lanku atliekoje vietos nėra — freza leidžiasi pačiu kontūru.', 'No room in the waste for a line or arc lead-in — the cutter goes down along the outline itself.'],
  outShort: ['Išėjimas sutrumpintas — atliekoje jam per mažai vietos.', 'The lead-out was shortened — the waste has no room for it.'],
  outNone: ['Išėjimui atliekoje vietos nėra — freza kyla tiesiai aukštyn.', 'No room in the waste for the lead-out — the cutter lifts straight up.'],
  edgeCut: ['Kontūras kerta detalės kraštą — freza ateina ir išeina už krašto, įėjimo ir išėjimo nustatymai čia netaikomi.', 'The outline crosses the part\'s edge — the cutter comes in and leaves outside the edge; the lead-in and lead-out settings do not apply here.'],
  quoteIn: ['Įėjimas „gylyje“ galimas tik iš už detalės krašto (freza nesileidžia stačiai į plokštę) — leidžiamasi nuožulniai.', 'A lead-in "at depth" is possible only from outside the part (the cutter never plunges straight into the board) — it goes down along the lead-in.']
};
function nvqNotes(p, n) { var out = []; nvqPathsOf(p, n).forEach(function (g) { var o = nvqPreview(p, g); if (o) o.notes.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); }); }); return out; }

/* ---------------------------------------------------------------- on the drawing: where the cutter starts, which way it goes,
   how it comes in and leaves (green = going in, red = leaving) */
function nvqSvg(p, list, selId, P, u) {
  var sv = document.querySelector('.sk-svg'), m0 = sv && sv.getScreenCTM(), px = m0 && m0.a ? 1 / m0.a : u / 4, s = '', pe = ' vector-effect="non-scaling-stroke" pointer-events="none"', side = skSide();
  var R2 = function (v) { return Math.round(v * 100) / 100; };
  list.forEach(function (sh, i) {
    if (!nvqRoutable(sh.op)) return; var gs = nvqPathsOf(p, i + 1); if (!gs.length) return;
    var on = sh.id === selId, op = (sh.face || 'A') !== side ? 0.4 : on ? 1 : 0.7;
    gs.forEach(function (g, gi) {
      var o = nvqPreview(p, g), pts, start, dirTo;
      if (o) {
        var first = []; for (var j = 0; j < o.moves.length; j++) { first.push(o.moves[j]); if (o.moves[j].k === 'lift') break; }   // one pass is enough to show the way
        var part = function (k) { var out = [], runs = []; first.forEach(function (m, j2) { if (m.k === k) { if (!out.length && j2) out.push(first[j2 - 1]); out.push(m); } else if (out.length) { runs.push(out); out = []; } }); if (out.length) runs.push(out); return runs; };
        var poly = function (runs, col, w, dash) { return runs.map(function (rn) { return '<polyline points="' + rn.map(function (m) { return P(m.x, m.y).join(','); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-opacity="' + op + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linejoin="round"' + pe + '/>'; }).join(''); };
        var band = function (runs) { return runs.map(function (rn) { return '<polyline points="' + rn.map(function (m) { return P(m.x, m.y).join(','); }).join(' ') + '" fill="none" stroke="#7a3fc4" stroke-opacity="' + (0.13 * op) + '" stroke-width="' + E.R.rout.dia + '" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>'; }).join(''); };
        var rin = part('in'), rout = part('out');
        s += band(rin) + band(rout) + poly(rin, '#1f7a4d', 2) + poly(rout, '#c2410c', 2);
        start = [first[0].x, first[0].y]; var c1 = first.filter(function (m) { return m.k === 'cut'; })[0], c0 = c1 ? first[first.indexOf(c1) - 1] : null;
        dirTo = c1 && c0 ? [[c0.x, c0.y], [c1.x, c1.y]] : null;
      } else { pts = g.face === 'B' ? g.pts.slice().reverse() : g.pts; start = pts[0]; dirTo = pts.length > 1 ? [pts[0], pts[1]] : null; }
      if (gi > 0 && (!o || sh.op === 'pocket')) return;   // a pocket's rings: one start mark is enough
      var S0 = P(start[0], start[1]);
      s += '<circle cx="' + S0[0] + '" cy="' + S0[1] + '" r="' + R2(px * 4.5) + '" fill="#1f7a4d" fill-opacity="' + op + '" stroke="#fff" stroke-width="1.5"' + pe + '/>';
      if (dirTo) {   // an arrow a little way along the first cutting move
        var A = P(dirTo[0][0], dirTo[0][1]), B = P(dirTo[1][0], dirTo[1][1]), dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy);
        if (l > px * 6) { dx /= l; dy /= l; var d0 = Math.min(l * 0.5, px * 26), tx = A[0] + dx * d0, ty = A[1] + dy * d0, hw = px * 5.5, hl = px * 11;
          s += '<path d="M' + R2(tx + dx * hl) + ' ' + R2(ty + dy * hl) + 'L' + R2(tx - dy * hw) + ' ' + R2(ty + dx * hw) + 'L' + R2(tx + dy * hw) + ' ' + R2(ty - dx * hw) + 'Z" fill="#5b2aa0" fill-opacity="' + op + '" stroke="#fff" stroke-width="1"' + pe + '/>'; }
      }
    });
  });
  return s;
}

/* ---------------------------------------------------------------- the options of the picked shape */
function nvqProps(c, p, r, sh, idx) {
  if (!nvqRoutable(sh.op)) return '';
  var o = nvqOpt(sh.cam), raw = sh.cam || {}, sided = nvqSided(sh), R0 = E.R.rout, rr = R0.dia / 2, maxD = p.T - R0.skin, depth = sh.through ? maxD : Math.min(+sh.depth || 0, maxD), h = '';
  var segB = function (k, opts) { return '<div class="seg nvq-seg" role="group">' + opts.map(function (x) { var on = String(o[k]) === String(x[0]); return '<button type="button" data-nv="nvqSet" data-v="' + k + ':' + x[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>'; };
  var num = function (k, label, unit, ph, title) { var v = raw[k] != null || k === 'aang' || k === 'rang' || k === 'amul' || k === 'rmul' ? o[k] : '';   /* what is used (within its limits), not merely what was typed */
    return '<label class="f sk-f nvq-f"' + (title ? ' title="' + esc(title) + '"' : '') + '><span>' + esc(label) + (unit ? ' <i>' + esc(unit) + '</i>' : '') + '</span><input type="text" inputmode="decimal" data-nv-change="nvqNum" data-k="' + k + '" value="' + esc(v === '' ? '' : String(v)) + '" placeholder="' + esc(ph || '') + '"></label>'; };
  var row = function (label, body) { return '<div class="nvq-row"><span class="nvq-k">' + esc(label) + '</span><div class="nvq-v">' + body + '</div></div>'; };
  if (sided) {
    h += row(L('Įėjimas', 'Lead-in'), segB('ain', [['ramp', L('Pačiu kontūru', 'Along the outline')], ['line', L('Linija', 'Line')], ['arc', L('Lankas', 'Arc')]]) +
      (o.ain !== 'ramp' ? '<div class="nvq-in">' + num('aang', o.ain === 'arc' ? L('Lanko kampas', 'Arc angle') : L('Kampas į kontūrą', 'Angle to the outline'), '°') +
        num('amul', o.ain === 'arc' ? L('Spindulys', 'Radius') : L('Ilgis', 'Length'), '× R', '', L('Frezos spindulio kartotinis', 'A multiple of the cutter radius')) +
        '<span class="nvq-eq">= ' + fmt(o.amul * rr) + ' mm</span></div>' +
        '<div class="nvq-in">' + segB('amode', [['down', L('Leidžiantis', 'Going down')], ['quote', L('Gylyje', 'At depth')]]) + '</div>' : ''));
    h += row(L('Išėjimas', 'Lead-out'), segB('rout', [['up', L('Tiesiai aukštyn', 'Straight up')], ['line', L('Linija', 'Line')], ['arc', L('Lankas', 'Arc')]]) +
      (o.rout !== 'up' ? '<div class="nvq-in">' + num('rang', o.rout === 'arc' ? L('Lanko kampas', 'Arc angle') : L('Kampas į kontūrą', 'Angle to the outline'), '°') +
        num('rmul', o.rout === 'arc' ? L('Spindulys', 'Radius') : L('Ilgis', 'Length'), '× R', '', L('Frezos spindulio kartotinis', 'A multiple of the cutter radius')) +
        '<span class="nvq-eq">= ' + fmt(o.rmul * rr) + ' mm</span></div>' : '') +
      '<div class="nvq-in">' + num('over', L('Persidengimas', 'Overlap'), 'mm', '0', L('Kiek kontūro pravažiuojama antrą kartą prieš išeinant', 'How much of the outline is run twice before leaving')) + '</div>');
  }
  var nP = o.step > 0 && depth > 0 ? Math.min(20, Math.max(1, Math.ceil(depth / o.step - 1e-9))) : 1, dz = depth > 0 ? depth / nP : 0;
  var ang = o.dang > 0 ? o.dang : (dz > 0 ? Math.atan(dz / R0.ramp) * 180 / Math.PI : 0);
  h += row(L('Leidimasis', 'Going down'), '<div class="nvq-in">' + num('dang', L('Kampas', 'Angle'), '°', L('auto', 'auto'), L('Kokiu kampu freza leidžiasi į plokštę. Tuščia — per ', 'How steeply the cutter goes down into the board. Empty — over ') + R0.ramp + ' mm') +
    num('step', L('Vienu praėjimu', 'Per pass'), 'mm', L('visas', 'all'), L('Didžiausias gylis vienu praėjimu. Tuščia — visas gylis iš karto', 'The most taken in one pass. Empty — the whole depth at once')) + '</div>' +
    '<span class="nvq-eq">' + (depth > 0 ? (nP > 1 ? nP + L(' praėjimai po ', ' passes of ') + fmt(Math.round(dz * 10) / 10) + ' mm' : L('1 praėjimas, ', '1 pass, ') + fmt(depth) + ' mm') + L(' · leidžiasi ≈ ', ' · going down ≈ ') + fmt(Math.round(ang * 10) / 10) + '°' : '') + '</span>');
  h += row(L('Kryptis', 'Direction'), segB('rev', [[0, L('Įprasta', 'As usual')], [1, L('Atvirkščia', 'Reversed')]]));
  h += row(L('Pastūma', 'Feed'), '<div class="nvq-in">' + num('feed', L('Pjaunant', 'Cutting'), 'mm/min', String(R0.feedCut)) + num('feedIn', L('Leidžiantis', 'Going down'), 'mm/min', String(R0.feedPlunge)) + '</div>');
  var notes = nvqNotes(p, idx + 1).map(function (k) { return '<p class="nvq-note">' + esc(L(NVQ_NOTE[k][0], NVQ_NOTE[k][1])) + '</p>'; }).join('');
  return '<div class="nvq" id="nvq"><div class="nvq-h"><span class="lbl">' + L('Kaip frezuoti', 'How it is routed') + '</span>' +
    (sh.cam ? '<button type="button" class="btn ghost" data-nv="nvqReset" title="' + esc(L('Grąžinti įprastą frezavimą', 'Back to the usual routing')) + '">↺ ' + L('Įprastai', 'Default') + '</button>' : '<span class="unit">' + L('įprastai', 'default') + '</span>') + '</div>' + h + notes +
    '<p class="nvq-leg"><i style="background:#1f7a4d"></i>' + L('pradžia ir įėjimas', 'start and lead-in') + ' <i style="background:#c2410c"></i>' + L('išėjimas', 'lead-out') + ' <i class="ar"></i>' + L('kryptis', 'direction') + '</p></div>';
}
NVA.nvqSet = function (el, v) {
  var kv = String(v).split(':'), k = kv[0], val = kv[1]; if (!(k in NVQ_DEF)) return false;
  var X = skCtx(), sh0 = skSelShape(X); if (!sh0 || String(nvqOpt(sh0.cam)[k]) === String(val)) return false;   // already so: nothing to undo, no angle to reset
  skChange(function (sh) { nvqPut(sh, k, k === 'rev' ? (+val ? 1 : 0) : val); });
};
NVA.nvqReset = function () { skChange(function (sh) { delete sh.cam; }); };
NVC.nvqNum = function (el) {
  var k = el.getAttribute('data-k'), t = String(el.value).trim(), lim = NVQ_LIM[k]; if (!lim) return false;
  if (t === '') { skChange(function (sh) { nvqPut(sh, k, null); }); return; }
  var v = skNum(t); if (v == null || v < 0) { toast(L('Įveskite skaičių', 'Enter a number'), true); return; }
  v = Math.max(lim[0], Math.min(lim[1], v));
  if ((k === 'feed' || k === 'feedIn') && v > 0 && v < NVQ_FEED_MIN) { v = NVQ_FEED_MIN; toast(L('Mažiausia pastūma — ', 'The lowest feed is ') + NVQ_FEED_MIN + ' mm/min'); }
  var ang = k === 'aang' || k === 'rang';   // 0° is an angle (straight on); everywhere else 0 means "as usual"
  skChange(function (sh) { var type = (sh.cam || {})[k === 'aang' ? 'ain' : 'rout']; if (ang && type === 'line') v = Math.min(v, 90); if (ang && type === 'arc') v = Math.max(v, 10); nvqPut(sh, k, ang ? v : (v || null)); });
};

/* what the route could not do as asked is said in the check list too (it is still made — in the safer way) */
var nvqIssues0 = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var list = nvqIssues0(proj, info) || [];
  (proj.cabinets || []).forEach(function (c, ci) { var inf = info && info[ci]; if (!inf || !inf.r || !c.sketch) return;
    (inf.r.panels || []).forEach(function (p) { (c.sketch[p.key] || []).forEach(function (sh, i) { if (!sh.cam || !nvqRoutable(sh.op)) return;
      nvqNotes(p, i + 1).forEach(function (k) { list.push({ id: 'route.' + k + '.' + p.key + '.' + (i + 1), sev: 'info', cab: ci, topic: 'cnc', field: null,
        msg: L('Detalės ' + (p.short || p.key) + ' operacija #' + (i + 1) + ': ', 'Part ' + (p.short || p.key) + ', operation #' + (i + 1) + ': ') + L(NVQ_NOTE[k][0], NVQ_NOTE[k][1]),
        act: { label: L('Atidaryti brėžinį', 'Open the drawing'), act: 'skopen', v: p.key, i: ci } }); }); }); }); });
  return list;
};
