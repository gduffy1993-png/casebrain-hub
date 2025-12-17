/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllDefenseAngles } from "@/lib/criminal/aggressive-defense-engine";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { orgId } = authRes.context;
      const { caseId } = await params;

      const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
      const gate = shouldShowProbabilities({
        practiceArea: "criminal",
        completeness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });

    // Verify case access
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord || caseRecord.practice_area !== "criminal") {
      return NextResponse.json({ error: "Case not found or not a criminal case" }, { status: 404 });
    }

    // Get criminal case data
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!criminalCase) {
      return NextResponse.json({ error: "Criminal case data not found" }, { status: 404 });
    }

    // Get extracted facts (contains criminalMeta)
    const { data: documents } = await supabase
      .from("documents")
      .select("extracted_facts")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .limit(1)
      .single();

    let criminalMeta = null;
    if (documents?.extracted_facts) {
      const facts = typeof documents.extracted_facts === "string" 
        ? JSON.parse(documents.extracted_facts) 
        : documents.extracted_facts;
      criminalMeta = facts.criminalMeta || null;
    }

    // Get aggressive defense analysis
    const analysis = await findAllDefenseAngles(criminalMeta, caseId);

    if (!gate.show) {
      return NextResponse.json({
        ...analysis,
        probabilitiesSuppressed: true,
        suppressionReason: gate.reason,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
        overallWinProbability: null,
        recommendedStrategy: analysis?.recommendedStrategy
          ? { ...analysis.recommendedStrategy, combinedProbability: null }
          : analysis?.recommendedStrategy,
        criticalAngles: (analysis?.criticalAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
        allAngles: (analysis?.allAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
      });
    }

      return NextResponse.json({
        ...analysis,
        probabilitiesSuppressed: false,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });
    } catch (error) {
      console.error("Failed to generate aggressive defense analysis:", error);
      return NextResponse.json(
        { error: "Failed to generate aggressive defense analysis" },
        { status: 500 },
      );
    }
  });
}

