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
import { workflowCard } from "./workflowUi";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { cleanPilotHeaderClient, cleanPilotCourtHeaderCell, cleanPilotHearingHeaderCell } from "@/lib/criminal/pilot-workflow";

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

export function CaseWorkflowHeaderStrip({ caseId }: { caseId: string }) {
  const [strip, setStrip] = useState<StripState | null>(null);
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
        const client = pilot
          ? cleanPilotHeaderClient(sanitizeHeaderClient(meta.clientLabel))
          : sanitizeHeaderClient(meta.clientLabel);
        const charge = sanitizeHeaderAllegation(meta.allegation);
        const court = pilot
          ? cleanPilotCourtHeaderCell(meta.court)
          : meta.court?.trim() || "Court not on papers";
        const hearing = pilot
          ? cleanPilotHearingHeaderCell(meta.nextHearing)
          : meta.nextHearing?.trim() || "Hearing not on papers";
        const safeguards: string[] = [];
        if (matter?.station?.riskAppropriateAdult) safeguards.push("AA");
        if (matter?.station?.riskInterpreter) safeguards.push("Interpreter");
        if (matter?.station?.riskMentalHealth) safeguards.push("MH");
        if (matter?.station?.riskMedicalIssues) safeguards.push("Medical");
        setStrip({
          client: client || "Client not on papers",
          charge: charge || "Charge not on papers",
          court,
          hearing,
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
  }, [caseId, pilot]);

  if (!strip) return null;

  const healthBadge =
    strip.health === "ready"
      ? { label: "Papers loaded", variant: "success" as const }
      : strip.health === "thin"
        ? { label: "Thin bundle", variant: "warning" as const }
        : { label: "Check papers", variant: "secondary" as const };

  return (
    <div
      className={`${workflowCard} px-3 py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-sm`}
      data-testid="case-workflow-header-strip"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-slate-900 truncate">{strip.client}</p>
        <p className="text-xs text-slate-600 line-clamp-2">{strip.charge}</p>
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
