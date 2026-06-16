"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { workflowCard, workflowSectionTitle } from "./workflowUi";
import { useToast } from "@/components/Toast";

const OUTCOME_OPTIONS = [
  "",
  "Adjourned (general)",
  "Adjourned for disclosure",
  "Plea entered",
  "Bail granted",
  "Bail refused",
  "Remanded in custody",
  "Sent to Crown Court",
  "Other",
];

type Hearing = {
  id: string;
  hearingType: string;
  hearingDate: string;
  courtName: string | null;
  outcome: string | null;
  notes: string | null;
  whatsNeededNext: string | null;
};

/** Compact post-court note on the File tab — uses existing criminal_hearings API. */
export function HearingOutcomeNote({ caseId }: { caseId: string }) {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [pending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  const latest = hearings.length ? hearings[hearings.length - 1] : null;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/hearings`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data.hearings ?? []) as Hearing[];
        setHearings(list);
        const h = list.length ? list[list.length - 1] : null;
        if (h) {
          setOutcome(h.outcome ?? "");
          setNotes(h.notes ?? "");
          setNextSteps(h.whatsNeededNext ?? "");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const save = () => {
    if (!latest) {
      startTransition(async () => {
        const res = await fetch(`/api/criminal/${caseId}/hearings`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hearingType: "First Hearing", hearingDate: new Date().toISOString() }),
        });
        const data = await res.json();
        if (!res.ok || !data.hearing?.id) {
          showToast(data?.error ?? "Could not create hearing row", "error");
          return;
        }
        const patch = await fetch(`/api/criminal/${caseId}/hearings?hearingId=${data.hearing.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome, notes, whatsNeededNext: nextSteps }),
        });
        if (patch.ok) {
          showToast("Hearing outcome saved", "success");
          setHearings([data.hearing]);
        } else {
          showToast("Failed to save outcome", "error");
        }
      });
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/criminal/${caseId}/hearings?hearingId=${latest.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes, whatsNeededNext: nextSteps }),
      });
      if (res.ok) showToast("Hearing outcome saved", "success");
      else showToast("Failed to save outcome", "error");
    });
  };

  return (
    <Card className={`${workflowCard} p-4 border-slate-200 bg-white`} data-testid="hearing-outcome-note">
      <h3 className={workflowSectionTitle}>Hearing outcome note</h3>
      <p className="text-xs text-slate-500 mb-3">Record what happened at court — file note only, not legal advice.</p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {latest ? (
            <p className="text-xs text-slate-600">
              {latest.hearingType} · {new Date(latest.hearingDate).toLocaleString("en-GB")}
              {latest.courtName ? ` · ${latest.courtName}` : ""}
            </p>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              No hearing on file yet — save will create a first-hearing row.
            </p>
          )}
          <label className="block text-xs font-medium text-slate-700">
            Outcome
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o || "blank"} value={o}>
                  {o || "— select —"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Directions / notes
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did the court order? What was said?"
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Next steps / chase
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm min-h-[56px]"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Deadlines, CPS to serve, client instructions needed"
            />
          </label>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save outcome"}
          </Button>
        </div>
      )}
    </Card>
  );
}
