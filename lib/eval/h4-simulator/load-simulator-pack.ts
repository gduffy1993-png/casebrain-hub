/**
 * Load H4 simulator packs from disk (v1 locked + v1.1 supplement).
 */
import fs from "node:fs";
import path from "node:path";
import type { SimulatorManifestCase } from "./manifest-types";

export const SIMULATOR_PACK_V1_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v1");
export const SIMULATOR_PACK_V1_1_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v1.1");
export const SIMULATOR_PACK_V2_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v2");
export const SIMULATOR_PACK_V3_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v3");
export const SIMULATOR_PACK_V4_ROOT = path.join(process.cwd(), "docs", "h4", "simulator-pack-v4");

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

export function loadSimulatorPackV2(): SimulatorPackEntry[] {
  return loadPackFromManifest(
    path.join(process.cwd(), "docs", "h4", "simulator-manifest.v2.json"),
    SIMULATOR_PACK_V2_ROOT,
  );
}

export function loadSimulatorPackV3(): SimulatorPackEntry[] {
  return loadPackFromManifest(
    path.join(process.cwd(), "docs", "h4", "simulator-manifest.v3.json"),
    SIMULATOR_PACK_V3_ROOT,
  );
}

export function loadSimulatorPackV4(): SimulatorPackEntry[] {
  return loadPackFromManifest(
    path.join(process.cwd(), "docs", "h4", "simulator-manifest.v4.json"),
    SIMULATOR_PACK_V4_ROOT,
  );
}

export function loadSimulatorPackAll(): SimulatorPackEntry[] {
  return [
    ...loadSimulatorPackV1(),
    ...loadSimulatorPackV1_1(),
    ...loadSimulatorPackV2(),
    ...loadSimulatorPackV3(),
    ...loadSimulatorPackV4(),
  ];
}

export function simulatorPackCaseDir(
  caseId: string,
  pack: "v1" | "v1.1" | "v2" | "v3" | "v4" = "v1",
): string {
  const root =
    pack === "v4"
      ? SIMULATOR_PACK_V4_ROOT
      : pack === "v3"
        ? SIMULATOR_PACK_V3_ROOT
        : pack === "v2"
          ? SIMULATOR_PACK_V2_ROOT
          : pack === "v1.1"
            ? SIMULATOR_PACK_V1_1_ROOT
            : SIMULATOR_PACK_V1_ROOT;
  return path.join(root, caseId);
}
