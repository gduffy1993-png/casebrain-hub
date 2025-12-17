import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
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
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    // Verify case access first (do not rely on criminal_* org_id types)
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError) {
      console.error("[criminal/charges] Case lookup error:", caseError);
      return NextResponse.json({ error: "Failed to fetch charges" }, { status: 500 });
    }
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch charges (prefer org_id filter if it works; fall back to case_id only)
    let charges: any[] | null = null;
    let error: any = null;

    const withOrg = await supabase
      .from("criminal_charges")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("charge_date", { ascending: false });

    if (!withOrg.error) {
      charges = withOrg.data ?? [];
    } else {
      const withoutOrg = await supabase
        .from("criminal_charges")
        .select("*")
        .eq("case_id", caseId)
        .order("charge_date", { ascending: false });
      charges = withoutOrg.data ?? [];
      error = withoutOrg.error ?? withOrg.error;
    }

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

