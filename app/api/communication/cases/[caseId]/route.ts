import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import {
  getCaseCommunicationEvents,
  getCaseCommunicationThreads,
  getCaseCommunicationSummary,
  createCommunicationEvent,
} from "@/lib/communication/history";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;
    const { searchParams } = new URL(request.url);

    const view = searchParams.get("view") ?? "events"; // 'events', 'threads', 'summary'

    if (view === "threads") {
      const threads = await getCaseCommunicationThreads(caseId, orgId);
      return NextResponse.json(threads);
    }

    if (view === "summary") {
      const summary = await getCaseCommunicationSummary(caseId, orgId);
      return NextResponse.json(summary);
    }

    const communicationType = searchParams.get("type") as
      | "email"
      | "sms"
      | "whatsapp"
      | "phone_call"
      | "letter"
      | "meeting"
      | "other"
      | undefined;
    const direction = searchParams.get("direction") as "inbound" | "outbound" | undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const events = await getCaseCommunicationEvents(caseId, orgId, {
      communicationType,
      direction,
      startDate,
      endDate,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[Communication] Error fetching communication history:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch communication history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const { caseId } = await params;
    const body = await request.json();

    const {
      communicationType,
      direction,
      fromParticipant,
      toParticipants,
      ccParticipants,
      bccParticipants,
      subject,
      bodyText,
      bodyHtml,
      status,
      sentAt,
      durationSeconds,
      emailId,
      letterId,
      callId,
      attachmentsCount,
    } = body;

    if (!communicationType || !direction || !fromParticipant || !toParticipants) {
      return NextResponse.json(
        { error: "communicationType, direction, fromParticipant, and toParticipants are required" },
        { status: 400 }
      );
    }

    const event = await createCommunicationEvent(orgId, caseId, userId, {
      communicationType,
      direction,
      fromParticipant,
      toParticipants,
      ccParticipants,
      bccParticipants,
      subject,
      bodyText,
      bodyHtml,
      status,
      sentAt: sentAt ? new Date(sentAt) : undefined,
      durationSeconds,
      emailId,
      letterId,
      callId,
      attachmentsCount,
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("[Communication] Error creating communication event:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create communication event" },
      { status: 500 }
    );
  }
}

