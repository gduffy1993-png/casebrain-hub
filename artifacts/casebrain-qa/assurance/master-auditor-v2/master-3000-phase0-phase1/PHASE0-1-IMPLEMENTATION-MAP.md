# CaseBrain master 3,000 quality programme — Phase 0/1 implementation map

Generated: 2026-08-19T03:39:32.226Z

## Baseline

- Branch: `programme/real-pdf-live-pilot-v1`
- HEAD: `c93f155f5c4c46d8375208bce93e45eb84e0ec13`
- Subject: `fix(ui): preserve provisional chase deadline limits`
- Prompt baseline match: **true**
- Tracked dirty files: **0**
- Untracked scratch files: **2** (left untouched)

## What this phase did

This checkpoint deliberately performed **Phase 0 and Phase 1 only**.

It did **not** run the 3,000-case corpus, did **not** alter product behaviour, and did **not** claim CaseBrain is globally correct.

The output is the reusable map needed before Phase 2 builds the shared audit model.

## Existing systems to reuse

### MAA V2 registry, controls and staged calibration artefacts

- Files found: **1049** (1049 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse as control authority and historical denominator evidence. Do not replace with a fresh parallel truth system.
- Gap: Needs a wrapper that reports exercised/not_exercised by taxonomy and severity across future corpus tiers.
- Representative files:
- scripts/assurance/emit-maa-v2-every-word-foundation.ts
- scripts/assurance/emit-maa-v2-execution-readiness.ts
- scripts/assurance/emit-maa-v2-integrated-denominator-stop.ts
- scripts/assurance/emit-maa-v2-registry.ts
- scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts
- scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts
- scripts/assurance/emit-maa-v2-stage150-batch10.ts
- scripts/assurance/emit-maa-v2-stage150-batch2.ts
- scripts/assurance/emit-maa-v2-stage150-batch3-fid10-source-review.ts
- scripts/assurance/emit-maa-v2-stage150-batch3.ts
- scripts/assurance/emit-maa-v2-stage150-batch4.ts
- scripts/assurance/emit-maa-v2-stage150-batch5.ts

### Source-truth guardians and live UI wording regressions

- Files found: **18** (18 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse for high-value invariants: unsupported promotion, family firewall, provisional deadlines, selected-case route.
- Gap: Needs a shared failure-result schema and severity classification so discoveries become comparable audit rows.
- Representative files:
- scripts/bundle-truth-ledger.test.ts
- scripts/chase-source-gate.test.ts
- scripts/emit-truth-safety-hardening-report.ts
- scripts/live-ui-wording-regression.test.ts
- scripts/pilot-workflow-profile.test.ts
- scripts/source-truth-guardian.test.ts
- scripts/truth-safety-hardening-regression.test.ts
- lib/criminal/bundle-truth-ledger.ts
- lib/criminal/chase-source-gate.ts
- lib/criminal/source-truth-guardian/fingerprint.ts
- lib/criminal/source-truth-guardian/guardian.ts
- lib/criminal/source-truth-guardian/index.ts

### Stage-3000 parallel audit/controller libraries

- Files found: **58** (58 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse for sharding, blinding, receipts, hashes, checkpoints, root-cause dedupe and machine-readable audit runs.
- Gap: Needs connection to the current product canonical-state invariants before broad 3,000 reruns.
- Representative files:
- scripts/assurance/emit-stage3000-parallel-audit-fixtures.ts
- scripts/stage3000-parallel-audit-contracts.test.ts
- scripts/stage3000-parallel-controller/run-controller.ts
- scripts/stage3000-parallel-controller/stage3000-parallel-controller-contracts.test.ts
- lib/eval/stage3000-parallel-audit/affected-rerun.ts
- lib/eval/stage3000-parallel-audit/candidate-freeze.ts
- lib/eval/stage3000-parallel-audit/checkpoint.ts
- lib/eval/stage3000-parallel-audit/constants.ts
- lib/eval/stage3000-parallel-audit/decision-card.ts
- lib/eval/stage3000-parallel-audit/evidence-layout.ts
- lib/eval/stage3000-parallel-audit/exercise-status.ts
- lib/eval/stage3000-parallel-audit/fast-checks.ts

### Accepted V2.1.2 clean single-writer diverse-3000 evidence

- Files found: **457** (457 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse as accepted clean single-writer lineage and frozen evidence record.
- Gap: Coverage limitation remains: 17/361 controls; browser not exercised; PDF lane not genuine output for all cases.
- Representative files:
- scripts/assurance/stage3000-diverse-second/audit-v1-semantic-diversity.ts
- scripts/assurance/stage3000-diverse-second/build-v2-packs.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1-pilot-20.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.1-remediation.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.2-remediation.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.3-remediation.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.4-audit-semantics.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.4.1-exact-provenance.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.4.2-visible-fail-closed.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.4.3-professional-semantic.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1.4.4-ordinary-exit-system-language.ts
- scripts/assurance/stage3000-diverse-second/build-v212-acceptance-correction-manifest.ts

### Real-PDF live pilot v1 and authenticated-preview QA lane

- Files found: **117** (77 tracked, 40 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse for real local production-builder path, 20 real PDFs, wording/raster checks, and entitlement/auth preview lessons.
- Gap: Scale is limited: 20 matters; authenticated HTTP/browser remains not_exercised unless the user opens/authorises session.
- Representative files:
- scripts/assurance/real-pdf-live-pilot/build-acceptance-audit.ts
- scripts/assurance/real-pdf-live-pilot/build-commit-scope-manifest.ts
- scripts/assurance/real-pdf-live-pilot/freeze-membership.ts
- scripts/assurance/real-pdf-live-pilot/output-pdf-raster-checks.ts
- scripts/assurance/real-pdf-live-pilot/pdf-materialise.ts
- scripts/assurance/real-pdf-live-pilot/pilot-20-definition.ts
- scripts/assurance/real-pdf-live-pilot/priority-control-map.ts
- scripts/assurance/real-pdf-live-pilot/run-real-pdf-live-pilot.ts
- scripts/assurance/real-pdf-live-pilot/wording-triage.ts
- scripts/assurance/stage3000-diverse-second/build-v2.1-pilot-20.ts
- lib/criminal/canonical-live-surface-adapter.ts
- artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/all-exit-matrix.json

### Canonical product state / criminal workflow modules

- Files found: **509** (509 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse and harden as source of product truth; fixes should land here only when lineage proves product-root cause.
- Gap: Needs explicit canonical-state audit model for evidence state, provenance family, stage, certainty ceiling and counters.
- Representative files:
- scripts/assurance/stage3000-diverse-second/v2.1.4.2-solicitor-visible-wording.ts
- scripts/chase-source-gate.test.ts
- scripts/disclosure-chase-finalize.test.ts
- scripts/solicitor-visible-boundary.test.ts
- scripts/solicitor-visible-evidence-view.test.ts
- lib/eval/master-assurance-auditor/v2/stage300/essential/solicitor-visible-inventory.ts
- lib/criminal/absolute-proof-wording.ts
- lib/criminal/advice-change-radar/build-advice-change-radar.ts
- lib/criminal/advice-change-radar/build-matter-evidence-snapshot.ts
- lib/criminal/advice-change-radar/index.ts
- lib/criminal/advice-change-radar/types.ts
- lib/criminal/aggressive-defense-engine.ts

### Corpus, gold-set and historical audit materials

- Files found: **54** (54 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse for stratification candidates and historical failure examples; do not treat generated CaseBrain output as ground truth.
- Gap: Needs formal gold/holdout designation with independent truth provenance before claiming broad solicitor confidence.
- Representative files:
- scripts/assurance/emit-maa-v2-stage300-new-150-control-coverage.ts
- scripts/assurance/emit-maa-v2-stage3000-existing-census.ts
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/auditor-independence-report.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/brain1-guardian-blob-compare.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/capability-snapshot-summary.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/capability-snapshots-index.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/changed-file-manifest.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/checkpoint-150.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/checkpoint-20.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/checkpoint-5.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/cost-retention-report.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/DECISION-CARD.md

### Browser/rendered UI and screenshot-oriented tooling

- Files found: **6** (6 tracked, 0 scratch/untracked-or-untracked-by-map)
- Reuse: Reuse as provisional live/rendered evidence where sessions are available.
- Gap: Browser lane is not a substitute for deterministic source-truth auditing and remains separate from corpus PASS.
- Representative files:
- scripts/assurance/real-pdf-live-pilot/output-pdf-raster-checks.ts
- scripts/proof-map-screenshot.ts
- artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/browser-workflow-report.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/output-pdf-raster-acceptance.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/output-pdf-raster-results.json
- artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1-historical-pre-wording-remediation/browser-workflow-report.json


## Main gaps before broad corpus work

- **coverage_reporting_gap** (P1, Phase 2) — One canonical coverage registry that reports exercised/not_exercised/unavailable by taxonomy category and run tier.
- **machine_result_schema_gap** (P1, Phase 2) — Shared audit result envelope: runId, commit, caseId, invariantId, taxonomy, severity, surface, sourceRef, expected, actual, rootCluster.
- **canonical_state_comparator_gap** (P1, Phase 3) — Programmatic comparator for Overview/Court/Papers/Client/CPS Chase/File against one canonical evidence-state model.
- **gold_holdout_formalisation_gap** (P1, Phase 4) — Stratified Gold 150-250 and Holdout 50-100 plan with independent truth provenance and unresolved labels.
- **browser_pdf_lane_gap** (P2/P1, Phase 9) — Rendered UI/browser representative subset after core invariants; PDF output proof separated from source PDF copies.
- **security_tenant_lane_gap** (P0 planned, Phase 2/9 separate lane) — Separate security auditor plan for auth, tenant isolation, signed URLs, case ID enumeration, route protection.

## Phase 2 next step

Build the core reusable audit model:

1. failure taxonomy and severity enums;
2. machine-readable audit result envelope;
3. invariant registry;
4. coverage tracker for 361 controls;
5. tiered runner interface;
6. failure clustering and sibling search hooks.

Only use a small development sample until the model proves deterministic.

## Non-claims

- No full 3,000 run.
- No corpus PASS.
- No Stage-3000 completion.
- No programme PASS.
- No solicitor approval.
- No browser-lane PASS.
