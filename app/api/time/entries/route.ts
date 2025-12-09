import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getTimeEntries, createManualTimeEntry } from "@/lib/billing/time-tracking";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get("caseId") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const status = searchParams.get("status") as
      | "draft"
      | "submitted"
      | "approved"
      | "billed"
      | "written_off"
      | undefined;
    const isBillable =
      searchParams.get("isBillable") === "true"
        ? true
        : searchParams.get("isBillable") === "false"
          ? false
          : undefined;
    const isBilled =
      searchParams.get("isBilled") === "true"
        ? true
        : searchParams.get("isBilled") === "false"
          ? false
          : undefined;

    const entries = await getTimeEntries(orgId, {
      caseId,
      userId,
      startDate,
      endDate,
      status,
      isBillable,
      isBilled,
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[TimeTracking] Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const {
      caseId,
      taskId,
      description,
      startTime,
      endTime,
      durationMinutes,
      isBillable,
      activityType,
      hourlyRate,
      notes,
    } = body;

    if (!description || !startTime) {
      return NextResponse.json(
        { error: "Description and startTime are required" },
        { status: 400 }
      );
    }

    const timeEntry = await createManualTimeEntry(userId, orgId, {
      caseId,
      taskId,
      description,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      durationMinutes,
      isBillable,
      activityType,
      hourlyRate,
      notes,
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("[TimeTracking] Error creating time entry:", error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}
