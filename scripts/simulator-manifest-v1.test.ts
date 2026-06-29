/**
 * H4 simulator manifest v1 validation.
 * Run: npx tsx scripts/simulator-manifest-v1.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V1_CASES } from "../lib/eval/h4-simulator/manifest-v1-cases";

const MANIFEST_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json");

const REQUIRED = [
  "caseId",
  "title",
  "fakeDefendant",
  "offenceFamily",
  "profile",
  "mainIssue",
  "mustNotSay",
  "blockingFailPatterns",
  "pdfLayoutType",
  "redTeamTrapType",
] as const;

assert.equal(SIMULATOR_MANIFEST_V1_CASES.length, 30, "manifest v1 must have 30 cases");

const ids = new Set<string>();
for (const entry of SIMULATOR_MANIFEST_V1_CASES) {
  assert.ok(!ids.has(entry.caseId), `duplicate caseId ${entry.caseId}`);
  ids.add(entry.caseId);
  for (const key of REQUIRED) {
    assert.ok(entry[key] != null && entry[key] !== "", `${entry.caseId} missing ${key}`);
  }
  assert.ok(Array.isArray(entry.blockingFailPatterns) && entry.blockingFailPatterns.length > 0);
}

if (fs.existsSync(MANIFEST_PATH)) {
  const onDisk = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    cases: unknown[];
    targetCount: number;
  };
  assert.equal(onDisk.cases.length, 30);
  assert.equal(onDisk.targetCount, 30);
}

console.log("simulator-manifest-v1.test.ts: all assertions passed");
