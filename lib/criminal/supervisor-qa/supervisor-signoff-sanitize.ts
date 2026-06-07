import { sanitizeReasoningFeedbackNote } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-sanitize";
import { lintSupervisorQAOutput, sanitizeSupervisorQALine } from "./supervisor-qa-sanitize";
import {
  SUPERVISOR_SIGNOFF_MAX_REASON_LABELS,
  SUPERVISOR_SIGNOFF_NOTE_MAX_CHARS,
  SUPERVISOR_SIGNOFF_REASON_LABEL_MAX_CHARS,
} from "./supervisor-signoff-types";

const LABEL_FORBIDDEN = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
] as const;

export function sanitizeSupervisorSignoffNote(raw: string | null | undefined): string | null {
  const note = sanitizeReasoningFeedbackNote(raw);
  if (!note) return null;
  return note.slice(0, SUPERVISOR_SIGNOFF_NOTE_MAX_CHARS);
}

export function sanitizeSupervisorSignoffLabel(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let label = sanitizeSupervisorQALine(trimmed).slice(0, SUPERVISOR_SIGNOFF_REASON_LABEL_MAX_CHARS);
  for (const re of LABEL_FORBIDDEN) {
    if (re.test(label)) return null;
  }
  if (lintSupervisorQAOutput(label).length) return null;
  return label || null;
}

export function sanitizeSupervisorSignoffLabels(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const label = sanitizeSupervisorSignoffLabel(item);
    if (label) out.push(label);
    if (out.length >= SUPERVISOR_SIGNOFF_MAX_REASON_LABELS) break;
  }
  return out;
}

export function sanitizeSupervisorSignoffEvidenceStatus(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let line = sanitizeSupervisorQALine(trimmed).slice(0, 280);
  for (const re of LABEL_FORBIDDEN) {
    if (re.test(line)) return null;
  }
  if (lintSupervisorQAOutput(line).length) return null;
  return line || null;
}

export function signoffRecordContainsForbiddenContent(record: Record<string, unknown>): boolean {
  const issues = lintSupervisorQAOutput(JSON.stringify(record));
  if (issues.length) return true;
  const blob = JSON.stringify(record).toLowerCase();
  if (blob.includes("artifacts/")) return true;
  if (/\b[a-z]:\\/.test(blob)) return true;
  if (/\bpp-[a-z0-9-]+/.test(blob)) return true;
  if (blob.includes("=== section:")) return true;
  return false;
}
