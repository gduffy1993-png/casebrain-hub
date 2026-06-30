#!/usr/bin/env npx tsx
/**
 * Five-case line-source proof pack (Jordan + Taylor + 3 hard shapes).
 * Run: npx tsx scripts/build-five-case-line-source-proof.ts
 */
import fs from "node:fs";
import path from "node:path";

import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";
import type { LineSourceProofReport } from "../lib/eval/line-source-proof/types";

const ROOT = process.cwd();

const FIVE_CASES: Array<{
  id: string;
  shape: string;
  dir: string;
}> = [
  {
    id: "cb-fresh-002-jordan-hale",
    shape: "BWV referred / custody extract / unsupported CCTV",
    dir: "artifacts/evidence-state-audit-local/cases/cb-fresh-002-jordan-hale",
  },
  {
    id: "cb-fresh-001-taylor-brookes",
    shape: "Phone screenshots / extraction summary / attribution disputed / unsupported CAD",
    dir: "artifacts/evidence-state-audit-local/cases/cb-fresh-001-taylor-brookes",
  },
  {
    id: "sim-389",
    shape: "Encro handle vs defendant / co-defendant segregation / platform extraction referred",
    dir: "artifacts/evidence-state-audit-local/cases/sim-389",
  },
  {
    id: "sim-394",
    shape: "Historic sexual / first account outstanding / platform attribution gaps",
    dir: "artifacts/evidence-state-audit-local/cases/sim-394",
  },
  {
    id: "sim-380",
    shape: "CCTV stills vs master footage / grainy ID limits / co-defendant chase",
    dir: "artifacts/evidence-state-audit-local/cases/sim-380",
  },
];

function inferIssueTypes(report: LineSourceProofReport): string[] {
  const issues = new Set<string>();
  const fails = report.lines.filter((l) => l.verdict === "FAIL");
  const vague = report.lines.filter((l) => l.humanEvidenceLabel && /mg6 \/ unused/i.test(l.outputLine));

  if (fails.some((l) => /bundle_does_not_mention_cctv|bundle_does_not_mention_cad/.test(l.gedReviewReasons.join(" ")))) {
    issues.add("product_output");
  }
  if (fails.some((l) => /overclaim|other_defendant/.test(l.gedReviewReasons.join(" ")))) {
    issues.add("product_output");
  }
  if (report.lines.some((l) => l.gedReviewReasons.includes("generic_source_only"))) {
    issues.add("label_clarity");
  }
  if (report.lines.some((l) => l.gedReviewReasons.includes("adjacent_source_mismatch"))) {
    issues.add("source_matching");
  }
  if (report.lines.some((l) => l.gedReviewReasons.includes("source_unavailable") && l.verdict !== "FAIL")) {
    issues.add("source_extraction");
  }
  if (vague.length > 0) issues.add("proof_harness");
  if (issues.size === 0) issues.add("none_notable");
  return [...issues];
}

function renderSummaryTable(reports: Array<LineSourceProofReport & { shape: string; issueTypes: string[] }>): string {
  const header = `| Case | Shape | Lines | Positive | Clean | FAIL | Text-only | PDF+text | Text unchecked | Output unsupported |
|------|-------|------:|---------:|------:|-----:|----------:|---------:|---------------:|-------------------:|`;

  const rows = reports.map((r) => {
    const s = r.summary;
    const c = s.proofChainCoverage;
    return `| ${r.caseId} | ${r.shape.slice(0, 40)} | ${s.totalMeaningfulLines} | ${s.positiveCorrect} | ${s.cleanSourceBacked} | ${s.fail} | ${c.caseProofMode === "text_only_controlled" ? "yes" : "no"} | ${c.pdfAndTextSupportOutput} | ${c.textSupportsButPdfUnchecked} | ${c.outputUnsupported} |`;
  });

  return [header, ...rows].join("\n");
}

function renderLedgerPackTable(
  reports: Array<LineSourceProofReport & { shape: string; issueTypes: string[] }>,
): string {
  const header = `| Case | Emitted | Suppressed | Rewrites | Missing | Conflicts | Entity | Surface | False supp | Emitted unsupp | PDF+text |
|------|--------:|-----------:|---------:|--------:|----------:|-------:|--------:|-----------:|---------------:|---------:|`;
  const rows = reports.map((r) => {
    const c = r.proofLedger.counts;
    return `| ${r.caseId} | ${c.emittedLines} | ${c.suppressedCandidates} | ${c.rewritesDowngrades} | ${c.missingExpectedOutputs} | ${c.sourceConflicts} | ${c.entityRisks} | ${c.surfaceSafetyIssues} | ${c.possibleFalseSuppressions} | ${c.emittedUnsupported} | ${c.pdfAndTextSupported} |`;
  });
  return [header, ...rows].join("\n");
}

function renderProofChainCoverageSection(
  reports: Array<LineSourceProofReport & { shape: string; issueTypes: string[] }>,
): string {
  const pdfCases = reports.filter((r) => r.proofChainAppendix.originalPdfAvailable).length;
  const textOnly = reports.length - pdfCases;
  const totals = reports.reduce(
    (acc, r) => {
      const c = r.summary.proofChainCoverage;
      acc.pdfAndText += c.pdfAndTextSupportOutput;
      acc.textUnchecked += c.textSupportsButPdfUnchecked;
      acc.mismatch += c.pdfAvailableButTextMismatch;
      acc.unavailable += c.sourceUnavailable;
      acc.unsupported += c.outputUnsupported;
      return acc;
    },
    { pdfAndText: 0, textUnchecked: 0, mismatch: 0, unavailable: 0, unsupported: 0 },
  );

  return [
    "## Proof Chain Coverage",
    "",
    "Proof chain: **Original PDF/page → extracted text → CaseBrain output → line-source verdict → Ged/Codex review**",
    "",
    `- Cases with original PDF in case dir: **${pdfCases}**`,
    `- Cases text-only controlled (no PDF in dir): **${textOnly}**`,
    "",
    "### Pack totals (meaningful lines)",
    "",
    `- pdf_and_text_support_output: **${totals.pdfAndText}**`,
    `- text_supports_but_pdf_unchecked: **${totals.textUnchecked}**`,
    `- pdf_available_but_text_mismatch: **${totals.mismatch}**`,
    `- source_unavailable: **${totals.unavailable}**`,
    `- output_unsupported: **${totals.unsupported}**`,
    "",
    "All five controlled cases currently audit against `bundle-text.md` only unless a PDF is present in the case directory. PDF page images are not auto-rendered in this pass.",
    "",
    "### Per case",
    "",
    ...reports.map((r) => {
      const c = r.summary.proofChainCoverage;
      return `- **${r.caseId}**: mode=${c.caseProofMode}, pdf=${c.originalPdfAvailable ? "yes" : "no"}, text_unchecked=${c.textSupportsButPdfUnchecked}, output_unsupported=${c.outputUnsupported}`;
    }),
    "",
  ].join("\n");
}

const reports: Array<LineSourceProofReport & { shape: string; issueTypes: string[] }> = [];

for (const spec of FIVE_CASES) {
  const caseDir = path.join(ROOT, spec.dir);
  console.log(`\n=== ${spec.id} ===`);
  const report = buildLineSourceProof(caseDir);
  const { mdPath } = writeLineSourceProofArtifacts(report);
  const issueTypes = inferIssueTypes(report);
  reports.push({ ...report, shape: spec.shape, issueTypes });
  const c = report.summary.proofChainCoverage;
  console.log(`  shape: ${spec.shape}`);
  console.log(`  lines: ${report.summary.totalMeaningfulLines}  positive: ${report.summary.positiveCorrect}  FAIL: ${report.summary.fail}`);
  console.log(`  ledger — suppressed: ${report.proofLedger.counts.suppressedCandidates}  rewrites: ${report.proofLedger.counts.rewritesDowngrades}  false-supp: ${report.proofLedger.counts.possibleFalseSuppressions}`);
  console.log(`  proof chain — text_unchecked: ${c.textSupportsButPdfUnchecked}  unsupported: ${c.outputUnsupported}  mode: ${c.caseProofMode}`);
  console.log(`  md: ${mdPath}`);
}

const outDir = path.join(ROOT, "artifacts", "casebrain-qa", "line-source-proof");
const summaryPath = path.join(outDir, "FIVE-CASE-SUMMARY.md");
const summary = [
  "# Five-case line-source proof pack",
  "",
  "Controlled audit only. Method v1 — line-by-line source proof with review tiers + proof chain.",
  "",
  "Cases: Jordan (BWV/custody), Taylor (phone/digital), sim-389 (Encro/co-def), sim-394 (historic sexual), sim-380 (CCTV stills/ID).",
  "",
  "## Summary table",
  "",
  renderSummaryTable(reports),
  "",
  renderProofChainCoverageSection(reports),
  "",
  "## Proof ledger pack totals",
  "",
  renderLedgerPackTable(reports),
  "",
  "## Per-case reports",
  "",
  ...reports.map(
    (r) =>
      `- **${r.caseId}** — ${r.caseTitle}\n  - Shape: ${r.shape}\n  - Bundle: \`${r.bundleSourcePath}\`\n  - Proof mode: ${r.proofChainAppendix.caseProofMode}\n  - Report: [line-by-line-proof.md](./${r.caseId}/line-by-line-proof.md)\n  - Issue types: ${r.issueTypes.join(", ")}`,
  ),
  "",
  "## Acceptance notes",
  "",
  "- Useful supported findings counted as **positive correct**",
  "- Unsupported invented material (CCTV/CAD/handle/overclaim) → **FAIL** where detected",
  "- Missing/referred/incomplete evidence not treated as fully served in clean tier",
  "- Generic safety guards separated from source-backed positives",
  "- Each line records **proofChainStatus** (PDF-verified vs text-only)",
  "- Text-only controlled cases labelled honestly — no fake PDF proof",
  "- **Proof ledger** records emitted, suppressed, rewrites, missing (source-led), conflicts, entity, surface safety",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
].join("\n");

fs.writeFileSync(summaryPath, summary);
fs.writeFileSync(
  path.join(outDir, "five-case-summary.json"),
  JSON.stringify(
    reports.map((r) => ({
      caseId: r.caseId,
      caseTitle: r.caseTitle,
      shape: r.shape,
      bundleSourcePath: r.bundleSourcePath,
      proofChainAppendix: r.proofChainAppendix,
      summary: r.summary,
      proofLedgerCounts: r.proofLedger.counts,
      issueTypes: r.issueTypes,
    })),
    null,
    2,
  ),
);

console.log(`\nFive-case summary: ${summaryPath}`);
const totalFail = reports.reduce((n, r) => n + r.summary.fail, 0);
if (totalFail > 0) process.exit(2);
