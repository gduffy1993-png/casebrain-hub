#!/usr/bin/env npx tsx
/**
 * Real-layout PDF/OCR stress lane — slice 2.
 *
 *   npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 5 --canary
 *   npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 25
 *   npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 50
 */
import { runRealLayoutPdfOcrStress } from "@/lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-run";
import { writeRealLayoutStressReport } from "@/lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-report";
import { realLayoutStressCacheRoot, realLayoutStressReportDir } from "@/lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-paths";

function parseArgs(): { count: number; canary: boolean } {
  const argv = process.argv.slice(2);
  let count = 25;
  let canary = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]!, 10);
    if (argv[i] === "--canary") canary = true;
  }
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    console.error("Invalid --count (slice 2 max 50)");
    process.exit(1);
  }
  return { count, canary };
}

async function main(): Promise<void> {
  const { count, canary } = parseArgs();

  console.log("");
  console.log("Real-layout PDF/OCR stress (slice 2):");
  console.log(`  Count: ${count}${canary ? " | CANARY" : ""}`);
  console.log(`  Cache (gitignored): ${realLayoutStressCacheRoot()}`);
  console.log(`  Report: ${realLayoutStressReportDir()}`);
  console.log("  WARNING: Fictional PDFs only — do not commit artifacts/");
  console.log("");

  const summary = await runRealLayoutPdfOcrStress({ count, canary });
  const outDir = writeRealLayoutStressReport(summary);

  console.log(`Scored: ${summary.scored}`);
  console.log(`  Pass: ${summary.passed}`);
  console.log(`  Weak: ${summary.weak}`);
  console.log(`  Fail: ${summary.failed}`);
  console.log(
    `  Extract chars: min ${summary.extractCharDistribution.min} / median ${summary.extractCharDistribution.median} / max ${summary.extractCharDistribution.max}`,
  );
  console.log("");
  console.log("Top fingerprints:");
  for (const fp of summary.topFingerprints.slice(0, 10)) {
    console.log(`  ${fp.count}x  ${fp.fingerprint}`);
  }
  if (summary.deliberateTraps.length) {
    console.log("");
    console.log("Deliberate traps:");
    for (const t of summary.deliberateTraps) {
      console.log(
        `  ${t.sampleId} (${t.tier}): ${t.overall} | matched=${t.trapMatched} | actual=[${t.actualFingerprints.join(", ")}]`,
      );
    }
  }
  console.log("");
  console.log("Report:", outDir);
  console.log("");

  if (canary && summary.failed > summary.scored * 0.5) {
    console.error("Canary: failure rate > 50% — investigate shared fingerprints.");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
