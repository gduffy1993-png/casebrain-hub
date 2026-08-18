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
  "components/criminal/court-today/CourtTodayDiaryTable.tsx",
  "components/criminal/CaseControlRoom.tsx",
  "components/criminal/CaseFilesCompactStrip.tsx",
  "components/criminal/workflow/PilotSummaryView.tsx",
  "components/criminal/workflow/PilotTodayDashboard.tsx",
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
  /Open to review charge, hearing, papers and disclosure position/i,
  /Criminal matter — review required/i,
];

for (const file of solicitorVisibleSources) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenSolicitorVisibleCopy) {
    assert.doesNotMatch(source, pattern, `${file} must not contain ${pattern}`);
  }
}

console.log("live-ui-wording-regression.test.ts: PASS");
