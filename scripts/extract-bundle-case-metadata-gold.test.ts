/**
 * Gold bundle metadata extraction — Phase 3 fidelity slice 2.
 * Run: npx tsx scripts/extract-bundle-case-metadata-gold.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";

const ROOT = path.join(__dirname, "..");

function loadGoldText(relDir: string): string {
  const dir = path.join(ROOT, relDir);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "00_README.md")
    .sort()
    .map((f) => path.join(dir, f));
  return readBundleText(files);
}

const motoring = loadGoldText("docs/bundle-fidelity-set/gold/motoring-thin");
const motoringMeta = extractBundleCaseMetadata(motoring);
assert.equal(motoringMeta.defendantName, "Ella Shaw");
assert.match(motoringMeta.offenceWording ?? "", /dangerous driving/i);
assert.match(motoringMeta.offenceWording ?? "", /section\s*2/i);

const provisional = loadGoldText("docs/bundle-fidelity-set/gold/generic-provisional");
const provMeta = extractBundleCaseMetadata(provisional);
assert.equal(provMeta.defendantName, "Sam Okonkwo");
assert.match(provMeta.offenceWording ?? "", /pervert.*course of justice/i);

const s18Dir = path.join(ROOT, "test_bundles/s18_charge_reduction_bundle_v1");
const s18Files = fs
  .readdirSync(s18Dir)
  .filter((f) => f.endsWith(".md") && f !== "00_README.md")
  .sort()
  .map((f) => path.join(s18Dir, f));
const s18Meta = extractBundleCaseMetadata(readBundleText(s18Files));
assert.equal(s18Meta.defendantName, "Jordan Clarke");
assert.match(s18Meta.offenceWording ?? "", /wounding with intent/i);

const pikePath = path.join(ROOT, "docs/fictional-bundle-gbh/FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt");
const pikeMeta = extractBundleCaseMetadata(fs.readFileSync(pikePath, "utf8"));
assert.match((pikeMeta.defendantName ?? "").toLowerCase(), /jordan\s+pike/);
assert.match(pikeMeta.offenceWording ?? "", /section\s*20|gbh/i);

const marcus = fs.readFileSync(
  path.join(ROOT, "docs/bundle-fidelity-set/gold/pilot-3/marcus-vale/snapshot.md"),
  "utf8",
);
assert.equal(extractBundleCaseMetadata(marcus).defendantName, "Marcus Vale");

console.log("extract-bundle-case-metadata-gold.test.ts: ok");
