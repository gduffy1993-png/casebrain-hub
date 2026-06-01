"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

/** Navigate to pilot Documents tab (control-room URL + #case-files). No scroll hacks. */
export function useDocumentsNavClick(caseId: string): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (!isCriminalPilotMode()) return;
    router.push(buildCaseWorkflowTabHref(caseId, "documents"), { scroll: false });
  }, [caseId, router]);
}
