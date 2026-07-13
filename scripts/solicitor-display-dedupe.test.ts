#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  collapseHeaderCellDuplicates,
  collapseRepeatedPhrase,
  dedupeSolicitorLines,
  excludeSolicitorLinesMatching,
  isGenericAdditionalSourceLabel,
  polishChasePreviewLabel,
  solicitorLinesNearlyEqual,
} from "../lib/criminal/solicitor-display-dedupe";
import { displayPilotStripStage, dedupePilotLines } from "../components/criminal/workflow/workflowPilotDisplay";

assert.equal(collapseRepeatedPhrase("pre ptph pre ptph"), "pre ptph");
assert.equal(collapseRepeatedPhrase("Crown Court Crown Court"), "Crown Court");
assert.equal(collapseHeaderCellDuplicates("pre_ptph pre_ptph".replace(/_/g, " ")), "pre ptph");
assert.equal(displayPilotStripStage("pre ptph pre ptph"), "pre ptph");

assert.equal(isGenericAdditionalSourceLabel("Additional source-material issues (1)"), true);
assert.equal(polishChasePreviewLabel("Additional source-material issues (1)"), null);
assert.ok(polishChasePreviewLabel("Complainant MG11 / source material"));

const deduped = dedupeSolicitorLines([
  "Ask the court to record that full MG11 remains outstanding.",
  "ask the court to record that full MG11 remains outstanding.",
  "Full phone download is outstanding.",
]);
assert.equal(deduped.length, 2);

assert.ok(
  solicitorLinesNearlyEqual(
    "Provisional pending disclosure — solicitor review required.",
    "provisional pending disclosure solicitor review required",
  ),
);

const filtered = excludeSolicitorLinesMatching(
  ["Do not overstate attribution", "Missing CCTV master"],
  ["Do not overstate attribution"],
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0], "Missing CCTV master");

assert.equal(
  dedupePilotLines(["Line A", "line a", "Line B"], "Line A").length,
  1,
);

console.log("solicitor-display-dedupe.test.ts: PASS");
