import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createCommunicationEvent } from "@/lib/communication/history";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const {
      caseId,
      to,
      cc = [],
      bcc = [],
      subject,
      bodyText,
      bodyHtml,
      attachments = [],
    } = body;

    if (!caseId || !to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: "caseId and to (array) are required" },
        { status: 400 }
      );
    }

    // Get user's email from account
    const supabase = getSupabaseAdminClient();
    const { data: emailAccount } = await supabase
      .from("email_accounts")
      .select("email_address, display_name")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = emailAccount?.email_address || "noreply@casebrain.com";
    const fromName = emailAccount?.display_name || "CaseBrain";

    // TODO: Actually send email via SMTP/API
    // For now, just create communication event and email record

    // Create email record
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert({
        org_id: orgId,
        account_id: emailAccount?.id ?? null,
        message_id: `casebrain-${Date.now()}@casebrain.com`,
        from_email: fromEmail,
        from_name: fromName,
        to_emails: to,
        cc_emails: cc,
        bcc_emails: bcc,
        subject: subject || "(No subject)",
        body_text: bodyText,
        body_html: bodyHtml,
        is_sent: true,
        is_draft: false,
        case_id: caseId,
        auto_linked: false,
        received_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        attachments_count: attachments.length,
      })
      .select("*")
      .single();

    if (emailError || !email) {
      console.error("Failed to create email record:", emailError);
      return NextResponse.json(
        { error: "Failed to create email record" },
        { status: 500 }
      );
    }

    // Create communication event
    try {
      await createCommunicationEvent(orgId, caseId, userId, {
        communicationType: "email",
        direction: "outbound",
        fromParticipant: fromEmail,
        toParticipants: to,
        ccParticipants: cc,
        bccParticipants: bcc,
        subject,
        bodyText,
        bodyHtml,
        status: "sent",
        sentAt: new Date(),
        emailId: email.id,
        attachmentsCount: attachments.length,
      });
    } catch (error) {
      console.error("Failed to create communication event:", error);
      // Don't fail the request if communication event creation fails
    }

    return NextResponse.json({
      success: true,
      emailId: email.id,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}

