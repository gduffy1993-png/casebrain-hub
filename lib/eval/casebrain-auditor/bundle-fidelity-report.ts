import fs from "node:fs";
import path from "node:path";
import type { BundleFidelitySummary } from "./bundle-fidelity-types";
import { BUNDLE_FIDELITY_SLUG } from "./bundle-fidelity-types";

export function writeBundleFidelityReport(summary: BundleFidelitySummary, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });

  const lines = [
    "# Bundle fidelity report",
    "",
    `Generated: ${summary.generatedAt}`,
    `Pack: ${summary.pack}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Total bundles | ${summary.total} |`,
    `| Runnable | ${summary.runnable} |`,
    `| Passed | ${summary.passed} |`,
    `| Failed | ${summary.failed} |`,
    `| Needs review | ${summary.needsReview} |`,
    `| Skipped (linked-only) | ${summary.skipped} |`,
    "",
  ];

  for (const r of summary.results) {
    lines.push(`## ${r.label}`, "");
    lines.push(`- **bundleId:** \`${r.bundleId}\``);
    lines.push(`- **linkStatus:** ${r.linkStatus}`);
    lines.push(`- **overall:** ${r.overall}`);
    if (r.skipped) lines.push(`- **skipped:** ${r.skipReason ?? "yes"}`);
    lines.push("", "| Field | Status | Expected | Actual |", "|-------|--------|----------|--------|");
    for (const f of r.fields) {
      lines.push(`| ${f.field} | ${f.status} | ${f.expected.replace(/\|/g, "/")} | ${f.actual.replace(/\|/g, "/")} |`);
      if (f.message) lines.push(`- _${f.field}: ${f.message}_`);
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(outDir, "00-summary.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
}

export function defaultBundleFidelityOutDir(): string {
  return path.join(process.cwd(), "artifacts", "casebrain-auditor", "latest", BUNDLE_FIDELITY_SLUG);
}

export function bundleFidelityOutDirForPack(pack: "gold" | "local"): string {
  const base = defaultBundleFidelityOutDir();
  return pack === "local" ? path.join(base, "local") : base;
}
