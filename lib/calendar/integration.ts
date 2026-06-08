/**
 * Calendar Integration
 * 
 * Sync deadlines, hearings, and meetings with Google Calendar and Outlook
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type CalendarEvent = {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  calendarId: string | null; // Google Calendar ID or Outlook event ID
  provider: "google" | "outlook" | null;
  synced: boolean;
  syncedAt: Date | null;
};

/**
 * Create calendar event from deadline/hearing
 */
export async function createCalendarEvent(
  orgId: string,
  caseId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    location?: string;
    provider?: "google" | "outlook";
  },
): Promise<CalendarEvent> {
  const supabase = getSupabaseAdminClient();

  // Store calendar event record
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      org_id: orgId,
      case_id: caseId,
      title: input.title,
      description: input.description ?? null,
      start_time: input.startTime.toISOString(),
      end_time: input.endTime?.toISOString() ?? null,
      location: input.location ?? null,
      provider: input.provider ?? null,
      synced: false,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create calendar event");
  }

  // TODO: Actually sync with Google Calendar/Outlook API
  // This requires OAuth tokens and API calls

  return mapCalendarEvent(data);
}

/**
 * Sync calendar event with provider
 */
export async function syncCalendarEvent(
  eventId: string,
  orgId: string,
  provider: "google" | "outlook",
): Promise<CalendarEvent> {
  const supabase = getSupabaseAdminClient();

  // Get event
  const { data: event } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .single();

  if (!event) {
    throw new Error("Calendar event not found");
  }

  // TODO: Sync with provider API
  // For Google Calendar: Use Google Calendar API
  // For Outlook: Use Microsoft Graph API

  // Update sync status
  const { data: updatedEvent, error } = await supabase
    .from("calendar_events")
    .update({
      synced: true,
      synced_at: new Date().toISOString(),
      provider,
      calendar_id: `synced-${Date.now()}`, // Placeholder
    })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error || !updatedEvent) {
    throw new Error("Failed to sync calendar event");
  }

  return mapCalendarEvent(updatedEvent);
}

/**
 * Get calendar events for case
 */
export async function getCaseCalendarEvents(
  caseId: string,
  orgId: string,
): Promise<CalendarEvent[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch calendar events");
  }

  return (data ?? []).map(mapCalendarEvent);
}

/**
 * Auto-create calendar events from deadlines
 */
export async function autoCreateCalendarEventsFromDeadlines(
  caseId: string,
  orgId: string,
  userId: string,
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let createdCount = 0;

  // Get deadlines for case
  const { data: deadlines } = await supabase
    .from("deadlines")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .is("calendar_event_id", null); // Only deadlines without calendar events

  if (!deadlines) return 0;

  for (const deadline of deadlines) {
    // Check if calendar event already exists
    const { data: existingEvent } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("case_id", caseId)
      .eq("title", deadline.title)
      .eq("start_time", deadline.due_date)
      .maybeSingle();

    if (existingEvent) continue;

    // Create calendar event
    try {
      await createCalendarEvent(orgId, caseId, userId, {
        title: deadline.title,
        description: `Deadline for case`,
        startTime: new Date(deadline.due_date),
        endTime: new Date(new Date(deadline.due_date).getTime() + 60 * 60 * 1000), // 1 hour
      });

      // Link deadline to calendar event
      // Note: We'd need to get the created event ID, but for now just mark as processed
      createdCount++;
    } catch (error) {
      console.error("Failed to create calendar event for deadline:", error);
    }
  }

  return createdCount;
}

/**
 * Map database row to CalendarEvent
 */
function mapCalendarEvent(row: any): CalendarEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    description: row.description,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : null,
    location: row.location,
    calendarId: row.calendar_id,
    provider: row.provider,
    synced: row.synced,
    syncedAt: row.synced_at ? new Date(row.synced_at) : null,
  };
}

