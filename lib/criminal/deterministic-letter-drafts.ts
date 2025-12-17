import { normalizePracticeArea } from "@/lib/types/casebrain";

export type CriminalLetterKind = "client_update" | "disclosure_chase";

export type CriminalLetterInputs = {
  caseTitle: string;
  practiceArea?: string | null;
  defendantName?: string | null;
  courtName?: string | null;
  nextHearingDate?: string | null; // ISO
  nextHearingType?: string | null;
  bailStatus?: string | null;
  charges: Array<{ offence: string; section?: string | null; charge_date?: string | null; status?: string | null }>;
  disclosure: {
    missingItems?: string[] | null;
    disclosureDeadline?: string | null; // date (YYYY-MM-DD) or ISO
    issues?: string[] | null;
  } | null;
  pace: {
    breachesDetected?: string[] | null;
    breachSeverity?: string | null;
  } | null;
  notes?: string | null; // user-provided, appended
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function listOrUnknown(items: string[] | null | undefined, prefix = "- "): string {
  const filtered = (items ?? []).map((x) => String(x).trim()).filter(Boolean);
  if (filtered.length === 0) return `${prefix}Not evidenced in the bundle yet.`;
  return filtered.map((x) => `${prefix}${x}`).join("\n");
}

function chargesBlock(charges: CriminalLetterInputs["charges"]): string {
  if (!charges || charges.length === 0) return "Charges: Not evidenced in the bundle yet.";
  const top = charges.slice(0, 4).map((c) => {
    const sec = c.section ? ` (${c.section})` : "";
    return `- ${c.offence}${sec}`;
  });
  return `Charges (as currently evidenced):\n${top.join("\n")}`;
}

export function buildCriminalLetterDraft(kind: CriminalLetterKind, input: CriminalLetterInputs): { subject: string; body: string } {
  const practice = normalizePracticeArea(input.practiceArea ?? undefined);
  const caseRef = input.caseTitle ? `Re: ${input.caseTitle}` : "Re: Criminal matter";
  const defendantLine = input.defendantName ? `Defendant: ${input.defendantName}` : "Defendant: Not evidenced in the bundle yet";
  const hearingLine =
    input.nextHearingDate
      ? `Next hearing: ${formatDateShort(input.nextHearingDate)}${input.nextHearingType ? ` (${input.nextHearingType})` : ""}`
      : "Next hearing: Not evidenced in the bundle yet";

  if (practice !== "criminal") {
    // Safety: this generator is for criminal only.
    return {
      subject: caseRef,
      body: `${caseRef}\n\nThis draft is only available for criminal defence matters.`,
    };
  }

  if (kind === "client_update") {
    const subject = `${caseRef} — update and next steps`;
    const body = [
      caseRef,
      "",
      `Dear ${input.defendantName ?? "Client"},`,
      "",
      "Update on your case (based on the documents currently on file):",
      "",
      `${defendantLine}`,
      `${hearingLine}`,
      input.bailStatus ? `Bail status: ${String(input.bailStatus).replace(/_/g, " ")}` : "Bail status: Not evidenced in the bundle yet",
      "",
      chargesBlock(input.charges),
      "",
      "What we are doing next (evidence-first):",
      "- Confirm disclosure position (MG6 schedules / unused material) and chase anything outstanding.",
      "- Check procedural integrity (custody record, interview recording, legal advice log).",
      "- Only once the above is confirmed, finalise a case theory and any formal representations.",
      "",
      "What we need from you (if available):",
      "- Any messages, call logs, or documents you have that relate to the incident and the timeline.",
      "- Names/contact details of any witnesses who can confirm your account.",
      "",
      "This is decision-support information, not legal advice. We will update you again once disclosure and the core procedural documents are confirmed.",
      "",
      "Yours faithfully,",
      "",
      input.notes && input.notes.trim().length > 0 ? `\nAdditional notes:\n${input.notes.trim()}` : "",
    ]
      .filter((x) => x !== "")
      .join("\n");

    return { subject, body };
  }

  // disclosure_chase
  const subject = `${caseRef} — disclosure request / chase (CPIA)`;
  const missingItems = input.disclosure?.missingItems ?? [];
  const issues = input.disclosure?.issues ?? [];

  const body = [
    caseRef,
    "",
    "Dear CPS / Disclosure Officer,",
    "",
    "We act for the Defendant in the above matter.",
    "",
    `${defendantLine}`,
    `${hearingLine}`,
    "",
    "Disclosure position (as currently evidenced in the bundle):",
    `- Outstanding items:\n${listOrUnknown(missingItems)}`,
    issues && issues.length > 0 ? `\n- Noted issues:\n${listOrUnknown(issues)}` : "",
    input.disclosure?.disclosureDeadline ? `\n- Requested timetable / deadline: ${formatDateShort(input.disclosure.disclosureDeadline)}` : "",
    "",
    "Request:",
    "Please confirm (1) the current disclosure timetable and (2) when the outstanding items will be served.",
    "If any item does not exist, please confirm that explicitly and explain why.",
    "",
    input.pace?.breachesDetected && input.pace.breachesDetected.length > 0
      ? `PACE / procedural integrity (items flagged as potentially relevant):\n${listOrUnknown(input.pace.breachesDetected)}`
      : "PACE / procedural integrity: Please also confirm availability of custody record, interview recording, and legal advice log (if applicable).",
    "",
    "This request is made to ensure the defence can properly consider the evidence and give instructions. No allegations are made; we are seeking confirmation of what should exist if the process was followed correctly.",
    "",
    "Yours faithfully,",
    "",
    input.notes && input.notes.trim().length > 0 ? `\nAdditional notes:\n${input.notes.trim()}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");

  return { subject, body };
}


