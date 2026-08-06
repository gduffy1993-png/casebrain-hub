/**
 * Preserve all 24 V1 Master Assurance Auditor controls inside the V2 registry envelope.
 * Historical finding interpretation remains bound to controlId + controlVersion 1.0.0.
 */

import { MASTER_CONTROL_REGISTRY } from "../control-registry";
import {
  MAA_V2_ALLOWED_VERDICTS,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
  MAA_V2_SCHEMA_VERSION,
  RECEIPT_SCHEMAS,
  type MaaV2ControlDefinition,
} from "./schema";

const V1_ACTIVATION = "50" as const;

export function buildPreservedV1Controls(): MaaV2ControlDefinition[] {
  return MASTER_CONTROL_REGISTRY.map((c) => ({
    controlId: c.id,
    family: "V1. Preserved Master Lanes",
    familyCode: "V1",
    subfamily: c.laneId,
    purpose: c.label,
    riskAddressed: c.intent,
    requiredInputs: ["saved_case_packet", "casebrain_outputs", "truth_or_expected_when_applicable"],
    exactEvidenceRequired: [
      "finding_with_exactWording_or_not_exercised",
      "controlId",
      "controlVersion",
      "verdict",
      "supportingHash",
    ],
    positiveExamples: [
      `Exercised ${c.id} yields evidence-backed pass|defect|containment|unresolved|not_exercised`,
    ],
    negativeExamples: [
      "Missing evidence converted to pass",
      "Unavailable exit marked pass",
      "Human disposition auto-filled",
    ],
    verdictRules:
      "Preserve V1 detector semantics at controlVersion 1.0.0. Missing evidence/tools/judgment → unresolved or not_exercised — never pass. Unavailable exits → not_exercised.",
    allowedVerdicts: [...MAA_V2_ALLOWED_VERDICTS],
    falsePositiveRisks: [
      "Surface-profile mismatches (addressed by V1 boundary profiles where applicable)",
    ],
    knownBlindSpots: [
      "V1 lane breadth; V2 family controls refine without changing V1 historical IDs",
    ],
    applicableCaseTypes: ["criminal_defence", "youth", "multi_defendant", "heavy_bundle", "synthetic_diverse"],
    applicableProceduralStages: [
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
    ],
    applicableAudiences: [
      "solicitor",
      "client",
      "court",
      "cps",
      "supervisor",
      "counsel",
      "expert",
      "internal_audit",
    ],
    applicableExits: [...c.affectedExits],
    authority: c.id === "MAA-HUMAN-SUPERVISION" ? ["human_review", "automated"] : ["automated"],
    activationStage: V1_ACTIVATION,
    historicalActivationStages: ["20", "50"],
    currentActivationStage: V1_ACTIVATION,
    minimumDenominator: "stage_applicable_cases",
    blockingSeverity: c.severity,
    remediationOwnership: "CaseBrain product engineering (V1 lane owners)",
    receiptSchema: RECEIPT_SCHEMAS.standard_finding,
    version: c.version,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    laneId: c.laneId,
    relationships: [],
    preservedFromV1: true,
    v1ControlId: c.id,
    implementationStatus: "implemented",
    detectorEntrypoint: null,
    receiptValidator: null,
    positiveNegativeContract: null,
    exercisePrerequisites: [],
    currentlyRunnable: false,
    unavailableReason: "pending_enrichment",
    readinessEvidence: null,
    registryVersion: MAA_V2_REGISTRY_VERSION,
    schemaVersion: MAA_V2_SCHEMA_VERSION,
  }));
}

export const PRESERVED_V1_CONTROL_IDS = MASTER_CONTROL_REGISTRY.map((c) => c.id);
export const PRESERVED_V1_LANE_IDS = MASTER_CONTROL_REGISTRY.map((c) => c.laneId);
