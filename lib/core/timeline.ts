"use server";

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
    const extracted = doc.extracted_json as
      | { timeline?: TimelineEvent[] }
      | null
      | undefined;

    if (extracted?.timeline) {
      extracted.timeline.forEach((event) => {
        events.push({
          id: event.id,
          date: new Date(event.date),
          event: event.label,
          source: {
            type: event.source === "document" ? "document" : "system",
            documentId: doc.id,
            documentName: doc.name,
          },
          issueSignificance: event.description,
          confidence: "high", // Can be enhanced with confidence scoring
        });
      });
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
  const rows = events.map((event) => ({
    Date: event.date.toLocaleDateString("en-GB"),
    Event: event.event,
    Source: event.source.documentName ?? event.source.type,
    "Issue/Significance": event.issueSignificance ?? "",
    "Next Action": event.nextAction ?? "",
  }));

  // Simple CSV format (can be enhanced to PDF/Word)
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => `"${row[h as keyof typeof row]}"`).join(",")),
  ].join("\n");

  return csv;
}

