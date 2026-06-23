# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-21  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

## Done (engineering sign-off)

| Item | Result |
|------|--------|
| Modules 1–7 (contradiction stack) | Live on prod; kill switches per module |
| Tier A/B gate | PASS — Paige, Neil, false-positive corpus |
| Case routine gate | 9/9 PASS |
| Strategy corpus factory | **2,200 / 2,200 PASS** |
| Cold-start (new account → S1 upload) | PASS — `artifacts/casebrain-qa/cold-start/` |
| Original brains | Unchanged — add-ons only (proof-map links, ledger charge zone) |

## In progress (real product truth)

| Item | Notes |
|------|--------|
| **CB-FRESH-001** Taylor Brookes — digital attribution / intimidation | Uploaded on cold account; copilot audit Summary / Today / Chase |
| **CB-FRESH-002** Jordan Hale — custody / BWV conflict | Same |
| Copilot browser audit | Tab-by-tab or paste/screenshot; checklist in master plan Layer 7 |

## Cold QA account (prod)

Credentials: `artifacts/casebrain-qa/cold-start/latest-account.json` (gitignored path — local only)

- Not sam.pilot demo — real calendar, empty caseload until upload
- Provision script: `npx tsx scripts/.tmp-provision-cold-user.ts`

## Not proven yet (need firm or FRESH PASS)

- “Works on every messy real firm PDF”
- “Solicitor uses output as-is in conference / chase letter”
- Offence depth tranches (6B) — wait for pilot demand

## Next steps (order)

1. Finish **copilot PASS/FAIL** on CB-FRESH-001 + 002  
2. Fix anything **dangerous** (overstatement, missing chase, wrong attribution)  
3. **One design-partner firm** — 5–10 cases, weekly checklist  
4. Then 3–5 firms if first goes well  

## Key scripts

```powershell
npx tsx scripts/bundle-contradiction-tier-gate.ts
npx tsx scripts/case-routine-gate.ts
npx tsx scripts/strategy-corpus.ts --count 2200 --split all
npx tsx scripts/.tmp-cold-start-gauntlet.ts
npx tsx scripts/.tmp-provision-cold-user.ts
```

## Architecture truth (for copilot / partners)

- **No training** on bundles — global TypeScript engines on any upload  
- **Paige / Neil** = QA anchors only  
- **Factory 2,200** = scale/regression, not “every real case works”  
- **Silence** when papers thin = correct behaviour  

Full plan: `docs/CRIMINAL_PILOT_MASTER_PLAN.md`
