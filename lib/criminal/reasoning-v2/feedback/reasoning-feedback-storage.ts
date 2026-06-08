import { postReasoningFeedbackToApi } from "./reasoning-feedback-api-client";
import { buildReasoningFeedbackRecord } from "./build-reasoning-feedback-record";
import { feedbackRecordContainsForbiddenContent } from "./reasoning-feedback-sanitize";
import type {
  BuildReasoningFeedbackInput,
  ReasoningFeedbackRecord,
} from "./reasoning-feedback-types";
import { REASONING_FEEDBACK_STORAGE_KEY } from "./reasoning-feedback-types";

export type SaveReasoningFeedbackResult = {
  record: ReasoningFeedbackRecord;
  /** True when persisted to DB via API (persistence flag on). */
  persisted: boolean;
};

const MAX_STORED_RECORDS = 200;

function readAllRaw(): ReasoningFeedbackRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REASONING_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ReasoningFeedbackRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as ReasoningFeedbackRecord).caseId === "string" &&
        typeof (r as ReasoningFeedbackRecord).feedbackOption === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(records: ReasoningFeedbackRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = records.slice(-MAX_STORED_RECORDS);
    window.localStorage.setItem(REASONING_FEEDBACK_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / privacy mode */
  }
}

function appendLocalRecord(record: ReasoningFeedbackRecord): void {
  const existing = readAllRaw();
  writeAll([...existing, record]);
}

/** Browser localStorage only — always available as fallback. */
export function saveReasoningFeedbackLocal(input: BuildReasoningFeedbackInput): ReasoningFeedbackRecord {
  const record = buildReasoningFeedbackRecord(input);
  if (feedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Feedback record rejected — forbidden content pattern");
  }
  appendLocalRecord(record);
  return record;
}

/**
 * Save feedback: when persistence is enabled, attempt DB via API first;
 * always mirror to localStorage so supervisor QA and offline use keep working.
 */
export async function saveReasoningFeedback(
  input: BuildReasoningFeedbackInput,
  options?: { persistenceEnabled?: boolean },
): Promise<SaveReasoningFeedbackResult> {
  const record = buildReasoningFeedbackRecord(input);
  if (feedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Feedback record rejected — forbidden content pattern");
  }

  if (options?.persistenceEnabled) {
    const apiResult = await postReasoningFeedbackToApi(input.caseId, input);
    if (apiResult.ok) {
      appendLocalRecord(apiResult.record);
      return { record: apiResult.record, persisted: true };
    }
  }

  appendLocalRecord(record);
  return { record, persisted: false };
}

export function listReasoningFeedbackLocal(): ReasoningFeedbackRecord[] {
  return readAllRaw();
}

export function listReasoningFeedbackForCase(caseId: string): ReasoningFeedbackRecord[] {
  return readAllRaw().filter((r) => r.caseId === caseId);
}

/** For tests and dev tooling — not product UI. */
export function clearReasoningFeedbackLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REASONING_FEEDBACK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function replaceReasoningFeedbackLocal(records: ReasoningFeedbackRecord[]): void {
  writeAll(records);
}
