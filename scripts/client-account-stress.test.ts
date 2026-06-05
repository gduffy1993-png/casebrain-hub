/**
 * Client Account Stress-Test — slice 1.
 * Run: npx tsx scripts/client-account-stress.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import {
  shouldShowClientStressPanel,
  isClientStressEnabled,
} from "../lib/criminal/client-stress-test/client-stress-flag";
import { lintClientStressOutput } from "../lib/criminal/client-stress-test/client-stress-sanitize";
import { selectionBlobContainsForbiddenContent } from "../lib/criminal/client-stress-test/client-stress-selection-storage";
import { CLIENT_ACCOUNT_OPTIONS } from "../lib/criminal/client-stress-test/client-stress-types";

assert.equal(CLIENT_ACCOUNT_OPTIONS.length, 11);

assert.equal(isClientStressEnabled({ get: () => null }, false), false);
assert.equal(isClientStressEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowClientStressPanel(false, true, true), false, "flag off = no UI");
assert.equal(shouldShowClientStressPanel(true, true, true), true, "flag on + reasoning v2");
assert.equal(shouldShowClientStressPanel(true, false, true), false, "needs reasoning v2 flag");

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("expected motoring reasoning");

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence", "accident_no_dangerous_standard"],
  otherNote: null,
});
assert.equal(stress.available, true);
if (!stress.available) throw new Error("expected stress result");

const blob = JSON.stringify(stress);
assert.ok(!lintClientStressOutput(blob).length, `lint: ${lintClientStressOutput(blob).join("; ")}`);
assert.ok(
  stress.supportsAccount.some((s) => /unresolved|driver|cctv|do not state/i.test(s)),
  "denies presence + motoring should mention unresolved driver/CCTV",
);
assert.ok(stress.clientInstructionQuestions.length >= 2);
assert.ok(stress.whatNotToOverstate.length >= 1);

const pwitsEntry = loadGoldPack().find((e) => e.truthKey.bundleId === "pilot-3-kian-doyle");
assert.ok(pwitsEntry?.bundleTextPaths.length);
const pwitsReasoning = buildReasoningV2FromBundleText(readBundleText(pwitsEntry!.bundleTextPaths), "PWITS");
assert.equal(pwitsReasoning.available, true);
if (!pwitsReasoning.available) throw new Error("pwits reasoning");

const supplyStress = buildClientStressResult(pwitsReasoning, {
  selectedOptions: ["accepts_possession_disputes_supply"],
});
assert.equal(supplyStress.available, true);
if (!supplyStress.available) throw new Error("supply stress");
assert.ok(
  supplyStress.missingBeforeAssessment.length + supplyStress.supportsAccount.length > 0,
  "supply dispute should reference papers",
);

const selectionBlob = JSON.stringify({
  selectedOptions: ["denies_presence"],
  otherNote: "Was not driving",
  updatedAt: new Date().toISOString(),
});
assert.equal(selectionBlobContainsForbiddenContent(selectionBlob), false);
assert.equal(
  selectionBlobContainsForbiddenContent(
    JSON.stringify({ selectedOptions: [], otherNote: "artifacts/casebrain-auditor/x" }),
  ),
  true,
);

assert.equal(buildClientStressResult(null, { selectedOptions: ["denies_presence"] }).available, false);

console.log("client-account-stress.test.ts: ok");
