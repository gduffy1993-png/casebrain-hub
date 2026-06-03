#!/usr/bin/env npx tsx
/**
 * Corpus-wide playback report (pilot-mode product path).
 *
 *   $env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
 *   npx tsx scripts/casebrain-auditor-playback.ts --corpus real --max 1000 --chunk-size 50 --user-role pilot-non-admin
 */
import fs from "node:fs";
import path from "node:path";
import { runCorpusPlaybackScan } from "@/lib/eval/casebrain-auditor/corpus-playback-run";

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

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--max" && process.argv[i + 1]) maxCases = Number(process.argv[++i]);
    else if (arg === "--chunk-size" && process.argv[i + 1]) chunkSize = Number(process.argv[++i]);
    else if (arg === "--out" && process.argv[i + 1]) outDir = path.resolve(process.argv[++i]!);
    else if (arg === "--user-role" && process.argv[i + 1]) userRole = process.argv[++i] as typeof userRole;
    else if (arg === "--corpus" && process.argv[i + 1]) {
      if (process.argv[++i] !== "real") {
        console.error("Only --corpus real is supported");
        process.exit(2);
      }
    }
  }

  process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ??= "true";

  const { outDir: written } = await runCorpusPlaybackScan({
    outDir,
    orgId,
    maxCases,
    chunkSize,
    userRole,
  });

  console.log(`Done: ${written}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
