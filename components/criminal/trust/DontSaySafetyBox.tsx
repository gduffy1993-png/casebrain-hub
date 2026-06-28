"use client";

import { ShieldAlert } from "lucide-react";
import { SourceStateBadge } from "./SourceStateBadge";

/** Safety warnings — explicitly not case facts (H3 chunk 2). */
export function DontSaySafetyBox({
  items,
  emptyLabel = "No safety warnings on the current brief.",
  compact = false,
}: {
  items: string[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2"
          : "rounded-lg border border-rose-800/40 bg-rose-950/20 px-3 py-2.5"
      }
      data-testid="dont-say-safety-box"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
          Do not say / unsafe to say
        </p>
        <SourceStateBadge state="needs_review" />
        <span className="text-[10px] text-rose-400/80 italic">Safety warnings — not alleged facts</span>
      </div>
      {items.length ? (
        <ul className="list-disc pl-4 space-y-1 text-xs text-rose-100/90">
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed line-clamp-4">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-rose-300/70">{emptyLabel}</p>
      )}
    </div>
  );
}
