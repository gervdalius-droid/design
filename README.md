# Spintelių kūrėjas — new interface (builder2)

A working copy of the Dėdės Baldai cabinet builder with a **new interface, a guided flow and a real check gate**.
The cabinet logic, the CNC engine, the part list, the report and the drawings are the live app's own code, unchanged
(`src/lib/`); the same project gives the same parts and the same `.XXL` programs, text for text (`test/ui/golden_test.py`).

**Try it:** `python3 tools/serve.py` → http://127.0.0.1:8765/ (the untouched live app is at `/legacy/` for comparison).
Local only for now: projects are kept in this browser; the workshop sign-in and cloud save are not wired in yet.

## What is different
- One road: **Spintelės → Išdėstymas → Patikra → Gamyba**, with the project's state always in the top bar.
- The cabinet's picture is the editor: click a section, a column or a dimension to change it; the rest is grouped
  by topic (Dydis, Vidus, Korpusas, Medžiagos, Priedai, Gręžimas, Patikra) and "Toliau →" leads to what is still open.
- Checks at the field, on the cabinet, on the stage — and a gate: errors and open confirmations lock the downloads,
  warnings have to be acknowledged (`docs/CHECKS.md`).
- Undo / redo for everything (Ctrl+Z).

## For development
`docs/ARCHITECTURE.md` (how the new interface sits on the live code), `docs/DESIGN.md` (the design),
`docs/map/` (the map of the live app this was built from).

```
python3 build.py --check        # → index.html (one self-contained page)
python3 test/run_all.py         # build, engine regression, golden output, interface tests
python3 tools/sync_legacy.py <path to app/builder>    # bring in a newer live app
```
