/**
 * Post-remediation rematerialisation of Cohort-B casebrain-output bags.
 *
 * Aligns fiveAnswersEvidenceRows with frozen view-exit truthMap rows.
 * Never overwrites frozen deficit-120 sources. Never invents rows from court prose.
 * Corpus-harness remediation — not a CaseBrain application repair.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { PopulationFreezeReceipt } from "../../calibration/population-freeze";
import {
  alignCasebrainOutputFiveAnswersWithViewRows,
  fiveAnswersRowsSha256,
} from "./five-answers-serialisation";

export const POST_REMEDIATION_V1_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/post-remediation-v1" as const;

export const REMATERIALISED_OUTPUTS_REL = `${POST_REMEDIATION_V1_REL}/rematerialised-outputs` as const;

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type RematerialiseCaseReceipt = {
  caseId: string;
  cohort: "A" | "B";
  action: "projection_only_skipped" | "copied_unchanged" | "aligned_from_view" | "missing_source";
  frozenOutputSha256: string | null;
  rematerialisedOutputSha256: string | null;
  frozenFiveLen: number | null;
  viewRowsLen: number | null;
  rematerialisedFiveLen: number | null;
  repaired: boolean;
  inventedFromCourt: false;
};

export type RematerialiseResult = {
  schemaVersion: "stage150-pri01-rematerialise@1.0.0";
  remediationClass: "batch10_materialisation_serialisation_defect";
  applicationRepair: false;
  corpusHarnessRemediation: true;
  frozenSourcesAltered: false;
  orderedMembershipSha256Preserved: string;
  rematerialisedOutputsRel: string;
  cases: RematerialiseCaseReceipt[];
  repairedCaseIds: string[];
  repairedCount: number;
  cohortBOutputCount: number;
  outputVersionSha256: string;
};

function loadViewRows(
  repoRoot: string,
  sourceCasePath: string | null,
): FiveAnswersEvidenceRow[] | null {
  if (!sourceCasePath) return null;
  const viewPath = path.join(repoRoot, sourceCasePath, "exits", "view", "payload.json");
  if (!fs.existsSync(viewPath)) return null;
  const view = JSON.parse(fs.readFileSync(viewPath, "utf8")) as {
    truthMap?: { evidenceState?: { rows?: FiveAnswersEvidenceRow[] } };
  };
  return view.truthMap?.evidenceState?.rows ?? [];
}

/**
 * Build versioned rematerialised casebrain-output tree from frozen freeze membership.
 * Cohort A remains projection-only (no genuine output written).
 */
export function rematerialiseCohortBFiveAnswersOutputs(args: {
  repoRoot: string;
  freeze: PopulationFreezeReceipt;
}): RematerialiseResult {
  const outRoot = path.join(args.repoRoot, REMATERIALISED_OUTPUTS_REL);
  fs.mkdirSync(outRoot, { recursive: true });

  const cases: RematerialiseCaseReceipt[] = [];
  const repairedCaseIds: string[] = [];
  const versionParts: string[] = [];

  for (const row of args.freeze.membership) {
    if (row.cohort === "A") {
      cases.push({
        caseId: row.caseId,
        cohort: "A",
        action: "projection_only_skipped",
        frozenOutputSha256: null,
        rematerialisedOutputSha256: null,
        frozenFiveLen: null,
        viewRowsLen: null,
        rematerialisedFiveLen: null,
        repaired: false,
        inventedFromCourt: false,
      });
      continue;
    }

    if (!row.casebrainOutputRelativePath || !row.sourceCasePath) {
      cases.push({
        caseId: row.caseId,
        cohort: "B",
        action: "missing_source",
        frozenOutputSha256: null,
        rematerialisedOutputSha256: null,
        frozenFiveLen: null,
        viewRowsLen: null,
        rematerialisedFiveLen: null,
        repaired: false,
        inventedFromCourt: false,
      });
      continue;
    }

    const frozenAbs = path.join(args.repoRoot, row.casebrainOutputRelativePath);
    const frozenBuf = fs.readFileSync(frozenAbs);
    const frozenSha = sha256(frozenBuf);
    const frozenOut = JSON.parse(frozenBuf.toString("utf8")) as Record<string, unknown>;
    const viewRows = loadViewRows(args.repoRoot, row.sourceCasePath) ?? [];
    const aligned = alignCasebrainOutputFiveAnswersWithViewRows({
      casebrainOutput: frozenOut,
      viewEvidenceRows: viewRows,
    });

    const body = `${JSON.stringify(aligned.output, null, 2)}\n`;
    const caseDir = path.join(outRoot, row.caseId);
    fs.mkdirSync(caseDir, { recursive: true });
    const outAbs = path.join(caseDir, "casebrain-output.json");
    fs.writeFileSync(outAbs, body, "utf8");
    const rematerialisedSha = sha256(body);
    versionParts.push(`${row.caseId}|${rematerialisedSha}`);

    if (aligned.repaired) repairedCaseIds.push(row.caseId);

    cases.push({
      caseId: row.caseId,
      cohort: "B",
      action: aligned.repaired ? "aligned_from_view" : "copied_unchanged",
      frozenOutputSha256: frozenSha,
      rematerialisedOutputSha256: rematerialisedSha,
      frozenFiveLen: aligned.beforeLen,
      viewRowsLen: viewRows.length,
      rematerialisedFiveLen: aligned.afterLen,
      repaired: aligned.repaired,
      inventedFromCourt: false,
    });
  }

  const result: RematerialiseResult = {
    schemaVersion: "stage150-pri01-rematerialise@1.0.0",
    remediationClass: "batch10_materialisation_serialisation_defect",
    applicationRepair: false,
    corpusHarnessRemediation: true,
    frozenSourcesAltered: false,
    orderedMembershipSha256Preserved: args.freeze.orderedMembershipSha256,
    rematerialisedOutputsRel: REMATERIALISED_OUTPUTS_REL,
    cases,
    repairedCaseIds,
    repairedCount: repairedCaseIds.length,
    cohortBOutputCount: cases.filter((c) => c.cohort === "B" && c.rematerialisedOutputSha256).length,
    outputVersionSha256: sha256(versionParts.join("\n")),
  };

  writeJson(path.join(args.repoRoot, POST_REMEDIATION_V1_REL, "rematerialise-receipt.json"), result);
  return result;
}

export function rematerialisedOutputRelFor(caseId: string): string {
  return `${REMATERIALISED_OUTPUTS_REL}/${caseId}/casebrain-output.json`;
}

export { fiveAnswersRowsSha256 };
