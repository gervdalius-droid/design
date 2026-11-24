/* 46-pick.js — click a board in the 3-D picture and change it right there: its material, and what makes sense for
   that kind of board (remove a back or a rail, make a side visible, jump to its settings, check its edges).
   The 3-D widget already knows which part is under a point (DBAssembly.pickAt, used for dropping materials);
   this adds a small card at the click. Not in the joints / boards modes, which have their own clicks. */
var nvpS = { down: null, part: null, el: null };
function nvpName(part, p) {
  if (part.kind === 'worktop') return L('Stalviršis', 'Worktop');
  if (part.kind === 'plinth') return L('Cokolis', 'Plinth');
  var r = part.role || '', m = [[/^KAIRE/, 'Kairys šonas', 'Left side'], [/^DESINE/, 'Dešinys šonas', 'Right side'], [/^DUGNAS/, 'Dugnas', 'Bottom'], [/^VIRSUS/, 'Viršus', 'Top'],
    [/^NUGARA/, 'Nugara (kieta)', 'Back (solid)'], [/^PLAUSAS/, 'Nugara (plaušas)', 'Back (fibreboard)'], [/^JUOSTA_PRIEKIS/, 'Priekinė surišimo juosta', 'Front rail'], [/^JUOSTA/, 'Galinė surišimo juosta', 'Back rail'],
    [/^LENTYNA/, 'Lentyna', 'Shelf'], [/^FASADAS/, 'Stalčiaus fasadas', 'Drawer front'], [/^DURYS/, 'Durys', 'Door'], [/^PERTVARA/, 'Pertvara', 'Partition']];
  for (var i = 0; i < m.length; i++) if (m[i][0].test(r)) return L(m[i][1], m[i][2]);
  return (p && p.short) || r;
}
function nvpClose() { if (nvpS.el) { nvpS.el.remove(); nvpS.el = null; } nvpS.part = null; }
function nvpOpen(part, x, y) {
  nvpClose();
  var c = cur(), inf = S._info && S._info[S.sel]; if (!c || !inf || !inf.r) return;
  var p = part.kind === 'panel' ? inf.r.panels.filter(function (q) { return q.name === part.name; })[0] : null, role = part.role || '';
  var tg = matTarget(c, part), wt = inf.r.worktop, pi = plinthIdx(c);
  var matNow = part.kind === 'worktop' ? (c.worktop && c.worktop.mat) || '' : part.kind === 'plinth' ? (pi >= 0 ? c.extras[pi].mat : '') || '' : (p && p.mat) || '';
  var size = p ? fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + fmt(p.T) + ' mm' : part.kind === 'worktop' && wt ? fmt(wt.L) + ' × ' + fmt(wt.y1 - wt.y0) + ' × ' + fmt(wt.T) + ' mm' : '';
  var b = function (k, label, cls) { return '<button type="button" class="nv-btn sm ' + (cls || '') + '" data-nvp="' + k + '">' + label + '</button>'; }, acts = '';
  var scope = tg ? (tg[0] === 'carc' || /^side/.test(tg[0]) ? L('keičia visą karkasą', 'changes the whole carcass') : tg[0] === 'facade' ? L('keičia visus fasadus', 'changes all fronts') : tg[0] === 'back' ? L('keičia nugarą', 'changes the back') : '') : '';
  if (/^(NUGARA|PLAUSAS)/.test(role)) acts += b('backswap', /^NUGARA/.test(role) ? L('Keisti į plaušą', 'Make it fibreboard') : L('Keisti į kietą 18 mm', 'Make it solid 18 mm')) + b('backoff', L('Pašalinti nugarą', 'Remove the back'), 'danger');
  if (/^JUOSTA/.test(role)) acts += b('railoff', L('Pašalinti juostą', 'Remove this rail'), 'danger');
  if (/^(KAIRE|DESINE)/.test(role)) { var sd = /^KAIRE/.test(role) ? 'L' : 'R', on = !!(c.vis && c.vis[sd]); acts += b('vis' + sd, on ? L('Nebe matomas šonas', 'Not a visible side') : L('Matomas šonas (fasadų medžiaga)', 'Visible side (front material)')); }
  if (part.kind === 'worktop') acts += b('wtoff', L('Pašalinti stalviršį', 'Remove the worktop'), 'danger');
  if (part.kind === 'plinth') acts += b('ploff', L('Pašalinti cokolį', 'Remove the plinth'), 'danger');
  if (p) acts += b('edges', L('Kraštų laminavimas', 'Edge banding'));
  if (p && p.key && !cur().dishwasher) acts += b('sketch', L('Braižyti ant detalės: išpjovos, frezavimas', 'Draw on the part: cutouts, routing'));
  var topic = part.kind === 'worktop' ? 'addons' : /^(FASADAS|DURYS|LENTYNA|PERTVARA)/.test(role) ? 'inside' : 'body';
  acts += b('go:' + topic + (p && p.sec != null && /^DURYS/.test(role) ? ':' + p.sec : ''), L('Visi nustatymai →', 'All settings →'), 'ghost');
  var d = document.createElement('div'); d.className = 'nvp-card nv-card'; d.setAttribute('role', 'dialog');
  d.innerHTML = '<div class="nvp-h"><div><b>' + esc(nvpName(part, p)) + '</b>' + (size ? '<small>' + size + '</small>' : '') + '</div><button type="button" class="nv-ic" data-nvp="close" aria-label="' + esc(t('close')) + '">✕</button></div>' +
    (tg ? '<label class="nvp-mat"><span>' + L('Medžiaga', 'Material') + (scope ? ' <i>· ' + scope + '</i>' : '') + '</span><input type="text" list="' + (part.kind === 'worktop' ? 'dl-wt' : 'dl-mat') + '" value="' + esc(matNow) + '" data-nvp-mat="1" autocomplete="off" placeholder="' + esc(L('pasirinkite arba įrašykite', 'choose or type')) + '"></label>' : '') +
    '<div class="nvp-acts">' + acts + '</div>';
  document.body.appendChild(d); nvpS.el = d; nvpS.part = part; nvpS.at = [x, y];
  var w = d.offsetWidth, h = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14)) + 'px'; d.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, y + 10)) + 'px';
  d.addEventListener('click', function (e) { var bt = e.target.closest('[data-nvp]'); if (bt) nvpDo(bt.getAttribute('data-nvp')); });
  d.addEventListener('change', function (e) { if (e.target.getAttribute('data-nvp-mat')) { var v = e.target.value.trim(), pt = nvpS.part; if (v && pt) { nvpClose(); dropMat(cur(), pt, v); } } });
  d.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-nvp-mat')) e.target.blur(); });
}
function nvpDo(k) {
  var c = cur(), part = nvpS.part, role = (part && part.role) || ''; if (!c || !part) return nvpClose();
  nvpClose();
  if (k === 'close') return;
  if (k === 'sketch') { var ski = S._info && S._info[S.sel], skp = ski && ski.r ? ski.r.panels.filter(function (q) { return q.name === part.name; })[0] : null; S.sk = { cab: S.sel, key: skp ? skp.key : null, tool: 'sel', sel: null, side: 'A', grid: (S.sk && S.sk.grid) || 5 }; S.jcheck = false; S.echeck = false; render(); return; }
  if (k.indexOf('go:') === 0) { var a = k.split(':'); nvGo({ topic: a[1], sec: a[2] != null ? +a[2] : null }); return; }
  if (k === 'edges') {   // this board alone, pulled out of the cabinet, its edges clickable (45-edges.js)
    var inf = S._info && S._info[S.sel], pp = inf && inf.r ? inf.r.panels.filter(function (q) { return q.name === part.name; })[0] : null; if (!pp) return;
    if (typeof nv3On === 'function' && nv3On()) { NV3.edges = true; NV3.focus = pp.key; render(); return; }   // in the same picture: the board comes out, its edges are clickable
    NV.ecFocus = { key: pp.key, cab: c.id, name: nvpName(part, pp), x: nvpS.at ? nvpS.at[0] : window.innerWidth / 2, y: nvpS.at ? nvpS.at[1] : 200 };
    S.ecView = Object.assign(S.ecView || { zoom: 1, exp: false, fronts: false }, { th: 0.62, ph: 0.42, zoom: 1 });
    render(); return; }
  var n = colsOf(c), said = '';
  if (k === 'backoff') { c.cnc.backs = Array.from({ length: n }, function () { return 'none'; }); said = L('Nugara pašalinta', 'Back removed'); }
  else if (k === 'backswap') { var to = /^NUGARA/.test(role) ? 'hdf' : 'solid'; c.cnc.backs = Array.from({ length: n }, function (_, i) { var v = (c.cnc.backs || [])[i]; return v && v !== 'none' ? to : (n === 1 ? to : 'none'); }); said = to === 'hdf' ? L('Nugara — plaušas', 'Back — fibreboard') : L('Nugara — kieta 18 mm', 'Back — solid 18 mm'); }
  else if (k === 'railoff') { c.cnc.rails = c.cnc.rails || {};
    if (/^JUOSTA_PRIEKIS/.test(role)) c.cnc.rails.front = 'none';
    else if (/APA|BOT/.test(role)) c.cnc.rails.bottom = false;
    else if (c.cnc.rails.back === 'hv') c.cnc.rails.back = /_V/.test(role) ? 'h' : 'v';
    else c.cnc.rails.back = 'none';
    said = L('Juosta pašalinta', 'Rail removed'); }
  else if (k === 'visL' || k === 'visR') { c.vis = Object.assign({}, c.vis || {}); c.vis[k.slice(3)] = !c.vis[k.slice(3)]; }
  else if (k === 'wtoff') { c.worktop = c.worktop || {}; c.worktop.on = false; said = L('Stalviršis pašalintas', 'Worktop removed'); }
  else if (k === 'ploff') { var pi = plinthIdx(c); if (pi >= 0) c.extras.splice(pi, 1); said = L('Cokolis pašalintas', 'Plinth removed'); }
  save(); render();
  if (said) toast(said + ' · ' + L('Ctrl+Z grąžina', 'Ctrl+Z brings it back'));
}
document.addEventListener('pointerdown', function (e) {
  if (nvpS.el && !nvpS.el.contains(e.target)) nvpClose();
  if (NV.ecFocus && e.target.closest && !e.target.closest('.nve-fcard')) { NV.ecFocus = null; var fc0 = document.querySelector('.nve-fcard'); if (fc0) fc0.remove(); }
  var cv = e.target && e.target.tagName === 'CANVAS' && e.target.closest && e.target.closest('#assembly-preview') ? e.target : null;
  nvpS.down = cv && e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
}, true);
document.addEventListener('pointerup', function (e) {
  var d = nvpS.down; nvpS.down = null; if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;   // a drag turns the model
  var av = e.target.closest ? e.target.closest('.av') : null, V = window.DBAssembly && window.DBAssembly.view;
  if (!av || av.classList.contains('connector-mode') || (V && (V.edit || V.boards)) || S.home || S.tab !== 'cab') return;
  var part = window.DBAssembly.pickAt ? window.DBAssembly.pickAt(e.clientX, e.clientY) : null; if (!part) return;
  var x = e.clientX, y = e.clientY; setTimeout(function () { nvpOpen(part, x, y); }, 0);
}, true);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nvpS.el) nvpClose(); });
window.addEventListener('scroll', function () { if (nvpS.el) nvpClose(); }, { passive: true });
