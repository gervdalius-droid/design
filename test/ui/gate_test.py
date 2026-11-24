#!/usr/bin/env python3
"""The export gate, end to end (stages "Patikra" and "Gamyba": src/ui/50-check.js, 60-make.js).

    python3 test/ui/gate_test.py [url]        default url: the private build scratch/gate/index.html on the dev server

Example project → the check shows the open confirmations → production is locked and no export command gets
through (mouse, keyboard, any stage) → joints and edges are confirmed in the live modals → the warnings have to be
acknowledged → every export works → a new warning asks again → an error locks everything again.
Downloads are observed, not made: the test replaces <a download>.click, window.print and window.open.
"""
import os, sys, time, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cdp import Chrome

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/scratch/gate/index.html'
SHOTS = os.path.join(ROOT, 'scratch', 'gate')
EXPORT_ACTS = ['dl', 'dlall', 'dlprog', 'dlpart', 'dlcab', 'copy', 'print', 'nestopen', 'drwpdf', 'drwpdf1']
fails, n_ok = [], 0


def ok(cond, what):
    global n_ok
    if cond:
        n_ok += 1
    else:
        fails.append(what)
        print('  FAIL  ' + what)


HOOK = """(function () {
  window.__out = { dl: [], print: 0, open: 0, copy: 0 };
  var oc = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) { window.__out.dl.push(this.download); return; } return oc.call(this); };
  window.print = function () { window.__out.print++; };
  window.open = function () { window.__out.open++; return { location: {}, close: function () {} }; };
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function () { window.__out.copy++; return Promise.resolve(); } } }); } catch (e) {}
  return true;
})()"""
OUT = "(function(){var o=window.__out;return o.dl.length+o.print+o.open+o.copy})()"
STATE = "(function(){var p=document.getElementById('nvm-panel');return p?p.getAttribute('data-state'):null})()"
TOAST = "(function(){var d=document.getElementById('toast');return d&&!d.hidden?d.textContent:''})()"


def go(c, tab, wait=0.5):
    c.eval("__nv.go({tab:%s})" % json.dumps(tab)); time.sleep(wait)


def fake_click(c, act, v=None):
    """A click on an export command that is not on the page right now: the gate listens on #app for all of them."""
    c.eval("(function(){var b=document.createElement('button');b.setAttribute('data-act',%s);%sb.id='t-fake';"
           "document.getElementById('nv-main').appendChild(b);b.click();if(b.parentNode)b.remove()})()"
           % (json.dumps(act), ("b.setAttribute('data-v',%s);" % json.dumps(v)) if v else ''))
    time.sleep(0.5)


def refused(c, what, tab='chk'):
    ok(c.eval(OUT) == 0, what + ': nothing left the app')
    ok(c.eval("__nv.S.tab") == tab, what + ': lands on ' + tab + ' (is ' + str(c.eval("__nv.S.tab")) + ')')
    ok(bool(c.eval(TOAST)), what + ': a toast says why')


def run(c):
    c.goto(URL, wait=2.0)
    c.eval(HOOK)
    if not c.eval("(function(){var b=document.querySelector('[data-act=psample]');if(b){b.click();return true}return false})()"):
        c.click_text('Atidaryti pavyzdį')
    c.wait("__nv.S.proj && __nv.S.proj.cabinets.length === 3 && !__nv.S.home")
    c.drain_logs()

    # ---- 1. the check page: open confirmations, one per cabinet and kind, production blocked
    go(c, 'chk')
    ok(c.eval("document.getElementById('nvk-head').getAttribute('data-state')") == 'blocked', 'check head is blocked')
    todo = c.eval("[].map.call(document.querySelectorAll('.nvk-row.todo'),function(r){return r.closest('[data-cab]').getAttribute('data-cab')+':'+r.getAttribute('data-id')})")
    ok(len(todo) == 6 and len(set(todo)) == 6, 'six confirmations, none twice: ' + str(todo))
    ok(all(c.eval("document.querySelectorAll('.nvk-row.todo [data-act=%s]').length" % a) == 3 for a in ('jcroom', 'ecroom')), 'every confirmation opens its live modal')
    ok(c.eval("document.getElementById('nvk-next').disabled") is True, '"Toliau: Gamyba" is disabled while something blocks')
    ok('6' in (c.text('#nvk-why') or ''), 'the reason is next to the button')
    ok('6 dalykai stabdo gamybą' in c.text('#nvk-head'), 'big state sentence: ' + c.text('#nvk-head .nv-h1'))
    c.click('.nvk-chip[data-v=warn]')
    ok(c.eval("document.querySelectorAll('.nvk-row').length") == c.eval("document.querySelectorAll('.nvk-row.warn').length") and c.eval("document.querySelectorAll('.nvk-row.warn').length") > 0, 'filter "Įspėjimai" shows warnings only')
    c.click('.nvk-chip[data-v=block]')
    ok(c.eval("document.querySelectorAll('.nvk-row').length") == 6 and c.eval("document.querySelectorAll('.nvk-ok').length") == 0, 'filter "Stabdo" shows the six blockers only')
    c.click('.nvk-chip[data-v=all]')
    c.shot(os.path.join(SHOTS, 't-chk-blocked.png'))

    # ---- 2. production is locked: no export command gets through
    go(c, 'res', 0.8)
    ok(c.eval(STATE) == 'blocked', 'export panel is locked')
    ok(c.eval("document.querySelectorAll('#nvm-panel [data-act=dl], #nvm-panel [data-nv=mpdf], #nvm-panel [data-nv=mjson]').length") == 0, 'the locked panel offers no download')
    ok(c.eval("!document.querySelector('.nvm .card.ready, .nvm .dl, .nvm .reshead')"), 'the old readiness card and download row are gone')
    ok(c.eval("document.querySelectorAll('#nvm-stats .nvm-stat').length") == 5, 'summary: cabinets, parts, programs, board, edging')
    c.shot(os.path.join(SHOTS, 't-res-locked.png'))
    c.click('.nvm-live [data-act=dlprog]'); time.sleep(0.5)
    refused(c, 'locked: a program button in the parts table')
    go(c, 'res', 0.8)
    c.eval("document.querySelector('#proglist [data-act=dlcab]').focus()"); c.key('Enter'); time.sleep(0.5)
    refused(c, 'locked: keyboard Enter on "this cabinet\'s programs"')
    go(c, 'res', 0.8)
    c.click('.nvm-live tr.part'); time.sleep(0.6)
    ok(c.eval("!!document.querySelector('.pview #progtext') && !!__nv.S.part"), 'a part still opens in the part view while locked')
    c.click('.pview [data-act=copy]'); time.sleep(0.5)
    refused(c, 'locked: copy the program text')
    for act, v in [('dl', 'zip'), ('dl', 'xlsm'), ('dl', 'csv'), ('dl', 'json'), ('dlall', None), ('dlpart', 'x'), ('print', None)]:
        go(c, 'res', 0.6); fake_click(c, act, v)
        refused(c, 'locked: command %s %s' % (act, v or ''))
    go(c, 'res', 0.6)
    for nv in ('mpdf', 'mjson'):
        c.eval("__nv.A.%s()" % nv); time.sleep(0.4)
        refused(c, 'locked: command ' + nv)
    go(c, 'nest', 0.8)
    ok(c.eval("document.getElementById('nvm-bar').getAttribute('data-state')") == 'blocked', 'cutting plan shows the locked line')
    ok(c.eval("document.querySelector('[data-act=nestopen]').getAttribute('aria-disabled')") == 'true', 'the hand-over button reads as switched off')
    c.click('[data-act=nestopen]'); time.sleep(0.5)
    refused(c, 'locked: hand-over to Nesting')
    go(c, 'drw', 1.5)
    c.click('[data-act=drwpdf]'); time.sleep(0.5)
    refused(c, 'locked: drawings PDF')
    go(c, 'drw', 1.5)
    c.click('[data-act=drwpdf1]'); time.sleep(0.5)
    refused(c, 'locked: one drawing sheet PDF')
    ok('Pirmiausia sutvarkykite patikrą' in c.eval(TOAST), 'the toast: ' + c.eval(TOAST))

    # ---- 3. confirm joints and edges in the live modals, from the check page
    go(c, 'chk')
    for k in range(6):
        row = c.eval("(function(){var b=document.querySelector('.nvk-row.todo [data-act]');return b?[b.getAttribute('data-act'),+b.getAttribute('data-i')]:null})()")
        ok(row is not None, 'confirmation %d has its button' % (k + 1))
        if not row:
            break
        c.click('.nvk-row.todo [data-act]'); time.sleep(0.7)
        ok(c.eval("__nv.S.sel") == row[1] and c.eval("__nv.S.tab") == 'chk', 'the modal opens for cabinet %d, on the check stage' % (row[1] + 1))
        okb = '[data-act=jcok]' if row[0] == 'jcroom' else '[data-act=ecok]'
        ok(c.eval("!!document.querySelector(%s)" % json.dumps(okb)), 'live modal %s is open' % row[0])
        if k == 0:
            c.shot(os.path.join(SHOTS, 't-modal.png'))
        c.click(okb); time.sleep(0.6)
    ok(c.eval("document.querySelectorAll('.nvk-row.todo').length") == 0, 'no confirmation left')
    ok(c.eval("__nv.S.proj.cabinets.every(function(k){return !!k.jointsOk && !!k.edgesOk})"), 'the live jointsOk / edgesOk are set')
    ok(c.eval("document.getElementById('nvk-head').getAttribute('data-state')") == 'warn', 'check head: can be made, warnings to review')
    ok(c.eval("document.querySelectorAll('.nvk-ok').length") >= 2, 'the project and the cabinet with nothing open are quiet green lines')
    ok(c.eval("document.getElementById('nvk-next').disabled") is False, '"Toliau: Gamyba" is enabled')
    c.shot(os.path.join(SHOTS, 't-chk-warn.png'))
    fix = c.eval("(function(){var b=document.querySelector('.nvk-row.warn [data-nv=go]');return b?+b.getAttribute('data-sel'):null})()")
    c.click('.nvk-row.warn [data-nv=go]'); time.sleep(0.6)
    ok(c.eval("__nv.S.tab") == 'cab' and c.eval("__nv.S.sel") == fix, 'the row link opens that cabinet')
    go(c, 'chk')
    c.click('#nvk-next'); time.sleep(0.9)
    ok(c.eval("__nv.S.tab") == 'res', '"Toliau: Gamyba" opens production')

    # ---- 4. warnings have to be acknowledged
    ok(c.eval(STATE) == 'ack', 'export panel asks to review the warnings')
    ok(c.eval("document.getElementById('nvm-zip').disabled") is True, 'ZIP is disabled until the tick')
    ok(c.eval("document.querySelectorAll('#nvm-panel .nvm-li.warn').length") == c.eval("__nv.issues().filter(function(x){return x.sev==='warn'}).length"), 'the panel lists the warnings')
    c.click('.nvm-live [data-act=dlprog]'); time.sleep(0.5)
    refused(c, 'not acknowledged: a program button', tab='res')
    ok('įspėjimus' in c.eval(TOAST), 'the toast asks for the warnings: ' + c.eval(TOAST))
    c.shot(os.path.join(SHOTS, 't-res-ack.png'))
    c.click('#nvm-ack'); time.sleep(0.6)
    ok(c.eval(STATE) == 'ready', 'after the tick the panel is ready')
    ok(c.eval("!!sessionStorage.getItem('nv.ack.' + __nv.S.proj.id)"), 'the acknowledgement is kept in sessionStorage per project')
    ok(c.eval("!document.querySelector('.nvm .card.ready, .nvm .dl, .nvm .reshead')"), 'no old readiness card or download row in the ready state either')
    go(c, 'chk'); go(c, 'res', 0.8)
    ok(c.eval(STATE) == 'ready', 'the acknowledgement survives leaving the page')
    c.shot(os.path.join(SHOTS, 't-res-ready.png'))

    # ---- 5. every export works
    def got(pred, what, timeout=6):
        end = time.time() + timeout
        while time.time() < end:
            if c.eval(pred):
                break
            time.sleep(0.2)
        ok(bool(c.eval(pred)), what + '  (out: ' + json.dumps(c.eval("window.__out")) + ')')
    has = lambda rx: "window.__out.dl.some(function(n){return /%s/.test(n)})" % rx
    c.click('.nvm-live [data-act=dlprog]'); got(has(r'\.XXL$'), 'one program downloads')
    c.click('#nvm-panel [data-act=dl][data-v=csv]'); got(has(r'_detales\.csv$'), 'the .csv downloads')
    c.click('#nvm-panel [data-nv=mjson]'); got(has(r'_projektas\.json$'), 'the project .json downloads')
    c.click('#nvm-panel [data-act=dl][data-v=xlsm]'); got(has(r'\.xlsx$'), 'the .xlsx downloads', 20)
    c.click('#nvm-panel [data-nv=mpdf]'); got(has(r'_brezinai\.pdf$'), 'the drawings PDF downloads', 40)
    c.click('#nvm-zip'); got(has(r'_CNC\.zip$'), 'the ZIP downloads', 60)
    c.click('#nvm-panel [data-act=print]'); got("window.__out.print === 1", 'the list prints')
    c.click('#nvm-panel [data-act=nestopen]'); got("window.__out.open === 1", 'the hand-over to Nesting opens')
    n0 = c.eval("window.__out.dl.length")
    c.click('#nvm-panel [data-act=dlall]'); got("window.__out.dl.length >= %d + __nv.build().files.length" % n0, 'all programs download separately', 20)
    go(c, 'nest', 0.8)
    ok(c.eval("!document.getElementById('nvm-bar')"), 'no gate line on the cutting plan when open')

    # ---- 6. a new warning asks again
    go(c, 'res', 0.6)
    c.eval("(function(){var S=__nv.S,k=JSON.parse(JSON.stringify(S.proj.cabinets[1]));k.id='t'+Date.now();k.name='Kopija';S.proj.cabinets.push(k);__nv.render()})()"); time.sleep(0.8)
    ok(c.eval("__nv.S.proj.cabinets.length") == 4 and c.eval(STATE) == 'ack', 'a new set of warnings asks for the tick again (state ' + str(c.eval(STATE)) + ')')
    c.eval("__nv.S.proj.cabinets.pop();__nv.render()"); time.sleep(0.6)
    ok(c.eval(STATE) == 'ready', 'back to the acknowledged set: ready again')

    # ---- 7. an error locks everything again
    c.eval("__nv.S.proj.name='';__nv.render()"); time.sleep(0.6)
    name_err = c.eval("__nv.issues().some(function(x){return x.sev==='error'&&x.cab===-1})")
    if name_err:
        ok(c.eval(STATE) == 'blocked', 'an empty project name locks the export')
        fake_click(c, 'dl', 'zip'); n1 = c.eval("window.__out.dl.length"); time.sleep(0.5)
        ok(c.eval("__nv.S.tab") == 'chk' and c.eval("window.__out.dl.length") == n1, 'empty name: ZIP refused')
        ok(c.eval("!!document.querySelector('.nvk-grp[data-cab=\"-1\"] .nvk-row.error')"), 'the check shows it under "Projektas"')
    else:
        print('  note: this build\'s check engine has no rule for an empty project name (placeholder 10-checks.js) — skipped')
    c.eval("__nv.S.proj.name='PAVYZDYS';__nv.S.proj.cabinets[2].W=20;__nv.go({tab:'res'})"); time.sleep(0.8)
    ok(c.eval("__nv.issues().some(function(x){return x.sev==='error'&&x.cab===2})"), 'a cabinet 20 mm wide is an error')
    ok(c.eval(STATE) == 'blocked', 'the error locks the export again')
    n1 = c.eval("window.__out.dl.length")
    c.click('.nvm-live [data-act=dlprog]'); time.sleep(0.6)
    ok(c.eval("window.__out.dl.length") == n1 and c.eval("__nv.S.tab") == 'chk', 'error: a program button is refused and the check opens')
    ok(c.eval("!!document.querySelector('.nvk-grp[data-cab=\"2\"] .nvk-row.error')"), 'the check shows the error in cabinet 3')
    ok(c.eval("document.getElementById('nvk-next').disabled") is True, '"Toliau: Gamyba" is disabled again')
    c.shot(os.path.join(SHOTS, 't-chk-error.png'))

    # ---- 8. English, and no page errors anywhere
    c.eval("__nv.S.lang='en';__nv.render()"); time.sleep(0.5)
    ok('production' in c.text('#nvk-head').lower(), 'English check head: ' + c.text('#nvk-head .nv-h1'))
    go(c, 'res', 0.8)
    ok('locked' in c.text('#nvm-panel').lower(), 'English export panel')
    c.eval("__nv.S.lang='lt';__nv.render()")
    logs = [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]
    ok(not logs, 'no page errors: ' + ' | '.join(l[:300] for l in logs))


if __name__ == '__main__':
    with Chrome() as c:
        try:
            run(c)
        except Exception as e:
            fails.append('test stopped: %r' % (e,))
            try:
                c.shot(os.path.join(SHOTS, 't-stopped.png'))
            except Exception:
                pass
    print('gate_test: %d checks passed, %d failed' % (n_ok, len(fails)))
    for f in fails:
        print('  - ' + f)
    sys.exit(1 if fails else 0)
