/**
 * Stage-150 calibration pipeline — freeze → blind run → candidate freeze → truth open → artefacts.
 * Measurement only. No CaseBrain repair, no detector promotion, no Stage-300.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { triageCandidate, markDuplicateOccurrences, type Batch5Candidate } from "../batch5-triage";
import { STAGE150_CALIBRATION_ARTIFACT_ROOT, STAGE150_CALIBRATION_SCHEMA } from "./constants";
import { freezeAcceptedPopulation, revalidatePopulationFreeze, type PopulationFreezeReceipt } from "./population-freeze";
import { runBlindCalibration, type CalibrationCandidate, type ControlCaseExercise } from "./blind-runner";
import { applyOwnershipAndDedupe } from "./ownership-dedupe";
import { openTruthAfterCandidateFreeze } from "./truth-open";
import { buildCalibrationReviewBatches } from "./review-batches";
import { BATCH10_EXIT_IDS } from "../batch10/schemas";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type CalibrationPipelineResult = {
  runId: string;
  outRel: string;
  freeze: PopulationFreezeReceipt;
  beforeValidation: ReturnType<typeof revalidatePopulationFreeze>;
  afterValidation: ReturnType<typeof revalidatePopulationFreeze>;
  candidateFreezeSha256: string;
  candidateCount: number;
  exerciseRowCount: number;
  findingUnits: Record<string, number>;
  stage150CalibrationRunCompleted: true;
  stage150ExecutionAllowed: false;
  stage150SampleSelectionAllowed: false;
  freezeAllowed: false;
  programmePassSupported: false;
};

export function runStage150CalibrationPipeline(args: {
  repoRoot: string;
  headCommit: string;
  runId?: string;
}): CalibrationPipelineResult {
  const runId =
    args.runId ??
    `s150-cal-${new Date().toISOString().replace(/[:.]/g, "-")}-${sha256(args.headCommit).slice(0, 8)}`;
  const outAbs = path.join(args.repoRoot, STAGE150_CALIBRATION_ARTIFACT_ROOT);
  fs.mkdirSync(outAbs, { recursive: true });

  // —— A. FREEZE BEFORE EXECUTION ——
  const freeze = freezeAcceptedPopulation({
    repoRoot: args.repoRoot,
    headCommit: args.headCommit,
    runId,
  });
  writeJson(path.join(outAbs, "frozen-population-manifest.json"), freeze);
  writeJson(path.join(outAbs, "freeze-receipt.json"), {
    schemaVersion: "stage150-freeze-receipt@1.0.0",
    runId,
    frozenAt: freeze.frozenAt,
    orderedMembershipSha256: freeze.orderedMembershipSha256,
    populationCount: freeze.populationCount,
    baselineCommit: freeze.baselineCommit,
    headCommit: freeze.headCommit,
    censusNotSubsample: true,
    detectorsRunBeforeFreeze: false,
    truthOpenedBeforeFreeze: false,
  });

  const beforeValidation = revalidatePopulationFreeze(args.repoRoot, freeze);
  if (!beforeValidation.ok) {
    throw new Error(`Pre-execution freeze validation failed: ${beforeValidation.mismatches.join(",")}`);
  }
  writeJson(path.join(outAbs, "freeze-validation-before-execution.json"), beforeValidation);

  // —— B/C. BLIND EXECUTION ——
  const blind = runBlindCalibration({ repoRoot: args.repoRoot, freeze });
  let candidates = applyOwnershipAndDedupe(blind.candidates);

  // Output-only triage buckets (no invented human review); then mark duplicates
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

  // —— Candidate freeze (before truth) ——
  const freezeBody = `${candidates.map((c) => JSON.stringify(c)).join("\n")}${candidates.length ? "\n" : ""}`;
  const candidateFreezeSha256 = sha256(freezeBody);
  const candidateFreeze = {
    schemaVersion: "stage150-candidate-freeze@1.0.0",
    runId,
    frozenAt: new Date().toISOString(),
    truthOpenedBeforeFreeze: false,
    populationOrderedMembershipSha256: freeze.orderedMembershipSha256,
    candidateCount: candidates.length,
    freezeSha256: candidateFreezeSha256,
    candidates,
  };
  writeJson(path.join(outAbs, "candidate-freeze-receipt.json"), candidateFreeze);
  fs.writeFileSync(path.join(outAbs, "candidate-freeze.jsonl"), freezeBody, "utf8");

  // —— E. Finding units (separate) ——
  const uniqueExact = new Set(candidates.map((c) => c.wordingHash));
  const uniqueTemplates = new Set(candidates.map((c) => c.normalisedTemplateHash));
  const casesWithFindings = new Set(candidates.map((c) => c.caseId));
  const surfaces = new Set(candidates.map((c) => c.surface));
  const fully = blind.exerciseRows.filter((r) => r.namedControlExerciseStatus === "fully_exercised");
  const partially = blind.exerciseRows.filter(
    (r) =>
      r.namedControlExerciseStatus === "partially_exercised" ||
      r.namedControlExerciseStatus === "evaluated",
  );
  const controlIds = [...new Set(blind.exerciseRows.map((r) => r.controlId))];
  const controlsWithAnyPartial = new Set(partially.map((r) => r.controlId));
  const controlsWithAnyFull = new Set(fully.map((r) => r.controlId));
  const controlsNeverNamedExercised = controlIds.filter(
    (id) => !controlsWithAnyPartial.has(id) && !controlsWithAnyFull.has(id),
  );
  const confirmed = triaged.filter(
    (t) =>
      t.bucket === "confirmed_app_defect" || t.bucket === "output_intrinsic_confirmed_app_defect",
  );
  const unresolved = triaged.filter((t) => t.bucket === "unresolved_source");
  const fps = triaged.filter((t) => t.bucket === "detector_false_positive");
  const dups = candidates.filter((c) => c.duplicateOfCandidateId);

  const findingUnits = {
    cases: freeze.populationCount,
    surfaces: surfaces.size,
    occurrenceFindings: candidates.length,
    exactStrings: uniqueExact.size,
    normalisedTemplates: uniqueTemplates.size,
    casesWithFindings: casesWithFindings.size,
    controlsExercisedFully: controlsWithAnyFull.size,
    controlsExercisedPartially: controlsWithAnyPartial.size,
    controlsNotExercised: controlsNeverNamedExercised.length,
    candidateDefects: candidates.filter((c) => c.candidateClass === "candidate_defect").length,
    confirmedOutputIntrinsicDefects: confirmed.length,
    unresolvedSourceProvenance: unresolved.length,
    containment: triaged.filter((t) => t.bucket === "safe_qualified_output").length,
    detectorFalsePositives: fps.length,
    duplicateOccurrences: dups.length,
  };
  writeJson(path.join(outAbs, "finding-units.json"), {
    schemaVersion: "stage150-finding-units@1.0.0",
    note: "Units are reported separately and must not be mixed.",
    units: findingUnits,
    zeroCandidateRateHonesty:
      candidates.length === 0
        ? "Zero candidates — FP/FN/recall unavailable; never report 0%."
        : null,
  });

  // —— Per-control exercise matrix ——
  const byControl = new Map<string, ControlCaseExercise[]>();
  for (const r of blind.exerciseRows) {
    const list = byControl.get(r.controlId) ?? [];
    list.push(r);
    byControl.set(r.controlId, list);
  }
  const perControlMatrix = [...byControl.entries()].map(([controlId, rows]) => {
    const impl = rows[0]?.implementationStatus ?? "unknown";
    return {
      controlId,
      implementationStatus: impl,
      cases: rows.length,
      applicable: rows.filter((r) => r.applicability === "applicable").length,
      namedFullyExercised: rows.filter((r) => r.namedControlExerciseStatus === "fully_exercised")
        .length,
      namedPartiallyExercised: rows.filter(
        (r) =>
          r.namedControlExerciseStatus === "partially_exercised" ||
          r.namedControlExerciseStatus === "evaluated",
      ).length,
      namedNotExercised: rows.filter((r) => r.namedControlExerciseStatus === "not_exercised").length,
      occurrenceFindings: rows.reduce((n, r) => n + r.occurrenceCount, 0),
      phraseProbeOnlyCases: rows.filter((r) => r.phraseProbeOnly).length,
      promoted: false,
    };
  });
  writeJson(path.join(outAbs, "per-control-exercise-matrix.json"), {
    schemaVersion: "stage150-per-control-exercise-matrix@1.0.0",
    controlCount: perControlMatrix.length,
    expectedControlCount: 161,
    rows: perControlMatrix,
    promotions: [],
    note: "No control promoted during this calibration run.",
  });

  // —— All-exit matrix ——
  const allExitMatrix = Object.fromEntries(
    BATCH10_EXIT_IDS.map((id) => {
      const genuine = freeze.membership.filter(
        (m) => m.exitClasses[id] === "genuine_production_payload",
      ).length;
      const unavailable = freeze.membership.filter((m) => m.exitClasses[id] === "unavailable").length;
      const notExercised = freeze.membership.filter(
        (m) => m.exitClasses[id] === "not_exercised",
      ).length;
      return [id, { genuine_production_payload: genuine, unavailable, not_exercised: notExercised }];
    }),
  );
  writeJson(path.join(outAbs, "all-exit-matrix.json"), {
    schemaVersion: "stage150-all-exit-matrix@1.0.0",
    matrix: allExitMatrix,
    rule: "Never combine unavailable exits into a PASS denominator. authenticated_browser remains not_exercised on all 150.",
  });

  // —— Finding ledger ——
  writeJson(path.join(outAbs, "finding-ledger.json"), {
    schemaVersion: "stage150-finding-ledger@1.0.0",
    runId,
    candidateFreezeSha256,
    candidateCount: candidates.length,
    candidates,
    triageBuckets: Object.fromEntries(
      (
        [
          "confirmed_app_defect",
          "output_intrinsic_confirmed_app_defect",
          "detector_false_positive",
          "unresolved_source",
          "truth_key_defect",
          "duplicate_occurrence",
          "safe_qualified_output",
        ] as const
      ).map((b) => [b, triaged.filter((t) => t.bucket === b).length]),
    ),
  });

  // —— Root-cause summary ——
  const rootCauses: Record<string, number> = {};
  for (const c of candidates) {
    const fam = c.controlId.split("-").slice(0, 2).join("-");
    rootCauses[fam] = (rootCauses[fam] ?? 0) + 1;
  }
  writeJson(path.join(outAbs, "root-cause-summary.json"), {
    schemaVersion: "stage150-root-cause-summary@1.0.0",
    byControlFamilyPrefix: rootCauses,
    ownershipLinked: candidates.filter((c) => c.ownerFindingId).length,
    duplicatesLinked: dups.length,
  });

  // —— D. Candidate freeze complete → E. Truth open ——
  const truthOpen = openTruthAfterCandidateFreeze({
    repoRoot: args.repoRoot,
    freeze,
    candidates,
    candidateFreezeSha256,
  });
  writeJson(path.join(outAbs, "truth-open-sequence-receipts.json"), {
    schemaVersion: "stage150-truth-open-sequence@1.0.0",
    ...truthOpen,
    ordering: [
      "1_population_freeze",
      "2_load_source_and_output_only",
      "3_run_controls_persist_candidates",
      "4_candidate_freeze",
      "5_truth_open",
      "6_record_truth_timestamps_and_hashes",
    ],
  });

  // —— Review batches ——
  const caseFamilyById = Object.fromEntries(
    freeze.membership.map((m) => [m.caseId, m.family]),
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

  // —— After execution freeze revalidation ——
  const afterValidation = revalidatePopulationFreeze(args.repoRoot, freeze);
  writeJson(path.join(outAbs, "freeze-validation-after-execution.json"), afterValidation);
  if (!afterValidation.ok) {
    throw new Error(`Post-execution freeze validation failed: ${afterValidation.mismatches.join(",")}`);
  }

  writeJson(path.join(outAbs, "exercise-receipt-index.json"), {
    schemaVersion: "stage150-exercise-receipt-index@1.0.0",
    relativePath: blind.receiptsRelPath,
    sha256: blind.receiptsSha256,
    lineCount: blind.receiptLineCount,
    regenerable: true,
    truthContentsOpenedDuringBlind: false,
  });

  writeJson(path.join(outAbs, "calibration-run-summary.json"), {
    schemaVersion: STAGE150_CALIBRATION_SCHEMA,
    runId,
    populationCount: freeze.populationCount,
    orderedMembershipSha256: freeze.orderedMembershipSha256,
    candidateFreezeSha256,
    findingUnits,
    stage150CalibrationRunCompleted: true,
    stage150ExecutionAllowed: false,
    stage150SampleSelectionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    caseBrainRepaired: false,
    detectorsAlteredAfterResults: false,
    controlsPromoted: [],
  });

  return {
    runId,
    outRel: STAGE150_CALIBRATION_ARTIFACT_ROOT,
    freeze,
    beforeValidation,
    afterValidation,
    candidateFreezeSha256,
    candidateCount: candidates.length,
    exerciseRowCount: blind.exerciseRows.length,
    findingUnits,
    stage150CalibrationRunCompleted: true,
    stage150ExecutionAllowed: false,
    stage150SampleSelectionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
  };
}

export type { CalibrationCandidate };
