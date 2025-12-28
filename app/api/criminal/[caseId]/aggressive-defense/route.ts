/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { makeOk, makeGateFail, makeNotFound, makeError, diagnosticsFromContext, type ApiResponse } from "@/lib/api/response";
import { getAggressiveDefense } from "@/lib/criminal/get-aggressive-defense";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId } = authRes.context;

      // IMPORTANT: org_id must come from cases table, never from user/org context
      // This prevents "Case not found for your org scope" errors and 22P02 UUID format errors.
      // Production and debug routes must always use the case's real org_id from Supabase admin lookup.
      // Do NOT derive orgId from userId or use org scope fallback (solo-user_* strings).
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      // Case not found - return 404 with structured error
      if (caseError || !caseRow) {
        const fallbackContext = await buildCaseContext(caseId, { userId });
        return makeGateFail<any>(
          {
            severity: "error",
            title: "Case not found",
            detail: "Case not found in database.",
          },
          fallbackContext,
          caseId,
        );
      }

      // Validate case has org_id - return 500 with diagnostics
      if (!caseRow.org_id || caseRow.org_id.trim() === "") {
        const fallbackContext = await buildCaseContext(caseId, { userId });
        return NextResponse.json(
          {
            ok: false,
            data: null,
            banner: {
              severity: "error",
              title: "Case has no org_id",
              detail: "Case exists but has no org_id. This is a data integrity issue.",
            },
            diagnostics: {
              caseId,
              orgId: null,
              documentCount: fallbackContext.diagnostics.docCount,
              documentsWithRawText: fallbackContext.documents.filter(d => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0).length,
              rawCharsTotal: fallbackContext.diagnostics.rawCharsTotal,
              jsonCharsTotal: fallbackContext.diagnostics.jsonCharsTotal,
              suspectedScanned: fallbackContext.diagnostics.suspectedScanned,
              textThin: fallbackContext.diagnostics.reasonCodes.includes("TEXT_THIN"),
              traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              updatedAt: new Date().toISOString(),
            },
          },
          { status: 500 }
        );
      }

      // Regression guard: Validate org_id is a UUID (prevents solo-user_* strings from reaching Supabase UUID filters)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(caseRow.org_id)) {
        const fallbackContext = await buildCaseContext(caseId, { userId });
        return NextResponse.json(
          {
            ok: false,
            data: null,
            banner: {
              severity: "error",
              title: "Invalid org_id format",
              detail: `Case org_id is not a valid UUID: ${caseRow.org_id}. Expected UUID format, no fallback to solo-user_* strings. This prevents 22P02 errors.`,
            },
            diagnostics: {
              caseId,
              orgId: caseRow.org_id,
              documentCount: fallbackContext.diagnostics.docCount,
              documentsWithRawText: fallbackContext.documents.filter(d => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0).length,
              rawCharsTotal: fallbackContext.diagnostics.rawCharsTotal,
              jsonCharsTotal: fallbackContext.diagnostics.jsonCharsTotal,
              suspectedScanned: fallbackContext.diagnostics.suspectedScanned,
              textThin: fallbackContext.diagnostics.reasonCodes.includes("TEXT_THIN"),
              traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              updatedAt: new Date().toISOString(),
            },
          },
          { status: 500 }
        );
      }

      // Build case context for response formatting (will use the case's org_id)
      const context = await buildCaseContext(caseId, { userId });

      // Call the shared function with case's actual org_id (never derived from userId)
      const result = await getAggressiveDefense({
        caseId,
        orgId: caseRow.org_id, // Use case's actual org_id, not from auth context or org scope resolution
        userId, // Only used for auditing/logging
      });

      // Convert result to proper API response format
      if (!result.ok) {
        if (result.status === 404) {
          return makeNotFound<any>(context, caseId);
        }
        if (result.banner) {
          return makeGateFail<any>(result.banner, context, caseId);
        }
        if (result.errors && result.errors.length > 0) {
          return makeError<any>(
            result.errors[0].code,
            result.errors[0].message,
            context,
            caseId,
          );
        }
      }

      // Check if strategy is committed
      const { data: commitment } = await supabase
        .from("case_strategy_commitments")
        .select("id")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      // Success response - ensure diagnostics.orgId matches case's actual org_id (UUID)
      const diagnostics = diagnosticsFromContext(caseId, context);
      if (diagnostics) {
        diagnostics.orgId = caseRow.org_id; // Override with case's actual org_id (never derived from userId)
        (diagnostics as any).strategy_committed = !!commitment; // Add strategy_committed flag
      }
      return NextResponse.json({
        ok: true,
        data: {
          ...result.data,
          strategy_committed: !!commitment, // Also add to data for easy access
        },
        diagnostics: diagnostics || {
          caseId,
          orgId: caseRow.org_id,
          documentCount: context.diagnostics.docCount,
          documentsWithRawText: context.documents.filter(d => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0).length,
          rawCharsTotal: context.diagnostics.rawCharsTotal,
          jsonCharsTotal: context.diagnostics.jsonCharsTotal,
          suspectedScanned: context.diagnostics.suspectedScanned,
          textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          updatedAt: new Date().toISOString(),
          strategy_committed: !!commitment,
        },
      });
    } catch (error) {
      console.error("Failed to generate aggressive defense analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate aggressive defense analysis";
      try {
        const authRes = await requireAuthContextApi();
        if (authRes.ok) {
          const { userId } = authRes.context;
          const context = await buildCaseContext(caseId, { userId });
          return makeError<any>("AGGRESSIVE_DEFENSE_ERROR", errorMessage, context, caseId);
        }
      } catch {
        // Fallback - try to build context without auth
        try {
          // Use a fallback userId for error context
          const fallbackContext = await buildCaseContext(caseId, { userId: "error-fallback" });
          return makeError<any>("AGGRESSIVE_DEFENSE_ERROR", errorMessage, fallbackContext, caseId);
        } catch {
          // Final fallback - return minimal error
          return NextResponse.json(
            {
              ok: false,
              data: null,
              banner: {
                severity: "error",
                title: "Error",
                detail: errorMessage,
              },
              errors: [{ code: "AGGRESSIVE_DEFENSE_ERROR", message: errorMessage }],
            },
            { status: 500 }
          );
        }
      }
    }
  });
}

