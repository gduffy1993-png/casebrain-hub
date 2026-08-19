import type { FailureClassId, SeverityLevel } from "./taxonomy";

export const COVERAGE_STATUSES = [
  "evaluated",
  "not_exercised",
  "unavailable",
  "unresolved",
  "projection_only",
] as const;

export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const AUDIT_TIERS = ["A", "B", "C", "D", "E"] as const;
export type AuditTier = (typeof AUDIT_TIERS)[number];

export type AuditSurface =
  | "canonical_state"
  | "overview"
  | "court"
  | "papers"
  | "client_summary"
  | "cps_chase"
  | "file"
  | "api"
  | "copy"
  | "export"
  | "pdf"
  | "browser"
  | "security"
  | "corpus";

export interface SourceReference {
  documentId?: string;
  documentKind?: string;
  page?: number | string;
  path?: string;
  field?: string;
  quoteSha256?: string;
  limitation?: string;
}

export interface AuditResultEnvelope {
  schemaVersion: "casebrain-master3000-audit-result@1.0.0";
  runId: string;
  commit: string;
  caseId: string;
  controlId: string;
  invariantId: string;
  failureClass: FailureClassId;
  severity: SeverityLevel;
  evidenceFamily?: string;
  surface: AuditSurface;
  sourceReference?: SourceReference;
  expected: string;
  actual: string;
  rootCauseCluster?: string;
  disposition:
    | "pass"
    | "candidate_failure"
    | "confirmed_failure"
    | "false_positive"
    | "expected_containment"
    | "human_review_required"
    | "not_exercised";
  coverageStatus: CoverageStatus;
  notes?: string[];
}

export interface InvariantDefinition {
  id: string;
  title: string;
  failureClass: FailureClassId;
  severity: SeverityLevel;
  category:
    | "identity"
    | "charge"
    | "date_role"
    | "evidence_state"
    | "existence_vs_service"
    | "provenance_family"
    | "heuristic_firewall"
    | "stage_routing"
    | "entity_isolation"
    | "cross_tab"
    | "court_certainty"
    | "client_certainty"
    | "chase_validity"
    | "dedupe"
    | "counter"
    | "internal_language"
    | "case_isolation"
    | "repeatability"
    | "partial_processing"
    | "prompt_injection"
    | "browser"
    | "security";
  sourceTruthRequired: boolean;
  oppositeDirectionRequired: boolean;
  historicalRegression?: string;
}

export interface CoverageSummary {
  totalControls: number;
  uniqueControlsSeen: number;
  evaluatedControls: number;
  notExercisedControls: number;
  unavailableControls: number;
  unresolvedControls: number;
  projectionOnlyControls: number;
  claim: "green_on_exercised_controls_only" | "sufficient_for_configured_gate" | "insufficient_coverage";
  byStatus: Record<CoverageStatus, number>;
}

