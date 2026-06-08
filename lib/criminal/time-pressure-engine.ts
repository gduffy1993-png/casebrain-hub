/**
 * Time & Pressure Awareness Engine
 * 
 * Tracks disclosure deadlines, PTPH, plea credit drop points,
 * and last safe pivot moments.
 * 
 * Adjusts strategy leverage based on time.
 * Warns when pressure windows are closing.
 */

import type { RouteType } from "./strategy-fight-types";

export type PressureWindow = {
  id: string;
  type: "ptph" | "disclosure_deadline" | "plea_credit_drop" | "pivot_moment";
  label: string;
  date: Date | null; // null if unknown/placeholder
  isPlaceholder: boolean;
  daysUntil: number | null; // null if date unknown
  leverageImpact: "high" | "medium" | "low";
  actions: string[];
  warning?: string;
};

export type TimePressureState = {
  windows: PressureWindow[];
  currentLeverage: "high" | "medium" | "low";
  leverageExplanation: string;
  timeCriticalActions: string[];
  losingLeverageActions: string[];
  noLongerAttractiveActions: string[];
};

/**
 * Build time pressure state from case data
 */
export function buildTimePressureState(
  ptphDate: Date | null,
  disclosureDeadline: Date | null,
  currentDate: Date = new Date()
): TimePressureState {
  const windows: PressureWindow[] = [];

  // PTPH window
  if (ptphDate) {
    const daysUntil = Math.ceil((ptphDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    windows.push({
      id: "ptph",
      type: "ptph",
      label: "PTPH (Plea and Trial Preparation Hearing)",
      date: ptphDate,
      isPlaceholder: false,
      daysUntil,
      leverageImpact: daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low",
      actions: [
        "Finalise disclosure requests",
        "Prepare case management submissions",
        "Confirm strategy commitment",
        "Negotiate charge reduction if applicable",
      ],
      warning: daysUntil <= 7 ? "PTPH approaching - leverage window closing" : undefined,
    });
  } else {
    windows.push({
      id: "ptph",
      type: "ptph",
      label: "PTPH (Plea and Trial Preparation Hearing)",
      date: null,
      isPlaceholder: true,
      daysUntil: null,
      leverageImpact: "medium",
      actions: [
        "Add PTPH date to activate pressure calendar",
        "Request disclosure before PTPH",
        "Prepare case management submissions",
      ],
      warning: "PTPH date unknown - add date to track leverage windows",
    });
  }

  // Disclosure deadline
  if (disclosureDeadline) {
    const daysUntil = Math.ceil((disclosureDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    windows.push({
      id: "disclosure",
      type: "disclosure_deadline",
      label: "Disclosure Deadline",
      date: disclosureDeadline,
      isPlaceholder: false,
      daysUntil,
      leverageImpact: daysUntil <= 14 ? "high" : "medium",
      actions: [
        "Chase outstanding disclosure",
        "Document chase trail",
        "Prepare abuse application if failures persist",
      ],
      warning: daysUntil <= 7 ? "Disclosure deadline approaching" : undefined,
    });
  }

  // Plea credit drop point (typically 7 days before trial, but varies)
  // Estimate based on PTPH if trial date unknown
  const estimatedTrialDate = ptphDate ? new Date(ptphDate.getTime() + 90 * 24 * 60 * 60 * 1000) : null; // ~90 days after PTPH
  if (estimatedTrialDate) {
    const pleaCreditDropDate = new Date(estimatedTrialDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const daysUntil = Math.ceil((pleaCreditDropDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    windows.push({
      id: "plea_credit",
      type: "plea_credit_drop",
      label: "Plea Credit Drop Point (estimated)",
      date: pleaCreditDropDate,
      isPlaceholder: true,
      daysUntil,
      leverageImpact: daysUntil <= 14 ? "high" : "medium",
      actions: [
        "Assess plea position before credit drops",
        "Consider early plea if case is strong",
      ],
      warning: daysUntil <= 7 ? "Plea credit window closing" : undefined,
    });
  }

  // Last safe pivot moment (before PTPH to preserve leverage)
  if (ptphDate) {
    const pivotMoment = new Date(ptphDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before PTPH
    const daysUntil = Math.ceil((pivotMoment.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    windows.push({
      id: "pivot",
      type: "pivot_moment",
      label: "Last Safe Pivot Moment",
      date: pivotMoment,
      isPlaceholder: false,
      daysUntil,
      leverageImpact: daysUntil <= 7 ? "high" : "medium",
      actions: [
        "Reassess strategy based on disclosure",
        "Pivot if evidence supports different route",
        "Commit to strategy before PTPH",
      ],
      warning: daysUntil <= 3 ? "Last safe pivot moment approaching" : undefined,
    });
  }

  // Calculate current leverage
  const highLeverageWindows = windows.filter(w => w.leverageImpact === "high" && w.daysUntil !== null && w.daysUntil <= 7);
  const currentLeverage: "high" | "medium" | "low" = 
    highLeverageWindows.length > 0 ? "high" :
    windows.some(w => w.leverageImpact === "medium" && w.daysUntil !== null && w.daysUntil <= 14) ? "medium" :
    "low";

  const leverageExplanation = 
    currentLeverage === "high" ? "High time pressure - critical deadlines approaching. Leverage windows closing." :
    currentLeverage === "medium" ? "Moderate time pressure - deadlines within 2 weeks. Monitor leverage windows." :
    "Low time pressure - deadlines are distant. Leverage windows open.";

  // Identify time-critical actions
  const timeCriticalActions = windows
    .filter(w => w.daysUntil !== null && w.daysUntil <= 7)
    .flatMap(w => w.actions)
    .filter((action, index, self) => self.indexOf(action) === index); // Remove duplicates

  // Actions losing leverage (past optimal timing)
  const losingLeverageActions: string[] = [];
  if (ptphDate && currentDate > new Date(ptphDate.getTime() - 3 * 24 * 60 * 60 * 1000)) {
    losingLeverageActions.push("Strategy pivot (leverage lost after PTPH)");
    losingLeverageActions.push("Charge reduction negotiation (less effective after PTPH)");
  }

  // Actions no longer judicially attractive (too late)
  const noLongerAttractiveActions: string[] = [];
  if (ptphDate && currentDate > ptphDate) {
    noLongerAttractiveActions.push("Late disclosure requests (should have been made before PTPH)");
    noLongerAttractiveActions.push("Premature abuse applications (without proper chase trail)");
  }

  return {
    windows,
    currentLeverage,
    leverageExplanation,
    timeCriticalActions,
    losingLeverageActions,
    noLongerAttractiveActions,
  };
}

/**
 * Adjust strategy leverage based on time pressure
 */
export function adjustStrategyLeverage(
  route: RouteType,
  timePressure: TimePressureState
): {
  adjustedLeverage: "high" | "medium" | "low";
  explanation: string;
  timeAwareActions: string[];
} {
  let adjustedLeverage: "high" | "medium" | "low" = "medium";
  let explanation = "";
  const timeAwareActions: string[] = [];

  switch (route) {
    case "fight_charge":
      if (timePressure.currentLeverage === "high") {
        adjustedLeverage = "high";
        explanation = "High time pressure increases urgency for disclosure requests and challenge preparation. Leverage window closing.";
        timeAwareActions.push("Request disclosure immediately - time critical");
        timeAwareActions.push("Document chase trail urgently");
      } else {
        adjustedLeverage = "medium";
        explanation = "Time pressure is moderate. Proceed with disclosure requests and challenge preparation.";
      }
      break;

    case "charge_reduction":
      if (timePressure.currentLeverage === "high") {
        adjustedLeverage = "high";
        explanation = "High time pressure - negotiate charge reduction before PTPH to preserve leverage.";
        timeAwareActions.push("Negotiate charge reduction urgently - before PTPH");
        timeAwareActions.push("Prepare written submissions on intent distinction");
      } else {
        adjustedLeverage = "medium";
        explanation = "Time pressure allows negotiation window. Prepare charge reduction case before PTPH.";
      }
      break;

    case "outcome_management":
      if (timePressure.currentLeverage === "high") {
        adjustedLeverage = "high";
        explanation = "High time pressure - assess plea position before credit drops. Early plea credit window closing.";
        timeAwareActions.push("Assess plea position urgently - credit window closing");
        timeAwareActions.push("Prepare mitigation package");
      } else {
        adjustedLeverage = "medium";
        explanation = "Time pressure allows assessment window. Consider early plea if case is strong.";
      }
      break;
  }

  return {
    adjustedLeverage,
    explanation,
    timeAwareActions,
  };
}

