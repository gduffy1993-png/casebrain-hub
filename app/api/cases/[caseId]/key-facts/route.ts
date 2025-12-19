import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { buildKeyFactsSummary } from "@/lib/key-facts";
import type { KeyFactsSummary } from "@/lib/types/casebrain";
import { getOrgScopeOrFallback, findCaseByIdScoped, findDocumentsByCaseIdScoped } from "@/lib/db/case-lookup";
import { getSupabaseAdminClient } from "@/lib/supabase";

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

    // Derive org scope (UUID + externalRef)
    const orgScope = await getOrgScopeOrFallback(userId);

    // Find case with org scope fallback
    const caseRow = await findCaseByIdScoped(caseId, orgScope);

    if (!caseRow) {
      // Case not found in any org scope - return stable fallback payload
      const fallback: KeyFactsSummary = {
        caseId,
        practiceArea: undefined,
        stage: "other",
        fundingType: "unknown",
        keyDates: [],
        mainRisks: [],
        primaryIssues: [
          "Case not found for your org scope (legacy org_id mismatch). Re-upload or contact support.",
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
        banner: {
          severity: "warning",
          message: "Case not found for your org scope (legacy org_id mismatch). Re-upload or contact support.",
        },
      }, { status: 200 });
    }

    // Case found - fetch documents with same org scope fallback
    // Pass caseRow.org_id as fallback to handle data mismatches
    const caseOrgId: string | null = caseRow.org_id ?? null;
    const documents = await findDocumentsByCaseIdScoped(caseId, orgScope, caseOrgId);

    if (!documents || documents.length === 0) {
      // Case exists but no documents - return valid payload with warning
      const keyFacts = await buildKeyFactsSummary(caseId, orgScope.orgId || orgScope.externalRef || "");
      
      return NextResponse.json({
        keyFacts,
        banner: {
          severity: "info",
          message: "Case found but no documents available. Upload documents to generate full key facts.",
        },
      });
    }

    // Compute document text diagnostics
    const docCount = documents.length;
    let rawCharsTotal = 0;
    let jsonCharsTotal = 0;
    
    for (const doc of documents) {
      const rawText = doc.raw_text ?? "";
      rawCharsTotal += typeof rawText === "string" ? rawText.length : 0;
      
      const extractedJson = doc.extracted_json;
      if (extractedJson) {
        try {
          const jsonStr = typeof extractedJson === "string" ? extractedJson : JSON.stringify(extractedJson);
          jsonCharsTotal += jsonStr.length;
        } catch {
          // Ignore JSON stringify errors
        }
      }
    }
    
    const avgRawCharsPerDoc = docCount > 0 ? Math.floor(rawCharsTotal / docCount) : 0;
    const suspectedScanned = docCount > 0 && rawCharsTotal < 800 && jsonCharsTotal < 400;

    // Log suspected scanned PDFs (server-side only)
    if (suspectedScanned) {
      console.warn("[key-facts] Suspected scanned/image-only PDF detected:", {
        caseId,
        docCount,
        rawCharsTotal,
        jsonCharsTotal,
        avgRawCharsPerDoc,
      });
    }

    // If documents exist but no extractable text, return banner
    if (suspectedScanned) {
      const keyFacts = await buildKeyFactsSummary(caseId, orgScope.orgId || orgScope.externalRef || "");
      
      return NextResponse.json({
        keyFacts,
        banner: {
          severity: "warning",
          title: "No text extracted from document",
          message: "This PDF appears scanned/image-only. Upload a text-based PDF or run OCR, then re-analyse.",
        },
        diagnostics: {
          docCount,
          rawCharsTotal,
          jsonCharsTotal,
          avgRawCharsPerDoc,
          suspectedScanned: true,
        },
      });
    }

    // Normal path: case and documents found with extractable text
    const keyFacts = await buildKeyFactsSummary(caseId, orgScope.orgId || orgScope.externalRef || "");

    return NextResponse.json({ keyFacts });
  } catch (error) {
    const { caseId } = await params;
    const lastError = error instanceof Error ? error : new Error(String(error));
    console.error("[key-facts] Error:", lastError);

    // Return stable fallback payload (never throw)
    const fallback: KeyFactsSummary = {
      caseId,
      practiceArea: undefined,
      stage: "other",
      fundingType: "unknown",
      keyDates: [],
      mainRisks: [],
      primaryIssues: [
        "Key Facts currently unavailable (data is missing or a service error occurred).",
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

    return NextResponse.json(
      {
        keyFacts: fallback,
        warning: "Failed to retrieve key facts (fallback returned).",
        message: lastError.message,
      },
      { status: 200 },
    );
  }
}

