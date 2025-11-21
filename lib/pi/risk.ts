import { differenceInCalendarDays, isAfter } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PiCaseRecord, PiMedicalReport, PiOffer, PiHearing, PiDisbursement } from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { storeRiskFlags, notifyHighSeverityFlags } from "@/lib/risk";

export type PiRiskContext = {
  caseId: string;
  orgId: string;
  trigger?: string;
  userId?: string;
};

type PiCaseData = {
  piCase: PiCaseRecord | null;
  medicalReports: PiMedicalReport[];
  offers: PiOffer[];
  hearings: PiHearing[];
  disbursements: PiDisbursement[];
};

export type PiRiskAssessment = {
  level: "low" | "medium" | "high";
  reasons: string[];
};

export async function evaluatePiRisks(ctx: PiRiskContext) {
  if (!ctx.orgId) {
    console.warn("[pi:risk] Skipping risk evaluation without orgId", ctx);
    return;
  }

  const supabase = getSupabaseAdminClient();

  const data = await loadCaseData(supabase, ctx.caseId, ctx.orgId);
  if (!data.piCase) {
    console.warn("[pi:risk] No PI case metadata found; skipping", ctx);
    return;
  }

  const analysis = collectRiskSignals(data);

  try {
    await supabase
      .from("risk_flags")
      .delete()
      .eq("case_id", ctx.caseId)
      .eq("org_id", ctx.orgId)
      .eq("source_type", "pi_engine");
  } catch (error) {
    console.error("[pi:risk] Failed to clear previous PI risk flags", { error, ctx });
  }

  if (!analysis.signals.length) {
    return;
  }

  try {
    const flags = analysis.signals.map((signal) => ({
      org_id: ctx.orgId,
      case_id: ctx.caseId,
      source_type: "pi_engine",
      source_id: ctx.trigger ?? null,
      flag_type: signal.flagType,
      severity: signal.severity,
      description: signal.description,
      metadata: signal.metadata ?? {},
      resolved: false,
      resolved_at: null,
    }));

    const stored = await storeRiskFlags(supabase, flags);
    if (ctx.userId) {
      await notifyHighSeverityFlags(stored, ctx.userId);
    }
  } catch (error) {
    console.error("[pi:risk] Failed to store PI risk flags", { error, ctx });
  }
}

/**
 * Allows workers or UI surfaces to request a risk assessment without mutating risk flags.
 */
export async function assessPiCaseRisk(
  supabase: SupabaseClient,
  caseId: string,
  orgId: string,
): Promise<PiRiskAssessment> {
  const data = await loadCaseData(supabase, caseId, orgId);
  if (!data.piCase) {
    return { level: "low", reasons: ["PI case metadata not captured."] };
  }

  return collectRiskSignals(data).assessment;
}

async function loadCaseData(
  supabase: SupabaseClient,
  caseId: string,
  orgId: string,
): Promise<PiCaseData> {
  const [piCaseRecord, medicalReports, offers, hearings, disbursements] = await Promise.all([
    supabase.from("pi_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(),
    supabase.from("pi_medical_reports").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_offers").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_hearings").select("*").eq("case_id", caseId).eq("org_id", orgId),
    supabase.from("pi_disbursements").select("*").eq("case_id", caseId).eq("org_id", orgId),
  ]);

  return {
    piCase: piCaseRecord.data ?? null,
    medicalReports: medicalReports.data ?? [],
    offers: offers.data ?? [],
    hearings: hearings.data ?? [],
    disbursements: disbursements.data ?? [],
  };
}

type RiskSignal = {
  flagType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, unknown>;
};

function collectRiskSignals(data: PiCaseData) {
  const now = new Date();
  const signals: RiskSignal[] = [];
  const reasons: string[] = [];
  let level: PiRiskAssessment["level"] = "low";

  const escalate = (target: PiRiskAssessment["level"]) => {
    const ranking: Record<PiRiskAssessment["level"], number> = { low: 0, medium: 1, high: 2 };
    if (ranking[target] > ranking[level]) {
      level = target;
    }
  };

  const { piCase, medicalReports, offers, hearings, disbursements } = data;

  if (!piCase) {
    return {
      signals,
      assessment: { level, reasons: ["PI case metadata not captured."] },
    };
  }

  const limitationDate = piCase.limitation_date ? new Date(piCase.limitation_date) : null;
  if (!limitationDate) {
    const description = "Limitation date not recorded for this PI case. Populate via intake overview.";
    signals.push({
      flagType: "pi_limitation_missing",
      severity: "medium",
      description,
    });
    reasons.push(description);
    escalate("medium");
  } else {
    const daysUntilLimitation = differenceInCalendarDays(limitationDate, now);
    if (daysUntilLimitation < 0) {
      const description = `Limitation date (${limitationDate.toLocaleDateString(
        "en-GB",
      )}) has passed.`;
      signals.push({
        flagType: "pi_limitation_expired",
        severity: "critical",
        description,
      });
      reasons.push("Limitation has already expired.");
      escalate("high");
    } else if (daysUntilLimitation <= 30) {
      const description = `Limitation within ${daysUntilLimitation} days (${limitationDate.toLocaleDateString(
        "en-GB",
      )}). Issue proceedings if appropriate.`;
      signals.push({
        flagType: "pi_limitation_imminent",
        severity: "critical",
        description,
      });
      reasons.push("Limitation window expires within 30 days.");
      escalate("high");
    } else if (daysUntilLimitation <= 180) {
      const description = `Limitation within ${daysUntilLimitation} days. Ensure issuing plan is in place.`;
      signals.push({
        flagType: "pi_limitation_six_months",
        severity: "high",
        description,
      });
      reasons.push("Limitation within six months.");
      escalate("medium");
    }
  }

  medicalReports.forEach((report) => {
    if (!report.report_due_date || report.report_received_date) return;
    const dueDate = new Date(report.report_due_date);
    if (isAfter(now, dueDate)) {
      const description = `Medical report (${report.report_type ?? "report"}) overdue since ${dueDate.toLocaleDateString(
        "en-GB",
      )}.`;
      signals.push({
        flagType: "pi_medical_report_overdue",
        severity: "high",
        description,
        metadata: { reportId: report.id },
      });
      reasons.push("Outstanding medical evidence is overdue.");
      escalate("medium");
    }
  });

  offers.forEach((offer) => {
    if (offer.status !== "open") return;
    if (!offer.deadline_to_respond) return;
    const deadline = new Date(offer.deadline_to_respond);
    if (isAfter(now, deadline)) {
      const description = `Offer (${offer.party}) lapsed on ${deadline.toLocaleDateString(
        "en-GB",
      )}.`;
      signals.push({
        flagType: "pi_offer_overdue",
        severity: "high",
        description,
        metadata: { offerId: offer.id },
      });
      reasons.push("Settlement offer deadlines have expired without action.");
      escalate("medium");
    }
  });

  hearings.forEach((hearing) => {
    if (!hearing.date) return;
    const hearingDate = new Date(hearing.date);
    const daysUntilHearing = differenceInCalendarDays(hearingDate, now);
    if (daysUntilHearing <= 14 && daysUntilHearing >= 0) {
      const description = `Hearing (${hearing.hearing_type ?? "listing"}) in ${daysUntilHearing} days.`;
      signals.push({
        flagType: "pi_hearing_imminent",
        severity: "medium",
        description,
        metadata: { hearingId: hearing.id },
      });
      reasons.push("Hearing listed within the next two weeks.");
      escalate("medium");
    }
  });

  disbursements.forEach((entry) => {
    if (entry.paid || !entry.incurred_date) return;
    const incurred = new Date(entry.incurred_date);
    const daysOutstanding = differenceInCalendarDays(now, incurred);
    if (daysOutstanding > 90) {
      const description = `Disbursement (${entry.category ?? "expense"}) unpaid for ${daysOutstanding} days.`;
      signals.push({
        flagType: "pi_disbursement_unpaid",
        severity: "medium",
        description,
        metadata: { disbursementId: entry.id },
      });
      reasons.push("Disbursements remain unpaid for over 90 days.");
      escalate("medium");
    }
  });

  if (piCase.stage === "intake") {
    const accidentDate = piCase.accident_date ? new Date(piCase.accident_date) : null;
    if (accidentDate) {
      const monthsSinceAccident = differenceInCalendarDays(now, accidentDate) / 30;
      if (monthsSinceAccident > 3) {
        const description =
          "Case remains at intake stage for over 3 months. Review and progress protocol steps.";
        signals.push({
          flagType: "pi_stage_stalled",
          severity: "medium",
          description,
        });
        reasons.push("File has remained at intake stage for over three months.");
        escalate("medium");
      }
    }
  }

  return {
    signals,
    assessment: { level, reasons: Array.from(new Set(reasons)) },
  };
}
