import {
  humanizeInternalToken,
  humanizeRemainingSnakeCaseTokens,
} from "@/lib/criminal/solicitor-visible-sanitization";

/**
 * Mandatory provenance for important findings and chase items.
 * Whole-PDF filename-only provenance is insufficient.
 *
 * Page identity is a first-class state, not an absence:
 * - genuine page unit      → pageIdentityKnown true, exact source/compiled page preserved;
 * - unsplit whole document → pageIdentityKnown false, every page field stays null and the
 *   solicitor-visible limitation says the document is known but the page is unavailable.
 * Unknown page identity must never be rendered as "p.1"/"page 1"/"p.null", and never
 * reported as missing provenance entirely.
 */

/** Solicitor-visible limitation for a known document whose exact page is unavailable. */
export const UNKNOWN_PAGE_IDENTITY_LIMITATION =
  "Supporting document is identified but the exact page is unavailable — supplied as unsplit whole-document text, so cite the document rather than a page";

/**
 * Placeholder applied when nothing citable is available yet. It is superseded once a
 * real anchor is bound, so it must never crowd out a more precise limitation.
 */
export const INSUFFICIENT_PROVENANCE_LIMITATION =
  "Exact document title, page, evidence state, and defendant/count provenance not fully available — do not treat filename alone as source proof";

/** Phrase rendered inline on every exit in place of a page reference. */
export const UNKNOWN_PAGE_IDENTITY_PHRASE =
  "exact page unavailable (unsplit whole-document text)";

export type FindingProvenance = {
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  /** False when the supporting text came from unsplit whole-document text. */
  pageIdentityKnown: boolean;
  evidenceState: string | null;
  defendant: string | null;
  countNumber: number | null;
  unresolvedConflictOrLimitation: string | null;
};

export type FindingProvenanceInput = {
  sourceDocumentTitle?: string | null;
  sourceDocumentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
  pageIdentityKnown?: boolean;
  /** @deprecated filename-only — insufficient alone */
  sourceFilename?: string | null;
  evidenceState?: string | null;
  defendant?: string | null;
  countNumber?: number | null;
  unresolvedConflictOrLimitation?: string | null;
};

export function buildFindingProvenance(input: FindingProvenanceInput): FindingProvenance {
  const title =
    (input.sourceDocumentTitle?.trim() || null) ??
    (input.sourceFilename?.trim() && looksLikeDocumentTitle(input.sourceFilename)
      ? input.sourceFilename.trim()
      : null);

  const pageIdentityKnown = input.pageIdentityKnown !== false;
  // Unknown page identity can never carry a page ref — no helper may default to p.1.
  const sourcePage = pageIdentityKnown ? normalizePageRef(input.sourcePage) : null;
  const compiledPage = pageIdentityKnown ? normalizePageRef(input.compiledPage) : null;
  const declared = input.unresolvedConflictOrLimitation?.trim() || null;
  const limitation = pageIdentityKnown
    ? declared
    : declared && declared !== UNKNOWN_PAGE_IDENTITY_LIMITATION
      ? `${UNKNOWN_PAGE_IDENTITY_LIMITATION}; ${declared}`
      : UNKNOWN_PAGE_IDENTITY_LIMITATION;

  return {
    sourceDocumentTitle: title,
    sourceDocumentType: input.sourceDocumentType?.trim() || null,
    sourcePage,
    compiledPage,
    pageIdentityKnown,
    evidenceState: input.evidenceState?.trim() || null,
    defendant: input.defendant?.trim() || null,
    countNumber:
      input.countNumber != null && Number.isFinite(input.countNumber) && input.countNumber > 0
        ? Math.round(input.countNumber)
        : null,
    unresolvedConflictOrLimitation: limitation,
  };
}

function looksLikeDocumentTitle(name: string): boolean {
  // Bare UUID-like or hash filenames are not titles
  if (/^[0-9a-f-]{20,}$/i.test(name.replace(/\.\w+$/, ""))) return false;
  return /[A-Za-z]{3,}/.test(name);
}

/**
 * Normalise a page reference. Synthetic placeholders ("p.null", "p.0", "page undefined")
 * are refused outright so no surface can render an invented page.
 */
function normalizePageRef(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^(?:compiled\s*)?p(?:age)?\.?\s*(?:null|undefined|nan|none|0+)\s*$/i.test(t)) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10) > 0 ? `p.${parseInt(t, 10)}` : null;
  if (/^p\.?\s*\d+/i.test(t)) return t.replace(/^p\.?\s*/i, "p.");
  if (/compiled\s*p(?:age)?\.?\s*\d+/i.test(t)) return t;
  return t;
}

/** True when text claims a page that cannot exist (never allowed on any exit). */
export function containsSyntheticPageReference(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\b(?:compiled\s*)?p(?:age)?\.?\s*(?:null|undefined|nan|none|0+)\b/i.test(text);
}

export type ProvenanceCompleteness =
  /** Document identity + exact page + state (+ scope or declared limitation). */
  | "sufficient"
  /** Document identified; exact page genuinely unavailable and declared as such. */
  | "known_document_unknown_page"
  /** Not enough to cite at all. */
  | "insufficient";

/**
 * Distinguish "document known, page unavailable" from "provenance missing".
 * Reporting the first as the second is itself a defect.
 */
export function classifyProvenanceCompleteness(p: FindingProvenance): ProvenanceCompleteness {
  const hasDoc = Boolean(p.sourceDocumentTitle && p.sourceDocumentType);
  const hasPage = Boolean(p.sourcePage || p.compiledPage);
  const hasState = Boolean(p.evidenceState);
  const hasScope = Boolean(p.defendant || p.countNumber != null);
  if (hasDoc && hasPage && hasState && (hasScope || Boolean(p.unresolvedConflictOrLimitation))) {
    return "sufficient";
  }
  if (!p.pageIdentityKnown && hasDoc && hasState && !hasPage) {
    return "known_document_unknown_page";
  }
  return "insufficient";
}

/**
 * Filename alone is never enough for important findings / chase items.
 * Unknown page identity is not "sufficient" for exact-page reliance, but it is
 * reported through classifyProvenanceCompleteness — never as missing provenance.
 */
export function isProvenanceSufficient(p: FindingProvenance): boolean {
  return classifyProvenanceCompleteness(p) === "sufficient";
}

/** Single page-provenance projection shared by view, copy, export, API, PDF and prose. */
export function pageProvenanceForSurface(p: FindingProvenance): {
  page: string | null;
  pageNumber: number | null;
  pageLabel: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  pageIdentityNote: string | null;
} {
  if (!p.pageIdentityKnown) {
    return {
      page: null,
      pageNumber: null,
      pageLabel: null,
      sourcePage: null,
      compiledPage: null,
      pageIdentityKnown: false,
      pageIdentityNote: UNKNOWN_PAGE_IDENTITY_LIMITATION,
    };
  }
  const primary = p.sourcePage ?? p.compiledPage ?? null;
  const digits = primary?.match(/(\d+)/)?.[1];
  return {
    page: primary,
    pageNumber: digits ? parseInt(digits, 10) : null,
    // Keep both numbering systems when both are known — never collapse one into the
    // other, and never present a compiled-bundle page as source-document pagination.
    pageLabel:
      p.sourcePage && p.compiledPage
        ? `${p.sourcePage} (compiled ${p.compiledPage})`
        : p.sourcePage
          ? p.sourcePage
          : p.compiledPage
            ? `compiled ${p.compiledPage}`
            : null,
    sourcePage: p.sourcePage,
    compiledPage: p.compiledPage,
    pageIdentityKnown: true,
    pageIdentityNote: null,
  };
}

export function formatFindingProvenanceLine(p: FindingProvenance): string {
  const parts: string[] = [];
  if (p.sourceDocumentTitle) {
    parts.push(
      p.sourceDocumentType
        ? `${p.sourceDocumentTitle} (${humanizeInternalToken(p.sourceDocumentType)})`
        : p.sourceDocumentTitle,
    );
  }
  const page = pageProvenanceForSurface(p);
  if (!page.pageIdentityKnown) parts.push(UNKNOWN_PAGE_IDENTITY_PHRASE);
  else if (page.pageLabel) parts.push(page.pageLabel);
  if (p.evidenceState) parts.push(`state: ${humanizeInternalToken(p.evidenceState)}`);
  if (p.defendant) parts.push(`defendant: ${p.defendant}`);
  if (p.countNumber != null) parts.push(`count ${p.countNumber}`);
  if (p.unresolvedConflictOrLimitation) {
    parts.push(`limitation: ${humanizeRemainingSnakeCaseTokens(p.unresolvedConflictOrLimitation)}`);
  }
  return parts.join(" · ") || "Provenance incomplete — solicitor review required";
}

export function assertFindingProvenanceOrLimitation(
  input: FindingProvenanceInput,
): FindingProvenance {
  const p = buildFindingProvenance(input);
  const completeness = classifyProvenanceCompleteness(p);
  if (completeness === "sufficient") return p;
  // Unknown page identity already carries its own precise limitation — do not
  // overwrite it with the generic "provenance not available" wording.
  if (completeness === "known_document_unknown_page") return p;
  return {
    ...p,
    unresolvedConflictOrLimitation:
      p.unresolvedConflictOrLimitation ?? INSUFFICIENT_PROVENANCE_LIMITATION,
  };
}

/**
 * Attach provenance to a finding/chase/copy surface.
 * Insufficient fields → explicit limitation; finding remains unresolved for reliance.
 * Unknown page identity also stays unresolved for exact-page reliance, but is
 * reported as a known document with an unavailable page.
 */
export function attachFindingProvenance(input: FindingProvenanceInput): {
  provenance: FindingProvenance;
  line: string;
  sufficient: boolean;
  unresolved: boolean;
  completeness: ProvenanceCompleteness;
  pageIdentityKnown: boolean;
} {
  const provenance = assertFindingProvenanceOrLimitation(input);
  const completeness = classifyProvenanceCompleteness(provenance);
  return {
    provenance,
    line: formatFindingProvenanceLine(provenance),
    sufficient: completeness === "sufficient",
    unresolved: completeness !== "sufficient",
    completeness,
    pageIdentityKnown: provenance.pageIdentityKnown,
  };
}
