import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getActiveTimer } from "@/lib/billing/time-tracking";

export async function GET() {
  try {
    const { userId, orgId } = await requireAuthContext();

    const activeTimer = await getActiveTimer(userId, orgId);

    return NextResponse.json(activeTimer);
  } catch (error) {
    console.error("[TimeTracking] Error getting active timer:", error);
    return NextResponse.json(
      { error: "Failed to get active timer" },
      { status: 500 }
    );
  }
}

