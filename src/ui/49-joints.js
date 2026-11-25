/* 49-joints.js — ONE place for connectors: the topic "Jungtys" of a cabinet.
   While it is open the picture beside it is the 3-D model with its joints (48-view3.js draws them, pulled apart, with the
   real connectors); everything that can be said about a joint is here in the inspector: the cabinet's usual connector,
   every joint with its type, count, places and sides, "Pakeisti puses", and the confirmation.
   Nothing else in the app edits joints: Korpusas only shows how the boards meet, free constructions have no joints topic
   of their own, and every "review the joints" button anywhere (checks, review, the live commands jcopen / jcroom)
   lands here — see the redirect in render() (00-core.js). */
NVTOPICS = NVTOPICS.filter(function (x) { return x.key !== 'bx-joints'; });
function nvjHas(c) { return !!c && !c.dishwasher && c.kind !== 'panel'; }
nvTopic({ key: 'joints', order: 35, icon: nvtIcon('<path d="M4 5h7v14H4zM11 9h9v6h-9z"/><circle cx="7.5" cy="12" r="1.3"/><circle cx="15.5" cy="12" r="1.3"/>'),
  label: function () { return L('Jungtys', 'Joints'); }, applies: nvjHas, body: function (c, inf) { return nvjBody(c, inf); } });

/* the picture follows the topic: joints are shown while — and only while — "Jungtys" is open */
var nvjCab = NVSTAGE.cab;
NVSTAGE.cab = function (info) {
  var c = cur(), on = !S.picking && nvjHas(c) && NV.topic === 'joints';
  if (on) { NV.view = '3d'; if (NV.r3off) NV.r3off = null; }
  if (!!NV3.joints !== on) { NV3.joints = on; if (on) { NV3.edges = false; NV3.focus = null; NV3.full = false; } else NV3.jSel = null; }
  return nvjCab(info);
};

function nvjTypeName(k) { return k === 'cam' ? t('jtCam') : k === 'dowel' ? t('jtDowel') : t('jtConf'); }
function nvjBody(c, inf) {
  var r = inf && inf.r, joints = (r && r.joints) || [], sel = NV3.jSel, j = sel && joints.filter(function (x) { return x.key === sel.key; })[0];
  if (sel && !j) sel = NV3.jSel = null;
  var h = '<div class="nvt nvj"><p class="nv-hint nvt-lead">' + L('Visos šios spintelės jungtys keičiamos tik čia. Spustelėkite jungtį modelyje arba sąraše.', 'All joints of this cabinet are changed here, and only here. Click a joint in the model or in the list.') + '</p>';
  if (!joints.length) return h + '<p class="nvt-nothing">' + L('Šioje spintelėje jungčių nėra.', 'This cabinet has no joints.') + '</p></div>';
  /* the joint in work, always on top */
  if (j) { var sd = j.sides ? j.sides[sel.side] || j.sides.L : j, w = nv3JWidth(r, j.key, sel.side, j.single), pos = sd.pos || [], lim = nv3JLimits(sd.type);
    var backs = !c.kind && /^back(P\d)?$/.test(j.key);   // the back and its partitions are joined alike — the live rule, through the live binding
    var ty = function (k) { return '<button type="button" class="' + (sd.type === k ? 'on' : '') + '" ' + (backs ? 'data-act="set" data-bind="c.cnc.backJoint" data-v="' + k + '"' : 'data-nv="nv3" data-v="j:type:' + k + '"') + ' aria-pressed=""' + (sd.type === k) + '"><i class="nvj-dot" style="background:' + NV3_JC[k] + '"></i>' + nvjTypeName(k) + '</button>'; };
    h += '<section class="nvj-card" id="nvj-card"><div class="nvj-card-h"><i class="nvj-dot" style="background:' + (pos.length ? NV3_JC[sd.type] || '#888' : '#c0392b') + '"></i><b>' + esc(nv3JName(j)) + '</b><span class="nv-muted">' + fmt(Math.round(w)) + ' mm · ' + (j.custom || j.manual ? L('pakeista', 'changed') : L('standartas', 'standard')) + '</span>' +
        '<button type="button" class="nvj-x" data-nv="nv3" data-v="j:none" aria-label="' + esc(t('close')) + '">✕</button></div>' +
      (j.single ? '' : '<div class="nvj-row"><span class="nvj-l">' + L('Kuriam šonui', 'For which side') + '</span><span class="seg"><button type="button" class="' + (NV3.jBoth ? 'on' : '') + '" data-nv="nv3" data-v="j:both:1">' + L('Abiem', 'Both') + '</button><button type="button" class="' + (!NV3.jBoth && sel.side === 'L' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:L">' + L('Kairei', 'Left') + '</button><button type="button" class="' + (!NV3.jBoth && sel.side === 'R' ? 'on' : '') + '" data-nv="nv3" data-v="j:both:R">' + L('Dešinei', 'Right') + '</button></span></div>') +
      '<div class="nvj-row"><span class="nvj-l">' + L('Kuo jungiama', 'Joined with') + '</span><span class="seg nvj-type">' + ty('confirmat') + ty('cam') + ty('dowel') + '</span></div>' +
      '<div class="nvj-row"><span class="nvj-l">' + L('Kiek', 'How many') + '</span><span class="nv-step"><button type="button" data-nv="nv3" data-v="j:n:-1"' + (pos.length ? '' : ' disabled') + '>−</button><b>' + pos.length + '</b><button type="button" data-nv="nv3" data-v="j:n:1">+</button></span>' +
        '<button type="button" class="nv-btn sm ghost" data-nv="nv3" data-v="j:reset">↺ ' + L('Standartas', 'Standard') + '</button></div>' +
      (pos.length ? '<div class="nvj-row"><span class="nvj-l">' + L('Kur, mm nuo jungties pradžios', 'Where, mm from the joint\'s start') + '</span><span class="nv3-jpos">' + pos.map(function (v, k) { return '<label class="' + (sel.idx === k ? 'on' : '') + '"><input type="text" inputmode="decimal" value="' + fmt(v) + '" data-nv3j="' + k + '" aria-label="' + (k + 1) + '"><button type="button" data-nv="nv3" data-v="j:del:' + k + '" title="' + esc(L('Pašalinti', 'Remove')) + '">✕</button></label>'; }).join('') + '</span>' +
        '<small class="nv-muted nvj-n">' + L('Nuo galo ≥ ' + lim.edge + ', tarp jungčių ≥ ' + lim.gap + '. Tašką galima tempti modelyje.', 'From the end ≥ ' + lim.edge + ', apart ≥ ' + lim.gap + '. A point can be dragged in the model.') + '</small></div>' : '') +
      '<div class="nvj-row nvj-sides"><span class="nvj-l">' + L('Pusė ir ašis', 'Side and axis') + '</span>' + nv3JFlipBtn(c, r, j, sd, sel) + nv3JAxisBtn(c, r, j) + '</div></section>'; }
  else h += '<div class="nvj-pick">' + L('Pasirinkite jungtį — čia atsiras jos nustatymai: kuo jungiama, kiek, kur ir kurioje pusėje.', 'Pick a joint — its settings appear here: what joins it, how many, where and on which side.') + '</div>';
  /* every joint */
  h += nvtGrp(L('Jungtys', 'Joints'), joints.length, '<div class="nvj-list">' + joints.map(function (x) {
    var on = !!sel && sel.key === x.key, s0 = x.sides ? x.sides.L : x, n = (x.single ? ['L'] : ['L', 'R']).reduce(function (a, s1) { return a + ((x.sides ? x.sides[s1] || x.sides.L : x).pos || []).length; }, 0);
    return '<button type="button" class="nvj-li' + (on ? ' on' : '') + (n ? '' : ' empty') + '" data-nv="nv3" data-v="j:pick:' + esc(x.key) + '" aria-pressed="' + on + '"><i class="nvj-dot" style="background:' + (n ? NV3_JC[s0.type] || '#888' : '#c0392b') + '"></i><span>' + esc(nv3JName(x)) + '</span>' +
      '<small>' + (n ? esc(x.split ? L('skirtingai', 'differs') : nvjTypeName(s0.type)) + ' · ' + n : L('nėra jungčių', 'no connectors')) + (x.custom || x.manual ? ' · ' + L('pakeista', 'changed') : '') + '</small></button>'; }).join('') + '</div>');
  /* the cabinet's usual connector */
  h += nvtGrp(L('Visai spintelei', 'For the whole cabinet'), L('jungtims, kurių nekeitėte atskirai', 'for the joints you have not changed one by one'),
    seg('c.cnc.joinery', c.cnc.joinery === 'cam' ? 'cam' : 'confirmat', [['confirmat', t('jtConf')], ['cam', t('jtCam')]]));
  h += nvtGrp(L('Modelis', 'The model'), '', '<button type="button" class="nv-btn sm' + (NV3.jExp !== false ? ' on' : '') + '" data-nv="nv3" data-v="j:exp" aria-pressed="' + (NV3.jExp !== false) + '">⤢ ' + L('Detalės išskleistos', 'Boards pulled apart') + '</button>' +
    '<p class="nv-hint">' + L('Išskleidus matyti, kas į ką sukama. Išjungus — spintelė surinkta, permatoma.', 'Pulled apart you see what goes into what. Off: the cabinet assembled, see-through.') + '</p>');
  /* the confirmation */
  var need = jcNeeded(c, r);
  h += '<section class="nvj-ok ' + (need ? 'todo' : 'ok') + '"><div><b>' + (need ? (c.jointsOk ? L('Jungtys pasikeitė — patvirtinkite iš naujo', 'The joints changed — confirm them again') : L('Jungtys dar nepatvirtintos', 'The joints are not confirmed yet')) : L('Jungtys patvirtintos ✓', 'The joints are confirmed ✓')) + '</b>' +
    '<small>' + (need ? L('Peržiūrėkite modelyje, kur ir kuo jungiamos detalės. Be patvirtinimo gamybos failai neišduodami.', 'Look in the model where and with what the boards are joined. Without the confirmation no production files are given.') : L('Ką nors pakeitus, reikės patvirtinti dar kartą.', 'After any change they have to be confirmed again.')) + '</small></div>' +
    (need ? '<button type="button" class="nv-btn pri" data-nv="nvjOk">✓ ' + L('Patvirtinu', 'I confirm') + '</button>' : '') + '</section>';
  return h + '</div>';
}
NVA.nvjOk = function () { var c = cur(), inf = S._info && S._info[S.sel]; if (!c || !inf || !inf.r) return false; c.jointsOk = jcSig(inf.r); save(); toast(L('Jungtys patvirtintos ✓', 'Joints confirmed ✓')); };
NVAFTER.push(function () {   // a joint picked in the model: its settings are brought into view
  var k = NV.topic === 'joints' && NV3.jSel ? NV3.jSel.key + '|' + NV3.jSel.side + '|' + NV3.jSel.idx : null; if (k === NV.jShown) return; NV.jShown = k;
  var e = k && document.getElementById('nvj-card'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' });
});

/* checks: a cam whose housing would sit at the very end of its board */
var nvjIssues = nvComputeIssues;
nvComputeIssues = function (proj, info) {
  var list = nvjIssues(proj, info) || [];
  ((proj && proj.cabinets) || []).forEach(function (c, i) {
    var r = info && info[i] && info[i].r; if (!r) return;
    (r.joints || []).forEach(function (x) {
      var near = null;
      (x.single || !x.sides ? [x.sides ? x.sides.L : x] : [x.sides.L, x.sides.R]).forEach(function (sd) { if (!sd || sd.type !== 'cam') return;
        (sd.pos || []).forEach(function (p) { var e = Math.min(p, x.w - p); if (e < NV3_CAM_END - 0.05 && (near == null || e < near)) near = e; }); });
      if (near == null) return;
      var mm = function (v) { var s0 = String(Math.round(v * 10) / 10); return S.lang === 'en' ? s0 : s0.replace('.', ','); };
      list.push({ id: 'joint.camEnd.' + x.key, sev: 'warn', cab: i, topic: 'joints', field: null,
        msg: L('Jungtis „' + nv3JName(x) + '“: ekscentrikas tik ' + mm(near) + ' mm nuo detalės galo — šalia lizdo lieka ' + mm(Math.max(0, near - 7.5)) + ' mm plokštės',
               'Joint “' + nv3JName(x) + '”: a cam only ' + mm(near) + ' mm from the board\'s end — ' + mm(Math.max(0, near - 7.5)) + ' mm of board left beside its housing'),
        hint: L('Patraukite jį bent ' + NV3_CAM_END + ' mm nuo galo (Jungtys → ši jungtis → „Kur“).', 'Move it at least ' + NV3_CAM_END + ' mm in from the end (Jungtys → this joint → “Where”).'),
        act: { label: L('Atidaryti jungtis', 'Open the joints'), act: 'jcroom', i: i } });
    });
  });
  return list;
};
