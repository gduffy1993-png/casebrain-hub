import type { PracticeArea } from "@/lib/types/casebrain";

/**
 * Dashboard section identifiers
 * Each represents a distinct panel/section that can appear on the dashboard
 */
export type DashboardSectionId =
  | "stats"
  | "piSummary"
  | "recentCases"
  | "deadlines"
  | "riskSummary"
  | "limitation"
  | "tasks"
  | "timeline"
  | "missingEvidence"
  | "nextSteps"
  | "hazard"
  | "documents"
  | "supervision";

/**
 * Practice area key matching the PracticeArea type
 */
export type PracticeAreaKey =
  | "housing_disrepair"
  | "personal_injury"
  | "clinical_negligence"
  | "family"
  | "other_litigation";

/**
 * Labels for the top stat cards
 */
export type DashboardStatCardLabels = {
  casesLabel: string;
  deadlinesLabel: string;
  lettersLabel: string;
  exportsLabel: string;
};

/**
 * Dashboard configuration for a practice area
 * Controls which sections appear and in what order, plus labels
 */
export type DashboardConfig = {
  sections: DashboardSectionId[];
  statCardLabels: DashboardStatCardLabels;
};

/**
 * Dashboard configuration map
 * Each practice area gets its own config defining visible sections and labels
 */
export const DASHBOARD_CONFIG: Record<PracticeAreaKey, DashboardConfig> = {
  housing_disrepair: {
    sections: [
      "stats",
      "riskSummary",
      "limitation",
      "hazard",
      "missingEvidence",
      "nextSteps",
      "recentCases",
      "deadlines",
      "tasks",
      "timeline",
      "documents",
      "supervision",
    ],
    statCardLabels: {
      casesLabel: "Open housing cases",
      deadlinesLabel: "Upcoming deadlines",
      lettersLabel: "Letters drafted",
      exportsLabel: "Housing bundles exported",
    },
  },
  personal_injury: {
    sections: [
      "stats",
      "piSummary",
      "riskSummary",
      "limitation",
      "missingEvidence",
      "nextSteps",
      "recentCases",
      "deadlines",
      "tasks",
      "timeline",
      "documents",
      "supervision",
    ],
    statCardLabels: {
      casesLabel: "Open PI cases",
      deadlinesLabel: "Upcoming deadlines",
      lettersLabel: "Letters drafted",
      exportsLabel: "PI bundles exported",
    },
  },
  clinical_negligence: {
    sections: [
      "stats",
      "piSummary",
      "riskSummary",
      "limitation",
      "missingEvidence",
      "nextSteps",
      "recentCases",
      "deadlines",
      "tasks",
      "timeline",
      "documents",
      "supervision",
    ],
    statCardLabels: {
      casesLabel: "Open clinical neg. cases",
      deadlinesLabel: "Upcoming deadlines",
      lettersLabel: "Letters drafted",
      exportsLabel: "Clinical bundles exported",
    },
  },
  family: {
    sections: [
      "stats",
      "riskSummary",
      "limitation",
      "missingEvidence",
      "nextSteps",
      "recentCases",
      "deadlines",
      "tasks",
      "timeline",
      "documents",
      "supervision",
    ],
    statCardLabels: {
      casesLabel: "Open family cases",
      deadlinesLabel: "Upcoming deadlines",
      lettersLabel: "Letters drafted",
      exportsLabel: "Family bundles exported",
    },
  },
  other_litigation: {
    sections: [
      "stats",
      "riskSummary",
      "limitation",
      "missingEvidence",
      "nextSteps",
      "recentCases",
      "deadlines",
      "tasks",
      "timeline",
      "documents",
      "supervision",
    ],
    statCardLabels: {
      casesLabel: "Open litigation cases",
      deadlinesLabel: "Upcoming deadlines",
      lettersLabel: "Letters drafted",
      exportsLabel: "Bundles exported",
    },
  },
};

/**
 * Get dashboard config for a practice area
 * Falls back to other_litigation if unknown
 */
export function getDashboardConfig(
  practiceArea: PracticeArea | string | null | undefined
): DashboardConfig {
  if (!practiceArea) {
    return DASHBOARD_CONFIG.other_litigation;
  }

  const normalized = practiceArea as PracticeAreaKey;
  return DASHBOARD_CONFIG[normalized] ?? DASHBOARD_CONFIG.other_litigation;
}

