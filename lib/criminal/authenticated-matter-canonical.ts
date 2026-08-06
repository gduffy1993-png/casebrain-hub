/**
 * Authenticated matter-loading path for canonical document/page units.
 * Used by GET /api/criminal/[caseId]/bundle-source (and shared by charges / key-facts).
 * Maps real uploaded documents → pipeline → payloads the browser builders consume.
 */

import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
import {
  pageUnitsFromExtractedText,
  type ExtractedPageUnit,
} from "@/lib/upload/pdf-page-units";
import { splitPageUnitsIntoLogicalDocuments } from "@/lib/criminal/compiled-bundle-segmentation";
import {
  buildCanonicalPipelineFromDocumentUnits,
  type DerivedEvidenceRow,
  type LiveCanonicalPipelineResult,
  type UploadedDocumentUnit,
  type UploadedPageUnit,
} from "@/lib/criminal/build-from-document-units";
import {
  serializeCanonicalFindingForSurface,
  type CanonicalFinding,
} from "@/lib/criminal/canonical-finding-model";
import type { StructuredChargeView } from "@/lib/criminal/structured-charge-state";
import {
  buildLiveProductionSurfacesFromDocumentUnits,
  type LiveProductionSurfaces,
} from "@/lib/criminal/canonical-live-surface-adapter";

export type CaseDocumentRow = {
  id: string;
  name?: string | null;
  title?: string | null;
  raw_text?: string | null;
  extracted_text?: string | null;
  extracted_json?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
  document_type?: string | null;
  document_date?: string | null;
  version_number?: number | null;
  replaces_document_id?: string | null;
};

/** API + client contract carried on bundle-source (authenticated matter load). */
export type AuthenticatedMatterCanonicalPayload = {
  findings: ReturnType<typeof serializeCanonicalFindingForSurface>[];
  /** Full findings for production builders (client may rehydrate summaries). */
  findingSummaries: Array<{
    kind: string;
    title: string;
    summary: string;
    unresolved: boolean;
    provenanceLine: string;
    severity?: string;
    referencedAbsent?: { referencedLabel: string } | null;
  }>;
  evidenceRows: DerivedEvidenceRow[];
  charges: StructuredChargeView[];
  chaseLabels: string[];
  suppressedChaseLabels: string[];
  documentRoles: Array<{ id: string; title: string | null; role: string }>;
  unitCount: number;
  pageUnitCount: number;
};

function bodyText(doc: CaseDocumentRow): string {
  const raw = typeof doc.raw_text === "string" ? doc.raw_text : "";
  const ext = typeof doc.extracted_text === "string" ? doc.extracted_text : "";
  return (raw.trim() || ext.trim() || "").trim();
}

/**
 * Read persisted page units.
 *
 * The array index is the compiled-bundle position, which is a real page identity.
 * The source document's own pagination is only adopted when it was actually recorded
 * (printed on the page at extraction time) — never synthesised from the index.
 */
function pagesFromExtractedJson(json: unknown): UploadedPageUnit[] | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const candidates = [root.pages, root.pageTexts, root.pdf_pages, root.page_texts];
  for (const c of candidates) {
    if (!Array.isArray(c) || c.length === 0) continue;
    const pages: UploadedPageUnit[] = [];
    for (let i = 0; i < c.length; i++) {
      const p = c[i];
      if (typeof p === "string") {
        pages.push({
          pageNumber: null,
          compiledPage: i + 1,
          text: p,
          pageIdentityKnown: true,
        });
        continue;
      }
      if (p && typeof p === "object") {
        const o = p as Record<string, unknown>;
        const text =
          (typeof o.text === "string" && o.text) ||
          (typeof o.content === "string" && o.content) ||
          (typeof o.body === "string" && o.body) ||
          "";
        const sourcePage =
          typeof o.sourcePage === "number" && o.sourcePage > 0
            ? o.sourcePage
            : typeof o.pageNumber === "number" && o.pageNumber > 0
              ? o.pageNumber
              : typeof o.page === "number" && o.page > 0
                ? o.page
                : null;
        const compiled =
          typeof o.compiledPage === "number" && o.compiledPage > 0
            ? o.compiledPage
            : typeof o.compiled_page === "number" && o.compiled_page > 0
              ? o.compiled_page
              : i + 1;
        pages.push({
          pageNumber: sourcePage,
          compiledPage: compiled,
          text,
          pageIdentityKnown: true,
        });
      }
    }
    // Scanned pages carry no text but must keep their compiled identity, so they are
    // retained here and only dropped if the whole document yielded nothing.
    if (pages.some((p) => p.text.trim())) return pages;
  }
  return null;
}

/**
 * Split on form-feed when present so multi-page PDFs keep page identity.
 * Only the compiled position is asserted; printed source pagination is recovered
 * separately from the page text.
 */
function pagesFromFormFeed(text: string): UploadedPageUnit[] | null {
  const units = pageUnitsFromExtractedText(text);
  if (!units?.length) return null;
  return units.map((u) => ({
    pageNumber: u.sourcePage,
    compiledPage: u.compiledPage,
    text: u.text,
    pageIdentityKnown: true,
  }));
}

function uploadTimestamp(doc: CaseDocumentRow): number | null {
  const raw = doc.updated_at ?? doc.created_at ?? null;
  if (raw == null) return null;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim();
  if (!text || /^(?:null|undefined|nan|invalid date)$/i.test(text)) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Assign increasing upload order (older → newer). bundle-source supplies rows
 * updated_at DESC, so input index alone must not make the oldest row operative.
 *
 * Equal or absent/invalid timestamps do NOT borrow retrieval order — that would
 * make operative selection non-deterministic across reordering. They share a
 * chronological bucket and the relationship model applies a stable id tie-break.
 */
function uploadOrderByDocumentId(docs: CaseDocumentRow[]): Map<string, number> {
  const ranked = docs
    .map((doc, inputIndex) => ({ doc, inputIndex, timestamp: uploadTimestamp(doc) }))
    .sort((a, b) => {
      if (a.timestamp != null && b.timestamp != null && a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      // Equal / absent / invalid timestamps: stable by id, never by array position.
      const byId = String(a.doc.id).localeCompare(String(b.doc.id));
      if (byId !== 0) return byId;
      return a.inputIndex - b.inputIndex;
    });
  return new Map(ranked.map((entry, rank) => [String(entry.doc.id), rank + 1]));
}

function toExtractedPageUnits(pages: UploadedPageUnit[]): ExtractedPageUnit[] {
  return pages.map((p, i) => ({
    compiledPage:
      typeof p.compiledPage === "number" && p.compiledPage > 0 ? p.compiledPage : i + 1,
    sourcePage: typeof p.pageNumber === "number" && p.pageNumber > 0 ? p.pageNumber : null,
    sourcePageTotal: null,
    text: p.text,
    textLayerEmpty: !p.text.replace(/\s+/g, "").length,
  }));
}

/**
 * Map authenticated case documents to uploaded document/page units.
 *
 * When a single uploaded file carries many page units (a compiled PDF), those pages
 * are split into logical child documents using evidenced header/footer boundaries.
 * unitCount then reflects logical documents, not the parent upload count. Pages with
 * no supported boundary stay under a parent-only child rather than inventing a title.
 */
export function mapCaseDocumentsToUploadedUnits(docs: CaseDocumentRow[]): UploadedDocumentUnit[] {
  const units: UploadedDocumentUnit[] = [];
  const uploadOrders = uploadOrderByDocumentId(docs);
  let orderCursor = 0;

  docs.forEach((doc, idx) => {
    const text = bodyText(doc);
    if (!text) return;
    const fromJson = pagesFromExtractedJson(doc.extracted_json);
    const fromFf = fromJson ?? pagesFromFormFeed(text);
    const pages: UploadedPageUnit[] = fromFf?.length
      ? fromFf
      : [
          {
            pageNumber: null,
            compiledPage: null,
            text,
            pageIdentityKnown: false,
          },
        ];

    const parentId = String(doc.id ?? `doc-${idx}`);
    const parentTitle = String(doc.name ?? doc.title ?? `Document ${idx + 1}`);
    const baseOrder = uploadOrders.get(String(doc.id)) ?? docs.length - idx;

    // Multi-page compiled PDFs expand into logical children. A single unsplit page
    // (or unknown-page whole document) stays as one unit.
    const hasCompiledPages =
      pages.length > 1 && pages.every((p) => typeof p.compiledPage === "number" && p.compiledPage > 0);

    if (hasCompiledPages) {
      const drafts = splitPageUnitsIntoLogicalDocuments({
        parentId,
        parentTitle,
        pageUnits: toExtractedPageUnits(pages),
      });
      if (drafts.length > 0) {
        for (const draft of drafts) {
          orderCursor += 1;
          units.push({
            id: draft.id,
            title: draft.title,
            documentType: draft.documentType ?? doc.document_type ?? null,
            documentDate: doc.document_date ?? null,
            versionNumber: doc.version_number ?? null,
            replacesDocumentId: doc.replaces_document_id ?? null,
            uploadOrder: baseOrder * 1000 + orderCursor,
            pages: draft.pages,
            fullText: draft.pages.map((p) => p.text).join("\f"),
          });
        }
        return;
      }
    }

    orderCursor += 1;
    units.push({
      id: parentId,
      title: parentTitle,
      documentType: doc.document_type ?? null,
      documentDate: doc.document_date ?? null,
      versionNumber: doc.version_number ?? null,
      replacesDocumentId: doc.replaces_document_id ?? null,
      uploadOrder: baseOrder * 1000 + orderCursor,
      pages,
      fullText: text,
    });
  });
  return units;
}

function toFindingSummaries(findings: CanonicalFinding[]): AuthenticatedMatterCanonicalPayload["findingSummaries"] {
  return findings.map((f) => ({
    kind: f.kind,
    title: f.title,
    summary: f.summary,
    unresolved: f.unresolved,
    provenanceLine: f.provenanceLine,
    severity: f.severity,
    referencedAbsent: f.referencedAbsent
      ? { referencedLabel: f.referencedAbsent.referencedLabel }
      : null,
  }));
}

/**
 * Build the canonical payload the authenticated matter loader attaches to bundle-source.
 * No test probes — evidence/chase only from document/page units.
 */
export function buildAuthenticatedMatterCanonicalFromDocuments(
  docs: CaseDocumentRow[],
  opts?: {
    caseId?: string;
    allegation?: string | null;
    caseTitle?: string | null;
    clientLabel?: string | null;
    /** When true, also run full production surface builders (tests / server composition). */
    withSurfaces?: boolean;
  },
): {
  units: UploadedDocumentUnit[];
  pipeline: LiveCanonicalPipelineResult;
  canonical: AuthenticatedMatterCanonicalPayload;
  surfaces: LiveProductionSurfaces | null;
} {
  const units = mapCaseDocumentsToUploadedUnits(docs);
  const emptyPipeline: LiveCanonicalPipelineResult = {
    graph: {
      nodes: [],
      referencedAbsentAttachments: [],
      exhibitCollisions: [],
      aliasFamilies: [],
    },
    findings: [],
    charges: [],
    evidenceRows: [],
    chaseLabels: [],
    suppressedChaseLabels: [],
    timestampObservations: [],
    bundleText: "",
    evidenceState: { items: [], contradictions: [], chaseRequests: [], suppressed: [] },
    attribution: {
      defendants: [],
      countAllocations: [],
      deviceOwnership: [],
      accountAssociation: [],
      messageAuthorship: [],
      contamination: [],
    },
    hearingLifecycle: {
      latest: null,
      superseded: [],
      conflict: false,
      conflictDescription: null,
      basis: "none",
    },
    precedence: {
      operativeDocumentId: null,
      supersededDocumentIds: [],
      basis: "none",
      unsupportedSupersessionCandidates: [],
      supersessionSupport: [],
    },
  };
  const pipeline =
    units.length > 0 ? buildCanonicalPipelineFromDocumentUnits(units) : emptyPipeline;

  const canonical: AuthenticatedMatterCanonicalPayload = {
    findings: pipeline.findings.map(serializeCanonicalFindingForSurface),
    findingSummaries: toFindingSummaries(pipeline.findings),
    evidenceRows: pipeline.evidenceRows,
    charges: pipeline.charges,
    chaseLabels: pipeline.chaseLabels,
    suppressedChaseLabels: pipeline.suppressedChaseLabels,
    documentRoles: pipeline.graph.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      role: n.role,
    })),
    unitCount: units.length,
    pageUnitCount: units.reduce((n, u) => n + u.pages.length, 0),
  };

  const surfaces =
    opts?.withSurfaces && units.length > 0
      ? buildLiveProductionSurfacesFromDocumentUnits(units, {
          caseId: opts.caseId,
          allegation: opts.allegation ?? undefined,
          caseTitle: opts.caseTitle ?? undefined,
          clientLabel: opts.clientLabel ?? undefined,
        })
      : null;

  return { units, pipeline, canonical, surfaces };
}

/**
 * Same composition as GET /api/criminal/[caseId]/bundle-source after auth + DB load.
 * Tests call this to follow the authenticated matter-loader contract without network.
 */
export function composeAuthenticatedBundleSourceWithCanonical(
  docs: CaseDocumentRow[],
  opts?: {
    caseId?: string;
    allegation?: string | null;
    caseTitle?: string | null;
    clientLabel?: string | null;
    withSurfaces?: boolean;
  },
): {
  documentCount: number;
  combinedTextLength: number;
  canonical: AuthenticatedMatterCanonicalPayload;
  units: UploadedDocumentUnit[];
  pipeline: LiveCanonicalPipelineResult;
  surfaces: LiveProductionSurfaces | null;
} {
  const payload = buildBundleSourcePayload(docs as Array<Record<string, unknown>>);
  const built = buildAuthenticatedMatterCanonicalFromDocuments(docs, opts);
  return {
    documentCount: docs.length,
    combinedTextLength: payload.combinedText.length,
    canonical: built.canonical,
    units: built.units,
    pipeline: built.pipeline,
    surfaces: built.surfaces,
  };
}
