/**
 * UI-only adapter: maps existing matter-brief / evidence / chase fields into a dashboard VM.
 * Never invents legal facts. Missing fields → safe placeholders.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { humanizeEvidenceLabel } from "@/components/criminal/five-answers/evidence-display";
import type {
  DashboardAttentionIssue,
  DashboardImpactTag,
  DashboardIssueStatus,
  DashboardRecentCase,
  SolicitorDashboardVm,
} from "./types";

const PLACEHOLDER_CLIENT = "Client name not safely identified";
const PLACEHOLDER_CHARGE = "Charge not safely identified";
const PLACEHOLDER_COURT = "Court not safely identified";
const PLACEHOLDER_HEARING = "Hearing not safely identified";
const PLACEHOLDER_STAGE = "Stage not safely identified";
const PLACEHOLDER_SOURCE = "Source not safely identified";

export type BuildSolicitorDashboardVmInput = {
  caseId: string;
  clientLabel?: string | null;
  chargeLabel?: string | null;
  courtLabel?: string | null;
  hearingLabel?: string | null;
  stageLabel?: string | null;
  matterConfidence?: MatterConfidenceResult | null;
  evidenceRows?: FiveAnswersEvidenceRow[] | null;
  chaseItems?: Array<{
    id?: string;
    label: string;
    whyItMatters?: string | null;
    draftChaseWording?: string | null;
    status?: string | null;
    familyId?: string | null;
  }> | null;
  doNotOverstate?: string[] | null;
  safeCourtLine?: string | null;
  clientSummary?: string | null;
  recentCases?: DashboardRecentCase[] | null;
};

function safeText(value: string | null | undefined, fallback: string): string {
  const t = (value ?? "").replace(/\s+/g, " ").trim();
  return t || fallback;
}

function mapExistenceToStatus(existence: FiveAnswersEvidenceRow["existence"]): DashboardIssueStatus {
  switch (existence) {
    case "missing":
      return "missing";
    case "incomplete":
      return "incomplete";
    case "referred_only":
      return "referred";
    case "not_safely_confirmed":
    case "unknown":
      return "not_established";
    default:
      return "unclear";
  }
}

function impactForLabel(label: string): DashboardImpactTag[] {
  const t = label.toLowerCase();
  const tags: DashboardImpactTag[] = [];
  if (/cctv|identification|id parade|recognition|stills/i.test(t)) tags.push("Identification");
  if (/interview|bwv|credibility|reliability|mg11|witness/i.test(t)) tags.push("Reliability");
  if (/mg6|disclosure|unused|schedule|phone|download|continuity/i.test(t)) tags.push("Completeness");
  if (/court|hearing|bail|ptph|plea/i.test(t)) tags.push("Court");
  if (/chase|outstanding|served|disclosure/i.test(t)) tags.push("Disclosure");
  if (/instruction|client|account|defence position/i.test(t)) tags.push("Instructions");
  if (!tags.length) tags.push("Disclosure");
  return [...new Set(tags)].slice(0, 3);
}

function statusLabel(status: DashboardIssueStatus): string {
  switch (status) {
    case "missing":
      return "MISSING";
    case "incomplete":
      return "INCOMPLETE";
    case "referred":
      return "REFERRED";
    case "outstanding":
      return "OUTSTANDING";
    case "not_established":
      return "NOT ESTABLISHED";
    default:
      return "UNCLEAR";
  }
}

export function dashboardStatusDisplay(status: DashboardIssueStatus): string {
  return statusLabel(status);
}

function readinessFromConfidence(level: MatterConfidenceResult["level"] | undefined): {
  provisional: boolean;
  label: string;
  detail: string;
} {
  switch (level) {
    case "safe":
      return {
        provisional: false,
        label: "Ready for solicitor review",
        detail: "Matter confidence is marked safe on current papers — still solicitor review before reliance.",
      };
    case "provisional":
      return {
        provisional: true,
        label: "Not ready for final court position",
        detail: "Provisional — solicitor review required.",
      };
    case "needs_review":
      return {
        provisional: true,
        label: "Not ready for final court position",
        detail: "Solicitor review required before fixing position.",
      };
    case "blocked":
      return {
        provisional: true,
        label: "Not ready for final court position",
        detail: "Blocked on current papers — solicitor review required.",
      };
    default:
      return {
        provisional: true,
        label: "Not ready for final court position",
        detail: "Provisional — solicitor review required.",
      };
  }
}

/**
 * Pure presentation mapper. Does not mutate inputs or call builders that change truth.
 */
export function buildSolicitorDashboardVm(input: BuildSolicitorDashboardVmInput): SolicitorDashboardVm {
  const readiness = readinessFromConfidence(input.matterConfidence?.level);
  const allRows = input.evidenceRows ?? [];
  const servedCount = allRows.filter((r) => r.existence === "served").length;
  const rowTotal = allRows.length;
  const readinessPercent = rowTotal > 0 ? Math.round((servedCount / rowTotal) * 100) : null;

  const gapRows = allRows.filter((r) =>
    ["missing", "incomplete", "referred_only", "unknown", "not_safely_confirmed"].includes(r.existence),
  );

  const issuesFromEvidence: DashboardAttentionIssue[] = gapRows.slice(0, 24).map((row, i) => {
    const title = humanizeEvidenceLabel(row.label, row.existence) || safeText(row.label, "Material issue not safely identified");
    const status = mapExistenceToStatus(row.existence);
    const why =
      row.note?.trim() ||
      (status === "missing"
        ? "Not present in uploaded material on current papers."
        : status === "referred"
          ? "Referred to on papers, not safely served."
          : "Not safely confirmed on current papers.");
    const action =
      status === "missing" || status === "referred" || status === "outstanding"
        ? `Chase Crown for ${title}.`
        : `Confirm ${title} on papers before reliance.`;
    return {
      id: `ev-${i}-${title.slice(0, 40)}`,
      title,
      summary: why,
      status,
      impact: impactForLabel(`${row.label} ${title}`),
      why,
      sources: [PLACEHOLDER_SOURCE],
      recommendedAction: action,
      chaseCopy: action,
      courtCopy: `The defence asks the court to note that ${title.toLowerCase()} remains outstanding on the current papers.`,
    };
  });

  const existingTitles = new Set(issuesFromEvidence.map((i) => i.title.toLowerCase()));
  const issuesFromChase: DashboardAttentionIssue[] = (input.chaseItems ?? [])
    .filter((item) => item.label?.trim())
    .filter((item) => !existingTitles.has(item.label.trim().toLowerCase()))
    .slice(0, 16)
    .map((item, i) => {
      const title = item.label.trim();
      const why = item.whyItMatters?.trim() || "Outstanding on the current chase list — solicitor review before reliance.";
      const action = item.draftChaseWording?.trim() || `Chase Crown for ${title}.`;
      return {
        id: item.id?.trim() || `chase-${i}-${title.slice(0, 40)}`,
        title,
        summary: why,
        status: "outstanding" as const,
        impact: impactForLabel(title),
        why,
        sources: [PLACEHOLDER_SOURCE],
        recommendedAction: action,
        chaseCopy: action,
        courtCopy: `The defence asks the court to record that ${title.toLowerCase()} remains outstanding.`,
      };
    });

  const warningIssues: DashboardAttentionIssue[] = (input.doNotOverstate ?? []).slice(0, 4).map((line, i) => ({
    id: `warn-${i}`,
    title: "Wording guardrail",
    summary: line.trim(),
    status: "not_established" as const,
    impact: ["Court", "Instructions"] as DashboardImpactTag[],
    why: line.trim(),
    sources: [PLACEHOLDER_SOURCE],
    recommendedAction: "Keep wording provisional until the papers confirm the point.",
    chaseCopy: "Keep wording provisional until the papers confirm the point.",
    courtCopy: "Position remains provisional on the current papers.",
  }));

  const issues = [...issuesFromEvidence, ...issuesFromChase, ...warningIssues];

  const missing = issues.filter((i) => i.status === "missing").length;
  const incomplete = issues.filter((i) => i.status === "incomplete" || i.status === "referred").length;
  const notEstablished = issues.filter((i) => i.status === "not_established" || i.status === "unclear").length;
  const activeChases = (input.chaseItems ?? []).length;

  const safeCourtLine = safeText(
    input.safeCourtLine,
    "Court line not safely available on current papers — solicitor review required.",
  );
  const clientUpdate = safeText(
    input.clientSummary,
    "Client update not safely available on current papers. Keep the explanation provisional and confirm instructions before sending.",
  );

  const totalAttention = Math.max(issues.length, 1);
  const resolvedish = Math.max(0, totalAttention - missing - incomplete);
  const evidenceGatheredPercent = readinessPercent;
  const issuesResolvedPercent = Math.min(100, Math.round((resolvedish / totalAttention) * 100));
  const toBeChasedPercent = Math.min(
    100,
    Math.round((activeChases / Math.max(activeChases + resolvedish, 1)) * 100),
  );

  return {
    caseId: input.caseId,
    clientLabel: safeText(input.clientLabel, PLACEHOLDER_CLIENT),
    chargeLabel: safeText(input.chargeLabel, PLACEHOLDER_CHARGE),
    stageLabel: safeText(input.stageLabel, PLACEHOLDER_STAGE),
    courtLabel: safeText(input.courtLabel, PLACEHOLDER_COURT),
    hearingLabel: safeText(input.hearingLabel, PLACEHOLDER_HEARING),
    provisional: readiness.provisional,
    readinessLabel: readiness.label,
    readinessDetail: readiness.detail,
    counts: { missing, incomplete, notEstablished, activeChases },
    issues,
    safeCourtLine,
    clientUpdate,
    readinessPercent,
    readinessBreakdown: {
      evidenceGatheredPercent,
      issuesResolvedPercent,
      toBeChasedPercent,
    },
    recentCases: input.recentCases ?? [],
  };
}
