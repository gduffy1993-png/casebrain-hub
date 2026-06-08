import { generateBattleboardView } from "@/lib/eval/casebrain-auditor/battleboard-view-generate";
import type { BattleboardViewEvidenceItem } from "@/lib/eval/casebrain-auditor/battleboard-view-types";
import { generateProofMap } from "@/lib/eval/casebrain-auditor/proof-map-generate";
import { generateWarRoomView } from "@/lib/eval/casebrain-auditor/war-room-view-generate";
import {
  assessBundleAvailability,
  type BundleAvailabilityInput,
} from "./bundle-availability";
import {
  REASONING_V2_MIN_BUNDLE_CHARS,
  assembleBundleTextForReasoning,
  type BundleTextInput,
} from "./assemble-bundle-text";
import {
  confidenceLabel,
  sanitizeHumanReviewReason,
  sanitizeReasoningPublicText,
  toProductConfidence,
} from "./sanitize-reasoning-text";
import type {
  ReasoningV2DisclosurePriority,
  ReasoningV2EvidenceItem,
  ReasoningV2Result,
  ReasoningV2ViewModel,
} from "./reasoning-v2-types";

export type BuildReasoningV2Input = BundleAvailabilityInput & {
  matterLabel?: string;
};

function mapEvidenceItem(item: BattleboardViewEvidenceItem): ReasoningV2EvidenceItem {
  const confidence = toProductConfidence(item.confidenceTag);
  return {
    label: sanitizeReasoningPublicText(item.label),
    sourceSection: sanitizeReasoningPublicText(item.sourceSection),
    sourceBasis: sanitizeReasoningPublicText(item.sourceBasis),
    confidence,
    doNotOverstate: item.doNotOverstate ? sanitizeReasoningPublicText(item.doNotOverstate) : undefined,
  };
}

function hasSubstantiveProofMap(proofPointCount: number, linkCount: number): boolean {
  return proofPointCount > 0 || linkCount > 0;
}

export function buildReasoningV2FromBundleText(
  bundleText: string,
  matterLabel = "Current matter",
): ReasoningV2Result {
  const trimmed = bundleText.trim();
  if (trimmed.length < REASONING_V2_MIN_BUNDLE_CHARS) {
    return { available: false, reason: "no_bundle_text" };
  }

  const proofMap = generateProofMap("matter", matterLabel, trimmed);
  const mapForView = {
    bundleId: proofMap.bundleId,
    label: proofMap.label,
    charge: proofMap.charge,
    stage: proofMap.stage,
    offenceLens: proofMap.offenceLens,
    humanReviewRequired: proofMap.humanReviewRequired,
    humanReviewReasons: proofMap.humanReviewReasons,
    proofPoints: proofMap.proofPoints,
    links: proofMap.links,
    bundleTextChars: proofMap.bundleTextChars,
  };

  if (!hasSubstantiveProofMap(proofMap.proofPoints.length, proofMap.links.length)) {
    return { available: false, reason: "insufficient_source" };
  }

  const battleboard = generateBattleboardView(mapForView, trimmed);
  const warRoom = generateWarRoomView(mapForView);

  if (
    !battleboard.primaryRoute?.trim() &&
    battleboard.proofPointsAttacked.length === 0 &&
    battleboard.missingMaterial.length === 0
  ) {
    return { available: false, reason: "insufficient_source" };
  }

  const humanReviewReasons = [
    ...new Set(
      battleboard.humanReviewReasons.map(sanitizeHumanReviewReason).filter(Boolean),
    ),
  ];

  const viewModel: ReasoningV2ViewModel = {
    available: true,
    charge: sanitizeReasoningPublicText(battleboard.charge),
    stage: battleboard.stage ? sanitizeReasoningPublicText(battleboard.stage) : null,
    primaryRoute: sanitizeReasoningPublicText(battleboard.primaryRoute),
    whyRouteIsLive: sanitizeReasoningPublicText(battleboard.whyRouteIsLive),
    proofPointsUnderPressure: battleboard.proofPointsAttacked.map((p) => ({
      label: sanitizeReasoningPublicText(p.label),
      pressureCount: p.pressureLinkCount,
    })),
    evidenceHelpingDefence: battleboard.evidenceHelpingDefence.map(mapEvidenceItem).filter((i) => i.label),
    evidenceHurtingDefence: battleboard.evidenceHurtingDefence.map(mapEvidenceItem).filter((i) => i.label),
    missingMaterial: battleboard.missingMaterial.map(mapEvidenceItem).filter((i) => i.label),
    contradictions: battleboard.contradictions.map(mapEvidenceItem).filter((i) => i.label),
    collapseRisks: battleboard.collapseRisks.map(sanitizeReasoningPublicText).filter(Boolean),
    routeChangeTriggers: battleboard.routeChangeTriggers.map(sanitizeReasoningPublicText).filter(Boolean),
    disclosureChasePriorities: battleboard.disclosureChasePriorities
      .map(
        (d): ReasoningV2DisclosurePriority => ({
          label: sanitizeReasoningPublicText(d.label),
          chaseNote: d.disclosureChase ? sanitizeReasoningPublicText(d.disclosureChase) : undefined,
          safeAction: d.safeHearingAction ? sanitizeReasoningPublicText(d.safeHearingAction) : undefined,
        }),
      )
      .filter((d) => d.label),
    safeNextAction: sanitizeReasoningPublicText(battleboard.safeNextAction),
    doNotOverstateWarning: sanitizeReasoningPublicText(battleboard.doNotOverstateWarning),
    humanReviewRequired: battleboard.humanReviewRequired || humanReviewReasons.length > 0,
    humanReviewReasons,
    warRoom: {
      safeHearingLine: sanitizeReasoningPublicText(warRoom.safeHearingLine),
      courtRecordRequests: warRoom.courtRecordRequests
        .map((c) => sanitizeReasoningPublicText(c.request))
        .filter(Boolean),
      disclosureTimetableRequests: warRoom.disclosureTimetableRequests
        .map((d) => sanitizeReasoningPublicText(d.request))
        .filter(Boolean),
      doNotConcede: warRoom.doNotConcede.map(sanitizeReasoningPublicText).filter(Boolean),
      doNotOverstate: sanitizeReasoningPublicText(warRoom.doNotOverstate),
      solicitorReviewRequired: warRoom.solicitorReviewRequired,
      solicitorReviewReasons: [
        ...new Set(warRoom.solicitorReviewReasons.map(sanitizeHumanReviewReason).filter(Boolean)),
      ],
    },
  };

  return viewModel;
}

export function buildReasoningV2ViewModel(input: BuildReasoningV2Input): ReasoningV2Result {
  const assessment = assessBundleAvailability(input);
  if (assessment.unavailableReason) {
    return { available: false, reason: assessment.unavailableReason };
  }
  return buildReasoningV2FromBundleText(assessment.bundleText, input.matterLabel ?? "Current matter");
}

export { confidenceLabel };
