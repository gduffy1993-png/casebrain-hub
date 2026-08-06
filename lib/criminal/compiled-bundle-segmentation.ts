/**
 * Document-boundary detection inside a compiled PDF bundle.
 *
 * A compiled bundle is one PDF containing many source documents. Compiled page
 * numbers are always known; a logical-document identity is assigned only when a
 * page evidences a boundary in its header/footer band. Continuation pages that
 * repeat the same heading keep that identity — they do not start a new document.
 *
 * Never:
 * - invent a source document from a body mention;
 * - collapse every page back into the parent when supported boundaries exist;
 * - synthesise source pagination from the compiled position.
 */

import type { ExtractedPageUnit } from "@/lib/upload/pdf-page-units";
import { readPrintedSourcePagination } from "@/lib/upload/pdf-page-units";

export type BoundaryBasis =
  | "printed_header"
  | "form_identifier"
  | "pagination_restart"
  | "document_separator"
  | "bundle_start"
  | "continuation";

export type CompiledBundleSegment = {
  segmentIndex: number;
  startCompiledPage: number;
  endCompiledPage: number;
  /** Null unless a boundary header/form identifier named the document. */
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  basis: BoundaryBasis;
  /** True when the segment's identity rests on page evidence, not position alone. */
  identitySupported: boolean;
  /** Stable key used to recognise continuation of the same logical document. */
  identityKey: string | null;
};

export type PageSourceIdentity = {
  compiledPage: number;
  sourcePage: number | null;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  segmentIndex: number;
  identitySupported: boolean;
  textLayerEmpty: boolean;
  /** Parent compiled-PDF label when the page has no supported logical identity. */
  parentOnly: boolean;
};

export type BoundaryCandidate = {
  compiledPage: number;
  title: string | null;
  documentType: string | null;
  identityKey: string | null;
  basis: BoundaryBasis | null;
  headerEvidence: string[];
  footerEvidence: string[];
  continuesPrior: boolean;
};

const HEADER_BAND_LINES = 8;
const FOOTER_BAND_LINES = 4;

/**
 * Generic legal / police document families. Patterns are form- and heading-based —
 * never case-specific names.
 */
const DOCUMENT_TYPE_PATTERNS: Array<{ type: string; re: RegExp; titleHint?: string }> = [
  { type: "indictment", re: /\bindictment\b/i },
  { type: "charge_sheet", re: /\bcharge\s*sheet\b/i },
  { type: "statement", re: /\b(witness\s+statement|mg\s*11|statement\s+of\s+witness)\b/i },
  { type: "custody_record", re: /\b(custody\s+record|detention\s+log)\b/i },
  { type: "interview_record", re: /\b(pace\s+(?:audio\s+)?interview|record\s+of\s+(?:taped\s+)?interview|interview\s+record)\b/i },
  { type: "exhibit_list", re: /\b(exhibit\s+(?:list|schedule|continuity)|schedule\s+of\s+exhibits)\b/i },
  { type: "hearing_notice", re: /\b(notice\s+of\s+hearing|hearing\s+notice|listing\s+notice|case\s+management\s+notice|ptph\s+notice)\b/i },
  { type: "medical_report", re: /\b(medical\s+report|clinical\s+(?:record|notes?)|a\s*&\s*e\s+record|hospital\s+record)\b/i },
  { type: "telecoms_report", re: /\b(phone\s+download|mobile\s+device\s+extraction|telecoms?\s+report|cell\s*site|subscriber\s+check|attribution\s+report)\b/i },
  { type: "disclosure_schedule", re: /\b(mg\s*6c|unused\s+material|disclosure\s+schedule)\b/i },
  { type: "disclosure_record", re: /\b(mg\s*6\b|disclosure\s+and\s+service)\b/i },
  { type: "offence_report", re: /\b(mg\s*5\b|offence\s+report|case\s+summary)\b/i },
  { type: "digital_media", re: /\b(digital\s+media|incident\s+records?|cctv\s+(?:schedule|log))\b/i },
  { type: "bundle_index", re: /\b(bundle\s+index|document\s+control|case\s+papers)\b/i },
  { type: "correspondence", re: /^\s*(letter|email|memorandum)\b|\b(secure\s+)?case\s+correspondence\b|\blegal\s+correspondence\b/i },
];

const FORM_ID_PATTERN =
  /\b(MG\s*\d+[A-Z]?|ROT|PTPH|MG11)\b(?:\s*[-–—:]\s*([^\n|]{3,80}))?/i;

const CONTINUATION_PATTERN =
  /\b(continuation|continued|cont\.?)\b/i;

const SEPARATOR_PATTERNS: RegExp[] = [
  /^\s*[-=_*]{3,}\s*$/,
  /^\s*(?:end\s+of\s+(?:document|statement|report)|document\s+ends)\b/i,
  /^\s*(?:start|beginning)\s+of\s+(?:document|statement|report)\b/i,
  /^\s*={2,}.+={2,}\s*$/,
];

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function headerBand(text: string): string[] {
  return linesOf(text).slice(0, HEADER_BAND_LINES);
}

function footerBand(text: string): string[] {
  const lines = linesOf(text);
  return lines.slice(Math.max(0, lines.length - FOOTER_BAND_LINES));
}

function inferDocumentTypeFromLine(line: string): string | null {
  for (const { type, re } of DOCUMENT_TYPE_PATTERNS) {
    if (re.test(line)) return type;
  }
  return null;
}

function looksLikeHeading(line: string): boolean {
  if (line.length < 4 || line.length > 120) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
  if (upperRatio >= 0.55) return true;
  if (/^[A-Z0-9][A-Za-z0-9'’\- /]*(?:\s+[A-Z0-9][A-Za-z0-9'’\- /]*)*$/.test(line)) return true;
  // Form identifiers "MG5 - Offence report / case summary" are headings even mixed-case.
  if (FORM_ID_PATTERN.test(line)) return true;
  return false;
}

function normaliseIdentityKey(title: string, documentType: string | null): string {
  return `${(documentType ?? "doc").toLowerCase()}::${title
    .toLowerCase()
    .replace(/\b(continuation|continued|cont\.?)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()}`;
}

function isCaptionOrMetaLine(line: string): boolean {
  return (
    /\bR\s*v\b/i.test(line) ||
    /\bcompiled\s+page\b/i.test(line) ||
    /\bsource\s+page\b/i.test(line) ||
    /\bOFFICIAL\b/.test(line) ||
    /\bCONFIDENTIAL\b/.test(line) ||
    /\bCase\s+No\.?\b/i.test(line) ||
    /^\s*URN\b/i.test(line)
  );
}

/**
 * Read a boundary title from header (preferred) or footer band. Body prose is never
 * inspected — a body mention of "witness statement" must not create a boundary.
 * Case captions and per-page "COMPILED PAGE N" meta lines are never used as titles.
 */
export function readBoundaryTitleFromPage(
  text: string,
): { title: string; documentType: string; basis: BoundaryBasis; evidence: string[] } | null {
  const header = headerBand(text);
  const footer = footerBand(text);
  const bands: Array<{ lines: string[] }> = [{ lines: header }, { lines: footer }];

  for (const { lines } of bands) {
    for (const line of lines) {
      if (!looksLikeHeading(line)) continue;
      if (isCaptionOrMetaLine(line) && !FORM_ID_PATTERN.test(line) && !inferDocumentTypeFromLine(line)) {
        continue;
      }
      if (/[.;]$/.test(line) && !/\bno\.?$/i.test(line) && !FORM_ID_PATTERN.test(line)) continue;

      const form = line.match(FORM_ID_PATTERN);
      if (form) {
        const type =
          inferDocumentTypeFromLine(line) ??
          (form[1]!.toUpperCase().replace(/\s+/g, "").startsWith("MG5")
            ? "offence_report"
            : form[1]!.toUpperCase().replace(/\s+/g, "").startsWith("MG6C")
              ? "disclosure_schedule"
              : form[1]!.toUpperCase().replace(/\s+/g, "").startsWith("MG6")
                ? "disclosure_record"
                : form[1]!.toUpperCase().replace(/\s+/g, "").startsWith("MG11")
                  ? "statement"
                  : "case_document");
        const title = line.replace(/\s{2,}/g, " ").trim().slice(0, 120);
        return {
          title,
          documentType: type,
          basis: "form_identifier",
          evidence: [line],
        };
      }

      const type = inferDocumentTypeFromLine(line);
      if (!type) continue;
      // Prefer the typed heading itself. Only refine with short lifecycle/subtitle
      // lines of the *same* document family — never promote body captions that
      // happen to contain another family's tokens (e.g. "…interview record").
      let title = line.replace(/\s{2,}/g, " ").trim().slice(0, 120);
      for (const other of lines) {
        if (other === line) continue;
        if (!looksLikeHeading(other) || isCaptionOrMetaLine(other)) continue;
        const otherType = inferDocumentTypeFromLine(other);
        const lifecycle =
          /\b(amended|superseded|original|proposed|draft|signed|final|continuation|first|second)\b/i.test(
            other,
          );
        if (otherType && otherType !== type) continue;
        if (!lifecycle && otherType !== type) continue;
        if (!lifecycle && !otherType) continue;
        const wordCount = (other.match(/[A-Za-z0-9']+/g) ?? []).length;
        if (wordCount > 10 || other.length > 90) continue;
        if (/\b(that|which|times that|conflict with)\b/i.test(other)) continue;
        if (other.length > title.length) {
          title = other.replace(/\s{2,}/g, " ").trim();
        }
      }
      // Generic OCR stutter: repeated consecutive tokens collapse to one.
      title = title.replace(/\b([A-Za-z][A-Za-z'-]{1,40})\s+\1\b/g, "$1");
      return {
        title,
        documentType: type,
        basis: "printed_header",
        evidence: [line, title].filter((v, i, a) => a.indexOf(v) === i),
      };
    }
  }
  return null;
}

function hasSeparator(text: string): boolean {
  const band = [...headerBand(text), ...footerBand(text)];
  return band.some((l) => SEPARATOR_PATTERNS.some((re) => re.test(l)));
}

/**
 * Enumerate every page that could start (or continue) a logical document, with the
 * evidence that supports it. Used by diagnostics and by the segmenter.
 */
export function listBoundaryCandidates(units: ExtractedPageUnit[]): BoundaryCandidate[] {
  const out: BoundaryCandidate[] = [];
  let previousKey: string | null = null;

  for (const unit of units) {
    const boundary = readBoundaryTitleFromPage(unit.text);
    const printed = readPrintedSourcePagination(unit.text);
    const continuationMarked = CONTINUATION_PATTERN.test(headerBand(unit.text).join(" "));
    const identityKey = boundary
      ? normaliseIdentityKey(boundary.title, boundary.documentType)
      : null;
    const continuesPrior =
      Boolean(identityKey && previousKey && identityKey === previousKey) ||
      (continuationMarked && previousKey != null && identityKey === previousKey);

    let basis: BoundaryBasis | null = null;
    if (boundary && !continuesPrior) basis = boundary.basis;
    else if (boundary && continuesPrior) basis = "continuation";
    else if (
      printed?.sourcePage === 1 &&
      previousKey != null
    ) {
      // Printed pagination restart alone is a weak signal — only a candidate if no
      // title is available; the segmenter will not invent a title from it.
      basis = "pagination_restart";
    }

    if (boundary || basis === "pagination_restart") {
      out.push({
        compiledPage: unit.compiledPage,
        title: boundary?.title ?? null,
        documentType: boundary?.documentType ?? null,
        identityKey,
        basis,
        headerEvidence: headerBand(unit.text).slice(0, 4),
        footerEvidence: footerBand(unit.text).slice(0, 2),
        continuesPrior,
      });
    }

    if (identityKey) previousKey = identityKey;
  }
  return out;
}

/**
 * Detect segments. Every page belongs to exactly one segment.
 * A new segment starts only on an evidenced boundary that is not a continuation of
 * the immediately preceding logical document. Continuation pages inherit identity.
 */
export function detectCompiledBundleSegments(
  units: ExtractedPageUnit[],
): CompiledBundleSegment[] {
  if (!units.length) return [];

  const segments: CompiledBundleSegment[] = [];
  let previousPrintedPage: number | null = null;
  let currentKey: string | null = null;
  let currentType: string | null = null;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    const boundary = readBoundaryTitleFromPage(unit.text);
    const identityKey = boundary
      ? normaliseIdentityKey(boundary.title, boundary.documentType)
      : null;
    const continuationMarked = CONTINUATION_PATTERN.test(headerBand(unit.text).join(" "));
    const sameAsCurrent =
      identityKey != null && currentKey != null && identityKey === currentKey;
    const printed = unit.sourcePage;
    const paginationRestart =
      printed != null &&
      previousPrintedPage != null &&
      printed <= previousPrintedPage;
    const contiguousPrinted =
      printed != null &&
      previousPrintedPage != null &&
      printed === previousPrintedPage + 1;
    const sameFamilyContiguous =
      Boolean(
        boundary &&
          currentType &&
          boundary.documentType === currentType &&
          contiguousPrinted &&
          !paginationRestart,
      );
    const separatorBefore = i > 0 && hasSeparator(units[i - 1]!.text);

    let startNew = false;
    let basis: BoundaryBasis = "bundle_start";
    let title: string | null = null;
    let type: string | null = null;
    let identitySupported = false;
    let key: string | null = null;

    if (i === 0) {
      startNew = true;
      if (boundary) {
        basis = boundary.basis;
        title = boundary.title;
        type = boundary.documentType;
        identitySupported = true;
        key = identityKey;
      } else {
        basis = "bundle_start";
      }
    } else if (boundary && sameAsCurrent && continuationMarked) {
      // Explicit continuation of the same logical document.
      segments[segments.length - 1]!.endCompiledPage = unit.compiledPage;
    } else if (boundary && sameAsCurrent && paginationRestart) {
      // Same heading but printed pagination restarted (e.g. "7 of 7" → "1 of 6"):
      // a new instance of the same form family, not a continuation page.
      startNew = true;
      basis = "pagination_restart";
      title = boundary.title;
      type = boundary.documentType;
      identitySupported = true;
      key = identityKey;
    } else if (boundary && sameAsCurrent) {
      // Repeated heading with advancing source pages — continuation.
      segments[segments.length - 1]!.endCompiledPage = unit.compiledPage;
    } else if (boundary && sameFamilyContiguous) {
      // Same document family with contiguous printed pagination — continue even
      // when a section caption briefly diverged the identity key.
      segments[segments.length - 1]!.endCompiledPage = unit.compiledPage;
    } else if (boundary) {
      startNew = true;
      basis = boundary.basis;
      title = boundary.title;
      type = boundary.documentType;
      identitySupported = true;
      key = identityKey;
    } else if (paginationRestart) {
      startNew = true;
      basis = "pagination_restart";
      identitySupported = false;
      key = null;
    } else if (separatorBefore) {
      startNew = true;
      basis = "document_separator";
      identitySupported = false;
      key = null;
    } else if (segments.length) {
      segments[segments.length - 1]!.endCompiledPage = unit.compiledPage;
    }

    if (startNew) {
      segments.push({
        segmentIndex: segments.length,
        startCompiledPage: unit.compiledPage,
        endCompiledPage: unit.compiledPage,
        sourceDocumentTitle: title,
        sourceDocumentType: type,
        basis,
        identitySupported,
        identityKey: key,
      });
      currentKey = key;
      currentType = type;
    }

    if (unit.sourcePage != null) previousPrintedPage = unit.sourcePage;
    else if (boundary?.title) {
      // Keep currentKey even when printed pagination is absent.
      currentKey = key ?? currentKey;
      if (type) currentType = type;
    }
  }

  return segments;
}

export function assignSourceIdentityToPages(
  units: ExtractedPageUnit[],
): PageSourceIdentity[] {
  const segments = detectCompiledBundleSegments(units);
  return units.map((unit) => {
    const seg =
      segments.find(
        (s) =>
          unit.compiledPage >= s.startCompiledPage && unit.compiledPage <= s.endCompiledPage,
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
      parentOnly: !supported,
    };
  });
}

/**
 * Convert page units of one compiled PDF into logical UploadedDocumentUnit-shaped
 * segments. Parent compiled identity is retained on every child via compiledPage;
 * unsupported pages remain under a parent-only unit rather than inventing titles.
 */
export type LogicalDocumentDraft = {
  id: string;
  title: string;
  documentType: string | null;
  pages: Array<{
    pageNumber: number | null;
    compiledPage: number;
    text: string;
    pageIdentityKnown: boolean;
  }>;
  parentCompiledDocumentId: string;
  identitySupported: boolean;
  basis: BoundaryBasis;
};

export function splitPageUnitsIntoLogicalDocuments(input: {
  parentId: string;
  parentTitle: string;
  pageUnits: ExtractedPageUnit[];
  uploadOrderBase?: number;
}): LogicalDocumentDraft[] {
  const { parentId, parentTitle, pageUnits } = input;
  if (!pageUnits.length) return [];

  const segments = detectCompiledBundleSegments(pageUnits);
  const drafts: LogicalDocumentDraft[] = [];

  for (const seg of segments) {
    const pages = pageUnits
      .filter(
        (u) =>
          u.compiledPage >= seg.startCompiledPage && u.compiledPage <= seg.endCompiledPage,
      )
      .map((u) => ({
        pageNumber: u.sourcePage,
        compiledPage: u.compiledPage,
        text: u.text,
        pageIdentityKnown: true,
      }));
    if (!pages.length) continue;

    const title = seg.identitySupported
      ? (seg.sourceDocumentTitle ?? parentTitle)
      : `${parentTitle} (compiled pp. ${seg.startCompiledPage}–${seg.endCompiledPage})`;

    drafts.push({
      id: `${parentId}::seg-${seg.segmentIndex}`,
      title,
      documentType: seg.sourceDocumentType,
      pages,
      parentCompiledDocumentId: parentId,
      identitySupported: seg.identitySupported,
      basis: seg.basis,
    });
  }

  return drafts;
}

export const UNRESOLVED_SOURCE_DOCUMENT_LIMITATION =
  "Compiled bundle page is exactly identified, but the source document it belongs to is not evidenced on the page — cite the compiled page";
