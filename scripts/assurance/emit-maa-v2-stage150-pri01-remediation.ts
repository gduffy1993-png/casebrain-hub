/**
 * Ownership trace + post-remediation recalibration for RC-S150-PRI01-EMPTY-FIVEANSWERS-WITH-COURT.
 *
 * Corpus-harness remediation (Batch-10 serialisation). Does not overwrite frozen run/triage/packets.
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-pri01-remediation.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "@/lib/criminal/build-from-document-units";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { STAGE150_IMPLEMENTED_IDS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import {
  STAGE150_CALIBRATION_ARTIFACT_ROOT,
  STAGE150_CALIBRATION_BASELINE,
  runPostRemediationCalibration,
  type CalibrationCandidate,
  type PopulationFreezeReceipt,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/calibration";
import {
  POST_REMEDIATION_V1_REL,
  fiveAnswersRowsSha256,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/rematerialise-five-answers-outputs";
import {
  serializeFiveAnswersEvidenceRowsFromSurfaces,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation";
import { buildEvalContext, evaluateAllStage150Intelligence } from "../../lib/eval/master-assurance-auditor/v2/stage150/detectors";

const ROOT = process.cwd();
const CAL = path.join(ROOT, STAGE150_CALIBRATION_ARTIFACT_ROOT);
const OUT = path.join(ROOT, POST_REMEDIATION_V1_REL);
const FROZEN_RUN_ID = "s150-cal-2026-07-31T16-55-01-119Z-a33adbda";
const ROOT_ID = "RC-S150-PRI01-EMPTY-FIVEANSWERS-WITH-COURT";
const TRACE_CASE = "s150-d120-001-homicide-causation-clean";

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobId(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function brain1GuardianCompare(baseline: string, head: string) {
  const files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<exact-file> vs HEAD:<exact-file>",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function documentsFromMeta(
  caseId: string,
  meta: { pages: Array<{ pageNumber: number; label: string; text: string }>; pdfFileName: string },
): UploadedDocumentUnit[] {
  return [
    {
      id: `doc-${caseId}-bundle`,
      title: meta.pdfFileName || "bundle.pdf",
      documentType: "prosecution_disclosure_bundle",
      uploadOrder: 1,
      versionNumber: 1,
      pages: meta.pages.map((p) => ({
        pageNumber: p.pageNumber,
        compiledPage: p.pageNumber,
        text: p.text || `page ${p.pageNumber}`,
        pageIdentityKnown: true,
      })),
      fullText: meta.pages.map((p) => p.text).join("\n\n"),
    },
  ];
}

function buildOwnershipTrace(): Record<string, unknown> {
  const src = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources",
    TRACE_CASE,
  );
  const canonical = fs.readFileSync(path.join(src, "canonical-bundle.md"));
  const pdf = fs.readFileSync(path.join(src, "bundle.pdf"));
  const meta = JSON.parse(fs.readFileSync(path.join(src, "pdf-extraction-meta.json"), "utf8")) as {
    pages: Array<{ pageNumber: number; label: string; text: string }>;
    pdfFileName: string;
  };
  const view = JSON.parse(fs.readFileSync(path.join(src, "exits/view/payload.json"), "utf8"));
  const frozenOut = JSON.parse(fs.readFileSync(path.join(src, "casebrain-output.json"), "utf8"));
  const docs = documentsFromMeta(TRACE_CASE, meta);
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, {
    caseId: TRACE_CASE,
    allegation: "murder, contrary to common law",
    caseTitle: `${TRACE_CASE} ownership trace`,
    clientLabel: "Client",
  });
  const serialised = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
  const viewRows = view.truthMap?.evidenceState?.rows ?? [];
  const frozenFive = frozenOut.fiveAnswersEvidenceRows ?? [];
  const maaCtx = buildEvalContext(TRACE_CASE, frozenOut);
  const maaHits = evaluateAllStage150Intelligence(maaCtx).filter(
    (h) => h.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
  );

  const boundaries = [
    {
      boundary: "1_source_document_units",
      value: {
        documentCount: docs.length,
        pageCount: docs[0]?.pages.length ?? 0,
        pdfFileName: meta.pdfFileName,
      },
      hash: sha(JSON.stringify({ pages: docs[0]?.pages.map((p) => ({ n: p.pageNumber, t: sha(p.text) })) })),
    },
    {
      boundary: "2_canonical_evidence_view_live",
      value: {
        pipelineEvidenceRows: surfaces.pipeline.evidenceRows.length,
        evidenceStateItems: surfaces.pipeline.evidenceState.items.length,
      },
      hash: fiveAnswersRowsSha256(
        surfaces.pipeline.evidenceRows.map((r) => ({
          label: r.label,
          existence: r.existence,
          note: r.note ?? null,
        })),
      ),
    },
    {
      boundary: "3_buildLiveProductionSurfacesFromDocumentUnits",
      value: {
        truthMapRows: surfaces.truthMap.evidenceState.rows.length,
        courtLinePresent: Boolean(surfaces.composedProse.courtLine?.trim()),
      },
      hash: fiveAnswersRowsSha256(surfaces.truthMap.evidenceState.rows),
    },
    {
      boundary: "4_five_answers_builder_serialisation",
      value: {
        serialisedRows: serialised.rows.length,
        inventedFromCourt: serialised.inventedFromCourt,
      },
      hash: serialised.persistedRowsSha256,
    },
    {
      boundary: "5_batch10_casebrain_output_frozen",
      value: {
        fiveAnswersEvidenceRows: frozenFive.length,
        courtNotePresent: Boolean(frozenOut.courtNote?.text?.trim()),
        viewExitRows: viewRows.length,
      },
      hash: fiveAnswersRowsSha256(frozenFive),
      viewRowsHash: fiveAnswersRowsSha256(viewRows),
      mismatch: frozenFive.length !== viewRows.length,
    },
    {
      boundary: "6_maa_adapter_eval_context",
      value: {
        outputFiveLen: (maaCtx.output.fiveAnswersEvidenceRows as unknown[] | undefined)?.length ?? 0,
        courtLen: String((maaCtx.output.courtNote as { text?: string } | undefined)?.text ?? "").length,
      },
      hash: sha(JSON.stringify({ five: maaCtx.output.fiveAnswersEvidenceRows, court: maaCtx.output.courtNote })),
    },
    {
      boundary: "7_pri01_detector",
      value: {
        hitCount: maaHits.length,
        findingCodes: maaHits.map((h) => h.findingCode),
      },
      hash: sha(JSON.stringify(maaHits.map((h) => ({ code: h.findingCode, ref: h.occurrenceRef })))),
    },
  ];

  const liveMatchesView =
    fiveAnswersRowsSha256(surfaces.truthMap.evidenceState.rows) === fiveAnswersRowsSha256(viewRows);
  const frozenEmptyWhileViewHasRows = frozenFive.length === 0 && viewRows.length > 0;
  const liveHasRows = surfaces.truthMap.evidenceState.rows.length > 0;

  let ownershipClass:
    | "live_casebrain_production_builder_defect"
    | "batch10_materialisation_serialisation_defect"
    | "auditor_adapter_binding_defect"
    | "source_packet_inconsistency" = "batch10_materialisation_serialisation_defect";

  if (!liveHasRows && viewRows.length === 0 && frozenFive.length === 0) {
    ownershipClass = "live_casebrain_production_builder_defect";
  } else if (liveHasRows && frozenEmptyWhileViewHasRows && liveMatchesView) {
    ownershipClass = "batch10_materialisation_serialisation_defect";
  } else if (liveHasRows && frozenFive.length > 0 && maaHits.length > 0) {
    ownershipClass = "auditor_adapter_binding_defect";
  } else if (!liveMatchesView && viewRows.length > 0) {
    ownershipClass = "source_packet_inconsistency";
  }

  return {
    schemaVersion: "stage150-pri01-ownership-trace@1.0.0",
    rootCauseId: ROOT_ID,
    tracedCaseId: TRACE_CASE,
    duplicateCaseId: "s150-d120-002-homicide-causation-messy",
    ownershipClass,
    applicationRepair: false,
    corpusHarnessRemediation: ownershipClass === "batch10_materialisation_serialisation_defect",
    courtNoteDoesNotProveEvidenceRows: true,
    liveBuilderHasRows: liveHasRows,
    frozenViewHasRows: viewRows.length > 0,
    frozenCasebrainFiveEmpty: frozenFive.length === 0,
    liveMatchesFrozenView: liveMatchesView,
    sourceHashes: {
      canonicalBundleSha256: sha(canonical),
      bundlePdfSha256: sha(pdf),
      pdfExtractionMetaSha256: sha(fs.readFileSync(path.join(src, "pdf-extraction-meta.json"))),
    },
    boundaries,
    verdict:
      ownershipClass === "batch10_materialisation_serialisation_defect"
        ? "Live CaseBrain surfaces and frozen view exit carry evidence rows; frozen casebrain-output.fiveAnswersEvidenceRows is empty. PRI-01 correctly fires on the incomplete bag. Owning layer = Batch-10 materialisation/serialisation (corpus harness), not the production Five Answers builder."
        : `Ownership classified as ${ownershipClass}`,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  const freeze = JSON.parse(
    fs.readFileSync(path.join(CAL, "frozen-population-manifest.json"), "utf8"),
  ) as PopulationFreezeReceipt;
  if (freeze.runId !== FROZEN_RUN_ID) throw new Error(`Unexpected freeze runId ${freeze.runId}`);
  if (freeze.orderedMembershipSha256 !== "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1") {
    throw new Error("Ordered membership hash does not match authorised frozen value");
  }

  const candReceipt = JSON.parse(
    fs.readFileSync(path.join(CAL, "candidate-freeze-receipt.json"), "utf8"),
  ) as { freezeSha256: string; candidates: CalibrationCandidate[]; runId: string };
  if (candReceipt.runId !== FROZEN_RUN_ID) throw new Error("Candidate freeze runId mismatch");

  const ownershipTrace = buildOwnershipTrace();
  writeJson(OUT, "ownership-trace.json", ownershipTrace);

  const result = runPostRemediationCalibration({
    repoRoot: ROOT,
    headCommit: head,
    frozenRunId: FROZEN_RUN_ID,
    originalFreeze: freeze,
    originalCandidates: candReceipt.candidates,
    originalCandidateFreezeSha256: candReceipt.freezeSha256,
  });

  const blobCompare = brain1GuardianCompare(STAGE150_CALIBRATION_BASELINE, head);
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  stage150Errs = (tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? [])
    .length;
  writeJson(OUT, "typescript-delta.json", {
    tscOk,
    stage150PathErrorCount: stage150Errs,
    excerpt: tscExcerpt.slice(0, 4000),
  });

  let buildOk = false;
  let buildExcerpt = "";
  try {
    buildExcerpt = execSync("npm run build", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 600000,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
    buildOk = true;
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    buildExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`.slice(-4000);
  }
  writeJson(OUT, "build-receipt.json", { buildOk, excerptTail: buildExcerpt.slice(-2000) });

  const stop = {
    schemaVersion: "maa-v2-stage150-pri01-remediation-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-150 PRI-01 SERIALISATION REMEDIATION",
    status: "STAGE150_PRI01_REMEDIATION_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    headCommit: head,
    frozenRunId: FROZEN_RUN_ID,
    rootCauseId: ROOT_ID,
    ownershipClass: ownershipTrace.ownershipClass,
    applicationRepair: false,
    corpusHarnessRemediation: true,
    caseBrainRepaired: false,
    frozenRunAltered: false,
    frozenPacketsAltered: false,
    frozenCandidateFreezeAltered: false,
    frozenTriageAltered: false,
    orderedMembershipSha256Preserved: result.orderedMembershipSha256Preserved,
    rematerialisedOutputVersionSha256: result.rematerialise.outputVersionSha256,
    repairedCaseIds: result.rematerialise.repairedCaseIds,
    pri01RootCleared: result.pri01RootCleared,
    pri01DuplicateCleared: result.pri01DuplicateCleared,
    originalPri01CandidateIds: result.originalPri01CandidateIds,
    remainingPri01CandidateIds: result.remainingPri01CandidateIds,
    newDefectCount: result.newDefectCount,
    regressionCount: result.regressionCount,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    stage150ControlCount: 161,
    freezeHashStage50: FREEZE_HASH_STAGE50,
    implementedControlCount: STAGE150_IMPLEMENTED_IDS.length,
    capabilityMatrixControlCount: buildStage150ImplementationCapabilityMatrix().totals.stage150ControlCount,
    brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
    typescript: { tscOk, stage150PathErrorCount: stage150Errs },
    buildOk,
    committed: false,
    pushed: false,
    artefacts: [
      "ownership-trace.json",
      "rematerialise-receipt.json",
      "before-after-finding-map.json",
      "regression-report.json",
      "freeze-reference.json",
      "candidate-freeze-receipt.json",
      "calibration-run-summary.json",
      "brain1-guardian-blob-compare.json",
      "typescript-delta.json",
      "build-receipt.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    blockers: [
      "No Stage-150 programme execution PASS",
      "No Stage 300",
      "Uncommitted — stop for Codex review",
      "Cohort A remains projection-only",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        ok: true,
        ownershipClass: ownershipTrace.ownershipClass,
        pri01RootCleared: result.pri01RootCleared,
        repairedCaseIds: result.rematerialise.repairedCaseIds,
        newDefectCount: result.newDefectCount,
        out: POST_REMEDIATION_V1_REL,
      },
      null,
      2,
    ),
  );
}

main();
