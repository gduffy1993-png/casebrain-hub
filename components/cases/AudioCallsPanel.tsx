"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  Mic, 
  Upload, 
  FileAudio, 
  Clock, 
  Users, 
  CheckCircle, 
  Loader2,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { CaseCallRecord, AttendanceNote } from "@/lib/types/casebrain";

type AudioCallsPanelProps = {
  caseId: string;
};

export function AudioCallsPanel({ caseId }: AudioCallsPanelProps) {
  const [calls, setCalls] = useState<CaseCallRecord[]>([]);
  const [notes, setNotes] = useState<AttendanceNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  // Form state for demo input
  const [fileName, setFileName] = useState("");
  const [callType, setCallType] = useState<string>("CLIENT");
  const [transcript, setTranscript] = useState("");

  // Fetch existing calls and notes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/audio`);
        if (res.ok) {
          const data = await res.json();
          setCalls(data.calls ?? []);
          setNotes(data.notes ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch audio records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            callType,
            transcriptText: transcript || undefined,
          }),
        });

        if (res.ok) {
          showToast("Call record created and attendance note generated!");
          // Refresh data
          const refreshRes = await fetch(`/api/cases/${caseId}/audio`);
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setCalls(data.calls ?? []);
            setNotes(data.notes ?? []);
          }
          // Reset form
          setFileName("");
          setTranscript("");
          setShowUpload(false);
        } else {
          const data = await res.json();
          showToast(`Error: ${data.error}`);
        }
      } catch (error) {
        showToast("Failed to create call record");
      }
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card
      title="Audio & Attendance Notes"
      description="Upload call recordings to auto-generate attendance notes"
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
          className="gap-1.5"
        >
          <Upload className="h-4 w-4" />
          {showUpload ? "Cancel" : "Add Call"}
        </Button>
      }
    >
      {/* Upload Form */}
      {showUpload && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-accent-soft">
                File Name / Description
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., Client call 28 Nov 2024"
                className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-accent-soft">
                Call Type
              </label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
              >
                <option value="CLIENT">Client Call</option>
                <option value="OPPONENT">Opponent</option>
                <option value="COURT">Court</option>
                <option value="EXPERT">Expert</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-xs font-medium text-accent-soft">
              Transcript (paste or type call notes)
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste transcript or type summary of call here...&#10;&#10;CaseBrain will extract:&#10;• Key advice given&#10;• Issues discussed&#10;• Risks identified&#10;• Follow-up tasks"
              rows={6}
              className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending || !fileName.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Create Record
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Attendance Notes */}
          {notes.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
                <FileText className="h-4 w-4 text-primary" />
                Attendance Notes ({notes.length})
              </h4>
              <div className="space-y-3">
                {notes.map((note) => (
                  <AttendanceNoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}

          {/* Call Records */}
          {calls.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
                <FileAudio className="h-4 w-4 text-secondary" />
                Call Records ({calls.length})
              </h4>
              <div className="space-y-2">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface-muted/50 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                      <FileAudio className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-accent truncate">
                        {call.fileName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-accent-soft">
                        <span>{formatDate(call.callDate)}</span>
                        {call.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={call.status === "COMPLETED" ? "success" : "primary"}
                      size="sm"
                    >
                      {call.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {calls.length === 0 && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-4 text-sm font-medium text-accent">No call records yet</p>
              <p className="mt-1 text-xs text-accent-soft">
                Upload a call recording or paste a transcript to generate an attendance note
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function AttendanceNoteCard({ note }: { note: AttendanceNote }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-surface-muted/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-accent line-clamp-1">
            {note.summary}
          </p>
          <div className="flex items-center gap-2 text-xs text-accent-soft">
            <span>{new Date(note.noteDate).toLocaleDateString("en-GB")}</span>
            {note.attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {note.attendees.length}
              </span>
            )}
            {note.followUpRequired && (
              <Badge variant="warning" size="sm">Follow-up needed</Badge>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-accent-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-accent-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Advice Given */}
          {note.adviceGiven.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-soft">
                Advice Given
              </h5>
              <ul className="space-y-1">
                {note.adviceGiven.map((advice, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-accent">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues Discussed */}
          {note.issuesDiscussed.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-soft">
                Issues Discussed
              </h5>
              <ul className="space-y-1">
                {note.issuesDiscussed.map((issue, i) => (
                  <li key={i} className="text-sm text-accent">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks Identified */}
          {note.risksIdentified.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-soft">
                Risks Identified
              </h5>
              <ul className="space-y-1">
                {note.risksIdentified.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up */}
          {note.followUpRequired && note.followUpDetails && (
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
              <p className="text-xs font-semibold text-warning">Follow-up Required</p>
              <p className="mt-1 text-sm text-accent">{note.followUpDetails}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

