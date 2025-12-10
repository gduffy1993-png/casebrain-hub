import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateClientUpdate } from "@/lib/client-expectations/manager";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/client-expectations/[caseId]/update
 * Generate proactive client update
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { caseId } = await params;

    const update = await generateClientUpdate(caseId);

    if (!update) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(update);
  } catch (error) {
    console.error("[client-expectations] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate client update" },
      { status: 500 }
    );
  }
}

