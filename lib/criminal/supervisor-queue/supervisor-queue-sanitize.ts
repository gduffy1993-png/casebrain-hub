const FORBIDDEN_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
] as const;

export const SUPERVISOR_QUEUE_LABEL_MAX = 280;
export const SUPERVISOR_QUEUE_REASON_LABELS_MAX = 6;

export function sanitizeSupervisorQueueLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let out = trimmed.replace(/\s{2,}/g, " ").slice(0, SUPERVISOR_QUEUE_LABEL_MAX);
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(out)) return null;
  }
  return out;
}

export function sanitizeSupervisorQueueLabelArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const label = sanitizeSupervisorQueueLabel(item);
    if (label) out.push(label);
    if (out.length >= SUPERVISOR_QUEUE_REASON_LABELS_MAX) break;
  }
  return out;
}

export function lintSupervisorQueueOutput(blob: string): string[] {
  const issues: string[] = [];
  if (blob.includes("artifacts/")) issues.push("artifact path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local path");
  if (/\bpp-[a-z0-9-]+/.test(blob)) issues.push("proof point id");
  if (/fullText|exportBody|bundleText|extracted_text/i.test(blob)) issues.push("forbidden body field");
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(blob)) issues.push("forbidden storage pattern");
  }
  return issues;
}

export function supervisorQueueRowIsSafe(row: Record<string, unknown>): boolean {
  return lintSupervisorQueueOutput(JSON.stringify(row)).length === 0;
}
