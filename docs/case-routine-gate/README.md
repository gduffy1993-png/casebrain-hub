# Case Routine Gate — factory method (main branch)

Systematic eval for criminal bundles on **main** — not pilot-only demo cases. Every shape gets the same checklist; failures become locked tests.

## Purpose

Prove CaseBrain reads bundles correctly and surfaces **consistent, safe** output across Control Room, Battleboard, War Room, Disclosure Chase, Court Today, Cases list, and QA export — before LinkedIn GTM.

## Case Routine Checklist (every matter)

### Identity (must match everywhere)

| Field | Surfaces |
|-------|----------|
| Client / defendant | Header, summary, Cases, QA export |
| Offence (full wording, not truncated) | Header, summary, War Room, Disclosure |
| Court | War Room, Disclosure, QA export |
| Stage | War Room, Disclosure |
| Hearing date/time | War Room, Court Today bucket, QA export |
| Complainant (when valid on file) | Summary only — never invented |

### Safety (must never appear)

- `Full CCTV confirms Crown timing`
- `MG11 is consistent and served`
- `SCANNED CONTINUATION`
- MG6C reference leaks
- PACE compliance tick lines as pressure routes (`✅ Appropriate adult not required…`)
- Raw quote dumps in Battleboard primary route
- Eval/pilot/gauntlet language in user UI

### Surfaces scored

1. Bundle metadata extraction (defendant, charge, court, hearing)
2. Bundle fidelity (truth key)
3. QA pack export (gold-7 path)
4. Battleboard forbidden phrases
5. Summary pressure route sanity

## Shape library v1 (target 10)

| # | Shape ID | Source | Offence family |
|---|----------|--------|----------------|
| 1 | `gbh-pike-jordan-pike` | Fictional GBH messy disclosure | violence |
| 2 | `s18-charge-reduction-jordan-clarke` | S18 charge reduction bundle | violence |
| 3 | `crown-court-patterson` | Crown court PDF bundle (James Patterson s18) | serious violence |
| 4 | `motoring-thin-ella-shaw` | Thin motoring papers | motoring provisional |
| 5 | `generic-provisional-sam-okonkwo` | PCJ generic provisional | generic provisional |
| 6 | `pilot-3-marcus-vale` | Fraud manifest snapshot | fraud |
| 7 | `pilot-3-kian-doyle` | PWITS manifest snapshot | drugs |
| 8 | `pilot-3-leon-marsh` | Robbery ID manifest snapshot | robbery |
| 9 | `fictional-theft-ashleigh-merritt` | Theft bundle copy-paste | theft |
| 10 | `fictional-gbh-pike` | (alias of #1 — GBH shape) | violence |

**Demo bar:** ≥8 shapes green on routine gate → LinkedIn OK.

## Run order

```text
1. npx tsx scripts/case-routine-gate.ts          # full factory gate
2. npx tsx scripts/gold-7-qa-pack-gate.ts         # QA export subset
3. npx tsx scripts/bundle-shape-regression.test.ts
4. npx tsx scripts/bundle-fidelity.ts --pack gold
5. Production cold-start smoke per new shape (artifacts/casebrain-qa/)
```

## Fail → fix → lock loop

1. Gate fails on shape + field (e.g. `crown-court-patterson` / `hearing`)
2. Narrow rule fix in `lib/criminal/extract-bundle-case-metadata.ts` or battleboard guards
3. Add assertion to `scripts/bundle-shape-regression.test.ts` or shape expect in truth key
4. Re-run gate — failure must not repeat

## Sensitive offence families (sexual, domestic, youth)

Same **routine** checklist. Extra guards:

- No victim detail invention
- Stricter chase language (conditional only)
- Youth / AA routes only when age on file supports it
- `prohibitedFamilies` in truth keys block wrong-family drift

## Expanding from 1000 PDF library

1. Classify PDF → nearest shape tag
2. If new layout → add shape #11+ with truth key under `docs/bundle-fidelity-set/gold/`
3. Never commit real client data — fictional/redacted only in repo

## Artifacts

- `artifacts/casebrain-qa/case-routine-gate/report.json`
- `artifacts/casebrain-qa/case-routine-gate/*.md` (per-shape QA packs)
