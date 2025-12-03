"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";
import { useToast } from "@/components/Toast";

type PracticeAreaSelectorProps = {
  caseId: string;
  currentPracticeArea: PracticeArea;
};

export function PracticeAreaSelector({
  caseId,
  currentPracticeArea,
}: PracticeAreaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<PracticeArea>(currentPracticeArea);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  const currentOption = PRACTICE_AREA_OPTIONS.find(
    (opt) => opt.value === currentPracticeArea,
  );
  const selectedOption = PRACTICE_AREA_OPTIONS.find(
    (opt) => opt.value === selected,
  );

  const handleChange = async (newValue: PracticeArea) => {
    if (newValue === currentPracticeArea) {
      setIsOpen(false);
      return;
    }

    setSelected(newValue);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/practice-area`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceArea: newValue }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update practice area");
      }

      pushToast(`Practice area updated to ${selectedOption?.label ?? newValue}`);
      router.refresh();
    } catch (error) {
      // Revert on error
      setSelected(currentPracticeArea);
      pushToast(
        error instanceof Error
          ? error.message
          : "Failed to update practice area",
      );
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold uppercase tracking-wide text-accent/60 mb-2">
        Solicitor role for this case
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={clsx(
            "w-full flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-surface px-4 py-3 text-sm text-accent shadow-sm outline-none transition-all",
            "hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/40",
            isUpdating && "opacity-50 cursor-not-allowed",
          )}
        >
          <span className="flex-1 text-left">
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : (
              currentOption?.label ?? currentPracticeArea
            )}
          </span>
          <ChevronDown
            className={clsx(
              "h-4 w-4 text-accent-muted transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && !isUpdating && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-2xl border border-primary/20 bg-surface shadow-lg max-h-96 overflow-y-auto">
              {PRACTICE_AREA_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange(option.value)}
                  className={clsx(
                    "w-full text-left px-4 py-3 text-sm transition-colors",
                    "hover:bg-primary/10 first:rounded-t-2xl last:rounded-b-2xl",
                    selected === option.value && "bg-primary/20 text-primary",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-accent/60 mt-0.5">
                      {option.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

