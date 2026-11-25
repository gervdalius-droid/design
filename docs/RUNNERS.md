# Drawer runners — where the cabinet profiles go

Checked against Blum's planning sheets (November 2026). The corrections are applied to the live engine at build time
(`build.py`, `PATCHES`, module `engine`); `python3 build.py --plain-engine` builds without them.

## What Blum fixes

Everything hangs on the drawer box's **reference line R**: the top face of the board under the box (the cabinet bottom for
the lowest drawer).

| | cabinet profile screw row | front fixing | base underside | screws from the front edge |
|---|---|---|---|---|
| **TANDEMBOX** (antaro, M side) | R + 33 (min.) | R + 47.5 and R + 79.5 (gallery: R + 207.5) | R + 9 | 30 kg profile: system screws on the 37 mm line; the engine marks 19, 28, 37, 261, 293, 453 |
| **MERIVOBOX** (all heights) | R + 54 (min.; +1 if the profile is fitted before the cabinet is assembled) | R + 33.5 and R + 65.5 | R + 20 | 40 kg: NL 270–350 → 37, 197, 229 · NL 400–600 → 37, 261, 293 (optional 19 and 69) |

So the screw row and the front fixing are a fixed distance apart: TANDEMBOX 14.5 mm (row below), MERIVOBOX 20.5 mm (row above).

Sources: Blum, *TANDEMBOX antaro* planning information ("Space requirements in cabinet", "Front dimensions",
"Cabinet profile fixing positions") and *MERIVOBOX — Ordering and planning information* ("Space requirements in the cabinet",
"Front installation dimensions", "Cabinet profile screw position – 40 kg").

## What the engine does with it

The engine drills (or marks) every TANDEMBOX front 65.5 / 97.5 mm above the front's **own bottom edge** — Blum's 47.5 / 79.5
plus 18: a front hangs 18 mm below its box's reference line (`fa`), as the lowest front does over an 18 mm cabinet bottom.
The screw row therefore belongs at

    z = max( top of the cabinet bottom + up ,  front's bottom edge + fa + up )      up: 33 TANDEMBOX · 54 MERIVOBOX,  fa: 18

## What was wrong

1. **TANDEMBOX, every drawer above the lowest.** The row was put `up` (33) above the front's bottom edge, without the 18:
   18 mm too low for the holes in that drawer's own front. Mounted by both sets of marks, each upper front ended 18 mm low —
   into the front below it. The lowest drawer was right.
2. **MERIVOBOX, every drawer.** It had TANDEMBOX's 33 for the row and 24 for the base (the live app's settings page said
   "not verified on a MERIVOBOX"). Blum: 54 and 34 — the row was 21 mm too low for the lowest drawer (the box does not go in
   above the cabinet bottom) and 39 mm for the others; the short lengths (NL 270–350) had only the front screw.

Not touched: BLUM TANDEM, the GTV / DTC ball-bearing and undermount runners (shop-made boxes, the front is screwed to the
box wherever it has to be) — they were not checked against a catalogue here.

## TANDEMBOX boxes as the workshop makes them (November 2026)

The workshop uses the antaro **M side on every TANDEMBOX drawer**. A low drawer gets Blum's steel back; a higher one a 16 mm
chipboard back and gallery rails on the M side. The live engine listed only the runner set; the build now also lists what
the shop cuts and buys (build.py PATCHES, `R.tbox`):

| box | back | gallery rails | cut by the shop |
|---|---|---|---|
| M | steel back (bought, `LW=`) | — | base LW − 75 × NL − 24 |
| C | chipboard 167 mm | 1 per side | base, back LW − 87 × 167 |
| D | chipboard 199 mm | 2 per side | base, back LW − 87 × 199 |

Field **TANDEMBOX dėžė (šonai M)** on a drawer section / front: by the front's height (the highest that fits: back + 9 mm
base offset above the reference line R, up to 10 mm under the front's top) or M / C / D by hand. Base and back are 16 mm —
without a drawer material the carcass board is named and a warning asks for the 16 mm one.
Not changed: the front fixing holes (65.5 / 97.5, and 225.5 on fronts from 250 mm), the 3-D picture of the box.
