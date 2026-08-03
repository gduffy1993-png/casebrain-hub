/**
 * Stage-3000 Parallel Corpus Controller — foundation CLI.
 *
 * Foundation only:
 *   - plan / status / reconcile-dry
 *   - does NOT generate a real 3000 population
 *   - does NOT freeze a real population
 *   - does NOT run CaseBrain
 *   - does NOT claim PASS
 *
 * Usage:
 *   npx tsx scripts/stage3000-parallel-controller/run-controller.ts plan --population demo --root <artefactsRoot>
 *   npx tsx scripts/stage3000-parallel-controller/run-controller.ts status --population demo --root <artefactsRoot>
 */

import fs from "node:fs";
import path from "node:path";

import {
  CONTROLLER_VERSION,
  TARGET_POPULATION_SIZE,
  WAVE_COUNT,
  SHARDS_PER_WAVE,
  CASES_PER_SHARD,
  CHECKPOINT_THRESHOLDS,
  GENERATOR_VERSION_PIN_UNBOUND,
  ParallelCorpusController,
  createUnboundGeneratorPort,
  buildShardOwnership,
  assertNonOverlappingOwnership,
  buildWorkspaceLayout,
  ensureWorkspaceLayout,
} from "@/lib/eval/stage3000-parallel-controller";

function usage(): never {
  console.log(`Stage-3000 Parallel Corpus Controller (foundation ${CONTROLLER_VERSION})

Commands:
  plan    --population <id> --root <artefactsRoot>
  status  --population <id> --root <artefactsRoot>
  doctor  --root <artefactsRoot>

Does not generate cases, freeze a real population, run CaseBrain, or claim PASS.
Generator port remains unbound until the accepted V2.1.2 generator is wired.
`);
  process.exit(2);
}

function argValue(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  if (i < 0 || i + 1 >= args.length) return null;
  return args[i + 1]!;
}

function main(): void {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || cmd === "-h" || cmd === "--help") usage();

  if (cmd === "doctor") {
    const root =
      argValue(args, "--root") ??
      path.join("artifacts", "stage3000-parallel-controller", "runs", "_doctor");
    const layout = buildWorkspaceLayout(root);
    ensureWorkspaceLayout(layout);
    const ownership = buildShardOwnership();
    assertNonOverlappingOwnership(ownership);
    console.log(
      JSON.stringify(
        {
          controllerVersion: CONTROLLER_VERSION,
          topology: {
            waves: WAVE_COUNT,
            shardsPerWave: SHARDS_PER_WAVE,
            casesPerShard: CASES_PER_SHARD,
            targetSize: TARGET_POPULATION_SIZE,
          },
          checkpoints: CHECKPOINT_THRESHOLDS,
          generatorPort: GENERATOR_VERSION_PIN_UNBOUND,
          ownershipShardKeys: ownership.map((o) => o.shardKey),
          workspace: layout.roles,
          note: "foundation doctor only — no population PASS",
        },
        null,
        2,
      ),
    );
    return;
  }

  const populationId = argValue(args, "--population");
  const root = argValue(args, "--root");
  if (!populationId || !root) usage();

  if (cmd === "plan") {
    const ctrl = new ParallelCorpusController({
      populationId,
      artefactsRoot: root,
      generator: createUnboundGeneratorPort(),
    });
    const state = ctrl.getState();
    const planPath = path.join(
      ctrl.layout.roles.control,
      "population-plan.json",
    );
    fs.writeFileSync(planPath, JSON.stringify(state.plan, null, 2), "utf8");
    console.log(
      JSON.stringify(
        {
          wrote: planPath,
          plan: state.plan,
          generatorBound: false,
          warning:
            "Generator unbound. Do not run real generation from this foundation CLI.",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (cmd === "status") {
    const ctrl = new ParallelCorpusController({
      populationId,
      artefactsRoot: root,
      generator: createUnboundGeneratorPort(),
    });
    const state = ctrl.getState();
    const reconciliation = ctrl.reconcile();
    console.log(
      JSON.stringify(
        {
          populationId: state.populationId,
          acceptedCount: state.membership.acceptedCount,
          membershipSha256: state.membership.membershipSha256,
          frozen: state.membership.frozen,
          receipts: state.receipts.length,
          checkpoints: state.checkpoints.map((c) => c.threshold),
          resumeToken: state.lastResumeToken,
          reconciliationVerdict: reconciliation.verdict,
          reconciliationReasons: reconciliation.reasons,
          note: "status/reconcile-dry only — not a PASS claim",
        },
        null,
        2,
      ),
    );
    return;
  }

  usage();
}

main();
