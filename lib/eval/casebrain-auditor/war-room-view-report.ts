import fs from "node:fs";
import path from "node:path";
import type { WarRoomViewCaseResult, WarRoomViewSummary } from "./war-room-view-types";
import { STRATEGY_FIDELITY_SLUG, WAR_ROOM_VIEW_SLUG } from "./war-room-view-types";

export function defaultWarRoomViewOutDir(): string {
  return path.join(
    process.cwd(),
    "artifacts",
    "casebrain-auditor",
    "latest",
    STRATEGY_FIDELITY_SLUG,
    WAR_ROOM_VIEW_SLUG,
  );
}

export function warRoomViewOutDirForPack(pack: "gold" | "local"): string {
  const base = defaultWarRoomViewOutDir();
  return pack === "local" ? path.join(base, "local") : base;
}

function writeCaseReport(caseDir: string, result: WarRoomViewCaseResult): void {
  fs.mkdirSync(caseDir, { recursive: true });
  const lines = [
    `# War Room view — ${result.label}`,
    "",
    `- **bundleId:** \`${result.bundleId}\``,
    `- **charge:** ${result.charge}`,
    `- **stage:** ${result.stage ?? "—"}`,
    `- **offenceLens:** ${result.offenceLens}`,
    `- **overall:** ${result.overall}`,
    `- **solicitorReviewRequired:** ${result.solicitorReviewRequired}`,
    result.solicitorReviewReasons.length
      ? `- **solicitorReviewReasons:** ${result.solicitorReviewReasons.join("; ")}`
      : "",
    "",
    "## Safe hearing line",
    "",
    result.safeHearingLine,
    "",
    "## Court record requests",
    "",
    ...(result.courtRecordRequests.length
      ? result.courtRecordRequests.slice(0, 12).map(
          (c) => `- **${c.request}** (\`${c.proofPointId}\`) — ${c.linkedIssue.slice(0, 80)}`,
        )
      : ["_None._"]),
    "",
    "## Disclosure timetable requests",
    "",
    ...(result.disclosureTimetableRequests.length
      ? result.disclosureTimetableRequests.slice(0, 12).map(
          (d) => `- ${d.request} (\`${d.proofPointId}\`)`,
        )
      : ["_None._"]),
    "",
    "## If Crown says X — safe defence response",
    "",
    ...(result.prosecutionResponsePoints.length
      ? result.prosecutionResponsePoints.map(
          (p) =>
            `- **Crown:** ${p.crownSays}\n  **Defence:** ${p.safeDefenceResponse} (\`${p.proofPointId}\`)`,
        )
      : ["_None._"]),
    "",
    "## Do not concede",
    "",
    ...(result.doNotConcede.length ? result.doNotConcede.map((d) => `- ${d}`) : ["_None._"]),
    "",
    "## Hearing risks",
    "",
    ...(result.hearingRisks.length ? result.hearingRisks.map((r) => `- ${r}`) : ["_None._"]),
    "",
    "## Next hearing actions",
    "",
    ...(result.nextHearingActions.length
      ? result.nextHearingActions.slice(0, 12).map(
          (a) => `- ${a.action} (\`${a.proofPointId}\`)`,
        )
      : ["_None._"]),
    "",
    "## Do not overstate",
    "",
    result.doNotOverstate,
    "",
  ].filter(Boolean);
  fs.writeFileSync(path.join(caseDir, "war-room-view.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(caseDir, "war-room-view.json"), JSON.stringify(result, null, 2), "utf8");
}

export function writeWarRoomViewReport(summary: WarRoomViewSummary, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const r of summary.results) {
    if (r.skipped) continue;
    writeCaseReport(path.join(outDir, "cases", r.bundleId), r);
  }

  const md = [
    "# War Room view fidelity report",
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
      (r) => `- **${r.bundleId}** — ${r.overall}${r.scaffoldNote ? ` — ${r.scaffoldNote}` : ""}`,
    ),
  ];
  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), md.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
}
