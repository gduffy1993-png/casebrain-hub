"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Clock, MessageSquare } from "lucide-react";

type MatterStation = {
  timeInCustodyAt: string | null;
  nextPaceReviewAt: string | null;
  interviewStance: string | null;
  stationSummary: string | null;
  groundsForArrest: string | null;
  dateOfArrest: string | null;
  allegedOffence: string | null;
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

type PoliceStationTabProps = {
  caseId: string;
  onAddEvidenceUpload?: () => void;
};

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

const REQUEST_PAPERWORK_LIST = [
  "Custody record",
  "MG4 (Custody record summary)",
  "MG5 (Witness / evidence summary)",
  "Charge sheet (if charged)",
  "Disclosure list (initial)",
  "Interview record (if recorded)",
];

export function PoliceStationTab({ caseId, onAddEvidenceUpload }: PoliceStationTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matterState, setMatterState] = useState<string | null>(null);
  const [station, setStation] = useState<MatterStation>({
    timeInCustodyAt: null,
    nextPaceReviewAt: null,
    interviewStance: null,
    stationSummary: null,
    groundsForArrest: null,
    dateOfArrest: null,
    allegedOffence: null,
  });
  const [bailReturnDate, setBailReturnDate] = useState<string | null>(null);
  const [bailOutcome, setBailOutcome] = useState<string | null>(null);
  const [matterClosedAt, setMatterClosedAt] = useState<string | null>(null);
  const [matterClosedReason, setMatterClosedReason] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (data.station) setStation((prev) => ({ ...prev, ...data.station }));
          if (data.matterState != null) setMatterState(data.matterState);
          if (data.bailReturnDate != null) setBailReturnDate(data.bailReturnDate);
          if (data.bailOutcome != null) setBailOutcome(data.bailOutcome);
          if (data.matterClosedAt != null) setMatterClosedAt(data.matterClosedAt);
          if (data.matterClosedReason != null) setMatterClosedReason(data.matterClosedReason);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  const patchStation = (updates: Partial<MatterStation>) => {
    setStation((s) => ({ ...s, ...updates }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/matter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          station,
          matterState: matterState || undefined,
          bailReturnDate: bailReturnDate || undefined,
          bailOutcome: bailOutcome || undefined,
          matterClosedAt: matterClosedAt || undefined,
          matterClosedReason: matterClosedReason || undefined,
        }),
      });
      if (res.ok) setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const setMatterStateAndSave = (value: string | null) => {
    setMatterState(value || null);
    setDirty(true);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading station details...</span>
        </div>
      </Card>
    );
  }

  const hasSummary = (station.stationSummary ?? "").trim().length > 0 || (station.groundsForArrest ?? "").trim().length > 0;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Date of arrest, offence, summary and grounds. Everything you need for the station; Strategy tab when charged.
      </p>

      {/* Single card – same layout as Police station page */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Station details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date of arrest</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={station.dateOfArrest ?? ""}
              onChange={(e) => patchStation({ dateOfArrest: e.target.value || null })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Offence alleged</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="E.g. Armed robbery, assault"
              value={station.allegedOffence ?? ""}
              onChange={(e) => patchStation({ allegedOffence: e.target.value || null })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Matter stage</label>
          <select
            className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
            value={matterState ?? ""}
            onChange={(e) => setMatterStateAndSave(e.target.value || null)}
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
            value={station.stationSummary ?? ""}
            onChange={(e) => patchStation({ stationSummary: e.target.value || null })}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Grounds for arrest / key circumstances</label>
          <textarea
            className="w-full min-h-[80px] rounded border border-border bg-background px-3 py-2 text-sm resize-y"
            placeholder="What police are relying on; points for disclosure..."
            value={station.groundsForArrest ?? ""}
            onChange={(e) => patchStation({ groundsForArrest: e.target.value || null })}
          />
        </div>

        {hasSummary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Suggested next steps</h3>
            <p className="text-xs text-muted-foreground mb-2">Not legal advice. You decide.</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Request custody record, MG4 and MG5; upload below when you have them</li>
              <li>Note any ID or circumstantial points for later challenge</li>
              <li>Record interview stance below once the client has decided</li>
              <li>When charged, use the Strategy tab and upload any charge sheet</li>
            </ul>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Station pack</label>
          <Button type="button" variant="outline" size="sm" onClick={onAddEvidenceUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload station documents
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Time in custody</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={station.timeInCustodyAt ? station.timeInCustodyAt.slice(0, 16) : ""}
              onChange={(e) => patchStation({ timeInCustodyAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Next PACE review</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={station.nextPaceReviewAt ? station.nextPaceReviewAt.slice(0, 16) : ""}
              onChange={(e) => patchStation({ nextPaceReviewAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Interview stance</label>
          <select
            className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
            value={station.interviewStance ?? ""}
            onChange={(e) => patchStation({ interviewStance: e.target.value || null })}
          >
            {INTERVIEW_STANCES.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Speak or no comment?</strong> Your decision with the client. Consider strength of case, disclosure, and risks. Record stance above once decided.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Bail return date</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={bailReturnDate ?? ""}
              onChange={(e) => {
                setBailReturnDate(e.target.value || null);
                setDirty(true);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Bail outcome</label>
            <select
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={bailOutcome ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setBailOutcome(v);
                if (v === "charged") setMatterState("charged");
                if (v === "rui") setMatterState("rui");
                if (v === "nfa") setMatterState("disposed");
                setDirty(true);
              }}
            >
              {BAIL_OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {dirty && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Matter closed date</label>
            <input
              type="date"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={matterClosedAt ? matterClosedAt.slice(0, 10) : ""}
              onChange={(e) => {
                setMatterClosedAt(e.target.value ? new Date(e.target.value).toISOString() : null);
                setDirty(true);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Matter closed reason</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="NFA / acquitted / sentenced"
              value={matterClosedReason ?? ""}
              onChange={(e) => {
                setMatterClosedReason(e.target.value || null);
                setDirty(true);
              }}
            />
          </div>
        </div>
        {(matterClosedAt || matterClosedReason) && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/cases/${caseId}/archive`, { method: "POST", credentials: "include" });
                  if (res.ok) window.location.href = "/cases";
                  else alert("Failed to archive case");
                } catch {
                  alert("Failed to archive case");
                }
              }}
            >
              Archive case
            </Button>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">Request paperwork (by email)</h3>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            {REQUEST_PAPERWORK_LIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
