# builder2 — design

**For whom:** the people of a small furniture workshop (Dėdės Baldai). They know cabinets, not software. They build a
kitchen as a list of cabinets, and the result goes straight to the saw and the CNC machine — a mistake costs a board,
an afternoon, or a kitchen. **The job of this interface:** make the next step obvious at every moment, and make it
hard to send a mistake to production.

**What was wrong with the live app** (docs/map/*): six fixed editor steps in an order that fights the work
(construction jargon before "what is inside"), one concept split over several steps, three different pictures of the
same cabinet that cannot be clicked, warnings as a collapsed list of sentences far from the field, a "ready for CNC"
card that is green while confirmations are open, and export buttons that always work.

## Principles

1. **One road, always visible.** Project → **Spintelės** → **Išdėstymas** → **Patikra** → **Gamyba**. The top bar shows
   where you are and what state the project is in (the status pill). You may jump anywhere; the primary button of every
   screen ("Toliau →") always leads to the next thing that actually needs doing.
2. **The picture is the editor.** The cabinet is drawn from its real parts; you click what you want to change.
3. **Show only what matters now.** The inspector shows the selected thing. Workshop standards are pre-filled; rarely
   changed options sit behind "Daugiau nustatymų" (a `<details class="nv-adv">`). A hidden option never hides a problem:
   an issue inside a closed group opens it.
4. **Problems appear where they are made, at once, in words, with a way out.** Field → frame + sentence under it.
   Topic, cabinet card, stage → a state mark. Every issue row has "Taisyti →" that lands on the field.
5. **Nothing leaves with an open problem.** Errors and open confirmations lock the downloads. Warnings must be
   acknowledged. Everything is undoable (Ctrl+Z).
6. **Calm.** Warm paper background, white cards, ink-black primary actions, blue only for "selected", and
   green / amber / red only for state. No decoration that does not carry information. Lithuanian first, short sentences,
   workshop words — but every jargon term gets a plain hint the first time (a `title` or a `.nv-hint` line).

## Stages

### Home (`S.home`) — 20-home
Big, friendly, two things: **start a new project** (name → Enter → the cabinet chooser) and **continue one**
(project cards: name, number of cabinets, "prieš 2 val.", open on click; ⋯ menu: copy, backup .json, delete with a
second click). Secondary: "Įkelti iš pasiūlymų programos (.json)", "Atidaryti pavyzdį". Search when > 6 projects.

### Cabinet chooser (`S.picking` or no cabinets) — `nvPicker()` in 20-home
"Kokią spintelę kuriame?" A gallery of the 10 presets as real front pictures grouped **Apatinės / Viršutinės /
Aukštos / Kita**, each with its default size; the saved-cabinet library above it when it has items
(live `viewLib()`). One click creates the cabinet and opens it on topic **Dydis** with the width selected.

### Spintelės (`cab`) — 30-editor + 31-topics
```
┌ strip 224px ─┬ canvas (flexible) ────────────────────┬ inspector ~500px ───────────────┐
│ cabinet cards│ [Priekis | 3D]        name · W×H×D    │ ┌rail┐ topic title              │
│  mini front  │                                       │ │ ◉  │ …fields of the topic…    │
│  name, size  │        THE PICTURE                    │ │ ○  │                          │
│  state mark  │   (click a section / a column /       │ │ ○  │                          │
│ + Nauja      │    a dimension)                       │ │ ⚠  │                          │
│   spintelė   │                                       │ └────┘ [← Atgal]   [Toliau →]   │
│              │ issues of this cabinet (max 3 + more) │                                 │
└──────────────┴───────────────────────────────────────┴─────────────────────────────────┘
```
- **Strip:** one card per cabinet (`data-act="sel"`): a small front picture, number, name, size, state mark
  (worst issue), drag is not needed. "+ Nauja spintelė" (`data-act="pick"`). Under 1100 px the strip becomes a
  horizontal scroller above the canvas, and canvas and inspector stack.
- **Canvas:** `NV.view` = `front` (default): the front picture from real parts (`DBFront.svg`), with
  **hit areas** over every section and column (hover outline, selected = blue outline + label), a "+" pill at the top
  of every column to add a section, and the three outer dimensions as clickable labels that jump to the field.
  `3d`: the live 3-D assembly view (`<div id="assembly-preview">`, mounted by the core) for looking, materials by
  drag-and-drop and connectors. Under the picture: this cabinet's open issues as compact rows ("Taisyti →").
- **Inspector:** a rail of topics (icon, short label, state mark) and the body of the open topic `NV.topic`.
  Footer: "← Atgal" and the primary **"Toliau →"** = next topic with something to do, else the next topic; on the last
  topic "Kita spintelė →" / "Į išdėstymą →". The body never duplicates a binding that the page already shows.

Topics of a normal cabinet (the live fields regrouped by what the person is thinking about — every field of the
live editor must exist somewhere, docs/map/app-editor.md §5 and app-sections.md §3–9 are the inventory):

| key | Label | Content |
|---|---|---|
| `size` | Dydis / Size | name; W, H, D as three large fields with a one-line picture hint; type shown as a badge (Pastatoma / Pakabinama / Aukšta); *Daugiau:* board and front thickness; cabinet actions (į biblioteką, kopijuoti, ištrinti) |
| `inside` | Vidus / Inside | partitions (0 / 1 / 2) + column widths; then the **selected section's editor** (kind as icon buttons, count steppers, runner / hinge choices, height: "Užima likusį aukštį" or mm), or — nothing selected — the column's section list (top first) with ▲ ▼ ✕ and "+ Pridėti"; zone bar "Fasadų zona 718 mm · užimta 718" that turns red on overflow; front heights; shelves; *Daugiau:* front gaps, shelf setback |
| `body` | Korpusas / Carcass | one summary line of the construction in plain words, then groups: **Atramos** (legs / feet / none, with count, rows, height and the plan picture right there; plinth right there) · **Dugnas** · **Viršus** (+ rails) · **Nugara** (per column) · **Matomi šonai** · **Jungimas** (confirmat / cam cards) |
| `mats` | Medžiagos / Materials | carcass, fronts, back, top, drawer; edges; required ones marked; look (colour / texture) under *Daugiau* |
| `addons` | Priedai / Add-ons | worktop; LED; extra parts table (incl. side panels) with the plinth fit block |
| `cnc` | Gręžimas / Drilling | the CNC operation switches that apply to this cabinet (others are not listed at all) |
| `review` | Patikra / Review | everything open for this cabinet: issues with "Taisyti →", **Sujungimai** and **Kraštai** confirmation cards (open the live modals `jcopen` / `ecopen`), counts (parts, programs), then "Kita spintelė →" |

Other kinds: dishwasher front → `size`, `mats`, `review`; loose panel → `size` (the live panel editor), `review`;
3-D construction (box) → the live box steps as topics (`dims`, `boards`, `inner`, `fronts`, `joints`), then `mats`,
`addons`, `review`.

### Išdėstymas (`room`) — 40-room
The live whole-furniture editor, optional ("Neprivaloma: išdėstykite spinteles prie sienų — stalviršiai, brėžiniai
ir cokoliai skaičiuojami iš čia"). Above it one line with this stage's issues. Re-skinned, not rebuilt.

### Patikra (`chk`) — 50-check
The gate, as a page. Header: one big state ("3 dalykai stabdo gamybą" / "Paruošta gamybai ✓"). Then groups:
**Projektas**, then one per cabinet (number, name, mini picture): its errors, its confirmations
(Sujungimai / Kraštai: "Peržiūrėti ir patvirtinti" opens the live modal for that cabinet), its warnings. Each row:
state icon, sentence, hint, "Taisyti →". Cabinets with nothing open collapse to one green line. Workshop notes
(`info`) sit in a closed group at the bottom. Footer: "Toliau: Gamyba →" (disabled while something blocks, with the reason).

### Gamyba (`res` / `nest` / `drw`) — 60-make
Sub-navigation: **Detalės ir programos** · **Plokštės** (cutting plan) · **Brėžiniai**.
On top of the first page the **export panel**: locked (list of what blocks + "Eiti į patikrą") → or warnings to
acknowledge (tick "Peržiūrėjau įspėjimus") → or ready: one primary "Atsisiųsti viską (ZIP)" and the single files
(.XXL, .xlsx, .csv, PDF, .json) with one line each saying what it is for. Every export path of the live app
(downloads, print, hand-over to Nesting) goes through this gate. Below: the parts table, part view, etc. (live views).

### Settings (`set`) — 40-room/skin
The live settings, grouped and readable in the new look.

## Building blocks (01-shell.css)

`nv-card`, `nv-h1/h2/h3`, `nv-lead`, `nv-muted`, `nv-row`, `nv-col`, `nv-btn (.pri .ghost .danger .sm .lg)`,
`nv-badge (.ok .warn .error .todo)`, `nv-issue (.error .warn .todo .info)`, `nv-empty`, `nv-num`;
inspector: `nv-grp` (a titled group: `<section class="nv-grp"><h4>…</h4>…</section>`), `nv-fields` (grid of
fields), `nv-adv` (`<details class="nv-adv"><summary>Daugiau nustatymų</summary>…`), `nv-hint` (one muted line of
explanation), `nv-step` (− value + stepper), `nv-pick` (large icon choice buttons), `nv-state` (state dot:
`.ok .warn .error .todo`). The live helpers `fN fT fS seg chk dd` are restyled to match — use them for bound fields.
Tokens: `--bg --panel --sunk --ink --muted --line --line2 --accent --accent-soft --ok(-bg,-line) --warn(-bg,-line)
--bad(-bg,-line) --nv-r --nv-shadow`. No new colours; no gradients; radius 8–12; hit targets ≥ 34 px.
Works from 1280 px wide down to a phone (stacked).
