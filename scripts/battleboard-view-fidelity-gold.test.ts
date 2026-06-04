/**
 * Gold battleboard-view fidelity — Phase 4b slice 1.
 * Run: npx tsx scripts/battleboard-view-fidelity-gold.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import {
  evaluateBattleboardViewCase,
  loadBattleboardViewGoldExpect,
} from "../lib/eval/casebrain-auditor/battleboard-view-expect";
import { lintBattleboardViewResult } from "../lib/eval/casebrain-auditor/battleboard-view-generate";

const EXPECT_DIR = path.join(__dirname, "..", "docs", "bundle-fidelity-set", "battleboard-view", "gold");
const expectIds = fs.readdirSync(EXPECT_DIR).filter((f) => f.endsWith(".expect.json"));
assert.ok(expectIds.length >= 7, "expected >= 7 gold battleboard-view expect files");

let passed = 0;
for (const entry of loadGoldPack()) {
  const id = entry.truthKey.bundleId;
  if (!loadBattleboardViewGoldExpect(id)) continue;
  if (!entry.bundleTextPaths.length) continue;

  const text = readBundleText(entry.bundleTextPaths);
  const { view, failures } = evaluateBattleboardViewCase(id, entry.truthKey.label ?? id, text);
  assert.equal(lintBattleboardViewResult(view).length, 0, `${id}: forbidden phrasing`);
  assert.equal(failures.length, 0, `${id}:\n  ${failures.join("\n  ")}`);
  assert.ok(view.primaryRoute.length > 0);
  assert.ok(view.proofPointsAttacked.length >= 1);
  assert.ok(view.safeNextAction.length > 0);
  passed++;
}

assert.equal(passed, expectIds.length, "all expect bundles must run");
console.log(`battleboard-view-fidelity-gold.test.ts: ok (${passed}/${expectIds.length})`);
