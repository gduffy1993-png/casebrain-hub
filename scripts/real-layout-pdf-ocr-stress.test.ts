/**
 * Real-layout PDF/OCR stress lane — slice 1 + slice 2 tests.
 * Run: npx tsx scripts/real-layout-pdf-ocr-stress.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  allLayoutTagsInRecipes,
  deliberateTrapRecipes,
  listRealLayoutStressRecipes,
  offenceFamiliesInRecipes,
} from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-recipes";
import { buildStressBundlePages } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-content";
import { scoreStressSample } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-score";
import {
  REAL_LAYOUT_STRESS_LAYOUT_TAGS,
  REAL_LAYOUT_STRESS_SLICE2_LAYOUT_TAGS,
} from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-types";
import { realLayoutStressCacheRoot } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-paths";

const m1 = listRealLayoutStressRecipes(25)[0]!;
const m2 = listRealLayoutStressRecipes(25)[0]!;
assert.deepEqual(m1, m2, "same seed/manifest for recipe 001");

const pages1 = buildStressBundlePages(m1);
const pages2 = buildStressBundlePages(m2);
assert.equal(pages1.length, pages2.length, "deterministic page count");
assert.equal(pages1[0]!.body, pages2[0]!.body, "deterministic content");

const covered25 = new Set(allLayoutTagsInRecipes(25));
for (const tag of REAL_LAYOUT_STRESS_LAYOUT_TAGS) {
  if (REAL_LAYOUT_STRESS_SLICE2_LAYOUT_TAGS.includes(tag as never)) continue;
  assert.ok(covered25.has(tag), `slice1 layout tag covered in first 25: ${tag}`);
}

const covered50 = new Set(allLayoutTagsInRecipes(50));
for (const tag of REAL_LAYOUT_STRESS_LAYOUT_TAGS) {
  assert.ok(covered50.has(tag), `all layout tags covered at 50: ${tag}`);
}

assert.equal(listRealLayoutStressRecipes(50).length, 50);

const families = offenceFamiliesInRecipes(50);
assert.ok(families.includes("motoring_dangerous"));
assert.ok(families.includes("fraud_account"));
assert.ok(families.includes("pwits_phone"));
assert.ok(families.includes("robbery_identification"));
assert.ok(families.includes("violence_gbh_s18"));
assert.ok(families.includes("generic_provisional"));

const traps = deliberateTrapRecipes(50);
assert.ok(traps.length >= 8, "deliberate trap samples present");

const thinTrap = listRealLayoutStressRecipes(50).find((r) => r.sampleId === "rlpdf-045")!;
const thinPages = buildStressBundlePages(thinTrap);
const thinFixture = thinPages.map((p) => p.body).join("\n");
const thinScored = scoreStressSample(thinTrap, thinFixture);
assert.ok(
  thinScored.fingerprints.some((f) => f.startsWith("fp:")) || thinScored.overall !== "pass",
  "thin scanned trap produces signal",
);

const missingTrap = listRealLayoutStressRecipes(50).find((r) => r.sampleId === "rlpdf-042")!;
const missingPages = buildStressBundlePages(missingTrap);
const missingText = missingPages.map((p) => p.body).join("\n");
const missingScored = scoreStressSample(missingTrap, missingText);
assert.ok(
  missingScored.trapOutcome?.expectedTier === "deliberate_fail",
  "missing trap tier",
);

const gitignore = fs.readFileSync(".gitignore", "utf8");
assert.ok(gitignore.includes("artifacts/casebrain-auditor/"), "artifacts gitignored");
assert.ok(realLayoutStressCacheRoot().includes("artifacts"), "cache under artifacts");

console.log("real-layout-pdf-ocr-stress.test.ts: ok");
