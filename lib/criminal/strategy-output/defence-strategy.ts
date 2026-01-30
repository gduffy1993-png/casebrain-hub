/**
 * Strategy Output Model - Defence Strategy Plan
 * 
 * Builds a hard fight plan with kill switches, pivot routes, and tactical moves.
 * All content is case-derived, evidence-linked, and non-predictive.
 */

import type { EvidenceSnapshot, EvidenceAnchor, ConditionalLogic } from "./types";
import { buildGapAnchor, buildTimelineAnchor } from "./anchors";

/**
 * Defence Strategy Plan
 * 
 * Practical, evidence-linked defence tactics for fighting the case.
 */
export type DefenceStrategyPlan = {
  posture: string; // 1 sentence
  primary_route: {
    id: string;
    label: string;
    rationale: string[];
    anchors?: EvidenceAnchor;
  };
  secondary_routes: Array<{
    id: string;
    label: string;
    purpose: string;
    triggers: ConditionalLogic[];
  }>;
  prosecution_pressure: string[]; // Short "pressure lines" (non-predictive, 4-6)
  defence_counters: Array<{
    point: string;
    safe_wording: string;
    anchors?: EvidenceAnchor;
    evidence_needed?: string[];
  }>;
  kill_switches: ConditionalLogic[]; // Plan breakers (3-6)
  pivot_plan: Array<{
    if_triggered: string;
    new_route: string;
    immediate_actions: string[];
  }>;
  next_72_hours: string[]; // Procedural + tactical tasks (max 8)
};

/**
 * Build Defence Strategy Plan
 * 
 * @param input - Case data input
 * @returns DefenceStrategyPlan
 */
export function buildDefenceStrategyPlan(input: {
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
  recordedPosition?: string;
}): DefenceStrategyPlan {
  const { snapshot, offenceElements, routes, recordedPosition } = input;

  // Build posture
  const posture = buildPosture(snapshot, offenceElements);

  // Choose primary route
  const primary_route = choosePrimaryRoute(routes, snapshot, offenceElements);

  // Build secondary routes
  const secondary_routes = buildSecondaryRoutes(routes, primary_route.id);

  // Build prosecution pressure points
  const prosecution_pressure = buildProsecutionPressure(snapshot, offenceElements);

  // Build defence counters
  const defence_counters = buildDefenceCounters(offenceElements, snapshot);

  // Build kill switches
  const kill_switches = buildKillSwitches(snapshot, offenceElements, routes);

  // Build pivot plan
  const pivot_plan = buildPivotPlan(kill_switches, routes);

  // Build next 72 hours tasks
  const next_72_hours = buildNext72Hours(snapshot, routes);

  return {
    posture,
    primary_route,
    secondary_routes,
    prosecution_pressure,
    defence_counters,
    kill_switches,
    pivot_plan,
    next_72_hours,
  };
}

/**
 * Build posture from offence + disputed elements + evidence snapshot
 */
function buildPosture(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string {
  const parts: string[] = [];

  // Offence context
  const offenceLabel = snapshot.offence.label || "criminal offence";
  parts.push(offenceLabel);

  // Top disputed element
  const disputedElements = offenceElements.filter(
    e => e.support === "weak" || e.support === "none"
  );
  if (disputedElements.length > 0) {
    const topDisputed = disputedElements[0];
    parts.push(`disputing ${topDisputed.label.toLowerCase()}`);
  }

  // Key missing evidence flag
  if (snapshot.flags.sequence_missing) {
    parts.push("pending sequence evidence");
  } else if (snapshot.flags.id_uncertainty) {
    parts.push("pending identification clarity");
  } else if (snapshot.evidence.key_gaps.length > 0) {
    parts.push("pending key disclosure");
  } else if (snapshot.disclosure.required_without_timeline.length > 0) {
    parts.push("pending required disclosure");
  }

  return parts.length > 0
    ? `Defence posture: ${parts.join(", ")}.`
    : "Defence posture: case under review.";
}

/**
 * Choose primary route (best viable, else best risky, else first canonical)
 */
function choosePrimaryRoute(
  routes: Array<{ id: string; status: string; reasons: string[] }>,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ gaps: string[] }>
): DefenceStrategyPlan["primary_route"] {
  // Find best viable route
  const viableRoutes = routes.filter(r => r.status === "viable");
  if (viableRoutes.length > 0) {
    const bestViable = viableRoutes[0];
    const gaps = offenceElements.flatMap(e => e.gaps);
    return {
      id: bestViable.id,
      label: formatRouteLabel(bestViable.id),
      rationale: bestViable.reasons.slice(0, 3),
      anchors: gaps.length > 0 ? buildGapAnchor(gaps) : undefined,
    };
  }

  // Find best risky route
  const riskyRoutes = routes.filter(r => r.status === "risky");
  if (riskyRoutes.length > 0) {
    const bestRisky = riskyRoutes[0];
    const gaps = offenceElements.flatMap(e => e.gaps);
    return {
      id: bestRisky.id,
      label: formatRouteLabel(bestRisky.id),
      rationale: bestRisky.reasons.slice(0, 3),
      anchors: gaps.length > 0 ? buildGapAnchor(gaps) : undefined,
    };
  }

  // Fallback to first route
  const firstRoute = routes[0] || { id: "procedural_disclosure_leverage", reasons: [] };
  return {
    id: firstRoute.id,
    label: formatRouteLabel(firstRoute.id),
    rationale: firstRoute.reasons.slice(0, 3),
  };
}

/**
 * Build secondary routes
 */
function buildSecondaryRoutes(
  routes: Array<{ id: string; status: string; reasons: string[] }>,
  primaryRouteId: string
): DefenceStrategyPlan["secondary_routes"] {
  const secondary: DefenceStrategyPlan["secondary_routes"] = [];

  // Get routes that aren't the primary
  const otherRoutes = routes.filter(r => r.id !== primaryRouteId);

  for (const route of otherRoutes.slice(0, 3)) {
    // Build purpose from route status and reasons
    const purpose = route.status === "viable"
      ? `Alternative viable route if primary route blocked`
      : route.status === "risky"
      ? `Fallback route if primary route becomes blocked`
      : `Reserve route if evidence changes`;

    // Build triggers from route reasons
    const triggers: ConditionalLogic[] = route.reasons.slice(0, 2).map(reason => ({
      if: reason,
      then: `${formatRouteLabel(route.id)} becomes viable`,
      severity: route.status === "viable" ? "high" : route.status === "risky" ? "medium" : "low",
    }));

    secondary.push({
      id: route.id,
      label: formatRouteLabel(route.id),
      purpose,
      triggers,
    });
  }

  return secondary;
}

/**
 * Build prosecution pressure points (4-6, non-predictive)
 */
function buildProsecutionPressure(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string[] {
  const pressure: string[] = [];
  const offenceCode = snapshot.offence.code || "";

  // Pressure based on offence type
  if (offenceCode.includes("s18") || offenceCode.includes("18")) {
    // s18 OAPA pressure points
    const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      pressure.push("Pressure point: intent inference from injury severity and mechanism");
    } else {
      pressure.push("Pressure point: intent inference from sequence and targeting");
    }

    if (snapshot.flags.sequence_missing) {
      pressure.push("Pressure point: sequence evidence gap may be filled by prosecution");
    }

    if (!snapshot.flags.weapon_uncertainty) {
      pressure.push("Pressure point: weapon inference from medical mechanism");
    }
  } else if (offenceCode.includes("s20") || offenceCode.includes("20")) {
    // s20 OAPA pressure points
    pressure.push("Pressure point: recklessness inference from circumstances and injury");
    if (!snapshot.flags.weapon_uncertainty) {
      pressure.push("Pressure point: weapon use inference from injury mechanism");
    }
  }

  // Common pressure points based on elements
  const idElement = offenceElements.find(e => e.id === "identification");
  if (idElement && (idElement.support === "weak" || idElement.support === "none")) {
    pressure.push("Pressure point: identification consistency despite conditions");
  } else if (!snapshot.flags.id_uncertainty) {
    pressure.push("Pressure point: identification reliability despite defence challenge");
  }

  // Pressure based on evidence gaps
  if (snapshot.evidence.key_gaps.length > 0) {
    pressure.push(`Pressure point: missing evidence may support prosecution case`);
  }

  // Pressure based on disclosure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    pressure.push("Pressure point: outstanding disclosure may strengthen prosecution case");
  }

  // Limit to 6
  return pressure.slice(0, 6);
}

/**
 * Build defence counters (4-6) with safe wording
 */
function buildDefenceCounters(
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  snapshot: EvidenceSnapshot
): DefenceStrategyPlan["defence_counters"] {
  const counters: DefenceStrategyPlan["defence_counters"] = [];

  // Counter for each disputed element
  const disputedElements = offenceElements.filter(
    e => e.support === "weak" || e.support === "none"
  );

  for (const element of disputedElements.slice(0, 4)) {
    const counter: DefenceStrategyPlan["defence_counters"][0] = {
      point: `Counter to ${element.label.toLowerCase()} element`,
      safe_wording: `The defence position is that the evidence does not establish ${element.label.toLowerCase()} to the required standard.`,
      evidence_needed: element.gaps.length > 0 ? element.gaps.slice(0, 3) : undefined,
    };

    // Add anchor if gaps exist
    if (element.gaps.length > 0) {
      counter.anchors = buildGapAnchor(element.gaps);
    }

    counters.push(counter);
  }

  // Counter for identification uncertainty
  if (snapshot.flags.id_uncertainty) {
    counters.push({
      point: "Counter to identification pressure",
      safe_wording: "The defence position is that the identification evidence is insufficient given the conditions of observation and lack of corroboration.",
      anchors: buildGapAnchor(["CCTV", "BWV", "Witness statements"]),
    });
  }

  // Counter for weapon uncertainty
  if (snapshot.flags.weapon_uncertainty) {
    counters.push({
      point: "Counter to weapon inference",
      safe_wording: "The defence position is that the evidence does not clearly establish weapon use or the precise mechanism of injury.",
      evidence_needed: ["Weapon recovery", "Forensic confirmation", "Witness statements on weapon"],
    });
  }

  // Limit to 6
  return counters.slice(0, 6);
}

/**
 * Build kill switches (3-6 conditional logic breakers)
 */
function buildKillSwitches(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>,
  routes: Array<{ id: string; status: string }>
): ConditionalLogic[] {
  const killSwitches: ConditionalLogic[] = [];

  // Kill switch: sequence evidence shows sustained targeting
  if (snapshot.flags.sequence_missing) {
    killSwitches.push({
      if: "Sequence evidence arrives showing sustained or targeted attack",
      then: "Intent denial route becomes harder; pivot to charge reduction or outcome control",
      evidence_needed: ["CCTV showing sequence", "Witness statements on duration", "Medical evidence of multiple injuries"],
      severity: "high",
    });
  }

  // Kill switch: medical mechanism supports deliberate weapon use
  const weaponElement = offenceElements.find(e => e.id.includes("weapon") || e.id.includes("causation"));
  if (weaponElement && (weaponElement.support === "weak" || weaponElement.support === "none")) {
    killSwitches.push({
      if: "Medical mechanism evidence supports deliberate weapon use",
      then: "Weapon uncertainty leverage reduces; consider basis control or charge reduction",
      evidence_needed: ["Medical report on mechanism", "Forensic weapon analysis", "Scene photographs"],
      severity: "high",
    });
  }

  // Kill switch: clear identification evidence arrives
  if (snapshot.flags.id_uncertainty) {
    const idRoute = routes.find(r => r.id === "identification_challenge");
    if (idRoute && (idRoute.status === "viable" || idRoute.status === "risky")) {
      killSwitches.push({
        if: "Clear identification evidence arrives (CCTV/BWV showing clear identification)",
        then: "Identification challenge route becomes significantly harder",
        evidence_needed: ["Clear CCTV footage", "BWV of identification", "Corroborating witness statements"],
        severity: "high",
      });
    }
  }

  // Kill switch: intent evidence strengthens
  const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
  if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
    const intentRoute = routes.find(r => r.id === "intent_denial");
    if (intentRoute && (intentRoute.status === "viable" || intentRoute.status === "risky")) {
      killSwitches.push({
        if: "Evidence arrives showing targeting, premeditation, or sustained violence",
        then: "Intent denial route becomes harder; pivot to alternative mental state or outcome control",
        evidence_needed: ["CCTV showing sequence", "Witness statements on targeting", "Defendant statements"],
        severity: "medium",
      });
    }
  }

  // Kill switch: key disclosure served
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    killSwitches.push({
      if: `Key required disclosure served: ${snapshot.disclosure.required_without_timeline[0]}`,
      then: "Review route viability; disclosure leverage route may become blocked",
      evidence_needed: snapshot.disclosure.required_without_timeline.slice(0, 3),
      severity: "medium",
    });
  }

  // Kill switch: date conflicts resolved
  if (snapshot.flags.date_conflicts) {
    killSwitches.push({
      if: "Date/time conflicts resolved with continuity evidence",
      then: "Procedural leverage may reduce; review route viability",
      evidence_needed: ["CCTV continuity logs", "Witness statements on timing", "CAD logs"],
      severity: "low",
    });
  }

  // Limit to 6
  return killSwitches.slice(0, 6);
}

/**
 * Build pivot plan for each kill switch
 */
function buildPivotPlan(
  killSwitches: ConditionalLogic[],
  routes: Array<{ id: string; label?: string; status: string }>
): DefenceStrategyPlan["pivot_plan"] {
  const pivotPlan: DefenceStrategyPlan["pivot_plan"] = [];

  for (const killSwitch of killSwitches) {
    // Determine new route based on kill switch
    let newRoute = "procedural_disclosure_leverage"; // Default fallback

    // If kill switch mentions intent, pivot to alternative mental state
    if (killSwitch.if.includes("intent") || killSwitch.if.includes("targeting")) {
      const altRoute = routes.find(r => r.id === "alternative_mental_state_offence");
      if (altRoute) {
        newRoute = altRoute.id;
      }
    }
    // If kill switch mentions identification, pivot to act denial or outcome control
    else if (killSwitch.if.includes("identification")) {
      const actRoute = routes.find(r => r.id === "act_denial");
      if (actRoute && actRoute.status !== "blocked") {
        newRoute = actRoute.id;
      } else {
        newRoute = "mitigation_early_resolution";
      }
    }
    // If kill switch mentions disclosure, pivot to outcome control
    else if (killSwitch.if.includes("disclosure")) {
      newRoute = "mitigation_early_resolution";
    }

    // Build immediate actions
    const immediateActions: string[] = [];
    immediateActions.push("Review route viability and evidence state");
    if (killSwitch.evidence_needed && killSwitch.evidence_needed.length > 0) {
      immediateActions.push(`Assess impact of: ${killSwitch.evidence_needed[0]}`);
    }
    immediateActions.push(`Consider pivot to ${formatRouteLabel(newRoute)}`);

    pivotPlan.push({
      if_triggered: killSwitch.if,
      new_route: formatRouteLabel(newRoute),
      immediate_actions: immediateActions.slice(0, 3),
    });
  }

  return pivotPlan;
}

/**
 * Build next 72 hours tasks (max 8)
 */
function buildNext72Hours(
  snapshot: EvidenceSnapshot,
  routes: Array<{ required_dependencies: string[] }>
): string[] {
  const tasks: string[] = [];

  // Chase required dependencies without timeline
  for (const dep of snapshot.disclosure.required_without_timeline.slice(0, 3)) {
    tasks.push(`Chase required disclosure: ${dep}`);
  }

  // Address key evidence gaps
  for (const gap of snapshot.evidence.key_gaps.slice(0, 2)) {
    if (gap.toLowerCase().includes("cctv")) {
      tasks.push("Obtain CCTV export and verify continuity");
    } else if (gap.toLowerCase().includes("medical") || gap.toLowerCase().includes("mechanism")) {
      tasks.push("Pin medical mechanism and causation evidence");
    } else if (gap.toLowerCase().includes("continuity")) {
      tasks.push("Verify evidence continuity and date/time consistency");
    } else {
      tasks.push(`Obtain: ${gap}`);
    }
  }

  // Route-specific tasks
  const routesWithDeps = routes.filter(r => r.required_dependencies && r.required_dependencies.length > 0);
  if (routesWithDeps.length > 0) {
    const route = routesWithDeps[0];
    tasks.push(`Secure route dependencies: ${route.required_dependencies[0]}`);
  }

  // General procedural tasks
  if (tasks.length < 8) {
    tasks.push("Review disclosure timeline and update status");
  }
  if (tasks.length < 8 && snapshot.posture.has_position) {
    tasks.push("Review recorded position and update if needed");
  }
  if (tasks.length < 8) {
    tasks.push("Prepare instructions for counsel if applicable");
  }

  // Limit to 8
  return tasks.slice(0, 8);
}

/**
 * Format route label from route ID
 */
function formatRouteLabel(routeId: string): string {
  return routeId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
