/**
 * Family Law Lens Config
 * 
 * Deterministic role-specific logic for family law cases.
 * NO AI generation, NO predictions, NO welfare predictions.
 */

import type { CaseLens, PillarDefinition, IrreversibleDecisionRule, JudicialPattern, SafetyCheck, ToolVisibility, PillarStatus } from "./types";

function hasEvidence(
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>,
  keys: string[]
): boolean {
  return !evidenceImpactMap.some(item => {
    const name = (item.evidenceItem.name || "").toLowerCase();
    const urgency = item.evidenceItem.urgency;
    return keys.some(key => 
      name.includes(key.toLowerCase()) && urgency === "CRITICAL"
    );
  });
}

export const familyLens: CaseLens = {
  practiceArea: "family",
  
  pillars: [
    {
      id: "threshold_welfare",
      label: "Threshold / Welfare Framework",
      evidenceDependencies: ["threshold", "welfare", "s31"],
      requiresForUnsafe: ["safeguarding"], // s31 threshold engaged → UNSAFE to concede
    },
    {
      id: "safeguarding_evidence",
      label: "Safeguarding Evidence",
      evidenceDependencies: ["safeguarding", "police", "social", "marac", "gp", "school"],
      requiresForUnsafe: ["safeguarding"], // Safeguarding evidence missing → UNSAFE
    },
    {
      id: "findings_fact",
      label: "Findings of Fact",
      evidenceDependencies: ["fact_finding", "hearing", "allegation"],
      requiresForUnsafe: ["fact_finding"], // Unresolved facts → UNSAFE to concede/settle
    },
    {
      id: "risk_management",
      label: "Risk Management",
      evidenceDependencies: ["risk", "assessment", "safety"],
      requiresForPremature: ["assessment"],
    },
    {
      id: "orders_timetable",
      label: "Orders / Timetable",
      evidenceDependencies: ["order", "timetable", "hearing"],
      requiresForPremature: ["timetable"],
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "s31_threshold",
      label: "s31 threshold engagement",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "s31 threshold engaged - LA involvement present. Conceding or settling without fact-finding is unsafe.",
    },
    {
      id: "fact_finding",
      label: "Fact-finding dependency",
      condition: (ctx) => ctx.phase >= 2 && ctx.hasDisclosureGaps,
      description: () => "Unresolved facts require fact-finding hearing before settlement or concession - unsafe to proceed without",
    },
    {
      id: "safeguarding_checklist",
      label: "Safeguarding evidence checklist",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Safeguarding evidence (police logs, social services, MARAC, GP/school) must be complete before final arrangements",
    },
  ],
  
  judicialPatterns: [
    {
      id: "s31_threshold",
      pattern: "Courts are generally slow to accept concessions or settlements where s31 threshold is engaged without fact-finding. LA involvement requires careful handling.",
      conditions: (ctx) => ctx.hasDisclosureGaps,
    },
    {
      id: "fact_finding_requirement",
      pattern: "Unresolved facts typically require fact-finding hearing. Proceeding to settlement or concession without fact-finding weakens position.",
      conditions: () => true,
    },
  ],
  
  safetyChecks: [
    {
      id: "safeguarding_evidence_missing",
      severity: "high",
      condition: (ctx) => {
        // Check for safeguarding evidence presence
        const hasSafeguarding = !hasEvidence(ctx.evidenceImpactMap, ["safeguarding", "police", "social", "marac"]);
        return hasSafeguarding && ctx.hasDisclosureGaps;
      },
      message: () => "Safeguarding evidence missing: Police logs, social services, MARAC, GP/school records required before final arrangements.",
    },
    {
      id: "fact_finding_needed",
      severity: "high",
      condition: (ctx) => {
        const hasFactFinding = !hasEvidence(ctx.evidenceImpactMap, ["fact_finding", "hearing"]);
        return hasFactFinding && ctx.hasDisclosureGaps;
      },
      message: () => "Fact-finding needed before final resolution: Unresolved allegations require fact-finding hearing before settlement or concession.",
    },
    {
      id: "s31_engaged",
      severity: "high",
      condition: (ctx) => {
        // Check for s31 threshold indicators
        const hasS31 = hasEvidence(ctx.evidenceImpactMap, ["s31", "threshold"]);
        return hasS31 && ctx.hasDisclosureGaps;
      },
      message: () => "Potential inconsistency: s31 threshold engaged but position contains concession. Requires fact-finding before settlement.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure", "safeguarding"],
    phase2: ["strategy", "fact_finding"],
    phase3: ["outcome"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    // Safeguarding Evidence pillar: UNSAFE if missing
    if (pillar.id === "safeguarding_evidence") {
      const hasSafeguarding = !hasEvidence(evidenceImpactMap, ["safeguarding", "police", "social", "marac"]);
      if (hasSafeguarding && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Findings of Fact pillar: UNSAFE if missing and facts unresolved
    if (pillar.id === "findings_fact") {
      const hasFactFinding = !hasEvidence(evidenceImpactMap, ["fact_finding", "hearing"]);
      if (hasFactFinding && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Threshold/Welfare Framework: UNSAFE if s31 engaged and fact-finding missing
    if (pillar.id === "threshold_welfare") {
      const hasS31 = hasEvidence(evidenceImpactMap, ["s31", "threshold"]);
      const hasFactFinding = !hasEvidence(evidenceImpactMap, ["fact_finding"]);
      if (hasS31 && hasFactFinding && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (pillar.id === "safeguarding_evidence" && !hasEvidence(evidenceImpactMap, ["safeguarding"])) {
        return "UNSAFE";
      }
      if (pillar.id === "findings_fact" && !hasEvidence(evidenceImpactMap, ["fact_finding"])) {
        return "UNSAFE";
      }
    }
    
    // Check for PREMATURE triggers
    if (pillar.requiresForPremature && pillar.requiresForPremature.length > 0) {
      const missing = pillar.requiresForPremature.filter(key => 
        !hasEvidence(evidenceImpactMap, [key])
      );
      if (missing.length > 0) {
        return "PREMATURE";
      }
    }
    
    // SAFE only if all required dependencies are present
    if (pillar.evidenceDependencies.length > 0) {
      const allPresent = pillar.evidenceDependencies.every(key => 
        hasEvidence(evidenceImpactMap, [key])
      );
      if (!allPresent) {
        return "PREMATURE";
      }
    }
    
    return "SAFE";
  },
  
  getPillarReason(pillar, status, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    if (status === "UNSAFE") {
      if (pillar.id === "safeguarding_evidence") {
        return "Safeguarding evidence missing (police logs, social services, MARAC, GP/school) - unsafe to proceed to final arrangements";
      }
      if (pillar.id === "findings_fact") {
        return "Fact-finding required before settlement or concession - unresolved allegations present";
      }
      if (pillar.id === "threshold_welfare") {
        return "s31 threshold engaged but fact-finding missing - unsafe to concede without fact-finding";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
      if (pillar.id === "safeguarding_evidence") {
        return "Safeguarding evidence checklist incomplete";
      }
      if (pillar.id === "findings_fact") {
        return "Fact-finding hearing not yet completed";
      }
      const missing = pillar.evidenceDependencies.filter(key => 
        !hasEvidence(evidenceImpactMap, [key])
      );
      if (missing.length > 0) {
        const missingLabel = missing[0].charAt(0).toUpperCase() + missing[0].slice(1);
        return `${missingLabel} evidence outstanding`;
      }
      return "Key evidence outstanding";
    }
    
    // SAFE
    return "Evidence present";
  },
};
