/**
 * Copy-only schedule chase. Replaces the glued chase when column-aware input is available.
 * Not live wiring. Not self-learning.
 *
 * Without pdfPath or supplied column pages, do not publish an empty chase as "nothing
 * outstanding" — mark unsupported input and leave the prior pipeline alone.
 */
import {
  parseSchedule,
  columnPages,
} from "../../scripts/pattern-brain-schedule-parser-repair";
import {
  canonicalEvidenceKey,
  type CanonicalChaseRequest,
  type CanonicalEvidenceItem,
  type CanonicalEvidenceState,
} from "./evidence-state-canonical";
import { inferEvidenceModality } from "./evidence-state-reconcile";
import type {
  DerivedEvidenceRow,
  LiveCanonicalPipelineResult,
  UploadedDocumentUnit,
} from "./build-from-document-units";
import {
  SCHEDULE_CHASE_MULTIPLE_UNRESOLVED_REASON,
  SCHEDULE_CHASE_NOT_ESTABLISHED_REASON,
  SCHEDULE_CHASE_UNSUPPORTED_REASON,
  isScheduleChaseLabEnabled,
  type ScheduleChaseLabMeta,
  type ScheduleChaseObservation,
} from "./schedule-chase-lab-types";

export {
  SCHEDULE_CHASE_MULTIPLE_UNRESOLVED_REASON,
  SCHEDULE_CHASE_NOT_ESTABLISHED_REASON,
  SCHEDULE_CHASE_UNSUPPORTED_REASON,
  isScheduleChaseLabEnabled,
  type ScheduleChaseLabMeta,
  type ScheduleChaseObservation,
} from "./schedule-chase-lab-types";

function pagesFromUnits(units: UploadedDocumentUnit[]): string[] {
  const byPage = new Map<number, string[]>();
  for (const unit of units) {
    for (const page of unit.pages ?? []) {
      const n =
        typeof page.compiledPage === "number" && page.compiledPage > 0
          ? page.compiledPage
          : typeof page.pageNumber === "number" && page.pageNumber > 0
            ? page.pageNumber
            : null;
      if (n == null) continue;
      const list = byPage.get(n) ?? [];
      list.push(page.text ?? "");
      byPage.set(n, list);
    }
  }
  if (!byPage.size) {
    const joined = units.map((unit) => unit.fullText ?? "").filter(Boolean);
    return joined.length ? [joined.join("\n\n")] : [];
  }
  const max = Math.max(...byPage.keys());
  const pages: string[] = [];
  for (let i = 1; i <= max; i += 1) pages.push((byPage.get(i) ?? []).join("\n"));
  return pages;
}

function resolvePages(opts: {
  pdfPath?: string | null;
  pages?: string[] | null;
  units: UploadedDocumentUnit[];
}): { pages: string[]; source: ScheduleChaseLabMeta["source"]; columnAware: boolean } {
  if (opts.pages?.length) return { pages: opts.pages, source: "column-pages", columnAware: true };
  if (opts.pdfPath) return { pages: columnPages(opts.pdfPath), source: "column-pages", columnAware: true };
  return { pages: pagesFromUnits(opts.units), source: "unit-pages", columnAware: false };
}

function toItem(row: {
  page: number;
  reference: string;
  item: string;
  statusWord: string;
  side: "served" | "missing";
  line: string;
  absentFromCopy: string | null;
}): CanonicalEvidenceItem {
  const state = row.side === "served" ? "served" : "missing";
  const modality = inferEvidenceModality(row.item);
  return {
    label: row.item,
    key: `${canonicalEvidenceKey(row.item)}::${modality}`,
    modality,
    state,
    aliases: row.reference ? [row.reference] : [],
    defendants: [],
    observations: [
      {
        label: row.item,
        state,
        sourceDocumentTitle: "MG6 disclosure schedule",
        sourceDocumentType: "disclosure_schedule",
        sourcePage: String(row.page),
        compiledPage: String(row.page),
        pageIdentityKnown: true,
        sourceExcerpt: row.line,
        chaseFromThisObservation: state === "missing",
      },
    ],
    contradiction: null,
    unresolved: false,
    limitation: row.absentFromCopy,
  };
}

function toEvidenceRow(row: {
  page: number;
  item: string;
  side: "served" | "missing";
  line: string;
}): DerivedEvidenceRow {
  return {
    label: row.item,
    existence: row.side === "served" ? "served" : "missing",
    note: row.line,
    sourceDocumentTitle: "MG6 disclosure schedule",
    sourceDocumentType: "disclosure_schedule",
    sourcePage: String(row.page),
    compiledPage: String(row.page),
    pageIdentityKnown: true,
    defendants: [],
  };
}

function toChase(row: {
  item: string;
  statusWord: string;
  line: string;
  page: number;
}): CanonicalChaseRequest {
  const modality = inferEvidenceModality(row.item);
  return {
    label: row.item,
    key: `${canonicalEvidenceKey(row.item)}::${modality}`,
    modality,
    state: "missing",
    defendants: [],
    reason: `Schedule status "${row.statusWord}" — ${row.line} (p.${row.page})`,
    unresolved: false,
  };
}

function emptyLabMeta(
  partial: Pick<
    ScheduleChaseLabMeta,
    | "unsupportedReason"
    | "source"
    | "scheduleNotEstablished"
    | "multipleSchedulesUnresolved"
    | "sourceDocumentId"
    | "sourceDocumentName"
  > &
    Partial<
      Pick<
        ScheduleChaseLabMeta,
        "unsupportedInput" | "rowCount" | "scheduleDocuments" | "scheduleObservations" | "conflicts"
      >
    >,
): ScheduleChaseLabMeta {
  return {
    enabled: true,
    applied: false,
    unsupportedInput: partial.unsupportedInput ?? true,
    unsupportedReason: partial.unsupportedReason,
    scheduleNotEstablished: partial.scheduleNotEstablished,
    multipleSchedulesUnresolved: partial.multipleSchedulesUnresolved,
    source: partial.source,
    rowCount: partial.rowCount ?? 0,
    missingCount: 0,
    servedCount: 0,
    sourceDocumentId: partial.sourceDocumentId,
    sourceDocumentName: partial.sourceDocumentName,
    scheduleDocuments: partial.scheduleDocuments ?? [],
    scheduleObservations: partial.scheduleObservations ?? [],
    conflicts: partial.conflicts ?? [],
    uploadLimitations: [],
    cpsChaseHeld: true,
  };
}

function unsupportedMeta(source: ScheduleChaseLabMeta["source"]): ScheduleChaseLabMeta {
  return emptyLabMeta({
    unsupportedReason: SCHEDULE_CHASE_UNSUPPORTED_REASON,
    scheduleNotEstablished: false,
    multipleSchedulesUnresolved: false,
    source,
    sourceDocumentId: null,
    sourceDocumentName: null,
  });
}

function notEstablishedMeta(
  source: ScheduleChaseLabMeta["source"],
  provenance?: { documentId?: string | null; documentName?: string | null },
): ScheduleChaseLabMeta {
  return emptyLabMeta({
    unsupportedReason: SCHEDULE_CHASE_NOT_ESTABLISHED_REASON,
    scheduleNotEstablished: true,
    multipleSchedulesUnresolved: false,
    source,
    sourceDocumentId: provenance?.documentId ?? null,
    sourceDocumentName: provenance?.documentName ?? null,
  });
}

function multipleSchedulesMeta(opts: {
  scheduleDocuments: ScheduleChaseLabMeta["scheduleDocuments"];
  scheduleObservations: ScheduleChaseObservation[];
}): ScheduleChaseLabMeta {
  return emptyLabMeta({
    unsupportedReason: SCHEDULE_CHASE_MULTIPLE_UNRESOLVED_REASON,
    scheduleNotEstablished: false,
    multipleSchedulesUnresolved: true,
    source: "column-pages",
    sourceDocumentId: null,
    sourceDocumentName: null,
    rowCount: opts.scheduleObservations.length,
    scheduleDocuments: opts.scheduleDocuments,
    scheduleObservations: opts.scheduleObservations,
  });
}

/**
 * Replace the pipeline chase with schedule status cells when column-aware input works.
 * Old chase labels and glued evidence rows are dropped, not merged.
 * Without column-aware input, or when no schedule rows are recognised, the prior
 * pipeline is left unchanged and unsupportedInput is set (not a clean empty chase).
 */
export function applyScheduleChaseLab(
  pipeline: LiveCanonicalPipelineResult,
  opts: {
    units: UploadedDocumentUnit[];
    pdfPath?: string | null;
    pages?: string[] | null;
    /** Owned PDFs were readable but no schedule rows were found across them. */
    scheduleNotEstablished?: boolean;
    /** 2+ schedule-bearing uploads — do not treat any one as sole authority. */
    multipleSchedulesUnresolved?: boolean;
    scheduleDocuments?: ScheduleChaseLabMeta["scheduleDocuments"];
    scheduleObservations?: ScheduleChaseObservation[];
    sourceDocumentId?: string | null;
    sourceDocumentName?: string | null;
  },
): { pipeline: LiveCanonicalPipelineResult; meta: ScheduleChaseLabMeta } {
  const provenance = {
    documentId: opts.sourceDocumentId ?? null,
    documentName: opts.sourceDocumentName ?? null,
  };

  if (opts.multipleSchedulesUnresolved) {
    return {
      pipeline,
      meta: multipleSchedulesMeta({
        scheduleDocuments: opts.scheduleDocuments ?? [],
        scheduleObservations: opts.scheduleObservations ?? [],
      }),
    };
  }

  if (opts.scheduleNotEstablished) {
    return { pipeline, meta: notEstablishedMeta("column-pages", provenance) };
  }

  const { pages, source, columnAware } = resolvePages(opts);

  if (!columnAware) {
    return { pipeline, meta: unsupportedMeta(source) };
  }

  const parsed = parseSchedule(pages);
  const published = parsed.rows.filter((row) => !row.selfConflict);

  // Readable column text with zero schedule rows is not a clean empty schedule.
  if (published.length === 0) {
    return { pipeline, meta: notEstablishedMeta(source, provenance) };
  }

  const missing = published.filter((row) => row.side === "missing");
  const served = published.filter((row) => row.side === "served");
  const items = published.map(toItem);
  const chaseRequests = missing.map(toChase);
  const evidenceState: CanonicalEvidenceState = {
    items,
    contradictions: [],
    chaseRequests,
    suppressed: [],
  };
  const conflicts = parsed.later
    .filter((item) => item.relation === "same-item-conflict")
    .map((item) => ({
      page: Number(item.page ?? 0),
      item: String(item.item ?? ""),
      statusWord: String(item.statusWord ?? ""),
      line: String(item.line ?? ""),
      scheduleLine: String(item.scheduleLine ?? ""),
    }));
  const uploadLimitations = published
    .filter((row) => row.absentFromCopy)
    .map((row) => ({
      page: row.page,
      reference: row.reference,
      item: row.item,
      note: row.absentFromCopy as string,
      line: row.line,
    }));

  const next: LiveCanonicalPipelineResult = {
    ...pipeline,
    chaseLabels: chaseRequests.map((request) => request.label),
    suppressedChaseLabels: [],
    evidenceState,
    // One evidence story: schedule rows only. Old glued rows are not kept beside the chase.
    evidenceRows: published.map(toEvidenceRow),
  };

  return {
    pipeline: next,
    meta: {
      enabled: true,
      applied: true,
      unsupportedInput: false,
      unsupportedReason: null,
      scheduleNotEstablished: false,
      multipleSchedulesUnresolved: false,
      source,
      rowCount: published.length,
      missingCount: missing.length,
      servedCount: served.length,
      sourceDocumentId: provenance.documentId,
      sourceDocumentName: provenance.documentName,
      scheduleDocuments: provenance.documentId
        ? [
            {
              documentId: provenance.documentId,
              documentName: provenance.documentName ?? provenance.documentId,
              rowCount: published.length,
            },
          ]
        : [],
      scheduleObservations: published.map((row) => ({
        documentId: provenance.documentId ?? "schedule",
        documentName: provenance.documentName ?? "MG6 disclosure schedule",
        page: row.page,
        reference: row.reference,
        item: row.item,
        statusWord: row.statusWord,
        side: row.side,
        line: row.line,
      })),
      conflicts,
      uploadLimitations,
      cpsChaseHeld: true,
    },
  };
}

/** Unsafe first-label CPS letter stays held while the lab chase is requested. */
export function heldCpsChaseMessage(meta: ScheduleChaseLabMeta | null | undefined): string {
  if (!meta?.enabled) return "";
  if (meta.unsupportedInput) {
    return meta.unsupportedReason ?? SCHEDULE_CHASE_UNSUPPORTED_REASON;
  }
  return "CPS chase letter held on this copy. Schedule chase shows the page line; it does not auto-draft a CPS request from the first label.";
}
