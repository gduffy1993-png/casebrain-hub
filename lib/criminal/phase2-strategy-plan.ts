/**
 * Phase 2 Strategy Plan Generator
 * 
 * Generates a directive case plan after strategy commitment.
 * Maps disclosure → intent → charge reduction logic.
 * Enables Phase 2 tools (bail, plea, charge reduction).
 */

import "server-only";
import type { StrategyCommitment } from "@/components/criminal/StrategyCommitmentPanel";
import type { CriminalEvidenceGraph } from "@/lib/case-evidence/merge-criminal-docs";

export type Phase2StrategyPlan = {
  primaryStrategy: StrategyCommitment["primary"];
  fallbackStrategies: StrategyCommitment["secondary"];
  steps: Array<{
    order: number;
    phase: "disclosure" | "intent" | "charge_reduction" | "plea" | "bail" | "trial";
    action: string;
    rationale: string;
    timeline?: string;
    dependencies?: string[];
  }>;
  enabledTools: Array<"bail" | "plea" | "charge_reduction" | "disclosure">;
  lockedTools: Array<"disclosure" | "evidence_analysis">;
};

/**
 * Generate Phase 2 directive strategy plan based on committed strategy
 */
export function generatePhase2StrategyPlan(
  commitment: StrategyCommitment,
  evidenceGraph: CriminalEvidenceGraph,
): Phase2StrategyPlan {
  const { primary, secondary } = commitment;
  const steps: Phase2StrategyPlan["steps"] = [];
  const enabledTools: Phase2StrategyPlan["enabledTools"] = [];
  const lockedTools: Phase2StrategyPlan["lockedTools"] = ["disclosure", "evidence_analysis"];

  let order = 1;

  // Common disclosure step (always first)
  if (evidenceGraph.disclosureGaps.length > 0) {
    steps.push({
      order: order++,
      phase: "disclosure",
      action: "Request outstanding disclosure: " + evidenceGraph.disclosureGaps.slice(0, 3).map(g => g.item).join(", "),
      rationale: "Disclosure gaps must be addressed before proceeding with strategy execution.",
      timeline: "Within 7 days",
      dependencies: [],
    });
    enabledTools.push("disclosure");
  }

  // Strategy-specific steps
  if (primary === "charge_reduction") {
    // Charge reduction strategy: disclosure → intent challenge → charge reduction
    steps.push({
      order: order++,
      phase: "intent",
      action: "Prepare intent distinction argument (s18 → s20): Gather evidence of lack of specific intent",
      rationale: "Charge reduction requires demonstrating harm occurred but without specific intent to cause GBH.",
      timeline: "Before plea hearing",
      dependencies: ["disclosure"],
    });

    steps.push({
      order: order++,
      phase: "charge_reduction",
      action: "Submit representations to CPS requesting charge reduction from s18 to s20",
      rationale: "Prosecution may accept reduction if intent evidence is weak.",
      timeline: "After disclosure complete",
      dependencies: ["intent"],
    });

    enabledTools.push("charge_reduction", "plea");
  } else if (primary === "fight_charge") {
    // Fight charge strategy: disclosure → evidence challenge → trial prep
    steps.push({
      order: order++,
      phase: "disclosure",
      action: "Challenge prosecution evidence: Identify weaknesses in identification, intent, and causation",
      rationale: "Full trial strategy requires comprehensive evidence challenge.",
      timeline: "Ongoing",
      dependencies: [],
    });

    steps.push({
      order: order++,
      phase: "trial",
      action: "Prepare trial strategy: Cross-examination points, submissions, and defense case",
      rationale: "Trial strategy must be fully prepared before trial date.",
      timeline: "Before trial",
      dependencies: ["disclosure"],
    });

    enabledTools.push("bail");
  } else if (primary === "outcome_management") {
    // Outcome management: disclosure → mitigation → plea/negotiation
    steps.push({
      order: order++,
      phase: "plea",
      action: "Prepare mitigation package: Character references, personal circumstances, remorse",
      rationale: "Outcome management focuses on minimizing sentence through strong mitigation.",
      timeline: "Before sentencing",
      dependencies: [],
    });

    steps.push({
      order: order++,
      phase: "plea",
      action: "Negotiate plea and sentence: Engage with prosecution on acceptable plea and sentence range",
      rationale: "Early plea and cooperation can significantly reduce sentence.",
      timeline: "Before plea hearing",
      dependencies: ["disclosure"],
    });

    enabledTools.push("plea");
  }

  // Add fallback strategy steps if provided
  if (secondary && secondary.length > 0) {
    steps.push({
      order: order++,
      phase: "charge_reduction",
      action: `Fallback strategy: ${secondary.map(s => {
        if (s === "charge_reduction") return "Charge reduction";
        if (s === "fight_charge") return "Fight charge";
        return "Outcome management";
      }).join(" or ")}`,
      rationale: "If primary strategy fails, pivot to fallback approach.",
      timeline: "As needed",
      dependencies: ["primary_strategy"],
    });
  }

  return {
    primaryStrategy: primary,
    fallbackStrategies: secondary || [],
    steps: steps.sort((a, b) => a.order - b.order),
    enabledTools: Array.from(new Set(enabledTools)), // Deduplicate
    lockedTools,
  };
}

