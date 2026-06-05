import {
  listLocalRealMatters,
  loadHumanTruth,
  loadLocalBundleText,
  loadLocalManifest,
} from "./real-matter-auditor-load";
import { ensureRealMatterDirs } from "./real-matter-auditor-paths";
import { writeRealMatterAuditorReport } from "./real-matter-auditor-report";
import { scoreRealMatterCase } from "./real-matter-auditor-score";
import type { RealMatterAuditorSummary, RealMatterCaseResult } from "./real-matter-auditor-types";
import { REAL_MATTER_AUDITOR_VERSION } from "./real-matter-auditor-types";

export type RunRealMatterAuditorOptions = {
  pack: "local";
  mode: "discovery" | "strict-truth";
  caseId?: string;
  limit?: number;
  offset?: number;
  includeHoldout?: boolean;
};

function countOverall(results: RealMatterCaseResult[]) {
  return {
    passed: results.filter((r) => r.overall === "pass").length,
    weak: results.filter((r) => r.overall === "weak").length,
    failed: results.filter((r) => r.overall === "fail").length,
    needsReview: results.filter((r) => r.overall === "needs_review").length,
    uncertain: results.filter((r) => r.overall === "uncertain").length,
  };
}

function rollupFingerprints(results: RealMatterCaseResult[]) {
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

export async function runRealMatterAuditor(
  options: RunRealMatterAuditorOptions,
): Promise<RealMatterAuditorSummary> {
  ensureRealMatterDirs();

  if (options.pack !== "local") {
    throw new Error("Only --pack local is supported in slice 1");
  }

  let entries = listLocalRealMatters();
  const matterCount = entries.length;

  const holdoutSummary = entries
    .filter((e) => e.holdout)
    .map((e) => ({
      localId: e.localId,
      anonymisedLabel: e.anonymisedLabel,
      note: options.includeHoldout
        ? "included in run (--include-holdout)"
        : "skipped in discovery — milestone only",
    }));

  if (options.caseId) {
    entries = entries.filter((e) => e.localId === options.caseId);
  } else if (!options.includeHoldout && options.mode === "discovery") {
    entries = entries.filter((e) => !e.holdout);
  }

  const offset = options.offset ?? 0;
  const limit = options.limit ?? entries.length;
  entries = entries.slice(offset, offset + limit);

  const results: RealMatterCaseResult[] = [];
  const strictTruthSummary: RealMatterAuditorSummary["strictTruthSummary"] = [];

  for (const entry of entries) {
    const manifest = loadLocalManifest(entry.localId);
    if (!manifest) continue;

    if (manifest.holdout && !options.includeHoldout && options.mode === "discovery") {
      results.push({
        localId: manifest.localId,
        anonymisedLabel: manifest.anonymisedLabel,
        offenceFamily: manifest.offenceFamily,
        holdout: true,
        mode: options.mode,
        inputSource: "none",
        extractChars: 0,
        overall: "skipped",
        metadataStatus: "uncertain",
        spineRan: false,
        checks: [],
        failures: [],
        fingerprints: ["fp:real-matter-holdout-skipped"],
        humanReviewRequired: false,
      });
      continue;
    }

    const humanTruth = loadHumanTruth(entry.localId);
    if (options.mode === "strict-truth" && !humanTruth) {
      results.push({
        localId: manifest.localId,
        anonymisedLabel: manifest.anonymisedLabel,
        offenceFamily: manifest.offenceFamily,
        holdout: Boolean(manifest.holdout),
        mode: options.mode,
        inputSource: "none",
        extractChars: 0,
        overall: "skipped",
        metadataStatus: "uncertain",
        spineRan: false,
        checks: [],
        failures: ["strict-truth: no human-truth.json"],
        fingerprints: ["fp:real-matter-no-truth-file"],
        humanReviewRequired: true,
      });
      continue;
    }

    const loaded = await loadLocalBundleText(entry.localId);
    const scored = scoreRealMatterCase(manifest, loaded.text, loaded.source, {
      mode: options.mode,
      humanTruth,
      extractError: loaded.extractError,
    });
    results.push(scored);

    if (options.mode === "strict-truth" && humanTruth) {
      const matched = scored.checks.filter((c) => c.id.startsWith("strict_") && c.pass).length;
      const total = scored.checks.filter((c) => c.id.startsWith("strict_")).length;
      strictTruthSummary.push({
        localId: manifest.localId,
        overall: scored.overall,
        matched,
        total,
      });
    }
  }

  const scoredResults = results.filter((r) => r.overall !== "skipped");
  const counts = countOverall(scoredResults);
  const skippedHoldout = results.filter((r) => r.overall === "skipped" && r.holdout).length;

  const byFamilyMap = new Map<
    string,
    { total: number; pass: number; weak: number; fail: number; needsReview: number }
  >();
  for (const r of scoredResults) {
    const row = byFamilyMap.get(r.offenceFamily) ?? {
      total: 0,
      pass: 0,
      weak: 0,
      fail: 0,
      needsReview: 0,
    };
    row.total++;
    if (r.overall === "pass") row.pass++;
    else if (r.overall === "weak") row.weak++;
    else if (r.overall === "fail") row.fail++;
    else row.needsReview++;
    byFamilyMap.set(r.offenceFamily, row);
  }

  const byDocMap = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of scoredResults) {
    for (const c of r.checks) {
      if (!c.id.startsWith("doc.")) continue;
      const doc = c.id.slice(4);
      const row = byDocMap.get(doc) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
      row.total++;
      if (r.overall === "pass") row.pass++;
      else if (r.overall === "weak") row.weak++;
      else if (r.overall === "fail") row.fail++;
      byDocMap.set(doc, row);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    version: REAL_MATTER_AUDITOR_VERSION,
    pack: "local",
    mode: options.mode,
    matterCount,
    scored: scoredResults.length,
    skippedHoldout,
    ...counts,
    results,
    topFingerprints: rollupFingerprints(scoredResults),
    byOffenceFamily: [...byFamilyMap.entries()].map(([offenceFamily, v]) => ({
      offenceFamily,
      ...v,
    })),
    byDocumentType: [...byDocMap.entries()].map(([documentType, v]) => ({ documentType, ...v })),
    holdoutSummary,
    strictTruthSummary,
  };
}

export async function runAndWriteRealMatterAuditor(
  options: RunRealMatterAuditorOptions,
): Promise<{ summary: RealMatterAuditorSummary; reportDir: string }> {
  const summary = await runRealMatterAuditor(options);
  const reportDir = writeRealMatterAuditorReport(summary);
  return { summary, reportDir };
}
