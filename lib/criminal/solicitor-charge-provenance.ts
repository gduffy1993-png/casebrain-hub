/**
 * Solicitor-safe charge provenance + internal-language detection.
 * Fixture IDs, audit lanes, and filesystem paths must never render on solicitor surfaces.
 */

export const GENERAL_SUPPLIED_PAPERS_PROVENANCE =
  "charge wording recorded in the supplied case papers. Exact document and page reference not available in this test pack.";

export type ChargeProvenanceQuality = "exact_document_page" | "general_supplied_papers";

export type SolicitorChargeProvenance = {
  /** Safe to show after "Source: " on solicitor surfaces. */
  solicitorReference: string;
  provenanceQuality: ChargeProvenanceQuality;
  /** Internal audit only — never rendered on solicitor surfaces. */
  internalAuditReference: string | null;
};

/** Patterns that must never appear on solicitor-visible surfaces (copyable or blocked). */
export const SOLICITOR_FORBIDDEN_INTERNAL_LANGUAGE_RE =
  /\b(?:demo-audit|messy-pdf|v9[_-]?catalog|source\s+pack\s+(?:esa|v9|demo)|artifacts\/|lib\/eval\/|evidence-state-audit(?:-local)?|builderName|GOLD-11|phase1[01]_|fixtureId|canCopy|gateStatus|integrity_blocked)\b|[A-Za-z]:\\|(?:^|[\\/])(?:Users|home)[\\/]|\\(?:Users|home)\\|\b(?:cb-(?:fresh|found)-\d+|demo-audit-\d+[a-z0-9-]*|messy-pdf-v\d+[a-z0-9-]*|sc-[0-9a-f]{6,}|proof-pack-\d+|pilot-\d+)\b/i;

export function containsSolicitorForbiddenInternalLanguage(text: string | null | undefined): boolean {
  const t = text ?? "";
  if (!t) return false;
  if (SOLICITOR_FORBIDDEN_INTERNAL_LANGUAGE_RE.test(t)) return true;
  // Deferred import-free check: system / family-issue language is owned by family-provenance.
  // Callers that need the full scan should use scanSolicitorVisibleInternalLanguageBoundary.
  return false;
}

function isUsableProvenancePart(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (containsSolicitorForbiddenInternalLanguage(t)) return null;
  return t;
}

/**
 * Resolve solicitor-facing charge provenance.
 * Never invents "charge sheet" when only a general source pack is known.
 */
export function resolveSolicitorChargeProvenance(input: {
  documentTitle?: string | null;
  documentId?: string | null;
  pageOrSection?: string | null;
  extractionReference?: string | null;
  /** Raw / audit reference — kept internal when unsafe for solicitor display. */
  rawSourceReference?: string | null;
}): SolicitorChargeProvenance {
  const title = isUsableProvenancePart(input.documentTitle);
  const docId = isUsableProvenancePart(input.documentId);
  const page = isUsableProvenancePart(input.pageOrSection);
  const extraction = isUsableProvenancePart(input.extractionReference);
  const raw = (input.rawSourceReference ?? "").trim() || null;

  const parts: string[] = [];
  if (title) parts.push(title);
  if (docId) parts.push(`document ID ${docId}`);
  if (page) parts.push(page.startsWith("page") || page.startsWith("section") ? page : `page/section ${page}`);
  if (extraction) parts.push(`extraction ${extraction}`);

  if (parts.length >= 1 && (title || docId) && (page || extraction || docId)) {
    // Exact enough when we have a document identity plus at least id/page/extraction
    const hasPageOrId = Boolean(page || docId);
    if (title && hasPageOrId) {
      return {
        solicitorReference: parts.join(" — "),
        provenanceQuality: "exact_document_page",
        internalAuditReference: raw,
      };
    }
  }

  // Safe free-text reference (e.g. "MG5 p.2") when caller already sanitised it
  const rawSafe = isUsableProvenancePart(raw);
  if (rawSafe && /\b(p\.?\s*\d+|page\s+\d+|MG\d+|charge\s+sheet|section\s+\d+)/i.test(rawSafe)) {
    return {
      solicitorReference: rawSafe,
      provenanceQuality: "exact_document_page",
      internalAuditReference: raw && raw !== rawSafe ? raw : null,
    };
  }

  return {
    solicitorReference: GENERAL_SUPPLIED_PAPERS_PROVENANCE,
    provenanceQuality: "general_supplied_papers",
    internalAuditReference: raw,
  };
}
