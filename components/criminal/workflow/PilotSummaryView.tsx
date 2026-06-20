"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Loader2 } from "lucide-react";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { Button } from "@/components/ui/button";
import { usePilotMatterTabHref } from "./pilotDeskNavContext";
import { useMatterBrief } from "./useMatterBrief";
import { workflowPilotCard, workflowSectionTitle } from "./workflowUi";
import { displayPilotStripCharge, displayPilotStripClient } from "./workflowPilotDisplay";

export type PilotSummaryViewProps = {
  caseId: string;
  caseTitle: string;
  clientLabel?: string | null;
  chargeLabel?: string | null;
};

function MatterBriefSectionBlock({
  title,
  paragraph,
  bullets,
}: {
  title: string;
  paragraph?: string;
  bullets?: string[];
}) {
  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-2`}>
      <h3 className={workflowSectionTitle}>{title}</h3>
      {paragraph ? <p className="text-sm text-slate-300 leading-relaxed">{paragraph}</p> : null}
      {bullets?.length ? (
        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-400">
          {bullets.map((b, i) => (
            <li key={i} className="leading-relaxed">
              {b}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Pilot Summary tab — Matter Brief assembled from Today / Papers / Chase brains. */
export function PilotSummaryView({
  caseId,
  caseTitle,
  clientLabel: clientProp,
  chargeLabel: chargeProp,
}: PilotSummaryViewProps) {
  const [fullOpen, setFullOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { loading, matterBrief } = useMatterBrief(caseId);
  const buildTabHref = usePilotMatterTabHref();
  const chaseHref = buildTabHref(caseId, "disclosure-chase");
  const todayHref = buildTabHref(caseId, "today");

  const heading =
    caseTitle && !/^untitled case$/i.test(caseTitle.trim())
      ? caseTitle
      : [displayPilotStripClient(clientProp ?? ""), displayPilotStripCharge(chargeProp ?? "")]
          .filter((p) => p && !/not on papers/i.test(p))
          .join(" — ") || "Matter brief";

  const copyAll = async () => {
    if (!matterBrief?.plainText) return;
    try {
      await navigator.clipboard.writeText(matterBrief.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3" data-testid="pilot-summary-view">
      <div className={`${workflowPilotCard} px-4 py-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={workflowSectionTitle}>Matter brief</p>
            <h2 className="text-base font-semibold text-slate-100 mt-1">{heading}</h2>
            <p className="text-xs text-slate-500 mt-2">
              Assembled from Today, Papers, and Chase — provisional; solicitor review required.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-slate-300 hover:text-slate-100"
            disabled={!matterBrief?.plainText}
            onClick={() => void copyAll()}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            {copied ? "Copied" : "Copy all"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          Building matter brief…
        </div>
      ) : matterBrief ? (
        <>
          {matterBrief.sections.map((section) => (
            <MatterBriefSectionBlock
              key={section.id}
              title={section.title}
              paragraph={section.paragraph}
              bullets={section.bullets}
            />
          ))}

          {matterBrief.sections.find((s) => s.id === "chase") ? (
            <div className="flex justify-end">
              <Link
                href={chaseHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                View full disclosure chase
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : null}

          <div className={`${workflowPilotCard} px-4 py-3 flex flex-wrap items-center justify-between gap-2`}>
            <p className="text-xs text-slate-500">{matterBrief.courtDayNote}</p>
            <Link
              href={todayHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Open Today tab
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </>
      ) : (
        <div className={`${workflowPilotCard} px-4 py-3`}>
          <p className="text-sm text-slate-400">Matter brief will appear once papers are processed.</p>
        </div>
      )}

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
