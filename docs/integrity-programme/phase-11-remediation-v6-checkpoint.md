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

- v1–v5 sample, hash, renders, and reports are **unchanged historical evidence** (read-only).
- v6 membership is **byte-identical to v5/v4** (43 goldIds/fixtures): 0 additions, 0 removals.
- **Containment ≠ repair.** v5 correctly blocked GOLD-11-039 (`boundary_blocked` / `canCopy=false`). v6 regenerates the complete client summary from structured `client-summary.json` semantic units and only sets `canCopy=true` when the complete output is safe.
- No human judgments filled. No invent sign-off. No commit/push/merge/deploy/programme PASS.

## Membership

| Metric | Value |
|--------|------:|
| Total v6 sample | 43 |
| Substantive eligible | 43 |
| Insufficient source context | 0 |
| Additions / removals vs v5 | 0 / 0 |

## GOLD-11-039 — substantive repair (not containment)

| Field | v5 (historical containment) | v6 (after) |
|-------|-----------------------------|------------|
| client_summary gateStatus | boundary_blocked | ok |
| client_summary canCopy | false | true |
| client_summary length | 178 (blocked preview) | 592 (complete) |
| client_summary tail | blocked Item/Status/Reason | `...Not for court or CPS use.]` |
| Semantic units vs structured source | n/a (blocked) | pass |
| v5 blocked artefact preserved | — | yes (read-only) |

Source: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/client-summary.json`  
Also required mapping `sexual_offences` → solicitor violence family so the gate does not fail-closed on a complete, family-valid summary.

## Wording regressions (shared composition — not gold-ID patches)

| Case | Fix |
|------|-----|
| GOLD-11-007 / 009 | Further-papers template → natural prose; no second “still chase” fragment |
| GOLD-11-003 / 006 / 011 | BWV/footage pipe/em-dash fragment → natural prose |
| GOLD-11-038 | Doubled space before `(youth — 17 years)` removed |
| GOLD-11-040 | SFR preserved on chase drafts and other surfaces |
| GOLD-11-043 | ANPR preserved on chase drafts and other surfaces |

## Quality contracts (all copyable solicitor-visible strings)

Checks: subject–verb template defects; duplicated “on the file … on the current file”; doubled spaces; double-appended em-dash clauses; pipe-delimited fragments; protected acronyms (MG5, MG6, MG11, BWV, ABE, PACE, SFR, ANPR, CPS, CCTV, DVLA).

**copyable_quality_scan:** PASS (213 copyable surfaces)

## Contracts

All remediation contracts: **true** (27), including:

- `fn_039_client_summary_substantively_repaired`
- `fn_039_v5_blocked_preserved`
- `copyable_quality_scan`
- membership identical to v5 and v4
- v1–v5 preserved
- boundary / contradiction / solicitor-visible scans

## Artefacts

- `artifacts/.../phase-11-remediation/v6/` — freeze + blinded renders + workbook
- `artifacts/.../phase-11-remediation/before-after-surfaces-v6/` — v5 → v6 diffs
- `artifacts/.../phase-11-remediation/automated-predictions-v6.json` — separate from blinded bundle
- `docs/integrity-programme/phase-11-remediation-v6-checkpoint.md` — this file

## Verification (post-v6)

| Check | Result |
|-------|--------|
| Build | BUILD_OK |
| 31 validator contracts | PASS |
| Phase 8–11 + boundary regressions | PASS |
| Mutations (incl. M10-TRUNC-600) | 31/31 killed |
| Date Vitest | 22/22 |
| TypeScript | 47 (Δ0 vs v5 baseline) |
| PRE-VITEST-COPY | still failing (visible, not waived) |
| Full-text solicitor-visible scan (43 cases) | PASS |
| Copyable boundary / truncation scan | PASS (107 surfaces) |
| Copyable quality scan | PASS (213 surfaces) |
| Family contradiction | PASS (0) |
| Blinding / predictions separated | PASS |
| Substantive denominator | 43 (30–50) |
| GOLD-11-039 client_summary | ok · canCopy=true · complete disclaimer · semantic units pass |
| Schema / ledger | unchanged |

## Programme PASS

**Not supported.**

## Explicit non-goals

No human judgments filled. No commit. No push. No merge. No deploy. No programme PASS. Stop at remediation checkpoint for independent v6 review.
