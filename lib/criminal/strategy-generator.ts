/**
 * Defense Strategy Generator
 * 
 * Generates multiple defense strategies based on loopholes and evidence,
 * with success probabilities and ready-to-use legal arguments.
 */

import "server-only";
import type { Loophole } from "./loophole-detector";

export type DefenseStrategy = {
  id: string;
  strategyName: string;
  strategyType: "PACE_breach" | "evidence_challenge" | "disclosure_failure" | "alibi_defense" | "technical_defense" | "partial_plea" | "mitigation";
  description: string;
  successProbability: number; // 0-100
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  legalArgument: string | null;
  actionsRequired: string[];
};

/**
 * Generate defense strategies from loopholes
 */
export function generateDefenseStrategies(loopholes: Loophole[]): DefenseStrategy[] {
  const strategies: DefenseStrategy[] = [];

  // Strategy 1: PACE Breach Attack
  const paceBreaches = loopholes.filter((l) => l.loopholeType === "PACE_breach");
  if (paceBreaches.length > 0) {
    const topPaceBreach = paceBreaches.sort((a, b) => b.successProbability - a.successProbability)[0];
    
    strategies.push({
      id: "strategy-pace-breach",
      strategyName: "PACE Breach Attack",
      strategyType: "PACE_breach",
      description: `Exploit PACE breach: ${topPaceBreach.title}. Apply to exclude evidence under s.78 PACE. Without excluded evidence, prosecution case may collapse.`,
      successProbability: topPaceBreach.successProbability,
      impact: topPaceBreach.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      legalArgument: topPaceBreach.legalArgument,
      actionsRequired: [
        "File application to exclude evidence under s.78 PACE",
        "Prepare legal argument for court",
        "Request voir dire hearing if needed",
        "If evidence excluded, request case dismissed",
      ],
    });
  }

  // Strategy 2: Evidence Challenge (Weak ID)
  const weakId = loopholes.find((l) => l.loopholeType === "identification_issue");
  if (weakId) {
    strategies.push({
      id: "strategy-weak-id",
      strategyName: "Weak ID Challenge",
      strategyType: "evidence_challenge",
      description: `Challenge identification evidence under Turnbull Guidelines. ${weakId.description}`,
      successProbability: weakId.successProbability,
      impact: "HIGH",
      legalArgument: weakId.legalArgument,
      actionsRequired: [
        "Request voir dire hearing for ID evidence",
        "Prepare Turnbull Guidelines argument",
        "Cross-examine on distance, lighting, time",
        "Request ID evidence be excluded",
      ],
    });
  }

  // Strategy 3: Disclosure Failure
  const disclosureFailures = loopholes.filter((l) => l.loopholeType === "disclosure_failure");
  if (disclosureFailures.length > 0) {
    strategies.push({
      id: "strategy-disclosure",
      strategyName: "Disclosure Failure Attack",
      strategyType: "disclosure_failure",
      description: "Prosecution has failed to provide full disclosure. Argue unfair trial and request case dismissed.",
      successProbability: 60,
      impact: "MEDIUM",
      legalArgument: `Your Honour, the prosecution has failed to provide full disclosure as required. This failure prevents my client from having a fair trial. I submit that the case should be dismissed, or at minimum, the missing disclosure should be provided immediately.`,
      actionsRequired: [
        "Request full disclosure immediately",
        "Document all missing items",
        "If refused, apply to stay proceedings",
        "Argue unfair trial without disclosure",
      ],
    });
  }

  // Strategy 4: Contradictory Evidence
  const contradictions = loopholes.filter((l) => l.loopholeType === "contradiction");
  if (contradictions.length > 0) {
    strategies.push({
      id: "strategy-contradiction",
      strategyName: "Contradictory Evidence Challenge",
      strategyType: "evidence_challenge",
      description: "Prosecution witnesses contradict each other. Argue evidence is unreliable.",
      successProbability: 55,
      impact: "MEDIUM",
      legalArgument: `Your Honour, the prosecution witnesses cannot agree on the basic facts of the case. This demonstrates the unreliability of the evidence. I submit that no reasonable jury could convict on such contradictory evidence.`,
      actionsRequired: [
        "Prepare cross-examination highlighting contradictions",
        "Document all contradictions",
        "Argue evidence is unreliable",
        "Request case dismissed for lack of reliable evidence",
      ],
    });
  }

  // Strategy 5: Technical Defense
  const technicalErrors = loopholes.filter((l) => l.loopholeType === "procedural_error");
  if (technicalErrors.length > 0) {
    strategies.push({
      id: "strategy-technical",
      strategyName: "Technical Defense",
      strategyType: "technical_defense",
      description: "Procedural errors identified. Challenge on technicality.",
      successProbability: 80,
      impact: "HIGH",
      legalArgument: `Your Honour, there are fundamental procedural errors in this case that render the proceedings invalid. I submit that the case should be dismissed on this basis.`,
      actionsRequired: [
        "Identify all procedural errors",
        "Prepare technical challenge",
        "Request case dismissed",
        "If refused, appeal",
      ],
    });
  }

  // Sort by success probability
  return strategies.sort((a, b) => b.successProbability - a.successProbability);
}

/**
 * Calculate overall "get off" probability
 */
export function calculateGetOffProbability(strategies: DefenseStrategy[], loopholes: Loophole[]): number {
  if (strategies.length === 0 && loopholes.length === 0) {
    return 50; // Default if no data
  }

  // Use top strategy probability
  if (strategies.length > 0) {
    return strategies[0].successProbability;
  }

  // Or use top loophole probability
  if (loopholes.length > 0) {
    const sortedLoopholes = [...loopholes].sort((a, b) => b.successProbability - a.successProbability);
    return sortedLoopholes[0].successProbability;
  }

  return 50;
}

