/**
 * Housing Disrepair Lens Config
 * 
 * Deterministic role-specific logic for housing disrepair cases.
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

// Awaab's Law detector - deterministic only
function checkAwaabsLaw(
  hazardType: string | null | undefined,
  noticeDate: Date | null | undefined,
  vulnerabilityFlags: string[] | null | undefined,
  investigationDate: Date | null | undefined,
  workStartDate: Date | null | undefined
): { status: PillarStatus; reason: string } {
  // Check if Awaab's Law applies (damp/mould + child present)
  const isDampMould = hazardType && (hazardType.toLowerCase().includes("damp") || hazardType.toLowerCase().includes("mould"));
  const hasVulnerability = vulnerabilityFlags && vulnerabilityFlags.length > 0;
  
  if (!isDampMould || !hasVulnerability) {
    return { status: "SAFE", reason: "Awaab's Law not applicable" };
  }
  
  if (!noticeDate) {
    return { status: "PREMATURE", reason: "Notice date not recorded" };
  }
  
  // 7-day assessment deadline
  const assessmentDeadline = new Date(noticeDate);
  assessmentDeadline.setDate(assessmentDeadline.getDate() + 7);
  
  // 28-day repair deadline
  const repairDeadline = new Date(noticeDate);
  repairDeadline.setDate(repairDeadline.getDate() + 28);
  
  const now = new Date();
  
  // If investigation not done within 7 days → UNSAFE
  if (!investigationDate || investigationDate > assessmentDeadline) {
    if (now > assessmentDeadline) {
      return { status: "UNSAFE", reason: "Awaab's Law: 7-day assessment deadline elapsed" };
    }
    return { status: "PREMATURE", reason: "Awaab's Law: 7-day assessment deadline approaching" };
  }
  
  // If work not started within 28 days → UNSAFE
  if (!workStartDate || workStartDate > repairDeadline) {
    if (now > repairDeadline) {
      return { status: "UNSAFE", reason: "Awaab's Law: 28-day repair deadline elapsed" };
    }
    return { status: "PREMATURE", reason: "Awaab's Law: 28-day repair deadline approaching" };
  }
  
  return { status: "SAFE", reason: "Awaab's Law deadlines met" };
}

export const housingLens: CaseLens = {
  practiceArea: "housing_disrepair",
  
  pillars: [
    {
      id: "duty_standard",
      label: "Duty / Standard",
      evidenceDependencies: ["tenancy", "landlord", "duty"],
      requiresForPremature: ["tenancy"],
    },
    {
      id: "disrepair_condition",
      label: "Disrepair Condition",
      evidenceDependencies: ["inspection", "photograph", "report", "defect"],
      requiresForPremature: ["inspection"],
    },
    {
      id: "notice_knowledge",
      label: "Notice & Knowledge",
      evidenceDependencies: ["notice", "knowledge", "complaint"],
      requiresForUnsafe: ["notice"], // Notice missing → UNSAFE to assert knowledge
    },
    {
      id: "risk_health_impact",
      label: "Risk / Health Impact",
      evidenceDependencies: ["medical", "injury", "health", "hazard"],
      requiresForPremature: ["medical"],
    },
    {
      id: "compliance_enforcement",
      label: "Compliance / Enforcement",
      evidenceDependencies: ["awaabs", "deadline", "enforcement", "ombudsman"],
      requiresForUnsafe: ["awaabs"], // Awaab's Law deadline breach → UNSAFE
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "issue_claim_injunction",
      label: "Issue claim / seek injunction",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Issue proceedings or seek urgent injunction - decision affects case timeline and costs",
    },
    {
      id: "escalate_ombudsman",
      label: "Escalate to Environmental Health / Ombudsman",
      condition: (ctx) => ctx.phase >= 2 && ctx.hasDisclosureGaps,
      description: () => "Escalate to Environmental Health or Housing Ombudsman - may affect landlord response and case strategy",
    },
    {
      id: "notice_knowledge",
      label: "Notice & Knowledge recording",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Notice date and method of knowledge must be recorded before liability can be established",
    },
    {
      id: "awaabs_deadline",
      label: "Awaab's Law deadline",
      condition: (ctx) => ctx.phase >= 2,
      description: () => "Awaab's Law deadlines (7-day assessment, 28-day repair) are statutory and cannot be extended",
    },
  ],
  
  judicialPatterns: [
    {
      id: "awaabs_compliance",
      pattern: "Courts are generally slow to accept landlord defences where Awaab's Law deadlines have been missed without clear justification.",
      conditions: (ctx) => ctx.hasDisclosureGaps,
    },
    {
      id: "notice_requirement",
      pattern: "Notice and knowledge are threshold requirements. Without clear evidence of when and how the landlord knew, liability arguments are weakened.",
      conditions: () => true,
    },
  ],
  
  safetyChecks: [
    {
      id: "awaabs_breach",
      severity: "high",
      condition: (ctx) => {
        // Check for Awaab's Law deadline breach indicators
        const hasAwaabDeadline = hasEvidence(ctx.evidenceImpactMap, ["awaabs", "deadline"]);
        return hasAwaabDeadline && ctx.hasDisclosureGaps;
      },
      message: () => "Awaab's Law: Statutory deadline breach detected. Requires urgent action.",
    },
    {
      id: "notice_missing",
      severity: "high",
      condition: (ctx) => {
        // Check if notice date is missing
        const hasNotice = !hasEvidence(ctx.evidenceImpactMap, ["notice", "complaint"]);
        return !hasNotice;
      },
      message: () => "Notice missing: Unsafe to assert knowledge without recorded notice date and method.",
    },
    {
      id: "deadline_passed",
      severity: "high",
      condition: (ctx) => {
        // Check for passed deadline indicators
        const hasDeadline = hasEvidence(ctx.evidenceImpactMap, ["deadline", "awaabs"]);
        return hasDeadline && ctx.hasDisclosureGaps;
      },
      message: () => "Deadline passed: Escalation window - consider Environmental Health / Ombudsman action.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure", "notice"],
    phase2: ["strategy", "awaabs"],
    phase3: ["quantum", "outcome"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    // Notice & Knowledge pillar: UNSAFE if notice missing
    if (pillar.id === "notice_knowledge") {
      const hasNotice = !hasEvidence(evidenceImpactMap, ["notice", "complaint"]);
      if (hasNotice) {
        return "UNSAFE";
      }
    }
    
    // Compliance/Enforcement pillar: UNSAFE if Awaab's Law deadline breached
    if (pillar.id === "compliance_enforcement") {
      const hasAwaabBreach = hasEvidence(evidenceImpactMap, ["awaabs", "deadline"]);
      if (hasAwaabBreach && hasDisclosureGaps) {
        return "UNSAFE";
      }
    }
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (pillar.id === "notice_knowledge" && !hasEvidence(evidenceImpactMap, ["notice"])) {
        return "UNSAFE";
      }
      if (pillar.id === "compliance_enforcement" && hasEvidence(evidenceImpactMap, ["awaabs"])) {
        return "UNSAFE";
      }
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
      if (pillar.id === "notice_knowledge") {
        return "Notice date or method of knowledge not recorded - unsafe to assert knowledge";
      }
      if (pillar.id === "compliance_enforcement") {
        return "Awaab's Law deadline breach detected - statutory deadline elapsed";
      }
      if (pillar.id === "procedure") {
        return "Disclosure gaps create procedural risk";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
      if (pillar.id === "notice_knowledge") {
        return "Notice date not recorded";
      }
      if (pillar.id === "compliance_enforcement") {
        return "Awaab's Law deadline approaching or not yet assessed";
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
    if (pillar.id === "compliance_enforcement") {
      return "Awaab's Law deadlines met and compliance verified";
    }
    return "Evidence present and deadlines met";
  },
};
