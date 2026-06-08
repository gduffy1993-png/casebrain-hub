import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createCommunicationEvent } from "@/lib/communication/history";
import { sendEmail } from "@/lib/email/smtp";

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
      .select("id, email_address, display_name")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = emailAccount?.email_address || process.env.DEFAULT_FROM_EMAIL || "noreply@casebrain.com";
    const fromName = emailAccount?.display_name || process.env.DEFAULT_FROM_NAME || "CaseBrain";

    // Actually send email via SMTP/API
    const emailResult = await sendEmail({
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      from: fromEmail,
      fromName,
      subject: subject || "(No subject)",
      text: bodyText,
      html: bodyHtml,
      attachments: attachments.length > 0 ? attachments.map((att: { filename?: string; content?: string; contentType?: string }) => ({
        filename: att.filename || "attachment",
        content: att.content || "",
        contentType: att.contentType,
      })) : undefined,
    });

    if (!emailResult.success) {
      console.error("[Email] Failed to send email:", emailResult.error);
      // Still create the record but mark as failed
    }

    // Create email record
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert({
        org_id: orgId,
        account_id: emailAccount?.id ?? null,
        message_id: emailResult.messageId || `casebrain-${Date.now()}@casebrain.com`,
        from_email: fromEmail,
        from_name: fromName,
        to_emails: to,
        cc_emails: cc,
        bcc_emails: bcc,
        subject: subject || "(No subject)",
        body_text: bodyText,
        body_html: bodyHtml,
        is_sent: emailResult.success,
        is_draft: false,
        case_id: caseId,
        auto_linked: false,
        received_at: new Date().toISOString(),
        sent_at: emailResult.success ? new Date().toISOString() : null,
        attachments_count: attachments.length,
      })
      .select("*")
      .single();

    if (emailError || !email) {
      console.error("Failed to create email record:", emailError);
      
      // Check if it's a table doesn't exist error
      if (emailError?.code === "42P01" || emailError?.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Email tables not found. Please run SQL migrations first. See SQL_MIGRATIONS_TO_RUN.md",
            migrationRequired: true 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: emailError?.message || "Failed to create email record" },
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

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        emailId: email.id,
        error: emailResult.error,
        message: "Email record created but sending failed. Check email provider configuration.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailId: email.id,
      messageId: emailResult.messageId,
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

