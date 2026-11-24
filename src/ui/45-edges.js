/* 45-edges.js — the cabinet in the edge-banding check, drawn like the 3-D preview: the carcass as a see-through wire
   model on paper with its legs, the fronts (when switched on) as solid boards in their material's colour, and only the
   edges carrying information — a banded edge is a coloured strip, an unbanded one a click target that lights up under
   the pointer. Replaces the live ecModel(); the live turning / zoom handlers and the 'ebk' / 'ecview' commands work on
   it unchanged.
   One board on its own (NV.ecFocus, from a click on a board in the 3-D picture — 46-pick.js): that board is pulled
   out of the cabinet and only its four edges can be clicked; the rest stays as a faint outline for orientation. */
function nveHull(P) {   // convex outline of projected points (a leg's silhouette)
  P = P.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = [], i;
  for (i = 0; i < P.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], P[i]) <= 0) lo.pop(); lo.push(P[i]); }
  for (i = P.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], P[i]) <= 0) up.pop(); up.push(P[i]); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function nveShade(hex, k) {   // a colour made darker (k < 1) or lighter (k > 1)
  var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex || '#888';
  var n = parseInt(m[1], 16), f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
  return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}
var nveLiveEcModel = ecModel;
ecModel = function (c, r, mode) {
  if (mode === 'sk') return nveLiveEcModel(c, r, mode);   // the live part-operations window picks parts on the live model
  return nveEcModel(c, r);
};
function nveEcModel(c, r) {
  var lt = S.lang === 'lt', V = S.ecView = S.ecView || { th:0.62, ph:0.42, zoom:1, exp:false, fronts:false }, fe = c.edge.facade || 'PAGAL FASADA';
  var isFront = function (p) { return p.role === 'FASADAS' || p.role === 'DURYS'; };
  var focus = !S.echeck && NV.ecFocus ? NV.ecFocus.key : null, fp = focus ? r.panels.filter(function (p) { return p.key === focus; })[0] : null;
  if (focus && !fp) focus = null;
  var ps = r.panels.filter(function (p) { return p.place && (focus ? !isFront(p) || p.key === focus : V.fronts || !isFront(p)); }); if (!ps.length) return '';
  var boxes = ps.map(function (p) { var q = p.place, pt = function (a, b, d) { return [0, 1, 2].map(function (i) { return q.o[i] + a * q.u[i] + b * q.v[i] - d * q.n[i]; }); };
    var cn = function (a, b, d) { return pt(a ? p.L : 0, b ? p.W : 0, d ? p.T : 0); };
    return { p:p, cen:pt(p.L / 2, p.W / 2, p.T / 2), faces:[
      { k:'A', v:[cn(0,0,0), cn(1,0,0), cn(1,1,0), cn(0,1,0)] }, { k:'B', v:[cn(0,0,1), cn(1,0,1), cn(1,1,1), cn(0,1,1)] },
      { k:'y0', v:[cn(0,0,0), cn(1,0,0), cn(1,0,1), cn(0,0,1)] }, { k:'y1', v:[cn(0,1,0), cn(1,1,0), cn(1,1,1), cn(0,1,1)] },
      { k:'x0', v:[cn(0,0,0), cn(0,1,0), cn(0,1,1), cn(0,0,1)] }, { k:'x1', v:[cn(1,0,0), cn(1,1,0), cn(1,1,1), cn(1,0,1)] }] }; });
  var mid = [0, 1, 2].map(function (i) { var a = boxes.map(function (b) { return b.cen[i]; }); return (Math.min.apply(null, a) + Math.max.apply(null, a)) / 2; });
  var ext = [0, 1, 2].map(function (i) { var a = []; boxes.forEach(function (b) { b.faces.forEach(function (f) { f.v.forEach(function (w) { a.push(w[i]); }); }); }); return Math.max.apply(null, a) - Math.min.apply(null, a); });
  boxes.forEach(function (b) {
    var off = V.exp && !focus ? [0, 1, 2].map(function (i) { return (b.cen[i] - mid[i]) * 0.5; }) : [0, 0, 0];
    if (focus && b.p.key === focus) {   // pulled out along the axis it sits furthest out on; a board in the middle comes out to the front
      var d = [0, 1, 2].map(function (i) { return (b.cen[i] - mid[i]) / Math.max(1, ext[i] / 2); }), ax = 0; [1, 2].forEach(function (i) { if (Math.abs(d[i]) > Math.abs(d[ax])) ax = i; });
      if (Math.abs(d[ax]) < 0.45) { ax = 1; d[1] = -1; }
      off = [0, 0, 0]; off[ax] = (d[ax] > 0 ? 1 : -1) * Math.max(160, Math.min(ext[0], ext[1], ext[2]) * 0.45); b.focus = true;
    }
    b.faces.forEach(function (f) { f.w = f.v.map(function (w) { return [w[0] + off[0] - mid[0], w[1] + off[1] - mid[1], w[2] + off[2] - mid[2]]; }); });
    b.c2 = [0, 1, 2].map(function (i) { return b.cen[i] + off[i] - mid[i]; });
  });
  if (V.th == null) { V.th = 0.62; V.ph = 0.42; }
  var ct = Math.cos(V.th), st2 = Math.sin(V.th), cp = Math.cos(V.ph), sp = Math.sin(V.ph), rr = [ct, -st2, 0], uu = [st2 * sp, ct * sp, cp], dv = [st2 * cp, ct * cp, -sp];
  var pr = function (w) { return [Math.round((w[0] * rr[0] + w[1] * rr[1]) * 10) / 10, Math.round(-(w[0] * uu[0] + w[1] * uu[1] + w[2] * uu[2]) * 10) / 10]; };
  var dpt = function (w) { return w[0] * dv[0] + w[1] * dv[1] + w[2] * dv[2]; };
  var dep = function (f) { var d = 0; f.w.forEach(function (w) { d += dpt(w); }); return d / 4; };
  /* legs: under the cabinet, as in the 3-D preview (not for a hung cabinet) */
  var legs = c.hang === true ? [] : (r.legs || []).map(function (l) { var top = [], bot = [], plate = [], n = 18, R = (l.d || 40) / 2;
    for (var k = 0; k < n; k++) { var a = k * 2 * Math.PI / n, x = l.x - mid[0], y = l.y - mid[1];
      top.push([x + R * Math.cos(a), y + R * Math.sin(a), -mid[2]]); bot.push([x + R * Math.cos(a), y + R * Math.sin(a), -l.h - mid[2]]);
      plate.push([x + R * 1.35 * Math.cos(a), y + R * 1.35 * Math.sin(a), -l.h - mid[2]]); plate.push([x + R * 1.35 * Math.cos(a), y + R * 1.35 * Math.sin(a), -l.h + 8 - mid[2]]); }
    return { top:top, bot:bot, plate:plate, z:-l.h - mid[2] }; });
  var rad = 0, all = []; boxes.forEach(function (b) { b.faces.forEach(function (f) { f.w.forEach(function (w) { all.push(w); }); }); }); legs.forEach(function (l) { l.bot.forEach(function (w) { all.push(w); }); });
  all.forEach(function (w) { rad = Math.max(rad, Math.hypot(w[0], w[1], w[2])); });
  var half = rad * (focus ? 0.9 : 1.08) / (V.zoom || 1), sw = half / 140, thin = sw * 0.42, zmin = 1e9, sh = [1e9, -1e9, 1e9, -1e9];
  all.forEach(function (w) { if (w[2] < zmin) zmin = w[2]; });
  boxes.forEach(function (b) { if (b.focus) return; b.faces.forEach(function (f) { f.w.forEach(function (w) { var q = pr([w[0], w[1], zmin]); if (q[0] < sh[0]) sh[0] = q[0]; if (q[0] > sh[1]) sh[1] = q[0]; if (q[1] < sh[2]) sh[2] = q[1]; if (q[1] > sh[3]) sh[3] = q[1]; }); }); });
  var shadow = V.ph > 0.05 && sh[1] > sh[0] ? '<ellipse cx="' + (sh[0] + sh[1]) / 2 + '" cy="' + (sh[2] + sh[3]) / 2 + '" rx="' + (sh[1] - sh[0]) * 0.62 + '" ry="' + Math.max((sh[3] - sh[2]) * 0.62, half * 0.04) + '" fill="url(#nvEcSh)" pointer-events="none"/>' : '';
  var poly = function (W) { return W.map(function (w) { return pr(w).join(','); }).join(' '); };
  var edgeEl = function (p, f, live) {
    var e = f.k, st = ecState(p, e, fe), len = e === 'y0' || e === 'y1' ? p.L : p.W, tip = '<title>' + esc((p.short || p.role) + ' — ' + fmt(Math.round(len)) + ' mm: ' + (st ? p.eb[e] : (lt ? 'nelaminuojama' : 'not banded'))) + '</title>';
    if (!live) return st ? '<polygon points="' + poly(f.w) + '" fill="' + EC_COL[st] + '" fill-opacity=".18" stroke="' + EC_COL[st] + '" stroke-opacity=".45" stroke-width="' + thin + '" pointer-events="none"/>' : '';
    return '<polygon class="ec-f nv-ecf' + (st ? ' on' : '') + (focus ? ' big' : '') + '" points="' + poly(f.w) + '"' + (st ? ' fill="' + EC_COL[st] + '" stroke="' + EC_COL[st] + '" stroke-width="' + thin * 1.6 + '"' : focus ? ' fill="#8d968f" fill-opacity=".14" stroke="#6f7a72" stroke-dasharray="' + sw * 3 + ' ' + sw * 2 + '" stroke-width="' + thin * 1.4 + '"' : ' fill="transparent" stroke="transparent" stroke-width="' + sw * 4 + '"') + ' stroke-linejoin="round" data-act="ebk" data-v="' + esc(p.key) + '" data-i="' + e + '" role="button">' + tip + '</polygon>';
  };
  var wires = '', edges = [], solids = [];
  boxes.forEach(function (b) { var p = b.p, solid = isFront(p) && !focus || (b.focus && isFront(p));
    if (solid) {   // a front: a real board in its material's colour, the faces towards the eye only, lit from above-left
      var col = window.DBFront && window.DBFront.matColor ? window.DBFront.matColor(p.mat, '#d9d5cc') : '#d9d5cc', h = '';
      b.faces.forEach(function (f) {
        var fc = [0, 1, 2].map(function (i) { return (f.w[0][i] + f.w[1][i] + f.w[2][i] + f.w[3][i]) / 4 - b.c2[i]; }); if (dpt(fc) > -1e-6) return;
        if (f.k === 'A' || f.k === 'B') { h += '<polygon points="' + poly(f.w) + '" fill="' + nveShade(col, fc[2] > 1 ? 1.12 : Math.abs(fc[0]) > 1 ? 0.86 : 1) + '" stroke="' + nveShade(col, 0.6) + '" stroke-width="' + thin + '" stroke-linejoin="round"><title>' + esc((p.short || p.role) + ' · ' + fmt(p.L) + ' × ' + fmt(p.W)) + '</title></polygon>'; return; }
        var st = ecState(p, f.k, fe);
        h += st || b.focus || !focus ? (st ? '' : '<polygon points="' + poly(f.w) + '" fill="' + nveShade(col, 0.78) + '" pointer-events="none"/>') + edgeEl(p, f, !focus || b.focus) : '';
      });
      solids.push({ d:dpt(b.c2), h:h }); return;
    }
    b.faces.forEach(function (f) {
      if (f.k === 'A' || f.k === 'B') { wires += '<polygon points="' + poly(f.w) + '" fill="' + (b.focus ? '#ffffff' : 'none') + '"' + (b.focus ? ' fill-opacity=".55"' : '') + ' stroke="' + (b.focus ? '#4f5a53' : '#93a097') + '" stroke-opacity="' + (focus && !b.focus ? '.45' : '.85') + '" stroke-width="' + (b.focus ? thin * 1.5 : thin) + '" stroke-linejoin="round" pointer-events="none"/>'; return; }
      var live = !focus || b.focus, el = edgeEl(p, f, live); if (el) edges.push({ d:dep(f), st:ecState(p, f.k, fe), h:el });
    });
  });
  edges.sort(function (a, b) { return (a.st ? 1 : 0) - (b.st ? 1 : 0) || b.d - a.d; });   // unbanded targets under the banded strips; the far ones first
  solids.sort(function (a, b) { return b.d - a.d; });
  var legSvg = legs.map(function (l) { var body = nveHull(l.top.concat(l.bot).map(pr)), pl = nveHull(l.plate.map(pr)), o = focus ? ' opacity=".35"' : '';
    return '<g pointer-events="none"' + o + '><polygon points="' + pl.map(function (q) { return q.join(','); }).join(' ') + '" fill="#272e2c"/><polygon points="' + body.map(function (q) { return q.join(','); }).join(' ') + '" fill="#343b3a"/></g>'; }).join('');
  var behind = solids.filter(function (s) { return s.d > 0; }).map(function (s) { return s.h; }).join(''), before = solids.filter(function (s) { return s.d <= 0; }).map(function (s) { return s.h; }).join('');
  var defs = '<defs><radialGradient id="nvEcSh"><stop offset="0" stop-color="#1c211e" stop-opacity=".16"/><stop offset="1" stop-color="#1c211e" stop-opacity="0"/></radialGradient></defs>';
  var tb = function (act, lab, on, tip) { return '<button type="button" class="btn' + (on ? ' on' : '') + '" data-act="ecview" data-v="' + act + '"' + (on != null ? ' aria-pressed="' + !!on + '"' : '') + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + lab + '</button>'; };
  return '<div class="ec-model nv-ecm' + (focus ? ' nv-ecm-focus' : '') + '"><div class="ec-tools">' + tb('front', lt ? 'Priekis' : 'Front') + tb('backv', lt ? 'Galas' : 'Back') + tb('under', lt ? 'Iš apačios' : 'From below') + (focus ? '' : tb('exp', lt ? 'Išskleisti' : 'Pull apart', V.exp) + tb('fronts', lt ? 'Fasadai' : 'Fronts', V.fronts)) + tb('zin', '＋') + tb('zout', '−') + '</div>' +
    '<svg class="ec-msvg" viewBox="' + (-half) + ' ' + (-half) + ' ' + (2 * half) + ' ' + (2 * half) + '" preserveAspectRatio="xMidYMid meet">' + defs + shadow + (V.ph > 0 ? legSvg : '') + behind + wires + edges.map(function (x) { return x.h; }).join('') + before + (V.ph > 0 ? '' : legSvg) + '</svg>' +
    '<p class="note" style="margin:6px 10px 8px">' + (focus ? (lt ? 'Spustelėkite detalės kraštą: nelaminuojama → karkaso kraštas → pagal fasadą. Tempkite — sukite.' : 'Click an edge of the board: not banded → carcass edge → as the fronts. Drag to turn.')
      : (lt ? 'Tempkite — sukite modelį, ratuku — artinkite. Spustelėkite kraštą: nelaminuojama → karkaso kraštas → pagal fasadą.' : 'Drag to turn the model, wheel to zoom. Click an edge: not banded → carcass edge → as the fronts.')) + '</p></div>';
}

/* the one-board edge card: a floating card inside #app (so the live 'ebk' / 'ecview' commands reach it), put back after every render */
function nveFocusCard() {
  var F = NV.ecFocus; if (!F || S.home || S.tab !== 'cab' || S.echeck || S.jcheck) return;
  var c = cur(), inf = S._info && S._info[S.sel], p = c && inf && inf.r ? inf.r.panels.filter(function (q) { return q.key === F.key; })[0] : null;
  if (!p || F.cab !== c.id) { NV.ecFocus = null; return; }
  var fe = c.edge.facade || 'PAGAL FASADA', n4 = ['y0', 'y1', 'x0', 'x1'].filter(function (e) { return p.eb && p.eb[e]; }).length;
  var d = document.createElement('div'); d.className = 'nve-fcard nv-card'; d.setAttribute('data-stop', '1');
  d.innerHTML = '<div class="nve-fh"><div><b>' + L('Kraštai', 'Edges') + ' — ' + esc(F.name || p.short || p.role) + '</b><small>' + fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + fmt(p.T) + ' mm</small></div><button type="button" class="nv-ic" data-nv="ecfclose" aria-label="' + esc(t('close')) + '">✕</button></div>' +
    ecModel(c, inf.r) +
    '<div class="nve-ff"><span class="jc-leg"><i class="s" style="background:#1f5fbf"></i>' + esc(c.edge.carc || L('karkaso kraštas', 'carcass edge')) + ' <i class="s" style="background:#d9730d"></i>' + L('pagal fasadą', 'as the fronts') + '</span>' +
    '<span class="nve-fb"><button type="button" class="nv-btn sm" data-act="ebk" data-v="' + esc(p.key) + '" data-i="all">' + (n4 === 4 ? L('Nė vieno', 'None') : L('Visi 4', 'All 4')) + '</button>' +
    (p.ebManual ? '<button type="button" class="nv-btn sm ghost" data-act="ebk" data-v="' + esc(p.key) + '" data-i="reset">↺ ' + L('Standartas', 'Standard') + '</button>' : '') +
    '<button type="button" class="nv-btn sm pri" data-nv="ecfclose">' + L('Gerai', 'Done') + '</button></span></div>';
  app.appendChild(d);
  var w = d.offsetWidth, h = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, F.x - w / 2)) + 'px'; d.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, F.y - 60)) + 'px';
  void fe;
}
NVAFTER.push(nveFocusCard);
NVA.ecfclose = function () { NV.ecFocus = null; };
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && NV.ecFocus) { NV.ecFocus = null; render(); } });
