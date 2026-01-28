/**
 * Solicitor View Generator
 * 
 * Creates a concise "Solicitor View (1 page)" derived from StrategyCoordinatorResult.
 * No predictions, no probabilities, no invented facts - only deterministic aggregation.
 */

import type {
  StrategyCoordinatorResult,
  OffenceElementState,
  DependencyState,
  RouteAssessment,
} from "./strategy-coordinator";

export type SolicitorView = {
  headline: string;
  dispute_points: string[];
  decisive_missing_items: string[];
  top_routes: Array<{ id: string; label: string; why: string[] }>;
  worst_case_cap?: string;
  next_actions: string[];
};

/**
 * Build Solicitor View from Strategy Coordinator Result
 */
export function buildSolicitorView(
  reasoning: StrategyCoordinatorResult
): SolicitorView {
  // Headline: combine procedural posture + core dispute (max 1 sentence)
  const headline = buildHeadline(reasoning);

  // Dispute points: max 5, derived from weakest/highest-impact elements
  const dispute_points = buildDisputePoints(reasoning.elements, reasoning.routes);

  // Decisive missing items: max 6, rank by importance to weak elements + route requirements
  const decisive_missing_items = buildDecisiveMissingItems(
    reasoning.elements,
    reasoning.dependencies,
    reasoning.routes
  );

  // Top routes: max 2 (best viable first, then best risky), with short "why" bullets
  const top_routes = buildTopRoutes(reasoning.routes);

  // Worst case cap: from plugin constraints if available
  const worst_case_cap = extractWorstCaseCap(reasoning.plugin_constraints);

  // Next actions: max 6, must be procedural
  const next_actions = reasoning.next_actions.slice(0, 6);

  return {
    headline,
    dispute_points,
    decisive_missing_items,
    top_routes,
    worst_case_cap,
    next_actions,
  };
}

/**
 * Build headline: combine procedural posture + core dispute
 */
function buildHeadline(reasoning: StrategyCoordinatorResult): string {
  const parts: string[] = [];

  // Procedural posture from plugin constraints
  const proceduralSafety = reasoning.plugin_constraints.procedural_safety;
  if (proceduralSafety?.status) {
    if (proceduralSafety.status === "UNSAFE_TO_PROCEED") {
      parts.push("Case cannot safely progress");
    } else if (proceduralSafety.status === "CONDITIONALLY_UNSAFE") {
      parts.push("Case conditionally unsafe");
    }
  }

  // Core dispute from weakest elements
  const weakElements = reasoning.elements.filter(
    e => e.support === "weak" || e.support === "none"
  );
  if (weakElements.length > 0) {
    const primaryWeak = weakElements[0];
    parts.push(`dispute on ${primaryWeak.label.toLowerCase()}`);
  } else {
    parts.push("case under review");
  }

  // Offence context
  if (reasoning.offence.label && reasoning.offence.label !== "Unknown offence") {
    parts.push(`(${reasoning.offence.label})`);
  }

  return parts.length > 0 ? parts.join(": ") : "Criminal case under review";
}

/**
 * Build dispute points: max 5, derived from weakest/highest-impact elements
 */
function buildDisputePoints(
  elements: OffenceElementState[],
  routes: RouteAssessment[]
): string[] {
  const points: string[] = [];

  // Get weakest elements (weak or none support)
  const weakElements = elements
    .filter(e => e.support === "weak" || e.support === "none")
    .sort((a, b) => {
      // Sort by support level (none < weak)
      if (a.support === "none" && b.support === "weak") return -1;
      if (a.support === "weak" && b.support === "none") return 1;
      return 0;
    });

  // Add dispute points from weak elements (max 3)
  for (const element of weakElements.slice(0, 3)) {
    if (element.gaps.length > 0) {
      points.push(`${element.label}: evidence gaps (${element.gaps.slice(0, 2).join(", ")})`);
    } else {
      points.push(`${element.label}: insufficient evidence support`);
    }
    if (points.length >= 3) break;
  }

  // Add dispute points from viable routes (max 2)
  const viableRoutes = routes.filter(r => r.status === "viable");
  for (const route of viableRoutes.slice(0, 2)) {
    if (route.reasons.length > 0) {
      points.push(`${route.id.replace(/_/g, " ")}: ${route.reasons[0]}`);
    }
    if (points.length >= 5) break;
  }

  return points.slice(0, 5);
}

/**
 * Build decisive missing items: max 6, rank by importance
 */
function buildDecisiveMissingItems(
  elements: OffenceElementState[],
  dependencies: DependencyState[],
  routes: RouteAssessment[]
): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  // Get outstanding dependencies that affect weak elements
  const outstandingDeps = dependencies.filter(d => d.status === "outstanding");
  const weakElements = elements.filter(e => e.support === "weak" || e.support === "none");

  // Priority 1: Dependencies required by viable routes
  const viableRoutes = routes.filter(r => r.status === "viable");
  for (const route of viableRoutes) {
    for (const depId of route.required_dependencies) {
      const dep = outstandingDeps.find(d => d.id === depId || d.id.includes(depId));
      if (dep && !seen.has(dep.id)) {
        items.push(dep.label);
        seen.add(dep.id);
        if (items.length >= 6) break;
      }
    }
    if (items.length >= 6) break;
  }

  // Priority 2: Dependencies that affect weak elements
  if (items.length < 6) {
    for (const element of weakElements) {
      for (const gap of element.gaps) {
        const dep = outstandingDeps.find(d => 
          d.label.toLowerCase().includes(gap.toLowerCase()) ||
          gap.toLowerCase().includes(d.label.toLowerCase())
        );
        if (dep && !seen.has(dep.id)) {
          items.push(dep.label);
          seen.add(dep.id);
          if (items.length >= 6) break;
        }
      }
      if (items.length >= 6) break;
    }
  }

  // Priority 3: Other outstanding dependencies
  if (items.length < 6) {
    for (const dep of outstandingDeps) {
      if (!seen.has(dep.id)) {
        items.push(dep.label);
        seen.add(dep.id);
        if (items.length >= 6) break;
      }
    }
  }

  return items.slice(0, 6);
}

/**
 * Build top routes: max 2 (best viable first, then best risky)
 */
function buildTopRoutes(routes: RouteAssessment[]): Array<{ id: string; label: string; why: string[] }> {
  const topRoutes: Array<{ id: string; label: string; why: string[] }> = [];

  // Get viable routes first
  const viableRoutes = routes.filter(r => r.status === "viable");
  if (viableRoutes.length > 0) {
    const bestViable = viableRoutes[0];
    topRoutes.push({
      id: bestViable.id,
      label: formatRouteLabel(bestViable.id),
      why: bestViable.reasons.slice(0, 2), // Max 2 reasons
    });
  }

  // Get risky routes if we don't have 2 yet
  if (topRoutes.length < 2) {
    const riskyRoutes = routes.filter(r => r.status === "risky");
    if (riskyRoutes.length > 0) {
      const bestRisky = riskyRoutes[0];
      topRoutes.push({
        id: bestRisky.id,
        label: formatRouteLabel(bestRisky.id),
        why: bestRisky.reasons.slice(0, 2), // Max 2 reasons
      });
    }
  }

  return topRoutes.slice(0, 2);
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

/**
 * Extract worst case cap from plugin constraints
 */
function extractWorstCaseCap(plugin_constraints: Record<string, any>): string | undefined {
  const worstCaseCap = plugin_constraints.worst_case_cap;
  if (worstCaseCap && typeof worstCaseCap === "object" && worstCaseCap.statement) {
    return worstCaseCap.statement;
  }
  if (worstCaseCap && typeof worstCaseCap === "string") {
    return worstCaseCap;
  }
  return undefined;
}
