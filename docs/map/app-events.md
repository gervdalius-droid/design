# app.js — events, commands, undo, widget mounts, import/export, boot

Slice: `src/lib/app.js` lines 2571–3227 (end of file; the file has 3227 lines).
All `file:line` references are to `src/lib/app.js` unless another file is named.
Statements marked **(verified live)** were checked against the running snapshot at `http://127.0.0.1:8765/legacy/` with headless Chrome.

Review pass 2026-11-24: the whole slice was re-read line by line against this report, every cited `file:line` was re-checked, the 104 `case` labels were diffed mechanically against the tables of §5.1 (no action missing, none invented), and these behaviours were re-run live: expression typing (`600-18` is a string in the model while typing, the number `582` after `change`), out-of-range revert with toast, live-only vs full-render fields, the joint/box undo wiping an untracked edit, the joints-check step gate, `save()` emptying the Room undo, `RM.ensure` creating the layout on the first Room mount, the 28 members of `window.__dbk`, the shape of `buildProjectAll()` and the CSV header.

Where the brief's deliverables are answered:

| Deliverable | Section |
|---|---|
| (1) event model, binding path syntax, `assign`, after-hooks, render vs `refreshLive`, debounce | §2, §3, §7 |
| (2) every `data-act` action | §5.1 (click), §5.2 (change), §5.3 (dispatcher rules) |
| (3) entry-time validation and what slips through | §4 |
| (4) mount contracts for DBAssembly / DBIso / DBRoom (+ DBRender, DBLook) | §9 |
| (5) undo scope and limits | §8 |
| (6) import formats and all export paths with file names | §10, §11 |
| (7) boot sequence, `window.__dbk`, artifact mode | §12 |
| (8) fragilities | §14, §15 |

Contents

1. Architecture in one page
2. Event model: how an input change travels
3. The binding engine (`target` / `assign` / `after`) and its dependent-field hooks
4. Entry-time validation (`numOrNull`, `NUM_LIMITS`, the `change` handler) and what slips through
5. Full command set: every `data-act` (click) and `data-act-change` (change) action
6. Keyboard, pointer and other global listeners
7. `refreshLive` — the partial update
8. Undo: scope and limits
9. Widget mount contracts (DBAssembly, DBIso, DBRoom, DBRender, DBLook)
10. Import (own JSON, offer-app JSON)
11. Export code paths and file naming
12. Boot sequence, persistence keys, `window.__dbk`, artifact mode, Back button
13. UI state inventory (`S.*`)
14. Dead code found in this slice
15. Fragilities a rewrite must be careful about

---

## 1. Architecture in one page

- One IIFE, one global mutable state object `S` (`:430`), one root element `#app` (`:801`).
- **Rendering is string concatenation into `app.innerHTML`** (`render()`, `:815–853`). Every full render:
  cancels a pending deferred redraw (`ptr.pending = null`, `:816`), rebuilds *every* cabinet through the engine (`buildOne(i)` for all `i`, `:826`), stores the results in `S._info[i] = { r, warnings, nProg }` (`:831`), writes `dbKurejas.ui` (`:830`), replaces the whole DOM (`:849`), then re-mounts the embedded widgets (`mountIso(); mountRoom(); mountAssembly(); mountJc();` `:850`), clamps long notes (`:851`) and restores focus **by element id + caret position** (captured at `:848`, restored at `:852`). On the home screen (`S.home`, or no project) it renders only the project list and returns early (`:818–823`) — no widgets, no engine build.
- **All interaction is event delegation on `#app`**: `focusin`, `focusout`, `input`, `change`, `keydown`, `click` (`:2797–2891`). The markup carries the wiring in attributes:

| Attribute | Meaning |
|---|---|
| `data-bind="<path>"` | two-way binding target (see §3). On `<input>`, `<select>`, `<textarea>`, checkbox; also on `data-act="set"` buttons |
| `data-num="1"` | the bound field is numeric → expression parsing + limits (§4) |
| `data-empty="1"` | an empty numeric field is legal and means "automatic" → stores `''` |
| `data-lines="1"` | textarea bound to a string array, one item per line (settings lists) |
| `data-prev` | set by code on `focusin`: the field's value when it got focus (revert target) |
| `data-act="<name>"` | click command (§5); `data-v` = string argument, `data-i` = numeric argument (`+attr`, **0 when absent**) |
| `data-act-change="<name>"` | change command for file inputs / selects that are not model bindings (§5.2) |
| `data-stop` | a click inside this element must not trigger the overlay's close action |
| `data-force` | on a close button inside a `data-stop` area: close anyway |
| `data-bkfront`, `data-nestw/h/g` | special change-handled fields (§5.2) |
| `data-plh`, `data-fgh` | SVG drag handles (plinth gaps / front gaps), handled by document-level pointer listeners at `:1056–1099` (outside this slice) |
| `data-mdmat`, `data-look` | material chip drag source / material-look row (drop + paste targets), `:1644–1718` |

- Field ids are derived from the binding: `id = 'f-' + bind.replace(/\./g, '-')` (`fN`/`fT`/`fS`/`chk`, `:943–948`). Focus restoration after a render depends on these ids being stable.
- Persistence is `localStorage` via `store(k, v)` (`:333`), which also calls `window.__dbkOnStore(k)` after each write (the cloud sync hook in `legacy/cloud.js`).

---

## 2. Event model: how an input change travels

### 2.1 Sequence for a typed field

```
focusin  (:2798)  → data-prev := el.value            (only [data-num][data-bind])
                  → if bind == 'c.W' and the cabinet has >1 column: colBase := { id, W, colW }   (:2799)
input    (:2800)  → per keystroke
                    1. special ids first: #np-name, #lib-q, #home-q            (:2801–2803)
                    2. no data-bind, checkbox or SELECT → ignored here (they act on 'change')
                    3. data-lines → setPath(S.settings, …, lines[]) + store settings; return (no render)
                    4. data-num → apply only if it parses AND is inside its limit (else: return, nothing happens)
                       • c.* (and p.*) store the RAW STRING (el.value), e.g. "600-18"
                       • pr.* / pp.* also receive el.value, but assign() converts it with the lenient num() at once
                       • s.* stores the parsed number
                       • empty + data-empty → assign(bind, '')
                    5. plain text → assign(bind, el.value)
                    6. cosmetic patches without render: aria-invalid for required / p.name,
                       the cabinet's name and W×H×D in the left list (:2812–2815)
                    7. after(bind, false) → persist + refreshLive()                (:2816)
change   (:2818)  → on blur / Enter / select / checkbox
                    1. data-act-change and special attributes first (§5.2)
                    2. checkbox → assign(bind, el.checked)
                    3. data-num → normalise: parse, round ints, clamp/revert, write NUMBER to the model,
                       rewrite el.value = E.num(n), set data-prev, toast when corrected (:2840–2847)
                    4. three settings text formats validated (marks lists, perLen) (:2848–2861)
                    5. else assign(bind, el.value)
                    6. decide full render vs live (regex list, :2863) → persist → later('render'|'live')
focusout (:2797)  → for c.W: colBase := null (in a 0 ms timeout, i.e. after the change event)
```

Key consequences:

- **There is no debounce on typing.** Every accepted keystroke runs `save()` (`:647`) — `JSON.stringify` of the whole project into `localStorage['dbKurejas.current']` — and `refreshLive()` (one engine build of the current cabinet + DOM patches + a 3D re-mount). The only timers are: `libTimer` 250 ms (copy into the project library, `:655`), `clibTimer` 300 ms (linked cabinet-library copies, `:651`), `VER.touched()` 60 s (version snapshot, `:578`), `NEST_TIMER` 450 ms (boards badge, `:858`), and DBAssembly's own 300 ms half-resolution "live" picture (`assembly.js:14`).
- **While typing, the model holds raw strings** such as `"600-18"` (verified live: `c.W === "600-18"`, `typeof === 'string'`); the engine reads everything through `engineDef()` → `num()` (`:689`, `:324`) so it evaluates the expression. On `change` the value becomes the number `582` and the field text is rewritten to `582` (verified live). Code that reads the cabinet record directly (e.g. `room.js:28 cabW = +(c.W) || 600`) sees `NaN → 600` for an expression until the field is left.
- **An invalid or out-of-range keystroke is silently not applied** (the preview keeps the previous value while the field shows the new text); the correction + toast only happens on `change`.

### 2.2 `after(bind, full)` (`:2723–2728`)

| Binding prefix | Persist | Then |
|---|---|---|
| `pr.` | nothing here (`assign` already called `prSave()`) | `render()` only if `full`; **never** `refreshLive` |
| `s.` | `store('dbKurejas.settings', S.settings); applyRules()` (pushes rules into the engine, `:445`) | `render()` if `full`, else `refreshLive()` |
| anything else (`c.`, `p.`, `pp.`) | `save()` | `render()` if `full`, else `refreshLive()` |

`after()` is called directly by the `input` handler (`full=false`) and by the `set` action (`full=true`). The `change` handler does **not** call `after()`; it repeats the same persistence inline and defers the redraw through `later()` (below).

### 2.3 Full render vs live update on `change` (`:2863–2865`)

`full` is true when **any** of these holds:

- binding starts with `pr.` or `pp.`
- binding matches `^c\.worktop\.`
- the element is a checkbox or a `<select>`
- binding ends with `.nDrawers`, `.nDoors`, `.shelves`, `.height`, `.frontH.<n>`, `.doorSplit`
- binding contains `cnc.joints.`
- binding matches `^c\.box\.`
- binding matches `^c\.(colW\.|W$|shelfSb$|cnc\.backInset$|cnc\.topOv[FSB]$|cnc\.fg\.)`
- binding matches `^c\.extras\.<n>\.`
- binding is `p.name`

Everything else (e.g. `c.H`, `c.D`, `c.thick`, `c.legH`, `c.name`, `c.mat.*`, `c.edge.*`, `c.cnc.railW`, `c.cnc.facadeT`, `c.sections.N.shelfPos.M`, all `s.*` text fields) only gets `refreshLive()` (verified live: changing `c.H`, `c.name`, `c.mat.carc` produces no `#app` re-render; changing `c.W` does).

This is a hand-maintained whitelist: a field whose change alters the structure of the editor but is not listed leaves stale markup until the next unrelated full render.

### 2.4 `later(kind)` / `flushLater()` — the deferred redraw (`:2867–2873`)

Problem solved: a field's `change` fires on the *mouse-down* of the next click. If the page were redrawn immediately the click would land on a detached node.

```js
var ptr = { down:false, pending:null };
function flushLater() { var p = ptr.pending; ptr.pending = null; if (p === 'render') render(); else if (p === 'live') refreshLive(); }
function later(kind) { ptr.pending = ptr.pending === 'render' || kind === 'render' ? 'render' : 'live'; if (!ptr.down) setTimeout(flushLater, 0); }
```

- `pointerdown` (capture, non-touch only) sets `ptr.down = true`; `pointerup` / `pointercancel` / window `blur` clear it and, if something is pending, schedule `flushLater` in a 0 ms timeout.
- `render()` itself starts with `ptr.pending = null` (`:816`) — "this redraw is the one that was waiting". So when the click that caused the blur runs an action that renders, the deferred render is cancelled.
- `'render'` wins over `'live'` when both are pending.
- With keyboard navigation (Tab/Enter) `ptr.down` is false, so the redraw happens in the next macrotask — *after focus has moved* — and `render()` then restores focus to the newly focused field by id.

### 2.5 Special-cased inputs that re-render on every keystroke (`:2801–2803`)

| id | State | Behaviour |
|---|---|---|
| `#np-name` (new project name, home) | `S.npName` | stores, clears `aria-invalid`; no render |
| `#lib-q` (cabinet-library search) | `S.libQ` | full `render()`, then re-focus + restore caret |
| `#home-q` (project search, home) | `S.homeQ` | full `render()`, then re-focus + restore caret |

---

## 3. The binding engine

### 3.1 Path syntax

`data-bind="<root>.<dotted.path>"`. `target(bind)` (`:2717–2722`) resolves the root:

| Prefix | Object | Notes |
|---|---|---|
| `c.` | `cur()` = `S.proj.cabinets[S.sel]` (`:685`) | the cabinet being edited; **index-based**, e.g. `c.sections.2.frontH.1`, `c.extras.0.L`, `c.box.inner.1.x`, `c.cnc.joints.<jointKey>.n` |
| `s.` | `S.settings` | workshop settings, e.g. `s.types.ŪKINĖ.back`, `s.ops.pins`, `s.rules.hinge.cupDepth`, `s.materials` |
| `p.` | `S.proj` | only `p.name` is used |
| `pp.` | `S.proj.pricing[key]` | handled before `target()`; value `''` or `num(raw)` (`:2738`) |
| `pr.` | module variable `PR` (admin price table, `localStorage['dbKurejas.pricing']`) | handled before `target()` (`:2730–2737`); path segments containing a dot are written with U+2024 (`․`) and decoded back; clearing a price restores its default from `prDefaults()` (or deletes a custom key, or sets `0` at top level); `'true'/'false'` → boolean; `pr.q.use` stays a string; everything else `num()` |

`setPath(o, p, v)` (`:340`) splits on `.`, **creates `{}` for every missing intermediate** (never an array) and assigns. `getPath` (`:339`) is the reader. Consequences: keys must not contain dots; a missing container addressed with a numeric key becomes an object with numeric keys (this is how `sections[i].frontH` is a map `{ "1": 720 }` by design, while `shelfPos`/`colW` are real arrays only because they are pre-created).

Bindings seen in a live scan of all ten presets plus extras/LED/worktop/box fronts (not exhaustive for every state, but representative):

- Cabinet scalars: `c.name`, `c.W`, `c.H`, `c.D`, `c.dishWidth`, `c.thick`, `c.legH`, `c.cols` (set), `c.colW.N`, `c.shelfSb` (set + number), `c.vis.L|R|B`, `c.pe.e1..e4` (panel edges)
- Materials: `c.mat.carc|facade|back|top`, `c.edge.carc|facade`
- Construction: `c.cnc.joinery` (set), `c.cnc.top`, `c.cnc.topMount`, `c.cnc.topOverFacade`, `c.cnc.topOvF|S|B`, `c.cnc.bottom`, `c.cnc.bottomZ`, `c.cnc.bottomD`, `c.cnc.sideFull` (virtual), `c.cnc.backs.N`, `c.cnc.backMount`, `c.cnc.backInset`, `c.cnc.backJoint` (virtual), `c.cnc.backCover.bottom`, `c.cnc.rails.front|back|bottom`, `c.cnc.railW`, `c.cnc.facadeT`, `c.cnc.fg.l|r|mid|top|bot`, `c.cnc.legs`, `c.cnc.support` (virtual), `c.cnc.legsX`, `c.cnc.legsY`
- Operations: `c.cnc.hinges`, `c.cnc.hingeFix`, `c.cnc.runnerMarks`, `c.cnc.tbOn` (virtual), `c.cnc.tbFront`, `c.cnc.pinsOn` (virtual), `c.cnc.pins`, `c.cnc.joints.<key>.type|n|e`
- Sections: `c.sections.N.fill|height|nDrawers|hw|rail|nDoors|hinge|hingeN|hingeSide|doorSplit|fridge|shelves|shelfAdj|shelfPos.M|frontH.M`
- Extras: `c.extras.N.name|L|W|T|qty|mat|e1..e4|gl|gr|gt|gb|yf|zb|side`
- LEDs: `c.leds.N.at|side|ends|from`
- Worktop: `c.worktop.on|mat|edge|T|over|left|right`
- 3D construction ("box"): `c.box.boards.<left|right|top|bottom|back|front>.on|inset|T`, `c.box.inner.N.x|z|T|col|adj`, `c.box.fronts.N.col|cell|span|inset|nDoors|nDrawers|hinge|hingeN|hingeSide|hw|rail`
- Project: `p.name`
- Settings: `s.types.<TYPE>.joinery|top|back|backFix|railFront|railBack|railBottom|topOverFacade|legs`, `s.ops.runnerMarks|tbFront|hinges|hingeFix|pins`, `s.railW`, `s.rules.drillsTop`, `s.rules.tbHole.d|depth`, `s.rules.ball.*`, `s.rules.under.*`, `s.rules.merivo.*`, `s.rules.hinge.*`, `s.rules.pins.*`, `s.materials`, `s.edges`, `s.worktops` (the last three `data-lines`)

### 3.2 `assign(bind, raw)` — generic behaviour (`:2729–2774`)

1. `pr.` and `pp.` handled and returned (above).
2. `v = raw`, except the strings `'true'` / `'false'` become booleans (`:2741`). **No other type conversion** in the generic path: a `set` button with `data-v="2"` or a `<select>` stores the string `"2"`.
3. A chain of special cases keyed by regular expressions on the binding string. Most of them `return` early (they replace the generic write); a few run *around* the generic `setPath(tg.obj, tg.path, v)` at `:2768`.

### 3.3 Dependent-field hooks inside `assign` (exhaustive)

| # | Line | Binding | What happens instead of / in addition to a plain write |
|---|---|---|---|
| 1 | 2742 | `c.extras.N.L`, `c.extras.N.zb` | if that extra is a side panel (`kind:'side'`), its `fit` is cleared (`''`) — a hand-typed size is kept, auto-fit stops. Then the generic write proceeds |
| 2 | 2743 | `c.cnc.tbOn` (virtual checkbox) | off: remember `cnc.tbPrev = cnc.tbFront` (unless already `'off'`), set `cnc.tbFront = 'off'`. on: `cnc.tbFront = cnc.tbPrev` or the settings default `S.settings.ops.tbFront` (if not `'off'`) or `'mark'`. `tbOn` itself is never stored |
| 3 | 2744 | `c.cnc.pinsOn` (virtual) | `cnc.pins = on ? (settings.ops.pins !== 'off' ? settings.ops.pins : 'shelf') : 'off'` |
| 4 | 2745–2747 | `c.type` | sets the type and **overwrites** the cabinet's `cnc.joinery, top, back, backFix, topOverFacade, legs`, `cnc.rails`, all `cnc.backs[]` (`legacyBack(type)`), `cnc.backMount` with the type defaults from settings; `ty.back === 'hdf'` → `cnc.back = 'top'`. No emitter of `c.type` exists in the current UI (see §14) |
| 5 | 2748–2749 | `c.sections.N.hw` (drawer hardware) | writes it, then if the section's `rail` length is not in `railLengths(hw)` (`:1851`) snaps `rail` to the nearest available length |
| 6 | 2750–2751 | `c.box.fronts.N.hw` | same snapping for 3D-construction drawer groups |
| 7 | 2752 | `c.box.fronts.N.hingeN` | `'auto'` → `''`, otherwise `+v` |
| 8 | 2753 | `c.box.fronts.N.(col\|cell\|span\|nDoors\|rail)` | stored as number (`+v \|\| 0`); changing `col` resets `cell = 0, span = 1`; changing `cell` resets `span = 1`; `span < 1` → 1 |
| 9 | 2754 | `c.sections.N.hingeN` | `'auto'` → `''`, otherwise `+v` |
| 10 | 2755–2757 | `c.sections.N.fridge` | on: remember `prevHinge`, `doorSplit = 'h'`, `hinge = 'BE FURNITŪROS'`, `shelves = 0`, `nDoors` = 1 or 2. off: `doorSplit = 'v'`, `hinge = prevHinge \|\| 'BLUM LANKSTAI'`, `shelves = 1` |
| 11 | 2758–2759 | `c.cnc.backJoint` (virtual select) | one fixing type for the back and all its partitions: for every joint key matching `^back(P\d)?$` in the last build (`S._info[S.sel].r.joints`) plus `'back'`, `setJoint(c, key, { type:v })` — **this discards hand-placed positions of those joints and does not push undo** |
| 12 | 2760–2761 | `c.cnc.sideFull` (virtual checkbox) | on: `cnc.bottom = 'inside'`, `cnc.bottomZ = 0`; off: `cnc.bottom = 'under'`. If `cnc.top === 'full'`: `cnc.topMount = on ? 'inside' : 'over'` |
| 13 | 2762 | `c.cnc.topMount = 'over'` while top is not full | forces `cnc.top = 'full'` (only a full top can sit on the sides) |
| 14 | 2763 | `c.cnc.top = 'full'` (from rails) | also sets `cnc.topMount = 'inside'` |
| 15 | 2764 | `c.cnc.support` (virtual: `none` / `legs` / `feet`) | `cnc.legs = v !== 'none'`, `cnc.feet = v === 'feet'` |
| 16 | 2765 | `c.cols` | no-op if unchanged; else `cols = +v`, `colW = []`, `fixCols(c)` (`:374`): equal column widths, one back per column, sections of a removed column move to the last column and remember `colWant` to return later |
| 17 | 2766 | `c.sections.N.(shelves\|rail)` with a digits-only string | converted to a number before the generic write |
| 18 | 2769 | `c.colW.N` (number) | after writing: if the last column would be `< 50` mm → error toast `colTooWide` (the value is still written; `colWidths()` then falls back to equal columns) |
| 19 | 2770–2772 | `c.W` on a multi-column cabinet | columns keep their proportions: scaled from `colBase` (widths when the W field got focus) or from the widths before this write; rounded to whole mm |
| 20 | 2773 | `c.W` or `c.colW.N` with `cols > 1` | `colW` is normalised through `colWidths(c)` (last column = remainder) and the read-only "last column" label `#colw-last` is patched in the DOM |

`setJoint(c, key, patch)` (`:2606–2614`) is the single writer of manual joint specs in `c.cnc.joints`:

```js
// patch: { side:null|'L'|'R', type, pos|null }
spec = p.pos ? { type:p.type, pos:p.pos.map(round to 0.1) } : { type:p.type }
side == null           → J[key] = spec                     // both sides alike
side == 'L' | 'R'      → { L:…, R:… }, the other side keeps what it had (a previously un-split entry is copied to it)
                         if JSON(L) === JSON(R) the entry collapses back to a single spec
```

Additional per-joint fields written through plain bindings (not `setJoint`): `c.cnc.joints.<key>.type`, `.n` (count), `.e` (edge distance).

---

## 4. Entry-time validation

### 4.1 Parsers

| Function | Where | Accepts | Rejects (→ `null`) |
|---|---|---|---|
| `numOrNull(v)` | `:2777–2782` | trims, removes all whitespace, `,` → `.`; plain number `^[-+]?(\d+\.?\d*\|\.\d+)$`; otherwise an **arithmetic expression** made only of `0-9 . + - * / ( )` containing a digit, evaluated with `Function('"use strict";return (…)')` after stripping leading zeros (`\b0+(\d)` → `$1`, avoids octal errors). Result must be a finite number | empty, letters, `1e3`, `10/0` (Infinity), syntax errors |
| `num(v)` | `:324–331` | same rules, but **lenient**: falls back to `parseFloat` (so `"600abc"` → 600) and finally to `0`; `null`/`''` → 0 | never rejects — used by the engine bridge and everywhere else |

Verified live on `c.W`: `600-18` → 582; `2*300+0,5` → 600.5; `600.` → 600; `abc`, `1e3`, empty → reverted to the previous value with toast "Netinkamas skaičius → 582"; `5`, `99999`, `-600` → reverted with "Leidžiama 50–6000 → 582".

There are two more private copies of the same parser: `numIn` in `assembly.js:227` and a `num` in `room.js`.

### 4.2 `NUM_LIMITS` (`:2783–2792`) — `[binding regex, min, max, whole number]`, first match wins

| Binding | Min | Max | Int |
|---|---|---|---|
| `c.W`, `c.H`, `c.D`, `c.dishWidth` | 50 | 6000 | |
| `c.W` when `cur().kind === 'panel'` (override in `numLimit`, `:2793`: W is the board thickness) | 3 | 100 | |
| `c.thick` | 6 | 60 | |
| `c.cnc.facadeT` | 6 | 60 | |
| `c.legH` | 0 | 400 | |
| `c.cnc.bottomZ`, `c.cnc.bottomD` | 0 | 2000 | |
| `c.leds.N.from` | 0 | 3000 | |
| `c.cnc.railW` | 30 | 400 | |
| `c.colW.N` | 50 | 6000 | |
| `c.shelfSb` | −150 | 150 | |
| `c.cnc.backInset` | 0 | 1000 | |
| `c.cnc.topOvF/S/B` | 0 | 300 | |
| `c.cnc.fg.l/r/mid/top` | 0 | 100 | |
| `c.cnc.fg.bot` | −1500 | 1500 | |
| `c.extras.N.gl/gr/gt/gb` | 0 | 500 | |
| `c.sections.N.nDrawers` | 1 | 12 | yes |
| `c.sections.N.nDoors` | 1 | 6 | yes |
| `c.sections.N.shelves` | 0 | 12 | yes |
| `c.sections.N.height` | 0 | 6000 | |
| `c.sections.N.frontH.M` | 0 | 3000 | |
| `c.sections.N.shelfPos.M` | 0 | 6000 | |
| `c.box.fronts.N.nDrawers` | 1 | 8 | yes |
| `c.box.boards.<id>.inset` | 0 | 3000 | |
| `c.box.boards.<id>.T`, `c.box.inner.N.T` | 3 | 60 | |
| `c.box.inner.N.x/z` | 0 | 6000 | |
| `c.worktop.T` | 6 | 120 | |
| `c.extras.N.L/W` | 1 | 6000 | |
| `c.extras.N.T` | 1 | 120 | |
| `c.extras.N.qty` | 0 | 999 | yes |
| `c.extras.N.zb` | −5000 | 5000 | |
| `c.extras.N.yf` | −300 | 300 | |
| `c.worktop.left/right` | 0 | 1000 | |
| `c.worktop.over` | −100 | 300 | |
| `c.cnc.joints.<key>.n` | 1 | 30 | yes |
| `c.cnc.joints.<key>.e` | 5 | 3000 | |
| `c.cnc.legs*` (any `legs…` key) | 0 | 6000 | |
| `s.railW` | 30 | 400 | |
| `s.rules.ball.midFrom/boxT` | 0 | 5000 | |
| `s.rules.under.ded/boxT` | 0 | 200 | |
| `s.rules.pins.extra/below` | 0 | 50 | |
| any other `s.rules.*` | 0.1 | 5000 | |
| `pr.*` | 0 | 1e6 | |
| `pp.*` | 0 | 1e7 | |

A numeric binding with **no** matching row has no range check at all (`numLimit` returns `null`). In the live scan every `data-num` field emitted today matched a row.

`ruleDefault(bind)` (`:2795`): for `s.rules.*` the factory default from `RULE_DEF` (`:343`), used as the fallback when a rule field is unparseable and has no previous value.

### 4.3 What the handlers do with it

`input` (`:2806–2810`), per keystroke:
- empty + `data-empty` → `assign(bind, '')`
- otherwise applied **only if** `numOrNull` succeeds **and** the value is not negative (unless the limit's min is negative) **and** it is inside `[min, max]`. Otherwise `return` — no assignment, no save, no refresh, no message. (Comment in code: "no 582 drawers on the way to 58, no 6 mm cabinet on the way to 600".)
- note: the integer flag is not applied while typing (`2.6` doors is written raw and rounded only on change).

`change` (`:2840–2847`), on leaving the field:
1. `n = numOrNull(value)`; if `null` → reason `numBad`, `n = previous value` (from `data-prev`) or `ruleDefault(bind)` or `max(0, lim.min)` or `0`.
2. integer limit → `Math.round(n)` (verified: `2.6` doors → 3).
3. out of range → reason `numRange` ("Leidžiama {a}–{b}"), `n = previous value if that is in range, else clamp to the nearest bound`. So an out-of-range entry **normally reverts** rather than clamps (verified: nDoors `9` → stays 3).
4. `assign(bind, n)`; `el.value = E.num(n)`; `data-prev = el.value`.
5. toast `"<reason> → <n>"` in the error style — visible 2.6 s, the only feedback.

Other entry checks in the `change` handler:

| Field | Line | Rule | On failure |
|---|---|---|---|
| `[data-bkfront]` (front face of an inside back, measured from the cabinet front; attribute value = max) | 2823–2827 | `0 ≤ value ≤ max` → `c.cnc.backInset = round((max − value)·10)/10`, `save()` | toast `numRange 0–max`; always `render()` |
| `[data-nestw]` / `[data-nesth]` (board size per material; attribute value = material name) | 2828–2831 | lenient `num()`; `300 ≤ v ≤ 6000` → `S.settings.boards[name].W\|H` | toast `nestBadSize`, `render()` |
| `[data-nestg]` (grain checkbox) | 2830 | `S.settings.boards[name].grain = checked` | — |
| `data-act-change="lookmm"` | 2836 | `20 ≤ v ≤ 10000` | field reset to stored mm (or 1000) + toast |
| `data-act-change="lookcol"` | 2835 | `^#[0-9a-f]{6}$` | silently ignored |
| `s.rules.merivo.marks`, `s.rules.under.marks` | 2848–2857 | list split on space/comma/semicolon; keeps numbers `> 0`; rewrites the field as `a, b, c` | nothing usable → factory default + toast `numBad`; some dropped → toast `numSome` |
| `s.rules.(ball\|under\|merivo).perLen` | 2858–2861 | each `;`/newline entry must be `<len>: n, n, n` | **value is stored anyway**, toast `perLenBad` |
| `p.name`, `[required]` | 2812–2813 | non-empty | only `aria-invalid="true"` styling; the empty name is stored |
| new-project name `#np-name` | 3075–3076 | non-empty | toast `npNeed`, focus, `aria-invalid` |
| admin PIN | 2934–2935, 2944–2945 | ≥ 4 characters, both fields equal | toast |

### 4.4 What silently accepts bad values (gaps)

- **No cross-field validation at entry.** Limits are per-field and generous (W/H/D 50–6000, thickness 6–60, 12 shelves…). Whether section heights fit the cabinet, whether a shelf position lies inside its section, whether fronts' own heights add up, whether a drawer runner fits the depth, etc. is only discovered afterwards as engine **warning strings** (`S._info[i].warnings`), shown in a collapsed "Gamybos patikra" `<details>` and as dots on steps. The only immediate cross-field message in this slice is `colTooWide` (`:2769`) — and the bad value is still written.
- **Out-of-range and unparseable entries revert with a 2.6 s toast** — easy to miss; while typing nothing indicates that the keystrokes are being ignored.
- **Free-text everywhere else**: cabinet/extra names, material and edge names (`<datalist>` suggestions only; a typo creates a new material), worktop material. Empty materials are flagged by step markers and "fix" chips in results, not blocked.
- **`set` buttons and `<select>`s are trusted**: values come straight from `data-v` / `option.value`, stored as strings (or booleans), no whitelist.
- **Exports are never blocked** by errors, unconfirmed joints/edges or missing materials: `download()` (`:3170`) just builds. Warnings travel along as `<base>_pastabos.txt` inside the ZIP.
- **Import of an own-format JSON is not validated** (verified live: `{app:'db-kurejas', cabinets:[{W:'abc', H:-5, sections:[{kind:'zzz'}]}]}` imports with the success toast "Įkelta spintelių: 1"; the project then has no name and the engine reports "netinkami matmenys").
- **Type looseness in the model**: numbers, numeric strings (`"2"` from selects/segmented buttons, raw text during typing), `''` for "automatic", booleans. Everything depends on `num()` at read time.
- **`perLen` rule strings** are stored even when malformed.
- **Different limits in different places for the same value**: cabinet width 50–6000 in the editor, 100–6000 in the Room panel (`room.js:1431`); joint count 1–30 in the field (`NUM_LIMITS`) but `jcn` ± buttons clamp to 1–8 (`:3042`); box board fields have their own table `BX_LIM` in `assembly.js:228`.
- **Changes arriving from the Room widget** (`onCab` patch, §9.3) are merged with `Object.assign` without passing through `NUM_LIMITS` (the room validates its own fields).

---

## 5. Full command set

### 5.1 `data-act` click actions (`:2891–3090`)

Dispatcher preamble:

```js
var el = e.target.closest('[data-act]'); if (!el) return;
var act = el.getAttribute('data-act'), v = el.getAttribute('data-v'), i = +el.getAttribute('data-i');   // i === 0 when data-i is absent
if (act === 'closeDrawer' && e.target.closest('[data-stop]') && el.classList.contains('overlay')) return;   // dead: nothing emits closeDrawer
if (act !== 'del' && act !== 'pnew' && act !== 'pdel' && act !== 'prreset' && act !== 'libdel') S.confirm = null;   // two-click confirmations survive only their own second click
switch (act) { … }
render();          // every case that ends with `break` falls to a full render; cases that `return` handle their own redraw
```

Legend: **Persist** = `save()` (project → `dbKurejas.current`, library copy after 250 ms) unless another store is named. **R** = ends in the common `render()`; **r** = calls `render()` itself; **–** = no render.

#### Navigation and view state

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `tab` | `v` = `cab\|room\|res\|nest\|drw\|set` | switch main tab, scroll to top | `S.tab`, `S.picking=false` | – (`dbKurejas.ui` is written by `render`) | R |
| `lang` | `v` = `lt\|en` | switch language | `S.lang` | `dbKurejas.lang` | R |
| `home` | | go to the project list; flushes the library copy first | `S.home=true`, `S.confirm=null` | `libSave()` now | R |
| `sel` | `i` cabinet index | select a cabinet in the left list | `S.sel`, `S.picking=false`, `S.iso=null`, `S.colSel=0`, `S.jcheck=false`, `S.echeck=false` | – | R |
| `pick` | | show the "new cabinet" preset picker instead of the editor | `S.picking=true` | – | R |
| `unpick` | | leave the picker | `S.picking=false` | – | R |
| `step` | `v` step key (`dims, build, boards, inner, secs, fronts, ops, joints, mats, extra`) | show one editor step. **Gate**: moving from at/before the joints step (`ops`, or `joints` for a 3D construction) to a later step while `jcNeeded(c, r)` and this cabinet was not asked yet in this session (`S.jcAsked[c.id]`) opens the joints-check modal and shows the error toast "Būtina patikrinti sujungimus" — once per cabinet per page load; the step still changes | `S.stepKey`, `S.jcAsked`, maybe `S.jcheck=true` | – | r, then smooth-scroll to top if the editor is above the viewport |
| `goto` | `v` element id (e.g. `st-ops`) | `gotoStep(v)` (`:919`): make that step current if hidden, scroll to it | `S.stepKey`, `S.gotoAt` | – | r (inside) |
| `colsel` | `v` column index | which column the section list shows | `S.colSel` | – | R |
| `fixcab` | `i` cabinet, `v` = `mats\|wt\|dims…` | from a problem chip in Results: open that cabinet and jump to the step (`wt` → focus `#f-c-worktop-mat`, falling back to `dims`) after 30 ms | `S.home=false`, `S.tab='cab'`, `S.sel`, `S.picking=false` | – | r |
| `fixname` | | focus the project-name field `#projname` | – | – | – |
| `rcedit` | `i` | from the Room checks bar: edit the cabinet at its problems step | `S.sel`, `S.tab='cab'`, `S.picking=false`, `S.iso=null`, `S.stepKey = box ? 'joints' : 'ops'` | – | R |
| `part` | `v` panel name | open a part in the Results part panel; on screens `< 900 px` scrolls to it after 60 ms | `S.part`, `S.ptab=0`, `S.partRef={cab,key}` | – | R |
| `ptab` | `v` | which program (1OP/2OP…) of the part is shown | `S.ptab` | – | R |
| `xside` | `v` = `L\|R` | cross-section side — **dead**, no emitter | `S.xside` | – | R |

#### Projects (home screen and header)

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `pcreate` | reads `#np-name` | create an empty project; empty name → toast + focus + `aria-invalid` | `newProject(name)` → `openProject` resets `S.proj, S.home=false, S.tab='cab', S.sel=0, S.part, S.iso, S.undo=[], S.roomUndo=[], S.roomSel, S.picking = !cabinets.length`; `S.npName=''` | `dbKurejas.current`, library | R |
| `pimport` | | clicks the hidden file input `#f-import` (→ `import`, §5.2) | – | – | – |
| `psample` | | open the built-in sample project (`sample()`, `:477`: three cabinets with "(pavyzdys)" materials) under a new id | as `openProject` | library | R |
| `popen` | `v` project id | open from the library; flushes the current one first (`libSave()`, `VER.flush()`) | as `openProject` | – | R |
| `pdup` | `v` project id | duplicate a library record: new id, name + `t('copySfx')`, `updated = now`; put first in the list | – | `dbKurejas.lib` | R |
| `pjson` | `v` project id | download the library record as `<name>_projektas.json` (§11) | – | – | – |
| `pnew` | | header "+ new project": flush current, go home with the name field focused | `S.home=true`, `S.focusNew=true`, `S.confirm=null` | `libSave()`, `VER.flush()` | R |
| `pver` | `v` project id or current | open the versions window `verOpen()` (`:596`, own DOM + click handler outside `#app`) | `VD.*` | – | – |
| `pdel` | `v` project id | **two-click delete** (`S.confirm = 'pdel'+v`, the button text changes to "sure?"); removes the library record; if it is the open project: `S.proj=null`, removes `dbKurejas.current`. No undo; version history in IndexedDB is not removed | `S.confirm`, `S.proj` | `dbKurejas.lib` | R |

#### Cabinets

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `preset` | `i` index into `PRESETS` (`:402`) | append `fromPreset(PRESETS[i])` and select it | `S.proj.cabinets`, `S.sel`, `S.picking=false` | save | R |
| `dup` | | clone the current cabinet: new `id`, `libId` removed, name via `copyName()` (`:2663`: "X (2)", "X (3)"…; an empty name stays empty); inserted right after; selected. No place in the room layout is created (the Room's own `onDup` does that) | `S.proj.cabinets`, `S.sel++` | save | R |
| `del` | | **two-click delete** (`S.confirm='del'`). Removes the current cabinet, selects the previous one, toast "Spintelė „n" pašalinta" with an **Undo button (6 s)** that re-inserts it at its index if the same project object is still open and the id is not present. Its `S.proj.layout.items[id]` entry is left behind | `S.proj.cabinets`, `S.sel`, `S.confirm` | save | r |
| `libsave` | | save the current cabinet into the cabinet library and **link** it (`c.libId`): later edits update the library copy (`clibSync`, 300 ms after each save) | `c.libId` | `dbKurejas.cablib`, save | R |
| `libunlink` | | remove the link | `delete c.libId` | save | R |
| `libadd` | `v` library item id | add a free copy (`normCab(clone(item.cab))`, new id, `libFrom`) and select it | `S.proj.cabinets`, `S.sel`, `S.picking=false` | save | R |
| `libcat` | `v` category name or `''` | filter the library list | `S.libCat` | – | R |
| `libnewcat` | reads `#lib-newcat` | add a category and select it | `S.libCat` | `dbKurejas.cablib` | R |
| `libcatdel` | `v` category | delete the category if no item uses it | `S.libCat` | `dbKurejas.cablib` | R |
| `libdel` | `v` item id | two-click delete (`S.confirm='libdel'+v`) of a library item; unlinks cabinets of the open project that point at it | `S.confirm`, `c.libId` | `dbKurejas.cablib`, save | R |
| `set` | `data-bind`, `v` | the generic segmented-button writer: `assign(bind, v); after(bind, true)` | whatever the binding addresses (§3) | per `after()` | r (always full) |

#### Sections, extras, LEDs, plinth, gaps

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `addsec` | `v` kind (`drawers\|doors\|open\|oven\|cargo…`), `i` column | append `newSection(v)` (`:358`) to that column | `c.sections`, `S.colSel` | save | R |
| `mv` | `i` section index, `v` = `±1` | swap the section with its neighbour **in the same column** | `c.sections` order | save | R (or – when at the end) |
| `rmsec` | `i` | remove the section; toast with **Undo (6 s)** that re-inserts it at `min(i, length)` in the cabinet found by id | `c.sections` | save | r |
| `fhreset` | `i` | forget hand-set front heights → equal fronts | `delete c.sections[i].frontH` | save | R |
| `shposreset` | `i` | shelves back to even spacing | `sections[i].shelfPos=[]`, `shelfMode='even'` | save | R |
| `ledadd` | `v` = `bottom\|top\|L\|R` | add an LED-profile groove: `{ at:v, side:(v==='bottom' && cabKind(c)==='PAKABINAMOS') ? 'out' : 'in', from:E.R.led.from, ends:'open', w:E.R.led.w, depth:E.R.led.depth }` | `c.leds` | save | R |
| `leddel` | `i` | remove it | `c.leds` | save | R |
| `addx` | `v` = `side\|plinth\|part` | add an extra part. `side`: `RM.ensure(S.proj)`; picks the free side (L, then R, else `''`); if the cabinet is placed on a wall → `RM.addSide(S.proj, c, side)` (sizes it from its place, may move neighbours; toast `rmSideShort` when there is not enough room) + `render()` and return; otherwise pushes `{ kind:'side', side, fit:'', name, L:H, W:D+facadeT, T:facadeT, qty:1, mat:facade\|\|carc, e1..e4:true, zb:0, yf:facadeT }`. `plinth`: `{ kind:'plinth', L: W − (2·thick if the bottom sits between the sides and there are no legs), W: max(40, legHeight + hb − 2), T:thick, qty:1, mat:facade\|\|carc, e1:true }`. `part`: `{ name, L:W, W:100, T:thick, qty:1, mat:carc }` | `c.extras`, maybe `S.proj.layout` | save | R / r |
| `rmx` | `i` | remove an extra; toast with **Undo (6 s)** | `c.extras` | save | r |
| `plinth` | `v` = `off` or on | segmented plinth switch: `off` removes the plinth extra (`plinthIdx`, `:978`); otherwise adds one if missing (`between:true` when the bottom is between the sides) | `c.extras` | save (only when changed) | R |
| `plinthpos` | `v` = `in` or other | plinth between the sides or under them: sets `between`; re-fits `L` and `W` only if they still had their automatic values; default `yf` 20 / 50 | plinth extra | save | R |
| `plfit` | `v` = `"<i>"` or `"<i>:off"` | plinth fitted by gaps: on → `between` (if the bottom is inside), `gl=1, gr=1, gt=4, gb=0`; off → delete `gl, gr, gt, gb` | `c.extras[i]` | save | R |
| `fgbot` | `v` = `reset` or `side` | front gaps: `reset` → `c.cnc.fg = {}`; otherwise `c.cnc.fg.bot = r.fgaps.botMin` (the fronts' bottom to the side's bottom) | `c.cnc.fg` | save | R |
| `camside` | `v` joint/side key | toggle which side a cam housing faces | `c.cnc.camOut[v]` | save | R |

#### 3D construction ("box" cabinets) — all push the joint/box undo first

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `boxadd` | `v` = `shelf\|part` | `pushUndo()`; `part`: a vertical partition `{ id, kind:'part', x: middle of the widest compartment }` (from `S._info[sel].r.box.comps`); `shelf`: `{ id, kind:'shelf', z: middle of the biggest free gap in column 0 − t/2, col:0, adj:false }`; `id` = max existing + 1 | `c.box.inner`, `S.undo` | save | R |
| `boxrm` | `i` | `pushUndo()`; remove inner board `i` | `c.box.inner` | save | R |
| `boxfadd` | `v` = `doors\|drawers\|cargo` | `pushUndo()`; switches the solid front board off (toast `bxFrontOff`); takes the first opening (`r.box.openings`) not covered by an existing front group; none free → **undo entry popped again**, error toast, nothing added; otherwise pushes `{ id, kind, col, cell, span:1, inset:false, … }` (drawers: `nDrawers:2, hw:'BLUM TANDEMBOX', rail:500`; cargo: `cargoHw:'CARGO DTC PURE PRO'`; doors: `nDoors: opening > 600 ? 2 : 1, hinge:'BLUM LANKSTAI', hingeSide:'auto', hingeN:''`); `c.cnc.hinges = c.cnc.hinges !== false` | `c.box.fronts`, `c.box.boards.front.on`, `c.cnc.hinges` | save | R |
| `boxfrm` | `i` | `pushUndo()`; remove front group `i` | `c.box.fronts` | save | R |
| `boxcover` | `v` corner key, `data-w` which board covers | `pushUndo()`; `c.box.cover[v] = data-w` | `c.box.cover` | save | R |
| `box3d` | | `DBAssembly.setBoards(true)`; `mountAssembly()`; scroll the 3D view into view | widget-internal view state | – | – |

#### Joints and edges checks

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `jcopen` | | open the joints-check modal (cab tab) | `S.jcheck=true`, `S.echeck=false` | – | R |
| `jcroom` | `i` | same, from the Room checks bar | `S.sel`, room selection, `S.jcSel=null`, `S.jcheck=true` | – | R |
| `jcclose` | | close (clicks inside `[data-stop]` are ignored unless the button has `data-force`) | `S.jcheck=false` | – | R |
| `jcsel` | `v` joint key | toggle the highlighted joint row/3D joint | `S.jcSel = {key, side:'L', idx:null}` or `null` | – | R |
| `jcn` | `v` joint key, `i` = `±1` | `pushUndo()`; set the connector **count**: `joints[v] = {…old (only if it was not split L/R), n: clamp(1..8, current count + i)}` and delete `pos` (hand positions are dropped; a per-side spec is replaced by a common one) | `c.cnc.joints[v]`, `S.undo` | save | R |
| `jreset` | `v` joint key | `pushUndo()`; back to automatic | `delete c.cnc.joints[v]` | save | R |
| `jc3d` | `v` joint key | close the modal and open that joint in the 3D editor | `S.jcheck=false`, `S.iso={key, side:'L', idx:null}`, `S.isoFocus=true` | – | R |
| `isosel` | `v` joint key | select a joint for 3D editing from the editor's joint rows; scrolls to `#iso3d \|\| #assembly-preview` | `S.iso`, `S.isoFocus=true` | – | r |
| `jcok` | | **confirm joints**: `c.jointsOk = jcSig(r)` (`:1205`: a string of every joint's key, type and positions on both sides, rounded to 0.1); toast | `c.jointsOk`, `S.jcheck=false` | save | R |
| `undo` | | `undoJoints()` (§8) | `c.cnc.joints`, `c.box`, `S.undo` | save | r (inside) |
| `ecopen` | | open the edges (banding) check modal | `S.echeck=true`, `S.jcheck=false` | – | R |
| `ecroom` | `i` | same, from the Room checks bar | `S.sel`, room selection, flags | – | R |
| `ecclose` | | close (same `data-stop` / `data-force` rule) | `S.echeck=false` | – | R |
| `ecview` | `v` = `front\|backv\|under\|zin\|zout\|exp\|fronts…` | camera presets / zoom ×1.3 (0.5–6) / toggles of the edges model | `S.ecView = { th, ph, zoom, exp, fronts }` | – | R |
| `ebk` | `v` panel key, `data-i` = `y0\|y1\|x0\|x1\|all\|reset` | edit edge banding of a part in the edges check. Ignored right after a model drag (`S.ecDrag`). `reset` → `delete c.ebEdit[key]`. Single edge cycles: not banded → carcass edge (`true`) → as the fronts (`'fac'`, not offered for front parts) → not banded (`false`). `all` toggles all four. A legacy whole-part `fac` flag is first converted to per-edge. Toast `ebNoMat` if the cabinet has no edge material at all | `c.ebEdit[key]` | save | R |
| `ecok` | | **confirm edges**: `c.edgesOk = ecSig(r)` (`:1223`: per panel a 4-char code of banded/front-banded edges); toast | `c.edgesOk`, `S.echeck=false` | save | R |
| `ebtog` / `ebreset` / `ebfac` | `v` edge (`ebtog`) | the same overrides from the Results part panel, on the cabinet owning `S.part` (`S.proj.cabinets[panel.cab − 1]`): toggle one edge / drop the override / toggle "band as the fronts" (when nothing is banded yet, `y0` is switched on with it) | `cabinet.ebEdit[panel.key]` | save | R |

#### Material looks and realistic picture

| Action | Args | What it does | State mutated | Persist | Render |
|---|---|---|---|---|---|
| `lookrot` | `v` material name | rotate the texture 90° | `S.proj.look[v].rot` | save (in `lookSet`, `:1719`) | r |
| `lookfit` | `v` | toggle "stretch to the board" vs tiled at a real size; ensures `mm` (default 1000) | `look[v].fit`, `.mm` | save | r |
| `lookrm` | `v` | remove photo and colour (the entry is deleted) | `look[v]` | save | r |
| `lookpaste` | `v` | read an image from the clipboard (`navigator.clipboard.read`), or arm "next Ctrl+V goes to this material" for 60 s (`S.lookPasteTo`) | `S.lookPasteTo`, later `look[v].tex` | via `lookTexture` | – |
| `rrcab` | | realistic picture of this cabinet alone: builds a temporary one-wall project and calls `DBRender.open` (§9.4) | – | – | – |

#### Results, programs, downloads

| Action | Args | What it does | State | Render |
|---|---|---|---|---|
| `dl` | `v` = `zip\|xlsm\|csv` | `download(v)` (§11) | `S.busy` during zip/xlsm | – |
| `dlprog` | `v` program file name | `stopPropagation()`; `saveProgs([v])` | – | – |
| `dlpart` | `v` part name | all programs of that part | – | – |
| `dlcab` | `v` cabinet number | all programs of that cabinet | – | – |
| `dlall` | | every `.XXL` as a separate download | – | – |
| `copy` | | copy the text of `#progtext` to the clipboard (fallback: select it) | – | – |
| `print` | | `window.print()` (button not rendered in artifact mode) | – | – |
| `nestopen` | | `nestHandoff()` (`:2299`): build the report workbook, store it in `localStorage['dbNestHandoff'] = { name, b64, at }`, open `/nesting/?from=builder` in a new window (opened blank before the async build so it is not popup-blocked) | – | – |

#### Drawings

| Action | Args | What it does | State | Persist | Render |
|---|---|---|---|---|---|
| `drwcab` | | go to Drawings filtered to the current cabinet | `S.tab='drw'`, `S.drwOnly='c:'+id`, `S.drwOpen=null` | – | R |
| `drwpaper` | `v` = `A3\|A4` | paper size | `S.drwPaper` | `dbKurejas.paper` | R |
| `drwopen` | `i` sheet index | open the sheet preview overlay | `S.drwOpen` | – | R |
| `drwclose` | | close it (clicks inside `[data-stop]` ignored when the overlay itself is the target) | `S.drwOpen=null` | – | R |
| `drwnav` | `v` = `±1` | previous / next sheet (clamped) | `S.drwOpen` | – | R |
| `drwpdf` | | all shown sheets as one PDF (§11) | – | – | – |
| `drwpdf1` | `i` | one sheet as PDF | – | – | – |

#### Settings and admin (prices)

| Action | Args | What it does | State | Persist | Render |
|---|---|---|---|---|---|
| `resetrules` | | hinge and shelf-pin rules back to `RULE_DEF`; toast with **Undo (6 s)** | `S.settings.rules.hinge`, `.pins` | `dbKurejas.settings`, `applyRules()` | r |
| `tplreset` | | forget the user's report template | `S.tplB64=null`, `S.tplName=''` | removes `dbKurejas.reportTpl` | R |
| `adminset` | reads `#adm-pin`, `#adm-pin2` | first-time PIN (≥ 4 chars, both equal) → `pinHash` (`:1992`) | `S.admin=true` | `dbKurejas.adminPin` (hash), `sessionStorage['dbKurejas.admin']` | r (async) |
| `adminunlock` | reads `#adm-pin` | compare the hash; wrong → toast, clear, focus | `S.admin=true` | `sessionStorage` | r (async) |
| `adminlock` | | hide prices | `S.admin=false`, `S.pinChange=false` | removes the session key | R |
| `adminpin` | | (admin only) toggle the change-PIN form, focus `#adm-npin` | `S.pinChange` | – | r |
| `adminpincancel` | | close that form | `S.pinChange=false` | – | R |
| `adminpinsave` | reads `#adm-npin`, `#adm-npin2` | (admin only) store the new PIN hash; storage failure → `saveFailed()` | `S.pinChange=false` | `dbKurejas.adminPin`, session | r (async) |
| `primport` | | (admin only) take prices from the **offer app's state in this browser**: `localStorage['dedesBaldai.calc.v1']` → `prFromOffer()` (`:2157`); toast with the count | `PR` | `dbKurejas.pricing` | R |
| `prreset` | | (admin only) two-click (`S.confirm='prreset'`, announced by a toast, no button text change): all prices to defaults | `PR = prDefaults()` | `dbKurejas.pricing` | R |

Total: **104 `case` labels** in the switch (102 handler bodies — `ebtog` / `ebreset` / `ebfac` share one). All 104 are listed above (diffed mechanically against the source). Emitters: 102 of them appear literally as `data-act="…"` in the markup strings; `adminset` / `adminunlock` are emitted through a computed attribute (`:2122`, `hasPin ? 'adminunlock' : 'adminset'`). Actions referenced by code but never emitted: `closeDrawer` (only the pre-check at `:2894`), `xside` (only queried by `syncXsec`).

### 5.3 Dispatcher rules that apply to every command

- **One listener, on `#app`** (`:2891`). The acting element is `e.target.closest('[data-act]')` — the *nearest* ancestor with the attribute, so a button inside an overlay that itself carries `data-act` (drawings preview `drwover`, the check modals) wins over the overlay. The overlays' close actions (`drwclose`, `jcclose`, `ecclose`) protect their content with `e.target.closest('[data-stop]')`.
- **Arguments are strings from attributes**: `v = data-v` (string or `null`), `i = +data-i` (so **0 when the attribute is absent**, `NaN` when it is not numeric — `ebk` reuses `data-i` for `y0|y1|x0|x1|all|reset` and re-reads it as a string). `boxcover` has a third argument, `data-w`.
- **Default ending is a full `render()`** (`:3089`): every case that ends with `break` — including pure view-state changes (`tab`, `colsel`, `jcsel`, `ecview`, `drwnav`…) — rebuilds all cabinets and replaces the DOM. An element with an **unknown** `data-act` value also clears `S.confirm` and triggers a full render (the switch has no `default`).
- **`S.confirm` is cleared by every click on any `[data-act]`** except `del`, `pnew`, `pdel`, `prreset`, `libdel` (`:2895`). That is the whole "are you sure?" mechanism: the first click stores a token, the render shows the button in its confirm state, any other command cancels it. The Room's delete (`'rmdel' + i`, set by `onDelete`) uses the same field and is cancelled the same way.
- **No command checks its preconditions centrally.** Most cases assume `cur()` exists and many read `S._info[S.sel].r` from the last render (`boxadd`, `boxfadd`, `fgbot`, `jcn`, `jcok`, `ecok`, `ebk`, `rrcab`); they are safe only because the buttons are rendered solely when that state exists.
- **Widget-internal clicks do not use `data-act`** (`room.js`, `assembly.js`, `iso.js` attach their own listeners and never emit the attribute), with two exceptions that are rendered *by the app* inside a widget and therefore go through this dispatcher: the material-look block (`lookHTML` → `lookrot`, `lookfit`, `lookrm`, `lookpaste` and the `looktex` / `lookcol` / `lookmm` change commands) shown in the Room side panel, and `colsel` emitted by `front.js:147` as invisible hit rectangles over the columns of the editor's front sketch (suppressed with `noHit:true` in the Room's `frontArt`).
- **Commands that write the model without `save()`**: none in the switch, but `tab`, `sel`, `step` etc. persist only UI state through `render()` → `dbKurejas.ui` (`{ id, tab, sel }`; the current step is not remembered across reloads).
- **Commands by persistence target** (for a command bus in the new version): project (`save()`): `preset, dup, del, libsave, libunlink, libdel*, libadd, ledadd, leddel, shposreset, addsec, mv, fhreset, rmsec, addx, plfit, fgbot, camside, plinthpos, plinth, rmx, jreset, jcn, jcok, ecok, ebk, ebtog, ebreset, ebfac, boxadd, boxrm, boxfadd, boxfrm, boxcover, set (c./p. bindings), look*`; project library (`dbKurejas.lib`): `pcreate, psample, pdup, pdel, popen/pnew/home (flush)`; cabinet library (`dbKurejas.cablib`): `libsave, libnewcat, libcatdel, libdel`, change `libmove`; settings (`dbKurejas.settings`): `resetrules`, `set` with `s.` bindings, the nest board fields; prices (`dbKurejas.pricing`): `primport, prreset`, `pr.` bindings; other keys: `lang`, `drwpaper`, `tplreset`, `adminset/adminpinsave/adminunlock/adminlock`; no persistence: all navigation, modal and download commands.

### 5.2 `change`-event commands (`:2820–2836`)

| Trigger | What it does |
|---|---|
| `data-act-change="import"` (`#f-import`, accept `.json`) | `importFile(file)` (§10) |
| `data-act-change="tpl"` (`#f-tpl`, accept `.xlsm,.xlsx`) | `loadTemplateFile(file)` (`:670`): must be a zip whose `xl/workbook.xml` has sheets named `PARTLIST` and `LABEL`; stored base64 in `S.tplB64` + `localStorage['dbKurejas.reportTpl']` (kept for the session only if storage is full) |
| `data-act-change="prjson"` (`#f-prjson`, admin only) | read an offer-app JSON file → `prFromOffer(JSON)` → `prSave()`, `render()`, toast with count |
| `[data-bkfront]` | inside-back position (§4.3) |
| `[data-nestw]`, `[data-nesth]`, `[data-nestg]` | board size / grain per material → `S.settings.boards[name] = { W, H, grain }`, stored in settings (§4.3) |
| `data-act-change="libmove"` (select per library item, `data-v` = item id) | move the item to another category → `dbKurejas.cablib` |
| `data-act-change="drwonly"` (`#drw-only`) | drawings filter: `all`, `furn`, or `c:<cabinet id>` → `S.drwOnly`, `S.drwOpen=null` |
| `data-act-change="looktex"` (file input, `data-v` = material) | `lookTexture(name, file)` (`:1738`): trims plain margins, shrinks to ≤ 1280 px JPEG data URL → `S.proj.look[name].tex` |
| `data-act-change="lookcol"` (`<input type=color>`) | `look[name].color = value`, `tex = ''` |
| `data-act-change="lookmm"` | tile size in mm (20–10000) |
| any `[data-bind]` | the binding path of §2 |

---

## 6. Keyboard, pointer and other global listeners

| Listener | Line | Behaviour |
|---|---|---|
| `app` `keydown` Enter in `input[type=text]` | 2878–2883 | "Enter → next field (as in the offer app)": blur the field (which fires `change`), focus + select the next `input[type=text]` in DOM order of the whole `#app` (re-resolved by id because the blur may have re-rendered), `preventDefault` |
| `app` `keydown` Enter/Space on an element with `data-act="part"` | 2884 | activates it (part rows are not buttons) |
| `app` `keydown` Enter in `#np-name` | 2885 | clicks `[data-act=pcreate]` |
| `document` `keydown` in Drawings with a sheet open, not in a field | 2875–2877 | `Escape` closes, `ArrowLeft/Right` page; re-render; focus the primary button of the preview |
| `document` `keydown` Ctrl/Cmd+Z (no Shift), not in INPUT/SELECT/TEXTAREA, not on the home screen | 2887–2890 | tab `cab` → `undoJoints()`; tab `room` → `roomUndo()`; `preventDefault` only if something was undone. No redo |
| `document` `toggle` (capture) on `<details>` | 2874 | remembers open state: `.pricecard` → `S.prOpen`, `.technical-preview` → `S.techOpen`, `.preview-warnings` → `S.warnOpen`, `#st-constr` → `S.constrOpen` |
| `document` `pointerdown` / `pointerup` / `pointercancel` (capture), `window` `blur` | 2871–2873 | the `ptr.down` bookkeeping for `later()` (§2.4) |
| `app` `focusin` / `focusout` | 2797–2799 | `data-prev`, `colBase` (§2.1) |

Listeners elsewhere in `app.js` that also mutate the model (outside this slice, listed so the event picture is complete): plinth-gap and front-gap SVG drag handles (`:1056–1099`, write `c.extras[plinth].gl/gr/gt/gb` or `c.cnc.fg.<k>` on pointer-up, then `save(); render()`); edges-model orbit/zoom (`:1266–1272`, `S.ecView`, `S.ecDrag`); material chip drag-and-drop onto the 3D preview (`:1644–1663`, `DBAssembly.pickAt(x, y)` → `dropMat(c, part, name)`); image paste / drop onto a material-look row (`:1707–1718`); step highlight on scroll (`:930`); `visibilitychange` / `pagehide` → `VER.flush()` (`:580–581`); the versions dialog's own click handler (`:605`).

### `toast(msg, err, actLabel, actFn)` (`:3091–3098`)

- A single `<div id="toast" role="status">` appended to `<body>` on first use; class `toast` + ` err` for errors.
- Optional action button (`.toast-act`, text `↶ <label>`): clicking hides the toast and runs `actFn`.
- Auto-hides after **2600 ms**, or **6000 ms** when it carries an action.
- A new toast **replaces** the previous one (including its Undo button). There is no queue and no persistent message area.

---

## 7. `refreshLive()` — the partial update (`:2571–2593`)

Runs only when `!S.home && S.tab === 'cab' && !S.picking && cur()`; otherwise returns immediately (so on the Settings tab typing persists but redraws nothing).

1. `S._info[S.sel] = buildOne(S.sel)` — one engine build (the other cabinets' cached results are untouched).
2. Patches these DOM nodes if present:

| Node | Content |
|---|---|
| `#sketch` | `sketchOf(cur())` (2D front sketch / `DBFront.svg` for a box) |
| `#xsec` | cross-section SVG — **never present** in the current markup (dead) |
| 3D | `mountIso()` (dead, no `#iso3d`) and `mountAssembly(true)` (`live:true` → half-resolution picture for 300 ms) |
| `#warns` | the warnings list (`level()` → `bad\|warn\|info` tags, text through `wTxt()`) |
| `.paper .tb` | title block: number · name, W×H×D |
| `#colmap` | column map (`colMapInner`) unless dishwasher |
| `.stepnav` | re-rendered through `stepNav(c, inf)`, keeping the currently lit step |
| `.cab.on b .dot` | red/amber dot of this cabinet in the left list |
| `.wtblk .h` | worktop size from `E.worktopOf(engineDef(c))` |
| `[data-fill-h]`, `.fronts[data-i]` | `liveSections(c)` (`:1941`): fill-section heights, real front heights, placeholders, "own height" markers, the equal-heights reset button |
| `.tabs [data-v="res"] .cnt` | parts count |
| `.preview-warnings > summary > span` | warnings count |
| `#pricecard-wrap` | `priceCard(c, inf)` |
| `.zone[data-col]` | per-column height budget (`zoneInfo`) and its `over` class |

What it does **not** update: any other field's value/placeholder/min-max attribute in the editor, enabled/disabled states, section list structure, the banners for unconfirmed joints/edges, the left-list price, and the plinth auto-fit sync that `render()` performs (`:827–829`). Those become current only at the next full render.

---

## 8. Undo: scope and limits

### 8.1 Joint / 3D-construction undo (Cabinets tab) — `S.undo` (`:2596–2603`)

```js
function pushUndo()   { push { id:c.id, joints:clone(c.cnc.joints || {}), box:c.box ? clone(c.box) : null }; cap 40 (oldest dropped) }
function canUndo()    { any entry for the current cabinet id }
function undoJoints() { newest entry for the current cabinet: c.cnc.joints = entry.joints; if (entry.box) c.box = entry.box; remove entry; save(); render(); toast(t('isoUndone')) }
```

- **Scope**: only `c.cnc.joints` and (for 3D constructions) the whole `c.box` object. Nothing else on the cabinet.
- **Pushed by**: DBAssembly callbacks `onCommit`, `onReset`, `onBox`, `onFillMissing`; DBIso callbacks `onCommit`, `onReset` (joints-check modal); actions `boxadd`, `boxrm`, `boxfadd`, `boxfrm`, `boxcover`, `jreset`, `jcn`.
- **Not pushed by** (but they change the same data): plain bindings `c.cnc.joints.<key>.type|n|e`, `c.box.boards.*`, `c.box.inner.*`, `c.box.fronts.*`; the virtual `c.cnc.backJoint` (which calls `setJoint` for several joints).
- **Snapshot semantics, not operation semantics**: an undo restores the state from *before the last tracked action*, wiping any untracked edit made since. Verified live: add a shelf (tracked) → type back inset 25 (untracked) → Ctrl+Z ⇒ the shelf is gone **and** the inset is back to 0.
- One stack for all cabinets, 40 entries total, looked up per cabinet id; in memory only; cleared by `openProject` (`:663`). No redo.
- Triggers: Ctrl/Cmd+Z on the Cabinets tab (not while a field has focus), the widget's own undo buttons (`onUndo`), the `undo` action. The buttons are enabled by `canUndo()` passed at mount time.

### 8.2 Room undo — `S.roomUndo` (`:2662–2672`)

- `roomUndoPush()` stores `clone(S.proj)` — **the entire project** (all cabinets, layout and the material-look textures as data URLs) — cap 40.
- Pushed by every Room callback that changes data: `onLayout`, `onFlip`, `onCab`, `onAdd`, `onDup`, `onDelete`.
- `roomUndo()` pops, replaces `S.proj`, but **keeps the current project name and `pricing`**; re-normalises cabinets (`normCab`), re-syncs the room selection by cabinet id (`roomSelSync`), clamps `S.sel`, `save(); render(); toast`.
- **Invalidated by any save made outside the Room tab**: `save()` empties `S.roomUndo` when `S.tab !== 'room'` (`:652`, verified live). Also cleared by `openProject`.
- Triggers: Ctrl/Cmd+Z on the Room tab, the Room's undo button (`onUndo`; enabled by `canUndo: S.roomUndo.length > 0`).

### 8.3 Toast undo (6 seconds)

`del` (cabinet), `rmsec` (section), `rmx` (extra part), `resetrules`. Lost as soon as any other toast appears or the 6 s pass.

### 8.4 Everything else

- No undo for dimension, section, material, operation or settings edits, for `dup`, `preset`, `libadd`, for project deletion, or for edits in the Results tab (edge overrides).
- Safety net outside this slice: the **version history** `VER` (`:542–585`, IndexedDB `dbKurejasVersions`): `save()` → `VER.touched()` → an automatic snapshot 60 s after editing stops, on tab hide / page hide, and before switching projects (`VER.flush()`); consecutive automatic snapshots within 15 minutes overwrite each other. Restore is per whole project.
- Text fields keep the browser's native undo while focused (Ctrl+Z is deliberately not intercepted inside INPUT/SELECT/TEXTAREA).

---

## 9. Widget mount contracts

All four mounts are called after every full render (`:850`); `refreshLive` calls `mountIso()` and `mountAssembly(true)`. Each looks up its host element by id and returns silently if it is absent. The widgets keep their own view state in module-level variables (camera, mode, selection), so re-mounting does not reset the view.

### 9.1 `mountAssembly(live)` → `window.DBAssembly.mount` (`:2621–2630`; `assembly.js:12`, `:475`)

Host: `<div id="assembly-preview">` (the 3D view at the top of the preview column, `viewSheet` `:1968`). This is **the** 3D view and joint/board editor of the current UI.

```js
window.DBAssembly.mount(el, cur(), S._info[S.sel].r, S.lang, hooks)
// The export wrapper first replaces el with el.cloneNode(false) (drops all old listeners), then calls the internal mount.
```

| Hook | Value passed | Purpose |
|---|---|---|
| `t` | `tJ` (`:1374`) | joint label lookup: `t('jk_' + key)`; for box joints (`jk_b_…`) the engine's own label |
| `canUndo` | `canUndo()` | enables the widget's undo buttons |
| `select` | `S.isoFocus ? S.iso : null` | `{ key, side }` → the widget enters joint-edit mode on that joint ("edit in 3D" from a joint row). `S.isoFocus` is reset to `false` in a 0 ms timeout after each mount, so it applies to exactly one mount |
| `live` | `!!live` | typing in progress → quick half-resolution frame now, sharp frame after 300 ms |
| `toast` | `m => toast(m, true)` | widget messages (always error style) |
| `onCommit(key, patch, selection)` | `pushUndo(); setJoint(cur(), key, patch); S.iso = selection; save(); render();` | `patch = { side:null\|'L'\|'R', type, pos:[mm…] \| null }`; `selection = { key, side, idx }`. The widget validates positions before calling (edge distance ≥ 12 mm cam / 9 mm other, spacing ≥ 24 / 16 mm, room for the cam's paired dowel) |
| `onReset(key, side)` | `pushUndo()`; with a side: `setJoint(cur(), key, { side, pos:null })` (that side back to automatic — note: no `type` in the patch); without: `delete cur().cnc.joints[key]`; `S.iso = { key, side, idx:null }`; `save(); render()` | |
| `onUndo()` | `undoJoints()` | |
| `onBox(fn)` | `pushUndo(); fn(cur()); save(); render();` | the widget passes a **mutator function** that edits `c.box` directly (toggle a board, flip a corner cover, add/delete/move an inner shelf or partition, change `inset`/`T`/`x`/`z`/`col`/`adj`). Field values are range-checked inside the widget (`BX_LIM`, `assembly.js:228`) |
| `onFillMissing()` | for every joint side in `r.joints` whose `pos` is empty: `setJoint(cur(), key, { side: single ? null : side, type, pos:null })` after one `pushUndo()`; `save(); render()` | "put connectors back where there are none" |

Returns nothing. Other API used by the app: `DBAssembly.setBoards(true)` (switch to board-editing mode, action `box3d`), `DBAssembly.pickAt(clientX, clientY)` (which part is under the pointer, for material drag-and-drop), `DBAssembly.view` (shared view state object).

Data flowing back always lands in `cur().cnc.joints` (through `setJoint`) or `cur().box` (through the mutator), followed by `save(); render()` — a full rebuild of all cabinets and a re-mount.

### 9.2 `mountJc()` and `mountIso(focus)` → `ISO.attach` (`window.DBIso`, `iso.js:388`)

`mountJc` (`:2632–2643`) — host `#jc-iso` inside the joints-check modal (`jcModal`, `:1339`). `mountIso` (`:2644–2659`) — host `#iso3d`, which **the current markup never emits** (dead; kept for reference because it documents the fullest contract).

```js
ISO.attach(el, {
  r,                               // the engine result of the current cabinet (needs r.seams, r.joints)
  sel,                             // S.jcSel (modal) or S.iso: { key, side:'L'|'R', idx:number|null } | null
  t,                               // translation function
  legH: c.cnc.legs ? num(c.legH) || 0 : 0,
  canUndo: canUndo(),
  focusStage: false | !!focus,     // whether to move keyboard focus onto the 3D stage
  toast,
  mode: store('dbKurejas.isoMode') || 'both',
  onMode(m)                 → store('dbKurejas.isoMode', m)
  onSelect(sel|null)        → modal: S.jcSel = sel; render(); scroll the matching .jc-row[data-jck] into view
                              iso3d: S.iso = sel; sync S.xside to sel.side; mountIso(true) (no full render)
  onCommit(key, patch, meta)→ pushUndo(); setJoint(cur(), key, patch);
                              selection := meta.sel if meta.sel !== undefined; save(); render(); toast(meta.msg) if any
  onReset(key)              → pushUndo(); delete cur().cnc.joints[key]; selection := { key, idx:null }; save(); render()
  onUndo()                  → undoJoints()
})
```

- `patch` is the same shape as for DBAssembly; `iso.js:193` sends `side:null` for joints that are not per-side. `meta` = `{ sel?, msg? }` (e.g. "copy this side to the other" sends `{ sel:{…}, msg:T('isoCopied') }`).
- If `r.seams` is empty: the modal host is hidden (`display:none`); `#iso3d` would show the note `t('isoNoJ')`.
- A selection whose joint key no longer exists in `r.joints` is dropped before attaching.
- Other DBIso API used by the app: `ISO.sym(type)` — the small connector icon put into segmented buttons (`segI`, `:946`).

### 9.3 `mountRoom(focus)` → `RM.attach` (`window.DBRoom`, `:2673–2714`)

Host: `<div class="room" id="room">` (Room / "Baldai" tab, `:843`).

Before attaching: `if (RM.ensure(S.proj)) save();` — `ensure` (`room.js:293`) creates `S.proj.layout` (`{ walls:[{len}], wallZ:1450, roomH:2600, worktop:true, items:{ <cabId>:{ wall, x, z? } }, openings:[], points:[] }`) and gives every cabinet without a place one; returns true when it changed something. So **opening the Room tab can modify and save the project**. Then `roomSelSync()`.

```js
RM.attach(el, {
  proj: S.proj,                    // the live project object (the widget reads it; it mutates only through callbacks)
  infos: S._info || [],            // engine results per cabinet
  sel: S.roomSel,                  // selected cabinet index | null
  t, toast,
  presets: roomPresets(),          // [{ i, name, icon, W, H, D, type, dish, legs, legH:100, panel }] from PRESETS (:2665)
  canUndo: S.roomUndo.length > 0,
  focusStage: !!focus,
  confirmDel: S.confirm === 'rmdel' + S.roomSel,      // the delete button is in its "sure?" state
  lookHTML(i)   → HTML of the material-look block for cabinet i (or for all cabinets when i == null)
  frontArt(i)   → { svg, vbH, … } front-view artwork of cabinet i from frontArtOf(), or null (panels, empty results)
  mats: pickMats,                  // () → material names: those with a look first, then used ones, then settings.materials
  onMat(c, part, name) → setMatOf(c, part, name) [c.mat[part] = name or c.worktop.mat; save(); render()]; returns S._info
  onSelect(i|null)     → setRoomSel(i); S.confirm = null; if (i != null) S.sel = i; mountRoom(true)      // no full render
  onLayout(fn, o)      → roomUndoPush(); fn(S.proj); if (o.sel !== undefined) setRoomSel(o.sel); save(); render();
                         if (o.focus) mountRoom(true); if (o.msg) toast(o.msg)
  onCab(i, patch, after) → roomUndoPush(); (see below); save(); render()
  onFlip(i, sec, box, left) → hinge side of a door section from the front view
  onAdd(k, wall, x, fitW)   → add preset k
  onDup(i), onDelete(i), onEdit(i), onUndo()
})
```

Callback details:

| Callback | App-side behaviour |
|---|---|
| `onLayout(fn, o)` | The generic layout mutation: the widget passes a function that edits `proj.layout` (move a cabinet, walls add/remove/length, room height, wall-cabinet height, worktop on/off, openings, points, side panels, auto-place, "all visible sides") — and sometimes `proj.cabinets[i]` (`vis`, `extras`). `o = { sel?, focus?, msg? }` |
| `onCab(i, patch, after)` | Shallow merge into the cabinet: `Object.assign(c, patch)`. Patches seen: `{ W }`, `{ dishWidth }`, `{ H }`, `{ H, hang:false }`, `{ hang }`, `{ leds }`, `{ vis }`, `{ mat }`, single numeric fields of a loose panel. Extra rules: a new `W` on a multi-column cabinet scales `colW` proportionally; a `hang` key recomputes legs — `c.cnc.legs = false` when hung or when the cabinet is a panel/box, otherwise the type default `S.settings.types[c.type].legs` (dishwashers untouched); `W` on a dishwasher is mirrored to `dishWidth`; then `after(S.proj)` (layout fix-ups such as moving `x`/`z`) |
| `onFlip(i, sec, box, left)` | finds `c.box.fronts[sec]` (box) or `c.sections[sec]`; a pair of doors cannot flip → toast `flipPair`; else `roomUndoPush()`, `hingeSide = left ? 'right' : 'left'`, save, render, toast |
| `onAdd(k, wall, x, fitW)` | `roomUndoPush()`; `c = fromPreset(PRESETS[k])`; `fitW` (dropped into a gap) sets `W` and `dishWidth`; push; if dropped on a wall `layout.items[c.id] = { wall, x }`; a loose panel dropped at a row calls `RM.makeRoom(S.proj, c, 'L'\|'R')` so the row moves over; select it (`setRoomSel`, `S.sel`); save, render, toast (`rmAdded` / `rmAddedP`, plus `rmSideMoved`). A tap on a preset sends `wall = null` → appended, placed later by `ensure` |
| `onDup(i)` | `roomUndoPush()`; clone with new id (`libId` removed, `copyName`), insert after the original; placed right of the original (`x + RM.cabW(src) + RM.sideW(src).R + RM.sideW(copy).L`, same `z`); if `RM.problems(S.proj).bad[copy.id]` → `RM.autoSpot(S.proj, copy)` instead; select; save; render |
| `onDelete(i)` | two-step: first call sets `S.confirm = 'rmdel' + i` and re-mounts (button shows "sure?"); second call: `roomUndoPush()`, remove the cabinet **and** `layout.items[id]`, clear the selection, clamp `S.sel`, save, render, toast |
| `onEdit(i)` | `S.sel = i; S.tab = 'cab'; S.picking = false; S.iso = null; render(); scrollTo(0,0)` |
| `onUndo()` | `roomUndo()` |

Details of the data the app hands to the Room:

- `roomPresets()` (`:2665–2667`): one entry per `PRESETS` row (`:402–413`, ten presets: `pDrawers, pDoors, pDrDoors, pWall, pTall, pFridge, pDish, pEmpty, pPanel, pBox`) — `{ i, name:t(p.k), icon:ico(p.k), W, H, D, type, dish:!!p.dish, legs: !p.box && !p.panel && (p.dish || !!S.settings.types[p.type].legs), legH:100, panel:!!p.panel }`. `legs`/`legH` are only a drawing hint for the ghost while dragging a preset in; the real cabinet comes from `fromPreset(PRESETS[k])` in `onAdd`.
- `frontArt(i)` (`:2679`): `null` for a loose panel (`c.kind === 'panel'`) or when the cabinet has no panels in its result; otherwise `frontArtOf(c, r, { noHit:true, over:[] })` — for a dishwasher `{ noHit:true, over:[], legs:false, legH:0 }` and the returned `vbH` is overwritten with `num(c.H) + 14`. Returns the object only if it has an `svg`.
- `lookHTML(i)` (`:2678`): `'<div class="rm-look">…' + lookBlock(lookNames(i == null ? all cabinets : [cabinet i]), true)`. The controls inside it are ordinary app controls (`data-act="lookrot|lookfit|lookrm|lookpaste"`, `data-act-change="looktex|lookcol|lookmm"`), handled by the app's delegated listeners because `#room` lives inside `#app`.
- `onMat(c, part, name)` receives the **cabinet object**, not an index; `setMatOf` (`:1664`) writes `c.mat[part]` (or `c.worktop.mat` for `part === 'worktop'`), then `save(); render()` — it does **not** push the Room undo — and the callback returns the fresh `S._info` array.
- `confirmDel` is computed from `S.confirm === 'rmdel' + S.roomSel` *before* `RM.attach`, so the Room's delete button shows its "sure?" state only on the re-mount triggered by the first `onDelete` call.
- `onSelect` also sets `S.sel = i`, i.e. selecting a cabinet in the Room changes which cabinet the Cabinets tab will edit.

Selection helpers: `setRoomSel(i)` keeps both the index (`S.roomSel`) and the cabinet id (`S.roomSelId`) — "the selection follows the cabinet, not its place in the list"; `roomSelSync()` re-derives the index from the id.

Other DBRoom API used from `app.js`: `RM.cabW(c)`, `RM.cabH(c)`, `RM.sideW(c)` → `{L, R}`, `RM.problems(proj)` → `{ …, bad:{ <cabId>:1 } }`, `RM.autoSpot(proj, c)` → `{ wall, x }`, `RM.makeRoom(proj, c, side)` → `{ moved }` | `{ short }` | `{}`, `RM.addSide(proj, c, side)` (adds a side-panel extra, consuming an unassigned offer-imported side board if one exists, then `makeRoom`), `RM.placed(proj)`.

### 9.4 `window.DBRender.open` (realistic picture; `realistic.js`)

Called from action `rrcab` (`:2925–2930`) with a temporary project and from inside the Room widget (`room.js:1360`):

```js
DBRender.open({ proj, infos, th, ph?, t, mats: pickMats, onMat(c, part, name) → infos[] })
// rrcab: proj = { name: '<project>_<n>', look: S.proj.look, cabinets:[cur()],
//                 layout:{ walls:[{ len: max(2400, cabW + 1600) }], wallZ, roomH: max(roomH, cabH + 600), worktop, items:{ <id>:{ wall:0, x:centered, z } } } },
//         infos = [S._info[S.sel]], th = 0.35
```

`onMat` applies the material through `setMatOf` (which saves and re-renders the app underneath) and must **return the fresh engine results** for the cabinets of the picture.

### 9.5 `window.DBLook`

`DBLook.set(S.proj.look)` on every full render (`:825`); `DBLook.on(cb)` (`:802`): when a texture image finishes decoding → if a text field has focus only the 3D views are re-mounted (`mountAssembly()`, `mountRoom()` on the room tab), otherwise a full `render()`.

---

## 10. Import

### 10.1 `importFile(file)` (`:3101–3116`)

`FileReader.readAsText` → `JSON.parse` → format detection:

| Test | Path |
|---|---|
| `d.app === 'db-kurejas' && Array.isArray(d.cabinets)` | own format: the parsed object is used **as is** (`p = d`), `p.id = p.id \|\| uid()` |
| else `Array.isArray(d.cabinets)` | offer-app export → `fromOffer(d)` |
| else | `throw` → toast `badFile` ("Nepavyko perskaityti failo — tai ne projekto JSON.") |

Then: if a library record with the same id exists → new id (importing the same file twice gives two projects, never an overwrite); `openProject(p)` (clone, `normCab` on every cabinet, look sanitising, UI reset); `save()`; `libSave()` immediately; `render()`; toast `imported + count`. Any exception anywhere in that block also produces `badFile`.

Own format (what the app writes as `<base>_projektas.json`): `{ app:'db-kurejas', v:1, id, name, updated, cabinets:[…], layout?, look?, pricing? }`. There is **no schema or version check**; `normCab` (`:457`) only merges defaults (missing keys, section defaults by `kind`, `cnc` from the type defaults, `vis`, `leds` filter, `fixCols`, box/panel specials). Wrong types and unknown kinds pass through (verified live).

`openProject` look sanitising (`:660–662`): keeps per material only `tex` (must match `^data:image/(png|jpeg|webp|gif);base64,…`), `color` (`#rrggbb`), `mm` (> 0) and `rot`; entries with neither photo nor colour are dropped. **`fit` is not copied** — a texture set to "tiled at a real size" (`fit:false`) silently returns to "stretch" whenever the project is opened from the library, imported or restored (verified live).

### 10.2 `fromOffer(d)` — offer-app JSON → project (`:3117–3136`)

Project level:

| Offer field | Becomes |
|---|---|
| `d.projectName` | `name` (trimmed; may be empty → the name field shows as invalid) |
| `d.materials[] = { id, name, … }` | a lookup id → name used for every material reference below (`mname(v) = mats[v] \|\| v \|\| ''`) |
| `d.cabinets[]` | `cabinets[]` (below) |
| `d.boards[]` | extra parts on the **first** cabinet (below); ignored when there are no cabinets |
| — | `app:'db-kurejas'`, `v:1`, `id: uid()` |

Per cabinet (`c` = offer cabinet):

| Offer field | Builder field | Rule |
|---|---|---|
| `name` | `name` | `\|\| ''` |
| `type` | `type` | kept if one of `PASTATOMOS`, `PAKABINAMOS`, `ŪKINĖ`; otherwise `PASTATOMOS` |
| `W`, `H`, `D` | `W`, `H`, `D` | `num()` (lenient; no range check) |
| `thick` | `thick` | `num() \|\| 18` |
| `cols` | `cols` | `num() \|\| 1` |
| `colW` | `colW` | as is, `\|\| []` |
| `dishwasher` | `dishwasher` | boolean |
| `dishWidth` | `dishWidth` | `num() \|\| 600` |
| `visLeft`, `visRight` | `vis.L`, `vis.R` | booleans; `vis.B = false` |
| `carcMat` | `mat.carc` **and** `mat.back` | through the id → name lookup |
| `defFacadeMat` | `mat.facade` | through the lookup |
| — | `edge = { carc:'', facade:'' }` | edge materials are never imported |
| `hasBack`, `backType` | `cnc.backs` | `hasBack === false` → `['none']`; `backType === 'hdf'` or missing → `['hdf']`; anything else → `['solid']` |
| — | rest of `cnc` | `cncFor(type)` (`:386`) — **the current workshop settings' type defaults** (joinery, top, legs, rails, operations) |
| `sections[]` | `sections[]` | only these keys are copied when defined: `kind, col, fill, height, nDrawers, hw, rail, nDoors, hinge, doorSplit, hingeSide, shelves, shelfAdj, shelfMode, shelfPos, innerDrawers`. Everything else in an offer section is dropped. Missing keys and `id` are filled later by `normCab` → `newSection(kind \|\| 'doors')` |

Not carried over: leg height (→ default 100), worktop, per-section materials, prices/quote, the cabinet `id` (new ids from `normCab`).

Offer `boards[]` (`{ note, L, W, qty, mat, lamL, lamW }`), each with `L > 0`, `W > 0`, `qty > 0`:

| Offer | Extra part on `cabinets[0].extras` |
|---|---|
| `note` | `name` (fallback `t('exSide')` / `t('exAdd')` in the current UI language) |
| `L`, `W` | `L`, `W` |
| — | `T: 18` |
| `qty` | `qty` (rounded) |
| `mat` | `mat` through the lookup |
| `lamL` (0–2) | `e1 = lamL ≥ 1`, `e2 = lamL ≥ 2` |
| `lamW` (0–2) | `e3 = lamW ≥ 1`, `e4 = lamW ≥ 2` |
| `note` matches `/šon\|son\|side/i` | additionally `kind:'side', side:''` — an unassigned side board that the Room's "＋ Left / Right" (`RM.addSide`) later consumes (its name, material, thickness and edges are taken; the size comes from the place) |

### 10.3 `prFromOffer(o)` — prices from the offer app (`:2157–2168`, admin only)

Sources: `localStorage['dedesBaldai.calc.v1']` (action `primport`) or a chosen offer JSON file (`prjson`). Requires `o.rates`. Maps `rates.cut`, `rates.edge`, `rates.hw{}` → `PR.cut`, `PR.edge`, `PR.hw{}`; each `materials[]` entry → `PR.mat[name]` = net price per m² (discount `disc` applied; `unit:'sheet'` divided by `sL·sW/1e6`); the cheapest `KARKASAS` / `FASADAS` category price → `PR.def.carc` / `PR.def.facade`; `quote` fields `margin, pvm, matMarkup, packing, defects, fasteners, waste, depreciation, designKitchen, designWardrobe, assemblyKitchen, assemblyWardrobe, admin` → `PR.q.*`; `quote.projType` → `PR.q.use` (`SPINTA` or `VIRTUVĖ`); `quote.country` → `PR.q.vat = (country === 'LIETUVA')`. Returns the number of values taken.

---

## 11. Export code paths and file naming

Common: every export calls `buildProjectAll()` (`:721`) again → `X.buildProject(...)` (`export.js:27`) → `pj = { project, date, parts[], files[{ name, text }], warnings[], hardware[] }`.

`base = pj.project = E.safeName(projName())`; `projName()` (`:688`) = `E.safeName(S.proj.name || 'PROJEKTAS')` (ASCII transliteration, non-word characters → `_`, `engine.js:285`), or `'PROJEKTAS_' + last 4 alphanumerics of the project id` when the name has no ASCII letter or digit.

| Trigger | Function | File name | Content |
|---|---|---|---|
| `dl` `zip` | `download` → `zipAll(pj)` (`:3153`) → `zipFiles(pj, xl, pdf)` (`:3159`) → `Z.zip(files)` | `<base>_CNC.zip` | see the ZIP table below |
| `dl` `xlsm` | `xlsmBytes(pj)` (`:3147`) | `<base>_ReportLists_to_Excel.xlsx` | `DBReport.buildReport(b64ToBytes(S.tplB64 \|\| window.DB_REPORT_TEMPLATE_B64), X.reportInput(pj), { version:'v20-kurejas-' + VERSION, xlsx:true })` (needs `window.JSZip`). On any failure or missing pieces: toast `rptFallback` and the plain workbook `plainXlsm(pj) = Z.zip(Z.fromEntries(X.workbookEntries(X.sheets(pj))))` |
| `dl` `csv` | `csvOf(pj)` (`:3139`) | `<base>_detales.csv` | UTF-8 with BOM, `;` separator, CRLF, quotes only when a value contains `;`, `"` or newline. Header: `Nr;Part;Detale;Spintele;Medziaga;Ilgis;Plotis;Storis;Kiekis;Krastai;Krasto medziaga;1OP;2OP`. Rows from `pj.parts`: index, `name`, `short`, `cab`, `mat`, `L`/`W`/`T` rounded to 0.1 through `E.num`, `qty`, `X.edgeText(eb)` (e.g. `L1 L2 W1`), distinct edge-material names joined with `, `, `op1`, `op2` |
| `dl` anything else | `download` else-branch (`:3179`) | `<base>_projektas.json` | `JSON.stringify(S.proj, null, 1)` — **no button emits this** today |
| `pjson` (home) | `:3082` | `<E.safeName(record.name \|\| 'PROJEKTAS')>_projektas.json` | `JSON.stringify(libraryRecord.data, null, 1)` — the library copy (up to 250 ms behind the open project), **including `pricing`** |
| `dlprog`, `dlpart`, `dlcab`, `dlall` | `saveProgs(names)` (`:3183`) | each program's own file name (e.g. `PROBE2_1_Testas_KAIRE_1OP.XXL`) | separate downloads of `pj.files[].text`, MIME `application/octet-stream`, spaced 300 ms apart (450 ms in artifact mode) so the browser lets them all through; unknown names are skipped; none → toast `noProg`; several → toast `xxlSaving` |
| `drwpdf` | `savePdf(list, name)` (`:2330`) → `DR.pdf(list, { paper, title, progress })` | `<projName()>_brezinai.pdf`; `_brezinai_baldai.pdf` for the furniture filter; `_brezinai_<n>.pdf` for one cabinet | PDF of the shown sheets; progress through toasts |
| `drwpdf1` | same with one sheet | `<projName()>_spintele_<n>.pdf` (EN UI: `cabinet_<n>`; continuation sheet adds `_2`), or `<projName()>_<safeName(sheet title)>.pdf` for non-cabinet sheets | |
| `nestopen` | `nestHandoff()` (`:2299`) | no download | `localStorage['dbNestHandoff'] = { name:'<projName()>_ReportLists_to_Excel.xlsx', b64, at }`, then navigate to `/nesting/?from=builder` (path derived from `/builder` in the URL) |
| `print` | `window.print()` | — | the Results page with print CSS |
| `copy` | clipboard | — | text of the shown program |

Contents of `<base>_CNC.zip` (`zipFiles`):

| Entry | Source |
|---|---|
| `<base>_XXL/<program>.XXL` … | every `pj.files[]` |
| `<base>_ReportLists_to_Excel.xlsx` | `xlsmBytes(pj)` |
| `<base>_detales.csv` | `csvOf(pj)` |
| `<base>_brezinai.pdf` | `drawingsPdf(drwSheets('all', 'A3'), 'A3')` — only if there are sheets and the PDF build did not fail (errors swallowed) |
| `<base>_projektas.json` | `clone(S.proj)` with `pricing` **removed unless admin** ("prices stay with the admin") |
| `<base>_pastabos.txt` | only if `pj.warnings.length`: the warnings through `wTxt`, CRLF-separated |

Mechanics:

- `download('zip'|'xlsm')` is guarded by `S.busy` (a second click only shows toast `building`); CSV/JSON are synchronous and unguarded.
- `saveFile(name, data, type)` (`:3190`): `Uint8Array` → untyped `Blob`; strings → `Blob` with `type || 'text/plain;charset=utf-8'`. Normal mode: a temporary `<a download>` click, object URL revoked after 1.5 s. Artifact mode: `window.claude.use('downloads').then(dl => dl.save({ filename, data: blob }))`; unavailable → toast `dlFail + 'unavailable'`; rejection with `code === 'declined'` → toast `dlDeclined` (not an error style), other codes → `dlFail + code`.
- Nothing checks problems before exporting.

---

## 12. Boot sequence, persistence, `window.__dbk`, artifact mode

### 12.1 What runs on load (order inside the app IIFE)

| # | Line | Step |
|---|---|---|
| 1 | 9–11 | grab the libraries from `window`: `E = DBEngine`, `X = DBExport`, `Z = DBZip`, `SK = OfferSketch`, `ISO = DBIso`, `RM = DBRoom`, `DR = DBDraw`; `VERSION = '2.1'`; `IN_ARTIFACT = !!(window.claude && typeof window.claude.use === 'function')` |
| 2 | 430–434 | `S = { lang: store('dbKurejas.lang') \|\| 'lt', tab:'cab', sel:0, picking:false, part:null, ptab:0, drawer:false, confirm:null, settings: defSettings() merged with stored settings, proj: store('dbKurejas.current') \|\| null }` |
| 3 | 435–456 | normalise settings (types, ops, rules merged over factory defaults); `applyRules()` pushes them into the engine (`E.setRules`) |
| 4 | 485–491 | `migrate()`: if `dbKurejas.lib` does not exist, build it from the current project and the legacy `dbKurejas.projects` list (so the key exists even on a fresh browser) |
| 5 | 492–494 | no valid stored project → `S.proj = null; S.home = true`. Otherwise `normCab` every cabinet, `S.home = false`, and restore tab + selected cabinet from `dbKurejas.ui` when it belongs to this project (tabs `cab, room, res, drw, set` only — not `nest`). Note: this path does not run `openProject`, so the look sanitising does not happen at boot |
| 6 | 667 | restore the user's report template from `dbKurejas.reportTpl` |
| 7 | 542–581 | `VER` (IndexedDB opened lazily); `visibilitychange` / `pagehide` listeners |
| 8 | 802–803 | `DBLook.on(...)` |
| 9 | 1988–1991 | `PR` = price defaults merged with `dbKurejas.pricing`; `S.admin` = session key equals the stored PIN hash |
| 10 | 2171 | `S.drwOnly='all'`, `S.drwPaper = store('dbKurejas.paper') \|\| 'A3'`, `S.drwOpen=null` |
| 11 | 2596, 2662 | `S.iso=null; S.undo=[]`; `S.roomSel=null; S.roomSelId=null; S.roomUndo=[]` |
| 12 | 2797–2891 | all delegated listeners |
| 13 | 3203 | `document.documentElement.lang = S.lang` (set **once**; the `lang` action does not update it) |
| 14 | 3204 | first `render()` |
| 15 | 3206–3224 | register with the hub Back-button helper (below) |
| 16 | 3225 | `window.__dbk = {…}` |

Script order in `legacy/index.html`: JSZip (CDN) → engine → export → zip → sketch → look → realistic → front → photos → art → fittings → assembly → iso → room → drawings → report template → report → **app** → `workshop-auth.js` (the sign-in prompt with "Dirbti be prisijungimo") → `/hub/shared/notices.js` → `cloud.js` → `/hub/shared/project-lock.js` → `locks.js` → `/hub/shared/back.js`. The app renders and is usable before any of the trailing scripts run; they attach through `window.__dbk`, `window.__dbkOnStore` and `window.HubBackQ`.

### 12.2 Storage keys touched by app.js

| Key | Content |
|---|---|
| `dbKurejas.current` | the open project (written on every `save()`); removed when the open project is deleted |
| `dbKurejas.lib` | array of `{ id, name, updated, n, data }` — all projects (library) |
| `dbKurejas.cablib` | `{ v:1, items:[{ id, name, cat, W, H, D, type, cab, added, updated }], cats:[] }` — cabinet library |
| `dbKurejas.settings` | workshop settings (`types`, `ops`, `rules`, `railW`, `materials`, `edges`, `worktops`, `boards`) |
| `dbKurejas.pricing`, `dbKurejas.adminPin` | admin price table; PIN hash |
| `dbKurejas.lang`, `dbKurejas.paper`, `dbKurejas.isoMode`, `dbKurejas.ui` | language; drawing paper; 3D joint-view mode; `{ id, tab, sel }` written by every full render |
| `dbKurejas.reportTpl` | `{ name, b64 }` user report template |
| `dbKurejas.projects` | legacy, read once by `migrate()` |
| `sessionStorage['dbKurejas.admin']` | admin unlocked for this browser session |
| `dbNestHandoff` | hand-over to the Nesting app; `nestDefaults` is read from it |
| `dedesBaldai.calc.v1` | read only: the Offer app's state (prices) |
| IndexedDB `dbKurejasVersions` (store `p`, key `pid`) | version history |

### 12.3 `window.__dbk` (`:3225`)

```
openProject, uid, saveNow (= () => save()), libSaveNow (= clearTimeout(libTimer); libSave()),
S, render, nestPlan, VER, dropMat, store, lib, libSet, libRec, clib, defSettings, applyRules, toast,
newProject, save, priceCabinet, buildProjectAll, zipAll, xlsmBytes, csvOf, fromOffer, normCab, PRESETS, fromPreset
```

28 distinct members (`openProject` appears twice in the literal). Consumers in the snapshot:

- `legacy/cloud.js` uses `S` (`home, lang, proj, ro, settings`), `store`, `lib`, `libRec`, `render`, `toast`, `defSettings`, `applyRules`, and installs `window.__dbkOnStore(key)` — called by `store()` after **every** localStorage write; it reacts to `dbKurejas.lib`, `dbKurejas.cablib`, `dbKurejas.settings`.
- `legacy/locks.js` uses `S` (`home, lang, picking, proj, ro, roDirty, sel, tab`), `lib`, `libSaveNow`, `openProject`, `render`, `saveNow`, `toast`, `uid`. While a project is view-only or the lock is unanswered it sets `S.ro`; `save()` then only sets `S.roDirty = true` and returns, and `libSave()` returns (`:649`, `:500`) — edits stay in memory until the lock is granted.
- The old test pages use `buildProjectAll`, `zipAll`, `xlsmBytes`, `csvOf`, `fromOffer`, `normCab`, `PRESETS`, `fromPreset`, `priceCabinet`, `nestPlan`, `dropMat`, `VER`.

Not exposed: `assign`, `setJoint`, `undoJoints`, `download`, `importFile`, `refreshLive`, `cur`.

Test hook: the URL parameter `?allsteps` makes the editor show all steps on one page (`oneStep`, `:892`).

### 12.4 Back button (`:3206–3224`)

```js
(window.HubBackQ = window.HubBackQ || []).push(function (B) {
  B.view({ get() → S.home || !S.proj ? { h:1 }
                 : { p:S.proj.id, t:S.tab, s:S.tab === 'cab' ? S.sel : 0, k:!!S.picking, d:S.tab === 'drw' && S.drwOpen != null ? S.drwOpen : null },
           set(v) → { h } : flush the library copy, S.home = true
                    else   : open project v.p from the library if it is another one (flushing the current: libSave + VER.flush),
                             S.home=false, S.tab=v.t||'cab', S.sel=v.s||0, S.picking=!!v.k, S.drwOpen=v.d, S.confirm=null, S.iso=null;
                    render(); scrollTo(0,0) });
  B.layer('.iso3d.full,.av.full,.rr-ov');      // full-screen 3D views and the realistic-picture overlay close on Back first
});
```

### 12.5 Artifact mode (`IN_ARTIFACT`)

True when the page runs inside a Claude artifact (`window.claude.use` exists). Effects in app.js: downloads go through `window.claude.use('downloads')` → `save({ filename, data })` (`:3192–3197`); separate `.XXL` downloads are spaced 450 ms instead of 300 ms (`:3188`); the Print button is not rendered (`:2346`). Nothing else changes.

---

## 13. UI state inventory (`S.*`)

| Field | Meaning |
|---|---|
| `proj`, `settings` | the open project; workshop settings |
| `lang`, `home`, `tab`, `sel`, `picking` | language; home screen flag; main tab; selected cabinet **index**; preset picker open |
| `stepKey`, `gotoAt`, `colSel`, `notesOpen` | current editor step; scroll-spy pause; shown column; expanded long notes |
| `confirm` | pending two-click confirmation: `'del'`, `'pdel'+id`, `'libdel'+id`, `'prreset'`, `'rmdel'+index` |
| `_info` | per cabinet `{ r, warnings, nProg }` from the last full render (current cabinet refreshed by `refreshLive`) |
| `_drw`, `_pjParts` | cached drawing sheets; cached parts of the Results view |
| `part`, `partRef`, `ptab` | open part in Results (by name, plus `{cab, key}` to survive renames); program tab |
| `iso`, `isoFocus`, `xside` | selected joint `{ key, side, idx }`; "open it in 3D on the next mount"; (dead) section side |
| `jcheck`, `jcSel`, `jcAsked` | joints-check modal open; selected joint in it; cabinets already prompted this session |
| `echeck`, `ecView`, `ecDrag` | edges-check modal; its camera; drag-in-progress guard |
| `undo`, `roomUndo` | the two undo stacks (§8) |
| `roomSel`, `roomSelId` | Room selection by index and by cabinet id |
| `drwOnly`, `drwPaper`, `drwOpen` | drawings filter, paper, open sheet |
| `admin`, `pinChange`, `prOpen` | admin unlocked; change-PIN form; price card open |
| `techOpen`, `warnOpen`, `constrOpen` | remembered `<details>` states |
| `libCat`, `libQ`, `homeQ`, `npName`, `focusNew` | cabinet-library filter/search; project search; new-project name; focus the name field after render |
| `lookPasteTo` | `{ name, until }` — next image paste goes to this material |
| `tplB64`, `tplName` | user report template |
| `busy` | a ZIP/report build is running |
| `ro`, `roDirty` | set by `locks.js`: read-only / unsaved edits made while read-only |
| `drawer` | unused |

---

## 14. Dead code found in this slice

| Item | Evidence |
|---|---|
| `mountIso()` (`:2644`) and its `#iso3d` host | no markup emits `id="iso3d"`; in a live scan of all presets only `#assembly-preview` and (in the modal) `#jc-iso` exist. `mountIso` is still called by `render` and `refreshLive` and returns immediately |
| `syncXsec()` (`:2615`), `#xsec`, `#xcap`, action `xside`, `S.xside` | no emitter for the elements or the action |
| `closeDrawer` pre-check (`:2894`), `S.drawer` | no emitter |
| `var zone = null; if (zone && …)` (`:2592`) | never true |
| `assign` branch for `c.type` (`:2745`) | no control binds `c.type`; the type comes from the preset and the effective kind is derived by `cabKind()` (`:1000`) from `hang` and height |
| `download()` JSON branch (`:3179`) | no button with a `dl` value other than `zip`, `xlsm`, `csv` |

---

## 15. Fragilities a rewrite must be careful about

**Data flow and types**

1. **The model is written before it is validated.** Raw field text lives in the cabinet record between `input` and `change`; numeric normalisation exists only in the `change` handler. Any path that skips `change` (programmatic value sets, a re-render replacing the focused node, closing the tab) leaves strings in the stored project. Everything depends on `num()` being applied at read time; readers that forget (`room.js cabW`) misbehave.
2. **Mixed value types for the same field** — number / numeric string / `''` = automatic / boolean — because `set` buttons and selects store strings and only a few bindings are coerced (`assign` #7, #8, #9, #16, #17).
3. **Index-based binding paths** (`c.sections.2…`, `c.extras.0…`, `c.box.inner.1…`): reordering or deleting shifts what a path means; the toast-undo closures re-insert by remembered index. `S.sel` is an index too (the Room and the drawings filter already had to switch to ids).
4. **`setPath` auto-creates plain objects** and splits on dots: keys with dots need the U+2024 trick (`pr.`); arrays must pre-exist.
5. **Dependent-field rules are regex special cases inside `assign`**, several with early returns, some keyed to *virtual* bindings that are never stored (`tbOn`, `pinsOn`, `sideFull`, `support`, `backJoint`). Their order matters and they are the only place these business rules exist. A rewrite must carry over all 20 rows of §3.3 (the `c.type` row is unreachable today but documents how type defaults were meant to apply).
6. **Adding one field touches up to seven places**: the view (emit the binding and id), `NUM_LIMITS`, the full-render whitelist (`:2863`), an `assign` special case, `refreshLive` (if it shows derived data), `normCab` defaults, `engineDef` coercion.

**Rendering**

7. **Full render = rebuild every cabinet + replace the whole DOM + re-mount every widget**; cost grows with project size (≈25 ms for 3 cabinets headless). It runs after almost every click.
8. **Focus survives a render only for elements with stable ids**; the caret is restored with `setSelectionRange`. Widgets and id-less inputs lose focus.
9. **`refreshLive` patches a fixed list of nodes** and the live-vs-full decision is a hand-kept regex list — stale placeholders/limits/enabled states are possible after "live" fields change (e.g. `c.H`, `c.D`, `c.thick`).
10. **`render()` and mounts have side effects on the model**: the fitted plinth's `L`/`W` are rewritten during render without `save()` (`:827–829`); `mountRoom` → `RM.ensure` can create the layout and save; `buildProjectAll` → worktop joining can call `RM.ensure` + `save()` (`:740`).
11. **The pointer/`later()` choreography** (§2.4) exists only because rendering destroys the click target. A design that updates in place does not need it — but must still commit a field before the click that follows is processed.

**Checks and feedback**

12. **Warnings are Lithuanian strings classified by regex** (`level()`, `:715`; `stepNav` `:909` maps them to steps by more regexes). There are no error codes, severities or field references coming from the engine. Any re-wording changes severity. Mistake-prevention in a new version needs structured results, or a single adapter that owns these regexes.
13. **No hard gates**: the joints-check prompt appears once per cabinet per session and does not block the step change; exports are never blocked.
14. **Confirmation signatures** (`c.jointsOk`, `c.edgesOk`) are exact strings of geometry; any dimension change silently invalidates the confirmation, and the user is only told by banners/markers.
15. **Feedback is one transient toast** (2.6 s; 6 s with Undo; replaced by the next toast). Corrections of typed values, failed range checks and the only chance to undo a delete all compete for it.
16. **Two-click deletes rely on `S.confirm`** being preserved across exactly one render and cleared by any other click; `prreset` announces its second click only through a toast.

**Undo and persistence**

17. **Undo is partial and can destroy untracked edits** (§8.1, verified). The Room undo stores 40 full project clones including textures, and is silently emptied by any save on another tab.
18. **`save()` serialises the whole project (with embedded photos) into localStorage on every keystroke**; quota failure shows one toast per page load (`saveFailed`, `:336`) and marks the "saved" badge. Under a lock (`S.ro`) saving is skipped entirely.
19. **`openProject` drops `look.fit`** (§10.1) — a real data-loss bug to avoid reproducing.
20. **`del` on the Cabinets tab leaves an orphan layout item**; the Room's delete removes it. `dup` on the Cabinets tab does not place the copy; the Room's does.
21. **Own-format import trusts the file** (no version, no schema, object used as is, extra keys such as `pricing` kept). `fromOffer` depends on the current settings and UI language at import time and puts all loose boards on the first cabinet.
22. **`pjson` exports the 250 ms-delayed library copy and includes pricing**, while the ZIP's project JSON strips pricing for non-admins.

**Smaller traps**

23. `data-i` missing → `i === 0`: an action emitted without its index silently acts on item 0.
24. `jcn` clamps the connector count to 8 and replaces a per-side joint spec with a common one; the numeric field for the same value allows 30.
25. `onReset(key, side)` from DBAssembly writes a side spec without `type`.
26. Hard-coded bilingual strings (`S.lang === 'lt' ? … : …`) are scattered through the handlers instead of the `T` table; `document.documentElement.lang` is not updated on language switch.
27. Three separate copies of the expression parser (`num`, `numOrNull`, `assembly.js numIn`) plus the room's own, and several separate limit tables (§4.4).
28. Async gaps: PIN hashing, report building and clipboard reads resolve after further user actions; only ZIP/report builds are guarded (`S.busy`).
29. `Enter` moves to the next `input[type=text]` in whole-app DOM order — which crosses from the editor into unrelated fields at the end of a step.
30. External contracts that must keep working if the new app coexists with the old ecosystem: the `dbKurejas.*` storage keys and shapes, `window.__dbk` members used by `cloud.js`/`locks.js`, `window.__dbkOnStore`, `S.ro`/`S.roDirty`, `HubBackQ`, `dbNestHandoff`, the offer app's `dedesBaldai.calc.v1`, and the export file names of §11.

**Found in the review pass**

31. **Every click on any `[data-act]` ends in a full render unless the case returns** — including an unknown action name (no `default` branch). View-state toggles cost a rebuild of every cabinet; a typo in an action name fails silently as "the page flickers and nothing happens".
32. **The toast-undo of a deleted cabinet is tied to object identity** (`S.proj !== dp`, `:2905`): after a Room undo (which replaces `S.proj` with a clone), after re-opening the project or after a cloud pull, the Undo button silently does nothing. `rmsec` / `rmx` look the cabinet up by id instead and keep working.
33. **Project switches are flushed inconsistently.** `pnew`, `popen` and the Back-button path call both `libSave()` and `VER.flush()` before leaving a project; `home` calls only `libSave()` (`:3074`); `pcreate`, `psample` and `importFile` call `openProject()` with **no flush of the project that was open**. `VER.flush()` only ever snapshots `S.proj` (`:579`), so after home → "create" the previous project's last unsnapshotted edits never reach the version history (its library copy is fine, `home` flushed that).
34. **`setMatOf` (Room / realistic picture material pick) and `lookSet` bypass the Room undo**, and because they call `save()` while `S.tab === 'room'` they do not clear it either — a following Ctrl+Z in the Room restores a project clone taken *before* the material change, silently undoing it together with the last layout step.
35. **`onCab` merges patches with `Object.assign`** — a patch `{ mat:{…} }` or `{ vis:{…} }` replaces the whole sub-object (the Room builds the full object itself); a partial sub-object would drop the other keys.
36. **`assign` is also the writer for the virtual bindings when they come from `set` buttons** (`data-v` strings): `c.cnc.sideFull` tests `raw === true || raw === 'true'`, but `c.cnc.tbOn` / `c.cnc.pinsOn` test plain truthiness of `raw` — they work only because they are checkboxes (boolean `el.checked`); emitted as a segmented button the string `'false'` would switch them **on**.
37. **`importFile` reports success before anything is checked**: the toast is `t('imported') + p.cabinets.length` whatever the cabinets contain; an offer export with zero cabinets imports as an empty project (and its `boards[]` are dropped because there is no first cabinet to attach them to).
38. **Exports rebuild from scratch on every click** (`buildProjectAll()` per action; `dlpart` / `dlcab` / `dlall` build once to list the names and `saveProgs` builds again), and several-file `.XXL` downloads depend on the browser allowing multiple automatic downloads (300 ms spacing is the only mitigation; a blocked download is not detected).
39. **Async results land on whatever is current**: `zipFiles` reads `S.proj` and `S.admin` *after* the report and the drawings PDF have been built (`:3165`), so switching project while "Ruošiama…" is showing would put the other project's JSON into a ZIP named after the first one. `S.busy` blocks a second export, not navigation.
