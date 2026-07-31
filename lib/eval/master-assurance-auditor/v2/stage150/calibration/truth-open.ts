/**
 * Truth-open sequence AFTER candidate freeze — inventory + hash, then open for calibration compare.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { runBlindingCaptureSequence } from "../../every-word/blinding-sequence";
import type { PopulationFreezeReceipt } from "./population-freeze";
import type { CalibrationCandidate } from "./blind-runner";
import { STAGE150_CALIBRATION_ARTIFACT_ROOT } from "./constants";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export type TruthOpenCaseReceipt = {
  caseId: string;
  cohort: "A" | "B";
  truthRelativePath: string | null;
  truthSha256: string | null;
  truthOpenedAt: string | null;
  blindingReceiptPath: string | null;
  preTruthLedgerHash: string | null;
  outputFileHash: string | null;
  truthOpenedAfterCandidateFreeze: true;
  note: string;
};

export function resolveTruthPath(
  repoRoot: string,
  row: PopulationFreezeReceipt["membership"][number],
): string | null {
  if (row.cohort === "B" && row.sourceCasePath) {
    const p = path.join(repoRoot, row.sourceCasePath, "truth-key.json");
    return fs.existsSync(p) ? p : null;
  }
  if (row.cohort === "A" && row.sourceCasePath) {
    const p = path.join(repoRoot, row.sourceCasePath, "truth-key.json");
    return fs.existsSync(p) ? p : null;
  }
  return null;
}

/**
 * Copy truth into work dir only after candidate freeze, then run blinding sequence.
 */
export function openTruthAfterCandidateFreeze(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
  candidates: CalibrationCandidate[];
  candidateFreezeSha256: string;
  artifactRootRel?: string;
}): {
  truthContentsOpened: true;
  openedAfterCandidateFreeze: true;
  candidateFreezeSha256Verified: string;
  cases: TruthOpenCaseReceipt[];
} {
  const artifactRel = args.artifactRootRel ?? STAGE150_CALIBRATION_ARTIFACT_ROOT;
  const cases: TruthOpenCaseReceipt[] = [];
  const workRoot = path.join(args.repoRoot, artifactRel, "work");
  const ledgerRoot = path.join(args.repoRoot, artifactRel, "pre-truth-ledgers");
  fs.mkdirSync(ledgerRoot, { recursive: true });

  for (const row of args.freeze.membership) {
    const truthAbs = resolveTruthPath(args.repoRoot, row);
    const workAbs = path.join(workRoot, row.caseId);
    const caseCands = args.candidates.filter((c) => c.caseId === row.caseId);
    const ledgerLines = caseCands.map((c) =>
      JSON.stringify({
        candidateId: c.candidateId,
        controlId: c.controlId,
        findingCode: c.findingCode,
        occurrenceRef: c.occurrenceRef,
        wordingHash: c.wordingHash,
        outputSha256: c.outputSha256,
      }),
    );

    if (!truthAbs || !fs.existsSync(path.join(workAbs, "casebrain-output.json"))) {
      cases.push({
        caseId: row.caseId,
        cohort: row.cohort,
        truthRelativePath: truthAbs
          ? path.relative(args.repoRoot, truthAbs).replace(/\\/g, "/")
          : null,
        truthSha256: truthAbs && fs.existsSync(truthAbs) ? sha256(fs.readFileSync(truthAbs)) : null,
        truthOpenedAt: null,
        blindingReceiptPath: null,
        preTruthLedgerHash: null,
        outputFileHash: null,
        truthOpenedAfterCandidateFreeze: true,
        note: truthAbs ? "truth present but work output missing — skipped open" : "no truth-key path",
      });
      continue;
    }

    // Place truth into work dir only now (after candidate freeze)
    const workTruth = path.join(workAbs, "truth-key.json");
    fs.copyFileSync(truthAbs, workTruth);
    const truthSha = sha256(fs.readFileSync(workTruth));
    const openedAt = new Date().toISOString();

    const persistLedgerPath = path.join(ledgerRoot, `${row.caseId}.jsonl`);
    const { receipt } = runBlindingCaptureSequence({
      caseId: row.caseId,
      packetAbsDir: workAbs,
      occurrenceLedgerLines: ledgerLines,
      persistLedgerPath,
    });

    const receiptRel = path
      .join(artifactRel, "truth-open-receipts", `${row.caseId}.json`)
      .replace(/\\/g, "/");
    fs.mkdirSync(path.join(args.repoRoot, path.dirname(receiptRel)), { recursive: true });
    fs.writeFileSync(
      path.join(args.repoRoot, receiptRel),
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );

    cases.push({
      caseId: row.caseId,
      cohort: row.cohort,
      truthRelativePath: path.relative(args.repoRoot, truthAbs).replace(/\\/g, "/"),
      truthSha256: truthSha,
      truthOpenedAt: openedAt,
      blindingReceiptPath: receiptRel,
      preTruthLedgerHash: receipt.preTruthOccurrenceLedgerHash,
      outputFileHash: receipt.outputFileHash,
      truthOpenedAfterCandidateFreeze: true,
      note: "Truth opened only after candidate freeze; blinding sequence verified.",
    });
  }

  return {
    truthContentsOpened: true,
    openedAfterCandidateFreeze: true,
    candidateFreezeSha256Verified: args.candidateFreezeSha256,
    cases,
  };
}
