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
      .select("version_number, summary, risk_rating, created_at, analysis_delta, missing_evidence, document_ids, move_sequence")
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
        move_sequence: null,
        has_analysis_version: false,
        analysis_mode: "none" as const,
      });
    }

    // Determine analysis mode based on document quality and extraction completeness
    // Get document count and diagnostics to determine analysis mode
    const { data: documents } = await supabase
      .from("documents")
      .select("id, raw_text, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    const docCount = documents?.length || 0;
    const rawCharsTotal = documents?.reduce((sum, d) => {
      const text = d.raw_text || "";
      const json = d.extracted_json ? JSON.stringify(d.extracted_json) : "";
      return sum + text.length + json.length;
    }, 0) || 0;

    // Check for text thin indicators (matches case-context.ts logic)
    // If gating signals indicate thin extraction, mark as "preview"
    const textThin = docCount > 0 && rawCharsTotal < 1000;
    const analysisMode: "complete" | "preview" | "none" = 
      textThin || rawCharsTotal < 1000 || docCount < 2
        ? "preview"
        : "complete";

    // Ensure missing_evidence is always an array (fail-safe)
    const safeVersion = {
      ...version,
      missing_evidence: Array.isArray(version.missing_evidence) 
        ? version.missing_evidence 
        : [],
      has_analysis_version: true,
      analysis_mode: analysisMode,
    };

    return NextResponse.json(safeVersion);
  } catch (error) {
    console.error("[latest-version] Error:", error);
    return NextResponse.json(
      { error: "Failed to load version" },
      { status: 500 },
    );
  }
}

