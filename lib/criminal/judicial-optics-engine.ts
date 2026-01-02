/**
 * Judicial Optics Scoring Engine
 * 
 * Formalizes "Judicially attractive" logic.
 * Tags actions and attack paths as:
 * - 🟢 Judicially attractive
 * - 🟠 Neutral
 * - 🔴 Risky / irritates court
 * 
 * Deterministic rules based on timing, proportionality, persistence.
 */

import type { RouteType, AttackPath } from "./strategy-fight-types";

export type JudicialOptics = "attractive" | "neutral" | "risky";

export type OpticsReason = {
  optics: JudicialOptics;
  explanation: string;
  factors: string[];
};

/**
 * Score judicial optics for an action
 */
export function scoreJudicialOptics(
  action: string,
  timing: "early" | "on_time" | "late" | "unknown",
  persistence: "first_request" | "chased" | "repeated" | "unknown",
  proportionality: "proportional" | "disproportionate" | "unknown",
  hasChaseTrail: boolean
): OpticsReason {
  const lowerAction = action.toLowerCase();
  const factors: string[] = [];
  let optics: JudicialOptics = "neutral";

  // Early reasonable disclosure requests = attractive
  if (
    (lowerAction.includes("disclosure request") || lowerAction.includes("request disclosure")) &&
    timing === "early" &&
    proportionality === "proportional"
  ) {
    optics = "attractive";
    factors.push("Early reasonable disclosure request");
    factors.push("Proportional case management");
  }

  // Continuity requests = attractive
  if (lowerAction.includes("continuity") && timing !== "late") {
    optics = "attractive";
    factors.push("Continuity request is standard case management");
  }

  // Written submissions = attractive
  if (lowerAction.includes("written submission") || lowerAction.includes("case management")) {
    optics = "attractive";
    factors.push("Structured written submissions are judicially preferred");
  }

  // Abuse of process without chase trail = risky
  if (
    lowerAction.includes("abuse of process") &&
    !hasChaseTrail &&
    persistence === "first_request"
  ) {
    optics = "risky";
    factors.push("Abuse application without proper chase trail");
    factors.push("Premature application may irritate court");
  }

  // Abuse of process with chase trail = neutral/attractive
  if (
    lowerAction.includes("abuse of process") &&
    hasChaseTrail &&
    persistence === "repeated"
  ) {
    optics = "neutral";
    factors.push("Abuse application with documented chase trail");
    factors.push("Proportional if failures persist after chase");
  }

  // Late weak identification challenge = neutral/risky
  if (
    lowerAction.includes("identification") &&
    lowerAction.includes("challenge") &&
    timing === "late"
  ) {
    optics = "neutral";
    factors.push("Late identification challenge - should have been raised earlier");
    if (!lowerAction.includes("turnbull")) {
      optics = "risky";
      factors.push("Weak identification challenge without Turnbull basis");
    }
  }

  // Early Turnbull challenge = attractive
  if (
    lowerAction.includes("turnbull") &&
    lowerAction.includes("challenge") &&
    timing === "early"
  ) {
    optics = "attractive";
    factors.push("Early Turnbull challenge with proper basis");
  }

  // Unsubstantiated challenges = risky
  if (
    (lowerAction.includes("challenge") || lowerAction.includes("exclusion")) &&
    !lowerAction.includes("basis") &&
    !lowerAction.includes("evidence") &&
    !lowerAction.includes("turnbull") &&
    !lowerAction.includes("pace")
  ) {
    optics = "risky";
    factors.push("Unsubstantiated challenge without clear basis");
  }

  // PACE exclusion applications with basis = neutral/attractive
  if (
    lowerAction.includes("pace") &&
    lowerAction.includes("exclusion") &&
    hasChaseTrail
  ) {
    optics = "neutral";
    factors.push("PACE exclusion application with documented basis");
    if (timing === "early") {
      optics = "attractive";
      factors.push("Early PACE challenge with proper basis");
    }
  }

  // Frivolous applications = risky
  if (
    lowerAction.includes("application") &&
    (lowerAction.includes("frivolous") || lowerAction.includes("weak") || lowerAction.includes("speculative"))
  ) {
    optics = "risky";
    factors.push("Frivolous or speculative application");
  }

  // Timing adjustments
  if (timing === "late" && optics === "attractive") {
    optics = "neutral";
    factors.push("Action is late - reduced judicial attractiveness");
  }

  if (timing === "early" && optics === "risky") {
    optics = "neutral";
    factors.push("Early timing mitigates risk");
  }

  // Persistence adjustments
  if (persistence === "repeated" && !hasChaseTrail && optics !== "risky") {
    optics = "risky";
    factors.push("Repeated requests without documented chase trail");
  }

  if (persistence === "chased" && hasChaseTrail && optics === "risky") {
    optics = "neutral";
    factors.push("Proper chase trail mitigates risk");
  }

  const explanation = factors.length > 0
    ? factors.join(". ") + "."
    : "Standard case management action.";

  return {
    optics,
    explanation,
    factors,
  };
}

/**
 * Score attack path judicial optics
 */
export function scoreAttackPathOptics(
  attackPath: AttackPath,
  timing: "early" | "on_time" | "late" | "unknown",
  hasChaseTrail: boolean
): OpticsReason {
  // Score based on method and target
  const method = attackPath.method.toLowerCase();
  const target = attackPath.target.toLowerCase();

  let optics: JudicialOptics = "neutral";
  const factors: string[] = [];

  // Turnbull identification challenge = attractive if early
  if (method.includes("turnbull") && target.includes("identification")) {
    optics = timing === "early" ? "attractive" : "neutral";
    factors.push("Turnbull challenge with proper basis");
    if (timing === "late") {
      factors.push("Late challenge reduces attractiveness");
    }
  }

  // PACE exclusion = neutral/attractive if has basis
  if (method.includes("pace") || method.includes("exclusion")) {
    optics = hasChaseTrail ? "neutral" : "risky";
    factors.push(hasChaseTrail ? "PACE challenge with documented basis" : "PACE challenge without proper basis");
  }

  // Disclosure-based abuse = risky without chase, neutral with chase
  if (method.includes("disclosure") && method.includes("abuse")) {
    optics = hasChaseTrail ? "neutral" : "risky";
    factors.push(hasChaseTrail ? "Abuse application with chase trail" : "Abuse application without chase trail");
  }

  // Intent challenge = neutral/attractive
  if (method.includes("intent") || target.includes("intent")) {
    optics = "neutral";
    factors.push("Intent challenge is standard defence");
    if (timing === "early") {
      optics = "attractive";
      factors.push("Early intent challenge is judicially preferred");
    }
  }

  const explanation = factors.length > 0
    ? factors.join(". ") + "."
    : "Standard attack path.";

  return {
    optics,
    explanation,
    factors,
  };
}

/**
 * Get optics badge for UI
 */
export function getOpticsBadge(optics: JudicialOptics): { emoji: string; label: string; className: string } {
  switch (optics) {
    case "attractive":
      return {
        emoji: "🟢",
        label: "Judicially attractive",
        className: "bg-green-500/20 text-green-600 border-green-500/30",
      };
    case "neutral":
      return {
        emoji: "🟠",
        label: "Neutral",
        className: "bg-amber-500/20 text-amber-600 border-amber-500/30",
      };
    case "risky":
      return {
        emoji: "🔴",
        label: "Judicially risky",
        className: "bg-red-500/20 text-red-600 border-red-500/30",
      };
  }
}

