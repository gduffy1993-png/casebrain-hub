import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { 
  getBundleStatus, 
  summariseBundlePhaseA,
  startFullBundleAnalysis,
  processNextBundleChunks,
} from "@/lib/bundle-navigator";
import { v4 as uuidv4 } from "uuid";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle - Get bundle status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const bundle = await getBundleStatus(caseId, orgId);

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("Failed to get bundle status:", error);
    return NextResponse.json(
      { error: "Failed to get bundle status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/bundle - Start Phase A analysis or Full analysis
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const body = await request.json();
    const { 
      bundleName, 
      textContent, 
      pageCount,
      analysisLevel = "phase_a", // "phase_a" | "full"
      textContentByPage, // For full analysis: { 1: "page 1 text", 2: "page 2 text", ... }
    } = body;

    if (!bundleName) {
      return NextResponse.json(
        { error: "bundleName is required" },
        { status: 400 },
      );
    }

    const bundleId = uuidv4();

    if (analysisLevel === "full") {
      // Start full analysis
      if (!pageCount || pageCount < 1) {
        return NextResponse.json(
          { error: "pageCount is required for full analysis" },
          { status: 400 },
        );
      }

      const bundle = await startFullBundleAnalysis(
        caseId,
        orgId,
        bundleId,
        bundleName,
        pageCount,
        textContentByPage,
      );

      // Process first batch of chunks
      const result = await processNextBundleChunks(bundleId, 3);

      return NextResponse.json({ 
        bundle: result.bundle,
        processed: result.processed,
        remaining: result.remaining,
      });
    } else {
      // Phase A quick summary
      const summary = await summariseBundlePhaseA({
        caseId,
        orgId,
        bundleId,
        bundleName,
        textContent,
        pageCount,
      });

      return NextResponse.json({ summary });
    }
  } catch (error) {
    console.error("Failed to analyze bundle:", error);
    return NextResponse.json(
      { error: "Failed to analyze bundle" },
      { status: 500 },
    );
  }
}
