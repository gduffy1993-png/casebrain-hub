"use client";

import type { ReactNode } from "react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

function SnapshotBox({
  title,
  testId,
  children,
}: {
  title: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 min-w-0"
      data-testid={testId}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-1.5 text-sm text-slate-200 leading-snug">{children}</div>
    </div>
  );
}

function formatEvidenceStateLine(counts: {
  served: number;
  referred: number;
  missing: number;
  incomplete: number;
  notSafelyConfirmed: number;
}): ReactNode {
  const parts: { n: number; label: string; className: string }[] = [
    { n: counts.served, label: "served", className: "text-emerald-300/90" },
    { n: counts.referred, label: "referred", className: "text-amber-300/90" },
    { n: counts.missing, label: "missing", className: "text-rose-300/90" },
    { n: counts.incomplete, label: "incomplete", className: "text-orange-300/90" },
    { n: counts.notSafelyConfirmed, label: "not safely confirmed", className: "text-slate-300" },
  ].filter((p) => p.n > 0);

  if (!parts.length) {
    return <p className="text-xs text-slate-400">No evidence states on this preview.</p>;
  }

  return (
    <p>
      {parts.map((p, i) => (
        <span key={p.label}>
          {i > 0 ? " · " : null}
          <span className={p.className}>{p.n}</span> {p.label}
        </span>
      ))}
    </p>
  );
}

export function OverviewSnapshotBoxes({
  evidenceCounts,
  topChaseLabels,
  riskFlags,
  canonicalFingerprint = null,
}: {
  evidenceCounts: {
    served: number;
    referred: number;
    missing: number;
    incomplete: number;
    notSafelyConfirmed: number;
  };
  topChaseLabels: string[];
  riskFlags: string[];
  /** Echo of CanonicalMatterStateV1.fingerprint — proves shared state consumption. */
  canonicalFingerprint?: string | null;
}) {
  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2`}
      data-testid="overview-snapshot-boxes"
      data-canonical-fingerprint={canonicalFingerprint ?? undefined}
    >
      <h2 className={workflowSectionTitle}>Case snapshot</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <SnapshotBox title="Evidence state" testId="five-answers-evidence-state">
          {formatEvidenceStateLine(evidenceCounts)}
        </SnapshotBox>
        <SnapshotBox title="Disclosure gaps" testId="five-answers-chase">
          {topChaseLabels.length ? (
            <ul className="space-y-1 text-xs text-slate-300">
              {topChaseLabels.slice(0, 3).map((label, i) => (
                <li key={i} className="line-clamp-2">
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No chase items listed yet.</p>
          )}
        </SnapshotBox>
        <SnapshotBox title="Risk flags" testId="five-answers-must-not">
          {riskFlags.length ? (
            <ul className="space-y-1 text-xs text-amber-100/90">
              {riskFlags.slice(0, 3).map((flag, i) => (
                <li key={i} className="line-clamp-2">
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No overstatement flags on this preview.</p>
          )}
        </SnapshotBox>
      </div>
    </section>
  );
}
