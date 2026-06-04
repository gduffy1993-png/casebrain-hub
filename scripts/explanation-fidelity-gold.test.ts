/**
 * Gold explanation fidelity — Phase 3.5b.
 * Run: npx tsx scripts/explanation-fidelity-gold.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { evaluateExplanationCase, loadGoldExplanationExpect } from "../lib/eval/casebrain-auditor/explanation-fidelity-expect";
import { generateExplanationFidelity } from "../lib/eval/casebrain-auditor/explanation-fidelity-generate";

const GOLD_EXPECT_DIR = path.join(__dirname, "..", "docs", "bundle-fidelity-set", "explanation", "gold");

const expectFiles = fs.readdirSync(GOLD_EXPECT_DIR).filter((f) => f.endsWith(".expect.json"));
assert.ok(expectFiles.length >= 7, `expected >= 7 gold expect files, got ${expectFiles.length}`);

let passed = 0;
for (const entry of loadGoldPack()) {
  const id = entry.truthKey.bundleId;
  if (!entry.bundleTextPaths.length) continue;

  const expect = loadGoldExplanationExpect(id);
  assert.ok(expect, `missing expect for ${id}`);

  const text = readBundleText(entry.bundleTextPaths);
  const sections = generateExplanationFidelity(text);
  assert.ok(sections.some((s) => s.key === "missing-material"), `${id}: missing-material section`);
  assert.ok(sections.some((s) => s.key === "contradictions"), `${id}: contradictions section`);

  const { failures, generatedBlockCount } = evaluateExplanationCase(id, text);
  assert.equal(
    failures.length,
    0,
    `${id} explanation fidelity failed:\n  ${failures.join("\n  ")}`,
  );
  assert.ok(generatedBlockCount > 0, `${id}: no blocks generated`);
  passed++;
}

assert.equal(passed, 7, "expected 7 runnable gold bundles");
console.log("explanation-fidelity-gold.test.ts: ok (7/7)");
