import type { CaseProofChainAppendix, LineSourceProofRecord, LineSourceProofReport, ReviewTier } from "./types";
import { needsGedReviewList, summarizeTiers, tierLabel } from "./review-tier";
import { summarizeProofChainCoverage } from "./proof-chain";
import { polishProductCasing } from "./ledger-display";
import { renderProofLedgerSections, renderProofLedgerSummary } from "./render-proof-ledger";

function displayOutput(row: LineSourceProofRecord): string {
  return polishProductCasing(row.humanOutputLine ?? row.outputLine);
}

function supportStatusLabel(status: string): string {
  const map: Record<string, string> = {
    supported: "Supported by bundle text",
    source_unavailable: "Source not available on papers",
    unsupported: "Not supported by bundle",
    blocked: "Blocked — unsafe to emit",
    referred_only: "Referred only — not safely served",
    missing: "Missing on bundle",
    incomplete: "Incomplete / partial only",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function proofChainStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pdf_and_text_support_output: "PDF page and text both support",
    text_supports_but_pdf_unchecked: "Text supports — PDF not checked",
    pdf_available_but_text_mismatch: "PDF available but text mismatch",
    source_unavailable: "No source on papers",
    output_unsupported: "Output not supported",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

const DISCLAIMER =
  "Controlled/anonymised audit only unless solicitor-reviewed real bundles are used. Do not claim real-world false-served rate or solicitor-reviewed accuracy from controlled data.";

const GED_TIER_ORDER: ReviewTier[] = ["blocking_review", "source_review", "solicitor_caution"];

function formatGedRow(row: LineSourceProofRecord, index: number): string {
  const snippet = row.sourceSnippet
    ? row.sourceSnippet.slice(0, 100) + (row.sourceSnippet.length > 100 ? "…" : "")
    : "no source found";
  const reasons = row.gedReviewReasons.length ? row.gedReviewReasons.join(", ") : "tier classification";
  return `${index}. **${row.verdict}** — ${row.lineCategory} — ${row.outputSurface}\n   - Output: ${displayOutput(row).slice(0, 120)}${displayOutput(row).length > 120 ? "…" : ""}\n   - Reasons: ${reasons}\n   - Source: ${snippet}`;
}

function renderGedTierSection(rows: LineSourceProofRecord[], tier: ReviewTier, startIndex: number): { lines: string[]; nextIndex: number } {
  const tierRows = rows.filter((r) => r.reviewTier === tier);
  if (tierRows.length === 0) {
    return { lines: [`### ${tierLabel(tier)}`, "", "- none", ""], nextIndex: startIndex };
  }
  const lines = [`### ${tierLabel(tier)} (${tierRows.length})`, ""];
  let i = startIndex;
  for (const row of tierRows) {
    i += 1;
    lines.push(formatGedRow(row, i));
  }
  lines.push("");
  return { lines, nextIndex: i };
}

export function renderLineByLineMarkdown(report: LineSourceProofReport): string {
  const meaningful = report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const gedLines = meaningful.filter((l) => needsGedReviewList(l.reviewTier));
  const tierSummary = summarizeTiers(report.lines);

  const cleanExamples = meaningful
    .filter((l) => l.reviewTier === "clean_source_backed")
    .slice(0, 10);
  const safetyGuards = meaningful.filter((l) => l.reviewTier === "generic_safety_guard").slice(0, 6);

  const lines: string[] = [
    `# Line-by-line source proof — ${report.caseId}`,
    "",
    `**${report.caseTitle}**`,
    "",
    `Defendant: ${report.defendant}`,
    "",
    DISCLAIMER,
    "",
    ...renderProofLedgerSummary(report),
    ...renderProofLedgerSections(report.proofLedger),
    "---",
    "",
    "## Method",
    "",
    report.method,
    "",
    `Bundle source: \`${report.bundleSourcePath}\``,
    "",
    "## Summary",
    "",
    `- Meaningful lines audited: **${report.summary.totalMeaningfulLines}**`,
    `- Blocking failures: **${report.summary.blockingReview}**`,
    `- Unsupported output lines: **${report.summary.unsupportedOutput}**`,
    `- Source review warnings: **${report.summary.sourceReviewWarnings}**`,
    `- Solicitor caution lines: **${report.summary.solicitorCaution}**`,
    `- Clean source-backed lines: **${report.summary.cleanSourceBacked}**`,
    `- Generic safety guards: **${report.summary.genericSafetyGuards}**`,
    `- Positive correct findings: **${report.summary.positiveCorrect}**`,
    `- PASS: **${report.summary.pass}** | WARNING: **${report.summary.warning}** | FAIL: **${report.summary.fail}**`,
    `- Lines requiring Ged review (tiered): **${report.summary.gedReviewCount}**`,
    "",
    "## Proof chain coverage",
    "",
    `- Case proof mode: **${report.proofChainAppendix.caseProofMode}**`,
    `- Original PDF available: **${report.proofChainAppendix.originalPdfAvailable ? "yes" : "no"}**`,
    `- pdf_and_text_support_output: **${report.summary.proofChainCoverage.pdfAndTextSupportOutput}**`,
    `- text_supports_but_pdf_unchecked: **${report.summary.proofChainCoverage.textSupportsButPdfUnchecked}**`,
    `- pdf_available_but_text_mismatch: **${report.summary.proofChainCoverage.pdfAvailableButTextMismatch}**`,
    `- No source on papers: **${report.summary.proofChainCoverage.sourceUnavailable}**`,
    `- Output not supported (emitted): **${report.summary.proofChainCoverage.outputUnsupported}**`,
    `- Emitted unsupported (ledger): **${report.proofLedger.counts.emittedUnsupported}**`,
    `- Suppressed unsupported (ledger): **${report.proofLedger.counts.suppressedUnsupported}**`,
    "",
    report.proofChainAppendix.proofChainNote,
    "",
    "### Review tiers",
    ...Object.entries(report.summary.byTier).map(([k, v]) => `- ${tierLabel(k as ReviewTier)}: ${v}`),
    "",
    "### By category",
    ...Object.entries(report.summary.byCategory).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "### By support status",
    ...Object.entries(report.summary.bySupport).map(([k, v]) => `- ${supportStatusLabel(k)}: ${v}`),
    "",
    "## Lines requiring Ged review",
    "",
    "Tiered review queue — blocking issues first, then source gaps, then solicitor caution. Clean source-backed and generic safety guards are listed separately below.",
    "",
  ];

  let gedIndex = 0;
  for (const tier of GED_TIER_ORDER) {
    const section = renderGedTierSection(gedLines, tier, gedIndex);
    lines.push(...section.lines);
    gedIndex = section.nextIndex;
  }

  lines.push(
    "## Clean source-backed findings (positive)",
    "",
    ...(cleanExamples.length
      ? cleanExamples.map(
          (l) =>
            `- **${l.lineCategory}** (${l.outputSurface}): "${displayOutput(l).slice(0, 100)}${displayOutput(l).length > 100 ? "…" : ""}" — ${l.sourceSnippet?.slice(0, 90) ?? "—"}${l.humanEvidenceLabel ? ` [${l.humanEvidenceLabel}]` : ""}`,
        )
      : ["- none"]),
    "",
    "## Generic safety guards",
    "",
    ...(safetyGuards.length
      ? safetyGuards.map((l) => `- ${l.outputLine.slice(0, 110)}${l.outputLine.length > 110 ? "…" : ""}`)
      : ["- none"]),
    "",
    "---",
    "",
    "## PDF / source appendix",
    "",
    "### Source documents used",
    "",
    ...report.proofChainAppendix.sourceDocuments.map(
      (d) =>
        `- **${d.name}** (${d.type}) — \`${d.path}\`${d.pageReferences.length ? `\n  - Page refs: ${d.pageReferences.slice(0, 8).join("; ")}${d.pageReferences.length > 8 ? "…" : ""}` : ""}`,
    ),
    "",
    "### Missing pages / PDF gaps",
    "",
    ...(report.proofChainAppendix.missingPages.length
      ? report.proofChainAppendix.missingPages.slice(0, 12).map((p) => `- ${p}`)
      : ["- none noted"]),
    "",
    "### OCR / extraction warnings",
    "",
    ...(report.proofChainAppendix.ocrWarnings.length
      ? report.proofChainAppendix.ocrWarnings.map((w) => `- ${w}`)
      : ["- none"]),
    "",
    "### Proof chain roll-up",
    "",
    `- Lines judged from extracted text only (PDF unchecked): **${report.proofChainAppendix.linesJudgedFromExtractedTextOnly}**`,
    `- Lines where source text and output disagree / unsupported: **${report.proofChainAppendix.linesSourceOutputDisagree}**`,
    `- Lines text-supported but PDF unchecked: **${report.proofChainAppendix.linesPdfUnchecked}**`,
    "",
    "---",
    "",
    "## Line-by-line audit",
    "",
  );

  let n = 0;
  for (const row of report.lines) {
    if (row.usefulnessVerdict === "excluded") continue;
    n += 1;
    lines.push(
      `### ${n}. ${row.lineCategory.replace(/_/g, " ")}`,
      "",
      "**OUTPUT:**",
      displayOutput(row),
      "",
      ...(row.humanOutputLine && row.humanOutputLine !== row.outputLine
        ? [`**RAW OUTPUT (product):** ${row.outputLine}`, ""]
        : []),
      ...(row.humanEvidenceLabel
        ? [`**HUMAN EVIDENCE LABEL:** ${row.humanEvidenceLabel}`, ""]
        : []),
      `**SURFACE:** ${row.outputSurface}`,
      "",
      `**CATEGORY:** ${row.lineCategory}`,
      "",
      `**REVIEW TIER:** ${tierLabel(row.reviewTier)}`,
      "",
      ...(row.evidenceItem ? [`**EVIDENCE ITEM:** ${row.evidenceItem}`, ""] : []),
      "**SOURCE:**",
      row.sourceSnippet
        ? `${row.sourceSection ? `Section ${row.sourceSection}` : "Bundle"}${row.sourcePage ? ` (p.${row.sourcePage})` : ""}: ${row.sourceSnippet}`
        : "no source found",
      "",
      `**SOURCE STRENGTH:** ${row.sourceStrength}`,
      "",
      `**SUPPORT:** ${supportStatusLabel(row.supportStatus)}`,
      "",
      "**PROOF CHAIN:**",
      `- Document: ${row.sourceDocumentName ?? "—"} (${row.sourceDocumentType})`,
      `- Page: ${row.sourcePageNumber ?? "—"} | Section: ${row.sourceSection ?? "—"}`,
      `- Extracted snippet: ${row.extractedSnippet ? row.extractedSnippet.slice(0, 200) + (row.extractedSnippet.length > 200 ? "…" : "") : "none"}`,
      `- PDF page available: ${row.pdfPageAvailable ? "yes" : "no"}`,
      row.pdfPageEvidencePath
        ? `- PDF page evidence path: \`${row.pdfPageEvidencePath}\``
        : "- PDF page evidence path: not generated",
      `- Extraction confidence: ${row.extractionConfidence}`,
      `- Extraction issue: ${row.extractionIssue}`,
      `- **Proof chain status: ${proofChainStatusLabel(row.proofChainStatus)}**`,
      "",
      "**WHY THIS SUPPORTS THE LINE:**",
      row.whyThisSupportsTheLine,
      "",
      "**WHY THIS IS LIMITED:**",
      row.whyThisIsLimited,
      "",
    );
    if (row.safeWording) {
      lines.push("**SAFE WORDING:**", row.safeWording, "");
    }
    if (row.blockedWording) {
      lines.push("**BLOCKED WORDING:**", row.blockedWording, "");
    }
    if (row.gedReviewReasons.length > 0) {
      lines.push(`**GED REVIEW REASONS:** ${row.gedReviewReasons.join(", ")}`, "");
    }
    lines.push(
      `**SOLICITOR REVIEW REQUIRED:** ${row.solicitorReviewRequired ? "yes" : "no"}`,
      "",
      `**USEFULNESS:** ${row.usefulnessVerdict}`,
      "",
      `**VERDICT:** ${row.verdict}`,
      "",
      "---",
      "",
    );
  }

  lines.push(
    "## What this case proves",
    "",
    "### Correct source-backed examples",
    "",
    ...meaningful
      .filter((l) => l.reviewTier === "clean_source_backed")
      .slice(0, 8)
      .map(
        (l) =>
          `- **${l.lineCategory}:** "${l.outputLine.slice(0, 100)}${l.outputLine.length > 100 ? "…" : ""}" — ${l.whyThisSupportsTheLine.slice(0, 140)}`,
      ),
    "",
    "### Failures (honest)",
    "",
    ...(meaningful.filter((l) => l.verdict === "FAIL").length
      ? meaningful
          .filter((l) => l.verdict === "FAIL")
          .map(
            (l) =>
              `- **${l.outputSurface}:** ${l.outputLine.slice(0, 120)} — ${l.blockedWording ?? l.whyThisIsLimited}`,
          )
      : ["- none on this controlled case"]),
    "",
  );

  return lines.join("\n");
}

export function buildReportSummary(lines: LineSourceProofRecord[], appendix: CaseProofChainAppendix) {
  const meaningful = lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const byCategory: Record<string, number> = {};
  const bySupport: Record<string, number> = {};
  for (const l of meaningful) {
    byCategory[l.lineCategory] = (byCategory[l.lineCategory] ?? 0) + 1;
    bySupport[l.supportStatus] = (bySupport[l.supportStatus] ?? 0) + 1;
  }
  const tierStats = summarizeTiers(lines);
  const chainStats = summarizeProofChainCoverage(lines);
  return {
    totalMeaningfulLines: meaningful.length,
    pass: meaningful.filter((l) => l.verdict === "PASS").length,
    warning: meaningful.filter((l) => l.verdict === "WARNING").length,
    fail: meaningful.filter((l) => l.verdict === "FAIL").length,
    excluded: lines.length - meaningful.length,
    byCategory,
    bySupport,
    positiveCorrect: tierStats.positiveCorrect,
    gedReviewCount: tierStats.gedReviewCount,
    blockingReview: tierStats.blockingReview,
    unsupportedOutput: tierStats.unsupportedOutput,
    sourceReviewWarnings: tierStats.sourceReviewWarnings,
    solicitorCaution: tierStats.solicitorCaution,
    cleanSourceBacked: tierStats.cleanSourceBacked,
    genericSafetyGuards: tierStats.genericSafetyGuards,
    byTier: tierStats.byTier,
    proofChainCoverage: {
      ...chainStats,
      originalPdfAvailable: appendix.originalPdfAvailable,
      caseProofMode: appendix.caseProofMode,
    },
  };
}
