"use client";

import { useRouter } from "next/navigation";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";
import type { PracticeArea } from "@/lib/types/casebrain";

/**
 * Global solicitor role selector in the top bar
 * Allows users to quickly switch between practice areas
 */
export function GlobalSolicitorRoleSelector() {
  const router = useRouter();
  const { currentPracticeArea, setPracticeArea } = usePracticeArea();

  const handleChange = (newPracticeArea: PracticeArea) => {
    if (newPracticeArea === currentPracticeArea) return;

    // Update practice area
    setPracticeArea(newPracticeArea);

    // Navigate to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-accent/60 whitespace-nowrap">I'm working as:</label>
      <select
        value={currentPracticeArea}
        onChange={(e) => handleChange(e.target.value as PracticeArea)}
        className="rounded-lg border border-primary/20 bg-surface px-3 py-1.5 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 min-w-[180px]"
      >
        {PRACTICE_AREA_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

