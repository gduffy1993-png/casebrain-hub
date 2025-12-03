"use client";

import { useEffect } from "react";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";
import type { PracticeArea } from "@/lib/types/casebrain";

/**
 * Client component that syncs global practice area when opening a case
 * This highlights the nav to match the current case's practice area
 */
export function CasePageClient({ casePracticeArea }: { casePracticeArea: PracticeArea | null | undefined }) {
  const { setPracticeArea } = usePracticeArea();

  useEffect(() => {
    if (casePracticeArea) {
      setPracticeArea(casePracticeArea);
    }
  }, [casePracticeArea, setPracticeArea]);

  return null;
}

