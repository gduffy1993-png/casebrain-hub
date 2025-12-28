/**
 * GET /api/debug/whoami
 * 
 * Debug endpoint to check current user's org scope resolution.
 * Protected by DEBUG_TOKEN query parameter.
 * 
 * Usage:
 *   GET /api/debug/whoami?token=YOUR_DEBUG_TOKEN
 * 
 * Returns:
 *   { ok: true, userId: string, orgId: string | null, orgSource: "uuid" | "externalRef" | "none" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrgScopeOrFallback } from "@/lib/db/case-lookup";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs"; // Explicitly set runtime

export async function GET(request: NextRequest) {
  try {
    // Check token from query params
    const token = request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.DEBUG_TOKEN;
    
    if (!expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Debug endpoint not configured" },
        { 
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { 
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get auth context (requires valid Clerk session)
    let userId: string;
    let authOrgId: string | null = null;
    try {
      const authContext = await requireAuthContext();
      userId = authContext.userId;
      authOrgId = authContext.orgId || null;
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
          detail: error instanceof Error ? error.message : "Authentication required",
        },
        { 
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

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

    return NextResponse.json(
      {
        ok: true,
        userId,
        orgId: orgScope.orgId || authOrgId || null,
        orgSource,
        orgScope: {
          orgId: orgScope.orgId,
          externalRef: orgScope.externalRef,
        },
        authOrgId, // orgId from requireAuthContext (for comparison)
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Debug whoami endpoint error:", error);
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

