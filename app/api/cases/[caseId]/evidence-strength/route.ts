import "server-only";
import { NextRequest } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { analyzeEvidenceStrength, type EvidenceStrength } from "@/lib/evidence-strength-analyzer";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { userId } = await requireAuthContext();
    const { caseId } = await params;

    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return makeNotFound<EvidenceStrength>(context, caseId);
    }

    // Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      return makeGateFail<EvidenceStrength>(
        {
          severity: gateResult.banner?.severity || "warning",
          title: gateResult.banner?.title || "Insufficient text extracted",
          detail: gateResult.banner?.detail,
        },
        context,
        caseId,
      );
    }

    const supabase = getSupabaseAdminClient();

    // Use buildCaseContext documents (same source as everything else - "One Brain")
    const documentsForAnalysis = context.documents.map((doc) => ({
      raw_text: doc.raw_text,
      extracted_facts: doc.extracted_json, // Use extracted_json as extracted_facts
      extracted_json: doc.extracted_json,
    }));

    // Get key facts
    const { data: keyFacts } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "key_facts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get aggressive defense
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get strategic overview
    const { data: strategicOverview } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Analyze evidence strength
    const evidenceStrength = analyzeEvidenceStrength({
      documents: documentsForAnalysis,
      keyFacts: keyFacts?.analysis_json,
      aggressiveDefense: aggressiveDefense?.analysis_json,
      strategicOverview: strategicOverview?.analysis_json,
    });

    // Extract key terms from debug info if available
    const keyTermsFound = evidenceStrength.debug?.keyTermsFound;

    return makeOk(evidenceStrength, context, caseId, keyTermsFound);
  } catch (error: any) {
    console.error("[evidence-strength] Error:", error);
    const errorMessage = error.message || "Failed to analyze evidence strength";
    try {
      const { userId } = await requireAuthContext();
      const { caseId } = await params;
      const context = await buildCaseContext(caseId, { userId });
      return makeError<EvidenceStrength>(
        "EVIDENCE_STRENGTH_ERROR",
        errorMessage,
        context,
        caseId,
      );
    } catch {
      const { caseId } = await params;
      return makeError<EvidenceStrength>(
        "EVIDENCE_STRENGTH_ERROR",
        errorMessage,
        {
          case: null,
          orgScope: { orgIdResolved: "", method: "solo_fallback" },
          documents: [],
          diagnostics: {
            docCount: 0,
            rawCharsTotal: 0,
            jsonCharsTotal: 0,
            avgRawCharsPerDoc: 0,
            suspectedScanned: false,
            reasonCodes: [],
          },
          canGenerateAnalysis: false,
        },
        caseId || "",
      );
    }
  }
}
