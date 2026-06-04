import fs from "node:fs";
import path from "node:path";
import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import type { BundleFidelityTruthKey } from "./bundle-fidelity-types";

/** Gitignored root for real PDFs and client truth keys — never commit. */
export function defaultLocalBundleFidelityRoot(): string {
  return path.join(process.cwd(), "artifacts", "bundle-fidelity-local");
}

export function localCasesRoot(): string {
  return path.join(defaultLocalBundleFidelityRoot(), "cases");
}

function readTruthKey(filePath: string): BundleFidelityTruthKey {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as BundleFidelityTruthKey;
}

function resolveBundleTextPaths(caseDir: string): { paths: string[]; pdfOnly: boolean } {
  const preferred = ["bundle-text.md", "bundle-text.txt"];
  for (const name of preferred) {
    const p = path.join(caseDir, name);
    if (fs.existsSync(p)) return { paths: [p], pdfOnly: false };
  }

  const mdFiles = fs
    .readdirSync(caseDir)
    .filter((f) => f.endsWith(".md") && !/^README/i.test(f))
    .sort()
    .map((f) => path.join(caseDir, f));

  if (mdFiles.length) return { paths: mdFiles, pdfOnly: false };

  const hasPdf = fs.readdirSync(caseDir).some((f) => f.toLowerCase().endsWith(".pdf"));
  return { paths: [], pdfOnly: hasPdf };
}

export type LocalPackLoadResult = {
  entries: BundleFidelityGoldEntry[];
  warnings: string[];
};

export function loadLocalPack(): LocalPackLoadResult {
  const root = localCasesRoot();
  const warnings: string[] = [];

  if (!fs.existsSync(root)) {
    warnings.push(
      `Local cases folder missing: ${root}. Create it and add case subfolders (see docs/bundle-fidelity-set/local/README.md).`,
    );
    return { entries: [], warnings };
  }

  const caseDirs = fs
    .readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort();

  if (!caseDirs.length) {
    warnings.push(`No case folders under ${root}. Add e.g. cases/my-case-001/truth-key.json`);
    return { entries: [], warnings };
  }

  const entries: BundleFidelityGoldEntry[] = [];

  for (const caseDir of caseDirs) {
    const truthKeyPath = path.join(caseDir, "truth-key.json");
    if (!fs.existsSync(truthKeyPath)) {
      warnings.push(`Skip ${caseDir}: no truth-key.json`);
      continue;
    }

    const truthKey = readTruthKey(truthKeyPath);
    if (truthKey.fictional !== false) {
      warnings.push(`Warning: ${truthKey.bundleId}: set "fictional": false for real local bundles.`);
    }

    const { paths, pdfOnly } = resolveBundleTextPaths(caseDir);
    if (!paths.length) {
      if (pdfOnly) {
        warnings.push(
          `${truthKey.bundleId}: PDF on disk only — paste extract to bundle-text.md (runner does not read PDF in slice 3).`,
        );
      } else {
        warnings.push(`${truthKey.bundleId}: no bundle-text.md — add pasted bundle text to run.`);
      }
    }

    entries.push({
      truthKey: { ...truthKey, linkStatus: paths.length ? "runnable" : "placeholder", sourceType: "linked-external" },
      truthKeyPath,
      bundleTextPaths: paths,
    });
  }

  return { entries, warnings };
}
