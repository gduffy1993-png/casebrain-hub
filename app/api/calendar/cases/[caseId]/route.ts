import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import {
  getCaseCalendarEvents,
  createCalendarEvent,
  autoCreateCalendarEventsFromDeadlines,
} from "@/lib/calendar/integration";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const events = await getCaseCalendarEvents(caseId, orgId);

    return NextResponse.json(events);
  } catch (error) {
    console.error("[Calendar] Error fetching calendar events:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const { caseId } = await params;
    const body = await request.json();

    const { action, ...eventData } = body;

    if (action === "auto_create_from_deadlines") {
      const count = await autoCreateCalendarEventsFromDeadlines(caseId, orgId, userId);
      return NextResponse.json({ created: count });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      provider,
    } = eventData;

    if (!title || !startTime) {
      return NextResponse.json(
        { error: "title and startTime are required" },
        { status: 400 }
      );
    }

    const event = await createCalendarEvent(orgId, caseId, userId, {
      title,
      description,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      location,
      provider,
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("[Calendar] Error creating calendar event:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create calendar event" },
      { status: 500 }
    );
  }
}

