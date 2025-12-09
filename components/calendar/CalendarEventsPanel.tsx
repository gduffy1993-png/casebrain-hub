"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  provider: "google" | "outlook" | null;
  synced: boolean;
  syncedAt: string | null;
};

type CalendarEventsPanelProps = {
  caseId: string;
};

export function CalendarEventsPanel({ caseId }: CalendarEventsPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await fetch(`/api/calendar/cases/${caseId}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [caseId]);

  const handleAutoCreate = async () => {
    try {
      const response = await fetch(`/api/calendar/cases/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_create_from_deadlines" }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Created ${data.created} calendar events from deadlines`);
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to auto-create calendar events:", error);
      alert("Failed to create calendar events");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading calendar events...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold">Calendar Events</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAutoCreate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Deadlines
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            No calendar events yet
          </p>
          <Button size="sm" variant="outline" onClick={handleAutoCreate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Create from Deadlines
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{event.title}</span>
                    {event.synced ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Synced
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Synced
                      </Badge>
                    )}
                    {event.provider && (
                      <Badge variant="outline">{event.provider}</Badge>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(event.startTime), "dd MMM yyyy, HH:mm")}
                      {event.endTime &&
                        ` - ${format(new Date(event.endTime), "HH:mm")}`}
                    </span>
                    {event.location && <span>• {event.location}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

