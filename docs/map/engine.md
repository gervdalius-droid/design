# Engine map — `src/lib/engine.js`

Scope: `src/lib/engine.js` (1947 lines, 187 KB, one IIFE, ES2015, no dependencies) and `test/engine/*.js`.
The new version reuses this file **unchanged**, so this document is the contract. All line references are `src/lib/engine.js:<line>` unless another file is named.
Everything marked **(probed)** was confirmed by actually running the engine in headless Chrome, not only by reading.

Contents: 1 Mental model · 2 Public API · 3 Input schema · 4 Output shape · 5 Warning catalogue · 6 Rules `R` · 7 `programs(panel)` · 8 Hard limits · 9 Tests · 10 Gotchas for the new UI

---

## 1. Mental model in one page

- **Units** mm. **Cabinet axes**: X to the right, Y from the front (Y=0) to the back, Z up from the underside of the bottom panel (:18-19). Fronts live at `y < 0` (from `−facadeT` to 0).
- `buildCabinet(c, idx, projName)` turns one cabinet definition into `{ panels, warnings, hardware, legs, joints, seams, visual, shelfInfo, dims, fgaps, worktop }`. It is a pure-ish synchronous function: no DOM, no I/O. **But it mutates its input** (fills `c.cnc` defaults, `c.box` defaults) and reads the **global mutable rules object `R`**.
- A **panel** is a rectangle `L × W × T` with holes on its two faces (`holes[]`), bores in its four edges (`edges[]`), optional routed grooves (`grooves[]`), edge banding per edge (`eb`), a material name (`mat`) and a 3-D placement (`place`).
- `programs(panel)` turns one panel into 0–3 SCM `.XXL` program texts plus machine warnings.
- Three kinds of "cabinet": normal carcass (`c.kind` undefined), 3-D free construction (`c.kind === 'box'` → `buildBox`), loose board (`c.kind === 'panel'`). Plus the flag `c.dishwasher` (front only).
- Warnings are **plain Lithuanian strings with no severity, no code, no field reference**. The legacy UI translates them to English by substring replacement (`WARN_EN` table, `src/lib/app.js:1828-1837`). See §5 for the full catalogue and a proposed severity.
- Sections of a column are stacked **bottom-up** in array order; per-front heights inside a section (`frontH`) are given **top-down**.

Panel frame (:201-207): `L` along machine X, `W` along machine Y, `T` thickness. Face **A** is the "up" face as defined for the part (inner face of a side, top face of the bottom, inner/back face of a front); face B is the opposite. **Holes on both faces are given in the same (x, y) as seen from face A.** Placement `place = { o, u, v, n }`: `o` is the panel's (x=0, y=0) corner on face A in cabinet coordinates; `u`, `v` are the directions of panel x and y; `n` is the outward normal of face A; the body lies on the `−n` side. World point of panel point (a, b) at depth c below face A: `o + a·u + b·v − c·n` (this is the helper every test uses).

After building, every panel goes through `orient` (:248, rotate so `L ≥ W`) and `rightHanded` (:234, mirror y so that `u × v = n`, sets `p.mirrored = true`). So in the output **`L ≥ W` always** and the machine frame is right-handed; the `note` text is rewritten accordingly (`Y=0` ↔ `Y=DY`).

---

## 2. Public API (`api`, :1938-1944)

Exported as `module.exports` under CommonJS, otherwise `window.DBEngine` (:1945). The app aliases it as `E`.

| Member | Signature | Returns / effect |
|---|---|---|
| `R` | object | The live rules object (§6). Mutable, shared by every call. The app reads it in 43 places. |
| `setRules(over)` | `(object) → undefined` (:192) | **Mutates global `R`** by deep merge. Plain objects merge recursively; arrays are replaced by a copy; `undefined`/`null` are skipped; `''` is skipped unless the current value is a string; unknown keys are **added** (probed: `setRules({nope:{a:1}})` creates `R.nope`). No validation, no reset function. |
| `buildCabinet(c, idx, projName)` | wrapper at :1939 around the inner function :313 | Result object (§4). Wrapper adds `r.worktop = worktopOf(c)` and removes parts with no real size (`L < 1`, `W < 1`, `T ≤ 0`, non-finite), adding one warning (§5 W-150). Dispatches to `buildBox` when `c.kind === 'box'`. `idx` is the 0-based cabinet index (names use `idx + 1`). `projName` defaults to `'PROJ'`. **Mutates `c.cnc`** via `cncDefaults` and `c.box` via `boxDefaults`. |
| `buildBox(c, idx, projName)` | :1337 | Same result shape plus `box` (no `shelfInfo`, no `fgaps`, no `worktop` unless called through `buildCabinet`). Call `buildCabinet`, not this. |
| `programs(p)` | `(panel) → { files, warnings }` (:1818) | §7. Pure with respect to the panel. `warnings` = machine warnings + `p.warnings`. |
| `newCabinet()` | :279 | `{ v:1, name:'', W:600, H:720, D:560, thick:18, cols:1, dishwasher:false, mat:{carc,facade,back:''}, edge:{carc,facade:''}, legH:100, cnc:{ joinery:'confirmat', back:'none', top:'rails', legs:true, topOverFacade:false, facadeT:18 }, sections:[ drawers section with fill:true, nDrawers:3 ] }` (probed). |
| `newSection(kind)` | :274 | `{ kind: kind||'doors', col:0, fill: kind!=='drawers', height: kind==='drawers' ? 700 : 400, nDrawers:3, hw:'BLUM TANDEMBOX', rail:500, nDoors:1, doorSplit:'v', hinge:'BLUM LANKSTAI', hingeSide:'auto', shelves:0, shelfAdj:true, shelfMode:'even', shelfPos:[] }`. |
| `cncDefaults(c)` | :267 | Fills `c.cnc` in place and returns it (§3.2). Converts legacy boolean `tbFront`. |
| `boxDefaults(c)` | :1310 | Fills `c.box` in place (`boards`, `cover`, `inner`, `fronts`) and returns it. |
| `worktopOf(c)` | :1910 | `null` unless `c.worktop.on`; else `{ mat, edge, T, over, left, right, L, W, x0, x1, y0, y1, z0, z1 }` in cabinet coordinates (§3.9). |
| `sidePanels(c)` | :1923 | Array of placed side panels from `c.extras` of kind `'side'` (§3.8). |
| `sideWidths(c)` | :1937 | `{ L, R }` total thickness of side panels on each side. |
| `legHeight(c)` | :1758 | Height above the floor: dishwasher → `+c.legH || 100`; legs off → 0; feet → `R.feet.h` (10); else `+c.legH || 100`. Probed: `[150, 10, 0, 100]`. |
| `splitFronts(secH, n, hs, gap)` | :291 | `{ mods, note }`; `mods` = module heights (front + gap) **bottom-up**, `hs` = wanted front heights **top-down** (§3.3). |
| `hingesPerDoor(h)` | :181 | `h ≤ 900 → 2`, `≤ 1500 → 3`, `≤ 2000 → 4`, else 5. |
| `hingeYs(h, nSet)` | :183 | Hinge centres from the door's bottom edge; outer ones `min(R.hinge.fromEnd, h/4)` from the ends, the rest evenly spaced. |
| `hingesFit(h, press, nSet)` | :185 | Do the cups (or press-in dowels) fit on a door of height `h`. Probed minimum: **82 mm** screw-on, **118 mm** press-in. |
| `cargoOf(s)` | :180 | Cargo fitting name of a section or `null`: `kind 'cargo'` → `s.cargoHw || 'CARGO DTC PURE PRO'`; `kind 'doors'`, not fridge, `hinge` matching `/^CARGO\b/i` → that hinge. |
| `shelfSetSb(c)` | :311 | `c.shelfSb` clamped to 0–150, or `null` when empty/non-numeric (then rule 20 applies). |
| `underDeduct(bt)` | :146 | Undermount drawer inside-width deduction: `R.under.ded` if > 0, else `42 + (bt − 16)·7/3` rounded to 0.5 (16 → 42, 18 → 46.5, 19 → 49; probed). |
| `pairedDowels(pos, w, off)` | :208 | Dowel positions paired with each cam (±32, ≥ 8 from ends, ≥ 12 from any cam, ≥ 16 apart); returns `[]` if any cam cannot get its dowel (atomic). |
| `num(v)` | :1776 | Number → string, 6 decimals max, trailing zeros removed. Used in all messages and XXL text. |
| `ascii(s)` | :1779 | Lithuanian/accented/Cyrillic → plain ASCII, the rest → `?`; `×` → `x`, `°` → ` deg`. |
| `safeName(s)` | :285 | `ascii` then every run of non-`[\w-]` → `_` (probed: `'Virtuvė „A“/1 šonas'` → `'Virtuve_A_1_sonas'`). |
| `boxPair(a, b)` | :1317 | Sorted `a_b` key. |
| `boxCoverDefault(a, b)` | :1319 | Which board covers the other by rank (back 7 > bottom 6 > left/right 5 > top 4 > front 1). |
| Constants | | `DRAWER_HW` (:97) = `['BLUM TANDEM','BLUM TANDEMBOX','BLUM MERIVOBOX','GTV KULKINIAI H45','DTC KULKINIAI H45','DTC PASLĖPTI']`; `DOOR_HW` (:147) = `['BLUM LANKSTAI','BLUM TIP-ON','KT. LANKSTAI','BE FURNITŪROS']`; `CARGO_HW` (:148) = `['CARGO DTC PURE PRO']`; `WT_DEF` (:1909) = `{ T:38, over:20, left:0, right:0 }`; `BOX_IDS` (:1305) = `['bottom','top','left','right','back','front']`; `BOX_DEF` (:1306). |

Not exported (internal): `runnerMarks`, `runnerUp`, `merivoPick`, `merivoParts`, `applyEbEdit`, `stdEdges`, `orient`, `rightHanded`, `routeMoves`, `groovePath`, `hardwareFromHoles`, `mergeHw`, `boxSpots`, `boxFrame`.

App usage counts in `src/lib/app.js`: `E.R` 43, `E.num` 33, `E.legHeight` 7, `E.CARGO_HW` 6, `E.worktopOf` 5, `E.setRules` 5, `E.safeName` 3, `E.WT_DEF` 3, `E.DOOR_HW` 3, `E.splitFronts` 2, `E.shelfSetSb` 2, `E.programs` 2, `E.buildCabinet` 2, `E.boxDefaults` 2, `E.hingesPerDoor` 1, `E.cargoOf` 1, `E.BOX_IDS` 1.

---

## 3. Input schema

General coercion rules (apply everywhere unless stated):

- Numbers are read with unary `+`. Numeric strings work (`W:'600'` builds normally, probed).
- Pattern `+x || d`: `0`, `''`, `null`, `undefined`, `NaN` all become the default. **Negative numbers pass through** (probed: `thick:-5` builds garbage and only the size filter catches it).
- Pattern `+x > 0 ? +x : d`: anything not positive becomes the default.
- Booleans are read by truthiness unless written `!== false` (noted below).
- Unknown string values are almost never rejected; they silently fall into the `else` branch (noted per field).

### 3.1 Cabinet `c` (normal carcass, `c.kind` undefined)

| Field | Type | Default | Read at | Behaviour |
|---|---|---|---|---|
| `kind` | `undefined` \| `'box'` \| `'panel'` | carcass | :314, :348 | `'box'` → §3.10; `'panel'` → §3.11. |
| `name` | string | `''` | :317 | Appended to every part name through `safeName`. |
| `type` | `'PASTATOMOS'` \| `'PAKABINAMOS'` \| `'ŪKINĖ'` | none | :331 | The engine uses it only for visible-side banding: hung = `type === 'PAKABINAMOS' \|\| c.hang === true`, tall = `type === 'ŪKINĖ'`. It does **not** set legs, depth or anything else (the app does that through `cncFor(type)`, `app.js:386`). |
| `hang` | boolean | false | :331 | Marks a hung cabinet independent of `type`. |
| `W`, `H`, `D` | number | — | :316 | Outer carcass width, height (without legs, without worktop), depth (without fronts). Must all be `> 0` else W-005 and an empty result. Minimum `W ≥ 2t+60`, `H ≥ 2t+60`, `D ≥ 100` else W-006 and an empty result (not for dishwasher). No maximum in `buildCabinet` (machine limits bite in `programs`). |
| `thick` | number | 18 | :316 | Carcass board thickness `t`. `+c.thick \|\| 18`. Not clamped: `100` is accepted (probed), negatives are accepted and produce nonsense. |
| `cols` | integer | 1 | :375 | `floor`, clamped to **1–4** (probed: 5 → 4, 2.7 → 2, 0/'' → 1). |
| `colW` | number[] | equal split | :376-379 | Outer column widths. Used only if it is an array of exactly `cols` positive numbers; otherwise ignored silently (probed). **Rescaled proportionally to sum to `W`** (probed: `[100,200]` in `W:900` → 300/600). Partition `k` is centred on boundary `k+1`. Inner width of a column `< 100` → W-010. |
| `dishwasher` | boolean | false | :361 | Only one front is made: `(W − R.facade.dishGap) × (H − gap)`, no carcass, no programs. Probed: 600 × 720 → `FASADAS1 717 × 596`. |
| `dishWidth` | number | 600 | :1912, :1925 | Read **only** by `worktopOf` and `sidePanels` for a dishwasher; `buildCabinet` uses `c.W` for the front. Keep the two equal. |
| `legH` | number | 100 | :1200, :1758 | Leg height. `+c.legH \|\| 100`: **0 means 100** (probed). To have no legs set `cnc.legs = false`. With `cnc.feet` the height is `R.feet.h` (10). |
| `mat` | object | `{}` | :322 | `carc` (default `''`), `facade` (→ `carc`), `back` (→ `carc`), `top` (full top; → `carc`), `drawer` (MERIVOBOX base/back; → `carc`), `hdf` (→ `R.hdf.mat` `'HDF 3 mm'`). Plain strings, copied to `panel.mat`. |
| `edge` | object | `{}` | :323 | `carc` → `'KRAŠTAS'` when empty; `facade` → `''` when empty. **With `edge.facade` empty all fronts come out with no banding at all** (probed: `eb` all `''`). Visible sides use `facade \|\| carc`. |
| `shelfSb` | number \| `''` | rule 20 | :311, :315 | Shelf setback from the carcass front, clamped 0–150. Applies to all shelves of the cabinet. |
| `vis` | `{ L, R, B }` booleans | none | :331-333 | Visible left/right side: made from the front material with the front edging on the front edge (plus top end on tall/hung, bottom end on hung). `B` (visible bottom) only counts on a hung cabinet. If `facadeT ≠ thick` and a front material is set → W-002. A visible side of a cabinet **without legs** extends down to the fronts' bottom when the fronts hang below the carcass (`fg.bot < 0`); with the bottom under the sides the bottom then goes between that side and is fixed with cams (W-051). |
| `ebEdit` | `{ [partKey]: { y0, y1, x0, x1, fac } }` | none | :154, :338 | Manual banding per part, keyed by `panel.key` (e.g. `'DUGNAS'`, `'LENTYNA1'`). Per edge: `true` = banded (keeps the existing name or uses the standard one), `false` = not banded, `'fac'` = banded as the fronts. `fac:true` = every banded edge takes the front edging and is flagged in `p.ebFac`. Sets `p.ebManual`. **Edge names are in the final (oriented, mirrored) panel frame.** |
| `sections` | array | `[]` | :443 | §3.3. Missing/empty → carcass only, no warning (probed). |
| `extras` | array | `[]` | :1203, :1927 | The engine reads only a plinth (for `visual.plinth`) and side panels (`sidePanels`). **Extras never become engine panels**; the app adds them to the part list itself. §3.8. |
| `leds` | array | `[]` | :1217 | §3.7. |
| `worktop` | object | none | :1910 | §3.9. |
| `pe` | object | — | :349 | Only for `kind:'panel'` (§3.11). |
| `cnc` | object | see below | :267 | §3.2. |
| `v` | 1 | — | — | Written by `newCabinet`, never read. |

Fields the app stores on a cabinet that the engine ignores: `id`, `qty`, `note`, positions in the room, etc. (see the app-core map).

### 3.2 `c.cnc` (called `o` in the code)

`cncDefaults` (:267-273) merges these defaults **into `c.cnc` in place**:
`{ joinery:'confirmat', back:'none', backFix:'confirmat', joints:{}, top:'rails', rails:{ front:'h', back:'h', bottom:false }, railW:0, legs:true, topOverFacade:false, facadeT:18, runnerMarks:true, tbFront:'mark', hinges:false, hingeFix:'screw', pins:'off' }` (probed). Legacy `tbFront:true` → `'hole'`, `false` → `'off'`.

| Field | Accepted | Default | Behaviour and invalid values |
|---|---|---|---|
| `joinery` | `'confirmat'` \| `'cam'` \| `'dowel'` | `'confirmat'` | Default connector of every carcass joint. **Not validated**: an unknown value (probed `'glue'`) is drilled as confirmat but labelled `(undefined)` in the unverified warning. |
| `joints` | `{ [key]: { type, n, e, pos } }` or `{ [key]: { L:{…}, R:{…} } }` | `{}` | Per-joint override (§3.4). Legacy key `part` is copied to `partB1..3` / `partT1..3` (:573). |
| `top` | `'rails'` \| `'full'` | `'rails'` | Anything other than `'full'` means rails. |
| `topMount` | `'inside'` | over the sides | Only with `top:'full'`: top between the sides, sides run to the cabinet top (`Lside` + `t`). |
| `topOverFacade` | boolean | false | Only with a full top that is not inside: top is `facadeT` deeper to the front and the front zone ends under it. |
| `topOvF`, `topOvS`, `topOvB` | number ≥ 0 | 0 | Full top overhang past the front, each side, the back (:1058). Ignored with `topMount:'inside'`; negatives → 0. |
| `rails` | `{ front:'h'\|'v'\|'none', back:'h'\|'v'\|'hv'\|'none', bottom:boolean }` | `{ front:'h', back:'h', bottom:false }` | Only with a rail top. `h` = flat, `v` = standing, `hv` = flat + standing under it, `bottom` = standing rail on the bottom at the back. Unknown strings make no rail and also dodge W-014 (which tests `=== 'none'`). With an inside back, standing back rails and the bottom rail are dropped with W-013. |
| `railW` | number > 0 | `R.rail` = 100 | Rail width. Confirmat positions are `[30, 70]` only at exactly 100, otherwise `[30, w−30]`. |
| `back` | `'none'` \| anything else | `'none'` | Legacy single value. Falsy or `'none'` → no back; **any other string means a solid 18 mm back** (`'top'`, `'inside'`, `'groove'`, and also `'hdf'` — probed: `back:'hdf'` gives a solid `NUGARA 720×600×18`). `'inside'` additionally selects inside mounting. |
| `backs` | array per column: `'none'` \| `'hdf'` \| `'solid'` | from `back` | Wins over `back` for every column that has a truthy entry. **HDF is only reachable here.** Unknown strings behave like no back. |
| `backMount` | `'top'` \| `'inside'` | `'inside'` if `back === 'inside'` else `'top'` | "On the back of the whole cabinet" applies only when **every** column is `'solid'` and mount is `'top'`. If columns are mixed, solid columns always go inside (probed: `['hdf','solid']` + `'top'` → `NUGARA2` inside column 2 + one `PLAUSAS`). |
| `backFix` | `'confirmat'` \| `'cam'` | `'confirmat'` | Default connector of the back **on the back** (joint `back`, `backP<k>`). An inside back uses `joinery`. |
| `backInset` | number > 0 | 0 | Inside back moved forward; clamped to `max(0, Dside − t − 100)` with W-017. |
| `backCover` | `{ bottom, top }` booleans | none | Inside back (in every column) running down over a bottom-between-sides / up over a top-between-sides or the flat back rail. Preconditions at :414; otherwise W-015 / W-016. |
| `bottom` | `'inside'` \| other | under the sides | `'inside'` = bottom between the sides. |
| `bottomZ` | number | 0 | With `bottom:'inside'`: bottom raised above the sides' bottom edges, clamped to `0 … H − 200` (W-007). Carcass is built `H − hb` high and lifted at the end; sides reach the floor. |
| `bottomD` | number > 0 | full depth | Shorter bottom (sink pipes), clamped to `100 … Dside`; W-011 if larger, W-012 if a back exists. |
| `legs` | boolean | true | Legs (or feet) on/off. |
| `feet` | boolean | false | Pėdutės Ø15 (height `R.feet.h` = 10) instead of legs: Ø8×10 holes instead of leg marks. |
| `legsX` | 2–6 \| `'parts'` | 2 | Legs per row across the width (rounded, clamped 2–6); `'parts'` = at both sides and under every partition. |
| `legsY` | 2 \| 3 | 2 | Rows front to back; only exactly `3` gives three. |
| `facadeT` | number | 18 | Front thickness. `+x \|\| 18`. |
| `fg` | `{ l, r, mid, top, bot }` | rules | Front gaps (:325-328, :426-434). `l`/`r`: side gaps (default `R.facade.sideGap` 3, ≥ 0). `mid`: gap between fronts (default `R.facade.gap` 3, ≥ 0). `top`: gap under the cabinet top / covering top (default 5 with rails, 3 with a full top). `bot`: where the lowest fronts start, measured from the carcass underside z=0 (default 0, so the fronts cover the bottom board's edge); negative = lower, limited to `botLow` with W-018. Empty/non-numeric → rule. |
| `runnerMarks` | boolean | true | `!== false`. Runner markings in the sides/partitions. |
| `tbFront` | `'mark'` \| `'hole'` \| `'off'` | `'mark'` | TANDEMBOX front fixing: Ø5×2 markings, real holes (`R.runner['BLUM TANDEMBOX'].facade.d/depth`, Ø10×12), or nothing. `'hole'` needs a Ø10 drill in `R.drills.top` or every front is NEPROGRAMUOTA. |
| `hinges` | boolean | **false** | Drill hinge cups in doors and plate marks in sides. When false every hinged door section adds W-027. |
| `hingeFix` | `'screw'` \| `'press'` | `'screw'` | Screw-on cup (two Ø5×2 marks) or press-in (two Ø8×11 holes). Anything not `'press'` is screw. |
| `pins` | `'off'` \| `'shelf'` \| `'row'` | `'off'` | Shelf-support holes Ø5×12: none / one pair per shelf / a row of ±2 × 32 mm around it. Any other truthy value behaves like `'shelf'`. |
| `camOut` | `{ back, bottom, top }` booleans | none | Put the cams on the outer face of an inside back / bottom between sides / top between sides. |
| `ebBack` | boolean | false | Also band the back edge of sides/bottom/top (`stdEdges`, :172). |

### 3.3 Sections `c.sections[]` (:442-530)

A section belongs to column `clamp(floor(+s.col || 0), 0, cols−1)` (probed: `col:7` lands in the last column). Sections of one column are stacked **bottom-up** in array order starting at the fronts' bottom `zBotF`.

Height: `fill:true` sections share what is left of the front zone equally; others use `max(0, +height || 0)`. Zone height `Hz = zTopF − zBotF`. Explicit heights above the zone → W-019 (the cabinet is still built with fronts overflowing; tests and the app treat this as invalid). If nothing fills and the sum is smaller, the rest of the zone stays empty **without a warning** (probed).

Front zone (probed on 600×720, rails top): starts at z=0 (fronts cover the bottom board's edge), `zTop0 = H − 2` with rails, `H` with a full top, `H − t` with a top over the fronts; each front is its module minus `gap`, so the top gap is 5 mm with rails. Result `fgaps = { l:3, r:3, mid:3, top:5, bot:0, hb:0, botMin:0, botLow:−90 }`.

Common fields: `kind`, `col`, `fill`, `height`.

| `kind` | Fields read | What it makes |
|---|---|---|
| `'drawers'` | `nDrawers` (round, min 1, **no maximum**), `hw`, `rail` (`+ \|\| 500`), `frontH`, `innerDrawers`, `mvH`, `mvExt` | `nDrawers` fronts (`FASADAS<n>`), runner markings, hardware row `<hw> L=<rail>` per drawer; drawer-box parts for ball / undermount / MERIVOBOX runners. A front under 40 mm is skipped (W-024). Section under `60 + gap` high or narrower than 60 → W-020, nothing made. |
| `'doors'` | `nDoors` (round, min 1, no maximum), `doorSplit` `'v'`\|`'h'`, `hinge`, `hingeSide` `'auto'`\|`'left'`\|`'right'`, `hingeN`, `frontH` (only when split `'h'`), `frontDrop`, `fridge`, `shelves`, `shelfAdj`, `shelfMode`, `shelfPos`, `innerDrawers` | `DURYS<n>` panels, hinge cups and plate marks when `cnc.hinges`, shelves behind. |
| `'cargo'` | `cargoHw` | One front on a cargo frame: no hinges, no shelves, nothing drilled. Hardware `<CARGOHW> W=<width>`. A `'doors'` section whose `hinge` starts with `CARGO` behaves the same. |
| `'open'` | `shelves`, `shelfAdj`, `shelfMode`, `shelfPos`, `divider` | Shelves only. `divider:true` adds a fixed dividing shelf towards each neighbouring fronted section (:451-455), placed on the fronted section's side of the border. |
| `'oven'` | `shelves` (1 or 2) | Fixed support shelves: niche floor (if ≥ `t` above the bottom) and niche ceiling (if 2); more than 2 → W-032. |
| anything else | — | Takes its height, makes nothing, no warning. |

Field details:

- **`hw`** must be a key of `R.runner` to get markings: `BLUM TANDEM`, `BLUM TANDEMBOX`, `BLUM MERIVOBOX`, `GTV KULKINIAI H45`, `DTC KULKINIAI H45`, `DTC PASLĖPTI`, plus the offer-app aliases `GUOLINIAI` (ball) and `KT. PASLĖPTO MONTAVIMO` (undermount). Unknown → W-023, fronts still made, hardware row still added under that name (probed).
- **`rail`** is not checked against a list. `R.under.lengths`, `R.ball.lengths`, `R.merivo.lengths` are catalogue lists for the UI only.
- **`frontH`** (:291): wanted front heights **from the top down**; array or index-keyed object; empty/0 = share the rest. Outcomes (probed): fits → as typed; auto fronts would be under `80 + gap` → note + equal split; all given and the sum is off → the lowest given front absorbs the difference with a note, or equal split if it would drop under `80 + gap`.
- **`mvH`** `'auto'` \| `'N'` \| `'M'` \| `'K'` \| `'E'`, **`mvExt`** `'rail'` \| `'boxcap'` (MERIVOBOX height and E-height extension, :120-127). Auto picks the highest of E, M, N that fits; K only when asked; a chosen height that does not fit falls back to auto with a note.
- **`hinge`**: `'BE FURNITŪROS'` = no hinges at all; any other string = hinged (name copied to hardware). `fridge:true` forces no hinges.
- **`hingeSide`** (:493): vertical split — `'left'`/`'right'` apply to every door; `'auto'` = every door hinged left except the last, which is hinged right (so a **single door on auto is hinged right**, and with 3 doors the middle one has no side to hang on → W-059). Horizontal split — left unless `'right'`.
- **`hingeN`**: ≥ 2 → that many hinges per door (max 6); otherwise by height (`hingesPerDoor`).
- **`frontDrop`**: doors reach down over the open niche below by this much (max: niche height − 20); only the lowest door when split horizontally; not for a fridge.
- **`fridge`** (only `kind:'doors'`): `nDoors` clamped 1–3 with default **2**, always stacked, no hinges; fixed niche floor/ceiling shelves stopping `R.fridgeVent` (50) short of the back.
- **`shelves`** (round), **`shelfAdj`** (`=== false` → fixed, joined like a rail; otherwise adjustable on pins, 2 mm narrower, hardware `Lentynų laikikliai` ×4 each), **`shelfMode`** `'even'` \| `'manual'`, **`shelfPos[m]`** = height of the shelf's middle above the section bottom (manual mode, or auto-detected when any entry > 0), clamped inside the section.
- **`innerDrawers`** > 0 → W-025 / W-026 (not supported).

### 3.4 Joint overrides `cnc.joints[key]` (:570-651)

Value: `{ type:'confirmat'|'cam'|'dowel', n, e, pos }` for both ends, or `{ L:{…}, R:{…} }` for different left/right ends.

- `type`: unknown → the joint's default.
- `n` (count, rounded) and/or `e` (distance from each end): evenly spread; `e` clamped to `[minEdge, w/2]`; `n` reduced to what fits with W-042.
- `pos`: explicit array of positions in mm along the joint from its start; overrides `n`/`e`. Each clamped to `[minEdge, w − minEdge]` (W-039), sorted, any closer than `minGap` to the previous dropped (W-040), none left → W-041.
- `minGap` 24 (cam) / 16 (others); `minEdge` 12 (cam) / 9.
- Cams always get paired dowels via `pairedDowels`; if not every cam can get one → W-043 and **no dowels at all**.

Joint keys of a carcass:

| Key | Joint | Length `w` | Kind | Default type |
|---|---|---|---|---|
| `bottom` | bottom ↔ sides | bottom depth | carc | `joinery` |
| `top` | full top ↔ sides | side (or inside-top) depth | carc | `joinery` |
| `railF`, `railB`, `railV`, `railBottom` | front / flat back / standing back / bottom rail ends ↔ sides | rail width | rail | `joinery` |
| `railVH` | standing back rail ↔ flat back rail (long edge) | `W − 2t` | long | `'cam'` |
| `railBotB` | bottom rail ↔ bottom (long edge) | `W − 2t` | long | `'cam'` |
| `back` | back on the back ↔ sides, or inside back ends | side height / back height | back | `backFix` on the back, `joinery` inside |
| `backP<k>` | back on the back ↔ partition k | partition height | back | `backFix` |
| `shelf` | fixed shelves | shelf depth | shelf | `joinery` |
| `oven` | oven supports and fridge-niche shelves | shelf depth | shelf | `joinery` |
| `partB<k>`, `partT<k>` | partition k ↔ bottom / full top | partition depth | carc | `joinery` |
| `partF<k>`, `partR<k>` | partition k ↔ flat front / back rail | rail width | rail | `joinery` |

Default spots (`defSpots`, :586): carc — `e` from each end (50 for cam and confirmat; `R.confirmat.fromFront` / `R.cam.cam.fromFront`), a third in the middle only when `w > R.joint3From` (550); rail — confirmat `[30, 70]` at w=100 else `[30, w−30]`, cam one in the middle; long — `[50, w/2, w−50]`; back — 50 from the ends (confirmat) / 80 (cam), third above 550; shelf — like carc, falling back to `[40, w−40]` then `[w/2]` on short shelves. Keys matching `/^(part[BTFR]\d|backP\d|railVH|railBotB)$/` are "single" (one line, no L/R).

Only these combinations count as verified against the shop's SWOOD models (`VERIFIED`, :602): `bottom` and `top` with confirmat or cam; `railF`, `railB`, `railV`, `railBottom`, `back` with confirmat. Everything else, and any joint with changed positions, is listed in the summary warning W-099.

Drilling rule (:564-567): the part whose **end** meets another part's **face** carries the edge bores (confirmat pilot Ø5×32, or cam bolt Ø8×31.906 + Ø15×15 cam in its face 34 from the end, or dowel Ø8×27); the face gets a Ø8 through hole (confirmat), or Ø8×15 (cam bolt) and Ø8×12 (dowel).

### 3.5 Legs and feet (:1003-1042, :1197-1201)

- Legs (`cnc.legs && !cnc.feet`): positions `R.legs.fromSide` 55 from each side, rows at `R.legs.fromFront` 95 and `Dbot − R.legs.fromBack` 55; each leg = four Ø5×2 marks ±14.85 on the bottom's underside. A leg whose Ø60 plate would cover a connector head moves sideways in 8 mm steps (whole front-to-back line together, up to ±96) with W-070; cannot → W-068. Legs closer than 70 → W-069.
- Feet (`cnc.feet`): Ø8×10 holes, `R.feet.fromFront` 50 / `fromBack` 50; under the sides and partitions (bottom under the sides) or into the sides' bottom edges (bottom between the sides). A hole meeting a joint hole moves in 8 mm steps (W-066) or stays with W-067.
- Output `legs[] = { x, y, d, h, feet? }` in cabinet x/y; hardware `Kojelės` or `Pėdutės Ø15`.

### 3.6 Fridge, oven, cargo

Covered in §3.3. There is no separate fridge/oven object; they are section kinds/flags.

### 3.7 LED grooves `c.leds[]` (:1214-1252)

`{ at:'bottom'|'top'|'L'|'R', side:'in'|'out', from, w, depth, ends:'open'|'closed', end }`

- `at` picks the first panel of role DUGNAS / VIRSUS / KAIRE / DESINE. `'top'` on a rail-top cabinet or a missing part → W-080.
- `side`: anything but `'out'` is inside.
- `w` default `R.led.w` 16; `depth` default 8, capped to `T − R.rout.skin` (W-081); `from` (front edge → groove) default 30, `≥ 0`.
- `ends:'closed'` stops `max(dia/2 + 1, end ?? 20)` from each end; part too short (< 60 between) → W-083.
- A groove that would open into a hole/bore is moved up to 80 mm (W-084) or kept with W-085.
- Adds `p.grooves[]` to the panel, a routed toolpath in the program, hardware `LED profilis 16 mm (įleidžiamas)` in metres, and `visual.leds`.

### 3.8 Extras read by the engine

- **Plinth** (:1203-1213): the first extra with `kind:'plinth'` or a name matching `/cokol|plint/i`, with `L > 0`, `W > 0` and `qty` not 0. Fields: `L`, `W` (height), `T`, `mat`, `between`, `yf` (setback, default 50, or 20 between the sides), `gl`/`gr`/`gt`/`gb` (gaps; when any is set the plinth is fitted to the cabinet, W-079 if it cannot). Output only in `visual.plinth = { x0, x1, z0, z1, fit, between, top, floor, sideIn, y0, t, mat }`.
- **Side panels** (`sidePanels`, :1923): extras with `kind:'side'` and `side:'L'|'R'`: `L` = height, `W` = depth, `T` (default carcass thickness), `qty` (0 = not made), `zb` (bottom above the carcass bottom, may be negative), `yf` (how far its front stands before the carcass front, default `facadeT`), `mat`. Accepts comma decimals. Two on one side stack outwards.

### 3.9 Worktop `c.worktop` (:1907-1918)

`{ on, mat, edge, T, over, left, right }`; `null` unless `on`. Defaults `WT_DEF`. `T ≤ 0` → 38; `left`/`right` clamped ≥ 0; `over` may be negative. Result: `L = W + left + right`, `W = max(1, D + facadeT + over)`, box `x0…x1, y0…y1, z0 = H, z1 = H + T`. For a dishwasher the width is `dishWidth`. For a box construction the front thickness counts only when it has an overlay front. Not machined.

### 3.10 3-D construction `c.kind === 'box'` (`buildBox`, :1297-1753)

Reads `c.W/H/D` (> 0 or W-100), `c.thick`, `c.name`, `c.mat` (`carc`, `back`, `facade`, `drawer`), `c.edge`, `c.shelfSb`, `c.ebEdit`, `c.cnc` (`joinery`, `joints`, `facadeT`, `hinges`, `hingeFix`, `runnerMarks`, `tbFront`) and `c.box`:

```
box: {
  boards: { bottom|top|left|right|back|front: { on, inset, T } },   // defaults: on (front off), inset 0, T '' = c.thick
  cover:  { 'a_b': 'a' | 'b' },        // which board covers the other at a corner; key = sorted pair (boxPair)
  inner:  [ { id, kind:'part',  x, T }                      // vertical partition, x = centre from the left outer face
          | { id, kind:'shelf', z, col, adj, T, setback } ],// shelf underside height z, compartment col, adjustable?
  fronts: [ { kind:'doors'|'drawers'|'cargo', col, cell, span, inset,
              nDoors (1–2), hinge, hingeSide, hingeN,
              nDrawers (1–8), hw, rail, mvH, mvExt, cargoHw } ],
  pinRow: boolean                       // row of pin holes instead of one pair
}
```

Rules: a board thinner than 12 mm is "thin" (no joints, W-109). An inset board always sits inside the outer ones (forced cover); inset + T above half the dimension → W-101 and inset 0. Corners with three outer boards must be filled by exactly one (W-103). Partitions must be ≥ 50 mm from neighbours (W-104); shelves ≥ 30 mm from the cavity floor/ceiling and other shelves (W-105, W-106). Joint keys are `'b_' + boxPair(P.id, Q.id)` (inner ids are `'i' + id`), default spots from `boxSpots` (50 from the ends, about every 400 mm). Joints that would clash are shifted in 8 mm steps (W-111) or left with W-110. Fronts go on "openings" (compartment × cell between fixed horizontal boards, `span` cells high); a `front` board forbids them (W-116). Returns the extra `box` object (§4.8). Always ends with W-130 when any joint was drilled.

### 3.11 Loose board `c.kind === 'panel'` (:348-357)

`W` = thickness (3–100), `H` = height (≥ 30), `D` = depth (≥ 30), else W-003. One part `PLOKSTE`, `L = H`, `W = D`, `T = W`, material `mat.carc || mat.facade`. Banding from `c.pe = { e1, e2, e3, e4 }` (front, back, bottom, top; banded unless `=== false`). Always adds the info warning W-004. No holes, no programs. `dims.t = W`.

---

## 4. Output shape

### 4.1 Result object

```
{ panels:   Panel[],
  warnings: string[],
  hardware: { item, qty, unit }[],          // merged by item name (mergeHw)
  legs:     { x, y, d, h, feet? }[],
  joints:   JointInfo[],                    // for the joint editor
  seams:    Seam[],                         // joint lines in 3-D
  visual:   { doors:[], drawers:[], plinth, hb, leds:[] },
  shelfInfo:{ col, sec, base, zc:number[] }[],   // each shelf's centre height; base = section bottom
  dims:     { W, H, D, t },                 // H = the full height asked (Htot), also with a raised bottom
  fgaps:    { l, r, mid, top, bot, hb, botMin, botLow },
  worktop:  object | null,                  // added by the api wrapper
  box:      {...}                           // only for kind 'box'
}
```

Early returns (invalid dimensions, dishwasher, loose panel) have the reduced shape `{ panels, warnings, hardware, legs:[], joints:[], seams:[], visual:{ doors:[], drawers:[], plinth:null, hb:0 }, dims }` — **no `shelfInfo`, `fgaps`, `visual.leds`**; with invalid numbers `dims` holds 0 instead (probed).

### 4.2 Panel

| Field | Meaning |
|---|---|
| `name` | `<base>_<ROLE><n>`; `base = safeName(projName \|\| 'PROJ') + '_' + (idx+1) + (c.name ? '_' + safeName(c.name) : '')`. Probed: `Virtuve_Azuolas_1_KAIRE`. |
| `key` | `name` without the base: `KAIRE`, `FASADAS2`, `STALC1_SONAS_K`. Stable id inside a cabinet; key of `c.ebEdit`. |
| `short` | `<idx+1>-<ROLE with dashes><n>` e.g. `1-JUOSTA-GALAS-H`, `1-STALC1-SONAS-K`. Used in labels and warnings. |
| `cab` | `idx + 1`. |
| `role` | See list below. |
| `L`, `W`, `T` | Size; `L ≥ W` after orientation. Not rounded (probed `236.33333333333334`). |
| `mat` | Material string (may be `''`). |
| `eb` | `{ y0, y1, x0, x1 }` edge-band name per edge (`''` = none). `y0`/`y1` are the long edges, `x0`/`x1` the ends. |
| `note` | Lithuanian position note for the operator; goes into the program header as `; POSITION (1OP): …`. |
| `holes[]` | `{ face:'A'\|'B', x, y, d, depth, through?, mark?, op? }`. `through:true` has `depth:0`. `mark:true` = marking (always drilled Ø5×2). `op` = `'hinge'` \| `'pin'` \| `'feet'` for the cabinet-creator operations. |
| `edges[]` | `{ edge:'x0'\|'x1'\|'y0'\|'y1', pos, d, depth, foot? }`; bore at mid-thickness, `pos` along that edge. |
| `grooves[]` | optional: `{ x0, x1, y0, y1, face, depth, led:true, name:'LED_PROFILE_DRAG_ON_EDGE' }`. |
| `warnings[]` | **Per-part warnings; they surface only through `programs(p).warnings`**, not in the cabinet's `warnings`. |
| `place` | `{ o:[x,y,z], u, v, n }` (§1). |
| optional flags | `mirrored`, `drawer` (a drawer or cargo front), `drawerOf` (name of the front a drawer-box part belongs to), `vis` (visible side/bottom), `ebFac`, `ebManual`, `hingeLeft`, `sec` (section index of a door), `cargo`, `mv` (MERIVOBOX box data on the front), `frontOf` / `boxFront` (box constructions). |

Roles: `KAIRE`, `DESINE` (sides), `DUGNAS` (bottom), `VIRSUS` (full top), `JUOSTA_PRIEKIS`, `JUOSTA_GALAS_H`, `JUOSTA_GALAS_V`, `JUOSTA_APACIA_V` (rails), `NUGARA` (solid back), `PLAUSAS` (HDF back), `PERTVARA` (partition), `LENTYNA` (shelf), `FASADAS` (drawer / dishwasher front), `DURYS` (door, fridge front, cargo front), `STALC_SONAS`, `STALC_PRIEKIS`, `STALC_GALAS`, `STALC_DUGNAS` (drawer-box parts), `PLOKSTE` (loose board), `PRIEKIS` (front board of a box construction).

Order of `panels` for a carcass: KAIRE, DESINE, PERTVARA1…, DUGNAS, VIRSUS or the rails, NUGARA…, PLAUSAS…, FASADAS1…, drawer-box parts, DURYS1…, LENTYNA1….

Reference output (probed, `newCabinet()` 600×720×560, 3 TANDEMBOX drawers): KAIRE 702×560×18, DESINE 702×560×18, DUGNAS 600×560×18, JUOSTA_PRIEKIS 564×100×18, JUOSTA_GALAS_H 564×100×18, FASADAS1–3 594×236.33×18; hardware `BLUM TANDEMBOX L=500` ×3, `Kojelės` ×4, `Konfirmatai 7×50` ×14; no warnings; joints `railF`, `railB`, `bottom`.

Standard banding (`stdEdges`, :164): besides front edges, every edge of sides/bottom/top not covered by another part is banded with `edge.carc` (name `'KRAŠTAS'` when empty); rails get both long edges; the back edge only with `cnc.ebBack`. Skipped for box constructions and dishwashers.

### 4.3 Hardware items

`<hw> L=<rail>` (kompl., one per drawer) · `BLUM MERIVOBOX <N|M|K|E> L=<rail>` · `BLUM MERIVOBOX galerija L=…` / `BLUM MERIVOBOX BOXCAP L=…` · `BLUM MERIVOBOX L=<rail>` (when the box could not be made) · `<hinge name>` (vnt., hinges per door) · `<CARGO NAME> W=<mm>` · `Lentynų laikikliai` (4 per adjustable shelf) · `Kabės / vinutės plaušui` · `Kojelės` / `Pėdutės Ø15` · `LED profilis 16 mm (įleidžiamas)` (m) · counted from the drillings (`hardwareFromHoles`, :1759): `Ekscentrikai (Minifix 15)` and `Ekscentrikų varžtai` = number of Ø15 non-mark holes, `Kaiščiai 8×30` = Ø8 edge bores 27 deep, `Konfirmatai 7×50` = Ø8 through holes.

### 4.4 `joints[]` (JointInfo, :612-616)

`{ key, label, dflt, w, type, pos[], dowels[], n, e, manual, custom, defPos[], defN, defE, minGap, minEdge, split, single, sides:{ L, R } }` — `sides.L`/`.R` hold the same per-side fields. One entry per distinct key (first use). Box constructions add `box:{ P, Q }`.

### 4.5 `seams[]`

`{ key, side:'L'|'R', o:[x,y,z], d:[dx,dy,dz], w, at? }` — where a joint's connectors lie in the cabinet: origin, direction, length; `at:{ type, pos, dowels }` only when this seam's length differs from the joint's first use.

### 4.6 `visual`

- `drawers[]`: `{ w, h, bottom, x, hw, sec, idx, col, pname, mv? }` (box constructions add `rail, box:true, ox0, ox1, inset`).
- `doors[]`: `{ w, h, x, z, sec, hingeLeft, hinged, ys[], col, fridge, cargo }` (box: `hx, inset`).
- `plinth` (§3.8) or `null`; `hb` (raised-bottom height); `leds[] = { at, e:[[x0,x1],[y0,y1],[z0,z1]] }`.

### 4.7 `fgaps`

Effective front gaps for the editor: `l`, `r`, `mid`, `top`, `bot`, plus `hb`, `botMin = −hb`, `botLow` = lowest the fronts may go (`−hb − (legHeight − 10)` on legs, `−hb − 300` without).

### 4.8 `box` (constructions)

`{ openings:[{ col, cell, x0, x1, z0, z1, lo, hi }], boards:[{ id, name, short, role, kind:'outer'|'part'|'shelf', ext:[[x0,x1],[y0,y1],[z0,z1]], T, ins, lt, adj, col, inner }], ghosts:[{ id, ext, lt }], covers:[{ key, a, b, by, forced }], cavity, comps }`.

---

## 5. Warning catalogue (every message the engine can emit)

The engine attaches **no severity**. The `Sev` column is this map's classification for the new UI:
**B** block — nothing or almost nothing is built; **E** error — a part, hole set or fitting was left out or cannot be made, the result is not what was asked; **A** adjusted — the engine changed something on its own, check it; **U** unverified — a reminder that a rule is not proven on the shop's SWOOD model; **I** information.

`Src`: `C` = `result.warnings` of a carcass; `X` = `result.warnings` of a box construction; `P` = `panel.warnings` (visible only via `programs(p).warnings`); `M` = produced by `programs(p)`.
`{…}` are interpolated values. Section labels: `sekcija <n>` or `sekcija <col>.<n>` with several columns; drawer labels `stalčius [<col>.]<sec>.<n>`; box front labels `fasadai <n>[.<drawer>]`. `warn.push` messages can repeat; `warnOnce` ones are de-duplicated by exact text.

### 5.1 Dimensions and construction (carcass)

| ID | Line | Sev | Text template | Condition / field |
|---|---|---|---|---|
| W-002 | 333 | I | `matomas šonas iš fasado medžiagos ({mFac}) — storis lieka {t} mm, fasadų {fT} mm: patikrinkite, ar tokia plokštė yra` | `vis.L/R/B` set, `cnc.facadeT ≠ thick`, front material named |
| W-003 | 350 | B | `netinkami matmenys: plokštės storis 3–100 mm, aukštis ir gylis ne mažiau 30 mm` | `kind:'panel'` size out of range |
| W-003b | 351 | I | `krašto medžiaga nenurodyta — kraštai pažymėti „KRAŠTAS“` | Unreachable in practice (`eCarc` already falls back to `'KRAŠTAS'`); same text at :1574 for boxes, also unreachable |
| W-004 | 355 | I | `atskira plokštė: tik pjaunama — skylių ir programų nėra` | every `kind:'panel'` |
| W-005 | 358 | B | `netinkami matmenys: plotis, aukštis ir gylis turi būti didesni už 0` | `W`, `H` or `D` not > 0 (also text / empty) |
| W-006 | 359 | B | `netinkami matmenys: per maža spintelė (plotis ir aukštis ≥ {2t+60} mm, gylis ≥ 100 mm)` | `W < 2t+60`, `H < 2t+60` or `D < 100` |
| W-006b | 362 | I | `indaplovės spintelė: tik fasadas — programų negeneruojama` | `dishwasher` |
| W-007 | 371 | A | `dugnas pakeltas tik {hb} mm (nurodyta {bottomZ}) — virš dugno turi likti bent 200 mm` | `cnc.bottomZ > H − 200` |
| W-010 | 383 | E | `kolona {k} per siaura ({w} mm tarp šono ir pertvaros) — netinkami matmenys` | inner column width < 100 (`cols`, `colW`, `W`) |
| W-011 | 398 | A | `dugno gylis {bottomD} mm didesnis už šono gylį — dugnas per visą gylį ({Dside} mm)` | `cnc.bottomD > Dside` |
| W-012 | 399 | E | `dugnas sutrumpintas iki {Dbot} mm — nugara apačioje prie dugno nepritvirtinama; rinkitės „be nugaros“ arba tvirtinkite kitaip` | short bottom together with any back |
| W-013 | 405 | A | `nugara viduje: stačios galinės juostos netelpa šalia nugaros — praleistos` | inside back with `rails.back` `'v'`/`'hv'` or `rails.bottom` |
| W-014 | 409 | E | `viršuje nėra nei viršaus, nei juostų — karkasas nesurištas` | rail top with `rails.front === 'none'` and `rails.back === 'none'` |
| W-015 | 415 | A | `nugara dengia dugną tik kai dugnas tarp šonų ir per visą gylį — nugara stovi ant dugno` | `backCover.bottom` without its preconditions |
| W-016 | 416 | A | `nugara dengia viršų tik kai viršus tarp šonų arba gulsčia galinė juosta (be pertvarų) — nugara po viršumi` | `backCover.top` without its preconditions |
| W-017 | 419 | A | `nugaros atitraukimas sumažintas iki {bkIn} mm — spintelė per sekli` | `cnc.backInset` too large |
| W-018 | 434 | A | `fasadai gali nusileisti tik {−botLow} mm žemiau dugno[ (10 mm virš grindų)]` | `fg.bot` below the limit |
| W-051 | 843 | A | `matomas {kairys\|dešinys} šonas: dugnas prie jo tvirtinamas ekscentrikais (konfirmatų galvutės matytųsi šono išorėje)` | extended visible side with a confirmat bottom joint |
| W-052 | 783 | E | `nugara ant galo: pertvara nesiekia nugaros (stati galinė juosta) — prie pertvaros nepritvirtinta` | back on the back, partitions, standing back/bottom rail |
| W-053 | 958 | E | `pertvara viršuje nepritvirtinta — reikia gulsčios juostos arba pilno viršaus` | partition under a rail top with no flat rail |
| W-079 | 1212 | A | `cokolis netelpa su nurodytais tarpais` | plinth gaps leave < 50 wide or < 20 high |
| W-150 | 1941 | E | `{shorts}: per maži matmenys ({L×W, …}) — detalės nepridėtos, padidinkite spintelę` | api wrapper: parts with `L < 1`, `W < 1`, `T ≤ 0` or non-finite were removed |

### 5.2 Sections, fronts, drawers

| ID | Line | Sev | Text template | Condition / field |
|---|---|---|---|---|
| W-019 | 448 | E | `[kolona {k}: ]sekcijų aukščių suma ({sum}) didesnė už fasadų zoną ({Hz})` | non-fill section heights exceed the zone. Tests and the app treat it as an invalid layout |
| W-020 | 459 | E | `{sek}: per maža sekcija ({FW} × {secH} mm) — fasadai nepridėti, padidinkite aukštį` | drawers/doors/cargo section under `60 + gap` high or 60 wide |
| W-021 | 299→463/483 | A | `{sek}: nurodyti fasadų aukščiai ({a + b}) netelpa į sekciją {secH} mm — fasadai padalinti po lygiai` | `frontH` leaves < `80 + gap` for the automatic fronts |
| W-022a | 304→463/483 | A | `{sek}: fasadų aukščių suma ({sum} + tarpai) neatitinka sekcijos {secH} mm — fasadai padalinti po lygiai` | all `frontH` given, sum off, lowest would be < `80 + gap` |
| W-022b | 305→463/483 | A | `{sek}: fasadų aukščių suma neatitinka sekcijos {secH} mm — apatinis fasadas {h} mm` | all `frontH` given, sum off, lowest absorbs the difference |
| W-023 | 464 | E | `{sek}: bėgeliams „{hw}" skylių šablono nėra — bėgelių žymės nepridėtos` | `hw` not in `R.runner` (closing quote is a plain `"`) |
| W-024 | 467 | E | `{sek}: per daug stalčių šiam aukščiui — {n} fasadai po {h} mm; sumažinkite skaičių` | a drawer front under 40 mm; those fronts are skipped |
| W-025 | 472 | I | `{sek}: vidiniai stalčiai dar nepalaikomi` | drawers section with `innerDrawers > 0` |
| W-026 | 477 | I | `{sek}: vidiniai stalčiai už durų dar nepalaikomi — nebraižomi ir negręžiami` | doors/cargo section with `innerDrawers > 0` |
| W-027 | 479 | I | `{sek}: durys — lankstų skylės išjungtos (gręžiama rankomis)` | hinged doors while `cnc.hinges` is false (the engine default) |
| W-028 | 492 | E | `{sek}: durys per mažos ({dw} × {dh} mm) — sumažinkite durų skaičių` | a door under 40 mm wide or high; skipped |
| W-029 | 502 | E | `durys {w}×{h}: per žemos lankstams — lankstų skylės nepridėtos` | hinges do not fit the door height |
| W-030 | 503 | A | `durys {w}×{h}: lankstas perkeltas, kad plokštelė nepatektų po viršumi/juosta` | a hinge was clamped away from the bottom / top / rail |
| W-032 | 513 | A | `{sek}: daugiau nei 2 orkaitės atramos lentynos — pridėtos tik apatinė ir viršutinė` | oven `shelves > 2` |
| W-033 | 536 | E | `sekcija per žema lentynai ({z} mm aukštyje) — lentyna nepridėta, padidinkite sekciją` | a shelf would cut the bottom, top or front rail |
| W-034 | 537 | E | `lentynos per arti viena kitos ({z} mm aukštyje) — viena nepridėta, sumažinkite lentynų skaičių` | two shelves of a column closer than `t + 2` |
| W-035 | 559 | A | `durys {w}×{h}: lankstas perkeltas, kad plokštelė nesikirstų su lentyna — patikrinkite` | hinge moved (≤ 120 mm) off a shelf |
| W-036 | 560 | E | `durys {w}×{h}: lanksto plokštelė kertasi su lentyna — patikrinkite lentynų aukščius` | hinge plate hits a shelf and could not be moved |
| W-054 | 819 | E | `lentyna {i}: per mažai vietos ({Lc} × {depth} mm) — nepridėta` | shelf under 50 mm deep or wide |
| W-059 | 882 | E | `durys {w}×{h}: lankstų pusė ne prie šono (reikia pertvaros) — plokštelių skylės nepridėtos` | hinge side of a door is not at a side (e.g. middle of 3 doors) |
| W-060 | 974 | E | `durys {w}×{h}: lankstų pusė ne prie pertvaros — plokštelių skylės nepridėtos` | same, at a partition |
| W-061 | 887 | E | `lanksto plokštelės skylė ({z} mm aukštyje) kliūna už kitos skylės — praleista, patikrinkite` | plate mark meets another hole in the side |
| W-062 | 982 | E | `lanksto plokštelės skylė pertvaroje ({z} mm aukštyje) kliūna už kitos skylės — praleista, patikrinkite` | same, in a partition |
| W-063 | 980 | A | `durys {w}×{h}: lankstai pastumti {±40\|64\|96} mm, kad plokštelės nesusitiktų su kitos pertvaros pusės plokštelėmis — patikrinkite` | doors hinged on both faces of one partition |
| W-064 | 907 | E | `lentyna {z} mm aukštyje: laikiklio skylė kliūna už kitos skylės (lankstas/bėgelis) — praleista, perkelkite lentyną` | shelf-pin hole meets another hole in a side |
| W-065 | 991 | E | `lentyna {z} mm aukštyje: laikiklio skylė pertvaroje kliūna už kitos skylės — praleista, perkelkite lentyną` | same, in a partition |
| W-056 | 872 | E | `bėgelio {type} L={rail} žymė {m} mm netelpa šone ({Dside} mm) — praleista, rinkitės trumpesnį bėgelį` | a runner mark beyond `Dside − 5` |
| W-057 | 874 | E | `bėgelio {type} žymė ({z} mm aukštyje, {m} nuo priekio) patenka į ekscentriko skylę — bėgelio varžtas kliūs už jungties; patikrinkite (pvz. rinkitės konfirmatus)` | runner mark centre inside a joint hole of the side |
| W-058 | 970 | E | `bėgelio {type} žymė pertvaroje ({z} mm aukštyje, {m} nuo priekio) patenka į ekscentriko skylę — …` (same ending) | same, in a partition |
| W-071 | 1078 | E | `fasadas {w}×{h}: per žemas TANDEMBOX tvirtinimo skylei {y} mm — praleista` | TANDEMBOX front too low for a fixing hole |
| W-072 | 1094 | E | `{stalčius}: bėgelis {BD} mm ilgesnis nei telpa ({room} mm) — rinkitės trumpesnį` | ball runner longer than `Dside − backClear − 2`; no box |
| W-073 | 1097 | A | `{stalčius}: dėžės dugnas per arti korpuso dugno — padidinkite bėgelio ašies aukštį nustatymuose` | ball box bottom within 1 mm of the carcass bottom (`R.ball.up`, `boxBelow`) |
| W-074 | 1098 | E | `{stalčius}: fasadas per žemas arba skyrius per siauras stalčiaus dėžei ({HB} × {BW} mm) — dėžė nepridėta` | ball box height < 60 or inside width < 80 |
| W-075 | 1128 | E | `{stalčius}: bėgeliui {rail} mm reikia {rail+3} mm vidinio gylio, yra {room} — rinkitės trumpesnį` | undermount runner needs `rail + depthPlus` |
| W-076 | 1129 | I | `{stalčius}: stalčiaus šonai {bt} mm — paslėptiems bėgeliams tinka 16–19 mm` | undermount box thickness > 19 |
| W-077 | 1132 | E | `{stalčius}: fasadas per žemas arba skyrius per siauras stalčiaus dėžei ({HB} × {OW} mm) — dėžė nepridėta` | undermount back < 50 high or inside width < 100 |
| W-090 | 132 | E | `{lbl}: MERIVOBOX {rail} mm reikia {rail+3} mm vidinio gylio, yra {room} — rinkitės trumpesnį` | MERIVOBOX too long for the depth |
| W-091 | 134 | E | `{lbl}: fasadas per žemas MERIVOBOX dėžei (mažiausia N {68.5} mm) — dėžė nepridėta` | not even height N fits |
| W-092 | 123→135 | A | `{lbl}: MERIVOBOX {code} ({h} mm) netelpa — {imamas {auto}\|per žemas fasadas}` | chosen `mvH` does not fit |
| W-093 | 137 | E | `{lbl}: anga per siaura MERIVOBOX dėžei — dėžė nepridėta` | base width < 100 |
| W-094 | 138 | I | `MERIVOBOX dugnas ir galas pjaunami iš {16} mm plokštės, korpusas {t} mm — nurodykite stalčių dugno / galo medžiagą ({16} mm)` | `mat.drawer` empty and carcass not 16 mm |

### 5.3 Joints, legs, LED, clashes

| ID | Line | Sev | Text template | Condition / field |
|---|---|---|---|---|
| W-039 | 636 | A | `{joint}: {n} jungt. buvo per arti krašto — perkelta į {minEdge} mm nuo krašto, patikrinkite` | `joints[key].pos` entries clamped |
| W-040 | 637 | A | `{joint}: {n} jungt. per arti kitos (mažiau nei {minGap} mm) — praleista` | `pos` entries too close |
| W-041 | 638 | E | `{joint}: nėra nė vienos jungties — mazgas nesurištas` | `pos` empty after filtering |
| W-042 | 645 | A | `{joint}: {n} jungtys netelpa {w} mm pločio — sumažinta iki {maxN}` | `n` too many for the length |
| W-043 | 648 | E | `{joint}: ekscentrikui ir kaiščiui nepakanka vietos — pakeiskite jungčių vietas` | a cam could not get its dowel (then none are drilled) |
| W-044 | 690 | E | `pertvara {k}: jungtys iš abiejų pusių susitinka ir jų nepavyko pastumti — pakeiskite jungtis (Atskirai) arba lentynų aukščius` | connectors from both columns meet in a partition |
| W-045 | 691 | A | `pertvara {k}: jungtys iš dešinės kolonos pastumtos {dl} mm, kad nesusitiktų su kairės kolonos jungtimis` | same, resolved by shifting ±8·m |
| W-046 | 932 | E | `pertvaros jungtis už pertvaros ribų — praleista, patikrinkite vietas` | a partition end bore outside the partition |
| W-047 | 997 | E | `{PERTVARAk}: skylės iš abiejų pusių susitinka ({z} mm aukštyje) — pakeiskite lentynų / durų / jungčių vietas (NEPROGRAMUOTA teisingai)` | blind holes from both faces meet inside a partition |
| W-066 | 1008 | A | `pėdutė pastumta {d} mm, kad skylė nesusitiktų su jungties skyle — patikrinkite` | foot hole moved (probed: default cabinet with `feet:true` → 16 mm) |
| W-067 | 1009 | E | `pėdutės skylė kliūna už jungties skylės — patikrinkite` | foot hole could not be moved |
| W-068 | 1025 | E | `kojelė {x} mm: plokštelė uždengia jungties galvutę dugno apačioje — patikrinkite` | leg plate over a connector head, cannot move |
| W-069 | 1030 | E | `kojelės per tankiai: tarp kojelių mažiau nei 70 mm — sumažinkite kojelių skaičių eilėje` | `legsX` too many for the width |
| W-070 | 1031 | A | `kojelės: {n} vnt. pastumtos šonu, kad plokštelė neuždengtų jungčių dugno apačioje` | legs moved sideways |
| W-080 | 1221 | E | `LED {i}: spintelė be pilno viršaus (juostos) — LED griovelis nepadarytas` or `LED {i}: nėra detalės {role} — LED griovelis nepadarytas` | `leds[i].at` has no part |
| W-081 | 1223 | A | `LED {i}: griovelio gylis {dep} > {max} (paliekama 2 mm) — sumažinta` | `depth > T − skin` |
| W-082 | 1227 | E | `LED {i}: griovelis ({from} + {w} mm nuo priekio) netelpa detalėje {W} mm — nepadarytas` | groove outside the part |
| W-083 | 1229 | E | `LED {i}: per trumpa detalė uždaram grioveliui — nepadarytas` | closed groove on a short part |
| W-084 | 1246 | A | `LED {i}: LED griovelis kirto jungčių / furnitūros skyles ({role}) — perkeltas {was} → {now} mm nuo priekio` | groove moved off holes (probed on the default cabinet: 30 → 28) |
| W-085 | 1247 | E | `LED {i}: LED griovelis kerta jungčių ar furnitūros skyles ({role}), o perkelti nėra kur — pakeiskite jungtis ar LED vietą` | no free place within ±80 |
| W-086 | 1276 | E | `{short}: jungčių skylės persidengia ({x}, {y}) — pakeiskite jungčių kiekį ar atstumą` | two connector holes overlap on one face |
| W-087 | 1280 | E | `{short}: krašto skylės persidengia ({pos}) — pakeiskite jungčių kiekį ar atstumą` | two edge bores overlap |
| W-088 | 1283 | E | `nugaros konfirmatų Ø5 skylės šonų gale negali būti gręžiamos CNC (šonas {Lside} mm > 900) — nugarai pasirinkite ekscentrikus arba kaiščius` | back on the back with confirmats and sides longer than `R.machine.maxY` |
| W-089 | 1284 | E | `nugaros viduje Ø5 skylės ilguose kraštuose negali būti gręžiamos CNC (> 900 mm) — nugarai pasirinkite ekscentrikus arba kaiščius` | inside back with confirmats and a back longer than 900 |
| W-099 | 1285 | U | `naujos jungtys, dar nepatikrintos su SWOOD modeliu: {list} — patikrinkite pirmą gaminį` | any unverified item. List entries: `{joint label} ({konfirmatai\|ekscentrikai\|kaiščiai})`, `{joint label}: pakeistos vietos`, `Ø8 skylės ilgame krašte (F=4/F=5)`, `Ø8 skylės šonų ilgame krašte (F=4/F=5)`, `stati juosta prie gulsčios (ekscentrikai)`, `apatinė juosta prie dugno (ekscentrikai)`, `dugnas tarp šonų`, `viršus tarp šonų`, `matomas šonas pailgintas iki fasadų apačios, dugnas tarp jo`, `{hw} (dėžė ir skylės)`, `BLUM MERIVOBOX (dugnas, galas ir bėgelių skylės)` |

Joint labels used in `{joint}`: `dugnas`, `viršus`, `priekinė juosta`, `galinė juosta`, `stati galinė juosta`, `apatinė juosta`, `stati juosta ↔ gulsčia`, `apatinė juosta ↔ dugnas`, `nugara`, `nugara viduje`, `nugara ↔ pertvara {k}`, `fiksuotos lentynos`, `orkaitės atramos`, `šaldytuvo nišos lentynos`, `pertvara {k} ↔ dugnas`, `pertvara {k} ↔ viršus`, `priekinė juosta ↔ pertvara {k}`, `galinė juosta ↔ pertvara {k}`; with split sides ` (kairė)` / ` (dešinė)` is appended.

### 5.4 Per-part warnings (`panel.warnings`, visible only via `programs`)

| ID | Line | Sev | Text | Part |
|---|---|---|---|---|
| W-P1 | 889 | E | `lanksto plokštelės skylė už šono ribų ({x}) — praleista` | side |
| W-P2 | 893 | U | `lankstų plokštelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu` | every side with plate marks |
| W-P3 | 911 | U | `lentynų laikiklių skylės pagal standartą — NEPATIKRINTA su SWOOD modeliu` | every side with pin holes (in boxes this is a cabinet warning, :1560) |
| W-P4 | 1080 | U | `TANDEMBOX viršutinė tvirtinimo skylė 225.5 — patikrinti pagal Blum lentelę šiam stalčiaus aukščiui` | TANDEMBOX front ≥ 250 high |
| W-P5 | 1189, 1664 | U | `lankstų puodelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu` | every drilled door |
| W-P6 | 1665 | U | `įleistos durys: reikia įleistų durų lankstų; plokštelės žymės {37+fT} mm nuo priekio — NEPATIKRINTA` | inset door of a box construction |

### 5.5 Box constructions (`buildBox`)

| ID | Line | Sev | Text template | Condition |
|---|---|---|---|---|
| W-100 | 1348 | B | `netinkami matmenys` | `W`, `H` or `D` not > 0 |
| W-101 | 1355 | A | `{board}: įleidimas {ins} mm per didelis — netinkami matmenys` | inset + T above half the dimension (inset → 0) |
| W-102 | 1359 | B | `nėra nė vienos plokštės — pridėkite plokštes` | every outer board off |
| W-103 | 1392 | E | `kampas {a} – {b} – {c}: {plokštės kertasi\|liks tarpas} — pakeiskite, kuri plokštė dengia kurią` | a 3-board corner filled by 0 or 2+ boards (`box.cover`) |
| W-104 | 1404 | E | `pertvara {k} ({x} mm): ne vidinėje erdvėje arba per arti kitos plokštės — praleista` | partition < 50 from a neighbour |
| W-105 | 1412 | E | `lentyna {z} mm aukštyje: ne vidinėje erdvėje — praleista` | shelf < 30 from the cavity floor/ceiling |
| W-106 | 1413 | E | `lentyna {z} mm aukštyje: per arti kitos lentynos — praleista` | shelves < 30 apart |
| W-107 | 1430 | I | `{board}: {L} × {W} mm — per maža detalė, patikrinkite matmenis` | a board under 30 mm |
| W-108 | 1468 | A | `{joint}: {n} jungt. per arti kitos ar krašto — praleista` | custom `pos` |
| W-041 | 1469 | E | `{joint}: nėra nė vienos jungties — mazgas nesurištas` | custom `pos` empty |
| W-042b | 1474 | A | `{joint}: {n} jungtys netelpa {w} mm — sumažinta iki {maxN}` | `n` too many |
| W-043 | 1478 | E | `{joint}: ekscentrikui ir kaiščiui nepakanka vietos — pakeiskite jungčių vietas` | cam without dowel |
| W-109 | 1499 | I | `{Board} {T} mm: plona plokštė — jungčių negręžiama, tvirtinama vinimis / kabėmis` | board thinner than 12 mm |
| W-110 | 1526 | E | `{joint}: jungčių skylės kertasi su kitomis ir jų nepavyko pastumti — pakeiskite jungtis` | clash unresolved |
| W-111 | 1527 | A | `{joint}: jungtys pastumtos {dl} mm, kad nesusitiktų su kitomis skylėmis — patikrinkite` | clash resolved by shifting |
| W-112 | 1533 | E | `{Board} {T} mm: ekscentriko varžto skylė 15 mm per gili — pasirinkite konfirmatus` | cam bolt hole in a board thinner than 17 |
| W-113 | 1549 | E | `{Lentyna n}: šone nėra plokštės laikikliams` | adjustable shelf with no board at an end |
| W-114 | 1555 | E | `{Lentyna n}: laikiklio skylė kliūna už kitos skylės — praleista, perkelkite lentyną` | pin hole clash after 5 tries |
| W-P3 | 1560 | U | `lentynų laikiklių skylės pagal standartą — NEPATIKRINTA su SWOOD modeliu` | any pin hole |
| W-115a | 1597 | E | `{Board}: {bėgelio\|lanksto} žymė už plokštės ribų — praleista` | marking outside the board |
| W-115b | 1599 | E | `{Board}: {bėgelio\|lanksto} žymė kliūna už kitos skylės ({z} mm aukštyje) — praleista, patikrinkite` | marking clash |
| W-116 | 1604 | E | `{fasadai n}: priekio plokštė uždaro konstrukciją — išjunkite „priekis“, kad būtų angos durims / stalčiams` | fronts while the `front` board is on |
| W-117 | 1605 | E | `{fasadai n}: tokios angos nėra ([{col} skyriuje ]{n} ang.) — praleista` | `cell + span` beyond the openings |
| W-118 | 1606 | E | `{fasadai n}: anga {c}[ ({col} skyriuje)] jau užimta kitų durų / stalčių — praleista, pasirinkite kitą angą` | opening used twice |
| W-119 | 1619 | E | `{fasadai n}: anga per maža fasadui ({FW} × {FH}) — praleista` | opening under 60 mm |
| W-120 | 1623 | E | `{fasadai n}: reguliuojama {lentyna k} kertasi su stalčiais — pašalinkite ją arba padarykite nekilnojamą` | adjustable shelf inside a drawer opening |
| W-121 | 1625 | E | `{fasadai n}: {n} stalčiai netelpa į {FH} mm — praleista` | drawer front under 60 |
| W-122 | 1626 | E | `{fasadai n}: bėgeliams „{hw}“ skylių šablono nėra — žymės nepridėtos` | unknown runner |
| W-123 | 1637 | E | `{fasadai n}: bėgelis {rail} mm ilgesnis nei telpa ({room} mm) — rinkitės trumpesnį` | runner longer than the depth (checked here for **every** runner type, unlike the carcass) |
| W-124 | 1638 | E | `{fasadai n}: šone nėra plokštės bėgeliui — žymės nepridėtos` | no vertical board at a side of the opening |
| W-125 | 1656 | E | `{fasadai n}: durys {w}×{h} per žemos lankstams — skylės nepridėtos` | hinges do not fit |
| W-126 | 1657 | E | `{fasadai n}: lankstų pusėje nėra plokštės — plokštelių žymės nepridėtos` | no board on the hinge side |
| W-099b | 1674 | U | `naujos jungtys, dar nepatikrintos su SWOOD modeliu: {hw} (dėžė ir skylės), … — patikrinkite pirmą gaminį` | any drawer box |
| W-127 | 1679 | E | `{lbl}: fasadas per žemas arba anga per siaura stalčiaus dėžei — dėžė nepridėta` | ball box does not fit |
| W-128 | 1700 | E | `{lbl}: bėgeliui {rail} mm reikia {rail+3} mm gylio, yra {room} — rinkitės trumpesnį` | undermount depth |
| W-129 | 1701 | E | `{lbl}: fasadas per žemas arba anga per siaura stalčiaus dėžei — dėžė nepridėta` | undermount box does not fit |
| W-130 | 1746 | U | `3D konstrukcija: jungtys gręžiamos pagal spintelių taisykles, bet šis surinkimas naujas — patikrinkite pirmą gaminį` | any drilled joint |

MERIVOBOX warnings W-090 – W-094 also apply (shared `merivoParts`).

### 5.6 Machine warnings from `programs(p)`

All start with `{panel.name}: `. Any text containing **`NEPROGRAMUOTA`** means holes exist that no program drills.

| ID | Line | Sev | Text template | Condition |
|---|---|---|---|---|
| M-01 | 1832 | E | `ø{d} skylė už detalės ribų ({x}, {y}) — praleista` | face hole outside the panel |
| M-02 | 1833 | E | `ø{d} skylė ({x},{y}) — tokio grąžto galvoje nėra, NEPROGRAMUOTA` | diameter not in `R.drills.top` |
| M-03 | 1834 | I | `kiaurai ø{d} — kiauro grąžto nėra` | through hole with a diameter not in `R.drills.through` (still written) |
| M-04 | 1840 | E | `ø{d} krašto skylė už detalės ribų ({edge}, {pos}) — praleista` | edge bore outside the panel |
| M-05 | 1847 | E | `ø{d} krašto skylė ({edge}, {pos}) — šiam kraštui grąžto nėra, NEPROGRAMUOTA` | diameter not available on that edge |
| M-06 | 1860 | E | `ø{d} krašto skylė — grąžto nėra, NEPROGRAMUOTA` | turned program, diameter not in `R.drills.xEnds` |
| M-07 | 1891 | E | `{n} ø{d} skylės ilgame krašte — pasukti 90° negalima (ilgis {DX} > 900 mm), NEPROGRAMUOTA` | Ø5 long-edge bores on a panel longer than `R.machine.maxY`. **The most common real-world failure** |
| M-08 | 1892 | I | `pasuktoje programoje X ilgis tik {DY} mm (staklių min. 200) — patikrinkite prispaudimą` | turned program on a part narrower than `R.machine.minX` |
| M-09 | 1896 | E | `plotis {DY} mm > 900 — netelpa į stakles, NEPROGRAMUOTA` | panel width above `maxY`; **no program at all** |
| M-10 | 1897 | E | `ilgis {DX} mm > 3050 — netelpa į stakles, NEPROGRAMUOTA` | panel length above `maxX`; no program at all |

---

## 6. Rules object `R` (:26-96)

One global object, mutated by `setRules`. Values are the shipped defaults.

| Key | Value | Meaning |
|---|---|---|
| `cam.cam` | `{ d:15, depth:15, fromEdge:34, fromFront:50 }` | Minifix housing: Ø15×15, 34 from the part's end, 50 from front/back |
| `cam.bolt` | `{ d:8, depthFace:15, depthEdge:31.906 }` | bolt hole in the face; Ø8 bore in the edge stops at 31.906 |
| `cam.dowel` | `{ d:8, depthEdge:27, depthFace:12, offset:32 }` | dowel ±32 from each cam |
| `cam.backFix` | `{ d:8, fromEdge:50 }` | confirmats back → side |
| `confirmat` | `{ d:8, pilot:{ d:5, depth:32 }, fromFront:50, railFromEdge:[30,70], railAlong:50 }` | |
| `rail` | 100 | tie-rail width |
| `feet` | `{ d:15, h:10, fromFront:50, fromBack:50, holeD:8, holeDepth:10 }` | |
| `legs` | `{ fromSide:55, fromFront:95, fromBack:55, markD:5, markDepth:2, markOff:14.85, drawD:40 }` | |
| `runner` | map by name | `BLUM TANDEM { marks:[37,165,229], up:37 }`; `BLUM TANDEMBOX { marks:[19,28,37,261,293,453], up:33, facade:{ d:10, depth:12, fromSide:32, ys:[65.5,97.5], yGallery:225.5 } }`; `GTV/DTC KULKINIAI H45`, `GUOLINIAI` `{ ball:true }`; `DTC PASLĖPTI`, `KT. PASLĖPTO MONTAVIMO` `{ under:true }`; `BLUM MERIVOBOX { merivo:true }` |
| `under` | `{ up:37, marks:'37, 165, 229', clearBelow:14, recess:13, shorter:10, ded:'', topGap:10, boxT:0, depthPlus:3, perLen:'', lengths:[250…600 step 50] }` | undermount runner and its board box |
| `ball` | `{ up:37, front:35, rear:30, midFrom:450, clear:12.7, boxBelow:22, topGap:10, boxT:0, perLen:'', drawerMarks:true, lengths:[300,400,450,500,550] }` | ball-bearing runner and its box |
| `merivo` | `{ up:33, marks:'37, 261, 293', perLen:'', ded:51, shorter:26, boxShorter:10, t:16, below:24, topGap:10, depthPlus:3, sideH:{ N:68.5, M:91, K:129, E:192 }, backH:{ N:60.5, M:83, K:121, E:184 }, lengths:[270,300,350,…,600] }` | |
| `facade` | `{ sideGap:3, gap:3, zoneGapRails:2, insetGap:2, dishGap:4 }` | front clearances |
| `shelf` | `{ clearW:2, setback:20 }` | |
| `fridgeVent` | 50 | |
| `hinge` | `{ cupD:35, cupDepth:13, cupFromEdge:22.5, fromEnd:100, dowelD:8, dowelDepth:11, dowelSpacing:45, dowelOffset:9.5, plateD:5, plateDepth:2, plateFromFront:37, plateSpacing:32 }` | |
| `pins` | `{ d:5, depth:12, fromFront:37, fromBack:30, below:3, pitch:32, extra:2 }` | |
| `backCam` | `{ fromEnd:80 }` | |
| `through_extra` | 6.559 | through-hole overtravel below the part |
| `post` | `{ markD:5, markDepth:2, edgeMaxZ:31.906 }` | every marking is Ø5×2 `N="L"`; no horizontal bore deeper than 31.906 |
| `drills` | `{ top:[5,8,15,35], through:[5,8], xEnds:[5,8], yEdges:[8], edgeMax:35 }` | the boring head (`edgeMax` is not read anywhere) |
| `machine` | `{ maxX:3050, maxY:900, minX:200, minY:80 }` | `minY` is not read anywhere; `minX` only for M-08 |
| `rout` | `{ T:96, dia:15.5, D:24, name:'DEIMANTAS 16MM  - NAUJA - ', feedCut:4000, feedPlunge:2000, safeZ:10, skin:2, ramp:30, leadIn:5, air:20 }` | router for LED grooves |
| `led` | `{ w:16, depth:8, from:30, end:20 }` | |
| `joint3From` | 550 | third connector only on joints longer than this |
| `hdf` | `{ t:3, inset:2, mat:'HDF 3 mm' }` | |

`perLen` strings: `"450: 35,195,420; 500: 35,227,470"` — explicit mark positions for one runner length (`lenList`, :99).

### What the legacy settings override (`applyRules`, `src/lib/app.js:445-455`)

`RULE_DEF` is cloned from `E.R` at load (`app.js:343`). `applyRules()` first re-sets the catalogue values, then the user's: `hinge` (all fields; `plateDepth` forced back to 2), `pins`, `ball`, `under`, `merivo` (`up, below, ded, shorter, topGap, depthPlus, perLen, marks`), `drills.top` (from a comma list), and `runner['BLUM TANDEMBOX'].facade.{ d, depth }` (default 10 × 12). Nothing else in `R` is exposed to settings. Per-cabinet rail width goes through `cnc.railW`, not `R.rail`.

Consequence for the new version: call the equivalent of `applyRules()` once at start and after every settings change, **before** any `buildCabinet`. Because `R` is global, two builds with different rules cannot be interleaved, and tests that touch `R` must run in separate processes (`compare_ref.js` sets `drills.top`, `joint3From` and `confirmat.fromFront`).

---

## 7. `programs(panel)` (:1818-1905)

Returns `{ files:[{ file, id, text, n, up, kind }], warnings }`.

- **File name**: `<panel.name>_<n>OP.XXL`, `id` = the same without the extension, `n` counts from 1 per part. Full pattern: `<Project>_<cabNo>[_<CabName>]_<ROLE><i>_<n>OP.XXL`, all ASCII via `safeName`.
- **Which face is up**: `up1` = the face with more blind holes + grooves (A on a tie); `up2` the other.
- **Up to three programs per part**, in this order:
  1. `kind:'main'` (`up1`): blind holes of that face, **all through holes**, all edge bores the head can do in place, grooves of that face.
  2. `kind:'flip'` (`up2`): only if the other face has blind holes or grooves. Panel turned over about X; Y mirrored (`DY − y`).
  3. `kind:'rot'`: long-edge (`y0`/`y1`) bores whose diameter is not in `R.drills.yEdges` — in practice the Ø5 confirmat pilots. Same face up as 1OP, panel turned 90° counter-clockwise, header `DX`/`DY` swapped, bores become end bores `F=3`/`F=2` with `Y = DX − pos`.
- A program is only emitted when it has content, so `n` is contiguous (a part may have 1OP = main and 2OP = rot).
- `text`: `H DX=… DY=… DZ=… BX=0 BY=0 BZ=21 -EH T=0 *MM /"DEF" R=1 V=0`, comment lines (`;Fichier : <name>_<n>OP`, `;** Date codage : db-kurejas`, `; POSITION (1OP): <panel.note>`), `; ------ BP_SCM_DRILLING_BLOCK`, one ` XBO X= Y= Z= D= N="P|L" F= R=1#` per bore, optional routing block (` XG0 …` / ` XL2P …` under `; ------ DEIMANTAS 16MM  - NAUJA - `), then `.END` / `;FINEPROG`. CRLF line ends, ASCII only.
- Bore encoding: `F=1` top face, `F=3` left end (x0), `F=2` right end (x1), `F=4`/`F=5` long edges; blind `Z=-depth N="P"`; through `Z=-(DZ + 6.559) N="L"`; marking always `Z=-2 D=5 N="L"`; edge bores `Z=-min(depth, 31.906)`. Sort order: left end, top face by X, right end.
- Reference (probed, default left side): 25 lines — 3 × `F=3 D=5 Z=-31.906`, 18 runner marks `D=5 Z=-2 N="L"`, 4 × `D=8 Z=-24.559 N="L"`.

**What makes a part "NEPROGRAMUOTA"** (some or all of its holes are not in any program):

1. Panel wider than 900 (`maxY`) or longer than 3050 (`maxX`) and it has any machining → **no program at all** (M-09, M-10). Probed: a 950 deep cabinet loses its bottom program.
2. Ø5 bores in a long edge on a panel longer than 900 → cannot be turned (M-07); the main program is still written without them. Typical: sides of a tall cabinet with a back on the back fixed with confirmats (also announced at cabinet level by W-088 / W-089). Cure: `backFix:'cam'` (probed: no warning) or dowels.
3. A hole diameter the head does not have (M-02, M-05, M-06). Typical: `tbFront:'hole'` drills Ø10 into TANDEMBOX fronts while `R.drills.top` has no 10.
4. A hole outside the panel (M-01, M-04) — only "praleista", without the keyword.

Parts with no holes and no grooves simply return `files: []` (shelves on pins, HDF, plain fronts, loose boards).

---

## 8. Hard limits and baked-in assumptions

| Topic | Rule | Where |
|---|---|---|
| Carcass size | `W`, `H ≥ 2t + 60`; `D ≥ 100`; no upper limit in the build | :359 |
| Machine | parts up to 3050 × 900 with machining; Ø5 long-edge bores only on parts ≤ 900 long | :89, :1891-1897 |
| Thickness | default 18, not clamped. Cam bolt hole 15 deep needs `T ≥ 17` (only checked in boxes, W-112). Blind-hole collision logic assumes about 18 | :316, :1533 |
| Columns | 1–4; inner width ≥ 100 | :375, :383 |
| Loose board | thickness 3–100, height and depth ≥ 30 | :350 |
| Raised bottom | at least 200 mm must remain above it | :370 |
| Short bottom | 100 … side depth | :397 |
| Inside back inset | leaves ≥ `t + 100` of side depth | :410 |
| Section | fronted section ≥ `60 + gap` high and 60 wide | :459 |
| Drawer front | ≥ 40 high or it is skipped; `frontH` automatic share ≥ `80 + gap` | :467, :299 |
| Door | ≥ 40 × 40; hinges need ≥ 82 mm (screw-on) / 118 mm (press-in) height (probed); hinges 2 / 3 / 4 / 5 by height 900 / 1500 / 2000; manual `hingeN` 2–6 | :492, :181-190, :499 |
| Hinge clearances | plate marks ±16 around the hinge, 37 from the front edge; kept `16 + 2.5 + 3` clear of bottom/top; plate zone ±23 must miss shelves | :496, :548 |
| Fridge | 1–3 stacked fronts, niche shelves 50 short of the back | :481, :72 |
| Shelves | setback 0–150 (default 20); adjustable shelf 2 mm narrower; ≥ 50 deep and wide; two shelves ≥ `t + 2` apart | :311, :819, :537 |
| TANDEM | marks at 37 / 165 / 229 from the front, 37 above the front's bottom; **independent of runner length** | :37 |
| TANDEMBOX | marks at 19 / 28 / 37 / 261 / 293 / 453, 33 up → needs side depth > 458; front holes 32 from each side at 65.5 / 97.5, plus 225.5 on fronts ≥ 250 | :38-39, :1079 |
| Ball runner | needs `rail ≤ Dside − backClear − 2`; drawer inside 12.7 clear each side; box height ≥ 60; lengths list 300–550 | :1094, :62 |
| Undermount | needs `rail + 3 ≤ Dside − backClear`; box sides 16–19; deduction 42 (16 mm) / 49 (19 mm); lengths 250–600 | :1128, :61 |
| MERIVOBOX | needs `rail + 3` depth; base `LW − 51` × `NL − 26` from 16 mm board; heights N 68.5 / M 91 / K 129 / E 192; lengths 270–600 | :130-145, :68 |
| **Missing check** | For TANDEM and TANDEMBOX the engine **does not compare `rail` with the cabinet depth**. Probed: `rail:650` in `D:560` gives no warning. Only a mark beyond the side is reported (W-056) | :871-872 |
| Joints | min spacing 16 (24 cam), min edge distance 9 (12 cam); third connector above 550 | :629, :94 |
| Legs | 2–6 per row, 2 or 3 rows, ≥ 70 apart, ≥ 35 from the cabinet ends | :1013-1030 |
| Fronts below the carcass | down to 10 mm above the floor on legs, or 300 below without legs | :432 |
| LED groove | 16 × 8, 30 from the front; depth ≤ `T − 2`; closed ends ≥ 8.75 from the ends | :93, :1223-1229 |
| HDF back | 3 mm, 2 mm in from the carcass edges, nailed, no CNC | :95, :802 |
| Box constructions | boards under 12 mm get no joints; partitions ≥ 50 from neighbours; shelves ≥ 30 apart; doors 1–2 per opening; drawers 1–8 | :1356, :1404, :1413, :1624, :1649 |
| Dishwasher front | 4 mm narrower than the niche, `H − gap` high | :363 |

Assumptions: one material thickness for the whole carcass; fronts are overlay (inset only in boxes); `W/H/D` are the carcass without fronts, legs and worktop; the bottom runs under the sides unless `bottom:'inside'`; sides stand between bottom and top unless `topMount:'inside'`.

---

## 9. Tests (`test/engine/`)

### How to run here

There is no Node. `python3 tools/jsrun.py <script.js> [args…] [ENV=value…]` runs a node-style script in a fresh headless Chrome; `require('../src/engine.js')` and argv paths resolve into `src/lib/`. Exit code 0 unless the script throws or calls `process.exit(non-zero)`. Each run prints two harmless `favicon.ico 404` lines. Each test must run in its own process (they mutate `E.R`).

```
python3 tools/jsrun.py test/engine/compare_ref.js
python3 tools/jsrun.py test/engine/fuzz_check.js src/lib/engine.js [seed] [runs]
python3 tools/jsrun.py test/engine/side_check.js src/lib/engine.js src/lib/room.js
python3 tools/jsrun.py test/engine/openings_check.js src/lib/engine.js src/lib/room.js src/lib/drawings.js
```

### Results of this run (2026-11-24, unmodified snapshot)

Required set:

| Test | Args | Exit | Time | Output |
|---|---|---|---|---|
| `compare_ref.js` | — | 0 | 1 s | `768 cabinets, 4928 reference programs: 0 regressions; 1184 changed on purpose (cam rails / inside back are new joints, back-rail bug fix); 80 cabinets with every reference program unchanged` |
| `align_check.js` | — | 0 | 2 s | `768 cabinets, 26144 edge bores checked, 0 problems` + list of "still not machinable" (tall sides/backs with confirmat back) |
| `align_cols.js` | — | 0 | **374 s** | `4992 cabinets with partitions, 78152 parts, 217288 edge bores, 217360 seam points checked, 0 problems` |
| `align_manual.js` | — | 0 | 2 s | `1500 cabinets with hand-placed connectors, 39255 seam points checked, 0 problems` |
| `align_mixed.js` | — | 0 | 3 s | `2160 cabinets, 69512 edge bores checked, 0 problems` |
| `ops_check.js` | — | **1** | 4 s | `1872 valid cabinets, 85180 new holes checked, 720 problems` |
| `ops_check2.js` | — | 0 | 4 s | `1728 cabinets, 85152 hinge/pin holes, 0 problems` |
| `fuzz_check.js` | `src/lib/engine.js` | 0 | 2 s | `fuzz done, problems 0 {}` (4000 random cabinets and constructions) |
| `legs_check.js` | — | 0 | 3 s | `1092 cabinets, 9720 legs checked, 0 problems` |
| `fronts_check.js` | — | 0 | 3 s | `3000 cabinets, 10591 stacked fronts checked, 0 problems` |
| `post_check.js` | — | 0 | 2 s | `3312 programs, 13920 markings as Ø5×2 "L", 3564 cam bolt bores at Z=-31.906, 0 problems` |
| `geom_check.js` | — | 0 | 6 s | `72 cabinets, 2960 connector holes checked, 0 problems` |

**`ops_check.js` fails in the snapshot as delivered.** Re-running its loop with the problems classified: all 720 are `PROG …NEPROGRAMUOTA` (288 KAIRE + 288 DESINE + 144 NUGARA) on the 2100 / 2300 high cabinets with a confirmat-fixed back — the M-07 limitation that `align_check` itself lists as "still not machinable". There are **zero** OUTSIDE / TOO DEEP / TOUCHES / PLATE MISMATCH / PINS failures. The test's last assertion ("every new hole gets drilled") is stale relative to the engine. For the regression suite, either baseline it at exactly 720 or filter M-07 on parts longer than 900.

Other tests run for completeness:

| Test | Args | Exit | Output |
|---|---|---|---|
| `ball_check.js` | engine | 0 | `3000 cabinets, 6281 drawer boxes, 31638 drawer member marks checked, 0 problems` |
| `bottom_inside.js` | engine | 0 | `13728 cabinets with the bottom between the sides, … 524206 edge bores, 524365 seam points checked, 0 problems` |
| `box_check.js` | engine | 0 | `6000 3D constructions, 41044 parts, 223478 edge bores, 223478 seam points, 135 with a hole-clash warning, 0 problems` |
| `box_fronts_check.js` | engine | 0 | `2500 constructions, 6274 fronts, 3566 drawers, 2708 doors, 0 problems` |
| `feet_check.js` | engine | 0 | `2700 feet checked, 0 problems` |
| `geo_check.js` | engine | 0 | `3000 cabinets; problems 0 {}` |
| `led_check.js` | engine | 0 | `2000 cabinets with an LED groove, 944 grooves moved off holes, 0 without room (warned), 0 problems` |
| `under_check.js` | engine | 0 | `3000 cabinets, 2539 undermount drawer boxes, 64426 box bores checked, 0 problems` |
| `clash_check.js` | engine | 0 | statistics only, asserts nothing (`3000 Object`) |
| `side_check.js` | engine, room.js | 0 | `400 rooms, 1200 side panels added …, 0 problems` |
| `openings_check.js` | engine, room.js, drawings.js | 0 | `300 rooms, … 0 problems` |
| `sheet_overflow_check.js` | engine, room.js, drawings.js | 0 | `5 big cabinets, 40-cabinet wall: 0 problems` |
| `warn_en_check.js` | engine | **1** | `ENOENT: /test/index.html` — it reads `../index.html` to extract `WARN_EN`; the file now lives at `legacy/index.html`. Path problem, not an engine fault. |
| `drawings_check.js` | engine, room.js, drawings.js, out | not run | belongs to the drawings slice |

`ref_cnc.js` is the frozen reference engine (offer app CNC module) used by `compare_ref.js`. `test/engine/rep/` holds report comparison tools. The `*.py` files are UI drivers for the legacy page, not engine tests.

### What the tests teach about calling the engine

- All build with `E.buildCabinet(c, 0, 'P')` on bare objects — only `W, H, D, thick, cnc, sections` are needed; everything else defaults.
- They accept W-019 (`/didesnė už fasadų zoną/`) as "invalid layout, skip".
- Geometry checks use the `place` formula of §1; alignment tests prove that every edge bore meets a face hole of the same joint within 0.6 mm.
- Legacy `back:'top'` / `'groove'` are still used in tests and mean "solid back on the back".

---

## 10. Gotchas the new UI must absorb

1. **`buildCabinet` mutates the definition** (`c.cnc`, `c.cnc.rails`, `c.box`). Pass a clone if the stored project must stay minimal, or accept that defaults get written back.
2. **`R` is global**; apply settings before building; never mix rule sets.
3. **No severity, no codes, no field pointers** in warnings; matching is by Lithuanian text. Build a classifier from §5 (regex on the fixed parts) and keep a test that every engine message is recognised.
4. **Per-part warnings are invisible until `programs(p)` is called.** A complete check of a cabinet = `buildCabinet` warnings + `programs(p).warnings` for every panel.
5. **Hinge drilling is off by default** (`cnc.hinges:false`) and every door section then reports W-027; pins default `'off'`.
6. **Front edging is empty unless `edge.facade` is set**; carcass edging falls back to the placeholder name `'KRAŠTAS'`.
7. **Sections are bottom-up, `frontH` is top-down.**
8. `cols` silently clamps to 4, `colW` silently rescales or is ignored, `col` silently clamps, unknown `kind` silently makes nothing, unknown `joinery` silently becomes confirmat, `back:'hdf'` silently means a solid back. Validate these before the engine.
9. Not validated by the engine at all: negative or absurd `thick`; `rail` longer than the cabinet for TANDEM / TANDEMBOX; `nDrawers` / `nDoors` upper bounds; `legH:0` (means 100); section heights that do not fill the zone (empty space without a warning).
10. A single door with `hingeSide:'auto'` hangs on the **right**; three doors side by side cannot all be hinged without a partition (W-059).
11. `tbFront:'hole'` needs a Ø10 drill in the settings or the fronts are NEPROGRAMUOTA.
12. Tall cabinets (side > 900) with a solid back fixed by confirmats cannot be fully machined (W-088 + M-07); the fix is `backFix:'cam'`.
13. Dimensions are not rounded (thirds like 236.333 appear in part sizes and programs).
14. `extras` (plinth, side panels, free parts) and the worktop are not engine panels; the app merges them into the part list.
15. Early-return results lack `fgaps` / `shelfInfo` / `visual.leds`; guard for that.
16. Part identity inside a cabinet is `panel.key` (`ROLE + running number`): it shifts when parts are added or removed, and `ebEdit` is keyed by it.
