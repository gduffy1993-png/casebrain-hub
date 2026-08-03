/**
 * Local SHA-256 helpers for the parallel controller.
 * Owned here so the controller does not depend on MAA production modules.
 */

import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256CanonicalJson(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

/** Stable JSON: sorted object keys, no whitespace variance. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

/** Normalise free text for semantic-duplicate fingerprinting (synthetic-safe). */
export function normaliseSemanticText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 .,_-]/g, "")
    .trim();
}

export function semanticFingerprint(text: string): string {
  return sha256Hex(normaliseSemanticText(text));
}
