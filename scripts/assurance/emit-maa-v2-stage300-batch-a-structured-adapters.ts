/**
 * Emit Stage-300 Batch-A shared structured-adapter artefacts.
 * No Stage-300 generation/freeze/run. No CaseBrain behaviour change. Stop uncommitted.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-batch-a-structured-adapters.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import type { PopulationFreezeReceipt } from "../../lib/eval/master-assurance-auditor/v2/stage150/calibration/population-freeze";
import {
  BATCH_A_ADAPTER_IDS,
  BATCH_A_ARTIFACT_ROOT,
  BATCH_A_BASELINE,
  BATCH_A_SCHEMA_VERSION,
  CANDIDATE_FREEZE_SHA256,
  ORDERED_MEMBERSHIP_SHA256,
  buildAdapterRegistry,
  buildBeforeAfterMatrix,
  buildOwnershipDedupGraph,
  buildRemainingEssentialBlockerRegister,
  runTruthBlind120CapabilityScan,
  type BatchAAdapterId,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-a";

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH_A_ARTIFACT_ROOT);
const FREEZE_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/freeze-receipt.json";
const FROZEN_POPULATION_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json";
const CANDIDATE_FREEZE_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json";

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function changedFileManifest(head: string) {
  const out: Array<{ path: string; kind: "added" | "modified" | "untracked"; sha256: string | null }> =
    [];
  const prefixes = [
    "lib/eval/master-assurance-auditor/v2/stage300/batch-a/",
    "scripts/assurance/emit-maa-v2-stage300-batch-a-structured-adapters.ts",
    "scripts/maa-v2-stage300-batch-a-contracts.test.ts",
    BATCH_A_ARTIFACT_ROOT,
  ];
  const tracked = execSync("git diff --name-status HEAD", { encoding: "utf8", cwd: ROOT })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const line of tracked) {
    const [status, ...rest] = line.split(/\t/);
    const p = rest.join("\t").replace(/\\/g, "/");
    if (!p || !prefixes.some((pre) => p === pre || p.startsWith(pre))) continue;
    const abs = path.join(ROOT, p);
    out.push({
      path: p,
      kind: status.startsWith("A") ? "added" : "modified",
      sha256: fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : null,
    });
  }
  for (const pre of prefixes) {
    const abs = path.join(ROOT, pre);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      const walk = (dir: string) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(full);
          else {
            const rel = path.relative(ROOT, full).replace(/\\/g, "/");
            if (!out.some((o) => o.path === rel)) {
              out.push({ path: rel, kind: "untracked", sha256: sha(fs.readFileSync(full)) });
            }
          }
        }
      };
      walk(abs);
    } else {
      const rel = pre.replace(/\\/g, "/");
      if (!out.some((o) => o.path === rel)) {
        out.push({ path: rel, kind: "untracked", sha256: sha(fs.readFileSync(abs)) });
      }
    }
  }
  return {
    schemaVersion: "changed-file-manifest@1.0.0",
    baselineCommit: BATCH_A_BASELINE,
    headCommit: head,
    files: out.sort((a, b) => a.path.localeCompare(b.path)),
    count: out.length,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  const freezeReceipt = JSON.parse(fs.readFileSync(path.join(ROOT, FREEZE_PATH), "utf8")) as {
    orderedMembershipSha256: string;
  };
  const freeze = JSON.parse(
    fs.readFileSync(path.join(ROOT, FROZEN_POPULATION_PATH), "utf8"),
  ) as PopulationFreezeReceipt;
  const candidateFreeze = JSON.parse(
    fs.readFileSync(path.join(ROOT, CANDIDATE_FREEZE_PATH), "utf8"),
  ) as { freezeSha256: string };

  if (freezeReceipt.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error(
      `Freeze membership hash drift: ${freezeReceipt.orderedMembershipSha256} ≠ ${ORDERED_MEMBERSHIP_SHA256}`,
    );
  }
  if (freeze.orderedMembershipSha256 !== ORDERED_MEMBERSHIP_SHA256) {
    throw new Error(
      `Frozen population membership hash drift: ${freeze.orderedMembershipSha256} ≠ ${ORDERED_MEMBERSHIP_SHA256}`,
    );
  }
  if (candidateFreeze.freezeSha256 !== CANDIDATE_FREEZE_SHA256) {
    throw new Error(
      `Candidate freeze hash drift: ${candidateFreeze.freezeSha256} ≠ ${CANDIDATE_FREEZE_SHA256}`,
    );
  }

  const registry = buildAdapterRegistry();
  writeJson("batch-a-adapter-registry.json", registry);

  const ownership = buildOwnershipDedupGraph();
  writeJson("ownership-deduplication-graph.json", ownership);

  console.log("Running truth-blind 120-packet capability scan…");
  const { receipts, summary } = runTruthBlind120CapabilityScan({ repoRoot: ROOT, freeze });
  writeJson("120-packet-capability-summary.json", summary);

  const receiptsDir = path.join(OUT, "120-packet-capability-receipts");
  fs.mkdirSync(receiptsDir, { recursive: true });
  const receiptIndex: Array<{ caseId: string; relativePath: string }> = [];
  for (const r of receipts) {
    const name = `${r.caseId}.json`;
    fs.writeFileSync(path.join(receiptsDir, name), `${JSON.stringify(r, null, 2)}\n`, "utf8");
    receiptIndex.push({
      caseId: r.caseId,
      relativePath: `${BATCH_A_ARTIFACT_ROOT}/120-packet-capability-receipts/${name}`,
    });
  }
  writeJson("120-packet-capability-receipt-index.json", {
    schemaVersion: "stage300-batch-a-120-receipt-index@1.0.0",
    count: receiptIndex.length,
    truthOpened: false,
    candidatesGenerated: false,
    projectionOnlyExcluded: 30,
    receipts: receiptIndex,
  });

  const adapterEligibleCounts = {} as Record<
    BatchAAdapterId,
    { eligible: number; partial: number; unavailable: number }
  >;
  for (const id of BATCH_A_ADAPTER_IDS) {
    adapterEligibleCounts[id] = {
      eligible: summary.byAdapter[id].eligible,
      partial: summary.byAdapter[id].partial,
      unavailable: summary.byAdapter[id].unavailable,
    };
  }

  const beforeAfter = buildBeforeAfterMatrix({ adapterEligibleCounts });
  writeJson("43-control-before-after-matrix.json", beforeAfter);

  const remaining = buildRemainingEssentialBlockerRegister({ beforeAfterRows: beforeAfter.rows });
  writeJson("remaining-essential-blocker-register.json", remaining);

  const blob = brain1GuardianCompare(BATCH_A_BASELINE, head);
  writeJson("brain1-guardian-blob-compare.json", blob);

  const manifest = changedFileManifest(head);
  // Recompute after writing artefacts so STOP/manifest include themselves on next pass —
  // write once more after STOP.
  writeJson("changed-file-manifest.json", manifest);

  const stop = {
    schemaVersion: "maa-v2-stage300-batch-a-structured-adapters-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-300 BATCH-A SHARED STRUCTURED ADAPTERS",
    status: "STAGE300_BATCH_A_STRUCTURED_ADAPTERS_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH_A_BASELINE,
    headCommit: head,
    batchASchemaVersion: BATCH_A_SCHEMA_VERSION,
    orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    candidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    freezeHashesVerified: true,
    freezeHashStage50: FREEZE_HASH_STAGE50,
    engineeringJobs: 6,
    essentialControls: 43,
    unlockedEssentialControlsByAdapterFoundation: registry.unlockedEssentialControlCount,
    fullyImplementedEssentialControls: 0,
    scan: {
      scanned: summary.scanned,
      projectionOnlyExcluded: summary.projectionOnlyExcluded,
      truthOpened: false,
      candidatesGenerated: false,
      byAdapter: summary.byAdapter,
    },
    beforeAfterStatusTotals: beforeAfter.afterStatusTotals,
    remainingBlockerSummary: remaining.summary,
    stage300CorpusGenerationAllowed: false,
    stage300PopulationAcceptanceAllowed: false,
    stage300BlindFreezeAllowed: false,
    stage300CalibrationExecutionAllowed: false,
    stage300RemediationRerunAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    stage300Generated: false,
    stage300Frozen: false,
    stage300Run: false,
    applicationRepaired: false,
    caseGeneration: false,
    detectorsPromoted: false,
    calibrationComplete: false,
    brain1GuardianBlobUnchanged: blob.brain1GuardianBlobUnchanged,
    committed: false,
    pushed: false,
    artefacts: [
      "batch-a-adapter-registry.json",
      "43-control-before-after-matrix.json",
      "120-packet-capability-summary.json",
      "120-packet-capability-receipt-index.json",
      "120-packet-capability-receipts/",
      "ownership-deduplication-graph.json",
      "remaining-essential-blocker-register.json",
      "changed-file-manifest.json",
      "brain1-guardian-blob-compare.json",
      "verification-results.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    blockers: [
      "Uncommitted — stop for Codex review",
      "No Stage-300 generation/freeze/run",
      "No commit/push/merge/deploy",
      "No corpus or programme PASS",
      "Adapters ≠ substantive evaluators; calibration remaining pending",
      "No essential control fully implemented",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  // Refresh manifest to include all artefacts written in this run.
  const finalManifest = changedFileManifest(head);
  writeJson("changed-file-manifest.json", finalManifest);

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: stop.status,
        engineeringJobs: 6,
        unlockedEssential: registry.unlockedEssentialControlCount,
        fullyImplemented: 0,
        scan: summary.byAdapter,
        afterStatusTotals: beforeAfter.afterStatusTotals,
        brain1: blob.brain1GuardianBlobUnchanged,
        freezeOk: true,
        out: BATCH_A_ARTIFACT_ROOT,
        changedFiles: finalManifest.count,
      },
      null,
      2,
    ),
  );
}

main();
