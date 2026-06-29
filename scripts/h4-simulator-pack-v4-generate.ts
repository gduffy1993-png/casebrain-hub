#!/usr/bin/env npx tsx
/**
 * H4 v4 — generate 247 bundle texts (sim-151..397).
 * Run: npx tsx scripts/build-simulator-manifest-v4.ts
 *      npx tsx scripts/h4-simulator-pack-v4-generate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { loadSimulatorPackV4, SIMULATOR_PACK_V4_ROOT } from "../lib/eval/h4-simulator/load-simulator-pack";
import { renderSimulatorBundleText } from "../lib/eval/h4-simulator/render-simulator-bundle";

const FORCE = process.argv.includes("--force");

function main(): void {
  const manifestPath = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v4.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Run npx tsx scripts/build-simulator-manifest-v4.ts first");
  }

  const cases = JSON.parse(fs.readFileSync(manifestPath, "utf8")).cases as Parameters<
    typeof renderSimulatorBundleText
  >[0][];

  fs.mkdirSync(SIMULATOR_PACK_V4_ROOT, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (const entry of cases) {
    const caseDir = path.join(SIMULATOR_PACK_V4_ROOT, entry.caseId);
    fs.mkdirSync(caseDir, { recursive: true });
    const bundlePath = path.join(caseDir, "bundle-text.md");
    const truthPath = path.join(caseDir, "truth-key.json");

    if (!FORCE && fs.existsSync(bundlePath) && fs.existsSync(truthPath)) {
      skipped += 1;
      continue;
    }

    const bundleText = renderSimulatorBundleText({ ...entry, bundleStatus: "generated" });
    fs.writeFileSync(bundlePath, bundleText, "utf8");
    fs.writeFileSync(truthPath, `${JSON.stringify({ ...entry, bundleStatus: "generated" }, null, 2)}\n`, "utf8");
    written += 1;
  }

  fs.writeFileSync(
    path.join(SIMULATOR_PACK_V4_ROOT, "index.json"),
    `${JSON.stringify(
      {
        version: "simulator-pack-v4",
        supplementOf: ["simulator-pack-v1", "simulator-pack-v1.1", "simulator-pack-v2", "simulator-pack-v3"],
        generatedAt: new Date().toISOString(),
        caseCount: cases.length,
        caseIds: cases.map((c) => c.caseId),
      },
      null,
      2,
    )}\n`,
  );

  loadSimulatorPackV4();
  console.log(`H4 simulator pack v4: wrote ${written}, skipped ${skipped} (${cases.length} total)`);
}

main();
