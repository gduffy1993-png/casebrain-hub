import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: cases, error } = await supabase
    .from("cases")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("is_archived", false) // Exclude archived cases
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load cases" },
      { status: 500 },
    );
  }

  return NextResponse.json({ cases: cases ?? [] });
}

