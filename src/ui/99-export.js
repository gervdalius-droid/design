/* 99-export.js — what the tests and the browser console may reach of the new interface (window.__nv).
   The live app's own window.__dbk is set right after this, at the end of the closure. */
window.__nv = {
  NV: NV, NV3: NV3, A: NVA, stages: NVSTAGE, live: NVLIVE,
  issues: function () { NV.issues = null; return nvIssues(); },
  counts: function (list) { if (!list) NV.issues = null; return nvCounts(list); },
  go: nvGo, undo: nvUndo, redo: nvRedo, render: function () { render(); },
  S: S, cur: cur, info: function () { return S._info; },
  build: function () { return buildProjectAll(); },
  topics: function () { return typeof NVTOPICS !== 'undefined' ? NVTOPICS : []; },
  /* the drawing on a part: a program point → where it is on the screen (tests click there) */
  skScreen: function (x, y) { var X = skCtx(), sv = document.querySelector('.sk-svg'); if (!X || !sv) return null; var d = X.F.to(x, y), pt = sv.createSVGPoint(); pt.x = d[0]; pt.y = -d[1]; var q = pt.matrixTransform(sv.getScreenCTM()); return [q.x, q.y]; },
  skShapes: function () { var X = skCtx(); return X ? X.list : null; },
  routeNotes: function (p, n) { return nvqNotes(p, n); },
  skSnap: function (P, prev, mm, o) { o = o || {}; return nvsSnap(P, skCtx(), prev || null, { altKey: !!o.alt, shiftKey: !!o.shift }, o.excl == null ? null : o.excl, o.drag || null, mm || 2, o.grid || 5); }
};
