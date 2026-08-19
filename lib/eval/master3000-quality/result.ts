import { isFailureClassId, isSeverityLevel, severityRank } from "./taxonomy";
import { COVERAGE_STATUSES, type AuditResultEnvelope, type CoverageStatus } from "./types";

export function validateAuditResult(result: AuditResultEnvelope): string[] {
  const issues: string[] = [];
  if (result.schemaVersion !== "casebrain-master3000-audit-result@1.0.0") issues.push("bad schemaVersion");
  for (const field of ["runId", "commit", "caseId", "controlId", "invariantId", "expected", "actual"] as const) {
    if (!result[field] || typeof result[field] !== "string") issues.push(`missing ${field}`);
  }
  if (!isFailureClassId(result.failureClass)) issues.push(`unknown failureClass: ${result.failureClass}`);
  if (!isSeverityLevel(result.severity)) issues.push(`unknown severity: ${result.severity}`);
  if (!(COVERAGE_STATUSES as readonly string[]).includes(result.coverageStatus)) {
    issues.push(`unknown coverageStatus: ${result.coverageStatus}`);
  }
  if (result.coverageStatus === "evaluated" && result.disposition === "not_exercised") {
    issues.push("evaluated result cannot have not_exercised disposition");
  }
  if (result.disposition === "confirmed_failure" && result.coverageStatus !== "evaluated") {
    issues.push("confirmed failure must be evaluated");
  }
  if (severityRank(result.severity) <= severityRank("P1") && result.disposition === "confirmed_failure" && !result.sourceReference) {
    issues.push("P0/P1 confirmed failures require a sourceReference or explicit source limitation");
  }
  return issues;
}

export function createAuditResult(input: Omit<AuditResultEnvelope, "schemaVersion">): AuditResultEnvelope {
  const result: AuditResultEnvelope = {
    schemaVersion: "casebrain-master3000-audit-result@1.0.0",
    ...input,
  };
  const issues = validateAuditResult(result);
  if (issues.length) {
    throw new Error(`Invalid audit result: ${issues.join("; ")}`);
  }
  return result;
}

export function coverageStatusRank(status: CoverageStatus): number {
  switch (status) {
    case "evaluated":
      return 0;
    case "unresolved":
      return 1;
    case "unavailable":
      return 2;
    case "projection_only":
      return 3;
    case "not_exercised":
      return 4;
  }
}

