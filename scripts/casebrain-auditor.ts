#!/usr/bin/env npx tsx
/**
 * CaseBrain Auditor — separate from Next.js dev server.
 *
 *   $env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
 *   npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
 *   npx tsx scripts/casebrain-auditor.ts --pack family-40 --user-role pilot-non-admin
 *   npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --limit 50
 */
import path from "node:path";
import {
  runAuditor,
  shouldExitNonZero,
  type AuditorFamilyProfile,
  type AuditorMode,
  type AuditorPackId,
  type UserRoleMode,
} from "@/lib/eval/casebrain-auditor";
import { PILOT_DEMO_USER_ID } from "@/lib/eval/casebrain-auditor/truth-manifests";

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
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/casebrain-auditor.ts [options]

Options:
  --pack <id>           pilot-3 | family-40 | full-960 | …
  --mode <mode>         standard | discovery (required for full-960)
  --user-role <role>    pilot-non-admin | admin | normal
  --family <profile>    fraud_account_control | pwits_phone_attribution | robbery_identification | violence_domestic_assault
  --limit <n>           Cap cases scanned (discovery / family-40)
  --offset <n>          Skip first n cases
  --strict              Exit 1 on RED release gate
  --fail-on-medium      Exit 1 on MEDIUM severity
  --include-synthetic   Treat synthetic-surface failures as blocking
  --out <dir>           Output directory
  --baseline <json>     Compare to previous results.json
  --base-url <url>      Reserved for future DOM checks
  --export-training-data  Write training-data.jsonl (local artifact; never commit)

Does not start npm run dev or manage environment variables.
`);
      process.exit(0);
    }
  }

  if (pack === "full-960") mode = "discovery";
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
  };
}

async function main() {
  const opts = parseArgs(process.argv);
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
  });

  if (opts.jsonOnly) console.log(path.join(opts.outDir, "results.json"));

  process.exit(shouldExitNonZero(result.summary, opts) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
