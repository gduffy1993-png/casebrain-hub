import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { getCachedLLMResult, setCachedLLMResult, generateDocSetHash } from "@/lib/llm/cache";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";

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
        console.warn("[criminal/loopholes] Table 'criminal_loopholes' not found, trying LLM fallback");
        
        // FIX: If table doesn't exist or is empty, try LLM fallback
        const { detectAllLoopholes } = await import("@/lib/criminal/loophole-detector");
        
        // Get criminalMeta from context
        let criminalMeta = null;
        if (context.documents.length > 0 && context.documents[0].extracted_json) {
          const extractedJson = context.documents[0].extracted_json;
          if (typeof extractedJson === "object" && extractedJson !== null) {
            criminalMeta = (extractedJson as any).criminalMeta || null;
          }
        }
        
        // Generate loopholes on-the-fly using LLM fallback
        const generatedLoopholes = await detectAllLoopholes(
          criminalMeta,
          context.documents.map((doc) => ({
            raw_text: doc.raw_text,
            extracted_json: doc.extracted_json,
            name: doc.name,
          })),
        );
        
        return NextResponse.json({
          probabilitiesSuppressed: !gate.show,
          suppressionReason: gate.show ? null : gate.reason,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          loopholes: generatedLoopholes.map((l) => ({
            id: l.id,
            loopholeType: l.loopholeType,
            title: l.title,
            description: l.description,
            severity: l.severity,
            exploitability: l.exploitability,
            successProbability: gate.show ? l.successProbability : null,
            suggestedAction: l.suggestedAction,
            legalArgument: l.legalArgument,
          })),
        });
      }
      console.error("[criminal/loopholes] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch loopholes" },
        { status: 500 },
      );
    }

    // FIX: If DB is empty, try LLM fallback with caching
    if (!loopholes || loopholes.length === 0) {
      const { detectAllLoopholes } = await import("@/lib/criminal/loophole-detector");
      
      // Build evidence graph
      const evidenceGraph = mergeCriminalDocs(context);
      
      // Generate cache key
      const docSetHash = generateDocSetHash(context.documents);
      const cacheKey = {
        analysisName: "loopholes",
        caseId,
        docSetHash,
        practiceArea: "criminal",
      };

      // Check cache first
      const cached = await getCachedLLMResult<Array<{ id: string; loopholeType: string; title: string; description: string; severity: string; exploitability: string; successProbability: number; suggestedAction: string | null; legalArgument: string | null }>>(orgId, cacheKey);
      
      let generatedLoopholes;
      if (cached.cached) {
        generatedLoopholes = cached.data;
      } else {
        // Get criminalMeta from context
        let criminalMeta = null;
        if (context.documents.length > 0 && context.documents[0].extracted_json) {
          const extractedJson = context.documents[0].extracted_json;
          if (typeof extractedJson === "object" && extractedJson !== null) {
            criminalMeta = (extractedJson as any).criminalMeta || null;
          }
        }
        
        // Generate loopholes on-the-fly using LLM fallback
        generatedLoopholes = await detectAllLoopholes(
          criminalMeta,
          context.documents.map((doc) => ({
            raw_text: doc.raw_text,
            extracted_json: doc.extracted_json,
            name: doc.name,
          })),
        );

        // Cache the result
        await setCachedLLMResult(orgId, caseId, cacheKey, generatedLoopholes);
      }
      
      return NextResponse.json({
        probabilitiesSuppressed: !gate.show,
        suppressionReason: gate.show ? null : gate.reason,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
        loopholes: generatedLoopholes.map((l) => ({
          id: l.id,
          loopholeType: l.loopholeType,
          title: l.title,
          description: l.description,
          severity: l.severity,
          exploitability: l.exploitability,
          successProbability: gate.show ? l.successProbability : null,
          suggestedAction: l.suggestedAction,
          legalArgument: l.legalArgument,
        })),
      });
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

