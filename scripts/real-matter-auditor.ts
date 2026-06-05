#!/usr/bin/env npx tsx
/**
 * Real-matter Auditor Lane — slice 1.
 *
 *   npx tsx scripts/real-matter-auditor.ts --list-local
 *   npx tsx scripts/real-matter-auditor.ts --pack local --discovery
 *   npx tsx scripts/real-matter-auditor.ts --pack local --case rm-001-motoring-thin
 *   npx tsx scripts/real-matter-auditor.ts --pack local --strict-truth
 */
import { listLocalRealMatters } from "@/lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-load";
import {
  localRealMattersRoot,
  realMatterAuditorReportDir,
} from "@/lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-paths";
import { runAndWriteRealMatterAuditor } from "@/lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-run";

function parseArgs(): {
  listLocal: boolean;
  pack: "local" | null;
  mode: "discovery" | "strict-truth";
  caseId?: string;
  limit?: number;
  offset?: number;
  includeHoldout: boolean;
} {
  const argv = process.argv.slice(2);
  let listLocal = false;
  let pack: "local" | null = null;
  let mode: "discovery" | "strict-truth" = "discovery";
  let caseId: string | undefined;
  let limit: number | undefined;
  let offset: number | undefined;
  let includeHoldout = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--list-local") listLocal = true;
    if (argv[i] === "--pack" && argv[i + 1] === "local") pack = "local";
    if (argv[i] === "--discovery") mode = "discovery";
    if (argv[i] === "--strict-truth") mode = "strict-truth";
    if (argv[i] === "--include-holdout") includeHoldout = true;
    if (argv[i] === "--case" && argv[i + 1]) caseId = argv[++i];
    if (argv[i] === "--limit" && argv[i + 1]) limit = parseInt(argv[++i]!, 10);
    if (argv[i] === "--offset" && argv[i + 1]) offset = parseInt(argv[++i]!, 10);
  }

  return { listLocal, pack, mode, caseId, limit, offset, includeHoldout };
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.listLocal) {
    const matters = listLocalRealMatters();
    console.log("");
    console.log("Local real matters (gitignored):");
    console.log(`  Root: ${localRealMattersRoot()}`);
    console.log(`  Count: ${matters.length}`);
    for (const m of matters) {
      console.log(
        `  ${m.localId} | holdout=${m.holdout} | ${m.inputType} | text=${m.hasBundleText} pdf=${m.hasBundlePdf} truth=${m.hasHumanTruth}`,
      );
    }
    console.log("");
    process.exit(0);
  }

  if (args.pack !== "local") {
    console.error("Usage: --list-local OR --pack local [--discovery|--strict-truth] [--case <localId>]");
    process.exit(1);
  }

  console.log("");
  console.log("Real-matter auditor (slice 1):");
  console.log(`  Pack: local (disk matters under local-real-matters/ only)`);
  console.log(`  Mode: ${args.mode}`);
  console.log(`  Local root: ${localRealMattersRoot()}`);
  console.log(`  Report: ${realMatterAuditorReportDir()}`);
  console.log("  WARNING: Do not commit artifacts/ or client material.");
  console.log("");

  const { summary, reportDir } = await runAndWriteRealMatterAuditor({
    pack: "local",
    mode: args.mode,
    caseId: args.caseId,
    limit: args.limit,
    offset: args.offset,
    includeHoldout: args.includeHoldout,
  });

  console.log(`Matters listed: ${summary.matterCount}`);
  console.log(`Scored: ${summary.scored} | Holdout skipped: ${summary.skippedHoldout}`);
  console.log(`  Pass: ${summary.passed}`);
  console.log(`  Weak: ${summary.weak}`);
  console.log(`  Fail: ${summary.failed}`);
  console.log(`  Needs review: ${summary.needsReview}`);
  console.log("");
  console.log("Top fingerprints:");
  for (const fp of summary.topFingerprints.slice(0, 10)) {
    console.log(`  ${fp.count}x  ${fp.fingerprint}`);
  }
  console.log("");
  console.log("Report:", reportDir);
  console.log("");

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
