"use client";

/**
 * Overview-only advisory lane — FACT / SAFE ANALYSIS / PRACTITIONER CONSIDERATION.
 * Does not alter served/missing/incomplete/NSC/totals/readiness/Chase counters.
 */

import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type {
  AdvisoryConsideration,
  EstablishedFact,
  LegalIntelligenceResult,
  NotEstablishedClaim,
} from "@/lib/criminal/legal-intelligence";

const FACT_TONE = "border-sky-900/40 bg-sky-950/20";
const SAFE_TONE = "border-emerald-900/35 bg-emerald-950/15";
const CONSIDER_TONE = "border-violet-900/35 bg-violet-950/15";

function EpistemicLabel({
  kind,
}: {
  kind: "SOURCE_FACT" | "SAFE_DERIVATION" | "PRACTITIONER_CONSIDERATION";
}) {
  const label =
    kind === "SOURCE_FACT"
      ? "FACT"
      : kind === "SAFE_DERIVATION"
        ? "SAFE ANALYSIS"
        : "PRACTITIONER CONSIDERATION";
  const cls =
    kind === "SOURCE_FACT"
      ? "text-sky-300/90"
      : kind === "SAFE_DERIVATION"
        ? "text-emerald-300/90"
        : "text-violet-300/90";
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{label}</span>
  );
}

function FactList({ facts }: { facts: EstablishedFact[] }) {
  if (!facts.length) {
    return <p className="text-xs text-slate-400">No source facts extracted for this preview.</p>;
  }
  return (
    <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
      {facts.slice(0, 8).map((f) => (
        <li key={f.id} className="leading-snug">
          <span className="text-slate-400">{f.label}:</span> {f.value}
        </li>
      ))}
    </ul>
  );
}

function NotEstablishedList({ items }: { items: NotEstablishedClaim[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
      {items.slice(0, 6).map((n) => (
        <li key={n.id} className="leading-snug">
          <span className="text-slate-200">{n.label}</span>
          <span className="text-slate-500"> — {n.reason}</span>
        </li>
      ))}
    </ul>
  );
}

function ConsiderationList({ items }: { items: AdvisoryConsideration[] }) {
  if (!items.length) {
    return <p className="text-xs text-slate-400">No practitioner considerations on current papers.</p>;
  }
  return (
    <ul className="space-y-2 text-xs text-slate-300">
      {items.slice(0, 10).map((c) => (
        <li key={c.id} className="leading-snug border-l-2 border-violet-700/50 pl-2">
          <p className="text-slate-200">{c.what}</p>
          {c.why ? <p className="text-slate-500 mt-0.5">{c.why}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export type OverviewLegalIntelligenceCardProps = {
  legalIntelligence: LegalIntelligenceResult;
  overviewConsiderations: AdvisoryConsideration[];
};

export function OverviewLegalIntelligenceCard({
  legalIntelligence,
  overviewConsiderations,
}: OverviewLegalIntelligenceCardProps) {
  const safeAnalysis = legalIntelligence.established.filter((f) => f.supportClass === "SAFE_DERIVATION");
  const sourceFacts = legalIntelligence.established.filter((f) => f.supportClass === "SOURCE_FACT");

  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-3`}
      data-testid="overview-legal-intelligence-card"
      aria-label="Legal intelligence advisory"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={workflowSectionTitle}>Legal intelligence</h2>
        <p className="text-[10px] text-slate-500">{legalIntelligence.epistemicBanner}</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className={`rounded-md border ${FACT_TONE} px-3 py-2 space-y-1.5`}>
          <EpistemicLabel kind="SOURCE_FACT" />
          <FactList facts={sourceFacts} />
        </div>

        <div className={`rounded-md border ${SAFE_TONE} px-3 py-2 space-y-1.5`}>
          <EpistemicLabel kind="SAFE_DERIVATION" />
          {safeAnalysis.length ? (
            <FactList facts={safeAnalysis} />
          ) : (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                Not established as fact
              </p>
              <NotEstablishedList items={legalIntelligence.notEstablished} />
            </div>
          )}
        </div>

        <div className={`rounded-md border ${CONSIDER_TONE} px-3 py-2 space-y-1.5 lg:col-span-1`}>
          <EpistemicLabel kind="PRACTITIONER_CONSIDERATION" />
          <ConsiderationList items={overviewConsiderations} />
        </div>
      </div>

      {safeAnalysis.length && legalIntelligence.notEstablished.length ? (
        <div className={`rounded-md border ${SAFE_TONE} px-3 py-2 space-y-1.5`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
            Not established as fact
          </p>
          <NotEstablishedList items={legalIntelligence.notEstablished} />
        </div>
      ) : null}
    </section>
  );
}
