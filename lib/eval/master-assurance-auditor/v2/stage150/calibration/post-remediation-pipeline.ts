/**
 * Post-remediation calibration against rematerialised Cohort-B outputs.
 * Does not overwrite the frozen Stage-150 run, packets, candidate freeze, or triage.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { triageCandidate, markDuplicateOccurrences, type Batch5Candidate } from "../batch5-triage";
import { BATCH10_EXIT_IDS } from "../batch10/schemas";
import {
  POST_REMEDIATION_V1_REL,
  REMATERIALISED_OUTPUTS_REL,
  rematerialiseCohortBFiveAnswersOutputs,
} from "../batch10/deficit120/rematerialise-five-answers-outputs";
import { STAGE150_CALIBRATION_ARTIFACT_ROOT, STAGE150_CALIBRATION_SCHEMA } from "./constants";
import type { PopulationFreezeReceipt } from "./population-freeze";
import { revalidatePopulationFreeze } from "./population-freeze";
import { runBlindCalibration, type CalibrationCandidate } from "./blind-runner";
import { applyOwnershipAndDedupe } from "./ownership-dedupe";
import { openTruthAfterCandidateFreeze } from "./truth-open";
import { buildCalibrationReviewBatches } from "./review-batches";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type OccurrenceCompareRow = {
  candidateId: string;
  caseId: string;
  cohort: "A" | "B";
  controlId: string;
  findingCode: string;
  occurrenceRef: string;
  wordingHash: string;
  status: "cleared" | "persisted" | "new_regression" | "unchanged_other";
};

export type PostRemediationPipelineResult = {
  runId: string;
  outRel: string;
  orderedMembershipSha256Preserved: string;
  originalCandidateFreezeSha256: string;
  newCandidateFreezeSha256: string;
  rematerialise: ReturnType<typeof rematerialiseCohortBFiveAnswersOutputs>;
  originalPri01CandidateIds: string[];
  remainingPri01CandidateIds: string[];
  pri01RootCleared: boolean;
  pri01DuplicateCleared: boolean;
  occurrenceCompare: OccurrenceCompareRow[];
  newDefectCount: number;
  regressionCount: number;
  stage150ExecutionAllowed: false;
  programmePassSupported: false;
  applicationRepair: false;
  corpusHarnessRemediation: true;
};

function isPri01(c: { controlId: string; findingCode: string; occurrenceRef: string }): boolean {
  return (
    c.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION" &&
    (c.findingCode === "XEX_MISSING_TRUTH_MAP" || c.occurrenceRef === "/fiveAnswersEvidenceRows")
  );
}

/**
 * Run rematerialise → blind recalibration → truth open → comparison into post-remediation-v1/.
 */
export function runPostRemediationCalibration(args: {
  repoRoot: string;
  headCommit: string;
  frozenRunId: string;
  originalFreeze: PopulationFreezeReceipt;
  originalCandidates: CalibrationCandidate[];
  originalCandidateFreezeSha256: string;
}): PostRemediationPipelineResult {
  const outAbs = path.join(args.repoRoot, POST_REMEDIATION_V1_REL);
  fs.mkdirSync(outAbs, { recursive: true });

  // Guard: original freeze / triage artefacts must remain intact.
  const frozenManifest = path.join(
    args.repoRoot,
    STAGE150_CALIBRATION_ARTIFACT_ROOT,
    "frozen-population-manifest.json",
  );
  const frozenDoc = JSON.parse(fs.readFileSync(frozenManifest, "utf8")) as PopulationFreezeReceipt;
  if (frozenDoc.orderedMembershipSha256 !== args.originalFreeze.orderedMembershipSha256) {
    throw new Error("Frozen ordered membership hash drift — aborting post-remediation");
  }
  if (frozenDoc.runId !== args.frozenRunId) {
    throw new Error(`Frozen runId mismatch: ${frozenDoc.runId} ≠ ${args.frozenRunId}`);
  }

  const packetRe = revalidatePopulationFreeze(args.repoRoot, args.originalFreeze);
  if (!packetRe.ok) {
    throw new Error(`Frozen packets altered: ${packetRe.mismatches.join(",")}`);
  }

  const rematerialise = rematerialiseCohortBFiveAnswersOutputs({
    repoRoot: args.repoRoot,
    freeze: args.originalFreeze,
  });

  const runId = `s150-cal-postrem-v1-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const overlayAbs = path.join(args.repoRoot, REMATERIALISED_OUTPUTS_REL);

  writeJson(path.join(outAbs, "freeze-reference.json"), {
    schemaVersion: "stage150-postrem-freeze-reference@1.0.0",
    note: "Original freeze reused by reference — not rewritten. Ordered membership hash preserved.",
    frozenRunId: args.frozenRunId,
    orderedMembershipSha256Preserved: args.originalFreeze.orderedMembershipSha256,
    originalCandidateFreezeSha256: args.originalCandidateFreezeSha256,
    rematerialisedOutputVersionSha256: rematerialise.outputVersionSha256,
    frozenSourcesAltered: false,
    frozenCandidateFreezeAltered: false,
    frozenTriageAltered: false,
  });

  const blind = runBlindCalibration({
    repoRoot: args.repoRoot,
    freeze: args.originalFreeze,
    artifactRootRel: POST_REMEDIATION_V1_REL,
    outputOverlayRootAbs: overlayAbs,
  });

  let candidates = applyOwnershipAndDedupe(blind.candidates);
  const triageSeed = candidates.map((c) => {
    const base: Batch5Candidate = {
      candidateId: c.candidateId,
      caseId: c.caseId,
      controlId: c.controlId,
      findingCode: c.findingCode,
      occurrenceRef: c.occurrenceRef,
      exactWording: c.exactWording,
      plainEnglish: c.plainEnglish,
      surface: c.surface,
      outputSha256: c.outputSha256,
      candidateClass: c.candidateClass,
    };
    return triageCandidate(base);
  });
  const triaged = markDuplicateOccurrences(triageSeed);
  const triageById = new Map(triaged.map((t) => [t.candidateId, t]));
  candidates = candidates.map((c) => {
    const t = triageById.get(c.candidateId);
    if (t?.bucket === "duplicate_occurrence" && !c.duplicateOfCandidateId) {
      const m = /Duplicate of (.+)/.exec(t.reason);
      return { ...c, duplicateOfCandidateId: m?.[1] ?? c.duplicateOfCandidateId };
    }
    return c;
  });

  const freezeBody = `${candidates.map((c) => JSON.stringify(c)).join("\n")}${candidates.length ? "\n" : ""}`;
  const newCandidateFreezeSha256 = sha256(freezeBody);
  writeJson(path.join(outAbs, "candidate-freeze-receipt.json"), {
    schemaVersion: "stage150-candidate-freeze@1.0.0",
    runId,
    frozenAt: new Date().toISOString(),
    truthOpenedBeforeFreeze: false,
    populationOrderedMembershipSha256: args.originalFreeze.orderedMembershipSha256,
    candidateCount: candidates.length,
    freezeSha256: newCandidateFreezeSha256,
    candidates,
    postRemediation: true,
  });
  fs.writeFileSync(path.join(outAbs, "candidate-freeze.jsonl"), freezeBody, "utf8");

  const truthOpen = openTruthAfterCandidateFreeze({
    repoRoot: args.repoRoot,
    freeze: args.originalFreeze,
    candidates,
    candidateFreezeSha256: newCandidateFreezeSha256,
    artifactRootRel: POST_REMEDIATION_V1_REL,
  });
  writeJson(path.join(outAbs, "truth-open-sequence-receipts.json"), {
    schemaVersion: "stage150-truth-open-sequence@1.0.0",
    ...truthOpen,
    postRemediation: true,
  });

  const caseFamilyById = Object.fromEntries(
    args.originalFreeze.membership.map((m) => [m.caseId, m.family]),
  );
  const review = buildCalibrationReviewBatches({
    candidates,
    caseFamilyById,
    maxPerBatch: 50,
  });
  const reviewDir = path.join(outAbs, "review-batches");
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(path.join(reviewDir, "INDEX.md"), review.indexMarkdown, "utf8");
  review.batches.forEach((batch, i) => {
    writeJson(path.join(reviewDir, `batch-${String(i + 1).padStart(3, "0")}.json`), {
      schemaVersion: "stage150-calibration-review-batch@1.0.0",
      batchIndex: i + 1,
      uniqueStringCount: batch.length,
      humanDispositionsBlank: true,
      items: batch,
    });
  });

  // Occurrence-by-occurrence comparison (old vs new).
  const oldKey = (c: CalibrationCandidate) =>
    `${c.caseId}|${c.controlId}|${c.findingCode}|${c.occurrenceRef}|${c.wordingHash}`;
  const oldByKey = new Map(args.originalCandidates.map((c) => [oldKey(c), c]));
  const newByKey = new Map(candidates.map((c) => [oldKey(c), c]));
  const allKeys = new Set([...oldByKey.keys(), ...newByKey.keys()]);
  const occurrenceCompare: OccurrenceCompareRow[] = [];
  for (const k of allKeys) {
    const o = oldByKey.get(k);
    const n = newByKey.get(k);
    const sample = n ?? o!;
    let status: OccurrenceCompareRow["status"] = "unchanged_other";
    if (o && !n) {
      status = isPri01(o) ? "cleared" : "cleared";
    } else if (!o && n) {
      status = "new_regression";
    } else if (o && n) {
      status = isPri01(o) ? "persisted" : "unchanged_other";
    }
    occurrenceCompare.push({
      candidateId: sample.candidateId,
      caseId: sample.caseId,
      cohort: sample.cohort,
      controlId: sample.controlId,
      findingCode: sample.findingCode,
      occurrenceRef: sample.occurrenceRef,
      wordingHash: sample.wordingHash,
      status,
    });
  }

  const originalPri01 = args.originalCandidates.filter(isPri01);
  const remainingPri01 = candidates.filter(isPri01);
  const newDefects = occurrenceCompare.filter((r) => r.status === "new_regression");

  writeJson(path.join(outAbs, "before-after-finding-map.json"), {
    schemaVersion: "stage150-pri01-before-after-finding-map@1.0.0",
    originalCandidateCount: args.originalCandidates.length,
    newCandidateCount: candidates.length,
    originalPri01CandidateIds: originalPri01.map((c) => c.candidateId),
    remainingPri01CandidateIds: remainingPri01.map((c) => c.candidateId),
    pri01RootCleared: remainingPri01.length === 0,
    occurrenceCompare,
  });

  writeJson(path.join(outAbs, "regression-report.json"), {
    schemaVersion: "stage150-pri01-regression-report@1.0.0",
    newDefectCount: newDefects.length,
    regressionCount: newDefects.length,
    newDefects,
    note: "Regressions are new occurrences absent from the frozen candidate freeze. Unavailable/not_exercised denominators unchanged by design.",
    exitDenominatorsUnchanged: true,
    authenticatedBrowserNotExercised: 150,
  });

  writeJson(path.join(outAbs, "all-exit-matrix.json"), {
    schemaVersion: "stage150-all-exit-matrix@1.0.0",
    matrix: Object.fromEntries(
      BATCH10_EXIT_IDS.map((id) => {
        const genuine = args.originalFreeze.membership.filter(
          (m) => m.exitClasses[id] === "genuine_production_payload",
        ).length;
        const unavailable = args.originalFreeze.membership.filter(
          (m) => m.exitClasses[id] === "unavailable",
        ).length;
        const notExercised = args.originalFreeze.membership.filter(
          (m) => m.exitClasses[id] === "not_exercised",
        ).length;
        return [id, { genuine_production_payload: genuine, unavailable, not_exercised: notExercised }];
      }),
    ),
    rule: "Denominators copied from frozen freeze — unavailable/not_exercised unchanged.",
  });

  writeJson(path.join(outAbs, "calibration-run-summary.json"), {
    schemaVersion: STAGE150_CALIBRATION_SCHEMA,
    runId,
    postRemediation: true,
    populationCount: args.originalFreeze.populationCount,
    orderedMembershipSha256: args.originalFreeze.orderedMembershipSha256,
    candidateFreezeSha256: newCandidateFreezeSha256,
    stage150CalibrationRunCompleted: true,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    caseBrainRepaired: false,
    applicationRepair: false,
    corpusHarnessRemediation: true,
  });

  return {
    runId,
    outRel: POST_REMEDIATION_V1_REL,
    orderedMembershipSha256Preserved: args.originalFreeze.orderedMembershipSha256,
    originalCandidateFreezeSha256: args.originalCandidateFreezeSha256,
    newCandidateFreezeSha256,
    rematerialise,
    originalPri01CandidateIds: originalPri01.map((c) => c.candidateId),
    remainingPri01CandidateIds: remainingPri01.map((c) => c.candidateId),
    pri01RootCleared: remainingPri01.length === 0,
    pri01DuplicateCleared: remainingPri01.length === 0,
    occurrenceCompare,
    newDefectCount: newDefects.length,
    regressionCount: newDefects.length,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationRepair: false,
    corpusHarnessRemediation: true,
  };
}
