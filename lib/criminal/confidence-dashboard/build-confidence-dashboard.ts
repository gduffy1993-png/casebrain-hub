import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { ExportPackModel } from "@/lib/criminal/export-pack/types";
import type { AdviceChangeRadarModel } from "@/lib/criminal/advice-change-radar";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import type { RerunDiffModel } from "@/lib/criminal/re-run-diff";
import type { TrustFeedbackRecord } from "@/lib/criminal/trust/feedback/trust-feedback-types";
import { inferFeedbackSeverity } from "@/lib/criminal/feedback-console/infer-feedback-severity";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import {
  dashboardSendabilityLabel,
  outputHasSourceSupport,
  sanitizeDashboardLine,
} from "./confidence-dashboard-sanitize";
import type {
  BuildConfidenceDashboardInput,
  ConfidenceDashboardModel,
  ConfidenceDashboardStatus,
  DashboardFeedbackInput,
  DashboardRecentChangesInput,
  EvidenceStateCounts,
  FeedbackSummary,
  SourceStateCoverage,
} from "./confidence-dashboard-types";
import { CONFIDENCE_DASHBOARD_STATUS_LABELS } from "./confidence-dashboard-types";

const REVIEW_DISCLAIMER =
  "Review-confidence view only — not a legal guarantee. All outputs require solicitor review before reliance or sending.";

function countEvidenceStates(
  rows: BuildConfidenceDashboardInput["evidenceRows"],
  chaseItems: BuildConfidenceDashboardInput["chaseItems"],
): EvidenceStateCounts {
  const counts: EvidenceStateCounts = {
    available: false,
    served: 0,
    referred_only: 0,
    missing: 0,
    incomplete: 0,
    not_safely_confirmed: 0,
    provisional_or_needs_review: 0,
  };

  if (!rows.length && !chaseItems.length) return counts;

  counts.available = rows.length > 0 || chaseItems.length > 0;

  for (const row of rows) {
    switch (row.existence) {
      case "served":
        counts.served++;
        break;
      case "referred_only":
        counts.referred_only++;
        break;
      case "missing":
        counts.missing++;
        break;
      case "not_safely_confirmed":
        counts.not_safely_confirmed++;
        break;
      case "unknown":
        counts.provisional_or_needs_review++;
        break;
      default:
        break;
    }
    if (row.reliability === "needs_review" || row.reliability === "inference_only") {
      counts.provisional_or_needs_review++;
    }
  }

  for (const item of chaseItems) {
    const status = (item.baseStatus ?? "").toLowerCase();
    if (/incomplete|partial/.test(status)) counts.incomplete++;
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source ?? "",
      baseStatus: item.baseStatus ?? "",
      evidenceAnchor: undefined,
    });
    const ex = mapSourceStateToExistence(state);
    if (ex === "missing") counts.missing++;
    if (ex === "referred_only") counts.referred_only++;
  }

  return counts;
}

function buildSourceCoverage(input: BuildConfidenceDashboardInput): SourceStateCoverage {
  const outputIds = input.exportSections.map((s) => s.id);
  if (input.courtNoteSendability) outputIds.push("court_note");
  const total = outputIds.length || 1;

  const missingLabelOutputs: string[] = [];
  let labelled = 0;

  for (const section of input.exportSections) {
    const support: "present" | "partial" | "missing" =
      section.blockedReason || section.sendability === "blocked"
        ? "missing"
        : input.sourceBadges.length
          ? "present"
          : "partial";
    if (support === "present") labelled++;
    else missingLabelOutputs.push(section.title);
  }

  if (input.courtNoteSendability) {
    if (input.sourceBadges.length) labelled++;
    else missingLabelOutputs.push("Court note");
  }

  const complete = missingLabelOutputs.length === 0 && input.sourceBadges.length > 0;
  const sendableWithoutSourceSupport = input.exportSections.some(
    (s) =>
      s.sendability === "safe_to_send" &&
      !outputHasSourceSupport(s.sendability, input.sourceBadges.length ? "present" : "missing"),
  );

  return {
    labelledOutputs: labelled,
    totalOutputs: total,
    complete,
    missingLabelOutputs: missingLabelOutputs.slice(0, 6),
    sendableWithoutSourceSupport,
  };
}

function deriveStatus(
  input: BuildConfidenceDashboardInput,
  counts: EvidenceStateCounts,
  coverage: SourceStateCoverage,
): ConfidenceDashboardStatus {
  if (input.documentCount === 0 || !counts.available) return "insufficient_information";
  if (input.matterLevel === "blocked" || input.feedback.blocking > 0) return "blocked_pending_material";
  if (
    !coverage.complete ||
    coverage.sendableWithoutSourceSupport ||
    counts.missing > 0 ||
    counts.referred_only > 0 ||
    counts.not_safely_confirmed > 0
  ) {
    return "needs_source_review";
  }
  if (
    input.feedback.warning > 0 ||
    input.recent.rerunDiffLines.length > 0 ||
    input.recent.auditConcernCount > 0 ||
    input.matterLevel === "provisional" ||
    input.matterLevel === "needs_review"
  ) {
    return "provisional";
  }
  return "ready_for_solicitor_review";
}

function buildRiskWarnings(input: BuildConfidenceDashboardInput): string[] {
  const out: string[] = [];

  if (countsHasReferredOrMissing(input)) {
    out.push("Possible false-served risk — referred or missing material on papers.");
  }
  for (const c of input.contradictions) {
    if (c.kind === "attribution_issue") {
      out.push("Attribution issue flagged on papers — review before relying.");
    }
    if (c.kind === "statement_conflict") {
      out.push("Statement conflict surfaced — review accounts before court.");
    }
  }
  for (const line of input.mustNotOverstate) {
    const s = sanitizeDashboardLine(line);
    if (!s) continue;
    if (/co-?defendant|other defendant/i.test(s)) {
      out.push("Wrong-defendant bleed risk — co-defendant material may need segregation.");
    }
    if (/overstate|false served|referred/i.test(s)) {
      out.push("Possible false-served risk — do-not-overstate warning active.");
    }
    if (/court|cps|client/i.test(s)) {
      out.push("Court/CPS/client wording separation — check export surfaces before sending.");
    }
  }
  if (input.feedback.unsafeOrOverstated > 0) {
    out.push("Unsafe or overstated feedback recorded — review flagged lines.");
  }
  if (input.recent.rerunDiffLines.length > 0) {
    out.push("New material may have changed position — see Re-run Diff.");
  }
  if (input.evidenceRows.some((r) => r.existence === "not_safely_confirmed")) {
    out.push("Evidence not safely confirmed on current papers.");
  }

  return [...new Set(out)].slice(0, 8);
}

function countsHasReferredOrMissing(input: BuildConfidenceDashboardInput): boolean {
  return input.evidenceRows.some(
    (r) => r.existence === "referred_only" || r.existence === "missing",
  );
}

function buildUnresolved(input: BuildConfidenceDashboardInput): string[] {
  const lines: string[] = [];
  for (const label of input.outstandingChaseLabels.slice(0, 5)) {
    const s = sanitizeDashboardLine(`Outstanding chase: ${label}`);
    if (s) lines.push(s);
  }
  for (const label of input.missingMaterialLabels.slice(0, 4)) {
    const s = sanitizeDashboardLine(`Missing material: ${label}`);
    if (s) lines.push(s);
  }
  for (const row of input.evidenceRows) {
    if (row.existence === "referred_only") {
      lines.push("Referred-only material on trace — source check required.");
      break;
    }
  }
  if (input.feedback.blocking > 0) {
    lines.push(`${input.feedback.blocking} blocking feedback flag(s) — review before sending.`);
  }
  if (input.feedback.warning > 0) {
    lines.push(`${input.feedback.warning} warning feedback flag(s) — review flagged outputs.`);
  }
  if (input.recent.auditConcernCount > 0) {
    lines.push(`${input.recent.auditConcernCount} audit-log concern(s) on record.`);
  }
  for (const line of input.recent.rerunDiffLines.slice(0, 3)) {
    const s = sanitizeDashboardLine(line);
    if (s) lines.push(s);
  }
  return [...new Set(lines)].slice(0, 10);
}

function buildRecentChanges(recent: DashboardRecentChangesInput): string[] {
  const lines: string[] = [];
  if (!recent.rerunHasBaseline) {
    lines.push("No earlier version saved yet (Re-run Diff baseline).");
  } else if (recent.rerunDiffHeadline) {
    const h = sanitizeDashboardLine(recent.rerunDiffHeadline);
    if (h) lines.push(h);
  }
  for (const line of recent.rerunDiffLines.slice(0, 3)) {
    const s = sanitizeDashboardLine(line);
    if (s) lines.push(s);
  }
  if (recent.adviceChangeSummary) {
    const s = sanitizeDashboardLine(recent.adviceChangeSummary);
    if (s) lines.push(`Advice Change Radar: ${s}`);
  } else if (!recent.adviceHasBaseline) {
    lines.push("Advice Change Radar — save papers baseline to track shifts.");
  }
  if (recent.exportId && recent.exportGeneratedAt) {
    lines.push(`Export ${recent.exportId} generated ${recent.exportGeneratedAt}.`);
  }
  if (recent.auditConcernCount > 0) {
    lines.push(`${recent.auditConcernCount} audit-log item(s) need review.`);
  }
  return lines.slice(0, 8);
}

function recommendAction(
  status: ConfidenceDashboardStatus,
  input: BuildConfidenceDashboardInput,
): string {
  if (status === "insufficient_information") {
    return "Upload or process documents before relying on outputs.";
  }
  if (status === "blocked_pending_material") {
    return "Blocked until source material is served — chase outstanding disclosure.";
  }
  if (input.evidenceRows.some((r) => /pace|custody/i.test(r.sourceAnchor ?? "")) || input.outstandingChaseLabels.some((l) => /pace|custody/i.test(l))) {
    return "Check custody/PACE material before fixing hearing position.";
  }
  if (input.contradictions.some((c) => c.kind === "attribution_issue")) {
    return "Review attribution material before sending client or CPS copy.";
  }
  if (input.recent.rerunDiffLines.length > 0) {
    return "Re-copy export after reviewing Re-run Diff changes.";
  }
  if (countsHasReferredOrMissing(input) || input.missingMaterialLabels.length > 0) {
    return "Chase CPS for missing material before treating outputs as final.";
  }
  if (status === "needs_source_review") {
    return "Review source before sending any export surface.";
  }
  return "No immediate blocking issue found; solicitor review still required.";
}

export function buildConfidenceDashboard(input: BuildConfidenceDashboardInput): ConfidenceDashboardModel {
  const evidenceCounts = countEvidenceStates(input.evidenceRows, input.chaseItems);
  const sourceCoverage = buildSourceCoverage(input);
  const status = deriveStatus(input, evidenceCounts, sourceCoverage);

  const outputSendability = input.exportSections.map((section) => {
    const support: "present" | "partial" | "missing" =
      section.blockedReason || section.sendability === "blocked"
        ? "missing"
        : input.sourceBadges.length
          ? "present"
          : "partial";
    return {
      outputId: section.id,
      label: section.title,
      sendability: section.sendability,
      sendabilityLabel: dashboardSendabilityLabel(section.sendability, outputHasSourceSupport(section.sendability, support)),
      sourceStateSupport: support,
      warningCount: section.id === "do_not_overstate" ? input.exportVersion?.warningCount ?? null : null,
      exportId: input.exportVersion?.exportId ?? null,
    };
  });

  if (input.courtNoteSendability) {
    const support = input.sourceBadges.length ? "present" : "partial";
    outputSendability.push({
      outputId: "court_note",
      label: "Court note (Five Answers)",
      sendability: input.courtNoteSendability,
      sendabilityLabel: dashboardSendabilityLabel(
        input.courtNoteSendability,
        outputHasSourceSupport(input.courtNoteSendability, support),
      ),
      sourceStateSupport: support,
      warningCount: null,
      exportId: input.exportVersion?.exportId ?? null,
    });
  }

  const feedbackSummary: FeedbackSummary = {
    hasFeedback:
      input.feedback.blocking + input.feedback.warning + input.feedback.polish > 0,
    blocking: input.feedback.blocking,
    warning: input.feedback.warning,
    polish: input.feedback.polish,
    exportRelated: input.feedback.exportRelated,
    unsafeOrOverstated: input.feedback.unsafeOrOverstated,
    latestTimestamp: input.feedback.latestTimestamp,
  };

  return {
    status,
    statusLabel: CONFIDENCE_DASHBOARD_STATUS_LABELS[status],
    reviewDisclaimer: REVIEW_DISCLAIMER,
    evidenceCounts,
    outputSendability,
    unresolvedWork: buildUnresolved(input),
    riskWarnings: buildRiskWarnings(input),
    recentChanges: buildRecentChanges(input.recent),
    recommendedAction: sanitizeDashboardLine(recommendAction(status, input)) ?? "Solicitor review still required.",
    feedbackSummary,
    sourceCoverage,
  };
}

export function summarizeFeedbackRecords(records: TrustFeedbackRecord[]): DashboardFeedbackInput {
  let blocking = 0;
  let warning = 0;
  let polish = 0;
  let exportRelated = 0;
  let unsafeOrOverstated = 0;
  let latest: string | null = null;

  for (const r of records) {
    const sev = r.severity ?? inferFeedbackSeverity(r.feedbackKind);
    if (sev === "blocking") blocking++;
    else if (sev === "warning") warning++;
    else polish++;
    if (r.tab === "export_pack" || r.exportId) exportRelated++;
    if (r.feedbackKind === "unsafe" || r.feedbackKind === "overstated" || r.feedbackKind === "wrong") {
      unsafeOrOverstated++;
    }
    if (!latest || r.timestamp > latest) latest = r.timestamp;
  }

  return { blocking, warning, polish, exportRelated, unsafeOrOverstated, latestTimestamp: latest };
}

export function buildConfidenceDashboardInputFromH5(props: {
  documentCount: number;
  view: FiveAnswersViewModel;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan | null;
  matterConfidence: MatterConfidenceResult | null;
  exportPack: ExportPackModel | null;
  feedbackRecords: TrustFeedbackRecord[];
  rerunDiff: RerunDiffModel | null;
  adviceRadar: AdviceChangeRadarModel | null;
  auditConcernCount?: number;
}): BuildConfidenceDashboardInput {
  const traceRows = props.view.evidenceTrace.rows.map((r) => ({
    existence: r.existence,
    reliability: r.reliability,
    sourceAnchor: r.sourceAnchor,
  }));

  const rerunLines = props.rerunDiff?.groups.flatMap((g) => g.lines) ?? [];

  return {
    documentCount: props.documentCount,
    evidenceRows: traceRows,
    chaseItems: props.chase.primaryItems.map((i) => ({
      label: i.label,
      baseStatus: i.baseStatus,
      source: i.source,
    })),
    matterLevel: props.matterConfidence?.level ?? null,
    missingMaterialLabels: props.briefPlan?.missingEvidence.map((m) => m.label) ?? [],
    contradictions: props.view.contradictions.map((c) => ({ kind: c.kind, label: c.label })),
    mustNotOverstate: props.view.mustNotOverstate,
    outstandingChaseLabels: props.chase.primaryItems.map((i) => i.label),
    exportSections: (props.exportPack?.sections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      sendability: s.sendability,
      sendabilityLabel: s.sendabilityLabel,
      blockedReason: s.blockedReason,
    })),
    exportVersion: props.exportPack?.version
      ? {
          exportId: props.exportPack.version.exportId,
          generatedAt: props.exportPack.version.generatedAt,
          warningCount: props.exportPack.version.warningCount,
        }
      : null,
    courtNoteSendability: props.matterConfidence?.summarySendability ?? null,
    courtNoteSendabilityLabel: props.view.courtNote.sendabilityLabel,
    sourceBadges: props.matterConfidence?.sourceBadges ?? [],
    feedback: summarizeFeedbackRecords(props.feedbackRecords),
    recent: {
      rerunDiffHeadline: props.rerunDiff?.headline ?? null,
      rerunDiffLines: rerunLines,
      rerunHasBaseline: props.rerunDiff?.hasPrevious ?? false,
      adviceChangeSummary: props.adviceRadar?.changeSummary ?? null,
      adviceChangeItemCount: props.adviceRadar?.items.length ?? 0,
      adviceHasBaseline: props.adviceRadar?.hasBaseline ?? false,
      exportId: props.exportPack?.version.exportId ?? null,
      exportGeneratedAt: props.exportPack?.version.generatedAt ?? null,
      auditConcernCount: props.auditConcernCount ?? 0,
    },
  };
}
