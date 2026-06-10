/**
 * Product proof map — Control Room Phase 2 v1.
 * Run: npx tsx scripts/proof-map-product.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildProductProofMap,
  isStrongConfidence,
  isSubstantiveSourceBasis,
  lintProductProofMapResult,
} from "../lib/criminal/proof-map/build-product-proof-map";
import {
  containsDevRef,
  containsPublicDevLabel,
  isSafePublicDisplayLine,
  sanitizePublicDisplayLine,
} from "../lib/criminal/dev-ref-scrub";
import { PROOF_MAP_UNAVAILABLE_MESSAGE } from "../lib/criminal/proof-map/product-proof-map-types";

const GOLD_ROOT = path.join(__dirname, "..", "docs", "bundle-fidelity-set", "gold");

function loadPilotBundle(slug: string): string {
  const file = path.join(GOLD_ROOT, "pilot-3", slug, "bundle-export.md");
  return fs.readFileSync(file, "utf8");
}

function loadMotoringThin(): string {
  const dir = path.join(GOLD_ROOT, "motoring-thin");
  return ["01_Cover.md", "02_Charge_Sheet.md", "03_MG5.md", "04_Bundle_Index.md"]
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n\n");
}

function loadGenericProvisional(): string {
  const dir = path.join(GOLD_ROOT, "generic-provisional");
  return ["01_Cover.md", "02_Charge_Sheet.md", "03_MG5.md", "05_MG6_Partial.md", "06_Bundle_Index.md"]
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n\n");
}

function fromFrontMatter(text: string, matterLabel: string, allegation?: string) {
  return buildProductProofMap({
    frontMatterScan: text,
    combinedTextLength: text.length,
    matterLabel,
    allegation,
  });
}

// ---------- Tier D: no bundle ----------
const blocked = buildProductProofMap({ combinedTextLength: 0 });
assert.equal(blocked.available, false);
if (!blocked.available) {
  assert.equal(blocked.message, PROOF_MAP_UNAVAILABLE_MESSAGE);
  assert.equal(blocked.tier, "D");
}

// ---------- Marcus Vale — fraud-specific (Tier A) ----------
const marcus = fromFrontMatter(loadPilotBundle("marcus-vale"), "Marcus Vale", "Fraud by false representation");
assert.equal(marcus.available, true, "Marcus proof map should be available");
if (marcus.available) {
  assert.equal(marcus.tier, "A");
  assert.match(marcus.offenceLensLabel, /fraud/i);
  assert.ok(marcus.proofPoints.some((p) => /dishonest|representation|account/i.test(p.label)));
  assert.ok(marcus.disclosureChaseLinks.length > 0 || marcus.missingLinks.length > 0);
  for (const p of marcus.proofPoints) {
    if (isStrongConfidence(p.confidence)) {
      assert.ok(isSubstantiveSourceBasis(p.sourceBasis), `Marcus strong point ${p.id} needs sourceBasis`);
    }
  }
  assert.equal(lintProductProofMapResult(marcus, loadPilotBundle("marcus-vale")).length, 0);
}

// ---------- Kian Doyle — PWITS / phone (Tier A) ----------
const kian = fromFrontMatter(loadPilotBundle("kian-doyle"), "Kian Doyle", "Possession with intent to supply");
assert.equal(kian.available, true);
if (kian.available) {
  assert.equal(kian.tier, "A");
  assert.match(kian.offenceLensLabel, /intent to supply|PWITS/i);
  assert.ok(kian.proofPoints.some((p) => /phone|supply|possession|intent/i.test(p.label)));
}

// ---------- Leon Marsh — robbery / ID (Tier A) ----------
const leon = fromFrontMatter(loadPilotBundle("leon-marsh"), "Leon Marsh", "Robbery");
assert.equal(leon.available, true);
if (leon.available) {
  assert.equal(leon.tier, "A");
  assert.match(leon.offenceLensLabel, /robbery|identification/i);
  assert.ok(leon.proofPoints.some((p) => /identification|robbery|force|steal/i.test(p.label)));
}

// ---------- Motoring thin — provisional safe (Tier A/C) ----------
const motoring = fromFrontMatter(loadMotoringThin(), "Ella Shaw", "Dangerous driving");
assert.equal(motoring.available, true);
if (motoring.available) {
  assert.ok(["A", "C"].includes(motoring.tier));
  const provisionalCount = motoring.proofPoints.filter((p) => p.confidence === "provisional").length;
  assert.ok(provisionalCount >= motoring.proofPoints.length / 2, "motoring thin should lean provisional");
  assert.ok(motoring.proofPoints.some((p) => /driving|driver|collision/i.test(p.label)));
}

// ---------- Generic provisional — safe fallback (Tier B or C) ----------
const generic = fromFrontMatter(loadGenericProvisional(), "Sam Okonkwo", "Serious offence — provisional charge");
assert.equal(generic.available, true);
if (generic.available) {
  assert.ok(["B", "C"].includes(generic.tier), `generic provisional tier was ${generic.tier}`);
  assert.ok(generic.humanReviewRequired || generic.humanReviewReasons.length > 0);
  assert.match(generic.offenceLensLabel, /provisional/i);
}

function visibleProofMapText(result: NonNullable<ReturnType<typeof buildProductProofMap>> & { available: true }): string {
  return [
    result.charge,
    result.tierLabel,
    result.offenceLensLabel,
    result.solicitorReviewNote,
    result.doNotRelyWarning,
    ...result.humanReviewReasons,
    ...result.proofPoints.flatMap((p) => [p.label, p.crownMustProve, p.sourceBasis ?? "", p.doNotOverstate ?? ""]),
    ...result.supportsLinks.flatMap((l) => [l.label, l.disclosureChase ?? ""]),
    ...result.missingLinks.flatMap((l) => [l.label, l.disclosureChase ?? ""]),
    ...result.disclosureChaseLinks.flatMap((l) => [l.label, l.disclosureChase ?? ""]),
  ].join("\n");
}

// ---------- sourceBasis scrub — eval labels must not appear in visible anchors ----------
assert.equal(sanitizePublicDisplayLine("Pack F — Case 11 — CB-THIN-2026-0011"), "");
assert.equal(sanitizePublicDisplayLine("- Full bank export — outstanding"), "Full bank export — outstanding");
assert.ok(isSafePublicDisplayLine("Fraud by false representation — Marcus Vale"));
assert.ok(containsPublicDevLabel("Pack R — Case 01 — CB-TEST-FOO"), "detector flags raw dev labels");

const leakBasis = fromFrontMatter(
  "=== SECTION: MG5 ===\nPack F — Case 11 — CB-THIN-2026-0011\nFraud by false representation",
  "Marcus Vale",
  "Fraud",
);
if (leakBasis.available) {
  const bases = leakBasis.proofPoints.map((p) => p.sourceBasis).filter(Boolean);
  for (const b of bases) {
    assert.ok(!containsPublicDevLabel(b!), `sourceBasis leaked dev label: ${b}`);
    assert.ok(isSafePublicDisplayLine(b!), `unsafe sourceBasis: ${b}`);
  }
}

// ---------- Dev title scrub — eval titles must not leak in visible UI text ----------
const devTitle = fromFrontMatter(loadPilotBundle("marcus-vale"), "Pack R — Case 01 — CB-TEST-FOO", "Fraud");
if (devTitle.available) {
  const visible = visibleProofMapText(devTitle);
  assert.ok(!containsDevRef(visible), "eval pack title must be scrubbed from visible proof map text");
  assert.ok(!/Pack [A-Z]{1,2}/i.test(visible));
}

// ---------- No fake certainty / forbidden phrases ----------
for (const result of [marcus, kian, leon, motoring, generic]) {
  if (!result.available) continue;
  const text = JSON.stringify(result).toLowerCase();
  assert.ok(!text.includes("guaranteed"));
  assert.ok(!text.includes("proves innocence"));
  assert.ok(!text.includes("crown will lose"));
}

console.log("proof-map-product.test.ts: ok");
