# Phase 11 checkpoint — rendered coverage & gold human FP–FN review

**Status:** **AWAITING_HUMAN_GOLD_REVIEW** — freeze + solicitor-visible renders complete — **not a corpus PASS** — **not a programme PASS**  
**Canonical schema:** 1.1.0  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)  
**Freeze hash:** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`

## Explicit wording

- Sample membership was **frozen and versioned before** any human judgments.
- Automated predictions are **separate** from human judgments and are **not** solicitor sign-off.
- Cursor / AI / developer alone **must not** impersonate independent qualified human review.
- **Blocked ≠ repaired** — containment is not substantive wording correctness.
- Programme PASS is **not supported** until qualified human gold review completes and any safety-relevant FN is cleared under independent re-review + separate authorization.

## Frozen sample

| Metric | Value |
|--------|------:|
| Sample size | 33 |
| Size band | 30–50 |
| Freeze version | phase11-gold-sample-v1 |
| Freeze hash | `619f62a2d3408edf05cdb3e5…` |

### Selection method

- Seed from Phase 9 human-fp-fn-corpus-pack strata (clean_pass, possible_fp_overblock, uncertain_family).
- Add gold-manual-proof-set-v1 CASE packets with solicitor-facing actual-summary renders.
- Add controlled synthetic renders for omission/truncation, review-required, hearing/time, copy/export/API, offence-family leak, provenance.
- Freeze sample definition (ids+strata+reasons) with content hash BEFORE writing human judgment slots.
- Automated predictions written to a separate artefact; human workbook starts empty (null judgments).

### Stratum counts

| Stratum | n |
|---------|--:|
| accepted_clean | 5 |
| blocked_containment | 5 |
| composed_prose | 2 |
| copy_export_api | 3 |
| hearing_time | 4 |
| offence_family | 2 |
| omission_truncation | 3 |
| provenance | 3 |
| review_required | 2 |
| uncertain_family | 4 |

## Rendered evidence

| Metric | Value |
|--------|------:|
| Cases rendered | 33 |
| Surfaces rendered | 234 |
| Render dir | `artifacts/.../phase-11/rendered/` |
| Browser ≥100 walkthrough claimed | **no** |

## Human-review completion status

| Item | Status |
|------|--------|
| Workbook | `human-judgment-workbook.json` |
| Human judgments recorded | **0 / 33** |
| Reviewer identity / role / date | **null** (awaiting) |
| Disagreements / adjudications / exclusions | none recorded |
| Unresolved | all 33 gold ids |
| Sign-off | **AWAITING_HUMAN_GOLD_REVIEW** |

## FP / FN results

| Metric | Value | Denominator |
|--------|------:|-------------|
| Human FP count | 0 | humanReviewed=0 |
| Human FN count | 0 | humanReviewed=0 |
| Human FP rate | n/a (no human reviews) | — |
| Human FN rate | n/a (no human reviews) | — |
| Safety-relevant FN | 0 (none human-confirmed; gate open until review) | — |

Automated hypotheses only (not sign-off): FP-overblock=11; FN-leak=3; neither=10; uncertain=9.

### Confidence limitations

- No qualified human/solicitor gold judgments recorded in this checkpoint.
- Automated predictions are hypotheses for reviewer assistance only.
- Blocked ≠ repaired remains in force.
- Full ≥100 browser walkthrough not claimed here.

## Contracts

| Check | Result |
|-------|--------|
| schema_1_1_0_preserved | PASS — 1.1.0 |
| central_surfaces_31 | PASS — central=31 |
| phase6_ledger_untouched | PASS — status=LEDGER_BALANCED;42=42;55=55 |
| gold_sample_frozen_30_50 | PASS — n=33;hash=619f62a2d340 |
| all_strata_represented | PASS — {"accepted_clean":5,"blocked_containment":5,"uncertain_family":4,"offence_family":2,"provenance":3,"hearing_time":4,"composed_prose":2,"omission_truncation":3,"review_required":2,"copy_export_api":3} |
| renders_exist_for_every_sample | PASS — rendered=33 |
| automated_predictions_separated | PASS — automated-predictions.json present; human workbook separate |
| human_workbook_awaiting_signoff | PASS — humanReviewed=0;status=AWAITING_HUMAN_GOLD_REVIEW |
| no_fabricated_human_signoff | PASS — all human judgment fields null |
| blocked_not_equated_to_repaired_in_automation | PASS — automation never claims blocked==repaired |

All Phase 11 freeze/render contracts pass: **true**  
Human gold review complete: **false**  
Programme PASS supported: **false**

## Ledger impact

| Metric | Value |
|--------|-------|
| Phase 6 status | LEDGER_BALANCED |
| 72/28 balanced | true/true (rule-firing units) |
| 42/55 counts | 42/55 (per-string units) |
| Phase 11 impact | **none** |

## Before / after verification

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | 47 | 47 (Δ 0) |
| Date Vitest | 22 pass / 0 fail | 22 pass / 0 fail |
| Branch build | green | BUILD_OK |
| 31 validator contracts | PASS | PASS |
| Phase 8 / 9 / 10 focused contracts | PASS | PASS |
| Phase 11 focused contracts | PASS (AWAITING_HUMAN_GOLD_REVIEW) | PASS |
| Registered PRE-VITEST-COPY sample | failing (registered) | still failing (not waived) |

See `artifacts/casebrain-qa/integrity-programme/phase-11/before-after-comparison.json`.

## Diff / evidence artefacts

| Path | Role |
|------|------|
| `scripts/integrity-programme/phase11-rendered-gold-review.ts` | Freeze + render + workbook runner |
| `scripts/phase11-rendered-gold-review.test.ts` | Focused contracts |
| `gold-sample-frozen.json` | Versioned sample + selection method |
| `rendered/*.md` | Solicitor-visible evidence |
| `automated-predictions.json` | Automation only (not sign-off) |
| `human-judgment-workbook.json` | Empty human slots |
| `fp-fn-report.json` | FP/FN denominators + limitations |
| `docs/integrity-programme/phase-11-checkpoint.md` | This checkpoint |

## Remaining risks

- Qualified human gold review not yet performed — FP/FN rates unavailable
- Any safety-relevant FN found later blocks programme PASS until repaired + independently re-reviewed
- ≥100 stratified browser walkthrough not claimed complete
- Scale lane still lacks full on-disk solicitor models for all 3000 identities (Phase 9 residual)
- Registered PRE-TS-* / PRE-VITEST-COPY remediation items remain

## Programme PASS

**Not supported.** Requires completed independent gold review, FP/FN disposition (especially safety-relevant FN), and separate review/authorization. Do not merge or deploy on this checkpoint alone.

## Explicit non-goals

No merge. No deploy. No fabricated human sign-off. No programme PASS. Stop here for human gold review.

## Reviewer bundle (for independent gold review)

Path: `artifacts/casebrain-qa/integrity-programme/phase-11/reviewer-bundle/`

Contains: 33 case packets · all 234 renders · `HUMAN_JUDGMENT_FORM.md` · blank `human-judgment-workbook.json` · `INSTRUCTIONS.md` · `blinded-review-order.json` (no automated predictions).

Artefacts:
- `artifacts/casebrain-qa/integrity-programme/phase-11/gold-sample-frozen.json`
- `artifacts/casebrain-qa/integrity-programme/phase-11/rendered/`
- `artifacts/casebrain-qa/integrity-programme/phase-11/automated-predictions.json`
- `artifacts/casebrain-qa/integrity-programme/phase-11/human-judgment-workbook.json`
- `artifacts/casebrain-qa/integrity-programme/phase-11/fp-fn-report.json`
- `artifacts/casebrain-qa/integrity-programme/phase-11/phase11-rendered-gold-report.json`
- `artifacts/casebrain-qa/integrity-programme/phase-11/reviewer-bundle/`
