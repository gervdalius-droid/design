#!/usr/bin/env python3
"""Drawing on a part: what the pointer is caught by (src/ui/37-sketch.js) and how a shape is routed (src/ui/38-route.js).
    python3 test/ui/sketch_test.py [URL]        default http://127.0.0.1:8765/index.html"""
import sys, os, json, time, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from cdp import Chrome
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
DONE, FAIL = [0], []
def ok(cond, what):
    DONE[0] += 1
    if not cond: FAIL.append(what); print('  FAIL  ' + what)
def clk(c, sel): return c.eval("(function(){var e=document.querySelector(%s);if(!e)return false;e.click();return true})()" % json.dumps(sel))
def J(c, expr): return json.loads(c.eval("(function(){var v=(%s);return JSON.stringify(v===undefined?null:v)})()" % expr))
def near(a, b, tol=0.06): return a is not None and b is not None and abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol

with Chrome(1366, 768) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear()"); c.goto(URL, wait=2)
    c.type("#np-name", "ESKIZAS", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    clk(c, '[data-nv=nvhPreset][data-i="1"]'); time.sleep(3.5)
    c.eval("document.querySelector('#f-c-W').focus()")
    clk(c, '[data-act=skopen]'); time.sleep(.8); clk(c, '.sk-chip'); time.sleep(.6)
    scr = lambda x, y: J(c, "__nv.skScreen(%f,%f)" % (x, y))
    tag = lambda: c.eval("(function(){var t=document.querySelector('.nvs-tag text');return t?t.textContent:''})()") or ''
    shapes = lambda: J(c, "__nv.skShapes()")
    draft = lambda: J(c, "__nv.S.sk.draft")
    def tool(t): clk(c, '[data-act=sktool][data-v=%s]' % t); time.sleep(.3)
    def hover(x, y, dx=0, dy=0, alt=False):   # dx, dy: millimetres off the point, in the part's own frame
        p = scr(x + dx, y + dy)
        if alt: c.cmd("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": p[0], "y": p[1], "button": "none", "buttons": 0, "modifiers": 1})
        else: c.mouse('mouseMoved', p[0], p[1], 0)
        time.sleep(.15); return tag()
    def click(x, y, dx=0, dy=0):
        p = scr(x + dx, y + dy); c.click_at(p[0], p[1]); time.sleep(.2)
    def cursor(): return J(c, "(function(){var h=document.querySelector('.sk-hud');return h?h.textContent:''})()")

    # ------------------------------------------------------------ the window and the keyboard
    box = J(c, "(function(){var a=document.querySelector('.skbox').getBoundingClientRect(),s=document.querySelector('.sk-svg').getBoundingClientRect(),b=document.querySelector('.sk-below').getBoundingClientRect();return {w:a.width,h:a.height,sw:s.width,sh:s.height,bl:b.left,sr:s.right}})()")
    ok(box['w'] > 1300 and box['h'] > 720 and box['sh'] > 430 and box['bl'] >= box['sr'], 'the drawing takes the window, the shape\'s properties stand beside it — %s' % box)
    ok(J(c, "document.activeElement.tagName") == 'BODY', 'a field left in focus behind the window lets go of the keyboard')
    tool('line'); click(150, 150); click(400, 300); c.key('Enter'); time.sleep(.5)
    ok(len(shapes()) == 1 and shapes()[0]['pts'] == [[150, 150], [400, 300]], 'Enter finishes a line — %s' % shapes())
    tool('line'); click(50, 500); hover(120, 500, 0, 0); c.cmd("Input.insertText", {"text": ""})
    for ch in '120': c.cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": ch, "code": "Digit" + ch, "text": ch}); c.cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": ch, "code": "Digit" + ch})
    time.sleep(.2); c.key('Enter'); time.sleep(.3); c.key('Enter'); time.sleep(.5)
    ln = [s for s in shapes() if s['t'] == 'line' and s['pts'][0] == [50, 500]]
    ok(len(ln) == 1 and abs(math.hypot(ln[0]['pts'][1][0] - 50, ln[0]['pts'][1][1] - 500) - 120) < 0.11 and J(c, "__nv.cur().W") == 600, 'a typed length goes to the line, not to a field behind — %s' % ln)
    c.eval("(function(){var S=__nv.S,c=S.proj.cabinets[S.sk.cab];c.sketch[S.sk.key]=c.sketch[S.sk.key].filter(function(q){return q.pts[0][0]!==50});__dbk.render()})()"); time.sleep(.4)

    # ------------------------------------------------------------ what the pointer is caught by
    tool('circle'); click(550, 150); click(550, 200); time.sleep(.3)
    tool('rect'); click(100, 350); click(300, 480); time.sleep(.3)
    tool('line')
    for (what, x, y, dx, dy, word, want) in [
        ('the end of a line', 400, 300, 7, 5, 'Galas', [400, 300]), ('the middle of a line', 275, 225, 5, -4, 'Vidurys', [275, 225]),
        ('a point on a line', 212.5, 187.5, 3, 2, 'Ant linijos', None), ('a corner of the part', 0, 0, 6, -6, 'Kampas', [0, 0]),
        ('an edge of the part', 250, 0, 0, -4, 'Ant krašto', [250, 0]), ('the centre of a circle', 550, 150, 5, 5, 'Centras', [550, 150]),
        ('a quadrant of a circle', 600, 150, 4, 3, 'Kvadrantas', [600, 150]), ('the rim of a circle', 550 + 35.355, 150 + 35.355, 2, 2, 'Ant apskritimo', None),
        ('a corner of a rectangle', 300, 480, -6, 5, 'Galas', [300, 480]), ('the centre of a rectangle', 200, 415, 4, 4, 'Centras', [200, 415])]:
        w = hover(x, y, dx, dy); click(x, y, dx, dy); d = draft(); p = d['pts'][0] if d and d.get('pts') else None
        on = True
        if want is None and p:
            on = (abs((p[0] - 150) * 150 - (p[1] - 150) * 250) / math.hypot(250, 150) < 0.02) if 'linijos' in word else abs(math.hypot(p[0] - 550, p[1] - 150) - 50) < 0.02
        ok(w.startswith(word) and (near(p, want, 0.001) if want else on), '%s: "%s" and the point lands there — "%s" %s' % (what, word, w, p))
        c.key('Escape'); time.sleep(.15)
    hole = J(c, "(function(){var S=__nv.S,p=S._info[S.sk.cab].r.panels.filter(function(q){return q.key===S.sk.key})[0],h=p.holes[0];return [h.x,h.y]})()")
    ok(hover(hole[0], hole[1], 4, 4).startswith('Skylė'), 'a drilled hole')
    ok(hover(620, 480) == '' and 'pradžia' in cursor(), 'on empty board nothing is claimed: the grid')
    ok(hover(400, 300, 7, 5, alt=True).startswith('Laisvai'), 'Alt held: nothing is caught')
    # crossing of two drawn lines
    click(150, 300); click(400, 150); c.key('Enter'); time.sleep(.4)          # crosses the first line at (275, 225)
    tool('line'); w = hover(275, 225, 4, 3)
    ok(w.startswith('Vidurys') or w.startswith('Sankirta'), 'where two lines cross (here also both middles) — "%s"' % w)
    w = hover(250, 480, 0, 0)   # the rectangle's far edge … and where the first line would meet nothing: plain edge
    c.eval("(function(){var S=__nv.S,c=S.proj.cabinets[S.sk.cab],l=c.sketch[S.sk.key];l.push({t:'line',pts:[[80,400],[330,440]],closed:false,id:99,op:'none',face:'A',depth:8});__dbk.render()})()"); time.sleep(.4)
    tool('line'); w = hover(100, 403.2, 3, 3)   # the slanted line crosses the rectangle's edge x = 100 at y = 403.2
    click(100, 403.2, 3, 3); p = draft()['pts'][0]; c.key('Escape')
    ok(w.startswith('Sankirta') and near(p, [100, 403.2], 0.001), 'the crossing of a line and a rectangle\'s side — "%s" %s' % (w, p))

    # ------------------------------------------------------------ a line being drawn holds its direction
    tool('line'); click(60, 60)
    wv = hover(200, 60, 0, 5); wh = hover(60, 200, 6, 0)
    ok({wv, wh} == {'Vertikaliai', 'Horizontaliai'}, 'along the part and across it: horizontal / vertical — %s %s' % (wv, wh))
    c.key('Escape'); time.sleep(.2)
    tool('line'); click(300, 100); foot = (lambda t: [150 + 250 * t, 150 + 150 * t])(((300 - 150) * 250 + (100 - 150) * 150) / (250 * 250 + 150 * 150.0))
    w = hover(foot[0], foot[1], 3, 2); click(foot[0], foot[1], 3, 2); p = draft()['pts'][1]
    ok(w.startswith('Statmenai') and near(p, foot, 0.001), 'square onto a slanted line: the foot of the perpendicular — "%s" %s vs %s' % (w, p, [round(v, 2) for v in foot]))
    c.key('Escape'); time.sleep(.2)
    tool('line'); click(60, 60); click(250, 60, 0, 3); p = draft()['pts'][1]
    ok(p[1] == 60 and p[0] % 5 == 0, 'a nearly level line is level, its length on the grid — %s' % p)
    click(250, 150, 4, 0); click(337, 204)
    p = draft()['pts'][3]; d = (p[0] - 250, p[1] - 150)
    ok(abs(d[0] * 150 - d[1] * 250) < 0.01 and abs(math.hypot(*d) - 100) < 0.01, 'near the direction of another drawn line it runs parallel to it, a whole length long — %s' % p)
    w = hover(60, 60, 5, 5); click(60, 60, 5, 5); time.sleep(.5)
    last = shapes()[-1]
    ok(w.startswith('Uždaryti') and last.get('closed') is True and len(last['pts']) == 4, 'back at the first point: the outline closes — "%s"' % w)
    # where a held direction meets a line the point lands on it
    tool('line'); click(620, 420); p0 = draft()['pts'][0]; w = hover(p0[0], 0, 6, 6); click(p0[0], 0, 6, 6); p = draft()['pts'][1]; c.key('Escape')
    ok(near(p, [p0[0], 0], 0.001) and (w.startswith('Statmenai') or 'krašto' in w), 'a level line ends exactly on the edge it reaches, square to it — "%s" %s' % (w, p))
    s1 = J(c, "(function(){__nv.S.sk.draft={t:'line',pts:[[560,420]]};var r=__nv.skSnap([571,4],[560,420],1.8);__nv.S.sk.draft=null;return r})()")
    ok(near(s1['p'], [560, 0], 0.001) or (s1['nv'].get('t') == 'on' and s1['p'][1] == 0), 'and the same asked of the snapping itself — %s' % s1)
    s2 = J(c, "(function(){__nv.S.sk.draft={t:'line',pts:[[100,520]]};var r=__nv.skSnap([203,523],[100,520],1.8);__nv.S.sk.draft=null;return r})()")
    ok(s2['p'][1] == 520 and s2['nv'].get('rel') == 'ax' and s2['kind'] == 'al', 'a held direction is reported as such — %s' % s2)
    s3 = J(c, "(function(){__nv.S.sk.draft={t:'line',pts:[[100,520]]};var r=__nv.skSnap([203,548],[100,520],1.8,{shift:true});__nv.S.sk.draft=null;return r})()")
    ok(s3['p'][1] == 520, 'Shift: level or upright whatever the pointer does — %s' % s3['p'])

    # ------------------------------------------------------------ dragging
    tool('sel'); a = scr(300, 480); b = scr(400, 300)
    c.drag(a[0] - 3, a[1] + 2, b[0] + 6, b[1] + 6, steps=14); time.sleep(.5)
    r = [s for s in shapes() if s['t'] == 'rect'][0]
    ok(near([r['x'] + r['w'], r['y'] + r['h']], [400, 300], 0.001), 'a rectangle taken by a corner is caught by that corner — %s' % r)
    clk(c, '[data-act=sksel][data-v="1"]'); time.sleep(.4)
    a = scr(150, 150); b = scr(550, 150)
    c.drag(a[0], a[1], b[0] + 5, b[1] - 5, steps=14); time.sleep(.5)
    l1 = [s for s in shapes() if s['id'] == 1][0]
    ok(l1['pts'][0] == [550, 150] and l1['pts'][1] == [400, 300], 'a dragged end of a line is caught by a circle\'s centre — %s' % l1['pts'])
    c.key('Escape'); time.sleep(.2)

    # ------------------------------------------------------------ routing: the programs
    def prog(sh):
        o = J(c, """(function(){var S=__nv.S,c=JSON.parse(JSON.stringify(S.proj.cabinets[0]));c.sketch={KAIRE:[%s]};
          var E=window.DBEngine,r=E.buildCabinet(c),p=r.panels.filter(function(q){return q.key==='KAIRE'})[0],pr=E.programs(p);
          return {L:p.L,W:p.W,T:p.T,paths:p.paths.map(function(g){return {n:g.name,f:g.face,d:g.depth,op:g.op,cam:g.cam,pts:g.pts}}),warn:(r.warnings||[]).filter(function(w){return /eskiz/.test(w)}),files:(pr.files||[]).map(function(f){return f.text})}})()""" % json.dumps(dict(sh, id=1)))
        mv = []
        for l in '\n'.join(o['files']).split('\r\n'):
            l = l.strip()
            if l.startswith('XG0') or l.startswith('XL2P'):
                d = {k: float(v) for k, v in (x.split('=') for x in l.split()[1:]) if k in 'XYZV'}
                mv.append((l.split()[0], d['X'], d['Y'], d['Z'], d.get('V')))
        return o, mv
    def rules(o, mv):
        L, W, T = o['L'], o['W'], o['T']; dep = o['paths'][0]['d'] if o['paths'] else 0; r = 7.75; bad = []
        if not mv: return ['no moves']
        if min(m[3] for m in mv) < -min(dep, T - 2) - 1e-6: bad.append('too deep')
        for i in range(1, len(mv)):
            a, b = mv[i - 1], mv[i]
            if b[0] == 'XG0':
                if a[3] < 9.99: bad.append('a rapid without lifting')
                continue
            dxy = math.hypot(b[1] - a[1], b[2] - a[2]); dz = b[3] - a[3]; air = a[1] < -r or a[1] > L + r or a[2] < -r or a[2] > W + r
            if dz < -1e-6 and dxy < 1e-6 and b[3] < -1e-6 and not air: bad.append('a straight plunge into the board')
            if not (-20 - 1e-6 <= b[1] <= L + 20 + 1e-6 and -20 - 1e-6 <= b[2] <= W + 20 + 1e-6): bad.append('too far outside')
        if mv[-1][3] < 9.99: bad.append('ends below the safe height')
        return sorted(set(bad))
    RECT = {'t': 'rect', 'x': 200, 'y': 150, 'w': 200, 'h': 120, 'face': 'A', 'depth': 8}
    o, mv = prog(dict(RECT, op='in'))
    cut = [m for m in mv if abs(m[3] + 8) < 1e-6]
    ok(o['paths'][0]['cam'] is None and len(o['paths'][0]['pts']) == 5 and o['paths'][0]['pts'][0] == o['paths'][0]['pts'][-1] and (cut[-1][1], cut[-1][2]) == (207.75, 157.75) and rules(o, mv) == [],
       'a cut-out without options: all four sides (the live moves stopped after three), by the live way down — %s' % [(m[1], m[2], m[3]) for m in mv])
    ok([(m[0], m[3]) for m in mv[:4]] == [('XG0', 10.0), ('XL2P', 0.0), ('XL2P', -8.0), ('XL2P', -8.0)] and (mv[2][1], mv[2][2]) == (237.75, 157.75), 'and the live ramp of 30 mm along the path is kept')
    CASES = [('a line at 45°', dict(RECT, op='in', cam={'ain': 'line'})), ('an arc in and out, overlap, 3 passes', dict(RECT, op='in', depth=12, cam={'ain': 'arc', 'rout': 'arc', 'over': 5, 'step': 4})),
             ('at depth asked inside the board', dict(RECT, op='in', cam={'ain': 'line', 'amode': 'quote'})), ('no room for the lead', dict(RECT, w=24, h=24, op='in', cam={'ain': 'arc', 'amul': 3})),
             ('from the other face', dict(RECT, op='in', face='B', cam={'ain': 'arc', 'rout': 'line'})), ('the other way round', dict(RECT, op='in', cam={'ain': 'line', 'rev': 1})),
             ('round a shape at the edge, at depth from outside', {'t': 'line', 'pts': [[-2, 100], [-2, 400], [60, 330], [60, 170]], 'closed': True, 'op': 'out', 'face': 'A', 'depth': 8, 'cam': {'ain': 'line', 'amode': 'quote', 'aang': 90, 'amul': 1.2}}),
             ('round a circle', {'t': 'circle', 'x': 400, 'y': 300, 'r': 60, 'op': 'out', 'face': 'A', 'depth': 8, 'cam': {'ain': 'arc', 'rout': 'arc'}}),
             ('an open line in 3 passes at 10°', {'t': 'line', 'pts': [[50, 50], [300, 50], [300, 100]], 'closed': False, 'op': 'on', 'face': 'A', 'depth': 9, 'cam': {'step': 3, 'dang': 10}}),
             ('a pocket in 2 passes', dict(RECT, w=60, h=50, op='pocket', depth=10, cam={'step': 5})), ('a cut-out in 2 passes, down along the outline', dict(RECT, op='in', depth=12, cam={'step': 6})),
             ('a steep 45° line lead, 16 deep', dict(RECT, op='in', depth=16, cam={'ain': 'line', 'aang': 90, 'amul': 1, 'dang': 45}))]
    res = {}
    for name, sh in CASES:
        o, mv = prog(sh); res[name] = (o, mv); bad = rules(o, mv)
        ok(not bad and not o['warn'], 'rules hold — %s: %s %s' % (name, bad, o['warn'][:1]))
    o, mv = res['a line at 45°']
    ok((mv[0][1], mv[0][2]) == (289.04, 168.71) and 207.75 < mv[0][1] < 392.25 and 157.75 < mv[0][2] < 262.25 and mv[1][3] == 0 and [round(m[3], 3) for m in mv[2:5]] == [-2.667, -5.333, -8.0] and (mv[4][1], mv[4][2]) == (300.0, 157.75),
       'a line lead-in: from inside the waste, 15.5 mm at 45° to the middle of the longest side, going down back and forth — %s' % [(m[1], m[2], m[3]) for m in mv[:5]])
    cut = [(m[1], m[2]) for m in mv[4:] if abs(m[3] + 8) < 1e-6]
    ok(cut[0] == cut[-1] == (300.0, 157.75) and {(392.25, 157.75), (392.25, 262.25), (207.75, 262.25), (207.75, 157.75)} <= set(cut), 'then once right round, back to where it came in')
    o, mv = res['an arc in and out, overlap, 3 passes']
    g0 = [m for m in mv if m[0] == 'XG0']; gi = [i for i, m in enumerate(mv) if m[0] == 'XG0']; zs = sorted(set(round(m[3], 3) for m in mv if m[4] == 4000.0 and m[3] < 0))
    ok(len(g0) == 3 and zs == [-12.0, -8.0, -4.0] and len(set((m[1], m[2]) for m in g0)) == 1, 'three passes of 4 mm, each coming in by the same lead — %s' % zs)
    lead = [m for m in mv[1:gi[1]] if m[4] == 2000.0]; cen = (300.0, 157.75 + 15.5)
    ok(len(lead) > 8 and all(abs(math.hypot(m[1] - cen[0], m[2] - cen[1]) - 15.5) < 0.06 for m in lead) and all(lead[i][3] <= lead[i - 1][3] + 1e-9 for i in range(1, len(lead))), 'the arc lead-in: on its circle of 2 × R, ever deeper')
    tail = mv[:gi[1]]; flat = [m for m in tail if abs(m[3] + 4) < 1e-6]
    ok((305.0, 157.75) in [(m[1], m[2]) for m in flat] and math.hypot(flat[-1][1] - 305 - 15.5, flat[-1][2] - 157.75 - 15.5) < 0.06, 'it runs 5 mm past its start, then leaves by an arc into the waste — ends %s' % (flat[-1][1:3],))
    o, mv = res['at depth asked inside the board']
    ok(mv[1][3] == 0 and J(c, "(function(){var S=__nv.S,c=JSON.parse(JSON.stringify(S.proj.cabinets[0]));c.sketch={KAIRE:[%s]};var r=window.DBEngine.buildCabinet(c),p=r.panels.filter(function(q){return q.key==='KAIRE'})[0];return __nv.routeNotes(p,1)})()" % json.dumps(dict(RECT, id=1, op='in', cam={'ain': 'line', 'amode': 'quote'}))) == ['quoteIn'],
       '"at depth" inside the board is not obeyed: it still goes down along the lead, and says so')
    o, mv = res['round a shape at the edge, at depth from outside']
    ok(-20 <= mv[0][1] < -7.75 and abs(mv[0][2] - 250) < 0.01, 'a lead that starts outside the part (the cutter clear of the edge, within the 20 mm the machine allows) …  %s' % (mv[0][1:3],))
    ok(mv[1][0] == 'XL2P' and (mv[1][1], mv[1][2]) == (mv[0][1], mv[0][2]) and mv[1][3] == -8.0, '… may come down to depth there, in the air')
    o, mv = res['no room for the lead']
    ok(o['paths'][0]['pts'][0] == [207.75, 157.75] and rules(o, mv) == [], 'no room in a small cut-out: down along the outline instead')
    o, mv = res['from the other face']; oa, ma = prog(dict(RECT, op='in', face='A', cam={'ain': 'arc', 'rout': 'line'}))
    ok(len(mv) == len(ma) and [m[3] for m in mv] == [m[3] for m in ma] and (mv[0][1], mv[0][2]) != (ma[0][1], ma[0][2]) and rules(o, mv) == [], 'from face B: its own program (the part is turned over), the same way down')
    inside = lambda m: 200 < m[1] < 400 and 150 < (560 - m[2]) < 270
    ok(all(inside(m) for m in mv), 'and its lead still lies in the waste (inside the cut-out) — start %s' % (mv[0][1:3],))
    o, mv = res['the other way round']; o2, m2 = res['a line at 45°']
    c1 = [(m[1], m[2]) for m in mv if abs(m[3] + 8) < 1e-6]; c2 = [(m[1], m[2]) for m in m2[4:] if abs(m[3] + 8) < 1e-6]
    ok(c1[-4:] == c2[::-1][-4:] or c1[1] != c2[1], 'reversed: the outline is run the other way — %s vs %s' % (c1[1], c2[1]))
    ok(200 < mv[0][1] < 400 and 150 < mv[0][2] < 270, 'and the lead is still on the waste side')
    o, mv = res['an open line in 3 passes at 10°']
    ok(abs(mv[2][1] - (50 + 3 / math.tan(math.radians(10)))) < 0.002 and mv[2][3] == -3.0 and sorted(set(m[3] for m in mv if m[3] < 0)) == [-9.0, -6.0, -3.0] and len([m for m in mv if m[0] == 'XG0']) == 1,
       'an open line: 3 mm deeper each pass at 10°, there and back without lifting — %s' % [(m[1], m[2], m[3]) for m in mv[:7]])
    o, mv = res['a pocket in 2 passes']
    ok(len(o['paths']) >= 2 and all(g['pts'][0] == g['pts'][-1] for g in o['paths']) and sorted(set(m[3] for m in mv if m[3] < 0 and m[4] == 4000.0)) == [-10.0, -5.0], 'a pocket: every ring closed, 2 passes')
    o, mv = res['a steep 45° line lead, 16 deep']
    worst = max(math.degrees(math.atan2(a[3] - b[3], math.hypot(b[1] - a[1], b[2] - a[2]))) for a, b in zip(mv, mv[1:]) if b[0] == 'XL2P' and b[3] < a[3] - 1e-9 and math.hypot(b[1] - a[1], b[2] - a[2]) > 1e-6)
    ok(worst <= 45.01, 'never steeper than the angle asked for (45°): %.1f°' % worst)
    o, mv = prog(dict(RECT, op='in', cam={'feed': 3000, 'feedIn': 1500}))
    ok(set(m[4] for m in mv[1:-1]) == {3000.0, 1500.0}, 'the feeds asked for are the feeds written')

    # ------------------------------------------------------------ a shape that reaches past the part is cut off at the part
    o, mv = prog({'t': 'line', 'pts': [[-80, 200], [800, 200]], 'closed': False, 'op': 'on', 'face': 'A', 'depth': 8})
    ok(o['paths'][0]['pts'] == [[-12.75, 200], [714.75, 200]] and not o['warn'] and rules(o, mv) == [] and (mv[0][1], mv[0][2]) == (-12.75, 200.0) and max(m[1] for m in mv) == 714.75,
       'a line drawn right across and beyond: routed from edge to edge, the cutter just clear of the board at both ends — %s' % o['paths'][0]['pts'])
    o, mv = prog({'t': 'rect', 'x': 600, 'y': 300, 'w': 160, 'h': 100, 'op': 'in', 'face': 'A', 'depth': 8})
    pts = o['paths'][0]['pts']
    ok(len(o['paths']) == 1 and pts[0][0] == 714.75 and pts[-1][0] == 714.75 and pts[0] != pts[-1] and [607.75, 392.25] in pts and [607.75, 307.75] in pts and rules(o, mv) == [],
       'a cut-out drawn over an edge becomes a notch: in from outside, round its three sides, out again — %s' % pts)
    o, mv = prog({'t': 'rect', 'x': 600, 'y': 300, 'w': 160, 'h': 100, 'op': 'in', 'face': 'A', 'depth': 8, 'cam': {'ain': 'arc', 'rout': 'arc', 'step': 4}})
    notes = J(c, "(function(){var S=__nv.S,c=JSON.parse(JSON.stringify(S.proj.cabinets[0]));c.sketch={KAIRE:[%s]};var r=window.DBEngine.buildCabinet(c),p=r.panels.filter(function(q){return q.key==='KAIRE'})[0];return __nv.routeNotes(p,1)})()" % json.dumps({'t': 'rect', 'x': 600, 'y': 300, 'w': 160, 'h': 100, 'id': 1, 'op': 'in', 'face': 'A', 'depth': 8, 'cam': {'ain': 'arc', 'rout': 'arc', 'step': 4}}))
    ok(rules(o, mv) == [] and notes == ['edgeCut'] and sorted(set(m[3] for m in mv if m[3] < 0 and m[4] == 4000.0)) == [-8.0, -4.0], 'with options: still in passes, and it says the lead-in settings do not apply at an edge — %s' % notes)
    o, mv = prog({'t': 'rect', 'x': -200, 'y': -200, 'w': 100, 'h': 100, 'op': 'in', 'face': 'A', 'depth': 8})
    ok(not o['paths'] and len(o['warn']) == 1 and 'NEPROGRAMUOTA' in o['warn'][0], 'a shape wholly outside the part is not made, and says so — %s' % o['warn'])
    o, mv = prog({'t': 'circle', 'x': 350, 'y': 560, 'r': 60, 'op': 'out', 'face': 'B', 'depth': 8, 'cam': {'step': 4}})
    ok(len(o['paths']) == 1 and all(-12.76 <= q[1] <= 572.76 for q in o['paths'][0]['pts']) and rules(o, mv) == [], 'round a circle that hangs over the edge, from face B: only the part on the board')
    o, mv = prog({'t': 'circle', 'x': -3, 'y': 100, 'r': 4, 'op': 'drill', 'face': 'A', 'depth': 8})
    ok(len(o['warn']) == 1 and 'centras' in o['warn'][0], 'a drilled hole whose centre is off the part is refused — %s' % o['warn'])

    # ------------------------------------------------------------ routing: the options of a shape, on the screen
    c.eval("(function(){var S=__nv.S,c=S.proj.cabinets[S.sk.cab];c.sketch[S.sk.key]=[{t:'rect',x:200,y:150,w:200,h:120,id:1,op:'none',face:'A',depth:8}];S.sk.sel=1;S.sk.tool='sel';__dbk.render()})()"); time.sleep(.5)
    ok(not c.eval("!!document.getElementById('nvq')"), 'a mere sketch has no routing options')
    clk(c, '[data-act=skop][data-v=in]'); time.sleep(.5)
    ok(c.eval("!!document.getElementById('nvq')") and c.eval("!!document.querySelector('[data-nv=nvqSet][data-v=\"ain:line\"]')") and c.eval("!!__nv.S.sk"), 'a cut-out has them: lead-in, lead-out, going down, direction, feed')
    marks = lambda: J(c, "[document.querySelectorAll('.sk-svg polyline[stroke=\"#1f7a4d\"]').length,document.querySelectorAll('.sk-svg polyline[stroke=\"#c2410c\"]').length,document.querySelectorAll('.sk-svg circle[fill=\"#1f7a4d\"]').length]")
    ok(marks() == [0, 0, 1], 'the drawing shows where the cutter starts — %s' % marks())
    clk(c, '[data-nv=nvqSet][data-v="ain:arc"]'); time.sleep(.4); clk(c, '[data-nv=nvqSet][data-v="rout:arc"]'); time.sleep(.4)
    c.type('[data-nv-change=nvqNum][data-k=over]', '5'); time.sleep(.4); c.type('[data-nv-change=nvqNum][data-k=step]', '4'); time.sleep(.4); c.type('[data-nv-change=nvqNum][data-k=aang]', '60'); time.sleep(.4)
    ok(shapes()[0].get('cam') == {'ain': 'arc', 'rout': 'arc', 'over': 5, 'step': 4, 'aang': 60} and c.eval("!!__nv.S.sk"), 'what is picked and typed is kept on the shape — %s' % shapes()[0].get('cam'))
    ok(marks() == [1, 1, 1] and '2 praėjimai' in c.eval("document.getElementById('nvq').textContent"), 'the drawing shows the lead-in and the lead-out, the panel says how many passes — %s' % marks())
    c.type('[data-nv-change=nvqNum][data-k=aang]', '90'); time.sleep(.4)
    ok('aang' not in shapes()[0]['cam'], 'a value equal to the default is not kept')
    clk(c, '[data-nv=nvqSet][data-v="amode:quote"]'); time.sleep(.4)
    ok('gylyje' in (c.eval("(function(){var n=document.querySelector('.nvq-note');return n?n.textContent:''})()") or '') and any(x['id'].startswith('route.quoteIn.KAIRE.1') and x['sev'] == 'info' for x in J(c, "__nv.issues().map(function(x){return {id:x.id,sev:x.sev}})")),
       'what cannot be done as asked is said beside the shape and in the check list (as a note, not an error)')
    c.eval("__nv.undo && 0"); clk(c, '[data-nv=nvqReset]'); time.sleep(.4)
    ok(shapes()[0].get('cam') is None and marks() == [0, 0, 1], 'back to the usual routing with one button')
    clk(c, '[data-act=skop][data-v=on]'); time.sleep(.4)
    ok(c.eval("!!document.getElementById('nvq')") and not c.eval("!!document.querySelector('[data-nv=nvqSet][data-v=\"ain:line\"]')") and c.eval("!!document.querySelector('[data-nv-change=nvqNum][data-k=step]')"), 'routing on the line: passes, angle, feed — no lead-in (there is no waste side)')
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('sketch_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
