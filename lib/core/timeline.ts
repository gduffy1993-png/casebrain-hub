import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase";
import type { TimelineEvent } from "@/types";

/**
 * Core Litigation Brain - Timeline/Chronology Engine
 * 
 * Builds structured litigation chronology from all evidence sources.
 * Used by all case-type modules.
 */
export type ChronologyEvent = {
  id: string;
  date: Date;
  event: string;
  source: {
    type: "document" | "email" | "user" | "system";
    documentId?: string;
    documentName?: string;
  };
  issueSignificance?: string;
  nextAction?: string;
  confidence: "high" | "medium" | "low";
};

/**
 * Build unified chronology from all case documents
 */
export async function buildChronology(
  caseId: string,
  orgId: string,
): Promise<ChronologyEvent[]> {
  const supabase = getSupabaseAdminClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, extracted_json, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  const events: ChronologyEvent[] = [];

  documents?.forEach((doc) => {
    try {
      const extracted = doc.extracted_json as
        | { timeline?: TimelineEvent[] }
        | null
        | undefined;

      if (extracted?.timeline && Array.isArray(extracted.timeline)) {
        extracted.timeline.forEach((event) => {
          try {
            // Validate event has required fields
            if (!event?.date || !event?.label) {
              return; // Skip invalid events
            }

            const eventDate = new Date(event.date);
            // Validate date is not invalid
            if (isNaN(eventDate.getTime())) {
              return; // Skip invalid dates
            }

            events.push({
              id: event.id || `event-${Date.now()}-${Math.random()}`,
              date: eventDate,
              event: event.label || "Unknown event",
              source: {
                type: event.source === "document" ? "document" : "system",
                documentId: doc.id,
                documentName: doc.name || "Unknown document",
              },
              issueSignificance: event.description || undefined,
              confidence: "high", // Can be enhanced with confidence scoring
            });
          } catch (eventError) {
            // Log but don't crash - skip this event
            console.error(`[timeline] Failed to process event from ${doc.name}:`, eventError);
          }
        });
      }
    } catch (docError) {
      // Log but don't crash - skip this document
      console.error(`[timeline] Failed to process document ${doc.name}:`, docError);
    }
  });

  // Sort chronologically
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events;
}

/**
 * Export chronology as structured table format
 */
export function exportChronologyTable(events: ChronologyEvent[]): string {
  if (!events || events.length === 0) {
    return "Date,Event,Source,Issue/Significance,Next Action\n";
  }

  try {
    const rows = events.map((event) => ({
      Date: event.date?.toLocaleDateString("en-GB") || "Unknown date",
      Event: event.event || "Unknown event",
      Source: event.source?.documentName ?? event.source?.type ?? "Unknown",
      "Issue/Significance": event.issueSignificance ?? "",
      "Next Action": event.nextAction ?? "",
    }));

    // Simple CSV format (can be enhanced to PDF/Word)
    const headers = Object.keys(rows[0] || {});
    if (headers.length === 0) {
      return "Date,Event,Source,Issue/Significance,Next Action\n";
    }

    const csv = [
      headers.join(","),
      ...rows.map((row) => 
        headers.map((h) => {
          const value = row[h as keyof typeof row] || "";
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    return csv;
  } catch (error) {
    console.error("[timeline] Failed to export chronology table:", error);
    return "Date,Event,Source,Issue/Significance,Next Action\n";
  }
}

