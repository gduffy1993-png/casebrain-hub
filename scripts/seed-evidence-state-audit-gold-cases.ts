#!/usr/bin/env npx tsx
/**
 * Seed gold / bundle-fidelity cases into evidence-state audit fixtures.
 * Run: npx tsx scripts/seed-evidence-state-audit-gold-cases.ts
 */
import fs from "node:fs";
import path from "node:path";

import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildCasebrainAuditSnapshot } from "../lib/eval/evidence-state-audit/build-audit-snapshot";
import { convertGoldTruthKeyToEvidenceState } from "../lib/eval/evidence-state-audit/convert-gold-truth-key";

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");

function offenceLabel(family: string | undefined): string {
  switch (family) {
    case "fraud_account":
    case "fraud_account_control":
      return "Fraud";
    case "motoring":
    case "generic_motoring_provisional":
      return "Motoring";
    case "robbery_id":
    case "robbery_identification":
      return "Robbery";
    case "violence_gbh_s18":
    case "violence_domestic_assault":
      return "Violence";
    default:
      return "Criminal";
  }
}

function seedGoldCase(bundleId: string): void {
  const entry = loadGoldPack().find((e) => e.truthKey.bundleId === bundleId);
  if (!entry || entry.bundleTextPaths.length === 0) {
    throw new Error(`Missing runnable gold bundle for ${bundleId}`);
  }

  const bundleText = readBundleText(entry.bundleTextPaths);
  const truthKey = convertGoldTruthKeyToEvidenceState(entry.truthKey);

  const output = buildCasebrainAuditSnapshot({
    caseId: bundleId,
    bundleText,
    clientLabel: entry.truthKey.defendant,
    allegation: entry.truthKey.charge,
    offenceLabel: offenceLabel(truthKey.offenceFamily),
    missingMaterial: entry.truthKey.missingMaterialExpected ?? [],
    truthKey,
  });

  const outDir = path.join(OUT_ROOT, bundleId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "truth-key.json"), `${JSON.stringify(truthKey, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "casebrain-output.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "bundle-text.md"), bundleText, "utf8");

  console.log(`  seeded gold ${bundleId} (${truthKey.evidenceItems.length} truth items)`);
}

function main(): void {
  const only = process.argv.slice(2);
  const ids = (only.length ? only : loadGoldPack().map((e) => e.truthKey.bundleId)).filter((id) => {
    const entry = loadGoldPack().find((e) => e.truthKey.bundleId === id);
    return entry && entry.bundleTextPaths.length > 0;
  });

  console.log(`Seeding ${ids.length} gold audit cases…`);
  for (const id of ids) seedGoldCase(id);
  console.log("Done.");
}

main();
