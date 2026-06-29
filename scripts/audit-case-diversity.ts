#!/usr/bin/env npx tsx
/**
 * Diversity / duplicate check for controlled evidence-state audit cases.
 * Run: npx tsx scripts/audit-case-diversity.ts
 */
import path from "node:path";

import { buildDiversityReport } from "../lib/eval/evidence-state-audit/diversity";

const casesRoot = path.join(process.cwd(), "artifacts", "evidence-state-audit-local", "cases");
const report = buildDiversityReport(casesRoot);

console.log(report.disclaimer);
console.log(`Cases scanned: ${report.caseCount}`);
console.log(`Duplicates/near-duplicates: ${report.duplicates.length}`);
console.log(`Banned phrase hits: ${report.bannedPhraseHits.length}`);

if (report.duplicates.length) {
  console.log("\nDuplicate candidates:");
  for (const d of report.duplicates.slice(0, 30)) {
    console.log(`  [${d.severity}] ${d.caseA} ↔ ${d.caseB}: ${d.reason}`);
  }
}

if (report.bannedPhraseHits.length) {
  console.log("\nBanned phrase hits:");
  for (const h of report.bannedPhraseHits.slice(0, 20)) {
    console.log(`  ${h.caseId} (${h.surface}): "${h.phrase}"`);
  }
}

console.log("\nOffence family spread:", JSON.stringify(report.offenceFamilySpread, null, 0));
console.log("Trap spread (top):", Object.entries(report.trapSpread).sort((a, b) => b[1] - a[1]).slice(0, 12));
console.log("Layout spread (top):", Object.entries(report.layoutSpread).sort((a, b) => b[1] - a[1]).slice(0, 12));

if (report.topRepeatedChaseLabels.length) {
  console.log("\nTop repeated chase labels:");
  for (const row of report.topRepeatedChaseLabels) {
    console.log(`  ${row.count}× ${row.label}`);
  }
}

if (report.duplicates.some((d) => d.severity === "blocking") || report.bannedPhraseHits.length) {
  process.exitCode = 1;
}
