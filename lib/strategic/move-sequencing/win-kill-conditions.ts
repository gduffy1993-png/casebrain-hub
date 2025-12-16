/**
 * Win/Kill Conditions Generator
 * 
 * Evidence-based conditions that justify or kill the case.
 */

import type { MoveSequenceInput, Observation } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";

/**
 * Generate win conditions - what must exist to justify issue
 */
export function generateWinConditions(
  input: MoveSequenceInput,
  observations: Observation[],
  evidenceMap: EvidenceMap
): string[] {
  const conditions: string[] = [];
  
  // For each high-leverage gap, define what would confirm it
  const highLeverageGaps = observations.filter(
    o => o.type === "EVIDENCE_GAP" && (o.leveragePotential === "HIGH" || o.leveragePotential === "CRITICAL")
  );

  highLeverageGaps.forEach(gap => {
    const matchingEvidence = evidenceMap.expectedEvidence.find(
      ev => gap.description.toLowerCase().includes(ev.label.toLowerCase())
    );

    if (matchingEvidence) {
      conditions.push(`${matchingEvidence.label} exists and is contemporaneous (created at time of event, not retrospectively)`);
    } else {
      conditions.push(`${gap.description.replace("Missing expected evidence: ", "")} exists and supports the case theory`);
    }
  });

  // Add timeline-based conditions
  const timelineGaps = observations.filter(o => o.type === "TIMELINE_ANOMALY");
  timelineGaps.forEach(gap => {
    conditions.push(`Records exist for gap period (${gap.relatedDates?.[0]} to ${gap.relatedDates?.[1]}) showing proper procedure was followed`);
  });

  // If no specific conditions, add generic
  if (conditions.length === 0) {
    conditions.push("Key evidence exists and is contemporaneous");
    conditions.push("No material contradictions in documentation");
  }

  return conditions.slice(0, 5); // Limit to top 5
}

/**
 * Generate kill conditions - what proves case not viable
 */
export function generateKillConditions(
  input: MoveSequenceInput,
  observations: Observation[],
  evidenceMap: EvidenceMap
): string[] {
  const conditions: string[] = [];

  // For each gap, define what would kill the theory
  const highLeverageGaps = observations.filter(
    o => o.type === "EVIDENCE_GAP" && (o.leveragePotential === "HIGH" || o.leveragePotential === "CRITICAL")
  );

  highLeverageGaps.forEach(gap => {
    const matchingEvidence = evidenceMap.expectedEvidence.find(
      ev => gap.description.toLowerCase().includes(ev.label.toLowerCase())
    );

    if (matchingEvidence) {
      conditions.push(`${matchingEvidence.label} exists, is contemporaneous, and contradicts the case theory`);
    } else {
      conditions.push(`${gap.description.replace("Missing expected evidence: ", "")} exists and shows proper procedure was followed`);
    }
  });

  // Add inconsistency-based kill conditions
  const inconsistencies = observations.filter(o => o.type === "INCONSISTENCY");
  inconsistencies.forEach(inc => {
    conditions.push(`Contradictions are resolved in opponent's favour with supporting contemporaneous evidence`);
  });

  // If no specific conditions, add generic
  if (conditions.length === 0) {
    conditions.push("Key evidence contradicts the case theory");
    conditions.push("All gaps explained with contemporaneous documentation");
  }

  return conditions.slice(0, 5); // Limit to top 5
}

