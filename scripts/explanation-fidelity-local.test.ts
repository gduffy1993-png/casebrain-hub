/**
 * Local explanation fidelity — Phase 3.5c (gitignored expects).
 * Run: npx tsx scripts/explanation-fidelity-local.test.ts
 *
 * Requires artifacts/bundle-fidelity-local/cases/local-001-dangerous-driving/explanation-expect.json
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { localCasesRoot } from "../lib/eval/casebrain-auditor/bundle-fidelity-local";
import { readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { evaluateExplanationCase } from "../lib/eval/casebrain-auditor/explanation-fidelity-expect";

const caseId = "local-001-dangerous-driving";
const caseDir = path.join(localCasesRoot(), caseId);
const expectPath = path.join(caseDir, "explanation-expect.json");
const bundlePath = path.join(caseDir, "bundle-text.md");

if (!fs.existsSync(expectPath)) {
  console.log(
    "explanation-fidelity-local.test.ts: skip (no gitignored explanation-expect.json — copy from docs/bundle-fidelity-set/local/explanation-expect.template.json)",
  );
  process.exit(0);
}

assert.ok(fs.existsSync(bundlePath), `missing ${bundlePath}`);
const text = readBundleText([bundlePath]);
const { failures } = evaluateExplanationCase(caseId, text, caseDir);
assert.equal(failures.length, 0, failures.join("\n"));
console.log("explanation-fidelity-local.test.ts: ok (local-001)");
