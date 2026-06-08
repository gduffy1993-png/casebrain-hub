import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { executeCustomReport } from "@/lib/reporting/custom-reports";

type RouteParams = {
  params: Promise<{ reportId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { reportId } = await params;

    const startTime = Date.now();
    const result = await executeCustomReport(reportId, orgId);
    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      executionTimeMs: executionTime,
    });
  } catch (error) {
    console.error("[Reports] Error executing report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute report" },
      { status: 500 }
    );
  }
}

