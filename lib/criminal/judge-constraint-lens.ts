/**
 * Judge Constraint Lens
 * 
 * Provides doctrine-based constraints on how the court must analyze issues,
 * without predictions or probabilities. Uses professional legal language.
 * 
 * Wording rules:
 * - Use "The court must...", "The prosecution must...", "Absent X...", "The court will require evidence of..."
 * - Do NOT use: "the judge will", "likely", "probably", "you will win"
 * - No personality-based claims. No forecasting.
 */

import type { OffenceElementState, DependencyState, RouteAssessment } from "./strategy-coordinator";
import type { OffenceDef } from "./offence-elements";
import type { EvidenceSnapshot } from "./strategy-output/evidence-snapshot";

export type JudgeConstraintLens = {
  constraints: Array<{
    title: string;
    detail: string;
    applies_to: string[];
  }>;
  required_findings: string[];
  intolerances: string[]; // Things the court will not infer without evidence
  red_flags: string[]; // Issues that tend to trigger judicial pushback
};

export type BuildJudgeConstraintLensInput = {
  snapshot: EvidenceSnapshot;
  offenceElements: OffenceElementState[];
  routes: RouteAssessment[];
  dependencies?: DependencyState[];
  recordedPosition?: {
    primary?: string;
    position_text?: string;
  } | null;
};

/**
 * Build Judge Constraint Lens from snapshot, offence elements, routes, and recorded position.
 * Returns doctrine-based constraints without predictions.
 */
export function buildJudgeConstraintLens(
  input: BuildJudgeConstraintLensInput
): JudgeConstraintLens {
  const { snapshot, offenceElements, routes, dependencies = [], recordedPosition } = input;

  const constraints: JudgeConstraintLens["constraints"] = [];
  const required_findings: string[] = [];
  const intolerances: string[] = [];
  const red_flags: string[] = [];

  // Detect offence type from snapshot or elements
  const offenceCode = snapshot.offence?.code || "unknown";
  const isS18 = offenceCode === "s18_oapa";
  const isS20 = offenceCode === "s20_oapa";
  const isOAPA = isS18 || isS20;

  // Get weak/none elements
  const weakElements = offenceElements.filter(
    (e) => e.support === "weak" || e.support === "none"
  );
  const strongElements = offenceElements.filter((e) => e.support === "strong");

  // Get outstanding dependencies
  const outstandingDeps = dependencies.filter(
    (d) => d.status === "outstanding"
  );

  // ============================================================================
  // IDENTIFICATION CONSTRAINTS (Turnbull principles)
  // ============================================================================
  const identificationElement = offenceElements.find(
    (e) => e.id === "identification"
  );
  if (identificationElement && (identificationElement.support === "weak" || identificationElement.support === "none")) {
    constraints.push({
      title: "Turnbull Identification Reliability",
      detail: "The court must assess identification reliability against Turnbull guidelines. The court will require evidence of: lighting conditions, duration of observation, distance, recognition context, and any previous familiarity.",
      applies_to: ["identification"],
    });

    required_findings.push(
      "Sequence/ID conditions evidence (lighting, duration, distance, recognition context)"
    );

    intolerances.push(
      "The court will not infer reliable identification without evidence of observation conditions"
    );

    // Check for missing CCTV/BWV that would affect ID
    const idDeps = outstandingDeps.filter(
      (d) =>
        d.id.includes("cctv") ||
        d.id.includes("bwv") ||
        d.label.toLowerCase().includes("cctv") ||
        d.label.toLowerCase().includes("bwv")
    );
    if (idDeps.length > 0) {
      red_flags.push(
        "Missing CCTV/BWV where identification is disputed - court must assess reliability without visual evidence"
      );
    }
  }

  // ============================================================================
  // INTENT VS RECKLESSNESS CONSTRAINTS (s18 vs s20)
  // ============================================================================
  if (isS18) {
    const intentElement = offenceElements.find((e) => e.id === "specific_intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      constraints.push({
        title: "Specific Intent Requirement (s18)",
        detail: "The court must distinguish specific intent (s18) from recklessness (s20). The prosecution must prove the defendant intended to cause serious harm, not merely that they were reckless. Absent evidence of targeting, deliberation, or premeditation, the court cannot infer specific intent.",
        applies_to: ["specific_intent", "mental_state"],
      });

      required_findings.push(
        "Targeting/duration evidence (sequence, repetition, context, premeditation indicators) to establish specific intent"
      );

      intolerances.push(
        "The court will not infer specific intent from injury alone; evidence of targeting or deliberation is required"
      );

      // If ID is strong but intent is weak, s20 alternative is relevant
      if (identificationElement && identificationElement.support === "strong") {
        constraints.push({
          title: "Alternative Mental State Framing",
          detail: "The court must distinguish specific intent (s18) from recklessness (s20) based on available evidence. Absence of targeting/deliberation evidence supports alternative mental state (s20).",
          applies_to: ["specific_intent", "mental_state"],
        });
      }
    }
  }

  if (isS20) {
    const recklessnessElement = offenceElements.find(
      (e) => e.id === "recklessness"
    );
    if (
      recklessnessElement &&
      (recklessnessElement.support === "weak" || recklessnessElement.support === "none")
    ) {
      constraints.push({
        title: "Cunningham Recklessness Requirement",
        detail: "The court must assess whether the defendant was aware of the risk of causing serious harm. The prosecution must prove the defendant foresaw the risk and proceeded regardless.",
        applies_to: ["recklessness", "mental_state"],
      });

      required_findings.push(
        "Awareness/risk evidence (circumstances, defendant's state, foreseeability)"
      );

      intolerances.push(
        "The court will not infer awareness of risk without evidence of the defendant's state of mind or circumstances"
      );
    }
  }

  // ============================================================================
  // GBH/WOUNDING THRESHOLD CONSTRAINTS
  // ============================================================================
  if (isOAPA) {
    const injuryElement = offenceElements.find(
      (e) =>
        e.id === "injury_threshold" ||
        e.id === "injury_classification" ||
        e.id === "injury"
    );
    if (injuryElement && (injuryElement.support === "weak" || injuryElement.support === "none")) {
      constraints.push({
        title: "GBH/Wounding Threshold (Serious Harm)",
        detail: "The court must determine whether the injury meets the GBH/wounding threshold. The prosecution must prove serious harm (grievous bodily harm) or wounding. Absent medical mechanism confirmation, the court cannot classify the injury.",
        applies_to: ["injury_threshold", "injury_classification"],
      });

      required_findings.push(
        "Medical mechanism confirmation (causation, mechanism, severity classification)"
      );

      intolerances.push(
        "The court will not infer GBH/wounding classification without medical evidence of mechanism and causation"
      );
    }
  }

  // ============================================================================
  // CAUSATION CONSTRAINTS
  // ============================================================================
  const actElement = offenceElements.find(
    (e) => e.id === "act_causation" || e.id === "actus_reus" || e.id === "causation"
  );
  if (actElement && (actElement.support === "weak" || actElement.support === "none")) {
    constraints.push({
      title: "Causation Requirement",
      detail: "The court must establish causation between the act and the injury. The prosecution must prove the act caused the injury beyond reasonable doubt. Absent sequence evidence, the court cannot infer causation.",
      applies_to: ["causation", "actus_reus"],
    });

    required_findings.push(
      "Sequence evidence (timing, mechanism, alternative causation possibilities)"
    );

    intolerances.push(
      "The court will not infer causation without evidence of sequence and mechanism"
    );
  }

  // ============================================================================
  // WEAPON UNCERTAINTY CONSTRAINTS
  // ============================================================================
  const weaponElement = offenceElements.find((e) => e.id.includes("weapon"));
  if (weaponElement && (weaponElement.support === "weak" || weaponElement.support === "none")) {
    constraints.push({
      title: "Weapon Presence/Use Requirement",
      detail: "The court must determine weapon presence and use. The prosecution must prove the weapon was present and used. Absent witness observations, recovery, or forensic confirmation, the court cannot infer weapon use.",
      applies_to: ["weapon", "causation"],
    });

    required_findings.push(
      "Weapon visibility/mechanism clarity (witness observations, recovery, forensic confirmation)"
    );

    intolerances.push(
      "The court will not infer weapon use without evidence of visibility, recovery, or forensic confirmation"
    );

    if (weaponElement.gaps.length > 0 || weaponElement.refs.length === 0) {
      red_flags.push(
        "Witness uncertainty on weapon (visibility, recovery, mechanism unclear) - court must resolve uncertainty"
      );
    }
  }

  // ============================================================================
  // SELF-DEFENCE CONSTRAINTS
  // ============================================================================
  if (recordedPosition?.primary === "fight_charge" || 
      recordedPosition?.position_text?.toLowerCase().includes("self-defence") ||
      recordedPosition?.position_text?.toLowerCase().includes("self defence")) {
    const hasSelfDefenceEvidence = offenceElements.some((e) =>
      e.refs.some(
        (ref) =>
          ref.note.toLowerCase().includes("self-defence") ||
          ref.note.toLowerCase().includes("self defence")
      )
    );
    if (!hasSelfDefenceEvidence) {
      constraints.push({
        title: "Self-Defence Evidential Basis Requirement",
        detail: "Self-defence requires an evidential basis. The court cannot infer self-defence; the defendant must raise it with supporting evidence. The court will require evidence of: necessity, reasonableness, and circumstances supporting the defence.",
        applies_to: ["self_defence", "unlawfulness"],
      });

      required_findings.push(
        "Evidential basis for self-defence narrative (defendant's account, circumstances, threat evidence)"
      );

      intolerances.push(
        "The court will not infer self-defence without an evidential basis; defendant must raise it with supporting evidence"
      );
    }
  }

  // ============================================================================
  // DISCLOSURE FAIRNESS CONSTRAINTS
  // ============================================================================
  if (outstandingDeps.length > 0) {
    // Check procedural safety from snapshot disclosure state
    const hasRequiredDeps = snapshot.disclosure.required_dependencies.length > 0;
    const hasRequiredWithoutTimeline = snapshot.disclosure.required_without_timeline.length > 0;
    if (
      hasRequiredDeps ||
      hasRequiredWithoutTimeline ||
      outstandingDeps.length >= 3
    ) {
      constraints.push({
        title: "CPIA Fair Trial Requirement",
        detail: "The court must ensure a fair trial. Missing material disclosure affects case management. The court will require disclosure of material items before the case can safely proceed.",
        applies_to: ["disclosure", "fair_trial"],
      });

      required_findings.push(
        "Material disclosure items (CCTV, BWV, 999, CAD, interview recordings) where decisive for disputed elements"
      );

      intolerances.push(
        "The court will not proceed with trial where material disclosure is missing and affects fair trial"
      );

      // Check for key missing items
      const keyMissing = outstandingDeps.filter(
        (d) =>
          d.id.includes("cctv") ||
          d.id.includes("bwv") ||
          d.id.includes("999") ||
          d.id.includes("interview") ||
          d.id.includes("cad")
      );
      if (keyMissing.length > 0) {
        red_flags.push(
          "Missing key disclosure items (CCTV/BWV/999/interview) where decisive for disputed elements - court must assess fair trial impact"
        );
      }
    }
  }

  // ============================================================================
  // CCTV CONTINUITY CONSTRAINTS
  // ============================================================================
  const cctvDeps = outstandingDeps.filter(
    (d) => d.id.includes("cctv") || d.label.toLowerCase().includes("cctv")
  );
  const continuityDep = dependencies.find(
    (d) =>
      d.id.includes("continuity") || d.label.toLowerCase().includes("continuity")
  );
  if (cctvDeps.length > 0 || (continuityDep && continuityDep.status === "outstanding")) {
    constraints.push({
      title: "CCTV Continuity and Integrity Requirement",
      detail: "CCTV weight depends on continuity and integrity. The court must assess the integrity chain. Missing continuity affects weight; the court will require continuity logs (seizure, storage, exhibit logs, chain of custody).",
      applies_to: ["cctv", "continuity", "evidence_weight"],
    });

    required_findings.push(
      "CCTV continuity logs (seizure, storage, exhibit logs, chain of custody)"
    );

    intolerances.push(
      "The court will not give full weight to CCTV evidence without continuity and integrity chain"
    );

    red_flags.push(
      "Date inconsistencies / continuity issues in CCTV evidence - court must assess integrity"
    );
  }

  // ============================================================================
  // GENERIC CONSTRAINTS FOR WEAK ELEMENTS
  // ============================================================================
  if (weakElements.length > 0) {
    constraints.push({
      title: "Evidence-Based Resolution Requirement",
      detail: "The court must resolve disputed elements based on available evidence. Missing material affects assessment. The prosecution must prove each element beyond reasonable doubt.",
      applies_to: weakElements.map((e) => e.id),
    });

    required_findings.push(
      "Evidence supporting each disputed element beyond reasonable doubt"
    );

    intolerances.push(
      "The court will not infer elements without supporting evidence; prosecution must prove each element"
    );
  }

  // ============================================================================
  // ROUTE-SPECIFIC CONSTRAINTS
  // ============================================================================
  const viableRoutes = routes.filter((r) => r.status === "viable");
  for (const route of viableRoutes) {
    if (route.id === "identification_challenge") {
      constraints.push({
        title: "Identification Challenge Route",
        detail: "The court must assess identification reliability. Absent strong identification evidence, the court cannot convict on identification alone.",
        applies_to: ["identification"],
      });
    } else if (route.id === "intent_denial" && isS18) {
      constraints.push({
        title: "Intent Denial Route",
        detail: "The court must distinguish specific intent from recklessness. Absent evidence of targeting or deliberation, the court cannot infer specific intent.",
        applies_to: ["specific_intent"],
      });
    } else if (route.id === "weapon_uncertainty_causation") {
      constraints.push({
        title: "Weapon Uncertainty Route",
        detail: "The court must determine weapon presence and causation. Absent clear evidence of weapon use, the court cannot infer causation from weapon alone.",
        applies_to: ["weapon", "causation"],
      });
    }
  }

  // Remove duplicates and limit counts
  const uniqueConstraints = Array.from(
    new Map(constraints.map((c) => [c.title, c])).values()
  ).slice(0, 10); // Max 10 constraints

  const uniqueRequiredFindings = Array.from(new Set(required_findings)).slice(0, 8); // Max 8
  const uniqueIntolerances = Array.from(new Set(intolerances)).slice(0, 6); // Max 6
  const uniqueRedFlags = Array.from(new Set(red_flags)).slice(0, 6); // Max 6

  return {
    constraints: uniqueConstraints,
    required_findings: uniqueRequiredFindings,
    intolerances: uniqueIntolerances,
    red_flags: uniqueRedFlags,
  };
}
