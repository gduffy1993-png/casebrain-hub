"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  Filter,
  Loader2,
  Mic,
  FileText,
  Video,
  Phone,
} from "lucide-react";
import type { DemoAttentionItem, DemoAttentionStatus, DemoReadiness, DemoStatCounts } from "./demoOverviewAdapter";

const STATUS_STYLES: Record<DemoAttentionStatus, string> = {
  MISSING: "bg-rose-50 text-rose-700 border-rose-200",
  UNCLEAR: "bg-amber-50 text-amber-800 border-amber-200",
  INCOMPLETE: "bg-sky-50 text-sky-800 border-sky-200",
  ACTIVE: "bg-indigo-50 text-indigo-800 border-indigo-200",
};

function iconForItem(item: DemoAttentionItem) {
  const hay = `${item.title} ${item.familyId}`.toLowerCase();
  if (/cctv|bwv|video|visual/.test(hay)) return Video;
  if (/interview|recording|mic|roti/.test(hay)) return Mic;
  if (/phone|download|device|sim/.test(hay)) return Phone;
  return FileText;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function StatCard({
  value,
  label,
  hint,
  tone,
}: {
  value: number;
  label: string;
  hint: string;
  tone: "rose" | "amber" | "sky";
}) {
  const tones = {
    rose: "border-rose-100 bg-white text-rose-800 shadow-lg shadow-slate-950/10",
    amber: "border-amber-100 bg-white text-amber-900 shadow-lg shadow-slate-950/10",
    sky: "border-blue-100 bg-white text-blue-900 shadow-lg shadow-slate-950/10",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 min-w-[8.5rem] ${tones[tone]}`}>
      <p className="text-2xl font-semibold tabular-nums leading-none">
        {value} <span className="text-sm font-medium">{label}</span>
      </p>
      <p className="mt-1 text-[11px] opacity-80">{hint}</p>
    </div>
  );
}

export function DemoOverviewCanvas({
  clientName,
  chargeLine,
  stageLine,
  provisional,
  readinessBanner,
  stats,
  attention,
  courtLine,
  clientUpdate,
  readiness: _readiness,
  loading,
}: {
  clientName: string;
  chargeLine: string;
  stageLine: string;
  provisional: boolean;
  readinessBanner: string;
  stats: DemoStatCounts;
  attention: DemoAttentionItem[];
  courtLine: string;
  clientUpdate: string;
  readiness: DemoReadiness;
  loading?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DemoAttentionStatus>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const attentionSummary = [
    `${stats.missing} missing`,
    `${stats.incomplete} incomplete`,
    stats.activeChases ? `${stats.activeChases} active CPS chase${stats.activeChases === 1 ? "" : "s"}` : "",
    `${stats.openReviewItems} open review item${stats.openReviewItems === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return attention;
    return attention.filter((a) => a.status === statusFilter);
  }, [attention, statusFilter]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((a) => a.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const flashCopy = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2 text-slate-500"
        data-testid="demo-overview-shell"
      >
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm">Loading case overview…</span>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 text-slate-900 shadow-2xl shadow-slate-950/10 sm:p-5"
      data-testid="demo-overview-shell"
    >
      {/* Case header + stats */}
      <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-4 py-4 sm:px-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl sm:text-[1.8rem] font-semibold tracking-tight text-white truncate">
              {clientName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>
                {chargeLine}
                {stageLine ? ` · ${stageLine}` : ""}
              </span>
              {provisional ? (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                  Provisional
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 max-w-xl">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-300" />
              <p>{readinessBanner}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatCard value={stats.missing} label="Missing" hint="High impact items" tone="rose" />
            <StatCard
              value={stats.incomplete}
              label="Incomplete"
              hint="Requires completion"
              tone="amber"
            />
            <StatCard
              value={stats.openReviewItems}
              label="Open review"
              hint={stats.activeChases ? "Selected matter incl. CPS chases" : "Selected matter needs checking"}
              tone="sky"
            />
          </div>
        </div>
      </header>

      {/* Attention + selected */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[28rem]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">What Needs Attention</h2>
              <p className="mt-0.5 text-xs text-slate-500">{attentionSummary || "No open attention items"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                Sort: Impact (High)
              </span>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">All</option>
                  <option value="MISSING">Missing</option>
                  <option value="UNCLEAR">Unclear</option>
                  <option value="INCOMPLETE">Incomplete</option>
                  <option value="ACTIVE">Chased</option>
                </select>
              </label>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-sm text-slate-500">No outstanding attention items on this filter.</li>
            ) : (
              filtered.map((item) => {
                const Icon = iconForItem(item);
                const active = selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left px-4 py-3.5 transition ${
                        active ? "bg-blue-50/80" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <span
                              className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${STATUS_STYLES[item.status]}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{item.blurb}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.impactTags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[28rem]">
          <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Selected Issue</h2>
            {selected ? (
              <span
                className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${STATUS_STYLES[selected.status]}`}
              >
                {selected.status}
              </span>
            ) : null}
          </div>
          {selected ? (
            <div className="flex flex-1 flex-col px-4 py-4 space-y-4">
              <div>
                <p className="text-base font-semibold text-slate-950">{selected.title}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Why CaseBrain says this
                </p>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">{selected.why}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-700 list-disc pl-4">
                  {selected.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Impact</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selected.impactTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Recommended action
                </p>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">{selected.recommendedAction}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  onClick={async () => {
                    if (await copyText(selected.chaseWording)) flashCopy("chase");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "chase" ? "Copied" : "Copy chase request"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  onClick={async () => {
                    if (await copyText(selected.courtWording)) flashCopy("court");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "court" ? "Copied" : "Copy court wording"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-sm text-slate-500">
              Select an item to inspect sources and copy wording.
            </div>
          )}
        </section>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Safe Court Line</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
              onClick={async () => {
                if (await copyText(courtLine)) flashCopy("safe");
              }}
            >
              <Copy className="h-3 w-3" />
              {copied === "safe" ? "Copied" : "Copy safe court line"}
            </button>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{courtLine || "Court line not ready yet."}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Client Update</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
              onClick={async () => {
                if (await copyText(clientUpdate)) flashCopy("client");
              }}
            >
              <Copy className="h-3 w-3" />
              {copied === "client" ? "Copied" : "Copy client update"}
            </button>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {clientUpdate || "Client update not ready yet."}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Case readiness</h3>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Provisional — not a court score.{" "}
            {stats.openReviewItems > 0
              ? `${stats.openReviewItems} open attention item${stats.openReviewItems === 1 ? "" : "s"} still need${stats.openReviewItems === 1 ? "s" : ""} solicitor review before the hearing position is fixed.`
              : "No open attention items on this overview — still check papers before relying on strategy."}
          </p>
        </section>
      </div>
    </div>
  );
}
