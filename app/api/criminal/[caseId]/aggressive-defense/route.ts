/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { getAggressiveDefense } from "@/lib/criminal/get-aggressive-defense";
import { buildCaseContext } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      // Build case context for response formatting
      const context = await buildCaseContext(caseId, { userId });

      // Call the shared function
      const result = await getAggressiveDefense({
        caseId,
        orgId,
        userId,
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

      // Success response
      return makeOk(result.data, context, caseId);
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

