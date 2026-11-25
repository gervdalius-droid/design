#!/usr/bin/env python3
"""test/ui/topics_test.py — the topics of src/ui/31-topics.js (Korpusas, Medžiagos, Priedai, Gręžimas, Patikra and the
panel / 3-D construction / dishwasher variants), driven in headless Chrome.

    python3 test/ui/topics_test.py                      # the private build  scratch/topics/index.html
    NV_URL=http://127.0.0.1:8765/ python3 test/ui/topics_test.py     # the integrated build

What it checks
  1. walk     every topic of the three example cabinets and of the presets tall / fridge / dishwasher / panel / box
              renders, with no page error, no element id twice and no bound field twice on the page; walking alone
              changes neither the project nor the engine's output
  2. controls representative controls of every group change the model as expected; computed texts follow the typing;
              "Daugiau" groups open by themselves when a field inside is not at its default
  3. legacy   the same commands and bindings, used through the live app's own screens (/legacy/), leave the same
              cabinet and the same engine output (skipped with a note when the legacy snapshot is not served)
The dev server must be running (python3 tools/serve.py). Exit code 1 on any failure.
"""
import json, os, sys, time

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(R, "tools"))
from cdp import Chrome  # noqa: E402

URL = os.environ.get("NV_URL", "http://127.0.0.1:8765/scratch/topics/index.html")
LEGACY = os.environ.get("NV_LEGACY", "http://127.0.0.1:8765/legacy/")
MINE = r"/^(panel|bx-|body$|joints$|mats$|addons$|cnc$|review$)/"
FAIL, DONE = [], [0]


def ok(cond, what):
    DONE[0] += 1
    if not cond:
        FAIL.append(what)
        print("  FAIL  " + what)
    return cond


def js(c, expr):
    v = c.eval(expr)
    if isinstance(v, dict) and "__error" in v:
        raise RuntimeError("js: %s\n   in: %s" % (v["__error"], expr[:200]))
    return v


def errors(c):
    return [l for l in c.drain_logs() if "favicon" not in l and ("[pageerror]" in l or "[error]" in l)]


# ---------------------------------------------------------------- the two apps behind one set of verbs
class App:
    """The new interface (kind 'new': topics) or the live snapshot (kind 'legacy': steps)."""

    def __init__(self, c, kind):
        self.c, self.kind = c, kind
        self.g = "__nv" if kind == "new" else "__dbk"

    def open_example(self):
        c = self.c
        c.goto(URL if self.kind == "new" else LEGACY)
        try:
            c.click_text("Dirbti be prisijungimo")
        except Exception:
            pass
        c.click_text("Atidaryti pavyzdį")
        c.wait("window.%s && %s.S.proj && %s.S.proj.cabinets.length === 3" % (self.g, self.g, self.g))
        time.sleep(0.3)
        if self.kind == "new":   # new cabinets get the workshop's default shelf setback here (30-editor.js); the comparison with the live app is about the clicks, so both start alike
            js(c, "(function(){__nv.S.proj.cabinets.forEach(function(k){delete k.shelfSb});__dbk.saveNow();__nv.render()})()"); time.sleep(0.2)

    def render(self):
        js(self.c, "%s.render()" % self.g)
        time.sleep(0.12)

    def sel(self, i):
        js(self.c, "%s.S.sel=%d" % (self.g, i))
        self.render()

    def add_preset(self, key):
        js(self.c, "(function(){var P=__dbk.PRESETS,S=%s.S,i=P.findIndex(function(p){return p.k===%s});"
                   "S.proj.cabinets.push(__dbk.fromPreset(P[i]));S.sel=S.proj.cabinets.length-1;__dbk.save();})()" % (self.g, json.dumps(key)))
        self.render()

    def place(self, topic, step=None):
        if self.kind == "new":
            key = None
            if topic.startswith("joints:"):   # connectors have one place: the topic "Jungtys", with this joint picked
                topic, key = topic.split(":")
            js(self.c, "__nv.NV.topic=%s;__nv.NV.secSel=null;__nv.NV3.jSel=%s" % (json.dumps(topic), "null" if key is None else
               "{key:%s,side:'L',seam:(function(){var k=-1;(__nv.info()[__nv.S.sel].r.seams||[]).some(function(s,i){if(s.key===%s){k=i;return true}return false});return k})(),idx:null}" % (json.dumps(key), json.dumps(key))))
        else:
            js(self.c, "__dbk.S.stepKey=%s" % json.dumps(step))
        self.render()

    def cab(self, expr="c"):
        """A value of the open cabinet, e.g. cab('c.cnc.legs')."""
        return json.loads(js(self.c, "(function(){var S=%s.S,c=S.proj.cabinets[S.sel];var v=(%s);return JSON.stringify(v===undefined?null:v)})()" % (self.g, expr)))

    def set(self, bind, v):
        """Set a binding the way a person would: its segmented button, its tick box, or typing into its field."""
        how = js(self.c, """(function(bind,v){
          var q=function(s){return [].slice.call(document.querySelectorAll(s))};
          q('[data-tk]').forEach(function(e){e.removeAttribute('data-tk')});
          var e=q('[data-act="set"]').filter(function(e){return e.getAttribute('data-bind')===bind&&e.getAttribute('data-v')===String(v)})[0],how='click';
          if(!e){e=q('input,select,textarea').filter(function(e){return e.getAttribute('data-bind')===bind})[0];if(!e)return null;
            how=e.type==='checkbox'?(e.checked===(v===true)?'same':'click'):'type';}
          for(var d=e.closest('details');d;d=d.parentElement&&d.parentElement.closest('details'))d.open=true;
          if(e.disabled)return 'disabled';e.setAttribute('data-tk','1');return how})(%s,%s)""" % (json.dumps(bind), json.dumps(v)))
        if how is None or how == "disabled":
            raise RuntimeError("%s: no control for %s = %r (%s)" % (self.kind, bind, v, how))
        if how == "click":
            self.c.click("[data-tk]")
        elif how == "type":
            self.c.type("[data-tk]", v)
        js(self.c, "[].forEach.call(document.querySelectorAll('[data-tk]'),function(e){e.removeAttribute('data-tk')})")
        time.sleep(0.12)

    def act(self, a, v=None, i=None):
        s = "[data-act=%s]" % a + ("[data-v=%s]" % json.dumps(str(v)) if v is not None else "") + ("[data-i=%s]" % json.dumps(str(i)) if i is not None else "")
        js(self.c, "(function(){var e=document.querySelector(%s);for(var d=e&&e.closest('details');d;d=d.parentElement&&d.parentElement.closest('details'))d.open=true})()" % json.dumps(s))
        self.c.click(s)
        time.sleep(0.12)

    def state(self):
        """The open cabinet and what the engine makes of it, without ids — comparable between the two apps."""
        return json.loads(js(self.c, """(function(){var S=%s.S,c=JSON.parse(JSON.stringify(S.proj.cabinets[S.sel]));
          (function strip(o){if(o&&typeof o==='object'){delete o.id;Object.keys(o).forEach(function(k){strip(o[k])})}})(c);
          var inf=S._info[S.sel];
          return JSON.stringify({cab:c,panels:inf.r.panels.map(function(p){return [p.role,p.L,p.W,p.T,(p.holes||[]).length,JSON.stringify(p.eb||null),p.mat]}),
            joints:(inf.r.joints||[]).map(function(j){return [j.key,j.type,(j.pos||[]).length]}),warnings:inf.warnings,nProg:inf.nProg})})()""" % self.g))


DUPS = """(function(){var ids={},b={},d=[];
  [].forEach.call(document.querySelectorAll('[id]'),function(e){if(ids[e.id])d.push('#'+e.id);ids[e.id]=1});
  [].forEach.call(document.querySelectorAll('input[data-bind],select[data-bind],textarea[data-bind]'),function(e){var k=e.getAttribute('data-bind');if(b[k])d.push(k);b[k]=1});
  return JSON.stringify(d)})()"""
TOPICS = "JSON.stringify(__nv.topics().filter(function(t){return %s.test(t.key)&&(!t.applies||t.applies(__nv.cur()))}).map(function(t){return t.key}))" % MINE
SNAP = """(function(){var S=__nv.S,p=JSON.parse(JSON.stringify(S.proj));delete p.updated;
  return JSON.stringify([p,S._info.map(function(x){return [x.r.panels,x.warnings,x.nProg]})])})()"""


def page_ok(a, where):
    c = a.c
    ok(js(c, "!!document.querySelector('.nvt')"), where + ": the topic is on the page")
    ok(not js(c, "!!document.querySelector('.nv-crash')"), where + ": the view did not crash")
    d = json.loads(js(c, DUPS))
    d = [x for x in d if not x.startswith('#fr')]   # the front pictures (cabinet strip + the big one) repeat their gradient ids — the same definitions, harmless
    ok(not d, where + ": nothing twice on the page" + (" — " + ", ".join(d) if d else ""))
    e = errors(c)
    ok(not e, where + ": no page errors" + (" — " + " | ".join(e)[:400] if e else ""))


def walk(a, name, expect):
    ts = json.loads(js(a.c, TOPICS))
    ok(ts == expect, "%s: topics %s (expected %s)" % (name, ts, expect))
    for k in ts:
        for lang in ("lt", "en"):
            js(a.c, "__nv.S.lang=%s" % json.dumps(lang))
            for view in ("front", "3d"):
                js(a.c, "__nv.NV.view=%s" % json.dumps(view))
                a.place(k)
                page_ok(a, "%s / %s (%s, %s)" % (name, k, lang, view))
    js(a.c, "__nv.S.lang='lt';__nv.NV.view='front'")


NORMAL = ["body", "joints", "mats", "addons", "cnc", "review"]
BOX = ["bx-dims", "bx-boards", "bx-inner", "bx-fronts", "joints", "mats", "addons", "review"]


# ---------------------------------------------------------------- 1. walk
def test_walk(a):
    print("1. walk")
    a.open_example()
    before = js(a.c, SNAP)
    for i in range(3):
        a.sel(i)
        walk(a, "example %d" % (i + 1), NORMAL)
    ok(js(a.c, SNAP) == before, "walking the topics changes neither the project nor the engine's output")
    for key, expect in (("pTall", NORMAL), ("pFridge", NORMAL), ("pDish", ["mats", "addons", "review"]), ("pPanel", ["panel", "review"]), ("pBox", BOX)):
        a.add_preset(key)
        snap = js(a.c, SNAP)
        walk(a, key, expect)
        ok(js(a.c, SNAP) == snap, key + ": walking changes nothing")
        kind = js(a.c, "typeof __nv.cur === 'function' && document.querySelector('.nvt') ? 1 : 0")
        ok(kind == 1, key + ": still on a topic")


# ---------------------------------------------------------------- 2. controls
def txt(a, sel):
    return js(a.c, "(function(){var e=document.querySelector(%s);return e?e.textContent:null})()" % json.dumps(sel))


def has(a, sel):
    return bool(js(a.c, "!!document.querySelector(%s)" % json.dumps(sel)))


def is_open(a, key):
    return bool(js(a.c, "(function(){var e=document.querySelector('[data-nvt-adv=%s]');return !!(e&&e.open)})()" % key))


def test_body(a):
    print("2. controls — Korpusas")
    a.open_example(); a.sel(1); a.place("body")
    ok("100 mm" in (txt(a, ".nvt-sum") or ""), "summary names the legs: " + str(txt(a, ".nvt-sum")))
    a.set("c.cnc.support", "feet"); ok(a.cab("[c.cnc.legs,c.cnc.feet]") == [True, True], "supports: feet")
    ok(not has(a, '[data-bind="c.legH"]'), "feet: no leg height")
    a.set("c.cnc.support", "none"); ok(a.cab("c.cnc.legs") is False, "supports: none"); ok(not has(a, ".nvt-legplan"), "no supports: no plan")
    a.set("c.cnc.support", "legs"); ok(a.cab("[c.cnc.legs,c.cnc.feet]") == [True, False], "supports: legs")
    a.set("c.cnc.legsX", "3"); ok(str(a.cab("c.cnc.legsX")) == "3", "legs in a row: 3")
    ok("6" in (txt(a, ".nvt-legplan figcaption") or ""), "plan counts 6 legs: " + str(txt(a, ".nvt-legplan figcaption")))
    a.set("c.cnc.legsY", "3"); ok(str(a.cab("c.cnc.legsY")) == "3", "rows: 3")
    a.c.type('[data-bind="c.legH"]', "120", commit=False)   # typing only: the live regions must follow without a render
    ok(a.cab("c.legH") in (120, "120"), "leg height typed"); ok("120 mm" in (txt(a, ".nvt-sum") or ""), "summary follows the typing")
    a.set("c.legH", "120")
    a.act("plinth", "on"); ok(a.cab("c.extras.length") == 1 and a.cab("c.extras[0].kind") == "plinth", "plinth on")
    ok("okolis" in (txt(a, ".nvt-sum") or ""), "summary names the plinth")
    a.set("c.extras.0.W", "90"); ok(a.cab("c.extras[0].W") == 90, "plinth height")
    a.set("c.extras.0.mat", "Cokolio plokštė"); ok(a.cab("c.extras[0].mat") == "Cokolio plokštė", "plinth material")
    ok(not is_open(a, "plinth"), "plinth 'more' closed at defaults")
    a.set("c.extras.0.qty", "2"); ok(a.cab("c.extras[0].qty") == 2, "plinth quantity"); ok(is_open(a, "plinth"), "plinth 'more' stays open once changed")
    a.set("c.extras.0.e2", True); ok(a.cab("c.extras[0].e2") is True, "plinth edge L2")
    a.set("c.cnc.bottom", "inside"); ok(a.cab("c.cnc.bottom") == "inside", "bottom between the sides")
    a.set("c.cnc.bottomZ", "40"); ok(a.cab("c.cnc.bottomZ") == 40, "bottom lifted")
    ok(has(a, "[data-act=plinthpos]"), "lifted bottom: plinth position offered")
    a.act("plinthpos", "under"); ok(a.cab("c.extras[0].between") is False, "plinth under the carcass")
    ok(not is_open(a, "bottom"), "bottom 'more' closed")
    a.set("c.cnc.bottomD", "500"); ok(a.cab("c.cnc.bottomD") == 500, "shorter bottom")
    ok("60" in (txt(a, '[data-live="nvtbotd"]') or ""), "free space at the back shown: " + str(txt(a, '[data-live="nvtbotd"]')))
    a.render(); ok(is_open(a, "bottom"), "bottom 'more' opens when set")
    a.set("c.cnc.top", "full"); ok(a.cab("[c.cnc.top,c.cnc.topMount]") == ["full", "inside"], "full top starts between the sides")
    ok(not has(a, '[data-bind="c.cnc.rails.front"]'), "full top: no rails")
    a.set("c.cnc.topMount", "over"); ok(a.cab("c.cnc.topMount") == "over", "top on the sides")
    a.set("c.cnc.topOverFacade", True); ok(a.cab("c.cnc.topOverFacade") is True, "top covers the fronts")
    ok(not is_open(a, "topov"), "overhangs closed at 0")
    a.set("c.cnc.topOvF", "2"); ok(a.cab("c.cnc.topOvF") == 2, "overhang"); ok(is_open(a, "topov"), "overhangs open when set")
    a.set("c.cnc.top", "rails"); ok(a.cab("c.cnc.top") == "rails", "rails")
    a.set("c.cnc.rails.front", "v"); a.set("c.cnc.rails.back", "hv"); a.set("c.cnc.rails.bottom", True); a.set("c.cnc.railW", "90")
    ok(a.cab("[c.cnc.rails.front,c.cnc.rails.back,c.cnc.rails.bottom,c.cnc.railW]") == ["v", "hv", True, 90], "rails editor")
    a.set("c.cnc.backs.0", "solid"); ok(a.cab("c.cnc.backs[0]") == "solid", "solid back")
    a.set("c.cnc.backMount", "inside"); ok(a.cab("c.cnc.backMount") == "inside", "back inside")
    a.set("c.cnc.backInset", "12"); ok(a.cab("c.cnc.backInset") == 12, "back inset")
    a.c.type("#f-bk-front", "500"); time.sleep(0.15)
    ok(a.cab("c.cnc.backInset") == a.cab("Math.round((+document.querySelector('#f-bk-front').getAttribute('data-bkfront')-500)*10)/10"), "back's front face → inset")
    ok(not has(a, "[data-bind='c.cnc.backJoint'], [data-bind='c.cnc.joinery'], [data-act=camside]"), "Korpusas edits no connectors")
    a.place("joints:back"); a.set("c.cnc.backJoint", "cam"); ok(a.cab("(c.cnc.joints.back||{}).type") == "cam", "back fixed with cams — in Jungtys")
    a.act("camside", "back"); ok(a.cab("c.cnc.camOut.back") is True, "cams on the other face — \"Pakeisti puses\" in Jungtys")
    a.place("body")
    a.set("c.vis.L", True); ok(a.cab("c.vis.L") is True, "visible left side")
    a.set("c.cnc.sideFull", True); ok(a.cab("[c.cnc.bottom,c.cnc.bottomZ]") == ["inside", 0], "full-height sides")
    a.place("joints"); a.set("c.cnc.joinery", "cam"); ok(a.cab("c.cnc.joinery") == "cam", "joinery: cams — in Jungtys")
    a.place("body"); ok("kscentrikai" in (txt(a, ".nvt-sum") or ""), "Korpusas' summary names the joinery")
    page_ok(a, "Korpusas after the changes")
    a.sel(2); a.place("body")   # the wall cabinet
    ok(not has(a, "[data-act=plinth]"), "wall cabinet: no plinth"); ok(has(a, '[data-bind="c.vis.B"]'), "wall cabinet: visible bottom")
    page_ok(a, "Korpusas of the wall cabinet")


def test_mats(a):
    print("2. controls — Medžiagos")
    a.open_example(); a.sel(0); a.place("mats")
    ok(has(a, '[data-bind="c.mat.carc"][required]') and has(a, '[data-bind="c.mat.facade"][required]'), "carcass and fronts required")
    ok(has(a, '#f-c-mat-carc[list="dl-mat"]') and has(a, '#f-c-edge-carc[list="dl-edge"]'), "suggestion lists")
    a.c.type("#f-c-mat-carc", "", commit=False)
    ok(a.cab("c.mat.carc") == "" and js(a.c, "document.querySelector('#f-c-mat-carc').matches(':invalid')"), "an empty required material is marked at once")
    a.set("c.mat.carc", "LMDP pilka 18"); ok(a.cab("c.mat.carc") == "LMDP pilka 18", "carcass material")
    a.set("c.mat.back", "HDF balta 3"); a.set("c.edge.carc", "ABS pilka 1"); a.set("c.edge.facade", "ABS juoda 1")
    ok(a.cab("[c.mat.back,c.edge.carc,c.edge.facade]") == ["HDF balta 3", "ABS pilka 1", "ABS juoda 1"], "back and edges")
    ok(not has(a, '[data-bind="c.mat.top"]'), "rails: no top material")
    js(a.c, "__nv.cur().cnc.top='full';__dbk.save()"); a.render(); ok(has(a, '[data-bind="c.mat.top"]'), "full top: top material")
    a.set("c.mat.top", "LMDP ąžuolas 18"); ok(a.cab("c.mat.top") == "LMDP ąžuolas 18", "top material")
    js(a.c, "__nv.NV.view='front'"); a.render()
    ok(has(a, '[data-nv=view][data-v="3d"]') and not has(a, ".matdock"), "front view: a hint instead of the drag dock")
    a.c.click('[data-nv=view][data-v="3d"]'); time.sleep(0.2)
    ok(js(a.c, "__nv.NV.view") == "3d" and has(a, ".matdock .mdchip"), "3-D view: the drag dock")
    ok(not is_open(a, "look"), "look closed")
    js(a.c, "document.querySelector('[data-nvt-adv=look] > summary').click()"); a.render(); ok(is_open(a, "look"), "look stays open over a render")
    ok(has(a, ".nvt .look [data-act-change=lookcol]"), "look rows")
    page_ok(a, "Medžiagos after the changes")


def test_addons(a):
    print("2. controls — Priedai")
    a.open_example(); a.sel(0); a.place("addons")
    a.set("c.worktop.on", "true"); ok(a.cab("c.worktop.on") is True, "worktop on")
    ok(has(a, "#f-c-worktop-mat[required]"), "worktop material required")
    ok("600" in (txt(a, '[data-live="nvtwt"]') or ""), "worktop size shown: " + str(txt(a, '[data-live="nvtwt"]')))
    a.c.type('[data-bind="c.worktop.left"]', "25", commit=False)
    ok("625" in (txt(a, '[data-live="nvtwt"]') or ""), "worktop size follows the typing: " + str(txt(a, '[data-live="nvtwt"]')))
    a.set("c.worktop.left", "25"); a.set("c.worktop.mat", "Ąžuolas 38"); a.set("c.worktop.T", "40"); a.set("c.worktop.over", "30"); a.set("c.worktop.right", "5"); a.set("c.worktop.edge", "ABS ąžuolas 2")
    ok(a.cab("[c.worktop.mat,c.worktop.T,c.worktop.over,c.worktop.left,c.worktop.right,c.worktop.edge]") == ["Ąžuolas 38", 40, 30, 25, 5, "ABS ąžuolas 2"], "worktop fields")
    a.act("ledadd", "top"); a.act("ledadd", "L"); ok(a.cab("c.leds.map(function(l){return l.at})") == ["top", "L"], "two LED grooves")
    a.set("c.leds.0.at", "bottom"); a.set("c.leds.0.side", "out"); a.set("c.leds.0.from", "45"); a.set("c.leds.0.ends", "closed")
    ok(a.cab("[c.leds[0].at,c.leds[0].side,c.leds[0].from,c.leds[0].ends]") == ["bottom", "out", 45, "closed"], "LED fields")
    a.act("leddel", i=1); ok(a.cab("c.leds.length") == 1, "LED removed")
    a.act("addx", "part"); ok(a.cab("c.extras.length") == 1, "extra part added")
    a.set("c.extras.0.name", "Apdaila"); a.set("c.extras.0.L", "700"); a.set("c.extras.0.W", "120"); a.set("c.extras.0.T", "16"); a.set("c.extras.0.qty", "2"); a.set("c.extras.0.mat", "LMDP juoda 16"); a.set("c.extras.0.e3", True)
    ok(a.cab("(function(x){return [x.name,x.L,x.W,x.T,x.qty,x.mat,x.e3]})(c.extras[0])") == ["Apdaila", 700, 120, 16, 2, "LMDP juoda 16", True], "extra part fields")
    a.act("addx", "side"); ok(a.cab("c.extras[1].kind") == "side", "side panel added")
    a.set("c.extras.1.side", "R"); a.set("c.extras.1.zb", "-50"); a.set("c.extras.1.yf", "20")
    ok(a.cab("[c.extras[1].side,c.extras[1].zb,c.extras[1].yf]") == ["R", -50, 20], "side panel fields")
    a.act("addx", "plinth"); ok(a.cab("c.extras[2].kind") == "plinth", "plinth added")
    ok(has(a, ".nvt-x-link [data-nv=go][data-topic=body]") and not has(a, '[data-bind="c.extras.2.W"]'), "the plinth is a link to Korpusas, not a second set of fields")
    ok(not has(a, "[data-act=addx][data-v=plinth]"), "no second plinth button while Korpusas has one")
    ok(not is_open(a, "plfit"), "plinth fit closed")
    a.act("plfit", "2"); ok(a.cab("[c.extras[2].gl,c.extras[2].gr,c.extras[2].gt,c.extras[2].gb]") == [1, 1, 4, 0], "plinth fitted by gaps"); ok(is_open(a, "plfit"), "plinth fit open once fitted")
    a.set("c.extras.2.gl", "2"); ok(a.cab("c.extras[2].gl") == 2, "plinth gap typed")
    page_ok(a, "Priedai after the changes")
    a.c.click(".nvt-x-link [data-nv=go]"); time.sleep(0.3)
    ok(js(a.c, "__nv.NV.topic") == "body" and has(a, '[data-bind="c.extras.2.W"]'), "the link lands on the plinth in Korpusas")
    page_ok(a, "Korpusas with the plinth")
    a.place("addons"); a.act("rmx", i=0); ok(a.cab("c.extras.length") == 2 and a.cab("c.extras[0].kind") == "side", "extra part removed")
    a.sel(2); a.place("addons")   # the wall cabinet: no worktop offered
    ok(not has(a, '[data-bind="c.worktop.on"]'), "wall cabinet: no worktop"); ok(has(a, "[data-act=addx][data-v=plinth]"), "wall cabinet: a plinth only as an extra part")
    a.act("addx", "plinth"); ok(has(a, '[data-bind="c.extras.0.W"]') and has(a, '[data-bind="c.extras.0.yf"]'), "wall cabinet: the plinth is an ordinary row here")
    page_ok(a, "Priedai of the wall cabinet")


def test_cnc(a):
    print("2. controls — Gręžimas")
    a.open_example(); a.sel(1); a.place("cnc")   # drawers + doors + shelf
    ok(js(a.c, "document.querySelectorAll('.nvt-op').length") == 4, "four operations apply to the sink cabinet")
    ok(not has(a, '[data-bind="c.cnc.legs"]'), "legs are not here")
    a.set("c.cnc.runnerMarks", False); ok(a.cab("c.cnc.runnerMarks") is False, "runner marks off")
    a.set("c.cnc.tbOn", False); ok(a.cab("c.cnc.tbFront") == "off", "TANDEMBOX off"); ok(not has(a, '[data-bind="c.cnc.tbFront"]'), "its option hides")
    a.set("c.cnc.tbOn", True); ok(a.cab("c.cnc.tbFront") == "mark", "TANDEMBOX on again")
    a.set("c.cnc.tbFront", "hole"); ok(a.cab("c.cnc.tbFront") == "hole", "TANDEMBOX holes")
    a.set("c.cnc.hinges", False); ok(a.cab("c.cnc.hinges") is False, "hinges off"); a.set("c.cnc.hinges", True)
    a.set("c.cnc.hingeFix", "press"); ok(a.cab("c.cnc.hingeFix") == "press", "press-in hinges")
    a.set("c.cnc.pinsOn", False); ok(a.cab("c.cnc.pins") == "off", "shelf pins off"); a.set("c.cnc.pinsOn", True)
    a.set("c.cnc.pins", "row"); ok(a.cab("c.cnc.pins") == "row", "pin rows")
    page_ok(a, "Gręžimas after the changes")
    a.sel(0); a.place("cnc")   # drawers only
    ok(js(a.c, "[].map.call(document.querySelectorAll('.nvt-op input'),function(e){return e.getAttribute('data-bind')}).join()") == "c.cnc.runnerMarks,c.cnc.tbOn", "drawer cabinet: only the drawer operations")
    js(a.c, "__nv.cur().sections=[];__dbk.save()"); a.render()
    ok(has(a, ".nvt-nothing") and not has(a, ".nvt-op"), "nothing applies: one line says so")
    a.c.click(".nvt-foot [data-nv=go]"); time.sleep(0.3); ok(js(a.c, "__nv.NV.topic") == "body", "the legs link leads to Korpusas")


def test_review(a):
    print("2. controls — Patikra")
    a.open_example(); a.sel(1); a.place("review")
    n = json.loads(js(a.c, "JSON.stringify(__nv.counts(__nv.issues().filter(function(x){return x.cab===1})))"))
    ok(js(a.c, "document.querySelectorAll('.nvt-review .nv-issue.warn').length") == n["warn"], "every warning of the cabinet is listed (%d)" % n["warn"])
    ok(js(a.c, "document.querySelectorAll('.nvt-review .nv-issue.error').length") == n["error"], "every error of the cabinet is listed (%d)" % n["error"])
    ok(has(a, "#nvt-cf-jc.todo") and has(a, "#nvt-cf-ec.todo"), "both confirmations open"); ok(not has(a, ".nvt-ready"), "not ready yet")
    a.c.click("#nvt-cf-jc [data-act=jcopen]"); time.sleep(0.4); ok(js(a.c, "__nv.NV.topic") == "joints" and not js(a.c, "__nv.S.jcheck") and has(a, "[data-nv=nvjOk]"), "the joints review leads to the topic Jungtys")
    a.c.click("[data-nv=nvjOk]"); time.sleep(0.4); a.place("review"); ok(bool(a.cab("c.jointsOk")) and has(a, "#nvt-cf-jc.ok"), "joints confirmed in Jungtys")
    a.c.click("#nvt-cf-ec [data-act=ecopen]"); time.sleep(0.4); ok(js(a.c, "__nv.S.echeck") is True and has(a, "[data-act=ecok]"), "the edges check opens")
    a.c.click("[data-act=ecok]"); time.sleep(0.4); ok(bool(a.cab("c.edgesOk")) and has(a, "#nvt-cf-ec.ok"), "edges confirmed")
    n = json.loads(js(a.c, "JSON.stringify(__nv.counts(__nv.issues().filter(function(x){return x.cab===1})))"))
    ok(has(a, ".nvt-ready") == (n["error"] + n["todo"] + n["warn"] == 0), "'ready' only when nothing is open")
    ok(js(a.c, "document.querySelectorAll('.nvt-stats > div').length") == 3, "counts shown")
    a.place("joints"); a.set("c.cnc.joinery", "cam"); a.place("review")
    ok(has(a, "#nvt-cf-jc.todo") and "po patvirtinimo" in (txt(a, "#nvt-cf-jc") or ""), "a change after the confirmation asks for it again")
    page_ok(a, "Patikra")
    # a cabinet with nothing open is calmly green (materials set, both confirmed, engine notes only)
    a.sel(0); a.place("review")
    a.place("joints"); a.c.click("[data-nv=nvjOk]"); time.sleep(0.3); a.place("review")
    a.c.click("#nvt-cf-ec [data-act=ecopen]"); time.sleep(0.3); a.c.click("[data-act=ecok]"); time.sleep(0.3)
    n = json.loads(js(a.c, "JSON.stringify(__nv.counts(__nv.issues().filter(function(x){return x.cab===0})))"))
    ok(has(a, ".nvt-ready") == (n["error"] + n["todo"] + n["warn"] == 0), "example 1: 'ready' matches the issue list")
    page_ok(a, "Patikra, confirmed")


def test_kinds(a):
    print("2. controls — dishwasher, panel, 3-D construction")
    a.open_example()
    a.add_preset("pDish"); a.place("mats")
    ok(not has(a, '[data-bind="c.mat.back"]') and not has(a, '#f-c-mat-carc[required]') and has(a, '#f-c-mat-facade[required]'), "dishwasher: fronts required, carcass optional, no back")
    a.set("c.mat.facade", "MDF dažytas 19"); ok(a.cab("c.mat.facade") == "MDF dažytas 19", "dishwasher front material")
    a.place("addons"); ok(has(a, '[data-bind="c.worktop.on"]') and not has(a, "[data-act=addx]") and not has(a, "[data-act=ledadd]"), "dishwasher: only the worktop")
    a.set("c.worktop.on", "false"); ok(a.cab("c.worktop.on") is False, "dishwasher worktop off"); a.set("c.worktop.on", "true"); ok(a.cab("c.worktop.on") is True, "dishwasher worktop on")
    a.place("review"); ok(not has(a, "#nvt-cf-jc") and has(a, "#nvt-cf-ec"), "dishwasher: only the edges to confirm")
    a.add_preset("pPanel"); a.place("panel")
    a.set("c.name", "Šoninė"); a.set("c.W", "19"); a.set("c.H", "2200"); a.set("c.D", "580"); a.set("c.mat.carc", "LMDP riešutas 19"); a.set("c.edge.carc", "ABS riešutas 1"); a.set("c.pe.e2", False)
    ok(a.cab("[c.name,c.W,c.H,c.D,c.mat.carc,c.edge.carc,c.pe.e2]") == ["Šoninė", 19, 2200, 580, "LMDP riešutas 19", "ABS riešutas 1", False], "panel fields")
    ok(has(a, "[data-act=libsave]") and has(a, "[data-act=dup]") and has(a, "[data-act=del]"), "panel: its actions")
    n0 = js(a.c, "__nv.S.proj.cabinets.length"); a.act("dup"); ok(js(a.c, "__nv.S.proj.cabinets.length") == n0 + 1, "panel copied")
    a.act("del"); ok(has(a, "[data-act=del]") and js(a.c, "__nv.S.confirm") == "del", "delete asks first"); a.act("del"); ok(js(a.c, "__nv.S.proj.cabinets.length") == n0, "panel copy deleted")
    a.place("review"); ok(not has(a, "#nvt-cf-jc") and has(a, "#nvt-cf-ec"), "panel: only the edges to confirm")
    a.add_preset("pBox"); a.place("bx-dims")
    a.set("c.name", "Dėžė"); a.set("c.W", "800"); a.set("c.thick", "19"); ok(a.cab("[c.name,c.W,c.thick]") == ["Dėžė", 800, 19], "construction size")
    js(a.c, "__nv.NV.view='front'"); a.render(); a.c.click("[data-nv=nvtbox3d]"); time.sleep(0.4); ok(js(a.c, "__nv.NV.view") == "3d", "'place in the model' shows the 3-D picture")
    a.place("bx-boards"); a.set("c.box.boards.back.on", False); ok(a.cab("c.box.boards.back.on") is False, "back board off")
    a.set("c.box.boards.back.on", True); a.set("c.box.boards.top.inset", "10"); ok(a.cab("c.box.boards.top.inset") == 10, "board inset")
    cv = js(a.c, "(function(){var b=document.querySelector('[data-act=boxcover]:not(.on)');return b?b.getAttribute('data-v')+'|'+b.getAttribute('data-w'):null})()")
    if ok(bool(cv), "corners listed"):
        k, w = cv.split("|"); a.c.click("[data-act=boxcover][data-v=%s][data-w=%s]" % (json.dumps(k), json.dumps(w))); time.sleep(0.2)
        ok(a.cab("c.box.cover[%s]" % json.dumps(k)) == w, "corner cover switched")
    a.place("bx-inner"); a.act("boxadd", "shelf"); a.act("boxadd", "part"); ok(a.cab("c.box.inner.map(function(q){return q.kind})") == ["shelf", "part"], "shelf and partition added")
    a.set("c.box.inner.0.z", "300"); a.set("c.box.inner.0.adj", "true"); ok(a.cab("[c.box.inner[0].z,c.box.inner[0].adj]") == [300, True], "shelf fields")
    ok(has(a, '[data-bind="c.box.pinRow"]') and has(a, 'input[data-bind="c.shelfSb"]'), "adjustable shelf: pin rows and the shelf setback")
    a.set("c.box.pinRow", True); ok(a.cab("c.box.pinRow") is True, "pin rows")
    a.act("boxrm", i=1); ok(a.cab("c.box.inner.length") == 1, "partition removed")
    a.place("bx-fronts"); a.act("boxfadd", "doors"); ok(a.cab("c.box.fronts.length") == 1 and a.cab("c.box.fronts[0].kind") == "doors", "doors added")
    a.set("c.box.fronts.0.inset", "true"); a.set("c.box.fronts.0.nDoors", "2"); ok(a.cab("[c.box.fronts[0].inset,c.box.fronts[0].nDoors]") == [True, 2], "door fields")
    a.place("joints"); a.set("c.cnc.joinery", "cam"); ok(a.cab("c.cnc.joinery") == "cam", "construction joinery")
    jk = js(a.c, "(function(){var b=document.querySelector('.nvj-li');return b?b.getAttribute('data-v').split(':')[2]:null})()")
    if ok(bool(jk) and js(a.c, "document.querySelectorAll('.nvj-li').length") >= 4, "joint rows listed"):
        a.c.click(".nvj-li"); time.sleep(0.3); a.c.click("#nvj-card [data-v='j:type:dowel']"); time.sleep(0.3)
        ok(a.cab("(c.cnc.joints[%s]||{}).type" % json.dumps(jk)) == "dowel", "one joint changed to dowels")
    a.place("mats"); ok(has(a, '#f-c-mat-facade[required]') and not has(a, '[data-bind="c.mat.top"]'), "construction with doors: fronts required")
    a.place("addons"); ok(has(a, '[data-bind="c.worktop.on"]') and has(a, "[data-act=addx]") and not has(a, "[data-act=ledadd]"), "construction: worktop and extra parts")
    a.act("addx", "plinth"); ok(has(a, '[data-bind="c.extras.0.W"]'), "construction: the plinth is an ordinary row")
    a.place("review"); ok(has(a, "#nvt-cf-jc") and has(a, "#nvt-cf-ec"), "construction: both confirmations")
    page_ok(a, "kinds")


# ---------------------------------------------------------------- 3. the same clicks in the live app
STEPS = [   # (topic in the new interface, step of the live editor, verb, args)
    ("body", "build", "set", ("c.cnc.support", "feet")), ("body", "ops", "set", ("c.cnc.legsY", "3")), ("body", "build", "set", ("c.cnc.support", "legs")),
    ("body", "ops", "set", ("c.cnc.legsX", "3")), ("body", "ops", "set", ("c.legH", "120")),
    ("body", "build", "act", ("plinth", "on")), ("body", "build", "set", ("c.extras.0.W", "90")), ("body", "build", "set", ("c.extras.0.T", "16")),
    ("body", "build", "set", ("c.cnc.bottom", "inside")), ("body", "build", "set", ("c.cnc.bottomZ", "40")), ("body", "build", "act", ("plinthpos", "under")),
    ("body", "build", "set", ("c.extras.0.yf", "35")), ("body", "build", "set", ("c.cnc.bottomD", "500")),
    ("body", "build", "set", ("c.cnc.top", "full")), ("body", "build", "set", ("c.cnc.topMount", "over")), ("body", "build", "set", ("c.cnc.topOverFacade", True)),
    ("body", "build", "set", ("c.cnc.topOvF", "2")), ("body", "build", "set", ("c.cnc.topOvS", "1")),
    ("body", "build", "set", ("c.cnc.backs.0", "solid")), ("body", "build", "set", ("c.cnc.backMount", "inside")), ("joints:back", "build", "set", ("c.cnc.backJoint", "cam")),
    ("body", "build", "set", ("c.cnc.backInset", "12")), ("joints:back", "build", "act", ("camside", "back")), ("body", "build", "set", ("c.cnc.backCover.bottom", "true")),
    ("body", "build", "set", ("c.vis.L", True)), ("joints", "build", "set", ("c.cnc.joinery", "cam")), ("joints:bottom", "build", "act", ("camside", "bottom")),
    ("body", "build", "set", ("c.cnc.topMount", "inside")), ("body", "build", "set", ("c.cnc.top", "rails")), ("body", "build", "set", ("c.cnc.rails.front", "v")),
    ("body", "build", "set", ("c.cnc.rails.back", "hv")), ("body", "build", "set", ("c.cnc.rails.bottom", True)), ("body", "build", "set", ("c.cnc.railW", "90")),
    ("mats", "mats", "set", ("c.mat.carc", "LMDP pilka 18")), ("mats", "mats", "set", ("c.mat.back", "LMDP pilka 18")), ("mats", "mats", "set", ("c.edge.facade", "ABS juoda 1")),
    ("addons", "build", "set", ("c.worktop.on", "true")), ("addons", "build", "set", ("c.worktop.mat", "Ąžuolas 38")), ("addons", "build", "set", ("c.worktop.T", "40")),
    ("addons", "build", "set", ("c.worktop.over", "25")), ("addons", "build", "set", ("c.worktop.left", "10")),
    ("addons", "ops", "act", ("ledadd", "bottom")), ("addons", "ops", "set", ("c.leds.0.side", "out")), ("addons", "ops", "set", ("c.leds.0.from", "45")),
    ("addons", "ops", "set", ("c.leds.0.ends", "closed")), ("addons", "ops", "act", ("ledadd", "L")), ("addons", "ops", "act", ("leddel", None, 1)),
    ("addons", "extra", "act", ("addx", "part")), ("addons", "extra", "set", ("c.extras.1.L", "700")), ("addons", "extra", "set", ("c.extras.1.e2", True)),
    ("addons", "extra", "set", ("c.extras.1.qty", "2")), ("addons", "extra", "act", ("addx", "side")), ("addons", "extra", "set", ("c.extras.2.side", "R")),
    ("addons", "extra", "set", ("c.extras.2.zb", "-40")), ("addons", "extra", "act", ("plfit", "0")), ("addons", "extra", "set", ("c.extras.0.gl", "2")),
    ("addons", "extra", "act", ("rmx", None, 1)),
    ("cnc", "ops", "set", ("c.cnc.runnerMarks", False)), ("cnc", "ops", "set", ("c.cnc.tbOn", False)), ("cnc", "ops", "set", ("c.cnc.tbOn", True)),
    ("cnc", "ops", "set", ("c.cnc.tbFront", "hole")), ("cnc", "ops", "set", ("c.cnc.hingeFix", "press")), ("cnc", "ops", "set", ("c.cnc.pinsOn", False)),
    ("cnc", "ops", "set", ("c.cnc.pinsOn", True)), ("cnc", "ops", "set", ("c.cnc.pins", "row")),
    ("body", "build", "set", ("c.cnc.sideFull", True)),
]


def run_steps(a, upto=None):
    a.open_example(); a.sel(1)
    out = [a.state()]
    for topic, step, verb, args in STEPS[:upto]:
        a.place(topic, step)
        if verb == "set":
            a.set(*args)
        else:
            a.act(*args)
        a.render()   # both apps end every step on a full render, so auto-fitted sizes are settled alike
        out.append(a.state())
    return out


def diff(x, y, path=""):
    if type(x) != type(y):
        return "%s: %r ≠ %r" % (path, x, y)
    if isinstance(x, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y:
                return "%s.%s: only in %s" % (path, k, "new" if k in x else "legacy")
            d = diff(x[k], y[k], path + "." + k)
            if d:
                return d
        return None
    if isinstance(x, list):
        if len(x) != len(y):
            return "%s: %d ≠ %d items" % (path, len(x), len(y))
        for i, (p, q) in enumerate(zip(x, y)):
            d = diff(p, q, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None if x == y else "%s: %r ≠ %r" % (path, x, y)


def test_legacy():
    print("3. the same clicks in the live app")
    try:
        import urllib.request
        urllib.request.urlopen(LEGACY, timeout=3).read(200)
    except Exception as e:
        print("  skipped — the legacy snapshot is not served at %s (%s)" % (LEGACY, e))
        return
    with Chrome() as c1, Chrome() as c2:
        new, old = run_steps(App(c1, "new")), run_steps(App(c2, "legacy"))
        ok(not errors(c1), "new interface: no page errors during the steps")
    ok(len(new) == len(old) == len(STEPS) + 1, "all %d steps ran in both" % len(STEPS))
    ok(diff(new[0], old[0]) is None, "both start from the same example cabinet: " + str(diff(new[0], old[0])))
    bad = 0
    for i, (n, o) in enumerate(zip(new[1:], old[1:])):
        d = diff(n, o)
        if d:
            bad += 1
            if bad <= 5:
                ok(False, "step %d %s %s: %s" % (i + 1, STEPS[i][2], STEPS[i][3], d[:300]))
    ok(bad == 0, "after every step the cabinet and the engine's output equal the live app's (%d of %d differ)" % (bad, len(STEPS)))


def main():
    only = sys.argv[1:]
    tests = [("walk", test_walk), ("body", test_body), ("mats", test_mats), ("addons", test_addons), ("cnc", test_cnc), ("review", test_review), ("kinds", test_kinds)]
    for name, f in tests:
        if only and name not in only:
            continue
        with Chrome() as c:
            try:
                f(App(c, "new"))
                e = errors(c)
                ok(not e, name + ": no page errors at the end" + (" — " + " | ".join(e)[:400] if e else ""))
            except Exception as ex:   # a missing control or a script error is a failure of that group, the rest still runs
                ok(False, "%s: stopped — %s" % (name, str(ex)[:400]))
    if not only or "legacy" in only:
        try:
            test_legacy()
        except Exception as ex:
            ok(False, "legacy: stopped — %s" % str(ex)[:400])
    # the phone: nothing of a topic may be wider than the screen
    if not only or "phone" in only:
        print("4. phone 390 × 844")
        with Chrome(mobile=True, width=390, height=844, dpr=2) as c:
            a = App(c, "new"); a.open_example()
            for i in range(3):
                a.sel(i)
                for k in json.loads(js(c, TOPICS)):
                    a.place(k)
                    w = js(c, "(function(){var m=0;[].forEach.call(document.querySelectorAll('.nvt, .nvt *'),function(e){var r=e.getBoundingClientRect();if(r.width&&r.right>m)m=r.right});return Math.round(m)})()")
                    ok(w <= 391, "phone: example %d / %s fits the screen (right edge %s)" % (i + 1, k, w))
            ok(not errors(c), "phone: no page errors")
    print("\n%d checks, %d failed" % (DONE[0], len(FAIL)))
    for f in FAIL:
        print("  - " + f)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
