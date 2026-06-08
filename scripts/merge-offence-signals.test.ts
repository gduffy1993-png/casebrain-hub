/**
 * Run: npx tsx scripts/merge-offence-signals.test.ts
 */
import assert from "node:assert/strict";
import {
  inferAuditorFamilyFromOffence,
  mergeOffenceSignals,
} from "@/lib/eval/casebrain-auditor/real-case-collector";

const arson = mergeOffenceSignals(null, ["Arson being reckless as to whether life was endangered"]);
assert.equal(arson.inferenceText, "Arson being reckless as to whether life was endangered");
assert.equal(inferAuditorFamilyFromOffence(arson.inferenceText), "violence_domestic_assault");

console.log("merge-offence-signals.test.ts OK");
