/**
 * Phase 4d — auditor probe for Reasoning V2 panel (flag-on simulation).
 * Builds product view model from pilot gold bundle text; never reads artifacts/.
 */
import { buildReasoningV2FromBundleText } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { lintReasoningV2PublicText } from "@/lib/criminal/reasoning-v2/sanitize-reasoning-text";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import type { CaseTruthManifest } from "./types";

const PILOT_CASE_TO_GOLD_BUNDLE: Record<string, string> = {
  marcus_vale: "pilot-3-marcus-vale",
  kian_doyle: "pilot-3-kian-doyle",
  leon_marsh: "pilot-3-leon-marsh",
};

function flattenReasoningV2Result(result: ReasoningV2Result): string {
  if (!result.available) return "";
  const parts = [
    result.primaryRoute,
    result.whyRouteIsLive,
    result.safeNextAction,
    result.doNotOverstateWarning,
    ...result.humanReviewReasons,
    ...result.evidenceHelpingDefence.map((e) => `${e.label} ${e.sourceBasis}`),
    ...result.evidenceHurtingDefence.map((e) => `${e.label} ${e.sourceBasis}`),
    ...result.missingMaterial.map((e) => e.label),
    ...result.contradictions.map((e) => e.label),
    result.warRoom.safeHearingLine,
    ...result.warRoom.courtRecordRequests,
    ...result.warRoom.disclosureTimetableRequests,
    ...result.warRoom.doNotConcede,
    result.warRoom.doNotOverstate,
    ...result.warRoom.solicitorReviewReasons,
  ];
  return parts.filter(Boolean).join("\n");
}

function loadPilotBundleText(manifest: CaseTruthManifest): string | null {
  const goldId = PILOT_CASE_TO_GOLD_BUNDLE[manifest.caseId];
  if (!goldId) return null;
  for (const entry of loadGoldPack()) {
    if (entry.truthKey.bundleId !== goldId || !entry.bundleTextPaths.length) continue;
    return readBundleText(entry.bundleTextPaths);
  }
  return null;
}

export type ReasoningV2AuditorProbe = {
  reasoningV2FlagSimulated: true;
  panelTestId: "reasoning-v2-panel";
  available: boolean;
  lintIssues: string[];
  routeDiffersFromExpected: boolean;
};

export function probeReasoningV2Surface(manifest: CaseTruthManifest): ReasoningV2AuditorProbe {
  const bundleText = loadPilotBundleText(manifest);
  if (!bundleText) {
    return {
      reasoningV2FlagSimulated: true,
      panelTestId: "reasoning-v2-panel",
      available: false,
      lintIssues: [],
      routeDiffersFromExpected: false,
    };
  }

  const result = buildReasoningV2FromBundleText(bundleText, manifest.caseTitle);
  const allText = flattenReasoningV2Result(result);
  const lintIssues = lintReasoningV2PublicText(allText);

  const reasoningRoute = result.available ? result.primaryRoute : "";
  const expected = manifest.expectedRouteTitle?.trim() ?? "";
  const routeDiffersFromExpected =
    Boolean(reasoningRoute && expected) &&
    !reasoningRoute.toLowerCase().includes(expected.toLowerCase().slice(0, 24)) &&
    !expected.toLowerCase().includes(reasoningRoute.toLowerCase().slice(0, 24));

  return {
    reasoningV2FlagSimulated: true,
    panelTestId: "reasoning-v2-panel",
    available: result.available,
    lintIssues,
    routeDiffersFromExpected,
  };
}

export function flattenReasoningV2ProbeForAudit(probe: ReasoningV2AuditorProbe): string {
  return [
    probe.panelTestId,
    probe.available ? "available" : "unavailable",
    ...probe.lintIssues,
    probe.routeDiffersFromExpected ? "route differs from expected manifest route" : "",
  ]
    .filter(Boolean)
    .join("\n");
}
