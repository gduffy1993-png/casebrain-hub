"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  FileSearch,
  Loader2,
  MessageSquareQuote,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import {
  buildDisclosureChaseBrief,
  computeCounters,
  effectiveStatus,
  matchesFilter,
  type ChaseFilterBucket,
  type ChaseItemStatus,
  type DisclosureChaseBrief,
  type DisclosureChaseItem,
} from "./buildDisclosureChaseBrief";
import { CaseWorkflowShell } from "@/components/criminal/workflow/CaseWorkflowShell";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";

const LOCAL_STORAGE_PREFIX = "casebrain:disclosure-chase:";

type LocalChaseMap = Record<string, "Chased" | "Received">;

type MatterSummary = {
  clientInitials: string | null;
  allegedOffence: string | null;
  stageDetected: string | null;
  defendantName?: string | null;
  bailOutcome?: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength?: number;
  documentRows?: DocumentRowMeta[];
  frontMatterScan?: string | null;
  header?: { stage: string | null; shortTitle?: string | null; accused?: string | null };
  caseMetadata?: ExtractedBundleCaseMetadata | null;
};

export type DisclosureChaseProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  hasSavedPosition: boolean;
  savedPosition: { position_text: string } | null;
  matterState: string | null;
  effectiveProceduralSafety: { status: string; outstandingItems?: string[] } | null;
  controlRoomMode?: boolean;
};

const FILTER_TABS: { id: ChaseFilterBucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "due-soon", label: "Due soon" },
  { id: "chased", label: "Chased" },
  { id: "received", label: "Received" },
];

function statusBadgeVariant(
  status: ChaseItemStatus,
): "default" | "secondary" | "success" | "warning" | "danger" {
  switch (status) {
    case "Received":
      return "success";
    case "Chased":
      return "secondary";
    case "Overdue":
      return "danger";
    case "Due soon":
      return "warning";
    default:
      return "default";
  }
}


function deriveBundleHealth(
  snapshot: CaseSnapshot | null,
  bundleSource: BundleSourceSummary | null,
  battleboard: BattleboardOutput | null,
): string {
  return formatCaseBundleHealthLabel({
    documentCount: Math.max(
      snapshot?.analysis.docCount ?? 0,
      bundleSource?.documentCount ?? 0,
      snapshot?.evidence.documents?.length ?? 0,
    ),
    combinedTextLength: bundleSource?.combinedTextLength ?? 0,
    capabilityTier: snapshot?.analysis.capabilityTier,
    battleboard,
    documentRows: bundleSource?.documentRows,
  });
}

function CounterTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-white px-3 py-2.5 rounded-lg border border-slate-200">
      <p className={workflowSectionTitle}>{label}</p>
      <p className={`text-xl font-semibold mt-1 ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ChaseItemCard({
  item,
  status,
  selected,
  onSelect,
  onMarkChased,
  onMarkReceived,
}: {
  item: DisclosureChaseItem;
  status: ChaseItemStatus;
  selected: boolean;
  onSelect: () => void;
  onMarkChased: () => void;
  onMarkReceived: () => void;
}) {
  const [copied, setCopied] = useState<"chase" | "court" | null>(null);

  const handleCopy = async (kind: "chase" | "court") => {
    const ok = await copyText(kind === "chase" ? item.draftChaseWording : item.courtLine);
    if (ok) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <article
      className={`${workflowCard} cursor-pointer transition-shadow ${
        selected ? "ring-2 ring-blue-400 shadow-md" : "hover:shadow-sm"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.whyItMatters}</p>
        </div>
        <Badge variant={statusBadgeVariant(status)} size="sm">
          {status}
        </Badge>
      </div>
      <dl className="px-4 py-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <dt className="text-slate-500">Source</dt>
          <dd className="text-slate-800 font-medium">{item.source}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Deadline</dt>
          <dd className="text-slate-800 font-medium">{item.deadlineLabel}</dd>
        </div>
      </dl>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkChased}>
          Mark chased
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkReceived}>
          Mark received
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => void handleCopy("chase")}
        >
          <Copy className="h-3 w-3" />
          {copied === "chase" ? "Copied" : "Chase wording"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => void handleCopy("court")}
        >
          <Copy className="h-3 w-3" />
          {copied === "court" ? "Copied" : "Court line"}
        </Button>
      </div>
    </article>
  );
}

function DetailPanel({
  item,
  status,
  brief,
  onMarkChased,
  onMarkReceived,
}: {
  item: DisclosureChaseItem;
  status: ChaseItemStatus;
  brief: DisclosureChaseBrief;
  onMarkChased: () => void;
  onMarkReceived: () => void;
}) {
  return (
    <aside className={`${workflowCard} sticky top-4`}>
      <header className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <h2 className="text-sm font-semibold text-slate-900">{item.label}</h2>
        <Badge variant={statusBadgeVariant(status)} size="sm" className="mt-2">
          {status}
        </Badge>
      </header>
      <div className="p-4 space-y-4 text-sm text-slate-800">
        <div>
          <p className={workflowSectionTitle}>Why it matters</p>
          <p className="mt-1 leading-relaxed">{item.whyItMatters}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <p>
            <span className="text-slate-500">Source: </span>
            {item.source}
          </p>
          <p>
            <span className="text-slate-500">Deadline: </span>
            {item.deadlineLabel}
          </p>
          {item.linkedRoute && (
            <p>
              <span className="text-slate-500">Battleboard route: </span>
              {item.linkedRoute}
            </p>
          )}
        </div>
        {item.mergedFrom.length > 1 && (
          <div>
            <p className={workflowSectionTitle}>Merged from file</p>
            <ul className="mt-1 text-xs text-slate-600 list-disc pl-4 space-y-0.5">
              {item.mergedFrom.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {item.evidenceAnchor && (
          <div>
            <p className={workflowSectionTitle}>Evidence anchor</p>
            <p className="mt-1 text-xs leading-relaxed">{item.evidenceAnchor}</p>
          </div>
        )}
        <div>
          <p className={workflowSectionTitle}>Draft chase wording</p>
          <p className="mt-1 text-xs leading-relaxed italic border-l-2 border-slate-200 pl-2">
            {item.draftChaseWording}
          </p>
        </div>
        <div>
          <p className={workflowSectionTitle}>Court line</p>
          <p className="mt-1 text-xs leading-relaxed italic border-l-2 border-blue-200 pl-2">
            {item.courtLine}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onMarkChased}>
            Mark chased
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onMarkReceived}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Mark received
          </Button>
        </div>
        <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-3">
          Case-wide court line (provisional): {brief.safeCourtLine}
        </p>
      </div>
    </aside>
  );
}

export function DisclosureChase({
  caseId,
  snapshot,
  snapshotLoading,
  hasSavedPosition,
  savedPosition,
  matterState,
  effectiveProceduralSafety,
  controlRoomMode,
}: DisclosureChaseProps) {
  const [matter, setMatter] = useState<MatterSummary | null>(null);
  const [battleboard, setBattleboard] = useState<BattleboardOutput | null>(null);
  const [battleboardLoading, setBattleboardLoading] = useState(true);
  const [bundleSource, setBundleSource] = useState<BundleSourceSummary | null>(null);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [filter, setFilter] = useState<ChaseFilterBucket>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<LocalChaseMap>({});
  const [showAdditional, setShowAdditional] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${caseId}`);
      if (raw) setLocalStatus(JSON.parse(raw) as LocalChaseMap);
    } catch {
      /* ignore */
    }
  }, [caseId]);

  const persistLocal = useCallback(
    (next: LocalChaseMap) => {
      setLocalStatus(next);
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${caseId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [caseId],
  );

  const markChased = (id: string) => persistLocal({ ...localStatus, [id]: "Chased" });
  const markReceived = (id: string) => persistLocal({ ...localStatus, [id]: "Received" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setMatter({
          clientInitials: data.clientInitials ?? data.station?.clientInitials ?? null,
          allegedOffence: data.station?.allegedOffence ?? data.allegedOffence ?? null,
          stageDetected: data.matterState ?? data.stage ?? null,
          defendantName: data.defendantName ?? null,
          bailOutcome: data.bailOutcome ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    setBattleboardLoading(true);
    fetch(`/api/criminal/${caseId}/strategy-battleboard`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.ok && res?.data) setBattleboard(res.data as BattleboardOutput);
        else setBattleboard(null);
      })
      .catch(() => {
        if (!cancelled) setBattleboard(null);
      })
      .finally(() => {
        if (!cancelled) setBattleboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    setBundleLoading(true);
    fetch(`/api/criminal/${caseId}/bundle-source`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.ok || !res?.data) return;
        const d = res.data as BundleSourceSummary & { documentCount?: number };
        setBundleSource({
          documentCount: d.documentCount ?? 0,
          combinedTextLength: (d as { combinedTextLength?: number }).combinedTextLength ?? 0,
          documentRows: Array.isArray((d as { documentRows?: DocumentRowMeta[] }).documentRows)
            ? (d as { documentRows: DocumentRowMeta[] }).documentRows
            : undefined,
          frontMatterScan: (d as { frontMatterScan?: string }).frontMatterScan ?? null,
          header: d.header
            ? {
                stage: d.header.stage ?? null,
                shortTitle: d.header.shortTitle ?? null,
                accused: d.header.accused ?? null,
              }
            : undefined,
          caseMetadata: d.caseMetadata ?? null,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const headerMeta = useMemo(
    () =>
      resolveCaseHeaderMetadata({
        snapshot,
        matter: matter
          ? {
              clientInitials: matter.clientInitials,
              defendantName: matter.defendantName,
              allegedOffence: matter.allegedOffence,
              stageDetected: matter.stageDetected,
              bailOutcome: matter.bailOutcome,
            }
          : null,
        bundleMetadata: bundleSource?.caseMetadata,
        bundleHeader: bundleSource?.header,
        matterState,
      }),
    [snapshot, matter, bundleSource, matterState],
  );

  const clientLabel = sanitizeHeaderClient(headerMeta.clientLabel);
  const allegation = sanitizeHeaderAllegation(headerMeta.allegation);
  const stage = headerMeta.stage;
  const headerLoading = snapshotLoading || bundleLoading;
  const hearingDisplay =
    headerLoading && /not safely extracted/i.test(headerMeta.nextHearing)
      ? "…"
      : headerMeta.nextHearing;
  const metadataNote = headerMeta.metadataNote;

  const positionStatus =
    hasSavedPosition && savedPosition?.position_text?.trim()
      ? savedPosition.position_text.split(/[.!?]/)[0].trim() + "."
      : headerMeta.defencePosition
        ? headerMeta.defencePosition.length > 100
          ? `${headerMeta.defencePosition.slice(0, 97)}…`
          : headerMeta.defencePosition
        : "Position not safely recorded yet";

  const brief: DisclosureChaseBrief = useMemo(
    () =>
      buildDisclosureChaseBrief({
        caseId,
        caseTitle: snapshot?.caseMeta?.title?.trim() || "Criminal case",
        clientLabel,
        allegation,
        stage,
        hearingStatus: hearingDisplay,
        hearingDateIso:
          bundleSource?.caseMetadata?.nextHearingIso ??
          snapshot?.caseMeta?.hearingNextAt ??
          null,
        bundleHealth: deriveBundleHealth(snapshot, bundleSource, battleboard),
        positionStatus,
        battleboard,
        snapshotMissing: snapshot?.evidence.missingEvidence,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
      }),
    [
      caseId,
      snapshot,
      clientLabel,
      allegation,
      stage,
      bundleSource,
      battleboard,
      positionStatus,
      effectiveProceduralSafety,
      headerMeta.nextHearing,
      hearingDisplay,
    ],
  );

  const counters = useMemo(
    () => computeCounters(brief.items, localStatus),
    [brief.items, localStatus],
  );

  const filteredItems = useMemo(
    () => brief.items.filter((item) => matchesFilter(item, filter, localStatus)),
    [brief.items, filter, localStatus],
  );

  const primaryIdSet = useMemo(() => new Set(brief.primaryItems.map((i) => i.id)), [brief.primaryItems]);

  const filteredPrimary = useMemo(
    () => filteredItems.filter((item) => primaryIdSet.has(item.id)),
    [filteredItems, primaryIdSet],
  );

  const filteredAdditional = useMemo(
    () => filteredItems.filter((item) => !primaryIdSet.has(item.id)),
    [filteredItems, primaryIdSet],
  );

  const selectedItem = brief.items.find((i) => i.id === selectedId) ?? filteredItems[0] ?? null;

  useEffect(() => {
    if (filteredItems.length && !filteredItems.some((i) => i.id === selectedId)) {
      setSelectedId(filteredItems[0]!.id);
    }
  }, [filteredItems, selectedId]);

  const loading = snapshotLoading || battleboardLoading || bundleLoading;

  return (
    <div className="min-h-0 pb-8 text-slate-900" data-testid="disclosure-chase">
      <div className="max-w-[1400px] space-y-4">
        <CaseWorkflowShell caseId={caseId}>
        <header className={`${workflowCard} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FileSearch className="h-5 w-5 text-violet-700 shrink-0" />
                <h1 className="text-lg font-semibold text-slate-900">Disclosure Chase</h1>
                <Badge variant="secondary" size="sm" className="bg-violet-100 text-violet-900">
                  Source material
                </Badge>
              </div>
              <p className={`mt-1 text-sm ${workflowMuted}`}>
                {clientLabel} · {allegation}
              </p>
              <p className={`text-xs ${workflowMuted} mt-0.5`}>{brief.caseTitle}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-100">
            {[
              {
                label: "Court",
                value: headerMeta.court?.trim() || "Court not safely extracted",
              },
              { label: "Stage", value: headerLoading ? "…" : stage },
              { label: "Bundle", value: brief.bundleHealth },
              { label: "Position", value: brief.positionStatus },
              { label: "Hearing", value: headerLoading ? "…" : hearingDisplay },
              { label: "Disclosure", value: brief.disclosureSummary },
              { label: "Routes linked", value: String(brief.linkedRoutes.length) },
            ].map((tile) => (
              <div key={tile.label} className="bg-white px-3 py-2.5">
                <dt className={workflowSectionTitle}>{tile.label}</dt>
                <dd className="text-xs font-medium text-slate-900 mt-1 line-clamp-3 leading-snug">
                  {loading ? "…" : tile.value}
                </dd>
              </div>
            ))}
          </dl>
          {brief.hearingDeadlineNote && !loading && (
            <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 bg-slate-50/50">
              {brief.hearingDeadlineNote}
            </p>
          )}
          {metadataNote ? (
            <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">{metadataNote}</p>
          ) : null}
        </header>

        {loading ? (
          <div className={`${workflowCard} p-8 flex items-center justify-center gap-2 text-slate-600`}>
            <Loader2 className="h-5 w-5 animate-spin text-violet-700" />
            Loading disclosure chase tracker…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <CounterTile label="Total" value={counters.total} />
              <CounterTile label="Overdue" value={counters.overdue} tone="text-red-800" />
              <CounterTile label="Due soon" value={counters.dueSoon} tone="text-amber-800" />
              <CounterTile label="Chased" value={counters.chased} tone="text-blue-800" />
              <CounterTile label="Received" value={counters.received} tone="text-emerald-800" />
              <CounterTile label="Not started" value={counters.notStarted} />
            </div>

            <section className={`${workflowCard} p-3 border-violet-200/40 bg-violet-50/20`}>
              <p className={`${workflowSectionTitle} flex items-center gap-1 text-violet-900/80`}>
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Case-wide court line (provisional)
              </p>
              <p className="mt-2 text-sm text-slate-800 leading-relaxed">{brief.safeCourtLine}</p>
            </section>

            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filter === tab.id
                      ? "bg-violet-700 text-white border-violet-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {brief.items.length === 0 ? (
              <div className={`${workflowCard} p-10 text-center`}>
                <Scale className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900">
                  No source-material chase items safely detected on the current file.
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                  Upload material or run analysis — chase items appear when missing evidence, Battleboard moves, or
                  procedural gaps are recorded. All labels remain provisional and solicitor-controlled.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className={`${workflowCard} p-6 text-center text-sm text-slate-600`}>
                No items in this bucket — try another filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_min(360px,32vw)] gap-4">
                <div className="space-y-3">
                  {filteredPrimary.map((item) => (
                    <ChaseItemCard
                      key={item.id}
                      item={item}
                      status={effectiveStatus(item, localStatus)}
                      selected={selectedItem?.id === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onMarkChased={() => markChased(item.id)}
                      onMarkReceived={() => markReceived(item.id)}
                    />
                  ))}
                  {filteredAdditional.length > 0 && (
                    <div className={`${workflowCard} overflow-hidden`}>
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50/80"
                        onClick={() => setShowAdditional((v) => !v)}
                      >
                        <span className="text-sm font-medium text-slate-900">
                          Additional source-material issues ({filteredAdditional.length})
                        </span>
                        <span className="text-xs text-violet-700 font-medium">
                          {showAdditional ? "Hide" : "Show"}
                        </span>
                      </button>
                      {showAdditional && (
                        <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/40">
                          {filteredAdditional.map((item) => (
                            <ChaseItemCard
                              key={item.id}
                              item={item}
                              status={effectiveStatus(item, localStatus)}
                              selected={selectedItem?.id === item.id}
                              onSelect={() => setSelectedId(item.id)}
                              onMarkChased={() => markChased(item.id)}
                              onMarkReceived={() => markReceived(item.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedItem && (
                  <DetailPanel
                    item={selectedItem}
                    status={effectiveStatus(selectedItem, localStatus)}
                    brief={brief}
                    onMarkChased={() => markChased(selectedItem.id)}
                    onMarkReceived={() => markReceived(selectedItem.id)}
                  />
                )}
              </div>
            )}

            <p className="text-[10px] text-center text-slate-500">
              Provisional · appears outstanding on file · solicitor review · Mark chased/received stored locally only
            </p>
          </>
        )}
        </CaseWorkflowShell>
      </div>
    </div>
  );
}
