/* 49-ktopic.js — ONE place for edge banding: the topic "Kraštai" of a cabinet, made like "Jungtys" (49-joints.js).
   While it is open the picture beside it is the 3-D model in edge mode (48-view3.js): the boards pulled apart so every
   edge can be seen and clicked (switch "Išskleista" off for the cabinet assembled), a click on an edge cycles it
   not banded → carcass edge → as the fronts, a click on a board's face brings that board out on its own.
   The inspector lists every board with a small drawing of its four edges (clickable the same way), "Visi 4 / nė vieno",
   "↺ Standartas", the back-edges switch and the confirmation.
   Every "review the edges" button anywhere (checks, Patikra, the live commands ecopen / ecroom, the 3-D toolbar's
   "Kraštai", a board's card → "Kraštų laminavimas") lands here — see the redirect in render() (00-core.js).
   The live ebk / ecok commands do the changing, so the rules (what "standard" is, the cycle, the signature the
   confirmation keeps) stay the live app's. */
function nvkHas(c) { return !!c && c.kind !== 'panel'; }
nvTopic({ key: 'edges', order: 36, icon: nvtIcon('<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M4 6h16" stroke-width="3.2"/><path d="M20 6v12" stroke-width="3.2"/>'),
  label: function () { return L('Kraštai', 'Edges'); }, applies: nvkHas, body: function (c, inf) { return nvkBody(c, inf); } });

/* the picture follows the topic: edge mode is on while — and only while — "Kraštai" is open */
var nvkCab = NVSTAGE.cab;
NVSTAGE.cab = function (info) {
  var c = cur(), on = !S.picking && nvkHas(c) && NV.topic === 'edges';
  if (on) { NV.view = '3d'; if (NV.r3off) NV.r3off = null; }
  if (!!NV.kOn !== on) { NV.kOn = on; NV3.edges = on; NV3.focus = null; if (on) { NV3.joints = false; NV3.full = false; } }
  return nvkCab(info);
};
function nvkToggle() {   // the 3-D toolbar's "Kraštai" / the bar's "Gerai"
  if (NV.topic === 'edges') { NV.topic = NV.ePrev && NV.ePrev !== 'edges' ? NV.ePrev : 'body'; return; }
  NV.ePrev = NV.topic === 'joints' ? (NV.jPrev || 'body') : NV.topic; NV.topic = 'edges'; NV.secSel = null;
}
function nvkOpen(key) {   // one board's edges, from its card in the model
  if (NV.topic !== 'edges') { NV.ePrev = NV.topic; NV.topic = 'edges'; NV.secSel = null; }
  NV.kOn = true; NV3.edges = true; NV3.joints = false; NV3.focus = key || null;
}

var NVK_COL = ['#b9b4a8', '#1f5fbf', '#d9730d'];
function nvkMini(p, fe) {   // the board seen flat: its four edges, each a click target
  var Wd = 92, hh = Math.max(16, Math.min(46, p.W / Math.max(p.L, 1) * Wd)), pd = 7, x0 = pd, x1 = pd + Wd, y0 = pd, y1 = pd + hh;
  var seg = function (e, xa, ya, xb, yb, len) { var st = ecState(p, e, fe);
    return '<g class="nvk-e" data-act="ebk" data-v="' + esc(p.key) + '" data-i="' + e + '" role="button" aria-pressed="' + (st > 0) + '"><title>' + esc((st ? p.eb[e] : L('nelaminuojama', 'not banded')) + ' · ' + fmt(Math.round(len)) + ' mm') + '</title>' +
      '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" stroke="transparent" stroke-width="12"/>' +
      '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" stroke="' + NVK_COL[st] + '" stroke-width="' + (st ? 4.5 : 1.6) + '"' + (st ? ' stroke-linecap="round"' : ' stroke-dasharray="4 3"') + '/></g>'; };
  return '<svg class="nvk-mini" viewBox="0 0 ' + (Wd + 2 * pd) + ' ' + (hh + 2 * pd) + '" width="' + (Wd + 2 * pd) + '" height="' + (hh + 2 * pd) + '" aria-hidden="false">' +
    '<rect x="' + x0 + '" y="' + y0 + '" width="' + Wd + '" height="' + hh + '" fill="var(--sunk)"/>' +
    seg('y1', x0, y0, x1, y0, p.L) + seg('y0', x0, y1, x1, y1, p.L) + seg('x0', x0, y0, x0, y1, p.W) + seg('x1', x1, y0, x1, y1, p.W) + '</svg>';
}
function nvkBody(c, inf) {
  var r = inf && inf.r, ps = (r && r.panels) || [], fe = c.edge.facade || 'PAGAL FASADA', fk = NV3.focus;
  var h = '<div class="nvt nvk"><p class="nv-hint nvt-lead">' + L('Visi šios spintelės kraštai keičiami čia. Spustelėkite kraštą modelyje arba detalės brėžinėlyje: nelaminuojama → karkaso kraštas → pagal fasadą.', 'All edges of this cabinet are changed here. Click an edge on the model or on a part\'s small drawing: not banded → carcass edge → as the fronts.') + '</p>';
  if (!ps.length) return h + '<p class="nvt-nothing">' + L('Šioje spintelėje detalių nėra.', 'This cabinet has no parts.') + '</p></div>';
  h += '<div class="nvk-leg"><span><i style="background:' + NVK_COL[1] + '"></i>' + esc(c.edge.carc || L('karkaso kraštas', 'carcass edge')) + '</span><span><i style="background:' + NVK_COL[2] + '"></i>' + L('pagal fasadą', 'as the fronts') + (c.edge.facade ? ' (' + esc(c.edge.facade) + ')' : '') + '</span><span><i class="raw"></i>' + L('nelaminuojama', 'not banded') + '</span></div>';
  if (!c.edge.carc && !c.edge.facade) h += '<p class="nv-hint nvk-warn">' + L('Kraštų medžiaga nenurodyta — ją rasite skiltyje Medžiagos.', 'No edge material is set — see Materials.') + '</p>';
  var isFront = function (p) { return p.role === 'FASADAS' || p.role === 'DURYS'; };
  var row = function (p) {
    var n = ['y0', 'y1', 'x0', 'x1'].filter(function (e) { return p.eb && p.eb[e]; }).length, on = fk === p.key;
    var nm = typeof nvpName === 'function' ? nvpName({ kind: 'panel', role: p.role, name: p.name }, p) : (p.short || p.role);
    return '<div class="nvk-li' + (on ? ' on' : '') + (p.ebManual ? ' custom' : '') + '">' + nvkMini(p, fe) +
      '<button type="button" class="nvk-nm" data-nv="nvk" data-v="f:' + esc(p.key) + '" aria-pressed="' + on + '" title="' + esc(L('Parodyti modelyje atskirai', 'Show it on its own in the model')) + '"><b>' + esc(nm) + '</b><small>' + fmt(p.L) + ' × ' + fmt(p.W) + ' · ' + n + '/4' + (p.ebManual ? ' · ' + L('pakeista', 'changed') : '') + '</small></button>' +
      '<span class="nvk-act"><button type="button" class="nv-btn sm ghost" data-act="ebk" data-v="' + esc(p.key) + '" data-i="all" title="' + esc(n === 4 ? L('Nė vieno', 'None') : L('Visi 4', 'All 4')) + '">' + (n === 4 ? L('Nė vieno', 'None') : L('Visi 4', 'All 4')) + '</button>' +
      (p.ebManual ? '<button type="button" class="nv-btn sm ghost" data-act="ebk" data-v="' + esc(p.key) + '" data-i="reset" title="' + esc(L('Standartas', 'Standard')) + '">↺</button>' : '') + '</span></div>';
  };
  var grp = function (title, list) { return list.length ? nvtGrp(title, list.length, '<div class="nvk-list">' + list.map(row).join('') + '</div>') : ''; };
  h += grp(L('Korpusas', 'Carcass'), ps.filter(function (p) { return !isFront(p) && !p.drawerOf; }));
  h += grp(L('Stalčiai', 'Drawers'), ps.filter(function (p) { return !isFront(p) && p.drawerOf; }));
  h += grp(L('Fasadai', 'Fronts'), ps.filter(isFront));
  h += nvtGrp(L('Visai spintelei', 'For the whole cabinet'), '',
    '<label class="chk"><input type="checkbox" data-bind="c.cnc.ebBack"' + (c.cnc.ebBack ? ' checked' : '') + '> ' + L('Laminuoti ir galinius (nematomus) šonų, dugno ir viršaus kraštus', 'Band the back (unseen) edges of the sides, bottom and top too') + '</label>' +
    '<p class="nv-hint">' + L('Standartas: laminuojami visi šonų, dugno ir viršaus kraštai, kurių neuždengia kita detalė, lentynų ir juostų — priekis.', 'Standard: every edge of the sides, bottom and top that no other part covers; shelves and rails — the front.') + '</p>');
  h += nvtGrp(L('Modelis', 'The model'), '', '<button type="button" class="nv-btn sm' + (NV3.eExp !== false ? ' on' : '') + '" data-nv="nv3" data-v="e:exp" aria-pressed="' + (NV3.eExp !== false) + '">⤢ ' + L('Detalės išskleistos', 'Boards pulled apart') + '</button>' +
    '<p class="nv-hint">' + L('Išskleidus matyti ir paspaudžiami visi kraštai, net vidiniai ir galiniai. Išjungus — spintelė surinkta.', 'Pulled apart every edge shows and can be clicked, the inner and back ones too. Off: the cabinet assembled.') + '</p>');
  var need = ecNeeded(c, r);
  h += '<section class="nvj-ok ' + (need ? 'todo' : 'ok') + '"><div><b>' + (need ? (c.edgesOk ? L('Kraštai pasikeitė — patvirtinkite iš naujo', 'The edges changed — confirm them again') : L('Kraštai dar nepatvirtinti', 'The edges are not confirmed yet')) : L('Kraštai patvirtinti ✓', 'The edges are confirmed ✓')) + '</b>' +
    '<small>' + (need ? L('Peržiūrėkite modelyje, kurie kraštai laminuojami. Be patvirtinimo gamybos failai neišduodami.', 'Look in the model which edges are banded. Without the confirmation no production files are given.') : L('Ką nors pakeitus, reikės patvirtinti dar kartą.', 'After any change they have to be confirmed again.')) + '</small></div>' +
    (need ? '<button type="button" class="nv-btn pri" data-act="ecok">✓ ' + L('Patvirtinu', 'I confirm') + '</button>' : '') + '</section>';
  return h + '</div>';
}
NVA.nvk = function (el, v) {
  if (v.indexOf('f:') === 0) { var k = v.slice(2); NV3.focus = NV3.focus === k ? null : k; return; }
};
NVAFTER.push(function () {   // a board brought out in the model: its row is brought into view
  var k = NV.topic === 'edges' ? NV3.focus : null; if (k === NV.kShown) return; NV.kShown = k;
  var e = k && document.querySelector('.nvk-li.on'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' });
});
