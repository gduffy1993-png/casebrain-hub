/**
 * Unified Communication History
 * 
 * Track all client communication (email, SMS, calls, letters) in one place
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type CommunicationEvent = {
  id: string;
  orgId: string;
  caseId: string;
  communicationType: "email" | "sms" | "whatsapp" | "phone_call" | "letter" | "meeting" | "other";
  direction: "inbound" | "outbound";
  fromParticipant: string;
  toParticipants: string[];
  ccParticipants: string[];
  bccParticipants: string[];
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  status: "draft" | "sent" | "delivered" | "read" | "failed" | "cancelled";
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  durationSeconds: number | null;
  emailId: string | null;
  letterId: string | null;
  callId: string | null;
  attachmentsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CommunicationThread = {
  id: string;
  orgId: string;
  caseId: string;
  threadSubject: string | null;
  participants: string[];
  communicationTypes: string[];
  eventCount: number;
  unreadCount: number;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create communication event
 */
export async function createCommunicationEvent(
  orgId: string,
  caseId: string,
  userId: string,
  input: {
    communicationType: CommunicationEvent["communicationType"];
    direction: "inbound" | "outbound";
    fromParticipant: string;
    toParticipants: string[];
    ccParticipants?: string[];
    bccParticipants?: string[];
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    status?: CommunicationEvent["status"];
    sentAt?: Date;
    durationSeconds?: number;
    emailId?: string;
    letterId?: string;
    callId?: string;
    attachmentsCount?: number;
  },
): Promise<CommunicationEvent> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("communication_events")
    .insert({
      org_id: orgId,
      case_id: caseId,
      communication_type: input.communicationType,
      direction: input.direction,
      from_participant: input.fromParticipant,
      to_participants: input.toParticipants,
      cc_participants: input.ccParticipants ?? [],
      bcc_participants: input.bccParticipants ?? [],
      subject: input.subject ?? null,
      body_text: input.bodyText ?? null,
      body_html: input.bodyHtml ?? null,
      status: input.status ?? "sent",
      sent_at: input.sentAt?.toISOString() ?? new Date().toISOString(),
      duration_seconds: input.durationSeconds ?? null,
      email_id: input.emailId ?? null,
      letter_id: input.letterId ?? null,
      call_id: input.callId ?? null,
      attachments_count: input.attachmentsCount ?? 0,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create communication event");
  }

  return mapCommunicationEvent(data);
}

/**
 * Get communication events for case
 */
export async function getCaseCommunicationEvents(
  caseId: string,
  orgId: string,
  filters?: {
    communicationType?: CommunicationEvent["communicationType"];
    direction?: "inbound" | "outbound";
    startDate?: Date;
    endDate?: Date;
  },
): Promise<CommunicationEvent[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("communication_events")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  if (filters?.communicationType) {
    query = query.eq("communication_type", filters.communicationType);
  }

  if (filters?.direction) {
    query = query.eq("direction", filters.direction);
  }

  if (filters?.startDate) {
    query = query.gte("sent_at", filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte("sent_at", filters.endDate.toISOString());
  }

  query = query.order("sent_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch communication events");
  }

  return (data ?? []).map(mapCommunicationEvent);
}

/**
 * Get communication threads for case
 */
export async function getCaseCommunicationThreads(
  caseId: string,
  orgId: string,
): Promise<CommunicationThread[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("communication_threads")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("last_event_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch communication threads");
  }

  return (data ?? []).map(mapCommunicationThread);
}

/**
 * Get communication summary for case
 */
export async function getCaseCommunicationSummary(
  caseId: string,
  orgId: string,
): Promise<{
  totalEvents: number;
  byType: Record<string, number>;
  byDirection: { inbound: number; outbound: number };
  unreadCount: number;
  lastCommunicationAt: Date | null;
}> {
  const supabase = getSupabaseAdminClient();

  const { data: events } = await supabase
    .from("communication_events")
    .select("communication_type, direction, status, sent_at")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  if (!events) {
    return {
      totalEvents: 0,
      byType: {},
      byDirection: { inbound: 0, outbound: 0 },
      unreadCount: 0,
      lastCommunicationAt: null,
    };
  }

  const byType: Record<string, number> = {};
  const byDirection = { inbound: 0, outbound: 0 };
  let unreadCount = 0;
  let lastCommunicationAt: Date | null = null;

  for (const event of events) {
    // Count by type
    byType[event.communication_type] = (byType[event.communication_type] || 0) + 1;

    // Count by direction
    if (event.direction === "inbound") {
      byDirection.inbound++;
    } else {
      byDirection.outbound++;
    }

    // Count unread (inbound emails/calls that are sent but not read)
    if (
      event.direction === "inbound" &&
      event.communication_type === "email" &&
      event.status === "sent"
    ) {
      unreadCount++;
    }

    // Track last communication
    if (event.sent_at) {
      const sentAt = new Date(event.sent_at);
      if (!lastCommunicationAt || sentAt > lastCommunicationAt) {
        lastCommunicationAt = sentAt;
      }
    }
  }

  return {
    totalEvents: events.length,
    byType,
    byDirection,
    unreadCount,
    lastCommunicationAt,
  };
}

/**
 * Map database row to CommunicationEvent
 */
function mapCommunicationEvent(row: any): CommunicationEvent {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    communicationType: row.communication_type,
    direction: row.direction,
    fromParticipant: row.from_participant,
    toParticipants: row.to_participants ?? [],
    ccParticipants: row.cc_participants ?? [],
    bccParticipants: row.bcc_participants ?? [],
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    status: row.status,
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
    readAt: row.read_at ? new Date(row.read_at) : null,
    durationSeconds: row.duration_seconds,
    emailId: row.email_id,
    letterId: row.letter_id,
    callId: row.call_id,
    attachmentsCount: row.attachments_count ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to CommunicationThread
 */
function mapCommunicationThread(row: any): CommunicationThread {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    threadSubject: row.thread_subject,
    participants: row.participants ?? [],
    communicationTypes: row.communication_types ?? [],
    eventCount: row.event_count ?? 0,
    unreadCount: row.unread_count ?? 0,
    lastEventAt: row.last_event_at ? new Date(row.last_event_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

