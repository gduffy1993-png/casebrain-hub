import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson } from "./v2.1.2-run-authority";

const ROOT = process.cwd();
const AR = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution",
);
const aPath = path.join(
  AR,
  "realistic-child-v2.1.2-determinism-a-final",
  "determinism-probe-index.json",
);
const bPath = path.join(
  AR,
  "realistic-child-v2.1.2-determinism-b-final",
  "determinism-probe-index.json",
);
if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) {
  throw new Error(`DETERMINISM_PROBE_INDEX_MISSING:${aPath}:${bPath}`);
}
const a = JSON.parse(fs.readFileSync(aPath, "utf8"));
const b = JSON.parse(fs.readFileSync(bPath, "utf8"));
const aByCase = new Map((a.cases || []).map((row: any) => [row.caseId, row]));
const bByCase = new Map((b.cases || []).map((row: any) => [row.caseId, row]));
const mismatches: Array<Record<string, unknown>> = [];
for (const [caseId, aRow] of aByCase) {
  const bRow = bByCase.get(caseId) as any;
  if (!bRow) {
    mismatches.push({ caseId, missingIn: "b" });
    continue;
  }
  for (const field of [
    "semanticOutputSha256",
    "sourceBackedSha256",
    "solicitorVisibleSha256",
    "detectorResultsSha256",
    "detectorResultCount",
  ]) {
    if ((aRow as any)[field] !== bRow[field]) {
      mismatches.push({ caseId, field, a: (aRow as any)[field], b: bRow[field] });
    }
  }
}
const result = {
  schemaVersion: "stage3000-v2.1.2-determinism-contract@1.0.0",
  ok: a.caseCount === 20 && b.caseCount === 20 && aByCase.size === 20 && bByCase.size === 20 && mismatches.length === 0,
  runACaseCount: a.caseCount,
  runBCaseCount: b.caseCount,
  exclusionVersion: a.exclusionVersion,
  excludedKeys: a.excludedKeys,
  sourceBackedIdentical: mismatches.every((m) => m.field !== "sourceBackedSha256"),
  solicitorVisibleIdentical: mismatches.every((m) => m.field !== "solicitorVisibleSha256"),
  detectorResultsIdentical: mismatches.every((m) => m.field !== "detectorResultsSha256"),
  semanticOutputsIdentical: mismatches.every((m) => m.field !== "semanticOutputSha256"),
  mismatches,
};
atomicWriteJson(path.join(AR, "V2.1.2-DETERMINISM-CONTRACT.json"), result);
assert.equal(result.ok, true, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
