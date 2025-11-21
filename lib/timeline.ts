import type { ExtractedCaseFacts, TimelineEvent } from "@/types";

type ManualEventInput = {
  date: string;
  label: string;
  description: string;
  source?: TimelineEvent["source"];
  metadata?: Record<string, unknown>;
};

export function buildTimeline(
  extracted: ExtractedCaseFacts,
  manualEvents: ManualEventInput[] = [],
): TimelineEvent[] {
  const combined = [
    ...extracted.timeline,
    ...manualEvents.map((event) => ({
      id: `manual-${event.date}-${event.label}`,
      date: event.date,
      label: event.label,
      description: event.description,
      source: event.source ?? "user",
      metadata: event.metadata,
    })),
  ];

  return combined.sort((a, b) => a.date.localeCompare(b.date));
}

