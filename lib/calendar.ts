import type { Task } from "@/types";

export function generateTaskICS({
  task,
  caseTitle,
}: {
  task: Task;
  caseTitle?: string | null;
}) {
  const dtStamp = new Date(task.created_at).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStart = task.due_at
    ? new Date(task.due_at).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : dtStamp;

  const summary = caseTitle ? `${caseTitle}: ${task.title}` : task.title;
  const description = task.description
    ? task.description.replace(/\n/g, "\\n")
    : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CaseBrain//Automation//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${task.id}@casebrain`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

