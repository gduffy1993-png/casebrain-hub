"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ShieldAlert, Check, X, Loader2, Clock } from "lucide-react";

interface SupervisorReviewPanelProps {
  caseId: string;
  caseName?: string;
  className?: string;
}

interface ReviewStatus {
  supervisorReviewed: boolean;
  supervisorReviewedAt: string | null;
  supervisorReviewerId: string | null;
  supervisorReviewNote: string | null;
}

export function SupervisorReviewPanel({
  caseId,
  caseName,
  className = "",
}: SupervisorReviewPanelProps) {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");

  // Fetch current review status
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/cases/${caseId}/supervisor-review`);
        if (!res.ok) {
          throw new Error("Failed to fetch review status");
        }

        const data = await res.json();
        setStatus(data);
        setNote(data.supervisorReviewNote ?? "");
      } catch (err) {
        console.error("[SupervisorReviewPanel] Fetch error:", err);
        setError("Could not load review status");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [caseId]);

  const handleSubmit = async (reviewed: boolean) => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/cases/${caseId}/supervisor-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed, note: note.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save review");
      }

      const data = await res.json();
      setStatus({
        supervisorReviewed: data.supervisorReviewed,
        supervisorReviewedAt: data.supervisorReviewedAt,
        supervisorReviewerId: data.supervisorReviewerId,
        supervisorReviewNote: data.supervisorReviewNote,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("[SupervisorReviewPanel] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            Supervisor Review
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            Supervisor Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isReviewed = status?.supervisorReviewed ?? false;

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            {isReviewed ? (
              <ShieldCheck className="h-4 w-4 text-green-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            )}
            Supervisor Review
          </CardTitle>
          <Badge
            className={
              isReviewed
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }
          >
            {isReviewed ? "Reviewed" : "Pending Review"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {isReviewed && !isEditing && (
          <div className="space-y-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Clock className="h-3 w-3" />
              Reviewed on {formatDate(status?.supervisorReviewedAt ?? null)}
            </div>
            {status?.supervisorReviewNote && (
              <p className="text-sm text-white/80">
                {status.supervisorReviewNote}
              </p>
            )}
          </div>
        )}

        {/* Edit Mode or Not Reviewed */}
        {(isEditing || !isReviewed) && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">
                Review Note (optional)
              </label>
              <Textarea
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                placeholder="Add any notes about your review of this case..."
                className="min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30"
                disabled={saving}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Mark as Reviewed
              </Button>

              {isReviewed && isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Review
                </Button>
              )}

              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setNote(status?.supervisorReviewNote ?? "");
                  }}
                  disabled={saving}
                  className="text-white/50 hover:text-white/70"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Edit Button for Reviewed Cases */}
        {isReviewed && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            Edit Review
          </Button>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-white/40 leading-relaxed">
          This review function is for internal quality control only. It does
          not constitute legal advice or a second opinion on case merits.
        </p>
      </CardContent>
    </Card>
  );
}

