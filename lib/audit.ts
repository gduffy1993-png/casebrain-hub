/**
 * CaseBrain Audit Log System
 * 
 * Provides audit trail for all significant case events.
 * Uses Supabase for persistence.
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

export type CaseEventType =
  | "UPLOAD_STARTED"
  | "UPLOAD_COMPLETED"
  | "EXTRACTION_STARTED"
  | "EXTRACTION_COMPLETED"
  | "ANALYSIS_GENERATED"
  | "ANALYSIS_REGENERATED"
  | "SUPERVISOR_REVIEWED"
  | "OVERVIEW_PDF_EXPORTED"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_DELETED"
  | "CASE_ARCHIVED"
  | "CASE_RESTORED"
  | "CASE_DELETED"
  | "PRACTICE_AREA_UPDATED"
  | "AI_ERROR"
  | "SYSTEM_ERROR";

export type CaseAuditEvent = {
  id: string;
  caseId: string;
  eventType: CaseEventType;
  timestamp: string;
  userId?: string | null;
  meta?: Record<string, unknown>;
};

export type LogEventInput = {
  caseId: string;
  eventType: CaseEventType;
  userId?: string | null;
  meta?: Record<string, unknown>;
};

// =============================================================================
// Supabase Client (server-side)
// =============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// =============================================================================
// Audit Functions
// =============================================================================

/**
 * Log a case event to the audit trail
 */
export async function logCaseEvent(input: LogEventInput): Promise<CaseAuditEvent | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    const event: Omit<CaseAuditEvent, "id"> = {
      caseId: input.caseId,
      eventType: input.eventType,
      timestamp: new Date().toISOString(),
      userId: input.userId ?? null,
      meta: input.meta ?? {},
    };
    
    const { data, error } = await supabase
      .from("case_audit_events")
      .insert({
        case_id: event.caseId,
        event_type: event.eventType,
        timestamp: event.timestamp,
        user_id: event.userId,
        meta: event.meta,
      })
      .select("id, case_id, event_type, timestamp, user_id, meta")
      .single();
    
    if (error) {
      console.error("[audit] Failed to log event:", error);
      return null;
    }
    
    return {
      id: data.id,
      caseId: data.case_id,
      eventType: data.event_type as CaseEventType,
      timestamp: data.timestamp,
      userId: data.user_id,
      meta: data.meta as Record<string, unknown>,
    };
  } catch (err) {
    console.error("[audit] Error logging event:", err);
    return null;
  }
}

/**
 * Get all audit events for a case
 */
export async function getCaseEvents(caseId: string): Promise<CaseAuditEvent[]> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("case_audit_events")
      .select("id, case_id, event_type, timestamp, user_id, meta")
      .eq("case_id", caseId)
      .order("timestamp", { ascending: false });
    
    if (error) {
      console.error("[audit] Failed to fetch events:", error);
      return [];
    }
    
    return (data ?? []).map((row) => ({
      id: row.id,
      caseId: row.case_id,
      eventType: row.event_type as CaseEventType,
      timestamp: row.timestamp,
      userId: row.user_id,
      meta: row.meta as Record<string, unknown>,
    }));
  } catch (err) {
    console.error("[audit] Error fetching events:", err);
    return [];
  }
}

/**
 * Get recent audit events for a case (limited)
 */
export async function getRecentCaseEvents(caseId: string, limit = 10): Promise<CaseAuditEvent[]> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("case_audit_events")
      .select("id, case_id, event_type, timestamp, user_id, meta")
      .eq("case_id", caseId)
      .order("timestamp", { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("[audit] Failed to fetch recent events:", error);
      return [];
    }
    
    return (data ?? []).map((row) => ({
      id: row.id,
      caseId: row.case_id,
      eventType: row.event_type as CaseEventType,
      timestamp: row.timestamp,
      userId: row.user_id,
      meta: row.meta as Record<string, unknown>,
    }));
  } catch (err) {
    console.error("[audit] Error fetching recent events:", err);
    return [];
  }
}

/**
 * Get event type label for display
 */
export function getEventTypeLabel(eventType: CaseEventType): string {
  const labels: Record<CaseEventType, string> = {
    UPLOAD_STARTED: "Upload started",
    UPLOAD_COMPLETED: "Upload completed",
    EXTRACTION_STARTED: "Extraction started",
    EXTRACTION_COMPLETED: "Extraction completed",
    ANALYSIS_GENERATED: "Analysis generated",
    ANALYSIS_REGENERATED: "Analysis regenerated",
    SUPERVISOR_REVIEWED: "Supervisor reviewed",
    OVERVIEW_PDF_EXPORTED: "Overview PDF exported",
    DOCUMENT_VIEWED: "Document viewed",
    DOCUMENT_DELETED: "Document deleted",
    CASE_ARCHIVED: "Case archived",
    CASE_RESTORED: "Case restored",
    CASE_DELETED: "Case deleted",
    PRACTICE_AREA_UPDATED: "Practice area updated",
    AI_ERROR: "AI error",
    SYSTEM_ERROR: "System error",
  };
  return labels[eventType] ?? eventType;
}

/**
 * Format audit event for display
 */
export function formatAuditEvent(event: CaseAuditEvent): string {
  const date = new Date(event.timestamp).toLocaleString("en-GB");
  const label = getEventTypeLabel(event.eventType);
  return `${date} - ${label}`;
}

/**
 * Alias for logCaseEvent (backward compatibility)
 */
export const appendAuditLog = logCaseEvent;

