import fs from "node:fs";
import path from "node:path";

import { isDemoAuditCase } from "../demo-audit-packs/presentation-polish";
import type { EvidenceStateTruthKey } from "../evidence-state-audit/types";
import { loadPdfExtractionMeta, loadPdfPageTexts, snippetVerifiedOnPdfPage } from "./pdf-bundle-pipeline";
import { parseBundleSections } from "./source-match";
import type {
  CaseProofChainAppendix,
  ExtractionConfidence,
  ExtractionIssue,
  LineSourceProofRecord,
  ProofChainStatus,
  SourceDocumentType,
} from "./types";

export type CaseProofChainContext = {
  caseDir: string;
  caseId: string;
  bundleTextPath: string;
  bundleRelPath: string;
  originalPdfAvailable: boolean;
  pdfBackedControlled: boolean;
  caseProofMode: "pdf_and_text" | "text_only_controlled";
  pdfPaths: string[];
  pdfPageTexts: Map<string, string>;
  bundlePageIndex: Map<string, string>;
  truthKey: EvidenceStateTruthKey;
};

function listPdfFiles(caseDir: string): string[] {
  if (!fs.existsSync(caseDir)) return [];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) walk(full);
      else if (entry.isFile() && /\.pdf$/i.test(entry.name)) found.push(full);
    }
  };
  walk(caseDir);
  return found;
}

function parseBundlePageIndex(bundleText: string): Map<string, string> {
  const index = new Map<string, string>();
  const lines = bundleText.split(/\r?\n/);
  let inIndex = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^INDEX$/i.test(line)) {
      inIndex = true;
      continue;
    }
    if (inIndex && /^=== SECTION:/i.test(line)) break;
    if (!inIndex) continue;
    const m = line.match(/^(.+?)\s*\|\s*([\d]+(?:-[\d]+)?)\s*\|/);
    if (m) {
      const label = m[1]?.trim().toLowerCase() ?? "";
      const pages = m[2]?.trim() ?? "";
      if (label && pages) index.set(label, pages);
    }
  }
  return index;
}

function lookupPageForSection(section: string | null, bundleText: string, pageIndex: Map<string, string>): string | null {
  if (!section) return null;
  const key = section.toLowerCase();
  for (const [label, pages] of pageIndex) {
    if (key.includes(label) || label.includes(key.replace(/_/g, " "))) return pages;
  }
  const sections = parseBundleSections(bundleText);
  const match = sections.find((s) => s.name.toLowerCase() === key);
  if (!match) return null;
  for (const [label, pages] of pageIndex) {
    if (/mg5|mg6|charge|mg11|custody|cover/i.test(label) && label.includes(key.split("_")[0] ?? "")) {
      return pages;
    }
  }
  return null;
}

const SECTION_PAGE_FALLBACK: Record<string, string> = {
  CHARGE: "1",
  COVER_INDEX: "1",
  MG5: "2",
  MG6: "4",
  MG11: "5",
  CUSTODY: "6",
  LISTING: "7",
};

function resolvePageNumber(
  line: LineSourceProofRecord,
  bundleText: string,
  pageIndex: Map<string, string>,
): string | null {
  if (line.sourcePage) return line.sourcePage;
  const fromIndex = lookupPageForSection(line.sourceSection, bundleText, pageIndex);
  if (fromIndex) return fromIndex.split("-")[0] ?? fromIndex;
  if (line.sourceSection) {
    const fb = SECTION_PAGE_FALLBACK[line.sourceSection.toUpperCase()];
    if (fb) return fb;
  }
  return null;
}

export function discoverCaseProofChainContext(
  caseDir: string,
  caseId: string,
  bundleText: string,
  truthKey: EvidenceStateTruthKey,
): CaseProofChainContext {
  const bundleTextPath = path.join(caseDir, "bundle-text.md");
  const bundleRelPath = path.relative(process.cwd(), bundleTextPath).replace(/\\/g, "/");
  const pdfPaths = listPdfFiles(caseDir);
  const originalPdfAvailable = pdfPaths.length > 0;
  const pdfBackedControlled =
    truthKey.proofChainMode === "pdf_backed_controlled" || fs.existsSync(path.join(caseDir, "pdf-extraction-meta.json"));
  const generated =
    !pdfBackedControlled &&
    (truthKey.bundleStatus === "generated" ||
      /RESTRICTED — (FICTIONAL|PROSECUTION)/i.test(bundleText.slice(0, 120)) ||
      /26\/(SIM|CB-FRESH)\//i.test(bundleText));

  return {
    caseDir,
    caseId,
    bundleTextPath,
    bundleRelPath,
    originalPdfAvailable,
    pdfBackedControlled,
    caseProofMode:
      originalPdfAvailable && (pdfBackedControlled || !generated) ? "pdf_and_text" : "text_only_controlled",
    pdfPaths,
    pdfPageTexts: loadPdfPageTexts(caseDir),
    bundlePageIndex: parseBundlePageIndex(bundleText),
    truthKey,
  };
}

function inferSourceDocumentType(ctx: CaseProofChainContext): SourceDocumentType {
  if (ctx.originalPdfAvailable && ctx.pdfBackedControlled) return "pdf";
  if (ctx.originalPdfAvailable) return "pdf";
  if (ctx.truthKey.bundleStatus === "gold_pack") return "extracted_text_only";
  return "generated_bundle_text";
}

function inferExtractionConfidence(
  line: LineSourceProofRecord,
  pdfVerify: ReturnType<typeof snippetVerifiedOnPdfPage>,
): ExtractionConfidence {
  if (pdfVerify.confidence === "exact") return "exact";
  if (pdfVerify.confidence === "fuzzy") return "fuzzy";
  if (!line.sourceSnippet) return "unavailable";
  if (line.sourceStrength === "no_anchor" || line.sourceStrength === "index_only") return "weak";
  if (line.sourceStrength === "ocr_fragile" || /ocr|fragment/i.test(line.sourceSnippet)) return "fuzzy";
  if (line.sourceStrength === "weak" || line.sourceStrength === "schedule_only") return "fuzzy";
  if (line.sourceStrength === "strong" || line.sourceStrength === "medium") return "exact";
  return "fuzzy";
}

function inferExtractionIssue(
  line: LineSourceProofRecord,
  ctx: CaseProofChainContext,
  pdfVerify: ReturnType<typeof snippetVerifiedOnPdfPage>,
): ExtractionIssue {
  if (!ctx.originalPdfAvailable) return "pdf_unavailable_controlled_text_only";
  if (ctx.pdfBackedControlled && line.sourceSnippet && !pdfVerify.verified && pdfVerify.confidence !== "unavailable") {
    return "section_mismatch";
  }
  if (line.gedReviewReasons.includes("adjacent_source_mismatch")) return "section_mismatch";
  if (line.gedReviewReasons.includes("evidence_item_not_in_snippet")) return "label_mismatch";
  if (line.gedReviewReasons.includes("other_defendant_bleed")) return "mixed_defendant";
  if (/ocr|fragment/i.test(line.sourceSnippet ?? "")) return "OCR_low_confidence";
  if (ctx.originalPdfAvailable && line.sourceSection && !line.sourcePage) return "page_missing";
  return "none";
}

function textSupportsLine(line: LineSourceProofRecord): boolean {
  if (line.reviewTier === "generic_safety_guard") return true;
  if (!line.sourceSnippet) return false;
  if (line.supportStatus === "unsupported" || line.supportStatus === "blocked") return false;
  return true;
}

function resolveProofChainStatus(
  line: LineSourceProofRecord,
  ctx: CaseProofChainContext,
  pdfPageAvailable: boolean,
  pdfVerify: ReturnType<typeof snippetVerifiedOnPdfPage>,
): ProofChainStatus {
  if (line.reviewTier === "generic_safety_guard") {
    return line.sourceSnippet ? "text_supports_but_pdf_unchecked" : "source_unavailable";
  }
  if (line.verdict === "FAIL" || line.supportStatus === "unsupported" || line.supportStatus === "blocked") {
    if (
      isDemoAuditCase(ctx.caseId) &&
      line.lineCategory === "export_line" &&
      line.claimType === "client_summary" &&
      line.verdict !== "FAIL"
    ) {
      return "source_unavailable";
    }
    return "output_unsupported";
  }
  if (!textSupportsLine(line)) {
    return "source_unavailable";
  }
  if (ctx.originalPdfAvailable && ctx.caseProofMode === "pdf_and_text") {
    if (pdfPageAvailable && pdfVerify.verified && pdfVerify.confidence !== "weak") {
      if (line.gedReviewReasons.includes("adjacent_source_mismatch")) return "pdf_available_but_text_mismatch";
      return "pdf_and_text_support_output";
    }
    if (
      pdfPageAvailable &&
      !pdfVerify.verified &&
      line.sourceSnippet &&
      pdfVerify.confidence !== "unavailable"
    ) {
      return "pdf_available_but_text_mismatch";
    }
    if (line.gedReviewReasons.includes("adjacent_source_mismatch") || line.gedReviewReasons.includes("evidence_item_not_in_snippet")) {
      return "pdf_available_but_text_mismatch";
    }
    return "text_supports_but_pdf_unchecked";
  }
  return "text_supports_but_pdf_unchecked";
}

export function attachProofChainToLine(
  line: LineSourceProofRecord,
  ctx: CaseProofChainContext,
  bundleText: string,
  outRoot: string,
): LineSourceProofRecord {
  if (line.usefulnessVerdict === "excluded") {
    return {
      ...line,
      sourceDocumentName: null,
      sourceDocumentType: "unknown",
      sourcePageNumber: null,
      extractedSnippet: null,
      pdfPageAvailable: false,
      pdfPageEvidencePath: null,
      extractionConfidence: "unavailable",
      extractionIssue: "none",
      proofChainStatus: "source_unavailable",
    };
  }

  const sourceDocumentType = inferSourceDocumentType(ctx);
  const sourceDocumentName = ctx.originalPdfAvailable
    ? path.basename(ctx.pdfPaths[0] ?? "unknown.pdf")
    : path.basename(ctx.bundleTextPath);

  const sourcePageNumber = resolvePageNumber(line, bundleText, ctx.bundlePageIndex);
  const extractedSnippet = line.sourceSnippet;
  const pageKey = sourcePageNumber?.split("-")[0] ?? null;
  const pdfPageText = pageKey ? (ctx.pdfPageTexts.get(pageKey) ?? null) : null;
  const pdfVerify = snippetVerifiedOnPdfPage(extractedSnippet, pdfPageText);

  const pdfPageAvailable = Boolean(ctx.originalPdfAvailable && pageKey && pdfPageText);
  const pdfPageEvidencePath =
    pdfPageAvailable && pageKey
      ? path
          .relative(process.cwd(), path.join(outRoot, ctx.caseId, "proof-chain-pages", `p${pageKey}.md`))
          .replace(/\\/g, "/")
      : null;

  const extractionConfidence = inferExtractionConfidence(line, pdfVerify);
  const extractionIssue = inferExtractionIssue(line, ctx, pdfVerify);
  const proofChainStatus = resolveProofChainStatus(line, ctx, pdfPageAvailable, pdfVerify);

  return {
    ...line,
    sourceDocumentName,
    sourceDocumentType,
    sourcePageNumber,
    extractedSnippet,
    pdfPageAvailable,
    pdfPageEvidencePath: ctx.originalPdfAvailable && !pdfPageAvailable ? null : pdfPageEvidencePath,
    extractionConfidence,
    extractionIssue,
    proofChainStatus,
  };
}

export function buildCaseProofChainAppendix(
  lines: LineSourceProofRecord[],
  ctx: CaseProofChainContext,
): CaseProofChainAppendix {
  const meaningful = lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const pageRefs = new Set<string>();
  for (const l of meaningful) {
    if (l.sourcePageNumber) pageRefs.add(l.sourcePageNumber);
  }

  const indexPages = [...ctx.bundlePageIndex.entries()].map(([doc, pages]) => `${doc} (pp.${pages})`);
  const meta = loadPdfExtractionMeta(ctx.caseDir);

  return {
    caseProofMode: ctx.caseProofMode,
    originalPdfAvailable: ctx.originalPdfAvailable,
    sourceDocuments: [
      ...(ctx.originalPdfAvailable
        ? [
            {
              name: path.basename(ctx.pdfPaths[0]!),
              type: "pdf" as const,
              path: path.relative(process.cwd(), ctx.pdfPaths[0]!).replace(/\\/g, "/"),
              pageReferences: indexPages.length ? indexPages : [...pageRefs],
            },
          ]
        : []),
      {
        name: ctx.pdfBackedControlled ? "bundle-text.md (PDF-extracted)" : "bundle-text.md",
        type: ctx.pdfBackedControlled
          ? "extracted_text_only"
          : ctx.truthKey.bundleStatus === "gold_pack"
            ? "extracted_text_only"
            : "generated_bundle_text",
        path: ctx.bundleRelPath,
        pageReferences: indexPages.length ? indexPages : [...pageRefs],
      },
    ],
    missingPages: ctx.originalPdfAvailable
      ? meaningful
          .filter((l) => l.sourceSection && !l.sourcePageNumber)
          .map((l) => `${l.sourceSection} (no page mapped)`)
      : ["Original PDF not present — page-level proof not available"],
    ocrWarnings: [
      ...(meta?.extractionWarnings ?? []),
      ...meaningful
        .filter((l) => l.extractionIssue === "OCR_low_confidence")
        .map((l) => l.extractedSnippet?.slice(0, 80) ?? "OCR fragment"),
    ],
    linesJudgedFromExtractedTextOnly: meaningful.filter(
      (l) => l.proofChainStatus === "text_supports_but_pdf_unchecked" || !l.pdfPageAvailable,
    ).length,
    linesSourceOutputDisagree: meaningful.filter(
      (l) => l.proofChainStatus === "pdf_available_but_text_mismatch" || l.proofChainStatus === "output_unsupported",
    ).length,
    linesPdfUnchecked: meaningful.filter((l) => l.proofChainStatus === "text_supports_but_pdf_unchecked").length,
    proofChainNote: ctx.caseProofMode === "pdf_and_text"
      ? `PDF-backed proof chain: original PDF in case directory; bundle-text.md extracted from PDF. Page verification uses pdf-extraction-meta.json per-page text.${meta?.canonicalComparison.differsFromCanonical ? " Extraction differs from canonical reference — mismatches flagged." : ""}`
      : "Text-only controlled case: no original PDF in case directory. Proof chain stops at extracted bundle-text.md — not claimed as PDF-verified.",
  };
}

export function summarizeProofChainCoverage(lines: LineSourceProofRecord[]) {
  const meaningful = lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const count = (status: ProofChainStatus) => meaningful.filter((l) => l.proofChainStatus === status).length;
  return {
    pdfAndTextSupportOutput: count("pdf_and_text_support_output"),
    textSupportsButPdfUnchecked: count("text_supports_but_pdf_unchecked"),
    pdfAvailableButTextMismatch: count("pdf_available_but_text_mismatch"),
    sourceUnavailable: count("source_unavailable"),
    outputUnsupported: count("output_unsupported"),
  };
}

export function writeProofChainPageStubs(
  appendix: CaseProofChainAppendix,
  ctx: CaseProofChainContext,
  lines: LineSourceProofRecord[],
  outRoot: string,
): void {
  if (!ctx.originalPdfAvailable) return;
  const pageDir = path.join(outRoot, ctx.caseId, "proof-chain-pages");
  fs.mkdirSync(pageDir, { recursive: true });
  const byPage = new Map<string, LineSourceProofRecord[]>();
  for (const line of lines) {
    if (!line.sourcePageNumber) continue;
    const page = line.sourcePageNumber.split("-")[0] ?? line.sourcePageNumber;
    const bucket = byPage.get(page) ?? [];
    bucket.push(line);
    byPage.set(page, bucket);
  }
  for (const [page, pageLines] of byPage) {
    const stubPath = path.join(pageDir, `p${page}.md`);
    const pdfExcerpt = ctx.pdfPageTexts.get(page)?.slice(0, 600) ?? "(no PDF page text extracted)";
    const content = [
      `# Proof chain page evidence — page ${page}`,
      "",
      `Case: ${ctx.caseId}`,
      `PDF: ${appendix.sourceDocuments[0]?.path ?? "unknown"}`,
      "",
      "## PDF page text (extracted)",
      "",
      "```",
      pdfExcerpt,
      pdfExcerpt.length >= 600 ? "…" : "",
      "```",
      "",
      "## Lines referencing this page",
      "",
      ...pageLines.slice(0, 16).map(
        (l) =>
          `- **${l.proofChainStatus}** — ${l.outputLine.slice(0, 100)}${l.outputLine.length > 100 ? "…" : ""}\n  - Snippet: ${l.extractedSnippet?.slice(0, 80) ?? "none"}`,
      ),
      "",
    ].join("\n");
    fs.writeFileSync(stubPath, content);
  }
}
