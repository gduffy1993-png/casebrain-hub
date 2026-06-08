/**
 * Personal Injury Lens Config
 * 
 * Deterministic role-specific logic for personal injury cases.
 * NO AI generation, NO predictions, NO liability conclusions.
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

// Limitation countdown - deterministic only
function checkLimitation(
  accidentDate: Date | null | undefined
): { daysRemaining: number | null; isExpired: boolean; status: PillarStatus; reason: string } {
  if (!accidentDate) {
    return { daysRemaining: null, isExpired: false, status: "PREMATURE", reason: "Accident date not recorded" };
  }
  
  const limitationDate = new Date(accidentDate);
  limitationDate.setFullYear(limitationDate.getFullYear() + 3);
  
  const now = new Date();
  const daysRemaining = Math.floor((limitationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  
  if (isExpired) {
    return { daysRemaining: 0, isExpired: true, status: "UNSAFE", reason: "Limitation period expired" };
  }
  
  if (daysRemaining <= 30) {
    return { daysRemaining, isExpired: false, status: "UNSAFE", reason: `Limitation expires in ${daysRemaining} days - irreversible decision required` };
  }
  
  if (daysRemaining <= 90) {
    return { daysRemaining, isExpired: false, status: "PREMATURE", reason: `Limitation expires in ${daysRemaining} days` };
  }
  
  return { daysRemaining, isExpired: false, status: "SAFE", reason: `Limitation expires in ${daysRemaining} days` };
}

export const piLens: CaseLens = {
  practiceArea: "personal_injury",
  
  pillars: [
    {
      id: "duty",
      label: "Duty",
      evidenceDependencies: ["duty", "relationship", "standard"],
      requiresForPremature: ["duty"],
    },
    {
      id: "breach",
      label: "Breach",
      evidenceDependencies: ["breach", "negligence", "standard"],
      requiresForPremature: ["breach"],
    },
    {
      id: "causation",
      label: "Causation",
      evidenceDependencies: ["medical", "expert", "causation"],
      requiresForPremature: ["medical"],
    },
    {
      id: "injury_prognosis",
      label: "Injury / Prognosis",
      evidenceDependencies: ["medical", "expert", "prognosis", "injury"],
      requiresForPremature: ["medical", "expert"], // Medical evidence gate
    },
    {
      id: "quantum_settlement",
      label: "Quantum / Settlement",
      evidenceDependencies: ["medical", "expert", "quantum", "part36"],
      requiresForPremature: ["medical", "expert"], // Medical expert required
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "limitation_expiry",
      label: "Limitation period expiry",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "3-year limitation period from accident date - issue proceedings before expiry (irreversible if missed)",
    },
    {
      id: "part36_response",
      label: "Part 36 offer response",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Part 36 offer made/received - response period is time-limited and affects costs",
    },
    {
      id: "expert_quantum",
      label: "Medical expert for quantum",
      condition: (ctx) => ctx.phase >= 2 && ctx.hasDisclosureGaps,
      description: () => "Medical expert report required before quantum can be established",
    },
  ],
  
  judicialPatterns: [
    {
      id: "limitation_awareness",
      pattern: "Courts are generally slow to accept limitation extension arguments without clear justification. Issue proceedings before expiry.",
      conditions: (ctx) => ctx.hasDisclosureGaps,
    },
    {
      id: "expert_dependency",
      pattern: "Quantum assessments typically require medical expert evidence. Proceeding without expert report weakens quantum arguments.",
      conditions: () => true,
    },
  ],
  
  safetyChecks: [
    {
      id: "limitation_approaching",
      severity: "high",
      condition: (ctx) => {
        // Check for limitation warning indicators (would need accident date in real implementation)
        const hasLimitationWarning = hasEvidence(ctx.evidenceImpactMap, ["limitation", "deadline"]);
        return hasLimitationWarning && ctx.hasDisclosureGaps;
      },
      message: () => "Limitation approaching: Issue proceedings before expiry or risk claim being time-barred.",
    },
    {
      id: "settlement_offer_outstanding",
      severity: "medium",
      condition: (ctx) => {
        // Check for Part 36 offer indicators
        const hasOffer = hasEvidence(ctx.evidenceImpactMap, ["part36", "offer"]);
        return hasOffer && ctx.hasDisclosureGaps;
      },
      message: () => "Settlement offer outstanding without instructions: Part 36 offer response period requires client decision.",
    },
    {
      id: "expert_missing",
      severity: "high",
      condition: (ctx) => {
        const hasExpert = !hasEvidence(ctx.evidenceImpactMap, ["expert", "medical"]);
        return !hasExpert && ctx.hasDisclosureGaps;
      },
      message: () => "Medical expert report outstanding. Injury/Quantum pillars are PREMATURE until expert evidence received.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure", "expert"],
    phase2: ["strategy", "limitation"],
    phase3: ["quantum", "outcome"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    // Injury/Prognosis and Quantum/Settlement pillars require medical expert
    if (pillar.id === "injury_prognosis" || pillar.id === "quantum_settlement") {
      const hasExpert = !hasEvidence(evidenceImpactMap, ["expert", "medical"]);
      if (hasExpert) {
        return "PREMATURE";
      }
    }
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (hasDisclosureGaps && pillar.id === "procedure") {
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
      if (pillar.id === "procedure") {
        return "Disclosure gaps create procedural risk";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
      if (pillar.id === "injury_prognosis" || pillar.id === "quantum_settlement") {
        const hasExpert = !hasEvidence(evidenceImpactMap, ["expert", "medical"]);
        if (hasExpert) {
          return "Medical expert report outstanding";
        }
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
