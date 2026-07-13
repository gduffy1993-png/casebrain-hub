"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  FolderOpen,
  Gavel,
  Scale,
} from "lucide-react";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { TrustFeedbackPanel } from "@/components/criminal/trust/TrustFeedbackPanel";
import { TrustSectionChrome } from "@/components/criminal/trust/MatterConfidenceHeader";
import { usePilotMatterTabHref } from "./pilotDeskNavContext";
import {
  workflowMuted,
  workflowPilotCockpitCard,
  workflowPilotKpiCell,
  workflowPilotKpiStrip,
  workflowSectionTitle,
} from "./workflowUi";
import {
  dedupePilotLines,
  displayPilotSnapshotPosition,
  resolvePilotChargeDisplay,
  pilotListCap,
} from "./workflowPilotDisplay";
import { dedupePilotCourtRecordLines } from "@/lib/criminal/pilot-matter-display-polish";
import { polishChasePreviewLabel } from "@/lib/criminal/solicitor-display-dedupe";

function CockpitCard({
  title,
  icon,
  accentClass = "",
  children,
}: {
  title: string;
  icon: ReactNode;
  accentClass?: string;
  children: ReactNode;
}) {
  return (
    <article className={`${workflowPilotCockpitCard} ${accentClass} flex flex-col min-h-[11rem]`}>
      <h3 className={`${workflowSectionTitle} flex items-center gap-1.5 text-slate-500`}>
        {icon}
        {title}
      </h3>
      <div className="mt-2.5 flex-1 min-w-0 text-sm text-slate-200 leading-relaxed">{children}</div>
    </article>
  );
}

function BulletList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return <p className="text-xs text-slate-500">{emptyLabel ?? "Nothing on file for this section yet."}</p>;
  }
  return (
    <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-300">
      {items.map((item, i) => (
        <li key={i} className="line-clamp-3">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Layout-only view model — values must come from existing CaseBrain brief/header data. */
export type PilotTodayDashboardView = {
  caseSummary: {
    clientLabel: string;
    allegation: string;
    court: string;
    hearing: string;
    stage: string;
    bundleHealth: string;
  };
  readiness: string;
  positionStatus: string;
  safeCourtLine: string;
  sayThis: string[];
  doNotOverstate: string[];
  askCourtToRecord: string[];
  collapseRisks: string[];
  nextHearingMoves: string[];
  chaseItems: string[];
  documentCount: number;
};

export type PilotTodayDashboardProps = {
  caseId: string;
  view: PilotTodayDashboardView;
  deskChargeLine?: string | null;
  moreDetail?: ReactNode;
  /** Court tab: hide file/papers cards and emphasise hearing lines. */
  courtFocused?: boolean;
};

/** Criminal pilot Today tab — 4 KPI tiles + cockpit grid; layout only. */
export function PilotTodayDashboard({
  caseId,
  view,
  deskChargeLine,
  moreDetail,
  courtFocused = true,
}: PilotTodayDashboardProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const buildTabHref = usePilotMatterTabHref();
  const chaseHref = buildTabHref(caseId, "disclosure-chase");
  const fileHref = buildTabHref(caseId, "file");
  const papersHref = buildTabHref(caseId, "papers");

  const listCap = pilotListCap(view.documentCount);
  const sayThisItems = dedupePilotLines(view.sayThis, view.safeCourtLine).slice(0, listCap);
  const doNotItems = dedupePilotLines(view.doNotOverstate).slice(0, listCap);
  const chaseItems = dedupePilotLines(
    view.chaseItems
      .map((line) => polishChasePreviewLabel(line) ?? "")
      .filter(Boolean),
    view.safeCourtLine,
  ).slice(0, listCap);
  const askCourtItems = dedupePilotCourtRecordLines(
    dedupePilotLines(view.askCourtToRecord, view.safeCourtLine),
  ).slice(0, listCap);
  const nextMoves = dedupePilotLines(view.nextHearingMoves, view.safeCourtLine)
    .filter((line) => !/^(open\s+chase|chase\s+outstanding\s+disclosure)/i.test(line.trim()))
    .slice(0, 3);

  const topIssue = chaseItems[0] ?? view.collapseRisks[1] ?? "—";
  const nextStep = nextMoves[0] ?? "—";
  const safeLine =
    view.safeCourtLine && view.safeCourtLine !== "—"
      ? view.safeCourtLine.replace(/\s+/g, " ").trim()
      : "Provisional — review served papers before relying on any line.";
  const allegationDisplay = resolvePilotChargeDisplay(view.caseSummary.allegation, deskChargeLine);
  const positionDisplay = displayPilotSnapshotPosition(view.positionStatus, view.readiness);

  return (
    <div className="space-y-3" data-testid="pilot-today-dashboard">
      <div className={workflowPilotKpiStrip}>
        {[
          { label: "Readiness", value: view.readiness },
          { label: "Safe court line", value: safeLine },
          { label: "Top chase", value: topIssue },
          { label: "Next step", value: nextStep },
        ].map((tile) => (
          <div key={tile.label} className={workflowPilotKpiCell}>
            <p className={workflowSectionTitle}>{tile.label}</p>
            <p className="text-xs font-semibold text-slate-100 mt-1 line-clamp-2 leading-snug">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CockpitCard
          title="Before court"
          icon={<Gavel className="h-3.5 w-3.5 text-emerald-400" />}
          accentClass="border-emerald-700/50"
        >
          <TrustSectionChrome title="Court lines" sourceState="needs_review" />
          <BulletList
            items={askCourtItems}
            emptyLabel="No ask-court lines on the current brief."
          />
          {nextMoves.length ? (
            <div className="mt-3 border-t border-slate-700/60 pt-2">
              <p className={`text-[10px] ${workflowMuted} mb-1.5`}>Next steps</p>
              <BulletList items={nextMoves} />
            </div>
          ) : null}
        </CockpitCard>

        <CockpitCard
          title="Our read"
          icon={<Scale className="h-3.5 w-3.5 text-blue-400" />}
          accentClass="border-blue-700/50"
        >
          <TrustSectionChrome title="Source-backed court line" sourceState="provisional" />
          {/* KPI already shows the safe court line — body owns say-this only. */}
          {sayThisItems.length ? (
            <BulletList items={sayThisItems} emptyLabel="No solicitor lines on the current brief." />
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              See the safe court line in the strip above — keep the position provisional until papers confirm.
            </p>
          )}
        </CockpitCard>

        <CockpitCard
          title="What's missing"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
          accentClass="border-amber-700/50"
        >
          <TrustSectionChrome title="Outstanding material" sourceState="missing" />
          <BulletList items={chaseItems} emptyLabel="No chase items on the current brief." />
          <Link
            href={chaseHref}
            className="mt-3 inline-flex text-xs font-semibold text-amber-300 hover:text-amber-100"
            data-testid="pilot-today-open-chase"
          >
            Open Chase ({view.chaseItems.length}) →
          </Link>
        </CockpitCard>

        <CockpitCard
          title="Don't say"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
          accentClass="border-rose-700/50"
        >
          <DontSaySafetyBox items={doNotItems} compact />
        </CockpitCard>

        {!courtFocused ? (
          <>
        <CockpitCard
          title="Papers snapshot"
          icon={<FileText className="h-3.5 w-3.5 text-slate-400" />}
        >
          <p className="text-xs font-medium text-slate-100 line-clamp-2">{allegationDisplay}</p>
          <p className="mt-2 text-xs text-slate-400">{view.caseSummary.bundleHealth}</p>
          <p className="mt-1 text-xs text-slate-400">Position: {positionDisplay}</p>
          <Link href={papersHref} className="mt-3 inline-flex text-xs font-semibold text-blue-300 hover:text-blue-100">
            Open Papers →
          </Link>
        </CockpitCard>

        <CockpitCard
          title="File / source"
          icon={<FolderOpen className="h-3.5 w-3.5 text-slate-400" />}
        >
          <p className="text-xs text-slate-200">
            {view.documentCount} file{view.documentCount === 1 ? "" : "s"} on record
          </p>
          <p className="mt-1 text-xs text-slate-400">{view.caseSummary.stage}</p>
          <Link href={fileHref} className="mt-3 inline-flex text-xs font-semibold text-blue-300 hover:text-blue-100">
            Open File →
          </Link>
        </CockpitCard>
          </>
        ) : null}
      </div>

      {moreDetail ? (
        <>
          <button
            type="button"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 px-1"
            onClick={() => setMoreOpen((v) => !v)}
          >
            {moreOpen ? "Hide more detail" : "More detail (War Room drafts, ask court, risks)"}
          </button>
          {moreOpen ? <div className="pt-1">{moreDetail}</div> : null}
        </>
      ) : null}

      <TrustFeedbackPanel
        caseId={caseId}
        tab="today"
        defaultContext={{
          contextLabel: "Today tab",
          lineSnippet: view.safeCourtLine !== "—" ? view.safeCourtLine : null,
          sourceState: "needs_review",
          sendability: "provisional_check_source",
        }}
      />
    </div>
  );
}
