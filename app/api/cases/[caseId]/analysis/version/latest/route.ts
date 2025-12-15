/**
 * GET /api/cases/[caseId]/analysis/version/latest
 * 
 * Returns the latest analysis version for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const supabase = getSupabaseAdminClient();

    // Verify case access
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 },
      );
    }

    // Get latest version
    const { data: version, error: versionError } = await supabase
      .from("case_analysis_versions")
      .select("version_number, summary, risk_rating, created_at, analysis_delta, missing_evidence, document_ids")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.error("[latest-version] Error:", versionError);
      return NextResponse.json(
        { error: "Failed to load version" },
        { status: 500 },
      );
    }

    // Return safe empty response when no version exists
    if (!version) {
      return NextResponse.json({
        version_number: null,
        summary: null,
        risk_rating: null,
        created_at: null,
        analysis_delta: null,
        missing_evidence: [],
        document_ids: [],
      });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error("[latest-version] Error:", error);
    return NextResponse.json(
      { error: "Failed to load version" },
      { status: 500 },
    );
  }
}

