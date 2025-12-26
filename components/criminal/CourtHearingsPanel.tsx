"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Hearing = {
  id: string;
  hearingType: string;
  hearingDate: string;
  courtName: string | null;
  outcome: string | null;
};

type CourtHearingsPanelProps = {
  caseId: string;
  currentPhase?: 1 | 2 | 3; // Phase gating: outcomes only visible in Phase 3
};

export function CourtHearingsPanel({ caseId, currentPhase = 1 }: CourtHearingsPanelProps) {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHearings() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/hearings`);
        if (res.ok) {
          const result = await res.json();
          setHearings(result.hearings || []);
        }
      } catch (error) {
        console.error("Failed to fetch hearings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHearings();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Court Hearings" description="Loading hearings..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  const sortedHearings = [...hearings].sort(
    (a, b) => new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime()
  );
  const upcomingHearings = sortedHearings.filter(
    (h) => new Date(h.hearingDate) >= new Date()
  );
  const pastHearings = sortedHearings.filter((h) => new Date(h.hearingDate) < new Date());

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Court Hearings</span>
        </div>
      }
      description="Upcoming and past court hearings"
      action={
        <Button variant="outline" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Add Hearing
        </Button>
      }
    >
      <div className="space-y-4">
        {upcomingHearings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Upcoming</h4>
            <div className="space-y-2">
              {upcomingHearings.map((hearing) => (
                <HearingCard key={hearing.id} hearing={hearing} isUpcoming currentPhase={currentPhase} />
              ))}
            </div>
          </div>
        )}

        {pastHearings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Past</h4>
            <div className="space-y-2">
              {pastHearings.map((hearing) => (
                <HearingCard key={hearing.id} hearing={hearing} isUpcoming={false} currentPhase={currentPhase} />
              ))}
            </div>
          </div>
        )}

        {hearings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hearings recorded</p>
            {/* Note: Detected hearings from key facts would be shown here if available, but this is display-only */}
          </div>
        )}
      </div>
    </Card>
  );
}

function HearingCard({ hearing, isUpcoming, currentPhase = 1 }: { hearing: Hearing; isUpcoming: boolean; currentPhase?: 1 | 2 | 3 }) {
  return (
    <div className={`p-3 rounded-lg border ${isUpcoming ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{hearing.hearingType}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(hearing.hearingDate).toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {hearing.courtName && (
            <p className="text-xs text-muted-foreground mt-1">{hearing.courtName}</p>
          )}
          {/* Phase gating: outcomes only visible in Phase 3 (Sentencing & Outcome) */}
          {hearing.outcome && currentPhase >= 3 && (
            <p className="text-xs text-muted-foreground mt-1">Outcome: {hearing.outcome}</p>
          )}
          {hearing.outcome && currentPhase < 3 && (
            <p className="text-xs text-amber-400/70 mt-1 italic">
              Outcome available in Phase 3 (Sentencing & Outcome)
            </p>
          )}
        </div>
        {isUpcoming && <Badge variant="primary" className="text-xs">UPCOMING</Badge>}
      </div>
    </div>
  );
}

