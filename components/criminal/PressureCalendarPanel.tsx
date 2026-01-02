"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

type Hearing = {
  id: string;
  hearingType: string;
  hearingDate: string;
  courtName: string;
  outcome: string | null;
};

type PressureCalendarPanelProps = {
  caseId: string;
};

type CalendarEvent = {
  id: string;
  type: "ptph" | "disclosure_deadline" | "plea_credit_drop" | "trial" | "other";
  title: string;
  date: string;
  urgency: "high" | "medium" | "low";
  description: string;
};

export function PressureCalendarPanel({ caseId }: PressureCalendarPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [caseId]);

  async function loadEvents() {
    try {
      setLoading(true);
      
      // Fetch hearings
      const hearingsResponse = await fetch(`/api/criminal/${caseId}/hearings`);
      const hearingsResult = await hearingsResponse.json();
      const hearings: Hearing[] = hearingsResult.hearings || [];

      // Convert hearings to calendar events
      const calendarEvents: CalendarEvent[] = hearings
        .filter(h => h.hearingDate && !h.outcome) // Only upcoming hearings
        .map(h => {
          const date = new Date(h.hearingDate);
          const now = new Date();
          const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let type: CalendarEvent["type"] = "other";
          let urgency: "high" | "medium" | "low" = "low";
          
          if (h.hearingType?.toLowerCase().includes("ptph") || h.hearingType?.toLowerCase().includes("plea")) {
            type = "ptph";
            urgency = daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low";
          } else if (h.hearingType?.toLowerCase().includes("trial")) {
            type = "trial";
            urgency = daysUntil <= 14 ? "high" : daysUntil <= 30 ? "medium" : "low";
          }

          return {
            id: h.id,
            type,
            title: h.hearingType || "Hearing",
            date: h.hearingDate,
            urgency,
            description: h.courtName ? `At ${h.courtName}` : "Court hearing",
          };
        });

      // Add placeholder events if no hearings exist
      if (calendarEvents.length === 0) {
        calendarEvents.push({
          id: "placeholder_ptph",
          type: "ptph",
          title: "PTPH (Plea and Trial Preparation Hearing)",
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          urgency: "medium",
          description: "Add PTPH date to activate calendar",
        });
      }

      // Sort by date
      calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to load pressure calendar:", error);
    } finally {
      setLoading(false);
    }
  }

  const getUrgencyBadge = (urgency: CalendarEvent["urgency"]) => {
    const config = {
      high: { color: "bg-red-500/20 text-red-600 border-red-500/30", label: "High Priority" },
      medium: { color: "bg-amber-500/20 text-amber-600 border-amber-500/30", label: "Medium Priority" },
      low: { color: "bg-blue-500/20 text-blue-600 border-blue-500/30", label: "Low Priority" },
    };
    const { color, label } = config[urgency];
    return (
      <Badge className={`${color} border text-xs`}>
        {label}
      </Badge>
    );
  };

  const getTypeIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "ptph":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "trial":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "disclosure_deadline":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days ago`;
    } else if (daysUntil === 0) {
      return "Today";
    } else if (daysUntil === 1) {
      return "Tomorrow";
    } else if (daysUntil <= 7) {
      return `In ${daysUntil} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pressure Calendar</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Key upcoming procedural moments: PTPH, disclosure deadlines, plea credit drop points.
        </p>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center border border-border/50 rounded-lg">
            No upcoming events. Add hearing dates to activate calendar.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getTypeIcon(event.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{event.title}</span>
                        {getUrgencyBadge(event.urgency)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>{formatDate(event.date)}</div>
                        <div>{event.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && events.some(e => e.id === "placeholder_ptph") && (
          <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Add PTPH date to activate calendar with accurate deadlines.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

