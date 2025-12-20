import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/loopholes
 * Fetch all identified loopholes and weaknesses
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          loopholes: [],
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const supabase = getSupabaseAdminClient();

    const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
    const gate = shouldShowProbabilities({
      practiceArea: "criminal",
      completeness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
    });

    const { data: loopholes, error } = await supabase
      .from("criminal_loopholes")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("severity", { ascending: false })
      .order("success_probability", { ascending: false });

    // Handle missing table gracefully (table may not exist yet)
    if (error) {
      const errorCode = (error as any).code;
      if (errorCode === "PGRST205" || error?.message?.includes("Could not find the table")) {
        console.warn("[criminal/loopholes] Table 'criminal_loopholes' not found, returning empty array");
        return NextResponse.json({
          probabilitiesSuppressed: !gate.show,
          suppressionReason: gate.show ? null : gate.reason,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          loopholes: [],
        });
      }
      console.error("[criminal/loopholes] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch loopholes" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      probabilitiesSuppressed: !gate.show,
      suppressionReason: gate.show ? null : gate.reason,
      bundleCompleteness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
      loopholes: (loopholes || []).map((l) => ({
        id: l.id,
        loopholeType: l.loophole_type,
        title: l.title,
        description: l.description,
        severity: l.severity,
        exploitability: l.exploitability,
        successProbability: gate.show ? l.success_probability : null,
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

