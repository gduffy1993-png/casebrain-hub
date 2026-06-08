/**
 * Core Litigation Brain - Risk Alert Copy/Wording Pack
 * 
 * Centralised copy for risk alerts to ensure consistent, professional wording
 * that clearly states this is procedural guidance, not legal advice.
 */

import type { RiskSeverity, RiskRecommendedAction } from "./types";

/**
 * Context for building limitation alert messages
 */
export interface LimitationContext {
  limitationDate?: string; // ISO
  hazard?: { level: number; type: string } | null;
  specialDamages?: boolean;
  timeline?: boolean;
  statusLabel?: string;
  practiceArea?: "housing" | "pi_rta" | "pi_general" | "clin_neg" | "other";
  stage?: string; // e.g. "pre_action", "investigation", "litigation"
}

/**
 * Build structured limitation alert message with hybrid formal + operational tone
 */
export function buildLimitationMessage(ctx: LimitationContext): string {
  const parts: string[] = [];

  // Opening statement
  parts.push("Possible limitation deadline detected.");

  // Evidence section
  const evidenceParts: string[] = [];
  
  if (ctx.hazard) {
    // Format hazard type: convert "damp_mould" to "damp & mould", "structural" to "structural", etc.
    const hazardType = ctx.hazard.type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" & ");
    evidenceParts.push(
      `Evidence indicates a Category ${ctx.hazard.level} ${hazardType} hazard`,
    );
  }

  if (ctx.specialDamages) {
    if (evidenceParts.length > 0) {
      evidenceParts.push("with special damages potentially recoverable");
    } else {
      evidenceParts.push("Special damages potentially recoverable");
    }
  }

  if (ctx.timeline) {
    if (evidenceParts.length > 0) {
      evidenceParts.push("and a reconstructable timeline appears available");
    } else {
      evidenceParts.push("A reconstructable timeline appears available");
    }
  }

  if (ctx.stage) {
    const stageLabel =
      ctx.stage === "pre_action"
        ? "pre-action stage"
        : ctx.stage === "investigation"
          ? "investigation stage"
          : ctx.stage === "litigation"
            ? "litigation stage"
            : `${ctx.stage} stage`;
    if (evidenceParts.length > 0) {
      evidenceParts.push(`and the matter is likely in the ${stageLabel}`);
    } else {
      evidenceParts.push(`The matter is likely in the ${stageLabel}`);
    }
  }

  if (evidenceParts.length > 0) {
    // Join evidence parts with commas and "and" for the last item
    let evidenceText = evidenceParts[0];
    if (evidenceParts.length > 1) {
      const lastPart = evidenceParts[evidenceParts.length - 1];
      const middleParts = evidenceParts.slice(1, -1);
      if (middleParts.length > 0) {
        evidenceText = `${evidenceParts[0]}, ${middleParts.join(", ")}, ${lastPart}`;
      } else {
        evidenceText = `${evidenceParts[0]} ${lastPart}`;
      }
    }
    parts.push(`${evidenceText}.`);
  }

  // Limitation date section
  if (ctx.limitationDate) {
    const dateIso = new Date(ctx.limitationDate).toISOString().slice(0, 10);
    const severity = ctx.limitationDate
      ? (() => {
          const daysRemaining = Math.floor(
            (new Date(ctx.limitationDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          if (daysRemaining < 0) return "critical procedural risk";
          if (daysRemaining <= 90) return "critical procedural risk";
          if (daysRemaining <= 180) return "high procedural risk";
          return "procedural risk";
        })()
      : "procedural risk";
    
    parts.push(
      `If the limitation date is ${dateIso}, this case may be at **${severity}** depending on confirmed dates.`,
    );
  }

  // Recommended steps section
  parts.push("");
  parts.push("Recommended steps (procedural guidance only, not legal advice):");
  parts.push("• Verify timeline dates from disclosure / instructions");
  parts.push("• Consider a standstill agreement or issue-and-serve strategy");
  parts.push("• Update supervision diary / risk register");

  // Source and status section
  const sourceParts: string[] = [];
  sourceParts.push("Source: extracted from uploaded PDF (timeline extraction).");
  
  if (ctx.statusLabel) {
    sourceParts.push(`Status: ${ctx.statusLabel}`);
  } else {
    sourceParts.push("Status: Outstanding");
  }

  parts.push("");
  parts.push(sourceParts.join(" "));

  // Join all parts with double line breaks
  return parts.filter(Boolean).join("\n\n");
}

export const riskCopy = {
  limitation: {
    title: (severity: RiskSeverity): string => {
      switch (severity) {
        case "critical":
          return "Limitation period – CRITICAL";
        case "high":
          return "Limitation period – high risk";
        case "medium":
          return "Limitation period – check required";
        case "low":
          return "Limitation period – monitor";
        default:
          return "Limitation period – information required";
      }
    },

    buildMessage: (opts: {
      limitationDate?: string;
      contextSummary?: string; // Legacy: kept for backwards compatibility
      daysRemaining?: number;
      isExpired?: boolean;
      // New structured context
      context?: LimitationContext;
    }): string => {
      // If new context is provided, use the structured builder
      // Check for context object with at least one meaningful field
      if (opts.context && (opts.context.limitationDate || opts.context.hazard || opts.context.stage || opts.context.timeline !== undefined || opts.context.specialDamages !== undefined)) {
        return buildLimitationMessage(opts.context);
      }

      // Legacy fallback for backwards compatibility
      const parts: string[] = [];

      if (opts.isExpired && opts.limitationDate) {
        parts.push(
          `Possible limitation period may have expired (calculated date: ${new Date(opts.limitationDate).toLocaleDateString("en-GB")}).`,
        );
      } else if (opts.limitationDate) {
        const daysText =
          opts.daysRemaining !== undefined
            ? opts.daysRemaining <= 0
              ? "expired"
              : `${opts.daysRemaining} days remaining`
            : "";
        parts.push(
          `Possible limitation deadline around ${new Date(opts.limitationDate).toLocaleDateString("en-GB")}${daysText ? ` (${daysText})` : ""}.`,
        );
      } else {
        parts.push("Possible limitation issue detected.");
      }

      if (opts.contextSummary) {
        parts.push(opts.contextSummary);
      }

      parts.push(
        "This is procedural guidance only and does not constitute legal advice. Dates must be confirmed with a qualified legal advisor.",
      );

      return parts.join(" ");
    },

    defaultRecommendedActions: (opts: {
      limitationDate?: string;
      isMinor?: boolean;
      hasVulnerability?: boolean;
      isExpired?: boolean;
    }): RiskRecommendedAction[] => {
      const actions: RiskRecommendedAction[] = [];

      if (opts.isExpired) {
        actions.push({
          id: "urgent-review",
          label: "URGENT: Review limitation status with qualified solicitor",
          description:
            "Possible limitation period may have expired. Immediate review by a qualified legal professional is required to assess whether proceedings can still be issued or if a standstill agreement is needed.",
          priority: "urgent",
        });
      } else {
        actions.push({
          id: "confirm-dates",
          label: "Confirm date of knowledge and primary limitation period",
          description:
            "Check incident date, date of knowledge, and any relevant statutory time limits. Record the confirmed limitation date in the file.",
          priority: opts.limitationDate ? "urgent" : "high",
        });

        actions.push({
          id: "standstill-or-issue",
          label: "Consider standstill agreement or issuing & serving",
          description:
            "If limitation is approaching or may have passed, prepare a standstill agreement or issue & serve checklist for a qualified solicitor to review.",
          priority: "urgent",
        });
      }

      if (opts.isMinor || opts.hasVulnerability) {
        actions.push({
          id: "check-vulnerability",
          label: "Check for vulnerability uplift (child, disability, respiratory issues)",
          description:
            "Confirm whether the claimant is a minor or vulnerable (e.g. asthma, disability) as this may affect evidential approach and urgency.",
          priority: "high",
        });
      }

      actions.push({
        id: "update-tracker",
        label: "Update the case limitation tracker",
        description:
          "Record the confirmed limitation date and risk level in the case's limitation tracker and diarise appropriate review reminders.",
        priority: "normal",
      });

      return actions;
    },
  },

  awaabs_law: {
    title: (severity: RiskSeverity): string => {
      switch (severity) {
        case "critical":
          return "Awaab's Law – CRITICAL breach";
        case "high":
          return "Awaab's Law – deadline exceeded";
        case "medium":
          return "Awaab's Law – deadline approaching";
        default:
          return "Awaab's Law – monitor compliance";
      }
    },

    buildMessage: (opts: {
      deadlineType: "investigation" | "work_start" | "completion";
      deadlineDate?: string;
      daysOverdue?: number;
    }): string => {
      const parts: string[] = [];

      if (opts.deadlineType === "investigation") {
        if (opts.daysOverdue !== undefined && opts.daysOverdue > 0) {
          parts.push(
            `Awaab's Law investigation deadline exceeded by ${opts.daysOverdue} days. Social landlords must investigate within 14 days of report.`,
          );
        } else if (opts.deadlineDate) {
          parts.push(
            `Awaab's Law investigation deadline: ${new Date(opts.deadlineDate).toLocaleDateString("en-GB")}. Social landlords must investigate within 14 days of report.`,
          );
        } else {
          parts.push(
            "Awaab's Law requires social landlords to investigate within 14 days of report.",
          );
        }
      } else if (opts.deadlineType === "work_start") {
        if (opts.daysOverdue !== undefined && opts.daysOverdue > 0) {
          parts.push(
            `Awaab's Law work start deadline exceeded by ${opts.daysOverdue} days. Work must start within 7 days of investigation.`,
          );
        } else if (opts.deadlineDate) {
          parts.push(
            `Awaab's Law work start deadline: ${new Date(opts.deadlineDate).toLocaleDateString("en-GB")}. Work must start within 7 days of investigation.`,
          );
        } else {
          parts.push(
            "Awaab's Law requires work to start within 7 days of investigation.",
          );
        }
      }

      parts.push(
        "This is procedural guidance only and does not constitute legal advice. Compliance should be verified with qualified legal counsel.",
      );

      return parts.join(" ");
    },
  },

  section_11: {
    title: (severity: RiskSeverity): string => {
      switch (severity) {
        case "critical":
          return "Section 11 LTA 1985 – CRITICAL breach";
        case "high":
          return "Section 11 LTA 1985 – reasonable time exceeded";
        case "medium":
          return "Section 11 LTA 1985 – monitor repair progress";
        default:
          return "Section 11 LTA 1985 – ongoing duty";
      }
    },

    buildMessage: (opts: {
      daysSinceReport?: number;
      reasonableTime?: number;
      isVulnerable?: boolean;
    }): string => {
      const parts: string[] = [];

      if (opts.daysSinceReport !== undefined && opts.reasonableTime !== undefined) {
        if (opts.daysSinceReport > opts.reasonableTime) {
          parts.push(
            `Section 11 LTA 1985 reasonable time (${opts.reasonableTime} days${opts.isVulnerable ? " for vulnerable tenant" : ""}) exceeded by ${opts.daysSinceReport - opts.reasonableTime} days.`,
          );
        } else {
          parts.push(
            `Section 11 LTA 1985 reasonable time: ${opts.reasonableTime} days${opts.isVulnerable ? " (vulnerable tenant)" : ""}. ${opts.reasonableTime - opts.daysSinceReport} days remaining.`,
          );
        }
      } else {
        parts.push(
          "Section 11 LTA 1985 imposes a duty on landlords to keep property in good repair.",
        );
      }

      parts.push(
        "This is procedural guidance only and does not constitute legal advice.",
      );

      return parts.join(" ");
    },
  },
};

