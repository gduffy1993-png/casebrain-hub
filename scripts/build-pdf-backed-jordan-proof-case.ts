#!/usr/bin/env npx tsx
/**
 * Build controlled PDF-backed Jordan proof case + run line-source proof.
 * Run: npx tsx scripts/build-pdf-backed-jordan-proof-case.ts
 */
import fs from "node:fs";
import path from "node:path";

import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";
import { buildPdfBackedCaseArtifacts } from "../lib/eval/line-source-proof/pdf-bundle-pipeline";

const ROOT = process.cwd();
const SOURCE_CASE_ID = "cb-fresh-002-jordan-hale";
const PDF_CASE_ID = "cb-fresh-002-jordan-hale-pdf-proof";

const sourceDir = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases", SOURCE_CASE_ID);
const caseDir = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases", PDF_CASE_ID);

async function main() {
  const canonicalBundle = fs.readFileSync(path.join(sourceDir, "bundle-text.md"), "utf8");
  const sourceTruth = JSON.parse(fs.readFileSync(path.join(sourceDir, "truth-key.json"), "utf8"));

  console.log(`\n=== Building PDF-backed case: ${PDF_CASE_ID} ===`);
  const artifacts = await buildPdfBackedCaseArtifacts(caseDir, PDF_CASE_ID, canonicalBundle);

  const truthKey = {
    ...sourceTruth,
    caseId: PDF_CASE_ID,
    title: "CB-FRESH-002 Jordan Hale — PDF-backed proof chain (BWV/custody)",
    proofChainMode: "pdf_backed_controlled",
  };
  fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(truthKey, null, 2));
  fs.writeFileSync(
    path.join(caseDir, "canonical-bundle-reference.md"),
    canonicalBundle,
  );

  console.log(`  PDF: ${artifacts.pdfPath}`);
  console.log(`  Pages: ${artifacts.meta.pageCount}`);
  console.log(`  Extraction similarity: ${Math.round(artifacts.meta.canonicalComparison.similarityRatio * 100)}%`);
  if (artifacts.meta.extractionWarnings.length) {
    console.log(`  Warnings: ${artifacts.meta.extractionWarnings.join("; ")}`);
  }

  console.log(`\n=== Running line-source proof ===`);
  const report = buildLineSourceProof(caseDir);
  const { mdPath, jsonPath } = writeLineSourceProofArtifacts(report);
  const c = report.summary.proofChainCoverage;

  console.log(`  mode: ${report.proofChainAppendix.caseProofMode}`);
  console.log(`  lines: ${report.summary.totalMeaningfulLines}  FAIL: ${report.summary.fail}`);
  console.log(`  pdf_and_text_support_output: ${c.pdfAndTextSupportOutput}`);
  console.log(`  text_supports_but_pdf_unchecked: ${c.textSupportsButPdfUnchecked}`);
  console.log(`  ledger — suppressed: ${report.proofLedger.counts.suppressedCandidates}  rewrites: ${report.proofLedger.counts.rewritesDowngrades}`);
  console.log(`  md: ${mdPath}`);
  console.log(`  json: ${jsonPath}`);

  const summaryPath = path.join(ROOT, "artifacts", "casebrain-qa", "line-source-proof", "PDF-BACKED-SUMMARY.md");
  const pdfBackedLines = report.lines.filter((l) => l.proofChainStatus === "pdf_and_text_support_output").slice(0, 5);
  const failLines = report.lines.filter((l) => l.verdict === "FAIL").slice(0, 5);

  const summary = [
    "# PDF-backed line-source proof — Jordan Hale",
    "",
    "Controlled PDF generated from canonical Jordan bundle-text, then text extracted from PDF for CaseBrain + proof chain.",
    "",
    "## Chain exercised",
    "",
    "Original PDF (`bundle.pdf`) → extracted text (`bundle-text.md`) → CaseBrain output → line-source verdict → Ged/Codex review",
    "",
    `- Case ID: **${PDF_CASE_ID}**`,
    `- PDF: \`${artifacts.meta.pdfPath}\``,
    `- Proof mode: **${report.proofChainAppendix.caseProofMode}**`,
    `- PDF pages: **${artifacts.meta.pageCount}**`,
  "",
    "## Proof chain coverage",
    "",
    `- pdf_and_text_support_output: **${c.pdfAndTextSupportOutput}**`,
    `- text_supports_but_pdf_unchecked: **${c.textSupportsButPdfUnchecked}**`,
    `- pdf_available_but_text_mismatch: **${c.pdfAvailableButTextMismatch}**`,
    `- source_unavailable: **${c.sourceUnavailable}**`,
    `- output_unsupported: **${c.outputUnsupported}**`,
    "",
    `- Verdicts: PASS **${report.summary.pass}** | WARNING **${report.summary.warning}** | FAIL **${report.summary.fail}**`,
    "",
    "## Proof ledger",
    "",
    `- Emitted: **${report.proofLedger.counts.emittedLines}** | Suppressed: **${report.proofLedger.counts.suppressedCandidates}** | Rewrites: **${report.proofLedger.counts.rewritesDowngrades}**`,
    `- PDF+text supported: **${report.proofLedger.counts.pdfAndTextSupported}** | Possible false suppressions: **${report.proofLedger.counts.possibleFalseSuppressions}**`,
    "",
    report.proofChainAppendix.proofChainNote,
    "",
    "## Sample pdf_and_text_support_output lines",
    "",
    ...(pdfBackedLines.length
      ? pdfBackedLines.map(
          (l) =>
            `- Page ${l.sourcePageNumber}: ${l.outputLine.slice(0, 90)}…\n  - Snippet: ${l.extractedSnippet?.slice(0, 70)}`,
        )
      : ["- none"]),
    "",
    "## Sample FAIL / output_unsupported lines",
    "",
    ...(failLines.length
      ? failLines.map((l) => `- **${l.proofChainStatus}** — ${l.outputLine.slice(0, 90)}…`)
      : ["- none"]),
    "",
    "## Report",
    "",
    `[line-by-line-proof.md](./${PDF_CASE_ID}/line-by-line-proof.md)`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  fs.writeFileSync(summaryPath, summary);
  console.log(`\nSummary: ${summaryPath}`);

  const acceptance = {
    hasPdf: fs.existsSync(artifacts.pdfPath),
    pdfAndTextPositive: c.pdfAndTextSupportOutput >= 1,
    noUnsupportedClaims: c.outputUnsupported === 0 && report.summary.fail === 0,
    modeIsPdfAndText: report.proofChainAppendix.caseProofMode === "pdf_and_text",
    appendixListsPdf: report.proofChainAppendix.sourceDocuments.some((d) => d.type === "pdf"),
  };

  console.log("\nAcceptance:");
  for (const [k, v] of Object.entries(acceptance)) {
    console.log(`  ${v ? "✓" : "✗"} ${k}`);
  }

  if (!Object.values(acceptance).every(Boolean)) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
