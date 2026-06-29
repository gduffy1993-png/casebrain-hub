/**
 * Load H4 simulator packs from disk (v1 locked + v1.1 supplement).
 */
import fs from "node:fs";
import path from "node:path";
import type { SimulatorManifestCase } from "./manifest-types";

export const SIMULATOR_PACK_V1_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v1");
export const SIMULATOR_PACK_V1_1_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v1.1");

export type SimulatorPackEntry = {
  manifest: SimulatorManifestCase;
  bundleTextPath: string;
  bundleText: string;
};

function loadPackFromManifest(
  manifestPath: string,
  packRoot: string,
): SimulatorPackEntry[] {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    cases: SimulatorManifestCase[];
  };

  return manifest.cases.map((entry) => {
    const caseDir = path.join(packRoot, entry.caseId);
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

export function loadSimulatorPackV1(): SimulatorPackEntry[] {
  return loadPackFromManifest(
    path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.json"),
    SIMULATOR_PACK_V1_ROOT,
  );
}

export function loadSimulatorPackV1_1(): SimulatorPackEntry[] {
  return loadPackFromManifest(
    path.join(process.cwd(), "docs", "h4", "simulator-manifest.v1.1.json"),
    SIMULATOR_PACK_V1_1_ROOT,
  );
}

export function simulatorPackCaseDir(caseId: string, supplement = false): string {
  return path.join(supplement ? SIMULATOR_PACK_V1_1_ROOT : SIMULATOR_PACK_V1_ROOT, caseId);
}
