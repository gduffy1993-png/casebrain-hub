import fs from "node:fs";
import path from "node:path";
import type { BattleboardViewCaseResult, BattleboardViewSummary } from "./battleboard-view-types";
import { BATTLEBOARD_VIEW_SLUG, STRATEGY_FIDELITY_SLUG } from "./battleboard-view-types";

export function defaultBattleboardViewOutDir(): string {
  return path.join(
    process.cwd(),
    "artifacts",
    "casebrain-auditor",
    "latest",
    STRATEGY_FIDELITY_SLUG,
    BATTLEBOARD_VIEW_SLUG,
  );
}

export function battleboardViewOutDirForPack(pack: "gold" | "local"): string {
  const base = defaultBattleboardViewOutDir();
  return pack === "local" ? path.join(base, "local") : base;
}

function writeCaseReport(caseDir: string, result: BattleboardViewCaseResult): void {
  fs.mkdirSync(caseDir, { recursive: true });
  const lines = [
    `# Battleboard view — ${result.label}`,
    "",
    `- **bundleId:** \`${result.bundleId}\``,
    `- **charge:** ${result.charge}`,
    `- **stage:** ${result.stage ?? "—"}`,
    `- **offenceLens:** ${result.offenceLens}`,
    `- **overall:** ${result.overall}`,
    `- **humanReviewRequired:** ${result.humanReviewRequired}`,
    result.humanReviewReasons.length
      ? `- **humanReviewReasons:** ${result.humanReviewReasons.join("; ")}`
      : "",
    "",
    "## Primary route",
    "",
    result.primaryRoute,
    "",
    "## Why route is live",
    "",
    result.whyRouteIsLive,
    "",
    "## Proof points attacked / pressured",
    "",
    ...(result.proofPointsAttacked.length
      ? result.proofPointsAttacked.map(
          (p) => `- **${p.label}** (\`${p.id}\`) — ${p.pressureLinkCount} pressure link(s)`,
        )
      : ["_None._"]),
    "",
    "## Evidence helping defence",
    "",
    ...(result.evidenceHelpingDefence.length
      ? result.evidenceHelpingDefence.slice(0, 20).map(
          (e) =>
            `- **${e.label}** → \`${e.proofPointId}\` (${e.linkType}) — ${e.doNotOverstate.slice(0, 120)}`,
        )
      : ["_None._"]),
    "",
    "## Evidence hurting defence",
    "",
    ...(result.evidenceHurtingDefence.length
      ? result.evidenceHurtingDefence.slice(0, 15).map(
          (e) => `- **${e.label}** → \`${e.proofPointId}\` (${e.linkType})`,
        )
      : ["_None._"]),
    "",
    "## Missing material",
    "",
    ...(result.missingMaterial.length
      ? result.missingMaterial.slice(0, 20).map((e) => `- ${e.label} → \`${e.proofPointId}\``)
      : ["_None._"]),
    "",
    "## Contradictions",
    "",
    ...(result.contradictions.length
      ? result.contradictions.map((e) => `- ${e.label} → \`${e.proofPointId}\``)
      : ["_None._"]),
    "",
    "## Collapse risks",
    "",
    ...(result.collapseRisks.length ? result.collapseRisks.map((r) => `- ${r}`) : ["_None._"]),
    "",
    "## Route-change triggers",
    "",
    ...(result.routeChangeTriggers.length
      ? result.routeChangeTriggers.map((t) => `- ${t}`)
      : ["_None._"]),
    "",
    "## Disclosure chase priorities",
    "",
    ...(result.disclosureChasePriorities.length
      ? result.disclosureChasePriorities.slice(0, 12).map(
          (d) =>
            `- **${d.label}** (\`${d.proofPointId}\`)${d.disclosureChase ? ` — ${d.disclosureChase}` : ""}`,
        )
      : ["_None._"]),
    "",
    "## Safe next action",
    "",
    result.safeNextAction,
    "",
    "## Do not overstate",
    "",
    result.doNotOverstateWarning,
    "",
  ].filter(Boolean);
  fs.writeFileSync(path.join(caseDir, "battleboard-view.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(
    path.join(caseDir, "battleboard-view.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );
}

export function writeBattleboardViewReport(summary: BattleboardViewSummary, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const r of summary.results) {
    if (r.skipped) continue;
    writeCaseReport(path.join(outDir, "cases", r.bundleId), r);
  }

  const md = [
    "# Battleboard view fidelity report",
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
