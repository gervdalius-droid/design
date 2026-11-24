# Map: cabinet visual modules (3-D views, front view, sketch, connector art)

Slice: `src/lib/assembly.js`, `iso.js`, `front.js`, `sketch.js`, `art.js`, and the API (non-base64) parts of `fittings.js` and `photos.js`.
All line numbers are `src/lib/<file>:<line>`. Timings were measured in headless Chrome on the dev Mac against the live snapshot
(`http://127.0.0.1:8765/legacy/`, example project), so treat them as a lower bound for a workshop PC or tablet.

## 0. Overview

| Module | Global | What it is | Tech | Used where in the live app | Writes to the cabinet? |
|---|---|---|---|---|---|
| `assembly.js` (476 lines) | `window.DBAssembly` | "Surinktos spintelės peržiūra": live 3-D model of one cabinet. Modes: assembled / without fronts / **boards** (edit a `kind:'box'` construction) / **connectors** (edit joints) | 2-D `<canvas>` with a hand-written software z-buffer rasteriser + an SVG overlay | Right-hand column of the cabinet editor, `#assembly-preview` (app.js:1968, mounted by `mountAssembly`, app.js:2621) | Yes, through hooks: `c.cnc.joints[key]`, `c.box.*` |
| `iso.js` (427 lines) | `window.DBIso` (app alias `ISO`, app.js:9) | Older 3-D connector editor: drag connector cards onto joint lines, drag along, drag off | Pure SVG rebuilt as a string | **Only** in the joints-check modal (`#jc-iso`, app.js:2632), with its palette and inspector hidden by CSS. Its original host `#iso3d` is no longer rendered anywhere | Yes, through `onCommit`: `c.cnc.joints[key]` |
| `front.js` (157 lines) | `window.DBFront` | Front elevation from the real engine parts, in mm units | SVG string | Sections step column map (app.js:1123), plinth-fit picture (app.js:1031), box "sketch" (app.js:1973), kitchen/room elevations (app.js:2679 → room.js) | No (the host adds drag handles on top that write `c.cnc.fg`, plinth gaps, `S.colSel`) |
| `sketch.js` (293 lines) | `window.OfferSketch` (app alias `SK`) | The offer app's isometric wireframe sketch, drawn from the cabinet **definition** (not the engine result) | SVG string | "Brėžinys ir gamybos suvestinė" details block, `#sketch` (app.js:1969, 1973, 2575) | No |
| `art.js` (86 lines) | `window.DBArt` | Connector pictures: cutaway SVG, photo `<img>`, photo+cutaway pair | SVG / `<img>` strings | Connector cards in iso, type buttons in assembly, joinery choices (app.js:1575) | No |
| `fittings.js` (50 lines, 1 data line of 56 KB) | `window.DBFit` | Blum STEP models (TANDEMBOX runner/side/front-fix, TANDEM runner, CLIP top hinge) as triangle meshes and extruded outlines | data + decoders | assembly.js (meshes), drawings.js (prisms) | No |
| `photos.js` (7 lines, 1 data line of 22 KB) | `window.DBPhotos` | `{ cam, confirmat }` → JPEG data URLs (360 px shop photos). No dowel photo | data | art.js only | No |

Shared coordinate system (engine.js:204-207): cabinet axes **x** across (0 = left outer face), **y** depth from the carcass front (0 = front edge, + toward the back; overlay fronts sit at y from −T to 0), **z** up from the carcass bottom (legs are at negative z). A panel's `place = { o, u, v, n }`: `o` is the panel's (x=0,y=0) corner on face A, `u`/`v` the directions of panel X/Y in cabinet axes, `n` the outward normal of face A; the body lies on the −n side. Every view converts a panel-local point `(a, b, c)` to the cabinet as `o + a·u + b·v − c·n`.

---

## 1. `assembly.js` — `window.DBAssembly`

### 1.1 API

```js
window.DBAssembly = {
  view: V,                         // the live camera/option state object (mutable by the host)
  pickAt(x, y),                    // page coords → {kind:'panel', role, name} | {kind:'plinth'} | {kind:'worktop'} | null
  mount(el, c, r, lang, hooks),    // el is REPLACED by a clone (el.cloneNode(false); el.replaceWith(clean)) — assembly.js:475
  setBoards(on)                    // V.boards = !!on; when on: V.edit = false, V.mode = 'assembly'
};
```

- `el`: host element. **`mount` replaces it in the DOM with an empty clone** to drop the old listeners (assembly.js:475), so the host must re-query the element by id every time; a held reference goes stale.
- `c`: the cabinet record (see 1.3 for the fields read).
- `r`: the engine result `DBEngine.buildCabinet(c)` (see 1.3).
- `lang`: `'en'` → English, anything else → Lithuanian. All UI strings are **inline in the module** as `L(lt, en)` pairs (assembly.js:15); only joint names go through the host (`hooks.t('jk_' + key)`, assembly.js:32).
- There is **no unmount / destroy**. A new `mount` disconnects the previous `ResizeObserver` (assembly.js:13); the rAF callback bails out if the element is detached (assembly.js:372).
- No return value, no handle.

`hooks` (assembly.js:12; host implementation app.js:2622-2629):

| Hook | Type | When / what |
|---|---|---|
| `t(key)` | fn → string | Joint label lookup, key `'jk_' + joint.key`. If it returns the key itself, the module falls back to `joint.label` (assembly.js:32) |
| `canUndo` | boolean | Enables the Undo buttons |
| `select` | `{key, side}` or null | "Edit in 3D" from outside: switches to connector mode and selects that joint (assembly.js:17). Host passes `S.iso` only while `S.isoFocus` is set |
| `live` | boolean | The mount comes from typing in a field: draw at half resolution for 300 ms, then sharp (assembly.js:14, 372) |
| `toast(msg)` | fn | Used for invalid board-field input (assembly.js:265). Optional |
| `onCommit(key, patch, selection)` | fn | A connector edit. `patch = { side: null \| 'L' \| 'R', type: 'confirmat' \| 'cam' \| 'dowel', pos: number[] \| null }`; `selection = { key, side, idx }` (assembly.js:45, 121). `side:null` = both sides; `pos:null` = automatic positions for that type |
| `onReset(key, side)` | fn | Reset a joint (side `null`) or one side to automatic (assembly.js:125) |
| `onUndo()` | fn | Undo button |
| `onFillMissing()` | fn | "Pridėti trūkstamas jungtis (n)": host gives every empty joint side automatic positions (app.js:2628) |
| `onBox(fn)` | fn | A board edit: the module passes a **mutator** `fn(cc)` that edits `cc.box` in place; the host does `pushUndo(); fn(cur()); save(); render()` (app.js:2627). Required in boards mode (`data-bx-new` calls it unguarded, assembly.js:256) |

Module-level singleton state (so **one instance per page**):

| State | Line | Content |
|---|---|---|
| `V` | 4 | `{px, py, yaw:.52, pitch:.32, zoom:1, open:.65, mode:'assembly'\|'interior', hardware:true, handles:false, dimensions:true, edit:false, full:false, exploded:true, wire:true}` + `boards` (set later). Survives remounts and cabinet switches |
| `J` | 5 | Connector selection `{cab, key, side:'L', scope:'side'\|'both', index, seam}`. Reset when the cabinet id changes (assembly.js:28) |
| `BX` | 6 | Board selection `{cab, sel}` (board id). Reset on another cabinet or when the board disappears (assembly.js:18) |
| `FRAME` | 8 | The last rasterised frame (pixels, depth, pick buffers) with a hash key — one frame only |
| `PICKS` | 8 | `WeakMap(canvas → {pkbuf, parts, ratio…})` for `pickAt` |
| `COARSE` | 7 | Touch-screen flag, only changes the hint text |

### 1.2 What it draws, and every interaction

Markup built by `mount` (assembly.js:20): `section.av[.full][.connector-mode]` → `.av-head` (title, `W × H × D mm`, "● Gyvas modelis" badge) → `.av-tools` (toolbar) → `.av-quickbar` (connector mode) → `.av-explode-tools` → `.av-stage` (`<canvas tabindex=0>`, `svg.av-joints` overlay, `.av-camera` zoom/reset, `.av-hint`) → `.av-photo-label` → `.av-footer` (`.av-boards`, `.av-connectors`, opening slider `.av-range`, `.av-settings` checkboxes, `.av-note` disclaimer).

**Toolbar** (assembly.js:20, handler 454):

| Control | Effect |
|---|---|
| `data-mode="assembly"` "Surinkta" | Fronts, plinth, worktop, side panels shown. Leaves connector/boards mode |
| `data-mode="interior"` "Be fasadų" | Front panels, door-side hinge parts, plinth, worktop, side panels hidden. Drawer boxes are still drawn, pulled out by the slider. Leaves connector/boards mode |
| `data-boards` "▣ Plokštės" | Only for `c.kind === 'box'` with `r.box`. Toggles boards mode (exclusive with connectors) |
| `data-connectors` "⊙ Jungtys" | Toggles connector mode; disabled when `r.joints` is empty |
| `data-view` front / perspective / underside | Camera presets: yaw 0 pitch 0 / yaw .52 pitch .32 / yaw .52 pitch −.8; zoom and pan reset |
| `data-full` "Išplėsti ⤢ / Uždaryti ✕" | Toggles `.av.full` (CSS `position:fixed; inset:16px; z-index:999`). `V.full` persists across remounts |
| `.av-camera` `data-zoom="1.15"` / `"0.87"`, `data-reset` | Zoom step (clamped .5…8), reset camera |

**Camera** (assembly.js:459-466). Orthographic projection (no perspective), `projection()` at assembly.js:25, centred on `[W/2, D·0.32, (H−leg)/2]`, drawn at `height·0.46`. The picture is **auto-fitted every frame** to the projected bounds of all faces (assembly.js:376), so `zoom` is relative to that fit and the picture rescales when content changes (e.g. doors opening).

| Gesture | Effect |
|---|---|
| Drag (left button) | Orbit: `yaw −= dx·0.008`, `pitch += dy·0.006` clamped ±1.2 rad |
| Shift + drag, or middle-button drag | Pan (`V.px`, `V.py`) |
| Wheel | Zoom at the pointer, `exp(−Δ·0.0015)`, clamped .5…8; page scroll is suppressed over the canvas (`passive:false`) |
| Two-finger touch | Pinch zoom + pan |
| Keyboard on the focused canvas | Arrows orbit (±0.1 rad), `+`/`=`/`-` zoom (**clamped .5…2.5**, unlike the 8 of wheel/buttons), `Esc` deselects → then closes full screen |
| Click (pointer-up with < 5 px movement) | Connector mode with a joint selected → deselect. Boards mode → pick the board under the pointer |

**Footer controls**: opening slider 0–100 % (`V.open`, default 65 %): doors rotate `open × 0.55π` (99° at 100 %) about their hinge edge; drawers and cargo pull-outs travel `min(rail‖500, D−45) × 0.8 × open` (assembly.js:289-292). Checkboxes: `hardware` (runners, hinges, connector heads), `dimensions` (three W/H/D dimension lines drawn on the canvas, assembly.js:447-448), `handles` ("example handles": illustrative bar handles, assembly.js:366-367). In connector/boards mode the slider, checkboxes and note are hidden by CSS (`.av.connector-mode`, legacy_2.css).

**Scene content** (`scene()`, assembly.js:269-370):

| Element | Source | Notes |
|---|---|---|
| Carcass boards | every `r.panels[i]` with `place`, not `drawerOf`, role not `DURYS`/`FASADAS` (271) | True size/position box; colour `DBFront.matColor(p.mat)`, texture via `DBLook` when the material has a photo; flagged `carcass` |
| Legs | `r.legs[]` `{x, y, d, h, feet}` (273) | Cylinders below z=0 |
| Plinth | `r.visual.plinth` (274) | Only assembled mode, not connector mode |
| Worktop | `r.worktop` (275) | Same |
| Side panels | `DBEngine.sidePanels(c)` → reads `c.extras` (276) | Same |
| Connector heads / pins | derived from `panel.holes` (172-193) | Classified by drilling: cam = Ø15 blind, no `op`/`mark`; confirmat = Ø8 `through`; shelf pin = `op === 'pin'`; in exploded connector mode also dowels (Ø8, depth `R.cam.dowel.depthFace`) and cam bolts (Ø8, depth `R.cam.bolt.depthFace`). Only face holes, never edge bores |
| Fronts | panels with role `FASADAS` / `DURYS`, paired **by order** with `r.visual.drawers[i]` / `r.visual.doors[i]` (279-293) | Doors hinge, drawers/cargo slide. A front without meta, `m.fixed`, or a dishwasher front is static |
| Drawer boxes | (a) `r.panels` with `drawerOf === front.name` (GTV/DTC/MERIVOBOX board boxes, 294-308); (b) Blum TANDEMBOX / TANDEM from `DBFit` meshes (`realDrawer`, 146-170); (c) fallback illustrative box (315-348) | Uses `section.hw`, `section.rail`, `DBEngine.R.runner[hw]`, `m.ox0/ox1` or `opening()` to find the side faces |
| Cargo | `m.cargo` door (309-313) | Wire-basket frame, illustrative |
| Hinges | `m.ys[]` heights, `m.hingeLeft`, `m.hinged`, `m.inset` (349-365) | Blum CLIP top mesh from `DBFit` when present and not inset; else primitive plate/arm/cup |
| Example handles | `V.handles` (366) | Skipped for `section.hinge === 'BE FURNITŪROS'` unless `section.fridge` |

**Connector mode** (`V.edit`; assembly.js:27-126, 194-206). The scene keeps only carcass, legs and fittings. Two toggles appear: "Išskleistos jungtys" (`V.exploded`: fittings floated 38 mm off the board with dashed guide lines; dowels and bolts shown) and "Skaidrus karkasas" (`V.wire`: carcass faces skipped by the rasteriser and stroked as outlines, assembly.js:392, 444).

- SVG overlay (`drawOverlay`, 72-104): each `r.seams[]` line (dashed grey; solid blue when active) with a 16 px transparent hit line `data-j-seam`; each position as a dot `g.av-j-dot[data-j-dot][data-j-seam]` (a metal/wood glyph when active, a small circle otherwise); automatic cam dowels as small brown squares; a square marks the seam's origin (position 0). A dot hidden behind geometry gets a dashed ring (depth-buffer test, line 90). Crowded dots are fanned out with leader lines (88-89).
- Click a seam line → select that joint + side. Click a dot → select that connector (`.av-photo-label` shows its photo, type and position). Click the active line again, empty canvas, or `Esc` → deselect.
- **Connectors cannot be dragged here.** `pointerPosition()` (line 105) is defined but never called; legacy_7.css overrides the dot cursor from `ew-resize` to `pointer`. All moves are done with number inputs.
- Editor panel (`renderEditor`, 57-71): joint `<select>`; overview chips per joint with connector count, empty ones flagged `＋` (`jointOverview`, 206); "Add missing connectors (n)"; side select (L/R) and scope select ("this side only" / "both sides") for two-sided joints; three type buttons with photos; per-position number inputs with remove buttons; "＋ Pridėti" (middle of the widest free interval, `addConnector`/`freeIntervals`, 47-53); "↔ Tolygiai" (≥ 3 positions: keeps first and last, spaces the rest evenly); "↺ Atkurti"; Undo.
- Validation before commit (`commitPositions`, 42-46): every position must satisfy edge ≥ 12 mm (cam) / 9 mm (others) and spacing ≥ 24 mm (cam) / 16 mm; for cams `DBEngine.pairedDowels(pos, width, 32)` must place one dowel per cam. `jointWidth()` is the **shortest** seam sharing the joint key (line 38). On failure a status message is shown and nothing is committed.
- Type change (line 121): automatic joint → `onCommit(key, {side, type, pos:null})`; hand-placed joint → positions kept and re-validated for the new type.
- Dead code in this module: `data-quick-add`, `data-j-insert`, `data-j-empty` handlers have no markup that emits them; the `labels` array (line 74, 98) is never filled.

**Boards mode** (`V.boards`, only `c.kind === 'box'`; assembly.js:208-266):

- Click a board in the canvas → selected (painted `#9fd0b4`, outlined in the overlay). Picking uses a per-pixel id buffer (`idbuf`, `Uint8Array`, board index + 1 → max 255 boards).
- Overlay (`boardsOverlay`, 215-225): dashed "ghost" polygons for absent outer boards with a chip "＋ Apačia/Viršus/Kairė/Dešinė/Nugara/Priekis" (`data-bx-add`); on every corner line between two outer boards a round marker `⇄` (`data-bx-flip`, swaps which board covers the other) or `🔒` when the engine forces it (a set-in board).
- Panel (`renderBoards`, 234-249): six on/off chips for the outer boards; "＋ Lentyna", "＋ Pertvara"; card for the selected board with its part short name and `L × W × T`; fields — outer board: `inset` ("Įleista", 0…3000), `T` (3…60, empty = default thickness), per-corner segmented "X dengia / Y dengia", remove; partition: `x` (centre from the left, 0…6000), `T`; shelf: `z` (underside height, 0…6000), compartment select, "Fiksuota (jungtys)" / "Ant laikiklių" (`adj`), remove.
- Number fields accept arithmetic like `600-18` (`numIn`, line 227, evaluated with `Function` after a digits/operators regex). An unusable or out-of-range value reverts the field, sets `aria-invalid` for 1.6 s and toasts (263-265). `BX_LIM.setback` exists but no field renders it.
- New shelf placement (`newShelf`, 230-232): same compartment as the selected shelf/partition (else 0), centred in the tallest free vertical gap. New partition (`newPart`, 233): centre of the widest compartment.

**Material drag-and-drop** (host code, app.js:1643-1663): chips `.mdchip[draggable][data-mdmat]` are dragged with HTML5 DnD over `#assembly-preview`; the host calls `DBAssembly.pickAt(clientX, clientY)` and `dropMat(c, part, name)` writes `c.mat.facade` / `c.mat.carc` / `c.mat.back` / `c.mat.top` / `c.vis.L|R = true` / `c.worktop.mat` / `c.extras[plinth].mat` (app.js:1621-1642). `pickAt` reads the `Uint16` part buffer of the last frame and searches a 4 px neighbourhood (assembly.js:471-474).

### 1.3 Data read and written

Read from the engine result `r`:

| Field | Shape (as observed live) | Used for |
|---|---|---|
| `r.dims` | `{W, H, D, t}` | Fit, header, dimension lines. Fallback to `c.W/H/D` (line 24) |
| `r.panels[]` | `{name, role, L, W, T, mat, place:{o,u,v,n}, holes:[{face:'A'\|'B', x, y, d, depth, through?, op?, mark?}], edges:[{edge, pos, d, depth}], drawerOf?, hingeLeft?, mv?, short, key, …}` | Boards, fittings, drawer boxes |
| `r.legs[]` | `{x, y, d, h, feet?}` | Legs; `leg` height for the fit |
| `r.joints[]` | `{key, label, dflt, w, type, pos[], dowels[], n, e, manual, custom, defPos[], defN, defE, minGap, minEdge, split, single, sides:{L:{…same…}, R:{…}}, box?:{P,Q}}` (engine.js:612-616, 1535-1537) | Connector editor |
| `r.seams[]` | `{key, side:'L'\|'R', o:[x,y,z], d:[dx,dy,dz], w, at?:{type,pos[],dowels[]}}` (engine.js:581-582) — position `a` mm lies at `o + a·d`; the R seam is the mirror; `at` carries own positions when this seam's length differs from the joint's | Joint lines |
| `r.visual.drawers[]` | `{x, w, h, bottom, hw, sec, idx, col, pname, box?, rail?, ox0?, ox1?, mv?, fixed?}` | Fronts and drawer boxes |
| `r.visual.doors[]` | `{x, z, w, h, sec, col, hingeLeft, hinged, ys[], fridge, cargo, inset?, hx?}` | Doors and hinges |
| `r.visual.plinth` | `{x0, x1, z0, z1, y0, t, mat, fit, between, top, floor, sideIn}` or null (engine.js:1213) | Plinth |
| `r.worktop` | `{mat, edge, T, over, left, right, L, W, x0, x1, y0, y1, z0, z1}` or null (engine.js:1916) | Worktop |
| `r.box` (box cabinets) | `{openings[], boards:[{id, name, short, role, kind:'outer'\|'part'\|'shelf', ext:[[x0,x1],[y0,y1],[z0,z1]], T, ins, lt, adj, col, inner}], ghosts:[{id, ext, lt}], covers:[{key, a, b, by, forced}], cavity:[[..],[..],[..]], comps:[[x0,x1],…]}` (engine.js:1751-1752) | Boards mode |

Read from the cabinet record `c`: `c.id`, `c.kind`, `c.box` (`boards`, `inner`, `cover`), `c.dishwasher`, `c.dishWidth`, `c.W/H/D`, `c.mat.carc`, `c.sections[]` (`col`, `hw`, `rail`, `hinge`, `fridge`), and `c.extras` via `DBEngine.sidePanels(c)`. Also globals `DBEngine.R` (rules), `DBEngine.pairedDowels`, `DBFront.matColor`, `DBArt.photo`, `DBFit`, `DBLook`.

Written (always through hooks, never directly):

1. **Connectors** → host `setJoint(c, key, patch)` (app.js:2606-2614):
   ```js
   c.cnc.joints[key] = { type, pos:[mm, …] }          // both sides (pos rounded to 0.1 mm; omitted = automatic)
   c.cnc.joints[key] = { L:{type, pos?}, R:{type, pos?} }   // sides differ; two identical sides collapse back to one entry
   ```
   The engine also understands `{ type, n, e, pos }` per entry (`n` = count, `e` = edge distance; engine.js:603). Reset = `delete c.cnc.joints[key]`, or for one side `setJoint(c, key, {side, pos:null})` (app.js:2625).
2. **Boards** (mutators passed to `onBox`, assembly.js:253-266):
   ```js
   cc.box.boards[id].on = true|false          // id ∈ bottom, top, left, right, back, front
   cc.box.boards[id].inset = number           // mm set in
   cc.box.boards[id].T = number | ''          // '' = default thickness
   cc.box.cover[pairKey] = boardId            // which board covers at that corner, e.g. cover['bottom_left'] = 'left'
   cc.box.inner.push({ id, kind:'shelf', z, col, adj:false })
   cc.box.inner.push({ id, kind:'part', x })
   cc.box.inner[i].x | .z | .T | .col | .adj  // edits; delete = filter by 'i' + id
   ```
   Board ids in `r.box.boards` are the outer names or `'i' + inner.id`.
3. **Undo**: host stack `S.undo` (max 40) snapshots `{id, joints, box}` per cabinet (app.js:2597-2603). Only connector and board edits are undoable.

### 1.4 Rendering technology and restylability

- 2-D canvas, own rasteriser (assembly.js:372-443): convex polygons fan-triangulated, per-pixel z-buffer (`Float32Array`), Lambert shading (`0.68 + 0.32·max(0, n·l)`), sine "grain"/"brushed metal" modulation, bevel darkening near real polygon edges, optional texture sampling (`DBLook.sampler`), back-face culling. Pixel ratio is **hard-coded 2 (sharp) / 1 (while moving or typing)**, not `devicePixelRatio`.
- The canvas is transparent where nothing is drawn, so the stage background comes from CSS (`.av-stage`, legacy_1.css: a white radial gradient). Hard-coded in JS: ground shadow, dimension lines/labels (`#64746c`, label boxes `#f1f3f0`), selected-board colour, all fitting colours, connector colours (`{confirmat:'#285ac4', cam:'#ca6b23', dowel:'#387b53'}`), overlay strokes.
- Sizing: the canvas fills `.av-stage` (CSS `height: clamp(330px, 48vh, 560px)`, other heights per breakpoint and mode); a `ResizeObserver` redraws. It adapts to any container size.
- CSS lives in `legacy_1…9.css` under `.av*` (≈ 190 selectors: `.av-head`, `.av-tools`, `.av-stage`, `.av-camera`, `.av-hint`, `.av-footer`, `.av-range`, `.av-settings`, `.av-note`, `.av-joints`, `.av-j-*`, `.av-quickbar`, `.av-explode-tools`, `.av-photo-label`, `.av-choice-photo`, `.av-hw-card`, `.av-boards`, `.av-bx-*`). Many colours are literals, several with `!important`. In the live dark theme the light-background quickbar shows near-invisible text (observed in a screenshot).
- Re-embedding verdict: the **renderer and pick buffers are reusable**, but the module is a monolith — toolbar, footer, editor panels, strings, and state are all inside one `mount` closure with singletons. A new shell cannot use the 3-D picture without its chrome unless the file is split (scene builder / rasteriser / camera controller / overlays / panels).

### 1.5 Performance

| Measurement (example drawer cabinet, 8 panels) | Result |
|---|---|
| `DBEngine.buildCabinet` | 0.1–0.4 ms |
| Fresh sharp frame, stage 682 × 432 CSS px (1363 × 864 device px) | 45–80 ms including the remount |
| Fresh sharp frame, full screen (2812 × 1260 device px, 9 panels + 2 doors + hinge meshes) | 55–66 ms |
| Identical remount (frame cache hit) | ≈ 20 ms |

- Every app `render()` remounts the view: `innerHTML` rebuild, listeners re-attached, `scene()` rebuilt, all faces hashed (assembly.js:382-384), then either the cached pixels are blitted or the frame is rasterised.
- Orbit/zoom/typing draw at ratio 1 (a quarter of the pixels), then one sharp frame after 180–300 ms.
- Cost scales with canvas pixels and face count; Blum meshes add 120–1100 triangles each per drawer side/hinge (see section 6).
- Chrome logs "Multiple readback operations using getImageData are faster with willReadFrequently" — the context is created without that flag (assembly.js:22).

---

## 2. `iso.js` — `window.DBIso`

### 2.1 API

```js
DBIso = { attach(el, o), view: V, sym: chipIcon, art, full(), _state() }   // iso.js:424; also module.exports under CommonJS
```

- `attach(el, o)` renders into `el` (`innerHTML`), keeping one current mount `C = {el, o}`; `attach(null)` clears it. Click/change listeners are bound once per element (`el.__isoBound`, line 419); stage and chip pointer listeners are re-bound on every attach. No destroy; a document-level `keydown` (Escape) listener is installed at load (line 387).
- `view` = `{th: 0.62, ph: 0.42}` (azimuth, elevation). `sym(type)` → 24 px SVG icon for a connector type (used by the host's segmented controls, app.js:946). `art(type)` → cutaway. `full()` → whether full-screen is on. `_state()` → `{C, D}` for tests.

Options `o` (host calls at app.js:2637 and 2649):

| Option | Meaning |
|---|---|
| `r` | Engine result: reads `r.dims`, `r.panels` (place, L, W, T, role, holes/edges length), `r.legs`, `r.joints`, `r.seams` |
| `sel` | Host-owned selection `{key, side:'L'\|'R', idx: number\|null}` or null. The host stores it and re-attaches |
| `t(key)` | Translator for every string (`isoTitle`, `isoDrag`, `isoT_<type>`, `isoD_<type>`, `isoGrab`, `isoTapLine`, `isoArmed`, `isoSides`, `isoModeBoth/Sep(+T)`, `isoFullOn/Off(+S)`, `isoRotL/R`, `isoHome(S)`, `isoUndo`, `isoJoints`, `isoHint`, `isoPos`, `isoNone`, `isoAddBtn`, `isoEven`, `isoResetT`, `jAuto`, `isoLen` with `{w}{e}{g}`, `isoCamDw`, `isoDiffer`, `isoCopyToL/R`, `isoCopied`, `isoBothNote`, `isoBoth`, `isoOneLine`, `sideL`, `sideR`, `isoL1`, `isoR1`, `isoManualS`, `isoRm`, `isoRemoved`, `isoDropRemove`, `isoTooClose` with `{n}`, `isoTurn`, `isoSame`, `isoConvert`/`isoAddConv` with `{t}`, `isoAdd`, `isoMiss`, `isoMissTap`, `isoSnapMid/Sym/Std`, `isoRef*`, `isoFront`, `close`, `jk_<jointKey>`) |
| `legH` | Leg height, for the view fit |
| `canUndo`, `focusStage` | Undo enabled; focus the stage after attach |
| `mode` | Initial sides mode `'both'` \| `'sep'` — honoured only on the **first attach ever** (`attach.done`, line 391) |
| `toast(msg, bad)` | Messages |
| `onMode(m)` | Sides mode changed (host stores it in localStorage `dbKurejas.isoMode`) |
| `onSelect(sel\|null)` | Selection changed |
| `onCommit(key, patch, meta)` | `patch = {side: null\|'L'\|'R', type, pos: number[]\|null}` (same shape as assembly); `meta = {sel?, msg?, keepFocus?}` |
| `onReset(key)` | Back to automatic |
| `onUndo()` | Undo |

### 2.2 What it draws and the interactions

Layout: `.iso-bar` (three connector cards `.iso-card.iso-chip[data-chip]` with photo + cutaway, and the sides-mode segment) → `.iso-main` → `.iso-sw` (`.iso-stage` SVG + `.iso-view` buttons: full screen, rotate ±90°, home, undo) and `.iso-ins` inspector.

Stage: translucent carcass boxes (fronts skipped), legs as thick lines, a "PRIEKIS" label in front, dashed seam lines, connector markers (confirmat = blue disc, cam = orange ring with a bar, dowel = green disc, automatic cam dowels = small green dots).

| Interaction | Behaviour | Line |
|---|---|---|
| Drag on empty stage | Orbit (`th`, `ph` clamped −0.15…1.35). No zoom, no pan | 187, 213-217 |
| Click on empty stage | `onSelect(null)` | 264 |
| Click a seam line (9 px tolerance) | `onSelect({key, side, idx:null})` | 401-407 |
| Click a marker (20 px, nearest wins) | Select that connector | 266 |
| Drag a marker along its seam | Live preview with a tooltip "`123 mm from front · snapped to …`"; snaps (within 7 px) to the middle, to the mirror of another connector, to the standard positions `defPos`; otherwise rounds to 1 mm; clamped to `[minEdge, w − minEdge]`; red when closer than the gap (24 cam / 16) to a neighbour → rejected with a toast on release | 219-231, 161-171 |
| Drag a marker > 70 px off its seam | Remove on release ("drop to remove") | 222-224, 267 |
| Drag a palette card onto a seam | Floating ghost card follows the pointer (lifted 56 px above the finger on touch); nearest seam within 52 px (64 touch) lights up; drop on free seam = add at the snapped position (and convert the joint if the type differs); drop **on an existing connector** = convert the whole joint to that type | 195-205, 233-258, 274-282 |
| Tap a palette card | Arms "tap mode" (`ARM`): the next tap on a seam places that type; Esc disarms | 399, 416, 387 |
| Sides mode both / separate | `both`: edits apply to L and R (patch `side:null`); `sep` or an already split joint: only the dragged side. Single-line joints (partitions, some rails) have no sides | 78, 193 |
| Keyboard on the stage with a connector selected | Arrows ±1 mm (Shift ±10), Delete/Backspace removes | 371-380 |
| Inspector (no selection) | Joint list with "n × type" summaries, custom ones highlighted | 306-313 |
| Inspector (joint selected) | L/R tabs, "sides differ" badge + copy to the other side, type segment, picture, per-position text inputs, remove, "＋ add" (middle of the widest free stretch), "space evenly", "↺ automatic" | 314-331, 339-370 |
| Full screen | Toggles class `full` on the host element + `html.iso-noscroll`; CSS exists only for `.iso3d.full` | 383-386 |

Differences from assembly's connector checks: iso does **not** check cam/dowel pairing before committing, and its typed inputs (`onChange`, 365-370) commit without any range check — the engine then clamps positions to the edge limit and drops ones that are too close, emitting warnings (engine.js:633-637).

### 2.3 Data

Reads only `o.r` (above). Writes only via `onCommit` → host `setJoint` → `c.cnc.joints[key]` (same shape as 1.3). Position reference texts come from `refKey()` (131-138): which end of the joint is 0 ("from the front", "from the back", "from the bottom", …) per joint key.

### 2.4 Rendering / restylability

- SVG string, sized in pixels to the stage: width = stage `clientWidth` (640 fallback), height = `clamp(320, 0.7·w, 520)` or the stage height when full; fit by bounding-sphere radius (28-35). Painter's algorithm: all faces sorted by average depth (66-69); it relies on translucent fills to hide sorting errors.
- Styling is entirely CSS classes (`.iso-side`, `.iso-carc`, `.iso-rail`, `.iso-back`, `.iso-shelf[.adj]`, `.iso-leg`, `.iso-seam[.on][.hot]`, `.iso-tgt`, `.iso-m.conf/.cam/.dow[.jsel][.sel][.act][.off][.bad][.ghost]`, `.iso-dw`, `.iso-hit`, `.iso-tip`, `.iso-ghost`, `.iso-card`, `.iso-ins`, `.iso-pr`, …) in legacy_0.css:388-587 — easy to restyle. It also emits host classes `btn`, `ghost`, `seg`, `note`, `badge`, `lbl`, `unit`, `xbtn`.
- **Status in the live app**: `#iso3d` is not rendered by any view, so `mountIso()` (app.js:2644) is a no-op. In the joints-check modal the CSS `#jc-iso>*:not(.iso-main){display:none}` and `#jc-iso .iso-main>*:not(.iso-sw){display:none}` (legacy_0.css:207) hide the palette and inspector: only the stage and view buttons remain, so users can orbit, select and drag existing connectors there, but not add from the palette. The "full screen" button there toggles a class with no matching CSS.

### 2.5 Performance

Each orbit `pointermove` rebuilds the whole SVG (`draw()`); marker drags rebuild only the seams/marks groups (`draw('marks')`, 145-157). Polygon count = 6 × carcass panels — trivial. Each commit triggers a full app `render()` and re-attach.

---

## 3. `front.js` — `window.DBFront`

### 3.1 API

```js
DBFront = { svg(c, r, opts) → string, matColor(name, dflt) → '#rrggbb' }     // front.js:155
```

`opts` (front.js:5, 30-45):

| Option | Meaning |
|---|---|
| `bnd` | Column boundaries `[0, x1, …, W]` in mm (default `[0, W]`) |
| `sel` | Index of the column being edited (hit rect gets class `on`) |
| `over` | `bool[]` per column: its sections exceed the height → red dashed overlay |
| `ovens` | `[{x0, x1, z0, z1}]` appliance drawn in that opening |
| `legs`, `legH` | Draw legs and extend the viewBox downward |
| `type` | `'PASTATOMOS'` \| `'PAKABINAMOS'` \| `'ŪKINĖ'` — only moves the illustrative handles |
| `label` | `aria-label` |
| `noHit` | Suppress column hit rects |

`matColor(name, dflt)`: `DBLook.color(name)` first (project look), then a regex table of LT/EN colour words (front.js:8-16), else `dflt`. Shared by assembly.js and room.js.

### 3.2 What it draws / interactions

- `<svg class="fr-svg" viewBox="x0 (−4−wtT) W (H+max(legH, −frontLow)+14+wtT)" preserveAspectRatio="xMidYMax meet">` — **user units are millimetres**, svg y = `H − z`. No width/height attributes: it scales to its container.
- Back to front (front.js:69-133): wall tone per column; inner parts darkened by depth (`0.06 + depth·0.26`), shelves with a lit edge and under-shadow; interior shadows; plinth; board edges facing the front; ovens; fronts (`g.fr-front`: fill, grain pattern for wood names, gloss, outline) with **always-drawn illustrative bar handles**; a red band + "↓ n mm" when fronts reach below the carcass; worktop.
- Special cases: `c.kind === 'panel'` → one rectangle; invalid sizes → a 120 × 80 red dashed "?" placeholder (line 37).
- Built-in interaction: only `<rect class="fr-hit" data-act="colsel" data-v="k">` per column when there are ≥ 2 columns; the host's delegated click handler sets `S.colSel` (app.js:2922). There are **no per-section or per-front targets and no data attributes linking a drawn front to its section**.
- Host-added interaction (app.js:1040-1100): the host string-injects orange handle lines before `</svg>` — `line.fgh[data-fgh=bot|top|l|r]` on the outer edges of the fronts, dragged with document-level pointer listeners using `getScreenCTM().inverse()`; values snap (0, side bottom, 3 mm, t/2) and round to 0.5 mm, a live `text.fgtip` shows the value; on release `c.cnc.fg[k] = v`. The plinth picture (app.js:1029-1038) does the same with `data-plh=gl|gr|gt|gb` → `c.extras[plinthIdx][k]`, after rewriting the viewBox to zoom on the plinth. Above the SVG the host renders column tabs `.fr-tab` and below it back-type labels `.fr-back` (app.js:1126-1129).

### 3.3 Data

Reads `r.dims {W,H,D,t}`, `r.panels` (place, L, W, T, role, mat, hingeLeft), `r.visual` (`drawers[].bottom`, `doors[].z`, `plinth`), `r.worktop`, `r.legs` (front row only), `r.fgaps.hb`; `c.kind`, `c.W`, `c.H`, `c.mat.carc/facade/back`. Writes nothing.

Accuracy caveats: all fronts use the single cabinet colour `c.mat.facade` and inner parts the role-based carcass/back/HDF colour — a part's own `p.mat` is ignored. Handles are drawn even for handle-less/TIP-ON fronts.

### 3.4 Restylability

Good: a pure function returning a string, scalable, mm units. Limits: colours and gradients are inline; gradient/pattern ids are global (`frGloss`, `frTopSh`, `frSideL`, `frSideR`, `frUnder`, `frMetal`, `frMetalV`, `frGlass`, `frFloor`, `frGrain`) and repeat in every SVG on the page; CSS classes are just `.fr-svg`, `.fr-front`, `.fr-hit[.on]` (legacy_0.css:994-1010; `.fr-svg` has a drop-shadow filter).

### 3.5 Performance

≈ 0.1 ms and a 4.7 KB string for the example cabinet; safe to regenerate on every keystroke (the host does, `refreshLive` → `colMapInner`, app.js:2581).

---

## 4. `sketch.js` — `window.OfferSketch`

- API (sketch.js:291): `OfferSketch.svg(c, lang) → string`, `OfferSketch.layout(c) → {secOut:[{kind, secH, col}], cols, colW, dish}`. The body of `cabinetSVG` is copied verbatim from the offer app (sketch.js:43-290) and should stay identical to it.
- Draws a fixed 30° isometric wireframe: carcass slabs, partitions, backs (dashed), shelves, drawer trays (metal vs board by hardware name), semi-transparent blue fronts, bar handles, detailed concealed hinges, an oven, a dishwasher variant, and W/H/D number labels. No interaction, no orbit.
- Input is the cabinet **definition**, not the engine result: `c.thick, H, D, W, dishwasher, dishWidth, cols, colW, sections[] {kind: open|oven|drawers|doors|cargo, height, fill, col, shelves, shelfPos, shelfMode, nDrawers, frontH, rail, hw, nDoors, doorSplit, hinge, hingeSide, innerDrawers, innerPos, innerH, innerRail, innerHw}, vis.L/R (or visLeft/visRight), backs[], hasBack, backType, hang, type`. The host passes `engineDef(c)` plus `colW`, `hasBack`, `backs`, `backType` (app.js:1973). It uses `DBEngine.splitFronts` when present (line 70).
- Section heights use the offer app's arithmetic (`H − explicit heights` shared by the `fill` sections, sketch.js:27-42), not the engine's real zone, and sections stack bottom → top in array order. The picture can therefore differ from the real parts.
- Output: `<svg viewBox width="100%" style="max-width:≤330px" font-family="ui-monospace">`; scale `k = min(290/hSpan, 250/wSpan)`; all colours inline (`FAC = '#2f54eb'`, etc.). No CSS classes. When W or H is missing it returns `<div class="muted" style=…>` with "Įveskite matmenis".
- Cost ≈ 0.2 ms, ≈ 10 KB string. For `kind:'box'` the host substitutes `DBFront.svg` in the same slot.

---

## 5. `art.js` — `window.DBArt`

```js
DBArt = { art(type, cls) → '<svg class="iart …" viewBox="0 0 160 100">…',   // cutaway through the joint
          photo(type, alt) → '<img class="iph" src="data:…" draggable="false">' or an inline SVG "photo" of a dowel,
          pic(type, alt) → '<span class="ipic"><span class="ipic-ph">photo</span><span class="ipic-cs">cutaway</span></span>' }
```

- `type` ∈ `confirmat` | `cam` | `dowel` (unknown → confirmat). Cutaways show the side board standing left, the joined part entering from the right, with drill sizes (Ø8, Ø5×32, Ø15, 34 mm) (art.js:17-59).
- Photos come from `DBPhotos[type]`; there is none for the dowel, so a drawn fluted dowel SVG (`viewBox 0 0 360 270`, gradient ids `dwG`, `dwE`, `dwS` — global ids) is used (art.js:64-80).
- Cutaway styling is all CSS classes (`.ia-bd`, `.ia-gr`, `.ia-hl`, `.ia-mt`, `.ia-th`, `.ia-ln`, `.ia-wd`, `.ia-fl`, `.ia-dim`, `.ia-arr`, `.ia-arrh`, `.ia-t`; plus `.ia-pl`, `.ia-plr`, `.ia-pls`, `.ia-hi`, `.ia-hiC`, `.ia-cm`, `.ia-cut`, `.ia-slot` used by the cam picture) defined in legacy_0.css:479-492 and nearby; without that CSS the SVG renders black. Layout classes `.iart`, `.iph`, `.ipic`, `.ipic-ph`, `.ipic-cs` at legacy_0.css:571-587.
- Stateless and cheap; fully reusable.

## 6. `fittings.js` — `window.DBFit` and `photos.js` — `window.DBPhotos`

`DBFit` API (fittings.js:48):

| Member | Meaning |
|---|---|
| `has(name)` | Is that model present |
| `mesh(name, part)` | `{v: Float32Array (mm, xyz…), t: Uint16Array (triangle indices)}`, decoded once from base64 (int16 tenths of mm) and cached; null if absent |
| `prismPolys(name, part, map, mirrored)` | For drawings: each outline extruded over its z range, mapped by `map(x, y, z) → [X, Y, Z]`; returns one list of `{pts, n}` faces per prism |
| `zmap(z, nl)` | Stretch the runner model (made for NL 500) to another nominal length: the front 137 mm and the rear end keep their shape |
| `sideTop(h)`, `ymap(y, top)` | Squeeze the antaro K side (115.5) to N 68.5 / M 83 |
| `FRONT_Z: 37`, `HINGE: {cupX: −6.5, doorZ: 38.5}` | Reference offsets |

Model frame: x across (0 = the cabinet side's inner face; left-hand parts, mirrored for the right), y up (0 = runner hole line), z along the runner (front edge at z = 37). Hinge: right-hand, part 0 stays on the cabinet, part 1 (cup and links) moves with the door.

| Model | Parts | Vertices / triangles | Prisms |
|---|---|---|---|
| `tbRunner` (TANDEMBOX 576.5001M) | 1 | 520 / 1100 | 1 |
| `tbSide` (antaro 378K5002SA) | 1 | 394 / 800 | 1 |
| `tbFix` (front fixing) | 1 | 62 / 120 | 1 |
| `tdRunner` (TANDEM 560H5000T) | 2 | 496 / 1100, 154 / 300 | 1, 2 |
| `hinge` (CLIP top) | 2 | 204 / 400, 344 / 700 | 2, 4 |

`DBPhotos` = `{ cam: 'data:image/jpeg;base64,…', confirmat: 'data:image/jpeg;base64,…' }` (photos.js:4). Both are plain data modules, CommonJS-or-global, reusable as-is.

---

## 7. Problems noticed (for the redesign)

1. **Three unrelated pictures of the same cabinet** on the editor screen (3-D assembly, front elevation in the Sections step, wireframe sketch in a collapsed block), each with its own projection, colours and data source. The sketch is drawn from the definition and can disagree with the real parts.
2. **The picture is mostly read-only.** For a standard cabinet, clicking the 3-D model does nothing; the front view only selects a column. Only `kind:'box'` has in-picture board editing, and connectors are edited with number fields.
3. **Two connector editors with different rules.** `iso.js` has the good drag UX (snap, tooltips, drop-to-remove, tap mode) but is orphaned in a modal with its palette hidden; assembly's connector mode has the stricter validation (cam/dowel pairing) but no dragging (leftover `pointerPosition`, dead `data-j-insert` / `data-quick-add` handlers). Their limits are duplicated as literals (12/24 cam, 9/16 others) in assembly.js:42, iso.js:172 and the engine.
4. **Monolithic assembly module**: chrome, strings, state, rasteriser and editors in one closure; singletons (`V`, `J`, `BX`, `FRAME`) prevent a second instance; `mount` swaps the host element; no destroy.
5. **Full remount on every app render**, including listeners and a scene hash; only the last frame is cached.
6. **Pixel ratio hard-coded to 2**, software rasteriser on the main thread (45–80 ms per sharp frame on a fast Mac).
7. **Theme leakage**: light-only hard-coded colours inside a dark app (quickbar text is unreadable in the live snapshot); many `!important` rules spread over nine CSS blocks.
8. **Pick-buffer gaps**: side panels are rasterised with the worktop's pick id when a worktop exists (assembly.js:275-276: `CUR_PK` is not reset before `sidePanels`), so dropping a material on a side panel retargets the worktop (verified live: with a worktop and a right side panel, `pickAt` over the side panel returns `{kind:'worktop'}`); without a worktop the side panel is not pickable at all; drawer boxes, legs and fittings are not pickable; in boards mode, fronts of a box cabinet occlude the boards and a click on them just deselects.
9. **Front meta is matched by array order** (`meta.doors[di++]`, `meta.drawers[fi++]`, assembly.js:283) rather than by name; only drawers carry `pname`.
10. **Inconsistent zoom limits** (keyboard 2.5 vs 8 elsewhere) and auto-fit on every frame (the model rescales while the opening slider moves).
11. **Front view fidelity**: one facade colour for all fronts, handles always drawn, global gradient ids, hit targets only per column.
12. **Undo covers only joints and box boards**, not the other cabinet fields.

---

## 8. Which view should become the primary direct-manipulation surface?

**Recommendation: the front elevation (the `DBFront` idea) as the primary build surface, with the 3-D assembly view as a linked live companion.**

Why the front elevation:

- A standard cabinet is defined in the front plane: columns across, sections stacked in each column, fronts over them. Every one of those is an unobstructed rectangle in a front view; in 3-D they overlap, hide behind fronts and need orbiting.
- It is already SVG in **millimetre units** with y = H − z, so hit areas, drag handles, snapping and inline dimension fields are exact and cheap. The host already proves this with the gap handles (`data-fgh`) and column hit rects.
- It regenerates in ≈ 0.1 ms, so it can follow every keystroke and pointer move; the 3-D raster cannot.
- It works with touch and coarse pointers (large flat targets), and it prints.

What is missing for that:

| Gap | Detail |
|---|---|
| Section geometry from the engine | The result has `r.visual.doors/drawers` (with `sec`, `col`) but no rectangle for open sections, ovens, or the remaining free zone. The host recomputes zones itself (`zoneInfo`, app.js:951-958). The engine should return `sections: [{index, col, kind, x0, x1, z0, z1}]` plus per-column zones and overflow |
| Stable ids on drawn elements | Each front/section/shelf/partition needs `data-sec`, `data-col`, `data-part` so a click maps to the record. Today only columns have `data-v` |
| Hit targets and states | Hover, selected, invalid states per section; "＋" targets in free space and between sections; divider handles between sections (height) and on partitions (column width) |
| Seeing inside | Fronts cover shelves and inner drawers. A "fronts off / x-ray" toggle (like assembly's "Be fasadų") is needed to edit shelves in the same picture |
| A component, not a string | The current function returns one string and the host patches it with `replace('</svg>', …)`. Selection and drag need a retained DOM (or a keyed re-render) and per-instance gradient ids |
| True colours | Use each part's `p.mat`, not the single `c.mat.facade`; respect handle-less fronts |
| Dimensions in the picture | No dimension labels today; inline editable W/H, section heights and column widths would remove most form fields |
| Validation overlays | Only "column over-full" exists (`opts.over`). Engine warnings carry no part/section reference to highlight in the picture |

Role of the other views in a new version:

- **3-D assembly view**: keep as the always-visible confirmation ("what will be built") and as the editor for things that are 3-D by nature — box constructions (boards mode already works and is the closest thing to direct manipulation in the app) and connectors. Link it to the front view: `pickAt` already returns `{kind, role, name}`, so a click on a part in 3-D can select the matching section/board. Needed: split the module (scene / renderer / camera / overlays / panels), instance state instead of singletons, a name-based map from panels to sections, hover highlight (a second pass or an outline from the pick buffer), and either WebGL or an off-main-thread raster if it is to animate during drags.
- **`iso.js`**: retire as a separate view, but port its interaction logic (snap candidates, limits, tooltips, drop-off-to-remove, touch lift, tap-to-place, both/separate sides) onto the unified 3-D view's seam overlay, and take assembly's cam/dowel pairing check with it.
- **`sketch.js`**: no role in building. Keep only if visual parity with the offer app's documents is wanted.
- **`art.js`, `photos.js`, `fittings.js`**: reuse unchanged (art.js needs its `.ia-*` CSS carried over).
