"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";

/**
 * Client component that syncs global practice area with URL params
 * and redirects if needed to show filtered cases
 */
export function CasesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentPracticeArea } = usePracticeArea();

  useEffect(() => {
    const urlPracticeArea = searchParams?.get("practiceArea");
    
    // Sync global practice area to URL if:
    // 1. URL has no practiceArea param, OR
    // 2. URL practiceArea doesn't match global practiceArea
    const shouldSync = !urlPracticeArea || urlPracticeArea !== currentPracticeArea;
    
    if (shouldSync && currentPracticeArea) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("practiceArea", currentPracticeArea);
      // Preserve role param if it exists
      router.replace(`/cases?${params.toString()}`, { scroll: false });
    }
  }, [currentPracticeArea, searchParams, router]);

  return null;
}

