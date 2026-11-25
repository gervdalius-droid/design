#!/usr/bin/env python3
"""Drawer runners against Blum's planning sheets (docs/RUNNERS.md; corrections in build.py PATCHES 'engine').
For every drawer the cabinet profile's screw row and the front fixing sit a fixed distance apart, because both hang on the
box's reference line R:   TANDEMBOX  row R+33, front R+47.5      MERIVOBOX  row R+54, base underside R+20.
    python3 test/ui/rails_test.py [URL]        default http://127.0.0.1:8765/index.html"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from cdp import Chrome
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
DONE, FAIL = [0], []
def ok(cond, what):
    DONE[0] += 1
    if not cond: FAIL.append(what); print('  FAIL  ' + what)
def near(a, b, tol=0.06): return abs(a - b) <= tol
RUN = """(function(hw, rail, t, n, botIn){
  var D=window.__dbk, c=D.fromPreset(D.PRESETS[0]); c.thick=t; c.sections[0].hw=hw; c.sections[0].rail=rail; c.sections[0].nDrawers=n; if(botIn)c.cnc.bottom='inside';
  __nv.S.proj.cabinets=[c]; __nv.S.sel=0; D.render();
  var r=__nv.S._info[0].r, side=r.panels.filter(function(p){return p.key==='KAIRE'})[0], pl=side.place, rows={}, D0=+c.D;
  side.holes.filter(function(h){return h.mark}).forEach(function(h){ var z=pl.o[2]+h.x*pl.u[2]+h.y*pl.v[2], y=pl.o[1]+h.x*pl.u[1]+h.y*pl.v[1]; z=Math.round(z*10)/10; (rows[z]=rows[z]||[]).push(Math.round(y*10)/10); });
  var fronts=r.panels.filter(function(p){return p.role==='FASADAS'}).map(function(p){ var q=p.place; return { bottom:Math.round(Math.min(q.o[2], q.o[2]+p.L*q.u[2]+p.W*q.v[2])*10)/10,
    holes:(p.holes||[]).map(function(h){return Math.round((q.o[2]+h.x*q.u[2]+h.y*q.v[2])*10)/10}).filter(function(v,i,a){return a.indexOf(v)===i}).sort(function(a,b){return a-b}) }; }).sort(function(a,b){return a.bottom-b.bottom});
  var bases=r.panels.filter(function(p){return p.role==='STALC_DUGNAS'}).map(function(p){return Math.round((p.place.o[2]-p.T)*10)/10}).sort(function(a,b){return a-b});
  return JSON.stringify({ t:t, rows:Object.keys(rows).map(Number).sort(function(a,b){return a-b}).map(function(z){return [z, rows[z].sort(function(a,b){return a-b})]}), fronts:fronts, bases:bases, botTop:(botIn?(+c.cnc.bottomZ||0):0)+t,
    warn:__nv.S._info[0].warnings.filter(function(w){return /bėgel|MERIVO|stalč/i.test(w)}) });
})(%s, %d, %d, %d, %s)"""
with Chrome(1400, 900) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear()"); c.goto(URL, wait=2)
    c.type("#np-name", "BEGELIAI", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    get = lambda hw, rail, t, n, bi=False: json.loads(c.eval(RUN % (json.dumps(hw), rail, t, n, 'true' if bi else 'false')))
    # ---- TANDEMBOX: the row is 14.5 mm under the lower front fixing — for every drawer, not only the lowest
    for t, n in ((18, 3), (18, 4), (16, 3), (19, 2), (25, 2)):
        r = get('BLUM TANDEMBOX', 500, t, n); tag = 'TANDEMBOX, %d drawers, %d mm boards: ' % (n, t)
        ok(len(r['rows']) == n and len(r['fronts']) == n, tag + 'a screw row and a front per drawer')
        for k in range(min(n, len(r['rows']), len(r['fronts']))):
            z, f = r['rows'][k][0], r['fronts'][k]
            up = 65.5 + (max(0, t - 18) if k == 0 else 0)   # the lowest box stands on the cabinet bottom, however thick that is
            ok(len(f['holes']) >= 2 and near(f['holes'][0] - f['bottom'], up) and near(f['holes'][0] - z, 14.5), tag + 'drawer %d: front fixing %s above its bottom edge, the row 14.5 under it (row %s, front %s)' % (k + 1, up, z, f))
            ok(z >= r['botTop'] + 33 - 0.06, tag + 'drawer %d: the row at least 33 above the cabinet bottom' % (k + 1))
        ok(near(r['rows'][0][0], max(r['botTop'] + 33, 18 + 33)), tag + 'the lowest row is where it was (%s)' % r['rows'][0][0])
        ok(r['rows'][0][1] == [19, 28, 37, 261, 293, 453], tag + 'screws from the front: 19, 28, 37, 261, 293, 453 — %s' % r['rows'][0][1])
    # ---- MERIVOBOX: the row 54 above the reference, the base's underside 20 above it; holes by nominal length
    for rail, marks in ((500, [37, 261, 293]), (450, [37, 261, 293]), (300, [37, 197, 229]), (350, [37, 197, 229])):
        r = get('BLUM MERIVOBOX', rail, 18, 3); tag = 'MERIVOBOX NL %d: ' % rail
        ok(len(r['rows']) == 3 and len(r['bases']) == 3, tag + 'three rows, three bases — %s' % r['warn'])
        ok(near(r['rows'][0][0], 18 + 54), tag + 'the lowest row 54 above the cabinet bottom (%s)' % (r['rows'][0][0] if r['rows'] else None))
        for k in range(min(3, len(r['rows']), len(r['bases']), len(r['fronts']))):
            z = r['rows'][k][0]
            ok(near(z - r['bases'][k], 34), tag + 'drawer %d: the base\'s underside 34 under the row (20 above the reference)' % (k + 1))
            ok(near(z - r['fronts'][k]['bottom'], 72) or k == 0, tag + 'drawer %d: the row 72 above the front\'s bottom edge (18 + 54)' % (k + 1))
        ok(r['rows'] and r['rows'][0][1] == sorted(marks), tag + 'screws from the front: %s' % marks)
    # ---- settings saved with the old, unverified MERIVOBOX numbers are moved to Blum's
    c.eval("(function(){var m=__nv.S.settings.rules.merivo;m.up=33;m.below=24;m.perLen='';__dbk.applyRules();})()")
    ok(json.loads(c.eval("JSON.stringify([__nv.S.settings.rules.merivo.up,__nv.S.settings.rules.merivo.below,window.DBEngine.R.merivo.up,window.DBEngine.R.merivo.below])")) == [54, 34, 54, 34], 'old MERIVOBOX numbers in the settings (33 / 24) become 54 / 34')
    c.eval("(function(){var m=__nv.S.settings.rules.merivo;m.up=50;m.below=30;__dbk.applyRules();})()")
    ok(json.loads(c.eval("JSON.stringify([window.DBEngine.R.merivo.up,window.DBEngine.R.merivo.below])")) == [50, 30], 'numbers the workshop set itself are kept')
    c.eval("(function(){var m=__nv.S.settings.rules.merivo;m.up=54;m.below=34;__dbk.applyRules();})()")
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('rails_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
