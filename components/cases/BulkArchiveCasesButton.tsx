"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Archive, Loader2, Trash2 } from "lucide-react";

type BulkArchiveCasesButtonProps = {
  caseIds: string[];
  visibleCount: number;
};

export function BulkArchiveCasesButton({
  caseIds,
  visibleCount,
}: BulkArchiveCasesButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { push: showToast } = useToast();

  if (!visibleCount) return null;

  const handleArchiveMany = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/cases/archive-many`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseIds }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to archive cases");
        }

        const data = await response.json().catch(() => null);
        const archivedCount = data?.archivedCount ?? visibleCount;

        showToast(`Archived ${archivedCount} case(s). They’re in your Bin.`);
        router.refresh();
      } catch (error) {
        showToast(
          `Archive failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setShowConfirm(false);
      }
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          onClick={handleArchiveMany}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Archive all ({visibleCount})
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={() => setShowConfirm(true)}
      disabled={isPending || visibleCount <= 0}
      className="gap-2"
      title="Archive all currently shown cases (moves them to the Bin)"
    >
      <Archive className="h-4 w-4" />
      Delete all shown ({visibleCount})
    </Button>
  );
}

