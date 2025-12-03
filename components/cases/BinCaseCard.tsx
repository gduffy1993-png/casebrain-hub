"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { RotateCcw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BinCaseCardProps = {
  caseId: string;
  title: string;
  summary: string | null;
  practiceArea: string;
  archivedAt: string | null;
};

export function BinCaseCard({
  caseId,
  title,
  summary,
  practiceArea,
  archivedAt,
}: BinCaseCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { push: showToast } = useToast();

  const handleRestore = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to restore case");
        }

        showToast(`Case restored: ${title} has been moved back to active cases.`);
        router.refresh();
      } catch (error) {
        showToast(`Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  };

  const handlePermanentDelete = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/permanent-delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to delete case");
        }

        showToast(`Case permanently deleted: ${title} has been removed forever.`);
        router.refresh();
      } catch (error) {
        showToast(`Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="group relative rounded-xl border border-white/10 bg-surface-muted/50 p-4 transition-all hover:border-white/20 hover:bg-surface-muted">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-accent truncate">{title}</h3>
            <Badge variant="secondary" className="flex-shrink-0">
              {practiceArea}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-accent-soft line-clamp-2">
            {summary ?? "No summary available"}
          </p>
          <p className="mt-2 text-xs text-accent-muted">
            Archived: {formatDate(archivedAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!showDeleteConfirm ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRestore}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Delete forever?</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handlePermanentDelete}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Yes, delete"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

