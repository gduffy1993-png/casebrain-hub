"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";
import type { ParsedBundleHeader } from "@/lib/bundle/parse-bundle-display";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { workflowCard, workflowPilotSixtyStrip } from "./workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { cleanPilotHeaderClient, cleanPilotCourtHeaderCell, cleanPilotHearingHeaderCell } from "@/lib/criminal/pilot-workflow";
import {
  displayPilotStripClient,
  displayPilotStripCourt,
  displayPilotStripHearing,
  resolvePilotChargeDisplay,
} from "./workflowPilotDisplay";
import { buildMatterConfidence } from "@/lib/criminal/matter-confidence/build-matter-confidence";
import { SOURCE_BACKED_COURT_NOTE_LABEL } from "@/lib/criminal/trust/firm-facing-labels";
import { MatterConfidenceHeader } from "@/components/criminal/trust/MatterConfidenceHeader";
import { useCaseWorkflowActiveTab } from "./useCaseWorkflowActiveTab";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";

const LEVEL_VARIANTS: Record<
  MatterConfidenceResult["level"],
  "success" | "warning" | "secondary" | "danger"
> = {
  safe: "success",
  provisional: "secondary",
  needs_review: "warning",
  blocked: "danger",
};

type StripState = {
  client: string;
  charge: string;
  court: string;
  hearing: string;
  health: "ready" | "thin" | "unknown";
  documentCount: number;
  combinedTextLength: number;
  bail: string | null;
  funding: string | null;
  safeguard: string | null;
};

function healthFromDocCount(count: number): StripState["health"] {
  if (count >= 2) return "ready";
  if (count >= 1) return "thin";
  return "unknown";
}

export function CaseWorkflowHeaderStrip({
  caseId,
  safeCourtLine,
  deskChargeLine,
}: {
  caseId: string;
  safeCourtLine?: string | null;
  /** Court Today list / brief offence — UI fallback only when bundle charge is internal. */
  deskChargeLine?: string | null;
}) {
  const [strip, setStrip] = useState<StripState | null>(null);
  const [safeLineExpanded, setSafeLineExpanded] = useState(false);
  const pilot = isCriminalPilotMode();
  const activeTab = useCaseWorkflowActiveTab();
  const hideTrustDup = activeTab === "overview";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bundleRes, matterRes] = await Promise.all([
          fetch(`/api/criminal/${caseId}/bundle-source`, { credentials: "include" }),
          fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" }),
        ]);
        const json = (await bundleRes.json()) as {
          ok?: boolean;
          data?: {
            header?: ParsedBundleHeader | null;
            caseMetadata?: ExtractedBundleCaseMetadata | null;
            documentCount?: number;
            combinedTextLength?: number;
          };
        };
        const matter = await matterRes.json().catch(() => ({}));
        if (cancelled || !json.ok || !json.data) return;
        const meta = resolveCaseHeaderMetadata({
          bundleHeader: json.data.header ?? null,
          bundleMetadata: json.data.caseMetadata ?? null,
          snapshot: null,
        });
        const clientClean = pilot
          ? cleanPilotHeaderClient(sanitizeHeaderClient(meta.clientLabel))
          : sanitizeHeaderClient(meta.clientLabel);
        const chargeClean = sanitizeHeaderAllegation(meta.allegation);
        const courtClean = pilot ? cleanPilotCourtHeaderCell(meta.court) : meta.court?.trim() || "";
        const hearingClean = pilot
          ? cleanPilotHearingHeaderCell(meta.nextHearing, json.data.caseMetadata?.nextHearingIso)
          : meta.nextHearing?.trim() || "";
        const safeguards: string[] = [];
        if (matter?.station?.riskAppropriateAdult) safeguards.push("AA");
        if (matter?.station?.riskInterpreter) safeguards.push("Interpreter");
        if (matter?.station?.riskMentalHealth) safeguards.push("MH");
        if (matter?.station?.riskMedicalIssues) safeguards.push("Medical");
        setStrip({
          client: pilot
            ? displayPilotStripClient(clientClean) || clientClean
            : clientClean || "Client not on papers",
          charge: pilot
            ? resolvePilotChargeDisplay(chargeClean, deskChargeLine)
            : chargeClean || "Charge not on papers",
          court: pilot ? displayPilotStripCourt(courtClean) || courtClean : courtClean || "Court not on papers",
          hearing: pilot ? displayPilotStripHearing(hearingClean) || hearingClean : hearingClean || "Hearing not on papers",
          health: healthFromDocCount(json.data.documentCount ?? 0),
          documentCount: json.data.documentCount ?? 0,
          combinedTextLength: json.data.combinedTextLength ?? 0,
          bail: typeof matter?.bailOutcome === "string" ? matter.bailOutcome : null,
          funding: typeof matter?.station?.representationType === "string" ? matter.station.representationType : null,
          safeguard: safeguards.length ? safeguards.join(" · ") : null,
        });
      } catch {
        if (!cancelled) setStrip(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, pilot, deskChargeLine]);

  useEffect(() => {
    setSafeLineExpanded(false);
  }, [caseId, safeCourtLine]);

  if (!strip) return null;

  const healthBadge =
    strip.health === "ready"
      ? { label: "Papers loaded", variant: "success" as const }
      : strip.health === "thin"
        ? { label: "Thin bundle", variant: "warning" as const }
        : { label: "Check papers", variant: "secondary" as const };

  const readinessLine =
    strip.health === "thin"
      ? "Thin bundle — missing material; not ready to rely on strategy yet."
      : strip.health === "unknown"
        ? "Check papers before relying on any strategy lines."
        : null;

  const safeLineText =
    safeCourtLine?.trim() || `${SOURCE_BACKED_COURT_NOTE_LABEL} loads on the Overview tab.`;
  const safeLineClamped = safeLineText.length > 100;

  const matterConfidence = buildMatterConfidence({
    documentCount: strip.documentCount,
    combinedTextLength: strip.combinedTextLength,
    bundleHealth: strip.health,
    genericProvisional: /provisional|not ready|check papers|thin bundle/i.test(readinessLine ?? ""),
    missingMaterialCount: strip.health === "thin" ? 2 : 0,
    hasSafeCourtLine: Boolean(safeCourtLine?.trim()),
  });

  if (pilot) {
    return (
      <div className={`${workflowPilotSixtyStrip} px-3 py-2`} data-testid="case-workflow-header-strip">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-slate-50 truncate">{strip.client}</p>
            <p className="text-xs text-slate-400 line-clamp-1">{strip.charge}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 min-w-0 shrink-0">
            <span className="font-medium text-slate-200">{strip.court}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular-nums">{strip.hearing}</span>
            <Badge variant={LEVEL_VARIANTS[matterConfidence.level]} size="sm">
              {matterConfidence.label}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
          <span className="font-medium text-slate-500">Next: </span>
          {matterConfidence.nextBestAction}
        </p>
        {!hideTrustDup ? <MatterConfidenceHeader confidence={matterConfidence} compact /> : null}
      </div>
    );
  }

  return (
    <div
      className={`${workflowCard} px-3 py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-sm`}
      data-testid="case-workflow-header-strip"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-slate-900 truncate">{strip.client}</p>
        <p className="text-xs text-slate-600 line-clamp-2">{strip.charge}</p>
        {readinessLine ? <p className="text-[11px] text-amber-800/90">{readinessLine}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 shrink-0">
        <span className="font-medium text-slate-800">{strip.court}</span>
        <span aria-hidden="true">·</span>
        <span>{strip.hearing}</span>
        <Badge variant={healthBadge.variant} size="sm">
          {healthBadge.label}
        </Badge>
        {strip.bail ? (
          <Badge variant="secondary" size="sm">
            Bail: {strip.bail}
          </Badge>
        ) : null}
        {strip.funding ? (
          <Badge variant="secondary" size="sm">
            {strip.funding}
          </Badge>
        ) : null}
        {strip.safeguard ? (
          <Badge variant="warning" size="sm">
            {strip.safeguard}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
