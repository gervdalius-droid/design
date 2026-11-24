#!/usr/bin/env python3
"""The connector library in the 3-D joints mode (src/ui/48-view3.js), on a free 3-D construction:
drag a connector onto a joint, click-to-place, "no connector", "on every joint", two boards → their joint.
    python3 test/ui/conn_test.py [URL]        default http://127.0.0.1:8765/index.html"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from cdp import Chrome
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
DONE, FAIL = [0], []
def ok(cond, what):
    DONE[0] += 1
    if not cond: FAIL.append(what); print('  FAIL  ' + what)
def clk(c, sel): return c.eval("(function(){var e=document.querySelector(%s);if(!e)return false;e.click();return true})()" % json.dumps(sel))
def J(c, expr): return json.loads(c.eval("JSON.stringify(%s)" % expr))
TYPES = "(function(){var o={};(__nv.S._info[__nv.S.sel].r.joints||[]).forEach(function(j){o[j.key]=[j.type,j.pos.length]});return o})()"
SEAM = """(function(k){var N=__nv.NV3,rc=N.R.domElement.getBoundingClientRect(),r=__nv.S._info[__nv.S.sel].r,out=[];
  N.jpick.forEach(function(m){if(m.userData.dot!=null)return;var s=r.seams[m.userData.seam],d=new N.T.Vector3().fromArray(s.d).normalize();
    var P=function(f){var w=N.root.localToWorld(new N.T.Vector3().fromArray(m.userData.o).addScaledVector(d,s.w*f)).project(N.cam);return [rc.left+(w.x+1)/2*rc.width, rc.top+(1-w.y)/2*rc.height]};
    var a=P(0.1),b=P(0.9);out.push({len:Math.hypot(a[0]-b[0],a[1]-b[1]),seam:m.userData.seam,key:s.key,p:P(0.43)})});
  out.sort(function(a,b){return b.len-a.len});return out[k]})(%d)"""
with Chrome(1500, 1000) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear()"); c.goto(URL, wait=2)
    c.type("#np-name", "JUNGTYS", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    box = J(c, "__dbk.PRESETS.findIndex(function(p){return p.box})")
    clk(c, '[data-nv=nvhPreset][data-i="%d"]' % box); time.sleep(4)
    ok(c.eval("!!document.getElementById('nv3-stage')"), 'a free construction opens in the new 3-D view')
    clk(c, '[data-nv=nv3][data-v="joints"]'); time.sleep(.8)
    ok(c.eval("document.querySelectorAll('[data-nv3conn]').length") == 4, 'joints mode shows the connector library (three connectors and "none")')
    t0 = J(c, TYPES); ok(len(t0) >= 4 and all(v[0] == 'confirmat' and v[1] >= 1 for v in t0.values()), 'every contact between boards has connectors by the rule')
    s1 = J(c, SEAM % 0); r = J(c, "(function(){var b=document.querySelector('[data-nv3conn=cam]').getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]})()")
    c.drag(r[0], r[1], s1['p'][0], s1['p'][1], steps=16); time.sleep(.8)
    t1 = J(c, TYPES); ok(t1[s1['key']][0] == 'cam' and t1[s1['key']][1] >= 1 and sum(1 for v in t1.values() if v[0] == 'cam') == 1, 'dragging "cam" onto a joint changes that joint only, placed by the rule')
    ok(J(c, "__nv.NV3.jSel && __nv.NV3.jSel.key") == s1['key'], 'after a drop the joint is the one in work (the camera goes to it)')
    c.click('[data-nv3conn=dowel]'); time.sleep(1.4)
    ok(J(c, "__nv.NV3.jSel") is None, 'taking a connector in hand returns to the whole cabinet')
    ok(J(c, "__nv.NV3.jArm") == 'dowel', 'a click keeps the connector in hand')
    s2 = J(c, SEAM % 2); c.click_at(s2['p'][0], s2['p'][1]); time.sleep(.8)
    ok(J(c, TYPES)[s2['key']][0] == 'dowel', 'a click on a joint puts the connector in hand on it')
    c.click('[data-nv3conn=none]'); time.sleep(1.0); s3 = J(c, SEAM % 3); c.click_at(s3['p'][0], s3['p'][1]); time.sleep(.8)
    ok(J(c, TYPES)[s3['key']][1] == 0, '"no connector" empties a joint')
    ok(c.eval("__nv.issues().some(function(x){return x.cab===__nv.S.sel&&/nesuri|not tied/i.test(x.msg+(x.raw||''))})"), 'an empty joint is reported in the checks')
    ok(c.eval("document.querySelector('.nv3.jm') !== null && document.querySelectorAll('.nv3-jli').length >= 4 && document.querySelectorAll('.nv3-jlab').length >= 4"), 'joints is a workspace of its own: the list at the side, the names in the model')
    c.click('[data-nv3conn=confirmat]'); time.sleep(.4); clk(c, '[data-nv=nv3][data-v="j:all"]'); time.sleep(.8)
    ok(all(v[0] == 'confirmat' and v[1] >= 1 for v in J(c, TYPES).values()), '"on every joint" sets them all, each by its rule')
    clk(c, '[data-nv=nv3][data-v="j:disarm"]'); time.sleep(.4)
    pts = J(c, """(function(){var N=__nv.NV3,rc=N.R.domElement.getBoundingClientRect(),pr=N.jPairs[Object.keys(N.jPairs)[0]];
      return pr.map(function(k){var m=N.pick.filter(function(o){return o.userData.key===k})[0];var w=m.getWorldPosition(new N.T.Vector3()).project(N.cam);return [rc.left+(w.x+1)/2*rc.width, rc.top+(1-w.y)/2*rc.height,k]})})()""")
    c.click_at(pts[0][0], pts[0][1]); time.sleep(.5)
    ok(J(c, "__nv.NV3.jA") == pts[0][2], 'a click on a board marks it')
    c.click_at(pts[1][0], pts[1][1]); time.sleep(.6)
    ok(J(c, "__nv.NV3.jSel && __nv.NV3.jSel.seam") == int(J(c, "Object.keys(__nv.NV3.jPairs)[0]")), 'a second board selects the joint between the two')
    clk(c, '[data-nv=undo]'); time.sleep(.5)
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('conn_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
