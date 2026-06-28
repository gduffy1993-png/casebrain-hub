import {
  TRUST_FEEDBACK_CONTEXT_MAX_CHARS,
  TRUST_FEEDBACK_NOTE_MAX_CHARS,
  TRUST_FEEDBACK_SNIPPET_MAX_CHARS,
} from "./trust-feedback-types";

const FORBIDDEN_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
] as const;

function sanitizeShortField(
  raw: string | null | undefined,
  maxChars: number,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let value = trimmed.slice(0, maxChars);
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(value)) return null;
  }
  if (value.includes("=== SECTION:")) return null;
  return value;
}

export function sanitizeTrustFeedbackNote(raw: string | null | undefined): string | null {
  return sanitizeShortField(raw, TRUST_FEEDBACK_NOTE_MAX_CHARS);
}

export function sanitizeTrustFeedbackSnippet(raw: string | null | undefined): string | null {
  return sanitizeShortField(raw, TRUST_FEEDBACK_SNIPPET_MAX_CHARS);
}

export function sanitizeTrustFeedbackContextLabel(raw: string | null | undefined): string | null {
  return sanitizeShortField(raw, TRUST_FEEDBACK_CONTEXT_MAX_CHARS);
}

export function trustFeedbackRecordContainsForbiddenContent(record: Record<string, unknown>): boolean {
  const blob = JSON.stringify(record).toLowerCase();
  if (blob.includes("artifacts/")) return true;
  if (/\b[a-z]:\\/.test(blob)) return true;
  if (/\bpp-[a-z0-9-]+/.test(blob)) return true;
  if (blob.includes("=== section:")) return true;
  if (blob.includes("frontmatterscan")) return true;
  return false;
}

export function isBadOutputCandidateKind(kind: string): boolean {
  return kind === "wrong" || kind === "unsafe" || kind === "bad_source" || kind === "missing_issue";
}
