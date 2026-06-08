"use client";

import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CourtTodayCaseCard } from "./CourtTodayCaseCard";
import { bucketLabel } from "./courtCaseBrief";
import type { CourtCaseBrief, HearingBucket } from "./types";

const EMPTY_COPY: Record<Exclude<HearingBucket, "no_hearing">, string> = {
  today:
    "No matters with a hearing date safely extracted for today. Check the review list below if dates are missing from the file.",
  tomorrow:
    "No matters with a hearing date safely extracted for tomorrow.",
  this_week:
    "No matters with a hearing date safely extracted for the rest of this week.",
};

export function CourtTodayScheduleSection({
  bucket,
  items,
}: {
  bucket: Exclude<HearingBucket, "no_hearing">;
  items: CourtCaseBrief[];
}) {
  return (
    <section aria-labelledby={`court-bucket-${bucket}`}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2
          id={`court-bucket-${bucket}`}
          className="text-sm font-semibold text-foreground uppercase tracking-wide"
        >
          {bucketLabel(bucket)}
        </h2>
        <span className="text-xs text-muted-foreground">{items.length} matter(s)</span>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/10 px-4 py-5">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
            <p>{EMPTY_COPY[bucket]}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((brief) => (
            <CourtTodayCaseCard key={brief.caseId} brief={brief} />
          ))}
        </div>
      )}
    </section>
  );
}
