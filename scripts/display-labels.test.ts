import assert from "node:assert/strict";
import {
  displayCopyBody,
  displayExistenceLabel,
  displayRelianceLabel,
  displayTruthMapAction,
} from "../lib/criminal/five-answers/display-labels";

assert.equal(displayExistenceLabel("unknown"), "Not safely confirmed");
assert.equal(displayExistenceLabel("served"), "Served");
assert.equal(displayRelianceLabel("unsafe"), "Do not rely yet");
assert.equal(displayTruthMapAction("missing", "needs_review"), "Chase");

const withFooter =
  "The defence asks the court to record something.\n\n[CaseBrain — court line copy. Evidence state: needs review. Confirm before addressing the court.]";
assert.equal(
  displayCopyBody(withFooter),
  "The defence asks the court to record something.",
);

console.log("display-labels.test.ts: ok");
