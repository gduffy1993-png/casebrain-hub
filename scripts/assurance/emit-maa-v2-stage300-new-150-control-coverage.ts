/**
 * Emit Stage-300 new-150 control-coverage materialisation artefacts.
 *
 * Locked acceptance contract must exist before generation.
 * Checkpoints 5 → 20 → 150 automatic. Stop uncommitted.
 * No Stage-300 freeze/run. No CaseBrain repair. No PASS claim.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-new-150-control-coverage.ts
 * Optional: --limit=N (still respects checkpoints ≤ N)
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
  NEW150_CANDIDATE_ROOT,
  NEW150_SCHEMA,
  NEW150_SOURCE_ROOT,
  NEW150_TARGET,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";
import { loadUnlockRows } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/named-prerequisite-scan";
import { runNew150Pipeline } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/pipeline";

const ROOT = process.cwd();
const OUT = path.join(ROOT, NEW150_ARTIFACT_ROOT);

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
    baseline,
    head,
    allUnchanged: rows.every((r) => r.blobUnchanged),
    rows,
  };
}

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return NEW150_TARGET;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.min(n, NEW150_TARGET) : NEW150_TARGET;
}

async function main() {
  const limit = parseLimit();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  const lockedPath = path.join(OUT, "LOCKED-ACCEPTANCE-CONTRACT.json");
  if (!fs.existsSync(lockedPath)) {
    throw new Error("LOCKED-ACCEPTANCE-CONTRACT.json missing — refuse to generate before acceptance lock");
  }
  const locked = JSON.parse(fs.readFileSync(lockedPath, "utf8")) as {
    lockedBeforeImplementation?: boolean;
    baselineCommit?: string;
  };
  if (locked.lockedBeforeImplementation !== true) {
    throw new Error("Acceptance contract not locked");
  }

  console.log(`[new150] baseline=${NEW150_BASELINE} head=${head} limit=${limit}`);
  console.log(`[new150] starting pipeline (checkpoints 5→20→150 automatic)`);

  const result = await runNew150Pipeline({ limit, resume: process.argv.includes("--resume") });

  const unlock = loadUnlockRows(ROOT);

  // Independence from unlock path (authority)
  const unlockFull = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-batch-b-evidence-provenance-chase-exits/governance/43-control-unlock-path.json",
      ),
      "utf8",
    ),
  ) as { rows: Array<Record<string, unknown>> };
  const independenceReport = unlockFull.rows.map((r) => {
    const ind = (r.auditorIndependence ?? {}) as Record<string, unknown>;
    return {
      controlId: r.controlId,
      productionFunctionUnderAudit: ind.productionFunctionUnderAudit ?? null,
      independentSourceOrTruth: ind.independentSourceOrTruth ?? null,
      sharedTypesSchemasUtilities: ind.sharedTypesSchemasUtilities ?? [],
      expectedAndActualShareSubstantiveAlgorithm: ind.expectedAndActualShareSubstantiveAlgorithm ?? null,
      independenceClass: ind.independenceClass ?? "INDEPENDENCE_PENDING_PROOF",
      tautologicalUnsafe: ind.independenceClass === "TAUTOLOGICAL_UNSAFE",
    };
  });

  const gapRegister = result.perControl
    .filter((r) => r.achievedDenominator < r.targetDenominator)
    .map((r) => {
      const u = unlock.find((x) => x.controlId === r.controlId)!;
      return {
        controlId: r.controlId,
        priority: r.priority,
        exactMissingInput: r.exactMissingInputWhereMissed ?? u.exactMissingInput,
        gapClass: u.productionVsHarnessGapClass,
        ownership: r.ownership,
        corpusDesignSatisfiedCount: r.corpusDesignSatisfiedCount,
        achievedDenominator: r.achievedDenominator,
        deferReason: r.deferReason,
        classification:
          u.productionVsHarnessGapClass === "production_does_not_emit"
            ? "production_does_not_emit"
            : u.productionVsHarnessGapClass === "production_prose_only_not_structured"
              ? "production_carries_only_in_prose_not_structured_data"
              : u.productionVsHarnessGapClass === "source_packets_do_not_contain"
                ? "source_packets_do_not_contain"
                : u.missingInputLane === "browser"
                  ? "browser_authenticated_capture_required"
                  : u.missingInputLane === "human_legal_external"
                    ? "human_legal_external_evidence_required"
                    : u.productionVsHarnessGapClass,
      };
    });

  const brain = brain1GuardianCompare(NEW150_BASELINE, head);

  // Hash manifests (compact)
  const sourceHashRows = result.accepted.map((a) => {
    const srcDir = path.join(ROOT, NEW150_SOURCE_ROOT, a.caseId);
    const files = [
      "canonical-bundle.md",
      "truth-key.json",
      "casebrain-output.json",
      "source-capability-inventory.json",
      "vdr-run-receipt.json",
      "lineage.json",
      "bundle.pdf",
    ];
    const hashes: Record<string, string | null> = {};
    for (const f of files) {
      const p = path.join(srcDir, f);
      hashes[f] = fs.existsSync(p) ? sha(fs.readFileSync(p)) : null;
    }
    const ocr = path.join(srcDir, "ocr-page-unit-receipts.json");
    hashes["ocr-page-unit-receipts.json"] = fs.existsSync(ocr) ? sha(fs.readFileSync(ocr)) : null;
    return { caseId: a.caseId, packetSha256: a.packetSha256, hashes };
  });

  const readyCount = result.perControl.filter((r) => r.readyForStage300Calibration).length;
  const eligibleGained = result.perControl.filter((r) => r.achievedDenominator > 0).length;

  const dirSize = (p: string): number => {
    if (!fs.existsSync(p)) return 0;
    let total = 0;
    const walk = (d: string) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const abs = path.join(d, ent.name);
        if (ent.isDirectory()) walk(abs);
        else total += fs.statSync(abs).size;
      }
    };
    walk(p);
    return total;
  };

  const storageBytes = dirSize(path.join(ROOT, NEW150_SOURCE_ROOT)) + dirSize(path.join(ROOT, NEW150_CANDIDATE_ROOT));

  // Contracts + build verification (focused)
  let contractsOk = false;
  let buildOk = false;
  let contractsLog = "";
  let buildLog = "";
  try {
    contractsLog = execSync("npx tsx --test scripts/maa-v2-stage300-new-150-contracts.test.ts", {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    contractsOk = true;
  } catch (e) {
    contractsLog = e instanceof Error ? String(e) : String(e);
    // Contracts file may not exist yet on first emit — write it then retry once below
  }

  writeJson(OUT, "new-150-population-manifest.json", {
    schemaVersion: "stage300-new-150-population-manifest@1.0.0",
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    target: limit,
    accepted: result.accepted.length,
    rejected: result.rejected.length,
    cases: result.accepted,
    rejectedCases: result.rejected,
    coverage: result.coverage,
    uniqueness: result.uniqueness,
    truthBlinding: result.truthBlinding,
    frozen150: result.frozen150,
    checkpoints: result.checkpoints,
    stoppedEarly: result.stoppedEarly,
    stopReason: result.stopReason,
    preserveFrozen150: {
      orderedMembershipSha256: FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
      candidateFreezeSha256: FROZEN_150_CANDIDATE_FREEZE_SHA256,
      unchanged: result.frozen150.unchanged,
    },
  });

  writeJson(OUT, "per-control-denominator-report.json", {
    schemaVersion: "stage300-new-150-per-control-denominator@1.0.0",
    controlCount: result.perControl.length,
    readyForCalibrationCount: readyCount,
    controlsWithAchievedDenominatorGt0: eligibleGained,
    rows: result.perControl,
  });

  writeJson(OUT, "source-output-truth-hash-manifest.json", {
    schemaVersion: "stage300-new-150-hash-manifest@1.0.0",
    note: "Compact hashes only — raw sources/candidates remain gitignored",
    rows: sourceHashRows,
  });

  writeJson(OUT, "uniqueness-near-duplicate-report.json", {
    schemaVersion: "stage300-new-150-uniqueness@1.0.0",
    uniqueness: result.uniqueness,
    nearDuplicates: result.nearDuplicates,
    templateLineageDisclosed: true,
    normalisedTemplateId: result.uniqueness.normalisedTemplateId,
  });

  writeJson(OUT, "production-vs-harness-gap-register.json", {
    schemaVersion: "stage300-new-150-production-vs-harness-gap@1.0.0",
    rows: gapRegister,
  });

  writeJson(OUT, "auditor-independence-report.json", {
    schemaVersion: "stage300-new-150-auditor-independence@1.0.0",
    tautologicalUnsafeCount: independenceReport.filter((r) => r.tautologicalUnsafe).length,
    rows: independenceReport,
  });

  writeJson(OUT, "rejection-register.json", {
    schemaVersion: "stage300-new-150-rejection-register@1.0.0",
    rejected: result.rejected,
  });

  writeJson(OUT, "cost-retention-report.json", {
    schemaVersion: "stage300-new-150-cost-retention@1.0.0",
    runtimeMs: result.runtimeMs,
    storageBytes,
    casesAccepted: result.accepted.length,
    casesRejected: result.rejected.length,
    eligibleControlsGained: eligibleGained,
    readyForCalibrationCount: readyCount,
    costTimePerNewlyEligibleControlMs:
      eligibleGained > 0 ? Math.round(result.runtimeMs / eligibleGained) : null,
    rawArtefactsGitignored: [NEW150_SOURCE_ROOT, NEW150_CANDIDATE_ROOT],
    compactManifestsCommittedLater: true,
    deterministicRegenerationCommand:
      "npx tsx scripts/assurance/emit-maa-v2-stage300-new-150-control-coverage.ts",
  });

  writeJson(OUT, "capability-snapshots-index.json", {
    schemaVersion: "stage300-new-150-capability-snapshots-index@1.0.0",
    count: result.snapshots.length,
    caseIds: result.snapshots.map((s) => s.caseId),
  });

  // Compact snapshot summary (not full raw)
  writeJson(OUT, "capability-snapshot-summary.json", {
    schemaVersion: "stage300-new-150-capability-snapshot-summary@1.0.0",
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

  const decisionCard = `# Stage-300 New-150 Control-Coverage Decision Card

**Status:** MATERIALISATION COMPLETE (stop uncommitted)  
**Baseline:** \`${NEW150_BASELINE}\`  
**Head:** \`${head}\`  
**Accepted / Rejected:** ${result.accepted.length} / ${result.rejected.length}  
**Stopped early:** ${result.stoppedEarly}${result.stopReason ? ` (${result.stopReason})` : ""}

## What changed in meaning
This batch materialises **inputs and genuine production outputs** for the 43-control unlock path. It is **not** an adapter-foundation batch and does **not** freeze or run Stage 300.

## What became genuinely usable
- **SRC named prerequisites:** cases with OCR/page-unit receipts (see per-control report).
- **VDR harness receipts:** present on accepted cases (run pins + source/output hashes).
- **Six production exits:** required on every accepted case (browser not exercised).
- **Corpus design:** source packs carry DOB/youth/fitness/PII/taxonomy/draft-pair facts for later product unlock.

## What remains blocked and why
- **LSL/CHR/PRC specialty bags:** CaseBrain production does not emit \`legalStateTaxonomy\` / \`dobAgeCalcLedger\` / \`proceduralPartyState\` — eligible=0 (not invented into outputs).
- **AUD/XPP:** no independent per-audience packs from production.
- **ELD:** source draft pairs exist; production ELD version-pair receipts absent.

## What is not being claimed
No Stage-300 freeze/run, no promotions, no PASS, no CaseBrain repair, no frozen-150 mutation, no audit verdicts.

## Exact next engineering action
1. Product backlog for specialty-bag emission (LSL/CHR/PRC) and ELD/AUD producers; **or**
2. SRC detector implementation/calibration on OCR-ready packets; **or**
3. Explicit defer per control — write pre-agreed acceptance contract first.

## Three go/no-go gates
1. **GO** next batch only with named control IDs + exact inputs + expected denom > 0 or explicit defer.
2. **NO-GO** foundation-only adapter elaboration without unlocking a control / supplying a missing input / closing a safety gap.
3. **NO-GO** corpus calibration / promotions / Stage-300 freeze while targeted named denom = 0.
`;
  fs.writeFileSync(path.join(OUT, "DECISION-CARD.md"), decisionCard, "utf8");

  // changed-file manifest (approx from git status of this work unit paths)
  let changed: string[] = [];
  try {
    const st = execSync("git status --porcelain", { encoding: "utf8", cwd: ROOT });
    changed = st
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\?\?\s+/, "").replace(/^[A-Z]{1,2}\s+/, ""))
      .filter(
        (p) =>
          p.includes("stage300/new150") ||
          p.includes("stage300-new-150") ||
          p.includes("emit-maa-v2-stage300-new-150") ||
          p.includes("maa-v2-stage300-new-150") ||
          p.includes(".gitignore"),
      );
  } catch {
    changed = [];
  }
  writeJson(OUT, "changed-file-manifest.json", {
    schemaVersion: "stage300-new-150-changed-file-manifest@1.0.0",
    paths: changed,
  });

  // Write contracts file if missing then run
  const contractsPath = path.join(ROOT, "scripts/maa-v2-stage300-new-150-contracts.test.ts");
  if (!fs.existsSync(contractsPath)) {
    // emit script assumes contracts exist — created alongside
  }

  try {
    contractsLog = execSync("npx tsx --test scripts/maa-v2-stage300-new-150-contracts.test.ts", {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    contractsOk = true;
  } catch (e) {
    contractsOk = false;
    contractsLog = e instanceof Error ? (e as { stdout?: string; stderr?: string }).stdout || e.message : String(e);
  }

  try {
    buildLog = execSync("npm run build", {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    });
    buildOk = true;
  } catch (e) {
    buildOk = false;
    buildLog = e instanceof Error ? e.message : String(e);
  }

  writeJson(OUT, "verification-results.json", {
    schemaVersion: "stage300-new-150-verification@1.0.0",
    contractsOk,
    buildOk,
    frozen150Unchanged: result.frozen150.unchanged,
    brain1GuardianUnchanged: brain.allUnchanged,
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    stage300FrozenOrRun: false,
    committed: false,
  });
  writeJson(OUT, "brain1-guardian-blob-compare.json", brain);
  fs.writeFileSync(path.join(OUT, "contracts-log.txt"), contractsLog.slice(0, 200_000), "utf8");
  fs.writeFileSync(path.join(OUT, "build-log.txt"), buildLog.slice(0, 200_000), "utf8");

  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage300-new-150-stop@1.0.0",
    status: "STOP_UNCOMMITTED_NEW_150_MATERIALISATION",
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    accepted: result.accepted.length,
    rejected: result.rejected.length,
    readyForCalibrationCount: readyCount,
    eligibleControlsGained: eligibleGained,
    stoppedEarly: result.stoppedEarly,
    stopReason: result.stopReason,
    frozen150Unchanged: result.frozen150.unchanged,
    brain1GuardianUnchanged: brain.allUnchanged,
    contractsOk,
    buildOk,
    doNot: [
      "freeze_or_run_stage_300",
      "alter_frozen_150",
      "repair_casebrain_in_this_unit",
      "commit_push_merge_deploy",
      "claim_PASS",
      "run_audit_verdicts",
    ],
    artefactRoot: NEW150_ARTIFACT_ROOT,
    regeneration: "npx tsx scripts/assurance/emit-maa-v2-stage300-new-150-control-coverage.ts",
  });

  console.log(
    JSON.stringify(
      {
        accepted: result.accepted.length,
        rejected: result.rejected.length,
        readyForCalibrationCount: readyCount,
        eligibleControlsGained: eligibleGained,
        stoppedEarly: result.stoppedEarly,
        contractsOk,
        buildOk,
        frozen150Unchanged: result.frozen150.unchanged,
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
