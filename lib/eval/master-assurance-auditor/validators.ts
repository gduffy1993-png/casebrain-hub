/**
 * Finding schema validators for Master Assurance Auditor.
 */

import type { MasterAuditorFinding, MasterFindingVerdict } from "./types";
import { MASTER_AUDITOR_SCHEMA_VERSION } from "./types";
import { resolveMasterControl } from "./control-registry";

const VERDICTS: MasterFindingVerdict[] = [
  "pass",
  "defect",
  "containment",
  "unresolved",
  "not_exercised",
];

export type FindingValidationIssue = {
  findingId: string | null;
  field: string;
  message: string;
};

export function validateMasterFinding(f: MasterAuditorFinding): FindingValidationIssue[] {
  const issues: FindingValidationIssue[] = [];
  const id = f?.findingId ?? null;
  if (!f || typeof f !== "object") {
    return [{ findingId: null, field: "$", message: "finding is not an object" }];
  }
  if (f.schemaVersion !== MASTER_AUDITOR_SCHEMA_VERSION) {
    issues.push({
      findingId: id,
      field: "schemaVersion",
      message: `expected ${MASTER_AUDITOR_SCHEMA_VERSION}`,
    });
  }
  if (!f.findingId || typeof f.findingId !== "string") {
    issues.push({ findingId: id, field: "findingId", message: "required string" });
  }
  try {
    resolveMasterControl(f.controlId);
  } catch {
    issues.push({ findingId: id, field: "controlId", message: `unknown ${f.controlId}` });
  }
  if (!VERDICTS.includes(f.verdict)) {
    issues.push({ findingId: id, field: "verdict", message: `invalid ${f.verdict}` });
  }
  if (typeof f.exactWording !== "string") {
    issues.push({ findingId: id, field: "exactWording", message: "required string" });
  }
  if (f.verdict === "defect" && !String(f.exactWording ?? "").trim()) {
    issues.push({
      findingId: id,
      field: "exactWording",
      message: "defect requires actual CaseBrain output wording",
    });
  }
  if (typeof f.plainEnglish !== "string" || !f.plainEnglish.trim()) {
    issues.push({ findingId: id, field: "plainEnglish", message: "required non-empty" });
  }
  if (
    typeof f.expectedProfessionalBehaviour !== "string" ||
    !f.expectedProfessionalBehaviour.trim()
  ) {
    issues.push({
      findingId: id,
      field: "expectedProfessionalBehaviour",
      message: "required non-empty",
    });
  }
  if (typeof f.supportingHash !== "string" || f.supportingHash.length < 16) {
    issues.push({ findingId: id, field: "supportingHash", message: "hash required" });
  }
  if (typeof f.wordingHash !== "string" || f.wordingHash.length < 16) {
    issues.push({ findingId: id, field: "wordingHash", message: "hash required" });
  }
  if (f.humanReviewDisposition != null && !f.humanReviewer) {
    issues.push({
      findingId: id,
      field: "humanReviewer",
      message: "disposition set without reviewer — forbidden auto sign-off",
    });
  }
  if (f.humanReviewedAt != null && !f.humanReviewer) {
    issues.push({
      findingId: id,
      field: "humanReviewedAt",
      message: "reviewedAt without reviewer — forbidden",
    });
  }
  if (!Array.isArray(f.affectedExits)) {
    issues.push({ findingId: id, field: "affectedExits", message: "array required" });
  }
  return issues;
}

export function assertFindingsValid(findings: MasterAuditorFinding[]): void {
  const all: FindingValidationIssue[] = [];
  for (const f of findings) all.push(...validateMasterFinding(f));
  if (all.length) {
    throw new Error(
      `Master finding validation failed (${all.length}): ${all
        .slice(0, 5)
        .map((i) => `${i.findingId}:${i.field}:${i.message}`)
        .join("; ")}`,
    );
  }
}
