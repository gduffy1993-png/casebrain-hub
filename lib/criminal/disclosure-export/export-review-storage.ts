import { postExportReviewToApi } from "./export-review-api-client";
import { buildExportReviewRecord } from "./export-review-validate";
import { exportReviewRecordContainsForbiddenContent } from "./export-review-sanitize";
import type { BuildExportReviewInput, ExportReviewRecord, ExportReviewType } from "./export-review-types";
import { EXPORT_REVIEW_STORAGE_KEY } from "./export-review-types";

export type SaveExportReviewResult = {
  ok: boolean;
  record: ExportReviewRecord | null;
  persisted: boolean;
};

const MAX_STORED_RECORDS = 200;

function readAllRaw(): ExportReviewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXPORT_REVIEW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ExportReviewRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as ExportReviewRecord).caseId === "string" &&
        typeof (r as ExportReviewRecord).exportType === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(records: ExportReviewRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = records.slice(-MAX_STORED_RECORDS);
    window.localStorage.setItem(EXPORT_REVIEW_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / privacy mode */
  }
}

function appendLocalRecord(record: ExportReviewRecord): void {
  writeAll([...readAllRaw(), record]);
}

export function saveExportReviewLocal(input: BuildExportReviewInput): ExportReviewRecord {
  const record = buildExportReviewRecord(input);
  if (exportReviewRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Export review rejected — forbidden content pattern");
  }
  appendLocalRecord(record);
  return record;
}

export async function saveExportReview(
  input: BuildExportReviewInput,
  options?: { persistenceEnabled?: boolean },
): Promise<SaveExportReviewResult> {
  let record: ExportReviewRecord;
  try {
    record = buildExportReviewRecord(input);
  } catch {
    return { ok: false, record: null, persisted: false };
  }

  if (exportReviewRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, record: null, persisted: false };
  }

  if (options?.persistenceEnabled) {
    const apiResult = await postExportReviewToApi(input.caseId, input);
    if (apiResult.ok) {
      appendLocalRecord(apiResult.record);
      return { ok: true, record: apiResult.record, persisted: true };
    }
  }

  appendLocalRecord(record);
  return { ok: true, record, persisted: false };
}

export function listExportReviewsForCase(caseId: string): ExportReviewRecord[] {
  return readAllRaw().filter((r) => r.caseId === caseId);
}

export function getLatestExportReviewForCaseAndType(
  caseId: string,
  exportType: ExportReviewType,
): ExportReviewRecord | null {
  const list = listExportReviewsForCase(caseId).filter((r) => r.exportType === exportType);
  if (!list.length) return null;
  return list.reduce((latest, r) => (r.createdAt >= latest.createdAt ? r : latest));
}

export function clearExportReviewsLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EXPORT_REVIEW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
