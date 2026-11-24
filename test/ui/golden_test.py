#!/usr/bin/env python3
"""The new interface must not change what goes to the machine.

The same project (all ten presets, materials filled, a few edits) is opened in the untouched live snapshot
(/legacy/) and in the new build (/); the part list, every .XXL program, the hardware list and the CSV must be
identical, text for text.

    python3 test/ui/golden_test.py [new-page-path]       (default: index.html; needs nothing running)
"""
import http.server, json, os, sys, threading, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cdp import Chrome

MAKE = r"""
(function () {
  var D = window.__dbk; localStorage.clear();
  D.newProject('GOLDEN Virtuvė 1');
  var S = D.S, p = S.proj; p.id = 'golden0001';
  D.PRESETS.forEach(function (pr, i) { var c = D.fromPreset(pr); c.id = 'cab' + i; c.name = 'K' + (i + 1); p.cabinets.push(c); });
  p.cabinets.forEach(function (c, i) {
    c.mat = { carc: 'LMDP balta 18', facade: 'MDF dažytas 18', back: 'HDF balta 3' }; c.edge = { carc: 'ABS balta 0.8', facade: 'ABS balta 1' };
    (c.sections || []).forEach(function (s, k) { s.id = 's' + i + '_' + k; });
  });
  var a = p.cabinets[0]; a.W = 800; a.cols = 2; a.colW = [300]; a.sections.push({ id: 'sx', kind: 'doors', col: 1, fill: true, nDoors: 1, hinge: 'BLUM LANKSTAI', doorSplit: 'v', hingeSide: 'auto', shelves: 2, shelfAdj: true });
  var b = p.cabinets[1]; b.cnc.joinery = 'cam'; b.cnc.backs = ['solid']; b.cnc.backMount = 'inside'; b.cnc.hinges = true; b.cnc.pins = 'row';
  var c3 = p.cabinets[3]; c3.cnc.top = 'full'; c3.cnc.topMount = 'over'; c3.H = 900;
  p.cabinets = p.cabinets.map(D.normCab);
  return JSON.stringify(p);
})()
"""
OUT = r"""
(function (json) {
  var D = window.__dbk; D.openProject(JSON.parse(json)); D.render();
  var pj = D.buildProjectAll();
  return JSON.stringify({ parts: pj.parts.map(function (x) { var o = {}; Object.keys(x).sort().forEach(function (k) { if (k !== 'pic') o[k] = x[k]; }); return o; }),
    files: pj.files, warnings: pj.warnings, hardware: pj.hardware, csv: D.csvOf(pj) });
})(%s)
"""

def main():
    page = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
        def translate_path(self, path):
            if path.startswith('/hub/shared/'): path = '/legacy/hub-shared/' + path[len('/hub/shared/'):]
            return super().translate_path(path)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d/' % srv.server_address[1]
    res = {}
    with Chrome() as c:
        c.goto(base + 'legacy/index.html', wait=2.5)
        proj = c.eval(MAKE)
        if not isinstance(proj, str): sys.exit('could not make the project in the live snapshot: %r' % (proj,))
        res['live'] = c.eval(OUT % json.dumps(proj))
        c.goto(base + page, wait=2.5)
        c.eval('localStorage.clear()')
        res['new'] = c.eval(OUT % json.dumps(proj))
        errs = [l for l in c.drain_logs() if '[pageerror]' in l]
    srv.shutdown()
    for k in res:
        if not isinstance(res[k], str): sys.exit('%s page failed: %r' % (k, res[k]))
    a, b = json.loads(res['live']), json.loads(res['new'])
    bad = 0
    for key in ('parts', 'warnings', 'hardware', 'csv'):
        same = a[key] == b[key]; bad += not same
        print('%-9s %s  (%s)' % (key, 'identical' if same else 'DIFFERENT', len(a[key])))
    fa = {f['name']: f['text'] for f in a['files']}; fb = {f['name']: f['text'] for f in b['files']}
    diff = [n for n in sorted(set(fa) | set(fb)) if fa.get(n) != fb.get(n)]
    print('programs  %s  (%d .XXL files, sha1 %s)' % ('identical' if not diff else 'DIFFERENT: ' + ', '.join(diff[:8]), len(fa),
          hashlib.sha1(json.dumps(fa, sort_keys=True).encode()).hexdigest()[:12]))
    for e in errs: print('  ' + e[:300])
    if bad or diff or errs: sys.exit(1)
    print('golden: the new interface produces exactly the live app\'s output')

if __name__ == '__main__':
    main()
