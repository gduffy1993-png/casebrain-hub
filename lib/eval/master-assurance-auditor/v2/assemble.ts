/**
 * Assemble and validate Master Assurance Auditor V2 registry documents.
 */

import { expandFamily } from "./control-factory";
import { FAMILIES_A_TO_M } from "./families-a-m";
import { FAMILIES_N_TO_AF } from "./families-n-af";
import { FAMILY_ELD } from "./families-eld";
import {
  MAA_V2_ALLOWED_VERDICTS,
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_INVARIANTS,
  MAA_V2_REGISTRY_VERSION,
  MAA_V2_SCHEMA_VERSION,
  type MaaV2ActivationStage,
  type MaaV2ControlDefinition,
  type MaaV2RegistryDocument,
  type MaaV2Verdict,
} from "./schema";
import {
  PRESERVED_V1_CONTROL_IDS,
  PRESERVED_V1_LANE_IDS,
  buildPreservedV1Controls,
} from "./v1-preserved";
import { enrichAllControls } from "./enrich-execution-status";

const VERDICT_SET = new Set<string>(MAA_V2_ALLOWED_VERDICTS);

const V1_IDS = PRESERVED_V1_CONTROL_IDS as readonly string[];

export function buildV2Controls(): MaaV2ControlDefinition[] {
  const preserved = buildPreservedV1Controls();
  const expanded = [...FAMILIES_A_TO_M, ...FAMILIES_N_TO_AF, FAMILY_ELD].flatMap(expandFamily);
  return enrichAllControls([...preserved, ...expanded]);
}

export function buildV2RegistryDocument(controls = buildV2Controls()): MaaV2RegistryDocument {
  const familyMap = new Map<string, { familyCode: string; family: string; controlCount: number }>();
  for (const c of controls) {
    const cur = familyMap.get(c.familyCode) ?? {
      familyCode: c.familyCode,
      family: c.family,
      controlCount: 0,
    };
    cur.controlCount += 1;
    familyMap.set(c.familyCode, cur);
  }
  return {
    schemaVersion: MAA_V2_SCHEMA_VERSION,
    registryVersion: MAA_V2_REGISTRY_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    programmePassSupported: false,
    stage150Started: false,
    allowedVerdicts: MAA_V2_ALLOWED_VERDICTS,
    invariants: [...MAA_V2_INVARIANTS],
    controls,
    familyIndex: [...familyMap.values()],
    preservedV1ControlIds: [...PRESERVED_V1_CONTROL_IDS],
    preservedV1LaneIds: [...PRESERVED_V1_LANE_IDS],
    historicalStage20ControlCount: 24,
    executionReadinessNote:
      "implementationStatus distinguishes working V1 detectors from V2 specifications; Stage 150 execution remains blocked until readiness gate prerequisites are true.",
  };
}

export type RegistryValidationIssue = { code: string; message: string; controlId?: string };

export function validateV2Registry(doc: MaaV2RegistryDocument): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = [];
  if (doc.registryVersion !== MAA_V2_REGISTRY_VERSION) {
    issues.push({ code: "registry_version", message: `Expected ${MAA_V2_REGISTRY_VERSION}` });
  }
  if (doc.programmePassSupported !== false) {
    issues.push({ code: "programme_pass", message: "programmePassSupported must be false" });
  }
  if (doc.stage150Started !== false) {
    issues.push({ code: "stage150", message: "stage150Started must be false" });
  }
  if (doc.baselineCommit !== MAA_V2_BASELINE_COMMIT) {
    issues.push({ code: "baseline", message: "baselineCommit mismatch" });
  }

  for (const id of PRESERVED_V1_CONTROL_IDS) {
    if (!doc.preservedV1ControlIds.includes(id)) {
      issues.push({ code: "v1_control_missing_index", message: id, controlId: id });
    }
    const hit = doc.controls.find((c) => c.controlId === id && c.preservedFromV1);
    if (!hit) {
      issues.push({ code: "v1_control_missing", message: `Preserved control absent: ${id}`, controlId: id });
    } else if (hit.version !== "1.0.0") {
      issues.push({
        code: "v1_version_changed",
        message: `V1 control version must remain 1.0.0 (was ${hit.version})`,
        controlId: id,
      });
    }
  }
  for (const lane of PRESERVED_V1_LANE_IDS) {
    if (!doc.preservedV1LaneIds.includes(lane)) {
      issues.push({ code: "v1_lane_missing", message: lane });
    }
  }
  if (doc.preservedV1ControlIds.length !== 24 || doc.preservedV1LaneIds.length !== 24) {
    issues.push({
      code: "v1_count",
      message: `Expected 24 preserved controls/lanes, got ${doc.preservedV1ControlIds.length}/${doc.preservedV1LaneIds.length}`,
    });
  }

  const seen = new Set<string>();
  for (const c of doc.controls) {
    if (seen.has(c.controlId)) {
      issues.push({ code: "duplicate_id", message: c.controlId, controlId: c.controlId });
    }
    seen.add(c.controlId);

    const required: Array<keyof MaaV2ControlDefinition> = [
      "controlId",
      "family",
      "familyCode",
      "subfamily",
      "purpose",
      "riskAddressed",
      "verdictRules",
      "minimumDenominator",
      "blockingSeverity",
      "remediationOwnership",
      "receiptSchema",
      "version",
      "effectiveDate",
      "laneId",
      "activationStage",
    ];
    for (const k of required) {
      const v = c[k];
      if (v === undefined || v === null || v === "") {
        issues.push({ code: "missing_field", message: String(k), controlId: c.controlId });
      }
    }
    for (const arr of [
      "requiredInputs",
      "exactEvidenceRequired",
      "positiveExamples",
      "negativeExamples",
      "falsePositiveRisks",
      "knownBlindSpots",
      "applicableCaseTypes",
      "applicableProceduralStages",
      "applicableAudiences",
      "applicableExits",
      "authority",
      "allowedVerdicts",
    ] as const) {
      if (!Array.isArray(c[arr]) || c[arr].length === 0) {
        issues.push({ code: "empty_array", message: arr, controlId: c.controlId });
      }
    }
    for (const v of c.allowedVerdicts) {
      if (!VERDICT_SET.has(v)) {
        issues.push({ code: "illegal_verdict", message: v, controlId: c.controlId });
      }
    }
    if (c.allowedVerdicts.length !== MAA_V2_ALLOWED_VERDICTS.length) {
      issues.push({ code: "verdict_set_incomplete", message: "must allow exactly the five verdicts", controlId: c.controlId });
    }
    const rules = c.verdictRules.toLowerCase();
    if (!rules.includes("never pass") && !rules.includes("not_exercised")) {
      issues.push({
        code: "missing_anti_pass_rule",
        message: "verdictRules must forbid missing-evidence→pass",
        controlId: c.controlId,
      });
    }
  }

  // Overlap without relationship: same purpose+subfamily across different IDs is OK;
  // require that any control which names a relatedControlId that exists is fine;
  // flag V2 controls that share familyCode+subfamily+slug intent with identical purpose and no relationship — skip heavy.
  // Instead: every non-preserved control that refines a V1 id must declare relationship.
  for (const c of doc.controls) {
    if (c.preservedFromV1) continue;
    const mentionsV1 = c.relationships.some(
      (r) => r.relatedControlId != null && V1_IDS.includes(r.relatedControlId),
    );
    const purposeMentionsRefine =
      /\brefines\b/i.test(c.verdictRules) || c.relationships.some((r) => r.relationship === "refines");
    if (purposeMentionsRefine && !mentionsV1 && c.relationships.length === 0) {
      issues.push({
        code: "refine_without_relationship",
        message: "refines language without relationship entry",
        controlId: c.controlId,
      });
    }
    for (const rel of c.relationships) {
      if (rel.relationship === "independent" || rel.relatedControlId == null) continue;
      if (
        rel.relatedControlId !== c.controlId &&
        !seen.has(rel.relatedControlId) &&
        !V1_IDS.includes(rel.relatedControlId)
      ) {
        if (![...seen].includes(rel.relatedControlId) && !doc.controls.some((x) => x.controlId === rel.relatedControlId)) {
          if (!rel.relatedControlId.startsWith("MAA-") || rel.relatedControlId.startsWith("MAA2-")) {
            issues.push({
              code: "dangling_relationship",
              message: rel.relatedControlId,
              controlId: c.controlId,
            });
          }
        }
      }
    }
  }

  for (const c of doc.controls) {
    if (c.implementationStatus === "implemented") {
      if (!c.detectorEntrypoint || !c.receiptValidator || !c.positiveNegativeContract) {
        issues.push({
          code: "implemented_incomplete",
          message: "implemented requires entrypoint, validator, and positive/negative contract",
          controlId: c.controlId,
        });
      }
      if (!c.currentlyRunnable) {
        issues.push({
          code: "implemented_not_runnable",
          message: "implemented controls must be currentlyRunnable when prerequisites exist",
          controlId: c.controlId,
        });
      }
    } else if (c.currentlyRunnable) {
      issues.push({
        code: "runnable_without_implemented",
        message: "currentlyRunnable=true only allowed for implemented controls in this readiness model",
        controlId: c.controlId,
      });
    }
    if (!c.currentlyRunnable && !c.unavailableReason) {
      issues.push({
        code: "missing_unavailable_reason",
        message: "unavailableReason required when currentlyRunnable=false",
        controlId: c.controlId,
      });
    }
    if (c.relationships.length === 0) {
      issues.push({
        code: "empty_relationships",
        message: "every control must declare relationships including independent",
        controlId: c.controlId,
      });
    }
  }

  if (doc.historicalStage20ControlCount !== 24) {
    issues.push({ code: "stage20_historical_count", message: "must be 24" });
  }

  return issues;
}

export function buildStageActivationMatrix(controls = buildV2Controls()) {
  const stages: MaaV2ActivationStage[] = [
    "contracts",
    "20",
    "50",
    "150",
    "300",
    "3000",
    "diverse_corpus",
    "heavy_bundle",
    "browser",
    "human",
    "roadmap",
  ];
  const byFutureStage: Record<string, string[]> = {};
  for (const s of stages) byFutureStage[s] = [];
  for (const c of controls) {
    byFutureStage[c.currentActivationStage] = byFutureStage[c.currentActivationStage] ?? [];
    byFutureStage[c.currentActivationStage].push(c.controlId);
  }

  const historicalStage20Ids = controls
    .filter((c) => c.historicalActivationStages.includes("20"))
    .map((c) => c.controlId);
  const historicalStage50Ids = controls
    .filter((c) => c.historicalActivationStages.includes("50"))
    .map((c) => c.controlId);

  return {
    schemaVersion: "maa-stage-activation-matrix@v2.1.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    stage150Started: false,
    notes: [
      "futureActivation = currentActivationStage (where control is scheduled next).",
      "historicalExecution is separate and must not be confused with futureActivation counts.",
      "Stage 20 historically exercised all 24 V1 controls; futureActivation stage '20' may remain 0.",
      "Stage 150 activation is declared but not executed by this work unit.",
    ],
    historicalExecution: {
      stage20: {
        controlCount: historicalStage20Ids.length,
        historicalStage20ControlCount: 24,
        controlIds: historicalStage20Ids,
        note: "All 24 V1 controls were exercised during Stage 20 calibration; evidence under master-auditor-v1/maa-20-* preserved.",
      },
      stage50: {
        controlCount: historicalStage50Ids.length,
        controlIds: historicalStage50Ids,
        note: "V1 controls remain currentlyActivationStage=50 after Stage 50 accept.",
      },
    },
    futureActivation: stages.map((stage) => ({
      stage,
      controlCount: (byFutureStage[stage] ?? []).length,
      controlIds: byFutureStage[stage] ?? [],
    })),
    /** @deprecated use futureActivation; retained for compatibility readers */
    stages: stages.map((stage) => ({
      stage,
      controlCount: (byFutureStage[stage] ?? []).length,
      controlIds: byFutureStage[stage] ?? [],
      historicalNote:
        stage === "20"
          ? "Future activation count may be 0; see historicalExecution.stage20 for the 24 historically exercised V1 controls."
          : null,
    })),
  };
}

export function buildEvidenceRequirements(controls = buildV2Controls()) {
  return {
    schemaVersion: "maa-control-evidence-requirements@v2.0.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    rule: "Missing listed evidence → unresolved or not_exercised — never pass.",
    controls: controls.map((c) => ({
      controlId: c.controlId,
      version: c.version,
      requiredInputs: c.requiredInputs,
      exactEvidenceRequired: c.exactEvidenceRequired,
      receiptSchema: c.receiptSchema,
      minimumDenominator: c.minimumDenominator,
      authority: c.authority,
      activationStage: c.activationStage,
    })),
  };
}

export function buildV1ToV2Migration(controls = buildV2Controls()) {
  const refinements = controls
    .filter((c) => !c.preservedFromV1)
    .flatMap((c) =>
      c.relationships
        .filter((r) => r.relationship === "refines" || r.relationship === "extends" || r.relationship === "sibling")
        .filter((r) => r.relatedControlId != null && V1_IDS.includes(r.relatedControlId))
        .map((r) => ({
          migrationId: `V2-MIG-${c.controlId}`,
          v1ControlId: r.relatedControlId,
          v2ControlId: c.controlId,
          relationship: r.relationship,
          note: r.note,
          v1VersionUnchanged: "1.0.0",
          historicalFindingsInterpretation: "unchanged — continue to resolve via v1ControlId@1.0.0",
        })),
    );
  return {
    schemaVersion: "maa-v1-to-v2-registry-migration@v2.0.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    preservedControlCount: 24,
    preservedControls: PRESERVED_V1_CONTROL_IDS.map((id) => ({
      v1ControlId: id,
      disposition: "retained",
      v2EnvelopeControlId: id,
      controlVersion: "1.0.0",
      historicalFindingsInterpretation: "unchanged",
    })),
    additiveControlCount: controls.filter((c) => !c.preservedFromV1).length,
    refinements,
  };
}

export type { MaaV2Verdict, MaaV2ControlDefinition };
