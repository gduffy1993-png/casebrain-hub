/**
 * Control proof receipt builders for the Assurance Engine.
 */

import { resolveAssuranceControl } from "@/lib/eval/assurance/controls";
import type {
  AssuranceControlId,
  AssuranceExitMode,
  ControlProofReceipt,
  ControlStatus,
} from "@/lib/eval/assurance/types";

export function buildControlReceipt(input: {
  runId: string;
  controlId: AssuranceControlId;
  status: ControlStatus;
  inputState: Record<string, unknown>;
  expectedResult: string;
  actualResult: string;
  detail: string;
  affectedExits?: AssuranceExitMode[];
  notCheckedReason?: string | null;
  checkedAt?: string;
}): ControlProofReceipt {
  const control = resolveAssuranceControl(input.controlId);
  if (input.status === "NOT_CHECKED" && !input.notCheckedReason) {
    throw new Error(`NOT_CHECKED receipt for ${input.controlId} requires notCheckedReason`);
  }
  return {
    runId: input.runId,
    controlId: input.controlId,
    status: input.status,
    severity: control.severity,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    inputState: input.inputState,
    expectedResult: input.expectedResult,
    actualResult: input.actualResult,
    affectedExits: input.affectedExits ?? control.affectedExits,
    notCheckedReason: input.notCheckedReason ?? null,
    detail: input.detail,
  };
}

export function summariseReceipts(receipts: ControlProofReceipt[]): {
  total: number;
  pass: number;
  partial: number;
  fail: number;
  notChecked: number;
  criticalFails: number;
  allMandatoryPass: boolean;
} {
  const pass = receipts.filter((r) => r.status === "PASS").length;
  const partial = receipts.filter((r) => r.status === "PARTIAL").length;
  const fail = receipts.filter((r) => r.status === "FAIL").length;
  const notChecked = receipts.filter((r) => r.status === "NOT_CHECKED").length;
  const criticalFails = receipts.filter(
    (r) => r.status === "FAIL" && (r.severity === "CRITICAL" || r.severity === "HIGH"),
  ).length;
  return {
    total: receipts.length,
    pass,
    partial,
    fail,
    notChecked,
    criticalFails,
    allMandatoryPass: fail === 0 && partial === 0,
  };
}
