import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { unifyDeadlines, calculateDeadlineRiskScore, getDeadlineNextSteps } from "@/lib/core/deadline-management";
import { calculateHousingDeadlines } from "@/lib/housing/deadlines";
import { calculateCourtDeadlines } from "@/lib/court-deadlines";
import type { UnifiedDeadline } from "@/lib/core/deadline-management";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/cases/[caseId]/deadlines
 * Fetch all deadlines for a case (unified from all sources)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch case
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area, status")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch manual deadlines from database
    const { data: manualDeadlines } = await supabase
      .from("deadlines")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .in("status", ["UPCOMING", "DUE_TODAY", "DUE_SOON", "OVERDUE"]);

    // Calculate housing deadlines if housing case
    let housingDeadlines: any[] = [];
    if (caseRecord.practice_area === "housing_disrepair") {
      const { data: housingCase } = await supabase
        .from("housing_cases")
        .select("*")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (housingCase) {
        // Get investigation/work dates from timeline
        const { data: timelineEvents } = await supabase
          .from("housing_timeline")
          .select("event_date, event_type")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("event_date", { ascending: true });

        let investigationDate: Date | null = null;
        let workStartDate: Date | null = null;

        timelineEvents?.forEach((event) => {
          if (event.event_type === "inspection" && !investigationDate) {
            investigationDate = new Date(event.event_date);
          }
          if (event.event_type === "repair_attempt" && !workStartDate) {
            workStartDate = new Date(event.event_date);
          }
        });

        housingDeadlines = calculateHousingDeadlines(
          housingCase as any,
          investigationDate,
          workStartDate,
        );
      }
    }

    // Calculate court deadlines
    const { data: piCase } = caseRecord.practice_area === "personal_injury"
      ? await supabase
          .from("pi_cases")
          .select("issued_date, served_date, aos_date, defence_date, allocation_date, disclosure_date, witness_deadline, expert_deadline, trial_date")
          .eq("id", caseId)
          .eq("org_id", orgId)
          .maybeSingle()
      : { data: null };

    const courtDeadlines = calculateCourtDeadlines({
      caseId,
      practiceArea: caseRecord.practice_area ?? "other_litigation",
      issuedDate: piCase?.issued_date,
      servedDate: piCase?.served_date,
      aosDate: piCase?.aos_date,
      defenceDate: piCase?.defence_date,
      allocationDate: piCase?.allocation_date,
      disclosureDate: piCase?.disclosure_date,
      witnessDeadline: piCase?.witness_deadline,
      expertDeadline: piCase?.expert_deadline,
      trialDate: piCase?.trial_date,
    });

    // Unify all deadlines
    const unified = unifyDeadlines(
      housingDeadlines,
      courtDeadlines,
      (manualDeadlines ?? []).map(d => ({
        id: d.id,
        caseId: d.case_id,
        title: d.title,
        dueDate: d.due_date,
        description: d.description ?? undefined,
        category: d.category ?? undefined,
      })),
    );

    // Set caseId for all deadlines
    unified.forEach(d => { d.caseId = caseId; });

    // Calculate risk score and next steps
    const riskScore = calculateDeadlineRiskScore(unified);
    const nextSteps = getDeadlineNextSteps(unified);

    return NextResponse.json({
      deadlines: unified,
      riskScore,
      nextSteps,
      summary: {
        total: unified.length,
        overdue: unified.filter(d => d.status === "OVERDUE").length,
        dueToday: unified.filter(d => d.status === "DUE_TODAY").length,
        dueSoon: unified.filter(d => d.status === "DUE_SOON").length,
        critical: unified.filter(d => d.priority === "CRITICAL").length,
      },
    });
  } catch (error) {
    console.error("[deadlines] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deadlines" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/deadlines
 * Create a new manual deadline
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { userId, orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const body = await request.json();
    const { title, description, dueDate, category, priority, notes } = body;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and dueDate are required" },
        { status: 400 },
      );
    }

    const due = new Date(dueDate);
    const now = new Date();
    const daysRemaining = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate priority and status
    const calculatedPriority = daysRemaining < 0 ? "CRITICAL" :
                               daysRemaining === 0 ? "CRITICAL" :
                               daysRemaining <= 3 ? "HIGH" :
                               daysRemaining <= 7 ? "MEDIUM" : "LOW";
    
    const status = daysRemaining < 0 ? "OVERDUE" :
                   daysRemaining === 0 ? "DUE_TODAY" :
                   daysRemaining <= 3 ? "DUE_SOON" : "UPCOMING";

    const { data: deadline, error } = await supabase
      .from("deadlines")
      .insert({
        case_id: caseId,
        org_id: orgId,
        title,
        description: description ?? null,
        category: category ?? "MANUAL",
        due_date: due.toISOString(),
        days_remaining: daysRemaining,
        priority: priority ?? calculatedPriority,
        status,
        severity: calculatedPriority,
        source: "MANUAL",
        notes: notes ?? null,
      })
      .select("*")
      .maybeSingle();

    if (error || !deadline) {
      console.error("[deadlines] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create deadline" },
        { status: 500 },
      );
    }

    return NextResponse.json({ deadline });
  } catch (error) {
    console.error("[deadlines] Error:", error);
    return NextResponse.json(
      { error: "Failed to create deadline" },
      { status: 500 },
    );
  }
}

