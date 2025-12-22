import { NextRequest } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildKeyFactsSummary } from "@/lib/key-facts";
import type { KeyFactsSummary } from "@/lib/types/casebrain";
import { buildCaseContext } from "@/lib/case-context";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

function looksLikeUuid(value: string): boolean {
  // Accept any UUID variant (Supabase ids are UUID strings; don't over-constrain version bits)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * GET /api/cases/[caseId]/key-facts
 * 
 * Returns a comprehensive key facts summary for a case,
 * pulling data from existing case records and brains.
 */
/**
 * GET /api/cases/[caseId]/key-facts
 * 
 * Returns a comprehensive key facts summary for a case.
 * Includes retry logic and graceful error handling.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  let caseId: string;
  try {
    const resolved = await params;
    caseId = resolved.caseId;
  } catch {
    return makeError<{ keyFacts: KeyFactsSummary }>(
      "KEY_FACTS_ERROR",
      "Invalid case ID",
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
      "",
    );
  }

  if (!looksLikeUuid(caseId)) {
    console.warn("[key-facts] Invalid caseId format:", { caseId });
    return makeError<{ keyFacts: KeyFactsSummary }>(
      "KEY_FACTS_ERROR",
      "Invalid caseId (expected UUID)",
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
      caseId,
    );
  }

  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId } = authRes.context;

    // Build canonical case context (single source of truth)
    const context = await buildCaseContext(caseId, { userId });

    // Gate 1: Case not found
    if (!context.case) {
      return makeNotFound<{ keyFacts: KeyFactsSummary }>(context, caseId);
    }

    // Gate 2: Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      // Even if gated, try to generate minimal key facts from case data + extraction
      // This allows charges/defendant name to be extracted from raw_text even if text is thin
      try {
        const keyFacts = await buildKeyFactsSummary(caseId, context.orgScope.orgIdResolved);
        return makeGateFail<{ keyFacts: KeyFactsSummary }>(
          {
            severity: gateResult.banner?.severity || "warning",
            title: gateResult.banner?.title || "Insufficient text extracted",
            detail: gateResult.banner?.detail,
          },
          context,
          caseId,
        );
      } catch (buildError) {
        // If buildKeyFactsSummary fails, return gated response with minimal fallback
        const fallback: KeyFactsSummary = {
          caseId,
          practiceArea: (context.case as any).practice_area ?? undefined,
          stage: "other",
          fundingType: "unknown",
          keyDates: [],
          mainRisks: [],
          primaryIssues: [
            "Not enough extractable text to generate reliable key facts. Upload text-based PDFs or run OCR.",
          ],
          headlineSummary: undefined,
          opponentName: undefined,
          clientName: undefined,
          courtName: undefined,
          claimType: undefined,
          causeOfAction: undefined,
          approxValue: undefined,
          whatClientWants: undefined,
          nextStepsBrief: undefined,
          bundleSummarySections: [],
          layeredSummary: null,
        };
        return makeGateFail<{ keyFacts: KeyFactsSummary }>(
          {
            severity: gateResult.banner?.severity || "warning",
            title: gateResult.banner?.title || "Insufficient text extracted",
            detail: gateResult.banner?.detail,
          },
          context,
          caseId,
        );
      }
    }

    // Gate 3: OK - case and documents found with extractable text
    console.log(`[key-facts] Generating Key Facts for caseId=${caseId}, docCount=${context.diagnostics.docCount}, rawChars=${context.diagnostics.rawCharsTotal}`);
    const keyFacts = await buildKeyFactsSummary(caseId, context.orgScope.orgIdResolved);

    return makeOk({ keyFacts }, context, caseId);
  } catch (error) {
    console.error("[key-facts] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch key facts";
    try {
      const authRes = await requireAuthContextApi();
      if (authRes.ok) {
        const { userId } = authRes.context;
        const context = await buildCaseContext(caseId, { userId });
        return makeError<{ keyFacts: KeyFactsSummary }>(
          "KEY_FACTS_ERROR",
          errorMessage,
          context,
          caseId,
        );
      }
    } catch {
      // Fallback
    }
    return makeError<{ keyFacts: KeyFactsSummary }>(
      "KEY_FACTS_ERROR",
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
      caseId,
    );
  }
}

