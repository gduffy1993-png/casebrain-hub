# Phase 9 checkpoint — N-case corpus

**Status:** CLOSED — **CORPUS_CONTAINMENT_PASS** acknowledged (`4f44530e1`) — **not a final corpus PASS** — **not a programme PASS**  
**Canonical schema:** 1.1.0  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Explicit containment wording

- **Zero assert failures** prove **gate-enforced containment** across the dual-lane run.
- **Blocked does not mean repaired** — fail-closed / integrity-blocked output is not counted as corrected solicitor wording.
- **Full materialised solicitor output was not produced for all 3,000 scale cases** — scale evidence uses MESSY v9 acceptance + controlled-3000 hard-safety + per-identity family containment probes.
- **Phase 11 gold/rendered human FP–FN sign-off remains outstanding** (30–50 gold cases).

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| Every approved fixture (dual-lane) | scale 3000 + materialised 530 (union 3530) |
| Offence-family classification | `classifyTextsAgainstConceptRegistry` per case |
| Canonical matter-state | `buildCanonicalMatterStateV1` + rebuild equality |
| Tab/drawer/copy/export models | chase brief, overview counts, matter VM, 31-surface validator sample, copy/export gates |
| Integrity + cross-surface | fingerprint match; hearing/MG11/chase consistency asserts |
| Failures recorded | `failures.jsonl` (fixtureId, family, surface, ruleId, redacted diagnostic) |
| Cluster by root cause | `failure-clusters.json` |
| Resumable / checkpointed | `run-progress.json` + `--resume` |
| Human FP–FN corpus work | `human-fp-fn-corpus-pack.json` (Phase 11 gold/rendered still required) |

## Contracts

| Check | Result |
|-------|--------|
| dual_lane_denominators | PASS — scale=3000;materialised=530;union=3530 |
| central_surfaces_unchanged_count | PASS — central=31 |
| canonical_schema_1_1_0 | PASS — 1.1.0 |
| phase6_ledger_untouched | PASS — status=LEDGER_BALANCED;72=true;28=true;42=42;55=55 |
| controlled_3000_hard_safety_zero | PASS — hardSafety=0 |
| corpus_run_complete_or_resumable | PASS — completed=3530;planned=3530;resume=false |
| fp_fn_corpus_pack_produced | PASS — samples=32;fpCandidates=74;fnAssertFails=0;limit=null |
| no_case_specific_exception_hooks | PASS — runner has no fixture-id allowlist exceptions |

All contracts pass: **true**  
Corpus assert pass (zero failures): **true** (= containment, not repaired-wording PASS)

## Dual-lane results

| Lane | Denominator | Scanned | Pass all asserts | Notes |
|------|------------:|--------:|-----------------:|-------|
| Scale | 3000 | 3000 | 3000 | probes + messy acceptance (3000 pass / 0 not-passed); **not** full on-disk tab/export models |
| Materialised | 530 | 530 | 530 | full model where output present (500); 30 truth-key only |
| Combined unique | 3530 | 3530 | 3530 | |

## Top failure clusters

| Assert | Rule | Occurrences | Unique cases |
|--------|------|------------:|-------------:|
| (none) | — | 0 | 0 |

## Ledger impact

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | LEDGER_BALANCED | — |
| Prior 72 raw balanced | true | rule-firing occurrences |
| Prior 28 trunc balanced | true | rule-firing occurrences |
| Current 42 raw | 42 | per-string copyable hits |
| Current 55 trunc | 55 | per-string copyable hits |
| Phase 9 impact | **none** | do not mix units |

## Human FP–FN (Phase 9 corpus portion)

| Item | Status |
|------|--------|
| Corpus rates + stratified pack | **RECORDED** (`human-fp-fn-corpus-pack.json`, 32 samples) |
| Final gold/rendered human sign-off | **REMAINS Phase 11** (not claimed here) |

## Before / after verification

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | 47 | 47 (Δ 0) |
| Date Vitest (limitation/riskCopy/Awaab) | 22 pass / 0 fail | 22 pass / 0 fail |
| Branch build | green | BUILD_OK |
| 31 validator contracts | PASS | PASS |
| Phase 8 focused contracts | PASS | PASS |
| Phase 9 focused contracts | PASS | PASS |

See `artifacts/casebrain-qa/integrity-programme/phase-9/before-after-comparison.json`.

## Remaining risks

- Scale lane lacks on-disk full solicitor tab/export models for all 3000 identities — probes + messy acceptance used; generation harness still needed for full wording re-scan
- Human FP–FN final sign-off still requires Phase 11 rendered/gold review (30–50 cases)
- 30 materialised cases lack `casebrain-output.json` (truth-key only)
- Registered pre-existing TS/Vitest remediation items remain (PRE-TS-*, PRE-VITEST-COPY, etc.)

## Proposed next step

Phase 10 — mutation and adversarial injection tests (truncated, wrong-family, conflicting counts/states, ambiguous hearing dates, mixed families) proving unsafe output remains blocked. Do not merge/deploy.

## Closure

Phase 9 checkpoint acknowledged as CORPUS_CONTAINMENT_PASS (not final corpus/programme PASS). Proceed to Phase 10.

## Explicit non-goals

No merge. No deploy. No Phase 10+. No final corpus PASS. No whole-programme PASS. Stop here for review.

Artefact: `artifacts/casebrain-qa/integrity-programme/phase-9/phase9-n-case-corpus-report.json`
