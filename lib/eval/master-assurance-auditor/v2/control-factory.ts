/**
 * Expand compact family specs into full V2 control definitions.
 */

import {
  ALL_EXITS,
  DEFAULT_AUDIENCES,
  DEFAULT_CASE_TYPES,
  DEFAULT_PROCEDURAL_STAGES,
  MAA_V2_ALLOWED_VERDICTS,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
  MAA_V2_SCHEMA_VERSION,
  RECEIPT_SCHEMAS,
  type MaaV2ActivationStage,
  type MaaV2Authority,
  type MaaV2ControlDefinition,
  type MaaV2ControlRelationship,
  type MaaV2Exit,
  type MaaV2Severity,
} from "./schema";

export type CompactControlSpec = {
  /** Zero-padded serial within family, e.g. "01". */
  serial: string;
  slug: string;
  subfamily: string;
  purpose: string;
  risk: string;
  inputs?: string[];
  evidence: string[];
  positive: string[];
  negative: string[];
  rules: string;
  fp?: string[];
  blind?: string[];
  stage: MaaV2ActivationStage;
  severity: MaaV2Severity;
  authority: MaaV2Authority[];
  denom: string;
  owner?: string;
  exits?: MaaV2Exit[];
  caseTypes?: string[];
  stages?: string[];
  audiences?: string[];
  receipt?: keyof typeof RECEIPT_SCHEMAS;
  relationships?: MaaV2ControlRelationship[];
  version?: string;
};

export type FamilyPack = {
  familyCode: string;
  family: string;
  laneId: string;
  defaults?: Partial<
    Pick<
      CompactControlSpec,
      | "inputs"
      | "fp"
      | "blind"
      | "exits"
      | "caseTypes"
      | "stages"
      | "audiences"
      | "receipt"
      | "owner"
      | "relationships"
    >
  >;
  controls: CompactControlSpec[];
};

const MISSING_EVIDENCE_RULE =
  " Missing required evidence, tools, or human judgment → unresolved or not_exercised — never pass." +
  " Unavailable exits → not_exercised — never pass.";

export function expandFamily(pack: FamilyPack): MaaV2ControlDefinition[] {
  return pack.controls.map((c) => {
    const controlId = `MAA2-${pack.familyCode}-${c.serial}-${c.slug}`;
    const d = pack.defaults ?? {};
    return {
      controlId,
      family: pack.family,
      familyCode: pack.familyCode,
      subfamily: c.subfamily,
      purpose: c.purpose,
      riskAddressed: c.risk,
      requiredInputs: c.inputs ?? d.inputs ?? ["saved_case_packet", "source_documents", "casebrain_outputs"],
      exactEvidenceRequired: c.evidence,
      positiveExamples: c.positive,
      negativeExamples: c.negative,
      verdictRules: c.rules + MISSING_EVIDENCE_RULE,
      allowedVerdicts: [...MAA_V2_ALLOWED_VERDICTS],
      falsePositiveRisks:
        c.fp ??
        d.fp ?? [
          "Cosmetic layout differences without semantic risk",
          "Legitimate qualifier language misread as defect",
        ],
      knownBlindSpots:
        c.blind ??
        d.blind ?? [
          "Handwriting without OCR support",
          "Encrypted attachments not opened under policy",
        ],
      applicableCaseTypes: c.caseTypes ?? d.caseTypes ?? [...DEFAULT_CASE_TYPES],
      applicableProceduralStages: c.stages ?? d.stages ?? [...DEFAULT_PROCEDURAL_STAGES],
      applicableAudiences: c.audiences ?? d.audiences ?? [...DEFAULT_AUDIENCES],
      applicableExits: c.exits ?? d.exits ?? [...ALL_EXITS],
      authority: c.authority,
      activationStage: c.stage,
      historicalActivationStages: [],
      currentActivationStage: c.stage,
      minimumDenominator: c.denom,
      blockingSeverity: c.severity,
      remediationOwnership: c.owner ?? d.owner ?? "CaseBrain product engineering",
      receiptSchema: RECEIPT_SCHEMAS[c.receipt ?? d.receipt ?? "standard_finding"],
      version: c.version ?? "2.0.0",
      effectiveDate: MAA_V2_EFFECTIVE_DATE,
      laneId: pack.laneId,
      relationships: c.relationships ?? d.relationships ?? [],
      preservedFromV1: false,
      v1ControlId: null,
      implementationStatus: "specified_not_implemented",
      detectorEntrypoint: null,
      receiptValidator: null,
      positiveNegativeContract: null,
      exercisePrerequisites: [],
      currentlyRunnable: false,
      unavailableReason: "pending_enrichment",
      readinessEvidence: null,
      registryVersion: MAA_V2_REGISTRY_VERSION,
      schemaVersion: MAA_V2_SCHEMA_VERSION,
    };
  });
}
