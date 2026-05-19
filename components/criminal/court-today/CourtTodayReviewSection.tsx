"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourtTodayCaseCard } from "./CourtTodayCaseCard";
import { bucketLabel } from "./courtCaseBrief";
import type { CourtCaseBrief } from "./types";

const INITIAL_VISIBLE = 12;
const LOAD_MORE_STEP = 20;
const AUTO_COLLAPSE_THRESHOLD = 20;

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

export function CourtTodayReviewSection({ items }: { items: CourtCaseBrief[] }) {
  const total = items.length;
  const [expanded, setExpanded] = useState(total <= AUTO_COLLAPSE_THRESHOLD);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
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
  const remaining = filtered.length - visible.length;

  const handleExpand = () => {
    setExpanded(true);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleLoadMore = () => {
    setVisibleCount((n) => Math.min(n + LOAD_MORE_STEP, filtered.length));
  };

  if (total === 0) {
    return (
      <section aria-labelledby="court-bucket-no_hearing">
        <h2
          id="court-bucket-no_hearing"
          className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3"
        >
          {bucketLabel("no_hearing")}
        </h2>
        <Card className="border-dashed border-border/60 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
          All matters on record have a hearing date safely extracted for scheduling.
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="court-bucket-no_hearing" className="border-t border-border/50 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2
            id="court-bucket-no_hearing"
            className="text-sm font-semibold text-foreground uppercase tracking-wide"
          >
            {bucketLabel("no_hearing")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Hearing dates must be on the file — dates are not guessed.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Collapse list
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              Show list
            </>
          )}
        </Button>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5 px-4 py-3 mb-4">
        <p className="text-sm font-medium text-foreground">
          {total.toLocaleString()} matter{total === 1 ? "" : "s"} need hearing review
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No hearing date safely detected on the current file record. Review dates on the bundle or
          listing papers — only a sample is shown below until you expand or search.
        </p>
      </Card>

      {!expanded ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleExpand}>
            Show first {Math.min(INITIAL_VISIBLE, total)} matters
          </Button>
          {total > INITIAL_VISIBLE && (
            <span className="text-xs text-muted-foreground self-center">
              +{(total - INITIAL_VISIBLE).toLocaleString()} more not loaded
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(INITIAL_VISIBLE);
              }}
              placeholder="Filter by client, title, offence…"
              className="w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              aria-label="Filter review matters"
            />
          </div>

          {search.trim() && (
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"}
              {filtered.length !== total ? ` of ${total.toLocaleString()} total` : ""}
            </p>
          )}

          {filtered.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
              No matters match this filter. Clear search to see the review sample again.
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
                  <Button type="button" variant="outline" size="sm" onClick={handleLoadMore}>
                    Show more ({Math.min(LOAD_MORE_STEP, remaining).toLocaleString()} of{" "}
                    {remaining.toLocaleString()} remaining)
                  </Button>
                )}
                {!canLoadMore && filtered.length > INITIAL_VISIBLE && (
                  <span className="text-xs text-muted-foreground">
                    Showing all {filtered.length.toLocaleString()} filtered matters.
                  </span>
                )}
                {visibleCount > INITIAL_VISIBLE && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                  >
                    Show fewer
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
