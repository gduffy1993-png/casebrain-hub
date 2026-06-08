/**
 * GET /api/criminal/[caseId]/evidence-graph
 * 
 * Returns merged evidence graph with disclosure gaps, contradictions, and readiness
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId } = authRes.context;

    // Build case context
    const context = await buildCaseContext(caseId, { userId });

    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          evidenceGraph: null,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    // Build evidence graph
    const evidenceGraph = mergeCriminalDocs(context);

    return NextResponse.json({
      ok: true,
      evidenceGraph,
    });
  } catch (error) {
    console.error("[criminal/evidence-graph] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate evidence graph" },
      { status: 500 },
    );
  }
}

