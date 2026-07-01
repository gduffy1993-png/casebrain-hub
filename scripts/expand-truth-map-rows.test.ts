#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { expandTruthMapRowsForDisplay } from "../lib/criminal/five-answers/expand-truth-map-rows";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { evidenceRowFromSourceState } from "../lib/criminal/five-answers/evidence-trace";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const allegation = "Harassment, contrary to section 2 of the Protection from Harassment Act 1997";

const collapsed = [
  evidenceRowFromSourceState("MG6 / unused schedule clarification", "not_safely_confirmed"),
];

const chase = {
  disclosureSummary: "Phone extraction summary only; full download outstanding.",
  safeCourtLine: "Provisional position.",
  primaryItems: [
    {
      label: "MG6 / unused schedule clarification",
      source: "MG6C",
      baseStatus: "outstanding",
      draftChaseWording: "Please provide full phone extraction source and subscriber data.",
      courtLine: "",
      whyItMatters: "Attribution",
      evidenceAnchor: null,
    },
    {
      label: "Phone extraction source download",
      source: "MG6C/001",
      baseStatus: "outstanding",
      draftChaseWording: "Please provide the full phone extraction download.",
      courtLine: "",
      whyItMatters: "Attribution",
      evidenceAnchor: null,
    },
  ],
  items: [{ label: "Subscriber data" }],
} as unknown as DisclosureChaseBrief;

const doNotOverstate = [
  "Do not state the defendant sent messages unless attribution is served and safe.",
  'Do not state "MG11 is consistent and served" — Witness statement is draft or unsigned on papers',
];

const expanded = expandTruthMapRowsForDisplay({
  rows: collapsed,
  chase,
  allegation,
  doNotOverstate,
});

assert.ok(expanded.some((r) => r.existence === "served" && /screenshot|message pack/i.test(r.label)));
assert.ok(expanded.some((r) => /phone extraction summary/i.test(r.label) && r.existence === "referred_only"));
assert.ok(expanded.some((r) => /full phone download/i.test(r.label) && r.existence === "missing"));
assert.ok(expanded.some((r) => /subscriber|attribution/i.test(r.label) && r.existence === "missing"));
assert.ok(!expanded.some((r) => /unused schedule clarification/i.test(r.label)));

const war = {
  safePositionToday: "Provisional — attribution disputed.",
  doNotOverstate,
  bundleContradictions: [],
} as unknown as HearingWarRoomBrief;

const view = buildFiveAnswersView({
  allegation,
  warRoom: war,
  chase,
  matterConfidence: null,
  doNotOverstate,
});

const gotRight = view.evidenceState.rows.filter((r) => r.existence === "served");
assert.ok(gotRight.some((r) => /screenshot|message pack/i.test(r.label)));
assert.ok(view.mustNotOverstate.some((l) => /attribution|messages/i.test(l)));
assert.ok(view.chase.some((c) => /phone|extraction|subscriber|mg6/i.test(c.label)));

console.log("expand-truth-map-rows.test.ts: PASS");
