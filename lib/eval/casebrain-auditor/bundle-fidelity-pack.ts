import fs from "node:fs";
import path from "node:path";
import type { BundleFidelityTruthKey } from "./bundle-fidelity-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const GOLD_ROOT = path.join(REPO_ROOT, "docs", "bundle-fidelity-set", "gold");

function readTruthKey(filePath: string): BundleFidelityTruthKey {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as BundleFidelityTruthKey;
}

function collectTruthKeyFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      out.push(...collectTruthKeyFiles(full));
      continue;
    }
    if (name === "truth-key.json" || name.endsWith(".truth-key.json")) {
      out.push(full);
    }
  }
  return out;
}

export type BundleFidelityGoldEntry = {
  truthKey: BundleFidelityTruthKey;
  truthKeyPath: string;
  bundleTextPaths: string[];
};

function resolveMarkdownBundleDir(sourceRef: string): string {
  return path.isAbsolute(sourceRef) ? sourceRef : path.join(REPO_ROOT, sourceRef);
}

function loadMarkdownBundleText(sourceRef: string): string[] {
  const dir = resolveMarkdownBundleDir(sourceRef);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "00_README.md")
    .sort()
    .map((f) => path.join(dir, f));
}

export function loadGoldPack(): BundleFidelityGoldEntry[] {
  const keyFiles = collectTruthKeyFiles(GOLD_ROOT).sort();
  const entries: BundleFidelityGoldEntry[] = [];

  for (const truthKeyPath of keyFiles) {
    const truthKey = readTruthKey(truthKeyPath);
    let bundleTextPaths: string[] = [];

    if (truthKey.linkStatus === "linked-only" || truthKey.sourceType === "pilot-3-manifest") {
      entries.push({ truthKey, truthKeyPath, bundleTextPaths: [] });
      continue;
    }

    if (truthKey.sourceType === "markdown-bundle" && truthKey.sourceRef) {
      bundleTextPaths = loadMarkdownBundleText(truthKey.sourceRef);
    } else if (truthKey.sourceType === "single-text-file" && truthKey.sourceRef) {
      const file = path.isAbsolute(truthKey.sourceRef)
        ? truthKey.sourceRef
        : path.join(REPO_ROOT, truthKey.sourceRef);
      if (fs.existsSync(file)) bundleTextPaths = [file];
    } else {
      const dir = path.dirname(truthKeyPath);
      bundleTextPaths = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md") && f !== "00_README.md")
        .sort()
        .map((f) => path.join(dir, f));
    }

    entries.push({ truthKey, truthKeyPath, bundleTextPaths });
  }

  return entries;
}

export function readBundleText(bundleTextPaths: string[]): string {
  return bundleTextPaths
    .map((p) => fs.readFileSync(p, "utf8"))
    .join("\n\n");
}
