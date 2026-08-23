#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  humanizeEvidenceLabel,
  isUnusableEvidenceDisplayLabel,
} from "../components/criminal/five-answers/evidence-display";
import { overviewServedEvidenceLine } from "../components/criminal/five-answers/FiveAnswersView";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  PILOT_COURT_NOT_IDENTIFIED_LABEL,
  displayPilotStripCharge,
  resolvePilotChargeDisplay,
} from "../components/criminal/workflow/workflowPilotDisplay";
import { sanitizeHeaderClient } from "../lib/criminal/resolve-case-header-metadata";
import { cleanPilotHeaderClient } from "../lib/criminal/pilot-workflow";
import { buildCourtCaseBrief } from "../components/criminal/court-today/courtCaseBrief";

assert.equal(
  resolvePilotChargeDisplay("Offence wording not safely extracted"),
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
);
assert.equal(PILOT_COURT_NOT_IDENTIFIED_LABEL, "Court not safely identified from uploaded papers");
assert.equal(
  displayPilotStripCharge("Offence Possession of a controlled drug of Class A with intent to supply"),
  "Possession of a controlled drug of Class A with intent to supply",
);
assert.equal(
  displayPilotStripCharge("Statement of offence: Wounding with intent to cause grievous bodily harm, contrary to"),
  "Wounding with intent to cause grievous bodily harm",
);

assert.equal(sanitizeHeaderClient("Holly Ahmed Date"), "Holly Ahmed");
assert.equal(cleanPilotHeaderClient("Holly Ahmed Date"), "Holly Ahmed");
assert.equal(sanitizeHeaderClient("Holly Ahmed DOB"), "Holly Ahmed");

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";
const patelThinFrontMatter = [
  "CASE PAPERS - INDEX",
  "R v Isaac Patel",
  "DefendantIsaacPatel",
  "CourtHearingSouthford Magistrates Court 25 August 2026 10:30",
  "Current stage: First appearance",
  "Charge",
  "Affray",
  "contrary to section 3 Public Order Act 1986",
].join("\n");
const patelBrief = buildCourtCaseBrief(
  {
    id: "7e763777-94a8-4958-a190-a35ef6ddb259",
    title: "Client not on papers",
    offence_label: "Affray (s.3 Public Order Act 1986)",
    next_hearing_date: null,
    next_hearing_type: null,
    strategy_recorded: false,
    strategy_preview: null,
    disclosure_outstanding: null,
  },
  {
    bundleMetadata: null,
    bundleHeader: null,
    frontMatterScan: patelThinFrontMatter,
  },
  { bucketNow: new Date("2026-08-22T12:00:00.000Z") },
);
assert.equal(patelBrief.clientLabel, "Isaac Patel");
assert.doesNotMatch(patelBrief.clientLabel, /not on papers|not safely extracted/i);
assert.match(patelBrief.hearingLabel, /25 Aug 2026|25 August 2026/);
assert.match(patelBrief.stage, /First appearance/i);

assert.equal(
  humanizeEvidenceLabel("MG6 disclosure schedule on file", "served"),
  "MG6 disclosure schedule appears on file",
);
assert.equal(
  overviewServedEvidenceLine(humanizeEvidenceLabel("MG6 disclosure schedule on file", "served")),
  "MG6 disclosure schedule appears on file — check before relying on it.",
);

assert.equal(
  humanizeEvidenceLabel("against any later court document. — Check; BWV", "served"),
  "BWV served",
);
assert.ok(isUnusableEvidenceDisplayLabel("against any later court document. — Check"));

assert.equal(
  humanizeEvidenceLabel("BWV served; Rights and entitlementsRecorded as given InterviewSummary", "served"),
  "BWV served",
);
assert.ok(isUnusableEvidenceDisplayLabel("Rights and entitlementsRecorded as given InterviewSummary"));

const overviewSource = fs.readFileSync("components/criminal/five-answers/FiveAnswersView.tsx", "utf8");
assert.match(overviewSource, /Overview not ready yet\./);
assert.match(overviewSource, /Do not treat this matter as reviewed until the\s+overview loads/);

const chaseSource = fs.readFileSync("components/criminal/disclosure-chase/DisclosureChase.tsx", "utf8");
assert.match(chaseSource, /Disclosure chase not ready yet\./);
assert.match(chaseSource, /Do not treat the chase list as complete until/);

const courtTodayClientSource = fs.readFileSync("components/criminal/court-today/CourtTodayClient.tsx", "utf8");
assert.match(
  courtTodayClientSource,
  /const pilotHideReviewClutter = pilotDemo && scheduledEmpty && !pilotDeskEligible;/,
  "Court Today pilot empty state must not override the saved-matter desk",
);
assert.match(
  courtTodayClientSource,
  /briefs\.length === 0 && rows\.length > 0/,
  "Court Today must show a saved-matter desk fallback before falling back to the old no-hearings card",
);
assert.match(
  courtTodayClientSource,
  /enrichCourtTodayBundles\(\[requestedCaseId\]\)/,
  "Court Today must enrich the selected matter directly so the sidebar and main desk share the same case truth",
);
assert.match(
  courtTodayClientSource,
  /All open review items/,
  "Court Today top KPI must label all-case review counts distinctly from the selected matter",
);

const appShellSource = fs.readFileSync("components/layout/app-shell.tsx", "utf8");
assert.match(appShellSource, /overflow-x-hidden/, "Pilot app shell must contain horizontal overflow");
const topbarSource = fs.readFileSync("components/layout/topbar.tsx", "utf8");
assert.doesNotMatch(topbarSource, /overflow-x-auto/, "Pilot topbar must not introduce horizontal scroll");
const sidebarSource = fs.readFileSync("components/layout/sidebar.tsx", "utf8");
assert.match(sidebarSource, /overflow-x-hidden/, "Pilot sidebar must hide horizontal overflow");

const pilotWorkflowSource = fs.readFileSync("lib/criminal/pilot-workflow.ts", "utf8");
assert.doesNotMatch(
  pilotWorkflowSource,
  /second-male attribution remains unresolved/i,
  "Robbery attribution wording must not promote a second-male issue unless the papers expressly raise it",
);
assert.match(
  pilotWorkflowSource,
  /any other-person attribution expressly raised by the papers/i,
  "Robbery attribution wording must be source-conditioned",
);

const solicitorVisibleSources = [
  "components/criminal/workflow/pilotReviewCopy.ts",
  "components/criminal/trust/TrustFeedbackPanel.tsx",
  "components/criminal/trust/DontSaySafetyBox.tsx",
  "components/criminal/five-answers/OverviewSafeWordingCard.tsx",
  "components/criminal/five-answers/OverviewEvidenceGapsCard.tsx",
  "components/criminal/five-answers/EvidenceTruthMapPanel.tsx",
  "components/criminal/five-answers/OverviewClientSummaryCard.tsx",
  "components/criminal/five-answers/OverviewCourtPrepCard.tsx",
  "components/criminal/disclosure-chase/DisclosureChase.tsx",
  "components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts",
  "components/criminal/court-today/courtCaseBrief.ts",
  "components/criminal/court-today/CourtTodayPilotSplit.tsx",
  "components/criminal/court-today/CourtTodayDiaryTable.tsx",
  "components/criminal/CaseControlRoom.tsx",
  "components/criminal/CaseFilesCompactStrip.tsx",
  "components/criminal/workflow/PilotSummaryView.tsx",
  "components/criminal/workflow/PilotTodayDashboard.tsx",
  "components/criminal/demo-shell/DemoOverviewView.tsx",
  "components/criminal/demo-shell/DemoOverviewCanvas.tsx",
  "components/criminal/demo-shell/demoOverviewAdapter.ts",
  "components/criminal/papers/PapersDocInventoryPanel.tsx",
  "components/criminal/workflow/PilotCaseDocumentsPanel.tsx",
  "components/criminal/hearing-mode/HearingModePanel.tsx",
  "components/criminal/hearing-war-room/buildHearingWarRoomBrief.ts",
  "components/criminal/control-room/WarRoomReasoningBridge.tsx",
  "components/criminal/control-room/SupervisorQAPanel.tsx",
  "components/criminal/control-room/SolicitorExportBuilderPanel.tsx",
  "components/criminal/control-room/ReasoningV2Panel.tsx",
  "components/criminal/control-room/ReasoningFeedbackCard.tsx",
  "components/criminal/control-room/ClientAccountStressTestPanel.tsx",
  "lib/criminal/brief-plan/build-brief-plan.ts",
  "lib/criminal/decision-board/build-decision-board.ts",
  "lib/criminal/disclosure-chase-finalize.ts",
  "lib/criminal/overview-presentation.ts",
  "lib/criminal/matter-confidence/build-matter-confidence.ts",
  "lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness.ts",
  "lib/criminal/proof-receipt/derive.ts",
  "lib/criminal/solicitor-visible-sanitization.ts",
  "lib/criminal/pilot-workflow.ts",
  "lib/criminal/trust/firm-facing-labels.ts",
  "lib/criminal/five-answers/build-five-answers-view.ts",
  "lib/criminal/hearing-mode/build-hearing-mode.ts",
  "lib/criminal/export-pack/build-export-pack.ts",
  "lib/criminal/reasoning-v2/route-consistency.ts",
  "lib/criminal/reasoning-v2/reasoning-v2-types.ts",
  "lib/criminal/reasoning-v2/bundle-availability.ts",
  "lib/criminal/advice-change-radar/build-advice-change-radar.ts",
  "lib/criminal/evidence-change-detector/compare-evidence-changes.ts",
  "lib/criminal/supervisor-qa/build-supervisor-qa-result.ts",
  "lib/criminal/client-stress-test/build-client-stress-slice2.ts",
  "lib/criminal/client-stress-test/build-client-stress-result.ts",
  "lib/criminal/client-stress-test/client-stress-sanitize.ts",
  "lib/criminal/charge-allegation-completeness.ts",
  "lib/criminal/solicitor-youth-venue.ts",
  "lib/criminal/dev-ref-scrub.ts",
  "lib/criminal/deterministic-letter-drafts.ts",
  "components/criminal/control-room/ClientAccountStressTestPanel.tsx",
  "components/criminal/court-today/courtCaseBrief.ts",
  "components/criminal/court-today/CourtTodayClient.tsx",
  "app/(protected)/cases/page.tsx",
];

const forbiddenSolicitorVisibleCopy = [
  /Source-linked/i,
  /Provisional\s+—\s+source-linked/i,
  /Grounded wording/i,
  /Generic\/provisional lens/i,
  /Evidence anchor noted/i,
  /Mark this output/i,
  /product review only/i,
  /No additional gaps shown here/i,
  /Check this source before fixing the hearing position/i,
  /CaseBrain position: not recorded/i,
  /not guilty in principle/i,
  /Collapse risks on file/i,
  /Plain-English client update/i,
  /Use neutral wording until confirmed/i,
  /is not established on the papers/i,
  /Source-backed court (?:note|line)/i,
  /source-backed/i,
  /Case files on record/i,
  /Not established on current papers/i,
  /Client account stress-test/i,
  /Date review/i,
  /Missing evidence items/i,
  /Missing items/i,
  /Full phone download outstanding/i,
  /Open to review charge, hearing, papers and disclosure position/i,
  /Criminal matter — review required/i,
  /Confirm this item against the source before relying on it/i,
  /Check the cited document or page and record whether this item is served, missing, incomplete or unclear/i,
  /co-defendant\/unknown male/i,
  /remains outstanding\.\s*remains outstanding/i,
  /long extract bundle stress/i,
  /medical class/i,
  /summary wrapper/i,
  /item\(s\)/i,
  /stops mid-narrative/i,
  /\b\d+\s*doc(?:s)?\s*[·,]\s*\d+k\s*chars\b/i,
  /\bchars text\b/i,
  /\bviolence assault\b/i,
  /PTPH note: ask the court/i,
  /PTPH \/ case management note/i,
  /MORE PAPERS DETAIL UNAVAILABLE/i,
  /FULL SUMMARY WORKSPACE UNAVAILABLE/i,
  /Client details need review/i,
  /Client name not safely extracted/i,
  /Active chase items/i,
  /Active chases/i,
  /\b\d+\s+chase\b/i,
  /\bchars extracted\b/i,
  /\bCCTV Continuity\b/,
];

for (const file of solicitorVisibleSources) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenSolicitorVisibleCopy) {
    assert.doesNotMatch(source, pattern, `${file} must not contain ${pattern}`);
  }
}

const pilotSummarySource = fs.readFileSync("components/criminal/workflow/PilotSummaryView.tsx", "utf8");
assert.doesNotMatch(
  pilotSummarySource,
  /replace\(\/\\brobbery id\\b\/gi,\s*["'`]robbery ID["'`]\)/,
  "Client/summary presentation must not preserve the internal robbery id taxonomy label",
);

console.log("live-ui-wording-regression.test.ts: PASS");
