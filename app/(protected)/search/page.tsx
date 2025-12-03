import Link from "next/link";
import { requireAuthContext } from "@/lib/auth";
import { semanticSearch, findSimilarCases } from "@/lib/semantic-search";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  FolderOpen, 
  Mail, 
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

type SearchPageProps = {
  searchParams: { q?: string; category?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { orgId } = await requireAuthContext();
  const query = searchParams.q?.trim() ?? "";
  const category = (searchParams.category as "cases" | "documents" | "letters" | "all") ?? "all";
  
  const results = query 
    ? await semanticSearch({ query, orgId, category, limit: 25 })
    : [];

  const categoryIcons = {
    case: <FolderOpen className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    letter: <Mail className="h-4 w-4" />,
  };

  const categoryColors = {
    case: "bg-primary/20 text-primary border-primary/30",
    document: "bg-secondary/20 text-secondary border-secondary/30",
    letter: "bg-success/20 text-success border-success/30",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-accent">Semantic Search</h1>
            <p className="text-sm text-accent-soft">
              Find cases, documents, and letters using natural language
            </p>
          </div>
        </div>
      </header>

      {/* Search Form */}
      <form className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-muted" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="e.g., 'damp mould children asthma' or 'landlord ignored complaints'"
            className="w-full rounded-2xl border border-primary/20 bg-surface-muted pl-12 pr-4 py-4 text-accent placeholder:text-accent-muted shadow-lg shadow-black/10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        
        {/* Category Filters */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-accent-soft">Filter:</span>
          <div className="flex gap-2">
            {(["all", "cases", "documents", "letters"] as const).map((cat) => (
              <button
                key={cat}
                type="submit"
                name="category"
                value={cat}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  category === cat
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-accent-soft hover:bg-primary/10"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {query && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-accent-soft">
              Found <span className="font-semibold text-accent">{results.length}</span> results for "{query}"
            </p>
            {results.length > 0 && (
              <Badge variant="primary" size="sm" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Ranked by relevance
              </Badge>
            )}
          </div>
        )}

        <Card>
          <ul className="space-y-3">
            {results.map((result, index) => (
              <li
                key={`${result.type}-${result.id}`}
                className="group rounded-xl border border-white/10 bg-surface-muted/50 p-4 transition-all hover:border-primary/30 hover:bg-surface-muted"
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    #{index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${categoryColors[result.type]}`}>
                        {categoryIcons[result.type]}
                        {result.type.toUpperCase()}
                      </span>
                      {result.practiceArea && (
                        <Badge variant="outline" size="sm">
                          {result.practiceArea.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <span className="text-xs text-accent-muted">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    </div>
                    
                    <h3 className="mt-2 font-semibold text-accent group-hover:text-primary transition-colors">
                      {result.title}
                    </h3>
                    
                    <p className="mt-1 text-sm text-accent-soft line-clamp-2">
                      {result.summary || result.matchedContent}
                    </p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-accent-muted">
                        {new Date(result.createdAt).toLocaleDateString("en-GB")}
                      </span>
                      <Link
                        href={`/cases/${result.caseId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        View Case
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            
            {results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <p className="mt-4 text-lg font-medium text-accent">
                  {query ? "No results found" : "Start your search"}
                </p>
                <p className="mt-2 max-w-md text-sm text-accent-soft">
                  {query
                    ? "Try different keywords or broaden your search terms."
                    : "Search using natural language like 'damp mould children' or 'landlord ignored complaints for years'"}
                </p>
              </div>
            )}
          </ul>
        </Card>
      </div>

      {/* Search Tips */}
      {!query && (
        <Card title="Search Tips" description="Get better results with these techniques">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <h4 className="font-semibold text-accent">Housing Examples</h4>
              <ul className="mt-2 space-y-1 text-sm text-accent-soft">
                <li>• "damp mould children asthma"</li>
                <li>• "landlord ignored complaints"</li>
                <li>• "no heating winter months"</li>
              </ul>
            </div>
            <div className="rounded-xl bg-secondary/5 border border-secondary/10 p-4">
              <h4 className="font-semibold text-accent">PI Examples</h4>
              <ul className="mt-2 space-y-1 text-sm text-accent-soft">
                <li>• "rear end collision whiplash"</li>
                <li>• "slip trip wet floor"</li>
                <li>• "work injury scaffolding"</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
