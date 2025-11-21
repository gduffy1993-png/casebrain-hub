import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
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
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 },
    );
  }

  return NextResponse.json({ documents: documents ?? [] });
}

