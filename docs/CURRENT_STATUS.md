# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-28  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

**Decision:** No design-partner trial yet. H3 → H4 → H5 → H6 → then firm.

## Done

| Item | Result |
|------|--------|
| H1 — safety / weirdness | Done — 2,200 clean |
| H2 — display polish + verification | Done — golden 102, 0 fail |
| Modules 1–7 | Live |
| CB-FRESH + fresh-user smoke | Green / Layer 7 minor warnings |
| Brain 1 + frozen cores | Untouched |

## In progress — H3 Trust layer (chunk 1)

- Matter confidence header on pilot matter strip
- Source-state badges on Chase items
- Copy-safe CPS chase / court line (blocked when source unclear or court-in-CPS)
- H3 hard rule encoded in copy-safe logic

Still to do in H3: Today/Summary badges, don’t-say box, client copy, feedback capture.

## Next

H3 chunks 2–3 → H4 (red-team + export smoke) → H5 workstation slices → H6 power features.

Full locked plan: `docs/CRIMINAL_PILOT_MASTER_PLAN.md`

## Key scripts

```powershell
npx tsx scripts/matter-confidence.test.ts
npx tsx scripts/h2-confidence-report.ts --run-gate --target 100
npx tsx scripts/.tmp-cb-fresh-audit.ts
```
