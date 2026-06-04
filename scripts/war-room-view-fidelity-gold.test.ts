/**
 * Gold war-room-view fidelity — Phase 4c slice 1.
 * Run: npx tsx scripts/war-room-view-fidelity-gold.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import {
  evaluateWarRoomViewCase,
  loadWarRoomViewGoldExpect,
} from "../lib/eval/casebrain-auditor/war-room-view-expect";
import { lintWarRoomViewResult } from "../lib/eval/casebrain-auditor/war-room-view-generate";

const EXPECT_DIR = path.join(__dirname, "..", "docs", "bundle-fidelity-set", "war-room-view", "gold");
const expectIds = fs.readdirSync(EXPECT_DIR).filter((f) => f.endsWith(".expect.json"));
assert.ok(expectIds.length >= 7, "expected >= 7 gold war-room-view expect files");

let passed = 0;
for (const entry of loadGoldPack()) {
  const id = entry.truthKey.bundleId;
  if (!loadWarRoomViewGoldExpect(id)) continue;
  if (!entry.bundleTextPaths.length) continue;

  const text = readBundleText(entry.bundleTextPaths);
  const { view, failures } = evaluateWarRoomViewCase(id, entry.truthKey.label ?? id, text);
  assert.equal(lintWarRoomViewResult(view).length, 0, `${id}: forbidden phrasing`);
  assert.equal(failures.length, 0, `${id}:\n  ${failures.join("\n  ")}`);
  assert.ok(view.safeHearingLine.length > 0);
  assert.ok(view.courtRecordRequests.length >= 1);
  assert.ok(view.nextHearingActions.length >= 1);
  passed++;
}

assert.equal(passed, expectIds.length, "all expect bundles must run");
console.log(`war-room-view-fidelity-gold.test.ts: ok (${passed}/${expectIds.length})`);
