/**
 * Criminal Lens Config
 * 
 * Reproduces EXACT current criminal behavior.
 * DO NOT change logic - this must match existing behavior exactly.
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

function isS18S20Case(primaryStrategy?: string, intentArgument?: string): boolean {
  if (primaryStrategy === "charge_reduction" || primaryStrategy === "fight_charge") {
    return true;
  }
  if (intentArgument) {
    const lower = intentArgument.toLowerCase();
    return lower.includes("s18") || lower.includes("s20");
  }
  return false;
}

export const criminalLens: CaseLens = {
  practiceArea: "criminal",
  
  pillars: [
    // s18/s20 pillars (dynamic based on case type)
    {
      id: "identification",
      label: "Identification",
      evidenceDependencies: ["cctv", "bwv", "identification"],
      requiresForPremature: ["cctv", "identification"],
    },
    {
      id: "act_causation",
      label: "Act & Causation",
      evidenceDependencies: ["continuity", "999"],
      requiresForPremature: ["continuity"],
    },
    {
      id: "injury_classification",
      label: "Injury / Classification",
      evidenceDependencies: ["medical", "injury"],
      requiresForPremature: ["medical"],
    },
    {
      id: "intent",
      label: "Intent (s18 vs s20)",
      evidenceDependencies: ["medical", "cctv"],
      requiresForPremature: ["medical", "cctv"],
    },
    // Generic pillars (fallback)
    {
      id: "elements_act",
      label: "Elements / Act",
      evidenceDependencies: [],
      requiresForUnsafe: [], // Triggered by disclosure gaps
    },
    {
      id: "mental_element",
      label: "Mental Element",
      evidenceDependencies: [],
      requiresForUnsafe: [], // Triggered by disclosure gaps
    },
    {
      id: "procedure_disclosure",
      label: "Procedure / Disclosure",
      evidenceDependencies: [],
      requiresForUnsafe: [], // Triggered by disclosure gaps
    },
    {
      id: "sentencing_outcome",
      label: "Sentencing / Outcome",
      evidenceDependencies: [],
    },
  ],
  
  irreversibleDecisions: [
    {
      id: "ptph_plea",
      label: "PTPH plea decision",
      condition: (ctx) => !ctx.hasPTPH && ctx.phase >= 2,
      description: () => "PTPH plea decision window approaching",
    },
    {
      id: "disclosure_app",
      label: "Disclosure application timing",
      condition: (ctx) => ctx.hasDisclosureGaps && ctx.phase >= 2,
      description: () => "Disclosure application timing affects leverage",
    },
    {
      id: "trial_theory",
      label: "Trial theory finalisation",
      condition: (ctx) => ctx.primaryStrategy === "fight_charge" && ctx.phase >= 2,
      description: () => "Trial theory finalisation before disclosure may limit flexibility",
    },
  ],
  
  judicialPatterns: [
    {
      id: "turnbull_compliance",
      pattern: "Courts are generally slow to accept identification challenges without early Turnbull compliance requests.",
      conditions: (ctx) => ctx.primaryStrategy === "fight_charge",
    },
    {
      id: "disclosure_before_theory",
      pattern: "Judges often expect disclosure requests to precede trial theory finalisation.",
      conditions: (ctx) => ctx.primaryStrategy === "fight_charge",
    },
    {
      id: "late_disclosure_scepticism",
      pattern: "Late disclosure applications may attract scepticism if not preceded by documented chase sequences.",
      conditions: (ctx) => ctx.hasDisclosureGaps && ctx.primaryStrategy === "fight_charge",
    },
    {
      id: "ptph_flexibility",
      pattern: "Trial posture established before PTPH may limit later flexibility if disclosure changes the case.",
      conditions: (ctx) => !ctx.hasPTPH && ctx.primaryStrategy === "fight_charge",
    },
    {
      id: "charge_reduction_medical",
      pattern: "Charge reduction arguments are typically only tolerated where medical evidence clearly supports recklessness over intent.",
      conditions: (ctx) => ctx.primaryStrategy === "charge_reduction",
    },
    {
      id: "early_intent_challenge",
      pattern: "Judges often expect early indication of intent challenge, not late-stage negotiation.",
      conditions: (ctx) => ctx.primaryStrategy === "charge_reduction",
    },
    {
      id: "medical_gaps_charge_reduction",
      pattern: "Medical evidence gaps may undermine charge reduction if not addressed before PTPH.",
      conditions: (ctx) => ctx.hasDisclosureGaps && ctx.primaryStrategy === "charge_reduction",
    },
    {
      id: "plea_timing_irreversible",
      pattern: "Plea timing decisions are generally irreversible once PTPH passes.",
      conditions: (ctx) => ctx.primaryStrategy === "outcome_management",
    },
    {
      id: "consistent_mitigation",
      pattern: "Courts typically expect consistent mitigation language across position statements and sentencing submissions.",
      conditions: (ctx) => ctx.primaryStrategy === "outcome_management",
    },
    {
      id: "inconsistent_position",
      pattern: "Inconsistent positions between recorded defence stance and plea may attract judicial scrutiny.",
      conditions: (ctx) => {
        if (ctx.primaryStrategy !== "outcome_management") return false;
        if (!ctx.savedPosition) return false;
        const text = (ctx.savedPosition.position_text || "").toLowerCase();
        return text.includes("deny");
      },
    },
  ],
  
  safetyChecks: [
    {
      id: "position_mitigation_tension",
      severity: "high",
      condition: (ctx) => {
        if (ctx.primaryStrategy !== "outcome_management") return false;
        if (!ctx.savedPosition) return false;
        const text = (ctx.savedPosition.position_text || "").toLowerCase();
        return text.includes("deny") || text.includes("not") || text.includes("dispute");
      },
      message: () => "Potential inconsistency: Position contains denial but outcome management strategy active. Requires solicitor confirmation.",
    },
    {
      id: "disclosure_dependency_unmet",
      severity: "high",
      condition: (ctx) => {
        if (ctx.primaryStrategy !== "fight_charge") return false;
        if (!ctx.hasDisclosureGaps) return false;
        const criticalGaps = ctx.evidenceImpactMap.filter(item => {
          const name = (item.evidenceItem.name || "").toLowerCase();
          return name.includes("cctv") || name.includes("continuity") || 
                 name.includes("bwv") || name.includes("999");
        });
        return criticalGaps.length > 0;
      },
      message: () => "Disclosure dependency unmet: Key disclosure items (CCTV/continuity/BWV/999) outstanding. Unsafe to rely on trial strategy until evidence arrives.",
    },
    {
      id: "irreversible_decision_risk",
      severity: "high",
      condition: (ctx) => {
        if (!ctx.nextIrreversibleDecision?.includes("plea")) return false;
        if (!ctx.savedPosition) return false;
        if (ctx.primaryStrategy !== "outcome_management") return false;
        const text = (ctx.savedPosition.position_text || "").toLowerCase();
        return text.includes("deny") || text.includes("not") || text.includes("dispute");
      },
      message: () => "Irreversible decision risk: Plea direction while position still denial without explicit pivot recorded. Requires solicitor confirmation.",
    },
    {
      id: "unsafe_assertions",
      severity: "medium",
      condition: (ctx) => {
        const route = ctx.strategyRoutes.find(r => r.type === ctx.primaryStrategy);
        if (!route) return false;
        const hasUnsafePaths = route.attackPaths?.some(path => !path.evidenceBacked) || false;
        return hasUnsafePaths && ctx.hasDisclosureGaps;
      },
      message: () => "Unsafe to rely on until evidence arrives: Strategy includes attack paths marked as hypothesis pending disclosure.",
    },
    {
      id: "charge_reduction_medical",
      severity: "high",
      condition: (ctx) => {
        if (ctx.primaryStrategy !== "charge_reduction") return false;
        if (!ctx.hasDisclosureGaps) return false;
        return ctx.evidenceImpactMap.some(item => {
          const name = (item.evidenceItem.name || "").toLowerCase();
          return name.includes("medical") || name.includes("injury");
        });
      },
      message: () => "Unsafe to rely on until evidence arrives: Charge reduction strategy requires medical evidence currently outstanding.",
    },
  ],
  
  toolVisibility: {
    phase1: ["disclosure", "pace", "hearings"],
    phase2: ["bail", "strategy", "position"],
    phase3: ["sentencing", "mitigation"],
  },
  
  getPillarStatus(pillar, context) {
    const { evidenceImpactMap, hasDisclosureGaps, primaryStrategy } = context;
    
    // Check for UNSAFE triggers
    if (pillar.requiresForUnsafe && pillar.requiresForUnsafe.length > 0) {
      if (hasDisclosureGaps && pillar.id === "procedure_disclosure") {
        return "UNSAFE";
      }
    }
    
    // Check for PREMATURE triggers
    if (pillar.requiresForPremature && pillar.requiresForPremature.length > 0) {
      const requiresForStrategy = 
        (pillar.id === "identification" && primaryStrategy === "fight_charge") ||
        (pillar.id === "act_causation" && primaryStrategy === "fight_charge") ||
        (pillar.id === "injury_classification" && (primaryStrategy === "charge_reduction" || primaryStrategy === "fight_charge")) ||
        (pillar.id === "intent" && (primaryStrategy === "charge_reduction" || primaryStrategy === "fight_charge"));
      
      if (requiresForStrategy) {
        const missing = pillar.requiresForPremature.filter(key => 
          !hasEvidence(evidenceImpactMap, [key])
        );
        if (missing.length > 0) {
          return "PREMATURE";
        }
      }
    }
    
    return "SAFE";
  },
  
  getPillarReason(pillar, status, context) {
    const { evidenceImpactMap, hasDisclosureGaps } = context;
    
    if (status === "UNSAFE") {
      if (pillar.id === "procedure_disclosure") {
        return "Disclosure gaps create procedural risk";
      }
      return "Unsafe to proceed";
    }
    
    if (status === "PREMATURE") {
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
    if (pillar.id === "identification") {
      return "Identification evidence present";
    }
    if (pillar.id === "act_causation") {
      return "Act and causation evidence present";
    }
    if (pillar.id === "injury_classification") {
      return "Medical evidence present";
    }
    if (pillar.id === "intent") {
      return "Evidence present to assess intent";
    }
    if (pillar.id === "procedure_disclosure") {
      return "Disclosure position stabilised";
    }
    if (pillar.id === "sentencing_outcome") {
      return "Sentencing assessment pending case outcome";
    }
    return "Evidence present";
  },
};
