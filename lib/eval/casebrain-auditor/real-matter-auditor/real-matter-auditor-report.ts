import fs from "node:fs";
import path from "node:path";
import type { RealMatterAuditorSummary, RealMatterCaseResult } from "./real-matter-auditor-types";
import { ensureRealMatterDirs, realMatterAuditorReportDir } from "./real-matter-auditor-paths";

function rollupFingerprints(results: RealMatterCaseResult[]): Array<{ fingerprint: string; count: number }> {
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

function byOffenceFamily(results: RealMatterCaseResult[]) {
  const map = new Map<
    string,
    { total: number; pass: number; weak: number; fail: number; needsReview: number }
  >();
  for (const r of results) {
    const row = map.get(r.offenceFamily) ?? { total: 0, pass: 0, weak: 0, fail: 0, needsReview: 0 };
    row.total++;
    if (r.overall === "pass") row.pass++;
    else if (r.overall === "weak") row.weak++;
    else if (r.overall === "fail") row.fail++;
    else row.needsReview++;
    map.set(r.offenceFamily, row);
  }
  return [...map.entries()].map(([offenceFamily, v]) => ({ offenceFamily, ...v }));
}

function byDocumentType(results: RealMatterCaseResult[]) {
  const map = new Map<string, { total: number; pass: number; weak: number; fail: number }>();
  for (const r of results) {
    for (const c of r.checks) {
      if (!c.id.startsWith("doc.")) continue;
      const doc = c.id.slice(4);
      const row = map.get(doc) ?? { total: 0, pass: 0, weak: 0, fail: 0 };
      row.total++;
      if (r.overall === "pass") row.pass++;
      else if (r.overall === "weak") row.weak++;
      else if (r.overall === "fail") row.fail++;
      map.set(doc, row);
    }
  }
  return [...map.entries()].map(([documentType, v]) => ({ documentType, ...v }));
}

function weakFailCsv(results: RealMatterCaseResult[]): string {
  const header =
    "localId,anonymisedLabel,offenceFamily,holdout,overall,extractChars,metadataStatus,spineRan,fingerprints";
  const rows = results
    .filter((r) => r.overall !== "pass")
    .map((r) => {
      const fps = r.fingerprints.join("; ");
      return `"${r.localId}","${r.anonymisedLabel.replace(/"/g, '""')}",${r.offenceFamily},${r.holdout},${r.overall},${r.extractChars},${r.metadataStatus},${r.spineRan},"${fps}"`;
    });
  return [header, ...rows].join("\n");
}

function needsReviewCsv(results: RealMatterCaseResult[]): string {
  const header = "localId,anonymisedLabel,overall,metadataStatus,humanReviewRequired,fingerprints";
  const rows = results
    .filter((r) => r.overall === "needs_review" || r.overall === "uncertain" || r.humanReviewRequired)
    .map((r) => {
      const fps = r.fingerprints.join("; ");
      return `"${r.localId}","${r.anonymisedLabel.replace(/"/g, '""')}",${r.overall},${r.metadataStatus},${r.humanReviewRequired},"${fps}"`;
    });
  return [header, ...rows].join("\n");
}

function summaryMarkdown(summary: RealMatterAuditorSummary): string {
  return [
    "# Real-matter auditor summary (slice 1)",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Version | ${summary.version} |`,
    `| Pack | ${summary.pack} |`,
    `| Mode | ${summary.mode} |`,
    `| Matters listed | ${summary.matterCount} |`,
    `| Scored | ${summary.scored} |`,
    `| Holdout skipped | ${summary.skippedHoldout} |`,
    `| Pass | ${summary.passed} |`,
    `| Weak | ${summary.weak} |`,
    `| Fail | ${summary.failed} |`,
    `| Needs review | ${summary.needsReview} |`,
    "",
    "## Top fingerprints",
    "",
    ...(summary.topFingerprints.length
      ? summary.topFingerprints.map((f) => `- \`${f.fingerprint}\` — ${f.count}`)
      : ["_None_"]),
    "",
    "## Privacy",
    "",
    "- Reports contain localIds and anonymised labels only.",
    "- No bundle text, extract text, or client-identifying fields.",
    "",
  ].join("\n");
}

function fingerprintMarkdown(summary: RealMatterAuditorSummary): string {
  const lines = [
    "# Real-matter auditor — fingerprint rollup",
    "",
    `Scored: ${summary.scored} | Pass: ${summary.passed} | Weak: ${summary.weak} | Fail: ${summary.failed}`,
    "",
  ];
  for (const fp of summary.topFingerprints) {
    lines.push(`- \`${fp.fingerprint}\` — ${fp.count}`);
  }
  return lines.join("\n");
}

/** Safe summary JSON — no raw text fields. */
export function toSafeSummaryJson(summary: RealMatterAuditorSummary): Record<string, unknown> {
  return {
    generatedAt: summary.generatedAt,
    version: summary.version,
    pack: summary.pack,
    mode: summary.mode,
    matterCount: summary.matterCount,
    scored: summary.scored,
    skippedHoldout: summary.skippedHoldout,
    passed: summary.passed,
    weak: summary.weak,
    failed: summary.failed,
    needsReview: summary.needsReview,
    uncertain: summary.uncertain,
    topFingerprints: summary.topFingerprints,
    byOffenceFamily: summary.byOffenceFamily,
    byDocumentType: summary.byDocumentType,
    holdoutSummary: summary.holdoutSummary,
    strictTruthSummary: summary.strictTruthSummary,
    results: summary.results.map((r) => ({
      localId: r.localId,
      anonymisedLabel: r.anonymisedLabel,
      offenceFamily: r.offenceFamily,
      holdout: r.holdout,
      mode: r.mode,
      inputSource: r.inputSource,
      extractChars: r.extractChars,
      overall: r.overall,
      metadataStatus: r.metadataStatus,
      spineRan: r.spineRan,
      humanReviewRequired: r.humanReviewRequired,
      fingerprints: r.fingerprints,
      checkIds: r.checks.map((c) => ({ id: c.id, pass: c.pass })),
    })),
  };
}

export function writeRealMatterAuditorReport(summary: RealMatterAuditorSummary): string {
  ensureRealMatterDirs();
  const outDir = realMatterAuditorReportDir();
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), summaryMarkdown(summary), "utf8");
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(toSafeSummaryJson(summary), null, 2),
    "utf8",
  );
  fs.writeFileSync(path.join(outDir, "fingerprint-rollup.md"), fingerprintMarkdown(summary), "utf8");
  fs.writeFileSync(path.join(outDir, "weak-fail-cases.csv"), weakFailCsv(summary.results), "utf8");
  fs.writeFileSync(path.join(outDir, "needs-review.csv"), needsReviewCsv(summary.results), "utf8");
  fs.writeFileSync(
    path.join(outDir, "by-offence-family.json"),
    JSON.stringify(summary.byOffenceFamily, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "by-document-type.json"),
    JSON.stringify(summary.byDocumentType, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "holdout-summary.json"),
    JSON.stringify(summary.holdoutSummary, null, 2),
    "utf8",
  );
  if (summary.strictTruthSummary.length) {
    fs.writeFileSync(
      path.join(outDir, "strict-truth-summary.json"),
      JSON.stringify(summary.strictTruthSummary, null, 2),
      "utf8",
    );
  }

  return outDir;
}
