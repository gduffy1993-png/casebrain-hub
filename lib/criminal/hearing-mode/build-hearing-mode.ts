import type { CriminalBriefPlan, CriminalBriefPlanProfile } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { buildAdviceChangeRadar } from "@/lib/criminal/advice-change-radar/build-advice-change-radar";
import { buildMatterEvidenceSnapshot } from "@/lib/criminal/advice-change-radar/build-matter-evidence-snapshot";
import type { EvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import {
  evidenceExistenceLabel,
  evidenceReliabilityLabel,
} from "@/lib/criminal/five-answers/evidence-trace";
import { inferChaseItemSourceState, buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import type {
  HearingModeModel,
  HearingModeNextAction,
  HearingNextActionKind,
} from "./types";

const UNSAFE_PHRASE_RE =
  /\b(you will win|case collapses|defence succeeds|charge will be dropped|we win|must be acquitted|change your advice)\b/i;

const PROFILE_LABELS: Record<CriminalBriefPlanProfile, string> = {
  digital_attribution: "Digital attribution",
  bwv_police_contact: "BWV / police contact",
  custody_pace: "Custody / PACE",
  domestic_harassment: "Domestic / harassment",
  drugs_pwits: "Drugs / PWITS",
  violence_assault: "Violence / assault",
  sexual_abe: "Sexual / ABE",
  driving_motoring: "Motoring / SJP",
  fraud_account: "Fraud / account",
  robbery_id: "Robbery / ID",
  mixed_unclear: "Mixed / unclear profile",
};

function sanitise(text: string): string {
  const t = text.trim();
  if (!t) return "Provisional — requires solicitor review.";
  if (UNSAFE_PHRASE_RE.test(t)) return "Source-backed concern — requires solicitor review before reliance.";
  return t;
}

function resolveNextAction(
  matterConfidence: MatterConfidenceResult | null,
  outstandingChase: number,
  courtBlocked: boolean,
  instructionsNeeded: string[],
): HearingModeNextAction {
  let kind: HearingNextActionKind = "court_note_review";
  if (matterConfidence?.level === "blocked" || courtBlocked) {
    kind = "blocked_until_served";
  } else if (outstandingChase > 0) {
    kind = "chase_cps";
  } else if (instructionsNeeded.some((line) => line.trim().length > 0)) {
    kind = "review_client_instructions";
  } else if (matterConfidence?.safeCourtLineStatus === "needs_review") {
    kind = "check_source";
  } else if ((matterConfidence?.sourceBadges ?? []).includes("missing")) {
    kind = "check_source";
  }

  const labels: Record<HearingNextActionKind, string> = {
    chase_cps: "Chase CPS",
    check_source: "Check source on papers",
    review_client_instructions: "Review client instructions",
    court_note_review: "Court note ready for review",
    blocked_until_served: "Blocked until material served",
  };

  const detail =
    matterConfidence?.nextBestAction?.trim() ||
    (kind === "chase_cps"
      ? "Open Chase tab and confirm top missing items before hearing."
      : kind === "blocked_until_served"
        ? "Do not rely on court line until source gaps are closed or reviewed."
        : "Review source-backed court note and Today tab before court.");

  return { kind, label: labels[kind], detail: sanitise(detail) };
}

export type BuildHearingModeInput = {
  allegation: string;
  briefPlan: CriminalBriefPlan;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  doNotOverstate: string[];
  primaryRouteTitle: string | null;
  documentCount?: number;
  previousSnapshot?: EvidenceChangeSnapshot | null;
  currentSnapshot?: EvidenceChangeSnapshot | null;
};

export function buildHearingMode(input: BuildHearingModeInput): HearingModeModel {
  const {
    allegation,
    briefPlan,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
    documentCount = 0,
    previousSnapshot = null,
  } = input;

  const five = buildFiveAnswersView({
    allegation,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
  });

  const currentSnapshot =
    input.currentSnapshot ??
    buildMatterEvidenceSnapshot({
      warRoom,
      chase,
      briefPlan,
      primaryRouteTitle,
      documentCount,
    });

  const radar = buildAdviceChangeRadar({
    warRoom,
    chase,
    briefPlan,
    matterConfidence,
    previousSnapshot,
    currentSnapshot,
  });

  const prosecutionTheory = sanitise(
    primaryRouteTitle?.trim() ||
      briefPlan.summaryAngle?.trim() ||
      chase.disclosureSummary?.trim() ||
      "Prosecution theory not safely recorded on current papers.",
  );

  const evidenceSnapshot = five.evidenceState.rows.slice(0, 6).map((row) => ({
    label: row.label,
    existence: row.existence,
    reliability: row.reliability,
    existenceLabel: evidenceExistenceLabel(row.existence),
    reliabilityLabel: evidenceReliabilityLabel(row.reliability),
    note: row.note,
  }));

  const topChaseItems = chase.primaryItems.slice(0, 3).map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const copy = buildCopySafeResult({
      text: item.draftChaseWording,
      kind: "cps_chase",
      sourceState: state,
      sourceLabel: item.source,
      matterLevel: matterConfidence?.chaseSendability,
    });
    return {
      label: item.label,
      cpsChaseWording: sanitise(copy.textForClipboard.slice(0, 280)),
      sendabilityLabel: FIRM_SENDABILITY_LABELS[copy.sendability] ?? copy.sendabilityLabel,
      existenceLabel: evidenceExistenceLabel(mapSourceStateToExistence(state)),
      canCopy: copy.canCopy,
    };
  });

  const reviewPrompts = radar.items.slice(0, 3).map((item) => ({
    id: item.id,
    summary: sanitise(item.whatChanged),
    reviewNeeded: sanitise(item.reviewNeeded),
  }));

  const courtBlocked = !five.courtNote.canCopy || matterConfidence?.level === "blocked";

  return {
    caseInOneMinute: {
      chargeLabel: sanitise(allegation.trim() || "Charge not on papers"),
      offenceFamily: PROFILE_LABELS[briefPlan.profile],
      prosecutionTheory,
      mainIssue: sanitise(five.caseSaying.mainIssue),
      confidenceLabel: matterConfidence?.label ?? "Provisional — review papers",
      confidenceLevel: matterConfidence?.level ?? "provisional",
    },
    safeCourtLine: {
      text: sanitise(five.courtNote.text),
      sendabilityLabel: five.courtNote.sendabilityLabel,
      canCopy: five.courtNote.canCopy,
      footer: five.courtNote.footer,
    },
    evidenceSnapshot,
    topChaseItems,
    doNotOverstate: five.mustNotOverstate.slice(0, 6),
    reviewPrompts,
    nextAction: resolveNextAction(
      matterConfidence,
      topChaseItems.length,
      courtBlocked,
      warRoom.instructionsNeeded,
    ),
    reviewNotice:
      "20-minute hearing mode summarises existing H5 outputs for court prep — not legal advice or a sendable court line.",
  };
}
