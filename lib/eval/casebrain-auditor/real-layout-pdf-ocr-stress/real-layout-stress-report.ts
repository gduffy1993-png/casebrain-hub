import fs from "node:fs";
import path from "node:path";
import type { RealLayoutStressSummary } from "./real-layout-stress-types";
import { realLayoutStressReportDir } from "./real-layout-stress-paths";

function weakFailCsv(summary: RealLayoutStressSummary): string {
  const header = "sampleId,seed,offenceFamily,layoutTags,overall,extractChars,failures,fingerprints";
  const rows = summary.results
    .filter((r) => r.overall !== "pass")
    .map((r) => {
      const tags = r.layoutTags.join("|");
      const failures = r.failures.join("; ").replace(/"/g, '""');
      const fps = r.fingerprints.join("; ");
      return `"${r.sampleId}",${r.seed},${r.offenceFamily},"${tags}",${r.overall},${r.extractChars},"${failures}","${fps}"`;
    });
  return [header, ...rows].join("\n");
}

function fingerprintMarkdown(summary: RealLayoutStressSummary): string {
  const lines = [
    "# Real-layout PDF/OCR stress — fingerprint rollup",
    "",
    `Generated: ${summary.generatedAt}`,
    `Scored: ${summary.scored} | Pass: ${summary.passed} | Weak: ${summary.weak} | Fail: ${summary.failed}`,
    "",
    "## Top fingerprints (group shared fixes here)",
    "",
  ];
  if (!summary.topFingerprints.length) {
    lines.push("_No failure fingerprints in this run._");
  } else {
    for (const fp of summary.topFingerprints) {
      lines.push(`- \`${fp.fingerprint}\` — ${fp.count} sample(s)`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function summaryMarkdown(summary: RealLayoutStressSummary): string {
  const lines = [
    "# Real-layout PDF/OCR stress summary (slice 1)",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Generator | ${summary.generatorVersion} |`,
    `| Phase | ${summary.phase} |`,
    `| Count | ${summary.count} |`,
    `| Canary | ${summary.canary} |`,
    `| Materialisation | ${summary.materialisationMode} |`,
    `| Scored | ${summary.scored} |`,
    `| Pass | ${summary.passed} |`,
    `| Weak | ${summary.weak} |`,
    `| Fail | ${summary.failed} |`,
    "",
    "## By offence family",
    "",
  ];
  for (const f of summary.byFamily) {
    lines.push(`- **${f.offenceFamily}**: ${f.total} — pass ${f.pass}, weak ${f.weak}, fail ${f.fail}`);
  }
  lines.push("", "## By layout tag (samples may carry multiple tags)", "");
  for (const t of summary.byLayoutTag) {
    lines.push(`- **${t.layoutTag}**: ${t.total} — pass ${t.pass}, weak ${t.weak}, fail ${t.fail}`);
  }
  lines.push("", "## Note", "", "- PDFs and extracts live under gitignored `artifacts/casebrain-auditor/cache/real-layout-pdf-ocr-stress/`.", "- This lane is sampled layout stress — not 50k PDF OCR.", "");
  return lines.join("\n");
}

export function writeRealLayoutStressReport(summary: RealLayoutStressSummary): string {
  const outDir = realLayoutStressReportDir();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), summaryMarkdown(summary), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "fingerprint-rollup.md"), fingerprintMarkdown(summary), "utf8");
  fs.writeFileSync(path.join(outDir, "weak-fail-cases.csv"), weakFailCsv(summary), "utf8");
  return outDir;
}
