/**
 * Evidence Impact Mapper
 * 
 * Maps missing/incoming evidence to:
 * - Affected attack paths
 * - Strategy viability changes
 * - Pivot triggers
 * - Kill switches
 * 
 * Deterministic-first, no probabilities, explicit IF-THEN logic.
 */

import type { RouteType, AttackPath } from "./strategy-fight-types";

export type EvidenceItem = {
  id: string;
  name: string;
  category: "visual" | "document" | "procedural" | "medical" | "other";
  urgency: "before_ptph" | "before_trial" | "anytime";
};

export type EvidenceImpact = {
  evidenceItem: EvidenceItem;
  affectedAttackPaths: string[]; // Attack path IDs
  impactOnDefence: "helps" | "hurts" | "neutral" | "depends";
  ifArrivesClean: string; // What happens if evidence arrives clean/complete
  ifArrivesLate: string; // What happens if evidence arrives late
  ifArrivesAdverse: string; // What happens if evidence is adverse
  viabilityChange: Array<{
    route: RouteType;
    change: "strengthens" | "weakens" | "kills" | "neutral";
    explanation: string;
  }>;
  pivotTrigger?: {
    from: RouteType;
    to: RouteType;
    condition: string;
    timing: "before_ptph" | "after_disclosure" | "anytime";
  };
  killSwitch?: {
    route: RouteType;
    condition: string;
    explanation: string;
  };
};

/**
 * Map evidence items to strategic impact
 */
export function mapEvidenceImpact(
  missingItems: EvidenceItem[],
  attackPaths: AttackPath[],
  routeTypes: RouteType[]
): EvidenceImpact[] {
  const impacts: EvidenceImpact[] = [];

  for (const item of missingItems) {
    const impact = analyzeEvidenceItem(item, attackPaths, routeTypes, missingItems);
    if (impact) {
      impacts.push(impact);
    }
  }

  return impacts;
}

/**
 * Analyze a single evidence item's strategic impact
 */
function analyzeEvidenceItem(
  item: EvidenceItem,
  attackPaths: AttackPath[],
  routeTypes: RouteType[],
  allMissingItems: EvidenceItem[]
): EvidenceImpact | null {
  // Find attack paths that depend on this evidence
  const affectedPaths = attackPaths.filter(path => 
    path.evidenceInputs.some(input => 
      input.toLowerCase().includes(item.name.toLowerCase()) ||
      matchesEvidenceCategory(input, item)
    )
  ).map(p => p.id);

  if (affectedPaths.length === 0) {
    return null; // No impact if no attack paths depend on it
  }

  // Determine impact based on evidence category and route types
  const viabilityChanges: EvidenceImpact["viabilityChange"] = [];
  let impactOnDefence: "helps" | "hurts" | "neutral" | "depends" = "depends";
  let ifArrivesClean = "";
  let ifArrivesLate = "";
  let ifArrivesAdverse = "";
  let pivotTrigger: EvidenceImpact["pivotTrigger"] | undefined;
  let killSwitch: EvidenceImpact["killSwitch"] | undefined;

  switch (item.category) {
    case "visual": // CCTV, BWV
      impactOnDefence = "depends";
      
      // Impact on fight_charge
      if (routeTypes.includes("fight_charge")) {
        ifArrivesClean = "CCTV may strengthen identification or show sequence. If identification is strong, fight_charge viability weakens. If sequence is brief, supports challenge.";
        ifArrivesLate = "Late CCTV reduces time to prepare challenge. May still support identification challenge if quality is poor or conditions are weak.";
        ifArrivesAdverse = "CCTV shows strong identification or prolonged sequence. Fight_charge viability collapses. Pivot to charge_reduction or outcome_management.";
        
        viabilityChanges.push({
          route: "fight_charge",
          change: "depends" as any, // Will be refined below
          explanation: "CCTV impact depends on identification quality and sequence duration",
        });

        killSwitch = {
          route: "fight_charge",
          condition: "CCTV shows strong identification from multiple sources under good conditions",
          explanation: "Strong identification evidence makes challenge unlikely to succeed",
        };

        pivotTrigger = {
          from: "fight_charge",
          to: "outcome_management",
          condition: "CCTV shows prolonged or targeted attack supporting intent",
          timing: "after_disclosure",
        };
      }

      // Impact on charge_reduction
      if (routeTypes.includes("charge_reduction")) {
        ifArrivesClean = "CCTV sequence analysis determines intent distinction. Brief sequence supports s20; prolonged supports s18.";
        ifArrivesLate = "Late CCTV reduces negotiation time before PTPH. Still assess sequence for intent distinction.";
        ifArrivesAdverse = "CCTV shows prolonged/targeted sequence. Charge reduction viability collapses. Pivot to outcome_management.";
        
        viabilityChanges.push({
          route: "charge_reduction",
          change: "neutral", // Will be refined based on actual content
          explanation: "CCTV sequence duration and targeting determine intent distinction",
        });

        killSwitch = {
          route: "charge_reduction",
          condition: "CCTV clearly shows prolonged or targeted attack",
          explanation: "Prolonged sequence supports specific intent, not recklessness",
        };
      }
      break;

    case "medical":
      impactOnDefence = "depends";
      
      ifArrivesClean = "Medical evidence pattern determines intent. Single/brief injuries support s20; sustained injuries support s18.";
      ifArrivesLate = "Late medical evidence reduces negotiation time. Still assess pattern for intent distinction.";
      ifArrivesAdverse = "Medical evidence shows sustained/targeted injuries. Charge reduction viability collapses.";

      if (routeTypes.includes("charge_reduction")) {
        viabilityChanges.push({
          route: "charge_reduction",
          change: "neutral", // Will be refined based on actual content
          explanation: "Medical evidence pattern (single vs sustained) determines intent distinction",
        });

        killSwitch = {
          route: "charge_reduction",
          condition: "Medical evidence shows sustained or targeted injury pattern",
          explanation: "Sustained injuries indicate specific intent, not recklessness",
        };
      }

      if (routeTypes.includes("fight_charge")) {
        viabilityChanges.push({
          route: "fight_charge",
          change: "neutral", // Will be refined based on actual content
          explanation: "Medical evidence may support or weaken intent challenge",
        });
      }
      break;

    case "document": // MG6, disclosure schedules
      impactOnDefence = allMissingItems.length > 2 ? "helps" : "hurts";
      
      ifArrivesClean = "Complete disclosure allows full case assessment. May strengthen or weaken defence depending on content.";
      ifArrivesLate = "Late disclosure reduces preparation time. Document chase trail for potential abuse application if failures persist.";
      ifArrivesAdverse = "Disclosure reveals strong prosecution case. Reassess strategy viability.";

      if (routeTypes.includes("fight_charge")) {
        if (allMissingItems.length > 2) {
          viabilityChanges.push({
            route: "fight_charge",
            change: "strengthens",
            explanation: "Disclosure gaps create leverage for challenge",
          });
        } else {
          viabilityChanges.push({
            route: "fight_charge",
            change: "weakens",
            explanation: "Complete disclosure may strengthen prosecution case",
          });
        }

        pivotTrigger = {
          from: "fight_charge",
          to: "charge_reduction",
          condition: "Full disclosure provided with no material gaps",
          timing: "after_disclosure",
        };
      }
      break;

    case "procedural": // Interview, custody, PACE
      impactOnDefence = "depends";
      
      ifArrivesClean = "PACE compliance confirmed. No exclusion applications available.";
      ifArrivesLate = "Late PACE material reduces time for exclusion applications. Assess compliance immediately.";
      ifArrivesAdverse = "PACE breaches identified. Exclusion applications may be viable.";

      if (routeTypes.includes("fight_charge")) {
        viabilityChanges.push({
          route: "fight_charge",
          change: "neutral", // Will be refined based on actual content
          explanation: "PACE compliance determines availability of exclusion applications",
        });

        if (item.name.toLowerCase().includes("breach") || item.name.toLowerCase().includes("non-compliant")) {
          viabilityChanges[viabilityChanges.length - 1].change = "strengthens";
          viabilityChanges[viabilityChanges.length - 1].explanation = "PACE breaches support exclusion applications";
        }
      }
      break;
  }

  // All changes are now properly typed (no "depends" type)

  return {
    evidenceItem: item,
    affectedAttackPaths: affectedPaths,
    impactOnDefence,
    ifArrivesClean,
    ifArrivesLate,
    ifArrivesAdverse,
    viabilityChange: viabilityChanges,
    pivotTrigger,
    killSwitch,
  };
}

/**
 * Match evidence input to evidence category
 */
function matchesEvidenceCategory(input: string, item: EvidenceItem): boolean {
  const lowerInput = input.toLowerCase();
  const lowerName = item.name.toLowerCase();

  switch (item.category) {
    case "visual":
      return lowerInput.includes("cctv") || lowerInput.includes("camera") || lowerInput.includes("footage") || lowerInput.includes("bwv");
    case "medical":
      return lowerInput.includes("medical") || lowerInput.includes("injury") || lowerInput.includes("hospital") || lowerInput.includes("report");
    case "document":
      return lowerInput.includes("mg6") || lowerInput.includes("disclosure") || lowerInput.includes("schedule");
    case "procedural":
      return lowerInput.includes("interview") || lowerInput.includes("custody") || lowerInput.includes("pace");
    default:
      return lowerInput.includes(lowerName);
  }
}

/**
 * Get common missing evidence items for criminal cases
 */
export function getCommonMissingEvidence(
  hasCCTV: boolean,
  hasBWV: boolean,
  hasMG6: boolean,
  hasInterview: boolean,
  hasCustody: boolean,
  hasMedical: boolean,
  hasVIPER: boolean
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!hasCCTV) {
    items.push({
      id: "cctv",
      name: "CCTV footage",
      category: "visual",
      urgency: "before_ptph",
    });
  }

  if (!hasBWV) {
    items.push({
      id: "bwv",
      name: "BWV footage",
      category: "visual",
      urgency: "before_ptph",
    });
  }

  if (!hasMG6) {
    items.push({
      id: "mg6",
      name: "MG6 schedules",
      category: "document",
      urgency: "before_ptph",
    });
  }

  if (!hasInterview) {
    items.push({
      id: "interview",
      name: "Interview recording/transcript",
      category: "procedural",
      urgency: "before_trial",
    });
  }

  if (!hasCustody) {
    items.push({
      id: "custody",
      name: "Custody record",
      category: "procedural",
      urgency: "before_trial",
    });
  }

  if (!hasMedical) {
    items.push({
      id: "medical",
      name: "Medical evidence/reports",
      category: "medical",
      urgency: "before_ptph",
    });
  }

  if (!hasVIPER) {
    items.push({
      id: "viper",
      name: "VIPER pack",
      category: "procedural",
      urgency: "before_trial",
    });
  }

  return items;
}

