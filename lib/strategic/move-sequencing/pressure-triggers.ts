/**
 * Pressure Triggers Generator
 * 
 * Determines when to "come in heavy" vs probe gently.
 * Never defaults to STRIKE - must be justified by evidence.
 */

import type { PressureTrigger, MoveSequenceInput, Observation } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";

/**
 * Generate pressure triggers based on observations
 */
export function generatePressureTriggers(
  input: MoveSequenceInput,
  observations: Observation[],
  evidenceMap: EvidenceMap
): PressureTrigger[] {
  const triggers: PressureTrigger[] = [];

  // Clinical Negligence specific triggers
  if (input.practiceArea === "clinical_negligence") {
    // Delay + deterioration + surgery → PRESSURE
    const hasDelay = observations.some(o => 
      o.type === "TIMELINE_ANOMALY" && 
      o.description.toLowerCase().includes("delay")
    );
    const hasDeterioration = observations.some(o =>
      o.description.toLowerCase().includes("deterioration") || 
      o.description.toLowerCase().includes("worsen")
    );
    const hasSurgery = input.documents.some(d => 
      d.name?.toLowerCase().includes("surgery") || 
      d.extracted_json?.summary?.toLowerCase().includes("surgery")
    );

    if (hasDelay && hasDeterioration && hasSurgery) {
      triggers.push({
        trigger: "Delay between presentation and treatment, with documented deterioration, leading to surgery",
        whyItMatters: "Suggests failure to recognize deterioration and escalate promptly. Delay may have caused avoidable harm requiring surgical intervention.",
        recommendedTone: "PRESSURE",
      });
    }

    // Radiology discrepancy/addendum → STRIKE
    const hasRadiologyDiscrepancy = observations.some(o =>
      o.description.toLowerCase().includes("radiology") &&
      (o.description.toLowerCase().includes("addendum") || 
       o.description.toLowerCase().includes("discrepancy"))
    );

    if (hasRadiologyDiscrepancy) {
      triggers.push({
        trigger: "Radiology report has addendum or discrepancy log indicating findings changed",
        whyItMatters: "Addenda after complaint suggest delayed recognition or retrospective correction. This is a strong indicator of breach if timing shows recognition only after complaint.",
        recommendedTone: "STRIKE",
      });
    }

    // Escalation records missing where mandatory → PRESSURE
    const missingEscalation = observations.find(o =>
      o.description.toLowerCase().includes("escalation") &&
      o.type === "EVIDENCE_GAP"
    );

    if (missingEscalation) {
      triggers.push({
        trigger: "Escalation records missing where policy requires escalation",
        whyItMatters: "Failure to escalate when red flags present suggests systemic governance failure. Cannot be explained as oversight if policy is clear.",
        recommendedTone: "PRESSURE",
      });
    }
  }

  // Housing Disrepair specific triggers
  if (input.practiceArea === "housing_disrepair") {
    // Awaab's Law breach → STRIKE
    const awaabsBreach = observations.find(o =>
      o.id === "awaabs-law-trigger" &&
      (o.leveragePotential === "CRITICAL" || o.leveragePotential === "HIGH")
    );

    if (awaabsBreach) {
      triggers.push({
        trigger: "Awaab's Law breach detected: Statutory deadline exceeded",
        whyItMatters: "Awaab's Law breach is a statutory violation. Cannot be explained away. Strengthens quantum significantly and supports urgent injunctive relief. This is the strongest leverage point in housing disrepair cases.",
        recommendedTone: "STRIKE",
      });
    }

    // Multiple complaints + no repair logs → PRESSURE
    const hasComplaints = observations.some(o =>
      o.description.toLowerCase().includes("complaint")
    );
    const missingRepairLogs = observations.some(o =>
      o.description.toLowerCase().includes("repair") &&
      o.type === "EVIDENCE_GAP"
    );

    if (hasComplaints && missingRepairLogs && !awaabsBreach) {
      triggers.push({
        trigger: "Multiple complaints documented but no repair logs or work orders",
        whyItMatters: "Suggests complaints not acted upon. Creates paper trail of inaction. Landlord cannot claim repairs were attempted if no logs exist.",
        recommendedTone: "PRESSURE",
      });
    }
  }

  // Personal Injury specific triggers
  if (input.practiceArea === "personal_injury") {
    // Mechanism inconsistency + witness statements → PRESSURE
    const hasInconsistency = observations.some(o => o.type === "INCONSISTENCY");
    const hasWitnesses = input.documents.some(d =>
      d.name?.toLowerCase().includes("witness") ||
      d.extracted_json?.summary?.toLowerCase().includes("witness")
    );

    if (hasInconsistency && hasWitnesses) {
      triggers.push({
        trigger: "Mechanism of accident described inconsistently across witness statements",
        whyItMatters: "Inconsistencies in core facts undermine credibility. If witnesses cannot agree on mechanism, liability becomes contested.",
        recommendedTone: "PRESSURE",
      });
    }
  }

  // Criminal Defence specific triggers
  if (input.practiceArea === "criminal") {
    // Disclosure gaps + unused material → STRIKE
    const missingDisclosure = observations.some(o =>
      o.description.toLowerCase().includes("disclosure") &&
      o.type === "EVIDENCE_GAP"
    );

    if (missingDisclosure) {
      triggers.push({
        trigger: "Disclosure schedules incomplete or unused material not disclosed",
        whyItMatters: "Non-disclosure is a procedural breach that can lead to stay of proceedings. This is a strong procedural lever.",
        recommendedTone: "STRIKE",
      });
    }
  }

  // Generic admin gaps → PROBE only
  const genericGaps = observations.filter(o =>
    o.type === "EVIDENCE_GAP" &&
    o.leveragePotential === "LOW" &&
    !o.description.toLowerCase().includes("radiology") &&
    !o.description.toLowerCase().includes("escalation") &&
    !o.description.toLowerCase().includes("disclosure")
  );

  if (genericGaps.length > 0 && triggers.length === 0) {
    triggers.push({
      trigger: "Administrative evidence gaps detected",
      whyItMatters: "May indicate oversight rather than systemic failure. Test with standard requests before escalating tone.",
      recommendedTone: "PROBE",
    });
  }

  // Default: if no specific triggers, probe gently
  if (triggers.length === 0) {
    triggers.push({
      trigger: "Standard evidence gaps detected",
      whyItMatters: "No high-leverage triggers identified. Proceed with standard information requests.",
      recommendedTone: "PROBE",
    });
  }

  return triggers;
}

