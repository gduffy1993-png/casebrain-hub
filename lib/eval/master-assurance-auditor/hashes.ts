/**
 * Stable hashes and finding IDs for the Master Assurance Auditor.
 * Exact-string, normalised-template, occurrence and case denominators stay separate.
 */

import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function shortHash(input: string, len = 12): string {
  return sha256Hex(input).slice(0, len);
}

/** Normalised template: collapse whitespace + lowercase for template uniqueness. */
export function normaliseTemplate(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, "<date>")
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "<email>")
    .replace(/\bdemo-audit-\d+[a-z0-9-]*\b/gi, "<fixture>")
    .replace(/\bcase-\d+\b/gi, "<case>")
    .trim();
}

export function templateHash(text: string): string {
  return sha256Hex(normaliseTemplate(text));
}

export function wordingHash(text: string): string {
  return sha256Hex(text);
}

/**
 * Stable finding ID — does not include wall-clock time so reruns dedupe.
 * Format: MAA-<controlShort>-<case>-<surface>-<wordingHash12>
 */
export function buildFindingId(input: {
  controlId: string;
  caseId: string;
  surface: string;
  wording: string;
  code?: string;
}): string {
  const controlShort = input.controlId.replace(/^MAA-/, "").slice(0, 24);
  const code = (input.code ?? "hit").replace(/[^a-z0-9_]+/gi, "_").slice(0, 40);
  const wh = shortHash(input.wording);
  const caseSafe = input.caseId.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 32);
  const surfaceSafe = input.surface.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 32);
  return `MAA-${controlShort}-${code}-${caseSafe}-${surfaceSafe}-${wh}`;
}

export function corpusHashFromEntryHashes(hashes: string[]): string {
  return sha256Hex(hashes.slice().sort().join("\n"));
}
