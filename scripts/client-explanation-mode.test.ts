/**
 * Client Explanation Mode — slice 1.
 * Run: npx tsx scripts/client-explanation-mode.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import { buildClientExplanation } from "../lib/criminal/client-explanation/build-client-explanation";
import {
  isClientExplainEnabled,
  shouldShowClientExplanation,
} from "../lib/criminal/client-explanation/client-explanation-flag";
import { lintClientExplanationOutput } from "../lib/criminal/client-explanation/client-explanation-sanitize";

function assertNoLint(obj: object, label: string) {
  const issues = lintClientExplanationOutput(JSON.stringify(obj));
  assert.ok(!issues.length, `${label}: ${issues.join("; ")}`);
}

assert.equal(isClientExplainEnabled({ get: () => null }, false), false);
assert.equal(isClientExplainEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowClientExplanation(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowClientExplanation(true, false, true), false, "needs clientExplain");
assert.equal(shouldShowClientExplanation(true, true, true), true);

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("reasoning");

const ctx = {
  caseLabel: "R v Ella Shaw",
  clientLabel: "Ella Shaw",
  stage: "Magistrates — first hearing",
  hearingDateIso: "2024-09-18",
};

const basic = buildClientExplanation(reasoning, ctx, {
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(basic.available, true);
if (!basic.available) throw new Error("basic");
assert.ok(
  basic.fullText.match(/on the papers|provisional|solicitor review/i),
  "provisional wording",
);
assert.ok(
  basic.missingOrNeedsChecking.length >= 1 || basic.whatPapersCurrentlySay.length >= 2,
  "papers or missing content",
);
assertNoLint(basic, "motoring basic");

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence", "accident_no_dangerous_standard"],
});
const withStress = buildClientExplanation(reasoning, ctx, {
  clientStress: stress.available ? stress : null,
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(withStress.available, true);
if (!withStress.available) throw new Error("stress");
assert.ok(
  withStress.questionsForClient.some((q) => /vehicle|driver|presence|instructions/i.test(q)),
  "client questions from stress",
);

const generic = loadGoldPack().find((e) => e.truthKey.bundleId === "generic-provisional-sam-okonkwo");
assert.ok(generic?.bundleTextPaths.length);
const genericReasoning = buildReasoningV2FromBundleText(
  readBundleText(generic!.bundleTextPaths),
  "Generic",
);
assert.equal(genericReasoning.available, true);
if (!genericReasoning.available) throw new Error("generic");

const amberRed = buildClientExplanation(genericReasoning, { caseLabel: "R v Sam Okonkwo" }, {
  readinessInput: {
    bundleMeta: { documentCount: 4, combinedTextLength: 3500, thinBundleHint: true },
    workflowProfileHint: "generic_provisional",
  },
});
assert.equal(amberRed.available, true);
if (!amberRed.available) throw new Error("amberRed");
assert.ok(
  amberRed.plainEnglishCasePosition.match(/finalised|review|provisional/i),
  "readiness caution",
);
assert.ok(!amberRed.fullText.match(/this wins|crown collapses|safe to advise plea|proves innocence|you will win/i));
assertNoLint(amberRed, "generic caution");

assert.equal(buildClientExplanation(null).available, false);
assert.ok(!JSON.stringify(basic).includes("artifacts/"));

console.log("client-explanation-mode.test.ts: ok");
