import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningFeedbackRecord } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";
import { REASONING_FEEDBACK_OPTIONS } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { utcDayDiff } from "@/lib/criminal/solicitor-time-clock";
import { sanitizeSupervisorQALine } from "./supervisor-qa-sanitize";
import type { SupervisorQAOutcome, SupervisorQAResult, SupervisorReviewStatus } from "./supervisor-qa-types";

const CORE_MISSING_PATTERNS = [
  /cctv/i,
  /master/i,
  /export/i,
  /cad/i,
  /999/i,
  /interview/i,
  /transcript/i,
  /bwv/i,
  /lab/i,
  /medical/i,
  /mg6/i,
  /continuity/i,
];

function dedupe(lines: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeSupervisorQALine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function labelForOption(value: string): string {
  return REASONING_FEEDBACK_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function statusLabel(status: SupervisorReviewStatus): string {
  switch (status) {
    case "none":
      return "No obvious supervisor issue on current source-backed view";
    case "suggested":
      return "Supervisor review suggested";
    case "required":
      return "Supervisor review required before relying on this position";
  }
}

function hearingWithinDays(iso: string | null | undefined, days: number, asOf: Date = new Date()): boolean {
  if (!iso) return false;
  const diff = utcDayDiff(asOf, iso.trim().slice(0, 10));
  return diff !== null && diff >= 0 && diff <= days;
}

function isGenericProvisional(reasoning: ReasoningV2ViewModel, hint?: string | null): boolean {
  if (hint && /generic_provisional|provisional/i.test(hint)) return true;
  return /provisional|pervert.*course of justice/i.test(
    `${reasoning.primaryRoute} ${reasoning.charge}`,
  );
}

function countCoreMissing(reasoning: ReasoningV2ViewModel): string[] {
  return dedupe(
    reasoning.missingMaterial
      .filter((m) => CORE_MISSING_PATTERNS.some((p) => p.test(m.label)))
      .map((m) => `${m.label} — outstanding on served papers (${m.sourceSection})`),
    8,
  );
}

export type BuildSupervisorQAOptions = {
  clientStress?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput;
  evidenceChanges?: EvidenceChangeCompareResult | null;
  feedbackRecords?: ReasoningFeedbackRecord[];
  workflowProfileHint?: string | null;
  exportsEnabled?: boolean;
};

export function buildSupervisorQAResult(
  reasoning: ReasoningV2ViewModel | null | undefined,
  options: BuildSupervisorQAOptions = {},
): SupervisorQAOutcome {
  if (!reasoning) {
    return { available: false, reason: "no_reasoning" };
  }

  const {
    clientStress = null,
    readinessInput = {},
    evidenceChanges = null,
    feedbackRecords = [],
    workflowProfileHint = null,
    exportsEnabled = false,
  } = options;

  const readiness = buildPreHearingReadiness(reasoning, clientStress, readinessInput);
  const readinessLevel = readiness.available ? readiness.level : "amber";
  const missingCore = countCoreMissing(reasoning);
  const hearingSoon = hearingWithinDays(readinessInput.hearingMeta?.hearingDateIso, 14);
  const genericProvisional = isGenericProvisional(reasoning, workflowProfileHint);

  const contradictions = dedupe(
    reasoning.contradictions.map(
      (c) => `${c.label} — unresolved on papers (${c.sourceSection})`,
    ),
    6,
  );

  const doNotConcedePoints = dedupe(
    [
      ...reasoning.warRoom.doNotConcede,
      ...(clientStress?.doNotConcedeGuards.map(
        (g) => `${g.concessionRiskLabel}: ${g.safeWordingAlternative}`,
      ) ?? []),
    ],
    8,
  );

  const feedbackConcerns = dedupe(
    feedbackRecords
      .filter((r) =>
        ["unsafe_overconfident", "too_vague", "missed_key_issue", "needs_solicitor_review"].includes(
          r.feedbackOption,
        ),
      )
      .map((r) => `Reasoning feedback: ${labelForOption(r.feedbackOption)} (${r.surface})`),
    6,
  );

  const hasUnsafeFeedback = feedbackRecords.some((r) => r.feedbackOption === "unsafe_overconfident");

  let evidenceChangeStatus = "No evidence-change compare on file.";
  if (evidenceChanges?.available) {
    evidenceChangeStatus = evidenceChanges.hasPreviousSnapshot
      ? evidenceChanges.changeSummary
      : "No saved snapshot — save papers state to compare after new material.";
  }

  const reasons: string[] = [];
  let severity = 0;

  if (readinessLevel === "red") {
    reasons.push("Pre-hearing readiness: not ready to rely on yet on current papers.");
    severity += 3;
  } else if (readinessLevel === "amber") {
    reasons.push("Pre-hearing readiness: review before hearing.");
    severity += 1;
  }

  if (reasoning.humanReviewRequired) {
    reasons.push("Reasoning V2 flags human review on source-backed view.");
    severity += 2;
  }
  if (reasoning.warRoom.solicitorReviewRequired) {
    reasons.push("War Room flags solicitor review before fixing hearing line.");
    severity += 1;
  }
  if (clientStress?.solicitorReviewRequired) {
    reasons.push("Client account stress-test flags solicitor review.");
    severity += 1;
  }
  if (missingCore.length) {
    reasons.push(`${missingCore.length} core disclosure item(s) outstanding on papers.`);
    severity += missingCore.length >= 2 ? 2 : 1;
  }
  if (contradictions.length) {
    reasons.push(`${contradictions.length} unresolved contradiction(s) on papers.`);
    severity += 2;
  }
  if (doNotConcedePoints.length >= 3) {
    reasons.push("Multiple do-not-concede points active — position not safe to finalise.");
    severity += 1;
  }
  if (evidenceChanges?.available && evidenceChanges.solicitorReviewRequired) {
    reasons.push("Evidence changes since last snapshot may affect route or readiness.");
    severity += 2;
  }
  if (evidenceChanges?.supervisorElevationLabel) {
    reasons.push(evidenceChanges.supervisorElevationLabel);
    severity += 2;
  }
  if (hasUnsafeFeedback) {
    reasons.push("Unsafe / overconfident feedback marked on Reasoning V2.");
    severity += 3;
  } else if (feedbackConcerns.length) {
    reasons.push("Solicitor feedback flags concerns on Reasoning V2 output.");
    severity += 1;
  }
  if (genericProvisional) {
    reasons.push("Generic/provisional offence lens — no confident hearing line without review.");
    severity += 1;
  }
  if (hearingSoon && (missingCore.length >= 1 || readinessLevel !== "green")) {
    reasons.push("Hearing within two weeks with outstanding review flags.");
    severity += 2;
  }

  let status: SupervisorReviewStatus = "none";
  if (
    readinessLevel === "red" ||
    hasUnsafeFeedback ||
    (hearingSoon && missingCore.length >= 2 && readinessLevel !== "green") ||
    severity >= 5
  ) {
    status = "required";
  } else if (severity >= 1 || reasons.length > 0) {
    status = "suggested";
  }

  const topRisks = dedupe(
    [
      ...(readiness.available ? readiness.topBlockers : []),
      ...missingCore.slice(0, 3),
      ...contradictions.slice(0, 2),
      ...doNotConcedePoints.slice(0, 2),
    ],
    5,
  );

  const suggestedActions: string[] = [];
  if (missingCore.length) {
    suggestedActions.push("Chase outstanding core disclosure before finalising position.");
  }
  if (contradictions.length) {
    suggestedActions.push("Review unresolved contradictions — do not merge Crown and defence accounts.");
  }
  if (doNotConcedePoints.length) {
    suggestedActions.push("Check do-not-concede list before any hearing or client advice.");
  }
  if (clientStress?.clientInstructionChecklist.length) {
    suggestedActions.push("Take further client instructions on flagged checklist items.");
  }
  if (status !== "none") {
    suggestedActions.push("Senior review of War Room safe hearing line and readiness blockers.");
  }
  if (!suggestedActions.length) {
    suggestedActions.push("Routine spot-check — no automatic sign-off; solicitor judgment applies.");
  }

  const exportReminder = exportsEnabled
    ? "Generate case handover summary or hearing prep draft from Draft solicitor outputs before handover."
    : "Enable exports flag to generate handover or hearing prep drafts for shift handover.";

  const result: SupervisorQAResult = {
    available: true,
    status,
    statusLabel: statusLabel(status),
    reasonsForReview: dedupe(reasons, 8),
    topRisks,
    missingCoreDisclosure: missingCore,
    contradictions,
    doNotConcedePoints,
    readinessStatus: readiness.available
      ? `${readiness.label} — ${readiness.explanation.slice(0, 280)}`
      : "Readiness not computed.",
    evidenceChangeStatus: sanitizeSupervisorQALine(evidenceChangeStatus),
    feedbackConcerns,
    suggestedSupervisorAction: sanitizeSupervisorQALine(suggestedActions.join(" ")),
    exportReminder: sanitizeSupervisorQALine(exportReminder),
  };

  return result;
}
