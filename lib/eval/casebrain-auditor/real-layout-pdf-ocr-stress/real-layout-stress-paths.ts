import fs from "node:fs";
import path from "node:path";
import { REAL_LAYOUT_STRESS_SLUG } from "./real-layout-stress-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..", "..");

export function realLayoutStressRepoRoot(): string {
  return REPO_ROOT;
}

export function realLayoutStressCacheRoot(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "cache", REAL_LAYOUT_STRESS_SLUG);
}

export function realLayoutStressReportDir(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "latest", REAL_LAYOUT_STRESS_SLUG);
}

export function realLayoutStressSampleDir(sampleId: string): string {
  return path.join(realLayoutStressCacheRoot(), "samples", sampleId);
}

export function realLayoutStressPdfPath(sampleId: string): string {
  return path.join(realLayoutStressSampleDir(sampleId), `${sampleId}.pdf`);
}

export function realLayoutStressFixturePath(sampleId: string): string {
  return path.join(realLayoutStressSampleDir(sampleId), `${sampleId}.layout-fixture.txt`);
}

export function realLayoutStressManifestPath(sampleId: string): string {
  return path.join(realLayoutStressSampleDir(sampleId), "manifest.json");
}

export function ensureRealLayoutStressDirs(): void {
  fs.mkdirSync(realLayoutStressCacheRoot(), { recursive: true });
  fs.mkdirSync(realLayoutStressReportDir(), { recursive: true });
}
