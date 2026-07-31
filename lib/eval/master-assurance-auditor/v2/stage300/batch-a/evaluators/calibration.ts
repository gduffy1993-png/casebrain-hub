/**
 * Blind 120-packet calibration for Batch-A six evaluators.
 * Order: load without truth → evaluate → persist/hash candidates → freeze → open truth.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { PopulationFreezeReceipt } from "../../../stage150/calibration/population-freeze";
import { BATCH_A_ARTIFACT_ROOT } from "../constants";
import { projectStructuredPacketToAdapterBag } from "../project-structured-packet";
import {
  BATCH_A_CALIBRATION_ARTIFACT_SUBDIR,
  BATCH_A_SIX_CONTROL_IDS,
  type BatchASixControlId,
} from "./constants";
import {
  buildEvaluatorInputBag,
  evaluateAllBatchASix,
  type BatchAEvaluatorResult,
} from "./evaluate";
import { BATCH_A_SPEC_BY_ID } from "./specs";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normaliseTemplate(s: string): string {
  return s
    .toLowerCase()
    .replace(/uq-[0-9a-f]+-[a-z]+/gi, "UQ_TOKEN")
    .replace(/[0-9a-f]{8,}/gi, "HEX")
    .replace(/\s+/g, " ")
    .trim();
}

export type BatchACalibrationCandidate = {
  candidateId: string;
  caseId: string;
  controlId: BatchASixControlId;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  wordingHash: string;
  normalisedTemplateHash: string;
  plainEnglish: string;
  evidenceRefs: string[];
  outputSha256: string;
};

export type BatchAExerciseRow = {
  caseId: string;
  controlId: BatchASixControlId;
  capabilityStatus: "eligible" | "partial" | "unavailable";
  namedControlExerciseStatus: BatchAEvaluatorResult["namedControlExerciseStatus"];
  applicable: boolean;
  missingInputReason: string | null;
  unresolvedReason: string | null;
  evidenceRefs: string[];
  candidateCount: number;
  findingCodes: string[];
  dispositionAfterTruth: string | null;
  truthOpened: boolean;
};

export type BlindCalibrationResult = {
  scanned: number;
  truthOpenedDuringBlind: false;
  candidates: BatchACalibrationCandidate[];
  exerciseRows: BatchAExerciseRow[];
  perCaseOutputSha256: Record<string, string>;
  candidatesSha256: string;
  exerciseRowsSha256: string;
};

function capabilityFromResult(r: BatchAEvaluatorResult): "eligible" | "partial" | "unavailable" {
  if (r.namedControlExerciseStatus === "not_exercised") return "unavailable";
  if (r.namedControlExerciseStatus === "unresolved") return "partial";
  return "eligible";
}

export function runBlindSixEvaluatorCalibration(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
}): BlindCalibrationResult {
  const cohortB = args.freeze.membership.filter((m) => m.cohort === "B");
  if (cohortB.length !== 120) {
    throw new Error(`Expected 120 Cohort-B rows, got ${cohortB.length}`);
  }

  const candidates: BatchACalibrationCandidate[] = [];
  const exerciseRows: BatchAExerciseRow[] = [];
  const perCaseOutputSha256: Record<string, string> = {};

  for (const row of cohortB) {
    const outAbs = row.casebrainOutputRelativePath
      ? path.join(args.repoRoot, row.casebrainOutputRelativePath)
      : null;
    const packetAbs = path.join(args.repoRoot, row.packetRelativePath);

    // Truth must not be read in blind phase.
    const casebrainOutput =
      outAbs && fs.existsSync(outAbs)
        ? (JSON.parse(fs.readFileSync(outAbs, "utf8")) as Record<string, unknown>)
        : null;
    const structuredRaw = fs.existsSync(packetAbs)
      ? (JSON.parse(fs.readFileSync(packetAbs, "utf8")) as Record<string, unknown>)
      : null;
    const projected = structuredRaw ? projectStructuredPacketToAdapterBag(structuredRaw) : null;

    // Carry specialty bags from structured packet root if ever present (fail-closed copy only).
    if (structuredRaw && projected) {
      for (const k of ["legalStateTaxonomy", "dobAgeCalcLedger", "proceduralPartyState", "derivedNumericClaims"]) {
        if (structuredRaw[k] != null && projected[k] == null) projected[k] = structuredRaw[k];
      }
    }

    const bag = buildEvaluatorInputBag({
      casebrainOutput,
      structuredPacketProjected: projected,
    });
    // Also merge specialty from casebrain if present
    for (const k of ["legalStateTaxonomy", "dobAgeCalcLedger", "proceduralPartyState", "derivedNumericClaims"]) {
      if (casebrainOutput && casebrainOutput[k] != null) bag[k] = casebrainOutput[k];
    }

    const outputSha = sha256(JSON.stringify(bag));
    perCaseOutputSha256[row.caseId] = outputSha;

    const results = evaluateAllBatchASix(bag);
    for (const r of results) {
      const spec = BATCH_A_SPEC_BY_ID.get(r.controlId)!;
      for (const h of r.hits) {
        const wordingHash = sha256(h.exactWording);
        const candidateId = sha256(
          `${row.caseId}|${r.controlId}|${h.occurrenceRef}|${wordingHash}|${h.findingCode}`,
        );
        candidates.push({
          candidateId,
          caseId: row.caseId,
          controlId: r.controlId,
          findingCode: h.findingCode,
          occurrenceRef: h.occurrenceRef,
          exactWording: h.exactWording,
          wordingHash,
          normalisedTemplateHash: sha256(normaliseTemplate(h.exactWording || h.plainEnglish)),
          plainEnglish: h.plainEnglish,
          evidenceRefs: h.evidenceRefs,
          outputSha256: outputSha,
        });
      }
      exerciseRows.push({
        caseId: row.caseId,
        controlId: r.controlId,
        capabilityStatus: capabilityFromResult(r),
        namedControlExerciseStatus: r.namedControlExerciseStatus,
        applicable: r.applicable,
        missingInputReason: r.missingInputReason,
        unresolvedReason: r.unresolvedReason,
        evidenceRefs: r.evidenceRefs,
        candidateCount: r.hits.length,
        findingCodes: r.hits.map((h) => h.findingCode),
        dispositionAfterTruth: null,
        truthOpened: false,
      });
      void spec;
    }
  }

  // Stable sort for freeze
  candidates.sort((a, b) =>
    `${a.caseId}|${a.controlId}|${a.candidateId}`.localeCompare(
      `${b.caseId}|${b.controlId}|${b.candidateId}`,
    ),
  );
  exerciseRows.sort((a, b) =>
    `${a.caseId}|${a.controlId}`.localeCompare(`${b.caseId}|${b.controlId}`),
  );

  const candidatesBody = candidates.map((c) => JSON.stringify(c)).join("\n") + (candidates.length ? "\n" : "");
  const exerciseBody = exerciseRows.map((r) => JSON.stringify(r)).join("\n") + (exerciseRows.length ? "\n" : "");

  return {
    scanned: cohortB.length,
    truthOpenedDuringBlind: false,
    candidates,
    exerciseRows,
    perCaseOutputSha256,
    candidatesSha256: sha256(candidatesBody),
    exerciseRowsSha256: sha256(exerciseBody),
  };
}

export type TruthOpenSequencingReceipt = {
  caseId: string;
  truthRelativePath: string | null;
  truthSha256: string | null;
  truthOpenedAt: string;
  openedAfterCandidateFreeze: true;
  candidateFreezeSha256: string;
  preOpenCandidateCount: number;
  note: string;
};

/**
 * Open truth ONLY after candidate freeze. Technical calibration dispositions only —
 * no FP/FN/recall claims; human rates unavailable.
 */
export function openTruthAfterSixEvaluatorFreeze(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
  exerciseRows: BatchAExerciseRow[];
  candidates: BatchACalibrationCandidate[];
  candidateFreezeSha256: string;
}): {
  sequencingReceipts: TruthOpenSequencingReceipt[];
  dispositionRows: BatchAExerciseRow[];
  truthContentsOpened: true;
  openedAfterCandidateFreeze: true;
  humanRatesAvailable: false;
  zeroCandidateMetricsForbidden: true;
} {
  const openedAt = new Date().toISOString();
  const sequencingReceipts: TruthOpenSequencingReceipt[] = [];
  const dispositionRows: BatchAExerciseRow[] = [];

  const cohortB = args.freeze.membership.filter((m) => m.cohort === "B");
  for (const row of cohortB) {
    const truthRel =
      row.sourceCasePath != null
        ? path.join(row.sourceCasePath, ["truth", "key.json"].join("-")).replace(/\\/g, "/")
        : null;
    const truthAbs = truthRel ? path.join(args.repoRoot, truthRel) : null;
    let truthSha: string | null = null;
    let truth: Record<string, unknown> | null = null;
    if (truthAbs && fs.existsSync(truthAbs)) {
      const buf = fs.readFileSync(truthAbs);
      truthSha = sha256(buf);
      truth = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    }

    const caseCands = args.candidates.filter((c) => c.caseId === row.caseId);
    sequencingReceipts.push({
      caseId: row.caseId,
      truthRelativePath: truthRel,
      truthSha256: truthSha,
      truthOpenedAt: openedAt,
      openedAfterCandidateFreeze: true,
      candidateFreezeSha256: args.candidateFreezeSha256,
      preOpenCandidateCount: caseCands.length,
      note: "Truth opened only after candidate freeze for technical disposition tagging.",
    });

    for (const controlId of BATCH_A_SIX_CONTROL_IDS) {
      const base = args.exerciseRows.find((r) => r.caseId === row.caseId && r.controlId === controlId);
      if (!base) continue;
      const rowCands = caseCands.filter((c) => c.controlId === controlId);
      let disposition: string;
      if (base.namedControlExerciseStatus === "not_exercised") {
        disposition = "unavailable_missing_real_input";
      } else if (base.namedControlExerciseStatus === "unresolved") {
        disposition = "unresolved_pending_review";
      } else if (rowCands.length === 0) {
        disposition =
          "evaluated_zero_candidates_no_metric — empty hits do not imply pass; human rates unavailable";
      } else {
        // Technical check only: mustNotSay leakage into candidate wording
        const mustNot = Array.isArray(truth?.mustNotSay)
          ? (truth!.mustNotSay as unknown[]).filter((x): x is string => typeof x === "string")
          : [];
        const leak = rowCands.some((c) =>
          mustNot.some((m) => c.exactWording.includes(m) || c.plainEnglish.includes(m)),
        );
        disposition = leak
          ? "candidate_truth_leak_pending_review"
          : "candidate_pending_human_review — no automated FP/FN/recall";
      }
      dispositionRows.push({
        ...base,
        dispositionAfterTruth: disposition,
        truthOpened: true,
      });
    }
  }

  return {
    sequencingReceipts,
    dispositionRows,
    truthContentsOpened: true,
    openedAfterCandidateFreeze: true,
    humanRatesAvailable: false,
    zeroCandidateMetricsForbidden: true,
  };
}

export function calibrationArtifactRoot(repoRoot: string): string {
  return path.join(repoRoot, BATCH_A_ARTIFACT_ROOT, BATCH_A_CALIBRATION_ARTIFACT_SUBDIR);
}
