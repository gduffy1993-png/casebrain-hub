"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Send,
  Inbox,
  Phone,
  FileText,
  Clock,
  AlertCircle,
  Users,
  User,
  Building,
  Loader2,
  Paperclip,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CorrespondenceItem, CorrespondenceTimelineSummary } from "@/lib/types/casebrain";

type CorrespondenceTimelinePanelProps = {
  caseId: string;
};

type TimelineFilter = "all" | "limitation" | "complaint" | "evidence" | "protocol" | "communication";

const partyColors: Record<string, string> = {
  client: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  opponent: "bg-red-500/20 text-red-400 border-red-500/30",
  court: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  third_party: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  internal: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  letter: FileText,
  phone_note: Phone,
  other: FileText,
};

export function CorrespondenceTimelinePanel({ caseId }: CorrespondenceTimelinePanelProps) {
  const [timeline, setTimeline] = useState<CorrespondenceTimelineSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("all");

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/correspondence`);
        if (res.ok) {
          const data = await res.json();
          setTimeline(data.timeline);
        } else {
          setError("Failed to load correspondence timeline");
        }
      } catch (err) {
        console.error("Failed to fetch correspondence timeline:", err);
        setError("Failed to load correspondence timeline");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [caseId]);

  // Infer categories for items that don't have them
  // Always call hooks in the same order, use empty array if timeline is null
  const itemsWithCategories = useMemo(() => {
    if (!timeline?.items) return [];
    
    return timeline.items.map(item => {
      if (item.category) return item;
      
      // Infer category from existing fields
      const name = (item.subjectOrLabel ?? "").toLowerCase();
      const summary = (item.summary ?? "").toLowerCase();
      const text = `${name} ${summary}`;
      
      if (text.includes("limitation") || text.includes("deadline") || text.includes("expir")) {
        return { ...item, category: "limitation" as const };
      }
      if (text.includes("complaint") || text.includes("ombudsman") || text.includes("fos")) {
        return { ...item, category: "complaint" as const };
      }
      if (text.includes("evidence") || text.includes("bundle") || text.includes("disclosure")) {
        return { ...item, category: "evidence" as const };
      }
      if (text.includes("protocol") || text.includes("pre-action") || text.includes("lba")) {
        return { ...item, category: "protocol" as const };
      }
      // Default to communication for correspondence items
      return { ...item, category: "communication" as const };
    });
  }, [timeline?.items]);

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") {
      return itemsWithCategories;
    }
    return itemsWithCategories.filter(item => item.category === activeFilter);
  }, [itemsWithCategories, activeFilter]);

  // Calculate category counts (always compute to keep hooks consistent)
  const categoryCounts = useMemo(() => {
    return {
      limitation: itemsWithCategories.filter(i => i.category === "limitation").length,
      complaint: itemsWithCategories.filter(i => i.category === "complaint").length,
      evidence: itemsWithCategories.filter(i => i.category === "evidence").length,
      protocol: itemsWithCategories.filter(i => i.category === "protocol").length,
      communication: itemsWithCategories.filter(i => i.category === "communication").length,
    };
  }, [itemsWithCategories]);

  // Calculate longest gap (always compute to keep hooks consistent)
  const longestGap = useMemo(() => {
    if (!timeline?.longGaps || timeline.longGaps.length === 0) return 0;
    return Math.max(...timeline.longGaps.map(g => g.days));
  }, [timeline?.longGaps]);

  if (isLoading) {
    return (
      <Card title="Correspondence Timeline">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error || !timeline) {
    return (
      <Card title="Correspondence Timeline">
        <p className="text-sm text-accent/60">
          {error ?? "No correspondence recorded for this case."}
        </p>
      </Card>
    );
  }

  if (!timeline.items || timeline.items.length === 0) {
    return (
      <Card title="Correspondence Timeline">
        <p className="text-sm text-accent/60">
          No correspondence recorded for this case yet.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>Correspondence Timeline</span>
          <Badge variant="outline" className="text-xs">
            {timeline.items.length} items
          </Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-primary/30 text-primary border border-primary/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            All ({timeline.items.length})
          </button>
          <button
            onClick={() => setActiveFilter("limitation")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "limitation"
                ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            Limitation ({categoryCounts.limitation})
          </button>
          <button
            onClick={() => setActiveFilter("complaint")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "complaint"
                ? "bg-red-500/30 text-red-300 border border-red-500/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            Complaints ({categoryCounts.complaint})
          </button>
          <button
            onClick={() => setActiveFilter("evidence")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "evidence"
                ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            Evidence ({categoryCounts.evidence})
          </button>
          <button
            onClick={() => setActiveFilter("protocol")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "protocol"
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            Protocol ({categoryCounts.protocol})
          </button>
          <button
            onClick={() => setActiveFilter("communication")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === "communication"
                ? "bg-green-500/30 text-green-300 border border-green-500/50"
                : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
            }`}
          >
            Communication ({categoryCounts.communication})
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-primary/10 bg-surface-muted/50 p-3 text-xs">
          {timeline.opponentAverageReplyDays && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-accent/60">Avg opponent reply:</span>
              <span className="font-medium text-accent">{timeline.opponentAverageReplyDays} days</span>
            </div>
          )}
          {timeline.lastClientUpdateAt && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-blue-400/70" />
              <span className="text-accent/60">Last client contact:</span>
              <span className="font-medium text-accent">
                {formatDate(timeline.lastClientUpdateAt)}
              </span>
            </div>
          )}
          {longestGap > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-warning/70" />
              <span className="text-accent/60">Longest gap:</span>
              <span className="font-medium text-warning">{longestGap} days</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="relative space-y-3 pl-6">
          {/* Vertical line */}
          <div className="absolute bottom-2 left-2 top-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />

          {filteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-white/50">
                No items match the selected filter.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <CorrespondenceItemRow 
                key={item.id} 
                item={item} 
                isFirst={idx === 0}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function CorrespondenceItemRow({ 
  item, 
  isFirst,
}: { 
  item: CorrespondenceItem; 
  isFirst: boolean;
}) {
  const ChannelIcon = channelIcons[item.channel] ?? FileText;
  const DirectionIcon = item.direction === "inbound" ? Inbox : Send;
  const PartyIcon = item.party === "client" ? User : 
    item.party === "opponent" ? Users :
    item.party === "court" ? Building :
    Users;

  const hasLongGap = (item.gapSincePreviousDays ?? 0) >= 14;

  return (
    <div className="relative">
      {/* Gap indicator */}
      {!isFirst && hasLongGap && (
        <div className="mb-2 ml-2 flex items-center gap-2 text-xs text-warning">
          <Clock className="h-3 w-3" />
          <span>{item.gapSincePreviousDays} days since last contact</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Timeline dot */}
        <div
          className={`absolute -left-1 mt-1.5 h-3 w-3 rounded-full border-2 ${
            item.direction === "inbound"
              ? "border-blue-400 bg-blue-400/30"
              : "border-primary bg-primary/30"
          }`}
        />

        {/* Content */}
        <div
          className={`flex-1 rounded-xl border p-3 transition-colors hover:bg-surface-muted/50 ${
            hasLongGap ? "border-warning/30" : "border-primary/10"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Direction icon */}
              <div
                className={`rounded-lg p-1.5 ${
                  item.direction === "inbound"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <DirectionIcon className="h-3.5 w-3.5" />
              </div>

              {/* Channel icon */}
              <ChannelIcon className="h-3.5 w-3.5 text-accent/50" />

              {/* Party badge */}
              <Badge className={`text-[10px] ${partyColors[item.party]}`}>
                <PartyIcon className="mr-1 h-2.5 w-2.5" />
                {item.displayName ?? item.party}
              </Badge>

              {/* Opponent reply indicator */}
              {item.isOpponentReply && (
                <Badge variant="warning" className="text-[10px]">
                  Reply
                </Badge>
              )}
            </div>

            {/* Date */}
            <span className="shrink-0 text-xs text-accent/50">
              {formatDate(item.createdAt)}
            </span>
          </div>

          {/* Subject */}
          <div className="mt-2 flex items-center gap-2">
            <p className="text-sm font-medium text-accent">
              {item.subjectOrLabel}
            </p>
            {item.hasAttachment && (
              <Paperclip className="h-3.5 w-3.5 text-accent/40" />
            )}
          </div>

          {/* Summary */}
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-accent/60">
              {item.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

