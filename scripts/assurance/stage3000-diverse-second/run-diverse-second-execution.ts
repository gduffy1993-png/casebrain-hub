/**
 * Freeze ordered 3000 membership + run coordinated diverse-second execution waves.
 * Uses bound V2.1.4.4 generator port + ParallelCorpusController.
 *
 * Usage:
 *   node --import tsx scripts/assurance/stage3000-diverse-second/run-diverse-second-execution.ts [--resume] [--workers=2]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

import {
  ParallelCorpusController,
  bindAcceptedGeneratorPort,
  createDiverseV2144GeneratorPort,
  DIVERSE_V2144_GENERATOR_VERSION_PIN,
  TARGET_POPULATION_SIZE,
} from "../../../lib/eval/stage3000-parallel-controller";

const ROOT = process.cwd();
const POPULATION_ID = "diverse-second-3000-execution-v1";
const ARTEFACTS = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution",
);
const CONTRACT = path.join(ARTEFACTS, "LOCKED-ACCEPTANCE-CONTRACT.json");
const RESUME = process.argv.includes("--resume");
const workersArg = process.argv.find((a) => a.startsWith("--workers="));
const requestedWorkers = workersArg ? Number(workersArg.split("=")[1]) : 4;

function freeGiB(): number {
  try {
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", "(Get-PSDrive C).Free"],
      { encoding: "utf8" },
    ).trim();
    return Number(out) / 1024 ** 3;
  } catch {
    return 0;
  }
}

function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  if (!fs.existsSync(CONTRACT)) {
    throw new Error(`missing locked acceptance contract: ${CONTRACT}`);
  }
  const free = freeGiB();
  const diskGate = {
    freeGiB: Number(free.toFixed(2)),
    minimumRecommendedGiB: 8,
    hardStopBelowGiB: 1.5,
  };
  writeJson(path.join(ARTEFACTS, "disk-safety-receipt.json"), {
    ...diskGate,
    checkedAt: new Date().toISOString(),
  });
  if (free < diskGate.hardStopBelowGiB) {
    writeJson(path.join(ARTEFACTS, "STOP-EARLY-INSUFFICIENT-DISK.json"), {
      stopped: true,
      reason: "insufficient_disk_space_risks_evidence_corruption",
      ...diskGate,
    });
    throw new Error(
      `STOP EARLY: free disk ${free.toFixed(1)} GiB < hard floor ${diskGate.hardStopBelowGiB} GiB`,
    );
  }

  const workers = Math.max(
    1,
    Math.min(4, requestedWorkers, free < 4 ? 2 : free < 6 ? 3 : 4),
  );
  writeJson(path.join(ARTEFACTS, "adaptive-concurrency.json"), {
    requestedWorkers,
    effectiveWorkers: workers,
    freeGiB: diskGate.freeGiB,
    cpus: os.cpus().length,
    note: "Four workers is the maximum; reduced under memory/disk pressure.",
  });

  const generator = bindAcceptedGeneratorPort(createDiverseV2144GeneratorPort(ROOT));
  const controller = new ParallelCorpusController({
    populationId: POPULATION_ID,
    artefactsRoot: path.join(ARTEFACTS, "controller-run"),
    generator,
    generatorVersionPin: DIVERSE_V2144_GENERATOR_VERSION_PIN,
  });

  writeJson(path.join(ARTEFACTS, "run-manifest.json"), {
    populationId: POPULATION_ID,
    targetSize: TARGET_POPULATION_SIZE,
    generatorVersionPin: DIVERSE_V2144_GENERATOR_VERSION_PIN,
    resume: RESUME,
    workers,
    startedAt: new Date().toISOString(),
    contractPath: "LOCKED-ACCEPTANCE-CONTRACT.json",
  });

  const result = await controller.runAll();
  const frozenState = controller.freezeIfComplete();
  writeJson(path.join(ARTEFACTS, "controller-result.json"), {
    finishedAt: new Date().toISOString(),
    resumeRequested: RESUME,
    acceptedCount: frozenState.membership.acceptedCount,
    membershipSha256: frozenState.membership.membershipSha256,
    frozen: frozenState.membership.frozen,
  });

  writeJson(path.join(ARTEFACTS, "ordered-3000-membership.json"), frozenState.membership);
  writeJson(path.join(ARTEFACTS, "ordered-3000-membership-hash.json"), {
    membershipSha256: frozenState.membership.membershipSha256,
    acceptedCount: frozenState.membership.acceptedCount,
    frozen: frozenState.membership.frozen,
    frozenAt: new Date().toISOString(),
  });

  const reconciliation = controller.reconcile();
  writeJson(path.join(ARTEFACTS, "population-reconciliation.json"), reconciliation);

  console.log(
    JSON.stringify(
      {
        ok: true,
        populationId: POPULATION_ID,
        workers,
        freeGiB: diskGate.freeGiB,
        resultSummary: {
          acceptedCount: frozenState.membership.acceptedCount,
          membershipSha256: frozenState.membership.membershipSha256,
          frozen: frozenState.membership.frozen,
          reconciliationVerdict: reconciliation.verdict,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
