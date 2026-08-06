/**
 * Calibration gates and stage progression for Master Assurance Auditor.
 * Unknown safety-FN / human rates block progression — they never coerce to zero/pass.
 */

import type {
  CalibrationGateResult,
  CalibrationStage,
  ControlExerciseRecord,
  HumanRateKnowledge,
  MasterAuditorFinding,
  SafetyFnKnowledge,
} from "./types";

export const STAGE_ORDER: CalibrationStage[] = ["contracts", "20", "50", "150", "300", "3000"];

export const CALIBRATION_THRESHOLDS = {
  maxKnownSafetyCriticalFn: 0,
  humanConfirmationRequiredToProgressPast20: true,
  minHumanConfirmationRate: 0.8,
  maxFalsePositiveRate: 0.15,
};

export function nextStageAfter(stage: CalibrationStage): CalibrationStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1]!;
}

export function evaluateCalibrationGate(input: {
  stage: CalibrationStage;
  casesProcessed: number;
  expectedCases: number;
  crashCount: number;
  corruptRecordCount: number;
  manifestValid: boolean;
  hashesValid: boolean;
  corpusRefused: boolean;
  corpusRefuseReason: string | null;
  controls: ControlExerciseRecord[];
  findings: MasterAuditorFinding[];
  safetyFn: SafetyFnKnowledge;
  humanRates: HumanRateKnowledge;
}): CalibrationGateResult {
  const fully = input.controls.filter((c) => c.status === "fully_exercised").length;
  const partial = input.controls.filter((c) => c.status === "partially_exercised").length;
  const notEx = input.controls.filter((c) => c.status === "not_exercised").length;
  const checks: Record<string, boolean | string | number | null> = {
    manifestValid: input.manifestValid,
    hashesValid: input.hashesValid,
    corpusRefused: input.corpusRefused,
    crashCount: input.crashCount,
    corruptRecordCount: input.corruptRecordCount,
    casesProcessed: input.casesProcessed,
    expectedCases: input.expectedCases,
    controlsFullyExercised: fully,
    controlsPartiallyExercised: partial,
    controlsNotExercised: notEx,
    controlsTotal: input.controls.length,
    safetyFnKnowledgeState: input.safetyFn.knowledgeState,
    knownSafetyCriticalFn: input.safetyFn.knownSafetyCriticalFn,
    humanRateKnowledgeState: input.humanRates.knowledgeState,
    humanConfirmationRate: input.humanRates.humanConfirmationRate,
    detectorFalsePositiveRate: input.humanRates.detectorFalsePositiveRate,
    humanReviewedSamples: input.humanRates.reviewedSampleCount,
  };

  const defects = input.findings.filter((f) => f.verdict === "defect" && !f.designFinding);
  checks.defectFindings = defects.length;

  if (input.corpusRefused) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: input.corpusRefuseReason ?? "Corpus insufficient for stage",
      nextStage: null,
      checks,
    };
  }
  if (!input.manifestValid || !input.hashesValid) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: "Manifest or hash validation failed",
      nextStage: null,
      checks,
    };
  }
  if (input.crashCount > 0 || input.corruptRecordCount > 0) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: "Crashes or corrupt records present",
      nextStage: null,
      checks,
    };
  }
  if (input.casesProcessed < input.expectedCases) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: `Processed ${input.casesProcessed}/${input.expectedCases} unique cases`,
      nextStage: null,
      checks,
    };
  }

  // Stage 20 / contracts / 50: always stop for Codex. Never auto-progress.
  // Unknown safety/human knowledge remains recorded honestly (never coerced to pass).
  if (input.stage === "contracts" || input.stage === "20" || input.stage === "50") {
    const blockers: string[] = [];
    if (input.safetyFn.knowledgeState === "unknown" || input.safetyFn.knownSafetyCriticalFn == null) {
      blockers.push("safety-FN knowledge unknown");
    } else if (
      input.safetyFn.knownSafetyCriticalFn > CALIBRATION_THRESHOLDS.maxKnownSafetyCriticalFn
    ) {
      blockers.push("known safety-critical FN present");
    }
    if (input.humanRates.knowledgeState !== "reviewed_samples") {
      blockers.push("human rates unavailable");
    }
    const stageLabel = input.stage === "50" ? "50" : input.stage === "20" ? "20" : "contracts";
    const nextHint =
      input.stage === "50"
        ? "do not start 150/300/3000 until review passes"
        : "do not start 50/150/300/3000 until review passes";
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason:
        `STOP FOR CODEX REVIEW — stage ${stageLabel} complete; ${nextHint}` +
        (blockers.length ? ` (blocking: ${blockers.join("; ")})` : ""),
      nextStage: nextStageAfter(input.stage),
      checks,
    };
  }

  // Unknown safety-FN knowledge blocks progression beyond 20 (never treat as zero).
  if (input.safetyFn.knowledgeState === "unknown" || input.safetyFn.knownSafetyCriticalFn == null) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason:
        "Safety-critical FN knowledge is unknown — reviewed known-fn register required before progression",
      nextStage: null,
      checks,
    };
  }
  if (input.safetyFn.knownSafetyCriticalFn > CALIBRATION_THRESHOLDS.maxKnownSafetyCriticalFn) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: "Known safety-critical false negative present",
      nextStage: null,
      checks,
    };
  }

  // Beyond 20: human rates must be from valid reviewed samples (not null).
  if (input.humanRates.knowledgeState !== "reviewed_samples") {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason:
        "Human confirmation / FP rates unavailable — blank or unverified dispositions do not produce rates",
      nextStage: null,
      checks,
    };
  }
  if (
    input.humanRates.humanConfirmationRate == null ||
    input.humanRates.humanConfirmationRate < CALIBRATION_THRESHOLDS.minHumanConfirmationRate
  ) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: "Human confirmation threshold not met",
      nextStage: null,
      checks,
    };
  }
  if (
    input.humanRates.detectorFalsePositiveRate != null &&
    input.humanRates.detectorFalsePositiveRate > CALIBRATION_THRESHOLDS.maxFalsePositiveRate
  ) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: "Detector false-positive rate above threshold",
      nextStage: null,
      checks,
    };
  }

  // Beyond 20 require all controls fully exercised (not merely touched).
  if (fully < input.controls.length) {
    return {
      stage: input.stage,
      allowedToProgress: false,
      stopReason: `Only ${fully}/${input.controls.length} controls fully exercised (${partial} partial, ${notEx} not exercised)`,
      nextStage: null,
      checks,
    };
  }

  return {
    stage: input.stage,
    allowedToProgress: true,
    stopReason: null,
    nextStage: nextStageAfter(input.stage),
    checks,
  };
}
