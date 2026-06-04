# Explanation fidelity — Phase 3.5

Proves CaseBrain can **explain** what bundle text says — with sources, status, safe next steps, and do-not-overstate caps — before that copy ships in product UI.

**Phase 3** = read the papers (metadata + doc signals).  
**Phase 3.5** = explain paper truth safely (this lane).  
**Phase 4** = UI surfaces.

Master plan: `docs/CASEBRAIN_V2_MASTER_PLAN.md` §9.3.

## Run (3.5a scaffold)

```powershell
npx tsx scripts/bundle-fidelity-explanation.ts --pack gold
npx tsx scripts/bundle-fidelity-explanation.ts --pack local
```

Reports (gitignored):

`artifacts/casebrain-auditor/latest/bundle-fidelity/explanation-fidelity/`  
`artifacts/casebrain-auditor/latest/bundle-fidelity/explanation-fidelity/local/`

Per runnable case:

| File | Purpose |
|------|---------|
| `missing-material.md` | Served / partial / outstanding material |
| `contradictions.md` | Cross-source conflicts |
| `custody-interview.md` | PACE / interview / caution (source-backed) |
| `disclosure-dependencies.md` | MG6 / chase priority vs route |
| `case-summary.json` | Machine-readable blocks |

## Block schema

See `explanation-block.schema.json`. Every block must include:

- `issue`, `sourceSection`, `sourceBasis`, `status`
- `whyItMatters`, `safeNextAction`, `confidenceTag`, `doNotOverstate`

Contradictions add `sourceA`, `sourceB`, `reconciliationStatus`.

**Status values:** `served` | `partial` | `outstanding` | `conflicting` | `unclear`

**Rules (3.5b+):**

- No invented facts; basis must appear in bundle text.
- Do not merge conflicting sources into one fact.
- Real PDFs and client expects stay out of git (`artifacts/bundle-fidelity-local/`).

## Gold expectations (3.5b — planned)

`docs/bundle-fidelity-set/explanation/gold/*.expect.json` — fictional cases only.

## Local exemplar (3.5c — planned)

Copy `explanation-expect.template.json` into a gitignored local case folder (e.g. `local-001-dangerous-driving`).
