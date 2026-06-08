import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { stopTimer } from "@/lib/billing/time-tracking";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const { description } = body;

    const timeEntry = await stopTimer(userId, orgId, description);

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("[TimeTracking] Error stopping timer:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop timer" },
      { status: 500 }
    );
  }
}

