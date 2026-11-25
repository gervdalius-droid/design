#!/usr/bin/env python3
"""The check engine (src/ui/10-checks.js, rules listed in docs/CHECKS.md).

    python3 test/ui/checks_test.py [url]      default url: the private build scratch/checks/index.html on the dev server
    python3 build.py --out scratch/checks/index.html --ui 10-checks --check      builds it

  1. the example project and the ten presets give no error and no warning — only the open confirmations and notes,
     in both languages
  2. every own rule fires on a cabinet made wrong on purpose, with its documented severity, topic and field, and stops
     firing when the mistake is taken back
  3. every sentence of the engine's catalogue (docs/map/engine.md §5) is recognised; the standing "not verified" reminders
     are notes; an unknown sentence falls back to the live level()
  4. garbage in any field (text, null, 0, negative, huge, wrong types) never makes a rule throw
  5. the helpers for the other files (topic state, blockers, signature, one-click fixes, confirmations)
  6. time of one run over a 20-cabinet project (printed; must stay under 5 ms)
The cabinets are rebuilt with the live buildOne() and checked without a full render, so the test does not depend on
the stage views of the other files.
"""
import os, re, sys, time, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cdp import Chrome

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/scratch/checks/index.html'
SHOTS = os.path.join(ROOT, 'scratch', 'checks')
fails, n_ok = [], 0


def ok(cond, what):
    global n_ok
    if cond:
        n_ok += 1
    else:
        fails.append(what)
        print('  FAIL  ' + what)


# helpers living in the page: two base projects (the example, the ten presets), a mutation runner, a fuzzer
HELP = r"""(function () {
  var S = __nv.S, T = window.T = { base: {} };
  T.keep = function (k) { T.base[k] = JSON.stringify(S.proj); };
  T.load = function (k) { var p = JSON.parse(T.base[k]); S.proj.cabinets = p.cabinets; S.proj.name = p.name; S.proj.layout = p.layout; S.sel = 0; __nvc.lib.at = Date.now(); __nvc.lib.names = []; };
  /* rebuild every cabinet as render() does (a cabinet the live build cannot take gives no result, as after a crash) */
  T.build = function () { S._info = S.proj.cabinets.map(function (c, i) { try { return __nvc.build(i); } catch (e) { return undefined; } }); };
  T.issues = function () { T.build(); return __nv.issues(); };
  T.brief = function (list) { return list.map(function (x) { return { id: x.id, sev: x.sev, cab: x.cab, topic: x.topic, field: x.field, sec: x.sec, col: x.col, msg: x.msg, hint: x.hint || '', tab: x.tab || '', act: x.act ? (x.act.act || x.act.nv) + ':' + (x.act.v || '') : '' }; }); };
  /* run `js` on cabinet i of base k; → the issues and what threw */
  T.run = function (k, i, js, keep) {
    if (!keep) T.load(k);
    var P = S.proj, c = P.cabinets[i], E = window.DBEngine; S.sel = Math.max(0, i);
    (new Function('P', 'c', 'S', 'E', js))(P, c, S, E);
    return JSON.stringify({ is: T.brief(T.issues()), err: __nvc.errors() });
  };
  T.presets = function () { S.proj.cabinets = __dbk.PRESETS.filter(function (p) { return !p.robe; }).map(function (p) { return __dbk.fromPreset(p); }); S.proj.layout = undefined; };
  var JUNK = ['', ' ', 'abc', '12,5', '-7', null, undefined, 0, -1, -500, 0.0001, 1e9, 1e308, NaN, Infinity, true, false, [], {}, [1, 2], { a: 1 }, '600', '1e5', '<b>', '„x“', function () {}];
  var rnd = function (n) { T.seed = (T.seed * 1103515245 + 12345) & 0x7fffffff; return T.seed % n; };
  var paths = function (o, pre, out, depth) { if (!o || typeof o !== 'object' || depth > 4) return out; Object.keys(o).forEach(function (k) { out.push([o, k]); paths(o[k], pre + k + '.', out, depth + 1); }); return out; };
  /* n rounds: a few random fields of a random cabinet (any depth) become junk; whole cabinets, sections and the project too */
  T.fuzz = function (k, n, seed) {
    T.seed = seed; var bad = [], shape = 0, runs = 0;
    for (var r = 0; r < n; r++) {
      T.load(k); var P = S.proj, i = rnd(P.cabinets.length), c = P.cabinets[i], ps = paths(c, '', [], 0), m = 1 + rnd(4);
      for (var q = 0; q < m; q++) { var t = ps[rnd(ps.length)]; try { t[0][t[1]] = JUNK[rnd(JUNK.length)]; } catch (e) {} }
      if (r % 17 === 3) P.cabinets[i] = JUNK[rnd(JUNK.length)];
      if (r % 19 === 4) P.name = JUNK[rnd(JUNK.length)];
      if (r % 23 === 5 && c.sections) c.sections = [null, 'x', 7, {}, { kind: 'drawers' }, { kind: 'doors', col: 9 }];
      if (r % 29 === 6) P.layout = JUNK[rnd(JUNK.length)];
      var list;
      try { T.build(); list = __nvc.compute(P, S._info); runs++; } catch (e) { bad.push('threw: ' + (e && e.stack || e)); continue; }
      __nvc.errors().forEach(function (x) { bad.push(x.rule + ' @' + x.cab + ': ' + x.err); });
      list.forEach(function (x) { if (!/^(error|todo|warn|info)$/.test(x.sev) || typeof x.msg !== 'string' || !x.msg || (x.raw == null && /undefined|NaN|\[object/.test(x.msg)) || typeof x.cab !== 'number' || typeof x.id !== 'string') { shape++; if (bad.length < 12) bad.push('shape: ' + JSON.stringify(x).slice(0, 260)); } });
      /* with no engine results at all (the build failed) and with a short info array */
      try { __nvc.compute(P, []); __nvc.compute(P, null); __nvc.compute(P, [{}, { r: null }, { r: {} }, { r: { panels: 'x', joints: 5 }, warnings: [null, 5, {}] }]); } catch (e2) { bad.push('threw without info: ' + (e2 && e2.stack || e2)); }
      __nvc.errors().forEach(function (x) { bad.push('no info · ' + x.rule + ' @' + x.cab + ': ' + x.err); });
    }
    return JSON.stringify({ runs: runs, bad: bad.slice(0, 14), nbad: bad.length, shape: shape });
  };
  return true;
})()"""

MAT = "c.mat.carc='LMDP balta 18 mm';c.mat.facade='LMDP pilka 18 mm';c.mat.back='LMDP balta 18 mm';c.edge.carc='ABS balta';c.edge.facade='ABS pilka';"
TALL = "c.type='ŪKINĖ';"
# id · base · cabinet · the mistake · what must hold { sev, topic, field, cab } · the way back (run on top of the mistake; None = the clean base)
# bases: 'ex' = the example (0: three TANDEMBOX drawers 600×720×560 · 1: two doors over one drawer · 2: wall cabinet with doors)
#        'pr' = the ten presets (6: dishwasher front · 8: loose board · 9: 3-D construction)
RULES = [
    ('proj.name', 'ex', 0, "P.name=''", dict(sev='error', cab=-1, field='projname'), "P.name='VIRTUVE'"),
    ('proj.name', 'ex', 0, "P.name='   '", dict(sev='error'), None),
    ('proj.name.ascii', 'ex', 0, "P.name='!!! ???'", dict(sev='warn', cab=-1), "P.name='Virtuvė 12'"),
    ('proj.dupname', 'ex', 0, "__nvc.lib.at=Date.now();__nvc.lib.names=[{id:'other',name:P.name,safe:E.safeName(P.name)}]", dict(sev='warn', cab=-1), "P.name=P.name+' 2'"),
    ('proj.empty', 'ex', 0, "P.cabinets=[]", dict(sev='error', cab=-1), None),
    ('mat.near', 'ex', 1, "c.mat.carc=c.mat.carc.toUpperCase()", dict(sev='warn', cab=-1), "c.mat.carc=P.cabinets[0].mat.carc"),
    ('wt.long', 'ex', 1, "c.worktop.on=true;c.worktop.mat='Stalviršis 38 mm';c.worktop.edge='ABS';c.worktop.left=4500", dict(sev='warn', topic='addons'), "c.worktop.left=0"),
    ('room.ceil', 'ex', 1, "window.DBRoom.ensure(P);c.type='PAKABINAMOS';c.H=2000;c.D=330", dict(sev='warn', tab='room'), "c.H=720"),
    # sizes
    ('size.W', 'ex', 1, "c.W='abc'", dict(sev='error', topic='size', field='f-c-W'), "c.W=600"),
    ('size.W', 'ex', 1, "c.W=-5", dict(sev='error', field='f-c-W'), "c.W='600'"),
    ('size.W', 'ex', 1, "c.W=60", dict(sev='error', field='f-c-W'), "c.W=450"),
    ('size.H', 'ex', 1, "c.H=''", dict(sev='error', topic='size', field='f-c-H'), "c.H=720"),
    ('size.H', 'ex', 1, "c.H=null", dict(sev='error', field='f-c-H'), "c.H=720"),
    ('size.D', 'ex', 1, "c.D=50", dict(sev='error', topic='size', field='f-c-D'), "c.D=560"),
    ('size.W.odd', 'ex', 2, "c.W=120", dict(sev='warn', field='f-c-W'), "c.W=300"),
    ('size.W.odd', 'ex', 2, "c.W=1300", dict(sev='warn', field='f-c-W'), "c.W=800"),
    ('size.H.odd', 'ex', 1, "c.H=1500", dict(sev='warn', field='f-c-H'), "c.H=900"),
    ('size.D.odd', 'ex', 2, "c.D=150", dict(sev='warn', field='f-c-D'), "c.D=300"),
    ('size.D.odd', 'ex', 2, "c.D=900", dict(sev='warn', field='f-c-D'), "c.D=350"),
    ('size.dishWidth', 'pr', 6, "c.dishWidth=''", dict(sev='error', topic='size', field='f-c-dishWidth'), "c.dishWidth=600"),
    ('size.dishWidth.odd', 'pr', 6, "c.dishWidth=520", dict(sev='warn', topic='size', field='f-c-dishWidth'), "c.dishWidth=450"),
    ('size.W', 'pr', 8, "c.W=150", dict(sev='error', topic='size', field='f-c-W'), "c.W=18"),
    ('size.H', 'pr', 8, "c.H=10", dict(sev='error', topic='size'), "c.H=2300"),
    ('size.W', 'pr', 9, "c.W=0", dict(sev='error', topic='dims'), "c.W=600"),
    ('thick.none', 'ex', 1, "c.thick=''", dict(sev='warn', field='f-c-thick'), "c.thick=18"),
    ('thick.thin', 'ex', 1, "c.thick=8", dict(sev='error', field='f-c-thick'), "c.thick=18"),
    ('thick.odd', 'ex', 1, "c.thick=40", dict(sev='warn', field='f-c-thick'), "c.thick=19"),
    ('thick.cam', 'ex', 1, "c.thick=15;c.cnc.joinery='cam'", dict(sev='error', topic='body'), "c.cnc.joinery='confirmat'"),
    ('front.thick', 'ex', 1, "c.cnc.facadeT=3", dict(sev='warn', field='f-c-cnc-facadeT'), "c.cnc.facadeT=19"),
    ('front.thick', 'ex', 1, "c.cnc.facadeT=''", dict(sev='warn'), "c.cnc.facadeT=18"),
    ('legs.h', 'ex', 1, "c.legH=500", dict(sev='warn', topic='body', field='f-c-legH'), "c.legH=150"),
    ('legs.h', 'ex', 1, "c.legH=0", dict(sev='warn', field='f-c-legH'), "c.legH=100"),
    ('rail.w', 'ex', 1, "c.cnc.railW=5", dict(sev='error', topic='body'), "c.cnc.railW=100"),
    ('rail.w', 'ex', 1, "c.cnc.railW=400", dict(sev='error', topic='body'), "c.cnc.railW=120"),
    ('rail.w', 'ex', 1, "c.cnc.railW=250", dict(sev='warn', topic='body'), "c.cnc.railW=80"),
    ('front.gap', 'ex', 1, "c.cnc.fg={top:300}", dict(sev='warn', topic='inside', field='f-fg-top'), "c.cnc.fg={top:5,l:2,r:2,mid:3}"),
    ('front.gap', 'ex', 1, "c.cnc.fg={mid:-4}", dict(sev='warn', field='f-fg-mid'), "c.cnc.fg={mid:''}"),
    ('shelf.set', 'ex', 1, "c.shelfSb=400", dict(sev='warn', topic='inside', field='f-c-shelfSb'), "c.shelfSb=50"),
    ('shelf.set', 'ex', 1, "c.shelfSb='x'", dict(sev='warn'), "c.shelfSb=''"),
    ('col.count', 'ex', 1, "c.cols=5", dict(sev='warn', topic='inside'), "c.cols=1"),
    # columns and sections
    ('col.fit', 'ex', 1, "c.cols=2;c.colW=[900,0];c.sections[1].col=1", dict(sev='error', topic='inside', field='f-c-colW-0'), "c.colW=[350,250]"),
    ('sec.none', 'ex', 1, "c.sections=[]", dict(sev='error', topic='inside'), None),
    ('sec.none', 'ex', 1, "c.cols=2", dict(sev='error', col=1), "c.sections[1].col=1"),
    ('sec.kind', 'ex', 1, "c.sections[0].kind='wardrobe'", dict(sev='error', topic='inside', sec=0), "c.sections[0].kind='open'"),
    ('cab.broken', 'ex', 1, "c.sections=[null,'x',{kind:'doors'}]", dict(sev='error', topic='inside'), None),
    ('cab.broken', 'ex', 1, "c.sections='abc'", dict(sev='error'), None),
    ('sec.over', 'ex', 0, "c.sections[0].fill=false;c.sections[0].height=900", dict(sev='error', topic='inside', field='f-c-sections-0-height', sec=0), "c.sections[0].height=718"),
    ('sec.gap', 'ex', 0, "c.sections[0].fill=false;c.sections[0].height=400", dict(sev='warn', topic='inside'), "c.sections[0].fill=true"),
    ('drawer.low', 'ex', 0, "c.sections[0].nDrawers=12", dict(sev='error', topic='inside', field='f-c-sections-0-nDrawers', sec=0), "c.sections[0].nDrawers=4"),
    ('drawer.low', 'ex', 0, "c.sections[0].hw='BLUM TANDEM';c.sections[0].nDrawers=11", dict(sev='warn', field='f-c-sections-0-nDrawers'), "c.sections[0].nDrawers=5"),
    ('drawer.high', 'ex', 0, "c.H=900;c.sections[0].nDrawers=1", dict(sev='warn', sec=0), "c.sections[0].nDrawers=2"),
    ('drawer.rail', 'ex', 0, "c.sections[0].hw='BLUM TANDEM';c.sections[0].rail=650", dict(sev='error', topic='inside', field='f-c-sections-0-rail'), "c.sections[0].rail=550"),
    ('drawer.rail', 'ex', 0, "c.D=300", dict(sev='error', field='f-c-sections-0-rail'), "c.sections[0].rail=270"),
    ('drawer.raillen', 'ex', 0, "c.sections[0].rail=333", dict(sev='warn', field='f-c-sections-0-rail'), "c.sections[0].rail=450"),
    ('drawer.narrow', 'ex', 0, "c.W=180", dict(sev='warn', topic='inside', sec=0), "c.W=300"),
    ('door.wide', 'ex', 1, "c.W=1200;c.sections[0].nDoors=1", dict(sev='warn', topic='inside', field='f-c-sections-0-nDoors'), "c.sections[0].nDoors=2"),
    ('door.narrow', 'ex', 1, "c.sections[0].nDoors=6", dict(sev='warn', field='f-c-sections-0-nDoors'), "c.sections[0].nDoors=2"),
    ('door.tall', 'ex', 1, TALL + "c.H=2700", dict(sev='warn', topic='inside', sec=0), "c.H=2100"),
    ('door.hinges', 'ex', 1, TALL + "c.H=2000;c.sections[0].hingeN=2", dict(sev='warn', field='f-c-sections-0-hingeN'), "c.sections[0].hingeN=4"),
    ('shelf.span', 'ex', 1, "c.W=1200", dict(sev='warn', topic='inside'), "c.W=900"),
    ('shelf.dense', 'ex', 1, "c.sections[0].shelves=15", dict(sev='warn', field='f-c-sections-0-shelves'), "c.sections[0].shelves=2"),
    # materials
    ('mat.carc', 'ex', 1, "c.mat.carc=''", dict(sev='error', topic='mats', field='f-c-mat-carc'), "c.mat.carc=P.cabinets[0].mat.carc"),
    ('mat.carc', 'pr', 8, "c.mat.carc='  '", dict(sev='error', topic='size'), "c.mat.carc='LMDP 18'"),
    ('mat.facade', 'ex', 1, "c.mat.facade=null", dict(sev='error', topic='mats', field='f-c-mat-facade'), "c.mat.facade='MDF dažytas'"),
    ('mat.facade', 'pr', 6, "c.mat.facade=''", dict(sev='error', topic='mats'), "c.mat.facade='MDF'"),
    ('mat.back', 'ex', 1, "c.cnc.back='top';c.cnc.backs=['solid'];c.mat.back=''", dict(sev='warn', topic='mats', field='f-c-mat-back'), "c.mat.back=c.mat.carc"),
    ('mat.thick', 'ex', 1, "c.mat.carc='LMDP balta 16 mm'", dict(sev='warn', topic='mats', field='f-c-mat-carc'), "c.thick=16"),
    ('mat.thick', 'ex', 1, "c.mat.facade='MDF 19mm'", dict(sev='warn', field='f-c-mat-facade'), "c.cnc.facadeT=19"),
    ('wt.mat', 'ex', 1, "c.worktop.on=true;c.worktop.mat=''", dict(sev='error', topic='addons', field='f-c-worktop-mat'), "c.worktop.mat='Ąžuolas 38 mm';c.worktop.edge='ABS ąžuolas'"),
    ('wt.edge', 'ex', 1, "c.worktop.on=true;c.worktop.mat='Ąžuolas 38 mm';c.worktop.edge=''", dict(sev='warn', field='f-c-worktop-edge'), "c.worktop.edge='ABS'"),
    ('wt.thick', 'ex', 1, "c.worktop.on=true;c.worktop.mat='Ąžuolas';c.worktop.edge='ABS';c.worktop.T=380", dict(sev='warn', field='f-c-worktop-T'), "c.worktop.T=38"),
    ('edge.carc', 'ex', 1, "c.edge.carc=''", dict(sev='error', topic='mats', field='f-c-edge-carc'), "c.edge.carc='ABS balta 0.8'"),
    ('edge.facade', 'ex', 1, "c.edge.facade=''", dict(sev='error', topic='mats', field='f-c-edge-facade'), "c.edge.facade='ABS 1'"),
    ('extra.size', 'ex', 1, "c.extras=[{name:'Lentjuostė',L:0,W:100,qty:1}]", dict(sev='error', topic='addons', field='f-c-extras-0-L'), "c.extras[0].L=500"),
    ('extra.size', 'ex', 1, "c.extras=[{name:'Lentjuostė',L:500,W:'',qty:1}]", dict(sev='error', field='f-c-extras-0-W'), "c.extras=[]"),
    ('extra.qty', 'ex', 1, "c.extras=[{name:'Lentjuostė',L:500,W:100,qty:0}]", dict(sev='warn', field='f-c-extras-0-qty'), "c.extras[0].qty=2"),
    ('extra.mat', 'ex', 1, "c.mat.carc='';c.extras=[{name:'Lentjuostė',L:500,W:100,qty:1,mat:''}]", dict(sev='error', field='f-c-extras-0-mat'), "c.extras[0].mat='LMDP 18'"),
    ('extra.edge', 'ex', 1, "c.edge.carc='';c.extras=[{name:'Lentjuostė',L:500,W:100,qty:1,e1:true}]", dict(sev='error', field='f-c-extras-0-edgeMat'), "c.extras[0].edgeMat='ABS'"),
    ('mat.thick', 'ex', 1, "c.extras=[{name:'Lentjuostė',L:500,W:100,qty:1,mat:'MDF 25 mm',T:18}]", dict(sev='warn', topic='addons', field='f-c-extras-0-mat'), "c.extras[0].T=25"),
    # parts
    ('part.big', 'ex', 1, TALL + "c.H=2900", dict(sev='error', topic='size'), "c.H=2400"),
    ('part.big', 'ex', 1, "c.extras=[{name:'Šonas',L:3000,W:2200,qty:1}]", dict(sev='error'), "c.extras[0].W=600;c.extras[0].L=2700"),
    ('part.small', 'ex', 1, "c.cnc.railW=45", dict(sev='warn', topic='size'), "c.cnc.railW=100"),
    ('part.round', 'ex', 1, "c.W=600.333", dict(sev='info'), "c.W=600"),
]
# engine sentences the catalogue table does not carry as `W-…` rows: the machine's (engine.md §5.6) — and what each must become
MACHINE = [
    ('1-KAIRE: ø8 skylė už detalės ribų (693, 585) — praleista', 'eng.holeOut', 'error'),
    ('1-FASADAS1: ø10 skylė (32,65.5) — tokio grąžto galvoje nėra, NEPROGRAMUOTA', 'eng.noDrill', 'error'),
    ('1-KAIRE: kiaurai ø7 — kiauro grąžto nėra', 'eng.noThrough', 'warn'),
    ('1-JUOSTA-PRIEKIS: ø5 krašto skylė už detalės ribų (x0, 30) — praleista', 'eng.holeOut', 'error'),
    ('1-DUGNAS: ø6 krašto skylė (y0, 30) — šiam kraštui grąžto nėra, NEPROGRAMUOTA', 'eng.noEdgeDrill', 'error'),
    ('1-DUGNAS: ø6 krašto skylė — grąžto nėra, NEPROGRAMUOTA', 'eng.noEdgeDrill', 'error'),
    ('2-KAIRE, 2-DESINE: 3 ø5 skylės ilgame krašte — pasukti 90° negalima (ilgis 2082 > 900 mm), NEPROGRAMUOTA', 'eng.longEdge', 'error'),
    ('1-JUOSTA-PRIEKIS: pasuktoje programoje X ilgis tik 100 mm (staklių min. 200) — patikrinkite prispaudimą', 'eng.clampShort', 'info'),
    ('1-DUGNAS: plotis 1000 mm > 900 — netelpa į stakles, NEPROGRAMUOTA', 'eng.tooBig', 'error'),
    ('1-DUGNAS: ilgis 5000 mm > 3050 — netelpa į stakles, NEPROGRAMUOTA', 'eng.tooBig', 'error'),
]
SEV_OF = {'B': ('error',), 'E': ('error', 'warn'), 'A': ('warn', 'info', 'error'), 'U': ('info',), 'I': ('info', 'warn', 'error')}


def catalogue():
    """Every template of docs/map/engine.md §5 as a sample sentence: [id, class, text]."""
    txt = open(os.path.join(ROOT, 'docs', 'map', 'engine.md'), encoding='utf8').read()
    sec = txt[txt.index('## 5. Warning catalogue'):txt.index('## 6. Rules object')]
    rows = []
    for line in sec.split('\n'):
        m = re.match(r'\| (W-\w+) \| [^|]* \| (\w+) \| `(.*?)`', line.replace('\\|', '¦'))
        if not m:
            continue
        t = re.sub(r'\{[^{}]*¦[^{}]*\}', lambda q: q.group(0)[1:-1].split('¦')[0], m.group(3))
        t = re.sub(r'\{[^{}]*\}', '12', t).replace('[', '').replace(']', '').replace('¦', '|')
        rows.append([m.group(1), m.group(2), t])
    return rows


def find(res, rid, cab):
    return [x for x in res['is'] if x['id'] == rid and (cab is None or x['cab'] == cab)]


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with Chrome() as c:
        c.goto(URL)
        c.click_text('Atidaryti pavyzdį'); time.sleep(1.0)
        ok(c.eval("!!(window.__nv && window.__nvc && __nv.S.proj && __nv.S.proj.cabinets.length===3)"), 'the example project opens with three cabinets')
        c.eval(HELP)
        c.eval("T.keep('ex')")

        # ---------------------------------------------------------------- 1. clean projects stay clean
        print('1. clean projects')
        for lang in ('lt', 'en'):
            c.eval("__nv.S.lang=%s" % json.dumps(lang))
            res = json.loads(c.eval("T.run('ex',0,'')"))
            loud = [x for x in res['is'] if x['sev'] in ('error', 'warn')]
            ok(not loud, 'example (%s): no errors or warnings — %s' % (lang, json.dumps(loud, ensure_ascii=False)[:400]))
            ok(len([x for x in res['is'] if x['sev'] == 'todo']) == 6, 'example (%s): six open confirmations (joints + edges of three cabinets)' % lang)
            ok(not res['err'], 'example (%s): no rule threw %s' % (lang, res['err']))
            ok(all(x['msg'] and 'undefined' not in x['msg'] for x in res['is']), 'example (%s): every issue has a text' % lang)
        en = json.loads(c.eval("T.run('ex',0,'')"))
        ok(any('not confirmed' in x['msg'] for x in en['is']), 'English texts come through L()')
        c.eval("__nv.S.lang='lt'")
        c.eval("T.presets(); T.keep('pr')")
        res = json.loads(c.eval("T.run('pr',0,'')"))
        ok(c.eval("__nv.S.proj.cabinets.length") == 10, 'ten presets')
        loud = [x for x in res['is'] if x['sev'] in ('error', 'warn')]
        ok(not loud, 'ten presets: no errors or warnings — %s' % json.dumps(loud, ensure_ascii=False)[:600])
        ok(all(x['id'].startswith('confirm.') for x in res['is'] if x['sev'] == 'todo'), 'presets: the only blockers are the confirmations')
        ok(not res['err'], 'presets: no rule threw %s' % res['err'])
        # the same presets at other usual sizes, with millimetre-named materials
        sizes = "var Wn=[300,400,450,500][%d];P.cabinets.forEach(function(c){if(c.kind==='panel')return;" + MAT + "c.thick=18;if(!c.dishwasher)c.W=Wn;else{c.dishWidth=Wn<500?450:600}})"
        for k in range(4):
            res = json.loads(c.eval("T.run('pr',0,%s)" % json.dumps(sizes % k)))
            loud = [x for x in res['is'] if x['sev'] in ('error', 'warn')]
            ok(not loud, 'presets at width #%d: clean — %s' % (k, json.dumps(loud, ensure_ascii=False)[:600]))

        # ---------------------------------------------------------------- 2. every own rule fires, and stops
        print('2. own rules')
        seen = set()
        for rid, base, i, bad, want, fix in RULES:
            res = json.loads(c.eval("T.run(%s,%d,%s)" % (json.dumps(base), i, json.dumps(bad))))
            cab = want.get('cab', -1 if rid.startswith('proj.') else None if rid.startswith('room.') else i)
            hit = find(res, rid, cab)
            tag = '%s  [%s]' % (rid, bad[:50])
            ok(bool(hit), tag + ': fires — got ' + ', '.join(sorted(set(x['id'] for x in res['is'] if x['sev'] != 'todo')))[:300])
            ok(not res['err'], tag + ': nothing threw %s' % res['err'])
            if hit:
                x = hit[0]; seen.add(rid)
                for k in ('sev', 'topic', 'field', 'sec', 'col', 'tab'):
                    if k in want:
                        ok(x.get(k) == want[k], '%s: %s is %r (want %r)' % (tag, k, x.get(k), want[k]))
                ok(len(x['msg']) > 8 and len(x['msg']) < 240, tag + ': a short sentence (%d chars)' % len(x['msg']))
            if fix is None:
                res2 = json.loads(c.eval("T.run(%s,%d,'')" % (json.dumps(base), i)))
            else:
                res2 = json.loads(c.eval("T.run(%s,%d,%s,true)" % (json.dumps(base), i, json.dumps(fix))))
            ok(not find(res2, rid, cab), tag + ': gone after [%s] — %s' % (fix, json.dumps(find(res2, rid, cab), ensure_ascii=False)[:200]))
        # rules that need a state the editor cannot make: checked on hand-made engine results
        r = json.loads(c.eval("""(function(){T.load('ex');T.build();var S=__nv.S,inf=S._info.slice();
            inf[1]={r:{panels:[],joints:[],warnings:[]},warnings:[],nProg:0};var a=__nvc.compute(S.proj,inf);
            var p0=S._info[0].r.panels[0];inf=S._info.slice();inf[1]={r:{panels:[{name:p0.name,key:p0.key,L:500,W:300,T:18,short:'x',role:'DUGNAS'}],joints:[]},warnings:[],nProg:1};var b=__nvc.compute(S.proj,inf);
            return JSON.stringify({a:T.brief(a),b:T.brief(b),err:__nvc.errors()})})()"""))
        x = [q for q in r['a'] if q['id'] == 'cab.noparts']
        ok(x and x[0]['sev'] == 'error' and x[0]['cab'] == 1, 'cab.noparts: a cabinet that gives no parts is an error')
        x = [q for q in r['b'] if q['id'] == 'proj.prefix']
        ok(x and x[0]['sev'] == 'error', 'proj.prefix: two cabinets with the same file prefix is an error')
        ok(not r['err'], 'hand-made results: nothing threw %s' % r['err'])
        seen.update(['cab.noparts', 'proj.prefix'])
        # a part with three programs: both faces drilled and an edge bore only the turned program can make
        r = json.loads(c.eval("""(function(){T.load('ex');T.build();var S=__nv.S,inf=S._info.slice(),r0=inf[1].r,E=window.DBEngine;
            var p=JSON.parse(JSON.stringify(r0.panels[0]));p.L=600;p.W=500;p.holes=[{face:'A',x:50,y:50,d:5,depth:10},{face:'B',x:60,y:60,d:5,depth:10}];
            var d=E.R.drills.xEnds.filter(function(v){return E.R.drills.yEdges.indexOf(v)<0})[0];p.edges=d!=null?[{edge:'y0',d:d,pos:100,depth:20}]:[];
            var r1={};Object.keys(r0).forEach(function(k){r1[k]=r0[k]});r1.panels=r0.panels.slice();r1.panels[0]=p;inf[1]={r:r1,warnings:inf[1].warnings,nProg:inf[1].nProg};
            return JSON.stringify({d:d==null?null:d,is:T.brief(__nvc.compute(S.proj,inf)),err:__nvc.errors()})})()"""))
        if r['d'] is None:
            print('   (part.progs not exercised: every end drill of this machine is also an edge drill)')
        else:
            x = [q for q in r['is'] if q['id'] == 'part.progs']
            ok(x and x[0]['sev'] == 'warn' and x[0]['cab'] == 1, 'part.progs: a part with three programs is a warning')
        seen.add('part.progs')
        # the confirmations: found, with the live command that opens each modal, and gone once confirmed in it
        c.eval("T.load('ex'); __nv.render()"); time.sleep(0.4)
        todo = json.loads(c.eval("JSON.stringify(T.brief(__nv.issues().filter(function(x){return x.cab===1&&x.sev==='todo'})))"))
        ok(sorted(x['id'] for x in todo) == ['confirm.edges', 'confirm.joints'], 'confirmations of cabinet 2 are open')
        ok(sorted(x['act'] for x in todo) == ['ecroom:', 'jcroom:'], 'confirmations carry the live commands jcroom / ecroom')
        ok(sorted(x['topic'] for x in todo) == ['joints', 'review'], 'the joints confirmation belongs to the topic Jungtys, the edges one to the review')
        for act, flag, okact, rid in (('jcroom', None, '[data-nv=nvjOk]', 'confirm.joints'), ('ecroom', 'echeck', '[data-act=ecok]', 'confirm.edges')):
            c.eval("(function(){var b=document.createElement('button');b.setAttribute('data-act',%s);b.setAttribute('data-i','1');document.getElementById('nv-main').appendChild(b);b.click()})()" % json.dumps(act)); time.sleep(0.5)
            if act == 'jcroom':   # joints have one place: the command lands in the topic "Jungtys" of that cabinet, no window opens
                ok(c.eval("__nv.S.jcheck!==true && __nv.S.sel===1 && __nv.S.tab==='cab' && __nv.NV.topic==='joints' && !document.querySelector('.jcbox')"), 'jcroom opens the topic Jungtys of cabinet 2')
                c.shot(os.path.join(SHOTS, 'topic-joints.png'))
            else:
                ok(c.eval("__nv.S.%s===true && __nv.S.sel===1" % flag), '%s opens the modal for cabinet 2' % act)
            ok(c.eval("!!document.querySelector(%s)" % json.dumps(okact)), 'the confirm button is there (%s)' % okact)
            c.click(okact); time.sleep(0.5)
            ok(c.eval("__nv.issues().filter(function(x){return x.cab===1&&x.id===%s}).length" % json.dumps(rid)) == 0, rid + ' is closed after confirming')
        c.eval("__nv.S.proj.cabinets[1].cnc.joinery='cam'; __nv.render()"); time.sleep(0.4)
        again = json.loads(c.eval("JSON.stringify(T.brief(__nv.issues().filter(function(x){return x.cab===1&&x.sev==='todo'})))"))
        ok(len(again) >= 1 and all('iš naujo' in x['msg'] for x in again), 'a change after confirming asks again ("patvirtinkite iš naujo")')
        seen.update(['confirm.joints', 'confirm.edges'])
        # every rule of the severity table was exercised (a prefix stands for its family: size → size.W …, room → room.ceil)
        sev = json.loads(c.eval("JSON.stringify(__nvc.sev)"))
        alias = {'size': 'size.W', 'size.odd': 'size.W.odd', 'room': 'room.ceil', 'drawer.low.soft': 'drawer.low', 'rail.w.bad': 'rail.w'}
        missing = [k for k in sev if alias.get(k, k) not in seen]
        ok(not missing, 'every own rule has a test: missing ' + ', '.join(missing))

        # ---------------------------------------------------------------- 3. the engine's sentences
        print('3. engine sentences')
        rows = catalogue()
        ok(len(rows) >= 120, 'the catalogue was read (%d templates)' % len(rows))
        cls = json.loads(c.eval("JSON.stringify(%s.map(function(r){var k=__nvc.classify(r[2]);return k?[k.id,k.sev,k.topic]:null}))" % json.dumps(rows, ensure_ascii=False)))
        for row, k in zip(rows, cls):
            ok(k is not None, 'catalogue %s is recognised: %s' % (row[0], row[2][:90]))
            if k:
                ok(k[1] in SEV_OF.get(row[1], ('error', 'warn', 'info')), 'catalogue %s (class %s) → %s %s' % (row[0], row[1], k[0], k[1]))
                ok(k[2] in ('size', 'inside', 'body', 'joints', 'mats', 'addons', 'cnc', 'review', 'fronts'), 'catalogue %s has a topic (%s)' % (row[0], k[2]))
        cls = json.loads(c.eval("JSON.stringify(%s.map(function(r){var k=__nvc.classify(r[0]);return k?[k.id,k.sev]:null}))" % json.dumps(MACHINE, ensure_ascii=False)))
        for row, k in zip(MACHINE, cls):
            ok(k == [row[1], row[2]], 'machine sentence → %s %s (got %s): %s' % (row[1], row[2], k, row[0][:70]))
        # in a cabinet: reminders are notes, a real engine error is an error with its hint and way out, unknown text keeps level()
        res = json.loads(c.eval("T.run('ex',1,'')"))
        unv = [x for x in res['is'] if x['cab'] == 1 and x['id'].startswith('eng.unver')]
        ok(len(unv) >= 2 and all(x['sev'] == 'info' for x in unv), 'the "NEPATIKRINTA" reminders are notes (%d)' % len(unv))
        res = json.loads(c.eval("T.run('ex',1,%s)" % json.dumps(TALL + "c.H=2100;c.cnc.back='top';c.cnc.backs=['solid'];c.cnc.backJoint='confirmat';c.mat.back=c.mat.carc")))
        x = find(res, 'eng.backConf', 1)
        ok(x and x[0]['sev'] == 'error' and x[0]['topic'] == 'joints' and 'ekscentrik' in x[0]['hint'] and x[0]['act'] == 'nvcfix:backcam', 'tall side + confirmat back: error on the back joint with the way out — %s' % json.dumps(x, ensure_ascii=False)[:300])
        ok(not find(res, 'eng.longEdge', 1), 'the machine line about the same holes is folded into it')
        res = json.loads(c.eval("T.run('ex',0,%s)" % json.dumps("c.D=300")))
        ok(not find(res, 'eng.runnerMarkOut', 0) and find(res, 'drawer.rail', 0), 'an engine line that an own rule says better is dropped')
        res = json.loads(c.eval("T.run('ex',1,%s)" % json.dumps("c.cols=3;c.W=300")))
        x = find(res, 'eng.colNarrow', 1)
        ok(len(x) == 3 and x[0]['field'] == 'f-c-colW-0' and x[0]['col'] == 0 and x[2]['field'] is None, 'a sentence that names a column carries col and the column field')
        res = json.loads(c.eval("T.run('ex',1,%s)" % json.dumps("c.sections[0].nDoors=3")))
        x = find(res, 'eng.hingeNoSide', 1)
        ok(x and x[0]['sec'] == 0 and x[0]['field'] == 'f-c-sections-0-nDoors', 'a sentence about a door finds its section — %s' % json.dumps(x, ensure_ascii=False)[:200])
        r = json.loads(c.eval("""(function(){T.load('ex');T.build();var S=__nv.S,inf=S._info.slice();
            inf[0]={r:inf[0].r,nProg:1,warnings:['visiškai naujas variklio tekstas — klaida, NEPROGRAMUOTA','kažkas netelpa kitur','šiaip pastaba apie nieką']};
            return JSON.stringify(T.brief(__nvc.compute(S.proj,inf)).filter(function(x){return x.id==='eng.other'}))})()"""))
        lv = json.loads(c.eval("JSON.stringify(['visiškai naujas variklio tekstas — klaida, NEPROGRAMUOTA','kažkas netelpa kitur','šiaip pastaba apie nieką'].map(function(w){return __nvc.level(w)}))"))
        want = [{'bad': 'error', 'warn': 'warn'}.get(v, 'info') for v in lv]
        ok([x['sev'] for x in r] == want and all(x['topic'] is None for x in r), 'unknown engine text falls back to level(): %s → %s' % (lv, [x['sev'] for x in r]))

        # ---------------------------------------------------------------- 4. garbage never throws
        print('4. fuzz')
        for base, n, seed in (('ex', 220, 7), ('pr', 380, 99)):
            f = json.loads(c.eval("T.fuzz(%s,%d,%d)" % (json.dumps(base), n, seed)))
            ok(f['nbad'] == 0, 'fuzz %s: %d runs, %d problems — %s' % (base, f['runs'], f['nbad'], json.dumps(f['bad'], ensure_ascii=False)[:900]))
            ok(f['runs'] == n, 'fuzz %s: every run finished (%d of %d)' % (base, f['runs'], n))
        junk = c.eval("""(function(){var bad=[];[null,undefined,0,'x',[],{}, {cabinets:null},{cabinets:[null,5,'x',[],{}]},{name:{},cabinets:[{sections:'x',mat:5,edge:[],cnc:'q',extras:[null,7,{}],worktop:1}]}].forEach(function(p,k){
            try{var l=__nvc.compute(p,k%2?null:[{},{r:5}]);if(!Array.isArray(l))bad.push('no list '+k)}catch(e){bad.push(k+': '+e)}
            __nvc.errors().forEach(function(x){bad.push(k+' '+x.rule+': '+x.err)})});return JSON.stringify(bad)})()""")
        ok(junk == '[]', 'a broken project record gives a list, not an exception — ' + str(junk)[:500])

        # ---------------------------------------------------------------- 5. helpers for the other files
        print('5. helpers')
        c.eval("T.load('ex'); T.build(); __nv.issues()")
        ok(c.eval("__nvc.sig()") == '', 'nvcSig: no warnings → empty signature')
        ok(c.eval("__nvc.blockers().length") == 6 and c.eval("__nvc.blockers().every(function(x){return x.sev==='todo'||x.sev==='error'})"), 'nvcBlockers: the six confirmations')
        ok(c.eval("__nvc.topicState(1,'review')") == 'todo' and c.eval("__nvc.topicState(1,'size')") == 'ok', 'nvcTopicState: review is todo, size is ok')
        c.eval("T.run('ex',1,'c.legH=500;c.W=\"\"')")
        s1 = c.eval("__nvc.sig()")
        ok(c.eval("__nvc.topicState(1,'size')") == 'error' and c.eval("__nvc.topicState(1,'body')") == 'warn', 'nvcTopicState: error in size, warning in carcass')
        ok(re.match(r'^1\.[0-9a-z]+$', s1 or ''), 'nvcSig: one warning → "1.xxxx" (%s)' % s1)
        c.eval("T.run('ex',1,'c.legH=450')"); s2 = c.eval("__nvc.sig()")
        c.eval("__nv.S.lang='en'; T.run('ex',1,'c.legH=450')"); s3 = c.eval("__nvc.sig()"); c.eval("__nv.S.lang='lt'")
        ok(s1 != s2, 'nvcSig: another number → another signature')
        ok(s2 == s3, 'nvcSig: the language does not change it')
        # one-click fixes (NVA.nvcfix)
        for bad, rid, want in (("c.sections[0].hw='BLUM TANDEM';c.sections[0].rail=650", 'drawer.rail', "__nv.S.proj.cabinets[0].sections[0].rail===550"),
                               ("c.sections[0].nDrawers=12", 'drawer.low', "__nv.S.proj.cabinets[0].sections[0].nDrawers===7")):
            res = json.loads(c.eval("T.run('ex',0,%s)" % json.dumps(bad)))
            x = find(res, rid, 0)
            ok(x and x[0]['act'].startswith('nvcfix:'), rid + ': offers a one-click fix (%s)' % (x[0]['act'] if x else None))
            if x:
                c.eval("__nv.A.nvcfix(null,%s,0)" % json.dumps(x[0]['act'][7:]))
                ok(c.eval(want), rid + ': the fix sets the value')
                ok(c.eval("T.issues().filter(function(q){return q.cab===0&&q.id===%s}).length" % json.dumps(rid)) == 0, rid + ': gone after the fix')
        res = json.loads(c.eval("T.run('ex',1,%s)" % json.dumps("c.cols=2;c.colW=[900,0];c.sections[1].col=1")))
        c.eval("__nv.A.nvcfix(null,'colseq',1)")
        ok(c.eval("T.issues().filter(function(q){return q.id==='col.fit'}).length") == 0, 'col.fit: "equal columns" fixes it')
        res = json.loads(c.eval("T.run('ex',1,%s)" % json.dumps(TALL + "c.H=2100;c.cnc.back='top';c.cnc.backs=['solid'];c.cnc.backJoint='confirmat';c.mat.back=c.mat.carc")))
        c.eval("__nv.A.nvcfix(null,'backcam',1)")
        ok(c.eval("T.issues().filter(function(q){return q.id==='eng.backConf'||q.id==='eng.longEdge'}).length") == 0, 'eng.backConf: "cam locks for the back" fixes it')
        ok(c.eval("__nv.A.nvcfix(null,'nonsense:1:2',0)") is False and c.eval("__nv.A.nvcfix(null,'rail:99:500',0)") is False, 'nvcfix ignores what it does not know')

        # ---------------------------------------------------------------- 6. speed
        print('6. speed')
        t = json.loads(c.eval("""(function(){T.load('pr');var S=__nv.S;S.proj.cabinets=S.proj.cabinets.concat(JSON.parse(JSON.stringify(S.proj.cabinets)));
            S.proj.cabinets.forEach(function(c,i){c.id='c'+i});T.build();var n=S.proj.cabinets.length,k,l;
            for(k=0;k<30;k++)l=__nvc.compute(S.proj,S._info);
            var t0=performance.now();for(k=0;k<300;k++)l=__nvc.compute(S.proj,S._info);var a=(performance.now()-t0)/300;
            S.proj.cabinets.forEach(function(c,i){if(c.kind||c.dishwasher)return;c.W=1300+i;c.sections.forEach(function(s){s.shelves=9;s.rail=333});c.mat.carc='X 16 mm';c.edge.carc=''});T.build();
            for(k=0;k<30;k++)l=__nvc.compute(S.proj,S._info);
            t0=performance.now();for(k=0;k<300;k++)l=__nvc.compute(S.proj,S._info);var b=(performance.now()-t0)/300;
            return JSON.stringify({n:n,clean:a,dirty:b,issues:l.length})})()"""))
        print('   %d cabinets: %.2f ms per run clean, %.2f ms with %d issues' % (t['n'], t['clean'], t['dirty'], t['issues']))
        ok(t['n'] == 20 and t['clean'] < 5 and t['dirty'] < 5, 'one run over 20 cabinets stays under 5 ms (%.2f / %.2f)' % (t['clean'], t['dirty']))

        # ---------------------------------------------------------------- the page itself: issues decorate their fields, no console errors
        c.eval("T.load('ex'); __nv.S.proj.cabinets[1].mat.carc=''; __nv.S.proj.cabinets[1].legH=500; __nv.go({tab:'chk'})"); time.sleep(0.5)
        c.shot(os.path.join(SHOTS, 'check-lt.png'))
        ok('Nenurodyta korpuso medžiaga' in c.text('#nv-main'), 'the check stage lists the issue')
        c.eval("__nv.S.lang='en'; __nv.render()"); time.sleep(0.3)
        c.shot(os.path.join(SHOTS, 'check-en.png'))
        ok('No carcass material' in c.text('#nv-main'), 'and in English')
        c.eval("__nv.S.lang='lt'; __nv.render()")
        logs = [l for l in c.drain_logs() if 'favicon' not in l and not l.startswith('[warning]')]
        ok(not logs, 'no console or page errors: ' + ' | '.join(logs)[:600])

    print('\n%d checks passed, %d failed' % (n_ok, len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
