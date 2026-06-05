import { REASONING_FEEDBACK_NOTE_MAX_CHARS } from "./reasoning-feedback-types";

const FORBIDDEN_NOTE_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
] as const;

/** Strip paths and internal ids from optional solicitor note. */
export function sanitizeReasoningFeedbackNote(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let note = trimmed.slice(0, REASONING_FEEDBACK_NOTE_MAX_CHARS);
  for (const re of FORBIDDEN_NOTE_PATTERNS) {
    if (re.test(note)) return null;
  }
  if (note.length > 2000) return null;
  return note;
}

export function feedbackRecordContainsForbiddenContent(record: Record<string, unknown>): boolean {
  const blob = JSON.stringify(record).toLowerCase();
  if (blob.includes("artifacts/")) return true;
  if (/\b[a-z]:\\/.test(blob)) return true;
  if (/\bpp-[a-z0-9-]+/.test(blob)) return true;
  if (blob.includes("=== section:")) return true;
  if (blob.includes("frontmatterscan")) return true;
  return false;
}
