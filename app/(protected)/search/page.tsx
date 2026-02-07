"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";

type CaseResult = { id: string; title: string };

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [results, setResults] = useState<CaseResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const url = q ? `/api/cases?q=${encodeURIComponent(q)}` : "/api/cases";
      const res = await fetch(url);
      const data = await res.json().catch(() => ({ cases: [] }));
      setResults(Array.isArray(data.cases) ? data.cases : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-accent">Search</h1>
        <p className="text-sm text-accent-soft">
          Search cases by name or reference.
        </p>
      </header>

      <form method="get" action="/search" className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-muted" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search cases by name or reference"
          className="w-full rounded-2xl border border-primary/20 bg-surface-muted pl-12 pr-4 py-4 text-accent placeholder:text-accent-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="mt-3 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <div className="space-y-4">
        {q && (
          <p className="text-sm text-accent-soft">
            {loading
              ? "Searching..."
              : results.length === 0
                ? `No cases match "${q}". Try another term or open Cases.`
                : `Found ${results.length} case${results.length === 1 ? "" : "s"}.`}
          </p>
        )}

        <Card>
          <ul className="space-y-3">
            {results.length > 0 &&
              results.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-muted/50 p-4 hover:border-primary/30"
                >
                  <div>
                    <span className="text-xs text-accent-muted">Criminal case</span>
                    <h3 className="font-semibold text-accent">{c.title}</h3>
                  </div>
                  <Link
                    href={`/cases/${c.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            {!loading && results.length === 0 && (
              <div className="py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-accent-muted" />
                <p className="mt-4 text-accent">
                  {q ? `No cases match "${q}".` : "No results yet."}
                </p>
                <p className="mt-2 text-sm text-accent-soft">
                  {q
                    ? "Try another term or "
                    : "Search by case name or reference above, or "}
                  <Link href="/cases" className="font-medium text-primary hover:underline">
                    open Cases
                  </Link>
                  .
                </p>
              </div>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
