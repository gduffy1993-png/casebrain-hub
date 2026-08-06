# Phase 11 remediation v6 checkpoint

**Status:** REMEDIATION_V6_COMPLETE — **AWAITING_HUMAN_GOLD_REVIEW** — **not a programme PASS**  
**v1 freeze (preserved):** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**v2 freeze (preserved):** `fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0`  
**v3 freeze (preserved):** `de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767`  
**v4 freeze (preserved):** `d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883`  
**v5 freeze (preserved):** `3e2479c86769e3cd5342903997eaa548cfdc98a8339a34d0890bfc0178536f5d`  
**v6 freeze:** `f41a0fc688bee60f6ffd32a4a24d45d69203f799931cd7142f603dca461c38fd`  
**Schema:** 1.1.0 · **Central surfaces:** 31 · **Ledger impact:** none  
**programmePassSupported:** false

## Explicit

- v1, v2, v3 and v4 sample, hash, renders, and reports are **unchanged historical evidence** (read-only).
- v5 membership is **byte-identical to v4** (43 goldIds/fixtures — the v1 33 + GOLD-11-034..043): 0 additions, 0 removals. Only the freeze hash (version tag + parentV5FreezeHash) and the render/scan discipline change.
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

**v5 membership policy:** v6 CARRIES FORWARD the exact same 43 v5/v4 goldIds/fixtures UNCHANGED. Zero additions, zero removals. Membership is byte-identical to v5; v6 substantively repairs GOLD-11-039 from structured client-summary semantic units (containment ≠ repair), expands copyable quality contracts, and preserves v1–v5 read-only.

## GOLD-11-039 — the case that exposed the v4 miss

| Field | v4 (before) | v5 (after) |
|-------|-------------|------------|
| client_summary gateStatus | display | ok |
| client_summary canCopy | true | true |
| client_summary text length | 693 (cut mid-disclaimer) | 592 |
| client_summary tail | `...Not for court or CPS us` | `...e state: provisional. Not for court or CPS use.]` |

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

**Pass:** true — zero hits across 107 copyable prose surfaces in 43 cases

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
- v5_preserved: PASS (3e2479c86769e3cd)
- v6_frozen_total: PASS (43)
- membership_identical_to_v5: PASS (0 additions, 0 removals (43))
- membership_identical_to_v4: PASS (0 additions, 0 removals (43))
- membership_30_50: PASS (43 (target 30-50))
- substantive_eligible_30_50: PASS (43 (target 30-50))
- fn_trunc_021: PASS (canCopy=false)
- fn_placeholder_025: PASS (canCopy=false)
- title_022_withheld: PASS (withheld)
- title_033_withheld: PASS (withheld)
- api_029_neutral_only: PASS (NEUTRAL_SOLICITOR_BLOCKED_BANNER)
- fn_039_client_summary_not_truncated: PASS (canCopy=true;len=592;tail=" provisional. Not for court or CPS use.]")
- fn_039_client_summary_substantively_repaired: PASS (canCopy=true;len=592;semantic_units=pass)
- fn_039_v5_blocked_preserved: PASS (v5 canCopy=false retained as historical evidence)
- copyable_quality_scan: PASS (clean (213 copyable surfaces))
- solicitor_visible_scan: PASS (clean)
- copyable_boundary_scan: PASS (clean (107 prose surfaces across 43 cases))
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
- `artifacts/.../phase-11-remediation/before-after-surfaces-v6/` — per-case surface diffs (v4 → v5)
- `artifacts/.../phase-11-remediation/automated-predictions-v6.json` — separate from blinded bundle
- `artifacts/.../phase-11-remediation/automated-comparison-report-v6.json` — v1→v2→v3→v4→v5 key-gold summary
- `artifacts/.../phase-11-remediation/fixed-length-wording-operations-v6.json` — disposition of fixed-length-slice sites across the codebase

## Programme PASS

**Not supported.**

## Explicit non-goals

No human judgments filled. No commit. No merge. No deploy. No programme PASS. Stop at remediation checkpoint for independent v5 review.
