import { NextRequest, NextResponse } from "next/server";
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

    // Gate 2: Check for docs with empty raw text (TEXT_EMPTY)
    if (context.diagnostics.docCount > 0 && context.diagnostics.rawCharsTotal === 0) {
      console.log(`[key-facts] TEXT_EMPTY detected for caseId=${caseId}, docCount=${context.diagnostics.docCount}, docIds=${context.documents.map(d => d.id).join(",")}`);
      // Try to build minimal keyFacts from case data only (no text extraction)
      try {
        const keyFacts = await buildKeyFactsSummary(
          caseId,
          context.orgScope.orgIdResolved,
          context.case ? {
            id: context.case.id,
            title: (context.case as any).title ?? null,
            summary: (context.case as any).summary ?? null,
            practice_area: (context.case as any).practice_area ?? null,
            created_at: (context.case as any).created_at ?? new Date().toISOString(),
            org_id: (context.case as any).org_id ?? null,
          } : undefined,
        );
        // Return gated response with minimal keyFacts
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const documentsWithRawText = context.documents.filter(
          (d) => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0
        ).length;
        const { NextResponse: NextResponseImport } = await import("next/server");
        return NextResponseImport.json({
          ok: false,
          data: { keyFacts },
          banner: {
            severity: "warning",
            title: "No extractable text found",
            detail: `Documents exist (${context.diagnostics.docCount}) but no raw text extracted. This may indicate scanned PDFs or extraction failure. Check document extraction status.`,
          },
          diagnostics: {
            caseId,
            orgId: context.orgScope.orgIdResolved,
            documentCount: context.diagnostics.docCount,
            documentsWithRawText,
            rawCharsTotal: context.diagnostics.rawCharsTotal,
            jsonCharsTotal: context.diagnostics.jsonCharsTotal,
            suspectedScanned: context.diagnostics.suspectedScanned,
            textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
            traceId,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (buildError) {
        const errorMessage = buildError instanceof Error ? buildError.message : "Failed to build key facts";
        console.error(`[key-facts] buildKeyFactsSummary failed (TEXT_EMPTY) for caseId=${caseId}:`, errorMessage);
        return makeError<{ keyFacts: KeyFactsSummary }>(
          "KEYFACTS_BUILD_FAILED",
          errorMessage,
          context,
          caseId,
        );
      }
    }

    // Gate 3: Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      // Even if gated, try to generate minimal key facts from case data + extraction
      // This allows charges/defendant name to be extracted from raw_text even if text is thin
      try {
        const keyFacts = await buildKeyFactsSummary(
          caseId,
          context.orgScope.orgIdResolved,
          context.case ? {
            id: context.case.id,
            title: (context.case as any).title ?? null,
            summary: (context.case as any).summary ?? null,
            practice_area: (context.case as any).practice_area ?? null,
            // status column removed from cases table
            created_at: (context.case as any).created_at ?? new Date().toISOString(),
            org_id: (context.case as any).org_id ?? null,
          } : undefined,
        );
        // Return gated response with keyFacts in data (even if minimal)
        // This ensures client always receives keyFacts object, never "payload missing"
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const documentsWithRawText = context.documents.filter(
          (d) => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0
        ).length;
        const diagnostics = {
          caseId,
          orgId: context.orgScope.orgIdResolved,
          documentCount: context.diagnostics.docCount,
          documentsWithRawText,
          rawCharsTotal: context.diagnostics.rawCharsTotal,
          jsonCharsTotal: context.diagnostics.jsonCharsTotal,
          suspectedScanned: context.diagnostics.suspectedScanned,
          textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          traceId,
          updatedAt: new Date().toISOString(),
        };
        return NextResponse.json({
          ok: false,
          data: { keyFacts }, // Include keyFacts even when gated (minimal extraction)
          banner: {
            severity: gateResult.banner?.severity || "warning",
            title: gateResult.banner?.title || "Insufficient text extracted",
            detail: gateResult.banner?.detail,
          },
          diagnostics,
        });
      } catch (buildError) {
        // If buildKeyFactsSummary fails even for gated case, return error with diagnostics
        const errorMessage = buildError instanceof Error ? buildError.message : "Failed to build key facts";
        console.error(`[key-facts] buildKeyFactsSummary failed (gated) for caseId=${caseId}:`, errorMessage);
        return makeError<{ keyFacts: KeyFactsSummary }>(
          "KEYFACTS_BUILD_FAILED",
          errorMessage,
          context,
          caseId,
        );
      }
    }

    // Gate 4: OK - case and documents found with extractable text

    // Gate 3: OK - case and documents found with extractable text
    // Debug logging (no PII beyond IDs)
    console.log(`[key-facts] Generating Key Facts for caseId=${caseId}, orgId=${context.orgScope.orgIdResolved}, docCount=${context.diagnostics.docCount}, rawCharsTotal=${context.diagnostics.rawCharsTotal}, suspectedScanned=${context.diagnostics.suspectedScanned}, textThin=${context.diagnostics.reasonCodes.includes("TEXT_THIN")}, canGenerateAnalysis=${context.canGenerateAnalysis}`);
    
    // Pass case data from context to avoid re-querying and org_id mismatch issues
    let keyFacts: KeyFactsSummary;
    try {
      keyFacts = await buildKeyFactsSummary(
        caseId,
        context.orgScope.orgIdResolved,
        context.case ? {
          id: context.case.id,
          title: (context.case as any).title ?? null,
          summary: (context.case as any).summary ?? null,
          practice_area: (context.case as any).practice_area ?? null,
          // status column removed from cases table
          created_at: (context.case as any).created_at ?? new Date().toISOString(),
          org_id: (context.case as any).org_id ?? null,
        } : undefined,
      );
    } catch (buildError) {
      // If buildKeyFactsSummary throws, return error response with diagnostics
      const errorMessage = buildError instanceof Error ? buildError.message : "Failed to build key facts";
      console.error(`[key-facts] buildKeyFactsSummary failed for caseId=${caseId}:`, errorMessage);
      return makeError<{ keyFacts: KeyFactsSummary }>(
        "KEYFACTS_BUILD_FAILED",
        errorMessage,
        context,
        caseId,
      );
    }

    // Strict validation: if we reach here, keyFacts must exist
    if (!keyFacts) {
      console.error(`[key-facts] buildKeyFactsSummary returned null/undefined for caseId=${caseId}`);
      return makeError<{ keyFacts: KeyFactsSummary }>(
        "KEYFACTS_BUILD_FAILED",
        "Key facts builder returned empty result",
        context,
        caseId,
      );
    }

    // Return success with keyFacts in data.keyFacts
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

