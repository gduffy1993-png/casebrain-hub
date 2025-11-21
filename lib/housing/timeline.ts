"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ExtractedCaseFacts } from "@/types";

export type HousingTimelineEvent = {
  id: string;
  eventDate: Date;
  eventType:
    | "complaint"
    | "repair_attempt"
    | "no_access"
    | "landlord_response"
    | "inspection"
    | "medical_report"
    | "legal_action"
    | "other";
  title: string;
  description: string | null;
  sourceDocumentId: string | null;
  sourceType: "document" | "email" | "user" | "system";
  partiesInvolved: string[];
};

/**
 * Build structured timeline from case documents and housing-specific events
 */
export async function buildHousingTimeline(
  caseId: string,
  orgId: string,
): Promise<HousingTimelineEvent[]> {
  const supabase = getSupabaseAdminClient();

  // Get all documents for this case
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, extracted_json, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  // Get existing housing timeline events
  const { data: existingEvents } = await supabase
    .from("housing_timeline")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("event_date", { ascending: true });

  const events: HousingTimelineEvent[] = [];

  // Extract timeline from documents
  documents?.forEach((doc) => {
    const extracted = doc.extracted_json as ExtractedCaseFacts | null;
    if (extracted?.timeline) {
      extracted.timeline.forEach((event) => {
        // Map generic timeline events to housing-specific types
        const eventType = inferHousingEventType(event.label, event.description);
        events.push({
          id: event.id,
          eventDate: new Date(event.date),
          eventType,
          title: event.label,
          description: event.description,
          sourceDocumentId: doc.id,
          sourceType: event.source === "document" ? "document" : "system",
          partiesInvolved: extractParties(event.description),
        });
      });
    }
  });

  // Add existing housing timeline events
  existingEvents?.forEach((event) => {
    events.push({
      id: event.id,
      eventDate: new Date(event.event_date),
      eventType: event.event_type as HousingTimelineEvent["eventType"],
      title: event.title,
      description: event.description,
      sourceDocumentId: event.source_document_id,
      sourceType: event.source_type as HousingTimelineEvent["sourceType"],
      partiesInvolved: event.parties_involved ?? [],
    });
  });

  // Sort by date
  events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  return events;
}

/**
 * Infer housing event type from label/description
 */
function inferHousingEventType(
  label: string,
  description: string,
): HousingTimelineEvent["eventType"] {
  const text = `${label} ${description}`.toLowerCase();

  if (text.includes("complaint") || text.includes("report")) {
    return "complaint";
  }
  if (text.includes("repair") || text.includes("fix") || text.includes("work")) {
    return "repair_attempt";
  }
  if (text.includes("no access") || text.includes("unable to access")) {
    return "no_access";
  }
  if (text.includes("landlord") || text.includes("response") || text.includes("acknowledge")) {
    return "landlord_response";
  }
  if (text.includes("inspect") || text.includes("survey")) {
    return "inspection";
  }
  if (text.includes("medical") || text.includes("health") || text.includes("asthma")) {
    return "medical_report";
  }
  if (text.includes("letter before action") || text.includes("claim") || text.includes("court")) {
    return "legal_action";
  }

  return "other";
}

/**
 * Extract parties mentioned in description
 */
function extractParties(description: string): string[] {
  const parties: string[] = [];
  const text = description.toLowerCase();

  if (text.includes("tenant") || text.includes("client")) {
    parties.push("tenant");
  }
  if (text.includes("landlord")) {
    parties.push("landlord");
  }
  if (text.includes("contractor") || text.includes("tradesman")) {
    parties.push("contractor");
  }
  if (text.includes("council") || text.includes("local authority")) {
    parties.push("council");
  }

  return parties;
}

/**
 * Save timeline event to database
 */
export async function saveTimelineEvent(
  caseId: string,
  orgId: string,
  event: Omit<HousingTimelineEvent, "id">,
): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("housing_timeline")
    .insert({
      case_id: caseId,
      org_id: orgId,
      event_date: event.eventDate.toISOString().split("T")[0],
      event_type: event.eventType,
      title: event.title,
      description: event.description,
      source_document_id: event.sourceDocumentId,
      source_type: event.sourceType,
      parties_involved: event.partiesInvolved,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Failed to save timeline event");
  }

  return data.id;
}

