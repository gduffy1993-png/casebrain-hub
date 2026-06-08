#!/usr/bin/env npx tsx
/**
 * Corpus-wide playback report (pilot-mode product path).
 *
 * Full:
 *   $env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
 *   npx tsx scripts/casebrain-auditor-playback.ts --corpus real --max 1000 --chunk-size 50 --user-role pilot-non-admin
 *
 * Canary (fast):
 *   npx tsx scripts/casebrain-auditor-playback.ts --corpus real --canary --user-role pilot-non-admin
 *
 * Replay checks only (frozen JSON):
 *   npx tsx scripts/casebrain-auditor-playback.ts --replay-latest --user-role pilot-non-admin
 *
 * Build canary pack from latest full run:
 *   npx tsx scripts/casebrain-auditor-playback.ts --build-canary-pack
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildCanaryPackFromPlaybacks,
  runCanaryPlaybackLive,
  runCanaryReplayChecks,
  writeCanaryPack,
} from "@/lib/eval/casebrain-auditor/corpus-playback-canary";
import { runCorpusPlaybackChecks } from "@/lib/eval/casebrain-auditor/corpus-playback-checks";
import { loadPlaybackSnapshots } from "@/lib/eval/casebrain-auditor/corpus-playback-replay";
import { runCorpusPlaybackScan } from "@/lib/eval/casebrain-auditor/corpus-playback-run";
import { runReplayLatestChecks } from "@/lib/eval/casebrain-auditor/corpus-playback-replay";

function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadLocalEnv();
  const orgId = process.env.EVAL_ORG_ID?.trim();
  if (!orgId) {
    console.error("EVAL_ORG_ID required in .env.local");
    process.exit(2);
  }

  let maxCases = 1000;
  let chunkSize = 50;
  let outDir = path.join(process.cwd(), "artifacts", "casebrain-auditor");
  let userRole = "pilot-non-admin" as const;
  let canary = false;
  let replayLatest = false;
  let buildCanaryPack = false;
  let canaryReplay = false;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--max" && process.argv[i + 1]) maxCases = Number(process.argv[++i]);
    else if (arg === "--chunk-size" && process.argv[i + 1]) chunkSize = Number(process.argv[++i]);
    else if (arg === "--out" && process.argv[i + 1]) outDir = path.resolve(process.argv[++i]!);
    else if (arg === "--user-role" && process.argv[i + 1]) userRole = process.argv[++i] as typeof userRole;
    else if (arg === "--canary") canary = true;
    else if (arg === "--canary-replay") canaryReplay = true;
    else if (arg === "--replay-latest") replayLatest = true;
    else if (arg === "--build-canary-pack") buildCanaryPack = true;
    else if (arg === "--corpus" && process.argv[i + 1]) {
      if (process.argv[++i] !== "real") {
        console.error("Only --corpus real is supported");
        process.exit(2);
      }
    }
  }

  process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ??= "true";

  if (buildCanaryPack) {
    const casesDir = path.join(outDir, "latest", "corpus-playback", "cases");
    const snapshots = loadPlaybackSnapshots(casesDir);
    const withChecks = snapshots.map((s) => ({ ...s, findings: runCorpusPlaybackChecks(s) }));
    const summaryPath = path.join(outDir, "latest", "corpus-playback", "playback-summary.json");
    let sourceAt: string | null = null;
    if (fs.existsSync(summaryPath)) {
      try {
        sourceAt = (JSON.parse(fs.readFileSync(summaryPath, "utf8")) as { generatedAt?: string }).generatedAt ?? null;
      } catch {
        sourceAt = null;
      }
    }
    const pack = buildCanaryPackFromPlaybacks(withChecks, sourceAt);
    const written = writeCanaryPack(outDir, pack);
    console.log(`Canary pack: ${pack.caseIds.length} cases → ${written}`);
    return;
  }

  if (replayLatest) {
    const { outDir: written } = runReplayLatestChecks({ artifactRoot: outDir, orgId });
    console.log(`Done: ${written}`);
    return;
  }

  if (canaryReplay) {
    const { outDir: written } = runCanaryReplayChecks({ artifactRoot: outDir, orgId });
    console.log(`Done: ${written}`);
    return;
  }

  if (canary) {
    const { outDir: written } = await runCanaryPlaybackLive({
      artifactRoot: outDir,
      orgId,
      userRole,
    });
    console.log(`Done: ${written}`);
    return;
  }

  const { outDir: written } = await runCorpusPlaybackScan({
    outDir,
    orgId,
    maxCases,
    chunkSize,
    userRole,
  });

  const casesDir = path.join(written, "cases");
  const snapshots = loadPlaybackSnapshots(casesDir);
  const pack = buildCanaryPackFromPlaybacks(
    snapshots.map((s) => ({ ...s, findings: runCorpusPlaybackChecks(s) })),
    null,
  );
  writeCanaryPack(outDir, pack);
  console.log(`Canary pack updated: ${pack.caseIds.length} cases`);
  console.log(`Done: ${written}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
