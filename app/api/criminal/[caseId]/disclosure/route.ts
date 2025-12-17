import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/disclosure
 * Fetch disclosure tracker information
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: disclosure, error } = await supabase
      .from("disclosure_tracker")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[criminal/disclosure] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch disclosure" },
        { status: 500 },
      );
    }

    if (!disclosure) {
      return NextResponse.json({
        initialDisclosureReceived: false,
        initialDisclosureDate: null,
        fullDisclosureReceived: false,
        fullDisclosureDate: null,
        missingItems: [],
        disclosureRequested: false,
        disclosureRequestDate: null,
        disclosureDeadline: null,
        lateDisclosure: false,
        incompleteDisclosure: false,
        disclosureIssues: [],
      });
    }

    return NextResponse.json({
      initialDisclosureReceived: disclosure.initial_disclosure_received ?? false,
      initialDisclosureDate: disclosure.initial_disclosure_date,
      fullDisclosureReceived: disclosure.full_disclosure_received ?? false,
      fullDisclosureDate: disclosure.full_disclosure_date,
      missingItems: disclosure.missing_items || [],
      disclosureRequested: disclosure.disclosure_requested ?? false,
      disclosureRequestDate: disclosure.disclosure_request_date,
      disclosureDeadline: disclosure.disclosure_deadline,
      lateDisclosure: disclosure.late_disclosure ?? false,
      incompleteDisclosure: disclosure.incomplete_disclosure ?? false,
      disclosureIssues: disclosure.disclosure_issues || [],
    });
  } catch (error) {
    console.error("[criminal/disclosure] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch disclosure" },
      { status: 500 },
    );
  }
}

