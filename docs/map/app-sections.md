# Map: cabinet editor internals — sections, operations, materials, look, warnings, sheet preview

Slice: `src/lib/app.js` lines 1457–1975 (plus the callers and handlers needed to understand them).
All `file:line` references are to `src/lib/<file>`. Labels are given as **LT / EN** (resolved from the `T` table, app.js:14–316).
Everything marked "verified live" was checked in the running snapshot at `http://127.0.0.1:8765/legacy/` through `window.__dbk`.

Contents

1. Where this slice sits in the editor
2. Data model touched by this slice
3. Sections — every kind, every field
4. Height distribution: zone, fill, fixed, front heights, shelf heights
5. Extra operations (step 4): legs / feet, runner marks, TANDEMBOX fixing, hinges, shelf pins, LED grooves
6. Construction pieces defined in this slice: back, worktop, cam-side pictograms, joinery choice
7. Extra parts (step 6): loose parts, plinth, side panels; the loose-panel editor
8. Materials: assignment, lists, drag-and-drop dock
9. "Look" (colour / texture per material)
10. Warnings: where they come from, levels, where shown, the WARN_EN translation mechanism
11. Right-hand sheet: `viewSheet` / `sketchOf`
12. Binding mechanics, number limits, every `data-act` / `data-bind` in the slice
13. Dead code and bugs found
14. UX problems visible from the code
15. Function index

---

## 1. Where this slice sits in the editor

The cabinets tab is `viewCab` (app.js:876): left rail (cabinet list) + `<section class="editor">` + `viewSheet(c, inf)` (right-hand aside).
The editor is `viewEditor(c)` (app.js:1134) which dispatches by cabinet kind:

| `c.kind` / flag | Editor | Steps (id `st-<key>`) |
|---|---|---|
| normal cabinet | `viewEditor` | 1 `dims` Matmenys/Size · 2 `build` Konstrukcija/Construction · 3 `secs` Sekcijos/Sections · 4 `ops` Operacijos/Operations · 5 `mats` Medžiagos/Materials · 6 `extra` Papildomos/Extras |
| `c.dishwasher` | `viewEditor` | 1 `dims` (+ worktop block) · 2 `mats` only |
| `c.kind === 'panel'` | `panelEditor` (app.js:1530) | single step `dims` |
| `c.kind === 'box'` ("3D konstrukcija") | `boxEditor` (app.js:1405) | 7 steps; reuses `worktopBlock`, `matsBlock`, `extrasBlock`, `choice`, `artOf` from this slice |

Only one step card is visible at a time (`oneStep`, app.js:892; `S.stepKey`), unless the URL has `?allsteps`.
Functions of this slice are called from `viewEditor` as follows (app.js:1143–1200):

- Step 1 (dishwasher only): `worktopBlock(c)`.
- Step 2 Construction: `camPick('bottom', bottomPic(...))`, `camPick('top', topPic(...))`, `backBlock(c) + worktopBlock(c)`, `choice(...)`/`artOf(...)` for the main joinery.
- Step 3 Sections: for each column `zoneHtml(zoneInfo(c,k))`, then `viewSection(c, s, i, z)` for every section of the active column **in reverse array order (top of the cabinet first)**, then the "add" buttons.
- Step 4 Operations: five `opRow(...)` rows (first one embeds `legsEditor`) + `ledBlock(c)`.
- Step 5 Materials: `matsBlock(c)` (contains `matDock` and `lookBlock`).
- Step 6 Extras: `extrasBlock(c)` (ends with `plinthFitBlock(c)`).

Rendering is string concatenation into `innerHTML`; a full `render()` rebuilds everything, `refreshLive()` (app.js:2571) patches a few nodes while typing.

---

## 2. Data model touched by this slice

Cabinet object (created by `newCabinet`, app.js:393; normalised by `normCab`, app.js:457):

```
c = { id, name, type:'PASTATOMOS'|'PAKABINAMOS'|'ŪKINĖ', kind?:'box'|'panel', W,H,D, thick:18,
      cols:1..3, colW:[], dishwasher:false, dishWidth:600, legH:100, hang?:true|false,
      mat:{ carc, facade, back, top?, drawer? }, edge:{ carc, facade },
      vis:{ L,R,B },                       // visible sides / bottom in the front material
      cnc:{ joinery:'confirmat'|'cam', top:'rails'|'full', topMount:'over'|'inside', topOverFacade, topOvF/S/B,
            bottom:'under'|'inside', bottomZ, bottomD, legs:bool, feet:bool, legsX:2..6|'parts', legsY:2|3,
            backs:['none'|'hdf'|'solid' per column], backMount:'top'|'inside', backFix, backInset, backCover:{bottom,top},
            camOut:{ bottom,top,back }, joints:{}, rails:{front,back,bottom}, railW, facadeT:18, fg:{l,r,mid,top,bot},
            runnerMarks:bool, tbFront:'mark'|'hole'|'off', tbPrev?, hinges:bool, hingeFix:'screw'|'press', pins:'shelf'|'row'|'off' },
      sections:[ ... ],                    // index 0 = BOTTOM of its column
      extras:[ ... ], leds:[ ... ], worktop:{ on, mat, T, over, left, right, edge }, pe?:{e1..e4} (panel only),
      shelfSb?, ebEdit?, libId?, jointsOk?, edgesOk? }
```

Project-level: `S.proj.look = { <materialName>: { tex, color, mm, fit, rot } }`.
Settings lists: `S.settings.materials[]`, `S.settings.edges[]`, `S.settings.worktops[]` (app.js:443), `S.settings.ops` (default operations), `S.settings.types[type]` (construction defaults per cabinet type), `S.settings.rules`.

Engine result per cabinet, cached in `S._info[i] = { r, warnings, nProg }` (`buildOne`, app.js:704). Fields of `r` read in this slice: `r.panels[]` (`role`, `place{o,u,v,n}`, `holes[]`, `edges[]`, `L,W,T`), `r.legs[]` (`x,y`), `r.dims`, `r.joints[]` (`key,type,split`), `r.shelfInfo[]` (`col,sec,base,zc[]`), `r.warnings[]`, `r.visual`, `r.box`.

---

## 3. Sections — every kind, every field

### 3.1 One flat record for all kinds

`newSection(kind)` (app.js:358) returns the same shape whatever the kind — a section always carries every field:

| Field | Default | Meaning |
|---|---|---|
| `id` | `uid()` | |
| `kind` | arg | `'drawers' / 'doors' / 'cargo' / 'open' / 'oven'`; a fridge is `kind:'doors'` + `fridge:true` |
| `col` | 0 | column index (0..cols-1); `colWant` remembers a column that was removed (`fixCols`, app.js:374) |
| `fill` | `true` except drawers and oven | "Likęs / Fill": takes the remaining zone height |
| `height` | drawers 540, oven 595, others 400 | used only when `fill` is false |
| `nDrawers` | 3 | |
| `hw` | `'BLUM TANDEMBOX'` | runner system |
| `rail` | 500 | runner length, mm |
| `nDoors` | 2 for doors, else 1 | |
| `hinge` | `'BLUM LANKSTAI'` | door fitting |
| `doorSplit` | `'v'` | `'v'` side by side, `'h'` stacked |
| `hingeSide` | `'auto'` | `'auto' / 'left' / 'right'` |
| `hingeN` | (unset) | `''`/unset = auto, or 2..5 |
| `shelves` | oven 2, open 2, others 1 | shelf count (for oven: support count) |
| `shelfAdj` | `true` | adjustable (pins) vs fixed |
| `shelfMode` | `'even'` | never set to `'manual'` by the UI; any positive `shelfPos` entry counts as manual |
| `shelfPos` | `[]` | per shelf, index 0 = lowest: mm from section bottom to the shelf **middle** |
| `divider` | `true` for open, else false | dividing shelf between an open niche and the fronted section next to it |
| `cargoHw` | `'CARGO DTC PURE PRO'` | |
| later-added | — | `frontH` (object/array keyed from the TOP: `{0:200, 1:''}`), `frontDrop`, `fridge`, `prevHinge`, `mvH`, `mvExt`, `innerDrawers` (import only, unsupported) |

Note: the engine has its own `newSection` with different defaults (engine.js:274: drawers height 700, `nDoors` 1, `shelves` 0). The app's is the one used by the UI.

Presets (`PRESETS`, app.js:402–413) build cabinets from these: drawers ×3 fill; doors ×2 + 1 shelf; doors + one 180 mm drawer; wall 600×720×330 doors + 2 shelves; tall 2100 (drawers 560 ×2, oven 595 with 2 supports, doors fill 1 door hinge right 2 shelves); fridge 2100 (fridge section 1816 high, 2 fronts, `frontH:{1:720}`, + a fill door section); dishwasher; empty (open, 2 shelves); loose panel 18×2300×600; 3D construction.

### 3.2 The section card (`viewSection(c, s, i, z)`, app.js:1864–1907)

`i` = index in `c.sections`, `z` = `zoneInfo(c, column)`; binding prefix `c.sections.<i>.`.

Header (all kinds): kind label · checkbox `fill` "Likęs / Fill" · either the computed height (`<span data-fill-h="i">`, when fill) or number field `height` "Aukštis / Height".
Tools column: ▲ `data-act="mv" data-v="1"` (disabled when last in its column), ▼ `data-v="-1"` (disabled when first), ✕ `data-act="rmsec"`.
Card class `sec k-<kind>` (colour stripe per kind).

Kind labels: `kDrawers` Stalčiai/Drawers · `kDoors` Durys/Doors · `kCargo` Cargo · `kOpen` Lentynos/Shelves · `kOven` Orkaitė/Oven · `kFridge` Šaldytuvas/Fridge.

#### Drawers (`kind:'drawers'`, app.js:1870–1873)

| Control | Bind | Options / rules |
|---|---|---|
| "Stalčių / Drawers" number | `nDrawers` | whole number 1–12 (`NUM_LIMITS`, app.js:2785) |
| "Bėgeliai / Runners" select | `hw` | `BLUM TANDEMBOX` "Blum TANDEMBOX", `BLUM MERIVOBOX` "Blum MERIVOBOX", `BLUM TANDEM` "Blum TANDEM", `GTV KULKINIAI H45` "GTV guoliniai H45 / GTV ball-bearing H45", `DTC KULKINIAI H45` "DTC guoliniai H45 / DTC ball-bearing H45", `DTC PASLĖPTI` "DTC paslėpti (D-Motion) / DTC undermount (D-Motion)". An unknown stored value (e.g. the offer app's `GUOLINIAI`, `KT. PASLĖPTO MONTAVIMO`) is appended as an extra option |
| "Bėgelio ilgis / Runner length" select | `rail` | from `railLengths(hw)` (app.js:1851): ball-bearing `[300,400,450,500,550]`; undermount `[250…600 step 50]`; MERIVOBOX `[270,300,350,400,450,500,550,600]`; TANDEM / TANDEMBOX / unknown `[270,300,350,400,450,500,550,600,650]`. A stored length not in the list is appended |
| MERIVOBOX only (`mvFields`, app.js:1853) | `mvH` | "MERIVOBOX aukštis / height": `auto` "Auto (N / M / E su galerija)", `N · 68,5 mm`, `M · 91 mm`, `K · 129 mm`, `E · 192 mm` |
| MERIVOBOX, only when `mvH` is auto or E | `mvExt` | "E aukštis / E height": `rail` "Galerija (turėklai) / Gallery (railing)", `boxcap` "BOXCAP (aukštas šonas / high side)" |
| hint | — | with a single drawer: the front height `secH − 3` mm |
| stacked front heights | `frontH.<q>` | `frontsEditor` when `nDrawers > 1` (see §4.3) |

Rules: changing `hw` snaps `rail` to the nearest length valid for the new system (`assign`, app.js:2748). Engine (engine.js:460–472): fronts are full column width; a drawer front lower than 40 mm is skipped with "per daug stalčių…"; unknown `hw` → no runner marks + warning; hardware line `<hw> L=<rail>` per drawer.

#### Doors (`kind:'doors'`, not fridge, app.js:1883–1890)

| Control | Bind | Options / rules |
|---|---|---|
| "Durys žemiau, ant nišos (mm) / Doors lower, over the niche (mm)" | `frontDrop` | **only shown when the section directly below in the same column is `open`**. Label is hard-coded, not in `T`. Engine clamps to `(niche height − 20)` and lengthens only the lowest door(s) (engine.js:490) |
| checkbox "Integruojamas šaldytuvas / Integrated fridge" | `fridge` | turns the section into a fridge (below) |
| "Durų / Doors" number | `nDoors` | whole 1–6 |
| "Išdėstymas / Layout" seg | `doorSplit` | `v` "Šalia / Side by side", `h` "Viena virš kitos / Stacked" |
| "Lankstai / Hinges" select | `hinge` | `E.DOOR_HW` (engine.js:147): `BLUM LANKSTAI`, `BLUM TIP-ON`, `KT. LANKSTAI`, `BE FURNITŪROS`; EN labels via `hingeLabel` (app.js:1850): Blum hinges / Blum TIP-ON (push to open) / Other hinges / No hardware. In LT the raw upper-case codes are shown |
| "Lankstų pusė / Hinge side" seg | `hingeSide` | `auto` / `left` "Kairė" / `right` "Dešinė". **Hidden when `nDoors ≥ 2` and split is side-by-side** (pairs open from the outer sides) — but the stored value is still used by the engine |
| "Lankstų durims / Hinges per door" seg | `hingeN` | `auto (n)` / 2 / 3 / 4 / 5; hidden when `hinge === 'BE FURNITŪROS'`. `auto` stores `''`; the number shown is `E.hingesPerDoor(doorHeight)`: ≤900 → 2, ≤1500 → 3, ≤2000 → 4, else 5 (engine.js:181). Door height used for the hint: `secH − 3`, or `secH / nDoors − 3` when stacked (ignores custom `frontH` and `frontDrop`) |
| "Lentynų / Shelves" number | `shelves` | whole 0–12 |
| seg (when shelves > 0) | `shelfAdj` | `true` "Kilnojamos / Adjustable", `false` "Fiksuotos / Fixed" |
| stacked front heights | `frontH.<q>` | `frontsEditor` when `doorSplit === 'h'` and `nDoors > 1` |
| shelf heights | `shelfPos.<q>` | `shelfPosEditor` when shelves > 0 |

Engine rules (engine.js:473–507): side-by-side door width = `(FW − (n−1)·3) / n`, height `secH − 3`; stacked: full width, heights from `splitFronts`. Hinge side: stacked → left unless `hingeSide === 'right'`; side-by-side → `left` = all doors left, `right` = all right, `auto` = every door left-hinged except the last one (so **one door on auto is hinged on the RIGHT**; two doors → left + right). Doors smaller than 40 mm in either direction are skipped with a warning. Hinge cups/plates need `c.cnc.hinges` on (else info "lankstų skylės išjungtos (gręžiama rankomis)"); `BE FURNITŪROS` = no hinges at all. Hinge positions are moved to stay clear of bottom/top/rails/dividing shelves and shelves (warnings "lankstas perkeltas…").

#### Fridge (`kind:'doors'` + `fridge:true`, app.js:1874–1879, 1902)

| Control | Bind | Options |
|---|---|---|
| checkbox "Integruojamas šaldytuvas" (checked) | `fridge` | unticking returns to normal doors |
| "Fasadai / Fronts" select | `nDoors` | `1` "1 — vien šaldytuvas / fridge only", `2` "2 — šaldytuvas ir šaldiklis / fridge and freezer" (engine would accept 3) |
| "Vyriai / Hinges" seg | `hingeSide` | `left` / `right` only (no auto) |
| hint | — | "Rankena — {opposite side} / Handle — …" |
| hint | — | "Niša ≈ {secH − 2·thick} × {columnWidth − 2·thick} mm" |
| stacked front heights | `frontH.<q>` | when `nDoors > 1` |
| note | — | `fridgeNote`: fronts screwed to the fridge's own doors, no hinges; section height = niche height + 2 boards; niche usually 1772–1780 high, ≥ 550 deep; niche shelf stops `E.R.fridgeVent` = 50 mm short of the back; leave a grille in the plinth |

Toggle side effects (`assign`, app.js:2755–2757): on → remembers `prevHinge`, forces `doorSplit:'h'`, `hinge:'BE FURNITŪROS'`, `shelves:0`, `nDoors` 1 or 2. Off → `doorSplit:'v'`, `hinge = prevHinge || 'BLUM LANKSTAI'`, `shelves:1`. `normCab` re-forces `doorSplit:'h'` and `hinge:'BE FURNITŪROS'` on every load (app.js:468). Engine: two fixed shelves (niche floor, when something is under it, and ceiling), open at the back for air (engine.js:514–516). Shelf-position editor is not shown.

#### Cargo (`kind:'cargo'`, or legacy doors with a `CARGO…` hinge, app.js:1880–1882)

| Control | Bind | Options |
|---|---|---|
| "Cargo furnitūra / Cargo fitting" select | `cargoHw` | `E.CARGO_HW` = `['CARGO DTC PURE PRO']` (label "Cargo — DTC Pure Pro" / "Cargo pull-out — DTC Pure Pro"); unknown stored value appended |
| note | — | `cargoNote`: one front on the cargo frame, no hinges or shelves; fitting = cargo for a {column width} mm cabinet; frame fixed with the maker's template, nothing drilled |

One front for the whole section, no hinge holes, no shelves (the saved `nDoors`/`shelves` are ignored, kept for going back). Hardware line `CARGO DTC PURE PRO W=<width>`. `normCab` migrates old "doors with CARGO hinge" sections to `kind:'cargo'` (app.js:467).

#### Open shelves (`kind:'open'`, app.js:1891–1894)

| Control | Bind | Options |
|---|---|---|
| "Lentynų / Shelves" number | `shelves` | whole 0–12 |
| seg (when > 0) | `shelfAdj` | adjustable / fixed |
| checkbox "Skiriamoji lentyna tarp nišos ir fasadų — fasadai ją uždengia / Dividing shelf between the niche and the fronts — the fronts cover it" | `divider` | only shown when the same column also has a drawers/doors/cargo (non-fridge) section. Hard-coded label. Default **on** for new open sections |
| shelf heights | `shelfPos.<q>` | `shelfPosEditor` |

Engine (engine.js:449–455): the divider is a fixed shelf placed on the fronted neighbour's side of the border (above and/or below), so the niche keeps its full height and the fronts hide the shelf edge.

#### Oven (`kind:'oven'`, app.js:1895–1896)

| Control | Bind | Options |
|---|---|---|
| "Atramų / Supports" select | `shelves` | `0`, `1 — apačioje / below`, `2 — apačioje ir viršuje / below and above` (display clamps stored values to 2; option texts hard-coded) |

Default: fixed height 595 (not fill), 2 supports. Engine: support shelves are fixed boards at the niche bottom and top (engine.js:509–513); more than 2 → warning. No front is generated for an oven section; the front picture draws an oven there.

### 3.3 Adding, ordering, removing

- Add buttons under the list (`data-act="addsec" data-v="<kind>" data-i="<column>"`), captioned "Pridėti viršuje: / Add on top:" for `drawers, doors, cargo, open, oven`. The handler pushes `newSection(kind)` to the end of `c.sections` = the **top** of that column (app.js:2921). There is no "insert here" and no fridge button (fridge = doors + checkbox).
- Move: `mv` swaps the section with its neighbour in the same column (app.js:2979).
- Remove: `rmsec` splices immediately and shows a toast "Sekcija pašalinta / Section removed" with **Undo** (app.js:2982).
- Columns: `c.cols` 1–3 ("Pertvaros / Partitions": Nėra / 1 pertvara / 2 pertvaros). With more than one column only the active column (`S.colSel`) is editable at a time; the front picture (`colMapInner`) is the column switch. Each column has its own zone line and its own back type.

---

## 4. Height distribution

### 4.1 The front zone (`zoneInfo(c, col)`, app.js:951–958; mirrors engine.js:426–448)

- Zone height `Hz` = top of zone − bottom of zone.
  - Top by default: `H` for a full top, `H − thick` when the full top covers the fronts (`topOverFacade` and top on the sides), `H − 2` (`E.R.facade.zoneGapRails`) with rails. A custom top gap `c.cnc.fg.top` replaces it.
  - Bottom by default 0 (the bottom board's lower face); `c.cnc.fg.bot` moves it (negative = fronts reach below the carcass).
  - A raised inside bottom (`bottomZ`) is taken into account.
- Per column: `exp` = sum of the fixed heights; `nFill` = number of fill sections; `fillH = max(0, Hz − exp) / nFill` (all fill sections of a column share **equally**); `over = exp > Hz + 0.5`.
- A section's height (`secH`) is the **module**: the front plus one gap. Front height = `secH − gap` (`E.R.facade.gap` = 3 mm; `fg.mid` overrides).

Zone line above each column (`zoneHtml`, app.js:1132): "Fasadų zona **Hz** mm · užimta **used**" + either "viršyta X / exceeded X" (class `over`) or, when there is no fill section and more than 1 mm is left, "liko X mm / left X mm".

Engine consequences: sum of fixed heights over the zone → `bad` warning "sekcijų aukščių suma (…) didesnė už fasadų zoną (…)" but parts are still generated, running past the top; a drawers/doors/cargo section lower than 63 mm or narrower than 60 mm gets no fronts ("per maža sekcija"). Nothing stops the user and nothing is auto-corrected.

### 4.2 Fill vs fixed

- `fill:true` → the height field is replaced by the live computed height; `fill:false` → number field `height` (0–6000).
- Defaults: drawers and oven fixed, everything else fill. A column can have several fill sections or none.
- While typing, `liveSections(c)` (app.js:1941) updates every `[data-fill-h]` span and the front-height rows without re-rendering.

### 4.3 Stacked front heights (`frontsEditor`, app.js:1926–1939; `E.splitFronts`, engine.js:291–308)

Shown for drawers with more than one drawer, stacked doors, and fridge with 2 fronts. Title "Fasadų aukščiai, mm / Front heights, mm", note "iš viršaus · tuščias = dalijasi likusį aukštį / from the top · empty = shares what is left".

- One row per front, **top first** (`↑ 1` … `↓ n`): input bound to `c.sections.<i>.frontH.<q>` (`data-num`, `data-empty`), placeholder = the height that will actually be cut, a proportional bar (`.fh-bar`), and the real height text.
- Values are heights of the front itself (without the gap), `q = 0` is the top front. Limits 0–3000.
- Algorithm:
  - nothing typed → all modules `secH / n`;
  - some typed → the others share `(secH − Σ(typed + gap)) / nAuto`; if that share is below `80 + gap` → **all fronts equal** + note "nurodyti fasadų aukščiai (…) netelpa į sekciją … — fasadai padalinti po lygiai";
  - all typed and the sum differs from `secH` by more than 0.5 → the lowest typed front absorbs the difference + note "…— apatinis fasadas X mm"; if it would drop below `80 + gap` → equal split + note.
- Row classes: `own` (typed), `bad` (typed but not what will be cut, tolerance 0.05). The note is shown as `<p class="fh-warn">` (through `wTxt`) and also arrives as an engine warning prefixed `sekcija N:`.
- Reset button "↺ Vienodi / Equal" (`data-act="fhreset"`) deletes `s.frontH`; only shown when something is typed.

### 4.4 Shelf heights (`shelfPosEditor`, app.js:1911–1925)

Shown for doors/open sections with shelves (not fridge, not cargo). Title "Lentynų aukščiai / Shelf heights", note "nuo sekcijos apačios iki lentynos vidurio, mm · tuščias — tolygiai / from the section bottom to the shelf middle, mm · empty — spread evenly".

- One row per shelf, top first; input bound to `c.sections.<i>.shelfPos.<q>` (`q = 0` is the lowest shelf), placeholder and side text = the engine's real position (`r.shelfInfo` entry matched by column and by the section's position within its column: `zc[q] − base`).
- Engine (engine.js:517–527): even spread `zc = z0 + (m+1)(z1 − z0)/(n+1)` with `z0 = max(sectionBottom, thick)`, `z1 = min(sectionTop, H − thick)`; a typed value is clamped to `[z0 + t/2, z1 − t/2]`. Adjustable shelves add 4 supports each to the hardware list.
- Shelves that cut into the bottom/top or sit closer than `thick + 2` to another shelf are dropped with `bad` warnings (engine.js:533–543).
- Reset "↺ Tolygiai / Evenly" (`data-act="shposreset"`): `shelfPos = []`, `shelfMode = 'even'`.
- Related but outside this slice: `shelfFront(c)` (app.js:1363) — how far shelves stand back from the front (`c.shelfSb`), appended to the step when any section has shelves.

---

## 5. Extra operations (step 4, "Papildomos operacijos / Extra operations")

Lead text: "Pažymėkite, ką gręžti CNC. „Patikrinta“ — sutampa su jūsų SWOOD modeliais."

`opRow(bind, on, title, desc, verified, applies, more)` (app.js:1597): a checkbox row with title, description, optional nested controls (`more`, only when on **and** applicable) and a badge "patikrinta / verified" (green) or "nepatikrinta / unverified" (amber). Row classes: `off` when unticked, `na` when not applicable (description gets "· šiai spintelei nereikia / not needed for this cabinet"; the checkbox stays usable).

| Row | Checkbox bind | Stored as | Nested option | Badge | Applies when |
|---|---|---|---|---|---|
| "Kojelės ir jų žymės dugne / Legs and their marks in the bottom" (or "Pėdutės po šonais / Feet under the sides") | `c.cnc.legs` | bool | `legsEditor` | verified for legs, unverified for feet | always |
| "Bėgelių žymės šonuose / Runner marks in the sides" | `c.cnc.runnerMarks` | bool | — | verified | a drawers section with a known runner system |
| "TANDEMBOX fasadų tvirtinimas / front fixing" | pseudo `c.cnc.tbOn` | `c.cnc.tbFront`: `'off'` or previous value | seg `c.cnc.tbFront`: `mark` "Žymės Ø5 (varžtams)", `hole` "Skylės Ø10 (reikia Ø10 grąžto)" | verified | a drawers section with `BLUM TANDEMBOX` |
| "Lankstų skylės / Hinge holes" | `c.cnc.hinges` | bool | seg `c.cnc.hingeFix`: `screw` "Prisukamas (+2 žymės Ø5 × 2)", `press` "Įspaudžiamas (+2 × Ø8)" | unverified | a doors section with a hinge other than `BE FURNITŪROS` |
| "Lentynų laikiklių skylės / Shelf support holes" | pseudo `c.cnc.pinsOn` | `c.cnc.pins`: `'off'` or setting default | seg `c.cnc.pins`: `shelf` "Tik po lentyna", `row` "Eilė ±2 kas 32" | unverified | a doors/open section with adjustable shelves |

Pseudo-binds (`assign`, app.js:2743–2744): `tbOn` off stores the old mode in `cnc.tbPrev` and sets `tbFront:'off'`; on restores `tbPrev` or the settings default (`S.settings.ops.tbFront`, default `mark`). `pinsOn` on sets `S.settings.ops.pins` (default `shelf`).
Defaults for a new cabinet come from `S.settings.ops` = `{ runnerMarks:true, tbFront:'mark', hinges:true, hingeFix:'screw', pins:'shelf' }` (app.js:354) and `legs` from the cabinet type (base and tall: true, wall: false).
Descriptions: legs "4 žymės Ø5 × 2 mm kiekvienai kojelei…"; feet "Ø15 pėdutės po šonais: Ø8 × 10 skylė…, 50 mm nuo priekio ir galo"; runners "Blum TANDEM / TANDEMBOX šablonai pagal stalčių aukštį"; TANDEMBOX mark mode "Ø5 × 2 mm — prisukama varžtais. Ø10 grąžto galvoje nėra", hole mode "Ø10 × 12 skylės fasado vidinėje pusėje"; hinges "Ø35 puodelis duryse su 2 varžtų žymėmis + 2 plokštelės žymės šone"; pins "Ø5 skylės abiejuose šonuose po kiekviena kilnojama lentyna".

### 5.1 Legs / feet (`legsEditor`, app.js:1549–1561; `legPlanSVG`, app.js:1562–1574)

The choice legs / feet / none is made in step 2 (seg bound to pseudo `c.cnc.support`: `legs` → `legs:true, feet:false`; `feet` → both true; `none` → `legs:false`), with a "Nustatymai → / Settings →" button that jumps to step 4.

| Control | Bind | Options / rules |
|---|---|---|
| "Kojelių eilėje / Legs in a row" | `c.cnc.legsX` | 2, 3, 4, 5, 6 (+ "Po pertvaromis / Under partitions" = `'parts'` when the cabinet has columns). An option is **disabled** when the spacing `(W − 2·55) / (n − 1)` would be under 70 mm (tooltip "Per tankiai…"). Default 2 |
| feet variant | `c.cnc.legsX` | only with columns: `2` "Tik po šonais / Under the sides only", `parts` "Po šonais ir pertvaromis" |
| "Eilės / Rows" | `c.cnc.legsY` | `2` "priekis, galas / front, back", `3` "+ vidurys / + middle" |
| "Kojelių aukštis / Leg height" | `c.legH` | 0–400; feet instead show a fixed note "Pėdutė Ø15 po šonu · skylė Ø8 × 10 · 50 nuo priekio ir galo" (feet height fixed 10 mm in the engine) |
| plan picture | — | top view of the bottom board, front at the bottom, partition lines, one disc per leg from `r.legs`; caption "Iš viso kojelių / Legs in total: **n** vnt." |

Engine constants: legs 55 mm from the sides, 95 from the front, 55 from the back, 4 marks Ø5 × 2 per leg (engine.js:35). Removing the last partition resets `legsX:'parts'` to 2 (`fixCols`). A cabinet hung on a wall in the Baldai tab (`c.hang === true`) gets no legs regardless (`engineDef`, app.js:693).

### 5.2 LED grooves (`ledBlock`, app.js:1584–1596)

Header "LED apšvietimas · įleidžiamo profilio griovelis 16 × 8, frezuojamas CNC". List `c.leds[]`, one row per groove:

| Control | Bind | Options |
|---|---|---|
| "Kur / Where" select | `c.leds.<k>.at` | `bottom` "Dugne", `top` "Viršuje", `L` "Kairiame šone", `R` "Dešiniame šone" |
| "Pusė / Face" seg | `.side` | `in` "Viduje", `out` "Išorėje" |
| "Nuo priekio / From the front" number | `.from` | 0–3000, default `E.R.led.from` = 30 |
| "Galai / Ends" seg | `.ends` | `open` "Kiaurai / Through", `closed` "Uždari / Closed" |
| ✕ | `data-act="leddel" data-i="k"` | |
| inline note | — | `ledMoved(k)`: shows the engine warning that starts with `LED <k+1>: LED griovelis k…` (groove moved off holes / no room) in amber |

Add buttons "Pridėti LED:" `data-act="ledadd" data-v="bottom|top|L|R"`; new entry `{ at, side: 'out' only for the bottom of a wall cabinet else 'in', from:30, ends:'open', w:16, depth:8 }` (app.js:2918). `w` and `depth` are not editable. Empty text mentions that an "LED strip" can also be dragged onto a cabinet in the Baldai tab. Note: "Frezuojama kaip step2xxl: freza T=96 Ø15.5, įleidimas nuožulniai per 30 mm, paliekama ≥ 2 mm…". Engine refuses a top groove on a cabinet without a full top, shortens/moves grooves that hit holes (engine.js:1221–1247).

---

## 6. Construction pieces defined in this slice

### 6.1 Back (`backBlock`, app.js:1762–1789)

| Control | Bind | Options / rules |
|---|---|---|
| back kind, one select per column | `c.cnc.backs.<k>` | `none` "Nėra", `hdf` "Plaušas / Fibreboard", `solid` "Kieta 18 mm / Solid 18 mm". Label is the column name when there are columns |
| "Kieta nugara / Solid back" (any column solid) | `c.cnc.backMount` | `top` "Išorėje — ant galo / Outside — on the back edges", `inside` "Viduje — tarp šonų". Outside is only possible when **every** column is solid; otherwise the select shows `inside` and a note explains (`bTopOnlyAll`) |
| "Tvirtinimas / Fixing" (any solid) | pseudo `c.cnc.backJoint` | `confirmat`, `cam`, `dowel`; the handler calls `setJoint` for the joint keys `back` and `backP<n>` (app.js:2758). The displayed value comes from the engine result (`r.joints`), `mixed` shown as confirmat |
| pictogram | `data-act="camside" data-v="back"` | `backPic(kind, cam)`; clickable only for an inside back fixed with cams — toggles `c.cnc.camOut.back` |
| all columns solid + inside | `c.cnc.backCover.bottom` / `.top` | "Apačioje": "Stovi ant dugno" / "Dengia dugną (dugnas trumpesnis)" — only when the bottom is between the sides. "Viršuje": "Po viršumi" / "Dengia viršų", or for rails "Po surišimo juosta" / "Dengia juostą" — only with a full top between the sides, or a flat back rail and a single column |
| inside back | `c.cnc.backInset` | "Nugara nuo galo, mm" 0–1000 |
| twin field | `data-bkfront="<D − hdf − thick>"` (no `data-bind`) | "Nugaros priekis nuo spintelės priekio": on change computes `backInset = max − value` (app.js:2823) |
| notes | — | one of `bFix_top_confirmat`, `bFix_top_cam`, `bFix_inside_confirmat`, `bFix_inside_cam`, `bFix_inside_cam_out`, `bFix_dowel` (what will show from outside); `bHdfNote` "Plaušas visada kalamas iš išorės, ant galo" |

### 6.2 Pictogram switches (`bottomPic`, `backPic`, `camMarks`, `camPick`; `topPic` at app.js:971)

64 × 40 px inline SVGs showing where the bottom / top / back sits relative to the sides (the board in blue). When that joint is made with cams, orange dots and an arrow show which face the cam housings are on and the whole picture becomes a button (`camPick`, app.js:1807) with caption "ekscentr.: vidus / išorė"; a click flips `c.cnc.camOut[bottom|top|back]` (app.js:2999). The joint type shown is what the engine actually built (`jointTypeOf`, app.js:1812).

### 6.3 Main joinery (`choice`, `artOf`, app.js:1575–1576)

Two large choice buttons bound to `c.cnc.joinery`: `confirmat` "Konfirmatai — Ø8 kiaurai + Ø5×32 krašte…" and `cam` "Ekscentrikai + kaiščiai — Ø15 ekscentrikai šone, Ø8 varžtai ir kaiščiai. Surenkama be klijų." The icon is `DBArt.pic(type)`.

### 6.4 Worktop (`worktopBlock`, app.js:1816–1826; `E.worktopOf`, engine.js:1910)

| Control | Bind | Rules |
|---|---|---|
| "Stalviršis" seg | `c.worktop.on` | `false` "Nėra", `true` "Yra"; next to it the computed size "L × W × T mm" (live-updated) |
| "Stalviršio medžiaga" (required, `*`) | `c.worktop.mat` | datalist `dl-wt` |
| "Storis" | `c.worktop.T` | empty = default 38; limits 6–120 |
| "Už fasadų / Past the fronts" | `c.worktop.over` | empty = 20; −100…300 |
| "Kairėje už šono" / "Dešinėje už šono" | `c.worktop.left` / `.right` | empty = 0; 0–1000 |
| "Stalviršio kraštas" | `c.worktop.edge` | datalist `dl-edge` |

Size: length `W + left + right`, depth `D + facadeT + over`. A wall cabinet with a worktop gets the note "Tai pakabinama spintelė — ar tikrai reikia stalviršio?". Note text: worktops of cabinets standing side by side in the Baldai tab (same material and thickness) are joined into one piece in the part list. A new cabinet copies the previous cabinet's worktop material/thickness/overhang/edge, and `on` only for base cabinets (app.js:398). A worktop that is on without a material marks the step as "needs filling in" (`needsWt`, app.js:888). The block lives in step 2 (step 1 for dishwasher and 3D construction).

---

## 7. Extra parts (step 6) and the loose panel

### 7.1 Extras table (`extrasBlock`, app.js:1514–1528)

Lead: "Detalės, kurių nėra konstrukcijoje: cokolis, apdailos plokštė, papildoma lentyna… Tik pjaunamos, be skylių."
`c.extras[]`, one table row each; binding prefix `c.extras.<i>.`:

| Column | Field | Rules |
|---|---|---|
| Pavadinimas / Name | `name` | text |
| Ilgis / Length | `L` | 1–6000; `aria-invalid` when not > 0 |
| Plotis / Width | `W` | 1–6000; `aria-invalid` when not > 0 |
| Stor. / Thk. | `T` | 1–120; default the cabinet board thickness |
| Kiek. / Qty | `qty` | whole 0–999 |
| Medžiaga / Material | `mat` | datalist `dl-mat`; empty = carcass material |
| Kraštai / Edges | `e1, e2, e3, e4` | checkboxes labelled L1, L2, W1, W2 |
| ✕ | `data-act="rmx"` | removes at once, toast "Detalė pašalinta" with Undo |

Extra row for `kind:'plinth'`: "Nuo priekio / From the front" (`yf`, −300…300, note "mm nuo korpuso priekio (be fasado)").
Extra row for `kind:'side'`: "Vieta / Place" seg `side` (`L` Kairėje, `R` Dešinėje, `''` nepastatyta), "Apačia nuo spintelės dugno" (`zb`, −5000…5000; below 0 = down to the floor), "Priekis prieš korpusą" (`yf`), note pointing to the Baldai tab. Typing `L` or `zb` by hand clears the side panel's automatic `fit` (app.js:2742).

Add buttons (`data-act="addx"`, app.js:2985–2991):

| `data-v` | New entry |
|---|---|
| `part` "＋ Detalė" | `{ name:'Detalė', L: cabinet W, W:100, T: thick, qty:1, mat: carcass }` |
| `plinth` "＋ Cokolis" | `{ kind:'plinth', name:'Cokolis', L: W (minus 2·thick when the bottom is raised and there are no legs), W: max(40, legHeight + bottomZ − 2), T: thick, qty:1, mat: facade or carcass, e1:true }` |
| `side` "＋ Šoninė plokštė" | if the cabinet stands on a wall in the room layout → `RM.addSide` (room.js:1311: height by the room "fit" rule, may reuse an unplaced side panel imported from the offer app, may push neighbours). Otherwise `{ kind:'side', side: first free of L/R, fit:'', name, L: H, W: D + facadeT, T: facadeT, qty:1, mat: facade or carcass, e1..e4:true, zb:0, yf: facadeT }` |

How extras reach the part list (`buildProjectAll`, app.js:723–730): skipped with a warning when `L` or `W` is not > 0 ("papildoma detalė be ilgio ar pločio — nepridėta") or `qty` is 0; material `x.mat || c.mat.carc`; edge material `x.edgeMat`, else the facade edge when the part is in the facade material, else the carcass edge. They are cut-only parts (no CNC program).

### 7.2 Plinth

The plinth is simply the first extra with `kind:'plinth'` or a name matching `/cokol|plint/i` (`plinthIdx`, app.js:978). It is editable in three places:

1. Step 2 (`plinthBlock`, app.js:979): seg "Cokolis: Nėra / Yra" (`data-act="plinth" data-v="off|on"`); when the bottom is raised, "Cokolio vieta: Tarp šonų / Po korpusu" (`data-act="plinthpos" data-v="in|under"`, stores `between`, and re-derives length/height unless they were typed); fields height (`W`), length (`L`), from the front (`yf`, default 20 between the sides / 50 under), thickness, material. Hidden for wall cabinets.
2. Step 6 table row (above).
3. Step 6 fit block (`plinthFitBlock`, app.js:1018): gaps `gl` "Tarpas kairėje", `gr` "Tarpas dešinėje", `gt` "Iki dugno", `gb` "Nuo grindų" (0–500, empty allowed); button "⇔ Pritaikyti: tarp šonų po 1 mm, 4 mm iki dugno" (`data-act="plfit" data-v="<i>"` → `between:true` when the bottom is raised, `gl:1, gr:1, gt:4, gb:0`); "Nustatyti dydį ranka" (`data-v="<i>:off"` deletes the gaps); a front picture with draggable plinth edges (`plinthPic`). With gaps set, length and height follow the cabinet.

### 7.3 Loose panel (`panelEditor`, app.js:1530–1541)

A cabinet with `kind:'panel'` is one board. Fields: name; "Storis / Thickness" bound to **`c.W`** (limit 3–100 for panels, `numLimit` app.js:2793), "Aukštis" `c.H`, "Gylis" `c.D`; library / duplicate / delete buttons; material `c.mat.carc` (required) and edge material `c.edge.carc`; edge checkboxes `c.pe.e1..e4` ("L1 priekis", "L2 galas", "W1 apačia", "W2 viršus", default all on); the look block. Position and height from the floor are set in the Baldai tab. A new panel takes the room height and the most common front material of the project (`fromPreset`, app.js:420–425).

---

## 8. Materials

### 8.1 Fields (`matsBlock`, app.js:1603–1610)

Step 5 "Medžiagos ir kraštai — Pavadinimai keliauja į detalių sąrašą ir nesting programą."

| Field | Bind | Shown when | Required |
|---|---|---|---|
| Karkasas / Carcass | `c.mat.carc` | always | yes, except dishwasher |
| Fasadai / Fronts | `c.mat.facade` | always | when the cabinet has fronts (dishwasher, or a drawers/doors/cargo section, or 3D-construction fronts) |
| Nugara / Back | `c.mat.back` | not dishwasher | no |
| Viršus (stogas) / Top | `c.mat.top` | full top, not 3D construction | no; placeholder = carcass name ("kaip korpusas") |
| Stalčių dugnas / galas (16 mm) | `c.mat.drawer` | any section uses MERIVOBOX (`usesMerivo`, app.js:1859) | no; placeholder = carcass |
| Karkaso kraštas / Carcass edge | `c.edge.carc` | always | no |
| Fasado kraštas / Front edge | `c.edge.facade` | always | no |

All are free-text inputs with a `<datalist>`. Required fields get a red `*` and `aria-invalid="true"` while empty; note "privaloma — be to detalių sąraše nebus medžiagos". Missing required materials light the step dot (`needsMats`, app.js:889) and the engine marks parts "BE MEDŽIAGOS" / edges "KRAŠTAS" with warnings. Nothing blocks export.

Other material slots: worktop (`c.worktop.mat`, `.edge`), each extra part (`extras[i].mat`, optional `edgeMat`), visible sides/bottom use the front material through `c.vis.L / R / B`.

### 8.2 Where the suggestions come from (`listOpts`, app.js:868–873)

Three datalists emitted once per render (app.js:847):

- `dl-mat`: `S.settings.materials` + every `mat.carc / facade / back / drawer` used in the open project.
- `dl-edge`: `S.settings.edges` + every `edge.carc / facade` and worktop edge in the project.
- `dl-wt`: `S.settings.worktops` + every worktop material in the project.

The settings lists are plain arrays of names edited in the settings tab. Names are not validated against the lists; a typo silently creates a new material. A new cabinet copies `mat` and `edge` from the last cabinet of the project (app.js:396).

### 8.3 Drag-and-drop dock (`matDock`, `matTarget`, `dropMat`, app.js:1615–1663)

At the top of step 5: "Medžiagos — tempkite ant plokštės 3D vaizde" with up to 24 draggable chips (`<span class="mdchip" draggable data-mdmat="name">`, swatch colour from `DBLook.color`). Names from `pickMats()` (app.js:1668): materials that have a look, then all materials used in the project (`lookNames`: facade, carcass, back, top, extras, worktop when on), then `S.settings.materials`; those with a look sorted first.

Document-level handlers: `dragstart` stores the name in `MD.name`; `dragover` over `#assembly-preview` asks `DBAssembly.pickAt(x, y)` for the board under the pointer and shows a floating tip "„name“ → target" (or "Čia nėra plokštės"); `drop` calls `dropMat(c, part, name)`.

`matTarget(c, part)` — which setting a dropped material lands in:

| Board under the pointer | Target |
|---|---|
| `part.kind === 'worktop'` | `c.worktop.mat` |
| `part.kind === 'plinth'` | the plinth extra's `mat` |
| role `FASADAS` / `DURYS` | `c.mat.facade` |
| role `VIRSUS` and full top | `c.mat.top` |
| role `NUGARA` / `PLAUSAS` | `c.mat.back` |
| role `KAIRE` / `DESINE` | if the dropped name equals the front material (and differs from the carcass) → `c.vis.L` / `c.vis.R = true` (visible side); otherwise `c.mat.carc` |
| anything else | `c.mat.carc` |

So materials are assigned **per role, not per board**: dropping on a shelf changes the whole carcass. Result toast "„name“ → label". `setMatOf(c, part, name)` (app.js:1664) is the same idea for the realistic renderer's material arrows (`part` = `'worktop'` or a key of `c.mat`).

---

## 9. "Look" — colour / texture per material name

Block "Išvaizda 3D vaizde / Look in the 3D views" under the material fields (`lookBlock(names, room)`, app.js:1679–1693), also used in the Baldai tab for all project materials (app.js:2678) and in the panel editor.

Storage: `S.proj.look[name] = { tex:'data:image/jpeg…', color:'#rrggbb', mm:1000, fit:true, rot:false }`, saved with the project. An entry with neither `tex` nor `color` is deleted (`lookSet`, app.js:1719). A texture and a colour are mutually exclusive (setting one clears the other).

One row per material name (`<div class="look" data-look="name">`):

| Control | Trigger | Effect |
|---|---|---|
| swatch | — | colour, or the texture as background |
| "Įkelti tekstūrą / Upload texture" ("Keisti / Change" when set) | file input `data-act-change="looktex"` | `lookTexture(name, file)` |
| "Įklijuoti / Paste" | `data-act="lookpaste"` | reads an image from the clipboard API; if not allowed, arms `S.lookPasteTo` for 60 s and asks for Ctrl+V |
| colour picker | `data-act-change="lookcol"` | sets `color`, clears `tex` |
| "Per visą detalę / Over the whole board" (texture only) | `data-act="lookfit"` | toggles `fit` (default on: photo laid once over each board, cropped; off: repeats at real size) |
| "Raštas / Pattern" mm (when fit is off) | `data-act-change="lookmm"` | 20–10000, how many mm of board the photo width covers |
| "↻ 90°" (texture only) | `data-act="lookrot"` | toggles `rot` |
| ✕ | `data-act="lookrm"` | removes the look |

Other ways in: Ctrl+V anywhere (document `paste` handler, app.js:1707: goes to the focused row, the armed row, or the only row shown; otherwise toast "Kuriai medžiagai?…"), and dropping an image file on a row (app.js:1716–1718).

Image processing (`lookTexture`, app.js:1738; `trimmed`, app.js:1721): plain single-colour margins (screenshots) are cut off, at most a quarter from each side; the image is downscaled to at most 1280 px JPEG quality 0.86, and to 960 px / 0.8 if the data URL exceeds 700 000 characters; `mm` defaults to 1000.

Consumers: `DBLook` (look.js) for the 3D previews and the realistic renderer; `DBFront.matColor(name, default)` (front.js:15) for flat pictures — the look first, otherwise a colour guessed from the material **name** by regex (words like pilk/grey, ąžuol/oak, riešut/walnut…), otherwise a default.

---

## 10. Warnings

### 10.1 Source and shape

- The engine returns Lithuanian sentences: `E.buildCabinet(...).warnings` plus `E.programs(panel).warnings` for each panel (prefixed with the panel's short name, e.g. `5-DESINE: …`). `buildOne` (app.js:704) merges them; `dedupe` (app.js:710) collapses the same text on several panels into "2-KAIRE, 2-DESINE: …".
- Project-wide extras: `buildProjectAll` adds warnings for extra parts without size or with quantity 0.
- There are no codes, no severity and no structured payload — only text.

### 10.2 Severity is guessed from the text (`level(w)`, app.js:715–720)

| Level | Tag LT / EN | Matched by regex on words such as |
|---|---|---|
| `bad` | klaida / error | NEPROGRAMUOTA, didesnė už, netinkami, praleista, nepalaikom, nepridėt, netelpa, nesurištas, persidengia, susitinka, per maž, nepakanka vietos, per daug stalčių, per arti viena kitos… |
| `warn` | patikrinti / check | NEPATIKRINTA, patikrinkite, perkeltas, pastumt, kertasi, šablono nėra, padalinti po lygiai, apatinis fasadas, nenurodyta… |
| `info` | rankomis / by hand | everything else |

Two phrases are forced down to `warn` first ("kiekis 0 — nepridėta", "turi likti bent"). Anything the regexes do not know falls to `info` — verified live: "kojelės per tankiai: tarp kojelių mažiau nei 70 mm" is shown with the tag "rankomis / by hand".

### 10.3 Where warnings are shown

| Place | Code | What |
|---|---|---|
| Right-hand sheet, collapsed `<details class="preview-warnings">` "Gamybos patikra / Manufacturing checks" + count | `viewSheet` app.js:1970; live in `refreshLive` app.js:2578 | all warnings of the open cabinet, one `.w.<level>` row each with tag |
| Cabinet list | app.js:879, 2585 | a red or amber dot after the name |
| Step navigation | `stepNav` app.js:908 | a dot on the step a problem "belongs to", decided by more regexes (dimension words → step 1, `sekcija N` / `kolona N` / `stalčius N` → step 3, other `bad` → step 4) plus zone overflow, no sections, missing materials, missing worktop material |
| Under a stacked-fronts editor | `frontsEditor` app.js:1938 | the `splitFronts` note |
| Under an LED row | `ledMoved` app.js:1580 | the "LED n:" warning (not translated) |
| Results tab | app.js:2349–2363 | `bad` ones at the top, the rest in a "Pastabos" card |
| Zone line | `zoneHtml` | computed in the UI, not an engine warning |

Nothing blocks moving on or exporting; separate "must check joints / edge banding" banners exist outside this slice (`jcBanner`, `ecBanner`).

### 10.4 Translation to English (`wTxt`, app.js:1831–1842)

Applied wherever a warning is printed. Steps:

1. Both languages: decimals with 3+ places are rounded to one (`56.833333` → `56.8`).
2. Lithuanian mode: return.
3. Quotes `„` → `“`, `“` → `”`.
4. Two whole-sentence regexes: the "… kampe susiduria su … — sutrumpintas N mm (pradžioje|gale)" worktop/corner message and the "… turi N programas — etiketėje telpa 2 QR …" label message.
5. `WARN_EN` (app.js:1828, one 20 KB line): **216 `[lithuanian fragment, english fragment]` pairs**, applied in array order with `split().join()` — plain substring replacement. Order matters (longer fragments first, roughly sorted by length).
6. Three clean-up regexes for half-translated "(N skyriuje M openings)" forms.
7. `WARN_EN_W` (app.js:1829): 36 single words (Spintelė→Cabinet, sekcija→section, stalčius→drawer, pertvara→partition, lentyna→shelf, kolona→column, kojelės→legs, fasadas→front, durys→doors, dugnas→bottom, viršus→top, kairė→left, dešinė→right, nugara→back…) replaced with a word-boundary regex that knows Lithuanian letters; compiled once into `WARN_EN_RE`.

`noteTxt` (app.js:1844) does the same for part orientation notes with `NOTE_EN` (15 phrases) + `NOTE_EN_W` (19 words). `hingeLabel` translates fitting codes.

Consequences (checked by running a port of `wTxt` over the engine's message fragments): a number of engine messages have no entry and come out untranslated or half-translated in English mode, e.g. all LED groove messages (engine.js:1221–1247), MERIVOBOX messages (engine.js:123–138), "nugara dengia dugną tik kai…" (engine.js:415–416, becomes "back dengia dugną tik kai bottom between the sides…"), "nugaros atitraukimas sumažintas…" (engine.js:419), "fasadai gali nusileisti tik…" (engine.js:434). Entry 0 of `WARN_EN` can never match: its key contains `„be nugaros“`, but step 3 has already rewritten those quotes.

---

## 11. Right-hand sheet (`viewSheet(c, inf)`, app.js:1964–1972)

`<aside class="sheet">`, always beside the editor, top to bottom:

1. `<div id="assembly-preview">` — the interactive 3D model, mounted by `DBAssembly.mount` (assembly.js) after render: modes assembled / without fronts / connectors, views front / 3D / underside, expand, zoom, an "opening" slider, toggles hardware / dimensions / example handles. It is also the drop target for material chips and the place where joints are edited.
2. Button "✦ Realus vaizdas / Realistic image" (`data-act="rrcab"`): opens `DBRender` with a temporary one-cabinet project against one wall (app.js:2925–2930); its material arrows call `setMatOf`.
3. `<div id="pricecard-wrap">` — `priceCard` (admin mode only).
4. `<details class="technical-preview">` "Brėžinys ir gamybos suvestinė / Drawing & manufacturing summary" (open state in `S.techOpen`), containing a "paper":
   - title bar: "<number> · <name or type>" and "W×H×D";
   - `<div id="sketch">` = `sketchOf(c)`;
   - title block: "Detalių / Parts **n**" (`inf.r.panels.length`), "Programų / Programs **n**" (`inf.nProg`), "Jungtys / Joinery" (Konfirmatai or Ekscentrikai + kaiščiai, "—" for a dishwasher).
5. `<details class="preview-warnings">` "Gamybos patikra / Manufacturing checks" + count (open state `S.warnOpen`), list `#warns`.
6. Button "Detalės ir CNC → / Parts & CNC →" (`data-act="tab" data-v="res"`).
7. Button "📐 Brėžiniai / Drawings" (`data-act="drwcab"` → drawings tab filtered to this cabinet).

Both `<details>` are closed by default, so the sketch and the warnings are hidden until opened.

`sketchOf(c)` (app.js:1973):

- 3D construction → `DBFront.svg(c, r, { bnd:[0, W], label })` (front picture from the real parts).
- Otherwise → `SK.svg(d, lang)` from sketch.js, where `d = engineDef(c)` plus `colW`, `hasBack`, `backs`, `backType`. sketch.js is the offer app's `cabinetSVG` copied verbatim; it computes section heights with its own arithmetic (fill = share of the whole `H`, not of the front zone), so it is a schematic, not the engine's geometry. Errors are shown as `<div class="empty">message</div>`.

Live updates while typing (`refreshLive`, app.js:2571–2593): rebuilds the cabinet, then patches `#sketch`, the 3D preview, `#warns` and its count, the paper title, the column picture, the step dots, the cabinet-list dot, the worktop size, section heights (`liveSections`), the price card and the zone lines.

---

## 12. Binding mechanics and attribute inventory

### 12.1 How binding works

- `data-bind="<root>.<path>"`: roots `c.` (open cabinet), `s.` (settings), `p.` (project), `pr.` / `pp.` (prices) — `target`, app.js:2717.
- Helpers: `fN` number field (`data-num="1"`), `fT` text field (optional datalist), `fS` / `dd` select, `seg` segmented buttons (`data-act="set" data-bind data-v`), `chk` checkbox, `choice` large choice button (app.js:943–949, 1576, 1757).
- `input` event (app.js:2800): text fields apply on every keystroke; number fields apply **only if the value parses and is inside its limit**, otherwise the keystroke is ignored silently. Then `refreshLive()`.
- `change` event (app.js:2818): number fields are validated — not a number → previous value + toast "Netinkamas skaičius → x"; out of range → previous value (or clamped) + toast "Leidžiama a–b → x". Checkboxes and selects assign here. A full `render()` follows for checkboxes, selects, counts, heights, front heights, worktop, extras, column widths etc.; otherwise only a live refresh. The render is deferred until the pointer is released so that the click that caused the blur is not lost (`later`, app.js:2870).
- Numbers accept a decimal comma and simple arithmetic ("600-18", "2*300") — `num` / `numOrNull`.
- `data-empty="1"`: an empty field stores `''` (meaning "automatic / default").
- Enter moves to the next text field.
- `assign` (app.js:2729) contains the special cases listed below.

### 12.2 Number limits relevant to this slice (`NUM_LIMITS`, app.js:2783–2792)

| Binding | Min–max |
|---|---|
| `c.sections.N.nDrawers` | 1–12 whole |
| `c.sections.N.nDoors` | 1–6 whole |
| `c.sections.N.shelves` | 0–12 whole |
| `c.sections.N.height` | 0–6000 |
| `c.sections.N.frontH.Q` | 0–3000 |
| `c.sections.N.shelfPos.Q` | 0–6000 |
| `c.legH` | 0–400 |
| `c.leds.N.from` | 0–3000 |
| `c.cnc.backInset` | 0–1000 |
| `c.worktop.T` / `.left` `.right` / `.over` | 6–120 / 0–1000 / −100–300 |
| `c.extras.N.L` `.W` / `.T` / `.qty` / `.zb` / `.yf` / `.gl` `.gr` `.gt` `.gb` | 1–6000 / 1–120 / 0–999 whole / −5000–5000 / −300–300 / 0–500 |
| `c.W` for a loose panel | 3–100 |

`frontDrop` and look `mm` (20–10000, own check) are not in the table; `frontDrop` has no limit in the UI.

### 12.3 `data-bind` values produced in this slice

Sections: `c.sections.<i>.` + `fill`, `height`, `nDrawers`, `hw`, `rail`, `mvH`, `mvExt`, `fridge`, `nDoors`, `hingeSide`, `cargoHw`, `frontDrop`, `doorSplit`, `hinge`, `hingeN`, `shelves`, `shelfAdj`, `divider`, `frontH.<q>`, `shelfPos.<q>`.
Operations: `c.cnc.legs`, `c.cnc.runnerMarks`, `c.cnc.tbOn` (pseudo), `c.cnc.tbFront`, `c.cnc.hinges`, `c.cnc.hingeFix`, `c.cnc.pinsOn` (pseudo), `c.cnc.pins`, `c.cnc.legsX`, `c.cnc.legsY`, `c.legH`.
LED: `c.leds.<k>.at`, `.side`, `.from`, `.ends`.
Materials: `c.mat.carc`, `c.mat.facade`, `c.mat.back`, `c.mat.top`, `c.mat.drawer`, `c.edge.carc`, `c.edge.facade`.
Back: `c.cnc.backs.<k>`, `c.cnc.backMount`, `c.cnc.backJoint` (pseudo), `c.cnc.backCover.bottom`, `c.cnc.backCover.top`, `c.cnc.backInset`.
Worktop: `c.worktop.on`, `.mat`, `.T`, `.over`, `.left`, `.right`, `.edge`.
Extras: `c.extras.<i>.name`, `.L`, `.W`, `.T`, `.qty`, `.mat`, `.e1`–`.e4`, `.yf`, `.side`, `.zb`, `.gl`, `.gr`, `.gt`, `.gb`.
Loose panel: `c.name`, `c.W`, `c.H`, `c.D`, `c.mat.carc`, `c.edge.carc`, `c.pe.e1`–`c.pe.e4`.
Joinery: `c.cnc.joinery`.

Special handling in `assign`: `c.cnc.tbOn`, `c.cnc.pinsOn`, `c.sections.N.hw` (snaps `rail`), `c.sections.N.hingeN` (`auto` → `''`), `c.sections.N.fridge`, `c.cnc.backJoint`, `c.cnc.support`, `c.cols`, `c.extras.N.L|zb` on side panels, and string digits for `shelves` / `rail` converted to numbers.

### 12.4 `data-act` values produced in this slice

| `data-act` | `data-v` / `data-i` | Handler (app.js) | Effect |
|---|---|---|---|
| `set` | value + `data-bind` | 2907 | `assign` + full render (all `seg` / `choice` buttons) |
| `mv` | `1` up / `-1` down, `data-i` section | 2979 | swap within the column |
| `rmsec` | `data-i` | 2982 | remove section, toast with Undo |
| `fhreset` | `data-i` | 2981 | delete `frontH` |
| `shposreset` | `data-i` | 2920 | clear `shelfPos` |
| `ledadd` | `bottom / top / L / R` | 2918 | push LED |
| `leddel` | `data-i` | 2919 | remove LED |
| `camside` | `bottom / top / back` | 2999 | flip `cnc.camOut[key]` |
| `addx` | `part / plinth / side` | 2985 | add extra part |
| `rmx` | `data-i` | 3010 | remove extra, toast with Undo |
| `plfit` | `<i>` or `<i>:off` | 2992 | plinth fit gaps on / off |
| `lookpaste`, `lookfit`, `lookrot`, `lookrm` | material name | 2924, 2931, 2923, 2932 | look actions |
| `libsave` / `libunlink` | — | 2908 / 2909 | save cabinet to the library / unlink (panel editor) |
| `dup` | — | 2903 | duplicate cabinet |
| `del` | — | 2904 | delete cabinet: first click changes the label to "Tikrai ištrinti?", second click deletes, toast with Undo |
| `rrcab` | — | 2925 | realistic picture of this cabinet |
| `tab` | `res` | 2897 | go to Parts & CNC |
| `drwcab` | — | 2952 | drawings of this cabinet |

Used by the callers right around the slice: `addsec` (kind, `data-i` column), `plinth` (`off / on`), `plinthpos` (`in / under`), `goto` (`st-ops`), `colsel`, `step`.

`data-act-change` (handled on `change`): `looktex` (file), `lookcol` (colour), `lookmm` (number).
Other data attributes: `data-mdmat` (draggable material chip), `data-look` (look row: paste and file-drop target), `data-bkfront` (twin back-inset field), `data-fill-h` (live fill height), `data-num`, `data-empty`, `data-i`, `data-v`, `data-l` (column label for the narrow-screen table layout), `data-col` on the zone line.

---

## 13. Dead code and bugs found

| # | Finding | Evidence |
|---|---|---|
| 1 | `sectionSVG` (app.js:1457) and `connectorMarks` (app.js:1492) — the side cross-section with connector marks — are dead: nothing renders an element with id `xsec` / `xcap` or a `data-act="xside"` button; only `refreshLive` and `syncXsec` look for them | grep: no `id="xsec"` anywhere in app.js or legacy/index.html |
| 2 | `WARN_EN[0]` can never match (its key contains `„…“`, which `wTxt` rewrites before the table is applied) | app.js:1828 vs 1834 |
| 3 | `ledMoved` prints the engine's Lithuanian text without `wTxt`; LED messages also have no `WARN_EN` entries | app.js:1582 |
| 4 | `level()` misclassifies unknown texts as `info` ("by hand"): e.g. "kojelės per tankiai…", LED "…nepadarytas" | verified live |
| 5 | A side panel added from step 6 before the Baldai tab has ever been opened is named literally `exSide` (room.js uses its own, not yet initialised, text function) | verified live: `extras[1].name === "exSide"` |
| 6 | Hidden `hingeSide`: the control disappears for 2+ side-by-side doors but the engine still obeys a stored `left` / `right`, hinging every door on the same side | app.js:1888 vs engine.js:493 |
| 7 | `frontH` and `shelfPos` are keyed by position; changing the count keeps the old entries, which then apply to different fronts/shelves | app.js:1927, 1915 |
| 8 | The 3D preview threw `RangeError: Maximum call stack size exceeded` (assembly `draw`) on every render once the default drawer cabinet had 8 or more drawers (allowed range is 1–12); the form kept working | observed in headless Chrome; cause not investigated, outside this slice |
| 9 | Stale help texts: `lookNone` and `rmWtHint` say materials / worktop are in "step 1"; they are in steps 5 and 2 | T table |
| 10 | Oven support select and several labels are hard-coded bilingual strings outside the `T` table (`frontDrop`, `divider`, oven options, the sheet's summary titles, "Jungtys") | app.js:1885, 1894, 1896, 1968–1970 |

---

## 14. UX problems visible from the code

Sections

1. The list shows the top section first, but the add buttons sit **below** the list and add **on top**; there is no insert-in-place and no drag reordering, only ▲ ▼.
2. With tall cabinets the column picture above the cards is huge (measured 933 px for a 2100 mm cabinet; the first section card started 1718 px down the page), so the fields are far below the fold.
3. With partitions only one column's sections are visible at a time.
4. One flat record serves every kind. A kind cannot be changed (delete and re-add). The fridge is a checkbox inside a doors card; cargo is its own kind; both silently overwrite other fields.
5. "Section height" means a zone module (front + 3 mm gap) for fronts, the niche for an oven, and niche + 2 boards for a fridge. Users think in front heights and appliance niches.
6. "Likęs / Fill" is a checkbox per section; several fills share equally, no fill leaves an unexplained remainder, overflow only turns a line red. Nothing proposes a fix.
7. Typed front heights that do not fit are replaced by an equal split or absorbed by the lowest front; the only feedback is a small note and a red row.
8. Shelf positions are "section bottom to shelf middle" — a convention inherited from the offer app, not how a shelf is measured in the workshop.
9. Runner length is chosen from a list without regard to cabinet depth; the engine complains afterwards.
10. Hinge side "Auto" for a single door means right-hinged; the user is not told.
11. Raw upper-case codes (`BLUM LANKSTAI`, `BE FURNITŪROS`) are shown as option labels in Lithuanian mode.

Operations and construction

12. Step 4 mixes "what the CNC drills" switches with the leg layout editor and LED grooves; legs/feet/none is chosen in step 2 but configured in step 4.
13. "Verified / unverified" badges describe the developer's confidence against SWOOD models, not something the user can act on; many warnings repeat this ("NEPATIKRINTA su SWOOD modeliu") on every cabinet, drowning real problems.
14. Rows that do not apply are still listed, greyed, with live checkboxes.
15. The plinth is editable in three places (step 2, the extras table, the fit block) and is identified by name matching `cokol|plint`.
16. The back's fixing, mount, cover and inset form a dense block of dependent dropdowns with notes that appear and disappear.

Materials

17. Free-text material names with suggestions: typos create new materials; required fields are only marked, never enforced.
18. Materials are per role (carcass, fronts, back, top, drawer base), not per board; the drag-and-drop dock looks per-board but maps back to roles, so dropping on one shelf recolours the whole carcass.
19. Textures are stored as base64 JPEG (up to ~700 KB each) inside the project in browser storage — a known cause of "storage full".
20. Colours for flat pictures are guessed from words in the material name.

Feedback

21. Warnings are free Lithuanian text; severity and the step they belong to are guessed by regex; English is produced by substring replacement and is incomplete.
22. The warnings list and the sketch are inside collapsed panels; the only always-visible signals are small dots.
23. Out-of-range numbers are ignored while typing (the field shows one value, the model keeps another) and reverted on blur with a toast.
24. Deleting is inconsistent: cabinets use a two-click confirm plus undo toast, sections and extras delete at once with an undo toast, LEDs delete with no undo.
25. Most changes re-render the whole page from strings; focus and scroll are kept by workarounds.

---

## 15. Function index (this slice)

| Function | Line | Purpose |
|---|---|---|
| `sectionSVG(c, res, side)` | 1457 | side cross-section SVG (dead) |
| `connectorMarks(r, X, Y, role)` | 1492 | connector marks for that SVG (dead) |
| `extrasBlock(c)` | 1514 | extra parts table + add buttons + plinth fit |
| `panelEditor(c)` | 1530 | loose panel editor |
| `bottomPic(inside, cam)` | 1543 | bottom pictogram |
| `legsEditor(c, r)` / `legPlanSVG(c, r)` | 1549 / 1562 | leg/feet layout + plan |
| `artOf(type)` / `choice(...)` | 1575 / 1576 | joinery choice buttons |
| `ledAtName`, `ledMoved(k)`, `ledBlock(c)` | 1578–1596 | LED grooves |
| `opRow(...)` | 1597 | one operation row |
| `matsBlock(c)` | 1603 | materials step |
| `matDock(c)`, `matTarget(c, part)`, `dropMat(c, part, name)` | 1615–1642 | drag-and-drop materials (+ document drag handlers 1643–1663) |
| `setMatOf(c, part, name)` | 1664 | material set from the realistic renderer |
| `pickMats()`, `lookNames(cabs)` | 1668, 1673 | material name lists |
| `lookBlock(names, room)`, `lookPaste`, `imageOf`, `lookSet`, `trimmed`, `lookTexture` | 1679–1752 | look feature (+ paste / file-drop handlers) |
| `reqF(html, val)` | 1754 | marks a field required |
| `dd(bind, val, opts, label)` | 1757 | bound dropdown |
| `backBlock(c)` | 1762 | back settings |
| `camMarks`, `backPic`, `camPick` | 1792–1811 | pictogram switches |
| `jointTypeOf(c, key)` | 1812 | joint type from the engine result |
| `worktopBlock(c, req)` | 1816 | worktop |
| `WARN_EN`, `WARN_EN_W`, `wTxt(x)` | 1828–1842 | warning translation |
| `NOTE_EN`, `NOTE_EN_W`, `noteTxt(x)` | 1843–1849 | part-note translation |
| `hingeLabel(v)` | 1850 | fitting labels |
| `railLengths(hw)` | 1851 | runner lengths per system |
| `mvFields(b, s)`, `usesMerivo(c)` | 1853, 1859 | MERIVOBOX options |
| `sameCol`, `firstInCol`, `lastInCol` | 1861–1863 | column helpers |
| `viewSection(c, s, i, z)` | 1864 | one section card |
| `shelfPosEditor(c, s, i)` | 1911 | shelf heights |
| `frontsEditor(s, i, secH, n)` | 1926 | stacked front heights |
| `liveSections(c)` | 1941 | live update of heights while typing |
| `viewSheet(c, inf)` | 1964 | right-hand sheet |
| `sketchOf(c)` | 1973 | schematic sketch |
