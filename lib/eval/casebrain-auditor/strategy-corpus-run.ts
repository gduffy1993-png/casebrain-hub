import fs from "node:fs";
import path from "node:path";
import { generateManifestBatch } from "./strategy-corpus-manifest";
import { renderCorpusBundleText } from "./strategy-corpus-render";
import { scoreCorpusCase } from "./strategy-corpus-score";
import {
  assignStratifiedSplits,
  countSplits,
} from "./strategy-corpus-split";
import type {
  CorpusCaseScore,
  MaterialisationMode,
  StrategyCorpusManifest,
  StrategyCorpusSplit,
  StrategyCorpusSummary,
} from "./strategy-corpus-types";
import {
  STRATEGY_CORPUS_GENERATOR_VERSION,
  STRATEGY_CORPUS_PHASE,
} from "./strategy-corpus-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

export function strategyCorpusCacheDir(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "cache", "strategy-corpus");
}

export function strategyCorpusReportDir(): string {
  return path.join(REPO_ROOT, "artifacts", "casebrain-auditor", "latest", "strategy-corpus");
}

function writeBundleTextCache(manifest: StrategyCorpusManifest, text: string): void {
  const dir = path.join(strategyCorpusCacheDir(), "text");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${manifest.caseId}.md`), text, "utf8");
  fs.writeFileSync(
    path.join(strategyCorpusCacheDir(), "manifests", `${manifest.caseId}.json`),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
}

function rollupFingerprints(results: CorpusCaseScore[]): { fingerprint: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const fp of r.fingerprints) {
      if (!fp.startsWith("family:") && !fp.startsWith("tag:") && !fp.startsWith("source:")) {
        counts.set(fp, (counts.get(fp) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([fingerprint, count]) => ({ fingerprint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

export type RunStrategyCorpusOptions = {
  count: number;
  split: StrategyCorpusSplit | "all";
  canary?: boolean;
  materialisationMode?: MaterialisationMode;
  writeCache?: boolean;
};

export function runStrategyCorpus(options: RunStrategyCorpusOptions): {
  summary: StrategyCorpusSummary;
  manifests: StrategyCorpusManifest[];
} {
  const {
    count,
    split,
    canary = false,
    materialisationMode = "text-rendered",
    writeCache = true,
  } = options;

  fs.mkdirSync(path.join(strategyCorpusCacheDir(), "manifests"), { recursive: true });

  let manifests = generateManifestBatch(count, "all", materialisationMode);

  if (split === "all") {
    manifests = assignStratifiedSplits(manifests);
  } else {
    manifests = manifests.map((m) => ({
      ...m,
      split,
      splitFrozen: split === "holdout",
      tuneAllowed: split !== "holdout",
    }));
  }

  const allManifestsForSplitCounts = assignStratifiedSplits(
    generateManifestBatch(split === "all" ? count : 1000, "all", materialisationMode),
  );

  const results: CorpusCaseScore[] = [];

  for (const manifest of manifests) {
    const bundleText = renderCorpusBundleText(manifest);
    if (writeCache) writeBundleTextCache(manifest, bundleText);
    results.push(scoreCorpusCase(manifest, bundleText));
  }

  const passed = results.filter((r) => r.overall === "pass").length;
  const weak = results.filter((r) => r.overall === "weak").length;
  const failed = results.filter((r) => r.overall === "fail").length;

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      phase: STRATEGY_CORPUS_PHASE,
      generatorVersion: STRATEGY_CORPUS_GENERATOR_VERSION,
      count,
      splitFilter: split,
      canary,
      materialisationMode,
      splitCounts: countSplits(allManifestsForSplitCounts),
      scored: results.length,
      passed,
      weak,
      failed,
      holdoutFrozen: true,
      topFingerprints: rollupFingerprints(results),
      byFamily: summarizeByFamily(results),
      byFailureMode: summarizeByTags(results),
      results,
    },
    manifests,
  };
}

function summarizeByFamily(results: CorpusCaseScore[]) {
  const map = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of results) {
    const cur = map.get(r.offenceFamily) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
    cur.total++;
    if (r.overall === "pass") cur.pass++;
    else if (r.overall === "weak") cur.weak++;
    else cur.fail++;
    map.set(r.offenceFamily, cur);
  }
  return [...map.entries()].map(([offenceFamily, s]) => ({ offenceFamily: offenceFamily as StrategyCorpusSummary["byFamily"][0]["offenceFamily"], ...s }));
}

function summarizeByTags(results: CorpusCaseScore[]) {
  const map = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of results) {
    for (const tag of r.failureModeTags) {
      const cur = map.get(tag) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
      cur.total++;
      if (r.overall === "pass") cur.pass++;
      else if (r.overall === "weak") cur.weak++;
      else cur.fail++;
      map.set(tag, cur);
    }
  }
  return [...map.entries()]
    .map(([tag, s]) => ({ tag: tag as StrategyCorpusSummary["byFailureMode"][0]["tag"], ...s }))
    .sort((a, b) => b.total - a.total);
}

export function holdoutSummaryFrom(full: StrategyCorpusSummary): Pick<
  StrategyCorpusSummary,
  "splitCounts" | "passed" | "weak" | "failed" | "scored" | "topFingerprints" | "results"
> {
  const holdout = full.results.filter((r) => r.split === "holdout");
  return {
    splitCounts: { discovery: 0, validation: 0, holdout: holdout.length },
    scored: holdout.length,
    passed: holdout.filter((r) => r.overall === "pass").length,
    weak: holdout.filter((r) => r.overall === "weak").length,
    failed: holdout.filter((r) => r.overall === "fail").length,
    topFingerprints: rollupFingerprints(holdout),
    results: holdout,
  };
}
