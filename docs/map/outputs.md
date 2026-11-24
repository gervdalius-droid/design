# Legacy map — output modules (part list, ReportLists workbook, drawings, ZIP)

Slice: `src/lib/export.js` (224 lines), `src/lib/report.js` (2817 lines, of which 196–2488 are the embedded QR library), `src/lib/report_tpl.js` (base64 template), `src/lib/zip.js` (48 lines), `src/lib/drawings.js` (1258 lines), plus the glue in `src/lib/app.js` that calls them, `legacy/README.md` line 35, and the tests `test/engine/drawings_check.js`, `sheet_overflow_check.js`, `test/engine/rep/`.

Everything marked **(verified live)** was run in this session against `http://127.0.0.1:8765/legacy/` through `tools/cdp.py` with a 10-cabinet project made from all ten `PRESETS` (project name `Bandymas Ąžuolas`, 70–74 parts, 63 programs). Everything else is read from the code. The UI around these outputs (buttons, ready-check, drawings tab) is in `docs/map/app-output.md`; this file is about what is produced and the rules behind it.

Contents

1. Pipeline at a glance
2. `DBZip` (zip.js)
3. `DBExport` (export.js) — the project part list
4. `DBReport` (report.js) — the ReportLists workbook
5. `DBDraw` (drawings.js) — drawing sheets and PDF
6. The outputs: what each file contains, file names
7. Checks and validations done at output time
8. Naming, numbering and dedupe rules that must stay identical
9. How the Nesting app reads the workbook
10. Regression testing: golden files
11. State of the old tests
12. Problems seen in this slice

---

## 1. Pipeline at a glance

```
S.proj (project JSON)                                  app.js
  └─ buildProjectAll()                    app.js:721   → pj
       ├─ engineDef(c) per cabinet        app.js:689   (numbers parsed, cols/colW resolved, hung → no legs)
       ├─ extras → loose[]                app.js:723   (validated: size, qty)
       ├─ worktopPieces() → loose[]       app.js:739   (joined along a wall, trimmed in corners)
       └─ DBExport.buildProject(col, opts) export.js:27
            ├─ DBEngine.buildCabinet(def, nr-1, proj)   → panels, hardware, warnings
            └─ DBEngine.programs(panel)                 → .XXL texts, ids, warnings
pj = { project, date, parts[], files[], warnings[], hardware[] }
  ├─ csvOf(pj)                            app.js:3139  → string
  ├─ xlsmBytes(pj)                        app.js:3147  → Promise<Uint8Array>
  │    ├─ DBReport.buildReport(tpl, DBExport.reportInput(pj), {version, xlsx:true})   (needs JSZip)
  │    └─ fallback plainXlsm(pj) = DBZip.zip(DBZip.fromEntries(DBExport.workbookEntries(DBExport.sheets(pj))))
  ├─ zipAll(pj)                           app.js:3153  → Promise<Uint8Array>  (xlsx + A3 PDF + XXL + csv + json + notes)
  ├─ saveProgs(names)                     app.js:3183  → separate .XXL downloads
  └─ nestHandoff()                        app.js:2299  → xlsx as base64 in localStorage['dbNestHandoff'], opens /nesting/?from=builder
drwSheets(only, paper)                    app.js:2175  → DBDraw.sheets(S.proj, S._info, {...}) → [{id, cab, cont, title, svg, error}]
drawingsPdf(list, paper)                  app.js:2327  → DBDraw.pdf(list, {paper, title, progress}) → Promise<Uint8Array>
```

`window.__dbk` exposes `buildProjectAll, xlsmBytes, csvOf, zipAll` (app.js:3225). It does **not** expose `drwSheets`, `drawingsPdf`, `zipFiles`, `projName` or `worktopPieces`; the drawing list of the last render of the drawings tab is reachable as `__dbk.S._drw`.

Globals: `window.DBExport`, `window.DBReport`, `window.DBZip`, `window.DBDraw`, `window.DB_REPORT_TEMPLATE_B64`. In a CommonJS environment each file sets `module.exports` instead (and export.js does `require('./engine.js')`, report.js does `require('jszip')`).

---

## 2. `DBZip` — zip.js

`api = { zip, crc32, fromEntries }` (zip.js:46).

| Function | Signature | Notes |
|---|---|---|
| `zip(files)` | `[{ name:string, data:string \| Uint8Array }] → Uint8Array` | Synchronous. STORE only (method 0, no compression). Strings are UTF-8 encoded with `TextEncoder`. |
| `crc32(bytes)` | `Uint8Array → uint32` | Table driven. |
| `fromEntries(map)` | `{path: text} → [{name, data}]` | Order = `Object.keys` order. |

Format facts (zip.js:14–42):

* Sizes and CRC are in **every local header**, no data descriptors — stated reason: "the nesting app's .xlsm reader needs them there" (zip.js:4–5). This matters only for the fallback workbook, which is zipped with this writer.
* General-purpose flag `0x0800` (UTF-8 names), version needed 20, no extra fields, no comments, no ZIP64 (4 GB / 65535 entries limits, irrelevant here).
* DOS date/time of every entry = `new Date()` at call time (zip.js:15–17). **Two calls in different 2-second windows give different bytes.**
* Folders are not written as entries; a name such as `PROJ_XXL/file.XXL` simply contains the slash.

---

## 3. `DBExport` — export.js

`api = { buildProject, sheets, workbookEntries, edgeText, reportInput }` (export.js:221). Depends on `DBEngine` (`safeName`, `buildCabinet`, `programs`, `num`). All functions are synchronous and pure except for what the engine reads from its rule tables `DBEngine.R`.

### 3.1 `buildProject(col, opts)` (export.js:27–86)

Input:

```js
col = {
  cabinets: [ { nr:1,            // 1-based cabinet number; the list is sorted by nr
                def:{…},         // engine cabinet definition (app.js engineDef output); deep-cloned before use
                scaled?:bool } ],// never set by app.js — the "Scale" warning at export.js:37 is dead
  loose:    [ { name, cab,       // cab = 1-based cabinet number the part belongs to, or '' / undefined
                mat, L, W, T, qty,
                eb:{ eb1, eb2, eb3, eb4 },   // edge material name per edge, '' = none
                path?, shaped?,              // only read for the "not rectangular" warning; app.js never sets them
                worktop?, ids? } ]           // set by worktopPieces(); ignored here, used by drawings
}
opts = { project:string, date:'YYYY-MM-DD' }
```

What `app.js` feeds in (app.js:721–735):

* `cabinets: S.proj.cabinets.map((c, i) => ({ nr:i + 1, def:engineDef(c) }))` — **the cabinet number is the position in the list**.
* `loose` from each cabinet's `extras` (app.js:723–730): skipped with a warning when `L` or `W` is not > 0, or when `qty` is filled in and not > 0; `T = num(x.T) || num(c.thick) || 18`; `mat = x.mat || c.mat.carc || ''`; `qty = max(1, round(qty || 1))`; edges `eb1..4 = x.e1..e4 ? em : ''` where `em = x.edgeMat || (x.mat === c.mat.facade ? c.edge.facade : c.edge.carc) || ''`.
* `loose` from `worktopPieces().pieces` (app.js:768–774): `{ name:'STALVIRSIS' or 'STALVIRSIS_<nr>-<nr>…' when joined, cab:first cabinet nr, ids:[cabinet ids], mat, L, W, T, qty:1, worktop:true, eb:{ eb1:front edge, eb2:'', eb3:left end if overhang and not trimmed, eb4:right end … } }`. Side effect: `RM.ensure(S.proj)` may auto-place cabinets and `save()` (app.js:740).
* `opts = { project:projName(), date:new Date().toISOString().slice(0, 10) }`.
* After the call the worktop warnings and extras warnings are appended to `res.warnings` (app.js:733).

Output `pj`:

```js
{ project,            // E.safeName(opts.project || 'PROJ') || 'PROJ'
  date,               // opts.date || ''   (used only by the fallback workbook's title rows)
  parts:   [ part ],  // cabinet parts in cabinet order then panel order, then loose parts in first-seen order
  files:   [ { name:'<part>_<n>OP.XXL', text } ],   // every program, in part order
  warnings:[ string ],                               // Lithuanian, de-duplicated exact matches (export.js:84)
  hardware:[ { item, unit, qty, cabs:[nr…] } ] }     // merged by item|unit over the project (export.js:79–80)
```

`part` for a cabinet panel (export.js:45–51) **(verified live)**:

```js
{ name:'Bandymas_Azuolas_1_KAIRE', short:'1-KAIRE', cab:1, role:'KAIRE', mat:'KARKASAI 18mm',
  L:702, W:560, T:18,            // exact engine numbers, NOT rounded (e.g. W:236.33333333333334)
  qty:1,                          // always 1: every cabinet panel is its own row
  eb:{ eb1:p.eb.y0, eb2:p.eb.y1, eb3:p.eb.x0, eb4:p.eb.x1 },     // '' or the edge material name
  ebFac:null | { eb1:bool, eb2, eb3, eb4 },                       // edges banded "as the fronts" (visible part)
  op1:'<name>_1OP' | '', op2:'<name>_2OP' | '',
  progs:[ { id, kind:'main'|'flip'|'rot', file } ],
  src:'cab',
  pic:{ holes:[{ x, y, d, face:'A'|'B', through:bool }], edges:[{ edge:'x0'|'x1'|'y0'|'y1', pos, d, depth }] },
  ebLen }                         // banded length × qty, mm
```

`part` for a loose part (export.js:74–75): `{ name, short, cab, role:'', mat, progs:[], L, W, T (rounded to 0.1), qty (summed), eb, op1:'', op2:'', src:'loose', ebLen }` — no `pic`, no `ebFac`.

Edge key meaning everywhere downstream: `eb1` = long edge at panel y = 0 (label "F", front), `eb2` = long edge at y = W ("B"), `eb3` = short end at x = 0 ("L"), `eb4` = short end at x = L ("R").

### 3.2 `reportInput(pj)` (export.js:213–220)

Adapter to `DBReport.buildReport`:

```js
{ project: pj.project,
  hardware: pj.hardware.map(h => ({ item:h.item, qty:h.qty })),        // unit and cabinet list are dropped
  parts: pj.parts.map(p => ({ solid:p.name, dbpart:p.name, name:p.short, mat:p.mat,
                              L:r1(p.L), W:r1(p.W), T:r1(p.T),          // rounded to 0.1 mm
                              qty:p.qty,
                              eb:{ F:eb1, B:eb2, L:eb3, R:eb4 },
                              progs:p.progs || [], pic:p.pic || null,
                              ebFac:null | { F, B, L, R } })) }
```

Not passed although `buildReport` accepts them: `ebInfo` (edge feature name / thickness / cost / length), `stockRef`, `grainVert`, hardware `supplier` / `ref` / `cost`.

### 3.3 Fallback workbook: `sheets(pj)` + `workbookEntries(sheetList)` (export.js:93–210)

Used only when the template workbook cannot be made (§4.6). `sheets(pj)` returns `[{ name, rows, cols }]`; a cell is a number, a string, `{ v, b:true }` (bold) or `{ f }` (formula). `workbookEntries` returns a `{path: xml}` map (a minimal OOXML package: content types, rels, workbook with `fullCalcOnLoad="1"`, one sheet XML each, two-font styles, shared strings — "the nesting reader ignores inline strings", export.js:17).

Sort order here is `byThickThenName` (export.js:90): **thickness descending**, material (`localeCompare`), cabinet number, name — the opposite thickness order to the template workbook.

| Sheet | Layout **(verified live)** |
|---|---|
| `PARTLIST` | rows 1–3 title (`DETALIŲ SĄRAŠAS`, project; `Data`; `Sugeneruota`), row 5 header `Nr · Grupė · Part · Spintelė · DETALĖ · MEDŽIAGA · ILGIS · PLOTIS · STORIS · KIEKIS · KRAŠTAI · KRAŠTO MEDŽIAGA · PROGRAMOS`; group row `'' · '18 mm'` on every thickness change; data `nr · '' · name · cab · short · mat · L · W · T · qty · 'L1 L2 W1 W2' · edge materials · program ids (space separated, all of them)` |
| `LABEL` | 10-row bands, two labels per band (A:F and H:M). Row 0: `1OP`, op1 id, …, `2OP`, op2 id. Row 1: `=_xlfn.IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data="&"<id>")` under each op that exists. Row 7: `Kraštai: L1 W2` or `—`. Row 8: `L × W × T`, short name in +3. Row 9: material, full name in +3 |
| `HARDWARE_LIST` | title, header `Pozicija · Kiekis · Vnt. · Spintelės`, rows, then the note "Kiekiai apskaičiuoti iš spintelių konstrukcijos — patikrinkite prieš užsakant." |
| `STOCK_CORE` | header in row 3 with Part in C, Feature E, Material F, Length I, Width J, Thickness K, Qty L; rows `'' '' name '' 'CORE' mat '' '' L W T qty` |
| `EDGEBAND` | `Part · Feature (EDGE1..4) · Material · Length · Qty` |
| `SUMMARY` | per material+thickness: parts, area m²; per edge material: metres; totals `Detalių iš viso`, `CNC programų` |

`edgeText(eb)` (export.js:89): `eb1 → 'L1'`, `eb2 → 'L2'`, `eb3 → 'W1'`, `eb4 → 'W2'`, joined by spaces. Also used by the CSV.

---

## 4. `DBReport` — report.js

`api = { buildReport, sortParts, drawPanel, Geom }` (report.js:2814).

### 4.1 `buildReport(tplBytes, pj, opts)` (report.js:2529–2812)

* **async**, returns `Promise<Uint8Array>` — `zip.generateAsync({ type:'uint8array', compression:'DEFLATE', compressionOptions:{ level:6 } })`.
* `tplBytes`: the template workbook as bytes. The app passes `b64ToBytes(S.tplB64 || window.DB_REPORT_TEMPLATE_B64)` (app.js:3148).
* `pj`: the `reportInput` shape of §3.2. Per part it reads `solid, dbpart, name, mat, L, W, T, qty, eb{F,B,L,R}, ebFac{F,B,L,R}, ebInfo{F,B,L,R → {feat, thk, cost, len}}, stockRef, progs[{id}], pic{holes, edges}, grainVert`; `qty` becomes `max(1, round(qty || 1))` (report.js:2554).
* `opts`: `{ xlsx:true|false (default: macros removed unless exactly false), version:string (default 'v20-kurejas'), info:object }` — when `opts.info` is given, `opts.info.flagged` is set to the number of yellow rows (report.js:2760). **The app does not pass `info`** (app.js:3150), so the count is thrown away.
* External dependency: **JSZip** as `window.JSZip` (report.js:26). `legacy/index.html:1188` loads `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` — internet needed on first load. No other network access: the QR codes are generated in the file.
* Embedded: qrcode-generator 1.4.4 (Kazuhiko Arase, MIT), report.js:202–2488; `qrPng(text, scale=8, margin=2)` (report.js:2490) makes a 1-bit greyscale PNG with stored (uncompressed) zlib blocks: QR type automatic, error correction **M**, Byte mode, UTF-8.

### 4.2 The template (report_tpl.js)

`window.DB_REPORT_TEMPLATE_B64` (report_tpl.js:4, 430 945 base64 characters → 323 182 bytes). Comment: "a DB_PartList v18 report (DiG_Virtuve, 14 Oct 2026) stripped to its sheets, styles, macros, pivots and logo". Sheets in order **(verified live)**: `PARTLIST`, `LABEL`, `HARDWARE_LIST`, `HARDWARE` (hidden), `EDGEBAND` (hidden), `STOCK_CORE` (hidden), `Tp_Global`, `Tp_LANGUAGE`, `Tp_STOCK_CORE`, `Tp_FINISH`, `Tp_EDGEBAND`, `Tp_HARDWARE`, `Tp_HARDWARE_LIST`, `Tp_PARTLIST`, `Tp_MULTIBODIES`, `Tp_PRODUCT`, `Tp_WELDMENTS`, `Tp_LABEL` (all hidden), `SUMMARY`, `Tp_NESTING_B` (hidden).

A user can replace it in Settings: `loadTemplateFile` (app.js:670–684) accepts any workbook whose `xl/workbook.xml` names both `PARTLIST` and `LABEL`, keeps it as base64 in `S.tplB64` and in `localStorage['dbKurejas.reportTpl'] = { name, b64 }` (falls back to "this session only" when storage is full).

Template rows the writer relies on (a new template must have them):

| Sheet | Rows used | For |
|---|---|---|
| PARTLIST | 1–9 | header block, copied; `J1` and `Q5` get the project name (report.js:2594) |
| PARTLIST | 10 | style of the first thickness group row; 12 (else 10) the style of later group rows |
| PARTLIST | 11 (else 13) | style and height of a data row |
| PARTLIST | 10–12, columns X–AB except AA | "SETTINGS_*" switch cells kept in place (AA held another customer's last part name and is dropped) (report.js:2600–2601) |
| LABEL | 1–10 | first label band; 11–20 the style of every later band (falls back to 1–10) |
| EDGEBAND, STOCK_CORE | row 4 | style of a data row; 3 settings rows kept right of the table |
| HARDWARE_LIST, HARDWARE | row 8 | same |

Layout constants measured on the v18 report (report.js:18–22): PARTLIST picture box 120.5 × 54 pt, centre = column B start + 3 + 60.25 pt, row top + 32.2 pt; LABEL picture box 109 × 54 pt at column C (and J) start + 3 + 54.5 pt, 3rd… row `base + 3` top + 30 pt; column width in points = characters × 5.5.

### 4.3 What is written

**Order** — `sortParts` (report.js:183–187): thickness ascending (rounded to 0.1), material upper-cased with a binary compare, length descending, width descending, part code (`dbpart`) binary. "As the macro v20 / SWOOD".

**PARTLIST** (report.js:2589–2645). One group row per thickness: `B = '<T> mm'`, merged `B:R`. One data row per part **(verified live, row 11)**:

| Col | Header (row 9) | Value |
|---|---|---|
| A | BAR CODE | formula `=D<row>` |
| B | PAVEIKSLIUKAS | empty cell; the picture floats over it |
| C | SOLIDNAME | `solid` (= full part name) |
| D | DETALĖS KODAS | `dbpart` (= full part name) |
| E | DETALĖ | `name` (= short name, e.g. `1-KAIRE`) |
| F | PLOKŠTĖ | `mat` |
| G / H / I | L / W / T | numbers, 0.1 mm |
| J | KIEKIS | `qty` |
| K / L / M / N | F / B / L / R | edge material on that edge, or empty |
| O | DXF | empty |
| P | NOTES | the `PATIKRINTI…` note when flagged, otherwise the short name |
| Q | BARCODE | `solid` |
| R | SOLIDNAME | formula `=$Q$5&""&(ROW()-9)` |

Row heights are rounded to whole screen pixels (0.75 pt, `pxH`, report.js:192) so pictures do not drift. Merges of rows 1–9 are kept, group merges added; conditional-format ranges that started below row 9 are re-pointed at rows 10…last; `<dimension>` becomes `A1:AI<last>`.

**Pictures** — `drawPanel(sh, tag, part, cx, cy, bw, bh)` (report.js:150–179), black only (thermal label printer): scale `min((bw − 10.4)/L, (bh − 10.4)/W)`, **L horizontal, the F edge (panel y = 0) at the bottom**; white box + outline 0.75 pt; face holes as ovals of at least 2.5 pt, dashed when drilled from face B and not through; edge bores as dashed rectangles `depth × diameter`; a banded edge is a 3.5 pt bar 3.2 pt outside the outline; grain = a double-headed arrow through the middle, 0.6 of the picture length, horizontal unless `part.grainVert` (never set by the app). Shape names `PIC_B<row>_<k>` on PARTLIST and `PIC_<col><row>_<k>` on LABEL, ids from 1000. Template pictures that are real images (the logo) are kept, old `PIC_*` shapes dropped (`emptyDrawing`, report.js:2586).

**LABEL** (report.js:2647–2720). **One label per PARTLIST row** (not per piece — the quantity is on the part-list row), two per 10-row band; left label columns A–F, right label H–M (offset 7). With `base = 10·b + 1` **(verified live)**:

| Row | Left-label cells |
|---|---|
| base + 1 | `A = '1OP'`, `B = dbpart`, `F = '2OP'` |
| base + 2 | QR pictures over `A` (merged `A3:A7`) and, only when a second program exists, over `F`; `B` = edge text of L, `C` = edge text of B, `E` = edge text of R |
| base + 3 | the panel picture, anchored at column C |
| base + 7 | `C` = edge text of F |
| base + 8 | `A = '702.0x560.0x18.0'` (`fmt1` L x W x T, always one decimal), `D` = short name |
| base + 9 | `A = 'MAT: ' + mat`, `D = solid` (full name) |

Edge text (`ebLbl`, report.js:195): `LAMINUOJASI` for a banded edge, `PAGAL FASADA` when that edge is banded with the fronts' edge (`ebFac`), empty otherwise.

**QR content** (report.js:2666–2667): first QR = `progs[0].id`, **or `dbpart + '_1OP'` when the part has no program at all**; second QR = `progs[1].id` only if it exists. A third program is never on the label. Each QR is a PNG `xl/media/dbqr_<k>.png`, anchored centred in its merged cell with a 3 pt margin, shape name `PIC_QR_<cell>` and `descr="<the encoded text>"`, id `5000 + k`. No formulas are written on the LABEL sheet **(verified live: no `<f>` in its sheetData)**. `qrF` (report.js:2526, an `IMAGE("https://quickchart.io/qr?text=…")` formula) is defined but unused. Reason given (report.js:196–201): with formulas Excel fetched every QR from the internet, stayed busy and the nesting app's print call failed with `RPC_E_CALL_REJECTED`.

**EDGEBAND** (from row 4): one row per banded edge in the order F, B, L, R: `C = solid`, `E = 'Edgeband1'…'Edgeband4'` (or `ebInfo.feat`), `F = edge material`, `I = length` (L for F/B, W for L/R, or `ebInfo.len`), `J = ebInfo.thk`, `K = qty`, `L = IFERROR((I)/(1000)*K,0)`, `M = ebInfo.cost`, `N = IFERROR(L*M,0)`. From the app J and M are always empty.

**STOCK_CORE** (from row 4): `C = solid`, `E = 'CORE'`, `F = mat`, `H = stockRef` (empty), `I/J/K = L/W/T`, `L = qty`, `M..P` length/area/volume formulas, `R = 1`, `S` unit formula, `T` cost formula.

**HARDWARE_LIST** and **HARDWARE** (from row 8): `C = item`, `D = supplier`, `E = ref`, `F = qty`, `G = cost || 0`, `H` a language VLOOKUP formula. From the app only item and qty are filled — **the unit (`vnt.` / `kompl.`) and the cabinet list are not in this workbook**.

**Workbook-level** (report.js:2535–2811): cached rich values, `metadata.xml`, `calcChain.xml` removed; every sheet opens at A1 and PARTLIST is the active tab; VBA project, its relations, macro attributes and the content type are removed (`.xlsx`, unless `opts.xlsx === false`); `fullCalcOnLoad="1"`; defined name `DB_PartList_Version = "<opts.version>"` (the app passes `'v20-kurejas-' + VERSION`, i.e. `v20-kurejas-2.1`); every pivot cache gets `refreshOnLoad="1"` so SUMMARY refreshes when Excel opens the file; shared strings no cell uses any more are blanked (so another customer's part names from the template do not travel).

Sizes **(verified live)**: empty project 235 KB / 138 entries in about 80 ms; the 70-part project 414 KB / 217 entries, 76 QR PNGs, 1604 shapes on PARTLIST and 1680 on LABEL.

### 4.4 Other exports

* `sortParts(parts)` — the order above, non-mutating.
* `drawPanel` and `Geom(sheetXml, rowHeights)` (column starts / row tops in points, `anchorX/anchorY` → cell + EMU offset) are exported for tests.

### 4.5 Determinism

Two builds of the same input 4 s apart: **every one of the 217 entries has identical content, the file bytes differ** (verified live) — JSZip stamps rewritten entries with the current time. Two builds within the same 2 s were byte-identical. So: compare unzipped entries, or freeze `Date`.

### 4.6 When the fallback is used (app.js:3147–3152)

`xlsmBytes(pj)` returns the plain workbook of §3.3 — under the **same file name** — when `window.DBReport`, `window.JSZip` or the template is missing, or when `buildReport` rejects. The user gets one toast: "ReportLists šablono nepavyko užkrauti (reikia interneto JSZip bibliotekai) — sukurtas paprastas sąrašas." / "The ReportLists template could not be loaded (JSZip needs internet) — a plain list was made instead."

---

## 5. `DBDraw` — drawings.js

`api = { iconSvg, hwKind, hwText, unitText, cabPlan, cabLists, groupName, fittingBoxes, overlap2, sheets, sheetViews, sheetAssembly, pdf, pdfBytes, solve, viewIso, viewOrtho, cabBoxes, pbox, explode, partOrder, TX }` (drawings.js:1256).

### 5.1 `sheets(proj, infos, opts)` (drawings.js:1181–1200) — synchronous

```js
proj  = the project JSON: { name, cabinets:[c…], layout? }       // c.id, c.name, c.kind, c.dishwasher, c.extras, c.mat, c.edge, c.cnc, c.sections, c.thick
infos = [ { r: DBEngine.buildCabinet(...) result } ]            // one per cabinet, same index; the app passes S._info (app.js:826–831)
opts  = { lang:'lt'|'en', project:string, date:string, paper:'A3'|'A4',
          only: cabinet index | null,                            // null = everything
          worktops: worktopPieces().pieces | null,               // so a shared worktop is listed as it is cut
          RM: DBRoom }                                           // default window.DBRoom
→ [ { id, cab, cont, title, svg, error } ]
```

Call in the app (app.js:2182): `DR.sheets(S.proj, S._info || [], { worktops:worktopPieces().pieces, lang:S.lang, project:S.proj.name || projName(), date:<today>, paper:pp, only:… , RM })`. Note `project` here is the **typed** project name, not the sanitised one.

From the engine result `r` the module reads: `r.panels[]` (`name, short, role, mat, L, W, T, place{o,u,v,n}, eb{y0,y1,x0,x1}, holes[{x,y,face,op}], edges[{edge,pos,d,depth}], drawer, drawerOf, hingeLeft`), `r.legs[{x,y,h,d,feet}]`, `r.dims{W,H,D,t}`, `r.visual{plinth, doors[], drawers[]}`, `r.worktop`, `r.hardware[{item,qty,unit}]`, `r.joints`. Optional globals: `window.DBLook.color(material)` (board colours), `window.DBFit` (makers' fittings from STEP models: `has, prismPolys, HINGE, FRONT_Z, zmap, ymap, sideTop`), `window.DBEngine.R` (hinge / runner rule numbers). From `RM`: `placed, geo, level, cabW, cabH, cabD, z0Of, wtOf, sideP, sideW, sideRects, opsOf, isDoor, opCasTop, ptsOf, PT_DEF, OP_JAMB, OP_CAS`.

Which sheets are made, in this order:

| id | title (LT / EN) | When | Made by |
|---|---|---|---|
| `layout` | Baldų išdėstymas / Furniture layout | `only == null`, `RM` present, `proj.layout` and at least one placed cabinet | `sheetLayout` (1035): plan with wall lengths and cabinet positions, doors/windows, 3D view, numbered cabinet list (unplaced ones listed with `—`) |
| `wall<i>` | Sienos vaizdas A…H / Wall elevation A…H | same, one per wall that has a cabinet | `sheetWall` (1093): elevation with openings, sockets/pipes (codes R, RR, ŠV, KV, KAN + height), width chains below (base/tall) and above (wall cabinets), height chain, list of that wall's cabinets |
| `all` | Visi baldai / All furniture | `only == null`, nothing placed, more than one cabinet | `sheetAllFronts` (1161): every front in a row, note "Spintelės nesudėliotos Baldų skirtuke — rodomi visi fasadai iš eilės." |
| `c<i>` (`cab:i`) | Spintelė N „name“ / Cabinet N | every cabinet that has panels and is not `kind === 'panel'` | `sheetCabinet` (939): left — front, without fronts, left view (dimensioned), parts table; right — exploded assembly with balloons and coloured connector lines, pictured fittings strip, title block |
| `c<i>b` (`cab:i, cont:true`) | … — tęsinys / continued | when `cabPlan(c, r).hw === false` (the parts list does not fit under the views) | `sheetCabList` (921): the rest of the parts in two columns |

Page numbers `n / m` are assigned after the list is complete. `sheetViews` and `sheetAssembly` (an older two-sheets-per-cabinet layout) are still exported but **not called** by `sheets()`.

Sheet facts: SVG string, `viewBox="0 0 420 297"`, `width="420mm" height="297mm"` (drawings.js:365–367), units are millimetres on A3 landscape, 10 mm frame, title block 180 × 34 mm bottom right: company `DĖDĖS BALDAI`, project (clipped to 44 characters), drawing title (70), scale, format `A3 · E (ISO)`, date, sheet `n / m`. `paper:'A4'` does not re-lay anything: it only appends `· A4 ≈1:<n·√2>` to the scale and changes the PDF page size. Font: `Arial, Helvetica, sans-serif` by name (nothing embedded; text widths are estimated as `length × size × 0.56`). Scales come from `DEN = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200]`.

Drawing conventions worth keeping: door opening lines dashed with the apex on the handle side, a dashed X on a drawer front (drawings.js:508–526); front sizes blue and bold, gaps red and italic (`FD`, 751); connector lines blue = confirmats, orange = cams, green = dowels (`COL`, line 20); balloons only on carcass and fronts (`BALLOON_FITTINGS = false`, 847).

### 5.2 Parts list on a cabinet sheet — `cabLists(c, r)` (drawings.js:870–888)

* Order `partOrder` (607): by `ROLE_ORDER` (KAIRE, DESINE, DUGNAS, VIRSUS, JUOSTA_*, PERTVARA, LENTYNA, NUGARA, PLAUSAS, PRIEKIS, DURYS, FASADAS, STALC_*), then name with numeric compare.
* **Identical parts share one line and one balloon**: key `role | L | W | T (0.1 mm) | material | number of banded long edges | number of banded short edges`. Carcass and fronts first, drawer-box groups after; position number = line number.
* Line name `groupName` (850): equal names → that name; otherwise per `-` token: `FASADAS1`, `FASADAS2`, `FASADAS3` → `FASADAS1–3`, two → `1,2`, a trailing single-letter token that differs (mirrored pair) is dropped, anything else joined with `/`, too long → `*`.
* Row: `pos · name · count · L · W · T · material · edges ('2L 1W')`. Extras follow with `–` as position (same size/quantity filter as the part list), then the worktop piece (`Stalviršis`, or the shared piece's name with count `1` only on its first cabinet).
* Fittings `drawHw` (468): `BLUM LANKSTAI` becomes two lines, `Lankstas Blum CLIP top` and `Plokštelė Blum CLIP`; lettered A, B, C… and shown as pictured cards (`fitLegend`, 452). English sheets translate fittings with `HW_EN` and units `vnt. → pcs`, `kompl. → set`.

### 5.3 `pdf(list, o)` (drawings.js:1246–1254) — async

`o = { px:2800, paper:'A3'|'A4', title, progress(i, n) }` → `Promise<Uint8Array>`. Each SVG is drawn to a canvas `px × round(px·297/420)` through an `<img>` data URI (`rasterize`, 1203), stored as a Flate-compressed RGB image (`CompressionStream('deflate')`; JPEG 0.93 fallback) and written by `pdfBytes(pages, paper, title)` (1224): PDF 1.4, one image per page, MediaBox 1190.55 × 841.89 (A3) or 841.89 × 595.28 (A4), `/Title` with non-ASCII replaced by `?`, `/Producer (Dedes Baldai cabinet creator)`, no date. Browser only (needs `Image`, canvas). **Raster, not vector: text is not selectable.** Two runs on the same sheets in one browser were byte-identical (verified live; 2 pages = 373 KB in 0.27 s).

### 5.4 Smaller exports

`hwKind(item)` → `'hinge'|'drawer'|'leg'|'pin'|'conf'|'dowel'|'cam'|null`; `iconSvg(key, cx, cy, size)`; `hwText(item, lang)`; `unitText(u, lang)`; `cabPlan(c, r)` → `{ best:{s, two}, nParts, hw:true }` or `{ …, hw:false, restRows, restFrom }`; `cabBoxes(r, o)`, `fittingBoxes`, `pbox`, `explode`, `solve(boxes, V)` (far-to-near order), `viewOrtho('front'|'left'|'top'|'elev')`, `viewIso(d)`, `overlap2`, `TX` (the LT/EN text table, drawings.js:21–38).

---

## 6. The outputs

`<proj>` = `pj.project` = `projName()` (§8.1).

| Output | File name | Made by | Content |
|---|---|---|---|
| CNC programs | `<part name>_<n>OP.XXL` | `DBEngine.programs` via `buildProject` | one text file per program, CRLF, ASCII; header `H DX= DY= DZ= …`, `;Fichier : <id>`, `;** Date codage : db-kurejas`, optional `; POSITION (1OP): …` note, `XBO` drilling lines, optional routing block, `.END` |
| Workbook | `<proj>_ReportLists_to_Excel.xlsx` | `xlsmBytes` | §4 (or the fallback §3.3) |
| CSV | `<proj>_detales.csv` | `csvOf` (app.js:3139) | UTF-8 BOM, `;`, CRLF; header `Nr;Part;Detale;Spintele;Medziaga;Ilgis;Plotis;Storis;Kiekis;Krastai;Krasto medziaga;1OP;2OP`; rows in `pj.parts` order (not sorted), sizes to 0.1 mm, edges as `L1 W2` |
| Drawings | `<proj>_brezinai.pdf`; from the drawings tab also `<proj>_brezinai_baldai.pdf`, `<proj>_brezinai_<n>.pdf`, single sheets `<proj>_spintele_<n>[_2].pdf` (`cabinet_<n>` in English) or `<proj>_<safe title>.pdf` | `drawingsPdf` | §5.3 |
| Project | `<proj>_projektas.json` | `JSON.stringify(project, null, 1)` | the project; inside the ZIP `pricing` is removed unless admin mode (app.js:3165) |
| Notes | `<proj>_pastabos.txt` | `zipFiles` | all `pj.warnings` through `wTxt` (so in the UI language), CRLF; only when there are any |
| Everything | `<proj>_CNC.zip` | `zipAll` → `zipFiles` (app.js:3153–3169) | in this order: `<proj>_XXL/<program>.XXL` for every program, the workbook, the CSV, `<proj>_brezinai.pdf` (**always A3, all sheets; silently left out if drawing or the PDF fails**), the project JSON, the notes |
| Hand-off | `localStorage['dbNestHandoff'] = { name:'<proj>_ReportLists_to_Excel.xlsx', b64, at }` | `nestHandoff` (app.js:2299) | the same workbook, then opens `…/nesting/?from=builder` |

Verified live: the ZIP of the test project held 63 `.XXL` files + the five other files, 847 KB, built in under half a second.

README line 35 claims: ZIP = `.XXL` programs (5 mm long-edge bores as a separate turned program), the ReportLists `.xlsx` "filled exactly like the SolidWorks macro DB_PartList v20 (same template, labels, QR codes, pictures with the grain arrow; PARTLIST grouped by thickness, thinnest first; no macros; opens at the top; material/thickness mismatches marked yellow — imports into the nesting app)", `.csv` and the project `.json`. Line 34: every `.XXL`, the `.xlsx` and the `.csv` can also be downloaded separately. Line 49: "The ReportLists export loads JSZip from cdnjs, so it needs internet; offline a plain list is made." All consistent with the code; the PDF and the notes file are not mentioned there.

---

## 7. Checks and validations done at output time

There is no blocking validation anywhere in this slice: every check below ends as a string in `pj.warnings`, a yellow row, or a quietly changed output. Severity is assigned later by regular expressions over the Lithuanian text (`level(w)`, app.js:715–720).

### 7.1 Part list — export.js and app.js `buildProjectAll`

| Check | Where | Message (LT) / effect |
|---|---|---|
| Extra part without length or width | app.js:725 | `„<nr>-<name>“: papildoma detalė be ilgio ar pločio — nepridėta, įrašykite matmenis` — the part is left out |
| Extra part with quantity 0 | app.js:726 | `„…“: kiekis 0 — nepridėta` — left out |
| Loose part without material | export.js:72 | material becomes `BE MEDŽIAGOS`; `„<short>“: medžiaga nenurodyta — pažymėta „BE MEDŽIAGOS“`. In practice only reachable for a worktop without material, because extras fall back to the carcass material first |
| **Cabinet part without material** | — | **no check**: `mat:''` goes into every output |
| Loose part not rectangular | export.js:73 | `„<short>“: ne stačiakampė detalė — sąraše jos gabaritai` (the app never sets `shaped`) |
| More than two programs on one part | export.js:44 | `Spintelė N: <short> turi 3 programas — etiketėje telpa 2 QR, <id> paleiskite pagal sąrašą` |
| Duplicate part names | export.js:63–70 | loose names are made unique with `_2`, `_3`… against every name already used |
| Identical loose parts | export.js:56–62 | merged into one row, quantities added |
| Duplicate warnings | export.js:84 | exact duplicates removed |
| Worktop longer than 4100 mm | app.js:771 | `„…“: stalviršis N mm ilgesnis nei 4100 — patikrinkite plokštės ilgį arba numatykite sujungimą` |
| Worktops meeting in a corner | app.js:766 | `„a“ kampe susiduria su „b“ — sutrumpintas N mm (pradžioje / gale), patikrinkite sujungimą` |
| Engine and program warnings | export.js:38, 43 | passed through with the prefix `Spintelė N „name“: ` |

Program-level checks made by `DBEngine.programs` while the part list is built (engine.js:1818–1905; engine slice, listed because they surface here): hole outside the part → `praleista`; no such drill in the head / for that edge → `NEPROGRAMUOTA`; through hole without a through drill; long-edge bores that need the turned program on a part longer than the machine's Y → `pasukti 90° negalima … NEPROGRAMUOTA`; turned program shorter in X than the machine minimum → `patikrinkite prispaudimą`; part wider/longer than the machine → `netelpa į stakles, NEPROGRAMUOTA` and **the part gets no program at all**.

### 7.2 Workbook — report.js

| Check | Where | Effect |
|---|---|---|
| **Material thickness ≠ part thickness** | report.js:2557–2562, `thkFromName` 189 | The material name is searched for `<number> mm` (`/(\d+(?:[.,]\d+)?)\s*mm/i`: "KARKASAI 18mm" → 18, "U16003 VV" → none). If found and it differs from T by more than 0.3: cells C…Q of the row get a yellow fill (`FFFF99`, styles cloned on demand) and NOTES (P) reads `PATIKRINTI: MEDZIAGA <mat> (<n> mm) NEATITINKA STORIO <T> mm`. Count in `opts.info.flagged` |
| Quantity | 2554 | forced to an integer ≥ 1 |
| Zero-size part | 151 | no picture drawn (`L > 0 && W > 0` required) |
| Grain arrow | 177–178 | drawn only when its half-length is ≥ 2 pt |
| Missing program | 2666 | the first QR still encodes `<dbpart>_1OP` |
| Template without PARTLIST/LABEL | app.js:677 | rejected on upload: "tplBad" toast. At build time a broken template makes `buildReport` throw → fallback workbook |

Verified live: carcass material `KARKASAI 16mm` on 18 mm parts and front material `FASADAI MDF 19mm` (fronts are made at `cnc.facadeT`, default 18) gave **23 yellow rows**; nothing in the app showed it (the string `flagged` / `NEATITINKA` does not occur in app.js).

There is **no** check for: missing grain direction, a material name without a thickness, duplicate short names, a part larger than the board, empty material.

### 7.3 Drawings — drawings.js

| Situation | Where | Effect |
|---|---|---|
| A sheet throws | 1198 | a sheet with only `Error: <message>`; `error` holds the stack; the other sheets are still made |
| Parts list does not fit under the views at any scale | `cabPlan` 901–919 | the views keep a readable scale (room for at least 14 list lines), the first lines stay, the bold note `Tęsinys kitame lape →` is printed and a continuation sheet `c<i>b` is added |
| Continuation sheet also full (two columns) | `sheetCabList` 928, 932 | a bare `…` is printed; the remaining rows are **not shown and not counted** |
| Cabinet list on layout / wall / all-fronts sheets too long | `fitTables` 480–490 | up to three side-by-side tables with rows down to 2.6 mm, then `… N daugiau — žr. spintelių lapus` |
| Long text | `clip` 58, `table` 502 | cut with `…` to the column width |
| Data box, small assembled view | 597, 599 | left out when they would overlap the title block or are under 70 mm |
| Fitting that would sit inside a board or another fitting | `fittingBoxes.add` 109–112 | left out of the picture (the clash itself is an engine warning) |
| Hinge with no side or partition within 60 mm | 126 | not drawn |
| Front sizes too small for dimension chains | `frontDims.fitsIn` 761 | sizes are written on the fronts instead |
| Cabinet without panels, loose board (`kind === 'panel'`), missing info | 1193 | no cabinet sheet |
| Something above the ceiling on a wall | 1095 | the sheet scales to include it |

`test/engine/sheet_overflow_check.js` asserts exactly the overflow behaviour: no `<text>` with `y > 287.5`, every part and fitting present on the cabinet sheet or its continuation, a continuation sheet whenever `cabPlan(...).hw === false`, and a 40-cabinet wall either listing every cabinet or printing the `… N` line.

### 7.4 Download glue — app.js

* `S.busy` guards ZIP and workbook downloads (one at a time, toast "Ruošiama…").
* `saveProgs` filters to names that exist; none → error toast.
* Nothing consults `readyCheck` before any download (see `app-output.md` §3.4).

---

## 8. Naming, numbering and dedupe rules — must stay identical

The workshop's labels, QR codes and program files are tied together by these strings; the CNC operator scans the QR and the machine loads the program of that name.

### 8.1 Project prefix

* `E.safeName(s)` (engine.js:285): transliterate to ASCII (`ascii()`), then every run of characters outside `[A-Za-z0-9_-]` becomes `_`. `Bandymas Ąžuolas` → `Bandymas_Azuolas`.
* `projName()` (app.js:688): `safeName(S.proj.name || 'PROJEKTAS')`; when the result has no ASCII letter or digit: `'PROJEKTAS_' + last 4 alphanumerics of the project id`.
* `buildProject` applies `safeName(opts.project || 'PROJ') || 'PROJ'` again (export.js:29).

### 8.2 Cabinet parts (engine.js:317–344, 1341, 1745)

* `base = <proj>_<nr>[_<safeName(cabinet name)>]` — `nr` is the 1-based position of the cabinet in the project.
* `name = base + '_' + <ROLE>[<n>]`: `Bandymas_Azuolas_1_KAIRE`, `…_1_JUOSTA_PRIEKIS`, `…_1_FASADAS2`, `…_4_Virsutine_Z_DURYS1`.
* `key = name without base` (used for hand-set edge banding `c.ebEdit[key]`).
* `short = <nr>-<role with _ → -><trailing digits of name>`: `1-KAIRE`, `1-JUOSTA-PRIEKIS`, `1-FASADAS2`; drawer-box parts use the name after the base with `_ → -` (e.g. `1-STALC1-SONAS-K`). The cabinet's own name is **not** in the short name.
* `SOLIDNAME` = `DETALĖS KODAS` = `BARCODE` = the full name; `DETALĖ` = the short name.

Consequence: **moving, inserting or deleting a cabinet renumbers every later cabinet and so renames its parts, programs and QR codes**; renaming the project or a cabinet does the same.

### 8.3 Loose parts (export.js:55–76)

* Dedupe key: `cab | name | mat | L | W | T | eb1 | eb2 | eb3 | eb4` → one row, quantities summed. Verified: two `Cokolis` 600 × 100 rows (qty 2 and 1) → one row, qty 3.
* `name = <proj>_[<cab>_]<safeName(name) without leading/trailing _ , or DETALE>`; if taken, `_2`, `_3`…. Verified: a second `Cokolis` of another size → `Bandymas_Azuolas_1_Cokolis_2`.
* `short = [<cab>-]<name with _ → -, trimmed, or Detalė>` — keeps Lithuanian letters and spaces (`1-Šoninė-plokštė A`) and is **not** made unique: both `Cokolis` rows above have the short name `1-Cokolis`.
* Worktops: `STALVIRSIS`, or `STALVIRSIS_2-3` (short `2-STALVIRSIS-2-3`) for a piece shared by cabinets 2 and 3.

Short names never contain `_` — the Nesting app takes everything before the first `_` of column E as the display name (§9).

### 8.4 Programs (engine.js:1818–1905)

* Programs of a part are numbered in the order they exist: `main` (the face with more blind holes and grooves is up; face B wins only when it has more), then `flip` (the other face, if it has any), then `rot` (the panel turned 90° for long-edge bores the front/back spindles cannot drill).
* `id = <part name>_<n>OP`, `file = id + '.XXL'`. So `_2OP` is the flip program on one part and the turned program on another (verified: `…_4_Virsutine_Z_KAIRE_1OP:main`, `…_2OP:rot`).
* `op1`, `op2` = the first two ids; the label has room for two QR codes.
* A part with nothing to machine has no program: CSV and fallback workbook leave the op blank; the template workbook's label still carries a QR for `<name>_1OP`.
* File text is ASCII with CRLF; the name inside (`;Fichier : <id>`) equals the file name without extension.

### 8.5 Order and numbering in the lists

* `pj.parts`: cabinets by number, panels in engine order, then loose parts in first-seen order. CSV row numbers follow this.
* Template workbook: thickness ↑, material (upper-case, binary), L ↓, W ↓, part code. Labels follow the same order, two per band, left then right.
* Fallback workbook: thickness ↓, material, cabinet, name.
* Hardware: merged by `item|unit`, first-seen order.
* Drawing position numbers: per cabinet, groups of identical parts (§5.2); cabinet balloons on layout / wall sheets are the 1-based cabinet numbers.

### 8.6 Label texts

`1OP` / `2OP` captions; `LAMINUOJASI`, `PAGAL FASADA`; sizes `702.0x560.0x18.0` (always one decimal, lower-case `x`); `MAT: <material>`; group rows `18 mm`.

---

## 9. How the Nesting app reads the workbook

Source read: the local clone `~/github/nesting/index.html` (last commit 2026-10-07) — its own minimal xlsx reader (`XLSX.read`, lines ~1440–1594) and the import routine (lines 3690–3872). The deployed app may be newer; two points below could not be confirmed and are marked.

Reader: unzips itself (stored and deflated entries), needs `sharedStrings`, `workbook.xml`, `workbook.xml.rels`, and each sheet; strings must be shared strings (`t="s"`); numbers are parsed with `parseFloat`; formulas are kept in a side array.

| Sheet | What it needs |
|---|---|
| **PARTLIST** | Header row within the first 12 rows where **column E is exactly `DETALĖ`** (or `Part`). Then: a thickness group row = column B matching `^\d+\s*mm$` with F and G empty; a data row needs **F = material (non-empty)** and **G, H numeric**. Read: C (solid name, else E), E (display name = text before the first `_`), F material (whitespace-normalised; rows whose material is `PLOKŠTĖ` or contains `NEPJAUTI` / `MAKETAMS` are skipped), G length, H width (rounded to whole mm; under 5 mm skipped), I thickness (rounded; else the group's), J quantity (`parseInt`, default 1). If the header has `KIEKIS` in column I the older layout without a thickness column is assumed. Every piece becomes its own part (`qty` copies). |
| **LABEL** | Scans for rows whose column A is `1OP`. Takes the full part name from D (and K for the right label) of the row 8 or 9 below, and records the print range `LABEL!A<r>:F<r+9>` / `H…:M…` for Excel label printing. **Program ids are taken from the QR formula in the next row** (columns A, F, H, M): the text after the last `&"…")` or after `text=`. |
| **EDGEBAND** | Header row (first 8 rows) with cells `Part`, `Feature`, `Material` in any columns; per row: part name, the digits of the feature (`Edgeband3` → `eb3`), material (first 16 characters). |
| **STOCK_CORE** | Only when PARTLIST gave nothing: from the 4th row, C name, F material, I/J/K length/width/thickness, L quantity. |

What follows for the builder's workbook:

* Columns C, E, F, G, H, I, J of PARTLIST, the `DETALĖ` header in E, the `NN mm` group rows, the `1OP` / full-name layout of LABEL and the `Part / Feature / Material` header of EDGEBAND are all load-bearing.
* A part whose **material is empty is not imported** (cabinet parts can have an empty material, §7.1).
* Lengths and widths lose their decimals in nesting (236.3 → 236).
* **Unconfirmed / at risk:** the template workbook writes the QR codes as pictures, with no formula in the row under `1OP`, so this clone's reader gets empty `op1` / `op2` (`hasCNC` false) from it. Only the fallback workbook still has `&"<id>")` formulas. The clone also has no reader for `localStorage['dbNestHandoff']` / `?from=builder`. Either the deployed Nesting app is newer than this clone, or program ids do not reach nesting today — check before relying on it. The picture's `descr` attribute (`PIC_QR_<cell>`, descr = program id) is the obvious thing for a reader to use.

---

## 10. Regression testing: golden files

Goal: for the same project, the new version produces the same part list, programs, workbook content, CSV and drawings as the legacy snapshot.

### 10.1 What is and is not reproducible

| Output | Same input → same bytes? | Compare by |
|---|---|---|
| `pj.parts`, `pj.files`, `pj.warnings`, `pj.hardware`, CSV | yes | exact JSON / text |
| Workbook | entries yes, container no (timestamps) — verified | unzip, compare every entry's bytes (or their SHA-256) and the entry list |
| ZIP | no (`new Date()` in `DBZip.zip`) | entry names in order + each entry's bytes |
| Drawing SVG | yes for a fixed date, language, paper, look colours | exact string per sheet id |
| PDF | yes in the same Chrome (verified), but it depends on the browser's rasteriser and the Arial font | page count, MediaBox, image sizes; do not gate on bytes |

Other inputs that change outputs and must be pinned: today's date (drawing title blocks, fallback workbook, `updated` in the project JSON); UI language (`S.lang`: drawings, notes file); settings and rule tables in `localStorage` (`cdp.py` starts every Chrome with a throw-away profile, so they are at defaults); a user template in `localStorage['dbKurejas.reportTpl']`; `VERSION` (written into the workbook as `DB_PartList_Version`); material look colours (`S.proj.look` → SVG fills); random ids from `uid()` when a project is created in the page (use fixtures with fixed ids via `openProject`); `RM.ensure` auto-placing cabinets the first time drawings or worktops are computed.

Freezing the clock makes everything except the PDF byte-stable: before the page loads, inject (CDP `Page.addScriptToEvaluateOnNewDocument`) a `Date` whose `now()` / no-argument constructor return a fixed instant.

### 10.2 Capturing the goldens from the legacy snapshot

With `tools/cdp.py` on `http://127.0.0.1:8765/legacy/` (click "Dirbti be prisijungimo"), for every fixture project `test/fixtures/<case>.json` (a legacy project file: `{ app:'db-kurejas', v:1, id, name, cabinets:[…], layout? }`):

```js
// in the page, awaited
__dbk.openProject(fixture);            // then __dbk.S.tab = 'drw'; __dbk.render();  → __dbk.S._drw
const pj = __dbk.buildProjectAll();
out.pj        = { project:pj.project, parts:pj.parts, hardware:pj.hardware, warnings:pj.warnings };
out.files     = pj.files;                              // [{ name, text }]
out.csv       = __dbk.csvOf(pj);
out.xlsx      = await __dbk.xlsmBytes(pj);             // → JSZip.loadAsync → { entryName: sha256 }
out.zip       = await __dbk.zipAll(pj);                // → JSZip.loadAsync → ordered names + sha256 of non-PDF entries
out.sheets    = __dbk.S._drw.map(s => ({ id:s.id, cab:s.cab, cont:s.cont, title:s.title, error:s.error, svg:s.svg }));
```

Write per case: `golden/<case>/pj.json`, `xxl/<name>.XXL`, `detales.csv`, `xlsx.manifest.json`, `zip.manifest.json`, `sheets/<id>.svg`. Bytes come back through `Runtime.evaluate` as base64. Used this way in this session: `openProject`/`newProject`, `fromPreset`, `buildProjectAll`, `csvOf`, `xlsmBytes`, `zipAll`, `S._drw`, `window.JSZip`, `DBReport.buildReport` directly with `opts.info`.

Also record the **module inputs**, which is the cleanest seam for a new UI: wrap `window.DBExport.buildProject` before calling `buildProjectAll()` and store its two arguments (`col` with every `{ nr, def }` and the `loose` list, and `opts`). `app.js` calls it through the shared object (`X = window.DBExport`, app.js:9 and 732), so a wrapper on the property is seen — not run in this session.

### 10.3 Checking the new version

Two levels:

1. **Adapter level (fast, no UI):** the new app's "project → engine input" function must produce a `col` deep-equal to the recorded one for each fixture. If the engine, export, report and drawings modules are reused unchanged, equal inputs give equal outputs. Runs under `python3 tools/jsrun.py <script.js>`; `require('jszip')` in report.js resolves to `/jszip.js` at the project root under the shim, so a local copy of JSZip 3.10.1 is needed there (it is not in the snapshot).
2. **End to end (through the new UI with `tools/cdp.py`):** load the fixture in the new app, read the same six artefacts through a test hook equivalent to `__dbk`, and diff against the golden directory. Report differences per artefact: part rows by `name`, program text line by line, workbook entry by entry, sheet by id.

Fixture set that covers the branches in this slice: every preset (drawers, doors, drawers + doors, wall, tall with oven, fridge, dishwasher, open shelves, loose panel, 3D construction); a named cabinet with Lithuanian letters; a project name with no ASCII letters; extras (identical ones, same name with another size, without size, quantity 0); worktops joined on a wall and meeting in a corner; a part with three programs; a material whose name carries another thickness (yellow rows); an empty material; a cabinet with enough drawer boxes to need a continuation sheet; a placed layout with openings and sockets, and an unplaced project with several cabinets (all-fronts sheet); both languages.

---

## 11. State of the old tests

| Test | Run here | Result |
|---|---|---|
| `test/engine/sheet_overflow_check.js` | `python3 tools/jsrun.py test/engine/sheet_overflow_check.js src/lib/engine.js src/lib/room.js src/lib/drawings.js` | passes: "5 big cabinets, 40-cabinet wall: 0 problems" (1.5 s) |
| `test/engine/drawings_check.js` | same arguments | **fails: 199 cabinets, 620 sheets, 77 937 ordered pairs, 200 problems.** Every printed problem (the script prints the first 14) is `FITTING NOT LISTED BLUM LANKSTAI`: the test looks for the hardware name on the sheet, while `drawHw` now prints it as `Lankstas Blum CLIP top` + `Plokštelė Blum CLIP`. The per-kind totals could not be read (the shim prints the summary object as "Object"), so whether all 200 are of this kind is not confirmed. The painter's-order, part-list, dimension and sheet-set assertions produced no printed problem |
| `test/engine/rep/build_ref.js`, `compare.py`, `compare_pics.py` | not runnable | need `tpl/ReportLists_template.xlsm`, `/home/claude/rep/ref.xlsm`, `jszip` as a module and `openpyxl`; none are in the snapshot |
| `test/engine/rep/ref_parts.json` | read | the reference input: project `DiG_Virtuve`, 100 parts with `solid, dbpart ('_23'…), name, mat, L, W, T, qty, eb, ebInfo, stockRef, progs`, 3 of them with two programs; hardware with `supplier, ref, cost`. This is the SolidWorks-macro shape `buildReport` was matched against (cell values, styles, row heights, merges, picture anchors) |
| `nest_import.py`, `nest_import2.py`, `zip_offer.py` | not runnable | Playwright and absolute `/home/claude/…` paths; they show the intended end-to-end check: build the workbook with `__dbk`, feed it to the Nesting app's `#fin`, compare part counts and `op1` |

---

## 12. Problems seen in this slice

Mistake-prevention gaps

1. **Material/thickness mismatch is visible only inside Excel.** The yellow rows and the `PATIKRINTI` note exist, the count is computed, and the app drops it. With the default front thickness 18 and a front material named `… 19mm`, every front is flagged.
2. **Empty material on cabinet parts** flows into every output (`MAT: ` on the label, empty PLOKŠTĖ) and such rows are skipped by the Nesting reader.
3. **The fallback workbook is a different document under the same name**: thickest first instead of thinnest first, QR codes as internet `IMAGE()` formulas, no pictures, no yellow marks, other columns. One toast is the only sign. It is triggered by JSZip not loading from the CDN, i.e. by being offline.
4. **A label QR for a program that does not exist** (`<name>_1OP` on parts with no machining, loose parts and worktops included).
5. **Third program not on the label**; only a text warning says which one to run from the list.
6. **Ticked edges on an extra part are dropped when no edge material is entered** (verified: `e1:true`, cabinet without `edge.carc` → `eb1:''`), while cabinet panels fall back to the name `KRAŠTAS`.
7. **Duplicate short names** for extras with the same name and different sizes — two different labels read `1-Cokolis`.
8. **Names depend on the cabinet's position**: reordering or deleting a cabinet renames programs and invalidates labels already printed; nothing warns.
9. **Grain** is never checked or set: L is "along the grain" by convention, `grainVert` is never passed, the arrow is always along L.
10. Warnings are free Lithuanian strings; severity and English text come from regular expressions over them; no part / cabinet / field reference to link back to.
11. `zipAll` silently omits the PDF if drawing fails.

Structure and quality

12. Hardware in the template workbook has no unit, supplier, reference or cost; EDGEBAND thickness / cost and STOCK_CORE reference are empty, so SUMMARY costs are zero.
13. The PDF is a 2800 px raster per page: not selectable, large, and "A4" is the A3 sheet scaled down. Nothing on a sheet can be edited (no notes, no customer field).
14. A loose board (`kind === 'panel'`) gets no drawing sheet; a continuation sheet that overflows shows only `…`.
15. Listing drawings or building the part list has side effects (`RM.ensure` places cabinets and saves the project).
16. The drawings cache key is `JSON.stringify` of the whole project and settings on every call.
17. The hand-off to nesting puts the whole workbook as base64 into `localStorage` (quota).
18. Dead or stale code: `c.scaled` warning, `shaped` / `path` on loose parts, `qrF`, `sheetViews` / `sheetAssembly`, "xlsm" in names of things that are `.xlsx`; `drawings_check.js` is out of date with the code.
19. JSZip comes from a CDN at page load; everything else in this slice works offline.
