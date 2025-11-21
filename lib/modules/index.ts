"use server";

/**
 * Case-Type Module System
 * 
 * Pluggable modules that extend the Core Litigation Brain with
 * domain-specific logic, rules, and templates.
 */

import type { ExtractedCaseFacts } from "@/types";

export type CaseTypeModule = {
  name: string;
  practiceArea: string;
  extractSpecificFacts: (facts: ExtractedCaseFacts) => Record<string, unknown>;
  assessStage: (facts: ExtractedCaseFacts, timeline: unknown[]) => string;
  generateRiskFlags: (facts: ExtractedCaseFacts, moduleData: unknown) => Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    evidence: string[];
  }>;
  getRecommendedTemplates: (stage: string) => string[];
  getComplianceChecks?: (moduleData: unknown) => Array<{
    rule: string;
    passed: boolean;
    severity: "low" | "medium" | "high" | "critical";
  }>;
};

/**
 * Register case-type modules
 */
const modules = new Map<string, CaseTypeModule>();

export function registerModule(module: CaseTypeModule): void {
  modules.set(module.practiceArea, module);
}

export function getModule(practiceArea: string): CaseTypeModule | undefined {
  return modules.get(practiceArea);
}

export function getAllModules(): CaseTypeModule[] {
  return Array.from(modules.values());
}

/**
 * PI Module
 */
export const piModule: CaseTypeModule = {
  name: "Personal Injury",
  practiceArea: "pi",
  extractSpecificFacts: (facts) => {
    return {
      piMeta: facts.piMeta,
    };
  },
  assessStage: (facts, timeline) => {
    if (facts.piMeta?.oicTrack === "OIC") return "pre_action";
    if (facts.piMeta?.oicTrack === "Litigated") return "litigation";
    return "investigation";
  },
  generateRiskFlags: (facts, moduleData) => {
    const flags: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      evidence: string[];
    }> = [];
    if (facts.piMeta?.liabilityStance === "denied") {
      flags.push({
        type: "liability_denied",
        severity: "high",
        description: "Liability denied by defendant",
        evidence: ["piMeta.liabilityStance"],
      });
    }
    return flags;
  },
  getRecommendedTemplates: (stage) => {
    if (stage === "intake") return ["PI_CNF"];
    if (stage === "pre_action") return ["PI_LBA", "PI_DISCLOSURE"];
    return [];
  },
};

/**
 * Housing Disrepair Module
 */
export const housingModule: CaseTypeModule = {
  name: "Housing Disrepair / HRA",
  practiceArea: "housing_disrepair",
  extractSpecificFacts: (facts) => {
    return {
      housingMeta: facts.housingMeta,
    };
  },
  assessStage: (facts, timeline) => {
    if (facts.housingMeta?.repairAttempts && facts.housingMeta.repairAttempts > 0) {
      return "investigation";
    }
    return "intake";
  },
  generateRiskFlags: (facts, moduleData) => {
    const flags: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      evidence: string[];
    }> = [];
    if (facts.housingMeta?.unfitForHabitation) {
      flags.push({
        type: "unfit_habitation",
        severity: "critical",
        description: "Property unfit for human habitation",
        evidence: ["housingMeta.unfitForHabitation"],
      });
    }
    if (facts.housingMeta?.noAccessDays && facts.housingMeta.noAccessDays > 90) {
      flags.push({
        type: "excessive_no_access",
        severity: "high",
        description: `${facts.housingMeta.noAccessDays} days claimed as no access`,
        evidence: ["housingMeta.noAccessDays"],
      });
    }
    return flags;
  },
  getRecommendedTemplates: (stage) => {
    if (stage === "intake") return ["REPAIR_REQUEST"];
    if (stage === "investigation") return ["S11_LTA", "ESCALATION"];
    if (stage === "pre_action") return ["PRE_ACTION"];
    return [];
  },
  getComplianceChecks: (moduleData) => {
    // This would call the housing compliance engine
    return [];
  },
};

// Register modules
registerModule(piModule);
registerModule(housingModule);

