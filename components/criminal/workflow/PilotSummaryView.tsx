"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { resolveCaseHeaderMetadata, sanitizeHeaderAllegation, sanitizeHeaderClient } from "@/lib/criminal/resolve-case-header-metadata";
import type { ParsedBundleHeader } from "@/lib/bundle/parse-bundle-display";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { cleanPilotHeaderClient } from "@/lib/criminal/pilot-workflow";
import { workflowPilotCard, workflowSectionTitle } from "./workflowUi";
import { displayPilotStripCharge, displayPilotStripClient } from "./workflowPilotDisplay";

export type PilotSummaryViewProps = {
  caseId: string;
  caseTitle: string;
  clientLabel?: string | null;
  chargeLabel?: string | null;
};

/** Pilot Summary tab — brief first; full legacy panel behind expand. */
export function PilotSummaryView({
  caseId,
  caseTitle,
  clientLabel: clientProp,
  chargeLabel: chargeProp,
}: PilotSummaryViewProps) {
  const [fullOpen, setFullOpen] = useState(false);
  const [clientLabel, setClientLabel] = useState(clientProp ?? "");
  const [chargeLabel, setChargeLabel] = useState(chargeProp ?? "");

  useEffect(() => {
    if (clientProp || chargeProp) {
      setClientLabel(clientProp ?? "");
      setChargeLabel(chargeProp ?? "");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/criminal/${caseId}/bundle-source`, { credentials: "include" });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { header?: unknown; caseMetadata?: unknown };
        };
        if (cancelled || !json.ok || !json.data) return;
        const meta = resolveCaseHeaderMetadata({
          bundleHeader: (json.data.header ?? null) as ParsedBundleHeader | null,
          bundleMetadata: (json.data.caseMetadata ?? null) as ExtractedBundleCaseMetadata | null,
          snapshot: null,
        });
        setClientLabel(cleanPilotHeaderClient(sanitizeHeaderClient(meta.clientLabel)));
        setChargeLabel(sanitizeHeaderAllegation(meta.allegation));
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, clientProp, chargeProp]);

  const heading =
    caseTitle && !/^untitled case$/i.test(caseTitle.trim())
      ? caseTitle
      : [displayPilotStripClient(clientLabel), displayPilotStripCharge(chargeLabel)]
          .filter((p) => p && !/not on papers/i.test(p))
          .join(" — ") || "Case summary";

  return (
    <div className="space-y-3" data-testid="pilot-summary-view">
      <div className={`${workflowPilotCard} px-4 py-3`}>
        <p className={workflowSectionTitle}>Summary</p>
        <h2 className="text-base font-semibold text-slate-100 mt-1">{heading}</h2>
        {clientLabel || chargeLabel ? (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {displayPilotStripClient(clientLabel)}
            {chargeLabel ? ` · ${displayPilotStripCharge(chargeLabel)}` : ""}
          </p>
        ) : null}
        <p className="text-xs text-slate-500 mt-2">
          Provisional display from saved papers — solicitor review required.
        </p>
      </div>

      <div className={`${workflowPilotCard} px-4 py-3`}>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 text-left"
          onClick={() => setFullOpen((v) => !v)}
        >
          <div>
            <p className={workflowSectionTitle}>Full summary workspace</p>
            <p className="text-xs text-slate-400 mt-1">
              Agreed summary editor, solicitor buckets, and rating — expand when you need the full tools.
            </p>
          </div>
          {fullOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          )}
        </button>
      </div>

      {fullOpen ? (
        <CaseSummaryPanel
          caseId={caseId}
          caseTitle={heading}
          practiceArea="criminal"
          summary={null}
          className="border-slate-700/70 bg-slate-900/40"
        />
      ) : null}
    </div>
  );
}
