/**
 * Strategy Output Model - Route Playbooks
 * 
 * Builds operational fight plans per route (trial, reduction, procedural, mitigation).
 * Each playbook is short, professional, and operational (no essays).
 */

import type { EvidenceSnapshot } from "./types";
import type { CPSPressureLens } from "./cps-pressure";
import type { JudgeConstraintLens } from "../judge-constraint-lens";
import { CANONICAL_ROUTES, type CanonicalRouteId } from "../strategy-routes";

export type RoutePlaybook = {
  route_id: string;
  label: string;
  posture: string; // one sentence
  objective: string; // one sentence
  prosecution_burden: string[]; // 3-6 bullets
  defence_counters: Array<{
    point: string;
    safe_wording: string;
    evidence_needed: string[];
  }>;
  kill_switches: Array<{
    if: string; // Observable condition
    then: string; // Concrete action
  }>;
  pivots: Array<{
    if_triggered: string;
    new_route: string;
    immediate_actions: string[];
  }>;
  next_actions: string[]; // procedural steps
};

export type RoutePlaybooks = {
  playbooks: RoutePlaybook[];
};

export type BuildRoutePlaybooksInput = {
  snapshot: EvidenceSnapshot;
  offenceElements: Array<{
    id: string;
    label: string;
    support: "strong" | "some" | "weak" | "none";
    gaps: string[];
  }>;
  routes: Array<{
    id: string;
    status: "viable" | "risky" | "blocked";
    reasons: string[];
    required_dependencies: string[];
  }>;
  cpsPressureLens?: CPSPressureLens | null;
  judgeConstraintLens?: JudgeConstraintLens | null;
  recordedPosition?: {
    primary?: string;
    position_text?: string;
  } | null;
};

/**
 * Build Route Playbooks
 * 
 * Creates operational fight plans for viable and risky routes.
 */
export function buildRoutePlaybooks(
  input: BuildRoutePlaybooksInput
): RoutePlaybooks {
  const { snapshot, offenceElements, routes, cpsPressureLens, judgeConstraintLens, recordedPosition } = input;

  const playbooks: RoutePlaybook[] = [];

  // Build playbooks for viable and risky routes only
  const activeRoutes = routes.filter(
    (r) => r.status === "viable" || r.status === "risky"
  );

  for (const route of activeRoutes) {
    const playbook = buildPlaybookForRoute(
      route.id as CanonicalRouteId,
      route,
      snapshot,
      offenceElements,
      routes,
      cpsPressureLens,
      judgeConstraintLens,
      recordedPosition
    );
    if (playbook) {
      playbooks.push(playbook);
    }
  }

  return { playbooks };
}

/**
 * Build playbook for a specific route
 */
function buildPlaybookForRoute(
  routeId: CanonicalRouteId,
  route: { id: string; status: string; reasons: string[]; required_dependencies: string[] },
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  allRoutes: Array<{ id: string; status: string }>,
  cpsPressureLens?: CPSPressureLens | null,
  judgeConstraintLens?: JudgeConstraintLens | null,
  recordedPosition?: { primary?: string; position_text?: string } | null
): RoutePlaybook | null {
  const routeDef = CANONICAL_ROUTES.find((r) => r.id === routeId);
  if (!routeDef) return null;

  const offenceCode = snapshot.offence.code || "";

  // Build posture and objective
  const { posture, objective } = buildPostureAndObjective(
    routeId,
    route,
    snapshot,
    offenceElements
  );

  // Build prosecution burden
  const prosecution_burden = buildProsecutionBurden(
    routeId,
    snapshot,
    offenceElements,
    judgeConstraintLens
  );

  // Build defence counters
  const defence_counters = buildDefenceCounters(
    routeId,
    snapshot,
    offenceElements,
    cpsPressureLens,
    judgeConstraintLens
  );

  // Build kill switches (observable IF, concrete THEN)
  const kill_switches = buildKillSwitches(
    routeId,
    snapshot,
    offenceElements,
    allRoutes
  );

  // Build pivots
  const pivots = buildPivots(routeId, route, allRoutes, snapshot, offenceElements);

  // Build next actions
  const next_actions = buildNextActions(
    routeId,
    route,
    snapshot,
    offenceElements
  );

  return {
    route_id: routeId,
    label: routeDef.label,
    posture,
    objective,
    prosecution_burden,
    defence_counters,
    kill_switches,
    pivots,
    next_actions,
  };
}

/**
 * Build posture and objective for a route
 */
function buildPostureAndObjective(
  routeId: CanonicalRouteId,
  route: { status: string; reasons: string[] },
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): { posture: string; objective: string } {
  const weakElements = offenceElements.filter(
    (e) => e.support === "weak" || e.support === "none"
  );

  switch (routeId) {
    case "procedural_disclosure_leverage":
      return {
        posture: "Defence posture: leverage disclosure failures to create procedural pressure and fair trial concerns.",
        objective: "Force disclosure of material items or seek adverse inference/stay if obligations not met.",
      };

    case "identification_challenge":
      return {
        posture: "Defence posture: challenge identification reliability under Turnbull principles.",
        objective: "Require prosecution to establish identification beyond reasonable doubt; seek exclusion if reliability insufficient.",
      };

    case "act_denial":
      return {
        posture: "Defence posture: deny act occurred or challenge causation between act and injury.",
        objective: "Require prosecution to prove act and causation beyond reasonable doubt; challenge sequence and mechanism.",
      };

    case "intent_denial":
      return {
        posture: "Defence posture: deny specific intent (s18); require prosecution to prove targeting/deliberation.",
        objective: "Force charge reduction to s20 or acquittal if specific intent cannot be proven.",
      };

    case "weapon_uncertainty_causation":
      return {
        posture: "Defence posture: challenge weapon presence/use and causation mechanism.",
        objective: "Require prosecution to prove weapon use and causation; exploit uncertainty in mechanism.",
      };

    case "self_defence":
      return {
        posture: "Defence posture: raise self-defence with evidential basis; require prosecution to disprove.",
        objective: "Establish self-defence narrative; require prosecution to prove beyond reasonable doubt that force was not reasonable.",
      };

    case "alternative_mental_state_offence":
      return {
        posture: "Defence posture: argue alternative mental state (s20) where s18 intent cannot be proven.",
        objective: "Force charge reduction to s20 or lesser offence based on available evidence.",
      };

    case "mitigation_early_resolution":
      return {
        posture: "Defence posture: prepare for early resolution or mitigation if appropriate.",
        objective: "Secure best possible outcome through early engagement or mitigation at sentencing.",
      };

    default:
      return {
        posture: "Defence posture: challenge prosecution case on available evidence.",
        objective: "Require prosecution to prove all elements beyond reasonable doubt.",
      };
  }
}

/**
 * Build prosecution burden (3-6 bullets)
 */
function buildProsecutionBurden(
  routeId: CanonicalRouteId,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>,
  judgeConstraintLens?: JudgeConstraintLens | null
): string[] {
  const burden: string[] = [];
  const offenceCode = snapshot.offence.code || "";

  // Get relevant constraints from judge lens
  const relevantConstraints = judgeConstraintLens?.constraints.filter((c) =>
    c.applies_to.some((applies) => {
      if (routeId === "intent_denial") return applies.includes("intent");
      if (routeId === "identification_challenge") return applies.includes("identification");
      if (routeId === "weapon_uncertainty_causation") return applies.includes("weapon") || applies.includes("causation");
      if (routeId === "act_denial") return applies.includes("causation") || applies.includes("actus");
      return false;
    })
  ) || [];

  switch (routeId) {
    case "procedural_disclosure_leverage":
      burden.push("Prosecution must provide material disclosure or justify non-disclosure");
      burden.push("Prosecution must demonstrate disclosure failures do not affect fair trial");
      burden.push("Prosecution must respond to disclosure applications with materiality assessment");
      if (snapshot.disclosure.required_without_timeline.length > 0) {
        burden.push(`Prosecution must serve: ${snapshot.disclosure.required_without_timeline.slice(0, 2).join(", ")}`);
      }
      break;

    case "identification_challenge":
      burden.push("Prosecution must establish identification reliability under Turnbull principles");
      burden.push("Prosecution must prove identification beyond reasonable doubt despite conditions");
      burden.push("Prosecution must provide evidence of observation conditions (lighting, duration, distance)");
      if (relevantConstraints.length > 0) {
        burden.push(relevantConstraints[0].detail);
      }
      break;

    case "intent_denial":
      if (offenceCode.includes("s18") || offenceCode.includes("18")) {
        burden.push("Prosecution must prove specific intent to cause GBH (not merely recklessness)");
        burden.push("Prosecution must establish targeting, premeditation, or sustained conduct");
        burden.push("Prosecution must prove intent beyond injury severity alone");
        if (relevantConstraints.length > 0) {
          burden.push(relevantConstraints[0].detail);
        }
      }
      break;

    case "weapon_uncertainty_causation":
      burden.push("Prosecution must prove weapon presence and use");
      burden.push("Prosecution must establish causation between weapon and injury");
      burden.push("Prosecution must provide clear evidence of weapon recovery or forensic confirmation");
      if (relevantConstraints.length > 0) {
        burden.push(relevantConstraints[0].detail);
      }
      break;

    case "act_denial":
      burden.push("Prosecution must prove act occurred beyond reasonable doubt");
      burden.push("Prosecution must establish causation between act and injury");
      burden.push("Prosecution must provide sequence evidence (timing, mechanism)");
      break;

    case "self_defence":
      burden.push("Prosecution must disprove self-defence beyond reasonable doubt");
      burden.push("Prosecution must prove force was not necessary or not reasonable");
      burden.push("Prosecution must address evidential basis for self-defence narrative");
      break;

    case "alternative_mental_state_offence":
      burden.push("Prosecution must prove specific intent (s18) or accept alternative mental state (s20)");
      burden.push("Prosecution must establish targeting/deliberation evidence for s18");
      burden.push("Prosecution must justify higher charge if evidence supports lower mental state");
      break;

    case "mitigation_early_resolution":
      burden.push("Prosecution must consider early resolution if appropriate");
      burden.push("Prosecution must provide full disclosure for informed decision-making");
      burden.push("Prosecution must justify trial if early resolution is viable");
      break;
  }

  // Limit to 6
  return burden.slice(0, 6);
}

/**
 * Build defence counters using CPS pressure and judge constraints
 */
function buildDefenceCounters(
  routeId: CanonicalRouteId,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  cpsPressureLens?: CPSPressureLens | null,
  judgeConstraintLens?: JudgeConstraintLens | null
): Array<{ point: string; safe_wording: string; evidence_needed: string[] }> {
  const counters: Array<{ point: string; safe_wording: string; evidence_needed: string[] }> = [];

  // Get relevant pressure points
  const relevantPressurePoints = cpsPressureLens?.pressure_points.filter((pp) => {
    if (routeId === "intent_denial") return pp.targets_element.includes("intent");
    if (routeId === "identification_challenge") return pp.targets_element.includes("identification");
    if (routeId === "weapon_uncertainty_causation") return pp.targets_element.includes("weapon") || pp.targets_element.includes("causation");
    if (routeId === "act_denial") return pp.targets_element.includes("causation");
    return false;
  }) || [];

  // Use how_to_blunt from pressure points
  for (const pressurePoint of relevantPressurePoints.slice(0, 3)) {
    for (const counter of pressurePoint.how_to_blunt.slice(0, 2)) {
      counters.push({
        point: pressurePoint.point,
        safe_wording: counter,
        evidence_needed: pressurePoint.depends_on || [],
      });
    }
  }

  // Add route-specific counters
  const weakElements = offenceElements.filter(
    (e) => e.support === "weak" || e.support === "none"
  );

  switch (routeId) {
    case "procedural_disclosure_leverage":
      if (snapshot.disclosure.required_without_timeline.length > 0) {
        counters.push({
          point: "Missing disclosure",
          safe_wording: "Pressure CPS on disclosure obligations; seek adverse inference if not served",
          evidence_needed: snapshot.disclosure.required_without_timeline.slice(0, 3),
        });
      }
      break;

    case "identification_challenge":
      const idElement = offenceElements.find((e) => e.id === "identification");
      if (idElement && (idElement.support === "weak" || idElement.support === "none")) {
        counters.push({
          point: "Identification reliability",
          safe_wording: "Apply Turnbull principles; require prosecution to establish identification reliability",
          evidence_needed: idElement.gaps.length > 0 ? idElement.gaps.slice(0, 3) : ["CCTV", "BWV", "Witness statements"],
        });
      }
      break;

    case "intent_denial":
      const intentElement = offenceElements.find((e) => e.id === "specific_intent" || e.id === "intent");
      if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
        counters.push({
          point: "Specific intent",
          safe_wording: "Require prosecution to prove specific intent beyond injury alone; targeting, premeditation, or sustained conduct required",
          evidence_needed: intentElement.gaps.length > 0 ? intentElement.gaps.slice(0, 3) : ["CCTV showing targeting", "Witness statements"],
        });
      }
      break;
  }

  // Limit to 6
  return counters.slice(0, 6);
}

/**
 * Build kill switches (observable IF, concrete THEN)
 */
function buildKillSwitches(
  routeId: CanonicalRouteId,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  allRoutes: Array<{ id: string; status: string }>
): Array<{ if: string; then: string }> {
  const killSwitches: Array<{ if: string; then: string }> = [];

  switch (routeId) {
    case "procedural_disclosure_leverage":
      killSwitches.push({
        if: "If all required disclosure is served and reviewed",
        then: "Pivot to alternative route; disclosure leverage route becomes blocked",
      });
      break;

    case "identification_challenge":
      killSwitches.push({
        if: "If clear CCTV/BWV footage arrives showing reliable identification",
        then: "Pivot to alternative route; identification challenge becomes significantly harder",
      });
      killSwitches.push({
        if: "If multiple independent witnesses provide consistent identification",
        then: "Pivot to alternative route; identification challenge becomes blocked",
      });
      break;

    case "intent_denial":
      killSwitches.push({
        if: "If CCTV shows sustained repeated strikes or clear targeting",
        then: "Pivot to mitigation route; advise on plea credit; gather mitigation evidence",
      });
      killSwitches.push({
        if: "If witness statements establish premeditation or planning",
        then: "Pivot to alternative mental state route; consider s20 alternative",
      });
      break;

    case "weapon_uncertainty_causation":
      killSwitches.push({
        if: "If weapon is recovered with forensic confirmation",
        then: "Pivot to alternative route; weapon uncertainty leverage reduces",
      });
      killSwitches.push({
        if: "If medical evidence clearly establishes weapon mechanism",
        then: "Pivot to alternative route; causation challenge becomes harder",
      });
      break;

    case "act_denial":
      killSwitches.push({
        if: "If clear sequence evidence arrives showing act and causation",
        then: "Pivot to alternative route; act denial becomes blocked",
      });
      break;

    case "self_defence":
      killSwitches.push({
        if: "If evidence contradicts self-defence narrative (e.g., CCTV shows unprovoked attack)",
        then: "Pivot to alternative route; self-defence route becomes blocked",
      });
      break;
  }

  // Limit to 4
  return killSwitches.slice(0, 4);
}

/**
 * Build pivots to other routes
 */
function buildPivots(
  routeId: CanonicalRouteId,
  currentRoute: { status: string },
  allRoutes: Array<{ id: string; status: string }>,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): Array<{ if_triggered: string; new_route: string; immediate_actions: string[] }> {
  const pivots: Array<{ if_triggered: string; new_route: string; immediate_actions: string[] }> = [];

  // Find alternative viable routes
  const alternativeRoutes = allRoutes.filter(
    (r) => r.id !== routeId && (r.status === "viable" || r.status === "risky")
  );

  for (const altRoute of alternativeRoutes.slice(0, 2)) {
    const routeDef = CANONICAL_ROUTES.find((r) => r.id === altRoute.id as CanonicalRouteId);
    if (!routeDef) continue;

    let ifTriggered = "";
    let immediateActions: string[] = [];

    if (routeId === "intent_denial" && altRoute.id === "alternative_mental_state_offence") {
      ifTriggered = "If specific intent evidence strengthens but s20 alternative remains viable";
      immediateActions = [
        "Review evidence for s20 recklessness elements",
        "Prepare alternative mental state argument",
        "Consider charge reduction negotiation",
      ];
    } else if (routeId === "identification_challenge" && altRoute.id === "weapon_uncertainty_causation") {
      ifTriggered = "If identification evidence strengthens but weapon/causation remains uncertain";
      immediateActions = [
        "Focus on weapon uncertainty and causation challenges",
        "Review medical mechanism evidence",
        "Prepare causation challenge arguments",
      ];
    } else if (routeId === "procedural_disclosure_leverage" && altRoute.id === "identification_challenge") {
      ifTriggered = "If disclosure is served but identification remains weak";
      immediateActions = [
        "Review served disclosure for identification evidence",
        "Apply Turnbull principles to identification",
        "Prepare identification challenge arguments",
      ];
    } else {
      ifTriggered = `If ${routeDef.label.toLowerCase()} route becomes more viable`;
      immediateActions = [
        `Review evidence for ${routeDef.label.toLowerCase()} route`,
        "Prepare route-specific arguments",
        "Update defence strategy",
      ];
    }

    pivots.push({
      if_triggered: ifTriggered,
      new_route: routeDef.label,
      immediate_actions: immediateActions,
    });
  }

  return pivots;
}

/**
 * Build next actions (procedural steps)
 */
function buildNextActions(
  routeId: CanonicalRouteId,
  route: { required_dependencies: string[] },
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>
): string[] {
  const actions: string[] = [];

  switch (routeId) {
    case "procedural_disclosure_leverage":
      actions.push("Draft disclosure application with specific requests");
      actions.push("Document all outstanding disclosure items");
      if (route.required_dependencies.length > 0) {
        actions.push(`Chase: ${route.required_dependencies.slice(0, 2).join(", ")}`);
      }
      actions.push("Prepare abuse of process application if disclosure failures persist");
      break;

    case "identification_challenge":
      actions.push("Review identification evidence against Turnbull principles");
      actions.push("Prepare Turnbull direction request");
      actions.push("Gather evidence of observation conditions (lighting, duration, distance)");
      actions.push("Prepare identification challenge submissions");
      break;

    case "intent_denial":
      actions.push("Review evidence for targeting/deliberation indicators");
      actions.push("Prepare intent challenge submissions");
      actions.push("Consider charge reduction negotiation if evidence supports s20");
      break;

    case "weapon_uncertainty_causation":
      actions.push("Review medical mechanism evidence");
      actions.push("Challenge weapon inference if recovery/forensic confirmation missing");
      actions.push("Prepare causation challenge arguments");
      break;

    case "act_denial":
      actions.push("Review sequence evidence and timing");
      actions.push("Challenge act and causation if sequence unclear");
      actions.push("Prepare act denial submissions");
      break;

    case "self_defence":
      actions.push("Gather evidential basis for self-defence narrative");
      actions.push("Prepare self-defence submissions");
      actions.push("Review evidence of threat and necessity");
      break;

    case "alternative_mental_state_offence":
      actions.push("Review evidence for s20 recklessness elements");
      actions.push("Prepare alternative mental state argument");
      actions.push("Consider charge reduction negotiation");
      break;

    case "mitigation_early_resolution":
      actions.push("Review full disclosure for informed decision-making");
      actions.push("Prepare mitigation evidence if appropriate");
      actions.push("Consider early resolution options");
      break;
  }

  // Limit to 6
  return actions.slice(0, 6);
}
