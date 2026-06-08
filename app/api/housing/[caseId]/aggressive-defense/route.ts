import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllHousingDefenseAngles } from "@/lib/housing/aggressive-defense-engine";
import type { HousingCaseRecord, HousingDefect } from "@/types/housing";
import { withPaywall } from "@/lib/paywall/protect-route";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { caseId } = await params;
      const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch housing case
    const { data: housingCase, error: caseError } = await supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !housingCase) {
      return NextResponse.json(
        { error: "Housing case not found" },
        { status: 404 }
      );
    }

    // Fetch defects
    const { data: defects, error: defectsError } = await supabase
      .from("housing_defects")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    if (defectsError) {
      console.error("[AggressiveDefense] Failed to fetch defects:", defectsError);
    }

    // Fetch timeline events to get dates
    const { data: timelineEvents } = await supabase
      .from("housing_timeline")
      .select("event_date, event_type")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("event_date", { ascending: true });

    // Extract key dates
    let firstComplaintDate: Date | null = null;
    let investigationDate: Date | null = null;
    let workStartDate: Date | null = null;

    if (housingCase.first_report_date) {
      firstComplaintDate = new Date(housingCase.first_report_date);
    }

    timelineEvents?.forEach((event) => {
      if (event.event_type === "inspection" && !investigationDate) {
        investigationDate = new Date(event.event_date);
      }
      if (event.event_type === "repair_attempt" && !workStartDate) {
        workStartDate = new Date(event.event_date);
      }
    });

    // Fetch letters to check for pre-action letter
    const { data: letters } = await supabase
      .from("letters")
      .select("template_id, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    const hasPreActionLetter = letters?.some(l => 
      l.template_id?.toLowerCase().includes("pre_action") ||
      l.template_id?.toLowerCase().includes("protocol")
    ) ?? false;

    // Fetch defense info (if in litigation)
    let hasDefense = false;
    let defenseFiledDate: Date | null = null;
    let defenseDeadlineDate: Date | null = null;
    let opponentLastResponseDate: Date | null = null;

    if (housingCase.stage === "litigation") {
      // Check for defense in documents or correspondence
      // For now, we'll use a simple heuristic
      // In a real implementation, you'd check actual defense documents
      const { data: documents } = await supabase
        .from("documents")
        .select("name, created_at")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .ilike("name", "%defense%");

      if (documents && documents.length > 0) {
        hasDefense = true;
        defenseFiledDate = new Date(documents[0].created_at);
        // Assume defense deadline is 28 days after claim
        if (firstComplaintDate) {
          defenseDeadlineDate = new Date(firstComplaintDate);
          defenseDeadlineDate.setDate(defenseDeadlineDate.getDate() + 28);
        }
      }

      // Get opponent's last response date from correspondence
      // For now, use last letter date as proxy
      if (letters && letters.length > 0) {
        const lastLetter = letters.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        opponentLastResponseDate = new Date(lastLetter.created_at);
      }
    }

    // Build input for aggressive defense engine
    const input = {
      caseId,
      housingCase: housingCase as HousingCaseRecord,
      defects: (defects ?? []) as HousingDefect[],
      firstComplaintDate,
      investigationDate,
      workStartDate,
      opponentLastResponseDate,
      hasPreActionLetter,
      hasDefense,
      defenseFiledDate,
      defenseDeadlineDate,
    };

    // Run aggressive defense analysis
    const analysis = await findAllHousingDefenseAngles(input);

      return NextResponse.json(analysis);
    } catch (error) {
      console.error("[AggressiveDefense] Error:", error);
      return NextResponse.json(
        { error: "Failed to generate aggressive defense analysis" },
        { status: 500 }
      );
    }
  });
}

