/* =====================================================================
   31-topics.js — the topics of the cabinet workspace after "Dydis" and "Vidus":
     body   Korpusas    supports + plinth · bottom · top (+ rails) · back · visible sides · joinery
     mats   Medžiagos   board and edge names, the drag dock (3-D view), the look
     addons Priedai     worktop · LED grooves · extra parts (side panels, the plinth fitted by gaps)
     cnc    Gręžimas    the CNC operations that apply to this cabinet
     review Patikra     what is still open for this cabinet, the two confirmations, counts
   and the other kinds of "cabinet": a loose panel ('panel'), a 3-D construction ('bx-dims' … 'bx-joints'),
   a dishwasher front (mats, the worktop, review).

   The live editor's fields are regrouped by what the person is thinking about; every field keeps its live
   binding (data-bind / data-act) and the id convention 'f-' + bind, so the live binding engine does all the
   model work and a "Taisyti →" link can land on any of them. A binding is on the page once: the plinth
   (c.extras[k]) is edited in Korpusas, Priedai only links to it and keeps its fit by gaps.
   ===================================================================== */
NV.nvtAdv = {};     // "Daugiau" groups opened / closed by hand: key → true | false (else they open by themselves when needed)
NV.nvtNotes = {};   // long explanations unfolded by a click

/* what kind of thing the open "cabinet" is — the other topics (size, inside) hide for a panel / a 3-D construction */
function nvtKind(c) { return !c ? 'normal' : c.kind === 'box' ? 'box' : c.kind === 'panel' ? 'panel' : c.dishwasher ? 'dish' : 'normal'; }
function nvtFor() { var ks = [].slice.call(arguments); return function (c) { return ks.indexOf(nvtKind(c)) >= 0; }; }
/* "1 detalė · 3 detalės · 10 detalių" */
function nvtPl(n, one, few, many, en1, enN) {
  if (S.lang === 'en') return n + ' ' + (n === 1 ? en1 : enN);
  var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && (b < 10 || b >= 20) ? few : many);
}

/* ----------------------------------------------------------------- small building blocks */
function nvtId(bind) { return 'f-' + bind.replace(/[^\w]+/g, '-'); }
function nvtIcon(d) { return '<svg class="nv-ti" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
function nvtGrp(title, small, html, id) { return '<section class="nv-grp"' + (id ? ' id="' + id + '"' : '') + '><h4>' + title + (small ? ' <small>' + small + '</small>' : '') + '</h4>' + html + '</section>'; }
/* segmented buttons as a labelled field: the wrapper carries the binding's id, so a "fix" link can land on it and an issue can frame it */
function nvtSegF(label, bind, val, opts, cls) {
  return '<div class="f nvt-segf' + (cls ? ' ' + cls : '') + '" id="' + nvtId(bind) + '">' + (label ? '<span>' + label + '</span>' : '') + seg(bind, val, opts) + '</div>';
}
/* a required text field: the star, and the red frame for as long as it is empty (CSS :invalid — follows the typing) */
function nvtReq(html) { return html.replace('</span>', ' <i class="req" aria-hidden="true">*</i></span>').replace('type="text"', 'type="text" required'); }
/* a number field that may stay empty (empty = by the rule shown as the placeholder) */
function nvtNE(label, bind, val, ph) {
  var id = nvtId(bind);
  return '<label class="f n s" for="' + id + '"><span>' + label + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + bind + '" data-num="1" data-empty="1" value="' + esc(val == null ? '' : val) + '"' + (ph != null ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off"></label>';
}
/* an explanation: short ones as they are, long ones folded to two lines (a click unfolds) */
function nvtNote(txt, cls) {
  var plain = String(txt).replace(/<[^>]+>/g, ''), k = plain.slice(0, 48), long = plain.length > 135;
  return '<p class="nv-hint' + (cls ? ' ' + cls : '') + (long ? ' nvt-clamp' + (NV.nvtNotes[k] ? ' open' : '') + '" data-nvt-note="' + esc(k) + '" title="' + esc(L('Spustelėkite — visas tekstas', 'Click for the whole text')) : '') + '">' + txt + '</p>';
}
/* "Daugiau": rarely used fields. Closed — unless a field inside is not at its default (auto), has an issue, or a "fix" link is
   about to land on it; what the person opened or closed by hand is remembered, but an issue always opens it. */
function nvtAdv(key, title, html, auto) {
  if (!html) return '';
  var has = function (id) { return !!id && html.indexOf('id="' + id + '"') >= 0; }, need = has(NV.flash);
  if (!need && typeof nvIssuesFor === 'function') need = nvIssuesFor(S.sel).some(function (x) { return x.sev !== 'info' && has(x.field); });
  var u = NV.nvtAdv[key], open = need || (u != null ? u : !!auto);
  return '<details class="nv-adv nvt-adv" data-nvt-adv="' + key + '"' + (open ? ' open' : '') + '><summary>' + title + '</summary><div class="nvt-advin">' + html + '</div></details>';
}
app.addEventListener('click', function (e) {
  var tg = e.target; if (!tg || !tg.closest) return;
  var sm = tg.closest('summary'), d = sm && sm.parentNode;
  if (d && d.hasAttribute && d.hasAttribute('data-nvt-adv')) { NV.nvtAdv[d.getAttribute('data-nvt-adv')] = !d.open; return; }   // the click comes before the toggle
  var n = tg.closest('[data-nvt-note]');
  if (n) { n.classList.toggle('open'); NV.nvtNotes[n.getAttribute('data-nvt-note')] = n.classList.contains('open'); }
});
/* the cabinet's own actions (library, copy, delete) — for the kinds whose first topic is ours */
function nvtCabActs(c) {
  return '<div class="nvt-acts">' + (c.libId ? '<button type="button" class="nv-btn sm ghost nvt-libon" data-act="libunlink" title="' + esc(t('libLinkedT')) + '">★ ' + t('libLinked') + '</button>' : '<button type="button" class="nv-btn sm ghost" data-act="libsave" title="' + esc(t('libSaveT')) + '">☆ ' + t('libSave') + '</button>') +
    '<button type="button" class="nv-btn sm ghost" data-act="dup">' + t('dup') + '</button><button type="button" class="nv-btn sm ghost danger" data-act="del">' + (S.confirm === 'del' ? t('delSure') : t('del')) + '</button></div>';
}

/* ================================================================= body — Korpusas */
/* the construction in one plain line: "Kojelės 100 mm · dugnas po šonais · viršuje juostos · be nugaros · konfirmatai" */
function nvtSum(c) {
  var o = c.cnc || {}, nC = colsOf(c), bs = [], out = [], k;
  for (k = 0; k < nC; k++) bs.push((o.backs || [])[k] || 'none');
  var hung = cabKind(c) === 'PAKABINAMOS', legs = o.legs && c.hang !== true, z = hbOf(c);
  out.push(!legs ? (hung ? L('pakabinama', 'wall-hung') : L('be atramų', 'no supports')) : o.feet ? L('pėdutės', 'feet') : L('kojelės ', 'legs ') + fmt(c.legH) + ' mm');
  if (!hung && plinthIdx(c) >= 0) out.push(L('cokolis', 'plinth'));
  out.push(o.bottom === 'inside' ? L('dugnas tarp šonų', 'bottom between the sides') + (z > 0 ? L(', pakeltas ', ', raised ') + fmt(z) + ' mm' : '') : L('dugnas po šonais', 'bottom under the sides'));
  out.push(o.top !== 'full' ? L('viršuje juostos', 'rails on top') : o.topMount === 'inside' ? L('viršus tarp šonų', 'top between the sides') : L('viršus ant šonų', 'top on the sides'));
  var one = bs.every(function (x) { return x === bs[0]; }), bn = { none: L('nėra', 'none'), hdf: L('plaušas', 'fibreboard'), solid: L('kieta', 'solid') };
  out.push(one ? (bs[0] === 'none' ? L('be nugaros', 'no back') : bs[0] === 'hdf' ? L('plaušo nugara', 'fibreboard back') : L('kieta nugara', 'solid back')) : L('nugara: ', 'back: ') + bs.map(function (x) { return bn[x] || x; }).join(' | '));
  out.push(o.joinery === 'cam' ? L('ekscentrikai', 'cams') : L('konfirmatai', 'confirmats'));
  var s = out.join(' · '); return esc(s.charAt(0).toUpperCase() + s.slice(1));
}
NVLIVE.nvtsum = function (c) { return c && nvtKind(c) === 'normal' ? nvtSum(c) : null; };

/* legs / feet: how many in a row, how many rows, the height — and the plan (follows the typing) */
NVLIVE.nvtlegs = function (c, inf) {
  if (!c || !c.cnc) return null;
  var r = inf && inf.r, n = r && r.legs ? r.legs.length : 0;
  return legPlanSVG(c, r) + '<figcaption>' + t(c.cnc.feet ? 'feetTotal' : 'legTotal') + ': <b>' + n + '</b> ' + L('vnt.', 'pcs') + '</figcaption>';
};
function nvtLegs(c, inf) {
  var o = c.cnc, b = 'c.cnc.', nC = colsOf(c), W = num(c.W), fs = E.R.legs.fromSide, lx = o.legsX || 2, ly = +o.legsY === 3 ? 3 : 2;
  var btn = function (v, txt, on, off) { return '<button type="button" data-act="set" data-bind="' + b + 'legsX" data-v="' + v + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '"' + (off ? ' disabled title="' + esc(t('legDense')) + '"' : '') + '>' + txt + '</button>'; };
  var segX = '<div class="seg" role="group">' + [2, 3, 4, 5, 6].map(function (n) { var on = String(lx) === String(n); return btn(n, n, on, !on && (W - 2 * fs) / (n - 1) < 70); }).join('') +   // too dense: under 70 mm between legs
    (nC > 1 ? btn('parts', t('legParts'), lx === 'parts') : '') + '</div>';
  if (o.feet) segX = nC > 1 ? seg(b + 'legsX', lx === 'parts' ? 'parts' : '2', [['2', t('feetSides')], ['parts', t('feetParts')]]) : '';
  return '<div class="nvt-legs"><div class="nv-fields">' +
      (segX ? '<div class="f nvt-segf" id="f-c-cnc-legsX"><span>' + t(o.feet ? 'feetRow' : 'legRow') + '</span>' + segX + '</div>' : '') +
      (o.feet ? '' : fN(t('legH') + ', mm', 'c.legH', c.legH, 's')) + '</div>' +
    nvtSegF(t('legRows'), b + 'legsY', ly, [[2, t('legRows2')], [3, t('legRows3')]]) +
    '<figure class="legplan nvt-legplan" data-live="nvtlegs">' + NVLIVE.nvtlegs(c, inf) + '</figure></div>' +
    (o.feet ? nvtNote(t('feetNote')) : '') +
    (c.hang === true ? '<p class="nv-hint nvt-warn">' + L('Spintelė išdėstyme pakabinta ant sienos — atramos jai negaminamos.', 'The cabinet hangs on a wall in the layout — no supports are made for it.') + '</p>' : '');
}
/* the plinth: the first extra part of kind 'plinth' (live plinthBlock) — on / off, where, its size and material */
function nvtPlinthHere(c) { return nvtKind(c) === 'normal' && cabKind(c) !== 'PAKABINAMOS' && plinthIdx(c) >= 0; }   // edited in Korpusas (else: a row of the extra parts)
function nvtPlinth(c) {
  if (cabKind(c) === 'PAKABINAMOS') return '';
  var i = plinthIdx(c), x = i >= 0 ? c.extras[i] : null, b = 'c.extras.' + i + '.';
  var two = function (act, opts, cur0) { return '<div class="seg" role="group">' + opts.map(function (q) { var on = q[0] === cur0; return '<button type="button" data-act="' + act + '" data-v="' + q[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + q[1] + '</button>'; }).join('') + '</div>'; };
  var h = '<div class="nvt-sub" id="nvt-plinth"><div class="f nvt-segf"><span>' + t('plL') + ' <i class="nvt-q" title="' + esc(L('Cokolis — lenta, uždengianti kojeles spintelės apačioje.', 'The plinth is the board that hides the legs under the cabinet.')) + '">?</i></span>' + two('plinth', [['off', t('plOff')], ['on', t('plOn')]], x ? 'on' : 'off') + '</div>';
  if (!x) return h + '</div>';
  var hb1 = hbOf(c), btw = hb1 > 0 && (x.between != null && x.between !== '' ? x.between === true || x.between === 'true' : !E.legHeight(engineDef(c)));
  var yf0 = x.yf !== '' && x.yf != null && isFinite(num(x.yf)) ? num(x.yf) : (btw ? 20 : 50);
  var fitted = ['gl', 'gr', 'gt', 'gb'].some(function (k) { return x[k] !== '' && x[k] != null; });
  if (hb1 > 0) h += '<div class="f nvt-segf"><span>' + t('plWhere') + '</span>' + two('plinthpos', [['in', t('plIn')], ['under', t('plUnder')]], btw ? 'in' : 'under') + '</div>';
  h += '<div class="nv-fields">' + fN(t('plH'), b + 'W', x.W, 's') + fN(t('plLen'), b + 'L', x.L, 's') + fN(t('plYf'), b + 'yf', fmt(yf0), 's') + fN(t('cT'), b + 'T', x.T, 's') + '</div>' +
    '<div class="nv-fields">' + fT(t('cMat'), b + 'mat', x.mat || '', 'dl-mat') + '</div>' +
    (fitted ? '<p class="nv-hint">' + L('Ilgis ir aukštis skaičiuojami iš tarpų.', 'Length and height follow the gaps.') + ' <button type="button" class="nvt-link" data-nv="go" data-topic="addons" data-field="f-pl-gl">' + L('Tarpai → Priedai', 'Gaps → Add-ons') + '</button></p>'
      : '<p class="nv-hint">' + L('Tik pjaunama detalė, be skylių. Tiksliai pritaikyti tarp šonų galima skiltyje', 'A cut-only part, no holes. To fit it exactly between the sides see') + ' <button type="button" class="nvt-link" data-nv="go" data-topic="addons" data-field="f-pl-gl">' + L('Priedai', 'Add-ons') + '</button>.</p>');
  var eb = ['e1', 'e2', 'e3', 'e4'].map(function (e, j) { return chk(b + e, x[e], ['L1', 'L2', 'W1', 'W2'][j]); }).join('');
  var std = num(x.qty) === 1 && !!x.e1 && !x.e2 && !x.e3 && !x.e4 && /^(cokolis|plinth)$/i.test(String(x.name || '').trim());
  h += nvtAdv('plinth', L('Cokolio pavadinimas, kiekis, kraštai', 'Plinth name, quantity, edges'),
    '<div class="nv-fields">' + fT(t('exName'), b + 'name', x.name, null, 'grow') + fN(t('cQ'), b + 'qty', x.qty, 's') + '</div>' +
    nvtEdges(t('exEdges'), eb, true), !std);
  return h + '</div>';
}
/* the four edge-banding ticks of a part in one row */
function nvtEdges(label, boxes, tip) { return '<div class="nvt-ebf"><span class="nvt-ebl">' + label + (tip ? ' <i class="nvt-q" title="' + esc(nvtEdgeTip()) + '">?</i>' : '') + '</span><span class="nvt-ebs">' + boxes + '</span></div>'; }
function nvtEdgeTip() { return L('Kurie kraštai laminuojami: L1, L2 — ilgosios kraštinės, W1, W2 — trumposios.', 'Which edges are banded: L1, L2 — the long edges, W1, W2 — the short ones.'); }

NVLIVE.nvtbotd = function (c) {   // a bottom shorter than the cabinet: what is left free at the back
  if (!c || !c.cnc) return null;
  var full = num(c.D), v = num(c.cnc.bottomD);
  return v > 0 && v < full ? esc(t('botDGap').replace('{g}', fmt(full - v))) : '';
};
function nvtBottom(c) {
  var o = c.cnc, b = 'c.cnc.', bIn = o.bottom === 'inside', camO = o.camOut || {}, jtB = jointTypeOf(c, 'bottom') || o.joinery;
  var bCam = bIn && jtB === 'cam' ? (camO.bottom ? 'out' : 'in') : null, v = num(o.bottomD) > 0 ? num(o.bottomD) : '';
  return '<div class="nvt-picrow">' + nvtSegF(L('Kaip tvirtinamas', 'How it is fixed'), b + 'bottom', bIn ? 'inside' : 'under', [['under', t('botUnder')], ['inside', t('botInside')]]) + camPick('bottom', bottomPic(bIn, bCam), bCam) + '</div>' +
    (bIn ? '<div class="nv-fields">' + fN(t('botZ') + ', mm', b + 'bottomZ', o.bottomZ || 0, 's') + '</div>' : '') +
    nvtAdv('bottom', L('Trumpesnis dugnas (vamzdžiams)', 'A shorter bottom (for pipes)'),
      '<div class="nv-fields">' + nvtNE(t('botD') + ', mm', b + 'bottomD', v === '' ? '' : fmt(v), t('botDFull')) + '<span class="nvt-side" data-live="nvtbotd">' + NVLIVE.nvtbotd(c) + '</span></div>' +
      '<p class="nv-hint">' + L('Tuščias laukas — dugnas per visą gylį.', 'Empty — the bottom runs the full depth.') + '</p>', v !== '');
}
function nvtRails(c, inf) {
  var b = 'c.cnc.', r = c.cnc.rails || {}, n = (r.front !== 'none' ? 1 : 0) + (r.back === 'hv' ? 2 : r.back !== 'none' ? 1 : 0) + (r.bottom ? 1 : 0);
  if (inf && inf.r) n = inf.r.panels.filter(function (p) { return /^JUOSTA/.test(p.role); }).length;   // as many as are made (an inside back leaves some out)
  return '<div class="nvt-sub"><div class="nvt-subh">' + t('rails') + ' <small>· ' + t('rCount') + ': ' + n + '</small></div>' +
    nvtSegF(t('rFront'), b + 'rails.front', r.front, [['h', t('rFlat')], ['v', t('rStand')], ['none', t('rNone')]]) +
    nvtSegF(t('rBack'), b + 'rails.back', r.back, [['h', t('rFlat')], ['v', t('rStand')], ['hv', t('rBoth')], ['none', t('rNone')]]) +
    '<div class="nv-fields">' + fN(t('rW') + ', mm', b + 'railW', c.cnc.railW, 's') + chk(b + 'rails.bottom', r.bottom, t('rBottom') + ' — ' + t('rBottomD')) + '</div></div>';
}
function nvtTop(c, inf) {
  var o = c.cnc, b = 'c.cnc.', full = o.top === 'full', inside = o.topMount === 'inside', camO = o.camOut || {}, jtT = jointTypeOf(c, 'top') || o.joinery;
  var tCam = full && inside && jtT === 'cam' ? (camO.top ? 'out' : 'in') : null;
  var h = nvtSegF(t('topKind'), b + 'top', o.top, [['rails', t('topRails')], ['full', t('topFull')]]);
  if (!full) return h + nvtRails(c, inf);
  var ov = num(o.topOvF) || num(o.topOvS) || num(o.topOvB);
  return h + '<div class="nvt-picrow">' + nvtSegF(L('Kaip tvirtinamas', 'How it is fixed'), b + 'topMount', inside ? 'inside' : 'over', [['over', t('topOn')], ['inside', t('topInside')]]) + camPick('top', topPic(inside, tCam), tCam) + '</div>' +
    (inside ? '' : '<div class="nv-fields">' + chk(b + 'topOverFacade', o.topOverFacade, t('topOver')) + '</div>' +
      nvtAdv('topov', L('Viršaus užlaidos', 'Top overhangs'), '<div class="nv-fields">' + fN(o.topOverFacade ? t('topOvFf') : t('topOvF'), b + 'topOvF', o.topOvF || 0, 's') + fN(t('topOvS'), b + 'topOvS', o.topOvS || 0, 's') + fN(t('topOvB'), b + 'topOvB', o.topOvB || 0, 's') + '</div>' + nvtNote(t('topOvNote')), !!ov));
}
function nvtVis(c) {
  var b = 'c.', v = c.vis || {};
  return '<div class="nv-fields nvt-chks">' + chk(b + 'vis.L', v.L, t('visL')) + chk(b + 'vis.R', v.R, t('visR')) + (c.type === 'PAKABINAMOS' || c.hang ? chk(b + 'vis.B', v.B, t('visB')) : '') + '</div>' +
    nvtNote(t('visNote')) +
    '<div class="nv-fields nvt-chks nvt-gap">' + chk(b + 'cnc.sideFull', sideFullOf(c), t('sideFull')) + '</div>' +
    '<p class="nv-hint">' + L('Pažymėjus dugnas ir viršus dedami tarp šonų.', 'When ticked, the bottom and the top go between the sides.') + '</p>';
}
function nvtBody(c, inf) {
  var o = c.cnc, sup = !o.legs ? 'none' : o.feet ? 'feet' : 'legs';
  var hasJ = inf && inf.r && inf.r.joints && inf.r.joints.length;
  return '<div class="nvt nvt-body">' +
    '<p class="nvt-sum" data-live="nvtsum">' + nvtSum(c) + '</p>' +
    nvtGrp(t('botMount'), '', nvtBottom(c)) +
    nvtGrp(t('top'), L('juostos — dvi siauros lentos vietoj pilno viršaus', 'rails — two narrow boards instead of a full top'), nvtTop(c, inf)) +
    nvtGrp(t('backOf'), '', '<div class="nvt-back">' + backBlock(c).replace(/^<div class="lbl"[^>]*>[^<]*<\/div>/, '') + '</div>') +   // the live block, without its own heading
    nvtGrp(L('Matomi šonai', 'Visible sides'), L('iš fasadų medžiagos', 'in the front material'), nvtVis(c)) +
    nvtGrp(L('Jungimas', 'Joinery'), '',
      '<div class="choices nvt-choices">' + choice('c.cnc.joinery', o.joinery, 'confirmat', artOf('confirmat'), t('jConf'), t('jConfD')) + choice('c.cnc.joinery', o.joinery, 'cam', artOf('cam'), t('jCam'), t('jCamD')) + '</div>' +
      '<p class="nv-hint">' + t('jMainL') + (hasJ ? ' ' + L('Atskirą jungtį galima pakeisti', 'A single joint can be changed in') + ' <button type="button" class="nvt-link" data-act="jcopen">' + L('sujungimų peržiūroje', 'the joints review') + '</button>.' : '') + '</p>') +
    nvtGrp(t('supL'), L('ant ko stovi spintelė', 'what the cabinet stands on'),
      nvtSegF('', 'c.cnc.support', sup, [['legs', t('supLegs')], ['feet', t('supFeet')], ['none', t('supNone')]]) + (o.legs ? nvtLegs(c, inf) : '') + nvtPlinth(c)) +
    '</div>';
}

/* ================================================================= mats — Medžiagos */
function nvtHasFront(c) { return !!c.dishwasher || (c.sections || []).some(function (s) { return s.kind === 'drawers' || s.kind === 'doors' || s.kind === 'cargo'; }) || !!(c.kind === 'box' && c.box && c.box.fronts && c.box.fronts.length); }
/* the material's colour or texture beside its name — a mistyped name shows as plain grey */
NVLIVE.nvtsw = function (c, inf, arg) {
  if (!c) return null;
  var p = String(arg || '').split('.'), n = String(((c[p[0]] || {})[p[1]]) || '').trim(); if (!n) return '<i class="none"></i>';
  var l = ((S.proj && S.proj.look) || {})[n] || {}, col = l.color || (window.DBFront ? window.DBFront.matColor(n, '#e5e2da') : '#e5e2da');
  if (!/^#[0-9a-f]{6}$/i.test(col)) col = '#e5e2da';
  return '<i style="background-color:' + col + (l.tex ? ';background-image:url(' + esc(l.tex) + ')' : '') + '"></i>';
};
function nvtMatRow(c, key, field) { return '<div class="nvt-mat"><span class="nvt-sw" data-live="nvtsw" data-live-arg="' + key + '">' + NVLIVE.nvtsw(c, null, key) + '</span>' + field + '</div>'; }
function nvtMatFields(c) {
  var b = 'c.', m = c.mat || {}, dish = !!c.dishwasher, ph = function (html) { return html.replace('type="text"', 'type="text" placeholder="' + esc(t('mTopPh')) + '"'); };
  var carc = fT(t('mCarc'), b + 'mat.carc', m.carc, 'dl-mat'), fac = fT(t('mFac'), b + 'mat.facade', m.facade, 'dl-mat');
  return '<div class="nvt-mats">' +
    nvtMatRow(c, 'mat.carc', dish ? carc : nvtReq(carc)) +
    nvtMatRow(c, 'mat.facade', nvtHasFront(c) ? nvtReq(fac) : fac) +
    (dish ? '' : nvtMatRow(c, 'mat.back', fT(t('mBack'), b + 'mat.back', m.back, 'dl-mat'))) +
    (!dish && c.kind !== 'box' && c.cnc && c.cnc.top === 'full' ? nvtMatRow(c, 'mat.top', ph(fT(t('mTop'), b + 'mat.top', m.top || '', 'dl-mat'))) : '') +
    (usesMerivo(c) ? nvtMatRow(c, 'mat.drawer', ph(fT(t('mDrw'), b + 'mat.drawer', m.drawer || '', 'dl-mat'))) : '') + '</div>' +
    '<p class="nv-hint"><i class="req">*</i> ' + t('reqNote') + '</p>';
}
function nvtLook(names) {
  return nvtNote(t('lookL')) + (names.length ? lookBlock(names) : '<p class="nv-hint">' + L('Pirma įrašykite medžiagų pavadinimus.', 'Enter the material names first.') + '</p>');
}
function nvtLookSet(names) { var lk = (S.proj && S.proj.look) || {}; return names.some(function (n) { return lk[n] && (lk[n].tex || lk[n].color); }); }
function nvtMats(c) {
  var b = 'c.', ed = c.edge || {}, names = lookNames([c]);
  var dock = NV.view === '3d' ? matDock(c)
    : '<p class="nv-hint nvt-dockhint"><span>' + L('Medžiagą galima ir užtempti tiesiai ant plokštės 3D vaizde.', 'A material can also be dragged straight onto a board in the 3-D view.') + '</span> <button type="button" class="nv-btn sm" data-nv="view" data-v="3d">' + L('Rodyti 3D', 'Show 3-D') + '</button></p>';
  return '<div class="nvt nvt-mats-t">' +
    nvtGrp(L('Plokštės', 'Boards'), L('pavadinimai keliauja į detalių sąrašą ir pjovimo planą', 'the names go to the part list and the cutting plan'), nvtMatFields(c)) +
    nvtGrp(L('Kraštai', 'Edge banding'), L('kuo laminuojami matomi kraštai', 'what the visible edges are banded with'),
      '<div class="nvt-mats">' + nvtMatRow(c, 'edge.carc', fT(t('eCarc'), b + 'edge.carc', ed.carc, 'dl-edge')) + nvtMatRow(c, 'edge.facade', fT(t('eFac'), b + 'edge.facade', ed.facade, 'dl-edge')) + '</div>') +
    (dock ? nvtGrp(L('Greitas priskyrimas', 'Quick assign'), '', dock) : '') +
    nvtAdv('look', t('lookT'), nvtLook(names), nvtLookSet(names)) +
    '</div>';
}

/* ================================================================= addons — Priedai */
NVLIVE.nvtwt = function (c) {
  if (!c) return null;
  var wt = E.worktopOf(engineDef(c));
  return wt ? '<b>' + fmt(wt.L) + ' × ' + fmt(wt.W) + ' × ' + fmt(wt.T) + '</b> mm' : '';
};
function nvtWorktop(c) {
  var w = c.worktop || wtDefault(), b = 'c.worktop.', wall = c.kind !== 'box' && !c.dishwasher && cabKind(c) === 'PAKABINAMOS';
  if (wall && !w.on) return '';   // a wall cabinet gets no worktop — offering one there only invites a mistake
  var h = '<div class="nvt-wt-top">' + nvtSegF('', b + 'on', !!w.on, [['false', t('wtNo')], ['true', t('wtYes')]]) + '<span class="nvt-side nvt-wt-size" data-live="nvtwt">' + NVLIVE.nvtwt(c) + '</span></div>';
  if (!w.on) return h;
  var nE = function (label, k) { return nvtNE(label, b + k, w[k], E.num(E.WT_DEF[k])); };
  return h + (wall ? '<p class="nv-hint nvt-warn">' + t('wtWallNote') + '</p>' : '') +
    '<div class="nv-fields">' + nvtReq(fT(t('wtMat'), b + 'mat', w.mat, 'dl-wt')) + nE(t('wtT'), 'T') + '</div>' +
    '<div class="nv-fields">' + nE(t('wtOver'), 'over') + nE(t('wtLeft'), 'left') + nE(t('wtRight'), 'right') + '</div>' +
    '<div class="nv-fields">' + fT(t('wtEdge'), b + 'edge', w.edge, 'dl-edge') + '</div>' +
    nvtNote(L('Greta stovinčių spintelių stalviršiai (ta pati medžiaga ir storis) detalių sąraše sujungiami į vieną gabalą. Kraštas klijuojamas priekyje ir galuose, kurie kyšo už šono.',
      'Worktops of cabinets standing side by side (same material and thickness) are joined into one piece in the part list. The edge goes on the front and on ends that stick out past a side.'));
}
function nvtLeds(c) {
  var b = 'c.leds.', ls = c.leds || [];
  var rows = ls.map(function (l, k) {
    return '<div class="nvt-led"><b class="nvt-no">' + (k + 1) + '</b><div class="nv-fields">' +
      fS(t('ledAt'), b + k + '.at', l.at, [['bottom', t('ledBottom')], ['top', t('ledTop')], ['L', t('ledL')], ['R', t('ledR')]]) + fN(t('ledFrom'), b + k + '.from', l.from, 's') +
      nvtSegF(t('ledSide'), b + k + '.side', l.side, [['in', t('ledIn')], ['out', t('ledOut')]]) + nvtSegF(t('ledEnds'), b + k + '.ends', l.ends, [['open', t('ledOpen')], ['closed', t('ledClosed')]]) + '</div>' +
      '<button type="button" class="xbtn" data-act="leddel" data-i="' + k + '" title="' + esc(t('rm')) + '" aria-label="' + esc(t('rm')) + '">✕</button>' + ledMoved(k) + '</div>'; }).join('');
  return rows + '<div class="nvt-add"><span class="nvt-addl">' + (ls.length ? t('ledAddL') : L('Pridėti griovelį:', 'Add a groove:')) + '</span>' +
    ['bottom', 'top', 'L', 'R'].map(function (at) { return '<button type="button" class="nv-btn sm" data-act="ledadd" data-v="' + at + '">＋ ' + esc(ledAtName(at)) + '</button>'; }).join('') + '</div>' +
    (ls.length ? nvtNote(t('ledNote')) : '');
}
/* the extra parts (live extrasBlock) as cards — a table of eight columns does not fit the inspector */
function nvtExtra(c, x, i) {
  var b = 'c.extras.' + i + '.', inv = function (html, k) { return num(x[k]) > 0 ? html : html.replace('data-num="1"', 'data-num="1" aria-invalid="true"'); };
  var eb = ['e1', 'e2', 'e3', 'e4'].map(function (e, j) { return chk(b + e, x[e], ['L1', 'L2', 'W1', 'W2'][j]); }).join('');
  var more = '';
  if (x.kind === 'side') more = '<div class="nvt-x-more">' + nvtSegF(t('exWhere'), b + 'side', x.side === 'L' || x.side === 'R' ? x.side : '', [['L', t('rmSideL')], ['R', t('rmSideR')], ['', t('exSideNone')]]) +
    '<div class="nv-fields">' + fN(t('exZb'), b + 'zb', x.zb == null ? 0 : x.zb, 's') + fN(t('exYf'), b + 'yf', x.yf == null ? '' : x.yf, 's') + '</div>' +
    nvtNote(L('Šoninė plokštė stovi prie spintelės šono. Apačia žemiau 0 — plokštė leidžiasi žemiau spintelės (iki grindų).', 'A side panel stands against the cabinet side. A bottom below 0 takes it below the cabinet (to the floor).')) + '</div>';
  else if (x.kind === 'plinth') more = '<div class="nvt-x-more"><div class="nv-fields">' + fN(t('plYf'), b + 'yf', x.yf == null ? '' : x.yf, 's') + '<span class="nvt-side">' + t('plYfH') + '</span></div></div>';
  return '<div class="nvt-x' + (x.kind === 'side' ? ' side' : '') + '"><div class="nvt-x-h">' + fT(t('exName'), b + 'name', x.name, null, 'grow') +
      '<button type="button" class="xbtn" data-act="rmx" data-i="' + i + '" aria-label="' + esc(t('rm')) + '" title="' + esc(t('rm')) + '">✕</button></div>' +
    '<div class="nv-fields nvt-x-dims">' + inv(fN(t('cL'), b + 'L', x.L, 's'), 'L') + inv(fN(t('cW'), b + 'W', x.W, 's'), 'W') + fN(t('cT'), b + 'T', x.T, 's') + fN(t('cQ'), b + 'qty', x.qty, 's') + '</div>' +
    '<div class="nv-fields">' + fT(t('cMat'), b + 'mat', x.mat, 'dl-mat') + '</div>' + nvtEdges(t('exEdges'), eb, true) + more + '</div>';
}
function nvtExtras(c) {
  var xs = c.extras || [], pi = nvtPlinthHere(c) ? plinthIdx(c) : -1, h = '';
  if (pi >= 0) { var p = xs[pi];   // the plinth is edited in Korpusas → here only where to find it
    h += '<div class="nvt-x nvt-x-link"><span><b>' + esc(p.name || t('exPlinth')) + '</b> <span class="nv-num">' + fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + fmt(p.T) + ' mm</span></span>' +
      '<button type="button" class="nv-btn sm" data-nv="go" data-topic="body" data-field="' + nvtId('c.extras.' + pi + '.W') + '">' + L('Keisti → Korpusas', 'Edit → Carcass') + '</button></div>'; }
  h += xs.map(function (x, i) { return i === pi ? '' : nvtExtra(c, x, i); }).join('');
  if (!xs.length) h += '<p class="nv-hint nvt-none">' + t('exNone') + '</p>';
  h += '<div class="nvt-add"><button type="button" class="nv-btn sm" data-act="addx" data-v="part">＋ ' + t('exAdd') + '</button>' +
    (pi >= 0 ? '' : '<button type="button" class="nv-btn sm" data-act="addx" data-v="plinth">＋ ' + t('exPlinth') + '</button>') +   // a plinth that Korpusas shows is switched there
    '<button type="button" class="nv-btn sm" data-act="addx" data-v="side">＋ ' + t('exSideAdd') + '</button></div>';
  return h;
}
function nvtPlinthFit(c) {
  var i = plinthIdx(c); if (i < 0 || c.dishwasher) return '';
  var x = c.extras[i], fitted = ['gl', 'gr', 'gt', 'gb'].some(function (k) { return x[k] !== '' && x[k] != null; });
  return nvtAdv('plfit', L('Cokolio pritaikymas tarpais', 'Fitting the plinth by gaps'), '<div class="nvt-plfit">' + plinthFitBlock(c) + '</div>', fitted);
}
function nvtAddons(c) {
  var kind = nvtKind(c), wt = nvtWorktop(c), h = '<div class="nvt nvt-addons">';
  if (wt) h += nvtGrp(t('wtL'), '', wt, 'nvt-wt');
  if (kind === 'dish') return h + '</div>';
  if (kind === 'normal') h += nvtGrp(t('ledT'), L('įleidžiamo profilio griovelis 16 × 8 mm, frezuojamas CNC', 'a 16 × 8 mm groove for a recessed profile, routed on the CNC'), nvtLeds(c), 'nvt-led');
  h += nvtGrp(t('s6'), L('tik pjaunamos, be skylių', 'cut only, no holes'),
    '<p class="nv-hint nvt-lead">' + L('Detalės, kurių nėra konstrukcijoje: apdailos plokštė, papildoma lentyna, šoninė plokštė…', 'Parts that are not in the construction: a cover panel, an extra shelf, a side panel…') + '</p>' + nvtExtras(c) + nvtPlinthFit(c), 'nvt-extras');
  return h + '</div>';
}

/* ================================================================= cnc — Gręžimas */
/* one operation: a switch, its name, what it means in plain words; its option only while it is on */
function nvtOp(bind, on, title, plain, more) {
  var id = nvtId(bind);
  return '<div class="nvt-op' + (on ? ' on' : '') + '"><label class="nvt-op-h" for="' + id + '"><input id="' + id + '" type="checkbox" class="nvt-sw-in" data-bind="' + bind + '"' + (on ? ' checked' : '') + '><span><b>' + title + '</b><small>' + plain + '</small></span></label>' +
    (on && more ? '<div class="nvt-op-more">' + more + '</div>' : '') + '</div>';
}
function nvtCncRows(c) {
  var o = c.cnc, b = 'c.cnc.', has = function (f) { return (c.sections || []).some(f); }, rows = [];
  if (has(function (s) { return s.kind === 'drawers' && E.R.runner[s.hw]; })) rows.push(nvtOp(b + 'runnerMarks', o.runnerMarks, t('oRun'),
    L('Šonuose pažymima, kur prisukti stalčių bėgelius — nereikia matuoti ranka.', 'The sides are marked where the drawer runners are screwed on — no measuring by hand.')));
  if (has(function (s) { return s.kind === 'drawers' && s.hw === 'BLUM TANDEMBOX'; })) rows.push(nvtOp(b + 'tbOn', o.tbFront !== 'off', t('oTb'),
    L('Stalčių fasaduose paruošiamos vietos fasado laikikliams.', 'The places for the front brackets are prepared in the drawer fronts.'),
    nvtSegF('', b + 'tbFront', o.tbFront === 'off' ? 'mark' : o.tbFront, [['mark', t('tbMark')], ['hole', t('tbHole')]]) + '<p class="nv-hint">' + (o.tbFront === 'hole' ? t('oTbD') : t('oTbDm')) + '</p>'));
  if (has(function (s) { return s.kind === 'doors' && s.hinge !== 'BE FURNITŪROS'; })) rows.push(nvtOp(b + 'hinges', o.hinges, t('oHinge'),
    L('Duryse išgręžiami Ø35 lizdai lankstams, šonuose pažymimos jų plokštelės.', 'Ø35 cups for the hinges are drilled in the doors, their plates are marked in the sides.'),
    nvtSegF(L('Lanksto puodelis', 'Hinge cup'), b + 'hingeFix', o.hingeFix, [['screw', t('hfScrew')], ['press', t('hfPress')]])));
  if (has(function (s) { return (s.kind === 'doors' || s.kind === 'open') && num(s.shelves) > 0 && s.shelfAdj !== false; })) rows.push(nvtOp(b + 'pinsOn', o.pins !== 'off', t('oPins'),
    L('Šonuose išgręžiamos Ø5 skylės kilnojamų lentynų laikikliams.', 'Ø5 holes for the supports of the adjustable shelves are drilled in the sides.'),
    nvtSegF(L('Kiek skylių', 'How many holes'), b + 'pins', o.pins, [['shelf', t('pinShelf')], ['row', t('pinRow')]])));
  return rows;
}
function nvtCnc(c) {
  var rows = nvtCncRows(c), sup = c.cnc.legs && c.hang !== true;
  return '<div class="nvt nvt-cnc">' + skBanner(c) +
    (rows.length ? '<p class="nv-hint nvt-lead">' + L('Ką CNC gręžia papildomai — rodoma tik tai, kas šioje spintelėje yra. Korpuso jungtys gręžiamos visada.', 'What the CNC drills in addition — only what this cabinet has. The carcass joints are always drilled.') + '</p><div class="nvt-ops">' + rows.join('') + '</div>'
      : '<p class="nvt-nothing">' + L('Šioje spintelėje nėra stalčių, durų ar kilnojamų lentynų — papildomai gręžti nėra ko.', 'This cabinet has no drawers, doors or adjustable shelves — nothing extra to drill.') + '</p>') +
    '<p class="nv-hint nvt-foot">' + (sup ? L('Kojelių ir pėdučių žymės gręžiamos pagal', 'The marks for legs and feet follow') : L('Kojelės ir pėdutės nustatomos skiltyje', 'Legs and feet are set in')) +
      ' <button type="button" class="nvt-link" data-nv="go" data-topic="body" data-field="f-c-cnc-support">' + L('Korpusas → Atramos', 'Carcass → Supports') + '</button>.</p></div>';
}

/* ================================================================= review — Patikra */
/* the two confirmations have their own cards here; their "todo" issues are not listed a second time */
function nvtIsConfirm(x) { var a = x.act || {}; return x.sev === 'todo' && (a.act === 'jcopen' || a.act === 'ecopen' || /(^|[._-])(jc|ec|joints?|edges?)([._-]|$)/i.test(String(x.id || ''))); }
function nvtIssue(x) {
  var a = x.act, go = (x.topic && x.topic !== 'review') || x.tab, at = function (k, v) { return v == null || v === '' ? '' : ' data-' + k + '="' + esc(v) + '"'; };
  var btns = (go ? '<button type="button" class="nv-btn sm" data-nv="go"' + at('tab', x.tab || 'cab') + at('sel', x.cab >= 0 ? x.cab : null) + at('topic', x.topic) + at('field', x.field) + at('sec', x.sec) + at('col', x.col) + '>' + L('Taisyti →', 'Fix →') + '</button>' : '') +
    (a && (a.act || a.nv) ? '<button type="button" class="nv-btn sm' + (go ? ' ghost' : '') + '"' + (a.act ? ' data-act="' + esc(a.act) + '"' : ' data-nv="' + esc(a.nv) + '"') + at('v', a.v) + at('i', a.i) + '>' + esc(a.label || L('Sutvarkyti', 'Fix it')) + '</button>' : '');
  return '<div class="nv-issue ' + x.sev + ' nvt-is"><span class="nvt-is-ic" aria-hidden="true">' + (x.sev === 'error' ? '!' : x.sev === 'todo' ? '?' : x.sev === 'warn' ? '!' : 'i') + '</span><div class="nvt-is-tx"><b>' + esc(x.msg) + '</b>' +
    (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + (btns ? '<div class="nvt-is-act">' + btns + '</div>' : '') + '</div></div>';
}
function nvtConfirm(kind, need, was, n) {
  var jc = kind === 'jc', title = jc ? L('Sujungimai', 'Joints') : L('Kraštai', 'Edge banding');
  var what = jc ? nvtPl(n, 'jungtis', 'jungtys', 'jungčių', 'joint', 'joints') + L(' — kur ir kuo sutvirtinta', ' — where and with what') : L('kurie detalių kraštai laminuojami', 'which edges of the parts are banded');
  var st = !need ? L('Patvirtinta', 'Confirmed') : was ? L('Pakeista po patvirtinimo — peržiūrėkite dar kartą', 'Changed since it was confirmed — review it again') : L('Dar neperžiūrėta', 'Not reviewed yet');
  return '<div class="nvt-cf ' + (need ? 'todo' : 'ok') + '" id="nvt-cf-' + kind + '"><span class="nvt-cf-ic" aria-hidden="true">' + (need ? '?' : '✓') + '</span><div class="nvt-cf-tx"><b>' + title + '</b><small>' + what + '</small><span class="nvt-cf-st">' + st + '</span></div>' +
    '<button type="button" class="nv-btn sm' + (need ? ' pri' : ' ghost') + '" data-act="' + (jc ? 'jcopen' : 'ecopen') + '">' + (need ? L('Peržiūrėti ir patvirtinti', 'Review and confirm') : L('Peržiūrėti', 'Review')) + '</button></div>';
}
function nvtStat(n, one, few, many, en1, enN) { return '<div><b class="nv-num">' + n + '</b><span>' + nvtPl(n, one, few, many, en1, enN).replace(/^\d+ /, '') + '</span></div>'; }
function nvtReview(c, inf) {
  var all = typeof nvIssuesFor === 'function' ? nvIssuesFor(S.sel) : [], r = inf && inf.r;
  var by = function (sev) { return all.filter(function (x) { return x.sev === sev; }); };
  var err = by('error'), warn = by('warn'), info = by('info'), todo = by('todo').filter(function (x) { return !nvtIsConfirm(x); });
  var hasJ = !!(r && r.joints && r.joints.length), hasE = !!(r && r.panels && r.panels.length);
  var needJ = hasJ && jcNeeded(c, r), needE = hasE && ecNeeded(c, r), nTodo = todo.length + (needJ ? 1 : 0) + (needE ? 1 : 0);
  var head = function (cls, txt, n) { return '<h4 class="nvt-rh ' + cls + '"><span class="nv-state ' + cls + '"></span>' + txt + (n ? ' <small>' + n + '</small>' : '') + '</h4>'; };
  var h = '<div class="nvt nvt-review">';
  if (!err.length && !nTodo && !warn.length) h += '<div class="nvt-ready"><span class="nvt-ready-ic" aria-hidden="true">✓</span><div><b>' + L('Spintelė paruošta', 'The cabinet is ready') + '</b><small>' +
    (hasJ || hasE ? L('Klaidų nėra, viskas peržiūrėta ir patvirtinta.', 'No errors, everything reviewed and confirmed.') : L('Klaidų nėra.', 'No errors.')) + '</small></div></div>';
  if (err.length) h += '<section class="nvt-rg">' + head('error', L('Stabdo gamybą', 'Stops production'), err.length) + err.map(nvtIssue).join('') + '</section>';
  if (hasJ || hasE || todo.length) h += '<section class="nvt-rg">' + head(nTodo ? 'todo' : 'ok', nTodo ? L('Reikia patvirtinti', 'To confirm') : L('Patvirtinimai', 'Confirmations'), nTodo) +
    (nTodo ? '<p class="nv-hint nvt-lead">' + L('Prieš gamybą žmogus turi pažiūrėti, kaip spintelė sujungta ir kur klijuojami kraštai.', 'Before production a person has to look at how the cabinet is joined and where the edges are banded.') + '</p>' : '') +
    (hasJ ? nvtConfirm('jc', needJ, !!c.jointsOk, r.joints.length) : '') + (hasE ? nvtConfirm('ec', needE, !!c.edgesOk, r.panels.length) : '') + todo.map(nvtIssue).join('') + '</section>';
  if (warn.length) h += '<section class="nvt-rg">' + head('warn', L('Įspėjimai', 'Warnings'), warn.length) + '<p class="nv-hint nvt-lead">' + L('Gaminti galima, bet peržiūrėkite.', 'It can be made, but have a look.') + '</p>' + warn.map(nvtIssue).join('') + '</section>';
  if (r) h += '<section class="nvt-rg"><div class="nvt-stats">' + nvtStat(r.panels.length, 'detalė', 'detalės', 'detalių', 'part', 'parts') + nvtStat(inf.nProg, 'CNC programa', 'CNC programos', 'CNC programų', 'CNC program', 'CNC programs') +
    '<div><b class="nv-num">' + fmt(c.dishwasher ? c.dishWidth : c.W) + ' × ' + fmt(c.H) + ' × ' + fmt(c.D) + '</b><span>' + (c.kind === 'panel' ? L('storis × aukštis × gylis', 'thickness × height × depth') : L('plotis × aukštis × gylis', 'width × height × depth')) + '</span></div></div>' +
    (S.admin ? '<div class="nvt-price">' + priceCard(c, inf) + '</div>' : '') + '</section>';
  if (info.length) h += '<details class="nvt-info"><summary>' + L('Pastabos dirbtuvei', 'Workshop notes') + ' <small>' + info.length + '</small></summary>' + info.map(function (x) { return '<p>' + esc(x.msg) + '</p>'; }).join('') + '</details>';
  return h + '</div>';
}

/* ================================================================= a loose panel (live panelEditor) */
function nvtPanel(c) {
  var b = 'c.', pe = c.pe || {}, m = c.mat || {}, ed = c.edge || {}, names = lookNames([c]);
  var eb = [['e1', t('pnE1')], ['e2', t('pnE2')], ['e3', t('pnE3')], ['e4', t('pnE4')]].map(function (e) { return chk('c.pe.' + e[0], pe[e[0]] !== false, e[1]); }).join('');
  return '<div class="nvt nvt-panel">' +
    '<p class="nv-hint nvt-lead">' + L('Atskira plokštė — tik pjaunama, be skylių. Kur ji stovi ir aukštį nuo grindų nustatykite išdėstyme.', 'A loose panel — only cut, no holes. Where it stands and its height from the floor are set in the layout.') + '</p>' +
    nvtGrp(L('Plokštė', 'Panel'), '', '<div class="nv-fields">' + fT(t('name'), b + 'name', c.name, null, 'grow') + '</div>' +
      '<div class="nv-fields">' + fN(t('rmThick'), b + 'W', c.W, 's') + fN(t('H'), b + 'H', c.H) + fN(t('D'), b + 'D', c.D) + '</div>' + nvtNote(t('pnNote'))) +
    nvtGrp(L('Medžiaga ir kraštai', 'Material and edges'), '',
      '<div class="nvt-mats">' + nvtMatRow(c, 'mat.carc', nvtReq(fT(t('rmPMat'), b + 'mat.carc', m.carc, 'dl-mat'))) + nvtMatRow(c, 'edge.carc', fT(t('pnEdgeMat'), b + 'edge.carc', ed.carc, 'dl-edge')) + '</div>' +
      nvtEdges(t('pnEdges'), eb)) +
    nvtGrp(L('Veiksmai', 'Actions'), '', nvtCabActs(c)) +
    nvtAdv('look', t('lookT'), nvtLook(names), nvtLookSet(names)) + '</div>';
}

/* ================================================================= a 3-D construction (live boxEditor): its steps as topics */
/* one step card of the live boxEditor, without the card around it — so the live rows stay the live app's own */
function nvtBoxStep(c, key) {
  var html = boxEditor(c), mark = '<div class="card step" id="st-' + key + '">', a = html.indexOf(mark); if (a < 0) return '';
  var z = html.indexOf('<div class="card step"', a + mark.length), s = html.slice(a, z < 0 ? html.length : z);
  return s.replace(/^<div class="card step"[^>]*><div class="no">[^<]*<\/div><div><h3>[\s\S]*?<\/h3>(<p class="lead">[\s\S]*?<\/p>)?/, '').replace(/<\/div><\/div>$/, '');
}
function nvtBoxWrap(key, lead, html) { return '<div class="nvt nvt-box nvt-' + key + '">' + (lead ? nvtNote(lead, 'nvt-lead') : '') + html + '</div>'; }
NVA.nvtbox3d = function () {   // the live "box3d", but the 3-D picture has to be the one shown first
  NV.view = '3d'; render();
  if (window.DBAssembly && window.DBAssembly.setBoards) window.DBAssembly.setBoards(true);
  mountAssembly();
  var ap = document.getElementById('assembly-preview'); if (ap) ap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
};
function nvtBoxDims(c) {
  var b = 'c.';
  return nvtBoxWrap('bx-dims', L('Išoriniai matmenys. Plokštes dėliokite 3D modelyje arba kitose skiltyse.', 'Outer size. Place the boards in the 3-D model or in the next topics.'),
    nvtGrp(L('Dydis', 'Size'), '', '<div class="nv-fields">' + fT(t('name'), b + 'name', c.name, null, 'grow') + '</div>' +
      '<div class="nv-fields">' + fN(t('W'), b + 'W', c.W) + fN(t('H'), b + 'H', c.H) + fN(t('D'), b + 'D', c.D) + fN(t('thick'), b + 'thick', c.thick, 's') + '</div>' +
      '<div class="nvt-add"><button type="button" class="nv-btn" data-nv="nvtbox3d">' + t('bx3d') + '</button></div>') +
    nvtGrp(L('Veiksmai', 'Actions'), '', nvtCabActs(c)));
}
function nvtBoxJoints(c, inf) {
  var r = inf && inf.r;
  return nvtBoxWrap('bx-joints', t('bxS4l'), nvtGrp(t('bxDefJ'), '', '<div class="choices nvt-choices">' + choice('c.cnc.joinery', c.cnc.joinery, 'confirmat', artOf('confirmat'), t('jConf'), t('jConfD')) + choice('c.cnc.joinery', c.cnc.joinery, 'cam', artOf('cam'), t('jCam'), t('jCamD')) + '</div>') +
    (r && r.joints && r.joints.length ? nvtGrp(L('Kiekviena jungtis', 'Every joint'), '', '<div class="nvt-joints">' + jointsBlock(c, r).replace(/^<div class="lbl"[^>]*>[^<]*<\/div>/, '') + '</div>') : ''));
}

/* ================================================================= the topics */
nvTopic({ key: 'panel', order: 10, icon: nvtIcon('<rect x="8.5" y="3" width="7" height="18" rx="1"/>'), label: function () { return L('Plokštė', 'Panel'); }, applies: nvtFor('panel'), body: function (c) { return nvtPanel(c); } });
nvTopic({ key: 'bx-dims', order: 10, icon: nvtIcon('<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>'), label: function () { return L('Dydis', 'Size'); }, applies: nvtFor('box'), body: function (c) { return nvtBoxDims(c); } });
nvTopic({ key: 'bx-boards', order: 12, icon: nvtIcon('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M7.5 4v16M16.5 4v16"/>'), label: function () { return t('bxS2'); }, applies: nvtFor('box'), body: function (c) { return nvtBoxWrap('bx-boards', t('bxS2l'), nvtBoxStep(c, 'boards')); } });
nvTopic({ key: 'bx-inner', order: 14, icon: nvtIcon('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h8"/>'), label: function () { return t('bxS3'); }, applies: nvtFor('box'), body: function (c) { return nvtBoxWrap('bx-inner', t('bxS3l'), nvtBoxStep(c, 'inner')); } });
nvTopic({ key: 'bx-fronts', order: 16, icon: nvtIcon('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M9.5 11v2M14.5 11v2"/>'), label: function () { return L('Fasadai', 'Fronts'); }, applies: nvtFor('box'),
  body: function (c, inf) { var r = inf && inf.r; return nvtBoxWrap('bx-fronts', t('bxS5l'), boxFrontsBlock(c, r && r.box ? r.box : { boards: [], covers: [], comps: [[0, 0]] })); } });
nvTopic({ key: 'bx-joints', order: 18, icon: nvtIcon('<path d="M5 5h6v14H5zM11 9h8v6h-8z"/><circle cx="8" cy="12" r="1.2"/>'), label: function () { return t('bxS4'); }, applies: nvtFor('box'), body: function (c, inf) { return nvtBoxJoints(c, inf); } });
nvTopic({ key: 'body', order: 30, icon: nvtIcon('<rect x="4.5" y="3.5" width="15" height="14" rx="1"/><path d="M4.5 7h15M7 17.5V21M17 17.5V21"/>'), label: function () { return L('Korpusas', 'Carcass'); }, applies: nvtFor('normal'), body: function (c, inf) { return nvtBody(c, inf); } });
nvTopic({ key: 'mats', order: 40, icon: nvtIcon('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>'), label: function () { return L('Medžiagos', 'Materials'); }, applies: nvtFor('normal', 'dish', 'box'), body: function (c) { return nvtMats(c); } });
nvTopic({ key: 'addons', order: 50, icon: nvtIcon('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M12 8v8M8 12h8"/>'), label: function () { return L('Priedai', 'Add-ons'); }, applies: nvtFor('normal', 'dish', 'box'), body: function (c) { return nvtAddons(c); } });
nvTopic({ key: 'cnc', order: 60, icon: nvtIcon('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'), label: function () { return L('Gręžimas', 'Drilling'); }, applies: nvtFor('normal'), body: function (c) { return nvtCnc(c); } });
nvTopic({ key: 'review', order: 90, icon: nvtIcon('<circle cx="12" cy="12" r="8.5"/><path d="M8 12.5l3 3 5-6"/>'), label: function () { return L('Patikra', 'Review'); }, body: function (c, inf) { return nvtReview(c, inf); } });
