import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import { surfaceContradictions } from "@/lib/criminal/five-answers/contradiction-surface";
import {
  buildEvidenceSourceState,
  type BuildEvidenceSourceStateInput,
} from "@/lib/criminal/evidence-change-detector/build-evidence-source-state";
import { sanitizeEvidenceChangeLabel } from "@/lib/criminal/evidence-change-detector/evidence-change-sanitize";
import type { EvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-types";

function labelList(items: Array<{ label: string } | string>, cap = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const raw = typeof item === "string" ? item : item.label;
    const s = sanitizeEvidenceChangeLabel(raw);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function matterReadiness(bundleHealth: string, documentCount: number): PreHearingReadinessLevel {
  if (documentCount === 0) return "red";
  if (/thin|provisional|not ready|limited/i.test(bundleHealth)) return "amber";
  return "green";
}

export type BuildMatterEvidenceSnapshotInput = {
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan;
  primaryRouteTitle: string | null;
  documentCount?: number;
  sourceStateInput?: BuildEvidenceSourceStateInput | null;
  timestamp?: string;
};

/** Matter-brief snapshot for compare — no reasoning-v2 dependency. */
export function buildMatterEvidenceSnapshot(input: BuildMatterEvidenceSnapshotInput): EvidenceChangeSnapshot {
  const {
    warRoom,
    chase,
    briefPlan,
    primaryRouteTitle,
    documentCount = 0,
    sourceStateInput = null,
    timestamp,
  } = input;

  const contradictions = surfaceContradictions(warRoom.bundleContradictions ?? []).map((c) => c.label);

  return {
    routeLabel: sanitizeEvidenceChangeLabel(primaryRouteTitle || briefPlan.summaryAngle || "Route not recorded"),
    readinessLevel: matterReadiness(warRoom.bundleHealth, documentCount),
    humanReviewRequired: true,
    missingMaterialLabels: labelList([
      ...briefPlan.missingEvidence.map((m) => m.label),
      ...chase.primaryItems.map((i) => i.label),
    ]),
    contradictionLabels: labelList(contradictions),
    proofPressureLabels: labelList(briefPlan.servedEvidence.map((e) => e.label)),
    disclosureChaseLabels: labelList(chase.primaryItems.map((i) => i.label)),
    doNotConcedeLabels: labelList(warRoom.doNotOverstate),
    clientInstructionLabels: labelList(warRoom.instructionsNeeded),
    safeNextAction: sanitizeEvidenceChangeLabel(
      warRoom.nextHearingMoves[0] || "Review served papers before fixing hearing position.",
    ),
    warRoomHearingLine: sanitizeEvidenceChangeLabel(
      chase.safeCourtLine?.trim() ||
        warRoom.safePositionToday?.trim() ||
        "Safe hearing wording not recorded on current papers.",
    ),
    timestamp: timestamp ?? new Date().toISOString(),
    sourceState: sourceStateInput ? buildEvidenceSourceState(sourceStateInput) : undefined,
  };
}
