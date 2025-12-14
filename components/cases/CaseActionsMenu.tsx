"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { MoreVertical, FilePlus, RefreshCw, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

type CaseActionsMenuProps = {
  caseId: string;
  onAddDocuments?: () => void;
  onRerunAnalysis?: () => void;
  onViewHistory?: () => void;
  onCaptureWinStory?: () => void;
  analysisStale?: boolean;
};

export function CaseActionsMenu({
  caseId,
  onAddDocuments,
  onRerunAnalysis,
  onViewHistory,
  onCaptureWinStory,
  analysisStale = false,
}: CaseActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Case actions"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onAddDocuments) {
                  startTransition(() => {
                    onAddDocuments();
                  });
                }
              }}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              <FilePlus className="h-4 w-4" />
              Add documents
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onRerunAnalysis) {
                  startTransition(() => {
                    onRerunAnalysis();
                  });
                }
              }}
              disabled={isPending}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
                analysisStale ? "text-warning hover:bg-warning/10" : "text-accent hover:bg-accent/10"
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Re-run analysis
              {analysisStale && (
                <span className="ml-auto text-xs text-warning">(New docs)</span>
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onViewHistory) {
                  startTransition(() => {
                    onViewHistory();
                  });
                }
              }}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              <History className="h-4 w-4" />
              Analysis history
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onCaptureWinStory) {
                  startTransition(() => {
                    onCaptureWinStory();
                  });
                }
              }}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              <Trophy className="h-4 w-4" />
              Capture Win Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

