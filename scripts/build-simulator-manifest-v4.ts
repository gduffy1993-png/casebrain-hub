#!/usr/bin/env npx tsx
/**
 * Build H4 simulator manifest v4 (sim-151..397) — controlled audit expansion.
 * Run: npx tsx scripts/build-simulator-manifest-v4.ts
 */
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V4_CASES, V4_CASE_COUNT } from "../lib/eval/h4-simulator/manifest-v4-case-catalog";

const OUT = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v4.json");

function main(): void {
  if (SIMULATOR_MANIFEST_V4_CASES.length !== V4_CASE_COUNT) {
    throw new Error(`Expected ${V4_CASE_COUNT} cases, got ${SIMULATOR_MANIFEST_V4_CASES.length}`);
  }

  const manifest = {
    version: "simulator-manifest-v4",
    supplementOf: ["simulator-manifest-v1", "simulator-manifest-v1.1", "simulator-manifest-v2", "simulator-manifest-v3"],
    generatedAt: new Date().toISOString(),
    principle: "Controlled audit expansion — anonymised bundles; no real client data.",
    disclaimer: "Controlled/synthetic audit only — not solicitor-reviewed real-world audit.",
    baseLibraryCount: 150,
    targetCount: V4_CASE_COUNT,
    combinedLibraryCount: 397,
    caseIdRange: "sim-151..sim-397",
    coverageNotes: {
      focus: [
        "Source hierarchy conflicts",
        "Date/time conflicts",
        "Youth/vulnerability/safeguards",
        "Disclosure schedule traps",
        "Changed/corrected charge",
        "Index-listed-not-served",
        "Partial vs full evidence",
        "Wrong person/entity",
        "Inference-as-fact",
        "Export surface safety",
      ],
    },
    gate: {
      blocking: [
        "false_served",
        "wrong_defendant_bleed",
        "inference_as_fact",
        "index_listed_as_served",
        "export_unsafe_wording",
      ],
    },
    cases: SIMULATOR_MANIFEST_V4_CASES,
  };

  fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${OUT} (${SIMULATOR_MANIFEST_V4_CASES.length} cases, combined library 397)`);
}

main();
