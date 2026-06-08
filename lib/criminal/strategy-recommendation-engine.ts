/**
 * Criminal Strategy Recommendation Engine
 * 
 * Deterministic-first engine that selects, ranks, and explains the best defence strategy
 * based ONLY on extracted evidence and diagnostics. No hallucinations.
 * 
 * Must respect Analysis Gate and work deterministically when gated.
 */

import type { RouteType } from "./strategy-fight-types";

export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type FlipCondition = {
  evidenceEvent: string;
  flipsTo: RouteType;
  why: string;
  timing: "before_PTPH" | "after_disclosure" | "anytime";
};

export interface StrategyRecommendation {
  recommended: RouteType;
  confidence: RecommendationConfidence;
  rationale: string;
  ranking: RouteType[];
  flipConditions: FlipCondition[];
  solicitorNarrative: string;
}

export type EvidenceSignals = {
  // ID evidence
  idStrength: "strong" | "weak" | "unknown";
  idSources: number; // Number of independent ID sources
  idConditions: "good" | "poor" | "unknown"; // Lighting, distance, duration
  
  // Intent indicators
  medicalEvidence: "sustained" | "single_brief" | "unknown";
  cctvSequence: "prolonged" | "brief" | "unknown" | "missing";
  weaponUse: "sustained_targeted" | "brief_incidental" | "none" | "unknown";
  
  // Disclosure
  disclosureCompleteness: "complete" | "gaps" | "unknown";
  disclosureGaps: string[]; // List of missing items
  
  // Procedural
  paceCompliance: "compliant" | "breaches" | "unknown";
  interviewEvidence: boolean;
  custodyEvidence: boolean;
  
  // Case strength
  prosecutionStrength: "strong" | "moderate" | "weak" | "unknown";
};

export type CaseDiagnostics = {
  docCount: number;
  rawCharsTotal: number;
  suspectedScanned: boolean;
  textThin: boolean;
  canGenerateAnalysis: boolean;
};

/**
 * Extract evidence signals from case data
 */
export function extractEvidenceSignals(
  diagnostics: CaseDiagnostics,
  documents?: Array<{ name?: string; raw_text?: string; extracted_json?: any }>,
  charges?: Array<{ section?: string; offence?: string }>
): EvidenceSignals {
  const signals: EvidenceSignals = {
    idStrength: "unknown",
    idSources: 0,
    idConditions: "unknown",
    medicalEvidence: "unknown",
    cctvSequence: "unknown",
    weaponUse: "unknown",
    disclosureCompleteness: "unknown",
    disclosureGaps: [],
    paceCompliance: "unknown",
    interviewEvidence: false,
    custodyEvidence: false,
    prosecutionStrength: "unknown",
  };

  if (!diagnostics.canGenerateAnalysis || !documents || documents.length === 0) {
    return signals; // Return defaults when gated
  }

  // Combine all document text for analysis
  const docText = documents
    .map(d => {
      const name = (d.name || "").toLowerCase();
      const rawText = (d.raw_text || "").toLowerCase();
      const extracted = d.extracted_json as any;
      const extractedText = extracted ? JSON.stringify(extracted).toLowerCase() : "";
      return `${name} ${rawText} ${extractedText}`;
    })
    .join(" ");

  // Extract ID evidence signals
  if (docText.includes("cctv") || docText.includes("camera") || docText.includes("footage")) {
    signals.cctvSequence = docText.includes("prolonged") || docText.includes("sustained") 
      ? "prolonged" 
      : docText.includes("brief") || docText.includes("single") 
        ? "brief" 
        : "unknown";
  } else {
    signals.cctvSequence = "missing";
  }

  // Count ID sources
  const idIndicators = [
    docText.includes("witness"),
    docText.includes("identification"),
    docText.includes("viper"),
    docText.includes("line-up"),
    signals.cctvSequence !== "missing",
  ];
  signals.idSources = idIndicators.filter(Boolean).length;
  signals.idStrength = signals.idSources >= 3 ? "strong" : signals.idSources >= 1 ? "weak" : "unknown";

  // Extract medical evidence signals
  if (docText.includes("medical") || docText.includes("injury") || docText.includes("hospital")) {
    if (docText.includes("sustained") || docText.includes("multiple") || docText.includes("repeated")) {
      signals.medicalEvidence = "sustained";
    } else if (docText.includes("single") || docText.includes("brief") || docText.includes("one")) {
      signals.medicalEvidence = "single_brief";
    }
  }

  // Extract weapon signals
  if (docText.includes("weapon") || docText.includes("knife") || docText.includes("blade")) {
    if (docText.includes("sustained") || docText.includes("targeted") || docText.includes("repeated")) {
      signals.weaponUse = "sustained_targeted";
    } else if (docText.includes("brief") || docText.includes("incidental")) {
      signals.weaponUse = "brief_incidental";
    } else {
      signals.weaponUse = "unknown";
    }
  } else {
    signals.weaponUse = "none";
  }

  // Extract disclosure signals
  const disclosureItems = ["mg6", "disclosure", "schedule", "unused material"];
  const hasDisclosure = disclosureItems.some(item => docText.includes(item));
  signals.disclosureCompleteness = hasDisclosure ? "complete" : "gaps";

  // Common missing items
  if (!docText.includes("cctv") && !docText.includes("camera")) {
    signals.disclosureGaps.push("CCTV footage");
  }
  if (!docText.includes("mg6") && !docText.includes("disclosure schedule")) {
    signals.disclosureGaps.push("MG6 schedules");
  }
  if (!docText.includes("interview") && !docText.includes("caution")) {
    signals.disclosureGaps.push("Interview recording");
  }
  if (!docText.includes("custody") && !docText.includes("pace")) {
    signals.disclosureGaps.push("Custody record");
  }

  // Extract PACE signals
  signals.interviewEvidence = docText.includes("interview") || docText.includes("caution");
  signals.custodyEvidence = docText.includes("custody") || docText.includes("pace");
  signals.paceCompliance = docText.includes("breach") || docText.includes("non-compliant") 
    ? "breaches" 
    : signals.interviewEvidence || signals.custodyEvidence 
      ? "compliant" 
      : "unknown";

  // Assess prosecution strength (simplified)
  const strongIndicators = [
    signals.idStrength === "strong",
    signals.medicalEvidence === "sustained",
    signals.cctvSequence === "prolonged",
    signals.weaponUse === "sustained_targeted",
  ];
  const weakIndicators = [
    signals.idStrength === "weak",
    signals.disclosureCompleteness === "gaps",
    signals.paceCompliance === "breaches",
  ];

  if (strongIndicators.filter(Boolean).length >= 2) {
    signals.prosecutionStrength = "strong";
  } else if (weakIndicators.filter(Boolean).length >= 2) {
    signals.prosecutionStrength = "weak";
  } else {
    signals.prosecutionStrength = "moderate";
  }

  return signals;
}

/**
 * Generate strategy recommendation based on evidence signals
 */
export function generateStrategyRecommendation(
  signals: EvidenceSignals,
  diagnostics: CaseDiagnostics,
  routeTypes: RouteType[]
): StrategyRecommendation {
  // When gated, use conservative defaults
  if (!diagnostics.canGenerateAnalysis) {
    return {
      recommended: "outcome_management",
      confidence: "LOW",
      rationale: "Analysis gated – insufficient text extracted. Conservative recommendation: focus on outcome management until disclosure is complete and evidence can be properly assessed.",
      ranking: ["outcome_management", "charge_reduction", "fight_charge"],
      flipConditions: [
        {
          evidenceEvent: "Full disclosure received and evidence assessed",
          flipsTo: "fight_charge",
          why: "Once disclosure is complete, reassess viability of challenging prosecution case",
          timing: "after_disclosure",
        },
      ],
      solicitorNarrative: "With limited extractable text, the safest approach is outcome management. Request full disclosure immediately and reassess strategy once all material is available. Do not commit to trial strategy until disclosure is complete.",
    };
  }

  // Scoring system for each route
  const scores: Record<RouteType, { score: number; reasons: string[] }> = {
    fight_charge: { score: 0, reasons: [] },
    charge_reduction: { score: 0, reasons: [] },
    outcome_management: { score: 0, reasons: [] },
  };

  // Fight Charge scoring
  if (signals.idStrength === "weak") {
    scores.fight_charge.score += 3;
    scores.fight_charge.reasons.push("Weak identification evidence supports challenge");
  }
  if (signals.disclosureCompleteness === "gaps" && signals.disclosureGaps.length > 0) {
    scores.fight_charge.score += 2;
    scores.fight_charge.reasons.push("Disclosure gaps create leverage for challenge");
  }
  if (signals.paceCompliance === "breaches") {
    scores.fight_charge.score += 2;
    scores.fight_charge.reasons.push("PACE breaches support exclusion applications");
  }
  if (signals.prosecutionStrength === "weak") {
    scores.fight_charge.score += 2;
    scores.fight_charge.reasons.push("Weak prosecution case supports full challenge");
  }
  // Penalties
  if (signals.idStrength === "strong" && signals.idSources >= 3) {
    scores.fight_charge.score -= 2;
    scores.fight_charge.reasons.push("Strong identification evidence weakens challenge");
  }
  if (signals.prosecutionStrength === "strong") {
    scores.fight_charge.score -= 2;
    scores.fight_charge.reasons.push("Strong prosecution case reduces acquittal prospects");
  }

  // Charge Reduction scoring
  if (signals.medicalEvidence === "single_brief") {
    scores.charge_reduction.score += 3;
    scores.charge_reduction.reasons.push("Single/brief injury pattern supports intent distinction");
  }
  if (signals.cctvSequence === "brief") {
    scores.charge_reduction.score += 2;
    scores.charge_reduction.reasons.push("Brief CCTV sequence supports recklessness over intent");
  }
  if (signals.weaponUse === "brief_incidental") {
    scores.charge_reduction.score += 2;
    scores.charge_reduction.reasons.push("Brief/incidental weapon use supports s20 over s18");
  }
  if (signals.prosecutionStrength === "moderate") {
    scores.charge_reduction.score += 1;
    scores.charge_reduction.reasons.push("Moderate prosecution case supports negotiation");
  }
  // Penalties
  if (signals.medicalEvidence === "sustained") {
    scores.charge_reduction.score -= 3;
    scores.charge_reduction.reasons.push("Sustained injuries indicate specific intent");
  }
  if (signals.cctvSequence === "prolonged") {
    scores.charge_reduction.score -= 2;
    scores.charge_reduction.reasons.push("Prolonged CCTV sequence supports intent");
  }
  if (signals.weaponUse === "sustained_targeted") {
    scores.charge_reduction.score -= 2;
    scores.charge_reduction.reasons.push("Sustained/targeted weapon use supports intent");
  }

  // Outcome Management scoring
  if (signals.prosecutionStrength === "strong") {
    scores.outcome_management.score += 3;
    scores.outcome_management.reasons.push("Strong prosecution case favours mitigation focus");
  }
  if (signals.idStrength === "strong" && signals.idSources >= 3) {
    scores.outcome_management.score += 2;
    scores.outcome_management.reasons.push("Strong identification reduces challenge prospects");
  }
  if (signals.medicalEvidence === "sustained") {
    scores.outcome_management.score += 1;
    scores.outcome_management.reasons.push("Sustained injuries support conviction risk");
  }
  // Penalties
  if (signals.prosecutionStrength === "weak") {
    scores.outcome_management.score -= 2;
    scores.outcome_management.reasons.push("Weak prosecution case - acquittal possible");
  }
  if (signals.disclosureCompleteness === "gaps" && signals.disclosureGaps.length > 2) {
    scores.outcome_management.score -= 1;
    scores.outcome_management.reasons.push("Significant disclosure gaps - premature to recommend plea");
  }

  // Rank routes by score
  const ranked = routeTypes
    .map(route => ({
      route,
      score: scores[route].score,
      reasons: scores[route].reasons,
    }))
    .sort((a, b) => b.score - a.score);

  const recommended = ranked[0].route;
  const ranking = ranked.map(r => r.route);

  // Determine confidence
  const scoreDiff = ranked[0].score - ranked[1].score;
  let confidence: RecommendationConfidence;
  if (scoreDiff >= 3) {
    confidence = "HIGH";
  } else if (scoreDiff >= 1) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  // Conservative confidence rules: cap at LOW if evidence is thin/gated
  if (!diagnostics.canGenerateAnalysis) {
    confidence = "LOW";
    ranked[0].reasons.push("Confidence capped at LOW: Analysis gated – insufficient text extracted");
  } else if (diagnostics.docCount < 2) {
    confidence = "LOW";
    ranked[0].reasons.push("Confidence capped at LOW: Insufficient documents (< 2)");
  } else if (diagnostics.rawCharsTotal < 1000) {
    confidence = "LOW";
    ranked[0].reasons.push("Confidence capped at LOW: Insufficient text extracted (< 1000 chars)");
  } else if (diagnostics.textThin) {
    confidence = "LOW";
    ranked[0].reasons.push("Confidence capped at LOW: Text is thin (likely scanned images)");
  }

  // If confidence is LOW, check why
  if (confidence === "LOW") {
    const unknownCount = [
      signals.idStrength === "unknown",
      signals.medicalEvidence === "unknown",
      signals.cctvSequence === "unknown",
      signals.disclosureCompleteness === "unknown",
    ].filter(Boolean).length;

    if (unknownCount >= 2) {
      ranked[0].reasons.push(`Confidence reduced: ${unknownCount} key evidence signals unknown`);
    }
  }

  // Generate rationale
  const rationale = ranked[0].reasons.length > 0
    ? ranked[0].reasons.join(". ") + "."
    : "Based on available evidence signals, this strategy offers the best prospects.";

  // Generate flip conditions
  const flipConditions: FlipCondition[] = [];

  if (recommended === "fight_charge") {
    if (signals.cctvSequence === "unknown" || signals.cctvSequence === "missing") {
      flipConditions.push({
        evidenceEvent: "CCTV shows prolonged or targeted attack",
        flipsTo: "outcome_management",
        why: "Prolonged CCTV sequence would support prosecution intent case and reduce acquittal prospects",
        timing: "after_disclosure",
      });
    }
    if (signals.disclosureCompleteness === "gaps") {
      flipConditions.push({
        evidenceEvent: "Full disclosure provided with no material gaps",
        flipsTo: "charge_reduction",
        why: "Complete disclosure may strengthen prosecution case, making charge reduction more viable than full challenge",
        timing: "after_disclosure",
      });
    }
    if (signals.idStrength === "unknown") {
      flipConditions.push({
        evidenceEvent: "Strong identification evidence from multiple independent sources",
        flipsTo: "outcome_management",
        why: "Strong identification would reduce prospects of successful challenge",
        timing: "after_disclosure",
      });
    }
  }

  if (recommended === "charge_reduction") {
    flipConditions.push({
      evidenceEvent: "Medical evidence shows sustained/targeted injuries",
      flipsTo: "outcome_management",
      why: "Sustained injuries clearly indicate specific intent, making charge reduction unlikely",
      timing: "after_disclosure",
    });
    flipConditions.push({
      evidenceEvent: "CCTV shows prolonged or targeted attack",
      flipsTo: "outcome_management",
      why: "Prolonged sequence supports specific intent over recklessness",
      timing: "after_disclosure",
    });
    if (signals.disclosureCompleteness === "gaps") {
      flipConditions.push({
        evidenceEvent: "Disclosure gaps reveal weak prosecution case",
        flipsTo: "fight_charge",
        why: "If disclosure gaps indicate weak case, full challenge may be viable",
        timing: "after_disclosure",
      });
    }
  }

  if (recommended === "outcome_management") {
    if (signals.disclosureCompleteness === "gaps") {
      flipConditions.push({
        evidenceEvent: "Disclosure gaps reveal weak prosecution case",
        flipsTo: "fight_charge",
        why: "If disclosure gaps indicate weak case, acquittal may be possible",
        timing: "after_disclosure",
      });
    }
    flipConditions.push({
      evidenceEvent: "Medical evidence shows single/brief injury pattern",
      flipsTo: "charge_reduction",
      why: "Single/brief injuries support intent distinction and charge reduction",
      timing: "after_disclosure",
    });
    if (signals.idStrength === "weak") {
      flipConditions.push({
        evidenceEvent: "Identification evidence successfully challenged",
        flipsTo: "fight_charge",
        why: "If identification is excluded, full challenge becomes viable",
        timing: "before_PTPH",
      });
    }
  }

      // Generate solicitor narrative
      const solicitorNarrative = generateSolicitorNarrative(
        recommended,
        confidence,
        signals,
        diagnostics
      );

  return {
    recommended,
    confidence,
    rationale,
    ranking,
    flipConditions,
    solicitorNarrative,
  };
}

/**
 * Generate solicitor narrative (plain, professional, leverage-aware)
 */
function generateSolicitorNarrative(
  recommended: RouteType,
  confidence: RecommendationConfidence,
  signals: EvidenceSignals,
  diagnostics: CaseDiagnostics
): string {
  const narratives: Record<RouteType, (conf: RecommendationConfidence, sig: EvidenceSignals) => string> = {
    fight_charge: (conf, sig) => {
      let narrative = "Recommendation: Fight Charge (Full Trial Strategy). ";
      
      if (conf === "HIGH") {
        narrative += "High confidence based on clear evidence signals. ";
      } else if (conf === "MEDIUM") {
        narrative += "Medium confidence - recommendation is sound but some evidence remains uncertain. ";
      } else {
        narrative += "Low confidence - recommendation is provisional pending further disclosure. ";
      }

      narrative += "The evidence currently supports challenging the prosecution case at trial. ";

      if (sig.idStrength === "weak") {
        narrative += "Identification evidence is weak, creating opportunity for Turnbull challenge. ";
      }
      if (sig.disclosureCompleteness === "gaps" && sig.disclosureGaps.length > 0) {
        narrative += `Disclosure gaps exist (${sig.disclosureGaps.slice(0, 2).join(", ")}), which may provide leverage. `;
      }
      if (sig.paceCompliance === "breaches") {
        narrative += "PACE compliance issues may support exclusion applications. ";
      }

      narrative += "Time pressure: prepare disclosure requests immediately and document chase trail. ";
      narrative += "Risk: if disclosure gaps are filled or identification strengthens, reassess before PTPH. ";

      return narrative;
    },

    charge_reduction: (conf, sig) => {
      let narrative = "Recommendation: Charge Reduction (s18 → s20). ";
      
      if (conf === "HIGH") {
        narrative += "High confidence based on clear intent distinction signals. ";
      } else if (conf === "MEDIUM") {
        narrative += "Medium confidence - intent distinction is viable but requires careful evidence analysis. ";
      } else {
        narrative += "Low confidence - recommendation depends on medical and sequence evidence yet to be fully assessed. ";
      }

      narrative += "The evidence supports challenging intent threshold rather than full acquittal. ";

      if (sig.medicalEvidence === "single_brief") {
        narrative += "Medical evidence indicates single/brief injury pattern, consistent with recklessness. ";
      }
      if (sig.cctvSequence === "brief") {
        narrative += "CCTV sequence is brief, supporting recklessness over specific intent. ";
      }
      if (sig.weaponUse === "brief_incidental") {
        narrative += "Weapon use appears brief/incidental, not sustained/targeted. ";
      }

      narrative += "Timing: negotiate charge reduction before PTPH to preserve leverage. ";
      narrative += "Risk: if medical or CCTV evidence shows sustained/targeted conduct, pivot to outcome management. ";

      return narrative;
    },

    outcome_management: (conf, sig) => {
      let narrative = "Recommendation: Outcome Management (Plea/Mitigation). ";
      
      if (conf === "HIGH") {
        narrative += "High confidence - prosecution case appears strong, focus on sentencing position. ";
      } else if (conf === "MEDIUM") {
        narrative += "Medium confidence - prosecution case is moderate, mitigation focus is prudent. ";
      } else {
        narrative += "Low confidence - recommendation is conservative pending full disclosure assessment. ";
      }

      narrative += "The evidence suggests conviction risk is significant; focus on minimising sentence. ";

      if (sig.prosecutionStrength === "strong") {
        narrative += "Prosecution case appears strong based on available evidence. ";
      }
      if (sig.idStrength === "strong") {
        narrative += "Identification evidence is strong, reducing challenge prospects. ";
      }
      if (sig.medicalEvidence === "sustained") {
        narrative += "Medical evidence indicates sustained injuries, supporting intent. ";
      }

      narrative += "Timing: consider early plea for maximum credit, but only after disclosure is complete. ";
      narrative += "Risk: if disclosure reveals weak case or identification issues, reassess before committing to plea. ";

      return narrative;
    },
  };

  return narratives[recommended](confidence, signals);
}

