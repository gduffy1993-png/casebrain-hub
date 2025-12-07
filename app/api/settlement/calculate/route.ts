import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  
  const body = await request.json();
  const { caseId, calculationType, inputs, result } = body;
  
  if (!caseId || !calculationType || !inputs || !result) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }
  
  const supabase = getSupabaseAdminClient();
  
  const { data, error } = await supabase
    .from("settlement_calculations")
    .insert({
      org_id: orgId,
      case_id: caseId,
      calculation_type: calculationType,
      inputs,
      result,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();
  
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save calculation" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ success: true, id: data.id });
}

