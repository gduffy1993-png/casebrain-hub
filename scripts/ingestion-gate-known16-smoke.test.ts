/**
 * Smoke the known healthy visual PDFs against Layer 0.
 * Fail only if a readable source is quarantined or parser diagnostics become text.
 *
 * Run: npx tsx scripts/ingestion-gate-known16-smoke.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import { extractTextAndMetaFromFileBuffer } from "../lib/upload/extract-text-from-file";
import { isParserDiagnosticPlaceholder } from "../lib/upload/ingestion-assessment";

const ROOT = path.join("artifacts", "casebrain-qa", "pr101-live-20-visual-pdf-review");
const OUT_DIR = path.join(
  "artifacts",
  "casebrain-qa",
  "assurance",
  "certified-claim-lineage-v1",
  "slice1-ingestion-gate-v1",
);

async function main() {
  const folders = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const results: Array<Record<string, unknown>> = [];

  for (const folder of folders) {
    const pdfPath = path.join(ROOT, folder, "source.pdf");
    if (!existsSync(pdfPath)) continue;
    const buffer = readFileSync(pdfPath);
    const meta = await extractTextAndMetaFromFileBuffer(`${folder}.pdf`, "application/pdf", buffer);
    const assessment = meta.ingestionAssessment;
    const diagnosticInText = isParserDiagnosticPlaceholder(meta.text);
    const readable = meta.text.trim().length >= 80;
    const withheld = !assessment.substantiveOutputsAllowed;
    results.push({
      folder,
      decision: assessment.decision,
      reasonCodes: assessment.reasonCodes,
      textLength: meta.text.trim().length,
      pageUnits: meta.pageUnits.length,
      withheld,
      diagnosticInText,
    });
    assert.equal(diagnosticInText, false, `${folder} stored parser diagnostic as source text`);
    if (readable) {
      assert.equal(
        withheld,
        false,
        `${folder} readable PDF was withheld (${assessment.decision}: ${assessment.reasonCodes.join(",")})`,
      );
    }
  }

  assert.ok(results.length >= 12, `expected a representative PDF pack, got ${results.length}`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "KNOWN16-SMOKE.json"), JSON.stringify({ results }, null, 2));
  console.log(`ingestion-gate-known16-smoke: ${results.length} PDFs assessed`);
  for (const row of results) {
    console.log(`  ${row.folder}: ${row.decision} len=${row.textLength} withheld=${row.withheld}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
