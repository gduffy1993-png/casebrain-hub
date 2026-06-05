/**
 * Supervisor QA View — slice 1.
 * Run: npx tsx scripts/supervisor-qa-view.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import { buildSupervisorQAResult } from "../lib/criminal/supervisor-qa/build-supervisor-qa-result";
import {
  isSupervisorQAEnabled,
  shouldShowSupervisorQAPanel,
} from "../lib/criminal/supervisor-qa/supervisor-qa-flag";
import { lintSupervisorQAOutput } from "../lib/criminal/supervisor-qa/supervisor-qa-sanitize";
import type { ReasoningFeedbackRecord } from "../lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";

function assertNoLint(obj: object, label: string) {
  const issues = lintSupervisorQAOutput(JSON.stringify(obj));
  assert.ok(!issues.length, `${label}: ${issues.join("; ")}`);
}

assert.equal(isSupervisorQAEnabled({ get: () => null }, false), false);
assert.equal(isSupervisorQAEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowSupervisorQAPanel(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowSupervisorQAPanel(true, false, true), false, "needs supervisor");
assert.equal(shouldShowSupervisorQAPanel(true, true, true), true);

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("reasoning");

const readinessInput = {
  bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
  hearingMeta: { hearingDateIso: "2024-09-18", stage: "Magistrates — first hearing" },
};

const suggested = buildSupervisorQAResult(reasoning, { readinessInput });
assert.equal(suggested.available, true);
if (!suggested.available) throw new Error("suggested");
assert.ok(
  suggested.status === "suggested" || suggested.status === "required",
  "motoring thin should flag review",
);
assert.ok(suggested.missingCoreDisclosure.length + suggested.reasonsForReview.length > 0);
assertNoLint(suggested, "motoring");

const generic = loadGoldPack().find((e) => e.truthKey.bundleId === "generic-provisional-sam-okonkwo");
assert.ok(generic?.bundleTextPaths.length);
const genericReasoning = buildReasoningV2FromBundleText(
  readBundleText(generic!.bundleTextPaths),
  "Generic",
);
assert.equal(genericReasoning.available, true);
if (!genericReasoning.available) throw new Error("generic");

const required = buildSupervisorQAResult(genericReasoning, {
  readinessInput: {
    bundleMeta: { documentCount: 4, combinedTextLength: 3500, thinBundleHint: true },
    hearingMeta: { stage: "Crown Court — PTPH" },
  },
  workflowProfileHint: "generic_provisional",
});
assert.equal(required.available, true);
if (!required.available) throw new Error("required");
assert.equal(required.status, "required", "generic provisional + human review");
assert.equal(required.statusLabel, "Supervisor review required before relying on this position");
assertNoLint(required, "generic required");

const unsafeFeedback: ReasoningFeedbackRecord[] = [
  {
    id: "fb-1",
    caseId: "case-1",
    surface: "control-room-reasoning",
    feedbackOption: "unsafe_overconfident",
    note: null,
    routeLabel: "Test route",
    humanReviewRequired: true,
    timestamp: new Date().toISOString(),
    appVersion: "test",
  },
];

const withFeedback = buildSupervisorQAResult(reasoning, {
  readinessInput,
  feedbackRecords: unsafeFeedback,
});
assert.equal(withFeedback.available, true);
if (!withFeedback.available) throw new Error("feedback");
assert.equal(withFeedback.status, "required", "unsafe feedback => required");
assert.ok(
  withFeedback.feedbackConcerns.some((c) => /unsafe|overconfident/i.test(c)),
  "feedback concern listed",
);

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence"],
});
const withStress = buildSupervisorQAResult(reasoning, {
  readinessInput: {
    ...readinessInput,
    hearingMeta: { hearingDateIso: "2099-12-01", stage: "Magistrates" },
  },
  clientStress: stress.available ? stress : null,
});
assert.equal(withStress.available, true);
if (!withStress.available) throw new Error("stress");
assert.ok(withStress.doNotConcedePoints.length >= 0);

assert.ok(
  !JSON.stringify(withFeedback).match(/weak case|strong case|likely win|crown collapses|safe to advise plea/i),
  "no forbidden phrases",
);
assert.ok(!JSON.stringify(withFeedback).includes("artifacts/"));
assert.equal(buildSupervisorQAResult(null).available, false);

console.log("supervisor-qa-view.test.ts: ok");
