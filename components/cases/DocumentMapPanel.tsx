"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import {
  buildDocumentMap,
  getCategoryDisplayName,
  getCategoryColor,
  getConfidenceBadgeColor,
  type DocumentMapSummary,
  type DocumentClassification,
} from "@/lib/core/documents";
import type { PracticeArea } from "@/lib/types/casebrain";

interface DocumentMapPanelProps {
  documents: Array<{
    id: string;
    name: string;
    type?: string;
    created_at?: string;
    file_size?: number;
  }>;
  practiceArea: PracticeArea | string | null | undefined;
  className?: string;
}

export function DocumentMapPanel({
  documents,
  practiceArea,
  className = "",
}: DocumentMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const documentMap = useMemo(() => {
    return buildDocumentMap(documents, practiceArea);
  }, [documents, practiceArea]);

  const filteredDocs = useMemo(() => {
    if (!filter) return documentMap.documents;
    if (filter === "unclassified") {
      return documentMap.documents.filter((d) => d.matchedEvidenceIds.length === 0);
    }
    if (filter === "core") {
      return documentMap.documents.filter((d) => d.isCore);
    }
    return documentMap.documents.filter((d) => d.primaryCategory === filter);
  }, [documentMap, filter]);

  const categoryButtons = useMemo(() => {
    const categories = Object.entries(documentMap.byCategory).sort(
      (a, b) => b[1] - a[1]
    );
    return categories;
  }, [documentMap.byCategory]);

  if (documents.length === 0) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <FolderOpen className="h-4 w-4 text-purple-400" />
            Document Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-white/50">No documents uploaded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <FolderOpen className="h-4 w-4 text-purple-400" />
            Document Map
          </CardTitle>
          <Badge
            className={
              documentMap.coverage >= 80
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : documentMap.coverage >= 50
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
            }
          >
            {documentMap.coverage}% Core Coverage
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/60">
            <span>
              Core Evidence: {documentMap.coreDocumentsFound}/
              {documentMap.coreDocumentsRequired}
            </span>
            <span>{documentMap.totalDocuments} total documents</span>
          </div>
          <Progress
            value={documentMap.coverage}
            className="h-2 bg-white/10"
          />
        </div>

        {/* Missing Core Evidence Warning */}
        {documentMap.missingCoreEvidence.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-400">
                  Missing Core Evidence
                </p>
                <ul className="mt-1 space-y-0.5">
                  {documentMap.missingCoreEvidence.slice(0, 4).map((e) => (
                    <li key={e.id} className="text-[11px] text-white/60">
                      • {e.label}
                    </li>
                  ))}
                  {documentMap.missingCoreEvidence.length > 4 && (
                    <li className="text-[11px] text-white/40">
                      +{documentMap.missingCoreEvidence.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              filter === null
                ? "bg-purple-500/30 text-purple-300"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            All ({documentMap.totalDocuments})
          </button>
          <button
            onClick={() => setFilter("core")}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              filter === "core"
                ? "bg-green-500/30 text-green-300"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            Core ({documentMap.coreDocumentsFound})
          </button>
          {categoryButtons.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filter === cat
                  ? getCategoryColor(cat)
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {getCategoryDisplayName(cat)} ({count})
            </button>
          ))}
          {documentMap.unclassifiedDocuments > 0 && (
            <button
              onClick={() => setFilter("unclassified")}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filter === "unclassified"
                  ? "bg-slate-500/30 text-slate-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Unclassified ({documentMap.unclassifiedDocuments})
            </button>
          )}
        </div>

        {/* Document List */}
        <div className="space-y-2">
          {(expanded ? filteredDocs : filteredDocs.slice(0, 5)).map((doc) => (
            <DocumentRow key={doc.documentId} doc={doc} />
          ))}

          {filteredDocs.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/5 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show {filteredDocs.length - 5} more
                </>
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentRow({ doc }: { doc: DocumentClassification }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <FileText className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">{doc.documentName}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {doc.isCore && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-green-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Core
            </span>
          )}
          {doc.primaryCategory && (
            <Badge
              variant="outline"
              className={`text-[9px] py-0 px-1.5 ${getCategoryColor(doc.primaryCategory)}`}
            >
              {getCategoryDisplayName(doc.primaryCategory)}
            </Badge>
          )}
          {doc.matchedEvidenceLabels.length > 0 && (
            <span className="text-[9px] text-white/40">
              {doc.matchedEvidenceLabels[0]}
              {doc.matchedEvidenceLabels.length > 1 && (
                <span className="text-white/30">
                  {" "}
                  +{doc.matchedEvidenceLabels.length - 1}
                </span>
              )}
            </span>
          )}
          {doc.matchedEvidenceIds.length === 0 && (
            <span className="text-[9px] text-white/30 italic">
              Unclassified
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={`text-[9px] py-0 px-1.5 shrink-0 ${getConfidenceBadgeColor(doc.confidence)}`}
      >
        {doc.confidence}
      </Badge>
    </div>
  );
}

