"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildCaseWorkflowTabHref,
  type CaseWorkflowTabId,
} from "@/components/criminal/criminalCaseNavigation";
import { workflowCard } from "./workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { useCaseWorkflowActiveTab } from "./useCaseWorkflowActiveTab";

const TABS: { id: CaseWorkflowTabId; label: string }[] = [
  { id: "control-room", label: "Control Room" },
  { id: "battleboard", label: "Battleboard" },
  { id: "hearing-war-room", label: "Hearing War Room" },
  { id: "disclosure-chase", label: "Disclosure Chase" },
  { id: "documents", label: "Documents" },
  { id: "position", label: "Position / Notes" },
];

export function CaseWorkflowNav({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const pilotMode = isCriminalPilotMode();
  const active = useCaseWorkflowActiveTab();
  const pilotEmphasis = new Set<CaseWorkflowTabId>([
    "hearing-war-room",
    "disclosure-chase",
    "documents",
  ]);
  const visibleTabs = pilotMode
    ? TABS.filter((t) => t.id !== "position" && t.id !== "battleboard")
    : TABS;

  return (
    <nav
      className={`${workflowCard} px-2 py-2 flex flex-wrap gap-1`}
      aria-label="Case workflow"
      data-testid="case-workflow-nav"
    >
      {visibleTabs.map((t) => {
        const href = buildCaseWorkflowTabHref(caseId, t.id);
        const isActive = active === t.id;
        const emphasized = pilotMode && pilotEmphasis.has(t.id);
        return (
          <Link
            key={t.id}
            href={href}
            scroll={t.id === "documents" ? false : undefined}
            className={
              isActive
                ? "rounded-md px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white shadow-sm"
                : emphasized
                  ? "rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800 border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
            aria-current={isActive ? "page" : undefined}
            prefetch={pathname.startsWith("/cases/")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
