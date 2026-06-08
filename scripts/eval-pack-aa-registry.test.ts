/**
 * Pack AA registry smoke test.
 * Run: npx tsx scripts/eval-pack-aa-registry.test.ts
 */
import assert from "node:assert/strict";
import {
  EVAL_PACK_A_THROUGH_AA_IDS,
  EVAL_PACK_A_THROUGH_Y_IDS,
  EVAL_PACK_A_THROUGH_Z_IDS,
  EVAL_PACK_AA_DISPLAY_NAME,
  EVAL_PACK_AA_ONLY_IDS,
  EVAL_PACK_IDS,
  EVAL_PACK_LABELS,
  EVAL_PACK_LOCKED_BASELINE_IDS,
  EVAL_PACK_SEQUENTIAL_IMPORT_SLOT_IDS,
  evalPackNameForStorage,
  evalPackUsesSequentialImportSlots,
  inferEvalPackFromTitle,
  parseEvalPackId,
} from "../lib/eval-packs";

assert.ok(EVAL_PACK_IDS.includes("AA"));
assert.equal(EVAL_PACK_LABELS.AA, "Real-World Messy Criminal Bundle Stress");
assert.equal(evalPackNameForStorage("AA"), EVAL_PACK_AA_DISPLAY_NAME);
assert.equal(parseEvalPackId("AA"), "AA");
assert.equal(parseEvalPackId("aa"), "AA");
assert.ok(!EVAL_PACK_LOCKED_BASELINE_IDS.includes("AA"));
assert.deepEqual(EVAL_PACK_AA_ONLY_IDS, ["AA"]);
assert.ok(!EVAL_PACK_A_THROUGH_Y_IDS.includes("AA"));
assert.ok(!EVAL_PACK_A_THROUGH_Z_IDS.includes("AA"));
assert.ok(EVAL_PACK_A_THROUGH_AA_IDS.includes("AA"));
assert.deepEqual(EVAL_PACK_SEQUENTIAL_IMPORT_SLOT_IDS, ["Y", "Z", "AA"]);
assert.ok(evalPackUsesSequentialImportSlots("AA"));
assert.ok(evalPackUsesSequentialImportSlots("Y"));
assert.ok(evalPackUsesSequentialImportSlots("Z"));
assert.ok(!evalPackUsesSequentialImportSlots("A"));

const inferred = inferEvalPackFromTitle("CB-AA-MESSY-2026-0001_messy_bundle.pdf");
assert.equal(inferred?.pack_id, "AA");
assert.equal(inferred?.pack_name, EVAL_PACK_AA_DISPLAY_NAME);

const inferred2 = inferEvalPackFromTitle("Pack AA — Real-World Messy Criminal Bundle Stress");
assert.equal(inferred2?.pack_id, "AA");

const inferred3 = inferEvalPackFromTitle("V2 messy bundle case 12.pdf");
assert.equal(inferred3?.pack_id, "AA");

console.log("eval-pack-aa-registry.test.ts: OK");
