# Map: cabinet editor, navigation, form helpers, joints / edge-banding gates, box mode

Slice: `src/lib/app.js` lines 815–1500 (plus the helpers it calls outside that range, read to make the step-by-step complete).
All `file:line` references are to `src/lib/app.js` unless another file is named. Labels are given as **LT / EN** (resolved from the `T` table, app.js:14–316).
Things marked **(verified live)** were checked in the running snapshot at `http://127.0.0.1:8765/legacy/` with `tools/cdp.py`.

Contents
1. Rendering model
2. UI state (`S`) used by this slice
3. Navigation model: header, tabs, views
4. Form-field helpers and the binding pipeline
5. Cabinet editor, step by step (normal cabinet)
6. Editor variants: dishwasher front, loose panel
7. Front picture, column map, drag handles
8. "Confirm joints" gate
9. "Confirm edge banding" gate
10. Room-tab check bar (`roomChecks`)
11. Free "box" construction mode
12. Catalogue: every `data-act`, `data-bind`, other `data-*`
13. Number validation table and `assign()` special cases
14. UX problems visible from the code
15. Bugs, dead code, traps for a rewrite

---

## 1. Rendering model

### 1.1 One function, full re-render, string templates
- `render()` (815–853) builds **one HTML string** by concatenation and assigns it to `app.innerHTML` (`app = document.getElementById('app')`, 801). No virtual DOM, no components, no diffing. Every view function (`viewCab`, `viewEditor`, `viewSection`, …) returns a string.
- Every `render()` **rebuilds every cabinet through the engine**: `cabInfo = S.proj.cabinets.map((c,i) => buildOne(i))` (826). `buildOne(i)` (704–709) = `E.buildCabinet(engineDef(c), i, projName())` + `E.programs(p)` for every panel; returns `{ r, warnings, nProg }`. The array is cached as `S._info` (831) and read everywhere as `S._info[S.sel].r`.
- After `innerHTML`, imperative widgets are re-mounted: `mountIso(); mountRoom(); mountAssembly(); mountJc(); clampNotes();` (850–851). The 3D preview (`DBAssembly.mount` into `#assembly-preview`, 2621) is therefore torn down and rebuilt on every full render.
- Side effects hidden inside `render()`:
  - clamps `S.sel` into range (824); forces `S.home = true` when there is no project (817);
  - pushes the project's material look to the 3D layer: `DBLook.set(S.proj.look)` (825);
  - **mutates data**: a plinth "fitted by gaps" gets its `extras[k].L` / `.W` overwritten from the engine result `r.visual.plinth` (827–829) — without calling `save()`;
  - writes `localStorage['dbKurejas.ui'] = { id, tab, sel }` (830) so a reload returns to the same tab and cabinet (restored at boot, 494; note `nest` is not in the restore whitelist).
- Three `<datalist>`s are appended to every page (847): `dl-mat`, `dl-edge`, `dl-wt`, filled by `listOpts(kind)` (868–873) from the settings lists plus every name already used in the project.

### 1.2 Focus and caret preservation
- Before replacing the DOM: `fx = document.activeElement.id`, `ss = selectionStart` (848). After: `getElementById(fx).focus()` and `setSelectionRange(ss, ss)` (852).
- This only works because **every input has a stable id derived from its binding**: `'f-' + bind.replace(/\./g, '-')` (e.g. `c.cnc.bottomZ` → `f-c-cnc-bottomZ`), see `fN/fT/fS/chk` (943–948). Hand-written inputs use ad-hoc ids (`f-fg-l`, `f-pl-gl`, `f-wt-T`, `f-jc-<key>-e`, `f-x-<i>-<k>`, `f-bk-front`, `f-pl-mat`).
- Scroll position is not saved or restored; it survives only because the page keeps roughly the same height. Explicit scrolls: `tab` → `scrollTo(0,0)`; `step` → smooth scroll to top if the editor's top is above the viewport (3071); `gotoStep()` (919–929).

### 1.3 Two update paths: "live" (while typing) vs "render"
| Event | Handler | What happens |
|---|---|---|
| `input` on a text field with `data-bind` | 2800–2817 | value applied via `assign()` only if it parses and is inside its range; then `after(bind,false)` → `save()` + **`refreshLive()`** (no full render, focus untouched) |
| `change` (blur / Enter / select / checkbox) | 2818–2866 | number validated, clamped or reverted (toast explains); then either `later('render')` (full) or `later('live')` |
| click on `[data-act]` | 2891–3090 | `switch(act)`; almost every case ends in `render()` (3089) |

- `refreshLive()` (2571–2593) patches by hand: re-runs `buildOne(S.sel)` for the open cabinet only, then replaces `#sketch`, `#xsec`, the 3D preview (`mountAssembly(true)`), `#warns`, the paper title, `#colmap` (`colMapInner`), the whole `.stepnav`, the warning dot in the cabinet list, the worktop size hint, `liveSections(c)` (1941–1963: fill heights, front-height placeholders, bars), the parts-count badge, the warnings count, the price card, and every `.zone[data-col]` summary.
  **Not refreshed live:** the joints / edges banners, conditional fields, anything else — they wait for a full render.
- Which `change` events trigger a **full** render (2863): checkboxes, selects, `pr.*`, `pp.*`, `c.worktop.*`, any path ending `.nDrawers|.nDoors|.shelves|.height|.frontH.N|.doorSplit`, `cnc.joints.*`, `c.box.*`, `c.colW.*`, `c.W`, `c.shelfSb`, `c.cnc.backInset`, `c.cnc.topOv[FSB]`, `c.cnc.fg.*`, `c.extras.N.*`, `p.name`. Everything else (e.g. `c.H`, `c.D`, `c.thick`, `c.cnc.bottomZ`, material names) only does the live refresh.
- **Deferred redraw** (`ptr`, `later`, `flushLater`, 2867–2873): a field's `change` fires on the mouse-down of the next click; if the DOM were replaced right then, the click would land on nothing. So the redraw is queued in `ptr.pending` and flushed on `pointerup`. `render()` clears `ptr.pending` (816).
- Enter in a text input blurs it and focuses the next `input[type=text]` (2878–2883).
- `clampNotes()` (806–814): any `.editor p.note` / `p.lead` longer than 150 characters is clamped to two lines; a click expands it (remembered in `S.notesOpen` keyed by the first 60 characters).
- A texture finishing decoding triggers a redraw (802–803): 3D only while a field has focus, otherwise a full `render()`.

### 1.4 Conventions
- Clicks: `data-act="<action>"` + optional `data-v` (string value) + `data-i` (index, read as a number) (+ `data-w`, `data-force`, `data-bind` for `set`). One delegated listener on `#app` (2891).
- Fields: `data-bind="<root>.<path>"`, roots `c.` = current cabinet `cur()`, `p.` = project, `s.` = settings, `pr.` = admin prices, `pp.` = project pricing (`target()`, 2717–2722).
- Modifiers: `data-num="1"` (numeric, validated), `data-empty="1"` (an empty value is allowed and means "use the rule/default"), `data-prev` (set on focus for revert), `data-lines` (settings textareas).
- Modal backdrops carry `data-act="…close"`; the inner box carries `data-stop="1"` so clicks inside do not close; the ✕ button carries `data-force="1"`.
- Two-click destructive confirmation: `S.confirm` holds the pending action (`'del'`, `'libdel'+id`, `'pdel'+id`, `'prreset'`); the button label changes to "Tikrai ištrinti? / Really delete?"; any other click clears it (2895).

---

## 2. UI state (`S`) used by this slice

`S` is declared at 430–434; many fields are added ad hoc. Nothing here except `lang`, `settings`, `proj` and the small `dbKurejas.ui` record is persisted.

| Field | Meaning | Set by |
|---|---|---|
| `S.home` | project list is shown instead of a project | `home`, `pnew`, `openProject`, render() when no project |
| `S.proj` | open project `{ id, name, cabinets[], layout, look, pricing, updated }` | |
| `S.tab` | `'cab' \| 'room' \| 'res' \| 'nest' \| 'drw' \| 'set'` | `tab`, `rcedit`, `drwcab`, `fixcab` |
| `S.sel` | index of the open cabinet | `sel`, `preset`, `libadd`, `dup`, `del`, `jcroom`, `ecroom`, `rcedit`, `fixcab` |
| `S.picking` | "new cabinet" chooser replaces the editor | `pick` / `unpick`; cleared on `tab`, `sel`, `preset`, `libadd` |
| `S.stepKey` | key of the visible editor step; **shared by all cabinets** | `step`, `gotoStep`, `rcedit` |
| `S.colSel` | active column (0–2) in the sections step | `colsel`, `addsec`; reset on `sel` |
| `S.jcheck` / `S.echeck` | joints / edges modal open (mutually exclusive) | `jcopen`, `jcroom`, `step` auto-open / `ecopen`, `ecroom` |
| `S.jcSel` | joint highlighted in the joints modal `{ key, side, idx }` | `jcsel`, 3D view |
| `S.jcAsked` | `{ cabId: 1 }` — joints modal already auto-opened once (session only) | `step` |
| `S.iso`, `S.isoFocus` | joint selected in the 3D joint editor | `jc3d`, `isosel`, 3D callbacks |
| `S.ecView` | edges model camera `{ th, ph, zoom, exp, fronts }` | `ecview`, drag, wheel |
| `S.ecDrag` | a rotate-drag just ended — swallow the click | pointer handlers 1266–1273 |
| `S.confirm` | pending two-click delete | see 1.4 |
| `S.undo` | stack (max 40) of `{ id, joints, box }` snapshots — **joints and box only** | `pushUndo()` 2597 |
| `S._info` | per-cabinet engine results | render / refreshLive |
| `S.admin` | admin mode (prices visible) | settings tab |
| `S.gotoAt`, `S.notesOpen`, `S.techOpen`, `S.warnOpen`, `S.prOpen`, `S.xside`, `S.focusNew`, `S.libQ`, `S.libCat` | view details | |

---

## 3. Navigation model

### 3.1 Top level
```
S.home || !S.proj  ──►  Home (viewHome): project list, new project, import, sample
otherwise           ──►  header + one of six tabs
```
Header (833–840), always visible inside a project:
| Element | Action / binding |
|---|---|
| Logo + title "Spintelių kūrėjas / Cabinet creator" | `data-act="home"` |
| "☰ Projektai / Projects" | `data-act="home"` |
| Project name input `#projname` | `data-bind="p.name"`; `aria-invalid` while empty; placeholder `PROJEKTO_KODAS` |
| "✓ išsaugota / saved" `#saved` | flashes on `save()`; turns "✕ neišsaugota" when storage is full |
| "🕘 Versijos / Versions" | `data-act="pver"` |
| Tabs | `data-act="tab" data-v="<key>"` (`tabBtn`, 867) |
| "€ Admin" badge (admin only) | `data-act="tab" data-v="set"` |
| "＋ Naujas projektas / New project" | `data-act="pnew"` |
| LT / EN | `data-act="lang" data-v="lt\|en"` |

Tabs (838, 841–846):
| `S.tab` | Label LT / EN | Badge | View |
|---|---|---|---|
| `cab` | Spintelės / Cabinets | number of cabinets | `viewCab(cabInfo)` |
| `room` | Baldai / Furniture | – | `roomChecks(cabInfo)` + `<div id="room">` (room.js) + joints/edges modal if open |
| `res` | Detalės ir CNC / Parts & CNC | `partCount()` (863–866) | `viewRes(buildProjectAll())` |
| `nest` | Plokštės / Boards | boards count (`nestCount`, debounced 450 ms, 855–862) | `viewNest()` |
| `drw` | Brėžiniai / Drawings | – | `viewDrw()` |
| `set` (any other value) | Nustatymai / Settings | – | `viewSet()` |

### 3.2 Cabinets tab (`viewCab`, 876–886)
Three-column workspace `.ws`:
1. **Rail** `<aside class="rail">`: list of cabinets, each a button `data-act="sel" data-i`: number, name (or `typeName(c)`), size `W×H×D` (dishwasher: `dishWidth`), a warning dot (`bad` red if any warning is level bad, else `warn` amber), and in admin mode the offer price. Below: "＋ Nauja spintelė / New cabinet" (`data-act="pick"`).
2. **Editor** `<section class="editor">`: `cabBar(c)` (not for box/panel) + `stepNav(c, inf)` + `jcBanner` + `ecBanner` + `oneStep(viewEditor(c), c, inf)`.
3. **Sheet** `viewSheet(c, inf)` (1964–1972): `#assembly-preview` (3D), "✦ Realus vaizdas / Realistic image" (`rrcab`), price card, collapsible "Brėžinys ir gamybos suvestinė / Drawing & manufacturing summary" (sketch, parts / programs count, joinery), collapsible "Gamybos patikra / Manufacturing checks" (warning list with tags klaida / patikrinti / rankomis), buttons "Detalės ir CNC →" (`tab` → `res`) and "📐 Brėžiniai" (`drwcab`).

When `S.picking` or the project has no cabinets, the editor column spans two columns and shows `viewPick()`; the sheet is absent.
The joints / edges modal is appended after the workspace when `S.jcheck` / `S.echeck`.

`typeName(c)` (937): panel → "Plokštė / Panel"; box → "3D konstrukcija / 3D construction"; dishwasher → "Indaplovės fasadas / Dishwasher front"; else by `c.type`: `PASTATOMOS` → "Pastatoma / Base", `PAKABINAMOS` → "Pakabinama / Wall", `ŪKINĖ` → "Aukšta / Tall".

### 3.3 New-cabinet chooser (`viewPick`, 938–942)
- Title "Kokią spintelę kuriame? / What are we building?" (first cabinet: "Pirmoji spintelė — kokią kuriame?"), lead "Pasirinkite panašiausią — viską galėsite pakeisti.", Cancel (`unpick`, only when cabinets exist).
- `viewLib()` (521–536): the saved-cabinet library — search `#lib-q`, category chips (`libcat`, `libcatdel`, `libnewcat` + `#lib-newcat`), item tiles (`libadd`), per-item category select (`data-act-change="libmove"`), two-click delete (`libdel`).
- "Nauja iš šablono / New from a template": ten preset tiles `data-act="preset" data-i` (PRESETS, 402–413):

| # | key | Label LT / EN | type | W×H×D | Sections (bottom → top) |
|---|---|---|---|---|---|
| 0 | pDrawers | Stalčių spintelė / Drawer cabinet | PASTATOMOS | 600×720×560 | drawers ×3 (fill) |
| 1 | pDoors | Durų spintelė / Door cabinet | PASTATOMOS | 600×720×560 | doors ×2, 1 shelf (fill) |
| 2 | pDrDoors | Stalčius + durys / Drawer + doors | PASTATOMOS | 600×720×560 | doors ×2 (fill), drawer 180 on top |
| 3 | pWall | Pakabinama / Wall cabinet | PAKABINAMOS | 600×720×330 | doors ×2, 2 shelves |
| 4 | pTall | Aukšta su orkaite / Tall with oven | ŪKINĖ | 600×2100×580 | drawers 560 ×2, oven 595, doors ×1 (fill) |
| 5 | pFridge | Šaldytuvo spinta / Fridge unit | ŪKINĖ | 600×2100×560 | fridge doors 1816 (2 stacked, no hardware), doors ×1 (fill) |
| 6 | pDish | Indaplovės fasadas / Dishwasher front | PASTATOMOS | 600×720×560 | `dishwasher:true` |
| 7 | pEmpty | Tuščia (lentynos) / Empty (shelves) | PASTATOMOS | 600×720×560 | open, 2 shelves |
| 8 | pPanel | Plokštė / Panel | – | 18×2300×600 | `kind:'panel'` |
| 9 | pBox | 3D konstrukcija / 3D construction | – | 600×720×560 | `kind:'box'` |

`fromPreset()` (414–427) calls `newCabinet(type)` (393–400), which **copies materials, edges and worktop settings from the last cabinet in the project** and takes construction defaults from the settings per type (`cncFor`, 386–392).

**The cabinet type is chosen only here.** No control in the editor binds `c.type` (the `assign()` branch for it at 2745 is unreachable from the editor). Afterwards the behaviour type is derived by `cabKind(c)` (1000): `c.hang === true` → wall; `c.hang === false` or `c.type !== 'PAKABINAMOS'` → tall if `H > 1000` else base. `c.hang` is set in the Furniture tab.

### 3.4 Cabinet bar (`cabBar`, 903–907) — normal and dishwasher cabinets only
- Name: `fT` bound to `c.name` (while typing, the rail entry is updated in place, 2814).
- "☆ Į biblioteką / Save to library" (`libsave`) or, when `c.libId`, "★ Bibliotekoje / In the library" (`libunlink`).
- "Kopijuoti / Duplicate" (`dup`): deep clone, new id, `libId` removed, name gets " (2)"; inserted after the current one. The clone **keeps `jointsOk` and `edgesOk`** (verified live).
- "Ištrinti / Delete" (`del`): two clicks, then a toast with Undo.
Box and panel cabinets have no bar: the same name field and buttons are inside their step 1.

### 3.5 Step navigation
`stepNav(c, inf)` (908–918) renders `<nav class="stepnav">` of buttons `data-act="step" data-v="<key>"`, each with a number, a label and, when the step "needs attention", class `need` + a dot (tooltip "Reikia užpildyti / Needs filling in").

| Cabinet kind | Steps (key · label LT / EN · when flagged) |
|---|---|
| Normal | `dims` 1 Matmenys / Size · `dimBad` ‖ `build` 2 Konstrukcija / Construction · `needsWt(c)` ‖ `secs` 3 Sekcijos / Sections · column over its zone, or no sections, or `secBad` ‖ `ops` 4 Operacijos / Operations · `bad` ‖ `mats` 5 Medžiagos / Materials · `needsMats(c)` ‖ `extra` 6 Papildomos / Extras · never |
| Dishwasher | `dims` 1 · `dimBad` ‖ `mats` 2 · `needsMats` |
| Panel | `dims` 1 Plokštė / Panel · `dimBad \|\| needsMats` |
| Box | `dims` 1 Matmenys · `dimBad` ‖ `boards` 2 Plokštės / Boards · no panels produced ‖ `inner` 3 Vidus / Inside ‖ `fronts` 4 Durys ir stalčiai / Doors and drawers ‖ `joints` 5 Jungtys / Joints · `bad` ‖ `mats` 6 ‖ `extra` 7 |

How flags are computed (909–911):
- Warnings are plain Lithuanian strings from the engine. `level(w)` (715–720) classifies them into `bad / warn / info` **by regex over the text**.
- `dimW = /netinkami matmenys|per maži matmenys|per maža detalė|netelpa į stakles|matmenys per/i`; `secW = /^(sekcija|kolona|stalčius) [\d.]+|sekcijų aukščių suma/i`.
- `dimBad` = any warning matching `dimW`, **or `needsWt(c)`**; `secBad` = a `bad` warning matching `secW`; `bad` = a `bad` warning matching neither. So every unclassified error lands on "Operations" (normal) or "Joints" (box).
- `needsWt(c)` (888): worktop on, not a dishwasher, material empty.
- `needsMats(c)` (889): panel → no `mat.carc`; dishwasher → no `mat.facade`; box → no `mat.carc`, or fronts exist and no `mat.facade`; normal → no `mat.carc`, or any drawers/doors/cargo section and no `mat.facade`.
- Edge materials, the joints check and the edge-banding check never flag a step.

One step at a time (`oneStep`, 892–901):
- `viewEditor` always renders **all** steps as `<div class="card step" id="st-<key>">`. `oneStep` then regex-rewrites the string to add class `cur` or `off` (CSS hides `off`) and appends a footer `.stepfoot`: "← <previous step name>" and "Toliau: <next step name> →" (`data-act="step"`). The step names are scraped by regex out of `stepNav()`'s HTML.
- URL parameter `?allsteps` returns the HTML untouched (old one-page layout; the test pages use it).
- `curStep(keys)` (891): `S.stepKey` if the cabinet has that key, else the first. Because `S.stepKey` is global, switching from a normal cabinet on `build` to a box lands on `dims`; switching between two normal cabinets keeps the step.
- `step` click (3068–3071): sets `S.stepKey`, renders, scrolls to the top; **may auto-open the joints modal** (section 8.3).
- `gotoStep(id)` (919–929), used by `data-act="goto"` and by `fixcab`: finds the element by id, switches to the step card that contains it, smooth-scrolls. Only one `goto` exists in this slice: "Nustatymai →" next to the supports selector → `st-ops`.
- A scroll listener (930–936) highlights the step in view; it is inert in one-step mode.

Other jumps into the editor: `rcedit` (room chip → cabinet + step `ops`/`joints`), `fixcab` (Parts & CNC readiness card → cabinet + step, or the worktop material field), `drwcab` (editor → Drawings filtered to this cabinet).

---

## 4. Form-field helpers and the binding pipeline

| Helper | Line | Output | Notes |
|---|---|---|---|
| `fN(label, bind, val, cls)` | 943 | `<label class="f n …"><span>label</span><input type="text" inputmode="decimal" data-bind data-num="1">` | text input, not `type=number`; class `s` = narrow |
| `fT(label, bind, val, list, cls)` | 944 | text input, optional `list="dl-…"` | default class `grow` |
| `fS(label, bind, val, opts)` | 945 | `<select data-bind>`; `opts = [[value, text], …]` | |
| `dd(bind, val, opts, label)` | 1757 | same as `fS`, class `dd` | used in the construction step |
| `seg(bind, val, opts)` | 947 | segmented buttons `data-act="set" data-bind data-v`, `aria-pressed` | a click calls `assign(bind, v)` then **full render**; `v` is always a string (`'true'`/`'false'` become booleans in `assign`) |
| `segI(…)` | 946 | `seg` + connector symbol (`ISO.sym`) before confirmat / cam / dowel | |
| `chk(bind, val, label)` | 948 | `<label class="chk"><input type="checkbox" data-bind>` | |
| `choice(bind, val, v, icon, title, desc)` | 1576 | large picture card, `data-act="set"` | main joinery |
| `opRow(bind, on, title, desc, verified, applies, more)` | 1597 | operation row: checkbox + title + description + badge "patikrinta / verified" or "nepatikrinta / unverified"; class `na` + "šiai spintelei nereikia / not needed for this cabinet" when it does not apply; `more` only when on and applicable | |
| `step(no, title, lead, body, key)` | 949 | the step card | |
| `reqF(html, val)` | 1754 | adds a red `*`, `required`, `aria-invalid` when empty | |

Typing rules (`num()`, 324–331; `numOrNull`, 2777–2782): decimal comma accepted; simple arithmetic is evaluated (`600-18`, `2*300`) via `Function(...)` on a string restricted to digits and `+-*/().`.

Pipeline for a bound field:
1. `focusin` stores `data-prev` (and, for `c.W` with columns, the column widths in `colBase` so they scale proportionally).
2. `input`: number fields apply only when parseable and inside `numLimit(bind)`; an empty `data-empty` field assigns `''`. Then `save()` + `refreshLive()`.
3. `change`: unparseable → previous value (toast "Netinkamas skaičius / Not a number → n"); out of range → previous valid value or clamped (toast "Leidžiama a–b / Allowed a–b → n"); integers rounded. Then full or live refresh (1.3).
4. `save()` (647–657): stamps `updated`, writes `localStorage['dbKurejas.current']`, schedules the project-library write (250 ms) and the cabinet-library sync (300 ms), flashes the saved mark. In read-only mode (`S.ro`) it only sets `S.roDirty`.

There is no model layer: `assign()` (2729–2774) is `setPath(obj, path, value)` plus a list of special cases (section 13.2).

---

## 5. Cabinet editor, step by step (normal cabinet) — `viewEditor(c)` 1134–1202

`viewEditor` dispatches: `c.kind === 'box'` → `boxEditor`, `'panel'` → `panelEditor`, else the six steps below (two for a dishwasher). `o = c.cnc` throughout.

### Step 1 — `dims` · "Matmenys / Dimensions"
Lead: "Karkaso išoriniai matmenys milimetrais, be kojelių. Galima rašyti 600-18. / Outer carcass size in millimetres, without legs. You can type 600-18."

| Label LT / EN | Binding | Range | Notes |
|---|---|---|---|
| Plotis / Width | `c.W` | 50–6000 | with partitions, changing W rescales the column widths proportionally |
| Aukštis / Height | `c.H` | 50–6000 | live refresh only |
| Gylis / Depth | `c.D` | 50–6000 | live refresh only |
| Plokštė / Board | `c.thick` | 6–60 | carcass board thickness |
| Fasadas / Front | `c.cnc.facadeT` | 6–60 | front thickness |

No picture in the step itself; the 3D preview at the right follows the typing.

### Step 2 — `build` · "Konstrukcija / Construction"
Lead: "Kaip surenkama dėžė: atramos, dugnas, viršus, šonai, nugara, jungtys." Five groups (`.bgrp`).

**Group A — "Atramos ir dugnas / Supports and bottom"** (1148–1152)
| Control | Binding | Options / rules |
|---|---|---|
| Atramos / Supports (seg) | pseudo `c.cnc.support` | `legs` Kojelės / `feet` Pėdutės / `none` Nėra → writes `cnc.legs = v !== 'none'`, `cnc.feet = v === 'feet'` (2764). Shown value: `!o.legs ? 'none' : o.feet ? 'feet' : 'legs'` |
| "Nustatymai → / Settings →" | `data-act="goto" data-v="st-ops"` | only when `o.legs`; jumps to step 4, where the leg count and height live |
| Dugnas / Bottom (select) | `c.cnc.bottom` | `under` "Po šonais / Under the sides", `inside` "Tarp šonų / Between the sides" |
| Dugno aukštis nuo apačios / Bottom height from below | `c.cnc.bottomZ` (0–2000) | only when bottom is `inside` |
| Dugno gylis / Bottom depth | `c.cnc.bottomD` (0–2000, `data-empty`, placeholder "visas / full") | `botDepthField` 994–998. When shorter than D, hint "gale ≈ {g} mm laisva — vamzdžiams / ≈ {g} mm free at the back — for the pipes" |
| Pictogram | `camPick('bottom', bottomPic(bIn, bCam), bCam)` | 64×40 front section showing where the bottom sits. If the bottom is inside **and** the `bottom` joint is cams, the picture is a button `data-act="camside" data-v="bottom"` toggling `c.cnc.camOut.bottom`, caption "ekscentr.: vidus / išorė" |

Plinth (`plinthBlock`, 979–993) — hidden for wall cabinets (`cabKind(c) === 'PAKABINAMOS'`). The plinth is not a property of the cabinet: it is the first entry of `c.extras` with `kind === 'plinth'` or a name matching `/cokol|plint/i` (`plinthIdx`, 978).
| Control | Action / binding | Rules |
|---|---|---|
| Cokolis / Plinth: Nėra / Yra | `data-act="plinth" data-v="off\|on"` | `on` pushes an extra `{ kind:'plinth', name, between, L, W, T, qty:1, mat: facade or carcass, e1:true }` with sizes derived from W, leg height and bottom lift (3005–3009); `off` deletes it |
| Cokolio vieta / Plinth position: Tarp šonų / Po korpusu | `data-act="plinthpos" data-v="in\|under"` | only when the bottom is lifted (`hbOf(c) > 0`); adjusts `between`, and L / W / `yf` if they still hold auto values (3000–3004) |
| Aukštis / Height | `c.extras.<i>.W` | |
| Ilgis / Length | `c.extras.<i>.L` | |
| Nuo priekio / From the front | `c.extras.<i>.yf` (−300…300) | default shown: 20 between the sides, 50 under |
| Stor. / Thk. | `c.extras.<i>.T` | |
| Medžiaga / Material | `c.extras.<i>.mat` (`dl-mat`) | |
Note: "Cokolis įtraukiamas į detalių sąrašą (tik pjaunamas)… Jis taip pat yra „Papildomos“ žingsnyje." The same record is edited again in step 6.

**Group B — "Viršus / Top"** (1153–1156)
| Control | Binding | Options / rules |
|---|---|---|
| Viršus / Top (select) | `c.cnc.topMount` | `over` "Ant šonų / On the sides", `inside` "Tarp šonų / Between the sides". Displayed as `inside` whenever the top is rails |
| Viršaus tipas / Top type (select) | `c.cnc.top` | `rails` "Juostos / Rails", `full` "Pilnas viršus / Full top" |
| Viršus dengia fasadus / Top covers the fronts (checkbox) | `c.cnc.topOverFacade` | only full top mounted on the sides |
| Pictogram | `camPick('top', topPic(inside, tCam), tCam)` | full top only; clickable for cams when inside |
| Išlenda priekyje (or "už fasadų" when covering) / šonuose / gale — overhangs | `c.cnc.topOvF`, `topOvS`, `topOvB` (0–300) | full top on the sides only; note explains the board grows by that much |
| Rails editor (`railsEditor`, 1445–1455) | | only when the top is rails |

Rails editor: heading "Surišimo juostos · Juostų: n / Top rails · Rails: n" (n counted from the engine's panels with role `JUOSTA…`).
| Row | Binding | Options |
|---|---|---|
| Priekyje / Front | `c.cnc.rails.front` | `h` Gulsčia / Flat, `v` Stati / Standing, `none` Nėra |
| Gale / Back | `c.cnc.rails.back` | `h`, `v`, `hv` Gulsčia + stati, `none` |
| Apačioje gale / Bottom back | `c.cnc.rails.bottom` (checkbox) | "stati juosta ant dugno / standing rail on the bottom" |
| Juostos plotis / Rail width | `c.cnc.railW` (30–400) | |

Hidden couplings in `assign()`: choosing `topMount = over` while the top is rails silently switches the top to `full` (2762); choosing `top = full` coming from rails sets `topMount = inside` (2763).

**Group C — "Matomi šonai (iš fasado medžiagos) / Visible sides (in the front material)"** (`visBlock`, 963–968)
| Checkbox | Binding | Rule |
|---|---|---|
| Kairys / Left | `c.vis.L` | |
| Dešinys / Right | `c.vis.R` | |
| Apačia / Bottom | `c.vis.B` | only wall cabinets (`c.type === 'PAKABINAMOS' \|\| c.hang`) |
| Šonai per visą aukštį (dengia viršų ir dugną) / Full-height sides | pseudo `c.cnc.sideFull` | shown value computed by `sideFullOf(c)` (970): bottom inside, not lifted, and top is rails or inside. Ticking sets `bottom='inside'`, `bottomZ=0`, and for a full top `topMount='inside'`; unticking sets `bottom='under'` and `topMount='over'` (2760–2761). It is a macro over three controls of groups A and B |
Long note `visNote` (clamped to two lines).

**Group D — back and worktop** (`.mainset`)

Back (`backBlock`, 1762–1789), heading "Nugara / Back":
| Control | Binding | Options / visibility |
|---|---|---|
| Type, **one select per column** (label "Tipas", or the column name with partitions) | `c.cnc.backs.<k>` | `none` Nėra, `hdf` "Plaušas / Fibreboard", `solid` "Kieta 18 mm / Solid 18 mm" |
| Kieta nugara / Solid back | `c.cnc.backMount` | `top` "Išorėje — ant galo / Outside — on the back edges", `inside` "Viduje — tarp šonų". Only if some column is solid. Forced to display `inside` unless **all** columns are solid |
| Tvirtinimas / Fixing | pseudo `c.cnc.backJoint` | confirmat / cam / dowel; writes the type into the `back` and `backP<n>` joints through `setJoint` (2758–2759). Only if some column is solid |
| Pictogram | `camPick('back', backPic(kind, kCam), kCam)` | plan view from above; clickable for cams on an inside back |
| Apačioje / At the bottom | `c.cnc.backCover.bottom` | "Stovi ant dugno" / "Dengia dugną (dugnas trumpesnis)". Only all-solid + inside + bottom inside |
| Viršuje / At the top | `c.cnc.backCover.top` | under / covers the top (or the back rail). Only all-solid + inside and (full top inside, or flat back rail with one column) |
| Nugara nuo galo, mm / Back from the rear edge | `c.cnc.backInset` (0–1000) | any solid + inside |
| Nugaros priekis nuo spintelės priekio / Back's front face from the cabinet front | unbound input `#f-bk-front` with `data-bkfront="<max>"` | the same quantity from the other end; on change converted into `backInset` (2823–2827) |
| Notes | | `bTopOnlyAll`, `bFix_<mount>_<type>[_out]` (what will be visible from behind), `bHdfNote` |

Worktop (`worktopBlock`, 1816–1826), heading "Stalviršis / Worktop":
| Control | Binding | Rules |
|---|---|---|
| Nėra / Yra | `c.worktop.on` | beside it the computed size "Stalviršis L × W × T mm" from `E.worktopOf(c)` |
| Wall-cabinet warning note | | when on and `cabKind` is wall |
| Stalviršio medžiaga / Worktop material | `c.worktop.mat` (`dl-wt`) | **required** when on |
| Storis / Thickness | `c.worktop.T` (6–120) | `data-empty`, placeholder 38 |
| Už fasadų / Past the fronts | `c.worktop.over` (−100…300) | placeholder 20 |
| Kairėje už šono / Dešinėje už šono | `c.worktop.left`, `.right` (0–1000) | placeholder 0 |
| Stalviršio kraštas / Worktop edge | `c.worktop.edge` (`dl-edge`) | |
Note: worktops of neighbouring cabinets in the Furniture tab are merged into one piece in the part list.

**Group E — "Pagrindinis jungimas / Main joinery"** ("Taikomas visoms jungtims, kurių nekeitėte / Used for every joint you have not changed")
Two picture cards bound to `c.cnc.joinery`: `confirmat` "Konfirmatai — Ø8 kiaurai + Ø5×32 krašte…" and `cam` "Ekscentrikai + kaiščiai — Ø15 ekscentrikai šone, Ø8 varžtai ir kaiščiai. Surenkama be klijų." Pictures from `DBArt.pic` (`artOf`, 1575).
Per-joint editing for a normal cabinet exists only inside the joints-check modal (section 8) and in the 3D preview.

### Step 3 — `secs` · "Sekcijos / Sections"
Lead: "Viršus sąrašo viršuje. „Likęs“ — užima likusį aukštį. / Top of the list is the top of the cabinet. "Fill" takes the remaining height."

**3a. Partitions / columns** (1167–1169)
| Control | Binding | Rules |
|---|---|---|
| Pertvaros / Partitions (seg) | `c.cols` | 1 "Nėra", 2 "1 pertvara", 3 "2 pertvaros". Change resets `c.colW` and runs `fixCols(c)` (374–384): pads `cnc.backs`, moves sections of a removed column to the last column and remembers their origin in `s.colWant` |
| "<column> plotis / width" | `c.colW.<k>` (50–6000) for the first n−1 columns | the last column is read-only text `#colw-last` = remainder. Widths are measured to the partition centre. If they do not fit: toast `colTooWide` and `colWidths()` (366–372) silently falls back to equal columns |
Column names (`colName`, 385): Kairė / Vidurinė / Dešinė (Left / Middle / Right); a single column is "Spintelė".

**3b. Column map** `#colmap` = `colMapInner(c)` (1113–1131) — see section 7.
With partitions: hint "Paspauskite koloną, kad ją redaguotumėte. / Click a column to edit it."

**3c. Front gaps** (`fgBlock`, 1102–1112) — only when the engine reports `r.fgaps`, the cabinet has fronts and is not a dishwasher. Heading "Fasadų tarpai, mm / Front gaps, mm".
| Label | Binding | Range | Placeholder (rule value) |
|---|---|---|---|
| Kairėje / Left | `c.cnc.fg.l` | 0–100 | `g.l` (3) |
| Dešinėje / Right | `c.cnc.fg.r` | 0–100 | `g.r` |
| Viršuje / Top | `c.cnc.fg.top` | 0–100 | `g.top` |
| Tarp fasadų / Between fronts | `c.cnc.fg.mid` | 0–100 | `g.mid` (3) |
| Apačia nuo dugno / Bottom from the bottom panel | `c.cnc.fg.bot` | −1500…1500 | `g.bot` |
All `data-empty` (empty = by the rule). Buttons: "↓ Iki šonų apačios / Down to the sides' bottom" (`fgbot` `side`; only with a lifted bottom; disabled when already there) and "Pagal taisyklę / By the rule" (`fgbot` `reset`; only when some gap is set). Long note `fgNote`.

**3d. The active column** (1172–1182). With partitions only the active column (`S.colSel`) is listed; the map shows them all.
- Header (with partitions): "Redaguojama kolona / Editing column" + name + width.
- Zone summary `<div class="zone" data-col>` = `zoneHtml(zoneInfo(c,k))`: "Fasadų zona **Hz** mm · užimta **used**" + " · **viršyta X**" when over, or " · **liko X mm**" when there is no fill section and more than 1 mm is free.
- Section cards, **rendered top first**: the array `c.sections` is ordered bottom → top and is iterated backwards (1178).
- "Pridėti viršuje / Add on top:" five buttons `data-act="addsec" data-v="drawers|doors|cargo|open|oven" data-i="<column>"` (labels Stalčiai, Durys, Cargo, Lentynos, Orkaitė). A new section is always appended, i.e. placed at the top of the column. Defaults from `newSection(kind)` (358–362): drawers 540 fixed with 3 drawers; oven 595 fixed; doors / open / cargo = fill.

`zoneInfo(c, col)` (951–958) reproduces the engine's rule in the UI: usable front height `Hz` = cabinet height minus bottom lift, minus the top allowance (board thickness under a covering top, 2 mm with rails, 0 otherwise), adjusted by the custom gaps `fg.top`, `fg.mid`, `fg.bot`. `exp` = sum of fixed heights in the column, `nFill` = number of "fill" sections, `fillH = max(0, Hz − exp) / nFill`, `over = exp > Hz + 0.5`.

**3e. A section card** (`viewSection`, 1864–1907). Data path `c.sections.<i>.`; `i` is the index in the whole array, not within the column.
Head: kind label; checkbox "Likęs / Fill" (`.fill`); when fill, the computed height as text, else "Aukštis / Height" (`.height`, 0–6000).
Tools: ▲ (`mv`, `data-v="1"`, disabled for the top one), ▼ (`mv`, `-1`), ✕ (`rmsec`, immediate, toast with Undo).

| Kind | Fields (binding · options) | Extra blocks |
|---|---|---|
| **drawers** "Stalčiai" | Stalčių / Drawers `.nDrawers` (1–12, integer) · Bėgeliai / Runners `.hw`: `BLUM TANDEMBOX`, `BLUM MERIVOBOX`, `BLUM TANDEM`, `GTV KULKINIAI H45`, `DTC KULKINIAI H45`, `DTC PASLĖPTI` · Bėgelio ilgis / Runner length `.rail` (list depends on the runner, `railLengths` 1851; changing the runner snaps the length to the nearest allowed one) · for MERIVOBOX: `.mvH` (auto / N / M / K / E) and, for auto or E, `.mvExt` (rail / boxcap) · for a single drawer, the front height as text | `frontsEditor` when n > 1 |
| **doors** "Durys" | "Durys žemiau, ant nišos (mm) / Doors lower, over the niche" `.frontDrop` — only when the section directly below in the column is `open` · checkbox "Integruojamas šaldytuvas / Integrated fridge" `.fridge` · Durų / Doors `.nDoors` (1–6) · Išdėstymas / Layout `.doorSplit`: `v` Šalia / `h` Viena virš kitos · Lankstai / Hinges `.hinge`: `BLUM LANKSTAI`, `BLUM TIP-ON`, `KT. LANKSTAI`, `BE FURNITŪROS` · Lankstų pusė / Hinge side `.hingeSide` auto / left / right — hidden for two or more doors side by side · Lankstų durims / Hinges per door `.hingeN` auto (shows the computed number) / 2 / 3 / 4 / 5 — hidden when no hardware · Lentynų / Shelves `.shelves` (0–12) · with shelves: `.shelfAdj` Kilnojamos / Fiksuotos | `frontsEditor` when stacked and n > 1; `shelfPosEditor` when shelves > 0 |
| **doors + fridge** "Šaldytuvas" | checkbox `.fridge` (ticked) · Fasadai `.nDoors`: 1 "vien šaldytuvas" / 2 "šaldytuvas ir šaldiklis" · Vyriai `.hingeSide` left / right · texts: handle side, niche size ≈ (section height − 2 boards) × (column width − 2 boards) | `frontsEditor`; `fridgeNote`. Ticking forces `doorSplit='h'`, `hinge='BE FURNITŪROS'`, `shelves=0` and remembers the previous hinge (2755–2757) |
| **cargo** | Cargo furnitūra `.cargoHw` (`CARGO DTC PURE PRO`) · note | |
| **open** "Lentynos" | `.shelves` · `.shelfAdj` · checkbox "Skiriamoji lentyna tarp nišos ir fasadų / Dividing shelf" `.divider` — only when the same column also has drawers / doors / cargo | `shelfPosEditor` |
| **oven** "Orkaitė" | Atramų / Supports `.shelves`: 0 / 1 below / 2 below and above | |

`frontsEditor` (1926–1939) "Fasadų aukščiai, mm · iš viršaus · tuščias = dalijasi likusį aukštį": one input per stacked front, top first, `c.sections.<i>.frontH.<q>` (0–3000, `data-empty`), a proportional bar, the real cut height, class `bad` when the typed value is not what will be cut, a warning line from `E.splitFronts`, and "↺ Vienodi / Equal" (`fhreset`).
`shelfPosEditor` (1911–1925) "Lentynų aukščiai · nuo sekcijos apačios iki lentynos vidurio, mm · tuščias — tolygiai": one input per shelf, top first, `c.sections.<i>.shelfPos.<q>` (0–6000, `data-empty`), real position beside it, "↺ Tolygiai / Evenly" (`shposreset`).

**3f. Shelf front** (`shelfFront`, 1363–1368) — at the bottom of the step, only if some doors / open section has shelves. One setting for all shelves of the cabinet: seg `c.shelfSb` 0 "Lygiai su priekiu / Flush" / −2 / −5 / −20 mm plus a free field "Atitraukti, mm / Set back" bound to the same `c.shelfSb` (−150…150; the engine uses the absolute value). Default 20 (`E.R.shelf.setback`).

### Step 4 — `ops` · "Papildomos operacijos / Extra operations" (nav label "Operacijos")
Lead: "Pažymėkite, ką gręžti CNC. „Patikrinta“ — sutampa su jūsų SWOOD modeliais."

| Row (LT / EN) | Checkbox | Applies when | Badge | Sub-controls when on |
|---|---|---|---|---|
| "Kojelės ir jų žymės dugne / Legs and their marks" — or "Pėdutės po šonais / Feet under the sides" | `c.cnc.legs` | always | verified (legs) / unverified (feet) | `legsEditor` |
| "Bėgelių žymės šonuose / Runner marks in the sides" | `c.cnc.runnerMarks` | a drawer section with a known runner | verified | – |
| "TANDEMBOX fasadų tvirtinimas / front fixing" | pseudo `c.cnc.tbOn` (= `tbFront !== 'off'`) | a TANDEMBOX section | verified | `c.cnc.tbFront`: `mark` "Žymės Ø5 (varžtams)" / `hole` "Skylės Ø10 (reikia Ø10 grąžto)" |
| "Lankstų skylės / Hinge holes" | `c.cnc.hinges` | a door section with hardware | **unverified** | `c.cnc.hingeFix`: `screw` / `press` |
| "Lentynų laikiklių skylės / Shelf support holes" | pseudo `c.cnc.pinsOn` (= `pins !== 'off'`) | adjustable shelves | **unverified** | `c.cnc.pins`: `shelf` "Tik po lentyna" / `row` "Eilė ±2 kas 32" |

`legsEditor` (1549–1561):
- Legs: "Kojelių eilėje / Legs in a row" `c.cnc.legsX` 2–6 (an option is disabled with tooltip "Per tankiai" when the spacing would be under 70 mm), plus "Po pertvaromis / Under partitions" (`parts`) with partitions.
- Feet: with partitions only, `c.cnc.legsX` `2` "Tik po šonais" / `parts` "Po šonais ir pertvaromis".
- "Eilės / Rows" `c.cnc.legsY`: 2 "priekis, galas" / 3 "+ vidurys".
- "Kojelių aukštis / Leg height" `c.legH` (0–400) — legs only; feet show a fixed note.
- Plan picture `legPlanSVG` (bottom board, partitions, leg plates, "▼ priekis") and the total count.

LED block (`ledBlock`, 1584–1596) "LED apšvietimas · įleidžiamo profilio griovelis 16 × 8": one row per groove `c.leds.<k>`: Kur / Where `.at` (bottom, top, L, R) · Pusė / Face `.side` (in / out) · Nuo priekio `.from` (0–3000) · Galai / Ends `.ends` (open "Kiaurai" / closed "Uždari") · ✕ (`leddel`) · an engine note when the groove was moved. Add buttons `ledadd` × 4.

### Step 5 — `mats` · "Medžiagos ir kraštai / Materials and edges" (`matsBlock`, 1603–1610)
Lead: "Pavadinimai keliauja į detalių sąrašą ir nesting programą."
`matDock(c)` (drag materials onto the 3D boards; outside this slice), then the note "* privaloma — be to detalių sąraše nebus medžiagos".
| Label | Binding | Datalist | Required / visible |
|---|---|---|---|
| Karkasas / Carcass | `c.mat.carc` | `dl-mat` | required |
| Fasadai / Fronts | `c.mat.facade` | `dl-mat` | required when the cabinet has drawers / doors / cargo |
| Nugara / Back | `c.mat.back` | `dl-mat` | |
| Viršus (stogas) / Top | `c.mat.top` | `dl-mat` | only with a full top; placeholder = carcass |
| Stalčių dugnas / galas (16 mm) | `c.mat.drawer` | `dl-mat` | only with MERIVOBOX drawers |
| Karkaso kraštas / Carcass edge | `c.edge.carc` | `dl-edge` | not required (a warning only on the Parts & CNC tab) |
| Fasado kraštas / Front edge | `c.edge.facade` | `dl-edge` | not required — but see 9.5 |
Materials are free text with suggestions. Below: "Išvaizda 3D vaizde / Look in the 3D views" (`lookBlock`, texture or colour per material name).

### Step 6 — `extra` · "Papildomos detalės / Extra parts" (`extrasBlock`, 1514–1528)
Lead: "Detalės, kurių nėra konstrukcijoje: cokolis, apdailos plokštė, papildoma lentyna… Tik pjaunamos, be skylių."
Table, one row per `c.extras.<i>`:
| Column | Binding | Notes |
|---|---|---|
| Pavadinimas / Name | `.name` | |
| Ilgis / Length | `.L` (1–6000) | `aria-invalid` when not > 0 |
| Plotis / Width | `.W` (1–6000) | |
| Stor. / Thk. | `.T` (1–120) | |
| Kiek. / Qty | `.qty` (0–999, integer) | 0 = not added (warning) |
| Medžiaga / Material | `.mat` (`dl-mat`) | |
| Kraštai / Edges | `.e1 .e2 .e3 .e4` checkboxes labelled L1 L2 W1 W2 | |
| ✕ | `rmx` | toast with Undo |
Sub-rows: a side panel (`kind:'side'`) gets Vieta / Place `.side` (L / R / "nepastatyta"), `.zb` (−5000…5000), `.yf`; a plinth gets `.yf`.
Add buttons: "＋ Detalė" (`addx` `part`), "＋ Cokolis" (`addx` `plinth`), "＋ Šoninė plokštė" (`addx` `side`).
`plinthFitBlock` (1018–1028), only when a plinth exists: gaps `c.extras.<i>.gl / gr / gt / gb` (0–500, `data-empty`; left, right, to the bottom board, from the floor); button "⇔ Pritaikyti: tarp šonų po 1 mm, 4 mm iki dugno" (`plfit` `data-v="<i>"` → gl=1, gr=1, gt=4, gb=0, `between=true` with a lifted bottom); "Nustatyti dydį ranka" (`plfit` `"<i>:off"`); and a close-up picture with draggable plinth edges (`plinthPic`, 1029–1039).

---

## 6. Editor variants

### 6.1 Dishwasher front (`c.dishwasher`)
Two steps (1143, 1163): `dims` — "Indaplovės plotis / Dishwasher width" `c.dishWidth` instead of W, then H, D, board, front thickness and the **worktop block**; `mats` — carcass (not required), fronts (required), both edges; no back field. Has the cabinet bar. No joints banner (no joints); the edges banner is shown.

### 6.2 Loose panel (`c.kind === 'panel'`, `panelEditor` 1530–1541)
One step "Plokštė / Panel": name; "Storis / Thickness" bound to **`c.W`** (3–100 for a panel, `numLimit` 2793); H; D; library / duplicate / delete buttons inline; "Medžiaga" `c.mat.carc` (required); "Krašto medžiaga" `c.edge.carc`; four edge checkboxes `c.pe.e1…e4` (L1 priekis, L2 galas, W1 apačia, W2 viršus); look block. Position is set in the Furniture tab. The edges banner is shown, the joints banner is not.

---

## 7. Front picture, column map and drag handles

- `colMapInner(c)` (1113–1131) draws the real cabinet front with `window.DBFront.svg(c, r, opts)` (front.js) using the engine result; options `{ bnd (column boundaries), sel (active column), over[] (per-column overflow), ovens[], legs, legH, type: cabKind(c), label }`.
- Above the picture (with partitions): tabs per column `data-act="colsel" data-v="<k>"` with name and width, flex-sized in proportion to the column widths, class `over` when the column overflows.
- Below: a legend per column with its back type ("be nugaros / Plaušas / Kieta 18 mm").
- `fgHandles(r)` (1047–1054) appends four thick orange SVG lines `data-fgh="bot|top|l|r"` on the outer edges of the union of all fronts (`fgFronts`, 1040–1046). Dragging (document-level `pointerdown / move / up`, 1055–1100) moves the line, shows a tooltip "label: value — snap name", snaps (bottom: flush with the bottom panel / down to the sides' bottom; top: flush with the top; sides: flush with the side's outer face, 3 mm, half a board), rounds to 0.5 mm and on release writes `c.cnc.fg[k]`, saves and renders. Limits while dragging: top 0–80, sides 0–40.
- `plinthPic` adds handles `data-plh="gl|gr|gt|gb"`; release writes `c.extras[plinth][k]` (and zero-fills the other three gaps).
- `frontArtOf(c, r, extra)` (1002–1013) is the same picture for other callers (the room tab).
- Small pictograms: `bottomPic`, `topPic`, `backPic` — 64×40 SVGs with the affected board in blue and orange cam marks (`camMarks`, 1792).
- `sectionSVG` / `connectorMarks` (1457–1513) draw a side section with the connectors, but no `#xsec` element is rendered any more (section 15).

---

## 8. "Confirm joints" gate

### 8.1 Signature
`jcSig(r)` (1205–1206): for every joint in `r.joints`, in engine order:
```
<key>=<type>:<pos,pos,…>            left side (or the joint itself when both sides are equal)
     |<type>:<pos,pos,…>            right side, omitted when j.single
```
joined with `;`. Positions are rounded to 0.1 mm. Example (verified live, drawer base cabinet):
`railF=confirmat:30,70|confirmat:30,70;railB=confirmat:30,70|confirmat:30,70;bottom=confirmat:50,280,510|confirmat:50,280,510`
Included: joint keys, connector type per side, every position. Not included: seam length `j.w`, which face the cams are on (`camOut`), hole diameters and depths, anything about fronts or hardware.

### 8.2 Storage and invalidation
- Stored on the cabinet: `c.jointsOk = jcSig(r)` (action `jcok`, 3039). Persisted with the project; copied by Duplicate and by the library.
- `jcNeeded(c, r)` (1207) = the cabinet has joints **and** `c.jointsOk !== jcSig(r)`. There is no explicit invalidation: the comparison runs on every render.
- Consequences (verified live): changing depth 560 → 500 moves the bottom connectors and re-opens the check; changing width or height alone does not; returning to exactly the confirmed state makes it valid again; a new or removed joint (partition, fixed shelf, rail, solid back) re-opens it.
- Cabinets without joints (dishwasher front, loose panel) never need it.

### 8.3 Where it is surfaced
| Place | Behaviour |
|---|---|
| Editor banner `jcBanner` (1298–1303) | amber "⚠ Būtina patikrinti sujungimus — Patikrinti →" or green "✓ Sujungimai patikrinti — Peržiūrėti"; `data-act="jcopen"` |
| Auto-open while stepping (3068–3070) | moving from a step at or before the joints step (`ops`; `joints` for a box) to a later one opens the modal with an error toast — **once per cabinet per page load** (`S.jcAsked`); closing it lets the user continue |
| Furniture tab | chip in `roomChecks` (section 10) |
| **Not** surfaced | step dots, cabinet-list dots, the readiness card on Parts & CNC (`readyCheck`, 2377–2395), any download action |

So the gate is advisory. Nothing blocks exporting `.XXL` programs from an unconfirmed cabinet.
The banner is only recomputed on a full render: after typing a new depth it stays green until something else triggers `render()` (verified live).

### 8.4 The modal (`jcModal`, 1318–1342; 3D part mounted by `mountJc`, 2632–2643)
- Overlay `data-act="jcclose"`, box `data-stop`, title "Sujungimų patikra — <name> · W×H×D", ✕.
- Intro and legend (red dot = cams, blue ring = confirmats, grey square = dowels).
- Joint-related warnings filtered from the cabinet's warnings by `/jungt|ekscentr|konfirmat|kaišt|sujung/i`.
- Left: `#jc-iso`, the connector 3D view (`ISO.attach`), selection linked to the list.
- Right: one row per joint, sorted by a fixed order `bottom, top, railF, railB, railV, railVH, railBottom, railBotB, back, partB, partT, partF, partR, backP, shelf, oven` (per-partition keys carry a digit):
  - ◎ "Parodyti spintelėje / Show on the cabinet" (`jcsel`);
  - joint name via `tJ('jk_' + key)`: "Dugnas ↔ šonai", "Viršus ↔ šonai", "Priekinė juosta", "Galinė juosta", "Stati galinė juosta", "Stati juosta ↔ gulsčia", "Apatinė juosta", "Apatinė juosta ↔ dugnas", "Nugara", "Pertvara n ↔ dugnas / viršus / priekinė juosta / galinė juosta", "Nugara ↔ pertvara n", "Fiksuotos lentynos", "Orkaitės atramos";
  - seam length in mm;
  - badge "standartas" or, when customised, "↺ standartas" (`jreset`);
  - `jcStrip` (1310–1317): the seam drawn to scale as a bar with a symbol at every connector and its distance in mm; two strips (left side / right side) when the sides differ;
  - controls: type (`segI` on `c.cnc.joints.<key>.type`: Konfirmatai / Ekscentrikai / Kaiščiai); "Kiekis / Count" − n + (`jcn`, 1–8, writes `.n`, deletes `.pos`); "Nuo krašto / From edge" (`c.cnc.joints.<key>.e`, 5–3000, empty = default). When positions were set by hand or the sides differ: text "Vietos nustatytos ranka" and "Keisti 3D" (`jc3d`: closes the modal and selects the joint in the 3D preview).
- Footer: "↶ Atšaukti / Undo" when available, and the primary button "✓ Sujungimai patikrinti" (`jcok`) — reads "Patikrinta — uždaryti" when nothing changed since the last confirmation.
- Undo covers count changes, resets and 3D edits (`pushUndo`), **not** a type change through the segmented buttons (verified live), nor anything outside joints / box data.

Per-joint override storage: `c.cnc.joints[key] = { type?, n?, e?, pos?[] }` or `{ L:{…}, R:{…} }` (`setJoint`, 2606–2614).

---

## 9. "Confirm edge banding" gate

### 9.1 Signature
`ecSig(r)` (1223): for every panel `p` in `r.panels`: `<p.key>=` + four characters for the edges `y0, y1, x0, x1`: `0` not banded, `1` banded, `F` banded "as the fronts" (`p.ebFac[e]`). Joined with `;`. Example (verified live):
`KAIRE=0101;DESINE=1001;DUGNAS=1011;JUOSTA_PRIEKIS=1100;JUOSTA_GALAS_H=1100;DURYS1=0000;DURYS2=0000;LENTYNA1=1000`
Not included: edge material names, panel sizes, extra parts' edges, worktop edges.

### 9.2 Storage and invalidation
`c.edgesOk = ecSig(r)` on `ecok` (3022). `ecNeeded(c, r)` (1224) = the cabinet has panels and the stored string differs. Every cabinet kind needs it, including dishwasher fronts and loose panels. Adding or removing any panel (a shelf, a drawer, a rail) changes the signature.

### 9.3 Where it is surfaced
Banner `ecBanner` (1304–1309) under the joints banner ("⚠ Būtina patikrinti kraštų laminavimą" / "✓ Kraštai patikrinti"), `data-act="ecopen"`; chip in the Furniture tab. No auto-open, no step dot, not in the readiness card, no export block.

### 9.4 The modal (`ecModal`, 1274–1297)
- Title "Kraštų laminavimo patikra — <name> · W×H×D".
- Note with the standard rule and a colour legend: blue `#1f5fbf` = carcass edge (shows `c.edge.carc`), orange `#d9730d` = as the fronts (shows `c.edge.facade`), grey = not banded.
- Checkbox `c.cnc.ebBack` "Laminuoti ir galinius (nematomus) šonų, dugno ir viršaus kraštus / Band the back (unseen) edges too".
- Left: `ecModel(c, r)` (1229–1265) — a hand-made painter's-algorithm SVG of every placed panel as a box; edge faces are coloured and clickable. Toolbar `data-act="ecview"`: `front`, `backv`, `under`, `exp` (pull apart), `fronts` (show fronts, hidden by default), `zin`, `zout`. Drag rotates, wheel zooms (1266–1273); only the model is redrawn.
- Right: one card per panel: short name, L × W × T, "↺" reset when manually changed, a rectangle whose four sides are click targets with their lengths, and "Visi 4 / All 4" or "Nė vieno / None".
- Footer: "✓ Kraštai patikrinti" (`ecok`).

Click logic (`ebk`, 3023–3033): `data-v` = panel key, `data-i` = `y0|y1|x0|x1|all|reset`. Cycle for a carcass part: not banded → carcass edge → as the fronts → not banded; for a front part: on / off. Overrides are stored in `c.ebEdit[panelKey] = { y0|y1|x0|x1: true | false | 'fac' }`. If neither edge material is named, a toast warns that the label will read "KRAŠTAS".

### 9.5 Observed side effect
With `c.edge.facade` empty the fronts report all four edges unbanded (`DURYS1=0000`); after a front edge name is entered they become `1111` and the confirmation is invalidated (verified live). The Materials step therefore silently changes what is banded.

---

## 10. Room-tab check bar (`roomChecks`, 1209–1220)
Rendered above the room canvas. For every cabinet with an engine result, up to three chips:
| Chip | Shown when | Action |
|---|---|---|
| "⚠ n · name — sujungimai" / "✓ n · name" | the cabinet has joints | `jcroom` → selects it and opens the joints modal in place |
| "⚠ / ✓ n · name — kraštai" | always | `ecroom` → edges modal in place |
| "✕ n · name — k klaid." (tooltip lists them) | k warnings of level bad | `rcedit` → Cabinets tab, that cabinet, step `ops` (or `joints` for a box) |
Header "⚠ Būtina patikrinti (N) / To check (N)" or "✓ Viskas patikrinta / Everything is checked". This is the only project-wide list of open confirmations.

---

## 11. Free "box" construction mode (`c.kind === 'box'`)

### 11.1 What it is
A cabinet described as six optional outer boards with free corner rules, plus inner partitions and shelves, plus fronts placed on the openings the engine finds — instead of the kitchen-cabinet model (sides, bottom, top or rails, columns, sections). The 3D preview has a matching "▣ Plokštės / Boards" mode in which boards are placed directly on the model (`data-act="box3d"` → `DBAssembly.setBoards(true)`).

Data (`fromPreset`, 422; `E.boxDefaults`; verified live):
```
c.kind = 'box'
c.box = {
  boards: { bottom|top|left|right|back|front: { on, inset, T } },   // front is off by default
  cover:  { '<a>_<b>': '<board that covers>' },                      // per corner, e.g. bottom_left
  inner:  [ { id, kind:'part', x, T } | { id, kind:'shelf', z, col, adj, T } ],
  fronts: [ { id, kind:'doors'|'drawers'|'cargo', col, cell, span, inset, … } ],
  pinRow: bool
}
```
The engine returns `r.box = { boards[], covers[], comps[] (compartments as [x0, x1]), openings[] ({ col, cell, x0, x1, z0, z1 }), cavity }`.

### 11.2 Differences from a normal cabinet
| Aspect | Normal | Box |
|---|---|---|
| Cabinet bar | separate bar above the steps | none; name and actions inside step 1 |
| Steps | 6 | 7: dims, boards, inner, fronts, joints, mats, extra |
| Supports, plinth, rails, visible sides, back types, operations, LEDs | yes | not offered (`legs` and `feet` are forced off) |
| Columns and sections | `c.cols`, `c.sections` | `c.box.inner` and `c.box.fronts` |
| Per-joint editing | only in the modal / 3D | inline list in step 5 (`jointsBlock`) as well |
| Joint names | fixed keys translated by `t('jk_…')` | keys `b_<a>_<b>…`, label text from the engine in Lithuanian, word-translated for EN (`boxLabel`, 1372) |
| Undo | joints only | joints and the whole `c.box` |
| Worktop | step 2 | step 1 |

### 11.3 Steps (`boxEditor`, 1405–1444)
1. **dims** "Matmenys" — lead "Išoriniai matmenys. Plokštes dėliokite modelyje (▣ Plokštės) arba žemiau.": `c.name`; `c.W`, `c.H`, `c.D`, `c.thick`; library / duplicate / delete; "▣ Dėlioti modelyje / Place in the model" (`box3d`); worktop block.
2. **boards** "Plokštės" — six rows in the order bottom, top, left, right, back, front (Apačia, Viršus, Kairė, Dešinė, Nugara, Priekis): checkbox `c.box.boards.<id>.on`; when on, "Įleista / Set in" `.inset` (0–3000) and "Storis / Thickness" `.T` (3–60, empty = cabinet thickness). Then "Kampai — kuri plokštė dengia kurią / Corners — which board covers which": for every corner of two boards that are on, a two-button choice `data-act="boxcover" data-v="<cornerKey>" data-w="<board>"`, or a fixed text when a set-in board forces the answer.
3. **inner** "Vidus" — rows of `c.box.inner`: a partition has "Nuo kairės (centras)" `.x` and `.T`; a shelf has "Aukštis (apačia)" `.z`, "Skyrius / Compartment" `.col` (when there are several), "Fiksuota / Ant laikiklių" `.adj`. Each has "Pašalinti" (`boxrm`). A board the engine could not place gets a badge "praleista / skipped". Add buttons `boxadd` `shelf` / `part` (a partition goes to the middle of the widest compartment, a shelf to the middle of the largest gap in compartment 0). With an adjustable shelf: checkbox `c.box.pinRow`. With any shelf: the shelf-front block.
4. **fronts** "Durys ir stalčiai" (`boxFrontsBlock`, 1376–1404) — one card per `c.box.fronts.<i>`: "Skyrius" `.col`; "Anga (iš apačios) / Opening" `.cell` (options list the opening's z range); "Angų aukštyn / Openings high" `.span`; "Fasadas" `.inset` Užeinantis / Įleistas (overlay / inset); then by kind — drawers: `.nDrawers` (1–8), `.hw`, `.rail`, MERIVOBOX fields; cargo: `.cargoHw`; doors: `.nDoors` 1 / 2, `.hinge`, `.hingeSide` (one door only), `.hingeN`. "Pašalinti" (`boxfrm`). Add buttons `boxfadd` `doors` / `drawers` / `cargo`: takes the first free opening, switches the front board off (toast), refuses with a toast when every opening is taken.
5. **joints** "Jungtys" — "Numatyta jungtis / Default joint" (the two joinery cards, `c.cnc.joinery`) and `jointsBlock(c, r)` (1343–1361): per joint, type buttons, "Kiekis" `c.cnc.joints.<key>.n` (1–30 here, against 1–8 in the modal) and "Nuo krašto" `.e`, or the manual positions with "Keisti 3D" (`isosel`), plus "↺ standartas" (`jreset`).
6. **mats** and 7. **extra** — the same blocks as a normal cabinet.

Note the key names: the fronts step uses the strings `bxS5` and the joints step `bxS4` — the two were swapped after the strings were named.

---

## 12. Catalogue

### 12.1 `data-act` actions rendered by this slice (handler lines in the click switch, 2891–3090)
| Action | `data-v` / `data-i` | Effect |
|---|---|---|
| `home` | – | save, show the project list |
| `tab` | v = tab key | switch tab, leave the chooser, scroll to top |
| `pver` | – | versions dialog |
| `pnew` | – | go home with the new-project field focused |
| `lang` | v = `lt` / `en` | language |
| `sel` | i = cabinet | select; resets `iso`, `colSel`, closes both modals |
| `pick` / `unpick` | – | open / close the chooser |
| `preset` | i = preset index | add a cabinet from a preset |
| `libadd`, `libcat`, `libnewcat`, `libcatdel`, `libdel` | v = id / category | cabinet library (in the chooser) |
| `libsave` / `libunlink` | – | save the cabinet to the library / unlink |
| `dup` | – | duplicate |
| `del` | – | two-click delete with Undo toast |
| `step` | v = step key | show a step (may auto-open the joints modal) |
| `goto` | v = element id | jump to the step containing that element |
| `set` | `data-bind`, v | `assign(bind, v)` + full render — used by every `seg`, `segI`, `choice`, leg buttons |
| `colsel` | v = column | active column |
| `addsec` | v = kind, i = column | add a section on top of a column |
| `mv` | i = section, v = `1` / `-1` | move within its column |
| `rmsec` | i = section | remove with Undo toast |
| `fhreset` | i = section | clear custom front heights |
| `shposreset` | i = section | clear custom shelf heights |
| `fgbot` | v = `side` / `reset` | fronts down to the sides' bottom / clear all gaps |
| `plinth` | v = `on` / `off` | add / remove the plinth extra |
| `plinthpos` | v = `in` / `under` | plinth between the sides / under the carcass |
| `plfit` | v = `<i>` / `<i>:off` | fit the plinth by gaps / back to manual size |
| `camside` | v = `bottom` / `top` / `back` | flip the cams' face (`c.cnc.camOut[v]`) |
| `ledadd` / `leddel` | v = place / i = index | LED grooves |
| `addx` / `rmx` | v = `part` / `plinth` / `side`; i = index | extra parts |
| `jcopen` / `jcclose` / `jcok` | – | joints modal open / close / confirm |
| `jcsel` | v = joint key | highlight a joint |
| `jcn` | v = key, i = ±1 | connector count |
| `jc3d` | v = key | leave the modal, edit in 3D |
| `jreset` | v = key | joint back to standard |
| `isosel` | v = key | select a joint in the 3D preview (box joints list) |
| `undo` | – | undo the last joints / box change |
| `ecopen` / `ecclose` / `ecok` | – | edges modal open / close / confirm |
| `ecview` | v = `front` `backv` `under` `exp` `fronts` `zin` `zout` | edges model camera |
| `ebk` | v = panel key, i = edge / `all` / `reset` | toggle banding |
| `jcroom` / `ecroom` / `rcedit` | i = cabinet | room chips |
| `boxadd` / `boxrm` | v = `shelf` / `part`; i | inner boards |
| `boxfadd` / `boxfrm` | v = `doors` / `drawers` / `cargo`; i | box fronts |
| `boxcover` | v = corner key, `data-w` = board | corner rule |
| `box3d` | – | boards mode in the 3D preview |
| `rrcab`, `drwcab` | – | realistic image; drawings of this cabinet (in the sheet) |

### 12.2 `data-bind` paths seen in this slice
Project: `p.name`.
Cabinet scalars: `c.name`, `c.W`, `c.H`, `c.D`, `c.dishWidth`, `c.thick`, `c.legH`, `c.cols`, `c.colW.<k>`, `c.shelfSb`.
Construction `c.cnc.`: `facadeT`, `bottom`, `bottomZ`, `bottomD`, `top`, `topMount`, `topOverFacade`, `topOvF`, `topOvS`, `topOvB`, `rails.front`, `rails.back`, `rails.bottom`, `railW`, `backs.<k>`, `backMount`, `backCover.bottom`, `backCover.top`, `backInset`, `joinery`, `joints.<key>.type|n|e`, `fg.l|r|top|mid|bot`, `legs`, `legsX`, `legsY`, `runnerMarks`, `tbFront`, `hinges`, `hingeFix`, `pins`, `ebBack`.
Pseudo-bindings (not stored under that name; translated in `assign()`): `c.cnc.support`, `c.cnc.sideFull`, `c.cnc.backJoint`, `c.cnc.tbOn`, `c.cnc.pinsOn`.
Visible sides: `c.vis.L`, `c.vis.R`, `c.vis.B`.
Sections `c.sections.<i>.`: `fill`, `height`, `nDrawers`, `hw`, `rail`, `mvH`, `mvExt`, `frontH.<q>`, `fridge`, `nDoors`, `doorSplit`, `hinge`, `hingeSide`, `hingeN`, `frontDrop`, `shelves`, `shelfAdj`, `shelfPos.<q>`, `divider`, `cargoHw`.
Materials: `c.mat.carc|facade|back|top|drawer`, `c.edge.carc|facade`.
Worktop: `c.worktop.on|mat|T|over|left|right|edge`.
Extras `c.extras.<i>.`: `name`, `L`, `W`, `T`, `qty`, `mat`, `e1…e4`, `side`, `zb`, `yf`, `gl`, `gr`, `gt`, `gb`.
LEDs `c.leds.<k>.`: `at`, `side`, `from`, `ends`.
Panel: `c.pe.e1…e4`.
Box: `c.box.boards.<id>.on|inset|T`, `c.box.inner.<i>.x|z|T|col|adj`, `c.box.pinRow`, `c.box.fronts.<i>.col|cell|span|inset|nDrawers|hw|rail|mvH|mvExt|cargoHw|nDoors|hinge|hingeSide|hingeN`.
Written by actions rather than fields: `c.jointsOk`, `c.edgesOk`, `c.ebEdit`, `c.cnc.camOut`, `c.box.cover`, `c.libId`, `c.extras[*].between`.

### 12.3 Other `data-*` attributes
`data-num`, `data-empty`, `data-prev`, `data-stop`, `data-force`, `data-w`, `data-col` (zone summary), `data-fill-h` (live fill height), `data-fgh` (front-gap handle), `data-plh` (plinth handle), `data-jck` (joint row), `data-bkfront` (alternative back-position input), `data-act-change` (`libmove`, and others outside this slice), `data-l` (mobile cell label in the extras table).

---

## 13. Validation

### 13.1 Number limits (`NUM_LIMITS`, 2783–2792) relevant to the editor
| Binding | Min | Max | Integer |
|---|---|---|---|
| `c.W`, `c.H`, `c.D`, `c.dishWidth` | 50 | 6000 | |
| `c.W` of a loose panel | 3 | 100 | |
| `c.thick`, `c.cnc.facadeT` | 6 | 60 | |
| `c.legH` | 0 | 400 | |
| `c.cnc.bottomZ`, `c.cnc.bottomD` | 0 | 2000 | |
| `c.cnc.railW` | 30 | 400 | |
| `c.colW.<k>` | 50 | 6000 | |
| `c.shelfSb` | −150 | 150 | |
| `c.cnc.backInset` | 0 | 1000 | |
| `c.cnc.topOvF/S/B` | 0 | 300 | |
| `c.cnc.fg.l/r/mid/top` | 0 | 100 | |
| `c.cnc.fg.bot` | −1500 | 1500 | |
| `c.extras.<i>.gl/gr/gt/gb` | 0 | 500 | |
| `c.sections.<i>.nDrawers` | 1 | 12 | yes |
| `c.sections.<i>.nDoors` | 1 | 6 | yes |
| `c.sections.<i>.shelves` | 0 | 12 | yes |
| `c.sections.<i>.height` | 0 | 6000 | |
| `c.sections.<i>.frontH.<q>` | 0 | 3000 | |
| `c.sections.<i>.shelfPos.<q>` | 0 | 6000 | |
| `c.box.fronts.<i>.nDrawers` | 1 | 8 | yes |
| `c.box.boards.<id>.inset` | 0 | 3000 | |
| `c.box.boards.<id>.T`, `c.box.inner.<i>.T` | 3 | 60 | |
| `c.box.inner.<i>.x/z` | 0 | 6000 | |
| `c.worktop.T` | 6 | 120 | |
| `c.worktop.left/right` | 0 | 1000 | |
| `c.worktop.over` | −100 | 300 | |
| `c.extras.<i>.L/W` | 1 | 6000 | |
| `c.extras.<i>.T` | 1 | 120 | |
| `c.extras.<i>.qty` | 0 | 999 | yes |
| `c.extras.<i>.zb` | −5000 | 5000 | |
| `c.extras.<i>.yf` | −300 | 300 | |
| `c.cnc.joints.<key>.n` | 1 | 30 | yes |
| `c.cnc.joints.<key>.e` | 5 | 3000 | |
| `c.leds.<k>.from` | 0 | 3000 | |

These are field-level limits only. Cross-field checks (sections taller than the zone, columns wider than the cabinet, parts too small, drawers that do not fit, …) are done by the engine and come back as warning strings.

### 13.2 `assign()` special cases (2729–2774)
| Binding | Behaviour |
|---|---|
| `c.extras.<i>.L` / `.zb` on a side panel | clears its auto-fit flag |
| `c.cnc.tbOn` | toggles `cnc.tbFront` between `off` and the remembered / default mode |
| `c.cnc.pinsOn` | toggles `cnc.pins` between `off` and the default |
| `c.sections.<i>.hw`, `c.box.fronts.<i>.hw` | also snaps the runner length to the nearest allowed |
| `…hingeN` | `'auto'` → `''`, else a number |
| `c.box.fronts.<i>.col / cell / span / nDoors / rail` | numeric; changing `col` resets `cell` and `span`; changing `cell` resets `span` |
| `c.sections.<i>.fridge` | rewrites split, hinge, shelves, door count (and restores them) |
| `c.cnc.backJoint` | writes the type to every back joint |
| `c.cnc.sideFull` | rewrites `bottom`, `bottomZ`, `topMount` |
| `c.cnc.topMount = over` with rails | top becomes `full` |
| `c.cnc.top = full` from rails | `topMount = inside` |
| `c.cnc.support` | writes `legs`, `feet` |
| `c.cols` | resets `colW`, runs `fixCols` |
| `c.W` with partitions | rescales the column widths from their values at focus time |
| `c.colW.<k>` | recomputes the last column; toast if the columns no longer fit |
| `'true'` / `'false'` | converted to booleans (every `seg` value arrives as a string) |

---

## 14. UX problems visible from the code

**Structure and order**
1. One concept is split over several steps: supports are chosen in step 2 but their count and height are in step 4 (bridged by a "Nustatymai →" link), and step 4 repeats the on/off as a checkbox on `cnc.legs`. The plinth is switched on in step 2 and edited again in step 6 (table row, plus a separate "fit by gaps" block with its own picture).
2. Order dependency against the step order: the back is chosen per column in step 2, but columns are created in step 3. Adding a partition later silently adds a back for the new column (copied from the last one); the user must go back to step 2 to see it.
3. Step 2 "Konstrukcija" is one long page with 20–30 controls in five groups (supports, bottom, plinth, top, rails, visible sides, back, worktop, main joinery). The worktop has nothing to do with construction.
4. Step 4 "Operacijos" mixes CNC drilling options, leg layout and LED grooves. Rows that do not apply are greyed but still listed. The "patikrinta / nepatikrinta" badges are developer status, not user information.
5. The shelf-front setback sits at the very bottom of step 3 and only appears once a section has shelves; it is one value for the whole cabinet but is presented under the active column.
6. Fronts' gaps (five numeric fields plus drag handles plus two buttons plus a long note) sit between the picture and the section list, pushing the main task — the sections — below the fold.
7. The cabinet type (base / wall / tall) cannot be changed after creation; it is fixed by the preset, while its behaviour is derived from height (> 1000 mm = tall) and from where it hangs in the Furniture tab.

**Hidden conditions and couplings**
8. Many fields appear or disappear depending on other values, with no indication of what is missing: bottom height only for a bottom between the sides; plinth position only with a lifted bottom; overhangs only for a full top on the sides; cover options only for an all-solid inside back; hinge side hidden for two doors side by side; divider shelf only when the column has fronts; "doors lower" only above an open section; drawer material only with MERIVOBOX; top material only with a full top.
9. Controls rewrite other controls silently: "full-height sides" is a macro over bottom and top mounting; choosing "top on the sides" converts rails to a full top; the fridge checkbox rewrites hinges, shelves and split; entering a front edge name changes which edges are banded and invalidates the edge confirmation.
10. Invalid column widths are replaced by equal columns with only a toast.
11. Empty numeric fields mean "by the rule", shown only as a grey placeholder.

**Sections model**
12. The list is stored bottom-to-top and shown top-to-bottom; "add" always adds on top; reordering is by ▲▼ only (no drag). Section indices in bindings are global, so with partitions the visible list and the indices do not correspond.
13. "Likęs / Fill" versus a fixed height is the central idea but is a small checkbox in the card head; overflow is reported as text in the zone line and as a dot on the step.
14. With partitions only one column's sections are visible at a time.

**Gates**
15. Two always-present full-width banners sit between the step navigation and the step content on every step.
16. The gates do not gate: nothing prevents exporting; the readiness card on the export tab ignores them; step dots and list dots ignore them. The only project-wide overview is on the Furniture tab.
17. The joints modal opens by itself once when stepping past step 4, with an error toast, before the user has asked for anything; it never repeats in that session.
18. Confirmation is all-or-nothing per cabinet; a small change (depth by 10 mm) asks for the whole review again without showing what changed.
19. The edge-banding confirmation is required even for a loose panel whose four edge checkboxes are already in its only step.

**Feedback and errors**
20. Errors are Lithuanian sentences from the engine, classified by regex into levels and into steps; anything unrecognised is attributed to "Operations". They are listed in a collapsed panel in the right column, far from the field that caused them.
21. Corrections are announced by transient toasts ("Leidžiama 50–6000 → 600"); the field itself shows nothing.
22. Undo exists only for joints and box data, and through toasts for deletions. A wrong click on any segmented control cannot be undone.
23. Long explanatory notes are clamped to two lines; several controls need them to be understood.

**Jargon**
24. Workshop and engine terms face the user without explanation: "Surišimo juostos", "Gulsčia / Stati", "Plaušas", "Ekscentrikai", "Konfirmatai", "Fasadų zona", "Likęs", "Atramų" for an oven, "L1 L2 W1 W2", "Ø5 × 2 žymės", "PAGAL FASADA", MERIVOBOX heights N / M / K / E, "TIP-ON".

**Box mode**
25. Box cabinets have a different layout from every other kind (no cabinet bar, name inside step 1), eight corner choices that most users will never need to touch, and fronts addressed by "compartment" and "opening number from the bottom".

---

## 15. Bugs, dead code and traps for a rewrite

| # | Finding | Where |
|---|---|---|
| 1 | The joints and edges banners are stale after live typing (depth change leaves "✓" until the next full render) — verified live | `refreshLive` 2571–2593 does not redraw them |
| 2 | `needsWt(c)` is OR-ed into `dimBad`, so a missing worktop material flags step 1 as well as step 2 on a normal cabinet (it belongs to step 1 only for a dishwasher) | 910 |
| 3 | `render()` writes plinth sizes into the project without saving | 827–829 |
| 4 | A segmented-button change of a joint's type is not undoable; the Undo button does not even appear — verified live | `set` case 2907 has no `pushUndo` |
| 5 | Connector count is limited to 8 in the modal but 30 in the box joints list | 1330 vs 2789 |
| 6 | Duplicate and library copies carry `jointsOk` / `edgesOk` | 2903 |
| 7 | Dead code: `mountIso` target `#iso3d`, `#xsec`, `sectionSVG`, `connectorMarks`, `syncXsec`, `S.xside`, the `xside` action, the `c.type` branch of `assign()`, an unused `zone` variable in `refreshLive` (2592) — no element with those ids is rendered | 1457–1513, 2615–2620, 2644–2659, 2745 |
| 8 | Stale text: string `bPerCol` says the back is chosen in "step 2 Sections"; code comments number the steps differently from the UI | 148, 1165 |
| 9 | `oneStep` and the footer depend on regexes over generated HTML (`class="card step" id="st-…"`, the `sn` / `sl` spans) | 894–898 |
| 10 | Step attribution and severity depend on Lithuanian warning text | 715–719, 909 |
| 11 | `S.stepKey` is global; the step silently changes when the next cabinet lacks that key | 891 |
| 12 | `zoneInfo` duplicates engine arithmetic in the UI ("as the engine clamps it") | 951–958 |
| 13 | `seg` values are strings; numeric settings written through it stay strings unless special-cased (`c.cnc.legsY`, `c.cnc.legsX`, `c.shelfSb`) | 947, 2907 |
| 14 | The plinth is identified by `kind === 'plinth'` **or by its name** matching `/cokol|plint/i`; renaming an ordinary extra part to "Cokolis" makes it the plinth | 978 |
| 15 | Section bindings use array indices; deleting or moving a section while a field is focused re-targets the focused id | 1865 |
| 16 | Every full render rebuilds every cabinet and remounts the 3D preview | 826, 850 |
| 17 | `num()` / `numOrNull()` evaluate typed arithmetic with `Function()` (input is restricted to digits and operators) | 324–331, 2777–2782 |
