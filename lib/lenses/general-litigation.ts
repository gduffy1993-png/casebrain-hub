/**
 * General Litigation Lens Config
 * 
 * Deterministic role-specific logic for general litigation cases.
 * NO AI generation, NO predictions.
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

export const generalLitigationLens: CaseLens = {
  practiceArea: "other_litigation",
  
  pillars: [
    {
      id: "cause_action",
      label: "Cause of Action",
      evidenceDependencies: ["cause", "action", "elements"],
      requiresForPremature: ["cause"],
    },
    {
      id: "evidence_disclosure",
      label: "Evidence / Disclosure",
      evidenceDependencies: ["evidence", "document", "disclosure"],
      requiresForUnsafe: ["disclosure"], // Disclosure gaps → UNSAFE
    },
    {
      id: "defences_admissions",
      label: "Defences / Admissions",
      evidenceDependencies: ["defence", "admission", "response"],
      requiresForPremature: ["defence"],
    },
    {
      id: "procedure_deadlines",
      label: "Procedure / Deadlines",
      evidenceDependencies: ["disclosure", "protocol", "deadline", "limitation"],
      requiresForUnsafe: ["disclosure", "limitation"], // Limitation expired → UNSAFE
    },
    {
      id: "remedy_quantum",
      label: "Remedy / Quantum",
      evidenceDependencies: ["remedy", "quantum", "damages"],
      requiresForPremature: ["quantum"],
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "limitation",
      label: "Limitation period",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Limitation period expiry - issue proceedings before expiry (irreversible if missed)",
    },
    {
      id: "issue_proceedings",
      label: "Issue proceedings",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Issue proceedings - decision affects case timeline, costs, and strategy",
    },
    {
      id: "admissions_recorded",
      label: "Admissions recorded",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Admissions made or recorded - cannot be withdrawn without court permission",
    },
  ],
  
  judicialPatterns: [
    {
      id: "limitation_awareness",
      pattern: "Courts are generally slow to accept limitation extension arguments without clear justification. Issue proceedings before expiry.",
      conditions: (ctx) => ctx.hasDisclosureGaps,
    },
    {
      id: "issue_timing",
      pattern: "Issue timing affects leverage. Early issue may strengthen position, but requires sufficient evidence.",
      conditions: () => true,
    },
  ],
  
  safetyChecks: [
    {
      id: "limitation_approaching",
      severity: "high",
      condition: (ctx) => {
        // Check for limitation warning indicators
        const hasLimitationWarning = hasEvidence(ctx.evidenceImpactMap, ["limitation", "deadline"]);
        return hasLimitationWarning && ctx.hasDisclosureGaps;
      },
      message: () => "Limitation approaching: Issue proceedings before expiry or risk claim being time-barred.",
    },
    {
      id: "admissions_inconsistency",
      severity: "medium",
      condition: (ctx) => {
        // Check for admission indicators
        const hasAdmission = hasEvidence(ctx.evidenceImpactMap, ["admission"]);
        return hasAdmission && ctx.hasDisclosureGaps;
      },
      message: () => "Admissions inconsistencies: Admissions recorded but position may be inconsistent - verify before proceeding.",
    },
    {
      id: "issue_premature",
      severity: "medium",
      condition: (ctx) => {
        const missingEvidence = !hasEvidence(ctx.evidenceImpactMap, ["evidence"]);
        return missingEvidence && ctx.hasDisclosureGaps;
      },
      message: () => "Unsafe to rely on until evidence arrives: Issue proceedings requires sufficient evidence.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy", "limitation"],
    phase3: ["outcome"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    // Procedure/Deadlines pillar: UNSAFE if limitation expired
    if (pillar.id === "procedure_deadlines") {
      const hasLimitationExpired = hasEvidence(evidenceImpactMap, ["limitation", "deadline"]);
      if (hasLimitationExpired && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Evidence/Disclosure pillar: UNSAFE if disclosure gaps
    if (pillar.id === "evidence_disclosure") {
      if (hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (pillar.id === "evidence_disclosure" && hasDisclosureGaps) {
        return "UNSAFE";
      }
      if (pillar.id === "procedure_deadlines" && hasEvidence(evidenceImpactMap, ["limitation"])) {
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
      if (pillar.id === "evidence_disclosure") {
        return "Disclosure gaps create procedural risk";
      }
      if (pillar.id === "procedure_deadlines") {
        return "Limitation period expired or approaching - issue proceedings required";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
      if (pillar.id === "procedure_deadlines") {
        return "Limitation period approaching or deadline not recorded";
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
