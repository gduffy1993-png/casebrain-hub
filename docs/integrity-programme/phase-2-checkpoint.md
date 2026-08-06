# Phase 2 checkpoint — fail-closed containment

**Status:** CONTAINMENT COMPLETE for inventoried wording exits — not a corpus PASS  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Corpus-count clarification (canonical)

| Metric | Count | Meaning |
|--------|------:|---------|
| **N_approved_scale3000** | **3000** | Unique generated scale caseIds (messy v9 identity list) |
| **N_materialised** | **530** | On-disk ESA truth-key folders |
| **N_union** | **3530** | Deduped scale ∪ materialised IDs |
| Exact ID overlap | 0 | Materialised name == scale caseId |
| Materialised as scale sourceCaseId | 30 | Template backing |
| **Unique-fixture denominator for final pass rates** | **3000** | N_approved_scale3000 — unique messy v9 caseId identities (generated from demo-audit templates) |

Generated = scale3000 variants. Materialised = on-disk truth keys. Overlap is mostly via `sourceCaseId`, not identical IDs.

## Baseline by channel

| Channel | Count |
|---------|------:|
| raw_source_fixture_only | 0 |
| internal_structured_state | 160 |
| visible_ui_output | 2804 |
| copyable_output | 155 |
| exportable_api_output | 0 |
| **Source-only (not user-visible)** | **160** |
| **User-visible / copy / API** | **2959** |

Raw markers inside source documents alone are **not** treated as escape failures.

## Wrong-family policy

- `unsupported_template_leakage` → block
- `source_backed_ok` (explicit evidence support) → allow (mixed cases)

## Surfaces newly gated (central)

Central module: `lib/criminal/solicitor-output-gate.ts` + `lib/criminal/gated-json-response.ts`

- API wording exits via `gatedJsonResponse` / defence-plan-chat `jsonWithRoute` hook
- Client explanation copy
- Overview advanced panel deep gate
- (Prior) War Room drafts, papers deep, summary workspace, copy-safe, export builder

## Remaining ungated / justified none

- Deferred: (none)
- None (no wording): case_file_zone, api_export_review

## Central vs endpoint-specific

- **Central:** rule evaluation + `integrity_blocked` typed payload
- **Endpoint-specific:** one-line call to `gatedJsonResponse(surfaceId, payload)` at success exit (no per-endpoint rule logic)

## Tests

| Result | Count |
|--------|------:|
| Block assertions | 5 |
| Pass assertions | 6 |
| `solicitor-output-gate.test.ts` | PASS |
| `solicitor-output-integrity.test.ts` | PASS |

Compatibility: sentence-clean API replies without family context still pass; source-backed mixed-family concepts are not blocked; typed `integrity_blocked` returns HTTP 200 (not 500).

See `scripts/solicitor-output-gate.test.ts`.

## Explicit non-goals this checkpoint

No broad wording cleanup. No merge. No deploy. No Phase 3+ canonical model rewrite beyond containment.
