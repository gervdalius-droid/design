/* =====================================================================
   10-checks.js — the check engine: nvComputeIssues(proj, info) → the structured issue list of docs/ARCHITECTURE.md.

   It runs on every render and on every keystroke, so it only READS: the project record and info[i] = { r, warnings, nProg }
   that the core has already built (r = the engine's result of cabinet i). No engine builds, no saves, no layout repairs.
   Every rule is wrapped (nvcRun): a rule that meets data it cannot read gives nothing, the others still run.

   Two sources:
     1. the engine's own sentences (inf.warnings) — classified by NVC_ENG, a table of regular expressions over their fixed
        parts (catalogue: docs/map/engine.md §5). Unknown text falls back to the live level(w).
     2. rules the live app lacks (NVC_SEV lists them with their severity) — sizes, sections, drawers, doors, shelves,
        materials, edges, extra parts, part sizes, the joints / edges confirmations, the project itself.
   The full list with conditions, messages and fixes: docs/CHECKS.md. Tests: test/ui/checks_test.py.

   For the other src/ui files:  nvcTopicState(i, topic) · nvcBlockers() · nvcSig(list) · NVA.nvcfix (the one-click fixes).
   ===================================================================== */

/* severity of every own rule, in one place (error: stops production · todo: an open confirmation · warn: to acknowledge · info) */
var NVC_SEV = {
  'proj.name': 'error', 'proj.name.ascii': 'warn', 'proj.empty': 'error', 'proj.dupname': 'warn', 'proj.prefix': 'error', 'mat.near': 'warn', 'wt.long': 'warn', 'room': 'warn',
  'size': 'error', 'size.odd': 'warn', 'size.type': 'warn', 'thick.none': 'warn', 'thick.odd': 'warn', 'thick.cam': 'error', 'front.thick': 'warn', 'legs.h': 'warn', 'cab.noparts': 'error',
  'col.fit': 'error', 'sec.none': 'error', 'sec.kind': 'error', 'sec.over': 'error', 'sec.gap': 'warn',
  'drawer.low': 'error', 'drawer.low.soft': 'warn', 'drawer.high': 'warn', 'drawer.rail': 'error', 'drawer.raillen': 'warn', 'drawer.narrow': 'warn',
  'door.wide': 'warn', 'door.narrow': 'warn', 'door.tall': 'warn', 'door.hinges': 'warn', 'shelf.span': 'warn', 'shelf.dense': 'warn',
  'mat.carc': 'error', 'mat.facade': 'error', 'mat.back': 'warn', 'mat.thick': 'warn', 'wt.mat': 'error', 'wt.edge': 'warn', 'edge.carc': 'error', 'edge.facade': 'error',
  'extra.size': 'error', 'extra.qty': 'warn', 'extra.mat': 'error', 'extra.edge': 'error',
  'part.big': 'error', 'part.small': 'warn', 'part.progs': 'warn', 'part.round': 'info',
  'confirm.joints': 'todo', 'confirm.edges': 'todo'
};
/* workshop limits the rules use (mm). The engine's own hard limits are not repeated here — its messages cover them. */
var NVC_LIM = {
  baseH: [400, 1000], wallH: [200, 1400], tallH: [1000, 2700],   // usual carcass heights by type
  minW: 150, wideW: 1200,                                        // narrower: odd · wider with no partition: the bottom sags
  minD: 200, maxD: 700, maxWallD: 600,
  thick: [15, 30], frontT: [16, 25], legH: [50, 200],
  dishW: [[440, 460], [590, 610]],                               // a dishwasher is 450 or 600
  frontMin: 70, frontMinTb: 98.5, frontMax: 800,                 // drawer front heights (TANDEMBOX: its bracket needs the hole at 97.5)
  railPlus: 3,                                                   // a runner needs its length + 3 mm of inside depth
  drawerMinW: 200, doorMaxW: 600, doorMinW: 150, doorMaxH: 2400,
  shelfSpan: 900, shelfGap: 60,                                  // unsupported shelf length · least clear space between shelves
  partMin: 50, wtMax: 4100                                       // a part the CNC cannot hold · worktop board length
};
var NVC_ERR = [];          // rules that threw during the last run: [{ rule, cab, err }] — empty when all is well (tests read it)
var NVC_MEMO = { n: 0, cls: {}, txt: {} };     // classification and translation of an engine sentence, by its text
var NVC_LIB = { at: 0, names: [] };            // file prefixes of the other saved projects (re-read at most every 8 s: the library is one big JSON)

/* ----------------------------------------------------------------- small helpers */
function nvcNum(v) { try { var n = num(v); return typeof n === 'number' && isFinite(n) ? n : 0; } catch (e) { return 0; } }
function nvcStr(v) { return typeof v === 'string' ? v.trim() : v == null ? '' : typeof v === 'number' ? String(v) : ''; }
function nvcMm(v) { var n = Math.round(nvcNum(v) * 10) / 10; return String(n).replace('.', S.lang === 'en' ? '.' : ','); }
function nvcArr(v) { return Array.isArray(v) ? v : []; }
function nvcObj(v) { return v && typeof v === 'object' ? v : {}; }
function nvcBlank(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }
function nvcFid(bind) { return 'f-' + String(bind).replace(/\./g, '-'); }      // the live id convention of a bound field
function nvcSev(id) { return NVC_SEV[id] || 'warn'; }
function nvcRun(out, rule, cab, fn) {
  try { fn(); } catch (e) { NVC_ERR.push({ rule: rule, cab: cab, err: String(e && e.message || e) }); }
}
/* topic keys differ by the kind of cabinet (docs/DESIGN.md): a loose board has only `size`, a dishwasher front size / mats,
   a 3-D construction the live box steps */
function nvcTopic(c, tp) {
  if (!c || tp == null) return tp;
  if (c.kind === 'panel') return tp === 'review' ? tp : 'size';
  if (c.dishwasher) return tp === 'mats' || tp === 'review' ? tp : 'size';
  if (c.kind === 'box') return { size: 'dims', body: 'boards', inside: 'inner', cnc: 'joints' }[tp] || tp;
  return tp;
}
function nvcAdd(out, o) {
  if (!o || !o.id || !o.msg) return null;
  var c = o.c; delete o.c;
  if (!o.sev) o.sev = nvcSev(o.id);
  if (o.cab == null) o.cab = -1;
  o.topic = o.tab ? (o.topic || null) : nvcTopic(c, o.topic == null ? null : o.topic);
  if (o.field === undefined) o.field = null;
  out.push(o); return o;
}
/* the n-th section of a column → its index in c.sections (the engine numbers sections inside their column) */
function nvcSecIdx(c, col, si) {
  var n = -1, hit = -1;
  nvcArr(c.sections).some(function (s, k) { if (colOf(c, s) !== col) return false; n++; if (n === si) { hit = k; return true; } return false; });
  return hit;
}
function nvcSecName(c, k) {   // "2 sekcija" as the person counts it — the plain index when there is one column
  var s = c.sections[k], col = colOf(c, s), n = 0; c.sections.some(function (q, i) { if (colOf(c, q) === col) n++; return i === k; });
  return (colsOf(c) > 1 ? (col + 1) + '.' : '') + n;
}
function nvcColName(c, k) { var n = colsOf(c); try { return colName(n, k); } catch (e) { return String(k + 1); } }
/* the thickness written in a material's name — the rule of the ReportLists workbook (report.js thkFromName): "… 18 mm" */
function nvcThk(nm) { var m = /(\d+(?:[.,]\d+)?)\s*mm/i.exec(String(nm || '')); return m ? parseFloat(m[1].replace(',', '.')) : 0; }
function nvcFront(p) { return p.role === 'FASADAS' || p.role === 'DURYS' || !!p.boxFront || p.frontOf != null; }
/* inside depth a runner has in column k: the side's depth less what stands in front of the back (engine.js :385–421) */
function nvcRoom(c, r, k) {
  var o = nvcObj(c.cnc), t = nvcNum(c.thick) || 18, D = nvcNum(c.D), n = colsOf(c), backs = [];
  for (var q = 0; q < n; q++) backs.push(Array.isArray(o.backs) && o.backs[q] ? o.backs[q] : (!o.back || o.back === 'none' ? 'none' : 'solid'));
  var mount = o.backMount || (o.back === 'inside' ? 'inside' : 'top'), onTop = backs.every(function (b) { return b === 'solid'; }) && mount === 'top';
  var Dside = D - (onTop ? t : backs.indexOf('hdf') >= 0 ? (+E.R.hdf.t || 3) : 0), inB = function (j) { return !onTop && backs[j] === 'solid'; };
  var anyIn = backs.some(function (b, j) { return inB(j); }), rl = nvcObj(o.rails), full = o.top === 'full';
  var standing = !full && !anyIn && (rl.back === 'v' || rl.back === 'hv' || !!rl.bottom);
  var inset = anyIn && +o.backInset > 0 ? Math.min(+o.backInset, Math.max(0, Dside - t - 100)) : 0;
  return Dside - (inB(k) ? t + inset : standing ? t : 0);
}

/* ----------------------------------------------------------------- 1. the engine's sentences
   [ id, pattern over the fixed words, severity, topic, options ]
   options: f — bind of the field ('c.…', {k} = column, {s} = section index) · sf — field of the section the sentence names
            hint [lt, en] · cover — own rule (id prefix) that says the same better: the engine line is dropped when it fired
            act — one-click way out · dyn(m, X, ctx) → severity decided from the numbers · tab — stage when not the cabinet */
var NVC_JC = { label: ['Atidaryti sujungimus', 'Open the joints'], act: 'jcroom' };
var NVC_H = {
  back: ['Nugarai rinkitės ekscentrikus arba kaiščius — konfirmatų skylių ilgame krašte staklės negręžia.', 'Choose cam locks or dowels for the back — the machine cannot bore confirmat holes in a long edge.'],
  joints: ['Atidarykite sujungimų patikrą ir pakeiskite jungčių kiekį ar vietas.', 'Open the joints check and change the number or places of the connectors.'],
  fewer: ['Sumažinkite stalčių skaičių arba padidinkite sekciją.', 'Use fewer drawers or make the section taller.'],
  shorter: ['Rinkitės trumpesnį bėgelį arba gilinkite spintelę.', 'Choose a shorter runner or make the cabinet deeper.'],
  shelf: ['Pakeiskite lentynų skaičių arba aukščius.', 'Change the number of shelves or their heights.'],
  machine: ['Staklės apdirba detales iki 3050 × 900 mm. Mažinkite detalę arba keiskite konstrukciją (pvz. nugara iš plaušo, pertvara).', 'The machine takes parts up to 3050 × 900 mm. Make the part smaller or change the construction (e.g. a fibreboard back, a partition).'],
  drill: ['Tokio grąžto staklių galvoje nėra — pridėkite jį Nustatymuose arba keiskite operaciją (TANDEMBOX fasadui — žymės vietoj skylių).', 'The boring head has no such drill — add it in Settings or change the operation (for a TANDEMBOX front: marks instead of holes).'],
  first: ['Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę.', 'Standing note: these holes are not yet compared with the SWOOD model — check the first part made.']
};
var NVC_ENG = [
  /* --- dimensions and construction */
  ['eng.visSideT', /matomas šonas iš fasado medžiagos/, 'warn', 'mats', { f: 'c.cnc.facadeT', hint: ['Matomas šonas pjaunamas iš fasadų medžiagos, bet korpuso storio — įsitikinkite, kad tokia plokštė yra.', 'The visible side is cut from the front material at the carcass thickness — make sure such a board exists.'] }],
  ['eng.panelSize', /netinkami matmenys: plokštės storis/, 'error', 'size', { cover: 'size' }],
  ['eng.edgeNone', /krašto medžiaga nenurodyta — kraštai pažymėti/, 'error', 'mats', { f: 'c.edge.carc', cover: 'edge.carc' }],
  ['eng.panelNote', /atskira plokštė: tik pjaunama/, 'info', 'size'],
  ['eng.sizeZero', /netinkami matmenys: plotis, aukštis ir gylis turi/, 'error', 'size', { cover: 'size' }],
  ['eng.sizeMin', /netinkami matmenys: per maža spintelė/, 'error', 'size', { cover: 'size' }],
  ['eng.dishNote', /indaplovės spintelė: tik fasadas/, 'info', 'size'],
  ['eng.bottomZ', /dugnas pakeltas tik .*turi likti bent/, 'warn', 'body', { f: 'c.cnc.bottomZ' }],
  ['eng.colNarrow', /kolona \d+ per siaura/, 'error', 'inside', { f: 'c.colW.{k}', hint: ['Kolonai tarp šono ir pertvaros reikia bent 100 mm — platinkite ją arba mažinkite pertvarų skaičių.', 'A column needs at least 100 mm between side and partition — widen it or use fewer partitions.'] }],
  ['eng.bottomD', /dugno gylis .* didesnis už šono gylį/, 'warn', 'body', { f: 'c.cnc.bottomD', hint: ['Ištrinkite dugno gylį arba įrašykite mažesnį už spintelės gylį.', 'Clear the bottom depth or type one smaller than the cabinet depth.'] }],
  ['eng.bottomShortBack', /dugnas sutrumpintas iki .* nugara apačioje/, 'error', 'body', { f: 'c.cnc.bottomD' }],
  ['eng.railsDropped', /nugara viduje: stačios galinės juostos netelpa/, 'warn', 'body', { hint: ['Stačios galinės juostos nepagamintos — rinkitės gulsčią juostą arba nugarą išorėje.', 'The standing back rails are not made — choose a flat rail or a back on the outside.'] }],
  ['eng.noTop', /viršuje nėra nei viršaus, nei juostų/, 'error', 'body', { hint: ['Įjunkite bent vieną surišimo juostą arba pilną viršų.', 'Turn on at least one tie rail or a full top.'] }],
  ['eng.backCoverBottom', /nugara dengia dugną tik kai/, 'warn', 'body'],
  ['eng.backCoverTop', /nugara dengia viršų tik kai/, 'warn', 'body'],
  ['eng.backInset', /nugaros atitraukimas sumažintas/, 'warn', 'body', { f: 'c.cnc.backInset' }],
  ['eng.frontBot', /fasadai gali nusileisti tik/, 'warn', 'inside', { f: 'c.cnc.fg.bot' }],
  ['eng.visSideCam', /matomas (kairys|dešinys) šonas: dugnas prie jo tvirtinamas ekscentrikais/, 'info', 'body'],
  ['eng.partBack', /nugara ant galo: pertvara nesiekia nugaros/, 'error', 'body', { hint: ['Rinkitės gulsčią galinę juostą arba nugarą viduje — kitaip pertvara prie nugaros nepritvirtinama.', 'Choose a flat back rail or an inside back — otherwise the partition is not fixed to the back.'] }],
  ['eng.partTop', /pertvara viršuje nepritvirtinta/, 'error', 'body', { hint: ['Reikia gulsčios juostos arba pilno viršaus.', 'It needs a flat rail or a full top.'] }],
  ['eng.plinthFit', /cokolis netelpa su nurodytais tarpais/, 'error', 'addons', { hint: ['Sumažinkite cokolio tarpus.', 'Make the plinth gaps smaller.'] }],
  ['eng.partsDropped', /per maži matmenys \(.*— detalės nepridėtos/, 'error', 'size'],
  /* --- sections, fronts, drawers */
  ['eng.zoneOver', /sekcijų aukščių suma \(.*didesnė už fasadų zoną/, 'error', 'inside', { cover: 'sec.over' }],
  ['eng.secSmall', /per maža sekcija \(.*fasadai nepridėti/, 'error', 'inside', { sf: 'height', cover: 'sec.over' }],
  ['eng.frontHFit', /nurodyti fasadų aukščiai .*netelpa į sekciją/, 'warn', 'inside', { sf: 'frontH.0', hint: ['Jūsų įrašyti fasadų aukščiai nepritaikyti — sumažinkite juos arba palikite tuščius.', 'The front heights you typed are not used — make them smaller or leave them empty.'] }],
  ['eng.frontHSum', /fasadų aukščių suma \(.*neatitinka sekcijos .*padalinti po lygiai/, 'warn', 'inside', { sf: 'frontH.0', hint: ['Palikite bent vieną fasado aukštį tuščią — jis užims likutį.', 'Leave at least one front height empty — it takes what is left.'] }],
  ['eng.frontHLast', /fasadų aukščių suma neatitinka sekcijos .*apatinis fasadas ([\d.]+) mm/, 'warn', 'inside', { sf: 'frontH.0', dyn: function (m, X, ctx) {   // 1–2 mm on the lowest front is the gaps, not a mistake
    var s = ctx.sec >= 0 ? X.c.sections[ctx.sec] : null, fh = s && s.frontH, n = s ? Math.max(1, Math.round(nvcNum(s.nDrawers) || 1)) : 0;
    var typed = fh ? nvcNum(fh[(s.kind === 'drawers' ? n : Math.max(1, Math.round(nvcNum(s.nDoors) || 1))) - 1]) : 0;
    return typed > 0 && Math.abs(typed - parseFloat(m[1])) <= 2 ? 'info' : 'warn'; } }],
  ['eng.runnerUnknown', /bėgeliams „.*skylių šablono nėra/, 'error', 'inside', { sf: 'hw', hint: ['Rinkitės bėgelius iš sąrašo — šiems staklės negręžia žymių.', 'Choose runners from the list — no marks are drilled for these.'] }],
  ['eng.drawersMany', /per daug stalčių šiam aukščiui/, 'error', 'inside', { sf: 'nDrawers', hint: NVC_H.fewer, cover: 'drawer.low' }],
  ['eng.innerDrawers', /vidiniai stalčiai (už durų )?dar nepalaikomi/, 'warn', 'inside', { hint: ['Vidiniai stalčiai nebraižomi ir negręžiami — jų detales pridėkite ranka (Priedai → Papildomos detalės).', 'Inner drawers are not drawn or drilled — add their parts by hand (Add-ons → Extra parts).'] }],
  ['eng.hingesOff', /durys — lankstų skylės išjungtos \(gręžiama rankomis\)/, 'info', 'cnc'],
  ['eng.doorsSmall', /durys per mažos \(.*sumažinkite durų skaičių/, 'error', 'inside', { sf: 'nDoors' }],
  ['eng.hingeLow', /per žemos lankstams/, 'error', 'inside', { hint: ['Durys per žemos lankstams — didinkite sekciją arba rinkitės „Be furnitūros“.', 'The door is too low for hinges — make the section taller or choose “No fittings”.'] }],
  ['eng.hingeMovedTop', /lankstas perkeltas, kad plokštelė nepatektų po/, 'info', 'inside'],
  ['eng.ovenShelves', /daugiau nei 2 orkaitės atramos lentynos/, 'warn', 'inside', { sf: 'shelves' }],
  ['eng.shelfLow', /sekcija per žema lentynai/, 'error', 'inside', { hint: NVC_H.shelf }],
  ['eng.shelfClose', /lentynos per arti viena kitos/, 'error', 'inside', { hint: NVC_H.shelf, cover: 'shelf.dense' }],
  ['eng.hingeMovedShelf', /lankstas perkeltas, kad plokštelė nesikirstų su lentyna/, 'warn', 'inside', { hint: ['Lankstas ne standartinėje vietoje — pažiūrėkite piešinyje arba pakelkite / nuleiskite lentyną.', 'The hinge is off its standard place — look at the picture or move the shelf.'] }],
  ['eng.hingeShelf', /lanksto plokštelė kertasi su lentyna/, 'error', 'inside', { hint: NVC_H.shelf }],
  ['eng.shelfNoRoom', /lentyna \d+: per mažai vietos/, 'error', 'inside'],
  ['eng.hingeNoSide', /lankstų pusė ne prie šono/, 'error', 'inside', { sf: 'nDoors', hint: ['Vidurinėms durims nėra prie ko kabinti lankstų — darykite 2 duris arba dėkite pertvarą.', 'The middle door has nothing to hang on — make 2 doors or add a partition.'] }],
  ['eng.hingeNoPart', /lankstų pusė ne prie pertvaros/, 'error', 'inside', { sf: 'hingeSide' }],
  ['eng.plateClash', /lanksto plokštelės skylė (pertvaroje )?\(.*kliūna už kitos skylės/, 'error', 'inside'],
  ['eng.hingesShifted', /lankstai pastumti .*kad plokštelės nesusitiktų/, 'info', 'inside'],
  ['eng.pinClash', /laikiklio skylė (pertvaroje )?kliūna už kitos skylės/, 'error', 'inside', { hint: ['Pakelkite arba nuleiskite lentyną keliais centimetrais.', 'Move the shelf up or down by a few centimetres.'] }],
  ['eng.runnerMarkOut', /bėgelio .* žymė [\d.]+ mm netelpa šone/, 'error', 'inside', { hint: NVC_H.shorter, cover: 'drawer.rail|eng.railLong|eng.railDepth|eng.mvDepth' }],
  ['eng.runnerCam', /bėgelio .*patenka į ekscentriko skylę/, 'error', 'body', { hint: ['Bėgelio varžtas pataikytų į ekscentriką — dugną ar viršų junkite konfirmatais arba perkelkite jungtis.', 'The runner screw would hit a cam lock — join the bottom or top with confirmats or move the connectors.'], act: NVC_JC }],
  ['eng.tbLow', /per žemas TANDEMBOX tvirtinimo skylei/, 'error', 'inside', { sf: 'nDrawers', hint: NVC_H.fewer, cover: 'drawer.low' }],
  ['eng.railLong', /bėgelis [\d.]+ mm ilgesnis nei telpa/, 'error', 'inside', { sf: 'rail', hint: NVC_H.shorter }],
  ['eng.boxBelow', /dėžės dugnas per arti korpuso dugno/, 'warn', 'inside', { tab: 'set', hint: ['Nustatymuose padidinkite bėgelio ašies aukštį.', 'Raise the runner axis height in Settings.'] }],
  ['eng.drawerBoxFit', /fasadas per žemas arba (skyrius|anga) per siaura?s? stalčiaus dėžei/, 'error', 'inside', { sf: 'nDrawers', hint: NVC_H.fewer }],
  ['eng.railDepth', /bėgeliui [\d.]+ mm reikia .*gylio, yra/, 'error', 'inside', { sf: 'rail', hint: NVC_H.shorter }],
  ['eng.underT', /paslėptiems bėgeliams tinka 16–19/, 'warn', 'mats'],
  ['eng.mvDepth', /MERIVOBOX [\d.]+ mm reikia .*vidinio gylio/, 'error', 'inside', { sf: 'rail', hint: NVC_H.shorter }],
  ['eng.mvLow', /fasadas per žemas MERIVOBOX dėžei/, 'error', 'inside', { sf: 'nDrawers', hint: NVC_H.fewer }],
  ['eng.mvHeight', /MERIVOBOX \S+ \(.*\) netelpa — /, 'warn', 'inside', { sf: 'mvH' }],
  ['eng.mvNarrow', /anga per siaura MERIVOBOX dėžei/, 'error', 'inside'],
  ['eng.mvMat', /MERIVOBOX dugnas ir galas pjaunami iš/, 'warn', 'mats', { f: 'c.mat.drawer' }],
  /* --- joints, legs, LED, clashes */
  ['eng.jointMoved', /jungt\. buvo per arti krašto — perkelta/, 'warn', 'review', { act: NVC_JC }],
  ['eng.jointSkipped', /jungt\. per arti kitos/, 'warn', 'review', { act: NVC_JC, hint: NVC_H.joints }],
  ['eng.jointNone', /nėra nė vienos jungties — mazgas nesurištas/, 'error', 'review', { act: NVC_JC, hint: NVC_H.joints }],
  ['eng.jointFewer', /jungtys netelpa .*sumažinta iki/, 'warn', 'review', { act: NVC_JC }],
  ['eng.camDowel', /ekscentrikui ir kaiščiui nepakanka vietos/, 'error', 'review', { act: NVC_JC, hint: NVC_H.joints }],
  ['eng.partJointsMeet', /jungtys iš abiejų pusių susitinka ir jų nepavyko pastumti/, 'error', 'review', { act: NVC_JC }],
  ['eng.partJointsShift', /jungtys iš dešinės kolonos pastumtos/, 'info', 'review'],
  ['eng.partJointOut', /pertvaros jungtis už pertvaros ribų/, 'error', 'review', { act: NVC_JC }],
  ['eng.partHolesMeet', /skylės iš abiejų pusių susitinka \(/, 'error', 'inside', { hint: ['Pertvaroje skylės iš abiejų pusių pataiko viena į kitą — perkelkite lentyną, duris arba jungtis.', 'Holes from both faces of the partition meet — move a shelf, a door or the connectors.'] }],
  ['eng.footMoved', /pėdutė pastumta/, 'info', 'body'],
  ['eng.footClash', /pėdutės skylė kliūna už jungties skylės/, 'error', 'body', { act: NVC_JC }],
  ['eng.legCover', /plokštelė uždengia jungties galvutę/, 'error', 'body', { f: 'c.cnc.legsX' }],
  ['eng.legsDense', /kojelės per tankiai/, 'error', 'body', { f: 'c.cnc.legsX', hint: ['Sumažinkite kojelių skaičių eilėje.', 'Use fewer legs in a row.'] }],
  ['eng.legsMoved', /kojelės: \d+ vnt\. pastumtos šonu/, 'info', 'body'],
  ['eng.ledNoPart', /LED \d+: .*LED griovelis nepadarytas/, 'error', 'addons', { hint: ['Šioje vietoje nėra detalės grioveliui — pasirinkite kitą LED vietą.', 'There is no part for the groove here — choose another place for the LED.'] }],
  ['eng.ledDepth', /griovelio gylis .*sumažinta/, 'warn', 'addons'],
  ['eng.ledOut', /LED \d+: griovelis \(.*netelpa detalėje/, 'error', 'addons'],
  ['eng.ledShort', /per trumpa detalė uždaram grioveliui/, 'error', 'addons'],
  ['eng.ledMoved', /LED griovelis kirto .*perkeltas ([\d.]+) → ([\d.]+)/, 'warn', 'addons', { dyn: function (m) { return Math.abs(parseFloat(m[1]) - parseFloat(m[2])) <= 5 ? 'info' : 'warn'; } }],
  ['eng.ledClash', /LED griovelis kerta .*perkelti nėra kur/, 'error', 'addons'],
  ['eng.holesOverlap', /(jungčių|krašto) skylės persidengia/, 'error', 'review', { act: NVC_JC, hint: NVC_H.joints }],
  ['eng.backConf', /nugaros (konfirmatų|viduje) Ø5 skylės .*negali būti gręžiamos/, 'error', 'body', { f: 'c.cnc.backJoint', hint: NVC_H.back, act: { label: ['Nugarą jungti ekscentrikais', 'Fix the back with cam locks'], nv: 'nvcfix', v: 'backcam' } }],
  ['eng.unverJoints', /naujos jungtys, dar nepatikrintos su SWOOD modeliu/, 'info', 'review', { hint: NVC_H.first }],
  /* --- per part */
  ['eng.plateOut', /lanksto plokštelės skylė už šono ribų/, 'error', 'inside'],
  ['eng.unverPlates', /lankstų plokštelių skylės pagal Blum katalogą — NEPATIKRINTA/, 'info', 'cnc', { hint: NVC_H.first }],
  ['eng.unverPins', /lentynų laikiklių skylės pagal standartą — NEPATIKRINTA/, 'info', 'cnc', { hint: NVC_H.first }],
  ['eng.unverTb', /TANDEMBOX viršutinė tvirtinimo skylė 225\.5 — patikrinti/, 'info', 'cnc', { hint: NVC_H.first }],
  ['eng.unverCups', /lankstų puodelių skylės pagal Blum katalogą — NEPATIKRINTA/, 'info', 'cnc', { hint: NVC_H.first }],
  ['eng.insetDoor', /įleistos durys: reikia įleistų durų lankstų/, 'info', 'fronts'],
  /* --- 3-D constructions */
  ['eng.boxSize', /^netinkami matmenys$/, 'error', 'size', { cover: 'size' }],
  ['eng.boxInset', /įleidimas .* per didelis/, 'warn', 'body'],
  ['eng.boxEmpty', /nėra nė vienos plokštės — pridėkite plokštes/, 'error', 'body'],
  ['eng.boxCorner', /kampas .*: (plokštės kertasi|liks tarpas)/, 'error', 'body'],
  ['eng.boxPart', /ne vidinėje erdvėje arba per arti kitos plokštės — praleista/, 'error', 'inside'],
  ['eng.boxShelfOut', /aukštyje: ne vidinėje erdvėje — praleista/, 'error', 'inside'],
  ['eng.boxShelfClose', /aukštyje: per arti kitos lentynos — praleista/, 'error', 'inside'],
  ['eng.boxSmall', /per maža detalė, patikrinkite matmenis/, 'warn', 'body'],
  ['eng.boxThin', /plona plokštė — jungčių negręžiama/, 'info', 'body'],
  ['eng.boxJointClash', /jungčių skylės kertasi su kitomis ir jų nepavyko pastumti/, 'error', 'review', { act: NVC_JC }],
  ['eng.boxJointShift', /jungtys pastumtos .*kad nesusitiktų su kitomis skylėmis/, 'info', 'review'],
  ['eng.camDeep', /ekscentriko varžto skylė .*per gili/, 'error', 'review', { act: NVC_JC, hint: ['Plonai plokštei rinkitės konfirmatus arba kaiščius.', 'Choose confirmats or dowels for a thin board.'] }],
  ['eng.boxShelfNoSide', /šone nėra plokštės laikikliams/, 'error', 'inside'],
  ['eng.markOut', /(bėgelio|lanksto) žymė už plokštės ribų/, 'error', 'fronts'],
  ['eng.markClash', /(bėgelio|lanksto) žymė kliūna už kitos skylės/, 'error', 'fronts'],
  ['eng.boxFrontClosed', /priekio plokštė uždaro konstrukciją/, 'error', 'fronts'],
  ['eng.boxNoOpening', /tokios angos nėra/, 'error', 'fronts'],
  ['eng.boxOpeningUsed', /jau užimta kitų durų/, 'error', 'fronts'],
  ['eng.boxOpeningSmall', /anga per maža fasadui/, 'error', 'fronts'],
  ['eng.boxShelfDrawers', /kertasi su stalčiais/, 'error', 'fronts'],
  ['eng.boxDrawersFit', /stalčiai netelpa į/, 'error', 'fronts', { hint: NVC_H.fewer }],
  ['eng.boxNoSideRunner', /šone nėra plokštės bėgeliui/, 'error', 'fronts'],
  ['eng.boxNoSideHinge', /lankstų pusėje nėra plokštės/, 'error', 'fronts'],
  ['eng.unverBox', /3D konstrukcija: jungtys gręžiamos pagal spintelių taisykles/, 'info', 'review', { hint: NVC_H.first }],
  /* --- the machine (programs) */
  ['eng.holeOut', /ø[\d.]+ (krašto )?skylė už detalės ribų/, 'error', 'review'],
  ['eng.noDrill', /tokio grąžto galvoje nėra, NEPROGRAMUOTA/, 'error', 'cnc', { hint: NVC_H.drill }],
  ['eng.noThrough', /kiaurai ø[\d.]+ — kiauro grąžto nėra/, 'warn', 'cnc', { hint: NVC_H.drill }],
  ['eng.noEdgeDrill', /krašto skylė.* grąžto nėra, NEPROGRAMUOTA/, 'error', 'cnc', { hint: NVC_H.drill }],
  ['eng.longEdge', /skylės ilgame krašte — pasukti 90° negalima/, 'error', 'body', { cover: 'eng.backConf', act: NVC_JC, hint: ['Detalė ilgesnė nei 900 mm — konfirmatų skylių jos ilgame krašte staklės negręžia. Tam sujungimui rinkitės ekscentrikus arba kaiščius.', 'The part is longer than 900 mm — the machine cannot bore confirmat holes in its long edge. Choose cam locks or dowels for that joint.'] }],
  ['eng.clampShort', /pasuktoje programoje X ilgis tik/, 'info', 'cnc', { hint: ['Operatoriui: pasuktoje programoje detalė trumpa — patikrinkite, ar ją laiko prispaudimas.', 'For the operator: the part is short in the turned program — check that the clamps hold it.'] }],
  ['eng.tooBig', /mm > \d+ — netelpa į stakles/, 'error', 'size', { hint: NVC_H.machine }]
];
function nvcClassify(raw) {
  var k = NVC_MEMO.cls[raw]; if (k !== undefined) return k;
  k = -1; for (var i = 0; i < NVC_ENG.length; i++) if (NVC_ENG[i][1].test(raw)) { k = i; break; }
  if (++NVC_MEMO.n > 4000) { NVC_MEMO.n = 0; NVC_MEMO.cls = {}; NVC_MEMO.txt = {}; }
  NVC_MEMO.cls[raw] = k; return k;
}
function nvcTxt(raw) { var key = S.lang + raw, v = NVC_MEMO.txt[key]; if (v === undefined) v = NVC_MEMO.txt[key] = wTxt(raw); return v; }
/* what the sentence is about: the section ("sekcija 2.1", "stalčius 1.2", "durys 594×715", "fasadas 594×57") or the column */
function nvcWhere(raw, X) {
  var c = X.c, n = colsOf(c), ctx = { sec: -1, col: -1, box: -1 }, m, vis = X.r && X.r.visual;
  var near = function (list, w, h) { var hit = null; nvcArr(list).some(function (q) { if (Math.abs(q.w - w) < 0.01 && Math.abs(q.h - h) < 0.01) { hit = q; return true; } return false; }); return hit; };
  if (c.kind === 'box') { if ((m = /fasadai (\d+)/.exec(raw))) ctx.box = +m[1] - 1; return ctx; }
  if ((m = /stalčius (\d+)\.(\d+)(?:\.(\d+))?/.exec(raw))) { if (m[3] != null) { ctx.col = +m[1] - 1; ctx.sec = nvcSecIdx(c, ctx.col, +m[2] - 1); } else { ctx.col = 0; ctx.sec = nvcSecIdx(c, 0, +m[1] - 1); } }
  else if ((m = /sekcija (\d+)(?:\.(\d+))?/.exec(raw))) { if (n > 1 && m[2] != null) { ctx.col = +m[1] - 1; ctx.sec = nvcSecIdx(c, ctx.col, +m[2] - 1); } else { ctx.col = 0; ctx.sec = nvcSecIdx(c, 0, +m[1] - 1); } }
  else if ((m = /durys ([\d.]+)×([\d.]+)/.exec(raw)) && vis) { var d = near(vis.doors, +m[1], +m[2]); if (d) { ctx.col = d.col || 0; ctx.sec = nvcSecIdx(c, ctx.col, d.sec); } }
  else if ((m = /fasadas ([\d.]+)×([\d.]+)/.exec(raw)) && vis) { var f = near(vis.drawers, +m[1], +m[2]); if (f) { ctx.col = f.col || 0; ctx.sec = nvcSecIdx(c, ctx.col, f.sec); } }
  else if ((m = /bėgelio (.+?) L=(\d+)/.exec(raw))) { nvcArr(c.sections).some(function (s, k) { if (s.kind === 'drawers' && s.hw === m[1] && nvcNum(s.rail) === +m[2]) { ctx.sec = k; ctx.col = colOf(c, s); return true; } return false; }); }
  else if ((m = /kolona (\d+)/.exec(raw))) ctx.col = +m[1] - 1;
  if (ctx.sec < 0 && ctx.col < 0) return ctx;
  if (n < 2 && ctx.sec < 0) ctx.col = -1;
  return ctx;
}
function nvcEngine(out, X) {
  var c = X.c, seen = {};
  nvcArr(X.inf && X.inf.warnings).forEach(function (raw) {
    if (typeof raw !== 'string' || !raw) return;
    var k = nvcClassify(raw), e = k >= 0 ? NVC_ENG[k] : null, o = (e && e[4]) || {};
    if (!e) { var lv = level(raw); nvcAdd(out, { id: 'eng.other', sev: lv === 'bad' ? 'error' : lv === 'warn' ? 'warn' : 'info', cab: X.i, c: c, topic: null, msg: nvcTxt(raw), raw: raw }); return; }
    var ctx = nvcWhere(raw, X), sev = e[2], m = o.dyn ? e[1].exec(raw) : null;
    if (o.dyn && m) { try { sev = o.dyn(m, X, ctx) || sev; } catch (er) {} }
    var is = { id: e[0], sev: sev, cab: X.i, c: c, topic: e[3], msg: nvcTxt(raw), raw: raw, _cover: o.cover || null };
    if (ctx.sec >= 0) is.sec = ctx.sec;
    if (ctx.col >= 0) is.col = ctx.col;
    if (o.sf && ctx.sec >= 0) is.field = nvcFid('c.sections.' + ctx.sec + '.' + o.sf);
    else if (o.sf && ctx.box >= 0) is.field = nvcFid('c.box.fronts.' + ctx.box + '.' + o.sf);
    else if (o.f && o.f.indexOf('{k}') >= 0) is.field = ctx.col >= 0 && ctx.col < colsOf(c) - 1 ? nvcFid(o.f.replace('{k}', ctx.col)) : null;   // the last column has no field: it takes the rest
    else if (o.f) is.field = nvcFid(o.f);
    if (o.hint) is.hint = L(o.hint[0], o.hint[1]);
    if (o.tab) is.tab = o.tab;
    if (o.act) { is.act = { label: L(o.act.label[0], o.act.label[1]), i: X.i }; if (o.act.act) is.act.act = o.act.act; else { is.act.nv = o.act.nv; is.act.v = o.act.v; } }
    if (c.kind === 'box' && is.act && is.act.act === 'jcroom') is.topic = 'joints';
    seen[e[0]] = (seen[e[0]] || 0) + 1; is._nth = seen[e[0]];
    nvcAdd(out, is);
  });
}

/* ----------------------------------------------------------------- 2. own rules: the cabinet's numbers */
function nvcDimRules(out, X) {
  var c = X.c, i = X.i, t = X.t, o = nvcObj(c.cnc);
  var NM = { W: ['Plotis', 'Width'], H: ['Aukštis', 'Height'], D: ['Gylis', 'Depth'], dishWidth: ['Indaplovės plotis', 'Dishwasher width'] };
  var bad = function (k, min, what) {   // error: nothing can be cut from this number
    var raw = c[k], v = nvcNum(raw), nm = NM[k], lt, en;
    if (nvcBlank(raw) || (v === 0 && !/[^0\s.,]/.test(String(raw)))) { lt = 'Neįrašytas ' + nm[0].toLowerCase(); en = nm[1] + ' is missing'; }
    else if (!(v > 0)) { lt = nm[0] + ' turi būti skaičius, didesnis už 0 (įrašyta „' + String(raw).slice(0, 20) + '“)'; en = nm[1] + ' must be a number above 0 (typed “' + String(raw).slice(0, 20) + '”)'; }
    else if (v < min) { lt = nm[0] + ' ' + nvcMm(v) + ' mm per mažas — ' + what[0] + ' reikia bent ' + nvcMm(min) + ' mm'; en = nm[1] + ' ' + nvcMm(v) + ' mm is too small — ' + what[1] + ' needs at least ' + nvcMm(min) + ' mm'; }
    else return false;
    nvcAdd(out, { id: 'size.' + k, sev: nvcSev('size'), cab: i, c: c, topic: 'size', field: nvcFid('c.' + k), msg: L(lt, en) }); return true;
  };
  var odd = function (k, lt, en, hl, he) { nvcAdd(out, { id: 'size.' + k + '.odd', sev: nvcSev('size.odd'), cab: i, c: c, topic: 'size', field: nvcFid('c.' + k), msg: L(lt, en), hint: hl ? L(hl, he) : L('Jei taip ir turi būti — patvirtinsite prieš gamybą.', 'If this is intended, you confirm it before production.') }); };
  if (c.kind === 'panel') {   // a loose board: W is its thickness (engine.js :350)
    var w = nvcNum(c.W);
    if (!bad('W', 3, ['plokštei', 'a board']) && w > 100) nvcAdd(out, { id: 'size.W', sev: nvcSev('size'), cab: i, c: c, topic: 'size', field: 'f-c-W', msg: L('Plokštės storis ' + nvcMm(w) + ' mm per didelis — iki 100 mm', 'Board thickness ' + nvcMm(w) + ' mm is too much — up to 100 mm') });
    bad('H', 30, ['plokštei', 'a board']); bad('D', 30, ['plokštei', 'a board']);
    return;
  }
  if (c.dishwasher) {
    var bw = bad('dishWidth', 50, ['fasadui', 'a front']), dw = nvcNum(c.dishWidth); bad('H', 50, ['fasadui', 'a front']);
    if (!bw && !NVC_LIM.dishW.some(function (q) { return dw >= q[0] && dw <= q[1]; })) odd('dishWidth', 'Indaplovės plotis ' + nvcMm(dw) + ' mm — įprasta 450 arba 600', 'Dishwasher width ' + nvcMm(dw) + ' mm — usually 450 or 600');
    return;
  }
  if (c.kind === 'box') { bad('W', 1, ['konstrukcijai', 'a construction']); bad('H', 1, ['konstrukcijai', 'a construction']); bad('D', 1, ['konstrukcijai', 'a construction']); return; }
  var minWH = 2 * t + 60, eW = bad('W', minWH, ['korpusui', 'a carcass']), eH = bad('H', minWH, ['korpusui', 'a carcass']), eD = bad('D', 100, ['korpusui', 'a carcass']);
  var W = nvcNum(c.W), H = nvcNum(c.H), D = nvcNum(c.D), hung = X.kind === 'PAKABINAMOS', tall = !hung && c.type === 'ŪKINĖ', LM = NVC_LIM;
  if (!eW) {
    if (W < LM.minW) odd('W', 'Plotis tik ' + nvcMm(W) + ' mm — neįprastai siaura spintelė', 'Only ' + nvcMm(W) + ' mm wide — an unusually narrow cabinet');
    else if (W > LM.wideW && colsOf(c) === 1) odd('W', 'Plotis ' + nvcMm(W) + ' mm be pertvaros — dugnas ir lentynos links', nvcMm(W) + ' mm wide with no partition — the bottom and shelves will sag', 'Dėkite pertvarą (Vidus → Pertvaros) arba darykite dvi spinteles.', 'Add a partition (Inside → Partitions) or make two cabinets.');
  }
  if (!eH) {
    var rg = hung ? LM.wallH : tall ? LM.tallH : LM.baseH, nm = hung ? ['Pakabinama spintelė', 'A wall cabinet'] : tall ? ['Aukšta spintelė', 'A tall cabinet'] : ['Pastatoma spintelė', 'A base cabinet'];
    if (H < rg[0] || H > rg[1]) odd('H', nm[0] + ' ' + nvcMm(H) + ' mm aukščio — įprasta ' + rg[0] + '–' + rg[1] + ' mm', nm[1] + ' ' + nvcMm(H) + ' mm high — usually ' + rg[0] + '–' + rg[1] + ' mm',
      !hung && !tall && H > rg[1] ? 'Tokio aukščio spintelei rinkitės „Aukšta“ — jos viršus ir nugara kitokie.' : null, 'For this height choose a tall cabinet — its top and back differ.');
  }
  if (!eD) {
    var mx = hung ? LM.maxWallD : LM.maxD;
    if (D < LM.minD) odd('D', 'Gylis tik ' + nvcMm(D) + ' mm — neįprastai sekli spintelė', 'Only ' + nvcMm(D) + ' mm deep — an unusually shallow cabinet');
    else if (D > mx) odd('D', 'Gylis ' + nvcMm(D) + ' mm — neįprastai gili spintelė (įprasta iki ' + mx + ')', nvcMm(D) + ' mm deep — unusually deep (usually up to ' + mx + ')');
  }
  /* thicknesses: a blank one is silently cut as 18 */
  var tr = nvcNum(c.thick);
  if (!(tr > 0)) nvcAdd(out, { id: 'thick.none', cab: i, c: c, topic: 'size', field: 'f-c-thick', msg: L('Plokštės storis neįrašytas — skaičiuojama 18 mm', 'Board thickness is missing — 18 mm is used') });
  else if (tr < LM.thick[0] || tr > LM.thick[1]) nvcAdd(out, { id: 'thick.odd', cab: i, c: c, topic: 'size', field: 'f-c-thick', msg: L('Korpuso plokštė ' + nvcMm(tr) + ' mm — neįprastas storis (dažniausiai 16–25)', 'Carcass board ' + nvcMm(tr) + ' mm — an unusual thickness (mostly 16–25)') });
  var ft = nvcNum(o.facadeT), hasF = X.P.some(nvcFront);
  if (hasF && !(ft > 0)) nvcAdd(out, { id: 'front.thick', cab: i, c: c, topic: 'size', field: 'f-c-cnc-facadeT', msg: L('Fasadų storis neįrašytas — skaičiuojama 18 mm', 'Front thickness is missing — 18 mm is used') });
  else if (hasF && (ft < LM.frontT[0] || ft > LM.frontT[1])) nvcAdd(out, { id: 'front.thick', cab: i, c: c, topic: 'size', field: 'f-c-cnc-facadeT', msg: L('Fasadai ' + nvcMm(ft) + ' mm — neįprastas storis (dažniausiai 16–22)', 'Fronts ' + nvcMm(ft) + ' mm — an unusual thickness (mostly 16–22)') });
  /* cam locks: the bolt hole in the face is 15 deep — a board under 17 mm is drilled almost through (the engine checks it only for 3-D constructions) */
  var need = (+E.R.cam.bolt.depthFace || 15) + 2, cam = nvcArr(X.r && X.r.joints).some(function (j) { return j.type === 'cam' || (j.sides && ((j.sides.L && j.sides.L.type === 'cam') || (j.sides.R && j.sides.R.type === 'cam'))); });
  if (cam && tr > 0 && tr < need) nvcAdd(out, { id: 'thick.cam', cab: i, c: c, topic: 'body', msg: L('Ekscentrikų skylės ' + nvcMm(need - 2) + ' mm gylio — ' + nvcMm(tr) + ' mm plokštė per plona', 'Cam-lock holes are ' + nvcMm(need - 2) + ' mm deep — a ' + nvcMm(tr) + ' mm board is too thin'),
    hint: L('Junkite konfirmatais ar kaiščiais arba rinkitės bent ' + nvcMm(need) + ' mm plokštę.', 'Join with confirmats or dowels, or use a board of at least ' + nvcMm(need) + ' mm.'), act: { label: L(NVC_JC.label[0], NVC_JC.label[1]), act: 'jcroom', i: i } });
  /* legs: a blank height means 100 */
  if (o.legs && !o.feet && c.hang !== true) {
    var lh = nvcNum(c.legH);
    if (!(lh > 0)) nvcAdd(out, { id: 'legs.h', cab: i, c: c, topic: 'body', field: 'f-c-legH', msg: L('Kojelių aukštis neįrašytas — skaičiuojama 100 mm', 'Leg height is missing — 100 mm is used') });
    else if (lh < LM.legH[0] || lh > LM.legH[1]) nvcAdd(out, { id: 'legs.h', cab: i, c: c, topic: 'body', field: 'f-c-legH', msg: L('Kojelės ' + nvcMm(lh) + ' mm — neįprastas aukštis (įprasta 100–150)', 'Legs ' + nvcMm(lh) + ' mm — an unusual height (usually 100–150)') });
  }
}

/* ----------------------------------------------------------------- columns, sections, drawers, doors, shelves */
function nvcInsideRules(out, X) {
  var c = X.c, i = X.i, n = colsOf(c), secs = nvcArr(c.sections), LM = NVC_LIM, vis = nvcObj(X.r && X.r.visual), gap = E.R.facade.gap;
  /* stored column widths that do not fit: the parts are silently cut as equal columns (colWidths) */
  if (n > 1 && Array.isArray(c.colW) && c.colW.length) {
    var st = c.colW.map(nvcNum), real = colWidths(c), fits = st.length === n && real.slice(0, n - 1).every(function (v, k) { return Math.abs(v - st[k]) < 0.6; });
    if (!fits) nvcAdd(out, { id: 'col.fit', cab: i, c: c, topic: 'inside', field: 'f-c-colW-0', col: 0,
      msg: L('Įrašyti kolonų pločiai (' + st.slice(0, n - 1).map(nvcMm).join(' + ') + ' mm) netelpa į ' + nvcMm(c.W) + ' mm spintelę — detalės pjaunamos lygiomis kolonomis po ' + nvcMm(real[0]) + ' mm', 'The column widths typed (' + st.slice(0, n - 1).map(nvcMm).join(' + ') + ' mm) do not fit a ' + nvcMm(c.W) + ' mm cabinet — the parts are cut as equal columns of ' + nvcMm(real[0]) + ' mm'),
      hint: L('Įrašykite pločius, kurių suma mažesnė už spintelės plotį (paskutinei kolonai turi likti bent 50 mm).', 'Type widths that add up to less than the cabinet width (the last column needs at least 50 mm).'),
      act: { label: L('Palikti lygias kolonas', 'Keep equal columns'), nv: 'nvcfix', v: 'colseq', i: i } });
  }
  var byCol = []; for (var k0 = 0; k0 < n; k0++) byCol.push([]);
  secs.forEach(function (s, k) {
    if (!s || typeof s !== 'object') return;
    if (!/^(drawers|doors|cargo|open|oven)$/.test(s.kind)) { nvcAdd(out, { id: 'sec.kind', cab: i, c: c, topic: 'inside', sec: k, col: colOf(c, s), msg: L('Sekcija ' + nvcSecName(c, k) + ' nežinomo tipo („' + String(s.kind).slice(0, 16) + '“) — iš jos nieko nepagaminama', 'Section ' + nvcSecName(c, k) + ' has an unknown kind (“' + String(s.kind).slice(0, 16) + '”) — nothing is made from it'), hint: L('Ištrinkite ją ir pridėkite iš naujo.', 'Delete it and add it again.') }); }
    byCol[colOf(c, s)].push(k);
  });
  for (var col = 0; col < n; col++) (function (col) {
    var list = byCol[col], cn = n > 1 ? nvcColName(c, col) : '';
    if (!list.length) {
      nvcAdd(out, { id: 'sec.none', cab: i, c: c, topic: 'inside', col: col,
        msg: n > 1 ? L(cn + ' kolona tuščia — joje nėra nė vienos sekcijos', 'The ' + cn.toLowerCase() + ' column is empty — it has no section') : L('Spintelėje nėra sekcijų — tik tuščias korpusas', 'The cabinet has no sections — only an empty carcass'),
        hint: L('Pridėkite stalčius, duris ar lentynas. Atvirai nišai — „Lentynos“ su 0 lentynų.', 'Add drawers, doors or shelves. For an open niche use “Shelves” with 0 shelves.') });
      return;
    }
    var z = zoneInfo(c, col);
    if (z.over) {
      var big = -1; list.forEach(function (k) { var s = secs[k]; if (!s.fill && (big < 0 || nvcNum(s.height) > nvcNum(secs[big].height))) big = k; });
      nvcAdd(out, { id: 'sec.over', cab: i, c: c, topic: 'inside', col: col, sec: big >= 0 ? big : undefined, field: big >= 0 ? nvcFid('c.sections.' + big + '.height') : null,
        msg: L((cn ? cn + ' kolona: s' : 'S') + 'ekcijos ' + nvcMm(z.exp) + ' mm netelpa į ' + nvcMm(z.Hz) + ' mm fasadų zoną — per daug ' + nvcMm(z.exp - z.Hz) + ' mm', (cn ? cn + ' column: s' : 'S') + 'ections of ' + nvcMm(z.exp) + ' mm do not fit the ' + nvcMm(z.Hz) + ' mm front zone — ' + nvcMm(z.exp - z.Hz) + ' mm too much'),
        hint: L('Sumažinkite sekcijų aukščius arba vienai pažymėkite „Užima likusį aukštį“.', 'Make the sections lower or let one of them take the remaining height.') });
    } else if (!z.nFill && z.Hz - z.exp > 1) {
      nvcAdd(out, { id: 'sec.gap', cab: i, c: c, topic: 'inside', col: col, sec: list[list.length - 1],
        msg: L((cn ? cn + ' kolona: v' : 'V') + 'iršuje lieka ' + nvcMm(z.Hz - z.exp) + ' mm be fasado — nė viena sekcija neužima likusio aukščio', (cn ? cn + ' column: ' : '') + nvcMm(z.Hz - z.exp) + ' mm at the top has no front — no section takes the remaining height'),
        hint: L('Vienai sekcijai pažymėkite „Užima likusį aukštį“ arba padidinkite aukščius.', 'Let one section take the remaining height, or make the sections taller.') });
    }
    list.forEach(function (k, si) {
      var s = secs[k], secH = s.fill ? z.fillH : Math.max(0, nvcNum(s.height)), nm = nvcSecName(c, k), b = 'c.sections.' + k + '.';
      if (s.kind === 'drawers') {
        var nd = Math.max(1, Math.round(nvcNum(s.nDrawers) || 1)), fr = nvcArr(vis.drawers).filter(function (f) { return (f.col || 0) === col && f.sec === si; });
        var hs = fr.length ? fr.map(function (f) { return f.h; }) : [secH / nd - gap], lo = Math.min.apply(null, hs), hi = Math.max.apply(null, hs), fw = fr.length ? fr[0].w : 0;
        var tb = s.hw === 'BLUM TANDEMBOX', min = tb ? LM.frontMinTb : LM.frontMin;
        if (secH > 0 && lo < min - 0.01 && !z.over) {
          var fit = Math.max(1, Math.floor(secH / (min + gap)));
          nvcAdd(out, { id: 'drawer.low', sev: nvcSev(tb ? 'drawer.low' : 'drawer.low.soft'), cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'nDrawers'),
            msg: L('Sekcija ' + nm + ': stalčiaus fasadas tik ' + nvcMm(lo) + ' mm — per žemas ' + (tb ? 'TANDEMBOX tvirtinimui (reikia bent 99 mm)' : 'stalčiui (bent ' + min + ' mm)'), 'Section ' + nm + ': a drawer front of only ' + nvcMm(lo) + ' mm — too low ' + (tb ? 'for the TANDEMBOX fixing (at least 99 mm)' : 'for a drawer (at least ' + min + ' mm)')),
            hint: L(nvcMm(secH) + ' mm aukštyje telpa iki ' + fit + ' stalč.', 'A height of ' + nvcMm(secH) + ' mm takes up to ' + fit + ' drawer(s).'),
            act: fit < nd && !(s.frontH && Object.keys(s.frontH).length) ? { label: L('Palikti ' + fit, 'Keep ' + fit), nv: 'nvcfix', v: 'ndrawers:' + k + ':' + fit, i: i } : undefined });
        }
        if (hi > LM.frontMax && !z.over) nvcAdd(out, { id: 'drawer.high', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(s.fill ? b + 'nDrawers' : b + 'height'),
          msg: L('Sekcija ' + nm + ': stalčiaus fasadas ' + nvcMm(hi) + ' mm aukščio — per aukštas stalčiui', 'Section ' + nm + ': a drawer front ' + nvcMm(hi) + ' mm high — too tall for a drawer'),
          hint: L('Padidinkite stalčių skaičių arba sekcijai įrašykite aukštį.', 'Use more drawers or give the section a fixed height.') });
        if (fw > 0 && fw < LM.drawerMinW) nvcAdd(out, { id: 'drawer.narrow', cab: i, c: c, topic: 'inside', sec: k, col: col,
          msg: L('Sekcija ' + nm + ': stalčiaus fasadas tik ' + nvcMm(fw) + ' mm pločio — per siaura stalčiui su bėgeliais', 'Section ' + nm + ': a drawer front only ' + nvcMm(fw) + ' mm wide — too narrow for a drawer on runners'),
          hint: L('Platinkite spintelę ar koloną arba darykite duris.', 'Widen the cabinet or the column, or make it a door.') });
        /* the runner against the depth: the engine checks it for ball, undermount and MERIVOBOX runners only */
        var rt = E.R.runner[s.hw], rail = nvcNum(s.rail) || 500, lens = railLengths(s.hw);
        if (lens.indexOf(rail) < 0) nvcAdd(out, { id: 'drawer.raillen', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'rail'),
          msg: L('Sekcija ' + nm + ': ' + nvcMm(rail) + ' mm bėgelių „' + s.hw + '“ nėra', 'Section ' + nm + ': “' + s.hw + '” has no ' + nvcMm(rail) + ' mm runners'), hint: L('Galimi ilgiai: ' + lens.join(', ') + '.', 'Lengths made: ' + lens.join(', ') + '.') });
        if (!(rt && (rt.ball || rt.under || rt.merivo))) {
          var room = nvcRoom(c, X.r, col);
          if (room > 0 && rail + LM.railPlus > room + 0.01) {
            var ok = lens.filter(function (l) { return l + LM.railPlus <= room + 0.01; }), best = ok.length ? Math.max.apply(null, ok) : 0;
            nvcAdd(out, { id: 'drawer.rail', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'rail'),
              msg: L('Sekcija ' + nm + ': ' + nvcMm(rail) + ' mm bėgelis netelpa — vidinis gylis ' + nvcMm(room) + ' mm, reikia ' + nvcMm(rail + LM.railPlus), 'Section ' + nm + ': the ' + nvcMm(rail) + ' mm runner does not fit — inside depth ' + nvcMm(room) + ' mm, it needs ' + nvcMm(rail + LM.railPlus)),
              hint: best ? L('Tinka iki ' + best + ' mm.', 'Up to ' + best + ' mm fits.') : L('Šiam gyliui šių bėgelių nėra — gilinkite spintelę.', 'No runner of this kind fits this depth — make the cabinet deeper.'),
              act: best ? { label: L('Parinkti ' + best + ' mm', 'Use ' + best + ' mm'), nv: 'nvcfix', v: 'rail:' + k + ':' + best, i: i } : undefined });
          }
        }
      }
      if (s.kind === 'doors' && !s.fridge) {
        var drs = nvcArr(vis.doors).filter(function (d) { return (d.col || 0) === col && d.sec === si && d.hinged && !d.cargo && !d.fridge; });
        if (drs.length) {
          var d0 = drs[0], hn = nvcNum(s.hingeN), needN = E.hingesPerDoor(d0.h);
          if (d0.w > LM.doorMaxW + 0.01) nvcAdd(out, { id: 'door.wide', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'nDoors'),
            msg: L('Sekcija ' + nm + ': durys ' + nvcMm(d0.w) + ' mm pločio — per plačios lankstams (iki ' + LM.doorMaxW + ' mm)', 'Section ' + nm + ': a door ' + nvcMm(d0.w) + ' mm wide — too wide for hinges (up to ' + LM.doorMaxW + ' mm)'),
            hint: L('Darykite dvejas duris arba dėkite pertvarą.', 'Make two doors or add a partition.') });
          else if (d0.w < LM.doorMinW) nvcAdd(out, { id: 'door.narrow', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'nDoors'),
            msg: L('Sekcija ' + nm + ': durys tik ' + nvcMm(d0.w) + ' mm pločio', 'Section ' + nm + ': a door only ' + nvcMm(d0.w) + ' mm wide'), hint: L('Sumažinkite durų skaičių.', 'Use fewer doors.') });
          if (d0.h > LM.doorMaxH) nvcAdd(out, { id: 'door.tall', cab: i, c: c, topic: 'inside', sec: k, col: col,
            msg: L('Sekcija ' + nm + ': durys ' + nvcMm(d0.h) + ' mm aukščio — tokios aukštos durys išsikraipo', 'Section ' + nm + ': a door ' + nvcMm(d0.h) + ' mm high — a door this tall warps'),
            hint: L('Dalinkite į dvi sekcijas arba dėkite durų tiesintuvą.', 'Split it into two sections or fit a door straightener.') });
          if (hn >= 2 && hn < needN) nvcAdd(out, { id: 'door.hinges', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'hingeN'),
            msg: L('Sekcija ' + nm + ': ' + nvcMm(d0.h) + ' mm durims reikia ' + needN + ' lankstų, nurodyta ' + hn, 'Section ' + nm + ': a ' + nvcMm(d0.h) + ' mm door needs ' + needN + ' hinges, ' + hn + ' are set'),
            act: { label: L('Skaičiuoti pagal aukštį', 'Count by height'), nv: 'nvcfix', v: 'hingen:' + k, i: i } });
        }
      }
      if ((s.kind === 'doors' && !s.fridge) || s.kind === 'open') {
        var ns = Math.round(nvcNum(s.shelves)), clr = ns > 0 ? (secH - ns * X.t) / (ns + 1) : 999;
        if (ns > 1 && secH > 0 && clr < LM.shelfGap && !z.over) nvcAdd(out, { id: 'shelf.dense', cab: i, c: c, topic: 'inside', sec: k, col: col, field: nvcFid(b + 'shelves'),
          msg: L('Sekcija ' + nm + ': ' + ns + ' lentynų ' + nvcMm(secH) + ' mm aukštyje — tarp jų lieka ' + nvcMm(Math.max(0, clr)) + ' mm', 'Section ' + nm + ': ' + ns + ' shelves in ' + nvcMm(secH) + ' mm — ' + nvcMm(Math.max(0, clr)) + ' mm between them'),
          hint: L('Sumažinkite lentynų skaičių.', 'Use fewer shelves.') });
      }
    });
  })(col);
  /* a long shelf with nothing under it sags */
  var span = 0; X.P.forEach(function (p) { if (p.role !== 'LENTYNA') return; var u = p.place && p.place.u, along = u && Math.abs(u[0]) < 0.5 ? p.W : p.L; if (along > span) span = along; });   // the side that runs across the cabinet
  if (span > LM.shelfSpan + 0.01) nvcAdd(out, { id: 'shelf.span', cab: i, c: c, topic: 'inside',
    msg: L('Lentyna ' + nvcMm(span) + ' mm be atramos — įlinks (iki ' + LM.shelfSpan + ' mm)', 'A shelf of ' + nvcMm(span) + ' mm with no support — it will sag (up to ' + LM.shelfSpan + ' mm)'),
    hint: L('Dėkite pertvarą arba siaurinkite spintelę.', 'Add a partition or make the cabinet narrower.') });
}

/* ----------------------------------------------------------------- materials, edges, extra parts, worktop */
function nvcMatRules(out, X) {
  var c = X.c, i = X.i, mat = nvcObj(c.mat), ed = nvcObj(c.edge), P = X.P, has = function (v) { return !!nvcStr(v); };
  var fronts = P.filter(nvcFront), visP = P.filter(function (p) { return p.vis; });
  var needF = fronts.length > 0 || visP.length > 0 || (!X.inf && (c.dishwasher || nvcArr(c.sections).some(function (s) { return s && /^(drawers|doors|cargo)$/.test(s.kind); })));
  var carcP = c.dishwasher ? [] : P.filter(function (p) { return !nvcFront(p); });
  if (!c.dishwasher && !has(mat.carc)) nvcAdd(out, { id: 'mat.carc', cab: i, c: c, topic: 'mats', field: 'f-c-mat-carc',
    msg: c.kind === 'panel' ? L('Nenurodyta plokštės medžiaga', 'The board has no material') : L('Nenurodyta korpuso medžiaga', 'No carcass material'),
    hint: L('Be medžiagos detalės patektų į sąrašą be plokštės pavadinimo.', 'Without it the parts go to the list with no board name.') });
  if (needF && !has(mat.facade) && c.kind !== 'panel') nvcAdd(out, { id: 'mat.facade', cab: i, c: c, topic: 'mats', field: 'f-c-mat-facade',
    msg: L('Nenurodyta fasadų medžiaga' + (has(mat.carc) && !c.dishwasher ? ' — fasadai būtų pjaunami iš korpuso plokštės' : ''), 'No front material' + (has(mat.carc) && !c.dishwasher ? ' — the fronts would be cut from the carcass board' : '')) });
  if (P.some(function (p) { return p.role === 'NUGARA'; }) && !has(mat.back) && has(mat.carc)) nvcAdd(out, { id: 'mat.back', cab: i, c: c, topic: 'mats', field: 'f-c-mat-back',
    msg: L('Nenurodyta nugaros medžiaga — nugara bus iš korpuso plokštės', 'No back material — the back is cut from the carcass board'), hint: L('Jei taip ir turi būti, įrašykite tą pačią medžiagą.', 'If that is intended, type the same material.') });
  /* edges: an empty carcass edge is exported under the placeholder name, an empty front edge means fronts with no banding */
  var ph = function (p) { return p.eb && ['y0', 'y1', 'x0', 'x1'].some(function (e) { return p.eb[e] === 'KRAŠTAS'; }); };
  if (!has(ed.carc) && P.some(ph)) nvcAdd(out, { id: 'edge.carc', cab: i, c: c, topic: 'mats', field: 'f-c-edge-carc',
    msg: c.kind === 'panel' ? L('Nenurodytas plokštės kraštas — etiketėse būtų „KRAŠTAS“', 'The board has no edge band — the labels would read “KRAŠTAS”') : L('Nenurodytas korpuso kraštas — etiketėse būtų „KRAŠTAS“', 'No carcass edge band — the labels would read “KRAŠTAS”') });
  if (fronts.length && !has(ed.facade)) nvcAdd(out, { id: 'edge.facade', cab: i, c: c, topic: 'mats', field: 'f-c-edge-facade',
    msg: L('Nenurodytas fasadų kraštas — fasadai liktų nelaminuoti', 'No front edge band — the fronts would get no banding') });
  /* a material whose name says another thickness than the parts: the workbook marks those rows yellow (report.js) */
  var seen = {}, flag = function (nm, T, where) { var th = nvcThk(nm); if (!(th > 0) || !(T > 0) || Math.abs(th - T) <= 0.3 || seen[nm]) return; seen[nm] = 1;
    var f = nm === mat.carc ? 'f-c-mat-carc' : nm === mat.facade ? 'f-c-mat-facade' : nm === mat.back ? 'f-c-mat-back' : nm === mat.drawer ? 'f-c-mat-drawer' : nm === mat.top ? 'f-c-mat-top' : where || null;
    nvcAdd(out, { id: 'mat.thick', cab: i, c: c, topic: where && where.indexOf('worktop') > 0 ? 'addons' : where ? 'addons' : 'mats', field: f,
      msg: L('Medžiaga „' + nm + '“ — ' + nvcMm(th) + ' mm, o detalės pjaunamos ' + nvcMm(T) + ' mm storio', 'Material “' + nm + '” is ' + nvcMm(th) + ' mm, but the parts are cut ' + nvcMm(T) + ' mm thick'),
      hint: L('Pataisykite medžiagą arba storį — kitaip detalių sąraše šios eilutės bus pažymėtos „PATIKRINTI“.', 'Correct the material or the thickness — otherwise these rows are marked “PATIKRINTI” in the part list.') }); };
  P.forEach(function (p) { if (p.mat) flag(p.mat, p.T, null); });
  /* worktop */
  var wt = nvcObj(c.worktop);
  if (wt.on && !c.dishwasher && c.kind !== 'panel') {
    if (!has(wt.mat)) nvcAdd(out, { id: 'wt.mat', cab: i, c: c, topic: 'addons', field: 'f-c-worktop-mat', msg: L('Nenurodyta stalviršio medžiaga', 'No worktop material') });
    else flag(nvcStr(wt.mat), nvcNum(wt.T) || E.WT_DEF.T, 'f-c-worktop-mat');
    if (has(wt.mat) && !has(wt.edge)) nvcAdd(out, { id: 'wt.edge', cab: i, c: c, topic: 'addons', field: 'f-c-worktop-edge',
      msg: L('Nenurodytas stalviršio kraštas — jo galai ir priekis liks nelaminuoti', 'No worktop edge band — its front and ends get no banding'), hint: L('Akmens ar kompaktinei plokštei taip ir turi būti.', 'For stone or compact boards that is as intended.') });
  }
  /* extra parts: what buildProjectAll() would leave out or change without a word */
  nvcArr(c.extras).forEach(function (x, k) {
    if (!x || typeof x !== 'object') return;
    var nm = nvcStr(x.name) || 'DETALĖ', b = 'c.extras.' + k + '.', Lx = nvcNum(x.L), Wx = nvcNum(x.W), made = !(x.qty !== '' && x.qty != null && !(nvcNum(x.qty) > 0));
    if (!(Lx > 0 && Wx > 0)) { nvcAdd(out, { id: 'extra.size', cab: i, c: c, topic: 'addons', field: nvcFid(b + (Lx > 0 ? 'W' : 'L')),
      msg: L('Papildoma detalė „' + nm + '“ be ' + (Lx > 0 ? 'pločio' : 'ilgio') + ' — į sąrašą nepatektų', 'Extra part “' + nm + '” has no ' + (Lx > 0 ? 'width' : 'length') + ' — it would be left out of the list'), hint: L('Įrašykite matmenis arba ištrinkite detalę.', 'Type its size or delete the part.') }); return; }
    if (!made) { nvcAdd(out, { id: 'extra.qty', cab: i, c: c, topic: 'addons', field: nvcFid(b + 'qty'), msg: L('Papildomos detalės „' + nm + '“ kiekis 0 — ji nebus gaminama', 'Extra part “' + nm + '” has quantity 0 — it will not be made'), hint: L('Įrašykite kiekį arba ištrinkite detalę.', 'Type a quantity or delete the part.') }); return; }
    var xm = nvcStr(x.mat) || nvcStr(mat.carc);
    if (!xm) nvcAdd(out, { id: 'extra.mat', cab: i, c: c, topic: 'addons', field: nvcFid(b + 'mat'), msg: L('Papildoma detalė „' + nm + '“ be medžiagos', 'Extra part “' + nm + '” has no material') });
    else flag(xm, nvcNum(x.T) || nvcNum(c.thick) || 18, nvcFid(b + 'mat'));
    var em = nvcStr(x.edgeMat) || (nvcStr(x.mat) && x.mat === mat.facade ? nvcStr(ed.facade) : nvcStr(ed.carc));
    if (!em && (x.e1 || x.e2 || x.e3 || x.e4)) nvcAdd(out, { id: 'extra.edge', cab: i, c: c, topic: 'addons', field: nvcFid(b + 'edgeMat'),
      msg: L('Papildomos detalės „' + nm + '“ kraštai pažymėti, bet krašto medžiagos nėra — liktų nelaminuota', 'Extra part “' + nm + '” has edges ticked but no edge band — it would get no banding'),
      hint: L('Įrašykite krašto medžiagą (detalei arba spintelei).', 'Type an edge band (for the part or for the cabinet).') });
  });
}

/* ----------------------------------------------------------------- the parts themselves */
function nvcPartRules(out, X) {
  var c = X.c, i = X.i, P = X.P, G = X.G, LM = NVC_LIM, big = [], small = [], progs = [], odd = [];
  var board = function (m) { var b = (G.boards || {})[m] || {}, bw = (nvcNum(b.W) || G.nd.W) - 2 * G.nd.trim, bh = (nvcNum(b.H) || G.nd.H) - 2 * G.nd.trim; return { w: bw, h: bh, grain: !!b.grain, W: nvcNum(b.W) || G.nd.W, H: nvcNum(b.H) || G.nd.H }; };
  var fitsB = function (Lp, Wp, m) { var b = board(m); return b.grain ? (Lp <= b.w + 0.01 && Wp <= b.h + 0.01) : (Math.max(Lp, Wp) <= Math.max(b.w, b.h) + 0.01 && Math.min(Lp, Wp) <= Math.min(b.w, b.h) + 0.01); };
  var M = E.R.machine, yE = E.R.drills.yEdges, xE = E.R.drills.xEnds;
  P.forEach(function (p) {
    if (!(p.L > 0 && p.W > 0)) return;
    if (!fitsB(p.L, p.W, p.mat || '')) big.push({ s: p.short, L: p.L, W: p.W, m: p.mat || '' });
    if (Math.min(p.L, p.W) < LM.partMin - 0.01 && p.role !== 'PLOKSTE') small.push(p.short + ' ' + nvcMm(p.L) + '×' + nvcMm(p.W));
    if (Math.abs(p.L * 10 - Math.round(p.L * 10)) > 1e-6 || Math.abs(p.W * 10 - Math.round(p.W * 10)) > 1e-6) odd.push(p.short + ' ' + nvcMm(p.L) + '×' + nvcMm(p.W));
    /* three programs (face, other face, turned) — as programs() decides it (engine.js :1818): the label has room for two QR codes */
    var a = 0, b = 0; nvcArr(p.holes).forEach(function (h) { if (!h.through) { if (h.face === 'A') a++; else b++; } }); nvcArr(p.grooves).forEach(function (g) { if (g.face === 'A') a++; else b++; });
    if (a > 0 && b > 0 && p.L <= M.maxY + 1e-6 && p.W <= M.maxY + 1e-6 && nvcArr(p.edges).some(function (e) { return (e.edge === 'y0' || e.edge === 'y1') && yE.indexOf(e.d) < 0 && xE.indexOf(e.d) >= 0; })) progs.push(p.short);
  });
  nvcArr(c.extras).forEach(function (x) {
    if (!x || typeof x !== 'object') return; var Lx = nvcNum(x.L), Wx = nvcNum(x.W);
    if (!(Lx > 0 && Wx > 0) || (x.qty !== '' && x.qty != null && !(nvcNum(x.qty) > 0))) return;
    var m = nvcStr(x.mat) || nvcStr(nvcObj(c.mat).carc);
    if (!fitsB(Lx, Wx, m)) big.push({ s: nvcStr(x.name) || 'DETALĖ', L: Lx, W: Wx, m: m });
  });
  var names = function (l) { return l.slice(0, 3).join(', ') + (l.length > 3 ? L(' ir dar ' + (l.length - 3), ' and ' + (l.length - 3) + ' more') : ''); };
  if (big.length) { var b0 = board(big[0].m);
    nvcAdd(out, { id: 'part.big', cab: i, c: c, topic: 'size',
      msg: L('Detalė ' + names(big.map(function (q) { return q.s + ' ' + nvcMm(q.L) + '×' + nvcMm(q.W); })) + ' netelpa į plokštę ' + b0.W + '×' + b0.H + ' mm', 'Part ' + names(big.map(function (q) { return q.s + ' ' + nvcMm(q.L) + '×' + nvcMm(q.W); })) + ' does not fit the ' + b0.W + '×' + b0.H + ' mm board'),
      hint: L('Mažinkite spintelę arba dalinkite detalę. Kitokią plokštę šiai medžiagai nurodysite lange „Plokštės“' + (b0.grain ? ' (tekstūra neleidžia detalės pasukti).' : '.'), 'Make the cabinet smaller or split the part. Another board size for this material is set on the Boards page' + (b0.grain ? ' (the grain keeps the part from turning).' : '.')) }); }
  if (small.length) nvcAdd(out, { id: 'part.small', cab: i, c: c, topic: 'size', msg: L('Labai maža detalė: ' + names(small) + ' mm — staklės jos gali neišlaikyti', 'A very small part: ' + names(small) + ' mm — the machine may not hold it'), hint: L('Siauresnės nei ' + LM.partMin + ' mm detalės pjaunamos ir gręžiamos rankomis.', 'Parts under ' + LM.partMin + ' mm are cut and drilled by hand.') });
  if (progs.length) nvcAdd(out, { id: 'part.progs', cab: i, c: c, topic: 'review', msg: L('Detalė ' + names(progs) + ' turi 3 programas — etiketėje telpa tik 2 QR kodai', 'Part ' + names(progs) + ' has 3 programs — the label holds only 2 QR codes'), hint: L('Trečią programą operatorius paleidžia pagal sąrašą.', 'The operator runs the third program from the list.') });
  if (odd.length) nvcAdd(out, { id: 'part.round', cab: i, c: c, topic: 'size', msg: L('Matmenys su trupmena: ' + names(odd) + ' mm (sąraše apvalinama iki 0,1 mm)', 'Sizes with fractions: ' + names(odd) + ' mm (rounded to 0.1 mm in the list)') });
}

/* ----------------------------------------------------------------- one cabinet */
function nvcCabinet(out, proj, i, inf, G) {
  var c = proj.cabinets[i]; if (!c || typeof c !== 'object') return;
  var r = inf && inf.r ? inf.r : null, X = { c: c, i: i, inf: inf, r: r, P: nvcArr(r && r.panels), G: G, t: nvcNum(c.thick) || 18, kind: null };
  try { X.kind = cabKind(c); } catch (e) { X.kind = c.type; }
  var from = out.length;
  nvcRun(out, 'dims', i, function () { nvcDimRules(out, X); });
  var sizeBad = out.slice(from).some(function (x) { return x.sev === 'error'; });
  if (!sizeBad && c.kind !== 'panel' && c.kind !== 'box' && !c.dishwasher) nvcRun(out, 'inside', i, function () { nvcInsideRules(out, X); });
  nvcRun(out, 'mats', i, function () { nvcMatRules(out, X); });
  if (r) nvcRun(out, 'parts', i, function () { nvcPartRules(out, X); });
  var own = out.slice(from), mine = [];
  if (inf) nvcRun(out, 'engine', i, function () { nvcEngine(mine, X); });
  /* an engine line that an own rule already says with numbers and a field is dropped; many alike are folded into three */
  mine.forEach(function (x) {
    var cv = x._cover, nth = x._nth; delete x._cover; delete x._nth;
    if (cv && own.concat(mine).some(function (q) { return q !== x && cv.split('|').some(function (id) { return q.id.indexOf(id) === 0; }) && (q.sev === 'error' || q.sev === x.sev) && (x.col == null || q.col == null || q.col === x.col); })) return;
    if (nth > 3) { var third = out.filter(function (q) { return q.cab === i && q.id === x.id; })[2]; if (third) { third._more = (third._more || 0) + 1; third.msg = third._msg0 || (third._msg0 = third.msg); third.msg += L(' (ir dar ' + third._more + ')', ' (and ' + third._more + ' more)'); } return; }
    out.push(x);
  });
  if (r && !X.P.length && !out.slice(from).some(function (x) { return x.sev === 'error'; })) nvcAdd(out, { id: 'cab.noparts', cab: i, c: c, topic: 'size', msg: L('Iš šios spintelės nepagaminama nė viena detalė', 'No part at all is made from this cabinet'), hint: L('Patikrinkite matmenis ir konstrukciją.', 'Check its size and construction.') });
  /* the two confirmations of the live app (app.js jcNeeded / ecNeeded): open until the person has looked and confirmed */
  if (r) nvcRun(out, 'confirm', i, function () {
    if (jcNeeded(c, r)) nvcAdd(out, { id: 'confirm.joints', cab: i, c: c, topic: c.kind === 'box' ? 'joints' : 'review',
      msg: c.jointsOk ? L('Sujungimai pasikeitė — patvirtinkite iš naujo', 'The joints changed — confirm them again') : L('Sujungimai dar nepatvirtinti', 'The joints are not confirmed yet'),
      hint: L('Peržiūrėkite, kur ir kuo jungiamos detalės, ir patvirtinkite.', 'Look where and with what the parts are joined, then confirm.'), act: { label: L('Peržiūrėti sujungimus', 'Review the joints'), act: 'jcroom', i: i } });
    if (ecNeeded(c, r)) nvcAdd(out, { id: 'confirm.edges', cab: i, c: c, topic: 'review',
      msg: c.edgesOk ? L('Kraštų laminavimas pasikeitė — patvirtinkite iš naujo', 'The edge banding changed — confirm it again') : L('Kraštų laminavimas dar nepatvirtintas', 'The edge banding is not confirmed yet'),
      hint: L('Peržiūrėkite, kurie kraštai laminuojami, ir patvirtinkite.', 'Look which edges are banded, then confirm.'), act: { label: L('Peržiūrėti kraštus', 'Review the edges'), act: 'ecroom', i: i } });
  });
}

/* ----------------------------------------------------------------- the project */
function nvcLibNames(proj) {   // file prefixes of the other saved projects, re-read now and then (the library is one big JSON in localStorage)
  var now = Date.now();
  if (now - NVC_LIB.at > 8000) { NVC_LIB.at = now; NVC_LIB.names = [];
    try { lib().forEach(function (q) { if (q && q.id && nvcStr(q.name)) NVC_LIB.names.push({ id: q.id, name: q.name, safe: E.safeName(q.name) }); }); } catch (e) {} }
  return NVC_LIB.names;
}
function nvcProject(out, proj, info) {
  var cabs = proj.cabinets, name = nvcStr(proj.name);
  nvcRun(out, 'proj.name', -1, function () {
    if (!name) { nvcAdd(out, { id: 'proj.name', topic: null, field: 'projname', msg: L('Neįrašytas projekto pavadinimas', 'The project has no name'), hint: L('Juo vadinamos CNC programos ir failai.', 'The CNC programs and files are named after it.'), act: { label: L('Įrašyti', 'Type it'), act: 'fixname' } }); return; }
    var safe = E.safeName(name);
    if (!/[A-Za-z0-9]/.test(safe)) nvcAdd(out, { id: 'proj.name.ascii', topic: null, field: 'projname', msg: L('Pavadinime nėra raidžių ar skaičių, tinkamų failams — programos vadinsis „PROJEKTAS_…“', 'The name has no letters or digits usable in file names — the programs will be called “PROJEKTAS_…”'), act: { label: L('Pervadinti', 'Rename'), act: 'fixname' } });
    else if (nvcLibNames(proj).some(function (q) { return q.id !== proj.id && q.safe === safe; })) nvcAdd(out, { id: 'proj.dupname', topic: null, field: 'projname',
      msg: L('Kitas projektas irgi vadinasi „' + name + '“ — CNC programų failai vadinsis vienodai', 'Another project is also called “' + name + '” — the CNC program files get the same names'),
      hint: L('Staklėse vienodi failai užrašo vieni kitus. Pridėkite prie pavadinimo, pvz., užsakovo pavardę.', 'On the machine, files with the same name overwrite each other. Add e.g. the customer’s name.'), act: { label: L('Pervadinti', 'Rename'), act: 'fixname' } });
  });
  if (!cabs.length) { nvcAdd(out, { id: 'proj.empty', topic: null, tab: 'cab', msg: L('Projekte dar nėra spintelių', 'The project has no cabinets yet'), act: { label: L('Pridėti spintelę', 'Add a cabinet'), nv: 'nvcfix', v: 'pick', i: 0 } }); return; }
  /* two cabinets whose parts would get the same file names (cannot happen while the number is part of the name — a guard for imports) */
  nvcRun(out, 'proj.prefix', -1, function () {
    var seen = {};
    cabs.forEach(function (c, i) { var p = info[i] && info[i].r && info[i].r.panels && info[i].r.panels[0]; if (!p || !p.name || !p.key) return;
      var base = p.name.slice(0, p.name.length - p.key.length);
      if (seen[base] != null) nvcAdd(out, { id: 'proj.prefix', cab: i, c: c, topic: 'size', field: 'f-c-name', msg: L('Spintelių ' + (seen[base] + 1) + ' ir ' + (i + 1) + ' failai vadintųsi vienodai („' + base + '…“)', 'Cabinets ' + (seen[base] + 1) + ' and ' + (i + 1) + ' would get the same file names (“' + base + '…”)'), hint: L('Pervadinkite vieną iš jų.', 'Rename one of them.') });
      else seen[base] = i; });
  });
  /* the same material typed two ways: two rows in the part list, two boards in the cutting plan */
  nvcRun(out, 'mat.near', -1, function () {
    var by = {}, add = function (v) { v = typeof v === 'string' ? v : ''; if (!v.trim()) return; var k = v.toLowerCase().replace(/\s+/g, ''); (by[k] = by[k] || {})[v] = 1; };
    cabs.forEach(function (c) { if (!c || typeof c !== 'object') return; var m = nvcObj(c.mat), e = nvcObj(c.edge), w = nvcObj(c.worktop);
      [m.carc, m.facade, m.back, m.top, m.drawer, e.carc, e.facade, w.on ? w.mat : '', w.on ? w.edge : ''].forEach(add); nvcArr(c.extras).forEach(function (x) { if (x) { add(x.mat); add(x.edgeMat); } }); });
    Object.keys(by).forEach(function (k) { var v = Object.keys(by[k]); if (v.length < 2) return;
      nvcAdd(out, { id: 'mat.near', topic: null, msg: L('Ta pati medžiaga užrašyta skirtingai: ' + v.map(function (q) { return '„' + q + '“'; }).join(' ir ') + ' — sąraše tai bus atskiros plokštės', 'One material is written in different ways: ' + v.map(function (q) { return '“' + q + '”'; }).join(' and ') + ' — the list treats them as separate boards'),
        hint: L('Suvienodinkite pavadinimą visose spintelėse (skiriasi tik raidžių dydis ar tarpai).', 'Use one spelling in every cabinet (only capitals or spaces differ).') }); });
  });
  /* worktops: a piece longer than the board. Cabinets standing in a row in the layout share one piece (as worktopPieces() joins them) */
  nvcRun(out, 'wt.long', -1, function () {
    var list = []; cabs.forEach(function (c, i) { var wt = c && typeof c === 'object' && !c.dishwasher ? E.worktopOf(c) : null; if (wt) list.push({ c: c, i: i, wt: wt }); });
    if (!list.length) return;
    var Ly = proj.layout, byId = {}; if (Ly && Ly.items && RM && RM.placed) RM.placed(proj).forEach(function (o) { byId[o.c.id] = o; });
    list.forEach(function (x) { var o = byId[x.c.id]; if (o) { x.wall = o.it.wall; x.a0 = o.it.x + x.wt.x0; x.a1 = o.it.x + x.wt.x1; x.top = RM.z0Of(x.c, o.it, Ly) + x.wt.z0; x.front = RM.cabD(x.c) - x.wt.y0; } });
    var same = function (a, b) { return a.wall === b.wall && a.wt.mat === b.wt.mat && Math.abs(a.wt.T - b.wt.T) < 0.01 && a.wt.edge === b.wt.edge && Math.abs(a.front - b.front) < 0.6 && Math.abs(a.top - b.top) < 0.6 && Math.abs(a.a1 - b.a0) < 0.6; };
    var pl = list.filter(function (x) { return x.wall != null; }).sort(function (a, b) { return a.wall - b.wall || a.a0 - b.a0; }), used = {};
    var report = function (g, len) { if (len <= NVC_LIM.wtMax + 0.5) return; var f = g[0];
      nvcAdd(out, { id: 'wt.long', cab: f.i, c: f.c, topic: 'addons', msg: L('Stalviršis ' + nvcMm(Math.round(len)) + ' mm' + (g.length > 1 ? ' (spintelės ' + g.map(function (q) { return q.i + 1; }).join(', ') + ')' : '') + ' ilgesnis už ' + NVC_LIM.wtMax + ' mm plokštę', 'Worktop ' + nvcMm(Math.round(len)) + ' mm' + (g.length > 1 ? ' (cabinets ' + g.map(function (q) { return q.i + 1; }).join(', ') + ')' : '') + ' is longer than the ' + NVC_LIM.wtMax + ' mm board'),
        hint: L('Numatykite sujungimą arba patikrinkite plokštės ilgį.', 'Plan a joint or check the board length.') }); };
    pl.forEach(function (x) { if (used[x.i]) return; var g = [x]; used[x.i] = 1;
      for (var go = true; go;) { go = false; var last = g[g.length - 1]; pl.some(function (y) { if (!used[y.i] && same(last, y)) { g.push(y); used[y.i] = 1; go = true; return true; } return false; }); }
      report(g, g[g.length - 1].a1 - g[0].a0); });
    list.forEach(function (x) { if (!used[x.i]) report([x], x.wt.L); });
  });
  /* the layout: the live checks of the room (room.js problems) — read only, and only when a layout exists */
  nvcRun(out, 'room', -1, function () {
    var Ly = proj.layout; if (!Ly || typeof Ly !== 'object' || !Ly.items || !RM || !RM.problems) return;
    var pr = RM.problems(proj), ops = nvcArr(Ly.openings), pts = nvcArr(Ly.points);
    var opN = function (id) { var op = null, n = 0, k = 0; ops.forEach(function (o) { if (o.id === id) op = o; }); if (!op) return '';
      ops.forEach(function (o) { if ((o.type === 'window') === (op.type === 'window')) { n++; if (o.id === id) k = n; } }); return t(op.type === 'window' ? 'opWinN' : 'opDoorN').replace('{n}', k); };
    var ptN = function (id) { var pt = null, n = 0, k = 0; pts.forEach(function (o) { if (o.id === id) pt = o; }); if (!pt) return '';
      pts.forEach(function (o) { if (o.type === pt.type) { n++; if (o.id === id) k = n; } }); return t({ socket: 'ptSocket', socket2: 'ptSocket2', cold: 'ptCold', hot: 'ptHot', drain: 'ptDrain' }[pt.type] || 'ptSocket') + ' ' + k; };
    var KEY = { out: 'rmProbOut', ceil: 'rmProbCeil', floor: 'rmProbFloor', hit: 'rmProbHit', opout: 'rmProbOpOut', opceil: 'rmProbOpCeil', ophit: 'rmProbOpHit', opblock: 'rmProbOpBlock', opswing: 'rmProbOpSwing', ptout: 'rmProbPtOut', pthit: 'rmProbPtHit', ptside: 'rmProbPtSide', ptwt: 'rmProbPtWt' };
    nvcArr(pr && pr.list).slice(0, 30).forEach(function (p) {
      var key = KEY[p.kind]; if (!key) return;
      var o1 = p.pt ? ptN(p.pt) : p.op ? opN(p.op) : '', o2 = p.pt && p.op ? opN(p.op) : p.op2 ? opN(p.op2) : '';
      var msg = t(key).replace('{a}', p.a + 1).replace('{b}', p.b + 1).replace('{o}', o1).replace('{p}', o2);
      nvcAdd(out, { id: 'room.' + p.kind, sev: nvcSev('room'), cab: p.a != null ? p.a : -1, topic: null, tab: 'room', msg: msg, hint: L('Pataisykite išdėstyme — iš jo skaičiuojami stalviršiai ir brėžiniai.', 'Correct it in the layout — worktops and drawings are worked out from it.') });
    });
  });
}

/* ----------------------------------------------------------------- the list */
function nvComputeIssues(proj, info) {
  var out = []; NVC_ERR = [];
  if (!proj || typeof proj !== 'object' || !Array.isArray(proj.cabinets)) return out;
  info = Array.isArray(info) ? info : [];
  var G = { nd: { W: 2800, H: 2070, trim: 15 }, boards: {} };
  try { G.nd = nestDefaults(); G.boards = nvcObj(S.settings && S.settings.boards); } catch (e) {}
  try { nvcProject(out, proj, info); } catch (e1) { NVC_ERR.push({ rule: 'project', cab: -1, err: String(e1 && e1.message || e1) }); }
  for (var i = 0; i < proj.cabinets.length; i++) { try { nvcCabinet(out, proj, i, info[i], G); } catch (e2) { NVC_ERR.push({ rule: 'cabinet', cab: i, err: String(e2 && e2.message || e2) }); } }
  var rank = { error: 0, todo: 1, warn: 2, info: 3 }, seen = {}, res = [];
  out.forEach(function (x, k) {
    if (rank[x.sev] == null) x.sev = 'warn';
    delete x._more; delete x._msg0; delete x._cover; delete x._nth;
    var key = x.id + '|' + x.cab + '|' + (x.field || '') + '|' + x.msg; if (seen[key]) return; seen[key] = 1;   // the same thing said twice
    x._k = k; res.push(x);
  });
  res.sort(function (a, b) { return (a.cab - b.cab) || (rank[a.sev] - rank[b.sev]) || (a._k - b._k); });
  res.forEach(function (x) { delete x._k; });
  return res;
}

/* ----------------------------------------------------------------- for the other files */
/* state of one topic of cabinet i: 'error' | 'todo' | 'warn' | 'ok' */
function nvcTopicState(i, topicKey) { return nvWorst(nvIssuesFor(i).filter(function (x) { return x.topic === topicKey; })); }
/* what stops production: errors and open confirmations */
function nvcBlockers() { return nvIssues().filter(function (x) { return x.sev === 'error' || x.sev === 'todo'; }); }
/* a short signature of the warnings as they are now ("3.k2f9x1"): the production stage stores it when the person ticks
   "I have looked at the warnings"; any new or changed warning gives another signature and asks again. '' = no warnings.
   It does not depend on the language: only ids, places and the numbers of the message count. */
function nvcSig(list) {
  var w = (list || nvIssues()).filter(function (x) { return x.sev === 'warn'; }); if (!w.length) return '';
  var cabs = (S.proj && S.proj.cabinets) || [];
  var parts = w.map(function (x) { var c = cabs[x.cab]; return x.id + '@' + (c && c.id ? c.id : x.cab) + ':' + (x.sec != null ? x.sec : '') + ':' + (x.raw || String(x.msg).replace(/[^\d]+/g, '.')); }).sort();
  var h = 5381, s = parts.join('\n'); for (var k = 0; k < s.length; k++) h = ((h << 5) + h + s.charCodeAt(k)) | 0;
  return w.length + '.' + (h >>> 0).toString(36);
}
/* one-click fixes offered by issues: act = { label, nv:'nvcfix', v, i } → <button data-nv="nvcfix" data-v data-i>. Undo takes them back. */
NVA.nvcfix = function (el, v, i) {
  var a = String(v || '').split(':'), c = S.proj && S.proj.cabinets[i], s = c && a[1] != null ? nvcArr(c.sections)[+a[1]] : null;
  if (a[0] === 'pick') { S.home = false; S.tab = 'cab'; S.picking = true; return; }
  if (!c) return false;
  if (a[0] === 'rail' && s && +a[2] > 0) s.rail = +a[2];
  else if (a[0] === 'ndrawers' && s && +a[2] >= 1) s.nDrawers = +a[2];
  else if (a[0] === 'hingen' && s) s.hingeN = '';
  else if (a[0] === 'colseq') { c.colW = []; fixCols(c); }
  else if (a[0] === 'backcam') { S.sel = i; assign('c.cnc.backJoint', 'cam'); }   // the live rule: one choice for the back and its partitions
  else return false;
  save(); toast(L('Pataisyta — Ctrl+Z atšaukia', 'Fixed — Ctrl+Z takes it back'));
};
/* for tests and the console */
window.__nvc = { compute: nvComputeIssues, classify: function (raw) { var k = nvcClassify(raw); return k < 0 ? null : { id: NVC_ENG[k][0], sev: NVC_ENG[k][2], topic: NVC_ENG[k][3] }; }, table: NVC_ENG, sev: NVC_SEV, lim: NVC_LIM,
  errors: function () { return NVC_ERR.slice(); }, sig: nvcSig, topicState: nvcTopicState, blockers: nvcBlockers,
  build: function (i) { return buildOne(i); }, lib: NVC_LIB };
