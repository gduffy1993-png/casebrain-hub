"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Archive, MoreVertical } from "lucide-react";

type CaseArchiveButtonProps = {
  caseId: string;
  caseTitle: string;
};

export function CaseArchiveButton({ caseId, caseTitle }: CaseArchiveButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const { push: showToast } = useToast();

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to archive case");
      }

      showToast(`Case Archived: ${caseTitle} has been archived and removed from active views.`);

      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      showToast(`Archive Failed: ${error instanceof Error ? error.message : "Failed to archive case"}`);
    } finally {
      setIsArchiving(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-surface p-2 shadow-lg">
        <p className="text-xs text-accent/80">
          Archive this case? It will be removed from active views but kept in the audit trail.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleArchive}
            disabled={isArchiving}
            className="flex-1"
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowConfirm(false)}
            disabled={isArchiving}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setShowConfirm(true)}
      className="h-8 w-8 p-0"
      title="Archive case"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  );
}

