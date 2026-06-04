# Battleboard view fidelity — Phase 4b

Strategy view over the **Proof Map** (Phase 4a). No UI, no LLM — derives routes and pressure from proof-point links only.

## Run

```powershell
npx tsx scripts/battleboard-view-fidelity.ts --pack gold
npx tsx scripts/battleboard-view-fidelity-gold.test.ts
```

Reports (gitignored):

`artifacts/casebrain-auditor/latest/strategy-fidelity/battleboard-view/`

## Gold expects

`docs/bundle-fidelity-set/battleboard-view/gold/*.expect.json`

## Rules

- Proof Map links only — no invented strategy
- Every evidence item references a `proofPointId`
- Forbidden: “this wins”, “Crown collapses”, “proves innocence”, “guaranteed”
- War Room (4c) is a separate hearing-action view — not built here
