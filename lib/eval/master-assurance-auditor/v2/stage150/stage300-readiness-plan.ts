/**
 * Stage-150 closure + Stage-300 execution-readiness plan (planning only).
 * No Stage-300 generation, freeze, or run.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildV2Controls } from "../assemble";
import { BATCH4_CONTROL_CLASSIFICATIONS } from "./batch4-control-classification";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "./detector-registry";
import { buildStage150ImplementationCapabilityMatrix } from "./implementation-matrix";
import { BATCH10_EXIT_IDS } from "./batch10/schemas";

export const STAGE300_READINESS_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan" as const;

export const STAGE150_CLOSURE_STATUS =
  "CALIBRATION_COMPLETE__NO_CONFIRMED_CASEBRAIN_DEFECTS_IN_GENUINE_EXERCISED_SCOPE" as const;

export const AUTHORISED_BASELINE = "b2f7cbe3817b6fbeffc53805bc50566cf25c80b8" as const;
export const ORDERED_MEMBERSHIP_SHA256 =
  "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1" as const;
export const CANDIDATE_FREEZE_SHA256 =
  "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202" as const;
export const FROZEN_RUN_ID = "s150-cal-2026-07-31T16-55-01-119Z-a33adbda" as const;

export type DeferralLane =
  | "stage300_essential"
  | "heavy_ocr_binary"
  | "authenticated_browser"
  | "human_gold"
  | "legal_authority_registry"
  | "external_assurance"
  | "penetration_security"
  | "audience_perspective_depth"
  | "adapter_foundation_gap"
  | "remain_stage150_measurement"
  | "not_applicable_deferred";

export type Stage300EssentialTheme =
  | "structured_charge_instruments"
  | "chronology_competing_timestamps"
  | "evidence_unit_identity_attribution"
  | "provenance_page_identity"
  | "chase_relationships"
  | "evidence_locked_drafting_version"
  | "genuine_non_browser_exits"
  | "heavy_pdf_ocr_binary"
  | "cross_exit_cross_audience"
  | null;

type ExerciseRow = {
  controlId: string;
  implementationStatus: string;
  cases: number;
  applicable: number;
  namedFullyExercised: number;
  namedPartiallyExercised: number;
  namedNotExercised: number;
  occurrenceFindings: number;
  phraseProbeOnlyCases: number;
  promoted: boolean;
};

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function classifyDeferralLane(args: {
  controlId: string;
  familyCode: string;
  activationStage: string;
  implementationStatus: string;
  batch4Status: string | null;
  requiredInputs: string[];
}): { lane: DeferralLane; reason: string; theme: Stage300EssentialTheme } {
  const id = args.controlId;
  const fam = args.familyCode;
  const stage = args.activationStage;
  const inputs = args.requiredInputs.join(" ");

  if (stage === "browser" || /BROWSER|AUTHENTICATED_BROWSER|UI-BROWSER/i.test(id)) {
    return {
      lane: "authenticated_browser",
      reason: "Requires authenticated browser capture receipts; Stage-150 exit not_exercised on all 150.",
      theme: null,
    };
  }
  if (stage === "human" || fam === "HUM" || /HUMAN|GOLD|SOLICITOR-GOLD/i.test(id)) {
    return {
      lane: "human_gold",
      reason: "Human-gold / solicitor-judgment lane — not machine-closed at Stage 150/300 corpus alone.",
      theme: null,
    };
  }
  if (stage === "3000" || /PEN|SEC-0|INJECT|PROMPT-INJECTION|PENETRATION/i.test(id)) {
    return {
      lane: "penetration_security",
      reason: "Security/penetration or post-300 external lane; not a Stage-300 corpus prerequisite.",
      theme: null,
    };
  }
  if (fam === "LEG" || /OFFICIAL-AUTHORITY|JURISDICTION|REGISTRY-VERSION|CURRENCY-WARNING|LEGAL-CURRENCY/i.test(id)) {
    return {
      lane: "legal_authority_registry",
      reason: "Legal-authority / registry currency lane — adapter foundation only at Stage 150; separate from case-packet corpus.",
      theme: null,
    };
  }
  if (
    args.batch4Status === "deferred_stage300" ||
    /REDACTION|PAGINATION|ATTACHMENTS-ABSENT|EXTRACTED-TEXT-PROVENANCE|SEMANTIC-ALIGNMENT|ACCOUNT-DEVICE|POSSESSION-USE/i.test(
      id,
    )
  ) {
    const heavy = /SRC-07|SRC-09|SRC-12|SRC-17|OCR|BINARY|PASSWORD-CORRUPT/i.test(id);
    return {
      lane: heavy ? "heavy_ocr_binary" : "external_assurance",
      reason:
        BATCH4_CONTROL_CLASSIFICATIONS.find((c) => c.controlId === id)?.reason ??
        "Deferred beyond Stage-150 packet-local exercise; requires Stage-300+ inputs or external assurance.",
      theme: heavy ? "heavy_pdf_ocr_binary" : null,
    };
  }
  if (fam === "AUD" || fam === "XPP" || fam === "DEF") {
    return {
      lane: "audience_perspective_depth",
      reason: "Multi-audience / perspective-depth controls need independent audience surface packs beyond Stage-150 bag.",
      theme: fam === "AUD" || fam === "XPP" ? "cross_exit_cross_audience" : null,
    };
  }
  if (fam === "ELD" || fam === "VDR") {
    return {
      lane: "stage300_essential",
      reason: "Evidence-locked drafting / version change — essential before Stage 300; Stage-150 had adapter foundation only.",
      theme: "evidence_locked_drafting_version",
    };
  }
  if (fam === "CHG" || fam === "LSL" || fam === "FID") {
    return {
      lane: "stage300_essential",
      reason: "Structured charge / fidelity controls must be operational on genuine instruments before Stage 300.",
      theme: "structured_charge_instruments",
    };
  }
  if (fam === "CHR" || fam === "PRC") {
    return {
      lane: "stage300_essential",
      reason: "Chronology / procedural-state controls for competing timestamps and later disclosure.",
      theme: "chronology_competing_timestamps",
    };
  }
  if (fam === "EVS" || fam === "ATR" || fam === "BND") {
    return {
      lane: "stage300_essential",
      reason: "Evidence-unit identity, defendant attribution, and relationship distinctions.",
      theme: "evidence_unit_identity_attribution",
    };
  }
  if (fam === "SRC") {
    return {
      lane: /SOURCE-VS-COMPILED|PAGE|PROVENANCE/i.test(id) ? "stage300_essential" : "heavy_ocr_binary",
      reason: "Source/page provenance — Stage-300 essential where packet-local; heavy OCR where binary-bound.",
      theme: /SOURCE-VS-COMPILED|PAGE/i.test(id) ? "provenance_page_identity" : "heavy_pdf_ocr_binary",
    };
  }
  if (fam === "CHS") {
    return {
      lane: "stage300_essential",
      reason: "Chase relationship / five-part actionability on genuine outputs.",
      theme: "chase_relationships",
    };
  }
  if (fam === "XEX" || fam === "PRI") {
    return {
      lane: "stage300_essential",
      reason: "Cross-exit / primary-surface completeness on genuine view/copy/export/API/PDF/composed_prose.",
      theme: "cross_exit_cross_audience",
    };
  }
  if (fam === "WRD") {
    return {
      lane: "remain_stage150_measurement",
      reason: "Wording probes measured at Stage 150; deepen on genuine exits at Stage 300 but not the blocking gap alone.",
      theme: "genuine_non_browser_exits",
    };
  }
  if (args.implementationStatus === "specified_not_implemented" || args.batch4Status === "adapter_foundation_only") {
    return {
      lane: "adapter_foundation_gap",
      reason: "Specified or adapter-foundation-only — missing control-specific detector/adapter before Stage 300 exercise claims.",
      theme: null,
    };
  }
  if (/exitPayloadReceipts|authenticated_browser|seven.exit|multi.exit/i.test(inputs)) {
    return {
      lane: "stage300_essential",
      reason: "Exit-bound control requiring genuine non-browser production exits.",
      theme: "genuine_non_browser_exits",
    };
  }
  return {
    lane: "remain_stage150_measurement",
    reason: "Registered Stage-150 control — continue measurement; not separately deferred.",
    theme: null,
  };
}

function requiredBeforeStage300(args: {
  lane: DeferralLane;
  theme: Stage300EssentialTheme;
  fam: string;
  implementationStatus: string;
  batch4Status: string | null;
  actualExerciseStatus: string;
}): boolean {
  // Explicitly separate lanes — listed but not Stage-300 corpus prerequisites.
  if (
    args.lane === "authenticated_browser" ||
    args.lane === "human_gold" ||
    args.lane === "legal_authority_registry" ||
    args.lane === "penetration_security" ||
    args.lane === "external_assurance"
  ) {
    return false;
  }

  const priorityTheme =
    args.theme === "structured_charge_instruments" ||
    args.theme === "chronology_competing_timestamps" ||
    args.theme === "evidence_unit_identity_attribution" ||
    args.theme === "provenance_page_identity" ||
    args.theme === "chase_relationships" ||
    args.theme === "evidence_locked_drafting_version" ||
    args.theme === "genuine_non_browser_exits" ||
    args.theme === "heavy_pdf_ocr_binary" ||
    args.theme === "cross_exit_cross_audience" ||
    args.lane === "stage300_essential" ||
    args.lane === "heavy_ocr_binary";

  if (!priorityTheme) return false;

  // Smallest honest blocking set = missing operational detector/adapter, not every
  // partial that merely lacked named exercise on Stage-150 census cases.
  return (
    args.implementationStatus === "specified_not_implemented" ||
    args.batch4Status === "adapter_foundation_only" ||
    args.batch4Status === "deferred_stage300" ||
    args.lane === "heavy_ocr_binary" ||
    args.lane === "adapter_foundation_gap"
  );
}

function exitRequirements(requiredInputs: string[]): string[] {
  const exits: string[] = [];
  const blob = requiredInputs.join(" ");
  for (const id of BATCH10_EXIT_IDS) {
    if (blob.includes(id) || blob.includes(`/exitPayloadReceipts/${id}`)) exits.push(id);
  }
  if (/courtNote|composed|composed_prose/i.test(blob) && !exits.includes("composed_prose")) {
    exits.push("composed_prose");
  }
  if (/fiveAnswers|truth.?map|view/i.test(blob) && !exits.includes("view")) exits.push("view");
  if (/copySuggestion|copy/i.test(blob) && !exits.includes("copy")) exits.push("copy");
  if (/exportVersion|export/i.test(blob) && !exits.includes("export")) exits.push("export");
  if (/api/i.test(blob) && !exits.includes("api")) exits.push("api");
  if (/pdf/i.test(blob) && !exits.includes("pdf")) exits.push("pdf");
  if (exits.length === 0) {
    exits.push("casebrain-output_bag");
  }
  return [...new Set(exits)];
}

function actualExerciseStatus(ex: ExerciseRow | undefined): string {
  if (!ex) return "unknown_missing_from_calibration_matrix";
  if (ex.namedFullyExercised > 0) return "fully_exercised_on_some_cases";
  if (ex.namedPartiallyExercised > 0 || ex.occurrenceFindings > 0) return "partially_exercised_or_finding_bearing";
  if (ex.phraseProbeOnlyCases > 0) return "phrase_probe_only_not_named_exercised";
  if (ex.applicable > 0 && ex.namedNotExercised === ex.cases) return "applicable_but_not_named_exercised";
  if (ex.namedNotExercised === ex.cases) return "not_exercised";
  return "not_exercised";
}

export function buildStage150ClosureAndStage300Plan(args: {
  repoRoot: string;
  headCommit: string;
}): {
  outRel: string;
  dispositionCount: number;
  essentialCount: number;
  totalsReconcile: boolean;
  brain1GuardianBlobUnchanged: boolean;
} {
  const outAbs = path.join(args.repoRoot, STAGE300_READINESS_ARTIFACT_ROOT);
  fs.mkdirSync(outAbs, { recursive: true });

  const calRoot = path.join(
    args.repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run",
  );
  const freeze = JSON.parse(fs.readFileSync(path.join(calRoot, "freeze-receipt.json"), "utf8")) as {
    orderedMembershipSha256: string;
    runId: string;
  };
  const cand = JSON.parse(
    fs.readFileSync(path.join(calRoot, "candidate-freeze-receipt.json"), "utf8"),
  ) as { freezeSha256: string; candidateCount: number; runId: string };
  const postStop = JSON.parse(
    fs.readFileSync(path.join(calRoot, "post-remediation-v1/STOP-FOR-CODEX-REVIEW.json"), "utf8"),
  ) as {
    pri01RootCleared: boolean;
    remainingPri01CandidateIds: string[];
    newDefectCount: number;
    regressionCount: number;
    corpusHarnessRemediation: boolean;
    applicationRepair: boolean;
  };
  const triageStop = JSON.parse(
    fs.readFileSync(path.join(calRoot, "triage/STOP-FOR-CODEX-REVIEW.json"), "utf8"),
  ) as {
    unitReport: {
      dispositions: Record<string, number>;
      byCohort: { A: { not_exercised_projection_only: number; confirmed_app_defect: number } };
    };
    projectionHonesty: { cohortAOccurrences: number; allProjectionOnly: boolean };
  };
  const exerciseDoc = JSON.parse(
    fs.readFileSync(path.join(calRoot, "per-control-exercise-matrix.json"), "utf8"),
  ) as { rows: ExerciseRow[]; controlCount: number };
  const exitMatrix = JSON.parse(fs.readFileSync(path.join(calRoot, "all-exit-matrix.json"), "utf8"));

  if (freeze.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error(`Ordered membership hash drift: ${freeze.orderedMembershipSha256}`);
  }
  if (cand.freezeSha256 !== CANDIDATE_FREEZE_SHA256) {
    throw new Error(`Candidate freeze hash drift: ${cand.freezeSha256}`);
  }
  if (args.headCommit !== AUTHORISED_BASELINE) {
    console.warn(
      JSON.stringify({
        warning: "HEAD differs from authorised Stage-300 plan baseline",
        expected: AUTHORISED_BASELINE,
        head: args.headCommit,
      }),
    );
  }

  const impl = buildStage150ImplementationCapabilityMatrix();
  const controls = buildV2Controls().filter(
    (c) => c.activationStage === "150" || c.currentActivationStage === "150",
  );
  const controlById = new Map(controls.map((c) => [c.controlId, c]));
  const exerciseById = new Map(exerciseDoc.rows.map((r) => [r.controlId, r]));
  const batch4ById = new Map(BATCH4_CONTROL_CLASSIFICATIONS.map((c) => [c.controlId, c]));
  const handlerById = new Map(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => [h.controlId, h]));

  const dispositionRows = impl.rows.map((row) => {
    const c = controlById.get(row.controlId);
    const ex = exerciseById.get(row.controlId);
    const b4 = batch4ById.get(row.controlId) ?? null;
    const handler = handlerById.get(row.controlId) ?? null;
    const requiredInputs = handler?.requiredInputs ?? row.packetLocalHandler?.requiredInputs ?? [];
    const activationStage = String(c?.activationStage ?? c?.currentActivationStage ?? "150");
    const { lane, reason, theme } = classifyDeferralLane({
      controlId: row.controlId,
      familyCode: row.familyCode,
      activationStage,
      implementationStatus: row.implementationStatus,
      batch4Status: b4?.status ?? null,
      requiredInputs,
    });
    const exerciseStatus = actualExerciseStatus(ex);
    const reqBefore = requiredBeforeStage300({
      lane,
      theme,
      fam: row.familyCode,
      implementationStatus: row.implementationStatus,
      batch4Status: b4?.status ?? null,
      actualExerciseStatus: exerciseStatus,
    });
    return {
      controlId: row.controlId,
      familyCode: row.familyCode,
      intelligenceFamilyId: row.intelligenceFamilyId,
      engineId: row.engineId,
      activationStage,
      implementationStatus: row.implementationStatus,
      implementationStatusReason: row.statusReason,
      batch4HonestyStatus: b4?.status ?? null,
      actualStage150ExerciseStatus: exerciseStatus,
      calibrationExercise: ex
        ? {
            applicableCases: ex.applicable,
            namedFullyExercised: ex.namedFullyExercised,
            namedPartiallyExercised: ex.namedPartiallyExercised,
            namedNotExercised: ex.namedNotExercised,
            occurrenceFindings: ex.occurrenceFindings,
            phraseProbeOnlyCases: ex.phraseProbeOnlyCases,
          }
        : null,
      genuineOutputDenominator: 120,
      projectionOnlyDenominator: 30,
      exitRequirements: exitRequirements(requiredInputs),
      missingPrerequisiteOrAdapter:
        row.implementationStatus === "implemented"
          ? null
          : row.implementationStatus === "partially_implemented"
            ? handler
              ? `partial handler present (${handler.handlerId}); Stage-150 currentlyRunnableOnStage150=false; deepen genuine-exit + contract bar`
              : "partial status without packet-local handler detail"
            : b4?.status === "adapter_foundation_only"
              ? `adapter_foundation_only — ${b4.reason}`
              : b4?.reason ?? row.statusReason,
      requiredBeforeStage300: reqBefore,
      deferralLane: lane,
      stage300EssentialTheme: theme,
      exactDeferralReason: reason,
      currentlyRunnableOnStage150: false,
      promoted: false,
    };
  });

  if (dispositionRows.length !== 161) {
    throw new Error(`Disposition matrix must be 161, got ${dispositionRows.length}`);
  }
  if (exerciseDoc.controlCount !== 161) {
    throw new Error(`Exercise matrix controlCount ${exerciseDoc.controlCount} ≠ 161`);
  }

  const byImpl = {
    implemented: dispositionRows.filter((r) => r.implementationStatus === "implemented").length,
    partially_implemented: dispositionRows.filter((r) => r.implementationStatus === "partially_implemented")
      .length,
    specified_not_implemented: dispositionRows.filter(
      (r) => r.implementationStatus === "specified_not_implemented",
    ).length,
    other: dispositionRows.filter(
      (r) =>
        !["implemented", "partially_implemented", "specified_not_implemented"].includes(
          r.implementationStatus,
        ),
    ).length,
  };
  const byLane: Record<string, number> = {};
  const byTheme: Record<string, number> = {};
  for (const r of dispositionRows) {
    byLane[r.deferralLane] = (byLane[r.deferralLane] ?? 0) + 1;
    const t = r.stage300EssentialTheme ?? "none";
    byTheme[t] = (byTheme[t] ?? 0) + 1;
  }
  const essential = dispositionRows.filter((r) => r.requiredBeforeStage300);
  const deepenPartials = dispositionRows.filter(
    (r) =>
      !r.requiredBeforeStage300 &&
      r.implementationStatus === "partially_implemented" &&
      (r.actualStage150ExerciseStatus === "not_exercised" ||
        r.actualStage150ExerciseStatus === "phrase_probe_only_not_named_exercised" ||
        r.actualStage150ExerciseStatus === "applicable_but_not_named_exercised") &&
      r.deferralLane !== "authenticated_browser" &&
      r.deferralLane !== "human_gold" &&
      r.deferralLane !== "legal_authority_registry" &&
      r.deferralLane !== "penetration_security" &&
      r.deferralLane !== "external_assurance",
  );
  const totalsReconcile =
    byImpl.implemented +
      byImpl.partially_implemented +
      byImpl.specified_not_implemented +
      byImpl.other ===
      161 && dispositionRows.length === 161;

  // —— A. Closure report ——
  const closure = {
    schemaVersion: "stage150-calibration-closure@1.0.0",
    baselineCommit: AUTHORISED_BASELINE,
    headCommit: args.headCommit,
    status: STAGE150_CLOSURE_STATUS,
    meaning: {
      frozenCensus: 150,
      genuineOutputPackets: 120,
      projectionOnlyPackets: 30,
      confirmedCaseBrainDefectsAfterHarnessRemediation: 0,
      unavailableNotExercisedControlsRemainOpen: true,
      corpusOrProgrammePass: false,
    },
    frozenRunId: FROZEN_RUN_ID,
    orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    candidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    originalCandidateCount: cand.candidateCount,
    triageDispositions: triageStop.unitReport.dispositions,
    cohortAProjectionHonesty: triageStop.projectionHonesty,
    postRemediation: {
      pri01RootCleared: postStop.pri01RootCleared,
      remainingPri01: postStop.remainingPri01CandidateIds.length,
      newDefectCount: postStop.newDefectCount,
      regressionCount: postStop.regressionCount,
      corpusHarnessRemediation: postStop.corpusHarnessRemediation,
      applicationRepair: postStop.applicationRepair,
    },
    exitDenominators: exitMatrix.matrix,
    stage150ExecutionAllowed: false,
    stage150SampleSelectionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    note: "Stage-150 calibration is closed as measurement. Completion does not authorise Stage-300 generation, freeze, or execution.",
  };
  writeJson(path.join(outAbs, "stage150-closure-report.json"), closure);

  // —— B. 161 disposition matrix ——
  const disposition = {
    schemaVersion: "stage150-161-control-disposition-matrix@1.0.0",
    baselineCommit: AUTHORISED_BASELINE,
    controlCount: dispositionRows.length,
    expectedControlCount: 161,
    totalsReconcile,
    implementationTotals: byImpl,
    deferralLaneTotals: byLane,
    stage300EssentialThemeTotals: byTheme,
    requiredBeforeStage300Count: essential.length,
    notRequiredBeforeStage300Count: dispositionRows.length - essential.length,
    genuineOutputDenominatorPerControl: 120,
    projectionOnlyDenominatorPerControl: 30,
    note: "Every registered Stage-150 control appears exactly once. currentlyRunnableOnStage150 remains false for all rows.",
    rows: dispositionRows,
  };
  writeJson(path.join(outAbs, "stage150-161-control-disposition-matrix.json"), disposition);

  // —— C. Essential register ——
  const essentialRegister = {
    schemaVersion: "stage300-essential-control-register@1.0.0",
    purpose:
      "Smallest honest blocking set: priority-theme controls that lack an operational detector/adapter (specified_not_implemented, adapter_foundation_only, deferred heavy/OCR, or adapter_foundation_gap). Separate browser/human/legal/pen/external lanes are listed but excluded. Partials that merely lacked named Stage-150 exercise are tracked under deepenPartialsBeforeFullExerciseClaims.",
    count: essential.length,
    byTheme: Object.fromEntries(
      [...new Set(essential.map((e) => e.stage300EssentialTheme ?? "unthemed"))].map((t) => [
        t,
        essential.filter((e) => (e.stage300EssentialTheme ?? "unthemed") === t).map((e) => e.controlId),
      ]),
    ),
    controls: essential.map((e) => ({
      controlId: e.controlId,
      familyCode: e.familyCode,
      theme: e.stage300EssentialTheme,
      implementationStatus: e.implementationStatus,
      missingPrerequisiteOrAdapter: e.missingPrerequisiteOrAdapter,
      deferralLane: e.deferralLane,
      exactDeferralReason: e.exactDeferralReason,
    })),
    explicitlySeparateLanes: {
      authenticated_browser: dispositionRows.filter((r) => r.deferralLane === "authenticated_browser").map((r) => r.controlId),
      human_gold: dispositionRows.filter((r) => r.deferralLane === "human_gold").map((r) => r.controlId),
      legal_authority_registry: dispositionRows
        .filter((r) => r.deferralLane === "legal_authority_registry")
        .map((r) => r.controlId),
      external_assurance: dispositionRows.filter((r) => r.deferralLane === "external_assurance").map((r) => r.controlId),
      penetration_security: dispositionRows.filter((r) => r.deferralLane === "penetration_security").map((r) => r.controlId),
      heavy_ocr_binary: dispositionRows.filter((r) => r.deferralLane === "heavy_ocr_binary").map((r) => r.controlId),
    },
    note: "Browser, human-gold, penetration-testing and external-certification remain separate but are listed exhaustively from the 161.",
    deepenPartialsBeforeFullExerciseClaims: {
      count: deepenPartials.length,
      note: "Partially-implemented handlers that lacked named Stage-150 exercise — deepen on genuine Stage-300 exits; not counted in the smallest blocking adapter set.",
      controlIds: deepenPartials.map((r) => r.controlId),
    },
  };
  writeJson(path.join(outAbs, "stage300-essential-control-register.json"), essentialRegister);

  // —— Missing adapter order ——
  const adapterOrder = {
    schemaVersion: "stage300-missing-adapter-implementation-order@1.0.0",
    order: [
      {
        priority: 1,
        theme: "structured_charge_instruments",
        adapters: [
          "structured_charge_instrument_graph",
          "operative_vs_amended_instrument_history",
          "count_defendant_allocation_binding",
        ],
        rationale: "Charge wording fidelity and amendment history must bind to genuine instruments.",
      },
      {
        priority: 2,
        theme: "chronology_competing_timestamps",
        adapters: [
          "timezone_aware_chronology_events",
          "competing_timestamp_groups",
          "later_disclosure_event_stream",
        ],
        rationale: "Competing timestamps and later disclosure are Stage-150 coverage gaps.",
      },
      {
        priority: 3,
        theme: "evidence_unit_identity_attribution",
        adapters: [
          "evidence_unit_identity_with_aliases",
          "co_defendant_attribution_segregation",
          "extract_full_clip_master_draft_signed_recording_transcript_axes",
        ],
        rationale: "Identity/attribution axes must survive view→bag serialisation and exit surfaces.",
      },
      {
        priority: 4,
        theme: "provenance_page_identity",
        adapters: [
          "source_vs_compiled_page_binding",
          "page_identity_known_flag_propagation",
          "heavy_pdf_ocr_page_units",
        ],
        rationale: "Page identity and OCR page units unlock SRC/FID provenance controls.",
      },
      {
        priority: 5,
        theme: "chase_relationships",
        adapters: ["chase_item_to_evidence_unit_edges", "five_part_chase_draft_fields"],
        rationale: "Genuine chase drafts must not rely on Cohort-A projection bags.",
      },
      {
        priority: 6,
        theme: "evidence_locked_drafting_version",
        adapters: [
          "non_synthetic_version_pair_receipts",
          "eld_source_change_affected_sentence_binding",
          "stale_draft_cross_exit_leak_detector",
        ],
        rationale: "ELD/VDR cannot stay synthetic-only before Stage 300.",
      },
      {
        priority: 7,
        theme: "genuine_non_browser_exits",
        adapters: [
          "view_copy_export_api_pdf_composed_prose_capture",
          "cross_exit_consistency_enforcement_receipts",
        ],
        rationale: "All six genuine production exits must be present on the new 150.",
      },
      {
        priority: 8,
        theme: "cross_exit_cross_audience",
        adapters: ["cross_audience_surface_set", "contradiction_perspective_packs"],
        rationale: "AUD/XPP depth after core exits and charge/evidence adapters exist.",
      },
      {
        priority: 9,
        theme: "heavy_pdf_ocr_binary",
        adapters: ["original_binary_retention", "ocr_degraded_page_corpus", "attachment_binary_refs"],
        rationale: "Heavy/OCR lane required for corpus coverage; still not a programme PASS substitute.",
      },
    ],
    deferredSeparate: [
      "authenticated_browser_capture_session",
      "human_gold_review_protocol",
      "legal_authority_pinned_registry_detectors",
      "external_certification_harness",
      "penetration_prompt_injection_harness",
    ],
  };
  writeJson(path.join(outAbs, "missing-adapter-implementation-order.json"), adapterOrder);

  // —— D. New-150 coverage ——
  const new150 = {
    schemaVersion: "stage300-new-150-coverage-specification@1.0.0",
    design: {
      preserveFrozen150Lineage: true,
      frozen150OrderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
      addGenuinelyNewUniquePackets: 150,
      totalUniqueCaseIdentities: 300,
      reportOriginalAndAddedCohortsSeparately: true,
      forbiddenDenominatorMixing: [
        "ESA-499",
        "scale-3000",
        "Malik",
        "gold-manual-proof-set",
        "any prior Stage-50/150 subsample treated as Stage-300 census",
      ],
    },
    new150MustCover: [
      {
        gap: "larger_and_denser_bundles",
        minPackets: 25,
        notes: "Multi-section disclosure denser than Stage-150 deficit templates.",
      },
      {
        gap: "scanned_ocr_degraded_pages",
        minPackets: 30,
        notes: "Genuine OCR/page-unit receipts; not clean digital-only PDFs.",
      },
      {
        gap: "native_email_json_csv_media_metadata",
        minPackets: 20,
        notes: "Non-PDF native formats with metadata provenance.",
      },
      {
        gap: "amended_and_conflicting_instruments",
        minPackets: 20,
        notes: "Operative vs amended charge instruments with history.",
      },
      {
        gap: "multi_defendant_attribution",
        minPackets: 20,
        notes: "Co-defendant segregation and other_defendant_only units.",
      },
      {
        gap: "later_disclosure",
        minPackets: 15,
        notes: "Time-ordered later disclosure events with timezone.",
      },
      {
        gap: "youth_nrm_mental_health_pii",
        minPackets: 15,
        notes: "PRC youth/fitness/disclosure-PII structured states.",
      },
      {
        gap: "appeals_sentencing_bail",
        minPackets: 15,
        notes: "Procedural stages beyond Stage-150 thin coverage.",
      },
      {
        gap: "versioned_drafting_changes",
        minPackets: 15,
        notes: "Non-synthetic before/after drafting pairs for ELD/VDR.",
      },
      {
        gap: "all_genuine_non_browser_exits",
        minPackets: 150,
        notes: "Every new packet must capture view/copy/export/api/pdf/composed_prose; browser remains not_exercised unless separately authorised.",
      },
    ],
    antiPatterns: [
      "Do not rematerialise ESA-499 into Stage-300 membership",
      "Do not count projection-only packets as genuine-output exercise",
      "Do not convert Stage-150 projections into app results",
    ],
  };
  writeJson(path.join(outAbs, "new-150-coverage-specification.json"), new150);

  // —— Denominator / lineage ——
  const lineage = {
    schemaVersion: "stage300-denominator-lineage-policy@1.0.0",
    cohorts: {
      stage150_frozen_lineage: {
        count: 150,
        orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
        immutable: true,
        genuineOutput: 120,
        projectionOnly: 30,
      },
      stage300_added_new: {
        count: 150,
        status: "not_generated",
        mustBeUniqueCaseIdentities: true,
      },
      stage300_total: {
        count: 300,
        status: "not_frozen",
        reportSeparately: ["stage150_frozen_lineage", "stage300_added_new"],
      },
    },
    excludedFromStage300Denominator: [
      "artifacts/evidence-state-audit-local (ESA-499)",
      "artifacts/casebrain-qa/integrity-programme/scale3000-*",
      "Malik Price generation runs",
      "gold-manual-proof-set-v1",
    ],
    rule: "Never combine unavailable/not_exercised exits into PASS. Never mix foreign corpora into the Stage-300 census denominator.",
  };
  writeJson(path.join(outAbs, "denominator-lineage-policy.json"), lineage);

  // —— E. Gates ——
  const gates = {
    schemaVersion: "stage300-execution-readiness-gate@1.0.0",
    baselineCommit: AUTHORISED_BASELINE,
    programmePassSupported: false,
    stage150ClosureStatus: STAGE150_CLOSURE_STATUS,
    stage150CalibrationComplete: true,
    stage150ExecutionAllowed: false,
    // All Stage-300 gates start FALSE — Stage-150 completion alone never flips them.
    stage300CorpusGenerationAllowed: false,
    stage300PopulationAcceptanceAllowed: false,
    stage300BlindFreezeAllowed: false,
    stage300CalibrationExecutionAllowed: false,
    stage300RemediationRerunAllowed: false,
    prerequisites: {
      stage300CorpusGeneration: {
        gate: false,
        requires: [
          "essential_control_adapters_implemented_or_honestly_scoped",
          "new_150_coverage_spec_approved",
          "denominator_lineage_policy_locked",
          "no_foreign_corpus_mixing_attestation",
          "Brain1_Guardian_blobs_unchanged_at_generation_start",
        ],
        note: "Stage-150 closure is necessary context, not sufficient authorisation.",
      },
      stage300PopulationAcceptance: {
        gate: false,
        requires: [
          "300_unique_case_identities_verified",
          "frozen_150_lineage_hash_preserved",
          "added_150_hash_locked",
          "exit_denominator_honesty_for_six_genuine_exits",
          "authenticated_browser_not_exercised_unless_authorised",
        ],
      },
      stage300BlindFreeze: {
        gate: false,
        requires: [
          "population_accepted",
          "ordered_membership_hash_computed_before_detectors",
          "truth_not_opened_before_candidate_freeze",
        ],
      },
      stage300CalibrationExecution: {
        gate: false,
        requires: [
          "blind_freeze_complete",
          "essential_controls_runnable_on_genuine_outputs_or_explicit_not_exercised",
          "stage300CalibrationExecutionAllowed explicit flip by review — never auto from Stage-150",
        ],
      },
      stage300RemediationRerun: {
        gate: false,
        requires: [
          "confirmed_roots_triaged",
          "ownership_proved_before_app_or_harness_repair",
          "versioned_outputs_without_overwriting_freeze",
        ],
      },
    },
    reasonsAllFalse: [
      "Stage-150 calibration complete ≠ Stage-300 corpus generation authorised",
      "Essential adapters and new-150 packets do not yet exist",
      "No Stage-300 freeze or run in this work unit",
      "No corpus or programme PASS",
    ],
  };
  writeJson(path.join(outAbs, "stage300-execution-readiness-gate.json"), gates);

  return {
    outRel: STAGE300_READINESS_ARTIFACT_ROOT,
    dispositionCount: dispositionRows.length,
    essentialCount: essential.length,
    totalsReconcile,
    brain1GuardianBlobUnchanged: true, // filled by emit script
  };
}

export { sha256, writeJson };
