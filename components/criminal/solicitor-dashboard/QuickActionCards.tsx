"use client";

import { useState } from "react";
import type { SolicitorDashboardVm } from "@/lib/criminal/solicitor-dashboard/types";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function QuickActionCards({ vm }: { vm: SolicitorDashboardVm }) {
  const [copied, setCopied] = useState<string | null>(null);
  const pct = vm.readinessPercent;

  return (
    <section className="grid gap-3 lg:grid-cols-3" data-testid="solicitor-quick-cards">
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-[13px] font-semibold text-slate-900">Safe Court Line</h3>
        <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-slate-600">{vm.safeCourtLine}</p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-800"
          onClick={async () => setCopied((await copyText(vm.safeCourtLine)) ? "court" : null)}
        >
          {copied === "court" ? "Copied" : "Copy safe court line"}
        </button>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-[13px] font-semibold text-slate-900">Client Update</h3>
        <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-slate-600">{vm.clientUpdate}</p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
          onClick={async () => setCopied((await copyText(vm.clientUpdate)) ? "client" : null)}
        >
          {copied === "client" ? "Copied" : "Copy client update"}
        </button>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-[13px] font-semibold text-slate-900">Case Readiness</h3>
        <div className="mt-3 flex items-center gap-4">
          <ReadinessDonut pct={pct} />
          <ul className="space-y-1 text-[11px] text-slate-600">
            <li>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />
              Evidence gathered {formatPct(vm.readinessBreakdown.evidenceGatheredPercent)}
            </li>
            <li>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />
              Issues resolved {formatPct(vm.readinessBreakdown.issuesResolvedPercent)}
            </li>
            <li>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />
              To be chased {formatPct(vm.readinessBreakdown.toBeChasedPercent)}
            </li>
          </ul>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Derived from current evidence/chase counters only — provisional; solicitor review required.
        </p>
      </article>
    </section>
  );
}

function formatPct(n: number | null): string {
  return n == null ? "not safely scored" : `${n}%`;
}

function ReadinessDonut({ pct }: { pct: number | null }) {
  const value = pct ?? 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={pct == null ? "#94a3b8" : pct >= 70 ? "#34d399" : pct >= 45 ? "#fbbf24" : "#f87171"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={pct == null ? c : offset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[14px] font-bold text-slate-900">{pct == null ? "—" : `${pct}%`}</span>
        <span className="text-[8px] uppercase tracking-wide text-slate-500">Overall</span>
      </div>
    </div>
  );
}
