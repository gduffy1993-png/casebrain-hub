import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { processNextBundleChunks, getBundleStatus } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * POST /api/cases/[caseId]/bundle/process - Continue processing bundle chunks
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const body = await request.json();
    const { bundleId, maxChunks = 3 } = body;

    if (!bundleId) {
      return NextResponse.json(
        { error: "bundleId is required" },
        { status: 400 },
      );
    }

    // Verify bundle belongs to this case
    const bundle = await getBundleStatus(caseId, orgId);
    if (!bundle || bundle.id !== bundleId) {
      return NextResponse.json(
        { error: "Bundle not found" },
        { status: 404 },
      );
    }

    // Process next batch
    const result = await processNextBundleChunks(bundleId, maxChunks);

    return NextResponse.json({
      bundle: result.bundle,
      processed: result.processed,
      remaining: result.remaining,
      isComplete: result.remaining === 0 && result.bundle.status === "completed",
    });
  } catch (error) {
    console.error("Failed to process bundle chunks:", error);
    return NextResponse.json(
      { error: "Failed to process bundle chunks" },
      { status: 500 },
    );
  }
}

