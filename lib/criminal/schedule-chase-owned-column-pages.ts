/**
 * Copy-only: resolve column-aware schedule pages from an authenticated case's
 * owned uploaded PDFs in storage. Never uses fixture paths. Caller must already
 * have verified case/org ownership.
 *
 * Scans every owned PDF. A document with schedule rows is never discarded just
 * because another document has more rows — most rows is not authority.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { columnPages } from "./schedule-chase-column-reader";
import { parseSchedule } from "./schedule-chase-parse";

function storageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "casebrain-documents";
}

export type OwnedDocumentStorageRow = {
  id: string;
  name?: string | null;
  type?: string | null;
  storage_url?: string | null;
};

export type OwnedScheduleDocument = {
  documentId: string;
  documentName: string;
  pages: string[];
  rowCount: number;
  observations: Array<{
    page: number;
    reference: string;
    item: string;
    statusWord: string;
    side: "served" | "missing";
    line: string;
    absentFromCopy: string | null;
  }>;
};

export type OwnedScheduleColumnResult =
  | {
      kind: "schedule";
      /** Present when exactly one owned PDF yields schedule rows. */
      pages: string[] | null;
      documentId: string | null;
      documentName: string | null;
      rowCount: number;
      schedules: OwnedScheduleDocument[];
      documentsTried: number;
      documentsReadable: number;
    }
  | {
      kind: "no-schedule";
      documentsTried: number;
      documentsReadable: number;
      readableDocumentIds: string[];
    };

function storagePathForDoc(storageUrl: string, bucket: string): string | null {
  const prefix = `${bucket}/`;
  if (storageUrl.startsWith(prefix)) return storageUrl.slice(prefix.length);
  if (storageUrl.startsWith(`${bucket}`)) return storageUrl.slice(bucket.length).replace(/^\//, "");
  if (!storageUrl.includes("://")) return storageUrl.replace(/^\//, "");
  return null;
}

export function pathBelongsToCase(objectPath: string, orgId: string, caseId: string): boolean {
  const parts = objectPath.split("/").filter(Boolean);
  if (parts.length >= 3 && parts[0] === orgId && parts[1] === caseId) return true;
  const orgIdx = parts.indexOf(orgId);
  const caseIdx = parts.indexOf(caseId);
  return orgIdx >= 0 && caseIdx > orgIdx;
}

function looksLikePdf(doc: OwnedDocumentStorageRow): boolean {
  const name = (doc.name ?? "").toLowerCase();
  const type = (doc.type ?? "").toLowerCase();
  return name.endsWith(".pdf") || type.includes("pdf");
}

function scheduleFromPages(
  pages: string[],
  doc: OwnedDocumentStorageRow,
): OwnedScheduleDocument | null {
  const parsed = parseSchedule(pages);
  const published = parsed.rows.filter((row) => !row.selfConflict);
  if (!published.length) return null;
  return {
    documentId: doc.id,
    documentName: doc.name ?? doc.id,
    pages,
    rowCount: published.length,
    observations: published.map((row) => ({
      page: row.page,
      reference: row.reference,
      item: row.item,
      statusWord: row.statusWord,
      side: row.side,
      line: row.line,
      absentFromCopy: row.absentFromCopy,
    })),
  };
}

/** Short process memo + single-flight — parallel UI hits must not re-parse the same PDFs. */
const RESOLVE_MEMO_TTL_MS = 120_000;
const resolveMemo = new Map<string, { at: number; value: OwnedScheduleColumnResult | null }>();
const resolveInflight = new Map<string, Promise<OwnedScheduleColumnResult | null>>();

function memoKey(opts: {
  orgId: string;
  caseId: string;
  docs: OwnedDocumentStorageRow[];
}): string {
  const docs = opts.docs
    .map((d) => `${d.id}:${d.storage_url ?? ""}:${d.type ?? ""}:${d.name ?? ""}`)
    .sort()
    .join("|");
  return `${opts.orgId}/${opts.caseId}::${docs}`;
}

/**
 * Download owned case PDFs and collect every document that has a recognised schedule.
 * Returns null when no eligible PDF bytes are available.
 */
export async function resolveOwnedScheduleColumnPages(opts: {
  supabase: SupabaseClient;
  orgId: string;
  caseId: string;
  docs: OwnedDocumentStorageRow[];
}): Promise<OwnedScheduleColumnResult | null> {
  const key = memoKey(opts);
  const hit = resolveMemo.get(key);
  if (hit && Date.now() - hit.at < RESOLVE_MEMO_TTL_MS) return hit.value;

  const pending = resolveInflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const value = await resolveOwnedScheduleColumnPagesUncached(opts);
    resolveMemo.set(key, { at: Date.now(), value });
    return value;
  })().finally(() => {
    resolveInflight.delete(key);
  });
  resolveInflight.set(key, run);
  return run;
}

async function resolveOwnedScheduleColumnPagesUncached(opts: {
  supabase: SupabaseClient;
  orgId: string;
  caseId: string;
  docs: OwnedDocumentStorageRow[];
}): Promise<OwnedScheduleColumnResult | null> {
  const bucket = storageBucket();
  const candidates = opts.docs.filter((doc) => doc.storage_url && looksLikePdf(doc));
  if (!candidates.length) return null;

  let documentsTried = 0;
  let documentsReadable = 0;
  const readableDocumentIds: string[] = [];
  const schedules: OwnedScheduleDocument[] = [];

  for (const doc of candidates) {
    const objectPath = storagePathForDoc(String(doc.storage_url), bucket);
    if (!objectPath || !pathBelongsToCase(objectPath, opts.orgId, opts.caseId)) continue;

    documentsTried += 1;
    const { data, error } = await opts.supabase.storage.from(bucket).download(objectPath);
    if (error || !data) continue;

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length < 8 || buffer.subarray(0, 4).toString("utf8") !== "%PDF") continue;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cb-schedule-chase-"));
    const tmpPdf = path.join(tmpDir, `${doc.id}.pdf`);
    try {
      fs.writeFileSync(tmpPdf, buffer);
      const pages = columnPages(tmpPdf);
      if (!pages.length) continue;
      documentsReadable += 1;
      readableDocumentIds.push(doc.id);
      const schedule = scheduleFromPages(pages, doc);
      if (schedule) schedules.push(schedule);
    } catch {
      continue;
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }

  if (schedules.length === 1) {
    const only = schedules[0]!;
    return {
      kind: "schedule",
      pages: only.pages,
      documentId: only.documentId,
      documentName: only.documentName,
      rowCount: only.rowCount,
      schedules,
      documentsTried,
      documentsReadable,
    };
  }

  if (schedules.length > 1) {
    return {
      kind: "schedule",
      // No sole authority — do not pick the largest schedule as truth.
      pages: null,
      documentId: null,
      documentName: null,
      rowCount: schedules.reduce((n, row) => n + row.rowCount, 0),
      schedules,
      documentsTried,
      documentsReadable,
    };
  }

  if (documentsReadable > 0) {
    return {
      kind: "no-schedule",
      documentsTried,
      documentsReadable,
      readableDocumentIds,
    };
  }

  return null;
}
