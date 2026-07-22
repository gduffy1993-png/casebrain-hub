# Phase 11 remediation v5 checkpoint

**Status:** REMEDIATION_V5_COMPLETE — **AWAITING_HUMAN_GOLD_REVIEW** — **not a programme PASS**  
**v1 freeze (preserved):** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**v2 freeze (preserved):** `fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0`  
**v3 freeze (preserved):** `de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767`  
**v4 freeze (preserved):** `d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883`  
**v5 freeze:** `3e2479c86769e3cd5342903997eaa548cfdc98a8339a34d0890bfc0178536f5d`  
**Schema:** 1.1.0 · **Central surfaces:** 31 · **Ledger impact:** none  
**programmePassSupported:** false

## Explicit

- v1, v2, v3 and v4 sample, hash, renders, and reports are **unchanged historical evidence** (read-only).
- v5 membership is **byte-identical to v4** (43 goldIds/fixtures — the v1 33 + GOLD-11-034..043): 0 additions, 0 removals. Only the freeze hash (version tag + parentV4FreezeHash) and the render/scan discipline change.
- v4's scan MISSED a blocking false negative: GOLD-11-039 (CASE-12, historic sexual ABE) rendered a copyable ("canCopy": true) client_summary cut off mid-disclaimer ("...Not for court or CPS us"). v5 fixes both the render (mandatory sanitize→boundary→assert→gate on every copyable prose surface) and the scan (reads full rendered JSON, not markdown previews, across the whole corpus including GOLD-11-034..043).
- No human judgments filled. No invented sign-off. No merge/deploy/programme PASS.
- Blocked ≠ repaired.

## Membership

| Metric | Value |
|--------|------:|
| v1 IDs retained (lineage) | 33 |
| Carried forward unchanged from v4 (gold-manual additions) | 10 |
| Additions in v5 | 0 |
| Removals in v5 | 0 |
| Total v5 sample | 43 |
| Substantive eligible | 43 |
| Insufficient source context (excluded) | 0 |
| Unique fixtures | 40 |
| Duplicate fixtures (carried from v1) | cb-found-2003-nguyen×3, cb-fresh-002-jordan-hale×2 |

**v5 membership policy:** v5 CARRIES FORWARD the exact same 43 v4 goldIds/fixtures UNCHANGED (the v1 33 for lineage + the 10 gold-manual additions GOLD-11-034..043 from v4). Zero additions, zero removals. Membership is byte-identical to v4; only the render discipline (mandatory sanitize→boundary→assert→gate for every copyable prose surface) and the scan (full rendered-JSON boundary probe across the whole corpus, including GOLD-11-034..043) differ. v1, v2, v3 and v4 artefacts preserved read-only.

## GOLD-11-039 — the case that exposed the v4 miss

| Field | v4 (before) | v5 (after) |
|-------|-------------|------------|
| client_summary gateStatus | display | boundary_blocked |
| client_summary canCopy | true | false |
| client_summary text length | 693 (cut mid-disclaimer) | 178 |
| client_summary tail | `...Not for court or CPS us` | `...wording) and must not be copied until corrected.` |

**Not copyable-truncated (fn_039):** true

## Confirmed FN remediations (carried forward)

| Case | Fix | Pass |
|------|-----|------|
| GOLD-11-021 | mid-word truncation blocked | true |
| GOLD-11-025 | `{{MISSING_ITEM}}` blocked | true |
| GOLD-11-022 | unsafe title withheld on display | true |
| GOLD-11-033 | unsafe title withheld on display | true |
| GOLD-11-029 | neutral blocked banner only | true |
| GOLD-11-039 | client_summary no longer copyable-truncated | true |

## Solicitor-visible scan (fixture / enum / placeholder — full text, unchanged design)

**Pass:** true

## Copyable-surface boundary-truncation scan (v5 repair — reads full rendered JSON)

**Pass:** true — zero hits across 102 copyable prose surfaces in 43 cases

## Cross-surface matter-family contradiction contract

**Pass:** true — zero hits across the full v5 corpus

## Contracts

- schema_1_1_0: PASS (1.1.0)
- central_31: PASS (31)
- ledger_untouched: PASS (42=42;55=55)
- v1_preserved: PASS (619f62a2d3408edf)
- v2_preserved: PASS (fcdd13e53f35a61f)
- v3_preserved: PASS (de6d04734c9636e4)
- v4_preserved: PASS (d887114aac265e00)
- v5_frozen_total: PASS (43)
- membership_identical_to_v4: PASS (0 additions, 0 removals (43))
- membership_30_50: PASS (43 (target 30-50))
- substantive_eligible_30_50: PASS (43 (target 30-50))
- fn_trunc_021: PASS (canCopy=false)
- fn_placeholder_025: PASS (canCopy=false)
- title_022_withheld: PASS (withheld)
- title_033_withheld: PASS (withheld)
- api_029_neutral_only: PASS (NEUTRAL_SOLICITOR_BLOCKED_BANNER)
- fn_039_client_summary_not_truncated: PASS (canCopy=false;len=178;tail=" and must not be copied until corrected.")
- solicitor_visible_scan: PASS (clean)
- copyable_boundary_scan: PASS (clean (102 prose surfaces across 43 cases))
- contradiction_contract: PASS (zero hits)
- blind_bundle_no_predictions: PASS (predictions excluded)
- human_blank: PASS (AWAITING_HUMAN_GOLD_REVIEW)

All remediation contracts: **true**

## Artefacts

- `artifacts/.../phase-11/` — v1 preserved (read-only)
- `artifacts/.../phase-11-remediation/v2/` — v2 preserved (read-only)
- `artifacts/.../phase-11-remediation/v3/` — v3 preserved (read-only)
- `artifacts/.../phase-11-remediation/v4/` — v4 preserved (read-only)
- `artifacts/.../phase-11-remediation/v5/` — v5 freeze + blinded renders + workbook
- `artifacts/.../phase-11-remediation/before-after-surfaces-v5/` — per-case surface diffs (v4 → v5)
- `artifacts/.../phase-11-remediation/automated-predictions-v5.json` — separate from blinded bundle
- `artifacts/.../phase-11-remediation/automated-comparison-report-v5.json` — v1→v2→v3→v4→v5 key-gold summary
- `artifacts/.../phase-11-remediation/fixed-length-wording-operations-v5.json` — disposition of fixed-length-slice sites across the codebase

## Programme PASS

**Not supported.**

## Verification (post-v5)

| Check | Result |
|-------|--------|
| Build | BUILD_OK |
| 31 validator contracts | PASS |
| Phase 8–11 + boundary regressions | PASS |
| Mutations (incl. M10-TRUNC-600) | 31/31 killed |
| Date Vitest | 22/22 |
| TypeScript | 47 (Δ0) |
| Full-text solicitor-visible scan (43 cases) | PASS |
| Copyable boundary / truncation scan | PASS (102 surfaces) |
| Family contradiction | PASS (0) |
| Blinding / predictions separated | PASS |
| Substantive denominator | 43 (30–50) |
| GOLD-11-039 client_summary | boundary_blocked · canCopy=false |
| Schema / ledger | unchanged |

## Explicit non-goals

No human judgments filled. No commit. No merge. No deploy. No programme PASS. Stop at remediation checkpoint for independent v5 review.
