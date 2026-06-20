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

type StripState = {
  client: string;
  charge: string;
  court: string;
  hearing: string;
  health: "ready" | "thin" | "unknown";
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

  const safeLineText = safeCourtLine?.trim() || "Safe position loads on the Today tab.";
  const safeLineClamped = safeLineText.length > 100;

  if (pilot) {
    return (
      <div className={`${workflowPilotSixtyStrip} px-3 py-2.5`} data-testid="case-workflow-header-strip">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-50 truncate">{strip.client}</p>
            <p className="text-xs text-slate-400 line-clamp-2">{strip.charge}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 min-w-0">
            <span className="font-medium text-slate-200">{strip.court}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular-nums">{strip.hearing}</span>
            <Badge variant={healthBadge.variant} size="sm">
              {healthBadge.label}
            </Badge>
            {strip.bail ? (
              <Badge variant="secondary" size="sm" className="bg-slate-800 text-slate-200 border-slate-600">
                Bail: {strip.bail}
              </Badge>
            ) : null}
            {strip.funding ? (
              <Badge variant="secondary" size="sm" className="bg-slate-800 text-slate-200 border-slate-600">
                {strip.funding}
              </Badge>
            ) : null}
            {strip.safeguard ? (
              <Badge variant="warning" size="sm">
                {strip.safeguard}
              </Badge>
            ) : null}
          </div>
          <div className="min-w-0 lg:border-l lg:border-slate-700/70 lg:pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Safe line</p>
            <p
              className={`text-xs text-slate-300 mt-0.5 italic leading-snug ${
                safeLineExpanded ? "" : "line-clamp-2"
              }`}
            >
              {safeLineText}
            </p>
            {safeLineClamped ? (
              <button
                type="button"
                className="text-[10px] font-medium text-blue-400/90 hover:text-blue-300 mt-0.5"
                onClick={() => setSafeLineExpanded((v) => !v)}
              >
                {safeLineExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
            {readinessLine ? <p className="text-[11px] text-amber-400/90 mt-1 line-clamp-1">{readinessLine}</p> : null}
          </div>
        </div>
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
