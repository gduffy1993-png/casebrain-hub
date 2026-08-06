/**
 * Blind Stage-150 calibration exercise — all 161 registered controls × 150 cases.
 * Truth is never opened in this phase.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { STAGE150_PACKET_LOCAL_HANDLERS } from "../detector-registry";
import {
  buildEvalContext,
  evaluateAllStage150Intelligence,
  toV2CandidateFromStage150Hit,
  type Stage150Hit,
} from "../detectors";
import { scanCaseEligibility, type ControlReceipt } from "../eligibility";
import { buildStage150ImplementationCapabilityMatrix } from "../implementation-matrix";
import { structuredPacketToEvalOutput } from "../batch10/batch9-bridge";
import type { Batch10StructuredCasePacket } from "../batch10/schemas";
import { BATCH10_EXIT_IDS } from "../batch10/schemas";
import type { FrozenMembershipRow, PopulationFreezeReceipt } from "./population-freeze";
import { STAGE150_CALIBRATION_ARTIFACT_ROOT } from "./constants";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export type CalibrationCandidate = {
  candidateId: string;
  caseId: string;
  cohort: "A" | "B";
  controlId: string;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  wordingHash: string;
  normalisedTemplateHash: string;
  plainEnglish: string;
  candidateClass: string;
  evidenceRefs: string[];
  outputSha256: string;
  surface: string;
  exitId: string | null;
  ownerFindingId: string | null;
  ownershipGroupId: string | null;
  duplicateOfCandidateId: string | null;
};

export type ControlCaseExercise = {
  caseId: string;
  cohort: "A" | "B";
  controlId: string;
  implementationStatus: string;
  prerequisiteAvailability: "present" | "partial" | "absent";
  applicability: "applicable" | "not_applicable" | "unavailable";
  namedControlExerciseStatus: "fully_exercised" | "partially_exercised" | "not_exercised" | "evaluated" | "unresolved";
  occurrenceCount: number;
  evidenceReferences: string[];
  exitDenominator: Record<string, string>;
  verdictOrUnavailable: string;
  detectorClassification: string | null;
  phraseProbeOnly: boolean;
};

export type BlindRunResult = {
  workRootRel: string;
  exerciseRows: ControlCaseExercise[];
  candidates: CalibrationCandidate[];
  perCaseOutputSha256: Record<string, string>;
  receiptLineCount: number;
  receiptsRelPath: string;
  receiptsSha256: string;
};

function normaliseTemplate(s: string): string {
  return s
    .toLowerCase()
    .replace(/uq-[0-9a-f]+-[a-z]+/gi, "UQ_TOKEN")
    .replace(/[0-9a-f]{8,}/gi, "HEX")
    .replace(/\s+/g, " ")
    .trim();
}

function inferExit(occurrenceRef: string): string | null {
  for (const id of BATCH10_EXIT_IDS) {
    if (occurrenceRef.includes(id) || occurrenceRef.includes(`/exitPayloadReceipts/${id}`)) return id;
  }
  return null;
}

function prepareCaseWorkDir(args: {
  repoRoot: string;
  workRoot: string;
  row: FrozenMembershipRow;
  /** When set, Cohort B loads rematerialised casebrain-output from this root/<caseId>/ */
  outputOverlayRootAbs?: string;
}): { workAbs: string; outputSha256: string; outputRel: string } {
  const workAbs = path.join(args.workRoot, args.row.caseId);
  fs.mkdirSync(workAbs, { recursive: true });
  const outAbs = path.join(workAbs, "casebrain-output.json");

  if (args.outputOverlayRootAbs && args.row.cohort === "B") {
    const overlay = path.join(args.outputOverlayRootAbs, args.row.caseId, "casebrain-output.json");
    if (fs.existsSync(overlay)) {
      const buf = fs.readFileSync(overlay);
      fs.writeFileSync(outAbs, buf);
      return {
        workAbs,
        outputSha256: sha256(buf),
        outputRel: path.relative(args.repoRoot, outAbs).replace(/\\/g, "/"),
      };
    }
  }

  if (args.row.casebrainOutputRelativePath) {
    const src = path.join(args.repoRoot, args.row.casebrainOutputRelativePath);
    const buf = fs.readFileSync(src);
    fs.writeFileSync(outAbs, buf);
    return {
      workAbs,
      outputSha256: sha256(buf),
      outputRel: path.relative(args.repoRoot, outAbs).replace(/\\/g, "/"),
    };
  }

  // Cohort A: project frozen structured packet into CaseBrain-shaped output (no truth).
  const packetAbs = path.join(args.repoRoot, args.row.packetRelativePath);
  const packet = JSON.parse(fs.readFileSync(packetAbs, "utf8")) as Batch10StructuredCasePacket;
  const projected = structuredPacketToEvalOutput(packet);
  const body = `${JSON.stringify(projected, null, 2)}\n`;
  fs.writeFileSync(outAbs, body, "utf8");
  return {
    workAbs,
    outputSha256: sha256(body),
    outputRel: path.relative(args.repoRoot, outAbs).replace(/\\/g, "/"),
  };
}

/**
 * Blind exercise: freeze already done; load source/output only; run all controls; persist candidates.
 */
export function runBlindCalibration(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
  /** Override artefact subdir (default: stage150-calibration-run). */
  artifactRootRel?: string;
  /** When set, Cohort B casebrain-output is loaded from overlay/<caseId>/casebrain-output.json. */
  outputOverlayRootAbs?: string;
}): BlindRunResult {
  const artifactRel = args.artifactRootRel ?? STAGE150_CALIBRATION_ARTIFACT_ROOT;
  const workRoot = path.join(args.repoRoot, artifactRel, "work");
  fs.mkdirSync(workRoot, { recursive: true });
  const rawDir = path.join(args.repoRoot, artifactRel, "raw-receipts");
  fs.mkdirSync(rawDir, { recursive: true });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  const handlerIds = new Set(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => h.controlId));
  const exerciseRows: ControlCaseExercise[] = [];
  const candidates: CalibrationCandidate[] = [];
  const perCaseOutputSha256: Record<string, string> = {};
  const receiptLines: string[] = [];

  for (const row of args.freeze.membership) {
    // Re-check packet not rewritten
    const packetBuf = fs.readFileSync(path.join(args.repoRoot, row.packetRelativePath));
    if (sha256(packetBuf) !== row.packetSha256) {
      throw new Error(`Frozen packet rewritten before blind run: ${row.caseId}`);
    }

    const prepared = prepareCaseWorkDir({
      repoRoot: args.repoRoot,
      workRoot,
      row,
      outputOverlayRootAbs: args.outputOverlayRootAbs,
    });
    perCaseOutputSha256[row.caseId] = prepared.outputSha256;

    // Confirm truth is NOT present in work dir during blind phase
    const truthInWork = path.join(prepared.workAbs, "truth-key.json");
    if (fs.existsSync(truthInWork)) fs.unlinkSync(truthInWork);

    const eligibility = scanCaseEligibility(row.caseId, prepared.workAbs);
    const receiptByControl = new Map(eligibility.receipts.map((r) => [r.controlId, r]));

    const output = JSON.parse(
      fs.readFileSync(path.join(prepared.workAbs, "casebrain-output.json"), "utf8"),
    ) as Record<string, unknown>;
    const ctx = buildEvalContext(row.caseId, output);
    const hits = evaluateAllStage150Intelligence(ctx);
    const hitsByControl = new Map<string, Stage150Hit[]>();
    for (const h of hits) {
      const list = hitsByControl.get(h.controlId) ?? [];
      list.push(h);
      hitsByControl.set(h.controlId, list);
    }

    for (const mrow of matrix.rows) {
      const receipt: ControlReceipt | undefined = receiptByControl.get(mrow.controlId);
      const controlHits = hitsByControl.get(mrow.controlId) ?? [];
      const isHandler = handlerIds.has(mrow.controlId);
      const phraseProbe = receipt?.detectorClassification === "phrase_probe_only";
      const sni = mrow.implementationStatus === "specified_not_implemented";

      let named: ControlCaseExercise["namedControlExerciseStatus"] = "not_exercised";
      let applicability: ControlCaseExercise["applicability"] = "unavailable";
      let prereq: ControlCaseExercise["prerequisiteAvailability"] = "absent";
      let verdict = "unavailable_not_exercised";

      if (sni || !isHandler) {
        named = "not_exercised";
        applicability = "unavailable";
        prereq = "absent";
        verdict = "specified_not_implemented_or_missing_adapter";
      } else if (receipt) {
        named = phraseProbe
          ? "not_exercised"
          : receipt.namedControlExerciseStatus;
        // Phrase probes never count as named-control exercise
        applicability =
          receipt.probeStatus === "not_exercised" && receipt.namedControlExerciseStatus === "not_exercised"
            ? "unavailable"
            : "applicable";
        prereq =
          receipt.prerequisiteEvidenceValidationOk
            ? "present"
            : receipt.missingInputReason
              ? "absent"
              : "partial";
        if (controlHits.length === 0) {
          verdict =
            named === "not_exercised"
              ? "unavailable_not_exercised"
              : "evaluated_zero_candidates_not_pass";
        } else {
          verdict = `candidates:${controlHits.length}`;
        }
      }

      exerciseRows.push({
        caseId: row.caseId,
        cohort: row.cohort,
        controlId: mrow.controlId,
        implementationStatus: mrow.implementationStatus,
        prerequisiteAvailability: prereq,
        applicability,
        namedControlExerciseStatus: named,
        occurrenceCount: controlHits.length,
        evidenceReferences: [
          ...new Set(controlHits.flatMap((h) => h.evidenceRefs)),
        ].slice(0, 20),
        exitDenominator: row.exitClasses,
        verdictOrUnavailable: verdict,
        detectorClassification: receipt?.detectorClassification ?? null,
        phraseProbeOnly: Boolean(phraseProbe),
      });

      receiptLines.push(
        JSON.stringify({
          caseId: row.caseId,
          cohort: row.cohort,
          controlId: mrow.controlId,
          implementationStatus: mrow.implementationStatus,
          namedControlExerciseStatus: named,
          occurrenceCount: controlHits.length,
          outputSha256: prepared.outputSha256,
          truthOpened: false,
        }),
      );
    }

    for (const h of hits) {
      const cand = toV2CandidateFromStage150Hit(h, row.caseId);
      candidates.push({
        candidateId: cand.candidateId,
        caseId: row.caseId,
        cohort: row.cohort,
        controlId: h.controlId,
        findingCode: h.findingCode,
        occurrenceRef: h.occurrenceRef,
        exactWording: h.exactWording,
        wordingHash: cand.wordingHash,
        normalisedTemplateHash: sha256(normaliseTemplate(h.exactWording)),
        plainEnglish: h.plainEnglish,
        candidateClass: h.candidateClass,
        evidenceRefs: h.evidenceRefs,
        outputSha256: prepared.outputSha256,
        surface: h.occurrenceRef,
        exitId: inferExit(h.occurrenceRef),
        ownerFindingId: null,
        ownershipGroupId: null,
        duplicateOfCandidateId: null,
      });
    }
  }

  const receiptsBody = `${receiptLines.join("\n")}\n`;
  const receiptsRel = path.join(artifactRel, "raw-receipts", "exercise-receipts.jsonl");
  fs.writeFileSync(path.join(args.repoRoot, receiptsRel), receiptsBody, "utf8");

  return {
    workRootRel: path.join(artifactRel, "work").replace(/\\/g, "/"),
    exerciseRows,
    candidates,
    perCaseOutputSha256,
    receiptLineCount: receiptLines.length,
    receiptsRelPath: receiptsRel.replace(/\\/g, "/"),
    receiptsSha256: sha256(receiptsBody),
  };
}
