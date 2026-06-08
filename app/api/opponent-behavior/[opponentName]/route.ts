import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getOpponentStrategy } from "@/lib/opponent-behavior/tracker";

type RouteParams = {
  params: Promise<{ opponentName: string }>;
};

/**
 * GET /api/opponent-behavior/[opponentName]
 * Get opponent behavior profile and strategy recommendation
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { orgId } = await requireAuthContext();
    const { opponentName } = await params;
    const decodedName = decodeURIComponent(opponentName);

    const strategy = await getOpponentStrategy(orgId, decodedName);

    if (!strategy) {
      return NextResponse.json(
        { error: "Opponent profile not found or insufficient data" },
        { status: 404 }
      );
    }

    return NextResponse.json(strategy);
  } catch (error) {
    console.error("[opponent-behavior] Error fetching strategy:", error);
    return NextResponse.json(
      { error: "Failed to fetch opponent behavior strategy" },
      { status: 500 }
    );
  }
}

