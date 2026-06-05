/**
 * Real-layout PDF/OCR stress lane — slice 1 tests.
 * Run: npx tsx scripts/real-layout-pdf-ocr-stress.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  allLayoutTagsInRecipes,
  listRealLayoutStressRecipes,
  offenceFamiliesInRecipes,
} from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-recipes";
import { buildStressBundlePages } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-content";
import { REAL_LAYOUT_STRESS_LAYOUT_TAGS } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-types";
import { realLayoutStressCacheRoot } from "../lib/eval/casebrain-auditor/real-layout-pdf-ocr-stress/real-layout-stress-paths";

const m1 = listRealLayoutStressRecipes(25)[0]!;
const m2 = listRealLayoutStressRecipes(25)[0]!;
assert.deepEqual(m1, m2, "same seed/manifest for recipe 001");

const pages1 = buildStressBundlePages(m1);
const pages2 = buildStressBundlePages(m2);
assert.equal(pages1.length, pages2.length, "deterministic page count");
assert.equal(pages1[0]!.body, pages2[0]!.body, "deterministic content");

const covered = new Set(allLayoutTagsInRecipes(25));
for (const tag of REAL_LAYOUT_STRESS_LAYOUT_TAGS) {
  assert.ok(covered.has(tag), `layout tag covered: ${tag}`);
}

const families = offenceFamiliesInRecipes(25);
assert.ok(families.includes("motoring_dangerous"));
assert.ok(families.includes("fraud_account"));
assert.ok(families.includes("pwits_phone"));
assert.ok(families.includes("robbery_identification"));
assert.ok(families.includes("violence_gbh_s18"));
assert.ok(families.includes("generic_provisional"));

const gitignore = fs.readFileSync(".gitignore", "utf8");
assert.ok(gitignore.includes("artifacts/casebrain-auditor/"), "artifacts gitignored");
assert.ok(realLayoutStressCacheRoot().includes("artifacts"), "cache under artifacts");
assert.equal(listRealLayoutStressRecipes(25).length, 25);

console.log("real-layout-pdf-ocr-stress.test.ts: ok");
