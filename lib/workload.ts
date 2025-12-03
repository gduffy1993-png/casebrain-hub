/**
 * Fee Earner Load Balancer & Billing Health
 * 
 * Provides:
 * - Load view per fee earner
 * - Risk on each case
 * - Upcoming deadlines
 * - WIP health metrics
 */

import type { Severity } from "./types/casebrain";

export type LoadStatus = "UNDERLOADED" | "OPTIMAL" | "HIGH" | "OVERLOADED";

export type FeeEarnerLoad = {
  userId: string;
  userName: string;
  email?: string;
  role?: string;
  caseCount: number;
  activeCases: number;
  criticalRiskCases: number;
  upcomingDeadlines: number;
  loadStatus: LoadStatus;
  loadScore: number; // 0-100
  caseBreakdown: {
    caseId: string;
    caseTitle: string;
    riskLevel: Severity;
    nextDeadline?: string;
  }[];
};

export type BillingHealthMetric = {
  id: string;
  label: string;
  value: number;
  target: number;
  status: "GOOD" | "WARNING" | "BAD";
  trend?: "UP" | "DOWN" | "STABLE";
  description: string;
};

export type WipHealthView = {
  totalWip: number;
  unbilledWip: number;
  agedWip: {
    current: number; // < 30 days
    aged30: number;  // 30-60 days
    aged60: number;  // 60-90 days
    aged90Plus: number; // 90+ days
  };
  casesWithSignificantWip: Array<{
    caseId: string;
    caseTitle: string;
    wipAmount: number;
    lastBilled?: string;
    daysSinceActivity: number;
  }>;
  metrics: BillingHealthMetric[];
  generatedAt: string;
};

// Thresholds for load calculation
const LOAD_THRESHOLDS = {
  OPTIMAL_CASES: 20,
  HIGH_CASES: 30,
  OVERLOADED_CASES: 40,
  CRITICAL_RISK_WEIGHT: 3, // Each critical risk case counts as 3 cases
  DEADLINE_WEIGHT: 0.5,    // Each upcoming deadline adds 0.5 to load score
};

/**
 * Calculate load for a fee earner
 */
export function calculateFeeEarnerLoad(params: {
  userId: string;
  userName: string;
  email?: string;
  role?: string;
  cases: Array<{
    caseId: string;
    caseTitle: string;
    isActive: boolean;
    riskLevel: Severity;
    nextDeadline?: string;
  }>;
}): FeeEarnerLoad {
  const { userId, userName, email, role, cases } = params;

  const activeCases = cases.filter(c => c.isActive);
  const criticalRiskCases = activeCases.filter(c => c.riskLevel === "CRITICAL");
  
  // Count upcoming deadlines (within 14 days)
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = activeCases.filter(c => {
    if (!c.nextDeadline) return false;
    const deadline = new Date(c.nextDeadline);
    return deadline >= now && deadline <= twoWeeksFromNow;
  });

  // Calculate load score
  let loadScore = (activeCases.length / LOAD_THRESHOLDS.OPTIMAL_CASES) * 50;
  loadScore += criticalRiskCases.length * LOAD_THRESHOLDS.CRITICAL_RISK_WEIGHT * 5;
  loadScore += upcomingDeadlines.length * LOAD_THRESHOLDS.DEADLINE_WEIGHT * 5;
  loadScore = Math.min(100, Math.round(loadScore));

  // Determine load status
  let loadStatus: LoadStatus;
  if (loadScore < 30) {
    loadStatus = "UNDERLOADED";
  } else if (loadScore < 60) {
    loadStatus = "OPTIMAL";
  } else if (loadScore < 80) {
    loadStatus = "HIGH";
  } else {
    loadStatus = "OVERLOADED";
  }

  return {
    userId,
    userName,
    email,
    role,
    caseCount: cases.length,
    activeCases: activeCases.length,
    criticalRiskCases: criticalRiskCases.length,
    upcomingDeadlines: upcomingDeadlines.length,
    loadStatus,
    loadScore,
    caseBreakdown: activeCases.slice(0, 10).map(c => ({
      caseId: c.caseId,
      caseTitle: c.caseTitle,
      riskLevel: c.riskLevel,
      nextDeadline: c.nextDeadline,
    })),
  };
}

/**
 * Calculate WIP health for the organization
 */
export function calculateWipHealth(params: {
  cases: Array<{
    caseId: string;
    caseTitle: string;
    wipAmount: number;
    lastBilled?: string;
    lastActivity?: string;
    isActive: boolean;
  }>;
  billingTargetMonthly: number;
}): WipHealthView {
  const { cases, billingTargetMonthly } = params;
  const now = new Date();

  // Calculate total WIP
  const totalWip = cases.reduce((sum, c) => sum + c.wipAmount, 0);
  
  // Calculate aged WIP
  const agedWip = {
    current: 0,
    aged30: 0,
    aged60: 0,
    aged90Plus: 0,
  };

  const casesWithSignificantWip: WipHealthView["casesWithSignificantWip"] = [];

  cases.forEach(c => {
    if (c.wipAmount <= 0) return;

    const lastDate = c.lastActivity ? new Date(c.lastActivity) : now;
    const daysSinceActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceActivity < 30) {
      agedWip.current += c.wipAmount;
    } else if (daysSinceActivity < 60) {
      agedWip.aged30 += c.wipAmount;
    } else if (daysSinceActivity < 90) {
      agedWip.aged60 += c.wipAmount;
    } else {
      agedWip.aged90Plus += c.wipAmount;
    }

    // Track significant WIP
    if (c.wipAmount > 1000 || daysSinceActivity > 60) {
      casesWithSignificantWip.push({
        caseId: c.caseId,
        caseTitle: c.caseTitle,
        wipAmount: c.wipAmount,
        lastBilled: c.lastBilled,
        daysSinceActivity,
      });
    }
  });

  // Sort by WIP amount
  casesWithSignificantWip.sort((a, b) => b.wipAmount - a.wipAmount);

  // Calculate unbilled WIP (aged > 30 days)
  const unbilledWip = agedWip.aged30 + agedWip.aged60 + agedWip.aged90Plus;

  // Generate health metrics
  const metrics: BillingHealthMetric[] = [
    {
      id: "total_wip",
      label: "Total WIP",
      value: totalWip,
      target: billingTargetMonthly * 2,
      status: totalWip > billingTargetMonthly * 3 ? "BAD" : totalWip > billingTargetMonthly * 2 ? "WARNING" : "GOOD",
      description: "Total work in progress value",
    },
    {
      id: "aged_wip_ratio",
      label: "Aged WIP Ratio",
      value: Math.round((unbilledWip / totalWip) * 100) || 0,
      target: 20,
      status: (unbilledWip / totalWip) > 0.4 ? "BAD" : (unbilledWip / totalWip) > 0.2 ? "WARNING" : "GOOD",
      description: "Percentage of WIP older than 30 days",
    },
    {
      id: "critical_aged_wip",
      label: "Critical Aged WIP (90+)",
      value: agedWip.aged90Plus,
      target: 0,
      status: agedWip.aged90Plus > 5000 ? "BAD" : agedWip.aged90Plus > 1000 ? "WARNING" : "GOOD",
      description: "WIP older than 90 days",
    },
    {
      id: "unbilled_cases",
      label: "Cases with Unbilled WIP",
      value: casesWithSignificantWip.length,
      target: cases.length * 0.2,
      status: casesWithSignificantWip.length > cases.length * 0.4 ? "BAD" : casesWithSignificantWip.length > cases.length * 0.2 ? "WARNING" : "GOOD",
      description: "Number of cases with significant unbilled work",
    },
  ];

  return {
    totalWip,
    unbilledWip,
    agedWip,
    casesWithSignificantWip: casesWithSignificantWip.slice(0, 20),
    metrics,
    generatedAt: new Date().toISOString(),
  };
}

