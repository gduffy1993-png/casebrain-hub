/**
 * Append one autopilot slice to artifacts/casebrain-auditor/autopilot-sleep-report.md
 * Usage: npx tsx scripts/write-autopilot-sleep-slice.ts A "title" GREEN "check1|check2" "note1"
 */
import {
  appendAutopilotSliceReport,
  writeAutopilotBaselineLock,
} from "../lib/eval/casebrain-auditor/autopilot-sleep-report";

const [id, title, status, checksRaw = "", notesRaw = "", commit = ""] = process.argv.slice(2);
if (!id || !title || !status) {
  console.error("Usage: write-autopilot-sleep-slice.ts ID TITLE GREEN|RED|STOPPED [checks|sep] [notes|sep] [commit]");
  process.exit(1);
}

const now = new Date().toISOString();
const branch = "roadmap/autopilot";

if (id === "A-baseline") {
  const p = writeAutopilotBaselineLock(process.cwd(), {
    checkpointTag: "checkpoint-pre-autopilot-2026-06-03",
    mainHead: "3bcd1d7",
    branch,
  });
  console.log("Baseline lock:", p);
  process.exit(0);
}

const filePath = appendAutopilotSliceReport({
  id,
  title,
  status: status as "GREEN" | "RED" | "STOPPED",
  startedAt: now,
  finishedAt: now,
  branch,
  commit: commit || undefined,
  checks: checksRaw ? checksRaw.split("|") : [],
  notes: notesRaw ? notesRaw.split("|") : [],
});

console.log("Sleep report updated:", filePath);
