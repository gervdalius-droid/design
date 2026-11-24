#!/usr/bin/env python3
"""The start screen and the new-cabinet chooser, end to end (src/ui/20-home.js).

    python3 test/ui/home_test.py [url]        default url: the private build scratch/home/index.html on the dev server

Empty start screen → "create" without a name is refused under the field → a name shows the CNC file-name form →
the chooser → every preset makes its cabinet and opens it on "Dydis" with the width selected → the library adds a
cabinet → the project list: cards with pictures, the locks.js selector, copy / backup / versions / delete (two
clicks) / example / a name that is already taken / search → both languages → a phone does not scroll sideways.
Downloads are observed, not made: the test replaces <a download>.click.
"""
import os, sys, time, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cdp import Chrome

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/scratch/home/index.html'
SHOTS = os.path.join(ROOT, 'scratch', 'home')
fails, n_ok = [], 0


def ok(cond, what):
    global n_ok
    if cond:
        n_ok += 1
    else:
        fails.append(what)
        print('  FAIL  ' + what)


HOOK = """(function () {
  window.__dl = [];
  var oc = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) { window.__dl.push(this.download); return; } return oc.call(this); };
  return true;
})()"""
# a saved cabinet in the library, the way the live clibRec() writes it
LIB_SEED = """(function () { var K = __dbk, c = K.fromPreset(K.PRESETS[0]), now = new Date().toISOString(); c.name = 'Bibliotekos stalčiai'; c.W = 800;
  var x = JSON.parse(JSON.stringify(c)); delete x.id;
  K.store('dbKurejas.cablib', { v: 1, items: [{ id: 'libtest1', added: now, cat: 'Apatinės', name: c.name, W: 800, H: c.H, D: c.D, type: c.type, cab: x, updated: now }], cats: ['Apatinės', 'Pakabinamos', 'Aukštos', 'Spintos', 'Kita'] });
  K.render(); return K.clib().items.length; })()"""
# more than six projects (the search field appears), with different ages
MANY = """(function () { var K = __dbk, l = K.lib(), src = l[l.length - 1], o = l.slice();
  ['SPINTA_A', 'SPINTA_B', 'VONIA_C', 'BIURAS_D', 'VIRTUVE_E'].forEach(function (n, i) { var r = JSON.parse(JSON.stringify(src)); r.id = K.uid(); r.data.id = r.id; r.name = r.data.name = n; r.updated = r.data.updated = new Date(Date.now() - (i + 1) * 30 * 3600e3).toISOString(); o.push(r); });
  K.libSet(o); K.render(); return K.lib().length; })()"""


def js(c, expr):
    v = c.eval(expr)
    if isinstance(v, dict) and '__error' in v:
        raise RuntimeError(expr[:80] + ' → ' + str(v['__error'])[:300])
    return v


def cards(c):
    return js(c, "document.querySelectorAll('.nvh-card').length")


def go_home(c):
    if not js(c, "__nv.S.home"):
        c.click('[data-act=home]')
    c.wait("__nv.S.home && !!document.querySelector('.nvh')")
    time.sleep(0.15)


def open_menu(c, name):
    """Open the ⋯ menu of the card with this project name."""
    i = js(c, "[].slice.call(document.querySelectorAll('.nvh-card')).findIndex(function (e) { return e.querySelector('.nvh-name').textContent === %s; })" % json.dumps(name))
    assert i >= 0, 'no card ' + name
    c.click('.nvh-dots', nth=i)
    c.wait("!!document.querySelector('.nvh-menu')")
    return i


def errors(c):
    return [l for l in c.drain_logs() if 'favicon' not in l and ('[pageerror]' in l or '[error]' in l)]


def desktop():
    with Chrome() as c:
        c.goto(URL, wait=1.5)
        c.wait("!!(window.__nv && window.__dbk && document.querySelector('.nvh'))")
        js(c, HOOK)

        # ---- 1. nothing yet
        ok(js(c, "__nv.S.home && !__nv.S.proj"), 'first visit: the start screen, no project')
        ok(js(c, "!!document.querySelector('.nvh-road') && !document.querySelector('.nvh-card')"), 'empty state: "how it works", no cards')
        ok(js(c, "document.activeElement && document.activeElement.id") == 'np-name', 'empty state: the caret waits in the name field')
        ok(js(c, "document.querySelectorAll('#np-name').length === 1 && document.querySelectorAll('#f-import[data-act-change=import]').length === 1"), 'the live ids np-name and f-import exist once')
        c.shot(os.path.join(SHOTS, 't-empty.png'))

        # ---- 2. no name → refused, said under the field
        c.click('[data-act=pcreate]')
        ok(js(c, "__nv.S.home && !__nv.S.proj"), 'create without a name: nothing is created')
        ok(js(c, "document.getElementById('np-name').getAttribute('aria-invalid')") == 'true', 'create without a name: the field is marked')
        ok(js(c, "!!document.querySelector('#nvh-note .nvh-note-msg.bad') && document.querySelector('#nvh-note').offsetHeight > 0"), 'create without a name: the reason is under the field')
        ok(js(c, "document.getElementById('toast').hidden !== false || !document.getElementById('toast').textContent"), 'create without a name: no passing toast instead of the message')
        c.type('#np-name', '   ', commit=False)
        c.key('Enter')
        ok(js(c, "__nv.S.home && !__nv.S.proj && !!document.querySelector('#nvh-note .nvh-note-msg.bad')"), 'Enter with only spaces: refused the same way')

        # ---- 3. a name → what the CNC files will be called
        c.type('#np-name', 'Virtuvė Testas', commit=False)
        ok(js(c, "document.getElementById('np-name').getAttribute('aria-invalid')") is None, 'typing clears the mark')
        ok('Virtuve_Testas_1_' in js(c, "document.getElementById('nvh-note').textContent"), 'the note shows the file-name form of the name (Virtuve_Testas_1_…)')
        c.shot(os.path.join(SHOTS, 't-name.png'))
        c.key('Enter')
        c.wait("!__nv.S.home && !!__nv.S.proj")
        ok(js(c, "__nv.S.proj.name") == 'Virtuvė Testas', 'Enter creates the project with the typed name')

        # ---- 4. the chooser
        ok(js(c, "!!document.querySelector('.nvh-pick') && __nv.S.proj.cabinets.length === 0"), 'a new project opens on the chooser')
        ok(js(c, "document.querySelector('.nvh-pick h1').textContent") == 'Pirmoji spintelė — kokią kuriame?', 'first cabinet: its own question')
        n_pre = js(c, "__dbk.PRESETS.length")
        ok(js(c, "document.querySelectorAll('.nvh-pre[data-nv=nvhPreset]').length") == n_pre == 10, 'all ten presets are offered')
        ok(js(c, "document.querySelectorAll('.nvh-pre .nvh-pic svg').length") == 8 and js(c, "document.querySelectorAll('.nvh-pre .nvh-pre-ico svg').length") == 2,
           'eight real front pictures, an icon for the panel and the 3-D construction')
        ok(js(c, "[].every.call(document.querySelectorAll('.nvh-pre .nvh-pic'), function (e) { var r = e.getBoundingClientRect(); return r.width > 20 && r.height > 60; })"), 'the pictures have a size')
        ok(js(c, "[].slice.call(document.querySelectorAll('.nvh-grp h3 b')).map(function (e) { return e.textContent; }).join('|')") == 'Apatinės|Viršutinės|Aukštos|Kita', 'grouped Apatinės / Viršutinės / Aukštos / Kita')
        ok(js(c, "!document.querySelector('.nvh-pick [data-act=unpick]')"), 'no Cancel while the project has no cabinet')
        ok(js(c, "!document.querySelector('.nvh-lib') && !!document.querySelector('.nvh-libnone')"), 'empty library: one line about it')
        ok(js(c, "!document.querySelector('.nvh-pick [data-nv] [data-act], .nvh-pick [data-act] [data-nv]')"), 'no command nested in another command')
        ok(js(c, "Math.max.apply(null, [].map.call(document.querySelectorAll('.nvh-pre'), function (e) { return e.getBoundingClientRect().bottom; })) <= 900"), 'at 1440×900 all ten are on one screen')
        c.shot(os.path.join(SHOTS, 't-pick.png'))

        # ---- 5. every preset makes its cabinet and opens it on "Dydis", width selected
        for i in range(n_pre):
            if not js(c, "__nv.S.picking || !__nv.S.proj.cabinets.length"):
                if js(c, "!!document.querySelector('[data-act=pick]')"):
                    c.click('[data-act=pick]')
                else:
                    js(c, "__nv.S.picking = true; __nv.render(); true")
                c.wait("!!document.querySelector('.nvh-pick')")
            if i == 1:
                ok(js(c, "!!document.querySelector('.nvh-pick [data-act=unpick]')") and js(c, "document.querySelector('.nvh-pick h1').textContent") == 'Kokią spintelę kuriame?', 'with cabinets: Cancel and the plain question')
                c.click('.nvh-pick [data-act=unpick]')
                ok(js(c, "!__nv.S.picking && !document.querySelector('.nvh-pick') && __nv.S.proj.cabinets.length === 1"), 'Cancel leaves the chooser, nothing added')
                c.click('[data-act=pick]') if js(c, "!!document.querySelector('[data-act=pick]')") else js(c, "__nv.S.picking = true; __nv.render(); true")
                c.wait("!!document.querySelector('.nvh-pick')")
            want = js(c, "(function () { var p = __dbk.PRESETS[%d]; return { k: p.k, type: p.type, kind: p.box ? 'box' : p.panel ? 'panel' : '', dish: !!p.dish, n: p.secs.length }; })()" % i)
            before = js(c, "__nv.S.proj.cabinets.length")
            c.click(".nvh-pre[data-i='%d']" % i)
            time.sleep(0.2)
            got = js(c, "(function () { var S = __nv.S, c = S.proj.cabinets[S.proj.cabinets.length - 1], a = document.activeElement; return { n: S.proj.cabinets.length, sel: S.sel, picking: !!S.picking, type: c.type, kind: c.kind || '', dish: !!c.dishwasher, secs: c.sections.length, topic: __nv.NV.topic, sec: __nv.NV.secSel, focus: a ? a.id : '', hasW: !!document.getElementById('f-c-W'), selAll: !!(a && a.tagName === 'INPUT' && a.selectionStart === 0 && a.selectionEnd === a.value.length && a.value.length > 0), saved: (function () { var cur = __dbk.store('dbKurejas.current'); return !!cur && cur.cabinets.length === S.proj.cabinets.length; })() }; })()")
            tag = 'preset %d (%s): ' % (i, want['k'])
            ok(got['n'] == before + 1 and got['sel'] == before and not got['picking'], tag + 'one cabinet more, it is the open one, the chooser is closed')
            ok(got['type'] == want['type'] and got['kind'] == want['kind'] and got['dish'] == want['dish'] and got['secs'] == want['n'], tag + 'it is the cabinet of the preset')
            ok(got['saved'], tag + 'saved')
            ok(got['sec'] is None, tag + 'no section selected')
            if not want['kind']:
                ok(got['topic'] == 'size', tag + 'opens on the topic "Dydis"')
            if not want['kind'] and not want['dish'] and got['hasW']:
                ok(got['focus'] == 'f-c-W' and got['selAll'], tag + 'the width field has the caret, its number selected')
        ok(js(c, "__nv.S.proj.cabinets.length") == n_pre, 'ten presets → ten cabinets')

        # ---- 6. the library: shown when it has something, adds through nvhLibAdd
        js(c, "__nv.S.picking = true; __nv.render(); true")
        ok(js(c, LIB_SEED) == 1, 'a cabinet is put in the library')
        ok(js(c, "!!document.querySelector('.nvh-lib .lib') && !document.querySelector('.nvh-libnone')"), 'library with items: the live library is shown')
        ok(js(c, "document.querySelectorAll('.nvh-lib [data-nv=nvhLibAdd][data-v=libtest1]').length === 1 && !document.querySelector('.nvh-lib [data-act=libadd]')"), 'its add button goes through nvhLibAdd')
        ok(js(c, "document.querySelectorAll('#lib-q').length") == 1, 'the live library search field is there once')
        c.shot(os.path.join(SHOTS, 't-lib.png'))
        c.click('.nvh-lib [data-nv=nvhLibAdd]')
        time.sleep(0.2)
        ok(js(c, "(function () { var S = __nv.S, c = S.proj.cabinets[S.proj.cabinets.length - 1]; return S.proj.cabinets.length === 11 && c.libFrom === 'libtest1' && +c.W === 800 && c.name === 'Bibliotekos stalčiai' && !S.picking && S.sel === 10 && __nv.NV.topic === 'size'; })()"), 'library add: a free copy is added and opened on "Dydis"')
        js(c, "__nv.S.picking = true; __nv.render(); true")
        c.click('.nvh-lib [data-act=libdel]'); c.click('.nvh-lib [data-act=libdel]')
        ok(js(c, "__dbk.clib().items.length") == 0 and js(c, "!!document.querySelector('.nvh-libnone')"), 'the live library delete (two clicks) still works inside the chooser')
        js(c, "__nv.S.picking = false; __nv.render(); true")

        # ---- 7. home lists the project
        go_home(c)
        ok(cards(c) == 1 and js(c, "!document.querySelector('.nvh-road')"), 'home: one project card')
        ok(js(c, "(function () { var b = document.querySelector('.prow-main[data-act=\"popen\"][data-v]'); return !!b && b.getAttribute('data-v') === __nv.S.proj.id && !!b.querySelector('b'); })()"), 'the card keeps .prow-main[data-act=popen][data-v] with a <b> (locks.js)')
        txt = js(c, "document.querySelector('.nvh-card').innerText")
        ok('Virtuvė Testas' in txt and '11 spintelių' in txt and 'atidarytas' in txt and 'ką tik' in txt, 'the card: name, 11 spintelių, atidarytas, ką tik')
        ok(js(c, "document.querySelectorAll('.nvh-card .nvh-pic svg').length") == 3 and js(c, "document.querySelector('.nvh-plus').textContent") == '+8', 'the card: three pictures and +8')
        ok(js(c, "!document.getElementById('home-q')"), 'no search field for a short list')

        # ---- 8. copy, backup, versions
        open_menu(c, 'Virtuvė Testas')
        ok(js(c, "[].slice.call(document.querySelectorAll('.nvh-menu [data-act]')).map(function (e) { return e.getAttribute('data-act'); }).join(',')") == 'pdup,pjson,pver,pdel', 'the ⋯ menu: copy, backup, versions, delete')
        c.shot(os.path.join(SHOTS, 't-menu.png'))
        c.click('.nvh-menu [data-act=pdup]')
        ok(cards(c) == 2 and js(c, "__dbk.lib().some(function (r) { return r.name === 'Virtuvė Testas (kopija)' && r.n === 11; })"), 'copy: a second project "… (kopija)"')
        ok(js(c, "!document.querySelector('.nvh-menu')"), 'the menu closes after an action')
        open_menu(c, 'Virtuvė Testas')
        c.click('.nvh-menu [data-act=pjson]')
        time.sleep(0.3)
        ok(js(c, "window.__dl.join(',')") == 'Virtuve_Testas_projektas.json', 'backup: the project .json is handed to the browser')
        ok(js(c, "!document.querySelector('.nvh-menu')"), 'the menu closes after the backup')
        open_menu(c, 'Virtuvė Testas')
        c.click('.nvh-menu [data-act=pver]')
        time.sleep(0.4)
        ok(js(c, "!!document.getElementById('verdlg')") and js(c, "!document.querySelector('.nvh-menu')"), 'versions: the live dialog opens, the menu closes')
        c.click('#verdlg [data-vact=close]')
        ok(js(c, "!document.getElementById('verdlg')"), 'the versions dialog closes')
        open_menu(c, 'Virtuvė Testas')
        c.key('Escape')
        ok(js(c, "!document.querySelector('.nvh-menu')"), 'Esc closes the menu')

        # ---- 9. delete: two clicks, anything else cancels
        open_menu(c, 'Virtuvė Testas (kopija)')
        c.click('.nvh-menu [data-act=pdel]')
        ok(cards(c) == 2 and js(c, "!!document.querySelector('.nvh-menu .del.sure')"), 'delete, first click: only asks, in red')
        c.shot(os.path.join(SHOTS, 't-sure.png'))
        c.click('.nvh-hello')
        time.sleep(0.2)
        ok(cards(c) == 2 and js(c, "!document.querySelector('.nvh-menu') && !__nv.S.confirm"), 'a click elsewhere cancels the delete')
        open_menu(c, 'Virtuvė Testas (kopija)')
        ok(js(c, "!document.querySelector('.nvh-menu .del.sure')"), 'the question does not survive the cancel')
        c.click('.nvh-menu [data-act=pdel]'); c.click('.nvh-menu [data-act=pdel]')
        ok(cards(c) == 1 and js(c, "__dbk.lib().length === 1 && __dbk.lib()[0].name === 'Virtuvė Testas'"), 'delete, second click: the copy is gone, the original stays')

        # ---- 10. the example
        ok(js(c, "!!document.querySelector('.nvh-new [data-act=psample]')"), 'the example button')
        c.click('.nvh-new [data-act=psample]')
        c.wait("!__nv.S.home")
        ok(js(c, "__nv.S.proj.name === 'PAVYZDYS' && __nv.S.proj.cabinets.length === 3 && !__nv.S.picking"), 'the example opens with three cabinets')
        go_home(c)
        ok(cards(c) == 2 and js(c, "document.querySelector('.nvh-card .nvh-name').textContent") == 'PAVYZDYS', 'home: the example is listed first (newest first)')
        ok(js(c, "!document.querySelector('.nvh-new [data-act=psample]') && !!document.querySelector('.nvh-new .nvh-altb[data-act=popen]')"), 'a second press opens the same example instead of adding another')
        c.click('.nvh-new .nvh-altb[data-act=popen]')
        c.wait("!__nv.S.home")
        ok(js(c, "__nv.S.proj.name === 'PAVYZDYS' && __dbk.lib().length === 2"), 'the existing example opens, the list stays at two')
        go_home(c)

        # ---- 11. a name that is already taken: warned once, the second press creates
        c.type('#np-name', 'virtuve testas', commit=False)
        ok(js(c, "!!document.querySelector('#nvh-note .nvh-note-msg.warn')"), 'a taken name (same file names) is warned about while typing')
        c.key('Enter')
        ok(js(c, "__nv.S.home && __dbk.lib().length === 2"), 'taken name: the first Enter does not create')
        ok('vis tiek' in js(c, "document.querySelector('.nvh-new [data-act=pcreate]').textContent"), 'taken name: the button now says "create anyway"')
        c.shot(os.path.join(SHOTS, 't-dup.png'))
        ok(js(c, "!!document.querySelector('#nvh-note [data-act=popen]')"), 'taken name: the existing project can be opened from the warning')
        c.key('Enter')
        c.wait("!__nv.S.home")
        ok(js(c, "__nv.S.proj.name === 'virtuve testas' && __nv.S.proj.cabinets.length === 0 && __dbk.lib().length === 3"), 'taken name: the second Enter creates it')
        go_home(c)
        ok(js(c, "document.getElementById('np-name').value") == '' and 'vis tiek' not in js(c, "document.querySelector('.nvh-new [data-act=pcreate]').textContent"), 'back home: the name field is empty, the button is the normal one')
        ok('Dar be spintelių' in js(c, "document.querySelector('.nvh-card').innerText"), 'a project without cabinets says so on its card')

        # ---- 12. search
        ok(js(c, MANY) == 8, 'eight projects')
        time.sleep(0.4)
        ok(cards(c) == 8 and js(c, "document.querySelectorAll('#home-q').length") == 1, 'more than six projects: the search field')
        ok(js(c, "!document.querySelector('.nvh-pics[data-wait]')"), 'every card has its pictures')
        ok(js(c, "(function () { var d = [].slice.call(document.querySelectorAll('.nvh-card .prow-main')).map(function (b) { var id = b.getAttribute('data-v'); return __dbk.lib().filter(function (r) { return r.id === id; })[0].updated; }); return d.every(function (x, i) { return !i || d[i - 1] >= x; }); })()"), 'newest first')
        c.shot(os.path.join(SHOTS, 't-list.png'))
        c.type('#home-q', 'spinta', commit=False)
        time.sleep(0.2)
        ok(cards(c) == 2 and js(c, "document.activeElement.id") == 'home-q', 'search "spinta": two cards, the caret stays in the field')
        c.type('#home-q', 'zzz', commit=False)
        time.sleep(0.2)
        ok(cards(c) == 0 and js(c, "!!document.querySelector('.nvh-none [data-nv=nvhClearQ]')"), 'search with no match: a message and "show all"')
        c.click('.nvh-none [data-nv=nvhClearQ]')
        ok(cards(c) == 8 and js(c, "__nv.S.homeQ === ''"), '"show all" clears the search')

        # ---- 12b. a long list: the newest twelve, the rest behind "show all"
        ok(js(c, MANY) == 13 and js(c, MANY) == 18, 'eighteen projects')
        time.sleep(0.5)
        ok(cards(c) == 12 and js(c, "!!document.querySelector('[data-nv=nvhAll]')"), 'a long list shows the newest twelve and "show all"')
        c.click('[data-nv=nvhAll]')
        time.sleep(0.6)
        ok(cards(c) == 18 and js(c, "!document.querySelector('[data-nv=nvhAll]') && !document.querySelector('.nvh-pics[data-wait]')"), '"show all": every project, every picture')
        i_last = js(c, "document.querySelectorAll('.nvh-dots').length - 1")
        c.click('.nvh-dots', nth=i_last)
        time.sleep(0.6)
        ok(js(c, "(function () { var m = document.querySelector('.nvh-menu'); return !!m && m.getBoundingClientRect().bottom <= window.innerHeight; })()"), 'the menu of the last card is brought onto the screen')
        c.key('Escape')

        # ---- 12c. import: this app's own backup file comes back as a project
        imp = os.path.join(SHOTS, 't-import.json')
        with open(imp, 'w', encoding='utf-8') as f:
            f.write(js(c, "(function () { var r = __dbk.lib().filter(function (x) { return x.name === 'PAVYZDYS'; })[0], d = JSON.parse(JSON.stringify(r.data)); d.name = 'IKELTAS'; return JSON.stringify(d); })()"))
        ok(js(c, "!!document.querySelector('.nvh-new [data-act=pimport]')"), 'the import button')
        doc = c.cmd('DOM.getDocument')['root']['nodeId']
        node = c.cmd('DOM.querySelector', {'nodeId': doc, 'selector': '#f-import'})['nodeId']
        c.cmd('DOM.setFileInputFiles', {'nodeId': node, 'files': [imp]})
        c.wait("!__nv.S.home && __nv.S.proj && __nv.S.proj.name === 'IKELTAS'")
        ok(js(c, "__nv.S.proj.cabinets.length === 3 && __dbk.lib().length === 19"), 'import: the file opens as a new project with its cabinets')
        go_home(c)

        # ---- 13. open by the card, both languages
        c.click_text('SPINTA_B', tag='.prow-main')
        c.wait("!__nv.S.home")
        ok(js(c, "__nv.S.proj.name") == 'SPINTA_B', 'a click on the card opens that project')
        go_home(c)
        c.click('[data-act=lang][data-v=en]')
        ok(js(c, "document.querySelector('.nvh-hello h1').textContent").startswith('Hello') and 'cabinets' in js(c, "document.querySelector('.nvh-grid').innerText") and js(c, "document.querySelector('.nvh-list h2').textContent") == 'Continue', 'English start screen')
        js(c, "__nv.S.picking = true; __nv.S.home = false; __nv.render(); true")
        ok('Drawer cabinet' in js(c, "document.querySelector('.nvh-pick').innerText") and js(c, "document.querySelector('.nvh-grp h3 b').textContent") == 'Base', 'English chooser')
        js(c, "__nv.S.picking = false; __nv.render(); true")
        c.click('[data-act=lang][data-v=lt]')

        logs = errors(c)
        ok(not logs, 'no page errors (desktop): ' + ' | '.join(l[:200] for l in logs))


def phone():
    with Chrome(mobile=True, width=390, height=844, dpr=2) as c:
        c.goto(URL, wait=1.5)
        c.wait("!!(window.__nv && document.querySelector('.nvh'))")
        ok(js(c, "document.documentElement.scrollWidth <= window.innerWidth"), 'phone: the empty start screen does not scroll sideways')
        c.click('.nvh-new [data-act=psample]')
        c.wait("!__nv.S.home")
        js(c, "__nv.S.picking = true; __nv.render(); true")
        ok(js(c, "document.documentElement.scrollWidth <= window.innerWidth") and js(c, "document.querySelectorAll('.nvh-pre').length") == 10, 'phone: the chooser does not scroll sideways')
        c.shot(os.path.join(SHOTS, 't-phone-pick.png'))
        js(c, "__nv.S.picking = false; __nv.render(); true")
        go_home(c)
        c.click('.nvh-dots')
        ok(js(c, "(function () { var m = document.querySelector('.nvh-menu'); if (!m) return false; var r = m.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; })()"), 'phone: the ⋯ menu stays on the screen')
        ok(js(c, "document.documentElement.scrollWidth <= window.innerWidth"), 'phone: the project list does not scroll sideways')
        c.shot(os.path.join(SHOTS, 't-phone-home.png'))
        logs = errors(c)
        ok(not logs, 'no page errors (phone): ' + ' | '.join(l[:200] for l in logs))


if __name__ == '__main__':
    os.makedirs(SHOTS, exist_ok=True)
    try:
        desktop()
        phone()
    except Exception as e:   # a step that could not even run is a failure with its reason, not a traceback only
        fails.append('stopped: %r' % (e,))
        print('  FAIL  stopped: %r' % (e,))
    print('home_test: %d ok, %d failed' % (n_ok, len(fails)))
    sys.exit(1 if fails else 0)
