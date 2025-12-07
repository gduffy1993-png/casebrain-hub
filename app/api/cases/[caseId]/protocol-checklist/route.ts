import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { userId, orgId } = await requireAuthContext();
  const { caseId } = await params;
  
  const body = await request.json();
  const { itemId, completed } = body;
  
  if (!itemId || typeof completed !== "boolean") {
    return NextResponse.json(
      { error: "itemId and completed are required" },
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
  
  // Store in case notes or create protocol_checklist table entry
  // For now, we'll use a simple JSON field approach
  const { data: existing } = await supabase
    .from("cases")
    .select("protocol_checklist")
    .eq("id", caseId)
    .maybeSingle();
  
  const checklist = (existing?.protocol_checklist as Record<string, boolean>) || {};
  checklist[itemId] = completed;
  
  const { error } = await supabase
    .from("cases")
    .update({ protocol_checklist: checklist })
    .eq("id", caseId);
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ success: true });
}

