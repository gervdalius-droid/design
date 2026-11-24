#!/usr/bin/env python3
"""Run the checks of builder2:  python3 test/run_all.py [--full]

  build      python3 build.py --check
  engine     the live engine's own regression tests, run in headless Chrome (tools/jsrun.py)
  golden     same project → same parts and .XXL programs in the live snapshot and in the new build
  ui         test/ui/*_test.py (the new interface, driven through the browser)
--full adds the slow engine tests (align_cols, about six minutes).
"""
import glob, os, subprocess, sys, time
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = 'src/lib/engine.js'
ENGINE = [['compare_ref.js'], ['align_check.js'], ['align_manual.js'], ['align_mixed.js'], ['ops_check2.js'], ['fuzz_check.js', E],
          ['legs_check.js'], ['fronts_check.js'], ['post_check.js'], ['geom_check.js'], ['feet_check.js', E], ['box_check.js', E], ['led_check.js', E]]
FULL = [['align_cols.js']]

def run(name, cmd):
    t = time.time(); p = subprocess.run(cmd, cwd=R, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    ok = p.returncode == 0
    last = [l for l in p.stdout.strip().split('\n') if l.strip() and 'favicon' not in l and 'Failed to load resource' not in l][-1:] or ['']
    print('%-4s %-34s %5.1fs  %s' % ('ok' if ok else 'FAIL', name, time.time() - t, last[0][:150]))
    if not ok: print('\n'.join('      ' + l for l in p.stdout.strip().split('\n')[-25:]))
    return ok

def main():
    res = [run('build', [sys.executable, 'build.py', '--check'])]
    for t in ENGINE + (FULL if '--full' in sys.argv else []):
        res.append(run('engine/' + t[0], [sys.executable, 'tools/jsrun.py', 'test/engine/' + t[0]] + t[1:]))
    res.append(run('golden', [sys.executable, 'test/ui/golden_test.py']))
    for f in sorted(glob.glob(os.path.join(R, 'test/ui/*_test.py'))):
        if os.path.basename(f) == 'golden_test.py': continue
        res.append(run('ui/' + os.path.basename(f), [sys.executable, f]))
    print('\n%d passed, %d failed' % (sum(res), len(res) - sum(res)))
    sys.exit(0 if all(res) else 1)

if __name__ == '__main__':
    main()
