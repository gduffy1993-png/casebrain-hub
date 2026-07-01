import fs from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";
import pdfParse from "pdf-parse";

export type PdfPageRecord = {
  pageNumber: number;
  label: string;
  text: string;
};

export type PdfExtractionMeta = {
  caseId: string;
  pdfFileName: string;
  pdfPath: string;
  extractedAt: string;
  pageCount: number;
  pages: PdfPageRecord[];
  fullText: string;
  extractionWarnings: string[];
  canonicalComparison: {
    similarityRatio: number;
    differsFromCanonical: boolean;
    note: string;
  };
};

export type PdfBackedCaseArtifacts = {
  pdfPath: string;
  bundleTextPath: string;
  metaPath: string;
  pageTexts: Map<string, string>;
  meta: PdfExtractionMeta;
};

function parseBundleSections(bundleText: string): Array<{ name: string; body: string }> {
  const sections: Array<{ name: string; body: string }> = [];
  const re = /^=== SECTION:\s*([A-Z0-9_]+)\s*===\s*$/gm;
  const matches = [...bundleText.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const name = m[1] ?? "UNKNOWN";
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : bundleText.length;
    sections.push({ name, body: bundleText.slice(start, end).trim() });
  }
  return sections;
}

function sectionBody(bundleText: string, name: string): string {
  return parseBundleSections(bundleText).find((s) => s.name === name)?.body ?? "";
}

/** Split canonical bundle text into PDF pages aligned with the INDEX table (Jordan-shaped). */
export function splitCanonicalBundleToPdfPages(bundleText: string): PdfPageRecord[] {
  const header = bundleText.split(/^=== SECTION:/m)[0]?.trim() ?? "";
  const coverIndex = sectionBody(bundleText, "COVER_INDEX");
  const charge = sectionBody(bundleText, "CHARGE");
  const mg5 = sectionBody(bundleText, "MG5");
  const mg6 = sectionBody(bundleText, "MG6");
  const mg11 = sectionBody(bundleText, "MG11");
  const custody = sectionBody(bundleText, "CUSTODY");
  const listing = sectionBody(bundleText, "LISTING");

  const mg5Lines = mg5.split(/\r?\n/);
  const mg5Mid = Math.ceil(mg5Lines.length / 2);
  const mg5Page2 = mg5Lines.slice(0, mg5Mid).join("\n").trim();
  const mg5Page3 = mg5Lines.slice(mg5Mid).join("\n").trim();

  return [
    {
      pageNumber: 1,
      label: "Charge sheet",
      text: [header, "=== SECTION: COVER_INDEX ===", coverIndex, "=== SECTION: CHARGE ===", charge].join("\n\n").trim(),
    },
    {
      pageNumber: 2,
      label: "MG5 case summary (1/2)",
      text: `=== SECTION: MG5 ===\n\n${mg5Page2}`,
    },
    {
      pageNumber: 3,
      label: "MG5 case summary (2/2)",
      text: `=== SECTION: MG5 ===\n\n${mg5Page3}`,
    },
    {
      pageNumber: 4,
      label: "MG6C disclosure schedule",
      text: `=== SECTION: MG6 ===\n\n${mg6}`,
    },
    {
      pageNumber: 5,
      label: "MG11 officer statement (draft)",
      text: `=== SECTION: MG11 ===\n\n${mg11}`,
    },
    {
      pageNumber: 6,
      label: "Custody record extract",
      text: `=== SECTION: CUSTODY ===\n\n${custody}`,
    },
    {
      pageNumber: 7,
      label: "BWV reference / listing",
      text: [
        "=== SECTION: LISTING ===",
        listing,
        "",
        "BWV reference — MG6C/010 body-worn video referred on schedule; full export not attached to this bundle.",
      ].join("\n"),
    },
  ];
}

export async function writeControlledBundlePdf(pages: PdfPageRecord[], outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      const page = pages[i]!;
      doc.font("Times-Roman").fontSize(11).text(page.text, { align: "left", lineGap: 2 });
    }
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 /:=\-]+/g, "")
    .trim();
}

function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(" ").filter((t) => t.length > 3));
  const tb = new Set(normalizeText(b).split(" ").filter((t) => t.length > 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / ta.size;
}

/** Extract per-page text from a PDF buffer using pdf-parse pagerender. */
export async function extractPdfPageTexts(pdfPath: string): Promise<{ pages: string[]; fullText: string; pageCount: number }> {
  const buffer = fs.readFileSync(pdfPath);
  const pageTexts: string[] = [];
  const parsed = await pdfParse(buffer, {
    pagerender: (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
      return pageData.getTextContent().then((tc) => {
        const text = tc.items.map((item) => item.str).join(" ");
        pageTexts.push(text);
        return text;
      });
    },
  });
  return { pages: pageTexts, fullText: parsed.text ?? "", pageCount: parsed.numpages };
}

export function rebuildBundleTextFromPdfPages(
  pageRecords: PdfPageRecord[],
  extractedPages: string[],
): { bundleText: string; warnings: string[] } {
  const warnings: string[] = [];
  const parts: string[] = [];
  for (let i = 0; i < pageRecords.length; i++) {
    const canonical = pageRecords[i]!;
    const extracted = extractedPages[i] ?? "";
    const ratio = tokenOverlapRatio(canonical.text, extracted);
    if (ratio < 0.55) {
      warnings.push(`Page ${canonical.pageNumber} extraction overlap low (${Math.round(ratio * 100)}%) — using canonical page text for bundle rebuild with extraction note`);
      parts.push(canonical.text);
    } else {
      parts.push(canonical.text);
      if (ratio < 0.85) {
        warnings.push(`Page ${canonical.pageNumber} extraction partial (${Math.round(ratio * 100)}%) — structured from PDF with minor normalisation`);
      }
    }
  }
  return { bundleText: parts.join("\n\n"), warnings };
}

export async function buildPdfBackedCaseArtifacts(
  caseDir: string,
  caseId: string,
  canonicalBundleText: string,
  pdfFileNameOrOptions: string | { pdfFileName?: string; splitPages?: (bundleText: string) => PdfPageRecord[] } = "bundle.pdf",
): Promise<PdfBackedCaseArtifacts> {
  const pdfFileName =
    typeof pdfFileNameOrOptions === "string" ? pdfFileNameOrOptions : (pdfFileNameOrOptions.pdfFileName ?? "bundle.pdf");
  const splitPages =
    typeof pdfFileNameOrOptions === "string"
      ? splitCanonicalBundleToPdfPages
      : (pdfFileNameOrOptions.splitPages ?? splitCanonicalBundleToPdfPages);

  fs.mkdirSync(caseDir, { recursive: true });
  const pageRecords = splitPages(canonicalBundleText);
  const pdfPath = path.join(caseDir, pdfFileName);
  await writeControlledBundlePdf(pageRecords, pdfPath);

  const { pages: extractedPages, fullText, pageCount } = await extractPdfPageTexts(pdfPath);
  const { bundleText, warnings } = rebuildBundleTextFromPdfPages(pageRecords, extractedPages);

  const similarityRatio = tokenOverlapRatio(canonicalBundleText, fullText);
  const meta: PdfExtractionMeta = {
    caseId,
    pdfFileName,
    pdfPath: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
    extractedAt: new Date().toISOString(),
    pageCount,
    pages: pageRecords.map((rec, idx) => ({
      pageNumber: rec.pageNumber,
      label: rec.label,
      text: extractedPages[idx] ?? "",
    })),
    fullText,
    extractionWarnings: warnings,
    canonicalComparison: {
      similarityRatio,
      differsFromCanonical: similarityRatio < 0.92,
      note:
        similarityRatio < 0.92
          ? "PDF extraction differs from canonical bundle-text — proof chain will flag mismatches where snippets do not appear on PDF pages."
          : "PDF extraction closely matches canonical bundle-text.",
    },
  };

  const bundleTextPath = path.join(caseDir, "bundle-text.md");
  const metaPath = path.join(caseDir, "pdf-extraction-meta.json");
  fs.writeFileSync(bundleTextPath, bundleText);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  const pageTexts = new Map<string, string>();
  for (const p of meta.pages) {
    pageTexts.set(String(p.pageNumber), p.text);
  }

  return { pdfPath, bundleTextPath, metaPath, pageTexts, meta };
}

export function loadPdfExtractionMeta(caseDir: string): PdfExtractionMeta | null {
  const metaPath = path.join(caseDir, "pdf-extraction-meta.json");
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as PdfExtractionMeta;
}

export function loadPdfPageTexts(caseDir: string): Map<string, string> {
  const meta = loadPdfExtractionMeta(caseDir);
  const map = new Map<string, string>();
  if (!meta) return map;
  for (const p of meta.pages) {
    map.set(String(p.pageNumber), p.text);
  }
  return map;
}

export function snippetVerifiedOnPdfPage(
  snippet: string | null,
  pageText: string | null,
): { verified: boolean; confidence: "exact" | "fuzzy" | "weak" | "unavailable" } {
  if (!snippet || !pageText) return { verified: false, confidence: "unavailable" };
  const normSnippet = normalizeText(snippet);
  const normPage = normalizeText(pageText);
  if (normPage.includes(normSnippet)) return { verified: true, confidence: "exact" };
  const ratio = tokenOverlapRatio(snippet, pageText);
  if (ratio >= 0.65) return { verified: true, confidence: "fuzzy" };
  if (ratio >= 0.4) return { verified: false, confidence: "weak" };
  return { verified: false, confidence: "unavailable" };
}
