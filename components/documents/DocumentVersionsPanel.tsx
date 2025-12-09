"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, History, RotateCcw, Eye } from "lucide-react";
import { format } from "date-fns";

type DocumentVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  versionName: string | null;
  fileName: string;
  fileSize: number | null;
  storageUrl: string | null;
  changeSummary: string | null;
  changedBy: string | null;
  createdAt: string;
  parentVersionId: string | null;
};

type DocumentVersionsPanelProps = {
  documentId: string;
};

export function DocumentVersionsPanel({ documentId }: DocumentVersionsPanelProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersions() {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/versions`);
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
        }
      } catch (error) {
        console.error("Failed to fetch document versions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, [documentId]);

  const handleRestore = async (versionId: string) => {
    if (!confirm("Restore this version? This will create a new version from the selected one.")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/versions/${versionId}/restore`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Version restored successfully");
        window.location.reload();
      } else {
        alert("Failed to restore version");
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
      alert("Failed to restore version");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading document versions...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold">Version History</h3>
        </div>
        <Badge variant="outline">{versions.length} version{versions.length !== 1 ? "s" : ""}</Badge>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, idx) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border ${
                idx === 0
                  ? "bg-cyan-950/20 border-cyan-800/30"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded bg-muted">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Version {version.versionNumber}
                        {version.versionName && ` - ${version.versionName}`}
                      </span>
                      {idx === 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {version.fileName}
                    </p>
                    {version.changeSummary && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {version.changeSummary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(version.createdAt), "dd MMM yyyy, HH:mm")}
                      </span>
                      {version.fileSize && (
                        <span>• {formatFileSize(version.fileSize)}</span>
                      )}
                      {version.changedBy && <span>• Changed by {version.changedBy}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {version.storageUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={version.storageUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                  )}
                  {idx > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(version.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

