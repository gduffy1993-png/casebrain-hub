"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { EvidenceTraceRow, EvidenceTraceSection } from "@/lib/criminal/five-answers/types";
import { evidenceExistenceLabel, evidenceReliabilityLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { Badge } from "@/components/ui/badge";

function TraceAxisBadge({ label, tone }: { label: string; tone: "existence" | "reliability" | "warn" }) {
  const variant = tone === "existence" ? "secondary" : tone === "reliability" ? "outline" : "danger";
  return (
    <Badge variant={variant} size="sm" className="text-[9px] font-medium">
      {label}
    </Badge>
  );
}

function TraceRowItem({ row }: { row: EvidenceTraceRow }) {
  return (
    <li className="text-xs border-b border-slate-800/60 pb-2 last:border-0 space-y-1" data-testid={`evidence-trace-row-${row.id}`}>
      <p className="text-slate-200 leading-snug">{row.claim}</p>
      <div className="flex flex-wrap gap-1 items-center">
        <TraceAxisBadge label={evidenceExistenceLabel(row.existence)} tone="existence" />
        <TraceAxisBadge label={evidenceReliabilityLabel(row.reliability)} tone="reliability" />
        {row.inference ? <TraceAxisBadge label="Inference" tone="warn" /> : null}
        {row.critical ? <TraceAxisBadge label="Critical gap" tone="warn" /> : null}
        {row.notUsable ? <TraceAxisBadge label="Not usable" tone="warn" /> : null}
      </div>
      {row.sourceLabel || row.sourceAnchor ? (
        <p className="text-[10px] text-slate-500">
          {row.sourceLabel ? <span className="text-slate-400">{row.sourceLabel}</span> : null}
          {row.sourceAnchor ? (
            <span className="block mt-0.5 italic text-slate-600 line-clamp-2">“{row.sourceAnchor}”</span>
          ) : null}
        </p>
      ) : (
        <p className="text-[10px] text-slate-600">No source anchor on papers — labelled inference.</p>
      )}
      {row.traceWarning ? (
        <p className="text-[10px] text-amber-400/90 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{row.traceWarning}</span>
        </p>
      ) : null}
    </li>
  );
}

export function EvidenceTracePanel({
  section,
  rows,
  children,
}: {
  section: EvidenceTraceSection;
  rows: EvidenceTraceRow[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-800/80" data-testid={`evidence-trace-${section}`}>
      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Evidence trace ({rows.length})
      </button>
      {open ? (
        <ul className="mt-2 space-y-2 pl-1">
          {rows.map((row) => (
            <TraceRowItem key={row.id} row={row} />
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
