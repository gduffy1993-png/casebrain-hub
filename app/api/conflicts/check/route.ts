import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  
  const body = await request.json();
  const { entityName, entityType, caseId } = body;
  
  if (!entityName || !entityType) {
    return NextResponse.json(
      { error: "entityName and entityType required" },
      { status: 400 }
    );
  }
  
  const supabase = getSupabaseAdminClient();
  
  // Search for conflicts (case-insensitive partial match)
  const { data: conflicts, error } = await supabase
    .from("conflicts")
    .select("*")
    .eq("org_id", orgId)
    .ilike("entity_name", `%${entityName}%`)
    .eq("entity_type", entityType)
    .in("conflict_type", ["direct", "potential"])
    .is("resolved_at", null); // Only unresolved conflicts
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ conflicts: conflicts || [] });
}

