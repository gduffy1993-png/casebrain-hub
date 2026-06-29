import fs from "node:fs";
import path from "node:path";

import { auditSingleCase, buildAuditRun } from "./scoring";
import { defaultFixtures, loadFixture, type AuditFixture } from "./fixtures";
import type { AuditRunResult } from "./types";

export function runEvidenceStateAudit(fixtures: AuditFixture[] = defaultFixtures()): AuditRunResult {
  const cases = fixtures.map((fixture) => {
    const { truthKey, output } = loadFixture(fixture);
    return auditSingleCase(truthKey, output, fixture.kind);
  });

  return buildAuditRun(
    cases,
    fixtures.map((f) => f.id),
  );
}

export function writeAuditArtifacts(
  result: AuditRunResult,
  outDirRelative = "artifacts/casebrain-qa/evidence-state-audit",
): { jsonPath: string; mdPath: string } {
  const outDir = path.resolve(__dirname, "../../..", outDirRelative);
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "report.json");
  const mdPath = path.join(outDir, "REPORT.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, renderAuditMarkdown(result), "utf8");

  return { jsonPath, mdPath };
}

function pct(value: number | null): string {
  if (value === null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

export function renderAuditMarkdown(result: AuditRunResult): string {
  const m = result.metrics;
  const lines: string[] = [
    "# Evidence-State Accuracy Audit — controlled harness report",
    "",
    `> **${result.disclaimer}**`,
    "",
    `- Generated: ${result.generatedAt}`,
    `- Harness: ${result.harnessVersion}`,
    `- Fixtures: ${result.fixtureIds.join(", ") || "(none)"}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total cases | ${m.totalCases} |`,
    `| Total evidence items | ${m.totalEvidenceItems} |`,
    `| Matched items | ${m.matchedItems} |`,
    `| Unmatched items | ${m.unmatchedItems} |`,
    `| False-served count | ${m.falseServedCount} |`,
    `| False-served rate | ${pct(m.falseServedRate)} |`,
    `| Referred-only accuracy | ${pct(m.referredOnlyAccuracy)} |`,
    `| Missing accuracy | ${pct(m.missingAccuracy)} |`,
    `| Incomplete accuracy | ${pct(m.incompleteAccuracy)} |`,
    `| Not-safely-confirmed accuracy | ${pct(m.notSafelyConfirmedAccuracy)} |`,
    `| Unsafe reliance count | ${m.unsafeRelianceCount} |`,
    `| Unsafe reliance rate | ${pct(m.unsafeRelianceRate)} |`,
    `| Wrong-defendant bleed count | ${m.wrongDefendantBleedCount} |`,
    `| Wrong-defendant bleed rate | ${pct(m.wrongDefendantBleedRate)} |`,
    `| Chase accuracy | ${pct(m.chaseAccuracy)} |`,
    `| Over-cautious rate | ${pct(m.overCautiousRate)} |`,
    `| Blocking failures | ${result.blockingFailures.length} |`,
    `| Warnings | ${result.warnings.length} |`,
    "",
    "## Blocking failures",
    "",
  ];

  if (result.blockingFailures.length === 0) {
    lines.push("_None detected on this controlled run._");
  } else {
    for (const f of result.blockingFailures) {
      lines.push(`- **${f.code}** (${f.caseId}${f.truthItem ? ` · ${f.truthItem}` : ""}): ${f.message}`);
    }
  }

  lines.push("", "## Warnings", "");
  if (result.warnings.length === 0) {
    lines.push("_None._");
  } else {
    for (const w of result.warnings.slice(0, 50)) {
      lines.push(`- **${w.code}** (${w.caseId}${w.truthItem ? ` · ${w.truthItem}` : ""}): ${w.message}`);
    }
    if (result.warnings.length > 50) {
      lines.push(`- … and ${result.warnings.length - 50} more (see report.json)`);
    }
  }

  lines.push("", "## Per-case breakdown", "");
  for (const c of result.cases) {
    lines.push(`### ${c.caseId}${c.title ? ` — ${c.title}` : ""}`, "");
    lines.push(
      `- Items: ${c.metrics.evidenceItemCount} · matched ${c.metrics.matchedItems} · false-served ${c.metrics.falseServedCount} · blocking ${c.blockingFailures.length}`,
    );
    lines.push("", "| Truth item | Truth | Predicted | Match | Flags |", "|---|---|---|---|---|");
    for (const row of c.itemComparisons) {
      const flags = row.notes.join(", ") || "—";
      lines.push(
        `| ${row.truthItem} | ${row.truthState} | ${row.predictedState ?? "—"} | ${row.stateAccurate ? "yes" : "no"} | ${flags} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Limits",
    "",
    "- Controlled/simulator/proof fixtures only — not unseen real-world solicitor bundles.",
    "- `wrong_family_bleed_rate`, `court_note_safety_rate`, and `client_summary_safety_rate` are placeholders in v1.",
    "- Unmatched truth items reduce accuracy denominators only where predictions exist.",
    "",
  );

  return `${lines.join("\n")}\n`;
}
