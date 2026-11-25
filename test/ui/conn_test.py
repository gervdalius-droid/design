#!/usr/bin/env python3
"""Connectors have ONE place: the topic "Jungtys" of a cabinet (src/ui/49-joints.js; the model beside it: 48-view3.js;
swapped cams: 49-flip.js). This test: the topic and its model, a joint's settings, "Pakeisti puses", the confirmation,
and that nothing else edits joints — Korpusas, the review, the check stage and the old commands all lead here.
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
def topic(c, k): clk(c, '[data-nv=topic][data-v=%s]' % k); time.sleep(.9)
TYPES = "(function(){var o={};(__nv.S._info[__nv.S.sel].r.joints||[]).forEach(function(j){o[j.key]=[j.type,j.pos.length]});return o})()"
CAMS = """(function(){var r=__nv.S._info[__nv.S.sel].r,o=[];r.panels.forEach(function(p){(p.holes||[]).forEach(function(h){if(!h.op&&!h.mark&&!h.through&&Math.abs(h.d-15)<.2)o.push(p.key+':'+(h.face||'A')+':'+Math.round(h.x)+','+Math.round(h.y))})});return o.sort()})()"""
def faces(c): return [x.split(':')[1] for x in J(c, CAMS)]
OPEN = "__nv.issues().some(function(x){return x.cab===__nv.S.sel&&x.id==='confirm.joints'})"
with Chrome(1500, 1000) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear()"); c.goto(URL, wait=2)
    c.type("#np-name", "JUNGTYS", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    # ---- an ordinary cabinet: the topic, and the model that goes with it
    clk(c, '[data-nv=nvhPreset][data-i="1"]'); time.sleep(4)
    ok(c.eval("!!document.querySelector('[data-nv=topic][data-v=joints]')") and J(c, "__nv.NV3.joints") is not True, 'the rail has "Jungtys"; elsewhere the model shows no joints')
    topic(c, 'joints')
    ok(J(c, "__nv.NV3.joints") is True and J(c, "__nv.NV.view") == '3d' and c.eval("document.querySelectorAll('.nvj-li').length") >= 3, 'Jungtys: the model shows the joints, the inspector lists them')
    ok(c.eval("!document.querySelector('.nv3-bar, .nv3.full, [data-nv3conn], .jcbox')"), 'no bar over the picture, no window, no library')
    ok(c.eval("!!document.querySelector('.nvj [data-bind=\\'c.cnc.joinery\\']')"), 'the cabinet\'s usual connector is chosen here')
    clk(c, '[data-nv=nv3][data-v="j:pick:bottom"]'); time.sleep(1.2)
    ok(c.eval("!!document.querySelector('#nvj-card .nvj-type') && !!document.querySelector('#nvj-card [data-v=\\'j:n:1\\']') && document.querySelectorAll('#nvj-card [data-nv3j]').length >= 2"), 'a picked joint: its card with type, count and places')
    ok(c.eval("document.querySelector('.nv3-jflip button').disabled") is True, 'confirmats: "Pakeisti puses" is not offered')
    clk(c, '[data-nv=nv3][data-v="j:type:cam"]'); time.sleep(1.2)
    ok(J(c, TYPES)['bottom'][0] == 'cam', 'the type is set to cams')
    f0 = faces(c); ok(len(f0) >= 4 and len(set(f0)) == 1, 'the cams are all in one face — %s' % f0)
    # ---- the confirmation is here
    ok(c.eval(OPEN) and c.eval("!!document.querySelector('.nvj-ok.todo [data-nv=nvjOk]')"), 'not confirmed yet: the button is in the topic')
    clk(c, '[data-nv=nvjOk]'); time.sleep(.8)
    ok(not c.eval(OPEN) and c.eval("!!document.querySelector('.nvj-ok.ok')"), 'confirmed here: the open confirmation is gone')
    # ---- "Pakeisti puses"
    clk(c, '[data-nv=nv3][data-v="j:flip"]'); time.sleep(1.2)
    f1 = faces(c); ok(len(f1) == len(f0) and all(a != b for a, b in zip(f0, f1)), 'no cam picked: all of the joint\'s cams go to the other face — %s' % f1)
    ok(J(c, "__nv.cur().nvFlip") == {'bottom|L': 'all', 'bottom|R': 'all'} and c.eval("document.querySelector('.nv3-jflip button').classList.contains('on')"), 'kept with the cabinet, the button is marked')
    ok(c.eval(OPEN), 'another drilling: the joints have to be confirmed again')
    clk(c, '[data-nv=nv3][data-v="j:flip"]'); time.sleep(1.0)
    ok(faces(c) == f0 and J(c, "__nv.cur().nvFlip") == {}, 'again: back where they were')
    pt = J(c, """(function(){var N=__nv.NV3,rc=N.R.domElement.getBoundingClientRect();var m=N.jpick.filter(function(o){return o.userData.dot===1&&o.userData.seam===N.jSel.seam})[0];var v=m.getWorldPosition(new N.T.Vector3()).project(N.cam);return [rc.left+(v.x+1)/2*rc.width, rc.top+(1-v.y)/2*rc.height]})()""")
    c.click_at(pt[0], pt[1]); time.sleep(1.0)
    ok(J(c, "__nv.NV3.jSel.idx") == 1, 'a click on a fastener in the model picks it')
    clk(c, '[data-nv=nv3][data-v="j:flip"]'); time.sleep(1.2)
    f2 = faces(c); ok(sum(1 for a, b in zip(f0, f2) if a != b) == 2 and J(c, "__nv.cur().nvFlip") == {'bottom|L': [1], 'bottom|R': [1]}, 'only the picked cam (on both sides of the cabinet) changes its face')
    clk(c, '[data-nv=nv3][data-v="j:both:R"]'); time.sleep(.8); clk(c, '[data-nv=nv3][data-v="j:flip"]'); time.sleep(1.0)
    fl = J(c, "__nv.cur().nvFlip"); ok(fl == {'bottom|L': [1]}, '"Dešinei": the picked cam is put back on the right side only — %s' % fl)
    clk(c, '[data-nv=undo]'); time.sleep(.8)
    ok(J(c, "__nv.cur().nvFlip") == {'bottom|L': [1], 'bottom|R': [1]}, 'undo takes the swap back')
    clk(c, '[data-nv=nv3][data-v="j:type:confirmat"]'); time.sleep(1.0)
    ok(J(c, "__nv.cur().nvFlip") == {'bottom|L': [1]} and len(faces(c)) == len(f0) // 2, 'the right side gets another type: its swap is forgotten, the left side keeps its own')
    clk(c, '[data-nv=nv3][data-v="j:both:1"]'); time.sleep(.8); clk(c, '[data-nv=nv3][data-v="j:reset"]'); time.sleep(1.0)
    ok(J(c, "__nv.cur().nvFlip") == {}, '"Standartas" clears the swaps')
    # ---- "Pakeisti ašį": the connector turns to the other board of the corner (here: the bottom under ↔ between the sides)
    clk(c, '[data-nv=nv3][data-v="j:none"]'); time.sleep(.4); clk(c, '[data-nv=nv3][data-v="j:pick:bottom"]'); time.sleep(.9); clk(c, '[data-nv=nv3][data-v="j:type:cam"]'); time.sleep(1.0)
    where = lambda: sorted(set(x.split(':')[0] for x in J(c, CAMS)))
    ok(where() == ['DESINE', 'KAIRE'] and c.eval("!!document.querySelector('.nvj-sides [data-v=\'j:axis\']')"), 'bottom under the sides: the housings are in the sides; "Pakeisti ašį" is offered')
    clk(c, '[data-nv=nv3][data-v="j:flip"]'); time.sleep(.9); clk(c, '[data-nv=nvjOk]'); time.sleep(.7)
    clk(c, '[data-nv=nv3][data-v="j:axis"]'); time.sleep(1.3)
    ok(J(c, "__nv.cur().cnc.bottom") == 'inside' and where() == ['DUGNAS'], 'the axis is swapped: the bottom sits between the sides, the housings are in the bottom')
    ok(J(c, "__nv.cur().nvFlip") == {} and c.eval(OPEN) and c.eval("!!document.getElementById('nvj-card')"), 'a swapped face does not follow to the other board; to be confirmed again; the card stays')
    ok(c.eval("!!document.querySelector('.nv3-jflip [data-act=camside][data-v=bottom]')"), 'bottom between the sides, with cams: "Pakeisti puses" is the live setting')
    b0 = faces(c); clk(c, '.nv3-jflip [data-act=camside]'); time.sleep(1.0)
    b1 = faces(c); ok(J(c, "(__nv.cur().cnc.camOut||{}).bottom") is True and len(b1) == len(b0) and all(a != b for a, b in zip(b0, b1)) and c.eval("!!document.getElementById('nvj-card')"), 'the cams move, the setting is the live one, the card stays')
    # ---- nothing else edits joints; every old door leads here
    topic(c, 'body')
    ok(J(c, "__nv.NV3.joints") is False and c.eval("!document.querySelector('.nve-body [data-bind=\\'c.cnc.joinery\\'], .nve-body [data-bind=\\'c.cnc.backJoint\\'], .nve-body [data-act=camside], .nve-body [data-act=jcopen]')"), 'Korpusas: no connector choices, and the model shows no joints')
    clk(c, '[data-nv=nv3][data-v="joints"]'); time.sleep(.9)
    ok(J(c, "__nv.NV.topic") == 'joints' and J(c, "__nv.NV3.joints") is True, 'the 3-D toolbar\'s "Jungtys" opens the topic')
    clk(c, '[data-nv=nv3][data-v="joints"]'); time.sleep(.9)
    ok(J(c, "__nv.NV.topic") == 'body' and J(c, "__nv.NV3.joints") is False, 'and closes it, back to where one was')
    c.eval("(function(){var c=__nv.cur();delete c.jointsOk;__dbk.saveNow();__dbk.render()})()"); topic(c, 'review')
    clk(c, '#nvt-cf-jc [data-act=jcopen]'); time.sleep(.9)
    ok(J(c, "__nv.NV.topic") == 'joints' and c.eval("!document.querySelector('.jcbox') && !__nv.S.jcheck"), 'the review\'s "joints" button leads to the topic, no window')
    c.eval("__nv.go({tab:'chk'})"); time.sleep(.9)
    ok(clk(c, '.nvk-row.todo [data-act=jcroom]'), 'the check stage has the joints row'); time.sleep(.9)
    ok(J(c, "__nv.S.tab") == 'cab' and J(c, "__nv.NV.topic") == 'joints', 'the check stage\'s joints row leads to the topic')
    # ---- a free 3-D construction: the same topic, no joints topic of its own
    clk(c, '[data-act=pick]'); time.sleep(.5)
    box = J(c, "__dbk.PRESETS.findIndex(function(p){return p.box})"); clk(c, '[data-nv=nvhPreset][data-i="%d"]' % box); time.sleep(1.5)
    tps = J(c, "[].map.call(document.querySelectorAll('[data-nv=topic]'),function(b){return b.getAttribute('data-v')})")
    ok('joints' in tps and 'bx-joints' not in tps, 'a free construction has the same "Jungtys" — %s' % tps)
    topic(c, 'joints')
    t0 = J(c, TYPES); ok(len(t0) >= 4 and c.eval("document.querySelectorAll('.nvj-li').length") == len(t0) and all(v[0] == 'confirmat' and v[1] >= 1 for v in t0.values()), 'every contact between its boards is a joint in the list, with connectors by the rule')
    lab = J(c, "(function(){var l=document.querySelector('.nv3-jlab').getBoundingClientRect();return [l.left+l.width/2,l.top+l.height/2]})()")
    c.click_at(lab[0], lab[1]); time.sleep(1.2)
    ok(J(c, "!!__nv.NV3.jSel") is True and c.eval("!!document.getElementById('nvj-card')"), 'a joint picked by its name in the model opens its card')
    corner = J(c, """(function(){var r=__nv.S._info[__nv.S.sel].r,k=null;(r.joints||[]).some(function(j){var pk=j.box&&window.DBEngine.boxPair(j.box.P,j.box.Q),cv=(r.box.covers||[]).filter(function(q){return q.key===pk})[0];if(cv&&!cv.forced){k=[j.key,pk,cv.by];return true}return false});return k})()""")
    ok(corner is not None, 'there is a corner whose cover can be chosen')
    if corner:
        clk(c, '[data-nv=nv3][data-v="j:none"]'); time.sleep(.5); clk(c, '[data-nv=nv3][data-v="j:pick:%s"]' % corner[0]); time.sleep(1.2)
        ok(c.eval("!!document.querySelector('.nvj-sides [data-v=\'j:axis\']') && document.querySelector('.nv3-jflip button').disabled"), 'a corner with confirmats: no "Pakeisti puses", but "Pakeisti ašį" drives them through the other board')
        clk(c, '[data-nv=nv3][data-v="j:axis"]'); time.sleep(1.2)
        ok(J(c, "__nv.cur().box.cover[%s]" % json.dumps(corner[1])) not in (None, corner[2]), 'the cover is swapped')
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('conn_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
