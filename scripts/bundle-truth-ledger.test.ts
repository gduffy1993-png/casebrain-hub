/**
 * Bundle Truth Ledger — focused tests (multi-fixture, no single-PDF hardcodes).
 * Run: npx tsx scripts/bundle-truth-ledger.test.ts
 */
import assert from "node:assert/strict";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  buildBundleTruthLedger,
  extractLiteralHearingTime,
  filterTemplateSafeLines,
  formatDisplayLabelCasing,
  formatHearingDisplayFromLedger,
  guardSolicitorLine,
  isAdminGuidanceLine,
  isBlockedBattleboardTemplateLine,
  isOffenceFamilyBlocked,
  ledgerAnchorForChaseFamily,
  proofMapLensFromLedger,
} from "../lib/criminal/bundle-truth-ledger";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import type { BattleboardOutput, BattleboardRoute } from "../lib/criminal/strategy-battleboard";
import { generateProofMap } from "../lib/eval/casebrain-auditor/proof-map-generate";

// ---------- Fixture A: messy violence / s.20 scan-style ----------
const FIXTURE_A = `
=== SECTION: CHARGE ===
Count 1: Unlawful wounding, section 20 OAPA 1861
Particulars: bottle injury during struggle at canal steps

Defendant: Client Alpha
Court: Example Crown Court
Next hearing: 17 June 2026 at 12:00 for PTPH

=== SECTION: MG5 ===
MG5 case summary
The complainant alleges bottle injury. Defence suggests complainant swung first.

MG6C disclosure schedule
MG6C/001 — CCTV master footage — not served
MG6C/002 — Full medical report absent — injury severity and causation incomplete
MG6C/003 — Interview transcript — not served
MG11 complainant statement — draft unsigned — not final
`.trim();

const ledgerA = buildBundleTruthLedger({ bundleText: FIXTURE_A });
assert.match(ledgerA.defendant.defendant ?? "", /Alpha/i);
assert.match(ledgerA.court ?? "", /Example Crown Court/i);
assert.equal(ledgerA.hearing.timeLiteral, "12:00");
assert.match(ledgerA.charge.wording ?? "", /section 20|unlawful wounding/i);
assert.ok(["gbh_s20_abh", "provisional_violence"].includes(ledgerA.offenceFamily.family));
assert.ok(isOffenceFamilyBlocked("perverting_justice", ledgerA));
assert.ok(isOffenceFamilyBlocked("fraud", ledgerA));
assert.ok(ledgerA.materials.some((m) => m.status === "outstanding" || m.status === "absent"));
assert.ok(ledgerA.materials.some((m) => m.status === "unsigned" || m.status === "draft"));
assert.ok(ledgerA.forbiddenClaims.some((f) => /cctv|medical|mg11|interview/i.test(f.phrase + f.reason)));

const hearingDisplayA = formatHearingDisplayFromLedger(ledgerA, "PTPH");
assert.match(hearingDisplayA ?? "", /12:00/);
assert.doesNotMatch(hearingDisplayA ?? "", /13:00/);

const proofA = generateProofMap("test-a", "Client Alpha", FIXTURE_A);
assert.equal(proofMapLensFromLedger(ledgerA), "violence_gbh");
assert.equal(proofA.offenceLens, "violence_gbh");
const proofTextA = proofA.proofPoints.map((p) => `${p.label} ${p.crownMustProve}`).join("\n").toLowerCase();
assert.doesNotMatch(proofTextA, /pervert|impede justice/);
assert.doesNotMatch(proofTextA, /phone|messaging|mg11 dc patel/);

// ---------- Fixture B: thin charge ----------
const FIXTURE_B = `
=== SECTION: CHARGE ===
Charge: Theft from a shop, Theft Act 1968
Defendant: Client Beta
Next hearing: 3 July 2026 at 10:30
`.trim();

const ledgerB = buildBundleTruthLedger({ bundleText: FIXTURE_B });
assert.match(ledgerB.charge.wording ?? "", /theft/i);
assert.equal(ledgerB.offenceFamily.family, "theft");
assert.ok(ledgerB.reviewRequired || ledgerB.materials.length === 0);

// ---------- Fixture C: offence-mix — charge wins over background fraud/device ----------
const FIXTURE_C = `
=== SECTION: CHARGE ===
Count 1: Robbery, section 8 Theft Act 1968
Defendant: Client Gamma

=== SECTION: MG5 ===
Complainant alleges violence during street robbery.

Case admin email chain excerpt — device login audit and bank transaction schedule for unrelated review.
Fraud team flagged dishonest device access in background intelligence only.
`.trim();

const ledgerC = buildBundleTruthLedger({ bundleText: FIXTURE_C });
assert.equal(ledgerC.offenceFamily.family, "robbery");
assert.ok(isOffenceFamilyBlocked("fraud", ledgerC));

const proofC = generateProofMap("test-c", "Client Gamma", FIXTURE_C);
assert.equal(proofC.offenceLens, "robbery_id");

// ---------- Fixture D: duplicate MG6C rows ----------
const FIXTURE_D = `
MG6C disclosure schedule
MG6C/002 — Full medical report absent — injury severity incomplete
MG6C/002 — Full medical report absent — injury severity incomplete
MG6C/002 Full medical report absent injury severity incomplete
`.trim();

const ledgerD = buildBundleTruthLedger({ bundleText: FIXTURE_D });
const medRows = ledgerD.materials.filter((m) => /medical/i.test(m.displayLine));
assert.equal(medRows.length, 1, "duplicate MG6C rows should collapse to one");

// ---------- Fixture E: draft/unsigned witness ----------
const FIXTURE_E = `
MG6C schedule
MG11 complainant statement — draft unsigned — not final served version
`.trim();

const ledgerE = buildBundleTruthLedger({ bundleText: FIXTURE_E });
assert.ok(ledgerE.materials.some((m) => m.status === "draft" || m.status === "unsigned"));
assert.ok(
  ledgerE.forbiddenClaims.some((f) => /mg11|witness|final|served/i.test(f.phrase + f.reason)),
  "draft MG11 should create forbidden served/final claims",
);

// ---------- Fixture F: unclear / unknown ----------
const FIXTURE_F = `
Case admin email continuation page only.
Bundle incomplete scan with ??? OCR noise ??? and glued textwithoutspaces.
No charge sheet on file yet.
`.trim();

const ledgerF = buildBundleTruthLedger({ bundleText: FIXTURE_F });
assert.equal(ledgerF.offenceFamily.family, "unknown");
assert.equal(ledgerF.reviewRequired, true);

const proofF = generateProofMap("test-f", "Unknown matter", FIXTURE_F);
const proofTextF = proofF.proofPoints.map((p) => p.label).join(" ").toLowerCase();
assert.doesNotMatch(proofTextF, /pervert|impede justice/);
assert.doesNotMatch(proofTextF, /phone|messaging/);
assert.ok(
  proofF.proofPoints.some((p) => /source material|human review|disclosure/i.test(p.label)),
  "unclear fixture should use source-material readiness, not random offence template",
);

// ---------- Hearing literal helper ----------
assert.equal(extractLiteralHearingTime("17 June 2026 at 12:00 for PTPH"), "12:00");
assert.equal(extractLiteralHearingTime("listed at 09:05"), "09:05");

// ---------- Disclosure Chase integration ----------
const dcBrief = buildDisclosureChaseBrief({
  caseId: "dc-test",
  caseTitle: "R v Client Alpha",
  clientLabel: "Client Alpha",
  allegation: ledgerA.charge.wording ?? "Offence provisional",
  stage: "PTPH",
  hearingStatus: hearingDisplayA ?? "Hearing listed",
  hearingDateIso: ledgerA.hearing.dateIso,
  bundleHealth: "Provisional",
  positionStatus: "Provisional",
  battleboard: null,
  bundleText: FIXTURE_A,
});
assert.ok(dcBrief.primaryItems.length > 0, "Disclosure Chase must not show 0 priority when MG6 issues exist");
assert.ok(dcBrief.counters.total > 0);
assert.match(dcBrief.disclosureSummary, /[1-9]/);

// ---------- War Room forbidden-claim guard ----------
const warBrief = buildHearingWarRoomBrief({
  caseId: "war-test",
  caseTitle: "R v Client Alpha",
  clientLabel: "Client Alpha",
  allegation: ledgerA.charge.wording ?? "Offence provisional",
  stage: "PTPH",
  hearingStatus: hearingDisplayA ?? "Hearing listed",
  bundleHealth: "Provisional",
  positionStatus: "Provisional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: [],
  bundleText: FIXTURE_A,
});
const warSay = warBrief.sayThis.join("\n").toLowerCase();
const warPosition = warBrief.safePositionToday.toLowerCase();
assert.doesNotMatch(warSay + warPosition, /cctv confirms|cctv proves|medical report proves|mg11 is consistent and served/);
assert.ok(
  warBrief.doNotOverstate.some((l) => /do not state.*cctv confirms/i.test(l)),
  "War Room should warn against forbidden CCTV confirms wording",
);

// ---------- Fixture G: inline Charge / Allegation (PDF-style) ----------
const FIXTURE_G = `
Case summary appendix
Charge: Section 20 unlawful wounding - bottle injury allegation
Allegation: section 20 unlawful wounding.
Defendant: Client Alpha
Next hearing: 17 June 2026 at 12:00 for PTPH
`.trim();

const ledgerG = buildBundleTruthLedger({ bundleText: FIXTURE_G });
assert.match(ledgerG.charge.wording ?? "", /section 20|unlawful wounding|bottle injury/i);

const headerG = resolveCaseHeaderMetadata({
  snapshot: null,
  bundleText: FIXTURE_G,
});
assert.match(headerG.allegation, /section 20|unlawful wounding|bottle injury/i);
assert.doesNotMatch(headerG.allegation, /not safely extracted|defence position|custody/i);

// ---------- Fixture H: allegation continuation must not swallow defence/custody ----------
const FIXTURE_H = `
Charge: Section 20 unlawful wounding - bottle injury allegation
Allegation: section 20 unlawful wounding. Defence position not settled; custody
Defendant: Client Alpha
Next hearing: 17 June 2026 at 12:00 for PTPH
`.trim();

const ledgerH = buildBundleTruthLedger({ bundleText: FIXTURE_H });
assert.match(ledgerH.charge.wording ?? "", /Section 20 unlawful wounding/i);
assert.match(ledgerH.charge.wording ?? "", /bottle injury/i);
assert.doesNotMatch(ledgerH.charge.wording ?? "", /defence position|custody|not settled/i);

const headerH = resolveCaseHeaderMetadata({ snapshot: null, bundleText: FIXTURE_H });
assert.doesNotMatch(headerH.allegation, /defence position|custody|not settled/i);
assert.equal(extractLiteralHearingTime("17 June 2026 at 12:00 for PTPH"), "12:00");

// ---------- Template line blocking ----------
assert.ok(
  isBlockedBattleboardTemplateLine(
    "MG11 is consistent and served",
    ledgerA,
    FIXTURE_A,
  ),
  "unsigned MG11 should block served-consistent template",
);
assert.ok(
  isBlockedBattleboardTemplateLine(
    "Outstanding bank/device/source material may support the Crown if served.",
    ledgerA,
    FIXTURE_A,
  ),
  "violence bundle without bank/device should block bank template",
);
assert.ok(
  !isBlockedBattleboardTemplateLine(
    "Assumed position may conflict with interview or served evidence.",
    ledgerA,
    FIXTURE_A,
  ),
);
const filteredTemplates = filterTemplateSafeLines(
  [
    "MG11 is consistent and served",
    "CAD/999 timing may affect sequence if served and reconciled.",
    "Assumed position may conflict with interview or served evidence.",
  ],
  ledgerA,
  FIXTURE_A,
);
assert.ok(!filteredTemplates.some((l) => /mg11 is consistent/i.test(l)));
assert.ok(!filteredTemplates.some((l) => /cad\/999 timing may affect/i.test(l)));

// ---------- Label casing ----------
assert.equal(formatDisplayLabelCasing("cCTV Full Window"), "CCTV full window");
assert.equal(formatDisplayLabelCasing("interview Recording outstanding"), "Interview recording outstanding");

const absentWitnessPackFixture = `
MG6 disclosure schedule
No full witness pack, CCTV export, interview transcript or continuity material is contained in the papers supplied with this bundle.
`.trim();
const ledgerAbsentPack = buildBundleTruthLedger({ bundleText: absentWitnessPackFixture });
assert.ok(
  ledgerAbsentPack.forbiddenClaims.some((f) => /full cctv confirms|cctv confirms|cctv proves/i.test(f.phrase)),
  "absence boilerplate should forbid CCTV confirms/proves wording",
);
assert.equal(
  guardSolicitorLine("Full CCTV confirms the complainant's account of who was present.", {
    ledger: ledgerAbsentPack,
    bundleText: absentWitnessPackFixture,
  }),
  null,
  "absence boilerplate bundle should block Full CCTV confirms lines",
);

// ---------- Wave 1.1 truth-surface guard ----------
const guardCtxA = { ledger: ledgerA, bundleText: FIXTURE_A };

for (const bad of [
  "Full CCTV confirms Crown timing.",
  "CCTV confirms Crown timing.",
  "CCTV proves Crown sequence.",
]) {
  assert.equal(guardSolicitorLine(bad, guardCtxA), null, `CCTV outstanding should block: ${bad}`);
}

for (const bad of ["MG11 is consistent and served", "MG11 is consistent", "MG11 served final"]) {
  assert.equal(guardSolicitorLine(bad, guardCtxA), null, `draft MG11 should block: ${bad}`);
}

for (const bad of [
  "medical is consistent with Crown account",
  "Complainant injury account is consistent across MG11 and medical material",
]) {
  assert.equal(guardSolicitorLine(bad, guardCtxA), null, `absent medical should block: ${bad}`);
}

assert.equal(
  guardSolicitorLine("CAD/999 timing supports Crown sequence.", guardCtxA),
  null,
  "no CAD/999 on file should block supports wording",
);

// ---------- MG6C glue normalisation ----------
const FIXTURE_GLUE = `
MG6C disclosure schedule
MG6C/001 Canal Store exterior CCTV not servedMay show first movement and whether complainant
MG6C/002 Full medical report absentInjury severity and causation incomplete.
MG6C/003 Interview transcript absentDo not quote interview as complete.
`.trim();

const ledgerGlue = buildBundleTruthLedger({ bundleText: FIXTURE_GLUE });
const medGlue = ledgerGlue.materials.find((m) => /MG6C\/002/i.test(m.displayLine));
assert.ok(medGlue, "glued MG6C/002 row should normalise");
assert.match(medGlue!.displayLine, /MG6C\/002.*absent.*Injury severity/i);
assert.doesNotMatch(medGlue!.displayLine, /absentInjury/);

const cctvGlue = ledgerGlue.materials.find((m) => /MG6C\/001/i.test(m.displayLine));
assert.ok(cctvGlue);
assert.doesNotMatch(cctvGlue!.displayLine, /not servedMay/);

// ---------- Disclosure Chase anchors prefer MG6C rows ----------
const mockRoute: BattleboardRoute = {
  id: "r1",
  title: "Timeline challenge",
  status: "conditional",
  route_type: "timeline",
  why_it_helps: [],
  what_hurts_us: [],
  evidence_anchors: ["MG11 complainant statement — consistent and served"],
  collapse_risks: [],
  next_moves: ["Interview recording outstanding", "Full medical report absent"],
  hearing_line: "",
  safety_note: "",
};
const mockBattleboard: BattleboardOutput = {
  case_id: "bb-anchor-test",
  generated_at: "2026-06-10T00:00:00.000Z",
  overall_status: "usable",
  solicitor_safe_summary: "Provisional routes on file",
  primary_route: mockRoute,
  routes: [mockRoute],
  global_collapse_risks: [],
  urgent_next_moves: ["Interview recording / transcript outstanding", "Medical report absent"],
};

const dcAnchors = buildDisclosureChaseBrief({
  caseId: "dc-anchor-test",
  caseTitle: "R v Client Alpha",
  clientLabel: "Client Alpha",
  allegation: ledgerA.charge.wording ?? "Offence provisional",
  stage: "PTPH",
  hearingStatus: hearingDisplayA ?? "Hearing listed",
  hearingDateIso: ledgerA.hearing.dateIso,
  bundleHealth: "Provisional",
  positionStatus: "Provisional",
  battleboard: mockBattleboard,
  bundleText: FIXTURE_A,
});
const allDcItems = [...dcAnchors.primaryItems, ...dcAnchors.items];
const medAnchorItem = allDcItems.find(
  (i) => i.familyId === "medical_expert" || /\bmedical\b/i.test(i.label),
);
const interviewAnchorItem = allDcItems.find(
  (i) => i.familyId === "interview" || /\binterview\b/i.test(i.label),
);
assert.ok(medAnchorItem?.evidenceAnchor?.includes("MG6C/002"), "medical chase should anchor MG6C/002");
assert.ok(interviewAnchorItem?.evidenceAnchor?.includes("MG6C/003"), "interview chase should anchor MG6C/003");
assert.ok(
  !medAnchorItem?.evidenceAnchor?.toLowerCase().includes("mg11 complainant"),
  "medical chase must not fall back to MG11",
);

assert.equal(ledgerAnchorForChaseFamily("medical_expert", ledgerA)?.includes("MG6C/002"), true);
assert.equal(ledgerAnchorForChaseFamily("interview", ledgerA)?.includes("MG6C/003"), true);
assert.equal(ledgerAnchorForChaseFamily("cctv_master", ledgerA)?.includes("MG6C/001"), true);

// ---------- Admin continuation must not surface as anchor ----------
assert.ok(isAdminGuidanceLine("SCANNED CONTINUATION - PAGE NOTE 1"));
assert.ok(isAdminGuidanceLine("This page contains administrative continuation text..."));
assert.equal(guardSolicitorLine("SCANNED CONTINUATION - PAGE NOTE 1", guardCtxA), null);
assert.ok(
  allDcItems.every(
    (i) =>
      !isAdminGuidanceLine(i.evidenceAnchor ?? "") &&
      !/scanned continuation|administrative continuation/i.test(i.evidenceAnchor ?? ""),
  ),
  "Disclosure Chase must not use admin continuation as evidence anchor",
);

// ---------- QA export markdown guard ----------
const qaHeader = resolveCaseHeaderMetadata({ snapshot: null, bundleText: FIXTURE_A });
const qaMd = buildCaseQaPackMarkdown({
  caseId: "qa-wave11",
  caseLabel: "R v Client Alpha",
  exportedAt: "2026-06-10T12:00:00.000Z",
  header: qaHeader,
  caseTitle: "R v Client Alpha",
  clientLabel: "Client Alpha",
  allegation: ledgerA.charge.wording ?? "Offence provisional",
  stage: "PTPH",
  hearingStatus: hearingDisplayA ?? "Hearing listed",
  bundleHealth: "Provisional",
  positionStatus: "Provisional",
  controlRoom: {
    bestRouteTitle: mockRoute.title,
    routeStatus: mockRoute.status,
    prosecutionWeakness: [
      "Full CCTV confirms Crown timing.",
      "MG11 is consistent and served.",
      "Assumed position may conflict with interview or served evidence.",
    ],
    defenceRisks: [
      "CAD/999 timing supports Crown sequence.",
      "Complainant injury account is consistent across MG11 and medical material.",
    ],
    immediateActions: ["Chase outstanding CCTV master footage"],
    safeCourtLine: warBrief.safePositionToday,
    chaseItems: ["Interview recording outstanding"],
  },
  battleboard: {
    ...mockBattleboard,
    primary_route: {
      ...mockRoute,
      why_it_helps: ["Full CCTV confirms Crown timing.", "MG11 is consistent and served."],
      collapse_risks: [
        "CAD/999 timing supports Crown sequence.",
        "Complainant injury account is consistent across MG11 and medical material.",
      ],
    },
    global_collapse_risks: ["Full CCTV confirms Crown timing."],
  },
  warRoom: warBrief,
  disclosureChase: dcAnchors,
  positionNotes: { savedPosition: null, clientInstructions: null },
  documents: { count: 1, combinedTextLength: FIXTURE_A.length, rows: [{ name: "bundle-scan.txt" }] },
  bundleText: FIXTURE_A,
});

assert.doesNotMatch(qaMd, /^- Full CCTV confirms Crown timing\./m);
assert.doesNotMatch(qaMd, /^- MG11 is consistent and served\./m);
assert.doesNotMatch(qaMd, /^- CAD\/999 timing supports Crown sequence\./m);
assert.doesNotMatch(
  qaMd,
  /^- Complainant injury account is consistent across MG11 and medical material\./m,
);
assert.doesNotMatch(qaMd, /MG6C\/001 — MG6C\/001/);
assert.match(qaMd, /## 1\. Control Room/);
assert.match(qaMd, /## 6\. Documents/);
assert.doesNotMatch(qaMd, /SCANNED CONTINUATION/i);

// ---------- Wave 1.1b: glue repair + template soften on guard output ----------
const gluedCctv = guardSolicitorLine(
  "MG6C/001Canal Store exterior CCTV not served May show first movement and whether complainant",
  guardCtxA,
);
assert.match(gluedCctv ?? "", /MG6C\/001 — Canal Store exterior CCTV/);
assert.doesNotMatch(gluedCctv ?? "", /MG6C\/001Canal/);

const gluedMed = guardSolicitorLine(
  "MG6C/002Full medical report absent Injury severity and causation incomplete.",
  guardCtxA,
);
assert.match(gluedMed ?? "", /MG6C\/002 — Full medical report absent — Injury/i);
assert.doesNotMatch(gluedMed ?? "", /absentInjury|MG6C\/002Full/i);

const softenedInterview = guardSolicitorLine(
  "Interview admission narrows the defence route.",
  guardCtxA,
);
assert.match(softenedInterview ?? "", /if served and reviewed/i);
assert.doesNotMatch(softenedInterview ?? "", /^Interview admission narrows the defence route\.?$/i);

const softenedContinuity = guardSolicitorLine(
  "Continuity/provenance is later proved.",
  guardCtxA,
);
assert.match(softenedContinuity ?? "", /may later be proved on served material/i);

const owenQaMd = buildCaseQaPackMarkdown({
  caseId: "owen-wave11b",
  caseLabel: "Criminal case",
  exportedAt: "2026-06-11T12:00:00.000Z",
  header: qaHeader,
  caseTitle: "Criminal case",
  clientLabel: "Owen Flint.",
  allegation: "Section 20 unlawful wounding",
  stage: "PTPH",
  hearingStatus: "17 Jun 2026 at 12:00",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  controlRoom: {
    bestRouteTitle: "Causation / injury route pressure (conditional)",
    routeStatus: "conditional",
    prosecutionWeakness: [
      "MG6C/001Canal Store exterior CCTV not served May show first movement and whether complainant",
      "MG6C/002Full medical report absent Injury severity and causation incomplete.",
    ],
    defenceRisks: ["Assumed position may conflict with interview or served evidence."],
    immediateActions: ["CCTV full window"],
    safeCourtLine: warBrief.safePositionToday,
    chaseItems: ["cCTV Full Window"],
  },
  battleboard: {
    ...mockBattleboard,
    global_collapse_risks: [
      "Interview admission narrows the defence route.",
      "Continuity/provenance is later proved.",
    ],
  },
  warRoom: buildHearingWarRoomBrief({
    caseId: "owen-war",
    caseTitle: "Criminal case",
    clientLabel: "Owen Flint.",
    allegation: "Section 20 unlawful wounding",
    stage: "PTPH",
    hearingStatus: "17 Jun 2026 at 12:00",
    bundleHealth: "Partial",
    positionStatus: "Provisional",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems: ["cCTV Full Window", "cCTV Continuity", "interview Recording"],
    bundleText: FIXTURE_A,
  }),
  disclosureChase: dcAnchors,
  positionNotes: { savedPosition: null, clientInstructions: null },
  documents: { count: 1, combinedTextLength: 8800, rows: [{ name: "gauntlet-07-scan-stress.pdf" }] },
  bundleText: FIXTURE_A,
});

assert.match(owenQaMd, /MG6C\/001 — Canal Store exterior CCTV/);
assert.doesNotMatch(owenQaMd, /MG6C\/001Canal/);
assert.doesNotMatch(owenQaMd, /^- Interview admission narrows the defence route\./m);
assert.match(owenQaMd, /may later be proved on served material/i);
assert.doesNotMatch(owenQaMd, /that cCTV Full Window remains/);
assert.match(owenQaMd, /that CCTV full window remains outstanding/i);

console.log("bundle-truth-ledger.test.ts: all assertions passed");
