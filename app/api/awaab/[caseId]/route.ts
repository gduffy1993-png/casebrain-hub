import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateAwaabsLawStatus } from "@/lib/housing/awaabs-monitor";

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
    { data: triggerRecord },
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
    supabase
      .from("awaab_trigger")
      .select("*")
      .eq("case_id", caseId)
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
    // Calculate current status
    const status = calculateAwaabsLawStatus(housingCase, caseRecord.title);

    return NextResponse.json({
      ...status,
      lastChecked: triggerRecord?.last_checked_at ?? null,
      disclaimer:
        "This is procedural guidance only and does not constitute legal advice. All dates and deadlines should be verified by a qualified legal professional.",
    });
  } catch (error) {
    console.error("[awaab] Error fetching Awaab's Law status", { error, caseId, orgId });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch Awaab's Law status",
        disclaimer:
          "This is procedural guidance only and does not constitute legal advice.",
      },
      { status: 500 },
    );
  }
}

