import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildKeyFactsSummary } from "@/lib/key-facts";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

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
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { orgId } = await requireAuthContext();
      const { caseId } = await params;

      const keyFacts = await buildKeyFactsSummary(caseId, orgId);

      return NextResponse.json({ keyFacts });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[key-facts] Attempt ${attempt + 1} failed:`, lastError);
      console.error(`[key-facts] Error stack:`, lastError.stack);

      // Don't retry on "Case not found" errors
      if (lastError.message === "Case not found") {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 },
        );
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  // All retries exhausted
  return NextResponse.json(
    { 
      error: "Failed to retrieve key facts",
      message: lastError?.message ?? "Unknown error",
    },
    { status: 500 },
  );
}

