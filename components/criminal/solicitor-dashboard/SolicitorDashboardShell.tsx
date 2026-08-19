"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { buildSolicitorDashboardVm } from "@/lib/criminal/solicitor-dashboard/build-solicitor-dashboard-vm";
import type { SolicitorDashboardVm, DashboardRecentCase } from "@/lib/criminal/solicitor-dashboard/types";
import { buildControlRoomCaseHref } from "@/components/criminal/criminalCaseNavigation";
import { SolicitorDashboardSidebar } from "./SolicitorDashboardSidebar";
import { SolicitorCaseHeader } from "./SolicitorCaseHeader";
import { SolicitorDashboardTabs } from "./SolicitorDashboardTabs";
import { SolicitorDashboardOverview } from "./SolicitorDashboardOverview";

/**
 * Premium solicitor desk chrome — presentation only.
 * Wraps existing tab bodies without changing truth builders.
 */
export function SolicitorDashboardShell({
  caseId,
  children,
  mode = "tab",
}: {
  caseId: string;
  children?: ReactNode;
  /** overview = attention dashboard body; tab = wrap existing pilot tab content */
  mode?: "overview" | "tab";
}) {
  const pathname = usePathname();
  const brief = useMatterBrief(caseId);
  const [email, setEmail] = useState<string | null>(null);
  const [recentCases, setRecentCases] = useState<DashboardRecentCase[]>([]);
  const [overviewVm, setOverviewVm] = useState<SolicitorDashboardVm | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setEmail(data.user?.email ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cases?limit=8", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          cases?: Array<{
            id: string;
            title?: string | null;
            client_name?: string | null;
            offence_label?: string | null;
          }>;
        };
        const rows = json.cases ?? [];
        if (cancelled) return;
        setRecentCases(
          rows.slice(0, 6).map((c) => ({
            id: c.id,
            label: (c.client_name || c.title || "Case").trim() || "Case",
            chargeLine: (c.offence_label || c.title || "Charge not safely identified").trim(),
            readinessPercent: null,
            href: buildControlRoomCaseHref(c.id),
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const headerVm = useMemo(() => {
    if (overviewVm) return overviewVm;
    return buildSolicitorDashboardVm({
      caseId,
      clientLabel: brief.clientLabel,
      chargeLabel: brief.allegation,
      courtLabel: brief.courtLabel,
      hearingLabel: brief.hearingLabel,
      stageLabel: brief.hearingStatusResolved?.statusLabel ?? null,
      matterConfidence: brief.matterConfidence,
      evidenceRows: brief.evidenceRowsOverride,
      chaseItems: brief.chase?.primaryItems ?? brief.chase?.items ?? [],
      doNotOverstate: brief.doNotOverstate,
      safeCourtLine: brief.warRoom?.safePositionToday || brief.chase?.safeCourtLine || null,
      recentCases,
    });
  }, [overviewVm, brief, caseId, recentCases]);

  const onOverviewVm = useCallback((next: SolicitorDashboardVm) => setOverviewVm(next), []);

  return (
    <div
      className="fixed inset-0 z-40 flex overflow-hidden bg-slate-100"
      data-testid="solicitor-dashboard-shell"
      data-layout="solicitor-dashboard"
    >
      <div className="hidden md:flex">
        <SolicitorDashboardSidebar
          activePath={pathname}
          recentCases={headerVm.recentCases.length ? headerVm.recentCases : recentCases}
          userEmail={email}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <SolicitorCaseHeader vm={headerVm} />
          <SolicitorDashboardTabs caseId={caseId} />
          <div className="px-4 py-4 sm:px-5 lg:px-6 pb-8">
            {mode === "overview" ? (
              <SolicitorDashboardOverview caseId={caseId} onVm={onOverviewVm} />
            ) : (
              <div className="min-w-0 overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 text-slate-900">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
