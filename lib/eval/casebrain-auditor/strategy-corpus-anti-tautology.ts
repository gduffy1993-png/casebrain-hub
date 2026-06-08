import { generateBattleboardView } from "./battleboard-view-generate";
import { generateProofMap } from "./proof-map-generate";
import { generateWarRoomView } from "./war-room-view-generate";
import type { CorpusScoreCheck } from "./strategy-corpus-types";

export type AntiTautologyResult = {
  checks: CorpusScoreCheck[];
  failures: string[];
};

/** Scoring must inspect generated stack outputs — not manifest fields alone. */
export function evaluateAntiTautology(
  bundleId: string,
  label: string,
  bundleText: string,
): AntiTautologyResult {
  const checks: CorpusScoreCheck[] = [];
  const failures: string[] = [];

  const textRendered =
    bundleText.includes("=== SECTION:") &&
    !/^#\s*Manifest-only stub/m.test(bundleText.trim());
  checks.push({
    id: "anti_tautology_text_rendered",
    pass: textRendered,
    detail: textRendered ? "bundle text contains rendered sections" : "manifest-only or stub text",
  });
  if (!textRendered) {
    failures.push("anti-tautology: scoring requires text-rendered bundle output");
  }

  const proofMap = generateProofMap(bundleId, label, bundleText);
  const validProofIds = new Set(proofMap.proofPoints.map((p) => p.id));

  const orphanLinks = proofMap.links.filter((l) => !validProofIds.has(l.proofPointId));
  checks.push({
    id: "anti_tautology_proof_map_link_ids",
    pass: orphanLinks.length === 0 && proofMap.links.length > 0,
    detail: `${proofMap.links.length} link(s); ${orphanLinks.length} orphan proofPointId(s)`,
  });
  if (orphanLinks.length) {
    failures.push(`anti-tautology: proof map links with orphan proofPointId (${orphanLinks.length})`);
  }

  const linksHaveIssueRef = proofMap.links.every(
    (l) => Boolean(l.label?.trim()) && Boolean(l.proofPointId) && Boolean(l.doNotOverstate?.trim()),
  );
  checks.push({
    id: "anti_tautology_proof_map_issue_refs",
    pass: linksHaveIssueRef,
    detail: "each link has label, proofPointId, doNotOverstate",
  });
  if (!linksHaveIssueRef) {
    failures.push("anti-tautology: proof map link missing label/proofPointId/doNotOverstate");
  }

  const battleboard = generateBattleboardView(proofMap, bundleText);
  const bbItems = [
    ...battleboard.missingMaterial,
    ...battleboard.contradictions,
    ...battleboard.evidenceHelpingDefence,
    ...battleboard.evidenceHurtingDefence,
  ];
  const bbMissingProofId = bbItems.filter((i) => !i.proofPointId?.trim());
  const bbOrphanProofId = bbItems.filter((i) => i.proofPointId && !validProofIds.has(i.proofPointId));
  checks.push({
    id: "anti_tautology_battleboard_proof_ids",
    pass: bbMissingProofId.length === 0 && bbOrphanProofId.length === 0,
    detail: `${bbItems.length} item(s) on battleboard evidence views`,
  });
  if (bbMissingProofId.length || bbOrphanProofId.length) {
    failures.push("anti-tautology: battleboard item missing or orphan proofPointId");
  }

  const warRoom = generateWarRoomView(proofMap);
  const wrItems = [
    ...warRoom.courtRecordRequests,
    ...warRoom.disclosureTimetableRequests,
    ...warRoom.prosecutionResponsePoints,
    ...warRoom.nextHearingActions,
  ];
  const wrMissingProofId = wrItems.filter((i) => !("proofPointId" in i) || !i.proofPointId?.trim());
  const wrOrphanProofId = wrItems.filter(
    (i) => "proofPointId" in i && i.proofPointId && !validProofIds.has(i.proofPointId),
  );
  checks.push({
    id: "anti_tautology_war_room_proof_ids",
    pass: wrMissingProofId.length === 0 && wrOrphanProofId.length === 0,
    detail: `${wrItems.length} war room item(s) with proofPointId`,
  });
  if (wrMissingProofId.length || wrOrphanProofId.length) {
    failures.push("anti-tautology: war room item missing or orphan proofPointId");
  }

  const stackDerived =
    proofMap.links.some((l) => l.linkedExplanationIssue || l.sourceBasis) &&
    Boolean(battleboard.whyRouteIsLive?.trim()) &&
    Boolean(warRoom.safeHearingLine?.trim());
  checks.push({
    id: "anti_tautology_stack_derived",
    pass: stackDerived,
    detail: "proof map links and battleboard/war room lines derived from bundle text pipeline",
  });
  if (!stackDerived) {
    failures.push("anti-tautology: stack output not demonstrably derived from bundle pipeline");
  }

  return { checks, failures: [...new Set(failures)] };
}
