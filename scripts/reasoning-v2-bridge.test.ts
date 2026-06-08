/**
 * Phase 4d — product-safe reasoning bridge over proof-map spine.
 * Run: npx tsx scripts/reasoning-v2-bridge.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { probeReasoningV2Surface } from "../lib/eval/casebrain-auditor/reasoning-v2-auditor-probe";
import { PILOT_3_TRUTH_MANIFESTS } from "../lib/eval/casebrain-auditor/truth-manifests";
import { assessBundleAvailability, reasoningV2UnavailableDetail } from "../lib/criminal/reasoning-v2/bundle-availability";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import {
  reasoningRouteDiffersFromBattleboard,
  REASONING_ROUTE_DIFFERS_NOTICE,
} from "../lib/criminal/reasoning-v2/route-consistency";
import {
  lintReasoningV2PublicText,
  sanitizeReasoningPublicText,
} from "../lib/criminal/reasoning-v2/sanitize-reasoning-text";

const FORBIDDEN = ["this wins", "crown collapses", "proves innocence", "guaranteed", "artifacts/"];

assert.equal(
  reasoningRouteDiffersFromBattleboard("Fraud / account-control route", "Identification / participation pressure"),
  true,
);
assert.equal(
  reasoningRouteDiffersFromBattleboard("Fraud / account-control / dishonesty pressure", "Fraud / account-control"),
  false,
);
assert.ok(REASONING_ROUTE_DIFFERS_NOTICE.includes("Solicitor review"));

const empty = assessBundleAvailability({ frontMatterScan: null, snippets: undefined, combinedTextLength: 0 });
assert.equal(empty.unavailableReason, "no_bundle_text");
assert.ok(reasoningV2UnavailableDetail("no_source_snippets").includes("MG5"));

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

  const lint = lintReasoningV2PublicText(blob);
  assert.equal(lint.length, 0, `${id}: lint issues: ${lint.join("; ")}`);

  passed++;
}

assert.equal(passed, 7, "expected 7 runnable gold bundles");

for (const manifest of PILOT_3_TRUTH_MANIFESTS) {
  const probe = probeReasoningV2Surface(manifest);
  assert.equal(probe.panelTestId, "reasoning-v2-panel");
  assert.equal(probe.lintIssues.length, 0, `${manifest.caseId}: auditor probe lint`);
}

const sanitized = sanitizeReasoningPublicText("Ask court (proof map: Identification of offender).");
assert.ok(!sanitized.toLowerCase().includes("proof map"), "sanitizer should strip proof map parenthetical");

console.log("reasoning-v2-bridge.test.ts: ok (7/7 + pilot probe)");
