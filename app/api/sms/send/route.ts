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

    // Actually send SMS/WhatsApp via Twilio API
    const { sendSMS, sendWhatsApp } = await import("@/lib/sms/twilio");
    
    const supabase = getSupabaseAdminClient();

    // Get Twilio phone number from org settings or env
    const { data: orgSettings } = await supabase
      .from("organisations")
      .select("twilio_phone_number, twilio_whatsapp_number")
      .eq("id", orgId)
      .maybeSingle();

    const fromNumber = messageType === "whatsapp" 
      ? (orgSettings?.twilio_whatsapp_number || process.env.TWILIO_WHATSAPP_NUMBER)
      : (orgSettings?.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER);

    // Send the message
    const sendResult = messageType === "whatsapp"
      ? await sendWhatsApp(to, messageBody, fromNumber)
      : await sendSMS(to, messageBody, fromNumber);

    if (!sendResult.success) {
      console.error("[SMS] Failed to send message:", sendResult.error);
      // Still create the record but mark as failed
    }

    // Create SMS record
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .insert({
        org_id: orgId,
        case_id: caseId,
        to_number: to,
        from_number: fromNumber || process.env.TWILIO_PHONE_NUMBER || "unknown",
        body: messageBody,
        message_type: messageType,
        status: sendResult.success ? "sent" : "failed",
        provider_message_id: sendResult.providerMessageId,
        sent_at: sendResult.success ? new Date().toISOString() : null,
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

    if (!sendResult.success) {
      return NextResponse.json({
        success: false,
        messageId: sms.id,
        error: sendResult.error,
        message: "SMS record created but sending failed. Check Twilio configuration.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: sms.id,
      providerMessageId: sendResult.providerMessageId,
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

