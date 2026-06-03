import fs from "node:fs";
import path from "node:path";

export type SleepReportSlice = {
  id: string;
  title: string;
  status: "GREEN" | "RED" | "STOPPED";
  startedAt: string;
  finishedAt: string;
  branch: string;
  commit?: string;
  checks: string[];
  notes: string[];
  productionGate?: string;
  topFingerprints?: string[];
};

const REPORT_REL = path.join("artifacts", "casebrain-auditor", "autopilot-sleep-report.md");

export function autopilotSleepReportPath(cwd = process.cwd()): string {
  return path.join(cwd, REPORT_REL);
}

function readExistingReport(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return [
      "# CaseBrain autopilot — sleep report",
      "",
      `_Branch: roadmap/autopilot — do not merge to main without review._`,
      "",
    ].join("\n");
  }
  return fs.readFileSync(filePath, "utf8");
}

export function appendAutopilotSliceReport(slice: SleepReportSlice, cwd = process.cwd()): string {
  const filePath = autopilotSleepReportPath(cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const lines = [
    readExistingReport(filePath).replace(/\n$/, ""),
    "",
    `## Slice ${slice.id} — ${slice.title}`,
    "",
    `- **Status:** ${slice.status}`,
    `- **Started:** ${slice.startedAt}`,
    `- **Finished:** ${slice.finishedAt}`,
    `- **Branch:** ${slice.branch}`,
  ];

  if (slice.commit) lines.push(`- **Commit:** \`${slice.commit}\``);
  if (slice.productionGate) lines.push(`- **Production gate (A+B):** ${slice.productionGate}`);

  if (slice.checks.length) {
    lines.push("", "### Checks", "");
    for (const c of slice.checks) lines.push(`- ${c}`);
  }

  if (slice.topFingerprints?.length) {
    lines.push("", "### Top fingerprints", "");
    for (const fp of slice.topFingerprints) lines.push(`- ${fp}`);
  }

  if (slice.notes.length) {
    lines.push("", "### Notes", "");
    for (const n of slice.notes) lines.push(`- ${n}`);
  }

  lines.push("");
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  return filePath;
}

export function writeAutopilotBaselineLock(
  cwd = process.cwd(),
  meta: { checkpointTag: string; mainHead: string; branch: string },
): string {
  const filePath = path.join(cwd, "artifacts", "casebrain-auditor", "autopilot-baseline-lock.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        lockedAt: new Date().toISOString(),
        checkpointTag: meta.checkpointTag,
        mainHeadAtStart: meta.mainHead,
        autopilotBranch: meta.branch,
        note: "Read-only baseline lock — not committed to git.",
      },
      null,
      2,
    ),
    "utf8",
  );
  return filePath;
}
