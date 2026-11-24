# Map: `room.js` ("Baldai" — all furniture in one view), `realistic.js`, `look.js`

Sources read in full: `src/lib/room.js` (1585 lines), `src/lib/realistic.js` (349), `src/lib/look.js` (83), plus the mount code in `src/lib/app.js:2660-2711`, the CSS in `src/lib/legacy_0.css:703-936` and `legacy_8.css:5-16`, and the engine helpers the room calls (`src/lib/engine.js:1758, 1907-1937`). Behaviour marked **(verified live)** was checked against the running snapshot at `http://127.0.0.1:8765/legacy/`.

Three globals come out of this slice:

| Global | File | What it is |
|---|---|---|
| `window.DBRoom` | room.js:1579-1583 | Layout model + checks + the whole "Baldai" UI (bar, palette, stage, inspector). A singleton: one mount at a time. |
| `window.DBRender` | realistic.js:348 | Full-screen modal with a GPU path-traced picture of the room (three.js from a CDN). |
| `window.DBLook` | look.js:82 | Per-project material look registry (colour / texture photo per board-material name) + CPU texture sampler. |

---

## 1. Public API

### 1.1 `DBRoom` (room.js:1579-1582)

Export: `module.exports = api` when a CommonJS `module` exists, otherwise `window.DBRoom` (room.js:1583).

| Member | Signature | Purpose / return |
|---|---|---|
| `attach` | `attach(el, o)` (1463) | Mount/re-mount the whole UI into `el` (overwrites `el.innerHTML`). `attach(null)` just forgets the mount (`C = null`). Returns nothing — **no handle**. |
| `ensure` | `ensure(proj) → bool` (293) | Create/repair `proj.layout`; give every cabinet a place; drop items of deleted cabinets; `refit` side panels; normalise openings and points. `true` = project was changed (caller must save). |
| `problems` | `problems(proj) → { list, bad, badOp, badPt }` (232) | All layout checks (section 4). |
| `geo` | `geo(L) → [{ P:[x,y], d:[dx,dy], n:[nx,ny], len }]` (63) | Wall geometry in plan coordinates (x right, y down). |
| `placed` | `placed(proj) → [{ c, i, it }]` (68) | Cabinets standing on an existing wall (`it.wall` in range). `i` = index in `proj.cabinets`. |
| `items3d` | `items3d(proj, infos) → [{ tr, e, color, o, kind }]` (608) | Every board/leg/plinth/LED/side panel/worktop as a box, for 3-D and `DBRender`. |
| `snap` | `snap(proj, c, wi, x, thr) → { x, why }` (202) | Snap carcass position `x` on wall `wi`; `why` ∈ `'wall'|'corner'|'nb'|'op'|''`. |
| `gapAround` | `gapAround(proj, c) → { x0, x1, w, cx, cw } | null` (206) | Free stretch the cabinet stands in; `cx`/`cw` = carcass position/width that would fill it (side panels deducted). |
| `autoSpot` | `autoSpot(proj, c) → { wall, x }` (282) | First free place at the cabinet's level. |
| `cabW / cabD / cabH` | `(c) → mm` (28-30) | `W` (or `dishWidth` for a dishwasher) default 600; `D` default 560; `H` default 720. |
| `legH` | `(c) → mm` (36) | `DBEngine.legHeight(c)`. |
| `z0Of` | `(c, it, L) → mm` (38) | Bottom of the carcass above the floor. |
| `wtOf` | `(c) → worktop | null` (37) | `DBEngine.worktopOf(c)`. |
| `level` | `(c) → 'base'|'tall'|'wall'` (31) | See 2.3. |
| `view` | object `V` (16) | Live view state (mutable, shared): `{ view, wall, th, ph, sideFit, zf, z3, px3, py3, osel, psel }`. |
| `sideP`, `sideW` | `(c)` (42-43) | `DBEngine.sidePanels(c)`, `DBEngine.sideWidths(c) → { L, R }`. |
| `sideRects` | `(c, it, G, L)` (221) | Side panels as plan rectangles with height range `v`. |
| `addSide` | `addSide(proj, c, 'L'|'R') → { moved } | { short } | {}` (1311) | Adds a side-panel extra, then `makeRoom`. Mutates `proj`. |
| `sideFit` | `(c, it, L, fit) → { zb, L }` (48) | Height/bottom of a side panel for fit `'cab'|'floor'|'room'`. |
| `refit` | `refit(proj) → bool` (54) | Re-size all fitted side panels. |
| `makeRoom` | `makeRoom(proj, c, 'L'|'R') → { moved:mm } | { short:mm } | {}` (1323) | Shift touching rows so `c` (with side panels) no longer overlaps. |
| `_state` | `() → { C, D }` (1580) | Internals for tests: current mount `C` and drag `D`. |
| `opsOf`, `ptsOf` | `(L) → array` (76, 96) | `L.openings` / `L.points` or `[]`. |
| `opRange` | `(op, L) → { a, b, z0, z1 }` (80) | Wall area an opening occupies (door: incl. 70 mm casing). |
| `wallPieces` | `(L, wi, a, b, H) → [[x0,x1,z0,z1]]` (118) | Wall rectangles around the holes. |
| `opParts`, `ptParts` | `(op, t, L)`, `(pt)` (134, 109) | Boxes of a door/window/socket/pipe in wall coordinates: `{ e:[x0,x1,y0,y1,z0,z1], kind, color }`. |
| `opCasTop`, `isDoor` | (79, 77) | Casing height over a door; `type !== 'window'`. |
| `normOps`, `normPts` | `(L) → bool` (84, 101) | Sanitise in place; `true` if changed. |
| `ptBox` | `(pt) → { a, b, z0, z1 }` (97) | A point's rectangle on the wall. |
| constants | `OP_CAS = 70`, `OP_JAMB = 30`, `PT_DEF` (74, 95) | |

Used by other modules: `drawings.js` uses `geo, placed, level, cabW/D/H, z0Of, wtOf, sideP, sideW, sideRects, opsOf, ptsOf, isDoor, opCasTop, OP_CAS, OP_JAMB, PT_DEF`; `app.js` uses `attach, ensure, problems, placed, geo, autoSpot, makeRoom, addSide, cabW, cabH, cabD, sideW, z0Of`; `realistic.js` uses `items3d, geo, opsOf, ptsOf, wallPieces, opParts, ptParts`.

Not exported (internal only): `cornerIn/cornerOut`, `neighbours`, `snapCands`, `rszSnap`, `opSnap`, `ptSnap`, `autoSpotOp`, `autoSpotPt`, `exposedSides`, `spareSides`, `closedRoom`, `planRect`, `wtRect`, `defLayout`, all drawing functions.

### 1.2 The `o` object passed to `attach(el, o)`

Exactly as `app.js:2677-2710` builds it (`mountRoom`):

| Field | Type | Meaning |
|---|---|---|
| `proj` | project | The live project (`S.proj`). The module **reads and temporarily mutates it during drags** (see 5.5). |
| `infos` | `[{ r, warnings, nProg }]` | Engine build results, one per cabinet (`S._info`). The room reads `infos[i].r.panels[]` (`place{o,u,v,n}`, `role`, `L`, `W`, `T`, `mat`, `drawer`, `cargo`, `hingeLeft`, `sec`, `boxFront`), `r.legs[] {x,y,d,h}`, `r.visual.leds[] {e:[[x0,x1],[y0,y1],[z0,z1]]}`, `r.visual.plinth {x0,x1,y0,t,z0,z1,mat}`. |
| `sel` | `number | null` | Index of the selected cabinet. Selection of cabinets lives **outside** the module. |
| `t` | `fn(key) → string` | Translator. The module calls `T(k)` = `o.t(k)` (room.js:21). |
| `toast` | `fn(msg, isError?)` | |
| `presets` | `[{ i, name, icon(svg string), W, H, D, type, dish, legs, legH, panel }]` | Palette chips (`roomPresets()`, app.js:2664). |
| `canUndo` | bool | Enables the Undo button. |
| `focusStage` | bool | Focus `.rm-stage` after mount (so arrows keep working). |
| `confirmDel` | bool | Delete button shows "Really delete?" (two-click confirm kept in app state `S.confirm === 'rmdel' + i`). |
| `lookHTML` | `fn(i | null) → html` | Host HTML appended to the inspector (material look editor) for cabinet `i` or the whole project. |
| `frontArt` | `fn(i) → { svg, vbH } | null` | Host-rendered realistic front SVG of cabinet `i`. `svg` must start with `<svg class="fr-svg"` — the room string-replaces that prefix to position it (room.js:392). `vbH` = picture height in mm. |
| `onSelect` | `fn(i | null)` | Cabinet clicked / deselected. Host stores the selection and re-mounts. |
| `onLayout` | `fn(mutator(proj), { sel?, msg?, focus? })` | Every layout change. Host: push undo, run `mutator(S.proj)`, set selection if `sel !== undefined`, save, full `render()`, re-mount with focus if `focus`, toast `msg`. |
| `onCab` | `fn(i, patch, after?(proj))` | Change cabinet fields (`W`, `H`, `D`, `dishWidth`, `hang`, `vis`, `leds`, `mat`). Host also rescales `colW`, switches `cnc.legs` on `hang`, mirrors `W` to `dishWidth`. |
| `onAdd` | `fn(presetIdx, wall | null, x | null, fitW | null)` | New cabinet from the palette. `wall == null` → host adds it without a place and `ensure()` auto-places it. |
| `onDup` | `fn(i)` | Copy next to the original (host puts it right of the source, or `autoSpot` if that collides). |
| `onDelete` | `fn(i)` | Two-step delete (first call arms `confirmDel`). |
| `onEdit` | `fn(i)` | Open the cabinet editor tab. |
| `onUndo` | `fn()` | |
| `onFlip` | `fn(i, sec, isBox, isLeftNow)` | Flip a door's hinge side (optional; without it the ⇄ buttons are not drawn). |
| `onMat` | `fn(c, part, name) → infos` | Passed through to `DBRender` (material change from the render). |
| `mats` | `array | fn() → array` | Material names for the render's material stepper. |

**Mount cycle the host must follow** (app.js:2673-2677, 843, 850):

1. Render a container `<div class="room" id="room"></div>`.
2. `if (RM.ensure(S.proj)) save();`
3. Sync selection index from the stored cabinet id (`roomSelSync`).
4. `RM.attach(el, {...})`. This is repeated after **every** state change — the module has no incremental update; internal view state survives because it lives in the module-level `V`.
5. `window.DBLook.set(S.proj.look)` before rendering (app.js:825); `DBLook.on(...)` re-mounts when a texture finishes decoding (app.js:802).
6. Undo: host keeps `S.roomUndo` (max 40 full project clones, cleared when leaving the tab, app.js:652, 2667); Ctrl+Z is handled by the host (app.js:2889).

### 1.3 `DBRender` (realistic.js:348)

| Member | Notes |
|---|---|
| `open(o)` (15) | `o = { proj, infos, th, eye?, far?, t, onMat?, mats? }`. Appends a modal `.rr-ov` to `document.body` (z-index 90, `role=dialog`). `th` = start azimuth (the room passes `V.th`; `ph` is passed too but **ignored**). Builds the scene from `DBRoom.items3d(o.proj, o.infos)`; empty → message `rrEmpty`. |
| `close()` (38) | Disposes renderer/path tracer, removes listeners and the overlay. |
| `_state()`, `_quality()`, `_score(th)` | Test hooks. |

Facts:
- Libraries are loaded with dynamic `import('three')` and `import('three-gpu-pathtracer')` (realistic.js:35) — bare specifiers, so the host page **must carry the import map** (`legacy/index.html:8`: `three@0.186.1`, `three/examples/jsm/`, `three-mesh-bvh@0.9.15`, `three-gpu-pathtracer@0.0.26`, all jsDelivr). Needs internet + WebGL 2; 45 s timeout → `rrNoLib` / `rrNoGL`.
- Quality presets `QP` (10): `fast {n:48, px:0.5e6, b:3}`, `good {n:256, px:1.1e6, b:4}` (default), `best {n:1000, px:2.6e6, b:6}`; `n` samples, `px` traced pixels, `b` bounces. Module-level `Q` remembers the choice for the session.
- Two modes, toggled by the "Patalpa/Room" button and remembered in `localStorage['dbRR.room']` (19, 49-50): **studio** (default: furniture alone on a light floor, one area light) and **room** (plank floor, 100 mm walls with real holes via `wallPieces`, doors/windows via `opParts`, sockets/pipes via `ptParts`, glass with transmission). Walls between the eye and the furniture are removed (`place`, 273).
- Camera: orbit at eye height around the furniture centre; distance auto-fitted (`fitDist`, 237); the initial turn is replaced by the angle that shows most unobstructed fronts unless the given one scores ≥ 85 % of the best (`bestTurn`, 249).
- Controls (322-329): drag horizontally = walk round, vertically = eye height (500…roomH+2500); wheel = nearer/further (`far` 0.35…3); click on a board = pick → small panel `.rr-pick` with ‹ › buttons (also ← → keys) stepping `mats` for that cabinet's `facade` / `carc` / `worktop` material through `o.onMat(c, part, name)`; `Esc` closes the picker, then the dialog; click on the backdrop closes.
- Download: PNG of the canvas, file name `<proj.name>_vaizdas.png` (55-58).
- Edge-preserving denoise shader that fades out with samples (201-229); GPU fence sync so a slow card does not freeze the page (332-347).
- A second caller exists: the cabinet editor's "this cabinet alone" render (`app.js:2925-2930`) builds a throw-away project with one wall.

### 1.4 `DBLook` (look.js:82)

Global singleton registry; state `looks`, `sig`, `ver`, `cache`, `listeners` (look.js:7).

| Member | Signature | Notes |
|---|---|---|
| `set` | `set(map) → bool` | `map[name] = { color:'#rrggbb', tex:'data:image/…', mm, rot, fit }`. Returns `false` if nothing changed (signature compare). Keys are trimmed material names. |
| `get` | `get(name) → look | null` | |
| `has` | `has(name) → bool` | `true` only when the look has a `tex`. |
| `color` | `color(name) → '#rrggbb' | null` | Average colour of the decoded photo if ready, else `look.color`. (app.js:1617 passes a second argument — it is ignored.) |
| `tex` | `tex(name) → { w, h, d, levels, k, fit } | null` | Decoded photo (null while loading). Decoded once, scaled to ≤ **2048** px (the header comment says 1024), with a mip chain. |
| `frame` | `frame(name, O, axes, g, n, ext) → { name, O, U, V, Lu, Lv } | null` | Where the photo lies on one face of a board (grain axis `g`, rotated when `look.rot`). |
| `sampler` | `sampler(tx, ppm) → fn(x,y,z) → 0xRRGGBB | null` | Bilinear, mip-selected by `ppm` (screen px per mm). `fit` (default) = photo laid once over the board, cropped; `fit === false` = repeated mirrored at real size `mm`. |
| `version` | `() → number` | Bumped on `set` and on each decode. |
| `on` | `on(fn)` | Listener called with the material key when a photo is decoded. Never removable. |

Look fields: `color`, `tex` (data URI, stored inside the project → large saves), `mm` (photo width in mm when repeating, min 20, default 1000), `rot` (grain across), `fit` (false = repeat). Note: `openProject` normalisation (app.js:660-662) keeps only `tex`, `color`, `mm`, `rot` — **`fit:false` is dropped when a project is reopened** (looks like a bug in the host).

Editing UI for looks is in app.js (`lookBlock`, 1679; actions `looktex`, `lookpaste`, `lookcol`, `lookfit`, `lookmm`, `lookrot`, `lookrm`) and is injected into the room inspector through `o.lookHTML`.

---

## 2. Data model

### 2.1 `proj.layout`

```js
proj.layout = {
  walls:    [{ len }],            // 1..4 walls, mm. Chain turning clockwise seen from above.
  wallZ:    1450,                 // default bottom of wall cabinets above the floor
  roomH:    2600,                 // ceiling height
  worktop:  true,                 // SHOW worktops in the room views (only a display flag)
  items:    { [cabId]: { wall, x, z? } },
  openings: [{ id, type, wall, x, w, h, z, hinge, swing, color }],
  points:   [{ id, type, wall, x, z }]
}
```

Defaults: `defLayout()` (62) = one wall of 3600. A **fresh** layout sizes wall A to the floor cabinets' total width + 200, rounded up to 100, min 2400 (`ensure`, 298-301).

| Field | Rules |
|---|---|
| `walls[i].len` | Inspector accepts 300…20000 (1402). `ensure` truncates to 4 walls (296). New wall = 2400 (1375). Only the **last** wall can be removed and never wall A (1220, 1376); its cabinets become unplaced (`wall:-1`), its openings and points are deleted. |
| `wallZ` | > 0 (1404). Fallback 1450. |
| `roomH` | ≥ 1000 (1404). Fallback 2600 everywhere (`+L.roomH > 0 ? … : 2600`). |
| `worktop` | Checkbox; `null` → `true` (297). |
| `items[id].wall` | Wall index, or `-1` = taken off the walls ("Nepastatytos / Not placed"). |
| `items[id].x` | mm from the wall start to the **carcass** left edge (side panels extend beyond: `fx0 = x − sideW.L`, `fx1 = x + W + sideW.R`, 44-45). Inspector accepts |x| ≤ 20000; nothing clamps it to the wall. |
| `items[id].z` | Only meaningful for hung cabinets: bottom above the floor; empty/`null`/missing → `wallZ` (38). Floor cabinets ignore it (bottom = leg height). |

### 2.2 Wall geometry (`geo`, 63-67)

- Plan coordinates: x right, y down. Wall directions cycle `[[1,0],[0,1],[-1,0],[0,-1]]` → A runs right, B down, C left, D up. Each wall starts where the previous ends. Always 90° corners, always clockwise; no free-standing pieces, no angled walls, no wall offsets.
- `n = [-d.y, d.x]` is the normal **into the room**; a cabinet's footprint is `P + d·a + n·b` with `a` along the wall and `b` = distance from the wall.
- "Wall start" = left end when facing the wall from inside the room.
- `closedRoom(L)` (169): 4 walls whose end meets A's start within 1 mm → wall D and wall A share a corner (`prevWall/nextWall`, 173-174).
- Wall thickness is only cosmetic and differs per view: plan 100 mm drawn outside the line (513), software 3-D 60 mm (662), realistic 100 mm (157).

### 2.3 Cabinet-derived values

| Helper | Definition |
|---|---|
| `level(c)` (31) | `'base'` for a dishwasher; else `hang = c.hang != null ? !!c.hang : c.type === 'PAKABINAMOS'`; hung → `'wall'`; else `'tall'` if `H > 1000` or (`c.hang == null` and `type === 'ŪKINĖ'`); else `'base'`. |
| `z0Of(c, it, L)` (38) | wall level → `it.z` if finite else `L.wallZ || 1450`; otherwise `legH(c)`. |
| `vRange(c, it, L)` (61) | wall level → `[z0, z0+H]`; floor levels → `[0, z0+H]` (the leg space counts as occupied). |
| `frontT(c)` (39) | Front thickness: 0 for a panel; for a `box` only when it has overlay fronts; else `c.cnc.facadeT || 18`. |
| `cabDF`, `depthF` (40, 46) | Depth from the wall to the front face (incl. fronts / protruding side panels). |
| `wtOf(c)` | Engine worktop `{ mat, edge, T, over, left, right, L, W, x0, x1, y0, y1, z0, z1 }` (engine.js:1910-1918), only when `c.worktop.on`. Defaults `T:38, over:20, left:0, right:0`. |

Cabinet fields the room **writes** (through `onCab`/`onLayout`): `W`, `H`, `D`, `dishWidth`, `hang`, `vis {L,R,B}`, `leds[]`, `extras[]` (side panels), `mat.carc`/`mat.facade` (loose panel material). Via the host's `onFlip`: `sections[sec].hingeSide` / `box.fronts[sec].hingeSide`.

Special cabinet kinds the room distinguishes: `c.dishwasher` (width = `dishWidth`, no resize, no hang, no LED/vis), `c.kind === 'panel'` (a loose board: `W` = thickness, own inspector), `c.kind === 'box'` ("3D construction": no LED/vis; ignored by socket-behind-side check).

### 2.4 Openings — `layout.openings[]` (70-91)

`{ id:'o'+rand, type:'door'|'gdoor'|'window', wall, x, w, h, z, hinge:'L'|'R', swing:'in'|'out', color:'#rrggbb' }`

- `x` = where the **hole** starts along the wall; `w`,`h` = hole size; `z` = sill height (windows; doors forced to 0).
- Defaults `OP_DEF` (75): door 880×2070 `#b08458`; gdoor 880×2070 `#f1eee6`; window 1200×1400, sill 900, `#f4f4f1`.
- A door occupies the hole plus a 70 mm casing each side and on top (`OP_CAS`; top casing shrinks to what is left under the ceiling, `opCasTop`); jamb 30 mm (`OP_JAMB`). A window occupies only its hole; its sill is drawn 30 mm wider, 25 mm thick.
- `normOps` (84): drops openings on missing walls, non-objects; forces `w,h ≥ 200`, `z ≥ 0` (window), valid hinge/swing/colour, unique ids.
- Display names are computed, not stored: "Durys {n}" / "Langas {n}" by order among doors or windows (`opName`, 82).
- Inspector limits (1419): `x` ±20000, `w` 200…6000, `h` 200…5000, `z` 0…5000.

### 2.5 Points — `layout.points[]` (92-107)

`{ id:'p'+rand, type:'socket'|'socket2'|'cold'|'hot'|'drain', wall, x, z }` — `x`,`z` are the **middle** of the point.

`PT_DEF` (95): socket `z:1100, 80×80`; socket2 `z:1100, 152×80`; cold/hot `z:550, 40×40`; drain `z:450, 60×60`. Names: label + running number per type (`ptName`, 99). Inspector limits: `x` ±20000, `z` 0…5000 (1409).

### 2.6 Side panels (cabinet extras)

Not in the layout: they are `c.extras[]` entries with `kind:'side'`, `side:'L'|'R'`, created by `addSide` (1311-1322):

```js
{ kind:'side', side, fit:'cab'|'floor'|'room', name:T('exSide'), L:<height>, W:<depth = D + frontT>, T:<facadeT || thick || 18>,
  qty:1, mat:<facade || carc>, e1:true, e2:true, e3:true, e4:true, zb:<bottom from carcass bottom>, yf:<frontT> }
```

- `fit` (48-52): `'cab'` = as the carcass (`zb:0, L:H`); `'floor'` = down to the floor (`zb:-z0, L:z0+H`); `'room'` = floor to ceiling (`L:max(roomH, z0+H)`). Default: `'floor'` for standing cabinets; for hung ones `'room'` if the top is within 60 mm of the ceiling, else `'cab'`.
- `refit(proj)` keeps fitted panels in sync with room height / cabinet place (called from `ensure`).
- "Spare" side panels = side extras **without** `side` L/R (imported from the offer app); `addSide` consumes one first (copies `name, mat, T, e1..e4, edgeMat`, decrements its `qty`) (1313-1319, `spareSides` 1306).
- The engine turns them into geometry: `DBEngine.sidePanels(c) → [{ side, x0, x1, y0, y1, z0, z1, T, H, D, mat, x }]` (engine.js:1923).

### 2.7 Visible sides and LEDs

- `c.vis = { L, R, B }` booleans: carcass side (or a hung cabinet's bottom) cut from the front material. `exposedSides(proj, o)` (1258-1275) computes which sides are actually free (nothing beside over the full height, not in a corner, no own side panel).
- `c.leds[] = { at:'bottom'|'top'|'L'|'R', side:'in'|'out', from, ends:'open', w, depth }`; defaults from `DBEngine.R.led` or `{ from:30, w:16, depth:8 }` (959-964).

### 2.8 `items3d` output (608-637)

Each entry: `{ tr, e:[x0,x1,y0,y1,z0,z1], color:'#rrggbb', o, kind }`.

- `e` is a box in **cabinet coordinates**: x from the carcass left, y from the carcass **front** towards the wall (fronts have y < 0), z up from the carcass bottom (legs negative).
- `tr([x,y,z]) → [planX, planY, heightAboveFloor]`.
- `o = { cab:i, front?, wood?, metal?, led?, tex?:{ name:<material>, g:<grain axis 0|1|2> } }`.
- `kind`: `'part'` (carcass), `'front'` (fronts, plinth, side panels), `'hdf'` (back/HDF), `'leg'`, `'led'`, `'top'` (worktop), `''` (fallback block / dishwasher plinth).
- Colours: `DBFront.matColor(name, default)`; defaults `#e5e2da` carcass, `#d5cbbd` fronts, `#e4e1da` HDF, `#343b3a` legs, `#fff1b8` LED, `#b98a55` worktop. `wood` from regex `R3WOOD` (603) on the material name.
- A cabinet without engine panels becomes one solid box.

---

## 3. User interactions

### 3.1 Screen structure built by `attach` (1466)

```
el
├─ .rm-bar            view switch [Iš priekio | Planas | 3D], wall filter [Visos sienos | A | B …] (front view, >1 wall),
│                     3-D hint, "✦ Realus vaizdas" (opens DBRender), "↶ Atšaukti" (undo)
└─ .rm-main  (CSS grid 200px | 1fr | 290px)
   ├─ aside.rm-pal    palette
   ├─ .rm-stage       drawing (tabindex 0) + .rm-zoom (+ − ⤢)
   └─ aside.rm-ins    inspector (cabinet | loose panel | opening | point | room)
```

### 3.2 Views

| View | `V.view` | Editing possible |
|---|---|---|
| Front ("Iš priekio") | `'front'` | Move cabinets along/between walls, resize edges, flip doors, move openings, move points in x **and** z, drop from palette, drop LED. All walls side by side with a 500 mm gap (`GAP`), or one wall (`V.wall`). |
| Plan ("Planas") | `'plan'` | Move cabinets/openings/points along/between walls (nearest wall line), drop from palette. No resize, no z. |
| 3D | `'3d'` | Orbit, zoom, click to select. **No dragging, no drops** (toast `rmNo3dDrop`). |

### 3.3 Pointer actions on the stage (pointerdown, 1469-1490; `onMove` 1047; `onUp` 1123)

Hit priority on pointerdown: door-flip button → resize handle → (3-D: orbit) → point → cabinet → opening → background.

| Action | Details |
|---|---|
| Click a cabinet | `onSelect(i)`. A drag starts only after > 4 px movement (1049). |
| Drag a cabinet (`mode:'move'`) | Target wall: front view = the wall whose span (± half the gap) contains the pointer; plan = nearest wall line (no distance limit). Position = pointer − grab offset, then `snap()` with threshold `14 px / scale` (`thrMm`, 1040). Tooltip: name → wall letter, "x mm from the wall start", "left l · right r" free space, snap reason, and "Kliūna už kitos spintelės" when bad. Drop is **always accepted**; if it collides the toast `rmHitDrop` is shown. Height (`z`) is kept — cabinets cannot be dragged vertically. |
| Resize (`mode:'rsz'`, front view, selected cabinet only) | Handles `rszSides` (429): top always; bottom only for hung cabinets (moves the bottom, top stays); left/right unless a panel; none for a dishwasher. 12 px hit strips with small grips. Limits 100…6000 mm. Snaps (`rszSnap`, 445) to other cabinets' edges on that wall, worktop top, ceiling, `wallZ`, wall ends, openings; otherwise rounds to 1 mm. Guide line + ghost while dragging; on release `onCab(i, { W?, H? }, after)` where `after` sets `x` (left edge) or `z` (bottom edge). Collision → toast `rmHitDrop` (still applied). |
| Flip a door (⇄ circle on each door of the selected cabinet, front view) | `onFlip(i, sec, isBox, isLeft)`; not drawn for doors smaller than 26 px or while dragging. |
| Drag an opening (`'opmove'`) | Along its wall or to another; `opSnap` (839): wall ends, wall middle, beside cabinets at its height, beside other openings; else 5 mm grid. Click = select. |
| Drag a point (`'ptmove'`) | x along the wall, and z in the front view; `ptSnap` (942): wall middle, middle of a cabinet on that wall, x of another point, standard height, z of another point; else 5 mm grid. Click = select. |
| Background click | Deselect everything. Double click (two clicks < 400 ms, < 14 px) = zoom to fit. Background drag pans when zoomed. |
| 3-D | Drag = orbit (`V.th`, `V.ph` clamped 0.05…1.35; half resolution while turning), click = select cabinet/opening/point from the id buffer, double-click = reset zoom. |

### 3.4 Snapping rules for cabinets (`snapCands`, 193-201)

Candidates for the carcass x on wall `wi` (side panel widths included so the panels touch):
1. wall start, wall end (`'wall'`);
2. beside the depth taken in each corner by the neighbouring wall's cabinets at overlapping height (`'corner'`, `cornerIn/cornerOut` 175-188);
3. touching either end of every cabinet on that wall whose height range overlaps (`'nb'`);
4. beside every door/window on that wall whose height range overlaps (incl. door casing) (`'op'`).

Nearest candidate within the threshold wins; otherwise x rounds to 5 mm (`snap`, 202-205). Threshold is 14 screen px, so it gets finer when zoomed in. There is no "magnetic" resistance, no gap-closing, no ordering logic.

### 3.5 Palette (`palette`, 1179-1191)

| Group | Chips | Tap (no drag) | Drag |
|---|---|---|---|
| "Pridėti spintelę" | One per `o.presets` (10 in the app: drawers, doors, drawer+doors, wall, tall with oven, fridge, dishwasher front, empty/shelves, loose panel, 3-D construction — `PRESETS`, app.js:402-413). Shows icon, name, `W×H×D`. | `onAdd(k, null, null, null)` → placed "after the last one" by `autoSpot`. | Ghost card follows the pointer; over the front/plan view a dashed ghost shows the snapped place. If it would collide and the gap around is 150 mm ≤ gap < preset width, the ghost shrinks to the gap ("Tarpe telpa … — plotis bus …") and `onAdd(k, wall, x, fitW)` is called. A loose panel dropped at a row checks whether the row can move over (`makeRoom`) and says "cabinets move over n mm". In plan the pointer must be within 1200 mm of a wall. Released elsewhere → toast `rmMiss` / `rmNo3dDrop`. |
| "Durys ir langai" | door, gdoor, window | `addOp(type)` → middle of the longest free stretch on the shown wall (`autoSpotOp`, 849). | Ghost on the wall, snapped. |
| "Rozetės ir vamzdžiai" | socket, socket2, cold, hot, drain | `addPt(type)` → wall middle; water/drain go under a cabinet whose **name** matches `/kriaukl|sink|plautuv/i` (cold −100, hot +100) (`autoSpotPt`, 951). | Ghost on the wall (z too in the front view). |
| | LED strip | Adds an LED at the bottom of the selected cabinet (`side:'out'` for a hung one), else toast `ledMiss`. | Front view only: dropped on a cabinet, goes to the nearest edge (bottom/top/L/R) (`ledSpot`, 905). |
| "Nepastatytos" | One row per unplaced cabinet with a "Pastatyti" button | `autoSpot` (keeps a wall cabinet's `z`). | — |

Chip listeners are bound per element at attach time (1518-1573) with pointer capture; the ghost is a `position:fixed` `div.rm-ghostcard` appended to `document.body`.

### 3.6 Keyboard (`onKey`, 1439-1460; the stage must have focus)

| Selection | Keys |
|---|---|
| Cabinet | ← → move 10 mm (Shift: 100 mm). **Delete = take off the wall** (unplace, toast `rmUnplaced1`) — it does not delete the cabinet. |
| Opening | ← → move 10/100 mm. Delete = delete the opening. |
| Point | ← → ↑ ↓ move 10/100 mm. Delete = delete the point. |
| Any | Ctrl+Z handled by the host. No Escape, no copy/paste, no Tab order between cabinets. |

In `DBRender`: ← → step the picked material, Esc closes.

### 3.7 Zoom and pan (988-1009, 1499-1507)

- Wheel zooms at the pointer (always `preventDefault` → the page cannot be scrolled while the pointer is over the stage). Ctrl+wheel = touchpad pinch. Safari `gesture*` events handled. Touch: two fingers pinch + pan (a second finger cancels a drag in progress).
- 2-D views: factor 1…12, never smaller than fitted; state per view **and per wall filter** (`V.zf.key`), reset when the key changes. 3-D: `V.z3` 0.5…8 with `V.px3/py3`.
- Buttons `+` (×1.5), `−`, `⤢` fit.

### 3.8 Inspector (`inspector`, 1192-1237)

**A. Cabinet selected and placed** (1201-1215)

| Field (`data-rmf`) | Behaviour |
|---|---|
| Plotis / Width `W` | 100…6000 → `onCab(i, { W })` (dishwasher: `{ dishWidth }`). |
| Nuo sienos pradžios `x` | |x| ≤ 20000 → `onLayout`. |
| Siena `wall` (select "Siena A · 3600") | Moves to that wall after the last cabinet at its level (or the corner depth) — does not check that it fits. |
| Kabo ant sienos `hang` (checkbox, not for dishwasher) | `onCab(i, { hang })`; host turns legs off/on. |
| Apačia nuo grindų `z` (hung only) | 0…10000, empty = default `wallZ`. |
| Viršus nuo grindų `top` | Sets `H = top − bottom` (100…6000). Helper line "karkasas 720 + kojelės 100" or "karkasas h, apačia l nuo grindų". |
| Notes | Own problems → `rmHitShort` or `rmOpShort`; "Problems elsewhere: n — close (✕) to see the list". |
| "↔ Užpildyti tarpą: w mm" | Shown when the fill width differs from W, is 100…1200 and the cabinet is not a dishwasher → `W = g.cw`, `x = g.cx`. |
| Side panels (`sideEditor`, 1291) | Fit choice [Kaip spintelė | Iki grindų | Grindys–lubos]; "＋ Kairėje / ＋ Dešinėje" or a chip `H × D × T` with ✕. Adding may shift rows (toast `rmSideMoved`) or report `rmSideShort` ("n mm short of room"). |
| Visible sides (`visEditor`, 1282) | Toggles [Kairys | Dešinys | Apačia (hung only)]; if the layout says otherwise: "From the layout the free sides are: … [Pritaikyti]". |
| LED list (`ledList`, 1276) | Each LED "where · in/out · from mm" with ✕. |
| Buttons | "✎ Redaguoti spintelę" (`onEdit`), "⧉ Kopija šalia" (`onDup`), "Nuimti nuo sienos" (unplace), "Ištrinti" → "Tikrai ištrinti?" (`onDelete`, two clicks). |
| Footer | Key hint + host `lookHTML(i)`. |

**B. Loose panel** (`panelInspector`, 1239): Storis `W` 3…100, Aukštis `H` 30…6000, Gylis `D` 30…3000, x, wall, Apačia nuo grindų `pz` 0…6000 (> 0.5 → `hang:true` + `z`; else `hang:false`), Medžiaga `pmat` (text with `list="dl-mat"`, sets both `mat.carc` and `mat.facade`), buttons "⤒ Iki lubų", "⤓ Iki grindų", edit/copy/unplace/delete.

**C. Opening** (`opInspector`, 876; `data-rmo`): type, hole width, hole height, sill height (window), x, wall, hinges L/R and swing in/out (doors), colour picker, delete, notes. Changing door↔window resets size; changing wall clamps x.

**D. Point** (`ptInspector`, 977; `data-rmp`): type, x (middle), z, wall, delete. Changing type moves z to the new standard height only if it was at the old standard.

**E. Nothing selected = Room** (1217-1236): wall rows (letter, length input, "užstatyta n mm" = sum of floor cabinet widths, ✕ on the last wall), "＋ Pridėti sieną" (< 4 walls), `wallZ`, `roomH`, show-worktop checkbox, hint when no cabinet has a worktop, "◧ Matomi šonai pagal išdėstymą" (sets `vis.L/R` of every cabinet from `exposedSides`), the **problem list** (each a button that selects the offender) or "✓ Spintelės telpa ir nekliūna viena už kitos", general hint, spare side panels note, host `lookHTML(null)`.

All number inputs accept a decimal comma and simple sums like `600-18` (`num`, 1394 — evaluated with `Function()` after a character whitelist). Invalid/out-of-range → the old value is restored and the generic toast `rmBadVal` ("Netinkama reikšmė — palikta ankstesnė") is shown; the limit is never explained.

---

## 4. Checks: `problems(proj)` (232-280)

Returns `{ list:[…], bad:{ [cabId]:1 }, badOp:{ [opId]:1 }, badPt:{ [ptId]:1 } }`. Cabinets in `list` are referenced by **index** (`a`, `b`), openings/points by id.

| kind | Entry | Condition | Message key → LT / EN |
|---|---|---|---|
| `out` | `{ a }` | Footprint incl. side panels starts < −0.5 or ends > wall length + 0.5 | `rmProbOut` "Spintelė {a} išeina už sienos galo" / "Cabinet {a} runs past the wall end" |
| `ceil` | `{ a }` | Top of carcass, own worktop or a side panel above `roomH` + 0.5 | `rmProbCeil` "Spintelė {a} aukštesnė už patalpą (lubas)" / "…reaches above the ceiling" |
| `floor` | `{ a }` | Bottom of carcass range or a side panel below −0.5 | `rmProbFloor` "Spintelė {a} žemiau grindų" / "…is below the floor" |
| `hit` | `{ a, b }` | Plan rectangles overlap > 1 mm in both axes **and** height ranges overlap > 1 mm; also side panel vs cabinet/side panel, worktop vs the other cabinet, and worktops of two cabinets on the same wall overlapping | `rmProbHit` "Spintelės {a} ir {b} kliūna viena už kitos" / "Cabinets {a} and {b} hit each other" |
| `opout` | `{ op }` | Opening range (door incl. casing) past a wall end | `rmProbOpOut` "{o} išeina už sienos galo" |
| `opceil` | `{ op }` | Door height, or window sill + height, above the ceiling | `rmProbOpCeil` "{o} aukštesnis už lubas" |
| `ophit` | `{ op, op2 }` | Two openings on a wall overlap | `rmProbOpHit` "{o} ir {p} persidengia" |
| `opblock` | `{ op, a }` | A cabinet (or its worktop / side panel) stands within the 40 mm strip in front of the opening at an overlapping height | `rmProbOpBlock` "Spintelė {a} užstoja: {o}" / "Cabinet {a} is in front of {o}" |
| `opswing` | `{ op, a }` | Door opens into the room and a cabinet stands in the square the leaf sweeps (leaf width × leaf width), up to the door height | `rmProbOpSwing` "Spintelė {a} trukdo atidaryti: {o}" |
| `ptout` | `{ pt }` | Point's box off the wall ends, below the floor or above the ceiling | `rmProbPtOut` "{o} už sienos ribų" |
| `pthit` | `{ pt, op }` | Point inside an opening's range | `rmProbPtHit` "{o} durų ar lango angoje: {p}" |
| `ptside` | `{ pt, a }` | Point behind a carcass side board (thickness `c.thick || 18`, plus side panels) of a cabinet on that wall at its height; a loose panel counts whole; dishwashers and `box` cabinets are skipped | `rmProbPtSide` "{o} už spintelės {a} šono" |
| `ptwt` | `{ pt, a }` | Point within the worktop's thickness band | `rmProbPtWt` "{o} stalviršio aukštyje (spintelė {a})" |

Short notes in the inspector: `rmHitShort`, `rmOpShort`, `opProbShort`, `ptProbShort`, `rmOtherProbs`; drag tooltip `rmHit`; drop toasts `rmHitDrop`, `opHitDrop`; all-clear `rmNoProbs`.

How problems surface:
- Front/plan: `.bad` class on the cabinet/opening/point group (red stroke, pink fill); 3-D: red-tinted faces + dashed red hull.
- During any drag the candidate is tested by temporarily writing it into the project and calling `problems()` (`D.bad`, `probsWithOp`, `probsWithPt`).
- The full list is visible **only when nothing is selected**.
- **Nothing is ever blocked** — every check is advisory. `problems()` is not consulted by the export path in this module.

What is *not* checked here: gaps between cabinets, an unfilled wall end, unplaced cabinets (only listed), worktop continuity/joins, corner fillers / blind-corner access, cabinet door or drawer swing against a wall or a neighbour, appliance clearances, a wall cabinet lower than the worktop, heights of neighbours not lining up, sockets hidden behind a cabinet back (only sides and worktop band count), cabinet deeper than the worktop.

Other guards in the module: value ranges in the inspector (section 3.8), `normOps` / `normPts` / `ensure` sanitising, side-panel room check (`makeRoom` → `rmSideShort`), door-pair flip refusal (host: `flipPair`).

---

## 5. Internal structure

### 5.1 Module state (all module-level, i.e. shared by every project and mount)

| Var | Line | Content |
|---|---|---|
| `V` | 16 | View state that must survive re-mounts: `view` (`'front'|'plan'|'3d'`), `wall` (−1 all / index), `th`, `ph` (3-D angles), `sideFit{cabId}` (remembered fit choice), `zf {key,z,px,py}`, `z3`, `px3`, `py3`, `osel` (selected opening id), `psel` (selected point id). Never reset on project change. |
| `C` | 17 | Current mount: `{ el, o, w, h, fr (front transform), pl (plan transform), d3 (3-D camera) }`. |
| `D` | 17 | Drag in progress: `mode` ∈ `move, rsz, add, opadd, opmove, ptadd, ptmove, ledadd, orbit, bg` (+ unused `pick`), with `cand`, `tip`, `ghost`, `bad`, `moved`. |
| `RO` | 17 | ResizeObserver on the stage (redraws on width change > 2 px only). |
| `R3`, `scene3d` | 598, 756 | Last 3-D frame's id buffer for picking. |
| `TP`, `PZ`, `GZ`, `LT` | 991 | Touch points, pinch, Safari gesture, last background tap. |

State kept in the **project**: everything in section 2. State kept by the **host**: selected cabinet (`S.roomSel` + `S.roomSelId`), undo stack, delete confirmation.

### 5.2 Rendering approach

- All UI is produced by **string concatenation into `innerHTML`**. `attach` rebuilds bar + palette + stage + inspector every time; `draw()` (1012) rebuilds only the stage (called on every pointermove during a drag, on zoom, on resize).
- Front and plan are **inline SVG** with pixel coordinates computed in JS (no `viewBox`): front `fX(wi,x) = ox + (off[wi] + x)·k`, `fY(z) = base − z·k` (337-338); plan `pX/pY` (508-509). Zoom is applied by scaling `k` and offsets (`zApply`, 994).
- 3-D is a **hand-written software rasteriser** on a 2-D `<canvas>` (`render3d`, 672-755): orthographic projection `P3` (558), every box face triangulated and filled per pixel in JS with a Float32 depth buffer and an Int16 id buffer (cabinet index, `10000 + opening index`, `20000 + point index`), Lambert shading + fake wood grain or `DBLook.sampler` textures, edge darkening, glass alpha pass, radial floor shadows. An SVG overlay (`.rm3-over`) carries selection hulls (convex hull of projected corners), number badges, legend and tooltips. Pixel ratio min(2, devicePixelRatio), dropped to 1 while orbiting. Walls whose room side faces away from the viewer are omitted.
- `draw3d()` (563-594) — an older SVG painter's-algorithm 3-D — is **dead code** (never called), as are the `.rm3-wall/.rm3-carc/.rm3-front/.rm3-top/.rm3-leg/.rm3-floor` CSS rules that belong to it.

### 5.3 How the views are drawn

**Front (`frontLayout` 326, `drawFront` 339, `frontCab` 383)**
- Scale: `k = min((w − 40) / max(totalLength, 1200), (h − 110) / H)` with `H = max(roomH, highest top + 100, 1200)`; the SVG height becomes `base + 70`. With several walls the scale is whatever fits all of them → small drawings.
- Order: wall rectangle (`.rm-wall`), dashed ceiling if content is higher, floor line, title "Siena A · 3600", dashed corner lines; openings; cabinets (floor level first, then wall level); add/resize ghosts; points (drawn over cabinets, "seen through"); worktops (`.rm-top`); dimension chain under each wall for **floor-level cabinets only** (labels when a segment > 22 px); tooltip.
- A cabinet = side panels, legs (two 30 mm rects) or dishwasher plinth, then either the host's `frontArt` SVG (with a transparent `.rm-body.art` for selection stroke and white dashed opening signs over it) or a schematic body + front rectangles from `fronts(i)` with opening signs (V pointing to the handle side for doors, X for drawers, a handle line otherwise); LED strips; visible-side bands; resize grips; flip buttons; a round number badge (if wider than 26 px); `<title>` with name and `W×H×D`.

**Plan (`planLayout` 497, `drawPlan` 510)**
- Scale `k = min((w − 20)/width, 520/height, 0.22)` px/mm; 330 mm margin for wall names; door sweeps included in the bounds.
- Walls as 100 mm polygons outside the room line (corners are not mitred — a notch shows), label "A · 3600"; openings (gap, jambs, leaf + dashed sweep arc, glass lines, sill); worktop outlines (dashed, under the cabinets); cabinet polygons (`.rm-pcab lv-base|lv-tall|lv-wall`, wall cabinets dashed and translucent) with side panels, a thick front line and the number (hidden for a wall cabinet above a floor cabinet); points; ghosts; legend line.

**3-D (`setup3d` 550)**: height `clamp(0.62·w, 340, 600)`; camera target = middle of the walls' bounding box at half room height.

### 5.4 Event wiring

- Stage: `pointerdown/move/up/cancel`, `dblclick`, `wheel` (non-passive), `gesturestart/change/end`, `keydown` — bound on the freshly created stage element at each attach.
- Palette chips: per-element pointer listeners with pointer capture (1518-1573).
- Delegated on `el`, bound **once** (`el.__rmBound`, 1574): `click` → `onClick` (dispatch on `data-rm`), `change` → `onChange` (dispatch on `data-rmwall`, `data-rml`, `data-rmp`, `data-rmo`, `data-rmf`).

`data-rm` actions (1352-1393): `view`, `wallv`, `undo`, `zin`, `zout`, `zfit`, `render`, `desel`, `sel`, `opsel`, `ptsel`, `opdesel`, `ptdesel`, `opdel`, `ptdel`, `visall`, `place`, `wadd`, `wdel`, and for the selected cabinet `edit`, `dup`, `del`, `unplace`, `leddel`, `vis`, `visfit`, `fill`, `pceil`, `pfloor`, `sideadd`, `siderm`, `sidefit`.

Element hooks in the drawing: `data-cab="<index>"`, `data-op="<id>"`, `data-pt="<id>"`, `data-rsz="t|b|l|r"`, `data-flip="i:sec:box:left"`; palette `data-pre`, `data-opadd`, `data-ptadd`, `data-ledadd`.

### 5.5 Things an implementer must know

- **The live project is mutated during drags** and restored afterwards: `onMove` writes a temporary `layout.items[id]` (1090-1094), pushes a fake cabinet `{ id:'__new', … }` into `proj.cabinets` (1105-1114), `rszMove` temporarily changes `c.W`, `c.H` (476-479), `probsWithOp/Pt` swap `layout.openings/points`. An exception in between would leave the project dirty.
- Every committed change goes through the host callbacks, which do a **full app `render()`** (all cabinets rebuilt by the engine, whole page re-created) and then `attach` again. Focus is lost unless `focus:true` was passed (only the keyboard moves pass it).
- `problems()` is recomputed in each draw **and** again in the inspector (O(n²) pairs + openings × cabinets + points × cabinets).
- Selection is split: cabinets in the host, openings/points in `V` (module global). Selecting an opening while a cabinet is selected calls `onSelect(null)` first (863).
- Lists index cabinets by array position (`data-cab`, `problems().list[].a`); the host converts to ids to survive re-ordering.
- External dependencies read at call time: `window.DBEngine` (`legHeight`, `worktopOf`, `sidePanels`, `sideWidths`, `R.led`), `window.DBFront.matColor`, `window.DBLook`, `window.DBRender`, host datalist `#dl-mat`.

---

## 6. Restyling and embedding

### 6.1 What CSS can change

All chrome and all SVG drawing colours come from CSS classes (legacy_0.css:703-936, legacy_8.css:5-16), so a new stylesheet can recolour them.

| Area | Classes |
|---|---|
| Layout | `.room`, `.rm-bar`, `.rm-main`, `.rm-pal`, `.rm-stage` (`.zoomed`), `.rm-ins`, `.rm-zoom` |
| Palette | `.rm-pre`, `.rm-chip`, `.rm-opchip`, `.rm-ghostcard` (`.on`), `.rm-un`, `.rm-unrow` |
| Inspector | `.rm-ih`, `.rm-f`, `.rm-toph`, `.rm-acts`, `.rm-fill`, `.rm-walls`, `.rm-wrow`, `.rm-probs`, `.rm-prob`, `.rm-sided`, `.rm-sidefit`, `.rm-sides`, `.rm-sidechip`, `.rm-visd`, `.rm-vis`, `.rm-visall`, `.rm-ledl`, `.rm-ledi`, `.rm-look`, `.rm-pm` |
| Front SVG | `.rm-wall`, `.rm-floor`, `.rm-corner`, `.rm-wt`, `.rm-dim`, `.rm-dt`, `.rm-cab` (`.lv-base|.lv-tall|.lv-wall`, `.sel`, `.bad`, `.act`), `.rm-body` (`.dish`, `.panel`, `.art`), `.rm-art`, `.rm-front`, `.rm-open`, `.rm-handle`, `.rm-leg`, `.rm-plinth`, `.rm-side`, `.rm-visside`, `.rm-led`, `.rm-top`, `.rm-no`, `.rm-not`, `.rm-ghost`, `.rm-guide`, `.rm-grip`, `.rm-rsz` (`.h`, `.v`), `.rm-flip`, `.rm-tip` (`.bad`), `.rm-legend` |
| Openings | `.rm-op` (`.door`, `.win`, `.sel`, `.bad`, `.act`, `.ghost`), `.rm-opfr`, `.rm-opleaf`, `.rm-opglass`, `.rm-opglare`, `.rm-opsym`, `.rm-ophd`, `.rm-opsill`, `.rm-opt`; plan: `.rm-pop`, `.rm-ophit`, `.rm-opgap`, `.rm-opjamb`, `.rm-opleaf2`, `.rm-oparc`, `.rm-opglass2`, `.rm-opsill2` |
| Points | `.rm-pt` (+ type class), `.rm-ptplate`, `.rm-ptsock`, `.rm-ptpin`, `.rm-ptw` (`.cold`, `.hot`, `.drain`), `.rm-ptin`, `.rm-pthit`, `.rm-ptring` |
| Plan | `.rm-pwall`, `.rm-pcab`, `.rm-pside`, `.rm-pfront`, `.rm-ptop`, `.rm-pn` |
| 3-D | `.rm3-wrap`, `.rm3-canvas`, `.rm3-over`, `.rm3-sel` (`.bad`), `.rm3-num` |
| Render modal | `.rr-ov` (`.err`), `.rr-box`, `.rr-head`, `.rr-st`, `.rr-sp`, `.rr-q`, `.rr-stage`, `.rr-cv`, `.rr-bar`, `.rr-hint`, `.rr-pick`, `.rr-pk-h`, `.rr-pk-m`, `.rr-pk-n` |

Host classes the module emits and relies on (not defined by it): `.btn` (`.ghost`, `.pri`, `.danger`, `.sm`), `.seg` (+ `button.on`), `.lbl`, `.note` (`.bad`, `.ok`), `.unit`, `.xbtn`. CSS variables used: `--paper`, `--paper-line`, `--panel`, `--line`, `--line2`, `--ink`, `--muted`, `--accent`, `--bad`, `--bad-bg`, `--ok`, `--r`, `--f-body`, `--f-mono`, `--f-display`.

### 6.2 What is hard-coded in JS

- **Markup structure**: `bar + .rm-main(palette, stage, inspector)` in one `innerHTML` (1466). The stage cannot be mounted alone; the palette and inspector cannot be rendered into other containers; the host cannot supply its own palette items (listeners are bound to the chips the module generated). A different shell can only re-arrange with CSS (grid areas, `display:contents`, hiding `.rm-pal`), or inject extra `[data-rm]` buttons inside `el` after attach (the delegated click handler will serve them).
- **Sizes**: stage height is computed from its width — front `clamp(0.62·w, 380, 620)` then refitted to content, plan capped at 520 px tall and 0.22 px/mm, 3-D `clamp(0.62·w, 340, 600)` (1014, 331-334, 503-505, 555). It never fills a given height; the ResizeObserver ignores height. A full-screen or split-pane canvas needs code changes in `draw`, `frontLayout`, `planLayout`, `setup3d`.
- Other constants: `GAP = 500` between walls, snap threshold 14 px, drag start 4 px, badge radius 9, resize strip 12 px, tooltip width `chars × 6.6 + 16` (assumes the 11.5 px font), legend at fixed offsets.
- **3-D canvas colours**: walls `#f7f5ef`, floor `#e9e5db`, shadow `rgba(30,42,34,.20)`, collision tint towards `(180,41,31)`, sky behind glass `(226,236,242)`, light direction — all in JS (664, 681-686, 696, 709). No dark-theme variant.
- **Material colours** as inline `style="fill:…"` (side panels, dishwasher plinth, loose panel, visible-side bands) and the opening `color` field.
- **Opening/point/LED icons**: inline SVG strings (`OP_ICON`, `PT_ICON`, `LED_ICON`, 784-903) partly with fixed colours.
- The stylesheet itself hard-codes the drawing palette (`#1b211e` strokes, `#2448c9` selection, `#b4291f` errors) rather than variables; the stage is a light "paper" even in the app's dark theme (verified live).
- `DBRender`: backgrounds `#e9e7e2` / `#f3f2ef`, floor texture generated in code, modal sized `min(1400px,100%) × min(900px,100%)`; always a body-level modal — it cannot be embedded in a panel.
- Texts: every string goes through `o.t(key)`; ~190 keys with prefixes `rm*`, `op*`, `pt*`, `led*`, `rsz*`, `vis*`, `flip*`, `rr*` plus shared `W`, `H`, `D`, `del`, `delSure`, `close`, `isoUndo`, `exSide`. A new shell must supply all of them (LT and EN tables are in app.js lines 10-300).

### 6.3 Embedding verdict

- The **model/geometry half** (`ensure`, `problems`, `geo`, `placed`, `snap`, `gapAround`, `autoSpot`, `makeRoom`, `addSide`, `refit`, `items3d`, opening/point helpers) is DOM-free (needs only `window.DBEngine`) and can be reused as is.
- The **UI half** is one monolith tied to a fixed three-column layout, a full re-mount per change, and width-driven height. It works at 890 px stage width in a 1440 px window (verified live: front SVG 888×551 for one wall, 888×449 for two walls); below 1180 px the inspector drops under the stage, below 760 px everything stacks.

---

## 7. UX and structural problems

Verified or directly readable from the code:

1. **Checks never stop anything.** Drops that collide are accepted with a toast; the list of problems is hidden as soon as anything is selected ("close ✕ to see the list"); problems name cabinets only by number.
2. **Wrong or vague messages.** The drag tooltip always says "Kliūna už kitos spintelės" even when the reason is a door, the wall end or the ceiling (verified live). A cabinet with a socket behind its side shows "Stovi prieš duris ar langą…" because `rmOpShort` is used for every `op*`/`pt*` kind (1209; verified live). Invalid input gives only "Netinkama reikšmė" with no limit.
3. **Resize snapping bug** (room.js:451): a dangling `else` makes door edges unavailable as width snap targets and offers the door's *casing-top height* as an x position (verified live: the right edge snapped at x = 2140 "lygiai su: Durys 1 · apvadas"; no snap at the real casing edge 1430). For windows, their x edges are offered as height targets.
4. **Delete key is inconsistent**: on a cabinet it only takes it off the wall; on an opening/point it deletes. Real delete is a two-click button whose label changes.
5. **Room definition is abstract**: walls are letters with lengths typed in a side panel, direction explained by a paragraph ("A right, B down…"); always clockwise, 90°, max 4, only the last wall removable, no islands/peninsulas, no niches or pillars, no way to pick which corner an L turns to.
6. **No corner logic**: the corner snap just butts a cabinet against the neighbour's front; no corner cabinet, filler or blind-corner concept, and no check for it.
7. **Vertical placement**: cabinets cannot be dragged up/down; a hung cabinet's height is a number field or a bottom-edge resize that also changes its height.
8. **Mixed grids**: moves round to 5 mm, resizes to 1 mm (a quick drag produced width 605 — verified live), keyboard steps 10/100.
9. **Front view with several walls is small** (one scale fits all walls; 2 walls → 0.13 px/mm in a 1440 window), dimension chain exists only for floor cabinets, no vertical dimensions, no gap highlighting.
10. **Long palette, far from the target**: 10 cabinet presets + 3 openings + 6 points in one 200 px column (about 1250 px tall, verified live) — the lower chips are below the fold while the stage is above; LED strip is hidden at the bottom of "Sockets and pipes".
11. **Scroll trap**: the wheel over the stage always zooms and never scrolls the page.
12. **Full re-render per change**: palette scroll position and input focus are lost; the whole app (engine build of every cabinet) re-runs on each nudge.
13. **Selection model**: single selection only; no multi-select, align, distribute, close-gaps, swap, or copy/paste; selection of openings/points lives in a module global that is not cleared between projects.
14. **Tap-to-add places "after the last one"**, possibly on another wall or off-screen, and auto-selects it; the fit-to-gap shrink on drop silently changes the preset width (only a tooltip says so).
15. **Wall select in the inspector** moves the cabinet to the end of the row without checking that it fits.
16. **Level is inferred**: a floor cabinet taller than 1000 mm silently becomes "tall"; water points look for a sink by cabinet *name* regex.
17. **3-D is view-only** and software-rendered (per-pixel JS at up to 2× DPR on every redraw; half resolution while orbiting); `draw3d` and its CSS are dead code.
18. **Realistic render** needs internet (CDN import map), WebGL 2 and up to 45 s to fail; it is a separate modal with its own camera.
19. **Undo**: 40 whole-project clones, room-only, cleared on leaving the tab, no redo.
20. **Theme mismatch**: light paper stage and light 3-D inside a dark UI; drawing colours are fixed.
21. **Project is mutated during drags** (fake `__new` cabinet, temporary sizes) — fragile if anything throws mid-drag.
22. **Worktop** in the room is only a show/hide flag; the real worktop is per cabinet (`c.worktop.on`) and is configured elsewhere ("cabinet step 1"), which the room can only hint at (`rmWtHint`).
