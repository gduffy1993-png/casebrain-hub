"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Document = {
  id: string;
  name: string;
  created_at: string;
  type?: string;
  size?: number;
};

type EvidenceSelectorModalProps = {
  caseId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function EvidenceSelectorModal({
  caseId,
  onClose,
  onSuccess,
}: EvidenceSelectorModalProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCurrentSelection();
  }, [caseId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/documents`);
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSelection = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/analysis/version/latest`);
      if (response.ok) {
        const data = await response.json();
        if (data?.document_ids && Array.isArray(data.document_ids)) {
          setSelectedIds(new Set(data.document_ids));
        }
      }
    } catch (err) {
      // Silently fail - it's okay if there's no previous version
      console.warn("No previous version found, starting with empty selection");
    }
  };

  const toggleDocument = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError("Please select at least one document");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/analysis/rebuild`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_ids: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to rebuild analysis";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      // Success - close modal and refresh page data
      onSuccess?.();
      onClose();
      
      // Refresh the page to update all components
      router.refresh();
    } catch (err) {
      console.error("Failed to rebuild analysis:", err);
      // Keep modal open on error, show error message
      setError(err instanceof Error ? err.message : "Failed to rebuild analysis");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type?: string) => {
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("word") || type?.includes("docx")) return "📝";
    if (type?.includes("image")) return "🖼️";
    return "📎";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary/10">
          <h2 className="text-lg font-semibold text-accent">
            Select Evidence for Analysis
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-accent/60">Loading documents...</span>
            </div>
          ) : error && !documents.length ? (
            <div className="text-center py-12">
              <p className="text-sm text-warning">{error}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-accent/40 mb-4" />
              <p className="text-sm text-accent/60">No documents found for this case.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-accent/60 mb-4">
                Select documents to include in the strategic analysis bundle. Check the box next to each document you want to analyze.
              </p>
              {documents.map((doc) => {
                const isSelected = selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-primary/10 bg-surface-muted/70 hover:border-primary/20"
                    }`}
                    onClick={() => toggleDocument(doc.id)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocument(doc.id);
                      }}
                      className="flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-accent/40" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFileIcon(doc.type)}</span>
                        <p className="text-sm font-medium text-accent truncate">
                          {doc.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-accent/50">
                        <span>
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {doc.size && (
                          <span>{formatFileSize(doc.size)}</span>
                        )}
                        {doc.type && (
                          <span className="uppercase">
                            {doc.type.split("/").pop()?.split(".").pop() || "file"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-primary/10 bg-surface-muted/30">
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-warning/20 bg-warning/5">
              <p className="text-sm text-warning">{error}</p>
            </div>
          )}
          {selectedIds.size === 0 && !error && (
            <div className="mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-sm text-accent/70">Select at least one document to run analysis.</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-accent/60">
              {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedIds.size === 0}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    Run New Analysis (v+1)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

