/**
 * Multi-Path Strategy Generator
 * 
 * Maps multiple legitimate litigation pathways.
 * Shows Route A/B/C/D/E options for attack or defense.
 * 
 * All routes are legitimate and within CPR rules.
 */

import { detectOpponentVulnerabilities } from "./opponent-vulnerabilities";
import { analyzeTimePressure } from "./time-pressure";
import { detectOpponentWeakSpots } from "./weak-spots";
import type { PracticeArea } from "../types/casebrain";

export type StrategyPath = {
  id: string;
  caseId: string;
  route: "A" | "B" | "C" | "D" | "E";
  title: string; // "Route A: Challenge on breach of duty"
  description: string;
  approach: string; // Detailed approach
  pros: string[];
  cons: string[];
  estimatedTimeframe: string;
  estimatedCost: string;
  successProbability: "HIGH" | "MEDIUM" | "LOW";
  recommendedFor: string; // When this route is best
  createdAt: string;
};

type StrategyPathInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  bundleId?: string;
  hasChronology: boolean;
  hasHazardAssessment: boolean;
  nextHearingDate?: string;
};

/**
 * Generate multiple strategy paths for a case
 */
export async function generateStrategyPaths(
  input: StrategyPathInput,
): Promise<StrategyPath[]> {
  const paths: StrategyPath[] = [];
  const now = new Date().toISOString();

  // Get strategic intelligence
  const vulnerabilities = await detectOpponentVulnerabilities({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    letters: input.letters,
    deadlines: input.deadlines,
    timeline: input.timeline,
    bundleId: input.bundleId,
    hasChronology: input.hasChronology,
    hasHazardAssessment: input.hasHazardAssessment,
  });

  const timePressure = await analyzeTimePressure({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    timeline: input.timeline,
    deadlines: input.deadlines,
    letters: input.letters,
    nextHearingDate: input.nextHearingDate,
  });

  const weakSpots = await detectOpponentWeakSpots({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    timeline: input.timeline,
    bundleId: input.bundleId,
  });

  // Route A: Procedural attack via opponent delays/non-compliance
  const hasProceduralVulnerabilities = vulnerabilities.some(v => 
    v.type === "LATE_RESPONSE" || 
    v.type === "INCOMPLETE_DISCLOSURE" ||
    v.type === "MISSING_PRE_ACTION"
  );

  if (hasProceduralVulnerabilities) {
    paths.push({
      id: `strategy-route-a-${input.caseId}`,
      caseId: input.caseId,
      route: "A",
      title: "Route A: Procedural attack via opponent delays and non-compliance",
      description: "Focus on opponent's procedural failures (delays, missing disclosure, non-compliance) to apply pressure and seek costs/strike-out.",
      approach: "1. Document all opponent delays and non-compliance. 2. Apply for unless order or costs order. 3. Use procedural failures to support case and create leverage. 4. If opponent fails to comply, seek strike-out.",
      pros: [
        "Strong procedural position",
        "Clear evidence of opponent failures",
        "Court likely to grant applications given delays",
        "Creates maximum pressure on opponent",
      ],
      cons: [
        "May delay case resolution",
        "Requires court applications (costs)",
        "Opponent may comply at last minute",
      ],
      estimatedTimeframe: "2-4 months",
      estimatedCost: "Medium (court application fees)",
      successProbability: "HIGH",
      recommendedFor: "Cases with clear opponent delays and non-compliance",
      createdAt: now,
    });
  }

  // Route B: Awaab's Law / Hazard breach leverage (housing only)
  if (input.practiceArea === "housing_disrepair") {
    const hasAwaabVulnerabilities = vulnerabilities.some(v => 
      v.type === "MISSING_RECORDS" ||
      v.description.toLowerCase().includes("awaab")
    );

    const hasHazards = input.timeline.some(e => 
      e.description.toLowerCase().includes("hazard") ||
      e.description.toLowerCase().includes("mold") ||
      e.description.toLowerCase().includes("damp")
    );

    if (hasAwaabVulnerabilities || hasHazards) {
      paths.push({
        id: `strategy-route-b-${input.caseId}`,
        caseId: input.caseId,
        route: "B",
        title: "Route B: Leverage Awaab's Law hazard breach",
        description: "Focus on Awaab's Law compliance failures and Category 1 hazards to create urgency and leverage.",
        approach: "1. Establish Awaab's Law breach (social landlord, under-5s, Category 1 hazards). 2. Highlight urgency and safety concerns. 3. Use breach to support quantum and liability. 4. Leverage safety urgency to pressure opponent.",
        pros: [
          "Strong statutory position (Awaab's Law)",
          "Safety urgency creates leverage",
          "Clear compliance failures",
          "High public interest angle",
        ],
      cons: [
          "Only applies to social landlords",
          "Requires Category 1 hazards",
          "May require expert evidence",
        ],
        estimatedTimeframe: "3-6 months",
        estimatedCost: "Medium-High (expert reports)",
        successProbability: "HIGH",
        recommendedFor: "Housing cases with social landlords, under-5s, and Category 1 hazards",
        createdAt: now,
      });
    }
  }

  // Route C: Expert contradiction / cross-examination
  const hasExpertWeakSpots = weakSpots.some(w => 
    w.type === "POOR_EXPERT" ||
    w.description.toLowerCase().includes("expert")
  );

  const hasContradictions = weakSpots.some(w => w.type === "CONTRADICTION");

  if (hasExpertWeakSpots || hasContradictions) {
    paths.push({
      id: `strategy-route-c-${input.caseId}`,
      caseId: input.caseId,
      route: "C",
      title: "Route C: Push expert contradiction for cross-examination",
      description: "Focus on contradictions and expert weaknesses to challenge opponent's evidence and credibility.",
      approach: "1. Identify contradictions and expert weaknesses. 2. Request clarification or further information. 3. Prepare cross-examination questions. 4. Use contradictions to challenge opponent's case at hearing.",
      pros: [
        "Weakens opponent's evidence",
        "Challenges credibility",
        "Strong position for cross-examination",
        "May lead to settlement",
      ],
      cons: [
        "Requires careful preparation",
        "May require expert evidence",
        "Depends on quality of contradictions",
      ],
      estimatedTimeframe: "4-6 months",
      estimatedCost: "Medium-High (expert evidence, hearing)",
      successProbability: "MEDIUM",
      recommendedFor: "Cases with clear contradictions or expert weaknesses",
      createdAt: now,
    });
  }

  // Route D: Settlement pressure route
  const hasSignificantDelays = timePressure.some(t => 
    t.severity === "CRITICAL" || t.severity === "HIGH"
  );

  if (hasSignificantDelays && input.nextHearingDate) {
    paths.push({
      id: `strategy-route-d-${input.caseId}`,
      caseId: input.caseId,
      route: "D",
      title: "Route D: Settlement pressure route — opponent's delay strengthens leverage",
      description: "Use opponent's delays and approaching hearing to create settlement pressure and negotiate favorable terms.",
      approach: "1. Document all opponent delays. 2. Make Part 36 offer or settlement proposal. 3. Highlight delays and approaching hearing. 4. Negotiate from position of strength.",
      pros: [
        "Faster resolution",
        "Lower costs",
        "Opponent under time pressure",
        "Strong negotiating position",
      ],
      cons: [
        "May require compromise",
        "Depends on opponent's willingness",
        "May not achieve full value",
      ],
      estimatedTimeframe: "1-2 months",
      estimatedCost: "Low (negotiation only)",
      successProbability: "MEDIUM",
      recommendedFor: "Cases with significant opponent delays and approaching hearing",
      createdAt: now,
    });
  }

  // Route E: Hybrid approach (combine multiple routes)
  if (paths.length >= 2) {
    paths.push({
      id: `strategy-route-e-${input.caseId}`,
      caseId: input.caseId,
      route: "E",
      title: "Route E: Hybrid approach — combine procedural, substantive, and settlement pressure",
      description: "Combine multiple strategies: procedural attacks, substantive challenges, and settlement pressure to maximize leverage.",
      approach: "1. Apply procedural pressure (unless orders, costs). 2. Challenge substantive weaknesses (contradictions, expert evidence). 3. Maintain settlement discussions. 4. Use all leverage points simultaneously.",
      pros: [
        "Maximum leverage",
        "Multiple pressure points",
        "Flexible approach",
        "Best chance of favorable outcome",
      ],
      cons: [
        "More complex",
        "Higher costs",
        "Requires careful coordination",
      ],
      estimatedTimeframe: "3-6 months",
      estimatedCost: "Medium-High (multiple applications)",
      successProbability: "HIGH",
      recommendedFor: "Complex cases with multiple leverage points",
      createdAt: now,
    });
  }

  // If no specific routes identified, provide default route
  if (paths.length === 0) {
    paths.push({
      id: `strategy-route-default-${input.caseId}`,
      caseId: input.caseId,
      route: "A",
      title: "Route A: Standard litigation pathway",
      description: "Follow standard litigation process: gather evidence, comply with protocols, prepare for hearing.",
      approach: "1. Complete pre-action protocol. 2. Gather all evidence. 3. Issue proceedings if necessary. 4. Prepare for hearing.",
      pros: [
        "Standard approach",
        "Lower risk",
        "Predictable timeline",
      ],
      cons: [
        "May be slower",
        "Less leverage",
        "Standard costs",
      ],
      estimatedTimeframe: "6-12 months",
      estimatedCost: "Medium",
      successProbability: "MEDIUM",
      recommendedFor: "Cases without clear leverage points",
      createdAt: now,
    });
  }

  return paths;
}

