import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { startTimer } from "@/lib/billing/time-tracking";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const { caseId, taskId, description, activityType } = body;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const timeEntry = await startTimer(userId, orgId, {
      caseId,
      taskId,
      description,
      activityType,
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("[TimeTracking] Error starting timer:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start timer" },
      { status: 500 }
    );
  }
}

