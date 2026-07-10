#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { GOLD_MANUAL_PROOF_SET_V1 } from "../lib/eval/gold-manual-proof-set/catalog";

assert.equal(GOLD_MANUAL_PROOF_SET_V1.length, 20, "20 gold cases");
const ids = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.goldId));
assert.equal(ids.size, 20, "unique gold ids");
const sources = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.sourceCaseId));
assert.equal(sources.size, 20, "unique source cases");
const families = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.familySlot));
assert.equal(families.size, 20, "unique family slots");

for (const c of GOLD_MANUAL_PROOF_SET_V1) {
  assert.match(c.goldId, /^CASE-\d{2}$/);
  assert.ok(c.familyLabel.length > 3);
  assert.ok(c.sourceCaseId.startsWith("demo-audit-"));
  assert.ok(c.reviewMinutesTarget <= 10);
}

console.log("gold-manual-proof-set.test.ts: PASS");
