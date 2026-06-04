import fs from "node:fs";
import path from "node:path";
import type {
  ExplanationBlock,
  ExplanationFidelityCaseResult,
  ExplanationFidelitySection,
  ExplanationFidelitySummary,
  ContradictionBlock,
} from "./explanation-fidelity-types";
import { EXPLANATION_FIDELITY_SLUG } from "./explanation-fidelity-types";
import { BUNDLE_FIDELITY_SLUG } from "./bundle-fidelity-types";

const SECTION_FILES: Record<ExplanationFidelitySection["key"], string> = {
  "missing-material": "missing-material.md",
  contradictions: "contradictions.md",
  "custody-interview": "custody-interview.md",
  "disclosure-dependencies": "disclosure-dependencies.md",
};

function formatBlock(block: ExplanationBlock, index: number): string[] {
  return [
    `### ${index + 1}. ${block.issue}`,
    "",
    `- **sourceSection:** ${block.sourceSection}`,
    `- **status:** ${block.status}`,
    `- **confidenceTag:** ${block.confidenceTag}`,
    "",
    "**sourceBasis**",
    "",
    block.sourceBasis || "_(empty — generator pending)_",
    "",
    "**whyItMatters**",
    "",
    block.whyItMatters || "_(empty — generator pending)_",
    "",
    "**safeNextAction**",
    "",
    block.safeNextAction || "_(empty — generator pending)_",
    "",
    "**doNotOverstate**",
    "",
    block.doNotOverstate || "_(empty — generator pending)_",
    "",
  ];
}

function formatContradiction(block: ContradictionBlock, index: number): string[] {
  return [
    ...formatBlock(block, index),
    `- **sourceA:** ${block.sourceA}`,
    `- **sourceB:** ${block.sourceB}`,
    `- **reconciliationStatus:** ${block.reconciliationStatus}`,
    "",
  ];
}

function renderSectionMarkdown(section: ExplanationFidelitySection): string {
  const lines = [`# ${section.title}`, ""];
  if (!section.blocks.length && !section.contradictions.length) {
    lines.push("_No blocks yet (Phase 3.5a scaffold — generator not wired)._", "");
    return lines.join("\n");
  }
  for (const [i, b] of section.blocks.entries()) {
    lines.push(...formatBlock(b, i));
  }
  for (const [i, b] of section.contradictions.entries()) {
    lines.push(...formatContradiction(b, i));
  }
  return lines.join("\n");
}

export function defaultExplanationFidelityOutDir(): string {
  return path.join(
    process.cwd(),
    "artifacts",
    "casebrain-auditor",
    "latest",
    BUNDLE_FIDELITY_SLUG,
    EXPLANATION_FIDELITY_SLUG,
  );
}

export function explanationFidelityOutDirForPack(pack: "gold" | "local"): string {
  const base = defaultExplanationFidelityOutDir();
  return pack === "local" ? path.join(base, "local") : base;
}

function writeCaseReports(caseDir: string, result: ExplanationFidelityCaseResult): void {
  fs.mkdirSync(caseDir, { recursive: true });
  for (const section of result.sections) {
    const fileName = SECTION_FILES[section.key];
    fs.writeFileSync(path.join(caseDir, fileName), renderSectionMarkdown(section), "utf8");
  }
  fs.writeFileSync(path.join(caseDir, "case-summary.json"), JSON.stringify(result, null, 2), "utf8");
}

export function writeExplanationFidelityReport(summary: ExplanationFidelitySummary, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });

  for (const r of summary.results) {
    if (r.skipped) continue;
    writeCaseReports(path.join(outDir, "cases", r.bundleId), r);
  }

  const lines = [
    "# Explanation fidelity report",
    "",
    `Generated: ${summary.generatedAt}`,
    `Pack: ${summary.pack}`,
    `Phase: ${summary.phase}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total bundles | ${summary.total} |`,
    `| Runnable | ${summary.runnable} |`,
    `| Scaffolded (3.5a) | ${summary.scaffolded} |`,
    `| Passed | ${summary.passed} |`,
    `| Failed | ${summary.failed} |`,
    `| Needs review | ${summary.needsReview} |`,
    `| Skipped | ${summary.skipped} |`,
    "",
    "> Phase 3.5a: lane + report layout only. Generator and gold expectations arrive in 3.5b.",
    "",
    "## Cases",
    "",
  ];

  for (const r of summary.results) {
    lines.push(`### ${r.label}`, "");
    lines.push(`- **bundleId:** \`${r.bundleId}\``);
    lines.push(`- **linkStatus:** ${r.linkStatus}`);
    lines.push(`- **overall:** ${r.overall}`);
    if (r.skipped) lines.push(`- **skipped:** ${r.skipReason ?? "yes"}`);
    if (r.scaffoldNote) lines.push(`- **note:** ${r.scaffoldNote}`);
    lines.push(`- **bundleTextChars:** ${r.bundleTextChars}`);
    lines.push("");
  }

  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
}
