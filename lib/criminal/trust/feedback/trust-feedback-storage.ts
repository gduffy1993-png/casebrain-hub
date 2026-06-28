import { postTrustFeedbackToApi } from "./trust-feedback-api-client";
import { buildTrustFeedbackRecord } from "./build-trust-feedback-record";
import { trustFeedbackRecordContainsForbiddenContent } from "./trust-feedback-sanitize";
import type { BuildTrustFeedbackInput, TrustFeedbackRecord } from "./trust-feedback-types";
import { TRUST_FEEDBACK_STORAGE_KEY } from "./trust-feedback-types";

export type SaveTrustFeedbackResult = {
  record: TrustFeedbackRecord;
  persisted: boolean;
};

const MAX_STORED_RECORDS = 300;

function readAllRaw(): TrustFeedbackRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRUST_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is TrustFeedbackRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as TrustFeedbackRecord).caseId === "string" &&
        typeof (r as TrustFeedbackRecord).feedbackKind === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(records: TrustFeedbackRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = records.slice(-MAX_STORED_RECORDS);
    window.localStorage.setItem(TRUST_FEEDBACK_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / privacy mode */
  }
}

function appendLocalRecord(record: TrustFeedbackRecord): void {
  writeAll([...readAllRaw(), record]);
}

export function saveTrustFeedbackLocal(input: BuildTrustFeedbackInput): TrustFeedbackRecord {
  const record = buildTrustFeedbackRecord(input);
  if (trustFeedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Feedback record rejected — forbidden content pattern");
  }
  appendLocalRecord(record);
  return record;
}

export async function saveTrustFeedback(
  input: BuildTrustFeedbackInput,
  options?: { persistenceEnabled?: boolean },
): Promise<SaveTrustFeedbackResult> {
  const record = buildTrustFeedbackRecord(input);
  if (trustFeedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Feedback record rejected — forbidden content pattern");
  }

  if (options?.persistenceEnabled) {
    const apiResult = await postTrustFeedbackToApi(input.caseId, input);
    if (apiResult.ok) {
      appendLocalRecord(apiResult.record);
      return { record: apiResult.record, persisted: true };
    }
  }

  appendLocalRecord(record);
  return { record, persisted: false };
}

export function listTrustFeedbackLocal(): TrustFeedbackRecord[] {
  return readAllRaw();
}

export function listTrustFeedbackForCase(caseId: string): TrustFeedbackRecord[] {
  return readAllRaw().filter((r) => r.caseId === caseId);
}

export function clearTrustFeedbackLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TRUST_FEEDBACK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function replaceTrustFeedbackLocal(records: TrustFeedbackRecord[]): void {
  writeAll(records);
}
