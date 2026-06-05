/**
 * Phase 4d — product-safe reasoning bridge over proof-map spine.
 * Run: npx tsx scripts/reasoning-v2-bridge.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { sanitizeReasoningPublicText } from "../lib/criminal/reasoning-v2/sanitize-reasoning-text";

const FORBIDDEN = ["this wins", "crown collapses", "proves innocence", "guaranteed", "artifacts/"];

let passed = 0;
for (const entry of loadGoldPack()) {
  const id = entry.truthKey.bundleId;
  if (!entry.bundleTextPaths.length) continue;

  const text = readBundleText(entry.bundleTextPaths);
  const result = buildReasoningV2FromBundleText(text, entry.truthKey.label ?? id);

  assert.equal(result.available, true, `${id}: expected available reasoning view model`);
  if (!result.available) continue;

  assert.ok(result.primaryRoute.trim(), `${id}: missing primaryRoute`);
  assert.ok(result.whyRouteIsLive.trim(), `${id}: missing whyRouteIsLive`);
  assert.ok(result.safeNextAction.trim(), `${id}: missing safeNextAction`);
  assert.ok(result.doNotOverstateWarning.trim(), `${id}: missing doNotOverstateWarning`);
  assert.ok(result.warRoom.safeHearingLine.trim(), `${id}: missing war room safe hearing line`);
  assert.ok(result.warRoom.doNotOverstate.trim(), `${id}: missing war room doNotOverstate`);

  const blob = JSON.stringify(result).toLowerCase();
  assert.ok(!blob.includes("pp-"), `${id}: leaked proof point id`);
  assert.ok(!blob.includes("artifacts/"), `${id}: leaked artifact path`);
  assert.ok(!/\b(bundle|pack|corpus)-[a-z0-9-]+/.test(blob), `${id}: leaked internal id token`);

  for (const phrase of FORBIDDEN) {
    assert.ok(!blob.includes(phrase), `${id}: forbidden phrase "${phrase}" in UI model`);
  }

  const sanitized = sanitizeReasoningPublicText("Ask court (proof map: Identification of offender).");
  assert.ok(!sanitized.toLowerCase().includes("proof map"), "sanitizer should strip proof map parenthetical");

  passed++;
}

assert.equal(passed, 7, "expected 7 runnable gold bundles");
console.log("reasoning-v2-bridge.test.ts: ok (7/7)");
