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

console.log("live-ui-wording-regression.test.ts: PASS");
