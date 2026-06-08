/**
 * Pre-hearing Readiness Badge — slice 1.
 * Run: npx tsx scripts/pre-hearing-readiness.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import { buildPreHearingReadiness } from "../lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import {
  isReadinessEnabled,
  shouldShowPreHearingReadiness,
} from "../lib/criminal/pre-hearing-readiness/readiness-flag";
import { lintReadinessOutput } from "../lib/criminal/pre-hearing-readiness/readiness-sanitize";
import type { ReasoningV2ViewModel } from "../lib/criminal/reasoning-v2/reasoning-v2-types";

function assertNoLint(result: object, label: string) {
  const issues = lintReadinessOutput(JSON.stringify(result));
  assert.ok(!issues.length, `${label} lint: ${issues.join("; ")}`);
}

assert.equal(isReadinessEnabled({ get: () => null }, false), false);
assert.equal(isReadinessEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowPreHearingReadiness(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowPreHearingReadiness(true, false, true), false, "needs readiness flag");
assert.equal(shouldShowPreHearingReadiness(true, true, true), true, "both flags on");

const greenMock: ReasoningV2ViewModel = {
  charge: "Theft from shop",
  stage: "Magistrates — first hearing",
  primaryRoute: "Dispute identification",
  whyRouteIsLive: "Identification pressure on served papers.",
  proofPointsUnderPressure: [{ label: "Identification", pressureCount: 1 }],
  evidenceHelpingDefence: [
    {
      label: "CCTV still partial",
      sourceSection: "MG5",
      sourceBasis: "Still image served with limited clarity.",
      confidence: "on_papers",
    },
    {
      label: "Witness MG11",
      sourceSection: "MG11",
      sourceBasis: "Witness account on file.",
      confidence: "on_papers",
    },
  ],
  evidenceHurtingDefence: [
    {
      label: "Officer observation",
      sourceSection: "MG5",
      sourceBasis: "Officer saw defendant leave store.",
      confidence: "on_papers",
    },
  ],
  missingMaterial: [],
  contradictions: [],
  collapseRisks: [],
  routeChangeTriggers: [],
  disclosureChasePriorities: [],
  safeNextAction: "Review served MG5 and MG11 before recording position.",
  doNotOverstateWarning: "Do not state identification is resolved.",
  humanReviewRequired: false,
  humanReviewReasons: [],
  warRoom: {
    safeHearingLine: "Identification remains conditional on served papers.",
    courtRecordRequests: [],
    disclosureTimetableRequests: [],
    doNotConcede: ["Do not concede identification from stills alone."],
    doNotOverstate: "Provisional on served papers only.",
    solicitorReviewRequired: false,
    solicitorReviewReasons: [],
  },
};

const green = buildPreHearingReadiness(greenMock, null, {
  bundleMeta: { documentCount: 12, combinedTextLength: 40_000 },
});
assert.equal(green.available, true);
if (!green.available) throw new Error("green");
assert.equal(green.level, "green", "mock with support and no review flags");
assert.equal(green.label, "Ready for solicitor review");
assertNoLint(green, "green mock");

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const motoringReasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(motoringReasoning.available, true);
if (!motoringReasoning.available) throw new Error("motoring reasoning");

const amber = buildPreHearingReadiness(motoringReasoning, null, {
  bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
  hearingMeta: { hearingDateIso: "2024-09-18", stage: "Magistrates — first hearing" },
});
assert.equal(amber.available, true);
if (!amber.available) throw new Error("amber");
assert.ok(
  amber.level === "amber" || amber.level === "red",
  `motoring thin should be amber or red, got ${amber.level}`,
);
assert.ok(amber.topBlockers.length >= 1, "missing material blockers");
assert.ok(
  amber.disclosureChasePriorities.length + amber.topBlockers.length > 0,
  "should surface chase/blockers",
);
assertNoLint(amber, "motoring amber");

const generic = loadGoldPack().find((e) => e.truthKey.bundleId === "generic-provisional-sam-okonkwo");
assert.ok(generic?.bundleTextPaths.length);
const genericReasoning = buildReasoningV2FromBundleText(
  readBundleText(generic!.bundleTextPaths),
  "Generic provisional",
);
assert.equal(genericReasoning.available, true);
if (!genericReasoning.available) throw new Error("generic reasoning");

const red = buildPreHearingReadiness(genericReasoning, null, {
  bundleMeta: { documentCount: 4, combinedTextLength: 3500, thinBundleHint: true },
  workflowProfileHint: "generic_provisional",
  hearingMeta: { stage: "Crown Court — PTPH" },
});
assert.equal(red.available, true);
if (!red.available) throw new Error("red");
assert.equal(red.level, "red", "generic provisional + thin + human review");
assert.equal(red.label, "Not ready to rely on yet");
assert.equal(red.solicitorReviewRequired, true);
assertNoLint(red, "generic red");

const selfDefStress = buildClientStressResult(genericReasoning, {
  selectedOptions: ["self_defence"],
});
assert.equal(selfDefStress.available, true);
if (!selfDefStress.available) throw new Error("self def stress");

const withStress = buildPreHearingReadiness(genericReasoning, selfDefStress, {
  bundleMeta: { documentCount: 4, combinedTextLength: 3500, thinBundleHint: true },
  workflowProfileHint: "generic_provisional",
});
assert.equal(withStress.available, true);
if (!withStress.available) throw new Error("with stress");
assert.ok(
  withStress.clientInstructionGaps.some((g) => /sequence|force|injur|witness|cctv/i.test(g)),
  "self-defence should surface instruction gaps",
);
assert.ok(
  !JSON.stringify(withStress).match(/self-defence is established|safe to advise plea|defence strong/i),
  "no unsafe self-defence or plea wording",
);
assert.ok(
  withStress.doNotConcedeRisks.some((r) => /self-defence|proportion|provisional|unresolved/i.test(r)),
  "do-not-concede for self-defence",
);
assertNoLint(withStress, "self-defence stress");

assert.equal(buildPreHearingReadiness(null, null).available, false);

console.log("pre-hearing-readiness.test.ts: ok");
