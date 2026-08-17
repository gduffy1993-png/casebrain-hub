#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  humanizeEvidenceLabel,
  isUnusableEvidenceDisplayLabel,
} from "../components/criminal/five-answers/evidence-display";
import { overviewServedEvidenceLine } from "../components/criminal/five-answers/FiveAnswersView";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  PILOT_COURT_NOT_IDENTIFIED_LABEL,
  resolvePilotChargeDisplay,
} from "../components/criminal/workflow/workflowPilotDisplay";

assert.equal(
  resolvePilotChargeDisplay("Offence wording not safely extracted"),
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
);
assert.equal(PILOT_COURT_NOT_IDENTIFIED_LABEL, "Court not safely identified from uploaded papers");

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

console.log("live-ui-wording-regression.test.ts: PASS");
