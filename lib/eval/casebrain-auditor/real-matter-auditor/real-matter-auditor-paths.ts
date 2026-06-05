import fs from "node:fs";
import path from "node:path";
import { REAL_MATTER_AUDITOR_SLUG } from "./real-matter-auditor-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..", "..");

export function realMatterAuditorRepoRoot(): string {
  return REPO_ROOT;
}

export function localRealMattersRoot(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "local-real-matters");
}

export function realMatterAuditorReportDir(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "latest", REAL_MATTER_AUDITOR_SLUG);
}

export function localMatterDir(localId: string): string {
  return path.join(localRealMattersRoot(), localId);
}

export function localManifestPath(localId: string): string {
  return path.join(localMatterDir(localId), "manifest.json");
}

export function localBundleTextPath(localId: string): string {
  return path.join(localMatterDir(localId), "bundle-text.md");
}

export function localBundlePdfPath(localId: string): string {
  return path.join(localMatterDir(localId), "bundle.pdf");
}

export function localHumanTruthPath(localId: string): string {
  return path.join(localMatterDir(localId), "human-truth.json");
}

export function committedManifestTemplatePath(): string {
  return path.join(REPO_ROOT, "docs", "real-matter-auditor", "manifest.template.json");
}

export function ensureRealMatterDirs(): void {
  fs.mkdirSync(localRealMattersRoot(), { recursive: true });
  fs.mkdirSync(realMatterAuditorReportDir(), { recursive: true });
}
