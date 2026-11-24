# Legacy map — output side of the app (results, ready-check, part view, settings, pricing/admin, nesting, drawings, home)

Slice: `src/lib/app.js` lines 1975–2600, plus the event handlers and helpers those views depend on (read outside the slice so the mechanics are complete: `app.js` 317–345, 430–476, 496–501, 647–737, 815–875, 2717–2890, 2891–3088, 3101–3202).
All `file:line` references are to `src/lib/app.js` unless another file is named. Labels are given as **LT / EN** (resolved from the `T` table, lines 14–316).
Everything marked **(verified live)** was observed in the running snapshot at `http://127.0.0.1:8765/legacy/` through `window.__dbk`.
Second pass 2026-11-24: the whole slice (1975–2600) and the handlers it depends on were re-read line by line against this report, line references corrected, and the three headline findings re-run live on the example project — (a) the ready-check blocks nothing, (b) the worktop "Fix" link focuses a hidden field, (c) the cutting-plan labels repeat the first part of each size.
Third pass 2026-11-24: slice and handlers read again from the source, remaining line references corrected (494, 354, 881, `engine.js:1818`, `export.js:90`), and a deliberately broken copy of the example project (no name, cabinet 1 without carcass material, cabinet 2 without front material and with a worktop without material, cabinet 3 without carcass edging and 20 mm wide) driven through the Parts & CNC tab — results in §3.6. New findings from that run: a missing front material silently falls back to the carcass board, the same sentence in the checklist covers both cases, and the Settings page holds 82 bound controls before the price lists are unlocked.

Contents
1. Where these views sit (shell, tabs, state)
2. Results / part-list screen (`viewRes`) and every download
3. `readyCheck` — the "Ready for CNC" checklist
4. Part view (`viewPart`, `panelSVG`, `ebEditor`) and edge-band overrides
5. Settings screen (`viewSet`) — every setting
6. Pricing and admin mode (PIN)
7. Cutting plan / nesting tab and hand-off to the Nesting app
8. Drawings tab
9. Home screen (projects list)
10. Catalogue of `data-act`, `data-act-change`, `data-bind`, other data attributes, DOM ids, storage keys
11. Data shapes a redesign must keep
12. Bugs and UX problems visible from the code

---

## 1. Where these views sit

### 1.1 Shell and tab dispatch — `render()` (815–853)

* `S.home === true` (or no `S.proj`) → only a header (brand + LT/EN) and `viewHome()`.
* Otherwise a sticky header: brand button (`data-act="home"`), **☰ Projektai / Projects** (`home`), the project name input (`#projname`, `data-bind="p.name"`, red/`aria-invalid` when empty), the "✓ išsaugota / saved" autosave chip (`#saved`), **🕘 Versijos / Versions** (`pver`), six tabs, an **€ Admin** badge when `S.admin` (goes to Settings), **＋ Naujas projektas** (`pnew`), LT/EN.
* Tabs (`tabBtn`, 867) and their view functions:

| `S.tab` | Label LT / EN | Badge | View |
|---|---|---|---|
| `cab` | Spintelės / Cabinets | number of cabinets | `viewCab(cabInfo)` |
| `room` | Baldai / Furniture | – | `roomChecks` + `#room` |
| `res` | Detalės ir CNC / Parts & CNC | `partCount()` (rows of the part list) | `viewRes(buildProjectAll())` |
| `nest` | Plokštės / Boards | number of boards (`nestCount()`, computed 450 ms after edits when off-tab) | `viewNest()` |
| `drw` | Brėžiniai / Drawings | – | `viewDrw()` |
| `set` | Nustatymai / Settings | – | `viewSet()` |

* Every `render()` rebuilds **all** cabinets (`buildOne(i)` for every cabinet → `S._info[i] = { r, warnings, nProg }`), then the active view. `viewRes` additionally runs `buildProjectAll()` (a second full build through `X.buildProject`), and `nestCount()` a third one. Nothing is incremental.
* After a reload the tab is restored from `dbKurejas.ui` only if it is one of `cab, room, res, drw, set` — **`nest` is missing from that list** (494), so a reload on the Boards tab lands on Cabinets (verified live).
* Three `<datalist>`s are appended to every project page: `#dl-mat`, `#dl-edge`, `#dl-wt` (`listOpts`, 868) = settings lists ∪ names already used in the project.

### 1.2 Entry points into this slice from the cabinet editor (`viewSheet`, 1964–1972)

The right column of the cabinet editor ends with: `#pricecard-wrap` (admin price card), a collapsible drawing + "manufacturing summary" (parts count, program count, joinery), a collapsible "Gamybos patikra / Manufacturing checks" list with the cabinet's warnings, and two big buttons: **Detalės ir CNC → / Parts & CNC →** (`data-act="tab" data-v="res"`) and **📐 Brėžiniai / Drawings** (`data-act="drwcab"` → Drawings tab filtered to this cabinet).

### 1.3 UI state used by this slice (all on the global `S`, not persisted unless noted)

| Field | Meaning |
|---|---|
| `S.tab`, `S.home`, `S.sel` | active tab, home screen flag, selected cabinet index (persisted in `dbKurejas.ui` = `{id, tab, sel}`) |
| `S.part` | full name of the part selected in the results table (e.g. `PAVYZDYS_1_Stalciai_FASADAS1`) |
| `S.partRef` | `{ cab: <1-based nr>, key: <part key> }` — lets the selection survive a project/cabinet rename (`partResolve`, 2397) |
| `S.ptab` | index of the program tab (1OP / 2OP …) in the part view |
| `S._pjParts` | `pj.parts` of the last `viewRes` (so loose parts and worktops can be shown in the part panel) |
| `S._info` | per-cabinet build results `{ r, warnings, nProg }` |
| `S.admin`, `S.pinChange`, `S.prOpen` | admin unlocked, "change PIN" row open, price card `<details>` open |
| `S.drwOnly` (`'all'` \| `'furn'` \| `'c:<cabinet id>'`), `S.drwPaper` (`'A3'`\|`'A4'`, persisted `dbKurejas.paper`), `S.drwOpen` (index of the sheet in the overlay or `null`), `S._drw` (current sheet list) | drawings tab |
| `S.confirm` | two-click confirmation token: `'pdel'+id`, `'prreset'`, `'del'`, `'libdel'+id`; cleared by any other click (2895) |
| `S.homeQ`, `S.npName`, `S.focusNew` | home search text, typed new-project name, focus the name field after `pnew` |
| `S.busy` | a ZIP/xlsx build is running (second click only toasts) |
| `S.tplB64`, `S.tplName` | custom ReportLists template (persisted `dbKurejas.reportTpl`) |
| `S.ro`, `S.roDirty` | read-only project (someone else edits it, locks.js) — `save()` and `libSave()` do nothing |

---

## 2. Results / part-list screen — `viewRes(pj)` (2335–2375)

`pj = buildProjectAll()` (721–737) = `X.buildProject(...)` (`export.js:27–88`) over all cabinets + "loose" parts (each cabinet's `extras` with L and W > 0 and qty ≠ 0, and the worktop pieces from `worktopPieces()`), shape in §11.

If `pj.parts` is empty the whole tab is one card: **"Projekte dar nėra spintelių. / No cabinets in this project yet."** (`noCab`) — also when cabinets exist but produce no parts.

### 2.1 Layout, top to bottom (verified live)

1. `.printhead` (print only): `<project> · <date> · Detalių sąrašas ir CNC programos`.
2. Title **Detalių sąrašas ir CNC programos / Part list and CNC programs** + five stats (`stat()`, 2396):
   cabinets (`S.proj.cabinets.length`), parts (`parts.length` — **rows, not pieces**), programs (`pj.files.length`), board m² (Σ L·W·qty), edging m (Σ `p.ebLen`).
3. Download buttons (`.dl`) + note `zipNote`.
4. `readyCheck(pj)` card (§3).
5. `priceProjectCard()` — admin only (§6.5).
6. Red error list: every `pj.warnings` entry whose `level()` is `bad` (tag **klaida / error**), **not de-duplicated**, each prefixed `Spintelė N „name“:`.
7. Two-column `.split` (right column sticky, 460 px; single column under the breakpoint):
   * left: parts table → `#proglist` (all programs by cabinet) → hardware card → notes card;
   * right `<aside class="pview">`: `viewPart()` (§4).

### 2.2 Parts table

* Sort (2339): thickness **descending**, then material (localeCompare), then cabinet number, then name. (The xlsx `PARTLIST` sorts with the same order — `byThickThenName`, `export.js:90`, used at `export.js:94`; the CSV keeps the unsorted `pj.parts` order — so the on-screen **Nr differs from the CSV Nr**.)
* Group rows (`tr.grp`): `<material> · <T> mm`; a part without material shows **be medžiagos / no material** (loose parts carry the literal material `BE MEDŽIAGOS`; cabinet panels can have `mat === ''`).
* Columns:

| Header LT / EN | Content |
|---|---|
| Nr | running number after sorting |
| Detalė / Part | `p.short` bold (e.g. `1-KAIRE`), full program/part name below (`PAVYZDYS_1_Stalciai_KAIRE`) |
| Sp. / Cab. | cabinet number (1-based) |
| Ilgis / Length | `fmt(p.L)` (0.1 mm) |
| Plotis / Width | `fmt(p.W)` |
| Stor. / Thk. | `p.T` |
| Kiek. / Qty | `p.qty` (always 1 for cabinet panels; identical panels are **not merged**; loose parts are merged) |
| Kraštai / Edges | `X.edgeText(p.eb)` → codes `L1 L2 W1 W2` (L1 = eb1 = edge y0, L2 = eb2 = y1, W1 = eb3 = x0, W2 = eb4 = x1) or `—` |
| Programos / Programs | one button per program: `⤓ 1OP`, `⤓ ↻ 2OP` (class `rot` for a turned program) → `data-act="dlprog" data-v="<file>"` downloads that `.XXL`; or the tag **be CNC / no CNC** |

* Per-row action: the whole `<tr class="part" data-act="part" data-v="<p.name>" tabindex="0">` selects the part (click, Enter or Space; 3044, 2883). Under 900 px wide the page then scrolls to the part view. The selected row gets class `on`.
* No search, no filter (by cabinet / material / "no CNC"), no sort choice, no column for material other than the group header, no check-off, no multi-select.

### 2.3 Program list `#proglist` (2364–2372)

Card **CNC programos (.XXL) / CNC programs (.XXL) · n**, button **⤓ Visos .XXL atskirai (n)** (`dlall`), lead text `xxlLead` (mentions that ↻ is the turned program for 5 mm holes in a long edge and that the browser may ask to allow multiple downloads). Then per cabinet (ascending number): header `N · <cabinet name>` + **⤓ Šios spintelės (n) / This cabinet (n)** (`dlcab`, `data-v` = cabinet number), and one row per program: file name, `<short> · 1OP` or `↻ pasukta / turned`, button **⤓ .XXL** (`dlprog`).
Cabinet name is looked up as `S.proj.cabinets[cn - 1]`.

### 2.4 Hardware card (2360–2361)

Title **Furnitūra / Hardware**, note "Kiekiai iš konstrukcijos — patikrinkite prieš užsakydami / Quantities come from the construction — check before ordering". Table rows from `pj.hardware`: item (translated by `DR.hwText`), qty, unit (`DR.unitText`: vnt.→pcs, kompl.→set), `sp. 1, 2` (cabinet numbers). Read-only; no prices, no export of its own (it goes into the xlsx `HARDWARE_LIST`).

### 2.5 Notes card (2362–2363)

Title **Pastabos / Notes**: all `pj.warnings` that are **not** `bad`, de-duplicated by `dedupe()` (same text on several parts → one line with the names joined), each with a tag **patikrinti / check** (`warn`) or **rankomis / by hand** (`info`). Empty → "Nėra / None". Class `noprint`.

### 2.6 Downloads offered and the functions behind them

| Where | Button | `data-act` / `data-v` | Function | File(s) |
|---|---|---|---|---|
| header | **⤓ Viskas (ZIP) / Everything (ZIP)** (primary) | `dl` / `zip` | `download('zip')` → `zipAll(pj)` → `xlsmBytes` + `drwSheets('all','A3')` + `drawingsPdf` → `zipFiles` → `Z.zip` | `<proj>_CNC.zip` |
| header + proglist | **⤓ Visos .XXL atskirai (n) / All .XXL separately** | `dlall` | `saveProgs(all pj.files names)` | n separate `.XXL` |
| header | **Sąrašas .xlsx / List .xlsx** | `dl` / `xlsm` (key says xlsm, the file is **.xlsx**) | `download('xlsm')` → `xlsmBytes(pj)` | `<proj>_ReportLists_to_Excel.xlsx` |
| header | **Sąrašas .csv / List .csv** | `dl` / `csv` | `csvOf(pj)` | `<proj>_detales.csv` |
| header | **Spausdinti sąrašą / Print list** (hidden when `IN_ARTIFACT`) | `print` | `window.print()` | – |
| table cell, proglist row, part view | `⤓ 1OP` / **⤓ .XXL** | `dlprog` / file name | `saveProgs([file])` | one `.XXL` |
| proglist cabinet header | **⤓ Šios spintelės (n)** | `dlcab` / cabinet nr | `saveProgs(files of parts with p.cab == v)` | that cabinet's `.XXL` files |
| part view (only when the part has >1 program) | **⤓ Visos šios detalės (n) / All of this part** | `dlpart` / part name | `saveProgs(files of that part)` | 2+ `.XXL` |
| part view | **Kopijuoti / Copy** | `copy` | clipboard ← text of `#progtext` (fallback: selects the text) | – |
| drawings tab | PDF buttons | `drwpdf`, `drwpdf1` | `savePdf` (§8) | `.pdf` |
| home screen row | **.json** | `pjson` / project id | `saveFile(...)` | `<safeName>_projektas.json` |

Details:

* `download(kind)` (3170–3181) rebuilds `buildProjectAll()` each time. `zip` and `xlsm` are guarded by `S.busy` (toast **Ruošiama… / Preparing…**). `download('json')` exists (project JSON of the open project, **with** `pricing`) but **no button in the results view calls it** — the only JSON download is on the home screen.
* ZIP contents (`zipFiles`, 3159–3169): `<proj>_XXL/<program>.XXL` (every `pj.files`), `<proj>_ReportLists_to_Excel.xlsx`, `<proj>_detales.csv`, `<proj>_brezinai.pdf` (all drawing sheets, **always A3**, silently skipped if drawing fails), `<proj>_projektas.json` (the project; `pricing` removed unless admin), `<proj>_pastabos.txt` (all warnings through `wTxt`, only if there are any). `<proj>` = `pj.project` = `projName()` = `E.safeName(S.proj.name || 'PROJEKTAS')`; a name with no ASCII letters/digits becomes `PROJEKTAS_<last 4 of id>` (688).
* xlsx (`xlsmBytes`, 3147–3152): `window.DBReport.buildReport(templateBytes, X.reportInput(pj), { version:'v20-kurejas-2.1', xlsx:true })` on the built-in template `window.DB_REPORT_TEMPLATE_B64` or the user's (`S.tplB64`). Needs `window.JSZip` (loaded from a CDN). If JSZip/template is missing or the build throws: toast `rptFallback` and a **plain workbook** (`plainXlsm` = `Z.zip(Z.fromEntries(X.workbookEntries(X.sheets(pj))))`) is produced instead — a different file layout under the same file name.
* CSV (`csvOf`, 3139–3144): UTF-8 BOM, `;` separator, CRLF; columns `Nr;Part;Detale;Spintele;Medziaga;Ilgis;Plotis;Storis;Kiekis;Krastai;Krasto medziaga;1OP;2OP`; rows in `pj.parts` order.
* `saveProgs(names)` (3183–3189): looks every name up in `pj.files`; none found → toast **be CNC / no CNC** (error); several → toast **Atsisiunčiama failų: n… / Downloading n files…**, then one `saveFile` per file spaced 300 ms (450 ms in artifact mode) so the browser lets them through (the browser may still show its "allow multiple downloads" prompt).
* `saveFile(name, data, type)` (3190–3202): Blob + temporary `<a download>`; in artifact mode `window.claude.use('downloads')`.
* Print CSS (`legacy_0.css:376–385`): hides `.top, .rail, .sheet, .editor, .dl, .pview, .noprint`; so the print-out is: head line, title + stats, error list, parts table, hardware table.

---

## 3. `readyCheck(pj)` — "before it goes to the machine" (2377–2395)

A card `div.card.ready.{bad|ok}.noprint` with a title and a `<ul>`; each item is `[severity, html text, optional button]`; icon ✓ (`ok`), ! (`warn`), ✕ (`bad`).

Title: **Prieš siunčiant į CNC — pataisykite / Before sending to CNC — fix these** when at least one `bad` item exists, otherwise **Paruošta CNC / Ready for CNC**. `warn` items do not change the title: the card can say "Ready for CNC" while listing a `!` line.

### 3.1 Items, in order

| # | Condition | Severity | Text LT / EN | Fix button (`Taisyti / Fix`) |
|---|---|---|---|---|
| 1a | `!String(S.proj.name).trim()` | bad | Neįrašytas projekto pavadinimas (jis bus failų pavadinimuose) / No project name (it goes into the file names) | `data-act="fixname"` → focuses `#projname` in the header and scrolls it to the centre (3073) |
| 1b | else | ok | Projektas: **{n}** / Project: **{n}** — `{n}` is `projName()` (the sanitised file-name form, not what was typed) | – |
| 2a | any cabinet with `needsMats(c)` | bad | Neįrašyta medžiaga — spintelės {c} / No material — cabinets {c} (comma list of 1-based numbers) | `data-act="fixcab" data-i="<first such cabinet index>" data-v="mats"` |
| 2b | else | ok | Medžiagos įrašytos / Materials filled in | – |
| 3 | any cabinet with `needsWt(c)` (no ok line otherwise) | bad | Neįrašyta stalviršio medžiaga — spintelės {c} / No worktop material — cabinets {c} | `fixcab`, `data-i` first such cabinet, `data-v="wt"` |
| 4 | any cabinet with `!c.edge.carc && !c.dishwasher` | **warn** | Neįrašytas karkaso kraštas — spintelės {c} / No carcass edging — cabinets {c} | `fixcab` (ghost style), first such cabinet, `data-v="mats"` |
| 5 | `errs = pj.warnings.filter(level === 'bad').length > 0` | bad | Klaidų, dėl kurių dalis detalių ar skylių nepadaroma: {n} (žr. žemiau) / Errors that leave parts or holes out: {n} (see below) | **none** — the errors are the red list under the card |
| 6 | always | ok | {p} detalės, {n} CNC programų / {p} parts, {n} CNC programs (`pj.parts.length`, `pj.files.length`) | – |

Helper conditions (888–889):

* `needsWt(c)` = `c.worktop && c.worktop.on && !c.dishwasher && !c.worktop.mat.trim()`.
* `needsMats(c)`: panel (`kind === 'panel'`) → `!c.mat.carc`; dishwasher → `!c.mat.facade`; box (`kind === 'box'`) → `!c.mat.carc || (c.box.fronts.length > 0 && !c.mat.facade)`; normal cabinet → `!c.mat.carc || (has a drawers/doors/cargo section && !c.mat.facade)`.

### 3.2 Fix targets

* `fixcab` (3072): `S.home = false; S.tab = 'cab'; S.sel = i; S.picking = false; render();` then after 30 ms: for `v === 'wt'` it looks for `#f-c-worktop-mat` and, if the element exists, `scrollIntoView` + `focus` and **returns**; otherwise (`v` falls back to `'dims'`) `gotoStep('st-' + v)`. For `mats` → `gotoStep('st-mats')`, which switches the one-step-at-a-time editor to the Materials step.
* Only the **first** offending cabinet is opened; the other numbers in the message are plain text.
* **Bug (verified live):** for `wt`, `#f-c-worktop-mat` lives in the step card `st-build`, which is hidden (`.card.step.off`) unless that step happens to be the current one. The element exists, so the code focuses a hidden input and returns: the user lands on the cabinet tab at whatever step was open last (e.g. Materials) with nothing focused and no hint where the worktop material is.

### 3.3 Severity source for item 5: `level(w)` (715–720)

Classification is done by **regular expressions on the Lithuanian warning text**:

* `warn` first if it matches `/kiekis 0 — nepridėta|turi likti bent/i`;
* `bad` if it matches `/NEPROGRAMUOTA|didesnė už|netinkami|praleista|nepalaikom|nepridėt|ne prie šono|negali būti gręžiamos|netelpa|nesurištas|persidengia|susitinka|nepritvirtinta|per maž|ilgesnis nei telpa|nepakanka vietos|nepavyko|per gili|per daug stalčių|uždaro konstrukciją|per arti viena kitos|šone nėra plokštės|gylio, yra/i`;
* `warn` if it matches `/NEPATIKRINTA|nepatikrintos|patikrinti|perkeltas|patikrinkite|šablono nėra|patenka į|prispaudimą|kertasi|pastumt|padalinti po lygiai|apatinis fasadas|pridėtos tik|tinka 16|nenurodyta|etiketėje telpa/i`;
* otherwise `info`.

English display goes through `wTxt()` (1831) — a phrase-by-phrase replacement table `WARN_EN` (1828). There are no warning codes, no structured data (which cabinet / which part / which field) — only strings.

### 3.4 What is blocked when the check fails: **nothing** (verified live)

With an unnamed project, two cabinets without materials, a worktop without material and one hard engine error, every download button stayed enabled (`disabled === false` on all five). `download()`, `saveProgs()`, `nestHandoff()` and `savePdf()` never consult `readyCheck`. Consequences:

* an unnamed project exports as `PROJEKTAS_…`;
* parts with no material are exported with an empty material (cabinet panels) or `BE MEDŽIAGOS` (loose parts);
* a cabinet with a hard error (e.g. "netinkami matmenys") silently contributes **no parts**, the rest is exported;
* the only trace in the ZIP is `<proj>_pastabos.txt`.

### 3.5 What the checklist does **not** look at

* front edging (`c.edge.facade`) and back material (`c.mat.back`);
* `warn`-level notes (all the "NEPATIKRINTA / not verified" ones, shortened worktops, moved hinges…) — they sit in the Notes card at the very bottom;
* the per-cabinet confirmations of the cabinet editor: joints checked (`c.jointsOk` vs `jcSig`, `jcNeeded` 1207) and edges checked (`c.edgesOk` vs `ecSig`, `ecNeeded` 1224);
* the furniture-layout problems (`roomChecks`, overlaps, cabinets past a wall);
* parts too big for the board (`unplaced` in the cutting plan, §7);
* missing prices; the fallback plain xlsx; extras without a material (they silently take the carcass material);
* a missing carcass material produces **no engine warning at all** — this checklist line is the only place it is reported.

### 3.6 Third-pass live run on a broken project (what the user actually gets)

Set-up through `window.__dbk`: example project with `name = ''`; cabinet 1 `mat.carc = ''`; cabinet 2 `mat.facade = ''`, `worktop.on = true`, `worktop.mat = ''`; cabinet 3 `edge.carc = ''` and `W = 20`.

| Observed | Detail |
|---|---|
| Card title | **Prieš siunčiant į CNC — pataisykite** |
| Items rendered | ✕ no project name `[Taisyti → fixname]` · ✕ "Neįrašyta medžiaga — spintelės 1, 2" `[fixcab i=0 v=mats]` · ✕ "Neįrašyta stalviršio medžiaga — spintelės 2" `[fixcab i=1 v=wt]` · ! "Neįrašytas karkaso kraštas — spintelės 3" `[fixcab i=2 v=mats, ghost]` · ✕ "Klaidų … : 1 (žr. žemiau)" (no button) · ✓ "18 detalės, 16 CNC programų" |
| Downloads | all five header buttons and every `#proglist` button `disabled === false` |
| Stats line | still "3 Spintelės", but 18 parts / 16 programs: cabinet 3 (hard error "netinkami matmenys: per maža spintelė (plotis ir aukštis ≥ 96 mm, gylis ≥ 100 mm)") contributes **nothing** and nothing in the table says a cabinet is missing |
| `pj.project` | `PROJEKTAS` — every program and file is named `PROJEKTAS_…` |
| Materials in `pj.parts` | `''` (cabinet 1 carcass parts), the two real names, and `BE MEDŽIAGOS` (the worktop piece; note "„2-STALVIRSIS“: medžiaga nenurodyta — pažymėta „BE MEDŽIAGOS“", classified `warn`) |
| Cabinet 2 fronts | exported **in the carcass board** — `mFac = mat.facade || mCarc` (`engine.js:322`, again at `engine.js:1581`). The checklist calls this "No material" in the same sentence as a missing carcass board, so the user cannot tell which field is empty, and the export quietly makes anthracite-intended fronts in white |
| Cabinet 3 edging | banded edges are exported with the literal edge name `KRAŠTAS` (`engine.js:323`) |
| Boards tab | a third "material" row named **—** (18 mm) appears for the parts without a material and gets its own board |
| Fix → `fixname` | focus lands in `#projname` (works) |
| Fix → `fixcab … mats` | Cabinets tab, cabinet 1 selected, step `mats` shown (works; only cabinet 1 of "1, 2") |
| Fix → `fixcab … wt` | Cabinets tab, cabinet 2 selected, but the step shown stays whatever was open before (`mats` in the run); `#f-c-worktop-mat` exists inside `#st-build`, whose class is `card step off` (not displayed), so nothing visible is focused |

---

## 4. Part view — `viewPart()` (2417–2433), `panelSVG()` (2435–2465), `ebEditor()` (2409–2416)

### 4.1 Which part is shown

`findPanel(S.part)` (2401–2407) searches every cabinet's `S._info[i].r.panels` (re-building the cabinet if no cached info) for `panel.name === S.part`. Nothing selected → card **Pasirinkite detalę — pamatysite brėžinį ir programą. / Pick a part to see its drawing and program.**

### 4.2 Loose part (an extra part or a worktop piece) — read only (2419–2424)

Found in `S._pjParts` by name: title (`short`), `L × W × T` (+ `· n vnt./pcs` when qty > 1), `panelSVG` of a fake panel (outline + banded edges, no holes), a line `material · edge codes`, and a card **Šiai detalei CNC programos nėra — ji pjaunama pjūklu. / This part has no CNC program — it is cut on the saw.** No editing here (extras are edited in the cabinet's "extra" step, the worktop in the cabinet).

### 4.3 Cabinet panel

1. Title bar: `p.short`, `L × W × T`. (The **material is not shown** in the part view — only in the table's group header.)
2. `ebEditor(p, up)` — §4.5.
3. `panelSVG(p, up)` where `up` = the face that is up in the **first** program (`pr.files[0].up`, `'A'` or `'B'`); the picture does not change with the program tab.
4. Legend: iš viršaus / from top (blue circle), iš apačios (2OP) / from below (red dashed), kiaurai / through (black), žymė / mark (brown), krašte / in edge (green bar), briauna / edgeband (yellow bar).
5. Orientation note `noteTxt(p.note)` (e.g. "vidinė pusė viršuje, apatinis kraštas X=0, priekis Y=DY" — how the board lies on the machine).
6. If the selected program is a turned one: hint `rotHint` ("↻ — second program with the same face up, panel turned 90° counter-clockwise (the front edge becomes the left end)").
7. `E.programs(p)` (`engine.js:1818–1904`, returns `{ files, warnings }`) → `pr.files[]` = `{ file, id, text, n, up, kind }` (`kind` `'main'` or `'rot'`; the face up in 1OP is the one with more blind holes/grooves, `engine.js:1820–1821`). Program tabs **1OP / ↻ 2OP …** (`data-act="ptab" data-v="<i>"`), the file name, **Kopijuoti / Copy** (`copy`), **⤓ .XXL** (`dlprog`), and when there is more than one program **⤓ Visos šios detalės (n)** (`dlpart`). Then the full program text in `<pre class="code" id="progtext">`.
8. No programs → card **be CNC / no CNC**.

### 4.4 `panelSVG` — what is drawn

"Panel as the operator sees it in 1OP: X to the right from the left end, Y up from the front edge."

* Fit box 420 × 300 px, padding 26; white rectangle `L × W`, black outline.
* Banded edges: 4 px yellow (`#f2b705`) lines on `y0` (bottom), `y1` (top), `x0` (left), `x1` (right); Y is mirrored (`my(y) = W − y`) when the face up is `B`.
* `p.edges[]` (horizontal bores in an edge: `{ edge:'x0'|'x1'|'y0'|'y1', pos, d, depth }`): green line from the edge inward, length = depth, width = diameter.
* `p.grooves[]` (routed LED-profile grooves `{ x0, x1, y0, y1, face }`): filled yellow on the face that is up, dashed outline when on the other face.
* `p.holes[]` (`{ face, x, y, d, depth, through, mark }`): `mark` → small brown dot; `through` → black disc; on the face up → blue-outlined light disc; on the other face → red dashed circle. Radius = real diameter to scale (min 2 px).
* Dimension texts: `L` under the panel, `W` rotated on the left; a red dot and the label **X0 Y0** at the bottom-left corner.
* Not drawn: hole coordinates/diameters as text, hole table, grain direction, which neighbour part each hole belongs to, tooltips. Not interactive.

### 4.5 What can be edited per part — **only the edge bands**

`ebEditor(p, up)` renders (class `noprint`):

* header **Laminuojami kraštai / Banded edges** + lead "spustelėkite kraštą — įjungti / išjungti (kaip etiketėje) / click an edge to switch it on / off (as on the label)" + a **↺ Standartiniai / Standard** button (`data-act="ebreset"`) shown only when `p.ebManual`;
* a checkbox `data-act="ebfac"`: **Matoma detalė — kraštai pagal fasadą (etiketėje „PAGAL FASADA“) / Visible part — edges as the fronts (label: PAGAL FASADA)**, checked when `p.ebFac`;
* a small grid laid out like the picture: four toggle buttons `data-act="ebtog" data-v="y1|x0|x1|y0"` (top, left, right, bottom; top/bottom swapped when `up === 'B'`), each showing `▬ <len>` when banded or `＋ <len>` when not, `aria-pressed`, title `Kraštas <len> mm`.

Handler (3046–3054):

```
cb = S.proj.cabinets[pp.cab - 1];  cb.ebEdit = cb.ebEdit || {};
ebreset → delete cb.ebEdit[pp.key]
ebfac   → ov = cb.ebEdit[pp.key] ||= {};  ov.fac = !pp.ebFac;
          if (ov.fac && no edge is banded) ov.y0 = true;      // the front edge is the one that shows
          if (!ov.fac) delete ov.fac;  if (ov is empty) delete cb.ebEdit[pp.key]
ebtog   → ov = cb.ebEdit[pp.key] ||= {};  ov[v] = !(pp.eb && pp.eb[v])     // true / false per edge
if (!cb.edge.carc && !cb.edge.facade && act === 'ebtog') toast(ebNoMat)   // "Edge marked, but no edge band material is set (Materials) — the label will say KRAŠTAS"
save(); render()
```

Storage of the override: **on the cabinet**, `c.ebEdit[<part key>] = { y0?, y1?, x0?, x1?: true | false | 'fac', fac?: true }`. The part key is the part's name without the `<project>_<nr>_<cabinet name>_` prefix (`p.key`, `engine.js:340`), e.g. `KAIRE`, `FASADAS1`. The engine applies it in `applyEbEdit` (`engine.js:154–160`, called from `finishParts` 337–343 and again at 1739–1742 for box cabinets):

* `true` → banded with the standard edge of that part (`c.edge.facade || c.edge.carc` for fronts, `c.edge.carc` otherwise; literal `'KRAŠTAS'` if none is set);
* `false` → not banded; `'fac'` (set from the cabinet editor's edge-check modal, `data-act="ebk"`, not from this view) → banded with the fronts' edge and flagged;
* `fac: true` → every banded edge gets the front edge material (`c.edge.facade || 'PAGAL FASADA'`) and `p.ebFac[e] = true` (label prints PAGAL FASADA instead of LAMINUOJASI);
* always sets `p.ebManual = true`.

Things to know:

* The key is derived from the part **name**; an override silently stops applying if the part disappears or is renumbered (e.g. `LENTYNA2` after removing a shelf) and stale keys stay in `c.ebEdit`.
* Changing edges here changes `ecSig(r)`, so the cabinet's "edges checked" confirmation (`c.edgesOk`) becomes stale and the edge-check banner returns in the cabinet editor.
* There is **no** per-part: material override, grain direction, quantity, rename, note/comment, hide/exclude from export, "done" mark, hole editing. (Holes/joints are edited in the cabinet editor's 3D connector editor, `c.cnc.joints`; visibility of sides is `c.vis` on the cabinet.)

---

## 5. Settings screen — `viewSet()` (2468–2533)

Title **Nustatymai / Settings**, lead **Taikoma visiems projektams šioje naršyklėje. / Applies to every project in this browser.** Settings live in `S.settings`, persisted whole as `localStorage['dbKurejas.settings']`, normalised at load (`normSettings`, 435–443). Bindings use the prefix `s.` (`target()`, 2717). Footer: `v2.1 · taisyklės: offer CNC modulis …`.

Size of the page (verified live, admin locked): 12 headings in 10 cards and **82 `data-bind` controls** = 27 type selects + 11 in operations (2 checkboxes, 8 segmented-button options, the rail-width field) + 3 machine fields + 10 ball-runner + 10 undermount + 8 MERIVOBOX + 10 hinge/shelf fields + 3 list textareas. Unlocking the price lists adds 19 fixed price fields, two two-way switches (project type, VAT applies) and one row per material, edge band and fitting.

Cards in order: **(1) admin/pricing** (`adminCard()`, §6) · **(2) default construction per type** (wide) · **(3) default operations** · **(4) machine** · **(5) GTV/DTC ball-bearing runners** · **(6) DTC D-Motion undermount runners** · **(7) Blum MERIVOBOX** · **(8) hinge and shelf hole dimensions** · **(9) ReportLists template** · **(10) material / edgeband / worktop lists**. Cards 5–8 carry a yellow badge **nepatikrinta / unverified**.

### 5.1 How a settings change is applied

* Text inputs: on every `input` event a valid in-range number is assigned at once (`assign`, then `after(bind,false)` → `store('dbKurejas.settings')` + `applyRules()`); on `change` the value is validated against `NUM_LIMITS` (2783–2792): not a number → previous value or the catalogue default (`ruleDefault`) with toast **Netinkamas skaičius → x**; out of range → previous/clamped with toast **Leidžiama a–b → x**. Limits: `s.railW` 30–400; `s.rules.ball.(midFrom|boxT)` 0–5000; `s.rules.under.(ded|boxT)` 0–200; `s.rules.pins.(extra|below)` 0–50; every other `s.rules.*` 0.1–5000.
* Selects, checkboxes, `seg` buttons (`data-act="set"`): full re-render.
* `applyRules()` (445–455) pushes `S.settings.rules` into the engine (`E.setRules`) → **rules act on every cabinet of every project immediately** and are **not stored in the project** (the same project opened in another browser can drill differently).
* Type defaults, operations and `railW` are only **copied into a cabinet when it is created** (`cncFor(type)`, 393–399) or when its type is changed (`assign('c.type')`, 2746–2748). Existing cabinets do not follow later changes.

### 5.2 Card 2 — "Numatyta konstrukcija pagal tipą / Default construction per type"

Note: "Naujai spintelei parenkama pagal tipą. Darbuotojui keisti nereikės. / A new cabinet gets these by type. The workshop does not need to change them."
A grid: one column per type (`TYPES` = `PASTATOMOS` Pastatoma/Base, `PAKABINAMOS` Pakabinama/Wall, `ŪKINĖ` Aukšta/Tall), one `<select data-bind="s.types.<TYPE>.<key>">` per cell.

| Row LT / EN | key | options (value → label) | defaults Base / Wall / Tall |
|---|---|---|---|
| Jungtys / Joinery | `joinery` | `confirmat` Konfirmatai/Confirmats · `cam` Ekscentrikai + kaiščiai/Cams + dowels | confirmat ×3 |
| Viršus / Top | `top` | `rails` Juostos/Rails · `full` Pilnas viršus/Full top | rails / full / full |
| Nugara (18 mm) / Back (18 mm) | `back` | `none` Nėra · `hdf` Plaušas/Fibreboard · `top` Išorėje — ant galo/Outside — on the back edges · `inside` Viduje — tarp šonų/Inside — between the sides | none / top / top |
| Nugaros tvirtinimas / Back fixing | `backFix` | `confirmat` · `cam` | confirmat / confirmat / cam |
| Surišimo juostos: priekyje / Top rails: front | `railFront` | `h` Gulsčia/Flat · `v` Stati/Standing · `none` Nėra | h ×3 |
| Surišimo juostos: gale / Top rails: back | `railBack` | `h` · `v` · `hv` Gulsčia + stati/Flat + standing · `none` | h ×3 |
| Apačioje gale / Bottom back | `railBottom` | `false` — · `true` ✓ | false ×3 |
| Viršus dengia fasadus / Top covers the fronts | `topOverFacade` | `false` — · `true` ✓ | false ×3 |
| Kojelės ir jų žymės dugne / Legs and their marks in the bottom | `legs` | `true` ✓ · `false` — | true / false / true |

(`'true'`/`'false'` strings are converted to booleans in `assign`, 2740–2741.)

### 5.3 Card 3 — "Numatytos operacijos / Default operations" (`S.settings.ops`, defaults in `defSettings` 345–357, `ops` at 354)

| Control | Path | Values | Default | Effect |
|---|---|---|---|---|
| checkbox Bėgelių žymės šonuose / Runner marks in the sides | `s.ops.runnerMarks` | bool | true | new cabinets' `cnc.runnerMarks` |
| seg "TANDEMBOX fasadai / TANDEMBOX fronts" | `s.ops.tbFront` | `off` — · `mark` Žymės Ø5 (varžtams)/Ø5 marks (screws) · `hole` Skylės Ø10 (reikia Ø10 grąžto)/Ø10 holes (needs a Ø10 drill) | mark | new cabinets' `cnc.tbFront` |
| checkbox Lankstų skylės / Hinge holes | `s.ops.hinges` | bool | true | `cnc.hinges` |
| seg (hinge cup fixing) | `s.ops.hingeFix` | `screw` Prisukamas (+2 žymės Ø5 × 2)/Screw-on · `press` Įspaudžiamas (+2 × Ø8)/Press-in | screw | `cnc.hingeFix` |
| seg "Lentynų laikiklių skylės / Shelf support holes" | `s.ops.pins` | `off` — · `shelf` Tik po lentyna/Under the shelf only · `row` Eilė ±2 kas 32/Row ±2 at 32 | shelf | `cnc.pins` |
| input "Juostos plotis / Rail width" mm (`#f-s-railW`) | `s.railW` | 30–400 | 100 | `cnc.railW` |

### 5.4 Card 4 — "Staklės / Machine"

| Label | Path | Default | Effect |
|---|---|---|---|
| Grąžtai galvoje (viršus), mm / Drills on the head (top), mm (`#f-s-drills`, free text) | `s.rules.drillsTop` | `"5, 8, 15, 35"` | parsed by `drillList`; "Iš Maestro konfigūracijos. Skylės, kurių skersmens čia nėra, neprogramuojamos. / From the Maestro configuration. Holes of a size not listed are not programmed." (→ NEPROGRAMUOTA errors). Empty/unusable → default list. |
| TANDEMBOX fasado skylė (jei Ø) Ø | `s.rules.tbHole.d` | 10 | diameter of the TANDEMBOX front hole when `tbFront = hole` |
| TANDEMBOX fasado skylė (jei Ø) gylis / depth | `s.rules.tbHole.depth` | 12 | its depth |

No machine table size, no post-processor options, no tool numbers, no kerf: those are fixed in the engine or belong to the Nesting app.

### 5.5 Card 5 — "Guoliniai bėgeliai GTV / DTC / GTV / DTC ball-bearing runners" (`S.settings.rules.ball`)

Intro: side-mount 45 mm runners, the drawer is a board box 12.7 mm clear of each side, box length = runner length, "hole positions are NOT yet verified against a real runner — measure one and correct them here".

| Label EN | Path | Default |
|---|---|---|
| Front hole from the side front | `s.rules.ball.front` | 35 |
| Rear hole before the runner end | `…ball.rear` | 30 |
| Middle hole (32 grid) from length | `…ball.midFrom` | 450 |
| Runner axis above the front bottom | `…ball.up` | 37 |
| Side clearance | `…ball.clear` | 12.7 |
| Box bottom below the axis | `…ball.boxBelow` | 22 |
| Box top below the front top | `…ball.topGap` | 10 |
| Box board (0 — as the carcass) | `…ball.boxT` | 0 |
| Holes per length (optional), free text, placeholder `450: 35,195,420; 500: 35,227,470` | `…ball.perLen` | `''` — format checked on change (toast `perLenBad`) but the bad text is still stored |
| checkbox Marks on the box sides too (drawer member) | `…ball.drawerMarks` | true |

Not exposed: `lengths` [300, 400, 450, 500, 550].

### 5.6 Card 6 — "Paslėpti bėgeliai DTC D-Motion / DTC D-Motion undermount runners" (`S.settings.rules.under`)

| Label EN | Path | Default |
|---|---|---|
| Cabinet holes from the front (list, placeholder `37, 165, 229`) | `s.rules.under.marks` | `'37, 165, 229'` — on change non-numbers are dropped (toast `numSome`), nothing usable → default |
| Hole row above the bottom / front bottom | `…under.up` | 37 |
| Gap under the box | `…under.clearBelow` | 14 |
| Bottom recess | `…under.recess` | 13 |
| Box shorter than the runner | `…under.shorter` | 10 |
| Inside width = opening − (0 — from the side thickness) | `…under.ded` | `''` (→ 42 for 16 mm, 49 for 19 mm) |
| Box top below the front top | `…under.topGap` | 10 |
| Cabinet depth ≥ runner + | `…under.depthPlus` | 3 |
| Box board (0 — as the carcass) | `…under.boxT` | 0 |
| Holes per length (optional), placeholder `250: 37,165; 600: 37,165,229,453` | `…under.perLen` | `''` |

Not exposed: `lengths` [250…600 step 50].

### 5.7 Card 7 — "Blum MERIVOBOX" (`S.settings.rules.merivo`)

| Label EN | Path | Default |
|---|---|---|
| Profile holes from the front (list, placeholder `37, 261, 293`) | `s.rules.merivo.marks` | `'37, 261, 293'` |
| Hole row above the front bottom | `…merivo.up` | 33 |
| Box bottom below the hole row | `…merivo.below` | 24 |
| Base / back = opening − | `…merivo.ded` | 51 |
| Base = NL − | `…merivo.shorter` | 26 |
| Box top below the front top | `…merivo.topGap` | 10 |
| Cabinet depth ≥ NL + | `…merivo.depthPlus` | 3 |
| Holes per length (optional), placeholder `270: 37; 450: 37,261,293` | `…merivo.perLen` | `''` |

Not exposed: `boxShorter` 10, `t` 16, `sideH` {N 68.5, M 91, K 129, E 192}, `backH` {N 60.5, M 83, K 121, E 184}, `lengths` [270…600].

### 5.8 Card 8 — "Lankstų ir lentynų skylių matmenys / Hinge and shelf hole dimensions"

Note: "Nepatikrinta su jūsų SWOOD modeliu. Patikrinkite pirmas duris ir šoną, pataisykite čia. / Not verified against your SWOOD model. Check the first door and side, then correct here."

| Label LT / EN | Path | Default |
|---|---|---|
| Puodelio centras nuo durų krašto / Cup centre from the door edge | `s.rules.hinge.cupFromEdge` | 22.5 |
| Puodelio gylis / Cup depth | `s.rules.hinge.cupDepth` | 13 |
| Kraštinis lankstas nuo durų galo / Outer hinge from the door end | `s.rules.hinge.fromEnd` | 100 |
| Plokštelė nuo šono priekio / Plate from the side front | `s.rules.hinge.plateFromFront` | 37 |
| Plokštelės skylių atstumas / Plate hole spacing | `s.rules.hinge.plateSpacing` | 32 |
| Laikiklis nuo šono priekio / Support from the side front | `s.rules.pins.fromFront` | 37 |
| Laikiklis nuo lentynos galo / Support from the shelf back | `s.rules.pins.fromBack` | 30 |
| Skylės centras žemiau lentynos / Hole centre below the shelf | `s.rules.pins.below` | 3 |
| Laikiklio skylės gylis / Support hole depth | `s.rules.pins.depth` | 12 |
| Eilės žingsnis / Row pitch | `s.rules.pins.pitch` | 32 |

Button **Atstatyti katalogo reikšmes / Reset to catalogue values** (`data-act="resetrules"`, 3064–3066): resets **only** `rules.hinge` and `rules.pins` to `RULE_DEF`, stores, re-applies, and shows a toast with **↶ Atšaukti / Undo** for 6 s. There is no reset for the runner cards, machine, types or operations.
Not exposed: hinge `cupD` 35, `dowelD` 8, `dowelDepth` 11, `dowelSpacing` 45, `dowelOffset` 9.5, `plateD` 5, `plateDepth` 2 (forced back to the default at load, 441); pins `d` 5, `extra` 2.

### 5.9 Card 9 — "ReportLists šablonas / ReportLists template"

Lead `tplLead` (the .xlsx is filled into this template exactly like the SolidWorks macro DB_PartList v20: same sheets, labels, QR, pictures with the grain arrow, grouped by thickness; a material whose thickness is not the part's is marked yellow). Shows **Įdiegtas: … / Built in: …** or **Jūsų šablonas: <file>**. Controls: **Įkelti kitą ataskaitą (.xlsm / .xlsx) / Load another report** (`<input id="f-tpl" type="file" data-act-change="tpl">` → `loadTemplateFile`, 670–686: needs JSZip, requires sheets named `PARTLIST` and `LABEL` in `xl/workbook.xml`, else toast `tplBad`; stores `{name, b64}` in `localStorage['dbKurejas.reportTpl']`, or session-only with toast `tplSession` when storage refuses) and, when a custom one is loaded, **Grąžinti įdiegtą / Back to built-in** (`data-act="tplreset"`).

### 5.10 Card 10 — lists

Three `<textarea data-lines="1">`, one name per line, saved on every keystroke (`input` handler 2805; trimmed, empty lines dropped): **Medžiagų sąrašas / Material list** → `S.settings.materials`; **Kraštų sąrašas / Edgeband list** → `S.settings.edges`; **Stalviršių sąrašas / Worktop list** → `S.settings.worktops`. Note: "Po vieną eilutėje — bus siūloma pildant. / One per line — offered while filling in." All three default to **empty**. They only feed the `<datalist>` suggestions and the admin price rows; a material is a free-text name with no thickness, sheet size, grain or price attached, and nothing validates a typed name against the list.

### 5.11 Settings kept elsewhere

* `S.settings.boards[<material name>] = { W, H, grain }` — edited only in the Boards tab (§7).
* Language `dbKurejas.lang`, drawing paper `dbKurejas.paper`, template `dbKurejas.reportTpl`, prices `dbKurejas.pricing`, PIN `dbKurejas.adminPin`.
* `store()` (333) calls an optional `window.__dbkOnStore(key)` hook after every write (used by the cloud script outside `app.js`).

---

## 6. Pricing and admin mode

Header comment (1975–1981): direct cost of a cabinet from its real parts, then the offer app's ladder; "Prices and the PIN stay in this browser only; the lock keeps prices from the workshop screen, it is not security."

### 6.1 PIN mechanics

* `pinHash(pin)` (1992–1996): SHA-256 hex of `'db-kurejas:' + pin` via `crypto.subtle`; without it (non-secure context) a 32-bit FNV-1a hash prefixed `'f'`. Returns a Promise.
* Stored hash: `localStorage['dbKurejas.adminPin']` (JSON string). Unlock marker: `sessionStorage['dbKurejas.admin']` = the same hash (raw). `S.admin` at start-up (1991) is true only when both exist and are equal → unlocked for the browser tab session, locked again in a new tab/window.
* Settings card when locked (`adminCard`, 2117–2122): explanatory note, a `PIN` password field `#adm-pin` (numeric keyboard), and
  * no PIN stored yet: second field `#adm-pin2` + **Nustatyti PIN / Set PIN** (`adminset`, 2933–2936): min. 4 characters ("PIN — bent 4 simboliai"), both must match ("PIN nesutampa"), then hash stored, session unlocked, toast "Administratoriaus režimas įjungtas / Admin mode on";
  * PIN exists: **Atrakinti / Unlock** (`adminunlock`, 2937–2939): wrong → toast "Neteisingas PIN / Wrong PIN", field cleared and refocused; right → toast "Kainos matomos / Prices shown".
* Unlocked: buttons **Keisti PIN / Change PIN** (`adminpin` toggles `S.pinChange` → row with `#adm-npin`, `#adm-npin2`, **Išsaugoti PIN** `adminpinsave`, **Atšaukti** `adminpincancel`; the old PIN stays until the new one is saved) and **🔒 Užrakinti / Lock** (`adminlock`: `S.admin = false`, session key removed, toast "Užrakinta — kainos paslėptos").
* No attempt limit, no "forgot PIN" path (only clearing the browser's storage), anyone can set the first PIN, and the price lists sit unencrypted in `localStorage`.

### 6.2 What admin mode switches on

* header badge **€ Admin** (`data-act="tab" data-v="set"`);
* a price under every cabinet in the cabinet list (`small.cabprice`, 881 — one extra `priceCabinet` call per cabinet on every render);
* `priceCard(c, inf)` in the cabinet editor's right column (refreshed while typing by `refreshLive`, 2590);
* `priceProjectCard()` on the Parts & CNC tab;
* the price lists in Settings;
* `S.proj.pricing` is kept inside the ZIP's `_projektas.json` (stripped otherwise).

### 6.3 Price data — `PR` (global, `localStorage['dbKurejas.pricing']`, merged over `prDefaults()` at load, 1983–1990)

```
PR = {
  cut: 0.6,                // €/m of part outline
  edge: 1.7,               // €/m of banded edge (default)
  def: { carc: 8, facade: 29, back: 5, top: 60 },   // €/m² when a material has no own price
  mat: { '<material name>': €/m² },
  edgeMat: { '<edge name>': €/m },
  hw: { '<fitting name>': €/unit },                 // defaults PR_HW (1982)
  q: { use:'VIRTUVĖ'|'SPINTA', margin:28, pvm:21, vat:true, matMarkup:10, packing:1, defects:5,
       fasteners:4, waste:25, depreciation:2.5, designKitchen:9, designWardrobe:6,
       assemblyKitchen:10, assemblyWardrobe:9, admin:10 }
}
```

`PR_HW` defaults (€/unit): CARGO DTC PURE PRO 95, BLUM TANDEM 26, BLUM TANDEMBOX 40, BLUM MERIVOBOX N 30 / M 32 / K 36 / E 32, BLUM MERIVOBOX galerija 12, BLUM MERIVOBOX BOXCAP 20, GUOLINIAI 8, KT. PASLĖPTO MONTAVIMO 12, BLUM LANKSTAI 13, BLUM TIP-ON 16, KT. LANKSTAI 6, KT. TIP-ON 9, BE FURNITŪROS 0, GTV KULKINIAI H45 8, DTC KULKINIAI H45 8, DTC PASLĖPTI 15.9.

Per-project part: `S.proj.pricing = { montavimas, delivery }` (installation and delivery €, bound as `pp.montavimas`, `pp.delivery`).

Bindings (`assign`, 2729–2738): prefix `pr.` walks into `PR`; a dot inside a material name is written as U+2024 `․` in the binding path and converted back; an emptied field returns to its default (or is deleted for per-name prices); numbers 0–1e6; `pr.q.use` is a string, `pr.q.vat` a boolean; `prSave()` after each change. No re-render while typing; full render on `change`.

### 6.4 `priceCabinet(c, r)` (2019–2065) → `ladder(o)` (2066–2076)

Lookups: `matPrice(name, kind)` = `PR.mat[name]` or `PR.def[kind]` (and a "missing" note `medžiaga „X“ — imama numatyta N €/m²`); edge price = `PR.edgeMat[name]` or `PR.edge`; `hwPrice(item)` = exact name → name without the ` L=500…`/` W=…` suffix (`hwBase`) → 0 "included" if it matches `CONNECTOR_HW = /konfirmat|confirmat|ekscentrik|minifix|kaišč|dowel|varžt|laikikl/i` (covered by "fasteners €/m²") → else 0 and a "missing" note `furnitūra „X“ — kaina nenurodyta`.

Direct cost:

1. Every panel of `r.panels`: kind `facade` if role ∈ `FASADAS | DURYS | PLOKSTE`, `back` if role `PLAUSAS` or material matches `/HDF/i`, else `carc`; area `L·W/1e6` × material price; material name = `p.mat` or the cabinet's material of that kind. Backs (`PLAUSAS`/HDF and role `NUGARA`) are left out of `basisM2` (the m² that overheads follow).
2. Cutting: `2(L+W)/1000` m × `PR.cut` per panel.
3. Edge banding: for each banded edge (`p.eb.y0/y1` → `L`, `x0/x1` → `W`) length × edge price.
4. Extra parts (`c.extras` with L, W > 0 and qty ≠ 0): area × qty, kind `facade` when `x.mat === c.mat.facade` else `carc`, in the basis; cutting; edges `e1,e2` → L, `e3,e4` → W.
5. Worktop (`E.worktopOf(c)`): kind `top`, not in the basis; cutting; edge on the front plus each end that overhangs (`left`/`right` > 0). (Per cabinet — joined worktop pieces are not considered.)
6. Drawer boxes not already present as panels (i.e. not ball-bearing / undermount / MERIVOBOX-with-box runners): `offerDrawerBox(openIn, frontH + 3, hw, rail)` (2010–2018) — the offer app's formulas for MERIVOBOX, TANDEMBOX or a wooden box → m², cut perimeter, banded length; cost = m² × carcass price + perimeter × cut + band × `PR.edge`; added to the basis. (Their metres are added to `cutM`/`edgeM` but their € only to `drawers.cost`, so "Cutting N m" × rate ≠ the € shown beside it.)
7. Fittings: `r.hardware[]` `{ item, qty, unit }` × price.

`offerDrawerBox(openIn, fh, hw, rail)` exactly (2010–2018; `cl` = clamp, `rail` defaults to 500, all mm):

| Runner (`hw` matches) | Board pieces | m² | cut perimeter | banded length |
|---|---|---|---|---|
| `/MERIVOBOX/i` | base `bw × bd` + back `bw × sh`, with `bw = max(120, openIn − 51)`, `sh = cl(fh − 60, 60, 184)`, `bd = max(150, rail − 26)` | `(bw·bd + bw·sh)/1e6` | `2(bw + bd) + 2(bw + sh)` | `bw` |
| `/TANDEMBOX/i` | bottom `bw × boxD` + back `bw × sh`, with `bw = max(120, openIn − 84)`, `sh = cl(fh − 60, 70, 224)`, `boxD = max(150, rail − 10)` | `(bw·boxD + bw·sh)/1e6` | `2(bw + boxD) + 2(bw + sh)` | 0 |
| anything else (wooden box) | 2 sides `boxD × sh`, front + back `bw × sh`, bottom `bw × (boxD − 2)`, with `bw = max(120, openIn − 26)`, `sh = cl(fh − 50, 70, 200)` | `(2·boxD·sh + 2·bw·sh + bw·(boxD − 2))/1e6` | `4(boxD + sh) + 4(bw + sh) + 2(bw + boxD − 2)` | `2·boxD + 2·bw` |

`openIn` = the clear width between the nearest upright panels left and right of the drawer front's centre at its mid-height (from `DR.pbox` boxes of all placed non-front, non-drawer panels; 2048–2053), falling back to `front width − 2 × thickness`; `fh` = front height + 3. A drawer is skipped when its runner is flagged `ball`, `under`, or `merivo` with a built box (`E.R.runner[hw]`, 2050) because those boxes are real panels already.

Ladder (`q = PR.q`, `m2 = basisM2`, wardrobe when `q.use === 'SPINTA'`):

```
ae         = materials + cutting + edging + drawer boxes
direct     = ae + fittings
overheads  = matMarkup% × direct  +  packing €/m² × m2  +  defects% × direct  +  fasteners €/m² × m2
           + waste% × ae  +  depreciation €/m² × m2  +  design(Kitchen|Wardrobe) €/m² × m2
production = direct + overheads
assembly   = assembly(Kitchen|Wardrobe) €/m² × m2
adminEur   = admin% × production
full       = production + assembly + adminEur
marginEur  = margin% × full ;  offer = full + marginEur
vat        = offer × (q.vat === false ? 0 : pvm%) ;  withVat = offer + vat
```

Returned object: `{ boards:{'name|kind':{name,kind,m2,price,cost,ok}}, m2, mat, cutM, cut, edgeM, edge, hw:[{item,qty,unit,price,cost,incl,ok}], hwCost, drawers:{n,m2,cost}, top?, missing:[], basisM2, ae, direct, over:[[key,€]…], production, assembly, adminEur, full, marginEur, offer, vatRate, vat, withVat }`.

`priceProject()` (2077–2084): per-cabinet results + `inst = pp.montavimas`, `deliv = pp.delivery`; `full = Σfull + inst + deliv`; `offer = Σoffer + (inst + deliv) × (1 + margin%)`; `vat`, `withVat`, `m2`.

Verified live on the example project with default prices: cabinet 1 direct 184,19 → full 324,41 → offer 415,25 → with VAT 502,45; project 783,48 / 1 002,86 / 1 213,46 €.

### 6.5 Price views

* `priceCard(c, inf)` (2089–2104) — `<details class="pricecard">` (open state `S.prOpen`): summary `€ Kaina [admin]  415,25 € be PVM`; body rows: each board group (`name · m² × €/m²`, `*` = default price), cutting m, edge banding m, drawer boxes × n, every fitting (`qty × price` or "į tvirtinimus / in fasteners"; red when unpriced), **Tiesioginė savikaina / Direct cost**, each non-zero overhead (labels `PRL`: Medžiagos antkainis, Pakavimas, Brokas, Tvirtinimai, Medžiagos atlieka, Nusidėvėjimas, Projektavimas), **Gamyba / Production**, Surinkimas, Administracija, **Pilna savikaina / Full cost**, Antkainis N %, **Kaina be PVM**, PVM N %, **KAINA SU PVM**; a "Patikrinkite kainas: / Check prices:" block listing `missing` + button **Kainos → / Prices →** (to Settings); footnote.
* `priceProjectCard()` (2106–2115) — card **€ Kainodara / Pricing [admin]** + **Kainos ir antkainiai → / Prices & margins →**; table `Nr | Spintelė | m² | Tiesioginė € | Savikaina € | Be PVM € | Su PVM €` (a `!` badge with the missing-price list as tooltip); inputs **Montavimas € / Installation €** (`pp.montavimas`) and **Pristatymas € / Delivery €** (`pp.delivery`); totals Savikaina, Pasiūlymas be PVM, Pasiūlymas su PVM.
* Money format `eur()` (1997): 2 decimals, comma, space thousands (`1 002,86`).

### 6.6 Price lists in Settings (unlocked `adminCard`, 2123–2154)

* Buttons: **⤓ Perimti kainas iš pasiūlymų skaičiuoklės / Take prices from the offer app** (`primport`: reads `localStorage['dedesBaldai.calc.v1']` — the offer app on the same origin — through `prFromOffer`), **Iš offer projekto JSON… / From an offer project JSON…** (`<input id="f-prjson" type="file" data-act-change="prjson">`), **Numatytos kainos / Default prices** (`prreset`, two clicks: first click only toasts "Paspauskite dar kartą…", second replaces `PR` with `prDefaults()`).
* Left column "Operacijos ir numatytos kainos": `pr.cut` €/m, `pr.edge` €/m, `pr.def.carc|facade|back|top` €/m²; "Kaštai ir antkainis": `pr.q.use` (Virtuvė/Spinta), `pr.q.matMarkup` %, `packing` €/m², `defects` %, `fasteners` €/m², `waste` %, `depreciation` €/m², `designKitchen`, `designWardrobe`, `assemblyKitchen`, `assemblyWardrobe` €/m², `admin` %, `margin` %, `pvm` %, `pr.q.vat` (Taip/Ne).
* Right column: one row per **material** (`pr.mat.<name>`, placeholder "numatyta/default"), per **edge band** (`pr.edgeMat.<name>`, placeholder = `PR.edge`), per **fitting** (`pr.hw.<name>`, placeholder `?`, or `—` and "(tuščia — į tvirtinimus)" for connectors). The names are the union of the settings lists, names already priced, and everything used in the **open project** (materials incl. drawer, extras, worktop; fittings from the build, by base name).
* `prFromOffer(o)` (2157–2168): `o.rates.cut/edge/hw{}`, `o.materials[] {name, price, disc, unit:'sheet'|…, sL, sW, cat}` → net €/m² per name (sheet price ÷ sheet area, after discount), the cheapest `KARKASAS`/`FASADAS` become `def.carc`/`def.facade`; `o.quote` → the 13 ladder numbers, `projType` → `use`, `country === 'LIETUVA'` → `vat`. Returns the number of values taken (toast "Perimta kainų: n").

---

## 7. Cutting plan — tab "Plokštės / Boards" (`viewNest`, 2278–2297)

Purpose (2189–2193): a quick, immediate estimate of how many boards each material takes and how the parts lie on them; the real nesting, labels and CNC nesting happen in the separate Nesting app.

### 7.1 Inputs

* Parts: `buildProjectAll().parts`, grouped by `(p.mat || '—') + '|' + p.T`; parts whose name/short matches `/STALVIR/i` (worktops) or with L or W ≤ 0 are skipped (`nestPlan`, 2246–2258). Groups sorted by number of rows, descending.
* Board per material (`boardOf`, 2244): `S.settings.boards[mat] = { W, H, grain }` over `nestDefaults()` (2194–2199), which reads the **Nesting app's** own settings from `localStorage['nestDefaults']` (`boardW`, `boardH`, `kerf`, `kerfCnc`, `trim`, `trimCnc`, `machineMode`) and falls back to 2800 × 2070, kerf 4 (CNC) / 3 (saw), trim 15. Kerf and trim cannot be changed in this app.
* The board override is keyed by **material name only** (not thickness).

### 7.2 Algorithm

* `nestMaterial(parts, bd, grain)` (2232–2243): parts are collapsed into types by size; without grain `w = max(L, W)`, `h = min(L, W)` and rotation allowed; with grain `w = L`, `h = W`, no rotation (part length along the board length). Three runs — `'bl'` (bottom-left), `'bssf'` (best short side fit), `'baf'` (best area fit) — fewest boards wins, tie → least area on the last board, tie → the first (bottom-left).
* `nestPack(types, W, H, kerf, trim, how)` (2200–2231): MaxRects; usable area `W − 2·trim + kerf` × `H − 2·trim + kerf`; every part is inflated by the kerf; a type that fits neither way goes to `unplaced` up front; per board, repeatedly place the globally best (part, orientation, free rectangle), split and prune free rectangles; guard of 2000 boards. Returns `{ sheets: [[{ x, y, w, h, rot, t }]], unplaced: [{ t, n }] }` (coordinates include the trim offset, origin bottom-left).
* `nestPlan(pj)` returns per material `{ mat, T, bd:{W,H,kerf,trim,grain}, sheets, unplaced, parts (pieces), area (m² placed), util }`; cached in `NEST_CACHE` by a JSON key of defaults + boards + part sizes.

### 7.3 Screen

* Header **Plokštės ir išdėstymas / Boards and layout**, lead with the kerf and trim in use "(Nesting nustatymai)", button **↗ Atidaryti Nesting programoje / Open in the Nesting app** (`data-act="nestopen"`).
* No parts → "Detalių dar nėra. / No parts yet."
* Summary table: `Medžiaga` (name + thickness) | `Plokštė, mm` — two inputs `data-nestw="<mat>"` × `data-nesth="<mat>"` | `Lapų / Boards` (count, plus a badge `+n netelpa / too big` for unplaced pieces) | `Išnaudota / Used` % | `Detalių / Parts` | `Detalių plotas / Parts area` m² | `Struktūra / Grain` — checkbox `data-nestg="<mat>"` "nesukti / don't turn". Footer: **Iš viso lapų / Boards in all**.
* Change handler (2828–2831): size must be 300–6000 (toast "Plokštės dydis 300–6000 mm", value reverts); writes `S.settings.boards[mat].W|H|grain`, stores the settings, re-renders.
* Per material: heading (`name · T mm · W × H · n lap.`), a warning line **Netelpa į plokštę / Too big for the board: `<short> w×h (n)`** when something is unplaced, then one `nestSheetSvg` per board: caption `k / n`, used %, `n det./pcs`; the board outline, dashed trim line, each part as a coloured rectangle (colour by cabinet number from the 10-colour `NEST_COLS`), label `short` + `w×h` (rotated text for upright parts, size only when small, nothing when tiny), `<title>` tooltip `short · name · w×h ↻`.
* Label sizing in `nestSheetSvg` (2266–2274): a part is "upright" when `h > 1.25 × w`; font size = `min(80, across / 2.7, along / (longest line × 0.58))` in board millimetres; two lines (short name bold + size) only when that is ≥ 34, otherwise the size alone at `min(80, across / 1.4, along / (len × 0.58))`; no text under 22. The size printed is the part type's `w × h` (rounded), not the placed orientation; `↻` appears only in the tooltip. Colours: `NEST_COLS[(cab + 9) % 10]`.
* Parts with an empty material form a group named **—** and get a board of their own (verified live, §3.6).
* Footnote `nestNote`: "A quick estimate: the Nesting app can pack tighter still (groups, offcuts). With "don't turn" the parts' length runs along the board (wood grain). Worktops are not counted."
* Nothing here is exported: no PDF, no print layout, no cut list, no offcut list, not in the ZIP.

### 7.4 Hand-off to the Nesting app — `nestHandoff()` (2299–2308)

1. `window.open('about:blank', '_blank')` synchronously (keeps the pop-up allowed).
2. `xlsmBytes(buildProjectAll())` → the same ReportLists `.xlsx` as the download.
3. `localStorage['dbNestHandoff'] = JSON.stringify({ name: '<proj>_ReportLists_to_Excel.xlsx', b64: <base64 of the file>, at: Date.now() })`.
4. On a storage error (quota): the new window is closed and toast **Projektas per didelis perduoti — atsisiųskite .xlsx ir įkelkite į Nesting / The project is too big to hand over — download the .xlsx and load it into Nesting**.
5. Navigate the new window to the Nesting app on the same origin with `?from=builder`: the current path with `/builder…` replaced by `/nesting/`, else `/nesting/`.

The contract with the Nesting app is therefore: same origin, the `dbNestHandoff` key, the `?from=builder` query, and the workbook layout described in `export.js:4–19` (PARTLIST with "DETALĖ" in column E, LABEL blocks with QR formulas ending in the program id, EDGEBAND, STOCK_CORE, HARDWARE_LIST, SUMMARY; shared strings).

---

## 8. Drawings tab — `viewDrw()` (2309–2326)

* Guards: no `DR` (drawings.js) → card "drawings.js"; no cabinets → **Nėra ką braižyti — pridėkite spintelę. / Nothing to draw — add a cabinet.**
* `drwSheets(only, paper)` (2175–2186): `DR.sheets(S.proj, S._info, { worktops: worktopPieces().pieces, lang, project, date, paper, only, RM })` → list of `{ id, cab (0-based cabinet index or undefined for layout sheets), cont (continuation page), title, svg, error }`. Side effect: `RM.ensure(S.proj)` auto-places cabinets that were never placed in the Furniture tab and **saves the project**. Cached in `DRW_CACHE` by a JSON string of the whole project + settings + language + paper + filter + day. For the filter `'furn'` only sheets without `cab` are kept and their "n / m" page numbers are rewritten.
* Sheets seen on the example (verified live): "Baldų išdėstymas" (furniture layout: plan, 3D, list), "Sienos vaizdas A" (wall elevation), then "Spintelė N „name“" per cabinet (dimensioned views + exploded assembly diagram + parts and hardware lists + title block).
* Head card: title **Brėžiniai / Drawings · n lapai/sheets**, lead `drwLead`, controls:
  * **Rodyti / Show** `<select id="drw-only" data-act-change="drwonly">`: `all` Visi lapai/All sheets · `furn` Tik baldų išdėstymas/Furniture layout only (only when something is placed) · `c:<cabinet id>` "N · name" for every cabinet (by id, so deleting/reordering never points at another cabinet; `drwOnlyFix` falls back to `all`);
  * **Popierius / Paper** buttons **A3** / **A4** (`data-act="drwpaper" data-v`), persisted in `dbKurejas.paper`;
  * **⤓ Atsisiųsti PDF (n lap.) / Download PDF (n sheets)** (`drwpdf`, disabled when the list is empty) → `savePdf(list, '<proj>_brezinai[_baldai | _<cabinet nr>].pdf')`;
  * note: "PDF su visais brėžiniais įdedamas ir į „Viskas ZIP“ / The PDF with all drawings also goes into the full ZIP."
* Grid of cards: thumbnail button (`drwopen`, `data-i`) showing the SVG as an `<img>` data URI (`thumbSrc`), caption `n · title`, **⤓ PDF** (`drwpdf1`, one sheet → `<proj>_spintele_<n>[_2].pdf` / `cabinet_<n>` in EN, or the safe title for layout sheets).
* Overlay viewer when `S.drwOpen != null`: `.drwover[data-act="drwclose"]` with an inner `.drwbox[data-stop]` (clicks inside do not close), bar `i / n · title`, **‹ Ankstesnis / Previous**, **Kitas › / Next** (`drwnav` ∓1), **⤓ PDF**, **Uždaryti ✕ / Close**; the SVG at full width. Keyboard (2875–2877): Esc closes, ←/→ page. The browser Back button also closes it (HubBack view state, 3211–3226).
* PDF: `drawingsPdf(list, paper)` (2327) → `DR.pdf(list, { paper, title, progress })` rasterises every SVG (2800 px wide) into an image-only PDF (`drawings.js:1246`), toast **Ruošiamas PDF… i / n**, then **PDF paruoštas / PDF ready** or **Nepavyko sudaryti PDF: … / Could not make the PDF**. Not vector, text not selectable.
* Nothing on a sheet can be edited (no notes, no choice of views, no title-block fields, no customer name).

---

## 9. Home screen — `viewHome()` (2546–2568), `ago()` (2537–2545)

Shown when `S.home` or no project is open (header: brand + LT/EN only). Two cards, max-width column (verified live).

### 9.1 Hero "＋ Naujas projektas / New project"

* Lead: "Įrašykite pavadinimą — jis bus CNC programų ir sąrašo failų pavadinimuose. Toliau pasirinksite pirmą spintelę. / Type a name — it goes into the CNC program and list file names. Next you pick the first cabinet."
* Input `#np-name` (label **Projekto pavadinimas**, placeholder `pvz. VIRTUVE_JONAITIS`), value kept in `S.npName`; Enter = create.
* **Sukurti projektą → / Create project →** (`pcreate`, 3075–3077): empty name → toast **Įrašykite projekto pavadinimą**, field focused with `aria-invalid`; otherwise `newProject(name)` (666: `{ app:'db-kurejas', v:1, id, name, cabinets:[], updated }`, opened on the Cabinets tab with the cabinet-type picker because it has no cabinets) and toast "Sukurtas projektas {n}". No duplicate-name check, no customer/address/date fields.
* "arba / or": **⤒ Įkelti iš pasiūlymo programos (.json) / Import from the offer app (.json)** (`pimport` clicks the hidden `<input id="f-import" type="file" accept=".json" data-act-change="import">` → `importFile`, 3101–3116: accepts this app's own project JSON (`app === 'db-kurejas'`) **or** an offer-app export (`fromOffer`, 3117–3136); a clashing id gets a new id so importing twice makes two projects; opens it; toast "Įkelta spintelių: n"; any failure → "Nepavyko perskaityti failo — tai ne projekto JSON.") and **Atidaryti pavyzdį / Open the example** (`psample`: `sample()` 477–484 — project `PAVYZDYS` with three cabinets and example materials; every click adds another `PAVYZDYS` to the list).

### 9.2 "Projektai / Projects" list

* Source: `lib()` = `localStorage['dbKurejas.lib']`, array of `{ id, name, updated (ISO), n (cabinet count), data (the whole project) }` (`libRec`, 498). The open project is written to the front of the list 250 ms after each `save()` (`libSave`), so the order is "most recently saved first". Counter badge = total number.
* Search field `#home-q` (**Ieškoti projekto… / Search projects…**) appears only when there are **more than 5** projects; case-insensitive substring of the name; re-renders on every keystroke (caret restored).
* Row (`.prow`, `.cur` for the open one):
  * main button (`popen`, `data-v` = id): name (or **(be pavadinimo) / (no name)**), badge **atidarytas / open** on the current one, sub-line `n spint./cab. · keista/changed <ago>`;
  * **Kopija / Copy** (`pdup`): clone with a new id, name + ` (kopija)`, `updated` = now, put first in the list; toast "Kopija sukurta"; it is **not opened**;
  * **🕘 Versijos / Versions** (`pver` → `verOpen(id)`: the version-history dialog, lines 542–646, outside this slice);
  * **.json** (`pjson`): downloads `rec.data` as `<safeName(name) or PROJEKTAS>_projektas.json` — the backup / move-to-another-computer route (includes `pricing`);
  * **Ištrinti / Delete** (`pdel`, red): first click turns the label into **Tikrai ištrinti? / Really delete?** (`S.confirm = 'pdel' + id`; any other click cancels), second click removes the record; if it was the open project `S.proj = null` and `dbKurejas.current` is removed; toast "Projektas ištrintas". **No undo**, the version history is not consulted;
  * **Atverti / Open** (primary, `popen`): flushes the pending save and the version snapshot of the project being left, then `openProject(rec.data)` (658–665: normalises cabinets, sanitises `look`, resets the UI to the Cabinets tab, first cabinet).
* Empty states: "Projektų dar nėra — sukurkite pirmą viršuje." / "Nieko nerasta."
* Hint: "Projektai išsaugomi automatiškai šioje naršyklėje, o prisijungus — ir debesyje … Atsarginei kopijai ar perkelti į kitą kompiuterį — „.json“."
* `ago(iso)`: `< 1 min` **ką tik / just now**; `< 60 min` **prieš {n} min. / {n} min ago**; same calendar day **šiandien HH:MM / today HH:MM**; else `YYYY-MM-DD HH:MM`.
* Not present: thumbnails, status (ready / has errors), sort options, folders/customers, bulk backup of all projects, restore-all, archive.

---

## 10. Catalogue of hooks

### 10.1 `data-act` (click, dispatched in the `app` click listener, 2891–3088; almost every case ends in a full `render()`)

| `data-act` | Extra attrs | Rendered at | Handler line | Effect |
|---|---|---|---|---|
| `tab` | `data-v` = `res` / `set` (and the tab bar) | 1971, 2102, 2111, header | 2897 | `S.tab = v`, scroll top |
| `rrcab` | – | 1968 | 2925 | realistic picture of this cabinet (`DBRender.open`) |
| `drwcab` | – | 1971 | 2952 | Drawings tab filtered to the current cabinet |
| `set` | `data-bind`, `data-v` | `seg()` 947: `pr.q.use`, `pr.q.vat`, `s.ops.tbFront`, `s.ops.hingeFix`, `s.ops.pins` | 2907 | `assign` + `after(bind, true)` |
| `adminset` / `adminunlock` / `adminlock` | – | 2122, 2119 | 2933 / 2937 / 2940 | §6.1 |
| `adminpin` / `adminpinsave` / `adminpincancel` | – | 2119, 2139 | 2941 / 2943 / 2942 | §6.1 |
| `primport` / `prreset` | – | 2141 | 2947 / 2950 | §6.6 |
| `nestopen` | – | 2281 | 2917 | `nestHandoff()` |
| `drwpaper` | `data-v` A3/A4 | 2316 | 2953 | paper + persist |
| `drwpdf` / `drwpdf1` | – / `data-i` | 2317 / 2320, 2323 | 2957 / 2958 | PDF of the list / of one sheet |
| `drwopen` / `drwclose` / `drwnav` | `data-i` / – / `data-v` ±1 | 2319 / 2323 / 2323 | 2954–2956 | overlay viewer |
| `dl` | `data-v` zip / xlsm / csv | 2344–2346 | 3057 | `download(v)` |
| `dlall` | – | 2345, 2366 | 3061 | all `.XXL` separately |
| `dlcab` | `data-v` cabinet nr | 2369 | 3060 | that cabinet's `.XXL` |
| `dlprog` | `data-v` file name | 2357, 2371, 2431 | 3058 | one `.XXL` (`stopPropagation`) |
| `dlpart` | `data-v` part name | 2432 | 3059 | all programs of the part |
| `print` | – | 2346 | 3063 | `window.print()` |
| `part` | `data-v` part name (on `<tr>`) | 2355 | 3044 | select part, `S.ptab = 0`, set `S.partRef` |
| `ptab` | `data-v` index | 2426 | 3045 | program tab |
| `copy` | – | 2431 | 3055 | copy program text |
| `ebtog` | `data-v` y0/y1/x0/x1 | 2411 | 3046 | toggle edge band |
| `ebfac` | (checkbox) | 2414 | 3046 | "visible part" toggle |
| `ebreset` | – | 2413 | 3046 | drop the override |
| `fixname` | – | 2379 | 3073 | focus `#projname` |
| `fixcab` | `data-i` cabinet index, `data-v` mats / wt | 2385, 2387, 2388 | 3072 | §3.2 |
| `resetrules` | – | 2524 | 3064 | hinge + pins to defaults, undo toast |
| `tplreset` | – | 2528 | 3062 | built-in template again |
| `pcreate` / `pimport` / `psample` | – | 2551–2552 | 3075 / 3078 / 3079 | §9.1 |
| `popen` / `pdup` / `pver` / `pjson` / `pdel` | `data-v` project id | 2558–2564 | 3084 / 3080 / 3085 / 3082 / 3086 | §9.2 |
| `home`, `pnew`, `lang` | – | header | 3074 / 3083 / 2898 | go home / go home and focus the name / language |

### 10.2 `data-act-change` (change listener, 2818–2836)

| Value | Element | Effect |
|---|---|---|
| `prjson` | `#f-prjson` file | `prFromOffer(JSON)` (admin only) |
| `drwonly` | `#drw-only` select | `S.drwOnly = value`, close overlay |
| `tpl` | `#f-tpl` file | `loadTemplateFile` |
| `import` | `#f-import` file | `importFile` |

### 10.3 `data-bind` paths in this slice

* Project: `p.name` (header); `pp.montavimas`, `pp.delivery` (→ `S.proj.pricing`).
* Prices: `pr.cut`, `pr.edge`, `pr.def.{carc,facade,back,top}`, `pr.q.{use,vat,matMarkup,packing,defects,fasteners,waste,depreciation,designKitchen,designWardrobe,assemblyKitchen,assemblyWardrobe,admin,margin,pvm}`, `pr.mat.<name>`, `pr.edgeMat.<name>`, `pr.hw.<name>` (dots in names as U+2024).
* Settings: `s.types.<PASTATOMOS|PAKABINAMOS|ŪKINĖ>.{joinery,top,back,backFix,railFront,railBack,railBottom,topOverFacade,legs}`; `s.ops.{runnerMarks,tbFront,hinges,hingeFix,pins}`; `s.railW`; `s.rules.drillsTop`; `s.rules.tbHole.{d,depth}`; `s.rules.hinge.{cupFromEdge,cupDepth,fromEnd,plateFromFront,plateSpacing}`; `s.rules.pins.{fromFront,fromBack,below,depth,pitch}`; `s.rules.ball.{front,rear,midFrom,up,clear,boxBelow,topGap,boxT,perLen,drawerMarks}`; `s.rules.under.{marks,up,clearBelow,recess,shorter,ded,topGap,depthPlus,boxT,perLen}`; `s.rules.merivo.{marks,up,below,ded,shorter,topGap,depthPlus,perLen}`; `s.materials`, `s.edges`, `s.worktops` (with `data-lines`).

### 10.4 Other data attributes and conventions

* `data-num="1"` numeric field (accepts decimal comma and simple maths like `600-18`, `numOrNull` 2777); `data-empty="1"` may be left empty (prices); `data-lines="1"` textarea → array of lines; `data-prev` set on focus (value to fall back to).
* `data-nestw` / `data-nesth` / `data-nestg` = material name (board length, width, grain checkbox).
* `data-stop="1"` inner box of an overlay (click does not close); `data-i` index; `data-v` value.
* Enter in a text input moves to the next text input (2879–2882); Ctrl/Cmd+Z undoes joints (Cabinets tab) or furniture moves (Furniture tab) only.
* `S.confirm` two-click pattern for destructive actions; `toast(msg, isError, actionLabel, actionFn)` (3092) — 2.6 s, or 6 s with an action button.

### 10.5 DOM ids in this slice

`projname`, `saved`, `pricecard-wrap`, `sketch`, `warns`, `adm-pin`, `adm-pin2`, `adm-npin`, `adm-npin2`, `f-prjson`, `drw-only`, `proglist`, `progtext`, `nb-<i>`, `f-s-<TYPE>-<key>`, `f-s-r-<grp>-<key>`, `f-s-railW`, `f-s-drills`, `f-s-tbd`, `f-s-tbz`, `f-s-ball-<k>`, `f-s-under-<k>`, `f-s-merivo-<k>`, `f-tpl`, `f-s-materials`, `f-s-edges`, `f-s-worktops`, `np-name`, `f-import`, `home-q`, `toast`.

### 10.6 Storage keys

| Key | Store | Content |
|---|---|---|
| `dbKurejas.current` | localStorage | the open project |
| `dbKurejas.lib` | localStorage | `[ { id, name, updated, n, data } ]` |
| `dbKurejas.ui` | localStorage | `{ id, tab, sel }` |
| `dbKurejas.settings` | localStorage | `S.settings` (incl. `boards`) |
| `dbKurejas.lang`, `dbKurejas.paper` | localStorage | `'lt'|'en'`, `'A3'|'A4'` |
| `dbKurejas.reportTpl` | localStorage | `{ name, b64 }` |
| `dbKurejas.pricing` | localStorage | `PR` |
| `dbKurejas.adminPin` | localStorage | PIN hash |
| `dbKurejas.admin` | sessionStorage | PIN hash while unlocked |
| `dbKurejas.cablib` | localStorage | cabinet library (other slice) |
| `nestDefaults` | localStorage (read only) | the Nesting app's board/kerf/trim |
| `dbNestHandoff` | localStorage (write) | `{ name, b64, at }` |
| `dedesBaldai.calc.v1` | localStorage (read only) | the offer app's data (prices) |

Version history is in IndexedDB (`VER`, other slice). A failed write → `saveFailed()` (336): the chip turns "✕ neišsaugota" and one toast tells the user to download the JSON.

---

## 11. Data shapes a redesign must keep

`buildProjectAll()` → `{ project, date, parts[], files[], warnings[], hardware[] }` (`export.js:27–88`):

```
part (from a cabinet):  { name, short, cab, role, mat, L, W, T, qty:1,
                          eb:{ eb1, eb2, eb3, eb4 }        // edge material names or '' ; eb1=y0 eb2=y1 (long), eb3=x0 eb4=x1 (short)
                          ebFac: null | { eb1..eb4: bool },
                          op1, op2,                          // ids of the first two programs
                          progs:[ { id, kind:'main'|'rot', file } ],
                          src:'cab', pic:{ holes[], edges[] }, ebLen }
part (loose):           { name, short, cab, role:'', mat (or 'BE MEDŽIAGOS'), L, W, T, qty, eb, op1:'', op2:'', progs:[], src:'loose', ebLen }
file:                   { name:'<part name>_<n>OP.XXL', text }
hardware:               { item, unit, qty, cabs:[nr…] }
warnings:               [ 'Spintelė N „name“: <Lithuanian text>' … ]   // strings only
```

Engine panel (`S._info[i].r.panels[]`, verified live): `{ name, role, key, cab, short, L, W, T, mat, note, eb:{y0,y1,x0,x1}, ebFac?, ebManual?, holes[], edges[], grooves?, warnings[], place:{o,u,v,n}, mirrored?, drawerOf? }`; cabinet build result `r` keys: `panels, warnings, hardware, legs, joints, seams, visual, shelfInfo, dims, fgaps, worktop`.

Naming: part name `<projName>_<cabinet nr>_<cabinet name>_<ROLE><n>`; short `<nr>-<ROLE><n>`; program id `<part name>_<n>OP`; these ids are what the label QR codes carry and what the Nesting app links on.

---

## 12. Bugs and UX problems visible from the code

### 12.1 Bugs (verified live)

1. **Worktop "Fix" link does nothing useful** (3072): it focuses `#f-c-worktop-mat`, which is inside a hidden step card unless the "construction" step is already open — the user is dropped on the cabinet tab with no focus and no hint.
2. **Cutting-plan labels are wrong for same-sized parts**: `nestPack` computes the individual part `p` for each placement (2216) but drops it when the board is stored (2228), so `nestSheetSvg` falls back to `q.t.ref[0]` (2266). On the example, four 702 × 560 sides (1-KAIRE, 1-DESINE, 2-KAIRE, 2-DESINE) are all drawn as "1-KAIRE", both bottoms as "1-DUGNAS", three fronts as "1-FASADAS1"; the colour (by cabinet) is wrong the same way.
3. The Boards tab is not restored after a reload (`nest` missing from the allowed tab list, 494).
4. In the price card, drawer-box metres are added to the "Cutting / Edge banding N m" figures but their cost is not, so the row's metres × rate does not equal the € beside it (2056–2057).

### 12.2 Mistake-prevention gaps

5. **The ready-check never blocks anything.** ZIP, .XXL, xlsx, CSV, PDF and the Nesting hand-off all work with a red checklist; a cabinet with a hard error is silently left out of the export.
6. The checklist is only on the Parts & CNC tab — not next to the Nesting hand-off, the Drawings PDF, or the per-cabinet editor — and the ZIP button sits **above** it.
7. Severity is guessed by regex over Lithuanian sentences (`level`), translation by phrase replacement (`wTxt`); a reworded warning silently changes severity. There are no codes, no link from a warning to the cabinet / part / field, and the "errors" line of the checklist has no Fix button ("see below").
8. Fix links open only the first offending cabinet; the rest are numbers in a sentence.
9. Not checked at all: front edging, back material, unverified-rule notes, unconfirmed joint/edge checks, furniture overlaps, parts too big for a board, unpriced items, the xlsx fallback to a plain workbook (announced only by a 2.6 s toast).
10. "Ready for CNC" (green) is shown while a yellow `!` line is in the same card; the real "check" notes are at the bottom of a long page under the hardware list.
11. Global rules (`S.settings.rules`) change the drilling of **every existing project** immediately and are not saved with the project; four settings cards are permanently badged "unverified" and every project carries the matching "NEPATIKRINTA" notes, which trains the user to ignore the notes list.
12. Type/operation defaults apply to new cabinets only — nothing says so on the card, and there is no "apply to existing cabinets".
13. Edge overrides are keyed by part name (`c.ebEdit[key]`); they can go stale silently when parts are renumbered, and there is no overview of which parts carry manual overrides (only a ↺ button on the part itself).
14. Deleting a project is a two-click button with no undo; "Open the example" adds a new PAVYZDYS every time; an imported project can have an empty name.
15. Materials are free text: a typo creates a new material (a new group in the part list, a new board in the cutting plan, a missing price). Board size and grain are per material name in a different tab than the material list; kerf and trim come from another app's storage and cannot be seen or changed in Settings.
15a. **Silent material fallbacks in the engine make the checklist the only safety net**: no front material → fronts are made from the carcass board (`engine.js:322`, `1581`); no back material → carcass board; no carcass edging → edges named `KRAŠTAS` (`engine.js:323`); no carcass material → parts with an empty material, shown as "be medžiagos" in the list and as a board called "—" in the cutting plan. None of these raises an engine warning, the checklist words front and carcass alike ("No material — cabinets 1, 2"), and none stops an export (§3.6).
15b. A cabinet with a hard error disappears from the part list, the program list, the cutting plan and the exports while the "cabinets" stat still counts it; only the red line under the checklist says why.
15c. The ZIP note under the download buttons (`zipNote`) lists the .XXL files, the .xlsx, the .csv and the project file but not the drawings PDF or `_pastabos.txt`, which are in the ZIP too.
16. The PIN "lock" hides prices only; any visitor can set the first PIN; a forgotten PIN cannot be reset from the UI; prices are per browser, so two computers quote differently.

### 12.3 Usability / structure

17. The results page is one very long scroll: stats → checklist → (pricing) → errors → table → a second full list of the same programs → hardware → notes. The program list duplicates the table's last column. With many cabinets the part panel (sticky, right) and the row it belongs to drift apart; on narrow screens it is below everything.
18. The part table has no search, filter, sort or grouping choice (cannot view "cabinet 3 only" or "parts without CNC"); "Parts" counts rows while "Boards" in the plan counts pieces; the on-screen Nr differs from the CSV Nr.
19. Three near-identical download concepts with unclear names: "Everything (ZIP)", "All .XXL separately" (fires n browser downloads and a permission prompt), "List .xlsx" (internally `xlsm`). The project JSON can only be downloaded from the home screen. The drawings PDF is in the ZIP always as A3 regardless of the paper chosen.
20. The part view shows no material, no hole list/coordinates, and always draws the first program's orientation even on the 2OP tab; the raw XXL text takes most of the panel.
21. The only per-part edit (edge bands) is on the results tab, while the cabinet editor has a separate edge-check modal doing the same thing with a third state (`'fac'` per edge) — two UIs, one data field.
22. Settings is a flat wall of 82 bound controls in ten cards with long paragraphs of catalogue text; pricing (admin) is the first card of the same page; cards differ in reset behaviour (only hinge/pins have a reset; price reset is two-click; others none). No export/import of settings, so a second workstation must be configured by hand.
23. The pricing lists show materials/fittings of the currently open project only (plus the settings lists) — prices for anything else cannot be entered ahead of time except via the offer-app import.
24. The cutting plan cannot be printed or exported and is explicitly "an estimate"; the real nesting needs a second app in a new browser tab, handed over through `localStorage` (quota-limited, same origin only).
25. Drawings are raster PDFs built in the browser (slow, with a progress toast per page), sheets cannot be annotated, and opening the tab can silently auto-place cabinets and save the project.
26. Performance pattern: every render rebuilds all cabinets, the results tab builds the project twice, each download builds it again, the drawings cache key is a `JSON.stringify` of the whole project and settings (including embedded texture photos).
27. Home screen: search appears only above five projects, no sort, no status/thumbnail per project, "Copy" does not open the copy, row actions are five similar ghost buttons.
28. Mixed-language strings: many labels are inline `S.lang === 'lt' ? … : …` ternaries instead of `t()` keys (all of pricing/admin, the three runner cards, parts of the results view), so the text table is not the single source of UI text.
