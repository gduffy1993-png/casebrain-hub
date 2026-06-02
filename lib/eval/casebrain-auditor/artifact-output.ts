import fs from "node:fs";
import path from "node:path";
import type { AuditorMode, AuditorPackId } from "./types";

/** Stable latest folder name per pack/mode (e.g. full-960-discovery). */
export function latestPackSlug(pack: AuditorPackId, mode: AuditorMode): string {
  if (pack === "full-960" && mode === "discovery") return "full-960-discovery";
  return pack;
}

export type AuditorArtifactDirs = {
  artifactRoot: string;
  runDir: string;
  latestDir: string;
  latestSlug: string;
};

export function resolveArtifactDirs(
  artifactRoot: string,
  runId: string,
  pack: AuditorPackId,
  mode: AuditorMode,
): AuditorArtifactDirs {
  const latestSlug = latestPackSlug(pack, mode);
  return {
    artifactRoot,
    runDir: path.join(artifactRoot, "runs", runId),
    latestDir: path.join(artifactRoot, "latest", latestSlug),
    latestSlug,
  };
}

export function copyRunArtifactsToLatest(runDir: string, latestDir: string, fileNames: string[]): void {
  fs.mkdirSync(latestDir, { recursive: true });
  for (const name of fileNames) {
    const src = path.join(runDir, name);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(latestDir, name));
  }
}
