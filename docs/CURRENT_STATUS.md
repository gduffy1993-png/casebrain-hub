# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-28  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

## Done (engineering sign-off)

| Item | Result |
|------|--------|
| Modules 1–7 (contradiction stack) | Live on prod; kill switches per module |
| Tier A/B gate | PASS — Paige, Neil, false-positive corpus |
| Case routine gate | 9/9 PASS |
| Strategy corpus factory | **2,200 / 2,200 PASS** |
| Cold-start (new account → S1 upload) | PASS — `artifacts/casebrain-qa/cold-start/` |
| Golden pack (H2) | **50/50 READY** |
| **CB-FRESH-001/002** adversarial audit | **PASS WITH MINOR WARNINGS** (Codex Layer 7, post-P2 deploy `857b503`) |
| H2 P1 chase finalization + H2 P2/P3 display polish | Shipped prod |
| Paywall/trial clarity (pilot) | Banner + upload page trial limits copy |
| Original brains | Unchanged — add-ons only |

## Design-partner ready (not mass rollout)

| Item | Notes |
|------|--------|
| Taylor Brookes / Jordan Hale | Solicitor-gate signed; use with review before sending Chase |
| First design-partner firm | **Next** — 5–10 cases, weekly PASS/FAIL checklist |
| 3–5 firms | After first partner goes well |

## Not proven yet

- “Works on every messy real firm PDF”
- “Solicitor uses output with zero edit on every case”
- Offence depth tranches (6B) — wait for pilot demand

## QA accounts (prod, local artifacts)

- Cold-start: `artifacts/casebrain-qa/cold-start/latest-account.json`
- CB-FRESH audit: `artifacts/casebrain-qa/cb-fresh-audit/latest-account.json`

## Key scripts

```powershell
npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 50 --max-polish-rate 1
npx tsx scripts/.tmp-cb-fresh-audit.ts
npx tsx scripts/.tmp-cold-start-gauntlet.ts
npx tsx scripts/disclosure-chase-finalize.test.ts
npx tsx scripts/pilot-matter-display-polish.test.ts
```

Full plan: `docs/CRIMINAL_PILOT_MASTER_PLAN.md`
