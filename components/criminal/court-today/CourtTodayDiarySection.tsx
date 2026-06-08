"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import {
  workflowCard,
  workflowCardHeader,
  workflowSectionTitle,
} from "@/components/criminal/workflow/workflowUi";
import { CourtTodayDiaryTable } from "./CourtTodayDiaryTable";
import { bucketLabel } from "./courtCaseBrief";
import type { CourtCaseBrief, HearingBucket } from "./types";

const EMPTY_COPY: Record<Exclude<HearingBucket, "no_hearing">, string> = {
  today:
    "No matters with a hearing date safely extracted for today. Check the review list below if dates are missing from the file.",
  tomorrow: "No matters with a hearing date safely extracted for tomorrow.",
  this_week: "No matters with a hearing date safely extracted for the rest of this week.",
};

const PILOT_EMPTY_COPY: Record<Exclude<HearingBucket, "no_hearing">, string> = {
  today: "No hearings listed for today in saved case data.",
  tomorrow: "No hearings listed for tomorrow in saved case data.",
  this_week: "No hearings listed for the rest of this week in saved case data.",
};

export function CourtTodayDiarySection({
  bucket,
  items,
  defaultExpanded = true,
  suppressEmptyCopy = false,
  pilotMode = false,
}: {
  bucket: Exclude<HearingBucket, "no_hearing">;
  items: CourtCaseBrief[];
  defaultExpanded?: boolean;
  suppressEmptyCopy?: boolean;
  pilotMode?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const title = bucketLabel(bucket);
  const emptyCopy = pilotMode ? PILOT_EMPTY_COPY[bucket] : EMPTY_COPY[bucket];

  return (
    <section aria-labelledby={`court-bucket-${bucket}`} className={workflowCard}>
      <button
        type="button"
        id={`court-bucket-${bucket}`}
        className={`${workflowCardHeader} w-full text-left hover:bg-slate-100/80 transition-colors`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="text-xs text-slate-500 tabular-nums">— {items.length}</span>
        </div>
        <span className={workflowSectionTitle}>Hearings</span>
      </button>

      {expanded && (
        <div className="px-1 pb-1">
          {items.length === 0 ? (
            suppressEmptyCopy ? null : (
              <div className="flex items-start gap-3 px-4 py-5 text-sm text-slate-600 border-t border-dashed border-slate-200 mx-3 mb-3 rounded-md bg-slate-50/80">
                <Calendar className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                <p>{emptyCopy}</p>
              </div>
            )
          ) : (
            <CourtTodayDiaryTable items={items} pilotMode={pilotMode} />
          )}
        </div>
      )}
    </section>
  );
}
