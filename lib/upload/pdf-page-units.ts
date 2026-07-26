/**
 * Page-aware extraction primitives for the local (non-AI) PDF fallback.
 *
 * The local fallback previously returned only unsplit whole-document text, so every
 * derived finding lost exact-page provenance whenever external extraction was
 * unavailable. These primitives keep independent page units instead.
 *
 * Two page identities are kept strictly separate:
 * - compiledPage — the 1-based position inside the compiled PDF. Known whenever the
 *   parser yielded that page, including empty scanned pages.
 * - sourcePage   — the source document's own printed pagination. Populated ONLY from
 *   pagination actually printed on the page. Never derived from compiled position.
 */

import { Buffer } from "node:buffer";

export type ExtractedPageUnit = {
  /** 1-based page position within the compiled PDF. Always known for a real page. */
  compiledPage: number;
  /** Source-document pagination, only when printed on the page itself. */
  sourcePage: number | null;
  /** Printed "of N" total when present — used to corroborate source pagination. */
  sourcePageTotal: number | null;
  text: string;
  /** True when the page carries no usable text layer (scanned / OCR pending). */
  textLayerEmpty: boolean;
};

/** Below this many non-whitespace characters a page is treated as having no text layer. */
const MIN_TEXT_LAYER_CHARS = 12;

/**
 * Printed pagination in a header/footer band. Anchored to line start/end so that
 * "page 3 of the transcript" in body prose cannot be mistaken for pagination.
 */
const PRINTED_PAGINATION_PATTERNS: RegExp[] = [
  /^\s*(?:page|pg\.?|p\.)\s*(\d{1,4})\s*(?:of|\/)\s*(\d{1,4})\s*$/i,
  /^\s*(?:page|pg\.?|p\.)\s*(\d{1,4})\s*$/i,
  /^\s*-\s*(\d{1,4})\s*-\s*$/,
];

/** Number of leading/trailing lines treated as the header/footer band. */
const HEADER_FOOTER_BAND = 3;

export function pageHasTextLayer(text: string): boolean {
  return text.replace(/\s+/g, "").length >= MIN_TEXT_LAYER_CHARS;
}

/**
 * Read printed pagination from a page's header/footer band.
 * Returns null when the page prints no pagination — the caller must NOT substitute
 * the compiled position, because that would invent source-document pagination.
 */
export function readPrintedSourcePagination(
  text: string,
): { sourcePage: number; sourcePageTotal: number | null } | null {
  const lines = text.split(/\r?\n/);
  const band = [
    ...lines.slice(0, HEADER_FOOTER_BAND),
    ...lines.slice(Math.max(HEADER_FOOTER_BAND, lines.length - HEADER_FOOTER_BAND)),
  ];
  for (const line of band) {
    for (const re of PRINTED_PAGINATION_PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      const page = parseInt(m[1]!, 10);
      if (!Number.isFinite(page) || page <= 0) continue;
      const totalRaw = m[2] ? parseInt(m[2], 10) : NaN;
      return {
        sourcePage: page,
        sourcePageTotal: Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : null,
      };
    }
  }
  return null;
}

/**
 * Turn already-separated compiled page texts into page units.
 * Empty pages are retained: a scanned page still has a known compiled identity, and
 * dropping it would silently renumber every later page.
 */
export function buildPageUnitsFromCompiledPageTexts(pageTexts: string[]): ExtractedPageUnit[] {
  return pageTexts.map((raw, idx) => {
    const text = raw ?? "";
    const printed = readPrintedSourcePagination(text);
    return {
      compiledPage: idx + 1,
      sourcePage: printed?.sourcePage ?? null,
      sourcePageTotal: printed?.sourcePageTotal ?? null,
      text,
      textLayerEmpty: !pageHasTextLayer(text),
    };
  });
}

/**
 * Split already-extracted text into compiled pages when the extractor preserved
 * form feeds. Returns null when the text carries no reliable page separator —
 * callers must then keep the text unsplit rather than guess boundaries.
 */
export function splitCompiledPagesFromFormFeeds(text: string): string[] | null {
  if (!text.includes("\f")) return null;
  const parts = text.split("\f");
  // Trailing form feed after the final page is common and is not an extra page.
  while (parts.length > 1 && !parts[parts.length - 1]!.trim()) parts.pop();
  if (parts.length < 2) return null;
  return parts;
}

/**
 * Page units from raw text. Uses form feeds when present; otherwise reports that the
 * text could not be split, so the caller keeps explicit unknown page identity.
 */
export function pageUnitsFromExtractedText(text: string): ExtractedPageUnit[] | null {
  const split = splitCompiledPagesFromFormFeeds(text);
  if (!split) return null;
  return buildPageUnitsFromCompiledPageTexts(split);
}

/**
 * Renders one PDF page to text, matching the parser's default layout heuristic.
 * Kept here (rather than beside the parser call) so this module stays free of any
 * server-only dependency and can be imported from shared canonical code.
 */
export function renderPageTextFromItems(
  items: Array<{ str: string; transform?: number[] }>,
): string {
  let lastY: number | undefined;
  let text = "";
  for (const item of items) {
    const y = item.transform?.[5];
    if (lastY === y || lastY === undefined) text += item.str;
    else text += `\n${item.str}`;
    lastY = y;
  }
  return text;
}

/** Serialisable form persisted on the document record so later loads stay page-aware. */
export type PersistedPageUnit = {
  compiledPage: number;
  sourcePage: number | null;
  text: string;
  textLayerEmpty: boolean;
};

export function toPersistedPageUnits(units: ExtractedPageUnit[]): PersistedPageUnit[] {
  return units.map((u) => ({
    compiledPage: u.compiledPage,
    sourcePage: u.sourcePage,
    text: u.text,
    textLayerEmpty: u.textLayerEmpty,
  }));
}

/**
 * Solicitor-visible limitation for a PDF whose pages carry no text layer.
 * Scanned pages must stay visible as known-but-unreadable, never silently dropped.
 */
export const SCANNED_PAGE_LIMITATION =
  "Page is present in the compiled bundle but carries no extractable text layer (scanned image / OCR not available)";

export function summariseTextLayerCoverage(units: ExtractedPageUnit[]): {
  totalPages: number;
  pagesWithText: number;
  pagesWithoutText: number;
  scannedPageNumbers: number[];
  limitation: string | null;
} {
  const without = units.filter((u) => u.textLayerEmpty);
  return {
    totalPages: units.length,
    pagesWithText: units.length - without.length,
    pagesWithoutText: without.length,
    scannedPageNumbers: without.map((u) => u.compiledPage),
    limitation: without.length
      ? `${SCANNED_PAGE_LIMITATION} — compiled pages ${without.map((u) => u.compiledPage).join(", ")}`
      : null,
  };
}
