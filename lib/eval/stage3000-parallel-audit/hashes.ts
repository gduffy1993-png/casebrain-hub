/**
 * Stable hashing helpers for Stage-3000 parallel audit.
 * Occurrence / string / template / case / root-cause denominators stay separate.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256File(absPath: string): string {
  return sha256Hex(fs.readFileSync(absPath));
}

export function shortHash(input: string, len = 12): string {
  return sha256Hex(input).slice(0, len);
}

/** Normalised template: collapse whitespace + strip volatile tokens. */
export function normaliseTemplate(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, "<date>")
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "<email>")
    .replace(/\bsyn-case-\d+\b/gi, "<case>")
    .replace(/\b[0-9a-f]{8,}\b/gi, "<hex>")
    .trim();
}

export function templateHash(text: string): string {
  return sha256Hex(normaliseTemplate(text));
}

export function wordingHash(text: string): string {
  return sha256Hex(text);
}

export function orderedMembershipSha256(
  caseIdsInOrder: string[],
  packetSha256InOrder: string[],
): string {
  if (caseIdsInOrder.length !== packetSha256InOrder.length) {
    throw new Error("orderedMembershipSha256: length mismatch");
  }
  const lines = caseIdsInOrder.map((id, i) => `${i}|${id}|${packetSha256InOrder[i]}`);
  return sha256Hex(lines.join("\n"));
}

export function ledgerKey(parts: {
  runId: string;
  phase: string;
  caseId: string | null;
  controlId: string | null;
  contentSha256: string;
}): string {
  return [
    parts.runId,
    parts.phase,
    parts.caseId ?? "-",
    parts.controlId ?? "-",
    parts.contentSha256,
  ].join("|");
}

export function rootCauseSignature(input: {
  family: string;
  controlId: string;
  templateHash: string;
  handlerId: string;
}): string {
  return sha256Hex(
    [input.family, input.controlId, input.templateHash, input.handlerId].join("|"),
  );
}
