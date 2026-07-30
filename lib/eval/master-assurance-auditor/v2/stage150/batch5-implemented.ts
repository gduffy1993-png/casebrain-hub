/**
 * Batch-5 immutable promotion registry.
 * statusForStage150Control reads only this validated registry — no runtime mutation API.
 * Stage-150 selection/execution gates remain FALSE even when status=implemented.
 * Denominator approval remains PENDING_REVIEW (reviewer/date blank).
 */

export type Batch5DenominatorApprovalState =
  | "PENDING_CALIBRATION"
  | "PENDING_REVIEW"
  | "APPROVED_FOR_SELECTION";

export type Batch5ImmutablePromotionEntry = {
  controlId: string;
  implementationStatus: "implemented";
  implementationEvidenceRefs: string[];
  contractRefs: {
    positive: string;
    negatives: string;
    unavailable: string;
    mutation: string;
  };
  calibrationPopulation: 499;
  /** Candidate denominator from 499-case calibration (0 = rates unavailable). */
  candidateDenominator: number;
  promotionReason: string;
  denominatorApprovalState: Batch5DenominatorApprovalState;
  reviewer: "";
  reviewDate: "";
  rateHonestyNote: string | null;
};

const C5 = "scripts/maa-v2-stage150-batch5-contracts.test.ts";

const ZERO_CANDIDATE_NOTE =
  "No candidates observed across 499 cases. Positive/negative/mutation contracts passed. Corpus FP/FN rates cannot be calculated.";

/**
 * Immutable Batch-5 promotions proven by contracts + 499 calibration + freeze/triage.
 * Do not mutate at runtime. Edit this registry only via explicit Batch-5 remediation commits.
 */
export const BATCH5_IMMUTABLE_PROMOTION_REGISTRY: readonly Batch5ImmutablePromotionEntry[] = [
  {
    controlId: "MAA2-WRD-10-NO-PLACEHOLDERS",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateProfessionalWording",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-candidate-freeze.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-triage-pass-B.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-499-exercise-receipt-index.json",
    ],
    contractRefs: {
      positive: `${C5}#wrd10_positive`,
      negatives: `${C5}#wrd10_negatives`,
      unavailable: `${C5}#wrd10_unavailable`,
      mutation: `${C5}#wrd10_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Control-specific runtime + resolving contracts + 499 blind calibration. Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
  {
    controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateProfessionalWording",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-candidate-freeze.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-triage-pass-B.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-499-exercise-receipt-index.json",
    ],
    contractRefs: {
      positive: `${C5}#wrd15_positive`,
      negatives: `${C5}#wrd15_negatives`,
      unavailable: `${C5}#wrd15_unavailable`,
      mutation: `${C5}#wrd15_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Control-specific runtime + resolving contracts + 499 blind calibration. Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
  {
    controlId: "MAA2-WRD-02-NO-MID-TRUNCATION",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateProfessionalWording",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-candidate-freeze.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-triage-pass-B.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-499-exercise-receipt-index.json",
    ],
    contractRefs: {
      positive: `${C5}#wrd02_positive`,
      negatives: `${C5}#wrd02_negatives`,
      unavailable: `${C5}#wrd02_unavailable`,
      mutation: `${C5}#wrd02_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Control-specific runtime + resolving contracts + 499 blind calibration. Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
  {
    controlId: "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors.ts#internal_audit_leak",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-candidate-freeze.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-triage-pass-B.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-499-exercise-receipt-index.json",
    ],
    contractRefs: {
      positive: `${C5}#aud07_positive`,
      negatives: `${C5}#aud07_negatives`,
      unavailable: `${C5}#aud07_unavailable`,
      mutation: `${C5}#aud07_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 2,
    promotionReason:
      "Control-specific runtime + resolving contracts + 499 calibration. Two output_intrinsic_confirmed_app_defect findings (solicitor-visible internal/audit text; truth not required).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: null,
  },
  {
    controlId: "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateChargeIntegrity",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-candidate-freeze.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-triage-pass-B.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch5/batch5-499-exercise-receipt-index.json",
    ],
    contractRefs: {
      positive: `${C5}#lsl02_positive`,
      negatives: `${C5}#lsl02_negatives`,
      unavailable: `${C5}#lsl02_unavailable`,
      mutation: `${C5}#lsl02_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Control-specific runtime + resolving contracts + 499 blind calibration. Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
] as const;

/**
 * Batch-6 immutable promotions — extends Batch-5 registry; does not replace it.
 * Honesty correction: only EVS-02 and EVS-03 meet the structured named-control bar.
 * Six over-promoted controls returned to partially_implemented (see batch6-overpromotion-disposition).
 * Zero-candidate calibration on 499 ESA cases; rates unavailable (not 0/0).
 */
const C6 = "scripts/maa-v2-stage150-batch6-contracts.test.ts";
const B6_EVIDENCE = [
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch6/batch6-candidate-freeze.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch6/batch6-triage-pass-B.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch6/batch6-499-exercise-receipt-index.json",
] as const;

export const BATCH6_IMMUTABLE_PROMOTION_REGISTRY: readonly Batch5ImmutablePromotionEntry[] = [
  {
    controlId: "MAA2-EVS-02-STATE-ENUM",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateEvidenceIdentityState",
      ...B6_EVIDENCE,
    ],
    contractRefs: {
      positive: `${C6}#evs02_positive`,
      negatives: `${C6}#evs02_negatives`,
      unavailable: `${C6}#evs02_unavailable`,
      mutation: `${C6}#evs02_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Structured evidenceStates inferredSourceState enum check with honest named-control receipts (row counts, field refs/hashes, not_exercised when no rows). Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
  {
    controlId: "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
    implementationStatus: "implemented",
    implementationEvidenceRefs: [
      "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts#evaluateEvidenceIdentityState",
      ...B6_EVIDENCE,
    ],
    contractRefs: {
      positive: `${C6}#evs03_positive`,
      negatives: `${C6}#evs03_negatives`,
      unavailable: `${C6}#evs03_unavailable`,
      mutation: `${C6}#evs03_mutation`,
    },
    calibrationPopulation: 499,
    candidateDenominator: 0,
    promotionReason:
      "Structured fiveAnswers unreliable-without-reason check with honest named-control receipts. Zero candidates — rates unavailable (not 0/0).",
    denominatorApprovalState: "PENDING_REVIEW",
    reviewer: "",
    reviewDate: "",
    rateHonestyNote: ZERO_CANDIDATE_NOTE,
  },
] as const;

/** Sole Stage-150 promotion authority: Batch-5 preserved + Batch-6 extensions. */
export const STAGE150_IMMUTABLE_PROMOTION_REGISTRY: readonly Batch5ImmutablePromotionEntry[] = [
  ...BATCH5_IMMUTABLE_PROMOTION_REGISTRY,
  ...BATCH6_IMMUTABLE_PROMOTION_REGISTRY,
];

export const BATCH5_IMPLEMENTED_IDS: ReadonlySet<string> = new Set(
  BATCH5_IMMUTABLE_PROMOTION_REGISTRY.map((e) => e.controlId),
);

export const BATCH6_IMPLEMENTED_IDS: ReadonlySet<string> = new Set(
  BATCH6_IMMUTABLE_PROMOTION_REGISTRY.map((e) => e.controlId),
);

export const STAGE150_IMPLEMENTED_IDS: ReadonlySet<string> = new Set(
  STAGE150_IMMUTABLE_PROMOTION_REGISTRY.map((e) => e.controlId),
);

export const BATCH5_PROMOTION_BY_ID: ReadonlyMap<string, Batch5ImmutablePromotionEntry> = new Map(
  BATCH5_IMMUTABLE_PROMOTION_REGISTRY.map((e) => [e.controlId, e]),
);

export const BATCH6_PROMOTION_BY_ID: ReadonlyMap<string, Batch5ImmutablePromotionEntry> = new Map(
  BATCH6_IMMUTABLE_PROMOTION_REGISTRY.map((e) => [e.controlId, e]),
);

export const STAGE150_PROMOTION_BY_ID: ReadonlyMap<string, Batch5ImmutablePromotionEntry> = new Map(
  STAGE150_IMMUTABLE_PROMOTION_REGISTRY.map((e) => [e.controlId, e]),
);

/** @deprecated Use STAGE150_IMPLEMENTED_IDS for status; BATCH5_IMPLEMENTED_IDS for Batch-5-only. */
export function getBatch5ImplementedIds(): ReadonlySet<string> {
  return BATCH5_IMPLEMENTED_IDS;
}

export const ZERO_CANDIDATE_RATE_NOTE = ZERO_CANDIDATE_NOTE;
