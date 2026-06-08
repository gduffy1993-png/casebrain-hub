import fs from "node:fs";
import path from "node:path";
import type { ProofMapCaseResult, ProofMapSummary } from "./proof-map-types";
import { PROOF_MAP_SLUG, STRATEGY_FIDELITY_SLUG } from "./proof-map-types";

export function defaultProofMapOutDir(): string {
  return path.join(
    process.cwd(),
    "artifacts",
    "casebrain-auditor",
    "latest",
    STRATEGY_FIDELITY_SLUG,
    PROOF_MAP_SLUG,
  );
}

export function proofMapOutDirForPack(pack: "gold" | "local"): string {
  const base = defaultProofMapOutDir();
  return pack === "local" ? path.join(base, "local") : base;
}

function renderProofPoint(p: ProofMapCaseResult["proofPoints"][0], index: number): string[] {
  return [
    `### ${index + 1}. ${p.label} (\`${p.id}\`)`,
    "",
    `- **crownMustProve:** ${p.crownMustProve}`,
    `- **confidenceTag:** ${p.confidenceTag}`,
    `- **humanReviewRequired:** ${p.humanReviewRequired}`,
    `- **sourceSection:** ${p.sourceSection}`,
    `- **doNotOverstate:** ${p.doNotOverstate}`,
    "",
    "**sourceBasis**",
    "",
    p.sourceBasis,
    "",
  ];
}

function renderLink(l: ProofMapCaseResult["links"][0], index: number): string[] {
  return [
    `### ${index + 1}. ${l.label}`,
    "",
    `- **proofPointId:** \`${l.proofPointId}\``,
    `- **linkType:** ${l.linkType}`,
    `- **status:** ${l.status}`,
    `- **confidenceTag:** ${l.confidenceTag}`,
    `- **sourceSection:** ${l.sourceSection}`,
    `- **doNotOverstate:** ${l.doNotOverstate}`,
    l.routeImpact ? `- **routeImpact:** ${l.routeImpact}` : "",
    l.disclosureChase ? `- **disclosureChase:** ${l.disclosureChase}` : "",
    l.safeHearingAction ? `- **safeHearingAction:** ${l.safeHearingAction}` : "",
    "",
    "**sourceBasis**",
    "",
    l.sourceBasis,
    "",
  ].filter(Boolean);
}

function writeCaseReport(caseDir: string, result: ProofMapCaseResult): void {
  fs.mkdirSync(caseDir, { recursive: true });
  const lines = [
    `# Proof Map — ${result.label}`,
    "",
    `- **bundleId:** \`${result.bundleId}\``,
    `- **charge:** ${result.charge}`,
    `- **stage:** ${result.stage ?? "—"}`,
    `- **offenceLens:** ${result.offenceLens}`,
    `- **overall:** ${result.overall}`,
    `- **humanReviewRequired:** ${result.humanReviewRequired}`,
    result.humanReviewReasons.length ? `- **humanReviewReasons:** ${result.humanReviewReasons.join("; ")}` : "",
    "",
    "## Proof points",
    "",
    ...result.proofPoints.flatMap((p, i) => renderProofPoint(p, i)),
    "## Links (evidence dependency graph)",
    "",
    ...(result.links.length
      ? result.links.flatMap((l, i) => renderLink(l, i))
      : ["_No links generated._", ""]),
  ];
  fs.writeFileSync(path.join(caseDir, "proof-map.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(caseDir, "proof-map.json"), JSON.stringify(result, null, 2), "utf8");
}

export function writeProofMapReport(summary: ProofMapSummary, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const r of summary.results) {
    if (r.skipped) continue;
    writeCaseReport(path.join(outDir, "cases", r.bundleId), r);
  }

  const md = [
    "# Proof Map fidelity report",
    "",
    `Generated: ${summary.generatedAt}`,
    `Pack: ${summary.pack}`,
    `Phase: ${summary.phase}`,
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total | ${summary.total} |`,
    `| Runnable | ${summary.runnable} |`,
    `| Passed | ${summary.passed} |`,
    `| Failed | ${summary.failed} |`,
    `| Needs review | ${summary.needsReview} |`,
    `| Skipped | ${summary.skipped} |`,
    "",
    "## Cases",
    "",
    ...summary.results.map(
      (r) =>
        `- **${r.bundleId}** — ${r.overall}${r.scaffoldNote ? ` — ${r.scaffoldNote}` : ""}`,
    ),
  ];
  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), md.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
}
