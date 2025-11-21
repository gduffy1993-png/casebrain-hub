/**
 * Core Litigation Brain - Procedural Checklists
 * 
 * Generates structured checklists for common litigation procedures.
 * These are procedural guidance only and do not constitute legal advice.
 */

export interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  disclaimer: string;
}

/**
 * Build limitation urgency checklist (standstill or issue & serve)
 */
export function buildLimitationUrgencyChecklist(opts: {
  caseTitle?: string;
  limitationDate?: string;
  isExpired?: boolean;
}): Checklist {
  const items: ChecklistItem[] = [
    {
      id: "confirm-dates",
      text: "Confirm incident date and any dates of knowledge with the client and available documents.",
    },
    {
      id: "calculate-window",
      text: "Estimate the limitation date and the remaining window before expiry.",
    },
  ];

  if (opts.isExpired) {
    items.push({
      id: "urgent-review",
      text: "URGENT: Review limitation status with qualified solicitor - limitation period may have expired.",
    });
    items.push({
      id: "standstill-consider",
      text: "Consider whether a standstill agreement is still possible or if proceedings must be issued immediately.",
    });
  } else {
    items.push({
      id: "standstill-draft",
      text: "Consider whether a standstill agreement is appropriate; prepare draft terms if so.",
    });
    items.push({
      id: "issue-serve",
      text: "If standstill is not appropriate, consider issuing and serving proceedings urgently.",
    });
  }

  items.push({
    id: "update-diary",
    text: "Update the case diary and limitation tracker with agreed strategy and dates.",
  });

  return {
    id: "limitation-urgency",
    title: opts.isExpired
      ? "Limitation Period Expired – Urgent Action Required"
      : "Limitation – Standstill or Issue & Serve Checklist",
    items,
    disclaimer:
      "This checklist is procedural guidance only. It is not legal advice and must be reviewed by a qualified legal professional before any action is taken. All dates and deadlines must be confirmed independently.",
  };
}

/**
 * Build pre-action protocol checklist
 */
export function buildPreActionChecklist(opts: {
  caseTitle?: string;
  practiceArea?: string;
}): Checklist {
  return {
    id: "pre-action-protocol",
    title: "Pre-Action Protocol Checklist",
    items: [
      {
        id: "gather-evidence",
        text: "Gather all relevant evidence and documents.",
      },
      {
        id: "draft-letter",
        text: "Draft Letter Before Action (LBA) or Letter of Claim as appropriate.",
      },
      {
        id: "review-protocol",
        text: "Review relevant pre-action protocol requirements for the case type.",
      },
      {
        id: "set-deadline",
        text: "Set appropriate response deadline (typically 21 days for LBA, protocol-specific for Letter of Claim).",
      },
      {
        id: "consider-adr",
        text: "Consider ADR/mediation options before commencing proceedings.",
      },
      {
        id: "update-diary",
        text: "Update case diary with LBA/Letter of Claim sent date and response deadline.",
      },
    ],
    disclaimer:
      "This checklist is procedural guidance only. It is not legal advice and must be reviewed by a qualified legal professional before any action is taken.",
  };
}

