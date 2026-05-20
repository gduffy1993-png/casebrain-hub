"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckSquare,
  ClipboardList,
  Copy,
  Gavel,
  LayoutDashboard,
  Loader2,
  MessageSquareQuote,
  Mic,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { StrategyCommitment } from "@/components/criminal/StrategyCommitmentPanel";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
  type HearingWarRoomBrief,
} from "./buildHearingWarRoomBrief";
import { buildControlRoomHref, buildHearingWarRoomHref } from "./hearingWarRoomLinks";
import { HearingWarRoomAssistant } from "./HearingWarRoomAssistant";
import type { ControlRoomAssistantContext } from "@/components/criminal/control-room/assistantBattleboardFallback";

const ABOVE_FOLD_LIST_CAP = 5;

const HEARING_PROMPTS = [
  "Draft hearing note",
  "Draft disclosure timetable request",
  "Explain this to client",
  "What should I not say?",
  "What instruction do I need?",
] as const;

type MatterSummary = {
  clientInitials: string | null;
  allegedOffence: string | null;
  stageDetected: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength: number;
  header?: { shortTitle: string | null; stage: string | null };
};

export type HearingWarRoomProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  hasSavedPosition: boolean;
  savedPosition: { position_text: string } | null;
  defencePlan: DefenceStrategyPlan | null;
  displayStrategy: { displayLabel: string } | null;
  committedStrategy: StrategyCommitment | null;
  matterState: string | null;
  effectiveProceduralSafety: {
    status: string;
    outstandingItems?: string[];
  } | null;
  evidenceSummary?: string;
  timelineSummary?: string;
  controlRoomMode?: boolean;
  onRecordPosition: () => void;
  onUploadEvidence: () => void;
};

function formatGbDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatHearingStatus(snapshot: CaseSnapshot | null): string {
  const at = snapshot?.caseMeta?.hearingNextAt;
  if (!at) return "No hearing date safely extracted";
  const datePart = formatGbDate(at);
  if (!datePart) return "No hearing date safely extracted";
  const type = snapshot?.caseMeta?.hearingNextType?.trim();
  return type ? `${type} · ${datePart}` : datePart;
}

function resolveClientLabel(matter: MatterSummary | null, snapshot: CaseSnapshot | null): string {
  const initials = matter?.clientInitials?.trim();
  if (initials && initials.length >= 2 && !/^client\b/i.test(initials)) return initials;
  return "Client name not safely extracted";
}

function sanitizeHeaderClient(label: string): string {
  const t = label.trim();
  if (!t || /^client\b/i.test(t) || /not safely extracted/i.test(t)) {
    return "Client name not safely extracted";
  }
  return t;
}

function sanitizeHeaderAllegation(raw: string): string {
  const t = raw.trim();
  if (!t) return "Offence wording not safely extracted";
  const l = t.toLowerCase();
  if (
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l.includes("offence-specific strategy") ||
    l.includes("check charge sheet") ||
    l.includes("not safely extracted")
  ) {
    return "Offence wording not safely extracted";
  }
  return t;
}

function deriveBundleHealth(
  snapshot: CaseSnapshot | null,
  bundleSource: BundleSourceSummary | null,
  battleboard: BattleboardOutput | null,
): string {
  if (battleboard?.overall_status === "thin_bundle") return "Thin bundle — provisional routes only";
  if (battleboard?.overall_status === "needs_review") return "Routes need solicitor review";
  const docCount = Math.max(
    snapshot?.analysis.docCount ?? 0,
    bundleSource?.documentCount ?? 0,
    snapshot?.evidence.documents?.length ?? 0,
  );
  if (docCount === 0) return "Thin (no documents on record)";
  const tier = snapshot?.analysis.capabilityTier;
  if (tier === "full") return `Strong (${docCount} doc${docCount !== 1 ? "s" : ""})`;
  if (tier === "partial") return `Partial (${docCount} doc${docCount !== 1 ? "s" : ""})`;
  return `${docCount} document(s) on file — review before court`;
}

function BriefListCard({
  title,
  icon,
  items,
  tone = "default",
  previewCount,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone?: "default" | "warn" | "safe" | "court";
  previewCount?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const cap = previewCount ?? items.length;
  const hasMore = items.length > cap;
  const visible = showAll || !hasMore ? items : items.slice(0, cap);

  const border =
    tone === "safe"
      ? "border-emerald-200/60 bg-emerald-50/30"
      : tone === "warn"
        ? "border-amber-200/60 bg-amber-50/30"
        : tone === "court"
          ? "border-blue-200/60 bg-blue-50/20"
          : "";
  return (
    <section className={`${workflowCard} ${border}`}>
      <header className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        {icon}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </header>
      <ul className="px-4 py-3 space-y-2 text-sm text-slate-800 list-disc pl-4">
        {visible.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="px-4 pb-3 -mt-1">
          <button
            type="button"
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer" : `Show all (${items.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

function DraftBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className={workflowSectionTitle}>{title}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-900"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-800 leading-relaxed italic">{text}</p>
    </div>
  );
}

export function HearingWarRoom({
  caseId,
  snapshot,
  snapshotLoading,
  hasSavedPosition,
  savedPosition,
  defencePlan,
  displayStrategy,
  committedStrategy,
  matterState,
  effectiveProceduralSafety,
  evidenceSummary,
  timelineSummary,
  controlRoomMode,
  onRecordPosition,
  onUploadEvidence,
}: HearingWarRoomProps) {
  const [matter, setMatter] = useState<MatterSummary | null>(null);
  const [battleboard, setBattleboard] = useState<BattleboardOutput | null>(null);
  const [battleboardLoading, setBattleboardLoading] = useState(true);
  const [bundleSource, setBundleSource] = useState<BundleSourceSummary | null>(null);

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
    fetch(`/api/criminal/${caseId}/bundle-source`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.ok || !res?.data) return;
        const d = res.data as BundleSourceSummary;
        setBundleSource({
          documentCount: d.documentCount ?? 0,
          combinedTextLength: d.combinedTextLength ?? 0,
          header: d.header
            ? { shortTitle: d.header.shortTitle ?? null, stage: d.header.stage ?? null }
            : undefined,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const caseTitle = snapshot?.caseMeta?.title?.trim() || "Criminal case";
  const clientLabel = sanitizeHeaderClient(resolveClientLabel(matter, snapshot));
  const allegation = sanitizeHeaderAllegation(
    snapshot?.resolvedOffence?.label?.trim() ||
      matter?.allegedOffence?.trim() ||
      snapshot?.charges?.[0]?.offence?.trim() ||
      "",
  );
  const stage =
    bundleSource?.header?.stage?.trim() ||
    matter?.stageDetected?.replace(/_/g, " ") ||
    snapshot?.caseMeta?.caseStage?.replace(/_/g, " ") ||
    matterState?.replace(/_/g, " ") ||
    "Stage not recorded";

  const chaseItemsAll = useMemo(
    () =>
      buildChaseItemsForHearing({
        snapshotMissing: snapshot?.evidence.missingEvidence,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
        battleboard,
      }),
    [snapshot, effectiveProceduralSafety, battleboard],
  );

  const positionStatus =
    hasSavedPosition && savedPosition?.position_text?.trim()
      ? savedPosition.position_text.split(/[.!?]/)[0].trim() + "."
      : battleboard?.position_notice?.includes("not safely recorded")
        ? "Position not safely recorded yet"
        : "Position not recorded";

  const readiness = useMemo(() => {
    if (effectiveProceduralSafety?.status === "UNSAFE_TO_PROCEED") {
      return "Conditional — procedural disclosure gaps";
    }
    if (!hasSavedPosition) return "Conditional — record position";
    if (chaseItemsAll.length >= 2) return "Conditional — source material outstanding";
    if (battleboard?.primary_route) return "Routes on file — solicitor review";
    return "Review — standard caution";
  }, [effectiveProceduralSafety, hasSavedPosition, chaseItemsAll, battleboard]);

  const brief: HearingWarRoomBrief = useMemo(
    () =>
      buildHearingWarRoomBrief({
        caseId,
        caseTitle,
        clientLabel,
        allegation,
        stage,
        hearingStatus: formatHearingStatus(snapshot),
        bundleHealth: deriveBundleHealth(snapshot, bundleSource, battleboard),
        positionStatus,
        readiness,
        battleboard,
        hasSavedPosition,
        chaseItems: chaseItemsAll,
        defencePlan,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
      }),
    [
      caseId,
      caseTitle,
      clientLabel,
      allegation,
      stage,
      snapshot,
      bundleSource,
      battleboard,
      positionStatus,
      readiness,
      hasSavedPosition,
      chaseItemsAll,
      defencePlan,
      effectiveProceduralSafety,
    ],
  );

  const planSummary = useMemo(() => {
    const parts = [
      `Hearing War Room — ${caseTitle}`,
      `Safe position: ${brief.safePositionToday}`,
      brief.sayThis.length ? `Say this: ${brief.sayThis.join(" | ")}` : "",
    ];
    return parts.filter(Boolean).join("\n");
  }, [brief, caseTitle]);

  const assistantContext: ControlRoomAssistantContext = useMemo(
    () => ({
      battleboard,
      allegation,
      stage,
      positionNotice: battleboard?.position_notice ?? null,
      missingEvidence: chaseItemsAll,
      bundleHeader: bundleSource?.header ?? null,
      primaryRouteTitle:
        battleboard?.primary_route?.title ||
        displayStrategy?.displayLabel ||
        (committedStrategy?.primary ? String(committedStrategy.primary) : null),
    }),
    [battleboard, allegation, stage, chaseItemsAll, bundleSource, displayStrategy, committedStrategy],
  );

  const loading = snapshotLoading || battleboardLoading;
  const controlRoomHref = buildControlRoomHref(caseId);

  return (
    <div className="min-h-0 pb-20 xl:pb-4 text-slate-900" data-testid="hearing-war-room">
      <div className="xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px] space-y-4">
        <header className={`${workflowCard} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Gavel className="h-5 w-5 text-blue-700 shrink-0" />
                <h1 className="text-lg font-semibold text-slate-900">Hearing War Room</h1>
                <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-900">
                  Court prep
                </Badge>
              </div>
              <p className={`mt-1 text-sm ${workflowMuted}`}>
                {clientLabel} · {allegation}
              </p>
              <p className={`text-xs ${workflowMuted} mt-0.5`}>{caseTitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {controlRoomMode ? (
                <Link href={controlRoomHref}>
                  <Button type="button" size="sm" variant="outline" className="gap-1">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Control Room
                  </Button>
                </Link>
              ) : (
                <Link href={buildHearingWarRoomHref(caseId, { controlRoom: true })}>
                  <Button type="button" size="sm" variant="outline" className="gap-1">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Open Control Room
                  </Button>
                </Link>
              )}
              <Button type="button" size="sm" variant="outline" onClick={onRecordPosition}>
                Record position
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onUploadEvidence}>
                Upload evidence
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-100">
            {[
              { label: "Stage", value: brief.stage },
              { label: "Hearing", value: brief.hearingStatus },
              { label: "Bundle", value: brief.bundleHealth },
              { label: "Position", value: brief.positionStatus },
              { label: "Readiness", value: brief.readiness },
              {
                label: "Primary route",
                value:
                  battleboard?.primary_route?.title ||
                  displayStrategy?.displayLabel ||
                  "Provisional",
              },
            ].map((tile) => (
              <div key={tile.label} className="bg-white px-3 py-2.5">
                <dt className={workflowSectionTitle}>{tile.label}</dt>
                <dd className="text-xs font-medium text-slate-900 mt-1 line-clamp-3 leading-snug">
                  {loading ? "…" : tile.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {loading ? (
          <div className={`${workflowCard} p-8 flex items-center justify-center gap-2 text-slate-600`}>
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            Loading court-prep brief…
          </div>
        ) : (
          <>
            <section className={`${workflowCard} p-4 border-emerald-200/50 bg-emerald-50/40`}>
              <p className={`${workflowSectionTitle} text-emerald-900/80 flex items-center gap-1`}>
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Safe position today
              </p>
              <blockquote className="mt-2 text-sm text-slate-900 leading-relaxed border-l-2 border-emerald-500/50 pl-3">
                {brief.safePositionToday}
              </blockquote>
              <p className="text-[10px] text-slate-500 mt-2">
                Provisional · conditional on served material · solicitor review required
              </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BriefListCard
                title="Say this"
                icon={<Mic className="h-4 w-4 text-blue-700" />}
                items={brief.sayThis}
                tone="court"
              />
              <BriefListCard
                title="Do not overstate"
                icon={<Ban className="h-4 w-4 text-amber-700" />}
                items={brief.doNotOverstate}
                tone="warn"
              />
              <BriefListCard
                title="Ask court to record"
                icon={<Scale className="h-4 w-4 text-blue-700" />}
                items={brief.askCourtToRecord}
                tone="court"
                previewCount={ABOVE_FOLD_LIST_CAP}
              />
              <BriefListCard
                title="Instructions needed before hearing"
                icon={<ClipboardList className="h-4 w-4 text-slate-600" />}
                items={brief.instructionsNeeded}
              />
            </div>

            <BriefListCard
              title="Next hearing moves"
              icon={<CheckSquare className="h-4 w-4 text-emerald-700" />}
              items={brief.nextHearingMoves}
              tone="safe"
              previewCount={ABOVE_FOLD_LIST_CAP}
            />

            <section className={`${workflowCard}`}>
              <header className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
                <ShieldAlert className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Supporting detail</h2>
              </header>
              <div className="p-4 space-y-4">
                {brief.evidenceAnchors.length > 0 && (
                  <div>
                    <p className={workflowSectionTitle}>Evidence anchors</p>
                    <ul className="mt-2 text-sm text-slate-800 list-disc pl-4 space-y-1">
                      {brief.evidenceAnchors.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.collapseRisks.length > 0 && (
                  <div>
                    <p className={`${workflowSectionTitle} flex items-center gap-1 text-amber-800/90`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Collapse risks (review — do not state as outcomes)
                    </p>
                    <ul className="mt-2 text-sm text-slate-800 list-disc pl-4 space-y-1">
                      {brief.collapseRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-3">
                  <p className={workflowSectionTitle}>Draft wording blocks</p>
                  <DraftBlock title="Disclosure timetable request" text={brief.draftWording.disclosureTimetable} />
                  <DraftBlock title="Adjournment / provisional position" text={brief.draftWording.adjournment} />
                  <DraftBlock title="Client explanation (plain language)" text={brief.draftWording.clientExplanation} />
                </div>
              </div>
            </section>

            <div className={`${workflowCard} p-3 xl:hidden`}>
              <p className={workflowSectionTitle}>Suggested assistant prompts</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {HEARING_PROMPTS.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Use the assistant panel (bottom-right on mobile) — secondary to the brief above.
              </p>
            </div>
          </>
        )}
      </div>

      <HearingWarRoomAssistant
        caseId={caseId}
        planSummary={planSummary}
        evidenceSummary={evidenceSummary}
        timelineSummary={timelineSummary}
        assistantContext={assistantContext}
      />
    </div>
  );
}
