# Proof Map fidelity — Phase 4a

Connects Phase 3/3.5 source-backed facts to **proof points** and an **evidence dependency graph** (Battleboard/War Room inputs later).

## Run (4a slice 1)

```powershell
npx tsx scripts/proof-map-fidelity.ts --pack gold
npx tsx scripts/proof-map-fidelity-gold.test.ts
```

Reports (gitignored):

`artifacts/casebrain-auditor/latest/strategy-fidelity/proof-map/`

Per case: `cases/<bundleId>/proof-map.md`, `proof-map.json`

## Gold expects

`docs/bundle-fidelity-set/proof-map/gold/*.expect.json` — fictional bundles only.

## Rules

- No deep strategy unless source-backed or **provisional**
- No “this wins”, “Crown collapses”, “proves innocence”
- Unknown offence lens → generic map + **human review**
- UI is slice **4d** — not built in 4a
