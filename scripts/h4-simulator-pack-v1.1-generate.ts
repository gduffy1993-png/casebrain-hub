#!/usr/bin/env npx tsx
/**
 * H4 v1.1 supplement — generate 7 serious-case bundle texts.
 * Run: npx tsx scripts/h4-simulator-pack-v1.1-generate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { SIMULATOR_MANIFEST_V1_1_CASES } from "../lib/eval/h4-simulator/manifest-v1.1-cases";
import { SIMULATOR_PACK_V1_1_ROOT } from "../lib/eval/h4-simulator/load-simulator-pack";
import { renderSimulatorBundleText } from "../lib/eval/h4-simulator/render-simulator-bundle";

const FORCE = process.argv.includes("--force");

function main(): void {
  fs.mkdirSync(SIMULATOR_PACK_V1_1_ROOT, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (const entry of SIMULATOR_MANIFEST_V1_1_CASES) {
    const caseDir = path.join(SIMULATOR_PACK_V1_1_ROOT, entry.caseId);
    fs.mkdirSync(caseDir, { recursive: true });
    const bundlePath = path.join(caseDir, "bundle-text.md");
    const truthPath = path.join(caseDir, "truth-key.json");

    if (!FORCE && fs.existsSync(bundlePath) && fs.existsSync(truthPath)) {
      skipped += 1;
      continue;
    }

    const bundleText = renderSimulatorBundleText(entry);
    fs.writeFileSync(bundlePath, bundleText, "utf8");
    fs.writeFileSync(truthPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
    written += 1;
  }

  fs.writeFileSync(
    path.join(SIMULATOR_PACK_V1_1_ROOT, "index.json"),
    `${JSON.stringify(
      {
        version: "simulator-pack-v1.1",
        supplementOf: "simulator-pack-v1",
        generatedAt: new Date().toISOString(),
        caseCount: SIMULATOR_MANIFEST_V1_1_CASES.length,
        caseIds: SIMULATOR_MANIFEST_V1_1_CASES.map((c) => c.caseId),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`h4-simulator-pack-v1.1-generate: wrote ${written}, skipped ${skipped}, total 7`);
  console.log(`  Pack root: ${SIMULATOR_PACK_V1_1_ROOT}`);
}

main();
