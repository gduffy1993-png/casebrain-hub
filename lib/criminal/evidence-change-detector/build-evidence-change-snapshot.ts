import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeEvidenceChangeLabel } from "./evidence-change-sanitize";
import type { EvidenceChangeSnapshot } from "./evidence-change-types";

function labelList(
  items: Array<{ label: string } | string>,
  cap = 12,
): string[] {
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

export type BuildSnapshotParams = {
  reasoning: ReasoningV2ViewModel;
  clientStress?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput;
  timestamp?: string;
};

export function buildEvidenceChangeSnapshot(params: BuildSnapshotParams): EvidenceChangeSnapshot {
  const { reasoning, clientStress = null, readinessInput = {}, timestamp } = params;
  const readiness = buildPreHearingReadiness(reasoning, clientStress, readinessInput);
  const readinessLevel = readiness.available ? readiness.level : "amber";

  const doNotConcedeLabels = labelList([
    ...(clientStress?.doNotConcedeGuards.map((g) => g.concessionRiskLabel) ?? []),
    ...reasoning.warRoom.doNotConcede,
  ]);

  const clientInstructionLabels = labelList([
    ...(clientStress?.clientInstructionChecklist.map((c) => c.questionText) ?? []),
    ...(clientStress?.clientInstructionQuestions ?? []),
  ]);

  return {
    routeLabel: sanitizeEvidenceChangeLabel(reasoning.primaryRoute || "Route not recorded"),
    readinessLevel,
    humanReviewRequired:
      reasoning.humanReviewRequired ||
      reasoning.warRoom.solicitorReviewRequired ||
      (readiness.available ? readiness.solicitorReviewRequired : true),
    missingMaterialLabels: labelList(reasoning.missingMaterial),
    contradictionLabels: labelList(reasoning.contradictions),
    proofPressureLabels: labelList(
      reasoning.proofPointsUnderPressure.map(
        (p) => `${p.label} (${p.pressureCount} pressure link(s))`,
      ),
    ),
    disclosureChaseLabels: labelList(
      reasoning.disclosureChasePriorities.map((d) => d.label),
    ),
    doNotConcedeLabels,
    clientInstructionLabels,
    safeNextAction: sanitizeEvidenceChangeLabel(
      reasoning.safeNextAction || "Review served papers before fixing hearing position.",
    ),
    warRoomHearingLine: sanitizeEvidenceChangeLabel(
      reasoning.warRoom.safeHearingLine || "Safe hearing wording not recorded on current papers.",
    ),
    timestamp: timestamp ?? new Date().toISOString(),
  };
}
