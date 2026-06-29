#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildEvidenceTrace } from "../lib/criminal/five-answers/build-evidence-trace";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

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
      evidenceAnchor: "MG6C lists BWV as referred only",
    },
    {
      label: "MG11 witness A",
      source: "Served on bundle",
      baseStatus: "received",
      draftChaseWording: "",
      courtLine: "",
      whyItMatters: "Identification",
      evidenceAnchor: "MG11 page 2 — witness statement",
    },
  ],
  items: [],
} as unknown as DisclosureChaseBrief;

const war = {
  safePositionToday: "Provisional position pending BWV.",
  doNotOverstate: ["Do not say BWV shows the incident."],
  bundleContradictions: [],
} as unknown as HearingWarRoomBrief;

const trace = buildEvidenceTrace({
  allegation: "Assault",
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
});

const referred = trace.bySection.missing_referred.find((r) => r.claim.includes("BWV"));
assert.ok(referred);
assert.equal(referred?.existence, "referred_only");
assert.equal(referred?.notUsable, true);
assert.equal(referred?.reliability, "weak");

const served = trace.bySection.key_evidence.find((r) => r.claim.includes("MG11"));
assert.ok(served);
assert.equal(served?.existence, "served");
assert.equal(served?.reliability, "needs_review");

const dno = trace.bySection.do_not_overstate[0];
assert.ok(dno);
assert.equal(dno?.reliability, "unsafe");

const court = trace.bySection.court_note[0];
assert.ok(court?.claim.length > 10);
assert.equal(court?.reliability, "needs_review");

const view = buildFiveAnswersView({
  allegation: "Assault",
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate: war.doNotOverstate,
});
assert.ok(view.evidenceTrace.rows.length >= 5);
assert.ok(view.evidenceTrace.bySection.chase.length >= 1);

console.log("evidence-trace.test.ts: PASS");
