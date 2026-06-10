/**
 * Tests: chase source gate + dev-ref scrub + no-position summary signal.
 * Run: npx tsx scripts/chase-source-gate.test.ts
 */
import assert from "node:assert/strict";
import {
  familySupport,
  gateChaseLine,
  gateChaseLines,
  gateMaterialLine,
  gateMaterialLines,
  gateProseAgainstSource,
  confirmNoneLine,
} from "../lib/criminal/chase-source-gate";
import { workflowDisclosureCaseWideLine } from "../lib/criminal/pilot-workflow";
import { safeSolicitorCaseTitle } from "../lib/criminal/dev-ref-scrub";
import { scrubDevRefs, containsDevRef } from "../lib/criminal/dev-ref-scrub";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";

// ---------- familySupport: mentioned / absent / negated + synonyms ----------
const SRC_MENTIONS = "MG5 summary. CCTV footage was seized from the venue. The complainant attended hospital after the incident. Officers reviewed the dispatch log.";
assert.equal(familySupport("cctv", SRC_MENTIONS), "mentioned", "cctv mentioned");
assert.equal(familySupport("medical", SRC_MENTIONS), "mentioned", "hospital counts as medical (synonym)");
assert.equal(familySupport("cad_999", SRC_MENTIONS), "mentioned", "dispatch log counts as CAD (synonym)");
assert.equal(familySupport("bwv", SRC_MENTIONS), "absent", "bwv never mentioned");
assert.equal(familySupport("phone", SRC_MENTIONS), "absent", "phone never mentioned");

const SRC_NEGATED = "MG5 summary. No CCTV available at the location. Officer attended; BWV was not activated. The complainant did not seek medical attention.";
assert.equal(familySupport("cctv", SRC_NEGATED), "negated", "no CCTV available → negated");
assert.equal(familySupport("bwv", SRC_NEGATED), "negated", "BWV not activated → negated");
assert.equal(familySupport("medical", SRC_NEGATED), "negated", "did not seek medical → negated");

const SRC_BODYWORN = "Body-worn video captured the arrest.";
assert.equal(familySupport("bwv", SRC_BODYWORN), "mentioned", "body-worn synonym for BWV");

// ---------- gateChaseLine ----------
assert.deepEqual(
  gateChaseLine("Chase CCTV master footage and export logs.", SRC_MENTIONS),
  { action: "keep" },
  "mentioned family chase keeps",
);
assert.equal(
  gateChaseLine("Chase BWV from attending officers.", SRC_MENTIONS).action,
  "drop",
  "absent family chase drops",
);
const negRes = gateChaseLine("Chase CCTV master footage.", SRC_NEGATED);
assert.equal(negRes.action, "replace", "negated family chase becomes confirm-none");
assert.match(
  (negRes as { replacement: string }).replacement,
  /confirm in writing that none exists/i,
  "confirm-none wording present",
);
assert.deepEqual(
  gateChaseLine("Take instructions on the defence account.", SRC_NEGATED),
  { action: "keep" },
  "non-chase lines untouched",
);
assert.deepEqual(
  gateChaseLine("Chase CCTV master footage.", ""),
  { action: "keep" },
  "no source text → cannot gate, keep",
);

const gated = gateChaseLines(
  ["Chase CCTV master footage.", "Chase CCTV continuity statement.", "Reconcile MG5 and interview accounts."],
  SRC_NEGATED,
);
assert.equal(gated.length, 2, "two CCTV chases collapse into one confirm-none + non-chase line");
assert.equal(gated.filter((l) => /confirm in writing/i.test(l)).length, 1, "confirm-none deduped");

assert.equal(
  gateMaterialLine("Full CCTV master footage", SRC_MENTIONS).action,
  "keep",
  "profile label without chase verb keeps when mentioned",
);
assert.equal(
  gateMaterialLine("Search BWV export", SRC_MENTIONS).action,
  "drop",
  "profile label without chase verb drops when absent",
);
const gatedMaterial = gateMaterialLines(["Full CCTV master footage", "Search BWV export"], SRC_NEGATED);
assert.equal(gatedMaterial.length, 2, "negated families each become confirm-none");
assert.ok(gatedMaterial.every((l) => /confirm in writing/i.test(l)), "material lines gate without chase verbs");

// ---------- battleboard end-to-end: no invented chases ----------
const NO_CCTV_BUNDLE = `MG5 CASE SUMMARY
Allegation: assault by beating outside a public house. The defendant denies the act.
No CCTV available at the location. BWV was not activated by attending officers.
The complainant declined medical attention at scene.
MG11 witness statement of bar staff describes a brief scuffle.
Interview: defendant answered questions and denied striking anyone.
${"Further narrative detail about the incident and accounts. ".repeat(30)}`;

const bbNoCctv = buildStrategyBattleboard({ case_id: "t1", bundle_text: NO_CCTV_BUNDLE });
const bbNoCctvText = JSON.stringify([
  bbNoCctv.urgent_next_moves,
  bbNoCctv.routes.map((r) => r.next_moves),
]);
assert.ok(
  !/chase[^"]{0,40}cctv/i.test(bbNoCctvText),
  "battleboard must not chase CCTV when source negates it",
);
assert.ok(
  !/chase[^"]{0,40}(bwv|body[- ]?worn)/i.test(bbNoCctvText),
  "battleboard must not chase BWV when source negates it",
);

// ---------- disclosure chase brief end-to-end ----------
const briefNegated = buildDisclosureChaseBrief({
  caseId: "t1",
  caseTitle: "R v Test",
  clientLabel: "the client",
  allegation: "assault",
  stage: "",
  hearingStatus: "",
  hearingDateIso: null,
  bundleHealth: "",
  positionStatus: "",
  battleboard: bbNoCctv,
  bundleText: NO_CCTV_BUNDLE,
});
for (const item of briefNegated.items) {
  if (/cctv/i.test(item.label)) {
    assert.match(item.label, /none exists/i, "CCTV item converted to confirm-none");
    assert.match(item.draftChaseWording, /confirm in writing/i, "no chase wording for negated CCTV");
  }
  assert.ok(!/chase/i.test(item.draftChaseWording) || !/medical/i.test(item.label) || /medical|hospital|a&e/i.test(NO_CCTV_BUNDLE), "no medical chase without source mention");
}

const MENTIONS_BUNDLE = `MG5 CASE SUMMARY
Allegation: robbery. CCTV footage from the store was seized and is being reviewed; master export outstanding.
MG6 disclosure schedule lists CCTV master export as not yet served.
${"Narrative filler about the incident. ".repeat(40)}`;
const bbMentions = buildStrategyBattleboard({ case_id: "t2", bundle_text: MENTIONS_BUNDLE });
const briefMentions = buildDisclosureChaseBrief({
  caseId: "t2",
  caseTitle: "R v Test 2",
  clientLabel: "the client",
  allegation: "robbery",
  stage: "",
  hearingStatus: "",
  hearingDateIso: null,
  bundleHealth: "",
  positionStatus: "",
  battleboard: bbMentions,
  bundleText: MENTIONS_BUNDLE,
});
assert.ok(
  briefMentions.items.some((i) => /cctv/i.test(i.label) && !/none exists/i.test(i.label)),
  "CCTV chase survives when source mentions CCTV as outstanding",
);
assert.ok(
  !briefMentions.items.some((i) => i.familyId === "medical_expert"),
  "no medical chase item when source never mentions medical",
);

// ---------- dev-ref scrub ----------
assert.equal(
  scrubDevRefs("- EX-R-MG6-01: listed in bundle reference CB-INJECT-2026-0001"),
  "- EX-R-MG6-01: listed in bundle",
  "bundle reference fragment scrubbed, anchor preserved",
);
assert.ok(!containsDevRef(scrubDevRefs("Pack R — Case 01 — CB-INJECT-2026-0001 - Robbery")), "pack header scrubbed");
for (const poisoned of ["CB-AA-MESSY-0014", "CB-INJECT-2026-0001", "eval-pack-gold", "bundle-stress-1", "pp-gold-1"]) {
  assert.ok(!containsDevRef(scrubDevRefs(`Review ${poisoned} before hearing`)), `${poisoned} scrubbed`);
}
assert.equal(
  scrubDevRefs("Chase the CCTV continuity statement before the hearing."),
  "Chase the CCTV continuity statement before the hearing.",
  "normal solicitor text untouched",
);

// ---------- battleboard: poisoned bundle refs do not surface ----------
const POISONED_BUNDLE = `Fictional CaseBrain evaluation file - page 1
Pack R - Case 01 - CB-INJECT-2026-0001
MG5 CASE SUMMARY: robbery allegation. CCTV footage seized; master export outstanding per MG6.
- EX-R-MG6-01: listed in bundle reference CB-INJECT-2026-0001
${"Narrative filler describing accounts and timings. ".repeat(40)}`;
const bbPoisoned = buildStrategyBattleboard({ case_id: "t3", bundle_text: POISONED_BUNDLE });
const allOut = JSON.stringify(bbPoisoned);
assert.ok(!/CB-INJECT/i.test(allOut), "CB- refs never surface in battleboard output");

// ---------- no-position summary is case-specific ----------
const bbSummaryA = buildStrategyBattleboard({ case_id: "a", bundle_text: MENTIONS_BUNDLE });
const bbSummaryB = buildStrategyBattleboard({ case_id: "b", bundle_text: NO_CCTV_BUNDLE });
if (bbSummaryA.position_notice && bbSummaryB.position_notice) {
  assert.notEqual(
    bbSummaryA.solicitor_safe_summary,
    bbSummaryB.solicitor_safe_summary,
    "two different cases must not share an identical no-position headline",
  );
}
assert.match(
  bbSummaryA.solicitor_safe_summary,
  /current pressure|provisional|take\/record instructions/i,
  "summary keeps safety wording with case-specific lead",
);

// ---------- workflow profile-pack path is gated ----------
const ROB_NO_CCTV = `MG5 CASE SUMMARY
Allegation: robbery on high street. Complainant MG11 served. No CCTV available at the location.
MG6 lists complainant statement as served.
${"Incident narrative and witness accounts. ".repeat(40)}`;
const bbRob = buildStrategyBattleboard({ case_id: "t4", bundle_text: ROB_NO_CCTV });
const briefRob = buildDisclosureChaseBrief({
  caseId: "t4",
  caseTitle: "Pack R — Case 01 — CB-INJECT-2026-0001 - Robbery",
  clientLabel: "the client",
  allegation: "robbery",
  stage: "",
  hearingStatus: "",
  hearingDateIso: null,
  bundleHealth: "",
  positionStatus: "",
  battleboard: bbRob,
  bundleText: ROB_NO_CCTV,
});
assert.ok(
  !briefRob.items.some(
    (i) => /cctv/i.test(i.label) && /chase|outstanding|provide|serve/i.test(i.draftChaseWording) && !/none exists/i.test(i.label),
  ),
  "profile-pack CCTV must not chase when source negates it",
);
assert.ok(
  !briefRob.items.some((i) => /999|cad/i.test(i.label)),
  "profile-pack CAD chase dropped when source never mentions CAD/999",
);

assert.equal(
  safeSolicitorCaseTitle("Pack R — Case 01 — CB-INJECT-2026-0001 - Robbery"),
  "Robbery",
  "poisoned case title header becomes safe display text",
);

// ---------- gateProseAgainstSource on workflow case-wide lines ----------
const robberyWide = workflowDisclosureCaseWideLine({
  caseTitle: "R v Test",
  allegation: "robbery",
  bundleText: SRC_NEGATED,
})!;
assert.ok(robberyWide, "robbery profile case-wide line exists");
const gatedWide = gateProseAgainstSource(robberyWide, SRC_NEGATED);
assert.ok(!/chase/i.test(gatedWide), "gated case-wide line must not chase");
assert.match(gatedWide, /confirm in writing that none exists/i, "negated CCTV becomes confirm-none in case-wide line");
const noCad = "MG5 summary. CCTV footage was seized from the venue. Hospital attendance noted.";
assert.ok(
  !gateProseAgainstSource(robberyWide, noCad).toLowerCase().includes("cad/999"),
  "absent CAD drops from conditional line when not in source",
);

const fraudWide = workflowDisclosureCaseWideLine({
  caseTitle: "R v Test",
  allegation: "fraud",
  bundleText: "MG5 fraud allegation only.",
})!;
assert.ok(fraudWide, "fraud profile case-wide line exists");
const gatedFraud = gateProseAgainstSource(fraudWide, "MG5 fraud allegation only.");
assert.ok(
  !/\bphone\b/i.test(gatedFraud) && !/\bbank\b/i.test(gatedFraud),
  "fraud case-wide line drops bank/phone when absent from source",
);

console.log("chase-source-gate tests: ALL PASS");
