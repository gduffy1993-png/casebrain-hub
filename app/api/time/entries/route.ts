import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  
  const body = await request.json();
  const { caseId, taskId, description, activityType, billable, startTime, endTime } = body;
  
  if (!caseId || !description || !startTime) {
    return NextResponse.json(
      { error: "caseId, description, and startTime are required" },
      { status: 400 }
    );
  }
  
  const supabase = getSupabaseAdminClient();
  
  // Verify case belongs to org
  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id, org_id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();
  
  if (!caseRecord) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 }
    );
  }
  
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      org_id: orgId,
      case_id: caseId,
      task_id: taskId || null,
      user_id: userId,
      description: description.trim(),
      activity_type: activityType || "general",
      billable: billable !== false,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    })
    .select("id, duration_minutes")
    .maybeSingle();
  
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create time entry" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ success: true, entry: data });
}

export async function GET(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId");
  const taskId = searchParams.get("taskId");
  const limit = parseInt(searchParams.get("limit") || "50");
  
  const supabase = getSupabaseAdminClient();
  
  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(limit);
  
  if (caseId) {
    query = query.eq("case_id", caseId);
  }
  
  if (taskId) {
    query = query.eq("task_id", taskId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ entries: data || [] });
}

