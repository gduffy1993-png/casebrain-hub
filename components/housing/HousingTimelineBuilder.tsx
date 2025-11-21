"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Plus, Link as LinkIcon, Calendar } from "lucide-react";
import type { HousingTimelineEvent } from "@/types";

type HousingTimelineBuilderProps = {
  caseId: string;
  initialEvents?: HousingTimelineEvent[];
};

export function HousingTimelineBuilder({
  caseId,
  initialEvents = [],
}: HousingTimelineBuilderProps) {
  const [events, setEvents] = useState<HousingTimelineEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    fetchTimeline();
  }, [caseId]);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/housing/timeline/${caseId}`);
      if (!response.ok) throw new Error("Failed to load timeline");
      const data = await response.json();
      setEvents(data.timeline ?? []);
    } catch (error) {
      pushToast("Failed to load timeline.");
    }
  };

  return (
    <Card
      title="Timeline Builder"
      description="Structured chronology with source links"
      action={
        <Button variant="secondary" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      }
    >
      <div className="space-y-4">
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex gap-4 rounded-2xl border border-primary/10 bg-surface-muted/70 p-4"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-accent/50">
                        {new Date(event.event_date).toLocaleDateString("en-GB")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-accent">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="mt-1 text-xs text-accent/70">
                          {event.description}
                        </p>
                      )}
                      {event.parties_involved.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {event.parties_involved.map((party, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                            >
                              {party}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {event.source_document_id && (
                        <Button variant="secondary" size="sm" className="gap-2">
                          <LinkIcon className="h-3 w-3" />
                          Source
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-accent/50">
                    <span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
                    <span>•</span>
                    <span className="capitalize">{event.source_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-accent/60">
            <p>No timeline events yet.</p>
            <p className="mt-1">Upload documents to automatically build the timeline.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

