#!/usr/bin/env python3
"""Build the new Spintelių kūrėjas (builder2) into one self-contained index.html.

    python3 build.py            → index.html
    python3 build.py --check    → also loads it in headless Chrome and fails on page errors
    python3 build.py --out scratch/x/plain.html --plain-engine
                                → without the corrections to the live engine (PATCHES 'engine'): what the live app drills
    python3 build.py --out scratch/x/index.html --ui 30-editor,31-topics
                                → a private build: only the shared files (src/ui/0*, 10-checks, 99-*) plus the
                                  named ones — so work in progress in the other src/ui files cannot break it

How the page is put together (see docs/ARCHITECTURE.md):

  src/lib/*.js          the live app's modules, UNCHANGED (engine, export, report, room, drawings …)
  src/lib/app.js        the live app's own UI script, UNCHANGED — one closure. It is cut in two at its boot line
                        (document.documentElement.lang = …; render();) and everything in src/ui/*.js is placed
                        between the halves, INSIDE that closure. A function declared again in src/ui/ replaces the
                        live one (the later declaration wins), so the new interface overrides render(), the views
                        and the live refresh while every command, rule and export of the live app keeps working.
  src/lib/legacy_*.css  the live app's styles (still needed by the embedded widgets), then src/ui/*.css on top.

Bringing in a newer live app = replacing src/lib/ (tools/sync_legacy.py) and building again; this script lists the
live functions the new interface overrides so they can be compared after such an update.
"""
import os, re, sys, glob, hashlib

R = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()

LIB = ['engine', 'export', 'zip', 'sketch', 'look', 'realistic', 'front', 'photos', 'art', 'fittings',
       'assembly', 'iso', 'room', 'drawings', 'report_tpl', 'report']
BOOT = "document.documentElement.lang = S.lang;\nrender();"

# Fixes to the live modules, applied at build time (src/lib stays the untouched live code). Each must match exactly once —
# when the live app fixes it itself the build stops here and the patch can be dropped.
PATCHES = [
    # 3-D view: a confirmat's head was always drawn on face B of the drilled part. An outside back (on the rear edges)
    # has face A outwards, so its screws were shown inside the cabinet, as if they came through the sides.
    # Picture only — holes and programs are not touched.
    ('assembly',
     "const faceName=confirmat?(h.face==='B'?'A':'B'):(h.face||'A'),",
     "const nvAx=[0,1,2].reduce((m,i)=>Math.abs(pl.n[i])>Math.abs(pl.n[m])?i:m,0),nvSg=pl.n[nvAx]>0?1:-1,nvA=pl.o[nvAx],nvAll=(r.panels||[]).filter(q=>q.place&&!q.drawerOf&&q.role!=='FASADAS'&&q.role!=='DURYS').reduce((acc,q)=>{[0,q.L].forEach(a=>[0,q.W].forEach(b=>[0,q.T].forEach(d=>acc.push(q.place.o[nvAx]+a*q.place.u[nvAx]+b*q.place.v[nvAx]-d*q.place.n[nvAx]))));return acc;},[]),nvOut=nvSg>0?Math.max(...nvAll):Math.min(...nvAll),"
     "faceName=confirmat?(Math.abs(nvA-nvOut)<.5?'A':(h.face==='B'?'A':'B')):(h.face||'A'),"),
    # 3-D view: with the door open the hinge's arm stayed on the side and its cup went with the door, nothing between
    # them — the hinge looked like a loose piece on the side panel. Two links now join arm and cup at any opening.
    ('assembly',
     "if(V.mode==='assembly')meshFaces('hinge',1,mapH,'#c6cdd1',tf,!right);",
     "if(V.mode==='assembly')meshFaces('hinge',1,mapH,'#c6cdd1',tf,!right);"
     "if(V.mode==='assembly'&&angle>.06){const nvA=[right?x+w-20:x+20,34,hz],nvC=tf([cx,7,hz]),nvM=[(nvA[0]+nvC[0])*.5,(nvA[1]+nvC[1])*.5-10,hz];rod(nvA,nvM,5.5,'#9aa4aa');rod(nvM,nvC,6.5,'#c3cbd0');}"),
    # ---- Drawer runners, corrected against Blum's planning sheets (docs/RUNNERS.md has the drawings' numbers and sources).
    # Blum fixes two things to the drawer box's reference line R (the top of the board under the box):
    #   TANDEMBOX: cabinet profile screws R + 33, front fixing R + 47.5 / 79.5      MERIVOBOX: cabinet profile screws R + 54,
    #   front fixing R + 33.5 / 65.5, base underside R + 20.
    # The engine drills every TANDEMBOX front 65.5 / 97.5 above its own bottom edge, i.e. R is 18 mm above a front's bottom edge.
    # (1) For the lowest drawer the profile row was right (18 + 33). For every drawer above it the row was put 33 above the
    #     front's bottom edge — 18 mm too low for the holes in its own front: the front ended up 18 mm low, into the one below.
    ('engine', '"BLUM TANDEMBOX": { marks:[19,28,37,261,293,453], up:33,',
               '"BLUM TANDEMBOX": { marks:[19,28,37,261,293,453], up:33, fa:18,'),
    ('engine', "function runnerUp(rt) {",
               "function runnerFa(rt) { return rt && rt.merivo ? +R.merivo.fa || 0 : rt && +rt.fa || 0; }   /* how far a front's bottom edge hangs below its box's reference line */\nfunction runnerUp(rt) {"),
    ('engine', "var rt = R.runner[r.type], up = runnerUp(rt); var x = Math.max(up, r.fb + up - t);",
               "var rt = R.runner[r.type], up = runnerUp(rt); var x = Math.max(up, r.fb + runnerFa(rt) + up - t);"),
    ('engine', "var rt = R.runner[r.type], up = runnerUp(rt), x = Math.max(up, r.fb + up - t);",
               "var rt = R.runner[r.type], up = runnerUp(rt), x = Math.max(up, r.fb + runnerFa(rt) + up - t);"),
    ('engine', "var up = runnerUp(rt), axis = Math.max(zlo + up, fb + up), mks = runnerMarks(rt, rail);",
               "var up = runnerUp(rt), axis = Math.max(zlo + up, fb + runnerFa(rt) + up), mks = runnerMarks(rt, rail);"),
    # (1b) the same reference for the holes in the lowest front over a cabinet bottom thicker than 18 mm (the box stands on it)
    ('engine', "var fc = rt.facade, mk = o.tbFront === 'mark', dyF = Math.max(0, -f.bottom);",
               "var fc = rt.facade, mk = o.tbFront === 'mark', dyF = Math.max(0, -f.bottom, t - (+rt.fa || 0) - f.bottom);"),
    # (2) MERIVOBOX had TANDEMBOX's 33 (the live app says so itself: "not verified on a MERIVOBOX"). Blum: 54 above the
    #     reference, the base's underside 20 above it (34 under the screws); NL 270–350 has its rear screws at 197 / 229.
    ('engine', "merivo: { up:33, marks:'37, 261, 293', perLen:'', ded:51, shorter:26, boxShorter:10, t:16, below:24,",
               "merivo: { up:54, fa:18, marks:'37, 261, 293', perLen:'270: 37,197,229; 300: 37,197,229; 350: 37,197,229', ded:51, shorter:26, boxShorter:10, t:16, below:34,"),
    ('engine', "axis:Math.max(t + up, f.bottom + up), top:Math.min(f.bottom + f.h - +R.merivo.topGap, innerTop)",
               "axis:Math.max(t + up, f.bottom + (+R.merivo.fa || 0) + up), top:Math.min(f.bottom + f.h - +R.merivo.topGap, innerTop)"),
]

def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else None

def main():
    app = rd('src/lib/app.js')
    if app.count(BOOT) != 1:
        sys.exit("build.py: the boot line of src/lib/app.js was not found exactly once — the live app changed its start-up; adjust BOOT.")
    cut = app.index(BOOT)
    ui_js = sorted(glob.glob(os.path.join(R, 'src/ui/*.js')))
    ui_css = sorted(glob.glob(os.path.join(R, 'src/ui/*.css')))
    out = arg('--out') or 'index.html'
    only = arg('--ui')
    if only is not None:
        keep = [k for k in only.split(',') if k]
        sel = lambda p: os.path.basename(p)[0] == '0' or os.path.basename(p).startswith(('10-checks', '99-')) or any(os.path.basename(p).startswith(k) for k in keep)
        ui_js = [p for p in ui_js if sel(p)]; ui_css = [p for p in ui_css if sel(p)]
    overlay = ''.join('\n/* ======== src/ui/%s ======== */\n%s\n' % (os.path.basename(p), open(p, encoding='utf-8').read()) for p in ui_js)
    closure = app[:cut] + overlay + app[cut:]

    # which live functions does the new interface replace? (top-level declarations with the same name)
    decl = re.compile(r'^function ([A-Za-z_$][\w$]*)\s*\(', re.M)
    legacy_fns = set(decl.findall(app))
    over = sorted(set(decl.findall(overlay)) & legacy_fns)
    dup = sorted(n for n in set(decl.findall(overlay)) if len(re.findall(r'^function %s\s*\(' % re.escape(n), overlay, re.M)) > 1)
    if dup:
        sys.exit("build.py: declared more than once in src/ui/: " + ', '.join(dup))

    css = ''.join('<style>\n%s\n</style>\n' % rd('src/lib/legacy_%d.css' % i) for i in range(12))
    css += ''.join('<style>\n/* src/ui/%s */\n%s\n</style>\n' % (os.path.basename(p), open(p, encoding='utf-8').read()) for p in ui_css)
    head = rd('src/head.html')
    js = '<script>\n' + rd('vendor/jszip.min.js') + '\n</script>\n'
    def lib(n):
        t = rd('src/lib/%s.js' % n)
        for (m, old, new) in PATCHES:
            if m == n and not (m == 'engine' and '--plain-engine' in sys.argv):   # --plain-engine: the live engine as it is (test/ui/golden_test.py compares the interface alone)
                if t.count(old) != 1: sys.exit("build.py: patch for src/lib/%s.js no longer matches exactly once — the live app changed there; review PATCHES." % n)
                t = t.replace(old, new)
        return t
    js += ''.join('<script>' + lib(n) + '</script>\n' for n in LIB)
    build_id = hashlib.sha1((js + closure).encode('utf-8')).hexdigest()[:10]   # what this page computes with: every module (with its corrections) and the interface
    js += '<script>window.NV_BUILD="%s"</script>\n' % build_id
    js += '<script>' + closure + '</script>\n'
    # sign-in, cloud saving and "one editor per project" — the live app's own scripts, unchanged, loaded exactly as there
    # (copies next to the page so it also runs outside app.dedesbaldai.lt; tools/sync_legacy.py refreshes them)
    js += ''.join('<script src="%s"%s></script>\n' % (s, ' defer' if 'notices' in s else '') for s in
                  ['workshop-auth.js', 'shared/notices.js', 'cloud.js', 'shared/project-lock.js', 'locks.js', 'shared/back.js'])
    if re.search(r'</script', overlay, re.I):   # an inline script must never contain its own end tag
        sys.exit("build.py: a src/ui script contains '</script' — write it as '<\\/script'")
    page = ('<!doctype html>\n<html lang="lt" data-theme="light">\n<head>\n' + head + css + '</head>\n<body>\n'
            '<div id="app"></div>\n<div id="toast" class="toast" hidden></div>\n' + js + '</body>\n</html>\n')
    outp = os.path.join(R, out); os.makedirs(os.path.dirname(outp), exist_ok=True)
    open(outp, 'w', encoding='utf-8').write(page)
    print('%s  %.2f MB  ·  ui: %s' % (out, len(page.encode('utf-8')) / 1e6, ' '.join(os.path.basename(p) for p in ui_js + ui_css)))
    print('overrides of live functions (%d): %s' % (len(over), ', '.join(over)))
    print('live app.js sha1 ' + hashlib.sha1(app.encode('utf-8')).hexdigest()[:12])
    print('build ' + build_id)
    if '--check' in sys.argv:
        check(out)

def check(out='index.html'):
    """Load the page in headless Chrome: any page error or console error fails the build."""
    sys.path.insert(0, os.path.join(R, 'tools'))
    import http.server, threading
    from cdp import Chrome
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=R, **k)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with Chrome() as c:
        c.goto('http://127.0.0.1:%d/%s' % (srv.server_address[1], out), wait=2.0)
        ok = c.eval("!!(window.__dbk && document.getElementById('app').children.length)")
        logs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    srv.shutdown()
    for l in logs:
        print('  ' + l[:600])
    if not ok or logs:
        sys.exit('build.py --check: the page did not start cleanly')
    print('check: page starts, no errors')

if __name__ == '__main__':
    main()
