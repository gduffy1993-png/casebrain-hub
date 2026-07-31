/**
 * Emit Stage-150 closure + Stage-300 execution-readiness plan artefacts.
 * Planning only — no Stage-300 generation/freeze/run. Stop uncommitted.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-execution-readiness-plan.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import {
  AUTHORISED_BASELINE,
  CANDIDATE_FREEZE_SHA256,
  ORDERED_MEMBERSHIP_SHA256,
  STAGE150_CLOSURE_STATUS,
  STAGE300_READINESS_ARTIFACT_ROOT,
  buildStage150ClosureAndStage300Plan,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/stage300-readiness-plan";

const ROOT = process.cwd();
const OUT = path.join(ROOT, STAGE300_READINESS_ARTIFACT_ROOT);

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
  const tracked = execSync("git diff --name-status HEAD", { encoding: "utf8", cwd: ROOT })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const line of tracked) {
    const [status, ...rest] = line.split(/\t/);
    const p = rest.join("\t");
    if (!p) continue;
    if (
      !p.includes("stage300-execution-readiness") &&
      !p.includes("stage300-readiness-plan") &&
      !p.includes("emit-maa-v2-stage300") &&
      !(p === "lib/eval/master-assurance-auditor/v2/stage150/index.ts")
    ) {
      continue;
    }
    const abs = path.join(ROOT, p);
    out.push({
      path: p.replace(/\\/g, "/"),
      kind: status.startsWith("A") ? "added" : "modified",
      sha256: fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : null,
    });
  }
  // Untracked plan artefacts / scripts
  const candidates = [
    "lib/eval/master-assurance-auditor/v2/stage150/stage300-readiness-plan.ts",
    "scripts/assurance/emit-maa-v2-stage300-execution-readiness-plan.ts",
    STAGE300_READINESS_ARTIFACT_ROOT,
  ];
  for (const c of candidates) {
    const abs = path.join(ROOT, c);
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
      const rel = c.replace(/\\/g, "/");
      if (!out.some((o) => o.path === rel)) {
        out.push({ path: rel, kind: "untracked", sha256: sha(fs.readFileSync(abs)) });
      }
    }
  }
  // index.ts may be modified
  const indexRel = "lib/eval/master-assurance-auditor/v2/stage150/index.ts";
  if (fs.existsSync(path.join(ROOT, indexRel)) && !out.some((o) => o.path === indexRel)) {
    const diff = execSync(`git diff --name-only HEAD -- ${indexRel}`, { encoding: "utf8", cwd: ROOT });
    if (diff.trim()) {
      out.push({
        path: indexRel,
        kind: "modified",
        sha256: sha(fs.readFileSync(path.join(ROOT, indexRel))),
      });
    }
  }
  return {
    schemaVersion: "changed-file-manifest@1.0.0",
    baselineCommit: AUTHORISED_BASELINE,
    headCommit: head,
    files: out.sort((a, b) => a.path.localeCompare(b.path)),
    count: out.length,
  };
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  const plan = buildStage150ClosureAndStage300Plan({ repoRoot: ROOT, headCommit: head });
  const blob = brain1GuardianCompare(AUTHORISED_BASELINE, head);
  writeJson("brain1-guardian-blob-compare.json", blob);

  // Re-read disposition for STOP totals
  const disposition = JSON.parse(
    fs.readFileSync(path.join(OUT, "stage150-161-control-disposition-matrix.json"), "utf8"),
  ) as {
    controlCount: number;
    totalsReconcile: boolean;
    implementationTotals: Record<string, number>;
    requiredBeforeStage300Count: number;
    deferralLaneTotals: Record<string, number>;
  };
  const essential = JSON.parse(
    fs.readFileSync(path.join(OUT, "stage300-essential-control-register.json"), "utf8"),
  ) as { count: number };
  const gate = JSON.parse(
    fs.readFileSync(path.join(OUT, "stage300-execution-readiness-gate.json"), "utf8"),
  ) as Record<string, unknown>;

  const manifest = changedFileManifest(head);
  writeJson("changed-file-manifest.json", manifest);

  const freezeOk =
    ORDERED_MEMBERSHIP_SHA256 ===
      (
        JSON.parse(
          fs.readFileSync(
            path.join(
              ROOT,
              "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/freeze-receipt.json",
            ),
            "utf8",
          ),
        ) as { orderedMembershipSha256: string }
      ).orderedMembershipSha256 &&
    CANDIDATE_FREEZE_SHA256 ===
      (
        JSON.parse(
          fs.readFileSync(
            path.join(
              ROOT,
              "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json",
            ),
            "utf8",
          ),
        ) as { freezeSha256: string }
      ).freezeSha256;

  const stop = {
    schemaVersion: "maa-v2-stage300-execution-readiness-plan-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-150 CLOSURE + STAGE-300 EXECUTION-READINESS PLAN",
    status: "STAGE300_EXECUTION_READINESS_PLAN_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: AUTHORISED_BASELINE,
    headCommit: head,
    stage150ClosureStatus: STAGE150_CLOSURE_STATUS,
    orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
    candidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    freezeHashesVerified: freezeOk,
    controlDispositionCount: disposition.controlCount,
    controlTotalsReconcile: disposition.totalsReconcile,
    implementationTotals: disposition.implementationTotals,
    requiredBeforeStage300Count: disposition.requiredBeforeStage300Count,
    essentialControlRegisterCount: essential.count,
    deferralLaneTotals: disposition.deferralLaneTotals,
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
    freezeHashStage50: FREEZE_HASH_STAGE50,
    brain1GuardianBlobUnchanged: blob.brain1GuardianBlobUnchanged,
    committed: false,
    pushed: false,
    artefacts: [
      "stage150-closure-report.json",
      "stage150-161-control-disposition-matrix.json",
      "stage300-essential-control-register.json",
      "missing-adapter-implementation-order.json",
      "new-150-coverage-specification.json",
      "denominator-lineage-policy.json",
      "stage300-execution-readiness-gate.json",
      "changed-file-manifest.json",
      "brain1-guardian-blob-compare.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    gateSnapshot: {
      stage300CorpusGenerationAllowed: gate.stage300CorpusGenerationAllowed,
      stage300PopulationAcceptanceAllowed: gate.stage300PopulationAcceptanceAllowed,
      stage300BlindFreezeAllowed: gate.stage300BlindFreezeAllowed,
      stage300CalibrationExecutionAllowed: gate.stage300CalibrationExecutionAllowed,
      stage300RemediationRerunAllowed: gate.stage300RemediationRerunAllowed,
    },
    blockers: [
      "Uncommitted — stop for Codex review",
      "No Stage-300 generation/freeze/run",
      "No commit/push/merge/deploy",
      "No corpus or programme PASS",
      "Stage-150 completion does not flip any Stage-300 gate",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: STAGE150_CLOSURE_STATUS,
        disposition: disposition.controlCount,
        reconcile: disposition.totalsReconcile,
        essential: essential.count,
        freezeOk,
        brain1: blob.brain1GuardianBlobUnchanged,
        out: STAGE300_READINESS_ARTIFACT_ROOT,
      },
      null,
      2,
    ),
  );
}

main();
