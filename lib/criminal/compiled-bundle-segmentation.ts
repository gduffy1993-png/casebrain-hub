/**
 * Document-boundary detection inside a compiled PDF bundle.
 *
 * A compiled bundle is one PDF containing many source documents. Compiled page
 * numbers are always known; the source document a page belongs to is only known when
 * the page itself supports it. This module never guesses:
 * - a source-document title is assigned only from a boundary the page evidences;
 * - source pagination is only ever the pagination printed on the page;
 * - pages with no supporting boundary stay attributed to the compiled bundle alone.
 */

import type { ExtractedPageUnit } from "@/lib/upload/pdf-page-units";

export type BoundaryBasis =
  /** A document-title style header appears in the page's header band. */
  | "printed_header"
  /** Printed source pagination restarted at 1 (or fell backwards). */
  | "pagination_restart"
  /** An explicit separator/terminator line marks a document break. */
  | "document_separator"
  /** First page of the bundle — a boundary by position, with no title claim. */
  | "bundle_start";

export type CompiledBundleSegment = {
  segmentIndex: number;
  startCompiledPage: number;
  endCompiledPage: number;
  /** Null unless a boundary header actually named the document. */
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  basis: BoundaryBasis;
  /** True when the segment's identity rests on page evidence, not position alone. */
  identitySupported: boolean;
};

export type PageSourceIdentity = {
  compiledPage: number;
  /** Printed source pagination only — never the compiled position. */
  sourcePage: number | null;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  segmentIndex: number;
  identitySupported: boolean;
  textLayerEmpty: boolean;
};

/** Header band inspected for titles/separators. */
const HEADER_BAND_LINES = 4;

/** Generic legal document families — document types, not case-specific wording. */
const DOCUMENT_TYPE_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: "indictment", re: /\bindictment\b/i },
  { type: "charge_sheet", re: /\bcharge\s*sheet\b/i },
  { type: "statement", re: /\b(witness\s+statement|mg\s*11|statement\s+of\s+witness)\b/i },
  { type: "custody_record", re: /\b(custody\s+record|detention\s+log)\b/i },
  { type: "interview_record", re: /\b(record\s+of\s+(?:taped\s+)?interview|rot\b|interview\s+record)\b/i },
  { type: "exhibit_list", re: /\b(exhibit\s+(?:list|schedule)|schedule\s+of\s+exhibits)\b/i },
  { type: "hearing_notice", re: /\b(notice\s+of\s+hearing|hearing\s+notice|listing\s+notice)\b/i },
  { type: "medical_report", re: /\b(medical\s+report|clinical\s+notes?|a\s*&\s*e\s+record)\b/i },
  { type: "telecoms_report", re: /\b(phone\s+download|telecoms?\s+report|cell\s*site|subscriber\s+check)\b/i },
  { type: "correspondence", re: /\b(letter|email|memorandum)\b/i },
];

/** Explicit end/start-of-document separators produced by bundling software. */
const SEPARATOR_PATTERNS: RegExp[] = [
  /^\s*[-=_*]{3,}\s*$/,
  /^\s*(?:end\s+of\s+(?:document|statement|report)|document\s+ends)\b/i,
  /^\s*(?:start|beginning)\s+of\s+(?:document|statement|report)\b/i,
  /^\s*={2,}.+={2,}\s*$/,
];

function headerBand(text: string): string[] {
  return text
    .split(/\r?\n/)
    .slice(0, HEADER_BAND_LINES)
    .map((l) => l.trim())
    .filter(Boolean);
}

function inferDocumentTypeFromLine(line: string): string | null {
  for (const { type, re } of DOCUMENT_TYPE_PATTERNS) {
    if (re.test(line)) return type;
  }
  return null;
}

/**
 * A header line qualifies as a document title only when it both looks like a heading
 * (short, title/upper cased) and names a recognisable document family. Prose that
 * merely mentions a document type is not a boundary.
 */
export function readBoundaryTitleFromPage(
  text: string,
): { title: string; documentType: string } | null {
  for (const line of headerBand(text)) {
    if (line.length < 4 || line.length > 90) continue;
    const type = inferDocumentTypeFromLine(line);
    if (!type) continue;
    const letters = line.replace(/[^A-Za-z]/g, "");
    if (!letters) continue;
    const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
    const looksLikeHeading = upperRatio >= 0.6 || /^[A-Z][A-Za-z'’\-]*(?:\s+[A-Z0-9][A-Za-z'’\-]*)*$/.test(line);
    if (!looksLikeHeading) continue;
    // A heading ending in sentence punctuation is prose, not a title block.
    if (/[.;:,]$/.test(line) && !/\bno\.?$/i.test(line)) continue;
    return { title: line.replace(/\s{2,}/g, " ").trim(), documentType: type };
  }
  return null;
}

function hasSeparator(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const band = [...lines.slice(0, HEADER_BAND_LINES), ...lines.slice(-HEADER_BAND_LINES)];
  return band.some((l) => l.length > 0 && SEPARATOR_PATTERNS.some((re) => re.test(l)));
}

/**
 * Detect segments. Every page belongs to exactly one segment; a segment only claims a
 * source-document identity when a boundary on its first page supports it.
 */
export function detectCompiledBundleSegments(
  units: ExtractedPageUnit[],
): CompiledBundleSegment[] {
  if (!units.length) return [];

  const segments: CompiledBundleSegment[] = [];
  let previousPrintedPage: number | null = null;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    const boundaryTitle = readBoundaryTitleFromPage(unit.text);
    const paginationRestart =
      unit.sourcePage != null &&
      previousPrintedPage != null &&
      unit.sourcePage <= previousPrintedPage;
    const separatorBefore = i > 0 && hasSeparator(units[i - 1]!.text);

    let basis: BoundaryBasis | null = null;
    if (i === 0) basis = boundaryTitle ? "printed_header" : "bundle_start";
    else if (boundaryTitle) basis = "printed_header";
    else if (paginationRestart) basis = "pagination_restart";
    else if (separatorBefore) basis = "document_separator";

    if (basis) {
      segments.push({
        segmentIndex: segments.length,
        startCompiledPage: unit.compiledPage,
        endCompiledPage: unit.compiledPage,
        sourceDocumentTitle: boundaryTitle?.title ?? null,
        sourceDocumentType: boundaryTitle?.documentType ?? null,
        basis,
        identitySupported: Boolean(boundaryTitle),
      });
    } else if (segments.length) {
      segments[segments.length - 1]!.endCompiledPage = unit.compiledPage;
    }

    if (unit.sourcePage != null) previousPrintedPage = unit.sourcePage;
  }

  return segments;
}

/**
 * Per-page source identity. Pages inherit their segment's title only when that
 * segment's identity was supported by page evidence.
 */
export function assignSourceIdentityToPages(
  units: ExtractedPageUnit[],
): PageSourceIdentity[] {
  const segments = detectCompiledBundleSegments(units);
  return units.map((unit) => {
    const seg =
      segments.find(
        (s) => unit.compiledPage >= s.startCompiledPage && unit.compiledPage <= s.endCompiledPage,
      ) ?? null;
    const supported = Boolean(seg?.identitySupported);
    return {
      compiledPage: unit.compiledPage,
      sourcePage: unit.sourcePage,
      sourceDocumentTitle: supported ? seg!.sourceDocumentTitle : null,
      sourceDocumentType: supported ? seg!.sourceDocumentType : null,
      segmentIndex: seg?.segmentIndex ?? 0,
      identitySupported: supported,
      textLayerEmpty: unit.textLayerEmpty,
    };
  });
}

/**
 * Limitation wording when a compiled bundle could not be resolved into named source
 * documents. The bundle and its compiled pages remain fully citable.
 */
export const UNRESOLVED_SOURCE_DOCUMENT_LIMITATION =
  "Compiled bundle page is exactly identified, but the source document it belongs to is not evidenced on the page — cite the compiled page";
