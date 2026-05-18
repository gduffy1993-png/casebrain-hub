"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FileText,
  ListChecks,
  Loader2,
  Scale,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StrategyBattleboard } from "./StrategyBattleboard";
import { DashboardCard } from "./control-room/DashboardCard";
import { ControlRoomAssistantDock } from "./control-room/ControlRoomAssistant";
import { AboveFoldSummary } from "./control-room/AboveFoldSummary";
import { RiskColumn } from "./control-room/GlanceGrid";
import {
  collectChaseItems,
  formatDisclosureGlance,
  formatMissingEvidenceStrip,
} from "./control-room/chaseItems";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { StrategyCommitment } from "./StrategyCommitmentPanel";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

type SavedPosition = {
  position_text: string;
  created_at?: string;
  phase?: number;
} | null;

type ProceduralSafety = {
  status: string;
  explanation?: string;
  outstandingItems?: string[];
} | null;

export type CaseControlRoomProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  savedPosition: SavedPosition;
  hasSavedPosition: boolean;
  defencePlan: DefenceStrategyPlan | null;
  displayStrategy: { displayLabel: string; displayCategory: string } | null;
  committedStrategy: StrategyCommitment | null;
  matterState: string | null;
  effectiveProceduralSafety: ProceduralSafety;
  evidenceSummary?: string;
  timelineSummary?: string;
  onRecordPosition: () => void;
  onUploadEvidence: () => void;
};

type MatterSummary = {
  clientInitials: string | null;
  allegedOffence: string | null;
  stageDetected: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength: number;
  header?: {
    shortTitle: string | null;
    stage: string | null;
    primaryEvalHook: string | null;
  };
  snippets?: {
    mg5: string | null;
    mg6: string | null;
    exhibits: string | null;
  };
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

function formatNextHearing(snapshot: CaseSnapshot | null): string {
  const at = snapshot?.caseMeta?.hearingNextAt;
  if (!at) return "No hearing date safely extracted";
  const datePart = formatGbDate(at);
  if (!datePart) return "No hearing date safely extracted";
  const type = snapshot?.caseMeta?.hearingNextType?.trim();
  return type ? `${type} · ${datePart}` : datePart;
}

function resolveClientLabel(matter: MatterSummary | null, snapshot: CaseSnapshot | null): string {
  const initials = matter?.clientInitials?.trim();
  if (initials && initials.length >= 2 && !/^client\b/i.test(initials)) {
    return initials;
  }
  return "Client name not safely extracted";
}

function stripRepeatedPositionNotice(items: string[], notice: string | null | undefined): string[] {
  if (!notice?.trim()) {
    return items.filter((i) => !/defence position not safely recorded/i.test(i));
  }
  const key = notice.slice(0, 48).toLowerCase();
  return items.filter((i) => {
    const t = i.trim().toLowerCase();
    if (!t) return false;
    if (t.includes(key)) return false;
    if (/defence position not safely recorded/i.test(t)) return false;
    return true;
  });
}

function buildPlanSummary(plan: DefenceStrategyPlan | null): string {
  if (!plan) return "";
  const parts: string[] = [];
  if (plan.strategy_in_one_line) parts.push(plan.strategy_in_one_line);
  if (plan.primary_route?.label) parts.push(`Primary route: ${plan.primary_route.label}`);
  if (plan.posture) parts.push(plan.posture);
  return parts.slice(0, 12).join("\n");
}


export function CaseControlRoom({
  caseId,
  snapshot,
  snapshotLoading,
  savedPosition,
  hasSavedPosition,
  defencePlan,
  displayStrategy,
  committedStrategy,
  matterState,
  effectiveProceduralSafety,
  evidenceSummary,
  timelineSummary,
  onRecordPosition,
  onUploadEvidence,
}: CaseControlRoomProps) {
  const router = useRouter();
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
            ? {
                shortTitle: d.header.shortTitle ?? null,
                stage: d.header.stage ?? null,
                primaryEvalHook: d.header.primaryEvalHook ?? null,
              }
            : undefined,
          snippets: d.snippets
            ? {
                mg5: d.snippets.mg5 ?? null,
                mg6: d.snippets.mg6 ?? null,
                exhibits: d.snippets.exhibits ?? null,
              }
            : undefined,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const hasBattleboardMaterial = useMemo(() => battleboardHasMaterial(battleboard), [battleboard]);

  const planSummary = useMemo(() => {
    const base = buildPlanSummary(defencePlan);
    const bb = battleboard?.primary_route;
    const snippet = bb
      ? `Battleboard primary: ${bb.title}. ${bb.hearing_line}`.slice(0, 400)
      : battleboard?.solicitor_safe_summary?.slice(0, 300) ?? "";
    return [base, snippet].filter(Boolean).join("\n");
  }, [defencePlan, battleboard]);

  const caseTitle = snapshot?.caseMeta?.title?.trim() || "Criminal case";
  const clientLabel = resolveClientLabel(matter, snapshot);
  const allegation = useMemo(
    () => resolveAllegationLabel(snapshot, matter, battleboard, bundleSource),
    [snapshot, matter, battleboard, bundleSource],
  );
  const offenceWordingUnknown = useMemo(() => isUnknownOffenceLabel(allegation), [allegation]);
  const stageFromMatter =
    matter?.stageDetected ||
    snapshot?.caseMeta?.caseStage?.replace(/_/g, " ") ||
    matterState?.replace(/_/g, " ") ||
    "Stage not recorded";
  const displayStage = useMemo(() => {
    const fromHeader = bundleSource?.header?.stage?.trim();
    if (fromHeader && !/^unknown|not recorded|—$/i.test(fromHeader)) return fromHeader;
    if (stageFromMatter && !/^unknown|stage not recorded|—$/i.test(stageFromMatter)) return stageFromMatter;
    return stageFromMatter;
  }, [bundleSource, stageFromMatter]);
  const stage = displayStage;
  const nextHearing = formatNextHearing(snapshot);

  const chaseItemsAll = useMemo(
    () =>
      collectChaseItems({
        snapshotMissing: snapshot?.evidence.missingEvidence,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
        battleboard,
      }),
    [snapshot, effectiveProceduralSafety, battleboard],
  );

  const chaseItems = useMemo(() => chaseItemsAll.slice(0, 6), [chaseItemsAll]);
  const missingEvidenceStrip = useMemo(
    () => formatMissingEvidenceStrip(chaseItemsAll),
    [chaseItemsAll],
  );

  const riskLabel = useMemo(() => {
    if (effectiveProceduralSafety?.status === "UNSAFE_TO_PROCEED") return "Procedural — resolve disclosure";
    if (effectiveProceduralSafety?.status === "CONDITIONALLY_UNSAFE") return "Conditional — disclosure gaps";
    if (battleboard?.global_collapse_risks?.length) return "Collapse risks on file — review routes";
    if (battleboard?.overall_status === "needs_review") return "Routes need review";
    if (battleboard?.overall_status === "thin_bundle" && !hasBattleboardMaterial) {
      return "Thin bundle — provisional strategy";
    }
    const tier = snapshot?.analysis.capabilityTier;
    if (tier === "thin" && !hasBattleboardMaterial) return "Thin bundle — provisional strategy";
    if (defencePlan?.risks_pivots_short?.length) return "Strategic risks on file";
    return "Review — standard caution";
  }, [effectiveProceduralSafety, snapshot, defencePlan, battleboard, hasBattleboardMaterial]);

  const positionLabel = hasSavedPosition && savedPosition?.position_text?.trim()
    ? savedPosition.position_text.split(/[.!?]/)[0].trim() +
      (savedPosition.position_text.includes(".") ? "." : "")
    : battleboard?.position_notice?.includes("not safely recorded")
      ? "Position not safely recorded yet"
      : "Position not recorded";

  const bundleLabel = useMemo(
    () => deriveBundleHealthLabel(snapshot, bundleSource, battleboard),
    [snapshot, bundleSource, battleboard],
  );

  const disclosureLabel = snapshot ? formatDisclosureGlance(chaseItemsAll) : "—";

  const positionNoticeOnce = useMemo(() => {
    const notice = battleboard?.position_notice?.trim();
    if (notice) return notice;
    if (!hasSavedPosition) {
      return "Defence position not safely recorded yet — record instructions before fixing strategy.";
    }
    return null;
  }, [battleboard, hasSavedPosition]);

  const immediateActions = useMemo(() => {
    const items: string[] = [];
    if (!hasSavedPosition && !positionNoticeOnce) {
      items.push("Record defence position / take instructions before committing strategy.");
    }
    for (const m of chaseItems.slice(0, 4)) {
      const line = m.startsWith("Chase") ? m : `Chase/record: ${m}`;
      if (!items.includes(line)) items.push(line);
    }
    if (battleboard?.urgent_next_moves?.length) {
      for (const u of battleboard.urgent_next_moves) {
        if (!items.includes(u)) items.push(u);
      }
    }
    if (defencePlan?.next_72_hours?.length) {
      for (const n of defencePlan.next_72_hours.slice(0, 4)) {
        if (!items.includes(n)) items.push(n);
      }
    }
    const defaults = [
      "Review interview recording/transcript against MG5/MG6.",
      "Chase CCTV master, CAD audit, and 999 audio if listed.",
      "Prepare hearing line — conditional only; do not overstate.",
    ];
    for (const d of defaults) {
      if (items.length >= 8) break;
      if (!items.some((i) => i.toLowerCase().includes(d.slice(0, 20).toLowerCase()))) items.push(d);
    }
    return stripRepeatedPositionNotice(items, positionNoticeOnce).slice(0, 8);
  }, [hasSavedPosition, chaseItems, battleboard, defencePlan, positionNoticeOnce]);

  const { evidentialRisks, proceduralRisks, strategicRisks } = useMemo(
    () =>
      deriveRiskColumns(
        battleboard,
        defencePlan,
        snapshot,
        effectiveProceduralSafety,
        chaseItems,
        positionNoticeOnce,
      ),
    [battleboard, defencePlan, snapshot, effectiveProceduralSafety, chaseItems, positionNoticeOnce],
  );

  const strategyBasisNotice = useMemo(() => {
    const label = snapshot?.analysis.strategyBasisLabel?.trim();
    const reason = snapshot?.analysis.strategyBasisReason?.trim();
    if (!label && !reason) return null;
    if (!offenceWordingUnknown && isStaleOffenceStrategyNotice(label, reason)) return null;
    return { label: label ?? "", reason };
  }, [snapshot, offenceWordingUnknown]);

  const prosecutionWeakness = useMemo(() => {
    const fromRoute = filterStaleOffenceWording(battleboard?.primary_route?.why_it_helps?.slice(0, 3) ?? []);
    if (fromRoute.length) return fromRoute;
    const fromPlan = filterStaleOffenceWording([
      ...(defencePlan?.prosecution_pressure ?? []),
      ...(defencePlan?.winning_angles ?? []),
    ]);
    if (fromPlan.length) return fromPlan.slice(0, 3);
    return [
      "Outstanding source material may limit how Crown can prove its case — conditional on what is served.",
    ];
  }, [battleboard, defencePlan]);

  const defenceRisks = useMemo(() => {
    const items = stripRepeatedPositionNotice(
      uniqueStrings(
        filterStaleOffenceWording([
          ...(battleboard?.primary_route?.collapse_risks ?? []),
          ...(battleboard?.global_collapse_risks ?? []),
          ...(defencePlan?.risks_if_we_fight ?? []),
          ...(defencePlan?.risks_pivots_short ?? []),
        ]),
      ),
      positionNoticeOnce,
    );
    if (items.length) return items.slice(0, 2);
    return [
      "Assumed position may conflict with interview or served evidence — solicitor review required.",
    ];
  }, [battleboard, defencePlan, positionNoticeOnce]);

  const bestRouteTitle =
    battleboard?.primary_route?.title ||
    defencePlan?.primary_route?.label ||
    displayStrategy?.displayLabel ||
    (committedStrategy?.primary
      ? String(committedStrategy.primary).replace(/_/g, " ")
      : "Provisional — commit strategy or record position");

  const exitClassic = () => {
    router.replace(`/cases/${caseId}?tab=strategy`);
  };

  return (
    <div className="min-h-0 pb-20 xl:pb-4" data-testid="case-control-room">
      {/* Top case strip */}
      <Card className="border-border/60 bg-gradient-to-r from-muted/40 via-card to-muted/20 overflow-hidden">
        <div className="px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-lg font-semibold text-foreground truncate">{caseTitle}</h1>
              <Badge variant="secondary" size="sm">
                Control Room
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{clientLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exitClassic}>
              Classic workspace
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onUploadEvidence}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload
            </Button>
            <Button type="button" size="sm" onClick={onRecordPosition}>
              Record position
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border/50 border-t border-border/50 text-xs">
          <StripCell label="Stage" value={stage} />
          <StripCell label="Risk" value={riskLabel} warn />
          <StripCell
            label="Missing evidence"
            value={missingEvidenceStrip.label}
            warn={missingEvidenceStrip.warn}
          />
          <StripCell label="Next hearing" value={nextHearing} icon={<Calendar className="h-3 w-3" />} />
          <StripCell label="Position" value={positionLabel} className="lg:col-span-2" />
        </div>
      </Card>

      <div className="mt-3 xl:mr-[min(360px,26vw)] xl:pr-3 space-y-3 max-w-[1400px]">
        {snapshotLoading ? (
          <DashboardCard title="Case summary" icon={<FileText className="h-4 w-4 text-primary" />}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading case data…
            </div>
          </DashboardCard>
        ) : (
          <AboveFoldSummary
            allegation={allegation}
            stage={stage}
            bundleLabel={bundleLabel}
            positionLabel={positionLabel}
            nextHearing={nextHearing}
            disclosureLabel={disclosureLabel}
            bestRouteTitle={bestRouteTitle}
            routeStatus={battleboard?.primary_route?.status ?? null}
            prosecutionWeakness={prosecutionWeakness}
            defenceRisks={defenceRisks}
            immediateActions={immediateActions}
            strategyBasisNotice={strategyBasisNotice}
            positionNotice={positionNoticeOnce}
          />
        )}

        {immediateActions.length > 3 && (
          <DashboardCard
            title="Further actions"
            icon={<ListChecks className="h-4 w-4 text-primary shrink-0" />}
            bodyClassName="py-2"
          >
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground list-disc pl-4">
              {immediateActions.slice(3, 8).map((item, i) => (
                <li key={i} className="line-clamp-2">
                  {item}
                </li>
              ))}
            </ul>
            {chaseItems.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/40 pt-2">
                Chase on file: {chaseItems.slice(0, 3).join(" · ")}
                {chaseItems.length > 3 ? ` (+${chaseItems.length - 3} more)` : ""}
              </p>
            )}
          </DashboardCard>
        )}

        <StrategyBattleboard
          caseId={caseId}
          compact
          maxBackupRoutes={2}
          maxUrgentMoves={6}
          maxCollapseRisks={5}
          hidePositionNotice
          battleboardData={battleboard}
          battleboardLoading={battleboardLoading}
        />

        <DashboardCard
          title="Risk & weakness overview"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
          bodyClassName="py-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <RiskColumn title="Evidential" items={evidentialRisks} />
            <RiskColumn title="Procedural / disclosure" items={proceduralRisks} />
            <RiskColumn title="Strategic" items={strategicRisks} />
          </div>
        </DashboardCard>

        <p className="text-[10px] text-center text-muted-foreground pb-1">
          Evidence-linked · conditional · provisional where stated · solicitor review required · no predictions
        </p>
      </div>

      <ControlRoomAssistantDock
        caseId={caseId}
        planSummary={planSummary}
        evidenceSummary={evidenceSummary}
        timelineSummary={timelineSummary}
        assistantContext={{
          battleboard,
          allegation,
          stage: displayStage,
          positionNotice: positionNoticeOnce,
          missingEvidence: chaseItemsAll,
          bundleHeader: bundleSource?.header ?? null,
          bundleSnippets: bundleSource?.snippets ?? null,
          fileTextHints: evidenceSummary?.slice(0, 2500),
          primaryRouteTitle: bestRouteTitle,
        }}
      />
    </div>
  );
}

function isUnknownOffenceLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return true;
  const l = label.trim().toLowerCase();
  return (
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l === "allegation not recorded" ||
    l.startsWith("offence wording not safely extracted")
  );
}

function isStaleOffenceStrategyNotice(label: string | undefined, reason: string | undefined): boolean {
  const r = reason?.trim().toLowerCase() ?? "";
  const l = label?.trim().toLowerCase() ?? "";
  if (r === "offence not identified." || r === "offence not identified") return true;
  if (r.includes("offence not identified")) return true;
  if (l.includes("add charge sheet or key evidence for offence-specific")) return true;
  return false;
}

function filterStaleOffenceWording(items: string[]): string[] {
  return items.filter((item) => {
    const t = item?.trim();
    if (!t) return false;
    const l = t.toLowerCase();
    if (l === "offence not identified." || l === "offence not identified") return false;
    if (l.includes("offence not identified")) return false;
    if (l === "put prosecution to proof on each element — check charge wording on file.") return false;
    if (l.includes("put prosecution to proof on each element") && l.includes("check charge wording")) {
      return false;
    }
    return true;
  });
}

function battleboardHasMaterial(bb: BattleboardOutput | null): boolean {
  if (!bb) return false;
  if (bb.primary_route?.evidence_anchors?.length) return true;
  return bb.routes.some((r) => r.evidence_anchors.length > 0);
}

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M chars`;
  if (n >= 1000) return `${Math.round(n / 1000)}k chars`;
  return `${n} chars`;
}

function resolveAllegationLabel(
  snapshot: CaseSnapshot | null,
  matter: MatterSummary | null,
  battleboard: BattleboardOutput | null,
  bundleSource: BundleSourceSummary | null,
): string {
  const candidates: (string | null | undefined)[] = [
    snapshot?.resolvedOffence?.label,
    matter?.allegedOffence,
    snapshot?.charges?.[0]?.offence,
    bundleSource?.header?.shortTitle,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t && !isUnknownOffenceLabel(t)) return t;
  }
  if (battleboardHasMaterial(battleboard) || (bundleSource?.combinedTextLength ?? 0) > 0) {
    return "Offence wording not safely extracted yet — check charge sheet / MG5 header on file.";
  }
  return "Offence wording not safely extracted yet";
}

function deriveBundleHealthLabel(
  snapshot: CaseSnapshot | null,
  bundleSource: BundleSourceSummary | null,
  battleboard: BattleboardOutput | null,
): string {
  const docCount = Math.max(
    snapshot?.analysis.docCount ?? 0,
    bundleSource?.documentCount ?? 0,
    snapshot?.evidence.documents?.length ?? 0,
  );
  const combinedLen = bundleSource?.combinedTextLength ?? 0;
  const hasAnchors = battleboardHasMaterial(battleboard);
  const tier = snapshot?.analysis.capabilityTier;

  if (docCount === 0 && combinedLen === 0 && !hasAnchors) {
    return "Thin (no documents on record)";
  }
  if (docCount === 0 && hasAnchors) {
    return "Documents detected — summary still provisional";
  }
  if (docCount === 0 && combinedLen > 0) {
    return `Text on file (${formatChars(combinedLen)}) — doc count pending`;
  }

  const tierLabel =
    tier === "full" ? "Strong" : tier === "partial" ? "Partial" : hasAnchors ? "Partial (on file text)" : "Thin";
  const textSuffix = combinedLen > 0 ? ` · ${formatChars(combinedLen)} text` : "";
  return `${tierLabel} (${docCount} doc${docCount !== 1 ? "s" : ""}${textSuffix})`;
}

function isProceduralRisk(text: string): boolean {
  return /\b(disclosure|mg6|continuity|chase|served|outstanding|pace|custody|procedural|cad|cctv|999|exhibit|bundle|disclose)\b/i.test(
    text,
  );
}

function isStrategicRisk(text: string): boolean {
  return /\b(position|route|strategy|commit|provisional|assumed|hearing line|collapse)\b/i.test(text);
}

function deriveRiskColumns(
  battleboard: BattleboardOutput | null,
  defencePlan: DefenceStrategyPlan | null,
  snapshot: CaseSnapshot | null,
  proceduralSafety: ProceduralSafety,
  chaseItems: string[],
  positionNotice: string | null,
): { evidentialRisks: string[]; proceduralRisks: string[]; strategicRisks: string[] } {
  const raw: string[] = stripRepeatedPositionNotice(
    uniqueStrings([
      ...(battleboard?.primary_route?.collapse_risks ?? []),
      ...(battleboard?.global_collapse_risks ?? []),
      ...(defencePlan?.kill_switches?.map((k) => k.if) ?? []),
      ...(defencePlan?.risks_if_we_fight ?? []),
      ...(defencePlan?.risks_pivots_short ?? []),
      ...(defencePlan?.risks_fallbacks ?? []),
      ...(snapshot?.strategy.pressurePoints?.map((p) => p.label) ?? []),
      ...(proceduralSafety?.outstandingItems ?? []),
      ...chaseItems.map((m) => `Outstanding: ${m}`),
      ...(defencePlan?.disclosure_weapon_steps ?? []),
    ]),
    positionNotice,
  );

  const evidential: string[] = [];
  const procedural: string[] = [];
  const strategic: string[] = [];

  for (const item of raw) {
    if (isProceduralRisk(item)) procedural.push(item);
    else if (isStrategicRisk(item)) strategic.push(item);
    else evidential.push(item);
  }

  if (evidential.length === 0 && battleboard?.primary_route?.collapse_risks?.length) {
    evidential.push(...battleboard.primary_route.collapse_risks);
  }
  if (strategic.length === 0 && battleboard?.global_collapse_risks?.length) {
    for (const g of battleboard.global_collapse_risks) {
      if (isStrategicRisk(g)) strategic.push(g);
      else if (!procedural.includes(g) && !evidential.includes(g)) evidential.push(g);
    }
  }

  return {
    evidentialRisks: uniqueStrings(evidential).slice(0, 5),
    proceduralRisks: uniqueStrings(procedural).slice(0, 5),
    strategicRisks: uniqueStrings(strategic).slice(0, 5),
  };
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw?.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function StripCell({
  label,
  value,
  warn,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  warn?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card/90 px-3 py-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`text-xs font-medium mt-0.5 flex items-center gap-1 line-clamp-2 ${
          warn ? "text-amber-700 dark:text-amber-400" : "text-foreground"
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
