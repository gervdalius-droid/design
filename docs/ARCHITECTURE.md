# builder2 — architecture

A new interface for the Dėdės Baldai cabinet builder. The **live app's logic is reused unchanged**; only the
interface, the flow and the checks are new.

## The one idea

`src/lib/app.js` (the live app's UI script, 457 KB) is one closure. `build.py` cuts it at its boot line and pastes
every `src/ui/*.js` file **inside that closure**, in file-name order, just before the boot. So a `src/ui` file:

- sees every function and variable of the live app directly: `S`, `t()`, `esc()`, `cur()`, `fmt()`, `num()`,
  `clone()`, `buildOne()`, `buildProjectAll()`, `save()`, `toast()`, `assign()`, `zoneInfo()`, `colsOf()`,
  `colWidths()`, `cabKind()`, `typeName()`, `level()`, `wTxt()`, every legacy view function (`legsEditor(c)`,
  `backBlock(c)`, `frontsEditor(…)`, `jcModal(…)` …), the engine `E` (= `window.DBEngine`), `X`, `RM`, `DR`, `ISO`;
- **replaces** a live function by declaring one with the same name (the later declaration wins). The core replaces
  `render`, `refreshLive`, `save`. `build.py` prints the list of overrides. Override only when necessary.
- is not a module: no `import`/`export`, no top-level `return`. Top-level statements run once, before the first render.
  Write plain ES2017 (no optional chaining needed, but allowed — the target is current Chrome/Edge/Safari).
- must not contain the text `</script` (write `<\/script`).

`src/lib/*` and `legacy/*` are **read-only**. A newer live app is brought in by replacing `src/lib/`.

## Files

| File | Owner / content |
|---|---|
| `src/ui/00-core.js` | state `NV`, registries, `render()`, `refreshLive()`, `save()` (+undo), shell, `nvGo`, issue plumbing |
| `src/ui/00-tokens.css`, `01-shell.css`, `02-logo.css` | palette, shell, shared building blocks |
| `src/ui/10-checks.js` | `nvComputeIssues(proj, info)` — the check engine |
| `src/ui/20-home.js/.css` | start screen (`NVSTAGE.home`), new-cabinet chooser `nvPicker()` |
| `src/ui/30-editor.js/.css` | cabinet workspace (`NVSTAGE.cab`): strip, picture, inspector frame; topics `size`, `inside` |
| `src/ui/31-topics.js/.css` | topics `body`, `mats`, `addons`, `cnc`, `review`; box / panel / dishwasher variants |
| `src/ui/40-room.js`, `40-skin.css` | layout stage (`NVSTAGE.room`), settings (`NVSTAGE.set`), the re-skin of the live widgets |
| `src/ui/50-check.js/.css` | check stage (`NVSTAGE.chk`) |
| `src/ui/60-make.js/.css` | production stage (`NVSTAGE.res`, `.nest`, `.drw`) with the export gate |
| `src/ui/99-export.js` | `window.__nv` for tests |

Name every top-level function / variable of your file with your file's prefix so nothing collides
(checks `nvc…`, home `nvh…`, editor `nve…`, topics `nvt…`, room/skin `nvr…`, check stage `nvk…`, make `nvm…`).
`build.py` stops on a function declared twice inside `src/ui`.

## State and rendering

- `S` is the live app's state (see docs/map/app-core.md §3 and app-editor.md §2). `S.proj` the open project,
  `S.sel` the open cabinet index, `S.tab` the stage: `cab | room | chk | res | nest | drw | set`, `S.home`,
  `S.picking` (new-cabinet chooser), `S.colSel` (active column), `S._info[i] = { r, warnings, nProg }` the engine
  result of every cabinet (rebuilt on every full render), `S.jcheck` / `S.echeck` (joints / edges modal open).
- `NV` is the new interface's own state (never saved in the project): `NV.topic`, `NV.secSel`, `NV.view`, …
  Add your own fields under your prefix, e.g. `NV.mkAck`.
- `render()` = string → `app.innerHTML`, exactly as the live app: `NVSTAGE[S.tab](S._info)` returns the stage's HTML.
  After it: the live widgets are mounted by id (`#room` → DBRoom, `#assembly-preview` → DBAssembly 3-D, `#jc-iso`),
  focus is restored **by element id**, `NVAFTER` callbacks run, fields with issues are decorated, `NV.flash` is scrolled to.
- Every input keeps the live conventions, so the live binding engine does all the model work:
  - `data-bind="c.W"` (roots: `c.` current cabinet, `p.` project, `s.` settings, `pr.`/`pp.` prices), `data-num="1"`,
    `data-empty="1"`; **id must be `'f-' + bind.replace(/\./g,'-')`** (use the live helpers `fN fT fS seg segI chk dd` —
    docs/map/app-editor.md §4) and a binding must appear **only once on the page**.
  - `data-act="<command>" data-v data-i` runs a live command and re-renders. The full command list is in
    docs/map/app-events.md §5 — use them (`addsec`, `rmsec`, `mv`, `colsel`, `set`, `preset`, `dup`, `del`, `pick`,
    `jcopen`, `ecopen`, `plinth`, `ledadd`, `addx`, `zip`, …) instead of re-implementing them.
  - While typing, `refreshLive()` rebuilds the open cabinet and repaints only `[data-live="key"]` regions with
    `NVLIVE.key(c, inf, arg, el)`. Put every computed text/picture that should follow typing in such a region and
    never put an input inside one. Which changes trigger a full render is fixed by the live app
    (docs/map/app-events.md §2.3): checkboxes, selects, `seg` buttons and the listed number fields.
- New commands: `data-nv="name"` → `NVA.name(el, v, i, ev)` (then a full render unless it returns `false`);
  `data-nv-change="name"` → `NVC.name(el, ev)`. Do not put a `data-nv` element inside a `data-act` element or the reverse.
  After changing the model in an `NVA` command call `save()` (it also records the undo step).
- `nvGo({ tab, sel, topic, sec, col, field })` jumps; `<button data-nv="go" data-tab data-sel data-topic data-field>` is the same from markup.
- Texts: the live `t('key')` for existing labels (948 keys, docs/map/app-core.md appendix), `L('lietuviškai', 'English')` for new ones.
  Lithuanian is the main language; write natural workshop Lithuanian, short and concrete. Always `esc()` user text.
- Undo: `save()` records the whole project (bursts of typing fold together); Ctrl+Z / the ↶ button. Nothing to do per command.

## Issues (the check engine's contract)

`nvIssues()` → array of
```js
{ id: 'mat.carc',            // stable code of the rule
  sev: 'error' | 'todo' | 'warn' | 'info',   // error: stops production · todo: a confirmation still open (stops production)
                                             // warn: must be acknowledged before export · info: note
  cab: 2,                    // cabinet index, or -1 for the project
  topic: 'mats',             // topic of the cabinet workspace where it is fixed (size|inside|body|mats|addons|cnc|review), or null
  field: 'f-c-mat-carc',     // id of the input to flash, or null
  sec: 3, col: 1,            // optional: section index / column it belongs to
  msg: 'Nenurodyta karkaso medžiaga',        // in the current language, one short sentence
  hint: '…',                 // optional: what to do
  tab: 'room',               // optional: stage where it is fixed when not in the cabinet workspace
  act: { label, act|nv, v, i },              // optional one-click fix (a live data-act or a data-nv command)
  raw: '…' }                 // the engine's own text when the issue comes from the engine
```
Helpers: `nvIssuesFor(i)`, `nvCounts(list) → { error, todo, warn, info, block }`, `nvWorst(list)`.
Views show issues where they belong (topic state, cabinet card, the picture) and link them with `data-nv="go"`.

## Build, run, test

```
python3 build.py --check                         # → index.html, loaded once in headless Chrome
python3 build.py --out scratch/me/index.html --ui 30-editor,31-topics --check     # private build while others work
python3 tools/serve.py                           # http://127.0.0.1:8765/  (legacy snapshot at /legacy/)
python3 tools/jsrun.py test/engine/compare_ref.js   # engine regression (node-style tests run in Chrome; no node here)
```
`tools/cdp.py` drives a headless Chrome (click, type, drag, screenshot, console errors); `window.__nv` and
`window.__dbk` expose the internals to tests. Look at your screens: take screenshots and read them.
