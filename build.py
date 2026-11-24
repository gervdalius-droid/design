#!/usr/bin/env python3
"""Build the new Spintelių kūrėjas (builder2) into one self-contained index.html.

    python3 build.py            → index.html
    python3 build.py --check    → also loads it in headless Chrome and fails on page errors
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
    js += ''.join('<script>' + rd('src/lib/%s.js' % n) + '</script>\n' for n in LIB)
    js += '<script>' + closure + '</script>\n'
    if re.search(r'</script', overlay, re.I):   # an inline script must never contain its own end tag
        sys.exit("build.py: a src/ui script contains '</script' — write it as '<\\/script'")
    page = ('<!doctype html>\n<html lang="lt" data-theme="light">\n<head>\n' + head + css + '</head>\n<body>\n'
            '<div id="app"></div>\n<div id="toast" class="toast" hidden></div>\n' + js + '</body>\n</html>\n')
    outp = os.path.join(R, out); os.makedirs(os.path.dirname(outp), exist_ok=True)
    open(outp, 'w', encoding='utf-8').write(page)
    print('%s  %.2f MB  ·  ui: %s' % (out, len(page.encode('utf-8')) / 1e6, ' '.join(os.path.basename(p) for p in ui_js + ui_css)))
    print('overrides of live functions (%d): %s' % (len(over), ', '.join(over)))
    print('live app.js sha1 ' + hashlib.sha1(app.encode('utf-8')).hexdigest()[:12])
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
