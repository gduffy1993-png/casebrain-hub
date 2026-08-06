/**
 * Master Assurance Auditor V2 — control registry schema.
 * Additive and versioned. Does not mutate V1 lane IDs or historical findings.
 */

export const MAA_V2_REGISTRY_VERSION = "2.2.0" as const;
export const MAA_V2_SCHEMA_VERSION = "maa-control-registry@v2.2.0" as const;
export const MAA_V2_EFFECTIVE_DATE = "2026-07-29" as const;
export const MAA_V2_BASELINE_COMMIT =
  "7066cb6fe740ef43c98cc0b683ef04f8a7d0b127" as const;

/** Allowed finding verdicts — never invent additional pass paths. */
export const MAA_V2_ALLOWED_VERDICTS = [
  "pass",
  "defect",
  "unresolved",
  "containment",
  "not_exercised",
] as const;

export type MaaV2Verdict = (typeof MAA_V2_ALLOWED_VERDICTS)[number];

export type MaaV2Authority =
  | "automated"
  | "browser"
  | "security_tool"
  | "human_review";

export type MaaV2ActivationStage =
  | "contracts"
  | "20"
  | "50"
  | "150"
  | "300"
  | "3000"
  | "diverse_corpus"
  | "heavy_bundle"
  | "browser"
  | "human"
  | "roadmap";

export type MaaV2Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type MaaV2Exit =
  | "view"
  | "copy"
  | "export"
  | "api"
  | "pdf"
  | "composed_prose";

export type MaaV2RelationshipKind =
  | "preserves"
  | "refines"
  | "extends"
  | "sibling"
  | "depends_on"
  | "cross_checks"
  | "supersedes"
  | "independent"
  | "roadmap_only";

export type MaaV2ControlRelationship = {
  /** Null only when relationship is `independent`. */
  relatedControlId: string | null;
  relationship: MaaV2RelationshipKind;
  note: string;
  /** Which finding owns the occurrence when overlap exists. */
  occurrenceOwnerControlId?: string | null;
};

export type MaaV2ImplementationStatus =
  | "implemented"
  | "contract_only"
  | "specified_not_implemented"
  | "browser_required"
  | "human_required"
  | "external_assurance_required"
  | "unavailable";

export type MaaV2ControlDefinition = {
  controlId: string;
  family: string;
  familyCode: string;
  subfamily: string;
  purpose: string;
  riskAddressed: string;
  requiredInputs: string[];
  exactEvidenceRequired: string[];
  positiveExamples: string[];
  negativeExamples: string[];
  verdictRules: string;
  allowedVerdicts: MaaV2Verdict[];
  falsePositiveRisks: string[];
  knownBlindSpots: string[];
  applicableCaseTypes: string[];
  applicableProceduralStages: string[];
  applicableAudiences: string[];
  applicableExits: MaaV2Exit[];
  authority: MaaV2Authority[];
  activationStage: MaaV2ActivationStage;
  /**
   * Stages where this control was historically exercised (evidence preserved).
   * Distinct from future activationStage.
   */
  historicalActivationStages: MaaV2ActivationStage[];
  /** Forward-looking primary activation stage (may equal activationStage). */
  currentActivationStage: MaaV2ActivationStage;
  minimumDenominator: string;
  blockingSeverity: MaaV2Severity;
  remediationOwnership: string;
  receiptSchema: string;
  version: string;
  effectiveDate: string;
  /** V1 lane ID when this control preserves or refines a V1 lane; else family lane. */
  laneId: string;
  relationships: MaaV2ControlRelationship[];
  /** True only for the 24 preserved V1 controls. */
  preservedFromV1: boolean;
  /** Original V1 control ID when preserved or refined. */
  v1ControlId: string | null;
  implementationStatus: MaaV2ImplementationStatus;
  /** Exact module/function/command, or null when not implemented. */
  detectorEntrypoint: string | null;
  /** Exact validator/module/schema, or null. */
  receiptValidator: string | null;
  /** Exact contract/test identifier, or null. */
  positiveNegativeContract: string | null;
  exercisePrerequisites: string[];
  currentlyRunnable: boolean;
  /** Required when currentlyRunnable=false. */
  unavailableReason: string | null;
  readinessEvidence: string | null;
  registryVersion: typeof MAA_V2_REGISTRY_VERSION;
  schemaVersion: typeof MAA_V2_SCHEMA_VERSION;
};

export type MaaV2RegistryDocument = {
  schemaVersion: typeof MAA_V2_SCHEMA_VERSION;
  registryVersion: typeof MAA_V2_REGISTRY_VERSION;
  effectiveDate: typeof MAA_V2_EFFECTIVE_DATE;
  baselineCommit: typeof MAA_V2_BASELINE_COMMIT;
  programmePassSupported: false;
  stage150Started: false;
  allowedVerdicts: typeof MAA_V2_ALLOWED_VERDICTS;
  invariants: string[];
  controls: MaaV2ControlDefinition[];
  familyIndex: Array<{ familyCode: string; family: string; controlCount: number }>;
  preservedV1ControlIds: string[];
  preservedV1LaneIds: string[];
  historicalStage20ControlCount: 24;
  executionReadinessNote: string;
};

export const MAA_V2_INVARIANTS = [
  "All 24 V1 control IDs preserved with unchanged historical interpretation.",
  "All 24 V1 lane IDs preserved.",
  "Missing evidence, missing tools, or missing human judgment → not_exercised or unresolved — never pass.",
  "Unavailable exits → not_exercised — never pass.",
  "No automated control may impersonate a real solicitor, prosecutor, judge, or human reviewer.",
  "No certification, ISO, SOC 2, penetration-test, or legal-approval claim from this registry alone.",
  "knownSafetyCriticalFn remains null until supported by completed human review.",
  "Stage 150 is not started by publishing this registry.",
  "Overlapping controls must declare an explicit relationship (including independent).",
  "Never mark implemented solely because a registry entry or schema contract exists.",
  "Stage 20 historically exercised all 24 V1 controls; matrix must distinguish historical vs future activation.",
] as const;

export const DEFAULT_CASE_TYPES = [
  "criminal_defence",
  "youth",
  "multi_defendant",
  "heavy_bundle",
  "synthetic_diverse",
] as const;

export const DEFAULT_PROCEDURAL_STAGES = [
  "police_station",
  "charging",
  "first_appearance",
  "bail_remand",
  "allocation",
  "ptph",
  "disclosure",
  "pre_trial",
  "trial",
  "sentence_newton",
  "appeal",
] as const;

export const DEFAULT_AUDIENCES = [
  "solicitor",
  "client",
  "court",
  "cps",
  "supervisor",
  "counsel",
  "expert",
  "internal_audit",
] as const;

export const ALL_EXITS: MaaV2Exit[] = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
];

export const RECEIPT_SCHEMAS = {
  standard_finding: "maa-v2-receipt-standard-finding@1",
  browser_session: "maa-v2-receipt-browser-session@1",
  security_scan: "maa-v2-receipt-security-scan@1",
  human_gold: "maa-v2-receipt-human-gold@1",
  roadmap_record: "maa-v2-receipt-roadmap-record@1",
  stress_metrics: "maa-v2-receipt-stress-metrics@1",
  residency_inventory: "maa-v2-receipt-residency-inventory@1",
} as const;
