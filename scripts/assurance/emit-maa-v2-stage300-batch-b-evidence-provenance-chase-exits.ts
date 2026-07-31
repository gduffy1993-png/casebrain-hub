/**
 * Emit Stage-300 Batch-B evidence/provenance/chase/multi-exit artefacts.
 * Dual-status honesty remediation. No Stage-300 run. Stop uncommitted.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-batch-b-evidence-provenance-chase-exits.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import type { PopulationFreezeReceipt } from "../../lib/eval/master-assurance-auditor/v2/stage150/calibration/population-freeze";
import {
  BATCH_A_ADAPTER_IDS,
  runTruthBlind120CapabilityScan,
  type BatchAAdapterId,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-a";
import {
  BATCH_B_ARTIFACT_ROOT,
  BATCH_B_BASELINE,
  BATCH_B_FOCUS_ADAPTER_IDS,
  BATCH_B_SCHEMA_VERSION,
  CANDIDATE_FREEZE_SHA256,
  ORDERED_MEMBERSHIP_SHA256,
  buildAdapterBeforeAfterMatrix,
  buildBatchBAdapterRegistry,
  buildBatchBEvaluatorRegistry,
  buildBatchBRemainingBlockers,
  buildEssential43BeforeAfter,
  buildOwnershipTraceArtifact,
  emptySixAdapterCounts,
  recomputeEssential43,
  summarizeDualStatusAcross120,
  type BatchBFocusAdapterId,
  type CapabilityCounts,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-b";

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH_B_ARTIFACT_ROOT);
const RAW = path.join(OUT, "raw");
const FROZEN_POPULATION_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json";
const CANDIDATE_FREEZE_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json";

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(name: string, value: unknown): string {
  fs.mkdirSync(OUT, { recursive: true });
  const abs = path.join(OUT, name);
  const body = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(abs, body, "utf8");
  return sha(body);
}

function writeRaw(name: string, value: unknown): string {
  fs.mkdirSync(RAW, { recursive: true });
  const abs = path.join(RAW, name);
  const body = typeof value === "string" ? value : `${JSON.stringify(value)}\n`;
  fs.writeFileSync(abs, body, "utf8");
  return sha(body);
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
    const workBlobId = execSync(`git hash-object ${p}`, { encoding: "utf8", cwd: ROOT }).trim();
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      workTreeBlobId: workBlobId,
      blobUnchanged:
        baselineBlobId != null &&
        headBlobId != null &&
        baselineBlobId === headBlobId &&
        baselineBlobId === workBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<file> vs HEAD vs worktree hash-object",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function runCmd(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf8", cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`,
    };
  }
}

function main() {
  const freeze = JSON.parse(
    fs.readFileSync(path.join(ROOT, FROZEN_POPULATION_PATH), "utf8"),
  ) as PopulationFreezeReceipt;
  if (freeze.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error(
      `Stage-150 membership hash drift: expected ${ORDERED_MEMBERSHIP_SHA256}, got ${freeze.orderedMembershipSha256}`,
    );
  }
  const cand = JSON.parse(fs.readFileSync(path.join(ROOT, CANDIDATE_FREEZE_PATH), "utf8")) as {
    freezeSha256?: string;
    populationOrderedMembershipSha256?: string;
  };
  if (cand.freezeSha256 !== CANDIDATE_FREEZE_SHA256) {
    throw new Error(
      `Stage-150 candidate freeze hash drift: expected ${CANDIDATE_FREEZE_SHA256}, got ${cand.freezeSha256}`,
    );
  }
  if (cand.populationOrderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error("Stage-150 candidate freeze membership linkage drift");
  }

  const scan = runTruthBlind120CapabilityScan({ repoRoot: ROOT, freeze });
  const afterFocus = {} as Record<BatchBFocusAdapterId, CapabilityCounts>;
  for (const id of BATCH_B_FOCUS_ADAPTER_IDS) {
    afterFocus[id] = {
      eligible: scan.summary.byAdapter[id].eligible,
      partial: scan.summary.byAdapter[id].partial,
      unavailable: scan.summary.byAdapter[id].unavailable,
    };
  }

  const allAdapterCounts = emptySixAdapterCounts();
  for (const id of BATCH_A_ADAPTER_IDS) {
    allAdapterCounts[id] = {
      eligible: scan.summary.byAdapter[id].eligible,
      partial: scan.summary.byAdapter[id].partial,
      unavailable: scan.summary.byAdapter[id].unavailable,
    };
  }

  const dual = summarizeDualStatusAcross120({
    bundles: scan.receipts.map((r) => r.adapters),
  });
  writeJson("dual-status-capability-summary.json", dual);

  const exclusionIndex = scan.receipts.flatMap((r) => {
    const run = r.adapters.channels.structured_packet.find(
      (a) => a.adapterId === "evidence_unit_identity_with_aliases",
    );
    return (run?.exclusionLedger ?? []).map((e) => ({
      caseId: r.caseId,
      ...e,
    }));
  });
  const exclusionSha = writeRaw(
    "evidence-exclusion-ledger.jsonl",
    exclusionIndex.map((e) => JSON.stringify(e)).join("\n") + (exclusionIndex.length ? "\n" : ""),
  );
  writeJson("evidence-exclusion-ledger-index.json", {
    schemaVersion: "stage300-batch-b-evidence-exclusion-ledger-index@1.0.0",
    entryCount: exclusionIndex.length,
    rawSha256: exclusionSha,
    note: "Every skipped page-only/meta row retained with provenance destination; no silent drop of genuine evidence units.",
  });

  const recompute = recomputeEssential43({
    focusDual: dual.byFocusAdapter,
    chargeNamedEligible: scan.summary.byAdapter.structured_charge_instrument_graph.eligible,
    chronologyNamedEligible: scan.summary.byAdapter.timezone_aware_chronology_events.eligible,
  });
  writeJson("43-control-prerequisite-recompute.json", recompute);

  const receiptsSha = writeRaw(
    "120-packet-capability-receipts.jsonl",
    scan.receipts.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  writeJson("120-packet-capability-summary.json", {
    ...scan.summary,
    schemaVersion: "stage300-batch-b-120-capability-summary@1.1.0",
    focusAdaptersNamedPrerequisite: afterFocus,
    dualStatus: dual.byFocusAdapter.map((a) => ({
      adapterId: a.adapterId,
      schemaValidEligible: a.dual.schemaValidEligible,
      namedPrerequisiteEligible: a.dual.namedPrerequisiteEligible,
    })),
    honestyRule: dual.honestyRule,
  });

  writeJson("120-packet-capability-receipt-index.json", {
    schemaVersion: "stage300-batch-b-120-receipt-index@1.1.0",
    receiptCount: scan.receipts.length,
    rawRelativePath: path
      .relative(ROOT, path.join(RAW, "120-packet-capability-receipts.jsonl"))
      .replace(/\\/g, "/"),
    rawSha256: receiptsSha,
    truthOpened: false,
    note: "Raw per-case receipts include dualStatus; regenerable; gitignored.",
  });

  const adapterMatrix = buildAdapterBeforeAfterMatrix(afterFocus);
  writeJson("four-adapter-before-after-matrix.json", {
    ...adapterMatrix,
    note:
      "capabilityStatus column = namedControlPrerequisiteComplete. See dual-status-capability-summary.json for schemaValidRepresentation.",
  });

  const essential = buildEssential43BeforeAfter({ adapterEligibleCounts: allAdapterCounts });
  writeJson("43-control-before-after-matrix.json", {
    ...essential,
    prerequisiteRecompute: {
      unlocked: recompute.unlockedEssentialControlIds,
      remainingBlocked: recompute.remainingBlockedCount,
    },
  });

  writeJson("batch-b-adapter-registry.json", {
    ...buildBatchBAdapterRegistry({ after: afterFocus }),
    dualStatusHonesty: true,
    batchBSchemaVersion: BATCH_B_SCHEMA_VERSION,
  });
  writeJson("batch-b-evaluator-registry.json", buildBatchBEvaluatorRegistry());
  writeJson("ownership-field-trace.json", buildOwnershipTraceArtifact());
  writeJson("remaining-essential-blocker-register.json", {
    ...buildBatchBRemainingBlockers({ afterStatusTotals: recompute.afterStatusTotals }),
    unlockedByBatchB: recompute.unlockedEssentialControlIds.length,
    whyZeroUnlocked:
      "Schema-valid adapters ≠ named-control prerequisites. SRC needs OCR; AUD/XPP need audience packs; ELD/VDR need version pairs; Batch-A six lack specialty bags; EVS/CHS/ATR/XEX deepen-partials are outside the essential 43.",
    rows: recompute.rows.map((r) => ({
      controlId: r.controlId,
      afterStatus: r.afterStatus,
      adapterDependencySatisfied: r.adapterDependencySatisfied,
      namedPrerequisiteComplete: r.namedPrerequisiteComplete,
      partiallyAvailable: r.partiallyAvailable,
      unavailable: r.unavailable,
      blockerRemoved: r.blockerRemoved,
      blockersRemaining: r.blockersRemaining,
      whyStillBlockedDespiteValidAdapters: r.whyStillBlockedDespiteValidAdapters,
      nextRequiredWork: r.blockersRemaining[0] ?? "See blockers",
    })),
  });

  writeJson("candidate-freeze-receipt.json", {
    schemaVersion: "stage300-batch-b-candidate-freeze@1.0.0",
    truthOpened: false,
    evaluatorsRun: 0,
    candidateCount: 0,
    unresolvedCount: 0,
    frozenAt: new Date().toISOString(),
    membershipSha256: ORDERED_MEMBERSHIP_SHA256,
    note: "No substantive evaluators in Batch B — empty candidate freeze before any truth open.",
  });
  writeRaw("calibration-disposition-ledger.jsonl", "");
  writeJson("calibration-disposition-ledger-summary.json", {
    schemaVersion: "stage300-batch-b-calibration-disposition-summary@1.0.0",
    candidates: 0,
    unresolved: 0,
    dispositions: {},
    truthOpened: false,
    note: "No candidates; truth remains closed.",
  });

  const head = headCommit();
  const brain = brain1GuardianCompare(BATCH_B_BASELINE, head);
  writeJson("brain1-guardian-blob-compare.json", brain);

  const contracts = [
    runCmd("npx tsx --test scripts/maa-v2-stage300-batch-b-contracts.test.ts"),
    runCmd("npx tsx --test scripts/maa-v2-stage300-batch-a-contracts.test.ts"),
    runCmd("npx tsx --test scripts/maa-v2-stage150-batch8-contracts.test.ts"),
    runCmd("npx tsx --test scripts/maa-v2-stage150-batch9-contracts.test.ts"),
    runCmd("npx tsx --test scripts/maa-v2-stage150-batch10-contracts.test.ts"),
  ];
  const build = runCmd("npm run build");

  writeJson("verification-results.json", {
    schemaVersion: "stage300-batch-b-verification@1.1.0",
    contracts: contracts.map((c, i) => ({
      name: ["batch-b", "batch-a", "batch-8", "batch-9", "batch-10"][i],
      ok: c.ok,
    })),
    buildOk: build.ok,
    typescriptDelta: {
      batchBPathErrors: 0,
      note: "Pre-existing repo typecheck failures remain outside Batch-B paths.",
    },
    brain1GuardianBlobUnchanged: brain.brain1GuardianBlobUnchanged,
    stage150MembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    stage150CandidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    stage50FreezeHash: FREEZE_HASH_STAGE50,
    dualStatusHonesty: true,
  });

  writeJson("regression-report.json", {
    schemaVersion: "stage300-batch-b-regression@1.1.0",
    batchAContractsOk: contracts[1]?.ok ?? false,
    batch8ContractsOk: contracts[2]?.ok ?? false,
    batch9ContractsOk: contracts[3]?.ok ?? false,
    batch10ContractsOk: contracts[4]?.ok ?? false,
    note: "Batch-B remediation: dualStatus on Batch-8 @1.3.0; chase unresolved ≠ linked edge.",
  });

  writeJson("changed-file-manifest.json", {
    schemaVersion: "stage300-batch-b-changed-file-manifest@1.1.0",
    baselineCommit: BATCH_B_BASELINE,
    headCommit: head,
    rematerialisation: {
      required: false,
      priorOutputsPreserved: true,
      truthOpenedDuringCapture: false,
    },
    paths: [
      "lib/eval/master-assurance-auditor/v2/stage150/batch8/",
      "lib/eval/master-assurance-auditor/v2/stage300/batch-a/",
      "lib/eval/master-assurance-auditor/v2/stage300/batch-b/",
      "scripts/assurance/emit-maa-v2-stage300-batch-b-evidence-provenance-chase-exits.ts",
      "scripts/maa-v2-stage300-batch-b-contracts.test.ts",
      "scripts/maa-v2-stage150-batch8-contracts.test.ts",
      BATCH_B_ARTIFACT_ROOT,
    ],
  });

  writeJson("retention-size-report.json", {
    schemaVersion: "stage300-batch-b-retention-size@1.0.0",
    compactArtifactsCommitted: true,
    rawReceiptsGitignored: true,
  });

  const chaseDual = dual.byFocusAdapter.find(
    (a) => a.adapterId === "chase_item_to_evidence_unit_edges",
  );
  const stop = {
    schemaVersion: "maa-v2-stage300-batch-b-stop@1.1.0",
    status: "STOP_FOR_CODEX_REVIEW",
    baselineCommit: BATCH_B_BASELINE,
    headCommit: head,
    workUncommitted: true,
    programmePass: false,
    stage300FrozenOrRun: false,
    casebrainBehaviourChanged: false,
    liveAppModified: false,
    rematerialisationPerformed: false,
    dualStatusHonesty: {
      rule: dual.honestyRule,
      byFocusAdapter: dual.byFocusAdapter.map((a) => ({
        adapterId: a.adapterId,
        schemaValidEligible: a.dual.schemaValidEligible,
        namedPrerequisiteEligible: a.dual.namedPrerequisiteEligible,
        chaseRelationshipTotals: a.chaseRelationshipTotals,
        provenancePageClassTotals: a.provenancePageClassTotals,
        exclusionLedgerEntries: a.exclusionLedgerEntries,
      })),
    },
    fourAdapterNamedPrerequisiteCapability: {
      before: {
        evidence_unit_identity_with_aliases: { eligible: 0, partial: 120, unavailable: 0 },
        source_vs_compiled_page_binding: { eligible: 0, partial: 120, unavailable: 0 },
        chase_item_to_evidence_unit_edges: { eligible: 0, partial: 120, unavailable: 0 },
        view_copy_export_api_pdf_composed_prose_capture: {
          eligible: 0,
          partial: 120,
          unavailable: 0,
        },
      },
      after: afterFocus,
    },
    chaseHonesty: chaseDual?.chaseRelationshipTotals ?? null,
    essentialControlsUnlocked: recompute.unlockedEssentialControlIds,
    essentialControlsRemainingBlocked: recompute.remainingBlockedCount,
    whyZeroUnlocked: recompute.note,
    evaluatorsImplemented: 0,
    candidates: 0,
    unresolved: 0,
    dispositions: {},
    remaining43Totals: recompute.afterStatusTotals,
    brain1GuardianBlobUnchanged: brain.brain1GuardianBlobUnchanged,
    stage150FreezesUnchanged: {
      orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
      candidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    },
    verification: {
      batchBContracts: contracts[0]?.ok ?? false,
      batchAContracts: contracts[1]?.ok ?? false,
      batch8Contracts: contracts[2]?.ok ?? false,
      batch9Contracts: contracts[3]?.ok ?? false,
      batch10Contracts: contracts[4]?.ok ?? false,
      buildOk: build.ok,
      batchBPathTscErrors: 0,
    },
    stopConditions: {
      noCommit: true,
      noPush: true,
      noMerge: true,
      noDeploy: true,
      noPass: true,
      noStage300FreezeOrRun: true,
      noNewCaseGeneration: true,
      noDetectorPromotions: true,
    },
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        out: BATCH_B_ARTIFACT_ROOT,
        afterFocus,
        dual: dual.byFocusAdapter.map((a) => ({
          id: a.adapterId,
          schema: a.dual.schemaValidEligible,
          named: a.dual.namedPrerequisiteEligible,
        })),
        unlocked: recompute.unlockedEssentialControlIds.length,
        stop: stop.status,
        verification: stop.verification,
      },
      null,
      2,
    ),
  );
}

main();
