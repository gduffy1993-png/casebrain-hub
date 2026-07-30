/**
 * MAA V2.2 every-word / Stage-150 foundation types.
 * Extends V2.1; does not fork a second registry.
 */

export const MAA_V2_FOUNDATION_VERSION = "2.2.0" as const;
export const MAA_V2_CANDIDATE_SCHEMA = "maa-v2-candidate-finding@1.0.0" as const;
export const FREEZE_HASH_STAGE50 =
  "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832" as const;

export type ImplementationStatusV22 =
  | "implemented"
  | "partially_implemented"
  | "specified_not_implemented"
  | "engineering_required"
  | "operational_evidence_required"
  | "browser_required"
  | "human_required"
  | "external_assurance_required"
  | "unavailable";

export type EvidenceAuthority =
  | "deterministic_automated"
  | "calibrated_model_candidate"
  | "browser_runtime"
  | "CaseBrain_engineering"
  | "CaseBrain_operations"
  | "human_solicitor"
  | "human_technical_reviewer"
  | "independent_security_provider"
  | "independent_certification_body"
  | "independent_auditor"
  | "privacy_specialist";

export type EffectiveActivationStage =
  | "stage50_shadow_calibration"
  | "150"
  | "300"
  | "3000"
  | "diverse_corpus"
  | "heavy_source_bundle"
  | "authenticated_browser"
  | "human_gold"
  | "operational_security_roadmap"
  | "external_assurance";

export type AbsentPrerequisiteVerdict = "not_exercised" | "unresolved";

export type PerControlInputSchema = {
  controlId: string;
  requiredInputFields: string[];
  optionalInputFields: string[];
  requiredSourceType: string | null;
  requiredTruthType: string | null;
  requiredSurfaceTypes: string[];
  requiredExits: string[];
  requiredAudience: string[];
  requiredProceduralContext: string | null;
  requiredEvidenceRelationshipData: boolean;
  requiredAuthorityMetadata: boolean;
  requiredPageIdentity: boolean;
  requiredHumanAuthority: boolean;
  requiredExternalTool: string | null;
  absentPrerequisiteVerdict: AbsentPrerequisiteVerdict;
  absentPrerequisiteReasonTemplate: string;
  /** Computed against ESA allowlist — never from broad labels alone. */
  hasRequiredInputsOnEsa: boolean;
  missingRequiredInputFieldsOnEsa: string[];
};

export type SharedEngineId =
  | "source_provenance"
  | "document_relationship"
  | "charge_legal_state"
  | "evidence_attribution"
  | "chronology_procedure"
  | "authority_currency"
  | "chase_actionability"
  | "professional_wording"
  | "audience_context"
  | "cross_output_completeness"
  | "contradiction_perspective"
  | "version_reproducibility";

export type HandlerSpec = {
  controlId: string;
  engineId: SharedEngineId;
  handlerId: string;
  findingCode: string;
  occurrenceOwnerControlId: string;
  receiptValidator: string | null;
  positiveContract: string | null;
  negativeContract: string | null;
  implementationStatus: ImplementationStatusV22;
  evidenceAuthority: EvidenceAuthority;
  originalProposedStage: string;
  effectiveActivationStage: EffectiveActivationStage;
  stageReassignmentReason: string | null;
};

export type V2CandidateFinding = {
  schemaVersion: typeof MAA_V2_CANDIDATE_SCHEMA;
  candidateId: string;
  controlId: string;
  engineId: SharedEngineId;
  handlerId: string;
  findingCode: string;
  caseId: string;
  occurrenceId: string;
  exactWording: string;
  wordingHash: string;
  sourceAlignmentStatus: "aligned" | "misaligned" | "candidate_mismatch" | "unresolved" | "not_exercised";
  confidenceBasis: "deterministic" | "structured_equivalence" | "unavailable";
  candidateClass:
    | "candidate_defect"
    | "unresolved"
    | "not_exercised"
    | "pass_candidate"
    | "human_review_required";
  requiredReviewer: "codex" | "human_solicitor" | "human_technical" | "none";
  v1Relationship: string | null;
  evidenceRefs: string[];
  plainEnglish: string;
  /** Always blank until human/Codex fills. */
  humanDisposition: null;
  humanReviewer: null;
  humanReviewedAt: null;
  isV1Finding: false;
  calibrationOnly: true;
};
