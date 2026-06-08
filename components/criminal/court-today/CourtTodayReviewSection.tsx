"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourtTodayCaseCard } from "./CourtTodayCaseCard";
import { bucketLabel } from "./courtCaseBrief";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { CourtCaseBrief } from "./types";

const SAMPLE_SIZE = 12;
const LOAD_MORE_STEP = 20;

function matchesReviewSearch(brief: CourtCaseBrief, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    brief.caseTitle,
    brief.clientLabel,
    brief.allegation,
    brief.primaryRouteTitle,
    brief.caseId,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function CourtTodayReviewSection({
  items,
  onEnrichCaseIds,
}: {
  items: CourtCaseBrief[];
  onEnrichCaseIds?: (caseIds: string[]) => void | Promise<void>;
}) {
  const pilotMode = isCriminalPilotMode();
  const total = items.length;
  const [sectionExpanded, setSectionExpanded] = useState(!pilotMode);
  const [reviewMode, setReviewMode] = useState<"idle" | "sample" | "search">("idle");
  const [visibleCount, setVisibleCount] = useState(SAMPLE_SIZE);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => items.filter((b) => matchesReviewSearch(b, search)),
    [items, search],
  );

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const canLoadMore = visibleCount < filtered.length;
  const showList = reviewMode === "sample" || (reviewMode === "search" && search.trim().length > 0);
  const visibleIdsKey = visible.map((b) => b.caseId).join(",");
  const sectionTitle = bucketLabel("no_hearing", { pilot: pilotMode });

  useEffect(() => {
    if (!onEnrichCaseIds || !showList || !visibleIdsKey) return;
    void onEnrichCaseIds(visibleIdsKey.split(",").filter(Boolean));
  }, [showList, visibleIdsKey, onEnrichCaseIds]);

  if (total === 0) {
    if (pilotMode) return null;
    return (
      <section aria-labelledby="court-bucket-no_hearing">
        <h2
          id="court-bucket-no_hearing"
          className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3"
        >
          {sectionTitle}
        </h2>
        <Card className="border-dashed border-border/60 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
          All matters on record have a hearing date safely extracted for scheduling.
        </Card>
      </section>
    );
  }

  const sectionClass = pilotMode
    ? "border-t border-slate-200 pt-4 mt-2"
    : "border-t border-border/50 pt-6";

  const headingClass = pilotMode
    ? "text-xs font-medium text-slate-600"
    : "text-sm font-semibold text-foreground uppercase tracking-wide";

  return (
    <section aria-labelledby="court-bucket-no_hearing" className={sectionClass}>
      <button
        type="button"
        id="court-bucket-no_hearing"
        className={`flex w-full items-center gap-2 text-left ${pilotMode ? "py-1" : "mb-0"}`}
        onClick={() => setSectionExpanded((v) => !v)}
        aria-expanded={sectionExpanded}
      >
        {sectionExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        )}
        <h2 className={headingClass}>
          {sectionTitle}
          <span className="font-normal text-slate-500 ml-1.5 tabular-nums">({total.toLocaleString()})</span>
        </h2>
      </button>

      {sectionExpanded && (
        <div className={pilotMode ? "mt-3 pl-5" : "mt-3"}>
          {!pilotMode && (
            <Card className="border-amber-500/25 bg-amber-500/5 px-4 py-3 mb-4">
              <p className="text-sm text-foreground leading-relaxed">
                Hearing dates were not safely extracted. Review bundle or listing papers before placing
                these matters in the diary.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dates are not guessed. Use the actions below to open a sample or search by client, title,
                or offence.
              </p>
            </Card>
          )}

          {pilotMode && (
            <p className="text-xs text-slate-500 mb-3 max-w-2xl">
              Hearing dates were not extracted from saved bundle data. Open a matter to confirm listing
              details — dates are not guessed.
            </p>
          )}

          {!showList ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size={pilotMode ? "sm" : "sm"}
                variant={pilotMode ? "outline" : "primary"}
                className={pilotMode ? "h-8 text-xs" : undefined}
                onClick={() => {
                  setReviewMode("sample");
                  setVisibleCount(SAMPLE_SIZE);
                  setSearch("");
                }}
              >
                Review sample
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={pilotMode ? "h-8 text-xs" : undefined}
                onClick={() => {
                  setReviewMode("search");
                  setVisibleCount(SAMPLE_SIZE);
                }}
              >
                Search review matters
              </Button>
            </div>
          ) : (
            <>
              {reviewMode === "search" && (
                <div className="mb-3 relative max-w-md">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleCount(SAMPLE_SIZE);
                    }}
                    placeholder="Filter by client, title, offence…"
                    className="w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    aria-label="Search review matters"
                    autoFocus
                  />
                </div>
              )}

              {reviewMode === "search" && search.trim() && (
                <p className="text-xs text-muted-foreground mb-3">
                  {filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"}
                  {filtered.length !== total ? ` of ${total.toLocaleString()} total` : ""}
                </p>
              )}

              {reviewMode === "sample" && (
                <p className="text-xs text-muted-foreground mb-3">
                  Showing a sample of {Math.min(SAMPLE_SIZE, total)} matters — not the full list.
                </p>
              )}

              {filtered.length === 0 ? (
                <Card className="border-dashed border-border/60 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
                  No matters match this search. Clear the filter or return to review actions.
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visible.map((brief) => (
                      <CourtTodayCaseCard key={brief.caseId} brief={brief} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {canLoadMore && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={pilotMode ? "h-8 text-xs" : undefined}
                        onClick={() =>
                          setVisibleCount((n) => Math.min(n + LOAD_MORE_STEP, filtered.length))
                        }
                      >
                        Show more
                      </Button>
                    )}
                    {!canLoadMore && filtered.length > SAMPLE_SIZE && (
                      <span className="text-xs text-muted-foreground">
                        Showing all {filtered.length.toLocaleString()} filtered matters.
                      </span>
                    )}
                    {visibleCount > SAMPLE_SIZE && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={pilotMode ? "h-8 text-xs" : undefined}
                        onClick={() => setVisibleCount(SAMPLE_SIZE)}
                      >
                        Show fewer
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={pilotMode ? "h-8 text-xs" : undefined}
                      onClick={() => {
                        setReviewMode("idle");
                        setSearch("");
                        setVisibleCount(SAMPLE_SIZE);
                      }}
                    >
                      Back to review actions
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
