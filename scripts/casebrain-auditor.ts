#!/usr/bin/env npx tsx
/**
 * CaseBrain Auditor — separate from Next.js dev server.
 *
 *   $env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
 *   npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
 *   npx tsx scripts/casebrain-auditor.ts --pack family-40 --user-role pilot-non-admin
 *   npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --limit 50
 *   npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --corpus real --limit 50
 */
import fs from "node:fs";
import path from "node:path";
import {
  runAuditor,
  shouldExitNonZero,
  type AuditorFamilyProfile,
  type AuditorCorpus,
  type AuditorMode,
  type AuditorPackId,
  type UserRoleMode,
} from "@/lib/eval/casebrain-auditor";
import { PILOT_DEMO_USER_ID } from "@/lib/eval/casebrain-auditor/truth-manifests";

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

function parseArgs(argv: string[]) {
  let pack: AuditorPackId = "pilot-3";
  let mode: AuditorMode = "standard";
  let strict = false;
  let failOnMedium = false;
  let includeSynthetic = false;
  let jsonOnly = false;
  let outDir = path.join(process.cwd(), "artifacts", "casebrain-auditor");
  let userRole: UserRoleMode = "pilot-non-admin";
  let baselinePath: string | undefined;
  let baseUrl: string | undefined;
  let pilotUserId = PILOT_DEMO_USER_ID;
  let limit: number | undefined;
  let offset = 0;
  let familyFilter: AuditorFamilyProfile | undefined;
  let exportTrainingData = false;
  let corpus: AuditorCorpus = "fictional";
  let exportCaseList = false;
  let batch = false;
  let batchChunkSize = 50;
  let batchMaxCases = 1000;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--strict") strict = true;
    else if (arg === "--fail-on-medium") failOnMedium = true;
    else if (arg === "--include-synthetic") includeSynthetic = true;
    else if (arg === "--json") jsonOnly = true;
    else if (arg === "--pack" && argv[i + 1]) pack = argv[++i] as AuditorPackId;
    else if (arg === "--mode" && argv[i + 1]) mode = argv[++i] as AuditorMode;
    else if (arg === "--out" && argv[i + 1]) outDir = path.resolve(argv[++i]!);
    else if (arg === "--baseline" && argv[i + 1]) baselinePath = path.resolve(argv[++i]!);
    else if (arg === "--user-role" && argv[i + 1]) userRole = argv[++i] as UserRoleMode;
    else if (arg === "--base-url" && argv[i + 1]) baseUrl = argv[++i];
    else if (arg === "--limit" && argv[i + 1]) limit = Number(argv[++i]);
    else if (arg === "--offset" && argv[i + 1]) offset = Number(argv[++i]);
    else if (arg === "--family" && argv[i + 1]) familyFilter = argv[++i] as AuditorFamilyProfile;
    else if (arg === "--export-training-data") exportTrainingData = true;
    else if (arg === "--corpus" && argv[i + 1]) corpus = argv[++i] as typeof corpus;
    else if (arg === "--export-case-list") exportCaseList = true;
    else if (arg === "--batch") batch = true;
    else if (arg === "--chunk-size" && argv[i + 1]) batchChunkSize = Number(argv[++i]);
    else if (arg === "--max" && argv[i + 1]) batchMaxCases = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/casebrain-auditor.ts [options]

Options:
  --pack <id>           pilot-3 | family-40 | full-960 | …
  --mode <mode>         standard | discovery (required for full-960)
  --user-role <role>    pilot-non-admin | admin | normal
  --family <profile>    fraud_account_control | pwits_phone_attribution | robbery_identification | violence_domestic_assault
  --limit <n>           Cap cases scanned (discovery / family-40 / real corpus)
  --offset <n>          Skip first n cases
  --corpus <mode>       fictional | real (full-960 discovery; real requires EVAL_ORG_ID)
  --export-case-list    Include full-960-case-list.json in run output (real corpus)
  --batch               Run real full-960 discovery in chunks and write rollup (requires --corpus real)
  --chunk-size <n>      Cases per batch chunk (default 50)
  --max <n>             Max cases to scan in batch mode (default 1000)
  --strict              Exit 1 on RED release gate
  --fail-on-medium      Exit 1 on MEDIUM severity
  --include-synthetic   Treat synthetic-surface failures as blocking
  --out <dir>           Artifact root (default: artifacts/casebrain-auditor; writes runs/{runId} + latest/{pack})
  --baseline <json>     Compare to previous results.json
  --base-url <url>      Reserved for future DOM checks
  --export-training-data  Write training-data.jsonl (local artifact; never commit)

Does not start npm run dev or manage environment variables.
`);
      process.exit(0);
    }
  }

  if (pack === "full-960") mode = "discovery";
  if (batch) corpus = "real";
  if (baseUrl) {
    console.warn(`Note: --base-url ${baseUrl} reserved for future DOM checks; MVP uses live-builder only.`);
  }

  return {
    pack,
    mode,
    strict,
    failOnMedium,
    includeSynthetic,
    jsonOnly,
    outDir,
    userRole,
    baselinePath,
    pilotUserId,
    baseUrl,
    limit,
    offset,
    familyFilter,
    exportTrainingData,
    corpus,
    exportCaseList,
    batch,
    batchChunkSize,
    batchMaxCases,
  };
}

async function main() {
  loadLocalEnv();
  const opts = parseArgs(process.argv);

  if (opts.batch) {
    if (opts.pack !== "full-960") {
      console.error("--batch requires --pack full-960 --mode discovery (and --corpus real)");
      process.exit(2);
    }
    const { runReal960BatchDiscovery } = await import(
      "@/lib/eval/casebrain-auditor/real-960-batch-rollup"
    );
    const { result, rollupDir } = await runReal960BatchDiscovery({
      pack: opts.pack,
      mode: "discovery",
      strict: opts.strict,
      failOnMedium: opts.failOnMedium,
      includeSynthetic: opts.includeSynthetic,
      outDir: opts.outDir,
      userRole: opts.userRole,
      pilotUserId: opts.pilotUserId,
      corpus: "real",
      batch: true,
      batchChunkSize: opts.batchChunkSize,
      batchMaxCases: opts.batchMaxCases,
      writeLatest: false,
    });
    if (opts.jsonOnly) console.log(rollupDir);
    process.exit(shouldExitNonZero(result.summary, opts) ? 1 : 0);
  }

  const result = await runAuditor({
    pack: opts.pack,
    mode: opts.mode,
    strict: opts.strict,
    failOnMedium: opts.failOnMedium,
    includeSynthetic: opts.includeSynthetic,
    outDir: opts.outDir,
    userRole: opts.userRole,
    pilotUserId: opts.pilotUserId,
    baselinePath: opts.baselinePath,
    baseUrl: opts.baseUrl,
    limit: opts.limit,
    offset: opts.offset,
    familyFilter: opts.familyFilter,
    exportTrainingData: opts.exportTrainingData,
    corpus: opts.corpus,
    exportCaseList: opts.exportCaseList,
  });

  if (opts.jsonOnly) {
    const slug = opts.pack === "full-960" ? "full-960-discovery" : opts.pack;
    console.log(path.join(opts.outDir, "latest", slug, "results.json"));
  }

  process.exit(shouldExitNonZero(result.summary, opts) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
