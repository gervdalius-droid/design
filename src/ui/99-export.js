/* 99-export.js — what the tests and the browser console may reach of the new interface (window.__nv).
   The live app's own window.__dbk is set right after this, at the end of the closure. */
window.__nv = {
  NV: NV, NV3: NV3, A: NVA, stages: NVSTAGE, live: NVLIVE,
  issues: function () { NV.issues = null; return nvIssues(); },
  counts: function (list) { if (!list) NV.issues = null; return nvCounts(list); },
  go: nvGo, undo: nvUndo, redo: nvRedo, render: function () { render(); },
  S: S, cur: cur, info: function () { return S._info; },
  build: function () { return buildProjectAll(); },
  topics: function () { return typeof NVTOPICS !== 'undefined' ? NVTOPICS : []; }
};
