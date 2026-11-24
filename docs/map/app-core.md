# app-core — texts, state, data model, storage, engine bridge

Slice: `src/lib/app.js` lines 1–815 (+ `legacy/cloud.js`, `legacy/locks.js`, and the few lines elsewhere in `app.js`
that define fields this slice persists). All `file:line` references are to `src/lib/<file>`.
Runtime facts marked **[probed]** were checked in the live snapshot (`http://127.0.0.1:8765/legacy/`, `window.__dbk`).
Verification pass 2026-11-24: every line of the slice, `cloud.js` and `locks.js` was re-read against this report; the `T` appendix was
machine-compared with the source (948 keys, both languages, values and line numbers all match); the data shapes, the legacy-back loss (§9.1)
and the `S.ro` behaviour were re-probed in the live snapshot. See §11 for the compatibility checklist a new version must honour.
Second independent pass (same day): slice re-read line by line, `T` key set re-parsed (948 = 948, appendix complete), all `S.*` fields in
`app.js` matched against §4, `__dbk` keys and storage keys re-grepped, and the ten presets rebuilt live (results in §5.6).

Contents

1. Slice map (what sits where)
2. Persisted data model (project → cabinet → cnc / sections / extras / box …, layout, settings, libraries, versions)
3. Storage: keys, formats, save pipeline, migration, versions, read-only flag, `__dbk` hooks, cloud, locks
4. The global UI state object `S`
5. Pipeline: cabinet record → engine → programs → project part list
6. Normalisation and invariants (what the code silently fixes)
7. Glossary LT ↔ EN and feature inventory (from `T`)
8. Pure logic vs DOM-bound (reuse map)
9. Gotchas and pain points found in this slice
10. Appendix: the full `T` table (948 keys)
11. Compatibility checklist for a new version (printed just before the appendix)

---

## 1. Slice map

`app.js` is one IIFE (`(function () { "use strict"; … })()`, app.js:7–3226). Everything is a closure-private function; the only
exports are `window.__dbk` (app.js:3225) and the hook call `window.__dbkOnStore` (app.js:333).

| Lines | What | Notes |
|---|---|---|
| 9 | module handles | `E = window.DBEngine`, `X = window.DBExport`, `Z = window.DBZip`, `SK = window.OfferSketch`, `ISO = window.DBIso`, `RM = window.DBRoom`, `DR = window.DBDraw` |
| 10–11 | `VERSION = '2.1'`, `IN_ARTIFACT` | `IN_ARTIFACT = !!(window.claude && typeof window.claude.use === 'function')` — only changes how downloads are offered (app.js:2346, 3188, 3192); `VERSION` is shown in Settings (app.js:2532) and stamped into the report workbook (`'v20-kurejas-' + VERSION`, app.js:3150) |
| 14–310 | `T = { lt:{…}, en:{…} }` | 948 keys per language, exactly the same key set in both **[probed by parsing]**. lt: lines 16–161, en: lines 164–309 |
| 311–316 | generated keys | `jk_partB1..3`, `jk_partT1..3`, `jk_partF1..3`, `jk_partR1..3`, `jk_backP1..3` (per-partition joint labels) added to both languages at load → 963 keys at run time |
| 317 | `t(k)` | `T[S.lang][k]` → fallback `T.lt[k]` → fallback the key itself |
| 320–340 | helpers | `esc`, `clone`, `uid`, `num`, `fmt`, `store`, `saveFailed`, `getPath`, `setPath` |
| 343–357 | `RULE_DEF`, `TYPES`, `defSettings()` | |
| 358–362 | `newSection(kind)` | |
| 364–385 | columns | `colsOf`, `colOf`, `colWidths`, `legacyBack`, `fixCols`, `colName` |
| 386–401 | `cncFor(type)`, `newCabinet(type)`, `wtDefault()` | |
| 402–427 | `PRESETS`, `fromPreset(pr)` | |
| 430–443 | `S` + `normSettings` IIFE | |
| 444–456 | `drillList`, `applyRules()` (called once at load) | pushes settings into the engine's global rule table `E.R` |
| 457–476 | `normCab(c)` | the one cabinet migration/normalisation function |
| 477–484 | `sample()` | example project `PAVYZDYS` |
| 485–494 | `migrate` IIFE + start-up restore | old `dbKurejas.projects` → `dbKurejas.lib`; reopen last project, tab, cabinet |
| 496–501 | project library | `lib`, `libSet`, `libRec`, `libTimer`, `libSave` |
| 505–536 | cabinet library | `CL_CATS`, `clib`, `clibSet`, `clibClean`, `clibCat`, `clibRec`, `clibAdd`, `clibSync`, `clibIcon`, `viewLib` |
| 542–593 | `VER` | versions in IndexedDB |
| 595–646 | versions dialog | `VD`, `verOpen`, `verClose`, `verRec`, `verPaint`, `verClick` |
| 647–666 | `save`, `openProject`, `newProject` | |
| 667–684 | ReportLists template | `dbKurejas.reportTpl`, `b64ToBytes`, `bytesToB64`, `loadTemplateFile` |
| 685 | `cur()` | `S.proj.cabinets[S.sel]` |
| 688–735 | engine bridge | `projName`, `engineDef`, `buildOne`, `dedupe`, `level`, `buildProjectAll` |
| 738–776 | `WT_MAX`, `worktopPieces()` | |
| 779–798 | `ico(kind)` | inline SVG pictograms (54×54 viewBox) for presets + `conf`, `cam` |
| 801–814 | shell | `app = #app`, `DBLook.on(...)` redraw hook, `langBtns`, `clampNotes` |
| 815– | `render()` | (next slice; summarised in §5.1 because it drives the pipeline) |

Script order in `legacy/index.html` (index.html:14246–14251): app code → `workshop-auth.js` → `/hub/shared/notices.js` →
`cloud.js` → `/hub/shared/project-lock.js` → `locks.js` → `/hub/shared/back.js`.

---

## 2. Persisted data model

Everything persisted is plain JSON. IDs are `uid()` = `Math.random().toString(36).slice(2, 9)` (7 base-36 chars, app.js:322).
There is **no schema version bump mechanism**: `v:1` is written and never read. Migration = `normCab` on every open.

### 2.1 Project (`S.proj`, key `dbKurejas.current`, and `data` of a library record)

Created by `newProject(name)` (app.js:666), `sample()` (app.js:478), `fromOffer(d)` (app.js:3117), import of an own `.json`
(app.js:3105), a version restore/copy (app.js:634–643), `locks.js` copy.

| Field | Type | Default | Meaning | Read by |
|---|---|---|---|---|
| `app` | string | `'db-kurejas'` | file signature: import accepts a JSON as own project only when `d.app === 'db-kurejas' && Array.isArray(d.cabinets)` (app.js:3109), otherwise treats any `{cabinets:[]}` as an offer-app export | `importFile` |
| `v` | number | `1` | never read | — |
| `id` | string | `uid()` | library key, IndexedDB versions key (`pid`), cloud row id, lock id | lib, VER, cloud.js, locks.js |
| `name` | string | typed on the start screen | goes through `E.safeName` into every program / part / file name (`projName()`, app.js:688). Empty name is allowed but flagged (`ckName`) | engine, export, UI header (`data-bind="p.name"`) |
| `cabinets` | Cabinet[] | `[]` | order = cabinet number (`nr = index + 1`), which is baked into part names | everything |
| `updated` | ISO string | set in `save()` (app.js:653) | "newest wins" merge key in cloud.js; shown as "changed … ago" | cloud.js, locks.js, home list |
| `layout` | object, optional | created lazily by `DBRoom.ensure(proj)` | the room (see §2.9). Created as a **side effect** of opening the Baldai tab, the Drawings tab, adding a side panel, or of `worktopPieces()` when any cabinet has a worktop (app.js:740, 2179, 2675, 2987) | room.js, drawings.js, realistic.js, `worktopPieces`, `fromPreset` (panel height = `layout.roomH`) |
| `look` | object, optional | absent | per-material appearance for the 3-D / front views: `{ [materialName]: { tex?: 'data:image/(png\|jpeg\|webp\|gif);base64,…', color?: '#rrggbb', mm?: number>0, rot?: true } }`. Sanitised on every `openProject` (app.js:660–662): entries with neither a valid `tex` nor `color` are dropped; if `look` is not an object it is deleted. Photos are stored **inside the project JSON** (localStorage weight!). The cloud strips `look` from versions (`slimVer`, cloud.js) | look.js (`DBLook.set(S.proj.look)` each render, app.js:825), front.js, realistic.js |
| `pricing` | object, optional | absent | admin-only project costs: keys written through binding `pp.<key>` (app.js:2738), read: `montavimas` (installation €), `delivery` (app.js:2080). Values number or `''` | `priceProject` |

**[probed]** A fresh project is exactly `{"app","v","id","name","cabinets","updated"}`; `layout` appears after the first render that needs it.

### 2.2 Cabinet (`proj.cabinets[i]`)

Constructors: `newCabinet(type)` (app.js:393), `fromPreset(pr)` (app.js:414), library copy (`libadd`, app.js:2915), `fromOffer`.
Every cabinet passes through `normCab` (app.js:457) on `openProject` and at start-up.

| Field | Type | Default (`newCabinet`) | Meaning | Read by |
|---|---|---|---|---|
| `id` | string | `uid()` | key of `layout.items`, undo records, library link, drawings filter `'c:'+id` | room, app |
| `name` | string | `''` | free label; when empty the UI shows `typeName(c)`. Part names get `_<safeName(name)>` after the cabinet number (engine.js:317) | engine, export, UI |
| `kind` | `undefined` \| `'box'` \| `'panel'` | absent | absent = a regular kitchen cabinet; `'box'` = "3D konstrukcija" built board by board (`c.box`); `'panel'` = a loose board ("Plokštė") | engine (`buildCabinet` dispatches `buildBox` for box, engine.js:314), every view |
| `type` | `'PASTATOMOS'` \| `'PAKABINAMOS'` \| `'ŪKINĖ'` | `'PASTATOMOS'` | base / wall / tall. Decides the construction defaults via `cncFor(type)`; engine uses it for visible-edge rules (engine.js:331). Changing it in the editor rewrites `cnc.joinery/top/back/backFix/topOverFacade/legs/rails/backs/backMount` from the type defaults (app.js:2745–2747) | engine, room (`level()`), `cabKind`, library category |
| `hang` | `true` \| `false` \| absent | absent | set in the Baldai tab ("Kabo ant sienos"). `true` forces no legs/feet in `engineDef` (app.js:693) and makes the cabinet a wall cabinet whatever `type` says; `false` forces floor-standing. `cabKind(c)` (app.js:1000): `hang===true → 'PAKABINAMOS'`; else if `hang===false` or type is not wall → by height (`H > 1000 → 'ŪKINĖ'` else `'PASTATOMOS'`); else `type` | engine, room.js `level()`, `cabKind` |
| `W`, `H`, `D` | number (transiently the typed string, e.g. `"600-18"`, between `input` and `change` — §11.3) | 600, 720, 560 | **outer carcass size in mm, without legs, fronts or worktop** (`s1l`). For a panel: `W` = board thickness along the wall, `H` height, `D` depth | all |
| `thick` | number | 18 | carcass board thickness (panel: `= W`) | engine |
| `cols` | 1–3 | 1 | number of columns = partitions + 1; forced 1 for a dishwasher (`colsOf`) | engine |
| `colW` | number[] | `[]` | outer column widths to the partition centres, length = `cols` when `cols > 1`, else `[]`. The last one is always recomputed as "the rest" (`colWidths`) | engine |
| `dishwasher` | bool | false | "Indaplovės fasadas": the cabinet is only a front (no carcass, no programs) | engine, UI |
| `dishWidth` | number | 600 | width used instead of `W` when `dishwasher` (`engineDef`: `d.W = d.dishWidth \|\| d.W`) | engine, room, library |
| `legH` | number | 100 | leg height (only meaningful when `cnc.legs` and not `cnc.feet`; feet are fixed 10 mm, `E.R.feet.h`) | engine `legHeight` (engine.js:1758) |
| `mat` | `{ carc, facade, back, top?, drawer? }` strings | new cabinet copies the **last cabinet's** `mat` (app.js:396), else all `''` | material names (free text, autocomplete from settings + project). `facade` falls back to `carc`, `back` → `carc`, `top` (a full top "STOGAS" in its own board) → `carc`, `drawer` (MERIVOBOX base/back 16 mm) → `carc` (engine.js:322) | engine, export, pricing, look |
| `edge` | `{ carc, facade }` strings | copies the last cabinet's, else `''` | edge-band material names. Empty `carc` still bands the standard edges, named `'KRAŠTAS'` (engine.js:323) | engine |
| `cnc` | object | `cncFor(type)` | construction + operations, §2.3 | engine |
| `sections` | Section[] | `[]` | §2.5. Empty for dishwasher, panel, box | engine |
| `extras` | Extra[] | `[]` | extra cut-only parts incl. plinth and side panels, §2.6 | `buildProjectAll`, engine (plinth, side panels), room |
| `worktop` | object | `wtDefault()` merged with the last cabinet's `{mat, T, over, edge, on}`; `on` only carried over for `PASTATOMOS` | §2.7 | `E.worktopOf`, `worktopPieces` |
| `vis` | `{ L, R, B }` bools | added by `normCab`: all false | visible left / right side and (hung cabinets only) visible bottom → cut from the front material with the front edge (engine.js:329–332) | engine |
| `leds` | Led[] | added by `normCab`: `[]` | LED profile grooves, §2.7 | engine |
| `shelfSb` | number/string, optional | absent | shelf set-back from the carcass front, mm (absent → engine rule `E.R.shelf.setback` = 20; `0` = flush). `engineDef` turns `"-5"`/`"5"` into `5`, deletes blank (app.js:695); engine clamps 0–150 (engine.js:311) | engine |
| `ebEdit` | `{ [partKey]: { y0?, y1?, x0?, x1?: bool, fac?: true } }`, optional | absent | per-part hand-edited edge banding (part key = part name without the `<proj>_<nr>[_<name>]_` prefix); `fac:true` = "visible part — edges as the fronts" (label `PAGAL FASADA`) (engine.js:151, 334; app.js:3024, 3047) | engine |
| `pe` | `{ e1, e2, e3, e4 }` bools | panel only: all true | panel edges: `e1` L1 front, `e2` L2 back, `e3` W1 bottom, `e4` W2 top (`pnE1..4`) | engine (panel) |
| `box` | object | box only | §2.8 | engine `buildBox` |
| `libId` | string, optional | absent | this cabinet is **linked** to cabinet-library item `libId`: every later edit overwrites the library copy (`clibSync`, 300 ms after `save`). Removed by `libunlink`, on duplicate (`dup`, app.js:2903), when the library item is deleted | `clibSync` |
| `libFrom` | string, optional | absent | provenance only: the library item this free copy came from. Never read | — |

**[probed] full default record** (preset "Aukšta su orkaite", abridged):
`{"id","name":"","type":"ŪKINĖ","W":600,"H":2100,"D":580,"thick":18,"cols":1,"colW":[],"dishwasher":false,"dishWidth":600,"legH":100,"mat":{"carc":"","facade":"","back":""},"edge":{"carc":"","facade":""},"cnc":{…§2.3},"sections":[…],"extras":[],"worktop":{"on":false,"mat":"","T":38,"over":20,"left":0,"right":0,"edge":""}}`
(`vis`, `leds` appear only after `normCab`, i.e. after the project is reopened — a freshly created cabinet does not have them.)

### 2.3 `cabinet.cnc` (construction, joints, operations)

`cncFor(type)` (app.js:386–392) builds it from `S.settings.types[type]` + `S.settings.ops` + `S.settings.railW`.
The engine merges its own defaults underneath (`cncDefaults`, engine.js:267–273) and calls the object `o`.

| Field | Type / values | Default | Meaning | Where set |
|---|---|---|---|---|
| `joinery` | `'confirmat'` \| `'cam'` (\| `'dowel'` per joint) | type default (`confirmat` for all three) | main carcass joinery — "used for every joint you have not changed" (`jMainL`) | step Konstrukcija |
| `joints` | `{ [jointKey]: JointSpec }` | `{}` | per-joint overrides, §2.4 | 3-D joint editor (`setJoint`, app.js:2606), joint table |
| `top` | `'rails'` \| `'full'` | base: `rails`; wall, tall: `full` | top made of tie rails (surišimo juostos) or a full top board (STOGAS) | |
| `topMount` | `'inside'` \| `'over'` | absent (engine: `over` unless `'inside'`) | a full top between the sides or on the sides. Coupled rules in `assign` (app.js:2762–2763) | |
| `topOverFacade` | bool | false | the full top covers the fronts | |
| `topOvF`, `topOvS`, `topOvB` | mm ≥ 0 | absent → 0 | top overhang at the front (past the fronts when `topOverFacade`), both sides, back (engine.js:1058) | |
| `back` | `'none'` \| `'top'` \| `'inside'` | type default, but `'hdf'` is stored as `'top'` | **legacy** single back field; kept in the record, superseded by `backs` + `backMount`. The engine only falls back to it when `backs[k]` is missing (engine.js:385–386) | type change |
| `backs` | `('none'\|'hdf'\|'solid')[]` length = `cols` | `[legacyBack(typeDefault)]` | back **per column**: none / fibreboard (plaušas, HDF 3 mm nailed on) / solid 18 mm | step Sekcijos, `fixCols` |
| `backMount` | `'top'` \| `'inside'` | `'inside'` if type default back is `'inside'` else `'top'` | where a solid back goes: on the back edges ("Išorėje") — only valid when **every** column has a solid back (`bTopOnlyAll`) — or inside each column | |
| `backFix` | `'confirmat'` \| `'cam'` \| `'dowel'` | type default (`confirmat`; tall: `cam`) | how the back is fixed (texts `bFix_*`) | |
| `backJoint` | — | **not stored** | pseudo-binding: sets joint type for keys `back`, `backP1..` via `setJoint` (app.js:2758) | |
| `backInset` | mm | absent → 0 | an inside back set forward from the sides' rear edge (engine.js:410) | drag in side section (app.js:2825) |
| `backCover` | `{ bottom?, top? }` bools | absent | an inside back covering the bottom / the top or back rail (`bcBotCov`, `bcTopCov`, `bcRailCov`) (engine.js:413) | |
| `bottom` | `'under'` \| `'inside'` | absent → under | bottom under the sides or between them | |
| `bottomZ` | mm | absent → 0 | with `bottom:'inside'`: height of the bottom above the sides' lower edge (clamped to `H − 200`, engine.js:370) | |
| `bottomD` | mm | absent → full depth | shorter bottom (pipes behind), measured from the front; min 100 (engine.js:397) | `data-bind="c.cnc.bottomD"` |
| `sideFull` | — | **not stored** | pseudo-binding "full-height sides": sets `bottom:'inside'|'under'`, `bottomZ:0`, `topMount` (app.js:2760) | |
| `camOut` | `{ back?, bottom?, top?: bool }` | absent | cams on the outer face of that board instead of the inner (`camPickT`) (app.js:2999, engine.js:393) | |
| `ebBack` | bool | absent | band the unseen back edges of sides/bottom/top too (engine.js:337) | |
| `rails` | `{ front:'h'\|'v'\|'none', back:'h'\|'v'\|'hv'\|'none', bottom:bool }` | from type: `front:'h', back:'h', bottom:false` | tie rails (only with `top:'rails'`): h = flat (gulsčia), v = standing (stati), hv = both; `bottom` = standing rail on the bottom at the back | |
| `railW` | mm | `S.settings.railW` (100) | rail width | |
| `legs` | bool | type default (wall: false) | has supports at all | `support` pseudo-binding |
| `feet` | bool | absent | supports are Ø15 feet (pėdutės) under the sides instead of legs (kojelės) | `support` |
| `support` | — | **not stored** | pseudo-binding `'legs'\|'feet'\|'none'` → `legs`, `feet` (app.js:2764) | |
| `legsX` | 2–6 \| `'parts'` | absent → 2 | legs in a row across the width, or `'parts'` = at both sides and under every partition; `fixCols` resets `'parts'` to 2 when no partitions remain (app.js:383) | |
| `legsY` | 2 \| 3 | absent → 2 | rows front/back (+ middle) | |
| `facadeT` | mm | 18 | front thickness | |
| `fg` | `{ l?, r?, mid?, top?, bot? }` mm or `''` | absent | front gaps; blank = engine rule (`E.R.facade`: side 3, between 3; top 5 **[probed `r.fgaps`]**). `bot` may be negative (fronts below the carcass) | drag handles on the front picture, fields `fg*` |
| `runnerMarks` | bool | `settings.ops.runnerMarks` (true) | drill runner marks in the sides | step Operacijos |
| `tbFront` | `'mark'` \| `'hole'` \| `'off'` | `settings.ops.tbFront` (`'mark'`) | TANDEMBOX front fixing: Ø5×2 marks, Ø10×12 holes, or none. Old booleans are migrated (app.js:461; engine.js:270: `true→'hole'`!) | `tbOn` pseudo-binding |
| `tbPrev` | string | absent | remembers the last non-off `tbFront` while switched off (app.js:2743) — UI memory that is persisted | |
| `hinges` | bool | `settings.ops.hinges` (true) | drill hinge cups + plate marks | |
| `hingeFix` | `'screw'` \| `'press'` | `'screw'` | screw-on (+2 marks Ø5×2) or press-in (+2×Ø8) cup | |
| `pins` | `'shelf'` \| `'row'` \| `'off'` | `settings.ops.pins` (`'shelf'`) | shelf-support holes: under each shelf only / a row ±2 at 32 mm / none. `pinsOn` is a pseudo-binding (app.js:2744) | |

### 2.4 `cnc.joints[key]` (per-joint connector override)

```
JointSpec = { type:'confirmat'|'cam'|'dowel', pos?:number[] /* mm along the joint, 0.1 precision */, n?:number, e?:number }
          | { L: JointSpec, R: JointSpec }        // left and right side differ
```
* Written by `setJoint(c, key, patch)` (app.js:2606–2614): `patch = { side:null|'L'|'R', type, pos|null }`. `side:null` → one
  entry for both sides; a side patch splits into `{L,R}`; two identical sides collapse back into one entry.
* Read by the engine: `o.joints[key] = { type, n, e, pos }` or `{ L:{…}, R:{…} }` (engine.js:571, 603). `n` = count, `e` = distance of
  the outer connectors from the edge (older table UI: `jN`, `jE`); `pos` = hand-placed positions (marks the joint "placed by hand / unverified").
* Keys (labels `jk_*`): `bottom`, `top`, `railF`, `railB`, `railV`, `railBottom`, `railVH`, `railBotB`, `back`, `shelf`, `oven`, `part`,
  and per partition n = 1..3: `partB{n}`, `partT{n}`, `partF{n}`, `partR{n}`, `backP{n}`. The engine returns the live list as `r.joints[]`
  (each `{ key, label, dflt, w, type, pos, dowels, n, e, manual, custom, defPos, defN, defE, minGap, minEdge, split, single, sides:{L,R} }` **[probed]**).
* Undo for joints / box: `S.undo` stack of `{ id, joints, box }` snapshots, max 40 (app.js:2597).

### 2.5 Section (`cabinet.sections[i]`)

`newSection(kind)` (app.js:358–362). `normCab` fills every missing field from `newSection(s.kind || 'doors')`.
Sections of one column are listed **top of the cabinet first** (`s2l`); each belongs to a column `col`.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `id` | string | `uid()` | |
| `kind` | `'drawers'` \| `'doors'` \| `'cargo'` \| `'open'` \| `'oven'` | arg | Stalčiai / Durys / Cargo (pull-out) / Lentynos (open shelves, niche) / Orkaitė |
| `col` | 0–2 | 0 | column index, clamped by `colOf` |
| `colWant` | number, optional | absent | set by `fixCols` when the section's column was removed: the section moves to the last column and returns to `colWant` when the partition comes back (app.js:379–382) |
| `fill` | bool | `true` unless drawers/oven | "Likęs": takes the remaining height of its column |
| `height` | mm | drawers 540, oven 595, else 400 | section height (ignored when `fill`) |
| `nDrawers` | int | 3 | drawers in the section |
| `hw` | string | `'BLUM TANDEMBOX'` | drawer system; options `E.DRAWER_HW` = `BLUM TANDEM`, `BLUM TANDEMBOX`, `BLUM MERIVOBOX`, `GTV KULKINIAI H45`, `DTC KULKINIAI H45`, `DTC PASLĖPTI` **[probed]** (`E.R.runner` also knows `GUOLINIAI`, `KT. PASLĖPTO MONTAVIMO` from the offer app) |
| `rail` | mm | 500 | runner length; snapped to the nearest length the chosen `hw` offers when `hw` changes (app.js:2748) |
| `mvH` | `'N'\|'M'\|'K'\|'E'` or absent | absent = auto | MERIVOBOX side height |
| `mvExt` | `'rail'` \| `'boxcap'` | absent = rail | MERIVOBOX E extension: gallery railing or BOXCAP |
| `nDoors` | 1 \| 2 | doors: 2, else 1 | |
| `doorSplit` | `'v'` \| `'h'` | `'v'` | doors side by side (`sSide`) or stacked (`sStack`) |
| `hinge` | string | `'BLUM LANKSTAI'` | door fitting; `E.DOOR_HW` = `BLUM LANKSTAI`, `BLUM TIP-ON`, `KT. LANKSTAI`, `BE FURNITŪROS` (none) **[probed]** |
| `hingeSide` | `'auto'` \| `'left'` \| `'right'` | `'auto'` | |
| `hingeN` | `''` \| 2–5 | absent | hinges per door, blank = by door height (`E.hingesPerDoor`: ≤900→2, ≤1500→3, ≤2000→4, else 5) |
| `cargoHw` | string | `'CARGO DTC PURE PRO'` | cargo fitting (`E.CARGO_HW`, one entry) |
| `shelves` | int | oven 2, open 2, else 1 | shelf count (oven: support count) |
| `shelfAdj` | bool | true | adjustable (on pins) vs fixed (with connectors) |
| `shelfMode` | `'even'` \| `'manual'` | `'even'` | |
| `shelfPos` | number[] | `[]` | heights from the section bottom to the shelf middle; any value > 0 makes placement manual (engine.js:519) |
| `divider` | bool | `true` for `open` | dividing shelf between a niche and fronts next to it |
| `frontH` | `{ [index]: mm }` or array | absent | height of each stacked front **from the top** (index 0 = top); blank ones share the rest (`E.splitFronts`, engine.js:292). Reset by `fhreset` |
| `frontDrop` | mm | absent | doors reach lower, over an open niche below (engine.js:490) |
| `fridge` | bool | absent | integrated fridge section: only valid on `kind:'doors'`; forces `doorSplit:'h'`, `hinge:'BE FURNITŪROS'`, `shelves:0`, `nDoors` 1 or 2; unticking restores `doorSplit:'v'`, `hinge = prevHinge || 'BLUM LANKSTAI'`, `shelves:1` (app.js:2755–2757; `normCab` app.js:468 removes `fridge` from any other kind) |
| `prevHinge` | string | absent | UI memory of the hinge before `fridge` was ticked (persisted) |
| `innerDrawers` | number | absent (only from the offer import) | not supported: engine only warns (engine.js:472, 477) |

### 2.6 Extra part (`cabinet.extras[i]`)

Cut-only parts (no holes, no programs). `normCab` keeps only object entries. Turned into "loose" parts by `buildProjectAll` (§5.3).

| Field | Type | Meaning |
|---|---|---|
| `name` | string | part name (`'DETALE'` when empty) |
| `kind` | absent \| `'plinth'` \| `'side'` | plain extra / plinth (cokolis; also recognised by name `/cokol\|plint/i`, app.js:978, engine.js:1203) / side panel standing against the cabinet side |
| `L`, `W`, `T` | mm | length, width, thickness (`T` blank → cabinet `thick` → 18). Side panel: `L` = height, `W` = depth |
| `qty` | number \| `''` | blank → 1; `0` → not made (warning `kiekis 0 — nepridėta`) |
| `mat` | string | blank → cabinet `mat.carc` |
| `edgeMat` | string, optional | edge material; default: cabinet front edge when `mat === mat.facade`, else carcass edge (app.js:727) |
| `e1`, `e2`, `e3`, `e4` | bool | banded edges: `e1`,`e2` = long edges (L1, L2), `e3`,`e4` = short edges (W1, W2) → `eb1..eb4` |
| plinth: `between` | bool | plinth between the sides (vs under the carcass) |
| plinth: `yf` | mm | set-back from the carcass front (20 inside / 50 under by default, app.js:3005) |
| plinth: `gl`, `gr`, `gt`, `gb` | mm | "fitted by gaps" (left, right, to the bottom, from the floor): when present, `L`/`W` are **overwritten on every render** from the engine's computed plinth (app.js:827–829) |
| side: `side` | `'L'` \| `'R'` \| `''` | which side it stands on; `''` = imported from the offer, not placed yet |
| side: `fit` | `''` \| `'cab'` \| `'floor'` \| `'room'` | auto-height mode (as the cabinet / down to the floor / floor to ceiling); `DBRoom.refit` rewrites `L`, `zb` when the room changes; typing `L` or `zb` by hand clears `fit` (app.js:2742) |
| side: `zb` | mm | bottom relative to the carcass bottom (negative = lower) |
| side: `yf` | mm | how far its front stands ahead of the carcass front (default front thickness) |

### 2.7 Worktop, LEDs

`cabinet.worktop` (`wtDefault()`, app.js:401; engine `worktopOf`, engine.js:1910):

| Field | Default | Meaning |
|---|---|---|
| `on` | false | this cabinet has a worktop |
| `mat` | `''` | worktop material (required when `on`: check `ckWt`) |
| `T` | 38 (`E.WT_DEF.T`) | thickness |
| `over` | 20 | overhang past the fronts |
| `left`, `right` | 0 | overhang past the left / right side |
| `edge` | `''` | edge band material (front, and ends that overhang) |

`E.worktopOf(c)` → `null` or `{ mat, edge, T, over, left, right, L: W+left+right, W: D+facadeT+over, x0, x1, y0, y1, z0: H, z1: H+T }` in cabinet coordinates.

`cabinet.leds[i]` (normalised in `normCab`, app.js:470–471; created by `ledadd`, app.js:2918):
`{ at:'bottom'|'top'|'L'|'R', side:'in'|'out', from:mm (default E.R.led.from = 30), ends:'open'|'closed', w:mm (16), depth:mm (8) }`.
Entries with any other `at` are dropped.

### 2.8 Box construction (`cabinet.box`, `kind:'box'`)

`E.boxDefaults(c)` (engine.js:1310): 
```
box = {
  boards: { bottom|top|left|right|back|front: { on:bool (front: false), inset:mm, T:mm|'' } },
  cover:  { 'a_b': 'a'|'b' },      // which board covers the other's end at a corner; key = the two ids sorted and joined by '_'
  inner:  [ { id:int, kind:'part', x:mm, T?, setback? } | { id:int, kind:'shelf', z:mm, col:int, adj:bool, T?, setback? } ],
  fronts: [ { id:int, kind:'doors'|'drawers'|'cargo', col:int, cell:int, span:int≥1, inset:bool,
              nDoors?, hinge?, hingeSide?, hingeN?, nDrawers?, hw?, rail?, cargoHw?, mvH?, mvExt? } ]
}
```
`engineDef` coerces `boards[*].inset/T` and `inner[*].x/z/col/setback/T` to numbers (app.js:698–701). A box never has legs/feet (`normCab`, app.js:473).

### 2.9 Room layout (`proj.layout`) — owned by room.js, summarised

`DBRoom.ensure(proj)` (room.js:293) creates / repairs it and returns `true` when it changed anything (callers then `save()`).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `walls` | `[{ len:mm }]`, 1–4 | `[{len:3600}]` (first time: sized to the floor cabinets, min 2400) | chain turning clockwise: A right, B down, C left, D up |
| `wallZ` | mm | 1450 | bottom of wall cabinets above the floor |
| `roomH` | mm | 2600 | room height |
| `worktop` | bool | true | show worktops |
| `items` | `{ [cabId]: { wall:int (−1 = not placed), x:mm from the wall start, z?:mm bottom of a wall cabinet } }` | auto-placed | entries of deleted cabinets are removed |
| `openings` | `[{ id, type:'door'\|'gdoor'\|'window', wall, x, w, h, z, hinge:'L'\|'R', swing:'in'\|'out', color:'#rrggbb' }]` | `[]` | doors / windows (room.js:70–91) |
| `points` | `[{ id, type:'socket'\|'socket2'\|'cold'\|'hot'\|'drain', wall, x, z }]` | `[]` | sockets and pipes (room.js:92–104) |

### 2.10 Settings (`S.settings`, key `dbKurejas.settings`) — global for the browser, not per project

`defSettings()` (app.js:345–357) + `normSettings` (app.js:435–443).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `materials` | string[] | `[]` | material name suggestions (one per line in Settings) |
| `edges` | string[] | `[]` | edge-band suggestions |
| `worktops` | string[] | `[]` (added by `normSettings`, **not** in `defSettings`) | worktop suggestions |
| `types` | `{ PASTATOMOS, PAKABINAMOS, ŪKINĖ }` each `{ joinery, top, back, backFix, topOverFacade, legs, railFront, railBack, railBottom }` | base: `confirmat, rails, none, confirmat, false, true, h, h, false`; wall: `confirmat, full, top, confirmat, false, false, h, h, false`; tall: `confirmat, full, top, cam, false, true, h, h, false` | default construction per type; `back` may be `none\|top\|inside\|hdf` |
| `railW` | number | 100 | default rail width |
| `ops` | `{ runnerMarks:true, tbFront:'mark', hinges:true, hingeFix:'screw', pins:'shelf' }` | | default operations for a new cabinet |
| `rules` | object | `RULE_DEF` (clones of the engine's `E.R` groups, app.js:343) | drilling dimensions, pushed into the engine by `applyRules()` |

`rules` **[probed defaults]**:
* `hinge`: `{ cupD:35, cupDepth:13, cupFromEdge:22.5, fromEnd:100, dowelD:8, dowelDepth:11, dowelSpacing:45, dowelOffset:9.5, plateD:5, plateFromFront:37, plateSpacing:32, plateDepth:2 }` (`plateDepth` is forced back to the default on load — plate holes are marks now, app.js:441)
* `pins`: `{ d:5, depth:12, fromFront:37, fromBack:30, below:3, pitch:32, extra:2 }`
* `drillsTop`: `"5, 8, 15, 35"` — drills on the CNC head; holes of other diameters are **not programmed** (`drillsTopL`)
* `tbHole`: `{ d:10, depth:12 }`
* `ball` (ball-bearing runners): `{ up:37, front:35, rear:30, midFrom:450, clear:12.7, boxBelow:22, topGap:10, boxT:0, perLen:"", drawerMarks:true, lengths:[300,400,450,500,550] }`
* `under` (undermount runners): `{ up:37, marks:"37, 165, 229", clearBelow:14, recess:13, shorter:10, ded:"", topGap:10, boxT:0, depthPlus:3, perLen:"", lengths:[250,…,600] }`
* `merivo`: `{ up:33, marks:"37, 261, 293", perLen:"", ded:51, shorter:26, boxShorter:10, t:16, below:24, topGap:10, depthPlus:3, sideH:{N:68.5,M:91,K:129,E:192}, backH:{N:60.5,M:83,K:121,E:184}, lengths:[270,…,600] }`
* `perLen` text format: `"450: 35,195,420; 500: 35,227,470"` (runner length: screw positions).

`applyRules()` (app.js:445–455) first resets the engine to `RULE_DEF`, then applies the user's values group by group with
validation (non-numeric → default kept; `lengths` are never user-editable). It **mutates the global `E.R`** — the engine is not
re-entrant across different settings.

### 2.11 Project library record (`dbKurejas.lib`: array)

`libRec(p)` (app.js:498): `{ id, name, updated, n: cabinets.length, data: clone(project) }`. Array order: the open/just-saved project
first (`libSave` moves it to the front, app.js:501); cloud merges re-sort by `updated` desc.

### 2.12 Cabinet library (`dbKurejas.cablib`)

`clib()` (app.js:506): `{ v:1, items: Item[], cats: string[] }`; default cats `CL_CATS = ['Apatinės','Pakabinamos','Aukštos','Spintos','Kita']` (Lithuanian only, user can add / delete empty ones).

`Item` (`clibRec`, app.js:510–511): `{ id, added:ISO, updated:ISO, cat, name: c.name || typeName(c), W (dishWidth for a dishwasher), H, D, type: 'panel'|'box'|'dish'|cabKind(c), cab: clibClean(c) }`
where `clibClean` = clone without `id`, `libId`, `libFrom`. Default category `clibCat(c)`: panel/box/dishwasher → `Kita`; wall → `Pakabinamos`; tall → `Aukštos`; else `Apatinės`.

Semantics: "☆ Į biblioteką" (`libsave`) → `clibAdd(c)` sets `c.libId` (linked: later edits update the library copy through `clibSync`).
"Add from library" (`libadd`) → `normCab(clone(item.cab) + { id:new, libFrom:item.id })` — a free copy. Deleting an item unlinks all
cabinets of the **open** project only. Search (`viewLib`, app.js:521–536): every word must be found in
`name + cat + typeName + "WxHxD" + "W×H×D" + facade + carcass material`, lower-cased.

### 2.13 Version record (IndexedDB `dbKurejasVersions`, store `p`, keyPath `pid`)

One row per project: `{ pid, list: Version[] }` newest first.
`Version = { at:ms, started:ms, label:string ('' = automatic), why:string ('' | 'prieš atkūrimą' …), name, n, data: clone(project), body: fingerprint }` **[probed]**;
entries merged from the cloud additionally carry `cloud:true` (and have no `look`).

### 2.14 Presets (`PRESETS`, app.js:402–413) — the "What are we building?" picker

| key | label LT / EN | type | W×H×D | sections / flags |
|---|---|---|---|---|
| `pDrawers` | Stalčių spintelė / Drawer cabinet | PASTATOMOS | 600×720×560 | drawers `{fill:true, nDrawers:3}` |
| `pDoors` | Durų spintelė / Door cabinet | PASTATOMOS | 600×720×560 | doors `{fill:true, nDoors:2, shelves:1}` |
| `pDrDoors` | Stalčius + durys / Drawer + doors | PASTATOMOS | 600×720×560 | doors `{fill:true, nDoors:2, shelves:1}`, drawers `{fill:false, height:180, nDrawers:1}` |
| `pWall` | Pakabinama / Wall cabinet | PAKABINAMOS | 600×720×330 | doors `{fill:true, nDoors:2, shelves:2}` |
| `pTall` | Aukšta su orkaite / Tall with oven | ŪKINĖ | 600×2100×580 | drawers `{height:560, nDrawers:2}`, oven `{height:595, shelves:2}`, doors `{fill:true, nDoors:1, shelves:2, hingeSide:'right'}` |
| `pFridge` | Šaldytuvo spinta / Fridge unit | ŪKINĖ | 600×2100×560 | doors `{height:1816, fridge:true, nDoors:2, doorSplit:'h', hinge:'BE FURNITŪROS', shelves:0, frontH:{1:720}}`, doors `{fill:true, nDoors:1, shelves:0, hingeSide:'right'}`; name preset to `Šaldytuvas`/`Fridge` |
| `pDish` | Indaplovės fasadas / Dishwasher front | PASTATOMOS | 600×720×560 | `dish:true` → `dishwasher:true`, name `Indaplovė`/`Dishwasher`, no sections |
| `pEmpty` | Tuščia (lentynos) / Empty (shelves) | PASTATOMOS | 600×720×560 | open `{fill:true, shelves:2}` |
| `pPanel` | Plokštė / Panel | PASTATOMOS | 18×2300×600 | `panel:true` → `kind:'panel'`, no legs, `pe` all true, `thick = W`, `H = layout.roomH` when a room exists, material + edge = the **front material most cabinets use** (app.js:423–424) |
| `pBox` | 3D konstrukcija / 3D construction | PASTATOMOS | 600×720×560 | `box:true` → `kind:'box'`, `box` defaults, no legs |

Note the preset's section order in the array is **top first** in the UI sense as written here; `fromPreset` copies `dishWidth = W`.
`sample()` builds `PAVYZDYS` from presets 0, 2, 3 named `Stalčiai`, `Kriauklė`, `Viršutinė` with example materials (`'LMDP balta 18 (pavyzdys)'` …).

---

## 3. Storage

### 3.1 Keys

| Key | Store | Format | Written by | Notes |
|---|---|---|---|---|
| `dbKurejas.lang` | localStorage | `"lt"` \| `"en"` (JSON string) | `lang` action (app.js:2898) | default `lt` |
| `dbKurejas.settings` | localStorage | Settings (§2.10) | every `s.*` binding (app.js:2725, 2805, 2831, 2864–2865, 3065) | synced to cloud row `builder-settings` |
| `dbKurejas.current` | localStorage | Project (§2.1) — the open project | `save()` (app.js:654), `openProject()` (app.js:664); removed when the open project is deleted (app.js:3087) | read once at load (app.js:433) |
| `dbKurejas.lib` | localStorage | `LibRec[]` (§2.11) — **every project in full** | `libSet` | synced to cloud table `builder_projects` |
| `dbKurejas.cablib` | localStorage | `{ v:1, items, cats }` (§2.12) | `clibSet` | synced to cloud row `builder-cablib` |
| `dbKurejas.ui` | localStorage | `{ id: projectId, tab, sel }` | every project `render()` (app.js:830) — direct `setItem`, no hook | restore after reload; `tab` whitelist `cab, room, res, drw, set` (**`nest` is not restored**, app.js:494) |
| `dbKurejas.reportTpl` | localStorage | `{ name, b64 }` — a user-uploaded ReportLists workbook | `loadTemplateFile` (app.js:679), removed by `tplreset` (app.js:3062) | large; "session only" when storage refuses (`tplSession`) |
| `dbKurejas.projects` | localStorage | legacy `[{ data: Project, saved }]` | never (old versions) | read once by `migrate` (app.js:489) when `dbKurejas.lib` is absent |
| `dbKurejas.pricing` | localStorage | pricing table `PR` (`{ cut, edge, def:{carc,facade,back,top}, mat:{}, edgeMat:{}, hw:{}, q:{…} }`, app.js:1983) | `prSave` | admin prices; local only |
| `dbKurejas.adminPin` | localStorage | hash string of the admin PIN | `adminset` / PIN change (app.js:2936, 2946) | "the lock keeps prices from the workshop screen, it is not security" |
| `dbKurejas.admin` | **sessionStorage** | the same hash while unlocked | unlock (app.js:2939) | `S.admin = session value === stored hash` (app.js:1991) |
| `dbKurejas.paper` | localStorage | `"A3"` \| `"A4"` | `drwpaper` (app.js:2953) | drawings paper |
| `dbKurejas.isoMode` | localStorage | `"both"` \| `"sep"` | 3-D joint editor mode (app.js:2638) | |
| `dbKurejas.cloud` | localStorage | `{ pushed:{ [projId]: updated }, clAt:ms, setAt:ms }` | cloud.js `saveMeta` | sync bookkeeping |
| `dbKurejas.cloudAsked` | sessionStorage | `"1"` | cloud.js `start` | sign-in prompt shown once per tab session |
| `dbKurejasVersions` | **IndexedDB** v1, store `p` | §2.13 | `VER.put` | |
| `dbNestHandoff` | localStorage | `{ name, b64 (.xlsx), at }` | "Open in the Nesting app" (app.js:2303) | read by the Nesting app on the same origin |
| `nestDefaults` | localStorage | Nesting app's own settings (kerf, trim, board size) | read only (app.js:2196) | |
| `dedesBaldai.calc.v1` | localStorage | offer app's price settings | read only (`primport`, app.js:2947) | |
| `dbRR.room` | localStorage | `"1"`/`"0"` | realistic.js:19, 50 | realistic render: show the room |
| `hub.lockdev.v1` | sessionStorage | device id | project-lock.js | |
| (supabase session key), `workshop.lastName`, `hub.gate.v1`, office-PC / idle keys | localStorage | — | workshop-auth.js | shared login with Nesting / ShopFlow |

### 3.2 `store(k, v)` (app.js:333)

* `store(k)` → `JSON.parse(localStorage.getItem(k) || 'null')`; any error → `null`.
* `store(k, v)` → `setItem(JSON.stringify(v))`, then calls `window.__dbkOnStore(k)` (errors swallowed), returns `true`; on any
  exception (quota, blocked storage) returns `false`.
* Callers that check `=== false` call `saveFailed()` (app.js:336): marks `#saved` as `✕ neišsaugota` and, once per page load,
  toasts "storage full — download the project JSON and delete old projects".
* Direct `localStorage.setItem` calls bypass the hook: `dbKurejas.ui`, `dbKurejas.reportTpl`.

### 3.3 Save pipeline (`save()`, app.js:647–657) — called after every edit

1. no project → return.
2. `S.ro` set → `S.roDirty = true; return` (**nothing is written**).
3. `VER.touched()` — marks the project dirty, (re)starts a 60 s idle timer → `VER.flush()` → automatic version.
4. `clibSync` debounced 300 ms (linked library copies follow).
5. If not on the Baldai tab: `S.roomUndo = []` (room undo never steps over edits made elsewhere).
6. `S.proj.updated = now`.
7. `store('dbKurejas.current', S.proj)` — synchronous, **the whole project JSON on every edit**; failure → `saveFailed()`.
8. `libSave` debounced 250 ms → rewrites the **whole library array** with this project first.
9. Flash the `#saved` chip (CSS class `flash`).

`openProject(p)` (app.js:658–665): clone → ensure `id` → `normCab` every cabinet → sanitise `look` → reset UI state
(`home=false, tab='cab', sel=0, part=null, iso=null, undo=[], roomUndo=[], roomSel=null, roomSelId=null, picking = no cabinets, confirm=null`)
→ `store('dbKurejas.current')` → scroll to top. It does **not** call `render()` and does **not** check `S.ro`.
`newProject(name)` = `openProject({ app, v:1, id, name, cabinets:[], updated })` + immediate `libSave()`.

Start-up (app.js:430–494): read lang, settings, current project → `normSettings` → `applyRules()` → `migrate` → if a current
project exists: `normCab` all cabinets, `S.home=false`, restore tab/sel from `dbKurejas.ui` when its `id` matches; else `S.proj=null, S.home=true`.

Project list actions (app.js:3074–3087): `home` (flush `libSave`, show list), `pcreate`, `pimport`, `psample`, `pdup` (clone + new id + name `… (kopija)`),
`pjson` (download `<safeName>_projektas.json`, pretty-printed), `pnew`, `popen` (flush previous project's `libSave` + `VER.flush`), `pver`, `pdel` (two clicks: `S.confirm = 'pdel'+id`).
Import (`importFile`, app.js:3103): own JSON or offer export; a clashing id gets a new id (importing twice = two projects).

### 3.4 Versions (`VER`, app.js:542–593)

* API: `VER.snap(project, label, why)`, `VER.touched()`, `VER.flush(why)`, `VER.all(pid)`, `VER.get(pid)`, `VER.put(pid, list)`.
* `snap`: no-op when the project has no id, or has no cabinets and no label. Fingerprint `body(p)` = two 32-bit string hashes + length of
  the JSON without `updated`. Automatic snap is skipped when the fingerprint equals the newest version's.
  **Rolling quarter-hour:** an automatic snap replaces the newest entry when that entry is also automatic (no label, no why) and
  `now − top.started < 15 min` (keeps `started`); otherwise a new entry is added.
* `prune` (newest first): labelled versions kept forever; unlabelled younger than 48 h kept (max 100); older than 183 days dropped;
  in between, the newest of each calendar day.
* Triggers: 60 s after the last `save()`; `visibilitychange` → hidden; `pagehide`; opening another project / going to a new project
  (`popen`, `pnew`, Back handler); opening the versions dialog; before a restore (`why = t('verBefore')`).
* After each `put`: `window.BuilderCloud.verPush(pid, list)` when present.
* `VER.all(pid)` = local + `BuilderCloud.verPull(pid)` (marked `cloud:true`), de-duplicated by `Math.round(at / 1000)`, entries without `data` dropped, newest first.
* Dialog (`verPaint`, `verClick`): element `#verdlg.drwover.verover`, own click handler with `data-vact` = `close | save | copy | restore`.
  "Save version" (only for the open project) with a name ≤ 60 chars, default label `t('verHand')`. Rows grouped by day (Today / Yesterday / date);
  the row equal to the current state gets badge `kaip dabar`. `copy` → new library project named `<name> (YYYY-MM-DD HH:MM)`;
  `restore` → two clicks (`VD.sure`), first snapshots the current state, then replaces the project keeping the id; a version without `look`
  (cloud) keeps today's `look`. Restore of the open project keeps the current tab.

### 3.5 Read-only flag `S.ro` and `S.roDirty`

* `S.ro` is set **only by locks.js**: `null` (editable) | `{ checking:true }` (lock being asked) | `who` object from ProjectLock (someone else edits / lock lost).
* Effects in app.js: exactly two — `save()` returns early setting `S.roDirty = true` (app.js:649) and `libSave()` returns early (app.js:500). **[probed]** with `S.ro` set, `dbKurejas.current` is not rewritten.
* The UI is **not** disabled: the person can keep editing in memory; edits are saved only if the lock is later granted (`edit()` → `if (dirty) D.saveNow()`), otherwise lost when the viewer follows the editor's newer copy or leaves.
* Not guarded by `S.ro`: `openProject`'s write of `dbKurejas.current`, `libSet` calls from the versions dialog / duplicate / delete, settings and library writes.

### 3.6 `window.__dbk` (app.js:3225) — the hooks contract

```
window.__dbk = { openProject, uid, saveNow: () => save(), libSaveNow: () => { clearTimeout(libTimer); libSave(); },
  S, render, nestPlan, VER, dropMat, store, lib, libSet, libRec, clib, defSettings, applyRules, toast, newProject,
  save, priceCabinet, buildProjectAll, zipAll, xlsmBytes, csvOf, fromOffer, normCab, PRESETS, fromPreset };
window.__dbkOnStore = function (key) {}   // optional; called by store() after every successful write
```

| Consumer | Uses |
|---|---|
| cloud.js | `store` (as `_store`, read + write), `S` (`lang`, `proj`, `home`, `ro`, `settings` — **reassigns `S.settings`**), `lib`, `libRec`, `render`, `toast`, `defSettings`, `applyRules`; installs `__dbkOnStore` |
| locks.js | `S` (`lang`, `proj`, `home`, `tab`, `sel`, `picking`, `ro`, `roDirty`), `lib`, `openProject`, `saveNow`, `libSaveNow`, `render`, `toast`, `uid`; requires `D.openProject` to exist |
| tests / hub / tools | the rest (`buildProjectAll`, `zipAll`, `xlsmBytes`, `csvOf`, `fromOffer`, `normCab`, `PRESETS`, `fromPreset`, `nestPlan`, `VER`, `dropMat`, `priceCabinet`, `newProject`, `save`, `libSet`, `clib`) |

`S` is handed out **by reference**: outside code mutates it directly and then calls `render()`.

### 3.7 cloud.js (requires `window.WorkshopAuth` and `__dbk.store`, else it does nothing)

* Local-first. Signed in → keeps three things in the workshop database (Supabase REST through `W.rest`):
  * projects → table `builder_projects` rows `{ id, name, n, data, deleted, updated_at }` (deletes are tombstones `deleted:true, data:null`);
  * cabinet library → `workspaces` row `id = 'builder-cablib'`, `data = { at:ms, v: <cablib> }`, `updated_by:'builder'`;
  * settings → `workspaces` row `'builder-settings'`, same shape;
  * version history → `workspaces` row `'builder-ver-<projectId>'`, `data = { at, v: slimVersions }` (no `look`, trimmed from the oldest until ≤ ~3 MB), pushed 4 s after a change.
* Trigger: `__dbkOnStore(k)` for `dbKurejas.lib | .cablib | .settings` → `sync()` after 1.5 s; also every 60 s while visible, on `focus`, on `online`, right after sign-in.
* `sync()` = `pullProjects → pushProjects → syncDoc(cablib) → syncDoc(settings)`. Projects: per id, newer `updated` wins. A project
  that is open (`S.proj.id === row.id && !S.home && !S.ro`) is never replaced from the cloud. A local project missing while `meta.pushed[id]`
  exists = deleted here → tombstone pushed. Pulls full `data` only for newer ids, 25 per request; pushes 10 per request.
  Library/settings: one document each, newest save (`meta.clAt` / `meta.setAt` vs remote `at`) wins — whole-document last-writer-wins.
* Applying remote settings: `S.settings = Object.assign(defSettings(), remote.v || {})` (shallow — `normSettings` is not re-run), `store`, `applyRules()`, `render()`.
* While applying remote data the flag `applying` suppresses the hook (no echo push).
* UI: a fixed status chip bottom-left (`☁ Prisijungti — saugoti debesyje` / `Sinchronizuojama…` / `Išsaugota debesyje` / `Nepavyko sinchronizuoti`); click = sign in or (confirm) sign out. On first load in a tab session it opens the sign-in gate (`allowSkip:true` → link "Dirbti be prisijungimo").
* Exposes `window.BuilderCloud = { sync, signIn, verPush, verPull }` — used by `VER` and locks.js.

### 3.8 locks.js (requires `__dbk`, `window.ProjectLock`, `window.WorkshopAuth`)

* Polls `tick()` every 400 ms and after every click: the wanted project id = `!S.home && S.proj ? S.proj.id : null`. On change: close the old
  lock; if signed in → `S.ro = { checking:true }` and `L.open(id, name)`. Not signed in → `S.ro = null` (works as before).
* ProjectLock callbacks: `edit()` → `S.ro = null`, save if `roDirty`, `render()`, then `BuilderCloud.sync()` and, if the cloud copy is newer and
  nothing was edited meanwhile, reopen it keeping tab/sel/picking (toast "Atnaujinta naujausia versija");
  `view(who)` → `S.ro = who || {}`; `copy(id)` → clone what is on screen as `"<name> (kopija)"` with a new id, open it, lock it;
  `leave()` → back to the project list.
* While viewing (every 15 s): if the library copy is newer and nothing was changed locally → `openProject(r.data)` keeping the place and `S.ro`.
* Project list: every second (network at most every 10 s) asks `L.list()` and adds a `🔒 <name>` badge to `.prow-main[data-act="popen"]` rows — **it
  depends on these DOM selectors and `data-v` = project id** (a MutationObserver re-applies badges after each render).
* The lock dialog offers (project-lock.js): "Tik peržiūrėti" (view), "Daryti kopiją" (copy), "Perimti" (take over), "Atgal" (back). Heartbeat 40 s; a closed tab frees the lock within 2 min.

---

## 4. The global UI state object `S`

Declared at app.js:430–434; many fields are added ad hoc later. Only `settings` and `proj` are persisted (plus `lang`, and `tab`/`sel` via `dbKurejas.ui`).

| Field | Type | Initial | Meaning | Set at |
|---|---|---|---|---|
| `lang` | `'lt'\|'en'` | stored or `'lt'` | UI language | 431, 2898 |
| `settings` | object | stored merged over defaults | §2.10 | 432 |
| `proj` | Project \| null | `dbKurejas.current` | the open project | 433 |
| `home` | bool | `true` when no project | start screen (project list) vs project | 492–493 |
| `tab` | `'cab'\|'room'\|'res'\|'nest'\|'drw'\|'set'` | `'cab'` | top tabs: Spintelės, Baldai, Detalės ir CNC, Plokštės, Brėžiniai, Nustatymai | 431, 2897 |
| `sel` | int | 0 | selected cabinet index (clamped in `render`, app.js:824) | 2899 |
| `picking` | bool | false | the preset picker / library is shown instead of the editor | 2900–2902 |
| `stepKey` | string | undefined | current editor step (`dims`, `secs`, `joints`, `ops`, `mats`, …); kept when moving between cabinets of the same kind | 922, 3035, 3071 |
| `colSel` | int | undefined → 0 | column being edited in the Sections step | 2921–2922 |
| `part` | string \| null | null | selected part **name** in Parts & CNC | 3044 |
| `partRef` | `{ cab, key }` \| null | — | stable reference so the selection survives a rename (app.js:2398) | 3044 |
| `ptab` | int | 0 | which program (1OP / 2OP / ↻) of the selected part is shown | 3045 |
| `drawer` | bool | false | **unused** (declared, never read) | 431 |
| `confirm` | string \| null | null | pending two-click confirmation: `'del'`, `'pdel'+id`, `'libdel'+id`, … | many |
| `iso` | `{ key, side, idx }` \| null | null | selected joint/connector in the 3-D assembly view | 2624, 3040, 3043 |
| `isoFocus` | bool | — | scroll/focus the 3-D view once | 3040 |
| `undo` | `[{ id, joints, box }]` | `[]` | joint / box undo stack (≤ 40) | 2597 |
| `jcheck`, `echeck` | bool | — | "check the joints" modal / "check the edges" modal open | 3015 |
| `jcSel` | joint selection | — | selected joint in the joints-check modal | 2639 |
| `jcAsked` | `{ [cabId]: 1 }` | — | joints-check modal already forced once for this cabinet (app.js:3069–3070: "Būtina patikrinti sujungimus") | 3070 |
| `ecView` | `{ th, ph, zoom, exp, fronts }` | — | camera of the edge-check 3-D model | 1230 |
| `ecDrag` | bool | false | a drag just ended (suppresses the click) | 1268 |
| `xside` | `'L'\|'R'` | — | which side the side-section drawing shows | 2576 |
| `roomSel`, `roomSelId` | int \| null, id \| null | null | selected cabinet in Baldai (the id is authoritative) | 2669 |
| `roomUndo` | Project[] | `[]` | whole-project snapshots for Baldai undo (≤ 40) | 2668 |
| `drwOnly` | `'all'\|'furn'\|'c:<cabId>'` | `'all'` | drawings filter | 2171 |
| `drwPaper` | `'A3'\|'A4'` | stored or `'A3'` | | 2171 |
| `drwOpen` | int \| null | null | sheet open in the drawings viewer | 2171 |
| `_drw` | sheet[] | — | cache of the current drawing sheets | 2312 |
| `_info` | `[{ r, warnings, nProg }]` | — | **cache of `buildOne(i)` for every cabinet, rebuilt on each render** (app.js:826, 831); read all over the UI | 831 |
| `_pjParts` | part[] | — | parts of the last Parts & CNC build | 2336 |
| `busy` | bool | — | a ZIP / xlsx is being built | 3173 |
| `admin` | bool | from session PIN | admin mode: prices visible | 1991 |
| `pinChange` | bool | — | PIN change form open | 2941 |
| `prOpen`, `techOpen`, `warnOpen`, `constrOpen` | bool | — | remembered `<details>` open states (price card, technical preview, manufacturing checks, construction step) | 2874 |
| `notesOpen` | `{ [first 60 chars]: bool }` | `{}` | expanded long notes (`clampNotes`, app.js:806) | 807 |
| `homeQ` | string | — | project search text | 2803 |
| `npName` | string | — | new-project name being typed | 2801 |
| `focusNew` | bool | — | focus the new-project field after render | 3083 |
| `libQ`, `libCat` | string | — | cabinet-library search text / selected catalogue | 2802, 2910 |
| `lookPasteTo` | `{ name, until }` \| null | — | material waiting for a Ctrl+V image (60 s) | 1697 |
| `gotoAt` | ms | — | time of the last step jump (scroll-spy suppression) | 926 |
| `tplB64`, `tplName` | string | from `dbKurejas.reportTpl` | user's ReportLists template | 667, 678 |
| `ro`, `roDirty` | see §3.5 | null | set by locks.js | locks.js |

Related module-level state outside `S`: `VD` (versions dialog: `{ pid, list, sure, busy }`), `libTimer`, `clibTimer`, `saveFailShown`, `PR` (pricing), `NEST_CACHE`, room.js `V` (view state).

---

## 5. Pipeline: cabinet record → engine → programs → part list

### 5.1 When it runs

`render()` (app.js:815) for a project: `cabInfo = S.proj.cabinets.map((c, i) => buildOne(i))` — **every cabinet is rebuilt and every
program text regenerated on every full render**, then stored as `S._info`. **[probed]** 10 cabinets (one of each preset, 63 programs): the first
editor render after load ≈ 160–210 ms, later ones ≈ 25 ms; `buildProjectAll()` ≈ 1.5–2 ms warm (3–10 ms cold); a render of the Parts & CNC tab ≈ 4–10 ms
(the engine itself is very fast — a new UI can afford to rebuild and re-validate on every keystroke; DOM + previews dominate). The Parts & CNC tab additionally calls `buildProjectAll()`; the Boards tab badge calls it 450 ms after edits.

### 5.2 `engineDef(c)` (app.js:689–703) — record → engine definition (pure)

1. `d = clone(c)` (the engine mutates its input: `cncDefaults` rewrites `c.cnc`).
2. `W, H, D, thick, dishWidth, legH` → `num()` (accepts `"600-18"`, `"2*300"`, decimal comma).
3. dishwasher: `d.W = d.dishWidth || d.W`.
4. `c.hang === true` and not a dishwasher → `d.cnc.legs = false; d.cnc.feet = false`.
5. `d.cnc.facadeT = num(...) || 18`.
6. `shelfSb`: non-blank → absolute number (accepts `−`, `–`), else deleted.
7. each section: `height, nDrawers, rail, nDoors, shelves` → `num()`; `shelfPos` → numbers.
8. `d.cols = colsOf(c)`; `d.colW = cols > 1 ? colWidths(c) : []`.
9. box: `boards[*].inset` → number, `T` → number or `''`; `inner[*].x, z, col, setback` → numbers, `T` → number or `''`.

Not coerced here (the engine uses `+value` itself): all other `cnc` numbers (`bottomZ`, `bottomD`, `railW`, `fg.*`, `topOv*`, `backInset`), `leds`, `extras`, `worktop`.

### 5.3 `buildOne(i)` (app.js:704–709) — one cabinet for the editor

```
r = E.buildCabinet(engineDef(c), i, projName())
→ { r, warnings: dedupe(r.warnings + program warnings), nProg }
```
* `projName()` (app.js:688): `E.safeName(S.proj.name || 'PROJEKTAS')` (ASCII-folded, non-word chars → `_`; **[probed]** `"Virtuvė Jonaitis"` → `Virtuve_Jonaitis`);
  a name with no ASCII letter/digit → `'PROJEKTAS_' + last 4 alphanumerics of the id`.
* `E.buildCabinet(def, idx, projName)` result `r` **[probed]**: `{ panels, warnings, hardware, legs, joints, seams, visual:{ doors, drawers, plinth, hb, leds }, shelfInfo, dims:{W,H,D,t}, fgaps, worktop }`
  (+ `r.box` for a box: `comps`, `cavity`, `boards`, `openings` — used by app.js:2959–2968).
  The public wrapper (engine.js:1939–1942) also **drops panels with a non-positive size** and adds a warning `…: per maži matmenys … — detalės nepridėtos`.
* Panel **[probed]**: `{ name:'<proj>_<nr>[_<cabName>]_<ROLE>[n]', role, L, W, T, note, holes:[{face,x,y,d,depth,through}], edges:[{edge:'x0'|'x1'|'y0'|'y1',pos,d,depth}], warnings, eb:{y0,y1,x0,x1: edge material or ''}, mat, place:{o,u,v,n}, mirrored, key, cab: nr, short:'<nr>-<ROLE>' }`
  (+ optional `grooves`, `ebFac`, `drawerOf`, `drawer`, `cargo`, `hingeLeft`, `sec`, `boxFront`, `mv`). Roles seen: `KAIRE`, `DESINE`, `DUGNAS`, `VIRSUS`, `JUOSTA_PRIEKIS`, `JUOSTA_GALAS_H`, `FASADAS`, `DURYS`, `NUGARA`, `PRIEKIS` …
  Sizes are **not rounded** (e.g. `236.33333333333334`); rounding to 0.1 happens in the list/export.
* `E.programs(panel)` → `{ files:[{ file:'<name>_1OP.XXL', id:'<name>_1OP', text, n, up, kind:'main'|'rot'|… }], warnings }` **[probed]**. `nProg` = total files of the cabinet.
* Program warnings are re-labelled: `p.short + ': ' + text` (a leading `p.name + ': '` is stripped) and de-duplicated.
* `dedupe(list)` (app.js:710–714): the same note on several panels becomes one line `"<panel A>, <panel B>: <note>"`. The "who" part is whatever
  precedes the first `": "` (regex `/^[^:]+: /`), so a note that itself starts with text and a colon is split there too; notes without a prefix stay as they are; first-seen order is kept.
* `level(w)` (app.js:715–720) classifies a warning **by regular expressions over the Lithuanian text**, tested in this order (all case-insensitive):
  1. `warn` first, for two phrases that would otherwise match `bad`: `/kiekis 0 — nepridėta|turi likti bent/`;
  2. `bad` (something asked for is not made / not drilled right):
     `/NEPROGRAMUOTA|didesnė už|netinkami|praleista|nepalaikom|nepridėt|ne prie šono|negali būti gręžiamos|netelpa|nesurištas|persidengia|susitinka|nepritvirtinta|per maž|ilgesnis nei telpa|nepakanka vietos|nepavyko|per gili|per daug stalčių|uždaro konstrukciją|per arti viena kitos|šone nėra plokštės|gylio, yra/`;
  3. `warn` (made, but check it):
     `/NEPATIKRINTA|nepatikrintos|patikrinti|perkeltas|patikrinkite|šablono nėra|patenka į|prispaudimą|kertasi|pastumt|padalinti po lygiai|apatinis fasadas|pridėtos tik|tinka 16|nenurodyta|etiketėje telpa/`;
  4. otherwise `info` (for the record).

  Shown as tags `klaida` / `patikrinti` / `rankomis` (`errTag`, `warnTag`, `infoTag`). The cabinet list dot is red/yellow from these.
  There is no structured warning object anywhere (no code, no field reference, no severity from the engine) — a new version that wants
  "click the warning → jump to the field" has to add codes at the engine/bridge boundary or keep this text matching.
* Warnings are produced in Lithuanian only; English is made by substring replacement tables `WARN_EN` / `WARN_EN_W` (app.js:1828–1841, outside this slice).

### 5.4 `buildProjectAll()` (app.js:721–735) — the project part list

1. **Extras → loose parts.** For each cabinet `i`, each extra `x`:
   * no positive `L` and `W` → warning `„<nr>-<name>“: papildoma detalė be ilgio ar pločio — nepridėta, įrašykite matmenis`, skipped;
   * `qty` given and not > 0 → warning `…: kiekis 0 — nepridėta`, skipped;
   * else `{ name: x.name || 'DETALE', cab: i+1, mat: x.mat || c.mat.carc || '', L, W, T: x.T || c.thick || 18, qty: max(1, round(qty || 1)), eb:{ eb1: e1?em:'', eb2: e2?em:'', eb3: e3?em:'', eb4: e4?em:'' } }`
     with `em = x.edgeMat || (x.mat === c.mat.facade ? c.edge.facade : c.edge.carc) || ''`.
2. **Worktops**: `worktopPieces().pieces` appended to the loose parts.
3. `X.buildProject({ cabinets: [{ nr: i+1, def: engineDef(c) }], loose }, { project: projName(), date: 'YYYY-MM-DD' })` (export.js:27–89):
   * builds every cabinet **again** (`E.buildCabinet`, `E.programs`);
   * parts: `{ name, short, cab, role, mat, L, W, T, qty:1, eb:{eb1: p.eb.y0, eb2: p.eb.y1, eb3: p.eb.x0, eb4: p.eb.x1}, ebFac, op1, op2, progs:[{id,kind,file}], src:'cab', pic:{holes,edges}, ebLen }`;
   * files: `[{ name:'….XXL', text }]`; a part with more than 2 programs gets a warning (the label holds 2 QR codes);
   * warnings prefixed `Spintelė <nr>[ „<name>“]: `;
   * loose parts: identical ones (same cab, name, mat, L, W, T, edges) are merged with summed `qty`; names made unique
     `<proj>_<cab>_<safeName>` (`_2`, `_3` … on clashes); missing material → `'BE MEDŽIAGOS'` + warning; `src:'loose'`, no programs;
   * hardware merged over the project: `[{ item, unit, qty, cabs:[nr…] }]` (cabinet level: `[{ item, qty, unit }]`).
4. Worktop and extras warnings are appended (unique).
5. Result `pj = { project, date, parts, files, warnings, hardware }` **[probed]** — the input of `viewRes`, `csvOf`, `xlsmBytes`, `zipAll`, `nestPlan`, drawings.

### 5.5 `worktopPieces()` (app.js:739–776)

* Side effect first: if any cabinet has a worktop and `DBRoom.ensure(S.proj)` changed the layout → `save()` (so merely computing the part list can create `proj.layout`).
* One candidate per cabinet with `E.worktopOf(c)`. Placed cabinets get wall coordinates (`a0`, `a1` along the wall, `top` height, `front` line).
* Joined into one piece when on the same wall with the same material, thickness (±0.01), edge, front line (±0.6), top height (±0.6) and touching end to end (±0.6).
* Corners (L/U rooms): a worktop on a later wall that overlaps one on an earlier wall at the same height (±1) is **shortened by the overlap**, with warning
  `„<nr>-STALVIRSIS“ kampe susiduria su „<nr>-STALVIRSIS“ — sutrumpintas N mm (pradžioje|gale), patikrinkite sujungimą`.
* Piece: `{ name:'STALVIRSIS' or 'STALVIRSIS_<nr>-<nr>…', cab: first nr, ids:[cabinet ids], mat, L, W, T, qty:1, worktop:true, eb:{ eb1: edge (front), eb2:'', eb3: edge if it overhangs on the left and is not trimmed there, eb4: same on the right } }`.
* Longer than `WT_MAX = 4100` mm → warning (`stalviršis N mm ilgesnis nei 4100 — patikrinkite plokštės ilgį arba numatykite sujungimą`).
* Returns `{ pieces, warnings }`. Also used by `partCount()` for the tab badge (so it runs on every render).

### 5.6 Live results for the ten presets **[probed, second pass]**

Project `ŽŽŽ` → `projName()` = `ZZZ`; project `Virtuvė Jonaitis` → `Virtuve_Jonaitis`. One cabinet of each preset, no materials typed:

| # | Preset | Panels (roles) | Programs | Warnings from `buildOne` |
|---|---|---|---|---|
| 1 | `pDrawers` | `KAIRE, DESINE, DUGNAS, JUOSTA_PRIEKIS, JUOSTA_GALAS_H, FASADAS ×3` | 8 | none |
| 2 | `pDoors` | sides, bottom, 2 rails, `DURYS ×2`, `LENTYNA` | 7 | 3 × `… NEPATIKRINTA su SWOOD modeliu` (hinge plates, shelf pins, hinge cups) |
| 3 | `pDrDoors` | + `FASADAS` | 8 | the same 3 |
| 4 | `pWall` | `KAIRE, DESINE, DUGNAS, VIRSUS, NUGARA, DURYS ×2, LENTYNA ×2` | 9 | the same 3 |
| 5 | `pTall` | sides, bottom, top, back, `FASADAS ×2`, `DURYS`, `LENTYNA ×4` | 10 | 5, incl. `naujos jungtys, dar nepatikrintos su SWOOD modeliu: … — patikrinkite pirmą gaminį` and `TANDEMBOX viršutinė tvirtinimo skylė 225.5 — patikrinti pagal Blum lentelę…` |
| 6 | `pFridge` | sides, bottom, top, back, `DURYS ×3`, `LENTYNA` | 7 | 3 |
| 7 | `pDish` | `FASADAS` only | **0** | `indaplovės spintelė: tik fasadas — programų negeneruojama` |
| 8 | `pEmpty` | sides, bottom, 2 rails, `LENTYNA ×2` | 5 | 1 |
| 9 | `pPanel` | one board | **0** | `atskira plokštė: tik pjaunama — skylių ir programų nėra` |
| 10 | `pBox` | box boards | 9 | `3D konstrukcija: jungtys gręžiamos pagal spintelių taisykles, bet šis surinkimas naujas — patikrinkite pirmą gaminį` |

So a completely default project already shows 21 notes (19 classified `warn` = "patikrinti", 2 `info`) — the notes list is noisy from the first minute, and real mistakes sit among
standing disclaimers. `buildProjectAll()` for this project: 69 parts, 63 `.XXL` files; project-level warnings are the same texts prefixed
`Spintelė <nr>[ „<name>“]: ` (without the panel names).

Loose parts in the result (extras and worktops) have the keys `name, short, cab, role, mat, progs (empty), L, W, T, qty, eb, op1, op2, src:'loose', ebLen`
— no `pic`, no `ebFac`. Observed with two neighbouring base cabinets that both have a worktop `WT`: one piece `ZZZ_1_STALVIRSIS_1-2`, 1200 × 598 × 38
(598 = D 560 + front 18 + overhang 20), and `proj.layout` had been created by that call (`walls, wallZ, roomH, worktop, items, openings, points`; items auto-placed
left to right on wall 0, the wall cabinet at `x:0`).

**Silent losses seen in the probe** (each is a mistake the legacy app does not prevent):
* an extra with ticked edges (`e1:true`) on a cabinet whose edge material is blank → `eb1:''`: **the edge is silently not banded** (carcass panels in the
  same situation get the placeholder name `KRAŠTAS`, extras and worktops do not);
* an extra without `L` or `W` is left out of the list with only a warning line (`level` = `bad` through `nepridėt`);
* an extra with `qty:0` is left out (`level` = `warn`);
* an extra with no material on a cabinet with no carcass material → material `BE MEDŽIAGOS` + warning `medžiaga nenurodyta — pažymėta „BE MEDŽIAGOS“` (`level` = `warn`);
* a worktop with a blank `edge` gets no edge banding at all (`eb1..4` empty), without any note.

---

## 6. Normalisation and invariants

### 6.1 `num(v)` (app.js:324–331) — every typed number goes through this
numbers pass (non-finite → 0); `null`/`''` → 0; spaces removed, comma → dot; plain decimal → `parseFloat`; an expression made only of
digits and `. + - * / ( )` is **evaluated with `Function(...)`** (leading zeros stripped) — `600-18` → 582, `2*300` → 600; anything else → `parseFloat` or 0.
`fmt(v)` = engine's `E.num` of the value rounded to 0.1. (A CSP without `unsafe-eval` would break the maths input.)

### 6.2 Columns (app.js:364–384)
* `colsOf(c)`: 1 for a dishwasher, else `floor(num(cols) || 1)` clamped 1–3.
* `colWidths(c)`: if `colW` has the right length, every one but the last is ≥ 50 and the rest (`W − sum`) is ≥ 50 → use them with the last = the rest;
  otherwise **equal columns** `round(W / n)` (silently; the engine then cuts equal columns too). The UI toasts `colTooWide` only at the moment of typing.
* `fixCols(c)`: sets `cols`, `colW` (`[]` for one column); keeps `cnc.backs` in sync (**backs of removed columns are kept** up to 3 so a partition put back
  gets its back again; missing ones copy the last column's back); defaults `backMount`; parks sections of a removed column in the last column with `colWant`;
  resets `legsX:'parts'` → 2 with one column.
* Typing a new cabinet width with partitions rescales `colW` proportionally (app.js:2768–2770).

### 6.3 `normCab(c)` (app.js:457–476) — applied to every cabinet on open
1. defaults under the record (`Object.assign(d, c)` — shallow, so a present-but-partial `mat`/`edge` is **not** completed);
2. `cnc = Object.assign(cncFor(c.type), c.cnc)`; old boolean `tbFront` → setting value or `'off'`; `rails` merged over type rails;
3. `extras` → objects only; `worktop` merged over `wtDefault()`; `joints` → object;
4. sections: `Object.assign(newSection(kind || 'doors'), s)`; a door section whose `hinge` starts with `CARGO` becomes `kind:'cargo'` (old data);
   `fridge` forced consistent (doors only);
5. `vis` → three booleans; `leds` cleaned (§2.7);
6. `fixCols`;
7. box → `E.boxDefaults`, no legs/feet; panel → no legs/feet, `sections=[]`, `cols=1`, `pe` completed.

It does not validate numbers, ranges, unknown kinds or material names, and never removes unknown fields.

### 6.4 Coupled-field rules that live in the editor's `assign()` (app.js:2729–2770), not in the model
* `c.type` change → rewrites `cnc.joinery, top, back, backFix, topOverFacade, legs, rails, backs (all columns), backMount` from the type defaults (hand-made construction choices are lost).
* `tbOn` / `pinsOn` / `support` / `sideFull` / `backJoint` are virtual fields (see §2.3).
* `topMount:'over'` forces `top:'full'`; switching `top` to `'full'` sets `topMount:'inside'`.
* `sections.N.hw` / `box.fronts.N.hw` change → `rail` snapped to the nearest available length.
* `sections.N.fridge` toggle → see §2.5.
* `c.cols` change → `colW = []`, `fixCols`.
* extras `L` / `zb` typed on a side panel → `fit = ''`.

---

## 7. Glossary and feature inventory

### 7.1 Domain glossary LT ↔ EN (as the app words it)

| LT | EN | Notes / data field |
|---|---|---|
| Spintelių kūrėjas | Cabinet creator | app name; subtitle "detalės ir CNC be inžinieriaus" |
| Projektas, Projektai | Project, Projects | name goes into CNC program and list file names |
| Versijos | Versions | project history |
| Spintelė, Spintelės | Cabinet, Cabinets | |
| Baldai | Furniture | the whole-room tab |
| Detalės ir CNC | Parts & CNC | part list + programs tab |
| Plokštės | Boards | quick nesting estimate tab |
| Brėžiniai | Drawings | PDF sheets |
| Nustatymai | Settings | |
| Biblioteka, Katalogai | Library, Catalogues | cabinet library |
| Pastatoma / Pakabinama / Aukšta | Base / Wall / Tall | `type` `PASTATOMOS` / `PAKABINAMOS` / `ŪKINĖ` |
| Plotis, Aukštis, Gylis | Width, Height, Depth | `W`, `H`, `D` (outer carcass, without legs) |
| Plokštė (storis) | Board (thickness) | `thick` |
| Karkasas / Korpusas | Carcass | `mat.carc` |
| Fasadas, Fasadai | Front, Fronts | `mat.facade`, `cnc.facadeT` |
| Nugara | Back | `mat.back`, `cnc.backs` |
| Plaušas | Fibreboard (HDF) | back `'hdf'`, nailed on from outside |
| Kieta 18 mm | Solid 18 mm | back `'solid'` |
| Išorėje — ant galo / Viduje — tarp šonų | Outside — on the back edges / Inside — between the sides | `backMount` `top` / `inside` |
| Dugnas | Bottom | part `DUGNAS`; `cnc.bottom` under / inside |
| Viršus (stogas) | Top (STOGAS) | full top; `mat.top` |
| Šonas (kairys / dešinys) | Side (left / right) | parts `KAIRE`, `DESINE` |
| Matomi šonai | Visible sides | `vis.L/R/B` — cut from the front material |
| Šonai per visą aukštį | Full-height sides | pseudo `sideFull` |
| Pertvara, Pertvaros | Partition(s) | `cols − 1` |
| Kolona (Kairė / Vidurinė / Dešinė) | Column (Left / Middle / Right) | `col`, `colW` |
| Sekcija, Sekcijos | Section(s) | `sections[]` |
| Fasadų zona | Front zone | height the sections must fill; `užimta / liko / viršyta` = used / left / exceeded |
| Likęs | Fill | `fill` |
| Stalčiai | Drawers | `kind:'drawers'` |
| Durys | Doors | `kind:'doors'` |
| Cargo | Cargo (pull-out) | `kind:'cargo'` |
| Lentynos | Shelves | `kind:'open'`; `shelves` |
| Orkaitė | Oven | `kind:'oven'` |
| Integruojamas šaldytuvas | Integrated fridge | `fridge`; "Niša" = niche |
| Indaplovės fasadas | Dishwasher front | `dishwasher` |
| Plokštė (atskira) | Panel (loose) | `kind:'panel'` |
| 3D konstrukcija | 3D construction | `kind:'box'` |
| Bėgeliai, Bėgelio ilgis | Runners, Runner length | `hw`, `rail` |
| Lankstai / Vyriai | Hinges | `hinge`, `hingeN`, `hingeSide` |
| Šalia / Viena virš kitos | Side by side / Stacked | `doorSplit` `v` / `h` |
| Kilnojamos / Fiksuotos | Adjustable / Fixed | `shelfAdj` |
| Lentynų laikikliai | Shelf supports (pins) | `cnc.pins` |
| Konstrukcija | Construction | editor step |
| Jungtys | Joints | `cnc.joints` |
| Konfirmatai | Confirmats | Ø8 through + Ø5×32 in the edge |
| Ekscentrikai (+ kaiščiai) | Cams (+ dowels) | Ø15 + Ø8, hidden, can be taken apart |
| Kaiščiai | Dowels | Ø8, glued |
| Surišimo juostos | Top (tie) rails | `cnc.rails`; Gulsčia = flat, Stati = standing |
| Atramos: Kojelės / Pėdutės / Nėra | Supports: Legs / Feet / None | `cnc.legs`, `cnc.feet` |
| Kojelių aukštis | Leg height | `legH` |
| Cokolis | Plinth | extra `kind:'plinth'` |
| Šoninė plokštė | Side panel | extra `kind:'side'` |
| Papildomos detalės | Extra parts | `extras[]` |
| Stalviršis | Worktop | `worktop` |
| Kraštas, Kraštai / Briauna | Edge(s) / Edgeband | `edge.carc`, `edge.facade`; L1, L2, W1, W2 |
| Laminuojami kraštai | Banded edges | `ebEdit` |
| Medžiaga, Medžiagos | Material(s) | free-text names shared with the nesting app |
| Tarpas, Fasadų tarpai | Gap, Front gaps | `cnc.fg` |
| Papildomos operacijos | Extra operations | step Operacijos |
| Žymė / Skylė / Kiaurai / Krašte | Mark / Hole / Through / In edge | hole legend; marks are Ø5 × 2 mm |
| Puodelis / Plokštelė | (Hinge) cup / plate | Ø35 cup |
| Prisukamas / Įspaudžiamas | Screw-on / Press-in | `hingeFix` |
| Grąžtai galvoje | Drills on the head | `rules.drillsTop` |
| LED apšvietimas, griovelis | LED lighting, groove | `leds[]` 16 × 8 groove |
| Siena, Sienos / Patalpa | Wall(s) / Room | `layout` |
| Nepastatytos | Not placed | `items[id].wall = −1` |
| Kabo ant sienos | Hangs on the wall | `hang` |
| Rozetė / Šaltas, Karštas vanduo / Kanalizacija | Socket / Cold, Hot water / Drain | `layout.points` |
| Durys ir langai, Palangė | Doors and windows, Sill | `layout.openings` |
| Realus vaizdas | Realistic image | WebGL path-traced render |
| Išvaizda 3D vaizde, Tekstūra | Look in the 3D views, Texture | `proj.look` |
| Eskizas | Sketch | offer-app style sketch |
| Šoninis pjūvis | Side section | |
| Furnitūra | Hardware (fittings) | hardware list |
| Pastabos | Notes | warnings list |
| klaida / patikrinti / rankomis | error / check / by hand | warning levels bad / warn / info |
| patikrinta / nepatikrinta | verified / unverified | against the SWOOD reference models |
| Paruošta CNC | Ready for CNC | pre-download check |
| Taisyti | Fix | jump to the field |
| Programos, pasukta (↻) | Programs, turned | `.XXL`; 1OP / 2OP / turned program for 5 mm holes in a long edge |
| Viskas (ZIP) | Everything (ZIP) | all outputs |
| Atšaukti | Undo / Cancel | |
| Ištrinti, Tikrai ištrinti? | Delete, Really delete? | two-click confirm pattern |
| Kopijuoti / Kopija | Duplicate / Copy | |
| išsaugota | saved | autosave chip |

Part/role codes that stay Lithuanian ASCII in file names and the report: `KAIRE`, `DESINE`, `DUGNAS`, `VIRSUS`, `NUGARA`, `PRIEKIS`, `JUOSTA_PRIEKIS`, `JUOSTA_GALAS_H`,
`FASADAS`, `DURYS`, `STALC<n>_…`, `STALVIRSIS`, `DETALE`, labels `PAGAL FASADA`, `KRAŠTAS`, `BE MEDŽIAGOS`, `PATIKRINTI`.

### 7.2 Feature inventory derived from `T` (key groups → feature)

| # | Feature | T key groups | What the texts reveal |
|---|---|---|---|
| 1 | Start screen / projects | `np*`, `pr*`, `toHome`, `autosave*`, `ago*`, `copySfx`, `noName`, `imported`, `badFile` | new project by name → first cabinet; import from the offer app (.json); example project; searchable list with open / copy / .json / delete; "saved automatically in this browser and, signed in, in the cloud" |
| 2 | Versions | `ver*` | automatic every ~15 min + named; restore (keeps the previous state as a version) or open as a copy; ☁ = from another computer |
| 3 | Tabs | `tCab`, `tRoom`, `tRes`, `tNest`, `tDrw`, `tSet` | Spintelės · Baldai · Detalės ir CNC · Plokštės · Brėžiniai · Nustatymai |
| 4 | Cabinet picker + library | `pick*`, `p*` presets, `firstCabQ`, `lib*` | "Kokią spintelę kuriame?" — 10 presets; library with catalogues, search, linked copies |
| 5 | Editor steps | `n1..n6`, `s1..s6`, `stepNext/Back`, `stepsNav`, `stepNeed` | Matmenys → Sekcijos → Konstrukcija → Operacijos → Medžiagos → Papildomos; a step is marked "needs filling in" |
| 6 | Dimensions step | `name`, `type`, `t*`, `W/H/D`, `thick`, `facT`, `dishW`, `legH`, `mainL`, `wt*` | outer carcass size, `600-18` maths allowed; worktop on/off with material, thickness, overhangs, edge; wall-cabinet worktop sanity note |
| 7 | Sections step | `zone`, `used/left/over`, `k*`, `secH`, `fill`, `nDr`, `runner`, `rail`, `nDoors`, `split`, `hinge*`, `hside`, `shelves`, `adj/fixed`, `sup`, `add/up/down/rm`, `fh*`, `shPos*`, `parts2`, `part0..2`, `col*`, `cm*`, `backOf`, `bHdf`, `bSolid`, `secRemoved`, `undoBtn` | column map (click a column to edit), partitions 0–2 with widths, back per column, front heights from the top, shelf heights, remove-with-undo |
| 8 | Drawer systems | `rGtv`, `rDtcU`, `rDtc`, `mv*`, `mDrw` | Blum TANDEM / TANDEMBOX / MERIVOBOX (N/M/K/E, gallery, BOXCAP), GTV / DTC ball-bearing, DTC undermount |
| 9 | Fridge / cargo / oven | `fridge*`, `kFridge`, `cargo*`, `kOven` | integrated fridge (fronts on the fridge doors, niche size note), cargo pull-out (DTC Pure Pro), oven supports |
| 10 | Construction step | `sB*`, `bgBase`, `sup*`, `feet*`, `leg*`, `bot*`, `top*`, `topOv*`, `rails`, `r*`, `back`, `b*`, `bFix*`, `bc*`, `bk*`, `cam*`, `sideFull`, `vis*`, `sh*`, `fg*`, `pl*` | supports (legs/feet/none, counts, rows), bottom under/inside + height + depth, top rails/full, on/between sides, overhangs, back mounting and fixing with consequences explained, visible sides, shelf front set-back, front gaps with drag handles, plinth (position, fit by gaps) |
| 11 | Joints | `j*`, `jk_*`, `lg*`, `iso*` | main joinery + per-joint override (type, count, from-edge); 3-D editor: drag connector cards onto dashed joint lines, move, drag off to remove, both sides or separately, arrow keys, undo, full screen; forced "the joints must be checked" modal |
| 12 | Operations step | `s4*`, `o*`, `tb*`, `hf*`, `pin*`, `verified`, `unverified`, `notNeeded` | leg marks, runner marks, TANDEMBOX front fixing (marks or Ø10 holes), hinge holes (screw/press), shelf-support holes (single / row); each tagged verified / unverified |
| 13 | Materials & edges step | `s5*`, `m*`, `e*`, `reqNote`, `eb*`, `look*`, `md*` | carcass / fronts / back / top / drawer base materials, edge materials, per-part edge banding editor, textures / colours per material (upload, paste, drop), drag materials onto boards in 3-D |
| 14 | Extras step | `s6*`, `ex*`, `xRemoved` | extra cut-only parts, plinth, side panels |
| 15 | LED | `led*`, `rmLeds` | 16 × 8 groove for a recessed profile, bottom/top/side, inside/outside, through/closed, distance from the front |
| 16 | Panel | `pn*`, `rmPanel*`, `rmToCeil/Floor` | loose board of any size, edges L1/L2/W1/W2 |
| 17 | 3D construction (box) | `bx*` | boards on/off + inset + thickness, corner covering, inner partitions/shelves, doors/drawers in openings (overlay / inset), joints |
| 18 | Baldai (room) | `rm*`, `rsz*`, `rmSnap_*`, `rmVis*`, `pt*`, `op*`, `rr*` | walls (1–4, L/U), front / plan / 3-D views, drag & snap, resize by dragging, fill a gap, hang on the wall, side panels, sockets and pipes, doors and windows, problem list (past the wall, overlap, above ceiling, blocks a door …), visible sides from the layout, realistic render (quality levels, PNG) |
| 19 | Parts & CNC | `rTitle`, `c*` columns, `zipAll`, `xlsm`, `csv`, `print`, `json`, `zipNote`, `pick`, `lg*` legend, `rotHint`, `hw*`, `allWarn`, `xxl*`, `ck*`, `errTag/warnTag/infoTag` | part table, part drawing + program text, hardware list, notes; downloads: every .XXL separately / per cabinet / per part, .xlsx (ReportLists as DB_PartList v20), .csv, project .json, ZIP; "Paruošta CNC" check with Fix links (project name, materials, worktop material, carcass edge, errors) |
| 20 | Boards (nesting estimate) | `nest*`, `tNest` | boards per material, utilisation, grain "don't turn", board size 300–6000, hand-over to the Nesting app |
| 21 | Drawings | `drw*` | automatic sheets (furniture layout, wall elevations, per-cabinet views + assembly + lists), A3/A4, PDF |
| 22 | Settings | `set*`, `tpl*`, `drillsTop*`, `tbHoleSet`, `r*` rule labels, `resetRules`, `perLenBad` | material / edge / worktop lists, default construction per type, default operations, hinge and shelf-hole dimensions, drills on the head, ReportLists template upload |
| 23 | Validation messages | `numBad`, `numRange`, `numSome`, `colTooWide`, `rmBadVal`, `legDense`, `isoTooClose`, `nestBadSize` | inline input checks |

Features that exist but have **no `T` keys** (strings are inline `S.lang === 'lt' ? … : …`, ≈ 160 places in app.js): admin mode / pricing (PIN, price card, offer ladder), the joints-check and edges-check modals, manufacturing-check panel titles, storage-full messages, cloud chip and lock dialogs (in cloud.js / locks.js / project-lock.js).

---

## 8. Pure logic vs DOM-bound

"Pure" = no DOM, no `S`, no storage. "State-bound" = reads/writes `S` or storage but no DOM (reusable once `S`/settings are injected).

| Function | Lines | Class | Depends on / side effects |
|---|---|---|---|
| `esc`, `clone`, `uid`, `getPath`, `setPath` | 320–340 | pure | |
| `num` | 324 | pure | uses `Function()` for expressions |
| `fmt` | 332 | pure | `E.num` |
| `drillList` | 444 | pure | |
| `defSettings`, `RULE_DEF`, `TYPES`, `wtDefault` | 343–357, 401 | pure | `E.R`, `E.WT_DEF` |
| `newSection` | 358 | pure | |
| `colsOf`, `colOf`, `colWidths`, `legacyBack` | 364–373 | pure | |
| `fixCols` | 374 | pure (mutates its argument) | |
| `engineDef` | 689 | pure | |
| `dedupe`, `level` | 710–720 | pure | `level` is tied to the LT warning wording |
| `libRec`, `clibClean` | 498, 508 | pure | |
| `b64ToBytes`, `bytesToB64` | 668–669 | pure | |
| `ico` | 779 | pure (returns an SVG string) | |
| `PRESETS` | 402 | data | |
| `VER.body`, `VER.prune` (internal) | 553–563 | pure | not exported |
| `t`, `colName` | 317, 385 | state-bound | `S.lang`, `T` |
| `cncFor` | 386 | state-bound | `S.settings` |
| `newCabinet` | 393 | state-bound | `S.proj` (copies the last cabinet's materials/worktop), `S.settings` |
| `fromPreset` | 414 | state-bound | `S.lang`, `S.proj.layout`, `S.proj.cabinets`, `E.boxDefaults` |
| `normCab` | 457 | state-bound | `S.settings` via `cncFor`, `E.R.led`, `E.boxDefaults` |
| `applyRules` | 445 | state-bound | `S.settings.rules` → **mutates global `E.R`** |
| `sample` | 477 | state-bound | **assigns `S.proj`** as a side effect |
| `store`, `lib`, `libSet`, `clib`, `clibSet` | 333, 496–507 | storage | localStorage (+ `__dbkOnStore`); `libSet`/`clibSet` call `saveFailed` (DOM) on failure |
| `libSave`, `clibAdd`, `clibSync`, `clibCat`, `clibRec` | 500–519 | state + storage | `clibCat`/`clibRec` need `cabKind`, `typeName` (→ `t`) |
| `VER.*` | 542–593 | state + IndexedDB | registers `visibilitychange` / `pagehide` listeners; calls `BuilderCloud` |
| `save` | 647 | state + storage + a little DOM | flashes `#saved` |
| `openProject`, `newProject` | 658–666 | state + storage | `window.scrollTo` |
| `projName`, `cur` | 685–688 | state-bound | |
| `buildOne`, `buildProjectAll` | 704, 721 | state-bound | engine + export; `buildProjectAll` → `worktopPieces` side effects |
| `worktopPieces` | 739 | state-bound | `window.DBRoom` (`ensure`, `placed`, `z0Of`, `cabD`, `geo`), may `save()` |
| `saveFailed` | 336 | DOM | `#saved`, `toast` |
| `clibIcon`, `viewLib` | 520–536 | view (HTML string) | `S.libQ`, `S.libCat`, `S.confirm`; emits `data-act="libcat|libcatdel|libnewcat|libadd|libdel"`, `data-act-change="libmove"`, ids `lib-q`, `lib-newcat` |
| `verOpen`, `verClose`, `verRec`, `verPaint`, `verClick` | 596–646 | DOM | builds `#verdlg` |
| `loadTemplateFile` | 670 | DOM/async | `FileReader`, `window.JSZip`, toast, render |
| `langBtns`, `clampNotes`, `render` | 804–815 | DOM | |

The engine entry points (`E.buildCabinet`, `E.programs`, `E.worktopOf`, `E.safeName`, `E.setRules`, `E.boxDefaults`, `E.legHeight`) and `X.buildProject`
are DOM-free and also run under node-style `require` (engine.js:1945, export.js:222).

---

## 9. Gotchas and pain points found in this slice

**Data integrity**
1. **Legacy `cnc.back` is lost in `normCab`.** `cncFor(type)` always supplies `backs`/`backMount` from the *type default*, so the legacy branch in `fixCols`
   (`legacyBack(c.cnc)`, `c.cnc.back === 'inside'`) never runs. **[probed]** `normCab({ type:'PASTATOMOS', cnc:{ back:'top' } })` → `backs:['none']`. Old projects
   / hand-written JSON that only have `cnc.back` silently lose their back.
2. `normCab` is a shallow merge: a record with `mat:{ carc:'X' }` only keeps `facade`/`back` undefined; code elsewhere tolerates it but the schema is not guaranteed.
3. `vis` and `leds` exist only after a reopen; freshly created cabinets lack them (every reader must default).
4. UI-memory fields are persisted in the model: `cnc.tbPrev`, `section.prevHinge`, `section.colWant`, `cnc.back` (vestigial), `S.drawer` (dead).
5. `colWidths` silently falls back to equal columns when widths do not fit; the stored `colW` still holds the bad numbers until `fixCols` runs.
6. Plinth "fitted by gaps" rewrites `extras[k].L/W` inside `render()` (app.js:827–829) without `save()` — a render-time mutation of the model.
7. `worktopPieces()` (a "compute" function, called by the tab badge on every render) can create `proj.layout` and call `save()`.
8. Part names embed the cabinet **index** and the project/cabinet names; reordering or renaming changes every program file name. `projName()` of a non-ASCII-only
   name becomes `PROJEKTAS_<4 chars>`.
9. Warnings are free Lithuanian text; severity (`level`) and English translation are regex/substring matches over that text — changing an engine message can
   silently change its severity or leave it untranslated.
10. `applyRules()` mutates the engine's global rule table; settings are per browser (and cloud-synced whole-document last-writer-wins), not per project — the same
    project can produce different programs on two computers with different rules.
11. Changing the cabinet type overwrites construction choices without confirmation or undo.

**Storage**
12. Every edit synchronously serialises the whole project to `dbKurejas.current` and, 250 ms later, the **entire library of all projects** to `dbKurejas.lib`.
    Texture photos (`proj.look` data URIs) and the uploaded report template live in the same ~5 MB localStorage budget; the failure path is a one-time toast.
13. `dbKurejas.current` duplicates the library copy; the two can diverge for up to 250 ms and whenever `S.ro` blocks `libSave`.
14. Versions are only in IndexedDB of this browser (plus the cloud when signed in, without textures); deleting a project does not delete its versions.
15. The last tab is restored from `dbKurejas.ui`, except `nest` (not in the whitelist).

**Multi-user / cloud**
16. `S.ro` blocks saving but not editing; nothing in app.js shows the read-only state (only project-lock.js's own bar). Edits made while "checking" are saved
    later only if the lock is granted.
17. cloud.js and locks.js reach into `S` and specific DOM selectors (`.prow-main[data-act="popen"]`, `data-v`), poll on timers (400 ms, 1 s, 15 s, 60 s) and patch
    behaviour from outside — a hidden contract a new UI must either keep or replace.
18. Remote settings are applied with a shallow `Object.assign(defSettings(), remote.v)` (no `normSettings`), so a partial remote `rules`/`types` object replaces the defaults wholesale.
19. `window.__dbk` lists `openProject` twice; `S` is exported by reference.

**Structure / usability**
20. One 3 200-line closure; state (`S`) is a grab-bag of ~55 fields mixing persisted data, view state, caches (`_info`, `_drw`, `_pjParts`) and modal flags.
21. Full re-render with `innerHTML` on almost every action, and every render rebuilds all cabinets and all program texts (`buildOne` × N). The engine part is
    cheap (≈ 2 ms for 10 cabinets); the cost is the DOM and the previews (≈ 25 ms warm, ≈ 0.2 s cold at 10 cabinets), plus lost focus / scroll / caret
    whenever the whole editor is replaced.
21a. The notes list is noisy by default: a project of untouched presets already carries 20+ "NEPATIKRINTA / patikrinkite" notes (§5.6), so real mistakes
    (a part left out, a hole not programmed) do not stand out; severity is only a coloured tag derived from the wording.
21b. Blank edge materials behave inconsistently: carcass parts get the placeholder `KRAŠTAS`, extras and worktops silently get no edge at all (§5.6).
22. Two-click confirmations via `S.confirm` strings (`'del'`, `'pdel'+id`, `'libdel'+id`) — the confirm state silently persists until the next action.
23. Texts: 948 keys in `T` plus ≈ 160 inline bilingual strings; cabinet-library catalogue names and all engine warnings exist in Lithuanian only.
24. `num()` evaluates typed expressions with `Function()` — convenient (`600-18`) but needs `unsafe-eval`; non-numeric input silently becomes 0.
25. The preset picker is the only "wizard"; after it the user faces six steps whose coupled rules (§6.4) are invisible — e.g. choosing "Outside" back only
    works when every column has a solid back, `topMount` flips `top`, a type change resets construction.

---

## 11. Compatibility checklist for a new version (derived from this slice)

Placed before the appendix for convenience. Everything here is a fact of the legacy contract; breaking an item means existing workshop data
or the shared cloud/lock scripts stop working.

**Data that must keep loading**
1. A project is recognised by `app === 'db-kurejas'` + `Array.isArray(cabinets)`; exported files are `<safeName>_projektas.json`, pretty-printed. Any other
   JSON with a `cabinets` array is treated as an offer-app export (`fromOffer`).
2. Run every loaded cabinet through the `normCab` rules (§6.3) — records in the wild lack `vis`, `leds`, `backs`, `backMount`, `worktop.left/right`, may carry
   boolean `tbFront`, door sections with a `CARGO…` hinge, `extras` with non-object entries, and `fridge` on non-door sections.
3. Number fields may hold **strings with arithmetic** (`"600-18"`, `"2*300"`, `"562,5"`). While the user types, the `input` handler stores the raw text
   in the record (and autosaves it) as soon as it evaluates to an in-range number (app.js:2806–2809); on `change` (blur/Enter) it is replaced by the evaluated,
   range-clamped number and the field is rewritten (app.js:2840–2845, limits in `NUM_LIMITS`, app.js:2783–2792 — see the events report). So saved data is
   normally numeric, but a page closed mid-typing, an imported file or an offer-app export can carry strings — `engineDef` (`num()`) is the only place that
   guarantees numbers for `W/H/D/thick/dishWidth/legH`, section `height/nDrawers/rail/nDoors/shelves`, `shelfPos`, `shelfSb`, box `inset/T/x/z/col/setback`.
4. Unknown fields are never stripped by the legacy app; a new version sharing the same storage/cloud rows must preserve fields it does not understand
   (`pricing`, `look`, `layout`, `ebEdit`, `box`, `libId`, `libFrom`, `tbPrev`, `prevHinge`, `colWant` …), or the old app loses them on the next sync.
5. Cabinet order is identity for manufacturing: part / program names are `<projName>_<index+1>[_<cabName>]_<ROLE>`; `layout.items` is keyed by cabinet `id`.
6. Settings are one global document (`dbKurejas.settings`) and change the CNC output through `applyRules()` → `E.setRules`. Call `applyRules()` after any
   settings change and before any build; the engine's rule table is module-global.

**Storage that other scripts read**
7. `dbKurejas.lib` (array of `{ id, name, updated, n, data }`), `dbKurejas.cablib` (`{ v:1, items, cats }`), `dbKurejas.settings` — cloud.js pushes exactly
   these three keys, and only when it is told through `window.__dbkOnStore(key)` after the write. `updated` must be an ISO string that changes on every save
   (cloud "newest wins" + `meta.pushed[id] === updated` means "already pushed").
8. `dbKurejas.current` = the open project; `dbKurejas.ui` = `{ id, tab, sel }`; versions in IndexedDB `dbKurejasVersions`/`p`/`pid` with the record shape of §2.13
   (cloud row `builder-ver-<id>` mirrors it without `look`).
9. `dbNestHandoff` (`{ name, b64, at }`) is the hand-over to the Nesting app on the same origin; `nestDefaults` and `dedesBaldai.calc.v1` are read from sibling apps.

**Hooks cloud.js / locks.js need (`window.__dbk`)**
10. cloud.js refuses to start without `__dbk.store`; it uses `S` (`lang`, `proj`, `home`, `ro`, `settings`), `lib()`, `libRec(p)`, `render()`, `toast(msg)`,
    `defSettings()`, `applyRules()`, and writes through `store(key, value)` itself.
11. locks.js refuses to start without `__dbk.openProject`; it uses `S` (`lang`, `proj`, `home`, `tab`, `sel`, `picking`, `ro`, `roDirty`), `lib()`,
    `openProject(p)` (must not render and must reset to tab `cab` — locks.js restores tab/sel/picking itself via `keepPlace`), `saveNow()`, `libSaveNow()`,
    `render()`, `toast()`, `uid()`.
12. `save()` and `libSave()` must stay no-ops while `S.ro` is truthy, and `save()` must set `S.roDirty = true` — that is the whole read-only mechanism.
13. `S.home` (true = project list) and `S.proj.id` are polled every 400 ms to decide which project to lock; the project list rows must be
    `.prow-main[data-act="popen"][data-v="<projectId>"]` containing a `<b>` for the lock badge, or locks.js's badges silently disappear.
14. `VER` calls `window.BuilderCloud.verPush(pid, list)` after each write and `verPull(pid)` when listing; `BuilderCloud.sync()` returns a promise (used by locks.js).

**Behaviours users rely on (keep or consciously replace)**
15. Autosave on every edit, with a visible "saved" chip and a loud failure state when storage is full.
16. A new cabinet inherits materials, edges and worktop settings from the last cabinet in the project; a panel takes the most common front material and the room height.
17. Automatic versions (rolling 15 min, 48 h dense, daily for half a year, named forever), restore keeps a "before restore" version.
18. Linked library cabinets (`libId`) update the library copy 300 ms after any save; library copies added to a project are free copies.
19. Worktops of neighbouring cabinets on one wall join into one piece; at corners the later wall's piece is shortened; > 4100 mm warns.

---

## 10. Appendix — the full `T` table

948 keys, identical key set in `lt` and `en`. Values longer than 70 (LT) / 100 (EN) characters are cut with `…` (the long ones are explanatory notes).
`{n}`, `{w}`, `{a}`, `{b}` … are placeholders filled with `.replace()`. The line number is where the key sits in the `lt` block of `src/lib/app.js`
(the `en` block mirrors it 148 lines further down).

| key | app.js line (lt) | LT | EN |
|---|---|---|---|
| `app` | 16 | Spintelių kūrėjas | Cabinet creator |
| `sub` | 16 | Dėdės Baldai · detalės ir CNC be inžinieriaus | Dėdės Baldai · parts and CNC without the engineer |
| `project` | 17 | Projektas | Project |
| `projPh` | 17 | PROJEKTO_KODAS | PROJECT_CODE |
| `verBtn` | 18 | Versijos | Versions |
| `verT` | 18 | Projekto versijos | Project versions |
| `verName` | 18 | Versijos pavadinimas | Version name |
| `verNamePh` | 18 | pvz. Prieš kliento pakeitimus | e.g. Before the client's changes |
| `verSave` | 18 | Išsaugoti versiją | Save version |
| `verHand` | 18 | Išsaugota ranka | Saved by hand |
| `verSaved` | 18 | Versija išsaugota | Version saved |
| `verNote` | 18 | Versijos saugomos automatiškai: redaguojant — maždaug kas 15 min., ir… | Versions are kept automatically: while editing about every 15 minutes, and when another project is … |
| `verNone` | 18 | Versijų dar nėra — pirmoji atsiras po pakeitimų. | No versions yet — the first one appears after changes. |
| `verToday` | 18 | Šiandien | Today |
| `verYest` | 18 | Vakar | Yesterday |
| `verSame` | 18 | kaip dabar | as now |
| `verRestore` | 18 | Atkurti | Restore |
| `verSure` | 18 | Tikrai atkurti? | Really restore? |
| `verCopy` | 18 | Kaip kopiją | As a copy |
| `verCopyT` | 18 | Atidaro šią versiją kaip naują projektą — dabartinis lieka nepakeistas | Opens this version as a new project — the current one stays as it is |
| `verCopied` | 18 | Versija pridėta kaip naujas projektas | Version added as a new project |
| `verBefore` | 18 | prieš atkūrimą | before restoring |
| `verDone` | 18 | Versija atkurta — ankstesnė būsena išsaugota kaip versija | Version restored — the previous state was kept as a version |
| `topKind` | 18 | Viršaus tipas | Top type |
| `bKind` | 18 | Tipas | Type |
| `bcBotL` | 18 | Apačioje | At the bottom |
| `bcBotOn` | 18 | Stovi ant dugno | Stands on the bottom |
| `bcBotCov` | 18 | Dengia dugną (dugnas trumpesnis) | Covers the bottom (shorter bottom) |
| `bcTopL` | 18 | Viršuje | At the top |
| `bcTopOn` | 18 | Po viršumi (stogu) | Under the top |
| `bcTopCov` | 18 | Dengia viršų (viršus trumpesnis) | Covers the top (shorter top) |
| `bcRailOn` | 18 | Po surišimo juosta | Under the back rail |
| `bcRailCov` | 18 | Dengia juostą (juosta paslinkta) | Covers the rail (rail moved forward) |
| `plFitT` | 18 | pritaikymas tarpais | fitted by gaps |
| `plGl` | 18 | Tarpas kairėje | Gap left |
| `plGr` | 18 | Tarpas dešinėje | Gap right |
| `plGt` | 18 | Iki dugno | To the bottom |
| `plGb` | 18 | Nuo grindų | From the floor |
| `plFitBtn` | 18 | Pritaikyti: tarp šonų po 1 mm, 4 mm iki dugno | Fit: between the sides 1 mm each, 4 mm under the bottom |
| `plFitOff` | 18 | Nustatyti dydį ranka | Set the size by hand |
| `plFitNote` | 18 | Užpildžius tarpus, cokolio ilgis ir aukštis skaičiuojami patys ir kei… | With the gaps filled, the plinth's length and height follow the cabinet by themselves. The edges in… |
| `plDragT` | 18 | Tempkite — cokolio kraštas (tarpas) | Drag — the plinth's edge (gap) |
| `plSnap0` | 18 | be tarpo | no gap |
| `mTop` | 18 | Viršus (stogas) | Top (STOGAS) |
| `mTopPh` | 18 | kaip korpusas | as the carcass |
| `mdT` | 18 | Medžiagos — tempkite ant plokštės 3D vaizde | Materials — drag onto a board in the 3-D view |
| `mdChipT` | 18 | Tempkite ant plokštės dešinėje | Drag onto a board on the right |
| `mdNote` | 18 | Numesta ant fasado — fasadų medžiaga, ant stogo — viršaus, ant nugaro… | Dropped on a front — the fronts' material, on the top — the top's, on the back — the back's, on oth… |
| `mdWt` | 18 | Stalviršis | Worktop |
| `mdNone` | 18 | Čia nėra plokštės | No board here |
| `fgT` | 18 | Fasadų tarpai, mm | Front gaps, mm |
| `fgL` | 18 | Kairėje | Left |
| `fgR` | 18 | Dešinėje | Right |
| `fgTop` | 18 | Viršuje | Top |
| `fgMid` | 18 | Tarp fasadų | Between fronts |
| `fgBot` | 18 | Apačia nuo dugno | Bottom from the bottom panel |
| `fgToSide` | 18 | Iki šonų apačios | Down to the sides' bottom |
| `fgReset` | 18 | Pagal taisyklę | By the rule |
| `fgDragT` | 18 | Tempkite — fasadų kraštas (tarpas) | Drag — the fronts' edge (gap) |
| `fgSnapBot` | 18 | lygiai su dugnu | flush with the bottom panel |
| `fgSnapSide` | 18 | iki šonų apačios | down to the sides' bottom |
| `fgSnapTop` | 18 | lygiai su viršumi | flush with the top |
| `fgSnapOut` | 18 | lygiai su šono išore | flush with the side's outer face |
| `fgNote` | 18 | Tuščias laukas — pagal taisyklę (pilka reikšmė). „Apačia nuo dugno“: … | Empty — by the rule (the grey value). "Bottom": 0 — the fronts start at the bottom panel, minus — l… |
| `camPickT` | 18 | Ekscentrikų pusė — paspauskite, kad perkeltumėte į kitą plokštės pusę | Side of the eccentrics — click to move them to the other face of the panel |
| `camIn` | 18 | ekscentr.: vidus | cams: inside |
| `camOut` | 18 | ekscentr.: išorė | cams: outside |
| `topOvF` | 18 | Išlenda priekyje | Overhang at the front |
| `topOvFf` | 18 | Išlenda už fasadų | Overhang past the fronts |
| `topOvS` | 18 | Išlenda šonuose | Overhang at the sides |
| `topOvB` | 18 | Išlenda gale | Overhang at the back |
| `topOvNote` | 18 | Kiek viršus (STOGAS) išlenda už korpuso, mm. Pvz. 1 — po 1 mm priekyj… | How far the top (STOGAS) reaches past the carcass, mm. E.g. 1 — 1 mm at the front, both sides and t… |
| `plWhere` | 18 | Cokolio vieta | Plinth position |
| `plIn` | 18 | Tarp šonų | Between the sides |
| `plUnder` | 18 | Po korpusu | Under the carcass |
| `plL` | 18 | Cokolis | Plinth |
| `plOff` | 18 | Nėra | None |
| `plOn` | 18 | Yra | Yes |
| `plH` | 18 | Aukštis | Height |
| `plLen` | 18 | Ilgis | Length |
| `plYf` | 18 | Nuo priekio | From the front |
| `plYfH` | 18 | mm nuo korpuso priekio (be fasado) | mm behind the carcass front (fronts not counted) |
| `plNote` | 18 | Cokolis įtraukiamas į detalių sąrašą (tik pjaunamas) ir matomas 3D be… | The plinth goes into the part list (cut only) and shows in 3D and the drawings. It is in the Extras… |
| `bkInset` | 18 | Nugara nuo galo, mm | Back from the rear edge, mm |
| `bkFront` | 18 | Nugaros priekis nuo spintelės priekio | Back's front face from the cabinet front |
| `bkInsetH` | 18 | Vidinė nugara atitraukiama nuo šonų galo — lentynos ir stalčiai sutru… | The inside back is set forward from the sides' back edge — shelves and drawers get that much shorte… |
| `shFront` | 18 | Lentynų priekis | Shelf front |
| `shFlush` | 18 | Lygiai su priekiu | Flush with the front |
| `shOther` | 18 | Atitraukti, mm | Set back, mm |
| `shFrontD` | 18 | Kiek lentynos atitrauktos nuo korpuso priekio (taip ir sutrumpėja). 0… | How far the shelves stand back from the carcass front (they get that much shorter). 0 — flush with … |
| `tNest` | 18 | Plokštės | Boards |
| `nestT` | 18 | Plokštės ir išdėstymas | Boards and layout |
| `nestL` | 18 | Kiek plokščių reikia kiekvienai medžiagai ir kaip detalės ant jų gula… | How many boards each material takes and how the parts lie on them — worked out at once. Kerf {k} mm… |
| `nestOpen` | 18 | Atidaryti Nesting programoje | Open in the Nesting app |
| `nestOpenT` | 18 | Atidaro Nesting programą su šio projekto detalėmis (.xlsx kaip DB_Par… | Opens the Nesting app with this project's parts (the .xlsx as a DB_PartList report) — for the final… |
| `nestNone` | 18 | Detalių dar nėra. | No parts yet. |
| `nestMat` | 18 | Medžiaga | Material |
| `nestBoard` | 18 | Plokštė, mm | Board, mm |
| `nestSheets` | 18 | Lapų | Boards |
| `nestUtil` | 18 | Išnaudota | Used |
| `nestParts` | 18 | Detalių | Parts |
| `nestArea` | 18 | Detalių plotas | Parts area |
| `nestGrain` | 18 | Struktūra | Grain |
| `nestGrainL` | 18 | nesukti | don't turn |
| `nestTot` | 18 | Iš viso lapų | Boards in all |
| `nestSh` | 18 | lap. | boards |
| `nestPcs` | 18 | det. | pcs |
| `nestBig` | 18 | netelpa | too big |
| `nestBigL` | 18 | Netelpa į plokštę | Too big for the board |
| `nestBW` | 18 | Plokštės ilgis | Board length |
| `nestBH` | 18 | Plokštės plotis | Board width |
| `nestBadSize` | 18 | Plokštės dydis 300–6000 mm | Board size 300–6000 mm |
| `nestHandFail` | 18 | Projektas per didelis perduoti — atsisiųskite .xlsx ir įkelkite į Nes… | The project is too big to hand over — download the .xlsx and load it into Nesting |
| `nestNote` | 18 | Greitas įvertinimas: Nesting programa gali sudėti dar tankiau (grupės… | A quick estimate: the Nesting app can pack tighter still (groups, offcuts). With "don't turn" the p… |
| `tCab` | 18 | Spintelės | Cabinets |
| `tRes` | 18 | Detalės ir CNC | Parts & CNC |
| `tDrw` | 18 | Brėžiniai | Drawings |
| `drwTitle` | 18 | Brėžiniai | Drawings |
| `drwLead` | 18 | Sudaromi automatiškai iš detalių: baldų išdėstymas ir sienų vaizdai (… | Made automatically from the parts: furniture layout and wall elevations (when cabinets are placed i… |
| `drwShow` | 18 | Rodyti | Show |
| `drwAll` | 18 | Visi lapai | All sheets |
| `drwFurn` | 18 | Tik baldų išdėstymas | Furniture layout only |
| `drwPaper` | 18 | Popierius | Paper |
| `drwPdf` | 18 | ⤓ Atsisiųsti PDF ({n} lap.) | ⤓ Download PDF ({n} sheets) |
| `drwOne` | 18 | ⤓ PDF | ⤓ PDF |
| `drwView` | 18 | Peržiūrėti | View |
| `drwBuilding` | 18 | Ruošiamas PDF… {i} / {n} | Making the PDF… {i} / {n} |
| `drwDone` | 18 | PDF paruoštas | PDF ready |
| `drwFail` | 18 | Nepavyko sudaryti PDF:  | Could not make the PDF:  |
| `drwNone` | 18 | Nėra ką braižyti — pridėkite spintelę. | Nothing to draw — add a cabinet. |
| `drwCab` | 18 | 📐 Brėžiniai | 📐 Drawings |
| `drwZip` | 18 | PDF su visais brėžiniais įdedamas ir į „Viskas ZIP“. | The PDF with all drawings also goes into the full ZIP. |
| `drwClose` | 18 | Uždaryti | Close |
| `drwPrev` | 18 | ‹ Ankstesnis | ‹ Previous |
| `drwNext` | 18 | Kitas › | Next › |
| `drwSheets` | 18 | lapai | sheets |
| `tSet` | 18 | Nustatymai | Settings |
| `projects` | 18 | Projektai | Projects |
| `cabs` | 19 | Spintelės | Cabinets |
| `newCab` | 19 | ＋ Nauja spintelė | ＋ New cabinet |
| `dup` | 19 | Kopijuoti | Duplicate |
| `del` | 19 | Ištrinti | Delete |
| `delSure` | 19 | Tikrai ištrinti? | Really delete? |
| `sB` | 20 | Konstrukcija | Construction |
| `sBl` | 20 | Kaip surenkama dėžė: atramos, dugnas, viršus, šonai, nugara, jungtys. | How the box is built: supports, bottom, top, sides, back, joints. |
| `nB` | 20 | Konstrukcija | Construction |
| `bgBase` | 20 | Atramos ir dugnas | Supports and bottom |
| `stepNext` | 20 | Toliau | Next |
| `stepBack` | 20 | Atgal | Back |
| `libT` | 20 | Biblioteka | Library |
| `libQ` | 20 | Ieškoti: pavadinimas, matmenys (600x720), medžiaga… | Search: name, size (600x720), material… |
| `libCats` | 20 | Katalogai | Catalogues |
| `libAll` | 20 | Visi | All |
| `libNewCat` | 20 | Naujas katalogas | New catalogue |
| `libAddT` | 20 | Pridėti šią spintelę į projektą (kopija) | Add this cabinet to the project (a copy) |
| `libMove` | 20 | Perkelti į katalogą | Move to a catalogue |
| `libNone` | 20 | Nieko nerasta — pakeiskite paiešką ar katalogą. | Nothing found — change the search or the catalogue. |
| `libEmpty` | 20 | Biblioteka tuščia. Spintelės redaktoriuje paspauskite „☆ Į biblioteką… | The library is empty. In the cabinet editor press "☆ Save to library" — the cabinet will be here in… |
| `libNewT` | 20 | Nauja iš šablono | New from a template |
| `libSave` | 20 | Į biblioteką | Save to library |
| `libSaveT` | 20 | Išsaugoti šią spintelę bibliotekoje — ją galėsite pridėti bet kuriame… | Keep this cabinet in the library — add it in any project. Later edits update the library copy. |
| `libLinked` | 20 | Bibliotekoje | In the library |
| `libLinkedT` | 20 | Ši spintelė yra bibliotekoje ir jos pakeitimai ten atnaujinami. Spust… | This cabinet is in the library and its edits update it there. Click to unlink (the library copy sta… |
| `libSaved` | 20 | Išsaugota bibliotekoje: {n} ({c}) | Saved in the library: {n} ({c}) |
| `libUnlinked` | 20 | Atsieta — bibliotekos kopija daugiau nekeičiama | Unlinked — the library copy no longer changes |
| `libAdded` | 20 | Pridėta iš bibliotekos: {n} | Added from the library: {n} |
| `pickTitle` | 20 | Kokią spintelę kuriame? | What are we building? |
| `pickLead` | 20 | Pasirinkite panašiausią — viską galėsite pakeisti. | Pick the closest one — everything can be changed. |
| `cancel` | 20 | Atšaukti | Cancel |
| `pDrawers` | 21 | Stalčių spintelė | Drawer cabinet |
| `pDoors` | 21 | Durų spintelė | Door cabinet |
| `pDrDoors` | 21 | Stalčius + durys | Drawer + doors |
| `pWall` | 21 | Pakabinama | Wall cabinet |
| `pTall` | 21 | Aukšta su orkaite | Tall with oven |
| `pFridge` | 21 | Šaldytuvo spinta | Fridge unit |
| `kFridge` | 21 | Šaldytuvas | Fridge |
| `fridgeHinge` | 21 | Vyriai | Hinges |
| `fridgeHandle` | 21 | Rankena — {s} | Handle — {s} |
| `flipT` | 22 | Keisti atidarymo pusę (lankstai į kitą pusę) | Change the opening side (hinges to the other side) |
| `flipPair` | 22 | Dvejos durys atsidaro į abi puses — keisti nėra ką. Norėdami vienpusi… | A pair of doors opens both ways — nothing to flip. For one-way, choose 1 door in the section. |
| `flipDone` | 22 | Lankstai: {s} | Hinges: {s} |
| `ledAddL` | 22 | Pridėti LED: | Add an LED: |
| `ledT` | 22 | LED apšvietimas | LED lighting |
| `ledL2` | 22 | įleidžiamo profilio griovelis 16 × 8, frezuojamas CNC | a groove for a recessed profile, 16 × 8, routed on the CNC |
| `ledAt` | 22 | Kur | Where |
| `ledBottom` | 22 | Dugne | Bottom |
| `ledTop` | 22 | Viršuje | Top |
| `ledL` | 22 | Kairiame šone | Left side |
| `ledR` | 22 | Dešiniame šone | Right side |
| `ledSide` | 22 | Pusė | Face |
| `ledIn` | 22 | Viduje | Inside |
| `ledOut` | 22 | Išorėje | Outside |
| `ledFrom` | 22 | Nuo priekio | From the front |
| `ledEnds` | 22 | Galai | Ends |
| `ledOpen` | 22 | Kiaurai | Through |
| `ledClosed` | 22 | Uždari | Closed |
| `ledNone` | 22 | LED nėra. Pridėkite čia arba Baldų skirtuke nutempkite „LED juostą“ a… | No LEDs. Add one here, or drag "LED strip" onto a cabinet in the Baldai tab. |
| `ledNote` | 22 | Frezuojama kaip step2xxl: freza T=96 Ø15.5, įleidimas nuožulniai per … | Routed as step2xxl does: cutter T=96 Ø15.5, ramped entry over 30 mm, at least 2 mm left. "Through" … |
| `ledChip` | 22 | LED juosta | LED strip |
| `ledChipS` | 22 | griovelis 16×8 | groove 16×8 |
| `ledAddT` | 22 | Nutempkite ant spintelės — prie jos apačios, viršaus ar šono | Drag onto a cabinet — near its bottom, top or a side |
| `ledAdded` | 22 | LED pridėtas: {w} | LED added: {w} |
| `ledMiss` | 22 | Paleiskite ant spintelės (vaizdas iš priekio) | Drop it on a cabinet (front view) |
| `rmLeds` | 22 | LED | LED |
| `visT` | 22 | Matomi šonai (iš fasado medžiagos) | Visible sides (in the front material) |
| `sideFull` | 22 | Šonai per visą aukštį (dengia viršų ir dugną) | Full-height sides (covering the top and the bottom) |
| `topMount` | 22 | Viršus | Top |
| `topOn` | 22 | Ant šonų | On the sides |
| `topInside` | 22 | Tarp šonų | Between the sides |
| `visL` | 22 | Kairys | Left |
| `visR` | 22 | Dešinys | Right |
| `visB` | 22 | Apačia | Bottom |
| `visNote` | 22 | Pažymėtas šonas pjaunamas iš fasado medžiagos ir aplijuojamas fasado … | A ticked side is cut from the front material with the front edging; the others stay in the carcass … |
| `fridgeSec` | 22 | Integruojamas šaldytuvas | Integrated fridge |
| `fridgeN` | 22 | Fasadai | Fronts |
| `fridge1` | 22 | 1 — vien šaldytuvas | 1 — fridge only |
| `fridge2` | 22 | 2 — šaldytuvas ir šaldiklis | 2 — fridge and freezer |
| `fridgeNiche` | 23 | Niša ≈ {h} × {w} mm | Niche ≈ {h} × {w} mm |
| `fridgeNote` | 23 | Fasadai tvirtinami prie šaldytuvo durų — be lankstų. Sekcijos aukštis… | The fronts are screwed to the fridge's own doors — no hinges. Section height = niche height + 2 boa… |
| `pDish` | 23 | Indaplovės fasadas | Dishwasher front |
| `pEmpty` | 23 | Tuščia (lentynos) | Empty (shelves) |
| `pBox` | 23 | 3D konstrukcija | 3D construction |
| `bxS1l` | 24 | Išoriniai matmenys. Plokštes dėliokite modelyje (▣ Plokštės) arba žem… | Outer size. Place the boards in the model (▣ Boards) or below. |
| `bxS2` | 24 | Plokštės | Boards |
| `bxS2l` | 24 | Kurios plokštės yra, kiek įleistos ir kuri kurią dengia kampuose. | Which boards there are, how far they are set in, and which covers which at the corners. |
| `bxS3` | 24 | Vidus | Inside |
| `bxS3l` | 24 | Pertvaros — per visą aukštį tarp apačios ir viršaus; lentynos — skyri… | Partitions run the full height between bottom and top; shelves sit in one compartment. |
| `bxS4` | 24 | Jungtys | Joints |
| `bxS4l` | 24 | Kiekvienas galas, atsiremiantis į kitos plokštės plokštumą, sujungiam… | Every end that meets another board's face is joined — type, count and positions per joint. |
| `bx_bottom` | 25 | Apačia | Bottom |
| `bx_top` | 25 | Viršus | Top |
| `bx_left` | 25 | Kairė | Left |
| `bx_right` | 25 | Dešinė | Right |
| `bx_back` | 25 | Nugara | Back |
| `bx_front` | 25 | Priekis | Front |
| `bxInset` | 25 | Įleista | Set in |
| `bxT` | 25 | Storis | Thickness |
| `bxCorners` | 25 | Kampai — kuri plokštė dengia kurią | Corners — which board covers which |
| `bxCovers` | 25 | dengia | covers |
| `bxForced` | 25 | įleista plokštė visada viduje | a set-in board always sits inside |
| `bxWith` | 25 | su | with |
| `bxS5` | 26 | Durys ir stalčiai | Doors and drawers |
| `bxS5l` | 26 | Angos tarp plokščių: pasirinkite skyrių ir angą, durys ar stalčiai. U… | Openings between boards: pick the compartment and the opening, doors or drawers. An overlay front c… |
| `bxAddDoors` | 26 | ＋ Durys | ＋ Doors |
| `bxAddDrawers` | 26 | ＋ Stalčiai | ＋ Drawers |
| `bxFCol` | 26 | Skyrius | Compartment |
| `bxFCell` | 26 | Anga (iš apačios) | Opening (from the bottom) |
| `bxFSpan` | 26 | Angų aukštyn | Openings high |
| `bxFFit` | 26 | Fasadas | Front |
| `bxOverlay` | 26 | Užeinantis | Overlay |
| `bxFInset` | 26 | Įleistas | Inset |
| `bxNoFronts` | 26 | Durų ir stalčių nėra — konstrukcija atvira. | No doors or drawers — the construction is open. |
| `bxNoOpen` | 26 | Angų nėra: įjungus priekio plokštę konstrukcija uždara. | No openings: with the front board on, the construction is closed. |
| `bxNoOpen2` | 26 | Šiame skyriuje angų nėra — pasirinkite kitą skyrių. | This compartment has no opening — choose another compartment. |
| `bxFrontOff` | 26 | priekio plokštė išjungta — vietoj jos durys / stalčiai | front board switched off — doors / drawers instead |
| `bxAddShelf` | 26 | ＋ Lentyna | ＋ Shelf |
| `bxAddPart` | 26 | ＋ Pertvara | ＋ Partition |
| `bxShelf` | 26 | Lentyna | Shelf |
| `bxPart` | 26 | Pertvara | Partition |
| `bxZ` | 26 | Aukštis (apačia) | Height (underside) |
| `bxX` | 26 | Nuo kairės (centras) | From the left (centre) |
| `bxCol` | 26 | Skyrius | Compartment |
| `bxAdj` | 26 | Ant laikiklių | On pins |
| `bxFixed` | 26 | Fiksuota | Fixed |
| `bxRm` | 26 | Pašalinti | Remove |
| `bxPinRow` | 26 | Laikiklių eilė (po 2 skyles aukščiau ir žemiau) | Pin row (2 more holes above and below) |
| `bxNoInner` | 26 | Vidinių plokščių nėra. | No inner boards. |
| `bxDefJ` | 26 | Numatyta jungtis | Default joint |
| `bxTph` | 26 | kaip korpusas | as carcass |
| `bx3d` | 26 | ▣ Dėlioti modelyje | ▣ Place in the model |
| `s1` | 27 | Matmenys | Dimensions |
| `s1l` | 27 | Karkaso išoriniai matmenys milimetrais, be kojelių. Galima rašyti 600… | Outer carcass size in millimetres, without legs. You can type 600-18. |
| `name` | 28 | Pavadinimas | Name |
| `type` | 28 | Tipas | Type |
| `tBase` | 28 | Pastatoma | Base |
| `tWall` | 28 | Pakabinama | Wall |
| `tTall` | 28 | Aukšta | Tall |
| `W` | 28 | Plotis | Width |
| `H` | 28 | Aukštis | Height |
| `D` | 28 | Gylis | Depth |
| `thick` | 28 | Plokštė | Board |
| `facT` | 28 | Fasadas | Front |
| `dishW` | 28 | Indaplovės plotis | Dishwasher width |
| `s2` | 29 | Sekcijos | Sections |
| `s2l` | 29 | Viršus sąrašo viršuje. „Likęs“ — užima likusį aukštį. | Top of the list is the top of the cabinet. “Fill” takes the remaining height. |
| `zone` | 30 | Fasadų zona | Front zone |
| `used` | 30 | užimta | used |
| `left` | 30 | liko | left |
| `over` | 30 | viršyta | exceeded |
| `kDrawers` | 31 | Stalčiai | Drawers |
| `kDoors` | 31 | Durys | Doors |
| `kCargo` | 31 | Cargo | Cargo |
| `cargoHw` | 31 | Cargo furnitūra | Cargo fitting |
| `kOpen` | 31 | Lentynos | Shelves |
| `kOven` | 31 | Orkaitė | Oven |
| `secH` | 32 | Aukštis | Height |
| `fill` | 32 | Likęs | Fill |
| `nDr` | 32 | Stalčių | Drawers |
| `runner` | 32 | Bėgeliai | Runners |
| `rail` | 32 | Bėgelio ilgis | Runner length |
| `nDoors` | 32 | Durų | Doors |
| `split` | 32 | Išdėstymas | Layout |
| `sSide` | 32 | Šalia | Side by side |
| `sStack` | 32 | Viena virš kitos | Stacked |
| `hinge` | 33 | Lankstai | Hinges |
| `hingeN` | 33 | Lankstų durims | Hinges per door |
| `rGtv` | 33 | GTV guoliniai H45 | GTV ball-bearing H45 |
| `rDtcU` | 33 | DTC paslėpti (D-Motion) | DTC undermount (D-Motion) |
| `rDtc` | 33 | DTC guoliniai H45 | DTC ball-bearing H45 |
| `cargoNote` | 33 | Cargo ištraukiamas: vienas fasadas ant cargo rėmo, be lankstų ir lent… | Cargo pull-out: one front on the cargo frame, no hinges or shelves; fitting — a cargo for a {w} mm … |
| `mvH` | 33 | MERIVOBOX aukštis | MERIVOBOX height |
| `mvAuto` | 33 | Auto (N / M / E su galerija) | Auto (N / M / E with gallery) |
| `mvExt` | 33 | E aukštis | E height |
| `mvRail` | 33 | Galerija (turėklai) | Gallery (railing) |
| `mvBoxcap` | 33 | BOXCAP (aukštas šonas) | BOXCAP (high side) |
| `mDrw` | 33 | Stalčių dugnas / galas (16 mm) | Drawer base / back (16 mm) |
| `hside` | 33 | Lankstų pusė | Hinge side |
| `hsAuto` | 33 | Auto | Auto |
| `hsL` | 33 | Kairė | Left |
| `hsR` | 33 | Dešinė | Right |
| `shelves` | 33 | Lentynų | Shelves |
| `adj` | 33 | Kilnojamos | Adjustable |
| `fixed` | 33 | Fiksuotos | Fixed |
| `sup` | 33 | Atramų | Supports |
| `add` | 34 | Pridėti viršuje | Add on top |
| `up` | 34 | Aukštyn | Up |
| `down` | 34 | Žemyn | Down |
| `rm` | 34 | Pašalinti | Remove |
| `s3` | 35 | Konstrukcija | Construction |
| `s3l` | 35 | Kaip sujungiamas karkasas. | How the carcass is joined. |
| `jConf` | 36 | Konfirmatai | Confirmats |
| `jConfD` | 36 | Ø8 kiaurai + Ø5×32 krašte. Juostos ir dugnas per konfirmatus. | Ø8 through + Ø5×32 in the edge. Rails and bottom fixed with confirmats. |
| `jCam` | 36 | Ekscentrikai + kaiščiai | Cams + dowels |
| `jCamD` | 36 | Ø15 ekscentrikai šone, Ø8 varžtai ir kaiščiai. Surenkama be klijų. | Ø15 cams in the side, Ø8 bolts and dowels. Assembled without glue. |
| `top` | 37 | Viršus | Top |
| `topRails` | 37 | Juostos | Rails |
| `topFull` | 37 | Pilnas viršus | Full top |
| `topOver` | 37 | Viršus dengia fasadus | Top covers the fronts |
| `back` | 38 | Nugara (18 mm) | Back (18 mm) |
| `bNone` | 38 | Nėra | None |
| `bTop` | 38 | Išorėje — ant galo | Outside — on the back edges |
| `bIn` | 38 | Viduje — tarp šonų | Inside — between the sides |
| `jTitle` | 39 | Jungtys pagal detales | Joints by part |
| `jLead` | 39 | Kiekvienai jungčiai galima parinkti savo tvirtinimą. Kiekis — jungčių… | Each joint can have its own connector. Count — connectors along one end; from edge — distance of th… |
| `jtConf` | 40 | Konfirmatai | Confirmats |
| `jtCam` | 40 | Ekscentrikai | Cams |
| `jtDowel` | 40 | Kaiščiai | Dowels |
| `jN` | 40 | Kiekis | Count |
| `jE` | 40 | Nuo krašto | From edge |
| `jAuto` | 40 | standartas | standard |
| `jMain` | 40 | Pagrindinis jungimas | Main joinery |
| `jMainL` | 40 | Taikomas visoms jungtims, kurių nekeitėte. | Used for every joint you have not changed. |
| `jk_bottom` | 41 | Dugnas ↔ šonai | Bottom ↔ sides |
| `jk_top` | 41 | Viršus ↔ šonai | Top ↔ sides |
| `jk_railF` | 41 | Priekinė juosta | Front rail |
| `jk_railB` | 41 | Galinė juosta | Back rail |
| `jk_railV` | 41 | Stati galinė juosta | Standing back rail |
| `jk_railBottom` | 41 | Apatinė juosta | Bottom rail |
| `jk_railVH` | 41 | Stati juosta ↔ gulsčia | Standing rail ↔ flat rail |
| `jk_railBotB` | 41 | Apatinė juosta ↔ dugnas | Bottom rail ↔ bottom |
| `jk_back` | 41 | Nugara | Back |
| `jk_shelf` | 41 | Fiksuotos lentynos | Fixed shelves |
| `jk_oven` | 41 | Orkaitės atramos | Oven supports |
| `lgConf` | 42 | konfirmatas | confirmat |
| `lgCam` | 42 | ekscentrikas | cam |
| `lgDowel` | 42 | kaištis | dowel |
| `xSideL` | 42 | kairysis šonas, žiūrint iš kairės | left side, seen from the left |
| `xSideR` | 42 | dešinysis šonas, žiūrint iš dešinės | right side, seen from the right |
| `sideL` | 42 | Kairys šonas | Left side |
| `sideR` | 42 | Dešinys šonas | Right side |
| `rails` | 43 | Surišimo juostos | Top rails |
| `rFront` | 43 | Priekyje | Front |
| `rBack` | 43 | Gale | Back |
| `rBottom` | 43 | Apačioje gale | Bottom back |
| `rBottomD` | 43 | stati juosta ant dugno | standing rail on the bottom |
| `rFlat` | 43 | Gulsčia | Flat |
| `rStand` | 43 | Stati | Standing |
| `rBoth` | 43 | Gulsčia + stati | Flat + standing |
| `rNone` | 43 | Nėra | None |
| `rW` | 43 | Juostos plotis | Rail width |
| `rCount` | 43 | Juostų | Rails |
| `bFix` | 44 | Nugaros tvirtinimas | Back fixing |
| `bFixIn` | 44 | Nugara viduje tvirtinama tuo pačiu būdu kaip karkasas. | An inside back is fixed the same way as the carcass. |
| `xsec` | 44 | Šoninis pjūvis | Side section |
| `xFront` | 44 | priekis | front |
| `xBack` | 44 | galas | back |
| `tbMark` | 45 | Žymės Ø5 (varžtams) | Ø5 marks (screws) |
| `tbHole` | 45 | Skylės Ø10 (reikia Ø10 grąžto) | Ø10 holes (needs a Ø10 drill) |
| `oTbDm` | 45 | Fasado tvirtinimo vietos pažymimos Ø5 × 2 mm — prisukama varžtais. Ø1… | Front-fixing points marked Ø5 × 2 mm — screwed on. There is no Ø10 drill on the head. |
| `s6` | 46 | Papildomos detalės | Extra parts |
| `s6l` | 46 | Detalės, kurių nėra konstrukcijoje: cokolis, apdailos plokštė, papild… | Parts that are not in the construction: plinth, cover panel, extra shelf… Cut only, no holes. |
| `exName` | 47 | Pavadinimas | Name |
| `exAdd` | 47 | Detalė | Part |
| `exNone` | 47 | Papildomų detalių nėra. | No extra parts. |
| `exEdges` | 47 | Kraštai | Edges |
| `exPlinth` | 47 | Cokolis | Plinth |
| `rotHint` | 48 | ↻ — antra programa su ta pačia puse viršuje, plokštė pasukta 90° prie… | ↻ — second program with the same face up, panel turned 90° counter-clockwise (the front edge become… |
| `setRails` | 49 | Juostos ir nugara | Rails and back |
| `drillsTop` | 49 | Grąžtai galvoje (viršus), mm | Drills on the head (top), mm |
| `drillsTopL` | 49 | Iš Maestro konfigūracijos. Skylės, kurių skersmens čia nėra, neprogra… | From the Maestro configuration. Holes of a size not listed are not programmed. |
| `tbHoleSet` | 49 | TANDEMBOX fasado skylė (jei Ø) | TANDEMBOX front hole (if Ø) |
| `tbDef` | 49 | TANDEMBOX fasadai | TANDEMBOX fronts |
| `s4` | 50 | Papildomos operacijos | Extra operations |
| `s4l` | 50 | Pažymėkite, ką gręžti CNC. „Patikrinta“ — sutampa su jūsų SWOOD model… | Tick what the CNC should drill. “Verified” means it matches your SWOOD models. |
| `oLegs` | 51 | Kojelės ir jų žymės dugne | Legs and their marks in the bottom |
| `oLegsD` | 51 | 4 žymės Ø5 × 2 mm kiekvienai kojelei. Plačiai ar sunkiai spintelei pr… | 4 marks Ø5 × 2 mm per leg. Add more legs for a wide or heavy cabinet. |
| `legRow` | 51 | Kojelių eilėje | Legs in a row |
| `ebFac` | 51 | Matoma detalė — kraštai pagal fasadą (etiketėje „PAGAL FASADA“) | Visible part — edges as the fronts (label: PAGAL FASADA) |
| `ebTitle` | 51 | Laminuojami kraštai | Banded edges |
| `ebLead` | 51 | spustelėkite kraštą — įjungti / išjungti (kaip etiketėje) | click an edge to switch it on / off (as on the label) |
| `ebStd` | 51 | Standartiniai | Standard |
| `ebT` | 51 | Kraštas | Edge |
| `ebNoMat` | 51 | Kraštas pažymėtas, bet kraštinės medžiaga nenurodyta (Medžiagos) — et… | Edge marked, but no edge band material is set (Materials) — the label will say "KRAŠTAS" |
| `supL` | 51 | Atramos | Supports |
| `feetRow` | 51 | Pėdutės | Feet |
| `feetTotal` | 51 | Iš viso pėdučių | Feet in total |
| `supLegs` | 51 | Kojelės | Legs |
| `supFeet` | 51 | Pėdutės | Feet |
| `supNone` | 51 | Nėra | None |
| `supEdit` | 51 | Nustatymai | Settings |
| `feetNote` | 51 | Pėdutė Ø15 po šonu · skylė Ø8 × 10 · 50 nuo priekio ir galo | Foot Ø15 under a side · hole Ø8 × 10 · 50 from the front and back |
| `feetParts` | 51 | Po šonais ir pertvaromis | Under the sides and partitions |
| `feetSides` | 51 | Tik po šonais | Under the sides only |
| `oFeet` | 51 | Pėdutės po šonais | Feet under the sides |
| `oFeetD` | 51 | Ø15 pėdutės po šonais: Ø8 × 10 skylė šono apačioje (arba dugno apačio… | Ø15 feet under the sides: a Ø8 × 10 hole in the side bottom edge (or in the bottom underside below … |
| `botMount` | 51 | Dugnas | Bottom |
| `botUnder` | 51 | Po šonais | Under the sides |
| `botInside` | 51 | Tarp šonų | Between the sides |
| `botZ` | 51 | Dugno aukštis nuo apačios | Bottom height from below |
| `botD` | 51 | Dugno gylis | Bottom depth |
| `botDFull` | 51 | visas | full |
| `botDGap` | 51 | gale ≈ {g} mm laisva — vamzdžiams | ≈ {g} mm free at the back — for the pipes |
| `shPosT` | 51 | Lentynų aukščiai | Shelf heights |
| `shPosN` | 51 | nuo sekcijos apačios iki lentynos vidurio, mm · tuščias — tolygiai | from the section bottom to the shelf middle, mm · empty — spread evenly |
| `shPosEven` | 51 | Tolygiai | Evenly |
| `fhTitle` | 51 | Fasadų aukščiai, mm | Front heights, mm |
| `fhNote` | 51 | iš viršaus · tuščias = dalijasi likusį aukštį | from the top · empty = shares what is left |
| `fhEqual` | 51 | Vienodi | Equal |
| `legParts` | 51 | Po pertvaromis | Under partitions |
| `legRows` | 51 | Eilės | Rows |
| `legRows2` | 51 | 2 — priekis, galas | 2 — front, back |
| `legRows3` | 51 | 3 — + vidurys | 3 — + middle |
| `legTotal` | 51 | Iš viso kojelių | Legs in total |
| `legFront` | 51 | priekis | front |
| `legDense` | 51 | Per tankiai — tarp kojelių būtų mažiau nei 70 mm | Too dense — less than 70 mm between legs |
| `oRun` | 52 | Bėgelių žymės šonuose | Runner marks in the sides |
| `oRunD` | 52 | Blum TANDEM / TANDEMBOX šablonai pagal stalčių aukštį. | Blum TANDEM / TANDEMBOX patterns at each drawer height. |
| `oTb` | 53 | TANDEMBOX fasadų tvirtinimas | TANDEMBOX front fixing |
| `oTbD` | 53 | Ø10 × 12 skylės fasado vidinėje pusėje. | Ø10 × 12 holes on the inside of the front. |
| `oHinge` | 54 | Lankstų skylės | Hinge holes |
| `oHingeD` | 54 | Ø35 puodelis duryse su 2 varžtų žymėmis (Ø5 × 2) + 2 plokštelės žymės… | Ø35 cup in the door with 2 screw marks (Ø5 × 2) + 2 plate marks in the side (Ø5 × 2, as the post-pr… |
| `hfScrew` | 55 | Prisukamas (+2 žymės Ø5 × 2) | Screw-on (+2 marks Ø5 × 2) |
| `hfPress` | 55 | Įspaudžiamas (+2 × Ø8) | Press-in (+2 × Ø8) |
| `oPins` | 56 | Lentynų laikiklių skylės | Shelf support holes |
| `oPinsD` | 56 | Ø5 skylės abiejuose šonuose po kiekviena kilnojama lentyna. | Ø5 holes in both sides under every adjustable shelf. |
| `pinShelf` | 57 | Tik po lentyna | Under the shelf only |
| `pinRow` | 57 | Eilė ±2 kas 32 | Row ±2 at 32 |
| `notNeeded` | 58 | šiai spintelei nereikia | not needed for this cabinet |
| `verified` | 58 | patikrinta | verified |
| `unverified` | 58 | nepatikrinta | unverified |
| `s5` | 59 | Medžiagos ir kraštai | Materials and edges |
| `s5l` | 59 | Pavadinimai keliauja į detalių sąrašą ir nesting programą. | Names go to the part list and the nesting app. |
| `colTooWide` | 60 | Kolonų pločiai netelpa į spintelės plotį — kolonos padalintos po lygi… | The column widths do not fit the cabinet width — the columns are split equally |
| `numBad` | 60 | Netinkamas skaičius | Not a number |
| `numRange` | 60 | Leidžiama {a}–{b} | Allowed {a}–{b} |
| `numSome` | 60 | Kai kurios reikšmės nebuvo skaičiai — praleistos | Some values were not numbers — left out |
| `perLenBad` | 60 | Patikrinkite formatą: „450: 35,195,420; 500: 35,227,470“ | Check the format: “450: 35,195,420; 500: 35,227,470” |
| `wtWallNote` | 60 | Tai pakabinama spintelė — ar tikrai reikia stalviršio? Jis bus detali… | This is a wall cabinet — does it really need a worktop? It goes into the part list. |
| `wtL` | 60 | Stalviršis | Worktop |
| `wtNo` | 60 | Nėra | None |
| `wtYes` | 60 | Yra | Yes |
| `wtMat` | 60 | Stalviršio medžiaga | Worktop material |
| `wtT` | 60 | Storis | Thickness |
| `wtOver` | 60 | Už fasadų | Past the fronts |
| `wtLeft` | 60 | Kairėje už šono | Past the left side |
| `wtRight` | 60 | Dešinėje už šono | Past the right side |
| `wtEdge` | 60 | Stalviršio kraštas | Worktop edge |
| `wtSize` | 60 | Stalviršis | Worktop |
| `wtNote` | 60 | Gretimų spintelių stalviršiai (Baldų skirtuke vienas šalia kito, ta p… | Worktops of cabinets standing side by side in the Furniture tab (same material and thickness) are j… |
| `setWt` | 60 | Stalviršių sąrašas | Worktop list |
| `mCarc` | 60 | Karkasas | Carcass |
| `mFac` | 60 | Fasadai | Fronts |
| `mBack` | 60 | Nugara | Back |
| `eCarc` | 60 | Karkaso kraštas | Carcass edge |
| `eFac` | 60 | Fasado kraštas | Front edge |
| `legH` | 60 | Kojelių aukštis | Leg height |
| `sketch` | 61 | Eskizas | Sketch |
| `parts` | 61 | Detalių | Parts |
| `progs` | 61 | Programų | Programs |
| `warns` | 61 | Pastabos | Notes |
| `toRes` | 61 | Detalės ir CNC → | Parts & CNC → |
| `noCab` | 62 | Projekte dar nėra spintelių. | No cabinets in this project yet. |
| `firstCab` | 62 | Sukurkite pirmą spintelę | Create the first cabinet |
| `rTitle` | 63 | Detalių sąrašas ir CNC programos | Part list and CNC programs |
| `zipAll` | 63 | ⤓ Viskas (ZIP) | ⤓ Everything (ZIP) |
| `xlsm` | 63 | Sąrašas .xlsx | List .xlsx |
| `csv` | 63 | Sąrašas .csv | List .csv |
| `print` | 63 | Spausdinti sąrašą | Print list |
| `json` | 63 | Projektas .json | Project .json |
| `zipNote` | 64 | ZIP: visos .XXL programos, .xlsx sąrašas nesting programai (kaip DB_P… | ZIP: all .XXL programs, the .xlsx list for the nesting app (like a DB_PartList v20 report), a .csv … |
| `cDet` | 65 | Detalė | Part |
| `cCab` | 65 | Sp. | Cab. |
| `cMat` | 65 | Medžiaga | Material |
| `cL` | 65 | Ilgis | Length |
| `cW` | 65 | Plotis | Width |
| `cT` | 65 | Stor. | Thk. |
| `cQ` | 65 | Kiek. | Qty |
| `cEdge` | 65 | Kraštai | Edges |
| `cProg` | 65 | Programos | Programs |
| `noProg` | 66 | be CNC | no CNC |
| `pick` | 66 | Pasirinkite detalę — pamatysite brėžinį ir programą. | Pick a part to see its drawing and program. |
| `lgA` | 67 | iš viršaus | from top |
| `lgB` | 67 | iš apačios (2OP) | from below (2OP) |
| `lgT` | 67 | kiaurai | through |
| `lgM` | 67 | žymė | mark |
| `lgE` | 67 | krašte | in edge |
| `lgEb` | 67 | briauna | edgeband |
| `copy` | 68 | Kopijuoti | Copy |
| `copied` | 68 | Nukopijuota | Copied |
| `hw` | 68 | Furnitūra | Hardware |
| `hwNote` | 68 | Kiekiai iš konstrukcijos — patikrinkite prieš užsakydami. | Quantities come from the construction — check before ordering. |
| `allWarn` | 69 | Pastabos | Notes |
| `none` | 69 | Nėra | None |
| `setTitle` | 70 | Nustatymai | Settings |
| `setLead` | 70 | Taikoma visiems projektams šioje naršyklėje. | Applies to every project in this browser. |
| `tplTitle` | 71 | ReportLists šablonas | ReportLists template |
| `tplLead` | 71 | Sąrašas .xlsx pildomas į šį šabloną taip pat, kaip SolidWorks makroko… | The .xlsx list is filled into this template the same way the SolidWorks macro DB_PartList v20 does:… |
| `tplBuiltIn` | 72 | Įdiegtas: ReportLists šablonas (DiG_Virtuve ataskaita), pildomas kaip… | Built in: ReportLists template (DiG_Virtuve report), filled as DB_PartList v20 |
| `tplOwn` | 72 | Jūsų šablonas:  | Your template:  |
| `tplUpload` | 72 | Įkelti kitą ataskaitą (.xlsm / .xlsx) | Load another report (.xlsm / .xlsx) |
| `tplReset` | 72 | Grąžinti įdiegtą | Back to built-in |
| `tplBad` | 72 | Tai ne ReportLists ataskaita — nėra PARTLIST ir LABEL lapų. | This is not a ReportLists report — there are no PARTLIST and LABEL sheets. |
| `tplOk` | 72 | Šablonas pakeistas | Template changed |
| `tplSession` | 72 | Šablonas naudojamas tik šiai sesijai (naršyklė neleido išsaugoti). | Template used for this session only (the browser would not store it). |
| `rptFallback` | 73 | ReportLists šablono nepavyko užkrauti (reikia interneto JSZip bibliot… | The ReportLists template could not be loaded (JSZip needs internet) — a plain list was made instead. |
| `building` | 73 | Ruošiama… | Preparing… |
| `setMats` | 74 | Medžiagų sąrašas | Material list |
| `setEdges` | 74 | Kraštų sąrašas | Edgeband list |
| `setMatsL` | 74 | Po vieną eilutėje — bus siūloma pildant. | One per line — offered while filling in. |
| `setTypes` | 75 | Numatyta konstrukcija pagal tipą | Default construction per type |
| `setTypesL` | 75 | Naujai spintelei parenkama pagal tipą. Darbuotojui keisti nereikės. | A new cabinet gets these by type. The workshop does not need to change them. |
| `setOps` | 76 | Numatytos operacijos | Default operations |
| `setRules` | 76 | Lankstų ir lentynų skylių matmenys | Hinge and shelf hole dimensions |
| `setRulesL` | 77 | Nepatikrinta su jūsų SWOOD modeliu. Patikrinkite pirmas duris ir šoną… | Not verified against your SWOOD model. Check the first door and side, then correct here. |
| `rCupE` | 78 | Puodelio centras nuo durų krašto | Cup centre from the door edge |
| `rCupD` | 78 | Puodelio gylis | Cup depth |
| `rEnd` | 78 | Kraštinis lankstas nuo durų galo | Outer hinge from the door end |
| `rPlF` | 78 | Plokštelė nuo šono priekio | Plate from the side front |
| `rPlS` | 78 | Plokštelės skylių atstumas | Plate hole spacing |
| `rPlD` | 78 | Plokštelės skylės gylis | Plate hole depth |
| `rPinF` | 79 | Laikiklis nuo šono priekio | Support from the side front |
| `rPinB` | 79 | Laikiklis nuo lentynos galo | Support from the shelf back |
| `rPinBelow` | 79 | Skylės centras žemiau lentynos | Hole centre below the shelf |
| `rPinD` | 79 | Laikiklio skylės gylis | Support hole depth |
| `rPitch` | 79 | Eilės žingsnis | Row pitch |
| `resetRules` | 80 | Atstatyti katalogo reikšmes | Reset to catalogue values |
| `rulesReset` | 80 | Lankstų ir lentynų laikiklių reikšmės atstatytos | Hinge and shelf-support values reset |
| `prTitle` | 81 | Projektai | Projects |
| `prSave` | 81 | Išsaugoti šį projektą | Save this project |
| `prNew` | 81 | ＋ Naujas projektas | ＋ New project |
| `prOpen` | 81 | Atverti | Open |
| `prNone` | 81 | Išsaugotų projektų nėra. | No saved projects. |
| `prImport` | 82 | Įkelti .json | Import .json |
| `prImportL` | 82 | Šio kūrėjo projektas arba pasiūlymo programos (offer) eksportas — spi… | A project from this creator or an export from the offer app — cabinets come across with sizes and s… |
| `prHint` | 83 | Projektai laikomi šioje naršyklėje. Atsarginei kopijai — „Projektas .… | Projects are stored in this browser. For a backup use “Project .json”. |
| `close` | 84 | Uždaryti | Close |
| `saved` | 84 | Išsaugota | Saved |
| `imported` | 84 | Įkelta spintelių:  | Cabinets imported:  |
| `badFile` | 84 | Nepavyko perskaityti failo — tai ne projekto JSON. | Could not read the file — it is not a project JSON. |
| `dlFail` | 85 | Atsisiųsti nepavyko:  | Download failed:  |
| `dlDeclined` | 85 | Atsisiuntimas atšauktas | Download cancelled |
| `newConfirm` | 85 | Pradėti naują? Spauskite dar kartą | Start new? Click again |
| `errTag` | 86 | klaida | error |
| `warnTag` | 86 | patikrinti | check |
| `infoTag` | 86 | rankomis | by hand |
| `legs` | 87 | kojelės | legs |
| `isoTitle` | 88 | Jungtys 3D | Joints in 3D |
| `isoLead` | 88 | tempkite jungtis ant karkaso | drag connectors onto the carcass |
| `isoDrag` | 88 | Paimkite jungtį ir nutempkite ant punktyrinės jungties linijos 3D vai… | Pick up a connector and drop it on a dashed joint line in the 3D view (or tap the card, then the li… |
| `isoChipT` | 88 | Tempkite ant punktyrinės jungties linijos 3D vaizde arba bakstelėkite… | Drag onto a dashed joint line in the 3D view, or tap it and then tap the line |
| `isoT_confirmat` | 89 | Konfirmatas | Confirmat |
| `isoT_cam` | 89 | Ekscentrikas | Cam |
| `isoT_dowel` | 89 | Kaištis | Dowel |
| `isoRotL` | 90 | Pasukti 90° į kairę | Turn 90° left |
| `isoRotR` | 90 | Pasukti 90° į dešinę | Turn 90° right |
| `isoHome` | 90 | Grąžinti vaizdą iš priekio-kairės | Back to the front-left view |
| `isoHomeS` | 90 | Vaizdas | View |
| `isoUndo` | 90 | Atšaukti | Undo |
| `isoUndone` | 90 | Atšaukta | Undone |
| `isoFront` | 91 | ▼ PRIEKIS | ▼ FRONT |
| `isoJoints` | 91 | Karkaso jungtys | Carcass joints |
| `isoManual` | 91 | rankinės vietos | placed by hand |
| `isoManualS` | 91 | rankinės | by hand |
| `isoEdit` | 91 | Keisti 3D | Edit in 3D |
| `isoHint` | 92 | Tempkite jungtį iš viršaus ant linijos — pridėsite. „Atskirai“ — keič… | Drag a connector from the bar onto a line to add it. “Separately” — only the side you drag on chang… |
| `isoRefFront` | 93 | nuo priekio | from the front |
| `isoRefBack` | 93 | nuo galo | from the back |
| `isoRefRail` | 93 | nuo juostos apačios | from the rail bottom |
| `isoRefBottom` | 93 | nuo dugno viršaus | from the bottom top face |
| `isoRefShelf` | 93 | nuo lentynos priekio | from the shelf front |
| `isoRefLeft` | 93 | nuo kairės pusės | from the left end |
| `isoOneLine` | 93 | viena jungtis | one joint |
| `isoRefPartF` | 93 | nuo juostos priekio | from the rail front |
| `isoRefPartR` | 93 | nuo juostos galo | from the rail back |
| `isoSnapMid` | 94 | vidurys | centre |
| `isoSnapSym` | 94 | simetriškai | symmetric |
| `isoSnapStd` | 94 | standartas | standard |
| `isoDropRemove` | 95 | Paleiskite — jungtis bus pašalinta | Release to remove this connector |
| `isoTooClose` | 95 | Per arti kitos jungties (min. {n} mm) | Too close to another connector (min. {n} mm) |
| `isoTurn` | 95 | Pasukite vaizdą — linija matoma galu | Turn the view — this line is seen end-on |
| `isoSame` | 96 | Šis tipas jau yra — tempkite ant tuščios linijos vietos | Already this type — drop on an empty part of the line |
| `isoConvert` | 96 | Paleiskite — visa jungtis taps: {t} | Release — the whole joint becomes: {t} |
| `isoAdd` | 96 | Paleiskite — pridėti jungtį | Release to add a connector |
| `isoAddConv` | 96 | Pridėti; visa jungtis taps: {t} | Add; the whole joint becomes: {t} |
| `isoMiss` | 97 | Paleiskite ant punktyrinės jungties linijos | Release on a dashed joint line |
| `isoRemoved` | 97 | Jungtis pašalinta | Connector removed |
| `isoRm` | 97 | Pašalinti jungtį | Remove connector |
| `isoPos` | 98 | Vietos, mm | Positions, mm |
| `isoNone` | 98 | Nėra nė vienos jungties — mazgas nesurištas. | No connectors — this joint is not held. |
| `isoAddBtn` | 98 | Pridėti | Add |
| `isoEven` | 98 | Išdėstyti tolygiai | Spread evenly |
| `isoLen` | 99 | Jungties ilgis {w} mm · ne arčiau {e} mm nuo krašto, tarpas ne mažiau… | Joint length {w} mm · at least {e} mm from the edge, gap at least {g} mm. |
| `isoCamDw` | 99 | Kaiščiai Ø8 prie kraštinių ekscentrikų (±32) dedami automatiškai. | Ø8 dowels next to the outer cams (±32) are added automatically. |
| `isoMirror` | 99 | Kairys ir dešinys šonai keičiasi kartu. | Left and right sides change together. |
| `isoNoJ` | 100 | Šioje spintelėje karkaso jungčių nėra. | This cabinet has no carcass joints. |
| `isoD_confirmat` | 101 | Varžtas per šoną į detalės kraštą. Ø8 kiaurai + Ø5×32. Tvirčiausias, … | Screw through the side into the part edge. Ø8 through + Ø5×32. Strongest, the head shows. |
| `isoD_cam` | 101 | Ekscentrikas detalėje pasuktas užveržia varžtą šone. Ø15 + Ø8. Nesima… | A cam in the part, turned, pulls the bolt in the side tight. Ø15 + Ø8. Hidden, can be taken apart. |
| `isoD_dowel` | 101 | Medinis kaištis Ø8 su klijais — centruoja ir laiko. Nesimato, neišard… | Ø8 wooden dowel with glue — aligns and holds. Hidden, not taken apart. |
| `isoGrab` | 102 | ⠿ Tempkite ant jungties | ⠿ Drag onto a joint |
| `isoTapLine` | 102 | Bakstelėkite jungties liniją | Tap a joint line |
| `isoFullOn` | 102 | Atidaryti 3D per visą ekraną | Open the 3D view full screen |
| `isoFullOff` | 102 | Uždaryti visą ekraną (Esc) | Close full screen (Esc) |
| `isoFullOnS` | 102 | Visas ekranas | Full screen |
| `isoFullOffS` | 102 | Uždaryti | Close |
| `xxlTitle` | 103 | CNC programos (.XXL) | CNC programs (.XXL) |
| `xxlLead` | 103 | Kiekvieną programą galima atsisiųsti atskirai, be ZIP. ↻ — pasukta pr… | Every program can be downloaded on its own, without a ZIP. ↻ — turned program (5 mm holes in a long… |
| `xxlAll` | 104 | ⤓ Visos .XXL atskirai ({n}) | ⤓ All .XXL separately ({n}) |
| `xxlAllT` | 104 | Kiekviena programa atskiru failu, be ZIP | Each program as its own file, no ZIP |
| `xxlCab` | 104 | ⤓ Šios spintelės ({n}) | ⤓ This cabinet ({n}) |
| `xxlPart` | 104 | ⤓ Visos šios detalės ({n}) | ⤓ All of this part ({n}) |
| `xxlOne` | 104 | Atsisiųsti | Download |
| `xxlRot` | 104 | pasukta | turned |
| `xxlSaving` | 104 | Atsisiunčiama failų: {n}… | Downloading {n} files… |
| `reqNote` | 105 | privaloma — be to detalių sąraše nebus medžiagos | required — otherwise the part list has no material |
| `tRoom` | 105 | Baldai | Furniture |
| `rmTitle` | 105 | Visi baldai | All furniture |
| `rmWall` | 105 | Siena | Wall |
| `rmWalls` | 105 | Sienos | Walls |
| `rmVFront` | 105 | Iš priekio | Front |
| `rmVPlan` | 105 | Planas | Plan |
| `rmAllWalls` | 105 | Visos sienos | All walls |
| `rm3Hint` | 106 | Tempkite — sukasi. Spustelėkite spintelę — pažymite. | Drag to turn. Click a cabinet to select it. |
| `rmAdd` | 106 | Pridėti spintelę | Add a cabinet |
| `rmAddT` | 106 | Nutempkite ant sienos (vaizdas „Iš priekio“ arba „Planas“) arba spust… | Drag onto a wall (Front or Plan view) or click — it goes after the last one |
| `rmUnplaced` | 107 | Nepastatytos | Not placed |
| `rmPlace` | 107 | Pastatyti | Place |
| `rmX` | 107 | Nuo sienos pradžios | From the wall start |
| `rmZ` | 107 | Apačia nuo grindų | Bottom from the floor |
| `rmHang` | 107 | Kabo ant sienos | Hangs on the wall |
| `rmTop` | 107 | Viršus nuo grindų | Top from the floor |
| `rmTopLegs` | 107 | karkasas {h} + kojelės {l} | carcass {h} + legs {l} |
| `rmTopZ` | 107 | karkasas {h}, apačia {l} nuo grindų | carcass {h}, bottom {l} from the floor |
| `rmHitShort` | 107 | Kliūna už kitos spintelės arba išeina už sienos — patraukite arba pak… | Hits another cabinet or runs past the wall — move it or change the width. |
| `rmFill` | 108 | Užpildyti tarpą: {w} mm | Fill the gap: {w} mm |
| `rrBtn` | 109 | Realus vaizdas | Realistic image |
| `rrBtnT` | 109 | Fotorealistiškas visos patalpos vaizdas (skaičiuojamas vaizdo plokštė… | A photo-like picture of the whole room (rendered on the graphics card) |
| `rrTitle` | 109 | Realus vaizdas | Realistic image |
| `rrLoading` | 109 | Kraunamas 3D variklis… | Loading the 3D engine… |
| `rrBuilding` | 109 | Ruošiama scena… | Preparing the scene… |
| `rrProg` | 109 | Skaičiuojama: {n} / {m} | Rendering: {n} / {m} |
| `rrDone` | 109 | Paruošta · {m} kadrų | Ready · {m} samples |
| `rrRoom` | 110 | Patalpa | Room |
| `rrRoomT` | 110 | Rodyti sienas, grindis, duris ir langus (lėčiau). Išjungus — tik bald… | Show the walls, floor, doors and windows (slower). Off: the furniture alone on a light floor. |
| `rrPartF` | 110 | fasadai | fronts |
| `rrPartC` | 110 | korpusas | carcass |
| `rrPartW` | 110 | stalviršis | worktop |
| `rrPickN` | 110 | ‹ › arba klaviatūros ← → keičia medžiagą · Esc — uždaryti | ‹ › or the keyboard ← → change the material · Esc closes |
| `rrCabT` | 110 | Fotorealistiškas šios spintelės vaizdas (skaičiuojamas vaizdo plokštė… | A photo-like picture of this cabinet (rendered on the graphics card) |
| `rrQ` | 110 | Kokybė | Quality |
| `rrQ_fast` | 110 | Greitai | Fast |
| `rrQ_good` | 110 | Gerai | Good |
| `rrQ_best` | 110 | Labai gerai | Best |
| `rrDl` | 110 | Atsisiųsti PNG | Download PNG |
| `rrHint` | 110 | Tempkite į šonus — eikite aplink, aukštyn ir žemyn — akių aukštis · r… | Drag sideways to walk round, up and down for eye height · wheel to come nearer or step back · “Fast… |
| `rrNoLib` | 111 | Nepavyko įkelti 3D variklio — reikia interneto ryšio. | Could not load the 3D engine — needs an internet connection. |
| `rrNoGL` | 111 | Ši naršyklė ar kompiuteris nepalaiko WebGL 2 — realaus vaizdo padaryt… | This browser or computer has no WebGL 2 — the realistic image cannot be made. |
| `rrEmpty` | 111 | Baldų dar nėra — pastatykite spintelių ant sienų. | No furniture yet — place cabinets on the walls. |
| `pPanel` | 112 | Plokštė | Panel |
| `rmEditP` | 112 | Redaguoti plokštę | Edit panel |
| `rmAddedP` | 112 | Pridėta plokštė {n} | Panel {n} added |
| `rmPanelPush` | 112 | Paleiskite — spintelės pasislinks {n} mm | Drop — the cabinets move over {n} mm |
| `rmThick` | 112 | Storis | Thickness |
| `rmPMat` | 112 | Medžiaga | Material |
| `rmToCeil` | 112 | Iki lubų | To the ceiling |
| `rmToFloor` | 112 | Iki grindų | Down to the floor |
| `rmPanelNote` | 113 | Atskira plokštė: stovi pati, bet kokio dydžio (didelis šonas, užpilda… | A loose panel: it stands on its own, any size (a big side, a filler, a cover). Cut as a part, no ho… |
| `pnS1` | 114 | Plokštė | Panel |
| `pnS1l` | 114 | Atskira plokštė — tik pjaunama, be skylių. Kur ji stovi ir aukštį nuo… | A loose panel — only cut, no holes. Where it stands and its height from the floor are set in the Fu… |
| `pnEdges` | 114 | Kraštai | Edges |
| `pnEdgeMat` | 114 | Krašto medžiaga | Edge material |
| `pnE1` | 114 | L1 priekis | L1 front |
| `pnE2` | 114 | L2 galas | L2 back |
| `pnE3` | 114 | W1 apačia | W1 bottom |
| `pnE4` | 114 | W2 viršus | W2 top |
| `pnNote` | 115 | Storis — plokštės storis (kiek ji užima išilgai sienos), aukštis ir g… | Thickness is the board thickness (what it takes along the wall); height and depth can be anything, … |
| `rmSides` | 116 | Šoninės plokštės | Side panels |
| `rmSideL` | 116 | Kairėje | Left |
| `rmSideR` | 116 | Dešinėje | Right |
| `rmSideCab` | 116 | Kaip spintelė | As the cabinet |
| `rmSideFloor` | 116 | Iki grindų | Down to the floor |
| `rmSideRoom` | 116 | Grindys–lubos | Floor to ceiling |
| `rmSideNote` | 117 | Plokštė prie spintelės šono, iš fasado medžiagos, lygi su fasadais. P… | A board against the cabinet side, in the front material, flush with the fronts. Cut as an extra par… |
| `rmSideSpare` | 118 | Iš pasiūlymo dar nepastatyta šoninių plokščių: {n} ({s}) — ＋ jas past… | Side panels from the offer not placed yet: {n} ({s}) — ＋ places them. |
| `rmSideShort` | 118 | Šoninei plokštei trūksta {n} mm vietos — sumažinkite spintelę arba pa… | The side panel is {n} mm short of room — make a cabinet narrower or move the neighbours. |
| `rmSideMoved` | 118 | Spintelės pastumtos {n} mm, kad tilptų plokštė. | Cabinets moved {n} mm to make room for the panel. |
| `exSide` | 119 | Šoninė plokštė | Side panel |
| `exSideAdd` | 119 | Šoninė plokštė | Side panel |
| `exWhere` | 119 | Vieta | Place |
| `exSideNone` | 119 | nepastatyta | not placed |
| `exZb` | 119 | Apačia nuo spintelės dugno | Bottom from the carcass bottom |
| `exYf` | 119 | Priekis prieš korpusą | Front ahead of the carcass |
| `exSideNote` | 119 | Šoninė plokštė stovi prie spintelės šono (Baldai skirtukas: pasirinki… | A side panel stands against the cabinet side (Furniture tab: select the cabinet → ＋ Left / Right). … |
| `lookFit` | 120 | Per visą detalę | Over the whole board |
| `lookFitT` | 120 | Nuotrauka dedama per visą kiekvieną detalę (be kartojimo, kraštai apk… | The photo is laid once over each board (no repeats, the edges cropped). Off: it repeats at its real… |
| `lookPaste` | 120 | Įklijuoti | Paste |
| `lookPasteT` | 120 | Įklijuoti paveikslėlį iš iškarpinės (nukopijuotą nuotrauką arba ekran… | Paste an image from the clipboard (a copied picture or a screenshot) |
| `lookCtrlV` | 120 | Paspauskite Ctrl+V — paveikslėlis bus įklijuotas į „{n}“ | Press Ctrl+V — the image goes to “{n}” |
| `lookNoImg` | 121 | Iškarpinėje nėra paveikslėlio — nukopijuokite nuotrauką (dešinys pelė… | No image on the clipboard — copy a picture (right click → Copy image) or take a screenshot |
| `lookPick` | 121 | Kuriai medžiagai? Spauskite „Įklijuoti“ prie medžiagos, tada Ctrl+V | Which material? Press “Paste” at the material, then Ctrl+V |
| `lookT` | 122 | Išvaizda 3D vaizde | Look in the 3D views |
| `lookL` | 122 | Įkelkite plokštės dekoro nuotrauką (tekstūrą), įklijuokite ją iš iška… | Upload a photo of the board decor (texture), paste it from the clipboard (Paste or Ctrl+V), drop it… |
| `lookUp` | 122 | Įkelti tekstūrą | Upload texture |
| `lookChange` | 122 | Keisti | Change |
| `lookCol` | 122 | Spalva | Colour |
| `lookMm` | 122 | Raštas | Pattern |
| `lookRot` | 122 | Pasukti raštą 90° | Turn the pattern 90° |
| `lookRm` | 122 | Pašalinti išvaizdą | Remove the look |
| `lookBad` | 122 | Nepavyko perskaityti paveikslėlio | The image could not be read |
| `lookNone` | 122 | Medžiagų dar nėra — įrašykite jas spintelės 1 žingsnyje. | No materials yet — enter them in step 1 of a cabinet. |
| `lookFull` | 122 | Nepavyko išsaugoti — naršyklės atmintis pilna. Įkelkite mažesnę nuotr… | Could not save — the browser storage is full. Upload a smaller photo. |
| `rmEdit` | 122 | Redaguoti spintelę | Edit cabinet |
| `rmDup` | 122 | Kopija šalia | Copy next to it |
| `rmUnplace` | 122 | Nuimti nuo sienos | Take off the wall |
| `rmKeys` | 122 | ← → stumia po 10 mm (Shift — 100 mm), Delete — nuima nuo sienos. | ← → move 10 mm (Shift — 100 mm), Delete takes it off the wall. |
| `rmUsed` | 123 | užstatyta {u} mm | {u} mm used |
| `rmWallDel` | 123 | Pašalinti paskutinę sieną | Remove the last wall |
| `rmWallDelDone` | 123 | Siena pašalinta — jos spintelės perkeltos į „Nepastatytos“ | Wall removed — its cabinets moved to “Not placed” |
| `rmRoom` | 123 | Patalpa | Room |
| `rmRoomL` | 124 | Sienos eina pagal laikrodžio rodyklę, žiūrint iš viršaus: A — į dešin… | Walls run clockwise seen from above: A to the right, B down, C to the left, D up. One wall — furnit… |
| `rmWallAdd` | 125 | Pridėti sieną | Add a wall |
| `rmWallZ` | 125 | Pakabinamų apačia nuo grindų | Wall cabinets bottom from the floor |
| `rmRoomH` | 125 | Patalpos aukštis | Room height |
| `rmWorktop` | 125 | Rodyti stalviršį | Show the worktop |
| `rmProbs` | 125 | Patikrinkite | Check |
| `rmProbOut` | 126 | Spintelė {a} išeina už sienos galo | Cabinet {a} runs past the wall end |
| `rmOtherProbs` | 126 | Kitur patalpoje problemų: {n} — uždarykite (✕), kad matytumėte sąrašą | Problems elsewhere in the room: {n} — close (✕) to see the list |
| `rmWtHint` | 126 | Stalviršis rodomas spintelėms, kurioms jis įjungtas (spintelės 1 žing… | A worktop shows on cabinets that have one turned on (cabinet step 1). |
| `rmProbCeil` | 126 | Spintelė {a} aukštesnė už patalpą (lubas) | Cabinet {a} reaches above the ceiling |
| `rmBadVal` | 126 | Netinkama reikšmė — palikta ankstesnė | Not a valid value — the previous one is kept |
| `rmProbFloor` | 126 | Spintelė {a} žemiau grindų | Cabinet {a} is below the floor |
| `rmProbHit` | 126 | Spintelės {a} ir {b} kliūna viena už kitos | Cabinets {a} and {b} hit each other |
| `rmNoProbs` | 126 | Spintelės telpa ir nekliūna viena už kitos | Cabinets fit and do not hit each other |
| `rmZoom` | 127 | Mastelis | Zoom |
| `rmZoomIn` | 127 | Artinti | Zoom in |
| `rmZoomOut` | 127 | Tolinti | Zoom out |
| `rmZoomFit` | 127 | Visas vaizdas (dukart spustelėkite tuščią vietą) | Whole drawing (or double-click an empty spot) |
| `rmHint` | 128 | Spintelę tempkite išilgai sienos ar į kitą sieną — ji prisitraukia pr… | Drag a cabinet along a wall or to another wall — it snaps to the wall end, corner or neighbour. Cli… |
| `rmFromStart` | 129 | {x} mm nuo sienos pradžios | {x} mm from the wall start |
| `rmLeftRight` | 129 | kairėje {l} · dešinėje {r} | left {l} · right {r} |
| `rszH` | 129 | Tempkite — keičia aukštį | Drag — changes the height |
| `rszW` | 129 | Tempkite — keičia plotį | Drag — changes the width |
| `rszHt` | 129 | aukštis {a} → {b} | height {a} → {b} |
| `rszWd` | 129 | plotis {a} → {b} | width {a} → {b} |
| `rszTop` | 129 | viršus {t} · apačia {b} nuo grindų | top {t} · bottom {b} from the floor |
| `rszAt` | 129 | lygiai su: {w} | aligned with: {w} |
| `rszWt` | 129 | stalviršio viršus | worktop top |
| `rszCas` | 129 | apvadas | casing |
| `rszCeil` | 129 | lubos | ceiling |
| `rszWallZ` | 129 | pakabinamų aukštis | wall-unit height |
| `rmSnap_wall` | 129 | prie sienos galo | at the wall end |
| `rmSnap_corner` | 129 | prie kampo | at the corner |
| `rmSnap_nb` | 129 | prie kaimynės | at the neighbour |
| `rmSnap_op` | 129 | prie durų ar lango | at a door or window |
| `rmSnap_mid` | 129 | sienos viduryje | centred on the wall |
| `rmVisFree` | 130 | Pagal išdėstymą laisvi šonai: {s}. | From the layout, the free sides are: {s}. |
| `rmVisNone` | 130 | nėra | none |
| `rmVisFit` | 130 | Pritaikyti | Apply |
| `rmVisAll` | 130 | Matomi šonai pagal išdėstymą | Visible sides from the layout |
| `rmVisAllN` | 130 | Visoms spintelėms pažymi laisvus šonus (prie jų nieko nėra visu aukšč… | Ticks the free sides of every cabinet (nothing beside them over their full height) — they are cut f… |
| `rmVisAllDone` | 130 | Matomi šonai pažymėti pagal išdėstymą — pakeista spintelių: {n} | Visible sides set from the layout — cabinets changed: {n} |
| `rmPtAdd` | 131 | Rozetės ir vamzdžiai | Sockets and pipes |
| `ptSocket` | 131 | Rozetė | Socket |
| `ptSocket2` | 131 | Dviguba rozetė | Double socket |
| `ptCold` | 131 | Šaltas vanduo | Cold water |
| `ptHot` | 131 | Karštas vanduo | Hot water |
| `ptDrain` | 131 | Kanalizacija | Drain |
| `ptAddT` | 132 | Nutempkite ant sienos (vaizdas „Iš priekio“ — ir į aukštį) arba spust… | Drag onto a wall (in the Front view also up and down) or click |
| `ptX` | 132 | Vidurys nuo sienos pradžios | Middle from the wall start |
| `ptZ` | 132 | Aukštis nuo grindų | Height from the floor |
| `ptNote` | 133 | Matmenys — iki taško vidurio. Brėžiniuose sienos vaizde rodomi su ats… | Sizes are to the middle of the point. On the wall elevations in the drawings they are dimensioned f… |
| `ptKeys` | 134 | ← → ↑ ↓ stumia po 10 mm (Shift — 100 mm), Delete — ištrina. Vaizde „I… | ← → ↑ ↓ move it 10 mm (Shift — 100 mm), Delete removes it. In the Front view drag it sideways and u… |
| `ptProbShort` | 134 | Už spintelės šono, durų ar lango angoje, stalviršyje arba už sienos r… | Behind a cabinet side, in a door or window, at worktop height, or off the wall — move it. |
| `rmProbPtOut` | 135 | {o} už sienos ribų | {o} is off the wall |
| `rmProbPtHit` | 135 | {o} durų ar lango angoje: {p} | {o} is in an opening: {p} |
| `rmProbPtSide` | 135 | {o} už spintelės {a} šono | {o} is behind a side of cabinet {a} |
| `rmProbPtWt` | 135 | {o} stalviršio aukštyje (spintelė {a}) | {o} is at worktop height (cabinet {a}) |
| `rmOpAdd` | 136 | Durys ir langai | Doors and windows |
| `opKeys` | 136 | ← → stumia po 10 mm (Shift — 100 mm), Delete — ištrina. Tempkite — pe… | ← → moves it 10 mm (Shift — 100 mm), Delete removes it. Drag it along the wall or to another one. |
| `opDoor` | 136 | Medinės durys | Wooden door |
| `opGDoor` | 136 | Durys su stiklu | Door with glass |
| `opWin` | 136 | Langas | Window |
| `opDoorN` | 136 | Durys {n} | Door {n} |
| `opWinN` | 136 | Langas {n} | Window {n} |
| `opAddT` | 137 | Nutempkite ant sienos (vaizdas „Iš priekio“ arba „Planas“) arba spust… | Drag onto a wall (Front or Plan view) or click — it goes into a free spot |
| `opType` | 137 | Tipas | Type |
| `opW` | 137 | Angos plotis | Opening width |
| `opH` | 137 | Angos aukštis | Opening height |
| `opZ` | 137 | Palangės aukštis | Sill height |
| `opHinge` | 138 | Vyriai | Hinges |
| `opHL` | 138 | kairėje | left |
| `opHR` | 138 | dešinėje | right |
| `opSwing` | 138 | Atsidaro | Opens |
| `opIn` | 138 | į patalpą | into the room |
| `opOut` | 138 | į kitą pusę | away from the room |
| `opColor` | 138 | Spalva | Colour |
| `opNoteD` | 139 | Matmenys — anga sienoje. Durys rodomos su staktos apvadais (po 70 mm … | Sizes are the hole in the wall. A door is drawn with its casing (70 mm round the hole); the plan sh… |
| `opNoteW` | 139 | Matmenys — anga sienoje, aukštis — nuo grindų iki angos apačios. Lang… | Sizes are the hole in the wall; the sill height is from the floor to the bottom of the hole. A wind… |
| `opProbShort` | 140 | Kliūna už spintelės, kitų durų ar lango arba išeina už sienos — patra… | Hits a cabinet, another door or window, or runs past the wall — move it. |
| `opAdded` | 140 | Pridėta: {o} | Added: {o} |
| `opDeleted` | 140 | Ištrinta: {o} | Deleted: {o} |
| `opHitDrop` | 140 | Padėta, bet kliūna — žr. problemas dešinėje | Placed, but it hits something — see the problems on the right |
| `rmOpShort` | 141 | Stovi prieš duris ar langą arba trukdo duris atidaryti — patraukite. | Stands in front of a door or window, or in a door's way — move it. |
| `rmProbOpOut` | 142 | {o} išeina už sienos galo | {o} runs past the wall end |
| `rmProbOpCeil` | 142 | {o} aukštesnis už lubas | {o} is higher than the ceiling |
| `rmProbOpHit` | 142 | {o} ir {p} persidengia | {o} and {p} overlap |
| `rmProbOpBlock` | 142 | Spintelė {a} užstoja: {o} | Cabinet {a} is in front of {o} |
| `rmProbOpSwing` | 142 | Spintelė {a} trukdo atidaryti: {o} | Cabinet {a} is in the way of {o} |
| `rmHit` | 143 | Kliūna už kitos spintelės | Hits another cabinet |
| `rmHitDrop` | 143 | Pastatyta, bet kliūna — patraukite arba pakeiskite plotį | Placed, but it hits — move it or change the width |
| `rmDropAdd` | 143 | Paleiskite — pridėti čia | Release to add here |
| `rmFitTo` | 143 | Tarpe telpa {w} mm — plotis bus {w} mm | The gap is {w} mm — width will be {w} mm |
| `rmMiss` | 144 | Paleiskite ant sienos | Release on a wall |
| `rmNo3dDrop` | 144 | Įtempti galima vaizduose „Iš priekio“ arba „Planas“ | Drop in the Front or Plan view |
| `rmPlanLeg` | 144 | Planas iš viršaus · stora linija — spintelės priekis · punktyras — pa… | Plan from above · thick line — cabinet front · dashed — wall cabinets |
| `rm3Leg` | 145 | 3D · tempkite — sukasi · ratukas — mastelis ties pele · dukart spuste… | 3D · drag to turn · wheel to zoom at the pointer · double-click for the whole room · click a piece … |
| `rmUnplaced1` | 145 | Nuimta nuo sienos | Taken off the wall |
| `rmAdded` | 145 | Pridėta spintelė {n} | Cabinet {n} added |
| `rmDeleted` | 145 | Spintelė ištrinta | Cabinet deleted |
| `parts2` | 146 | Pertvaros | Partitions |
| `part0` | 146 | Nėra | None |
| `part1` | 146 | 1 pertvara | 1 partition |
| `part2` | 146 | 2 pertvaros | 2 partitions |
| `colWl` | 146 | plotis | width |
| `colWnote` | 146 | Plotis — iki pertvaros vidurio. Paskutinė kolona gauna, kas lieka iki… | Width — to the middle of the partition. The last column takes what is left of the cabinet width. |
| `colOne` | 147 | Spintelė | Cabinet |
| `colL` | 147 | Kairė | Left |
| `colM` | 147 | Vidurinė | Middle |
| `colR` | 147 | Dešinė | Right |
| `backOf` | 147 | Nugara | Back |
| `bHdf` | 147 | Plaušas | Fibreboard |
| `bSolid` | 147 | Kieta 18 mm | Solid 18 mm |
| `backMountL` | 147 | Kieta nugara | Solid back |
| `bFixL` | 147 | Tvirtinimas | Fixing |
| `bFix_top_confirmat` | 147 | Konfirmatų galvutės matysis nugaros išorėje. Kad iš galo nieko nesima… | Confirmat heads will show on the outside of the back. For nothing to show from behind, choose cams … |
| `bFix_top_cam` | 147 | Ekscentrikai šonų vidinėje pusėje, varžtai nugaroje — iš galo nieko n… | Cams on the inner faces of the sides, bolts in the back — nothing shows from behind. |
| `bFix_dowel` | 147 | Tik kaiščiai — nugara klijuojama, iš išorės nieko nesimato. | Dowels only — the back is glued; nothing shows from outside. |
| `bFix_inside_confirmat` | 147 | Konfirmatų galvutės matysis šonų išorėje, prie galo. | Confirmat heads will show on the outside of the sides, near the back. |
| `bFix_inside_cam` | 147 | Ekscentrikai nugaros vidinėje pusėje — iš išorės nieko nesimato. Pasp… | Cams on the inner face of the back — nothing shows from outside. Click the picture to move them to … |
| `bFix_inside_cam_out` | 147 | Ekscentrikai nugaros išorinėje (sienos) pusėje — iš vidaus nesimato, … | Cams on the outer (wall) face of the back — not seen inside, but they show from behind. Click the p… |
| `bHdfNote` | 147 | Plaušas visada kalamas iš išorės, ant galo. | Fibreboard is always nailed on from the outside. |
| `mainL` | 147 | Nugara ir stalviršis | Back and worktop |
| `cmHint` | 148 | Paspauskite koloną, kad ją redaguotumėte. | Click a column to edit it. |
| `cmEmpty` | 148 | tuščia | empty |
| `cmNoBack` | 148 | be nugaros | no back |
| `secRemoved` | 148 | Sekcija pašalinta | Section removed |
| `xRemoved` | 148 | Detalė pašalinta | Part removed |
| `cabRemoved` | 148 | Spintelė „{n}“ pašalinta | Cabinet “{n}” removed |
| `undoBtn` | 148 | Atšaukti | Undo |
| `colEdit` | 148 | Redaguojama kolona | Editing column |
| `bTopOnlyAll` | 148 | „Išorėje“ galima tik kai visose kolonose kieta nugara — dabar kieta n… | “Outside” only works when every column has a solid back — now a solid back goes inside its column. |
| `bPerCol` | 148 | Nugara pasirenkama kiekvienai kolonai (2 žingsnis „Sekcijos“). | The back is chosen per column (step 2 “Sections”). |
| `jk_part` | 148 | Pertvara ↔ dugnas/viršus | Partition ↔ bottom/top |
| `n1` | 149 | Matmenys | Size |
| `n2` | 149 | Sekcijos | Sections |
| `n3` | 149 | Konstrukcija | Construction |
| `n4` | 149 | Operacijos | Operations |
| `n5` | 149 | Medžiagos | Materials |
| `n6` | 149 | Papildomos | Extras |
| `toHome` | 150 | Visi projektai | All projects |
| `prNew2` | 150 | Naujas projektas | New project |
| `autosaved` | 150 | išsaugota | saved |
| `autosaveT` | 150 | Viskas išsaugoma automatiškai šioje naršyklėje | Everything is saved automatically in this browser |
| `npLead` | 151 | Įrašykite pavadinimą — jis bus CNC programų ir sąrašo failų pavadinim… | Type a name — it goes into the CNC program and list file names. Next you pick the first cabinet. |
| `npName` | 151 | Projekto pavadinimas | Project name |
| `npPh` | 151 | pvz. VIRTUVE_JONAITIS | e.g. KITCHEN_SMITH |
| `npCreate` | 151 | Sukurti projektą | Create project |
| `npOr` | 152 | arba | or |
| `npImport` | 152 | Įkelti iš pasiūlymo programos (.json) | Import from the offer app (.json) |
| `npSample` | 152 | Atidaryti pavyzdį | Open the example |
| `npNeed` | 152 | Įrašykite projekto pavadinimą | Type a project name |
| `npDone` | 152 | Sukurtas projektas {n} | Project {n} created |
| `prSearch` | 153 | Ieškoti projekto… | Search projects… |
| `prOpenNow` | 153 | atidarytas | open |
| `prUpdated` | 153 | keista | changed |
| `prDup` | 153 | Kopija | Copy |
| `prDupT` | 153 | Sukurti šio projekto kopiją | Make a copy of this project |
| `prJsonT` | 153 | Atsisiųsti projekto failą (atsarginė kopija) | Download the project file (backup) |
| `prDupDone` | 153 | Kopija sukurta | Copy made |
| `prNone2` | 154 | Projektų dar nėra — sukurkite pirmą viršuje. | No projects yet — create the first one above. |
| `prNoMatch` | 154 | Nieko nerasta. | Nothing found. |
| `prHint2` | 154 | Projektai išsaugomi automatiškai šioje naršyklėje, o prisijungus — ir… | Projects are saved automatically in this browser and, when signed in, in the cloud (on every comput… |
| `prDeleted` | 154 | Projektas ištrintas | Project deleted |
| `noName` | 155 | (be pavadinimo) | (no name) |
| `cabsN` | 155 | spint. | cab. |
| `copySfx` | 155 | (kopija) | (copy) |
| `agoNow` | 155 | ką tik | just now |
| `agoMin` | 155 | prieš {n} min. | {n} min ago |
| `agoToday` | 155 | šiandien | today |
| `firstCabQ` | 156 | Pirmoji spintelė — kokią kuriame? | First cabinet — what are we building? |
| `stepsNav` | 156 | Spintelės žingsniai | Cabinet steps |
| `stepNeed` | 156 | Reikia užpildyti | Needs filling in |
| `ckTitleOk` | 157 | Paruošta CNC | Ready for CNC |
| `ckTitleBad` | 157 | Prieš siunčiant į CNC — pataisykite | Before sending to CNC — fix these |
| `ckFix` | 157 | Taisyti | Fix |
| `ckName` | 157 | Neįrašytas projekto pavadinimas (jis bus failų pavadinimuose) | No project name (it goes into the file names) |
| `ckNameOk` | 157 | Projektas: <b>{n}</b> | Project: <b>{n}</b> |
| `ckMat` | 158 | Neįrašyta medžiaga — spintelės {c} | No material — cabinets {c} |
| `ckWt` | 158 | Neįrašyta stalviršio medžiaga — spintelės {c} | No worktop material — cabinets {c} |
| `ckMatOk` | 158 | Medžiagos įrašytos | Materials filled in |
| `ckEdge` | 158 | Neįrašytas karkaso kraštas — spintelės {c} | No carcass edging — cabinets {c} |
| `ckErr` | 158 | Klaidų, dėl kurių dalis detalių ar skylių nepadaroma: {n} (žr. žemiau) | Errors that leave parts or holes out: {n} (see below) |
| `ckProg` | 158 | {p} detalės, {n} CNC programų | {p} parts, {n} CNC programs |
| `isoSides` | 159 | Šonai: | Sides: |
| `isoModeBoth` | 159 | Abu kartu | Both |
| `isoModeSep` | 159 | Atskirai | Separately |
| `isoModeBothT` | 159 | Pakeitimas viename šone pakartojamas kitame (veidrodiškai) | A change on one side is mirrored on the other |
| `isoModeSepT` | 159 | Keičiamas tik tas šonas, ant kurio tempiate | Only the side you drag on changes |
| `isoBoth` | 160 | abu šonai | both sides |
| `isoBothNote` | 160 | Kairys ir dešinys šonai keičiasi kartu. Norėdami keisti tik vieną šon… | Left and right sides change together. To change only one side, pick “Separately” above. |
| `isoDiffer` | 160 | šonai skiriasi | sides differ |
| `isoCopyToR` | 161 | Taip pat ir dešiniame | Same on the right |
| `isoCopyToL` | 161 | Taip pat ir kairiame | Same on the left |
| `isoCopied` | 161 | Abu šonai vienodi | Both sides now match |
| `isoL1` | 161 | K: | L: |
| `isoR1` | 161 | D: | R: |
| `isoResetT` | 161 | Abiem šonams — standartas | Standard on both sides |
| `isoArmed` | 161 | Bakstelėkite jungties liniją — bus pridėta. Dar kartą bakstelėkite my… | Tap a joint line to add it there. Tap the button again to stop. |
| `isoMissTap` | 161 | Bakstelėkite tiksliau ant punktyrinės jungties linijos | Tap closer to a dashed joint line |
