/* 05-guard.js — numbers no cabinet can have never reach the engine.
   The fields of the interface keep counts in range (shelves 0–12, drawers 1–12, doors 1–6), but a project that was edited
   by hand, damaged, or imported can carry anything — and the engine loops over these counts: 1e308 shelves hang the page.
   The same limits are applied to what is handed to the engine; the project itself is not touched. */
var nvgDef = engineDef;
engineDef = function (c) {
  var d = nvgDef(c);
  try {
    (Array.isArray(d && d.sections) ? d.sections : []).forEach(function (s) {
      if (!s || typeof s !== 'object') return;
      [['shelves', 12], ['nDrawers', 12], ['nDoors', 6], ['hang', 2]].forEach(function (q) { var v = +s[q[0]]; if (v > q[1]) s[q[0]] = q[1]; });   // Infinity too; NaN is left to the engine's own "|| default"
    });
    if (d && +d.cols > 4) d.cols = 4;
  } catch (e) { if (window.console) console.error(e); }
  return d;
};
