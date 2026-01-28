/**
 * Strategy Routes Library
 * 
 * Canonical strategy route definitions and deterministic evaluation.
 * No routes may be invented dynamically - only these canonical routes exist.
 * No predictions, no "likely/probably", no "judge will/CPS will".
 */

import type { ElementSupport } from "./strategy-coordinator";

export type CanonicalRouteId =
  | "procedural_disclosure_leverage"
  | "identification_challenge"
  | "act_denial"
  | "intent_denial"
  | "weapon_uncertainty_causation"
  | "self_defence"
  | "alternative_mental_state_offence"
  | "mitigation_early_resolution";

export type RouteAssessment = {
  id: CanonicalRouteId;
  status: "viable" | "risky" | "blocked";
  reasons: string[];
  required_dependencies: string[];
  constraints: string[];
};

export const CANONICAL_ROUTES: Array<{ id: CanonicalRouteId; label: string }> = [
  { id: "procedural_disclosure_leverage", label: "Procedural Disclosure Leverage" },
  { id: "identification_challenge", label: "Identification Challenge" },
  { id: "act_denial", label: "Act Denial" },
  { id: "intent_denial", label: "Intent Denial" },
  { id: "weapon_uncertainty_causation", label: "Weapon Uncertainty / Causation" },
  { id: "self_defence", label: "Self Defence" },
  { id: "alternative_mental_state_offence", label: "Alternative Mental State Offence" },
  { id: "mitigation_early_resolution", label: "Mitigation / Early Resolution" },
];

type EvaluationContext = {
  offenceDef: { code: string; label: string; elements: Array<{ id: string; label: string }> };
  elementsState: Array<{ id: string; support: ElementSupport; gaps: string[] }>;
  dependencies: Array<{ id: string; status: "outstanding" | "served" | "unknown" }>;
  plugin_constraints: Record<string, any>;
  recordedPosition?: { primary?: string; position_type?: string };
  declaredDependencies?: Array<{ id: string; status: string }>;
  irreversibleDecisions?: Array<{ id: string; status: string }>;
  extracted?: any;
};

/**
 * Evaluate all canonical routes
 */
export function evaluateRoutes(ctx: EvaluationContext): RouteAssessment[] {
  const assessments: RouteAssessment[] = [];

  for (const route of CANONICAL_ROUTES) {
    const assessment = evaluateSingleRoute(route.id, ctx);
    assessments.push(assessment);
  }

  return assessments;
}

/**
 * Evaluate a single canonical route
 */
function evaluateSingleRoute(
  routeId: CanonicalRouteId,
  ctx: EvaluationContext
): RouteAssessment {
  switch (routeId) {
    case "procedural_disclosure_leverage":
      return evaluateProceduralDisclosureLeverage(ctx);
    case "identification_challenge":
      return evaluateIdentificationChallenge(ctx);
    case "act_denial":
      return evaluateActDenial(ctx);
    case "intent_denial":
      return evaluateIntentDenial(ctx);
    case "weapon_uncertainty_causation":
      return evaluateWeaponUncertaintyCausation(ctx);
    case "self_defence":
      return evaluateSelfDefence(ctx);
    case "alternative_mental_state_offence":
      return evaluateAlternativeMentalStateOffence(ctx);
    case "mitigation_early_resolution":
      return evaluateMitigationEarlyResolution(ctx);
  }
}

/**
 * Procedural Disclosure Leverage
 * 
 * Viable if key dependencies outstanding OR procedural safety status is UNSAFE/CONDITIONALLY_UNSAFE
 */
function evaluateProceduralDisclosureLeverage(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check procedural safety status from plugin constraints
  const proceduralSafety = ctx.plugin_constraints.procedural_safety;
  if (proceduralSafety && (proceduralSafety.status === "UNSAFE_TO_PROCEED" || proceduralSafety.status === "CONDITIONALLY_UNSAFE")) {
    reasons.push(`Procedural safety status: ${proceduralSafety.status}`);
    return {
      id: "procedural_disclosure_leverage",
      status: "viable",
      reasons,
      required_dependencies: [],
      constraints: [],
    };
  }

  // Check for outstanding key dependencies
  const keyDeps = ["cctv_window_2310_2330", "cctv_continuity", "bwv_arrest", "call_999_audio", "cad_log", "interview_recording"];
  const outstandingKeyDeps = ctx.dependencies.filter(d => 
    keyDeps.includes(d.id) && d.status === "outstanding"
  );

  if (outstandingKeyDeps.length > 0) {
    reasons.push(`${outstandingKeyDeps.length} key disclosure items outstanding`);
    requiredDeps.push(...outstandingKeyDeps.map(d => d.id));
    return {
      id: "procedural_disclosure_leverage",
      status: "viable",
      reasons,
      required_dependencies: requiredDeps,
      constraints: [],
    };
  }

  // If no outstanding dependencies, route is risky (may still have leverage from timing/delays)
  reasons.push("No outstanding key dependencies; leverage may exist from timing or procedural issues");
  return {
    id: "procedural_disclosure_leverage",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Identification Challenge
 * 
 * Viable if identification element support is weak/none OR extracted text indicates poor lighting/uncertainty/fast events
 */
function evaluateIdentificationChallenge(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check identification element support
  const identificationElement = ctx.elementsState.find(e => e.id === "identification");
  if (identificationElement) {
    if (identificationElement.support === "weak" || identificationElement.support === "none") {
      reasons.push(`Identification element support: ${identificationElement.support}`);
      if (identificationElement.gaps.length > 0) {
        reasons.push(`Missing evidence: ${identificationElement.gaps.join(", ")}`);
        requiredDeps.push(...identificationElement.gaps);
      }
      return {
        id: "identification_challenge",
        status: "viable",
        reasons,
        required_dependencies: requiredDeps,
        constraints: [],
      };
    }
  }

  // Check extracted text for uncertainty indicators
  if (ctx.extracted) {
    const extractedStr = JSON.stringify(ctx.extracted).toLowerCase();
    const uncertaintyIndicators = [
      "poor lighting",
      "dark",
      "uncertain",
      "not sure",
      "couldn't see clearly",
      "fast",
      "quick",
      "brief",
      "moment",
      "glimpse",
      "hard to see",
      "difficult to identify",
    ];

    const foundIndicators = uncertaintyIndicators.filter(indicator => extractedStr.includes(indicator));
    if (foundIndicators.length > 0) {
      reasons.push(`Extracted text indicates identification uncertainty: ${foundIndicators.slice(0, 3).join(", ")}`);
      return {
        id: "identification_challenge",
        status: "viable",
        reasons,
        required_dependencies: [],
        constraints: [],
      };
    }
  }

  // If identification is strong, route is blocked
  if (identificationElement && identificationElement.support === "strong") {
    reasons.push("Identification element support is strong");
    return {
      id: "identification_challenge",
      status: "blocked",
      reasons,
      required_dependencies: [],
      constraints: ["Strong identification evidence present"],
    };
  }

  // Default to risky
  reasons.push("Identification element support is moderate");
  return {
    id: "identification_challenge",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Intent Denial
 * 
 * Viable if offence is s18 and specific_intent support is weak/none; risky if some/strong
 */
function evaluateIntentDenial(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Only relevant for s18
  if (ctx.offenceDef.code !== "s18_oapa") {
    reasons.push("Intent denial only relevant for s18 offences");
    return {
      id: "intent_denial",
      status: "blocked",
      reasons,
      required_dependencies: [],
      constraints: ["Not applicable to this offence"],
    };
  }

  // Check specific_intent element support
  const intentElement = ctx.elementsState.find(e => e.id === "specific_intent");
  if (intentElement) {
    if (intentElement.support === "weak" || intentElement.support === "none") {
      reasons.push(`Specific intent element support: ${intentElement.support}`);
      if (intentElement.gaps.length > 0) {
        reasons.push(`Missing evidence: ${intentElement.gaps.join(", ")}`);
        requiredDeps.push(...intentElement.gaps);
      }
      return {
        id: "intent_denial",
        status: "viable",
        reasons,
        required_dependencies: requiredDeps,
        constraints: [],
      };
    } else if (intentElement.support === "some") {
      reasons.push("Specific intent element support is moderate");
      return {
        id: "intent_denial",
        status: "risky",
        reasons,
        required_dependencies: [],
        constraints: [],
      };
    } else {
      reasons.push("Specific intent element support is strong");
      return {
        id: "intent_denial",
        status: "blocked",
        reasons,
        required_dependencies: [],
        constraints: ["Strong intent evidence present"],
      };
    }
  }

  // Default to risky if element not found
  reasons.push("Specific intent element state not available");
  return {
    id: "intent_denial",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Weapon Uncertainty / Causation
 * 
 * Viable if weapon support is weak/none/unclear OR medical mechanism/fracture confirmation is unclear
 */
function evaluateWeaponUncertaintyCausation(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check for weapon-related elements or evidence
  const weaponElement = ctx.elementsState.find(e => 
    e.id.includes("weapon") || e.id.includes("causation")
  );

  if (weaponElement && (weaponElement.support === "weak" || weaponElement.support === "none")) {
    reasons.push(`Weapon/causation element support: ${weaponElement.support}`);
    if (weaponElement.gaps.length > 0) {
      requiredDeps.push(...weaponElement.gaps);
    }
    return {
      id: "weapon_uncertainty_causation",
      status: "viable",
      reasons,
      required_dependencies: requiredDeps,
      constraints: [],
    };
  }

  // Check extracted text for weapon uncertainty
  if (ctx.extracted) {
    const extractedStr = JSON.stringify(ctx.extracted).toLowerCase();
    const uncertaintyIndicators = [
      "believes",
      "thinks",
      "not sure",
      "unclear",
      "uncertain",
      "didn't see",
      "couldn't see",
      "unsure",
    ];

    const foundIndicators = uncertaintyIndicators.filter(indicator => extractedStr.includes(indicator));
    if (foundIndicators.length > 0) {
      reasons.push(`Extracted text indicates weapon uncertainty: ${foundIndicators.slice(0, 2).join(", ")}`);
      return {
        id: "weapon_uncertainty_causation",
        status: "viable",
        reasons,
        required_dependencies: [],
        constraints: [],
      };
    }

    // Check for unclear medical mechanism
    const medicalUnclear = extractedStr.includes("unclear") && (
      extractedStr.includes("fracture") ||
      extractedStr.includes("laceration") ||
      extractedStr.includes("mechanism")
    );
    if (medicalUnclear) {
      reasons.push("Medical mechanism or fracture confirmation is unclear");
      return {
        id: "weapon_uncertainty_causation",
        status: "viable",
        reasons,
        required_dependencies: [],
        constraints: [],
      };
    }
  }

  // Default to risky
  reasons.push("Weapon/causation evidence is moderate or unclear");
  return {
    id: "weapon_uncertainty_causation",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Act Denial
 * 
 * Generally risky; only viable if actus_reus support is weak/none
 */
function evaluateActDenial(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check actus_reus or act_causation element
  const actElement = ctx.elementsState.find(e => 
    e.id === "actus_reus" || e.id === "act_causation"
  );

  if (actElement && (actElement.support === "weak" || actElement.support === "none")) {
    reasons.push(`Actus reus element support: ${actElement.support}`);
    if (actElement.gaps.length > 0) {
      requiredDeps.push(...actElement.gaps);
    }
    return {
      id: "act_denial",
      status: "viable",
      reasons,
      required_dependencies: requiredDeps,
      constraints: [],
    };
  }

  // Generally risky
  reasons.push("Act denial is generally risky; actus reus element support is moderate or strong");
  return {
    id: "act_denial",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Self Defence
 * 
 * BLOCKED by default unless extracted evidence explicitly supports self-defence narrative
 */
function evaluateSelfDefence(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check if extracted evidence explicitly supports self-defence
  let hasExplicitSupport = false;
  if (ctx.extracted) {
    const extractedStr = JSON.stringify(ctx.extracted).toLowerCase();
    const selfDefenceIndicators = [
      "self defence",
      "self-defense",
      "self defense",
      "defending myself",
      "defending himself",
      "defending herself",
      "acted in self defence",
      "threatened me",
      "attacked me first",
      "was attacked",
      "in fear",
      "reasonable force",
    ];

    hasExplicitSupport = selfDefenceIndicators.some(indicator => extractedStr.includes(indicator));
  }

  if (!hasExplicitSupport) {
    reasons.push("Self defence is BLOCKED: no explicit evidence supports self-defence narrative");
    constraints.push("Do NOT infer self-defence; requires explicit evidence");
    return {
      id: "self_defence",
      status: "blocked",
      reasons,
      required_dependencies: [],
      constraints,
    };
  }

  // If explicit support found, evaluate further
  reasons.push("Extracted evidence explicitly mentions self-defence");
  return {
    id: "self_defence",
    status: "viable",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Alternative Mental State Offence
 * 
 * Viable when higher mental state is unsupported (e.g., s18 intent weak)
 * Must be phrased as "alternative framing/mental state" not plea advice
 */
function evaluateAlternativeMentalStateOffence(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Only relevant if offence is s18
  if (ctx.offenceDef.code !== "s18_oapa") {
    reasons.push("Alternative mental state only relevant when higher mental state is charged");
    return {
      id: "alternative_mental_state_offence",
      status: "blocked",
      reasons,
      required_dependencies: [],
      constraints: ["Not applicable to this offence"],
    };
  }

  // Check if specific_intent is weak/none
  const intentElement = ctx.elementsState.find(e => e.id === "specific_intent");
  if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
    reasons.push(`Specific intent element support is ${intentElement.support}; alternative mental state (s20 recklessness) may be applicable`);
    constraints.push("This is alternative framing/mental state analysis, not plea advice");
    return {
      id: "alternative_mental_state_offence",
      status: "viable",
      reasons,
      required_dependencies: [],
      constraints,
    };
  }

  // If intent is supported, route is blocked
  if (intentElement && intentElement.support === "strong") {
    reasons.push("Specific intent element support is strong");
    return {
      id: "alternative_mental_state_offence",
      status: "blocked",
      reasons,
      required_dependencies: [],
      constraints: ["Strong intent evidence present"],
    };
  }

  // Default to risky
  reasons.push("Specific intent element support is moderate");
  return {
    id: "alternative_mental_state_offence",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints: [],
  };
}

/**
 * Mitigation / Early Resolution
 * 
 * Do NOT recommend pleading; mark as risky unless recordedPosition indicates it
 */
function evaluateMitigationEarlyResolution(ctx: EvaluationContext): RouteAssessment {
  const reasons: string[] = [];
  const requiredDeps: string[] = [];
  const constraints: string[] = [];

  // Check if recorded position indicates mitigation/early resolution
  if (ctx.recordedPosition?.position_type === "guilty" || ctx.recordedPosition?.primary === "outcome_management") {
    reasons.push("Recorded position indicates mitigation/early resolution focus");
    return {
      id: "mitigation_early_resolution",
      status: "viable",
      reasons,
      required_dependencies: [],
      constraints: ["Include only procedural prep steps if later required"],
    };
  }

  // Default to risky (do not recommend pleading)
  reasons.push("Mitigation/early resolution is risky; do NOT recommend pleading");
  constraints.push("Include only procedural prep steps if later required");
  return {
    id: "mitigation_early_resolution",
    status: "risky",
    reasons,
    required_dependencies: [],
    constraints,
  };
}
