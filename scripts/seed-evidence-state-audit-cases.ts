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

function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeTextFileWithRetry(filePath: string, contents: string): void {
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents, "utf8");
      return;
    } catch (error) {
      lastError = error;
      pause(250);
    }
  }
  throw lastError;
}

function resolveSimDir(caseId: string): string | null {
  for (const pack of SIM_PACKS) {
    const dir = path.join(ROOT, "docs", "h4", pack, caseId);
    if (fs.existsSync(path.join(dir, "bundle-text.md"))) return dir;
  }
  return null;
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

function seedCase(caseId: string): boolean {
  const simDir = resolveSimDir(caseId);
  if (!simDir) return false;
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
  writeTextFileWithRetry(path.join(outDir, "truth-key.json"), `${JSON.stringify(truthKey, null, 2)}\n`);
  writeTextFileWithRetry(path.join(outDir, "casebrain-output.json"), `${JSON.stringify(output, null, 2)}\n`);
  writeTextFileWithRetry(path.join(outDir, "bundle-text.md"), bundleText);

  console.log(`  seeded ${caseId} (${truthKey.evidenceItems.length} truth items)`);
  return true;
}

function main(): void {
  console.log("Seeding controlled evidence-state audit cases (simulator v2/v3)…");
  const skipped: string[] = [];
  for (const caseId of AUDIT_SIMULATOR_CASE_IDS) {
    if (!seedCase(caseId)) skipped.push(caseId);
  }
  const total = fs.readdirSync(OUT_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  if (skipped.length) {
    const skippedPath = path.join(OUT_ROOT, "_skipped-missing-simulator-bundles.json");
    writeTextFileWithRetry(
      skippedPath,
      `${JSON.stringify({ count: skipped.length, caseIds: skipped }, null, 2)}\n`,
    );
    console.log(`Skipped ${skipped.length} simulator ids with no local bundle; wrote ${skippedPath}`);
  }
  console.log(`Done. ${total} case folders under artifacts/evidence-state-audit-local/cases/`);
}

main();
