/**
 * Authenticated matter-loading path for canonical document/page units.
 * Used by GET /api/criminal/[caseId]/bundle-source (and shared by charges / key-facts).
 * Maps real uploaded documents → pipeline → payloads the browser builders consume.
 */

import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
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

function pagesFromExtractedJson(json: unknown): UploadedPageUnit[] | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const candidates = [root.pages, root.pageTexts, root.pdf_pages, root.page_texts];
  for (const c of candidates) {
    if (!Array.isArray(c) || c.length === 0) continue;
    const pages: UploadedPageUnit[] = [];
    for (let i = 0; i < c.length; i++) {
      const p = c[i];
      if (typeof p === "string" && p.trim()) {
        pages.push({
          pageNumber: i + 1,
          compiledPage: null,
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
        if (!text.trim()) continue;
        const pageNumber =
          typeof o.pageNumber === "number"
            ? o.pageNumber
            : typeof o.page === "number"
              ? o.page
              : i + 1;
        const compiled =
          typeof o.compiledPage === "number"
            ? o.compiledPage
            : typeof o.compiled_page === "number"
              ? o.compiled_page
              : null;
        pages.push({
          pageNumber,
          compiledPage: compiled,
          text,
          pageIdentityKnown: true,
        });
      }
    }
    if (pages.length) return pages;
  }
  return null;
}

/** Split on form-feed when present so multi-page PDFs keep page identity. */
function pagesFromFormFeed(text: string): UploadedPageUnit[] | null {
  if (!text.includes("\f")) return null;
  const parts = text.split("\f").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map((t, i) => ({
    pageNumber: i + 1,
    compiledPage: null,
    text: t,
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

/**
 * Map authenticated case documents to uploaded document/page units.
 * Preserves page units when available; fullText never discards pages.
 */
export function mapCaseDocumentsToUploadedUnits(docs: CaseDocumentRow[]): UploadedDocumentUnit[] {
  const units: UploadedDocumentUnit[] = [];
  const uploadOrders = uploadOrderByDocumentId(docs);
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
    units.push({
      id: String(doc.id ?? `doc-${idx}`),
      title: String(doc.name ?? doc.title ?? `Document ${idx + 1}`),
      documentType: doc.document_type ?? null,
      documentDate: doc.document_date ?? null,
      versionNumber: doc.version_number ?? null,
      replacesDocumentId: doc.replaces_document_id ?? null,
      uploadOrder: uploadOrders.get(String(doc.id)) ?? docs.length - idx,
      pages,
      // Keep fullText for search/fallback — pages remain authoritative for provenance.
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
