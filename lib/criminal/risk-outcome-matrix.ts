/**
 * Phase 6 (optional): Risk–Outcome Matrix (ROM)
 * Maps strategic options to outcome summary and risk level for display/export.
 */

export type RouteType = "fight_charge" | "charge_reduction" | "outcome_management";

export type RiskOutcomeRow = {
  option: string;
  optionId: RouteType;
  outcomeSummary: string;
  riskLevel: string;
  isPrimary?: boolean;
};

const ROUTE_LABELS: Record<RouteType, string> = {
  fight_charge: "Fight charge",
  charge_reduction: "Charge reduction",
  outcome_management: "Outcome management",
};

const OUTCOME_SUMMARY: Record<RouteType, string> = {
  fight_charge: "Acquittal / not guilty",
  charge_reduction: "Lesser charge / reduced count",
  outcome_management: "Sentence mitigation / best outcome if convicted",
};

/** Map strategy primary string (e.g. from recommendation) to RouteType. */
function inferRouteType(primary?: string): RouteType | null {
  if (!primary || typeof primary !== "string") return null;
  const p = primary.toLowerCase().replace(/-/g, "_");
  if (p.includes("fight") || p === "fight_charge") return "fight_charge";
  if (p.includes("reduction") || p.includes("reduce") || p === "charge_reduction") return "charge_reduction";
  if (p.includes("outcome") || p.includes("manage") || p === "outcome_management") return "outcome_management";
  return null;
}

export type RiskOutcomeMatrixInput = {
  primaryStrategy?: string;
  fallbacks?: string[];
  confidence?: string;
};

/**
 * Returns ROM rows: all three route types, with primary flagged and risk from confidence.
 */
export function buildRiskOutcomeMatrix(input: RiskOutcomeMatrixInput): RiskOutcomeRow[] {
  const { primaryStrategy, fallbacks, confidence } = input;
  const primaryType = inferRouteType(primaryStrategy);
  const fallbackTypes = new Set((fallbacks ?? []).map(inferRouteType).filter(Boolean) as RouteType[]);

  const riskFromConfidence = (conf?: string): string => {
    if (!conf) return "—";
    const c = conf.toUpperCase();
    if (c === "HIGH") return "Lower risk";
    if (c === "MEDIUM") return "Medium risk";
    if (c === "LOW") return "Higher risk";
    return conf;
  };

  const rows: RiskOutcomeRow[] = (
    ["fight_charge", "charge_reduction", "outcome_management"] as RouteType[]
  ).map((optionId) => {
    const isPrimary = primaryType === optionId;
    return {
      option: ROUTE_LABELS[optionId],
      optionId,
      outcomeSummary: OUTCOME_SUMMARY[optionId],
      riskLevel: isPrimary ? riskFromConfidence(confidence) : (fallbackTypes.has(optionId) ? "If pursued" : "—"),
      isPrimary,
    };
  });

  return rows;
}
