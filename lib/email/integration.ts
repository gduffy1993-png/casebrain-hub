/**
 * Email Integration System
 * 
 * Send/receive emails, link to cases, thread management
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type Email = {
  id: string;
  orgId: string;
  accountId: string;
  messageId: string;
  threadId: string | null;
  inReplyTo: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDraft: boolean;
  isSent: boolean;
  caseId: string | null;
  autoLinked: boolean;
  receivedAt: Date;
  sentAt: Date | null;
  labels: string[];
  attachmentsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailThread = {
  id: string;
  orgId: string;
  threadId: string;
  subject: string | null;
  participants: string[];
  caseId: string | null;
  emailCount: number;
  unreadCount: number;
  lastEmailAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Link email to case (auto-detect or manual)
 */
export async function linkEmailToCase(
  emailId: string,
  caseId: string,
  orgId: string,
  autoLinked: boolean = false,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("emails")
    .update({
      case_id: caseId,
      auto_linked: autoLinked,
    })
    .eq("id", emailId)
    .eq("org_id", orgId);

  if (error) {
    throw new Error("Failed to link email to case");
  }

  // Update thread if exists
  const { data: email } = await supabase
    .from("emails")
    .select("thread_id")
    .eq("id", emailId)
    .single();

  if (email?.thread_id) {
    await supabase
      .from("email_threads")
      .update({ case_id: caseId })
      .eq("thread_id", email.thread_id)
      .eq("org_id", orgId);
  }
}

/**
 * Get emails for case
 */
export async function getCaseEmails(
  caseId: string,
  orgId: string,
): Promise<Email[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("received_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch emails");
  }

  return (data ?? []).map(mapEmail);
}

/**
 * Get email threads for case
 */
export async function getCaseEmailThreads(
  caseId: string,
  orgId: string,
): Promise<EmailThread[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("last_email_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch email threads");
  }

  return (data ?? []).map(mapEmailThread);
}

/**
 * Mark email as read/unread
 */
export async function markEmailRead(
  emailId: string,
  orgId: string,
  isRead: boolean,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("emails")
    .update({ is_read: isRead })
    .eq("id", emailId)
    .eq("org_id", orgId);

  if (error) {
    throw new Error("Failed to update email");
  }

  // Update thread unread count
  const { data: email } = await supabase
    .from("emails")
    .select("thread_id")
    .eq("id", emailId)
    .single();

  if (email?.thread_id) {
    // Recalculate unread count
    const { data: unreadEmails } = await supabase
      .from("emails")
      .select("id")
      .eq("thread_id", email.thread_id)
      .eq("is_read", false)
      .eq("org_id", orgId);

    await supabase
      .from("email_threads")
      .update({ unread_count: unreadEmails?.length ?? 0 })
      .eq("thread_id", email.thread_id)
      .eq("org_id", orgId);
  }
}

/**
 * Auto-link emails to cases based on case reference or client name
 */
export async function autoLinkEmailsToCases(orgId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let linkedCount = 0;

  // Get unlinked emails
  const { data: unlinkedEmails } = await supabase
    .from("emails")
    .select("*")
    .eq("org_id", orgId)
    .is("case_id", null)
    .eq("is_sent", false); // Only inbound emails

  if (!unlinkedEmails) return 0;

  // Get all cases
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, summary")
    .eq("org_id", orgId);

  if (!cases) return 0;

  for (const email of unlinkedEmails) {
    // Try to match by case reference in subject/body
    const emailText = `${email.subject} ${email.body_text || ""}`.toLowerCase();

    for (const caseRecord of cases) {
      // Check for case reference pattern: [CASE:XXX] or case title
      const caseRef = `[case:${caseRecord.id.substring(0, 8)}]`;
      const caseTitle = caseRecord.title?.toLowerCase() ?? "";

      if (
        emailText.includes(caseRef) ||
        (caseTitle && emailText.includes(caseTitle))
      ) {
        await linkEmailToCase(email.id, caseRecord.id, orgId, true);
        linkedCount++;
        break;
      }
    }
  }

  return linkedCount;
}

/**
 * Map database row to Email
 */
function mapEmail(row: any): Email {
  return {
    id: row.id,
    orgId: row.org_id,
    accountId: row.account_id,
    messageId: row.message_id,
    threadId: row.thread_id,
    inReplyTo: row.in_reply_to,
    fromEmail: row.from_email,
    fromName: row.from_name,
    toEmails: row.to_emails ?? [],
    ccEmails: row.cc_emails ?? [],
    bccEmails: row.bcc_emails ?? [],
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    isRead: row.is_read,
    isStarred: row.is_starred,
    isArchived: row.is_archived,
    isDraft: row.is_draft,
    isSent: row.is_sent,
    caseId: row.case_id,
    autoLinked: row.auto_linked,
    receivedAt: new Date(row.received_at),
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    labels: row.labels ?? [],
    attachmentsCount: row.attachments_count ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to EmailThread
 */
function mapEmailThread(row: any): EmailThread {
  return {
    id: row.id,
    orgId: row.org_id,
    threadId: row.thread_id,
    subject: row.subject,
    participants: row.participants ?? [],
    caseId: row.case_id,
    emailCount: row.email_count ?? 0,
    unreadCount: row.unread_count ?? 0,
    lastEmailAt: row.last_email_at ? new Date(row.last_email_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

