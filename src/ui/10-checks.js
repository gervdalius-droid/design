/* 10-checks.js — placeholder until the real check engine is written: the engine's own messages, by their level. */
function nvComputeIssues(proj, info) {
  var out = [];
  if (!proj) return out;
  proj.cabinets.forEach(function (c, i) {
    var inf = info[i]; if (!inf) return;
    (inf.warnings || []).forEach(function (w, k) {
      var lv = level(w);
      out.push({ id: 'eng.' + k, sev: lv === 'bad' ? 'error' : lv === 'warn' ? 'warn' : 'info', cab: i, topic: null, field: null, msg: wTxt(w), raw: w });
    });
  });
  return out;
}
