#!/usr/bin/env python3
"""skin_test.py — the layout stage, the settings page and every live widget in the new look.

Visits every stage and every modal of the live app in Lithuanian and English, at 1440×900 and at 390×844,
saves a screenshot of each to scratch/skin/ and fails when a screen
  · throws a page error or logs a console error,
  · makes the PAGE scroll sideways (document.documentElement.scrollWidth > innerWidth + 1),
  · misses the element the scene is about.
A few behaviours of 40-room.js are checked on the way (the settings keep every live binding, "Plačiau", the
section list, the check line of the layout stage).

    python3 test/ui/skin_test.py                  # everything (about a minute)
    python3 test/ui/skin_test.py room set         # only the scenes whose name contains one of the words
    python3 test/ui/skin_test.py --desk --lt jc   # one size / one language
    URL=http://127.0.0.1:8765/index.html python3 test/ui/skin_test.py     # another build (default: scratch/skin)
"""
import os, sys, time

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(R, "tools"))
from cdp import Chrome

URL = os.environ.get("URL", "http://127.0.0.1:8765/scratch/skin/index.html")
OUT = os.path.join(R, "scratch", "skin")
os.makedirs(OUT, exist_ok=True)

FAILS = []
NOTED = set()

# Elements of THIS part's screens that stick out of their frame: everything inside the stage (#nv-main) and inside the
# open windows (joints / edges check, versions) must end within that frame's right edge, unless a scrolling box
# of its own clips it (the palette row, a wide table in its wrapper).
WIDE = """(function(){
  var out=[];
  [['#nv-main','#nv-main *'],['.drwover','.drwover *'],['#toast:not([hidden])','#toast *']].forEach(function(p){
    var root=document.querySelector(p[0]); if(!root) return; var lim=Math.min(root.getBoundingClientRect().right, window.innerWidth)+1;
    [].some.call(document.querySelectorAll(p[1]),function(e){
      var r=e.getBoundingClientRect(); if(!(r.width>0&&r.height>0)||r.right<=lim) return false;
      for(var a=e.parentElement;a&&a!==root.parentElement;a=a.parentElement){
        var cs=getComputedStyle(a); if(cs.overflowX!=='visible'&&a.getBoundingClientRect().right<=lim) return false;
        if(a.tagName==='svg'||a.tagName==='SVG') return false; }
      out.push(e.tagName.toLowerCase()+'.'+String(e.className.baseVal===undefined?e.className:'').trim().split(/\\s+/).slice(0,2).join('.')+' → '+Math.round(r.right)+' > '+Math.round(lim-1));
      return out.length>=3; });
  });
  return out.join(' | ');
})()"""
# what makes a phone page wider than the screen (for the note): the first element outside any clipping box
OUTSIDE = """(function(){
  var w=document.documentElement.clientWidth, hit='';
  [].some.call(document.querySelectorAll('#app *'),function(e){
    var r=e.getBoundingClientRect(); if(!(r.width>0&&r.height>0)||r.right<=w+1||getComputedStyle(e).position==='fixed') return false;
    for(var a=e.parentElement;a;a=a.parentElement){ var cs=getComputedStyle(a); if(cs.position==='fixed'||(cs.overflowX!=='visible'&&a.getBoundingClientRect().right<=w+1)) return false; }
    hit=e.tagName.toLowerCase()+'.'+String(e.className.baseVal===undefined?e.className:'').trim().split(/\\s+/).slice(0,2).join('.')+' ends at '+Math.round(r.right); return true; });
  return hit;
})()"""


def fail(scene, msg):
    FAILS.append("%s: %s" % (scene, msg))
    print("  FAIL %s — %s" % (scene, msg))


def js(c, expr):
    v = c.eval(expr)
    if isinstance(v, dict) and "__error" in v:
        raise RuntimeError("js: %s → %s" % (expr[:80], v["__error"]))
    return v


def base(c, lang):
    """the example project (three cabinets) plus one 3-D construction, in the given language"""
    c.goto(URL, wait=1.2)
    c.wait("window.__nv && window.__dbk && document.getElementById('app').children.length")
    c.click_text("Atidaryti pavyzdį")
    c.wait("__nv.S.proj && __nv.S.proj.cabinets.length >= 3")
    js(c, "(function(){var S=__nv.S,P=__dbk.PRESETS,k=Object.keys(P).filter(function(k){return P[k].box})[0];"
          "if(k!=null){var b=__dbk.fromPreset(P[k]);b.name='3D';S.proj.cabinets.push(b);}"
          "S.lang=%r;__dbk.save();__nv.render();})()" % lang)
    c.drain_logs()


# ---- scenes: (name, setup(c) → selector that must be on the screen) ---------------------------------
def go(tab, extra=""):
    return "(function(){var S=__nv.S;S.jcheck=false;S.echeck=false;S.part=null;%s __nv.go({tab:%r});})()" % (extra, tab)


def close_ver(c):
    js(c, "(function(){var e=document.querySelector('#verdlg [data-vact=close]');if(e)e.click();})()")


def s_room(c):
    js(c, go("room", "S.roomSel=null;S.roomSelId=null;")); time.sleep(0.5)
    return "#room .rm-stage svg"


def s_room_sel(c):
    js(c, go("room")); time.sleep(0.3)
    js(c, "__nv.A.rsel(null,null,1);__nv.render()"); time.sleep(0.4)
    return "#room .rm-ins .rm-ih"


def s_room_plan(c):
    js(c, go("room", "S.roomSel=null;S.roomSelId=null;")); time.sleep(0.3)
    c.click("#room .rm-bar .seg button", nth=1); time.sleep(0.5)
    return "#room .rm-stage svg"


def s_room_3d(c):
    js(c, go("room", "S.roomSel=null;S.roomSelId=null;")); time.sleep(0.3)
    c.click("#room .rm-bar .seg button", nth=2); time.sleep(1.0)
    return "#room .rm-stage"


def s_room_back(c):   # leave the editor in the front view for the next scenes
    js(c, go("room")); time.sleep(0.2)
    c.click("#room .rm-bar .seg button", nth=0); time.sleep(0.3)
    return "#room .rm-stage svg"


def s_set(c):
    js(c, go("set", "S.admin=false;")); time.sleep(0.3)
    return ".nvr-set .nvr-set-nav"


def s_set_low(c):
    js(c, go("set", "S.admin=false;")); time.sleep(0.2)
    js(c, "document.getElementById('nvr-set-ball').scrollIntoView()"); time.sleep(0.4)
    return "#nvr-set-ball"


def s_set_admin(c):
    js(c, go("set", "S.admin=true;")); time.sleep(0.3)
    js(c, "document.getElementById('nvr-set-admin').scrollIntoView()"); time.sleep(0.4)
    return "#nvr-set-admin .prgrid"


def s_cab(c):
    js(c, go("cab", "S.admin=false;S.sel=0;S.picking=false;")); time.sleep(0.9)
    if js(c, "!!document.querySelector('#assembly-preview .av.connector-mode')"):   # the 3-D view remembers its mode
        av_click(c, "[data-connectors]")
    return "#assembly-preview .av:not(.connector-mode)"


def av_click(c, sel):
    """a control of the 3-D view (it listens to real clicks)"""
    r = js(c, "(function(){var b=document.querySelector('#assembly-preview %s');if(!b)return false;b.click();return true})()" % sel)
    time.sleep(0.7)
    return r


def s_cab_joints(c):
    js(c, go("cab", "S.sel=0;S.picking=false;")); time.sleep(0.9)
    if not js(c, "!!document.querySelector('#assembly-preview .av.connector-mode')") and not av_click(c, "[data-connectors]"):
        raise RuntimeError("no connectors button")
    return "#assembly-preview .av.connector-mode .av-quickbar:not([hidden])"


def s_cab_joint(c):
    s_cab_joints(c)
    av_click(c, "[data-j-pick]")
    return "#assembly-preview .av-j-types"


def s_cab_box(c):
    s_cab(c)
    js(c, go("cab", "S.sel=3;S.picking=false;")); time.sleep(0.9)
    return "#assembly-preview .av"


def s_cab_boards(c):
    s_cab_box(c)
    if not js(c, "!!document.querySelector('#assembly-preview [data-boards][aria-pressed=true]')"):
        av_click(c, "[data-boards]")
    return "#assembly-preview .av-boards:not([hidden])"


def s_cab_boards_off(c):   # the 3-D view back in its plain mode for whoever looks next
    s_cab_box(c)
    if js(c, "!!document.querySelector('#assembly-preview [data-boards][aria-pressed=true]')"):
        av_click(c, "[data-mode=assembly]")
    return "#assembly-preview .av"


def s_jc(c):   # opened from the layout stage (the live "jcroom" way), cabinet 1
    js(c, go("room", "S.sel=0;")); time.sleep(0.3)
    js(c, "__nv.S.jcheck=true;__nv.S.echeck=false;__nv.render()"); time.sleep(0.8)
    return ".jcover .jcbox"


def s_ec(c):
    js(c, go("room", "S.sel=1;")); time.sleep(0.3)
    js(c, "__nv.S.echeck=true;__nv.S.jcheck=false;__nv.render()"); time.sleep(0.8)
    return ".jcover .ec-model"


def s_ver(c):
    js(c, go("room")); time.sleep(0.3)
    c.click("[data-act=pver]"); time.sleep(0.6)
    return "#verdlg .verbox"


def s_res(c):
    close_ver(c)
    js(c, go("res")); time.sleep(0.5)
    return ".tablewrap table"


def s_res_part(c):
    js(c, go("res")); time.sleep(0.3)
    js(c, "(function(){var r=document.querySelector('.tablewrap tr[data-act]')||document.querySelector('.tablewrap [data-act=part]');if(r)r.click();})()"); time.sleep(0.6)
    return ".tablewrap table"


def s_nest(c):
    js(c, go("nest")); time.sleep(0.8)
    return "#nv-main"


def s_drw(c):
    js(c, go("drw")); time.sleep(1.0)
    return "#nv-main"


def s_toast(c):
    js(c, go("room")); time.sleep(0.3)
    js(c, "__dbk.toast(__nv.S.lang==='lt'?'Spintelė pridėta — Nr. 4':'Cabinet added — No. 4')"); time.sleep(0.3)
    return "#toast:not([hidden])"


SCENES = [
    ("room", s_room), ("room-sel", s_room_sel), ("room-plan", s_room_plan), ("room-3d", s_room_3d), ("room-back", s_room_back),
    ("set", s_set), ("set-low", s_set_low), ("set-admin", s_set_admin),
    ("cab-3d", s_cab), ("cab-joints", s_cab_joints), ("cab-joint", s_cab_joint), ("cab-box", s_cab_box), ("cab-boards", s_cab_boards), ("cab-plain", s_cab_boards_off),
    ("jc", s_jc), ("ec", s_ec), ("ver", s_ver),
    ("res", s_res), ("res-part", s_res_part), ("nest", s_nest), ("drw", s_drw), ("toast", s_toast),
]


def checks(c, name, lang):
    """behaviours of 40-room.js, checked once per language on the desktop size"""
    if name == "room":
        t = c.text(".nvr-head") or ""
        if ("Neprivaloma" if lang == "lt" else "Optional") not in t:
            fail(name, "the 'optional' line is missing")
        if js(c, "!!document.querySelector('.rc-bar')"):
            fail(name, "the live roomChecks bar is still shown")
        n = js(c, "(function(){var n=__nv.counts();return n.error+n.todo+n.warn})()")
        if n and not js(c, "!!document.querySelector('.nvr-chkline[data-act=tab][data-v=chk]')"):
            fail(name, "open issues but no line to the check stage")
        if js(c, "document.querySelectorAll('.nvr-foot [data-act=tab]').length") != 2:
            fail(name, "footer buttons")
    if name == "set":
        # every binding of the live page is there exactly once, with the id the live binding engine expects
        bad = js(c, "(function(){var d={},dup=[];"
                    "[].forEach.call(document.querySelectorAll('#nv-main [data-bind]'),function(e){var b=e.getAttribute('data-bind');if(d[b]&&e.tagName!=='BUTTON')dup.push(b);d[b]=1;});"
                    "return dup.join(',')})()")
        if bad:
            fail(name, "bindings twice: " + bad)
        cnt = js(c, "JSON.stringify({nav:document.querySelectorAll('.nvr-nav-a').length,h:document.querySelectorAll('.nvr-set-col h3').length,"
                    "cards:document.querySelectorAll('.nvr-set-col .card').length,binds:document.querySelectorAll('.nvr-set-col [data-bind]').length,more:document.querySelectorAll('.nvr-more-b').length})")
        print("    settings:", cnt)
        if js(c, "document.querySelectorAll('.nvr-nav-a').length!==document.querySelectorAll('.nvr-set-col h3').length"):
            fail(name, "the section list does not match the headings")
        if js(c, "document.querySelectorAll('.nvr-set-col .card').length") < 10:
            fail(name, "a live settings card is missing")
        # a binding still works: the machine's drill list, typed and read back from the settings
        c.type("#f-s-railW", "110")
        if js(c, "__dbk.S.settings.railW") != 110:
            fail(name, "typing in a settings field did not reach the settings")
        c.type("#f-s-railW", "100")
        # "Plačiau" unfolds without a redraw and is remembered
        if js(c, "document.querySelectorAll('.nvr-more-b').length") < 3:
            fail(name, "long notes are not folded")
        js(c, "document.querySelector('.nvr-more-b').click()")
        if not js(c, "document.querySelector('.nvr-more').classList.contains('open')"):
            fail(name, "'Plačiau' did not open")
        js(c, "__nv.render()")
        if not js(c, "document.querySelector('.nvr-more').classList.contains('open')"):
            fail(name, "'Plačiau' forgotten after a redraw")
        js(c, "document.querySelector('.nvr-more-b').click()")
        # the section list scrolls to its card
        js(c, "document.querySelector('.nvr-nav-a[data-v^=nvr-seth-merivo]').click()"); time.sleep(0.9)
        top = js(c, "document.getElementById('nvr-set-merivo').getBoundingClientRect().top")
        if not (0 <= top < 200):
            fail(name, "the section list did not scroll to the card (top=%s)" % top)
        if not js(c, "document.querySelector('.nvr-nav-a[data-v^=nvr-seth-merivo]').getAttribute('aria-current')==='true'"):
            fail(name, "the clicked section is not marked")
        js(c, "window.scrollTo(0,0)"); time.sleep(0.2)
    if name == "set-admin":
        if not js(c, "!!document.querySelector('#nvr-set-admin [data-bind=\"pr.cut\"]')"):
            fail(name, "the price fields are missing")
    if name == "jc":
        if not js(c, "!!document.querySelector('.jcover [data-act=jcok], .jcover .btn.pri')"):
            fail(name, "no confirm button in the joints check")


def run(mode, lang, only):
    mobile = mode == "phone"
    kw = dict(mobile=True, width=390, height=844, dpr=2) if mobile else dict(width=1440, height=900)
    with Chrome(**kw) as c:
        base(c, lang)
        for name, fn in SCENES:
            if only and not any(o in name for o in only):
                continue
            tag = "%s-%s-%s" % (name, "m" if mobile else "d", lang)
            try:
                sel = fn(c)
                if sel and not js(c, "!!document.querySelector(%r)" % sel):
                    fail(tag, "missing " + sel)
                c.shot(os.path.join(OUT, tag + ".png"))
                ov = js(c, "document.documentElement.scrollWidth - window.innerWidth")
                if ov > 1:
                    fail(tag, "the page scrolls sideways by %s px" % ov)
                wide = js(c, WIDE)
                if wide:
                    fail(tag, "wider than its frame: " + wide)
                lay = js(c, "window.innerWidth")
                if mobile and lay > c.w + 1 and tag not in NOTED:   # a phone lays the page out wider when something sticks out: say what
                    NOTED.add(tag)
                    print("    note %s: laid out %d px wide on a %d px screen — %s" % (tag, lay, c.w, js(c, OUTSIDE) or "?"))
                if not mobile:
                    checks(c, name, lang)
            except Exception as e:   # a scene must not stop the run
                fail(tag, "%s: %s" % (type(e).__name__, e))
            logs = [l for l in c.drain_logs() if "favicon" not in l and ("[pageerror]" in l or "[error]" in l)]
            for l in logs:
                fail(tag, l[:300])
            print("  ok  " + tag if not any(f.startswith(tag) for f in FAILS) else "  --  " + tag)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    modes = [m for m in ("desk", "phone") if "--" + m in sys.argv] or ["desk", "phone"]
    langs = [l for l in ("lt", "en") if "--" + l in sys.argv] or ["lt", "en"]
    for m in modes:
        for l in langs:
            print("%s · %s" % (m, l))
            run(m, l, args)
    if FAILS:
        print("\n%d FAILED" % len(FAILS))
        for f in FAILS:
            print("  " + f)
        sys.exit(1)
    print("\nskin_test: all screens ok → scratch/skin/*.png")


if __name__ == "__main__":
    main()
