/* 95-viewer.js — the builder's own 3-D cabinet view, alone on a page, for ShopFlow's assembly station.
   builder/viewer.html is this same build with window.NV_VIEWER set and none of the sign-in / cloud / lock scripts
   (build.py --viewer). Nothing it does is kept: the page cannot write localStorage, so the project it is shown is
   never saved here, and edits made by tapping around (a joint point dragged) are gone with the page.
   The parent page (same site only) talks to it with postMessage:
     → { type:'load', project, settings, cab, sel }   the project as the builder handed it over, the cabinet (index), a panel
     → { type:'select', name }                         the panel to mark (its builder name = ShopFlow's part.solid)
     → { type:'cab', cab, sel }                        another cabinet of the same project
     ← { type:'ready' } once, { type:'loaded', ok, error }, { type:'pick', name } when a board is tapped
   The picture, its buttons (Surinkta, Be fasadų, Jungtys, views, opening, hardware, dimensions) are the builder's own;
   the ones that edit (Kraštai, part operations, boards) are hidden, and a tapped board is marked instead of opened. */
if (window.NV_VIEWER) (function () {
  var up = function (s) { return String(s || '').toUpperCase(); };
  var post = function (m) { try { if (window.parent && window.parent !== window) window.parent.postMessage(m, location.origin); } catch (e) {} };
  var panelBy = function (test) { var inf = S._info && S._info[S.sel], ps = (inf && inf.r && inf.r.panels) || []; for (var i = 0; i < ps.length; i++) if (test(ps[i])) return ps[i]; return null; };
  var want = null;   // the panel to mark, by name
  function mark() {
    var p = want ? panelBy(function (q) { return up(q.name) === up(want); }) : null;
    if (!p) { if (typeof nv3Mark === 'function') nv3Mark(null); return; }
    NV3.markKey = p.key; NV3.markPart = null;
    if (NV3.pick && NV3.pick.length) nv3Remark();
  }
  function show(cab, sel) {
    S.picking = false; S.home = false; S.tab = 'cab';
    S.sel = Math.max(0, Math.min((S.proj.cabinets || []).length - 1, +cab || 0));
    NV.view = '3d'; NV.r3off = null; NV3.edges = false; NV3.focus = null; NV.kOn = false;
    if (NV.topic !== 'joints') NV.topic = NV.topic || 'body';
    want = sel || null; NV3.markKey = null; NV3.markPart = null;
    render(); mark();
    setTimeout(mark, 60);   // the model is built after the page: mark it once it is there
  }
  function load(d) {
    try {
      if (!d.project || !Array.isArray(d.project.cabinets)) throw new Error('no project');
      if (d.settings && typeof d.settings === 'object') { S.settings = Object.assign(defSettings(), d.settings); applyRules(); }
      var p = clone(d.project); delete p.pricing;
      openProject(p);
      show(d.cab, d.sel);
      document.documentElement.classList.add('nvv-on');
      post({ type: 'loaded', ok: true, cabs: S.proj.cabinets.length });
    } catch (e) { post({ type: 'loaded', ok: false, error: String(e && e.message || e) }); }
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    var d = e.data;
    if (d.type === 'load') load(d);
    else if (d.type === 'select' && S.proj) { want = d.name || null; mark(); }
    else if (d.type === 'cab' && S.proj) show(d.cab, d.sel);
  });
  /* a tapped board is marked and told to the page around, never opened for editing */
  nv3Click = function (e) {
    var h = nv3Hit(e); if (!h) return;
    var k = h.object.userData.key, p = k ? panelBy(function (q) { return q.key === k; }) : null;
    if (!p) return;
    want = p.name; nv3Mark(h.object);
    post({ type: 'pick', name: p.name });
  };
  nv3JHit = function () { return null; };                 // Jungtys: shown, not edited (no point to drag, no joint to add)
  nv3JClick = function (e) { nv3Click(e); };
  nv3JDrop = function () { nv3Build(); };
  if (typeof nvpOpen === 'function') nvpOpen = function () {};
  NVAFTER.push(function () { if (want && !NV3.markKey) mark(); });
  post({ type: 'ready' });
})();
