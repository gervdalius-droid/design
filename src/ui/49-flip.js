/* 49-flip.js — "Pakeisti puses" for eccentrics (see nv3JFlipBtn in 48-view3.js): the engine drills a cam's housing in one
   face of its board; c.nvFlip['<joint key>|<L or R>'] = 'all' | [indexes of the joint's places] moves the chosen ones to the
   other face. Done on the engine's result, so the picture, the part list and the CNC programs all follow:
   the Ø15 housing hole changes its face, nothing else moves (the bolt's bore in the edge and the bolt hole in the other board stay). */
var nvfBuild = E.buildCabinet;
E.buildCabinet = function (def) {
  var r = nvfBuild.apply(E, arguments);
  try { nvfApply(def, r); } catch (e) { if (window.console) console.error(e); }
  return r;
};
function nvfApply(def, r) {
  var F = def && def.nvFlip; if (!F || !r || !(r.seams || []).length || !Object.keys(F).length) return;
  var fe = +E.R.cam.cam.fromEdge || 34, camD = +E.R.cam.cam.d || 15, dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  r.seams.forEach(function (s) {
    var j = (r.joints || []).filter(function (x) { return x.key === s.key; })[0]; if (!j) return;
    var side = j.single ? 'L' : (s.side || 'L'), f = F[s.key + '|' + side]; if (!f) return;
    var sd = s.at || (j.sides ? j.sides[side] || j.sides.L : j); if (!sd || sd.type !== 'cam') return;
    var n = Math.hypot(s.d[0], s.d[1], s.d[2]) || 1, d = s.d.map(function (v) { return v / n; }), M = [0, 1, 2].map(function (i) { return s.o[i] + d[i] * s.w / 2; });
    (r.panels || []).forEach(function (p) {   // the board along whose edge the joint runs: its cams are the ones 34 mm in from that edge
      var pl = p.place; if (!pl || p.drawerOf) return;
      var rel = [0, 1, 2].map(function (i) { return M[i] - pl.o[i]; }), a1 = dot(rel, pl.u), b1 = dot(rel, pl.v), t1 = -dot(rel, pl.n);
      if (a1 < -2 || a1 > p.L + 2 || b1 < -2 || b1 > p.W + 2 || Math.abs(t1 - p.T / 2) > p.T / 4) return;
      (sd.pos || []).forEach(function (a, k) {
        if (f !== 'all' && f.indexOf(k) < 0) return;
        var q = [0, 1, 2].map(function (i) { return s.o[i] + d[i] * a - pl.o[i]; }), x = dot(q, pl.u), y = dot(q, pl.v);
        (p.holes || []).forEach(function (h) {
          if (h.nvF || h.op || h.mark || h.through || Math.abs(h.d - camD) > 0.2 || Math.abs(Math.hypot(h.x - x, h.y - y) - fe) > 2.5) return;
          h.face = h.face === 'B' ? 'A' : 'B'; h.nvF = 1;
          if ((p.holes || []).some(function (g) { return g !== h && Math.hypot(g.x - h.x, g.y - h.y) < (g.d + h.d) / 2 + 2; }))
            r.warnings.push((p.short || p.name) + ': į kitą pusę perkelto ekscentriko lizdas kertasi su kita skyle — patikrinkite arba grąžinkite pusę');
        });
      });
    });
  });
}
