/**
 * Canonical solicitor matter state — versioned schema (Phase 3).
 * All tabs / copy / exports must consume this (or an explicit adapter into it).
 */

export const CANONICAL_MATTER_STATE_VERSION = "1.1.0" as const;

export type CanonicalEvidenceExistence =
  | "served"
  | "referred_only"
  | "missing"
  | "incomplete"
  | "not_safely_confirmed";

export type CanonicalChaseStatus =
  | "not_started"
  | "due_soon"
  | "overdue"
  | "chased"
  | "received";

export type CanonicalMg11Status =
  | "served"
  | "draft_or_unsigned"
  | "referred"
  | "missing"
  | "not_on_file";

export type CanonicalHearingKind =
  | "unknown"
  | "listed"
  | "same_day"
  | "upcoming"
  | "passed"
  | "snapshot";

export type CanonicalAttributionState =
  | "not_applicable"
  | "unresolved"
  | "provisional"
  | "source_linked";

export type CanonicalEvidenceItem = {
  /** Stable id within the matter (deterministic from label+existence). */
  id: string;
  label: string;
  existence: CanonicalEvidenceExistence;
  note: string | null;
  sourceDocument: string | null;
  sourcePage: string | null;
};

export type CanonicalChaseItem = {
  id: string;
  label: string;
  status: CanonicalChaseStatus;
  whyItMatters: string | null;
};

export type CanonicalEvidenceCounts = {
  served: number;
  referred: number;
  missing: number;
  incomplete: number;
  notSafelyConfirmed: number;
};

export type CanonicalChaseCounts = {
  total: number;
  overdue: number;
  dueSoon: number;
  chased: number;
  received: number;
  notStarted: number;
};

/**
 * Versioned canonical matter model.
 * Derived fields are computed once; surfaces must not re-count independently.
 */
export type CanonicalMatterStateV1 = {
  schemaVersion: typeof CANONICAL_MATTER_STATE_VERSION;
  matter: {
    caseId: string | null;
    allegation: string | null;
    chargeWording: string | null;
    provisional: boolean;
  };
  offenceFamily: {
    family: string;
    confidence: "high" | "low" | "uncertain";
    failClosed: boolean;
    reason: string;
  };
  evidence: {
    items: CanonicalEvidenceItem[];
    counts: CanonicalEvidenceCounts;
  };
  chase: {
    items: CanonicalChaseItem[];
    counts: CanonicalChaseCounts;
  };
  mg11: {
    status: CanonicalMg11Status;
    label: string;
  };
  attribution: {
    state: CanonicalAttributionState;
    label: string;
  };
  hearing: {
    kind: CanonicalHearingKind;
    dateIso: string | null;
    statusLabel: string;
    isSnapshot: boolean;
  };
  /** Cross-surface equality proof — every migrated surface must echo this. */
  fingerprint: string;
};

export type CanonicalMatterFingerprintParts = {
  schemaVersion: string;
  evidenceCounts: CanonicalEvidenceCounts;
  chaseCounts: CanonicalChaseCounts;
  mg11: CanonicalMg11Status;
  attribution: CanonicalAttributionState;
  hearingKind: CanonicalHearingKind;
  hearingDateIso: string | null;
  offenceFamily: string;
  provisional: boolean;
  evidenceIds: string[];
  chaseIds: string[];
};
