
import type { ExtractedCaseFacts, TimelineEvent } from "@/types";

/**
 * Core Litigation Brain - Litigation Guidance Engine
 * 
 * Provides stage assessment and procedural guidance based on extracted facts.
 * NOT legal advice - guidance only with uncertainty disclaimers.
 */

export type LitigationStage =
  | "intake"
  | "investigation"
  | "pre_action"
  | "litigation"
  | "enforcement"
  | "settlement"
  | "closed";

export type ProceduralStep = {
  step: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  deadline?: Date;
  sourceEvidence?: string[];
  uncertainty?: string;
  recommendedTemplates?: string[];
};

export type RiskFlag = {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  recommendedAction: string;
};

export type LitigationGuidance = {
  currentStage: LitigationStage;
  confidence: "high" | "medium" | "low";
  nextSteps: ProceduralStep[];
  riskFlags: RiskFlag[];
  recommendedTemplates: string[];
  disclaimer: string;
};

/**
 * Assess litigation stage based on extracted facts and timeline
 */
export function assessLitigationStage(
  facts: ExtractedCaseFacts,
  timeline: TimelineEvent[],
  practiceArea?: string,
): LitigationStage {
  // Check for litigation indicators
  const hasCourtAction = timeline.some(
    (e) =>
      e.label.toLowerCase().includes("claim") ||
      e.label.toLowerCase().includes("proceedings") ||
      e.label.toLowerCase().includes("court"),
  );

  if (hasCourtAction) {
    return "litigation";
  }

  // Check for pre-action indicators
  const hasPreAction = timeline.some(
    (e) =>
      e.label.toLowerCase().includes("letter before action") ||
      e.label.toLowerCase().includes("pre-action") ||
      e.label.toLowerCase().includes("protocol"),
  );

  if (hasPreAction) {
    return "pre_action";
  }

  // Check for settlement indicators
  const hasSettlement = timeline.some(
    (e) =>
      e.label.toLowerCase().includes("settlement") ||
      e.label.toLowerCase().includes("offer") ||
      e.label.toLowerCase().includes("agreement"),
  );

  if (hasSettlement) {
    return "settlement";
  }

  // Default based on evidence volume
  if (timeline.length > 5) {
    return "investigation";
  }

  return "intake";
}

/**
 * Generate procedural guidance
 */
export function generateGuidance(
  facts: ExtractedCaseFacts,
  timeline: TimelineEvent[],
  practiceArea?: string,
): LitigationGuidance {
  const stage = assessLitigationStage(facts, timeline, practiceArea);

  const nextSteps: ProceduralStep[] = [];
  const riskFlags: RiskFlag[] = [];

  // Check for limitation risks
  const limitationDates = facts.dates.filter((d) =>
    d.label.toLowerCase().includes("limitation") ||
    d.label.toLowerCase().includes("expir"),
  );

  if (limitationDates.length > 0) {
    const limitationDate = new Date(limitationDates[0].isoDate);
    const daysRemaining = Math.floor(
      (limitationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 90) {
      riskFlags.push({
        type: "limitation_period",
        severity: daysRemaining < 30 ? "critical" : "high",
        description: `Limitation period expires in ${daysRemaining} days`,
        evidence: [limitationDates[0].label],
        recommendedAction: "Issue proceedings immediately or seek extension",
      });

      nextSteps.push({
        step: "Urgent: Limitation deadline",
        description: `Limitation period expires ${limitationDate.toLocaleDateString("en-GB")}`,
        priority: "urgent",
        deadline: limitationDate,
        sourceEvidence: [limitationDates[0].label],
        uncertainty: "Verify limitation date with qualified legal advisor",
      });
    }
  }

  // Check for missing key evidence
  if (!facts.parties.find((p) => p.role === "defendant" || p.role === "opponent")) {
    riskFlags.push({
      type: "missing_defendant",
      severity: "medium",
      description: "Defendant/opponent not clearly identified",
      evidence: [],
      recommendedAction: "Clarify defendant identity before proceeding",
    });
  }

  // Stage-specific next steps
  if (stage === "intake") {
    nextSteps.push({
      step: "Gather initial evidence",
      description: "Collect all relevant documents and correspondence",
      priority: "high",
      sourceEvidence: [],
    });
  } else if (stage === "investigation") {
    nextSteps.push({
      step: "Consider expert evidence",
      description: "Assess need for expert reports (medical, technical, etc.)",
      priority: "medium",
      sourceEvidence: [],
    });
  } else if (stage === "pre_action") {
    nextSteps.push({
      step: "Draft Letter Before Action",
      description: "Prepare pre-action protocol letter",
      priority: "high",
      sourceEvidence: [],
      recommendedTemplates: ["LBA", "PRE_ACTION"],
    });
  }

  return {
    currentStage: stage,
    confidence: facts.parties.length > 0 && facts.dates.length > 0 ? "high" : "medium",
    nextSteps,
    riskFlags,
    recommendedTemplates: nextSteps
      .flatMap((s) => s.recommendedTemplates ?? [])
      .filter((t, i, arr) => arr.indexOf(t) === i),
    disclaimer:
      "This guidance is based on extracted data and does not constitute legal advice. Always verify with qualified legal counsel. Dates and deadlines should be confirmed independently.",
  };
}

