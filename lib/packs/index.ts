/**
 * CaseBrain Pack Registry
 * 
 * Central registry for all litigation packs.
 * Use getPackForPracticeArea() to get the appropriate pack for a case.
 * 
 * All practice-specific configuration should flow through these accessors,
 * not through hardcoded logic in individual brains.
 */

import type { PracticeArea } from "../types/casebrain";
import type { 
  LitigationPack, 
  PackId, 
  PackRegistry, 
  PackEvidenceRequirement, 
  PackRiskRule,
  PackComplianceItem,
  PackLimitationRule,
  PackLimitationSummary,
  PackKeyIssueTemplate,
  PackOutcomePatterns,
  PackMissingEvidenceHints,
  PackComplaintRiskPatterns,
  PackNextStepPattern,
  PackGlossaryTerm,
  PackPromptHints,
} from "./types";
import { basePack } from "./base";
import { housingPack } from "./housing";
import { piPack } from "./pi";
import { clinicalNegPack } from "./clinicalNeg";
import { familyPack } from "./family";
import { criminalPack } from "./criminal";
import { filterEvidenceForPracticeArea } from "@/lib/strategic/practice-area-filters";

// =============================================================================
// Pack Registry
// =============================================================================

/**
 * All registered litigation packs
 */
export const PACKS: PackRegistry = {
  other_litigation: basePack,
  housing_disrepair: housingPack,
  personal_injury: piPack,
  clinical_negligence: clinicalNegPack,
  family: familyPack,
  criminal: criminalPack,
};

// =============================================================================
// Core Pack Accessors
// =============================================================================

/**
 * Get the litigation pack for a given practice area
 * Falls back to basePack if unknown
 */
export function getPackForPracticeArea(practiceArea?: PracticeArea | string | null): LitigationPack {
  if (!practiceArea) {
    return basePack;
  }

  // Normalize practice area string
  const normalized = normalizePracticeAreaForPack(practiceArea);
  
  return PACKS[normalized] ?? basePack;
}

/**
 * Get pack for a case record (accepts any object with practice_area field)
 */
export function getPackForCase(caseRecord: { practice_area?: string | null } | null | undefined): LitigationPack {
  return getPackForPracticeArea(caseRecord?.practice_area);
}

/**
 * Get pack by ID
 */
export function getPackById(packId: PackId): LitigationPack {
  return PACKS[packId] ?? basePack;
}

/**
 * Get all available pack IDs
 */
export function getAllPackIds(): PackId[] {
  return Object.keys(PACKS) as PackId[];
}

/**
 * Get all packs
 */
export function getAllPacks(): LitigationPack[] {
  return Object.values(PACKS);
}

// =============================================================================
// Evidence Checklist Accessors
// =============================================================================

/**
 * Get evidence checklist for a practice area
 * Merges base pack requirements if pack extends another
 */
export function getEvidenceChecklist(practiceArea?: PracticeArea | string | null): PackEvidenceRequirement[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // If pack extends another, merge evidence checklists
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      // Parent first, then pack-specific (pack-specific can override by ID)
      const combined = new Map<string, PackEvidenceRequirement>();
      
      for (const req of parentPack.evidenceChecklist) {
        combined.set(req.id, req);
      }
      for (const req of pack.evidenceChecklist) {
        combined.set(req.id, req);
      }
      
      const merged = Array.from(combined.values());
      if (pack.id === "criminal") {
        return filterEvidenceForPracticeArea(merged, "criminal", { context: "packs/getEvidenceChecklist(merged)" });
      }
      return merged;
    }
  }
  
  if (pack.id === "criminal") {
    return filterEvidenceForPracticeArea(pack.evidenceChecklist, "criminal", { context: "packs/getEvidenceChecklist(pack)" });
  }
  return pack.evidenceChecklist;
}

/**
 * Get only core evidence requirements
 */
export function getCoreEvidenceRequirements(practiceArea?: PracticeArea | string | null): PackEvidenceRequirement[] {
  return getEvidenceChecklist(practiceArea).filter(req => req.isCore || req.critical);
}

// =============================================================================
// Risk Rules Accessors
// =============================================================================

/**
 * Get risk rules for a practice area
 * Merges base pack rules if pack extends another
 */
export function getRiskRules(practiceArea?: PracticeArea | string | null): PackRiskRule[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // If pack extends another, merge risk rules
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackRiskRule>();
      
      for (const rule of parentPack.riskRules) {
        combined.set(rule.id, rule);
      }
      for (const rule of pack.riskRules) {
        combined.set(rule.id, rule);
      }
      
      const merged = Array.from(combined.values());
      if (pack.id === "criminal") {
        // Also strip civil-only risk rules (limitation/Part 36/PAP/etc)
        return filterEvidenceForPracticeArea(
          merged.filter((r) => r.category !== "limitation"),
          "criminal",
          { context: "packs/getRiskRules(merged)" },
        );
      }
      return merged;
    }
  }
  
  if (pack.id === "criminal") {
    return filterEvidenceForPracticeArea(
      pack.riskRules.filter((r) => r.category !== "limitation"),
      "criminal",
      { context: "packs/getRiskRules(pack)" },
    );
  }
  return pack.riskRules;
}

/**
 * Get risk rules by category
 */
export function getRiskRulesByCategory(
  practiceArea: PracticeArea | string | null | undefined,
  category: PackRiskRule["category"]
): PackRiskRule[] {
  return getRiskRules(practiceArea).filter(rule => rule.category === category);
}

// =============================================================================
// Limitation Accessors
// =============================================================================

/**
 * Get limitation rules for a practice area
 */
export function getLimitationRules(practiceArea?: PracticeArea | string | null): PackLimitationRule[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackLimitationRule>();
      
      for (const rule of parentPack.limitationRules) {
        combined.set(rule.id, rule);
      }
      for (const rule of pack.limitationRules) {
        combined.set(rule.id, rule);
      }
      
      return Array.from(combined.values());
    }
  }
  
  return pack.limitationRules;
}

/**
 * Get limitation summary for display
 */
export function getLimitationSummary(practiceArea?: PracticeArea | string | null): PackLimitationSummary {
  return getPackForPracticeArea(practiceArea).limitationSummary;
}

// =============================================================================
// Compliance Accessors
// =============================================================================

/**
 * Get compliance items for a practice area
 */
export function getComplianceItems(practiceArea?: PracticeArea | string | null): PackComplianceItem[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackComplianceItem>();
      
      for (const item of parentPack.complianceItems) {
        combined.set(item.id, item);
      }
      for (const item of pack.complianceItems) {
        combined.set(item.id, item);
      }
      
      const merged = Array.from(combined.values());
      if (pack.id === "criminal") {
        return filterEvidenceForPracticeArea(merged, "criminal", { context: "packs/getComplianceItems(merged)" });
      }
      return merged;
    }
  }
  
  if (pack.id === "criminal") {
    return filterEvidenceForPracticeArea(pack.complianceItems, "criminal", { context: "packs/getComplianceItems(pack)" });
  }
  return pack.complianceItems;
}

/**
 * Get SRA-required compliance items only
 */
export function getSRARequiredComplianceItems(practiceArea?: PracticeArea | string | null): PackComplianceItem[] {
  return getComplianceItems(practiceArea).filter(item => item.sraRequired);
}

// =============================================================================
// Key Issues Accessors
// =============================================================================

/**
 * Get key issue templates for a practice area
 */
export function getKeyIssuesTemplates(practiceArea?: PracticeArea | string | null): PackKeyIssueTemplate[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackKeyIssueTemplate>();
      
      for (const template of parentPack.keyIssuesTemplates) {
        combined.set(template.id, template);
      }
      for (const template of pack.keyIssuesTemplates) {
        combined.set(template.id, template);
      }
      
      return Array.from(combined.values());
    }
  }
  
  return pack.keyIssuesTemplates;
}

/**
 * Find matching key issue templates based on detected tags/keywords
 */
export function findMatchingKeyIssues(
  practiceArea: PracticeArea | string | null | undefined,
  detectedTags: string[]
): PackKeyIssueTemplate[] {
  const templates = getKeyIssuesTemplates(practiceArea);
  const tagsLower = detectedTags.map(t => t.toLowerCase());
  
  return templates.filter(template => 
    template.tags.some(tag => 
      tagsLower.some(detected => detected.includes(tag.toLowerCase()) || tag.toLowerCase().includes(detected))
    )
  );
}

// =============================================================================
// Outcome & Complaint Patterns Accessors
// =============================================================================

/**
 * Get outcome patterns for a practice area
 */
export function getOutcomePatterns(practiceArea?: PracticeArea | string | null): PackOutcomePatterns {
  return getPackForPracticeArea(practiceArea).outcomePatterns;
}

/**
 * Get complaint risk patterns for a practice area
 */
export function getComplaintRiskPatterns(practiceArea?: PracticeArea | string | null): PackComplaintRiskPatterns {
  return getPackForPracticeArea(practiceArea).complaintRiskPatterns;
}

// =============================================================================
// Missing Evidence Hints Accessors
// =============================================================================

/**
 * Get missing evidence hints for a practice area
 */
export function getMissingEvidenceHints(practiceArea?: PracticeArea | string | null): PackMissingEvidenceHints {
  return getPackForPracticeArea(practiceArea).missingEvidenceHints;
}

// =============================================================================
// Next Step Patterns Accessors
// =============================================================================

/**
 * Get next step patterns for a practice area
 */
export function getNextStepPatterns(practiceArea?: PracticeArea | string | null): PackNextStepPattern[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackNextStepPattern>();
      
      for (const pattern of parentPack.nextStepPatterns) {
        combined.set(pattern.id, pattern);
      }
      for (const pattern of pack.nextStepPatterns) {
        combined.set(pattern.id, pattern);
      }
      
      return Array.from(combined.values());
    }
  }
  
  return pack.nextStepPatterns;
}

/**
 * Find matching next step patterns based on triggers
 */
export function findMatchingNextSteps(
  practiceArea: PracticeArea | string | null | undefined,
  activeTriggers: string[]
): PackNextStepPattern[] {
  const patterns = getNextStepPatterns(practiceArea);
  const triggersLower = activeTriggers.map(t => t.toLowerCase());
  
  return patterns.filter(pattern => 
    pattern.triggers?.some(trigger => 
      triggersLower.some(active => active.includes(trigger.toLowerCase()) || trigger.toLowerCase().includes(active))
    )
  );
}

// =============================================================================
// Hearing Prep & Instructions Accessors
// =============================================================================

/**
 * Get hearing prep checklist for a practice area
 */
export function getHearingPrepChecklist(practiceArea?: PracticeArea | string | null): string[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // For hearing prep, we want pack-specific items, not merged with base
  // (practice areas have different hearing prep needs)
  return pack.hearingPrepChecklist;
}

/**
 * Get instructions to counsel hints for a practice area
 */
export function getInstructionsToCounselHints(practiceArea?: PracticeArea | string | null): string[] {
  const pack = getPackForPracticeArea(practiceArea);
  return pack.instructionsToCounselHints;
}

// =============================================================================
// Search & Glossary Accessors
// =============================================================================

/**
 * Get search keywords for a practice area
 */
export function getSearchKeywords(practiceArea?: PracticeArea | string | null): string[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      // Combine and deduplicate
      return [...new Set([...parentPack.searchKeywords, ...pack.searchKeywords])];
    }
  }
  
  return pack.searchKeywords;
}

/**
 * Get glossary terms for a practice area
 */
export function getGlossary(practiceArea?: PracticeArea | string | null): PackGlossaryTerm[] {
  const pack = getPackForPracticeArea(practiceArea);
  
  // Merge with parent if extends
  if (pack.extends && pack.extends !== pack.id) {
    const parentPack = PACKS[pack.extends];
    if (parentPack) {
      const combined = new Map<string, PackGlossaryTerm>();
      
      for (const term of parentPack.glossary) {
        combined.set(term.term.toLowerCase(), term);
      }
      for (const term of pack.glossary) {
        combined.set(term.term.toLowerCase(), term);
      }
      
      return Array.from(combined.values());
    }
  }
  
  return pack.glossary;
}

/**
 * Find glossary definition for a term
 */
export function findGlossaryTerm(
  practiceArea: PracticeArea | string | null | undefined,
  term: string
): PackGlossaryTerm | undefined {
  const glossary = getGlossary(practiceArea);
  const termLower = term.toLowerCase();
  return glossary.find(g => g.term.toLowerCase() === termLower);
}

// =============================================================================
// Prompt Hints Accessors
// =============================================================================

/**
 * Get all prompt hints for a practice area
 */
export function getPromptHints(practiceArea?: PracticeArea | string | null): PackPromptHints {
  return getPackForPracticeArea(practiceArea).promptHints;
}

/**
 * Get prompt hint for a specific brain
 */
export function getPromptHint(
  practiceArea: PracticeArea | string | null | undefined,
  brain: keyof PackPromptHints
): string | undefined {
  const pack = getPackForPracticeArea(practiceArea);
  return pack.promptHints[brain];
}

// =============================================================================
// Label & Description Accessors
// =============================================================================

/**
 * Get pack label for display
 */
export function getPackLabel(practiceArea?: PracticeArea | string | null): string {
  const pack = getPackForPracticeArea(practiceArea);
  return pack.label;
}

/**
 * Get pack description
 */
export function getPackDescription(practiceArea?: PracticeArea | string | null): string {
  const pack = getPackForPracticeArea(practiceArea);
  return pack.description;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize practice area string to PackId
 */
function normalizePracticeAreaForPack(area: string): PackId {
  const lower = area.toLowerCase().replace(/[^a-z_]/g, "_");
  
  // Direct matches
  if (lower in PACKS) {
    return lower as PackId;
  }
  
  // Housing variants
  if (lower.includes("housing") || lower.includes("disrepair")) {
    return "housing_disrepair";
  }
  
  // PI variants
  if (lower.includes("pi") || lower.includes("personal") || lower.includes("injury") || 
      lower.includes("rta") || lower.includes("accident")) {
    return "personal_injury";
  }
  
  // Clinical negligence variants
  if (lower.includes("clin") || lower.includes("medical") || lower.includes("negligence")) {
    return "clinical_negligence";
  }
  
  // Family
  if (lower.includes("family") || lower.includes("child") || lower.includes("divorce") ||
      lower.includes("matrimonial") || lower.includes("financial_remedy")) {
    return "family";
  }
  
  // Criminal
  if (lower.includes("criminal") || lower.includes("defense") || lower.includes("prosecution") ||
      lower.includes("charge") || lower.includes("offence") || lower.includes("bail")) {
    return "criminal";
  }
  
  return "other_litigation";
}

/**
 * Normalize any practice area string to a valid PracticeArea
 */
export function normalizePracticeArea(area: string | null | undefined): PracticeArea {
  if (!area) return "other_litigation";
  return normalizePracticeAreaForPack(area);
}

// =============================================================================
// Re-exports
// =============================================================================

export type { 
  LitigationPack, 
  PackId, 
  PackRegistry,
  PackEvidenceRequirement,
  PackRiskRule,
  PackLimitationRule,
  PackLimitationSummary,
  PackComplianceItem,
  PackKeyIssueTemplate,
  PackOutcomePatterns,
  PackMissingEvidenceHints,
  PackComplaintRiskPatterns,
  PackNextStepPattern,
  PackGlossaryTerm,
  PackPromptHints,
  RiskRuleCategory,
  RiskTrigger,
} from "./types";

export { basePack } from "./base";
export { housingPack } from "./housing";
export { piPack } from "./pi";
export { clinicalNegPack } from "./clinicalNeg";
export { familyPack } from "./family";
export { criminalPack } from "./criminal";

// =============================================================================
// Type Exports (including firm override types)
// =============================================================================

export type { FirmPackOverride, FirmPackOverrideData, Explanation, Explainable } from "./types";

// NOTE: Server-only functions (getFirmPack, saveFirmPackOverride, etc.) are in lib/packs/server.ts
// Import them from "@/lib/packs/server" in server components/API routes only

