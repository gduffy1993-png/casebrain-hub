/**
 * Partner Verdict Generator
 * 
 * Generates senior solicitor assessment - blunt, evidence-based, actionable.
 */

import type { PartnerVerdict, MoveSequenceInput, Observation } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";

/**
 * Determine case stage based on evidence and timeline
 */
function determineCaseStage(
  input: MoveSequenceInput,
  observations: Observation[]
): string {
  const hasKeyEvidence = observations.filter(o => o.type === "EVIDENCE_GAP" && o.leveragePotential === "HIGH").length === 0;
  const hasTimelineGaps = observations.some(o => o.type === "TIMELINE_ANOMALY");
  const docCount = input.documents.length;

  if (docCount === 0) {
    return "Initial intake – no evidence bundle yet";
  }

  if (hasTimelineGaps && !hasKeyEvidence) {
    return "Evidence build – pre-breach lock-in";
  }

  if (hasKeyEvidence && docCount > 5) {
    return "Pre-action – testing liability position";
  }

  if (docCount > 10) {
    return "Post-disclosure – refining case theory";
  }

  return "Evidence gathering – establishing chronology";
}

/**
 * Generate current reality assessment
 */
function generateCurrentReality(
  input: MoveSequenceInput,
  observations: Observation[],
  evidenceMap: EvidenceMap
): string {
  const criticalGaps = observations.filter(o => o.leveragePotential === "CRITICAL" || o.leveragePotential === "HIGH");
  const timelineIssues = observations.filter(o => o.type === "TIMELINE_ANOMALY");
  const inconsistencies = observations.filter(o => o.type === "INCONSISTENCY");

  if (criticalGaps.length === 0 && timelineIssues.length === 0) {
    return "Bundle appears complete. No obvious evidence gaps detected. Proceed to expert instruction if causation/breach questions remain.";
  }

  const gapDescriptions = criticalGaps.slice(0, 2).map(g => g.description).join("; ");
  const timelineDesc = timelineIssues.length > 0 ? ` Timeline gaps suggest delayed documentation or response.` : "";
  const inconsistencyDesc = inconsistencies.length > 0 ? ` Narrative inconsistencies require clarification.` : "";

  return `Missing ${criticalGaps.length} critical evidence item${criticalGaps.length !== 1 ? "s" : ""}: ${gapDescriptions}.${timelineDesc}${inconsistencyDesc} Cannot justify expert spend until these gaps are tested.`;
}

/**
 * Identify fastest upgrade path
 */
function identifyFastestUpgradePath(
  observations: Observation[],
  evidenceMap: EvidenceMap
): string {
  // Find highest leverage, lowest cost move
  const highLeverage = observations.filter(o => o.leveragePotential === "HIGH" || o.leveragePotential === "CRITICAL");
  
  if (highLeverage.length === 0) {
    return "No obvious quick wins. Proceed with standard disclosure requests.";
  }

  const topGap = highLeverage[0];
  const matchingEvidence = evidenceMap.expectedEvidence.find(
    ev => topGap.description.toLowerCase().includes(ev.label.toLowerCase())
  );

  if (matchingEvidence) {
    return `Request ${matchingEvidence.label.toLowerCase()}. If absent, confirms failure. If produced now, test authenticity.`;
  }

  return `Request ${topGap.description.replace("Missing expected evidence: ", "")}. This is the cheapest test of core theory.`;
}

/**
 * Identify what flips the case
 */
function identifyWhatFlipsCase(
  observations: Observation[],
  evidenceMap: EvidenceMap
): string {
  const criticalGaps = observations.filter(o => o.leveragePotential === "CRITICAL");
  
  if (criticalGaps.length === 0) {
    return "No single evidence item identified as case-flipping. Review bundle completeness and expert opinion required.";
  }

  const topGap = criticalGaps[0];
  const matchingEvidence = evidenceMap.expectedEvidence.find(
    ev => topGap.description.toLowerCase().includes(ev.label.toLowerCase())
  );

  if (matchingEvidence) {
    return `${matchingEvidence.label}: If this exists and is contemporaneous, case strengthens. If absent or late-created, confirms breach/negligence.`;
  }

  return `${topGap.description.replace("Missing expected evidence: ", "")}: This evidence would confirm or refute the core theory.`;
}

/**
 * Generate partner verdict
 */
export function generatePartnerVerdict(
  input: MoveSequenceInput,
  observations: Observation[],
  evidenceMap: EvidenceMap
): PartnerVerdict | null {
  // Only generate if we have observations
  if (observations.length === 0) {
    return null;
  }

  return {
    caseStage: determineCaseStage(input, observations),
    currentReality: generateCurrentReality(input, observations, evidenceMap),
    fastestUpgradePath: identifyFastestUpgradePath(observations, evidenceMap),
    whatFlipsThisCase: identifyWhatFlipsCase(observations, evidenceMap),
  };
}

