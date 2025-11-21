import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { exportHandoverPack } from "@/lib/core/handover";

export const runtime = "nodejs";

/**
 * Core Litigation Brain - Handover Pack Export API
 * 
 * Generates structured case brain export for fee-earner/counsel handovers.
 */
export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const format = new URL(request.url).searchParams.get("format") || "json";

  try {
    const pack = await exportHandoverPack(
      caseId,
      orgId,
      format === "markdown" ? "markdown" : "json",
    );

    return new NextResponse(pack, {
      status: 200,
      headers: {
        "Content-Type":
          format === "markdown" ? "text/markdown" : "application/json",
        "Content-Disposition": `attachment; filename="handover_${caseId}.${format === "markdown" ? "md" : "json"}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate handover pack",
      },
      { status: 500 },
    );
  }
}

