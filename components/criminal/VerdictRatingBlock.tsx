"use client";

/**
 * D5: Verdict loop – rate summary / chat / strategy; optional change note.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Target = "summary" | "chat" | "strategy";

const LABELS: Record<Target, string> = {
  summary: "Rate summary",
  chat: "Rate chat",
  strategy: "Rate strategy",
};

type VerdictRatingBlockProps = {
  caseId: string;
  target: Target;
  /** Optional compact label override */
  label?: string;
  className?: string;
};

export function VerdictRatingBlock({ caseId, target, label, className = "" }: VerdictRatingBlockProps) {
  const [rating, setRating] = useState<"good" | "needs_work" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (r: "good" | "needs_work") => {
    if (!caseId || submitting || submitted) return;
    setSubmitting(true);
    setRating(r);
    try {
      const res = await fetch(`/api/criminal/${caseId}/verdict-ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target, rating: r, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>
        Thanks for your feedback.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground">{label ?? LABELS[target]}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 text-green-600 hover:text-green-700 hover:bg-green-500/10"
        onClick={() => handleSubmit("good")}
        disabled={submitting}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
        onClick={() => handleSubmit("needs_work")}
        disabled={submitting}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
      <input
        type="text"
        placeholder="Change note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="max-w-[140px] rounded border border-border/50 bg-background px-2 py-0.5 text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );
}
