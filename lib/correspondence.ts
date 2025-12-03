/**
 * Correspondence Timeline Brain
 * 
 * Builds a chronological timeline of all correspondence for a case,
 * including emails (from email intake), letters, and phone notes.
 * Analyzes opponent response patterns and identifies long gaps.
 */

import { getSupabaseAdminClient } from "./supabase";
import type {
  CorrespondenceItem,
  CorrespondenceDirection,
  CorrespondenceChannel,
  CorrespondenceParty,
  CorrespondenceTimelineSummary,
} from "./types/casebrain";

// Gap threshold for flagging long silences (in days)
const LONG_GAP_THRESHOLD_DAYS = 14;

/**
 * Deduplicate timeline items by hashing (date + description)
 * Ensures chronological consistency
 */
function deduplicateTimelineItems(items: CorrespondenceItem[]): CorrespondenceItem[] {
  const seen = new Map<string, CorrespondenceItem>();
  
  for (const item of items) {
    // Create hash from date (normalized to day) + description
    const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
    const descriptionKey = (item.subjectOrLabel ?? "").toLowerCase().trim().substring(0, 100);
    const hash = `${dateKey}|${descriptionKey}`;
    
    // Keep the first occurrence (or the one with more metadata)
    if (!seen.has(hash)) {
      seen.set(hash, item);
    } else {
      const existing = seen.get(hash)!;
      // Prefer item with more metadata (summary, attachments, etc.)
      if ((item.summary?.length ?? 0) > (existing.summary?.length ?? 0)) {
        seen.set(hash, item);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Build a correspondence timeline for a case
 */
export async function buildCorrespondenceTimeline(
  caseId: string,
  orgId: string,
): Promise<CorrespondenceTimelineSummary> {
  const supabase = getSupabaseAdminClient();
  const items: CorrespondenceItem[] = [];

  // 1. Fetch case notes (emails and phone notes)
  const { data: caseNotes } = await supabase
    .from("case_notes")
    .select("id, body, is_attendance, created_at, created_by")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  // 2. Fetch documents (letters and correspondence)
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, type, created_at, uploaded_by, extracted_json")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  // 3. Fetch letters
  const { data: letters } = await supabase
    .from("letters")
    .select("id, template_id, body, created_at, created_by")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  // Process case notes (emails from intake and phone notes)
  if (caseNotes) {
    for (const note of caseNotes) {
      const item = processNote(note, caseId);
      if (item) {
        items.push(item);
      }
    }
  }

  // Process documents (letters and other correspondence)
  if (documents) {
    for (const doc of documents) {
      const item = processDocument(doc, caseId);
      if (item) {
        items.push(item);
      }
    }
  }

  // Process drafted letters
  if (letters) {
    for (const letter of letters) {
      const item = processLetter(letter, caseId);
      items.push(item);
    }
  }

  // Deduplicate timeline events by hash (date + description)
  const deduplicatedItems = deduplicateTimelineItems(items);

  // Sort by date (chronological consistency)
  deduplicatedItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Calculate gaps between items
  calculateGaps(deduplicatedItems);

  // Find long gaps
  const longGaps = findLongGaps(deduplicatedItems);

  // Calculate opponent stats
  const opponentStats = calculateOpponentStats(deduplicatedItems);

  // Find last contact dates
  const lastClientUpdateAt = findLastClientContact(deduplicatedItems);
  const lastOpponentContactAt = findLastOpponentContact(deduplicatedItems);

  return {
    items: deduplicatedItems,
    longGaps,
    opponentAverageReplyDays: opponentStats.averageReplyDays,
    lastClientUpdateAt,
    lastOpponentContactAt,
  };
}

// =============================================================================
// Processing Functions
// =============================================================================

function processNote(
  note: { id: string; body: string; is_attendance: boolean; created_at: string },
  caseId: string,
): CorrespondenceItem | null {
  const body = note.body.toLowerCase();

  // Detect if this is an email note (from intake)
  const isEmail = body.includes("📧 email from") || body.includes("email from");
  
  // Detect phone notes
  const isPhoneNote = note.is_attendance || 
    body.includes("telephone") || 
    body.includes("phone call") ||
    body.includes("spoke with");

  if (!isEmail && !isPhoneNote) {
    // Skip generic notes
    return null;
  }

  // Determine direction and party
  const { direction, party, displayName } = inferNoteParty(note.body);

  // Extract subject or create label
  let subjectOrLabel: string;
  if (isEmail) {
    const subjectMatch = note.body.match(/Subject:\s*([^\n]+)/i);
    subjectOrLabel = subjectMatch ? subjectMatch[1].trim() : "Email";
  } else {
    subjectOrLabel = note.is_attendance ? "Attendance Note" : "Phone Call";
  }

  // Create summary (first line or truncated body)
  const summary = note.body.split("\n").find(l => l.trim().length > 10)?.slice(0, 150) ?? 
    note.body.slice(0, 150);

  return {
    id: note.id,
    caseId,
    direction,
    channel: isEmail ? "email" : "phone_note",
    party,
    displayName,
    subjectOrLabel,
    summary,
    createdAt: note.created_at,
    hasAttachment: note.body.includes("attachment"),
    isOpponentReply: party === "opponent" && direction === "inbound",
  };
}

function processDocument(
  doc: { 
    id: string; 
    name: string; 
    type?: string; 
    created_at: string;
    extracted_json?: unknown;
  },
  caseId: string,
): CorrespondenceItem | null {
  const name = doc.name.toLowerCase();
  const docType = doc.type?.toLowerCase() ?? "";

  // Only include correspondence-type documents
  const isCorrespondence = 
    docType.includes("letter") ||
    docType.includes("correspondence") ||
    docType.includes("email") ||
    name.includes("letter") ||
    name.includes("lba") || // Letter before action
    name.includes("response") ||
    name.includes("reply");

  if (!isCorrespondence) {
    return null;
  }

  // Determine direction and party
  const { direction, party, displayName } = inferDocumentParty(doc.name);

  // Extract summary from extracted_json if available
  let summary: string | undefined;
  if (doc.extracted_json && typeof doc.extracted_json === "object") {
    const extracted = doc.extracted_json as { summary?: string };
    summary = extracted.summary?.slice(0, 150);
  }

  return {
    id: doc.id,
    caseId,
    direction,
    channel: "letter",
    party,
    displayName,
    subjectOrLabel: doc.name,
    summary,
    createdAt: doc.created_at,
    hasAttachment: true, // Documents are attachments themselves
    isOpponentReply: party === "opponent" && direction === "inbound",
  };
}

function processLetter(
  letter: { id: string; template_id: string; body: string; created_at: string },
  caseId: string,
): CorrespondenceItem {
  // Drafted letters are always outbound
  const templateName = letter.template_id.replace(/_/g, " ");
  
  // Try to determine the recipient
  const party = inferLetterRecipient(letter.template_id, letter.body);

  return {
    id: letter.id,
    caseId,
    direction: "outbound",
    channel: "letter",
    party,
    displayName: getPartyDisplayName(party),
    subjectOrLabel: `Draft: ${templateName}`,
    summary: letter.body.slice(0, 150),
    createdAt: letter.created_at,
    hasAttachment: false,
    isOpponentReply: false,
  };
}

// =============================================================================
// Inference Helpers
// =============================================================================

function inferNoteParty(body: string): { 
  direction: CorrespondenceDirection; 
  party: CorrespondenceParty; 
  displayName: string;
} {
  const lowerBody = body.toLowerCase();

  // Check for email patterns
  if (lowerBody.includes("email from")) {
    // Inbound email
    if (lowerBody.includes("from client") || lowerBody.includes("from the client")) {
      return { direction: "inbound", party: "client", displayName: "Client" };
    }
    if (lowerBody.includes("from defendant") || lowerBody.includes("from opponent")) {
      return { direction: "inbound", party: "opponent", displayName: "Opponent" };
    }
    if (lowerBody.includes("from court")) {
      return { direction: "inbound", party: "court", displayName: "Court" };
    }
    // Default inbound
    return { direction: "inbound", party: "unknown", displayName: "External" };
  }

  // Check for phone notes
  if (lowerBody.includes("spoke with client") || lowerBody.includes("call with client")) {
    return { direction: "outbound", party: "client", displayName: "Client" };
  }
  if (lowerBody.includes("spoke with defendant") || lowerBody.includes("call with opponent")) {
    return { direction: "outbound", party: "opponent", displayName: "Opponent" };
  }

  // Default to internal
  return { direction: "outbound", party: "internal", displayName: "Internal" };
}

function inferDocumentParty(name: string): {
  direction: CorrespondenceDirection;
  party: CorrespondenceParty;
  displayName: string;
} {
  const lowerName = name.toLowerCase();

  // Outbound patterns
  if (lowerName.includes("lba") || lowerName.includes("letter before action")) {
    return { direction: "outbound", party: "opponent", displayName: "To Opponent" };
  }
  if (lowerName.includes("to client") || lowerName.includes("client letter")) {
    return { direction: "outbound", party: "client", displayName: "To Client" };
  }
  if (lowerName.includes("to court")) {
    return { direction: "outbound", party: "court", displayName: "To Court" };
  }

  // Inbound patterns
  if (lowerName.includes("from defendant") || lowerName.includes("opponent response")) {
    return { direction: "inbound", party: "opponent", displayName: "From Opponent" };
  }
  if (lowerName.includes("from client")) {
    return { direction: "inbound", party: "client", displayName: "From Client" };
  }
  if (lowerName.includes("from court") || lowerName.includes("court order")) {
    return { direction: "inbound", party: "court", displayName: "From Court" };
  }
  if (lowerName.includes("response") || lowerName.includes("reply")) {
    return { direction: "inbound", party: "opponent", displayName: "Response Received" };
  }

  // Default to outbound (most drafted letters are outbound)
  return { direction: "outbound", party: "unknown", displayName: "Letter" };
}

function inferLetterRecipient(templateId: string, body: string): CorrespondenceParty {
  const template = templateId.toLowerCase();
  const lowerBody = body.toLowerCase();

  if (template.includes("client") || lowerBody.includes("dear client")) {
    return "client";
  }
  if (template.includes("defendant") || template.includes("opponent") || 
      lowerBody.includes("dear sirs") || lowerBody.includes("your client")) {
    return "opponent";
  }
  if (template.includes("court") || template.includes("n1")) {
    return "court";
  }

  return "unknown";
}

function getPartyDisplayName(party: CorrespondenceParty): string {
  switch (party) {
    case "client": return "To Client";
    case "opponent": return "To Opponent";
    case "court": return "To Court";
    case "third_party": return "To Third Party";
    case "internal": return "Internal";
    default: return "Letter";
  }
}

// =============================================================================
// Gap Analysis
// =============================================================================

function calculateGaps(items: CorrespondenceItem[]): void {
  for (let i = 1; i < items.length; i++) {
    const prevDate = new Date(items[i - 1].createdAt);
    const currDate = new Date(items[i].createdAt);
    const gapDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    items[i].gapSincePreviousDays = gapDays;
  }
}

function findLongGaps(items: CorrespondenceItem[]): Array<{ fromId: string; toId: string; days: number }> {
  const longGaps: Array<{ fromId: string; toId: string; days: number }> = [];

  for (let i = 1; i < items.length; i++) {
    const gap = items[i].gapSincePreviousDays ?? 0;
    if (gap >= LONG_GAP_THRESHOLD_DAYS) {
      longGaps.push({
        fromId: items[i - 1].id,
        toId: items[i].id,
        days: gap,
      });
    }
  }

  return longGaps;
}

// =============================================================================
// Opponent Statistics
// =============================================================================

function calculateOpponentStats(items: CorrespondenceItem[]): { averageReplyDays: number | undefined } {
  // Find pairs of outbound → opponent reply
  const replyDelays: number[] = [];
  
  let lastOutboundToOpponent: CorrespondenceItem | null = null;

  for (const item of items) {
    if (item.direction === "outbound" && item.party === "opponent") {
      lastOutboundToOpponent = item;
    } else if (item.isOpponentReply && lastOutboundToOpponent) {
      const outboundDate = new Date(lastOutboundToOpponent.createdAt);
      const replyDate = new Date(item.createdAt);
      const delayDays = Math.floor((replyDate.getTime() - outboundDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (delayDays > 0 && delayDays < 365) { // Reasonable range
        replyDelays.push(delayDays);
      }
      lastOutboundToOpponent = null;
    }
  }

  if (replyDelays.length === 0) {
    return { averageReplyDays: undefined };
  }

  const average = Math.round(replyDelays.reduce((a, b) => a + b, 0) / replyDelays.length);
  return { averageReplyDays: average };
}

function findLastClientContact(items: CorrespondenceItem[]): string | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].party === "client") {
      return items[i].createdAt;
    }
  }
  return undefined;
}

function findLastOpponentContact(items: CorrespondenceItem[]): string | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].party === "opponent") {
      return items[i].createdAt;
    }
  }
  return undefined;
}

