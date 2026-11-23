#!/usr/bin/env python3
"""Run a node-style script in headless Chrome (this machine has no node).

    python3 tools/jsrun.py legacy/test/compare_ref.js [argv2 argv3 ...]  [ENV=value ...]

`require()` (relative paths, fs, path), `process.argv/env/exit`, `module.exports` and `__dirname` are shimmed;
files are read from the project over a throw-away local server. Paths are relative to the project root
(argv) or to the requiring file (require). console output is printed; exit code 0 unless the script throws
or calls process.exit(non-zero).
"""
import http.server, json, os, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHIM = r"""
(function(){
  var cache = {}, out = [], written = {};
  function norm(p){ var a = [], s = p.split('/'); for (var i = 0; i < s.length; i++){ if (s[i] === '..') a.pop(); else if (s[i] !== '.' && s[i] !== '') a.push(s[i]); } return '/' + a.join('/'); }
  function dirname(p){ var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
  function get(p){ var x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); return x.status === 200 ? x.responseText : null; }
  function read(p){ if (written[p] != null) return written[p]; var r = get(p);
    if (r == null) { var m = /\/src\/([\w.-]+\.js)$/.exec(p); if (m) r = get('/src/lib/' + m[1]); }   // the old tests say ../src/engine.js; the modules live in src/lib/
    if (r == null) throw new Error('ENOENT: ' + p); return r; }
  var pathMod = { join: function(){ return norm([].slice.call(arguments).join('/')); }, resolve: function(){ var r = ''; [].slice.call(arguments).forEach(function(a){ r = a.charAt(0) === '/' ? a : r + '/' + a; }); return norm(r); }, dirname: dirname, basename: function(p){ return p.slice(p.lastIndexOf('/') + 1); }, sep: '/' };
  var fsMod = { readFileSync: function(p){ return read(norm(String(p))); }, writeFileSync: function(p, d){ written[norm(String(p))] = String(d); }, existsSync: function(p){ try { read(norm(String(p))); return true; } catch (e) { return false; } }, mkdirSync: function(){} };
  var proc = { argv: ['node'].concat(__ARGV__), env: __ENV__, exit: function(c){ var e = new Error('__exit__'); e.__exit = c || 0; throw e; }, stdout: { write: function(s){ console.log(String(s).replace(/\n$/, '')); } }, cwd: function(){ return '/'; }, platform: 'browser', hrtime: function(){ var t = performance.now(); return [Math.floor(t / 1000), (t % 1000) * 1e6]; } };
  function load(abs){
    if (cache[abs]) return cache[abs].exports;
    var src = read(abs), m = { exports: {} }; cache[abs] = m;
    if (/\.json$/.test(abs)) { m.exports = JSON.parse(src); return m.exports; }
    var fn = new Function('module', 'exports', 'require', 'process', '__dirname', '__filename', 'global', src + '\n//# sourceURL=' + abs);
    fn.call(m.exports, m, m.exports, function(p){ return req(p, dirname(abs)); }, proc, dirname(abs), abs, window);
    return m.exports;
  }
  function req(p, base){
    if (p === 'fs') return fsMod; if (p === 'path') return pathMod;
    var abs = norm(p.charAt(0) === '/' ? p : (p.charAt(0) === '.' ? base + '/' + p : '/' + p));
    if (!/\.(js|json)$/.test(abs)) abs += '.js';
    return load(abs);
  }
  window.__run = function(){
    try { load(proc.argv[1]); return 0; }
    catch (e) { if (e && e.__exit != null) return e.__exit; console.log('THROWN: ' + (e && e.stack || e)); return 1; }
  };
})();
"""

def main():
    args = [a for a in sys.argv[1:] if "=" not in a or a.startswith(("/", ".")) or a.endswith(".js")]
    env = dict(a.split("=", 1) for a in sys.argv[1:] if a not in args)
    if not args:
        sys.exit(__doc__)
    argv = ["/" + os.path.relpath(os.path.abspath(a), ROOT) if os.path.exists(a) else a for a in args]
    env = {k: ("/" + os.path.relpath(os.path.abspath(v), ROOT) if os.path.exists(v) else v) for k, v in env.items()}
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with Chrome() as c:
        c.goto("http://127.0.0.1:%d/tools/blank.html" % srv.server_address[1], wait=0.5)
        c.eval(SHIM.replace("__ARGV__", json.dumps(argv)).replace("__ENV__", json.dumps(env)))
        r = c.cmd("Runtime.evaluate", {"expression": "__run()", "returnByValue": True}, timeout=900)
        code = r.get("result", {}).get("value", 1)
        for l in c.drain_logs():
            print(l[6:] if l.startswith("[log] ") else l)
    srv.shutdown()
    sys.exit(code if isinstance(code, int) else 1)

if __name__ == "__main__":
    main()
