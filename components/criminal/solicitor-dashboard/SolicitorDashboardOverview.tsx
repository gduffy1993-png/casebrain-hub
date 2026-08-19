"use client";

import { useEffect, useMemo, useState } from "react";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { buildSolicitorDashboardVm } from "@/lib/criminal/solicitor-dashboard/build-solicitor-dashboard-vm";
import type { DashboardRecentCase } from "@/lib/criminal/solicitor-dashboard/types";
import { buildControlRoomCaseHref } from "@/components/criminal/criminalCaseNavigation";
import { WhatNeedsAttentionList } from "./WhatNeedsAttentionList";
import { SelectedIssuePanel } from "./SelectedIssuePanel";
import { QuickActionCards } from "./QuickActionCards";
import { Loader2 } from "lucide-react";

export function SolicitorDashboardOverview({
  caseId,
  onVm,
}: {
  caseId: string;
  onVm?: (vm: ReturnType<typeof buildSolicitorDashboardVm>) => void;
}) {
  const brief = useMatterBrief(caseId);
  const [recentCases, setRecentCases] = useState<DashboardRecentCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        /* presentation-only — ignore list failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const vm = useMemo(() => {
    const clientSection = brief.matterBrief?.sections?.find((s) => s.id === "client");
    const clientSummary = [clientSection?.paragraph, ...(clientSection?.bullets ?? [])]
      .filter(Boolean)
      .join(" ")
      .trim();

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
      clientSummary: clientSummary || null,
      recentCases,
    });
  }, [brief, caseId, recentCases]);

  useEffect(() => {
    onVm?.(vm);
  }, [vm, onVm]);

  useEffect(() => {
    if (!selectedId && vm.issues[0]) setSelectedId(vm.issues[0].id);
  }, [vm.issues, selectedId]);

  if (brief.loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading solicitor dashboard…
      </div>
    );
  }

  const selectedIndex = vm.issues.findIndex((i) => i.id === selectedId);
  const selected = selectedIndex >= 0 ? vm.issues[selectedIndex] : null;

  return (
    <div className="space-y-4" data-testid="solicitor-dashboard-overview">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <WhatNeedsAttentionList
          issues={vm.issues}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          counts={{
            missing: vm.counts.missing,
            incomplete: vm.counts.incomplete,
            notEstablished: vm.counts.notEstablished,
          }}
        />
        <SelectedIssuePanel
          issue={selected}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < vm.issues.length - 1}
          onPrev={() => {
            if (selectedIndex > 0) setSelectedId(vm.issues[selectedIndex - 1]!.id);
          }}
          onNext={() => {
            if (selectedIndex >= 0 && selectedIndex < vm.issues.length - 1) {
              setSelectedId(vm.issues[selectedIndex + 1]!.id);
            }
          }}
        />
      </div>
      <QuickActionCards vm={vm} />
    </div>
  );
}
