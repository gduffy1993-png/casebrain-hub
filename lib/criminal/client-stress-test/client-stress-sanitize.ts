import { CLIENT_STRESS_NOTE_MAX_CHARS } from "./client-stress-types";

const FORBIDDEN_OUTPUT_PHRASES = [
  "this wins",
  "crown collapses",
  "crown cannot prove",
  "proves innocence",
  "guaranteed",
  "definitely defeats",
  "must dismiss",
  "client is truthful",
  "client is lying",
  "account is proven",
  "account is disproven",
] as const;

const FORBIDDEN_NOTE_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /===\s*SECTION:/i,
] as const;

export function sanitizeClientStressNote(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const note = trimmed.slice(0, CLIENT_STRESS_NOTE_MAX_CHARS);
  for (const re of FORBIDDEN_NOTE_PATTERNS) {
    if (re.test(note)) return null;
  }
  return note;
}

export function sanitizeClientStressLine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_OUTPUT_PHRASES) {
    if (lower.includes(phrase)) {
      return "Solicitor review required — wording flagged on stress-test output.";
    }
  }
  return out;
}

export function lintClientStressOutput(blob: string): string[] {
  const lower = blob.toLowerCase();
  const issues: string[] = [];
  for (const phrase of FORBIDDEN_OUTPUT_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden: ${phrase}`);
  }
  if (blob.includes("artifacts/")) issues.push("artifact path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local path");
  if (/\bpp-[a-z0-9-]+/.test(blob)) issues.push("proof point id");
  return issues;
}
