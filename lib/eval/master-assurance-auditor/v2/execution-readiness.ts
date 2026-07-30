/**
 * MAA V2 execution-readiness artefacts (no Stage 150 run/freeze).
 */

import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_ESA_CORPUS_ROOT,
  ESA_REQUIRED_FILES,
} from "../esa-adapter";
import { buildV2Controls, buildV2RegistryDocument } from "./assemble";
import {
  ESA_AVAILABLE_EXITS,
  ESA_AVAILABLE_INPUTS,
  ESA_UNAVAILABLE_INPUTS,
} from "./enrich-execution-status";
import {
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
  type MaaV2ControlDefinition,
} from "./schema";

export type ExerciseabilityClass =
  | "fully_exercisable"
  | "partially_exercisable"
  | "not_exercisable_on_ESA"
  | "requires_different_adapter"
  | "requires_browser"
  | "requires_human"
  | "requires_external_assurance";

function capabilityProbe(dir: string): Record<string, boolean> {
  const has = (f: string) => fs.existsSync(path.join(dir, f));
  let output: Record<string, unknown> | null = null;
  let truth: Record<string, unknown> | null = null;
  try {
    if (has("casebrain-output.json")) {
      output = JSON.parse(fs.readFileSync(path.join(dir, "casebrain-output.json"), "utf8")) as Record<
        string,
        unknown
      >;
    }
  } catch {
    output = null;
  }
  try {
    if (has("truth-key.json")) {
      truth = JSON.parse(fs.readFileSync(path.join(dir, "truth-key.json"), "utf8")) as Record<
        string,
        unknown
      >;
    }
  } catch {
    truth = null;
  }

  const warnings = (output?.warningsAndGaps ?? null) as Record<string, unknown> | null;
  const evidenceItems = Array.isArray(truth?.evidenceItems) ? truth!.evidenceItems : [];

  return {
    bundle_source_text: has("bundle-text.md") && fs.statSync(path.join(dir, "bundle-text.md")).size > 0,
    original_source_documents: has("bundle.pdf") || has("canonical-bundle.md"),
    document_inventory: false, // not present as structured inventory on ESA H5
    logical_document_identities: false,
    page_units: false,
    source_compiled_page_references: evidenceItems.some(
      (e) => e && typeof e === "object" && "source_page_anchor" in (e as object),
    ),
    truth_expectations: evidenceItems.length > 0,
    evidence_relationships: false,
    charge_instruments: typeof truth?.offenceWording === "string" && String(truth.offenceWording).length > 0,
    defendant_allocation: evidenceItems.some(
      (e) => e && typeof e === "object" && "defendant_relevance" in (e as object),
    ),
    chronology_timestamps: false,
    authority_currency_metadata: false,
    audience_specific_outputs: typeof (output as { courtNote?: unknown } | null)?.courtNote === "object",
    exit_view: !!output,
    exit_copy:
      !!output &&
      typeof (output as { courtNote?: { canCopy?: boolean } }).courtNote?.canCopy === "boolean",
    exit_export: false,
    exit_api: false,
    exit_pdf: false,
    exit_composed_prose: false,
    ocr_visual_metadata: has("pdf-extraction-meta.json"),
    browser_receipts: false,
    human_judgments: false,
    security_tool_evidence: false,
    casebrain_output: !!output,
    truth_key: !!truth,
    five_answers_rows: Array.isArray(output?.fiveAnswersEvidenceRows),
    evidence_states: Array.isArray(output?.evidenceStates),
    chase_items: Array.isArray(warnings?.chaseItems),
    do_not_overstate: Array.isArray(warnings?.doNotOverstate),
  };
}

export function auditEsaPopulationInputCapability(corpusRoot = DEFAULT_ESA_CORPUS_ROOT) {
  const abs = path.isAbsolute(corpusRoot) ? corpusRoot : path.join(process.cwd(), corpusRoot);
  const dirs = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const fieldKeys = [
    "bundle_source_text",
    "original_source_documents",
    "document_inventory",
    "logical_document_identities",
    "page_units",
    "source_compiled_page_references",
    "truth_expectations",
    "evidence_relationships",
    "charge_instruments",
    "defendant_allocation",
    "chronology_timestamps",
    "authority_currency_metadata",
    "audience_specific_outputs",
    "exit_view",
    "exit_copy",
    "exit_export",
    "exit_api",
    "exit_pdf",
    "exit_composed_prose",
    "ocr_visual_metadata",
    "browser_receipts",
    "human_judgments",
    "security_tool_evidence",
    "casebrain_output",
    "truth_key",
    "five_answers_rows",
    "evidence_states",
    "chase_items",
    "do_not_overstate",
  ] as const;

  const packetCounts: Record<string, number> = Object.fromEntries(fieldKeys.map((k) => [k, 0]));
  const uniqueCasesWithField: Record<string, Set<string>> = Object.fromEntries(
    fieldKeys.map((k) => [k, new Set<string>()]),
  );

  let validTrio = 0;
  const validCaseIds: string[] = [];
  const excluded: Array<{ caseId: string; reason: string }> = [];

  for (const name of dirs) {
    const dir = path.join(abs, name);
    const missing = ESA_REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(dir, f)));
    if (missing.length) {
      excluded.push({ caseId: name, reason: `missing:${missing.join(",")}` });
      // still count occurrence for fields that exist on incomplete packets
      const probe = capabilityProbe(dir);
      for (const k of fieldKeys) {
        if (probe[k]) {
          packetCounts[k] += 1;
          uniqueCasesWithField[k].add(name);
        }
      }
      continue;
    }
    validTrio += 1;
    validCaseIds.push(name);
    const probe = capabilityProbe(dir);
    for (const k of fieldKeys) {
      if (probe[k]) {
        packetCounts[k] += 1;
        uniqueCasesWithField[k].add(name);
      }
    }
  }

  const fields = fieldKeys.map((k) => ({
    field: k,
    occurrenceCount: packetCounts[k],
    packetCount: packetCounts[k],
    uniqueCaseCount: uniqueCasesWithField[k].size,
    populationUniqueValidWithField: validCaseIds.filter((id) => uniqueCasesWithField[k].has(id)).length,
    invented: false,
    note:
      k.startsWith("exit_") && !["exit_view", "exit_copy"].includes(k)
        ? "Exit not evidenced on ESA H5 adapter — must remain not_exercised, never pass."
        : packetCounts[k] === 0
          ? "Not observed in audited packets; do not invent availability."
          : "Observed on disk without running assurance controls.",
  }));

  return {
    schemaVersion: "esa-population-input-capability-audit@v1.0.0",
    generatedAt: new Date().toISOString(),
    corpusRoot: corpusRoot.replace(/\\/g, "/"),
    assuranceControlsExecuted: false,
    stage150Run: false,
    denominators: {
      totalCaseDirectories: dirs.length,
      populationUniqueValid: validTrio,
      excludedPacketCount: excluded.length,
      expectedUniqueValid: 499,
      uniqueValidMatchesExpected: validTrio === 499,
    },
    excludedSample: excluded.slice(0, 40),
    fields,
    esaAvailableInputsCatalog: [...ESA_AVAILABLE_INPUTS],
    esaUnavailableInputsCatalog: [...ESA_UNAVAILABLE_INPUTS],
    esaAvailableExits: [...ESA_AVAILABLE_EXITS],
  };
}

export function buildExecutionStatusRegister(controls = buildV2Controls()) {
  return {
    schemaVersion: "v2-control-execution-status@v1.0.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    totalControls: controls.length,
    statusCounts: countBy(controls.map((c) => c.implementationStatus)),
    currentlyRunnableCount: controls.filter((c) => c.currentlyRunnable).length,
    controls: controls.map((c) => ({
      controlId: c.controlId,
      preservedFromV1: c.preservedFromV1,
      activationStage: c.activationStage,
      currentActivationStage: c.currentActivationStage,
      historicalActivationStages: c.historicalActivationStages,
      implementationStatus: c.implementationStatus,
      detectorEntrypoint: c.detectorEntrypoint,
      receiptValidator: c.receiptValidator,
      positiveNegativeContract: c.positiveNegativeContract,
      exercisePrerequisites: c.exercisePrerequisites,
      currentlyRunnable: c.currentlyRunnable,
      unavailableReason: c.unavailableReason,
      readinessEvidence: c.readinessEvidence,
    })),
  };
}

export function buildStage20HistoricalCorrection(controls = buildV2Controls()) {
  const stage20 = controls.filter((c) => c.historicalActivationStages.includes("20"));
  return {
    schemaVersion: "stage20-historical-activation-correction@v1.0.0",
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    problem:
      "Future-activation matrix previously showed Stage 20 with 0 controls, which erased the fact that all 24 V1 controls were exercised in Stage 20.",
    correction: {
      historicalStage20ControlCount: 24,
      historicalStage20ControlIds: stage20.map((c) => c.controlId),
      futureActivationStage20ControlCount: controls.filter((c) => c.currentActivationStage === "20")
        .length,
      currentActivationStageForV1: "50",
      previousRunEvidenceRewritten: false,
      preservedIdsLanesVersions: true,
    },
    evidencePointers: [
      "artifacts/casebrain-qa/assurance/master-auditor-v1/maa-20-2026-07-29T18-08-29-011Z/",
      "artifacts/casebrain-qa/assurance/master-auditor-v1/maa-20-2026-07-29T02-06-10-674Z/",
    ],
  };
}

export function buildStage150DetectorImplementationMap(controls = buildV2Controls()) {
  const stage150 = controls.filter((c) => c.currentActivationStage === "150" || c.activationStage === "150");
  const available = new Set<string>([...ESA_AVAILABLE_INPUTS, "saved_case_packet", "source_documents", "casebrain_outputs"]);
  const rows = stage150.map((c) => {
    const required = c.requiredInputs;
    const missing = required.filter((r) => !available.has(r) && !ESA_AVAILABLE_INPUTS.some((a) => a.includes(r) || r.includes("casebrain") || r.includes("saved_case") || r.includes("source_doc")));
    // More honest: only mark known ESA fields as available
    const actualAvailable = required.filter((r) =>
      ["saved_case_packet", "source_documents", "casebrain_outputs", "truth_or_expected_when_applicable"].includes(r),
    );
    const missingInputs = required.filter((r) => !actualAvailable.includes(r));
    const supportedExits = c.applicableExits.filter((e) => (ESA_AVAILABLE_EXITS as readonly string[]).includes(e));
    const unsupportedExits = c.applicableExits.filter((e) => !(ESA_AVAILABLE_EXITS as readonly string[]).includes(e));
    const substantiveDetector = c.implementationStatus === "implemented" && !!c.detectorEntrypoint;
    return {
      controlId: c.controlId,
      implementationStatus: c.implementationStatus,
      detectorEntrypoint: c.detectorEntrypoint,
      requiredInputFields: required,
      actualAvailableInputFields: actualAvailable,
      missingInputs: missingInputs.length ? missingInputs : missing,
      supportedExits,
      unsupportedExits,
      receiptValidator: c.receiptValidator,
      contractCoverage: c.positiveNegativeContract,
      expectedVerdictWhenPrerequisitesAbsent: "not_exercised",
      runnableOnCurrentEsaCorpus: false,
      reason:
        c.implementationStatus === "implemented"
          ? "V1 detector exists but this row is Stage-150 declared control — V1 controls activate at 50, not 150."
          : "No substantive detector for MAA2 controlId; schema/registry validator is not a substantive detector.",
      schemaRegistryValidatorIsNotSubstantiveDetector: true,
      substantiveDetector,
    };
  });

  return {
    schemaVersion: "stage150-detector-implementation-map@v1.0.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    stage150ControlCount: rows.length,
    implementedSubstantiveDetectorCount: rows.filter((r) => r.substantiveDetector).length,
    rows,
  };
}

function classifyExerciseability(c: MaaV2ControlDefinition): ExerciseabilityClass {
  if (c.implementationStatus === "browser_required" || c.activationStage === "browser") {
    return "requires_browser";
  }
  if (c.implementationStatus === "human_required" || c.activationStage === "human") {
    return "requires_human";
  }
  if (c.implementationStatus === "external_assurance_required" || c.activationStage === "roadmap") {
    return "requires_external_assurance";
  }
  if (c.implementationStatus === "implemented") {
    // V1 implemented but Stage-150 list shouldn't include them; if somehow present:
    const hasDetector = !!c.detectorEntrypoint;
    const hasValidator = !!c.receiptValidator;
    const hasContracts = !!c.positiveNegativeContract;
    const hasInputs = true;
    const hasExit = c.applicableExits.some((e) => (ESA_AVAILABLE_EXITS as readonly string[]).includes(e));
    if (hasDetector && hasValidator && hasContracts && hasInputs && hasExit) {
      return "fully_exercisable";
    }
    return "partially_exercisable";
  }
  // MAA2 specified — may need different adapter for heavy OCR etc.
  if (c.activationStage === "heavy_bundle" || c.familyCode === "SRC" || c.familyCode === "HVY") {
    return "requires_different_adapter";
  }
  return "not_exercisable_on_ESA";
}

export function buildStage150Exerciseability(controls = buildV2Controls()) {
  const stage150 = controls.filter((c) => c.activationStage === "150" || c.currentActivationStage === "150");
  const rows = stage150.map((c) => {
    const classification = classifyExerciseability(c);
    const fullyOk =
      classification === "fully_exercisable" &&
      c.implementationStatus === "implemented" &&
      !!c.detectorEntrypoint &&
      !!c.receiptValidator &&
      !!c.positiveNegativeContract &&
      c.applicableExits.some((e) => (ESA_AVAILABLE_EXITS as readonly string[]).includes(e));
    return {
      controlId: c.controlId,
      classification: fullyOk ? "fully_exercisable" : classification === "fully_exercisable" ? "partially_exercisable" : classification,
      implementationStatus: c.implementationStatus,
      hasSubstantiveDetector: !!c.detectorEntrypoint && c.implementationStatus === "implemented",
      hasRequiredInputsOnEsa: c.requiredInputs.every((r) =>
        ["saved_case_packet", "source_documents", "casebrain_outputs", "truth_or_expected_when_applicable"].includes(r),
      ),
      hasRequiredExitOnEsa: c.applicableExits.some((e) => (ESA_AVAILABLE_EXITS as readonly string[]).includes(e)),
      hasReceiptValidator: !!c.receiptValidator,
      hasPositiveNegativeContract: !!c.positiveNegativeContract,
      note:
        "fully_exercisable requires substantive detector + inputs + exit + receipt validator + positive/negative contracts.",
    };
  });

  const counts: Record<ExerciseabilityClass, number> = {
    fully_exercisable: 0,
    partially_exercisable: 0,
    not_exercisable_on_ESA: 0,
    requires_different_adapter: 0,
    requires_browser: 0,
    requires_human: 0,
    requires_external_assurance: 0,
  };
  for (const r of rows) counts[r.classification as ExerciseabilityClass] += 1;

  return {
    schemaVersion: "stage150-control-exerciseability@v1.0.0",
    stage150ControlCount: rows.length,
    counts,
    rows,
  };
}

export function buildStage150MinimumDenominators(controls = buildV2Controls(), esaValid = 499) {
  const stage150 = controls.filter((c) => c.activationStage === "150" || c.currentActivationStage === "150");
  const rows = stage150.map((c) => ({
    controlId: c.controlId,
    eligiblePopulation: {
      description: "ESA unique-valid packets that expose required H5 fields for this control",
      upperBoundUniqueValid: esaValid,
      resolvedEligibleCount: "PENDING_OBSERVATION",
    },
    minimumEligibleCases: "PENDING_APPROVAL",
    minimumPositiveProbes: "PENDING_APPROVAL",
    minimumNegativeProbes: "PENDING_APPROVAL",
    minimumDistinctFamilies: "PENDING_APPROVAL",
    minimumDistinctEvidenceOrDocumentPatterns: "PENDING_APPROVAL",
    exclusions: [
      "incomplete packets missing required trio",
      "cosmetic diverse-corpus variants excluded from core denom",
      "exits not evidenced on ESA H5",
    ],
    insufficientDenominatorOutcome: "not_exercised",
    neverPassOnInsufficientDenominator: true,
    symbolicDenominatorReplaced: c.minimumDenominator,
    blockedUntilApproval: true,
  }));

  return {
    schemaVersion: "stage150-minimum-denominators@v1.0.0",
    policy:
      "Do not invent arbitrary thresholds. PENDING_APPROVAL blocks Stage-150 execution for that control. Insufficient denominator → not_exercised or unresolved — never pass.",
    stage150ControlCount: rows.length,
    pendingApprovalCount: rows.length,
    rows,
  };
}

export function buildRelationshipAudit(controls = buildV2Controls()) {
  const withRels = controls.filter((c) => c.relationships.some((r) => r.relationship !== "independent"));
  const independent = controls.filter((c) =>
    c.relationships.length > 0 && c.relationships.every((r) => r.relationship === "independent"),
  );
  const empty = controls.filter((c) => c.relationships.length === 0);
  const unresolved = empty.length;

  // Duplicate-risk clusters: same familyCode+subfamily with >1 control
  const clusterMap = new Map<string, string[]>();
  for (const c of controls) {
    const key = `${c.familyCode}::${c.subfamily}`;
    const arr = clusterMap.get(key) ?? [];
    arr.push(c.controlId);
    clusterMap.set(key, arr);
  }
  const duplicateRiskClusters = [...clusterMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => {
      const [familyCode, subfamily] = key.split("::");
      return {
        familyCode,
        subfamily,
        controlIds: ids,
        occurrenceOwnershipRule:
          "Each finding occurrence owned by occurrenceOwnerControlId on the relationship; refiners defer to related V1/owner control to prevent duplicate defect inflation unless evidence units genuinely differ.",
        relationshipRequired: "sibling|cross_checks|refines|extends|depends_on|independent",
      };
    });

  // Ensure every cluster member has non-empty relationships (enrichment should have independent)
  return {
    schemaVersion: "v2-control-relationship-audit@v1.0.0",
    totalControls: controls.length,
    controlsWithNonIndependentRelationships: withRels.length,
    controlsExplicitlyIndependent: independent.length,
    unresolvedRelationshipClassification: unresolved,
    zeroUnresolvedRequired: true,
    zeroUnresolvedSatisfied: unresolved === 0,
    duplicateRiskClusterCount: duplicateRiskClusters.length,
    duplicateRiskClusters,
    controls: controls.map((c) => ({
      controlId: c.controlId,
      relationships: c.relationships,
      classification:
        c.relationships.length === 0
          ? "unresolved"
          : c.relationships.every((r) => r.relationship === "independent")
            ? "independent"
            : "related",
    })),
  };
}

export function buildStage150ExecutionReadinessGate(args: {
  controls: MaaV2ControlDefinition[];
  detectorMap: ReturnType<typeof buildStage150DetectorImplementationMap>;
  exerciseability: ReturnType<typeof buildStage150Exerciseability>;
  denominators: ReturnType<typeof buildStage150MinimumDenominators>;
  relationships: ReturnType<typeof buildRelationshipAudit>;
  esaAudit: ReturnType<typeof auditEsaPopulationInputCapability>;
}) {
  const registryComplete =
    args.controls.length >= 347 &&
    args.controls.every((c) => c.implementationStatus && c.relationships.length > 0);
  const detectorImplementationComplete =
    args.detectorMap.implementedSubstantiveDetectorCount === args.detectorMap.stage150ControlCount;
  const inputReadinessComplete =
    args.esaAudit.denominators.uniqueValidMatchesExpected === true &&
    args.exerciseability.counts.fully_exercisable === args.exerciseability.stage150ControlCount;
  const denominatorReadinessComplete = args.denominators.pendingApprovalCount === 0;
  const adapterReadinessComplete = false; // Stage-150 ESA adapter for all 147 V2 controls not complete
  const receiptValidationComplete =
    args.detectorMap.rows.every((r) => !!r.receiptValidator) &&
    args.detectorMap.implementedSubstantiveDetectorCount === args.detectorMap.stage150ControlCount;
  const contractReadinessComplete =
    args.detectorMap.rows.every((r) => !!r.contractCoverage) &&
    args.detectorMap.implementedSubstantiveDetectorCount === args.detectorMap.stage150ControlCount;
  const relationshipComplete = args.relationships.zeroUnresolvedSatisfied;

  const prerequisites = {
    registryComplete,
    detectorImplementationComplete,
    inputReadinessComplete,
    denominatorReadinessComplete,
    adapterReadinessComplete,
    receiptValidationComplete,
    contractReadinessComplete,
    relationshipOverlapClassificationComplete: relationshipComplete,
  };

  const allTrue = Object.values(prerequisites).every(Boolean);
  const stage150SampleSelectionAllowed = allTrue;
  const stage150ExecutionAllowed = allTrue;

  return {
    schemaVersion: "stage150-execution-readiness-gate@v1.0.0",
    generatedAt: new Date().toISOString(),
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    programmePassSupported: false,
    stage150Started: false,
    stage150SampleFrozen: false,
    stage150ControlsRun: false,
    prerequisites,
    stage150SampleSelectionAllowed,
    stage150ExecutionAllowed,
    overallAllowed: allTrue,
    blockingReasons: Object.entries(prerequisites)
      .filter(([, v]) => !v)
      .map(([k]) => k),
    counts: {
      totalControls: args.controls.length,
      stage150Controls: args.detectorMap.stage150ControlCount,
      fullyExercisable: args.exerciseability.counts.fully_exercisable,
      pendingDenominatorApprovals: args.denominators.pendingApprovalCount,
      unresolvedRelationships: args.relationships.unresolvedRelationshipClassification,
    },
    note: "Overall allowed is false unless every required prerequisite is true. Blocking Stage 150 is expected and correct.",
  };
}

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

export function buildExecutionReadinessReportMarkdown(bundle: {
  status: ReturnType<typeof buildExecutionStatusRegister>;
  stage20: ReturnType<typeof buildStage20HistoricalCorrection>;
  detectorMap: ReturnType<typeof buildStage150DetectorImplementationMap>;
  esa: ReturnType<typeof auditEsaPopulationInputCapability>;
  exerciseability: ReturnType<typeof buildStage150Exerciseability>;
  denominators: ReturnType<typeof buildStage150MinimumDenominators>;
  relationships: ReturnType<typeof buildRelationshipAudit>;
  gate: ReturnType<typeof buildStage150ExecutionReadinessGate>;
}): string {
  const e = bundle.exerciseability.counts;
  return `# MAA V2 Execution-Readiness Report

**Status:** STOP FOR CODEX REVIEW  
**Baseline:** \`${MAA_V2_BASELINE_COMMIT}\`  
**Registry:** ${MAA_V2_REGISTRY_VERSION}  
**Stage 150 started:** false  
**Stage 150 sample frozen:** false  
**Stage 150 controls run:** false  
**Programme PASS supported:** false  

## Summary

| Metric | Value |
|--------|------:|
| Total controls | ${bundle.status.totalControls} |
| Currently runnable | ${bundle.status.currentlyRunnableCount} |
| Stage-150 declared | ${bundle.detectorMap.stage150ControlCount} |
| Stage-150 substantive detectors | ${bundle.detectorMap.implementedSubstantiveDetectorCount} |
| ESA unique-valid packets | ${bundle.esa.denominators.populationUniqueValid} |
| Relationship unresolved | ${bundle.relationships.unresolvedRelationshipClassification} |
| Stage-150 execution allowed | ${bundle.gate.stage150ExecutionAllowed} |

## Implementation status counts

${Object.entries(bundle.status.statusCounts)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

## Stage-20 historical correction

- Historical Stage-20 control count: **${bundle.stage20.correction.historicalStage20ControlCount}**
- Future activation Stage-20 count: **${bundle.stage20.correction.futureActivationStage20ControlCount}**
- Previous run evidence rewritten: **${bundle.stage20.correction.previousRunEvidenceRewritten}**

## Stage-150 exerciseability counts

${Object.entries(e)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

## ESA input capability (no controls run)

Denominators kept separate: directories=${bundle.esa.denominators.totalCaseDirectories}, unique-valid=${bundle.esa.denominators.populationUniqueValid}, excluded=${bundle.esa.denominators.excludedPacketCount}.

Unavailable exits (export/api/pdf/composed_prose) are **not** inferred present. Missing fields are not invented.

## Denominators

All Stage-150 numeric minima are **PENDING_APPROVAL**. Insufficient denominator outcome: \`not_exercised\` (never pass).

## Readiness gate

Blocking reasons: ${bundle.gate.blockingReasons.join(", ") || "(none)"}

Overall allowed: **${bundle.gate.overallAllowed}**

## Rules

- Registry/schema contracts are not substantive detectors.
- No control marked implemented without entrypoint + validator + positive/negative contract.
- No Stage-150 freeze or execution in this work unit.
`;
}

export function collectExecutionReadinessBundle() {
  const controls = buildV2Controls();
  const registry = buildV2RegistryDocument(controls);
  const status = buildExecutionStatusRegister(controls);
  const stage20 = buildStage20HistoricalCorrection(controls);
  const detectorMap = buildStage150DetectorImplementationMap(controls);
  const esa = auditEsaPopulationInputCapability();
  const exerciseability = buildStage150Exerciseability(controls);
  const denominators = buildStage150MinimumDenominators(
    controls,
    esa.denominators.populationUniqueValid,
  );
  const relationships = buildRelationshipAudit(controls);
  const gate = buildStage150ExecutionReadinessGate({
    controls,
    detectorMap,
    exerciseability,
    denominators,
    relationships,
    esaAudit: esa,
  });
  const reportMd = buildExecutionReadinessReportMarkdown({
    status,
    stage20,
    detectorMap,
    esa,
    exerciseability,
    denominators,
    relationships,
    gate,
  });
  return {
    controls,
    registry,
    status,
    stage20,
    detectorMap,
    esa,
    exerciseability,
    denominators,
    relationships,
    gate,
    reportMd,
  };
}
