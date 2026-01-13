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
  onPhase2Request?: () => void;
  showPhase2CTA?: boolean;
};

const POSITION_TEMPLATES = [
  {
    label: "Reserved pending disclosure",
    text: "Position reserved pending full disclosure. Awaiting CCTV, witness statements, and forensic evidence before committing to a defence strategy.",
  },
  {
    label: "Deny intent (s18) / alternative s20",
    text: "Defence position: Deny intent to cause GBH (s18). Alternative position: Accept act but dispute intent - alternative charge s20 (unlawful wounding) may be appropriate. Awaiting full disclosure to confirm.",
  },
  {
    label: "Accept act, dispute intent (s18→s20)",
    text: "Defence position: Accept the act occurred but dispute intent to cause GBH. Seeking charge reduction from s18 to s20 (unlawful wounding). Basis: [to be completed after disclosure].",
  },
  {
    label: "Self-defence / lawful excuse",
    text: "Defence position: Self-defence / lawful excuse. [Details to be completed after full disclosure and client instructions].",
  },
];

export function RecordPositionModal({
  caseId,
  isOpen,
  onClose,
  onSuccess,
  initialText = "",
  currentPhase = 1,
  onPhase2Request,
  showPhase2CTA = false,
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

      showToast("Defence position saved. Phase 2 is now unlocked — you can now choose how to run the case.", "success");
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
          {/* Template Buttons */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Common defence positions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_TEMPLATES.map((template, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setPositionText(template.text)}
                  disabled={isSaving}
                  className="text-left justify-start h-auto py-2 px-3 text-xs"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3">
              This records the legal defence position as it stands today. You will choose case strategy (trial/reduction/plea) next.
            </p>
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
        <div className="flex flex-col gap-3 p-6 border-t border-border">
          {showPhase2CTA && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-300/80 flex-1">
                Defence position saved. Phase 2 is now unlocked — you can now choose how to run the case.
              </p>
              {onPhase2Request && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onPhase2Request();
                    onClose();
                  }}
                  className="text-xs"
                >
                  Go to Phase 2
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
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
    </div>
  );
}

