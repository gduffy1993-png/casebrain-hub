/**
 * GET /api/debug/criminal/[caseId]/aggressive-defense
 * 
 * Debug endpoint to fetch aggressive-defense JSON without Clerk auth.
 * Protected by DEBUG_TOKEN query parameter.
 * 
 * Usage:
 *   GET /api/debug/criminal/[caseId]/aggressive-defense?token=YOUR_DEBUG_TOKEN
 * 
 * Returns the same JSON payload shape as /api/criminal/[caseId]/aggressive-defense
 * 
 * IMPORTANT: This route bypasses all auth/paywall checks.
 * It is protected ONLY by DEBUG_TOKEN environment variable.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAggressiveDefense } from "@/lib/criminal/get-aggressive-defense";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs"; // Explicitly set runtime to ensure it's included in build

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    
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
    
    // Get case's org_id directly from database using Supabase admin (do NOT derive from userId)
    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .single();
    
    if (caseError || !caseRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "Case not found",
        },
        { 
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Ensure case has an org_id (do NOT fallback to userId-derived org)
    if (!caseRow.org_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Case has no org_id",
        },
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Call the shared function with the case's actual org_id (never derived from userId)
    const result = await getAggressiveDefense({
      caseId,
      orgId: caseRow.org_id,
      userId: "debug-user",
    });
    
    // Return the result in the same format as the real endpoint
    return NextResponse.json(
      {
        ok: result.ok,
        data: result.data || null,
        banner: result.banner,
        diagnostics: result.diagnostics,
        errors: result.errors,
      },
      { 
        status: result.status || (result.ok ? 200 : 500),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Debug endpoint error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        ok: false,
        data: null,
        banner: {
          severity: "error",
          title: "Error",
          detail: errorMessage,
        },
        errors: [{ code: "DEBUG_ENDPOINT_ERROR", message: errorMessage }],
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

