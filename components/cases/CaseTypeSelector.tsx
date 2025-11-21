"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "General" },
  { value: "pi", label: "Personal Injury (PI)" },
  { value: "clinical_negligence", label: "Clinical Negligence" },
];

type Props = {
  caseId: string;
  initialValue: string;
};

export function CaseTypeSelector({ caseId, initialValue }: Props) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  const handleSave = (nextValue: string) => {
    if (nextValue === value) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/practice-area`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ practiceArea: nextValue }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to update case type.");
        }
        setValue(nextValue);
        if (!payload?.dev) {
          pushToast("Case type updated.");
          router.refresh();
        } else {
          pushToast(payload.message ?? "Development mode: case type update skipped.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update case type.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/10 bg-surface-muted/60 p-3 text-sm text-accent/70">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        Case type
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={option.value === value ? "primary" : "secondary"}
            className="text-xs"
            disabled={pending}
            onClick={() => handleSave(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}


