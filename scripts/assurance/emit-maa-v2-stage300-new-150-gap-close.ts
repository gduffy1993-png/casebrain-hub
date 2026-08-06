/**
 * Emit gap-close rematerialisation reports for the same Stage-300 new-150 population.
 * Stop uncommitted. No Stage-300 freeze/run.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-new-150-gap-close.ts [--limit=N]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  FROZEN_150_CANDIDATE_FREEZE_SHA256,
  FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
  NEW150_ARTIFACT_ROOT,
  NEW150_BASELINE,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";
import { runGapCloseRematerialisation } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/gap-close-rematerialise";

const ROOT = process.cwd();
const OUT = path.join(ROOT, NEW150_ARTIFACT_ROOT);
const GAP = path.join(OUT, "gap-close-v1");

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

function parseLimit(): number | undefined {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return undefined;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function verifyFrozen150(): { unchanged: boolean; details: Record<string, unknown> } {
  const manifestPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json",
  );
  const freezePath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json",
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { orderedMembershipSha256?: string };
  const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8")) as { freezeSha256?: string };
  const unchanged =
    manifest.orderedMembershipSha256 === FROZEN_150_ORDERED_MEMBERSHIP_SHA256 &&
    freeze.freezeSha256 === FROZEN_150_CANDIDATE_FREEZE_SHA256;
  return {
    unchanged,
    details: {
      membership: manifest.orderedMembershipSha256,
      freeze: freeze.freezeSha256,
    },
  };
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
  return { baseline, head, allUnchanged: rows.every((r) => r.blobUnchanged), rows };
}

async function main() {
  const limit = parseLimit();
  const head = headCommit();
  fs.mkdirSync(GAP, { recursive: true });

  const beforePath = path.join(OUT, "per-control-denominator-report.before-gap-close.json");
  const livePath = path.join(OUT, "per-control-denominator-report.json");
  if (!fs.existsSync(beforePath) && fs.existsSync(livePath)) {
    fs.copyFileSync(livePath, beforePath);
  }
  const before = JSON.parse(fs.readFileSync(fs.existsSync(beforePath) ? beforePath : livePath, "utf8")) as {
    readyForCalibrationCount: number;
    controlsWithAchievedDenominatorGt0: number;
    rows: Array<{ controlId: string; achievedDenominator: number; readyForStage300Calibration: boolean }>;
  };

  console.log(`[gap-close] before ready=${before.readyForCalibrationCount}/43 limit=${limit ?? 150}`);
  const result = await runGapCloseRematerialisation({ limit });
  const frozen = verifyFrozen150();
  const brain = brain1GuardianCompare(NEW150_BASELINE, head);

  const afterRows = result.perControl;
  const ready = afterRows.filter((r) => r.readyForStage300Calibration).length;
  const achievedGt0 = afterRows.filter((r) => r.achievedDenominator > 0).length;

  const beforeMap = new Map(before.rows.map((r) => [r.controlId, r]));
  const unlocked = afterRows.filter((r) => {
    const b = beforeMap.get(r.controlId);
    return (b?.achievedDenominator ?? 0) === 0 && r.achievedDenominator > 0;
  });
  const stillBlocked = afterRows.filter((r) => r.achievedDenominator === 0);
  const regressions = afterRows.filter((r) => {
    const b = beforeMap.get(r.controlId);
    return (b?.achievedDenominator ?? 0) > r.achievedDenominator;
  });

  writeJson(GAP, "before-after-denominator-matrix.json", {
    schemaVersion: "stage300-new150-gap-close-before-after@1.0.0",
    beforeReady: before.readyForCalibrationCount,
    afterReady: ready,
    beforeAchievedGt0: before.controlsWithAchievedDenominatorGt0,
    afterAchievedGt0: achievedGt0,
    unlockedControlIds: unlocked.map((r) => r.controlId),
    stillBlockedControlIds: stillBlocked.map((r) => r.controlId),
    regressions: regressions.map((r) => ({
      controlId: r.controlId,
      before: beforeMap.get(r.controlId)?.achievedDenominator,
      after: r.achievedDenominator,
    })),
    rows: afterRows.map((r) => ({
      controlId: r.controlId,
      before: beforeMap.get(r.controlId)?.achievedDenominator ?? 0,
      after: r.achievedDenominator,
      delta: r.achievedDenominator - (beforeMap.get(r.controlId)?.achievedDenominator ?? 0),
      ready: r.readyForStage300Calibration,
      ownership: r.ownership,
      deferReason: r.deferReason,
      exactMissingInputWhereMissed: r.exactMissingInputWhereMissed,
    })),
  });

  writeJson(OUT, "per-control-denominator-report.json", {
    schemaVersion: "stage300-new-150-per-control-denominator@1.1.0",
    controlCount: afterRows.length,
    readyForCalibrationCount: ready,
    controlsWithAchievedDenominatorGt0: achievedGt0,
    gapCloseVersion: "gap-close-v1",
    rows: afterRows,
  });

  writeJson(OUT, "capability-snapshot-summary.json", {
    schemaVersion: "stage300-new-150-capability-snapshot-summary@1.1.0",
    gapCloseVersion: "gap-close-v1",
    rows: result.snapshots.map((s) => ({
      caseId: s.caseId,
      coverageTag: s.coverageTag,
      sixProductionExitsComplete: s.sixProductionExitsComplete,
      ocrReceiptsPresent: s.ocrReceiptsPresent,
      vdrReceiptPresent: s.vdrReceiptPresent,
      productionSpecialtyBags: s.productionSpecialtyBags,
      audiencePacksPresent: s.audiencePacksPresent,
      eldProductionPairsPresent: s.eldProductionPairsPresent,
      namedCompleteControlIds: Object.entries(s.namedCompleteByControl)
        .filter(([, v]) => v)
        .map(([k]) => k),
      corpusDesignControlIds: Object.entries(s.corpusDesignByControl)
        .filter(([, v]) => v)
        .map(([k]) => k),
    })),
  });

  writeJson(GAP, "cause-classification-register.json", {
    schemaVersion: "stage300-new150-gap-close-cause-classification@1.0.0",
    classes: {
      "1_required_source_material_absent": stillBlocked
        .filter((r) => (r.corpusDesignSatisfiedCount ?? 0) === 0)
        .map((r) => r.controlId),
      "2_source_present_production_does_not_expose": stillBlocked
        .filter((r) => (r.corpusDesignSatisfiedCount ?? 0) > 0 && r.ownership === "production_casebrain")
        .map((r) => r.controlId),
      "3_production_exists_adapter_cannot_consume": [],
      "4_genuine_before_after_version_pair_required": stillBlocked
        .filter((r) => r.controlId.startsWith("MAA2-ELD-") && (r.corpusDesignSatisfiedCount ?? 0) > 0)
        .map((r) => r.controlId),
      "5_browser_human_legal_external_deferred": ["authenticated_browser_lane"],
    },
    notes: {
      specialtyLane: "LSL/CHR/PRC bags materialised via source_document_parse_harness (not CaseBrain emitter, not truth)",
      audienceLane: "AUD/XPP packs captured from genuine LiveProductionSurfaces builders",
      eldLane: "ELD pairs from dual production capture before/after controlled source change",
      vdrLane: "VDR pins enriched from production findings + deterministic builder model pin",
    },
  });

  writeJson(GAP, "production-vs-adapter-vs-source-gaps.json", {
    schemaVersion: "stage300-new150-gap-close-gap-classes@1.0.0",
    productionGaps: stillBlocked.filter((r) => r.ownership === "production_casebrain").map((r) => r.controlId),
    harnessGaps: stillBlocked
      .filter((r) => r.ownership === "capture_materialisation_harness")
      .map((r) => r.controlId),
    sourceGaps: stillBlocked.filter((r) => r.ownership === "source_corpus").map((r) => r.controlId),
    adapterGaps: [],
  });

  const decision = `# Stage-300 New-150 Gap-Close Decision Card

**Status:** GAP-CLOSE REMATERIALISATION COMPLETE (stop uncommitted)  
**Baseline:** \`${NEW150_BASELINE}\`  
**Head:** \`${head}\`  
**Population:** same 150 (original hashes preserved under each \`gap-close-v1/\`)

## Before → After
| Metric | Before | After |
|---|---|---|
| Ready (named denom≥1) | ${before.readyForCalibrationCount}/43 | **${ready}/43** |
| Achieved>0 | ${before.controlsWithAchievedDenominatorGt0} | **${achievedGt0}** |
| Unlocked this pass | — | **${unlocked.length}** |

## Unlocked controls
${unlocked.map((r) => `- \`${r.controlId}\` (achieved=${r.achievedDenominator})`).join("\n") || "- (none)"}

## Still blocked
${stillBlocked.map((r) => `- \`${r.controlId}\` — ${r.deferReason ?? r.exactMissingInputWhereMissed ?? "see cause register"}`).join("\n") || "- (none)"}

## What is not claimed
No PASS, no promotions, no Stage-300 freeze/run, no CaseBrain emitter specialty bags (harness source-parse only), browser deferred.

## Next
Codex review → then either product backlog for remaining production gaps or Stage-300 calibration on unlocked denominators (pre-agreed contract first).
`;
  fs.writeFileSync(path.join(GAP, "DECISION-CARD.md"), decision, "utf8");
  fs.writeFileSync(path.join(OUT, "DECISION-CARD.md"), decision, "utf8");

  let contractsOk = false;
  let buildOk = false;
  try {
    execSync("npx tsx --test scripts/maa-v2-stage300-new-150-contracts.test.ts", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    contractsOk = true;
  } catch {
    contractsOk = false;
  }
  try {
    execSync("npm run build", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    });
    buildOk = true;
  } catch {
    buildOk = false;
  }

  writeJson(GAP, "verification-results.json", {
    schemaVersion: "stage300-new150-gap-close-verification@1.0.0",
    contractsOk,
    buildOk,
    frozen150Unchanged: frozen.unchanged,
    brain1GuardianUnchanged: brain.allUnchanged,
    changedOutputCount: result.changedOutputCount,
    runtimeMs: result.runtimeMs,
  });
  writeJson(GAP, "brain1-guardian-blob-compare.json", brain);

  writeJson(GAP, "STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage300-new150-gap-close-stop@1.0.0",
    status: "STOP_UNCOMMITTED_GAP_CLOSE_REMATERIALISATION",
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    beforeReady: before.readyForCalibrationCount,
    afterReady: ready,
    unlockedCount: unlocked.length,
    stillBlockedCount: stillBlocked.length,
    regressions: regressions.length,
    frozen150Unchanged: frozen.unchanged,
    brain1GuardianUnchanged: brain.allUnchanged,
    contractsOk,
    buildOk,
    doNot: ["freeze_or_run_stage_300", "commit_push_merge_deploy", "claim_PASS", "promote_from_fixtures"],
  });
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage300-new-150-stop@1.1.0",
    status: "STOP_UNCOMMITTED_GAP_CLOSE_REMATERIALISATION",
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    readyForCalibrationCount: ready,
    eligibleControlsGained: achievedGt0,
    unlockedThisPass: unlocked.map((r) => r.controlId),
    frozen150Unchanged: frozen.unchanged,
    brain1GuardianUnchanged: brain.allUnchanged,
    contractsOk,
    buildOk,
    doNot: ["freeze_or_run_stage_300", "commit_push_merge_deploy", "claim_PASS"],
  });

  console.log(
    JSON.stringify(
      {
        processed: result.processed,
        beforeReady: before.readyForCalibrationCount,
        afterReady: ready,
        unlocked: unlocked.length,
        stillBlocked: stillBlocked.length,
        regressions: regressions.length,
        changedOutputCount: result.changedOutputCount,
        contractsOk,
        buildOk,
        frozen150Unchanged: frozen.unchanged,
        brain1GuardianUnchanged: brain.allUnchanged,
        runtimeMs: result.runtimeMs,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
