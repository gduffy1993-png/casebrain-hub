"use client";

/**
 * D5 follow-on: Show recent verdict ratings (change list) so feedback is visible and drives behaviour.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, ThumbsUp, ThumbsDown } from "lucide-react";

type RatingRow = {
  id: string;
  target: string;
  rating: string;
  note?: string;
  createdAt: string;
};

type ChangeListSectionProps = {
  caseId: string;
  className?: string;
};

export function ChangeListSection({ caseId, className = "" }: ChangeListSectionProps) {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/criminal/${caseId}/verdict-ratings`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data?.data?.ratings)) {
          setRatings(data.data.ratings);
        } else {
          setRatings([]);
        }
      })
      .catch(() => {
        if (!cancelled) setRatings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <Card className={`p-3 ${className}`}>
        <p className="text-xs text-muted-foreground">Loading feedback…</p>
      </Card>
    );
  }

  if (ratings.length === 0) {
    return (
      <Card className={`p-3 border-dashed ${className}`}>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          No verdict feedback yet. Rate summary, chat, or strategy to build a change list.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-3 ${className}`}>
      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5" />
        Change list (from your ratings)
      </p>
      <p className="text-[11px] text-muted-foreground mb-2">
        Chat and “Propose summary” use this feedback to adapt. Add notes when you rate to drive updates.
      </p>
      <ul className="space-y-2">
        {ratings.map((r) => (
          <li key={r.id} className="text-xs border-l-2 border-border pl-2 py-0.5">
            <span className="font-medium capitalize text-foreground">{r.target}</span>
            {" · "}
            {r.rating === "good" ? (
              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                <ThumbsUp className="h-3 w-3" /> good
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
                <ThumbsDown className="h-3 w-3" /> needs work
              </span>
            )}
            {r.createdAt && (
              <span className="text-muted-foreground ml-1">
                {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {r.note && <p className="mt-1 text-foreground">{r.note}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
