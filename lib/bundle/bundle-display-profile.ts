import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";

/** Combined text length suggesting a large single-PDF bundle (not "thin"). */
export const LARGE_BUNDLE_TEXT_CHARS = 120_000;
/** Page count from metadata — treat as large when at or above this. */
export const LARGE_BUNDLE_PAGE_THRESHOLD = 150;
/** Below this, extracted text coverage is genuinely thin. */
export const THIN_BUNDLE_TEXT_CHARS = 8_000;

export type BundleSizeProfile = {
  documentCount: number;
  pdfCount: number;
  pageCount: number | null;
  combinedTextLength: number;
  isLargeByText: boolean;
  isLargeByPages: boolean;
};

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M chars`;
  if (n >= 1000) return `${Math.round(n / 1000)}k chars`;
  return `${n} chars`;
}

/** Page count from document metadata or filename — never invented. */
export function inferDocumentPageCount(doc: {
  name?: string | null;
  extracted_json?: unknown;
}): number | null {
  const ej = doc.extracted_json;
  if (ej && typeof ej === "object") {
    const o = ej as Record<string, unknown>;
    for (const key of ["pageCount", "pages", "numPages", "page_count", "totalPages"]) {
      const v = o[key];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
      if (typeof v === "string" && /^\d+$/.test(v.trim())) {
        const n = parseInt(v.trim(), 10);
        if (n > 0) return n;
      }
    }
  }
  const name = typeof doc.name === "string" ? doc.name : "";
  const m = name.match(/(\d{2,5})\s*[_-]?\s*page/i);
  if (m?.[1]) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n < 50_000) return n;
  }
  return null;
}

/** Explicit page count in bundle front matter (e.g. "1 PDF / 1000 pages"). */
export function inferPageCountFromTextHint(text: string): number | null {
  const scan = text.slice(0, 40_000);
  const bundleSize = scan.match(/\b\d+\s*PDF\s*\/\s*(\d{2,5})\s*pages?\b/i);
  if (bundleSize?.[1]) {
    const n = parseInt(bundleSize[1], 10);
    if (n > 0 && n < 50_000) return n;
  }
  return null;
}

export function buildBundleSizeProfile(
  documentCount: number,
  combinedTextLength: number,
  docs: Array<{ name?: string | null; extracted_json?: unknown }> = [],
  documentRows?: DocumentRowMeta[],
  textHint?: string,
): BundleSizeProfile {
  let pageCount: number | null = null;
  let pdfCount = 0;

  const sources =
    documentRows?.map((r) => ({ name: r.name, lenBody: r.lenBody })) ??
    docs.map((d) => ({ name: d.name, lenBody: 0 }));

  const pageSources =
    documentRows && documentRows.length > 0
      ? documentRows.map((r) => ({ name: r.name, extracted_json: undefined as unknown }))
      : docs;

  for (const doc of pageSources) {
    const name = typeof doc.name === "string" ? doc.name.toLowerCase() : "";
    if (name.endsWith(".pdf") || name.includes(".pdf")) pdfCount += 1;
    const pages = inferDocumentPageCount(doc);
    if (pages != null) pageCount = (pageCount ?? 0) + pages;
  }

  if (pageCount == null && textHint) {
    pageCount = inferPageCountFromTextHint(textHint);
  }

  if (pdfCount === 0 && documentCount > 0) {
    const namedPdf = sources.filter((s) => (s.name ?? "").toLowerCase().includes(".pdf")).length;
    pdfCount = namedPdf > 0 ? namedPdf : documentCount === 1 ? 1 : 0;
  }

  const isLargeByText = combinedTextLength >= LARGE_BUNDLE_TEXT_CHARS;
  const isLargeByPages = pageCount != null && pageCount >= LARGE_BUNDLE_PAGE_THRESHOLD;

  return {
    documentCount,
    pdfCount: pdfCount || (documentCount === 1 ? 1 : 0),
    pageCount,
    combinedTextLength,
    isLargeByText,
    isLargeByPages,
  };
}

export type BundleHealthLabelInput = {
  documentCount: number;
  combinedTextLength: number;
  capabilityTier?: string | null;
  hasBattleboardMaterial?: boolean;
  battleboardOverallStatus?: string | null;
  documentRows?: DocumentRowMeta[];
  docs?: Array<{ name?: string | null; extracted_json?: unknown }>;
  bundleTextHint?: string | null;
};

/**
 * Solicitor-safe bundle health label. "Thin" reflects low extracted text / coverage,
 * not a single uploaded PDF.
 */
export function formatBundleHealthLabel(input: BundleHealthLabelInput): string {
  const {
    documentCount: docCount,
    combinedTextLength: combinedLen,
    capabilityTier: tier,
    hasBattleboardMaterial: hasAnchors = false,
    battleboardOverallStatus,
  } = input;

  if (battleboardOverallStatus === "thin_bundle" && !hasAnchors) {
    return "Thin bundle — provisional routes only";
  }
  if (battleboardOverallStatus === "needs_review") {
    return "Routes need solicitor review";
  }

  if (docCount === 0 && combinedLen === 0 && !hasAnchors) {
    return "Thin (no documents on record)";
  }
  if (docCount === 0 && hasAnchors) {
    return "Documents detected — summary still provisional";
  }
  if (docCount === 0 && combinedLen > 0) {
    return `Text on file (${formatChars(combinedLen)}) — doc count pending`;
  }

  const profile = buildBundleSizeProfile(
    docCount,
    combinedLen,
    input.docs ?? [],
    input.documentRows,
    input.bundleTextHint ?? undefined,
  );

  if (profile.isLargeByPages || profile.isLargeByText) {
    if (profile.pageCount != null && profile.documentCount > 0) {
      const fileLabel =
        profile.pdfCount === profile.documentCount && profile.documentCount === 1
          ? "1 PDF"
          : `${profile.documentCount} file${profile.documentCount !== 1 ? "s" : ""}`;
      return `Large bundle detected — ${fileLabel} / ${profile.pageCount} pages`;
    }
    if (profile.isLargeByText) {
      return `Large bundle — substantial text on file (${formatChars(combinedLen)}) — source review required`;
    }
    return "Large bundle — extraction partial/provisional";
  }

  if (combinedLen > 0 && combinedLen < THIN_BUNDLE_TEXT_CHARS && !hasAnchors && tier === "thin") {
    return `Thin pack — limited extracted text (${formatChars(combinedLen)})`;
  }

  const tierLabel =
    tier === "full"
      ? "Strong"
      : tier === "partial"
        ? "Partial"
        : hasAnchors
          ? "Partial (on file text)"
          : combinedLen >= 40_000
            ? "Partial"
            : "Thin";

  const textSuffix = combinedLen > 0 ? ` · ${formatChars(combinedLen)} text` : "";
  if (profile.pageCount != null && docCount > 0) {
    return `${tierLabel} (${docCount} file${docCount !== 1 ? "s" : ""} / ${profile.pageCount} pages${textSuffix})`;
  }
  return `${tierLabel} (${docCount} doc${docCount !== 1 ? "s" : ""}${textSuffix})`;
}
