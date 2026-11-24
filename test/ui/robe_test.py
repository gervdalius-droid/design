#!/usr/bin/env python3
"""Wardrobes (src/ui/35-robe.js): the four presets, hanging rails, the doors switch, the column presets.
    python3 test/ui/robe_test.py [URL]        default http://127.0.0.1:8765/index.html"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from cdp import Chrome
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
DONE, FAIL = [0], []
def ok(cond, what):
    DONE[0] += 1
    if not cond: FAIL.append(what); print('  FAIL  ' + what)
def J(c, expr): return json.loads(c.eval("JSON.stringify(%s)" % expr))
def clk(c, sel): return c.eval("(function(){var e=document.querySelector(%s);if(!e)return false;e.click();return true})()" % json.dumps(sel))
STATE = """(function(){var S=__nv.S,c=__nv.cur(),inf=S._info[S.sel],r=inf.r;return {name:c.name,cols:c.cols,robe:c.robe,kinds:c.sections.map(function(s){return s.kind}),hang:c.sections.map(function(s){return s.hang||0}),
  rails:(r.visual.rails||[]).length,pipes:r.hardware.filter(function(h){return /^Pakabos vamzdis/.test(h.item)}).reduce(function(a,h){return a+h.qty},0),holders:r.hardware.filter(function(h){return /laikikliai$/.test(h.item)&&/Pakabos/.test(h.item)}).reduce(function(a,h){return a+h.qty},0),
  doors:r.panels.filter(function(p){return p.role==='DURYS'}).length,backs:c.cnc.backs,
  loud:__nv.issues().filter(function(x){return x.cab===S.sel&&(x.sev==='error'||x.sev==='warn')&&!/^(mat|edge)\\./.test(x.id)}).map(function(x){return x.id})}})()"""
with Chrome(1500, 1000) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear()"); c.goto(URL, wait=2)
    c.type("#np-name", "SPINTOS", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    ok(c.eval("[].some.call(document.querySelectorAll('.nvh-grp h3 b'),function(e){return e.textContent==='Spintos'})"), 'the chooser has the group "Spintos"')
    ids = J(c, "__dbk.PRESETS.map(function(p,i){return p.robe?i:-1}).filter(function(i){return i>=0})")
    ok(len(ids) == 4, 'four wardrobe presets')
    want = [dict(cols=2, rails=1, doors=2, loud=[]), dict(cols=3, rails=3, doors=0, loud=['robe.sliding']), dict(cols=1, rails=0, doors=1, loud=[]), dict(cols=1, rails=0, doors=0, loud=[])]
    for n, i in enumerate(ids):
        if n: clk(c, '[data-act=pick]'); time.sleep(.4)
        clk(c, '[data-nv=nvhPreset][data-i="%d"]' % i); time.sleep(3.5 if n == 0 else 1.2)
        s = J(c, STATE); w = want[n]; tag = 'wardrobe %d: ' % (n + 1)
        ok(s['name'] == 'Spinta' and s['robe'] and s['cols'] == w['cols'], tag + 'a wardrobe with %d part(s)' % w['cols'])
        ok(s['rails'] == w['rails'] and s['pipes'] == w['rails'] and s['holders'] == 2 * w['rails'], tag + '%d rail(s) in the picture and in the hardware, two holders each' % w['rails'])
        ok(s['doors'] == w['doors'], tag + '%d door(s)' % w['doors'])
        ok(all(b == 'hdf' for b in s['backs']), tag + 'a thin back per part')
        ok(s['loud'] == w['loud'], tag + 'no errors or warnings but %s — %s' % (w['loud'], s['loud']))
    # the first wardrobe: a ready-made column, the doors switch, the rail stepper
    c.eval("(function(){__nv.S.sel=0;__nv.NV.topic='inside';__nv.NV.secSel=null;__nv.NV.view='front';__dbk.render()})()"); time.sleep(.5)
    ok(c.eval("!!document.querySelector('.nvw [data-nv=nvwCol]') && !!document.querySelector('.nvw [data-nv=nvwDoors]')"), 'Vidus shows the wardrobe group')
    ok(c.eval("document.querySelectorAll('.nve-hrail').length") == 1, 'the rail is drawn on the front picture')
    clk(c, '[data-nv=nvwCol][data-v=rail2]'); time.sleep(.6); s = J(c, STATE)
    ok(s['rails'] == 2 and s['pipes'] == 2 and s['holders'] == 4, '"Dvi pakabos" puts two rails in the open part')
    clk(c, '[data-nv=nvwDoors][data-v=none]'); time.sleep(.6); s = J(c, STATE)
    ok(s['doors'] == 0 and 'doors' not in s['kinds'] and s['robe']['doors'] == 'none', 'doors → none: the parts are open')
    clk(c, '[data-nv=nvwDoors][data-v=sliding]'); time.sleep(.6); s = J(c, STATE)
    ok(s['doors'] == 0 and 'robe.sliding' in s['loud'], 'sliding: no doors made, a warning says so')
    clk(c, '[data-nv=nvwDoors][data-v=hinged]'); time.sleep(.6); s = J(c, STATE)
    ok(s['doors'] == 2 and 'robe.sliding' not in s['loud'], 'hinged again: one door per part')
    i_sec = c.eval("__nv.cur().sections.findIndex(function(s){return s.kind==='doors'&&!(s.hang>0)})")
    c.eval("(function(){__nv.NV.secSel=%d;__dbk.render()})()" % i_sec); time.sleep(.4)
    ok(clk(c, '#f-c-sections-%d-hang-p' % i_sec), 'a doors section has the rail stepper'); time.sleep(.6)
    ok(J(c, "__nv.cur().sections[%d].hang" % i_sec) == 1, 'the stepper adds a rail')
    clk(c, '#f-c-sections-%d-hang-p' % i_sec); time.sleep(.4); clk(c, '#f-c-sections-%d-hang-p' % i_sec); time.sleep(.4)
    ok(J(c, "__nv.cur().sections[%d].hang" % i_sec) == 2, 'at most two rails in a section')
    c.eval("(function(){__nv.NV.view='3d';__nv.NV.secSel=null;__dbk.render()})()"); time.sleep(1)
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('robe_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
