/**
 * Build document-relationship graph + canonical findings from uploaded document/page units.
 * Evidence states and chase candidates are derived only from those units — never assumed.
 */

import {
  buildDocumentRelationshipGraph,
  buildDocumentRelationshipNode,
  detectDraftVersusSignedChanges,
  detectExhibitLabelCollisions,
  detectReferencedAbsentAttachments,
  resolveOperativeDocumentPrecedence,
  type DocumentRelationshipGraph,
  type DocumentRelationshipNode,
  type OperativePrecedenceBasis,
  type SupersessionSupport,
} from "@/lib/criminal/document-relationship-model";
import { stripInternalCorpusIdentifiers } from "@/lib/criminal/solicitor-visible-matter-reference";
import {
  buildCanonicalFindings,
  findingForCustodyInterviewClock,
  type CanonicalFinding,
} from "@/lib/criminal/canonical-finding-model";
import {
  buildAttributionModel,
  authorshipVerdict,
  defendantScopeForLabel,
  type AttributionModel,
  type AttributionPageInput,
} from "@/lib/criminal/attribution-model";
import {
  rankAnchorsForQuery,
  type RankablePage,
  type RankedPageAnchor,
} from "@/lib/criminal/finding-anchor-rank";
import {
  buildCanonicalEvidenceState,
  type CanonicalEvidenceState,
  type EvidenceObservation,
} from "@/lib/criminal/evidence-state-canonical";
import {
  extractHearingNotices,
  resolveHearingLifecycle,
  type HearingLifecycle,
} from "@/lib/criminal/hearing-notice-lifecycle";
import {
  attachFindingProvenance,
  INSUFFICIENT_PROVENANCE_LIMITATION,
} from "@/lib/criminal/finding-provenance";
import {
  analyseCustodyInterviewClocks,
  observeTimestampsFromPage,
  type TimestampObservation,
} from "@/lib/criminal/timestamp-chronology";
import type { SharedEvidenceState } from "@/lib/criminal/evidence-state-reconcile";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import {
  buildStructuredChargeView,
  type StructuredChargeView,
} from "@/lib/criminal/structured-charge-state";

export type UploadedPageUnit = {
  /** Source-document page number. Null only when page identity is unknown. */
  pageNumber: number | null;
  /** Compiled-bundle page number when known — kept alongside, never instead of pageNumber. */
  compiledPage?: number | null;
  text: string;
  /** False when this unit is unsplit whole-document text, not a genuine page. */
  pageIdentityKnown?: boolean;
};

export type UploadedDocumentUnit = {
  id: string;
  title: string;
  documentType?: string | null;
  /** ISO or human date when known. */
  documentDate?: string | null;
  versionNumber?: number | null;
  /** Explicit id this document replaces. */
  replacesDocumentId?: string | null;
  /** Upload order (0-based or 1-based — higher = later). */
  uploadOrder: number;
  pages: UploadedPageUnit[];
  /** Optional whole-document text if pages not split — never replaces page units when pages exist. */
  fullText?: string | null;
};

export type DerivedEvidenceRow = {
  label: string;
  existence: SharedEvidenceState;
  note?: string | null;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  /** Defendant scope — every evidence row states who it relates to, or nobody. */
  defendants?: string[];
};

export type PageTextAnchor = {
  sourceDocumentTitle: string;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageNumber: number | null;
  pageIdentityKnown: boolean;
  snippet: string;
};

export type LiveCanonicalPipelineResult = {
  graph: DocumentRelationshipGraph;
  findings: CanonicalFinding[];
  charges: StructuredChargeView[];
  evidenceRows: DerivedEvidenceRow[];
  chaseLabels: string[];
  suppressedChaseLabels: string[];
  timestampObservations: TimestampObservation[];
  bundleText: string;
  /** One reconciled evidence state that every surface — including chase — must read. */
  evidenceState: CanonicalEvidenceState;
  /** Defendant / device / account / authorship scope derived from the same page units. */
  attribution: AttributionModel;
  hearingLifecycle: HearingLifecycle;
  /** Auditable record of how the operative instrument was chosen. */
  precedence: {
    operativeDocumentId: string | null;
    supersededDocumentIds: string[];
    basis: OperativePrecedenceBasis;
    unsupportedSupersessionCandidates: Array<{ id: string; reason: string }>;
    supersessionSupport: Array<{ id: string; support: SupersessionSupport }>;
  };
};

/** Prefer real page units; fullText is only a fallback when pages are absent. */
export function resolvePageUnits(doc: UploadedDocumentUnit): UploadedPageUnit[] {
  if (doc.pages?.length) return doc.pages;
  const ft = doc.fullText?.trim();
  if (ft) {
    // Unsplit whole-document text: there is no page 1 to claim.
    return [{ pageNumber: null, compiledPage: null, text: ft, pageIdentityKnown: false }];
  }
  return [];
}

/**
 * True for genuine page units. A compiled-bundle page number is an exact page identity
 * in its own right: when a document is supplied as a compiled PDF its own pagination is
 * often absent, but the compiled page is still precisely citable.
 */
export function isPageIdentityKnown(page: UploadedPageUnit): boolean {
  if (page.pageIdentityKnown === false) return false;
  const hasSource = typeof page.pageNumber === "number" && page.pageNumber > 0;
  const hasCompiled = typeof page.compiledPage === "number" && page.compiledPage > 0;
  return hasSource || hasCompiled;
}

/**
 * Single source of page provenance for every derived row, anchor and finding.
 * When page identity is unknown, every page field is null — no caller may
 * reconstruct "p.1" from a fallback index.
 */
export function pageRefsForUnit(page: UploadedPageUnit): {
  pageNumber: number | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
} {
  if (!isPageIdentityKnown(page)) {
    return { pageNumber: null, sourcePage: null, compiledPage: null, pageIdentityKnown: false };
  }
  const hasSource = typeof page.pageNumber === "number" && page.pageNumber > 0;
  const hasCompiled = typeof page.compiledPage === "number" && page.compiledPage > 0;
  return {
    // Source pagination is never synthesised from the compiled position.
    pageNumber: hasSource ? page.pageNumber! : null,
    sourcePage: hasSource ? `p.${page.pageNumber}` : null,
    compiledPage: hasCompiled ? `p.${page.compiledPage}` : null,
    pageIdentityKnown: true,
  };
}

/** Concatenate page texts for extraction; pages are always preserved separately for provenance. */
export function documentText(doc: UploadedDocumentUnit): string {
  const pages = resolvePageUnits(doc);
  if (pages.length) {
    return pages
      .map((p) => {
        const refs = pageRefsForUnit(p);
        if (!refs.pageIdentityKnown) return `[whole document — page identity unknown]\n${p.text}`;
        const label = refs.sourcePage
          ? `${refs.sourcePage}${refs.compiledPage ? ` / compiled ${refs.compiledPage}` : ""}`
          : `compiled ${refs.compiledPage}`;
        return `[${label}]\n${p.text}`;
      })
      .join("\n\n");
  }
  return doc.fullText?.trim() ?? "";
}

/**
 * Locate every page whose text matches the needle. Never falls back to page 1
 * just because the document has a first page.
 */
export function findPageAnchorsForText(
  doc: UploadedDocumentUnit,
  needle: string | RegExp,
): PageTextAnchor[] {
  const pages = resolvePageUnits(doc);
  const anchors: PageTextAnchor[] = [];
  for (const p of pages) {
    // Exact-page anchors require genuine page units. Whole-document text can
    // support detection, but never an invented p.1 provenance claim.
    if (!isPageIdentityKnown(p)) continue;
    const hit =
      typeof needle === "string"
        ? p.text.toLowerCase().includes(needle.toLowerCase())
        : needle.test(p.text);
    if (typeof needle !== "string") needle.lastIndex = 0;
    if (!hit) continue;
    const refs = pageRefsForUnit(p);
    anchors.push({
      sourceDocumentTitle: doc.title,
      sourceDocumentType: doc.documentType ?? inferDocType(doc.title, p.text),
      sourcePage: refs.sourcePage,
      compiledPage: refs.compiledPage,
      pageNumber: refs.pageNumber,
      pageIdentityKnown: true,
      snippet: p.text.slice(0, 160),
    });
  }
  return anchors;
}

/**
 * Anchor a finding to the document when no genuine page unit can support it.
 * Preserves visible factual provenance without inventing a page.
 */
export function documentOnlyAnchor(doc: UploadedDocumentUnit): PageTextAnchor | null {
  const pages = resolvePageUnits(doc);
  const unsplit = pages.find((p) => !isPageIdentityKnown(p));
  if (!unsplit) return null;
  return {
    sourceDocumentTitle: doc.title,
    sourceDocumentType: doc.documentType ?? inferDocType(doc.title, unsplit.text),
    sourcePage: null,
    compiledPage: null,
    pageNumber: null,
    pageIdentityKnown: false,
    snippet: unsplit.text.slice(0, 160),
  };
}

/**
 * Anchor for a document-level fact such as "this instrument is on file in role X".
 * The supporting evidence is the document itself, so the page it starts on is a
 * genuine anchor — unlike a text finding, which must be bound to the page carrying
 * the words. Falls back to document-only provenance for unsplit text.
 */
export function documentStartAnchor(doc: UploadedDocumentUnit): PageTextAnchor | null {
  const first = resolvePageUnits(doc).find(isPageIdentityKnown);
  if (!first) return documentOnlyAnchor(doc);
  const refs = pageRefsForUnit(first);
  return {
    sourceDocumentTitle: doc.title,
    sourceDocumentType: doc.documentType ?? inferDocType(doc.title, first.text),
    sourcePage: refs.sourcePage,
    compiledPage: refs.compiledPage,
    pageNumber: refs.pageNumber,
    pageIdentityKnown: true,
    snippet: first.text.slice(0, 160),
  };
}

/**
 * Anchors for a needle, falling back to document-only provenance when the
 * supporting document was supplied unsplit. Never returns a synthetic page.
 */
export function anchorsOrDocumentOnly(
  doc: UploadedDocumentUnit,
  needle: string | RegExp,
): PageTextAnchor[] {
  const anchors = findPageAnchorsForText(doc, needle);
  if (anchors.length) return anchors;
  const pages = resolvePageUnits(doc);
  const unsplit = pages.find((p) => !isPageIdentityKnown(p));
  if (!unsplit) return [];
  const hit =
    typeof needle === "string"
      ? unsplit.text.toLowerCase().includes(needle.toLowerCase())
      : needle.test(unsplit.text);
  if (typeof needle !== "string") needle.lastIndex = 0;
  if (!hit) return [];
  const anchor = documentOnlyAnchor(doc);
  return anchor ? [anchor] : [];
}

function primaryAnchor(anchors: PageTextAnchor[]): PageTextAnchor | null {
  return anchors[0] ?? null;
}

/** Flatten every genuine page unit into a rankable page for provenance binding. */
export function rankablePagesFromDocuments(documents: UploadedDocumentUnit[]): RankablePage[] {
  return documents.flatMap((doc) =>
    resolvePageUnits(doc).map((p) => {
      const refs = pageRefsForUnit(p);
      return {
        sourceDocumentTitle: doc.title,
        sourceDocumentType: doc.documentType ?? inferDocType(doc.title, p.text),
        sourcePage: refs.sourcePage,
        compiledPage: refs.compiledPage,
        pageIdentityKnown: refs.pageIdentityKnown,
        text: p.text,
      };
    }),
  );
}

function rankedToPageAnchor(a: RankedPageAnchor): PageTextAnchor {
  return {
    sourceDocumentTitle: a.sourceDocumentTitle,
    sourceDocumentType: a.sourceDocumentType,
    sourcePage: a.sourcePage,
    compiledPage: a.compiledPage,
    pageNumber: a.sourcePage ? parseInt(a.sourcePage.replace(/\D+/g, ""), 10) || null : null,
    pageIdentityKnown: a.pageIdentityKnown,
    snippet: a.snippet,
  };
}

/**
 * Bind using ranked signals. Generic needles refuse to bind. Ambiguous matches
 * return every candidate and leave the finding unresolved.
 */
export function bindFindingAnchors(
  documents: UploadedDocumentUnit[],
  query: Parameters<typeof rankAnchorsForQuery>[1],
): { primary: PageTextAnchor | null; all: PageTextAnchor[]; limitation: string | null; unresolved: boolean } {
  const ranked = rankAnchorsForQuery(rankablePagesFromDocuments(documents), query);
  return {
    primary: ranked.primary ? rankedToPageAnchor(ranked.primary) : null,
    all: ranked.candidates.map(rankedToPageAnchor),
    limitation: ranked.limitation,
    unresolved: ranked.unresolved,
  };
}

function observationFromAnchor(
  label: string,
  state: SharedEvidenceState,
  anchor: PageTextAnchor | null,
): EvidenceObservation {
  return {
    label,
    state,
    sourceDocumentTitle: anchor?.sourceDocumentTitle ?? null,
    sourceDocumentType: anchor?.sourceDocumentType ?? null,
    sourcePage: anchor?.sourcePage ?? null,
    compiledPage: anchor?.compiledPage ?? null,
    pageIdentityKnown: anchor?.pageIdentityKnown ?? false,
  };
}

/**
 * Repeated wording must list every page it was found on — never silently pick one.
 * Anchors without page identity are counted as document-level occurrences.
 */
function anchorPageRef(a: PageTextAnchor): string | null {
  if (!a.pageIdentityKnown) return null;
  if (a.sourcePage && a.compiledPage) return `${a.sourcePage} (compiled ${a.compiledPage})`;
  if (a.sourcePage) return a.sourcePage;
  if (a.compiledPage) return `compiled ${a.compiledPage}`;
  return null;
}

/** Distinct citable page references across every candidate anchor. */
export function candidateAnchorPageRefs(anchors: PageTextAnchor[]): string[] {
  return Array.from(
    new Set(anchors.map(anchorPageRef).filter((r): r is string => Boolean(r))),
  );
}

function formatMultiPageLimitation(anchors: PageTextAnchor[]): string | undefined {
  const pageRefs = candidateAnchorPageRefs(anchors);
  const documentOnly = anchors.filter((a) => !a.pageIdentityKnown).length;
  const parts: string[] = [];
  if (pageRefs.length > 1) {
    parts.push(
      `Wording appears on ${pageRefs.length} pages — all candidate anchors preserved: ${pageRefs.join(", ")}`,
    );
  }
  if (documentOnly > 0 && pageRefs.length > 0) {
    parts.push("plus whole-document text with no page identity");
  }
  return parts.length ? parts.join(" · ") : undefined;
}

/** Serialisable candidate anchors carried on the finding for every downstream exit. */
function toSupportingAnchors(anchors: PageTextAnchor[]): CanonicalFinding["supportingAnchors"] {
  return anchors.map((a) => ({
    sourceDocumentTitle: a.sourceDocumentTitle,
    sourceDocumentType: a.sourceDocumentType,
    sourcePage: a.sourcePage,
    compiledPage: a.compiledPage,
    pageIdentityKnown: a.pageIdentityKnown,
  }));
}

/**
 * Re-bind a finding to its supporting anchor through the shared provenance
 * builder, so page-identity rules and limitation wording are applied once.
 */
function rebindFindingToAnchor(
  f: CanonicalFinding,
  a: PageTextAnchor,
  opts: {
    evidenceState: string;
    extraLimitation?: string | undefined;
    allAnchors?: PageTextAnchor[];
  },
): CanonicalFinding {
  const allAnchors = opts.allAnchors ?? [a];
  const ambiguousAnchor = candidateAnchorPageRefs(allAnchors).length > 1;
  // The generic "nothing citable yet" placeholder must not survive once a real anchor
  // is bound, or it would hide the more precise multi-anchor limitation.
  const priorLimitation =
    f.provenance.unresolvedConflictOrLimitation &&
    f.provenance.unresolvedConflictOrLimitation !== INSUFFICIENT_PROVENANCE_LIMITATION
      ? f.provenance.unresolvedConflictOrLimitation
      : null;
  const limitation =
    [opts.extraLimitation, priorLimitation].filter(Boolean).join(" · ") || null;
  const attached = attachFindingProvenance({
    sourceDocumentTitle: a.sourceDocumentTitle,
    sourceDocumentType: a.sourceDocumentType ?? "document",
    sourcePage: a.sourcePage,
    compiledPage: a.compiledPage,
    pageIdentityKnown: a.pageIdentityKnown,
    evidenceState: opts.evidenceState,
    defendant: f.provenance.defendant,
    countNumber: f.provenance.countNumber,
    unresolvedConflictOrLimitation: limitation,
  });
  return {
    ...f,
    provenance: attached.provenance,
    provenanceLine: attached.line,
    // Repeated wording is not silently resolved to the first hit.
    unresolved: f.unresolved || attached.unresolved || ambiguousAnchor,
    supportingAnchors: toSupportingAnchors(allAnchors),
  };
}

/**
 * Derive evidence rows solely from explicit language on document/page units.
 * Absence of detection → no row (callers treat as unresolved), never assumed served/missing.
 *
 * Shared root remediation: status-word window captures must not emit dangling section-heading
 * or mid-sentence prose fragments as solicitor-visible evidence labels (e.g. "Evidence referred
 * or", "Headline Summary Prosecution relies on", "final statement. Final signed MG11 remains").
 * Prefer structured MG6C schedule lines; reject fragment labels; recover a short noun phrase
 * only when it passes the same fragment gate. Exact source wording is preserved in notes.
 */
export function deriveEvidenceRowsFromDocumentUnits(
  documents: UploadedDocumentUnit[],
): DerivedEvidenceRow[] {
  const rows: DerivedEvidenceRow[] = [];
  const seen = new Set<string>();

  const push = (row: DerivedEvidenceRow) => {
    const key = `${row.label.toLowerCase()}|${row.existence}|${row.sourcePage ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  for (const doc of documents) {
    const docType = doc.documentType ?? inferDocType(doc.title, documentText(doc));
    for (const page of resolvePageUnits(doc)) {
      const { pageIdentityKnown, sourcePage: pageRef, compiledPage: compiled } =
        pageRefsForUnit(page);
      const text = page.text;
      const provenanceNote = formatEvidenceProvenanceNote(doc.title, pageRef, compiled);

      // Prefer structured MG6C schedule lines — exact source titles, professional labels.
      const mg6cRe =
        /\bMG6C\/(\d+)\s*[—–-]\s*([^—–\n]+?)\s*[—–-]\s*(served|outstanding|missing|not on bundle|incomplete|partial|draft only)\b/gi;
      let mg: RegExpExecArray | null;
      mg6cRe.lastIndex = 0;
      while ((mg = mg6cRe.exec(text)) !== null) {
        const scheduleRef = `MG6C/${mg[1]}`;
        const rawTitle = (mg[2] ?? "").replace(/\s+/g, " ").trim();
        const statusToken = (mg[3] ?? "").toLowerCase();
        const label = sanitizeEvidenceLabel(rawTitle);
        if (!label || label.length < 3 || isNoiseEvidenceLabel(label) || isFragmentEvidenceLabel(label)) {
          continue;
        }
        const existence: SharedEvidenceState =
          /served|draft only/.test(statusToken) && !/outstanding|missing|not on bundle/.test(statusToken)
            ? "served"
            : /incomplete|partial/.test(statusToken)
              ? "incomplete"
              : "missing";
        push({
          label,
          existence,
          note: `${scheduleRef} · ${provenanceNote} · source status: ${statusToken}`,
          sourceDocumentTitle: doc.title,
          sourceDocumentType: docType,
          sourcePage: pageRef,
          compiledPage: compiled,
          pageIdentityKnown,
        });
      }

      // Explicit state phrases: "<label> served|outstanding|incomplete|…"
      const patterns: Array<{ state: SharedEvidenceState; re: RegExp }> = [
        {
          state: "served",
          re: /\b([A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,6})\s+(?:served|on\s+(?:the\s+)?papers|provided|disclosed)\b/gi,
        },
        {
          state: "missing",
          re: /\b([A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,6})\s+(?:outstanding|missing|not\s+served|absent|to\s+follow)\b/gi,
        },
        {
          state: "incomplete",
          re: /\b([A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,6})\s+(?:incomplete|partial)\b/gi,
        },
        {
          state: "incomplete",
          re: /\b((?:incomplete|partial)\s+[A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,5})\b/gi,
        },
      ];

      for (const { state, re } of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          let label = (m[1] ?? "").replace(/\s+/g, " ").trim();
          if (/^(incomplete|partial)\s+/i.test(label)) {
            label = label.replace(/^(incomplete|partial)\s+/i, "").trim();
          }
          label = recoverProfessionalEvidenceLabel(label);
          if (!label || label.length < 3) continue;
          if (isNoiseEvidenceLabel(label) || isFragmentEvidenceLabel(label)) continue;
          push({
            label,
            existence: state,
            note: provenanceNote,
            sourceDocumentTitle: doc.title,
            sourceDocumentType: docType,
            sourcePage: pageRef,
            compiledPage: compiled,
            pageIdentityKnown,
          });
        }
      }
    }
  }

  return rows;
}

function formatEvidenceProvenanceNote(
  documentTitle: string,
  sourcePage: string | null | undefined,
  compiledPage: string | null | undefined,
): string {
  const pageBit =
    sourcePage != null
      ? compiledPage != null && compiledPage !== sourcePage
        ? `${sourcePage} (compiled ${compiledPage})`
        : sourcePage
      : "page identity unresolved";
  return `${documentTitle} · ${pageBit}`;
}

function sanitizeEvidenceLabel(raw: string): string {
  return stripInternalCorpusIdentifiers(
    raw
      .replace(/^(?:the|a|an|see|attached|attachment)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Bare generic nouns that are never a professional evidence-unit label on their own. */
const GENERIC_EVIDENCE_TOKEN_RE =
  /^(evidence|summary|statement|prosecution|headline|referred|remains|final|outstanding|served|missing|pages?|bundle|schedule|section|particulars|offence|offense)$/i;

/**
 * Bundle furniture — the words a bundle uses to organise itself, not to name material.
 *
 * "CCTV SECTION" is a heading over the CCTV pages; it is not a document, and a solicitor cannot ask
 * for it. Left alone it becomes a served row, and a served row cancels the request for the master
 * footage the schedule states is outstanding. Note what is deliberately absent: "index" names real
 * material ("scene photograph index"), so it cannot be furniture on its own.
 */
const BUNDLE_FURNITURE_RE =
  /\b(section|heading|reference\s+area|bundle\s+detail|table\s+of\s+contents|page\s+range)\b/i;

/**
 * A status belongs to a row's state, not to its name.
 *
 * Flattening welds the status cell onto the text before it, so wording arrives as "Full 999 audioNot
 * yet" — a label that says the material is not here, on a row recorded as served. Whatever else that
 * is, it is not the name of a document, and it must not be treated as proof that anything was served.
 * "Missing" is absent from the list on purpose: a missing person report is real material.
 */
const STATUS_INSIDE_LABEL_RE =
  /not\s*(?:yet|served|excluded|provided|attached|available|disclosed)\b|\b(?:outstanding|withheld|awaited|awaiting)\b/i;

/** Reject labels that are section headings, dangling conjunctions, or mid-sentence prose cuts. */
export function isFragmentEvidenceLabel(label: string): boolean {
  const t = label.replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (/\.\s+[A-Z]/.test(t)) return true; // mid-label sentence break ("final statement. Final signed…")
  if (/\.$/.test(t) && t.length < 40) return true; // truncated trailing period residue ("listing.")
  if (/^(headline summary|evidence referred|evidence on file|particulars of offence)\b/i.test(t)) {
    return true;
  }
  if (/\b(headline summary|evidence referred or|prosecution relies on)\b/i.test(t)) return true;
  // Welding leaves no boundary for these patterns to end on ("Reference areaBundle detailCaution"),
  // so they are also asked of the wording with the lost spaces restored.
  const unwelded = t.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (BUNDLE_FURNITURE_RE.test(t) || BUNDLE_FURNITURE_RE.test(unwelded)) return true;
  if (STATUS_INSIDE_LABEL_RE.test(t) || STATUS_INSIDE_LABEL_RE.test(unwelded)) return true;
  // Prose cut mid-sentence: a document name does not begin in lower case and run on for several
  // words ("estate and arguing with MarcusCCTV stills were"). Two words are left alone, so material
  // that genuinely starts lower case ("iPhone download") still stands.
  if (/^[a-z]/.test(t) && t.split(/\s+/).length >= 3) return true;
  if (
    /\b(or|and|on|of|for|with|by|to|from|at|the|a|an|relies|remains|referred|summary|stated|is|are|was|were|been|yet)\s*$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^(not stated( on)?|final statement|summary prosecution|listing)\b/i.test(t)) return true;
  // Single generic token (e.g. recover("Evidence referred or") → "Evidence") is not a unit label.
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && GENERIC_EVIDENCE_TOKEN_RE.test(tokens[0]!)) return true;
  if (tokens.length <= 2 && tokens.every((tok) => GENERIC_EVIDENCE_TOKEN_RE.test(tok.replace(/\.$/, "")))) {
    return true;
  }
  return false;
}

/**
 * Recover a short professional noun-phrase evidence label from a raw status-window capture.
 * Never invents content — only trims leading prose / takes the trailing content tokens when
 * the full capture fails the fragment gate. Returns "" when no safe label remains.
 */
export function recoverProfessionalEvidenceLabel(raw: string): string {
  let label = sanitizeEvidenceLabel(raw);
  if (!label) return "";
  if (!isFragmentEvidenceLabel(label) && !isNoiseEvidenceLabel(label) && isProfessionalEvidenceLabel(label)) {
    return label;
  }

  // Section-heading / known fragment families — do not invent a label from heading residue.
  if (
    /^(headline summary|evidence referred|evidence on file|particulars of offence|not stated on)\b/i.test(
      label,
    ) ||
    /\bheadline summary\b/i.test(label) ||
    /\bevidence referred\b/i.test(label) ||
    /\bprosecution relies on\b/i.test(label)
  ) {
    return "";
  }

  // Drop leading sentence residue before the final clause ("…statement. Final signed MG11").
  const afterSentence = label.split(/\.\s+/).pop()?.trim() ?? label;
  label = sanitizeEvidenceLabel(afterSentence);

  // Strip trailing dangling function-words ("…MG11 remains" → "…MG11").
  const danglingTail =
    /^(.*?)(?:\s+(?:or|and|on|of|for|with|by|to|from|at|the|a|an|relies|remains|referred|summary|stated))+$/i;
  const strippedTail = label.replace(danglingTail, "$1").trim();
  if (strippedTail) label = sanitizeEvidenceLabel(strippedTail);

  if (
    label &&
    !isFragmentEvidenceLabel(label) &&
    !isNoiseEvidenceLabel(label) &&
    isProfessionalEvidenceLabel(label)
  ) {
    return label;
  }

  // Take the trailing 1–3 content tokens (preserve exact source wording of those tokens).
  const tokens = label.split(/\s+/).filter(Boolean);
  for (let n = Math.min(3, tokens.length); n >= 1; n--) {
    let candidate = sanitizeEvidenceLabel(tokens.slice(-n).join(" "));
    candidate = sanitizeEvidenceLabel(candidate.replace(danglingTail, "$1"));
    if (
      candidate &&
      candidate.length >= 3 &&
      !isFragmentEvidenceLabel(candidate) &&
      !isNoiseEvidenceLabel(candidate) &&
      isProfessionalEvidenceLabel(candidate)
    ) {
      return candidate;
    }
  }
  return "";
}

/** Professional evidence-unit labels name a recognisable material type or carry a concrete title. */
function isProfessionalEvidenceLabel(label: string): boolean {
  const t = label.replace(/\s+/g, " ").trim();
  if (t.length < 4) return false;
  if (
    /\b(MG\s?\d+|MG6C|CCTV|BWV|exhibit|recording|transcript|statement|disclosure|subscriber|annex|footage|clip|pack|CAD|999|device|account|lab|continuity)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // Concrete titled material (capitalised multi-word, not generic residue).
  if (t.length >= 12 && /[A-Z]/.test(t) && t.split(/\s+/).length >= 2 && !GENERIC_EVIDENCE_TOKEN_RE.test(t)) {
    return true;
  }
  return false;
}

function isNoiseEvidenceLabel(label: string): boolean {
  const t = label.replace(/\s+/g, " ").trim();
  if (
    /^(see|attached|attachment|and|or|the|a|an|on|at|for|with|from|that|this|count|page)\b/i.test(t)
  ) {
    return true;
  }
  if (GENERIC_EVIDENCE_TOKEN_RE.test(t)) return true;
  return false;
}

function extractExhibitEntriesFromPages(
  documents: UploadedDocumentUnit[],
): Array<{ label: string; description: string; anchors: PageTextAnchor[] }> {
  const entries: Array<{ label: string; description: string; anchors: PageTextAnchor[] }> = [];
  for (const doc of documents) {
    for (const page of resolvePageUnits(doc)) {
      const re =
        /\b(?:exhibit|exh\.?)\s*([A-Z]{1,4}\/?\d+[A-Z]?)\s*[:\-]?\s*([^\n.;]{3,80})/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(page.text)) !== null) {
        const label = m[1]!.toUpperCase();
        const description = m[2]!.trim();
        const refs = pageRefsForUnit(page);
        const anchor: PageTextAnchor = {
          sourceDocumentTitle: doc.title,
          sourceDocumentType: doc.documentType ?? "exhibit_list",
          sourcePage: refs.sourcePage,
          compiledPage: refs.compiledPage,
          pageNumber: refs.pageNumber,
          pageIdentityKnown: refs.pageIdentityKnown,
          snippet: m[0],
        };
        const existing = entries.find(
          (e) => e.label === label && e.description.toLowerCase() === description.toLowerCase(),
        );
        if (existing) existing.anchors.push(anchor);
        else entries.push({ label, description, anchors: [anchor] });
      }
    }
  }
  return entries;
}

function findDraftAndSignedDocs(docs: UploadedDocumentUnit[]): {
  draft: UploadedDocumentUnit;
  signed: UploadedDocumentUnit;
} | null {
  let draft: UploadedDocumentUnit | null = null;
  let signed: UploadedDocumentUnit | null = null;
  for (const d of docs) {
    const hay = `${d.title} ${documentText(d)}`.toLowerCase();
    if (!draft && /\bdraft\b/.test(hay) && /\b(statement|mg11)\b/.test(hay)) draft = d;
    if (!signed && /\b(final\s+signed|signed\s+mg11|signed\s+statement)\b/.test(hay)) signed = d;
  }
  if (!draft || !signed) return null;
  return { draft, signed };
}

function recordingTranscriptFromPages(documents: UploadedDocumentUnit[]): {
  recordingState: SharedEvidenceState;
  transcriptState: SharedEvidenceState;
  anchors: PageTextAnchor[];
} | null {
  let recordingState: SharedEvidenceState | null = null;
  let transcriptState: SharedEvidenceState | null = null;
  const anchors: PageTextAnchor[] = [];

  for (const doc of documents) {
    for (const page of resolvePageUnits(doc)) {
      const t = page.text;
      const refs = pageRefsForUnit(page);
      const anchor: PageTextAnchor = {
        sourceDocumentTitle: doc.title,
        sourceDocumentType: doc.documentType ?? "custody_interview",
        sourcePage: refs.sourcePage,
        compiledPage: refs.compiledPage,
        pageNumber: refs.pageNumber,
        pageIdentityKnown: refs.pageIdentityKnown,
        snippet: t.slice(0, 120),
      };
      if (/\binterview\s+recording\b/i.test(t)) {
        recordingState = /\binterview\s+recording\b.{0,40}\b(missing|outstanding|not served)\b/i.test(t)
          ? "missing"
          : "served";
        anchors.push(anchor);
      }
      if (/\b(?:interview\s+)?transcript\b/i.test(t)) {
        if (/\btranscript\b.{0,40}\b(incomplete|partial|missing|outstanding)\b/i.test(t) ||
          /\b(incomplete|partial)\s+transcript\b/i.test(t)) {
          transcriptState = "incomplete";
        } else if (/\btranscript\b.{0,40}\b(served|complete|provided)\b/i.test(t)) {
          transcriptState = "served";
        } else {
          transcriptState = transcriptState ?? "not_safely_confirmed";
        }
        anchors.push(anchor);
      }
    }
  }

  if (recordingState == null && transcriptState == null) return null;
  return {
    recordingState: recordingState ?? "not_safely_confirmed",
    transcriptState: transcriptState ?? "not_safely_confirmed",
    anchors,
  };
}

function isChargeInstrument(node: DocumentRelationshipNode): boolean {
  const hay = `${node.title ?? ""} ${node.documentType ?? ""}`.toLowerCase();
  return /\b(indictment|charge\s*sheet|charge\s*instrument|information)\b/.test(hay);
}

function extractChargesFromInstrument(
  doc: UploadedDocumentUnit,
  role: StructuredChargeView["documentRole"],
): StructuredChargeView[] {
  const text = documentText(doc);
  const meta = extractCriminalCaseMeta({
    text,
    documentName: doc.title,
    now: new Date(),
  });

  if (meta.charges.length === 0) {
    // Light local patterns when structured extractor finds nothing for this instrument alone.
    const offenceMatch =
      text.match(/(?:is charged with|count\s*\d+\s*[:\-]?)\s*([^\n.]{8,120})/i) ??
      text.match(/\bCount\s*\d+\s+([a-z][^\n.]{6,80})/i);
    const particulars =
      text.match(/\bParticulars\s*:\s*([^\n]{8,160})/i)?.[1]?.trim() ?? null;
    const defendants = Array.from(
      text.matchAll(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+is charged\b/g),
      (m) => m[1]!,
    );
    if (!offenceMatch?.[1]) return [];
    const offence = offenceMatch[1]!.trim();
    const anchors = anchorsOrDocumentOnly(doc, offence.slice(0, 24));
    const a = primaryAnchor(anchors);
    return [
      buildStructuredChargeView({
        count: 1,
        offence,
        particulars,
        status: "pending",
        defendants,
        documentRole: role,
        sourceDocumentTitle: doc.title,
        sourceDocumentType: doc.documentType ?? inferDocType(doc.title, text),
        sourcePage: a?.sourcePage ?? null,
        compiledPage: a?.compiledPage ?? null,
        pageIdentityKnown: a ? a.pageIdentityKnown : true,
        extracted: true,
        confidence: 0.55,
      }),
    ];
  }

  return meta.charges.map((c, idx) => {
    const anchors = anchorsOrDocumentOnly(doc, c.offence.slice(0, Math.min(40, c.offence.length)));
    const a = primaryAnchor(anchors);
    return buildStructuredChargeView({
      count: c.count,
      offence: c.offence,
      statute: c.statute,
      particulars: null,
      location: c.location,
      status: c.status || "pending",
      defendants: c.defendants ?? [],
      documentRole: role,
      sourceDocumentTitle: doc.title,
      sourceDocumentType: doc.documentType ?? c.sourceDocumentType ?? inferDocType(doc.title, text),
      sourcePage: a?.sourcePage ?? null,
      compiledPage: a?.compiledPage ?? null,
      pageIdentityKnown: a ? a.pageIdentityKnown : true,
      confidence: c.confidence,
      extracted: true,
      countFallbackIndex: idx,
    });
  });
}

/**
 * Live pipeline: uploaded document/page units → graph + findings + derived evidence/chase.
 * Does not project synthetic surface payloads — use buildLiveProductionSurfacesFromDocumentUnits.
 */
export function buildCanonicalPipelineFromDocumentUnits(
  documents: UploadedDocumentUnit[],
): LiveCanonicalPipelineResult {
  const ordered = [...documents].sort((a, b) => a.uploadOrder - b.uploadOrder);
  const bundleText = ordered.map((d) => `=== ${d.title} ===\n${documentText(d)}`).join("\n\n");

  const evidenceRows = deriveEvidenceRowsFromDocumentUnits(ordered);
  const onFileLabels = [
    ...ordered.map((d) => d.title),
    ...evidenceRows.filter((r) => r.existence === "served").map((r) => r.label),
  ];

  const exhibitEntries = extractExhibitEntriesFromPages(ordered);

  const nodes: DocumentRelationshipNode[] = ordered.map((d) => {
    const roleAnchor =
      primaryAnchor(findPageAnchorsForText(d, /\b(amended|superseded|replaces|operative)\b/i)) ??
      primaryAnchor(findPageAnchorsForText(d, d.title.slice(0, 24))) ??
      documentStartAnchor(d);
    return buildDocumentRelationshipNode({
      id: d.id,
      title: d.title,
      documentType: d.documentType ?? inferDocType(d.title, documentText(d)),
      haystack: documentText(d),
      documentDate: d.documentDate,
      versionNumber: d.versionNumber,
      replacesDocumentId: d.replacesDocumentId,
      uploadOrder: d.uploadOrder,
      // Only bind a page when supporting text was found on that page — never invent p.1.
      sourcePage: roleAnchor?.sourcePage ?? null,
      compiledPage: roleAnchor?.compiledPage ?? null,
      pageIdentityKnown: roleAnchor ? roleAnchor.pageIdentityKnown : true,
      evidenceState: "served", // the uploaded document unit itself is on file
    });
  });

  const graph = buildDocumentRelationshipGraph({
    nodes,
    bundleText,
    onFileLabels,
    exhibitEntries: exhibitEntries.map((e) => ({ label: e.label, description: e.description })),
    evidenceRows: evidenceRows.map((r) => ({ label: r.label, state: r.existence })),
  });

  const precedence = resolveOperativeDocumentPrecedence(graph.nodes);
  const draftSigned = findDraftAndSignedDocs(ordered);
  const changedFields = draftSigned
    ? detectDraftVersusSignedChanges({
        draftText: documentText(draftSigned.draft),
        signedText: documentText(draftSigned.signed),
      })
    : [];

  const rt = recordingTranscriptFromPages(ordered);
  const recordingBind = bindFindingAnchors(ordered, {
    relationshipPhrase: "interview recording served",
    needle: "interview recording",
    preferredDocumentType: "interview_record",
    modality: "interview",
  });
  const transcriptBind = bindFindingAnchors(ordered, {
    relationshipPhrase: "transcript incomplete",
    needle: "interview transcript",
    preferredDocumentType: "interview_record",
    modality: "transcript",
  });
  // Fall back to the page-walk anchors when ranked binding finds nothing — still
  // refuse a generic-only "recording"/"transcript" bind.
  const rtRecordingAnchor =
    recordingBind.primary ??
    (rt ? primaryAnchor(rt.anchors.filter((a) => /recording/i.test(a.snippet))) : null);
  const rtTranscriptAnchor =
    transcriptBind.primary ??
    (rt ? primaryAnchor(rt.anchors.filter((a) => /transcript/i.test(a.snippet))) : null);

  // Attribution is derived from the same page units, so defendant/device/account/
  // authorship scope carries the same provenance as every other finding.
  const attributionPages: AttributionPageInput[] = ordered.flatMap((d) =>
    resolvePageUnits(d).map((p) => {
      const refs = pageRefsForUnit(p);
      return {
        text: p.text,
        sourceDocumentTitle: d.title,
        sourceDocumentType: d.documentType ?? null,
        sourcePage: refs.sourcePage,
        compiledPage: refs.compiledPage,
        pageIdentityKnown: refs.pageIdentityKnown,
      };
    }),
  );
  const attribution = buildAttributionModel(attributionPages);

  const hearingLifecycle = resolveHearingLifecycle(
    extractHearingNotices(
      ordered.flatMap((d) =>
        resolvePageUnits(d).map((p) => {
          const refs = pageRefsForUnit(p);
          return {
            documentId: d.id,
            documentTitle: d.title,
            documentType: d.documentType ?? null,
            uploadOrder: d.uploadOrder,
            text: p.text,
            sourcePage: refs.sourcePage,
            compiledPage: refs.compiledPage,
            pageIdentityKnown: refs.pageIdentityKnown,
          };
        }),
      ),
    ),
  );

  const timestampObservations = ordered.flatMap((d) =>
    resolvePageUnits(d).flatMap((p) => {
      const refs = pageRefsForUnit(p);
      return observeTimestampsFromPage({
        text: p.text,
        sourceDocumentTitle: d.title,
        sourceDocumentType: d.documentType ?? null,
        sourcePage: refs.sourcePage,
        compiledPage: refs.compiledPage,
      });
    }),
  );
  const clockAnalysis = analyseCustodyInterviewClocks(timestampObservations);

  const draftAnchors = draftSigned
    ? [
        ...anchorsOrDocumentOnly(draftSigned.draft, /wearing|clothing|jacket|coat/i),
        ...anchorsOrDocumentOnly(draftSigned.signed, /wearing|clothing|jacket|coat/i),
      ]
    : [];
  const draftPrimary = primaryAnchor(draftAnchors);

  // Single reconciled evidence state: derived rows, recording/transcript modality
  // states and referenced-but-absent material all resolve here before anything is
  // chased, so no surface can chase what another surface reports as served.
  const referencedAbsentAll = graph.referencedAbsentAttachments.length
    ? graph.referencedAbsentAttachments
    : detectReferencedAbsentAttachments(bundleText, onFileLabels);

  const evidenceObservations: EvidenceObservation[] = [
    ...evidenceRows.map((r) => ({
      label: r.label,
      state: r.existence,
      sourceDocumentTitle: r.sourceDocumentTitle,
      sourceDocumentType: r.sourceDocumentType,
      sourcePage: r.sourcePage,
      compiledPage: r.compiledPage,
      pageIdentityKnown: r.pageIdentityKnown,
      defendant: r.defendants?.[0] ?? null,
    })),
    ...(rt
      ? [
          observationFromAnchor(
            "Interview recording",
            rt.recordingState,
            rtRecordingAnchor,
          ),
          observationFromAnchor(
            "Interview transcript",
            rt.transcriptState,
            rtTranscriptAnchor,
          ),
        ]
      : []),
    ...referencedAbsentAll.map((ref) => {
      const bind = bindFindingAnchors(ordered, {
        uniqueLabel: ref.referencedLabel,
        relationshipPhrase: `see attached: ${ref.referencedLabel}`.slice(0, 80),
        needle: ref.referencedLabel,
      });
      const state: SharedEvidenceState =
        ref.onFileState === "referred_only" ? "referred_only" : "missing";
      return observationFromAnchor(ref.referencedLabel, state, bind.primary);
    }),
  ];

  const evidenceState = buildCanonicalEvidenceState(evidenceObservations);

  const attributionFindingInputs = Array.from(
    new Set([
      ...attribution.deviceOwnership.map((d) => d.person),
      ...attribution.accountAssociation.map((a) => a.person),
    ]),
  )
    .filter((p): p is string => Boolean(p))
    .map((person) => {
      const verdict = authorshipVerdict(attribution, person);
      const anchor =
        attribution.deviceOwnership.find((d) => d.person === person) ??
        attribution.accountAssociation.find((a) => a.person === person)!;
      return {
        person,
        ownsDevice: attribution.deviceOwnership.some((d) => d.person === person),
        holdsAccount: attribution.accountAssociation.some((a) => a.person === person),
        authorshipEstablished: verdict.attributed,
        provenance: {
          sourceDocumentTitle: anchor.sourceDocumentTitle,
          sourceDocumentType: "telecoms_report",
          sourcePage: anchor.sourcePage,
          compiledPage: anchor.compiledPage,
          pageIdentityKnown: anchor.pageIdentityKnown,
          defendant: person,
        },
        attribution: {
          defendants: attribution.defendants,
          coDefendantContamination: attribution.contamination.some((c) => c.defendant === person),
          deviceOwner: attribution.deviceOwnership.find((d) => d.person === person)?.person ?? null,
          accountHolder: attribution.accountAssociation.find((a) => a.person === person)?.person ?? null,
          messageAuthor: verdict.attributed ? person : null,
          authorshipBasis: verdict.attributed ? ("attributed" as const) : ("not_established" as const),
          limitation: verdict.limitation,
        },
      };
    });

  const findings = buildCanonicalFindings({
    documentNodes: precedence.nodes,
    hearingLifecycle: hearingLifecycle.latest
      ? {
          lifecycle: hearingLifecycle,
          provenance: {
            sourceDocumentTitle: hearingLifecycle.latest.documentTitle,
            sourceDocumentType: "hearing_notice",
            sourcePage: hearingLifecycle.latest.sourcePage,
            compiledPage: hearingLifecycle.latest.compiledPage,
            pageIdentityKnown: hearingLifecycle.latest.pageIdentityKnown,
          },
        }
      : null,
    evidenceStateContradictions: evidenceState.contradictions.map((c) => {
      const item = evidenceState.items.find((i) => i.label === c.label);
      const obs = item?.observations[0];
      return {
        label: c.label,
        states: c.states,
        description: c.description,
        provenance: {
          sourceDocumentTitle: obs?.sourceDocumentTitle ?? null,
          sourceDocumentType: obs?.sourceDocumentType ?? null,
          sourcePage: obs?.sourcePage ?? null,
          compiledPage: obs?.compiledPage ?? null,
          pageIdentityKnown: obs?.pageIdentityKnown ?? false,
        },
      };
    }),
    messageAttribution: attributionFindingInputs,
    draftVersusSigned: draftSigned
      ? {
          draftLabel: draftSigned.draft.title,
          signedLabel: draftSigned.signed.title,
          changedFields,
          provenance: {
            sourceDocumentTitle: draftPrimary?.sourceDocumentTitle ?? draftSigned.signed.title,
            sourceDocumentType: draftPrimary?.sourceDocumentType ?? "statement",
            sourcePage: draftPrimary?.sourcePage ?? null,
            compiledPage: draftPrimary?.compiledPage ?? null,
            pageIdentityKnown: draftPrimary ? draftPrimary.pageIdentityKnown : true,
            evidenceState: "needs_review",
            unresolvedConflictOrLimitation: formatMultiPageLimitation(draftAnchors),
          },
        }
      : null,
    recordingVersusTranscript: rt
      ? {
          recordingState: rt.recordingState,
          transcriptState: rt.transcriptState,
          provenance: {
            sourceDocumentTitle:
              rtRecordingAnchor?.sourceDocumentTitle ??
              rtTranscriptAnchor?.sourceDocumentTitle ??
              null,
            sourceDocumentType:
              rtRecordingAnchor?.sourceDocumentType ??
              rtTranscriptAnchor?.sourceDocumentType ??
              "interview_record",
            sourcePage: rtRecordingAnchor?.sourcePage ?? rtTranscriptAnchor?.sourcePage ?? null,
            compiledPage:
              rtRecordingAnchor?.compiledPage ?? rtTranscriptAnchor?.compiledPage ?? null,
            pageIdentityKnown:
              rtRecordingAnchor?.pageIdentityKnown ??
              rtTranscriptAnchor?.pageIdentityKnown ??
              false,
            evidenceState: rt.transcriptState,
            unresolvedConflictOrLimitation:
              recordingBind.limitation ??
              transcriptBind.limitation ??
              formatMultiPageLimitation(rt.anchors),
          },
        }
      : null,
    referencedAbsent: referencedAbsentAll,
    exhibitCollisions: graph.exhibitCollisions.length
      ? graph.exhibitCollisions
      : detectExhibitLabelCollisions(
          exhibitEntries.map((e) => ({ label: e.label, description: e.description })),
        ),
    custodyInterviewClock:
      timestampObservations.length > 0
        ? {
            custodyTime: clockAnalysis.custodyArrival?.rawTime ?? null,
            interviewTime: clockAnalysis.interviewStart?.rawTime ?? null,
            conflict: clockAnalysis.conflict,
            analysis: clockAnalysis,
            provenance: {
              sourceDocumentTitle:
                clockAnalysis.custodyArrival?.sourceDocumentTitle ??
                clockAnalysis.interviewStart?.sourceDocumentTitle ??
                null,
              sourceDocumentType: "custody_record",
              sourcePage:
                clockAnalysis.custodyArrival?.sourcePage ??
                clockAnalysis.interviewStart?.sourcePage ??
                null,
              compiledPage:
                clockAnalysis.custodyArrival?.compiledPage ??
                clockAnalysis.interviewStart?.compiledPage ??
                null,
              // Timestamps read from unsplit whole-document text carry no page ref.
              pageIdentityKnown: Boolean(
                clockAnalysis.custodyArrival?.sourcePage ??
                  clockAnalysis.interviewStart?.sourcePage ??
                  clockAnalysis.custodyArrival?.compiledPage ??
                  clockAnalysis.interviewStart?.compiledPage,
              ),
              evidenceState: clockAnalysis.conflict ? "not_safely_confirmed" : "served",
              unresolvedConflictOrLimitation: clockAnalysis.conflict
                ? clockAnalysis.impossibleChronology[0]?.reason ??
                  (clockAnalysis.sameEventConflicts[0]
                    ? `Competing timestamps for ${clockAnalysis.sameEventConflicts[0].eventIdentity}`
                    : "Scoped clock conflict")
                : undefined,
            },
          }
        : null,
  });

  // Bind referenced-absent / exhibit findings to the page that contains the supporting text.
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i]!;
    if (f.kind === "referenced_absent_attachment" && f.referencedAbsent) {
      const label = f.referencedAbsent.referencedLabel;
      const bind = bindFindingAnchors(ordered, {
        uniqueLabel: label,
        relationshipPhrase: `see attached: ${label}`.slice(0, 80),
        needle: label,
      });
      const a = bind.primary ?? primaryAnchor(bind.all);
      if (a) {
        findings[i] = rebindFindingToAnchor(f, a, {
          evidenceState: f.referencedAbsent.onFileState,
          extraLimitation: bind.limitation ?? formatMultiPageLimitation(bind.all),
          allAnchors: bind.all.length ? bind.all : [a],
        });
      } else if (bind.limitation) {
        findings[i] = {
          ...f,
          unresolved: true,
          provenance: {
            ...f.provenance,
            unresolvedConflictOrLimitation: bind.limitation,
          },
          provenanceLine: `${f.provenanceLine} · ${bind.limitation}`,
        };
      }
    }
    if (f.kind === "exhibit_label_collision" && f.exhibitCollision) {
      // A collision is evidenced by every page carrying the label, not just the first
      // description that happened to be extracted.
      const collisionAnchors = exhibitEntries
        .filter((e) => e.label === f.exhibitCollision!.label)
        .flatMap((e) => e.anchors);
      const a = collisionAnchors[0];
      if (a) {
        findings[i] = rebindFindingToAnchor(f, a, {
          evidenceState: "not_safely_confirmed",
          extraLimitation: formatMultiPageLimitation(collisionAnchors),
          allAnchors: collisionAnchors,
        });
      }
    }
  }

  if (clockAnalysis.conflict) {
    const idx = findings.findIndex((f) => f.kind === "custody_interview_clock");
    if (idx >= 0) {
      findings[idx] = findingForCustodyInterviewClock({
        custodyTime: clockAnalysis.custodyArrival?.rawTime ?? null,
        interviewTime: clockAnalysis.interviewStart?.rawTime ?? null,
        conflict: true,
        analysis: clockAnalysis,
        provenance: {
          sourceDocumentTitle: clockAnalysis.custodyArrival?.sourceDocumentTitle,
          sourceDocumentType: "custody_record",
          sourcePage: clockAnalysis.custodyArrival?.sourcePage,
          compiledPage: clockAnalysis.custodyArrival?.compiledPage,
          pageIdentityKnown: Boolean(
            clockAnalysis.custodyArrival?.sourcePage ?? clockAnalysis.custodyArrival?.compiledPage,
          ),
          evidenceState: "not_safely_confirmed",
        },
      });
    }
  }

  // Per-instrument charge extraction — never assign by result index or clone operative → superseded.
  const charges: StructuredChargeView[] = [];
  const instruments = precedence.nodes.filter(isChargeInstrument);
  for (const node of instruments) {
    const doc = ordered.find((d) => d.id === node.id);
    if (!doc) continue;
    const role =
      node.role === "amended" || node.role === "operative" || node.role === "superseded"
        ? node.role
        : "unknown";
    const extracted = extractChargesFromInstrument(doc, role);
    if (extracted.length > 0) {
      charges.push(...extracted);
    } else if (role === "superseded" || role === "operative" || role === "amended") {
      // Instrument exists but wording could not be extracted from that instrument alone.
      const anchors = anchorsOrDocumentOnly(doc, /indictment|charge|count/i);
      const a = primaryAnchor(anchors);
      charges.push(
        buildStructuredChargeView({
          count: null,
          offence:
            role === "superseded"
              ? "Earlier instrument on file — charge wording unresolved"
              : "Charge instrument on file — charge wording unresolved",
          status: "pending",
          defendants: [],
          documentRole: role,
          sourceDocumentTitle: doc.title,
          sourceDocumentType: doc.documentType ?? inferDocType(doc.title, documentText(doc)),
          sourcePage: a?.sourcePage ?? null,
          compiledPage: a?.compiledPage ?? null,
          pageIdentityKnown: a ? a.pageIdentityKnown : true,
          extracted: false,
          confidence: 0.2,
        }),
      );
    }
  }

  // Defendant allocation per count, from the charge instruments themselves. A count
  // with no named defendant stays explicitly unallocated rather than inheriting one.
  for (let i = 0; i < charges.length; i++) {
    const charge = charges[i]!;
    if (charge.count == null) continue;
    if (charge.defendants?.length) continue;
    const allocation = attribution.countAllocations.find((a) => a.countNumber === charge.count);
    if (allocation?.defendants.length) {
      charges[i] = { ...charge, defendants: allocation.defendants };
    }
  }

  // Chase requests come only from the reconciled canonical state — nothing here
  // regenerates its own view of what is outstanding.
  const chaseLabels = evidenceState.chaseRequests.map((r) => r.label);
  const suppressedChaseLabels = evidenceState.suppressed.map((s) => s.label);

  // Defendant scope on every evidence row — same-document/same-span ONLY.
  // Never search the whole bundle: that broadcast every roster name onto every row.
  const scopedEvidenceRows: DerivedEvidenceRow[] = evidenceRows.map((r) => {
    const sameDocText = ordered
      .filter((d) => d.title === r.sourceDocumentTitle)
      .map((d) => documentText(d))
      .join("\n");
    const span = `${r.label}\n${r.note ?? ""}\n${sameDocText.slice(0, 4000)}`;
    return {
      ...r,
      defendants: defendantScopeForLabel(r.label, span, attribution.defendants),
    };
  });

  return {
    graph: { ...graph, nodes: precedence.nodes },
    findings,
    charges,
    evidenceRows: scopedEvidenceRows,
    chaseLabels,
    suppressedChaseLabels,
    timestampObservations,
    bundleText,
    evidenceState,
    attribution,
    hearingLifecycle,
    precedence: {
      operativeDocumentId: precedence.operative?.id ?? null,
      supersededDocumentIds: precedence.superseded.map((n) => n.id),
      basis: precedence.basis,
      unsupportedSupersessionCandidates: precedence.unsupportedSupersessionCandidates,
      supersessionSupport: precedence.supersessionSupport,
    },
  };
}

function inferDocType(title: string, text: string): string {
  const hay = `${title} ${text.slice(0, 500)}`.toLowerCase();
  if (/indictment/.test(hay)) return "indictment";
  if (/charge sheet/.test(hay)) return "charge_sheet";
  if (/mg11|statement/.test(hay)) return "statement";
  if (/custody/.test(hay)) return "custody_record";
  if (/exhibit/.test(hay)) return "exhibit_list";
  return "case_document";
}
