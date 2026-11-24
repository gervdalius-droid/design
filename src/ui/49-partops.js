/* 49-partops.js — the live app's part operations (Detalių operacijos: drawn on a part, routed or drilled) in the check list.
   The engine reports them as plain sentences ("1-KAIRE eskizas #2: …"). Here each gets its place and its way out:
   an operation that will NOT be made stops production (the cutout would silently be missing), a changed depth must be
   seen, and the row's button opens the drawing of that very part. */
var nvoBase = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var list = nvoBase(proj, info) || [];
  list.forEach(function (x) {
    var raw = String(x.raw || x.msg || ''), m = /^(.+?) eskizas #(\d+):\s*(.*)$/.exec(raw); if (!m || x.cab == null || x.cab < 0) return;
    var inf = info && info[x.cab], p = inf && inf.r ? (inf.r.panels || []).filter(function (q) { return (q.short || q.key || q.name) === m[1]; })[0] : null;
    var made = /sumažintas|reduced/i.test(m[3]);   // the only message where the operation is still made
    x.id = 'ops.' + (made ? 'depth' : 'skipped') + '.' + (p ? p.key : m[1]) + '.' + m[2];
    x.sev = made ? 'warn' : 'error';
    x.topic = 'cnc'; x.field = null;
    x.msg = L('Detalės ' + m[1] + ' operacija #' + m[2] + ': ' + m[3].replace(/\s*—?\s*NEPROGRAMUOTA\s*$/, '') + (made ? '' : ' — NEBUS PAGAMINTA'),
              'Part ' + m[1] + ', operation #' + m[2] + ': ' + m[3].replace(/\s*—?\s*NEPROGRAMUOTA\s*$/, '') + (made ? '' : ' — WILL NOT BE MADE'));
    x.hint = made ? L('Frezuojant visada paliekama plona plėvelė; jei reikia kitaip — pakeiskite gylį brėžinyje.', 'Routing always leaves a thin skin; change the depth on the drawing if needed.')
                  : L('Pataisykite arba ištrinkite šią operaciją detalės brėžinyje.', 'Correct or delete this operation on the part\'s drawing.');
    x.act = { label: L('Atidaryti brėžinį', 'Open the drawing'), act: 'skopen', v: p ? p.key : null, i: x.cab };
  });
  return list;
};
