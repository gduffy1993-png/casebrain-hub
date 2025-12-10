/**
 * Paywall Configuration
 * 
 * Single source of truth for all paywall limits and configuration
 */

export const PAYWALL_LIMITS = {
  free: {
    maxUploads: 15, // Enough to test 3-5 real cases properly
    maxAnalysis: 20, // Enough to see Strategic Intelligence in action
    maxExports: 3, // Enough to test export features
  },
  starter: {
    maxUploads: 50, // For solo/small firms
    maxAnalysis: 100,
    maxExports: 20,
  },
  pro: {
    maxUploads: Infinity,
    maxAnalysis: Infinity,
    maxExports: Infinity,
  },
} as const;

export type PlanName = keyof typeof PAYWALL_LIMITS;

/**
 * Feature access by plan
 */
export const PLAN_FEATURES = {
  free: {
    // Core features (always available)
    caseManagement: true,
    documentUpload: true,
    timeline: true,
    basicExtraction: true,
    riskAlerts: true,
    deadlines: true,
    
    // Limited AI features
    strategicIntelligence: false,
    aggressiveDefense: false,
    bundleNavigator: false,
    
    // Practice management
    timeTracking: false,
    invoicing: false,
    emailIntegration: false,
    smsWhatsApp: false,
    calendarSync: false,
    eSignatures: false,
    trustAccounting: false,
    customReports: false,
    
    // Advanced features
    wipRecovery: false,
    opponentProfiling: false,
    profitabilityTracking: false,
    settlementCalculator: false,
    clientExpectations: false,
    caseSimilarity: false,
  },
  starter: {
    // Core features
    caseManagement: true,
    documentUpload: true,
    timeline: true,
    basicExtraction: true,
    riskAlerts: true,
    deadlines: true,
    
    // AI features (limited)
    strategicIntelligence: true,
    aggressiveDefense: true,
    bundleNavigator: true,
    
    // Practice management (basic)
    timeTracking: true,
    invoicing: true,
    emailIntegration: true,
    smsWhatsApp: false,
    calendarSync: false,
    eSignatures: false,
    trustAccounting: false,
    customReports: false,
    
    // Advanced features
    wipRecovery: false,
    opponentProfiling: false,
    profitabilityTracking: false,
    settlementCalculator: false,
    clientExpectations: false,
    caseSimilarity: false,
  },
  pro: {
    // Everything unlimited
    caseManagement: true,
    documentUpload: true,
    timeline: true,
    basicExtraction: true,
    riskAlerts: true,
    deadlines: true,
    strategicIntelligence: true,
    aggressiveDefense: true,
    bundleNavigator: true,
    timeTracking: true,
    invoicing: true,
    emailIntegration: true,
    smsWhatsApp: true,
    calendarSync: true,
    eSignatures: true,
    trustAccounting: true,
    customReports: true,
    wipRecovery: true,
    opponentProfiling: true,
    profitabilityTracking: true,
    settlementCalculator: true,
    clientExpectations: true,
    caseSimilarity: true,
  },
} as const;

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

