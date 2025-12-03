"use client";

import { useState, useTransition } from "react";
import { Search, FileText, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SearchHit } from "@/lib/types/casebrain";

type InCaseSearchBoxProps = {
  caseId: string;
};

export function InCaseSearchBox({ caseId }: InCaseSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/cases/${caseId}/search?q=${encodeURIComponent(query)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.hits ?? []);
        } else {
          setResults([]);
        }
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      }
    });
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <Card
      title="Search Case Documents"
      description="Find specific clauses, terms, or content within this case."
    >
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for keywords, clauses, dates..."
            className="w-full rounded-xl border border-primary/20 bg-white py-2.5 pl-10 pr-10 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/40 hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" variant="primary" disabled={isPending || !query.trim()}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {hasSearched && (
        <div className="mt-4">
          {results.length > 0 ? (
            <ul className="space-y-3">
              {results.map((hit, index) => (
                <li
                  key={`${hit.documentId}-${index}`}
                  className="rounded-xl border border-primary/10 bg-surface-muted/80 p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-accent">
                      {hit.documentTitle}
                    </span>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase text-accent/50">
                      {hit.matchType}
                    </span>
                    {hit.score !== undefined && (
                      <span className="ml-auto text-[10px] text-accent/40">
                        {Math.round(hit.score * 100)}% match
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-accent/70">{hit.snippet}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-accent/60">
              No matches found for "{query}". Try different keywords.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

