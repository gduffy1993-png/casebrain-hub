#!/usr/bin/env npx tsx
/**
 * Ingest local PDFs into gitignored bundle-fidelity-local (text + drafted truth keys).
 *
 *   npx tsx scripts/bundle-fidelity-ingest-local-pdfs.ts
 */
import { ingestLocalPdf } from "@/lib/eval/casebrain-auditor/bundle-fidelity-ingest";
import { localCasesRoot } from "@/lib/eval/casebrain-auditor/bundle-fidelity-local";

const PDFS: Array<{ bundleId: string; path: string }> = [
  {
    bundleId: "local-001-dangerous-driving",
    path: String.raw`C:\Users\gduff\OneDrive\Documents\New folder\pdf y\CB-40X40-DVR-0009_dangerous_driving_40_pages.pdf`,
  },
  {
    bundleId: "local-002-fraud",
    path: String.raw`C:\Users\gduff\OneDrive\Documents\New folder\pdf y\CB-40X40-FRD-0005_fraud_40_pages.pdf`,
  },
  {
    bundleId: "local-003-pwits",
    path: String.raw`C:\Users\gduff\OneDrive\Documents\New folder\pdf y\CB-40X40-PWI-0004_pwits_40_pages.pdf`,
  },
  {
    bundleId: "local-004-gbh-s18",
    path: String.raw`C:\Users\gduff\OneDrive\Documents\New folder\pdf y\CB-40X40-GBH-0002_gbh_s.18_40_pages.pdf`,
  },
  {
    bundleId: "local-005-motoring-messy",
    path: String.raw`C:\Users\gduff\OneDrive\Documents\New folder\aa pdfs z\CB-AA-MESSY-0021_Dangerous_driving_messy_bundle.pdf`,
  },
];

async function main(): Promise<void> {
  console.log("Local cases root:", localCasesRoot());
  console.log("WARNING: Do not commit artifacts/bundle-fidelity-local/ or PDFs.\n");

  const results = [];
  for (const item of PDFS) {
    console.log("Ingesting", item.bundleId, "...");
    const r = await ingestLocalPdf({ pdfPath: item.path, bundleId: item.bundleId });
    results.push(r);
    console.log(
      r.extractOk ? "  extract OK" : `  extract FAIL: ${r.extractError}`,
      `| chars in truth draft: ${r.truthKey.extractionChars}`,
    );
    if (r.truthKey.fieldsNeedingConfirmation.length) {
      console.log("  confirm:", r.truthKey.fieldsNeedingConfirmation.join(", "));
    }
  }

  console.log("\nDone. Run: npx tsx scripts/bundle-fidelity.ts --pack local\n");
  const failed = results.filter((r) => !r.extractOk);
  if (failed.length) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
