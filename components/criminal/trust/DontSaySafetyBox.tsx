"use client";

import { ShieldAlert } from "lucide-react";
import { SourceStateBadge } from "./SourceStateBadge";

function displaySafetyWarning(raw: string): string {
  let t = raw.trim();
  if (!t) return t;

  t = t
    .replace(/^Not safe to say\s*[—–-]\s*/i, "")
    .replace(/^Unsafe to say\s*[—–-]\s*/i, "")
    .replace(/^Do not state\s+"([^"]+)"\s*[—–-]\s*/i, '"$1" is not established on the papers. ')
    .replace(/^Do not state\s+/i, "Avoid stating ")
    .replace(/^Do not import\s+(.+?)\s+unless the papers support it\.?$/i, (_m, subject: string) => {
      return `No support on the papers for ${subject.trim()}. Avoid relying on it until confirmed.`;
    })
    .replace(/\bnot safely confirmed\b/gi, "not confirmed on the papers")
    .replace(/\bsolicitor review required\b/gi, "check before relying")
    .replace(/\s{2,}/g, " ")
    .trim();

  return t.replace(/^[a-z]/, (c) => c.toUpperCase());
}

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
          Not established on current papers
        </p>
        <SourceStateBadge state="needs_review" />
        <span className="text-[10px] text-rose-400/80 italic">Use neutral wording until confirmed</span>
      </div>
      {items.length ? (
        <ul className="list-disc pl-4 space-y-1 text-xs text-rose-100/90">
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed line-clamp-4">
              {displaySafetyWarning(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-rose-300/70">{emptyLabel}</p>
      )}
    </div>
  );
}
