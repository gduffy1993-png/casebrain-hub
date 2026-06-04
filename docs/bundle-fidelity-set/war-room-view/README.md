# War Room view fidelity — Phase 4c

Hearing/court-action view over the **Proof Map** (Phase 4a). No UI, no LLM — derives safe lines and record asks from proof-point links only.

## Run

```powershell
npx tsx scripts/war-room-view-fidelity.ts --pack gold
npx tsx scripts/war-room-view-fidelity-gold.test.ts
```

Reports (gitignored):

`artifacts/casebrain-auditor/latest/strategy-fidelity/war-room-view/`

## Gold expects

`docs/bundle-fidelity-set/war-room-view/gold/*.expect.json`

## Rules

- Proof Map links only — no invented court strategy
- Every hearing action references a `proofPointId`
- Forbidden: “this wins”, “Crown collapses”, “proves innocence”, “guaranteed”
