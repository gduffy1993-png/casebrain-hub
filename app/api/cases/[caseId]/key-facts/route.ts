import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { caseId } = await params;

    if (!looksLikeUuid(caseId)) {
      console.warn("[key-facts] Invalid caseId format:", { caseId });
      return NextResponse.json(
        { error: "Invalid caseId (expected UUID)", caseIdUsed: caseId },
        { status: 400 },
      );
    }

    // Build canonical case context (single source of truth)
    const context = await buildCaseContext(caseId, { userId });
    const reasonCodes = context.diagnostics.reasonCodes;

    // Gate 1: Case not found
    if (!context.case || reasonCodes.includes("CASE_NOT_FOUND")) {
      console.log(`[key-facts] Gate triggered: CASE_NOT_FOUND for caseId=${caseId}`);
      const fallback: KeyFactsSummary = {
        caseId,
        practiceArea: undefined,
        stage: "other",
        fundingType: "unknown",
        keyDates: [],
        mainRisks: [],
        primaryIssues: [
          "Case not found for your org scope. Re-upload or contact support.",
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

      return NextResponse.json({
        keyFacts: fallback,
        banner: context.banner || {
          severity: "error",
          title: "Case not found",
          message: "Case not found for your org scope. Re-upload or contact support.",
        },
        diagnostics: context.diagnostics,
      }, { status: 200 });
    }

    // Gate 2: No documents
    if (reasonCodes.includes("DOCS_NONE")) {
      console.log(`[key-facts] Gate triggered: DOCS_NONE for caseId=${caseId}`);
      // Still generate Key Facts from case data, but with banner
      const keyFacts = await buildKeyFactsSummary(caseId, context.orgScope.orgIdResolved);
      
      return NextResponse.json({
        keyFacts,
        banner: context.banner || {
          type: "info",
          title: "No documents found",
          message: "No documents found for this case. Upload documents to generate full key facts.",
        },
        diagnostics: context.diagnostics,
      });
    }

    // Gate 3: Facts-first gating - if suspected scanned or text is too thin, DO NOT generate Key Facts
    // This prevents "jumble mumble" outputs when extraction is empty
    // Explicit check: NEVER generate Key Facts when rawCharsTotal is 0
    if (context.diagnostics.rawCharsTotal === 0 || reasonCodes.includes("SCANNED_SUSPECTED") || reasonCodes.includes("TEXT_THIN")) {
      console.log(`[key-facts] Gate triggered: ${reasonCodes.includes("SCANNED_SUSPECTED") ? "SCANNED_SUSPECTED" : "TEXT_THIN"} for caseId=${caseId}, rawChars=${context.diagnostics.rawCharsTotal}, jsonChars=${context.diagnostics.jsonCharsTotal}`);
      
      // Return minimal fallback - DO NOT generate Key Facts when text is too thin
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
      
      return NextResponse.json({
        keyFacts: fallback,
        banner: context.banner || {
          severity: "warning",
          title: "Insufficient text extracted",
          message: "Not enough extractable text to generate reliable key facts. Upload text-based PDFs or run OCR, then re-analyse.",
        },
        diagnostics: context.diagnostics,
      });
    }

    // Gate 4: OK - case and documents found with extractable text
    // Only proceed to generate Key Facts if context is OK
    if (!reasonCodes.includes("OK")) {
      console.warn(`[key-facts] Unexpected reasonCodes for caseId=${caseId}: [${reasonCodes.join(", ")}]`);
    }
    
    console.log(`[key-facts] Generating Key Facts for caseId=${caseId}, docCount=${context.diagnostics.docCount}, rawChars=${context.diagnostics.rawCharsTotal}`);
    const keyFacts = await buildKeyFactsSummary(caseId, context.orgScope.orgIdResolved);

    return NextResponse.json({ keyFacts });
  } catch (error) {
    const { caseId } = await params;
    const lastError = error instanceof Error ? error : new Error(String(error));
    console.error("[key-facts] Error:", lastError);

    // Build minimal context for error response
    try {
      const { userId } = await auth();
      if (userId) {
        const context = await buildCaseContext(caseId, { userId });
        return makeError<{ keyFacts: KeyFactsSummary }>(
          "KEY_FACTS_ERROR",
          lastError.message,
          context,
          caseId,
        );
      }
    } catch {
      // Fallback if we can't build context
    }

    return makeError<{ keyFacts: KeyFactsSummary }>(
      "KEY_FACTS_ERROR",
      lastError.message,
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

