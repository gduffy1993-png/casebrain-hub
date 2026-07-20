#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  collapseDontSayMg11WitnessLines,
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
assert.equal(collapseHeaderCellDuplicates("pre_ptph pre_ptph"), "pre ptph");
assert.equal(collapseHeaderCellDuplicates("pre ptph | pre ptph"), "pre ptph");
assert.equal(collapseHeaderCellDuplicates("Stage: pre ptph pre ptph"), "pre ptph");
assert.equal(displayPilotStripStage("pre ptph pre ptph"), "pre ptph");
assert.equal(displayPilotStripStage("pre_ptph|pre_ptph"), "pre ptph");

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

const collapsedDontSay = collapseDontSayMg11WitnessLines([
  'Do not state "witness statement is final" — Witness statement is draft or unsigned on papers.',
  'Do not state "MG11 is consistent and served" — Witness statement is draft or unsigned on papers.',
  'Do not state "MG11 served" — Witness statement is draft or unsigned on papers.',
  "Do not state the defendant sent messages unless attribution is served and safe.",
]);
assert.equal(collapsedDontSay.length, 2);
assert.equal(
  collapsedDontSay[0],
  "Do not state MG11 / witness statement is served or final — draft or unsigned on papers.",
);
assert.match(collapsedDontSay[1]!, /attribution/i);

console.log("solicitor-display-dedupe.test.ts: PASS");
