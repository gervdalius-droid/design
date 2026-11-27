#!/usr/bin/env python3
"""Build the new Spintelių kūrėjas (builder2) into one self-contained index.html.

    python3 build.py            → index.html
    python3 build.py --check    → also loads it in headless Chrome and fails on page errors
    python3 build.py --out scratch/x/plain.html --plain-engine
                                → without the corrections to the live engine (PATCHES 'engine'): what the live app drills
    python3 build.py --out scratch/x/index.html --ui 30-editor,31-topics
                                → a private build: only the shared files (src/ui/0*, 10-checks, 99-*) plus the
                                  named ones — so work in progress in the other src/ui files cannot break it

How the page is put together (see docs/ARCHITECTURE.md):

  src/lib/*.js          the live app's modules, UNCHANGED (engine, export, report, room, drawings …)
  src/lib/app.js        the live app's own UI script, UNCHANGED — one closure. It is cut in two at its boot line
                        (document.documentElement.lang = …; render();) and everything in src/ui/*.js is placed
                        between the halves, INSIDE that closure. A function declared again in src/ui/ replaces the
                        live one (the later declaration wins), so the new interface overrides render(), the views
                        and the live refresh while every command, rule and export of the live app keeps working.
  src/lib/legacy_*.css  the live app's styles (still needed by the embedded widgets), then src/ui/*.css on top.

Bringing in a newer live app = replacing src/lib/ (tools/sync_legacy.py) and building again; this script lists the
live functions the new interface overrides so they can be compared after such an update.
"""
import os, re, sys, glob, hashlib

R = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()

LIB = ['engine', 'export', 'zip', 'sketch', 'look', 'realistic', 'front', 'photos', 'art', 'fittings',
       'assembly', 'iso', 'room', 'drawings', 'report_tpl', 'report']
BOOT = "document.documentElement.lang = S.lang;\nrender();"

# Fixes to the live modules, applied at build time (src/lib stays the untouched live code). Each must match exactly once —
# when the live app fixes it itself the build stops here and the patch can be dropped.
PATCHES = [
    # 3-D view: a confirmat's head was always drawn on face B of the drilled part. An outside back (on the rear edges)
    # has face A outwards, so its screws were shown inside the cabinet, as if they came through the sides.
    # Picture only — holes and programs are not touched.
    ('assembly',
     "const faceName=confirmat?(h.face==='B'?'A':'B'):(h.face||'A'),",
     "const nvAx=[0,1,2].reduce((m,i)=>Math.abs(pl.n[i])>Math.abs(pl.n[m])?i:m,0),nvSg=pl.n[nvAx]>0?1:-1,nvA=pl.o[nvAx],nvAll=(r.panels||[]).filter(q=>q.place&&!q.drawerOf&&q.role!=='FASADAS'&&q.role!=='DURYS').reduce((acc,q)=>{[0,q.L].forEach(a=>[0,q.W].forEach(b=>[0,q.T].forEach(d=>acc.push(q.place.o[nvAx]+a*q.place.u[nvAx]+b*q.place.v[nvAx]-d*q.place.n[nvAx]))));return acc;},[]),nvOut=nvSg>0?Math.max(...nvAll):Math.min(...nvAll),"
     "faceName=confirmat?(Math.abs(nvA-nvOut)<.5?'A':(h.face==='B'?'A':'B')):(h.face||'A'),"),
    # 3-D view: with the door open the hinge's arm stayed on the side and its cup went with the door, nothing between
    # them — the hinge looked like a loose piece on the side panel. Two links now join arm and cup at any opening.
    ('assembly',
     "if(V.mode==='assembly')meshFaces('hinge',1,mapH,'#c6cdd1',tf,!right);",
     "if(V.mode==='assembly')meshFaces('hinge',1,mapH,'#c6cdd1',tf,!right);"
     "if(V.mode==='assembly'&&angle>.06){const nvA=[right?x+w-20:x+20,34,hz],nvC=tf([cx,7,hz]),nvM=[(nvA[0]+nvC[0])*.5,(nvA[1]+nvC[1])*.5-10,hz];rod(nvA,nvM,5.5,'#9aa4aa');rod(nvM,nvC,6.5,'#c3cbd0');}"),
    # ---- Drawer runners, corrected against Blum's planning sheets (docs/RUNNERS.md has the drawings' numbers and sources).
    # Blum fixes two things to the drawer box's reference line R (the top of the board under the box):
    #   TANDEMBOX: cabinet profile screws R + 33, front fixing R + 47.5 / 79.5      MERIVOBOX: cabinet profile screws R + 54,
    #   front fixing R + 33.5 / 65.5, base underside R + 20.
    # The engine drills every TANDEMBOX front 65.5 / 97.5 above its own bottom edge, i.e. R is 18 mm above a front's bottom edge.
    # (1) For the lowest drawer the profile row was right (18 + 33). For every drawer above it the row was put 33 above the
    #     front's bottom edge — 18 mm too low for the holes in its own front: the front ended up 18 mm low, into the one below.
    ('engine', '"BLUM TANDEMBOX": { marks:[19,28,37,261,293,453], up:33,',
               '"BLUM TANDEMBOX": { marks:[19,28,37,261,293,453], up:33, fa:18,'),
    ('engine', "function runnerUp(rt) {",
               "function runnerFa(rt) { return rt && rt.merivo ? +R.merivo.fa || 0 : rt && +rt.fa || 0; }   /* how far a front's bottom edge hangs below its box's reference line */\nfunction runnerUp(rt) {"),
    ('engine', "var rt = R.runner[r.type], up = runnerUp(rt); var x = Math.max(up, r.fb + up - t);",
               "var rt = R.runner[r.type], up = runnerUp(rt); var x = Math.max(up, r.fb + runnerFa(rt) + up - t);"),
    ('engine', "var rt = R.runner[r.type], up = runnerUp(rt), x = Math.max(up, r.fb + up - t);",
               "var rt = R.runner[r.type], up = runnerUp(rt), x = Math.max(up, r.fb + runnerFa(rt) + up - t);"),
    ('engine', "var up = runnerUp(rt), axis = Math.max(zlo + up, fb + up), mks = runnerMarks(rt, rail);",
               "var up = runnerUp(rt), axis = Math.max(zlo + up, fb + runnerFa(rt) + up), mks = runnerMarks(rt, rail);"),
    # (1b) the same reference for the holes in the lowest front over a cabinet bottom thicker than 18 mm (the box stands on it)
    ('engine', "var fc = rt.facade, mk = o.tbFront === 'mark', dyF = Math.max(0, -f.bottom);",
               "var fc = rt.facade, mk = o.tbFront === 'mark', dyF = Math.max(0, -f.bottom, t - (+rt.fa || 0) - f.bottom);"),
    # (2) MERIVOBOX had TANDEMBOX's 33 (the live app says so itself: "not verified on a MERIVOBOX"). Blum: 54 above the
    #     reference, the base's underside 20 above it (34 under the screws); NL 270–350 has its rear screws at 197 / 229.
    ('engine', "merivo: { up:33, marks:'37, 261, 293', perLen:'', ded:51, shorter:26, boxShorter:10, t:16, below:24,",
               "merivo: { up:54, fa:18, marks:'37, 261, 293', perLen:'270: 37,197,229; 300: 37,197,229; 350: 37,197,229', ded:51, shorter:26, boxShorter:10, t:16, below:34,"),
    ('engine', "axis:Math.max(t + up, f.bottom + up), top:Math.min(f.bottom + f.h - +R.merivo.topGap, innerTop)",
               "axis:Math.max(t + up, f.bottom + (+R.merivo.fa || 0) + up), top:Math.min(f.bottom + f.h - +R.merivo.topGap, innerTop)"),

    # ---- TANDEMBOX as the workshop makes it (Nov 2026): antaro **M sides on every drawer**; a low drawer has Blum's steel
    #      back, a higher one a 16 mm chipboard back (C 167 / D 199) and gallery rails on the M side. The shop cuts the base
    #      (and that back); the live engine listed only the runner set. Cutting sizes from Blum's TANDEMBOX antaro planning
    #      sheets ("Cutting – 16 mm chipboard"): base LW − 75 × NL − 24, chipboard back LW − 87 × back height; the box's base
    #      underside 9 mm above its reference line R (the top of the board under it, docs/RUNNERS.md). Gallery rails per side:
    #      C 1, D 2. All of it in R.tbox (workshop settings can change it); section / front field tbH: auto | M | C | D.
    ('engine', "  facade: { sideGap:3,",
               "  tbox: { backH:{ M:84, C:167, D:199 }, rails:{ C:1, D:2 }, ded:75, backDed:87, shorter:24, baseUp:9, t:16, topGap:10 },   // TANDEMBOX antaro, M sides (above)\n"
               "  facade: { sideGap:3,"),
    ('engine', "function merivoPick(want, ext, room) {",
               "/* TANDEMBOX (M sides always): which back the drawer gets — M: Blum's steel back; C / D: a chipboard back and gallery rails.\n"
               "   room: from the box's reference line R up to where the box must stop; a height fits when back + base offset ≤ room. */\n"
               "function tbPick(want, room) {\n"
               "  var T = R.tbox, fits = function (k) { return +T.backH[k] + +T.baseUp <= room + 0.01; }, auto = ['D', 'C', 'M'].filter(fits)[0] || null;\n"
               "  var code = want && want !== 'auto' && T.backH[want] ? want : auto, note = '';\n"
               "  if (code && !fits(code)) { note = 'TANDEMBOX ' + code + ' (galas ' + T.backH[code] + ' mm) netelpa — ' + (auto ? 'imamas ' + auto : 'per žemas fasadas'); code = auto; }\n"
               "  if (!code) return null;\n"
               "  return { code:code, backH:+T.backH[code], rails:code === 'M' ? 0 : +(T.rails[code] || 1), steel:code === 'M', note:note };\n"
               "}\n"
               "/* TANDEMBOX parts for one drawer: the 16 mm base, and for C / D the chipboard back; ctx as merivoParts (axis = the cabinet profile row) */\n"
               "function tbParts(ctx, warnOnce) {\n"
               "  var T = R.tbox, LW = ctx.x1 - ctx.x0, rail = +ctx.rail || 500, Rz = ctx.axis - +R.runner['BLUM TANDEMBOX'].up, bt = +T.t || 16;\n"
               "  var pk = tbPick(ctx.want, ctx.top - Rz);\n"
               "  if (!pk) { warnOnce(ctx.lbl + ': fasadas per žemas TANDEMBOX dėžei (M ' + T.backH.M + ' mm) — dugnas nepridėtas'); return null; }\n"
               "  if (pk.note) warnOnce(ctx.lbl + ': ' + pk.note);\n"
               "  var BW = LW - +T.ded, BD = rail - +T.shorter, bx0 = ctx.x0 + +T.ded / 2, zs = Rz + +T.baseUp;\n"
               "  if (BW < 100) { warnOnce(ctx.lbl + ': anga per siaura TANDEMBOX dėžei — dugnas nepridėtas'); return null; }\n"
               "  if (!ctx.matOwn && ctx.carcT && Math.abs(ctx.carcT - bt) > 0.3) warnOnce('TANDEMBOX ' + (pk.steel ? 'dugnas pjaunamas' : 'dugnas ir galas pjaunami') + ' iš ' + num(bt) + ' mm plokštės, korpusas ' + num(ctx.carcT) + ' mm — nurodykite stalčių dugno / galo medžiagą (' + num(bt) + ' mm)');\n"
               "  var pb = panel(ctx.name('DUGNAS'), 'STALC_DUGNAS', BW, BD, bt, ctx.lbl + ', TANDEMBOX ' + pk.code + ' dugnas (LW − ' + num(+T.ded) + ', NL − ' + num(+T.shorter) + '), priekis Y=0');\n"
               "  place(pb, [bx0, ctx.y0, zs + bt], X, Y, Z); pb.mat = ctx.mat; pb.drawerOf = ctx.pname;\n"
               "  var parts = [pb], hw = [];\n"
               "  if (pk.steel) hw.push({ item:'BLUM TANDEMBOX plieninis galas M, LW=' + num(LW), qty:1, unit:'vnt.' });\n"
               "  else {\n"
               "    var GW = LW - +T.backDed, gx0 = ctx.x0 + +T.backDed / 2;\n"
               "    var pg = panel(ctx.name('GALAS'), 'STALC_GALAS', GW, pk.backH, bt, ctx.lbl + ', TANDEMBOX ' + pk.code + ' galas (LW − ' + num(+T.backDed) + '), ant dugno, apačia Y=0');\n"
               "    place(pg, [gx0, ctx.y0 + BD, zs + bt], X, Z, neg(Y)); pg.mat = ctx.mat; pg.eb.y1 = ctx.eb; pg.drawerOf = ctx.pname; parts.push(pg);\n"
               "    hw.push({ item:'BLUM TANDEMBOX galerija L=' + rail, qty:2 * pk.rails, unit:'vnt.' });\n"
               "  }\n"
               "  return { parts:parts, pick:pk, hw:hw, box:{ code:pk.code, backH:pk.backH, rails:pk.rails, steel:pk.steel, zs:zs, bx0:bx0, bx1:bx0 + BW, y0:ctx.y0, len:BD } };\n"
               "}\n"
               "function merivoPick(want, ext, room) {"),
    # the drawer sections of a cabinet …
    ('engine', "    f.mv = res.box; U('BLUM MERIVOBOX (dugnas, galas ir bėgelių skylės)');\n  });",
               "    f.mv = res.box; U('BLUM MERIVOBOX (dugnas, galas ir bėgelių skylės)');\n  });\n"
               "  /* ---- Blum TANDEMBOX (M sides): the shop cuts the base, and for a high drawer the chipboard back (tbParts) */\n"
               "  facades.forEach(function (f) {\n"
               "    var rt = R.runner[f.hw]; if (f.hw !== 'BLUM TANDEMBOX' || !rt || o.tbParts === false) return;\n"
               "    var k = f.col || 0, s2 = (c.sections || []).filter(function (q) { return Math.min(cols - 1, Math.max(0, Math.floor(+q.col || 0))) === k; })[f.sec] || {}, rail = +s2.rail || 500;\n"
               "    var lbl2 = 'stalčius ' + (cols > 1 ? (k + 1) + '.' : '') + (f.sec + 1) + '.' + (f.idx + 1), up = +rt.up;\n"
               "    var innerTop = (topFull ? H - t : (rl.front === 'v' ? H - rw : H - t)) - 3, nb = nBox + 1;\n"
               "    var res = tbParts({ x0:ix0(k), x1:ix1(k), y0:0, axis:Math.max(t + up, f.bottom + (+rt.fa || 0) + up), top:Math.min(f.bottom + f.h - +R.tbox.topGap, innerTop), rail:rail,\n"
               "      want:s2.tbH, name:function (q) { return nm('STALC' + nb + '_' + q); }, mat:mDrw, matOwn:!!mat.drawer, carcT:t, eb:eCarc, pname:f.pname, lbl:lbl2 }, warnOnce);\n"
               "    if (!res) return;\n"
               "    nBox++; res.parts.forEach(function (q) { out.push(q); }); res.hw.forEach(function (h) { hw.push(h); });\n"
               "    var fp = out.filter(function (q) { return q.name === f.pname; })[0]; if (fp) fp.tb = res.box; f.tb = res.box;\n"
               "  });"),
    # … and the drawer fronts of a 3-D construction
    ('engine', "          else hw.push({ item:'BLUM MERIVOBOX L=' + rail, qty:1, unit:'kompl.' }); }\n      }",
               "          else hw.push({ item:'BLUM MERIVOBOX L=' + rail, qty:1, unit:'kompl.' }); }\n"
               "        if (hwN === 'BLUM TANDEMBOX' && o.tbParts !== false) { var nbT = nBoxF + 1;\n"
               "          var tres = tbParts(Object.assign({}, ctx, { top:Math.min(fb + hD - +R.tbox.topGap, zhi - 3), rail:rail, want:fr0.tbH, name:function (q) { return nm('STALC' + nbT + '_' + q); }, mat:mDrw, matOwn:!!mat.drawer, carcT:t, eb:eCarc }), warnOnce);\n"
               "          if (tres) { nBoxF++; tres.parts.forEach(function (q) { out.push(q); }); tres.hw.forEach(function (h) { hw.push(h); }); p.tb = f.tb = tres.box; } }\n"
               "      }"),

    # ---- the cabinet sheet (Nov 2026). (1) the parts list sits at the bottom of the left column, the views on top;
    #      (2) "Surinkimo schema" is the 3-D view as it is with "Jungtys" on — the carcass pulled apart with its
    #      connectors, the drawers in their place with their runners — drawn by three.js (src/ui/66-drwsnap.js, given to
    #      the sheets as opts.snap); the part numbers go where each board lands in that picture. Without three.js
    #      (offline) the sheet keeps its own line drawing.
    ('drawings', "  var yT = vb.bottom + 8, rh = Math.max(2.7, Math.min(5, (bottomY - yT - 8) / nRows)), fs = Math.min(2.7, rh * 0.58);",
                 "  var rh = Math.max(2.7, Math.min(4, (bottomY - vb.bottom - 16) / nRows)), yT = Math.max(vb.bottom + 8, bottomY - 2 - rh * nRows), fs = Math.min(2.7, rh * 0.58);   // the list at the bottom of the column"),
    ('drawings', "  var V = viewIso(ISO_D), boxes = cabBoxes(r, { plinth:false, fit:true, c:c }); explode(r, boxes);\n"
                 "  var order = solve(boxes, V), fp = fitPic(order, area[0] + 4, area[2] + 4, area[1] - area[0] - 8, area[3] - area[2] - 8);\n"
                 "  svg += viewTitle(AX, top, L.expl, L.nts);\n"
                 "  var anchors = {};\n"
                 "  svg += drawBoxes(order, fp.m, { lw:0.26, shade:true, after:connectorLines(r, boxes, V, function (q) { return fp.m(q); }, order, anchors) });",
                 "  var SNAP = null; try { SNAP = meta.snap ? meta.snap(c, r, { w:area[1] - area[0] - 30, h:area[3] - area[2] - 8 }) : null; } catch (eS) { SNAP = null; }\n"
                 "  var V = viewIso(ISO_D), boxes = cabBoxes(r, { plinth:false, fit:true, c:c }); explode(r, boxes);\n"
                 "  var order = SNAP ? [] : solve(boxes, V), fp;\n"
                 "  if (SNAP) { var bw0 = area[1] - area[0] - 30, bh0 = area[3] - area[2] - 8, kS = Math.min(bw0 / SNAP.w, bh0 / SNAP.h), ixS = area[0] + (area[1] - area[0] - SNAP.w * kS) / 2, iyS = area[2] + 4 + (bh0 - SNAP.h * kS) / 2;\n"
                 "    fp = { m:function (q) { return [ixS + q[0] * kS, iyS + q[1] * kS]; }, pb:[0, SNAP.w, SNAP.h, 0] }; }   // picture pixels → sheet\n"
                 "  else fp = fitPic(order, area[0] + 4, area[2] + 4, area[1] - area[0] - 8, area[3] - area[2] - 8);\n"
                 "  svg += viewTitle(AX, top, L.expl, L.nts);\n"
                 "  var anchors = {};\n"
                 "  if (SNAP) { var i0 = fp.m([0, 0]); svg += '<image x=\"' + f2(i0[0]) + '\" y=\"' + f2(i0[1]) + '\" width=\"' + f2(SNAP.w * kS) + '\" height=\"' + f2(SNAP.h * kS) + '\" preserveAspectRatio=\"none\" href=\"' + SNAP.url + '\"/>'; }\n"
                 "  else svg += drawBoxes(order, fp.m, { lw:0.26, shade:true, after:connectorLines(r, boxes, V, function (q) { return fp.m(q); }, order, anchors) });"),
    ('drawings', "    if (!g.main) return;   // balloons only on the carcass and the fronts: drawer boxes and fittings are in the lists\n",
                 "    if (!g.main) return;   // balloons only on the carcass and the fronts: drawer boxes and fittings are in the lists\n"
                 "    if (SNAP) { var sp = g.members.map(function (q) { return SNAP.pts[q.name]; }).filter(Boolean)[0]; if (sp && !gotNr[g.nr]) { gotNr[g.nr] = 1; items.push({ a:fp.m(sp), n:g.nr, ps:g.members.map(function (q) { return q.name; }) }); }\n"
                 "      g.members.forEach(function (q) { var pq = SNAP.pts[q.name]; if (pq) { var mq = fp.m(pq); svg += '<g data-p=\"' + esc(q.name) + '\" class=\"ps-pt\"><circle cx=\"' + f2(mq[0]) + '\" cy=\"' + f2(mq[1]) + '\" r=\"0\" fill=\"none\"/></g>'; } });   // where each board is in the picture: the assembly station rings it\n"
                 "      return; }\n"),
    ('drawings', "  var meta = { project:opts.project || proj.name || '', date:opts.date || '', paper:opts.paper || 'A3' };",
                 "  var meta = { project:opts.project || proj.name || '', date:opts.date || '', paper:opts.paper || 'A3', snap:opts.snap || null };"),
    ('app', "paper:pp, only:o === 'all' || o === 'furn' ? null : oi, RM:RM });",
            "paper:pp, only:o === 'all' || o === 'furn' ? null : oi, RM:RM, snap:typeof nvdSnap === 'function' ? nvdSnap : null });"),
    ('app', "  var day = new Date().toISOString().slice(0, 10), key = JSON.stringify([S.proj, S.settings, S.lang, pp, o, oi, day]);",
            "  var day = new Date().toISOString().slice(0, 10), key = JSON.stringify([S.proj, S.settings, S.lang, pp, o, oi, day, typeof nvdReady === 'function' && nvdReady()]);   // the 3-D assembly picture once three.js is there"),

    # ---- admin prices: a TANDEMBOX drawer's base / back are parts now (above) — no second, estimated box on top
    ('app', "if (E.R.runner[f.hw] && (E.R.runner[f.hw].ball || E.R.runner[f.hw].under || (E.R.runner[f.hw].merivo && f.mv))) return;",
            "if (f.tb || (E.R.runner[f.hw] && (E.R.runner[f.hw].ball || E.R.runner[f.hw].under || (E.R.runner[f.hw].merivo && f.mv)))) return;"),
    # ---- routing drawn by hand (Detalių operacijos)
    # (1) a closed outline (cut out, cut round, a pocket's rings) was routed without its last side: the path stopped at
    #     the last corner and lifted, so a rectangle got three sides of four. The loop is closed here.
    #     A shape that reaches past the part was refused when it went more than 20 mm out; now what the cutter does is cut
    #     off at the part (E.nvClip of src/ui/38-route.js: its centre's path ends where the cutter has just left the board),
    #     so a line drawn across runs from edge to edge and a cut-out over an edge becomes a notch.
    #     Each path also carries its operation and the routing options of src/ui/38-route.js.
    ('engine', "loops.forEach(function (lp, k) { p.paths.push({ face:face, name:'ESKIZAS_' + (i + 1) + (loops.length > 1 ? '_' + (k + 1) : ''), pts:lp.map(function (q) { return [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]; }), depth:dep }); });",
               "if (op !== 'on') loops = loops.map(function (lp) { return lp.concat([lp[0]]); });\n"
               "    if (api.nvClip) { var nvC = api.nvClip(loops, p.L, p.W, C0, op, o.pts, s.t); loops = nvC.loops; if (!loops.length) { if (s.through) nThr--; warn.push(tag + (nvC.why === 'small' ? 'kontūras per mažas frezai ø' + num(C0.dia) : nvC.why === 'neck' ? 'kontūras vietomis siauresnis už frezą ø' + num(C0.dia) : 'visa operacija už detalės') + ' — NEPROGRAMUOTA'); return; } }\n"
               "    loops.forEach(function (lp, k) { p.paths.push({ face:face, name:'ESKIZAS_' + (i + 1) + (loops.length > 1 ? '_' + (k + 1) : ''), pts:lp.map(function (q) { return [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]; }), depth:dep, op:op, cam:s.cam || null }); });"),
    #     … so only a drilled hole is still refused for lying outside (and one whose centre is off the part altogether)
    ('engine', "if (o.pts.some(function (q) { return q[0] < -air || q[0] > p.L + air || q[1] < -air || q[1] > p.W + air; })) { warn.push(tag + 'išeina daugiau nei ' + air + ' mm už detalės — NEPROGRAMUOTA'); return; }",
               "if ((op === 'drill' || !api.nvClip) && o.pts.some(function (q) { return q[0] < -air || q[0] > p.L + air || q[1] < -air || q[1] > p.W + air; })) { warn.push(tag + 'išeina daugiau nei ' + air + ' mm už detalės — NEPROGRAMUOTA'); return; }\n"
               "    if (op === 'drill' && s.t === 'circle' && ((+s.x || 0) < 0 || (+s.x || 0) > p.L || (+s.y || 0) < 0 || (+s.y || 0) > p.W)) { warn.push(tag + 'skylės centras už detalės — NEPROGRAMUOTA'); return; }"),
    # (2) a path with routing options (lead-in, lead-out, passes …) gets its moves from src/ui/38-route.js; without options
    #     the live moves, unchanged — except a closed ring shorter than the 30 mm way down (a pocket's inner rings): the live
    #     ramp along it and back was close to a plunge; it is gone round as a spiral instead
    ('engine', "return routeMoves(P[0], P.slice(1).map(function (q) { return { x:q[0], y:q[1] }; }), Math.min(g.depth, DZ - R.rout.skin), g.name);",
               "var nvD = Math.min(g.depth, DZ - R.rout.skin), nvM = api.nvRoute ? api.nvRoute(P, nvD, g, R.rout, { DX:DX, DY:DY }) : null; return nvM ? { name:g.name, moves:nvM } : routeMoves(P[0], P.slice(1).map(function (q) { return { x:q[0], y:q[1] }; }), nvD, g.name);"),

    # ---- the drawing tool (src/ui/37-sketch.js): where a point lands is decided there (ends, middles, centres, on a line,
    #      crossings, perpendicular, horizontal / vertical …), it draws what was caught, and a dragged shape is caught by the
    #      point it was taken by. The live snapping stays as the fallback.
    ('app', "function snap(P, X, prev, e, exclId) {",
            "function snap(P, X, prev, e, exclId, drag) {\n    if (typeof nvsSnap === 'function') { var nvS = nvsSnap(P, X, prev, e, exclId, drag, mmPx(svgEl()), grid()); if (nvS) return nvS; }"),
    ('app', "    g.innerHTML = s; hud(X);",
            "    if (typeof nvsMarks === 'function') s += nvsMarks(X, snapInfo, cur, u, function (q) { return sP(X, q); }, D);\n    g.innerHTML = s; hud(X);"),
    ('app', "var base = o.t === 'line' ? o.pts[0] : [o.x, o.y], tgt = snap([base[0] + P[0] - D.start[0], base[1] + P[1] - D.start[1]], X, null, e, sh.id).p,",
            "var base = (typeof nvsBase === 'function' && nvsBase(o, D.start)) || (o.t === 'line' ? o.pts[0] : [o.x, o.y]), tgt = (snapInfo = snap([base[0] + P[0] - D.start[0], base[1] + P[1] - D.start[1]], X, null, e, sh.id, { move:o })).p,"),
    ('app', "var Q = snap(P, X, null, e, sh.id).p, h = D.h;",
            "var Q = (snapInfo = snap(P, X, null, e, sh.id, { grip:D.h, o:o })).p, h = D.h;"),
    ('app', "      redrawSvg(X); return;",
            "      redrawSvg(X); live(X); return;"),
    # the cutter's whole way (lead-in, lead-out, where it starts) on the drawing, and the routing options of a shape
    ('app', "stroke-linejoin=\"round\" stroke-linecap=\"round\" pointer-events=\"none\"/>'; });",
            "stroke-linejoin=\"round\" stroke-linecap=\"round\" pointer-events=\"none\"/>'; });\n  if (!preview && typeof nvqSvg === 'function') s += nvqSvg(p, list, selId, P, u);"),
    ('app', "'</div>' + ops + how + ws + '</div>';",
            "'</div>' + ops + how + (typeof nvqProps === 'function' ? nvqProps(c, p, r, sh, idx) : '') + ws + '</div>';"),
]

def patched(n, t):
    for (m, old, new) in PATCHES:
        if m == n and not (m == 'engine' and '--plain-engine' in sys.argv):   # --plain-engine: the live engine as it is (test/ui/golden_test.py compares the interface alone)
            if t.count(old) != 1: sys.exit("build.py: patch for src/lib/%s.js no longer matches exactly once — the live app changed there; review PATCHES." % n)
            t = t.replace(old, new)
    return t

def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else None

def main():
    app_live = rd('src/lib/app.js'); app = patched('app', app_live)
    if app.count(BOOT) != 1:
        sys.exit("build.py: the boot line of src/lib/app.js was not found exactly once — the live app changed its start-up; adjust BOOT.")
    cut = app.index(BOOT)
    ui_js = sorted(glob.glob(os.path.join(R, 'src/ui/*.js')))
    ui_css = sorted(glob.glob(os.path.join(R, 'src/ui/*.css')))
    out = arg('--out') or 'index.html'
    only = arg('--ui')
    if only is not None:
        keep = [k for k in only.split(',') if k]
        sel = lambda p: os.path.basename(p)[0] == '0' or os.path.basename(p).startswith(('10-checks', '99-')) or any(os.path.basename(p).startswith(k) for k in keep)
        ui_js = [p for p in ui_js if sel(p)]; ui_css = [p for p in ui_css if sel(p)]
    overlay = ''.join('\n/* ======== src/ui/%s ======== */\n%s\n' % (os.path.basename(p), open(p, encoding='utf-8').read()) for p in ui_js)
    closure = app[:cut] + overlay + app[cut:]

    # which live functions does the new interface replace? (top-level declarations with the same name)
    decl = re.compile(r'^function ([A-Za-z_$][\w$]*)\s*\(', re.M)
    legacy_fns = set(decl.findall(app_live))
    over = sorted(set(decl.findall(overlay)) & legacy_fns)
    dup = sorted(n for n in set(decl.findall(overlay)) if len(re.findall(r'^function %s\s*\(' % re.escape(n), overlay, re.M)) > 1)
    if dup:
        sys.exit("build.py: declared more than once in src/ui/: " + ', '.join(dup))

    css = ''.join('<style>\n%s\n</style>\n' % rd('src/lib/legacy_%d.css' % i) for i in range(12))
    css += ''.join('<style>\n/* src/ui/%s */\n%s\n</style>\n' % (os.path.basename(p), open(p, encoding='utf-8').read()) for p in ui_css)
    head = rd('src/head.html')
    js = '<script>\n' + rd('vendor/jszip.min.js') + '\n</script>\n'
    js += ''.join('<script>' + patched(n, rd('src/lib/%s.js' % n)) + '</script>\n' for n in LIB)
    build_id = hashlib.sha1((js + closure).encode('utf-8')).hexdigest()[:10]   # what this page computes with: every module (with its corrections) and the interface
    js += '<script>window.NV_BUILD="%s"</script>\n' % build_id
    js += '<script>' + closure + '</script>\n'
    shared = arg('--shared') or 'shared/'   # on the workshop's site: --shared /hub/shared/ (tools/deploy.py)
    # sign-in, cloud saving and "one editor per project" — the live app's own scripts, unchanged, loaded exactly as there
    # (copies next to the page so it also runs outside app.dedesbaldai.lt; tools/sync_legacy.py refreshes them)
    js += ''.join('<script src="%s"%s></script>\n' % (s, ' defer' if 'notices' in s else '') for s in
                  ['workshop-auth.js', shared + 'notices.js', 'cloud.js', shared + 'project-lock.js', 'locks.js', shared + 'back.js'])
    if re.search(r'</script', overlay, re.I):   # an inline script must never contain its own end tag
        sys.exit("build.py: a src/ui script contains '</script' — write it as '<\\/script'")
    page = ('<!doctype html>\n<html lang="lt" data-theme="light">\n<head>\n' + head + css + '</head>\n<body>\n'
            '<div id="app"></div>\n<div id="toast" class="toast" hidden></div>\n' + js + '</body>\n</html>\n')
    outp = os.path.join(R, out); os.makedirs(os.path.dirname(outp), exist_ok=True)   # an absolute --out is taken as it is
    open(outp, 'w', encoding='utf-8').write(page)
    print('%s  %.2f MB  ·  ui: %s' % (out, len(page.encode('utf-8')) / 1e6, ' '.join(os.path.basename(p) for p in ui_js + ui_css)))
    print('overrides of live functions (%d): %s' % (len(over), ', '.join(over)))
    print('live app.js sha1 ' + hashlib.sha1(app_live.encode('utf-8')).hexdigest()[:12])
    print('build ' + build_id)
    if '--check' in sys.argv:
        check(out)

def check(out='index.html'):
    """Load the page in headless Chrome: any page error or console error fails the build."""
    sys.path.insert(0, os.path.join(R, 'tools'))
    import http.server, threading
    from cdp import Chrome
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=R, **k)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with Chrome() as c:
        c.goto('http://127.0.0.1:%d/%s' % (srv.server_address[1], out), wait=2.0)
        ok = c.eval("!!(window.__dbk && document.getElementById('app').children.length)")
        logs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    srv.shutdown()
    for l in logs:
        print('  ' + l[:600])
    if not ok or logs:
        sys.exit('build.py --check: the page did not start cleanly')
    print('check: page starts, no errors')

if __name__ == '__main__':
    main()
