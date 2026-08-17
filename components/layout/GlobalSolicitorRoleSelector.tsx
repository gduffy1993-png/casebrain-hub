"use client";

import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";

/**
 * Global solicitor role selector – criminal-only (per plan).
 * Shows only "Criminal Defence Solicitor".
 */
const CRIMINAL_ONLY_OPTIONS = [
  { value: "criminal" as const, label: "Criminal Defence Solicitor" },
];

export function GlobalSolicitorRoleSelector() {
  const { currentPracticeArea } = usePracticeArea();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className="hidden whitespace-nowrap text-xs text-accent/60 lg:inline">I&apos;m working as:</label>
      <select
        value={currentPracticeArea}
        onChange={() => {}}
        className="w-[188px] max-w-[42vw] min-w-0 rounded-lg border border-primary/20 bg-surface px-2 py-1.5 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 sm:w-[220px] sm:px-3"
        aria-label="Practice area (criminal only)"
      >
        {CRIMINAL_ONLY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

