"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCaseSnapshot, type CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";
import {
  cleanPilotHeaderClient,
  pilotCaseBrainPositionStatus,
  pilotPositionDisplayLabel,
  workflowHeaderOverrides,
  workflowPrimaryRouteTitle,
} from "@/lib/criminal/pilot-workflow";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import { safeSolicitorCaseTitle } from "@/lib/criminal/dev-ref-scrub";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
} from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildMatterBrief, type MatterBrief } from "./buildMatterBrief";
import { assembleBundleTextForContradictions } from "@/lib/criminal/reasoning-v2/assemble-bundle-text";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";

type MatterSummary = {
  clientInitials: string | null;
  allegedOffence: string | null;
  stageDetected: string | null;
  defendantName?: string | null;
  bailOutcome?: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength: number;
  documentRows?: DocumentRowMeta[];
  frontMatterScan?: string | null;
  snippets?: {
    mg5?: string | null;
    mg6?: string | null;
    mg11?: string | null;
    exhibits?: string | null;
  };
  header?: { shortTitle: string | null; stage: string | null; accused?: string | null };
  caseMetadata?: ExtractedBundleCaseMetadata | null;
};

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
    bundleTextHint: bundleSource?.frontMatterScan,
  });
}

export function useMatterBrief(caseId: string) {
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [battleboard, setBattleboard] = useState<BattleboardOutput | null>(null);
  const [battleboardLoading, setBattleboardLoading] = useState(true);
  const [bundleSource, setBundleSource] = useState<BundleSourceSummary | null>(null);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [matter, setMatter] = useState<MatterSummary | null>(null);
  const [matterState, setMatterState] = useState<string | null>(null);
  const [hasSavedPosition, setHasSavedPosition] = useState(false);
  const [savedPositionText, setSavedPositionText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSnapshotLoading(true);
    buildCaseSnapshot(caseId)
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false);
      });
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
        if (cancelled || !res?.ok) return;
        setBattleboard(res.data ?? res.battleboard ?? null);
      })
      .catch(() => {})
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
        const d = res.data as BundleSourceSummary;
        setBundleSource({
          documentCount: d.documentCount ?? 0,
          combinedTextLength: d.combinedTextLength ?? 0,
          documentRows: Array.isArray(d.documentRows) ? d.documentRows : undefined,
          frontMatterScan: d.frontMatterScan ?? null,
          snippets: d.snippets ?? undefined,
          header: d.header,
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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setMatterState(data.matterState ?? data.stage ?? null);
        setMatter({
          clientInitials: data.clientInitials ?? null,
          allegedOffence: data.allegedOffence ?? null,
          stageDetected: data.stageDetected ?? null,
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
    fetch(`/api/criminal/${caseId}/position`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && (data.data || data.position)) {
          setHasSavedPosition(true);
          setSavedPositionText((data.data || data.position)?.position_text ?? null);
        } else {
          setHasSavedPosition(false);
          setSavedPositionText(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const matterBrief = useMemo((): MatterBrief | null => {
    if (snapshotLoading || battleboardLoading || bundleLoading) return null;

    const caseTitleBase = snapshot?.caseMeta?.title?.trim() || "Criminal case";
    const headerMeta = resolveCaseHeaderMetadata({
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
      bundleText: bundleSource?.frontMatterScan ?? null,
      matterState,
    });

    const clientLabelBase = sanitizeHeaderClient(headerMeta.clientLabel);
    const allegationBase = sanitizeHeaderAllegation(headerMeta.allegation);
    const clientLabel = isCriminalPilotMode() ? cleanPilotHeaderClient(clientLabelBase) : clientLabelBase;
    const pilotHeader = workflowHeaderOverrides(caseTitleBase, {
      allegation: allegationBase,
      routeTitle: battleboard?.primary_route?.title,
      bundleText: bundleSource?.frontMatterScan ?? null,
      clientLabel,
    });
    const caseTitle = safeSolicitorCaseTitle(pilotHeader?.displayTitle ?? pilotHeader?.title ?? caseTitleBase);
    const allegation = pilotHeader?.allegation ?? allegationBase;
    const stage = headerMeta.stage;
    const hearingDateIso =
      bundleSource?.caseMetadata?.nextHearingIso ?? snapshot?.caseMeta?.hearingNextAt ?? null;
    const hearingStatus = headerMeta.nextHearing?.trim() || "Hearing not on file";
    const bundleHealth = deriveBundleHealth(snapshot, bundleSource, battleboard);

    const bundleTextForBrief = assembleBundleTextForContradictions({
      frontMatterScan: bundleSource?.frontMatterScan ?? null,
      snippets: bundleSource?.snippets,
    });

    const workflowContext = {
      caseTitle,
      allegation,
      routeTitle: battleboard?.primary_route?.title,
      bundleText: bundleSource?.frontMatterScan ?? null,
      clientLabel,
      profileHint: pilotHeader?.profile ?? null,
    };

    const chaseItemsAll = buildChaseItemsForHearing({
      battleboard,
      snapshotMissing: snapshot?.evidence.missingEvidence,
      proceduralOutstanding: undefined,
    });
    const briefPlan = buildCriminalBriefPlan({
      bundleText: bundleTextForBrief || bundleSource?.frontMatterScan || null,
      missingMaterial: [
        ...chaseItemsAll,
        ...(snapshot?.evidence.missingEvidence?.map((item) => item.label) ?? []),
      ],
      allegation,
    });

    let positionRaw: string;
    if (hasSavedPosition && savedPositionText?.trim()) {
      positionRaw =
        savedPositionText.split(/[.!?]/)[0].trim() +
        (savedPositionText.includes(".") ? "." : "");
    } else if (headerMeta.defencePosition) {
      positionRaw =
        headerMeta.defencePosition.length > 100
          ? `${headerMeta.defencePosition.slice(0, 97)}…`
          : headerMeta.defencePosition;
    } else if (isCriminalPilotMode() && !hasSavedPosition) {
      positionRaw = pilotCaseBrainPositionStatus(false);
    } else if (battleboard?.position_notice?.includes("not safely recorded")) {
      positionRaw = "Position not safely recorded yet";
    } else {
      positionRaw = "Position not recorded";
    }
    const positionStatus = isCriminalPilotMode()
      ? pilotPositionDisplayLabel(positionRaw, workflowContext)
      : positionRaw;

    let readiness: string;
    if (!hasSavedPosition) {
      readiness = "Conditional — record position";
    } else if (chaseItemsAll.length >= 2) {
      readiness = "Conditional — source material outstanding";
    } else if (battleboard?.primary_route) {
      readiness = "Routes on file — solicitor review";
    } else {
      readiness = "Review — standard caution";
    }

    const warRoom = buildHearingWarRoomBrief({
      caseId,
      caseTitle,
      clientLabel,
      allegation,
      stage,
      hearingStatus,
      bundleHealth,
      positionStatus,
      readiness,
      battleboard,
      hasSavedPosition,
      chaseItems: chaseItemsAll,
      proceduralOutstanding: undefined,
      bundleText: bundleTextForBrief || bundleSource?.frontMatterScan || null,
      profileHint: pilotHeader?.profile ?? null,
      briefPlan,
    });

    const chase = buildDisclosureChaseBrief({
      caseId,
      caseTitle,
      clientLabel,
      allegation,
      stage,
      hearingStatus,
      hearingDateIso,
      bundleHealth,
      positionStatus,
      battleboard,
      snapshotMissing: snapshot?.evidence.missingEvidence,
      bundleText: bundleTextForBrief || bundleSource?.frontMatterScan || null,
      profileHint: pilotHeader?.profile ?? null,
      briefPlan,
    });

    const primaryRouteTitle = workflowPrimaryRouteTitle(workflowContext);

    return buildMatterBrief({ warRoom, chase, primaryRouteTitle, briefPlan });
  }, [
    snapshotLoading,
    battleboardLoading,
    bundleLoading,
    snapshot,
    matter,
    matterState,
    battleboard,
    bundleSource,
    caseId,
    hasSavedPosition,
    savedPositionText,
  ]);

  return {
    loading: snapshotLoading || battleboardLoading || bundleLoading,
    matterBrief,
    caseTitle: snapshot?.caseMeta?.title?.trim() || "Criminal case",
  };
}
