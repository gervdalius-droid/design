
/* =====================================================================
   engine.js — Dėdės Baldai cabinet engine (cabinet creator app; first written for the SketchUp plugin).

   cabinet definition → panels (size, material, edgebands, 3-D placement,
   drillings) → SCM Startech CN Plus programs (.XXL).

   The construction and drilling rules are the ones of the offer app's CNC tab
   (cnc-module.js v0.1, verified against the SWOOD models Spintele_su_tandem and
   Spintele_su_tandembox, Oct 2026). For drawer cabinets this engine produces
   exactly the same programs; test/compare_ref.js proves it on every change.

   Added for the plugin (no drillings, so no change to any program):
     - 3-D placement of every panel (origin + axes) so SketchUp can draw it
     - doors, shelves, dishwasher front and legs as drawn panels
     - materials and edgebands per panel (for the part list)

   Units: millimetres. Cabinet axes: X to the right, Y from the front (Y=0)
   to the back, Z up from the underside of the bottom panel.
   Runs in the plugin dialog (Chromium) and in Node for tests. ES2015 only.
   ===================================================================== */
(function (root) {
"use strict";

/* ----------------------------------------------------------------- rules */
var R = {
  cam:   { cam:{d:15, depth:15, fromEdge:34, fromFront:50},   // cams in the side's inner face
           bolt:{d:8, depthFace:15, depthEdge:31.906},         // bolt hole in bottom/top face; the Ø8 bore in the part's edge stops at 31.906
                                                               // (cam centre at 34 — as SWOOD CAM / step2xxl drill it: the drill cannot go to 34)
           dowel:{d:8, depthEdge:27, depthFace:12, offset:32}, // dowels at cam ±32 (outer cams only)
           backFix:{d:8, fromEdge:50} },                       // confirmats back→side: 8 through in back
  confirmat: { d:8, pilot:{d:5, depth:32}, fromFront:50, railFromEdge:[30,70], railAlong:50 },
  rail: 100,
  feet: { d:15, h:10, fromFront:50, fromBack:50, holeD:8, holeDepth:10 },   // pėdutės: Ø15 buttons under the sides (and partitions), one Ø8 × 10 hole each, 50 from the front and the back
  legs: { fromSide:55, fromFront:95, fromBack:55, markD:5, markDepth:2, markOff:14.85, drawD:40 },
  runner: {
    "BLUM TANDEM":    { marks:[37,165,229],          up:37, facade:null },
    "BLUM TANDEMBOX": { marks:[19,28,37,261,293,453], up:33,
                        facade:{d:10, depth:12, fromSide:32, ys:[65.5,97.5], yGallery:225.5} },
    /* side-mount 45 mm ball-bearing runners for simple jobs: the marks depend on the runner length (runnerMarks) and
       the drawer is a board box (drawerBox) between them, 12.7 mm clear of each side */
    "GTV KULKINIAI H45": { ball:true, facade:null },
    "DTC KULKINIAI H45": { ball:true, facade:null },
    /* concealed undermount runners (DTC D-Motion, Blum TANDEM compatible): cabinet profile screwed on the 32 mm row
       (marks from R.under), the drawer is a board box standing on the runners (drawerBox, R.under) */
    "DTC PASLĖPTI": { under:true, facade:null },
    /* Blum MERIVOBOX: steel sides on BLUMOTION cabinet profiles; the shop cuts the 16 mm base and back (R.merivo) */
    "BLUM MERIVOBOX": { merivo:true, facade:null },
    /* the offer app's generic names: drilled as the GTV / DTC ball runners and the DTC undermount ones */
    "GUOLINIAI": { ball:true, facade:null },
    "KT. PASLĖPTO MONTAVIMO": { under:true, facade:null }
  },
  /* GTV / DTC H45 (catalogues: drawer width = inner width − 2 × 12.7; drawer depth = runner length NL when the box front is
     flush with the carcass front). Cabinet member: front hole `front` from the front edge, rear hole `rear` before the
     runner's end, one more on the 32 mm grid in between from `midFrom` mm long; all on the runner axis, `up` above the front's
     bottom edge. perLen ("450: 35,195,420; 500: 35,227,470") replaces the pattern for a length. NOT verified against a GTV /
     DTC sample — editable in the app's settings. */
  /* DTC D-Motion / TANDEM-type undermount (catalogues: inside drawer width = LW − 42 for 16 mm sides, LW − 49 for 19 mm;
     drawer length = NL − 10; bottom recessed 13 mm; 14 mm under the box; runner 3–4 mm back from the front edge,
     first screw 37 mm from the front edge, the others on the 32 mm row; inner cabinet depth ≥ NL + 3) */
  under: { up:37, marks:'37, 165, 229', clearBelow:14, recess:13, shorter:10, ded:'', topGap:10, boxT:0, depthPlus:3, perLen:'', lengths:[250, 300, 350, 400, 450, 500, 550, 600] },
  ball: { up:37, front:35, rear:30, midFrom:450, clear:12.7, boxBelow:22, topGap:10, boxT:0, perLen:'', drawerMarks:true, lengths:[300, 400, 450, 500, 550] },
  /* Blum MERIVOBOX (catalogue 2024–2027, "Cutting – 16 mm chipboard"): base (LW − 51) × (NL − 26), chipboard back (LW − 51) ×
     back height; the back stands behind the base, the box is NL − 10 long; side heights N 68.5 / M 91 / K 129 / E 192
     (E = the M side with a gallery railing or a BOXCAP high side), backs 60.5 / 83 / 121 / 184; inner cabinet depth ≥ NL + 3;
     one drilling position for the whole range; the front clips onto screw-on front fixing brackets (no drilling).
     The cabinet profile holes and their height (marks, up, below) are NOT verified on a MERIVOBOX — editable in the settings. */
  merivo: { up:33, marks:'37, 261, 293', perLen:'', ded:51, shorter:26, boxShorter:10, t:16, below:24, topGap:10, depthPlus:3,
            sideH:{ N:68.5, M:91, K:129, E:192 }, backH:{ N:60.5, M:83, K:121, E:184 }, lengths:[270, 300, 350, 400, 450, 500, 550, 600] },
  facade: { sideGap:3, gap:3, zoneGapRails:2, insetGap:2, dishGap:4 },   // dishGap: a dishwasher's front is this much narrower than its niche (600 → 596, 450 → 446)   // insetGap: round an inset front (3D construction)   // facade clearances (zone = H - t under a covering top, H - 2 with rails)
  shelf:  { clearW:2, setback:20 },               // drawn shelves: 1 mm each side, 20 mm back from the front edge
  fridgeVent:50,                                  // an integrated fridge's niche shelves stop this far from the back: the fridge's warm air goes up there
  /* ---- operations added for the cabinet creator (Oct 2026). Blum catalogue values, NOT yet
          verified against a SWOOD model of the shop — editable in the app's settings. */
  hinge:  { cupD:35, cupDepth:13, cupFromEdge:22.5,           // 35 mm cup, centre 22.5 from the door edge
            fromEnd:100,                                      // outer hinges 100 mm from the door ends
            dowelD:8, dowelDepth:11, dowelSpacing:45, dowelOffset:9.5,   // press-in (INSERTA) cups only
            plateD:5, plateDepth:2, plateFromFront:37, plateSpacing:32 },   // mounting plate screw positions in the side: markings (post: Ø5 × 2)
  pins:   { d:5, depth:12, fromFront:37, fromBack:30, below:3, pitch:32, extra:2 },   // shelf supports in the sides
  backCam: { fromEnd:80 },                       // cams fixing a back: first/last 80 from the ends (clear of the corner cams)
  through_extra: 6.559,
  /* post-processor rules (Dalius's SolidWorks → XXL post, step2xxl, matching SWOOD CAM): every marking — drawer runners,
     hinge plates, legs, front fixing marks — is a Ø5 hole 2 mm deep with N="L"; holes are listed left end (F=3) first,
     then the top face by X, then the right end (F=2) */
  post: { markD:5, markDepth:2, edgeMaxZ:31.906 },   // edgeMaxZ: no horizontal bore goes deeper (SWOOD CAM / step2xxl)
  /* boring head as equipped (Maestro StartechCNPlus .atrx/.cfgx): top 5/8/15/35, through 5/8, X ends 5/8, long edges 8.
     5 mm long-edge bores go to a separate program with the panel turned 90° (as step2xxl), panels up to machine.maxY. */
  drills: { top:[5,8,15,35], through:[5,8], xEnds:[5,8], yEdges:[8], edgeMax:35 },
  machine: { maxX:3050, maxY:900, minX:200, minY:80 },
  /* routing as step2xxl / XXL Fix write it: the Ø15.5 diamond cutter T=96; never deeper than DZ − skin, never a vertical
     plunge (ramp ≤ 30 mm along the path, back at full depth), never more than 20 mm outside the part (Maestro NC17050) */
  rout: { T:96, dia:15.5, D:24, name:'DEIMANTAS 16MM  - NAUJA - ', feedCut:4000, feedPlunge:2000, safeZ:10, skin:2, ramp:30, leadIn:5, air:20 },
  led: { w:16, depth:8, from:30, end:20 },
  joint3From: 550,   // a carcass joint gets its third connector (in the middle) only when longer than this   // LED profile groove: 16 wide, 8 deep, 30 from the front edge; closed ends 20 from the part's ends
  hdf: { t:3, inset:2, mat:'HDF 3 mm' }          // plaušo nugara: nailed on the back, 2 mm in from the carcass edges
};
var DRAWER_HW = ["BLUM TANDEM", "BLUM TANDEMBOX", "BLUM MERIVOBOX", "GTV KULKINIAI H45", "DTC KULKINIAI H45", "DTC PASLĖPTI"];
/* where a runner of length rail is screwed to the side: positions from the front edge */
function lenList(txt, L) {   // "450: 35,195,420; 500: …" → the positions given for runner length L, or null
  var own = null; String(txt || '').split(/[;\n]+/).forEach(function (x) { var m = x.split(':'); if (m.length === 2 && Math.abs(+m[0] - L) < 0.5) own = m[1].split(/[ ,]+/).map(Number).filter(function (v) { return v > 0 && v < L; }); });
  return own && own.length ? own : null;
}
function runnerMarks(rt, rail) {
  if (!rt) return [];
  if (rt.merivo) { var Lm = +rail || 500, om = lenList(R.merivo.perLen, Lm);
    return (om || String(R.merivo.marks || '').split(/[ ,;]+/).map(Number).filter(function (v) { return v > 0 && v < Lm - 10; })).sort(function (a, c) { return a - c; }); }
  if (rt.under) { var Lu = +rail || 500, ou = lenList(R.under.perLen, Lu);
    return (ou || String(R.under.marks || '').split(/[ ,;]+/).map(Number).filter(function (v) { return v > 0 && v < Lu - 10; })).sort(function (a, c) { return a - c; }); }
  if (!rt.ball) return rt.marks.slice();
  var b = R.ball, L = +rail || 500, own = String(b.perLen || '').split(/[;\n]+/).map(function (x) { var m = x.split(':'); return m.length === 2 && Math.abs(+m[0] - L) < 0.5 ? m[1].split(/[ ,]+/).map(Number).filter(function (v) { return v > 0 && v < L; }) : null; }).filter(function (x) { return x && x.length; })[0];
  if (own) return own.sort(function (a, c) { return a - c; });
  var a0 = +b.front, a1 = L - (+b.rear), pos = [a0, a1];
  if (+b.midFrom > 0 && L >= +b.midFrom) { var m2 = a0 + 32 * Math.round((a1 - a0) / 2 / 32); if (m2 - a0 > 40 && a1 - m2 > 40) pos.splice(1, 0, m2); }
  return pos;
}
function runnerUp(rt) { return rt && rt.ball ? +R.ball.up : rt && rt.under ? +R.under.up : rt && rt.merivo ? +R.merivo.up : rt ? rt.up : 0; }
/* MERIVOBOX height for a drawer: the box (from its bottom zs) must stay under `top`. Auto takes the highest of N, M and E
   that fits — E with the gallery railing (the shop's choice over high sides); K and the BOXCAP high side only when chosen.
   A chosen height that does not fit falls back to the auto one (with a note). */
function merivoPick(want, ext, room) {
  var m = R.merivo, fits = function (k) { return +m.sideH[k] <= room + 0.01; }, auto = ['E', 'M', 'N'].filter(fits)[0] || null;
  var code = want && want !== 'auto' && m.sideH[want] ? want : auto, note = '';
  if (code && !fits(code)) { note = 'MERIVOBOX ' + code + ' (' + m.sideH[code] + ' mm) netelpa — ' + (auto ? 'imamas ' + auto : 'per žemas fasadas'); code = auto; }
  if (!code) return null;
  var x = code === 'E' ? (ext === 'boxcap' ? 'boxcap' : 'rail') : '';
  return { code:code, ext:x, sideH:+m.sideH[code], backH:+m.backH[code], note:note, label:'MERIVOBOX ' + code + (x === 'rail' ? ' su galerija' : x === 'boxcap' ? ' su BOXCAP' : '') };
}
/* MERIVOBOX parts for one drawer: base and back (16 mm), placed in the cabinet; ctx: x0, x1 inner faces, y0 behind the front,
   axis (cabinet profile hole line), top (highest the box may reach), room (inner depth), rail, want/ext, name(), mat, eb, pname, lbl */
function merivoParts(ctx, warnOnce) {
  var m = R.merivo, LW = ctx.x1 - ctx.x0, rail = +ctx.rail || 500, zs = ctx.axis - +m.below, bt = +m.t || 16;
  if (rail + +m.depthPlus > ctx.room + 0.01) { warnOnce(ctx.lbl + ': MERIVOBOX ' + rail + ' mm reikia ' + num(rail + +m.depthPlus) + ' mm vidinio gylio, yra ' + num(ctx.room) + ' — rinkitės trumpesnį'); return null; }
  var pk = merivoPick(ctx.want, ctx.ext, ctx.top - zs);
  if (!pk) { warnOnce(ctx.lbl + ': fasadas per žemas MERIVOBOX dėžei (mažiausia N ' + m.sideH.N + ' mm) — dėžė nepridėta'); return null; }
  if (pk.note) warnOnce(ctx.lbl + ': ' + pk.note);
  var BW = LW - +m.ded, BD = rail - +m.shorter, bx0 = ctx.x0 + +m.ded / 2;
  if (BW < 100) { warnOnce(ctx.lbl + ': anga per siaura MERIVOBOX dėžei — dėžė nepridėta'); return null; }
  if (!ctx.matOwn && ctx.carcT && Math.abs(ctx.carcT - bt) > 0.3) warnOnce('MERIVOBOX dugnas ir galas pjaunami iš ' + num(bt) + ' mm plokštės, korpusas ' + num(ctx.carcT) + ' mm — nurodykite stalčių dugno / galo medžiagą (' + num(bt) + ' mm)');
  var pb = panel(ctx.name('DUGNAS'), 'STALC_DUGNAS', BW, BD, bt, ctx.lbl + ', MERIVOBOX ' + pk.code + ' dugnas (LW − ' + num(+m.ded) + ', NL − ' + num(+m.shorter) + '), priekis Y=0');
  place(pb, [bx0, ctx.y0, zs + bt], X, Y, Z); pb.mat = ctx.mat; pb.drawerOf = ctx.pname;
  var pg = panel(ctx.name('GALAS'), 'STALC_GALAS', BW, pk.backH, bt, ctx.lbl + ', MERIVOBOX ' + pk.code + ' galas, už dugno, apačia Y=0');
  place(pg, [bx0, ctx.y0 + BD, zs], X, Z, neg(Y)); pg.mat = ctx.mat; pg.eb.y1 = ctx.eb; pg.drawerOf = ctx.pname;
  return { parts:[pb, pg], pick:pk, box:{ code:pk.code, ext:pk.ext, sideH:pk.sideH, backH:pk.backH, zs:zs, x0:ctx.x0, x1:ctx.x1, bx0:bx0, bx1:bx0 + BW, y0:ctx.y0, len:rail - +m.boxShorter, rail:rail },
           hw:[{ item:'BLUM MERIVOBOX ' + pk.code + ' L=' + rail, qty:1, unit:'kompl.' }].concat(pk.ext ? [{ item:pk.ext === 'rail' ? 'BLUM MERIVOBOX galerija L=' + rail : 'BLUM MERIVOBOX BOXCAP L=' + rail, qty:1, unit:'kompl.' }] : []) };
}
function underDeduct(bt) { var d = R.under.ded; return d !== '' && d != null && +d > 0 ? +d : Math.round((42 + Math.max(0, bt - 16) * 7 / 3) * 2) / 2; }   // 16 → 42, 19 → 49
var DOOR_HW   = ["BLUM LANKSTAI", "BLUM TIP-ON", "KT. LANKSTAI", "BE FURNITŪROS"];
var CARGO_HW  = ["CARGO DTC PURE PRO"];   // a cargo section's fitting (its own section kind, like doors and drawers)
/* a cargo pull-out (section / front kind 'cargo'; a door section with a CARGO fitting from before reads the same): one front on the cargo frame (no hinge holes, no shelves — the cargo has its own
   baskets); the frame is screwed on with its own template, so nothing is drilled. Fitting = the cargo for the cabinet width. */
/* edges chosen by hand on one part (c.ebEdit[key] = { y0, y1, x0, x1: true / false, fac: true }): fac = a visible part (a hung
   cabinet's bottom, a top) banded with the fronts' edge — every banded edge gets the facade edge and is flagged (p.ebFac), so the
   label says PAGAL FASADA there instead of LAMINUOJASI */
function applyEbEdit(p, ov, eCarc, eFac) {   // per edge: true = banded (standard edge), 'fac' = banded as the fronts (label PAGAL FASADA), false = not banded
  var front = p.role === 'FASADAS' || p.role === 'DURYS', fac = !!ov.fac, emF = eFac || 'PAGAL FASADA', em = fac ? emF : ((front ? (eFac || eCarc) : eCarc) || 'KRAŠTAS'), ES = ['y0', 'y1', 'x0', 'x1'];
  ES.forEach(function (e) { if (ov[e] === true) p.eb[e] = fac ? emF : (p.eb[e] || em); else if (ov[e] === false) p.eb[e] = ''; else if (ov[e] === 'fac') p.eb[e] = emF; });
  if (fac) { p.ebFac = {}; ES.forEach(function (e) { if (p.eb[e]) { p.eb[e] = emF; p.ebFac[e] = true; } }); }
  else if (!front) ES.forEach(function (e) { if (ov[e] === 'fac') { p.ebFac = p.ebFac || {}; p.ebFac[e] = true; } });
  p.ebManual = true;
}
/* the shop's standard banding of the carcass: besides the front edges set where the parts are made, every edge of the sides,
   the bottom and the top that no other part covers is banded — a bottom under the sides gets its ends, a side its top end,
   and its bottom end when it runs past the bottom. The back edge is the one that is never seen: banded only when asked (ebBack). */
function stdEdges(out, eCarc, back) {
  var box = function (p) { var q = p.place, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    [0, p.L].forEach(function (a) { [0, p.W].forEach(function (b) { [0, p.T].forEach(function (d) { for (var i = 0; i < 3; i++) { var w = q.o[i] + a * q.u[i] + b * q.v[i] - d * q.n[i]; if (w < mn[i]) mn[i] = w; if (w > mx[i]) mx[i] = w; } }); }); });
    return { mn:mn, mx:mx }; };
  var solid = out.filter(function (p) { return p.place && p.role !== 'FASADAS' && p.role !== 'DURYS' && !p.drawerOf && p.T >= 8; }).map(function (p) { return { p:p, b:box(p) }; });
  solid.forEach(function (s0) { var p = s0.p; if (['KAIRE', 'DESINE', 'DUGNAS', 'VIRSUS'].indexOf(p.role) < 0) return;
    [['y0', p.place.v, -1], ['y1', p.place.v, 1], ['x0', p.place.u, -1], ['x1', p.place.u, 1]].forEach(function (E3) {
      var e = E3[0], nrm = E3[1].map(function (x) { return x * E3[2]; }), ax = Math.abs(nrm[0]) > 0.9 ? 0 : Math.abs(nrm[1]) > 0.9 ? 1 : Math.abs(nrm[2]) > 0.9 ? 2 : -1; if (ax < 0 || p.eb[e]) return;
      if (ax === 1) { if (nrm[1] > 0 && back) p.eb[e] = eCarc; return; }   // front edges are set with the part; the back edge only on request
      var sg = nrm[ax] > 0 ? 1 : -1, pl = sg > 0 ? s0.b.mx[ax] : s0.b.mn[ax], o1 = (ax + 1) % 3, o2 = (ax + 2) % 3, area = (s0.b.mx[o1] - s0.b.mn[o1]) * (s0.b.mx[o2] - s0.b.mn[o2]), cov = 0;
      solid.forEach(function (q) { if (q === s0) return; var near = sg > 0 ? q.b.mn[ax] : q.b.mx[ax]; if (Math.abs(near - pl) > 1.5) return;
        var a = Math.min(s0.b.mx[o1], q.b.mx[o1]) - Math.max(s0.b.mn[o1], q.b.mn[o1]), b2 = Math.min(s0.b.mx[o2], q.b.mx[o2]) - Math.max(s0.b.mn[o2], q.b.mn[o2]); if (a > 0 && b2 > 0) cov += a * b2; });
      if (cov < area * 0.5) p.eb[e] = eCarc; }); });
  out.forEach(function (p) { if (/^JUOSTA_/.test(p.role)) { if (!p.eb.y0) p.eb.y0 = eCarc; if (!p.eb.y1) p.eb.y1 = eCarc; } });   // tie rails: both long edges, always
}
function isCargo(h) { return /^CARGO\b/i.test(String(h || '')); }
function cargoOf(s) { return !s ? null : s.kind === 'cargo' ? (s.cargoHw || CARGO_HW[0]) : s.kind === 'doors' && !s.fridge && isCargo(s.hinge) ? s.hinge : null; }
var hingesPerDoor = function (h) { return h <= 900 ? 2 : h <= 1500 ? 3 : h <= 2000 ? 4 : 5; };   // same rule as the offer app
/* hinge positions along a door of height h, from its bottom edge: outer ones R.hinge.fromEnd from the ends, rest evenly between */
function hingeYs(h, nSet) { var n = +nSet >= 2 ? Math.round(+nSet) : hingesPerDoor(h), e = Math.min(R.hinge.fromEnd, h*0.25), ys = []; for (var q = 0; q < n; q++) ys.push(e + (h - 2*e)*q/(n - 1)); return ys; }
/* do two or more hinges physically fit on a door of height h? (cups/press-in dowels inside the panel, not overlapping) */
function hingesFit(h, press, nSet) {
  var hr = R.hinge, ys = hingeYs(h, nSet), half = press ? hr.dowelSpacing/2 + hr.dowelD/2 : hr.cupD/2, need = press ? hr.dowelSpacing + hr.dowelD : hr.cupD;
  if (ys[0] - half < 3) return false;
  for (var i = 1; i < ys.length; i++) if (ys[i] - ys[i-1] < need + 3) return false;
  return true;
}
/* override rule values (deep merge of plain objects), e.g. setRules({hinge:{cupFromEdge:21.5}}) */
function setRules(over) {
  (function merge(dst, src) { Object.keys(src || {}).forEach(function (k) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') merge(dst[k], src[k]);
    else if (src[k] !== undefined && src[k] !== null && (src[k] !== '' || typeof dst[k] === 'string')) dst[k] = Array.isArray(src[k]) ? src[k].slice() : src[k]; }); })(R, over);
}

var X = [1,0,0], Y = [0,1,0], Z = [0,0,1];
var neg = function (v) { return [-v[0], -v[1], -v[2]]; };

/* ----------------------------------------------------------------- panel model
   Panel: L (along machine X), W (along Y), T. Face A = the face defined as "up" for the
   part (inner face of a side, top face of bottom, inner face of a facade); face B the opposite.
   Holes on either face are given in the same (x,y) seen from face A. Edge holes: edge x0/x1
   (short ends) or y0/y1 (long edges), pos along it.
   Placement: point o is the panel's (x=0, y=0) corner on face A; u, v are the directions of
   panel x and y in cabinet axes, n the outward normal of face A. The body lies on the -n side. */
function pairedDowels(pos,w,off) {
  off=off||32;var result=[],attempts=0;
  function placeAt(i){if(++attempts>4096)return false;if(i===pos.length)return true;var v=pos[i],choices=v<=w/2?[v+off,v-off]:[v-off,v+off];
    for(var k=0;k<choices.length;k++){var a=Math.round(choices[k]*10)/10;if(a<8||a>w-8||pos.some(function(q){return Math.abs(q-a)<12;})||result.some(function(q){return Math.abs(q-a)<16;}))continue;
      result.push(a);if(placeAt(i+1))return true;result.pop();}return false;
  }
  // A pair is atomic: never substitute a second cam or drill only part of the dowel set.
  return placeAt(0)?result:[];
}
function panel(name, role, L, W, T, note) {
  return { name:name, role:role, L:L, W:W, T:T, note:note || "", holes:[], edges:[], warnings:[],
           eb:{ y0:"", y1:"", x0:"", x1:"" }, mat:"", place:null };
}
function place(p, o, u, v, n) { p.place = { o:o, u:u, v:v, n:n }; return p; }
function hole(p, face, x, y, d, depth, opts) { p.holes.push(Object.assign({ face:face, x:x, y:y, d:d, depth:depth || 0 }, opts || {})); }
function edge(p, e, pos, d, depth) { p.edges.push({ edge:e, pos:pos, d:d, depth:depth }); }
function legMarks(p, face, cx, cy) {
  var o = R.legs.markOff;
  [[-o,-o],[-o,o],[o,-o],[o,o]].forEach(function (ab) { hole(p, face, cx + ab[0], cy + ab[1], R.legs.markD, R.legs.markDepth, { mark:true }); });
}

/* make the long side run along X: rotate the whole part 90° if needed */
/* The machine frame must be right-handed: X along the part, Y across it, Z out of the face that is up (X × Y = Z).
   Some parts were described mirrored (e.g. the sides "inner face up, bottom X=0, front Y=0", the doors, the back rail),
   which put cams and hinge cups on the wrong side when drilled — the shop had to mirror those programs on the machine.
   Such a part is mirrored here across its width (y → W − y), so its programs come out right; the part itself does not move. */
function rightHanded(p) {
  var q = p.place; if (!q) return p;
  var c = [q.u[1]*q.v[2] - q.u[2]*q.v[1], q.u[2]*q.v[0] - q.u[0]*q.v[2], q.u[0]*q.v[1] - q.u[1]*q.v[0]];
  if (c[0]*q.n[0] + c[1]*q.n[1] + c[2]*q.n[2] > 0) return p;
  var W = p.W;
  p.holes.forEach(function (h) { h.y = W - h.y; });
  (p.grooves || []).forEach(function (g) { var y0 = g.y0; g.y0 = W - g.y1; g.y1 = W - y0; });
  p.edges.forEach(function (e) { if (e.edge === 'y0') e.edge = 'y1'; else if (e.edge === 'y1') e.edge = 'y0'; else e.pos = W - e.pos; });
  var y0 = p.eb.y0; p.eb.y0 = p.eb.y1; p.eb.y1 = y0;
  p.place = { o:[q.o[0] + W*q.v[0], q.o[1] + W*q.v[1], q.o[2] + W*q.v[2]], u:q.u, v:neg(q.v), n:q.n };
  p.note = p.note.replace(/Y=(DY|0)\b/g, function (m, g) { return g === 'DY' ? 'Y=0' : 'Y=DY'; });
  p.mirrored = true;
  return p;
}
function orient(p) {
  if (p.L >= p.W) return p;
  var L = p.L;
  p.holes.forEach(function (h) { var x = h.x, y = h.y; h.x = y; h.y = L - x; });
  (p.grooves || []).forEach(function (g) { var x0 = g.x0, x1 = g.x1, y0 = g.y0, y1 = g.y1; g.x0 = y0; g.x1 = y1; g.y0 = L - x1; g.y1 = L - x0; });
  var map = { x0:'y1', x1:'y0', y0:'x0', y1:'x1' };
  p.edges.forEach(function (e) { e.edge = map[e.edge]; });
  p.edges.forEach(function (e) { if (e.edge === 'x0' || e.edge === 'x1') e.pos = L - e.pos; });
  var eb = {}; Object.keys(p.eb).forEach(function (k) { eb[map[k]] = p.eb[k]; }); p.eb = eb;
  if (p.place) {   // new x = old y, new y = L - old x  →  u' = v, v' = -u, o' = o + L·u
    var q = p.place;
    p.place = { o:[q.o[0] + L*q.u[0], q.o[1] + L*q.u[1], q.o[2] + L*q.u[2]], u:q.v, v:neg(q.u), n:q.n };
  }
  var tmp = p.L; p.L = p.W; p.W = tmp;
  p.note = p.note.replace('apatinis kraštas Y=0', 'apatinis kraštas X=0');   // old y (height) became x
  return p;
}

/* ----------------------------------------------------------------- cabinet defaults */
function cncDefaults(c) {
  c.cnc = Object.assign({ joinery:'confirmat', back:'none', backFix:'confirmat', joints:{}, top:'rails', rails:null, railW:0, legs:true, topOverFacade:false, facadeT:18,
                          runnerMarks:true, tbFront:'mark', hinges:false, hingeFix:'screw', pins:'off' }, c.cnc || {});
  if (c.cnc.tbFront === true) c.cnc.tbFront = 'hole'; else if (c.cnc.tbFront === false) c.cnc.tbFront = 'off';   // old boolean form
  c.cnc.rails = Object.assign({ front:'h', back:'h', bottom:false }, c.cnc.rails || {});
  return c.cnc;
}
function newSection(kind) {
  return { kind:kind || 'doors', col:0, fill:(kind !== 'drawers'), height:kind === 'drawers' ? 700 : 400,
           nDrawers:3, hw:'BLUM TANDEMBOX', rail:500, nDoors:1, doorSplit:'v', hinge:'BLUM LANKSTAI', hingeSide:'auto',
           shelves:0, shelfAdj:true, shelfMode:'even', shelfPos:[] };
}
function newCabinet() {
  return { v:1, name:"", W:600, H:720, D:560, thick:18, cols:1, dishwasher:false,
           mat:{ carc:"", facade:"", back:"" }, edge:{ carc:"", facade:"" }, legH:100,
           cnc:{ joinery:'confirmat', back:'none', top:'rails', legs:true, topOverFacade:false, facadeT:18 },
           sections:[ Object.assign(newSection('drawers'), { fill:true, nDrawers:3 }) ] };
}
function safeName(s) { return ascii(String(s || '')).replace(/[^\w\-]+/g, '_'); }   // Aukšta → Auksta (program/label names stay plain ASCII)

/* ----------------------------------------------------------------- cabinet → panels */
/* split a section among n stacked fronts. hs = front heights from the TOP down (what the worker sees and measures);
   an empty / 0 entry shares what is left. Returns module heights (front + gap) from the BOTTOM up, and a note when
   the given heights do not fit (then the bottom-most given front takes the difference, or all share equally). */
function splitFronts(secH, n, hs, gap) {
  n = Math.max(1, Math.round(+n || 1)); gap = gap == null ? R.facade.gap : gap;
  var top = []; for (var i = 0; i < n; i++) { var v = hs && +hs[i] > 0 ? +hs[i] : 0; top.push(v); }
  var fixed = top.filter(function (v) { return v > 0; }), nAuto = n - fixed.length, sumFix = fixed.reduce(function (a, v) { return a + v + gap; }, 0), note = '';
  var mods;
  if (!fixed.length) mods = top.map(function () { return secH / n; });
  else if (nAuto > 0) {
    var rest = (secH - sumFix) / nAuto;
    if (rest < 80 + gap) { note = 'nurodyti fasadų aukščiai (' + fixed.join(' + ') + ') netelpa į sekciją ' + num(secH) + ' mm — fasadai padalinti po lygiai'; mods = top.map(function () { return secH / n; }); }
    else mods = top.map(function (v) { return v > 0 ? v + gap : rest; });
  } else if (Math.abs(sumFix - secH) > 0.5) {
    var last = -1; top.forEach(function (v, q) { if (v > 0) last = q; });
    var adj = top[last] + gap + (secH - sumFix);
    if (adj < 80 + gap) { note = 'fasadų aukščių suma (' + num(sumFix - n*gap) + ' + tarpai) neatitinka sekcijos ' + num(secH) + ' mm — fasadai padalinti po lygiai'; mods = top.map(function () { return secH / n; }); }
    else { note = 'fasadų aukščių suma neatitinka sekcijos ' + num(secH) + ' mm — apatinis fasadas ' + num(adj - gap) + ' mm'; mods = top.map(function (v, q) { return q === last ? adj : v + gap; }); }
  } else mods = top.map(function (v) { return v + gap; });
  return { mods:mods.slice().reverse(), note:note };
}

/* how far the shelves stand back from the carcass front: c.shelfSb mm (0 = flush with the front); not set → the rule (20) */
function shelfSetSb(c) { var v = c ? c.shelfSb : null; return v === '' || v == null || !isFinite(+v) ? null : Math.max(0, Math.min(150, +v)); }
function shelfPinF(sb) { return Math.max(R.pins.fromFront, sb + R.pins.fromFront - R.shelf.setback); }   // the front pin keeps its place under a shelf set further back
function buildCabinet(c, idx, projName) {
  if (c.kind === 'box') return buildBox(c, idx, projName);   // 3D construction: board by board
  var shSet = shelfSetSb(c), shSb = shSet == null ? R.shelf.setback : shSet, pinF = shelfPinF(shSb);
  var o = cncDefaults(c); var t = +c.thick || 18, W = +c.W, H = +c.H, D = +c.D;
  var base = safeName(projName || 'PROJ') + '_' + (idx + 1) + (c.name ? '_' + safeName(c.name) : '');
  var nm = function (role) { return base + '_' + role; };
  var out = [], warn = [], hw = [];
  var warnOnce = function (w) { if (warn.indexOf(w) < 0) warn.push(w); };
  var mat = c.mat || {}, ed = c.edge || {};
  var mCarc = mat.carc || '', mFac = mat.facade || mCarc, mBack = mat.back || mCarc, mTop = mat.top || mCarc, mDrw = mat.drawer || mCarc;   // mTop: a full top (STOGAS) in its own board; mDrw: MERIVOBOX base / back (16 mm)
  var eCarc = ed.carc || 'KRAŠTAS', eFac = ed.facade || '';   // no edge material named: the standard banding is still there, called KRAŠTAS
  var fT = +o.facadeT || 18;
  /* the fronts' gaps (o.fg, mm; empty = the rule): l / r at the sides, mid between fronts, top under the top / rails, bot = where the
     lowest fronts start, from the carcass bottom (negative: lower, down to the sides' bottom edges when the bottom is raised) */
  var fg = o.fg || {}, fgv = function (k, d) { var v = fg[k]; return v === '' || v == null || !isFinite(+v) ? d : +v; };
  var sideGapL = Math.max(0, fgv('l', R.facade.sideGap)), sideGapR = Math.max(0, fgv('r', R.facade.sideGap)), gap = Math.max(0, fgv('mid', R.facade.gap));
  /* visible sides (c.vis.L / R) and a hung cabinet's visible bottom (c.vis.B): those boards in the front material with the front edging
     on the edges that show (front; top and bottom of a tall or hung cabinet), and the edges of the bottom / top that show at them */
  var vis = c.vis || {}, hungC = c.type === 'PAKABINAMOS' || c.hang === true, tallC = c.type === 'ŪKINĖ', eVis = eFac || eCarc;
  var visB = !!vis.B && hungC;
  if ((vis.L || vis.R || visB) && fT !== t && mFac) warn.push('matomas šonas iš fasado medžiagos (' + mFac + ') — storis lieka ' + num(t) + ' mm, fasadų ' + num(fT) + ' mm: patikrinkite, ar tokia plokštė yra');
  /* part keys, edge banding chosen by hand (c.ebEdit[part key] = { y0, y1, x0, x1 }: true / false, in the part's own frame as on
     the label), cabinet number and short names (drawer box parts: STALC1-SONAS) */
  function finishParts() {
    if (!c.kind && !c.dishwasher) stdEdges(out, eCarc, !!o.ebBack);
    var ebEdit = c.ebEdit || {};
    out.forEach(function (p) {
      p.key = p.name.slice(base.length + 1);
      var ov = ebEdit[p.key]; if (!ov) return;
      applyEbEdit(p, ov, eCarc, eFac);
    });
    out.forEach(function (p) { p.cab = idx + 1; p.short = (idx + 1) + '-' + (p.drawerOf ? p.name.slice(base.length + 1).replace(/_/g, '-') : p.role.replace(/_/g, '-') + (/\d$/.test(p.name) ? p.name.match(/\d+$/)[0] : '')); });
  }

  var early = function () { return { panels:out, warnings:warn, hardware:hw, legs:[], joints:[], seams:[], visual:{ doors:[], drawers:[], plinth:null, hb:0 }, dims:{ W:W > 0 ? W : 0, H:H > 0 ? H : 0, D:D > 0 ? D : 0, t:t } }; };   // same shape as a full result
  if (c.kind === 'panel') {   // a loose board standing on its own in the room (a big side or end panel, a filler): W its thickness, H its height, D its depth. One part, only cut.
    var pe = c.pe || {}, eP = eCarc || eFac, anyE = pe.e1 !== false || pe.e2 !== false || pe.e3 !== false || pe.e4 !== false;
    if (!(W >= 3 && W <= 100 && H >= 30 && D >= 30)) { warn.push('netinkami matmenys: plokštės storis 3–100 mm, aukštis ir gylis ne mažiau 30 mm'); return early(); }
    if (!eP && anyE) { warnOnce('krašto medžiaga nenurodyta — kraštai pažymėti „KRAŠTAS“'); eP = 'KRAŠTAS'; }
    var pP = panel(nm('PLOKSTE'), 'PLOKSTE', H, D, W, 'atskira plokštė: L — aukštis, W — gylis (L1 priekis, L2 galas, W1 apačia, W2 viršus)');
    place(pP, [0, 0, 0], Z, Y, neg(X)); pP.mat = mCarc || mFac;
    pP.eb = { y0:pe.e1 !== false ? eP : '', y1:pe.e2 !== false ? eP : '', x0:pe.e3 !== false ? eP : '', x1:pe.e4 !== false ? eP : '' };
    warn.push('atskira plokštė: tik pjaunama — skylių ir programų nėra');
    out.push(orient(pP)); finishParts(); var rP = early(); rP.dims.t = W; return rP;
  }
  if (!(W > 0 && H > 0 && D > 0)) { warn.push('netinkami matmenys: plotis, aukštis ir gylis turi būti didesni už 0'); return early(); }
  if (!c.dishwasher && (W < 2*t + 60 || H < 2*t + 60 || D < 100)) { warn.push('netinkami matmenys: per maža spintelė (plotis ir aukštis ≥ ' + (2*t + 60) + ' mm, gylis ≥ 100 mm)'); return early(); }

  if (c.dishwasher) {   // dishwasher cabinet: front only, no programs
    warn.push('indaplovės spintelė: tik fasadas — programų negeneruojama');
    var dg = R.facade.dishGap, pd = panel(nm('FASADAS1'), 'FASADAS', W - dg, H - gap, fT, 'indaplovės fasadas, ' + num(dg) + ' mm siauresnis už nišą; galinė (vidinė) pusė viršuje, apatinis kraštas Y=0');
    place(pd, [dg / 2, 0, 0], X, Z, Y); pd.mat = mFac; pd.eb = { y0:eFac, y1:eFac, x0:eFac, x1:eFac };
    out.push(orient(pd)); finishParts();
    return early();
  }
  /* ---- bottom between the sides (o.bottom 'inside'), hb above the sides' bottom edges: the carcass is built H − hb high
     and lifted by hb at the end; the sides reach down to the floor (a plinth can close the gap) */
  var bin = o.bottom === 'inside', hb = bin ? Math.max(0, Math.min(+o.bottomZ || 0, H - 200)) : 0, Htot = H;
  if (bin && (+o.bottomZ || 0) > H - 200) warn.push('dugnas pakeltas tik ' + num(hb) + ' mm (nurodyta ' + num(+o.bottomZ) + ') — virš dugno turi likti bent 200 mm');
  if (bin) H = H - hb;
  var feetPos = [];   // pėdutės, as they are drilled (sides or bottom)
  /* ---- columns (pertvaros): outer widths as in the offer app; partition k stands centred on bnd[k+1] */
  var cols = Math.max(1, Math.min(4, Math.floor(+c.cols || 1)));
  var colW = Array.isArray(c.colW) && c.colW.length === cols && c.colW.every(function (w) { return +w > 0; }) ? c.colW.map(Number) : null;
  if (!colW) { colW = []; for (var q0 = 0; q0 < cols; q0++) colW.push(W / cols); }
  var sumCW = colW.reduce(function (a, b) { return a + b; }, 0); colW = colW.map(function (w) { return w * W / sumCW; });
  var bnd = [0]; colW.forEach(function (w, k) { bnd.push(bnd[k] + w); }); bnd[cols] = W;
  var ix0 = function (k) { return k === 0 ? t : bnd[k] + t/2; }, ix1 = function (k) { return k === cols - 1 ? W - t : bnd[k + 1] - t/2; };   // inside, between side / partition faces
  var fx0 = function (k) { return k === 0 ? sideGapL : bnd[k] + gap/2; }, fx1 = function (k) { return k === cols - 1 ? W - sideGapR : bnd[k + 1] - gap/2; };   // fronts of column k
  var tgL = function (k) { return k === 0 ? 'L' : { p:k - 1, f:'R' }; }, tgR = function (k) { return k === cols - 1 ? 'R' : { p:k, f:'L' }; };   // what a part in column k ends on
  if (cols > 1) colW.forEach(function (w, k) { if (ix1(k) - ix0(k) < 100) warn.push('kolona ' + (k + 1) + ' per siaura (' + num(ix1(k) - ix0(k)) + ' mm tarp šono ir pertvaros) — netinkami matmenys'); });
  /* ---- back per column: none | hdf (plaušas, nailed on the back) | solid (18 mm: one back on the back of the whole cabinet, or inside each column) */
  var colBacks = []; for (var q1 = 0; q1 < cols; q1++) colBacks.push(Array.isArray(o.backs) && o.backs[q1] ? o.backs[q1] : (!o.back || o.back === 'none' ? 'none' : 'solid'));
  var solidMount = o.backMount || (o.back === 'inside' ? 'inside' : 'top');
  var backTop = colBacks.every(function (b) { return b === 'solid'; }) && solidMount === 'top';
  var inBack = function (k) { return !backTop && colBacks[k] === 'solid'; };
  var anyInside = colBacks.some(function (b, k) { return inBack(k); }), anyHdf = colBacks.some(function (b) { return b === 'hdf'; });
  var hdfT = +R.hdf.t || 3;
  var tb = backTop ? t : anyHdf ? hdfT : 0;        // depth taken by the back behind the sides
  var topFull = o.top === 'full';
  var camOut = o.camOut || {};   // eccentrics on the outer face of the back / bottom / top between the sides (default: inner face)
  var tin = topFull && o.topMount === 'inside', tOver = topFull && !tin && !!o.topOverFacade;   // the top between the sides: the sides reach the cabinet top (their top ends show)
  var Dside = D - tb;                              // side depth
  /* a shorter bottom (o.bottomD, from the front): room behind it for a sink's pipes; its joints, the legs and the standing bottom rail go with it */
  var Dbot = +o.bottomD > 0 ? Math.max(100, Math.min(Dside, +o.bottomD)) : Dside, shortBot = Dbot < Dside - 0.5;
  if (+o.bottomD > Dside + 0.5) warn.push('dugno gylis ' + num(+o.bottomD) + ' mm didesnis už šono gylį — dugnas per visą gylį (' + num(Dside) + ' mm)');
  if (shortBot && (tb > 0 || anyInside)) warn.push('dugnas sutrumpintas iki ' + num(Dbot) + ' mm — nugara apačioje prie dugno nepritvirtinama; rinkitės „be nugaros“ arba tvirtinkite kitaip');
  var Lside = topFull ? H - 2*t : H - t;           // side height
  var rw = +o.railW > 0 ? +o.railW : R.rail;       // rail width
  /* surišimo juostos (only with a rail top): front flat/standing/none, back flat/standing/both/none, standing rail on the bottom at the back */
  var rl = topFull ? { front:'none', back:'none', bottom:false } : { front:o.rails.front, back:o.rails.back, bottom:!!o.rails.bottom };
  if (anyInside && (rl.back === 'v' || rl.back === 'hv' || rl.bottom)) {
    warn.push('nugara viduje: stačios galinės juostos netelpa šalia nugaros — praleistos');
    rl.back = rl.back === 'hv' ? 'h' : rl.back === 'v' ? 'none' : rl.back; rl.bottom = false;
  }
  var backH = rl.back === 'h' || rl.back === 'hv', backV = rl.back === 'v' || rl.back === 'hv';
  if (!topFull && rl.front === 'none' && rl.back === 'none') warn.push('viršuje nėra nei viršaus, nei juostų — karkasas nesurištas');
  var bkIn = anyInside && +o.backInset > 0 ? Math.min(+o.backInset, Math.max(0, Dside - t - 100)) : 0;   // an inside back set forward from the sides' back edge (room for a wall rail, pipes, an uneven wall)
  /* an inside back (in every column) may cover the bottom between the sides and / or the top between them or the flat back rail:
     it then runs down to the carcass bottom / up to its top, and that board stops at the back's front face */
  var bcv = o.backCover || {}, allIn = anyInside && colBacks.every(function (b, k) { return inBack(k); });
  var covB = allIn && bin && !rl.bottom && !shortBot && !!bcv.bottom, covT = allIn && !!bcv.top && (tin || (!topFull && backH && !backV && cols === 1));
  if (allIn && bcv.bottom && !covB) warnOnce('nugara dengia dugną tik kai dugnas tarp šonų ir per visą gylį — nugara stovi ant dugno');
  if (allIn && bcv.top && !covT) warnOnce('nugara dengia viršų tik kai viršus tarp šonų arba gulsčia galinė juosta (be pertvarų) — nugara po viršumi');
  if (covB) Dbot = Dside - t - bkIn;
  var DtopIn = covT && tin ? Dside - t - bkIn : Dside, yRB = covT && !tin ? Dside - t - bkIn : Dside;   // the shortened top between the sides; the flat back rail moved forward
  if (anyInside && +o.backInset > bkIn + 0.5) warn.push('nugaros atitraukimas sumažintas iki ' + num(bkIn) + ' mm — spintelė per sekli');
  var yBk = Dside - bkIn;                          // the inside back's rear face
  var clearBackK = function (k) { return inBack(k) ? t + bkIn : (backV || rl.bottom) ? t : 0; };   // shelves stop in front of an inside back / standing back rails
  var unver = []; var U = function (s) { if (unver.indexOf(s) < 0) unver.push(s); };
  var cf = R.confirmat, cm = R.cam;

  /* ---- sections → facades (bottom-up) and drawer runner heights (relative to carcass bottom), column by column */
  var zTop0 = H - (tOver ? t : (topFull ? 0 : R.facade.zoneGapRails));   // by the rule the top gap is this + gap (each front's gap is above it)
  var topRef = H - (tOver ? t : 0);   // the top gap is measured from here: the cabinet top, or the underside of a top that covers the fronts
  var zTopF = fg.top === '' || fg.top == null || !isFinite(+fg.top) ? zTop0 : topRef - Math.max(0, +fg.top) + gap;
  /* the fronts' bottom: from the bottom board's face; minus = lower — below a raised bottom to the sides' bottom edges and on
     past them (a hung cabinet's fronts reaching below the carcass as a grip, a base cabinet's over its legs, stopping 10 mm
     above the floor) */
  var legHf = legHeight(c), botLow = -hb - (legHf > 0 ? Math.max(0, legHf - 10) : 300);
  var zBotF = Math.max(botLow, fgv('bot', 0));
  if (fgv('bot', 0) < botLow - 0.5) warnOnce('fasadai gali nusileisti tik ' + num(-botLow) + ' mm žemiau dugno' + (legHf > 0 ? ' (10 mm virš grindų)' : ''));
  var Hz = zTopF - zBotF;   // facade zone height
  /* a visible side (fronts' material) of a cabinet without legs goes down with fronts that reach below the carcass, so from the
     side it looks like the fronts: extS = how much longer; with the bottom under the sides, the bottom goes between that side
     (sideIn) — its end joined to the side's face like a bottom between the sides */
  var extS = { L:0, R:0 }, sideIn = { L:false, R:false };
  ['L', 'R'].forEach(function (k) { if (vis[k] && !o.legs && !c.dishwasher) { var e = Math.max(0, -hb - zBotF); if (e > 0.5) { extS[k] = e; sideIn[k] = !bin; } } });
  var runners = [], facades = [], doors = [], shelves = [], shelfInfo = [];
  for (var colN = 0; colN < cols; colN++) (function (col) {
    var secs = (c.sections || []).filter(function (s) { return Math.min(cols - 1, Math.max(0, Math.floor(+s.col || 0))) === col; });
    var lbl = function (si) { return 'sekcija ' + (cols > 1 ? (col + 1) + '.' : '') + (si + 1); };
    var F0 = fx0(col), FW = fx1(col) - fx0(col);
    var sumExp = 0, nFill = 0; secs.forEach(function (s) { if (s.fill) nFill++; else sumExp += Math.max(0, +s.height || 0); });
    var fillH = nFill > 0 ? Math.max(0, Hz - sumExp) / nFill : 0;
    if (sumExp > Hz + 0.5) warn.push((cols > 1 ? 'kolona ' + (col + 1) + ': ' : '') + 'sekcijų aukščių suma (' + sumExp + ') didesnė už fasadų zoną (' + num(Hz) + ')');
    /* a dividing shelf between an open section and the fronted section next to it (open section's `divider`): fixed, and
       placed on the fronted section's side of the border, so the doors / drawer fronts cover its edge and the niche keeps its height */
    var divs = [], fronted = function (q) { return !!q && (q.kind === 'drawers' || q.kind === 'doors' || q.kind === 'cargo') && !q.fridge; };
    (function () { var y = zBotF; secs.forEach(function (q, qi) { var h = q.fill ? fillH : Math.max(0, +q.height || 0);
      if (q.kind === 'open' && q.divider) { if (fronted(secs[qi + 1])) divs.push({ z:y + h, sec:qi }); if (fronted(secs[qi - 1])) divs.push({ z:y - t, sec:qi }); }
      y += h; }); })();
    divs.forEach(function (d) { shelves.push({ z:d.z, sec:d.sec, fixed:true, col:col, divider:true }); });
    var yCur = zBotF;
    secs.forEach(function (s, si) {
      var secH = s.fill ? fillH : Math.max(0, +s.height || 0);
      if ((s.kind === 'drawers' || s.kind === 'doors' || s.kind === 'cargo') && (secH < 60 + gap || FW < 60)) { warn.push(lbl(si) + ': per maža sekcija (' + num(FW) + ' × ' + num(secH) + ' mm) — fasadai nepridėti, padidinkite aukštį'); yCur += secH; return; }
      if (s.kind === 'drawers') {
        var n = Math.max(1, Math.round(+s.nDrawers || 1)), sp = splitFronts(secH, n, s.frontH, gap), fbs = [0];
        sp.mods.forEach(function (m) { fbs.push(fbs[fbs.length - 1] + m); });
        if (sp.note) warn.push(lbl(si) + ': ' + sp.note);
        var rt = R.runner[s.hw]; if (!rt) warn.push(lbl(si) + ': bėgeliams „' + s.hw + '" skylių šablono nėra — bėgelių žymės nepridėtos');
        for (var j = 0; j < n; j++) {
          var fb = yCur + fbs[j], fh = sp.mods[j];
          if (fh - gap < 40) { warnOnce(lbl(si) + ': per daug stalčių šiam aukščiui — ' + n + ' fasadai po ' + num(fh - gap) + ' mm; sumažinkite skaičių'); continue; }
          facades.push({ w:FW, h:fh - gap, bottom:fb, x:F0, hw:s.hw, sec:si, idx:j, col:col });
          if (rt) runners.push({ fb:fb, type:s.hw, col:col, rail:+s.rail || 500 });
          if (!(rt && rt.merivo)) hw.push({ item:(s.hw || 'Stalčiaus bėgeliai') + ' L=' + (+s.rail || 500), qty:1, unit:'kompl.' });
        }
        if (+s.innerDrawers > 0) warn.push(lbl(si) + ': vidiniai stalčiai dar nepalaikomi');
      } else if (s.kind === 'doors' || s.kind === 'cargo') {
        /* an integrated fridge: its fronts (one, or two over each other for a fridge-freezer) are screwed to the fridge's own doors —
           no hinges, no hinge holes; the niche gets fixed shelves (below) instead of adjustable ones */
        var fridge = s.kind === 'doors' && !!s.fridge;
        if (+s.innerDrawers > 0 && !fridge) warn.push(lbl(si) + ': vidiniai stalčiai už durų dar nepalaikomi — nebraižomi ir negręžiami');
        var cargoHw = cargoOf(s), cargo = !!cargoHw, hingedSec = !fridge && !cargo && s.hinge !== 'BE FURNITŪROS';
        if (hingedSec && !o.hinges) warn.push(lbl(si) + ': durys — lankstų skylės išjungtos (gręžiama rankomis)');
        /* cargo: one front, no shelves — the section's door count and shelves stay saved for when it goes back to doors */
        var nd = fridge ? Math.max(1, Math.min(3, Math.round(+s.nDoors || 2))) : cargo ? 1 : Math.max(1, Math.round(+s.nDoors || 1)), horiz = fridge || (!cargo && s.doorSplit === 'h'), hs = s.hingeSide || 'auto';
        var dsp = horiz ? splitFronts(secH, nd, s.frontH, gap) : null, dzs = [0];
        if (dsp) { dsp.mods.forEach(function (m) { dzs.push(dzs[dzs.length - 1] + m); }); if (dsp.note) warn.push(lbl(si) + ': ' + dsp.note); }
        for (var k = 0; k < nd; k++) {
          var dw = horiz ? FW : (FW - (nd - 1)*gap) / nd;
          var dh = horiz ? dsp.mods[k] - gap : secH - gap;
          var dx = horiz ? F0 : F0 + k*(dw + gap);
          var dz = horiz ? yCur + dzs[k] : yCur;
          /* doors reaching down over the open niche under them (section's frontDrop, mm): the lowest doors are that much longer */
          var below = secs[si - 1], drop = !fridge && below && below.kind === 'open' && (!horiz || k === 0) ? Math.max(0, Math.min(+s.frontDrop || 0, (below.fill ? fillH : +below.height || 0) - 20)) : 0;
          if (drop > 0) { dz -= drop; dh += drop; }
          if (dw < 40 || dh < 40) { warnOnce(lbl(si) + ': durys per mažos (' + num(dw) + ' × ' + num(dh) + ' mm) — sumažinkite durų skaičių'); continue; }
          var hl = horiz ? hs !== 'right' : (hs === 'left' ? true : hs === 'right' ? false : k < nd - 1);   // same rule as the offer app's sketch
          /* hinge heights on the door: catalogue spacing, kept clear of the bottom panel and the top / top rail so the
             mounting plate screws (±plateSpacing/2) land in the free part of the side; cups and plates share these */
          var hr0 = R.hinge, clr = hr0.plateSpacing/2 + hr0.plateD/2 + 3;
          var lo = t + clr - dz, hi = t + Lside - (topFull ? 0 : t) - clr - dz;
          divs.forEach(function (d) { if (d.z + t/2 > dz && d.z + t/2 < dz + dh) { if (d.z - dz < dh/2) lo = Math.max(lo, d.z + t + clr - dz); else hi = Math.min(hi, d.z - clr - dz); } });   // plates clear of a dividing shelf behind the door
          var nH = +s.hingeN >= 2 ? Math.min(6, Math.round(+s.hingeN)) : 0;   // hinges per door chosen in the section, or by the door height
          var ys = hingeYs(dh, nH).map(function (y) { return Math.max(lo, Math.min(hi, y)); });
          var fits = !hingedSec || (hingesFit(dh, o.hingeFix === 'press', nH) && ys.every(function (y, q) { return q === 0 || ys[q] - ys[q-1] >= hr0.cupD + 3; }));
          if (hingedSec && o.hinges && !fits) warnOnce('durys ' + num(dw) + '×' + num(dh) + ': per žemos lankstams — lankstų skylės nepridėtos');
          if (hingedSec && o.hinges && fits && hingeYs(dh, nH).some(function (y, q) { return Math.abs(y - ys[q]) > 0.01; })) warnOnce('durys ' + num(dw) + '×' + num(dh) + ': lankstas perkeltas, kad plokštelė nepatektų po viršumi/juosta');
          doors.push({ w:dw, h:dh, x:dx, z:dz, sec:si, hingeLeft:cargo ? undefined : hl, hinged:hingedSec && fits, ys:ys, col:col, fridge:fridge, cargo:cargo });
          if (cargo) hw.push({ item:String(cargoHw).toUpperCase() + ' W=' + Math.round(cols > 1 ? FW + 2 * gap : W), qty:1, unit:'kompl.' });
          else if (hingedSec && s.hinge) hw.push({ item:s.hinge, qty:nH || hingesPerDoor(dh), unit:'vnt.' });
        }
      }
      if (s.kind === 'oven' && +s.shelves > 0) {   // appliance support shelves: niche bottom, then niche top (as in the offer app)
        var nSup = Math.round(+s.shelves);
        if (nSup >= 1 && yCur >= t) shelves.push({ z:yCur, sec:si, fixed:true, oven:true, col:col });
        if (nSup >= 2 && yCur + secH <= t + Lside - t) shelves.push({ z:yCur + secH - t, sec:si, fixed:true, oven:true, col:col });
        if (nSup > 2) warn.push(lbl(si) + ': daugiau nei 2 orkaitės atramos lentynos — pridėtos tik apatinė ir viršutinė');
      } else if (s.kind === 'doors' && s.fridge) {   // the fridge niche: its floor (when something is under it) and its ceiling, fixed, open at the back for the air
        if (yCur >= t) shelves.push({ z:yCur, sec:si, fixed:true, oven:true, fridge:true, col:col });
        if (yCur + secH <= t + Lside - t) shelves.push({ z:yCur + secH - t, sec:si, fixed:true, oven:true, fridge:true, col:col });
      } else if ((s.kind === 'doors' || s.kind === 'open') && +s.shelves > 0 && !cargoOf(s)) {
        var ns = Math.round(+s.shelves), z0 = Math.max(yCur, t), z1 = Math.min(yCur + secH, topFull ? H - t : H - t);
        var manual = Array.isArray(s.shelfPos) && (s.shelfMode === 'manual' || s.shelfPos.some(function (v) { return +v > 0; })), shInf = { col:col, sec:si, base:yCur, zc:[] };
        for (var m = 0; m < ns; m++) {
          var zc = z0 + (m + 1)*(z1 - z0)/(ns + 1);                        // shelf centre
          if (manual && +s.shelfPos[m] > 0) zc = Math.max(z0 + t/2, Math.min(z1 - t/2, yCur + (+s.shelfPos[m])));   // offer app: height of the shelf (its middle) from the section bottom
          shelves.push({ z:zc - t/2, sec:si, fixed:s.shelfAdj === false, col:col }); shInf.zc.push(zc);
        }
        shelfInfo.push(shInf);   // for the editor: each shelf's height from the section bottom
        if (s.shelfAdj !== false) hw.push({ item:'Lentynų laikikliai', qty:4*ns, unit:'vnt.' });
      }
      yCur += secH;
    });
  })(colN);
  /* shelves that would cut into the bottom, the top / a standing front rail, or another shelf (sections too low for their
     shelves) are left out with a note; fixed shelves and appliance supports win over adjustable ones */
  (function () {
    var keep = [], ord = shelves.map(function (s, i) { return { s:s, i:i }; }).sort(function (a, b) { return ((a.s.fixed ? 0 : 1) - (b.s.fixed ? 0 : 1)) || a.i - b.i; });
    ord.forEach(function (q) { var s = q.s, ceil = topFull ? H - t : (s.oven && rl.front === 'v' ? H - rw : H - t);
      if (s.z < t - 0.01 || s.z + t > ceil + 0.01) { warnOnce('sekcija per žema lentynai (' + num(Math.round(s.z + t/2)) + ' mm aukštyje) — lentyna nepridėta, padidinkite sekciją'); return; }
      if (keep.some(function (k) { return k.col === s.col && Math.abs(k.z - s.z) < t + 2; })) { warnOnce('lentynos per arti viena kitos (' + num(Math.round(s.z + t/2)) + ' mm aukštyje) — viena nepridėta, sumažinkite lentynų skaičių'); return; }
      keep.push(s); });
    if (keep.length < shelves.length) {   // shelf supports: 4 per adjustable shelf that stays
      for (var q = hw.length - 1; q >= 0; q--) if (hw[q].item === 'Lentynų laikikliai') hw.splice(q, 1);
      var nAdj = keep.filter(function (s) { return !s.fixed; }).length; if (nAdj) hw.push({ item:'Lentynų laikikliai', qty:4 * nAdj, unit:'vnt.' }); }
    shelves = shelves.filter(function (s) { return keep.indexOf(s) >= 0; });
  })();
  /* a hinge's mounting plate (±22 mm on the side face, from 18 to 62 mm behind the front edge) must not sit where a shelf
     of the same column is: the hinge moves just above or below the shelf, or a note asks to move the shelf */
  doors.forEach(function (d) {
    if (!d.hinged || !d.ys) return;
    var hr = R.hinge, half = 23, clr = hr.plateSpacing/2 + hr.plateD/2 + 3, sh = shelves.filter(function (s) { return (s.col || 0) === d.col; });
    var lo = Math.max(hr.cupD/2 + 3, t + clr - d.z), hi = Math.min(d.h - hr.cupD/2 - 3, t + Lside - (topFull ? 0 : t) - clr - d.z);
    var hits = function (y) { var z = d.z + y; return sh.some(function (s) { return z + half > s.z && z - half < s.z + t; }); };
    var moved = false, stuck = false;
    d.ys = d.ys.map(function (y, qi, all) {
      if (!hits(y)) return y;
      var cands = []; sh.forEach(function (s) { cands.push(s.z - half - 0.5 - d.z, s.z + t + half + 0.5 - d.z); });
      cands = cands.filter(function (yy) { return yy >= lo && yy <= hi && !hits(yy) && all.every(function (o, k) { return k === qi || Math.abs(o - yy) >= hr.cupD + 3; }); })
        .sort(function (a, b) { return Math.abs(a - y) - Math.abs(b - y); });
      if (cands.length && Math.abs(cands[0] - y) <= 120) { moved = true; return Math.round(cands[0] * 10) / 10; }
      stuck = true; return y; });
    if (moved) warnOnce('durys ' + num(d.w) + '×' + num(d.h) + ': lankstas perkeltas, kad plokštelė nesikirstų su lentyna — patikrinkite');
    if (stuck) warnOnce('durys ' + num(d.w) + '×' + num(d.h) + ': lanksto plokštelė kertasi su lentyna — patikrinkite lentynų aukščius');
  });


  /* ---- joints. Holes in the sides are collected first (side coords: x along the side from its bottom end,
     yf from the front edge) and drilled when the sides are built. Rule for both systems: the part whose END meets
     the other part's FACE carries the edge bores (confirmat pilot Ø5×32, or cam bolt Ø8×34 + cam Ø15 in its face);
     the face gets the confirmat Ø8 through hole, or the Ø8×15 bolt hole and Ø8×12 dowels. */
  var SJ = [], SB = [];     // SJ: holes in the sides' inner face; SB: bores in the sides' back edge
  var sideHole = function (x, yf, d, depth, through, side) { SJ.push({ x:x, yf:yf, d:d, depth:depth || 0, through:!!through, side:side }); };   // side 'L'/'R' only when the two sides differ
  /* ---- joint table: every joint can take its own connector (confirmat | cam | dowel), count and edge distance.
     Defaults are the verified SWOOD patterns; o.joints[key] = { type, n, e } overrides. */
  var J = o.joints || {}, jointsInfo = [], seenJ = {};
  if (J.part) { J = Object.assign({}, J); for (var jk = 1; jk < 4; jk++) ['partB', 'partT'].forEach(function (b) { if (!J[b + jk]) J[b + jk] = J.part; }); }   // projects saved before each partition joint was its own
  var TYPE_LT = { confirmat:'konfirmatai', cam:'ekscentrikai', dowel:'kaiščiai' };
  /* joint lines for the 3D editor: where a joint's connectors sit in the cabinet (x across, y from the front, z up from the
     carcass bottom), the direction its positions are measured in and its length; the right side is the mirror */
  var seams = [], lastJ = {};
  /* a seam shorter or longer than the joint's first use (e.g. a deeper shelf in a column with plaušas) carries the spots drilled on it */
  function at(key, sd, w) { var r = lastJ[key + '|' + w], f = jointsInfo.filter(function (j) { return j.key === key; })[0];
    if (!r || !f || Math.abs(f.w - w) < 0.01) return null; r = r[f.single ? 'L' : sd]; return { type:r.type, pos:r.pos.slice(), dowels:r.dowels.slice() }; }
  function seam(key, o3, d3, w) { [false, true].forEach(function (r) { var sd = r ? 'R' : 'L', q = { key:key, side:sd, o:[r ? W - o3[0] : o3[0], o3[1], o3[2]], d:d3.slice(), w:w }, a = at(key, sd, w); if (a) q.at = a; seams.push(q); }); }
  function seam1(key, side, o3, d3, w) { var q = { key:key, side:side, o:o3.slice(), d:d3.slice(), w:w }, a = at(key, side, w); if (a) q.at = a; seams.push(q); }   // one end only (parts inside a column)
  function lin(w, n, e) { if (n <= 1) return [w/2]; var r = []; for (var i = 0; i < n; i++) r.push(e + (w - 2*e)*i/(n - 1)); return r; }
  function camDowels(pos,w){return pairedDowels(pos,w,cm.dowel.offset);}
  /* connectors along a joint: two, near the ends; a third in the middle only on a joint longer than R.joint3From (550 mm) */
  function defSpots(w, kind, type) {
    var e, n, pos, three = w > R.joint3From;
    if (kind === 'long') { pos = [cf.railAlong, w/2, w - cf.railAlong]; return { pos:pos, n:3, e:pos[0], dowels:[] }; }   // along a rail: the verified 3-cam pattern
    if (kind === 'rail') { if (type === 'cam') { pos = [w/2]; return { pos:pos, n:1, e:w/2, dowels:camDowels(pos, w) }; }
      pos = w === 100 ? cf.railFromEdge.slice() : [30, w - 30]; return { pos:pos, n:2, e:pos[0] }; }
    if (kind === 'carc') { e = type === 'cam' ? cm.cam.fromFront : cf.fromFront; pos = three ? [e, w/2, w - e] : [e, w - e];
      return { pos:pos, n:pos.length, e:e, dowels:type === 'cam' ? [e + cm.dowel.offset, w - e - cm.dowel.offset] : [] }; }
    if (kind === 'back') { e = type === 'cam' ? R.backCam.fromEnd : cm.backFix.fromEdge; pos = three ? [e, w/2, w - e] : [e, w - e];
      return { pos:pos, n:pos.length, e:e, dowels:type === 'cam' ? (w >= 2*e + 2*cm.dowel.offset + 40 ? [e + cm.dowel.offset, w - e - cm.dowel.offset] : []) : [] }; }
    /* shelf */
    if (type === 'cam') { var ec = cm.cam.fromFront; pos = w >= 2*ec + 100 ? (three ? [ec, w/2, w - ec] : [ec, w - ec]) : [w/2];
      return { pos:pos, n:pos.length, e:pos[0], dowels:pos.length > 1 ? [ec + cm.dowel.offset, w - ec - cm.dowel.offset] : [] }; }
    e = cf.fromFront; pos = w >= 2*e + 80 ? (three ? [e, w/2, w - e] : [e, w - e]) : w >= 120 ? [40, w - 40] : [w/2];
    return { pos:pos, n:pos.length, e:pos[0] };
  }
  /* verified on the shop's SWOOD cabinets: carcass bottom/top with confirmats or cams, confirmat rails, back on the back with confirmats */
  var VERIFIED = { bottom:['confirmat', 'cam'], top:['confirmat', 'cam'], railF:['confirmat'], railB:['confirmat'], railV:['confirmat'], railBottom:['confirmat'], back:['confirmat'] };
  /* o.joints[key] = { type, n, e, pos } for both sides, or { L:{…}, R:{…} } when the left and right side differ */
  function joint(key, w, kind, label, dflt) {
    var J0 = J[key] || {}, split = !!(J0.L || J0.R), res = {};
    dflt = dflt || o.joinery;
    ['L', 'R'].forEach(function (sd) { res[sd] = resolve(split ? (J0[sd] || {}) : J0, w, kind, split ? label + ' (' + (sd === 'L' ? 'kairė' : 'dešinė') + ')' : label, dflt); });
    var same = res.L.type === res.R.type && res.L.pos.join() === res.R.pos.join() && res.L.dowels.join() === res.R.dowels.join();
    lastJ[key + '|' + w] = res;
    if (!seenJ[key]) {
      seenJ[key] = 1;
      var side = function (r) { return { type:r.type, pos:r.pos.slice(), dowels:r.dowels.slice(), n:r.n, e:r.e, manual:r.cust, custom:r.type !== dflt || !!r.n || !!r.e || r.cust,
                                        defPos:r.base.pos.slice(), defN:r.base.n, defE:Math.round(r.base.e*10)/10, minGap:r.minGap, minEdge:r.minEdge }; };
      var a = side(res.L), b = side(res.R);
      var single = /^(part[BTFR]\d|backP\d|railVH|railBotB)$/.test(key);   // one joint line, no left / right side
      jointsInfo.push(Object.assign({ key:key, label:label, dflt:dflt, w:w }, a, { custom:a.custom || b.custom || split, split:split && !same && !single, single:single, sides:{ L:a, R:single ? a : b } }));
      [res.L, res.R].forEach(function (r) {
        if ((VERIFIED[key] || []).indexOf(r.type) < 0) U(label + ' (' + TYPE_LT[r.type] + ')');
        else if (r.n || r.e || r.cust) U(label + ': pakeistos vietos');
      });
    }
    return { L:res.L, R:res.R, same:same, type:res.L.type, pos:res.L.pos, dowels:res.L.dowels,
             has:function (t) { return res.L.type === t || res.R.type === t; } };
  }
  function resolve(j, w, kind, label, dflt) {
    var type = TYPE_LT[j.type] ? j.type : dflt;
    var base = defSpots(w, kind, type);
    var n = +j.n > 0 ? Math.round(+j.n) : 0, e = +j.e > 0 ? +j.e : 0, pos = base.pos, dws = base.dowels || [];
    var minGap = type === 'cam' ? 24 : 16, minEdge = type === 'cam' ? 12 : 9;
    var cust = Array.isArray(j.pos) ? j.pos.map(Number).filter(function (a) { return isFinite(a); }) : null;
    if (cust) {   /* connectors placed one by one (3D editor): mm along the joint from its start (front / bottom / back end) */
      var clampN = 0, kept = [];
      cust.map(function (a) { var b = Math.max(minEdge, Math.min(w - minEdge, a)); if (Math.abs(b - a) > 0.05) clampN++; return Math.round(b*10)/10; })
          .sort(function (a, b) { return a - b; })
          .forEach(function (a) { if (!kept.length || a - kept[kept.length - 1] >= minGap - 0.01) kept.push(a); });
      if (clampN) warnOnce(label + ': ' + clampN + ' jungt. buvo per arti krašto — perkelta į ' + num(minEdge) + ' mm nuo krašto, patikrinkite');
      if (kept.length < cust.length) warnOnce(label + ': ' + (cust.length - kept.length) + ' jungt. per arti kitos (mažiau nei ' + minGap + ' mm) — praleista');
      if (!kept.length) warnOnce(label + ': nėra nė vienos jungties — mazgas nesurištas');
      pos = kept; dws = type === 'cam' && kept.length ? camDowels(pos, w) : []; n = 0; e = 0;
    } else if (n || e) {
      var nn = n || base.n, ee = e || base.e;
      if (nn > 1 && !e && base.n === 1) ee = Math.max(minEdge, Math.min(30, w/4));   // one centred cam → spread them out
      ee = Math.max(minEdge, Math.min(ee, w/2));
      var maxN = ee >= w/2 - 0.01 ? 1 : Math.floor((w - 2*ee)/minGap + 1e-9) + 1;
      if (nn > maxN) { warnOnce(label + ': ' + nn + ' jungtys netelpa ' + num(w) + ' mm pločio — sumažinta iki ' + maxN); nn = maxN; }
      pos = lin(w, nn, ee); dws = type === 'cam' ? camDowels(pos, w) : [];
    }
    if(type==='cam'){dws=camDowels(pos,w);if(dws.length!==pos.length)warnOnce(label+': ekscentrikui ir kaiščiui nepakanka vietos — pakeiskite jungčių vietas');}
    dws = dws.filter(function (a) { return pos.every(function (q) { return Math.abs(q - a) >= 12; }); });   // keep dowels clear of the bolts
    return { type:type, pos:pos, dowels:dws, n:n, e:e, cust:!!cust, base:base, minGap:minGap, minEdge:minEdge };
  }
  /* a part between the sides, its ends x0 (left) / x1 (right); along(a) maps a position across the end (panel y) to side coords */
  var endShift = { L:0, R:0 };   // how far the last endJoint moved each end's set on a partition (the seam drawn in 3D moves with it)
  function seamS(key, sd, o3, d3, w) { seam1(key, sd, o3.map(function (v, i) { return v + endShift[sd]*d3[i]; }), d3, w); }
  function endJoint(p, L, J2, camFace, along, tl, tr) {   // tl/tr: what the left/right end meets when it is not the cabinet side (a partition)
    endShift = { L:0, R:0 };
    if (!J2.same || tl || tr) { endSide(p, L, J2.L, 'L', camFace, along, tl || 'L'); endSide(p, L, J2.R, 'R', camFace, along, tr || 'R'); return; }
    var jt = J2.L;
    if (jt.type === 'cam') {
      jt.pos.forEach(function (a) {
        hole(p, camFace, cm.cam.fromEdge, a, cm.cam.d, cm.cam.depth); hole(p, camFace, L - cm.cam.fromEdge, a, cm.cam.d, cm.cam.depth);
        edge(p, 'x0', a, cm.bolt.d, cm.bolt.depthEdge); edge(p, 'x1', a, cm.bolt.d, cm.bolt.depthEdge);
        var q = along(a); sideHole(q.x, q.yf, cm.bolt.d, cm.bolt.depthFace);
      });
      jt.dowels.forEach(function (a) {
        edge(p, 'x0', a, cm.dowel.d, cm.dowel.depthEdge); edge(p, 'x1', a, cm.dowel.d, cm.dowel.depthEdge);
        var q = along(a); sideHole(q.x, q.yf, cm.dowel.d, cm.dowel.depthFace);
      });
    } else if (jt.type === 'dowel') {
      jt.pos.forEach(function (a) {
        edge(p, 'x0', a, cm.dowel.d, cm.dowel.depthEdge); edge(p, 'x1', a, cm.dowel.d, cm.dowel.depthEdge);
        var q = along(a); sideHole(q.x, q.yf, cm.dowel.d, cm.dowel.depthFace);
      });
    } else {
      jt.pos.forEach(function (a) {
        edge(p, 'x0', a, cf.pilot.d, cf.pilot.depth); edge(p, 'x1', a, cf.pilot.d, cf.pilot.depth);
        var q = along(a); sideHole(q.x, q.yf, cf.d, 0, true);
      });
    }
  }

  function endSide(p, L, s, sd, camFace, along, tg) {   // one end only: x0 meets the left side, x1 the right side (or a partition: tg)
    var ed = sd === 'L' ? 'x0' : 'x1', cx = sd === 'L' ? cm.cam.fromEdge : L - cm.cam.fromEdge; tg = tg || sd;
    if (typeof tg === 'object') {   /* on a partition: connectors from the two columns must not meet inside it — move this end's set along the joint if they would */
      var opp = tg.f === 'R' ? 'L' : 'R', pts = s.pos.concat(s.dowels || []);
      var clash = function (dl) { return pts.some(function (a) { var b = a + dl; if (b < 9 || b > p.W - 9) return true; var q = along(b);
        return SJ.some(function (j) { return j.side && typeof j.side === 'object' && j.side.p === tg.p && j.side.f === opp && Math.abs(j.x - q.x) < 13 && Math.abs(j.yf - q.yf) < 13; }); }); };
      var cand = [0]; for (var mq = 1; mq <= 20; mq++) cand.push(8*mq, -8*mq);
      var dl = cand.filter(function (d) { return !clash(d); })[0];
      if (dl == null) warnOnce('pertvara ' + (tg.p + 1) + ': jungtys iš abiejų pusių susitinka ir jų nepavyko pastumti — pakeiskite jungtis (Atskirai) arba lentynų aukščius');
      else if (dl) { warnOnce('pertvara ' + (tg.p + 1) + ': jungtys iš dešinės kolonos pastumtos ' + dl + ' mm, kad nesusitiktų su kairės kolonos jungtimis');
        s = { type:s.type, pos:s.pos.map(function (a) { return a + dl; }), dowels:(s.dowels || []).map(function (a) { return a + dl; }) }; endShift[sd] = dl; }
    }
    if (s.type === 'cam') {
      s.pos.forEach(function (a) { hole(p, camFace, cx, a, cm.cam.d, cm.cam.depth); edge(p, ed, a, cm.bolt.d, cm.bolt.depthEdge); var q = along(a); sideHole(q.x, q.yf, cm.bolt.d, cm.bolt.depthFace, false, tg); });
      s.dowels.forEach(function (a) { edge(p, ed, a, cm.dowel.d, cm.dowel.depthEdge); var q = along(a); sideHole(q.x, q.yf, cm.dowel.d, cm.dowel.depthFace, false, tg); });
    } else if (s.type === 'dowel') {
      s.pos.forEach(function (a) { edge(p, ed, a, cm.dowel.d, cm.dowel.depthEdge); var q = along(a); sideHole(q.x, q.yf, cm.dowel.d, cm.dowel.depthFace, false, tg); });
    } else {
      s.pos.forEach(function (a) { edge(p, ed, a, cf.pilot.d, cf.pilot.depth); var q = along(a); sideHole(q.x, q.yf, cf.d, 0, true, tg); });
    }
  }

  /* ---- surišimo juostos */
  var Lr = W - 2*t, railPanels = [], bottomRailHoles = [];
  if (!topFull) {
    var hx = Lside - t/2;   // side x of a flat rail's mid-thickness
    var ra = cf.railAlong;
    /* a standing rail is held to the flat rail above it / the bottom below it with cams: the Ø8 bolt bore in its long edge is
       drilled in place (F=4/F=5), while a Ø5 confirmat pilot there would need the 100 mm rail turned — below the machine minimum */
    /* a rail's long edge (ed) on another part's face: cam in the rail's face A at camY, the other part's hole through put(x, d, depth, through) */
    var longJoint = function (below, ed, camY, s, put) {
      if (s.type === 'cam') {
        s.pos.forEach(function (x) { hole(below, 'A', x, camY, cm.cam.d, cm.cam.depth); edge(below, ed, x, cm.bolt.d, cm.bolt.depthEdge); put(x, cm.bolt.d, cm.bolt.depthFace, false); });
        s.dowels.forEach(function (x) { edge(below, ed, x, cm.dowel.d, cm.dowel.depthEdge); put(x, cm.dowel.d, cm.dowel.depthFace, false); });
      } else if (s.type === 'dowel') s.pos.forEach(function (x) { edge(below, ed, x, cm.dowel.d, cm.dowel.depthEdge); put(x, cm.dowel.d, cm.dowel.depthFace, false); });
      else s.pos.forEach(function (x) { edge(below, ed, x, cf.pilot.d, cf.pilot.depth); put(x, cf.d, 0, true); });
      U('Ø8 skylės ilgame krašte (F=4/F=5)');
    };
    var railRail = function (top, below, yHole) {
      var jv = joint('railVH', Lr, 'long', 'stati juosta ↔ gulsčia', 'cam'); seam1('railVH', 'L', [t, Dside - t/2, zv + rw], X, Lr);
      longJoint(below, 'y1', rw - cm.cam.fromEdge, jv.L, function (x, d, depth, th) { hole(top, 'B', x, yHole, d, depth, th ? { through:true } : null); });
      U('stati juosta prie gulsčios (ekscentrikai)');
    };
    var pF = null, pBH = null, pBV = null;
    if (rl.front === 'h') {
      pF = panel(nm('JUOSTA_PRIEKIS'), 'JUOSTA_PRIEKIS', Lr, rw, t, 'gulscia, viršus viršuje, priekinis kraštas Y=0');
      endJoint(pF, Lr, joint('railF', rw, 'rail', 'priekinė juosta'), 'A', function (a) { return { x:hx, yf:a }; }); seam('railF', [t, 0, H - t/2], Y, rw);
      place(pF, [t, 0, H], X, Y, Z); pF.eb.y0 = eCarc;
    } else if (rl.front === 'v') {
      var zf = H - rw;
      pF = panel(nm('JUOSTA_PRIEKIS'), 'JUOSTA_PRIEKIS', Lr, rw, t, 'stati, vidinė pusė viršuje, apatinis kraštas Y=0');
      endJoint(pF, Lr, joint('railF', rw, 'rail', 'priekinė juosta'), 'A', function (a) { return { x:zf + a - t, yf:t/2 }; }); seam('railF', [t, t/2, zf], Z, rw);
      place(pF, [t, t, zf], X, Z, Y); pF.eb.y0 = eCarc;
    }
    if (backH) {
      pBH = panel(nm('JUOSTA_GALAS_H'), 'JUOSTA_GALAS_H', Lr, rw, t, 'gulscia, viršus viršuje, galinis kraštas Y=0');
      endJoint(pBH, Lr, joint('railB', rw, 'rail', 'galinė juosta'), 'A', function (a) { return { x:hx, yf:yRB - a }; }); seam('railB', [t, yRB, H - t/2], neg(Y), rw);
      place(pBH, [t, yRB, H], X, neg(Y), Z);
    }
    if (backV) {
      var zv = backH ? H - t - rw : H - rw;
      pBV = panel(nm('JUOSTA_GALAS_V'), 'JUOSTA_GALAS_V', Lr, rw, t, 'stati, išorė viršuje, apatinis kraštas Y=0');
      endJoint(pBV, Lr, joint('railV', rw, 'rail', 'stati galinė juosta'), 'A', function (a) { return { x:zv + a - t, yf:Dside - t/2 }; }); seam('railV', [t, Dside - t/2, zv], Z, rw);
      place(pBV, [t, Dside, zv], X, Z, Y);
      if (pBH) railRail(pBH, pBV, t/2);
    }
    if (rl.bottom) {
      var pA = panel(nm('JUOSTA_APACIA_V'), 'JUOSTA_APACIA_V', Lr, rw, t, 'stati, išorė viršuje, apatinis kraštas Y=0');
      endJoint(pA, Lr, joint('railBottom', rw, 'rail', 'apatinė juosta'), 'A', function (a) { return { x:a, yf:Dbot - t/2 }; }); seam('railBottom', [t, Dbot - t/2, t], Z, rw);   // at the bottom's back edge (a shorter bottom: in front of the pipes)
      place(pA, [t, Dbot, t], X, Z, Y);
      var jbb = joint('railBotB', Lr, 'long', 'apatinė juosta ↔ dugnas', 'cam'); seam1('railBotB', 'L', [t, Dbot - t/2, t], X, Lr);
      longJoint(pA, 'y0', cm.cam.fromEdge, jbb.L, function (x, d, depth, th) { bottomRailHoles.push({ x:x + t, d:d, depth:depth, through:th }); });
      U('apatinė juosta prie dugno (ekscentrikai)');
    }
    [pF, pBH, pBV, pA].forEach(function (p) { if (p) { p.mat = mCarc; railPanels.push(p); } });
  }

  /* ---- back */
  var backPanels = [], backType = null;
  var y0p = rl.front === 'v' ? t : 0, y1p = Dside - ((backV || rl.bottom) ? t : 0), Dp = y1p - y0p, Lp = H - 2*t;   // partitions: depth range, height
  if (backTop) {
    var Hb = topFull && !tin ? H - t : H;
    var pk = panel(nm('NUGARA'), 'NUGARA', W, Hb, t, 'išorė viršuje, apatinis kraštas Y=0');
    var jb = joint('back', Lside, 'back', 'nugara', o.backFix === 'cam' ? 'cam' : 'confirmat'); backType = jb.has('confirmat') ? 'confirmat' : jb.type; seam('back', [t/2, Dside, t], Z, Lside);
    var backSide = function (s, bxs, sd) {   // bxs: x of this side's holes in the back; sd undefined = both sides alike
      if (s.type === 'cam') {
        s.pos.forEach(function (x) { sideHole(x, Dside - cm.cam.fromEdge, cm.cam.d, cm.cam.depth, false, sd); SB.push({ pos:x, d:cm.bolt.d, depth:cm.cam.fromEdge, side:sd });
          bxs.forEach(function (bx) { hole(pk, 'B', bx, x + t, cm.bolt.d, cm.bolt.depthFace); }); });
        s.dowels.forEach(function (x) { SB.push({ pos:x, d:cm.dowel.d, depth:cm.dowel.depthEdge, side:sd }); bxs.forEach(function (bx) { hole(pk, 'B', bx, x + t, cm.dowel.d, cm.dowel.depthFace); }); });
        U('Ø8 skylės šonų ilgame krašte (F=4/F=5)');
      } else if (s.type === 'dowel') {
        s.pos.forEach(function (x) { SB.push({ pos:x, d:cm.dowel.d, depth:cm.dowel.depthEdge, side:sd }); bxs.forEach(function (bx) { hole(pk, 'B', bx, x + t, cm.dowel.d, cm.dowel.depthFace); }); });
        U('Ø8 skylės šonų ilgame krašte (F=4/F=5)');
      } else {
        s.pos.forEach(function (x) { bxs.forEach(function (bx) { hole(pk, 'A', bx, x + t, cm.backFix.d, 0, { through:true }); }); SB.push({ pos:x, d:cf.pilot.d, depth:cf.pilot.depth, side:sd }); });
      }
    };
    if (jb.same) backSide(jb.L, [t/2, W - t/2]); else { backSide(jb.L, [t/2], 'L'); backSide(jb.R, [W - t/2], 'R'); }
    for (var kb = 0; kb < cols - 1; kb++) {   // the back is fixed to the partitions' back edges too
      if (y1p === Dside) { var jbp = joint('backP' + (kb + 1), Lp, 'back', 'nugara ↔ pertvara ' + (kb + 1), o.backFix === 'cam' ? 'cam' : 'confirmat'); seam1('backP' + (kb + 1), 'L', [bnd[kb + 1], Dside, t], Z, Lp);
        backSide(jbp.L, [bnd[kb + 1]], { p:kb, f:'R' }); }
      else warnOnce('nugara ant galo: pertvara nesiekia nugaros (stati galinė juosta) — prie pertvaros nepritvirtinta');
    }
    place(pk, [0, D, 0], X, Z, Y); pk.mat = mBack; backPanels.push(pk);
  } else if (anyInside) {
    var Hi = (topFull ? H - 2*t : (backH ? H - 2*t : H - t)) + (covB ? t : 0) + (covT ? t : 0), zB0 = covB ? 0 : t;   // zB0: where the back starts
    var jbi = joint('back', Hi, 'back', 'nugara viduje'); backType = jbi.has('confirmat') ? 'confirmat' : jbi.type;
    if (cols === 1) {
      var Li = W - 2*t, pi = panel(nm('NUGARA'), 'NUGARA', Li, Hi, t, 'tarp šonų, vidinė pusė viršuje, apatinis kraštas Y=0');
      seam('back', [t, yBk - t/2, zB0], Z, Hi);
      endJoint(pi, Li, jbi, camOut.back ? 'B' : 'A', function (a) { return { x:a + zB0 - t, yf:yBk - t/2 }; });
      place(pi, [t, yBk - t, zB0], X, Z, neg(Y)); pi.mat = mBack; backPanels.push(pi);   // face A = the inner face: the cams are inside the cabinet, nothing shows from behind
    } else for (var kc = 0; kc < cols; kc++) {
      if (!inBack(kc)) continue;
      var Lk = ix1(kc) - ix0(kc), pc = panel(nm('NUGARA' + (kc + 1)), 'NUGARA', Lk, Hi, t, 'kolona ' + (kc + 1) + ', tarp šono/pertvaros, vidinė pusė viršuje, apatinis kraštas Y=0');
      endJoint(pc, Lk, jbi, camOut.back ? 'B' : 'A', function (a) { return { x:a + zB0 - t, yf:yBk - t/2 }; }, tgL(kc), tgR(kc));
      seamS('back', 'L', [ix0(kc), yBk - t/2, zB0], Z, Hi); seamS('back', 'R', [ix1(kc), yBk - t/2, zB0], Z, Hi);
      place(pc, [ix0(kc), yBk - t, zB0], X, Z, neg(Y)); pc.mat = mBack; backPanels.push(pc);
    }
  }
  /* plaušas (HDF): nailed on the back, no CNC work; neighbouring columns with plaušas share one sheet */
  var hdfPanels = [];
  if (anyHdf && !backTop) {
    var ins = +R.hdf.inset || 0, grp = [];
    colBacks.forEach(function (b, k) { if (b !== 'hdf') return; if (grp.length && Math.abs(grp[grp.length - 1][1] - bnd[k]) < 0.01) grp[grp.length - 1][1] = bnd[k + 1]; else grp.push([bnd[k], bnd[k + 1]]); });
    grp.forEach(function (g, i) {
      var ph = panel(nm('PLAUSAS' + (grp.length > 1 ? i + 1 : '')), 'PLAUSAS', g[1] - g[0] - 2*ins, H - 2*ins, hdfT, 'plaušo nugara — prikalama, CNC nereikia');
      place(ph, [g[0] + ins, D, ins], X, Z, Y); ph.mat = mat.hdf || R.hdf.mat; hdfPanels.push(ph);
    });
    hw.push({ item:'Kabės / vinutės plaušui', qty:1, unit:'kompl.' });
  }

  /* ---- shelves: adjustable ones are drawn and get pins; fixed ones (and oven supports) are joined like a rail */
  var shelfPanels = [];
  shelves.forEach(function (s, i) {
    var p, k = s.col || 0, Lc = ix1(k) - ix0(k), cb = clearBackK(k);
    s.depth = Dside - cb - shSb;   // adjustable shelf depth (the pins follow it)
    if (s.depth < 50 || Lc - R.shelf.clearW < 50) { warnOnce('lentyna ' + (i + 1) + ': per mažai vietos (' + num(Lc) + ' × ' + num(s.depth) + ' mm) — nepridėta'); s.skip = true; return; }
    if (s.fixed) {
      var sb = s.oven ? 0 : shSb, dF = Dside - cb - sb - (s.fridge ? R.fridgeVent : 0);   // a fridge niche's shelf stops short of the back: the air goes up there
      p = panel(nm('LENTYNA' + (i + 1)), 'LENTYNA', Lc, dF, t, (s.fridge ? 'šaldytuvo nišos lentyna, gale ' + R.fridgeVent + ' mm tarpas orui' : s.oven ? 'orkaitės atrama' : 'fiksuota lentyna') + (cols > 1 ? ', kolona ' + (k + 1) : '') + ', viršus viršuje, priekis Y=0');
      var zc = s.z + t/2 - t;   // side x of the shelf's mid-thickness
      endJoint(p, Lc, s.oven ? joint('oven', dF, 'shelf', s.fridge ? 'šaldytuvo nišos lentynos' : 'orkaitės atramos') : joint('shelf', dF, 'shelf', 'fiksuotos lentynos'), 'B', function (a) { return { x:zc, yf:sb + a }; }, cols > 1 ? tgL(k) : null, cols > 1 ? tgR(k) : null);
      if (cols === 1) seam(s.oven ? 'oven' : 'shelf', [t, sb, s.z + t/2], Y, dF);
      else { seamS(s.oven ? 'oven' : 'shelf', 'L', [ix0(k), sb, s.z + t/2], Y, dF); seamS(s.oven ? 'oven' : 'shelf', 'R', [ix1(k), sb, s.z + t/2], Y, dF); }
      place(p, [ix0(k), sb, s.z + t], X, Y, Z);
    } else {
      p = panel(nm('LENTYNA' + (i + 1)), 'LENTYNA', Lc - R.shelf.clearW, s.depth, t, 'lentyna' + (cols > 1 ? ', kolona ' + (k + 1) : ''));
      place(p, [ix0(k) + R.shelf.clearW/2, shSb, s.z + t], X, Y, Z);
    }
    p.mat = mCarc; p.eb.y0 = eCarc; shelfPanels.push(p);
  });

  /* ---- sides */
  var jBot = joint('bottom', Dbot, 'carc', 'dugnas'), jTop = topFull ? joint('top', tin ? DtopIn : Dside, 'carc', 'viršus') : null;
  if (bin) seam('bottom', [t, 0, t/2], Y, Dbot); else seam('bottom', [t/2, 0, t], Y, Dbot); if (tin) seam('top', [t, 0, H - t/2], Y, DtopIn); else if (topFull) seam('top', [t/2, 0, H - t], Y, Dside);
  /* the bottom: under the sides (full width), or between them — then its ends are joined to the sides like a fixed shelf */
  var LBot = bin ? W - 2*t : W - (sideIn.L ? t : 0) - (sideIn.R ? t : 0);
  var pBot = panel(nm('DUGNAS'), 'DUGNAS', LBot, Dbot, t, (bin ? 'tarp šonų, viršus viršuje, priekis Y=0' : 'viršus viršuje, priekis Y=0' + (sideIn.L || sideIn.R ? ', tarp ' + (sideIn.L && sideIn.R ? 'šonų' : sideIn.L ? 'kairio šono' : 'dešinio šono') + ' (pailgintas matomas šonas)' : '')) + (shortBot ? ', sutrumpintas: gale ' + num(Dside - Dbot) + ' mm laisva' : '')), dxB = bin || sideIn.L ? t : 0;
  if (bin) { endJoint(pBot, W - 2*t, jBot, camOut.bottom ? 'B' : 'A', function (a) { return { x:-t/2, yf:a }; }); U('dugnas tarp šonų'); }
  else ['L', 'R'].forEach(function (k) { if (!sideIn[k]) return; endShift = { L:0, R:0 };
    var js = jBot[k]; if (js.type === 'confirmat') { js = resolve({ type:'cam' }, Dbot, 'carc', 'dugnas', 'cam'); warnOnce('matomas ' + (k === 'L' ? 'kairys' : 'dešinys') + ' šonas: dugnas prie jo tvirtinamas ekscentrikais (konfirmatų galvutės matytųsi šono išorėje)'); }
    endSide(pBot, LBot, js, k, camOut.bottom ? 'B' : 'A', function (a) { return { x:-t/2, yf:a }; }, k); });
  if (sideIn.L || sideIn.R) U('matomas šonas pailgintas iki fasadų apačios, dugnas tarp jo');
  var faceJoint = function (p, J2, face, xs, yOff) {   // bottom / top panel: the face the sides stand on (xs[0] left side, xs[1] right)
    xs.forEach(function (x, i) {
      var jt = i === 0 ? J2.L : J2.R;
      if (jt.type === 'cam') { jt.pos.forEach(function (y) { hole(p, face, x, y + yOff, cm.bolt.d, cm.bolt.depthFace); }); jt.dowels.forEach(function (y) { hole(p, face, x, y + yOff, cm.dowel.d, cm.dowel.depthFace); }); }
      else if (jt.type === 'dowel') jt.pos.forEach(function (y) { hole(p, face, x, y + yOff, cm.dowel.d, cm.dowel.depthFace); });
      else jt.pos.forEach(function (y) { hole(p, face, x, y + yOff, cf.d, 0, { through:true }); });
    });
  };
  /* the top between the sides (o.topMount 'inside'): its ends are joined to the sides like the bottom between them — drilled before the sides are */
  var pTopIn = null;
  if (tin) { pTopIn = panel(nm('VIRSUS'), 'VIRSUS', W - 2*t, DtopIn, t, 'tarp šonų, apačia viršuje (gręžiama iš apačios), priekis Y=0'); endJoint(pTopIn, W - 2*t, jTop, camOut.top ? 'A' : 'B', function (a) { return { x:H - 1.5*t, yf:a }; }); U('viršus tarp šonų'); }
  var mkSide = function (role, right) {
    var p = panel(nm(role), role, Lside, Dside, t, 'vidinė pusė viršuje, apatinis kraštas X=0, priekis ' + (right ? 'Y=DY' : 'Y=0'));
    var Yf = function (y) { return right ? Dside - y : y; };   // mirror for the right side
    [[bin || sideIn[right ? 'R' : 'L'] ? null : jBot, 'x0', cm.cam.fromEdge], [tin ? null : jTop, 'x1', Lside - cm.cam.fromEdge]].forEach(function (k) {   // the side's ends sit on the bottom / under the top
      var jt = k[0] && k[0][right ? 'R' : 'L'], ed = k[1], cx = k[2]; if (!jt) return;
      if (jt.type === 'cam') {
        jt.pos.forEach(function (y) { hole(p, 'A', cx, Yf(y), cm.cam.d, cm.cam.depth); edge(p, ed, Yf(y), cm.bolt.d, cm.bolt.depthEdge); });
        jt.dowels.forEach(function (y) { edge(p, ed, Yf(y), cm.dowel.d, cm.dowel.depthEdge); });
      } else if (jt.type === 'dowel') jt.pos.forEach(function (y) { edge(p, ed, Yf(y), cm.dowel.d, cm.dowel.depthEdge); });
      else jt.pos.forEach(function (y) { edge(p, ed, Yf(y), cf.pilot.d, cf.pilot.depth); });
    });
    var mine = function (j) { return !j.side || j.side === (right ? 'R' : 'L'); }, myCol = right ? cols - 1 : 0;
    SJ.forEach(function (j) { if (mine(j)) hole(p, 'A', j.x, Yf(j.yf), j.d, j.depth, j.through ? { through:true } : null); });
    SB.forEach(function (b) { if (mine(b)) edge(p, right ? 'y0' : 'y1', b.pos, b.d, b.depth); });   // back edge: y = Dside on the left side, y = 0 on the right
    if (o.runnerMarks !== false) runners.forEach(function (r) { if (r.col !== myCol) return; var rt = R.runner[r.type], up = runnerUp(rt); var x = Math.max(up, r.fb + up - t); runnerMarks(rt, r.rail).forEach(function (m) {
      if (m > Dside - 5) { warnOnce('bėgelio ' + r.type + ' L=' + r.rail + ' žymė ' + num(m) + ' mm netelpa šone (' + num(Dside) + ' mm) — praleista, rinkitės trumpesnį bėgelį'); return; }
      var hit = p.holes.some(function (g) { return !g.mark && (g.face === 'A' || g.through) && Math.hypot(g.x - x, g.y - Yf(m)) < g.d/2; });   // mark centre inside a joint hole (touching the rim is fine: the verified SWOOD Tandem cabinet does that)
      if (hit) warnOnce('bėgelio ' + r.type + ' žymė (' + num(x + t) + ' mm aukštyje, ' + num(m) + ' nuo priekio) patenka į ekscentriko skylę — bėgelio varžtas kliūs už jungties; patikrinkite (pvz. rinkitės konfirmatus)');
      hole(p, 'A', x, Yf(m), R.legs.markD, R.legs.markDepth, { mark:true }); }); });
    /* mounting plates of the doors hinged on this side (side x = cabinet z − t) */
    if (o.hinges) {
      var hr = R.hinge, nPl = 0;
      doors.forEach(function (d) {
        if (!d.hinged || d.hingeLeft === right || d.col !== myCol) return;
        var atSide = right ? Math.abs(d.x + d.w - fx1(myCol)) < 0.5 : Math.abs(d.x - fx0(myCol)) < 0.5;
        if (!atSide) { warnOnce('durys ' + num(d.w) + '×' + num(d.h) + ': lankstų pusė ne prie šono (reikia pertvaros) — plokštelių skylės nepridėtos'); return; }
        d.ys.forEach(function (yh) {
          var xc = d.z + yh - t;
          [xc - hr.plateSpacing/2, xc + hr.plateSpacing/2].forEach(function (x) {
            var hitP = p.holes.some(function (g) { return (g.face === 'A' || g.through) && Math.hypot(g.x - x, g.y - Yf(hr.plateFromFront)) < (g.d + hr.plateD)/2 + 1.5; });
            if (hitP) warnOnce('lanksto plokštelės skylė (' + num(x + t) + ' mm aukštyje) kliūna už kitos skylės — praleista, patikrinkite');
            else if (x > 5 && x < Lside - 5) { hole(p, 'A', x, Yf(hr.plateFromFront), R.post.markD, R.post.markDepth, { op:'hinge', mark:true }); nPl++; }
            else p.warnings.push('lanksto plokštelės skylė už šono ribų (' + num(x) + ') — praleista');
          });
        });
      });
      if (nPl) p.warnings.push('lankstų plokštelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu');
    }
    /* shelf supports */
    if (o.pins && o.pins !== 'off') {
      var pr = R.pins, nPin = 0;
      shelves.forEach(function (s) {
        if (s.fixed || s.skip || s.col !== myCol) return;
        var yB = shSb + s.depth - pr.fromBack;
        var xc = s.z - pr.below - t, xs = [xc];
        if (o.pins === 'row') for (var k = 1; k <= pr.extra; k++) { xs.push(xc - k*pr.pitch); xs.push(xc + k*pr.pitch); }
        xs.forEach(function (x) {
          if (x < 10 || x > Lside - 10) return;
          [pinF, yB].forEach(function (y) {
            var hit = p.holes.some(function (g) { return (g.face === 'A' || g.through) && Math.hypot(g.x - x, g.y - Yf(y)) < (g.d + pr.d)/2 + 1.5; });
            if (hit) { warnOnce('lentyna ' + num(s.z + t) + ' mm aukštyje: laikiklio skylė kliūna už kitos skylės (lankstas/bėgelis) — praleista, perkelkite lentyną'); return; }
            hole(p, 'A', x, Yf(y), pr.d, pr.depth, { op:'pin' }); nPin++; });
        });
      });
      if (nPin) p.warnings.push('lentynų laikiklių skylės pagal standartą — NEPATIKRINTA su SWOOD modeliu');
    }
    var sk = right ? 'R' : 'L', offS = (bin ? t + hb : sideIn[sk] ? t : 0) + extS[sk];   // bottom between the sides: the side starts t + hb lower (side x above stays cabinet z − t); a visible side goes on down to the fronts' bottom
    if (offS) { p.holes.forEach(function (h) { h.x += offS; }); p.edges.forEach(function (e) { if (e.edge === 'y0' || e.edge === 'y1') e.pos += offS; }); p.L = Lside + offS; }
    if (tin) { p.L += t; p.note += ', viršus tarp šonų'; }   // up to the cabinet top: the top sits between the sides
    if (bin && o.legs && o.feet) feetRows().forEach(function (y) {   // pėdutės under this side: Ø8 × 10 into its bottom edge
      var fr = R.feet, yy = footY(y, function (v) { var yv = Yf(v); return p.holes.some(function (h) { return !h.mark && h.x - h.d/2 < fr.holeDepth + 1 && Math.abs(h.y - yv) < h.d/2 + fr.holeD/2 + 1; }) || p.edges.some(function (e) { return e.edge === 'x0' && Math.abs(e.pos - yv) < e.d/2 + fr.holeD/2 + 1; }); });
      edge(p, 'x0', Yf(yy), fr.holeD, fr.holeDepth); p.edges[p.edges.length - 1].foot = true; feetPos.push({ x:right ? W - t/2 : t/2, y:yy });
    });
    if (right) place(p, [W - t, Dside, t - offS], Z, neg(Y), neg(X)); else place(p, [t, 0, t - offS], Z, Y, X);
    var seen = !!vis[right ? 'R' : 'L'], eS = seen ? eVis : eCarc;
    p.mat = seen ? mFac : mCarc; if (right) p.eb.y1 = eS; else p.eb.y0 = eS;   // front edge
    if (seen) { if (hungC || tallC) p.eb.x1 = eVis; if (hungC) p.eb.x0 = eVis; p.vis = true; p.note += ', matomas šonas (fasado medžiaga)'; }
    return p;
  };
  out.push(mkSide('KAIRE', false)); out.push(mkSide('DESINE', true));

  /* ---- partitions: stand on the bottom, under the top or the flat rails; face B looks into column k, face A into column k+1 */
  /* partition joints, each its own (and editable in 3D): bottom, full top or each flat rail */
  var jPB = [], jPT = [];
  var endBores = function (p, ed, cx, s, yOf, n) {   // the partition's end ed: bores (and cams in face A at cx); positions outside the partition are left out
    var ok = function (y) { if (y > 8 && y < n - 8) return true; warnOnce('pertvaros jungtis už pertvaros ribų — praleista, patikrinkite vietas'); return false; };
    if (s.type === 'cam') {
      s.pos.forEach(function (a) { var y = yOf(a); if (ok(y)) { hole(p, 'A', cx, y, cm.cam.d, cm.cam.depth); edge(p, ed, y, cm.bolt.d, cm.bolt.depthEdge); } });
      s.dowels.forEach(function (a) { var y = yOf(a); if (ok(y)) edge(p, ed, y, cm.dowel.d, cm.dowel.depthEdge); });
    } else if (s.type === 'dowel') s.pos.forEach(function (a) { var y = yOf(a); if (ok(y)) edge(p, ed, y, cm.dowel.d, cm.dowel.depthEdge); });
    else s.pos.forEach(function (a) { var y = yOf(a); if (ok(y)) edge(p, ed, y, cf.pilot.d, cf.pilot.depth); });
  };
  var railFace = function (rp, x, s, keep) {   // the rail's lower face B gets the partition's holes (positions = rail y)
    var put = function (a, d, depth, th) { if (keep(a)) hole(rp, 'B', x, a, d, depth, th ? { through:true } : null); };
    if (s.type === 'cam') { s.pos.forEach(function (a) { put(a, cm.bolt.d, cm.bolt.depthFace); }); s.dowels.forEach(function (a) { put(a, cm.dowel.d, cm.dowel.depthFace); }); }
    else if (s.type === 'dowel') s.pos.forEach(function (a) { put(a, cm.dowel.d, cm.dowel.depthFace); });
    else s.pos.forEach(function (a) { put(a, cf.d, 0, true); });
  };
  var mkPart = function (k) {
    var xc = bnd[k + 1], p = panel(nm('PERTVARA' + (k + 1)), 'PERTVARA', Lp, Dp, t, 'pertvara ' + (k + 1) + ', dešinė pusė viršuje, apatinis kraštas X=0, priekis Y=0'), n1 = k + 1;
    jPB[k] = joint('partB' + n1, Dp, 'carc', 'pertvara ' + n1 + ' ↔ dugnas'); seam1('partB' + n1, 'L', [xc, y0p, t], Y, Dp);
    endBores(p, 'x0', cm.cam.fromEdge, jPB[k].L, function (a) { return a; }, Dp);
    if (topFull) {
      jPT[k] = joint('partT' + n1, Dp, 'carc', 'pertvara ' + n1 + ' ↔ viršus'); seam1('partT' + n1, 'L', [xc, y0p, H - t], Y, Dp);
      endBores(p, 'x1', Lp - cm.cam.fromEdge, jPT[k].L, function (a) { return a; }, Dp);
    } else {   // under the flat rails: each rail is its own joint, positions across the rail
      var inP = function (y) { return y > 8 && y < Dp - 8; };
      if (rl.front === 'h' && pF) { var jf = joint('partF' + n1, rw, 'rail', 'priekinė juosta ↔ pertvara ' + n1); seam1('partF' + n1, 'L', [xc, 0, H - t], Y, rw);
        endBores(p, 'x1', Lp - cm.cam.fromEdge, jf.L, function (a) { return a - y0p; }, Dp); railFace(pF, xc - t, jf.L, function (a) { return inP(a - y0p); }); }
      if (backH && pBH) { var jr = joint('partR' + n1, rw, 'rail', 'galinė juosta ↔ pertvara ' + n1); seam1('partR' + n1, 'L', [xc, Dside, H - t], neg(Y), rw);
        endBores(p, 'x1', Lp - cm.cam.fromEdge, jr.L, function (a) { return Dside - a - y0p; }, Dp); railFace(pBH, xc - t, jr.L, function (a) { return inP(Dside - a - y0p); }); }
      if (!(rl.front === 'h' && pF) && !(backH && pBH)) warnOnce('pertvara viršuje nepritvirtinta — reikia gulsčios juostos arba pilno viršaus');
    }
    var forMe = function (j) { return j.side && typeof j.side === 'object' && j.side.p === k; };
    SJ.forEach(function (j) { if (forMe(j)) hole(p, j.side.f === 'R' ? 'A' : 'B', j.x, j.yf - y0p, j.d, j.depth, j.through ? { through:true } : null); });
    SB.forEach(function (b) { if (forMe(b)) edge(p, 'y1', b.pos, b.d, b.depth); });
    /* runners, hinge plates and shelf pins of the two columns, each on its own face; pins on face A sit 10 mm further in so they never meet the ones from face B */
    [['B', k, false], ['A', k + 1, true]].forEach(function (fc) {
      var face = fc[0], colk = fc[1], isA = fc[2];
      var meets = function (x, y, d, depth) { return p.holes.some(function (g) { return g.face !== face && !g.through && !g.mark && Math.hypot(g.x - x, g.y - y) < (g.d + d)/2 + 0.5 && g.depth + depth > t - 2; }); };   // a blind hole from the other face
      var free = function (x, y, d, depth) { return !p.holes.some(function (g) { return (g.face === face || g.through) && Math.hypot(g.x - x, g.y - y) < (g.d + d)/2 + 1.5; }) && !meets(x, y, d, depth || 0); };
      if (o.runnerMarks !== false) runners.forEach(function (r) { if (r.col !== colk) return; var rt = R.runner[r.type], up = runnerUp(rt), x = Math.max(up, r.fb + up - t);
        runnerMarks(rt, r.rail).forEach(function (m) { if (!(m - y0p > 0 && m - y0p < Dp)) return;
          if (p.holes.some(function (g) { return !g.mark && (g.face === face || g.through) && Math.hypot(g.x - x, g.y - (m - y0p)) < g.d/2; })) warnOnce('bėgelio ' + r.type + ' žymė pertvaroje (' + num(x + t) + ' mm aukštyje, ' + num(m) + ' nuo priekio) patenka į ekscentriko skylę — bėgelio varžtas kliūs už jungties; patikrinkite (pvz. rinkitės konfirmatus)');
          hole(p, face, x, m - y0p, R.legs.markD, R.legs.markDepth, { mark:true }); }); });
      if (o.hinges) doors.forEach(function (d) {
        if (!d.hinged || d.col !== colk || d.hingeLeft !== isA) return;   // face B: doors of column k hinged on the right; face A: column k+1 hinged on the left
        if (isA ? Math.abs(d.x - fx0(colk)) > 0.5 : Math.abs(d.x + d.w - fx1(colk)) > 0.5) { warnOnce('durys ' + num(d.w) + '×' + num(d.h) + ': lankstų pusė ne prie pertvaros — plokštelių skylės nepridėtos'); return; }
        var hr = R.hinge, y = hr.plateFromFront - y0p;
        /* doors hinged on both faces of a partition at the same heights: move this door's hinges (cups and plates together) */
        var plates = function (ys) { var o2 = []; ys.forEach(function (yh) { var xc2 = d.z + yh - t; o2.push(xc2 - hr.plateSpacing/2, xc2 + hr.plateSpacing/2); }); return o2; };
        var okYs = function (ys) { return ys.every(function (yh) { return yh >= hr.cupD/2 + 3 && yh <= d.h - hr.cupD/2 - 3; }) && plates(ys).every(function (x) { return x > 5 && x < Lp - 5 && !meets(x, y, hr.plateD, hr.plateDepth); }); };
        if (!okYs(d.ys)) { var sh2 = [40, -40, 64, -64, 96, -96].filter(function (dd) { return okYs(d.ys.map(function (v) { return v + dd; })); })[0];
          if (sh2 != null) { d.ys = d.ys.map(function (v) { return v + sh2; }); warnOnce('durys ' + num(d.w) + '×' + num(d.h) + ': lankstai pastumti ' + sh2 + ' mm, kad plokštelės nesusitiktų su kitos pertvaros pusės plokštelėmis — patikrinkite'); } }
        d.ys.forEach(function (yh) { var xc2 = d.z + yh - t; [xc2 - hr.plateSpacing/2, xc2 + hr.plateSpacing/2].forEach(function (x) {
          if (!free(x, y, hr.plateD, hr.plateDepth)) { warnOnce('lanksto plokštelės skylė pertvaroje (' + num(x + t) + ' mm aukštyje) kliūna už kitos skylės — praleista, patikrinkite'); return; }
          if (x > 5 && x < Lp - 5) hole(p, face, x, y, R.post.markD, R.post.markDepth, { op:'hinge', mark:true }); }); });
      });
      if (o.pins && o.pins !== 'off') shelves.forEach(function (s) {
        if (s.fixed || s.skip || s.col !== colk) return;
        var pr = R.pins, xc3 = s.z - pr.below - t, xs = [xc3], sh = isA ? 10 : 0;
        if (o.pins === 'row') for (var q = 1; q <= pr.extra; q++) { xs.push(xc3 - q*pr.pitch); xs.push(xc3 + q*pr.pitch); }
        xs.forEach(function (x) { if (x < 10 || x > Lp - 10) return;
          [pinF + sh, shSb + s.depth - pr.fromBack - sh].forEach(function (yf) { var y = yf - y0p;
            if (!free(x, y, pr.d, pr.depth)) { warnOnce('lentyna ' + num(s.z + t) + ' mm aukštyje: laikiklio skylė pertvaroje kliūna už kitos skylės — praleista, perkelkite lentyną'); return; }
            hole(p, face, x, y, pr.d, pr.depth, { op:'pin' }); }); });
      });
    });
    /* blind holes from both faces must not meet inside the 18 mm board */
    var hsA = p.holes.filter(function (h) { return h.face === 'A' && !h.through && !h.mark; }), hsB = p.holes.filter(function (h) { return h.face === 'B' && !h.through && !h.mark; });
    hsA.forEach(function (a) { hsB.forEach(function (b) { if (Math.hypot(a.x - b.x, a.y - b.y) < (a.d + b.d)/2 + 0.5 && a.depth + b.depth > t - 2) warnOnce(p.name.replace(/^.*_/, '') + ': skylės iš abiejų pusių susitinka (' + num(a.x + t) + ' mm aukštyje) — pakeiskite lentynų / durų / jungčių vietas (NEPROGRAMUOTA teisingai)'); }); });
    place(p, [xc + t/2, y0p, t], Z, Y, X); p.mat = mCarc; p.eb.y0 = eCarc;
    return p;
  };
  for (var kp = 0; kp < cols - 1; kp++) out.push(mkPart(kp));

  /* ---- legs: o.legsX = legs in a row across the width (2–6, or 'parts' = at both sides and under every partition), o.legsY = rows (2 or 3).
     A leg's plate (Ø60) must not cover a connector head on the underside: such a leg moves sideways, and the worker is told. */
  var legPos = null;
  function feetRows() { var yf = R.feet.fromFront, yb = Dbot - R.feet.fromBack; return +o.legsY === 3 ? [yf, (yf + yb) / 2, yb] : [yf, yb]; }
  function footY(y, clash) {   // keep a foot hole clear of the joint holes: move it along the side if it would meet one
    for (var m = 0; m <= 10; m++) for (var sg = 0; sg < 2; sg++) { var d = sg ? -m * 8 : m * 8, v = y + d; if (v > 12 && v < Dbot - 12 && !clash(v)) { if (d) warnOnce('pėdutė pastumta ' + d + ' mm, kad skylė nesusitiktų su jungties skyle — patikrinkite'); return v; } }
    warnOnce('pėdutės skylė kliūna už jungties skylės — patikrinkite'); return y;
  }
  function legSpots(bp, dxb) {
    if (legPos) return legPos; dxb = dxb || 0;
    var fs = R.legs.fromSide, nx = o.legsX === 'parts' ? 'parts' : Math.max(2, Math.min(6, Math.round(+o.legsX) || 2)), ny = +o.legsY === 3 ? 3 : 2, xs = [];
    if (nx === 'parts') { xs.push(fs); for (var q = 1; q < cols; q++) xs.push(bnd[q]); xs.push(W - fs); }
    else for (var q2 = 0; q2 < nx; q2++) xs.push(fs + (W - 2*fs) * q2 / (nx - 1));
    var yf = o.feet ? R.feet.fromFront : R.legs.fromFront, yb = Dbot - (o.feet ? R.feet.fromBack : R.legs.fromBack), ys = ny === 3 ? [yf, (yf + yb) / 2, yb] : [yf, yb];
    var heads = bp ? bp.holes.filter(function (h) { return !h.mark && (h.through || h.face === 'B'); }).map(function (h) { return { x:h.x + dxb, y:h.y, d:h.d }; }) : [];
    var free = function (x, y) { return x >= 35 && x <= W - 35 && heads.every(function (h) { return Math.hypot(h.x - x, h.y - y) >= 30 + h.d/2 + 4; }); };
    legPos = []; var moved = 0;
    var shift = function (x0, rows) { for (var m = 0; m <= 12; m++) for (var sg = 0; sg < 2; sg++) { var d = sg ? -m * 8 : m * 8; if (rows.every(function (y) { return free(x0 + d, y); })) return d; } return null; };
    xs.forEach(function (x0) {
      var dAll = shift(x0, ys);   // the whole line of legs front to back moves together, so they stay in a line
      ys.forEach(function (y) {
        var dx = dAll !== null ? dAll : shift(x0, [y]);
        if (dx === null) { dx = 0; warnOnce('kojelė ' + num(x0) + ' mm: plokštelė uždengia jungties galvutę dugno apačioje — patikrinkite'); }
        else if (dx) moved++;
        legPos.push({ x:x0 + dx, y:y });
      });
    });
    for (var g = 1; g < xs.length; g++) if (xs[g] - xs[g - 1] < 70) { warnOnce('kojelės per tankiai: tarp kojelių mažiau nei 70 mm — sumažinkite kojelių skaičių eilėje'); break; }
    if (moved) warnOnce('kojelės: ' + moved + ' vnt. pastumtos šonu, kad plokštelė neuždengtų jungčių dugno apačioje');
    return legPos;
  }
  /* ---- bottom (face A = top face, Y from front) */
  function bottomFeet(p) {   // pėdutės under the bottom: below the sides (bottom under the sides) and below the partitions
    var fr = R.feet, xs = [];
    if (!bin) xs.push(t/2, W - t/2);
    if (o.legsX === 'parts' && (!bin || hb === 0)) for (var q = 1; q < cols; q++) xs.push(bnd[q]);
    xs.forEach(function (x) { feetRows().forEach(function (y) {
      var yy = footY(y, function (v) { return p.holes.some(function (h) { return !h.mark && (h.through || h.face === 'B' || h.depth + fr.holeDepth > t - 1) && Math.hypot(h.x - (x - dxB), h.y - v) < h.d/2 + fr.holeD/2 + 1; }); });
      hole(p, 'B', x - dxB, yy, fr.holeD, fr.holeDepth, { op:'feet' }); feetPos.push({ x:x, y:yy }); }); });
  }
  (function () {
    var p = pBot;   // panel x = cabinet x − dxB
    if (!bin) { var fx = [], fj = {}; if (!sideIn.L) { fx.push(t/2); fj[fx.length === 1 ? 'L' : 'R'] = jBot.L; } if (!sideIn.R) { fx.push(W - t/2 - dxB); fj[fx.length === 1 ? 'L' : 'R'] = jBot.R; } if (fx.length) faceJoint(p, fj, 'A', fx, 0); }
    for (var kq = 0; kq < cols - 1; kq++) faceJoint(p, { L:jPB[kq].L, R:jPB[kq].L }, 'A', [bnd[kq + 1] - dxB], y0p);
    bottomRailHoles.forEach(function (h) { hole(p, 'A', h.x - dxB, Dbot - t/2, h.d, h.depth, h.through ? { through:true } : null); });   // the standing bottom back rail
    if (o.legs && !o.feet) legSpots(p, dxB).forEach(function (l) { legMarks(p, 'B', l.x - dxB, l.y); });
    if (o.legs && o.feet) bottomFeet(p);
    place(p, [dxB, 0, t], X, Y, Z); p.mat = visB ? mFac : mCarc; p.eb.y0 = visB ? eVis : eCarc;
    if (!bin) { if ((vis.L || visB) && !sideIn.L) p.eb.x0 = eVis; if ((vis.R || visB) && !sideIn.R) p.eb.x1 = eVis; }   // under the sides: its ends show at a visible side (not behind a side lengthened past it)
    if (visB) { p.vis = true; p.note += ', matoma apačia (fasado medžiaga)'; }
    out.push(p);
  })();

  /* ---- top: full panel or rails */
  if (topFull) {
    var ovF = tin ? 0 : Math.max(0, +o.topOvF || 0), ovS = tin ? 0 : Math.max(0, +o.topOvS || 0), ovB = tin ? 0 : Math.max(0, +o.topOvB || 0);   // mm past the front (the fronts when it covers them), the sides, the back
    var off = (tOver ? fT : 0) + ovF, Dtop = tin ? Dside : Dside + off + (backTop ? tb : 0) + ovB, dxT = tin ? t : -ovS;   // top covers a solid back on the back too (not the plaušas); between the sides it stops at their back edge
    var pt = pTopIn || panel(nm('VIRSUS'), 'VIRSUS', W + 2 * ovS, Dtop, t, 'apačia viršuje (gręžiama iš apačios), priekis Y=0');   // panel x = cabinet x − dxT
    if (!tin) faceJoint(pt, jTop, 'B', [t/2 + ovS, W - t/2 + ovS], off);
    for (var kt = 0; kt < cols - 1; kt++) faceJoint(pt, { L:jPT[kt].L, R:jPT[kt].L }, 'B', [bnd[kt + 1] - dxT], off + y0p);
    place(pt, [dxT, -off, H], X, Y, Z); pt.mat = mTop; pt.eb.y0 = eCarc;
    if ((hungC || tallC) && !tin) { if (vis.L) pt.eb.x0 = eVis; if (vis.R) pt.eb.x1 = eVis; }   // over the sides: its ends show at a visible side of a tall or hung cabinet
    out.push(pt);
  } else railPanels.forEach(function (p) { out.push(p); });

  backPanels.forEach(function (p) { out.push(p); });
  hdfPanels.forEach(function (p) { out.push(p); });

  /* ---- facades (drawer fronts) */
  facades.forEach(function (f, i) {
    var p = panel(nm('FASADAS' + (i + 1)), 'FASADAS', f.w, f.h, fT, 'galinė (vidinė) pusė viršuje, apatinis kraštas Y=0'); p.drawer = true;
    var rt = R.runner[f.hw];
    if (rt && rt.facade && o.tbFront !== 'off') {
      var fc = rt.facade, mk = o.tbFront === 'mark', dyF = Math.max(0, -f.bottom);   // a front reaching below the carcass bottom: the box stays above it, so do its fixing holes
      fc = Object.assign({}, fc, { ys:fc.ys.map(function (y) { return y + dyF; }), yGallery:fc.yGallery + dyF });
      var fh = function (x, y) { if (y > f.h - 1) { warnOnce('fasadas ' + num(f.w) + '×' + num(f.h) + ': per žemas TANDEMBOX tvirtinimo skylei ' + num(y) + ' mm — praleista'); return; } if (mk) hole(p, 'A', x, y, R.legs.markD, R.legs.markDepth, { mark:true }); else hole(p, 'A', x, y, fc.d, fc.depth); };
      [fc.fromSide, f.w - fc.fromSide].forEach(function (x) { fc.ys.forEach(function (y) { fh(x, y); }); if (f.h >= 250) fh(x, fc.yGallery); });
      if (f.h >= 250) p.warnings.push('TANDEMBOX viršutinė tvirtinimo skylė 225.5 — patikrinti pagal Blum lentelę šiam stalčiaus aukščiui');
    }
    place(p, [f.x, 0, f.bottom], X, Z, Y); p.mat = mFac; p.eb = { y0:eFac, y1:eFac, x0:eFac, x1:eFac };
    out.push(p); f.pname = p.name;
  });
  /* ---- board drawer boxes for side-mount ball-bearing runners (GTV / DTC H45): two sides, a sub-front and a back held
     with confirmats through the sides, an HDF bottom nailed underneath; the drawer member of the runner is marked on the
     sides' outer faces. The box hangs on the runner axis (front bottom + up), 12.7 mm clear of the carcass on each side. */
  var nBox = 0;
  facades.forEach(function (f) {
    var rt = R.runner[f.hw]; if (!rt || !rt.ball) return;
    var bb = R.ball, bt = +bb.boxT > 0 ? +bb.boxT : t, cl = +bb.clear, k = f.col || 0, rail = +((c.sections || []).filter(function (s2) { return Math.min(cols - 1, Math.max(0, Math.floor(+s2.col || 0))) === k; })[f.sec] || {}).rail || 500;
    var lbl2 = 'stalčius ' + (cols > 1 ? (k + 1) + '.' : '') + (f.sec + 1) + '.' + (f.idx + 1);
    var bx0 = ix0(k) + cl, BW = ix1(k) - ix0(k) - 2 * cl, BD = rail, axis = Math.max(t + +bb.up, f.bottom + +bb.up), zB = axis - +bb.boxBelow;   // the runner axis as the side marks have it (never lower than `up` above the bottom panel)
    var room = Dside - clearBackK(k) - 2; if (BD > room + 0.01) { warnOnce(lbl2 + ': bėgelis ' + BD + ' mm ilgesnis nei telpa (' + num(room) + ' mm) — rinkitės trumpesnį'); return; }
    var innerTop = (topFull ? H - t : (rl.front === 'v' ? H - rw : H - t)) - 3;
    var top = Math.min(f.bottom + f.h - +bb.topGap, innerTop), HB = Math.floor(top - zB);
    if (zB - R.hdf.t < t + 1) warnOnce(lbl2 + ': dėžės dugnas per arti korpuso dugno — padidinkite bėgelio ašies aukštį nustatymuose');
    if (HB < 60 || BW - 2 * bt < 80) { warnOnce(lbl2 + ': fasadas per žemas arba skyrius per siauras stalčiaus dėžei (' + num(HB) + ' × ' + num(BW) + ' mm) — dėžė nepridėta'); return; }
    nBox++; var base2 = 'STALC' + nBox + '_', note = function (w) { return lbl2 + ', ' + w; };
    var conf = HB >= 200 ? [32, HB / 2, HB - 32] : HB >= 100 ? [32, HB - 32] : [HB / 2], marks = runnerMarks(rt, rail), mz = axis - zB;
    /* sides: x along the box depth from its front, y up from its bottom edge; face A inside */
    [false, true].forEach(function (right) {
      var p = panel(nm(base2 + (right ? 'SONAS_D' : 'SONAS_K')), 'STALC_SONAS', BD, HB, bt, note('vidinė pusė viršuje, priekis X=0, apačia Y=0'));
      [bt / 2, BD - bt / 2].forEach(function (u) { conf.forEach(function (v) { hole(p, 'A', u, v, cf.d, 0, { through:true }); }); });
      if (bb.drawerMarks !== false) marks.forEach(function (u) { if (u < BD - 5) hole(p, 'B', u, mz, R.legs.markD, R.legs.markDepth, { mark:true }); });   // runner's drawer member, outer face
      place(p, right ? [bx0 + BW - bt, 0, zB] : [bx0 + bt, 0, zB], Y, Z, right ? neg(X) : X); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = f.pname; out.push(p);
    });
    /* sub-front and back between the sides: confirmat pilot bores in both ends */
    [['PRIEKIS', 'STALC_PRIEKIS', bt, Y], ['GALAS', 'STALC_GALAS', BD - bt, neg(Y)]].forEach(function (q) {
      var p = panel(nm(base2 + q[0]), q[1], BW - 2 * bt, HB, bt, note('vidinė pusė viršuje, apačia Y=0'));
      conf.forEach(function (v) { edge(p, 'x0', v, cf.pilot.d, cf.pilot.depth); edge(p, 'x1', v, cf.pilot.d, cf.pilot.depth); });
      place(p, [bx0 + bt, q[2], zB], X, Z, q[3]); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = f.pname; out.push(p);
    });
    var pb = panel(nm(base2 + 'DUGNAS'), 'STALC_DUGNAS', BW, BD, +R.hdf.t || 3, note('kalamas iš apačios'));
    place(pb, [bx0, 0, zB], X, Y, Z); pb.mat = R.hdf.mat || 'HDF 3 mm'; pb.drawerOf = f.pname; out.push(pb);
    U((f.hw || '') + ' (dėžė ir skylės)');
  });
  /* ---- board drawer boxes for concealed undermount runners (DTC PASLĖPTI): sides and a sub-front full height, the bottom
     (carcass board) set in 13 mm from the sides' bottom edge between them, the back standing on the bottom; confirmats
     through the sides (into the front, back and bottom ends), through the sub-front into the bottom and up through the
     bottom into the back. Inside width = LW − 42 (16 mm sides), length = NL − 10, 14 mm under the box for the runner. */
  facades.forEach(function (f) {
    var rt = R.runner[f.hw]; if (!rt || !rt.under) return;
    var ub = R.under, bt = +ub.boxT > 0 ? +ub.boxT : t, k = f.col || 0, rail = +((c.sections || []).filter(function (s2) { return Math.min(cols - 1, Math.max(0, Math.floor(+s2.col || 0))) === k; })[f.sec] || {}).rail || 500;
    var lbl2 = 'stalčius ' + (cols > 1 ? (k + 1) + '.' : '') + (f.sec + 1) + '.' + (f.idx + 1);
    var LW = ix1(k) - ix0(k), SKW = LW - underDeduct(bt), OW = SKW + 2 * bt, bx0 = ix0(k) + (LW - OW) / 2, BD = rail - +ub.shorter;
    var axis = Math.max(t + +ub.up, f.bottom + +ub.up), zB = axis - +ub.up + +ub.clearBelow, rc = +ub.recess;
    var room = Dside - clearBackK(k); if (rail + +ub.depthPlus > room + 0.01) { warnOnce(lbl2 + ': bėgeliui ' + rail + ' mm reikia ' + num(rail + +ub.depthPlus) + ' mm vidinio gylio, yra ' + num(room) + ' — rinkitės trumpesnį'); return; }
    if (bt > 19) warnOnce(lbl2 + ': stalčiaus šonai ' + num(bt) + ' mm — paslėptiems bėgeliams tinka 16–19 mm');
    var innerTop = (topFull ? H - t : (rl.front === 'v' ? H - rw : H - t)) - 3;
    var top = Math.min(f.bottom + f.h - +ub.topGap, innerTop), HB = Math.floor(top - zB), backH = HB - rc - bt;
    if (backH < 50 || SKW < 100) { warnOnce(lbl2 + ': fasadas per žemas arba skyrius per siauras stalčiaus dėžei (' + num(HB) + ' × ' + num(OW) + ' mm) — dėžė nepridėta'); return; }
    nBox++; var base2 = 'STALC' + nBox + '_', note = function (w) { return lbl2 + ', ' + w; };
    var rows = function (h0) { return h0 >= 200 ? [32, h0 / 2, h0 - 32] : h0 >= 100 ? [32, h0 - 32] : [h0 / 2]; };
    var confF = rows(HB).map(function (v) { return Math.max(v, rc + bt + 16); }).filter(function (v, i, a) { return a.indexOf(v) === i && v <= HB - 16; });   // above the bottom joint
    var confB = rows(backH).map(function (v) { return rc + bt + v; }), bz = rc + bt / 2, BDb = BD - bt;   // back rows (from the box bottom edge); bottom: centre height, depth
    var alongB = (BDb >= 350 ? [50, BDb / 2, BDb - 50] : [Math.min(50, BDb / 4), BDb - Math.min(50, BDb / 4)]);   // bottom ↔ sides, from the bottom's front edge
    var acrossB = (SKW >= 350 ? [50, SKW / 2, SKW - 50] : [Math.min(50, SKW / 4), SKW - Math.min(50, SKW / 4)]);   // bottom ↔ sub-front and back
    /* sides: x along the box depth from its front, y up from its bottom edge; face A inside */
    [false, true].forEach(function (right) {
      var p = panel(nm(base2 + (right ? 'SONAS_D' : 'SONAS_K')), 'STALC_SONAS', BD, HB, bt, note('vidinė pusė viršuje, priekis X=0, apačia Y=0; dugnas ' + num(rc) + ' mm nuo apačios'));
      confF.forEach(function (v) { hole(p, 'A', bt / 2, v, cf.d, 0, { through:true }); });
      confB.forEach(function (v) { hole(p, 'A', BD - bt / 2, v, cf.d, 0, { through:true }); });
      alongB.forEach(function (u) { hole(p, 'A', bt + u, bz, cf.d, 0, { through:true }); });
      place(p, right ? [bx0 + OW - bt, 0, zB] : [bx0 + bt, 0, zB], Y, Z, right ? neg(X) : X); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = f.pname; out.push(p);
    });
    /* sub-front: full height, pilots for the sides, through holes for the bottom (the drawer front covers them) */
    var pf = panel(nm(base2 + 'PRIEKIS'), 'STALC_PRIEKIS', SKW, HB, bt, note('vidinė pusė viršuje, apačia Y=0'));
    confF.forEach(function (v) { edge(pf, 'x0', v, cf.pilot.d, cf.pilot.depth); edge(pf, 'x1', v, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { hole(pf, 'A', x, bz, cf.d, 0, { through:true }); });
    place(pf, [bx0 + bt, bt, zB], X, Z, Y); pf.mat = mCarc; pf.eb.y1 = eCarc; pf.drawerOf = f.pname; out.push(pf);
    /* back: stands on the bottom */
    var pg = panel(nm(base2 + 'GALAS'), 'STALC_GALAS', SKW, backH, bt, note('stovi ant dugno, apačia Y=0'));
    confB.forEach(function (v) { edge(pg, 'x0', v - rc - bt, cf.pilot.d, cf.pilot.depth); edge(pg, 'x1', v - rc - bt, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { edge(pg, 'y0', x, cf.pilot.d, cf.pilot.depth); });
    place(pg, [bx0 + bt, BD - bt, zB + rc + bt], X, Z, neg(Y)); pg.mat = mCarc; pg.eb.y1 = eCarc; pg.drawerOf = f.pname; out.push(pg);
    /* bottom: between the sides, from the sub-front to the box's back end; face A up */
    var pb = panel(nm(base2 + 'DUGNAS'), 'STALC_DUGNAS', SKW, BDb, bt, note('įleistas ' + num(rc) + ' mm, vidinė pusė viršuje, priekis Y=0'));
    alongB.forEach(function (u) { edge(pb, 'x0', u, cf.pilot.d, cf.pilot.depth); edge(pb, 'x1', u, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { edge(pb, 'y0', x, cf.pilot.d, cf.pilot.depth); hole(pb, 'A', x, BDb - bt / 2, cf.d, 0, { through:true }); });
    place(pb, [bx0 + bt, bt, zB + rc + bt], X, Y, Z); pb.mat = mCarc; pb.drawerOf = f.pname; out.push(pb);
    U((f.hw || '') + ' (dėžė ir skylės)');
  });
  /* ---- Blum MERIVOBOX: steel sides on the cabinet profiles (the runner marks above), the shop cuts the 16 mm base and back */
  facades.forEach(function (f) {
    var rt = R.runner[f.hw]; if (!rt || !rt.merivo) return;
    var k = f.col || 0, s2 = (c.sections || []).filter(function (q) { return Math.min(cols - 1, Math.max(0, Math.floor(+q.col || 0))) === k; })[f.sec] || {}, rail = +s2.rail || 500;
    var lbl2 = 'stalčius ' + (cols > 1 ? (k + 1) + '.' : '') + (f.sec + 1) + '.' + (f.idx + 1), up = +R.merivo.up;
    var innerTop = (topFull ? H - t : (rl.front === 'v' ? H - rw : H - t)) - 3, nb = nBox + 1;
    var res = merivoParts({ x0:ix0(k), x1:ix1(k), y0:0, axis:Math.max(t + up, f.bottom + up), top:Math.min(f.bottom + f.h - +R.merivo.topGap, innerTop), room:Dside - clearBackK(k), rail:rail,
      want:s2.mvH, ext:s2.mvExt, name:function (q) { return nm('STALC' + nb + '_' + q); }, mat:mDrw, matOwn:!!mat.drawer, carcT:t, eb:eCarc, pname:f.pname, lbl:lbl2 }, warnOnce);
    if (!res) { hw.push({ item:'BLUM MERIVOBOX L=' + rail, qty:1, unit:'kompl.' }); return; }
    nBox++; res.parts.forEach(function (q) { out.push(q); }); res.hw.forEach(function (h) { hw.push(h); });
    var fp = out.filter(function (q) { return q.name === f.pname; })[0]; if (fp) fp.mv = res.box;
    f.mv = res.box; U('BLUM MERIVOBOX (dugnas, galas ir bėgelių skylės)');
  });

  /* ---- doors */
  doors.forEach(function (d, i) {
    var drill = o.hinges && d.hinged;
    var p = panel(nm('DURYS' + (i + 1)), 'DURYS', d.w, d.h, fT, d.cargo ? 'vidinė pusė viršuje, apatinis kraštas Y=0; cargo fasadas — tvirtinamas prie cargo rėmo (be gręžimo)' : drill ? 'vidinė pusė viršuje, apatinis kraštas Y=0, lankstai ' + (d.hingeLeft ? 'X=0' : 'X=DX') + ' pusėje' : d.fridge ? 'šaldytuvo fasadas — tvirtinamas prie šaldytuvo durų (be lankstų)' : 'durys be lankstų skylių');
    if (drill) {
      var hr = R.hinge, xc = d.hingeLeft ? hr.cupFromEdge : d.w - hr.cupFromEdge, dir = d.hingeLeft ? 1 : -1;
      d.ys.forEach(function (y) {
        hole(p, 'A', xc, y, hr.cupD, hr.cupDepth, { op:'hinge' });
        if (o.hingeFix === 'press') [-1, 1].forEach(function (sg) { hole(p, 'A', xc + dir*hr.dowelOffset, y + sg*hr.dowelSpacing/2, hr.dowelD, hr.dowelDepth, { op:'hinge' }); });
        else [-1, 1].forEach(function (sg) { hole(p, 'A', xc + dir*hr.dowelOffset, y + sg*hr.dowelSpacing/2, R.post.markD, R.post.markDepth, { op:'hinge', mark:true }); });   // screw-on cup: its 2 screw positions marked Ø5 × 2
      });
      p.warnings.push('lankstų puodelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu');
    }
    place(p, [d.x, 0, d.z], X, Z, Y); p.mat = mFac; p.eb = { y0:eFac, y1:eFac, x0:eFac, x1:eFac };
    p.hingeLeft = d.cargo ? undefined : d.hingeLeft; p.sec = d.sec; if (d.cargo) { p.cargo = true; p.drawer = true; }   // for drawings (room view): which side the door opens from, and its section (to flip it there)
    out.push(p);
  });
  shelfPanels.forEach(function (p) { out.push(p); });

  /* ---- legs (drawn under the bottom; only marks are drilled) */
  var legs = [];
  if (o.legs && o.feet) feetPos.forEach(function (l) { legs.push({ x:l.x, y:l.y, d:R.feet.d, h:R.feet.h, feet:true }); });
  else if (o.legs) legSpots(null).forEach(function (l) { legs.push({ x:l.x, y:l.y, d:R.legs.drawD, h:+c.legH || 100 }); });
  if (legs.length) hw.push({ item:o.feet ? 'Pėdutės Ø15' : 'Kojelės', qty:legs.length, unit:'vnt.' });
  /* a plinth (cokolis) among the extra parts is drawn at the front, under the carcass (between the sides when they reach the floor) */
  var plx = (c.extras || []).filter(function (x) { return x && (x.kind === 'plinth' || /cokol|plint/i.test(x.name || '')) && +x.L > 0 && +x.W > 0 && !(x.qty !== '' && x.qty != null && !(+x.qty > 0)); })[0], legEff = o.legs ? (o.feet ? R.feet.h : (+c.legH || 100)) : 0;   // only a plinth that is made
  var inS = hb > 0 && (plx && plx.between != null && plx.between !== '' ? plx.between === true || plx.between === 'true' : !legEff);   // between the sides (they reach below the raised bottom): asked, or when they stand on the floor
  var plX0 = inS ? t : 0, plX1 = inS ? W - t : W; if (plx && +plx.L < plX1 - plX0) { var plM = (plX0 + plX1) / 2; plX0 = plM - +plx.L / 2; plX1 = plM + +plx.L / 2; }   // a shorter plinth: as long as its row says, in the middle
  var plZ0 = inS ? 0 : -legEff;   // between the sides: from their lower end (on legs too), under the carcass: from the floor
  /* a plinth fitted by its gaps (gl / gr to the sides — their inner faces between them, outer under the carcass —, gt under the bottom
     board, gb above the floor): its size follows the cabinet (the row's L / W are kept in step by the app) */
  var plGv = function (k) { var v = plx && plx[k]; return v === '' || v == null || !isFinite(+v) ? null : +v; };
  var plFit = plx && ['gl', 'gr', 'gt', 'gb'].some(function (k) { return plGv(k) != null; }), plZ1 = null;
  if (plFit) { plX0 = (inS ? t : 0) + Math.max(0, plGv('gl') || 0); plX1 = (inS ? W - t : W) - Math.max(0, plGv('gr') || 0); plZ0 += Math.max(0, plGv('gb') || 0); plZ1 = (inS ? hb : 0) - Math.max(0, plGv('gt') || 0);
    if (plX1 - plX0 < 50 || plZ1 - plZ0 < 20) { warnOnce('cokolis netelpa su nurodytais tarpais'); plFit = false; plZ1 = null; } }
  var plinth = plx ? { x0:plX0, x1:plX1, z0:plZ0, z1:plZ1 != null ? plZ1 : plZ0 + (+plx.W > 0 ? +plx.W : Math.max(40, (inS ? 0 : legEff) + hb - 2)), fit:!!plFit, between:inS, top:inS ? hb : 0, floor:inS ? 0 : -legEff, sideIn:inS ? t : 0, y0:plx.yf !== '' && plx.yf != null && isFinite(+plx.yf) ? Math.max(0, +plx.yf) : inS ? 20 : 50, t:+plx.T || t, mat:plx.mat || mFac } : null;   // its front: yf mm behind the carcass front
  /* ---- LED profile grooves (c.leds): in the bottom, the top or a side, along the part, a set distance from the front edge.
     at: bottom | top | L | R; side: in (into the cabinet) | out; from: front edge → groove; ends: open (through the part's ends, the profile slides in) | closed */
  var leds = [];
  (Array.isArray(c.leds) ? c.leds : []).forEach(function (ld, li) {
    if (!ld) return;
    var at = ld.at, role = at === 'bottom' ? 'DUGNAS' : at === 'top' ? 'VIRSUS' : at === 'L' ? 'KAIRE' : at === 'R' ? 'DESINE' : null;
    var lbl = 'LED ' + (li + 1), pl = role && out.filter(function (q) { return q.role === role; })[0];
    if (!pl) { warn.push(lbl + ': ' + (at === 'top' ? 'spintelė be pilno viršaus (juostos) — LED griovelis nepadarytas' : 'nėra detalės ' + (role || at) + ' — LED griovelis nepadarytas')); return; }
    var gw = +ld.w > 0 ? +ld.w : R.led.w, dep = +ld.depth > 0 ? +ld.depth : R.led.depth, from = +ld.from >= 0 && ld.from !== '' && ld.from != null ? +ld.from : R.led.from;
    var dMax = pl.T - R.rout.skin; if (dep > dMax) { warn.push(lbl + ': griovelio gylis ' + num(dep) + ' > ' + num(dMax) + ' (paliekama ' + R.rout.skin + ' mm) — sumažinta'); dep = dMax; }
    var inside = ld.side !== 'out', face = at === 'top' ? (inside ? 'B' : 'A') : (at === 'bottom' ? (inside ? 'A' : 'B') : (inside ? 'A' : 'B'));
    var yOff = at === 'top' && tOver ? fT : 0, ya = from + yOff, yb = ya + gw;   // the part's y from its front edge (a top over the fronts starts fT further out)
    if (at === 'R') { var Ds2 = pl.W; ya = Ds2 - (from + gw); yb = Ds2 - from; }   // the right side: its front edge is Y = DY
    if (ya < 0 || yb > pl.W + 1e-6) { warn.push(lbl + ': griovelis (' + num(from) + ' + ' + num(gw) + ' mm nuo priekio) netelpa detalėje ' + num(pl.W) + ' mm — nepadarytas'); return; }
    var closed = ld.ends === 'closed', e = closed ? Math.max(R.rout.dia / 2 + 1, +ld.end >= 0 && ld.end !== '' && ld.end != null ? +ld.end : R.led.end) : 0;
    if (closed && pl.L - 2 * e < 60) { warn.push(lbl + ': per trumpa detalė uždaram grioveliui — nepadarytas'); return; }
    var g = { x0:e, x1:pl.L - e, y0:ya, y1:yb, face:face, depth:dep, led:true, name:'LED_PROFILE_DRAG_ON_EDGE' };
    /* the groove must not open into a hole: connector bores in the part's ends and edges (at mid-thickness), cams and
       hinge-plate / runner holes and marks on either face, as deep as they go — with a 2 mm wall left. On a clash the
       groove is moved the least it takes (towards the front or the back), and a note says so; no room → a warning. */
    var clashes = function (y0, y1) { var T = pl.T, m = 2, z0 = face === 'A' ? T - dep - m : -1, z1 = face === 'A' ? T + 1 : dep + m, gx0 = g.x0 - m, gx1 = g.x1 + m, gy0 = y0 - m, gy1 = y1 + m;
      var hitBox = function (bx0, bx1, by0, by1, bz0, bz1) { return bx1 > gx0 && bx0 < gx1 && by1 > gy0 && by0 < gy1 && bz1 > z0 && bz0 < z1; };
      return pl.holes.filter(function (h) { var r = h.d / 2, hz0 = h.through ? 0 : h.face === 'A' ? T - h.depth : 0, hz1 = h.through ? T : h.face === 'A' ? T : h.depth;
               return hitBox(h.x - r, h.x + r, h.y - r, h.y + r, hz0, hz1); }).length +
             (pl.edges || []).filter(function (b) { var r = b.d / 2, zc = T / 2, dd = b.depth;
               return b.edge === 'x0' ? hitBox(0, dd, b.pos - r, b.pos + r, zc - r, zc + r) : b.edge === 'x1' ? hitBox(pl.L - dd, pl.L, b.pos - r, b.pos + r, zc - r, zc + r)
                    : b.edge === 'y0' ? hitBox(b.pos - r, b.pos + r, 0, dd, zc - r, zc + r) : hitBox(b.pos - r, b.pos + r, pl.W - dd, pl.W, zc - r, zc + r); }).length; };
    if (clashes(g.y0, g.y1)) {
      var best = null;
      for (var dm = 1; dm <= 80 && best == null; dm++) [-dm, dm].forEach(function (dv) { if (best != null) return; var a0 = g.y0 + dv, a1 = g.y1 + dv; if (a0 >= 3 && a1 <= pl.W - 3 && !clashes(a0, a1)) best = dv; });
      var fromNow = function (y0) { return at === 'R' ? pl.W - (y0 + gw) - yOff : y0 - yOff; };
      if (best != null) { var was = fromNow(g.y0); g.y0 += best; g.y1 += best;
        warn.push(lbl + ': LED griovelis kirto jungčių / furnitūros skyles (' + pl.role + ') — perkeltas ' + num(was) + ' → ' + num(fromNow(g.y0)) + ' mm nuo priekio'); }
      else warn.push(lbl + ': LED griovelis kerta jungčių ar furnitūros skyles (' + pl.role + '), o perkelti nėra kur — pakeiskite jungtis ar LED vietą');
    }
    (pl.grooves = pl.grooves || []).push(g); pl.note += ', LED griovelis ' + num(gw) + '×' + num(dep) + (face === 'A' ? '' : ' (kitoje pusėje)');
    leds.push({ p:pl, g:g, at:at });
  });
  if (leds.length) hw.push({ item:'LED profilis 16 mm (įleidžiamas)', qty:Math.round(leds.reduce(function (a, q) { return a + (q.g.x1 - q.g.x0); }, 0)) / 1000, unit:'m' });

  if (hb) {   // lift the carcass: the sides' bottom edges stand at z = 0
    out.forEach(function (p) { if (p.place) p.place.o[2] += hb; });
    seams.forEach(function (sm) { sm.o[2] += hb; });
    doors.forEach(function (d) { d.z += hb; }); facades.forEach(function (f) { f.bottom += hb; });
  }

  out.forEach(orient);
  out.forEach(rightHanded);
  /* doors: say on which edge the hinge cups ended up, after the part was turned */
  out.forEach(function (p) {
    if (p.role !== 'DURYS') return;
    var cups = p.holes.filter(function (h) { return h.op === 'hinge' && h.d === R.hinge.cupD; }); if (!cups.length) return;
    var c0 = cups[0], e = Math.abs(c0.x - R.hinge.cupFromEdge) < 0.01 ? 'X=0' : Math.abs(c0.x - (p.L - R.hinge.cupFromEdge)) < 0.01 ? 'X=DX' : Math.abs(c0.y - R.hinge.cupFromEdge) < 0.01 ? 'Y=0' : 'Y=DY';
    p.note = p.note.replace(/lankstai X=D?X?0? ?pusėje/, 'lankstai ' + e + ' krašte');
  });
  finishParts();
  /* holes that run into each other (possible with custom joints): report, never silently drill */
  out.forEach(function (p) {
    var hs = p.holes;
    for (var i = 0; i < hs.length; i++) for (var k = i + 1; k < hs.length; k++) {
      var a = hs[i], b = hs[k]; if (a.mark || b.mark || a.op || b.op) continue;
      if (!(a.face === b.face || a.through || b.through)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.d + b.d)/2 + 0.5) { warnOnce(p.short + ': jungčių skylės persidengia (' + num(a.x) + ', ' + num(a.y) + ') — pakeiskite jungčių kiekį ar atstumą'); break; }
    }
    var es = p.edges;
    for (var i2 = 0; i2 < es.length; i2++) for (var k2 = i2 + 1; k2 < es.length; k2++)
      if (es[i2].edge === es[k2].edge && Math.abs(es[i2].pos - es[k2].pos) < (es[i2].d + es[k2].d)/2 + 0.5) { warnOnce(p.short + ': krašto skylės persidengia (' + num(es[i2].pos) + ') — pakeiskite jungčių kiekį ar atstumą'); break; }
  });
  /* constructions whose 5 mm long-edge holes cannot be turned on the machine: say what to change */
  if (backTop && backType === 'confirmat' && Lside > R.machine.maxY) warn.push('nugaros konfirmatų Ø5 skylės šonų gale negali būti gręžiamos CNC (šonas ' + num(Lside) + ' mm > ' + R.machine.maxY + ') — nugarai pasirinkite ekscentrikus arba kaiščius');
  if (anyInside && backType === 'confirmat' && backPanels.some(function (bp) { return Math.max(bp.L, bp.W) > R.machine.maxY && bp.edges.some(function (e) { return (e.edge === 'y0' || e.edge === 'y1') && e.d === cf.pilot.d; }); })) warn.push('nugaros viduje Ø5 skylės ilguose kraštuose negali būti gręžiamos CNC (> ' + R.machine.maxY + ' mm) — nugarai pasirinkite ekscentrikus arba kaiščius');
  if (unver.length) warn.push('naujos jungtys, dar nepatikrintos su SWOOD modeliu: ' + unver.join(', ') + ' — patikrinkite pirmą gaminį');
  hardwareFromHoles(out, o, hw);
  /* the LED strips for the pictures: a thin glowing box in each groove, in cabinet coordinates (after the parts were turned) */
  var ledVis = leds.map(function (q) {
    var pq = q.p.place, g = q.g; if (!pq) return null; var tA = g.face === 'A' ? 0 : q.p.T, tB = g.face === 'A' ? Math.min(2, g.depth) : q.p.T - Math.min(2, g.depth), pts = [];
    [g.x0, g.x1].forEach(function (a2) { [g.y0 + 1, g.y1 - 1].forEach(function (b2) { [tA, tB].forEach(function (t2) { pts.push([0, 1, 2].map(function (k) { return pq.o[k] + a2 * pq.u[k] + b2 * pq.v[k] - t2 * pq.n[k]; })); }); }); });
    return { at:q.at, e:[0, 1, 2].map(function (k) { return [Math.min.apply(null, pts.map(function (v) { return v[k]; })), Math.max.apply(null, pts.map(function (v) { return v[k]; }))]; }) };
  }).filter(Boolean);
  return { panels:out, warnings:warn, hardware:mergeHw(hw), legs:legs, joints:jointsInfo, seams:seams, visual:{ doors:doors, drawers:facades, plinth:plinth, hb:hb, leds:ledVis }, shelfInfo:shelfInfo, dims:{ W:W, H:Htot, D:D, t:t },
    fgaps:{ l:sideGapL, r:sideGapR, mid:gap, top:topRef - zTopF + gap, bot:zBotF, hb:hb, botMin:-hb, botLow:botLow } };
}

/* ----------------------------------------------------------------- 3D construction (c.kind 'box')
   Built board by board: six outer boards (bottom, top, left, right, back, front), each on or off, at the
   outer face or set in by 'inset' mm. Where two boards meet, c.box.cover['a_b'] names the board that
   covers the other's end (the other sits between); a set-in board always sits inside the outer ones.
   Inside: partitions (vertical, from the board below to the board above) and shelves (in one compartment,
   fixed with connectors or adjustable on pins). Every end that meets a face is joined with that joint's
   connectors (confirmat | cam | dowel), drilled by the same rules as the cabinets; o.joints[key] = { type, n, e, pos }.
   Axes as for the cabinets: X to the right, Y from the front (0) to the back, Z up from the underside. */
var BOX_IDS = ['bottom', 'top', 'left', 'right', 'back', 'front'];
var BOX_DEF = {
  bottom:{ ax:2, hi:false, role:'DUGNAS',  rank:6, lt:'apačia' }, top:  { ax:2, hi:true,  role:'VIRSUS', rank:4, lt:'viršus' },
  left:  { ax:0, hi:false, role:'KAIRE',   rank:5, lt:'kairė' },  right:{ ax:0, hi:true,  role:'DESINE', rank:5, lt:'dešinė' },
  back:  { ax:1, hi:true,  role:'NUGARA',  rank:7, lt:'nugara' }, front:{ ax:1, hi:false, role:'PRIEKIS', rank:1, lt:'priekis' } };
function boxDefaults(c) {
  var b = c.box = c.box || {};
  b.boards = b.boards || {};
  BOX_IDS.forEach(function (id) { b.boards[id] = Object.assign({ on:id !== 'front', inset:0, T:'' }, b.boards[id] || {}); });
  b.cover = b.cover || {}; b.inner = Array.isArray(b.inner) ? b.inner : []; b.fronts = Array.isArray(b.fronts) ? b.fronts : [];
  return b;
}
function boxPair(a, b) { return [a, b].sort().join('_'); }
/* default: back over everything, bottom under the sides, top between the sides, a front board inside */
function boxCoverDefault(a, b) { return BOX_DEF[a].rank >= BOX_DEF[b].rank ? a : b; }
/* default connector spots along a joint of length w: 70 (confirmat) / 50 (cam) from the ends, about every 400 mm */
function boxSpots(w, type) {
  var e = type === 'cam' ? R.cam.cam.fromFront : R.confirmat.fromFront, pos, i;
  if (w < 2*e + 16) { e = Math.max(type === 'cam' ? 12 : 9, Math.min(e, w/4)); pos = w >= 120 ? [e, w - e] : [w/2]; if (pos.length === 1) e = w/2; }
  else { var n = Math.max(2, Math.ceil((w - 2*e)/400 - 1e-9) + 1); pos = []; for (i = 0; i < n; i++) pos.push(e + (w - 2*e)*i/(n - 1)); }
  pos = pos.map(function (a) { return Math.round(a*10)/10; });
  return { pos:pos, n:pos.length, e:pos[0], dowels:type === 'cam' ? pairedDowels(pos, w, R.cam.dowel.offset) : [] };
}
/* frame of a board: face A normal n along axis ax (sign sg), u × v = n so programs never need mirroring */
function boxFrame(ax, sg) {
  var E3 = [X, Y, Z], uv = [[1, 2], [2, 0], [0, 1]][ax], u = uv[0], v = uv[1];
  if (sg < 0) { var tmp = u; u = v; v = tmp; }
  var n = sg > 0 ? E3[ax] : neg(E3[ax]);
  return { ax:ax, sg:sg, u:u, v:v, U:E3[u], V:E3[v], n:n };
}
var DIR_LT = { '0-':'kairys', '0+':'dešinys', '1-':'priekinis', '1+':'galinis', '2-':'apatinis', '2+':'viršutinis' };

function buildBox(c, idx, projName) {
  var shSet = shelfSetSb(c), shSb = shSet == null ? R.shelf.setback : shSet;
  var o = cncDefaults(c), bx = boxDefaults(c);
  var t = +c.thick || 18, W = +c.W, H = +c.H, D = +c.D, S3 = [W, D, H];
  var base = safeName(projName || 'PROJ') + '_' + (idx + 1) + (c.name ? '_' + safeName(c.name) : '');
  var nm = function (role) { return base + '_' + role; };
  var out = [], warn = [], hw = [], jointsInfo = [], seams = [];
  var warnOnce = function (w) { if (warn.indexOf(w) < 0) warn.push(w); };
  var mat = c.mat || {}, ed = c.edge || {}, mCarc = mat.carc || '', mBack = mat.back || mCarc, mDrw = mat.drawer || mCarc, eCarc = ed.carc || 'KRAŠTAS';
  var cf = R.confirmat, cm = R.cam;
  var empty = function () { return { panels:out, warnings:warn, hardware:hw, legs:[], joints:[], seams:[], visual:{ doors:[], drawers:[], plinth:null, hb:0 }, dims:{ W:W, H:H, D:D, t:t }, box:{ boards:[], ghosts:[], covers:[] } }; };
  if (!(W > 0 && H > 0 && D > 0)) { warn.push('netinkami matmenys'); return empty(); }

  /* ---- outer boards */
  var B = {}, boards = [];
  BOX_IDS.forEach(function (id) {
    var s = bx.boards[id], df = BOX_DEF[id]; if (!s.on) return;
    var T = +s.T > 0 ? +s.T : t, ins = Math.max(0, +s.inset || 0);
    if (ins + T > S3[df.ax] / 2) { warnOnce(df.lt + ': įleidimas ' + num(ins) + ' mm per didelis — netinkami matmenys'); ins = 0; }
    B[id] = { id:id, ax:df.ax, hi:df.hi, T:T, ins:ins, role:df.role, outer:true, lt:df.lt, thin:T < 12 };
    boards.push(B[id]);
  });
  if (!boards.length) { warn.push('nėra nė vienos plokštės — pridėkite plokštes'); return empty(); }
  var slab = function (bd) { var L = S3[bd.ax]; return bd.hi ? [L - bd.ins - bd.T, L - bd.ins] : [bd.ins, bd.ins + bd.T]; };
  var innerFace = function (bd) { var s = slab(bd); return bd.hi ? s[0] : s[1]; };
  /* who covers whom: a set-in board sits inside the boards at the outer face; otherwise the user's choice or the default */
  var coverOf = function (a, b) {
    var A = B[a], Bb = B[b];
    if (A.ins > 0 && !(Bb.ins > 0)) return { by:b, forced:true };
    if (Bb.ins > 0 && !(A.ins > 0)) return { by:a, forced:true };
    var v = bx.cover[boxPair(a, b)]; if (v !== a && v !== b) v = boxCoverDefault(a, b);
    return { by:v, forced:false };
  };
  var covers = [];
  boards.forEach(function (bd, i) { boards.forEach(function (q, k) {
    if (k <= i || q.ax === bd.ax) return;
    var cv = coverOf(bd.id, q.id); covers.push({ key:boxPair(bd.id, q.id), a:bd.id, b:q.id, by:cv.by, forced:cv.forced });
  }); });
  var coverBy = function (a, b) { var k = boxPair(a, b); for (var i = 0; i < covers.length; i++) if (covers[i].key === k) return covers[i].by; return null; };
  boards.forEach(function (bd) {
    var ext = [null, null, null]; ext[bd.ax] = slab(bd);
    [0, 1, 2].forEach(function (a) {
      if (a === bd.ax) return; var lo = 0, hi = S3[a];
      boards.forEach(function (nb) { if (nb.ax !== a || coverBy(bd.id, nb.id) === bd.id) return;
        if (nb.hi) hi = Math.min(hi, innerFace(nb)); else lo = Math.max(lo, innerFace(nb)); });
      ext[a] = [lo, hi];
    });
    bd.ext = ext;
  });
  /* a corner where three boards meet must be filled by exactly one of them */
  [false, true].forEach(function (hx) { [false, true].forEach(function (hy) { [false, true].forEach(function (hz) {
    var ids = [hx ? 'right' : 'left', hy ? 'back' : 'front', hz ? 'top' : 'bottom'];
    if (!ids.every(function (id) { return B[id] && !B[id].ins; })) return;
    var pt = ids.map(function (id) { var s = slab(B[id]); return (s[0] + s[1]) / 2; });
    var n = ids.filter(function (id) { return [0, 1, 2].every(function (a) { return pt[a] > B[id].ext[a][0] && pt[a] < B[id].ext[a][1]; }); }).length;
    if (n !== 1) warnOnce('kampas ' + ids.map(function (id) { return B[id].lt; }).join(' – ') + ': ' + (n ? 'plokštės kertasi' : 'liks tarpas') + ' — pakeiskite, kuri plokštė dengia kurią');
  }); }); });

  /* ---- cavity, partitions, shelves */
  var cav = [0, 1, 2].map(function (a) { var lo = 0, hi = S3[a];
    boards.forEach(function (bd) { if (bd.ax !== a) return; if (bd.hi) hi = Math.min(hi, innerFace(bd)); else lo = Math.max(lo, innerFace(bd)); });
    return [lo, hi]; });
  var parts = bx.inner.filter(function (q) { return q && q.kind === 'part'; }).slice().sort(function (a, b) { return (+a.x || 0) - (+b.x || 0); });
  var partB = [];
  parts.forEach(function (q, k) {
    var T = +q.T > 0 ? +q.T : t, x = +q.x || 0, x0 = x - T/2;
    var lo = partB.length ? partB[partB.length - 1].ext[0][1] : cav[0][0];
    if (x0 < lo + 50 || x0 + T > cav[0][1] - 50) { warnOnce('pertvara ' + (k + 1) + ' (' + num(x) + ' mm): ne vidinėje erdvėje arba per arti kitos plokštės — praleista'); return; }
    var bd = { id:'i' + q.id, inner:q, ax:0, T:T, role:'PERTVARA', kind:'part', lt:'pertvara ' + (partB.length + 1), nr:partB.length + 1, ext:[[x0, x0 + T], cav[1].slice(), cav[2].slice()] };
    partB.push(bd); boards.push(bd);
  });
  var comp = []; (function () { var lo = cav[0][0]; partB.forEach(function (p) { comp.push([lo, p.ext[0][0]]); lo = p.ext[0][1]; }); comp.push([lo, cav[0][1]]); })();
  var nSh = 0, pinsN = 0;
  bx.inner.filter(function (q) { return q && q.kind === 'shelf'; }).slice().sort(function (a, b) { return ((+a.col || 0) - (+b.col || 0)) || ((+a.z || 0) - (+b.z || 0)); }).forEach(function (q) {
    var T = +q.T > 0 ? +q.T : t, col = Math.min(comp.length - 1, Math.max(0, Math.floor(+q.col || 0))), z = +q.z || 0, adj = !!q.adj, cx = comp[col];
    if (z < cav[2][0] + 30 || z + T > cav[2][1] - 30) { warnOnce('lentyna ' + num(z) + ' mm aukštyje: ne vidinėje erdvėje — praleista'); return; }
    if (boards.some(function (o2) { return o2.kind === 'shelf' && o2.col === col && z < o2.ext[2][1] + 30 && z + T > o2.ext[2][0] - 30; })) { warnOnce('lentyna ' + num(z) + ' mm aukštyje: per arti kitos lentynos — praleista'); return; }
    var cl = adj ? R.shelf.clearW / 2 : 0, y0 = cav[1][0] + (adj ? shSb : shSet != null ? shSet : Math.max(0, +q.setback || 0));   // the cabinet's setting, when it is set, for all of them
    nSh++;
    boards.push({ id:'i' + q.id, inner:q, ax:2, T:T, role:'LENTYNA', kind:'shelf', adj:adj, col:col, lt:'lentyna ' + nSh, nr:nSh, ext:[[cx[0] + cl, cx[1] - cl], [y0, cav[1][1]], [z, z + T]] });
  });
  var byId = {}; boards.forEach(function (bd) { byId[bd.id] = bd; });

  /* ---- panels: face A is the inner face of an outer board, the top of a shelf, the right-hand face of a partition */
  boards.forEach(function (bd) {
    var sg = bd.outer ? (bd.hi ? -1 : 1) : 1, fr = boxFrame(bd.ax, sg), e = bd.ext;
    var L = e[fr.u][1] - e[fr.u][0], Wd = e[fr.v][1] - e[fr.v][0];
    var oo = [0, 0, 0]; oo[fr.u] = e[fr.u][0]; oo[fr.v] = e[fr.v][0]; oo[bd.ax] = sg > 0 ? e[bd.ax][1] : e[bd.ax][0];
    var name = bd.kind ? bd.role + bd.nr : bd.role;
    var p = panel(nm(name), bd.role, L, Wd, bd.T, '');
    place(p, oo, fr.U, fr.V, fr.n); p.mat = bd.id === 'back' ? mBack : mCarc;
    bd.p = p; bd.fr = fr; bd.o = oo; bd.camFace = bd.kind === 'shelf' ? 'B' : 'A';
    bd.occ = [];
    if (L < 30 || Wd < 30) warnOnce(bd.lt + ': ' + num(L) + ' × ' + num(Wd) + ' mm — per maža detalė, patikrinkite matmenis');
  });
  var loc = function (bd, pt) { return { x:pt[bd.fr.u] - bd.o[bd.fr.u], y:pt[bd.fr.v] - bd.o[bd.fr.v] }; };
  var faceAt = function (bd, coord) { return Math.abs(coord - bd.o[bd.ax]) < 0.01 ? 'A' : 'B'; };

  /* ---- occupancy: every hole as a 2-D shape in the part plus the slice of the thickness it takes */
  var segD = function (ax, ay, bx2, by, px, py) { var dx = bx2 - ax, dy = by - ay, l2 = dx*dx + dy*dy, tt = l2 ? Math.max(0, Math.min(1, ((px - ax)*dx + (py - ay)*dy)/l2)) : 0; return Math.hypot(ax + tt*dx - px, ay + tt*dy - py); };
  var shapeDist = function (a, b) {
    if (a.s && b.s) { var s1 = a.s, s2 = b.s;
      var cross = function (p1, p2, p3) { return (p2[0] - p1[0])*(p3[1] - p1[1]) - (p2[1] - p1[1])*(p3[0] - p1[0]); };
      var d1 = cross(s2[0], s2[1], s1[0]), d2 = cross(s2[0], s2[1], s1[1]), d3 = cross(s1[0], s1[1], s2[0]), d4 = cross(s1[0], s1[1], s2[1]);
      if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
      return Math.min(segD(s2[0][0], s2[0][1], s2[1][0], s2[1][1], s1[0][0], s1[0][1]), segD(s2[0][0], s2[0][1], s2[1][0], s2[1][1], s1[1][0], s1[1][1]),
                      segD(s1[0][0], s1[0][1], s1[1][0], s1[1][1], s2[0][0], s2[0][1]), segD(s1[0][0], s1[0][1], s1[1][0], s1[1][1], s2[1][0], s2[1][1])); }
    if (a.s) return segD(a.s[0][0], a.s[0][1], a.s[1][0], a.s[1][1], b.x, b.y);
    if (b.s) return segD(b.s[0][0], b.s[0][1], b.s[1][0], b.s[1][1], a.x, a.y);
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  var fpFace = function (bd, face, x, y, d, depth, through, jk) { var T = bd.T; return { x:x, y:y, r:d/2, z:through ? [0, T] : face === 'A' ? [0, depth] : [T - depth, T], jk:jk }; };
  var fpEdge = function (bd, edgeK, pos, d, depth, jk) { var p = bd.p, L = p.L, Wd = p.W, s;
    if (edgeK === 'x0') s = [[0, pos], [depth, pos]]; else if (edgeK === 'x1') s = [[L, pos], [L - depth, pos]]; else if (edgeK === 'y0') s = [[pos, 0], [pos, depth]]; else s = [[pos, Wd], [pos, Wd - depth]];
    return { s:s, r:d/2, z:[bd.T/2 - d/2, bd.T/2 + d/2], jk:jk }; };
  var clashes = function (bd, fp) { return bd.occ.some(function (q) {
    if (q.jk === fp.jk && fp.jk) return false;
    if (Math.min(q.z[1], fp.z[1]) - Math.max(q.z[0], fp.z[0]) <= 0.2) return false;
    return shapeDist(q, fp) < q.r + fp.r + 1; }); };

  /* ---- joints: the board whose end meets another's face carries the edge bores */
  var TYPE_LT = { confirmat:'konfirmatai', cam:'ekscentrikai', dowel:'kaiščiai' }, J = o.joints || {}, seenThin = {};
  var resolveBox = function (jj, w, label) {
    var type = TYPE_LT[jj.type] ? jj.type : o.joinery === 'cam' ? 'cam' : 'confirmat';
    var bs = boxSpots(w, type), pos = bs.pos, dws = bs.dowels, n = +jj.n > 0 ? Math.round(+jj.n) : 0, e = +jj.e > 0 ? +jj.e : 0;
    var minGap = type === 'cam' ? 24 : 16, minEdge = type === 'cam' ? 12 : 9;
    var cust = Array.isArray(jj.pos) ? jj.pos.map(Number).filter(function (a) { return isFinite(a); }) : null;
    if (cust) {
      var kept = [];
      cust.map(function (a) { return Math.round(Math.max(minEdge, Math.min(w - minEdge, a))*10)/10; }).sort(function (a, b) { return a - b; })
          .forEach(function (a) { if (!kept.length || a - kept[kept.length - 1] >= minGap - 0.01) kept.push(a); });
      if (kept.length < cust.length) warnOnce(label + ': ' + (cust.length - kept.length) + ' jungt. per arti kitos ar krašto — praleista');
      if (!kept.length) warnOnce(label + ': nėra nė vienos jungties — mazgas nesurištas');
      pos = kept; n = 0; e = 0;
    } else if (n || e) {
      var nn = n || bs.n, ee = Math.max(minEdge, Math.min(e || bs.e, w/2));
      var maxN = ee >= w/2 - 0.01 ? 1 : Math.floor((w - 2*ee)/minGap + 1e-9) + 1;
      if (nn > maxN) { warnOnce(label + ': ' + nn + ' jungtys netelpa ' + num(w) + ' mm — sumažinta iki ' + maxN); nn = maxN; }
      pos = []; if (nn <= 1) pos = [w/2]; else for (var i = 0; i < nn; i++) pos.push(Math.round((ee + (w - 2*ee)*i/(nn - 1))*10)/10);
    }
    dws = type === 'cam' ? pairedDowels(pos, w, cm.dowel.offset) : [];
    if (type === 'cam' && dws.length !== pos.length) { warnOnce(label + ': ekscentrikui ir kaiščiui nepakanka vietos — pakeiskite jungčių vietas'); dws = []; }
    dws = dws.filter(function (a) { return pos.every(function (q) { return Math.abs(q - a) >= 12; }); });
    return { type:type, pos:pos, dowels:dws, n:n, e:e, cust:!!cust, base:bs, minGap:minGap, minEdge:minEdge };
  };
  var contacts = [];
  boards.forEach(function (P) { boards.forEach(function (Q) {
    if (P === Q) return; var a = Q.ax; if (a === P.ax) return;
    var dir = Math.abs(P.ext[a][1] - Q.ext[a][0]) < 0.01 ? 1 : Math.abs(P.ext[a][0] - Q.ext[a][1]) < 0.01 ? -1 : 0; if (!dir) return;
    if (P.ext[P.ax][0] < Q.ext[P.ax][0] - 0.01 || P.ext[P.ax][1] > Q.ext[P.ax][1] + 0.01) return;
    var b = 3 - a - P.ax, lo = Math.max(P.ext[b][0], Q.ext[b][0]), hi = Math.min(P.ext[b][1], Q.ext[b][1]);
    if (hi - lo < 30) return;
    contacts.push({ P:P, Q:Q, a:a, b:b, dir:dir, lo:lo, hi:hi });
  }); });
  /* order: outer corners first, then partitions, then shelves (later joints move round earlier ones) */
  var rk = function (bd) { return bd.outer ? 0 : bd.kind === 'part' ? 1 : 2; };
  contacts.sort(function (x, y) { return (Math.max(rk(x.P), rk(x.Q)) - Math.max(rk(y.P), rk(y.Q))) || (x.P.nr || 0) - (y.P.nr || 0); });
  var nJ = 0;
  contacts.forEach(function (ct) {
    var P = ct.P, Q = ct.Q, key = 'b_' + boxPair(P.id, Q.id), label = cap(P.lt) + ' – ' + Q.lt;
    if (P.kind === 'shelf' && (Q.id === 'back' || Q.id === 'front')) return;   // shelves only rest against a back / front
    if (P.adj) return;                                                         // adjustable shelf: on pins
    if (P.thin || Q.thin) { var th = P.thin ? P : Q; if (!seenThin[th.id]) { seenThin[th.id] = 1; warnOnce(cap(th.lt) + ' ' + num(th.T) + ' mm: plona plokštė — jungčių negręžiama, tvirtinama vinimis / kabėmis'); } return; }
    var w = ct.hi - ct.lo, plane = ct.dir > 0 ? Q.ext[ct.a][0] : Q.ext[ct.a][1], mid = (P.ext[P.ax][0] + P.ext[P.ax][1]) / 2;
    var o3 = [0, 0, 0]; o3[ct.a] = plane; o3[P.ax] = mid; o3[ct.b] = ct.lo;
    var d3 = [0, 0, 0]; d3[ct.b] = 1;
    var res = resolveBox(J[key] || {}, w, label);
    var qFace = faceAt(Q, plane), Pfr = P.fr;
    var edgeK = ct.a === Pfr.u ? (ct.dir > 0 ? 'x1' : 'x0') : (ct.dir > 0 ? 'y1' : 'y0');
    var along = function (s) { var pt = o3.slice(); pt[ct.b] += s; return pt; };
    var plan = function (dl) {   // holes of this joint, set moved dl along the joint
      var hs = [], add = function (bd, kind, a, d, depth, extra) { hs.push(Object.assign({ bd:bd, kind:kind, a:a + dl, d:d, depth:depth }, extra || {})); };
      if (res.type === 'cam') {
        res.pos.forEach(function (a) { add(P, 'cam', a, cm.cam.d, cm.cam.depth); add(P, 'edge', a, cm.bolt.d, cm.bolt.depthEdge); add(Q, 'face', a, cm.bolt.d, cm.bolt.depthFace); });
        res.dowels.forEach(function (a) { add(P, 'edge', a, cm.dowel.d, cm.dowel.depthEdge); add(Q, 'face', a, cm.dowel.d, cm.dowel.depthFace); });
      } else if (res.type === 'dowel') res.pos.forEach(function (a) { add(P, 'edge', a, cm.dowel.d, cm.dowel.depthEdge); add(Q, 'face', a, cm.dowel.d, cm.dowel.depthFace); });
      else res.pos.forEach(function (a) { add(P, 'edge', a, cf.pilot.d, cf.pilot.depth); add(Q, 'face', a, cf.d, 0, { through:true }); });
      return hs.map(function (h) {
        var pt = along(h.a), l = loc(h.bd, pt);
        if (h.kind === 'edge') { h.edge = edgeK; h.pos = edgeK[0] === 'x' ? l.y : l.x; h.fp = fpEdge(P, edgeK, h.pos, h.d, Math.min(h.depth, R.post.edgeMaxZ), key); }
        else if (h.kind === 'cam') { var ce = cm.cam.fromEdge; h.face = P.camFace;
          h.x = edgeK === 'x0' ? ce : edgeK === 'x1' ? P.p.L - ce : l.x; h.y = edgeK === 'y0' ? ce : edgeK === 'y1' ? P.p.W - ce : l.y;
          h.fp = fpFace(P, h.face, h.x, h.y, h.d, h.depth, false, key); }
        else { h.face = qFace; h.x = l.x; h.y = l.y; h.fp = fpFace(Q, qFace, h.x, h.y, h.d, h.depth, !!h.through, key); }
        return h; });
    };
    var ok = function (hs) { return hs.every(function (h) { return h.a >= res.minEdge - 0.01 && h.a <= w - res.minEdge + 0.01 && !clashes(h.bd, h.fp); }); };
    var dl = 0, cand = [0]; for (var m = 1; m <= 20; m++) cand.push(8*m, -8*m);
    var hs = null; for (var ci = 0; ci < cand.length; ci++) { var tr = plan(cand[ci]); if (ok(tr)) { hs = tr; dl = cand[ci]; break; } }
    if (!hs) { hs = plan(0); warnOnce(label + ': jungčių skylės kertasi su kitomis ir jų nepavyko pastumti — pakeiskite jungtis'); }
    else if (dl) warnOnce(label + ': jungtys pastumtos ' + dl + ' mm, kad nesusitiktų su kitomis skylėmis — patikrinkite');
    hs.forEach(function (h) {
      if (h.kind === 'edge') edge(h.bd.p, h.edge, h.pos, h.d, h.depth);
      else hole(h.bd.p, h.face, h.x, h.y, h.d, h.depth, h.through ? { through:true } : null);
      h.bd.occ.push(h.fp);
    });
    if (Q.T - cm.bolt.depthFace < 2 && res.type === 'cam') warnOnce(cap(Q.lt) + ' ' + num(Q.T) + ' mm: ekscentriko varžto skylė ' + cm.bolt.depthFace + ' mm per gili — pasirinkite konfirmatus');
    nJ++;
    var sd = { type:res.type, pos:res.pos.slice(), dowels:res.dowels.slice(), n:res.n, e:res.e, manual:res.cust, custom:!!(J[key] && (J[key].type || J[key].n || J[key].e || J[key].pos)),
               defPos:res.base.pos.slice(), defN:res.base.n, defE:Math.round(res.base.e*10)/10, minGap:res.minGap, minEdge:res.minEdge };
    jointsInfo.push(Object.assign({ key:key, label:label, dflt:o.joinery, w:w, single:true, split:false, box:{ P:P.id, Q:Q.id } }, sd, { sides:{ L:sd, R:sd } }));
    var so = o3.slice(); so[ct.b] += dl;
    seams.push({ key:key, side:'L', o:so, d:d3, w:w });
  });

  /* ---- adjustable shelves: Ø5 pin holes in the boards at their ends */
  boards.forEach(function (S1) {
    if (S1.kind !== 'shelf' || !S1.adj) return;
    var pr = R.pins, zc = S1.ext[2][0] - pr.below, ys = [S1.ext[1][0] - shSb + shelfPinF(shSb), S1.ext[1][1] - pr.fromBack];
    var zs = [zc]; if (bx.pinRow) for (var k = 1; k <= pr.extra; k++) zs.push(zc - k*pr.pitch, zc + k*pr.pitch);
    [[S1.ext[0][0], -1], [S1.ext[0][1], 1]].forEach(function (end) {
      var Q = boards.filter(function (q) { return q.ax === 0 && Math.abs((end[1] < 0 ? q.ext[0][1] : q.ext[0][0]) - end[0]) < R.shelf.clearW && !q.thin; })[0];
      if (!Q) { warnOnce(cap(S1.lt) + ': šone nėra plokštės laikikliams'); return; }
      var plane = end[1] < 0 ? Q.ext[0][1] : Q.ext[0][0], face = faceAt(Q, plane);
      zs.forEach(function (z) { if (z < Q.ext[2][0] + 10 || z > Q.ext[2][1] - 10) return;
        ys.forEach(function (y) {
          var done = [0, 10, -10, 20, -20].some(function (sh) { var pt = [plane, y + sh, z], l = loc(Q, pt), fp = fpFace(Q, face, l.x, l.y, pr.d, pr.depth, false, null);
            if (clashes(Q, fp)) return false; hole(Q.p, face, l.x, l.y, pr.d, pr.depth, { op:'pin' }); Q.occ.push(fp); pinsN++; return true; });
          if (!done) warnOnce(cap(S1.lt) + ': laikiklio skylė kliūna už kitos skylės — praleista, perkelkite lentyną');
        }); });
    });
    hw.push({ item:'Lentynų laikikliai', qty:4, unit:'vnt.' });
  });
  if (pinsN) warnOnce('lentynų laikiklių skylės pagal standartą — NEPATIKRINTA su SWOOD modeliu');

  /* ---- edge banding: free edges seen from the front, the top and the ends (not the back, not the floor) */
  boards.forEach(function (bd) {
    var p = bd.p, fr = bd.fr;
    [['x0', fr.u, -1], ['x1', fr.u, 1], ['y0', fr.v, -1], ['y1', fr.v, 1]].forEach(function (ek) {
      var a = ek[1], s = ek[2], end = s > 0 ? bd.ext[a][1] : bd.ext[a][0], probe = bd.ext.map(function (r) { return [r[0] + 0.5, r[1] - 0.5]; });
      probe[a] = s > 0 ? [end, end + 1] : [end - 1, end];
      var touched = boards.some(function (q) { return q !== bd && [0, 1, 2].every(function (k) { return Math.min(q.ext[k][1], probe[k][1]) - Math.max(q.ext[k][0], probe[k][0]) > 0.01; }); });
      if (touched || bd.id === 'back') return;
      if ((a === 1 && s > 0) || (a === 2 && s < 0) || (a === 0 && bd.id === 'bottom')) return;
      p.eb[ek[0]] = eCarc || 'KRAŠTAS';
    });
  });
  if (!eCarc && boards.some(function (bd) { return ['x0', 'x1', 'y0', 'y1'].some(function (k) { return bd.p.eb[k]; }); })) warnOnce('krašto medžiaga nenurodyta — kraštai pažymėti „KRAŠTAS“');

  /* ---- doors and drawers on the openings (c.box.fronts): an opening is a compartment between the vertical boards, from one
     fixed horizontal board (bottom, fixed shelf) to the next (fixed shelf, top), 'span' openings high. Overlay fronts cover the
     board edges (full at an outer board, half at a partition / shelf, as on the cabinets); inset fronts sit inside the opening
     flush with the front edges. Hinge plates and runners are marked on the vertical boards (Ø5 × 2), set back by the front
     thickness for inset fronts; GTV / DTC ball and DTC undermount drawers get their board box as on the cabinets. */
  var fT = +o.facadeT || 18, mFac = mat.facade || mCarc, eFac = ed.facade || '', gapF = R.facade.gap, sideGapF = R.facade.sideGap, inGap = R.facade.insetGap || 2;
  var vDoors = [], vDrawers = [], openings = [], nFas = 0, nDur = 0, nBoxF = 0, unverF = [], takenF = {};
  var yF = cav[1][0];
  var levelsOf = function (k) {   // horizontal boards across compartment k, bottom up
    var cx = comp[k], hs = boards.filter(function (bd) { return bd.ax === 2 && !(bd.kind === 'shelf' && (bd.adj || bd.col !== k)) && bd.ext[0][0] <= cx[0] + 0.5 && bd.ext[0][1] >= cx[1] - 0.5; })
      .sort(function (a, b) { return a.ext[2][0] - b.ext[2][0]; });
    var lv = []; if (!hs.length || hs[0].ext[2][0] > cav[2][0] + 0.5) lv.push({ z0:cav[2][0], z1:cav[2][0], bd:null });
    hs.forEach(function (bd) { lv.push({ z0:bd.ext[2][0], z1:bd.ext[2][1], bd:bd }); });
    if (lv[lv.length - 1].z1 < cav[2][1] - 0.5) lv.push({ z0:cav[2][1], z1:cav[2][1], bd:null });
    return lv;
  };
  var vertAt = function (x, hiSide, z0, z1) {   // the vertical board whose face is at x (on the left: its right face)
    return boards.filter(function (bd) { return bd.ax === 0 && Math.abs((hiSide ? bd.ext[0][0] : bd.ext[0][1]) - x) < 0.5 && bd.ext[2][0] <= z0 + 0.5 && bd.ext[2][1] >= z1 - 0.5; })[0] || null; };
  comp.forEach(function (cx, k) { var lv = levelsOf(k); for (var i = 0; i + 1 < lv.length; i++) openings.push({ col:k, cell:i, x0:cx[0], x1:cx[1], z0:lv[i].z1, z1:lv[i + 1].z0, lo:lv[i].bd ? lv[i].bd.lt : '', hi:lv[i + 1].bd ? lv[i + 1].bd.lt : '' }); });
  var markOn = function (bd, x, y, z, what) {   // a Ø5 × 2 marking on a vertical board's face at world (x, y, z)
    var face = faceAt(bd, x), l = loc(bd, [x, y, z]);
    if (l.x < 5 || l.y < 5 || l.x > bd.p.L - 5 || l.y > bd.p.W - 5) { warnOnce(cap(bd.lt) + ': ' + what + ' žymė už plokštės ribų — praleista'); return false; }
    var fp = fpFace(bd, face, l.x, l.y, R.post.markD, R.post.markDepth, false, null);
    if (clashes(bd, fp)) { warnOnce(cap(bd.lt) + ': ' + what + ' žymė kliūna už kitos skylės (' + num(z) + ' mm aukštyje) — praleista, patikrinkite'); return false; }
    hole(bd.p, face, l.x, l.y, R.post.markD, R.post.markDepth, { mark:true, op:what === 'lanksto' ? 'hinge' : undefined }); bd.occ.push(fp); return true; };
  (bx.fronts || []).forEach(function (fr0, fi) {
    var lbl = 'fasadai ' + (fi + 1), col = Math.min(comp.length - 1, Math.max(0, Math.floor(+fr0.col || 0))), lv = levelsOf(col);
    var cell = Math.max(0, Math.floor(+fr0.cell || 0)), span = Math.max(1, Math.floor(+fr0.span || 1));
    if (B.front) { warnOnce(lbl + ': priekio plokštė uždaro konstrukciją — išjunkite „priekis“, kad būtų angos durims / stalčiams'); return; }
    if (cell + span >= lv.length) { warnOnce(lbl + ': tokios angos nėra (' + (comp.length > 1 ? (col + 1) + ' skyriuje ' : '') + (lv.length - 1) + ' ang.) — praleista'); return; }
    for (var cq = cell; cq < cell + span; cq++) if (takenF[col + ':' + cq]) { warnOnce(lbl + ': anga ' + (cq + 1) + (comp.length > 1 ? ' (' + (col + 1) + ' skyriuje)' : '') + ' jau užimta kitų durų / stalčių — praleista, pasirinkite kitą angą'); return; }
    for (cq = cell; cq < cell + span; cq++) takenF[col + ':' + cq] = fi + 1;
    var lo = lv[cell], hiL = lv[cell + span], zlo = lo.z1, zhi = hiL.z0, cx = comp[col], inset = !!fr0.inset;
    var Lb = vertAt(cx[0], false, zlo, zhi), Rb = vertAt(cx[1], true, zlo, zhi);
    var x0, x1, z0, z1;
    if (inset) { x0 = cx[0] + inGap; x1 = cx[1] - inGap; z0 = zlo + inGap; z1 = zhi - inGap; }
    else {
      x0 = Lb ? (Lb.outer ? Lb.ext[0][0] + sideGapF : (Lb.ext[0][0] + Lb.ext[0][1]) / 2 + gapF / 2) : cx[0] + gapF / 2;
      x1 = Rb ? (Rb.outer ? Rb.ext[0][1] - sideGapF : (Rb.ext[0][0] + Rb.ext[0][1]) / 2 - gapF / 2) : cx[1] - gapF / 2;
      z0 = lo.bd ? (lo.bd.outer ? lo.bd.ext[2][0] : (lo.bd.ext[2][0] + lo.bd.ext[2][1]) / 2 + gapF / 2) : zlo + gapF / 2;
      z1 = hiL.bd ? (hiL.bd.outer ? hiL.bd.ext[2][1] - gapF : (hiL.bd.ext[2][0] + hiL.bd.ext[2][1]) / 2 - gapF / 2) : zhi - gapF / 2;
    }
    var FW = x1 - x0, FH = z1 - z0, yFace = inset ? yF + fT : yF, back = inset ? fT : 0;   // marks and boxes move back by the front for inset fronts
    if (FW < 60 || FH < 60) { warnOnce(lbl + ': anga per maža fasadui (' + num(FW) + ' × ' + num(FH) + ') — praleista'); return; }
    var mkFront = function (role, w, h, x, z, name) { var p = panel(nm(name), role, w, h, fT, 'galinė (vidinė) pusė viršuje, apatinis kraštas Y=0');
      place(p, [x, yFace, z], X, Z, Y); p.mat = mFac; p.eb = { y0:eFac, y1:eFac, x0:eFac, x1:eFac }; p.frontOf = fi; return p; };
    if (fr0.kind === 'drawers') {
      boards.forEach(function (sh) { if (sh.kind === 'shelf' && sh.adj && sh.col === col && sh.ext[2][0] < zhi && sh.ext[2][1] > zlo) warnOnce(lbl + ': reguliuojama ' + sh.lt + ' kertasi su stalčiais — pašalinkite ją arba padarykite nekilnojamą'); });
      var n = Math.max(1, Math.min(8, Math.round(+fr0.nDrawers || 1))), hwN = fr0.hw || 'BLUM TANDEMBOX', rail = +fr0.rail || 500, rt = R.runner[hwN];
      var hD = (FH - (n - 1) * gapF) / n; if (hD < 60) { warnOnce(lbl + ': ' + n + ' stalčiai netelpa į ' + num(FH) + ' mm — praleista'); return; }
      if (!rt) warnOnce(lbl + ': bėgeliams „' + hwN + '“ skylių šablono nėra — žymės nepridėtos');
      var roomD = (B.back ? innerFace(B.back) : cav[1][1]) - yF - back;
      for (var j = 0; j < n; j++) {
        var fb = z0 + j * (hD + gapF), p = mkFront('FASADAS', FW, hD, x0, fb, 'FASADAS' + (++nFas)); p.drawer = true;
        if (rt && rt.facade && o.tbFront !== 'off') { var fc = rt.facade, mk = o.tbFront === 'mark';
          [fc.fromSide, FW - fc.fromSide].forEach(function (x) { fc.ys.concat(hD >= 250 ? [fc.yGallery] : []).forEach(function (y) { if (y > hD - 1) return; if (mk) hole(p, 'A', x, y, R.legs.markD, R.legs.markDepth, { mark:true }); else hole(p, 'A', x, y, fc.d, fc.depth); }); }); }
        out.push(p);
        var f = { w:FW, h:hD, bottom:fb, x:x0, hw:hwN, rail:rail, col:col, sec:fi, idx:j, pname:p.name, box:true, ox0:cx[0], ox1:cx[1], inset:inset };
        vDrawers.push(f); if (!(rt && rt.merivo)) hw.push({ item:hwN + ' L=' + rail, qty:1, unit:'kompl.' });
        if (!rt) continue;
        var up = runnerUp(rt), axis = Math.max(zlo + up, fb + up), mks = runnerMarks(rt, rail);
        if (rail > roomD + 0.01) warnOnce(lbl + ': bėgelis ' + rail + ' mm ilgesnis nei telpa (' + num(roomD) + ' mm) — rinkitės trumpesnį');
        if (o.runnerMarks !== false) [[Lb, cx[0]], [Rb, cx[1]]].forEach(function (q) { if (!q[0]) { warnOnce(lbl + ': šone nėra plokštės bėgeliui — žymės nepridėtos'); return; }
          mks.forEach(function (m) { if (m + back > roomD - 5) return; markOn(q[0], q[1], yF + back + m, axis, 'bėgelio'); }); });
        /* board boxes for GTV / DTC ball and DTC undermount runners */
        var ctx = { x0:cx[0], x1:cx[1], y0:yF + back, axis:axis, top:Math.min(fb + hD - (rt.ball ? +R.ball.topGap : rt.under ? +R.under.topGap : rt.merivo ? +R.merivo.topGap : 0), zhi - 3), room:roomD, lbl:lbl + '.' + (j + 1), pname:p.name };
        if (rt.ball || rt.under) { var parts2 = (rt.ball ? ballBoxParts : underBoxParts)(ctx, rail, ++nBoxF); if (parts2) { parts2.forEach(function (q) { out.push(q); }); if (unverF.indexOf(hwN) < 0) unverF.push(hwN); } }
        if (rt.merivo) { var nbM = nBoxF + 1;
          var mres = merivoParts(Object.assign({}, ctx, { rail:rail, want:fr0.mvH, ext:fr0.mvExt, name:function (q) { return nm('STALC' + nbM + '_' + q); }, mat:mDrw, matOwn:!!mat.drawer, carcT:t, eb:eCarc }), warnOnce);
          if (mres) { nBoxF++; mres.parts.forEach(function (q) { out.push(q); }); mres.hw.forEach(function (h) { hw.push(h); }); p.mv = f.mv = mres.box; if (unverF.indexOf(hwN) < 0) unverF.push(hwN); }
          else hw.push({ item:'BLUM MERIVOBOX L=' + rail, qty:1, unit:'kompl.' }); }
      }
    } else {
      var cargoHwF = cargoOf(fr0), hinge = cargoHwF || fr0.hinge || 'BLUM LANKSTAI', cargoF = !!cargoHwF, nd = cargoF ? 1 : Math.max(1, Math.min(2, Math.round(+fr0.nDoors || 1))), hs = fr0.hingeSide || 'auto', hinged = hinge !== 'BE FURNITŪROS' && !cargoF;
      var dw = (FW - (nd - 1) * gapF) / nd, hr = R.hinge, clr = hr.plateSpacing / 2 + hr.plateD / 2 + 3, nH = +fr0.hingeN >= 2 ? Math.min(6, Math.round(+fr0.hingeN)) : 0;
      for (var d = 0; d < nd; d++) {
        var dx = x0 + d * (dw + gapF), hl = nd === 2 ? d === 0 : hs === 'right' ? false : hs === 'left' ? true : !(Lb && !Lb.outer && Rb && Rb.outer) ;
        var pd = mkFront('DURYS', dw, FH, dx, z0, 'DURYS' + (++nDur)), ys = hingeYs(FH, nH).map(function (y) { return Math.max(zlo + clr - z0, Math.min(zhi - clr - z0, y)); });
        var fits = hinged && hingesFit(FH, o.hingeFix === 'press', nH) && ys.every(function (y, q) { return q === 0 || ys[q] - ys[q - 1] >= hr.cupD + 3; });
        var hb = hl ? Lb : Rb, hx = hl ? cx[0] : cx[1];
        if (hinged && o.hinges && !fits) warnOnce(lbl + ': durys ' + num(dw) + '×' + num(FH) + ' per žemos lankstams — skylės nepridėtos');
        if (hinged && o.hinges && fits && !hb) warnOnce(lbl + ': lankstų pusėje nėra plokštės — plokštelių žymės nepridėtos');
        if (hinged && o.hinges && fits) {
          var xc = hl ? hr.cupFromEdge : dw - hr.cupFromEdge, dir = hl ? 1 : -1;
          ys.forEach(function (y) { hole(pd, 'A', xc, y, hr.cupD, hr.cupDepth, { op:'hinge' });
            if (o.hingeFix === 'press') [-1, 1].forEach(function (sg) { hole(pd, 'A', xc + dir * hr.dowelOffset, y + sg * hr.dowelSpacing / 2, hr.dowelD, hr.dowelDepth, { op:'hinge' }); });
            else [-1, 1].forEach(function (sg) { hole(pd, 'A', xc + dir * hr.dowelOffset, y + sg * hr.dowelSpacing / 2, R.post.markD, R.post.markDepth, { op:'hinge', mark:true }); });
            if (hb) [-1, 1].forEach(function (sg) { markOn(hb, hx, yF + back + hr.plateFromFront, z0 + y + sg * hr.plateSpacing / 2, 'lanksto'); }); });
          pd.warnings.push('lankstų puodelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu');
          if (inset) pd.warnings.push('įleistos durys: reikia įleistų durų lankstų; plokštelės žymės ' + num(hr.plateFromFront + fT) + ' mm nuo priekio — NEPATIKRINTA');
        }
        pd.hingeLeft = cargoF ? undefined : hl; pd.sec = fi; pd.boxFront = true; if (cargoF) { pd.cargo = true; pd.drawer = true; pd.note += '; cargo fasadas — tvirtinamas prie cargo rėmo (be gręžimo)'; } out.push(pd);
        vDoors.push({ w:dw, h:FH, x:dx, z:z0, hingeLeft:cargoF ? undefined : hl, hinged:hinged && fits && !!hb, ys:ys, col:col, sec:fi, hx:hx, inset:inset, cargo:cargoF });
        if (cargoF) hw.push({ item:String(hinge).toUpperCase() + ' W=' + Math.round(cx[1] - cx[0] + 2 * t), qty:1, unit:'kompl.' });
        else if (hinged) hw.push({ item:hinge, qty:nH || hingesPerDoor(FH), unit:'vnt.' });
      }
    }
  });
  if (unverF.length) warnOnce('naujos jungtys, dar nepatikrintos su SWOOD modeliu: ' + unverF.map(function (h) { return h + ' (dėžė ir skylės)'; }).join(', ') + ' — patikrinkite pirmą gaminį');
  /* GTV / DTC ball box: sides, sub-front and back with confirmats through the sides, HDF bottom, 12.7 mm clear each side */
  function ballBoxParts(ctx, rail, nb) {
    var bb = R.ball, bt = +bb.boxT > 0 ? +bb.boxT : t, cl = +bb.clear, bx0 = ctx.x0 + cl, BW = ctx.x1 - ctx.x0 - 2 * cl, BD = rail, zB = ctx.axis - +bb.boxBelow, HB = Math.floor(ctx.top - zB);
    if (BD > ctx.room - 2 + 0.01) return null;
    if (HB < 60 || BW - 2 * bt < 80) { warnOnce(ctx.lbl + ': fasadas per žemas arba anga per siaura stalčiaus dėžei — dėžė nepridėta'); return null; }
    var res = [], base2 = 'STALC' + nb + '_', conf = HB >= 200 ? [32, HB / 2, HB - 32] : HB >= 100 ? [32, HB - 32] : [HB / 2], marks = runnerMarks(R.runner['GTV KULKINIAI H45'], rail), mz = ctx.axis - zB;
    [false, true].forEach(function (right) {
      var p = panel(nm(base2 + (right ? 'SONAS_D' : 'SONAS_K')), 'STALC_SONAS', BD, HB, bt, ctx.lbl + ', vidinė pusė viršuje, priekis X=0, apačia Y=0');
      [bt / 2, BD - bt / 2].forEach(function (u) { conf.forEach(function (v) { hole(p, 'A', u, v, cf.d, 0, { through:true }); }); });
      if (bb.drawerMarks !== false) marks.forEach(function (u) { if (u < BD - 5) hole(p, 'B', u, mz, R.legs.markD, R.legs.markDepth, { mark:true }); });
      place(p, right ? [bx0 + BW - bt, ctx.y0, zB] : [bx0 + bt, ctx.y0, zB], Y, Z, right ? neg(X) : X); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = ctx.pname; res.push(p);
    });
    [['PRIEKIS', 'STALC_PRIEKIS', bt, Y], ['GALAS', 'STALC_GALAS', BD - bt, neg(Y)]].forEach(function (q) {
      var p = panel(nm(base2 + q[0]), q[1], BW - 2 * bt, HB, bt, ctx.lbl + ', vidinė pusė viršuje, apačia Y=0');
      conf.forEach(function (v) { edge(p, 'x0', v, cf.pilot.d, cf.pilot.depth); edge(p, 'x1', v, cf.pilot.d, cf.pilot.depth); });
      place(p, [bx0 + bt, ctx.y0 + q[2], zB], X, Z, q[3]); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = ctx.pname; res.push(p);
    });
    var pb = panel(nm(base2 + 'DUGNAS'), 'STALC_DUGNAS', BW, BD, +R.hdf.t || 3, ctx.lbl + ', kalamas iš apačios');
    place(pb, [bx0, ctx.y0, zB], X, Y, Z); pb.mat = R.hdf.mat || 'HDF 3 mm'; pb.drawerOf = ctx.pname; res.push(pb);
    return res;
  }
  /* DTC undermount box: as on the cabinets (inside width = opening − deduction, length = runner − 10, bottom set in 13 mm) */
  function underBoxParts(ctx, rail, nb) {
    var ub = R.under, bt = +ub.boxT > 0 ? +ub.boxT : t, LW = ctx.x1 - ctx.x0, SKW = LW - underDeduct(bt), OW = SKW + 2 * bt, bx0 = ctx.x0 + (LW - OW) / 2, BD = rail - +ub.shorter;
    var zB = ctx.axis - +ub.up + +ub.clearBelow, rc = +ub.recess, HB = Math.floor(ctx.top - zB), backH = HB - rc - bt;
    if (rail + +ub.depthPlus > ctx.room + 0.01) { warnOnce(ctx.lbl + ': bėgeliui ' + rail + ' mm reikia ' + num(rail + +ub.depthPlus) + ' mm gylio, yra ' + num(ctx.room) + ' — rinkitės trumpesnį'); return null; }
    if (backH < 50 || SKW < 100) { warnOnce(ctx.lbl + ': fasadas per žemas arba anga per siaura stalčiaus dėžei — dėžė nepridėta'); return null; }
    var res = [], base2 = 'STALC' + nb + '_', y0 = ctx.y0;
    var rows = function (h0) { return h0 >= 200 ? [32, h0 / 2, h0 - 32] : h0 >= 100 ? [32, h0 - 32] : [h0 / 2]; };
    var confF = rows(HB).map(function (v) { return Math.max(v, rc + bt + 16); }).filter(function (v, i, a) { return a.indexOf(v) === i && v <= HB - 16; });
    var confB = rows(backH).map(function (v) { return rc + bt + v; }), bz = rc + bt / 2, BDb = BD - bt;
    var alongB = BDb >= 350 ? [50, BDb / 2, BDb - 50] : [Math.min(50, BDb / 4), BDb - Math.min(50, BDb / 4)], acrossB = SKW >= 350 ? [50, SKW / 2, SKW - 50] : [Math.min(50, SKW / 4), SKW - Math.min(50, SKW / 4)];
    [false, true].forEach(function (right) {
      var p = panel(nm(base2 + (right ? 'SONAS_D' : 'SONAS_K')), 'STALC_SONAS', BD, HB, bt, ctx.lbl + ', vidinė pusė viršuje, priekis X=0, apačia Y=0; dugnas ' + num(rc) + ' mm nuo apačios');
      confF.forEach(function (v) { hole(p, 'A', bt / 2, v, cf.d, 0, { through:true }); });
      confB.forEach(function (v) { hole(p, 'A', BD - bt / 2, v, cf.d, 0, { through:true }); });
      alongB.forEach(function (u) { hole(p, 'A', bt + u, bz, cf.d, 0, { through:true }); });
      place(p, right ? [bx0 + OW - bt, y0, zB] : [bx0 + bt, y0, zB], Y, Z, right ? neg(X) : X); p.mat = mCarc; p.eb.y1 = eCarc; p.drawerOf = ctx.pname; res.push(p);
    });
    var pf = panel(nm(base2 + 'PRIEKIS'), 'STALC_PRIEKIS', SKW, HB, bt, ctx.lbl + ', vidinė pusė viršuje, apačia Y=0');
    confF.forEach(function (v) { edge(pf, 'x0', v, cf.pilot.d, cf.pilot.depth); edge(pf, 'x1', v, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { hole(pf, 'A', x, bz, cf.d, 0, { through:true }); });
    place(pf, [bx0 + bt, y0 + bt, zB], X, Z, Y); pf.mat = mCarc; pf.eb.y1 = eCarc; pf.drawerOf = ctx.pname; res.push(pf);
    var pg = panel(nm(base2 + 'GALAS'), 'STALC_GALAS', SKW, backH, bt, ctx.lbl + ', stovi ant dugno, apačia Y=0');
    confB.forEach(function (v) { edge(pg, 'x0', v - rc - bt, cf.pilot.d, cf.pilot.depth); edge(pg, 'x1', v - rc - bt, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { edge(pg, 'y0', x, cf.pilot.d, cf.pilot.depth); });
    place(pg, [bx0 + bt, y0 + BD - bt, zB + rc + bt], X, Z, neg(Y)); pg.mat = mCarc; pg.eb.y1 = eCarc; pg.drawerOf = ctx.pname; res.push(pg);
    var pb = panel(nm(base2 + 'DUGNAS'), 'STALC_DUGNAS', SKW, BDb, bt, ctx.lbl + ', įleistas ' + num(rc) + ' mm, vidinė pusė viršuje, priekis Y=0');
    alongB.forEach(function (u) { edge(pb, 'x0', u, cf.pilot.d, cf.pilot.depth); edge(pb, 'x1', u, cf.pilot.d, cf.pilot.depth); });
    acrossB.forEach(function (x) { edge(pb, 'y0', x, cf.pilot.d, cf.pilot.depth); hole(pb, 'A', x, BDb - bt / 2, cf.d, 0, { through:true }); });
    place(pb, [bx0 + bt, y0 + bt, zB + rc + bt], X, Y, Z); pb.mat = mCarc; pb.drawerOf = ctx.pname; res.push(pb);
    return res;
  }

  var frontParts = out.splice(0, out.length);
  boards.forEach(function (bd) { out.push(bd.p); });
  frontParts.forEach(function (p) { out.push(p); });
  out.forEach(orient);
  out.forEach(rightHanded);
  /* position note for the machine programs: which face is up, where the part's edges are */
  boards.forEach(function (bd) {
    var p = bd.p, q = p.place, ax = function (v) { var i = Math.abs(v[0]) > 0.5 ? 0 : Math.abs(v[1]) > 0.5 ? 1 : 2; return DIR_LT[i + (v[i] < 0 ? '+' : '-')]; };
    p.note = (bd.outer ? 'vidinė pusė' : bd.kind === 'shelf' ? 'viršus' : 'dešinė pusė') + ' viršuje, Y=0 — ' + ax(q.v) + ' kraštas, X=0 — ' + ax(q.u) + ' kraštas';
  });
  var ebEdit = c.ebEdit || {};
  out.forEach(function (p) {
    p.key = p.name.slice(base.length + 1);
    var ov = ebEdit[p.key]; if (!ov) return;
    applyEbEdit(p, ov, eCarc, eFac);
  });
  out.forEach(function (p) { p.cab = idx + 1; p.short = (idx + 1) + '-' + (p.drawerOf ? p.name.slice(base.length + 1).replace(/_/g, '-') : p.role.replace(/_/g, '-') + (/\d$/.test(p.name) ? p.name.match(/\d+$/)[0] : '')); });
  if (nJ) warnOnce('3D konstrukcija: jungtys gręžiamos pagal spintelių taisykles, bet šis surinkimas naujas — patikrinkite pirmą gaminį');
  hardwareFromHoles(out, o, hw);
  /* for the 3-D editor: every board's box, the absent outer boards as ghosts, the corners */
  var ghosts = BOX_IDS.filter(function (id) { return !B[id]; }).map(function (id) { var df = BOX_DEF[id], ext = [[0, W], [0, D], [0, H]]; ext[df.ax] = df.hi ? [S3[df.ax] - t, S3[df.ax]] : [0, t]; return { id:id, ext:ext, lt:df.lt }; });
  return { panels:out, warnings:warn, hardware:mergeHw(hw), legs:[], joints:jointsInfo, seams:seams, visual:{ doors:vDoors, drawers:vDrawers, plinth:null, hb:0 }, dims:{ W:W, H:H, D:D, t:t },
           box:{ openings:openings, boards:boards.map(function (bd) { return { id:bd.id, name:bd.p.name, short:bd.p.short, role:bd.role, kind:bd.kind || 'outer', ext:bd.ext, T:bd.T, ins:bd.ins || 0, lt:bd.lt, adj:!!bd.adj, col:bd.col, inner:bd.inner ? bd.inner.id : null }; }),
                 ghosts:ghosts, covers:covers, cavity:cav, comps:comp } };
}
function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

/* fixings counted from the drillings themselves */
/* how high the cabinet stands above the floor on its legs / feet */
function legHeight(c) { var o = c.cnc || {}; if (c.dishwasher) return +c.legH || 100; return o.legs ? (o.feet ? R.feet.h : (+c.legH || 100)) : 0; }
function hardwareFromHoles(panels, o, hw) {
  var cams = 0, dowels = 0, conf = 0;
  panels.forEach(function (p) {
    p.holes.forEach(function (h) { if (h.d === 15 && !h.mark) cams++; if (h.through && h.d === 8) conf++; });
    p.edges.forEach(function (e) { if (e.d === 8 && e.depth === R.cam.dowel.depthEdge) dowels++; });
  });
  if (cams) { hw.push({ item:'Ekscentrikai (Minifix 15)', qty:cams, unit:'vnt.' }); hw.push({ item:'Ekscentrikų varžtai', qty:cams, unit:'vnt.' }); }
  if (dowels) hw.push({ item:'Kaiščiai 8×30', qty:dowels, unit:'vnt.' });
  if (conf) hw.push({ item:'Konfirmatai 7×50', qty:conf, unit:'vnt.' });
}
function mergeHw(list) {
  var m = {}, order = [];
  list.forEach(function (h) { if (!m[h.item]) { m[h.item] = Object.assign({}, h); order.push(h.item); } else m[h.item].qty += h.qty; });
  return order.map(function (k) { return m[k]; });
}

/* ----------------------------------------------------------------- XXL writer */
var num = function (v) { v = Math.round(v*1e6)/1e6; return Number.isInteger(v) ? String(v) : String(v).replace(/0+$/, ''); };
var LT = { 'ą':'a','č':'c','ę':'e','ė':'e','į':'i','š':'s','ų':'u','ū':'u','ž':'z','Ą':'A','Č':'C','Ę':'E','Ė':'E','Į':'I','Š':'S','Ų':'U','Ū':'U','Ž':'Z','—':'-','–':'-','×':'x','„':'"','“':'"','°':' deg' };
var CYR = { 'а':'a','б':'b','в':'v','г':'g','ґ':'g','д':'d','е':'e','ё':'e','є':'ye','ж':'zh','з':'z','и':'i','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya' };
function ascii(s) { return String(s).replace(/[^\x00-\x7F]/g, function (ch) {   // Lithuanian and other accented letters, Cyrillic → plain letters; the rest → '?'
  if (LT[ch] !== undefined) return LT[ch];
  var lo = ch.toLowerCase(); if (CYR[lo] !== undefined) { var r = CYR[lo]; return ch !== lo && r ? r.charAt(0).toUpperCase() + r.slice(1) : r; }
  var d = ch.normalize ? ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''; if (d && /^[\x00-\x7F]+$/.test(d)) return d;
  return { 'ß':'ss', 'ø':'o', 'Ø':'O', 'ł':'l', 'Ł':'L', 'æ':'ae', 'Æ':'AE', 'œ':'oe' }[ch] || '?'; }); }

/* routing moves as step2xxl / XXL Fix make them: rapid above the start, down to the surface, down along the path over
   ≤ 30 mm to full depth, back to the start at full depth, the path, lift. A groove ≤ cutter + 0.5 mm wide is one pass along
   its wall nearer the middle of the part; wider ones are covered by parallel passes. Open ends start / stop leadIn + r outside. */
function routeMoves(start, segs, depth, name) {
  var C0 = R.rout, z = -depth, mv = [], poly = [[start[0], start[1]]];
  segs.forEach(function (sg) { poly.push([sg.x, sg.y]); });
  mv.push({ t:'G0', x:start[0], y:start[1], z:C0.safeZ });
  mv.push({ t:'L', x:start[0], y:start[1], z:0, v:C0.feedPlunge });
  var ramp = [], acc = 0;
  for (var i = 1; i < poly.length && acc < C0.ramp - 1e-9; i++) {
    var a = poly[i - 1], b = poly[i], Lg = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Lg < 1e-9) continue;
    if (acc + Lg >= C0.ramp) { var f = (C0.ramp - acc) / Lg; ramp.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); acc = C0.ramp; }
    else { ramp.push(b); acc += Lg; }
  }
  var run = 0, prev = start;
  ramp.forEach(function (q) { run += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; mv.push({ t:'L', x:q[0], y:q[1], z:z * run / acc, v:C0.feedPlunge }); });
  for (var k = ramp.length - 2; k >= 0; k--) mv.push({ t:'L', x:ramp[k][0], y:ramp[k][1], z:z, v:C0.feedCut });
  mv.push({ t:'L', x:start[0], y:start[1], z:z, v:C0.feedCut });
  var cur = start; segs.forEach(function (sg) { mv.push({ t:'L', x:sg.x, y:sg.y, z:z, v:C0.feedCut }); cur = [sg.x, sg.y]; });
  mv.push({ t:'L', x:cur[0], y:cur[1], z:C0.safeZ, v:C0.feedCut });
  return { name:name, moves:mv };
}
function groovePath(g, DX, DY, depth, name) {   // g in program coordinates: x0..x1 along X or Y (the longer side), y0..y1 across
  var C0 = R.rout, r = C0.dia / 2, lead = C0.leadIn + r, alongX = (g.x1 - g.x0) >= (g.y1 - g.y0);
  var a0 = alongX ? g.x0 : g.y0, a1 = alongX ? g.x1 : g.y1, c0 = alongX ? g.y0 : g.x0, c1 = alongX ? g.y1 : g.x1, along = alongX ? DX : DY, across = alongX ? DY : DX;
  var Wd = c1 - c0, centres;
  if (Wd <= C0.dia + 0.5 + 1e-9) { var mid = across / 2; centres = [Math.abs(c1 - mid) < Math.abs(c0 - mid) ? c1 - r : c0 + r]; }
  else { var n = Math.ceil((Wd - C0.dia) / (C0.dia * 0.8)) + 1; centres = []; for (var k = 0; k < n; k++) centres.push(c0 + r + (Wd - C0.dia) * k / (n - 1)); }
  var open0 = a0 <= 1e-6, open1 = a1 >= along - 1e-6, s0 = open0 ? -lead : a0 + r, s1 = open1 ? along + lead : a1 - r;
  var P = function (al, ac) { return alongX ? [al, ac] : [ac, al]; }, mk = function (q) { return { x:q[0], y:q[1] }; };
  var segs = []; centres.forEach(function (c, k) { var from = k % 2 ? s1 : s0, to = k % 2 ? s0 : s1; if (k) segs.push(mk(P(from, c))); segs.push(mk(P(to, c))); });
  return routeMoves(P(s0, centres[0]), segs, depth, name);
}
function programs(p) {
  var DX = p.L, DY = p.W, DZ = p.T; var w = [], M = R.machine, GR = p.grooves || [];
  var cnt = function (f) { return p.holes.filter(function (h) { return h.face === f && !h.through; }).length + GR.filter(function (g) { return g.face === f; }).length; };
  var up1 = cnt('B') > cnt('A') ? 'B' : 'A', up2 = up1 === 'A' ? 'B' : 'A';
  var need2 = cnt(up2) > 0;
  var mach = function (h, up) { return { x:h.x, y:(up === 'A') ? h.y : DY - h.y }; };   // all holes are given as seen from face A; B up mirrors Y
  var isLong = function (e) { return e.edge === 'y0' || e.edge === 'y1'; };
  var rotE = p.edges.filter(function (e) { return isLong(e) && R.drills.yEdges.indexOf(e.d) < 0; });   // long-edge bores the front/back spindles cannot drill
  var bores = function (up) {
    var out = [];
    p.holes.forEach(function (h) {
      var isUp = h.face === up;
      if (!(h.through && up === up1) && !isUp) return;
      var m = mach(h, up);
      if (!(h.x >= -0.01 && h.x <= DX + 0.01 && h.y >= -0.01 && h.y <= DY + 0.01)) { w.push(p.name + ': ø' + h.d + ' skylė už detalės ribų (' + num(h.x) + ', ' + num(h.y) + ') — praleista'); return; }
      if (R.drills.top.indexOf(h.d) < 0) { w.push(p.name + ': ø' + h.d + ' skylė (' + num(m.x) + ',' + num(m.y) + ') — tokio grąžto galvoje nėra, NEPROGRAMUOTA'); return; }
      if (h.through && R.drills.through.indexOf(h.d) < 0) w.push(p.name + ': kiaurai ø' + h.d + ' — kiauro grąžto nėra');
      if (h.mark) { out.push({ F:1, X:m.x, Y:m.y, Z:-R.post.markDepth, D:R.post.markD, N:'L', sx:m.x }); return; }   // a marking: always as the post makes it
      out.push({ F:1, X:m.x, Y:m.y, Z:h.through ? -(DZ + R.through_extra) : -h.depth, D:h.d, N:h.through ? 'L' : 'P', sx:m.x });
    });
    if (up === up1) p.edges.forEach(function (e) {
      if (rotE.indexOf(e) >= 0) return;                     // → turned program
      if (!(e.pos >= -0.01 && e.pos <= (e.edge[0] === 'x' ? DY : DX) + 0.01)) { w.push(p.name + ': ø' + e.d + ' krašto skylė už detalės ribų (' + e.edge + ', ' + num(e.pos) + ') — praleista'); return; }
      var F, Xp, Yp, sx;
      var yUp = function (y) { return (up === 'A') ? y : DY - y; };
      if (e.edge === 'x0') { F = 3; Xp = DZ/2; Yp = yUp(e.pos); sx = e.depth; }
      else if (e.edge === 'x1') { F = 2; Xp = DZ/2; Yp = yUp(e.pos); sx = DX - e.depth; }
      else { F = ((e.edge === 'y0') === (up === 'A')) ? 4 : 5; Xp = e.pos; Yp = DZ/2; sx = e.pos; }
      var ok = (F === 2 || F === 3) ? R.drills.xEnds.indexOf(e.d) >= 0 : R.drills.yEdges.indexOf(e.d) >= 0;
      if (!ok) { w.push(p.name + ': ø' + e.d + ' krašto skylė (' + e.edge + ', ' + num(e.pos) + ') — šiam kraštui grąžto nėra, NEPROGRAMUOTA'); return; }
      out.push({ F:F, X:Xp, Y:Yp, Z:-Math.min(e.depth, R.post.edgeMaxZ), D:e.d, N:'P', sx:sx });   // horizontal bores stop at the post's maximum
    });
    var g = function (b) { return b.F === 3 ? -1 : b.F === 2 ? DX + 1 : b.X; };   // post order: left end, top face by X, right end
    out.sort(function (a, b) { return (g(a) - g(b)) || (a.Y - b.Y) || (a.X - b.X); });
    return out;
  };
  /* turned program (as step2xxl): same face up as 1OP, panel turned 90° counter-clockwise seen from above —
     the front edge (machine Y=0 in 1OP) becomes the left end X=0, the back edge the right end; new Y = DX − x */
  var rotBores = function () {
    var out = [];
    rotE.forEach(function (e) {
      var front = (e.edge === 'y0') === (up1 === 'A');
      if (R.drills.xEnds.indexOf(e.d) < 0) { w.push(p.name + ': ø' + e.d + ' krašto skylė — grąžto nėra, NEPROGRAMUOTA'); return; }
      out.push({ F:front ? 3 : 2, X:DZ/2, Y:DX - e.pos, Z:-Math.min(e.depth, R.post.edgeMaxZ), D:e.d, N:'P', sx:front ? e.depth : DY - e.depth });
    });
    out.sort(function (a, b) { return (a.sx - b.sx) || (a.Y - b.Y); });
    return out;
  };
  var routes = function (up) {   // grooves on the face that is up, in this program's coordinates (B up: Y mirrored)
    return GR.filter(function (g) { return g.face === up; }).map(function (g) {
      var y0 = up === 'A' ? g.y0 : DY - g.y1, y1 = up === 'A' ? g.y1 : DY - g.y0, dep = Math.min(g.depth, DZ - R.rout.skin);
      return groovePath({ x0:g.x0, x1:g.x1, y0:y0, y1:y1 }, DX, DY, dep, g.name || 'GROOVE');
    });
  };
  var faceTxt = function (up) { return up === 'A' ? '' : ' -- THIS PROGRAM DRILLS THE OTHER FACE: panel turned over about X (long edge stays, Y mirrored)'; };
  var text = function (bl, op, kind, up, rts) {
    var dx = kind === 'rot' ? DY : DX, dy = kind === 'rot' ? DX : DY;
    var L = ['H DX=' + num(dx) + ' DY=' + num(dy) + ' DZ=' + num(DZ) + ' BX=0 BY=0 BZ=21 -EH T=0 *MM /"DEF" R=1 V=0',
      '; Machine Type:  ZapPZmN', ';Ensemble : ', ';Piece : ', ';Ref : ', ';Fichier : ' + p.name + '_' + op + 'OP', ';** Date codage : db-kurejas'];
    if (kind === 'flip' && op === 2) L.push('; 2OP: panel turned over about the X axis after 1OP (long edge stays in place, Y is mirrored)');
    if (kind === 'rot') L.push('; ' + op + 'OP: ' + (op > 1 ? 'same face up as 1OP, ' : '') + 'panel ROTATED 90 deg counter-clockwise - the front edge (Y=0 of the POSITION below) becomes the left end (X=0), long side along Y');
    if (p.note) L.push('; POSITION (1OP): ' + p.note + (kind === 'rot' ? '' : faceTxt(up)));
    if (bl.length) { L.push('; ------ BP_SCM_DRILLING_BLOCK'); bl.forEach(function (b) { L.push(' XBO X=' + num(b.X) + ' Y=' + num(b.Y) + ' Z=' + num(b.Z) + ' D=' + num(b.D) + ' N="' + b.N + '" F=' + b.F + ' R=1#'); }); }
    if (rts && rts.length) { var C0 = R.rout; L.push('; ------ ' + C0.name);
      rts.forEach(function (rt) { L.push('; ***** ' + rt.name);
        rt.moves.forEach(function (m) {
          if (m.t === 'G0') L.push(' XG0 X=' + num(m.x) + ' Y=' + num(m.y) + ' Z=' + num(m.z) + ' T=' + C0.T + ' C=0 V=' + C0.feedPlunge + ' D=' + C0.D + ' F=1');
          else L.push(' XL2P X=' + num(m.x) + ' Y=' + num(m.y) + ' Z=' + num(m.z) + ' V=' + m.v); }); }); }
    L.push(';**********************************************************', '.END', ';**********************************************************', ';FINEPROG');
    return ascii(L.join('\r\n') + '\r\n');
  };
  var res = [], b1 = bores(up1), b2 = need2 ? bores(up2) : [], br = [], r1 = routes(up1), r2 = need2 ? routes(up2) : [];
  if (rotE.length) {
    if (DX > M.maxY + 1e-6) w.push(p.name + ': ' + rotE.length + ' ø' + rotE[0].d + ' skylės ilgame krašte — pasukti 90° negalima (ilgis ' + num(DX) + ' > ' + M.maxY + ' mm), NEPROGRAMUOTA');
    else { br = rotBores(); if (br.length && DY < M.minX) w.push(p.name + ': pasuktoje programoje X ilgis tik ' + num(DY) + ' mm (staklių min. ' + M.minX + ') — patikrinkite prispaudimą'); }
  }
  var tooBig = false;
  if (b1.length || b2.length || br.length || r1.length || r2.length) {
    if (DY > M.maxY + 1e-6) { tooBig = true; w.push(p.name + ': plotis ' + num(DY) + ' mm > ' + M.maxY + ' — netelpa į stakles, NEPROGRAMUOTA'); }
    if (DX > M.maxX + 1e-6) { tooBig = true; w.push(p.name + ': ilgis ' + num(DX) + ' mm > ' + M.maxX + ' — netelpa į stakles, NEPROGRAMUOTA'); }
  }
  if (tooBig) { b1 = []; b2 = []; br = []; r1 = []; r2 = []; }   // a part the machine cannot hold gets no program (drill it by hand)
  var n = 0, add = function (bl, kind, up, rts) { n++; res.push({ file:p.name + '_' + n + 'OP.XXL', id:p.name + '_' + n + 'OP', text:text(bl, n, kind, up, rts), n:bl.length + (rts ? rts.length : 0), up:up, kind:kind }); };
  if (b1.length || r1.length) add(b1, 'main', up1, r1);
  if (b2.length || r2.length) add(b2, 'flip', up2, r2);
  if (br.length) add(br, 'rot', up1);
  return { files:res, warnings:w.concat(p.warnings) };
}

/* worktop (stalviršis) chosen for one cabinet: on the carcass top, past the fronts by "over", past the sides by "left" / "right".
   In cabinet coordinates (x from the left side, y from the carcass front — fronts at y < 0 — z from the carcass bottom). Not machined: a part to cut. */
var WT_DEF = { T:38, over:20, left:0, right:0 };
function worktopOf(c) {
  var w = c && c.worktop; if (!w || !w.on) return null;
  var W = c.dishwasher ? (+c.dishWidth || 600) : +c.W, H = +c.H, D = +c.D; if (!(W > 0 && H > 0 && D > 0)) return null;
  var val = function (k) { var v = w[k]; return v === '' || v == null || !isFinite(+v) ? WT_DEF[k] : +v; };
  var T = val('T') > 0 ? val('T') : WT_DEF.T, over = val('over'), left = Math.max(0, val('left')), right = Math.max(0, val('right'));
  var fT = c.kind === 'box' && !((c.box && c.box.fronts) || []).some(function (f) { return f && !f.inset; }) ? 0 : (+(c.cnc && c.cnc.facadeT) || 18);   // a 3D construction: fronts only when it has overlay ones
  return { mat:String(w.mat || ''), edge:String(w.edge || ''), T:T, over:over, left:left, right:right, L:W + left + right, W:Math.max(1, D + fT + over),
           x0:-left, x1:W + right, y0:Math.min(D - 1, -(fT + over)), y1:D, z0:H, z1:H + T };
}
/* side panels (šoninės plokštės): extra parts (c.extras, kind 'side') set against the cabinet's left or right side. Only cut, like
   every extra part; placed for the room, the 3-D views and the drawings. L = height, W = depth, T = thickness, zb = bottom from
   the carcass bottom (below 0: down past the legs / to the floor), yf = how far its front stands before the carcass front.
   Two on one side stand one outside the other. → [{ side, x0, x1 (cabinet x), y0, y1, z0, z1, T, H, D, mat, x (the extra) }] */
function sidePanels(c) {
  var nv = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
  var W = c && c.dishwasher ? (+c.dishWidth || 600) : (+(c && c.W) || 0), out = [], at = { L:0, R:0 };
  var fT = c && c.kind === 'box' && !((c.box && c.box.fronts) || []).some(function (f) { return f && !f.inset; }) ? 0 : (+(c && c.cnc && c.cnc.facadeT) || 18);
  ((c && c.extras) || []).forEach(function (x) {
    if (!x || x.kind !== 'side' || (x.side !== 'L' && x.side !== 'R')) return;
    var H = nv(x.L), D = nv(x.W), T = nv(x.T) || +c.thick || 18; if (!(H > 0 && D > 0 && T > 0)) return;
    if (x.qty !== '' && x.qty != null && !(nv(x.qty) > 0)) return;   // quantity 0: not made, not shown
    var zb = nv(x.zb) || 0, yf = nv(x.yf); if (yf == null) yf = fT;
    var a = at[x.side]; at[x.side] += T;
    out.push({ side:x.side, x0:x.side === 'L' ? -a - T : W + a, x1:x.side === 'L' ? -a : W + a + T, y0:-yf, y1:-yf + D, z0:zb, z1:zb + H, T:T, H:H, D:D, mat:String(x.mat || (c.mat && c.mat.facade) || ''), x:x });
  });
  return out;
}
function sideWidths(c) { var o = { L:0, R:0 }; sidePanels(c).forEach(function (p) { o[p.side] += p.T; }); return o; }
var api = { R:R, shelfSetSb:shelfSetSb, DRAWER_HW:DRAWER_HW, DOOR_HW:DOOR_HW, CARGO_HW:CARGO_HW, cargoOf:cargoOf, newCabinet:newCabinet, newSection:newSection, cncDefaults:cncDefaults,
            buildCabinet:function (c, idx, pn) { var r = buildCabinet(c, idx, pn); r.worktop = worktopOf(c);
              var bad = r.panels.filter(function (p) { return !(p.L >= 1 && p.W >= 1 && p.T > 0 && isFinite(p.L + p.W + p.T)); });   // a part with no size (dimensions too small for the layout) is left out
              if (bad.length) { r.panels = r.panels.filter(function (p) { return bad.indexOf(p) < 0; }); r.warnings.push(bad.map(function (p) { return p.short || p.role; }).join(', ') + ': per maži matmenys (' + bad.map(function (p) { return num(Math.round(p.L)) + '×' + num(Math.round(p.W)); }).join(', ') + ') — detalės nepridėtos, padidinkite spintelę'); }
              return r; }, worktopOf:worktopOf, sidePanels:sidePanels, sideWidths:sideWidths, WT_DEF:WT_DEF, programs:programs, num:num, ascii:ascii, safeName:safeName, hingesPerDoor:hingesPerDoor,
            hingeYs:hingeYs, hingesFit:hingesFit, setRules:setRules, splitFronts:splitFronts, pairedDowels:pairedDowels, legHeight:legHeight,
            buildBox:buildBox, underDeduct:underDeduct, boxDefaults:boxDefaults, BOX_IDS:BOX_IDS, BOX_DEF:BOX_DEF, boxPair:boxPair, boxCoverDefault:boxCoverDefault };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DBEngine = api;
})(typeof window !== 'undefined' ? window : this);

