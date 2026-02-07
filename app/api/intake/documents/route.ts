import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, name, type, created_at, extracted_json")
      .eq("org_id", orgId)
      .is("case_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[intake/documents] Supabase error:", error.message);
      return NextResponse.json({ documents: [] });
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (err) {
    console.error("[intake/documents] Error:", err);
    return NextResponse.json({ documents: [] });
  }
}

