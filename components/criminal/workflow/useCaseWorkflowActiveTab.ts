"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CaseWorkflowTabId } from "@/components/criminal/criminalCaseNavigation";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { resolvePilotWorkflowZone } from "@/lib/criminal/case-workflow-zones";
import { CASE_FILES_HASH } from "./focusCaseDocuments";

export function resolveCaseWorkflowActiveTab(
  searchParams: { get: (k: string) => string | null },
  hash: string,
  pilotMode: boolean,
): CaseWorkflowTabId {
  if (pilotMode) {
    const tab = searchParams.get("tab");
    if (tab === "overview") return "overview";
    if (tab === "disclosure-chase") return "disclosure-chase";
    if (tab === "summary") return "summary";
    return resolvePilotWorkflowZone(tab, hash);
  }

  if (hash === "#full-battleboard") return "battleboard";

  const tab = searchParams.get("tab");
  if (tab === "documents") return "documents";
  if (tab === "hearing-war-room") return "hearing-war-room";
  if (tab === "disclosure-chase") return "disclosure-chase";
  if (tab === "client-instructions") return "position";
  if (tab === "battleboard") return "battleboard";

  if (hash === CASE_FILES_HASH) return "documents";

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

/** Pilot File zone (`?tab=file` or legacy `?tab=documents`). */
export function usePilotDocumentsTabActive(): boolean {
  if (!isCriminalPilotMode()) return false;
  const active = useCaseWorkflowActiveTab();
  return active === "file";
}
