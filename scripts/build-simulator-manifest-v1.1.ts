#!/usr/bin/env npx tsx
/**
 * Build docs/h4/simulator-manifest.v1.1.json — serious-case supplement (+7).
 * Run: npx tsx scripts/build-simulator-manifest-v1.1.ts
 */
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V1_1_CASES } from "../lib/eval/h4-simulator/manifest-v1.1-cases";

const OUT = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.1.json");

const manifest = {
  version: "simulator-manifest-v1.1",
  supplementOf: "simulator-manifest-v1",
  generatedAt: new Date().toISOString(),
  principle: "Serious legal aid / Crown Court shapes — additive to locked v1 (30).",
  targetCount: 7,
  caseIdRange: "sim-031..sim-037",
  expansionPath: ["37", "75", "150+"],
  hardRules: [
    "no co-defendant bleed",
    "no handle/phone attribution as fact unless source supports it",
    "no conspiracy role overclaim",
    "no CCTV/BWV proves fact unless full source served",
    "no ABE content treated as served if only referred",
    "no safe-to-send without source state",
  ],
  gate: {
    blocking: [
      "wrong-family bleed",
      "referred-as-served",
      "missing-as-proved",
      "unsafe win language",
      "court-in-CPS-chase",
      "safe-to-send-without-source-state",
      "serious-case hard rules (v1.1)",
    ],
    runsWith: ["simulator-pack-v1 gate", "golden 102", "h4-export-copy-gate"],
  },
  cases: SIMULATOR_MANIFEST_V1_1_CASES,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${OUT} (${manifest.cases.length} cases)`);
