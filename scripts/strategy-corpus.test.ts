#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { generateManifestFromSeed } from "@/lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { renderCorpusBundleText } from "@/lib/eval/casebrain-auditor/strategy-corpus-render";
import {
  assignStratifiedSplits,
  countSplits,
  targetSplitCounts,
} from "@/lib/eval/casebrain-auditor/strategy-corpus-split";
import { generateManifestBatch } from "@/lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { runStrategyCorpus } from "@/lib/eval/casebrain-auditor/strategy-corpus-run";
import {
  FAILURE_MODE_TAGS,
  OFFENCE_FAMILIES,
} from "@/lib/eval/casebrain-auditor/strategy-corpus-types";

// Same seed => same manifest
const a = generateManifestFromSeed(42, "discovery");
const b = generateManifestFromSeed(42, "discovery");
assert.equal(JSON.stringify(a), JSON.stringify(b), "same seed => same manifest");

// Same seed => same bundle text
const textA = renderCorpusBundleText(a);
const textB = renderCorpusBundleText(b);
assert.equal(textA, textB, "same seed => same bundle text");

// Split counts for 1000
const targets = targetSplitCounts(1000);
assert.equal(targets.discovery, 700);
assert.equal(targets.validation, 150);
assert.equal(targets.holdout, 150);

const assigned = assignStratifiedSplits(generateManifestBatch(1000, "all"));
const splits = countSplits(assigned);
assert.equal(splits.discovery, 700, `discovery ${splits.discovery}`);
assert.equal(splits.validation, 150, `validation ${splits.validation}`);
assert.equal(splits.holdout, 150, `holdout ${splits.holdout}`);

// All offence families represented at 1000
const families = new Set(assigned.map((m) => m.offenceFamily));
for (const f of OFFENCE_FAMILIES) {
  assert.ok(families.has(f), `missing family ${f}`);
}

// Failure-mode tags represented across corpus
const tags = new Set<string>();
for (const m of assigned) for (const t of m.failureModeTags) tags.add(t);
for (const tag of FAILURE_MODE_TAGS) {
  assert.ok(tags.has(tag), `failure mode tag not represented: ${tag}`);
}

// Holdout frozen
const holdout = assigned.filter((m) => m.split === "holdout");
assert.ok(holdout.length > 0);
assert.ok(holdout.every((m) => m.splitFrozen && !m.tuneAllowed), "holdout must be frozen");

// Canary run succeeds
const canary = runStrategyCorpus({
  count: 50,
  split: "discovery",
  canary: true,
  writeCache: false,
});
assert.equal(canary.scored, 50);
assert.ok(canary.passed + canary.weak + canary.failed === 50);

console.log("strategy-corpus.test.ts: ok");
