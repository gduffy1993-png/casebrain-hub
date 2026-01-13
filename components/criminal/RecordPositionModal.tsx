"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type RecordPositionModalProps = {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialText?: string;
  currentPhase?: number;
};

export function RecordPositionModal({
  caseId,
  isOpen,
  onClose,
  onSuccess,
  initialText = "",
  currentPhase = 1,
}: RecordPositionModalProps) {
  const [positionText, setPositionText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);
  const { push: showToast } = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!positionText.trim()) {
      showToast("Position text cannot be empty", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          position_text: positionText.trim(),
          phase: currentPhase,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save position" }));
        throw new Error(errorData.error || `Failed to save position (${response.status})`);
      }

      showToast("Position recorded successfully", "success");
      onSuccess();
      onClose();
      setPositionText("");
    } catch (error) {
      console.error("[RecordPositionModal] Failed to save position:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to save position. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPositionText(initialText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Record Current Position</h2>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Position Text <span className="text-danger">*</span>
            </label>
            <textarea
              value={positionText}
              onChange={(e) => setPositionText(e.target.value)}
              placeholder="Enter the current defence position..."
              className="w-full min-h-[200px] px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              disabled={isSaving}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {positionText.length} characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !positionText.trim()}
            className="min-w-[100px]"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

