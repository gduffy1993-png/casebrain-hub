/**
 * Truth-key migration overlay v1 (Stage-50 evidence-state remediation).
 *
 * Original truth-key.json packets are NEVER rewritten. This overlay adjusts
 * expectations only where triage proved the truth key is less precise than
 * source (partial/incomplete must not be expected as fully served).
 *
 * Shared rule: partial/incomplete export language → expect incomplete, not served.
 * Entries below are the seven proven Stage-50 truth_key_defect findings with
 * exact source excerpts and migration hashes for Codex review.
 */

import crypto from "node:crypto";
import type { TruthExpectation } from "./types";

export const TRUTH_KEY_MIGRATION_VERSION = "truth-key-migration-v1-partial-not-served";

export type TruthKeyMigrationEntry = {
  migrationId: string;
  caseId: string;
  evidenceItem: string;
  oldExpectation: string;
  newExpectation: string;
  sourceExcerpt: string;
  reason: string;
  findingIdFromTriage: string;
  migrationHash: string;
};

function hashEntry(e: Omit<TruthKeyMigrationEntry, "migrationHash">): string {
  return crypto
    .createHash("sha256")
    .update(
      [
        e.migrationId,
        e.caseId,
        e.evidenceItem,
        e.oldExpectation,
        e.newExpectation,
        e.sourceExcerpt,
        e.reason,
      ].join("|"),
      "utf8",
    )
    .digest("hex");
}

function entry(
  partial: Omit<TruthKeyMigrationEntry, "migrationHash" | "migrationId"> & {
    migrationId?: string;
  },
): TruthKeyMigrationEntry {
  const migrationId =
    partial.migrationId ??
    `TKM-V1-${partial.caseId}-${partial.evidenceItem.replace(/\s+/g, "_").slice(0, 40)}`;
  const base = { ...partial, migrationId };
  return { ...base, migrationHash: hashEntry(base) };
}

/**
 * Shared applicability: evidence item is an MG11 officer/witness unit whose
 * gold incorrectly expects served when source says partial on export.
 */
export function isPartialMg11ServedTruthDefect(item: string, expected: string): boolean {
  const i = item.toLowerCase().trim();
  const e = expected.toLowerCase().replace(/\s+/g, "_");
  if (e !== "served") return false;
  return /^mg11\s+(officer|witness)$/i.test(i) || i === "mg11 officer" || i === "mg11 witness";
}

export const TRUTH_KEY_MIGRATION_V1_ENTRIES: TruthKeyMigrationEntry[] = [
  entry({
    caseId: "sc-0002d",
    evidenceItem: "mg11 officer",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "5. **MG11 officer** — partial on export",
    reason:
      "Source labels MG11 officer as partial on export. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-a21728817d67",
  }),
  entry({
    caseId: "sc-0002d",
    evidenceItem: "mg11 witness",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "6. MG11 witness (partial)",
    reason:
      "Source labels MG11 witness as partial. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-e288055ba799",
  }),
  entry({
    caseId: "sc-00025",
    evidenceItem: "mg11 officer",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "5. **MG11 officer** — partial on export",
    reason:
      "Source labels MG11 officer as partial on export. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-a21728817d67",
  }),
  entry({
    caseId: "sc-0006a",
    evidenceItem: "mg11 officer",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "5. **MG11 officer** — partial on export",
    reason:
      "Source labels MG11 officer as partial on export. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-a21728817d67",
  }),
  entry({
    caseId: "sc-0006a",
    evidenceItem: "mg11 witness",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "6. MG11 witness (partial)",
    reason:
      "Source labels MG11 witness as partial. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-e288055ba799",
  }),
  entry({
    caseId: "sc-0002e",
    evidenceItem: "mg11 officer",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "5. **MG11 officer** — partial on export",
    reason:
      "Source labels MG11 officer as partial on export. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-a21728817d67",
  }),
  entry({
    caseId: "sc-0002e",
    evidenceItem: "mg11 witness",
    oldExpectation: "served",
    newExpectation: "incomplete",
    sourceExcerpt: "6. MG11 witness (partial)",
    reason:
      "Source labels MG11 witness as partial. Partial extract must not be expected as fully served.",
    findingIdFromTriage:
      "MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-e288055ba799",
  }),
];

export const TRUTH_KEY_MIGRATION_REGISTER_HASH = crypto
  .createHash("sha256")
  .update(
    TRUTH_KEY_MIGRATION_V1_ENTRIES.map((e) => e.migrationHash).join("\n"),
    "utf8",
  )
  .digest("hex");

export function applyTruthKeyMigrationOverlay(input: {
  caseId: string;
  expectations: TruthExpectation[];
}): {
  expectations: TruthExpectation[];
  applied: TruthKeyMigrationEntry[];
} {
  const applied: TruthKeyMigrationEntry[] = [];
  const expectations = input.expectations.map((exp) => {
    const hit = TRUTH_KEY_MIGRATION_V1_ENTRIES.find(
      (m) =>
        m.caseId === input.caseId &&
        m.evidenceItem.toLowerCase() === exp.evidenceItem.toLowerCase() &&
        (exp.correctEvidenceState ?? "").toLowerCase().replace(/\s+/g, "_") ===
          m.oldExpectation,
    );
    if (!hit) return exp;
    // Shared guard: only migrate served→incomplete for partial MG11 pattern
    if (!isPartialMg11ServedTruthDefect(exp.evidenceItem, exp.correctEvidenceState ?? "")) {
      return exp;
    }
    applied.push(hit);
    return {
      ...exp,
      correctEvidenceState: hit.newExpectation,
    };
  });
  return { expectations, applied };
}
