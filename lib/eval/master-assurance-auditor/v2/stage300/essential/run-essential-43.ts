/**
 * Run all 43 essential controls against one case's EssentialCaseInputs, producing exercise rows
 * plus fresh candidates. NEVER imports the Stage-150 candidate ledger — every candidateId here is
 * freshly derived from (runId, evaluatorVersion, controlId, occurrenceRef, caseId).
 */

import crypto from "node:crypto";

import { ESSENTIAL_EVALUATOR_VERSION, type EssentialControlId } from "./constants";
import type { EssentialCaseInputs } from "./inputs/load-essential-inputs";
import { runAllEssentialControls } from "./registry";
import type { EssentialCandidate, EssentialControlResult } from "./types";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type EssentialExerciseRow = {
  runId: string;
  evaluatorVersion: string;
  caseId: string;
  cohort: "A" | "B";
  lineage: EssentialCaseInputs["lineage"];
  controlId: EssentialControlId;
  namedControlExerciseStatus: EssentialControlResult["namedControlExerciseStatus"];
  applicable: boolean;
  missingInputReason: string | null;
  backing: EssentialControlResult["backing"];
  occurrenceCount: number;
  evidenceRefs: string[];
  phraseProbeUsed: false;
};

export type EssentialCaseRunResult = {
  runId: string;
  evaluatorVersion: string;
  caseId: string;
  cohort: "A" | "B";
  lineage: EssentialCaseInputs["lineage"];
  packetSha256: string | null;
  outputSha256: string | null;
  exerciseRows: EssentialExerciseRow[];
  candidates: EssentialCandidate[];
  missingInputs: string[];
};

export function runEssentialFortyThreeForCase(args: { runId: string; inputs: EssentialCaseInputs }): EssentialCaseRunResult {
  const { runId, inputs } = args;
  const results = runAllEssentialControls(inputs);

  const exerciseRows: EssentialExerciseRow[] = results.map((r) => ({
    runId,
    evaluatorVersion: ESSENTIAL_EVALUATOR_VERSION,
    caseId: inputs.caseId,
    cohort: inputs.cohort,
    lineage: inputs.lineage,
    controlId: r.controlId,
    namedControlExerciseStatus: r.namedControlExerciseStatus,
    applicable: r.applicable,
    missingInputReason: r.missingInputReason,
    backing: r.backing,
    occurrenceCount: r.hits.length,
    evidenceRefs: r.evidenceRefs.slice(0, 20),
    phraseProbeUsed: false,
  }));

  const candidates: EssentialCandidate[] = [];
  for (const r of results) {
    for (const h of r.hits) {
      const occurrenceRef = `${inputs.caseId}::${r.controlId}::${h.occurrenceRef}::${h.findingCode}`;
      const candidateId = `ESS43CAND-${sha256(`${runId}|${occurrenceRef}`).slice(0, 24)}`;
      candidates.push({
        candidateId,
        runId,
        evaluatorVersion: ESSENTIAL_EVALUATOR_VERSION,
        caseId: inputs.caseId,
        controlId: r.controlId,
        findingCode: h.findingCode,
        occurrenceRef: h.occurrenceRef,
        exactWording: h.exactWording,
        plainEnglish: h.plainEnglish,
        candidateClass: h.candidateClass,
        evidenceRefs: h.evidenceRefs,
        backing: r.backing,
        packetSha256: inputs.structuredCasePacketSha256,
        outputSha256: inputs.casebrainOutputSha256,
        wordingHash: sha256(h.exactWording),
      });
    }
  }

  return {
    runId,
    evaluatorVersion: ESSENTIAL_EVALUATOR_VERSION,
    caseId: inputs.caseId,
    cohort: inputs.cohort,
    lineage: inputs.lineage,
    packetSha256: inputs.structuredCasePacketSha256,
    outputSha256: inputs.casebrainOutputSha256,
    exerciseRows,
    candidates,
    missingInputs: inputs.missing,
  };
}
