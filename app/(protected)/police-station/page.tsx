"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Clock, MessageSquare } from "lucide-react";

type CaseRow = {
  id: string;
  title: string;
  updated_at?: string | null;
  next_hearing_date?: string | null;
  next_hearing_type?: string | null;
  matter_state?: string | null;
};

type FormState = {
  dateOfArrest: string;
  allegedOffence: string;
  matterState: string;
  stationSummary: string;
  groundsForArrest: string;
  timeInCustodyAt: string;
  nextPaceReviewAt: string;
  interviewStance: string;
  bailReturnDate: string;
  bailOutcome: string;
  matterClosedAt: string;
  matterClosedReason: string;
};

const MATTER_STATE_LABELS: Record<string, string> = {
  at_station: "At station",
  bailed: "Bailed",
  rui: "RUI",
};

const MATTER_STATE_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "at_station", label: "At station" },
  { value: "bailed", label: "Bailed" },
  { value: "rui", label: "RUI" },
  { value: "charged", label: "Charged" },
  { value: "before_first_hearing", label: "Before first hearing" },
  { value: "before_ptph", label: "Before PTPH" },
  { value: "before_trial", label: "Before trial" },
  { value: "trial", label: "Trial" },
  { value: "sentencing", label: "Sentencing" },
  { value: "disposed", label: "Disposed" },
];

const INTERVIEW_STANCES = [
  { value: "", label: "Not recorded" },
  { value: "no_comment", label: "No comment" },
  { value: "prepared_statement", label: "Prepared statement" },
  { value: "answered", label: "Answered questions" },
];

const BAIL_OUTCOME_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "extended_bail", label: "Extended bail" },
  { value: "rui", label: "RUI" },
  { value: "nfa", label: "NFA" },
  { value: "charged", label: "Charged" },
];

const emptyForm: FormState = {
  dateOfArrest: "",
  allegedOffence: "",
  matterState: "at_station",
  stationSummary: "",
  groundsForArrest: "",
  timeInCustodyAt: "",
  nextPaceReviewAt: "",
  interviewStance: "",
  bailReturnDate: "",
  bailOutcome: "",
  matterClosedAt: "",
  matterClosedReason: "",
};

function formatUpdated(updatedAt: string | null | undefined): string {
  if (!updatedAt) return "—";
  try {
    const d = new Date(updatedAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatNextHearing(dateStr: string | null | undefined, typeStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return typeStr ? `${typeStr} ${datePart}` : datePart;
  } catch {
    return "";
  }
}

export default function PoliceStationPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchList = () => {
    fetch("/api/cases?view=police_station", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCases(Array.isArray(data.cases) ? data.cases : []))
      .catch(() => setCases([]));
  };

  useEffect(() => {
    setLoading(true);
    fetch("/api/cases?view=police_station", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCases(Array.isArray(data.cases) ? data.cases : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const hasSummary = (form.stationSummary.trim().length > 0) || (form.groundsForArrest.trim().length > 0);
  const canCreate = form.allegedOffence.trim() || form.stationSummary.trim() || form.groundsForArrest.trim() || form.dateOfArrest;

  const createMatter = async () => {
    if (!canCreate) {
      setCreateError("Add at least offence, date of arrest, or a brief summary.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const timeInCustodyAt = form.timeInCustodyAt
        ? new Date(form.timeInCustodyAt).toISOString()
        : null;
      const nextPaceReviewAt = form.nextPaceReviewAt
        ? new Date(form.nextPaceReviewAt).toISOString()
        : null;
      const matterClosedAt = form.matterClosedAt
        ? new Date(form.matterClosedAt).toISOString()
        : null;

      const res = await fetch("/api/criminal/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          matterState: form.matterState || "at_station",
          station: {
            dateOfArrest: form.dateOfArrest || null,
            allegedOffence: form.allegedOffence.trim() || null,
            stationSummary: form.stationSummary.trim() || null,
            groundsForArrest: form.groundsForArrest.trim() || null,
            timeInCustodyAt,
            nextPaceReviewAt,
            interviewStance: form.interviewStance || null,
          },
          bailReturnDate: form.bailReturnDate || null,
          bailOutcome: form.bailOutcome || null,
          matterClosedAt,
          matterClosedReason: form.matterClosedReason.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Failed to create matter");
        return;
      }
      setForm(emptyForm);
      fetchList();
      if (data.caseId) router.push(`/cases/${data.caseId}?tab=police-station`);
    } catch {
      setCreateError("Failed to create matter");
    } finally {
      setCreating(false);
    }
  };

  const update = (updates: Partial<FormState>) => setForm((f) => ({ ...f, ...updates }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Police station</h1>
        <p className="text-sm text-accent/60">Fill in below. Create matter to save; then it appears in the list.</p>
      </header>

      {/* Section 1: Full form */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">New matter</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date of arrest</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.dateOfArrest}
              onChange={(e) => update({ dateOfArrest: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Offence alleged</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="E.g. Armed robbery, assault"
              value={form.allegedOffence}
              onChange={(e) => update({ allegedOffence: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Matter stage</label>
          <select
            className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
            value={form.matterState}
            onChange={(e) => update({ matterState: e.target.value })}
          >
            {MATTER_STATE_OPTIONS.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Brief summary</label>
          <textarea
            className="w-full min-h-[100px] rounded border border-border bg-background px-3 py-2 text-sm resize-y"
            placeholder="What happened, why arrested, key circumstances..."
            value={form.stationSummary}
            onChange={(e) => update({ stationSummary: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Grounds for arrest / key circumstances</label>
          <textarea
            className="w-full min-h-[80px] rounded border border-border bg-background px-3 py-2 text-sm resize-y"
            placeholder="What police are relying on; points for disclosure..."
            value={form.groundsForArrest}
            onChange={(e) => update({ groundsForArrest: e.target.value })}
          />
        </div>

        {hasSummary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Suggested next steps</h3>
            <p className="text-xs text-muted-foreground mb-2">Not legal advice. You decide.</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Request custody record, MG4 and MG5; upload in the case when you have them</li>
              <li>Note any ID or circumstantial points for later challenge</li>
              <li>Record interview stance below once the client has decided</li>
              <li>When charged, use the Strategy tab in the case</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Time in custody</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.timeInCustodyAt}
              onChange={(e) => update({ timeInCustodyAt: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Next PACE review</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.nextPaceReviewAt}
              onChange={(e) => update({ nextPaceReviewAt: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Interview stance</label>
          <select
            className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
            value={form.interviewStance}
            onChange={(e) => update({ interviewStance: e.target.value })}
          >
            {INTERVIEW_STANCES.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Bail return date</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.bailReturnDate}
              onChange={(e) => update({ bailReturnDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Bail outcome</label>
            <select
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.bailOutcome}
              onChange={(e) => update({ bailOutcome: e.target.value })}
            >
              {BAIL_OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Matter closed date</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={form.matterClosedAt}
              onChange={(e) => update({ matterClosedAt: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Matter closed reason</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="NFA / acquitted / sentenced"
              value={form.matterClosedReason}
              onChange={(e) => update({ matterClosedReason: e.target.value })}
            />
          </div>
        </div>

        {createError && <p className="text-sm text-destructive">{createError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={createMatter} disabled={creating || !canCreate}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create matter"}
          </Button>
          <Button variant="outline" onClick={() => setForm(emptyForm)}>Clear form</Button>
        </div>
      </Card>

      {/* Section 2: List of existing matters */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Police station matters</h2>
        <Card>
          {loading ? (
            <div className="p-8 text-center text-sm text-accent/60">Loading...</div>
          ) : cases.length > 0 ? (
            <ul className="divide-y divide-primary/10">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cases/${c.id}?tab=police-station`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-muted/50 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-accent">{c.title}</p>
                        {c.matter_state && (
                          <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                            {MATTER_STATE_LABELS[c.matter_state] ?? c.matter_state}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-accent/60">
                        {c.next_hearing_date
                          ? `Next: ${formatNextHearing(c.next_hearing_date, c.next_hearing_type)}`
                          : "Pending outcome"}
                      </p>
                      <p className="mt-0.5 text-xs text-accent/50">
                        Last updated: {formatUpdated(c.updated_at)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-sm text-accent/70">
              No matters yet. Fill in the form above and click Create matter.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
