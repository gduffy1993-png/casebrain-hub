"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildCaseWorkflowTabHref,
  type CaseWorkflowTabId,
} from "@/components/criminal/criminalCaseNavigation";
import { workflowCard } from "./workflowUi";

const TABS: { id: CaseWorkflowTabId; label: string }[] = [
  { id: "control-room", label: "Control Room" },
  { id: "battleboard", label: "Battleboard" },
  { id: "hearing-war-room", label: "Hearing War Room" },
  { id: "disclosure-chase", label: "Disclosure Chase" },
  { id: "documents", label: "Documents" },
  { id: "position", label: "Position / Notes" },
];

function resolveActiveTab(
  searchParams: { get: (k: string) => string | null },
  hash: string,
): CaseWorkflowTabId {
  if (hash === "#full-battleboard") return "battleboard";
  if (hash === "#case-files") return "documents";
  const tab = searchParams.get("tab");
  if (tab === "hearing-war-room") return "hearing-war-room";
  if (tab === "disclosure-chase") return "disclosure-chase";
  if (tab === "client-instructions") return "position";
  return "control-room";
}

export function CaseWorkflowNav({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const active = resolveActiveTab(searchParams, hash);

  return (
    <nav
      className={`${workflowCard} px-2 py-2 flex flex-wrap gap-1`}
      aria-label="Case workflow"
      data-testid="case-workflow-nav"
    >
      {TABS.map((t) => {
        const href = buildCaseWorkflowTabHref(caseId, t.id);
        const isActive = active === t.id;
        return (
          <Link
            key={t.id}
            href={href}
            className={
              isActive
                ? "rounded-md px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white shadow-sm"
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
