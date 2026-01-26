/**
 * Clinical Negligence Lens Config
 * 
 * Deterministic role-specific logic for clinical negligence cases.
 * NO AI generation, NO predictions, NO Bolam/Bolitho conclusions.
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

// Pre-Action Protocol gate - deterministic only
function checkPreActionProtocol(
  letterOfClaimSent: boolean | null | undefined,
  letterDate: Date | null | undefined,
  responseReceived: boolean | null | undefined
): { status: PillarStatus; reason: string } {
  if (!letterOfClaimSent) {
    return { status: "PREMATURE", reason: "Letter of claim not sent" };
  }
  
  if (!letterDate) {
    return { status: "PREMATURE", reason: "Letter of claim date not recorded" };
  }
  
  // 4-month response window
  const responseDeadline = new Date(letterDate);
  responseDeadline.setMonth(responseDeadline.getMonth() + 4);
  
  const now = new Date();
  
  if (responseReceived) {
    return { status: "SAFE", reason: "Pre-Action Protocol response received" };
  }
  
  if (now > responseDeadline) {
    return { status: "UNSAFE", reason: "Pre-Action Protocol response window elapsed without response" };
  }
  
  return { status: "PREMATURE", reason: "Pre-Action Protocol response window pending" };
}

export const clinicalNegLens: CaseLens = {
  practiceArea: "clinical_negligence",
  
  pillars: [
    {
      id: "duty",
      label: "Duty",
      evidenceDependencies: ["duty", "relationship", "standard"],
      requiresForPremature: ["duty"],
    },
    {
      id: "breach",
      label: "Breach (expert)",
      evidenceDependencies: ["expert", "breach", "medical"],
      requiresForUnsafe: ["expert"], // No breach expert → UNSAFE
    },
    {
      id: "causation",
      label: "Causation (expert)",
      evidenceDependencies: ["expert", "medical", "causation"],
      requiresForUnsafe: ["expert"], // No causation expert → UNSAFE
    },
    {
      id: "injury_prognosis",
      label: "Injury / Prognosis",
      evidenceDependencies: ["expert", "medical", "prognosis", "injury"],
      requiresForPremature: ["expert", "medical"],
    },
    {
      id: "protocol_compliance",
      label: "Protocol / Compliance",
      evidenceDependencies: ["disclosure", "protocol", "letter", "response"],
      requiresForUnsafe: ["disclosure", "protocol"], // PAP incomplete → UNSAFE
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "pre_action_protocol",
      label: "Pre-Action Protocol compliance",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Letter of claim sent and 4-month response window - protocol steps are mandatory",
    },
    {
      id: "expert_breach",
      label: "Breach expert dependency",
      condition: (ctx) => ctx.phase >= 2 && ctx.hasDisclosureGaps,
      description: () => "Breach expert report required before breach can be established - unsafe to proceed without",
    },
    {
      id: "expert_causation",
      label: "Causation expert dependency",
      condition: (ctx) => ctx.phase >= 2 && ctx.hasDisclosureGaps,
      description: () => "Causation expert report required before causation can be established - unsafe to proceed without",
    },
    {
      id: "limitation_date_knowledge",
      label: "Limitation / date of knowledge",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "3-year limitation from date of knowledge (if available) - issue proceedings before expiry",
    },
  ],
  
  judicialPatterns: [
    {
      id: "protocol_compliance",
      pattern: "Courts are generally slow to accept cases where Pre-Action Protocol has not been followed. Letter of claim and response window must be observed.",
      conditions: (ctx) => ctx.hasDisclosureGaps,
    },
    {
      id: "expert_breach_dependency",
      pattern: "Breach of duty typically requires expert evidence. Proceeding without breach expert weakens breach arguments.",
      conditions: () => true,
    },
  ],
  
  safetyChecks: [
    {
      id: "no_breach_expert",
      severity: "high",
      condition: (ctx) => {
        const hasBreachExpert = !hasEvidence(ctx.evidenceImpactMap, ["expert", "breach"]);
        return hasBreachExpert;
      },
      message: () => "Expert missing: Breach expert report outstanding. Breach pillar is UNSAFE without expert.",
    },
    {
      id: "no_causation_expert",
      severity: "high",
      condition: (ctx) => {
        const hasCausationExpert = !hasEvidence(ctx.evidenceImpactMap, ["expert", "causation"]);
        return hasCausationExpert;
      },
      message: () => "Expert missing: Causation expert report outstanding. Causation pillar is UNSAFE without expert.",
    },
    {
      id: "protocol_steps_incomplete",
      severity: "high",
      condition: (ctx) => {
        // Check for PAP completion indicators
        const hasProtocol = !hasEvidence(ctx.evidenceImpactMap, ["protocol", "letter"]);
        return hasProtocol && ctx.hasDisclosureGaps;
      },
      message: () => "Protocol steps incomplete: Pre-Action Protocol letter of claim or response missing. Required before issue.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure", "expert"],
    phase2: ["strategy", "protocol"],
    phase3: ["quantum", "outcome"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    // Breach pillar requires breach expert - UNSAFE without it
    if (pillar.id === "breach") {
      const hasBreachExpert = !hasEvidence(evidenceImpactMap, ["expert", "breach"]);
      if (hasBreachExpert) {
        return "UNSAFE";
      }
    }
    
    // Causation pillar requires causation expert - UNSAFE without it
    if (pillar.id === "causation") {
      const hasCausationExpert = !hasEvidence(evidenceImpactMap, ["expert", "causation"]);
      if (hasCausationExpert) {
        return "UNSAFE";
      }
    }
    
    // Protocol/Compliance pillar: UNSAFE if PAP incomplete
    if (pillar.id === "protocol_compliance") {
      const hasProtocol = !hasEvidence(evidenceImpactMap, ["protocol", "letter"]);
      if (hasProtocol && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (pillar.id === "breach" && !hasEvidence(evidenceImpactMap, ["expert"])) {
        return "UNSAFE";
      }
      if (pillar.id === "causation" && !hasEvidence(evidenceImpactMap, ["expert"])) {
        return "UNSAFE";
      }
      if (pillar.id === "protocol_compliance" && !hasEvidence(evidenceImpactMap, ["protocol"])) {
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
      if (pillar.id === "breach") {
        return "Breach expert report outstanding - unsafe to proceed without expert";
      }
      if (pillar.id === "causation") {
        return "Causation expert report outstanding - unsafe to proceed without expert";
      }
      if (pillar.id === "protocol_compliance") {
        return "Pre-Action Protocol steps incomplete - letter of claim or response missing";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
      if (pillar.id === "protocol_compliance") {
        return "Pre-Action Protocol response window pending";
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
