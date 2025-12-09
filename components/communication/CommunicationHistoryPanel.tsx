"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Calendar,
  Filter,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { format } from "date-fns";

type CommunicationEvent = {
  id: string;
  communicationType: string;
  direction: "inbound" | "outbound";
  fromParticipant: string;
  toParticipants: string[];
  subject: string | null;
  status: string;
  sentAt: string | null;
  durationSeconds: number | null;
  attachmentsCount: number;
};

type CommunicationSummary = {
  totalEvents: number;
  byType: Record<string, number>;
  byDirection: { inbound: number; outbound: number };
  unreadCount: number;
  lastCommunicationAt: string | null;
};

type CommunicationHistoryPanelProps = {
  caseId: string;
};

export function CommunicationHistoryPanel({ caseId }: CommunicationHistoryPanelProps) {
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [summary, setSummary] = useState<CommunicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type?: string;
    direction?: "inbound" | "outbound";
  }>({});

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch summary
        const summaryResponse = await fetch(
          `/api/communication/cases/${caseId}?view=summary`
        );
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        }

        // Fetch events
        const params = new URLSearchParams();
        if (filter.type) params.set("type", filter.type);
        if (filter.direction) params.set("direction", filter.direction);

        const eventsResponse = await fetch(
          `/api/communication/cases/${caseId}?${params}`
        );
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData);
        }
      } catch (error) {
        console.error("Failed to fetch communication history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId, filter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "phone_call":
        return <Phone className="h-4 w-4" />;
      case "letter":
        return <FileText className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "sms":
      case "whatsapp":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "phone_call":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "letter":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "meeting":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading communication history...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Communication History</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilter({})}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{summary.totalEvents}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Inbound</p>
            <p className="text-lg font-semibold">{summary.byDirection.inbound}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Outbound</p>
            <p className="text-lg font-semibold">{summary.byDirection.outbound}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Unread</p>
            <p className="text-lg font-semibold text-amber-400">
              {summary.unreadCount}
            </p>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No communication history</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded ${getTypeColor(event.communicationType)}`}>
                    {getTypeIcon(event.communicationType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {event.direction === "inbound" ? (
                        <ArrowDown className="h-3 w-3 text-green-400" />
                      ) : (
                        <ArrowUp className="h-3 w-3 text-blue-400" />
                      )}
                      <span className="font-medium">
                        {event.direction === "inbound" ? "From" : "To"}:{" "}
                        {event.direction === "inbound"
                          ? event.fromParticipant
                          : event.toParticipants.join(", ")}
                      </span>
                      <Badge className={getTypeColor(event.communicationType)}>
                        {event.communicationType.replace("_", " ")}
                      </Badge>
                    </div>
                    {event.subject && (
                      <p className="text-sm text-foreground mb-1">{event.subject}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {event.sentAt && (
                        <span>
                          {format(new Date(event.sentAt), "dd MMM yyyy, HH:mm")}
                        </span>
                      )}
                      {event.durationSeconds && (
                        <span>• Duration: {formatDuration(event.durationSeconds)}</span>
                      )}
                      {event.attachmentsCount > 0 && (
                        <span>• {event.attachmentsCount} attachment(s)</span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    event.status === "read"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : event.status === "sent"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : ""
                  }
                >
                  {event.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

