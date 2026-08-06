/**
 * Ranked provenance-anchor matching.
 *
 * Broad first-token / first-hit binding is forbidden. A finding is bound to a page
 * only when a ranked signal selects it; generic words alone never select a page.
 * Ambiguous multi-page matches retain every candidate and stay unresolved.
 */

import { inferEvidenceModality } from "@/lib/criminal/evidence-state-reconcile";

/** Words that are too generic to select a page on their own. */
export const GENERIC_ANCHOR_TOKENS = new Set(
  [
    "phone",
    "mobile",
    "handset",
    "cctv",
    "footage",
    "video",
    "statement",
    "interview",
    "hearing",
    "notice",
    "exhibit",
    "recording",
    "transcript",
    "document",
    "report",
    "page",
    "case",
    "file",
    "evidence",
    "material",
    "record",
    "schedule",
  ].map((t) => t.toLowerCase()),
);

export type RankablePage = {
  sourceDocumentTitle: string;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  text: string;
};

export type AnchorQuery = {
  quotedWording?: string | null;
  uniqueLabel?: string | null;
  relationshipPhrase?: string | null;
  preferredDocumentType?: string | null;
  preferredDocumentTitle?: string | null;
  needle?: string | null;
  modality?: string | null;
};

export type RankedPageAnchor = {
  sourceDocumentTitle: string;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  snippet: string;
  score: number;
  basis: string[];
};

export type RankedAnchorResult = {
  primary: RankedPageAnchor | null;
  candidates: RankedPageAnchor[];
  ambiguous: boolean;
  unresolved: boolean;
  basis: string[];
  limitation: string | null;
};

function scoreTokenSpecificity(token: string): number {
  if (GENERIC_ANCHOR_TOKENS.has(token.toLowerCase())) return 0;
  if (token.length >= 8) return 3;
  if (token.length >= 5) return 2;
  return 1;
}

/** True when the needle is only generic tokens and cannot select a page alone. */
export function isGenericOnlyNeedle(needle: string | null | undefined): boolean {
  if (needle == null || !needle.trim()) return true;
  const tokens = needle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  if (!tokens.length) return true;
  return tokens.every((t) => GENERIC_ANCHOR_TOKENS.has(t));
}

function typeCompatible(preferred: string | null | undefined, actual: string | null): boolean {
  if (!preferred) return true;
  if (!actual) return false;
  const a = preferred.toLowerCase().replace(/_/g, " ");
  const b = actual.toLowerCase().replace(/_/g, " ");
  return a === b || a.includes(b) || b.includes(a);
}

function pageMatchesNeedle(pageText: string, needle: string): boolean {
  return pageText.toLowerCase().includes(needle.toLowerCase());
}

function scorePage(page: RankablePage, query: AnchorQuery): RankedPageAnchor | null {
  let score = 0;
  const basis: string[] = [];
  const pageText = page.text;

  if (query.quotedWording) {
    const q = query.quotedWording.trim();
    if (q.length >= 8 && pageMatchesNeedle(pageText, q)) {
      score += 100;
      basis.push("exact_quoted_wording");
    }
  }

  if (query.uniqueLabel) {
    const label = query.uniqueLabel.trim();
    if (label.length >= 2) {
      const re = new RegExp(
        `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")}\\b`,
        "i",
      );
      if (re.test(pageText)) {
        score += 80;
        basis.push("unique_label");
      }
    }
  }

  if (query.relationshipPhrase) {
    const phrase = query.relationshipPhrase.trim();
    if (phrase.length >= 6 && pageMatchesNeedle(pageText, phrase)) {
      score += 60;
      basis.push("relationship_phrase");
    }
  }

  if (query.preferredDocumentType && typeCompatible(query.preferredDocumentType, page.sourceDocumentType)) {
    score += 25;
    basis.push("document_type");
  }
  if (
    query.preferredDocumentTitle &&
    page.sourceDocumentTitle
      .toLowerCase()
      .includes(query.preferredDocumentTitle.toLowerCase().slice(0, 24))
  ) {
    score += 20;
    basis.push("document_title");
  }

  if (query.modality && query.modality !== "generic") {
    const pageMod = inferEvidenceModality(pageText.slice(0, 240));
    if (pageMod === query.modality) {
      score += 15;
      basis.push("modality");
    } else if (pageMod !== "generic" && pageMod !== query.modality) {
      // Hard incompatibility — do not bind a phone finding to a custody page.
      return null;
    }
  }

  const needleText =
    query.needle || query.relationshipPhrase || query.quotedWording || query.uniqueLabel || "";
  if (needleText) {
    const tokens = needleText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !GENERIC_ANCHOR_TOKENS.has(t));
    let hits = 0;
    for (const t of tokens) {
      if (pageText.toLowerCase().includes(t)) hits += scoreTokenSpecificity(t);
    }
    if (hits > 0) {
      score += Math.min(20, hits);
      basis.push("local_span");
    } else if (!basis.length) {
      // Needle present but only generic tokens hit — refuse.
      return null;
    }
  }

  if (score <= 0) return null;

  return {
    sourceDocumentTitle: page.sourceDocumentTitle,
    sourceDocumentType: page.sourceDocumentType,
    sourcePage: page.sourcePage,
    compiledPage: page.compiledPage,
    pageIdentityKnown: page.pageIdentityKnown,
    snippet: pageText.slice(0, 160),
    score,
    basis,
  };
}

/**
 * Rank pages for a query. Generic-only needles return unresolved with no primary.
 */
export function rankAnchorsForQuery(
  pages: RankablePage[],
  query: AnchorQuery,
): RankedAnchorResult {
  const hasSpecificSignal = Boolean(
    (query.quotedWording && query.quotedWording.trim().length >= 8) ||
      (query.uniqueLabel && query.uniqueLabel.trim().length >= 2) ||
      (query.relationshipPhrase && query.relationshipPhrase.trim().length >= 6) ||
      (query.needle && !isGenericOnlyNeedle(query.needle)),
  );

  if (!hasSpecificSignal) {
    return {
      primary: null,
      candidates: [],
      ambiguous: false,
      unresolved: true,
      basis: ["generic_needle_refused"],
      limitation:
        "Generic wording alone cannot select a supporting page — provenance remains unresolved",
    };
  }

  // Soft prefilter: page must contain at least one non-generic token from the query,
  // or an exact phrase/label.
  const probe =
    query.quotedWording ||
    query.uniqueLabel ||
    query.relationshipPhrase ||
    query.needle ||
    "";
  const scored: RankedPageAnchor[] = [];
  for (const page of pages) {
    if (probe && !isGenericOnlyNeedle(probe) && !pageMatchesNeedle(page.text, probe)) {
      // Still allow unique-label / quoted matches handled inside scorePage.
      if (
        !(query.uniqueLabel && pageMatchesNeedle(page.text, query.uniqueLabel)) &&
        !(query.quotedWording && pageMatchesNeedle(page.text, query.quotedWording)) &&
        !(query.relationshipPhrase && pageMatchesNeedle(page.text, query.relationshipPhrase))
      ) {
        continue;
      }
    }
    const ranked = scorePage(page, query);
    if (ranked) scored.push(ranked);
  }

  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return {
      primary: null,
      candidates: [],
      ambiguous: false,
      unresolved: true,
      basis: ["no_supporting_page"],
      limitation: "No supporting page could be identified for this finding",
    };
  }

  const top = scored[0]!.score;
  const tied = scored.filter((r) => r.score >= top - 5);
  const distinctPages = Array.from(
    new Set(
      tied.map(
        (t) =>
          `${t.sourceDocumentTitle}|${t.sourcePage ?? ""}|${t.compiledPage ?? ""}`,
      ),
    ),
  );
  const ambiguous = distinctPages.length > 1;
  const candidates = ambiguous ? tied : [scored[0]!];
  const basis = Array.from(new Set(tied.flatMap((t) => t.basis)));

  return {
    primary: ambiguous ? null : scored[0]!,
    candidates,
    ambiguous,
    unresolved: ambiguous || scored[0]!.score < 40,
    basis,
    limitation: ambiguous
      ? `Wording appears on ${distinctPages.length} pages — all candidate anchors preserved; do not rely on a single page`
      : scored[0]!.score < 40
        ? "Supporting page is uncertain — provenance remains unresolved"
        : null,
  };
}
