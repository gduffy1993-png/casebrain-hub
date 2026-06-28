#!/usr/bin/env npx tsx
/**
 * H2 — grow gold pack toward target count (default 75) without deleting existing cases.
 *
 * Run: npx tsx scripts/grow-golden-pack.ts --target 75
 */
import fs from "node:fs";
import path from "node:path";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";
import { generateManifestFromSeed } from "../lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { renderCorpusBundleText } from "../lib/eval/casebrain-auditor/strategy-corpus-render";
import {
  deriveVerificationFromManifest,
} from "../lib/eval/casebrain-auditor/golden-truth-key-v2";
import type { OffenceFamily } from "../lib/eval/casebrain-auditor/strategy-corpus-types";

const ROOT = process.cwd();
const GOLD_ROOT = path.join(ROOT, "docs", "bundle-fidelity-set", "gold");

const TARGET = (() => {
  const i = process.argv.indexOf("--target");
  return i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 75) : 75;
})();

const PILOT_HERO_NAMES = new Set(["Marcus Vale", "Kian Doyle", "Leon Marsh"]);
const EXCLUDED_CORPUS_SEEDS = new Set([23, 83, 95]); // charge fidelity outliers (placeholder charge wording)

const PLACEHOLDER_CHARGE_RE =
  /serious offence|provisional charge wording|unclear offence|pending review/i;

function isPlaceholderCharge(chargeWording: string): boolean {
  return PLACEHOLDER_CHARGE_RE.test(chargeWording);
}

function existingDirNames(): Set<string> {
  if (!fs.existsSync(GOLD_ROOT)) return new Set();
  return new Set(
    fs.readdirSync(GOLD_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
  );
}

function pickNewCorpusSeeds(need: number, taken: Set<string>): number[] {
  const seeds: number[] = [];
  for (let seed = 1; seed <= 800 && seeds.length < need; seed++) {
    if (EXCLUDED_CORPUS_SEEDS.has(seed)) continue;
    const manifest = generateManifestFromSeed(seed, "discovery", "text-rendered");
    if (PILOT_HERO_NAMES.has(manifest.defendantName)) continue;
    if (isPlaceholderCharge(manifest.chargeWording)) continue;
    const dirName = `corpus-${manifest.caseId}`;
    if (taken.has(dirName)) continue;
    taken.add(dirName);
    seeds.push(seed);
  }
  if (seeds.length < need) throw new Error(`Could only find ${seeds.length} new corpus seeds (need ${need})`);
  return seeds;
}

function routeFamilyForOffence(family: OffenceFamily): string | null {
  switch (family) {
    case "fraud_account_control":
      return "fraud_account_control";
    case "pwits_phone":
      return "pwits_phone_attribution";
    case "robbery_id":
      return "robbery_identification";
    case "violence_gbh_s18":
      return "violence_domestic_assault";
    default:
      return null;
  }
}

function profileForFamily(family: OffenceFamily): string {
  switch (family) {
    case "motoring":
      return "generic_motoring_provisional";
    case "fraud_account_control":
      return "fraud_account_control";
    case "pwits_phone":
      return "pwits_phone_attribution";
    case "robbery_id":
      return "robbery_identification";
    case "violence_gbh_s18":
      return "violence_domestic_assault";
    default:
      return "generic_provisional";
  }
}

function prohibitedForFamily(family: OffenceFamily): string[] {
  switch (family) {
    case "motoring":
      return ["fraud_account_control", "pwits_phone_attribution", "violence_domestic_assault"];
    case "fraud_account_control":
      return ["pwits_phone_attribution", "robbery_identification"];
    case "pwits_phone":
      return ["fraud_account_control", "robbery_identification"];
    case "robbery_id":
      return ["fraud_account_control", "pwits_phone_attribution"];
    case "violence_gbh_s18":
      return ["fraud_account_control", "pwits_phone_attribution"];
    default:
      return ["fraud_account_control", "pwits_phone_attribution", "robbery_identification"];
  }
}

function seedCorpusCase(seed: number): void {
  const manifest = generateManifestFromSeed(seed, "discovery", "text-rendered");
  const bundleText = renderCorpusBundleText(manifest);
  const dirName = `corpus-${manifest.caseId}`;
  const caseDir = path.join(GOLD_ROOT, dirName);
  fs.mkdirSync(caseDir, { recursive: true });

  const baseKey: BundleFidelityTruthKey = {
    bundleId: manifest.caseId,
    fictional: true,
    label: `R v ${manifest.defendantName} — ${manifest.offenceFamily} corpus`,
    purpose: `H2 golden pack corpus seed ${seed} (${manifest.recipeId})`,
    defendant: manifest.defendantName,
    aliases: [manifest.defendantName.split(/\s+/).pop() ?? manifest.defendantName],
    charge: manifest.chargeWording,
    chargeKeywords: manifest.chargeWording
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4)
      .slice(0, 6),
    court: null,
    hearingDate: null,
    stage: manifest.stage,
    documentTypesExpected: ["charge_sheet", "mg5", "mg6"],
    documentTypesForbidden: [],
    evidenceSignalsExpected: manifest.documentInventory.map((d) => d.docType.toLowerCase()),
    missingMaterialExpected: manifest.missingMaterial,
    thinBundleExpected: manifest.failureModeTags.includes("thin_bundle"),
    expectedWorkflowProfile: profileForFamily(manifest.offenceFamily),
    expectedRouteFamily: routeFamilyForOffence(manifest.offenceFamily),
    prohibitedFamilies: prohibitedForFamily(manifest.offenceFamily),
    expectedProvisionalStatus: true,
    humanReviewExpected: false,
    linkStatus: "runnable",
    notes: `Strategy corpus seed ${seed} — tags: ${manifest.failureModeTags.join(", ")}`,
  };

  const truthKey = deriveVerificationFromManifest(manifest, baseKey);
  fs.writeFileSync(path.join(caseDir, "truth-key.json"), `${JSON.stringify(truthKey, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(caseDir, "bundle-text.md"), bundleText, "utf8");
  console.log(`Seeded: ${dirName}`);
}

function main(): void {
  const existing = existingDirNames();
  const need = TARGET - existing.size;
  console.log(`Golden pack grow — target ${TARGET}, current ${existing.size}, need ${need}`);

  if (need <= 0) {
    console.log("Already at or above target.");
    return;
  }

  const seeds = pickNewCorpusSeeds(need, new Set(existing));
  for (const seed of seeds) seedCorpusCase(seed);

  const total = existingDirNames().size;
  console.log(`\nGold directories now: ${total}`);
  console.log(`Next: npx tsx scripts/backfill-golden-truth-keys-v2.ts`);
  console.log(`      npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable ${TARGET} --max-polish-rate 1`);
}

main();
