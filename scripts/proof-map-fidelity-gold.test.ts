/**
 * Gold proof-map fidelity — Phase 4a slice 2 (violence / GBH / S18).
 * Run: npx tsx scripts/proof-map-fidelity-gold.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { evaluateProofMapCase, loadProofMapGoldExpect } from "../lib/eval/casebrain-auditor/proof-map-expect";
import { lintProofMapResult } from "../lib/eval/casebrain-auditor/proof-map-generate";

const EXPECT_DIR = path.join(__dirname, "..", "docs", "bundle-fidelity-set", "proof-map", "gold");
const expectIds = fs.readdirSync(EXPECT_DIR).filter((f) => f.endsWith(".expect.json"));
assert.ok(expectIds.length >= 4, "expected >= 4 gold proof-map expect files (Ella, Sam, Pike, S18)");

let passed = 0;
for (const entry of loadGoldPack()) {
  const id = entry.truthKey.bundleId;
  if (!loadProofMapGoldExpect(id)) continue;
  if (!entry.bundleTextPaths.length) continue;

  const text = readBundleText(entry.bundleTextPaths);
  const { map, failures } = evaluateProofMapCase(id, entry.truthKey.label ?? id, text);
  assert.equal(lintProofMapResult(map).length, 0, `${id}: forbidden phrasing`);
  assert.equal(failures.length, 0, `${id}:\n  ${failures.join("\n  ")}`);
  assert.ok(map.proofPoints.length >= 2);
  assert.ok(map.links.length >= 3);
  passed++;
}

assert.equal(passed, expectIds.length, "all expect bundles must run");
console.log(`proof-map-fidelity-gold.test.ts: ok (${passed}/${expectIds.length})`);
