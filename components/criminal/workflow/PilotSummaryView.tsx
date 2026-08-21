"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Loader2 } from "lucide-react";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { Button } from "@/components/ui/button";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { TrustFeedbackPanel } from "@/components/criminal/trust/TrustFeedbackPanel";
import { TrustSectionChrome } from "@/components/criminal/trust/MatterConfidenceHeader";
import { SourceStateBadge } from "@/components/criminal/trust/SourceStateBadge";
import { buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { SolicitorDeepDetailGate } from "@/components/criminal/trust/SolicitorDeepDetailGate";
import { usePilotMatterTabHref } from "./pilotDeskNavContext";
import { useMatterBrief } from "./useMatterBrief";
import { workflowPilotCard, workflowSectionTitle } from "./workflowUi";
import {
  displayChaseBulletLine,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";
import {
  collapseDontSayMg11WitnessLines,
  dedupeSolicitorLines,
  excludeSolicitorLinesMatching,
  polishChasePreviewLabel,
  solicitorLinesNearlyEqual,
} from "@/lib/criminal/solicitor-display-dedupe";
import { displayPilotStripCharge, displayPilotStripClient } from "./workflowPilotDisplay";
import { solicitorReadyGateCopy } from "./pilotReviewCopy";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import type { NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";

function clientPapersFactLines(rows: NormalisedMaterialRow[]): string[] {
  const out: string[] = [];
  for (const row of rows.slice(0, 8)) {
    const status =
      row.status === "served"
        ? "on the papers"
        : row.status === "partial" || row.status === "draft" || row.status === "unsigned"
          ? "only partly on the papers"
          : row.status === "referred_only"
            ? "referred to but not fully served"
            : row.status === "outstanding" || row.status === "absent"
              ? "not on the papers yet"
              : "not safely confirmed on the papers";
    out.push(`${row.label} — ${status}.`);
  }
  return out;
}

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
  sourceState = "provisional",
  polishChaseBullets = false,
  bundleHay = "",
}: {
  title: string;
  paragraph?: string;
  bullets?: string[];
  sourceState?: "provisional" | "needs_review" | "not_safely_confirmed";
  polishChaseBullets?: boolean;
  bundleHay?: string;
}) {
  const polishSummaryLine = (line: string): string =>
    /^Ask the court to record that\b/i.test(line.trim())
      ? `Court timetable: ${cleanCourtRecordSubject(line)}.`
      : polishPresentationLine(line, bundleHay)
      .replace(
        /^(.+? leverage):\s*Further papers appear to be outstanding\. Confirm their relevance before fixing the hearing position\.?$/i,
        "$1: check the relevant source material before fixing the hearing position.",
      )
      .replace(
        /^(.+?)\s*[—–-]\s*Further papers appear to be outstanding\. Confirm their relevance before fixing the hearing position\.?$/i,
        "$1 — check source before fixing the hearing position.",
      )
      .replace(
        /^Further papers appear to be outstanding\. Confirm their relevance before fixing the hearing position\.?$/i,
        "Check the relevant source material before fixing the hearing position.",
      )
      .replace(/\brobbery id\b/gi, "identification issues");
  const displayBullets = polishChaseBullets
    ? dedupeSolicitorLines(
        filterBundleFamilyWarnings(bullets ?? [], bundleHay)
          .map((b) => polishSummaryLine(displayChaseBulletLine(b)))
          .map((b) => polishChasePreviewLabel(b) ?? "")
          .filter(Boolean),
      )
    : dedupeSolicitorLines(
        filterBundleFamilyWarnings(bullets ?? [], bundleHay).map(polishSummaryLine),
      );
  const displayParagraph = paragraph ? polishPresentationBlock(paragraph, bundleHay) : "";
  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-2`}>
      <TrustSectionChrome title={title} sourceState={sourceState} />
      {displayParagraph ? (
        <p className="text-sm text-slate-300 leading-relaxed">{displayParagraph}</p>
      ) : null}
      {displayBullets?.length ? (
        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-400">
          {displayBullets.map((b, i) => (
            <li key={i} className="leading-relaxed">
              {b}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function cleanCourtRecordSubject(line: string): string {
  return line
    .replace(/^Ask the court to record that\s+/i, "")
    .replace(/\s+appears outstanding(?: on the current papers)?/gi, " appears outstanding")
    .replace(/\s+remains outstanding/gi, " remains outstanding")
    .replace(/\s+and should be disclosed on a timetable\.?$/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCourtDayNote(note: string): { text?: string; lead?: string; items?: string[]; tail?: string } {
  const lines = note
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const askLines = lines.filter((line) => /^Ask the court to record that\b/i.test(line));
  if (askLines.length < 2) {
    return { text: polishPresentationLine(note, "") };
  }
  const subjects = askLines.map(cleanCourtRecordSubject).filter(Boolean).slice(0, 4);
  const tail = lines
    .filter((line) => !/^Ask the court to record that\b/i.test(line))
    .map((line) => polishPresentationLine(line, ""))
    .join(" ");
  return {
    lead: "Court note: ask the court to set a disclosure timetable for:",
    items: subjects,
    tail,
  };
}

function CourtDayNoteBlock({ note }: { note: string }) {
  const display = formatCourtDayNote(note);
  if (display.text) {
    return <p className="text-xs text-slate-500">{display.text}</p>;
  }
  return (
    <div className="space-y-1 text-xs text-slate-500">
      <p>{display.lead}</p>
      {display.items?.length ? (
        <ul className="list-disc pl-4 space-y-0.5">
          {display.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null}
      {display.tail ? <p>{display.tail}</p> : null}
    </div>
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
  const [copied, setCopied] = useState<"client" | null>(null);
  const { loading, matterBrief, matterConfidence, doNotOverstate, bundleMeta, outputIntegrity, allegation } =
    useMatterBrief(caseId);
  const bundleHay = bundleMeta?.frontMatterScan ?? "";
  const papersFacts = useMemo(() => {
    if (!bundleHay.trim()) return [] as string[];
    const ledger = buildBundleTruthLedger({ bundleText: bundleHay });
    return clientPapersFactLines(ledger.materials);
  }, [bundleHay]);
  const filteredDoNot = useMemo(
    () =>
      collapseDontSayMg11WitnessLines(
        dedupeSolicitorLines(filterBundleFamilyWarnings(doNotOverstate, bundleHay)),
      ),
    [doNotOverstate, bundleHay],
  );
  const buildTabHref = usePilotMatterTabHref();
  const chaseHref = buildTabHref(caseId, "disclosure-chase");
  const todayHref = buildTabHref(caseId, "today");

  const heading =
    caseTitle && !/^untitled case$/i.test(caseTitle.trim())
      ? caseTitle
      : [displayPilotStripClient(clientProp ?? ""), displayPilotStripCharge(chargeProp ?? "")]
          .filter((p) => p && !/not on papers/i.test(p))
          .join(" — ") || "Case summary";

  const clientSafeText = useMemo(() => {
    if (!matterBrief) return "";
    const clientSection = matterBrief.sections.find((s) => s.id === "client");
    const parts = [
      clientSection?.paragraph,
      ...(clientSection?.bullets ?? []),
    ].filter(Boolean);
    if (parts.length) return polishPresentationBlock(parts.join("\n\n"), bundleHay);
    return polishPresentationBlock(matterBrief.plainText.slice(0, 4000), bundleHay);
  }, [matterBrief, bundleHay]);

  const clientCopy = useMemo(
    () =>
      buildCopySafeResult({
        text: clientSafeText,
        kind: "client_summary",
        sourceState: "provisional",
        matterLevel: matterConfidence?.summarySendability,
        integrity: outputIntegrity,
        allegation,
        bundleHay,
      }),
    [clientSafeText, matterConfidence?.summarySendability, outputIntegrity, allegation, bundleHay],
  );

  const copyClientSafe = async () => {
    if (!clientCopy.canCopy) return;
    try {
      await navigator.clipboard.writeText(clientCopy.textForClipboard);
      setCopied("client");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const orderedSections = useMemo(() => {
    if (!matterBrief) return [];
    const client = matterBrief.sections.find((s) => s.id === "client");
    const rest = matterBrief.sections.filter((s) => s.id !== "client");
    return client ? [client, ...rest] : matterBrief.sections;
  }, [matterBrief]);

  return (
    <div className="space-y-3" data-testid="pilot-summary-view">
      <div className={`${workflowPilotCard} px-4 py-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={workflowSectionTitle}>Client summary</p>
              <SourceStateBadge state="provisional" />
            </div>
            <h2 className="text-base font-semibold text-slate-100 mt-1">{heading}</h2>
            <p className="text-xs text-slate-500 mt-2">
              Client-facing factual update from the papers — not a court control-room desk. Review before
              sending.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-slate-300 hover:text-slate-100"
            disabled={!clientCopy.canCopy}
            onClick={() => void copyClientSafe()}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            {copied === "client" ? "Copied" : "Copy client-safe summary"}
          </Button>
        </div>
        {!loading && papersFacts.length ? (
          <div className="mt-3 rounded-md border border-slate-700/60 bg-slate-950/40 px-3 py-2.5 space-y-1.5" data-testid="client-papers-facts">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              What the papers show
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
              {papersFacts.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!loading && clientSafeText ? (
          <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{clientSafeText}</p>
        ) : null}
      </div>

      {!loading && filteredDoNot.length ? (
        <DontSaySafetyBox items={filteredDoNot.slice(0, 8)} />
      ) : null}

      {loading ? (
        <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          Building matter brief…
        </div>
      ) : matterBrief ? (
        <>
          {orderedSections
            .filter((section) => section.id !== "client")
            .map((section) => {
              const theory =
                matterBrief.sections.find((s) => s.id === "theory")?.paragraph?.trim() ?? "";
              let bullets = section.bullets;
              if (section.id === "risks") {
                bullets = excludeSolicitorLinesMatching(section.bullets ?? [], filteredDoNot);
              } else if (section.id === "opportunities") {
                const attributionAction = "Test attribution before any position is fixed.";
                bullets = excludeSolicitorLinesMatching(section.bullets ?? [], [theory])
                  .filter((l) => !/\bthe case turns on\b/i.test(l))
                  .map((l) => (/test attribution/i.test(l) ? attributionAction : l));
                if (
                  /attribution/i.test(`${theory} ${(section.bullets ?? []).join(" ")}`) &&
                  !(bullets ?? []).some((l) => solicitorLinesNearlyEqual(l, attributionAction))
                ) {
                  bullets = [attributionAction, ...(bullets ?? [])];
                }
              }
              return (
            <MatterBriefSectionBlock
              key={section.id}
              title={section.title}
              paragraph={section.paragraph}
              bullets={bullets}
              sourceState={section.id === "client" ? "provisional" : "needs_review"}
              polishChaseBullets={section.id === "chase"}
              bundleHay={bundleHay}
            />
              );
            })}

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

          <div className={`${workflowPilotCard} px-4 py-3 flex flex-wrap items-start justify-between gap-2`}>
            <CourtDayNoteBlock note={matterBrief.courtDayNote} />
            <Link
              href={todayHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Review court position
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </>
      ) : (
        <div className={`${workflowPilotCard} px-4 py-3`}>
          <p className="text-sm text-slate-400">Case summary will appear once papers are processed.</p>
        </div>
      )}

      <div className={`${workflowPilotCard} px-4 py-3`}>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 text-left disabled:opacity-70"
          onClick={() => {
            if (outputIntegrity && !outputIntegrity.deepDetailAvailable) return;
            setFullOpen((v) => !v);
          }}
          disabled={Boolean(outputIntegrity && !outputIntegrity.deepDetailAvailable)}
          data-testid="summary-full-workspace-toggle"
        >
          <div>
            <p className={workflowSectionTitle}>Full summary workspace</p>
            <p className="text-xs text-slate-400 mt-1">
              {outputIntegrity && !outputIntegrity.deepDetailAvailable
                ? solicitorReadyGateCopy(outputIntegrity.banner)
                : "Agreed summary editor, solicitor buckets, and rating — expand when you need the full tools."}
            </p>
          </div>
          {fullOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          )}
        </button>
      </div>

      {outputIntegrity && !outputIntegrity.deepDetailAvailable ? (
        <SolicitorDeepDetailGate integrity={outputIntegrity} label="Full summary workspace">
          {null}
        </SolicitorDeepDetailGate>
      ) : fullOpen ? (
        <CaseSummaryPanel
          caseId={caseId}
          caseTitle={heading}
          practiceArea="criminal"
          summary={null}
          className="border-slate-700/70 bg-slate-900/40"
        />
      ) : null}

      <TrustFeedbackPanel
        caseId={caseId}
        tab="summary"
        defaultContext={{
          contextLabel: "Case summary",
          sourceState: "provisional",
          sendability: matterConfidence?.summarySendability ?? "provisional_check_source",
        }}
      />
    </div>
  );
}
