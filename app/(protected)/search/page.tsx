import Link from "next/link";
import { requireAuthContext } from "@/lib/auth";
import { globalSearch } from "@/lib/search";
import { Card } from "@/components/ui/card";

type SearchPageProps = {
  searchParams: { q?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { orgId } = await requireAuthContext();
  const query = searchParams.q?.trim() ?? "";
  const results = query ? await globalSearch(query, orgId) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Search CaseBrain Hub
        </h1>
        <p className="text-sm text-accent/60">
          Search cases, documents, and letters by party, reference, or content.
        </p>
      </header>

      <form className="flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search clients, opponents, case refs..."
          className="flex-1 rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card"
        >
          Search
        </button>
      </form>

      <Card>
        <ul className="space-y-4">
          {results.map((result) => (
            <li
              key={`${result.type}-${result.id}`}
              className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent/50">
                  {result.type}
                </p>
                <p className="text-xs text-accent/40">
                  Updated {new Date(result.updated_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-accent">
                {result.title}
              </h2>
              <p className="mt-2 text-sm text-accent/70">{result.snippet}</p>
              <Link
                href={
                  result.type === "case"
                    ? `/cases/${result.id}`
                    : result.type === "document"
                      ? `/cases/${result.caseId ?? ""}`
                      : `/cases/${result.caseId ?? ""}`
                }
                className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                View
              </Link>
            </li>
          ))}
          {!results.length && (
            <p className="text-sm text-accent/60">
              {query
                ? "No records matched your search. Try a different term."
                : "Search across all cases in under a second."}
            </p>
          )}
        </ul>
      </Card>
    </div>
  );
}

