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
 */

import { NextRequest, NextResponse } from "next/server";
import { getAggressiveDefense } from "@/lib/criminal/get-aggressive-defense";
import { getSupabaseAdminClient } from "@/lib/supabase";

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
        { status: 500 }
      );
    }
    
    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
    
    // Get orgId from case (we need it for the function)
    const supabase = getSupabaseAdminClient();
    const { data: caseData } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .maybeSingle();
    
    if (!caseData) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          banner: {
            severity: "error",
            title: "Case not found",
            detail: "Case not found",
          },
        },
        { status: 404 }
      );
    }
    
    // Call the shared function
    // Use a placeholder userId for debug (buildCaseContext requires it but we use orgId for scoping)
    const result = await getAggressiveDefense({
      caseId,
      orgId: caseData.org_id,
      userId: "debug-user", // Placeholder - buildCaseContext requires userId but we use orgId for actual scoping
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
      { status: result.status || (result.ok ? 200 : 500) }
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
      { status: 500 }
    );
  }
}

