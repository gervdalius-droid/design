#!/usr/bin/env python3
""""Pagaminta" (src/ui/65-produced.js): a project that was manufactured is marked, its exact version kept and locked.
    python3 test/ui/prod_test.py [URL]        default http://127.0.0.1:8765/index.html"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from cdp import Chrome
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
DONE, FAIL = [0], []
def ok(cond, what):
    DONE[0] += 1
    if not cond: FAIL.append(what); print('  FAIL  ' + what)
def clk(c, sel): return c.eval("(function(){var e=document.querySelector(%s);if(!e)return false;e.click();return true})()" % json.dumps(sel))
def J(c, expr): return json.loads(c.eval("(function(){var v=(%s);return JSON.stringify(v===undefined?null:v)})()" % expr))
BAR = "(function(){var b=document.getElementById('nvp-bar');return b?b.getAttribute('data-state'):null})()"
ARCH = "new Promise(function(res){var r=indexedDB.open('dbKurejasProduced');r.onsuccess=function(){var q=r.result.transaction('a').objectStore('a').getAll();q.onsuccess=function(){res(JSON.stringify(q.result.map(function(x){return [x.id,x.at,x.name,x.zip?x.zip.length:0]})))}}})"
with Chrome(1440, 900) as c:
    c.goto(URL, wait=1.5); c.eval("localStorage.clear();indexedDB.deleteDatabase('dbKurejasProduced')"); c.goto(URL, wait=2)
    c.type("#np-name", "GAMYBA", commit=False); c.key("Enter")
    c.wait("window.__nv && __nv.S.proj && !__nv.S.home"); time.sleep(.4)
    clk(c, '[data-nv=nvhPreset][data-i="0"]'); time.sleep(3.5)
    ok(isinstance(J(c, "window.NV_BUILD"), str) and len(J(c, "window.NV_BUILD")) == 10, 'the page knows its own build')
    # ---- not offered before the project is ready
    c.eval("__nv.go({tab:'res'})"); time.sleep(1)
    ok(c.eval("!document.querySelector('[data-nv=nvpAsk]')") and c.eval(BAR) is None, 'a project that has not passed the check cannot be marked as produced')
    c.eval("""(function(){var S=__nv.S;S.proj.cabinets.forEach(function(c){c.mat.carc='Balta 18 mm';c.mat.facade='Pilka 18 mm';c.mat.back='HDF 3 mm';c.edge.carc='ABS balta';c.edge.facade='ABS pilka';});__dbk.saveNow();__nv.go({tab:'cab'})})()"""); time.sleep(.6)
    clk(c, '[data-nv=topic][data-v=joints]'); time.sleep(.8); clk(c, '[data-nv=nvjOk]'); time.sleep(.6)
    clk(c, '[data-nv=topic][data-v=review]'); time.sleep(.6); clk(c, '#nvt-cf-ec [data-act=ecopen]'); time.sleep(.6); clk(c, '[data-act=ecok]'); time.sleep(.6)
    c.eval("__nv.go({tab:'res'})"); time.sleep(1.2)
    ok(J(c, "document.getElementById('nvm-panel').getAttribute('data-state')") == 'ready' and c.eval("!!document.querySelector('[data-nv=nvpAsk]')"), 'ready for production: "Pažymėti: pagaminta" is offered')
    clk(c, '[data-nv=nvpAsk]'); time.sleep(.5)
    ok(c.eval("!!document.querySelector('.nvp-step.ask [data-nv=nvpMake]')") and not J(c, "!!__nv.S.proj.prod"), 'it asks first and says what will happen')
    clk(c, '[data-nv=nvpNo]'); time.sleep(.4); ok(c.eval("!document.querySelector('[data-nv=nvpMake]')"), 'cancel: nothing is marked')
    clk(c, '[data-nv=nvpAsk]'); time.sleep(.4); clk(c, '[data-nv=nvpMake]'); time.sleep(6)
    pr = J(c, "__nv.S.proj.prod")
    ok(bool(pr) and pr.get('id') == J(c, "__nv.S.proj.id") and pr['build'] == J(c, "window.NV_BUILD") and pr['rev'] == 1 and pr['n']['files'] >= 6 and len(pr['files']) == pr['n']['files'] + 1 and bool(pr['rules']), 'the record: when, which build, revision, counts, a fingerprint per program, the rules — %s' % {k: pr[k] for k in ('at', 'build', 'rev', 'n')} if pr else None)
    arch = json.loads(c.eval(ARCH, await_promise=True))
    ok(len(arch) == 1 and arch[0][0] == J(c, "__nv.S.proj.id") and arch[0][1] == pr['at'] and arch[0][3] > 50000, 'the produced ZIP itself is kept in this browser — %s' % arch)
    ok(c.eval(BAR) == 'same' and c.eval("!!document.querySelector('.nvp-pill')") and c.eval("!document.querySelector('[data-nv=nvpAsk]')"), 'the project shows it is produced and that today\'s build reproduces it')
    # ---- the lock
    c.eval("__nv.go({tab:'cab'})"); time.sleep(.8); clk(c, '[data-nv=topic][data-v=size]'); time.sleep(.6)
    c.type('#f-c-W', '750'); time.sleep(1.2)
    ok(J(c, "__nv.cur().W") == 600 and J(c, "__dbk.lib().filter(function(r){return r.id===__nv.S.proj.id})[0].data.cabinets[0].W") == 600, 'a typed change is not taken: the project and its saved copy stay as produced')
    ok('užrakintas' in c.eval("document.getElementById('toast').textContent"), 'and the person is told why')
    clk(c, '[data-nv=topic][data-v=joints]'); time.sleep(.8); clk(c, '[data-nv=nv3][data-v="j:pick:bottom"]'); time.sleep(.8); clk(c, '[data-nv=nv3][data-v="j:type:cam"]'); time.sleep(1.2)
    ok(J(c, "(__nv.cur().cnc.joints||{}).bottom") is None and c.eval(BAR) == 'same', 'a command (a joint to cams) is not taken either')
    c.eval("(function(){var b=document.querySelector('[data-nv=undo]');if(b)b.click()})()"); time.sleep(.6)
    ok(J(c, "!!__nv.S.proj.prod"), 'undo does not lead out of the lock')
    c.eval("(function(){var i=document.getElementById('projname');i.value='KITAS';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()"); time.sleep(1.0)
    ok(J(c, "__nv.S.proj.name") == 'GAMYBA', 'the name cannot be changed (the programs carry it)')
    # ---- after a reload it is the same project, and still the same output
    c.goto(URL, wait=2.5)
    ok(c.eval("!!document.querySelector('.nvh-card .nvp-b')") or not J(c, "__nv.S.home"), 'the project list marks it as produced')
    if J(c, "__nv.S.home"): clk(c, '[data-act=popen]'); time.sleep(2)
    ok(J(c, "!!__nv.S.proj.prod") and c.eval(BAR) == 'same' and J(c, "__nv.NV.pCheck.diff.length") == 0 and J(c, "__nv.NV.pCheck.data") is False, 'opened again: produced, and nothing differs')
    # ---- settings changed since: the project is still built with the rules it was produced with
    c.eval("(function(){var S=__nv.S;S.settings.rules.merivo.up=60;__dbk.applyRules();__nv.NV.pCheck=null;__dbk.render()})()"); time.sleep(1.0)
    ok(c.eval(BAR) == 'same' and J(c, "window.DBEngine.R.merivo.up") == pr['rules']['merivo']['up'] and J(c, "__nv.S.settings.rules.merivo.up") == 60, 'workshop settings changed while it is open (the settings page, the cloud sync) do not change a produced project')
    # ---- an earlier version cannot be restored over it; a copy of it is a project of its own
    c.eval("__dbk.VER.snap(__nv.S.proj,'x')"); time.sleep(.5)
    clk(c, '[data-act=pver]'); time.sleep(1.5)
    has = c.eval("!!document.querySelector('#verdlg [data-vact=restore]')")
    clk(c, '#verdlg [data-vact=restore]'); time.sleep(.5); clk(c, '#verdlg [data-vact=restore]'); time.sleep(.8)
    ok(has and J(c, "!!__nv.S.proj.prod") and 'užrakintas' in c.eval("document.getElementById('toast').textContent"), 'the version history cannot restore an earlier state over a produced project')
    clk(c, '#verdlg [data-vact=close]'); time.sleep(.4)
    # ---- another build of the app that computes differently is seen, named, and gives no fresh files
    c.eval("(function(){window.NV_BUILD='0therbuild';var E=window.DBEngine,f=E.buildCabinet;E.buildCabinet=function(){var r=f.apply(E,arguments);(r.panels||[]).forEach(function(p){if(p.key==='KAIRE'&&p.holes[0])p.holes[0].x+=1});return r};__nv.NV.pCheck=null;__dbk.render()})()"); time.sleep(1.2)
    ok(c.eval(BAR) == 'differs' and J(c, "__nv.NV.pCheck.diff.length") >= 1 and 'KAIRE' in c.eval("document.querySelector('.nvp-s').textContent"), 'a build that would drill differently: said so, with the programs that differ')
    c.eval("__nv.go({tab:'res'})"); time.sleep(1.0); clk(c, '#nvm-zip'); time.sleep(.8)
    ok('pagamintą paketą' in c.eval("document.getElementById('toast').textContent"), 'fresh files are refused — only the produced package')
    c.goto(URL, wait=2.5)
    if J(c, "__nv.S.home"): clk(c, '[data-act=popen]'); time.sleep(2)
    # ---- data changed behind its back (another app, another computer) is seen as that
    c.eval("(function(){__nv.NV.pWrite=true;__nv.S.proj.cabinets[0].H=730;__nv.NV.pSnap=null;__nv.NV.pCheck=null;__dbk.render();__nv.NV.pWrite=false})()"); time.sleep(1.0)
    ok(c.eval(BAR) == 'differs' and J(c, "__nv.NV.pCheck.data") is True, 'data changed after production is reported as changed data')
    c.goto(URL, wait=2.5)
    if J(c, "__nv.S.home"): clk(c, '[data-act=popen]'); time.sleep(2)
    # ---- a copy of a produced project (the list's "Kopijuoti") is not locked: it is another project
    pid = J(c, "__nv.S.proj.id")
    c.eval("(function(){var S=__nv.S;S.home=true;__dbk.render()})()"); time.sleep(.6)
    c.eval("(function(){var b=document.createElement('button');b.setAttribute('data-act','pdup');b.setAttribute('data-v',%s);b.style.display='none';document.getElementById('app').appendChild(b);b.click()})()" % json.dumps(pid)); time.sleep(.8)
    cp = J(c, "__dbk.lib().filter(function(r){return r.id!==%s&&r.data.prod})[0]" % json.dumps(pid))
    ok(bool(cp) and cp['data']['prod'].get('id') == pid, 'the copy carries the record of the project it was made from …')
    c.eval("(function(){var r=__dbk.lib().filter(function(r){return r.id===%s})[0];__dbk.openProject(r.data);__nv.S.home=false;__dbk.render()})()" % json.dumps(cp['id'] if cp else '')); time.sleep(1.2)
    c.eval("__nv.go({tab:'cab'})"); time.sleep(.6); clk(c, '[data-nv=topic][data-v=size]'); time.sleep(.5); c.type('#f-c-W', '640'); time.sleep(1.0)
    ok(c.eval(BAR) is None and J(c, "__nv.cur().W") == 640 and not c.eval("!!document.querySelector('.nvp-pill')"), '… but is not produced and not locked')
    c.eval("(function(){var r=__dbk.lib().filter(function(r){return r.id===%s})[0];__dbk.openProject(r.data);__nv.S.home=false;__dbk.render()})()" % json.dumps(pid)); time.sleep(1.2)
    ok(c.eval(BAR) == 'same', 'the produced one itself is still produced and unchanged')
    # ---- changes go into a new version
    c.eval("(function(){var S=__nv.S;S.settings.rules.merivo.up=61;__dbk.applyRules()})()")
    clk(c, '[data-nv=nvpNew]'); time.sleep(1.2)
    ok(J(c, "window.DBEngine.R.merivo.up") == 61, 'a new version is built with today\'s workshop rules, not with those of the produced one')
    nw = J(c, "[__nv.S.proj.name,__nv.S.proj.rev,!!__nv.S.proj.prod,__nv.S.proj.from,__nv.S.proj.id]")
    ok(nw[0] == 'GAMYBA v2' and nw[1] == 2 and nw[2] is False and nw[3] == pid and nw[4] != pid, 'a new version: its own project, revision 2, not produced — %s' % nw[:3])
    ok(J(c, "__dbk.lib().filter(function(r){return r.id===%s})[0].data.prod.at" % json.dumps(pid)) == pr['at'], 'the produced one is still in the list, untouched')
    clk(c, '[data-nv=topic][data-v=size]'); time.sleep(.5); c.type('#f-c-W', '750'); time.sleep(1.0)
    ok(J(c, "__nv.cur().W") == 750 and c.eval(OPEN if False else "__nv.issues().some(function(x){return x.id==='confirm.joints'})"), 'the new version can be changed, and has to be confirmed again')
    # ---- the mark can be taken off, asked twice
    c.eval("__nv.go({tab:'cab'})"); c.goto(URL, wait=2.5)
    c.eval("(function(){var r=__dbk.lib().filter(function(r){return r.id===%s})[0];__dbk.openProject(r.data);__nv.S.home=false;__dbk.render()})()" % json.dumps(pid)); time.sleep(1.2)
    clk(c, '[data-nv=nvpUndo]'); time.sleep(.5)
    ok(J(c, "!!__nv.S.proj.prod") and c.eval("!!document.querySelector('.nvp-sure [data-nv=nvpUndo]')"), 'removing the mark asks once more')
    clk(c, '.nvp-sure [data-nv=nvpUndo]'); time.sleep(1.0)
    ok(J(c, "!!__nv.S.proj.prod") is False and c.eval(BAR) is None and json.loads(c.eval(ARCH, await_promise=True)) == [], 'removed: the project can be changed again, the kept package is gone')
    c.eval("__nv.undo()"); time.sleep(.6)
    ok(J(c, "!!__nv.S.proj.prod") is False and c.eval(BAR) is None, 'undo does not bring the lock back')
    errs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not errs, 'no page errors — %s' % errs[:2])
print('prod_test: %d checks, %d failed' % (DONE[0], len(FAIL)))
sys.exit(1 if FAIL else 0)
