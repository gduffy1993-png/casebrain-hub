/**
 * Hypothesis Generator
 * 
 * Converts observations into testable hypotheses and investigation angles.
 */

import type { Observation, InvestigationAngle } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";
import type { CaseAnchors } from "./case-anchors";
import { injectAnchors } from "./case-anchors";

/**
 * Generate investigation angle from observation
 */
export function generateInvestigationAngle(
  observation: Observation,
  evidenceMap: EvidenceMap,
  anchors?: CaseAnchors
): InvestigationAngle {
  // Find matching expected evidence from map
  const matchingEvidence = evidenceMap.expectedEvidence.find(
    ev => ev.id === observation.id.replace("evidence-gap-", "") || 
          observation.description.toLowerCase().includes(ev.label.toLowerCase())
  );
  
  // Generate hypothesis
  let hypothesis = "";
  let confirmationCondition = "";
  let killCondition = "";
  let targetedRequest = "";
  let expectedResponse = "";
  
  if (observation.type === "EVIDENCE_GAP") {
    hypothesis = `If ${observation.whatShouldExist} was properly done/maintained, then ${observation.description.replace("Missing expected evidence: ", "")} should exist`;
    confirmationCondition = `If ${observation.description.replace("Missing expected evidence: ", "")} is produced, confirms proper maintenance/procedure`;
    killCondition = `If ${observation.description.replace("Missing expected evidence: ", "")} cannot be produced or contradicts claim, suggests failure`;
    let baseRequest = matchingEvidence?.probeQuestion || `Request ${observation.description.replace("Missing expected evidence: ", "")} and all related documentation`;
    if (anchors) {
      baseRequest = injectAnchors(baseRequest, anchors);
    }
    targetedRequest = baseRequest;
    expectedResponse = "Opponent should produce requested evidence or explain absence";
  } else if (observation.type === "TIMELINE_ANOMALY") {
    hypothesis = `If events were properly documented, then activity should be recorded during the gap period`;
    confirmationCondition = "If records exist for gap period, confirms proper documentation";
    killCondition = "If no records exist for gap period, suggests failure to document or act";
    targetedRequest = `Request all records, communications, and documentation for the period ${observation.relatedDates?.[0]} to ${observation.relatedDates?.[1]}`;
    expectedResponse = "Opponent should produce records for gap period or explain absence";
  } else if (observation.type === "INCONSISTENCY") {
    hypothesis = `If narrative is consistent, then all documents should tell the same story`;
    confirmationCondition = "If documents are consistent, confirms reliable narrative";
    killCondition = "If contradictions remain, suggests unreliable evidence or evolving story";
    targetedRequest = `Request clarification on contradictory statements and all related documentation`;
    expectedResponse = "Opponent should clarify contradictions or explain discrepancies";
  } else if (observation.type === "GOVERNANCE_GAP") {
    hypothesis = `If governance rules were followed, then evidence of compliance should exist`;
    confirmationCondition = "If compliance evidence exists, confirms proper governance";
    killCondition = "If compliance evidence missing, suggests governance failure";
    targetedRequest = `Request evidence of compliance with: ${observation.description.replace("Potential governance gap: ", "")}`;
    expectedResponse = "Opponent should produce compliance evidence or explain absence";
  } else {
    // Generic fallback
    hypothesis = `If proper procedures were followed, then ${observation.whatShouldExist} should exist`;
    confirmationCondition = `If ${observation.whatShouldExist} exists, confirms proper procedure`;
    killCondition = `If ${observation.whatShouldExist} missing, suggests procedural failure`;
    targetedRequest = `Request ${observation.whatShouldExist} and all related documentation`;
    expectedResponse = "Opponent should produce requested evidence or explain absence";
  }
  
  return {
    id: `angle-${observation.id}`,
    observationId: observation.id,
    hypothesis,
    confirmationCondition,
    killCondition,
    targetedRequest,
    expectedResponse,
  };
}

/**
 * Generate investigation angles for all observations
 */
export function generateInvestigationAngles(
  observations: Observation[],
  evidenceMap: EvidenceMap,
  anchors?: CaseAnchors
): InvestigationAngle[] {
  return observations.map(obs => generateInvestigationAngle(obs, evidenceMap, anchors));
}

