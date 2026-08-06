# Codex V2.1.2 Post-Commit Scope Reconciliation

## Scope

Post-commit scope reconciliation only for acceptance packaging commit `d0fdda995`.

- Commit: `d0fdda995012a31c2793b23db837d4f6ba7529fe`
- Parent: `0326cc44a724c01aeab162eed8b8806dd8a44345`
- Does **not** amend, force-push, rerun V2.1.2, or modify frozen evidence
- Does **not** claim the original additive scope had zero extras

## Counts

| Set | Count |
|-----|------:|
| Original declared commit scope (intendedCommit paths + manifest + digest) | 56 |
| Actual Git paths in `d0fdda995` | 57 |
| Missing expected paths | 0 |
| Undeclared extras | 1 |

## Undeclared extra

- Path: `scripts/assurance/stage3000-diverse-second/build-v212-acceptance-correction-manifest.ts`
- SHA-256: `3c7d62afdf922ab3ce0b5d247e80d977b32e6f961639a7dc5bafbcbda635de72`
- Byte length: 14054
- Classification: `manifest_generation_source`

## Original additive manifest

- Path: `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST.json`
- Detached digest path: `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST-DIGEST.json`
- Manifest SHA-256: `652282d58a506020947a661efca3c1c26bdcd37b357157ec9cde2680072a0e4b`
- Status: **byte-identical** to the blob in commit `d0fdda995`
- This reconciliation does **not** rewrite the original additive manifest or digest

## Actual 57 Git paths

- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/CHILD-ACCEPTANCE-CONTRACT-V2.1.2.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/LOCKED-ACCEPTANCE-CONTRACT-RESTORE-RECEIPT.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.1-RACE-TAINTED-HISTORICAL.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-DETERMINISM-CONTRACT.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-PREFLIGHT-VERIFICATION.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-PRODUCTION-VS-HARNESS-HONESTY.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CANONICAL-FREEZE-RECEIPT.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CLASSIFICATION.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST-DIGEST.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-CORRECTION.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/CODEX-V2.1.2-ACCEPTANCE-CORRECTION.md`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/DECISION-CARD.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/PRE-TRUTH-FREEZE-RECEIPT.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/STOP.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/audit-accounting.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/brain1-guardian-authority-receipt.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/candidate-findings.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/candidate-freeze-hash.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/candidate-freeze-meta.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/charge-partition-3000.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-1000.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-150.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-20.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-300.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-3000.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-50.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/checkpoint-receipts.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/control-exercise-receipts.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/control-gap-register-361.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/control-receipt-accounting.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/document-state-split-report.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/exact-manifest-digest.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/exact-manifest.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/ordered-child-membership-hash.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/ordered-child-membership.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/output-hashes.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/pdf-accounting.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/pdf-subset-register.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/programme-start.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/single-process-preflight.json`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/source-packet-hashes.jsonl`
- `artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2/truth-open-summary.json`
- `lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors.ts`
- `lib/eval/master-assurance-auditor/v2/stage150/batch3-detectors.ts`
- `lib/eval/master-assurance-auditor/v2/stage150/detectors.ts`
- `lib/eval/master-assurance-auditor/v2/stage150/evidence-dimension-domain-registry.ts`
- `scripts/assurance/stage3000-diverse-second/build-v212-acceptance-correction-manifest.ts`
- `scripts/assurance/stage3000-diverse-second/diverse-second-bnd-mixed-replacement-contracts.ts`
- `scripts/assurance/stage3000-diverse-second/diverse-second-wrd04-adversarial-contracts.ts`
- `scripts/assurance/stage3000-diverse-second/prepare-v2.1.2-clean-input.ts`
- `scripts/assurance/stage3000-diverse-second/run-diverse-second-realistic-child-v2.1.2.ts`
- `scripts/assurance/stage3000-diverse-second/v2.1.2-determinism-contract.ts`
- `scripts/assurance/stage3000-diverse-second/v2.1.2-freeze-sequence-contracts.ts`
- `scripts/assurance/stage3000-diverse-second/v2.1.2-run-authority-contracts.ts`
- `scripts/assurance/stage3000-diverse-second/v2.1.2-run-authority.ts`
- `tsconfig.v212.json`

## Explicit non-claims

No corpus PASS, Stage-3000 completion, programme PASS, solicitor approval, global zero-defect, merge, or deploy claim is made by this reconciliation.
