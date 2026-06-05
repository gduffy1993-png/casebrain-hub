import { extractStressSamplePdf } from "./real-layout-stress-extract";
import { materialiseStressSample } from "./real-layout-stress-pdf-render";
import { listRealLayoutStressRecipes } from "./real-layout-stress-recipes";
import { scoreStressSample } from "./real-layout-stress-score";
import type { RealLayoutStressSummary } from "./real-layout-stress-types";
import {
  REAL_LAYOUT_STRESS_GENERATOR_VERSION,
  REAL_LAYOUT_STRESS_MAX_SLICE2,
} from "./real-layout-stress-types";

function rollupFingerprints(
  results: RealLayoutStressSummary["results"],
): Array<{ fingerprint: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of results) {
    for (const fp of r.fingerprints) {
      if (!fp.startsWith("fp:")) continue;
      counts.set(fp, (counts.get(fp) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([fingerprint, count]) => ({ fingerprint, count }))
    .sort((a, b) => b.count - a.count);
}

function byFamily(results: RealLayoutStressSummary["results"]) {
  const map = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of results) {
    const row = map.get(r.offenceFamily) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
    row.total++;
    row[r.overall]++;
    map.set(r.offenceFamily, row);
  }
  return [...map.entries()].map(([offenceFamily, v]) => ({ offenceFamily, ...v }));
}

function byLayoutTag(results: RealLayoutStressSummary["results"]) {
  const map = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of results) {
    for (const tag of r.layoutTags) {
      const row = map.get(tag) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
      row.total++;
      row[r.overall]++;
      map.set(tag, row);
    }
  }
  return [...map.entries()]
    .map(([layoutTag, v]) => ({ layoutTag, ...v }))
    .sort((a, b) => a.layoutTag.localeCompare(b.layoutTag));
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx]!;
}

function extractDistribution(results: RealLayoutStressSummary["results"]) {
  const chars = results.map((r) => r.extractChars).sort((a, b) => a - b);
  return {
    min: chars[0] ?? 0,
    max: chars[chars.length - 1] ?? 0,
    median: percentile(chars, 0.5),
    p25: percentile(chars, 0.25),
    p75: percentile(chars, 0.75),
  };
}

export async function runRealLayoutPdfOcrStress(options: {
  count: number;
  canary?: boolean;
}): Promise<RealLayoutStressSummary> {
  const count = Math.min(Math.max(1, options.count), REAL_LAYOUT_STRESS_MAX_SLICE2);
  const manifests = listRealLayoutStressRecipes(count);
  const results = [];

  for (const manifest of manifests) {
    await materialiseStressSample(manifest);
    const extracted = await extractStressSamplePdf(manifest.sampleId);
    const text = extracted.text;
    const scored = scoreStressSample(manifest, text);
    if (extracted.error && scored.extractChars === 0) {
      scored.overall = "fail";
      scored.failures.push(`extract error: ${extracted.error}`);
      scored.fingerprints.push("fp:extract-error");
    }
    results.push(scored);
  }

  const passed = results.filter((r) => r.overall === "pass").length;
  const weak = results.filter((r) => r.overall === "weak").length;
  const failed = results.filter((r) => r.overall === "fail").length;

  const deliberateTraps = results
    .filter((r) => r.trapOutcome?.expectedTier?.startsWith("deliberate"))
    .map((r) => ({
      sampleId: r.sampleId,
      tier: r.trapOutcome!.expectedTier!,
      overall: r.overall,
      expectedFingerprints: r.trapOutcome!.expectedFingerprints,
      actualFingerprints: r.trapOutcome!.actualFingerprints,
      trapMatched: r.trapOutcome!.trapMatched,
    }));

  return {
    generatedAt: new Date().toISOString(),
    generatorVersion: REAL_LAYOUT_STRESS_GENERATOR_VERSION,
    phase: "rlpdf-slice-2",
    count,
    canary: Boolean(options.canary),
    scored: results.length,
    passed,
    weak,
    failed,
    materialisationMode: "pdf-sampled",
    results,
    topFingerprints: rollupFingerprints(results),
    byFamily: byFamily(results),
    byLayoutTag: byLayoutTag(results),
    extractCharDistribution: extractDistribution(results),
    deliberateTraps,
  };
}
