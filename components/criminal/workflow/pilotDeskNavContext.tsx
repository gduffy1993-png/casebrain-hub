"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  buildCaseWorkflowTabHref,
  type CaseWorkflowTabId,
} from "@/components/criminal/criminalCaseNavigation";

type TabHrefBuilder = (caseId: string, tab: CaseWorkflowTabId) => string;

const PilotDeskNavContext = createContext<TabHrefBuilder | null>(null);

export function PilotDeskNavProvider({
  buildTabHref,
  children,
}: {
  buildTabHref: TabHrefBuilder;
  children: ReactNode;
}) {
  return <PilotDeskNavContext.Provider value={buildTabHref}>{children}</PilotDeskNavContext.Provider>;
}

/** Tab links stay on Court Today desk when embedded; otherwise case routes. */
export function usePilotMatterTabHref(): TabHrefBuilder {
  const desk = useContext(PilotDeskNavContext);
  return desk ?? buildCaseWorkflowTabHref;
}
