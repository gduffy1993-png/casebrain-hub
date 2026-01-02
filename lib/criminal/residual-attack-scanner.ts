/**
 * Residual Attack Scanner (Exhaustion Layer)
 * 
 * Enumerates remaining non-speculative attack angles AFTER existing attack paths.
 * Explicitly declares when there is "no viable further attack" without new disclosure.
 * Adds "Judicial Fatigue / Optics" warnings for weak/speculative angles.
 * Outputs "Last-Resort Leverage Map" when primary attacks are weak/collapsing.
 * 
 * NEVER hallucinates evidence. Works deterministically when Analysis Gate is closed.
 */

import type { RouteType, AttackPath } from "./strategy-fight-types";
import type { EvidenceSignals } from "./strategy-recommendation-engine";

export type ResidualStatus = "ATTACKS_REMAIN" | "EXHAUSTED";

export type ResidualAngle = {
  id: string;
  title: string;
  description: string;
  category: "credibility" | "sequence" | "medical" | "identification" | "procedure" | "context";
  evidenceBasis: "EVIDENCE_BACKED" | "HYPOTHESIS";
  requiredEvidence?: string[];
  judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
  whyOptics: string;
  howToUse: string[];
  stopIf: string;
};

export type LastResortLeveragePlan = {
  title: string;
  actions: string[];
  timing: "before_PTPH" | "after_disclosure" | "anytime";
  judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
};

export type ResidualAttackScan = {
  status: ResidualStatus;
  summary: string;
  angles: ResidualAngle[];
  lastResortLeverage: {
    triggers: string[];
    plan: LastResortLeveragePlan[];
  };
};

type ScanInput = {
  evidenceSignals: EvidenceSignals;
  routeType: RouteType;
  existingAttackPaths: AttackPath[];
  routeConfidence: "HIGH" | "MEDIUM" | "LOW";
  canGenerateAnalysis: boolean;
};

/**
 * Scan for residual attack angles
 */
export function scanResidualAttacks(input: ScanInput): ResidualAttackScan {
  const { evidenceSignals, routeType, existingAttackPaths, routeConfidence, canGenerateAnalysis } = input;

  // Compute exhaustion status
  const status = computeExhaustionStatus(evidenceSignals, routeType, canGenerateAnalysis);

  // Generate residual angles
  const angles = generateResidualAngles(evidenceSignals, routeType, existingAttackPaths, canGenerateAnalysis);

  // Build last resort leverage
  const lastResortLeverage = buildLastResortLeverage(
    status,
    routeConfidence,
    evidenceSignals,
    routeType,
    canGenerateAnalysis
  );

  // Generate summary
  const summary = generateResidualSummary(status, angles, evidenceSignals, canGenerateAnalysis);

  return {
    status,
    summary,
    angles,
    lastResortLeverage,
  };
}

/**
 * Compute exhaustion status
 */
function computeExhaustionStatus(
  signals: EvidenceSignals,
  routeType: RouteType,
  canGenerateAnalysis: boolean
): ResidualStatus {
  if (!canGenerateAnalysis) {
    // When gated, assume attacks remain (conservative)
    return "ATTACKS_REMAIN";
  }

  // Rule A: If prosecution strong AND ID strong AND disclosure complete AND PACE clean
  const prosecutionStrong = signals.prosecutionStrength === "strong";
  const idStrong = signals.idStrength === "strong";
  const disclosureComplete = signals.disclosureCompleteness === "complete";
  const paceClean = signals.paceCompliance === "compliant" || signals.paceCompliance === "unknown";

  if (prosecutionStrong && idStrong && disclosureComplete && paceClean) {
    return "EXHAUSTED";
  }

  // If key signals are unknown, cannot declare exhausted
  if (
    signals.idStrength === "unknown" ||
    signals.disclosureCompleteness === "unknown" ||
    signals.prosecutionStrength === "unknown"
  ) {
    return "ATTACKS_REMAIN";
  }

  // Default: attacks remain
  return "ATTACKS_REMAIN";
}

/**
 * Generate residual attack angles
 */
function generateResidualAngles(
  signals: EvidenceSignals,
  routeType: RouteType,
  existingAttackPaths: AttackPath[],
  canGenerateAnalysis: boolean
): ResidualAngle[] {
  const angles: ResidualAngle[] = [];

  // Check what attack paths already cover
  const existingTargets = new Set(existingAttackPaths.map(p => p.target.toLowerCase()));

  // B) Identification reliability pressure test
  if (!existingTargets.has("identification") && routeType === "fight_charge") {
    if (signals.idStrength === "weak" || signals.idStrength === "unknown") {
      angles.push({
        id: "residual_id_reliability",
        title: "Identification Reliability Pressure Test",
        description: "Cross-examine identification procedure compliance, conditions, and first account consistency. Non-speculative if ID procedure pack or CCTV continuity available.",
        category: "identification",
        evidenceBasis: signals.idStrength === "weak" ? "EVIDENCE_BACKED" : "HYPOTHESIS",
        requiredEvidence: signals.idStrength === "unknown" ? ["VIPER pack", "ID procedure records", "CCTV continuity"] : undefined,
        judicialOptics: signals.idStrength === "weak" ? "ATTRACTIVE" : "NEUTRAL",
        whyOptics: signals.idStrength === "weak"
          ? "Weak identification evidence supports Turnbull challenge - judicially attractive"
          : "Identification challenge requires disclosure basis - neutral until evidence available",
        howToUse: [
          "Request VIPER pack and ID procedure records",
          "Request CCTV continuity evidence",
          "Review first account consistency",
          "Assess Turnbull compliance",
        ],
        stopIf: "Strong identification from multiple independent sources under good conditions",
      });
    }
  }

  // C) Medical causation/force margin review
  if (!existingTargets.has("medical") && (routeType === "fight_charge" || routeType === "charge_reduction")) {
    if (signals.medicalEvidence === "unknown") {
      angles.push({
        id: "residual_medical_margin",
        title: "Medical Causation/Force Margin Review",
        description: "Review medical evidence for causation margins, force interpretation, and injury mechanism. Hypothesis until medical reports/photos/A&E notes reviewed.",
        category: "medical",
        evidenceBasis: "HYPOTHESIS",
        requiredEvidence: ["Medical reports", "Injury photos", "A&E notes"],
        judicialOptics: "NEUTRAL",
        whyOptics: "Medical review is standard case management - neutral until evidence reviewed",
        howToUse: [
          "Request full medical evidence disclosure",
          "Review injury photos and A&E notes",
          "Assess causation and force interpretation",
          "Consider expert evidence if causation unclear",
        ],
        stopIf: "Medical evidence clearly shows sustained/targeted injuries supporting intent",
      });
    }
  }

  // D) Consistency-over-time check (safe credibility angle)
  if (routeType === "fight_charge" || routeType === "charge_reduction") {
    angles.push({
      id: "residual_consistency",
      title: "Consistency-Over-Time Check",
      description: "Review witness statements and accounts for consistency over time. Check first accounts, police statements, and court evidence for material changes. Hypothesis unless contradictions already identified in disclosure.",
      category: "credibility",
      evidenceBasis: "HYPOTHESIS",
      requiredEvidence: ["Witness statements", "First accounts", "Police statements"],
      judicialOptics: "NEUTRAL",
      whyOptics: "Consistency review is standard cross-examination preparation - neutral unless contradictions found",
      howToUse: [
        "Review all witness statements chronologically",
        "Compare first accounts with later statements",
        "Identify material changes or inconsistencies",
        "Prepare cross-examination on inconsistencies if found",
      ],
      stopIf: "All accounts are consistent with no material changes",
    });
  }

  // Sequence/timing margin (if CCTV sequence unknown)
  if (signals.cctvSequence === "unknown" && (routeType === "fight_charge" || routeType === "charge_reduction")) {
    angles.push({
      id: "residual_sequence_margin",
      title: "Sequence/Timing Margin Analysis",
      description: "Analyse sequence and timing evidence for margins supporting intent distinction or challenge. Hypothesis until CCTV/sequence evidence reviewed.",
      category: "sequence",
      evidenceBasis: "HYPOTHESIS",
      requiredEvidence: ["CCTV footage", "Sequence evidence", "Timeline"],
      judicialOptics: "NEUTRAL",
      whyOptics: "Sequence analysis is standard case management - neutral until evidence reviewed",
      howToUse: [
        "Request CCTV footage and continuity",
        "Review sequence and timing evidence",
        "Assess duration and targeting",
        "Consider intent distinction based on sequence",
      ],
      stopIf: "CCTV clearly shows prolonged or targeted sequence",
    });
  }

  // Procedural margin (if PACE compliance unknown)
  if (signals.paceCompliance === "unknown" && routeType === "fight_charge") {
    angles.push({
      id: "residual_procedure_margin",
      title: "Procedural Compliance Margin Review",
      description: "Review PACE compliance, custody procedures, and interview conduct for material breaches. Hypothesis until custody records and interview recordings reviewed.",
      category: "procedure",
      evidenceBasis: "HYPOTHESIS",
      requiredEvidence: ["Custody record", "Interview recording", "PACE compliance documentation"],
      judicialOptics: "ATTRACTIVE",
      whyOptics: "PACE compliance review is standard case management - attractive if breaches found",
      howToUse: [
        "Request custody record and PACE documentation",
        "Request interview recording and transcript",
        "Review for PACE breaches",
        "Prepare exclusion application if breaches found",
      ],
      stopIf: "PACE compliance confirmed with no material breaches",
    });
  }

  // Context/background margin (always available as hypothesis)
  if (routeType === "fight_charge" || routeType === "charge_reduction") {
    angles.push({
      id: "residual_context",
      title: "Context/Background Margin Review",
      description: "Review background context, relationship history, and circumstances for mitigation or challenge angles. Hypothesis requiring disclosure of background material.",
      category: "context",
      evidenceBasis: "HYPOTHESIS",
      requiredEvidence: ["Background material", "Relationship history", "Circumstances"],
      judicialOptics: "NEUTRAL",
      whyOptics: "Context review is standard case preparation - neutral unless material issues found",
      howToUse: [
        "Request background and context material",
        "Review relationship history if applicable",
        "Assess circumstances for mitigation or challenge",
        "Consider character evidence if relevant",
      ],
      stopIf: "Background material supports prosecution case",
    });
  }

  // Mark speculative angles as risky
  for (const angle of angles) {
    if (angle.evidenceBasis === "HYPOTHESIS" && !angle.requiredEvidence) {
      angle.judicialOptics = "RISKY";
      angle.whyOptics = "Court may view as fishing without disclosure basis";
    }
  }

  return angles;
}

/**
 * Build last resort leverage plan
 */
function buildLastResortLeverage(
  status: ResidualStatus,
  routeConfidence: "HIGH" | "MEDIUM" | "LOW",
  signals: EvidenceSignals,
  routeType: RouteType,
  canGenerateAnalysis: boolean
): ResidualAttackScan["lastResortLeverage"] {
  const triggers: string[] = [];
  const plan: LastResortLeveragePlan[] = [];

  // Triggers for last resort
  if (status === "EXHAUSTED") {
    triggers.push("No further viable evidential/procedural attacks identified");
    triggers.push("Prosecution case appears strong");
  }

  if (routeConfidence === "LOW") {
    triggers.push("Route confidence is LOW - primary attacks are weak");
  }

  if (signals.prosecutionStrength === "strong") {
    triggers.push("Prosecution case is strong");
  }

  if (signals.idStrength === "strong" && signals.disclosureCompleteness === "complete") {
    triggers.push("Strong identification evidence with complete disclosure");
  }

  // Last resort plans (only if exhausted or LOW confidence)
  if (status === "EXHAUSTED" || routeConfidence === "LOW") {
    // 1) Plea timing & credit preservation
    plan.push({
      title: "Plea Timing & Credit Preservation",
      actions: [
        "Assess plea position before PTPH",
        "Consider early guilty plea for maximum credit",
        "Preserve plea credit window",
        "Negotiate charge reduction if applicable",
      ],
      timing: "before_PTPH",
      judicialOptics: "ATTRACTIVE",
    });

    // 2) Mitigation pack build
    plan.push({
      title: "Mitigation Pack Build",
      actions: [
        "Gather character references",
        "Collect personal circumstances evidence",
        "Prepare mitigation statement",
        "Review sentencing guidelines",
      ],
      timing: "anytime",
      judicialOptics: "ATTRACTIVE",
    });

    // 3) Character + rehabilitation evidence
    plan.push({
      title: "Character & Rehabilitation Evidence",
      actions: [
        "Gather character references from employers/family",
        "Collect rehabilitation evidence if applicable",
        "Prepare character evidence bundle",
        "Consider expert reports if relevant",
      ],
      timing: "anytime",
      judicialOptics: "ATTRACTIVE",
    });

    // 4) Sentence engineering (guidelines mapping)
    plan.push({
      title: "Sentence Engineering (Guidelines Mapping)",
      actions: [
        "Review sentencing guidelines",
        "Identify factors supporting non-custodial outcome",
        "Map case facts to guideline categories",
        "Prepare sentencing submissions",
      ],
      timing: "after_disclosure",
      judicialOptics: "ATTRACTIVE",
    });
  }

  return {
    triggers,
    plan,
  };
}

/**
 * Generate residual summary
 */
function generateResidualSummary(
  status: ResidualStatus,
  angles: ResidualAngle[],
  signals: EvidenceSignals,
  canGenerateAnalysis: boolean
): string {
  if (!canGenerateAnalysis) {
    return "Analysis gated – residual attack assessment pending disclosure completion. Standard residual angles available as hypotheses requiring evidence confirmation.";
  }

  if (status === "EXHAUSTED") {
    return "No further viable evidential/procedural attacks currently identified beyond those listed. Further challenge depends on adverse disclosure or new inconsistencies. Focus shifts to last-resort leverage (plea timing, mitigation, sentence engineering).";
  }

  const evidenceBackedCount = angles.filter(a => a.evidenceBasis === "EVIDENCE_BACKED").length;
  const hypothesisCount = angles.filter(a => a.evidenceBasis === "HYPOTHESIS").length;

  if (angles.length === 0) {
    return "No residual attack angles identified beyond existing attack paths.";
  }

  return `Residual attack angles identified: ${angles.length} total (${evidenceBackedCount} evidence-backed, ${hypothesisCount} hypothesis requiring disclosure). Review each angle for viability based on available evidence. Hypothesis angles require disclosure confirmation before use.`;
}

