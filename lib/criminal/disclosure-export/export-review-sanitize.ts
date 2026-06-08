import { lintExportOutput } from "./export-sanitize";

const FORBIDDEN_STORAGE_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /===\s*SECTION:/i,
] as const;

export const EXPORT_REVIEW_NOTE_MAX = 400;

export function sanitizeExportReviewNote(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let out = trimmed.replace(/\s{2,}/g, " ").slice(0, EXPORT_REVIEW_NOTE_MAX);
  for (const re of FORBIDDEN_STORAGE_PATTERNS) {
    if (re.test(out)) return null;
  }
  if (lintExportOutput(out).length) return null;
  return out;
}

export function sanitizeExportReviewRouteLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let out = trimmed.slice(0, 240);
  for (const re of FORBIDDEN_STORAGE_PATTERNS) {
    if (re.test(out)) return null;
  }
  if (lintExportOutput(out).length) return null;
  return out;
}

export function exportReviewRecordContainsForbiddenContent(
  record: Record<string, unknown>,
): boolean {
  const blob = JSON.stringify(record);
  if (lintExportOutput(blob).length) return true;
  if (blob.includes("fullText") || blob.includes("exportBody")) return true;
  if (typeof record.note === "string" && record.note.length > EXPORT_REVIEW_NOTE_MAX) return true;
  if (
    typeof record.exportHash === "string" &&
    record.exportHash &&
    !/^[a-f0-9]{64}$/i.test(record.exportHash)
  ) {
    return true;
  }
  return false;
}

export function isValidExportHash(hash: unknown): hash is string {
  return typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash);
}
