/**
 * Batch-9 registry contract validation — specs + behavioural fixture coverage.
 */

import fs from "node:fs";
import path from "node:path";
import { assertBehaviouralFixtureCoverage } from "./behavioural-fixtures";
import { BATCH9_CONTROL_SPECS } from "./control-specs";
import { BATCH9_CONTRACTS_FILE, type Batch9ControlSpec } from "./schemas";

export type Batch9RegistryValidationIssue = {
  controlId: string;
  field: string;
  detail: string;
};

export function validateBatch9ControlSpecCompleteness(
  specs: readonly Batch9ControlSpec[] = BATCH9_CONTROL_SPECS,
): Batch9RegistryValidationIssue[] {
  const issues: Batch9RegistryValidationIssue[] = [];
  for (const s of specs) {
    for (const [field, value] of Object.entries(s.contractRefs)) {
      if (!value || !String(value).includes("#")) {
        issues.push({ controlId: s.controlId, field, detail: `invalid ref: ${value}` });
      }
    }
    if (!s.exactPrerequisites?.length) {
      issues.push({ controlId: s.controlId, field: "exactPrerequisites", detail: "empty" });
    }
    if (!s.applicabilityRule?.trim()) {
      issues.push({ controlId: s.controlId, field: "applicabilityRule", detail: "empty" });
    }
    if (!s.findingOwnership?.trim()) {
      issues.push({ controlId: s.controlId, field: "findingOwnership", detail: "empty" });
    }
    if (!s.unavailableBehaviour?.trim()) {
      issues.push({ controlId: s.controlId, field: "unavailableBehaviour", detail: "empty" });
    }
    if (!s.evaluatorImplementationClass) {
      issues.push({ controlId: s.controlId, field: "evaluatorImplementationClass", detail: "missing" });
    }
    if (!s.executionAvailability) {
      issues.push({ controlId: s.controlId, field: "executionAvailability", detail: "missing" });
    }
    if (s.evaluatorClass !== s.evaluatorImplementationClass) {
      issues.push({
        controlId: s.controlId,
        field: "evaluatorClass",
        detail: "must mirror evaluatorImplementationClass",
      });
    }
  }
  return issues;
}

/** Fail if any contract ref marker is absent from the contracts file. */
export function validateBatch9ContractRefsExist(
  contractsFileAbsPath?: string,
): Batch9RegistryValidationIssue[] {
  const abs = contractsFileAbsPath ?? path.join(process.cwd(), BATCH9_CONTRACTS_FILE);
  if (!fs.existsSync(abs)) {
    return [
      {
        controlId: "*",
        field: "contractsFile",
        detail: `missing file ${BATCH9_CONTRACTS_FILE}`,
      },
    ];
  }
  const body = fs.readFileSync(abs, "utf8");
  const issues: Batch9RegistryValidationIssue[] = [];
  for (const s of BATCH9_CONTROL_SPECS) {
    for (const [field, ref] of Object.entries(s.contractRefs)) {
      const marker = ref.includes("#") ? `#${ref.slice(ref.indexOf("#") + 1)}` : `#${ref}`;
      if (!body.includes(marker)) {
        issues.push({
          controlId: s.controlId,
          field,
          detail: `contract marker not found in ${BATCH9_CONTRACTS_FILE}: ${marker}`,
        });
      }
    }
  }
  return issues;
}

export function assertBatch9RegistryContracts(): void {
  const a = validateBatch9ControlSpecCompleteness();
  const b = validateBatch9ContractRefsExist();
  const all = [...a, ...b];
  if (all.length) {
    throw new Error(
      `Batch-9 registry contract validation failed (${all.length}): ` +
        all
          .slice(0, 8)
          .map((i) => `${i.controlId}.${i.field}: ${i.detail}`)
          .join("; "),
    );
  }
  assertBehaviouralFixtureCoverage();
}
