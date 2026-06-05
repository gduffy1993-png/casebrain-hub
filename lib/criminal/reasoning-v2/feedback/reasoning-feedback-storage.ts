import { buildReasoningFeedbackRecord } from "./build-reasoning-feedback-record";
import { feedbackRecordContainsForbiddenContent } from "./reasoning-feedback-sanitize";
import type {
  BuildReasoningFeedbackInput,
  ReasoningFeedbackRecord,
} from "./reasoning-feedback-types";
import { REASONING_FEEDBACK_STORAGE_KEY } from "./reasoning-feedback-types";

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

/** Slice 1: browser localStorage only — no server persistence. */
export function saveReasoningFeedbackLocal(input: BuildReasoningFeedbackInput): ReasoningFeedbackRecord {
  const record = buildReasoningFeedbackRecord(input);
  if (feedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Feedback record rejected — forbidden content pattern");
  }
  const existing = readAllRaw();
  writeAll([...existing, record]);
  return record;
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
