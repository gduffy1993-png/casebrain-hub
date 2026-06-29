#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { reliabilityForSourceState } from "../lib/criminal/five-answers/evidence-trace";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

assert.equal(reliabilityForSourceState("served"), "needs_review");
assert.equal(reliabilityForSourceState("referred_only"), "weak");
assert.equal(reliabilityForSourceState("missing"), "needs_review");

const chase = {
  disclosureSummary: "2 priority chase items",
  safeCourtLine: "The defence asks the court to record provisional position.",
  primaryItems: [
    {
      label: "BWV full export",
      source: "MG6 — referred",
      baseStatus: "outstanding",
      draftChaseWording: "Please provide the full BWV export.",
      courtLine: "The defence asks the court to record BWV is outstanding.",
      whyItMatters: "Sequence coverage",
      evidenceAnchor: null,
    },
  ],
  items: [],
} as unknown as DisclosureChaseBrief;

const war = {
  safePositionToday: "Provisional position pending BWV.",
  doNotOverstate: ["Do not say BWV shows the incident."],
  bundleContradictions: [],
} as unknown as HearingWarRoomBrief;

const view = buildFiveAnswersView({
  allegation: "Assault",
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
});

assert.ok(view.caseSaying.allegation.includes("Assault"));
assert.equal(view.mustNotOverstate.length, 1);
assert.ok(view.evidenceState.hardRules.length >= 5);
assert.ok(view.chase.length === 1);
assert.ok(view.courtNote.text.length > 10);
assert.ok(view.evidenceTrace.bySection.allegation.length >= 1);

console.log("five-answers-view.test.ts: PASS");
