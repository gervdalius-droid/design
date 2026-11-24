/* 35-robe.js — wardrobes (spintos), as in the customer sketcher "Baldų eskizas" (the virtuve repository): a tall carcass
   split into columns, each column a stack of what the sketcher calls compartments — shelves, a hanging rail, drawers.
   Here a wardrobe is an ordinary tall cabinet of the live engine (type ŪKINĖ, columns, sections), so every rule, check
   and CNC program is the engine's own. What the engine does not know is added around it:
     · a hanging rail: section field `hang` (0 / 1 / 2) → hardware lines, and a rail in the pictures (r.visual.rails);
     · the wardrobe mark c.robe = { doors: 'hinged' | 'sliding' | 'none' } → the column presets and the doors switch;
     · sliding doors are NOT made here (the engine has no sliding system): the carcass is built open and a warning says so. */
T.lt.pRobeH = 'Spinta su varstomomis durimis'; T.en.pRobeH = 'Wardrobe, hinged doors';
T.lt.pRobeS = 'Spinta stumdomoms durims'; T.en.pRobeS = 'Wardrobe for sliding doors';
T.lt.pRobeN = 'Siaura lentynų spinta'; T.en.pRobeN = 'Narrow shelf unit';
T.lt.pRobeO = 'Atvira spinta'; T.en.pRobeO = 'Open wardrobe';
var NVW_COL = {   // what one column holds, bottom first: [kind, fields]; 'top' is the part behind the doors (or open)
  shelves:  { lt: 'Lentynos', en: 'Shelves', top: { shelves: 5 } },
  rail:     { lt: 'Pakaba', en: 'Hanging', top: { shelves: 1, hang: 1, drop: [350] } },
  rail2:    { lt: 'Dvi pakabos', en: 'Two rails', top: { shelves: 2, hang: 2, drop: [300, 0.5] } },
  railDrw:  { lt: 'Pakaba + stalčiai', en: 'Rail + drawers', drawers: [3, 700], top: { shelves: 1, hang: 1, drop: [350] } },
  shelfDrw: { lt: 'Lentynos + stalčiai', en: 'Shelves + drawers', drawers: [3, 600], top: { shelves: 3 } }
};
function nvwColSecs(c, key, col) {
  var P = NVW_COL[key] || NVW_COL.shelves, H = num(c.H) || 2400, t0 = num(c.thick) || 18, nC = colsOf(c), cw = colWidths(c)[col] || num(c.W) / nC, open = c.robe && c.robe.doors !== 'hinged', out = [];
  if (P.drawers) out.push(Object.assign(newSection('drawers'), { col: col, fill: false, nDrawers: P.drawers[0], height: P.drawers[1] }));
  var secH = H - 2 * t0 - (P.drawers ? P.drawers[1] : 0), top = Object.assign(newSection(open ? 'open' : 'doors'), { col: col, fill: true, divider: false, nDoors: cw > 650 ? 2 : 1, shelves: P.top.shelves, hang: P.top.hang || 0 });
  if (P.top.drop) {   // the shelves that carry a rail are fixed, at a set distance under the top (or half-way down)
    var z1 = secH - P.top.drop[0]; top.shelfAdj = false;
    top.shelfPos = P.top.drop.length > 1 ? [Math.round(z1 * P.top.drop[1]), Math.round(z1)] : [Math.round(z1)];
  }
  out.push(top); return out;
}
[ { k: 'pRobeH', W: 1200, D: 600, robe: { doors: 'hinged', cols: ['rail', 'shelfDrw'] } },
  { k: 'pRobeS', W: 2000, D: 650, robe: { doors: 'sliding', cols: ['shelfDrw', 'rail2', 'railDrw'] } },
  { k: 'pRobeN', W: 500, D: 600, robe: { doors: 'hinged', cols: ['shelves'], shelves: 4 } },
  { k: 'pRobeO', W: 900, D: 400, robe: { doors: 'none', cols: ['shelves'] } } ].forEach(function (p) { PRESETS.push(Object.assign({ type: 'ŪKINĖ', H: 2400, secs: [] }, p)); });
var nvwFromPreset = fromPreset;
fromPreset = function (pr) {
  var c = nvwFromPreset(pr); if (!pr.robe) return c;
  c.name = L('Spinta', 'Wardrobe'); c.robe = { doors: pr.robe.doors }; c.cols = pr.robe.cols.length; c.colW = []; c.sections = [];
  pr.robe.cols.forEach(function (k, col) { c.sections = c.sections.concat(nvwColSecs(c, k, col)); });
  c.cnc.backs = pr.robe.cols.map(function () { return 'hdf'; });   // a thin back per column: a whole solid back of a wardrobe fits neither the board nor the machine
  if (pr.robe.shelves) c.sections[c.sections.length - 1].shelves = pr.robe.shelves;
  return c;
};
NVH_GROUPS.splice(3, 0, { lt: 'Spintos', en: 'Wardrobes', hint: ['drabužiams — pakabos, lentynos, stalčiai', 'for clothes — rails, shelves, drawers'], ids: PRESETS.map(function (p, i) { return p.robe ? i : -1; }).filter(function (i) { return i >= 0; }), tall: true });
Object.assign(NVH_DESC, {
  pRobeH: ['Dvi dalys: pakaba ir lentynos su stalčiais.', 'Two parts: a rail, and shelves with drawers.'],
  pRobeS: ['Trys dalys be durų — stumdomų durų sistema užsakoma atskirai.', 'Three parts, no doors — the sliding system is ordered separately.'],
  pRobeN: ['Viena dalis su lentynomis ir durimis.', 'One part with shelves and a door.'],
  pRobeO: ['Be durų — tik lentynos.', 'No doors — shelves only.'] });

/* the engine's result + the hanging rails */
var nvwBuild = E.buildCabinet;
E.buildCabinet = function (def) {
  var r = nvwBuild.apply(E, arguments);
  try { nvwRails(def, r); } catch (e) { if (window.console) console.error(e); }
  return r;
};
function nvwRails(def, r) {
  var secs = (def && def.sections) || []; if (!r || !secs.some(function (s) { return +s.hang > 0; })) return;
  var W = +def.W, H = +def.H, t0 = +def.thick || 18, cols = Math.max(1, Math.min(4, Math.floor(+def.cols || 1))), cw = Array.isArray(def.colW) && def.colW.length === cols ? def.colW.map(Number) : null, bnd = [0];
  if (!cw) { cw = []; for (var q = 0; q < cols; q++) cw.push(W / cols); }
  cw.forEach(function (w, k) { bnd.push(bnd[k] + w); }); bnd[cols] = W;
  var rails = [], nAll = 0;
  for (var col = 0; col < cols; col++) {
    var mine = secs.filter(function (s) { return Math.min(cols - 1, Math.max(0, +s.col || 0)) === col; });
    mine.forEach(function (s, si) { var n = Math.min(2, Math.round(+s.hang || 0)); if (!(n > 0) || (s.kind !== 'doors' && s.kind !== 'open')) return;
      var x0 = col === 0 ? t0 : bnd[col] + t0 / 2, x1 = col === cols - 1 ? W - t0 : bnd[col + 1] - t0 / 2, info = (r.shelfInfo || []).filter(function (q2) { return q2.col === col && q2.sec === si; })[0];
      var zs = info ? info.zc.slice().sort(function (a, b) { return b - a; }) : [], base = info ? info.base : t0, top = zs.length ? zs[0] - t0 / 2 : H - t0;
      var z = [top - 60]; if (n > 1) z.push(zs.length > 1 ? zs[1] - t0 / 2 - 60 : Math.round((base + top) / 2) - 60);
      z.forEach(function (zz) { rails.push({ col: col, x0: x0, x1: x1, z: zz, y: (+def.D || 560) / 2, clear: zz - base }); });
      r.hardware.push({ item: 'Pakabos vamzdis L=' + Math.round(x1 - x0 - 4), qty: n, unit: 'vnt.' }); nAll += n; });
  }
  if (nAll) r.hardware.push({ item: 'Pakabos vamzdžio laikikliai', qty: 2 * nAll, unit: 'vnt.' });
  r.visual = r.visual || {}; r.visual.rails = rails;
}

/* Vidus: what the wardrobe's doors are, and a ready-made content for the open column */
function nvwPanel(c) {
  if (!c.robe) return '';
  var d = c.robe.doors || 'hinged', ac = activeCol(c), nC = colsOf(c);
  var db = function (k, label) { return '<button type="button" class="' + (d === k ? 'on' : '') + '" data-nv="nvwDoors" data-v="' + k + '" aria-pressed="' + (d === k) + '">' + label + '</button>'; };
  return '<section class="nv-grp nvw"><h4>' + L('Spinta', 'Wardrobe') + '</h4>' +
    '<div class="f"><span>' + L('Durys', 'Doors') + '</span><div class="seg" role="group">' + db('hinged', L('Varstomos', 'Hinged')) + db('sliding', L('Stumdomos', 'Sliding')) + db('none', L('Be durų', 'None')) + '</div></div>' +
    (d === 'sliding' ? '<p class="nv-hint nvw-warn">' + L('Stumdomų durų ši programa neskaičiuoja: korpusas daromas be durų, o durų sistema (bėgiai, profiliai, užpildai) užsakoma atskirai. Palikite jai vietos gylyje.', 'Sliding doors are not calculated here: the carcass is made without doors and the door system (tracks, profiles, infill) is ordered separately. Leave room for it in the depth.') + '</p>' : '') +
    '<div class="f" style="margin-top:10px"><span>' + (nC > 1 ? L('Kas ' + colName(nC, ac).toLowerCase() + ' dalyje', 'What goes in the ' + colName(nC, ac).toLowerCase() + ' part') : L('Kas viduje', 'What goes inside')) + '</span><div class="nvw-chips">' +
      Object.keys(NVW_COL).map(function (k) { return '<button type="button" class="nv-btn sm" data-nv="nvwCol" data-v="' + k + '">' + L(NVW_COL[k].lt, NVW_COL[k].en) + '</button>'; }).join('') + '</div></div>' +
    '<p class="nv-hint">' + L('Paruoštukas pakeičia pasirinktos dalies turinį; paskui kiekvieną sekciją galima taisyti atskirai.', 'A ready-made set replaces what the selected part holds; every section can then be changed on its own.') + '</p></section>';
}
NVA.nvwDoors = function (el, v) {
  var c = cur(); if (!c || !c.robe || c.robe.doors === v) return false;
  var to = v === 'hinged' ? 'doors' : 'open', cw = colWidths(c);
  c.robe.doors = v;
  c.sections.forEach(function (s) { if ((s.kind !== 'doors' && s.kind !== 'open') || s.fridge) return; s.kind = to; s.divider = false; if (to === 'doors') { s.nDoors = (cw[colOf(c, s)] || num(c.W)) > 650 ? 2 : 1; s.hinge = s.hinge || 'BLUM LANKSTAI'; } });
  save();
};
NVA.nvwCol = function (el, v) {
  var c = cur(); if (!c || !NVW_COL[v]) return false;
  var ac = activeCol(c);
  c.sections = c.sections.filter(function (s) { return colOf(c, s) !== ac; }).concat(nvwColSecs(c, v, ac));
  NV.secSel = null; save();
};

/* checks: sliding doors are not made; a rail needs room under it */
var nvwIssues = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var list = nvwIssues(proj, info) || [];
  ((proj && proj.cabinets) || []).forEach(function (c, i) {
    var r = info && info[i] && info[i].r;
    if (c.robe && c.robe.doors === 'sliding') list.push({ id: 'robe.sliding', sev: 'warn', cab: i, topic: 'inside', field: null,
      msg: L('Stumdomos durys neskaičiuojamos — gaminamas tik korpusas be durų', 'Sliding doors are not calculated — only the carcass is made, without doors'),
      hint: L('Durų sistemą (bėgius, profilius, užpildus) užsakykite atskirai ir patikrinkite, ar jai palikta vietos gylyje.', 'Order the door system (tracks, profiles, infill) separately and check that the depth leaves room for it.') });
    ((r && r.visual && r.visual.rails) || []).forEach(function (q, k) { if (q.clear < 800) list.push({ id: 'robe.railLow.' + k, sev: 'warn', cab: i, topic: 'inside', field: null, col: q.col,
      msg: L('Po pakabos vamzdžiu tik ' + fmt(Math.round(q.clear)) + ' mm — drabužiams ant pakabų reikia bent 800–1000 mm', 'Only ' + fmt(Math.round(q.clear)) + ' mm under the hanging rail — clothes on hangers need 800–1000 mm at least'),
      hint: L('Pakelkite lentyną virš vamzdžio arba sumažinkite sekcijas po juo.', 'Raise the shelf above the rail or make the sections under it smaller.') });
    });
    if (r && (c.sections || []).some(function (s) { return +s.hang > 0; }) && num(c.D) < 500) list.push({ id: 'robe.shallow', sev: 'warn', cab: i, topic: 'size', field: 'f-c-D',
      msg: L('Gylis ' + fmt(num(c.D)) + ' mm — pakaboms su drabužiais reikia apie 550–600 mm', 'Depth ' + fmt(num(c.D)) + ' mm — hangers with clothes need about 550–600 mm') });
  });
  return list;
};

var nvwLimit = numLimit;
numLimit = function (bind) { if (/^c\.sections\.\d+\.hang$/.test(bind)) return { min: 0, max: 2, int: true }; return nvwLimit(bind); };
