/**
 * Matter Brief assembler smoke test.
 * Run: npx tsx scripts/matter-brief-assembler.test.ts
 */
import assert from "node:assert/strict";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const warRoom: HearingWarRoomBrief = {
  caseId: "test",
  caseTitle: "R v Neil Mitchell",
  clientLabel: "Neil Mitchell",
  allegation: "Fraud by false representation",
  stage: "PTPH",
  hearingStatus: "1 Jun 2026",
  bundleHealth: "THIN BUNDLE",
  positionStatus: "Position: provisional pending disclosure.",
  readiness: "Conditional",
  safePositionToday: "The defence position remains provisional pending disclosure.",
  sayThis: [],
  doNotOverstate: ["Do not concede dishonesty on these papers."],
  askCourtToRecord: ["Ask the court to record outstanding CCTV."],
  instructionsNeeded: [],
  nextHearingMoves: ["Chase itemised till receipts."],
  evidenceAnchors: [],
  collapseRisks: ["Loss figure inconsistency on file."],
  draftWording: {
    disclosureTimetable: "",
    adjournment: "",
    clientExplanation: "We are still reviewing the papers and chasing missing evidence.",
  },
};

const chase: DisclosureChaseBrief = {
  caseId: "test",
  caseTitle: "R v Neil Mitchell",
  clientLabel: "Neil Mitchell",
  allegation: "Fraud",
  stage: "PTPH",
  hearingStatus: "1 Jun 2026",
  bundleHealth: "THIN BUNDLE",
  positionStatus: "Provisional",
  disclosureSummary: "Several MG6 items remain outstanding.",
  safeCourtLine: warRoom.safePositionToday,
  items: [],
  primaryItems: [
    {
      label: "Itemised till receipts",
      draftChaseWording: "Please provide itemised receipts.",
      whyItMatters: "Loss reconciliation requires itemised figures.",
      status: "Outstanding",
      familyId: "other",
      source: "MG6",
      mergedFrom: [],
    },
  ],
  additionalItems: [],
  linkedRoutes: ["Fraud / account-control"],
  counters: { outstanding: 1, chased: 0, received: 0, notStarted: 0 },
  hearingDeadlineNote: null,
};

const brief = buildMatterBrief({
  warRoom,
  chase,
  primaryRouteTitle: "Fraud / account-control / dishonesty pressure",
});

assert.equal(brief.sections.length, 6);
assert.ok(brief.plainText.includes("Provisional case theory"));
assert.ok(brief.plainText.includes("Itemised till receipts"));
assert.ok(brief.sections.some((s) => s.id === "client" && s.paragraph?.includes("reviewing the papers")));

console.log("matter-brief-assembler.test.ts: ok");
