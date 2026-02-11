"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Gavel, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

const HEARING_TYPES = ["First Hearing", "Plea Hearing", "Case Management", "Trial", "Sentencing", "Appeal", "Bail Review"] as const;

type Hearing = {
  id: string;
  hearingType: string;
  hearingDate: string;
  courtName: string | null;
  outcome: string | null;
  notes: string | null;
};

type CourtHearingsPanelProps = {
  caseId: string;
  currentPhase?: 1 | 2 | 3; // Phase gating: outcomes only visible in Phase 3
};

export function CourtHearingsPanel({ caseId, currentPhase = 1 }: CourtHearingsPanelProps) {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [addType, setAddType] = useState<string>(HEARING_TYPES[0]);
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [addCourtName, setAddCourtName] = useState("");
  const [addPending, startAddTransition] = useTransition();
  const { push: showToast } = useToast();

  const refetch = () => {
    fetch(`/api/criminal/${caseId}/hearings`)
      .then((res) => res.json())
      .then((result) => { if (result.hearings) setHearings(result.hearings); })
      .catch(console.error);
  };

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

  const handleAddHearing = () => {
    startAddTransition(async () => {
      try {
        const res = await fetch(`/api/criminal/${caseId}/hearings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hearingType: addType,
            hearingDate: new Date(addDate).toISOString(),
            courtName: addCourtName.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.hearing) {
          setHearings((prev) => [...prev, { id: data.hearing.id, hearingType: data.hearing.hearingType, hearingDate: data.hearing.hearingDate, courtName: data.hearing.courtName, outcome: data.hearing.outcome, notes: data.hearing.notes }]);
          setShowAddHearing(false);
          setAddCourtName("");
          showToast?.("Hearing added", "success");
        } else {
          showToast?.(data?.error || "Failed to add hearing", "error");
        }
      } catch (e) {
        showToast?.("Failed to add hearing", "error");
      }
    });
  };

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
        <Button variant="outline" size="sm" onClick={() => setShowAddHearing((v) => !v)} disabled={addPending}>
          {addPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          Add Hearing
        </Button>
      }
    >
      <div className="space-y-4">
        {showAddHearing && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-semibold">New hearing</h4>
            <div className="grid gap-2">
              <label className="text-xs font-medium">Type</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {HEARING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label className="text-xs font-medium">Date & time</label>
              <input
                type="datetime-local"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="text-xs font-medium">Court name (optional)</label>
              <input
                type="text"
                value={addCourtName}
                onChange={(e) => setAddCourtName(e.target.value)}
                placeholder="e.g. Westminster Magistrates' Court"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleAddHearing} disabled={addPending}>
                {addPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddHearing(false)} disabled={addPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {upcomingHearings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Upcoming</h4>
            <div className="space-y-2">
              {upcomingHearings.map((hearing) => (
                <HearingCard key={hearing.id} hearing={hearing} isUpcoming caseId={caseId} currentPhase={currentPhase} onUpdated={refetch} />
              ))}
            </div>
          </div>
        )}

        {pastHearings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Past</h4>
            <div className="space-y-2">
              {pastHearings.map((hearing) => (
                <HearingCard key={hearing.id} hearing={hearing} isUpcoming={false} caseId={caseId} currentPhase={currentPhase} onUpdated={refetch} />
              ))}
            </div>
          </div>
        )}

        {hearings.length === 0 && !showAddHearing && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hearings recorded</p>
            <p className="text-xs mt-1">Use &quot;Add Hearing&quot; to record a hearing.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function HearingCard({
  hearing,
  isUpcoming,
  caseId,
  currentPhase = 1,
  onUpdated,
}: {
  hearing: Hearing;
  isUpcoming: boolean;
  caseId: string;
  currentPhase?: 1 | 2 | 3;
  onUpdated: () => void;
}) {
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [outcome, setOutcome] = useState(hearing.outcome ?? "");
  const [notes, setNotes] = useState(hearing.notes ?? "");
  const [pending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  const handleSaveOutcome = () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/criminal/${caseId}/hearings?hearingId=${encodeURIComponent(hearing.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ outcome: outcome.trim() || null, notes: notes.trim() || null }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.hearing) {
          setEditingOutcome(false);
          onUpdated();
          showToast?.("Outcome saved", "success");
        } else {
          showToast?.(data?.error || "Failed to save outcome", "error");
        }
      } catch (e) {
        showToast?.("Failed to save outcome", "error");
      }
    });
  };

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
          {currentPhase >= 3 && hearing.outcome && !editingOutcome && (
            <p className="text-xs text-muted-foreground mt-1">Outcome: {hearing.outcome}</p>
          )}
          {currentPhase >= 3 && hearing.notes && !editingOutcome && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">Notes: {hearing.notes}</p>
          )}
          {hearing.outcome && currentPhase < 3 && (
            <p className="text-xs text-amber-400/70 mt-1 italic">
              Outcome available in Phase 3 (Sentencing & Outcome)
            </p>
          )}
        </div>
        {isUpcoming && <Badge variant="primary" className="text-xs">UPCOMING</Badge>}
      </div>

      {/* Record outcome: past hearings only, Phase 2+ */}
      {!isUpcoming && currentPhase >= 2 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {editingOutcome ? (
            <div className="space-y-2">
              <label className="text-xs font-medium block">What happened / outcome summary</label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g. Adjourned for disclosure; next hearing 12 March"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="text-xs font-medium block">Notes (orders, disclosure promised, next date)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was ordered, disclosure promised, next hearing date..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveOutcome} disabled={pending}>
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3 mr-1" />}
                  Save outcome
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingOutcome(false)} disabled={pending}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOutcome(hearing.outcome ?? "");
                setNotes(hearing.notes ?? "");
                setEditingOutcome(true);
              }}
              className="gap-1"
            >
              <Gavel className="h-3 w-3" />
              {hearing.outcome ? "Edit outcome" : "Record outcome"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

