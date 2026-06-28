#!/usr/bin/env npx tsx
/**
 * H2 — grow repo gold pack from 9 anchor cases toward 30+ runnable entries.
 * Adds CB-FRESH adversarial anchors, CB-FOUND foundation shapes, and
 * diverse strategy-corpus seeds (one bundle-text.md + truth-key.json each).
 *
 * Run: npx tsx scripts/seed-golden-pack-growth.ts
 * Force overwrite: npx tsx scripts/seed-golden-pack-growth.ts --force
 */
import fs from "node:fs";
import path from "node:path";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";
import { generateManifestFromSeed } from "../lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { renderCorpusBundleText } from "../lib/eval/casebrain-auditor/strategy-corpus-render";
import type { OffenceFamily } from "../lib/eval/casebrain-auditor/strategy-corpus-types";

const ROOT = process.cwd();
const GOLD_ROOT = path.join(ROOT, "docs", "bundle-fidelity-set", "gold");
const CB_FRESH_SRC = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources");
const CB_FOUND_SRC = path.join(ROOT, "docs", "bundle-foundation-pack", "generated", "sources");

const FORCE = process.argv.includes("--force");

type SeedSpec = {
  dirName: string;
  truthKey: BundleFidelityTruthKey;
  bundleText: string;
};

const DEFAULT_PROHIBITED = [
  "fraud_account_control",
  "pwits_phone_attribution",
  "robbery_identification",
] as const;

function writeCase(spec: SeedSpec): void {
  const caseDir = path.join(GOLD_ROOT, spec.dirName);
  fs.mkdirSync(caseDir, { recursive: true });
  const truthPath = path.join(caseDir, "truth-key.json");
  const bundlePath = path.join(caseDir, "bundle-text.md");
  if (!FORCE && fs.existsSync(truthPath) && fs.existsSync(bundlePath)) {
    console.log(`Skip (exists): ${spec.dirName}`);
    return;
  }
  fs.writeFileSync(truthPath, `${JSON.stringify(spec.truthKey, null, 2)}\n`, "utf8");
  fs.writeFileSync(bundlePath, spec.bundleText, "utf8");
  console.log(`Seeded: ${spec.dirName}`);
}

function readSource(dir: string, file: string): string {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) throw new Error(`Missing source: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function cbFreshSpecs(): SeedSpec[] {
  const cases = [
    {
      dirName: "cb-fresh-001-taylor-brookes",
      source: "CB-FRESH-001_Taylor_Brookes.txt",
      truthKey: {
        bundleId: "cb-fresh-001-taylor-brookes",
        fictional: true,
        label: "CB-FRESH-001 Taylor Brookes — harassment / digital",
        purpose: "Adversarial QA — attribution harassment; no PWITS/drug/BWV bleed",
        defendant: "Taylor Brookes",
        aliases: ["Brookes", "Taylor"],
        charge: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
        chargeKeywords: ["harassment", "protection from harassment", "messages", "whatsapp"],
        court: "Northgate Magistrates' Court",
        hearingDate: "2026-01-01",
        stage: "PTPH",
        documentTypesExpected: ["charge_sheet", "mg5", "mg6"],
        documentTypesForbidden: [],
        evidenceSignalsExpected: ["phone", "message", "screenshot", "mg6"],
        missingMaterialExpected: [
          "phone extraction",
          "message export",
          "complainant MG11",
          "attribution material",
        ],
        thinBundleExpected: true,
        expectedWorkflowProfile: "needs_review",
        expectedRouteFamily: null,
        prohibitedFamilies: ["fraud_account_control", "pwits_phone_attribution", "drugs_pwits"],
        expectedProvisionalStatus: true,
        humanReviewExpected: false,
        linkStatus: "runnable",
        notes: "CB-FRESH adversarial anchor — prod smoke passed post-H1.",
      } satisfies BundleFidelityTruthKey,
    },
    {
      dirName: "cb-fresh-002-jordan-hale",
      source: "CB-FRESH-002_Jordan_Hale.txt",
      truthKey: {
        bundleId: "cb-fresh-002-jordan-hale",
        fictional: true,
        label: "CB-FRESH-002 Jordan Hale — assault emergency worker / BWV",
        purpose: "Adversarial QA — BWV/custody chase collapse; no phone-extraction bleed",
        defendant: "Jordan Hale",
        aliases: ["Hale", "Jordan"],
        charge:
          "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
        chargeKeywords: ["assault", "emergency worker", "bwv", "custody"],
        court: "Central Park Magistrates' Court",
        hearingDate: "2026-03-12",
        stage: "PTPH",
        documentTypesExpected: ["charge_sheet", "mg5", "mg6", "mg11"],
        documentTypesForbidden: [],
        evidenceSignalsExpected: ["bwv", "custody", "mg11", "mg6"],
        missingMaterialExpected: ["body worn video", "full custody record", "complainant MG11"],
        thinBundleExpected: true,
        expectedWorkflowProfile: "needs_review",
        expectedRouteFamily: null,
        prohibitedFamilies: ["fraud_account_control", "pwits_phone_attribution", "drugs_pwits"],
        expectedProvisionalStatus: true,
        humanReviewExpected: false,
        linkStatus: "runnable",
        notes: "CB-FRESH adversarial anchor — family-level chase collapse.",
      } satisfies BundleFidelityTruthKey,
    },
  ] as const;

  return cases.map((c) => ({
    dirName: c.dirName,
    truthKey: c.truthKey,
    bundleText: readSource(CB_FRESH_SRC, c.source),
  }));
}

function cbFoundSpecs(): SeedSpec[] {
  const rows = [
    {
      dirName: "cb-found-2001-ellis",
      source: "CB-FOUND-2001_Ellis_SJP.txt",
      defendant: "Morgan Ellis",
      charge: "Theft, contrary to section 1 of the Theft Act 1968",
      chargeKeywords: ["theft", "theft act"],
      court: "Riverside Magistrates' Court",
      hearingDate: "2026-09-18",
      stage: "SJP",
      missing: ["CCTV continuity"],
      profile: "generic",
    },
    {
      dirName: "cb-found-2002-smith",
      source: "CB-FOUND-2002_Smith_Theft.txt",
      defendant: "Jordan Smith",
      charge: "Theft, contrary to section 1 of the Theft Act 1968",
      chargeKeywords: ["theft", "theft act"],
      court: "Hillford Magistrates' Court",
      hearingDate: "2026-08-24",
      stage: "First appearance",
      missing: ["full CCTV continuity"],
      profile: "generic",
    },
    {
      dirName: "cb-found-2003-nguyen",
      source: "CB-FOUND-2003_Nguyen_Assault.txt",
      defendant: "Priya Nguyen",
      charge: "Common assault, contrary to section 39 of the Criminal Justice Act 1988",
      chargeKeywords: ["common assault", "criminal justice act"],
      court: "Brookfield Magistrates' Court",
      hearingDate: "2026-09-05",
      stage: "First appearance",
      missing: ["BWV clip", "fuller CAD"],
      profile: "violence_domestic_assault",
    },
    {
      dirName: "cb-found-2004-clarke",
      source: "CB-FOUND-2004_Clarke_DrinkDrive.txt",
      defendant: "Daniel Clarke",
      charge:
        "Driving a motor vehicle after consuming so much alcohol that the proportion of alcohol in breath exceeded the prescribed limit, contrary to section 5(1)(a) of the Road Traffic Act 1988",
      chargeKeywords: ["road traffic act", "breath", "alcohol", "limit"],
      court: "Westvale Magistrates' Court",
      hearingDate: "2026-09-12",
      stage: "First appearance",
      missing: ["calibration", "analyst material"],
      profile: "generic_motoring_provisional",
    },
    {
      dirName: "cb-found-2005-okafor",
      source: "CB-FOUND-2005_Okafor_Drugs.txt",
      defendant: "Amara Okafor",
      charge: "Possession of a controlled drug of Class B, contrary to section 5(2) of the Misuse of Drugs Act 1971",
      chargeKeywords: ["possession", "controlled drug", "misuse of drugs"],
      court: "Northgate Magistrates' Court",
      hearingDate: "2026-10-03",
      stage: "First appearance",
      missing: ["lab analysis", "search record"],
      profile: "generic_provisional",
      prohibited: ["fraud_account_control", "robbery_identification"],
    },
    {
      dirName: "cb-found-2006-carter",
      source: "CB-FOUND-2006_Carter_ShopTheft.txt",
      defendant: "Liam Carter",
      charge: "Theft, contrary to section 1 of the Theft Act 1968",
      chargeKeywords: ["theft", "theft act", "shop"],
      court: "Marston Magistrates' Court",
      hearingDate: "2026-08-19",
      stage: "First appearance",
      missing: ["retail CCTV"],
      profile: "generic",
    },
    {
      dirName: "cb-found-2007-morrison",
      source: "CB-FOUND-2007_Morrison_M1_DateConflict.txt",
      defendant: "Ella Morrison",
      charge: "Theft, contrary to section 1 of the Theft Act 1968",
      chargeKeywords: ["theft", "theft act"],
      court: "Fenwick Magistrates' Court",
      hearingDate: "2026-09-19",
      stage: "First appearance",
      missing: ["CCTV continuity"],
      profile: "generic",
      notes: "M1 shape — MG5 vs listing date conflict; listing wins.",
    },
  ] as const;

  return rows.map((row) => ({
    dirName: row.dirName,
    truthKey: {
      bundleId: row.dirName,
      fictional: true,
      label: `R v ${row.defendant} — foundation ${row.stage}`,
      purpose: `CB-FOUND foundation shape — ${row.source}`,
      defendant: row.defendant,
      aliases: [row.defendant.split(" ").pop()!],
      charge: row.charge,
      chargeKeywords: [...row.chargeKeywords],
      court: row.court,
      hearingDate: row.hearingDate,
      stage: row.stage,
      documentTypesExpected: ["charge_sheet", "mg5", "mg6", "mg11"],
      documentTypesForbidden: [],
      evidenceSignalsExpected: ["mg11", "mg6"],
      missingMaterialExpected: [...row.missing],
      thinBundleExpected: false,
      expectedWorkflowProfile: row.profile,
      expectedRouteFamily: row.profile === "violence_domestic_assault" ? "violence_domestic_assault" : null,
      prohibitedFamilies: "prohibited" in row ? [...row.prohibited] : [...DEFAULT_PROHIBITED],
      expectedProvisionalStatus: true,
      humanReviewExpected: false,
      linkStatus: "runnable",
      notes: "notes" in row ? row.notes : "Bundle Foundation Pack v2 — fictional pilot shape.",
    } satisfies BundleFidelityTruthKey,
    bundleText: readSource(CB_FOUND_SRC, row.source),
  }));
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
      return [...DEFAULT_PROHIBITED];
  }
}

const PILOT_HERO_NAMES = new Set(["Marcus Vale", "Kian Doyle", "Leon Marsh"]);
const EXCLUDED_CORPUS_SEEDS = new Set([23]); // sc-00017 — charge fidelity outlier

function corpusSeeds(count: number): number[] {
  const seeds: number[] = [];
  for (let seed = 1; seed <= 500 && seeds.length < count; seed++) {
    if (EXCLUDED_CORPUS_SEEDS.has(seed)) continue;
    const manifest = generateManifestFromSeed(seed, "discovery", "text-rendered");
    if (PILOT_HERO_NAMES.has(manifest.defendantName)) continue;
    seeds.push(seed);
  }
  if (seeds.length < count) throw new Error(`Could only find ${seeds.length} non-pilot corpus seeds`);
  return seeds;
}

function corpusSpecs(seeds: number[]): SeedSpec[] {
  return seeds.map((seed) => {
    const manifest = generateManifestFromSeed(seed, "discovery", "text-rendered");
    const bundleText = renderCorpusBundleText(manifest);
    const surname = manifest.defendantName.split(/\s+/).pop() ?? manifest.defendantName;
    return {
      dirName: `corpus-${manifest.caseId}`,
      truthKey: {
        bundleId: manifest.caseId,
        fictional: true,
        label: `R v ${manifest.defendantName} — ${manifest.offenceFamily} corpus`,
        purpose: `H2 golden pack corpus seed ${seed} (${manifest.recipeId})`,
        defendant: manifest.defendantName,
        aliases: [surname],
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
        humanReviewExpected: manifest.expectations.requiresHumanReviewWhenSerious,
        linkStatus: "runnable",
        notes: `Strategy corpus seed ${seed} — tags: ${manifest.failureModeTags.join(", ")}`,
      } satisfies BundleFidelityTruthKey,
      bundleText,
    };
  });
}

function main(): void {
  for (const name of fs.readdirSync(GOLD_ROOT)) {
    if (name.startsWith("corpus-sc-")) {
      fs.rmSync(path.join(GOLD_ROOT, name), { recursive: true, force: true });
    }
  }

  const corpusSeedList = corpusSeeds(32);
  const specs = [...cbFreshSpecs(), ...cbFoundSpecs(), ...corpusSpecs(corpusSeedList)];

  console.log(`Golden pack growth — ${specs.length} new entries (force=${FORCE})`);
  for (const spec of specs) writeCase(spec);

  const existing = fs
    .readdirSync(GOLD_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  console.log(`\nGold directories now: ${existing.length}`);
  console.log("Next: npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 50");
}

main();
