"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

type BinDeleteAllButtonProps = {
  archivedCount: number;
};

export function BinDeleteAllButton({ archivedCount }: BinDeleteAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { push: showToast } = useToast();

  if (archivedCount === 0) return null;

  const handleDeleteAll = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/cases/bin/permanent-delete-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? "Failed to empty bin");
        }

        const n = typeof data?.deletedCount === "number" ? data.deletedCount : 0;
        showToast(`Permanently deleted ${n} archived case${n === 1 ? "" : "s"}.`);
        setShowConfirm(false);
        router.refresh();
      } catch (error) {
        showToast(`Delete all failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  };

  if (!showConfirm) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="gap-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete all ({archivedCount})
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 min-w-[220px]">
      <div className="flex items-start gap-2 text-danger">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-xs font-medium leading-snug">
          Permanently delete all {archivedCount} archived case{archivedCount === 1 ? "" : "s"}? This cannot be
          undone.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={handleDeleteAll} disabled={isPending} className="flex-1">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, delete all"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
