#!/usr/bin/env python3
"""test/ui/editor_test.py — the cabinet workspace of src/ui/30-editor.js (strip, the picture, inspector frame, topics
Dydis and Vidus), driven in headless Chrome the way a person works.

    python3 test/ui/editor_test.py                                   # the private build  scratch/editor/index.html
    NV_URL=http://127.0.0.1:8765/ python3 test/ui/editor_test.py     # the integrated build

The road it walks
  1. start     new project by name → the cabinet chooser → a door cabinet → the workspace on topic Dydis
  2. size      typing the width: the picture, the strip and the header follow while typing, the field keeps the focus
  3. picture   "+" above the column → Stalčiai: the new section is selected; deselect; select it by clicking the picture
  4. section   count stepper, height / "takes the rest", an overfull column turns red on the bar and on the picture,
               move, another kind, remove
  5. columns   one partition, column width, "+" inside the empty column, the column switch
  6. frame     "Toliau →" walks every topic forward (first the ones with something open) and ends in the layout;
               "← Atgal"; an issue row's "Taisyti →" lands on its field
  7. cabinet   copy, two-click delete, the other kinds (dishwasher, panel, 3-D construction) render
  8. look      English, a phone-wide window without sideways scroll, no element id / bound field twice, no page errors
The dev server must be running (python3 tools/serve.py). Exit code 1 on any failure.
"""
import json, os, sys, time

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(R, "tools"))
from cdp import Chrome  # noqa: E402

URL = os.environ.get("NV_URL", "http://127.0.0.1:8765/scratch/editor/index.html")
SHOTS = os.environ.get("NV_SHOTS")   # a folder: screenshots of the main states are written there
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


def cab(c, expr="c"):
    """A value of the open cabinet, e.g. cab(c, 'c.sections.length')."""
    return json.loads(js(c, "(function(){var c=__nv.cur();var v=(%s);return JSON.stringify(v===undefined?null:v)})()" % expr))


def nv(c, expr):
    return json.loads(js(c, "(function(){var NV=__nv.NV,S=__nv.S;var v=(%s);return JSON.stringify(v===undefined?null:v)})()" % expr))


def errors(c):
    return [l for l in c.drain_logs() if "favicon" not in l and ("[pageerror]" in l or "[error]" in l)]


def shot(c, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        c.shot(os.path.join(SHOTS, name + ".png"))


def front(c):
    """The front picture (the 3-D view is the other one)."""
    if not js(c, "!!document.querySelector('.nve-pic')") and js(c, "!!document.getElementById('nve-view-front')"):
        c.click("#nve-view-front")
        c.wait("!!document.querySelector('.nve-pic')")


def add_via_picture(c, col, kind):
    """The "+" of a column on the picture, then a kind of its menu."""
    front(c)
    js(c, "(function(){var d=document.querySelectorAll('.nve-pic details.nve-add')[%d];d.querySelector('summary').setAttribute('data-tk','1')})()" % col)
    c.click("[data-tk]")
    ok(js(c, "document.querySelectorAll('.nve-pic details.nve-add[open]').length") == 1, "picture: one '+' menu is open (column %d)" % col)
    c.click(".nve-pic details.nve-add[open] [data-act=addsec][data-v=%s]" % kind)
    time.sleep(0.2)


DUPS = """(function(){var ids={},b={},d=[];
  [].forEach.call(document.querySelectorAll('[id]'),function(e){if(ids[e.id])d.push('#'+e.id);ids[e.id]=1});
  [].forEach.call(document.querySelectorAll('input[data-bind],select[data-bind],textarea[data-bind]'),function(e){var k=e.getAttribute('data-bind');if(b[k])d.push(k);b[k]=1});
  return JSON.stringify(d)})()"""


def page_ok(c, where):
    ok(js(c, "!!document.querySelector('.nve-ws')"), where + ": the workspace is on the page")
    ok(not js(c, "!!document.querySelector('.nv-crash')"), where + ": the view did not crash")
    d = [x for x in json.loads(js(c, DUPS)) if not x.startswith("#fr")]   # the front pictures (strip + the big one) repeat their gradient ids — the same definitions
    ok(not d, where + ": no id / binding twice on the page " + ", ".join(d[:6]))
    e = errors(c)
    ok(not e, where + ": no page errors " + " | ".join(e)[:400])


# what "Toliau →" must do, worked out apart from the page's own code
NEXT = """(function(){var NV=__nv.NV,S=__nv.S,c=__nv.cur(),ts=__nv.topics().filter(function(t){return !t.applies||t.applies(c)}).map(function(t){return t.key});
  var open=__nv.issues().filter(function(x){return x.cab===S.sel&&/^(error|todo|warn)$/.test(x.sev)}).map(function(x){return x.topic});
  var i=ts.indexOf(NV.topic),nx=null;for(var k=i+1;k<ts.length;k++)if(open.indexOf(ts[k])>=0){nx=ts[k];break}
  if(!nx&&i+1<ts.length)nx=ts[i+1];
  return JSON.stringify({ts:ts,at:NV.topic,next:nx})})()"""


def s_start(c):
    c.goto(URL)
    try:
        c.click_text("Dirbti be prisijungimo")
    except Exception:
        pass
    c.type("#np-name", "REDAKTORIAUS TESTAS", commit=False)
    c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home")
    ok(nv(c, "[S.proj.name,S.proj.cabinets.length,S.tab]") == ["REDAKTORIAUS TESTAS", 0, "cab"], "start: the project is created and opens on Spintelės")
    ok(not js(c, "!!document.querySelector('.nve-ws')") and js(c, "!!document.querySelector('[data-act=preset],[data-nv=nvhPreset]')"), "start: with no cabinets the chooser is shown, not the workspace")
    shot(c, "t01-chooser")
    c.click('[data-act=preset][data-i="1"],[data-nv=nvhPreset][data-i="1"]')   # Durų spintelė
    c.wait("__nv.S.proj.cabinets.length === 1 && !!document.querySelector('.nve-ws')")
    time.sleep(0.3)
    ok(nv(c, "[S.picking,NV.topic,S.sel]") == [False, "size", 0], "start: the new cabinet opens on topic Dydis")
    ok(cab(c, "[c.W,c.H,c.D,c.sections.length,c.sections[0].kind]") == [600, 720, 560, 1, "doors"], "start: a 600 × 720 × 560 door cabinet")
    ok(js(c, "document.querySelectorAll('.nve-card').length") == 1 and js(c, "!!document.querySelector('.nve-card.on .nve-mini svg')"), "strip: one card with its mini picture")
    ok(js(c, "document.querySelectorAll('.nve-rail .nve-tab').length") == len(json.loads(js(c, NEXT))["ts"]), "rail: one tab per topic of this cabinet")
    page_ok(c, "start")


def s_size(c):
    front(c)
    ok(js(c, "document.querySelectorAll('.nve-pic .nve-hit').length") == 1, "picture: one hit area per section")
    ok(js(c, "document.querySelectorAll('.nve-pic .nve-dim').length") == 3, "picture: the three outer sizes are buttons")
    c.click(".nve-pic .nve-dim-h")
    ok(js(c, "document.activeElement.id") == "f-c-H" and nv(c, "NV.topic") == "size", "picture: clicking the height label lands in the height field")
    c.click(".nve-pic .nve-dim-w")
    ok(js(c, "document.activeElement.id") == "f-c-W", "picture: clicking the width label lands in the width field")
    c.type("#f-c-W", "800", commit=False)       # still typing: only the live regions follow
    c.wait("+__nv.cur().W === 800")
    c.wait("(document.querySelector('.nve-pic .nve-dim-w b')||{}).textContent === '800'")
    ok(js(c, "document.activeElement.id") == "f-c-W", "size: the field keeps the focus while the picture follows")
    ok("800" in js(c, "document.querySelector('.nve-card.on small').textContent"), "size: the strip card follows the typing")
    ok("800" in js(c, "document.querySelector('.nve-ctitle').textContent"), "size: the canvas header follows the typing")
    c.type("#f-c-W", "800")
    c.type("#f-c-name", "Durys 80")
    time.sleep(0.2)
    ok(cab(c, "[c.W,c.name]") == [800, "Durys 80"], "size: width and name are in the model")
    ok("Durys 80" in js(c, "document.querySelector('.nve-card.on').textContent"), "size: the strip shows the new name")
    js(c, "document.querySelector('details[data-nve-adv=size]').open=true")
    c.type("#f-c-thick", "19")
    ok(cab(c, "c.thick") == 19, "size: board thickness under Daugiau nustatymų")
    c.type("#f-c-thick", "18")
    ok(js(c, "!!document.getElementById('f-c-cnc-facadeT')"), "size: front thickness under Daugiau nustatymų")
    shot(c, "t02-size")
    page_ok(c, "size")


def s_picture(c):
    add_via_picture(c, 0, "drawers")
    n = cab(c, "c.sections.length")
    ok(n == 2 and cab(c, "c.sections[1].kind") == "drawers", "picture: '+' → Stalčiai adds a drawer section")
    ok(nv(c, "[NV.secSel,NV.topic]") == [1, "inside"], "picture: the new section is selected, topic Vidus")
    ok(js(c, "!!document.querySelector('.nve-pic .nve-hit.on[data-i=\"1\"]')") and js(c, "!!document.getElementById('nve-all')"), "picture: it is outlined and its editor is open")
    c.click("#nve-all")
    ok(nv(c, "NV.secSel") is None and js(c, "document.querySelectorAll('.nve-list .nve-row').length") == 2, "inside: ← Visos sekcijos shows the column's list")
    ok(js(c, "document.querySelector('.nve-list .nve-row-m').id") == "nve-row-1", "inside: the list is top first")
    c.click('.nve-pic .nve-hit[data-i="1"]')
    ok(nv(c, "[NV.secSel,NV.topic,S.colSel]") == [1, "inside", 0], "picture: clicking a section selects it")
    chip = js(c, "(document.querySelector('.nve-pic .nve-hit.on .nve-chip')||{}).textContent||''")
    ok("mm" in chip, "picture: the selected section carries its label chip (%s)" % chip)
    shot(c, "t03-section")
    page_ok(c, "picture")


def s_section(c):
    b = "f-c-sections-1-"
    n0 = cab(c, "c.sections[1].nDrawers")
    c.click("#" + b + "nDrawers-p")
    ok(cab(c, "c.sections[1].nDrawers") == n0 + 1, "section: the + of the drawer count")
    ok(nv(c, "NV.secSel") == 1, "section: it stays selected after the change")
    c.click("#" + b + "nDrawers-m")
    ok(cab(c, "c.sections[1].nDrawers") == n0, "section: the − of the drawer count")
    ok(js(c, "!!document.getElementById('%shw') && !!document.getElementById('%srail')" % (b, b)), "section: runner and rail length are offered")
    # height: a number, or what is left
    if cab(c, "c.sections[1].fill"):
        c.click("#" + b + "fill")
        time.sleep(0.2)
    c.type("#" + b + "height", "300")
    time.sleep(0.2)
    ok(cab(c, "[c.sections[1].fill,c.sections[1].height]") == [False, 300], "section: a height in mm")
    c.type("#" + b + "height", "5000", commit=False)      # far too high: red while typing
    c.wait("!!document.querySelector('.nve-zone.over')")
    ok(js(c, "!!document.querySelector('.nve-pic .nve-hit.error')"), "over: the picture marks the overfull column red while typing")
    ok(js(c, "document.activeElement.id") == b + "height", "over: the height field keeps the focus")
    c.type("#" + b + "height", "5000")
    time.sleep(0.25)
    ok(nv(c, "__nv.issues().some(function(x){return x.cab===0&&x.sev==='error'})"), "over: the check engine reports an error")
    ok(js(c, "!!document.querySelector('.nve-iss .nve-ir.error')"), "over: the error is listed under the picture")
    ok(js(c, "document.querySelector('.nve-card.on .nve-mark').classList.contains('error')"), "over: the strip card is marked")
    shot(c, "t04-over")
    c.type("#" + b + "height", "300")
    time.sleep(0.25)
    ok(not js(c, "!!document.querySelector('.nve-zone.over')"), "over: back to 300 mm clears it")
    # move: the selection follows the section
    c.click("#nve-dn-1")
    ok(cab(c, "c.sections.map(function(s){return s.kind})") == ["drawers", "doors"] and nv(c, "NV.secSel") == 0, "section: ▼ moves it down and it stays selected")
    c.click("#nve-up-0")
    ok(cab(c, "c.sections.map(function(s){return s.kind})") == ["doors", "drawers"] and nv(c, "NV.secSel") == 1, "section: ▲ moves it back")
    # another kind in the same place, then the door fields
    c.click("#nve-kind-open")
    ok(cab(c, "c.sections[1].kind") == "open" and nv(c, "NV.secSel") == 1, "section: another kind in the same place")
    c.click("#" + b + "shelves-p")
    ok(cab(c, "c.sections[1].shelves") >= 1 and js(c, "!!document.querySelector('.nve-sec .shp, .nve-sec [data-bind=\"c.sections.1.shelfMode\"], .nve-sec [data-act]')"), "section: shelves and their positions")
    c.click("#nve-kind-drawers")
    c.click('.nve-pic .nve-hit[data-i="0"]')
    ok(nv(c, "NV.secSel") == 0 and js(c, "!!document.getElementById('f-c-sections-0-hinge')"), "section: the doors section shows hinges")
    nd = cab(c, "c.sections[0].nDoors")
    c.click("#f-c-sections-0-nDoors-" + ("m" if nd >= 2 else "p"))
    ok(cab(c, "c.sections[0].nDoors") == (nd - 1 if nd >= 2 else nd + 1), "section: door count stepper")
    c.key("Escape")
    ok(nv(c, "NV.secSel") is None, "section: Esc lets go of the selection")
    page_ok(c, "section")


def s_columns(c):
    ok(js(c, "!!document.querySelector('[data-act=set][data-bind=\"c.cols\"][data-v=\"2\"]')"), "columns: the partition switch is in the list view")
    c.click('[data-act=set][data-bind="c.cols"][data-v="2"]')
    time.sleep(0.2)
    ok(cab(c, "c.cols") == 2, "columns: one partition → two columns")
    ok(js(c, "document.querySelectorAll('.nve-pic .nve-colhit').length") == 2 and js(c, "document.querySelectorAll('.nve-cols [data-act=colsel]').length") == 2, "columns: two columns on the picture and in the switch")
    c.type("#f-c-colW-0", "300")
    time.sleep(0.2)
    ok(cab(c, "c.colW[0]") == 300 and "500" in js(c, "document.getElementById('colw-last').textContent"), "columns: the first width typed, the last one computed")
    ok(js(c, "!!document.querySelector('.nve-pic details.nve-add-empty')"), "columns: the empty column asks what goes there")
    n = cab(c, "c.sections.length")
    add_via_picture(c, 1, "open")
    ok(cab(c, "[c.sections.length,c.sections[c.sections.length-1].col,c.sections[c.sections.length-1].kind]") == [n + 1, 1, "open"], "columns: '+' in the empty column adds there")
    ok(nv(c, "[NV.secSel,S.colSel]") == [n, 1], "columns: the new section is selected and its column is the active one")
    c.click("#nve-all")
    c.click("#nve-col-0")
    ok(nv(c, "S.colSel") == 0 and js(c, "document.querySelectorAll('.nve-list .nve-row').length") == 2, "columns: the switch shows the other column's sections")
    c.click(".nve-addrow [data-act=addsec][data-v=oven]")
    time.sleep(0.2)
    ok(cab(c, "c.sections[c.sections.length-1].kind") == "oven" and nv(c, "NV.secSel") == n + 1, "inside: the add buttons of the list add and select")
    c.click(".nve-sectools [data-act=rmsec]")
    time.sleep(0.2)
    ok(cab(c, "c.sections.length") == n + 1 and nv(c, "NV.secSel") is None, "section: remove takes it away and lets go")
    shot(c, "t05-columns")
    ok(js(c, "!!document.getElementById('f-c-cnc-fg-l') || !!document.querySelector('.nve-fg input')"), "inside: the front gaps are reachable")
    page_ok(c, "columns")


def s_frame(c):
    js(c, "__nv.go({topic:'size',sec:null})")
    time.sleep(0.2)
    ok(js(c, "document.getElementById('nve-back').disabled"), "frame: ← Atgal is off on the first topic")
    seen = ["size"]
    for _ in range(12):
        exp = json.loads(js(c, NEXT))
        c.click("#nve-next")
        time.sleep(0.3)
        if exp["next"] is None:
            break
        at = nv(c, "NV.topic")
        ok(at == exp["next"], "frame: Toliau from %s leads to %s (got %s)" % (exp["at"], exp["next"], at))
        ok(exp["ts"].index(at) > exp["ts"].index(exp["at"]), "frame: Toliau goes forward")
        ok(js(c, "document.querySelector('.nve-tab.on').getAttribute('data-v')") == at, "frame: the rail shows the open topic")
        seen.append(at)
        page_ok(c, "topic " + at)
    ok(len(seen) >= 2 and seen[1] == "inside", "frame: Toliau walked the topics " + " → ".join(seen))
    ok(nv(c, "S.tab") == "room", "frame: after the last topic of the last cabinet Toliau opens the layout")
    js(c, "__nv.go({tab:'cab',topic:'inside',sec:null})")
    time.sleep(0.2)
    c.click("#nve-back")
    ok(nv(c, "NV.topic") == "size", "frame: ← Atgal goes to the previous topic")
    c.click('.nve-tab[data-v="inside"]')
    ok(nv(c, "NV.topic") == "inside", "frame: a rail tab opens its topic")
    # "Taisyti →" of an issue row lands on its field: an overfull column is an error every build reports
    front(c)
    c.click('.nve-pic .nve-hit[data-i="1"]')
    c.type("#f-c-sections-1-height", "5000")
    time.sleep(0.25)
    js(c, "__nv.go({topic:'size',sec:null})")
    time.sleep(0.2)
    row = js(c, """(function(){var r=[].filter.call(document.querySelectorAll('.nve-iss .nve-ir.error [data-nv=go]'),function(b){return b.getAttribute('data-topic')==='inside'})[0];
      if(!r)return null;r.setAttribute('data-tk','1');return r.getAttribute('data-field')||''})()""")
    if ok(row is not None, "issues: the overfull column has a row with Taisyti → under the picture"):
        c.click("[data-tk]")
        time.sleep(0.3)
        ok(nv(c, "NV.topic") == "inside", "issues: Taisyti → opens the topic of the issue")
        if row:
            ok(js(c, "!!document.getElementById(%s)" % json.dumps(row)), "issues: … with its field on the page (%s)" % row)
    js(c, "(function(){var c=__nv.cur();c.sections[1].height=300;__nv.NV.secSel=null;__nv.render()})()")
    time.sleep(0.2)
    page_ok(c, "frame")


def s_cabinet(c):
    js(c, "__nv.go({topic:'size',sec:null})")
    time.sleep(0.2)
    c.click("#nve-dup")
    time.sleep(0.3)
    ok(nv(c, "[S.proj.cabinets.length,S.sel]") == [2, 1] and js(c, "document.querySelectorAll('.nve-card').length") == 2, "cabinet: Kopijuoti adds a copy and opens it")
    c.click('.nve-card[data-i="0"]')
    ok(nv(c, "S.sel") == 0, "strip: a card opens its cabinet")
    c.click('.nve-card[data-i="1"]')
    c.click("#nve-del")
    ok(nv(c, "S.proj.cabinets.length") == 2 and js(c, "document.getElementById('nve-del').classList.contains('sure')"), "cabinet: Ištrinti asks a second click")
    c.click("#nve-del")
    time.sleep(0.3)
    ok(nv(c, "S.proj.cabinets.length") == 1, "cabinet: the second click removes it")
    ok(js(c, "!!document.getElementById('nve-lib')"), "cabinet: the library button is there")
    c.click(".nve-new")
    time.sleep(0.3)
    ok(nv(c, "S.picking") is True and not js(c, "!!document.querySelector('.nve-ws')"), "strip: + Nauja spintelė opens the chooser")
    js(c, "__nv.S.picking=false;__nv.render()")
    # the other kinds: the best picture, no section buttons, no crash
    for idx, name in ((6, "dishwasher"), (8, "panel"), (9, "3-D construction"), (4, "tall"), (5, "fridge")):   # places in the live PRESETS list
        js(c, "(function(i){var S=__nv.S;S.proj.cabinets.push(__dbk.fromPreset(__dbk.PRESETS[i]));S.sel=S.proj.cabinets.length-1;__nv.NV.secSel=null;__dbk.save();__nv.render()})(%d)" % idx)
        time.sleep(0.3)
        front(c)
        time.sleep(0.2)
        kind = cab(c, "c.kind||(c.dishwasher?'dish':'')")
        if kind in ("dish", "panel"):
            ok(js(c, "!!document.querySelector('.nve-pic svg')") and js(c, "document.querySelectorAll('.nve-pic .nve-hit').length") == 0, name + ": a picture without section buttons")
        elif kind == "box":
            ok(js(c, "!!document.querySelector('.nve-3d')"), name + ": shown in 3-D")
        else:
            ok(js(c, "document.querySelectorAll('.nve-pic .nve-hit').length") == cab(c, "c.sections.length"), name + ": one hit area per section")
        shot(c, "t06-%d" % idx)
        page_ok(c, name)
    js(c, "__nv.go({sel:0,topic:'inside',sec:null})")
    time.sleep(0.2)


def s_look(c):
    front(c)
    c.click('.nve-pic .nve-hit[data-i="0"]')
    js(c, "__nv.S.lang='en';__nv.render()")
    time.sleep(0.2)
    txt = js(c, "document.querySelector('.nve-ws').innerText")
    ok("All sections" in txt and "Takes the remaining height" in txt and "Next" in txt, "look: English texts in the workspace")
    shot(c, "t07-en")
    page_ok(c, "english")
    js(c, "__nv.S.lang='lt';__nv.render()")
    c.resize(390, 844)
    time.sleep(0.3)
    js(c, "__nv.render()")
    time.sleep(0.2)
    # nothing of the workspace may reach past the window (the strip and the rail are scrollers of their own)
    out = json.loads(js(c, """JSON.stringify([].filter.call(document.querySelectorAll('.nve-ws *'),function(e){var r=e.getBoundingClientRect();
      return r.width>0&&r.right>391&&r.left<390&&!e.closest('.nve-cards,.nve-rail,svg')}).slice(0,6).map(function(e){return e.tagName+'.'+String(e.className).split(' ')[0]}))"""))
    ok(not out, "look: nothing of the workspace is cut at 390 px " + ", ".join(out))
    clip = json.loads(js(c, """JSON.stringify([].filter.call(document.querySelectorAll('.nve-pic .nve-dim b'),function(e){var r=e.getBoundingClientRect(),p=document.querySelector('.nve-canvas').getBoundingClientRect();
      return r.right>p.right-2||r.left<p.left+2}).length)"""))
    ok(clip == 0, "look: the size labels of the picture stay inside the canvas at 390 px")
    pos = json.loads(js(c, "JSON.stringify(['.nve-strip','.nve-canvas','.nve-insp'].map(function(s){return Math.round(document.querySelector(s).getBoundingClientRect().top+window.scrollY)}))"))
    ok(pos[0] < pos[1] < pos[2], "look: strip, picture and inspector stack on a narrow window %s" % pos)
    shot(c, "t08-narrow")
    c.resize(1440, 900)
    js(c, "__nv.render()")
    page_ok(c, "narrow")


def main():
    t = time.time()
    with Chrome() as c:
        for s in (s_start, s_size, s_picture, s_section, s_columns, s_frame, s_cabinet, s_look):
            try:
                s(c)
            except Exception as e:   # a broken scene must not hide the others' results
                ok(False, "%s stopped: %s" % (s.__name__, str(e).split("\n")[0][:300]))
    print("editor_test: %d checks, %d failed, %.1fs — %s" % (DONE[0], len(FAIL), time.time() - t, URL))
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
