import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculatePriorityScore } from "@/lib/housing/priority-meter";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { orgId } = await requireAuthContext();
  const { caseId } = params;

  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: housingCase },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!caseRecord || !housingCase) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 },
    );
  }

  try {
    const priority = await calculatePriorityScore(housingCase, caseRecord.title);
    return NextResponse.json(priority);
  } catch (error) {
    console.error("[priority-meter] Error calculating priority", { error, caseId, orgId });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate priority score" },
      { status: 500 },
    );
  }
}

