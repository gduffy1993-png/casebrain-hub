import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    let query = supabase
      .from("cases")
      .select("id, title, updated_at")
      .eq("org_id", orgId)
      .eq("is_archived", false);

    if (q.length > 0) {
      query = query.ilike("title", `%${q}%`);
    }
    const { data: cases, error } = await query.order(
      q.length > 0 ? "title" : "updated_at",
      { ascending: q.length > 0 }
    );

    if (error) {
      console.error("[api/cases] Supabase error:", error.message);
      return NextResponse.json({ cases: [] });
    }

    return NextResponse.json({ cases: cases ?? [] });
  } catch (err) {
    console.error("[api/cases] Error:", err);
    return NextResponse.json({ cases: [] });
  }
}

