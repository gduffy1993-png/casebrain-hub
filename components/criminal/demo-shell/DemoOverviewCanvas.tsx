"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Copy, FileText, Loader2, Mic, Phone, ShieldCheck, Video } from "lucide-react";
import type {
  DemoAttentionItem,
  DemoAttentionStatus,
  DemoKeyDefenceIssue,
  DemoReadiness,
  DemoStatCounts,
} from "./demoOverviewAdapter";
import { OutputReceiptDisclosure } from "@/components/criminal/trust/OutputReceiptDisclosure";
import type { VisibleOutputReceipt } from "@/lib/criminal/visible-output-receipt";

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

export function DemoOverviewCanvas({
  clientName,
  chargeLine,
  stageLine,
  provisional,
  readinessBanner,
  stats,
  keyIssues,
  attention,
  courtLine,
  courtReceipt,
  clientUpdate,
  clientReceipt,
  readiness,
  doNotItems = [],
  fileHref,
  papersHref,
  chaseHref,
  courtHref,
  loading,
}: {
  clientName: string;
  chargeLine: string;
  stageLine: string;
  provisional: boolean;
  readinessBanner: string;
  stats: DemoStatCounts;
  keyIssues: DemoKeyDefenceIssue[];
  attention: DemoAttentionItem[];
  courtLine: string;
  courtReceipt?: VisibleOutputReceipt;
  clientUpdate: string;
  clientReceipt?: VisibleOutputReceipt;
  readiness: DemoReadiness;
  doNotItems?: string[];
  fileHref?: string;
  papersHref?: string;
  chaseHref?: string;
  courtHref?: string;
  loading?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const selected = useMemo(() => {
    if (!attention.length) return null;
    return attention.find((a) => a.id === selectedId) ?? attention[0];
  }, [attention, selectedId]);

  const flashCopy = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  const safetyLine = doNotItems.find((line) => line.trim()) ?? "";
  const statCards = [
    {
      label: "Missing",
      value: stats.missing,
      note: "Needs chase",
      className: "border-rose-100 bg-rose-50/70 text-rose-700",
    },
    {
      label: "Incomplete",
      value: stats.incomplete,
      note: "Needs completion",
      className: "border-amber-100 bg-amber-50/70 text-amber-700",
    },
    {
      label: "Open review",
      value: stats.openReviewItems,
      note: "Needs checking",
      className: "border-blue-100 bg-blue-50/70 text-blue-700",
    },
  ];

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
      <header className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 shadow-sm">
        <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-200/80">
                Case command centre
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                {clientName || "Client identity needs confirmation"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span>
                  {chargeLine || "Charge not safely identified"}
                  {stageLine ? ` · ${stageLine}` : ""}
                </span>
                {provisional ? (
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                    Provisional
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <p>{safetyLine || readinessBanner}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {statCards.map((stat) => (
              <div key={stat.label} className={`rounded-xl border bg-white px-3 py-3 shadow-sm ${stat.className}`}>
                <p className="text-2xl font-semibold leading-none">{stat.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{stat.label}</p>
                <p className="mt-0.5 text-[11px] opacity-75">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {keyIssues.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Key defence issues</h2>
              <p className="mt-0.5 text-xs text-amber-900/70">
                Highest-value points from the papers. Each one keeps its source receipt.
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {keyIssues.length} issue{keyIssues.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {keyIssues.map((issue) => (
              <article key={issue.id} className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-950">{issue.issue}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{issue.why}</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-800">
                  Next: {issue.nextAction}
                </p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                  Source: {issue.sourceLine}
                </p>
                <div className="mt-2">
                  <OutputReceiptDisclosure receipt={issue.receipt} compact />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">What needs attention</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                One shortlist from the papers. If the file is quiet, this board stays quiet.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {attention.length} item{attention.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {attention.length === 0 ? (
              <li className="px-4 py-10 text-sm text-slate-500">
                No outstanding attention items on this extract.
              </li>
            ) : (
              attention.map((item) => {
                const Icon = iconForItem(item);
                const active = selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full px-4 py-3.5 text-left transition ${
                        active ? "bg-blue-50/90 ring-1 ring-inset ring-blue-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
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
                          <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">{item.blurb}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected issue
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.title}</h2>
                </div>
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide ${STATUS_STYLES[selected.status]}`}
                >
                  {selected.status}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Why CaseBrain says this
                </p>
                <p className="text-sm leading-relaxed text-slate-700">{selected.why}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                  {selected.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Recommended action
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{selected.recommendedAction}</p>
              </div>
              <OutputReceiptDisclosure receipt={selected.receipt} />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  onClick={async () => {
                    if (await copyText(selected.chaseWording)) flashCopy("chase");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "chase" ? "Copied" : "Copy chase request"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
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
            <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">No chase board needed</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                The current extract does not state a named gap. Use File or Papers if you want to inspect the source.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Safe court line</h3>
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
          {courtReceipt ? <OutputReceiptDisclosure receipt={courtReceipt} /> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Client update</h3>
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
          {clientReceipt ? <OutputReceiptDisclosure receipt={clientReceipt} /> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Detail tabs</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Main answer is above. Open the detail views only when you need the full source desk.
          </p>
          <div className="mt-4 grid gap-2 text-sm font-medium">
            {fileHref ? (
              <Link href={fileHref} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                File & source →
              </Link>
            ) : null}
            {papersHref ? (
              <Link href={papersHref} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                Papers detail →
              </Link>
            ) : null}
            {chaseHref ? (
              <Link href={chaseHref} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                CPS chase detail →
              </Link>
            ) : null}
            {courtHref ? (
              <Link href={courtHref} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                Court detail →
              </Link>
            ) : null}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Readiness: {readiness.overallPct}% provisional score from papers-backed counts.
          </div>
        </section>
      </div>
    </div>
  );
}
