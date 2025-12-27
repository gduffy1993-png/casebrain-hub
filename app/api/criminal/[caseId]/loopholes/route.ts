import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { getCachedLLMResult, setCachedLLMResult, generateDocSetHash } from "@/lib/llm/cache";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";
import { normalizeApiResponse } from "@/lib/api-response-normalizer";

/**
 * Map DefenseAngle angleType to Loophole loopholeType
 */
function mapAngleTypeToLoopholeType(angleType: string): string {
  const mapping: Record<string, string> = {
    "PACE_BREACH_EXCLUSION": "PACE_breach",
    "DISCLOSURE_FAILURE_STAY": "disclosure_failure",
    "EVIDENCE_WEAKNESS_CHALLENGE": "evidence_weakness",
    "IDENTIFICATION_CHALLENGE": "identification_issue",
    "CHAIN_OF_CUSTODY_BREAK": "chain_of_custody",
    "HEARSAY_CHALLENGE": "hearsay",
    "BAD_CHARACTER_EXCLUSION": "bad_character",
    "NO_CASE_TO_ANSWER": "procedural_error",
  };
  return mapping[angleType] || "procedural_error";
}

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
          data: {
            loopholes: [],
            documentCount: context.documents.length,
          },
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

    // FIX: Derive loopholes from strategy data instead of requiring DB table
    // Call aggressive-defense logic directly (server-side, not HTTP)
    let derivedLoopholes: Array<{
      id: string;
      loopholeType: string;
      title: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      exploitability: "low" | "medium" | "high";
      successProbability: number | null;
      suggestedAction: string | null;
      legalArgument: string | null;
    }> = [];

    // Import and call aggressive-defense logic directly (server-side)
    try {
      const { findAllDefenseAngles } = await import("@/lib/criminal/aggressive-defense-engine");
      
      // Get criminalMeta from context
      let criminalMeta = null;
      if (context.documents.length > 0 && context.documents[0].extracted_json) {
        const extractedJson = context.documents[0].extracted_json;
        if (typeof extractedJson === "object" && extractedJson !== null) {
          criminalMeta = (extractedJson as any).criminalMeta || null;
        }
      }

      // Get strategy analysis directly
      const analysis = await findAllDefenseAngles(
        criminalMeta,
        caseId,
        context.documents.map((doc) => ({
          raw_text: doc.raw_text,
          extracted_json: doc.extracted_json,
          name: doc.name,
        })),
      );

      // Derive loopholes from criticalAngles, allAngles, and recommendedStrategy
      const allAngles = [
        ...(analysis?.criticalAngles || []),
        ...(analysis?.allAngles || []),
        ...(analysis?.recommendedStrategy?.primaryAngle ? [analysis.recommendedStrategy.primaryAngle] : []),
        ...(analysis?.recommendedStrategy?.supportingAngles || []),
      ];

      // Convert defense angles to loopholes format
      derivedLoopholes = allAngles.map((angle: any, idx: number) => ({
        id: angle.id || `loophole-${angle.angleType}-${idx}`,
        loopholeType: mapAngleTypeToLoopholeType(angle.angleType),
        title: angle.title || angle.angleType,
        description: angle.whyThisMatters || angle.prosecutionWeakness || "",
        severity: (angle.severity || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        exploitability: angle.winProbability && angle.winProbability > 60 ? "high" : angle.winProbability && angle.winProbability > 40 ? "medium" : "low",
        successProbability: gate.show ? (angle.winProbability || null) : null,
        suggestedAction: angle.howToExploit || angle.specificArguments?.[0] || null,
        legalArgument: angle.legalBasis || null,
      }));
    } catch (error) {
      console.warn("[criminal/loopholes] Failed to derive from strategy, falling back to LLM:", error);
    }

    // If no derived loopholes, try LLM fallback
    if (derivedLoopholes.length === 0 && context.documents.length > 0) {
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

      derivedLoopholes = generatedLoopholes.map((l) => ({
        id: l.id,
        loopholeType: l.loopholeType,
        title: l.title,
        description: l.description,
        severity: l.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        exploitability: l.exploitability as "low" | "medium" | "high",
        successProbability: gate.show ? l.successProbability : null,
        suggestedAction: l.suggestedAction,
        legalArgument: l.legalArgument,
      }));
    }

    // Return response in normalized format: { ok: true, data: { loopholes: [...] }, diagnostics? }
    // Return empty array ONLY if no documents exist
    if (context.documents.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          probabilitiesSuppressed: !gate.show,
          suppressionReason: gate.show ? null : gate.reason,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          loopholes: [],
          documentCount: 0,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        probabilitiesSuppressed: !gate.show,
        suppressionReason: gate.show ? null : gate.reason,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
        loopholes: derivedLoopholes,
        documentCount: context.documents.length,
      },
    });
  } catch (error) {
    console.error("[criminal/loopholes] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loopholes" },
      { status: 500 },
    );
  }
}

