# Phase 11 remediation v4 checkpoint

**Status:** REMEDIATION_V4_COMPLETE — **AWAITING_HUMAN_GOLD_REVIEW** — **not a programme PASS**  
**v1 freeze (preserved):** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**v2 freeze (preserved):** `fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0`  
**v3 freeze (preserved):** `de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767`  
**v4 freeze:** `d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883`  
**Schema:** 1.1.0 · **Central surfaces:** 31 · **Ledger impact:** none  
**programmePassSupported:** false

## Explicit

- v1, v2 and v3 sample, hash, renders, and reports are **unchanged historical evidence** (read-only).
- v4 is a **NEW sample**: the same 33 v1 goldIds/fixtures carried forward for lineage, PLUS 10 new gold-manual packets (GOLD-11-034..043) previously unused across v1–v3.
- Synthetic technical controls (SYN-*) are retained as substantive only where independent expected-truth context is documented (all 13 in v4); otherwise excluded from the denominator.
- No human judgments filled. No invented sign-off. No merge/deploy/programme PASS.
- Blocked ≠ repaired.

## Membership

| Metric | Value |
|--------|------:|
| v1 IDs retained (lineage) | 33 |
| Additions (new gold-manual packets) | 10 |
| Removals | 0 |
| Total v4 sample | 43 |
| Substantive eligible | 43 |
| Insufficient source context (excluded) | 0 |
| Unique fixtures | 40 |
| Duplicate fixtures (carried from v1) | cb-found-2003-nguyen×3, cb-fresh-002-jordan-hale×2 |

**v4 membership policy:** v4 CARRIES FORWARD the same 33 v1 goldIds/fixtures (unchanged membership, for lineage) AND ADDS 10 new gold-manual packets (GOLD-11-034..043) previously unused across v1–v3, giving a NEW sample not identical to v3. v1, v2 and v3 artefacts preserved read-only.

## Additions (GOLD-11-034..043)

| Gold ID | Fixture | Review eligibility |
|---------|---------|---------------------|
| GOLD-11-034 | CASE-03:demo-audit-27-custody-pace-missing | substantive |
| GOLD-11-035 | CASE-06:demo-audit-04-co-def-interview | substantive |
| GOLD-11-036 | CASE-09:demo-audit-32-restraining-order-breach | substantive |
| GOLD-11-037 | CASE-10:demo-audit-41-translated-messages | substantive |
| GOLD-11-038 | CASE-11:demo-audit-22-youth-interview | substantive |
| GOLD-11-039 | CASE-12:demo-audit-21-historic-sexual-abe | substantive |
| GOLD-11-040 | CASE-13:demo-audit-50-lab-continuity-conflict | substantive |
| GOLD-11-041 | CASE-14:demo-audit-16-fraud-bank-statements | substantive |
| GOLD-11-042 | CASE-15:demo-audit-18-motoring-sjp-thin | substantive |
| GOLD-11-043 | CASE-16:demo-audit-49-anpr-trap | substantive |

## Confirmed FN remediations

| Case | Fix | Pass |
|------|-----|------|
| GOLD-11-021 | mid-word truncation blocked | true |
| GOLD-11-025 | `{{MISSING_ITEM}}` blocked | true |
| GOLD-11-022 | unsafe title withheld on display | true |
| GOLD-11-033 | unsafe title withheld on display | true |
| GOLD-11-029 | neutral blocked banner only | true |

## Solicitor-visible scan

**Pass:** true

## Cross-surface matter-family contradiction contract

**Pass:** true — zero hits across the full v4 corpus

## Contracts

- schema_1_1_0: PASS (1.1.0)
- central_31: PASS (31)
- ledger_untouched: PASS (42=42;55=55)
- v1_preserved: PASS (619f62a2d3408edf)
- v2_preserved: PASS (fcdd13e53f35a61f)
- v3_preserved: PASS (de6d04734c9636e4)
- v4_frozen_total: PASS (43)
- membership_30_50: PASS (43 (target 30-50))
- substantive_eligible_30_50: PASS (43 (target 30-50))
- fn_trunc_021: PASS (canCopy=false)
- fn_placeholder_025: PASS (canCopy=false)
- title_022_withheld: PASS (withheld)
- title_033_withheld: PASS (withheld)
- api_029_neutral_only: PASS (NEUTRAL_SOLICITOR_BLOCKED_BANNER)
- solicitor_visible_scan: PASS (clean)
- contradiction_contract: PASS (zero hits)
- blind_bundle_no_predictions: PASS (predictions excluded)
- human_blank: PASS (AWAITING_HUMAN_GOLD_REVIEW)

All remediation contracts: **true**

## Artefacts

- `artifacts/.../phase-11/` — v1 preserved (read-only)
- `artifacts/.../phase-11-remediation/v2/` — v2 preserved (read-only)
- `artifacts/.../phase-11-remediation/v3/` — v3 preserved (read-only)
- `artifacts/.../phase-11-remediation/v4/` — v4 freeze + blinded renders + workbook
- `artifacts/.../phase-11-remediation/before-after-surfaces-v4/` — per-case surface diffs (v3 → v4)
- `artifacts/.../phase-11-remediation/automated-predictions-v4.json` — separate from blinded bundle
- `artifacts/.../phase-11-remediation/automated-comparison-report-v4.json` — v1→v2→v3→v4 key-gold summary

## Programme PASS

**Not supported.**

## Verification (post-v4)

| Check | Result |
|-------|--------|
| Build | BUILD_OK |
| 31 validator contracts | PASS |
| Phase 8–11 focused + remediation contracts | PASS |
| Phase 10 mutations (re-run) | 30/30 killed (closed phase-10 artefacts restored) |
| Date Vitest | 22/22 |
| TypeScript | 47 (Δ0 vs attributed baseline) |
| Full-corpus family contradiction scan | PASS (0 hits / 43 cases) |
| Solicitor-visible internal-text scan | PASS |
| Blind/prediction separation | PASS (predictions outside blinded bundle) |
| Substantive gold denominator | 43 (within 30–50) |
| Schema | 1.1.0 unchanged |
| Ledger | LEDGER_BALANCED · 72/28 · 42/55 · impact **none** |

## Explicit non-goals

No human judgments filled. No commit. No merge. No deploy. No programme PASS. Stop at remediation checkpoint for independent v4 review.
