/**
 * Load H4 simulator pack v1 cases from disk.
 */
import fs from "node:fs";
import path from "node:path";
import type { SimulatorManifestCase } from "./manifest-v1-cases";

export const SIMULATOR_PACK_V1_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v1");

export type SimulatorPackEntry = {
  manifest: SimulatorManifestCase;
  bundleTextPath: string;
  bundleText: string;
};

export function loadSimulatorPackV1(): SimulatorPackEntry[] {
  const manifestPath = path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    cases: SimulatorManifestCase[];
  };

  return manifest.cases.map((entry) => {
    const caseDir = path.join(SIMULATOR_PACK_V1_ROOT, entry.caseId);
    const bundleTextPath = path.join(caseDir, "bundle-text.md");
    if (!fs.existsSync(bundleTextPath)) {
      throw new Error(`Missing bundle text: ${bundleTextPath}`);
    }
    return {
      manifest: entry,
      bundleTextPath,
      bundleText: fs.readFileSync(bundleTextPath, "utf8"),
    };
  });
}

export function simulatorPackCaseDir(caseId: string): string {
  return path.join(SIMULATOR_PACK_V1_ROOT, caseId);
}
