#!/usr/bin/env npx tsx
/**
 * Real-layout PDF/OCR stress lane — slice 1.
 *
 *   npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 5 --canary
 *   npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 25
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
  if (!Number.isFinite(count) || count < 1 || count > 25) {
    console.error("Invalid --count (slice 1 max 25)");
    process.exit(1);
  }
  return { count, canary };
}

async function main(): Promise<void> {
  const { count, canary } = parseArgs();

  console.log("");
  console.log("Real-layout PDF/OCR stress (slice 1):");
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
  console.log("");
  console.log("Top fingerprints:");
  for (const fp of summary.topFingerprints.slice(0, 8)) {
    console.log(`  ${fp.count}x  ${fp.fingerprint}`);
  }
  console.log("");
  console.log("Report:", outDir);
  console.log("");

  if (canary && summary.failed > summary.scored * 0.5) {
    console.error("Canary: failure rate > 50% — investigate before scaling to 25.");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
