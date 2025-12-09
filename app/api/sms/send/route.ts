import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createCommunicationEvent } from "@/lib/communication/history";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const { caseId, to, body: messageBody, messageType = "sms" } = body;

    if (!caseId || !to || !messageBody) {
      return NextResponse.json(
        { error: "caseId, to, and body are required" },
        { status: 400 }
      );
    }

    if (!["sms", "whatsapp"].includes(messageType)) {
      return NextResponse.json(
        { error: "messageType must be 'sms' or 'whatsapp'" },
        { status: 400 }
      );
    }

    // TODO: Actually send SMS/WhatsApp via Twilio API
    // For now, just create communication event and SMS record

    const supabase = getSupabaseAdminClient();

    // Get Twilio phone number from settings (placeholder)
    const fromNumber = "+1234567890"; // Should come from org settings

    // Create SMS record
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .insert({
        org_id: orgId,
        case_id: caseId,
        to_number: to,
        from_number: fromNumber,
        body: messageBody,
        message_type: messageType,
        status: "sent", // Will be updated by webhook
        sent_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("*")
      .single();

    if (smsError || !sms) {
      console.error("Failed to create SMS record:", smsError);
      return NextResponse.json(
        { error: "Failed to create SMS record" },
        { status: 500 }
      );
    }

    // Create communication event
    try {
      await createCommunicationEvent(orgId, caseId, userId, {
        communicationType: messageType === "whatsapp" ? "whatsapp" : "sms",
        direction: "outbound",
        fromParticipant: fromNumber,
        toParticipants: [to],
        bodyText: messageBody,
        status: "sent",
        sentAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to create communication event:", error);
      // Don't fail the request if communication event creation fails
    }

    return NextResponse.json({
      success: true,
      messageId: sms.id,
      message: `${messageType.toUpperCase()} sent successfully`,
    });
  } catch (error) {
    console.error("[SMS] Error sending message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}

