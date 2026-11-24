#!/usr/bin/env python3
"""Bring a newer version of the live app into builder2.

    python3 tools/sync_legacy.py /path/to/app/builder        (a checkout of the `app` repository's builder folder)

Copies its index.html (+ cloud.js, locks.js, workshop-auth.js) into legacy/, splits the page's inline scripts and
styles into src/lib/ (one per file, unchanged), checks they rebuild the page byte for byte, and reports which of the
live functions that the new interface REPLACES (render, refreshLive, save, …) changed — those need a look by hand.
Then: python3 build.py --check && python3 test/run_all.py
"""
import os, re, shutil, sys, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = ['engine', 'export', 'zip', 'sketch', 'look', 'realistic', 'front', 'photos', 'art', 'fittings', 'assembly', 'iso',
         'room', 'drawings', 'report_tpl', 'report', 'app']

def fn_bodies(src):   # top-level function name → its text (to the next top-level declaration)
    out, pos = {}, [(m.start(), m.group(1)) for m in re.finditer(r'^function ([A-Za-z_$][\w$]*)\s*\(', src, re.M)]
    for k, (a, n) in enumerate(pos):
        out[n] = src[a:pos[k + 1][0] if k + 1 < len(pos) else len(src)]
    return out

def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    src_dir = sys.argv[1]; page = open(os.path.join(src_dir, 'index.html'), encoding='utf-8').read()
    blocks = list(re.finditer(r'<script>(.*?)</script>', page, re.S))
    if len(blocks) != len(NAMES):
        sys.exit('the live page now has %d inline scripts, %d expected — a module was added or removed; update NAMES here and LIB in build.py' % (len(blocks), len(NAMES)))
    old_app = open(os.path.join(R, 'src/lib/app.js'), encoding='utf-8').read()
    tmpl, last = '', 0
    for m, n in zip(blocks, NAMES):
        open(os.path.join(R, 'src/lib/%s.js' % n), 'w', encoding='utf-8').write(m.group(1))
        tmpl += page[last:m.start()] + '<script>{{js:%s}}</script>' % n; last = m.end()
    tmpl += page[last:]
    t2, last, j = '', 0, 0
    for m in re.finditer(r'<style>(.*?)</style>', tmpl, re.S):
        open(os.path.join(R, 'src/lib/legacy_%d.css' % j), 'w', encoding='utf-8').write(m.group(1))
        t2 += tmpl[last:m.start()] + '<style>{{css:%d}}</style>' % j; last = m.end(); j += 1
    t2 += tmpl[last:]
    if j != 12: print('NOTE: the live page now has %d style blocks (12 before) — update the range in build.py' % j)
    open(os.path.join(R, 'legacy/template.html'), 'w', encoding='utf-8').write(t2)
    back = re.sub(r'\{\{js:(\w+)\}\}', lambda m: open(os.path.join(R, 'src/lib/%s.js' % m.group(1)), encoding='utf-8').read(), t2)
    back = re.sub(r'\{\{css:(\d+)\}\}', lambda m: open(os.path.join(R, 'src/lib/legacy_%s.css' % m.group(1)), encoding='utf-8').read(), back)
    print('round trip identical:', back == page)
    shutil.copy(os.path.join(src_dir, 'index.html'), os.path.join(R, 'legacy/index.html'))
    for f in ('cloud.js', 'locks.js', 'workshop-auth.js', 'README.md'):
        if os.path.exists(os.path.join(src_dir, f)): shutil.copy(os.path.join(src_dir, f), os.path.join(R, 'legacy', f))
    for f in ('cloud.js', 'locks.js', 'workshop-auth.js'):   # the page loads these from its own folder
        if os.path.exists(os.path.join(src_dir, f)): shutil.copy(os.path.join(src_dir, f), os.path.join(R, f))
    hub = os.path.join(src_dir, '..', 'hub', 'shared')
    for f in ('notices.js', 'project-lock.js', 'back.js'):
        if os.path.exists(os.path.join(hub, f)): shutil.copy(os.path.join(hub, f), os.path.join(R, 'shared', f)); shutil.copy(os.path.join(hub, f), os.path.join(R, 'legacy', 'hub-shared', f))
    new_app = open(os.path.join(R, 'src/lib/app.js'), encoding='utf-8').read()
    ui = ''.join(open(os.path.join(R, 'src/ui', f), encoding='utf-8').read() for f in sorted(os.listdir(os.path.join(R, 'src/ui'))) if f.endswith('.js'))
    over = sorted(set(re.findall(r'^function ([A-Za-z_$][\w$]*)\s*\(', ui, re.M)) & set(fn_bodies(new_app)))
    a, b = fn_bodies(old_app), fn_bodies(new_app)
    changed = [n for n in over if a.get(n) != b.get(n)]
    print('live app.js: %s → %s' % (hashlib.sha1(old_app.encode()).hexdigest()[:12], hashlib.sha1(new_app.encode()).hexdigest()[:12]))
    print('replaced live functions: ' + ', '.join(over))
    print('CHANGED in the live app — compare with the src/ui version by hand: ' + (', '.join(changed) or 'none'))

if __name__ == '__main__':
    main()
