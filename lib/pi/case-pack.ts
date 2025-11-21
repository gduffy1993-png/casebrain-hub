import { format } from "date-fns";
import type {
  PiCaseRecord,
  PiMedicalReport,
  PiOffer,
  PiHearing,
  PiDisbursement,
} from "@/types";

type BaseCase = {
  id: string;
  title: string;
  summary: string | null;
  practice_area: string;
  created_at: string | null;
  updated_at: string | null;
};

type DeadlineRow = {
  id: string;
  title: string;
  due_date: string;
};

type TaskRow = {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
};

type CasePackInput = {
  caseRecord: BaseCase;
  piCase: PiCaseRecord | null;
  medicalReports: PiMedicalReport[];
  offers: PiOffer[];
  hearings: PiHearing[];
  disbursements: PiDisbursement[];
  deadlines: DeadlineRow[];
  tasks: TaskRow[];
};

export type PiCasePack = {
  case: BaseCase;
  piCase: PiCaseRecord | null;
  medicalReports: PiMedicalReport[];
  offers: PiOffer[];
  hearings: PiHearing[];
  disbursements: PiDisbursement[];
  deadlines: DeadlineRow[];
  tasks: TaskRow[];
  meta: {
    generatedAt: string;
    limitationSummary: string;
  };
  markdown: string;
  html: string;
};

export function buildPiCasePack(input: CasePackInput): PiCasePack {
  const generatedAt = new Date();
  const limitationSummary = input.piCase?.limitation_date
    ? `Limitation: ${format(new Date(input.piCase.limitation_date), "d MMM yyyy")}`
    : "Limitation date not recorded.";

  const markdown = renderMarkdown(input, generatedAt, limitationSummary);
  const html = `<html><body style="font-family: sans-serif; white-space: pre-wrap;">${markdownToHtml(
    markdown,
  )}</body></html>`;

  return {
    case: input.caseRecord,
    piCase: input.piCase,
    medicalReports: input.medicalReports,
    offers: input.offers,
    hearings: input.hearings,
    disbursements: input.disbursements,
    deadlines: input.deadlines,
    tasks: input.tasks,
    meta: {
      generatedAt: generatedAt.toISOString(),
      limitationSummary,
    },
    markdown,
    html,
  };
}

function renderMarkdown(input: CasePackInput, generatedAt: Date, limitationSummary: string) {
  const lines: string[] = [];
  lines.push(`# ${input.caseRecord.title}`);
  lines.push("");
  lines.push(`Generated: ${format(generatedAt, "d MMM yyyy HH:mm")}`);
  lines.push(`Practice area: ${input.caseRecord.practice_area}`);
  lines.push(limitationSummary);
  lines.push("");

  if (input.caseRecord.summary) {
    lines.push("## Case summary");
    lines.push(input.caseRecord.summary);
    lines.push("");
  }

  if (input.piCase) {
    lines.push("## PI metadata");
    lines.push(`- Case type: ${input.piCase.case_type}`);
    lines.push(`- Stage: ${input.piCase.stage}`);
    lines.push(`- Accident date: ${formatDate(input.piCase.accident_date)}`);
    lines.push(`- Date of knowledge: ${formatDate(input.piCase.date_of_knowledge)}`);
    lines.push(`- Limitation date: ${formatDate(input.piCase.limitation_date)}`);
    lines.push(
      `- Injury severity: ${input.piCase.injury_severity ? capitalise(input.piCase.injury_severity) : "Not recorded"}`,
    );
    lines.push(
      `- Employment status: ${input.piCase.employment_status ?? "Not recorded"}`,
    );
    lines.push(
      `- Loss of earnings estimate: ${formatCurrency(input.piCase.loss_of_earnings_estimate)}`,
    );
    lines.push(
      `- Special damages estimate: ${formatCurrency(input.piCase.special_damages_estimate)}`,
    );
    lines.push(
      `- General damages band: ${input.piCase.general_damages_band ?? "Not recorded"}`,
    );
    if (input.piCase.injury_description) {
      lines.push("");
      lines.push("### Injury description");
      lines.push(input.piCase.injury_description);
    }
    lines.push("");
  }

  lines.push(renderSection("Deadlines", input.deadlines, (deadline) => {
    return `- ${deadline.title} (${formatDate(deadline.due_date)})`;
  }));

  lines.push(renderSection("Tasks", input.tasks, (task) => {
    return `- ${task.title} [${task.status}]${task.due_at ? ` (due ${formatDate(task.due_at)})` : ""}`;
  }));

  lines.push(renderSection("Medical reports", input.medicalReports, (report) => {
    const parts = [
      report.expert_name ?? "Unnamed expert",
      report.specialism ?? "Specialism unknown",
      report.report_type ?? "Type not specified",
    ];
    const dates = [
      report.instruction_date ? `Instruction ${formatDate(report.instruction_date)}` : null,
      report.report_due_date ? `Due ${formatDate(report.report_due_date)}` : null,
      report.report_received_date ? `Received ${formatDate(report.report_received_date)}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    return `- ${parts.filter(Boolean).join(" – ")}${dates ? ` (${dates})` : ""}`;
  }));

  lines.push(renderSection("Offers", input.offers, (offer) => {
    const details = [
      offer.party === "claimant" ? "Claimant" : "Defendant",
      formatCurrency(offer.amount),
      `made ${formatDate(offer.date_made)}`,
      offer.deadline_to_respond ? `respond by ${formatDate(offer.deadline_to_respond)}` : null,
      `status: ${offer.status}`,
    ]
      .filter(Boolean)
      .join(" | ");
    return `- ${details}`;
  }));

  lines.push(renderSection("Hearings", input.hearings, (hearing) => {
    return `- ${hearing.hearing_type ?? "Hearing"} on ${formatDateTime(hearing.date)} at ${hearing.location ?? "TBC"}`;
  }));

  lines.push(renderSection("Disbursements", input.disbursements, (entry) => {
    const parts = [
      entry.category ?? "Expense",
      formatCurrency(entry.amount),
      entry.paid ? "Paid" : "Unpaid",
      entry.incurred_date ? `incurred ${formatDate(entry.incurred_date)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    return `- ${parts}`;
  }));

  return lines.filter((line) => line !== null).join("\n");
}

function renderSection<T>(
  title: string,
  items: T[],
  mapper: (item: T) => string,
) {
  if (!items.length) {
    return `## ${title}\n- None recorded`;
  }
  const lines = [`## ${title}`];
  items.forEach((item) => lines.push(mapper(item)));
  lines.push("");
  return lines.join("\n");
}

function formatDate(input: string | null | undefined) {
  if (!input) return "Not recorded";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return format(date, "d MMM yyyy");
}

function formatDateTime(input: string | null | undefined) {
  if (!input) return "Not recorded";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return format(date, "d MMM yyyy HH:mm");
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "£0";
  return `£${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function capitalise(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function markdownToHtml(markdown: string) {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) {
        return `<h1>${line.slice(2).trim()}</h1>`;
      }
      if (line.startsWith("## ")) {
        return `<h2>${line.slice(3).trim()}</h2>`;
      }
      if (line.startsWith("- ")) {
        return `<p>• ${line.slice(2)}</p>`;
      }
      if (line.trim() === "") {
        return "<br/>";
      }
      return `<p>${line}</p>`;
    })
    .join("\n");
}


