/* 45-edges.js — the cabinet in the edge-banding check, drawn like the joints view: a see-through wire model on paper
   (every board as thin outlines), with only the edges carrying information — a banded edge is a coloured face, an
   unbanded one is an invisible click target that lights up under the pointer. Replaces the live ecModel(); the live
   turning / zoom handlers and the 'ebk' / 'ecview' commands work on it unchanged. */
function ecModel(c, r) {
  var lt = S.lang === 'lt', V = S.ecView = S.ecView || { th:0.62, ph:0.42, zoom:1, exp:false, fronts:false }, fe = c.edge.facade || 'PAGAL FASADA';
  var ps = r.panels.filter(function (p) { return p.place && (V.fronts || (p.role !== 'FASADAS' && p.role !== 'DURYS')); }); if (!ps.length) return '';
  var boxes = ps.map(function (p) { var q = p.place, pt = function (a, b, d) { return [0, 1, 2].map(function (i) { return q.o[i] + a * q.u[i] + b * q.v[i] - d * q.n[i]; }); };
    var cn = function (a, b, d) { return pt(a ? p.L : 0, b ? p.W : 0, d ? p.T : 0); };
    return { p:p, cen:pt(p.L / 2, p.W / 2, p.T / 2), faces:[
      { k:'A', v:[cn(0,0,0), cn(1,0,0), cn(1,1,0), cn(0,1,0)] }, { k:'B', v:[cn(0,0,1), cn(1,0,1), cn(1,1,1), cn(0,1,1)] },
      { k:'y0', v:[cn(0,0,0), cn(1,0,0), cn(1,0,1), cn(0,0,1)] }, { k:'y1', v:[cn(0,1,0), cn(1,1,0), cn(1,1,1), cn(0,1,1)] },
      { k:'x0', v:[cn(0,0,0), cn(0,1,0), cn(0,1,1), cn(0,0,1)] }, { k:'x1', v:[cn(1,0,0), cn(1,1,0), cn(1,1,1), cn(1,0,1)] }] }; });
  var mid = [0, 1, 2].map(function (i) { var a = boxes.map(function (b) { return b.cen[i]; }); return (Math.min.apply(null, a) + Math.max.apply(null, a)) / 2; });
  boxes.forEach(function (b) { var off = V.exp ? [0, 1, 2].map(function (i) { return (b.cen[i] - mid[i]) * 0.5; }) : [0, 0, 0];
    b.faces.forEach(function (f) { f.w = f.v.map(function (w) { return [w[0] + off[0] - mid[0], w[1] + off[1] - mid[1], w[2] + off[2] - mid[2]]; }); }); });
  if (V.th == null) { V.th = 0.62; V.ph = 0.42; }
  var ct = Math.cos(V.th), st2 = Math.sin(V.th), cp = Math.cos(V.ph), sp = Math.sin(V.ph), rr = [ct, -st2, 0], uu = [st2 * sp, ct * sp, cp], dv = [st2 * cp, ct * cp, -sp];
  var pr = function (w) { return [Math.round((w[0] * rr[0] + w[1] * rr[1]) * 10) / 10, Math.round(-(w[0] * uu[0] + w[1] * uu[1] + w[2] * uu[2]) * 10) / 10]; };
  var dep = function (f) { var d = 0; f.w.forEach(function (w) { d += w[0] * dv[0] + w[1] * dv[1] + w[2] * dv[2]; }); return d / 4; };
  var rad = 0; boxes.forEach(function (b) { b.faces.forEach(function (f) { f.w.forEach(function (w) { rad = Math.max(rad, Math.hypot(w[0], w[1], w[2])); }); }); });
  var half = rad * 1.08 / (V.zoom || 1), sw = half / 140;
  /* drawn as the 3-D preview's wire model: hair-thin grey-green outlines of every board, nothing filled, a soft shadow
     on the floor; a banded edge is a tinted strip with its colour as outline */
  var wires = '', edges = [], thin = sw * 0.42, zmin = 1e9, sh = [1e9, -1e9, 1e9, -1e9];
  boxes.forEach(function (b) { b.faces.forEach(function (f) { f.w.forEach(function (w) { if (w[2] < zmin) zmin = w[2]; }); }); });
  boxes.forEach(function (b) { b.faces.forEach(function (f) { f.w.forEach(function (w) { var q = pr([w[0], w[1], zmin]); if (q[0] < sh[0]) sh[0] = q[0]; if (q[0] > sh[1]) sh[1] = q[0]; if (q[1] < sh[2]) sh[2] = q[1]; if (q[1] > sh[3]) sh[3] = q[1]; }); }); });
  var shadow = Math.abs(V.ph) < 1.2 && V.ph > 0.05 ? '<ellipse cx="' + (sh[0] + sh[1]) / 2 + '" cy="' + (sh[2] + sh[3]) / 2 + '" rx="' + (sh[1] - sh[0]) * 0.62 + '" ry="' + Math.max((sh[3] - sh[2]) * 0.62, half * 0.04) + '" fill="url(#nvEcSh)" pointer-events="none"/>' : '';
  boxes.forEach(function (b) { var p = b.p; b.faces.forEach(function (f) {
    var pts = f.w.map(function (w) { return pr(w).join(','); }).join(' ');
    if (f.k === 'A' || f.k === 'B') { wires += '<polygon points="' + pts + '" fill="none" stroke="#93a097" stroke-opacity=".85" stroke-width="' + thin + '" stroke-linejoin="round" pointer-events="none"/>'; return; }
    var e = f.k, st = ecState(p, e, fe), len = e === 'y0' || e === 'y1' ? p.L : p.W;
    edges.push({ d:dep(f), st:st, h:'<polygon class="ec-f nv-ecf' + (st ? ' on' : '') + '" points="' + pts + '"' + (st ? ' fill="' + EC_COL[st] + '" stroke="' + EC_COL[st] + '" stroke-width="' + thin * 1.6 + '"' : ' fill="transparent" stroke="transparent" stroke-width="' + sw * 4 + '"') + ' stroke-linejoin="round" data-act="ebk" data-v="' + esc(p.key) + '" data-i="' + e + '" role="button"><title>' + esc((p.short || p.role) + ' — ' + fmt(Math.round(len)) + ' mm: ' + (st ? p.eb[e] : (lt ? 'nelaminuojama' : 'not banded'))) + '</title></polygon>' });
  }); });
  edges.sort(function (a, b) { return (a.st ? 1 : 0) - (b.st ? 1 : 0) || b.d - a.d; });   // unbanded targets under the banded strips; the far ones first
  wires = '<defs><radialGradient id="nvEcSh"><stop offset="0" stop-color="#1c211e" stop-opacity=".16"/><stop offset="1" stop-color="#1c211e" stop-opacity="0"/></radialGradient></defs>' + shadow + wires;
  var tb = function (act, lab, on, tip) { return '<button type="button" class="btn' + (on ? ' on' : '') + '" data-act="ecview" data-v="' + act + '"' + (on != null ? ' aria-pressed="' + !!on + '"' : '') + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + lab + '</button>'; };
  return '<div class="ec-model nv-ecm"><div class="ec-tools">' + tb('front', lt ? 'Priekis' : 'Front') + tb('backv', lt ? 'Galas' : 'Back') + tb('under', lt ? 'Iš apačios' : 'From below') + tb('exp', lt ? 'Išskleisti' : 'Pull apart', V.exp) + tb('fronts', lt ? 'Fasadai' : 'Fronts', V.fronts) + tb('zin', '＋') + tb('zout', '−') + '</div>' +
    '<svg class="ec-msvg" viewBox="' + (-half) + ' ' + (-half) + ' ' + (2 * half) + ' ' + (2 * half) + '" preserveAspectRatio="xMidYMid meet">' + wires + edges.map(function (x) { return x.h; }).join('') + '</svg>' +
    '<p class="note" style="margin:6px 10px 8px">' + (lt ? 'Tempkite — sukite modelį, ratuku — artinkite. Spustelėkite kraštą: nelaminuojama → karkaso kraštas → pagal fasadą.' : 'Drag to turn the model, wheel to zoom. Click an edge: not banded → carcass edge → as the fronts.') + '</p></div>';
}
