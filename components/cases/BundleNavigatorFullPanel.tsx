"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Search, 
  Calendar, 
  List,
  FileText,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { 
  CaseBundle, 
  TOCSection, 
  BundleTimelineEntry,
  BundleSearchResult,
  BundleOverview,
  BundleIssue,
  BundleContradiction,
} from "@/lib/types/casebrain";

type BundleNavigatorFullPanelProps = {
  caseId: string;
  bundle: CaseBundle;
};

type ActiveTab = "toc" | "timeline" | "search" | "issues" | "contradictions";

export function BundleNavigatorFullPanel({ caseId, bundle }: BundleNavigatorFullPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("toc");
  const [toc, setToc] = useState<TOCSection[]>([]);
  const [timeline, setTimeline] = useState<BundleTimelineEntry[]>([]);
  const [issues, setIssues] = useState<BundleIssue[]>([]);
  const [contradictions, setContradictions] = useState<BundleContradiction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BundleSearchResult[]>([]);
  const [overview, setOverview] = useState<BundleOverview | null>(null);
  const [selectedSection, setSelectedSection] = useState<TOCSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch overview, TOC, timeline, issues, and contradictions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [overviewRes, tocRes, timelineRes, issuesRes, contradictionsRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/bundle/overview`),
          fetch(`/api/cases/${caseId}/bundle/toc`),
          fetch(`/api/cases/${caseId}/bundle/timeline`),
          fetch(`/api/cases/${caseId}/bundle/issues`),
          fetch(`/api/cases/${caseId}/bundle/contradictions`),
        ]);

        if (overviewRes.ok) {
          const data = await overviewRes.json();
          setOverview(data.overview);
        }

        if (tocRes.ok) {
          const data = await tocRes.json();
          setToc(data.toc ?? []);
        }

        if (timelineRes.ok) {
          const data = await timelineRes.json();
          setTimeline(data.timeline ?? []);
        }

        if (issuesRes.ok) {
          const data = await issuesRes.json();
          setIssues(data.issues ?? []);
        }

        if (contradictionsRes.ok) {
          const data = await contradictionsRes.json();
          setContradictions(data.contradictions ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch bundle data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (bundle.analysisLevel === "full" && bundle.status === "completed") {
      fetchData();
    }
  }, [caseId, bundle]);

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/cases/${caseId}/bundle/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  if (bundle.analysisLevel !== "full" || bundle.status !== "completed") {
    return null;
  }

  if (isLoading) {
    return (
      <Card title="Bundle Navigator">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const tabs = [
    { id: "toc" as const, label: "Contents", icon: <List className="h-4 w-4" />, count: toc.length },
    { id: "timeline" as const, label: "Timeline", icon: <Calendar className="h-4 w-4" />, count: timeline.length },
    { id: "issues" as const, label: "Issues", icon: <FileText className="h-4 w-4" />, count: issues.length },
    { id: "contradictions" as const, label: "Conflicts", icon: <AlertTriangle className="h-4 w-4" />, count: contradictions.length },
    { id: "search" as const, label: "Search", icon: <Search className="h-4 w-4" /> },
  ];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Bundle Navigator
          <Badge variant="success" size="sm">Full Analysis</Badge>
        </div>
      }
      description={`${bundle.bundleName} • ${bundle.totalPages} pages`}
    >
      {/* Overview Stats */}
      {overview && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <StatBox label="Pages" value={overview.totalPages} />
          <StatBox label="Sections" value={Object.keys(overview.docTypeCounts).length} />
          <StatBox label="Issues" value={overview.issueCount} />
          <StatBox label="Dates" value={overview.keyDatesCount} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b border-white/10 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-accent-soft hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* TOC Tab */}
        {activeTab === "toc" && (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            {/* Section List */}
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
              {toc.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className={`w-full flex items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors ${
                    selectedSection?.id === section.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-white/5"
                  }`}
                >
                  <FileText className="h-4 w-4 text-accent-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-accent truncate">{section.title}</p>
                    <p className="text-[10px] text-accent-muted">
                      Pages {section.pageStart}–{section.pageEnd}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-accent-muted flex-shrink-0" />
                </button>
              ))}
              {toc.length === 0 && (
                <p className="text-sm text-accent-muted text-center py-8">
                  No sections detected
                </p>
              )}
            </div>

            {/* Section Detail */}
            <div className="rounded-xl border border-white/10 bg-surface-muted/30 p-4">
              {selectedSection ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-accent">{selectedSection.title}</h4>
                    <Badge variant="outline" size="sm">
                      {selectedSection.docType}
                    </Badge>
                  </div>
                  <p className="text-xs text-accent-muted mb-3">
                    Pages {selectedSection.pageStart} – {selectedSection.pageEnd}
                  </p>
                  <div className="rounded-lg bg-surface-muted/50 p-3">
                    <p className="text-sm text-accent-soft whitespace-pre-wrap">
                      {selectedSection.summary || "No summary available"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <FileText className="h-10 w-10 text-accent-muted" />
                  <p className="mt-3 text-sm text-accent-muted">
                    Select a section to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {timeline.map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  entry.importance === "high"
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-surface-muted/30"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                  entry.importance === "high" ? "bg-primary/20" : "bg-accent/10"
                }`}>
                  <Calendar className={`h-4 w-4 ${
                    entry.importance === "high" ? "text-primary" : "text-accent-muted"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-accent">{entry.date}</span>
                    {entry.importance === "high" && (
                      <Badge variant="primary" size="sm">Key Date</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-accent-soft">{entry.event}</p>
                  <p className="mt-1 text-[10px] text-accent-muted">
                    Source: {entry.source}
                  </p>
                </div>
              </div>
            ))}
            {timeline.length === 0 && (
              <p className="text-sm text-accent-muted text-center py-8">
                No dates extracted from bundle
              </p>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === "issues" && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-lg border p-3 ${
                  issue.overallStrength === "strong"
                    ? "bg-success/5 border-success/20"
                    : issue.overallStrength === "weak"
                      ? "bg-warning/5 border-warning/20"
                      : "bg-surface-muted/30 border-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-accent text-sm">{issue.issue}</h4>
                  <Badge
                    variant={
                      issue.overallStrength === "strong" ? "success" :
                      issue.overallStrength === "weak" ? "warning" :
                      "outline"
                    }
                    size="sm"
                  >
                    {issue.overallStrength}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-accent-muted">
                  <Badge variant="outline" size="sm">{issue.type}</Badge>
                  <span>{issue.supportingSections.length} supporting section(s)</span>
                </div>
              </div>
            ))}
            {issues.length === 0 && (
              <p className="text-sm text-accent-muted text-center py-8">
                No issues detected in bundle
              </p>
            )}
          </div>
        )}

        {/* Contradictions Tab */}
        {activeTab === "contradictions" && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {contradictions.map((contradiction) => (
              <div
                key={contradiction.id}
                className="rounded-lg border border-danger/20 bg-danger/5 p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent">
                      {contradiction.description}
                    </p>
                    <Badge
                      variant={
                        contradiction.confidence === "high" ? "danger" :
                        contradiction.confidence === "medium" ? "warning" :
                        "outline"
                      }
                      size="sm"
                      className="mt-1"
                    >
                      {contradiction.confidence} confidence
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {contradiction.sectionsInvolved.map((section, idx) => (
                    <div key={idx} className="text-xs text-accent-muted">
                      • Pages {section.pageStart}–{section.pageEnd}: {section.position}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-danger/80">
                  Impact: {contradiction.potentialImpact}
                </p>
              </div>
            ))}
            {contradictions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <AlertTriangle className="h-6 w-6 text-success" />
                </div>
                <p className="mt-3 text-sm text-accent-muted">
                  No contradictions detected
                </p>
                <p className="text-xs text-accent-muted/70 mt-1">
                  Bundle appears internally consistent
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search within bundle..."
                  className="w-full rounded-lg border border-white/10 bg-surface-muted pl-10 pr-4 py-2 text-sm text-accent"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || searchQuery.length < 2}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {/* Results */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-surface-muted/30 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-accent">
                      Pages {result.pageStart}–{result.pageEnd}
                    </span>
                    <Badge variant="outline" size="sm">
                      {Math.round(result.relevance * 100)}% match
                    </Badge>
                  </div>
                  <p className="text-sm text-accent-soft">
                    ...{result.context}...
                  </p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <p className="text-sm text-accent-muted text-center py-8">
                  No results found for "{searchQuery}"
                </p>
              )}
              {!searchQuery && (
                <p className="text-sm text-accent-muted text-center py-8">
                  Enter a search term to find content in the bundle
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-muted/50 p-2 text-center">
      <p className="text-lg font-bold text-accent">{value}</p>
      <p className="text-[10px] text-accent-muted">{label}</p>
    </div>
  );
}

