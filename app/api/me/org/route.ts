/**
 * GET /api/me/org
 * 
 * Authenticated debug helper to check current user's org resolution vs case org.
 * Requires Clerk authentication (unlike debug token endpoints).
 * 
 * Usage:
 *   GET /api/me/org?caseId=OPTIONAL_CASE_ID
 * 
 * Returns:
 *   { 
 *     ok: true, 
 *     userId: string,
 *     authOrgId: string | null,  // From requireAuthContext
 *     orgScope: { orgId: string | null, externalRef: string | null },
 *     orgIdResolved: string | null,  // Resolved org UUID
 *     orgSource: "uuid" | "externalRef" | "none",
 *     caseOrgId?: string | null,  // If caseId provided
 *     caseOrgIdValid?: boolean,   // If caseId provided
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getOrgScopeOrFallback } from "@/lib/db/case-lookup";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Require authentication (unlike debug token endpoints)
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) {
      return authRes.response;
    }
    const { userId, orgId: authOrgId } = authRes.context;

    // Resolve org scope using the same resolver as buildCaseContext
    const orgScope = await getOrgScopeOrFallback(userId);

    // Determine org source
    let orgSource: "uuid" | "externalRef" | "none";
    if (orgScope.orgId) {
      orgSource = "uuid";
    } else if (orgScope.externalRef) {
      orgSource = "externalRef";
    } else {
      orgSource = "none";
    }

    const orgIdResolved = orgScope.orgId || null;

    // Optional: check case org_id if caseId provided
    const caseId = request.nextUrl.searchParams.get("caseId");
    let caseOrgId: string | null = null;
    let caseOrgIdValid: boolean | undefined = undefined;

    if (caseId) {
      const supabase = getSupabaseAdminClient();
      const { data: caseRow } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .maybeSingle();

      if (caseRow) {
        caseOrgId = caseRow.org_id || null;
        if (caseOrgId) {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          caseOrgIdValid = uuidPattern.test(caseOrgId);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        userId,
        authOrgId: authOrgId || null,
        orgScope: {
          orgId: orgScope.orgId,
          externalRef: orgScope.externalRef,
        },
        orgIdResolved,
        orgSource,
        ...(caseId && {
          caseId,
          caseOrgId,
          caseOrgIdValid,
          orgMatch: caseOrgId && orgIdResolved ? caseOrgId === orgIdResolved : null,
        }),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Me/org endpoint error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        ok: false,
        error: "Error",
        detail: errorMessage,
      },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

