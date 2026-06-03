/**
 * Overnight production pass (read-only). Writes gitignored artifacts only.
 *
 *   npx tsx scripts/casebrain-auditor-overnight.ts production-pass
 */
import fs from "node:fs";
import path from "node:path";
import { runProductionDeepPassArtifacts } from "@/lib/eval/casebrain-auditor/production-deep-pass";

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
  const cmd = process.argv[2] ?? "production-pass";
  if (cmd !== "production-pass") {
    console.error("Usage: npx tsx scripts/casebrain-auditor-overnight.ts production-pass");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "artifacts", "casebrain-auditor", "latest", "production-deep-pass");
  const result = await runProductionDeepPassArtifacts(outDir, {
    userRole: "pilot-non-admin",
    maxCases: 1000,
  });

  console.log("Production deep pass:", outDir);
  console.log(`Production A+B: ${result.productionCount} cases`);
  console.log(`Unknown/generic: ${result.unknownGenericBefore} (investigation rows: ${result.investigations.length})`);
  for (const inv of result.investigations) {
    console.log(`  - ${inv.caseId}: ${inv.likelyCause}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
