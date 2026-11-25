/* =====================================================================
   30-editor.js — the cabinet workspace (S.tab === 'cab'): the centre of the app.

     strip      one card per cabinet: mini front picture, number, name, size, state mark
     canvas     THE PICTURE — the front view drawn from the real parts (DBFront), with a layer of buttons over it:
                a hit area per section, "+" above every column, the three outer sizes as labels that jump to the field
     inspector  the topic rail, the open topic's body, "← Atgal / Toliau →"
     topics     'size' (order 10) and 'inside' (order 20); the others come from 31-topics.js through nvTopic()

   The picture and its button layer share one geometry: the SVG's viewBox is in millimetres (y = H − z), the layer is
   positioned in per cent of that viewBox, and the box that holds both is given the viewBox's proportions — so a
   button always lies exactly over what it stands for, at any size.

   Own state (NV.e…): eAdv {group: open}, ePend (a section is being added), eAt / eSid / eCab (which section was
   selected at the last render — by index and by id, so the selection follows the section when it is moved or
   another one is removed), eScroll (the inspector's scroll, kept over a re-render).
   ===================================================================== */
NV.eAdv = {};
NV.ePend = null;
NV.eAt = null; NV.eSid = null; NV.eCab = null;
NV.eScroll = null;

/* ----------------------------------------------------------------- small things */
function nveIco(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
var NVE_BOX = '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/>';
var NVE_ICON = {
  drawers: nveIco(NVE_BOX + '<path d="M4 9.2h16M4 14.8h16M10.5 6.4h3M10.5 12h3M10.5 17.6h3"/>'),
  doors:   nveIco(NVE_BOX + '<path d="M12 3.5v17M9.8 10.5v3M14.2 10.5v3"/>'),
  open:    nveIco('<path d="M5 3.5v17M19 3.5v17M5 3.5h14M5 20.5h14"/><path d="M5 9.4h14M5 15h14" stroke-width="2.2"/>'),
  oven:    nveIco(NVE_BOX + '<rect x="7" y="10" width="10" height="7.5" rx="1"/><path d="M7.6 6.8h.01M11 6.8h.01M16.4 6.8h.01" stroke-width="2.2"/>'),
  cargo:   nveIco('<rect x="8" y="3.5" width="8" height="17" rx="1.5"/><path d="M12 6.5v3M10.2 13.5h3.6M10.2 16.8h3.6"/>'),
  fridge:  nveIco('<rect x="6" y="3.5" width="12" height="17" rx="1.5"/><path d="M6 10h12M9 6v2M9 12.5v3"/>'),
  size:    nveIco('<rect x="8.5" y="3.5" width="12" height="12" rx="1.5"/><path d="M4 3.5v12M2.6 5L4 3.5 5.4 5M2.6 14L4 15.5 5.4 14M8.5 20h12M10 18.6L8.5 20l1.5 1.4M19 18.6l1.5 1.4-1.5 1.4"/>'),
  inside:  nveIco(NVE_BOX + '<path d="M12 3.5v17M4 12h8M12 9.2h8M12 14.8h8"/>')
};
var NVE_KINDS = ['drawers', 'doors', 'open', 'oven', 'cargo'];   // the order of every "add" menu
function nveKindOf(s) { return s.kind === 'doors' && s.fridge ? 'fridge' : s.kind === 'doors' && /^CARGO/i.test(s.hinge || '') ? 'cargo' : s.kind; }
function nveKindName(k) { return t({ drawers: 'kDrawers', doors: 'kDoors', cargo: 'kCargo', open: 'kOpen', oven: 'kOven', fridge: 'kFridge' }[k] || 'kDoors'); }
/* "3 stalčiai": lt = [1, 2–9, 10+], en = [1, many] */
function nvePl(n, lt, en) {
  n = Math.abs(Math.round(num(n)));
  if (S.lang === 'en') return n + ' ' + en[n === 1 ? 0 : 1];
  var d = n % 10, h = n % 100;
  return n + ' ' + lt[d === 1 && h !== 11 ? 0 : d >= 2 && (h < 10 || h >= 20) ? 1 : 2];
}
function nveSecH(c, s) { return s.fill ? zoneInfo(c, colOf(c, s)).fillH : Math.max(0, num(s.height)); }
function nveSecSum(s) {
  var k = nveKindOf(s);
  if (k === 'drawers') return nvePl(s.nDrawers, ['stalčius', 'stalčiai', 'stalčių'], ['drawer', 'drawers']);
  if (k === 'fridge') return nvePl(Math.max(1, Math.min(2, num(s.nDoors) || 2)), ['fasadas', 'fasadai', 'fasadų'], ['front', 'fronts']);
  if (k === 'cargo') return L('ištraukiamas', 'pull-out');
  if (k === 'oven') return L('niša orkaitei', 'oven niche');
  var sh = num(s.shelves) > 0 ? nvePl(s.shelves, ['lentyna', 'lentynos', 'lentynų'], ['shelf', 'shelves']) : '';
  if (k === 'open') return sh || L('be lentynų', 'no shelves');
  return nvePl(s.nDoors, ['durys', 'durys', 'durų'], ['door', 'doors']) + (sh ? ' · ' + sh : '');
}
function nveOpen(list) { return list.filter(function (x) { return x.sev === 'error' || x.sev === 'todo' || x.sev === 'warn'; }); }
/* the state mark: shape and colour together (never colour alone) */
function nveMark(w, title) {
  return '<span class="nve-mark ' + w + '"' + (title ? ' title="' + esc(title) + '"' : '') + ' aria-label="' + esc(title || { error: L('klaida', 'error'), todo: L('reikia patvirtinti', 'to confirm'), warn: L('įspėjimas', 'warning'), ok: L('tvarkoje', 'fine') }[w] || '') + '">' + (w === 'ok' ? '✓' : w === 'todo' ? '?' : '!') + '</span>';
}
function nveSizeTxt(c) { return fmt(c.dishwasher ? c.dishWidth : c.W) + ' × ' + fmt(c.H) + ' × ' + fmt(c.D); }
function nveKindBadge(c) {
  if (c.kind || c.dishwasher) return esc(typeName(c));
  return esc({ 'PASTATOMOS': t('tBase'), 'PAKABINAMOS': t('tWall'), 'ŪKINĖ': t('tTall') }[cabKind(c)] || typeName(c));
}
function nveAdvOpen(key, fields) {   // a closed group never hides a problem: an issue on one of its fields opens it
  if (NV.eAdv[key]) return true;
  if (NV.flash && fields.test(NV.flash)) return true;
  return nvIssuesFor(S.sel).some(function (x) { return x.field && (x.sev === 'error' || x.sev === 'warn') && fields.test(x.field); });
}

/* ----------------------------------------------------------------- which section is selected
   NV.secSel is an index into c.sections; the live commands move, remove and add sections under it. */
function nveSync(c) {
  var secs = c.sections || [], p = NV.ePend; NV.ePend = null;
  if (p && p.id === c.id && secs.length > p.n) { NV.secSel = secs.length - 1; NV.topic = 'inside'; NV.eAt = null; }   // just added: it is the last one
  var m = NV.flash && /^f-c-sections-(\d+)-/.exec(NV.flash);
  if (m && secs[+m[1]]) { NV.secSel = +m[1]; NV.eAt = null; }            // a "fix" link to a section's field: that section's editor must be on the page
  else if (NV.flash && NV.topic === 'inside') NV.secSel = null;         // … or to a field of the whole cabinet (gaps, column widths): the list view holds those
  if (NV.secSel != null) {
    if (NV.secSel === NV.eAt && NV.eSid != null) {                        // nobody chose anew: follow the same section
      if (c.id !== NV.eCab) NV.secSel = null;
      else if (!secs[NV.secSel] || secs[NV.secSel].id !== NV.eSid) { var j = -1; secs.forEach(function (s, q) { if (s.id === NV.eSid) j = q; }); NV.secSel = j >= 0 ? j : null; }
    } else if (!secs[NV.secSel]) NV.secSel = null;
  }
  if (c.kind || c.dishwasher) NV.secSel = null;
  if (NV.secSel != null) S.colSel = colOf(c, secs[NV.secSel]);
  NV.eAt = NV.secSel; NV.eSid = NV.secSel != null ? secs[NV.secSel].id : null; NV.eCab = c.id;
}
/* before a live command changes the model: note what the selection has to do afterwards */
app.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el || S.home || !S.proj || S.tab !== 'cab') return;
  var a = el.getAttribute('data-act'), c = cur();
  if (a === 'addsec' && c) NV.ePend = { id: c.id, n: c.sections.length };
  else if (a === 'sel' || a === 'pick' || a === 'dup' || a === 'preset' || a === 'libadd' || a === 'colsel') NV.secSel = null;
}, true);
document.addEventListener('click', function (e) {   // the "+" menus of the picture close on a click elsewhere
  [].forEach.call(document.querySelectorAll('details.nve-add[open]'), function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
});
document.addEventListener('toggle', function (e) {
  var d = e.target, k = d && d.getAttribute && d.getAttribute('data-nve-adv'); if (k) NV.eAdv[k] = d.open;
  if (d && d.classList && d.classList.contains('nve-add') && d.open) [].forEach.call(document.querySelectorAll('details.nve-add[open]'), function (o) { if (o !== d) o.removeAttribute('open'); });
}, true);
document.addEventListener('keydown', function (e) {   // Esc: close a "+" menu, else let go of the selected section
  if (e.key !== 'Escape' || S.home || !S.proj || S.tab !== 'cab' || S.picking || S.jcheck || S.echeck) return;
  var open = document.querySelector('details.nve-add[open]'); if (open) { open.removeAttribute('open'); return; }
  var a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
  if (NV.secSel != null) { NV.secSel = null; render(); }
});

/* ----------------------------------------------------------------- THE PICTURE */
function nveBnd(c, W) { var nC = colsOf(c), cw = colWidths(c), b = [0]; cw.forEach(function (w, k) { b.push(b[k] + w); }); b[nC] = W; return b; }
/* every section as a rectangle of the front view, in mm: x across, z up from the carcass bottom (as the engine stacks them) */
function nveRects(c, r) {
  var W = +r.dims.W, H = +r.dims.H, bnd = nveBnd(c, W), g = r.fgaps, zb = g ? (+g.hb || 0) + (+g.bot || 0) : hbOf(c), out = [], zc = [];
  c.sections.forEach(function (s, i) {
    var k = colOf(c, s), z = zoneInfo(c, k), h = s.fill ? z.fillH : Math.max(0, num(s.height));
    if (zc[k] == null) zc[k] = zb;
    out.push({ i: i, col: k, x0: bnd[k], x1: bnd[k + 1], z0: zc[k], z1: zc[k] + h, h: h });
    zc[k] += h;
  });
  return { W: W, H: H, bnd: bnd, zb: zb, secs: out };
}
/* a loose panel: its face (depth × height) in its colour, the banded edges drawn dark — the edge-on front view is a sliver */
function nvePanelSvg(c) {
  var D = num(c.D), H = num(c.H); if (!(D > 0 && H > 0)) return '';
  var pad = Math.max(D, H) * 0.02, col = window.DBFront.matColor(c.mat && c.mat.carc, '#e7e5df'), pe = c.pe || {}, n = function (v) { return Math.round(v * 10) / 10; };
  var edge = function (k, lab, x1, y1, x2, y2) {
    if (pe[k] === false) return '';
    var ln = function (st, w) { return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + st + '" stroke-width="' + w + '" vector-effect="non-scaling-stroke"/>'; };
    return '<g><title>' + esc(lab) + '</title>' + ln('#fff', 6) + ln('#1c211e', 3) + '</g>';
  };
  return '<svg class="fr-svg" viewBox="' + n(-pad) + ' ' + n(-pad) + ' ' + n(D + 2 * pad) + ' ' + n(H + 2 * pad) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(c.name || typeName(c)) + '">' +
    '<rect x="0" y="0" width="' + n(D) + '" height="' + n(H) + '" fill="' + col + '" stroke="#8b8f8a" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
    edge('e1', t('pnE1'), 0, 0, 0, H) + edge('e2', t('pnE2'), D, 0, D, H) + edge('e3', t('pnE3'), 0, H, D, H) + edge('e4', t('pnE4'), 0, 0, D, 0) + '</svg>';
}
function nveFrontSvg(c, r, label) {
  if (!window.DBFront) return '';
  if (c.kind === 'panel') return nvePanelSvg(c);
  if (!r) return '';
  try {
    if (c.kind) return window.DBFront.svg(c, r, { bnd: [0, +r.dims.W || num(c.W)], label: esc(label || '') });
    return frontArtOf(c, r, { noHit: true, label: esc(label || '') }).svg;
  } catch (e) { return ''; }
}
/* → { html, a }: the picture with its button layer, and the proportions (width / height) of the box that holds them */
function nvePicture(c, inf) {
  var r = inf && inf.r, svg = nveFrontSvg(c, r, c.name || typeName(c)), m = /viewBox="([-\d.e ]+)"/.exec(svg);
  var vb = m ? m[1].trim().split(/\s+/).map(Number) : null;
  if (!vb || vb.length !== 4 || !(vb[2] > 0 && vb[3] > 0) || svg.indexOf('>?</text>') >= 0)
    return { a: 1.2, html: '<div class="nve-nopic"><b>' + L('Paveikslo dar nėra', 'No picture yet') + '</b><span>' + L('Įrašykite spintelės plotį, aukštį ir gylį.', 'Enter the cabinet width, height and depth.') + '</span><button type="button" class="nv-btn sm" data-nv="go" data-topic="size" data-field="' + (c.dishwasher ? 'f-c-dishWidth' : 'f-c-W') + '">' + L('Į matmenis →', 'To the size →') + '</button></div>' };
  var panel = c.kind === 'panel', W = panel ? num(c.D) : +r.dims.W, H = panel ? num(c.H) : +r.dims.H;   // a panel is shown by its face: depth across
  var pc = function (v) { return (Math.round(v * 1e4) / 100) + '%'; };
  var X = function (x) { return pc((x - vb[0]) / vb[2]); }, Y = function (z) { return pc((H - z - vb[1]) / vb[3]); };
  var Wd = function (w) { return pc(w / vb[2]); }, Hd = function (h) { return pc(h / vb[3]); };
  var box = function (x0, x1, z0, z1) { return 'left:' + X(x0) + ';top:' + Y(z1) + ';width:' + Wd(x1 - x0) + ';height:' + Hd(z1 - z0); };
  var lay = '';
  /* ---- sections and columns (a normal cabinet only) */
  if (!c.kind && !c.dishwasher) {
    var G = nveRects(c, r), nC = colsOf(c), ac = activeCol(c), iss = nveOpen(nvIssuesFor(S.sel)), t_ = +r.dims.t || 18;
    var worst = function (list) { return list.some(function (x) { return x.sev === 'error'; }) ? 'error' : list.length ? 'warn' : ''; };
    var over = [];
    for (var k = 0; k < nC; k++) {
      var z = zoneInfo(c, k), ci = iss.filter(function (x) { return x.col === k && x.sec == null; }), cst = z.over ? 'error' : worst(ci);
      var ctip = ci.map(function (x) { return x.msg; }).join(' · ') || (z.over ? t('zone') + ' ' + fmt(z.Hz) + ' mm — ' + t('over') + ' ' + fmt(z.exp - z.Hz) + ' mm' : '');
      over[k] = z.over ? ctip : '';
      lay += '<button type="button" class="nve-colhit' + (nC > 1 && k === ac && NV.topic === 'inside' ? ' on' : '') + (cst ? ' ' + cst : '') + '" data-nv="ecol" data-i="' + k + '" tabindex="-1" style="' + box(G.bnd[k], G.bnd[k + 1], 0, H) + '"' +
        ' title="' + esc(ctip || (nC > 1 ? colName(nC, k) + ' · ' + fmt(G.bnd[k + 1] - G.bnd[k]) + ' mm' : '')) + '" aria-label="' + esc(nC > 1 ? colName(nC, k) : t('colOne')) + '"></button>';
    }
    G.secs.forEach(function (q) {
      var s = c.sections[q.i], kk = nveKindOf(s), si = iss.filter(function (x) { return x.sec === q.i; }), st = over[q.col] ? 'error' : worst(si), on = NV.secSel === q.i;
      var z0 = Math.max(Math.min(G.zb, 0), Math.min(q.z0, H)), z1 = Math.max(z0, Math.min(q.z1, H));   // an overfull column is cut at the cabinet top
      var txt = nveKindName(kk) + ' · ' + fmt(q.h) + ' mm', tip = si.map(function (x) { return x.msg; }).join(' · ') || over[q.col];
      lay += '<button type="button" class="nve-hit' + (on ? ' on' : '') + (st ? ' ' + st : '') + '" data-nv="esec" data-i="' + q.i + '" style="' + box(q.x0, q.x1, z0, z1) + '" aria-pressed="' + on + '"' +
        ' title="' + esc(tip || txt) + '" aria-label="' + esc(txt + (tip ? ' — ' + tip : '')) + '"><span class="nve-chip">' + esc(txt) + '</span>' + (st ? '<span class="nve-flag">!</span>' : '') + '</button>';
    });
    var menu = function (k) {
      return '<div class="nve-add-menu" role="menu"><span class="nve-add-t">' + (nC > 1 ? esc(colName(nC, k)) + ' · ' : '') + t('add') + '</span>' + NVE_KINDS.map(function (kd) {
        return '<button type="button" role="menuitem" data-act="addsec" data-v="' + kd + '" data-i="' + k + '">' + NVE_ICON[kd] + '<span>' + nveKindName(kd) + '</span></button>'; }).join('') + '</div>';
    };
    for (var k2 = 0; k2 < nC; k2++) {
      var has = G.secs.some(function (q) { return q.col === k2; }), cx = (G.bnd[k2] + G.bnd[k2 + 1]) / 2, edge = cx < W * 0.3 && nC > 1 ? ' l' : cx > W * 0.7 && nC > 1 ? ' r' : '';
      if (has) lay += '<details class="nve-add' + edge + '" style="left:' + X(cx) + '"><summary title="' + esc(L('Pridėti sekciją viršuje', 'Add a section on top')) + '" aria-label="' + esc(L('Pridėti sekciją', 'Add a section') + (nC > 1 ? ' — ' + colName(nC, k2) : '')) + '">+</summary>' + menu(k2) + '</details>';
      else lay += '<details class="nve-add nve-add-empty' + edge + '" style="' + box(G.bnd[k2] + (k2 ? t_ / 2 : t_), G.bnd[k2 + 1] - (k2 === nC - 1 ? t_ : t_ / 2), t_, H - t_) + '"><summary aria-label="' + esc(L('Pridėti sekciją', 'Add a section')) + '"><b>+</b><span>' + L('Kas čia bus?', 'What goes here?') + '</span></summary>' + menu(k2) + '</details>';
    }
  }
  ((r.visual && r.visual.rails) || []).forEach(function (q) { lay += '<span class="nve-hrail" style="left:' + X(q.x0 + 6) + ';width:' + Wd(q.x1 - q.x0 - 12) + ';top:' + Y(q.z) + '" title="' + esc(L('Pakabos vamzdis', 'Hanging rail')) + '"></span>'; });
  /* ---- the fronts' outer edges: four orange grips to drag (left, right, top, bottom gap) */
  if (!c.kind && !c.dishwasher && r.fgaps) { var fe = fgFronts(r);
    if (fe) { var mx = (fe.x0 + fe.x1) / 2, mz = (fe.z0 + fe.z1) / 2, tipT = esc(t('fgDragT'));
      lay += '<span class="nve-fgh h" data-nvfg="top" style="left:' + X(mx) + ';top:' + Y(fe.z1) + '" title="' + tipT + '"></span><span class="nve-fgh h" data-nvfg="bot" style="left:' + X(mx) + ';top:' + Y(fe.z0) + '" title="' + tipT + '"></span>' +
        '<span class="nve-fgh v" data-nvfg="l" style="left:' + X(fe.x0) + ';top:' + Y(mz) + '" title="' + tipT + '"></span><span class="nve-fgh v" data-nvfg="r" style="left:' + X(fe.x1) + ';top:' + Y(mz) + '" title="' + tipT + '"></span><span class="nve-fgtip" hidden></span>'; } }
  /* ---- the three outer sizes: labels that are buttons */
  var go = function (cls, style, field, title, txt) { return '<button type="button" class="nve-dim ' + cls + '" style="' + style + '" data-nv="go" data-topic="size" data-field="' + field + '" title="' + esc(title + ' — ' + L('keisti', 'change')) + '"><i></i><b>' + txt + '</b></button>'; };
  lay += (panel ? go('nve-dim-w', 'left:' + X(0) + ';width:' + Wd(W), 'f-c-D', t('D'), fmt(c.D)) : go('nve-dim-w', 'left:' + X(0) + ';width:' + Wd(W), c.dishwasher ? 'f-c-dishWidth' : 'f-c-W', c.dishwasher ? t('dishW') : t('W'), fmt(c.dishwasher ? c.dishWidth : c.W))) +
    go('nve-dim-h', 'top:' + Y(H) + ';height:' + Hd(H), 'f-c-H', t('H'), fmt(c.H)) +
    (panel ? go('nve-dim-d', 'left:' + X(W) + ';top:' + Y(H), 'f-c-W', t('rmThick'), '<small>' + t('rmThick') + '</small> ' + fmt(c.W)) : go('nve-dim-d', 'left:' + X(W) + ';top:' + Y(H), 'f-c-D', t('D'), '<small>' + t('D') + '</small> ' + fmt(c.D)));
  return { a: vb[2] / vb[3], html: svg + lay };
}
NVLIVE.epic = function (c, inf, arg, el) { if (!c) return null; var p = nvePicture(c, inf); if (el) el.style.setProperty('--a', p.a.toFixed(4)); return p.html; };
/* a section of the picture was clicked */
NVA.esec = function (el, v, i) {
  var c = cur(); if (!c) return false;
  if (v === 'none' || !c.sections[i]) { NV.secSel = null; return; }
  NV.secSel = i; NV.topic = 'inside'; S.colSel = colOf(c, c.sections[i]);
};
/* empty carcass space: nothing selected; with partitions, that column becomes the active one */
NVA.ecol = function (el, v, i) {
  var c = cur(); if (!c) return false;
  var same = NV.secSel == null && activeCol(c) === i; NV.secSel = null; S.colSel = i;
  if (same) return false;
};

/* ----------------------------------------------------------------- strip */
function nveStrip(info) {
  return S.proj.cabinets.map(function (k, i) {
    var inf = info && info[i], list = nvIssuesFor(i), w = nvWorst(list), n = nvCounts(list), on = i === S.sel;
    var tip = n.error ? nvePl(n.error, ['klaida', 'klaidos', 'klaidų'], ['error', 'errors']) : n.todo ? n.todo + ' ' + L('patvirtinti', 'to confirm') : n.warn ? nvePl(n.warn, ['įspėjimas', 'įspėjimai', 'įspėjimų'], ['warning', 'warnings']) : L('Viskas tvarkoje', 'All good');
    return '<button type="button" class="nve-card' + (on ? ' on' : '') + '" data-act="sel" data-i="' + i + '"' + (on ? ' aria-current="true"' : '') + '>' +
      '<span class="nve-mini" aria-hidden="true">' + nveFrontSvg(k, inf && inf.r, '') + '</span>' +
      '<span class="nve-ci"><span class="nve-cn"><i>' + (i + 1) + '</i><b>' + esc(k.name || typeName(k)) + '</b></span><small class="nv-num">' + nveSizeTxt(k) + '</small></span>' +
      nveMark(w, tip) + '</button>';
  }).join('');
}
NVLIVE.estrip = function () { return S.proj ? nveStrip(S._info) : null; };

/* ----------------------------------------------------------------- canvas */
function nveHead(c) { return '<b><i>' + (S.sel + 1) + '</i>' + esc(c.name || typeName(c)) + '</b><span class="nv-num">' + nveSizeTxt(c) + ' mm</span>'; }
NVLIVE.ehead = function (c) { return c ? nveHead(c) : null; };
/* up to three open issues of this cabinet, the worst first */
function nveIssues() {
  var all = nveOpen(nvIssuesFor(S.sel)), rank = { error: 0, todo: 1, warn: 2 }, hasRev = nvTopicsFor(cur()).some(function (x) { return x.key === 'review'; });
  all = all.slice().sort(function (a, b) { return rank[a.sev] - rank[b.sev]; });
  if (!all.length) return '<div class="nve-ir ok">' + nveMark('ok') + '<span class="nve-im">' + L('Šioje spintelėje nieko taisyti nereikia.', 'Nothing to fix in this cabinet.') + '</span></div>';
  var at = function (x) {
    var a = '';
    if (x.act && (x.act.act || x.act.nv)) a = '<button type="button" class="nv-btn sm" ' + (x.act.act ? 'data-act="' + esc(x.act.act) + '"' : 'data-nv="' + esc(x.act.nv) + '"') + (x.act.v != null ? ' data-v="' + esc(x.act.v) + '"' : '') + (x.act.i != null ? ' data-i="' + esc(x.act.i) + '"' : '') + '>' + esc(x.act.label || L('Taisyti', 'Fix')) + '</button>';
    if ((!a || (x.act && x.act.nv === 'ack')) && (x.topic || x.field || x.tab)) a += '<button type="button" class="nv-btn sm" data-nv="go"' + (x.tab ? ' data-tab="' + esc(x.tab) + '"' : '') + (x.topic ? ' data-topic="' + esc(x.topic) + '"' : '') + (x.field ? ' data-field="' + esc(x.field) + '"' : '') + (x.sec != null ? ' data-sec="' + x.sec + '"' : '') + (x.col != null ? ' data-col="' + x.col + '"' : '') + '>' + L('Taisyti →', 'Fix →') + '</button>';
    return a;
  };
  var h = all.slice(0, 3).map(function (x) { return '<div class="nve-ir ' + x.sev + '">' + nveMark(x.sev) + '<span class="nve-im" title="' + esc(x.hint || '') + '">' + esc(x.msg) + '</span>' + at(x) + '</div>'; }).join('');
  if (all.length > 3) h += hasRev ? '<button type="button" class="nve-more" data-nv="go" data-topic="review">+' + (all.length - 3) + ' ' + L('daugiau', 'more') + ' →</button>' : '<span class="nve-more">+' + (all.length - 3) + ' ' + L('daugiau', 'more') + '</span>';
  return h;
}
NVLIVE.eissues = function (c) { return c ? nveIssues() : null; };

/* ----------------------------------------------------------------- inspector frame */
function nveTopicState(key) { return nvWorst(nvIssuesFor(S.sel).filter(function (x) { return x.topic === key; })); }
function nveRail(c) {
  var ts = nvTopicsFor(c), tp = nvTopicCur(c);
  return ts.map(function (x, n) {
    var w = nveTopicState(x.key), on = tp && x.key === tp.key, lab = x.label ? x.label() : x.key;
    return '<button type="button" class="nve-tab' + (on ? ' on' : '') + '" data-nv="topic" data-v="' + esc(x.key) + '"' + (on ? ' aria-current="page"' : '') + ' title="' + esc(lab) + '">' +
      '<span class="nve-tab-ic">' + (x.icon || '<em>' + (n + 1) + '</em>') + '</span><span class="nve-tab-l">' + esc(lab) + '</span>' + nveMark(w) + '</button>';
  }).join('');
}
NVLIVE.erail = function (c) { return c ? nveRail(c) : null; };
/* where "Toliau →" leads: the next topic with something open, else the next topic; after the last one the next cabinet
   that has something open (forward only, so the road always ends), else the layout stage */
function nveNext(c) {
  var ts = nvTopicsFor(c), tp = nvTopicCur(c), i = ts.indexOf(tp), iss = nveOpen(nvIssuesFor(S.sel)), k;
  for (k = i + 1; k < ts.length; k++) if (iss.some(function (x) { return x.topic === ts[k].key; })) return { topic: ts[k].key, label: ts[k].label() };
  if (i + 1 < ts.length) return { topic: ts[i + 1].key, label: ts[i + 1].label() };
  for (k = S.sel + 1; k < S.proj.cabinets.length; k++) if (nveOpen(nvIssuesFor(k)).length) return { cab: k };
  return { room: true };
}
function nveFoot(c) {
  var ts = nvTopicsFor(c), tp = nvTopicCur(c), i = ts.indexOf(tp), nx = nveNext(c), prev = i > 0 ? ts[i - 1] : null, lab;
  if (nx.topic) lab = L('Toliau: ', 'Next: ') + esc(nx.label);
  else if (nx.cab != null) { var k = S.proj.cabinets[nx.cab]; lab = L('Kita spintelė: ', 'Next cabinet: ') + (nx.cab + 1) + ' · ' + esc(k.name || typeName(k)); }
  else lab = L('Į išdėstymą', 'To the layout');
  return '<button type="button" class="nv-btn ghost" id="nve-back" data-nv="eback"' + (prev ? ' title="' + esc(prev.label()) + '"' : ' disabled') + '>← ' + L('Atgal', 'Back') + '</button>' +
    '<button type="button" class="nv-btn pri" id="nve-next" data-nv="enext"><span>' + lab + '</span> →</button>';
}
NVLIVE.efoot = function (c) { return c ? nveFoot(c) : null; };
function nveToInsp() { if (window.innerWidth < 1100) { var el = document.getElementById('nve-insp'); if (el) el.scrollIntoView(); } }   // stacked: the inspector is below the picture
NVA.enext = function () {
  var c = cur(); if (!c) return false; var nx = nveNext(c);
  if (nx.topic) { NV.secSel = null; nvGo({ topic: nx.topic }); nveToInsp(); }
  else if (nx.cab != null) { var k = S.proj.cabinets[nx.cab], ts = nvTopicsFor(k), op = nveOpen(nvIssuesFor(nx.cab)), first = ts.filter(function (x) { return op.some(function (y) { return y.topic === x.key; }); })[0] || ts[0]; nvGo({ sel: nx.cab, topic: first ? first.key : 'size', sec: null }); }
  else nvGo({ tab: 'room' });
  return false;
};
NVA.eback = function () {
  var c = cur(); if (!c) return false; var ts = nvTopicsFor(c), i = ts.indexOf(nvTopicCur(c)); if (i <= 0) return false;
  NV.secSel = null; nvGo({ topic: ts[i - 1].key }); nveToInsp(); return false;
};
/* − / + of a count: the same limits as the typed field */
NVA.estep = function (el, v) {
  var bind = el.getAttribute('data-b'), tg = target(bind), lim = numLimit(bind); if (!tg || !tg.obj) return false;
  var was = Math.round(num(getPath(tg.obj, tg.path)) || 0), n = was + (+v);
  if (lim) n = Math.max(lim.min, Math.min(lim.max, n));
  if (n === was) return false;
  assign(bind, n); save();
};
function nveStep(label, bind, val, hint) {
  var id = 'f-' + bind.replace(/\./g, '-'), lim = numLimit(bind) || { min: 0, max: 99 }, n = Math.round(num(val) || 0);
  return '<div class="f nve-stepf"><span>' + label + '</span><div class="nv-step" id="' + id + '" role="group" aria-label="' + esc(label) + '">' +
    '<button type="button" id="' + id + '-m" data-nv="estep" data-b="' + bind + '" data-v="-1"' + (n <= lim.min ? ' disabled' : '') + ' aria-label="' + esc(L('Mažiau', 'Fewer')) + '">−</button><b>' + n + '</b>' +
    '<button type="button" id="' + id + '-p" data-nv="estep" data-b="' + bind + '" data-v="1"' + (n >= lim.max ? ' disabled' : '') + ' aria-label="' + esc(L('Daugiau', 'More')) + '">+</button></div>' + (hint ? '<small class="nve-fh">' + hint + '</small>' : '') + '</div>';
}

/* ----------------------------------------------------------------- the stage */
NVSTAGE.cab = function (info) {
  var cabs = S.proj.cabinets;
  if (S.picking || !cabs.length) return typeof nvPicker === 'function' ? nvPicker() : viewPick();
  var c = cur(), inf = info[S.sel];
  var ob = document.getElementById('nve-body'), oc = document.getElementById('nve-cards');   // the page being replaced: where it was scrolled
  var keep = ob || oc ? { key: NV.eCab + '|' + NV.topic + '|' + NV.eSid, body: ob ? ob.scrollTop : 0, x: oc ? oc.scrollLeft : 0, y: oc ? oc.scrollTop : 0, sel: NV.eCab } : null;
  nveSync(c);
  var tp = nvTopicCur(c); if (tp) NV.topic = tp.key;
  NV.eScroll = keep && { key: c.id + '|' + NV.topic + '|' + NV.eSid, was: keep };
  var box = c.kind === 'box', view3 = box || NV.view === '3d', body;
  try { body = tp ? tp.body(c, inf) : '<div class="editor nve-live">' + (c.kind ? '' : cabBar(c)) + stepNav(c, inf) + oneStep(viewEditor(c), c, inf) + '</div>'; } catch (e) { if (window.console) console.error(e); body = '<div class="nv-issue error">' + L('Šios temos parodyti nepavyko: ', 'This topic could not be shown: ') + esc(String(e && e.message || e)) + '</div>'; }
  var pic = view3 ? null : nvePicture(c, inf);
  return '<div class="nve-ws' + (NV.topic === 'joints' ? ' nve-joints' : '') + '">' +
    '<aside class="nve-strip" aria-label="' + esc(t('cabs')) + '"><div class="nve-strip-h"><span>' + t('cabs') + '</span><b class="nv-num">' + cabs.length + '</b></div>' +
      '<div class="nve-cards" id="nve-cards" data-live="estrip">' + nveStrip(info) + '</div>' +
      '<button type="button" class="nve-new" data-act="pick">' + t('newCab') + '</button></aside>' +
    '<section class="nve-canvas nv-card" aria-label="' + esc(L('Spintelės vaizdas', 'Cabinet picture')) + '">' +
      '<header class="nve-chead"><div class="nve-ctitle" data-live="ehead">' + nveHead(c) + '</div>' +
        (box ? '' : '<div class="seg nve-view" role="group" aria-label="' + esc(L('Vaizdas', 'View')) + '">' + [['3d', '3D'], ['front', L('Priekis', 'Front')]].map(function (o) { var on = (NV.view === '3d' ? '3d' : 'front') === o[0]; return '<button type="button" id="nve-view-' + o[0] + '" data-nv="view" data-v="' + o[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + o[1] + '</button>'; }).join('') + '</div>') + '</header>' +
      (view3 ? '<div class="nve-3d">' + ((typeof nv3Html === 'function' && nv3Html()) || '<div id="assembly-preview"></div>') + '</div>'
        : '<div class="nve-stage' + (c.kind || c.dishwasher ? ' plain' : '') + '"><div class="nve-pic" data-live="epic" style="--a:' + pic.a.toFixed(4) + '">' + pic.html + '</div></div>' +
          (c.kind || c.dishwasher ? '' : '<p class="nve-tip">' + L('Spustelėkite sekciją, kad ją keistumėte · „+“ prideda naują viršuje', 'Click a section to change it · "+" adds a new one on top') + '</p>')) +
      '<div class="nve-iss" data-live="eissues" aria-label="' + esc(L('Šios spintelės pastabos', 'Issues of this cabinet')) + '">' + nveIssues() + '</div>' +
    '</section>' +
    '<aside class="nve-insp nv-card" id="nve-insp">' +
      '<nav class="nve-rail" data-live="erail" aria-label="' + esc(L('Spintelės temos', 'Cabinet topics')) + '">' + nveRail(c) + '</nav>' +
      '<div class="nve-pane"><header class="nve-phead"><h2 class="nv-h2">' + esc(tp ? tp.label() : typeName(c)) + '</h2><span class="nv-badge" data-live="ekind">' + nveKindBadge(c) + '</span></header>' +
        '<div class="nve-body" id="nve-body">' + body + '</div>' +
        '<footer class="nve-foot" data-live="efoot">' + nveFoot(c) + '</footer></div>' +
    '</aside></div>';
};
NVLIVE.ekind = function (c) { return c ? nveKindBadge(c) : null; };
NVAFTER.push(function () {
  if (S.home || !S.proj || S.tab !== 'cab') return;
  var k = NV.eScroll, b = document.getElementById('nve-body'), cards = document.getElementById('nve-cards'); NV.eScroll = null;
  if (k && b && k.key === k.was.key) b.scrollTop = k.was.body;                        // same cabinet, topic and section: stay where the hand is
  if (cards) {
    if (k) { cards.scrollLeft = k.was.x; cards.scrollTop = k.was.y; }
    var on = cards.querySelector('.nve-card.on');
    if (on && (!k || k.was.sel !== NV.eCab)) {                                          // another cabinet was opened: its card into view
      var cr = cards.getBoundingClientRect(), r = on.getBoundingClientRect();
      if (r.top < cr.top || r.bottom > cr.bottom) cards.scrollTop += r.top - cr.top - (cr.height - r.height) / 2;
      if (r.left < cr.left || r.right > cr.right) cards.scrollLeft += r.left - cr.left - (cr.width - r.width) / 2;
    }
  }
  if (NV.flash) { var f = document.getElementById(NV.flash), d = f && f.closest ? f.closest('details:not([open])') : null; while (d) { d.open = true; d = d.parentNode && d.parentNode.closest ? d.parentNode.closest('details:not([open])') : null; } }
});

/* ----------------------------------------------------------------- topic: Dydis / Size */
function nveActions(c) {
  return '<section class="nv-grp nve-acts"><h4>' + L('Ši spintelė', 'This cabinet') + '</h4><div class="nv-row">' +
    (c.libId ? '<button type="button" class="nv-btn sm nve-libon" id="nve-lib" data-act="libunlink" title="' + esc(t('libLinkedT')) + '">★ ' + t('libLinked') + '</button>'
             : '<button type="button" class="nv-btn sm" id="nve-lib" data-act="libsave" title="' + esc(t('libSaveT')) + '">☆ ' + t('libSave') + '</button>') +
    '<button type="button" class="nv-btn sm" id="nve-dup" data-act="dup">' + t('dup') + '</button>' +
    '<button type="button" class="nv-btn sm danger' + (S.confirm === 'del' ? ' sure' : '') + '" id="nve-del" data-act="del">' + (S.confirm === 'del' ? t('delSure') : t('del')) + '</button></div>' +
    (S.confirm === 'del' ? '<p class="nv-hint">' + L('Spustelėkite dar kartą — spintelė bus pašalinta (galėsite atšaukti).', 'Click once more — the cabinet is removed (you can undo it).') + '</p>' : '') + '</section>';
}
function nveDimIco(k) {   // which way the number goes: a small box with that edge marked
  return nveIco('<rect x="5" y="5" width="14" height="14" rx="1.5" opacity=".35"/>' + (k === 'W' ? '<path d="M5 21.5h14" stroke-width="2.4"/>' : k === 'H' ? '<path d="M2.5 5v14" stroke-width="2.4"/>' : '<path d="M19 5l3.2-2.6" stroke-width="2.4"/>'));
}
function nveSize(c) {
  var b = 'c.', o = c.cnc || {}, panel = c.kind === 'panel', dish = !!c.dishwasher, h = '';
  var lab = function (k, txt) { return nveDimIco(k) + txt; };
  h += '<section class="nv-grp nve-namegrp">' + fT(t('name'), b + 'name', c.name, null, 'grow').replace('<input ', '<input placeholder="' + esc(typeName(c)) + '" ') + '</section>';
  h += '<section class="nv-grp"><h4>' + (panel ? t('pnS1') : L('Išoriniai matmenys', 'Outer size')) + ' <small>mm</small></h4><div class="nve-dims">' +
    (panel ? fN(lab('W', t('rmThick')), b + 'W', c.W) : dish ? fN(lab('W', t('W')), b + 'dishWidth', c.dishWidth) : fN(lab('W', t('W')), b + 'W', c.W)) +
    fN(lab('H', t('H')), b + 'H', c.H) + fN(lab('D', t('D')), b + 'D', c.D) + '</div>' +
    '<p class="nv-hint">' + (panel ? t('pnNote') : dish ? L('Plotis — indaplovės nišos plotis. Galima rašyti 600-18.', 'Width is the dishwasher niche width. You can type 600-18.') : L('Karkaso dydis be kojelių ir stalviršio. Galima rašyti 600-18.', 'The carcass without legs and worktop. You can type 600-18.')) + '</p></section>';
  if (panel) {
    var pe = c.pe || {};
    h += '<section class="nv-grp"><h4>' + L('Medžiaga ir kraštai', 'Material and edges') + '</h4><div class="nv-fields">' + reqF(fT(t('rmPMat'), b + 'mat.carc', c.mat.carc, 'dl-mat'), c.mat.carc) + fT(t('pnEdgeMat'), b + 'edge.carc', c.edge.carc, 'dl-edge') + '</div>' +
      '<div class="f nve-ebs"><span>' + t('pnEdges') + '</span><span class="ebs">' + [['e1', t('pnE1')], ['e2', t('pnE2')], ['e3', t('pnE3')], ['e4', t('pnE4')]].map(function (e) { var id = 'f-pe-' + e[0]; return '<label class="ebx" for="' + id + '"><input id="' + id + '" type="checkbox" data-bind="c.pe.' + e[0] + '"' + (pe[e[0]] !== false ? ' checked' : '') + '>' + e[1] + '</label>'; }).join('') + '</span></div>' +
      '<p class="nv-hint">' + t('pnS1l') + '</p></section>' +
      '<details class="nv-adv" data-nve-adv="look"' + (NV.eAdv.look ? ' open' : '') + '><summary>' + t('lookT') + '</summary><p class="nv-hint">' + t('lookL') + '</p>' + lookBlock(lookNames([c])) + '</details>';
  } else {
    if (dish) h += '<section class="nv-grp nve-wt">' + worktopBlock(c) + '</section>';   // a dishwasher front has no carcass topic: its worktop is set here
    h += '<details class="nv-adv" data-nve-adv="size"' + (nveAdvOpen('size', /^f-c-(thick|cnc-facadeT)$/) ? ' open' : '') + '><summary>' + L('Daugiau nustatymų', 'More settings') + '<small>' + L('plokščių storis', 'board thickness') + ' ' + fmt(c.thick) + ' / ' + fmt(o.facadeT) + '</small></summary>' +
      '<div class="nv-fields">' + fN(L('Karkaso plokštė, mm', 'Carcass board, mm'), b + 'thick', c.thick, 's') + fN(L('Fasadas, mm', 'Front, mm'), b + 'cnc.facadeT', o.facadeT, 's') + '</div>' +
      '<p class="nv-hint">' + L('Plokštės storis keičia visų detalių dydžius ir gręžimą.', 'The board thickness changes the size and drilling of every part.') + '</p></details>';
  }
  return h + nveActions(c);
}
nvTopic({ key: 'size', order: 10, icon: NVE_ICON.size, label: function () { return L('Dydis', 'Size'); }, applies: function (c) { return c.kind !== 'box'; }, body: nveSize });

/* ----------------------------------------------------------------- topic: Vidus / Inside */
/* the front zone of a column as a bar: every section a piece (fixed = solid, "takes the rest" = light), what is free, what is over */
function nveZone(c, k) {
  var z = zoneInfo(c, k), used = z.exp + z.fillH * z.nFill, tot = Math.max(z.Hz, used, 1), free = z.Hz - used, bar = '';
  c.sections.forEach(function (s, i) {
    if (colOf(c, s) !== k) return; var h = s.fill ? z.fillH : Math.max(0, num(s.height)); if (!(h > 0)) return;
    bar += '<i class="' + (s.fill ? 'fill' : 'fix') + (NV.secSel === i ? ' on' : '') + '" style="flex:' + h.toFixed(1) + ' 1 0" title="' + esc(nveKindName(nveKindOf(s)) + ' · ' + fmt(h) + ' mm') + '"></i>';
  });
  if (!z.over && free > 1) bar += '<i class="free" style="flex:' + free.toFixed(1) + ' 1 0" title="' + esc(t('left') + ' ' + fmt(free) + ' mm') + '"></i>';
  var lim = z.over ? '<u style="left:' + (z.Hz / tot * 100).toFixed(2) + '%"></u>' : '';
  var note = z.over ? L('Sumažinkite aukščius arba vienai sekcijai įjunkite „Užima likusį aukštį“.', 'Reduce the heights, or switch "Takes the remaining height" on for one section.')
    : !z.nFill && free > 1 ? L('Lieka tuščia vieta — vienai sekcijai įjunkite „Užima likusį aukštį“ arba pridėkite dar vieną.', 'Space is left — switch "Takes the remaining height" on for one section, or add another.') : '';
  return '<div class="nve-zone' + (z.over ? ' over' : !z.nFill && free > 1 ? ' gap' : '') + '"><div class="nve-zbar">' + bar + lim + '</div><div class="nve-ztxt">' + zoneHtml(z) + '</div>' + (note ? '<p class="nve-znote">' + note + '</p>' : '') + '</div>';
}
NVLIVE.ezone = function (c, inf, arg) { return c && !c.kind && !c.dishwasher ? nveZone(c, Math.min(colsOf(c) - 1, +arg || 0)) : null; };
function nveColTabs(c) {
  var nC = colsOf(c), cw = colWidths(c), ac = activeCol(c);
  return cw.map(function (w, k) {
    var z = zoneInfo(c, k), n = c.sections.filter(function (s) { return colOf(c, s) === k; }).length;
    return '<button type="button" role="tab" id="nve-col-' + k + '" class="' + (k === ac ? 'on' : '') + (z.over ? ' over' : '') + '" data-act="colsel" data-v="' + k + '" aria-selected="' + (k === ac) + '" style="flex:' + Math.max(1, w).toFixed(0) + ' 1 0"><b>' + colName(nC, k) + '</b><span class="nv-num">' + fmt(w) + ' mm · ' + (n ? nvePl(n, ['sekcija', 'sekcijos', 'sekcijų'], ['section', 'sections']) : L('tuščia', 'empty')) + '</span></button>';
  }).join('');
}
NVLIVE.ecols = function (c) { return c && colsOf(c) > 1 ? nveColTabs(c) : null; };
/* the sections of one column, top first — as the cabinet stands */
function nveList(c, k) {
  var h = '', n = 0;
  for (var i = c.sections.length - 1; i >= 0; i--) {
    var s = c.sections[i]; if (colOf(c, s) !== k) continue; n++;
    var kk = nveKindOf(s);
    h += '<div class="nve-row k-' + kk + '"><button type="button" class="nve-row-m" id="nve-row-' + i + '" data-nv="esec" data-i="' + i + '">' + NVE_ICON[kk] +
      '<span class="nve-row-t"><b>' + nveKindName(kk) + '</b><small>' + esc(nveSecSum(s)) + '</small></span>' +
      '<span class="nve-row-h nv-num">' + (s.fill ? '<small>' + L('likęs', 'rest') + '</small>' : '') + fmt(nveSecH(c, s)) + ' mm</span></button>' +
      '<span class="nve-row-x"><button type="button" id="nve-up-' + i + '" data-act="mv" data-i="' + i + '" data-v="1"' + (lastInCol(c, i) ? ' disabled' : '') + ' title="' + esc(t('up')) + '" aria-label="' + esc(t('up')) + '">▲</button>' +
      '<button type="button" id="nve-dn-' + i + '" data-act="mv" data-i="' + i + '" data-v="-1"' + (firstInCol(c, i) ? ' disabled' : '') + ' title="' + esc(t('down')) + '" aria-label="' + esc(t('down')) + '">▼</button>' +
      '<button type="button" class="x" data-act="rmsec" data-i="' + i + '" title="' + esc(t('rm')) + '" aria-label="' + esc(t('rm')) + '">✕</button></span></div>';
  }
  return n ? h : '<div class="nv-empty nve-none">' + L('Čia dar nieko nėra — pasirinkite, kas bus viduje.', 'Nothing here yet — choose what goes inside.') + '</div>';
}
NVLIVE.elist = function (c, inf, arg) { return c && !c.kind && !c.dishwasher ? nveList(c, Math.min(colsOf(c) - 1, +arg || 0)) : null; };
function nveAddRow(k, top) {
  return '<div class="nve-addrow"><span class="nve-addl">' + (top ? t('add') : L('Pridėti', 'Add')) + '</span>' + NVE_KINDS.map(function (kd) {
    return '<button type="button" class="nve-addk" data-act="addsec" data-v="' + kd + '" data-i="' + k + '">' + NVE_ICON[kd] + '<span>' + nveKindName(kd) + '</span></button>'; }).join('') + '</div>';
}
/* another kind for the same place: the section keeps its height and every setting it had (one record holds them all) */
NVA.ekind = function (el, v, i) {
  var c = cur(), s = c && c.sections[i]; if (!s || nveKindOf(s) === v) return false;
  var b = 'c.sections.' + i + '.';
  if (v === 'fridge') { assign(b + 'kind', 'doors'); assign(b + 'fridge', true); }
  else {
    if (s.fridge) assign(b + 'fridge', false);
    if (s.kind === 'doors' && /^CARGO/i.test(s.hinge || '')) s.hinge = 'BLUM LANKSTAI';
    assign(b + 'kind', v);
    if (v === 'oven') { if (s.fill) { s.fill = false; s.height = 595; } s.shelves = 2; }   // an oven niche is 595 high, with a support below and above — as a new one
  }
  save();
};
function nveSecEditor(c, s, i, z, zoneHtml0) {
  var b = 'c.sections.' + i + '.', kk = nveKindOf(s), secH = s.fill ? z.fillH : num(s.height), g = E.R.facade.gap;
  var nC = colsOf(c), col = colOf(c, s), inCol = sameCol(c, i), pos = inCol.indexOf(i), colW = nC > 1 ? colWidths(c)[col] : num(c.W);
  var segF = function (label, bind, val, opts, wide) { return '<div class="f' + (wide ? ' nve-wide' : '') + '"><span>' + label + '</span>' + seg(bind, val, opts) + '</div>'; };
  var where = (nC > 1 ? colName(nC, col) + L(' kolona', ' column') + ' · ' : '') + (inCol.length > 1 ? (pos === inCol.length - 1 ? L('viršuje', 'at the top') : pos === 0 ? L('apačioje', 'at the bottom') : L('viduryje', 'in the middle')) + ' · ' + (inCol.length - pos) + L(' iš ', ' of ') + inCol.length : L('vienintelė sekcija', 'the only section'));
  var h = '<div class="nve-sechead"><button type="button" class="nv-btn ghost sm" id="nve-all" data-nv="esec" data-v="none">← ' + L('Visos sekcijos', 'All sections') + '</button>' +
    '<span class="nve-sectools"><button type="button" id="nve-up-' + i + '" data-act="mv" data-i="' + i + '" data-v="1"' + (lastInCol(c, i) ? ' disabled' : '') + ' title="' + esc(t('up')) + '" aria-label="' + esc(t('up')) + '">▲</button>' +
    '<button type="button" id="nve-dn-' + i + '" data-act="mv" data-i="' + i + '" data-v="-1"' + (firstInCol(c, i) ? ' disabled' : '') + ' title="' + esc(t('down')) + '" aria-label="' + esc(t('down')) + '">▼</button>' +
    '<button type="button" class="x" data-act="rmsec" data-i="' + i + '" title="' + esc(t('rm')) + '">✕ ' + t('rm') + '</button></span></div>';
  h += '<div class="nve-sec"><div class="nve-sectitle">' + NVE_ICON[kk] + '<div><b>' + nveKindName(kk) + '</b><small>' + esc(where) + '</small></div></div>';
  h += '<div class="nve-kinds" role="group" aria-label="' + esc(t('type')) + '">' + NVE_KINDS.concat(['fridge']).map(function (kd) {
    return '<button type="button" id="nve-kind-' + kd + '" data-nv="ekind" data-v="' + kd + '" data-i="' + i + '" class="' + (kd === kk ? 'on' : '') + '" aria-pressed="' + (kd === kk) + '" title="' + esc(nveKindName(kd)) + '">' + NVE_ICON[kd] + '<span>' + nveKindName(kd) + '</span></button>'; }).join('') + '</div>';
  /* height: takes what is left, or a number */
  h += '<div class="nve-hrow"><div class="nve-sw">' + chk(b + 'fill', s.fill, L('Užima likusį aukštį', 'Takes the remaining height')) + '</div>' +
    (s.fill ? '<b class="nve-hval nv-num" data-fill-h="' + i + '" title="' + esc(t('secH')) + '">' + fmt(secH) + ' mm</b>' : fN('mm', b + 'height', s.height).replace('<input ', '<input aria-label="' + esc(t('secH')) + ', mm" ')) + '</div>' + zoneHtml0;
  var f = '';
  if (kk === 'drawers') {
    var hws = ['BLUM TANDEMBOX', 'BLUM MERIVOBOX', 'BLUM TANDEM', 'GTV KULKINIAI H45', 'DTC KULKINIAI H45', 'DTC PASLĖPTI'], rl = railLengths(s.hw);
    f += nveStep(t('nDr'), b + 'nDrawers', s.nDrawers, num(s.nDrawers) > 1 ? '' : L('fasadas ', 'front ') + fmt(secH - g) + ' mm') +
      fS(t('runner'), b + 'hw', s.hw, [['BLUM TANDEMBOX', 'Blum TANDEMBOX'], ['BLUM MERIVOBOX', 'Blum MERIVOBOX'], ['BLUM TANDEM', 'Blum TANDEM'], ['GTV KULKINIAI H45', t('rGtv')], ['DTC KULKINIAI H45', t('rDtc')], ['DTC PASLĖPTI', t('rDtcU')]].concat(hws.indexOf(s.hw) < 0 ? [[s.hw, s.hw]] : [])) +
      fS(t('rail'), b + 'rail', s.rail, rl.concat(rl.indexOf(num(s.rail)) < 0 ? [num(s.rail)] : []).map(function (v) { return [v, v + ' mm']; })) + mvFields(b, s);
  } else if (kk === 'fridge') {
    var th0 = num(c.thick) || 18;
    f += fS(t('fridgeN'), b + 'nDoors', Math.max(1, Math.min(2, Math.round(num(s.nDoors) || 2))), [[1, t('fridge1')], [2, t('fridge2')]]) +
      segF(t('fridgeHinge'), b + 'hingeSide', s.hingeSide === 'right' ? 'right' : 'left', [['left', t('hsL')], ['right', t('hsR')]]) +
      '<p class="nv-hint nve-wide">' + esc(t('fridgeHandle').replace('{s}', s.hingeSide === 'right' ? t('hsL') : t('hsR'))) + ' · ' + esc(t('fridgeNiche').replace('{h}', fmt(secH - 2 * th0)).replace('{w}', fmt(colW - 2 * th0))) + '</p>';
  } else if (kk === 'cargo') {
    var ch = s.cargoHw || E.CARGO_HW[0];
    f += fS(t('cargoHw'), b + 'cargoHw', ch, E.CARGO_HW.map(function (v) { return [v, hingeLabel(v)]; }).concat(E.CARGO_HW.indexOf(ch) < 0 ? [[ch, ch]] : [])) +
      '<p class="nv-hint nve-wide">' + esc(t('cargoNote').replace('{w}', fmt(colW))) + '</p>';
  } else if (kk === 'doors') {
    var under = c.sections[inCol[pos - 1]], nd = num(s.nDoors), stack = s.doorSplit === 'h';
    f += nveStep(t('nDoors'), b + 'nDoors', s.nDoors) + segF(t('split'), b + 'doorSplit', s.doorSplit, [['v', t('sSide')], ['h', t('sStack')]]) +
      fS(t('hinge'), b + 'hinge', s.hinge, E.DOOR_HW.map(function (v) { return [v, hingeLabel(v)]; }).concat(E.DOOR_HW.indexOf(s.hinge) < 0 ? [[s.hinge, s.hinge]] : [])).replace('class="f"', 'class="f nve-wide"') +
      (nd >= 2 && !stack ? '' : segF(t('hside'), b + 'hingeSide', s.hingeSide || 'auto', [['auto', t('hsAuto')], ['left', t('hsL')], ['right', t('hsR')]])) +   // a pair side by side opens from the outer sides
      (s.hinge === 'BE FURNITŪROS' ? '' : segF(t('hingeN'), b + 'hingeN', +s.hingeN >= 2 ? String(Math.round(+s.hingeN)) : 'auto', [['auto', t('hsAuto') + ' (' + E.hingesPerDoor(stack ? secH / Math.max(1, nd || 1) - g : secH - g) + ')'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], true)) +
      nveStep(t('shelves'), b + 'shelves', s.shelves) + (num(s.shelves) > 0 ? segF(L('Lentynos', 'Shelves are'), b + 'shelfAdj', s.shelfAdj !== false, [['true', t('adj')], ['false', t('fixed')]]) : '') +
      (under && under.kind === 'open' ? fN(L('Durys žemiau, ant nišos, mm', 'Doors lower, over the niche, mm'), b + 'frontDrop', s.frontDrop || 0) : '') +
      (c.type === 'ŪKINĖ' || c.robe || num(s.hang) > 0 ? nveStep(L('Pakabos vamzdžių', 'Hanging rails'), b + 'hang', s.hang || 0, L('po viršutine lentyna', 'under the top shelf')) : '');
  } else if (kk === 'open') {
    f += nveStep(t('shelves'), b + 'shelves', s.shelves) + (num(s.shelves) > 0 ? segF(L('Lentynos', 'Shelves are'), b + 'shelfAdj', s.shelfAdj !== false, [['true', t('adj')], ['false', t('fixed')]]) : '') +
      (c.sections.some(function (q) { return colOf(c, q) === col && (q.kind === 'drawers' || q.kind === 'doors' || q.kind === 'cargo') && !q.fridge; }) ?
        '<div class="nve-wide">' + chk(b + 'divider', !!s.divider, L('Skiriamoji lentyna tarp nišos ir fasadų — fasadai ją uždengia', 'Dividing shelf between the niche and the fronts — the fronts cover it')) + '</div>' : '') +
      (c.type === 'ŪKINĖ' || c.robe || num(s.hang) > 0 ? nveStep(L('Pakabos vamzdžių', 'Hanging rails'), b + 'hang', s.hang || 0, L('po viršutine lentyna', 'under the top shelf')) : '');
  } else {
    f += fS(t('sup'), b + 'shelves', Math.min(2, num(s.shelves)), [[0, L('0 — be atramų', '0 — none')], [1, '1 — ' + L('apačioje', 'below')], [2, '2 — ' + L('apačioje ir viršuje', 'below and above')]]) +
      '<p class="nv-hint nve-wide">' + L('Orkaitės nišai fasadas nedaromas. Įprastas nišos aukštis — 595 mm.', 'No front is made for the oven niche. The usual niche height is 595 mm.') + '</p>';
  }
  h += '<div class="nve-secf">' + f + '</div>';
  var nStack = kk === 'drawers' ? num(s.nDrawers) : (kk === 'doors' && s.doorSplit === 'h') || kk === 'fridge' ? num(s.nDoors) : 0;
  if (nStack > 1) h += frontsEditor(s, i, secH, Math.round(nStack));
  if ((kk === 'doors' || kk === 'open') && num(s.shelves) > 0) h += '<section class="nv-grp nve-shelf"><h4>' + L('Lentynos: aukštis ir gylis', 'Shelves: height and depth') + '</h4>' + shelfPosEditor(c, s, i) + shelfFront(c) +
    '<p class="nv-hint">' + L('Atitraukimas — kiek lentynos priekis giliau už korpuso priekį; galioja visoms šios spintelės lentynoms.', 'Setback — how far the shelf front sits behind the carcass front; it applies to all shelves of this cabinet.') + '</p></section>';
  if (kk === 'fridge') h += '<p class="nv-hint">' + esc(t('fridgeNote').replace('{v}', E.R.fridgeVent)) + '</p>';
  return h + '</div>';
}
function nveInside(c, inf) {
  var b = 'c.', nC = colsOf(c), cw = colWidths(c), ac = activeCol(c), si = NV.secSel, s = si != null ? c.sections[si] : null, h = '';
  var zone = function (k) { return '<div class="nve-zonewrap" data-live="ezone" data-live-arg="' + k + '">' + nveZone(c, k) + '</div>'; };
  if (s) return nveSecEditor(c, s, si, zoneInfo(c, colOf(c, s)), zone(colOf(c, s)));   // the zone bar right under the height it answers to
  if (typeof nvwPanel === 'function') h += nvwPanel(c);
  h += '<section class="nv-grp"><h4>' + t('parts2') + ' <small>' + L('vertikalios — dalija spintelę į kolonas', 'vertical — they split the cabinet into columns') + '</small></h4>' +
    seg(b + 'cols', nC, [[1, t('part0')], [2, t('part1')], [3, t('part2')]]) +
    (nC > 1 ? '<div class="nv-fields nve-colw">' + cw.slice(0, nC - 1).map(function (w, k) { return fN(colName(nC, k) + ', mm', b + 'colW.' + k, fmt(w), 's'); }).join('') +
      '<div class="f s"><span>' + colName(nC, nC - 1) + '</span><b class="colrest" id="colw-last">' + fmt(cw[nC - 1]) + ' mm</b></div></div><p class="nv-hint">' + t('colWnote') + '</p>' : '') + '</section>';
  h += '<section class="nv-grp"><h4>' + L('Sekcijos', 'Sections') + ' <small>' + L('nuo viršaus žemyn', 'from the top down') + '</small></h4>' +
    (nC > 1 ? '<div class="nve-cols" role="tablist" aria-label="' + esc(t('colEdit')) + '" data-live="ecols">' + nveColTabs(c) + '</div>' : '') +
    zone(ac) + '<div class="nve-list" data-live="elist" data-live-arg="' + ac + '">' + nveList(c, ac) + '</div>' + nveAddRow(ac, c.sections.some(function (q) { return colOf(c, q) === ac; })) + '</section>';
  var fg = fgBlock(c), sf = c.sections.some(function (q) { return (q.kind === 'doors' || q.kind === 'open') && num(q.shelves) > 0; }) ? shelfFront(c) : '';
  if (fg) h += '<section class="nv-grp nve-fg"><h4>' + L('Fasadų dydis ir tarpai', 'Front size and gaps') + ' <small>mm</small></h4>' +
    '<p class="nv-hint" style="margin:0 0 8px">' + L('Tempkite oranžines rankenėles paveiksle arba įrašykite tarpus čia. Tuščias laukas — pagal dirbtuvės taisyklę.', 'Drag the orange handles on the picture, or type the gaps here. An empty field follows the workshop rule.') + '</p>' +
    fg.replace(/<div class="lbl">[^<]*<\/div>/, '') + '</section>';
  if (sf) h += '<section class="nv-grp nve-shelf"><h4>' + L('Lentynos: gylis', 'Shelves: depth') + ' <small>mm</small></h4>' + sf +
    '<p class="nv-hint">' + L('Kiekvienos lentynos aukštį nustatysite spustelėję jos sekciją paveiksle arba sąraše aukščiau.', 'Set each shelf\'s height by clicking its section on the picture or in the list above.') + '</p></section>';
  return h;
}
nvTopic({ key: 'inside', order: 20, icon: NVE_ICON.inside, label: function () { return L('Vidus', 'Inside'); }, applies: function (c) { return !c.kind && !c.dishwasher; }, body: nveInside });

/* dragging a front grip: the gap follows the pointer in millimetres (the picture's scale), snaps to the same places as
   in the live app (flush, the rule's value, half a board), and is written to c.cnc.fg on release */
var nveFG = null;
/* doors that stand right above an open niche at the bottom of their column: their lower edge is moved with the section's
   own "doors lower, over the niche" (frontDrop), not with the cabinet's bottom gap — the live app's rule */
function nveDropSecs(c) {
  var out = [];
  (c.sections || []).forEach(function (s, i) { if (s.kind !== 'doors' || s.fridge) return; var col = sameCol(c, i), k = col.indexOf(i), under = c.sections[col[k - 1]]; if (k === 1 && under && under.kind === 'open') out.push(i); });
  return out;
}
document.addEventListener('pointerdown', function (ev) {
  var el = ev.target && ev.target.closest ? ev.target.closest('[data-nvfg]') : null; if (!el) return;
  var c = cur(), inf = S._info && S._info[S.sel], r = inf && inf.r, pic = el.closest('.nve-pic'), svg = pic && pic.querySelector('svg'); if (!c || !r || !r.fgaps || !svg) return;
  var e = fgFronts(r), vb = svg.viewBox.baseVal, rc = svg.getBoundingClientRect(); if (!e || !vb.width) return;
  ev.preventDefault(); ev.stopPropagation();
  nveFG = { el: el, k: el.getAttribute('data-nvfg'), r: r, e: e, pic: pic, mm: Math.max(vb.width / rc.width, vb.height / rc.height), x: ev.clientX, y: ev.clientY, l0: el.offsetLeft, t0: el.offsetTop, v: null, tip: pic.querySelector('.nve-fgtip') };
  var g = r.fgaps, k = nveFG.k;
  if (k === 'bot') { var dropS = nveDropSecs(c); if (dropS.length && dropS.length === colsOf(c)) { /* every column ends in doors over a niche: the grip is their lower edge */ nveFG.drop = dropS; nveFG.v0 = Math.max(0, num(c.sections[dropS[0]].frontDrop) || 0); nveFG.max = nveFG.v0 + Math.max(0, e.z0 - g.hb - 20); el.classList.add('drag'); try { el.setPointerCapture(ev.pointerId); } catch (x2) {} return; } }
  nveFG.v0 = k === 'bot' ? e.z0 - g.hb : k === 'top' ? +r.dims.H - e.z1 : k === 'l' ? e.x0 : +r.dims.W - e.x1;
  el.classList.add('drag'); try { el.setPointerCapture(ev.pointerId); } catch (x) {}
}, true);
document.addEventListener('pointermove', function (ev) {
  var d = nveFG; if (!d) return;
  var r = d.r, g = r.fgaps, k = d.k, dx = (ev.clientX - d.x) * d.mm, dy = (ev.clientY - d.y) * d.mm, v, snaps, sn = null;
  if (d.drop) { v = Math.max(0, Math.min(d.v0 + dy, d.max)); snaps = [[0, L('be nuleidimo', 'no drop')], [+r.dims.t, L('uždengia lentyną', 'covers the shelf')]];
    snaps.forEach(function (s0) { if (sn == null && Math.abs(v - s0[0]) < Math.max(1.5, 6 * d.mm)) { v = s0[0]; sn = s0[1]; } });
    v = Math.round(v); d.v = v; d.el.style.top = (d.t0 + (v - d.v0) / d.mm) + 'px';
    if (d.tip) { d.tip.hidden = false; d.tip.textContent = L('Durys žemiau, ant nišos', 'Doors lower, over the niche') + ': ' + fmt(v) + ' mm' + (sn ? ' — ' + sn : ''); d.tip.style.left = d.l0 + 'px'; d.tip.style.top = d.el.style.top; }
    return; }
  if (k === 'bot') { v = d.v0 - dy; snaps = [[0, t('fgSnapBot')], [g.botMin, t('fgSnapSide')]]; v = Math.max(g.botLow != null ? g.botLow : g.botMin, Math.min(v, d.e.z1 - g.hb - 120)); }
  else if (k === 'top') { v = d.v0 + dy; snaps = [[0, t('fgSnapTop')], [g.mid, ''], [g.top, '']]; v = Math.max(0, Math.min(v, 80)); }
  else if (k === 'l') { v = d.v0 + dx; snaps = [[0, t('fgSnapOut')], [3, ''], [+r.dims.t / 2, '']]; v = Math.max(0, Math.min(v, 40)); }
  else { v = d.v0 - dx; snaps = [[0, t('fgSnapOut')], [3, ''], [+r.dims.t / 2, '']]; v = Math.max(0, Math.min(v, 40)); }
  snaps.forEach(function (s0) { if (sn == null && Math.abs(v - s0[0]) < Math.max(1.5, 6 * d.mm)) { v = s0[0]; sn = s0[1]; } });
  v = Math.round(v * 2) / 2; d.v = v;
  var px = (v - d.v0) / d.mm;   // where the grip is now
  if (k === 'bot') d.el.style.top = (d.t0 - px) + 'px'; else if (k === 'top') d.el.style.top = (d.t0 + px) + 'px'; else if (k === 'l') d.el.style.left = (d.l0 + px) + 'px'; else d.el.style.left = (d.l0 - px) + 'px';
  if (d.tip) { d.tip.hidden = false; d.tip.textContent = (k === 'bot' ? t('fgBot') : k === 'top' ? t('fgTop') : k === 'l' ? t('fgL') : t('fgR')) + ': ' + fmt(v) + ' mm' + (sn ? ' — ' + sn : '');
    d.tip.style.left = d.el.style.left || d.l0 + 'px'; d.tip.style.top = d.el.style.top || d.t0 + 'px'; }
});
document.addEventListener('pointerup', function () {
  var d = nveFG; if (!d) return; nveFG = null; d.el.classList.remove('drag');
  var c = cur(); if (d.v == null || !c) return;
  if (d.drop) { d.drop.forEach(function (i) { if (c.sections[i]) c.sections[i].frontDrop = d.v; }); save(); render(); return; }
  c.cnc.fg = Object.assign({}, c.cnc.fg || {}); c.cnc.fg[d.k] = d.v; save(); render();
});
