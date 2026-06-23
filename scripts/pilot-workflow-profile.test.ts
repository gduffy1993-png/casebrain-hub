/**
 * Pilot workflow profile selection, chase ordering, and header overrides.
 * Run: npx tsx scripts/pilot-workflow-profile.test.ts
 */
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  firstMatchIndex,
  prioritizeWorkflowItems,
  resolveWorkflowProfile,
  resolveWorkflowProfileFromSignals,
  workflowCourtRecordAsks,
  workflowDisclosureChaseLabels,
  workflowDraftDisclosureSnippet,
  workflowHeaderOverrides,
  workflowTopNextActions,
  workflowProfileAskCourtOnly,
  filterWorkflowPilotLines,
  formatPilotCourtLine,
  formatPilotDraftChaseWording,
  pilotDisplayMetadataNote,
  softenPilotRiskWording,
  softenSolicitorSourceWording,
  stripInternalEvalMarkers,
  isInternalEvalMarkerOnlyLine,
  workflowPrimaryRouteTitle,
  pilotCourtChaseLabels,
  isMalformedPilotEvidenceAnchor,
  sanitizePilotEvidenceAnchors,
  sanitizePilotVisibleLine,
  pilotPositionDisplayLabel,
  cleanupPilotVisiblePunctuation,
  pilotCleanupVisibleText,
  pilotRouteStatusBadgeLabel,
  workflowDisclosureCaseWideLine,
  pilotReadinessWithoutSavedPosition,
} = require("../lib/criminal/pilot-workflow") as typeof import("../lib/criminal/pilot-workflow");

const {
  PILOT_COURT_TODAY_ANCHOR,
  shouldUsePilotCourtTodayAnchor,
  formatPilotCourtTodayHeader,
} = require("../lib/pilot-mode") as typeof import("../lib/pilot-mode");

const { resolveHearingBucket } =
  require("../components/criminal/court-today/courtCaseBrief") as typeof import("../components/criminal/court-today/courtCaseBrief");

const { resolveCaseWorkflowActiveTab } =
  require("../components/criminal/workflow/useCaseWorkflowActiveTab") as typeof import("../components/criminal/workflow/useCaseWorkflowActiveTab");
const { buildCaseWorkflowTabHref } =
  require("../components/criminal/criminalCaseNavigation") as typeof import("../components/criminal/criminalCaseNavigation");

assert.equal(
  resolveCaseWorkflowActiveTab({ get: (k) => (k === "tab" ? "documents" : null) }, "", true),
  "file",
);

assert.ok(
  buildCaseWorkflowTabHref("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "documents").includes("tab=file"),
);

// --- Profile detection ---

assert.equal(
  resolveWorkflowProfile({ caseTitle: "R v Marcus Vale", allegation: "Offence wording not safely extracted" }),
  "fraud_account_control",
);

assert.equal(
  resolveWorkflowProfile({
    caseTitle: "Criminal matter",
    allegation: "PWITS Class A — phone attribution",
    routeTitle: "Possession / knowledge route",
  }),
  "pwits_phone_attribution",
);

assert.equal(
  resolveWorkflowProfileFromSignals({
    caseTitle: "CB-FRESH-001 Taylor Brookes",
    allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    routeTitle: "Possession / knowledge / phone-attribution pressure",
    bundleText: "Complainant MG11 — messages caused alarm and distress; attribution disputed. Phone extraction source download outstanding.",
  }),
  "generic",
);

assert.equal(
  resolveWorkflowProfile({
    caseTitle: "R v Unknown",
    allegation: "Robbery — poor identification",
    bundleText: "Complainant first account and CCTV master footage referenced on MG6.",
  }),
  "robbery_identification",
);

assert.equal(
  resolveWorkflowProfileFromSignals({
    caseTitle: "R v Client",
    allegation: "Assault occasioning actual bodily harm s.47 OAPA",
  }),
  "violence_domestic_assault",
);

assert.equal(
  resolveWorkflowProfile({ caseTitle: "Generic assault", allegation: "Assault ABH" }),
  "violence_domestic_assault",
);

assert.equal(
  resolveWorkflowProfileFromSignals({
    caseTitle: "Case 8",
    allegation: "Arson being reckless as to whether life was endangered",
  }),
  "violence_domestic_assault",
);

assert.equal(
  resolveWorkflowProfile({ caseTitle: "Case 12", allegation: "Offence not safely extracted" }),
  "generic",
);

// --- Headers ---

const marcusHeader = workflowHeaderOverrides("R v Marcus Vale");
assert.ok(marcusHeader);
assert.equal(marcusHeader!.displayTitle, "R v Marcus Vale — Fraud by false representation");
assert.ok(!marcusHeader!.displayTitle.toLowerCase().includes("offence wording not safely extracted"));

const kianHeader = workflowHeaderOverrides("R v Kian Doyle");
assert.equal(
  kianHeader!.displayTitle,
  "R v Kian Doyle — Possession with intent to supply Class A controlled drugs",
);

const leonHeader = workflowHeaderOverrides("R v Leon Marsh");
assert.equal(leonHeader!.displayTitle, "R v Leon Marsh — Robbery, Theft Act 1968 s.8");

// --- Fraud chase ordering ---

const fraudMixed = [
  "CCTV Full Window outstanding",
  "CAD / 999 audio missing",
  "Full bank export / source schedules",
  "Device login audit material",
  "POCA source-of-funds schedule",
  "Body-worn video at scene",
];

const fraudRanked = prioritizeWorkflowItems(fraudMixed, {
  caseTitle: "R v Marcus Vale",
  allegation: "Fraud by false representation",
});

assert.ok(
  firstMatchIndex(fraudRanked, [/\bbank|device|poca\b/i]) <
    firstMatchIndex(fraudRanked, [/\bcctv|cad|999|bwv\b/i]),
  "fraud profile should rank bank/device/POCA above CCTV/CAD/BWV",
);

const fraudLabels = workflowDisclosureChaseLabels({ caseTitle: "R v Marcus Vale" });
assert.ok(fraudLabels);
assert.equal(fraudLabels!.length, 8);
assert.ok(fraudLabels![0]!.toLowerCase().includes("bank"));
assert.ok(!fraudLabels!.some((l) => /\bcctv\b/i.test(l)));

// --- PWITS chase ordering ---

const pwitsMixed = [
  "CCTV continuity / provenance",
  "999 / CAD timing",
  "Full phone extraction outstanding",
  "Search BWV missing",
  "Drugs / cash continuity",
];

const pwitsRanked = prioritizeWorkflowItems(pwitsMixed, {
  caseTitle: "R v Kian Doyle",
  allegation: "PWITS Class A",
});

assert.ok(
  firstMatchIndex(pwitsRanked, [/\bphone|search|drug|continuity\b/i]) <
    firstMatchIndex(pwitsRanked, [/\bcctv|999|cad\b/i]),
  "PWITS profile should rank phone/search/continuity above CCTV/CAD/999",
);

// --- Robbery keeps ID/CCTV high ---

const robberyMixed = [
  "Medical expert report",
  "Full CCTV master footage",
  "ID procedure material",
  "999 / CAD timing",
];

const robberyRanked = prioritizeWorkflowItems(robberyMixed, {
  caseTitle: "R v Leon Marsh",
  allegation: "Robbery",
});

assert.ok(
  firstMatchIndex(robberyRanked, [/\bcctv|id procedure|999|cad\b/i]) <
    firstMatchIndex(robberyRanked, [/\bmedical\b/i]),
  "robbery profile should rank CCTV/ID/CAD above medical noise",
);

// --- Ask court max 5 ---

for (const ctx of [
  { caseTitle: "R v Marcus Vale" },
  { caseTitle: "R v Kian Doyle" },
  { caseTitle: "R v Leon Marsh" },
] as const) {
  const asks = workflowCourtRecordAsks(ctx)!;
  assert.ok(asks.length >= 3 && asks.length <= 5, `ask-court bullets for ${ctx.caseTitle}`);
  assert.ok(asks.every((a) => /^Ask the court to record/i.test(a)));
}

// --- Next actions from profile ---

const marcusActions = workflowTopNextActions({ caseTitle: "R v Marcus Vale" });
assert.equal(marcusActions!.length, 3);
assert.ok(marcusActions![0]!.toLowerCase().includes("bank"));

const kianActions = workflowTopNextActions({ caseTitle: "R v Kian Doyle" });
assert.ok(kianActions![0]!.toLowerCase().includes("phone"));

const leonActions = workflowTopNextActions({ caseTitle: "R v Leon Marsh" });
assert.ok(leonActions![0]!.toLowerCase().includes("cctv"));

// --- Kian via client label when title is generic ---

assert.equal(
  resolveWorkflowProfile({
    caseTitle: "Criminal case",
    clientLabel: "Kian Doyle",
    allegation: "Offence wording not safely extracted",
  }),
  "pwits_phone_attribution",
);

const kianLabels = workflowDisclosureChaseLabels({
  caseTitle: "Criminal case",
  clientLabel: "Kian Doyle",
})!;
assert.ok(kianLabels[0]!.toLowerCase().includes("phone"));
assert.ok(!kianLabels.some((l) => /\bcctv|999|cad|medical\b/i.test(l)));

const kianAsks = workflowProfileAskCourtOnly({ caseTitle: "R v Kian Doyle" })!;
assert.equal(kianAsks.length, 5);
assert.ok(kianAsks.every((a) => !/\bcCTV\b/.test(a)));
assert.ok(!kianAsks.some((a) => /\bcctv full window|999 call audio|custody cctv\b/i.test(a)));

assert.ok(
  !filterWorkflowPilotLines(
    ["Full CCTV confirms Crown timing.", "Phone extraction may be outstanding."],
    { caseTitle: "R v Kian Doyle" },
    { max: 5, useFallbacks: false },
  ).some((l) => /confirms crown timing/i.test(l)),
  "PWITS profile suppresses Full CCTV confirms Crown timing",
);

assert.match(formatPilotDraftChaseWording("Full CCTV master footage"), /full CCTV master footage/);
assert.ok(!formatPilotDraftChaseWording("Full CCTV master footage").includes("cctv"));

assert.match(
  formatPilotDraftChaseWording("Full bank export / source bank statements"),
  /bank statements appear outstanding/i,
  "plural disclosure labels use appear with label as subject",
);
assert.match(
  formatPilotCourtLine("full bank export / source bank statements"),
  /statements appear outstanding/,
);

assert.match(
  softenPilotRiskWording("Full CCTV confirms Crown timing."),
  /may support Crown timing if served and consistent/i,
);

assert.equal(pilotDisplayMetadataNote("Metadata source: client: extracted cover fallback"), undefined);

assert.equal(
  workflowPrimaryRouteTitle({ caseTitle: "R v Marcus Vale" }),
  "Fraud / account-control / dishonesty pressure",
);

// --- Generic leakage suppression (Marcus fraud) ---

const fraudNoise = [
  "CCTV Full Window outstanding",
  "Full CCTV confirms Crown timing once served",
  "CAD/999 timing supports Crown sequence",
  "MG11 is consistent and served",
  "Full bank export / source schedules",
];

const fraudFiltered = filterWorkflowPilotLines(fraudNoise, { caseTitle: "R v Marcus Vale" }, { max: 5 });
assert.ok(!fraudFiltered.some((l) => /\bcctv|999|cad|mg11\b/i.test(l)), "fraud profile filters CCTV/CAD/MG11 noise");
assert.ok(fraudFiltered.some((l) => /\bbank\b/i.test(l)), "fraud profile keeps bank material");

assert.equal(
  workflowDraftDisclosureSnippet({ caseTitle: "R v Leon Marsh" }).split(";").length,
  3,
  "Leon draft snippet uses clean disclosure labels",
);

const marcusChase = workflowDisclosureChaseLabels({ caseTitle: "R v Marcus Vale" })!;
assert.ok(marcusChase.some((l) => /mailbox|email/i.test(l)), "Marcus includes mailbox/email chase");
assert.equal(marcusChase.length, 8);
assert.equal(pilotCourtChaseLabels({ caseTitle: "R v Marcus Vale" }).length, 8);

const kianChase = workflowDisclosureChaseLabels({ caseTitle: "R v Kian Doyle" })!;
assert.ok(kianChase.some((l) => /^Search BWV export$/i.test(l.trim())));
assert.ok(kianChase.some((l) => /Cash seizure/i.test(l)));
assert.ok(!kianChase.some((l) => /^Search BWV$/i.test(l.trim())));
assert.ok(!kianChase.some((l) => /\bDNA|fingerprint\b/i.test(l)));
assert.equal(kianChase.length, 8);

const leonChase = workflowDisclosureChaseLabels({ caseTitle: "R v Leon Marsh" })!;
assert.ok(leonChase.some((l) => /complainant statement/i.test(l)));
assert.ok(!leonChase.some((l) => /phone \/ witness/i.test(l)));

const leonCtx = { caseTitle: "R v Leon Marsh" };

assert.equal(
  sanitizePilotVisibleLine(
    "Phone or witness material may undermine participation/attribution dispute if consistent.",
    leonCtx,
  ),
  "Witness, ID or association material may undermine the participation/attribution dispute if consistent.",
);

assert.equal(
  sanitizePilotVisibleLine(
    "Identification, participation and attribution remain conditional on full CCTV, ID procedure material, phone evidence and witness source material.",
    leonCtx,
  ),
  workflowDisclosureCaseWideLine(leonCtx),
);

assert.match(
  softenPilotRiskWording("CAD/999 timing supports Crown sequence."),
  /may affect sequence if served and reconciled/i,
);

assert.equal(
  sanitizePilotVisibleLine(
    "with a second male. The CCTV footage itself is not included in full. The stills are described as poor lighting and",
    leonCtx,
  ),
  "CCTV footage is not served in full; second-male attribution remains unresolved.",
);

assert.ok(
  !sanitizePilotEvidenceAnchors(
    [
      "with a second male. The CCTV footage itself is not included in full. The stills are described as poor lighting and",
      "MG6 lists CCTV master export outstanding",
    ],
    leonCtx,
  ).some((a) => /with a second male/i.test(a)),
);

assert.ok(isMalformedPilotEvidenceAnchor("5Device login attribution note19Summary only"));
assert.ok(
  isMalformedPilotEvidenceAnchor("6MG6 disclosure schedule21Search BWV and full phone extraction"),
);
assert.ok(!isMalformedPilotEvidenceAnchor("MG5 account schedule served on file"));

assert.deepEqual(
  sanitizePilotEvidenceAnchors(
    ["6MG6 disclosure schedule21Search BWV and full phone extraction", "MG5 account schedule served on file"],
    { caseTitle: "R v Kian Doyle" },
  ),
  ["MG5 account schedule served on file"],
);

assert.ok(
  !filterWorkflowPilotLines(
    ["MG11 is consistent and served.", "Phone extraction may be outstanding."],
    { caseTitle: "R v Kian Doyle" },
    { max: 5, useFallbacks: false },
  ).some((l) => /mg11 is consistent/i.test(l)),
);

assert.equal(
  sanitizePilotVisibleLine("Missing expert/source report comes back against defence.", {
    caseTitle: "R v Marcus Vale",
  }),
  "Outstanding bank/device/source material may support the Crown if served.",
);

assert.equal(
  sanitizePilotVisibleLine(
    "Outstanding expert/source material may return against the defence route if served.",
    { caseTitle: "R v Marcus Vale" },
  ),
  "Outstanding bank/device/source material may support the Crown if served.",
);

assert.equal(
  cleanupPilotVisiblePunctuation("Full CCTV may support Crown timing if served and consistent.."),
  "Full CCTV may support Crown timing if served and consistent.",
);

assert.equal(
  cleanupPilotVisiblePunctuation("Pressure remains conditional — conditional on served material."),
  "Pressure remains conditional on served material.",
);

assert.equal(
  pilotCleanupVisibleText("CCTV may support Crown timing if served and consistent.."),
  "CCTV may support Crown timing if served and consistent.",
);

assert.equal(
  sanitizePilotVisibleLine("Interview admission narrows the defence route.", {
    caseTitle: "R v Marcus Vale",
  }),
  "Interview denial remains to be tested against bank/device/source material.",
);

assert.equal(
  softenSolicitorSourceWording("Interview admission narrows the defence route.", "generic"),
  "Interview denial remains to be tested against bank/device/source material.",
);

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "";
assert.ok(
  !filterWorkflowPilotLines(["Interview admission narrows the defence route."], {
    caseTitle: "Pack Q — Case 1 — CB-NOSAFE-2026-0001",
  }).some((l) => /Interview admission narrows/i.test(l)),
);

assert.equal(stripInternalEvalMarkers("CB-TRAP"), "");
assert.ok(isInternalEvalMarkerOnlyLine("CB-TRAP"));

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

assert.equal(
  sanitizePilotVisibleLine("Position served pending full disclosure", { caseTitle: "R v Marcus Vale" }),
  "Position: provisional pending disclosure.",
);

assert.equal(
  sanitizePilotVisibleLine("Position reserved pending full disclosure", { caseTitle: "R v Marcus Vale" }),
  "Position: provisional pending disclosure.",
);

assert.equal(
  pilotPositionDisplayLabel("Position served pending full disclosure", { caseTitle: "R v Marcus Vale" }),
  "Position: provisional pending disclosure.",
);

assert.ok(!sanitizePilotVisibleLine("Full CCTV confirms Crown timing", { caseTitle: "R v Kian Doyle" }));

assert.equal(
  pilotRouteStatusBadgeLabel("conditional — conditional on served material"),
  "conditional on served material",
);

assert.equal(pilotReadinessWithoutSavedPosition(true), "Conditional — confirm instructions");
assert.equal(pilotReadinessWithoutSavedPosition(false), "Conditional — record position");

assert.match(
  workflowDisclosureCaseWideLine({ caseTitle: "R v Kian Doyle" })!,
  /phone extraction, search BWV, drug\/cash continuity and co-occupier material/,
);
assert.ok(!workflowDisclosureCaseWideLine({ caseTitle: "R v Kian Doyle" })!.includes("forensic material"));

assert.equal(
  sanitizePilotVisibleLine(
    "Defence position not safely recorded yet — position is provisional; take/record instructions before relying on it.",
    { caseTitle: "R v Kian Doyle" },
  ),
  "Defence position not safely recorded yet — position is provisional; confirm client instructions before relying on it.",
);

assert.equal(
  sanitizePilotVisibleLine(
    "Possession, knowledge, intent to supply and phone attribution remain conditional on full phone, search, continuity and forensic material.",
    { caseTitle: "R v Kian Doyle" },
  ),
  workflowDisclosureCaseWideLine({ caseTitle: "R v Kian Doyle" }),
);

assert.ok(
  !sanitizePilotEvidenceAnchors(
    [
      "Count 2: Possession of criminal property is noted as under review pending final count sheet.",
      "MG5 account schedule served on file",
    ],
    { caseTitle: "R v Kian Doyle" },
  ).some((a) => /Count\s*2.*criminal property/i.test(a)),
);

assert.ok(shouldUsePilotCourtTodayAnchor("9df92f69-4b0b-4f2b-816a-a041a9853ec2"));

const prevAdminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
process.env.NEXT_PUBLIC_ADMIN_USER_ID = "63ccc8dc-842e-49b5-9aa9-dcff8f55eb10";
assert.ok(!shouldUsePilotCourtTodayAnchor("63ccc8dc-842e-49b5-9aa9-dcff8f55eb10"));
if (prevAdminId === undefined) delete process.env.NEXT_PUBLIC_ADMIN_USER_ID;
else process.env.NEXT_PUBLIC_ADMIN_USER_ID = prevAdminId;

assert.match(formatPilotCourtTodayHeader(PILOT_COURT_TODAY_ANCHOR), /Monday/i);
assert.match(formatPilotCourtTodayHeader(PILOT_COURT_TODAY_ANCHOR), /1 June 2026/);

assert.equal(
  resolveHearingBucket(new Date("2026-06-01T11:30:00"), PILOT_COURT_TODAY_ANCHOR),
  "today",
);
assert.equal(
  resolveHearingBucket(new Date("2026-06-01T11:30:00"), new Date("2027-01-15")),
  "no_hearing",
);

console.log("pilot-workflow-profile.test.ts OK");
