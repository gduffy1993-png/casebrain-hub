#!/usr/bin/env npx tsx
/**
 * Build docs/h4/simulator-manifest.v1.json from seed case definitions.
 * Run: npx tsx scripts/build-simulator-manifest-v1.ts
 */
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V1_CASES } from "../lib/eval/h4-simulator/manifest-v1-cases";

const OUT = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json");

const manifest = {
  version: "simulator-manifest-v1",
  generatedAt: new Date().toISOString(),
  principle: "Test by shape, not identity — fake/anonymised bundles only.",
  targetCount: 30,
  expansionPath: ["30", "75", "150+"],
  gate: {
    blocking: [
      "wrong-family bleed",
      "referred-as-served",
      "missing-as-proved",
      "unsafe win language",
      "court-in-CPS-chase",
      "safe-to-send-without-source-state",
    ],
    runsWith: ["golden 102", "Level 1 2200", "h4-export-copy-gate"],
  },
  cases: SIMULATOR_MANIFEST_V1_CASES,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${OUT} (${manifest.cases.length} cases)`);
