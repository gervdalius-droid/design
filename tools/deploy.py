#!/usr/bin/env python3
"""Put this builder on the workshop's site (app.dedesbaldai.lt/builder/).

    python3 tools/deploy.py /path/to/app          (a checkout of the `app` repository — the site)

Builds the page straight into <app>/builder/index.html, with the site's own shared scripts (/hub/shared/…) instead of the
copies this repository carries for running elsewhere, and checks that the sign-in / cloud scripts in <app>/builder/ are the
ones this build was made against. Nothing is committed or pushed: look at `git -C <app> status`, then commit and push there.

The page's build code (window.NV_BUILD, shown on a produced project) is the same as the one of index.html built here:
it covers what computes — the modules and the interface — not where the shared scripts are loaded from.
"""
import hashlib, os, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sha(p): return hashlib.sha1(open(p, 'rb').read()).hexdigest()[:12]

def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    app = os.path.abspath(sys.argv[1]); dst = os.path.join(app, 'builder')
    if not os.path.isfile(os.path.join(app, 'CNAME')) or not os.path.isdir(os.path.join(app, 'hub', 'shared')):
        sys.exit('deploy.py: %s does not look like the site (no CNAME / hub/shared)' % app)
    os.makedirs(dst, exist_ok=True)
    for f in ('workshop-auth.js', 'cloud.js', 'locks.js'):   # the site's own; this repository only keeps copies of them
        a, b = os.path.join(R, f), os.path.join(dst, f)
        if not os.path.isfile(b): sys.exit('deploy.py: %s is missing on the site' % b)
        if sha(a) != sha(b): print('NOTE  %s differs from the copy here — the site changed it; run tools/sync_legacy.py and the tests before trusting this build' % f)
    for f in ('notices.js', 'project-lock.js', 'back.js'):
        a, b = os.path.join(R, 'shared', f), os.path.join(app, 'hub', 'shared', f)
        if not os.path.isfile(b): sys.exit('deploy.py: %s is missing on the site' % b)
        if sha(a) != sha(b): print('NOTE  hub/shared/%s differs from the copy here (the page will load the site\'s)' % f)
    out = os.path.join(dst, 'index.html')
    r = subprocess.run([sys.executable, os.path.join(R, 'build.py'), '--out', out, '--shared', '/hub/shared/'], capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(r.returncode)
    page = open(out, encoding='utf-8').read()
    for s in ('src="/hub/shared/notices.js"', 'src="/hub/shared/project-lock.js"', 'src="/hub/shared/back.js"', 'src="workshop-auth.js"', 'src="cloud.js"', 'src="locks.js"'):
        if page.count(s) != 1: sys.exit('deploy.py: the built page does not load %s exactly once' % s)
    print('deployed to %s  (%.2f MB, sha1 %s)' % (out, os.path.getsize(out) / 1e6, sha(out)))
    vout = os.path.join(dst, 'viewer.html')   # the 3-D view alone, for ShopFlow's assembly station (build.py --viewer)
    r = subprocess.run([sys.executable, os.path.join(R, 'build.py'), '--out', vout, '--shared', '/hub/shared/', '--viewer'], capture_output=True, text=True)
    if r.returncode: sys.stdout.write(r.stdout); sys.stderr.write(r.stderr); sys.exit(r.returncode)
    vpage = open(vout, encoding='utf-8').read()
    if 'workshop-auth.js' in vpage or 'cloud.js"' in vpage or 'window.NV_VIEWER = true' not in vpage: sys.exit('deploy.py: viewer.html must load no sign-in/cloud scripts and set NV_VIEWER')
    print('deployed to %s  (%.2f MB)' % (vout, os.path.getsize(vout) / 1e6))
    print('next:  git -C %s status   → commit → push' % app)

if __name__ == '__main__':
    main()
