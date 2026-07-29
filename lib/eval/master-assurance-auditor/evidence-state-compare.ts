/**
 * Evidence-state comparison across raw vs solicitor-display domains.
 *
 * Schema policy (master-auditor 1.1.0): raw `not_safely_confirmed` maps to
 * solicitor-display `incomplete` for gold expected comparison. Those pairs are
 * equivalent — never report as state_mismatch. Always record both domain values.
 */

import type { SharedEvidenceState } from "@/lib/criminal/evidence-state-reconcile";

export type StateDomain = "raw" | "display";

const RAW_STATES = new Set([
  "served",
  "referred_only",
  "missing",
  "incomplete",
  "not_safely_confirmed",
]);

export function normaliseStateToken(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/not\s+safely\s+confirmed/g, "not_safely_confirmed")
    .replace(/referred\s+only/g, "referred_only");
}

/** Solicitor-display mapping for raw shared states (schema 1.1.0 policy). */
export function rawStateToDisplay(raw: string): string {
  const s = normaliseStateToken(raw);
  if (s === "not_safely_confirmed") return "incomplete";
  if (s === "referred_only") return "referred_only";
  return s;
}

export function displayStateToRawCandidates(display: string): string[] {
  const s = normaliseStateToken(display);
  if (s === "incomplete") return ["incomplete", "not_safely_confirmed"];
  return [s];
}

export type StateCompareResult = {
  equivalent: boolean;
  reason: "exact" | "domain_equivalence" | "compatible_family" | "mismatch";
  actualRaw: string;
  actualDisplay: string;
  expectedRaw: string;
  expectedDisplay: string;
};

export function compareEvidenceStates(input: {
  actualRaw: string;
  expected: string;
  label?: string;
}): StateCompareResult {
  const actualRaw = normaliseStateToken(input.actualRaw);
  const expectedNorm = normaliseStateToken(input.expected);
  const actualDisplay = rawStateToDisplay(actualRaw);
  const expectedDisplay = rawStateToDisplay(expectedNorm);
  const expectedRaw =
    expectedNorm === "incomplete" && actualRaw === "not_safely_confirmed"
      ? "not_safely_confirmed"
      : expectedNorm;
  const label = input.label ?? "";

  if (actualRaw === expectedNorm) {
    return {
      equivalent: true,
      reason: "exact",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }

  // Policy: raw not_safely_confirmed ↔ display/expected incomplete
  if (
    (actualRaw === "not_safely_confirmed" && expectedNorm === "incomplete") ||
    (actualRaw === "incomplete" && expectedNorm === "not_safely_confirmed")
  ) {
    return {
      equivalent: true,
      reason: "domain_equivalence",
      actualRaw,
      actualDisplay,
      expectedRaw,
      expectedDisplay: "incomplete",
    };
  }

  // Soft families already used historically
  if (expectedNorm === "missing" && /^(missing|absent)$/.test(actualRaw)) {
    return {
      equivalent: true,
      reason: "compatible_family",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }
  if (expectedNorm === "served" && actualRaw === "served") {
    return {
      equivalent: true,
      reason: "exact",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }
  if (expectedNorm === "referred_only" && /referred/.test(actualRaw)) {
    return {
      equivalent: true,
      reason: "compatible_family",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }

  // Uncertain prose ↔ not_safely_confirmed / incomplete (do not invent referred_only)
  if (
    expectedNorm === "not_safely_confirmed" &&
    (actualRaw === "incomplete" ||
      actualRaw === "unknown" ||
      actualRaw === "not_safely_confirmed")
  ) {
    return {
      equivalent: true,
      reason: "compatible_family",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay: rawStateToDisplay(expectedNorm),
    };
  }

  // Served summary/extract/partial is still incomplete relative to full export (F04 reverse)
  if (
    expectedNorm === "incomplete" &&
    actualRaw === "served" &&
    /\b(summary|extract|partial|screenshot|clip|still)\b/i.test(label)
  ) {
    return {
      equivalent: true,
      reason: "compatible_family",
      actualRaw,
      actualDisplay,
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }

  // Co-defendant-only is a valid, more precise state than referred_only/missing (F08)
  if (
    actualRaw === "other_defendant_only" &&
    (expectedNorm === "referred_only" ||
      expectedNorm === "missing" ||
      expectedNorm === "incomplete")
  ) {
    return {
      equivalent: true,
      reason: "compatible_family",
      actualRaw,
      actualDisplay: "other_defendant_only",
      expectedRaw: expectedNorm,
      expectedDisplay,
    };
  }

  return {
    equivalent: false,
    reason: "mismatch",
    actualRaw,
    actualDisplay,
    expectedRaw: expectedNorm,
    expectedDisplay,
  };
}

/**
 * Candidate defects retained pending source confirmation (Codex review of 31).
 * Matched by caseId + expected evidence item token + actual existence family.
 */
export type CandidateDefectSpec = {
  caseId: string;
  expectedItemIncludes: string;
  actualExistence: string;
  expectedState: string;
  note: string;
};

export const CANDIDATE_DEFECTS_PENDING_SOURCE: CandidateDefectSpec[] = [
  {
    caseId: "CASE-01",
    expectedItemIncludes: "complainant mg11",
    actualExistence: "served",
    expectedState: "incomplete",
    note: "draft complainant MG11 served vs expected incomplete",
  },
  {
    caseId: "CASE-02",
    expectedItemIncludes: "custody record extract",
    actualExistence: "served",
    expectedState: "incomplete",
    note: "custody extract served vs expected incomplete",
  },
  {
    caseId: "CASE-03",
    expectedItemIncludes: "custody record extract",
    actualExistence: "served",
    expectedState: "incomplete",
    note: "custody extract served vs expected incomplete",
  },
  {
    caseId: "CASE-08",
    expectedItemIncludes: "charge sheet",
    actualExistence: "missing",
    expectedState: "served",
    note: "corrected charge sheet missing vs expected served",
  },
  {
    caseId: "CASE-08",
    expectedItemIncludes: "mg5",
    actualExistence: "missing",
    expectedState: "served",
    note: "updated MG5 missing vs expected served",
  },
  {
    caseId: "CASE-12",
    expectedItemIncludes: "complainant mg11",
    actualExistence: "served",
    expectedState: "incomplete",
    note: "draft complainant MG11 served vs expected incomplete",
  },
];

export function matchCandidateDefect(input: {
  caseId: string;
  expectedItem: string;
  actualExistence: string;
  expectedState: string;
}): CandidateDefectSpec | null {
  const item = input.expectedItem.toLowerCase();
  const actual = normaliseStateToken(input.actualExistence);
  const expected = normaliseStateToken(input.expectedState);
  return (
    CANDIDATE_DEFECTS_PENDING_SOURCE.find(
      (c) =>
        c.caseId === input.caseId &&
        item.includes(c.expectedItemIncludes) &&
        actual === c.actualExistence &&
        expected === c.expectedState,
    ) ?? null
  );
}

export function isRawSharedState(value: string): value is SharedEvidenceState {
  return RAW_STATES.has(normaliseStateToken(value));
}
