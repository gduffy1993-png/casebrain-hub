import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/charges
 * Fetch all charges for the case
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: charges, error } = await supabase
      .from("criminal_charges")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("charge_date", { ascending: false });

    if (error) {
      console.error("[criminal/charges] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch charges" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      charges: (charges || []).map((c) => ({
        id: c.id,
        offence: c.offence,
        section: c.section,
        chargeDate: c.charge_date,
        location: c.location,
        value: c.value,
        details: c.details,
        status: c.status,
      })),
    });
  } catch (error) {
    console.error("[criminal/charges] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch charges" },
      { status: 500 },
    );
  }
}

