/**
 * H4 simulator manifest v1.1 validation (+7 serious-case supplement).
 * Run: npx tsx scripts/simulator-manifest-v1.1.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V1_1_CASES } from "../lib/eval/h4-simulator/manifest-v1.1-cases";

const MANIFEST_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.1.json");
const V1_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json");

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
  "expectedTodayIssue",
  "expectedChaseItems",
  "expectedSummaryRisk",
  "expectedSourceStateBadges",
  "expectedSendability",
] as const;

assert.equal(SIMULATOR_MANIFEST_V1_1_CASES.length, 7, "v1.1 must have 7 cases");

const v1Ids = new Set<string>();
if (fs.existsSync(V1_PATH)) {
  const v1 = JSON.parse(fs.readFileSync(V1_PATH, "utf8")) as { cases: Array<{ caseId: string }> };
  for (const c of v1.cases) v1Ids.add(c.caseId);
}

const ids = new Set<string>();
for (const entry of SIMULATOR_MANIFEST_V1_1_CASES) {
  assert.ok(!ids.has(entry.caseId), `duplicate caseId ${entry.caseId}`);
  assert.ok(!v1Ids.has(entry.caseId), `v1.1 must not overlap v1: ${entry.caseId}`);
  ids.add(entry.caseId);
  for (const key of REQUIRED) {
    assert.ok(entry[key] != null && entry[key] !== "", `${entry.caseId} missing ${key}`);
  }
  assert.ok(Array.isArray(entry.servedEvidence));
  assert.ok(Array.isArray(entry.referredOnlyEvidence));
  assert.ok(Array.isArray(entry.missingEvidence));
  assert.ok(Array.isArray(entry.uncertainEvidence));
  assert.ok(entry.blockingFailPatterns.length > 0);
  assert.ok(entry.mustNotSay.length > 0);
  assert.match(entry.caseId, /^sim-03[1-7]$/);
}

if (fs.existsSync(MANIFEST_PATH)) {
  const onDisk = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as { cases: unknown[]; targetCount: number };
  assert.equal(onDisk.cases.length, 7);
  assert.equal(onDisk.targetCount, 7);
}

console.log("simulator-manifest-v1.1.test.ts: all assertions passed");
