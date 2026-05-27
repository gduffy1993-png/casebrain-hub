/**
 * Pack Y registry smoke test.
 * Run: npx tsx scripts/eval-pack-y-registry.test.ts
 */
import assert from "node:assert/strict";
import {
  EVAL_PACK_IDS,
  EVAL_PACK_LABELS,
  EVAL_PACK_LOCKED_BASELINE_IDS,
  EVAL_PACK_Y_DISPLAY_NAME,
  evalPackNameForStorage,
  inferEvalPackFromTitle,
  parseEvalPackId,
} from "../lib/eval-packs";

assert.ok(EVAL_PACK_IDS.includes("Y"));
assert.equal(EVAL_PACK_LABELS.Y, "40x40 Criminal Workflow Stress");
assert.equal(evalPackNameForStorage("Y"), EVAL_PACK_Y_DISPLAY_NAME);
assert.equal(parseEvalPackId("Y"), "Y");
assert.ok(!EVAL_PACK_LOCKED_BASELINE_IDS.includes("Y"));

const inferred = inferEvalPackFromTitle("PACK Y — Case 12 — Affray workflow");
assert.equal(inferred?.pack_id, "Y");
assert.equal(inferred?.pack_name, EVAL_PACK_Y_DISPLAY_NAME);

console.log("eval-pack-y-registry.test.ts: OK");
