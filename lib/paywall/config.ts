/**
 * Paywall Configuration
 * 
 * Single source of truth for all paywall limits and configuration
 */

export const PAYWALL_LIMITS = {
  free: {
    maxUploads: 3,
    maxAnalysis: 5,
    maxExports: 1,
  },
  pro: {
    maxUploads: Infinity,
    maxAnalysis: Infinity,
    maxExports: Infinity,
  },
} as const;

export type PlanName = keyof typeof PAYWALL_LIMITS;

export type FeatureKind = "upload" | "analysis" | "export";

/**
 * Get the limit for a specific feature and plan
 */
export function getFeatureLimit(plan: PlanName, feature: FeatureKind): number {
  switch (feature) {
    case "upload":
      return PAYWALL_LIMITS[plan].maxUploads;
    case "analysis":
      return PAYWALL_LIMITS[plan].maxAnalysis;
    case "export":
      return PAYWALL_LIMITS[plan].maxExports;
    default:
      return 0;
  }
}

/**
 * Check if a plan has unlimited access to a feature
 */
export function isUnlimited(plan: PlanName, feature: FeatureKind): boolean {
  return getFeatureLimit(plan, feature) === Infinity;
}

