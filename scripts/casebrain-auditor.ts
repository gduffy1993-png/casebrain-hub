#!/usr/bin/env npx tsx
/**
 * CaseBrain Auditor — separate from Next.js dev server.
 *
 * Developer workflow:
 *   cd C:\Users\gduff\casebrain-hub
 *   $env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
 *   npm run dev
 *
 * Auditor (same shell env recommended for pilot UI flag checks):
 *   npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
 *
 * Does NOT start Next.js, spawn dev, or manage env beyond reading process.env.
 */
import path from "node:path";
import { runAuditor, shouldExitNonZero, type AuditorPackId, type UserRoleMode } from "@/lib/eval/casebrain-auditor";
import { PILOT_DEMO_USER_ID } from "@/lib/eval/casebrain-auditor/truth-manifests";

function parseArgs(argv: string[]) {
  let pack: AuditorPackId = "pilot-3";
  let strict = false;
  let failOnMedium = false;
  let includeSynthetic = false;
  let jsonOnly = false;
  let outDir = path.join(process.cwd(), "artifacts", "casebrain-auditor");
  let userRole: UserRoleMode = "pilot-non-admin";
  let baselinePath: string | undefined;
  let baseUrl: string | undefined;
  let pilotUserId = PILOT_DEMO_USER_ID;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--strict") strict = true;
    else if (arg === "--fail-on-medium") failOnMedium = true;
    else if (arg === "--include-synthetic") includeSynthetic = true;
    else if (arg === "--json") jsonOnly = true;
    else if (arg === "--pack" && argv[i + 1]) pack = argv[++i] as AuditorPackId;
    else if (arg === "--out" && argv[i + 1]) outDir = path.resolve(argv[++i]!);
    else if (arg === "--baseline" && argv[i + 1]) baselinePath = path.resolve(argv[++i]!);
    else if (arg === "--user-role" && argv[i + 1]) userRole = argv[++i] as UserRoleMode;
    else if (arg === "--base-url" && argv[i + 1]) baseUrl = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/casebrain-auditor.ts --pack pilot-3 [options]

Options:
  --pack <id>                 pilot-3 (active) | family-40 | profile-clash | …
  --user-role <role>          pilot-non-admin | admin | normal
  --strict                    Exit 1 on any non-GREEN gate
  --fail-on-medium            Exit 1 on MEDIUM severity
  --include-synthetic         Treat synthetic-surface failures as blocking
  --out <dir>                 Output directory
  --baseline <results.json>   Compare to previous run
  --base-url <url>            Reserved for future DOM checks (not used in MVP)
  --json                      Print results.json path after run

Does not start npm run dev or manage environment variables.
Set NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true in your shell for pilot UI flag checks.
`);
      process.exit(0);
    }
  }

  if (baseUrl) {
    console.warn(`Note: --base-url ${baseUrl} is reserved for future DOM checks; MVP uses live-builder only.`);
  }

  return { pack, strict, failOnMedium, includeSynthetic, jsonOnly, outDir, userRole, baselinePath, pilotUserId, baseUrl };
}

async function main() {
  const opts = parseArgs(process.argv);
  const result = await runAuditor({
    pack: opts.pack,
    strict: opts.strict,
    failOnMedium: opts.failOnMedium,
    includeSynthetic: opts.includeSynthetic,
    outDir: opts.outDir,
    userRole: opts.userRole,
    pilotUserId: opts.pilotUserId,
    baselinePath: opts.baselinePath,
    baseUrl: opts.baseUrl,
  });

  if (opts.jsonOnly) console.log(path.join(opts.outDir, "results.json"));

  process.exit(shouldExitNonZero(result.summary, opts) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
