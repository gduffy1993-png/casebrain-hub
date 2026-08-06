/**
 * Batch-9 adapter-to-detector integration — schemas (behavioural-proof remediation).
 * Two axes: evaluator implementation class ≠ corpus execution availability.
 */

import type { Batch8AdapterId, Batch8CapabilityStatus } from "../batch8/schemas";
import type { SharedEngineId } from "../../every-word/types";

export const BATCH9_SCHEMA_VERSION = "maa-v2-stage150-batch9-adapter-detector@1.2.0" as const;
export const BATCH9_RECEIPT_SCHEMA = "maa-v2-stage150-batch9-exercise-receipt@1.2.0" as const;
export const BATCH9_BASELINE = "1493fe5409006dcea163f65a3ac64463f6060f03" as const;
export const BATCH9_CONTRACTS_FILE = "scripts/maa-v2-stage150-batch9-contracts.test.ts" as const;

/** Code-quality axis — only substantive / adapter-integrity count as named evaluators. */
export type Batch9EvaluatorImplementationClass =
  | "substantive_control_evaluator"
  | "adapter_integrity_evaluator"
  | "family_proxy_only"
  | "foundation_stub";

/** Corpus / input availability axis — independent of implementation class. */
export type Batch9ExecutionAvailability =
  | "runnable_on_ESA"
  | "unavailable_missing_adapter"
  | "unavailable_missing_structured_field"
  | "unavailable_missing_real_exit"
  | "not_applicable";

/** @deprecated Use Batch9EvaluatorImplementationClass — kept as alias during transition. */
export type Batch9EvaluatorClass = Batch9EvaluatorImplementationClass;

export type Batch9NamedExerciseStatus =
  | "evaluated"
  | "unresolved"
  | "not_exercised";

export type Batch9DispositionStatus =
  | "implemented"
  | "partially_implemented"
  | "specified_not_implemented";

export type Batch9ContractRefs = {
  positiveContract: string;
  negativeContract: string;
  unavailableContract: string;
  mutationContract: string;
};

export type Batch9ControlSpec = {
  controlId: string;
  adapterId: Batch8AdapterId;
  engineId: SharedEngineId;
  handlerId: string;
  findingCode: string;
  /** Code-quality axis. */
  evaluatorImplementationClass: Batch9EvaluatorImplementationClass;
  /** Corpus availability on ESA (static). */
  executionAvailability: Batch9ExecutionAvailability;
  /**
   * @deprecated Mirror of evaluatorImplementationClass for older receipt readers.
   * Must equal evaluatorImplementationClass.
   */
  evaluatorClass: Batch9EvaluatorImplementationClass;
  minAdapterCapability: Extract<Batch8CapabilityStatus, "eligible" | "partial">;
  requireCompleteRecords: boolean;
  exactPrerequisites: string[];
  applicabilityRule: string;
  missingInputReason: string;
  findingOwnership: string;
  unavailableBehaviour: string;
  contractRefs: Batch9ContractRefs;
};

export type Batch9ExerciseReceipt = {
  schemaVersion: typeof BATCH9_RECEIPT_SCHEMA;
  caseId: string;
  controlId: string;
  adapterId: Batch8AdapterId;
  evaluatorImplementationClass: Batch9EvaluatorImplementationClass;
  executionAvailability: Batch9ExecutionAvailability;
  /** @deprecated Mirror of evaluatorImplementationClass. */
  evaluatorClass: Batch9EvaluatorImplementationClass;
  countsAsNamedEvaluator: boolean;
  adapterCapabilityStatus: Batch8CapabilityStatus;
  namedControlExerciseStatus: Batch9NamedExerciseStatus;
  applicableRecordCount: number;
  completeRecordCount: number;
  incompleteRecordCount: number;
  ambiguousRelationshipCount: number;
  applicableCase: boolean;
  missingInputReason: string | null;
  eligibilityReason: string;
  findingCount: number;
  findingCodes: string[];
  evidenceRefs: string[];
  candidateOccurrenceIds: string[];
  ownership: "batch9_adapter_gated";
  emptyHitsDoNotImplyPass: true;
  note: string;
};

export type Batch9ControlDisposition = {
  controlId: string;
  adapterId: Batch8AdapterId;
  evaluatorImplementationClass: Batch9EvaluatorImplementationClass;
  executionAvailability: Batch9ExecutionAvailability;
  evaluatorClass: Batch9EvaluatorImplementationClass;
  countsAsNamedEvaluator: boolean;
  beforeStatus: Batch9DispositionStatus;
  afterStatus: Batch9DispositionStatus;
  promoted: false | true;
  promotionBlockedReason: string;
  missingAdapterOrInput: string;
  applicableCaseCount499: number;
  notExercisedCaseCount499: number;
  evaluatedCaseCount499: number;
  unresolvedCaseCount499: number;
  candidateOccurrenceCount: number;
  candidateStringCount: number;
  candidateTemplateCount: number;
  candidateCaseCount: number;
  fpDisposition: string;
  fnDisposition: string;
  unresolvedDisposition: string;
};

export function countsAsNamedEvaluator(cls: Batch9EvaluatorImplementationClass): boolean {
  return cls === "substantive_control_evaluator" || cls === "adapter_integrity_evaluator";
}

/** Controls that need coupled structured fields beyond adapter eligibility. */
export const BATCH9_EXTRA_STRUCTURED_FIELD_CONTROLS: ReadonlySet<string> = new Set([
  "MAA2-CHG-10-WARNING-INSEPARABLE",
  "MAA2-LSL-01-STATEMENT-CLASSIFICATION",
  "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
  "MAA2-FID-10-QUOTATION-FIDELITY",
  "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS",
  "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
  "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
  "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL",
]);
