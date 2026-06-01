"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CaseWorkflowTabId } from "@/components/criminal/criminalCaseNavigation";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { CASE_FILES_HASH } from "./focusCaseDocuments";

export function resolveCaseWorkflowActiveTab(
  searchParams: { get: (k: string) => string | null },
  hash: string,
  pilotMode: boolean,
): CaseWorkflowTabId {
  if (hash === "#full-battleboard") return pilotMode ? "control-room" : "battleboard";

  const tab = searchParams.get("tab");
  if (tab === "documents") return "documents";
  if (tab === "hearing-war-room") return "hearing-war-room";
  if (tab === "disclosure-chase") return "disclosure-chase";
  if (tab === "client-instructions") return pilotMode ? "control-room" : "position";
  if (tab === "battleboard" && !pilotMode) return "battleboard";

  if (pilotMode && hash === CASE_FILES_HASH) return "documents";

  return "control-room";
}

/** Active workflow tab from URL (search params + legacy hash). */
export function useCaseWorkflowActiveTab(): CaseWorkflowTabId {
  const searchParams = useSearchParams();
  const pilotMode = isCriminalPilotMode();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return resolveCaseWorkflowActiveTab(searchParams, hash, pilotMode);
}

/** Pilot Documents tab (`?tab=documents` on control-room case URL). */
export function usePilotDocumentsTabActive(): boolean {
  return isCriminalPilotMode() && useCaseWorkflowActiveTab() === "documents";
}
