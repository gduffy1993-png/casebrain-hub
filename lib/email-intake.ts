/**
 * Email Intake Handler
 * 
 * Handles incoming emails forwarded or sent to CaseBrain.
 * Creates or updates cases, stores attachments as documents,
 * and optionally triggers AI extraction.
 */

import { getSupabaseAdminClient } from "./supabase";
import type { EmailIntakePayload, EmailIntakeResult } from "./types/casebrain";

// Regular expression to detect case references in subject or body
// Matches patterns like [CASE:ABC123], CASE-ABC123, CaseBrain:ABC123, etc.
const CASE_REF_PATTERNS = [
  /\[CASE:([A-Z0-9-]+)\]/i,
  /\[CASEBRAIN:([A-Z0-9-]+)\]/i,
  /CASE[-_:]([A-Z0-9-]+)/i,
  /REF:([A-Z0-9-]+)/i,
];

/**
 * Main email intake handler
 * 
 * Decides whether to create a new case or attach to an existing one,
 * then processes attachments and creates relevant records.
 */
export async function handleEmailIntake(
  payload: EmailIntakePayload,
  orgId: string,
  userId: string,
): Promise<EmailIntakeResult> {
  const supabase = getSupabaseAdminClient();
  const documentsCreated: string[] = [];
  const notesCreated: string[] = [];
  const tasksCreated: string[] = [];

  try {
    // 1. Try to find an existing case reference
    let caseId = payload.caseReference 
      ? await findCaseByReference(payload.caseReference, orgId)
      : null;

    // If no explicit reference, try to extract from subject/body
    if (!caseId) {
      const extractedRef = extractCaseReference(payload.subject, payload.bodyText);
      if (extractedRef) {
        caseId = await findCaseByReference(extractedRef, orgId);
      }
    }

    let createdCaseId: string | undefined;
    let updatedCaseId: string | undefined;

    if (caseId) {
      // Attach to existing case
      updatedCaseId = caseId;
    } else {
      // Create a new case
      const clientName = extractClientName(payload.from);
      const caseTitle = sanitizeTitle(payload.subject) || "New Case from Email";

      const { data: newCase, error: createError } = await supabase
        .from("cases")
        .insert({
          org_id: orgId,
          title: caseTitle,
          summary: `Case created from email intake. From: ${payload.from}. Subject: ${payload.subject}`,
          practice_area: "general",
        })
        .select("id")
        .single();

      if (createError || !newCase) {
        throw new Error("Failed to create case from email");
      }

      caseId = newCase.id;
      createdCaseId = caseId ?? undefined;

      // Create a task to review this new case
      const { data: task } = await supabase
        .from("tasks")
        .insert({
          case_id: caseId,
          org_id: orgId,
          title: "Review email intake case",
          is_complete: false,
        })
        .select("id")
        .single();

      if (task) {
        tasksCreated.push(task.id);
      }
    }

    // 2. Store email body as a case note
    if (payload.bodyText || payload.bodyHtml) {
      const noteContent = payload.bodyHtml 
        ? stripHtml(payload.bodyHtml) 
        : payload.bodyText ?? "";

      const { data: note } = await supabase
        .from("case_notes")
        .insert({
          case_id: caseId,
          created_by: userId,
          body: `📧 Email from ${payload.from}\n\nSubject: ${payload.subject}\n\n${noteContent}`,
          is_attendance: false,
        })
        .select("id")
        .single();

      if (note) {
        notesCreated.push(note.id);
      }
    }

    // 3. Process attachments
    for (const attachment of payload.attachments) {
      // Store document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          case_id: caseId,
          org_id: orgId,
          name: attachment.filename,
          type: inferDocumentType(attachment.filename, attachment.contentType),
          storage_path: attachment.urlOrStorageRef ?? `email-intake/${caseId}/${attachment.filename}`,
          uploaded_by: userId,
        })
        .select("id")
        .single();

      if (!docError && doc) {
        documentsCreated.push(doc.id);

        // TODO: Optionally trigger AI extraction on document
        // For now, we skip automatic extraction as it may be expensive
        // The user can manually trigger extraction from the UI
      }
    }

    // 4. If this is a significant email with attachments, create a review task
    if (payload.attachments.length > 0 && updatedCaseId) {
      const { data: task } = await supabase
        .from("tasks")
        .insert({
          case_id: caseId,
          org_id: orgId,
          title: `Review ${payload.attachments.length} new document(s) from email`,
          is_complete: false,
        })
        .select("id")
        .single();

      if (task) {
        tasksCreated.push(task.id);
      }
    }

    return {
      success: true,
      createdCaseId,
      updatedCaseId,
      documentsCreated,
      notesCreated,
      tasksCreated,
      message: createdCaseId
        ? `New case created with ${documentsCreated.length} document(s)`
        : `Attached ${documentsCreated.length} document(s) to existing case`,
    };
  } catch (error) {
    console.error("Email intake failed:", error);
    return {
      success: false,
      documentsCreated: [],
      notesCreated: [],
      tasksCreated: [],
      message: error instanceof Error ? error.message : "Email intake failed",
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract a case reference from subject or body text
 */
function extractCaseReference(subject: string, body?: string): string | null {
  const textToSearch = `${subject} ${body ?? ""}`;
  
  for (const pattern of CASE_REF_PATTERNS) {
    const match = textToSearch.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Find a case by reference number (could be ID or title match)
 */
async function findCaseByReference(reference: string, orgId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  
  // First try exact ID match
  const { data: byId } = await supabase
    .from("cases")
    .select("id")
    .eq("id", reference)
    .eq("org_id", orgId)
    .maybeSingle();

  if (byId) return byId.id;

  // Try partial title match
  const { data: byTitle } = await supabase
    .from("cases")
    .select("id")
    .eq("org_id", orgId)
    .ilike("title", `%${reference}%`)
    .limit(1)
    .maybeSingle();

  return byTitle?.id ?? null;
}

/**
 * Extract client name from email sender
 */
function extractClientName(from: string): string {
  // Try to extract name from "Name <email@example.com>" format
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  // Fall back to email username
  const emailMatch = from.match(/([^@]+)@/);
  if (emailMatch && emailMatch[1]) {
    return emailMatch[1].replace(/[._]/g, " ");
  }
  
  return from;
}

/**
 * Sanitize email subject for use as case title
 */
function sanitizeTitle(subject: string): string {
  return subject
    .replace(/^(RE:|FW:|FWD:)\s*/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim()
    .slice(0, 200);
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infer document type from filename and content type
 */
function inferDocumentType(filename: string, contentType: string): string {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes("medical") || lowerFilename.includes("gp")) {
    return "medical_report";
  }
  if (lowerFilename.includes("witness") || lowerFilename.includes("statement")) {
    return "witness_statement";
  }
  if (lowerFilename.includes("invoice") || lowerFilename.includes("receipt")) {
    return "invoice";
  }
  if (lowerFilename.includes("letter")) {
    return "correspondence";
  }
  if (lowerFilename.includes("photo") || contentType.startsWith("image/")) {
    return "photograph";
  }
  if (contentType === "application/pdf") {
    return "pdf_document";
  }
  
  return "other";
}

/**
 * Normalize an Outlook-style payload to standard EmailIntakePayload
 */
export function normalizeOutlookPayload(outlook: {
  messageId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  bodyPreview?: string;
  bodyText?: string;
  attachments: Array<{
    id?: string;
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
}): EmailIntakePayload {
  return {
    from: outlook.from,
    to: outlook.to,
    cc: outlook.cc,
    subject: outlook.subject,
    bodyText: outlook.bodyText ?? outlook.bodyPreview,
    attachments: outlook.attachments.map(a => ({
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      urlOrStorageRef: a.url,
    })),
    intakeSource: "outlook-addon",
  };
}

