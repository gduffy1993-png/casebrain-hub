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
          if (data.station) setStation(data.station);
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Police station materials and advice. Upload custody pack, record custody clock and interview stance, then run through the case in Summary and Strategy when charged.
      </p>

      {/* Matter stage – drives default tab when opening case */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Matter stage</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Sets which tab opens by default when you open this case (e.g. At station → Police station tab).
        </p>
        <select
          className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
          value={matterState ?? ""}
          onChange={(e) => setMatterStateAndSave(e.target.value || null)}
        >
          {MATTER_STATE_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Card>

      {/* Upload station pack */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Station pack</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Upload custody record, MG4, MG5, disclosure list, interview record. They will appear in case documents and can be used for summary and strategy.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onAddEvidenceUpload}>
          <Upload className="h-4 w-4 mr-2" />
          Upload station documents
        </Button>
      </Card>

      {/* Custody clock */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Custody clock
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Record time in custody and next PACE review so you know detention limits.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Time in custody (date/time)</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={station.timeInCustodyAt ? station.timeInCustodyAt.slice(0, 16) : ""}
              onChange={(e) => patchStation({ timeInCustodyAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Next PACE review (date/time)</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              value={station.nextPaceReviewAt ? station.nextPaceReviewAt.slice(0, 16) : ""}
              onChange={(e) => patchStation({ nextPaceReviewAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
        </div>
      </Card>

      {/* Interview stance */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Interview stance
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Record how the client dealt with interview. Shown in station summary and Key facts.
        </p>
        <select
          className="w-full max-w-xs rounded border border-border bg-background px-3 py-2 text-sm"
          value={station.interviewStance ?? ""}
          onChange={(e) => patchStation({ interviewStance: e.target.value || null })}
        >
          {INTERVIEW_STANCES.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Card>

      {/* Speak or no comment – guardrailed, not legal advice */}
      <Card className="p-4 border-amber-500/20 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Speak or no comment?</h3>
        <p className="text-xs text-muted-foreground mb-2">
          This is a decision for you and the client. CaseBrain does not give legal advice. Consider:
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 mb-2">
          <li>Strength of prosecution case and disclosure at station</li>
          <li>Client instructions and their ability to give a clear account</li>
          <li>Risks of saying something that may undermine the defence later</li>
          <li>Prepared statement as a middle option</li>
        </ul>
        <p className="text-xs italic text-muted-foreground">
          Record the interview stance above once the client has decided. You control the decision.
        </p>
      </Card>

      {/* Station summary */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Station summary</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Brief summary of station attendance, disclosure at station, and interview. Can be filled manually or from ingested docs later.
        </p>
        <textarea
          className="w-full min-h-[120px] rounded border border-border bg-background px-3 py-2 text-sm resize-y"
          placeholder="E.g. Client attended voluntarily. Limited disclosure (MG4). Interview: no comment. Bailed to return..."
          value={station.stationSummary ?? ""}
          onChange={(e) => patchStation({ stationSummary: e.target.value || null })}
        />
      </Card>

      {/* Bail return date & outcome (after station) */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Bail return / outcome</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Return date and outcome at return (extended bail, RUI, NFA, charged). When charged, set matter stage to Charged and use Strategy tab.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Return date</label>
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
            <label className="text-xs text-muted-foreground block mb-1">Outcome at return</label>
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
      </Card>

      {dirty && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      )}

      {/* Matter closed (NFA / disposed) */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Matter closed</h3>
        <p className="text-xs text-muted-foreground mb-3">
          When the matter is closed (NFA, disposed, acquitted), record the date and outcome so it doesn’t stay live. You can then archive the case.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Closed date</label>
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
            <label className="text-xs text-muted-foreground block mb-1">Reason (e.g. NFA, acquitted, sentenced)</label>
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
          <div className="mt-3">
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
      </Card>

      {/* Request paperwork */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Request paperwork (by email)</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use this list when requesting copies from the station or CPS.
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {REQUEST_PAPERWORK_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
