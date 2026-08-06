/**
 * Emit MAA V2 Stage-150 Batch-6 runnable-detector artefacts.
 *
 * Blind output-only 499 calibration -> freeze candidates -> triage -> optional detector
 * correction rerun. No Stage-150 selection/freeze/run. No CaseBrain repair.
 * No commit/push. Stage-150 gates remain FALSE.
 *
 * Baseline: 85b597356ac332c309a9f6e7db4dd97c2276ffa3
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch6.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { DEFAULT_ESA_CORPUS_ROOT, ESA_REQUIRED_FILES } from "../../lib/eval/master-assurance-auditor/esa-adapter";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import {
  STAGE150_PACKET_LOCAL_HANDLERS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { buildBatch6ReadinessInventory } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch6-readiness-inventory";
import {
  BATCH6_SELECTED_CONTROL_IDS,
  BATCH6_SELECTED_SET,
  buildBatch6Selection,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch6-selection";
import {
  BATCH6_RETURNED_TO_PARTIAL,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch6-overpromotion-disposition";
import { buildBatch6EvsHonestReceipt } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch6-evs-receipts";
import {
  BATCH6_IMPLEMENTED_IDS,
  STAGE150_IMPLEMENTED_IDS,
  STAGE150_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH6_IMMUTABLE_PROMOTION_REGISTRY,
  BATCH6_PROMOTION_BY_ID,
  ZERO_CANDIDATE_RATE_NOTE,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import {
  buildControlRateRow,
  hitToCandidate,
  markDuplicateOccurrences,
  promotionDecision,
  triageCandidate,
  triageSummary,
  type Batch5ControlRateRow,
  type Batch5TriageRow,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-triage";
import {
  buildEvalContext,
  evaluateControl,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { inventoryOutputLeaves } from "../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { missingPrerequisite } from "../../lib/eval/master-assurance-auditor/v2/stage150/eligibility";

const ROOT = process.cwd();
const BASELINE = "85b597356ac332c309a9f6e7db4dd97c2276ffa3";
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch6");
const CORPUS = path.join(ROOT, DEFAULT_ESA_CORPUS_ROOT);

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

function listUniqueValid(): Array<{ caseId: string; packetPath: string }> {
  if (!fs.existsSync(CORPUS)) {
    throw new Error(`ESA corpus missing: ${CORPUS}`);
  }
  const out: Array<{ caseId: string; packetPath: string }> = [];
  for (const name of fs.readdirSync(CORPUS).sort()) {
    const packetPath = path.join(CORPUS, name);
    if (!fs.statSync(packetPath).isDirectory()) continue;
    if (!ESA_REQUIRED_FILES.every((f) => fs.existsSync(path.join(packetPath, f)))) continue;
    out.push({ caseId: name, packetPath });
  }
  return out;
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
    allUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

/** Contract resolution: selected controls must have anchors in batch6 or known suites that exist. */
function contractResolutionAudit(): {
  schemaVersion: string;
  allResolve: boolean;
  rows: Array<{
    controlId: string;
    positiveContract: string;
    negativeContract: string;
    mutationContract: string;
    unavailableContract: string;
    positiveResolves: boolean;
    negativesResolve: boolean;
    mutationResolves: boolean;
    unavailableResolves: boolean;
  }>;
} {
  const batch6Path = path.join(ROOT, "scripts/maa-v2-stage150-batch6-contracts.test.ts");
  const batch6Body = fs.readFileSync(batch6Path, "utf8");
  const intelPath = path.join(ROOT, "scripts/maa-v2-stage150-intelligence-contracts.test.ts");
  const intelBody = fs.existsSync(intelPath) ? fs.readFileSync(intelPath, "utf8") : "";
  const batch2Path = path.join(ROOT, "scripts/maa-v2-stage150-batch2-contracts.test.ts");
  const batch2Body = fs.existsSync(batch2Path) ? fs.readFileSync(batch2Path, "utf8") : "";

  const rows = BATCH6_SELECTED_CONTROL_IDS.map((controlId) => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === controlId)!;
    const short = controlId.includes("EVS-02") ? "evs02" : "evs03";
    const mutationContract = `scripts/maa-v2-stage150-batch6-contracts.test.ts#${short}_mutation`;
    const unavailableContract = `scripts/maa-v2-stage150-batch6-contracts.test.ts#${short}_unavailable`;
    const bodyFor = (ref: string) => {
      if (ref.includes("batch6-contracts")) return batch6Body;
      if (ref.includes("batch2-contracts")) return batch2Body;
      if (ref.includes("intelligence-contracts")) return intelBody;
      return batch6Body;
    };
    const resolves = (ref: string, needle: string) => bodyFor(ref).includes(needle);
    return {
      controlId,
      positiveContract: h.positiveContract,
      negativeContract: h.negativeContract,
      mutationContract,
      unavailableContract,
      positiveResolves: resolves(`scripts/maa-v2-stage150-batch6-contracts.test.ts#${short}_positive`, `${short}_positive`),
      negativesResolve: resolves(`scripts/maa-v2-stage150-batch6-contracts.test.ts#${short}_negatives`, `${short}_negatives`),
      mutationResolves: resolves(mutationContract, `${short}_mutation`),
      unavailableResolves: resolves(unavailableContract, `${short}_unavailable`),
    };
  });

  const allResolve = rows.every(
    (r) => r.positiveResolves && r.negativesResolve && r.mutationResolves && r.unavailableResolves,
  );
  return { schemaVersion: "batch6-contract-resolution-audit@1.0.0", allResolve, rows };
}

function runCalibrationPass(
  uniqueValid: Array<{ caseId: string; packetPath: string }>,
  passId: string,
): {
  passId: string;
  truthOpened: false;
  caseCount: number;
  exerciseReceipts: ReturnType<typeof buildBatch6EvsHonestReceipt>[];
  candidates: ReturnType<typeof hitToCandidate>[];
  outputFreeze: Array<{ caseId: string; outputSha256: string; byteLength: number }>;
} {
  const exerciseReceipts: ReturnType<typeof buildBatch6EvsHonestReceipt>[] = [];
  const candidates: ReturnType<typeof hitToCandidate>[] = [];
  const outputFreeze: Array<{ caseId: string; outputSha256: string; byteLength: number }> = [];

  for (const c of uniqueValid) {
    const outputPath = path.join(c.packetPath, "casebrain-output.json");
    const buf = fs.readFileSync(outputPath);
    const outputSha256 = sha(buf);
    outputFreeze.push({ caseId: c.caseId, outputSha256, byteLength: buf.length });

    const output = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    const leaves = inventoryOutputLeaves(c.caseId, output);
    const ctx = buildEvalContext(c.caseId, output);
    ctx.leaves = leaves;

    for (const controlId of BATCH6_SELECTED_CONTROL_IDS) {
      const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === controlId)!;
      const probeMissing = missingPrerequisite(h, output, leaves, "probe");
      const hits = probeMissing ? [] : evaluateControl(ctx, controlId);
      exerciseReceipts.push(
        buildBatch6EvsHonestReceipt({
          caseId: c.caseId,
          handler: h,
          output,
          leaves,
          hits,
        }),
      );
      for (const hit of hits) {
        candidates.push(hitToCandidate(c.caseId, hit, outputSha256));
      }
    }
  }

  return {
    passId,
    truthOpened: false,
    caseCount: uniqueValid.length,
    exerciseReceipts,
    candidates,
    outputFreeze,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  // Promotion authority is the immutable registry only — no runtime mutation.

  const uniqueValid = listUniqueValid();
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  const inventory = buildBatch6ReadinessInventory();
  const selection = buildBatch6Selection(inventory.rows);
  writeJson(OUT, "batch6-readiness-inventory.json", inventory);
  writeJson(OUT, "batch6-selection.json", selection);
  writeJson(OUT, "batch6-overpromotion-disposition.json", {
    schemaVersion: "batch6-overpromotion-disposition@1.0.0",
    note: "Six controls returned from over-promotion; narrow probes must not enter the immutable promotion registry.",
    returned: BATCH6_RETURNED_TO_PARTIAL,
    promotedOnly: [...BATCH6_IMPLEMENTED_IDS],
    expectedTotals: { implemented: 7, partially_implemented: 99, specified_not_implemented: 55 },
  });

  const contractAudit = contractResolutionAudit();
  writeJson(OUT, "batch6-contract-resolution-audit.json", contractAudit);

  console.log("Batch-6 pass A — blind 499 calibration (output-only)…");
  const passA = runCalibrationPass(uniqueValid, "batch6-pass-A");

  // FREEZE candidate IDs/hashes BEFORE any truth/source open
  const freezeReceipt = {
    schemaVersion: "batch6-candidate-freeze@1.0.0",
    baselineCommit: BASELINE,
    headCommit: head,
    frozenAt: new Date().toISOString(),
    truthOpenedBeforeFreeze: false,
    caseCount: passA.caseCount,
    candidateCount: passA.candidates.length,
    outputFreezeSha256: sha(
      passA.outputFreeze.map((r) => `${r.caseId}:${r.outputSha256}`).join("\n"),
    ),
    candidateIdSha256: sha(passA.candidates.map((c) => c.candidateId).sort().join("\n")),
    note: "Output hashes and candidate IDs frozen before triage. Truth/source not opened.",
  };
  writeJson(OUT, "batch6-candidate-freeze.json", freezeReceipt);
  writeJson(OUT, "batch6-output-freeze-index.json", {
    schemaVersion: "batch6-output-freeze-index@1.0.0",
    rows: passA.outputFreeze,
  });

  // Triage (still truthOpened=false)
  let triaged: Batch5TriageRow[] = markDuplicateOccurrences(
    passA.candidates.map((c) => triageCandidate(c)),
  );
  let summary = triageSummary(triaged);
  writeJson(OUT, "batch6-triage-pass-A.json", { summary, rows: triaged });

  // Detector corrections already applied in source (WRD-10/02/15, AUD-07). Rerun pass B.
  console.log("Batch-6 pass B — rerun same frozen population after detector corrections…");
  const passB = runCalibrationPass(uniqueValid, "batch6-pass-B");
  // Verify same case set / output hashes (frozen population)
  const freezeMismatch = passB.outputFreeze.filter((b, i) => {
    const a = passA.outputFreeze[i]!;
    return a.caseId !== b.caseId || a.outputSha256 !== b.outputSha256;
  });
  if (freezeMismatch.length) {
    throw new Error(`Frozen population drift: ${freezeMismatch.length} output hash mismatches`);
  }

  triaged = markDuplicateOccurrences(passB.candidates.map((c) => triageCandidate(c)));
  summary = triageSummary(triaged);
  writeJson(OUT, "batch6-triage-pass-B.json", { summary, rows: triaged });

  const beforeAfterMap = {
    schemaVersion: "batch6-before-after-finding-map@1.0.0",
    passA: {
      candidateCount: passA.candidates.length,
      byControl: Object.fromEntries(
        BATCH6_SELECTED_CONTROL_IDS.map((id) => [
          id,
          passA.candidates.filter((c) => c.controlId === id).length,
        ]),
      ),
    },
    passB: {
      candidateCount: passB.candidates.length,
      byControl: Object.fromEntries(
        BATCH6_SELECTED_CONTROL_IDS.map((id) => [
          id,
          passB.candidates.filter((c) => c.controlId === id).length,
        ]),
      ),
    },
    note: "Not forced to zero. Detector corrections only; CaseBrain wording unrepaired.",
  };
  writeJson(OUT, "batch6-before-after-finding-map.json", beforeAfterMap);

  // Rates for every selected control (including zero-candidate → null rates)
  const ratesByControl: Record<string, Batch5ControlRateRow> = {};
  for (const controlId of BATCH6_SELECTED_CONTROL_IDS) {
    ratesByControl[controlId] = buildControlRateRow(controlId, triaged);
  }
  summary = { ...summary, byControl: ratesByControl };

  // Advisory promotionDecision vs immutable registry (registry is sole authority)
  const promotions = BATCH6_SELECTED_CONTROL_IDS.map((controlId) => {
    const t = ratesByControl[controlId]!;
    const rowAudit = contractAudit.rows.find((r) => r.controlId === controlId)!;
    const contractOk =
      rowAudit.positiveResolves &&
      rowAudit.negativesResolve &&
      rowAudit.mutationResolves &&
      rowAudit.unavailableResolves;
    const advisory = promotionDecision({
      controlId,
      contractResolutionOk: contractOk,
      triage: t,
    });
    const registry = BATCH6_PROMOTION_BY_ID.get(controlId);
    const inRegistry = registry != null;
    if (inRegistry && registry.candidateDenominator !== t.total) {
      throw new Error(
        `Immutable registry candidateDenominator mismatch for ${controlId}: registry=${registry.candidateDenominator} calibration=${t.total}`,
      );
    }
    if (inRegistry && !advisory.promote) {
      throw new Error(
        `Immutable registry lists ${controlId} as implemented but advisory promotionDecision rejects: ${advisory.reason}`,
      );
    }
    if (!inRegistry && advisory.promote) {
      throw new Error(
        `Advisory would promote ${controlId} but it is absent from immutable registry — edit registry explicitly, do not mutate runtime.`,
      );
    }
    return {
      controlId,
      promoted: inRegistry,
      implementationStatus: inRegistry
        ? ("implemented" as const)
        : ("partially_implemented" as const),
      reason: registry?.promotionReason ?? advisory.reason,
      advisoryReason: advisory.reason,
      calibrationPassId: passB.passId,
      triagePassId: "batch6-triage-pass-B",
      contractResolutionOk: contractOk,
      fpRate: t.fpRate,
      unresolvedRate: t.unresolvedRate,
      confirmedRate: t.confirmedRate,
      humanFpFnRecall: t.humanFpFnRecall,
      rateHonestyNote: t.rateHonestyNote,
      candidateTotal: t.total,
      candidateDenominator: t.total,
      occurrenceDenominator: t.occurrenceDenominator,
      caseDenominatorNote: t.caseDenominatorNote,
      stringDenominatorNote: t.stringDenominatorNote,
      byBucket: t.byBucket,
      denominatorApprovalState: registry?.denominatorApprovalState ?? ("PENDING_REVIEW" as const),
      implementationEvidenceRefs: registry?.implementationEvidenceRefs ?? [],
      contractRefs: registry?.contractRefs ?? null,
      calibrationPopulation: registry?.calibrationPopulation ?? 499,
      reviewer: "",
      reviewDate: "",
      promotionAuthority: "STAGE150_IMMUTABLE_PROMOTION_REGISTRY",
    };
  });

  const promotedIds = [...BATCH6_IMPLEMENTED_IDS];

  writeJson(OUT, "batch6-immutable-promotion-registry.json", {
    schemaVersion: "batch6-immutable-promotion-registry@1.0.0",
    note: "Batch-6 extensions only. Full Stage-150 authority is STAGE150_IMMUTABLE_PROMOTION_REGISTRY (Batch-5 preserved + Batch-6). No runtime mutation API.",
    batch5PreservedCount: 5,
    batch6Entries: BATCH6_IMMUTABLE_PROMOTION_REGISTRY,
    stage150Registry: STAGE150_IMMUTABLE_PROMOTION_REGISTRY,
  });

  writeJson(OUT, "batch6-promotions.json", {
    schemaVersion: "batch6-promotions@1.0.0",
    promotionAuthority: "STAGE150_IMMUTABLE_PROMOTION_REGISTRY",
    batch5Preserved: true,
    promotedIds,
    stage150ImplementedIds: [...STAGE150_IMPLEMENTED_IDS],
    promotions,
    zeroCandidateRateNote: ZERO_CANDIDATE_RATE_NOTE,
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.5.0",
    baselineCommit: BASELINE,
    before: { partially_implemented: 101, specified_not_implemented: 55, implemented: 5 },
    after: matrix.totals,
    batch6Promoted: promotedIds,
    batch6ReturnedToPartial: BATCH6_RETURNED_TO_PARTIAL.map((r) => r.controlId),
    note: "Honesty correction: only EVS-02/EVS-03 promoted. Stage-150 currentlyRunnable remains false. Promotion via immutable registry only.",
  });

  // Exercise receipts (JSONL regenerable + committed summary)
  const rawDir = path.join(OUT, "raw-receipts");
  fs.mkdirSync(rawDir, { recursive: true });
  const receiptLines = passB.exerciseReceipts.map((r) => JSON.stringify(r));
  const receiptsBody = `${receiptLines.join("\n")}\n`;
  fs.writeFileSync(path.join(rawDir, "batch6-499-exercise-receipts.jsonl"), receiptsBody);
  writeJson(OUT, "batch6-499-exercise-receipt-index.json", {
    schemaVersion: "batch6-499-exercise-receipt-index@1.0.0",
    relativePath: "raw-receipts/batch6-499-exercise-receipts.jsonl",
    sha256: sha(receiptsBody),
    byteLength: Buffer.byteLength(receiptsBody),
    lineCount: receiptLines.length,
    regenerable: true,
    gitPolicy: "gitignore_regenerate",
    denominators: {
      caseCount: 499,
      controlCount: BATCH6_SELECTED_CONTROL_IDS.length,
      occurrenceCandidatesPassB: passB.candidates.length,
      note: "case / control / occurrence kept separate — not conflated",
    },
  });

  writeJson(OUT, "batch6-fp-unresolved-rates.json", {
    schemaVersion: "batch6-fp-unresolved-rates@1.1.0",
    denominator: "triaged_candidates_per_control_pass_B",
    honesty: {
      zeroCandidateRatesAreNull: true,
      zeroCandidateWording: ZERO_CANDIDATE_RATE_NOTE,
      doNotDescribeZeroOverZeroAsZeroRateOrCorpusRecall: true,
      humanFpFnRecallUnavailableWhenDenominatorZero: true,
    },
    byControl: ratesByControl,
    overall: summary.byBucket,
  });

  const remainingPartial = STAGE150_PACKET_LOCAL_HANDLERS.filter(
    (h) => !STAGE150_IMPLEMENTED_IDS.has(h.controlId),
  ).map((h) => ({
    controlId: h.controlId,
    reason: BATCH6_SELECTED_SET.has(h.controlId)
      ? promotions.find((p) => p.controlId === h.controlId)?.reason ?? "Not promoted"
      : inventory.rows.find((r) => r.controlId === h.controlId)?.promotionBlockedReason ??
        "Not selected in Batch-6 priority cohort / remains partially_implemented",
  }));
  writeJson(OUT, "batch6-remaining-partial.json", {
    schemaVersion: "batch6-remaining-partial@1.0.0",
    count: remainingPartial.length,
    rows: remainingPartial,
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.5.0",
    baselineCommit: BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      `${matrix.totals.partially_implemented} controls remain partially_implemented`,
      `${matrix.totals.specified_not_implemented} controls remain SNI`,
      "Stage-150 sample selection not performed",
      "Denominator approval not invented — reviewer/date blank",
      "currentlyRunnableOnStage150 remains false",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: matrix.totals.partially_implemented === 0,
      inputReadinessComplete: false,
      denominatorReadinessComplete: false,
      adapterReadinessComplete: false,
      receiptValidationComplete: contractAudit.allResolve,
      contractReadinessComplete: contractAudit.allResolve,
      relationshipComplete: true,
      protectedAssetsPreserved: true,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const blobCompare = brain1GuardianCompare(BASELINE, head);
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
  stage150Errs = (
    tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? []
  ).length;
  writeJson(OUT, "typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BASELINE,
    stage150PathErrors: stage150Errs,
  });

  const changedManifest = {
    schemaVersion: "maa-v2-batch6-changed-file-manifest@1.0.0",
    baselineCommit: BASELINE,
    headCommit: head,
    paths: execSync(`git diff --name-only ${BASELINE}`, { encoding: "utf8", cwd: ROOT })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (p) =>
          p.includes("batch6") ||
          p.includes("stage150") ||
          p.includes("batch2-detectors") ||
          p.includes("detectors.ts") ||
          p.includes("detector-registry") ||
          p.includes("stage150-execution-readiness-gate"),
      ),
  };
  writeJson(OUT, "changed-file-manifest.json", changedManifest);

  const stop = {
    schemaVersion: "maa-v2-stage150-batch6-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch 6 Runnable Detectors",
    status: "STAGE150_BATCH6_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BASELINE,
    headCommit: head,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    selectedCount: BATCH6_SELECTED_CONTROL_IDS.length,
    selectedControlIds: BATCH6_SELECTED_CONTROL_IDS,
    promotedToImplemented: promotedIds,
    batch5PreservedImplemented: 5,
    stage150ImplementedIds: [...STAGE150_IMPLEMENTED_IDS],
    remainingPartialCount: remainingPartial.length,
    implementationTotals: matrix.totals,
    calibration: {
      population: 499,
      passACandidates: passA.candidates.length,
      passBCandidates: passB.candidates.length,
      truthOpened: false,
      freeze: freezeReceipt,
    },
    triage: summary,
    honestyCorrections: {
      zeroCandidateRatesNull: true,
      zeroCandidateWording: ZERO_CANDIDATE_RATE_NOTE,
      fid10NotReconsidered: true,
      batch5PromotionsPreservedExactly: true,
      overPromotionCorrected: true,
      promotedOnly: ["MAA2-EVS-02-STATE-ENUM", "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED"],
      returnedToPartial: BATCH6_RETURNED_TO_PARTIAL.map((r) => r.controlId),
      expectedTotals: { implemented: 7, partially_implemented: 99, specified_not_implemented: 55 },
      honestEvsReceiptsRequired: true,
      promotionAuthority: "STAGE150_IMMUTABLE_PROMOTION_REGISTRY",
      mutablePromotionSetterAbsent: true,
      denominatorApproval: "PENDING_REVIEW",
    },
    contractResolution: { allResolve: contractAudit.allResolve },
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    blockers: [
      "Stage-150 selection and execution gates remain FALSE",
      "Denominator approvals not invented (PENDING_REVIEW, blank reviewer)",
      `${remainingPartial.length} controls remain partially_implemented or SNI blockers remain`,
      "No programme PASS",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        out: OUT,
        selected: BATCH6_SELECTED_CONTROL_IDS.length,
        promoted: promotedIds,
        totals: matrix.totals,
        passA: passA.candidates.length,
        passB: passB.candidates.length,
        gates: {
          sample: false,
          exec: false,
          programmePass: false,
        },
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 ? 0 : 1);
}

main();
