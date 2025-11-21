import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateHousingDeadlines } from "@/lib/housing/deadlines";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const [
    { data: housingCase },
    { data: timelineEvents },
  ] = await Promise.all([
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_timeline")
      .select("event_date, event_type")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("event_date", { ascending: true }),
  ]);

  if (!housingCase) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

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

  const deadlines = calculateHousingDeadlines(
    housingCase,
    investigationDate,
    workStartDate,
  );

  // Serialize dates to ISO strings for JSON response
  const serializedDeadlines = deadlines.map((d) => ({
    ...d,
    deadlineDate: d.deadlineDate.toISOString(),
  }));

  return NextResponse.json({ deadlines: serializedDeadlines });
}

