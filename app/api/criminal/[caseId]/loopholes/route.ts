import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/loopholes
 * Fetch all identified loopholes and weaknesses
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: loopholes, error } = await supabase
      .from("criminal_loopholes")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("severity", { ascending: false })
      .order("success_probability", { ascending: false });

    if (error) {
      console.error("[criminal/loopholes] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch loopholes" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      loopholes: (loopholes || []).map((l) => ({
        id: l.id,
        loopholeType: l.loophole_type,
        title: l.title,
        description: l.description,
        severity: l.severity,
        exploitability: l.exploitability,
        successProbability: l.success_probability,
        suggestedAction: l.suggested_action,
        legalArgument: l.legal_argument,
      })),
    });
  } catch (error) {
    console.error("[criminal/loopholes] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loopholes" },
      { status: 500 },
    );
  }
}

