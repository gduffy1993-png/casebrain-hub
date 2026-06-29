/**
 * H4 simulator manifest v2 validation.
 * Run: npx tsx scripts/simulator-manifest-v2.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v2.json");
const V1_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json");
const V1_1_PATH = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.1.json");

const VALID_BADGES = new Set([
  "served",
  "referred_only",
  "missing",
  "not_safely_confirmed",
  "provisional",
  "needs_review",
]);

const VALID_SENDABILITY = new Set([
  "safe_to_send",
  "provisional_check_source",
  "needs_solicitor_review",
  "blocked",
]);

const REQUIRED = [
  "caseId",
  "title",
  "fakeDefendant",
  "offenceFamily",
  "profile",
  "mainIssue",
  "mustNotSay",
  "blockingFailPatterns",
  "expectedTodayIssue",
  "expectedChaseItems",
  "expectedSummaryRisk",
  "expectedSourceStateBadges",
  "expectedSendability",
] as const;

assert.ok(fs.existsSync(MANIFEST_PATH), "run build-simulator-manifest-v2.ts first");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  cases: Array<Record<string, unknown>>;
  targetCount: number;
};

const existingIds = new Set<string>();
for (const p of [V1_PATH, V1_1_PATH]) {
  if (!fs.existsSync(p)) continue;
  const m = JSON.parse(fs.readFileSync(p, "utf8")) as { cases: Array<{ caseId: string }> };
  for (const c of m.cases) existingIds.add(c.caseId);
}

assert.equal(manifest.cases.length, 38);
assert.equal(manifest.targetCount, 38);

for (const entry of manifest.cases) {
  const caseId = entry.caseId as string;
  assert.ok(!existingIds.has(caseId), `v2 must not overlap v1/v1.1: ${caseId}`);
  assert.match(caseId, /^sim-0(3[89]|[4-6]\d|7[0-5])$/);

  for (const key of REQUIRED) {
    assert.ok(entry[key] != null && entry[key] !== "", `${caseId} missing ${key}`);
  }

  for (const badge of entry.expectedSourceStateBadges as string[]) {
    assert.ok(VALID_BADGES.has(badge), `${caseId} invalid badge: ${badge}`);
  }

  assert.ok(
    VALID_SENDABILITY.has(entry.expectedSendability as string),
    `${caseId} invalid sendability: ${entry.expectedSendability}`,
  );

  const patterns = entry.blockingFailPatterns as string[];
  assert.ok(patterns.length > 0);
  assert.ok(!(caseId === "sim-072" && patterns.includes("proved")));
  assert.ok(!(caseId === "sim-075" && patterns.includes("confirms")));
}

const sim075 = manifest.cases.find((c) => c.caseId === "sim-075");
assert.equal(sim075?.expectedSendability, "blocked");

console.log("simulator-manifest-v2.test.ts: all assertions passed");
