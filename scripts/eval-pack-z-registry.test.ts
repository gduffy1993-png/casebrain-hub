/**
 * Pack Z registry smoke test.
 * Run: npx tsx scripts/eval-pack-z-registry.test.ts
 */
import assert from "node:assert/strict";
import {
  EVAL_PACK_A_THROUGH_Y_IDS,
  EVAL_PACK_A_THROUGH_Z_IDS,
  EVAL_PACK_IDS,
  EVAL_PACK_LABELS,
  EVAL_PACK_LOCKED_BASELINE_IDS,
  EVAL_PACK_Z_DISPLAY_NAME,
  EVAL_PACK_Z_ONLY_IDS,
  evalPackNameForStorage,
  evalPackUsesSequentialImportSlots,
  inferEvalPackFromTitle,
  parseEvalPackId,
} from "../lib/eval-packs";

assert.ok(EVAL_PACK_IDS.includes("Z"));
assert.equal(EVAL_PACK_LABELS.Z, "40x500 Large Criminal Bundle Stress");
assert.equal(evalPackNameForStorage("Z"), EVAL_PACK_Z_DISPLAY_NAME);
assert.equal(parseEvalPackId("Z"), "Z");
assert.ok(!EVAL_PACK_LOCKED_BASELINE_IDS.includes("Z"));
assert.deepEqual(EVAL_PACK_Z_ONLY_IDS, ["Z"]);
assert.ok(!EVAL_PACK_A_THROUGH_Y_IDS.includes("Z"));
assert.ok(!EVAL_PACK_A_THROUGH_Z_IDS.includes("AA"));
assert.equal(EVAL_PACK_A_THROUGH_Z_IDS.length, 26);
assert.ok(evalPackUsesSequentialImportSlots("Z"));
assert.ok(evalPackUsesSequentialImportSlots("Y"));

const inferred = inferEvalPackFromTitle("CB-Z-500-MUR-0001_large_bundle.pdf");
assert.equal(inferred?.pack_id, "Z");
assert.equal(inferred?.pack_name, EVAL_PACK_Z_DISPLAY_NAME);

const inferred2 = inferEvalPackFromTitle("Pack Z — 40x500 Large Criminal Bundle Stress");
assert.equal(inferred2?.pack_id, "Z");

console.log("eval-pack-z-registry.test.ts: OK");
