"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Copy, FileText, Loader2, Mic, Phone, Video } from "lucide-react";
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
  attention: DemoAttentionItem[];
  courtLine: string;
  clientUpdate: string;
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
  const [moreOpen, setMoreOpen] = useState(false);

  const selected = useMemo(() => {
    if (!attention.length) return null;
    return attention.find((a) => a.id === selectedId) ?? attention[0];
  }, [attention, selectedId]);

  const flashCopy = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  const safetyLine = doNotItems.find((line) => line.trim()) ?? "";

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
      <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-4 py-4 sm:px-5 shadow-sm">
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
          <p className="text-xs text-slate-400">
            {stats.openReviewItems
              ? `${stats.openReviewItems} named chase${stats.openReviewItems === 1 ? "" : "s"} from the papers`
              : "No named chase on the current extract"}
          </p>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 max-w-3xl">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-300" />
            <p>{safetyLine || readinessBanner}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">What Needs Attention</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Named items from the extract — empty is a success when the papers do not state a gap.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {attention.length === 0 ? (
            <li className="px-4 py-8 text-sm text-slate-500">No outstanding attention items on this extract.</li>
          ) : (
            attention.map((item) => {
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
                      </div>
                    </div>
                  </button>
                  {active ? (
                    <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-3 space-y-3">
                      <p className="text-sm text-slate-700 leading-relaxed">{item.why}</p>
                      <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                        {item.sources.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.recommendedAction}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          onClick={async () => {
                            if (await copyText(item.chaseWording)) flashCopy("chase");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copied === "chase" ? "Copied" : "Copy chase request"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          onClick={async () => {
                            if (await copyText(item.courtWording)) flashCopy("court");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copied === "court" ? "Copied" : "Copy court wording"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>

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

      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        {fileHref ? (
          <Link href={fileHref} className="text-blue-700 hover:text-blue-900">
            Open File →
          </Link>
        ) : null}
        {papersHref ? (
          <Link href={papersHref} className="text-blue-700 hover:text-blue-900">
            Open Papers →
          </Link>
        ) : null}
        {chaseHref ? (
          <Link href={chaseHref} className="text-blue-700 hover:text-blue-900">
            Open CPS Chase →
          </Link>
        ) : null}
        {courtHref ? (
          <Link href={courtHref} className="text-blue-700 hover:text-blue-900">
            Open Court position →
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        className="text-xs font-medium text-slate-500 hover:text-slate-800"
        onClick={() => setMoreOpen((v) => !v)}
      >
        {moreOpen ? "Hide client update" : "More detail (client update)"}
      </button>
      {moreOpen ? (
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
      ) : null}
    </div>
  );
}
