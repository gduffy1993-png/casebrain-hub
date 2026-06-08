"use client";

import { useState, useTransition } from "react";
import { X, Trophy, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type CaptureWinStoryModalProps = {
  caseId: string;
  caseTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CaptureWinStoryModal({
  caseId,
  caseTitle,
  isOpen,
  onClose,
  onSuccess,
}: CaptureWinStoryModalProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) {
      setResult({ success: false, error: "Title is required" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/win-stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), note: note.trim() || undefined }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to capture win story");
        }

        setResult({
          success: true,
          message: "Win story captured successfully",
        });

        // Clear form and close after delay
        setTimeout(() => {
          setTitle("");
          setNote("");
          setResult(null);
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture win story",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-accent">Capture Win Story</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isPending}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-accent/70 mb-4">
          Capturing snapshot for: <span className="font-medium">{caseTitle}</span>
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="win-title" className="text-sm font-medium text-accent">
              Title <span className="text-danger">*</span>
            </Label>
            <Input
              id="win-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              placeholder="e.g., Successful settlement after evidence collection"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="win-note" className="text-sm font-medium text-accent">
              Note (optional)
            </Label>
            <Textarea
              id="win-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              placeholder="Add any additional context about this win..."
              rows={4}
              className="mt-1"
            />
          </div>

          {result && (
            <div
              className={`rounded-xl p-4 ${
                result.success
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <p className="text-sm font-medium">
                  {result.success ? result.message : result.error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-accent/10">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !title.trim()}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  Capture Win Story
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

