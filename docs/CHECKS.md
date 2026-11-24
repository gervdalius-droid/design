# builder2 — the checks

`src/ui/10-checks.js` · `nvComputeIssues(proj, info)` → the issue list of docs/ARCHITECTURE.md "Issues".
Test: `python3 test/ui/checks_test.py` (private build `scratch/checks/index.html`; also runs against the full build).

It runs on every render and on every keystroke, so it only **reads**: the project record and `info[i] = { r, warnings, nProg }`
that the core has already built. No engine build, no `buildProjectAll()`, no save, no layout repair (`RM.ensure` is never
called — `worktopPieces()` was left out for that reason, the worktop length is worked out from `E.worktopOf` + `RM.placed`).
Measured: **0.2 ms** for 20 clean cabinets, 0.3 ms with 176 issues (limit 5 ms).

Every rule is wrapped. A rule that cannot read a cabinet does not pass in silence: the cabinet gets `cab.broken` (error)
and `window.__nvc.errors()` lists what threw.

## Severities

| sev | meaning | production |
|---|---|---|
| `error` | a part would be wrong, missing or not machined | locked |
| `todo` | a confirmation of the live app is still open (joints, edges) | locked |
| `warn` | unusual, may be on purpose | must be acknowledged (per cabinet with "Patvirtinu", or all at export — `nvcSig`) |
| `info` | a note: standing reminders, automatic corrections that need no decision | – |

The severity of every own rule is one table in the code (`NVC_SEV`), the limits another (`NVC_LIM`).

## Own rules (the live app has none of these)

`field` is the id of the input the editor flashes (`'f-' + bind` with dots as dashes). "Fix" = the one-click way out the
issue carries in `act` (`data-nv="nvcfix"`, or a live `data-act`); every fix is one undo step.

### Project (`cab: -1`)

| id | sev | fires when | message (LT) | fixed in | fix |
|---|---|---|---|---|---|
| `proj.name` | error | project name empty or only spaces | Neįrašytas projekto pavadinimas | header field `#projname` | `fixname` (focus the field) |
| `proj.name.ascii` | warn | the name has no letter or digit usable in a file name (`E.safeName`) | Pavadinime nėra raidžių ar skaičių, tinkamų failams — programos vadinsis „PROJEKTAS_…“ | `#projname` | `fixname` |
| `proj.dupname` | warn | another saved project has the same file name (library read at most every 8 s) | Kitas projektas irgi vadinasi „X“ — CNC programų failai vadinsis vienodai | `#projname` | `fixname` |
| `proj.empty` | error | no cabinets | Projekte dar nėra spintelių | stage `cab` | `nvcfix pick` (opens the chooser) |
| `proj.prefix` | error | two cabinets whose parts get the same file prefix (cannot happen while the cabinet number is in the name — a guard for imports) | Spintelių 1 ir 2 failai vadintųsi vienodai („…“) | `f-c-name` | – |
| `mat.near` | warn | one material written two ways (only capitals / spaces differ) anywhere in the project | Ta pati medžiaga užrašyta skirtingai: „…“ ir „…“ — sąraše tai bus atskiros plokštės | Medžiagos | – |
| `wt.long` | warn | a worktop piece (cabinets standing in a row in the layout are joined, as `worktopPieces()` does) longer than 4100 | Stalviršis 5100 mm (spintelės 1, 2) ilgesnis už 4100 mm plokštę | Priedai | – |
| `room.<kind>` | warn | every problem of `RM.problems(proj)` (out, ceil, floor, hit, opout, opceil, ophit, opblock, opswing, ptout, pthit, ptside, ptwt), with the live texts; only when a layout exists; at most 30 | live `rmProb…` texts | stage `room` (`tab:'room'`) | – |

### Sizes — topic `size`

| id | sev | fires when | message (LT) | field | fix |
|---|---|---|---|---|---|
| `size.W` / `size.H` / `size.D` | error | empty · not a number · ≤ 0 · below what the engine can build (W, H < 2·t + 60; D < 100). Loose board: thickness 3–100, H and D ≥ 30. 3-D construction: > 0 | Neįrašytas plotis · Plotis turi būti skaičius, didesnis už 0 (įrašyta „abc“) · Plotis 60 mm per mažas — korpusui reikia bent 96 mm | `f-c-W` `f-c-H` `f-c-D` | – |
| `size.dishWidth` | error | dishwasher front: width empty / not a number / < 50 | Neįrašytas indaplovės plotis | `f-c-dishWidth` | – |
| `size.W.odd` | warn | W < 150, or W > 1200 with no partition | Plotis 1300 mm be pertvaros — dugnas ir lentynos links | `f-c-W` | – |
| `size.H.odd` | warn | outside the usual height of its type: base 400–1000, wall 200–1400, tall 1000–2700 | Pastatoma spintelė 1500 mm aukščio — įprasta 400–1000 mm | `f-c-H` | – |
| `size.D.odd` | warn | D < 200, or D > 700 (wall cabinet > 600) | Gylis tik 150 mm — neįprastai sekli spintelė | `f-c-D` | – |
| `size.dishWidth.odd` | warn | dishwasher width not 440–460 or 590–610 | Indaplovės plotis 520 mm — įprasta 450 arba 600 | `f-c-dishWidth` | – |
| `thick.none` | warn | board thickness empty or 0 (silently cut as 18) | Plokštės storis neįrašytas — skaičiuojama 18 mm | `f-c-thick` | – |
| `thick.thin` | error | board thickness < 12 | Korpuso plokštė 8 mm per plona — jungčių skylės jos krašte netelpa (bent 12 mm) | `f-c-thick` | – |
| `thick.odd` | warn | board thickness outside 15–30 | Korpuso plokštė 40 mm — neįprastas storis | `f-c-thick` | – |
| `front.thick` | warn | fronts exist and their thickness is empty or outside 16–25 | Fasadai 3 mm — neįprastas storis | `f-c-cnc-facadeT` | – |
| `cab.noparts` | error | the engine built the cabinet but it has no parts, and nothing else explains it | Iš šios spintelės nepagaminama nė viena detalė | – | – |
| `cab.broken` | error | the sections are not readable (not a list, an entry is not a section) — or any rule threw on this cabinet | Spintelės sekcijų duomenys sugadinti — jų patikrinti nepavyko | – (topic `inside` / none) | – |
| `part.big` | error | an engine part or an extra part does not fit the workshop board less its trim (`nestDefaults()`, per-material board and grain from Settings → boards) | Detalė 2-KAIRE 2882×560 netelpa į plokštę 2800×2070 mm | – | – |
| `part.small` | warn | a part with a side under 50 mm | Labai maža detalė: 2-JUOSTA-PRIEKIS 564×45 mm — staklės jos gali neišlaikyti | – | – |
| `part.round` | info | a part size with more than one decimal (236.333) | Matmenys su trupmena: … (sąraše apvalinama iki 0,1 mm) | – | – |

### Inside — topic `inside` (skipped while a size error is open: the numbers would mean nothing)

| id | sev | fires when | message (LT) | field · sec/col | fix |
|---|---|---|---|---|---|
| `col.fit` | error | stored `c.colW` differs from what `colWidths(c)` really cuts (a width < 50, or the last column would get < 50 → equal columns) | Įrašyti kolonų pločiai (900 mm) netelpa į 600 mm spintelę — detalės pjaunamos lygiomis kolonomis po 300 mm | `f-c-colW-0` · col 0 | `nvcfix colseq` (keep equal columns) |
| `col.count` | warn | `c.cols` > 3 (silently clamped) | Įrašytos 5 kolonos — gaminamos daugiausia 3 | – | – |
| `sec.none` | error | a column (or the whole cabinet) has no section | Dešinė kolona tuščia — joje nėra nė vienos sekcijos | col | – |
| `sec.kind` | error | a section of an unknown kind (silently makes nothing) | Sekcija 1 nežinomo tipo („…“) — iš jos nieko nepagaminama | sec, col | – |
| `sec.over` | error | `zoneInfo(c, col).over` | Sekcijos 900 mm netelpa į 718 mm fasadų zoną — per daug 182 mm | height of the tallest fixed section · sec, col | – |
| `sec.gap` | warn | no section takes the remaining height and more than 1 mm of the zone is left | Viršuje lieka 318 mm be fasado — nė viena sekcija neužima likusio aukščio | sec (last), col | – |
| `drawer.low` | error (TANDEMBOX) / warn (other runners) | lowest drawer front under 98.5 mm (TANDEMBOX fixing) / 70 mm | Sekcija 1: stalčiaus fasadas tik 56,8 mm — per žemas TANDEMBOX tvirtinimui (reikia bent 99 mm) | `…sections-k-nDrawers` | `nvcfix ndrawers:k:n` (keep as many as fit; not offered when front heights are typed) |
| `drawer.high` | warn | a drawer front over 800 mm | Sekcija 1: stalčiaus fasadas 895 mm aukščio — per aukštas stalčiui | `…-height` (or `…-nDrawers` when the section fills) | – |
| `drawer.narrow` | warn | a drawer front under 200 mm wide | Sekcija 1: stalčiaus fasadas tik 174 mm pločio — per siaura stalčiui su bėgeliais | sec, col | – |
| `drawer.rail` | error | TANDEM / TANDEMBOX / unknown runners: `rail + 3` > inside depth of the column (side depth less an inside back / standing rail). The engine checks this only for ball, undermount and MERIVOBOX runners | Sekcija 1: 650 mm bėgelis netelpa — vidinis gylis 560 mm, reikia 653 | `…-rail` | `nvcfix rail:k:len` (longest that fits) |
| `drawer.raillen` | warn | a runner length that is not made for this runner (`railLengths(hw)`) | Sekcija 1: 333 mm bėgelių „BLUM TANDEMBOX“ nėra | `…-rail` | – |
| `door.wide` | warn | a hinged door wider than 600 | Sekcija 1: durys 1194 mm pločio — per plačios lankstams (iki 600 mm) | `…-nDoors` | – |
| `door.narrow` | warn | a hinged door narrower than 110 | Sekcija 1: durys tik 96 mm pločio | `…-nDoors` | – |
| `door.tall` | warn | a hinged door taller than 2400 | Sekcija 1: durys 2515 mm aukščio — tokios aukštos durys išsikraipo | sec, col | – |
| `door.hinges` | warn | hinges set by hand (`hingeN` ≥ 2) fewer than `E.hingesPerDoor(height)` | Sekcija 1: 1815 mm durims reikia 4 lankstų, nurodyta 2 | `…-hingeN` | `nvcfix hingen:k` (count by height) |
| `shelf.span` | warn | a shelf longer than 900 with nothing under it (not repeated when `size.W.odd` already says the cabinet is too wide) | Lentyna 1162 mm be atramos — įlinks (iki 900 mm) | – | – |
| `shelf.dense` | warn | 2+ shelves leaving less than 60 mm between them | Sekcija 1: 15 lentynų 538 mm aukštyje — tarp jų lieka 16,8 mm | `…-shelves` | – |
| `shelf.set` | warn | shelf setback outside 0–150 or not a number (the engine clamps it without a word) | Lentynų atitraukimas „400“ mm netinka — galima 0–150 mm | `f-c-shelfSb` | – |
| `front.gap` | warn | a typed front gap (left, right, between, top) negative, above 20 or not a number | Fasadų tarpas viršuje „300“ mm — neįprastas (įprasta 2–5 mm) | `f-fg-top` (the live gap fields' own ids) | – |

"Too many drawers", "door too low for hinges", "shelves do not fit", "column too narrow" come from the engine
(`eng.drawersMany`, `eng.hingeLow`, `eng.shelfClose`, `eng.colNarrow` …) and are placed on their field by the table below.

### Carcass — topic `body`

| id | sev | fires when | message (LT) | field | fix |
|---|---|---|---|---|---|
| `thick.cam` | error | cam locks used and the board is under 17 mm (bolt hole 15 deep; the engine checks it only in 3-D constructions) | Ekscentrikų skylės 15 mm gylio — 15 mm plokštė per plona | – | `jcroom` (open the joints) |
| `legs.h` | warn | legs on and their height empty (means 100) or outside 50–200 | Kojelės 500 mm — neįprastas aukštis (įprasta 100–150) | `f-c-legH` | – |
| `rail.w` | error | tie rail narrower than 40 (its joint holes fall off it), or two flat rails wider than the depth | Surišimo juostos plotis 5 mm per mažas — jungčių skylės netelpa (bent 40 mm) | `f-c-cnc-railW` | – |
| `rail.w` | warn | tie rail width outside 60–200 | Surišimo juostos plotis 250 mm — neįprastas (dažniausiai 80–120) | `f-c-cnc-railW` | – |

### Materials — topic `mats` (extra parts and worktop: `addons`)

| id | sev | fires when | message (LT) | field | fix |
|---|---|---|---|---|---|
| `mat.carc` | error | carcass (or loose board) material empty | Nenurodyta korpuso medžiaga | `f-c-mat-carc` | – |
| `mat.facade` | error | fronts or visible sides exist and the front material is empty (today it silently becomes the carcass board) | Nenurodyta fasadų medžiaga — fasadai būtų pjaunami iš korpuso plokštės | `f-c-mat-facade` | – |
| `mat.back` | warn | a solid back exists and the back material is empty | Nenurodyta nugaros medžiaga — nugara bus iš korpuso plokštės | `f-c-mat-back` | – |
| `mat.thick` | warn | the thickness written in a material's name (`… 16 mm`, the workbook's `thkFromName` rule) differs from the parts cut from it by more than 0.3 — engine parts, extra parts, worktop | Medžiaga „LMDP balta 16 mm“ — 16 mm, o detalės pjaunamos 18 mm storio | the material's field | – |
| `edge.carc` | error | carcass edge band empty while a part has banded edges (exported under the placeholder „KRAŠTAS“) | Nenurodytas korpuso kraštas — etiketėse būtų „KRAŠTAS“ | `f-c-edge-carc` | – |
| `edge.facade` | error | fronts exist and the front edge band is empty (fronts would get no banding at all) | Nenurodytas fasadų kraštas — fasadai liktų nelaminuoti | `f-c-edge-facade` | – |
| `wt.mat` | error | worktop on, material empty | Nenurodyta stalviršio medžiaga | `f-c-worktop-mat` | – |
| `wt.edge` | warn | worktop with a material and no edge band | Nenurodytas stalviršio kraštas — jo galai ir priekis liks nelaminuoti | `f-c-worktop-edge` | – |
| `wt.thick` | warn | worktop thickness outside 10–80 | Stalviršio storis 380 mm — neįprastas | `f-c-worktop-T` | – |
| `extra.size` | error | an extra part without length or width (it would be left out of the list without a word) | Papildoma detalė „X“ be ilgio — į sąrašą nepatektų | `f-c-extras-k-L` / `-W` | – |
| `extra.qty` | warn | an extra part with quantity 0 | Papildomos detalės „X“ kiekis 0 — ji nebus gaminama | `f-c-extras-k-qty` | – |
| `extra.mat` | error | an extra part with no material of its own and no carcass material | Papildoma detalė „X“ be medžiagos | `f-c-extras-k-mat` | – |
| `extra.edge` | error | an extra part with edges ticked and no edge band (its own, or the cabinet's) | Papildomos detalės „X“ kraštai pažymėti, bet krašto medžiagos nėra | `f-c-extras-k-edgeMat` | – |

### Confirmations — topic `review` (3-D construction: `joints`)

| id | sev | fires when | message (LT) | fix |
|---|---|---|---|---|
| `confirm.joints` | todo | live `jcNeeded(c, r)`: joints exist and `c.jointsOk` is not their current signature | Sujungimai dar nepatvirtinti · Sujungimai pasikeitė — patvirtinkite iš naujo | `act: { act:'jcroom', i }` — opens the joints modal for cabinet `i` from any stage |
| `confirm.edges` | todo | live `ecNeeded(c, r)` | Kraštų laminavimas dar nepatvirtintas · … pasikeitė — patvirtinkite iš naujo | `act: { act:'ecroom', i }` |
| `part.progs` | warn | a part that gets three programs (both faces drilled and an edge bore only the turned program can make) — the label has room for two QR codes | Detalė 2-KAIRE turi 3 programas — etiketėje telpa tik 2 QR kodai | – |

### Topics by kind of cabinet

A loose board has only `size` (+ `review`), a dishwasher front `size` / `mats` / `review`; a 3-D construction uses the
live box steps: `size → dims`, `body → boards`, `inside → inner`, `cnc → joints`, and `fronts` stays `fronts`
(for a normal cabinet `fronts` means `inside`).

## The engine's sentences

`info[i].warnings` are free Lithuanian sentences (docs/map/engine.md §5). `NVC_ENG` recognises each by its fixed words and
gives it an id, a severity, a topic, a field and, where one is known, a hint and a one-click way out. `msg` stays the
live `wTxt(w)` (already bilingual), `raw` the engine's own text. From the sentence itself: `sec` / `col`
("sekcija 2.1", "stalčius 1.2", "durys 594×715" and "fasadas 594×57" matched to the drawn fronts, "bėgelio X L=500",
"kolona 2") — `section · x` in the table means the field `f-c-sections-<sec>-x` of that section.
Unknown text → `eng.other`, severity from the live `level(w)` (bad → error, warn → warn, else info), topic `null`.
More than three sentences of one kind in a cabinet are folded into the third ("… (ir dar 3)").

Decisions:

- **Standing reminders are notes** (`info`): `NEPATIKRINTA su SWOOD modeliu`, `naujos jungtys, dar nepatikrintos…`,
  `patikrinkite pirmą gaminį`, the TANDEMBOX 225.5 hole. They are true for every cabinet and used to bury real problems.
- **`NEPROGRAMUOTA` is an error** — the part leaves the machine unfinished: no such drill (`eng.noDrill`,
  `eng.noEdgeDrill`), Ø5 holes in a long edge (`eng.longEdge`), a part too big for the machine (`eng.tooBig`), holes from
  both faces meeting (`eng.partHolesMeet`). **Not errors**, because the engine says the work is done by hand on purpose:
  `eng.hingesOff` (hinge holes switched off — info), `eng.panelNote` (a loose board is only cut — info), `eng.dishNote`
  (a dishwasher front has no programs — info), `eng.boxThin` (thin board nailed — info). `eng.noThrough` is a warning:
  the hole is still written, with a blind drill.
- **Anything left out is an error** ("praleista", "nepridėta", "nepadarytas"): the result is not what was asked.
- **What the engine corrected itself** is a warning when the person should look (a joint moved, a count reduced), a
  note when nothing is to decide (legs / feet / hinges shifted a little to miss a hole).
- `*` = decided from the numbers: `eng.frontHLast` is a note when the lowest front differs from the typed one by ≤ 2 mm
  (the gaps), `eng.ledMoved` a note when the groove moved ≤ 5 mm.
- An engine line that an own rule says better (with numbers and a field) is dropped when that rule fired — last column.

| id | catalogue | sev | topic | field | fix | hint (LT) |
|---|---|---|---|---|---|---|
| `eng.visSideT` | W-002 | warn | mats | `c.cnc.facadeT` | – | Matomas šonas pjaunamas iš fasadų medžiagos, bet korpuso storio — įsitikinkite, kad tokia plokštė yra. |
| `eng.panelSize` | W-003 | error | size | – | – | – *(dropped when `size` fired)* |
| `eng.edgeNone` | W-003b | error | mats | `c.edge.carc` | – | – *(dropped when `edge.carc` fired)* |
| `eng.panelNote` | W-004 | info | size | – | – | – |
| `eng.sizeZero` | W-005 | error | size | – | – | – *(dropped when `size` fired)* |
| `eng.sizeMin` | W-006 | error | size | – | – | – *(dropped when `size` fired)* |
| `eng.dishNote` | W-006b | info | size | – | – | – |
| `eng.bottomZ` | W-007 | warn | body | `c.cnc.bottomZ` | – | – |
| `eng.colNarrow` | W-010 | error | inside | `c.colW.{k}` | – | Kolonai tarp šono ir pertvaros reikia bent 100 mm — platinkite ją arba mažinkite pertvarų skaičių. |
| `eng.bottomD` | W-011 | warn | body | `c.cnc.bottomD` | – | Ištrinkite dugno gylį arba įrašykite mažesnį už spintelės gylį. |
| `eng.bottomShortBack` | W-012 | error | body | `c.cnc.bottomD` | – | – |
| `eng.railsDropped` | W-013 | warn | body | – | – | Stačios galinės juostos nepagamintos — rinkitės gulsčią juostą arba nugarą išorėje. |
| `eng.noTop` | W-014 | error | body | – | – | Įjunkite bent vieną surišimo juostą arba pilną viršų. |
| `eng.backCoverBottom` | W-015 | warn | body | – | – | – |
| `eng.backCoverTop` | W-016 | warn | body | – | – | – |
| `eng.backInset` | W-017 | warn | body | `c.cnc.backInset` | – | – |
| `eng.frontBot` | W-018 | warn | inside | `f-fg-bot` | – | – |
| `eng.visSideCam` | W-051 | info | body | – | – | – |
| `eng.partBack` | W-052 | error | body | – | – | Rinkitės gulsčią galinę juostą arba nugarą viduje — kitaip pertvara prie nugaros nepritvirtinama. |
| `eng.partTop` | W-053 | error | body | – | – | Reikia gulsčios juostos arba pilno viršaus. |
| `eng.plinthFit` | W-079 | error | addons | – | – | Sumažinkite cokolio tarpus. |
| `eng.partsDropped` | W-150 | error | size | – | – | – |
| `eng.zoneOver` | W-019 | error | inside | – | – | – *(dropped when `sec.over` fired)* |
| `eng.secSmall` | W-020 | error | inside | `section · height` | – | – *(dropped when `sec.over` fired)* |
| `eng.frontHFit` | W-021 | warn | inside | `section · frontH.0` | – | Jūsų įrašyti fasadų aukščiai nepritaikyti — sumažinkite juos arba palikite tuščius. |
| `eng.frontHSum` | W-022a | warn | inside | `section · frontH.0` | – | Palikite bent vieną fasado aukštį tuščią — jis užims likutį. |
| `eng.frontHLast` | W-022b | warn* | inside | `section · frontH.0` | – | – |
| `eng.runnerUnknown` | W-023, W-122 | error | inside | `section · hw` | – | Rinkitės bėgelius iš sąrašo — šiems staklės negręžia žymių. |
| `eng.drawersMany` | W-024 | error | inside | `section · nDrawers` | – | Sumažinkite stalčių skaičių arba padidinkite sekciją. *(dropped when `drawer.low` fired)* |
| `eng.innerDrawers` | W-025, W-026 | warn | inside | – | – | Vidiniai stalčiai nebraižomi ir negręžiami — jų detales pridėkite ranka (Priedai → Papildomos detalės). |
| `eng.hingesOff` | W-027 | info | cnc | – | – | – |
| `eng.doorsSmall` | W-028 | error | inside | `section · nDoors` | – | – |
| `eng.hingeLow` | W-029, W-125 | error | inside | – | – | Durys per žemos lankstams — didinkite sekciją arba rinkitės „Be furnitūros“. |
| `eng.hingeMovedTop` | W-030 | info | inside | – | – | – |
| `eng.ovenShelves` | W-032 | warn | inside | `section · shelves` | – | – |
| `eng.shelfLow` | W-033 | error | inside | – | – | Pakeiskite lentynų skaičių arba aukščius. |
| `eng.shelfClose` | W-034 | error | inside | – | – | Pakeiskite lentynų skaičių arba aukščius. *(dropped when `shelf.dense` fired)* |
| `eng.hingeMovedShelf` | W-035 | warn | inside | – | – | Lankstas ne standartinėje vietoje — pažiūrėkite piešinyje arba pakelkite / nuleiskite lentyną. |
| `eng.hingeShelf` | W-036 | error | inside | – | – | Pakeiskite lentynų skaičių arba aukščius. |
| `eng.shelfNoRoom` | W-054 | error | inside | – | – | – |
| `eng.hingeNoSide` | W-059 | error | inside | `section · nDoors` | – | Vidurinėms durims nėra prie ko kabinti lankstų — darykite 2 duris arba dėkite pertvarą. |
| `eng.hingeNoPart` | W-060 | error | inside | `section · hingeSide` | – | – |
| `eng.plateClash` | W-061, W-062 | error | inside | – | – | – |
| `eng.hingesShifted` | W-063 | info | inside | – | – | – |
| `eng.pinClash` | W-064, W-065, W-114 | error | inside | – | – | Pakelkite arba nuleiskite lentyną keliais centimetrais. |
| `eng.runnerMarkOut` | W-056 | error | inside | – | – | Rinkitės trumpesnį bėgelį arba gilinkite spintelę. *(dropped when `drawer.rail|eng.railLong|eng.railDepth|eng.mvDepth` fired)* |
| `eng.runnerCam` | W-057, W-058 | error | body | – | `jcroom` | Bėgelio varžtas pataikytų į ekscentriką — dugną ar viršų junkite konfirmatais arba perkelkite jungtis. |
| `eng.tbLow` | W-071 | error | inside | `section · nDrawers` | – | Sumažinkite stalčių skaičių arba padidinkite sekciją. *(dropped when `drawer.low` fired)* |
| `eng.railLong` | W-072, W-123 | error | inside | `section · rail` | – | Rinkitės trumpesnį bėgelį arba gilinkite spintelę. |
| `eng.boxBelow` | W-073 | warn | inside → stage `set` | – | – | Nustatymuose padidinkite bėgelio ašies aukštį. |
| `eng.drawerBoxFit` | W-074, W-077, W-127, W-129 | error | inside | `section · nDrawers` | – | Sumažinkite stalčių skaičių arba padidinkite sekciją. |
| `eng.railDepth` | W-075, W-128 | error | inside | `section · rail` | – | Rinkitės trumpesnį bėgelį arba gilinkite spintelę. |
| `eng.underT` | W-076 | warn | mats | – | – | – |
| `eng.mvDepth` | W-090 | error | inside | `section · rail` | – | Rinkitės trumpesnį bėgelį arba gilinkite spintelę. |
| `eng.mvLow` | W-091 | error | inside | `section · nDrawers` | – | Sumažinkite stalčių skaičių arba padidinkite sekciją. |
| `eng.mvHeight` | W-092 | warn | inside | `section · mvH` | – | – |
| `eng.mvNarrow` | W-093 | error | inside | – | – | – |
| `eng.mvMat` | W-094 | warn | mats | `c.mat.drawer` | – | – |
| `eng.jointMoved` | W-039 | warn | review | – | `jcroom` | – |
| `eng.jointSkipped` | W-040, W-108 | warn | review | – | `jcroom` | Atidarykite sujungimų patikrą ir pakeiskite jungčių kiekį ar vietas. |
| `eng.jointNone` | W-041 | error | review | – | `jcroom` | Atidarykite sujungimų patikrą ir pakeiskite jungčių kiekį ar vietas. |
| `eng.jointFewer` | W-042, W-042b | warn | review | – | `jcroom` | – |
| `eng.camDowel` | W-043 | error | review | – | `jcroom` | Atidarykite sujungimų patikrą ir pakeiskite jungčių kiekį ar vietas. |
| `eng.partJointsMeet` | W-044 | error | review | – | `jcroom` | – |
| `eng.partJointsShift` | W-045 | info | review | – | – | – |
| `eng.partJointOut` | W-046 | error | review | – | `jcroom` | – |
| `eng.partHolesMeet` | W-047 | error | inside | – | – | Pertvaroje skylės iš abiejų pusių pataiko viena į kitą — perkelkite lentyną, duris arba jungtis. |
| `eng.footMoved` | W-066 | info | body | – | – | – |
| `eng.footClash` | W-067 | error | body | – | `jcroom` | – |
| `eng.legCover` | W-068 | error | body | `c.cnc.legsX` | – | – |
| `eng.legsDense` | W-069 | error | body | `c.cnc.legsX` | – | Sumažinkite kojelių skaičių eilėje. |
| `eng.legsMoved` | W-070 | info | body | – | – | – |
| `eng.ledNoPart` | W-080 | error | addons | – | – | Šioje vietoje nėra detalės grioveliui — pasirinkite kitą LED vietą. |
| `eng.ledDepth` | W-081 | warn | addons | – | – | – |
| `eng.ledOut` | W-082 | error | addons | – | – | – |
| `eng.ledShort` | W-083 | error | addons | – | – | – |
| `eng.ledMoved` | W-084 | warn* | addons | – | – | – |
| `eng.ledClash` | W-085 | error | addons | – | – | – |
| `eng.holesOverlap` | W-086, W-087 | error | review | – | `jcroom` | Atidarykite sujungimų patikrą ir pakeiskite jungčių kiekį ar vietas. |
| `eng.backConf` | W-088, W-089 | error | body | `c.cnc.backJoint` | `nvcfix backcam` | Nugarai rinkitės ekscentrikus arba kaiščius — konfirmatų skylių ilgame krašte staklės negręžia. |
| `eng.unverJoints` | W-099, W-099b | info | review | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.plateOut` | W-P1 | error | inside | – | – | – |
| `eng.unverPlates` | W-P2 | info | cnc | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.unverPins` | W-P3 | info | cnc | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.unverTb` | W-P4 | info | cnc | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.unverCups` | W-P5 | info | cnc | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.insetDoor` | W-P6 | info | fronts | – | – | – |
| `eng.boxSize` | W-100 | error | size | – | – | – *(dropped when `size` fired)* |
| `eng.boxInset` | W-101 | warn | body | – | – | – |
| `eng.boxEmpty` | W-102 | error | body | – | – | – |
| `eng.boxCorner` | W-103 | error | body | – | – | – |
| `eng.boxPart` | W-104 | error | inside | – | – | – |
| `eng.boxShelfOut` | W-105 | error | inside | – | – | – |
| `eng.boxShelfClose` | W-106 | error | inside | – | – | – |
| `eng.boxSmall` | W-107 | warn | body | – | – | – |
| `eng.boxThin` | W-109 | info | body | – | – | – |
| `eng.boxJointClash` | W-110 | error | review | – | `jcroom` | – |
| `eng.boxJointShift` | W-111 | info | review | – | – | – |
| `eng.camDeep` | W-112 | error | review | – | `jcroom` | Plonai plokštei rinkitės konfirmatus arba kaiščius. |
| `eng.boxShelfNoSide` | W-113 | error | inside | – | – | – |
| `eng.markOut` | W-115a | error | fronts | – | – | – |
| `eng.markClash` | W-115b | error | fronts | – | – | – |
| `eng.boxFrontClosed` | W-116 | error | fronts | – | – | – |
| `eng.boxNoOpening` | W-117 | error | fronts | – | – | – |
| `eng.boxOpeningUsed` | W-118 | error | fronts | – | – | – |
| `eng.boxOpeningSmall` | W-119 | error | fronts | – | – | – |
| `eng.boxShelfDrawers` | W-120 | error | fronts | – | – | – |
| `eng.boxDrawersFit` | W-121 | error | fronts | – | – | Sumažinkite stalčių skaičių arba padidinkite sekciją. |
| `eng.boxNoSideRunner` | W-124 | error | fronts | – | – | – |
| `eng.boxNoSideHinge` | W-126 | error | fronts | – | – | – |
| `eng.unverBox` | W-130 | info | review | – | – | Nuolatinė pastaba: šios skylės dar nesutikrintos su SWOOD modeliu — patikrinkite pirmą pagamintą detalę. |
| `eng.holeOut` | M-01, M-04 | error | review | – | – | – |
| `eng.noDrill` | M-02 | error | cnc | – | – | Tokio grąžto staklių galvoje nėra — pridėkite jį Nustatymuose arba keiskite operaciją (TANDEMBOX fasadui — žymės vietoj skylių). |
| `eng.noThrough` | M-03 | warn | cnc | – | – | Tokio grąžto staklių galvoje nėra — pridėkite jį Nustatymuose arba keiskite operaciją (TANDEMBOX fasadui — žymės vietoj skylių). |
| `eng.noEdgeDrill` | M-05, M-06 | error | cnc | – | – | Tokio grąžto staklių galvoje nėra — pridėkite jį Nustatymuose arba keiskite operaciją (TANDEMBOX fasadui — žymės vietoj skylių). |
| `eng.longEdge` | M-07 | error | body | – | `jcroom` | Detalė ilgesnė nei 900 mm — konfirmatų skylių jos ilgame krašte staklės negręžia. Tam sujungimui rinkitės ekscentrikus arba kaiščius. *(dropped when `eng.backConf` fired)* |
| `eng.clampShort` | M-08 | info | cnc | – | – | Operatoriui: pasuktoje programoje detalė trumpa — patikrinkite, ar ją laiko prispaudimas. |
| `eng.tooBig` | M-09, M-10 | error | size | – | – | Staklės apdirba detales iki 3050 × 900 mm. Mažinkite detalę arba keiskite konstrukciją (pvz. nugara iš plaušo, pertvara). |

## For the other files

| | |
|---|---|
| `nvcTopicState(i, topicKey)` | `'error' \| 'todo' \| 'warn' \| 'ok'` — the worst issue of cabinet `i` in that topic |
| `nvcBlockers()` | the issues that stop production (`error` and `todo`) |
| `nvcSig(list?)` | signature of the warnings as they are now (`'3.k2f9x1'`, `''` when there are none). It is built from rule ids, cabinet ids, sections and the numbers of the messages — not from the language — so a new or changed warning gives another signature and the "Peržiūrėjau įspėjimus" tick asks again |
| `NVA.nvcfix` | the one-click fixes: `data-nv="nvcfix" data-v="rail:<sec>:<len> \| ndrawers:<sec>:<n> \| hingen:<sec> \| colseq \| backcam \| pick" data-i="<cabinet>"` |
| `window.__nvc` | for tests: `compute`, `classify(text)`, `table`, `sev`, `lim`, `errors()`, `sig()`, `topicState`, `blockers`, `build(i)` |

## Not checked (known)

- The price lists and the cutting plan (boards per material) — only the single part against the board size.
- `worktopPieces()` itself is not called (it creates the layout as a side effect); the worktop length rule repeats its
  joining of neighbours and may differ from it for unusual layouts (corner joins).
- Cabinet quantity, notes and names are free text and are not judged.
- The live 3-D picture (`src/lib/assembly.js`) overflows the stack on a cabinet with 12 drawers in 720 mm; the check
  reports the cabinet correctly (`drawer.low`), the crash is in the live view.
