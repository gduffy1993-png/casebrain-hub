import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("esignature_requests")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch e-signature requests");
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[ESignature] Error fetching requests:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

