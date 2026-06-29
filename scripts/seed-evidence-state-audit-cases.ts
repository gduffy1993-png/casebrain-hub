#!/usr/bin/env npx tsx
/**
 * Seed controlled evidence-state audit cases from H4 simulator v2 bundles.
 * Synthetic material only — no real client data.
 *
 * Run: npx tsx scripts/seed-evidence-state-audit-cases.ts
 */
import fs from "node:fs";
import path from "node:path";

import { buildCasebrainAuditSnapshot } from "../lib/eval/evidence-state-audit/build-audit-snapshot";
import {
  AUDIT_SIMULATOR_CASE_IDS,
  enrichSimulatorTruthKey,
} from "../lib/eval/evidence-state-audit/enrich-simulator-truth-key";
import type { SimulatorV2TruthKey } from "../lib/eval/evidence-state-audit/types";

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const SIM_PACKS = [
  "simulator-pack-v1",
  "simulator-pack-v1.1",
  "simulator-pack-v2",
  "simulator-pack-v3",
  "simulator-pack-v4",
] as const;

function resolveSimDir(caseId: string): string {
  for (const pack of SIM_PACKS) {
    const dir = path.join(ROOT, "docs", "h4", pack, caseId);
    if (fs.existsSync(path.join(dir, "bundle-text.md"))) return dir;
  }
  throw new Error(`Missing simulator bundle for ${caseId}`);
}

function offenceLabel(family: string | undefined): string {
  switch (family) {
    case "drugs_conspiracy":
    case "drugs_pwits":
    case "drugs_supply":
      return "Drugs";
    case "violence_assault":
      return "Violence";
    case "domestic_harassment":
      return "Domestic / harassment";
    case "bwv_police_contact":
      return "Public order / police contact";
    case "theft_handling":
      return "Theft";
    default:
      return "Criminal";
  }
}

function seedCase(caseId: string): void {
  const simDir = resolveSimDir(caseId);
  const bundlePath = path.join(simDir, "bundle-text.md");
  const truthPath = path.join(simDir, "truth-key.json");
  if (!fs.existsSync(bundlePath) || !fs.existsSync(truthPath)) {
    throw new Error(`Missing simulator files for ${caseId}`);
  }

  const bundleText = fs.readFileSync(bundlePath, "utf8");
  const raw = JSON.parse(fs.readFileSync(truthPath, "utf8")) as SimulatorV2TruthKey;
  const truthKey = enrichSimulatorTruthKey(raw);

  const missingMaterial = [
    ...(raw.missingEvidence ?? []),
    ...(raw.referredOnlyEvidence ?? []),
    ...(raw.expectedChaseItems ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const output = buildCasebrainAuditSnapshot({
    caseId,
    bundleText,
    clientLabel: raw.fakeDefendant ?? caseId,
    allegation: raw.offenceWording ?? "Criminal offence",
    offenceLabel: offenceLabel(raw.offenceFamily),
    missingMaterial,
    truthKey,
  });

  const outDir = path.join(OUT_ROOT, caseId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "truth-key.json"), `${JSON.stringify(truthKey, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "casebrain-output.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "bundle-text.md"), bundleText, "utf8");

  console.log(`  seeded ${caseId} (${truthKey.evidenceItems.length} truth items)`);
}

function main(): void {
  console.log("Seeding controlled evidence-state audit cases (simulator v2/v3)…");
  for (const caseId of AUDIT_SIMULATOR_CASE_IDS) {
    seedCase(caseId);
  }
  const total = fs.readdirSync(OUT_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  console.log(`Done. ${total} case folders under artifacts/evidence-state-audit-local/cases/`);
}

main();
