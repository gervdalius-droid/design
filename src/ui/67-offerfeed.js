/* 67-offerfeed.js — what the offer app (Pasiūlymai, /offer/) needs to price this project, kept up to date while you design.
   After every full render the project's quantities are published — no prices, the offer app has those:
     • every board by material: m², whether it counts in the m² the overheads follow (backs and the worktop do not);
       a carcass part in the front material (a visible side) is a front board;
     • cutting metres, banding metres per edge material (karkaso / PAGAL FASADA / …);
     • drawer boxes the shop makes besides the parts (as the offer app's drawerBox), the worktop, every fitting with its quantity.
   Same browser: localStorage 'dbKurejas.offerFeed' (project id → feed), so an open offer updates at once (storage event).
   Other computers: the workspaces row 'builder-offer-<project id>' (signed in). Priced in the offer app by
   offer/builder-sync.js — the same model as the admin prices here (app.js priceCabinet). */
var NVO = { timer: null, cloudT: null, sig: {} };
NVAFTER.push(function () { if (!S.proj || S.home) return; clearTimeout(NVO.timer); NVO.timer = setTimeout(nvoPublish, 1200); });
function nvoCab(c, r, i) {
  var mats = c.mat || {}, eds = c.edge || {}, n = function (v) { return Math.round((+v || 0) * 1000) / 1000; };
  var o = { id: c.id, no: i + 1, name: c.name || typeName(c), kind: c.kind || '', type: c.type || '', dish: !!c.dishwasher,
    W: num(c.dishwasher ? c.dishWidth : c.W), H: num(c.H), D: num(c.D), legH: num(c.legH) || 0,
    mats: { carc: mats.carc || '', facade: mats.facade || '', back: mats.back || '', drawer: mats.drawer || '' }, edgesDef: { carc: eds.carc || '', facade: eds.facade || '' },
    boards: [], cutM: 0, edges: {}, drawers: { n: 0, m2: 0, cutM: 0, bandM: 0, mat: mats.carc || '' }, top: null, hw: [], parts: [], doors: 0, drawerN: 0 };
  var bmap = {}, board = function (name, kind, m2, basis) { var k = name + '|' + kind + '|' + (basis ? 1 : 0), b = bmap[k] || (bmap[k] = { mat: name, kind: kind, m2: 0, basis: !!basis }); b.m2 += m2; };
  var band = function (name, m) { if (m > 0) o.edges[name || ''] = (o.edges[name || ''] || 0) + m; };
  (r.panels || []).forEach(function (p) {
    var front = /^(FASADAS|DURYS|PLOKSTE)$/.test(p.role), hdf = p.role === 'PLAUSAS' || /HDF/i.test(p.mat || ''), back = hdf || p.role === 'NUGARA';
    var mat = p.mat || (front ? mats.facade : back ? mats.back : mats.carc) || '';
    var kind = front || (mat && mat === mats.facade) ? 'facade' : hdf ? 'back' : p.drawerOf ? 'drawer' : 'carc';
    board(mat, kind, p.L * p.W / 1e6, !back);
    o.cutM += 2 * (p.L + p.W) / 1000;
    var eb = p.eb || {}, cnt = { L: 0, W: 0 };
    ['y0', 'y1', 'x0', 'x1'].forEach(function (k) { if (!eb[k]) return; var len = (k[0] === 'y' ? p.L : p.W) / 1000; band(eb[k], len); cnt[k[0] === 'y' ? 'L' : 'W']++; });
    o.parts.push({ n: p.short || p.name, role: p.role, mat: mat, L: n(p.L), W: n(p.W), T: n(p.T), eb: (cnt.L ? cnt.L + 'L ' : '') + (cnt.W ? cnt.W + 'W' : ''), vis: kind === 'facade' && !front });
  });
  (c.extras || []).forEach(function (x) {   // loose boards of the cabinet (plinth, filler, …)
    var L0 = num(x.L), W0 = num(x.W), q = Math.max(1, Math.round(num(x.qty) || 1)); if (!(L0 > 0 && W0 > 0) || (x.qty !== '' && x.qty != null && !(num(x.qty) > 0))) return;
    var mat = x.mat || mats.carc || '', fac = mat && mat === mats.facade; board(mat, fac ? 'facade' : 'carc', L0 * W0 * q / 1e6, true);
    o.cutM += 2 * (L0 + W0) * q / 1000;
    var em = x.edgeMat || (fac ? eds.facade : eds.carc) || ''; [['e1', L0], ['e2', L0], ['e3', W0], ['e4', W0]].forEach(function (e) { if (x[e[0]]) band(em, e[1] * q / 1000); });
    o.parts.push({ n: x.name || x.note || L('Papildoma', 'Extra'), role: 'EXTRA', mat: mat, L: L0, W: W0, T: num(x.T) || num(c.thick) || 18, q: q });
  });
  var wt = E.worktopOf(c);
  if (wt) { var wl = wt.edge ? (wt.L + (wt.left > 0 ? wt.W : 0) + (wt.right > 0 ? wt.W : 0)) / 1000 : 0;
    o.top = { mat: wt.mat || '', L: wt.L, W: wt.W, m2: n(wt.L * wt.W / 1e6), cutM: n(2 * (wt.L + wt.W) / 1000), edge: wt.edge || '', edgeM: n(wl) }; }
  var vis = (r.visual && r.visual.drawers) || [], t_ = (r.dims && r.dims.t) || num(c.thick) || 18;
  o.drawerN = vis.length; o.doors = ((r.visual && r.visual.doors) || []).length;
  if (vis.length && DR) {   // drawer boxes not among the parts (as priceCabinet: the offer app's drawerBox)
    var vert = (r.panels || []).filter(function (p) { if (!p.place || p.drawerOf || /^(FASADAS|DURYS)$/.test(p.role)) return false; var e = DR.pbox(p); return (e[0][1] - e[0][0]) < Math.min(e[1][1] - e[1][0], e[2][1] - e[2][0]); }).map(function (p) { return DR.pbox(p); });
    vis.forEach(function (f) {
      var rt = E.R.runner[f.hw]; if (f.cargo || f.tb || (rt && (rt.ball || rt.under || (rt.merivo && f.mv)))) return;   // the box is among the parts already (or a cargo pull-out)
      var xc = f.x + f.w / 2, zc = f.bottom + f.h / 2, lo = -Infinity, hi = Infinity;
      vert.forEach(function (e) { if (zc < e[2][0] || zc > e[2][1]) return; if (e[0][1] <= xc + 1) lo = Math.max(lo, e[0][1]); if (e[0][0] >= xc - 1) hi = Math.min(hi, e[0][0]); });
      var openIn = isFinite(lo) && isFinite(hi) ? hi - lo : f.w - 2 * t_, secs = (c.sections || []).filter(function (s2) { return Math.max(0, Math.floor(num(s2.col) || 0)) === (f.col || 0); }), s2 = f.box ? { hw: f.hw, rail: f.rail } : secs[f.sec] || {};
      var db = offerDrawerBox(openIn, f.h + 3, f.hw || s2.hw, s2.rail);
      o.drawers.n++; o.drawers.m2 += db.m2; o.drawers.cutM += db.perim / 1000; o.drawers.bandM += db.band / 1000;
    });
  }
  (r.hardware || []).forEach(function (h) { o.hw.push({ item: h.item, qty: n(h.qty), unit: h.unit || '' }); });
  o.boards = Object.keys(bmap).map(function (k) { var b = bmap[k]; b.m2 = n(b.m2); return b; });
  ['m2', 'cutM', 'bandM'].forEach(function (k) { o.drawers[k] = n(o.drawers[k]); }); o.cutM = n(o.cutM); Object.keys(o.edges).forEach(function (k) { o.edges[k] = n(o.edges[k]); });
  return o;
}
function nvoHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function nvoPublish() {
  if (!S.proj || !S.proj.id) return;
  var info = S._info || [], pid = S.proj.id, cabs = [];
  S.proj.cabinets.forEach(function (c, i) { var inf = info[i]; if (inf && inf.r) { try { cabs.push(nvoCab(c, inf.r, i)); } catch (e) { if (window.console) console.warn('offer feed', e); } } });
  var pp = S.proj.pricing || {}, feed = { v: 1, pid: pid, name: S.proj.name || '', updated: S.proj.updated || '', cabinets: cabs, install: num(pp.montavimas), delivery: num(pp.delivery) };
  var sig = nvoHash(JSON.stringify(feed)); if (NVO.sig[pid] === sig) return; NVO.sig[pid] = sig;
  feed.sig = sig; feed.at = Date.now();
  try {
    var all = JSON.parse(localStorage.getItem('dbKurejas.offerFeed') || '{}') || {}; all[pid] = feed;
    var ids = Object.keys(all).sort(function (a, b) { return (all[b].at || 0) - (all[a].at || 0); }); ids.slice(30).forEach(function (k) { delete all[k]; });
    try { localStorage.setItem('dbKurejas.offerFeed', JSON.stringify(all)); }
    catch (eq) { var one = {}; one[pid] = feed; localStorage.setItem('dbKurejas.offerFeed', JSON.stringify(one)); }
  } catch (e) {}
  var W = window.WorkshopAuth; if (!W || !W.signedIn || !W.signedIn() || S.ro) return;
  clearTimeout(NVO.cloudT);
  NVO.cloudT = setTimeout(function () {
    W.rest('workspaces?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 'builder-offer-' + pid, data: feed, updated_by: 'builder' }) }).catch(function () {});
  }, 3000);
}
