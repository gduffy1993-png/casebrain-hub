import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, name, type, created_at, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[documents] Error:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    console.error("[documents] Error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

